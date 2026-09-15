import {
  cancelVoiceStream,
  getVoiceConfig,
  interpretVoiceMessage,
  postVoiceChunk,
  startVoiceStream,
  stopVoiceStream,
  type ChatTurn,
} from "./api";
import { currentAgentHistory, setAgentChatBusy, setAgentChatDraft } from "./chat";
import { sessionLog } from "./dev-log";
import { showErrorModal } from "./error-modal";

// Global voice input. Captures 16 kHz mono PCM through an AudioWorklet,
// streams chunks to the Go STT endpoint for live transcription, and plays back
// synthesized replies queued from the chat SSE stream or /api/voice/speak.
// Any chat surface can attach through startVoiceHost; the agent dock uses the
// thin startVoiceChat wrapper below. Everything is best-effort: when the
// feature is off or unsupported, the mic button stays hidden.

const VOICE_REPLY_KEY = "eduardoos.voice.reply";

export type VoiceHost = {
  mic: HTMLButtonElement;
  toggle: HTMLButtonElement | null;
  caption: HTMLElement | null;
  /** Composer input, when the surface uses a plain textarea. */
  input?: HTMLTextAreaElement | null;
  /** Places the live transcript into the composer for review. */
  setDraft: (text: string) => void;
  /** Locks the composer while recording. */
  setBusy: (busy: boolean) => void;
  /** Recent conversation, used to contextualize the transcript. */
  history: () => ChatTurn[];
};

type VoiceState = {
  enabled: boolean;
  sampleRate: number;
  lang: string;
  reply: boolean;
  recording: boolean;
  starting: boolean;
  streamId: string | null;
  media: MediaStream | null;
  ctx: AudioContext | null;
  node: AudioWorkletNode | null;
  source: MediaStreamAudioSourceNode | null;
  sink: GainNode | null;
  chain: Promise<void>;
  transcript: string;
  partial: string;
};

const state: VoiceState = {
  enabled: false,
  sampleRate: 16000,
  lang: "es",
  reply: true,
  recording: false,
  starting: false,
  streamId: null,
  media: null,
  ctx: null,
  node: null,
  source: null,
  sink: null,
  chain: Promise.resolve(),
  transcript: "",
  partial: "",
};

let bound = false;
let activeHost: VoiceHost | null = null;
const audioQueue: string[] = [];
let audioPlaying = false;
let currentAudio: HTMLAudioElement | null = null;

export function voiceReplyEnabled(): boolean {
  return state.enabled && state.reply;
}

export function voiceLang(): string {
  return state.lang;
}

function readStoredReply(): boolean {
  try {
    const raw = localStorage.getItem(VOICE_REPLY_KEY);
    if (raw === "false") {
      return false;
    }
    if (raw === "true") {
      return true;
    }
  } catch {
    /* private mode */
  }
  return true;
}

function storeReply(value: boolean): void {
  try {
    localStorage.setItem(VOICE_REPLY_KEY, value ? "true" : "false");
  } catch {
    /* private mode */
  }
}

function setIcon(button: HTMLButtonElement | null, name: string): void {
  const icon = button?.querySelector(".material-symbols-outlined");
  if (icon) {
    icon.textContent = name;
  }
}

function paintUi(host: VoiceHost | null): void {
  if (!host) {
    return;
  }
  host.mic.hidden = !state.enabled;
  host.mic.disabled = state.starting;
  host.mic.classList.toggle("agent-chat-mic--recording", state.recording);
  host.mic.setAttribute("aria-pressed", state.recording ? "true" : "false");
  host.mic.setAttribute("aria-label", state.recording ? "Stop and view text" : "Record voice");
  host.mic.setAttribute("title", state.recording ? "Stop and view text" : "Record voice");
  setIcon(host.mic, state.recording ? "stop_circle" : "mic");
  if (host.toggle) {
    host.toggle.hidden = !state.enabled;
    host.toggle.setAttribute("aria-pressed", state.reply ? "true" : "false");
    host.toggle.setAttribute("aria-label", state.reply ? "Mute spoken replies" : "Speak replies");
    host.toggle.setAttribute("title", state.reply ? "Mute spoken replies" : "Speak replies");
    setIcon(host.toggle, state.reply ? "volume_up" : "volume_off");
  }
}

