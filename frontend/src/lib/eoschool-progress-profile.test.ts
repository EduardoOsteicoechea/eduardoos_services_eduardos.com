import { describe, expect, it } from "vitest";
import {
  ELIAS_READ_SCORES,
  ELIAS_STUDENT_KEY,
  buildProgressProfile,
  buildProgressStats,
  paceLabel,
  planDayOnOrBefore,
  scoreSignature,
} from "./eoschool-progress-profile";

const days = [
  { planDay: 38, calendarDate: "2026-11-25" },
  { planDay: 39, calendarDate: "2026-11-26" },
  { planDay: 40, calendarDate: "2026-11-27" },
  { planDay: 41, calendarDate: "2026-11-30" },
];

describe("progress profile", () => {
  it("places today on the school day already reached", () => {
    expect(planDayOnOrBefore(days, "2026-11-27")).toBe(40);
    expect(planDayOnOrBefore(days, "2026-11-28")).toBe(40);
    expect(planDayOnOrBefore(days, "2026-09-20")).toBe(0);
  });

  it("summarizes the graded days without treating every check as a score", () => {
    const stats = buildProgressStats(ELIAS_READ_SCORES, {
      throughDay: 40,
      completed: 180,
      scheduled: 190,
    });
    expect(stats.week).toBe(8);
    expect(stats.scoreCount).toBe(19);
    expect(stats.mean).toBe(82);
    expect(stats.dayLines.map((line) => line.mean)).toEqual([88, 79, 80]);
    expect(stats.red).toBe(0);
    expect(stats.subjects.find((subject) => subject.section === "len")?.mean).toBe(68);
    expect(stats.subjects.find((subject) => subject.section === "mat")?.trail).toBe("86 → 84 → 80");
    expect(paceLabel(180, 190)).toBe("Va con el día.");
  });

  it("reads manner from the graded work and refuses a diagnosis", () => {
    const view = buildProgressProfile(ELIAS_STUDENT_KEY, ELIAS_READ_SCORES, {
      throughDay: 40,
      completed: 180,
      scheduled: 190,
    });
    const blob = view.readings.map((reading) => reading.text).join(" ");
    expect(view.calendar).toContain("día 40 de 200");
    expect(view.pace).toBe("Va con el día.");
    expect(blob).toContain("frase exacta");
    expect(blob).toContain("will");
    expect(view.footnote).toContain("no es un diagnóstico");
    expect(blob).not.toMatch(/TDAH|dislexia|autismo|trastorno|PIRLS|TIMSS/i);
  });

  it("hides the manner reading when the scores no longer match it", () => {
    const changed = { ...ELIAS_READ_SCORES, "d41:len": 90 };
    const view = buildProgressProfile(ELIAS_STUDENT_KEY, changed, {
      throughDay: 41,
      completed: 1,
      scheduled: 1,
    });
    const blob = view.readings.map((reading) => reading.text).join(" ");
    expect(scoreSignature(changed)).not.toBe(scoreSignature(ELIAS_READ_SCORES));
    expect(blob).toContain("no se muestra");
    expect(blob).not.toContain("Bezaleel");
  });
});
