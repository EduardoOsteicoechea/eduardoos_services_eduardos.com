import { apiRequest, getCsrf } from "./api";
import { mustLog } from "./dev-log";
import { showErrorModal } from "./error-modal";
import {
  fetchOrgReport,
  ownerImageUploadPath,
  saveOrgReport,
  uploadReportImage,
  type EreportPayload,
} from "./ereport";

const OVERLAY_ID = "eduardoos-ereport-issue-card-overlay";

export type EreportIssueChecklistRow = {
  id: string;
  label?: string;
  checked?: boolean;
};

export type EreportIssueImageRef = {
  id?: string;
  mime?: string;
  name?: string;
  url?: string;
  dataUrl?: string;
};

export type EreportIssueCardItem = {
  id: string;
  nombre?: string;
  incidencia?: string;
  solucion?: string;
  status?: string;
  fechaIncidencia?: string;
  fechaSolucion?: string;
  checklist?: EreportIssueChecklistRow[];
  imagesIncidencia?: EreportIssueImageRef[];
  imagesSolucion?: EreportIssueImageRef[];
};

export type EreportIssueCardOpenOpts = {
  orgId: string;
  reportId: string;
  sectionId: string;
  groupId: string;
  itemId: string;
  /** Optional seed; modal reloads the report item when missing fields. */
  item?: Partial<EreportIssueCardItem>;
  onChanged?: () => void;
  onDeleted?: () => void;
};

type SectionNode = {
  id: string;
  groups?: GroupNode[];
};
type GroupNode = {
  id: string;
  items?: EreportIssueCardItem[];
};
type ReportPayload = EreportPayload & {
  sections?: SectionNode[];
};

let escapeHandler: ((ev: KeyboardEvent) => void) | null = null;
let saveTimer: number | null = null;
let writeChain: Promise<void> = Promise.resolve();

function enqueueWrite(fn: () => Promise<void>): Promise<void> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function notifyReportMutated(orgId: string, reportId: string) {
  document.dispatchEvent(
    new CustomEvent("eos:ereport-report-mutated", {
      detail: { orgId, reportId },
    }),
  );
}

function el<T extends HTMLElement>(root: ParentNode, sel: string): T | null {
  return root.querySelector(sel) as T | null;
}

