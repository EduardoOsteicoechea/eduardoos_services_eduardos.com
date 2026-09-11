import { showErrorModal } from "../../lib/error-modal";

export function openApiErrorModal(
  message: string,
  opts?: { requestId?: string; details?: string; debug?: string },
): void {
  showErrorModal({
    message,
    requestId: opts?.requestId,
    details: opts?.details,
    debug: opts?.debug,
  });
}

/** Object-form alias used by eVoice (and other product islands). */
export function openServerErrorModal(
  input:
    | string
    | {
        title?: string;
        message?: string;
        summary?: string;
        details?: unknown;
        requestId?: string;
        debug?: string;
      },
): void {
  if (typeof input === "string") {
    openApiErrorModal(input);
    return;
  }
  const message =
    (input.message || input.summary || input.title || "Something went wrong").trim() ||
    "Something went wrong";
  let details = "";
  if (typeof input.details === "string") {
    details = input.details;
  } else if (input.details != null) {
    try {
      details = JSON.stringify(input.details, null, 2);
    } catch {
      details = String(input.details);
    }
  } else if (input.title && (input.message || input.summary)) {
    details = input.title;
  }
  openApiErrorModal(message, {
    requestId: input.requestId,
    details: details || undefined,
    debug: input.debug,
  });
}
