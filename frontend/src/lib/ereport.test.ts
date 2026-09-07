import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isEreportOwnerPath, isPublicEreportInvitePath, readInviteParams, workspaceHref } from "./ereport-routes";
import { bumpUiScale, handleTrackerMessage, SITE_TEXT_SCALE_STEPS, startTrackerHost, trackerConfigMessage, usesFilesystemImageRef } from "./ereport-workspace";

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

  it("rebinds the hub after client navigation", () => {
    const hubSrc = readFileSync(join(here, "../pages/ereport/index.astro"), "utf8");
    expect(hubSrc).toContain("onBoundPageReady");
    expect(hubSrc).toContain("[data-ereport-hub]");
  });

  it("bleeds the workspace to the header with no extra main padding", () => {
    const css = readFileSync(join(here, "../styles/global.css"), "utf8");
    expect(css).toMatch(/html\[data-page="ereport-workspace"\] main \{\s*padding: 0;/);
    expect(css).toMatch(/html\[data-page="ereport-workspace"\] \.ereport-workspace \{\s*position: relative;\s*gap: 0;/);
    expect(css).toContain("padding: 0 0 0 var(--rail-width)");
  });

  it("keeps create-org, existing reports, and org lists visible on the hub", () => {
    const hubSrc = readFileSync(join(here, "../pages/ereport/index.astro"), "utf8");
    expect(hubSrc).toContain('data-view="register"');
    expect(hubSrc).toContain('data-view="recent"');
    expect(hubSrc).toContain('data-view="orgs"');
    expect(hubSrc).toContain("data-register-form");
    expect(hubSrc).toContain("data-recent-list");
    expect(hubSrc).not.toMatch(/data-view="register" hidden/);
    expect(hubSrc).not.toMatch(/data-view="recent" hidden/);
    expect(hubSrc).not.toMatch(/data-view="orgs" hidden/);
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

  it("queues host commands until the tracker iframe boots", () => {
    const posted: unknown[] = [];
    const iframe = document.createElement("iframe");
    document.body.append(iframe);
    const win = iframe.contentWindow;
    if (!win) {
      document.body.replaceChildren();
      throw new Error("expected iframe contentWindow");
    }
    win.postMessage = ((msg: unknown) => {
      posted.push(msg);
    }) as typeof win.postMessage;
    const host = startTrackerHost(iframe, {
      origin: "https://eduardoos.com",
      uploadUrl: "/api/ereport/orgs/o/reports/r/images",
      csrf: "csrf",
      payload: null,
      handlers: { onCloudSave: () => undefined, onError: () => undefined },
    });
    host.post({ target: "ereport-tracker", type: "command", command: "tutorial" });
    expect(posted).toEqual([]);
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://eduardoos.com",
        data: { source: "ereport-tracker", type: "booted" },
      }),
    );
    expect(posted.some((msg) => (msg as { command?: string }).command === "tutorial")).toBe(true);
    host.destroy();
    document.body.replaceChildren();
  });
});

describe("eReport workspace chrome", () => {
  it("follows 073 HDS inventory: no add-section, green cloud-save only, Escape + backdrop", () => {
    const workspaceSrc = readFileSync(join(here, "../pages/ereport/workspace.astro"), "utf8");
    expect(workspaceSrc).not.toContain("add-section");
    expect(workspaceSrc).not.toContain("playlist_add");
    expect(workspaceSrc).toContain("ereport-hds-cloud-save");
    expect(workspaceSrc).toContain('title="Cómo usarla"');
    expect(workspaceSrc).toContain('title="Guardar en nube"');
    expect(workspaceSrc).toContain('data-modal="hub"');
    expect(workspaceSrc).toContain("keydown");
    expect(workspaceSrc).toContain("data-tracker-cmd=\"save-export\"");
    expect(workspaceSrc).not.toMatch(/save-export[\s\S]{0,80}ereport-hds-cloud-save/);
    const css = readFileSync(join(here, "../styles/ereport-chrome.css"), "utf8");
    expect(css).toContain("--br: 3.44px");
    expect(css).toContain("#f2f3f6");
    expect(css).toContain("Kumbh Sans");
  });

  it("steps site text scale on 073 bounds without touching tracker hex", () => {
    document.documentElement.dataset.page = "ereport-workspace";
    document.documentElement.style.setProperty("--site-text-scale", "1");
    expect(bumpUiScale(1)).toBe(1.05);
    expect(bumpUiScale(-20)).toBe(SITE_TEXT_SCALE_STEPS[0]);
    document.documentElement.removeAttribute("data-page");
    document.documentElement.style.removeProperty("--site-text-scale");
    localStorage.removeItem("site-text-scale");
  });
});