function paintTranscript(host: VoiceHost | null, finalText: string, partial = ""): void {
  if (!host) {
    return;
  }
  const live = [finalText, partial].filter(Boolean).join(" ").trim();
  if (live) {
    if (host.input) {
      host.input.value = live;
      host.input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    host.setDraft(live);
  }
  if (host.caption) {
    host.caption.hidden = !state.recording && !live;
    if (state.recording) {
      host.caption.textContent = live || "Recording… press the stop button to finish.";
    } else {
      host.caption.textContent = live;
    }
  }
}

function blobUrl(base64: string, mime: string): string | null {
  try {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return null;
  }
}

function playNextAudio(): void {
  if (audioPlaying || audioQueue.length === 0) {
    return;
  }
  const url = audioQueue.shift();
  if (!url) {
    return;
  }
  audioPlaying = true;
  const audio = new Audio(url);
  currentAudio = audio;
  const done = (): void => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) {
      currentAudio = null;
    }
    audioPlaying = false;
    playNextAudio();
  };
  audio.onended = done;
  audio.onerror = () => {
    sessionLog("voice.audio.error", { queued: audioQueue.length });
    done();
  };
  audio.onplay = () => sessionLog("voice.audio.play", { queued: audioQueue.length });
  void audio.play().catch((err) => {
    sessionLog("voice.audio.blocked", { message: String(err) });
    done();
  });
}

export function enqueueVoiceAudio(base64: string, mime: string): void {
  const url = blobUrl(base64, mime || "audio/mpeg");
  if (!url) {
    sessionLog("voice.audio.decode_error", { mime });
    return;
  }
  sessionLog("voice.audio.enqueue", { mime, queued: audioQueue.length + 1 });
  audioQueue.push(url);
  playNextAudio();
}

