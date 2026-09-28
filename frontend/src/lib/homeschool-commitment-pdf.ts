import { mustLog } from "./dev-log";

const PAGE_URLS = [
  "/Compromiso_la_vid_1.jpeg",
  "/Compromiso_la_vid_2.jpeg",
] as const;

type JsPdfCtor = new (options?: {
  orientation?: "p" | "portrait" | "l" | "landscape";
  unit?: "pt" | "mm" | "cm" | "in";
  format?: string | number[];
}) => {
  addImage: (
    imageData: string,
    format: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => void;
  addPage: () => void;
  save: (filename: string) => void;
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
};

declare global {
  interface Window {
    jspdf?: { jsPDF: JsPdfCtor };
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve({
        dataUrl: canvas.toDataURL("image/jpeg", 0.92),
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => reject(new Error(`Failed to load image ${url}`));
    img.src = url;
  });
}

function fitImageToPage(
  pageW: number,
  pageH: number,
  imgW: number,
  imgH: number,
): { x: number; y: number; w: number; h: number } {
  const scale = Math.min(pageW / imgW, pageH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return {
    x: (pageW - w) / 2,
    y: (pageH - h) / 2,
    w,
    h,
  };
}

export async function downloadCommitmentPdf(
  fileName = "Compromiso_la_vid.pdf",
): Promise<void> {
  if (mustLog) console.log("[homeschool-commitment] pdf.start");

  await loadScript("/vendor/jspdf.umd.min.js");
  const JsPDF = window.jspdf?.jsPDF;
  if (!JsPDF) {
    throw new Error("jsPDF unavailable");
  }

  const pages = await Promise.all(PAGE_URLS.map((url) => loadImageAsDataUrl(url)));
  const first = pages[0];
  const orientation = first.width >= first.height ? "l" : "p";
  const pdf = new JsPDF({ orientation, unit: "pt", format: "letter" });

  pages.forEach((page, index) => {
    if (index > 0) pdf.addPage();
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const box = fitImageToPage(pageW, pageH, page.width, page.height);
    pdf.addImage(page.dataUrl, "JPEG", box.x, box.y, box.w, box.h);
  });

  pdf.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
  if (mustLog) console.log("[homeschool-commitment] pdf.done", { pages: pages.length });
}

export const commitmentPageUrls = PAGE_URLS;
