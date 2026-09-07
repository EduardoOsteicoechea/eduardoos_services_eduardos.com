import { afterEach, describe, expect, it, vi } from "vitest";
import { postChat } from "./api";
import { resetAgentChat, startAgentChat } from "./chat";
import { showErrorModal } from "./error-modal";

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return { ...actual, postChat: vi.fn() };
});

vi.mock("./error-modal", () => ({
  showErrorModal: vi.fn(),
}));

function mountTray(): void {
  document.body.innerHTML = `
    <aside id="agent-sidebar">
      <p data-agent-empty>Ask a short question about this site.</p>
      <div data-agent-log></div>
      <form data-agent-form>
        <textarea data-agent-input></textarea>
        <button type="submit" data-agent-send>Send</button>
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

  it("renders model text with textContent and never as HTML", async () => {
    mountTray();
    vi.mocked(postChat).mockResolvedValue({
      status: 200,
      requestId: "rid-chat-1",
      data: { ok: true, text: `<img src=x onerror=alert(1)>`, request_id: "rid-chat-1" },
    });
    startAgentChat();
    const input = document.querySelector("[data-agent-input]") as HTMLTextAreaElement;
    input.value = "hello";
    document.querySelector("[data-agent-form]")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      expect(document.querySelector("[data-agent-log]")?.textContent).toContain("<img src=x onerror=alert(1)>");
    });
    expect(document.querySelector("[data-agent-log] img")).toBeNull();
    expect(vi.mocked(postChat)).toHaveBeenCalledWith("hello", []);
  });

  it("opens the error modal when the provider is unavailable", async () => {
    mountTray();
    vi.mocked(postChat).mockResolvedValue({
      status: 200,
      requestId: "rid-chat-2",
      data: { ok: false, error: "provider_unavailable", message: "The assistant could not reply.", request_id: "rid-chat-2" },
    });
    startAgentChat();
    const input = document.querySelector("[data-agent-input]") as HTMLTextAreaElement;
    input.value = "hello";
    document.querySelector("[data-agent-form]")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      expect(showErrorModal).toHaveBeenCalled();
    });
    expect(document.querySelector("[data-agent-log]")?.textContent).toContain("hello");
    expect(document.querySelector("[data-agent-log]")?.querySelector(".agent-chat-msg-assistant")).toBeNull();
  });
});