export function stopVoicePlayback(): void {
  if (audioQueue.length || currentAudio) {
    sessionLog("voice.audio.stop", { queued: audioQueue.length });
  }
  for (const url of audioQueue.splice(0)) {
    URL.revokeObjectURL(url);
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  audioPlaying = false;
}

function teardownCapture(): void {
  if (state.node) {
    state.node.port.onmessage = null;
  }
  try {
    state.source?.disconnect();
  } catch {
    /* ignore */
  }
  try {
    state.node?.disconnect();
  } catch {
    /* ignore */
  }
  try {
    state.sink?.disconnect();
  } catch {
    /* ignore */
  }
  state.media?.getTracks().forEach((track) => track.stop());
  const ctx = state.ctx;
  state.media = null;
  state.ctx = null;
  state.source = null;
  state.node = null;
  state.sink = null;
  if (ctx) {
    void ctx.close().catch(() => undefined);
  }
}

/** Stops voice, frees the composer for typing, and shows why. */
function abortVoice(message: string): void {
  const host = activeHost;
  const streamId = state.streamId;
  state.streamId = null;
  state.recording = false;
  state.starting = false;
  state.transcript = "";
  state.partial = "";
  teardownCapture();
  if (streamId) {
    void cancelVoiceStream(streamId);
  }
  host?.setBusy(false);
  if (host) {
    paintUi(host);
    if (host.caption) {
      host.caption.hidden = false;
      host.caption.textContent = message;
    }
  }
}

function enqueueChunk(buffer: ArrayBuffer): void {
  state.chain = state.chain
    .then(async () => {
      if (!state.streamId) {
        return;
      }
      const result = await postVoiceChunk(state.streamId, buffer);
      if (result.status !== 200) {
        sessionLog("voice.chunk.error", {
          streamId: state.streamId,
          status: result.status,
          error: result.data.error,
          bytes: buffer.byteLength,
        });
        abortVoice("Voice connection lost. You can type instead.");
        return;
      }
      const text = (result.data.text || "").trim();
      const partial = (result.data.partial || "").trim();
      state.transcript = text;
      state.partial = partial;
      if (text || partial) {
        sessionLog("voice.chunk.text", {
          streamId: state.streamId,
          finalRunes: text.length,
          partialRunes: partial.length,
          bytes: buffer.byteLength,
        });
      }
      paintTranscript(activeHost, text, partial);
    })
    .catch((err) => {
      sessionLog("voice.chunk.throw", { streamId: state.streamId, message: String(err) });
    });
}

function voiceErrorMessage(err: unknown): { code: string; message: string } {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
      case "SecurityError":
        return {
          code: err.name,
          message:
            "Microphone access is blocked. Allow the microphone for this site in the browser (and OS privacy settings), then try again.",
        };
      case "NotFoundError":
        return { code: err.name, message: "No microphone was found on this device." };
      case "NotReadableError":
      case "AbortError":
        return {
          code: err.name,
          message: "The microphone is busy or unavailable. Close other apps using it and try again.",
        };
      default:
        return { code: err.name || "dom_error", message: `Could not use the microphone (${err.name}).` };
    }
  }
  const code = err instanceof Error ? err.message : String(err);
  switch (code) {
    case "insecure":
      return { code, message: "Voice needs a secure page. Open the site over HTTPS or on localhost." };
    case "unsupported":
      return { code, message: "Voice input is not supported in this browser." };
    case "backend":
      return {
        code,
        message: "The voice service is unavailable. Start the speech-to-text worker, then try again.",
      };
    default:
      return { code, message: "Could not start voice input. Try again." };
  }
}

async function startRecording(host: VoiceHost): Promise<void> {
  if (state.starting || state.recording) {
    return;
  }
  state.starting = true;
  activeHost = host;
  sessionLog("voice.record.start", { lang: state.lang, sampleRate: state.sampleRate });
  paintUi(host);
  let media: MediaStream | null = null;
  let ctx: AudioContext | null = null;
  let streamId: string | null = null;
  try {
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      throw new Error("insecure");
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("unsupported");
    }
    media = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    sessionLog("voice.record.mic", { tracks: media.getTracks().length });
    streamId = await startVoiceStream(state.lang);
    if (!streamId) {
      throw new Error("backend");
    }
    ctx = new AudioContext({ sampleRate: state.sampleRate || 16000 });
    await ctx.audioWorklet.addModule("/voice-pcm-worklet.js");
    const source = ctx.createMediaStreamSource(media);
    const node = new AudioWorkletNode(ctx, "voice-pcm");
    const sink = ctx.createGain();
    sink.gain.value = 0;
    source.connect(node);
    node.connect(sink);
    sink.connect(ctx.destination);
    node.port.onmessage = (event: MessageEvent) => {
      enqueueChunk(event.data as ArrayBuffer);
    };
    state.media = media;
    state.ctx = ctx;
    state.source = source;
    state.node = node;
    state.sink = sink;
    state.streamId = streamId;
    state.transcript = "";
    state.partial = "";
    state.recording = true;
    state.chain = Promise.resolve();
    stopVoicePlayback();
    host.setBusy(true);
    sessionLog("voice.record.started", { streamId, sampleRate: ctx.sampleRate });
    setIcon(host.mic, "stop_circle");
    paintTranscript(host, "");
  } catch (err) {
    const { code, message } = voiceErrorMessage(err);
    sessionLog("voice.record.error", {
      code,
      message,
      reason: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    });
    host.setBusy(false);
    media?.getTracks().forEach((track) => track.stop());
    if (ctx) {
      try {
        await ctx.close();
      } catch {
        /* ignore */
      }
    }
    if (streamId) {
      void cancelVoiceStream(streamId);
    }
    showErrorModal({ message });
  } finally {
    state.starting = false;
    paintUi(host);
  }
}

