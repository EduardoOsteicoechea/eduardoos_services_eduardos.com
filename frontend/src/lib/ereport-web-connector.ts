import { mustLog } from "./dev-log";
import { showErrorModal } from "./error-modal";

const INIT_TYPE = "ereport-embed-init";
const READY_TYPE = "ereport-embed-ready";

type OrgCard = { id: string; name: string };
type ReportCard = { id: string; tema: string; reportNumber?: string };
type ChecklistRow = { id?: string; label?: string; checked?: boolean };
type ItemNode = {
  id: string;
  nombre?: string;
  incidencia?: string;
  fechaIncidencia?: string;
  status?: string;
  solucion?: string;
  fechaSolucion?: string;
  checklist?: ChecklistRow[];
};
type GroupNode = {
  id: string;
  title?: string;
  productHistory?: string;
  items?: ItemNode[];
};
type SectionNode = {
  id: string;
  title?: string;
  kind?: string;
  productHistory?: string;
  groups?: GroupNode[];
};
type ReportPayload = {
  sections?: SectionNode[];
};

type ApiErrorBody = {
  error?: string;
  message?: string;
  request_id?: string;
  hint?: string;
};

function el<T extends HTMLElement>(root: ParentNode, sel: string): T | null {
  return root.querySelector(sel) as T | null;
}

function fillSelect(select: HTMLSelectElement, options: { value: string; label: string }[], placeholder: string) {
  select.replaceChildren();
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = placeholder;
  select.append(ph);
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    select.append(o);
  }
  select.value = "";
}

async function apiFetch(
  apiKey: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; requestId: string; data: Record<string, unknown> }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };
  let payload: string | undefined;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  if (mustLog) console.log("[ereport-web-connector] fetch", { method, path });
  const res = await fetch(path, { method, headers, body: payload, credentials: "omit" });
  const requestId = res.headers.get("X-Request-ID") || "";
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  if (mustLog) console.log("[ereport-web-connector] response", { method, path, status: res.status, requestId });
  return { status: res.status, requestId, data };
}

function raiseApiError(status: number, requestId: string, data: Record<string, unknown>) {
  const err = data as ApiErrorBody;
  showErrorModal({
    message: err.message || "Request failed.",
    requestId: err.request_id || requestId,
    details: err.hint || err.error || `HTTP ${status}`,
  });
}

