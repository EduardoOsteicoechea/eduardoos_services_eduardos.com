import { apiSend, deleteJSON, patchJSON, postJSON, uploadFile } from "./api";
import { DEFAULT_CURRICULUM_STUDENT_KEY } from "./eoschool-curriculum-api";
import type { CurriculumPlanSectionId } from "./eoschool-curriculum-plan-classes";
import { showErrorModal } from "./error-modal";
import { mustLog } from "./dev-log";

export type CurriculumMaterialRole = "teacher_guide" | "child" | "proof";
export type CurriculumMaterialKind = "image" | "audio" | "document" | "url";

export type CurriculumMaterialExtractionBlock = {
  kind: string;
  label?: string;
  text: string;
  illegible?: boolean;
};

export type CurriculumMaterialExtraction = {
  status: "none" | "ready" | "failed" | string;
  sourceKind?: "document" | "image" | "audio" | string;
  rawText?: string;
  cleanText?: string;
  blocks?: CurriculumMaterialExtractionBlock[];
  provider?: string;
  model?: string;
  message?: string;
  extractedAt?: string;
};

export type CurriculumMaterial = {
  id: string;
  ownerUserId: string;
  studentKey: string;
  dayId: string;
  sectionId: string;
  role: CurriculumMaterialRole;
  kind: CurriculumMaterialKind;
  title?: string;
  description?: string;
  url?: string;
  storageName?: string;
  thumbName?: string;
  contentType?: string;
  bytes?: number;
  originalName?: string;
  extraction?: CurriculumMaterialExtraction | null;
  fileUrl?: string;
  thumbUrl?: string;
  createdAt: string;
  updatedAt: string;
};

const MATERIALS_PATH = "/eoschool/curriculum/materials";
const MATERIALS_URL_PATH = "/eoschool/curriculum/materials/url";
export const MAX_MATERIALS_PER_ROLE = 4;

const ROLE_LABELS: Record<CurriculumMaterialRole, string> = {
  teacher_guide: "Guía docente",
  child: "Para el niño",
  proof: "Prueba de actividad",
};

const ROLES: CurriculumMaterialRole[] = ["teacher_guide", "child", "proof"];

const FILE_ACCEPT =
  "image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm,.pdf,.odt,.docx,.txt,text/plain,application/pdf";

function isExtractableKind(kind: CurriculumMaterialKind): boolean {
  return kind === "image" || kind === "audio" || kind === "document";
}

function errFromApi(message: string, requestId?: string): Error & { requestId?: string } {
  const err = new Error(message) as Error & { requestId?: string };
  err.requestId = requestId;
  return err;
}

export async function fetchCurriculumMaterials(opts: {
  studentKey: string;
  dayId: string;
  sectionId: string;
}): Promise<CurriculumMaterial[]> {
  const q = new URLSearchParams({
    studentKey: opts.studentKey,
    dayId: opts.dayId,
    sectionId: opts.sectionId,
  });
  const { status, data, requestId } = await apiSend<{ materials: CurriculumMaterial[] }>(
    `${MATERIALS_PATH}?${q}`,
    { method: "GET" },
  );
  if (status === 401 || status === 403) {
    return [];
  }
  if (status < 200 || status >= 300) {
    throw errFromApi(data.message || "No se pudieron cargar los materiales.", requestId);
  }
  return data.materials ?? [];
}

export async function uploadCurriculumMaterial(opts: {
  file: File;
  studentKey: string;
  dayId: string;
  sectionId: string;
  role: CurriculumMaterialRole;
  title?: string;
  description?: string;
}): Promise<CurriculumMaterial> {
  const fields: Record<string, string> = {
    studentKey: opts.studentKey,
    dayId: opts.dayId,
    sectionId: opts.sectionId,
    role: opts.role,
  };
  if (opts.title?.trim()) fields.title = opts.title.trim();
  if (opts.description?.trim()) fields.description = opts.description.trim();
  const { status, data, requestId } = await uploadFile<{ material: CurriculumMaterial }>(
    MATERIALS_PATH,
    opts.file,
    "file",
    fields,
  );
  if (status === 409) {
    throw errFromApi(data.message || "Máximo 4 materiales por actividad.", requestId);
  }
  if (status < 200 || status >= 300) {
    throw errFromApi(data.message || "No se pudo subir el archivo.", requestId);
  }
  return data.material;
}

