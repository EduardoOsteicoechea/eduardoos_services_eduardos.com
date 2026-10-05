import { apiRequest } from "./api";
import type { MppeCurriculumDaySheet } from "./mppe-curriculum-day-sheet";

export type MppeDayPreviewResponse = {
  pdf_base64: string;
  page_width_mm?: number;
  page_height_mm?: number;
  title?: string;
  plan_day?: number;
  week?: number;
};

function base64ToBytes(b64: string): Uint8Array {
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export async function fetchMppeDayPdfPreview(sheet: MppeCurriculumDaySheet): Promise<{
  ok: boolean;
  pdfBytes?: Uint8Array;
  error?: string;
  requestId?: string;
}> {
  const { status, data, requestId } = await apiRequest<MppeDayPreviewResponse>(
    "/api/eoschool/curriculum/day-preview",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sheet),
    },
  );
  if (status < 200 || status >= 300) {
    return {
      ok: false,
      error: (data as { message?: string }).message ?? "No se pudo generar el PDF del día.",
      requestId,
    };
  }
  if (!data.pdf_base64) {
    return { ok: false, error: "Respuesta sin PDF.", requestId };
  }
  return { ok: true, pdfBytes: base64ToBytes(data.pdf_base64), requestId };
}
