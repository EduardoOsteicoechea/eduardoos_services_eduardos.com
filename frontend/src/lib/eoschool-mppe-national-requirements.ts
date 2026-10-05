import raw from "./eoschool-mppe-national-requirements.json";

export type MppeGrade3Unit = {
  title: string;
  learnings: string[];
  contenidos?: string[];
  axis?: string;
};

export type MppeNationalArea = {
  id: string;
  title: string;
  pdf: string;
  general: string[];
  grade3Units: MppeGrade3Unit[];
};

export type MppeNationalRequirements = {
  areas: MppeNationalArea[];
};

export const MPPE_NATIONAL_REQUIREMENTS = raw as MppeNationalRequirements;