export async function addCurriculumMaterialURL(opts: {
  studentKey: string;
  dayId: string;
  sectionId: string;
  role: CurriculumMaterialRole;
  url: string;
  title?: string;
  description?: string;
}): Promise<CurriculumMaterial> {
  const { status, data, requestId } = await apiSend<{ material: CurriculumMaterial }>(MATERIALS_URL_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (status === 409) {
    throw errFromApi(data.message || "Máximo 4 materiales por actividad.", requestId);
  }
  if (status < 200 || status >= 300) {
    throw errFromApi(data.message || "No se pudo guardar la URL.", requestId);
  }
  return data.material;
}

export async function patchCurriculumMaterial(
  id: string,
  opts: { title: string; description: string },
): Promise<CurriculumMaterial> {
  const { status, data, requestId } = await patchJSON<{ material: CurriculumMaterial }>(
    `${MATERIALS_PATH}/${id}`,
    opts,
  );
  if (status < 200 || status >= 300) {
    throw errFromApi(data.message || "No se pudo guardar el material.", requestId);
  }
  return data.material;
}

export async function deleteCurriculumMaterial(id: string): Promise<void> {
  const { status, data, requestId } = await deleteJSON<{ ok?: boolean }>(`${MATERIALS_PATH}/${id}`);
  if (status < 200 || status >= 300) {
    throw errFromApi(data.message || "No se pudo eliminar el material.", requestId);
  }
}

export async function extractCurriculumMaterial(id: string): Promise<CurriculumMaterial> {
  const { status, data, requestId } = await postJSON<{ material: CurriculumMaterial }>(
    `${MATERIALS_PATH}/${id}/extract`,
    {},
    { timeoutMs: 120000 },
  );
  if (status < 200 || status >= 300) {
    throw errFromApi(data.message || "No se pudo extraer el texto.", requestId);
  }
  return data.material;
}

export function extractionDisplayText(
  extraction: CurriculumMaterialExtraction | null | undefined,
): string {
  if (!extraction) return "";
  const clean = extraction.cleanText?.trim();
  if (clean) return clean;
  return extraction.rawText?.trim() || "";
}

function ensureExtractionModal(): HTMLElement {
  let overlay = document.getElementById("eoschool-material-extract-modal");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "eoschool-material-extract-modal";
  overlay.className = "eoschool-material-extract-modal";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "eoschool-material-extract-title");

  const dialog = document.createElement("div");
  dialog.className = "eoschool-material-extract-modal__dialog";

  const top = document.createElement("header");
  top.className = "eoschool-material-extract-modal__top";
  const title = document.createElement("h2");
  title.id = "eoschool-material-extract-title";
  title.className = "eoschool-material-extract-modal__title";
  title.dataset.extractTitle = "";
  title.textContent = "Texto extraído";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "icon-btn eoschool-material-extract-modal__close";
  close.dataset.extractClose = "";
  close.setAttribute("aria-label", "Cerrar");
  close.innerHTML =
    '<span class="material-symbols-outlined" aria-hidden="true">close</span>';
  top.append(title, close);

  const body = document.createElement("div");
  body.className = "eoschool-material-extract-modal__body";
  const text = document.createElement("pre");
  text.className = "eoschool-material-extract-modal__text";
  text.dataset.extractText = "";
  const json = document.createElement("pre");
  json.className = "eoschool-material-extract-modal__json";
  json.dataset.extractJson = "";
  json.hidden = true;
  body.append(text, json);

  const actions = document.createElement("div");
  actions.className = "eoschool-material-extract-modal__actions";
  const toggleJson = document.createElement("button");
  toggleJson.type = "button";
  toggleJson.className = "eoschool-material-extract-modal__toggle-json";
  toggleJson.dataset.extractToggleJson = "";
  toggleJson.textContent = "Ver JSON";
  const reextract = document.createElement("button");
  reextract.type = "button";
  reextract.className = "eoschool-material-extract-modal__reextract";
  reextract.dataset.extractReextract = "";
  reextract.textContent = "Re-extraer";
  actions.append(toggleJson, reextract);

  dialog.append(top, body, actions);
  overlay.append(dialog);
  document.body.append(overlay);

  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) closeExtractionModal();
  });
  close.addEventListener("click", () => closeExtractionModal());
  toggleJson.addEventListener("click", () => {
    const jsonEl = overlay?.querySelector<HTMLElement>("[data-extract-json]");
    if (!jsonEl) return;
    jsonEl.hidden = !jsonEl.hidden;
    toggleJson.textContent = jsonEl.hidden ? "Ver JSON" : "Ocultar JSON";
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && overlay && !overlay.hidden) {
      closeExtractionModal();
    }
  });
  return overlay;
}

