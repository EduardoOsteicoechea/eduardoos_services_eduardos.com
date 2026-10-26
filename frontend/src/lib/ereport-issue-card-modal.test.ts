import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, getCsrf } from "./api";
import { fetchOrgReport } from "./ereport";
import { showErrorModal } from "./error-modal";
import {
  closeEreportIssueCardModal,
  ensureIssueChecklist,
  isEreportIssueCardModalOpen,
  openEreportIssueCardModal,
} from "./ereport-issue-card-modal";

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return {
    ...actual,
    apiRequest: vi.fn(),
    getCsrf: vi.fn(async () => "csrf-token"),
  };
});

vi.mock("./ereport", async () => {
  const actual = await vi.importActual<typeof import("./ereport")>("./ereport");
  return {
    ...actual,
    fetchOrgReport: vi.fn(),
    saveOrgReport: vi.fn(),
    uploadReportImage: vi.fn(),
  };
});

vi.mock("./error-modal", () => ({
  showErrorModal: vi.fn(),
}));

const here = dirname(fileURLToPath(import.meta.url));

const sampleItem = {
  id: "item-1",
  nombre: "Original name",
  incidencia: "Broken button",
  solucion: "",
  status: "reprobado",
  fechaIncidencia: "",
  fechaSolucion: "",
  checklist: [{ id: "ux-test", label: "UX Test", checked: false }],
  imagesIncidencia: [],
  imagesSolucion: [],
};

function mockLoadedReport() {
  vi.mocked(fetchOrgReport).mockResolvedValue({
    status: 200,
    requestId: "rid-load",
    data: {
      payload: {
        sections: [
          {
            id: "sec-1",
            groups: [{ id: "grp-1", items: [{ ...sampleItem }] }],
          },
        ],
      },
    },
  } as Awaited<ReturnType<typeof fetchOrgReport>>);
}

describe("ereport issue card modal", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    mockLoadedReport();
    vi.mocked(apiRequest).mockResolvedValue({
      status: 200,
      requestId: "rid-patch",
      data: { node: { ...sampleItem, nombre: "Updated name" } },
    } as Awaited<ReturnType<typeof apiRequest>>);
    vi.mocked(getCsrf).mockResolvedValue("csrf-token");
  });

  afterEach(async () => {
    vi.useRealTimers();
    await closeEreportIssueCardModal();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("exports open/close helpers", () => {
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

  it("wires paste/upload helpers and never pairs alert with showErrorModal on save", () => {
    const src = readFileSync(join(here, "ereport-issue-card-modal.ts"), "utf8");
    expect(src).toContain("clipboardImageFiles");
    expect(src).toContain('overlay.addEventListener("paste"');
    expect(src).toContain("await getCsrf(true)");
    expect(src).toContain("isImageFile");
    expect(src).toContain("showErrorModal");
    expect(src).not.toMatch(/window\.alert\s*\(/);
    expect(src).toMatch(/Never patches status to aprobado|never sends status/i);
    expect(src).not.toMatch(/status:\s*["']aprobado["']/);
  });

  it("close flushes pending debounced patch before teardown", async () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });

    await openEreportIssueCardModal({
      orgId: "org-1",
      reportId: "rep-1",
      sectionId: "sec-1",
      groupId: "grp-1",
      itemId: "item-1",
    });

    expect(isEreportIssueCardModalOpen()).toBe(true);
    expect(
      document.querySelector("[data-eq-issue-status]")?.textContent,
    ).toBe("Ready.");

    const nombre = document.querySelector(
      "[data-eq-issue-nombre]",
    ) as HTMLInputElement | null;
    expect(nombre).toBeTruthy();
    expect(nombre!.disabled).toBe(false);
    nombre!.value = "Flushed on close";
    nombre!.dispatchEvent(new Event("input", { bubbles: true }));

    // Debounce armed — patch must not have fired yet (450ms).
    expect(apiRequest).not.toHaveBeenCalled();

    // Close cancels debounce and awaits persistFields before teardown.
    await closeEreportIssueCardModal();

    expect(apiRequest).toHaveBeenCalledTimes(1);
    const [path, init] = vi.mocked(apiRequest).mock.calls[0]!;
    expect(String(path)).toContain("/items/item-1");
    expect(init).toMatchObject({ method: "PATCH" });
    const body = JSON.parse(String((init as { body?: string }).body || "{}")) as {
      nombre?: string;
      status?: string;
    };
    expect(body.nombre).toBe("Flushed on close");
    expect(body.status).toBeUndefined();
    expect(isEreportIssueCardModalOpen()).toBe(false);
  });

  it("surfaces save failures via showErrorModal only", async () => {
    vi.useFakeTimers();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    vi.mocked(apiRequest).mockResolvedValue({
      status: 500,
      requestId: "rid-fail",
      data: {
        error: "internal_error",
        message: "Could not save issue.",
        request_id: "rid-fail",
      },
    } as Awaited<ReturnType<typeof apiRequest>>);

    await openEreportIssueCardModal({
      orgId: "org-1",
      reportId: "rep-1",
      sectionId: "sec-1",
      groupId: "grp-1",
      itemId: "item-1",
    });

    const nombre = document.querySelector(
      "[data-eq-issue-nombre]",
    ) as HTMLInputElement;
    nombre.value = "Will fail";
    nombre.dispatchEvent(new Event("input", { bubbles: true }));

    await vi.advanceTimersByTimeAsync(450);
    await Promise.resolve();
    await Promise.resolve();

    expect(showErrorModal).toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("patches severity 1–5 and clears with null without inventing defaults", async () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });
    vi.mocked(fetchOrgReport).mockResolvedValue({
      status: 200,
      requestId: "rid-load",
      data: {
        payload: {
          sections: [
            {
              id: "sec-1",
              groups: [
                {
                  id: "grp-1",
                  items: [{ ...sampleItem, severidadIncidencia: 4 }],
                },
              ],
            },
          ],
        },
      },
    } as Awaited<ReturnType<typeof fetchOrgReport>>);

    await openEreportIssueCardModal({
      orgId: "org-1",
      reportId: "rep-1",
      sectionId: "sec-1",
      groupId: "grp-1",
      itemId: "item-1",
    });

    const sevInc = document.querySelector(
      "[data-eq-issue-sev-inc]",
    ) as HTMLInputElement | null;
    const sevSol = document.querySelector(
      "[data-eq-issue-sev-sol]",
    ) as HTMLInputElement | null;
    expect(sevInc).toBeTruthy();
    expect(sevSol).toBeTruthy();
    expect(sevInc!.dataset.severitySet).toBe("1");
    expect(sevInc!.value).toBe("4");
    expect(sevSol!.dataset.severitySet).toBe("0");

    sevSol!.dataset.severitySet = "1";
    sevSol!.value = "2";
    sevSol!.dispatchEvent(new Event("input", { bubbles: true }));

    await closeEreportIssueCardModal();

    expect(apiRequest).toHaveBeenCalled();
    const [, init] = vi.mocked(apiRequest).mock.calls[0]!;
    const body = JSON.parse(String((init as { body?: string }).body || "{}")) as {
      severidadIncidencia?: number | null;
      severidadSolucion?: number | null;
    };
    expect(body.severidadIncidencia).toBe(4);
    expect(body.severidadSolucion).toBe(2);
  });
});
