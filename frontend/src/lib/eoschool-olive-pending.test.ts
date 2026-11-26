import { describe, expect, it } from "vitest";
import { olivePendingItems, photosForSubject } from "./eoschool-olive-pending";

describe("olive pending", () => {
  it("counts photos only for the subject key", () => {
    expect(photosForSubject({ "d1:mat": ["a", "b"], "d2:bib": ["c"] }, "mat")).toBe(2);
  });

  it("marks a semester and a subject pending until eoschool has the evidence", () => {
    const items = olivePendingItems({
      semesterWorks: [{ semester: 1, driveUrl: "https://drive.google.com/file/d/abc" }],
      activityPhotoFiles: { "d1:bib": ["a", "b", "c", "d", "e"] },
      outings: [],
    });
    const first = items.find((item) => item.label.startsWith("Trabajo del 1"));
    const second = items.find((item) => item.label.startsWith("Trabajo del 2"));
    const bible = items.find((item) => item.label === "Biblia");
    const math = items.find((item) => item.label === "Matemáticas");
    const outings = items.find((item) => item.label === "Planilla de salidas");
    expect(first?.pending).toBe(false);
    expect(second?.pending).toBe(true);
    expect(bible?.pending).toBe(false);
    expect(math?.pending).toBe(true);
    expect(outings?.pending).toBe(true);
  });
});
