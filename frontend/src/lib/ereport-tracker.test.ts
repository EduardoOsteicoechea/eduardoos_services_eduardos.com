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

  it("uploads new images as files and keeps legacy dataUrl only as a display fallback", () => {
    expect(tracker).toContain("uploadImageFile");
    expect(tracker).toContain("imageSrc");
    expect(tracker).not.toContain("reader.readAsDataURL(file)");
    expect(tracker).not.toMatch(/aws-sdk|S3_BUCKET/i);
  });
});
