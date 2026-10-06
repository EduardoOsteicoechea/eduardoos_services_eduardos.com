import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSessionHint, markSessionHint, resetCsrfMemory } from "./api";
import {
  DEFAULT_CURRICULUM_STUDENT_KEY,
  fetchCurriculumProgress,
  patchCurriculumSection,
} from "./eoschool-curriculum-api";

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name: string) {
        const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
        return key ? headers[key] : null;
      },
    },
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

describe("eoschool-curriculum-api", () => {
  beforeEach(() => {
    resetCsrfMemory();
    clearSessionHint();
    vi.unstubAllGlobals();
  });

  it("loads progress with cookie session path (no double /api)", async () => {
    markSessionHint();
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(
        200,
        {
          student: {
            studentKey: DEFAULT_CURRICULUM_STUDENT_KEY,
            displayName: "Elías Osteicoechea",
            age: 8,
            grade: "3er grado",
          },
          sectionsDone: ["d1:bib"],
        },
        { "X-Request-ID": "rid-progress" },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const loaded = await fetchCurriculumProgress();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.data.sectionsDone).toEqual(["d1:bib"]);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `/api/eoschool/curriculum/progress?studentKey=${DEFAULT_CURRICULUM_STUDENT_KEY}`,
    );
    expect(fetchMock.mock.calls[0][1].credentials).toBe("include");
  });

  it("treats 401 as guest without throwing", async () => {
    const fetchMock = vi
      .fn()
      // product GET → 401, then cookie refresh attempt (csrf + refresh) also fails
      .mockResolvedValueOnce(jsonResponse(401, { error: "unauthorized", message: "Sign in to continue." }))
      .mockResolvedValueOnce(jsonResponse(200, { csrf: "refresh-csrf" }))
      .mockResolvedValueOnce(jsonResponse(401, { error: "unauthorized", message: "Sign in to continue." }));
    vi.stubGlobal("fetch", fetchMock);
    const loaded = await fetchCurriculumProgress();
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.status).toBe(401);
    expect(fetchMock.mock.calls.some((call) => call[0] === "/api/auth/refresh")).toBe(true);
  });

  it("PATCHes section with CSRF and remints on csrf_invalid", async () => {
    markSessionHint();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { csrf: "csrf-1" }))
      .mockResolvedValueOnce(jsonResponse(403, { error: "csrf_invalid", message: "Security check failed." }))
      .mockResolvedValueOnce(jsonResponse(200, { csrf: "csrf-2" }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          student: {
            studentKey: DEFAULT_CURRICULUM_STUDENT_KEY,
            displayName: "Elías Osteicoechea",
            age: 8,
            grade: "3er grado",
          },
          sectionsDone: ["d1:mat"],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const data = await patchCurriculumSection({
      studentKey: DEFAULT_CURRICULUM_STUDENT_KEY,
      dayId: "d1",
      sectionId: "mat",
      completed: true,
    });
    expect(data.sectionsDone).toEqual(["d1:mat"]);
    const patchCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes("/eoschool/curriculum/progress/sections"),
    );
    expect(patchCalls).toHaveLength(2);
    expect(patchCalls[1][1].headers.get("X-CSRF-Token")).toBe("csrf-2");
  });
});
