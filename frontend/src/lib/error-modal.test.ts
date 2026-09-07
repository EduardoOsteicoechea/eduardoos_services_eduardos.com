import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeErrorModal, showErrorModal, startErrorModal } from "./error-modal";

function mountModal(): void {
  document.body.innerHTML = `
    <div id="error-modal" class="error-modal" hidden>
      <div class="error-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="error-modal-title">
        <header class="error-modal-toolbar">
          <h2 id="error-modal-title">Something went wrong</h2>
          <button class="icon-btn" type="button" data-error-close aria-label="Close">close</button>
        </header>
        <div class="error-modal-box" data-error-message></div>
        <div class="error-modal-box" data-error-details></div>
        <div class="error-modal-actions">
          <button type="button" data-error-copy-message>Copy message</button>
          <button type="button" data-error-copy-details>Copy details</button>
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

describe("error modal", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    mountModal();
  });

  afterEach(() => {
    document.body.innerHTML = "";
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

  it("closes on Escape and traps focus", () => {
    showErrorModal({ message: "Safe message", requestId: "abc12345" });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.getElementById("error-modal")?.hidden).toBe(true);

    showErrorModal({ message: "Again", requestId: "abc12345" });
    const close = document.querySelector("[data-error-close]");
    const last = document.querySelector("[data-error-copy-details]");
    (last as HTMLButtonElement).focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(close);
    closeErrorModal();
  });

  it("uses Spanish labels when html lang is es", () => {
    document.documentElement.lang = "es";
    showErrorModal({ message: "Fallo", requestId: "req-es-01" });
    expect(document.getElementById("error-modal-title")?.textContent).toBe("Algo salió mal");
    expect(document.querySelector("[data-error-copy-message]")?.textContent).toBe("Copiar mensaje");
  });
});
