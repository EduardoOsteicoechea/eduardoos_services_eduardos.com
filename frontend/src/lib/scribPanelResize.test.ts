import { describe, expect, it } from "vitest";
import {
  clampRefPanelWidthRem,
  SCRIB_REF_PANEL_WIDTH_MAX_REM,
  SCRIB_REF_PANEL_WIDTH_MIN_REM,
} from "./scribPanelResize";

describe("clampRefPanelWidthRem", () => {
  it("clamps to min/max", () => {
    expect(clampRefPanelWidthRem(0)).toBe(SCRIB_REF_PANEL_WIDTH_MIN_REM);
    expect(clampRefPanelWidthRem(999)).toBe(SCRIB_REF_PANEL_WIDTH_MAX_REM);
    expect(clampRefPanelWidthRem(20)).toBe(20);
  });
});
