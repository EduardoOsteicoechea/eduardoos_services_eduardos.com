import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getVoiceConfig,
  interpretVoiceMessage,
  postVoiceChunk,
  startVoiceStream,
  stopVoiceStream,
} from "./api";
import { setAgentChatDraft } from "./chat";
import { showErrorModal } from "./error-modal";
import { enqueueVoiceAudio, startVoiceChat, stopVoicePlayback } from "./voice";

vi.mock("./api", () => ({
  getVoiceConfig: vi.fn(),
  startVoiceStream: vi.fn(),
  postVoiceChunk: vi.fn(),
  stopVoiceStream: vi.fn(),
  cancelVoiceStream: vi.fn(),
  interpretVoiceMessage: vi.fn(),
}));

vi.mock("./chat", () => ({
  setAgentChatDraft: vi.fn(),
  currentAgentHistory: vi.fn(() => []),
}));

vi.mock("./error-modal", () => ({
  showErrorModal: vi.fn(),
}));

const workletNodes: FakeWorkletNode[] = [];

class FakeWorkletNode {
  port: { onmessage: ((event: MessageEvent) => void) | null } = { onmessage: null };
  connect = vi.fn();
  disconnect = vi.fn();

  constructor() {
    workletNodes.push(this);
  }
}

class FakeGain {
  gain = { value: 1 };
  connect = vi.fn();
  disconnect = vi.fn();
}

class FakeSource {
  connect = vi.fn();
  disconnect = vi.fn();
}

class FakeAudioContext {
  sampleRate = 16000;
  destination = {};
  audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
  createMediaStreamSource = vi.fn(() => new FakeSource());
  createGain = vi.fn(() => new FakeGain());
  close = vi.fn().mockResolvedValue(undefined);
}

class FakeAudio {
  static instances: FakeAudio[] = [];
  src = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();

  constructor() {
    FakeAudio.instances.push(this);
  }
}

function mountComposer(): void {
  document.body.innerHTML = `
    <aside id="agent-sidebar">
      <form data-agent-form>
        <p data-agent-reply hidden></p>
        <p data-agent-voice hidden></p>
        <textarea data-agent-input></textarea>
        <div data-agent-tools>
          <button type="button" data-agent-speak-toggle hidden aria-pressed="true">
            <span class="material-symbols-outlined">volume_up</span>
          </button>
          <button type="button" data-agent-mic hidden aria-pressed="false">
            <span class="material-symbols-outlined">mic</span>
          </button>
          <button type="submit" data-agent-send disabled>Send</button>
        </div>
      </form>
    </aside>
  `;
}

