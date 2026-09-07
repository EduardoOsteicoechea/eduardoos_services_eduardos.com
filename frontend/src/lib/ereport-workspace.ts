import { trackerOriginAllowed } from "./ereport-routes";

export type TrackerCommand =
  | "tutorial"
  | "toggle-sidebar"
  | "font-up"
  | "font-down"
  | "upload"
  | "clear-all"
  | "progress"
  | "save-export"
  | "add-section";

export type TrackerHostHandlers = {
  onBooted?: () => void;
  onLoaded?: () => void;
  onCloudSave: (payload: Record<string, unknown>) => void;
  onError: (message: string) => void;
  onState?: (payload: Record<string, unknown>) => void;
};

export type TrackerHost = {
  post: (msg: Record<string, unknown>) => void;
  collect: (timeoutMs?: number) => Promise<Record<string, unknown>>;
  destroy: () => void;
};

export const SITE_TEXT_SCALE_STEPS = [0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4] as const;

export function readSiteTextScale(root: HTMLElement = document.documentElement): number {
  const stored = Number.parseFloat(root.style.getPropertyValue("--site-text-scale") || localStorage.getItem("site-text-scale") || "");
  if (Number.isFinite(stored) && stored > 0) {
    return stored;
  }
  const token = Number.parseFloat(getComputedStyle(root).getPropertyValue("--site-text-scale"));
  return Number.isFinite(token) && token > 0 ? token : 1;
}

export function bumpUiScale(delta: number, root: HTMLElement = document.documentElement): number {
  const current = readSiteTextScale(root);
  const index = SITE_TEXT_SCALE_STEPS.findIndex((step) => Math.abs(step - current) < 0.001);
  const at = index >= 0 ? index : SITE_TEXT_SCALE_STEPS.indexOf(1);
  const next = SITE_TEXT_SCALE_STEPS[Math.min(SITE_TEXT_SCALE_STEPS.length - 1, Math.max(0, at + delta))];
  root.style.setProperty("--site-text-scale", String(next));
  localStorage.setItem("site-text-scale", String(next));
  window.dispatchEvent(new CustomEvent("ereport-ui-scale", { detail: { scale: next } }));
  return next;
}

export function resolveUiScale(root: HTMLElement = document.documentElement): number {
  if ((root.dataset.page || "").startsWith("ereport")) {
    return readSiteTextScale(root);
  }
  const raw = getComputedStyle(root).fontSize;
  const px = Number.parseFloat(raw);
  return Number.isFinite(px) && px > 0 ? px / 16 : 1;
}

export function trackerCollectMessage(): Record<string, unknown> {
  return { target: "ereport-tracker", type: "collect" };
}

export function siteIsDark(root: HTMLElement = document.documentElement): boolean {
  return root.getAttribute("data-theme") === "dark";
}

export function trackerConfigMessage(uploadUrl: string, csrf: string): Record<string, unknown> {
  return { target: "ereport-tracker", type: "config", uploadUrl, csrf };
}

export function trackerLoadMessage(payload: Record<string, unknown>): Record<string, unknown> {
  return { target: "ereport-tracker", type: "load", payload };
}

export function trackerCommandMessage(command: TrackerCommand): Record<string, unknown> {
  return { target: "ereport-tracker", type: "command", command };
}

export function handleTrackerMessage(
  ev: MessageEvent,
  locationOrigin: string,
  handlers: TrackerHostHandlers,
  expectedSource?: Window | null,
): boolean {
  if (expectedSource && ev.source !== expectedSource) {
    return false;
  }
  if (!trackerOriginAllowed(ev.origin, locationOrigin)) {
    return false;
  }
  const data = ev.data as { source?: string; type?: string; payload?: Record<string, unknown>; message?: string } | null;
  if (!data || data.source !== "ereport-tracker") {
    return false;
  }
  if (data.type === "booted") {
    handlers.onBooted?.();
    return true;
  }
  if (data.type === "loaded") {
    handlers.onLoaded?.();
    return true;
  }
  if (data.type === "cloud-save" && data.payload) {
    handlers.onCloudSave(data.payload);
    return true;
  }
  if (data.type === "state" && data.payload) {
    handlers.onState?.(data.payload);
    return true;
  }
  if (data.type === "error") {
    handlers.onError(String(data.message || "Tracker error"));
    return true;
  }
  return false;
}

