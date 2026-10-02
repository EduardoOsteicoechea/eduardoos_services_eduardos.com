/**
 * Homescool / eoschool revision: browser image compress + OCR API client.
 */

import { apiSend, setAgentRoutePayload, type ChatTurn } from "./api";
import { mustLog } from "./dev-log";
import type { EoschoolDocument } from "./homescool";
import { toEoschoolDocument, type HomescoolCurriculumClass } from "./homescool-curriculum";

export type RevisionMCQExtract = {
  n: number;
  selectedKey: string;
  selectedText: string;
  illegible: boolean;
};

export type RevisionWriteExtract = {
  n: number;
  text: string;
  illegible: boolean;
};

export type RevisionExtraction = {
  mcq: RevisionMCQExtract[];
  write: RevisionWriteExtract[];
};

export type RevisionMCQScore = {
  n: number;
  prompt: string;
  expected: string;
  selectedKey: string;
  selectedText: string;
  correct: boolean;
  illegible: boolean;
};

export type RevisionWriteScore = {
  n: number;
  prompt: string;
  text: string;
  illegible: boolean;
};

export type RevisionScoring = {
  mcqCorrect: number;
  mcqTotal: number;
  mcq: RevisionMCQScore[];
  write: RevisionWriteScore[];
};

export type RevisionOCRResult = {
  extraction: RevisionExtraction;
  scoring: RevisionScoring;
  class: {
    cycle: number;
    week: number;
    day: number;
    subject: string;
    level: number;
    title: string;
    key: string;
  };
  error?: string;
  requestId?: string;
};

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), type, quality));
}

/** Downscale/compress in the browser (turquesa eostore pattern). */
export async function compressImageForUpload(
  file: File,
  maxEdge = 2000,
  startQuality = 0.82,
  targetBytes = 900 * 1024,
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }
  try {
    const img = await loadImageElement(file);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) {
      return file;
    }
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }
    ctx.drawImage(img, 0, 0, cw, ch);

    let quality = startQuality;
    let blob = await canvasToBlob(canvas, "image/webp", quality);
    if (!blob) {
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
    }
    while (blob && blob.size > targetBytes && quality > 0.5) {
      quality = Math.round((quality - 0.1) * 100) / 100;
      const smaller = await canvasToBlob(canvas, blob.type || "image/webp", quality);
      if (!smaller) {
        break;
      }
      blob = smaller;
    }
    if (!blob) {
      return file;
    }
    const ext = blob.type === "image/png" ? ".png" : blob.type === "image/jpeg" ? ".jpg" : ".webp";
    const name = file.name.replace(/\.[^.]+$/, "") + ext;
    if (mustLog) {
      console.log("[homescool-revision] image.compressed", { from: file.size, to: blob.size, type: blob.type });
    }
    return new File([blob], name, { type: blob.type });
  } catch {
    return file;
  }
}

export async function postHomescoolRevisionOCR(opts: {
  cycle: number;
  week: number;
  day: number;
  subject: string;
  document: EoschoolDocument;
  files: File[];
}): Promise<RevisionOCRResult> {
  const files = opts.files.slice(0, 2);
  if (!files.length) {
    return {
      extraction: { mcq: [], write: [] },
      scoring: { mcqCorrect: 0, mcqTotal: 0, mcq: [], write: [] },
      class: {
        cycle: opts.cycle,
        week: opts.week,
        day: opts.day,
        subject: opts.subject,
        level: 6,
        title: "",
        key: "",
      },
      error: "Selecciona al menos una foto del quiz.",
    };
  }
  const prepared: File[] = [];
  for (const file of files) {
    prepared.push(await compressImageForUpload(file));
  }
  const body = new FormData();
  body.append("cycle", String(opts.cycle));
  body.append("week", String(opts.week));
  body.append("day", String(opts.day));
  body.append("subject", opts.subject);
  body.append("document", JSON.stringify(opts.document));
  body.append("file", prepared[0]);
  if (prepared[1]) {
    body.append("file2", prepared[1]);
  }
  if (mustLog) {
    console.log("[homescool-revision] ocr.upload", {
      cycle: opts.cycle,
      week: opts.week,
      day: opts.day,
      subject: opts.subject,
      files: prepared.map((f) => ({ name: f.name, size: f.size, type: f.type })),
    });
  }
  const { status, data, requestId } = await apiSend<RevisionOCRResult & { message?: string; error?: string }>(
    "/homescool/revision/ocr",
    { method: "POST", body },
    { timeoutMs: 120000 },
  );
  if (status < 200 || status >= 300) {
    return {
      extraction: { mcq: [], write: [] },
      scoring: { mcqCorrect: 0, mcqTotal: 0, mcq: [], write: [] },
      class: {
        cycle: opts.cycle,
        week: opts.week,
        day: opts.day,
        subject: opts.subject,
        level: 6,
        title: "",
        key: "",
      },
      error: data.message || `OCR failed (${status})`,
      requestId,
    };
  }
  return { ...data, requestId };
}

export function publishRevisionAgentPayload(payload: {
  classDoc: EoschoolDocument;
  scoring: RevisionScoring;
  extraction: RevisionExtraction;
  classMeta: RevisionOCRResult["class"];
}): void {
  setAgentRoutePayload({
    kind: "eoschool-revision",
    class: payload.classMeta,
    title: payload.classDoc.title,
    lesson: {
      kind: payload.classDoc.lesson.kind,
      points: payload.classDoc.lesson.points.map((p) => ({
        heading: p.heading,
        body: (p.body || "").slice(0, 800),
      })),
      summary: payload.classDoc.lesson.summary,
    },
    scoring: payload.scoring,
    extraction: payload.extraction,
    coach: "Eres coach del padre/tutor Homescool. Prioriza gaps del quiz y da 2–4 acciones concretas para practicar con el niño.",
  });
}

export function buildRevisionChatSeedMessage(scoring: RevisionScoring, title: string): string {
  const wrong = scoring.mcq.filter((m) => !m.correct).length;
  return `Evalúa esta revisión de «${title}»: ${scoring.mcqCorrect}/${scoring.mcqTotal} MCQ correctas, ${wrong} para reforzar, y 4 respuestas escritas. ¿Qué debo trabajar con el niño?`;
}

export function revisionClassFromCurriculum(row: HomescoolCurriculumClass): EoschoolDocument {
  return toEoschoolDocument(row);
}

export type RevisionChatState = {
  history: ChatTurn[];
};
