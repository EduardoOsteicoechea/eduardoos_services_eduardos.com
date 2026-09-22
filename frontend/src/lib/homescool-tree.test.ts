import { describe, expect, it } from "vitest";
import { buildHomescoolTree } from "./homescool-tree";
import type { HomescoolMaterial } from "./homescool";

function mat(partial: Partial<HomescoolMaterial> & Pick<HomescoolMaterial, "id" | "cycle" | "week" | "day" | "subject" | "title">): HomescoolMaterial {
  return {
    ownerUserId: "u1",
    slug: partial.id,
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("buildHomescoolTree", () => {
  it("nests ciclo → semana → día → materia → material and always includes cycles 1–3", () => {
    const tree = buildHomescoolTree([
      mat({ id: "a", cycle: 3, week: 1, day: 2, subject: "ciencias", title: "Plantas" }),
      mat({ id: "b", cycle: 3, week: 1, day: 2, subject: "ciencias", title: "Animales" }),
    ]);
    expect(tree.map((n) => n.label)).toEqual(["Ciclo 1", "Ciclo 2", "Ciclo 3"]);
    expect(tree[0].children).toEqual([]);
    expect(tree[2].children).toHaveLength(1);
    const week = tree[2].children[0];
    expect(week.kind).toBe("week");
    expect(week.label).toBe("Semana 1");
    const day = week.children[0];
    expect(day.kind).toBe("day");
    expect(day.label).toBe("Día 2");
    const subj = day.children[0];
    expect(subj.kind).toBe("subject");
    expect(subj.label).toBe("ciencias");
    expect(subj.children.map((c) => (c.kind === "material" ? c.title : ""))).toEqual(["Animales", "Plantas"]);
  });
});
