import { apiRequest, getCsrf } from "./api";
import { mustLog } from "./dev-log";
import { showErrorModal } from "./error-modal";
import {
  fetchEreportAccess,
  fetchEreportOrg,
  fetchEreportOrgs,
  fetchOrgReport,
} from "./ereport";

const INIT_TYPE = "ereport-embed-init";
const READY_TYPE = "ereport-embed-ready";
const CLOSE_TYPE = "ereport-embed-close";

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

type ConnectorConfig = {
  orgId: string;
  reportId: string;
  locked: boolean;
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

function readQueryConfig(): ConnectorConfig {
  const params = new URLSearchParams(window.location.search);
  const orgId = (params.get("org") || params.get("orgId") || "").trim();
  const reportId = (params.get("report") || params.get("reportId") || "").trim();
  return { orgId, reportId, locked: Boolean(orgId && reportId) };
}

async function nodeWrite(
  method: "POST" | "PATCH",
  path: string,
  body: Record<string, unknown>,
): Promise<{ status: number; requestId: string; data: Record<string, unknown> }> {
  await getCsrf();
  const { status, data, requestId } = await apiRequest<Record<string, unknown>>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status, requestId, data: data as Record<string, unknown> };
}

function raiseApiError(status: number, requestId: string, data: Record<string, unknown>) {
  showErrorModal({
    message: String(data.message || "Request failed."),
    requestId: String(data.request_id || requestId),
    details: String(data.hint || data.error || `HTTP ${status}`),
  });
}

