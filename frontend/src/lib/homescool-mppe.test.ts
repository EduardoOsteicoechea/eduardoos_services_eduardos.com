import { describe, expect, it } from "vitest";
import {
  buildMppeCoverage,
  buildMppeScheduleReport,
  flattenMppeObjectives,
  type MppeChecklist,
} from "./homescool-mppe";

const sample: MppeChecklist = {
  format: "homescool-mppe-checklist",
  version: 1,
  grade: 3,
  areas: [
    {
      id: "ide",
      title: "Identidad",
      components: [
        {
          id: "ide-ven",
          title: "Venezuela en el Mundo",
          objectives: [
            {
              id: "ide-ven-01",
              content: "Estados",
              aprendizaje: "Conoce estados y capitales.",
            },
            {
              id: "ide-ter-01",
              content: "Mapa",
              aprendizaje: "Ubica Venezuela en el mapa.",
            },
          ],
        },
      ],
    },
  ],
};

describe("homescool-mppe coverage", () => {
  it("flattens catalog objectives", () => {
    expect(flattenMppeObjectives(sample)).toHaveLength(2);
  });

  it("marks imbued when a class declares the id", () => {
    const { rows, imbued, total } = buildMppeCoverage(sample, [
      {
        key: "c3-w1-d1-l6-geo",
        cycle: 3,
        week: 1,
        day: 1,
        level: 6,
        subject: "geo",
        mppe: { objectives: [{ id: "ide-ven-01", label: "Estados y capitales" }] },
      },
    ]);
    expect(total).toBe(2);
    expect(imbued).toBe(1);
    expect(rows[0].status).toBe("imbued");
    expect(rows[0].classKeys).toContain("c3-w1-d1-l6-geo");
  });

  it("keeps gap when nothing declares the id", () => {
    const { imbued, rows } = buildMppeCoverage(sample, [
      { key: "c3-w1-d1-l6-mat", cycle: 3, week: 1, day: 1, level: 6, subject: "mat" },
    ]);
    expect(imbued).toBe(0);
    expect(rows[0].status).toBe("gap");
  });
});

describe("homescool-mppe schedule report", () => {
  it("groups by cycle → week → day → class", () => {
    const report = buildMppeScheduleReport(sample, [
      {
        key: "c3-w1-d1-l6-geo",
        cycle: 3,
        week: 1,
        day: 1,
        level: 6,
        subject: "geo",
        title: "Estados",
        mppe: {
          objectives: [
            { id: "ide-ven-01", label: "Estados" },
            { id: "ide-ter-01", label: "Mapa" },
          ],
        },
      },
      {
        key: "c3-w1-d2-l6-his",
        cycle: 3,
        week: 1,
        day: 2,
        level: 6,
        subject: "his",
        title: "Historia",
        mppe: { objectives: [{ id: "ide-ven-01", label: "Estados" }] },
      },
      {
        key: "c3-w2-d1-l6-mat",
        cycle: 3,
        week: 2,
        day: 1,
        level: 6,
        subject: "mat",
        title: "Sumas",
      },
    ]);
    expect(report.cycles).toHaveLength(1);
    expect(report.cycles[0].cycle).toBe(3);
    expect(report.cycles[0].weeks).toHaveLength(2);
    expect(report.cycles[0].weeks[0].week).toBe(1);
    expect(report.cycles[0].weeks[0].days).toHaveLength(2);
    expect(report.cycles[0].weeks[0].days[0].day).toBe(1);
    expect(report.cycles[0].weeks[0].days[0].classes[0].subject).toBe("geo");
    expect(report.cycles[0].weeks[0].days[0].classes[0].objectives).toHaveLength(2);
    expect(report.classesWithMppe).toBe(2);
    expect(report.uniqueObjectiveIds).toEqual(["ide-ter-01", "ide-ven-01"]);
    expect(report.cycles[0].weeks[1].classesWithMppe).toBe(0);
  });
});
