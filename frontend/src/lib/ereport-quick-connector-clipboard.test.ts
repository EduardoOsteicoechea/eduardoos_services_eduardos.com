import { describe, expect, it } from "vitest";
import {
  formatIssueClipboardText,
  isWebsiteIssueOpen,
} from "./ereport-quick-connector";

describe("isWebsiteIssueOpen", () => {
  it("hides aprobado status", () => {
    expect(isWebsiteIssueOpen({ status: "aprobado" })).toBe(false);
  });

  it("hides when every checklist row is checked", () => {
    expect(
      isWebsiteIssueOpen({
        status: "reprobado",
        checklist: [
          { checked: true },
          { checked: true },
        ],
      }),
    ).toBe(false);
  });

  it("keeps reprobado / partial / empty checklist open", () => {
    expect(isWebsiteIssueOpen({ status: "reprobado" })).toBe(true);
    expect(
      isWebsiteIssueOpen({
        status: "",
        checklist: [{ checked: true }, { checked: false }],
      }),
    ).toBe(true);
    expect(isWebsiteIssueOpen({ status: "", checklist: [] })).toBe(true);
  });
});


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
