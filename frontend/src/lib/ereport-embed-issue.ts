/**
 * Cookie-less host embed — same UX as eduardoos.com quick issue modal
 * (list + add; no Layout chrome, no Configure gear).
 */

import { mustLog } from "./dev-log";
import { parseIssueText } from "./ereport-issue-parse";
import { openEreportIssueCardModal } from "./ereport-issue-card-modal";
import {
  formatIssueClipboardText,
  isWebsiteIssueOpen,
} from "./ereport-quick-connector";

const LOG_PREFIX = "[ereport-embed-issue]";
const INIT_TYPE = "ereport-embed-issue-init";
const READY_TYPE = "ereport-embed-issue-ready";
const CLOSE_TYPE = "ereport-embed-close";

type InitPayload = {
  type: typeof INIT_TYPE;
  orgId: string;
  reportId: string;
  hostOrigin: string;
  token?: string;
  apiKey?: string;
};

type AuthState = {
  bearer: string;
  orgId: string;
  reportId: string;
  hostOrigin: string;
};

type EmbedItem = {
  id?: string;
  nombre?: string;
  incidencia?: string;
  solucion?: string;
  status?: string;
  fechaIncidencia?: string;
  fechaSolucion?: string;
  checklist?: Array<{ id?: string; label?: string; checked?: boolean }>;
  imagesIncidencia?: Array<{ id?: string; url?: string; mime?: string; name?: string }>;
  imagesSolucion?: Array<{ id?: string; url?: string; mime?: string; name?: string }>;
};

type EmbedState = {
  tema?: string;
  sectionId?: string;
  groupId?: string;
  sectionTitle?: string;
  groupTitle?: string;
  items?: EmbedItem[];
  viewUrl?: string;
};

function el<T extends HTMLElement>(root: ParentNode, sel: string): T | null {
  return root.querySelector(sel) as T | null;
}

function postParent(msg: Record<string, unknown>, targetOrigin: string) {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(msg, targetOrigin || "*");
    }
  } catch {
    /* ignore */
  }
}

function readyToSaveStatus(): string {
  return "Ready to save.";
}

async function mintEmbedToken(
  apiKey: string,
  orgId: string,
  reportId: string,
  origin: string,
): Promise<string> {
  const res = await fetch("/api/v1/ereport/embed-token", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ orgId, reportId, origin }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(data.message || data.error || `HTTP ${res.status}`));
  }
  const token = String(data.token || "");
  if (!token) throw new Error("Embed token missing from response.");
  return token;
}

async function fetchState(auth: AuthState): Promise<EmbedState> {
  const q = new URLSearchParams({
    orgId: auth.orgId,
    reportId: auth.reportId,
    hostOrigin: auth.hostOrigin,
  });
  const res = await fetch(`/api/v1/ereport/embed/state?${q}`, {
    headers: {
      Authorization: `Bearer ${auth.bearer}`,
      Accept: "application/json",
    },
  });
  const data = (await res.json().catch(() => ({}))) as EmbedState & Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(data.message || data.error || `HTTP ${res.status}`));
  }
  return data;
}

async function postQuickIssue(auth: AuthState, text: string): Promise<void> {
  const { nombre, incidencia } = parseIssueText(text);
  const res = await fetch("/api/v1/ereport/embed/quick-issue", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.bearer}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      orgId: auth.orgId,
      reportId: auth.reportId,
      hostOrigin: auth.hostOrigin,
      text,
      nombre,
      incidencia,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(data.message || data.error || `HTTP ${res.status}`));
  }
}

