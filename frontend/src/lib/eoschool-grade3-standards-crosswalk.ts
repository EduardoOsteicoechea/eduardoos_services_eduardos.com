import raw from "./eoschool-grade3-standards-crosswalk.json";

export const STANDARD_FITS = ["directo", "parcial", "nacional", "anterior"] as const;

export type StandardFit = (typeof STANDARD_FITS)[number];

export type StandardCell = {
  code: string;
  text: string;
  fit: StandardFit;
  href: string;
};

export type Grade3CrosswalkRow = {
  unitTitle: string;
  learning: string;
  us: StandardCell;
  uk: StandardCell;
};

export type Grade3CrosswalkArea = {
  id: "len" | "mat" | "cie" | "ide";
  title: string;
  icon: string;
  rows: Grade3CrosswalkRow[];
};

export type Grade3StandardsCrosswalk = {
  meta: {
    grade: string;
    columns: { id: string; title: string; programme: string }[];
    sources: { id: string; title: string; href: string; note: string }[];
  };
  areas: Grade3CrosswalkArea[];
};

export const GRADE3_STANDARDS_CROSSWALK = raw as Grade3StandardsCrosswalk;

export const FIT_LABEL: Record<StandardFit, string> = {
  directo: "Directo",
  parcial: "Parcial",
  nacional: "Nacional",
  anterior: "Anterior",
};
