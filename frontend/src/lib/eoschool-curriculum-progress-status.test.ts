import { describe, expect, it } from "vitest";
import { dayTrafficStatus, sectionDone } from "./eoschool-curriculum-progress-status";

describe("dayTrafficStatus", () => {
  it("red when none done", () => {
    expect(dayTrafficStatus("d1", [])).toBe("red");
  });

  it("yellow when partial", () => {
    expect(dayTrafficStatus("d1", ["d1:bib", "d1:mat"])).toBe("yellow");
  });

  it("green when all five done", () => {
    expect(
      dayTrafficStatus("d1", ["d1:bib", "d1:ide", "d1:len", "d1:mat", "d1:cie"]),
    ).toBe("green");
  });

  it("sectionDone checks key", () => {
    expect(sectionDone("d2", "cie", ["d2:cie"])).toBe(true);
    expect(sectionDone("d2", "mat", ["d2:cie"])).toBe(false);
  });
});
