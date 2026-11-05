import { describe, expect, it } from "vitest";
import { eeyesDownloadUrl, eeyesMediaUrl } from "./eeyes";

describe("eeyes helpers", () => {
  it("builds media and download urls", () => {
    expect(eeyesMediaUrl("abc")).toBe("/api/eeyes/media/abc");
    expect(eeyesDownloadUrl("android")).toBe("/api/eeyes/downloads/android");
    expect(eeyesDownloadUrl("desktop")).toBe("/api/eeyes/downloads/desktop");
  });
});
