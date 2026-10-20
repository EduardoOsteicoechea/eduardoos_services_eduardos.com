/**
 * Cookie-less host embed issue form.
 * Auth: short-lived embed token or API key via postMessage from embed.js (never stored).
 */

import { mustLog } from "./dev-log";
import { parseIssueText } from "./ereport-issue-parse";

const LOG_PREFIX = "[ereport-embed-issue]";
const INIT_TYPE = "ereport-embed-issue-init";
const READY_TYPE = "ereport-embed-issue-ready";
const CLOSE_TYPE = "ereport-embed-close";

type InitPayload = {
  type: typeof INIT_TYPE;
  orgId: string;
  reportId: string;
  hostOrigin: string;
  /** Preferred: short-lived eos_embed_… from host backend. */
  token?: string;
  /** Dev / simple hosts only — exchanged for embed token in this iframe (same-origin). */
  apiKey?: string;
  baseUrl?: string;
};

type AuthState = {
  bearer: string;
  orgId: string;
  reportId: string;
  hostOrigin: string;
  tema?: string;
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

async function mintEmbedToken(
  baseUrl: string,
  apiKey: string,
  orgId: string,
  reportId: string,
  origin: string,
): Promise<{ token: string; tema?: string }> {
  const res = await fetch(`${baseUrl}/api/v1/ereport/embed-token`, {
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
    const message = String(data.message || data.error || `HTTP ${res.status}`);
    throw new Error(message);
  }
  const token = String(data.token || "");
  if (!token) throw new Error("Embed token missing from response.");
  return { token, tema: data.tema ? String(data.tema) : undefined };
}

async function postQuickIssue(baseUrl: string, auth: AuthState, text: string): Promise<void> {
  const { nombre, incidencia } = parseIssueText(text);
  const res = await fetch(`${baseUrl}/api/v1/ereport/embed/quick-issue`, {
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
  const statusEl = el<HTMLElement>(root, "[data-ei-status]")!;
  const form = el<HTMLFormElement>(root, "[data-ei-form]")!;
  const textEl = el<HTMLTextAreaElement>(root, "[data-ei-text]")!;
  const submitBtn = el<HTMLButtonElement>(root, "[data-ei-submit]")!;
  const closeBtn = el<HTMLButtonElement>(root, "[data-ei-close]");
  const reportLabel = el<HTMLElement>(root, "[data-ei-report]");

  let auth: AuthState | null = null;
  let parentOrigin = "*";
  const baseUrl = "";

  function setStatus(msg: string, isError = false) {
    statusEl.textContent = msg;
    statusEl.hidden = !msg;
    statusEl.classList.toggle("status--err", isError);
  }

  function setReady(ready: boolean) {
    form.hidden = !ready;
    textEl.disabled = !ready;
    submitBtn.disabled = !ready;
  }

  setReady(false);
  setStatus("Waiting for host credentials…");

  function close() {
    postParent({ type: CLOSE_TYPE }, parentOrigin);
  }

  closeBtn?.addEventListener("click", (ev) => {
    ev.preventDefault();
    close();
  });

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!auth) return;
    const text = String(textEl.value || "").trim();
    if (!text) {
      setStatus("Describe the issue (text until the first “.” is the title).", true);
      textEl.focus();
      return;
    }
    submitBtn.disabled = true;
    setStatus("Sending…");
    try {
      await postQuickIssue(baseUrl, auth, text);
      textEl.value = "";
      setStatus("Issue saved.");
      if (mustLog) console.log(LOG_PREFIX, "created");
      setTimeout(close, 600);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save the issue.";
      setStatus(message, true);
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
      setStatus("Host mount is missing orgId, reportId, or origin.", true);
      return;
    }
    try {
      let bearer = String(data.token || "").trim();
      let tema: string | undefined;
      if (!bearer) {
        const apiKey = String(data.apiKey || "").trim();
        if (!apiKey) {
          setStatus("Provide a connector token (or apiKey for local/dev).", true);
          return;
        }
        setStatus("Authorizing…");
        const minted = await mintEmbedToken(baseUrl, apiKey, orgId, reportId, hostOrigin);
        bearer = minted.token;
        tema = minted.tema;
      }
      auth = { bearer, orgId, reportId, hostOrigin, tema };
      if (reportLabel) {
        reportLabel.textContent = tema || "Website registration";
        reportLabel.hidden = false;
      }
      setReady(true);
      setStatus("Describe the bug, then send.");
      textEl.focus();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authorization failed.";
      setStatus(message, true);
      setReady(false);
    }
  }

  window.addEventListener("message", (ev) => {
    if (!ev.data || typeof ev.data !== "object") return;
    const data = ev.data as InitPayload;
    if (data.type !== INIT_TYPE) return;
    void onInit(data, ev.origin);
  });

  postParent({ type: READY_TYPE }, "*");
}
