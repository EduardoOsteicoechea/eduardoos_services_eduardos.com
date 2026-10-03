/**
 * Full-page Manage surface for /documents/pamphlet/manage (no editor / no modal).
 */

import { openApiErrorModal } from "../components/ServerErrorModal/ServerErrorModal";
import { getAuthToken, isAuthenticated, refreshAuthSession } from "./auth";
import {
  fetchEpam,
  fetchEpamSeriesTree,
  recycleEpam,
  saveEpamToCloud,
  setEpamPublication,
  type EpamRecord,
  type EpamSeriesTreeItem,
  type EpamSeriesTreeResponse,
} from "./epams";
import {
  fetchEpamCatalog,
  fillNameSelect,
  type EpamSeriesProfile,
} from "./pamphletCatalog";
import {
  createFooterProfile,
  deleteFooterProfile,
  fetchFooterProfiles,
  footerFromForm,
  updateFooterProfile,
  type FooterProfile,
} from "./pamphletFooters";
import {
  emptyFooter,
  formatHeaderLastUpdateDate,
  type PamphletStructure,
} from "./pamphlet-generator/src/pamphlet_schema";

export type PamphletManageHandle = {
  destroy(): void;
};

type Managed = { meta: EpamRecord; document: PamphletStructure };

function requireEl<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Missing manage element: ${selector}`);
  return el;
}

export function mountPamphletManagePage(root: HTMLElement): PamphletManageHandle {
  const hint = requireEl<HTMLElement>(root, "[data-manage-hint]");
  const status = requireEl<HTMLElement>(root, "[data-manage-status]");
  const list = requireEl<HTMLElement>(root, "[data-manage-list]");
  const detail = requireEl<HTMLElement>(root, "[data-manage-detail]");
  const detailTitle = requireEl<HTMLElement>(root, "[data-manage-detail-title]");
  const publicToggle = requireEl<HTMLInputElement>(root, "[data-manage-public]");
  const chromeForm = requireEl<HTMLFormElement>(root, "[data-manage-chrome-form]");
  const headerTitle = requireEl<HTMLInputElement>(root, "[data-manage-header-title]");
  const headerSubtitle = requireEl<HTMLInputElement>(root, "[data-manage-header-subtitle]");
  const headerAuthor = requireEl<HTMLSelectElement>(root, "[data-manage-header-author]");
  const headerSeries = requireEl<HTMLSelectElement>(root, "[data-manage-header-series]");
  const headerChapter = requireEl<HTMLSelectElement>(root, "[data-manage-header-chapter]");
  const headerDateDisplay = requireEl<HTMLElement>(root, "[data-manage-header-date-display]");
  const footerAction = requireEl<HTMLInputElement>(root, "[data-manage-footer-action]");
  const footerMessage = requireEl<HTMLInputElement>(root, "[data-manage-footer-message]");
  const footerLabel1 = requireEl<HTMLInputElement>(root, "[data-manage-footer-label1]");
  const footerValue1 = requireEl<HTMLInputElement>(root, "[data-manage-footer-value1]");
  const footerLabel2 = requireEl<HTMLInputElement>(root, "[data-manage-footer-label2]");
  const footerValue2 = requireEl<HTMLInputElement>(root, "[data-manage-footer-value2]");
  const footerLabel3 = requireEl<HTMLInputElement>(root, "[data-manage-footer-label3]");
  const footerValue3 = requireEl<HTMLInputElement>(root, "[data-manage-footer-value3]");
  const footerLabel4 = requireEl<HTMLInputElement>(root, "[data-manage-footer-label4]");
  const footerValue4 = requireEl<HTMLInputElement>(root, "[data-manage-footer-value4]");
  const deleteBtn = requireEl<HTMLButtonElement>(root, "[data-manage-delete]");
  const profileList = requireEl<HTMLElement>(root, "[data-manage-profile-list]");
  const profileForm = requireEl<HTMLFormElement>(root, "[data-manage-profile-form]");
  const profileId = requireEl<HTMLInputElement>(root, "[data-manage-profile-id]");
  const profileName = requireEl<HTMLInputElement>(root, "[data-manage-profile-name]");
  const profileAction = requireEl<HTMLInputElement>(root, "[data-manage-profile-action]");
  const profileMessage = requireEl<HTMLInputElement>(root, "[data-manage-profile-message]");
  const profileLabel1 = requireEl<HTMLInputElement>(root, "[data-manage-profile-label1]");
  const profileValue1 = requireEl<HTMLInputElement>(root, "[data-manage-profile-value1]");
  const profileLabel2 = requireEl<HTMLInputElement>(root, "[data-manage-profile-label2]");
  const profileValue2 = requireEl<HTMLInputElement>(root, "[data-manage-profile-value2]");
  const profileLabel3 = requireEl<HTMLInputElement>(root, "[data-manage-profile-label3]");
  const profileValue3 = requireEl<HTMLInputElement>(root, "[data-manage-profile-value3]");
  const profileLabel4 = requireEl<HTMLInputElement>(root, "[data-manage-profile-label4]");
  const profileValue4 = requireEl<HTMLInputElement>(root, "[data-manage-profile-value4]");
  const profileReset = requireEl<HTMLButtonElement>(root, "[data-manage-profile-reset]");
  const profileFromDoc = requireEl<HTMLButtonElement>(root, "[data-manage-profile-from-doc]");

  let managed: Managed | null = null;
  let catalogSeries: EpamSeriesProfile[] = [];
  const disposers: Array<() => void> = [];

  function on(el: Element, type: string, handler: EventListener): void {
    el.addEventListener(type, handler);
    disposers.push(() => el.removeEventListener(type, handler));
  }

  function setStatus(message: string, kind: "info" | "success" | "error" = "info"): void {
    status.textContent = message;
    status.dataset.kind = kind;
    status.hidden = !message;
  }

  function clearSelection(): void {
    managed = null;
    detail.hidden = true;
    publicToggle.checked = false;
    list.querySelectorAll(".pamphlet-manage__item.is-selected").forEach((el) => {
      el.classList.remove("is-selected");
    });
  }

  function chaptersForSeries(seriesName: string): string[] {
    const match = catalogSeries.find(
      (s) => s.name.trim().toLowerCase() === seriesName.trim().toLowerCase(),
    );
    return (match?.chapters ?? []).map((c) => c.name);
  }

  async function refreshCatalogOptions(doc?: PamphletStructure): Promise<void> {
    try {
      const catalog = await fetchEpamCatalog();
      catalogSeries = catalog.series;
      const authorNames = catalog.authors.map((a) => a.name);
      const seriesNames = catalog.series.map((s) => s.name);
      const current = doc ?? managed?.document;
      fillNameSelect(headerAuthor, authorNames, current?.header.author ?? "", "Sin autor");
      fillNameSelect(headerSeries, seriesNames, current?.header.series ?? "", "Sin serie");
      fillNameSelect(
        headerChapter,
        chaptersForSeries(current?.header.series ?? ""),
        current?.header.series_chapter ?? "",
        "Sin capítulo",
      );
    } catch {
      // Keep existing options if catalog fails; free-text values still save via sync.
    }
  }

  function fillChrome(doc: PamphletStructure): void {
    headerTitle.value = doc.header.title ?? "";
    headerSubtitle.value = doc.header.subtitle ?? "";
    void refreshCatalogOptions(doc);
    const stamp = formatHeaderLastUpdateDate(managed?.meta.updatedAt ?? doc.header.date);
    headerDateDisplay.textContent = `Fecha (última actualización): ${stamp}`;
    footerAction.value = doc.footer.action ?? "";
    footerMessage.value = doc.footer.message ?? "";
    footerLabel1.value = doc.footer.label1 ?? "";
    footerValue1.value = doc.footer.value1 ?? "";
    footerLabel2.value = doc.footer.label2 ?? "";
    footerValue2.value = doc.footer.value2 ?? "";
    footerLabel3.value = doc.footer.label3 ?? "";
    footerValue3.value = doc.footer.value3 ?? "";
    footerLabel4.value = doc.footer.label4 ?? "";
    footerValue4.value = doc.footer.value4 ?? "";
  }

  function readChrome(doc: PamphletStructure): PamphletStructure {
    return {
      ...doc,
      header: {
        title: headerTitle.value.trim(),
        subtitle: headerSubtitle.value.trim(),
        author: headerAuthor.value.trim(),
        series: headerSeries.value.trim(),
        series_chapter: headerChapter.value.trim(),
        date: formatHeaderLastUpdateDate(new Date()),
      },
      footer: footerFromForm({
        action: footerAction.value,
        message: footerMessage.value,
        label1: footerLabel1.value,
        value1: footerValue1.value,
        label2: footerLabel2.value,
        value2: footerValue2.value,
        label3: footerLabel3.value,
        value3: footerValue3.value,
        label4: footerLabel4.value,
        value4: footerValue4.value,
      }),
    };
  }

  function fillProfileForm(profile: FooterProfile | null): void {
    profileId.value = profile?.footerId ?? "";
    profileName.value = profile?.name ?? "";
    const f = profile?.footer ?? emptyFooter();
    profileAction.value = f.action;
    profileMessage.value = f.message;
    profileLabel1.value = f.label1;
    profileValue1.value = f.value1;
    profileLabel2.value = f.label2;
    profileValue2.value = f.value2;
    profileLabel3.value = f.label3;
    profileValue3.value = f.value3;
    profileLabel4.value = f.label4;
    profileValue4.value = f.value4;
  }

  async function applyProfile(profile: FooterProfile, bind: "snapshot" | "linked"): Promise<void> {
    if (!managed) {
      setStatus("Select a pamphlet first.", "error");
      return;
    }
    const next: PamphletStructure = {
      ...managed.document,
      footer: { ...profile.footer },
      footer_profile_id: profile.footerId,
      footer_bind: bind,
    };
    const saved = await saveEpamToCloud({
      document: next,
      epamId: managed.meta.epamId,
      fileName: managed.meta.fileName,
      fallbackTitle: managed.meta.title,
    });
    managed = { meta: saved.meta, document: saved.document };
    fillChrome(saved.document);
    setStatus(
      bind === "linked" ? `Footer linked: ${profile.name}` : `Footer copied: ${profile.name}`,
      "success",
    );
    await refreshProfiles();
  }

  async function refreshProfiles(): Promise<void> {
    profileList.replaceChildren();
    if (!getAuthToken() || !isAuthenticated()) {
      const p = document.createElement("p");
      p.className = "pamphlet-manage__empty";
      p.textContent = "Sign in to manage footer profiles.";
      profileList.appendChild(p);
      return;
    }
    try {
      const { footers } = await fetchFooterProfiles();
      if (footers.length === 0) {
        const p = document.createElement("p");
        p.className = "pamphlet-manage__empty";
        p.textContent = "No footer profiles yet.";
        profileList.appendChild(p);
        return;
      }
      for (const profile of footers) {
        const card = document.createElement("article");
        card.className = "pamphlet-manage__profile product-dash__card";
        if (managed?.document.footer_profile_id === profile.footerId) {
          card.classList.add("is-current");
        }
        const name = document.createElement("h3");
        name.className = "pamphlet-manage__profile-name";
        name.textContent = profile.name;
        const meta = document.createElement("p");
        meta.className = "pamphlet-manage__profile-meta";
        meta.textContent = [profile.footer.action, profile.footer.value1].filter(Boolean).join(" · ");
        const actions = document.createElement("div");
        actions.className = "pamphlet-manage__profile-actions";

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => fillProfileForm(profile));

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", () => {
          void (async () => {
            if (!window.confirm(`Delete footer “${profile.name}”?`)) return;
            try {
              await deleteFooterProfile(profile.footerId);
              if (profileId.value === profile.footerId) fillProfileForm(null);
              await refreshProfiles();
              setStatus(`Footer deleted: ${profile.name}`, "success");
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              setStatus(message, "error");
              openApiErrorModal(message, {
                title: "Manage pamphlet",
                summary: "Could not delete footer profile.",
              });
            }
          })();
        });

        actions.append(editBtn, delBtn);
        if (managed) {
          const snap = document.createElement("button");
          snap.type = "button";
          snap.textContent = "Copy";
          snap.addEventListener("click", () => {
            void applyProfile(profile, "snapshot").catch((err) => {
              const message = err instanceof Error ? err.message : String(err);
              setStatus(message, "error");
              openApiErrorModal(message, {
                title: "Manage pamphlet",
                summary: "Could not apply footer profile.",
              });
            });
          });
          const link = document.createElement("button");
          link.type = "button";
          link.textContent = "Link";
          link.addEventListener("click", () => {
            void applyProfile(profile, "linked").catch((err) => {
              const message = err instanceof Error ? err.message : String(err);
              setStatus(message, "error");
              openApiErrorModal(message, {
                title: "Manage pamphlet",
                summary: "Could not link footer profile.",
              });
            });
          });
          actions.append(snap, link);
        }
        card.append(name, meta, actions);
        profileList.appendChild(card);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const p = document.createElement("p");
      p.className = "pamphlet-manage__empty";
      p.textContent = `Could not load footers: ${message}`;
      profileList.appendChild(p);
    }
  }

  async function selectEpam(epamId: string): Promise<void> {
    hint.textContent = "Loading pamphlet…";
    const { meta, document } = await fetchEpam(epamId);
    managed = { meta, document };
    detail.hidden = false;
    detailTitle.textContent = meta.title || meta.fileName || meta.epamId;
    publicToggle.checked = Boolean(meta.public);
    fillChrome(document);
    list.querySelectorAll(".pamphlet-manage__item.is-selected").forEach((el) => {
      el.classList.remove("is-selected");
    });
    list
      .querySelector(`[data-manage-epam-id="${CSS.escape(epamId)}"]`)
      ?.classList.add("is-selected");
    hint.textContent = "Hide from Articles, delete, edit header/footer, or apply a footer profile.";
    await refreshProfiles();
  }

  function appendRow(parent: HTMLElement, item: EpamSeriesTreeItem): void {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pamphlet-manage__item product-dash__card";
    btn.dataset.manageEpamId = item.epamId;
    btn.setAttribute(
      "aria-label",
      `Manage pamphlet ${item.title || item.fileName || item.epamId}`,
    );
    const title = document.createElement("span");
    title.className = "pamphlet-manage__item-title";
    title.textContent = item.title || item.fileName || item.epamId;
    const meta = document.createElement("span");
    meta.className = "pamphlet-manage__item-meta";
    const updated = (item.updatedAt ?? "").slice(0, 10) || "—";
    const visibility = item.public ? "Visible" : "Hidden";
    meta.textContent = `${item.fileName || "sin-nombre.epam"} · ${updated} · ${visibility}`;
    btn.append(title, meta);
    btn.addEventListener("click", () => {
      void (async () => {
        btn.disabled = true;
        try {
          await selectEpam(item.epamId);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setStatus(message, "error");
          openApiErrorModal(message, {
            title: "Manage pamphlet",
            summary: "Could not load this .epam from the server.",
          });
        } finally {
          btn.disabled = false;
        }
      })();
    });
    parent.appendChild(btn);
  }

  function renderTree(tree: EpamSeriesTreeResponse): void {
    list.replaceChildren();
    if (tree.count === 0) {
      hint.textContent = "No cloud pamphlets for this account yet.";
      const empty = document.createElement("p");
      empty.className = "pamphlet-manage__empty";
      empty.textContent = "Save a pamphlet with “Save to cloud” first.";
      list.appendChild(empty);
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
        chapterEl.open = true;
        const chapterSummary = document.createElement("summary");
        chapterSummary.textContent = `Chapter ${chapter.name}`;
        chapterEl.appendChild(chapterSummary);
        const chapterList = document.createElement("div");
        chapterList.className = "pamphlet-manage__chapter-items";
        for (const item of chapter.items) {
          appendRow(chapterList, item);
        }
        chapterEl.appendChild(chapterList);
        seriesEl.appendChild(chapterEl);
      }
      list.appendChild(seriesEl);
    }
  }

  async function load(): Promise<void> {
    clearSelection();
    setStatus("");
    await refreshAuthSession();
    if (!getAuthToken() || !isAuthenticated()) {
      hint.textContent = "Sign in to manage cloud pamphlets.";
      list.replaceChildren();
      await refreshProfiles();
      return;
    }
    hint.textContent = "Loading pamphlets…";
    try {
      const tree = await fetchEpamSeriesTree();
      renderTree(tree);
      if (tree.count > 0) {
        hint.textContent =
          "Select a pamphlet to hide from Articles, delete, or edit headers and footers.";
      }
      await refreshProfiles();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      hint.textContent = `Could not list pamphlets: ${message}`;
      openApiErrorModal(message, {
        title: "Manage pamphlet",
        summary: "Could not list pamphlets from the server.",
      });
    }
  }

  on(headerSeries, "change", () => {
    fillNameSelect(
      headerChapter,
      chaptersForSeries(headerSeries.value),
      headerChapter.value,
      "Sin capítulo",
    );
  });

  on(publicToggle, "change", () => {
    void (async () => {
      if (!managed) return;
      const published = publicToggle.checked;
      publicToggle.disabled = true;
      try {
        const result = await setEpamPublication(managed.meta.epamId, published);
        managed = { ...managed, meta: { ...managed.meta, public: result.public } };
        setStatus(
          result.public
            ? "Pamphlet is visible in Articles."
            : "Pamphlet hidden from Articles.",
          "success",
        );
      } catch (err) {
        publicToggle.checked = !published;
        const message = err instanceof Error ? err.message : String(err);
        setStatus(message, "error");
        openApiErrorModal(message, {
          title: "Manage pamphlet",
          summary: "Could not update Articles visibility.",
        });
      } finally {
        publicToggle.disabled = false;
      }
    })();
  });

  on(chromeForm, "submit", (event) => {
    event.preventDefault();
    void (async () => {
      if (!managed) return;
      try {
        const saved = await saveEpamToCloud({
          document: readChrome(managed.document),
          epamId: managed.meta.epamId,
          fileName: managed.meta.fileName,
          fallbackTitle: managed.meta.title,
        });
        managed = { meta: saved.meta, document: saved.document };
        detailTitle.textContent =
          saved.meta.title || saved.meta.fileName || saved.meta.epamId;
        fillChrome(saved.document);
        setStatus("Header and footer saved.", "success");
        const tree = await fetchEpamSeriesTree();
        renderTree(tree);
        list
          .querySelector(`[data-manage-epam-id="${CSS.escape(saved.meta.epamId)}"]`)
          ?.classList.add("is-selected");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setStatus(message, "error");
        openApiErrorModal(message, {
          title: "Manage pamphlet",
          summary: "Could not save header and footer.",
        });
      }
    })();
  });

  on(deleteBtn, "click", () => {
    void (async () => {
      if (!managed) return;
      const label = managed.meta.title || managed.meta.fileName || managed.meta.epamId;
      if (!window.confirm(`Delete “${label}”? This cannot be undone from Manage.`)) return;
      const id = managed.meta.epamId;
      deleteBtn.disabled = true;
      try {
        await recycleEpam(id);
        clearSelection();
        setStatus("Pamphlet deleted.", "success");
        const tree = await fetchEpamSeriesTree();
        renderTree(tree);
        await refreshProfiles();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setStatus(message, "error");
        openApiErrorModal(message, {
          title: "Manage pamphlet",
          summary: "Could not delete this pamphlet.",
        });
      } finally {
        deleteBtn.disabled = false;
      }
    })();
  });

  on(profileReset, "click", () => {
    fillProfileForm(null);
    profileName.focus();
  });

  on(profileFromDoc, "click", () => {
    if (!managed) {
      setStatus("Select a pamphlet first.", "error");
      return;
    }
    fillProfileForm({
      userId: "",
      footerId: profileId.value,
      name: profileName.value.trim() || managed.document.header.title || "Current footer",
      footer: managed.document.footer,
    });
  });

  on(profileForm, "submit", (event) => {
    event.preventDefault();
    void (async () => {
      const name = profileName.value.trim();
      if (!name) {
        setStatus("Footer profile needs a name.", "error");
        return;
      }
      if (!getAuthToken() || !isAuthenticated()) {
        setStatus("Sign in to save footer profiles.", "error");
        return;
      }
      const payload = {
        name,
        footer: footerFromForm({
          action: profileAction.value,
          message: profileMessage.value,
          label1: profileLabel1.value,
          value1: profileValue1.value,
          label2: profileLabel2.value,
          value2: profileValue2.value,
          label3: profileLabel3.value,
          value3: profileValue3.value,
          label4: profileLabel4.value,
          value4: profileValue4.value,
        }),
      };
      try {
        const id = profileId.value.trim();
        const saved = id
          ? await updateFooterProfile(id, payload)
          : await createFooterProfile(payload);
        fillProfileForm(saved);
        setStatus(`Footer saved: ${saved.name}`, "success");
        await refreshProfiles();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setStatus(message, "error");
        openApiErrorModal(message, {
          title: "Manage pamphlet",
          summary: "Could not save footer profile.",
        });
      }
    })();
  });

  void load().then(() => refreshCatalogOptions());

  return {
    destroy() {
      for (const dispose of disposers) dispose();
      disposers.length = 0;
      managed = null;
    },
  };
}
