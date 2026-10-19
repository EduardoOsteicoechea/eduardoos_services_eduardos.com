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
const SALMO2 = "salmo2";
const DREAMER = "dreamer";
const LEARNER = "learner";

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
  {
    id: SALMO2,
    title: "Salmo 2",
    tracks: [
      track(SALMO2, "amonestacion", "Amonestación", "Salmo 2 - Amonestación.mp3"),
      track(SALMO2, "amonestado", "Amonestado", "Salmo 2 - Amonestado - G.mp3"),
      track(SALMO2, "bienaventurado", "Bienaventurado", "Salmo 2 - Bienaventurado.mp3"),
      track(SALMO2, "conflicto", "Conflicto", "Salmo 2 - Conflicto - G.mp3"),
      track(SALMO2, "posesion", "Posesión", "Salmo 2 - Posesión.mp3"),
      track(
        SALMO2,
        "recibimos-el-reino",
        "Recibimos el Reino",
        "Salmo 2 - Recibimos el Reino.mp3",
      ),
      track(SALMO2, "refugio", "Refugio", "Salmo 2 - Refugio..mp3"),
      track(SALMO2, "viene", "Viene", "Salmo 2 - Viene.mp3"),
    ],
  },
  {
    id: DREAMER,
    title: "Dreamer",
    tracks: [
      track(
        DREAMER,
        "dreamer-me-ha-hecho-bien",
        "Me ha hecho bien",
        "Me ha hecho bien E 2.m4a.mp3",
      ),
      track(DREAMER, "sigueme-remix", "Sígueme (Remix)", "sígueme  (Remix).mp3"),
    ],
  },
  {
    id: LEARNER,
    title: "Learner",
    tracks: [
      track(
        LEARNER,
        "learner-me-ha-hecho-bien",
        "Me ha hecho bien",
        "Me ha hecho bien E 2.m4a.mp3",
      ),
    ],
  },
];

export function allEmusicTracks(): EmusicTrack[] {
  return EMUSIC_SECTIONS.flatMap((section) => section.tracks);
}
