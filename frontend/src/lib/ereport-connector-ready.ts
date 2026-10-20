/**
 * Fail-fast readiness probe for the eReport website-registration connector.
 */

import { getCsrf, getHealth, getMe, isTransientAuthStatus } from "./api";
import { mustLog } from "./dev-log";
import {
  displayOwnerSafe,
  fetchEreportAccess,
  fetchOrgReport,
  patchReportSiteConnector,
  type WebsiteRegistrationBinding,
} from "./ereport";
import { checkServiceAccess } from "./serviceAccess";

const LOG_PREFIX = "[ereport-ready]";
const DEFAULTS_KEY = "ereport.connector.defaults";

export type ConnectorReadyOk = {
  ok: true;
  binding: { orgId: string; reportId: string; tema?: string; sectionId?: string; groupId?: string };
  report: unknown;
  sectionId: string;
  groupId: string;
  ownerSafe: string;
};

export type ConnectorReadyFail = {
  ok: false;
  reason:
    | "api_down"
    | "unauthorized"
    | "no_entitlement"
    | "no_binding"
    | "no_write"
    | "report_unavailable"
    | "bad_targets"
    | "csrf_unavailable";
  message: string;
  requestId?: string;
};

export type ConnectorReadyResult = ConnectorReadyOk | ConnectorReadyFail;

type SectionNode = { id: string; groups?: Array<{ id: string }> };
type ReportPayload = { sections?: SectionNode[] };
type StoredDefaults = {
  orgId?: string;
  reportId?: string;
  sectionId?: string;
  groupId?: string;
};

function isSpanish(): boolean {
  try {
    return typeof document !== "undefined" && document.documentElement.lang.startsWith("es");
  } catch {
    return false;
  }
}

function msg(
  reason: ConnectorReadyFail["reason"],
): string {
  const es = isSpanish();
  switch (reason) {
    case "api_down":
      return es ? "La API no responde." : "The API is not reachable.";
    case "unauthorized":
      return es ? "Inicia sesión para usar el conector eReport." : "Sign in to use the eReport connector.";
    case "no_entitlement":
      return es
        ? "Tu cuenta no tiene acceso al conector eReport."
        : "Your account does not have eReport connector access.";
    case "no_binding":
      return es
        ? "No hay un informe de registro del sitio configurado."
        : "No website registration report is configured.";
    case "no_write":
      return es
        ? "No tienes permiso para escribir en eReport."
        : "You do not have permission to write to eReport.";
    case "report_unavailable":
      return es ? "No se pudo cargar el informe." : "Could not load the report.";
    case "bad_targets":
      return es
        ? "La sección o subsección del conector no es válida."
        : "The connector section or subsection is invalid.";
    case "csrf_unavailable":
      return es ? "No se pudo obtener el token CSRF." : "Could not obtain a CSRF token.";
    default:
      return es ? "El conector no está listo." : "The connector is not ready.";
  }
}

function fail(reason: ConnectorReadyFail["reason"], requestId?: string): ConnectorReadyFail {
  const result: ConnectorReadyFail = { ok: false, reason, message: msg(reason) };
  if (requestId) result.requestId = requestId;
  if (mustLog) {
    console.log(LOG_PREFIX, "fail", { reason, requestId });
  }
  return result;
}

function loadLocalDefaults(orgId: string, reportId: string): { sectionId: string; groupId: string } | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(DEFAULTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDefaults;
    if (!parsed?.orgId || !parsed?.reportId || !parsed?.sectionId || !parsed?.groupId) return null;
    if (String(parsed.orgId) !== orgId || String(parsed.reportId) !== reportId) return null;
    return { sectionId: String(parsed.sectionId), groupId: String(parsed.groupId) };
  } catch {
    return null;
  }
}

function resolveTargets(
  metaSectionId: string,
  metaGroupId: string,
  binding: WebsiteRegistrationBinding,
  payload: ReportPayload | undefined,
): { sectionId: string; groupId: string; metaHadIds: boolean } {
  const sections = payload?.sections || [];
  const local = loadLocalDefaults(binding.orgId, binding.reportId);
  const sectionCandidates = [
    metaSectionId,
    (binding.sectionId || "").trim(),
    local?.sectionId || "",
    sections[0]?.id || "",
  ].filter(Boolean);

  let sectionId = "";
  for (const id of sectionCandidates) {
    if (sections.some((s) => s.id === id)) {
      sectionId = id;
      break;
    }
  }

  const sec = sections.find((s) => s.id === sectionId);
  const groups = sec?.groups || [];
  const groupCandidates = [
    metaGroupId,
    (binding.groupId || "").trim(),
    local?.groupId || "",
    groups[0]?.id || "",
  ].filter(Boolean);

  let groupId = "";
  for (const id of groupCandidates) {
    if (groups.some((g) => g.id === id)) {
      groupId = id;
      break;
    }
  }

  const metaHadIds = Boolean(metaSectionId && metaGroupId);
  return { sectionId, groupId, metaHadIds };
}

