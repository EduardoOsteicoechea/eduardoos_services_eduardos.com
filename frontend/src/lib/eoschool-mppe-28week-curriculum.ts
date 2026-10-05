import raw from "./eoschool-mppe-28week-curriculum.json";

export type CurriculumLearningRef = {
  id: string;
  unitTitle: string;
  axis?: string | null;
  text: string;
};

export type CurriculumIdentityBlock = {
  title: string;
  contenidos: string[];
  learnings: string[];
};

export type BibleChapterRef = {
  book: string;
  chapter: number;
};

export type BibleDay = {
  dayInPlan: number;
  genEster: BibleChapterRef;
  jobMal: BibleChapterRef;
  nt: BibleChapterRef;
};

export type BibleBlock = {
  days: BibleDay[];
};

export type BibleTrackReport = {
  name: string;
  totalChapters: number;
  chaptersReadInPlan: number;
  chaptersNotCovered: number;
  completesCanonIn28Weeks: boolean;
};

export type CurriculumBlock = {
  block: number;
  days: number;
  bible: BibleBlock;
  identity: CurriculumIdentityBlock;
  len: CurriculumLearningRef[];
  mat: CurriculumLearningRef[];
  cie: CurriculumLearningRef[];
};

export type CurriculumWeek = {
  week: number;
  blocks: CurriculumBlock[];
};

export type Mppe28WeekCurriculum = {
  meta: {
    weeks: number;
    blocksPerWeek: number;
    totalBlocks: number;
    identityObjectives: number;
    counts: { lenLearnings: number; matLearnings: number; cieLearnings: number };
    bible: {
      readingDays: number;
      chaptersPerDay: number;
      tracks: {
        genEster: BibleTrackReport;
        jobMal: BibleTrackReport;
        nt: BibleTrackReport;
      };
    };
  };
  weeks: CurriculumWeek[];
};

export const MPPE_28WEEK_CURRICULUM = raw as Mppe28WeekCurriculum;
