import { postChatStream, type ChatTurn } from "./api";
import { showErrorModal } from "./error-modal";
import { renderMarkdown } from "./markdown";

const MAX_HISTORY = 8;
const MAX_MESSAGE = 500;
const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 1500000;
const SIDEBAR_DEFAULT_REM = 20;

const copy = {
  failed: "The assistant could not reply.",
  timeout: "The assistant took too long to reply.",
  rateLimited: "Too many questions. Try again later.",
  copy: "Copy",
  selectMany: "Select many",
  reply: "Reply",
  replyTo: "Replying to",
  cancel: "Cancel",
  copySelected: "Copy selected",
  emptyHistory: "No saved chats yet.",
  imageOnly: "I attached an image.",
  dropImages: "Drop images",
  removeImage: "Remove image",
  messageActions: "Message actions",
};

type AgentTurn = ChatTurn & {
  ms?: number;
  at?: number;
  images?: string[];
  replyTo?: string;
};

type SavedChat = { id: string; title: string; turns: AgentTurn[] };

let turns: AgentTurn[] = [];
let saved: SavedChat[] = [];
let pendingImages: { url: string; file: File }[] = [];
let replyTo = "";
let selectMode = false;
let selected = new Set<number>();
let openMenu = -1;
let sidebarWidthRem = SIDEBAR_DEFAULT_REM;

export function resetAgentChat(): void {
  revokeAll(pendingImages.map((item) => item.url));
  pendingImages = [];
  turns = [];
  saved = [];
  replyTo = "";
  selectMode = false;
  selected = new Set();
  openMenu = -1;
  sidebarWidthRem = SIDEBAR_DEFAULT_REM;
}

function revokeAll(urls: string[]): void {
  for (const url of urls) {
    URL.revokeObjectURL(url);
  }
}

function formatClock(at: number): string {
  const d = new Date(at);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
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

function hasComposerContent(input: HTMLTextAreaElement): boolean {
  return Boolean(input.value.trim() || pendingImages.length);
}

function syncSend(input: HTMLTextAreaElement, send: HTMLButtonElement | null): void {
  if (send) {
    send.disabled = !hasComposerContent(input);
  }
}

function applySidebarWidth(): void {
  const aside = document.getElementById("agent-sidebar");
  if (!(aside instanceof HTMLElement)) {
    return;
  }
  const width = `${sidebarWidthRem}rem`;
  aside.style.width = width;
  aside.style.setProperty("--agent-sidebar-width", width);
}

function bindResize(): void {
  applySidebarWidth();
}

function growInput(input: HTMLTextAreaElement): void {
  input.style.height = "";
}

function apiHistory(): ChatTurn[] {
  return turns
    .filter((turn) => turn.content)
    .slice(-MAX_HISTORY)
    .map((turn) => ({ role: turn.role, content: turn.content }));
}

function paintChat(): void {
  const log = document.querySelector("[data-agent-log]");
  const empty = document.querySelector("[data-agent-empty]");
  if (!(log instanceof HTMLElement)) {
    return;
  }
  const emptyNode = empty instanceof HTMLElement ? empty : null;
  log.replaceChildren();
  turns.forEach((turn, index) => {
    const article = document.createElement("article");
    article.className = `agent-chat-msg agent-chat-msg-${turn.role}`;
    if (selectMode && selected.has(index)) {
      article.dataset.selected = "true";
    }
    article.addEventListener("click", () => {
      if (!selectMode) {
        return;
      }
      if (selected.has(index)) {
        selected.delete(index);
      } else {
        selected.add(index);
      }
      paintChat();
    });

    const head = document.createElement("header");
    head.className = "agent-chat-msg-head";
    const time = document.createElement("span");
    time.textContent = turn.at === undefined ? "…" : formatClock(turn.at);
    const more = document.createElement("button");
    more.className = "icon-btn";
    more.type = "button";
    more.setAttribute("aria-label", copy.messageActions);
    more.innerHTML = "";
    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "more_vert";
    more.append(icon);
    more.addEventListener("click", (event) => {
      event.stopPropagation();
      openMenu = openMenu === index ? -1 : index;
      paintChat();
    });
    head.append(time, more);
    article.append(head);

    if (openMenu === index) {
      const menu = document.createElement("div");
      menu.className = "agent-chat-menu";
      menu.setAttribute("role", "menu");
      for (const [action, label] of [
        ["copy", copy.copy],
        ["select", copy.selectMany],
        ["reply", copy.reply],
      ] as const) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = label;
        btn.addEventListener("click", (event) => {
          event.stopPropagation();
          void runMenu(action, index);
        });
        menu.append(btn);
      }
      article.append(menu);
    }

    if (turn.replyTo) {
      const quote = document.createElement("p");
      quote.className = "agent-chat-quote";
      quote.textContent = turn.replyTo;
      article.append(quote);
    }
    if (turn.images?.length) {
      const thumbs = document.createElement("div");
      thumbs.className = "agent-chat-msg-thumbs";
      for (const src of turn.images) {
        const img = document.createElement("img");
        img.src = src;
        img.alt = "";
        thumbs.append(img);
      }
      article.append(thumbs);
    }
    const body = document.createElement("div");
    body.className = "agent-chat-msg-body";
    renderMarkdown(turn.content, body);
    article.append(body);
    log.append(article);
  });
  if (emptyNode) {
    emptyNode.hidden = turns.length > 0;
    if (turns.length === 0) {
      log.prepend(emptyNode);
    }
  }
  paintSelectBar();
  paintHistory();
  paintReply();
  paintThumbs();
  log.scrollTop = log.scrollHeight;
}

