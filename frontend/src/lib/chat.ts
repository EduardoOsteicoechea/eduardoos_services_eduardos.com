import { postChat, type ChatTurn } from "./api";
import { showErrorModal } from "./error-modal";

const MAX_HISTORY = 8;
const MAX_MESSAGE = 500;

const copy = {
  failed: "The assistant could not reply.",
  timeout: "The assistant took too long to reply.",
  rateLimited: "Too many questions. Try again later.",
};

let turns: ChatTurn[] = [];

export function resetAgentChat(): void {
  turns = [];
}

function paintChat(): void {
  const log = document.querySelector("[data-agent-log]");
  const empty = document.querySelector("[data-agent-empty]");
  if (!(log instanceof HTMLElement)) {
    return;
  }
  log.replaceChildren();
  for (const turn of turns) {
    const p = document.createElement("p");
    p.className = `agent-chat-msg agent-chat-msg-${turn.role}`;
    p.textContent = turn.content;
    log.append(p);
  }
  if (empty instanceof HTMLElement) {
    empty.hidden = turns.length > 0;
  }
}

function chatErrorMessage(status: number, data: { error?: string; message?: string }): string {
  if (status === 0) {
    return copy.timeout;
  }
  if (status === 429 || data.error === "rate_limited") {
    return copy.rateLimited;
  }
  return data.message || copy.failed;
}

export function startAgentChat(): void {
  const form = document.querySelector("[data-agent-form]");
  const input = document.querySelector("[data-agent-input]");
  const send = document.querySelector("[data-agent-send]");
  if (!(form instanceof HTMLFormElement) || !(input instanceof HTMLTextAreaElement)) {
    return;
  }
  paintChat();
  if (form.dataset.bound === "true") {
    return;
  }
  form.dataset.bound = "true";
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || message.length > MAX_MESSAGE) {
      return;
    }
    const history = turns.slice(-MAX_HISTORY);
    turns.push({ role: "user", content: message });
    paintChat();
    input.value = "";
    if (send instanceof HTMLButtonElement) {
      send.disabled = true;
    }
    void (async () => {
      try {
        const result = await postChat(message, history);
        if (result.status === 200 && result.data.ok && result.data.text) {
          turns.push({ role: "assistant", content: result.data.text });
          paintChat();
          return;
        }
        showErrorModal({
          message: chatErrorMessage(result.status, result.data),
          requestId: result.data.request_id || result.requestId,
          details: result.data.request_id || result.requestId ? `request_id=${result.data.request_id || result.requestId}` : "",
          debug: result.data.debug,
        });
      } finally {
        if (send instanceof HTMLButtonElement) {
          send.disabled = false;
        }
      }
    })();
  });
}
