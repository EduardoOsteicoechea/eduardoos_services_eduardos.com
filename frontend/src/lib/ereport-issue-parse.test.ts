import { describe, expect, it } from "vitest";
import { parseIssueText } from "./ereport-issue-parse";

describe("parseIssueText", () => {
  it("uses full text as name when there is no period", () => {
    expect(parseIssueText("Broken header")).toEqual({
      nombre: "Broken header",
      incidencia: "Broken header",
    });
  });

  it("splits on the first period", () => {
    expect(parseIssueText("Login fails. The submit button does nothing.")).toEqual({
      nombre: "Login fails",
      incidencia: "The submit button does nothing.",
    });
  });

  it("trims whitespace", () => {
    expect(parseIssueText("  Title.  Body  ")).toEqual({
      nombre: "Title",
      incidencia: "Body",
    });
  });

  it("returns empty for blank input", () => {
    expect(parseIssueText("   ")).toEqual({ nombre: "", incidencia: "" });
  });
});
