import { describe, expect, it } from "vitest";
import { dayTrafficStatus, sectionDone } from "./eoschool-curriculum-progress-status";

describe("dayTrafficStatus", () => {
  it("red when none done", () => {
    expect(dayTrafficStatus("d1", [])).toBe("red");
  });

  it("yellow when partial of five", () => {
    expect(dayTrafficStatus("d1", ["d1:bib", "d1:mat"])).toBe("yellow");
  });

  it("green when all five done (default schedule)", () => {
    expect(
      dayTrafficStatus("d1", ["d1:bib", "d1:ide", "d1:len", "d1:mat", "d1:cie"]),
    ).toBe("green");
  });

  it("green when all scheduled sections done (3-subject day)", () => {
    expect(
      dayTrafficStatus("d2", ["d2:bib", "d2:len", "d2:mat"], ["bib", "len", "mat"]),
    ).toBe("green");
  });

  it("yellow when scheduled day is partial", () => {
    expect(dayTrafficStatus("d2", ["d2:bib"], ["bib", "len", "mat"])).toBe("yellow");
  });

  it("ignores orphan checks outside schedule for green", () => {
    expect(
      dayTrafficStatus(
        "d2",
        ["d2:bib", "d2:len", "d2:mat", "d2:ide"],
        ["bib", "len", "mat"],
      ),
    ).toBe("green");
  });

  it("sectionDone checks key", () => {
    expect(sectionDone("d2", "cie", ["d2:cie"])).toBe(true);
    expect(sectionDone("d2", "mat", ["d2:cie"])).toBe(false);
  });
});
