import { afterEach, describe, expect, it, vi } from "vitest";
import { postOrdinatoRunStream } from "./ordinato";

describe("postOrdinatoRunStream", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts to /api/ordinato/runs and parses SSE plan events", async () => {
    const csrfCalls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/auth/csrf")) {
          csrfCalls.push(url);
          return new Response(JSON.stringify({ csrf: "tok" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        expect(url).toContain("/api/ordinato/runs");
        expect(init?.method).toBe("POST");
        const headers = new Headers(init?.headers);
        expect(headers.get("X-CSRF-Token")).toBe("tok");
        const stream = new ReadableStream({
          start(controller) {
            const enc = new TextEncoder();
            controller.enqueue(enc.encode('data: {"type":"plan","workflow_id":"data_lookup","steps":[]}\n\n'));
            controller.enqueue(enc.encode('data: {"type":"run_done","workflow_id":"data_lookup"}\n\n'));
            controller.close();
          },
        });
        return new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream", "X-Request-ID": "req-1" },
        });
      }),
    );

    const events: string[] = [];
    const result = await postOrdinatoRunStream("query data", (ev) => {
      if (ev.type) events.push(ev.type);
    });
    expect(csrfCalls.length).toBeGreaterThan(0);
    expect(result.status).toBe(200);
    expect(result.requestId).toBe("req-1");
    expect(events).toEqual(["plan", "run_done"]);
  });
});
