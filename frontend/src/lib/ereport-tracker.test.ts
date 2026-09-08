import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const tracker = readFileSync(join(here, "../../public/ereport-tracker.html"), "utf8");

describe("vendored tracker assets", () => {
  it("does not load html2canvas or jsPDF from a CDN", () => {
    expect(tracker).not.toMatch(/cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com/i);
    expect(tracker).toContain('src="/vendor/html2canvas.min.js"');
    expect(tracker).toContain('src="/vendor/jspdf.umd.min.js"');
  });

  it("can add a main section and a section-level open issue", () => {
    expect(tracker).toContain('data-act="add-section"');
    expect(tracker).toContain("function addSection(");
    expect(tracker).toContain("function addSectionItem(");
    expect(tracker).toContain('data-act="add-section-item"');
    expect(tracker).toContain('const SECTION_ITEMS = "__section__"');
    expect(tracker).toContain("sec.items");
  });

  it("parses: every inline script compiles", () => {
    const blocks = [...tracker.matchAll(/<script(?![^>]*src=)([^>]*)>([\s\S]*?)<\/script>/g)];
    const js = blocks.filter(([, attrs]) => !/type=["']application\/json["']/.test(attrs));
    expect(js.length).toBeGreaterThan(0);
    for (const [, , code] of js) {
      expect(() => new Function(code)).not.toThrow();
    }
  });

  it("can add, retype and delete subsections and sections from the canvas", () => {
    for (const act of ["add-group", "del-group", "del-section", "toggle-kind"]) {
      expect(tracker).toContain(`data-act="${act}"`);
      expect(tracker).toContain(`root.querySelectorAll('[data-act="${act}"]')`);
    }
    expect(tracker).toContain("function addGroup(");
    expect(tracker).toContain("function removeGroup(");
    expect(tracker).toContain("function removeSection(");
    expect(tracker).toContain("function toggleSectionKind(");
  });

  it("keeps the add-section control in the canvas, not in the host header", () => {
    expect(tracker).toMatch(/<div class="app-actions">[\s\S]{0,300}data-act="add-section"/);
  });

  it("runs every documented host command", () => {
    for (const command of ["add-section", "add-group", "add-open-issue", "criteria", "collapse-all", "expand-all"]) {
      expect(tracker).toContain(`case "${command}":`);
    }
    expect(tracker).toContain("function currentSectionId(");
    expect(tracker).toContain("function setAllCollapsed(");
  });

  it("drops a removed validation criterion from open issues too", () => {
    expect(tracker).toContain("(sec.items || []).forEach(dropCriterion)");
    expect(tracker).toContain("(grp.items || []).forEach(dropCriterion)");
  });

  it("uploads new images as files and keeps legacy dataUrl only as a display fallback", () => {
    expect(tracker).toContain("uploadImageFile");
    expect(tracker).toContain("imageSrc");
    expect(tracker).not.toContain("reader.readAsDataURL(file)");
    expect(tracker).not.toMatch(/aws-sdk|S3_BUCKET/i);
  });
});
