/**
 * EPAM series / chapter / author catalog (cookie CSRF).
 */

import { apiRequest } from "./api";

export type EpamChapterProfile = {
  chapterId: string;
  name: string;
};

export type EpamSeriesProfile = {
  userId: string;
  seriesId: string;
  name: string;
  chapters: EpamChapterProfile[];
  createdAt?: string;
  updatedAt?: string;
};

export type EpamAuthorProfile = {
  userId: string;
  authorId: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EpamCatalogResponse = {
  series: EpamSeriesProfile[];
  authors: EpamAuthorProfile[];
};

export async function fetchEpamCatalog(): Promise<EpamCatalogResponse> {
  const { status, data } = await apiRequest<EpamCatalogResponse>("/epams/catalog");
  if (status < 200 || status >= 300) {
    throw new Error(data.message || "Could not load series catalog.");
  }
  return {
    series: data.series ?? [],
    authors: data.authors ?? [],
  };
}

export async function createEpamSeries(payload: {
  name: string;
  chapters?: EpamChapterProfile[];
}): Promise<EpamSeriesProfile> {
  const { status, data } = await apiRequest<EpamSeriesProfile>("/epams/series", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (status < 200 || status >= 300 || !data.seriesId) {
    throw new Error(data.message || "Could not create series.");
  }
  return data;
}

export async function updateEpamSeries(
  seriesId: string,
  payload: { name: string; chapters?: EpamChapterProfile[] },
): Promise<EpamSeriesProfile> {
  const { status, data } = await apiRequest<EpamSeriesProfile>(
    `/epams/series/${encodeURIComponent(seriesId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (status < 200 || status >= 300 || !data.seriesId) {
    throw new Error(data.message || "Could not update series.");
  }
  return data;
}

export async function deleteEpamSeries(seriesId: string): Promise<void> {
  const { status, data } = await apiRequest(`/epams/series/${encodeURIComponent(seriesId)}`, {
    method: "DELETE",
  });
  if (status < 200 || status >= 300) {
    throw new Error(data.message || "Could not delete series.");
  }
}

export async function createEpamAuthor(name: string): Promise<EpamAuthorProfile> {
  const { status, data } = await apiRequest<EpamAuthorProfile>("/epams/authors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (status < 200 || status >= 300 || !data.authorId) {
    throw new Error(data.message || "Could not create author.");
  }
  return data;
}

export async function updateEpamAuthor(
  authorId: string,
  name: string,
): Promise<EpamAuthorProfile> {
  const { status, data } = await apiRequest<EpamAuthorProfile>(
    `/epams/authors/${encodeURIComponent(authorId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    },
  );
  if (status < 200 || status >= 300 || !data.authorId) {
    throw new Error(data.message || "Could not update author.");
  }
  return data;
}

export async function deleteEpamAuthor(authorId: string): Promise<void> {
  const { status, data } = await apiRequest(`/epams/authors/${encodeURIComponent(authorId)}`, {
    method: "DELETE",
  });
  if (status < 200 || status >= 300) {
    throw new Error(data.message || "Could not delete author.");
  }
}

/** Fill a <select> from catalog names; keep current value even if not listed. */
export function fillNameSelect(
  select: HTMLSelectElement,
  names: string[],
  current: string,
  emptyLabel: string,
): void {
  const value = current.trim();
  const unique = new Set<string>();
  select.replaceChildren();
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = emptyLabel;
  select.appendChild(empty);
  for (const name of names) {
    const n = name.trim();
    if (!n || unique.has(n.toLowerCase())) continue;
    unique.add(n.toLowerCase());
    const opt = document.createElement("option");
    opt.value = n;
    opt.textContent = n;
    select.appendChild(opt);
  }
  if (value && !unique.has(value.toLowerCase())) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    select.appendChild(opt);
  }
  select.value = value;
}
