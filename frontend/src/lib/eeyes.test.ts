import { describe, expect, it } from "vitest";
import { eeyesDownloadUrl, eeyesMediaUrl, eeyesNoticeStage, isEeyesNotice, type EeyesTask } from "./eeyes";

describe("eeyes helpers", () => {
  it("tracks the notification pipeline stage", () => {
    const now = Date.parse("2026-11-05T18:00:00Z");
    const base = { id: "t", status: "pending" } as EeyesTask;
    expect(eeyesNoticeStage({ ...base, notifyAt: "2026-11-05T19:00:00Z" }, now)).toBe("scheduled");
    expect(eeyesNoticeStage({ ...base, notifyAt: "2026-11-05T17:00:00Z" }, now)).toBe("waiting_sync");
    expect(eeyesNoticeStage({ ...base, notifyDispatchedAt: "2026-11-05T17:30:00Z" }, now)).toBe("dispatched");
    expect(eeyesNoticeStage({ ...base, notifyAckedAt: "2026-11-05T17:31:00Z" }, now)).toBe("shown");
    expect(eeyesNoticeStage({ ...base, status: "cancelled" }, now)).toBe("cancelled");
  });

  it("detects notification-only tasks", () => {
    const base = { id: "t", status: "pending" } as EeyesTask;
    expect(isEeyesNotice({ ...base, kind: "notice" })).toBe(true);
    expect(isEeyesNotice(base)).toBe(false);
  });

  it("builds media and download urls", () => {
    expect(eeyesMediaUrl("abc")).toBe("/api/eeyes/media/abc");
    expect(eeyesDownloadUrl("android")).toBe("/api/eeyes/downloads/android");
    expect(eeyesDownloadUrl("desktop")).toBe("/api/eeyes/downloads/desktop");
  });
});
