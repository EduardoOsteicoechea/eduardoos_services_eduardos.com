import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  closeErrorModal,
  EREPORT_OPEN_LOCAL_EVENT,
  showErrorModal,
  startErrorModal,
} from "./error-modal";

function mountModal(): void {
  document.body.innerHTML = `
    <div id="error-modal" class="error-modal error-toast" hidden>
      <div class="error-modal-dialog" role="alertdialog" aria-modal="true" aria-labelledby="error-modal-title">
        <header class="error-modal-toolbar">
          <h2 id="error-modal-title">Something went wrong</h2>
          <button class="icon-btn" type="button" data-error-close aria-label="Close">close</button>
        </header>
        <div class="error-modal-box" data-error-message></div>
        <div class="error-modal-box" data-error-details></div>
        <div class="error-modal-actions">
          <button type="button" data-error-copy-message>Copy message</button>
          <button type="button" data-error-copy-details>Copy details</button>
          <button type="button" data-error-download-epam hidden>Download .epam</button>
          <button type="button" data-error-load-ereport hidden>Load .ereport</button>
        </div>
        <div class="error-modal-box" data-error-debug hidden></div>
        <button type="button" data-error-copy-debug hidden>Copy debug</button>
      </div>
    </div>
  `;
  const modal = document.getElementById("error-modal");
  if (modal) delete modal.dataset.bound;
  startErrorModal();
}

describe("error toast", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    document.documentElement.dataset.page = "";
    window.history.replaceState({}, "", "/");
    mountModal();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("shows safe text without rendering HTML", () => {
    showErrorModal({
      message: "<img src=x onerror=alert(1)> failed",
      requestId: "req-12345678",
      details: "<script>alert(1)</script>",
    });
    const modal = document.getElementById("error-modal");
    expect(modal?.hidden).toBe(false);
    expect(document.querySelector("[data-error-message]")?.innerHTML).toBe("&lt;img src=x onerror=alert(1)&gt; failed");
    expect(document.querySelector("[data-error-message]")?.textContent).toBe("<img src=x onerror=alert(1)> failed");
    expect(document.querySelectorAll("img").length).toBe(0);
    expect(document.querySelector("[data-error-debug]")?.hidden).toBe(true);
    expect(document.querySelector("[data-error-copy-debug]")?.hidden).toBe(true);
  });

  it("hides product file actions outside epam and ereport workspaces", () => {
    showErrorModal({ message: "Boom", requestId: "req-none" });
    expect(document.querySelector("[data-error-download-epam]")?.hidden).toBe(true);
    expect(document.querySelector("[data-error-load-ereport]")?.hidden).toBe(true);
  });

  it("shows Download .epam only on pamphlet workspace", () => {
    window.history.replaceState({}, "", "/documents/pamphlet/e");
    showErrorModal({ message: "Boom", requestId: "req-epam" });
    expect(document.querySelector("[data-error-download-epam]")?.hidden).toBe(false);
    expect(document.querySelector("[data-error-load-ereport]")?.hidden).toBe(true);
    expect(document.querySelector("[data-error-download-epam]")?.textContent).toBe("Download .epam");
  });

  it("shows Load .ereport only on ereport workspace", () => {
    document.documentElement.dataset.page = "ereport-workspace";
    window.history.replaceState({}, "", "/ereport/workspace");
    showErrorModal({ message: "Boom", requestId: "req-ereport" });
    expect(document.querySelector("[data-error-download-epam]")?.hidden).toBe(true);
    expect(document.querySelector("[data-error-load-ereport]")?.hidden).toBe(false);
    expect(document.querySelector("[data-error-load-ereport]")?.textContent).toBe("Load .ereport");
  });

  it("shows debug details only when provided", () => {
    showErrorModal({ message: "Boom", requestId: "req-debug-1", debug: "redacted stack" });
    expect(document.querySelector("[data-error-debug]")?.hidden).toBe(false);
    expect(document.querySelector("[data-error-debug]")?.textContent).toBe("redacted stack");
    expect(document.querySelector("[data-error-copy-debug]")?.hidden).toBe(false);
  });

  it("copies message and details", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    showErrorModal({ message: "Safe message", requestId: "abc12345" });
    document.querySelector("[data-error-copy-message]")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("Safe message"));
    document.querySelector("[data-error-copy-details]")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("request_id=abc12345"));
  });

  it("downloads an .epam snapshot for local copy on pamphlet routes", () => {
    window.history.replaceState({}, "", "/documents/pamphlet");
    const createObjectURL = vi.fn(() => "blob:error-epam");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    let downloaded = "";
    const click = vi.fn();
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = realCreate(tag);
      if (tag === "a") {
        Object.defineProperty(el, "click", {
          configurable: true,
          value: () => {
            downloaded = (el as HTMLAnchorElement).download;
            click();
          },
        });
      }
      return el;
    });

    showErrorModal({
      message: "Could not reach the API.",
      requestId: "rid-epam-1",
      details: "error=internal_error",
    });
    document.querySelector("[data-error-download-epam]")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(downloaded).toBe("error-rid-epam-1.epam");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:error-epam");
  });

  it("dispatches open-local when Load .ereport is clicked on ereport workspace", () => {
    document.documentElement.dataset.page = "ereport-workspace";
    window.history.replaceState({}, "", "/ereport/workspace");
    const heard = vi.fn();
    document.addEventListener(EREPORT_OPEN_LOCAL_EVENT, heard);
    showErrorModal({ message: "Fail", requestId: "rid-er-1" });
    document.querySelector("[data-error-load-ereport]")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(heard).toHaveBeenCalled();
    expect(document.getElementById("error-modal")?.hidden).toBe(true);
    document.removeEventListener(EREPORT_OPEN_LOCAL_EVENT, heard);
  });

  it("closes on Escape and traps focus", () => {
    showErrorModal({ message: "Safe message", requestId: "abc12345" });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.getElementById("error-modal")?.hidden).toBe(true);

    window.history.replaceState({}, "", "/documents/pamphlet");
    showErrorModal({ message: "Again", requestId: "abc12345" });
    const close = document.querySelector("[data-error-close]");
    const last = document.querySelector("[data-error-download-epam]");
    (last as HTMLButtonElement).focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(close);
    closeErrorModal();
  });

  it("uses Spanish labels when html lang is es", () => {
    document.documentElement.lang = "es";
    window.history.replaceState({}, "", "/documents/pamphlet");
    document.documentElement.dataset.page = "ereport-workspace";
    window.history.replaceState({}, "", "/ereport/workspace");
    showErrorModal({ message: "Fallo", requestId: "req-es-01" });
    expect(document.getElementById("error-modal-title")?.textContent).toBe("Algo salió mal");
    expect(document.querySelector("[data-error-copy-message]")?.textContent).toBe("Copiar mensaje");
    expect(document.querySelector("[data-error-load-ereport]")?.textContent).toBe("Cargar .ereport");
  });
});