let extractModalMaterialId = "";
let extractModalOnReextract: ((id: string) => void) | null = null;

export function openExtractionModal(
  material: CurriculumMaterial,
  opts?: { onReextract?: (id: string) => void },
): void {
  const overlay = ensureExtractionModal();
  extractModalMaterialId = material.id;
  extractModalOnReextract = opts?.onReextract ?? null;
  const title = overlay.querySelector<HTMLElement>("[data-extract-title]");
  const text = overlay.querySelector<HTMLElement>("[data-extract-text]");
  const json = overlay.querySelector<HTMLElement>("[data-extract-json]");
  const reextract = overlay.querySelector<HTMLButtonElement>("[data-extract-reextract]");
  if (title) title.textContent = itemLabel(material);
  const extraction = material.extraction;
  if (text) {
    if (extraction?.status === "failed") {
      text.textContent = extraction.message?.trim() || "No se pudo extraer el texto.";
    } else {
      text.textContent = extractionDisplayText(extraction) || "Sin texto extraído.";
    }
  }
  if (json) {
    json.hidden = true;
    json.textContent = extraction ? JSON.stringify(extraction, null, 2) : "";
  }
  const toggle = overlay.querySelector<HTMLButtonElement>("[data-extract-toggle-json]");
  if (toggle) toggle.textContent = "Ver JSON";
  if (reextract) {
    reextract.onclick = () => {
      if (extractModalMaterialId && extractModalOnReextract) {
        extractModalOnReextract(extractModalMaterialId);
      }
    };
  }
  overlay.hidden = false;
}

export function closeExtractionModal(): void {
  const overlay = document.getElementById("eoschool-material-extract-modal");
  if (overlay) overlay.hidden = true;
  extractModalMaterialId = "";
}

function resolveStudentKey(root: HTMLElement | null): string {
  const fromRoot = root?.dataset.curriculumStudentKey?.trim();
  if (fromRoot) return fromRoot;
  return DEFAULT_CURRICULUM_STUDENT_KEY;
}

function canEditMaterials(root: HTMLElement | null): boolean {
  return root?.dataset.curriculumPersist === "remote";
}

function itemLabel(m: CurriculumMaterial): string {
  if (m.title?.trim()) return m.title.trim();
  if (m.kind === "url") return m.url || "Enlace";
  return m.originalName || m.storageName || m.id;
}

function showRequestError(err: unknown, fallback: string): void {
  const requestId =
    err && typeof err === "object" && "requestId" in err
      ? String((err as { requestId?: string }).requestId || "")
      : "";
  showErrorModal({
    message: err instanceof Error ? err.message : fallback,
    requestId: requestId || undefined,
  });
}

function readGroupMeta(group: Element | null): { title: string; description: string } {
  const title =
    group?.querySelector<HTMLInputElement>("[data-material-new-title]")?.value.trim() ?? "";
  const description =
    group?.querySelector<HTMLTextAreaElement>("[data-material-new-description]")?.value.trim() ?? "";
  return { title, description };
}

function clearGroupMeta(group: Element | null): void {
  const title = group?.querySelector<HTMLInputElement>("[data-material-new-title]");
  const description = group?.querySelector<HTMLTextAreaElement>("[data-material-new-description]");
  if (title) title.value = "";
  if (description) description.value = "";
}

