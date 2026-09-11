/** Route constants used by pamphlet-generator and product islands. */
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

/** App surface routes (cookie-auth product pages). */
export const APP_ROUTES = {
  login: "/session",
  register: "/session/register",
  subscription: "/payments/subscription",
  contact: "/contact",
  scrib: "/scrib",
  pamphlet: "/documents/pamphlet",
  evoice: "/evoice",
} as const;

/** Public Latin / Institutes paragraph pack API. */
export const LATIN_API_ROUTES = {
  institutesParagraphsIndex: "/api/latin/calvins-institutes/paragraphs",
  institutesParagraphChapter: (book: string, chapter: string) =>
    `/api/latin/calvins-institutes/paragraphs/${encodeURIComponent(book)}/${encodeURIComponent(chapter)}`,
} as const;
