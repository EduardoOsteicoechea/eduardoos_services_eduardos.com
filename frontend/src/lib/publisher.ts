import { apiRequest, getCsrf } from "./api";
import { mustLog } from "./dev-log";

export const PUBLISHER_CHANNELS = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "x", label: "X" },
  { id: "tiktok", label: "TikTok" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "whatsapp", label: "WhatsApp" },
] as const;

export type PublisherChannelId = (typeof PUBLISHER_CHANNELS)[number]["id"];

export type PublisherPublishResponse = {
  job_id?: string;
  status?: string;
  request_id?: string;
  error?: string;
  message?: string;
};

export type PublisherJobResult = {
  channel?: string;
  status?: string;
  external_id?: string;
  url?: string;
  error?: string;
  skip_reason?: string;
};

export type PublisherJob = {
  id?: string;
  status?: string;
  results?: PublisherJobResult[];
  error?: string;
  message?: string;
  request_id?: string;
};

export async function publishPackage(form: FormData): Promise<{
  status: number;
  data: PublisherPublishResponse;
  requestId: string;
}> {
  await getCsrf();
  if (mustLog) console.log("[publisher] publish start");
  // Long timeout for large video uploads proxied to Orato.
  const result = await apiRequest<PublisherPublishResponse>(
    "/publisher/publish",
    { method: "POST", body: form },
    { timeoutMs: 30 * 60 * 1000 },
  );
  if (mustLog) {
    console.log("[publisher] publish end", {
      status: result.status,
      requestId: result.requestId,
      jobId: result.data.job_id,
    });
  }
  return result;
}

export async function getPublisherJob(jobId: string): Promise<{
  status: number;
  data: PublisherJob;
  requestId: string;
}> {
  const result = await apiRequest<PublisherJob>(`/publisher/jobs/${encodeURIComponent(jobId)}`);
  if (mustLog) {
    console.log("[publisher] job", {
      status: result.status,
      requestId: result.requestId,
      jobStatus: result.data.status,
    });
  }
  return result;
}

export async function pollPublisherJob(
  jobId: string,
  opts: { intervalMs?: number; maxAttempts?: number; signal?: AbortSignal } = {},
): Promise<{ status: number; data: PublisherJob; requestId: string }> {
  const intervalMs = opts.intervalMs ?? 2000;
  const maxAttempts = opts.maxAttempts ?? 90;
  let last = await getPublisherJob(jobId);
  for (let i = 0; i < maxAttempts; i++) {
    if (opts.signal?.aborted) break;
    const st = (last.data.status || "").toLowerCase();
    if (st === "published" || st === "partial" || st === "failed") {
      return last;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
    if (opts.signal?.aborted) break;
    last = await getPublisherJob(jobId);
  }
  return last;
}