function renderMaterialItem(m: CurriculumMaterial, editable: boolean): HTMLElement {
  const li = document.createElement("li");
  li.className = "eoschool-curriculum-materials__item";
  li.dataset.materialId = m.id;

  if (m.kind === "image" && (m.thumbUrl || m.fileUrl)) {
    const img = document.createElement("img");
    img.className = "eoschool-curriculum-materials__thumb";
    img.src = m.thumbUrl || m.fileUrl || "";
    img.alt = itemLabel(m);
    img.loading = "lazy";
    li.append(img);
  }

  const meta = document.createElement("div");
  meta.className = "eoschool-curriculum-materials__meta";

  const nameEl = document.createElement("p");
  nameEl.className = "eoschool-curriculum-materials__name";
  if (m.kind === "url" && m.url) {
    const a = document.createElement("a");
    a.className = "eoschool-curriculum-materials__link";
    a.href = m.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = itemLabel(m);
    nameEl.append(a);
  } else if (m.fileUrl) {
    const a = document.createElement("a");
    a.className = "eoschool-curriculum-materials__link";
    a.href = m.fileUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = itemLabel(m);
    nameEl.append(a);
  } else {
    nameEl.textContent = itemLabel(m);
  }
  meta.append(nameEl);

  if (m.description?.trim()) {
    const desc = document.createElement("p");
    desc.className = "eoschool-curriculum-materials__desc";
    desc.textContent = m.description.trim();
    meta.append(desc);
  }

  const kind = document.createElement("span");
  kind.className = "eoschool-curriculum-materials__kind";
  kind.textContent = m.kind;
  meta.append(kind);
  li.append(meta);

  if (editable) {
    const actions = document.createElement("div");
    actions.className = "eoschool-curriculum-materials__item-actions";

    if (isExtractableKind(m.kind)) {
      const extract = document.createElement("button");
      extract.type = "button";
      extract.className = "eoschool-curriculum-materials__extract icon-btn";
      extract.dataset.materialExtract = m.id;
      const ready = m.extraction?.status === "ready";
      const failed = m.extraction?.status === "failed";
      extract.title = ready
        ? "Ver texto extraído"
        : failed
          ? "Reintentar extracción de texto"
          : "Extraer texto";
      extract.setAttribute(
        "aria-label",
        ready
          ? `Ver texto de ${itemLabel(m)}`
          : failed
            ? `Reintentar extracción de ${itemLabel(m)}`
            : `Extraer texto de ${itemLabel(m)}`,
      );
      const icon = document.createElement("span");
      icon.className = "material-symbols-outlined";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = ready ? "description" : failed ? "refresh" : "article";
      extract.append(icon);
      if (ready) extract.dataset.extractReady = "true";
      if (failed) extract.dataset.extractFailed = "true";
      actions.append(extract);
    }

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "eoschool-curriculum-materials__edit";
    edit.dataset.materialEdit = m.id;
    edit.textContent = "Editar";
    actions.append(edit);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "eoschool-curriculum-materials__delete";
    del.dataset.materialDelete = m.id;
    del.setAttribute("aria-label", `Eliminar ${itemLabel(m)}`);
    del.textContent = "Eliminar";
    actions.append(del);

    li.append(actions);

    const form = document.createElement("div");
    form.className = "eoschool-curriculum-materials__edit-form";
    form.dataset.materialEditForm = m.id;
    form.hidden = true;

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "eoschool-curriculum-materials__title";
    titleInput.dataset.materialEditTitle = m.id;
    titleInput.value = m.title?.trim() || itemLabel(m);
    titleInput.placeholder = "Nombre";
    titleInput.maxLength = 200;
    titleInput.setAttribute("aria-label", "Nombre del material");

    const descInput = document.createElement("textarea");
    descInput.className = "eoschool-curriculum-materials__description";
    descInput.dataset.materialEditDescription = m.id;
    descInput.value = m.description?.trim() || "";
    descInput.placeholder = "Descripción";
    descInput.maxLength = 1000;
    descInput.rows = 2;
    descInput.setAttribute("aria-label", "Descripción del material");

    const save = document.createElement("button");
    save.type = "button";
    save.className = "eoschool-curriculum-materials__save";
    save.dataset.materialSave = m.id;
    save.textContent = "Guardar";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "eoschool-curriculum-materials__cancel";
    cancel.dataset.materialEditCancel = m.id;
    cancel.textContent = "Cancelar";

    const formActions = document.createElement("div");
    formActions.className = "eoschool-curriculum-materials__url-row";
    formActions.append(save, cancel);

    form.append(titleInput, descInput, formActions);
    li.append(form);
  }

  return li;
}

