import { describe, expect, it } from "vitest";
import {
  eeyesDownloadUrl,
  eeyesMediaUrl,
  eeyesNoticeStage,
  eeyesPhotoStage,
  eeyesAnalysisOrder,
  eeyesBatches,
  eeyesPhotoSessions,
  eeyesCaptureDevices,
  eeyesPackAnalysis,
  eeyesUniquePackTasks,
  isEeyesNotice,
  isEeyesPhoto,
  type EeyesDevice,
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
    expect(eeyesPhotoStage({ ...base, status: "in_progress" }, now)).toBe("capturing");
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

  it("keeps one capture device per model and one card per pack", () => {
    const phone = {
      id: "old",
      platform: "android",
      model: "RKY-LX3",
      label: "RKY-LX3",
      lastSeenAt: "2026-11-06T09:00:00Z",
    } as EeyesDevice;
    const again = { ...phone, id: "new", lastSeenAt: "2026-11-06T09:40:00Z" };
    const tablet = { ...phone, id: "tab", model: "SM-X400", label: "SM-X400" };
    expect(eeyesCaptureDevices([phone, again, tablet]).map((d) => d.id)).toEqual(["new", "tab"]);
    const pending = { id: "p", deviceId: "old", status: "pending", batchId: "b" } as EeyesTask;
    const done = {
      id: "d",
      deviceId: "new",
      status: "completed",
      batchId: "b",
      packAnalysis: "Postura: erguido.",
    } as EeyesTask;
    const shown = eeyesUniquePackTasks([pending, done], [phone, again, tablet]);
    expect(shown.map((t) => t.id)).toEqual(["d"]);
    expect(eeyesPackAnalysis([pending, done])).toBe("Postura: erguido.");
  });

  it("joins a burst across devices into one session", () => {
    const phone = {
      id: "p",
      deviceId: "phone",
      title: "Foto programada",
      cameraFacing: "front",
      photoIntervalSec: 5,
      maxPhotos: 5,
      batchId: "burst-phone",
      createdAt: "2026-11-06T12:06:33Z",
      packAnalysis: "Teléfono.",
    } as EeyesTask;
    const tablet = {
      ...phone,
      id: "t",
      deviceId: "tablet",
      batchId: "burst-tablet",
      createdAt: "2026-11-06T12:06:35Z",
      packAnalysis: "Tablet.",
    } as EeyesTask;
    const desktop = {
      ...phone,
      id: "d",
      deviceId: "desktop",
      batchId: "burst-desktop",
      createdAt: "2026-11-06T12:06:36Z",
      packAnalysis: "",
    } as EeyesTask;
    const later = {
      ...phone,
      id: "later",
      deviceId: "phone",
      batchId: "one",
      maxPhotos: 1,
      photoIntervalSec: 0,
      createdAt: "2026-11-06T12:24:50Z",
    } as EeyesTask;
    const sessions = eeyesPhotoSessions([later, desktop, phone, tablet]);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].map((t) => t.id)).toEqual(["later"]);
    expect(sessions[1].map((t) => t.id)).toEqual(["d", "t", "p"]);
  });

  it("leads a pack reading with the conclusion", () => {
    const ordered = eeyesAnalysisOrder("Postura: erguido.\n\nConclusión: no hay deep work.");
    expect(ordered.conclusion).toBe("Conclusión: no hay deep work.");
    expect(ordered.explanation).toBe("Postura: erguido.");
    expect(eeyesAnalysisOrder("Sin cierre.").explanation).toBe("Sin cierre.");
  });

  it("builds media and download urls", () => {
    expect(eeyesMediaUrl("abc")).toBe("/api/eeyes/media/abc");
    expect(eeyesDownloadUrl("android")).toBe("/api/eeyes/downloads/android");
    expect(eeyesDownloadUrl("desktop")).toBe("/api/eeyes/downloads/desktop");
  });
});
