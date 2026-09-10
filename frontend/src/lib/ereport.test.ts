import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  isEreportOwnerPath,
  isPublicEreportInvitePath,
  prettyHubHref,
  prettyWorkspaceHref,
  readInviteParams,
  readPrettyEreportPath,
  TRACKER_SRC,
  workspaceHref,
} from "./ereport-routes";
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
    expect(css).toContain(
      "padding: 0 var(--main-inline) 0 calc(var(--rail-width) + var(--main-inline))",
    );
  });

  it("switches hub views from ?view= and offers a way back to the dashboard", () => {
    const hubSrc = readFileSync(join(here, "../pages/ereport/index.astro"), "utf8");
    expect(hubSrc).toContain('data-view="register"');
    expect(hubSrc).toContain('data-view="recent"');
    expect(hubSrc).toContain('data-view="orgs"');
    expect(hubSrc).toContain('data-view="new-report"');
    expect(hubSrc).toContain('data-view="manage"');
    expect(hubSrc).toContain("data-register-form");
    expect(hubSrc).toContain("data-recent-list");
    expect(hubSrc).toContain("data-hub-back");
    expect(hubSrc).toContain('searchParams.delete("view")');
  });

  it("builds the hub from 073 dashboard cards and the .btn system", () => {
    const hubSrc = readFileSync(join(here, "../pages/ereport/index.astro"), "utf8");
    expect(hubSrc).toContain("product-dash__card");
    expect(hubSrc).toContain("product-dash__card--active");
    expect(hubSrc).toContain("btn btn--primary");
    expect(hubSrc).toContain("btn btn--red");
    const css = readFileSync(join(here, "../styles/ereport-chrome.css"), "utf8");
    expect(css).toContain("--font-base: 1rem");
    expect(css).toContain("--p3: 1rem");
    expect(css).toContain("--m2: 0.75rem");
    expect(css).toMatch(/\.btn--red,[\s\S]{0,80}\.btn--danger/);
    expect(css).toContain("minmax(11rem, 1fr)");
    expect(css).toContain("calc(var(--bmh) * 3)");
    expect(css).toMatch(/@media \(max-width: 47\.999rem\)[\s\S]*product-dash__grid[\s\S]*minmax\(0, 1fr\)/);
    expect(css).toMatch(/@media \(max-width: 47\.999rem\)[\s\S]*\.btn \{[\s\S]*max-height: none/);
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
        source: win,
        data: { source: "ereport-tracker", type: "booted" },
      }),
    );
    expect(posted.some((msg) => (msg as { command?: string }).command === "tutorial")).toBe(true);
    host.destroy();
    document.body.replaceChildren();
  });

  it("collect resolves from same-iframe state and ignores foreign sources", async () => {
    const iframe = document.createElement("iframe");
    document.body.append(iframe);
    const win = iframe.contentWindow;
    if (!win) {
      document.body.replaceChildren();
      throw new Error("expected iframe contentWindow");
    }
    win.postMessage = (() => undefined) as typeof win.postMessage;
    const host = startTrackerHost(iframe, {
      origin: "https://eduardoos.com",
      uploadUrl: "/api/ereport/orgs/o/reports/r/images",
      csrf: "csrf",
      payload: null,
      handlers: { onCloudSave: () => undefined, onError: () => undefined },
    });
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://eduardoos.com",
        source: win,
        data: { source: "ereport-tracker", type: "booted" },
      }),
    );
    const pending = host.collect(500);
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://eduardoos.com",
        source: window,
        data: { source: "ereport-tracker", type: "state", payload: { reportName: "foreign" } },
      }),
    );
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://eduardoos.com",
        source: win,
        data: { source: "ereport-tracker", type: "state", payload: { reportName: "Mine" } },
      }),
    );
    await expect(pending).resolves.toEqual({ reportName: "Mine" });
    host.destroy();
    await expect(host.collect(50)).rejects.toThrow(/destroyed/i);
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

  it("wires every workspace HDS button to a tracker command or modal", () => {
    const workspaceSrc = readFileSync(join(here, "../pages/ereport/workspace.astro"), "utf8");
    const trackerCmds = [
      "tutorial",
      "toggle-sidebar",
      "upload",
      "clear-all",
      "progress",
      "save-export",
    ];
    for (const cmd of trackerCmds) {
      expect(workspaceSrc).toContain(`data-tracker-cmd="${cmd}"`);
      expect(workspaceSrc).toContain("sendCmd(");
    }
    expect(workspaceSrc).toContain('data-site-scale="1"');
    expect(workspaceSrc).toContain('data-site-scale="-1"');
    expect(workspaceSrc).toContain("bumpUiScale(");
    for (const modal of ["hub", "tema", "save", "share", "historial", "ids"]) {
      expect(workspaceSrc).toContain(`data-open-modal="${modal}"`);
      expect(workspaceSrc).toContain(`data-modal="${modal}"`);
    }
    expect(workspaceSrc).toContain("data-ids-org");
    expect(workspaceSrc).toContain("data-ids-report");
    expect(workspaceSrc).toContain("fillIdsFields");
    expect(workspaceSrc).toContain("liveOrgId");
    expect(workspaceSrc).toContain("data-save-now");
    expect(workspaceSrc).toContain("host.collect()");
    expect(workspaceSrc).toContain("createReportInvite(");
    expect(workspaceSrc).toContain("listReportHistory(");
    expect(workspaceSrc).toContain("restoreReportHistory(");
  });

  it("wires invite HDS tracker tools including scale upload and clear", () => {
    const inviteSrc = readFileSync(join(here, "../pages/ereport/invite.astro"), "utf8");
    for (const cmd of ["tutorial", "toggle-sidebar", "upload", "clear-all", "progress", "save-export"]) {
      expect(inviteSrc).toContain(`data-tracker-cmd="${cmd}"`);
    }
    expect(inviteSrc).toContain('data-site-scale="1"');
    expect(inviteSrc).toContain('data-site-scale="-1"');
    expect(inviteSrc).toContain("bumpUiScale(");
  });

  it("wires hub HDS view switches", () => {
    const hubSrc = readFileSync(join(here, "../pages/ereport/index.astro"), "utf8");
    for (const view of ["dashboard", "orgs", "register", "new-report", "recent", "manage"]) {
      expect(hubSrc).toContain(`data-hub-view="${view}"`);
    }
    expect(hubSrc).toContain("setView(");
  });

  it("reads pretty hub and workspace URLs without shadowing real routes", () => {
    expect(prettyHubHref("a_at_b.com")).toBe("/ereport/a_at_b.com");
    expect(prettyHubHref("")).toBe("/ereport");
    expect(prettyWorkspaceHref("a_at_b.com", "rep-1")).toBe("/ereport/a_at_b.com/rep-1");
    expect(readPrettyEreportPath("/ereport/a_at_b.com")).toEqual({ ownerSafe: "a_at_b.com", reportId: "" });
    expect(readPrettyEreportPath("/ereport/a_at_b.com/rep-1")).toEqual({ ownerSafe: "a_at_b.com", reportId: "rep-1" });
    for (const reserved of ["/ereport", "/ereport/workspace", "/ereport/invite", "/ereport/invite/abc", "/ereport/tracker.html"]) {
      expect(readPrettyEreportPath(reserved)).toEqual({ ownerSafe: "", reportId: "" });
    }
    expect(isEreportOwnerPath("/ereport/a_at_b.com")).toBe(true);
    expect(isPublicEreportInvitePath("/ereport/invite/abc")).toBe(true);
  });

  it("serves the pretty URLs from nginx without swallowing the tracker or invite", () => {
    const conf = readFileSync(join(here, "../../../docs/nginx/eduardoos.com.conf"), "utf8");
    expect(conf).toContain("location = /ereport/tracker.html");
    expect(conf).toContain('location ~ "^/ereport/invite/[^/]+$"');
    expect(conf).toContain('location ~ "^/ereport/(?!workspace$|invite$|tracker\\.html$)[^/]+$"');
    expect(conf).toContain('location ~ "^/ereport/(?!workspace/|invite/)[^/]+/[^/]+$"');
    // Exact and invite locations must be declared before the catch-all pretty regexes.
    expect(conf.indexOf("location = /ereport/tracker.html")).toBeLessThan(conf.indexOf('location ~ "^/ereport/(?!workspace$'));
    expect(conf.indexOf('location ~ "^/ereport/invite/[^/]+$"')).toBeLessThan(
      conf.indexOf('location ~ "^/ereport/(?!workspace/|invite/)'),
    );
    expect(conf).not.toContain("location /media/");
  });

  it("cache-busts the tracker canvas from one shared constant", () => {
    expect(TRACKER_SRC).toMatch(/^\/ereport-tracker\.html\?v=\w+$/);
    for (const page of ["workspace", "invite"]) {
      const src = readFileSync(join(here, `../pages/ereport/${page}.astro`), "utf8");
      expect(src).toContain("iframe.src = TRACKER_SRC");
      expect(src).not.toContain('iframe.src = "/ereport-tracker.html"');
    }
  });

  it("tears down workspace bind keys and awaits collect before save", () => {
    const workspaceSrc = readFileSync(join(here, "../pages/ereport/workspace.astro"), "utf8");
    expect(workspaceSrc).toContain("delete root.dataset.boundKey");
    expect(workspaceSrc).toContain("astro:before-swap");
    expect(workspaceSrc).toContain("await host.collect()");
    expect(workspaceSrc).toContain("host?.destroy()");
  });

  it("keeps tracker theme under the site toggle and shows date icons in dark mode", () => {
    const css = readFileSync(join(here, "../styles/ereport-chrome.css"), "utf8");
    expect(css).toMatch(/html\[data-page\^="ereport"\] \{[\s\S]*color-scheme:\s*dark/);
    expect(css).toMatch(/html\[data-page\^="ereport"\]\[data-theme="light"\] \{[\s\S]*color-scheme:\s*light/);
    const tracker = readFileSync(join(here, "../../public/ereport-tracker.html"), "utf8");
    expect(tracker).toContain("color-scheme: dark");
    expect(tracker).toContain("adoptHostTheme");
    expect(tracker).toContain("::-webkit-calendar-picker-indicator");
    expect(tracker).toContain("filter: invert(1)");
    const host = readFileSync(join(here, "./ereport-workspace.ts"), "utf8");
    expect(host).toMatch(
      /onBooted:\s*\(\)\s*=>\s*\{[\s\S]*?type:\s*"theme"[\s\S]*?trackerLoadMessage/,
    );
    expect(host).toContain("onLoaded:");
    const inviteSrc = readFileSync(join(here, "../pages/ereport/invite.astro"), "utf8");
    expect(inviteSrc).toContain("ereport-theme");
    expect(inviteSrc).toContain("siteIsDark");
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
