import { describe, expect, it } from "vitest";
import { buildRevisionChatSeedMessage, type RevisionScoring } from "./homescool-revision";

describe("homescool-revision", () => {
  it("builds a Spanish coaching seed from scoring", () => {
    const scoring: RevisionScoring = {
      mcqCorrect: 5,
      mcqTotal: 8,
      mcq: Array.from({ length: 8 }, (_, i) => ({
        n: i + 1,
        prompt: "q",
        expected: "a",
        selectedKey: "A",
        selectedText: "a",
        correct: i < 5,
        illegible: false,
      })),
      write: [],
    };
    const msg = buildRevisionChatSeedMessage(scoring, "Tablas");
    expect(msg).toContain("Tablas");
    expect(msg).toContain("5/8");
    expect(msg).toContain("3 para reforzar");
  });
});
