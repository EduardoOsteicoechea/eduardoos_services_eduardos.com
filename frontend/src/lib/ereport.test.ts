import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isEreportOwnerPath, isPublicEreportInvitePath, readInviteParams, workspaceHref } from "./ereport-routes";
import { handleTrackerMessage, trackerConfigMessage, usesFilesystemImageRef } from "./ereport-workspace";

const here = dirname(fileURLToPath(import.meta.url));

describe("eReport public invite routing", () => {
  it("treats /ereport/invite as public and hub/workspace as owner UX", () => {
    expect(isPublicEreportInvitePath("/ereport/invite")).toBe(true);
    expect(isPublicEreportInvitePath("/ereport/invite/")).toBe(true);
    expect(isPublicEreportInvitePath("/ereport/invite/abc")).toBe(true);
    expect(isPublicEreportInvitePath("/ereport")).toBe(false);
    expect(isPublicEreportInvitePath("/ereport/workspace")).toBe(false);
    expect(isEreportOwnerPath("/ereport")).toBe(true);
    expect(isEreportOwnerPath("/ereport/workspace")).toBe(true);
  });

  it("does not AuthGate the invite page", () => {
    const inviteSrc = readFileSync(join(here, "../pages/ereport/invite.astro"), "utf8");
    expect(inviteSrc).not.toContain("requireAuth");
    expect(inviteSrc).toContain("isPublicEreportInvitePath");
  });

  it("reads invite id and secret from query without using email as a path key", () => {
    expect(readInviteParams("?invite=abc&t=secret", "/ereport/invite")).toEqual({
      inviteId: "abc",
      secret: "secret",
    });
    expect(workspaceHref("org-1", "rep-1", "a_at_b.com")).toBe(
      "/ereport/workspace?org=org-1&report=rep-1&user=a_at_b.com",
    );
  });
});

describe("tracker host bridge", () => {
  it("accepts same-origin cloud-save and rejects other origins", () => {
    const saved: Record<string, unknown>[] = [];
    const ok = handleTrackerMessage(
      { origin: "https://eduardoos.com", data: { source: "ereport-tracker", type: "cloud-save", payload: { reportName: "A" } } } as MessageEvent,
      "https://eduardoos.com",
      { onCloudSave: (payload) => saved.push(payload), onError: () => undefined },
    );
    const blocked = handleTrackerMessage(
      { origin: "https://evil.example", data: { source: "ereport-tracker", type: "cloud-save", payload: { reportName: "Nope" } } } as MessageEvent,
      "https://eduardoos.com",
      { onCloudSave: (payload) => saved.push(payload), onError: () => undefined },
    );
    expect(ok).toBe(true);
    expect(blocked).toBe(false);
    expect(saved).toEqual([{ reportName: "A" }]);
  });

  it("configures filesystem image uploads instead of new base64 writes", () => {
    expect(trackerConfigMessage("/api/ereport/orgs/o/reports/r/images", "csrf")).toEqual({
      target: "ereport-tracker",
      type: "config",
      uploadUrl: "/api/ereport/orgs/o/reports/r/images",
      csrf: "csrf",
    });
    expect(usesFilesystemImageRef({ id: "img-1", url: "/api/ereport/orgs/o/reports/r/images/img-1" })).toBe(true);
    expect(usesFilesystemImageRef({ dataUrl: "data:image/png;base64,aaa" })).toBe(false);
  });
});
