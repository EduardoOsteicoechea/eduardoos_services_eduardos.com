export function isPublicEreportInvitePath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === "/ereport/invite" || path.startsWith("/ereport/invite/");
}

export function isEreportOwnerPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === "/ereport" || path === "/ereport/workspace" || path.startsWith("/ereport/workspace/");
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
