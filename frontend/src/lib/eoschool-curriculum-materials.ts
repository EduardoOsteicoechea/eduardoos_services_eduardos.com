import { apiSend, deleteJSON, uploadFile } from "./api";
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

const ROLE_LABELS: Record<CurriculumMaterialRole, string> = {
  teacher_guide: "Guía docente",
  child: "Para el niño",
  proof: "Prueba de actividad",
};

const ROLES: CurriculumMaterialRole[] = ["teacher_guide", "child", "proof"];

const FILE_ACCEPT =
  "image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm,.pdf,.odt,.docx,application/pdf";

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
    const err = new Error(data.message || "No se pudieron cargar los materiales.") as Error & {
      requestId?: string;
    };
    err.requestId = requestId;
    throw err;
  }
  return data.materials ?? [];
}

export async function uploadCurriculumMaterial(opts: {
  file: File;
  studentKey: string;
  dayId: string;
  sectionId: string;
  role: CurriculumMaterialRole;
}): Promise<CurriculumMaterial> {
  const { status, data, requestId } = await uploadFile<{ material: CurriculumMaterial }>(
    MATERIALS_PATH,
    opts.file,
    "file",
    {
      studentKey: opts.studentKey,
      dayId: opts.dayId,
      sectionId: opts.sectionId,
      role: opts.role,
    },
  );
  if (status < 200 || status >= 300) {
    const err = new Error(data.message || "No se pudo subir el archivo.") as Error & {
      requestId?: string;
    };
    err.requestId = requestId;
    throw err;
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
}): Promise<CurriculumMaterial> {
  const { status, data, requestId } = await apiSend<{ material: CurriculumMaterial }>(MATERIALS_URL_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (status < 200 || status >= 300) {
    const err = new Error(data.message || "No se pudo guardar la URL.") as Error & {
      requestId?: string;
    };
    err.requestId = requestId;
    throw err;
  }
  return data.material;
}

export async function deleteCurriculumMaterial(id: string): Promise<void> {
  const { status, data, requestId } = await deleteJSON<{ ok?: boolean }>(`${MATERIALS_PATH}/${id}`);
  if (status < 200 || status >= 300) {
    const err = new Error(data.message || "No se pudo eliminar el material.") as Error & {
      requestId?: string;
    };
    err.requestId = requestId;
    throw err;
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

  if (m.kind === "url" && m.url) {
    const a = document.createElement("a");
    a.className = "eoschool-curriculum-materials__link";
    a.href = m.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = itemLabel(m);
    meta.append(a);
  } else if (m.fileUrl) {
    const a = document.createElement("a");
    a.className = "eoschool-curriculum-materials__link";
    a.href = m.fileUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = itemLabel(m);
    meta.append(a);
  } else {
    const span = document.createElement("span");
    span.textContent = itemLabel(m);
    meta.append(span);
  }

  const kind = document.createElement("span");
  kind.className = "eoschool-curriculum-materials__kind";
  kind.textContent = m.kind;
  meta.append(kind);
  li.append(meta);

  if (editable) {
    const del = document.createElement("button");
    del.type = "button";
    del.className = "eoschool-curriculum-materials__delete";
    del.dataset.materialDelete = m.id;
    del.setAttribute("aria-label", `Eliminar ${itemLabel(m)}`);
    del.textContent = "Eliminar";
    li.append(del);
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

  const title = document.createElement("h4");
  title.className = "eoschool-curriculum-materials__group-title";
  title.textContent = ROLE_LABELS[role];
  section.append(title);

  const list = document.createElement("ul");
  list.className = "eoschool-curriculum-materials__list";
  list.dataset.materialList = role;
  const forRole = items.filter((m) => m.role === role);
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

  const contentPanel = modal.querySelector(".eoschool-curriculum-modal__panel:not(.eoschool-curriculum-modal__panel--pdf)");
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
  loading.textContent = editable ? "Cargando materiales…" : "Inicia sesión con Homescool para gestionar materiales.";
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
    const requestId =
      err && typeof err === "object" && "requestId" in err
        ? String((err as { requestId?: string }).requestId || "")
        : "";
    showErrorModal({
      message: err instanceof Error ? err.message : "No se pudieron cargar los materiales.",
      requestId: requestId || undefined,
    });
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
    try {
      await uploadCurriculumMaterial({
        file,
        studentKey: activeCtx.studentKey,
        dayId: activeCtx.dayId,
        sectionId: activeCtx.sectionId,
        role,
      });
      await refreshActivePanel(modal, root);
    } catch (err) {
      const requestId =
        err && typeof err === "object" && "requestId" in err
          ? String((err as { requestId?: string }).requestId || "")
          : "";
      showErrorModal({
        message: err instanceof Error ? err.message : "No se pudo subir el archivo.",
        requestId: requestId || undefined,
      });
    }
  });

  modal.addEventListener("click", async (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLElement)) return;

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
      try {
        await addCurriculumMaterialURL({
          studentKey: activeCtx.studentKey,
          dayId: activeCtx.dayId,
          sectionId: activeCtx.sectionId,
          role,
          url,
        });
        if (urlInput) urlInput.value = "";
        await refreshActivePanel(modal, root);
      } catch (err) {
        const requestId =
          err && typeof err === "object" && "requestId" in err
            ? String((err as { requestId?: string }).requestId || "")
            : "";
        showErrorModal({
          message: err instanceof Error ? err.message : "No se pudo guardar la URL.",
          requestId: requestId || undefined,
        });
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
        const requestId =
          err && typeof err === "object" && "requestId" in err
            ? String((err as { requestId?: string }).requestId || "")
            : "";
        showErrorModal({
          message: err instanceof Error ? err.message : "No se pudo eliminar el material.",
          requestId: requestId || undefined,
        });
      }
    }
  });
}
