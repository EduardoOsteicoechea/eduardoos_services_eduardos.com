import { describe, expect, it } from "vitest";
import { cloudSaveRefusalMessage } from "./epams";

describe("cloudSaveRefusalMessage", () => {
  it("maps missing session / 401", () => {
    const msg = cloudSaveRefusalMessage(401, { error: "unauthorized" });
    expect(msg).toMatch(/Sesión no disponible o expirada/i);
  });

  it("maps csrf / 403", () => {
    const msg = cloudSaveRefusalMessage(403, { error: "csrf_invalid" });
    expect(msg).toMatch(/CSRF/i);
  });

  it("includes code and detail for other errors", () => {
    const msg = cloudSaveRefusalMessage(500, {
      error: "internal_error",
      message: "Something broke.",
    });
    expect(msg).toContain("internal_error");
    expect(msg).toContain("Something broke.");
  });
});
