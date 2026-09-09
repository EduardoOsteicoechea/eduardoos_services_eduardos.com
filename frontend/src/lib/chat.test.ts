import { afterEach, describe, expect, it, vi } from "vitest";
import { postChatStream } from "./api";
import { resetAgentChat, startAgentChat } from "./chat";
import { showErrorModal } from "./error-modal";

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return { ...actual, postChatStream: vi.fn() };
});

vi.mock("./error-modal", () => ({
  showErrorModal: vi.fn(),
}));

function mountTray(): void {
  document.body.innerHTML = `
    <aside id="agent-sidebar">
      <button type="button" data-agent-collapse aria-label="Hide AI agent"></button>
      <p data-agent-empty>Ask a short question about this site.</p>
      <div data-agent-log></div>
      <div data-agent-select-bar hidden>
        <button type="button" data-agent-copy-selected>Copy selected</button>
        <button type="button" data-agent-cancel-select>Cancel</button>
      </div>
      <div data-agent-history hidden></div>
      <form data-agent-form>
        <p data-agent-reply hidden></p>
        <textarea data-agent-input></textarea>
        <div data-agent-drop>
          <input type="file" data-agent-files hidden />
          <p data-agent-drop-label>Drop images</p>
          <div data-agent-thumbs></div>
        </div>
        <button type="button" data-agent-new>New</button>
        <button type="button" data-agent-history-toggle>History</button>
        <button type="submit" data-agent-send disabled>Send</button>
      </form>
    </aside>
  `;
}

describe("agent chat tray", () => {
  afterEach(() => {
    resetAgentChat();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("streams markdown as DOM and never executes HTML", async () => {
    mountTray();
    vi.mocked(postChatStream).mockImplementation(async (_message, _history, onDelta) => {
      onDelta("Visit **turquesa.shop** ");
      onDelta(`<img src=x onerror=alert(1)>`);
      return {
        status: 200,
        requestId: "rid-chat-1",
        data: { ok: true, text: "Visit **turquesa.shop** <img src=x onerror=alert(1)>", request_id: "rid-chat-1" },
      };
    });
    startAgentChat();
    const send = document.querySelector("[data-agent-send]") as HTMLButtonElement;
    const input = document.querySelector("[data-agent-input]") as HTMLTextAreaElement;
    expect(send.disabled).toBe(true);
    input.value = "hello";
    input.dispatchEvent(new Event("input"));
    expect(send.disabled).toBe(false);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      expect(document.querySelector(".agent-chat-msg-assistant strong")?.textContent).toBe("turquesa.shop");
    });
    expect(document.querySelector("[data-agent-log] img")).toBeNull();
    expect(document.querySelector(".agent-chat-msg-user")).toBeTruthy();
    expect(document.querySelector(".agent-chat-msg-assistant")).toBeTruthy();
    expect(vi.mocked(postChatStream)).toHaveBeenCalled();
  });

  it("does not send an empty Enter and opens the error modal on provider failure", async () => {
    mountTray();
    vi.mocked(postChatStream).mockResolvedValue({
      status: 200,
      requestId: "rid-chat-2",
      data: { ok: false, error: "provider_unavailable", message: "The assistant could not reply.", request_id: "rid-chat-2" },
    });
    startAgentChat();
    const input = document.querySelector("[data-agent-input]") as HTMLTextAreaElement;
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(vi.mocked(postChatStream)).not.toHaveBeenCalled();
    input.value = "hello";
    input.dispatchEvent(new Event("input"));
    document.querySelector("[data-agent-form]")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      expect(showErrorModal).toHaveBeenCalled();
    });
    expect(document.querySelector(".agent-chat-msg-assistant")).toBeNull();
  });

  it("hides copy-selected until select mode and keeps the empty hint in the log", () => {
    mountTray();
    startAgentChat();
    const bar = document.querySelector("[data-agent-select-bar]") as HTMLElement;
    const empty = document.querySelector("[data-agent-empty]") as HTMLElement;
    const log = document.querySelector("[data-agent-log]") as HTMLElement;
    expect(bar.hidden).toBe(true);
    expect(empty.hidden).toBe(false);
    expect(log.contains(empty)).toBe(true);
  });

  it("applies the default tray width", () => {
    mountTray();
    startAgentChat();
    const aside = document.getElementById("agent-sidebar") as HTMLElement;
    expect(aside.style.width).toBe("20rem");
    expect(aside.style.getPropertyValue("--agent-sidebar-width")).toBe("20rem");
  });
});
