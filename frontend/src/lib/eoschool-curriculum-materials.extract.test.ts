import { describe, expect, it } from "vitest";
import { extractionDisplayText } from "./eoschool-curriculum-materials";

describe("extractionDisplayText", () => {
  it("prefers cleanText over rawText", () => {
    expect(
      extractionDisplayText({
        status: "ready",
        rawText: "raw",
        cleanText: "clean",
      }),
    ).toBe("clean");
  });

  it("falls back to rawText", () => {
    expect(
      extractionDisplayText({
        status: "ready",
        rawText: "only raw",
      }),
    ).toBe("only raw");
  });

  it("returns empty when missing", () => {
    expect(extractionDisplayText(null)).toBe("");
    expect(extractionDisplayText({ status: "failed", message: "x" })).toBe("");
  });
});
