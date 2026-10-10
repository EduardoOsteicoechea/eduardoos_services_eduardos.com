import { describe, expect, it } from "vitest";
import { formatIssueClipboardText } from "./ereport-quick-connector";

describe("formatIssueClipboardText", () => {
  it("formats labeled ids and nombre/incidencia text", () => {
    const text = formatIssueClipboardText({
      reportId: "rep-1",
      sectionId: "sec-2",
      groupId: "grp-3",
      itemId: "item-4",
      nombre: "Broken menu",
      incidencia: "Hamburger does not open on phone.",
    });
    expect(text).toBe(
      [
        "reportId: rep-1",
        "sectionId: sec-2",
        "groupId: grp-3",
        "itemId: item-4",
        "nombre: Broken menu",
        "incidencia: Hamburger does not open on phone.",
      ].join("\n"),
    );
  });

  it("omits empty nombre/incidencia lines", () => {
    const text = formatIssueClipboardText({
      reportId: "r",
      sectionId: "s",
      groupId: "g",
      itemId: "i",
      nombre: "Title only",
    });
    expect(text).toContain("nombre: Title only");
    expect(text).not.toContain("incidencia:");
  });
});