describe("global voice input", () => {
  beforeEach(() => {
    workletNodes.length = 0;
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.stubGlobal("AudioWorkletNode", FakeWorkletNode);
    vi.stubGlobal("Audio", FakeAudio);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });
    globalThis.URL.createObjectURL = vi.fn(() => "blob:voice");
    globalThis.URL.revokeObjectURL = vi.fn();
    mountComposer();
  });

  afterEach(() => {
    stopVoicePlayback();
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    // The module binds listeners once; reset by reloading state through the DOM check.
  });

  it("hides the mic when the backend reports voice disabled", async () => {
    vi.mocked(getVoiceConfig).mockResolvedValue(null);
    startVoiceChat();
    await vi.waitFor(() => {
      expect((document.querySelector("[data-agent-mic]") as HTMLElement).hidden).toBe(true);
    });
  });

  it("streams chunks and shows the final transcript for review without sending", async () => {
    vi.mocked(getVoiceConfig).mockResolvedValue({
      enabled: true,
      sampleRate: 16000,
      langs: ["es", "en"],
      defaultLang: "es",
    });
    vi.mocked(startVoiceStream).mockResolvedValue("stream-1");
    vi.mocked(postVoiceChunk).mockResolvedValue({ status: 200, data: { text: "hola" } });
    vi.mocked(stopVoiceStream).mockResolvedValue("hola mundo");
    vi.mocked(interpretVoiceMessage).mockResolvedValue("hola mundo");
    const track = { stop: vi.fn() };
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue({
      getTracks: () => [track],
    } as unknown as MediaStream);

    startVoiceChat();
    const mic = document.querySelector("[data-agent-mic]") as HTMLButtonElement;
    await vi.waitFor(() => expect(mic.hidden).toBe(false));

    mic.click();
    await vi.waitFor(() => expect(workletNodes.length).toBe(1));

    workletNodes[0].port.onmessage?.({ data: new ArrayBuffer(4) } as MessageEvent);
    await vi.waitFor(() => {
      expect((document.querySelector("[data-agent-input]") as HTMLTextAreaElement).value).toBe("hola");
    });

    mic.click();
    await vi.waitFor(() => {
      expect(setAgentChatDraft).toHaveBeenCalledWith("hola mundo");
    });
    const caption = document.querySelector("[data-agent-voice]") as HTMLElement;
    expect(caption.hidden).toBe(false);
    expect(caption.textContent).toContain("Contextualized");
    expect(track.stop).toHaveBeenCalled();
    expect(stopVoiceStream).toHaveBeenCalledWith("stream-1");
  });

  it("passes the raw transcript through DeepSeek interpretation before drafting", async () => {
    vi.mocked(getVoiceConfig).mockResolvedValue({ enabled: true, sampleRate: 16000, langs: ["es"], defaultLang: "es" });
    vi.mocked(startVoiceStream).mockResolvedValue("stream-3");
    vi.mocked(stopVoiceStream).mockResolvedValue("ola komo estas");
    vi.mocked(interpretVoiceMessage).mockResolvedValue("Hola, ¿cómo estás?");
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream);

    startVoiceChat();
    const mic = document.querySelector("[data-agent-mic]") as HTMLButtonElement;
    await vi.waitFor(() => expect(mic.hidden).toBe(false));
    mic.click();
    await vi.waitFor(() => expect(workletNodes.length).toBe(1));
    mic.click();
    await vi.waitFor(() => {
      expect(interpretVoiceMessage).toHaveBeenCalledWith("ola komo estas", expect.anything(), "es");
    });
    expect(setAgentChatDraft).toHaveBeenCalledWith("Hola, ¿cómo estás?");
  });

  it("plays queued audio and stops on demand", () => {
    vi.mocked(getVoiceConfig).mockResolvedValue(null);
    startVoiceChat();
    FakeAudio.instances.length = 0;
    enqueueVoiceAudio(btoa("abc"), "audio/mpeg");
    expect(FakeAudio.instances.length).toBe(1);
    expect(FakeAudio.instances[0].play).toHaveBeenCalled();
    stopVoicePlayback();
  });

  it("reports a blocked microphone as such", async () => {
    vi.mocked(getVoiceConfig).mockResolvedValue({ enabled: true, sampleRate: 16000, langs: ["en"], defaultLang: "en" });
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
      new DOMException("denied", "NotAllowedError"),
    );
    startVoiceChat();
    const mic = document.querySelector("[data-agent-mic]") as HTMLButtonElement;
    await vi.waitFor(() => expect(mic.hidden).toBe(false));
    mic.click();
    await vi.waitFor(() => expect(showErrorModal).toHaveBeenCalled());
    const arg = vi.mocked(showErrorModal).mock.calls.at(-1)?.[0];
    expect(arg?.message).toContain("Microphone access is blocked");
  });

  it("reports an unavailable voice backend instead of blaming the mic", async () => {
    vi.mocked(getVoiceConfig).mockResolvedValue({ enabled: true, sampleRate: 16000, langs: ["en"], defaultLang: "en" });
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue({ getTracks: () => [] } as unknown as MediaStream);
    vi.mocked(startVoiceStream).mockResolvedValue(null);
    startVoiceChat();
    const mic = document.querySelector("[data-agent-mic]") as HTMLButtonElement;
    await vi.waitFor(() => expect(mic.hidden).toBe(false));
    mic.click();
    await vi.waitFor(() => expect(showErrorModal).toHaveBeenCalled());
    const arg = vi.mocked(showErrorModal).mock.calls.at(-1)?.[0];
    expect(arg?.message).toContain("voice service is unavailable");
  });

  it("streams interim (partial) text into the composer while recording", async () => {
    vi.mocked(getVoiceConfig).mockResolvedValue({ enabled: true, sampleRate: 16000, langs: ["es"], defaultLang: "es" });
    vi.mocked(startVoiceStream).mockResolvedValue("stream-2");
    vi.mocked(postVoiceChunk).mockResolvedValue({ status: 200, data: { text: "hola", partial: "mun" } });
    vi.mocked(stopVoiceStream).mockResolvedValue("");
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream);
    startVoiceChat();
    const mic = document.querySelector("[data-agent-mic]") as HTMLButtonElement;
    await vi.waitFor(() => expect(mic.hidden).toBe(false));
    mic.click();
    await vi.waitFor(() => expect(workletNodes.length).toBe(1));
    workletNodes[0].port.onmessage?.({ data: new ArrayBuffer(4) } as MessageEvent);
    await vi.waitFor(() => {
      expect((document.querySelector("[data-agent-input]") as HTMLTextAreaElement).value).toBe("hola mun");
    });
    const caption = document.querySelector("[data-agent-voice]") as HTMLElement;
    expect(caption.textContent).toContain("hola mun");
  });
});