function toDateTimeLocalValue(raw: string | undefined): string {
  const s = (raw || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s.slice(0, 16);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00`;
  return "";
}

function fromDateTimeLocalValue(raw: string): string {
  return (raw || "").trim();
}

function imageSrc(im: EreportIssueImageRef | undefined): string {
  if (!im) return "";
  if (im.url) return im.url;
  if (im.dataUrl) return im.dataUrl;
  return "";
}

function findItem(
  payload: ReportPayload | null,
  sectionId: string,
  groupId: string,
  itemId: string,
): EreportIssueCardItem | null {
  const sec = (payload?.sections || []).find((s) => s.id === sectionId);
  const grp = (sec?.groups || []).find((g) => g.id === groupId);
  const item = (grp?.items || []).find((it) => it.id === itemId);
  return item || null;
}

/** Never persist an empty checklist — backend heal treats [] as legacy → aprobado. */
export function ensureIssueChecklist(
  checklist: EreportIssueChecklistRow[] | undefined | null,
): EreportIssueChecklistRow[] {
  if (Array.isArray(checklist) && checklist.length > 0) {
    return checklist.map((c) => ({
      id: c.id,
      label: c.label || "",
      checked: Boolean(c.checked),
    }));
  }
  return [{ id: "ux-test", label: "UX Test", checked: false }];
}

function cloneItem(it: EreportIssueCardItem): EreportIssueCardItem {
  return {
    id: it.id,
    nombre: it.nombre || "",
    incidencia: it.incidencia || "",
    solucion: it.solucion || "",
    status: it.status || "",
    fechaIncidencia: it.fechaIncidencia || "",
    fechaSolucion: it.fechaSolucion || "",
    checklist: ensureIssueChecklist(it.checklist),
    imagesIncidencia: Array.isArray(it.imagesIncidencia) ? [...it.imagesIncidencia] : [],
    imagesSolucion: Array.isArray(it.imagesSolucion) ? [...it.imagesSolucion] : [],
  };
}

async function patchItem(
  orgId: string,
  reportId: string,
  sectionId: string,
  groupId: string,
  itemId: string,
  body: Record<string, unknown>,
) {
  await getCsrf();
  return apiRequest<Record<string, unknown>>(
    `/ereport/orgs/${encodeURIComponent(orgId)}/reports/${encodeURIComponent(reportId)}/sections/${encodeURIComponent(sectionId)}/groups/${encodeURIComponent(groupId)}/items/${encodeURIComponent(itemId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    { timeoutMs: 120000 },
  );
}

export function closeEreportIssueCardModal() {
  if (saveTimer != null) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
  const existing = document.getElementById(OVERLAY_ID);
  if (existing?.parentNode) existing.parentNode.removeChild(existing);
  if (escapeHandler) {
    document.removeEventListener("keydown", escapeHandler, true);
    escapeHandler = null;
  }
}

export function isEreportIssueCardModalOpen(): boolean {
  return Boolean(document.getElementById(OVERLAY_ID));
}

/**
 * Single-issue card overlay (website issues → Open).
 * Editable: nombre, incidencia, solucion, dates, images, UX checklist labels.
 * Never patches status to aprobado.
 */
export async function openEreportIssueCardModal(opts: EreportIssueCardOpenOpts) {
  const orgId = (opts.orgId || "").trim();
  const reportId = (opts.reportId || "").trim();
  const sectionId = (opts.sectionId || "").trim();
  const groupId = (opts.groupId || "").trim();
  const itemId = (opts.itemId || "").trim();
  if (!orgId || !reportId || !sectionId || !groupId || !itemId) return;

  closeEreportIssueCardModal();

  let draft: EreportIssueCardItem = cloneItem({
    id: itemId,
    nombre: opts.item?.nombre,
    incidencia: opts.item?.incidencia,
    solucion: opts.item?.solucion,
    status: opts.item?.status,
    fechaIncidencia: opts.item?.fechaIncidencia,
    fechaSolucion: opts.item?.fechaSolucion,
    checklist: opts.item?.checklist,
    imagesIncidencia: opts.item?.imagesIncidencia,
    imagesSolucion: opts.item?.imagesSolucion,
  });
  /** Block autosave/edits until report fetch finishes (avoids fillForm wiping mid-type). */
  let fieldsReady = false;

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.className = "ereport-issue-card-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Issue");

  const frame = document.createElement("div");
  frame.className = "ereport-issue-card-overlay__frame";
  frame.innerHTML = `
    <header class="ereport-issue-card-overlay__bar">
      <h2 class="ereport-issue-card-overlay__title">Issue</h2>
      <div class="ereport-issue-card-overlay__bar-actions">
        <span data-eq-issue-hooks class="ereport-issue-card-overlay__hooks" hidden></span>
        <button type="button" class="icon-btn" data-eq-issue-close aria-label="Close issue" title="Close">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>
    </header>
    <div class="ereport-issue-card-overlay__body" data-eq-issue-body>
      <label class="ereport-issue-card-overlay__field">
        Name
        <input type="text" data-eq-issue-nombre placeholder="Short issue name" />
      </label>
      <div class="ereport-issue-card-overlay__cols">
        <div class="ereport-issue-card-overlay__col">
          <label class="ereport-issue-card-overlay__field">
            Issue
            <textarea data-eq-issue-incidencia rows="5" placeholder="Issue description"></textarea>
          </label>
          <div class="ereport-issue-card-overlay__thumbs" data-eq-thumbs-incidencia></div>
          <div class="ereport-issue-card-overlay__meta">
            <label class="ereport-issue-card-overlay__field ereport-issue-card-overlay__field--inline">
              Date
              <input type="datetime-local" data-eq-issue-fecha-inc />
            </label>
            <input type="file" accept="image/*" multiple hidden data-eq-issue-file-inc />
            <button type="button" class="btn" data-eq-issue-img-inc title="Load image">
              <span class="material-symbols-outlined" aria-hidden="true">image</span>
              Load image
            </button>
          </div>
        </div>
        <div class="ereport-issue-card-overlay__col">
          <label class="ereport-issue-card-overlay__field">
            Response / solución
            <textarea data-eq-issue-solucion rows="5" placeholder="What was done / how it was fixed"></textarea>
          </label>
          <div class="ereport-issue-card-overlay__thumbs" data-eq-thumbs-solucion></div>
          <div class="ereport-issue-card-overlay__meta">
            <label class="ereport-issue-card-overlay__field ereport-issue-card-overlay__field--inline">
              Date
              <input type="datetime-local" data-eq-issue-fecha-sol />
            </label>
            <input type="file" accept="image/*" multiple hidden data-eq-issue-file-sol />
            <button type="button" class="btn" data-eq-issue-img-sol title="Load image">
              <span class="material-symbols-outlined" aria-hidden="true">image</span>
              Load image
            </button>
          </div>
        </div>
      </div>
      <section class="ereport-issue-card-overlay__ux" aria-label="UI/UX checklist">
        <h3 class="ereport-issue-card-overlay__ux-title">UI/UX</h3>
        <div data-eq-issue-checklist></div>
        <button type="button" class="btn" data-eq-issue-add-check title="Add UX check">
          <span class="material-symbols-outlined" aria-hidden="true">add</span>
          Add UX check
        </button>
      </section>
    </div>
    <div class="ereport-issue-card-overlay__footer">
      <button type="button" class="btn btn--danger" data-eq-issue-delete title="Delete issue">
        <span class="material-symbols-outlined" aria-hidden="true">delete</span>
        Delete
      </button>
      <p class="status ereport-issue-card-overlay__status" data-eq-issue-status></p>
    </div>
  `;

  overlay.append(frame);
  document.body.append(overlay);

  const nombreInput = el<HTMLInputElement>(frame, "[data-eq-issue-nombre]")!;
  const incidenciaInput = el<HTMLTextAreaElement>(frame, "[data-eq-issue-incidencia]")!;
  const solucionInput = el<HTMLTextAreaElement>(frame, "[data-eq-issue-solucion]")!;
  const fechaIncInput = el<HTMLInputElement>(frame, "[data-eq-issue-fecha-inc]")!;
  const fechaSolInput = el<HTMLInputElement>(frame, "[data-eq-issue-fecha-sol]")!;
  const thumbsInc = el<HTMLElement>(frame, "[data-eq-thumbs-incidencia]")!;
  const thumbsSol = el<HTMLElement>(frame, "[data-eq-thumbs-solucion]")!;
  const checklistHost = el<HTMLElement>(frame, "[data-eq-issue-checklist]")!;
  const statusEl = el<HTMLElement>(frame, "[data-eq-issue-status]")!;
  const fileInc = el<HTMLInputElement>(frame, "[data-eq-issue-file-inc]")!;
  const fileSol = el<HTMLInputElement>(frame, "[data-eq-issue-file-sol]")!;

  function setStatus(msg: string) {
    statusEl.textContent = msg;
  }

  function readDraftFromDom() {
    draft.nombre = nombreInput.value;
    draft.incidencia = incidenciaInput.value;
    draft.solucion = solucionInput.value;
    draft.fechaIncidencia = fromDateTimeLocalValue(fechaIncInput.value);
    draft.fechaSolucion = fromDateTimeLocalValue(fechaSolInput.value);
    const rows: EreportIssueChecklistRow[] = [];
    checklistHost.querySelectorAll("[data-check-id]").forEach((row) => {
      if (!(row instanceof HTMLElement)) return;
      const id = row.getAttribute("data-check-id") || "";
      if (!id) return;
      const labelInput = row.querySelector("[data-check-label]");
      const toggle = row.querySelector("[data-check-toggle]");
      const label =
        labelInput instanceof HTMLInputElement ? labelInput.value : "";
      const checked =
        toggle instanceof HTMLButtonElement && toggle.getAttribute("aria-pressed") === "true";
      rows.push({ id, label, checked });
    });
    draft.checklist = rows;
  }

  function renderThumbs(host: HTMLElement, images: EreportIssueImageRef[] | undefined, which: "incidencia" | "solucion") {
    host.replaceChildren();
    (images || []).forEach((im, idx) => {
      const wrap = document.createElement("div");
      wrap.className = "ereport-issue-card-overlay__thumb";
      const img = document.createElement("img");
      img.alt = im.name || "image";
      img.src = imageSrc(im);
      const del = document.createElement("button");
      del.type = "button";
      del.className = "icon-btn ereport-issue-card-overlay__thumb-del";
      del.title = "Remove image";
      del.setAttribute("aria-label", "Remove image");
      del.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">close</span>';
      del.addEventListener("click", () => {
        void removeImage(which, idx);
      });
      wrap.append(img, del);
      host.append(wrap);
    });
  }

  function renderChecklist() {
    checklistHost.replaceChildren();
    const list = draft.checklist || [];
    if (list.length === 0) {
      const empty = document.createElement("p");
      empty.className = "ereport-issue-card-overlay__ux-empty";
      empty.textContent = "Add UX checks for this issue.";
      checklistHost.append(empty);
    }
    for (const c of list) {
      const row = document.createElement("div");
      row.className = "ereport-issue-card-overlay__check-row";
      row.setAttribute("data-check-id", c.id);
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = `ereport-issue-card-overlay__check-toggle${c.checked ? " is-checked" : ""}`;
      toggle.setAttribute("data-check-toggle", "");
      toggle.setAttribute("aria-pressed", c.checked ? "true" : "false");
      toggle.title = c.checked ? "Uncheck" : "Check";
      toggle.setAttribute(
        "aria-label",
        c.checked ? `Uncheck ${c.label || "UX"}` : `Check ${c.label || "UX"}`,
      );
      toggle.innerHTML =
        '<span class="material-symbols-outlined" aria-hidden="true">check</span>';
      toggle.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!fieldsReady || toggle.disabled) return;
        const id = c.id;
        draft.checklist = ensureIssueChecklist(
          (draft.checklist || []).map((rowItem) =>
            rowItem.id === id
              ? { ...rowItem, checked: !rowItem.checked }
              : rowItem,
          ),
        );
        renderChecklist();
        scheduleSave();
      });
      const label = document.createElement("input");
      label.type = "text";
      label.className = "ereport-issue-card-overlay__check-label";
      label.setAttribute("data-check-label", "");
      label.value = c.label || "";
      label.placeholder = "UI/UX text";
      label.maxLength = 200;
      label.setAttribute("aria-label", "UI/UX text");
      label.disabled = !fieldsReady;
      label.addEventListener("input", () => scheduleSave());
      const del = document.createElement("button");
      del.type = "button";
      del.className = "icon-btn";
      del.title = "Remove UX check";
      del.setAttribute("aria-label", "Remove UX check");
      del.disabled = !fieldsReady;
      del.innerHTML =
        '<span class="material-symbols-outlined" aria-hidden="true">delete</span>';
      del.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!fieldsReady || del.disabled) return;
        draft.checklist = ensureIssueChecklist(
          (draft.checklist || []).filter((x) => x.id !== c.id),
        );
        renderChecklist();
        scheduleSave();
      });
      toggle.disabled = !fieldsReady;
      row.append(toggle, label, del);
      checklistHost.append(row);
    }
  }

  function fillForm() {
    nombreInput.value = draft.nombre || "";
    incidenciaInput.value = draft.incidencia || "";
    solucionInput.value = draft.solucion || "";
    fechaIncInput.value = toDateTimeLocalValue(draft.fechaIncidencia);
    fechaSolInput.value = toDateTimeLocalValue(draft.fechaSolucion);
    renderThumbs(thumbsInc, draft.imagesIncidencia, "incidencia");
    renderThumbs(thumbsSol, draft.imagesSolucion, "solucion");
    renderChecklist();
  }

  /** Field patch — never sends status; never sends empty checklist (avoids aprobado heal). */
  function patchBodyFromDraft(): Record<string, unknown> {
    readDraftFromDom();
    draft.checklist = ensureIssueChecklist(draft.checklist);
    return {
      nombre: (draft.nombre || "").trim(),
      incidencia: draft.incidencia || "",
      solucion: draft.solucion || "",
      fechaIncidencia: draft.fechaIncidencia || "",
      fechaSolucion: draft.fechaSolucion || "",
      checklist: draft.checklist,
    };
  }

  function scheduleSave() {
    if (!fieldsReady) return;
    if (saveTimer != null) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      saveTimer = null;
      void persistFields();
    }, 450);
  }

  async function persistFields() {
    const body = patchBodyFromDraft();
    if (!(body.nombre as string)) {
      setStatus("Name cannot be empty.");
      return;
    }
    setStatus("Saving…");
    await enqueueWrite(async () => {
      try {
        const { status, data, requestId } = await patchItem(
          orgId,
          reportId,
          sectionId,
          groupId,
          itemId,
          body,
        );
        if (status !== 200) {
          showErrorModal({
            message: String((data as { message?: string }).message || "Could not save issue."),
            requestId: String((data as { request_id?: string }).request_id || requestId),
            details: String((data as { error?: string }).error || `HTTP ${status}`),
          });
          setStatus("Could not save issue.");
          return;
        }
        const node = data.node as EreportIssueCardItem | undefined;
        if (node?.id) {
          draft = cloneItem({
            ...draft,
            ...node,
            /* Keep local checklist if PATCH echo omits/reshapes checked flags. */
            checklist:
              Array.isArray(node.checklist) && node.checklist.length > 0
                ? node.checklist
                : draft.checklist,
            imagesIncidencia: draft.imagesIncidencia,
            imagesSolucion: draft.imagesSolucion,
          });
          renderChecklist();
        }
        notifyReportMutated(orgId, reportId);
        opts.onChanged?.();
        setStatus("Saved.");
        if (mustLog) console.log("[ereport-issue-card] saved fields", { itemId, requestId });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not save issue.";
        showErrorModal({ message: msg });
        setStatus("Could not save issue.");
      }
    });
  }

  async function mutatePayloadImages(
    mutator: (item: EreportIssueCardItem) => void,
  ): Promise<boolean> {
    setStatus("Updating images…");
    const { status, data, requestId } = await fetchOrgReport(orgId, reportId);
    if (status !== 200) {
      showErrorModal({
        message: String((data as { message?: string }).message || "Could not load report."),
        requestId: String((data as { request_id?: string }).request_id || requestId),
      });
      setStatus("Could not update images.");
      return false;
    }
    const payload = ((data.payload as ReportPayload) || { sections: [] }) as ReportPayload;
    const item = findItem(payload, sectionId, groupId, itemId);
    if (!item) {
      showErrorModal({ message: "Issue not found in report." });
      setStatus("Issue not found.");
      return false;
    }
    if (!Array.isArray(item.imagesIncidencia)) item.imagesIncidencia = [];
    if (!Array.isArray(item.imagesSolucion)) item.imagesSolucion = [];
    mutator(item);
    const save = await saveOrgReport(orgId, reportId, { payload });
    if (save.status !== 200) {
      showErrorModal({
        message: String(save.data.message || "Could not save images."),
        requestId: String(save.data.request_id || save.requestId),
        details: String(save.data.error || `HTTP ${save.status}`),
      });
      setStatus("Could not save images.");
      return false;
    }
    draft.imagesIncidencia = [...(item.imagesIncidencia || [])];
    draft.imagesSolucion = [...(item.imagesSolucion || [])];
    renderThumbs(thumbsInc, draft.imagesIncidencia, "incidencia");
    renderThumbs(thumbsSol, draft.imagesSolucion, "solucion");
    notifyReportMutated(orgId, reportId);
    opts.onChanged?.();
    setStatus("Saved.");
    return true;
  }

  function isImageFile(file: File): boolean {
    if (/^image\//i.test(file.type || "")) return true;
    return /\.(png|jpe?g|webp|gif)$/i.test(file.name || "");
  }

  function clipboardImageFiles(clipboardData: DataTransfer | null): File[] {
    const out: File[] = [];
    if (!clipboardData) return out;
    const files = clipboardData.files ? Array.from(clipboardData.files) : [];
    for (const file of files) {
      if (file && isImageFile(file)) out.push(file);
    }
    if (out.length) return out;
    const items = clipboardData.items ? Array.from(clipboardData.items) : [];
    for (const item of items) {
      if (!item || !/^image\//i.test(item.type || "")) continue;
      const file = item.getAsFile?.();
      if (file) out.push(file);
    }
    return out;
  }

  function resolvePasteImageWhich(target: EventTarget | null): "incidencia" | "solucion" {
    if (target instanceof Element) {
      if (target.closest("[data-eq-issue-solucion]") || target.closest("[data-eq-thumbs-solucion]")) {
        return "solucion";
      }
      if (target.closest("[data-eq-issue-incidencia]") || target.closest("[data-eq-thumbs-incidencia]")) {
        return "incidencia";
      }
      if (target.closest(".ereport-issue-card-overlay__col:last-child")) return "solucion";
    }
    if (document.activeElement instanceof Element) {
      if (document.activeElement.closest("[data-eq-issue-solucion]")) return "solucion";
    }
    return "incidencia";
  }

  async function addImages(which: "incidencia" | "solucion", files: FileList | File[] | null) {
    if (!files?.length) return;
    if (!fieldsReady) {
      setStatus("Still loading issue…");
      return;
    }
    const list = Array.from(files).filter((file) => file && isImageFile(file));
    if (!list.length) {
      setStatus("No images uploaded.");
      return;
    }
    await enqueueWrite(async () => {
      const uploaded: EreportIssueImageRef[] = [];
      for (const file of list) {
        try {
          await getCsrf(true);
          const { status, data, requestId } = await uploadReportImage(
            ownerImageUploadPath(orgId, reportId),
            file,
          );
          if (status < 200 || status >= 300 || !data.id) {
            showErrorModal({
              message: String(data.message || "Could not upload image."),
              requestId: String(data.request_id || requestId),
              details: String(data.error || `HTTP ${status}`),
            });
            continue;
          }
          uploaded.push({
            id: data.id,
            mime: data.mime || file.type || "image/png",
            name: data.name || file.name,
            url: data.url,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Could not upload image.";
          showErrorModal({ message: msg });
        }
      }
      if (!uploaded.length) {
        setStatus("No images uploaded.");
        return;
      }
      await mutatePayloadImages((item) => {
        const key = which === "solucion" ? "imagesSolucion" : "imagesIncidencia";
        item[key] = [...(item[key] || []), ...uploaded];
      });
    });
  }

  async function removeImage(which: "incidencia" | "solucion", idx: number) {
    await enqueueWrite(async () => {
      await mutatePayloadImages((item) => {
        const key = which === "solucion" ? "imagesSolucion" : "imagesIncidencia";
        const list = [...(item[key] || [])];
        if (idx < 0 || idx >= list.length) return;
        list.splice(idx, 1);
        item[key] = list;
      });
    });
  }

  async function deleteIssue() {
    if (!window.confirm("Delete this issue?")) return;
    if (saveTimer != null) {
      window.clearTimeout(saveTimer);
      saveTimer = null;
    }
    setStatus("Deleting…");
    await enqueueWrite(async () => {
      try {
        const { status, data, requestId } = await fetchOrgReport(orgId, reportId);
        if (status !== 200) {
          showErrorModal({
            message: String((data as { message?: string }).message || "Could not load report."),
            requestId: String((data as { request_id?: string }).request_id || requestId),
          });
          setStatus("Could not delete issue.");
          return;
        }
        const payload = ((data.payload as ReportPayload) || { sections: [] }) as ReportPayload;
        const sec = (payload.sections || []).find((s) => s.id === sectionId);
        const grp = (sec?.groups || []).find((g) => g.id === groupId);
        if (!grp?.items) {
          showErrorModal({ message: "Issue not found in report." });
          setStatus("Could not delete issue.");
          return;
        }
        grp.items = grp.items.filter((it) => it.id !== itemId);
        const save = await saveOrgReport(orgId, reportId, { payload });
        if (save.status !== 200) {
          showErrorModal({
            message: String(save.data.message || "Could not delete issue."),
            requestId: String(save.data.request_id || save.requestId),
            details: String(save.data.error || `HTTP ${save.status}`),
          });
          setStatus("Could not delete issue.");
          return;
        }
        notifyReportMutated(orgId, reportId);
        opts.onDeleted?.();
        opts.onChanged?.();
        closeEreportIssueCardModal();
        if (mustLog) console.log("[ereport-issue-card] deleted", { itemId });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not delete issue.";
        showErrorModal({ message: msg });
        setStatus("Could not delete issue.");
      }
    });
  }

  escapeHandler = (ev: KeyboardEvent) => {
    if (ev.key !== "Escape") return;
    ev.preventDefault();
    ev.stopPropagation();
    closeEreportIssueCardModal();
  };
  document.addEventListener("keydown", escapeHandler, true);

  el(frame, "[data-eq-issue-close]")?.addEventListener("click", () => closeEreportIssueCardModal());
  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) closeEreportIssueCardModal();
  });

  for (const node of [nombreInput, incidenciaInput, solucionInput, fechaIncInput, fechaSolInput]) {
    node.addEventListener("input", () => scheduleSave());
    node.addEventListener("change", () => scheduleSave());
  }

  el(frame, "[data-eq-issue-img-inc]")?.addEventListener("click", () => {
    if (!fieldsReady || fileInc.disabled) return;
    fileInc.click();
  });
  el(frame, "[data-eq-issue-img-sol]")?.addEventListener("click", () => {
    if (!fieldsReady || fileSol.disabled) return;
    fileSol.click();
  });
  fileInc.addEventListener("change", () => {
    void addImages("incidencia", fileInc.files);
    fileInc.value = "";
  });
  fileSol.addEventListener("change", () => {
    void addImages("solucion", fileSol.files);
    fileSol.value = "";
  });
  overlay.addEventListener("paste", (ev) => {
    if (!fieldsReady) return;
    const images = clipboardImageFiles(ev.clipboardData);
    if (!images.length) return;
    ev.preventDefault();
    void addImages(resolvePasteImageWhich(ev.target), images);
  });

  el(frame, "[data-eq-issue-add-check]")?.addEventListener("click", () => {
    readDraftFromDom();
    const id = `ux-${Date.now().toString(36)}`;
    draft.checklist = [...(draft.checklist || []), { id, label: "UX Test", checked: false }];
    renderChecklist();
    scheduleSave();
  });

  el(frame, "[data-eq-issue-delete]")?.addEventListener("click", () => {
    void deleteIssue();
  });

  const fieldControls = [
    nombreInput,
    incidenciaInput,
    solucionInput,
    fechaIncInput,
    fechaSolInput,
  ];
  const setFieldsEnabled = (on: boolean) => {
    for (const node of fieldControls) node.disabled = !on;
    frame
      .querySelectorAll<HTMLButtonElement | HTMLInputElement>(
        "button, input[type='checkbox'], input[type='file']",
      )
      .forEach((node) => {
        if (node.hasAttribute("data-eq-issue-close")) return;
        node.disabled = !on;
      });
  };

  fillForm();
  setFieldsEnabled(false);
  setStatus("Loading…");

  try {
    const { status, data, requestId } = await fetchOrgReport(orgId, reportId);
    if (status !== 200) {
      showErrorModal({
        message: String((data as { message?: string }).message || "Could not load issue."),
        requestId: String((data as { request_id?: string }).request_id || requestId),
      });
      setStatus("Could not load issue.");
      return;
    }
    const payload = (data.payload as ReportPayload) || { sections: [] };
    const found = findItem(payload, sectionId, groupId, itemId);
    if (!found) {
      showErrorModal({ message: "Issue not found in report." });
      setStatus("Issue not found.");
      return;
    }
    draft = cloneItem(found);
    fillForm();
    fieldsReady = true;
    setFieldsEnabled(true);
    setStatus("Ready.");
    nombreInput.focus();
    if (mustLog) {
      console.log("[ereport-issue-card] open", {
        orgId: Boolean(orgId),
        reportId: Boolean(reportId),
        itemId,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not load issue.";
    showErrorModal({ message: msg });
    setStatus("Could not load issue.");
  }
}