export function startEreportEmbedIssue(root: HTMLElement) {
  const titleEl = el<HTMLElement>(root, "[data-ei-title]")!;
  const contextEl = el<HTMLElement>(root, "[data-ei-context]")!;
  const listEl = el<HTMLElement>(root, "[data-ei-list]")!;
  const statusEl = el<HTMLElement>(root, "[data-ei-status]")!;
  const composeEl = el<HTMLElement>(root, "[data-ei-compose]")!;
  const inputRow = el<HTMLElement>(root, "[data-ei-input-row]")!;
  const input = el<HTMLTextAreaElement>(root, "[data-ei-input]")!;
  const addBtn = el<HTMLButtonElement>(root, "[data-ei-add]")!;
  const submitBtn = el<HTMLButtonElement>(root, "[data-ei-submit]")!;
  const closeBtn = el<HTMLButtonElement>(root, "[data-ei-close]");

  let auth: AuthState | null = null;
  let parentOrigin = "*";
  let state: EmbedState | null = null;

  function setStatus(msg: string) {
    statusEl.textContent = msg;
  }

  function setComposeEnabled(enabled: boolean) {
    composeEl.hidden = !enabled;
    addBtn.disabled = !enabled;
    input.disabled = !enabled;
    submitBtn.disabled = !enabled;
    if (!enabled) inputRow.hidden = true;
  }

  function close() {
    postParent({ type: CLOSE_TYPE }, parentOrigin);
  }

  closeBtn?.addEventListener("click", (ev) => {
    ev.preventDefault();
    close();
  });

  function syncContext() {
    const reportLabel = state?.tema || "Website issues";
    titleEl.textContent = reportLabel;
    contextEl.textContent = [
      reportLabel,
      state?.sectionTitle || (state?.sectionId ? "Section" : "No section"),
      state?.groupTitle || (state?.groupId ? "Subsection" : "No subsection"),
    ].join(" · ");
  }

  function renderList() {
    listEl.replaceChildren();
    const items = (state?.items || []).filter(isWebsiteIssueOpen);
    if (!state?.sectionId || !state?.groupId) {
      setStatus("Connector section/subsection missing in the hub.");
      return;
    }
    if (items.length === 0) {
      const empty = document.createElement("li");
      empty.className = "ereport-quick-overlay__empty";
      empty.textContent = "No open issues in this subsection yet.";
      listEl.append(empty);
      return;
    }
    for (const it of items) {
      const li = document.createElement("li");
      li.className = "ereport-quick-overlay__item";
      const title = document.createElement("span");
      title.className = "ereport-quick-overlay__item-title";
      title.textContent = it.nombre || it.incidencia || it.id || "";
      const st = document.createElement("span");
      st.className = "ereport-quick-overlay__item-status";
      st.textContent = it.status || "";
      const actions = document.createElement("div");
      actions.className = "ereport-quick-overlay__item-actions";

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "icon-btn ereport-quick-overlay__item-copy";
      copyBtn.setAttribute("aria-label", "Copy issue for agent");
      copyBtn.title = "Copy issue for agent";
      copyBtn.innerHTML =
        '<span class="material-symbols-outlined" aria-hidden="true">content_copy</span>';
      copyBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const text = formatIssueClipboardText({
          reportId: auth?.reportId || "",
          sectionId: state?.sectionId || "",
          groupId: state?.groupId || "",
          itemId: String(it.id || ""),
          nombre: it.nombre || "",
          incidencia: it.incidencia || "",
        });
        try {
          await navigator.clipboard.writeText(text);
          setStatus("Copied.");
        } catch {
          setStatus("Could not copy.");
        }
      });
      actions.append(copyBtn);

      const itemId = String(it.id || "").trim();
      if (itemId && auth && state?.sectionId && state?.groupId) {
        const openCardBtn = document.createElement("button");
        openCardBtn.type = "button";
        openCardBtn.className = "btn ereport-quick-overlay__item-open-card";
        openCardBtn.setAttribute("aria-label", "Open issue");
        openCardBtn.title = "Open issue";
        openCardBtn.textContent = "Open";
        openCardBtn.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (!auth || !state?.sectionId || !state?.groupId) return;
          void openEreportIssueCardModal({
            orgId: auth.orgId,
            reportId: auth.reportId,
            sectionId: state.sectionId,
            groupId: state.groupId,
            itemId,
            item: it,
            apiAuth: {
              bearer: auth.bearer,
              hostOrigin: auth.hostOrigin,
            },
            onChanged: () => {
              void reload();
            },
            onDeleted: () => {
              void reload();
            },
          });
        });
        actions.append(openCardBtn);
      }

      li.append(title, st, actions);
      listEl.append(li);
    }
  }

  async function reload() {
    if (!auth) return;
    setStatus("Loading…");
    state = await fetchState(auth);
    syncContext();
    renderList();
    setComposeEnabled(Boolean(state.sectionId && state.groupId));
    setStatus(readyToSaveStatus());
  }

  addBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    inputRow.hidden = false;
    input.focus();
  });

  submitBtn.addEventListener("click", async (ev) => {
    ev.preventDefault();
    if (!auth) return;
    const text = String(input.value || "").trim();
    if (!text) {
      setStatus("Describe the issue (title until the first period).");
      input.focus();
      return;
    }
    submitBtn.disabled = true;
    setStatus("Saving…");
    try {
      await postQuickIssue(auth, text);
      input.value = "";
      inputRow.hidden = true;
      await reload();
      if (mustLog) console.log(LOG_PREFIX, "created");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save the issue.";
      setStatus(message);
      if (mustLog) console.log(LOG_PREFIX, "fail", message);
    } finally {
      submitBtn.disabled = false;
    }
  });

  async function onInit(data: InitPayload, eventOrigin: string) {
    parentOrigin = eventOrigin || "*";
    const orgId = String(data.orgId || "").trim();
    const reportId = String(data.reportId || "").trim();
    const hostOrigin = String(data.hostOrigin || "").trim();
    if (!orgId || !reportId || !hostOrigin) {
      setStatus("Host mount is missing orgId, reportId, or origin.");
      setComposeEnabled(false);
      return;
    }
    try {
      let bearer = String(data.token || "").trim();
      if (!bearer) {
        const apiKey = String(data.apiKey || "").trim();
        if (!apiKey) {
          setStatus("Provide a connector token (or apiKey for local/dev).");
          setComposeEnabled(false);
          return;
        }
        setStatus("Authorizing…");
        bearer = await mintEmbedToken(apiKey, orgId, reportId, hostOrigin);
      }
      auth = { bearer, orgId, reportId, hostOrigin };
      await reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authorization failed.";
      setStatus(message);
      setComposeEnabled(false);
    }
  }

  setComposeEnabled(false);
  setStatus("Waiting for host credentials…");

  window.addEventListener("message", (ev) => {
    if (!ev.data || typeof ev.data !== "object") return;
    const data = ev.data as InitPayload;
    if (data.type !== INIT_TYPE) return;
    void onInit(data, ev.origin);
  });

  postParent({ type: READY_TYPE }, "*");
}
