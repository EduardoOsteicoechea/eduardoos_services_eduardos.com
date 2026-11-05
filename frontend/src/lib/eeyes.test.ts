import { describe, expect, it } from "vitest";
import { eeyesDownloadUrl, eeyesMediaUrl, isEeyesNotice, type EeyesTask } from "./eeyes";

describe("eeyes helpers", () => {
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
