/**
 * Series / chapters / authors catalog UI for /documents/pamphlet/series.
 */

import { openApiErrorModal } from "../components/ServerErrorModal/ServerErrorModal";
import { getAuthToken, isAuthenticated, refreshAuthSession } from "./auth";
import {
  fetchEpamSeriesTree,
  recycleEpam,
  setEpamPublication,
  type EpamSeriesTreeItem,
  type EpamSeriesTreeResponse,
} from "./epams";
import {
  createEpamAuthor,
  createEpamSeries,
  deleteEpamAuthor,
  deleteEpamSeries,
  fetchEpamCatalog,
  updateEpamAuthor,
  updateEpamSeries,
  type EpamAuthorProfile,
  type EpamChapterProfile,
  type EpamSeriesProfile,
} from "./pamphletCatalog";

export type PamphletSeriesHandle = {
  destroy(): void;
};

function requireEl<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Missing series element: ${selector}`);
  return el;
}

export function mountPamphletSeriesPage(root: HTMLElement): PamphletSeriesHandle {
  const hint = requireEl<HTMLElement>(root, "[data-series-hint]");
  const status = requireEl<HTMLElement>(root, "[data-series-status]");
  const authorList = requireEl<HTMLElement>(root, "[data-series-authors]");
  const authorForm = requireEl<HTMLFormElement>(root, "[data-series-author-form]");
  const authorId = requireEl<HTMLInputElement>(root, "[data-series-author-id]");
  const authorName = requireEl<HTMLInputElement>(root, "[data-series-author-name]");
  const authorReset = requireEl<HTMLButtonElement>(root, "[data-series-author-reset]");
  const seriesList = requireEl<HTMLElement>(root, "[data-series-catalog]");
  const seriesForm = requireEl<HTMLFormElement>(root, "[data-series-form]");
  const seriesId = requireEl<HTMLInputElement>(root, "[data-series-id]");
  const seriesName = requireEl<HTMLInputElement>(root, "[data-series-name]");
  const chapterNames = requireEl<HTMLInputElement>(root, "[data-series-chapters]");
  const seriesReset = requireEl<HTMLButtonElement>(root, "[data-series-reset]");
  const treeHost = requireEl<HTMLElement>(root, "[data-series-articles]");

  const disposers: Array<() => void> = [];
  let catalogSeries: EpamSeriesProfile[] = [];
  let catalogAuthors: EpamAuthorProfile[] = [];
  let tree: EpamSeriesTreeResponse | null = null;

  function on(el: Element, type: string, handler: EventListener): void {
    el.addEventListener(type, handler);
    disposers.push(() => el.removeEventListener(type, handler));
  }

  function setStatus(message: string, kind: "info" | "success" | "error" = "info"): void {
    status.textContent = message;
    status.dataset.kind = kind;
    status.hidden = !message;
  }

  function parseChapters(raw: string, existing: EpamChapterProfile[]): EpamChapterProfile[] {
    const names = raw
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return names.map((name) => {
      const prev = existing.find((c) => c.name.toLowerCase() === name.toLowerCase());
      return { chapterId: prev?.chapterId || "", name };
    });
  }

  function fillAuthorForm(author: EpamAuthorProfile | null): void {
    authorId.value = author?.authorId ?? "";
    authorName.value = author?.name ?? "";
  }

  function fillSeriesForm(series: EpamSeriesProfile | null): void {
    seriesId.value = series?.seriesId ?? "";
    seriesName.value = series?.name ?? "";
    chapterNames.value = (series?.chapters ?? []).map((c) => c.name).join(", ");
  }

  function renderAuthors(): void {
    authorList.replaceChildren();
    if (!catalogAuthors.length) {
      const p = document.createElement("p");
      p.className = "pamphlet-manage__empty";
      p.textContent = "No authors yet. Add one to use in pamphlet dropdowns.";
      authorList.appendChild(p);
      return;
    }
    for (const author of catalogAuthors) {
      if (author.authorId.startsWith("derived-")) continue;
      const card = document.createElement("article");
      card.className = "pamphlet-manage__profile product-dash__card";
      const name = document.createElement("h3");
      name.className = "pamphlet-manage__profile-name";
      name.textContent = author.name;
      const actions = document.createElement("div");
      actions.className = "pamphlet-manage__profile-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => fillAuthorForm(author));
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "Delete";
      del.addEventListener("click", () => {
        void (async () => {
          if (!window.confirm(`Delete author “${author.name}”? Pamphlets using it will clear author.`)) {
            return;
          }
          try {
            await deleteEpamAuthor(author.authorId);
            fillAuthorForm(null);
            await refresh();
            setStatus(`Author deleted: ${author.name}`, "success");
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setStatus(message, "error");
            openApiErrorModal(message, { title: "Series", summary: "Could not delete author." });
          }
        })();
      });
      actions.append(edit, del);
      card.append(name, actions);
      authorList.appendChild(card);
    }
  }

  function renderSeriesCatalog(): void {
    seriesList.replaceChildren();
    const persisted = catalogSeries.filter((s) => !s.seriesId.startsWith("derived-"));
    if (!persisted.length) {
      const p = document.createElement("p");
      p.className = "pamphlet-manage__empty";
      p.textContent = "No series yet. Create one, then add chapters (comma-separated).";
      seriesList.appendChild(p);
      return;
    }
    for (const series of persisted) {
      const card = document.createElement("article");
      card.className = "pamphlet-manage__profile product-dash__card";
      const name = document.createElement("h3");
      name.className = "pamphlet-manage__profile-name";
      name.textContent = series.name;
      const meta = document.createElement("p");
      meta.className = "pamphlet-manage__profile-meta";
      meta.textContent = series.chapters.length
        ? series.chapters.map((c) => c.name).join(" · ")
        : "No chapters";
      const actions = document.createElement("div");
      actions.className = "pamphlet-manage__profile-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => fillSeriesForm(series));
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "Delete";
      del.addEventListener("click", () => {
        void (async () => {
          if (
            !window.confirm(
              `Delete series “${series.name}”? Pamphlets in it will clear series/chapter.`,
            )
          ) {
            return;
          }
          try {
            await deleteEpamSeries(series.seriesId);
            fillSeriesForm(null);
            await refresh();
            setStatus(`Series deleted: ${series.name}`, "success");
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setStatus(message, "error");
            openApiErrorModal(message, { title: "Series", summary: "Could not delete series." });
          }
        })();
      });
      actions.append(edit, del);
      card.append(name, meta, actions);
      seriesList.appendChild(card);
    }
  }

  function appendArticleRow(parent: HTMLElement, item: EpamSeriesTreeItem): void {
    const row = document.createElement("div");
    row.className = "pamphlet-manage__item product-dash__card";
    const title = document.createElement("span");
    title.className = "pamphlet-manage__item-title";
    title.textContent = item.title || item.fileName || item.epamId;
    const meta = document.createElement("span");
    meta.className = "pamphlet-manage__item-meta";
    meta.textContent = item.public ? "Visible in Articles" : "Hidden from Articles";
    const actions = document.createElement("div");
    actions.className = "pamphlet-manage__profile-actions";
    const vis = document.createElement("button");
    vis.type = "button";
    vis.textContent = item.public ? "Hide" : "Show";
    vis.addEventListener("click", () => {
      void (async () => {
        try {
          await setEpamPublication(item.epamId, !item.public);
          await refresh();
          setStatus(item.public ? "Hidden from Articles." : "Visible in Articles.", "success");
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setStatus(message, "error");
          openApiErrorModal(message, { title: "Series", summary: "Could not update visibility." });
        }
      })();
    });
    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "Delete";
    del.addEventListener("click", () => {
      void (async () => {
        if (!window.confirm(`Delete pamphlet “${item.title || item.epamId}”?`)) return;
        try {
          await recycleEpam(item.epamId);
          await refresh();
          setStatus("Pamphlet deleted.", "success");
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setStatus(message, "error");
          openApiErrorModal(message, { title: "Series", summary: "Could not delete pamphlet." });
        }
      })();
    });
    actions.append(vis, del);
    row.append(title, meta, actions);
    parent.appendChild(row);
  }

  function renderArticlesTree(): void {
    treeHost.replaceChildren();
    if (!tree || tree.count === 0) {
      const p = document.createElement("p");
      p.className = "pamphlet-manage__empty";
      p.textContent = "No cloud pamphlets yet.";
      treeHost.appendChild(p);
      return;
    }
    for (const seriesNode of tree.series) {
      const seriesEl = document.createElement("details");
      seriesEl.className = "pamphlet-manage__series";
      seriesEl.open = false;
      const seriesSummary = document.createElement("summary");
      seriesSummary.textContent = seriesNode.name;
      seriesEl.appendChild(seriesSummary);
      for (const chapter of seriesNode.chapters) {
        const chapterEl = document.createElement("details");
        chapterEl.className = "pamphlet-manage__chapter";
        chapterEl.open = false;
        const chapterSummary = document.createElement("summary");
        chapterSummary.textContent = chapter.name;
        chapterEl.appendChild(chapterSummary);
        const items = document.createElement("div");
        items.className = "pamphlet-manage__chapter-items";
        for (const item of chapter.items) {
          appendArticleRow(items, item);
        }
        chapterEl.appendChild(items);
        seriesEl.appendChild(chapterEl);
      }
      treeHost.appendChild(seriesEl);
    }
  }

  async function refresh(): Promise<void> {
    const cat = await fetchEpamCatalog();
    catalogSeries = cat.series;
    catalogAuthors = cat.authors;
    tree = await fetchEpamSeriesTree();
    renderAuthors();
    renderSeriesCatalog();
    renderArticlesTree();
  }

  async function load(): Promise<void> {
    setStatus("");
    await refreshAuthSession();
    if (!getAuthToken() || !isAuthenticated()) {
      hint.textContent = "Sign in to manage series, chapters, and authors.";
      authorList.replaceChildren();
      seriesList.replaceChildren();
      treeHost.replaceChildren();
      return;
    }
    hint.textContent = "Create authors and series here. Pamphlets pick them from dropdowns.";
    try {
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      hint.textContent = `Could not load catalog: ${message}`;
      openApiErrorModal(message, { title: "Series", summary: "Could not load series catalog." });
    }
  }

  on(authorReset, "click", () => {
    fillAuthorForm(null);
    authorName.focus();
  });

  on(seriesReset, "click", () => {
    fillSeriesForm(null);
    seriesName.focus();
  });

  on(authorForm, "submit", (event) => {
    event.preventDefault();
    void (async () => {
      const name = authorName.value.trim();
      if (!name) {
        setStatus("Author needs a name.", "error");
        return;
      }
      try {
        const id = authorId.value.trim();
        if (id && !id.startsWith("derived-")) {
          await updateEpamAuthor(id, name);
        } else {
          await createEpamAuthor(name);
        }
        fillAuthorForm(null);
        await refresh();
        setStatus(`Author saved: ${name}`, "success");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setStatus(message, "error");
        openApiErrorModal(message, { title: "Series", summary: "Could not save author." });
      }
    })();
  });

  on(seriesForm, "submit", (event) => {
    event.preventDefault();
    void (async () => {
      const name = seriesName.value.trim();
      if (!name) {
        setStatus("Series needs a name.", "error");
        return;
      }
      try {
        const id = seriesId.value.trim();
        const existing = catalogSeries.find((s) => s.seriesId === id);
        const chapters = parseChapters(chapterNames.value, existing?.chapters ?? []);
        if (id && !id.startsWith("derived-")) {
          await updateEpamSeries(id, { name, chapters });
        } else {
          await createEpamSeries({ name, chapters });
        }
        fillSeriesForm(null);
        await refresh();
        setStatus(`Series saved: ${name}`, "success");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setStatus(message, "error");
        openApiErrorModal(message, { title: "Series", summary: "Could not save series." });
      }
    })();
  });

  void load();

  return {
    destroy() {
      for (const dispose of disposers) dispose();
      disposers.length = 0;
    },
  };
}