function renderRoleGroup(
  role: CurriculumMaterialRole,
  items: CurriculumMaterial[],
  editable: boolean,
): HTMLElement {
  const section = document.createElement("section");
  section.className = "eoschool-curriculum-materials__group";
  section.dataset.materialRole = role;

  const forRole = items.filter((m) => m.role === role);
  const atCap = forRole.length >= MAX_MATERIALS_PER_ROLE;

  const title = document.createElement("h4");
  title.className = "eoschool-curriculum-materials__group-title";
  title.textContent = `${ROLE_LABELS[role]} (${forRole.length}/${MAX_MATERIALS_PER_ROLE})`;
  section.append(title);

  const list = document.createElement("ul");
  list.className = "eoschool-curriculum-materials__list";
  list.dataset.materialList = role;
  if (!forRole.length) {
    const empty = document.createElement("li");
    empty.className = "eoschool-curriculum-materials__empty";
    empty.textContent = "Sin materiales aún.";
    list.append(empty);
  } else {
    for (const m of forRole) list.append(renderMaterialItem(m, editable));
  }
  section.append(list);

  if (editable) {
    const actions = document.createElement("div");
    actions.className = "eoschool-curriculum-materials__actions";

    if (atCap) {
      const note = document.createElement("p");
      note.className = "eoschool-curriculum-materials__status";
      note.textContent = "Máximo 4 ítems en esta actividad.";
      actions.append(note);
    } else {
      const titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.className = "eoschool-curriculum-materials__title";
      titleInput.dataset.materialNewTitle = role;
      titleInput.placeholder = "Nombre";
      titleInput.maxLength = 200;
      titleInput.setAttribute("aria-label", `Nombre para ${ROLE_LABELS[role]}`);

      const descInput = document.createElement("textarea");
      descInput.className = "eoschool-curriculum-materials__description";
      descInput.dataset.materialNewDescription = role;
      descInput.placeholder = "Descripción";
      descInput.maxLength = 1000;
      descInput.rows = 2;
      descInput.setAttribute("aria-label", `Descripción para ${ROLE_LABELS[role]}`);

      actions.append(titleInput, descInput);

      const fileLabel = document.createElement("label");
      fileLabel.className = "eoschool-curriculum-materials__file-label";
      fileLabel.textContent = "Subir archivo";
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = FILE_ACCEPT;
      fileInput.dataset.materialFile = role;
      fileInput.className = "eoschool-curriculum-materials__file";
      fileLabel.append(fileInput);
      actions.append(fileLabel);

      const urlRow = document.createElement("div");
      urlRow.className = "eoschool-curriculum-materials__url-row";
      const urlInput = document.createElement("input");
      urlInput.type = "url";
      urlInput.placeholder = "https://…";
      urlInput.dataset.materialUrl = role;
      urlInput.className = "eoschool-curriculum-materials__url";
      urlInput.setAttribute("aria-label", `URL para ${ROLE_LABELS[role]}`);
      const urlBtn = document.createElement("button");
      urlBtn.type = "button";
      urlBtn.className = "eoschool-curriculum-materials__url-add";
      urlBtn.dataset.materialUrlAdd = role;
      urlBtn.textContent = "Añadir URL";
      urlRow.append(urlInput, urlBtn);
      actions.append(urlRow);
    }

    section.append(actions);
  }

  return section;
}

