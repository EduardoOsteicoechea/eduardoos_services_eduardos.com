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
