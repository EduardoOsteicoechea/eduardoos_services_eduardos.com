/** Split free text into issue name (until first ".") and incidencia (remainder). */
export function parseIssueText(raw: string): { nombre: string; incidencia: string } {
  const text = String(raw || "").trim();
  if (!text) return { nombre: "", incidencia: "" };
  const i = text.indexOf(".");
  if (i === -1) {
    return { nombre: text, incidencia: text };
  }
  const nombre = text.slice(0, i).trim() || text;
  const incidencia = text.slice(i + 1).trim() || text;
  return { nombre, incidencia };
}
