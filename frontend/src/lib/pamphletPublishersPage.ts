/**
 * Admin-only Articles publishers surface for /documents/pamphlet/publishers.
 */

import { apiRequest, getMe } from "./api";
import { showErrorModal } from "./error-modal";

export type PamphletPublishersHandle = {
  destroy(): void;
};

type PamphletRow = {
  epamId: string;
  title?: string;
  series?: string;
  seriesChapter?: string;
  public?: boolean;
  updatedAt?: string;
};

type PublisherRow = {
  userId: string;
  email: string;
  username?: string;
  defaultPublic?: boolean;
  count?: number;
  pamphlets?: PamphletRow[];
};

export function mountPamphletPublishersPage(root: HTMLElement): PamphletPublishersHandle {
  const banner = root.querySelector("[data-banner]");
  const tableWrap = root.querySelector("[data-table-wrap]");
  const count = root.querySelector("[data-count]");
  const list = root.querySelector("[data-publishers]");
  const refreshBtn = root.querySelector("[data-articles-refresh]");

  const setBanner = (text: string, kind = "") => {
    if (!(banner instanceof HTMLElement)) return;
    banner.textContent = text;
    banner.className = `status ${kind}`.trim();
  };

  const fail = (message: string, requestId?: string, debug?: string) => {
    setBanner(message, "err");
    if (tableWrap instanceof HTMLElement) tableWrap.hidden = true;
    showErrorModal({
      message,
      requestId,
      details: requestId ? `request_id=${requestId}` : "",
      debug,
    });
  };

  const render = (publishers: PublisherRow[], total: number) => {
    if (!(list instanceof HTMLElement)) return;
    list.replaceChildren();
    if (!publishers.length) {
      const empty = document.createElement("p");
      empty.className = "admin-articles__empty";
      empty.textContent =
        "No Articles publishers yet. Grant the articles subscription (or admin service access) to a user.";
      list.appendChild(empty);
    }
    for (const publisher of publishers) {
      const card = document.createElement("li");
      card.className = "admin-articles__publisher";

      const head = document.createElement("div");
      head.className = "admin-articles__publisher-head";
      const email = document.createElement("p");
      email.className = "admin-articles__email";
      email.textContent = publisher.email;
      const meta = document.createElement("p");
      meta.className = "admin-articles__meta";
      meta.textContent = `${publisher.count ?? 0} pamphlet${(publisher.count ?? 0) === 1 ? "" : "s"}`;
      const defaultLabel = document.createElement("label");
      defaultLabel.className = "admin-articles__default";
      const defaultInput = document.createElement("input");
      defaultInput.type = "checkbox";
      defaultInput.checked = Boolean(publisher.defaultPublic);
      defaultInput.addEventListener("change", () => {
        void (async () => {
          defaultInput.disabled = true;
          const result = await apiRequest<{ defaultPublic?: boolean }>(
            `/admin/users/${encodeURIComponent(publisher.userId)}/articles-default`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ defaultPublic: defaultInput.checked }),
            },
          );
          defaultInput.disabled = false;
          if (result.status >= 400) {
            defaultInput.checked = !defaultInput.checked;
            fail(
              result.data.message || "Could not update default visibility.",
              result.requestId,
              result.data.debug,
            );
            return;
          }
          setBanner(
            defaultInput.checked
              ? `New pamphlets for ${publisher.email} default to visible.`
              : `New pamphlets for ${publisher.email} stay hidden until you publish them.`,
            "ok",
          );
        })();
      });
      const defaultText = document.createElement("span");
      defaultText.textContent = "All new visible by default";
      defaultLabel.append(defaultInput, defaultText);
      head.append(email, meta, defaultLabel);
      card.appendChild(head);

      const items = document.createElement("ul");
      items.className = "admin-articles__items";
      const pamphlets = publisher.pamphlets ?? [];
      if (!pamphlets.length) {
        const empty = document.createElement("p");
        empty.className = "admin-articles__empty";
        empty.textContent = "No pamphlets for this publisher.";
        card.appendChild(empty);
      } else {
        for (const item of pamphlets) {
          const row = document.createElement("li");
          row.className = "admin-articles__item";
          const title = document.createElement("span");
          title.className = "admin-articles__item-title";
          title.textContent = item.title || item.epamId;
          const toggle = document.createElement("label");
          toggle.className = "admin-articles__default";
          const input = document.createElement("input");
          input.type = "checkbox";
          input.checked = Boolean(item.public);
          input.addEventListener("change", () => {
            void (async () => {
              input.disabled = true;
              const result = await apiRequest<{ published?: boolean }>(
                `/admin/articles/${encodeURIComponent(item.epamId)}`,
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ownerUserId: publisher.userId,
                    published: input.checked,
                  }),
                },
              );
              input.disabled = false;
              if (result.status >= 400) {
                input.checked = !input.checked;
                fail(
                  result.data.message || "Could not update pamphlet visibility.",
                  result.requestId,
                  result.data.debug,
                );
                return;
              }
              setBanner(
                input.checked
                  ? `“${item.title || item.epamId}” is visible in Articles.`
                  : `“${item.title || item.epamId}” is hidden from Articles.`,
                "ok",
              );
            })();
          });
          const label = document.createElement("span");
          label.textContent = "Visible in Articles";
          toggle.append(input, label);
          row.append(title, toggle);
          items.appendChild(row);
        }
        card.appendChild(items);
      }
      list.appendChild(card);
    }
    if (count instanceof HTMLElement) {
      count.textContent = `${total} pamphlet${total === 1 ? "" : "s"} across ${publishers.length} publisher${publishers.length === 1 ? "" : "s"}.`;
    }
  };

  const load = async () => {
    setBanner("Loading Articles publishers…");
    const result = await apiRequest<{ publishers?: PublisherRow[]; count?: number }>(
      "/admin/articles",
    );
    if (result.status === 401 || result.status === 403) {
      fail(result.data.message || "Unauthorized.", result.requestId, result.data.debug);
      return;
    }
    if (result.status >= 400) {
      fail(result.data.message || "Could not load publishers.", result.requestId, result.data.debug);
      return;
    }
    const publishers = result.data.publishers ?? [];
    const total = Number(result.data.count ?? 0);
    render(publishers, total);
    if (tableWrap instanceof HTMLElement) tableWrap.hidden = false;
    setBanner("Articles publishers loaded.", "ok");
  };

  const onRefresh = () => {
    void load();
  };

  let cancelled = false;
  void (async () => {
    const { status, data, requestId } = await getMe();
    if (cancelled) return;
    if (status === 401) {
      setBanner("Sign in with an administrator account.", "err");
      return;
    }
    if (status !== 200) {
      fail(data.message || "Could not load the session.", data.request_id || requestId, data.debug);
      return;
    }
    if (data.role !== "admin") {
      setBanner("Unauthorized.", "err");
      return;
    }
    await load();
  })();

  refreshBtn?.addEventListener("click", onRefresh);

  return {
    destroy() {
      cancelled = true;
      refreshBtn?.removeEventListener("click", onRefresh);
    },
  };
}
