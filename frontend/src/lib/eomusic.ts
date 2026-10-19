export type EmusicBlockKind = "estrofa" | "coro" | "precoro" | "puente";

export type EmusicPalabra = { t: string; i: number; f: number };

export type EmusicLinea = { p: EmusicPalabra[] };

export type EmusicUnidad = { t: EmusicBlockKind; l: EmusicLinea[] };

export type EmusicDocument = {
  type: "emusic";
  version: number;
  trackFile?: string;
  title?: string;
  unidades?: EmusicUnidad[];
};

const KIND_SET = new Set<EmusicBlockKind>(["estrofa", "coro", "precoro", "puente"]);

export function musicTrackSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.(mp3|webm|wav|ogg|m4a|aac|flac|emusic)$/i, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function asKind(raw: unknown): EmusicBlockKind {
  const value = String(raw || "").trim().toLowerCase();
  if (KIND_SET.has(value as EmusicBlockKind)) return value as EmusicBlockKind;
  if (value === "chorus" || value === "refrain") return "coro";
  if (value === "bridge") return "puente";
  return "estrofa";
}

function wordEnd(starts: number[], index: number, start: number): number {
  const next = starts[index + 1];
  if (typeof next === "number" && next > start) return next;
  return start + 0.45;
}

export function normalizeEmusicDocument(doc: EmusicDocument | null | undefined): EmusicDocument {
  const unidades = Array.isArray(doc?.unidades) ? doc.unidades : [];
  const next: EmusicUnidad[] = unidades.map((unit) => {
    const lines = Array.isArray(unit?.l) ? unit.l : [{ p: [] }];
    const flat = lines.flatMap((line) => (Array.isArray(line?.p) ? line.p : []));
    const starts = flat.map((word) => Math.max(0, Number(word?.i) || 0));
    let cursor = 0;
    return {
      t: asKind(unit?.t),
      l: lines.map((line) => ({
        p: (Array.isArray(line?.p) ? line.p : [])
          .map((word) => {
            const text = String(word?.t || "").trim();
            if (!text) return null;
            const i = Math.max(0, Number(word?.i) || 0);
            let f = Number(word?.f);
            if (!Number.isFinite(f) || f <= i) f = wordEnd(starts, cursor, i);
            cursor += 1;
            return { t: text, i, f };
          })
          .filter((word): word is EmusicPalabra => word !== null),
      })),
    };
  });
  return {
    type: "emusic",
    version: 4,
    title: doc?.title,
    trackFile: doc?.trackFile,
    unidades: next.length ? next : [{ t: "estrofa", l: [{ p: [] }] }],
  };
}

export function emptyEmusicDocument(title?: string): EmusicDocument {
  return { type: "emusic", version: 4, title, unidades: [{ t: "estrofa", l: [{ p: [] }] }] };
}

export function isWordActive(word: EmusicPalabra, timeSec: number): boolean {
  return timeSec >= word.i && timeSec < word.f;
}

export function sortMusicTracks<T extends { title: string }>(tracks: T[]): T[] {
  return [...tracks].sort((a, b) => a.title.localeCompare(b.title, "es", { numeric: true, sensitivity: "base" }));
}

export function nextPlaylistIndex(current: number, length: number, loop: boolean): number | null {
  if (length <= 0) return null;
  if (current < 0) return 0;
  if (current + 1 < length) return current + 1;
  return loop ? 0 : null;
}

