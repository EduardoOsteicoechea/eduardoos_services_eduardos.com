import { trackerOriginAllowed } from "./ereport-routes";

export type TrackerCommand =
  | "tutorial"
  | "toggle-sidebar"
  | "font-up"
  | "font-down"
  | "upload"
  | "clear-all"
  | "progress"
  | "save-export";

export type TrackerHostHandlers = {
  onBooted?: () => void;
  onLoaded?: () => void;
  onCloudSave: (payload: Record<string, unknown>) => void;
  onError: (message: string) => void;
  onState?: (payload: Record<string, unknown>) => void;
};

export function resolveUiScale(root: HTMLElement = document.documentElement): number {
  const raw = getComputedStyle(root).fontSize;
  const px = Number.parseFloat(raw);
  return Number.isFinite(px) && px > 0 ? px / 16 : 1;
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
): boolean {
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
): { post: (msg: Record<string, unknown>) => void; destroy: () => void } {
  let timer = 0;
  const delay = opts.autoSaveMs ?? 100;
  const post = (msg: Record<string, unknown>) => {
    iframe.contentWindow?.postMessage(msg, opts.origin);
  };
  const onMessage = (ev: MessageEvent) => {
    handleTrackerMessage(ev, opts.origin, {
      ...opts.handlers,
      onBooted: () => {
        if (opts.payload) {
          post(trackerLoadMessage(opts.payload));
        }
        post({ target: "ereport-tracker", type: "theme", dark: siteIsDark() });
        post({ target: "ereport-tracker", type: "text-scale", scale: resolveUiScale() });
        post(trackerConfigMessage(opts.uploadUrl, opts.csrf));
        opts.handlers.onBooted?.();
      },
      onCloudSave: (payload) => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => opts.handlers.onCloudSave(payload), delay);
      },
    });
  };
  window.addEventListener("message", onMessage);
  return {
    post,
    destroy: () => {
      window.clearTimeout(timer);
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
