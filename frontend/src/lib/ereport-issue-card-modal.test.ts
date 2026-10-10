import { describe, expect, it } from "vitest";
import {
  closeEreportIssueCardModal,
  isEreportIssueCardModalOpen,
  openEreportIssueCardModal,
} from "./ereport-connector-modal";
import { ensureIssueChecklist } from "./ereport-issue-card-modal";

describe("ereport issue card modal API", () => {
  it("exports open/close helpers from connector-modal", () => {
    expect(typeof openEreportIssueCardModal).toBe("function");
    expect(typeof closeEreportIssueCardModal).toBe("function");
    expect(typeof isEreportIssueCardModalOpen).toBe("function");
    expect(isEreportIssueCardModalOpen()).toBe(false);
  });

  it("no-ops open when ids are missing", async () => {
    await openEreportIssueCardModal({
      orgId: "",
      reportId: "r",
      sectionId: "s",
      groupId: "g",
      itemId: "i",
    });
    expect(isEreportIssueCardModalOpen()).toBe(false);
    closeEreportIssueCardModal();
  });

  it("never returns an empty checklist (avoids legacy aprobado heal)", () => {
    const seeded = ensureIssueChecklist([]);
    expect(seeded).toHaveLength(1);
    expect(seeded[0]?.checked).toBe(false);
    expect(ensureIssueChecklist(undefined)).toHaveLength(1);
    expect(
      ensureIssueChecklist([{ id: "a", label: "Keep", checked: true }]),
    ).toEqual([{ id: "a", label: "Keep", checked: true }]);
  });
});
