import raw from "./eoschool-mppe-national-requirements.json";

export type MppeGrade3Group = {
  title: string;
  items: string[];
};

export type MppeNationalArea = {
  id: string;
  title: string;
  pdf: string;
  general: string[];
  grade3?: string[];
  grade3Groups?: MppeGrade3Group[];
};

export type MppeNationalRequirements = {
  areas: MppeNationalArea[];
};

export const MPPE_NATIONAL_REQUIREMENTS = raw as MppeNationalRequirements;
