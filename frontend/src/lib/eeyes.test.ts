import { describe, expect, it } from "vitest";
import {
  eeyesDownloadUrl,
  eeyesMediaUrl,
  eeyesNoticeStage,
  eeyesPhotoStage,
  eeyesBatches,
  isEeyesNotice,
  isEeyesPhoto,
  type EeyesTask,
} from "./eeyes";

describe("eeyes helpers", () => {
  it("tracks the scheduled photo pipeline stage", () => {
    const now = Date.parse("2026-11-05T18:00:00Z");
    const base = { id: "t", status: "pending", kind: "photo" } as EeyesTask;
    expect(isEeyesPhoto(base)).toBe(true);
    expect(isEeyesPhoto({ ...base, kind: "notice" })).toBe(false);
    expect(eeyesPhotoStage({ ...base, notifyAt: "2026-11-05T19:00:00Z" }, now)).toBe("scheduled");
    expect(eeyesPhotoStage({ ...base, notifyAt: "2026-11-05T17:00:00Z" }, now)).toBe("waiting_sync");
    expect(eeyesPhotoStage({ ...base, notifyDispatchedAt: "2026-11-05T17:30:00Z" }, now)).toBe("dispatched");
    expect(eeyesPhotoStage({ ...base, notifyAckedAt: "2026-11-05T17:31:00Z" }, now)).toBe("taken");
    expect(eeyesPhotoStage({ ...base, status: "completed", notifyAckedAt: "x" }, now)).toBe("uploaded");
    expect(eeyesPhotoStage({ ...base, status: "cancelled" }, now)).toBe("cancelled");
  });

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

  it("groups one send into a container per device", () => {
    const a = { id: "a", batchId: "send-1", deviceId: "phone" } as EeyesTask;
    const b = { id: "b", batchId: "send-1", deviceId: "pc" } as EeyesTask;
    const c = { id: "c", deviceId: "phone" } as EeyesTask;
    const groups = eeyesBatches([a, b, c]);
    expect(groups).toHaveLength(2);
    expect(groups[0].map((t) => t.deviceId)).toEqual(["phone", "pc"]);
    expect(groups[1]).toEqual([c]);
  });

  it("builds media and download urls", () => {
    expect(eeyesMediaUrl("abc")).toBe("/api/eeyes/media/abc");
    expect(eeyesDownloadUrl("android")).toBe("/api/eeyes/downloads/android");
    expect(eeyesDownloadUrl("desktop")).toBe("/api/eeyes/downloads/desktop");
  });
});