function paintSelectBar(): void {
  const bar = document.querySelector("[data-agent-select-bar]");
  if (!(bar instanceof HTMLElement)) {
    return;
  }
  bar.hidden = !selectMode;
}

function paintReply(): void {
  const node = document.querySelector("[data-agent-reply]");
  if (!(node instanceof HTMLElement)) {
    return;
  }
  node.hidden = !replyTo;
  node.replaceChildren();
  if (!replyTo) {
    return;
  }
  node.append(`${copy.replyTo}: ${replyTo}`);
}

function paintThumbs(): void {
  const thumbs = document.querySelector("[data-agent-thumbs]");
  const label = document.querySelector("[data-agent-drop-label]");
  if (!(thumbs instanceof HTMLElement)) {
    return;
  }
  thumbs.replaceChildren();
  for (const item of pendingImages) {
    const wrap = document.createElement("span");
    wrap.className = "agent-chat-thumb";
    const img = document.createElement("img");
    img.src = item.url;
    img.alt = "";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-btn";
    remove.setAttribute("aria-label", copy.removeImage);
    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "close";
    remove.append(icon);
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      pendingImages = pendingImages.filter((entry) => entry.url !== item.url);
      URL.revokeObjectURL(item.url);
      paintThumbs();
      const input = document.querySelector("[data-agent-input]");
      const send = document.querySelector("[data-agent-send]");
      if (input instanceof HTMLTextAreaElement) {
        syncSend(input, send instanceof HTMLButtonElement ? send : null);
      }
    });
    wrap.append(img, remove);
    thumbs.append(wrap);
  }
  if (label instanceof HTMLElement) {
    label.hidden = pendingImages.length > 0;
  }
}

function paintHistory(): void {
  const panel = document.querySelector("[data-agent-history]");
  if (!(panel instanceof HTMLElement) || panel.hidden) {
    return;
  }
  panel.replaceChildren();
  if (!saved.length && !turns.length) {
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = copy.emptyHistory;
    panel.append(hint);
    return;
  }
  saved.forEach((chat, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = chat.title;
    btn.addEventListener("click", () => {
      archiveCurrent();
      turns = chat.turns.map((turn) => ({ ...turn, images: turn.images ? [...turn.images] : undefined }));
      saved.splice(index, 1);
      panel.hidden = true;
      const toggle = document.querySelector("[data-agent-history-toggle]");
      if (toggle instanceof HTMLElement) {
        toggle.setAttribute("aria-expanded", "false");
      }
      paintChat();
    });
    panel.append(btn);
  });
}

function archiveCurrent(): void {
  if (!turns.length) {
    return;
  }
  const title = turns.find((turn) => turn.content)?.content.slice(0, 48) || copy.imageOnly;
  saved.unshift({ id: String(Date.now()), title, turns: turns.map((turn) => ({ ...turn })) });
  turns = [];
}

async function runMenu(action: "copy" | "select" | "reply", index: number): Promise<void> {
  const turn = turns[index];
  openMenu = -1;
  if (!turn) {
    paintChat();
    return;
  }
  if (action === "copy") {
    try {
      await navigator.clipboard.writeText(turn.content);
    } catch {
      /* ignore */
    }
    paintChat();
    return;
  }
  if (action === "select") {
    selectMode = true;
    selected = new Set([index]);
    paintChat();
    return;
  }
  replyTo = turn.content.slice(0, 80);
  paintChat();
}

function addImages(files: FileList | File[]): void {
  for (const file of Array.from(files)) {
    if (pendingImages.length >= MAX_IMAGES) {
      break;
    }
    if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES) {
      continue;
    }
    pendingImages.push({ url: URL.createObjectURL(file), file });
  }
  paintThumbs();
}

function paintAssistantStream(content: string): void {
  const log = document.querySelector("[data-agent-log]");
  const articles = document.querySelectorAll(".agent-chat-msg-assistant");
  const last = articles[articles.length - 1];
  if (!(last instanceof HTMLElement)) {
    paintChat();
    return;
  }
  let body = last.querySelector(".agent-chat-msg-body");
  if (!(body instanceof HTMLElement)) {
    body = document.createElement("div");
    body.className = "agent-chat-msg-body";
    last.append(body);
  }
  body.replaceChildren();
  renderMarkdown(content, body);
  if (log instanceof HTMLElement) {
    log.scrollTop = log.scrollHeight;
  }
}