async function stopRecording(host: VoiceHost): Promise<void> {
  if (!state.recording) {
    return;
  }
  state.recording = false;
  sessionLog("voice.record.stop", { streamId: state.streamId });
  paintUi(host);
  const streamId = state.streamId;
  state.streamId = null;
  teardownCapture();
  if (host.caption) {
    host.caption.hidden = false;
    host.caption.textContent = "Transcribing…";
  }
  try {
    await state.chain.catch(() => undefined);
    let text = [state.transcript, state.partial].filter(Boolean).join(" ").trim();
    if (streamId) {
      const finalText = await stopVoiceStream(streamId);
      if (finalText) {
        text = finalText;
      }
    }
    state.transcript = "";
    state.partial = "";
    let finalText = text.trim();
    sessionLog("voice.record.final", { streamId, runes: finalText.length });
    if (finalText) {
      if (host.caption) {
        host.caption.hidden = false;
        host.caption.textContent = "Interpreting…";
      }
      const cleaned = await interpretVoiceMessage(finalText, host.history(), state.lang);
      sessionLog("voice.record.interpreted", {
        inRunes: finalText.length,
        outRunes: cleaned.length,
      });
      if (cleaned) {
        finalText = cleaned;
      }
      host.setDraft(finalText);
      if (host.caption) {
        host.caption.textContent = "Contextualized. Edit, then press send.";
      }
    } else if (host.caption) {
      host.caption.hidden = false;
      host.caption.textContent = "No speech detected. You can type instead.";
    }
  } finally {
    host.setBusy(false);
  }
}

export function startVoiceHost(host: VoiceHost): void {
  if (host.mic.dataset.voiceBound !== "true") {
    host.mic.dataset.voiceBound = "true";
    if (!bound) {
      bound = true;
      state.reply = readStoredReply();
    }
    host.mic.addEventListener("click", () => {
      if (state.recording) {
        void stopRecording(host);
      } else {
        void startRecording(host);
      }
    });
    host.toggle?.addEventListener("click", () => {
      state.reply = !state.reply;
      storeReply(state.reply);
      sessionLog("voice.reply.toggle", { enabled: state.reply });
      if (!state.reply) {
        stopVoicePlayback();
      }
      paintUi(host);
    });
    void initVoice(host);
  }
  paintUi(host);
}

function resolveAgentHost(): VoiceHost | null {
  const mic = document.querySelector("[data-agent-mic]");
  if (!(mic instanceof HTMLButtonElement)) {
    return null;
  }
  const toggle = document.querySelector("[data-agent-speak-toggle]");
  const caption = document.querySelector("[data-agent-voice]");
  const input = document.querySelector("[data-agent-input]");
  return {
    mic,
    toggle: toggle instanceof HTMLButtonElement ? toggle : null,
    caption: caption instanceof HTMLElement ? caption : null,
    input: input instanceof HTMLTextAreaElement ? input : null,
    setDraft: setAgentChatDraft,
    setBusy: setAgentChatBusy,
    history: currentAgentHistory,
  };
}

export function startVoiceChat(): void {
  const host = resolveAgentHost();
  if (host) {
    startVoiceHost(host);
  }
}

async function initVoice(host: VoiceHost): Promise<void> {
  const config = await getVoiceConfig();
  if (!config) {
    state.enabled = false;
    host.mic.hidden = true;
    if (host.toggle) {
      host.toggle.hidden = true;
    }
    sessionLog("voice.config", { enabled: false });
    return;
  }
  state.enabled = true;
  state.sampleRate = config.sampleRate || 16000;
  state.lang = config.defaultLang || "es";
  sessionLog("voice.config", {
    enabled: true,
    sampleRate: state.sampleRate,
    lang: state.lang,
    langs: config.langs,
  });
  paintUi(host);
}
