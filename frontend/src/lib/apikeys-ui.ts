import { showErrorModal } from "./error-modal";
import { createAPIKey, listAPIKeys, revokeAPIKey, type APIKeyRow } from "./apikeys";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function keyCreatedAt(key: APIKeyRow): string {
  return key.created_at || key.createdAt || "";
}

function keyLastUsedAt(key: APIKeyRow): string {
  return key.last_used_at || key.lastUsedAt || "";
}

/** Wire the API-keys panel (list + create) under `root`. */
export function mountAPIKeysUI(root: HTMLElement): void {
  const banner = root.querySelector("[data-apikeys-banner]");
  const bodies = root.querySelectorAll("[data-apikeys-admin]");
  const form = root.querySelector("[data-apikey-form]");
  const labelInput = root.querySelector("[data-apikey-label]");
  const errorBox = root.querySelector("[data-apikey-error]");
  const secretBox = root.querySelector("[data-apikey-secret]");
  const secretValue = root.querySelector("[data-apikey-secret-value]");
  const list = root.querySelector("[data-apikey-list]");
  const refreshBtn = root.querySelector("[data-apikeys-refresh]") ?? document.querySelector("[data-apikeys-refresh]");

  const setBanner = (text: string, kind = "") => {
    if (!(banner instanceof HTMLElement)) {
      return;
    }
    banner.textContent = text;
    banner.className = `status ${kind}`.trim();
  };

  const setError = (text: string) => {
    if (!(errorBox instanceof HTMLElement)) {
      return;
    }
    errorBox.textContent = text;
    errorBox.hidden = !text;
  };

  const fail = (message: string, requestId?: string, debug?: string) => {
    setBanner(message, "err");
    showErrorModal({
      message,
      requestId,
      details: requestId ? `request_id=${requestId}` : "",
      debug,
    });
  };

  const renderKeys = (keys: APIKeyRow[]) => {
    if (!(list instanceof HTMLElement)) {
      return;
    }
    list.replaceChildren();
    if (!keys.length) {
      const empty = document.createElement("li");
      empty.className = "api-keys-item-sub";
      empty.textContent = "No active keys.";
      list.appendChild(empty);
      return;
    }
    for (const key of keys) {
      const item = document.createElement("li");
      item.className = "api-keys-item";

      const meta = document.createElement("div");
      meta.className = "api-keys-item-meta";
      const label = document.createElement("span");
      label.className = "api-keys-item-label";
      label.textContent = key.label || "(no label)";
      const sub = document.createElement("span");
      sub.className = "api-keys-item-sub";
      const createdRaw = keyCreatedAt(key);
      const usedRaw = keyLastUsedAt(key);
      const created = createdRaw ? `created ${formatDate(createdRaw)}` : "";
      const used = usedRaw ? ` · last used ${formatDate(usedRaw)}` : "";
      sub.textContent = `${key.prefix} · ${created}${used}`;
      meta.append(label, sub);

      const revoke = document.createElement("button");
      revoke.type = "button";
      revoke.className = "btn";
      revoke.textContent = "Revoke";
      revoke.addEventListener("click", () => void revokeKey(key));

      item.append(meta, revoke);
      list.appendChild(item);
    }
  };

  const loadKeys = async () => {
    setBanner("Loading keys…");
    const res = await listAPIKeys();
    if (res.status === 401 || res.status === 403) {
      setBanner("API subscription required.", "err");
      return;
    }
    if (res.status >= 400) {
      fail(res.data.message || "Could not load keys.", res.data.request_id, res.data.debug);
      return;
    }
    renderKeys(res.data.keys ?? []);
    setBanner("Keys loaded.", "ok");
  };

  const revokeKey = async (key: APIKeyRow) => {
    if (!window.confirm(`Revoke “${key.label}”? Scripts using it will stop working.`)) {
      return;
    }
    const res = await revokeAPIKey(key.id);
    if (res.status >= 400) {
      fail(res.data.message || "Could not revoke key.", res.data.request_id, res.data.debug);
      return;
    }
    setBanner("Key revoked.", "ok");
    await loadKeys();
  };

  form?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!(labelInput instanceof HTMLInputElement)) {
      return;
    }
    const label = labelInput.value.trim();
    if (!label) {
      setError("Label is required.");
      return;
    }
    setError("");
    const btn = root.querySelector("[data-apikey-create]");
    if (btn instanceof HTMLButtonElement) {
      btn.disabled = true;
    }
    const res = await createAPIKey(label);
    if (btn instanceof HTMLButtonElement) {
      btn.disabled = false;
    }
    if (res.status !== 200 && res.status !== 201) {
      fail(res.data.message || "Could not create key.", res.data.request_id, res.data.debug);
      return;
    }
    if (secretBox instanceof HTMLElement && secretValue instanceof HTMLElement) {
      secretValue.textContent = res.data.key || "";
      secretBox.hidden = false;
    }
    labelInput.value = "";
    setBanner("Key created.", "ok");
    await loadKeys();
  });

  bodies.forEach((node) => {
    if (node instanceof HTMLElement) {
      node.hidden = false;
    }
  });

  refreshBtn?.addEventListener("click", () => void loadKeys());
  void loadKeys();
}