async function submitChat(input: HTMLTextAreaElement, send: HTMLButtonElement | null): Promise<void> {
  const text = input.value.trim();
  if ((!text && !pendingImages.length) || text.length > MAX_MESSAGE) {
    return;
  }
  const message = text || copy.imageOnly;
  const history = apiHistory();
  const images = pendingImages.map((item) => item.url);
  pendingImages = [];
  const quoted = replyTo;
  replyTo = "";
  const sentAt = Date.now();
  turns.push({ role: "user", content: message, ms: 0, at: sentAt, images, replyTo: quoted || undefined });
  input.value = "";
  growInput(input);
  const assistant: AgentTurn = { role: "assistant", content: "", ms: undefined, at: undefined };
  turns.push(assistant);
  paintChat();
  syncSend(input, send);
  const started = Date.now();
  if (send) {
    send.disabled = true;
  }
  try {
    const result = await postChatStream(quoted ? `${quoted}\n\n${message}` : message, history, (delta) => {
      assistant.content += delta;
      assistant.ms = Date.now() - started;
      paintAssistantStream(assistant.content);
    });
    assistant.ms = Date.now() - started;
    if (result.status === 200 && result.data.ok && (result.data.text || assistant.content)) {
      if (result.data.text) {
        assistant.content = result.data.text;
      }
      assistant.at = Date.now();
      paintChat();
      return;
    }
    turns.pop();
    paintChat();
    showErrorModal({
      message: chatErrorMessage(result.status, result.data),
      requestId: result.data.request_id || result.requestId,
      details: result.data.request_id || result.requestId ? `request_id=${result.data.request_id || result.requestId}` : "",
      debug: result.data.debug,
    });
  } finally {
    syncSend(input, send);
  }
}

export function startAgentChat(): void {
  const form = document.querySelector("[data-agent-form]");
  const input = document.querySelector("[data-agent-input]");
  const send = document.querySelector("[data-agent-send]");
  if (!(form instanceof HTMLFormElement) || !(input instanceof HTMLTextAreaElement)) {
    return;
  }
  const sendBtn = send instanceof HTMLButtonElement ? send : null;
  bindResize();
  paintChat();
  growInput(input);
  syncSend(input, sendBtn);
  if (form.dataset.bound === "true") {
    return;
  }
  form.dataset.bound = "true";

  input.addEventListener("input", () => {
    growInput(input);
    syncSend(input, sendBtn);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    event.preventDefault();
    if (!hasComposerContent(input)) {
      return;
    }
    void submitChat(input, sendBtn);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitChat(input, sendBtn);
  });

  const drop = document.querySelector("[data-agent-drop]");
  const files = document.querySelector("[data-agent-files]");
  if (drop instanceof HTMLElement) {
    drop.addEventListener("click", () => {
      if (files instanceof HTMLInputElement) {
        files.click();
      }
    });
    drop.addEventListener("dragover", (event) => {
      event.preventDefault();
    });
    drop.addEventListener("drop", (event) => {
      event.preventDefault();
      if (event.dataTransfer?.files) {
        addImages(event.dataTransfer.files);
        syncSend(input, sendBtn);
      }
    });
  }
  if (files instanceof HTMLInputElement) {
    files.addEventListener("change", () => {
      if (files.files) {
        addImages(files.files);
        files.value = "";
        syncSend(input, sendBtn);
      }
    });
  }

  document.querySelector("[data-agent-new]")?.addEventListener("click", () => {
    archiveCurrent();
    replyTo = "";
    selectMode = false;
    selected.clear();
    revokeAll(pendingImages.map((item) => item.url));
    pendingImages = [];
    paintChat();
    growInput(input);
    syncSend(input, sendBtn);
  });
  document.querySelector("[data-agent-history-toggle]")?.addEventListener("click", () => {
    const panel = document.querySelector("[data-agent-history]");
    const toggle = document.querySelector("[data-agent-history-toggle]");
    if (!(panel instanceof HTMLElement) || !(toggle instanceof HTMLElement)) {
      return;
    }
    panel.hidden = !panel.hidden;
    toggle.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
    paintHistory();
  });
  document.querySelector("[data-agent-copy-selected]")?.addEventListener("click", () => {
    const text = [...selected]
      .sort((a, b) => a - b)
      .map((index) => turns[index]?.content || "")
      .filter(Boolean)
      .join("\n\n");
    void navigator.clipboard.writeText(text).catch(() => undefined);
  });
  document.querySelector("[data-agent-cancel-select]")?.addEventListener("click", () => {
    selectMode = false;
    selected.clear();
    paintChat();
  });
}
