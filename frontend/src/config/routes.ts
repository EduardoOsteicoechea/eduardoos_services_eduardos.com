/** Route constants used by pamphlet-generator. */
export const DOCUMENT_ROUTES = {
  pamphletPdf: "/api/documents/pamphlet/pdf",
} as const;

export const EPAM_ROUTES = {
  list: "/api/epams",
  save: "/api/epams",
  seriesTree: "/api/epams/series-tree",
  footers: "/api/epams/footers",
  footer: (footerId: string) => `/api/epams/footers/${encodeURIComponent(footerId)}`,
  item: (epamId: string) => `/api/epams/${encodeURIComponent(epamId)}`,
  copy: (epamId: string) => `/api/epams/${encodeURIComponent(epamId)}/copy`,
} as const;