export function startEreportWebConnector(root: HTMLElement) {
  let apiKey = "";
  let payload: ReportPayload | null = null;

  const statusEl = el<HTMLElement>(root, "[data-wc-status]");
  const keyPanel = el<HTMLElement>(root, "[data-wc-key-panel]");
  const keyInput = el<HTMLInputElement>(root, "[data-wc-key]");
  const keyApply = el<HTMLButtonElement>(root, "[data-wc-key-apply]");
  const cascade = el<HTMLElement>(root, "[data-wc-cascade]");

  const orgSelect = el<HTMLSelectElement>(root, "[data-wc-org]")!;
  const reportSelect = el<HTMLSelectElement>(root, "[data-wc-report]")!;
  const sectionSelect = el<HTMLSelectElement>(root, "[data-wc-section]")!;
  const groupSelect = el<HTMLSelectElement>(root, "[data-wc-group]")!;
  const itemSelect = el<HTMLSelectElement>(root, "[data-wc-item]")!;

  const sectionCreate = el<HTMLButtonElement>(root, "[data-wc-section-create]")!;
  const groupCreate = el<HTMLButtonElement>(root, "[data-wc-group-create]")!;
  const itemCreate = el<HTMLButtonElement>(root, "[data-wc-item-create]")!;

  const sectionTitle = el<HTMLInputElement>(root, "[data-wc-section-title]")!;
  const sectionConcept = el<HTMLTextAreaElement>(root, "[data-wc-section-concept]")!;
  const sectionSave = el<HTMLButtonElement>(root, "[data-wc-section-save]")!;

  const groupTitle = el<HTMLInputElement>(root, "[data-wc-group-title]")!;
  const groupConcept = el<HTMLTextAreaElement>(root, "[data-wc-group-concept]")!;
  const groupSave = el<HTMLButtonElement>(root, "[data-wc-group-save]")!;

  const itemNombre = el<HTMLInputElement>(root, "[data-wc-item-nombre]")!;
  const itemIncidencia = el<HTMLTextAreaElement>(root, "[data-wc-item-incidencia]")!;
  const itemFechaInc = el<HTMLInputElement>(root, "[data-wc-item-fecha-inc]")!;
  const itemStatus = el<HTMLSelectElement>(root, "[data-wc-item-status]")!;
  const itemSolucion = el<HTMLTextAreaElement>(root, "[data-wc-item-solucion]")!;
  const itemFechaSol = el<HTMLInputElement>(root, "[data-wc-item-fecha-sol]")!;
  const itemSave = el<HTMLButtonElement>(root, "[data-wc-item-save]")!;

  const sectionFields = el<HTMLElement>(root, "[data-wc-section-fields]")!;
  const groupFields = el<HTMLElement>(root, "[data-wc-group-fields]")!;
  const itemFields = el<HTMLElement>(root, "[data-wc-item-fields]")!;

  function setStatus(msg: string) {
    if (statusEl) statusEl.textContent = msg;
  }

  function requireKey(): string | null {
    if (!apiKey) {
      setStatus("Waiting for API key…");
      keyPanel?.removeAttribute("hidden");
      return null;
    }
    return apiKey;
  }

  function selectedOrg(): string {
    return orgSelect.value;
  }
  function selectedReport(): string {
    return reportSelect.value;
  }
  function selectedSection(): string {
    return sectionSelect.value;
  }
  function selectedGroup(): string {
    return groupSelect.value;
  }
  function selectedItem(): string {
    return itemSelect.value;
  }

  function findSection(id: string): SectionNode | undefined {
    return payload?.sections?.find((s) => s.id === id);
  }
  function findGroup(sec: SectionNode | undefined, id: string): GroupNode | undefined {
    return sec?.groups?.find((g) => g.id === id);
  }
  function findItem(grp: GroupNode | undefined, id: string): ItemNode | undefined {
    return grp?.items?.find((it) => it.id === id);
  }

  function refreshSectionOptions() {
    const secs = payload?.sections || [];
    fillSelect(
      sectionSelect,
      secs.map((s) => ({ value: s.id, label: s.title || s.id })),
      "Select section…",
    );
    sectionFields.hidden = true;
    groupFields.hidden = true;
    itemFields.hidden = true;
    fillSelect(groupSelect, [], "Select subsection…");
    fillSelect(itemSelect, [], "Select issue…");
  }

  function refreshGroupOptions() {
    const sec = findSection(selectedSection());
    const groups = sec?.groups || [];
    fillSelect(
      groupSelect,
      groups.map((g) => ({ value: g.id, label: g.title || g.id })),
      "Select subsection…",
    );
    groupFields.hidden = true;
    itemFields.hidden = true;
    fillSelect(itemSelect, [], "Select issue…");
  }

  function refreshItemOptions() {
    const grp = findGroup(findSection(selectedSection()), selectedGroup());
    const items = grp?.items || [];
    fillSelect(
      itemSelect,
      items.map((it) => ({
        value: it.id,
        label: it.nombre || it.incidencia?.slice(0, 48) || it.id,
      })),
      "Select issue…",
    );
    itemFields.hidden = true;
  }

  function loadSectionFields() {
    const sec = findSection(selectedSection());
    if (!sec) {
      sectionFields.hidden = true;
      return;
    }
    sectionFields.hidden = false;
    sectionTitle.value = sec.title || "";
    sectionConcept.value = sec.productHistory || "";
  }

  function loadGroupFields() {
    const grp = findGroup(findSection(selectedSection()), selectedGroup());
    if (!grp) {
      groupFields.hidden = true;
      return;
    }
    groupFields.hidden = false;
    groupTitle.value = grp.title || "";
    groupConcept.value = grp.productHistory || "";
  }

  function loadItemFields() {
    const it = findItem(findGroup(findSection(selectedSection()), selectedGroup()), selectedItem());
    if (!it) {
      itemFields.hidden = true;
      return;
    }
    itemFields.hidden = false;
    itemNombre.value = it.nombre || "";
    itemIncidencia.value = it.incidencia || "";
    itemFechaInc.value = (it.fechaIncidencia || "").slice(0, 16);
    itemStatus.value = it.status || "";
    itemSolucion.value = it.solucion || "";
    itemFechaSol.value = (it.fechaSolucion || "").slice(0, 16);
  }

  async function applyKey(key: string) {
    apiKey = key.trim();
    if (!apiKey) {
      setStatus("API key required.");
      return;
    }
    keyPanel?.setAttribute("hidden", "");
    setStatus("Loading organizations…");
    cascade?.removeAttribute("hidden");
    const { status, requestId, data } = await apiFetch(apiKey, "GET", "/api/v1/ereport/orgs");
    if (status !== 200) {
      raiseApiError(status, requestId, data);
      setStatus("Could not load organizations.");
      return;
    }
    const orgs = (data.orgs as OrgCard[]) || [];
    fillSelect(
      orgSelect,
      orgs.map((o) => ({ value: o.id, label: o.name || o.id })),
      "Select organization…",
    );
    fillSelect(reportSelect, [], "Select report…");
    payload = null;
    refreshSectionOptions();
    setStatus(orgs.length ? "Select an organization." : "No organizations for this key.");
  }

  async function loadReports() {
    const key = requireKey();
    if (!key) return;
    const orgId = selectedOrg();
    if (!orgId) return;
    setStatus("Loading reports…");
    const { status, requestId, data } = await apiFetch(key, "GET", `/api/v1/ereport/orgs/${orgId}/reports`);
    if (status !== 200) {
      raiseApiError(status, requestId, data);
      setStatus("Could not load reports.");
      return;
    }
    const reports = (data.reports as ReportCard[]) || [];
    fillSelect(
      reportSelect,
      reports.map((r) => ({
        value: r.id,
        label: r.reportNumber ? `${r.tema} (${r.reportNumber})` : r.tema || r.id,
      })),
      "Select report…",
    );
    payload = null;
    refreshSectionOptions();
    setStatus(reports.length ? "Select a report." : "No reports in this organization.");
  }

  async function loadReportPayload() {
    const key = requireKey();
    if (!key) return;
    const orgId = selectedOrg();
    const reportId = selectedReport();
    if (!orgId || !reportId) return;
    setStatus("Loading report…");
    const { status, requestId, data } = await apiFetch(
      key,
      "GET",
      `/api/v1/ereport/orgs/${orgId}/reports/${reportId}`,
    );
    if (status !== 200) {
      raiseApiError(status, requestId, data);
      setStatus("Could not load report.");
      return;
    }
    payload = (data.payload as ReportPayload) || { sections: [] };
    refreshSectionOptions();
    setStatus("Select a section, or create one.");
  }

  function basePath(): string {
    return `/api/v1/ereport/orgs/${selectedOrg()}/reports/${selectedReport()}`;
  }

  async function createSection() {
    const key = requireKey();
    if (!key || !selectedOrg() || !selectedReport()) return;
    const title = window.prompt("New section title");
    if (!title || !title.trim()) return;
    setStatus("Creating section…");
    const { status, requestId, data } = await apiFetch(key, "POST", `${basePath()}/sections`, {
      title: title.trim(),
      kind: "funcionalidades",
      productHistory: "",
    });
    if (status !== 201 && status !== 200) {
      raiseApiError(status, requestId, data);
      setStatus("Could not create section.");
      return;
    }
    payload = (data.payload as ReportPayload) || payload;
    const node = data.node as SectionNode;
    refreshSectionOptions();
    if (node?.id) {
      sectionSelect.value = node.id;
      loadSectionFields();
      refreshGroupOptions();
    }
    setStatus("Section created.");
  }

  async function saveSection() {
    const key = requireKey();
    const sectionId = selectedSection();
    if (!key || !sectionId) return;
    setStatus("Saving section…");
    const { status, requestId, data } = await apiFetch(key, "PATCH", `${basePath()}/sections/${sectionId}`, {
      title: sectionTitle.value.trim(),
      productHistory: sectionConcept.value,
    });
    if (status !== 200) {
      raiseApiError(status, requestId, data);
      setStatus("Could not save section.");
      return;
    }
    payload = (data.payload as ReportPayload) || payload;
    const keep = sectionId;
    refreshSectionOptions();
    sectionSelect.value = keep;
    loadSectionFields();
    refreshGroupOptions();
    setStatus("Section saved.");
  }

  async function createGroup() {
    const key = requireKey();
    const sectionId = selectedSection();
    if (!key || !sectionId) return;
    const title = window.prompt("New subsection title");
    if (!title || !title.trim()) return;
    setStatus("Creating subsection…");
    const { status, requestId, data } = await apiFetch(
      key,
      "POST",
      `${basePath()}/sections/${sectionId}/groups`,
      { title: title.trim(), productHistory: "" },
    );
    if (status !== 201 && status !== 200) {
      raiseApiError(status, requestId, data);
      setStatus("Could not create subsection.");
      return;
    }
    payload = (data.payload as ReportPayload) || payload;
    const node = data.node as GroupNode;
    refreshGroupOptions();
    if (node?.id) {
      groupSelect.value = node.id;
      loadGroupFields();
      refreshItemOptions();
    }
    setStatus("Subsection created.");
  }

  async function saveGroup() {
    const key = requireKey();
    const sectionId = selectedSection();
    const groupId = selectedGroup();
    if (!key || !sectionId || !groupId) return;
    setStatus("Saving subsection…");
    const { status, requestId, data } = await apiFetch(
      key,
      "PATCH",
      `${basePath()}/sections/${sectionId}/groups/${groupId}`,
      { title: groupTitle.value.trim(), productHistory: groupConcept.value },
    );
    if (status !== 200) {
      raiseApiError(status, requestId, data);
      setStatus("Could not save subsection.");
      return;
    }
    payload = (data.payload as ReportPayload) || payload;
    const keep = groupId;
    refreshGroupOptions();
    groupSelect.value = keep;
    loadGroupFields();
    refreshItemOptions();
    setStatus("Subsection saved.");
  }

  async function createItem() {
    const key = requireKey();
    const sectionId = selectedSection();
    const groupId = selectedGroup();
    if (!key || !sectionId || !groupId) return;
    const incidencia = window.prompt("New issue text (incidencia)");
    if (!incidencia || !incidencia.trim()) return;
    setStatus("Creating issue…");
    const { status, requestId, data } = await apiFetch(
      key,
      "POST",
      `${basePath()}/sections/${sectionId}/groups/${groupId}/items`,
      { incidencia: incidencia.trim(), status: "reprobado", nombre: "" },
    );
    if (status !== 201 && status !== 200) {
      raiseApiError(status, requestId, data);
      setStatus("Could not create issue.");
      return;
    }
    payload = (data.payload as ReportPayload) || payload;
    const node = data.node as ItemNode;
    refreshItemOptions();
    if (node?.id) {
      itemSelect.value = node.id;
      loadItemFields();
    }
    setStatus("Issue created.");
  }

  async function saveItem() {
    const key = requireKey();
    const sectionId = selectedSection();
    const groupId = selectedGroup();
    const itemId = selectedItem();
    if (!key || !sectionId || !groupId || !itemId) return;
    setStatus("Saving issue…");
    const { status, requestId, data } = await apiFetch(
      key,
      "PATCH",
      `${basePath()}/sections/${sectionId}/groups/${groupId}/items/${itemId}`,
      {
        nombre: itemNombre.value,
        incidencia: itemIncidencia.value,
        fechaIncidencia: itemFechaInc.value,
        status: itemStatus.value,
        solucion: itemSolucion.value,
        fechaSolucion: itemFechaSol.value,
      },
    );
    if (status !== 200) {
      raiseApiError(status, requestId, data);
      setStatus("Could not save issue.");
      return;
    }
    payload = (data.payload as ReportPayload) || payload;
    const keep = itemId;
    refreshItemOptions();
    itemSelect.value = keep;
    loadItemFields();
    setStatus("Issue saved.");
  }

  orgSelect.addEventListener("change", () => {
    void loadReports();
  });
  reportSelect.addEventListener("change", () => {
    void loadReportPayload();
  });
  sectionSelect.addEventListener("change", () => {
    loadSectionFields();
    refreshGroupOptions();
  });
  groupSelect.addEventListener("change", () => {
    loadGroupFields();
    refreshItemOptions();
  });
  itemSelect.addEventListener("change", () => {
    loadItemFields();
  });
  sectionCreate.addEventListener("click", () => {
    void createSection();
  });
  groupCreate.addEventListener("click", () => {
    void createGroup();
  });
  itemCreate.addEventListener("click", () => {
    void createItem();
  });
  sectionSave.addEventListener("click", () => {
    void saveSection();
  });
  groupSave.addEventListener("click", () => {
    void saveGroup();
  });
  itemSave.addEventListener("click", () => {
    void saveItem();
  });
  keyApply?.addEventListener("click", () => {
    void applyKey(keyInput?.value || "");
  });

  window.addEventListener("message", (ev: MessageEvent) => {
    const data = ev.data;
    if (!data || typeof data !== "object") return;
    if ((data as { type?: string }).type !== INIT_TYPE) return;
    const key = String((data as { apiKey?: string }).apiKey || "").trim();
    if (!key) return;
    if (mustLog) console.log("[ereport-web-connector] received embed init");
    void applyKey(key);
  });

  // Signal ready to parent loader
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: READY_TYPE }, "*");
    }
  } catch {
    /* ignore */
  }

  setStatus("Waiting for API key from host…");
  keyPanel?.removeAttribute("hidden");
}
