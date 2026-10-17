/**
 * Static eMusic catalog — tracks served from /emusic in public/.
 */

export type EmusicTrack = {
  id: string;
  title: string;
  fileName: string;
  src: string;
};

export type EmusicSection = {
  id: string;
  title: string;
  tracks: EmusicTrack[];
};

function trackSrc(sectionId: string, fileName: string): string {
  return `/emusic/${sectionId}/${encodeURIComponent(fileName)}`;
}

function track(sectionId: string, id: string, title: string, fileName: string): EmusicTrack {
  return {
    id,
    title,
    fileName,
    src: trackSrc(sectionId, fileName),
  };
}

const SALMO1 = "salmo1";

export const EMUSIC_SECTIONS: EmusicSection[] = [
  {
    id: SALMO1,
    title: "Salmo 1",
    tracks: [
      track(SALMO1, "renovado", "Renovado", "Salmo 1 - Renovado.mp3"),
      track(SALMO1, "medito", "Medito", "Salmo 1 - medito.mp3"),
      track(
        SALMO1,
        "quiero",
        "Quiero (Acoustic Pop Rock)",
        "Salmo 1 - Quiero - Acoustic Pop Rock - D.mp3",
      ),
      track(SALMO1, "fruto", "Fruto", "Salmo 1 - fruto.mp3"),
      track(SALMO1, "resucitado", "Resucitado", "Salmo 1 - Resucitado.mp3"),
      track(
        SALMO1,
        "justificado",
        "Justificado (Balada)",
        "Salmo 1 - Justificado - Balada - D.mp3",
      ),
      track(SALMO1, "prosperado", "Prosperado", "Salmo 1 - Prosperado.mp3"),
    ],
  },
];

export function allEmusicTracks(): EmusicTrack[] {
  return EMUSIC_SECTIONS.flatMap((section) => section.tracks);
}