export function startEreportWebConnector(root: HTMLElement) {
  let config = readQueryConfig();
  let payload: ReportPayload | null = null;

  const statusEl = el<HTMLElement>(root, "[data-wc-status]");
  const authPanel = el<HTMLElement>(root, "[data-wc-auth]");
  const authMsg = el<HTMLElement>(root, "[data-wc-auth-msg]");
  const pathCard = el<HTMLElement>(root, "[data-wc-path]");
  const cascade = el<HTMLElement>(root, "[data-wc-cascade]");
  const reportLabel = el<HTMLElement>(root, "[data-wc-report-label]");

  const orgSelect = el<HTMLSelectElement>(root, "[data-wc-org]");
  const reportSelect = el<HTMLSelectElement>(root, "[data-wc-report]");
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

  function selectedOrg(): string {
    return config.locked ? config.orgId : orgSelect?.value || config.orgId;
  }
  function selectedReport(): string {
    return config.locked ? config.reportId : reportSelect?.value || config.reportId;
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

  function basePath(): string {
    return `/ereport/orgs/${selectedOrg()}/reports/${selectedReport()}`;
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
    fillSelect(
      groupSelect,
      (sec?.groups || []).map((g) => ({ value: g.id, label: g.title || g.id })),
      "Select subsection…",
    );
    groupFields.hidden = true;
    itemFields.hidden = true;
    fillSelect(itemSelect, [], "Select issue…");
  }

  function refreshItemOptions() {
    const grp = findGroup(findSection(selectedSection()), selectedGroup());
    fillSelect(
      itemSelect,
      (grp?.items || []).map((it) => ({
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

  async function loadReportPayload() {
    const orgId = selectedOrg();
    const reportId = selectedReport();
    if (!orgId || !reportId) return;
    setStatus("Loading report…");
    const { status, data, requestId } = await fetchOrgReport(orgId, reportId);
    if (status !== 200) {
      raiseApiError(status, requestId, data as unknown as Record<string, unknown>);
      setStatus("Could not load report.");
      return;
    }
    payload = (data.payload as ReportPayload) || { sections: [] };
    const tema = data.meta?.tema || reportId;
    if (reportLabel) {
      reportLabel.textContent = tema;
      reportLabel.hidden = false;
    }
    cascade?.removeAttribute("hidden");
    refreshSectionOptions();
    setStatus("Select a section, or create one.");
  }

  async function loadOrgsForPicker() {
    if (!orgSelect || !reportSelect || !pathCard) return;
    pathCard.hidden = false;
    const { status, data, requestId } = await fetchEreportOrgs();
    if (status !== 200) {
      raiseApiError(status, requestId, data as unknown as Record<string, unknown>);
      setStatus("Could not load organizations.");
      return;
    }
    const orgs = data.orgs || [];
    fillSelect(
      orgSelect,
      orgs.filter((o) => !o.hidden).map((o) => ({ value: o.id, label: o.name || o.id })),
      "Select organization…",
    );
    fillSelect(reportSelect, [], "Select report…");
    setStatus(orgs.length ? "Select organization and report." : "No organizations yet.");
  }

  async function loadReportsForPicker() {
    if (!orgSelect || !reportSelect) return;
    const orgId = orgSelect.value;
    if (!orgId) return;
    const { status, data, requestId } = await fetchEreportOrg(orgId);
    if (status !== 200) {
      raiseApiError(status, requestId, data as unknown as Record<string, unknown>);
      return;
    }
    const reports = data.reports || [];
    fillSelect(
      reportSelect,
      reports.map((r) => ({
        value: r.id,
        label: r.reportNumber ? `${r.tema} (${r.reportNumber})` : r.tema || r.id,
      })),
      "Select report…",
    );
  }

  async function bootstrap(next?: Partial<ConnectorConfig>) {
    try {
      if (next?.orgId && next?.reportId) {
        config = { orgId: next.orgId, reportId: next.reportId, locked: true };
      }
      authPanel?.setAttribute("hidden", "");
      pathCard?.setAttribute("hidden", "");
      cascade?.setAttribute("hidden", "");
      if (reportLabel) reportLabel.hidden = true;
      setStatus("Checking subscription…");

      const access = await fetchEreportAccess();
      if (access.status === 401) {
        authPanel?.removeAttribute("hidden");
        if (authMsg) {
          authMsg.innerHTML =
            'Sign in on eduardoos.com to use the connector. <a href="/session" data-route>Sign in</a>';
        }
        setStatus("Sign in required.");
        return;
      }
      if (access.status !== 200) {
        raiseApiError(access.status, access.requestId, access.data as unknown as Record<string, unknown>);
        setStatus("Could not verify access.");
        return;
      }
      if (!access.data.canCreate) {
        authPanel?.removeAttribute("hidden");
        if (authMsg) {
          authMsg.innerHTML =
            'An active eReport subscription is required. <a href="/payments/subscription" data-route>Subscriptions</a>';
        }
        setStatus("Subscription required.");
        return;
      }

      if (config.locked) {
        pathCard?.setAttribute("hidden", "");
        await loadReportPayload();
        return;
      }
      await loadOrgsForPicker();
    } catch (err) {
      if (mustLog) console.log("[ereport-web-connector] bootstrap failed", err);
      setStatus("Could not start connector.");
      showErrorModal({
        message: "Could not start the eReport connector.",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function createSection() {
    if (!selectedOrg() || !selectedReport()) return;
    const title = window.prompt("New section title");
    if (!title?.trim()) return;
    setStatus("Creating section…");
    const { status, requestId, data } = await nodeWrite("POST", `${basePath()}/sections`, {
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
    const sectionId = selectedSection();
    if (!sectionId) return;
    setStatus("Saving section…");
    const { status, requestId, data } = await nodeWrite("PATCH", `${basePath()}/sections/${sectionId}`, {
      title: sectionTitle.value.trim(),
      productHistory: sectionConcept.value,
    });
    if (status !== 200) {
      raiseApiError(status, requestId, data);
      setStatus("Could not save section.");
      return;
    }
    payload = (data.payload as ReportPayload) || payload;
    refreshSectionOptions();
    sectionSelect.value = sectionId;
    loadSectionFields();
    refreshGroupOptions();
    setStatus("Section saved.");
  }

  async function createGroup() {
    const sectionId = selectedSection();
    if (!sectionId) return;
    const title = window.prompt("New subsection title");
    if (!title?.trim()) return;
    setStatus("Creating subsection…");
    const { status, requestId, data } = await nodeWrite("POST", `${basePath()}/sections/${sectionId}/groups`, {
      title: title.trim(),
      productHistory: "",
    });
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
    const sectionId = selectedSection();
    const groupId = selectedGroup();
    if (!sectionId || !groupId) return;
    setStatus("Saving subsection…");
    const { status, requestId, data } = await nodeWrite(
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
    refreshGroupOptions();
    groupSelect.value = groupId;
    loadGroupFields();
    refreshItemOptions();
    setStatus("Subsection saved.");
  }

  async function createItem() {
    const sectionId = selectedSection();
    const groupId = selectedGroup();
    if (!sectionId || !groupId) return;
    const incidencia = window.prompt("New issue text (incidencia)");
    if (!incidencia?.trim()) return;
    setStatus("Creating issue…");
    const { status, requestId, data } = await nodeWrite(
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
    const sectionId = selectedSection();
    const groupId = selectedGroup();
    const itemId = selectedItem();
    if (!sectionId || !groupId || !itemId) return;
    setStatus("Saving issue…");
    const { status, requestId, data } = await nodeWrite(
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
    refreshItemOptions();
    itemSelect.value = itemId;
    loadItemFields();
    setStatus("Issue saved.");
  }

  orgSelect?.addEventListener("change", () => {
    void loadReportsForPicker();
  });
  reportSelect?.addEventListener("change", () => {
    config.orgId = orgSelect?.value || "";
    config.reportId = reportSelect?.value || "";
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

  const embedded = Boolean(window.parent && window.parent !== window);
  if (embedded) {
    document.documentElement.dataset.ereportEmbed = "1";
  }

  window.addEventListener("message", (ev: MessageEvent) => {
    const data = ev.data;
    if (!data || typeof data !== "object") return;
    if ((data as { type?: string }).type !== INIT_TYPE) return;
    const orgId = String((data as { orgId?: string }).orgId || "").trim();
    const reportId = String((data as { reportId?: string }).reportId || "").trim();
    if (mustLog) console.log("[ereport-web-connector] embed init", { orgId: Boolean(orgId), reportId: Boolean(reportId) });
    void bootstrap({ orgId, reportId });
  });

  document.addEventListener(
    "keydown",
    (ev) => {
      if (ev.key !== "Escape" || !embedded) return;
      ev.preventDefault();
      ev.stopPropagation();
      try {
        window.parent.postMessage({ type: CLOSE_TYPE }, window.location.origin);
      } catch {
        /* ignore */
      }
    },
    true,
  );

  try {
    if (embedded) {
      window.parent.postMessage({ type: READY_TYPE }, "*");
    }
  } catch {
    /* ignore */
  }

  void bootstrap();
}
