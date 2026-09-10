/** Bump when `public/ereport-tracker.html` changes so browsers drop the cached canvas. */
export const TRACKER_SRC = "/ereport-tracker.html?v=075";

export function isPublicEreportInvitePath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === "/ereport/invite" || path.startsWith("/ereport/invite/");
}

/** Real routes and static files that a `/ereport/<segment>` pretty URL must never shadow. */
const RESERVED_EREPORT_SEGMENTS = new Set(["workspace", "invite", "tracker.html"]);

export function isEreportOwnerPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/ereport" || path === "/ereport/workspace" || path.startsWith("/ereport/workspace/")) {
    return true;
  }
  return Boolean(readPrettyEreportPath(path).ownerSafe);
}

export function prettyHubHref(ownerSafe: string): string {
  return ownerSafe ? `/ereport/${encodeURIComponent(ownerSafe)}` : "/ereport";
}

export function prettyWorkspaceHref(ownerSafe: string, reportId: string): string {
  if (!ownerSafe || !reportId) {
    return "";
  }
  return `/ereport/${encodeURIComponent(ownerSafe)}/${encodeURIComponent(reportId)}`;
}

/**
 * Reads the display-only pretty forms `/ereport/{ownerSafe}` and
 * `/ereport/{ownerSafe}/{reportId}`. These are never filesystem or authz keys (072);
 * the API still resolves the owner from the session.
 */
export function readPrettyEreportPath(pathname: string): { ownerSafe: string; reportId: string } {
  const empty = { ownerSafe: "", reportId: "" };
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts[0] !== "ereport" || !parts[1] || parts.length > 3) {
    return empty;
  }
  if (RESERVED_EREPORT_SEGMENTS.has(parts[1])) {
    return empty;
  }
  return { ownerSafe: decodeURIComponent(parts[1]), reportId: parts[2] ? decodeURIComponent(parts[2]) : "" };
}

export function workspaceHref(orgId: string, reportId: string, ownerSafe = ""): string {
  const q = new URLSearchParams({ org: orgId, report: reportId });
  if (ownerSafe) {
    q.set("user", ownerSafe);
  }
  return `/ereport/workspace?${q.toString()}`;
}

export function readInviteParams(search: string, pathname: string): { inviteId: string; secret: string } {
  const params = new URLSearchParams(search);
  const inviteId = (params.get("invite") || params.get("id") || "").trim();
  const secret = (params.get("t") || params.get("token") || "").trim();
  if (inviteId && secret) {
    return { inviteId, secret };
  }
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts[0] === "ereport" && parts[1] === "invite" && parts[2]) {
    return { inviteId: decodeURIComponent(parts[2]), secret };
  }
  return { inviteId, secret };
}

export function trackerOriginAllowed(origin: string, locationOrigin: string): boolean {
  return origin === locationOrigin;
}
