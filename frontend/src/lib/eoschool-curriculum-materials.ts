import { apiSend, deleteJSON, patchJSON, uploadFile } from "./api";
import { DEFAULT_CURRICULUM_STUDENT_KEY } from "./eoschool-curriculum-api";
import type { CurriculumPlanSectionId } from "./eoschool-curriculum-plan-classes";
import { showErrorModal } from "./error-modal";
import { mustLog } from "./dev-log";

export type CurriculumMaterialRole = "teacher_guide" | "child" | "proof";
export type CurriculumMaterialKind = "image" | "audio" | "document" | "url";

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
  "image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm,.pdf,.odt,.docx,application/pdf";

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