function targetsExist(payload: ReportPayload | undefined, sectionId: string, groupId: string): boolean {
  if (!sectionId || !groupId) return false;
  const sec = (payload?.sections || []).find((s) => s.id === sectionId);
  if (!sec) return false;
  return Boolean((sec.groups || []).some((g) => g.id === groupId));
}

/**
 * Probe whether the eReport website-registration connector can write.
 * Fail-fast sequence: health → session → entitlement → binding/write → report → targets → CSRF.
 */
export async function probeEreportConnectorReady(opts?: {
  orgId?: string;
  reportId?: string;
}): Promise<ConnectorReadyResult> {
  if (mustLog) {
    console.log(LOG_PREFIX, "probe.start", { orgId: opts?.orgId, reportId: opts?.reportId });
  }

  // 1. Health
  try {
    await getHealth();
  } catch {
    return fail("api_down");
  }

  // 2. Session (retry once on transient)
  let me = await getMe({ force: true });
  if (!(me.status === 200 && me.data.id) && isTransientAuthStatus(me.status)) {
    if (mustLog) console.log(LOG_PREFIX, "me.transient_retry", { status: me.status, requestId: me.requestId });
    me = await getMe({ force: true });
  }
  if (!(me.status === 200 && me.data.id)) {
    return fail("unauthorized", me.requestId);
  }

  // 3. Entitlement (admin counts as ok via helper)
  const accessGate = await checkServiceAccess("ereport-connector");
  if (!accessGate.allowed && !accessGate.hasEntitlement) {
    return fail("no_entitlement");
  }

  // 4. Binding + write
  const access = await fetchEreportAccess();
  if (access.status === 401) {
    return fail("unauthorized", access.requestId);
  }
  if (access.status !== 200) {
    return fail("no_write", access.requestId);
  }
  if (!access.data.canCreate) {
    return fail("no_write", access.requestId);
  }

  const wr = access.data.websiteRegistration;
  const orgId = (opts?.orgId || wr?.orgId || "").trim();
  const reportId = (opts?.reportId || wr?.reportId || "").trim();
  if (!orgId || !reportId) {
    return fail("no_binding", access.requestId);
  }

  const binding: WebsiteRegistrationBinding = {
    orgId,
    reportId,
    tema: wr?.tema,
    sectionId: wr?.sectionId,
    groupId: wr?.groupId,
  };

  // 5. Report
  const reportRes = await fetchOrgReport(orgId, reportId);
  if (reportRes.status !== 200) {
    return fail("report_unavailable", reportRes.requestId);
  }

  const meta = reportRes.data.meta;
  const metaSectionId = (meta?.connectorSectionId || "").trim();
  const metaGroupId = (meta?.connectorGroupId || "").trim();
  const payload = reportRes.data.payload as ReportPayload | undefined;

  // 6–7. Resolve + verify targets
  const resolved = resolveTargets(metaSectionId, metaGroupId, binding, payload);
  if (!targetsExist(payload, resolved.sectionId, resolved.groupId)) {
    return fail("bad_targets", reportRes.requestId);
  }

  // 8. CSRF
  let csrf = "";
  try {
    csrf = await getCsrf();
  } catch {
    return fail("csrf_unavailable");
  }
  if (!csrf) {
    return fail("csrf_unavailable");
  }

  // 9. Persist defaults when meta lacked connector ids
  if (!resolved.metaHadIds) {
    try {
      const patch = await patchReportSiteConnector(orgId, reportId, {
        assign: false,
        sectionId: resolved.sectionId,
        groupId: resolved.groupId,
      });
      if (mustLog) {
        console.log(LOG_PREFIX, "site-connector.patch", {
          status: patch.status,
          requestId: patch.requestId,
          sectionId: resolved.sectionId,
          groupId: resolved.groupId,
        });
      }
    } catch (err) {
      if (mustLog) {
        console.log(LOG_PREFIX, "site-connector.patch_error", {
          message: err instanceof Error ? err.message : "unknown",
        });
      }
    }
  }

  const ownerSafe =
    (access.data.ownerSafe || "").trim() ||
    (meta?.ownerSafe || "").trim() ||
    (access.data.ownerEmail ? displayOwnerSafe(access.data.ownerEmail) : "") ||
    (meta?.ownerEmail ? displayOwnerSafe(meta.ownerEmail) : "");

  const ok: ConnectorReadyOk = {
    ok: true,
    binding: {
      orgId,
      reportId,
      ...(binding.tema ? { tema: binding.tema } : {}),
      ...(binding.sectionId ? { sectionId: binding.sectionId } : {}),
      ...(binding.groupId ? { groupId: binding.groupId } : {}),
    },
    report: reportRes.data,
    sectionId: resolved.sectionId,
    groupId: resolved.groupId,
    ownerSafe,
  };

  if (mustLog) {
    console.log(LOG_PREFIX, "probe.ok", {
      orgId,
      reportId,
      sectionId: ok.sectionId,
      groupId: ok.groupId,
      ownerSafe,
    });
  }
  return ok;
}
