/**
 * Homescool activity progress: worksheet photo upload → OCR → score.
 */

import { apiSend, uploadFile } from "./api";
import { mustLog } from "./dev-log";
import type { EoschoolDocument } from "./homescool";

export type HomescoolProgressExtraction = {
  rawText: string;
  blocks: Array<{ kind: string; label: string; text: string; illegible: boolean }>;
  mcq: Array<{ n: number; selectedKey: string; selectedText: string; illegible: boolean }>;
  write: Array<{ n: number; text: string; illegible: boolean }>;
};

export type HomescoolProgressPhoto = {
  id: string;
  storageName: string;
  thumbName: string;
  contentType: string;
  bytes: number;
  createdAt: string;
  extraction: HomescoolProgressExtraction;
  status: string;
  url?: string;
  thumbUrl?: string;
};

export type HomescoolProgress = {
  id: string;
  ownerUserId: string;
  studentKey: string;
  cycle: number;
  week: number;
  day: number;
  subject: string;
  cellKey: string;
  materialId?: string;
  photos: HomescoolProgressPhoto[];
  studyState: {
    interpretedAnswers: Array<{
      n: number;
      type: string;
      prompt: string;
      studentSaid: string;
      assessment: string;
      ok: boolean;
    }>;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    teacherSuggestions: string[];
  };
  score: { value: number; scale: number; rationale: string };
  updatedAt: string;
  createdAt: string;
};

export type HomescoolProgressSummary = {
  cycle: number;
  week: number;
  studentKey: string;
  averageScore: number;
  scoredCount: number;
  bySubject: Record<string, number>;
  byDay: Record<string, number>;
  items: Array<{
    cellKey: string;
    cycle: number;
    week: number;
    day: number;
    subject: string;
    score: number;
    photoCount: number;
    summary: string;
    updatedAt: string;
    strengths: string[];
    weaknesses: string[];
    teacherSuggestions: string[];
  }>;
  strengths: string[];
  weaknesses: string[];
  teacherSuggestions: string[];
};

export async function fetchHomescoolProgress(opts: {
  cycle: number;
  week: number;
  day: number;
  subject: string;
}): Promise<{ progress: HomescoolProgress | null; error?: string; requestId?: string }> {
  const q = new URLSearchParams({
    cycle: String(opts.cycle),
    week: String(opts.week),
    day: String(opts.day),
    subject: opts.subject,
  });
  const { status, data, requestId } = await apiSend<{ progress: HomescoolProgress | null; message?: string }>(
    `/homescool/progress?${q}`,
  );
  if (status < 200 || status >= 300) {
    return { progress: null, error: data.message || `progress failed (${status})`, requestId };
  }
  return { progress: data.progress ?? null, requestId };
}

export async function fetchHomescoolProgressSummary(opts: {
  cycle: number;
  week: number;
}): Promise<{ summary: HomescoolProgressSummary | null; error?: string; requestId?: string }> {
  const q = new URLSearchParams({
    cycle: String(opts.cycle),
    week: String(opts.week),
  });
  const { status, data, requestId } = await apiSend<HomescoolProgressSummary & { message?: string }>(
    `/homescool/progress/summary?${q}`,
  );
  if (status < 200 || status >= 300) {
    return { summary: null, error: data.message || `summary failed (${status})`, requestId };
  }
  return { summary: data, requestId };
}

export async function uploadHomescoolProgressPhoto(opts: {
  cycle: number;
  week: number;
  day: number;
  subject: string;
  document: EoschoolDocument;
  file: File;
}): Promise<{ progress: HomescoolProgress | null; error?: string; requestId?: string }> {
  if (mustLog) {
    console.log("[homescool-progress] upload", {
      cycle: opts.cycle,
      week: opts.week,
      day: opts.day,
      subject: opts.subject,
      name: opts.file.name,
      size: opts.file.size,
      type: opts.file.type,
    });
  }
  const { status, data, requestId } = await uploadFile<{ progress: HomescoolProgress; message?: string }>(
    "/homescool/progress/photos",
    opts.file,
    "file",
    {
      cycle: String(opts.cycle),
      week: String(opts.week),
      day: String(opts.day),
      subject: opts.subject,
      document: JSON.stringify(opts.document),
    },
    180000,
  );
  if (status < 200 || status >= 300) {
    return { progress: null, error: data.message || `upload failed (${status})`, requestId };
  }
  return { progress: data.progress ?? null, requestId };
}

export async function deleteHomescoolProgressPhoto(
  photoId: string,
): Promise<{ progress: HomescoolProgress | null; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiSend<{ progress: HomescoolProgress | null; message?: string }>(
    `/homescool/progress/photos/${encodeURIComponent(photoId)}`,
    { method: "DELETE" },
  );
  if (status < 200 || status >= 300) {
    return { progress: null, error: data.message || `delete failed (${status})`, requestId };
  }
  return { progress: data.progress ?? null, requestId };
}
