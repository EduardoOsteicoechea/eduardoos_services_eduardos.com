import { describe, expect, it } from "vitest";
import {
  dayTrafficStatus,
  formatProgressSummary,
  rollupSubjectProgress,
  sectionDone,
  subjectProgressValue,
} from "./eoschool-curriculum-progress-status";

describe("dayTrafficStatus", () => {
  it("red when none done", () => {
    expect(dayTrafficStatus("d1", [])).toBe("red");
  });

  it("yellow when partial of five", () => {
    expect(dayTrafficStatus("d1", ["d1:bib", "d1:mat"])).toBe("yellow");
  });

  it("green when the five are done and english is not on the schedule", () => {
    expect(dayTrafficStatus("d1", ["d1:bib", "d1:ide", "d1:len", "d1:mat", "d1:cie"])).toBe("green");
  });

  it("yellow when english is scheduled and still open", () => {
    expect(
      dayTrafficStatus("d46", ["d46:bib", "d46:ide", "d46:len", "d46:mat", "d46:cie"], [
        "bib",
        "ide",
        "len",
        "mat",
        "cie",
        "eng",
      ]),
    ).toBe("yellow");
  });

  it("green when the scheduled english signature is done", () => {
    expect(
      dayTrafficStatus(
        "d46",
        ["d46:bib", "d46:ide", "d46:len", "d46:mat", "d46:cie", "d46:eng"],
        ["bib", "ide", "len", "mat", "cie", "eng"],
      ),
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

describe("subject progress", () => {
  it("uses class completion when the subject has no score", () => {
    expect(subjectProgressValue(true, null)).toEqual({ value: 100, tone: "green", scored: false });
    expect(subjectProgressValue(false, undefined)).toEqual({ value: 0, tone: "red", scored: false });
  });

  it("uses the score when the subject has one", () => {
    expect(subjectProgressValue(true, 90)).toMatchObject({ value: 90, tone: "green", scored: true });
    expect(subjectProgressValue(false, 60).tone).toBe("yellow");
    expect(subjectProgressValue(true, 49).tone).toBe("red");
    expect(subjectProgressValue(false, 0)).toMatchObject({ value: 0, tone: "red", scored: true });
    expect(subjectProgressValue(true, 101).scored).toBe(false);
  });

  it("rolls up completed subjects and scored subjects", () => {
    const rollup = rollupSubjectProgress([
      { done: true, score: null },
      { done: false, score: null },
      { done: true, score: 80 },
      { done: false, score: 60 },
    ]);
    expect(rollup).toMatchObject({
      scheduled: 4,
      completed: 2,
      scoredCount: 2,
      averageScore: 70,
      percent: 60,
    });
    expect(formatProgressSummary(rollup)).toBe(
      "Avance 60% · 2 materias completadas de 4 · promedio 70 en 2 materias con puntaje",
    );
  });

  it("omits the score average when nothing is scored", () => {
    const rollup = rollupSubjectProgress([{ done: true }, { done: false }]);
    expect(formatProgressSummary(rollup)).toBe("Avance 50% · 1 materia completada de 2 · sin puntajes");
  });
});