export function ensureMaterialsPanel(modal: HTMLElement): HTMLElement {
  let panel = modal.querySelector<HTMLElement>("[data-curriculum-materials]");
  if (panel) return panel;
  panel = document.createElement("section");
  panel.className = "eoschool-curriculum-materials";
  panel.setAttribute("aria-label", "Materiales de la asignatura");
  panel.dataset.curriculumMaterials = "";

  const heading = document.createElement("h3");
  heading.className = "eoschool-curriculum-modal__panel-title";
  heading.textContent = "Materiales de la asignatura";
  panel.append(heading);

  const body = document.createElement("div");
  body.className = "eoschool-curriculum-materials__body";
  body.dataset.curriculumMaterialsBody = "";
  panel.append(body);

  const contentPanel = modal.querySelector(
    ".eoschool-curriculum-modal__panel:not(.eoschool-curriculum-modal__panel--pdf)",
  );
  if (contentPanel) {
    contentPanel.append(panel);
  } else {
    modal.querySelector(".eoschool-curriculum-modal__body")?.append(panel);
  }
  return panel;
}

type MaterialsContext = {
  dayId: string;
  sectionId: CurriculumPlanSectionId;
  studentKey: string;
  editable: boolean;
};

let activeCtx: MaterialsContext | null = null;
let loadSeq = 0;

export async function loadCurriculumMaterialsPanel(
  modal: HTMLElement,
  root: HTMLElement | null,
  dayId: string,
  sectionId: CurriculumPlanSectionId,
): Promise<void> {
  const panel = ensureMaterialsPanel(modal);
  const body = panel.querySelector<HTMLElement>("[data-curriculum-materials-body]");
  if (!body) return;

  const studentKey = resolveStudentKey(root);
  const editable = canEditMaterials(root);
  activeCtx = { dayId, sectionId, studentKey, editable };
  const seq = ++loadSeq;

  body.replaceChildren();
  const loading = document.createElement("p");
  loading.className = "eoschool-curriculum-materials__status";
  loading.textContent = editable
    ? "Cargando materiales…"
    : "Inicia sesión con Homescool para gestionar materiales.";
  body.append(loading);

  if (!editable) {
    if (mustLog) console.log("[curriculum.materials] guest_skip", { dayId, sectionId });
    return;
  }

  try {
    const items = await fetchCurriculumMaterials({ studentKey, dayId, sectionId });
    if (seq !== loadSeq) return;
    body.replaceChildren();
    for (const role of ROLES) {
      body.append(renderRoleGroup(role, items, editable));
    }
    if (mustLog) console.log("[curriculum.materials] loaded", { dayId, sectionId, count: items.length });
  } catch (err) {
    if (seq !== loadSeq) return;
    body.replaceChildren();
    const status = document.createElement("p");
    status.className = "eoschool-curriculum-materials__status";
    status.textContent = err instanceof Error ? err.message : "No se pudieron cargar los materiales.";
    body.append(status);
    showRequestError(err, "No se pudieron cargar los materiales.");
  }
}

async function refreshActivePanel(modal: HTMLElement, root: HTMLElement | null): Promise<void> {
  if (!activeCtx) return;
  await loadCurriculumMaterialsPanel(modal, root, activeCtx.dayId, activeCtx.sectionId);
}

async function runMaterialExtract(
  modal: HTMLElement,
  root: HTMLElement | null,
  id: string,
  openAfter: boolean,
): Promise<void> {
  try {
    const material = await extractCurriculumMaterial(id);
    await refreshActivePanel(modal, root);
    if (openAfter || material.extraction?.status === "ready" || material.extraction?.status === "failed") {
      openExtractionModal(material, {
        onReextract: (mid) => {
          void runMaterialExtract(modal, root, mid, true);
        },
      });
    }
  } catch (err) {
    showRequestError(err, "No se pudo extraer el texto.");
  }
}

