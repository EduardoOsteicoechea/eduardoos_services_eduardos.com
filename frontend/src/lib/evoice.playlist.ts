/**
 * Pure eVoice playlist helpers — filename parsing, grouping, and generate scope.
 * Kept framework-free so they can be unit tested (see evoice.playlist.test.ts).
 *
 * Audio naming mirrors the Go/Python worker exactly:
 *   <docStem>.v<version>.mp3
 *   <docStem>.v<version>.c<NN>-<slug>.mp3
 *   <docStem>.c<NN>-<slug>.mp3            (legacy, no version)
 *   <docStem>.mp3                          (legacy mono)
 */

import type { EvoiceObjectMeta } from "./evoice";

const SUPER_PREMIUM_EXT = /\.(pdf|png|jpe?g|webp|tiff?|bmp|gif|docx)$/i;

export const VOICED_AUDIO_EXT = /\.mp3$/i;

export function stemOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

export function trackId(a: EvoiceObjectMeta): string {
  return a.key || a.name;
}

export type AudioNameParts = {
  stem: string;
  version: number | "legacy";
};

/**
 * Parse a worker-generated audio filename. The versioned pattern is greedy so
 * document stems that themselves contain ".v<digits>" keep their full stem.
 */
export function parseAudioName(name: string): AudioNameParts {
  const versioned = name.match(/^(.+)\.v(\d+)(?:\.c\d+-.*)?\.mp3$/i);
  if (versioned) {
    return { stem: versioned[1], version: parseInt(versioned[2], 10) };
  }
  const legacyChapter = name.replace(/\.mp3$/i, "").match(/^(.+)\.c\d+-/i);
  if (legacyChapter) {
    return { stem: legacyChapter[1], version: "legacy" };
  }
  return { stem: stemOf(name), version: "legacy" };
}

/** Doc stem parsed from an audio filename (versioned or legacy). */
export function audioDocStem(audioName: string): string {
  return parseAudioName(audioName).stem;
}

/** Version number or "legacy" for pre-version MP3s. */
export function audioVersion(audioName: string): number | "legacy" {
  return parseAudioName(audioName).version;
}

export function isSourceDoc(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower.endsWith(".premium.txt") || lower.endsWith(".vision.txt")) {
    return false;
  }
  return /\.(docx|txt|pdf|png|jpe?g|webp|tiff?|bmp|gif)$/i.test(name);
}

export function audiosForDocStem(
  docStem: string,
  audios: EvoiceObjectMeta[],
): EvoiceObjectMeta[] {
  return audios.filter((a) => audioDocStem(a.name) === docStem);
}

export function sortTracks(tracks: EvoiceObjectMeta[]): EvoiceObjectMeta[] {
  return [...tracks].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
}

export type VersionBucket = {
  version: number | "legacy";
  label: string;
  tracks: EvoiceObjectMeta[];
};

export type DocPlaylist = {
  stem: string;
  sourceDoc?: EvoiceObjectMeta;
  buckets: VersionBucket[];
  allTracks: EvoiceObjectMeta[];
};

export function buildDocPlaylists(
  docs: EvoiceObjectMeta[],
  audios: EvoiceObjectMeta[],
): DocPlaylist[] {
  const stems = new Set<string>();
  for (const d of docs.filter((x) => isSourceDoc(x.name))) {
    stems.add(stemOf(d.name));
  }
  for (const a of audios) {
    stems.add(audioDocStem(a.name));
  }

  const sourceByStem = new Map<string, EvoiceObjectMeta>();
  for (const d of docs.filter((x) => isSourceDoc(x.name))) {
    sourceByStem.set(stemOf(d.name), d);
  }

  return [...stems]
    .sort((a, b) => a.localeCompare(b))
    .map((stem) => {
      const related = audiosForDocStem(stem, audios);
      const byVersion = new Map<number | "legacy", EvoiceObjectMeta[]>();
      for (const a of related) {
        const v = audioVersion(a.name);
        const list = byVersion.get(v) ?? [];
        list.push(a);
        byVersion.set(v, list);
      }

      const numericVersions = [...byVersion.keys()]
        .filter((v): v is number => v !== "legacy")
        .sort((a, b) => a - b);

      const buckets: VersionBucket[] = numericVersions.map((v) => ({
        version: v,
        label: `Version v${v}`,
        tracks: sortTracks(byVersion.get(v) ?? []),
      }));

      const legacy = byVersion.get("legacy");
      if (legacy?.length) {
        buckets.push({
          version: "legacy",
          label: "Legacy",
          tracks: sortTracks(legacy),
        });
      }

      const allTracks: EvoiceObjectMeta[] = [];
      for (const b of buckets) {
        allTracks.push(...b.tracks);
      }

      return {
        stem,
        sourceDoc: sourceByStem.get(stem),
        buckets,
        allTracks,
      };
    })
    .filter((p) => p.buckets.length > 0 || p.sourceDoc);
}

/** Source docs that have no audio, or whose audio predates the document. */
export function docsNeedingAudio(
  docs: EvoiceObjectMeta[],
  audios: EvoiceObjectMeta[],
  onlyFiles?: string[],
): string[] {
  const allow = onlyFiles?.length ? new Set(onlyFiles) : null;
  return docs
    .filter((d) => isSourceDoc(d.name))
    .filter((d) => (allow ? allow.has(d.name) : true))
    .filter((d) => {
      const related = audiosForDocStem(stemOf(d.name), audios);
      if (related.length === 0) return true;
      if (!d.lastModified) return false;
      const newest = related.reduce((acc, a) => {
        if (!a.lastModified) return acc;
        return a.lastModified > acc ? a.lastModified : acc;
      }, "");
      if (!newest) return false;
      return d.lastModified > newest;
    })
    .map((d) => d.name);
}

export function findLatestPremiumTxt(
  docStem: string,
  docs: EvoiceObjectMeta[],
): EvoiceObjectMeta | null {
  let best: EvoiceObjectMeta | null = null;
  let bestN = -1;
  const prefix = `${docStem}.v`;
  for (const d of docs) {
    const lower = d.name.toLowerCase();
    if (!lower.endsWith(".premium.txt")) continue;
    if (!d.name.startsWith(prefix)) continue;
    const rest = d.name.slice(prefix.length);
    const m = rest.match(/^(\d+)\.premium\.txt$/i);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (n > bestN) {
      bestN = n;
      best = d;
    }
  }
  return best;
}

export function filterSuperPremiumTargets(files: string[]): {
  ok: string[];
  rejected: string[];
} {
  const ok: string[] = [];
  const rejected: string[] = [];
  for (const f of files) {
    if (SUPER_PREMIUM_EXT.test(f)) ok.push(f);
    else rejected.push(f);
  }
  return { ok, rejected };
}

/** True when the audio file looks like a plausible, non-empty MP3. */
export function isPlayableAudio(a: EvoiceObjectMeta): boolean {
  return a.size > 0 && /\.mp3$/i.test(a.name);
}
