/**
 * Stage photo lightbox: open gallery, navigate, download.
 */

export type EoprojectPhotoViewerItem = {
  src: string;
  downloadUrl: string;
  name: string;
};

export type EoprojectPhotoViewer = {
  open: (items: EoprojectPhotoViewerItem[], index?: number) => void;
  close: () => void;
};

function withDownloadParam(url: string): string {
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}download=1`;
}

export async function downloadEoprojectPhoto(url: string, filename: string): Promise<void> {
  const res = await fetch(withDownloadParam(url), {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Download failed.");
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename || "photo";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export function createEoprojectPhotoViewer(): EoprojectPhotoViewer {
  let items: EoprojectPhotoViewerItem[] = [];
  let index = 0;
  let backdrop: HTMLDivElement | null = null;

  const ensure = () => {
    if (backdrop) return backdrop;
    backdrop = document.createElement("div");
    backdrop.className = "eoproject__lightbox";
    backdrop.hidden = true;
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-label", "Stage photo viewer");
    backdrop.innerHTML = `
      <div class="eoproject__lightbox-dialog">
        <div class="eoproject__lightbox-toolbar">
          <p class="eoproject__lightbox-caption" data-lb-caption></p>
          <div class="eoproject__lightbox-actions">
            <button type="button" class="eoproject__icon-btn" data-lb-prev title="Previous photo" aria-label="Previous photo">
              <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>
            </button>
            <button type="button" class="eoproject__icon-btn" data-lb-next title="Next photo" aria-label="Next photo">
              <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
            </button>
            <button type="button" class="eoproject__icon-btn" data-lb-download title="Download photo" aria-label="Download photo">
              <span class="material-symbols-outlined" aria-hidden="true">download</span>
            </button>
            <button type="button" class="eoproject__icon-btn" data-lb-close title="Close" aria-label="Close photo viewer">
              <span class="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </div>
        </div>
        <div class="eoproject__lightbox-stage">
          <img class="eoproject__lightbox-img" data-lb-img alt="" />
        </div>
        <p class="eoproject__lightbox-meta" data-lb-meta></p>
      </div>
    `;
    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close();
    });
    backdrop.querySelector("[data-lb-close]")?.addEventListener("click", () => close());
    backdrop.querySelector("[data-lb-prev]")?.addEventListener("click", () => show(index - 1));
    backdrop.querySelector("[data-lb-next]")?.addEventListener("click", () => show(index + 1));
    backdrop.querySelector("[data-lb-download]")?.addEventListener("click", () => {
      void downloadCurrent();
    });
    return backdrop;
  };

  const show = (nextIndex: number) => {
    if (!items.length) return;
    index = ((nextIndex % items.length) + items.length) % items.length;
    const item = items[index];
    const root = ensure();
    const img = root.querySelector<HTMLImageElement>("[data-lb-img]");
    const caption = root.querySelector<HTMLElement>("[data-lb-caption]");
    const meta = root.querySelector<HTMLElement>("[data-lb-meta]");
    const prev = root.querySelector<HTMLButtonElement>("[data-lb-prev]");
    const next = root.querySelector<HTMLButtonElement>("[data-lb-next]");
    if (img) {
      img.src = item.src;
      img.alt = item.name || "Stage photo";
    }
    if (caption) caption.textContent = item.name || "Photo";
    if (meta) meta.textContent = `${index + 1} / ${items.length}`;
    if (prev) prev.disabled = items.length < 2;
    if (next) next.disabled = items.length < 2;
  };

  const downloadCurrent = async () => {
    const item = items[index];
    if (!item) return;
    try {
      await downloadEoprojectPhoto(item.downloadUrl || item.src, item.name || "photo");
    } catch {
      // Fallback: open in a new tab with download flag.
      window.open(withDownloadParam(item.downloadUrl || item.src), "_blank", "noopener");
    }
  };

  const onKey = (event: KeyboardEvent) => {
    if (!backdrop || backdrop.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      show(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      show(index + 1);
    }
  };

  const open = (nextItems: EoprojectPhotoViewerItem[], start = 0) => {
    items = nextItems.filter((item) => Boolean(item.src));
    if (!items.length) return;
    const root = ensure();
    root.hidden = false;
    document.addEventListener("keydown", onKey);
    show(start);
    root.querySelector<HTMLButtonElement>("[data-lb-close]")?.focus();
  };

  const close = () => {
    if (!backdrop) return;
    backdrop.hidden = true;
    document.removeEventListener("keydown", onKey);
    const img = backdrop.querySelector<HTMLImageElement>("[data-lb-img]");
    if (img) img.removeAttribute("src");
  };

  return { open, close };
}

export function eoprojectPhotoDownloadUrl(fileUrl: string): string {
  return withDownloadParam(fileUrl);
}