export function bindCurriculumMaterialsPanel(modal: HTMLElement, root: HTMLElement | null): void {
  if (modal.dataset.curriculumMaterialsBound === "true") return;
  modal.dataset.curriculumMaterialsBound = "true";
  ensureMaterialsPanel(modal);

  modal.addEventListener("change", async (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-material-file]")) return;
    const role = target.dataset.materialFile as CurriculumMaterialRole | undefined;
    const file = target.files?.[0];
    target.value = "";
    if (!role || !file || !activeCtx) return;
    const group = target.closest("[data-material-role]");
    const meta = readGroupMeta(group);
    try {
      await uploadCurriculumMaterial({
        file,
        studentKey: activeCtx.studentKey,
        dayId: activeCtx.dayId,
        sectionId: activeCtx.sectionId,
        role,
        title: meta.title,
        description: meta.description,
      });
      clearGroupMeta(group);
      await refreshActivePanel(modal, root);
    } catch (err) {
      showRequestError(err, "No se pudo subir el archivo.");
    }
  });

  modal.addEventListener("click", async (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLElement)) return;

    const extractBtn = target.closest<HTMLButtonElement>("[data-material-extract]");
    if (extractBtn) {
      const id = extractBtn.dataset.materialExtract;
      if (!id || !activeCtx) return;
      const ready = extractBtn.dataset.extractReady === "true";
      if (ready) {
        try {
          const items = await fetchCurriculumMaterials({
            studentKey: activeCtx.studentKey,
            dayId: activeCtx.dayId,
            sectionId: activeCtx.sectionId,
          });
          const material = items.find((m) => m.id === id);
          if (material) {
            openExtractionModal(material, {
              onReextract: (mid) => {
                void runMaterialExtract(modal, root, mid, true);
              },
            });
          }
        } catch (err) {
          showRequestError(err, "No se pudo cargar el texto.");
        }
        return;
      }
      extractBtn.disabled = true;
      try {
        await runMaterialExtract(modal, root, id, true);
      } finally {
        extractBtn.disabled = false;
      }
      return;
    }

    const editBtn = target.closest<HTMLButtonElement>("[data-material-edit]");
    if (editBtn) {
      const id = editBtn.dataset.materialEdit;
      if (!id) return;
      const form = modal.querySelector<HTMLElement>(`[data-material-edit-form="${id}"]`);
      if (form) form.hidden = !form.hidden;
      return;
    }

    const cancelBtn = target.closest<HTMLButtonElement>("[data-material-edit-cancel]");
    if (cancelBtn) {
      const id = cancelBtn.dataset.materialEditCancel;
      if (!id) return;
      const form = modal.querySelector<HTMLElement>(`[data-material-edit-form="${id}"]`);
      if (form) form.hidden = true;
      return;
    }

    const saveBtn = target.closest<HTMLButtonElement>("[data-material-save]");
    if (saveBtn) {
      const id = saveBtn.dataset.materialSave;
      if (!id) return;
      const title =
        modal.querySelector<HTMLInputElement>(`[data-material-edit-title="${id}"]`)?.value.trim() ??
        "";
      const description =
        modal
          .querySelector<HTMLTextAreaElement>(`[data-material-edit-description="${id}"]`)
          ?.value.trim() ?? "";
      try {
        await patchCurriculumMaterial(id, { title, description });
        await refreshActivePanel(modal, root);
      } catch (err) {
        showRequestError(err, "No se pudo guardar el material.");
      }
      return;
    }

    const urlAdd = target.closest<HTMLButtonElement>("[data-material-url-add]");
    if (urlAdd) {
      const role = urlAdd.dataset.materialUrlAdd as CurriculumMaterialRole | undefined;
      if (!role || !activeCtx) return;
      const group = urlAdd.closest("[data-material-role]");
      const urlInput = group?.querySelector<HTMLInputElement>("[data-material-url]");
      const url = urlInput?.value.trim() ?? "";
      if (!url) {
        showErrorModal({ message: "Escribe una URL https." });
        return;
      }
      const meta = readGroupMeta(group);
      try {
        await addCurriculumMaterialURL({
          studentKey: activeCtx.studentKey,
          dayId: activeCtx.dayId,
          sectionId: activeCtx.sectionId,
          role,
          url,
          title: meta.title,
          description: meta.description,
        });
        if (urlInput) urlInput.value = "";
        clearGroupMeta(group);
        await refreshActivePanel(modal, root);
      } catch (err) {
        showRequestError(err, "No se pudo guardar la URL.");
      }
      return;
    }

    const delBtn = target.closest<HTMLButtonElement>("[data-material-delete]");
    if (delBtn) {
      const id = delBtn.dataset.materialDelete;
      if (!id) return;
      try {
        await deleteCurriculumMaterial(id);
        await refreshActivePanel(modal, root);
      } catch (err) {
        showRequestError(err, "No se pudo eliminar el material.");
      }
    }
  });
}