export function startTrackerHost(
  iframe: HTMLIFrameElement,
  opts: {
    origin: string;
    uploadUrl: string;
    csrf: string;
    payload: Record<string, unknown> | null;
    handlers: TrackerHostHandlers;
    autoSaveMs?: number;
  },
): TrackerHost {
  let timer = 0;
  let ready = false;
  let destroyed = false;
  const queued: Record<string, unknown>[] = [];
  const delay = opts.autoSaveMs ?? 100;
  let collectWaiter: {
    resolve: (payload: Record<string, unknown>) => void;
    reject: (err: Error) => void;
    timer: number;
  } | null = null;

  const send = (msg: Record<string, unknown>) => {
    if (destroyed) return;
    iframe.contentWindow?.postMessage(msg, opts.origin);
  };
  const post = (msg: Record<string, unknown>) => {
    if (destroyed) return;
    if (!ready || !iframe.contentWindow) {
      queued.push(msg);
      return;
    }
    send(msg);
  };
  const settleCollect = (payload: Record<string, unknown>) => {
    if (!collectWaiter) return;
    window.clearTimeout(collectWaiter.timer);
    const waiter = collectWaiter;
    collectWaiter = null;
    waiter.resolve(payload);
  };
  const onMessage = (ev: MessageEvent) => {
    if (destroyed) return;
    handleTrackerMessage(
      ev,
      opts.origin,
      {
        ...opts.handlers,
        onBooted: () => {
          ready = true;
          if (opts.payload) {
            send(trackerLoadMessage(opts.payload));
          }
          send({ target: "ereport-tracker", type: "theme", dark: siteIsDark() });
          send({ target: "ereport-tracker", type: "text-scale", scale: resolveUiScale() });
          send(trackerConfigMessage(opts.uploadUrl, opts.csrf));
          const waiting = queued.splice(0);
          for (const msg of waiting) {
            send(msg);
          }
          opts.handlers.onBooted?.();
        },
        onCloudSave: (payload) => {
          window.clearTimeout(timer);
          timer = window.setTimeout(() => {
            if (!destroyed) opts.handlers.onCloudSave(payload);
          }, delay);
        },
        onState: (payload) => {
          settleCollect(payload);
          opts.handlers.onState?.(payload);
        },
      },
      iframe.contentWindow,
    );
  };
  window.addEventListener("message", onMessage);
  return {
    post,
    collect: (timeoutMs = 4000) =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        if (destroyed) {
          reject(new Error("Tracker host destroyed"));
          return;
        }
        if (collectWaiter) {
          window.clearTimeout(collectWaiter.timer);
          collectWaiter.reject(new Error("Collect superseded"));
        }
        collectWaiter = {
          resolve,
          reject,
          timer: window.setTimeout(() => {
            collectWaiter = null;
            reject(new Error("Collect timed out"));
          }, timeoutMs),
        };
        post(trackerCollectMessage());
      }),
    destroy: () => {
      destroyed = true;
      ready = false;
      window.clearTimeout(timer);
      if (collectWaiter) {
        window.clearTimeout(collectWaiter.timer);
        collectWaiter.reject(new Error("Tracker host destroyed"));
        collectWaiter = null;
      }
      queued.length = 0;
      window.removeEventListener("message", onMessage);
    },
  };
}

export function usesFilesystemImageRef(image: { url?: string; dataUrl?: string; id?: string }): boolean {
  if (image.url && image.url.startsWith("/api/ereport/")) {
    return true;
  }
  return Boolean(image.id) && !image.dataUrl;
}
