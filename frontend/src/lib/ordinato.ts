import { getCsrf } from "./api";
import { mustLog } from "./dev-log";

export type OrdinatoEvent = {
  type?: string;
  run_id?: string;
  seq?: number;
  workflow_id?: string;
  steps?: Array<{ id?: string; worker?: string; action?: string; label?: string }>;
  message?: string;
  step_id?: string;
  summary?: string;
  dry_run?: boolean;
  error?: string;
  request_type?: string;
  confidence?: number;
};

/**
 * Start an Ordinato run via the site proxy and stream SSE events.
 * Requires an authenticated session. Does not replace /api/chat.
 */
export async function postOrdinatoRunStream(
  message: string,
  onEvent: (ev: OrdinatoEvent) => void,
  options?: { confirm?: boolean; signal?: AbortSignal },
): Promise<{ status: number; requestId: string; last?: OrdinatoEvent }> {
  const csrf = await getCsrf();
  const response = await fetch("/api/ordinato/runs", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "X-CSRF-Token": csrf,
    },
    body: JSON.stringify({
      message,
      stream: true,
      confirm: options?.confirm === true,
    }),
    signal: options?.signal,
  });
  const requestId = response.headers.get("X-Request-ID") || "";
  if (mustLog) {
    console.log("ordinato.run", { status: response.status, requestId });
  }
  if (!response.ok) {
    return { status: response.status, requestId };
  }
  const reader = response.body?.getReader();
  if (!reader) {
    return { status: response.status, requestId };
  }
  const decoder = new TextDecoder();
  let buf = "";
  let last: OrdinatoEvent | undefined;
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() || "";
    for (const part of parts) {
      const line = part.split("\n").find((item) => item.startsWith("data:"));
      if (!line) {
        continue;
      }
      try {
        const payload = JSON.parse(line.slice(5).trim()) as OrdinatoEvent;
        last = payload;
        if (mustLog) {
          console.log("ordinato.event", { type: payload.type, step_id: payload.step_id });
        }
        onEvent(payload);
      } catch {
        /* ignore partial */
      }
    }
  }
  return { status: response.status, requestId, last };
}