export function moveItemIndex<T>(items: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (index < 0 || target < 0 || target >= items.length) return [...items];
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

export function playlistQueue<T extends { id: string }>(tracks: T[], included: Iterable<string>): T[] {
  const allowed = new Set(included);
  return tracks.filter((track) => allowed.has(track.id));
}

export function tracksNotInPlaylist<T extends { id: string }>(library: T[], trackIds: Iterable<string>): T[] {
  const have = new Set(trackIds);
  return library.filter((track) => !have.has(track.id));
}

export function appendUniqueId(ids: string[], id: string): string[] {
  if (!id || ids.includes(id)) return [...ids];
  return [...ids, id];
}

export function mergeLibraryTracks<T extends { id: string; title: string }>(current: T[], incoming: T[]): T[] {
  const byId = new Map(incoming.map((track) => [track.id, track]));
  const kept = current.filter((track) => byId.has(track.id)).map((track) => byId.get(track.id) as T);
  const known = new Set(kept.map((track) => track.id));
  for (const track of sortMusicTracks(incoming)) {
    if (!known.has(track.id)) kept.push(track);
  }
  return kept;
}

export type EmusicWordRef = { unit: number; line: number; word: number };

export type FlatEmusicWord = EmusicWordRef & EmusicPalabra;

const BLOCK_LINE = /^(?:\[)?(estrofa|coro|precoro|puente|chorus|refrain|bridge|verse)(?:\])?$/i;

function cloneDocument(doc: EmusicDocument): EmusicDocument {
  return JSON.parse(JSON.stringify(normalizeEmusicDocument(doc))) as EmusicDocument;
}

export function lyricsHasWords(doc: EmusicDocument | null | undefined): boolean {
  return (doc?.unidades || []).some((unit) => unit.l.some((line) => line.p.some((word) => word.t.trim())));
}

export function flattenEmusicWords(doc: EmusicDocument | null | undefined): FlatEmusicWord[] {
  const normalized = normalizeEmusicDocument(doc);
  const out: FlatEmusicWord[] = [];
  (normalized.unidades || []).forEach((unit, unitIndex) => {
    unit.l.forEach((line, lineIndex) => {
      line.p.forEach((word, wordIndex) => {
        out.push({ unit: unitIndex, line: lineIndex, word: wordIndex, t: word.t, i: word.i, f: word.f });
      });
    });
  });
  return out;
}

export function wordAtRef(doc: EmusicDocument, ref: EmusicWordRef | null | undefined): EmusicPalabra | null {
  if (!ref) return null;
  return doc.unidades?.[ref.unit]?.l[ref.line]?.p[ref.word] || null;
}

export function lyricsFromPlainText(text: string, title?: string): EmusicDocument {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const unidades: EmusicUnidad[] = [];
  let current: EmusicUnidad = { t: "estrofa", l: [] };
  const flushUnit = () => {
    current.l = current.l.filter((line) => line.p.length);
    if (current.l.length) unidades.push(current);
    current = { t: "estrofa", l: [] };
  };
  for (const raw of lines) {
    const line = raw.trim();
    const marker = line.match(BLOCK_LINE);
    if (marker) {
      flushUnit();
      current = { t: asKind(marker[1]), l: [] };
      continue;
    }
    if (!line) continue;
    current.l.push({ p: line.split(/\s+/).filter(Boolean).map((t) => ({ t, i: 0, f: 0.45 })) });
  }
  flushUnit();
  return normalizeEmusicDocument({ type: "emusic", version: 4, title, unidades });
}

export function markWordAtTime(doc: EmusicDocument, ref: EmusicWordRef, timeSec: number): { doc: EmusicDocument; next: EmusicWordRef | null } {
  const nextDoc = cloneDocument(doc);
  const flat = flattenEmusicWords(nextDoc);
  const index = flat.findIndex((word) => word.unit === ref.unit && word.line === ref.line && word.word === ref.word);
  if (index < 0) return { doc: nextDoc, next: null };
  const time = Math.max(0, Number(timeSec.toFixed(3)));
  const current = wordAtRef(nextDoc, ref);
  if (!current) return { doc: nextDoc, next: null };
  if (index > 0) {
    const prev = flat[index - 1];
    const prevWord = wordAtRef(nextDoc, prev);
    if (prevWord) prevWord.f = Math.max(prevWord.i + 0.01, time);
  }
  current.i = time;
  const following = flat[index + 1];
  current.f = following ? Math.max(time + 0.01, following.i || time + 0.45) : time + 0.45;
  return {
    doc: normalizeEmusicDocument(nextDoc),
    next: following ? { unit: following.unit, line: following.line, word: following.word } : null,
  };
}

export function setWordEndTime(doc: EmusicDocument, ref: EmusicWordRef, timeSec: number): EmusicDocument {
  const nextDoc = cloneDocument(doc);
  const current = wordAtRef(nextDoc, ref);
  if (!current) return nextDoc;
  const time = Math.max(0, Number(timeSec.toFixed(3)));
  current.f = Math.max(current.i + 0.01, time);
  return normalizeEmusicDocument(nextDoc);
}

export function updateWordAtRef(doc: EmusicDocument, ref: EmusicWordRef, patch: Partial<EmusicPalabra>): EmusicDocument {
  const nextDoc = cloneDocument(doc);
  const current = wordAtRef(nextDoc, ref);
  if (!current) return nextDoc;
  if (typeof patch.t === "string") current.t = patch.t.trim() || current.t;
  if (typeof patch.i === "number" && Number.isFinite(patch.i)) current.i = Math.max(0, patch.i);
  if (typeof patch.f === "number" && Number.isFinite(patch.f)) current.f = Math.max(current.i + 0.01, patch.f);
  return normalizeEmusicDocument(nextDoc);
}

export function formatTimeSec(value: number): string {
  return Math.max(0, value).toFixed(3);
}
