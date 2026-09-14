import {
  cancelVoiceStream,
  getVoiceConfig,
  postVoiceChunk,
  startVoiceStream,
  stopVoiceStream,
} from "./api";
import { setAgentChatDraft } from "./chat";
import { sessionLog } from "./dev-log";
import { showErrorModal } from "./error-modal";

// Global voice input for the agent dock. Captures 16 kHz mono PCM through an
// AudioWorklet, streams chunks to the Go STT endpoint for live transcription,
// and plays back the assistant's spoken replies queued from the chat SSE
// stream. Everything is best-effort: when the feature is off or unsupported,
// the mic button stays hidden and the text chat is unaffected.

const VOICE_REPLY_KEY = "eduardoos.voice.reply";

type VoiceUi = {
  mic: HTMLButtonElement;
  toggle: HTMLButtonElement | null;
  input: HTMLTextAreaElement;
  caption: HTMLElement | null;
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
};

let bound = false;
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

function resolveUi(): VoiceUi | null {
  const mic = document.querySelector("[data-agent-mic]");
  const input = document.querySelector("[data-agent-input]");
  const toggle = document.querySelector("[data-agent-speak-toggle]");
  const caption = document.querySelector("[data-agent-voice]");
  if (!(mic instanceof HTMLButtonElement) || !(input instanceof HTMLTextAreaElement)) {
    return null;
  }
  return {
    mic,
    toggle: toggle instanceof HTMLButtonElement ? toggle : null,
    input,
    caption: caption instanceof HTMLElement ? caption : null,
  };
}

function setIcon(button: HTMLButtonElement | null, name: string): void {
  const icon = button?.querySelector(".material-symbols-outlined");
  if (icon) {
    icon.textContent = name;
  }
}

function paintUi(ui: VoiceUi | null): void {
  if (!ui) {
    return;
  }
  ui.mic.hidden = !state.enabled;
  ui.mic.disabled = state.starting;
  ui.mic.classList.toggle("agent-chat-mic--recording", state.recording);
  ui.mic.setAttribute("aria-pressed", state.recording ? "true" : "false");
  ui.mic.setAttribute("aria-label", state.recording ? "Stop and view text" : "Record voice");
  ui.mic.setAttribute("title", state.recording ? "Stop and view text" : "Record voice");
  setIcon(ui.mic, state.recording ? "stop_circle" : "mic");
  if (ui.toggle) {
    ui.toggle.hidden = !state.enabled;
    ui.toggle.setAttribute("aria-pressed", state.reply ? "true" : "false");
    ui.toggle.setAttribute("aria-label", state.reply ? "Mute spoken replies" : "Speak replies");
    ui.toggle.setAttribute("title", state.reply ? "Mute spoken replies" : "Speak replies");
    setIcon(ui.toggle, state.reply ? "volume_up" : "volume_off");
  }
}

function paintTranscript(ui: VoiceUi | null, interim: string): void {
  if (!ui) {
    return;
  }
  if (interim) {
    ui.input.value = interim;
    ui.input.dispatchEvent(new Event("input", { bubbles: true }));
  }
  if (ui.caption) {
    ui.caption.hidden = !state.recording && !interim;
    ui.caption.textContent = state.recording
      ? interim || "Listening… press the stop button to finish."
      : interim;
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
        return;
      }
      const text = (result.data.text || "").trim();
      if (text) {
        state.transcript = text;
        sessionLog("voice.chunk.text", { streamId: state.streamId, runes: text.length, bytes: buffer.byteLength });
        paintTranscript(resolveUi(), text);
      }
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

async function startRecording(ui: VoiceUi): Promise<void> {
  if (state.starting || state.recording) {
    return;
  }
  state.starting = true;
  sessionLog("voice.record.start", { lang: state.lang, sampleRate: state.sampleRate });
  paintUi(ui);
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
    state.recording = true;
    state.chain = Promise.resolve();
    stopVoicePlayback();
    sessionLog("voice.record.started", { streamId, sampleRate: ctx.sampleRate });
    setIcon(ui.mic, "stop_circle");
    paintTranscript(ui, "");
  } catch (err) {
    const { code, message } = voiceErrorMessage(err);
    sessionLog("voice.record.error", {
      code,
      message,
      reason: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    });
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
    paintUi(ui);
  }
}

async function stopRecording(ui: VoiceUi): Promise<void> {
  if (!state.recording) {
    return;
  }
  state.recording = false;
  sessionLog("voice.record.stop", { streamId: state.streamId });
  paintUi(ui);
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
  const streamId = state.streamId;
  state.media = null;
  state.ctx = null;
  state.source = null;
  state.node = null;
  state.sink = null;
  state.streamId = null;
  if (ctx) {
    try {
      await ctx.close();
    } catch {
      /* ignore */
    }
  }
  await state.chain.catch(() => undefined);
  let text = state.transcript;
  if (streamId) {
    const finalText = await stopVoiceStream(streamId);
    if (finalText) {
      text = finalText;
    }
  }
  state.transcript = "";
  const finalText = text.trim();
  sessionLog("voice.record.final", { streamId, runes: finalText.length });
  if (finalText) {
    setAgentChatDraft(finalText);
    if (ui.caption) {
      ui.caption.hidden = false;
      ui.caption.textContent = "Transcription ready. Edit, then press send.";
    }
    ui.input.focus();
  } else if (ui.caption) {
    ui.caption.hidden = false;
    ui.caption.textContent = "No speech detected.";
  }
}

export function startVoiceChat(): void {
  const ui = resolveUi();
  if (!ui) {
    return;
  }
  if (ui.mic.dataset.voiceBound !== "true") {
    ui.mic.dataset.voiceBound = "true";
    if (!bound) {
      bound = true;
      state.reply = readStoredReply();
    }
    ui.mic.addEventListener("click", () => {
      if (state.recording) {
        void stopRecording(ui);
      } else {
        void startRecording(ui);
      }
    });
    ui.toggle?.addEventListener("click", () => {
      state.reply = !state.reply;
      storeReply(state.reply);
      sessionLog("voice.reply.toggle", { enabled: state.reply });
      if (!state.reply) {
        stopVoicePlayback();
      }
      paintUi(ui);
    });
    void initVoice(ui);
  }
  paintUi(ui);
}

async function initVoice(ui: VoiceUi): Promise<void> {
  const config = await getVoiceConfig();
  if (!config) {
    state.enabled = false;
    ui.mic.hidden = true;
    if (ui.toggle) {
      ui.toggle.hidden = true;
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
  paintUi(ui);
}
