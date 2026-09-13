/**
 * EPAM (pamphlet) client — cookie CSRF via api.ts.
 */

import { apiRequest, currentCsrf, getCsrf } from "./api";
import { mustLog } from "./dev-log";
import {
  createEmptyPamphlet,
  type PamphletStructure,
} from "./pamphlet-generator/src/pamphlet_schema";

export type EpamRecord = {
  userId: string;
  epamId: string;
  fileName?: string;
  title: string;
  series?: string;
  seriesChapter?: string;
  author?: string;
  date?: string;
  contentSizeBytes?: number;
  createdAt?: string;
  updatedAt?: string;
  body?: Record<string, unknown>;
};

export type EpamDoc = {
  id: string;
  userId?: string;
  title: string;
  updatedAt?: string;
  body?: Record<string, unknown>;
};

export type EpamsListResponse = {
  count: number;
  epams: EpamRecord[];
};

export type EpamDocumentResponse = {
  meta: EpamRecord;
  document: PamphletStructure;
};

export type SaveEpamOptions = {
  document: PamphletStructure;
  epamId?: string;
  fileName?: string;
};

export type EpamSeriesTreeItem = {
  epamId: string;
  title: string;
  fileName?: string;
  series?: string;
  seriesChapter?: string;
  updatedAt?: string;
};

export type EpamSeriesTreeChapter = {
  name: string;
  items: EpamSeriesTreeItem[];
};

export type EpamSeriesTreeNode = {
  name: string;
  chapters: EpamSeriesTreeChapter[];
};

/** Matches backend `epamSeriesTreeResponse` (series → chapters → items). */
export type EpamSeriesTreeResponse = {
  count: number;
  series: EpamSeriesTreeNode[];
};

type ListWire = {
  count?: number;
  epams?: EpamRecord[];
  items?: EpamRecord[];
};

function asEpamDoc(rec: EpamRecord): EpamDoc {
  return {
    id: rec.epamId,
    userId: rec.userId,
    title: rec.title || rec.fileName || rec.epamId,
    updatedAt: rec.updatedAt,
    body: rec.body,
  };
}

function titleFromDocument(doc: PamphletStructure): string {
  const headerTitle = doc.header?.title?.trim();
  if (headerTitle) return headerTitle;
  if (doc.id?.trim()) return doc.id.trim();
  return "Untitled pamphlet";
}

export async function fetchEpams(): Promise<EpamsListResponse> {
  const { status, data } = await apiRequest<ListWire>("/epams");
  if (mustLog) console.log("[epams] list", { status });
  if (status < 200 || status >= 300) {
    throw new Error(data.message || "Could not list pamphlets.");
  }
  const epams = data.epams ?? data.items ?? [];
  return { count: data.count ?? epams.length, epams };
}

export async function fetchEpam(epamId: string): Promise<EpamDocumentResponse> {
  const { status, data } = await apiRequest<{
    meta?: EpamRecord;
    document?: PamphletStructure;
    epamId?: string;
    title?: string;
    body?: PamphletStructure;
  }>(`/epams/${encodeURIComponent(epamId)}`);
  if (status < 200 || status >= 300) {
    throw new Error(data.message || "Could not load pamphlet.");
  }
  const document = data.document ?? data.body ?? createEmptyPamphlet();
  const meta: EpamRecord = data.meta ?? {
    userId: "",
    epamId: data.epamId || epamId,
    title: data.title || titleFromDocument(document),
  };
  return { meta, document };
}

export async function saveEpamToCloud(
  { document, epamId, fileName }: SaveEpamOptions,
): Promise<EpamDocumentResponse> {
  const title = titleFromDocument(document);
  const body = epamId
    ? { title, document, epamId, fileName }
    : { title, document, fileName };
  const path = epamId ? `/epams/${encodeURIComponent(epamId)}` : "/epams";
  const method = epamId ? "PUT" : "POST";
  const { status, data } = await apiRequest<{
    meta?: EpamRecord;
    document?: PamphletStructure;
    epamId?: string;
  }>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (mustLog) console.log("[epams] save", { status, epamId });
  if (status < 200 || status >= 300) {
    throw new Error(data.message || "Could not save pamphlet.");
  }
  return {
    meta: data.meta ?? {
      userId: "",
      epamId: data.epamId || epamId || "",
      title,
    },
    document: data.document ?? document,
  };
}

export async function recycleEpam(epamId: string): Promise<void> {
  const { status, data } = await apiRequest(`/epams/${encodeURIComponent(epamId)}`, {
    method: "DELETE",
  });
  if (status < 200 || status >= 300) {
    throw new Error(data.message || "Could not delete pamphlet.");
  }
}

export async function copyEpam(epamId: string): Promise<EpamDocumentResponse> {
  const { status, data } = await apiRequest<EpamDocumentResponse>(
    `/epams/${encodeURIComponent(epamId)}/copy`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
  );
  if (status < 200 || status >= 300) {
    throw new Error((data as { message?: string }).message || "Could not copy pamphlet.");
  }
  return data as EpamDocumentResponse;
}

export async function fetchEpamSeriesTree(): Promise<EpamSeriesTreeResponse> {
  const { status, data } = await apiRequest<EpamSeriesTreeResponse>("/epams/series-tree");
  if (status < 200 || status >= 300) {
    throw new Error(data.message || "Could not load series tree.");
  }
  const series = (data.series ?? []).map((node) => ({
    name: node.name,
    chapters: (node.chapters ?? []).map((ch) => ({
      name: ch.name,
      items: ch.items ?? [],
    })),
  }));
  const count =
    typeof data.count === "number"
      ? data.count
      : series.reduce((n, s) => n + s.chapters.reduce((m, c) => m + c.items.length, 0), 0);
  return { count, series };
}

export async function listEpamDocs(): Promise<EpamDoc[]> {
  const list = await fetchEpams();
  return list.epams.map(asEpamDoc);
}

export async function downloadPamphletPdf(
  document: PamphletStructure,
  opts?: { ink?: string; fileName?: string },
): Promise<Blob> {
  await getCsrf();
  const headers = new Headers({
    Accept: "application/pdf, application/json",
    "Content-Type": "application/json",
  });
  const csrf = currentCsrf();
  if (csrf) headers.set("X-CSRF-Token", csrf);
  const response = await fetch("/api/documents/pamphlet/pdf", {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({
      document,
      ink: opts?.ink ?? "black",
      fileName: opts?.fileName,
    }),
  });
  if (!response.ok) {
    let message = `PDF failed (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return response.blob();
}
