import { describe, expect, it } from "vitest";
import { buildMppeCoverage, flattenMppeObjectives, type MppeChecklist } from "./homescool-mppe";

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
          ],
        },
      ],
    },
  ],
};

describe("homescool-mppe coverage", () => {
  it("flattens catalog objectives", () => {
    expect(flattenMppeObjectives(sample)).toHaveLength(1);
  });

  it("marks imbued when a class declares the id", () => {
    const { rows, imbued, total } = buildMppeCoverage(sample, [
      {
        key: "c3-w1-d1-l6-geo",
        mppe: { objectives: [{ id: "ide-ven-01", label: "Estados y capitales" }] },
      },
    ]);
    expect(total).toBe(1);
    expect(imbued).toBe(1);
    expect(rows[0].status).toBe("imbued");
    expect(rows[0].classKeys).toContain("c3-w1-d1-l6-geo");
  });

  it("keeps gap when nothing declares the id", () => {
    const { imbued, rows } = buildMppeCoverage(sample, [{ key: "c3-w1-d1-l6-mat" }]);
    expect(imbued).toBe(0);
    expect(rows[0].status).toBe("gap");
  });
});
