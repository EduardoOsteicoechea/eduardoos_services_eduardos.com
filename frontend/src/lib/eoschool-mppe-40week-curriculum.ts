import raw from "./eoschool-mppe-40week-curriculum.json";
import type {
  BibleChapterRef,
  BibleDay,
  BibleTrackReport,
  CurriculumBlock,
  CurriculumIdentityBlock,
  CurriculumLearningRef,
  CurriculumWeek,
} from "./eoschool-mppe-28week-curriculum";

export type Mppe40WeekCurriculum = {
  meta: {
    weeks: number;
    daysPerWeek?: number;
    totalPlanDays?: number;
    grade?: string;
    blocksPerWeek: number;
    totalBlocks: number;
    identityObjectives: number;
    source?: string;
    counts: { lenLearnings: number; matLearnings: number; cieLearnings: number };
    bible: {
      canon: string;
      readingDays: number;
      defaultMaxPerTrackPerDay?: number;
      completesCanonIn40Weeks?: boolean;
      tracks: {
        genEster: BibleTrackReport;
        jobMal: BibleTrackReport;
        nt: BibleTrackReport;
      };
    };
  };
  weeks: CurriculumWeek[];
};

export const MPPE_40WEEK_CURRICULUM = raw as Mppe40WeekCurriculum;

export type {
  BibleChapterRef,
  BibleDay,
  CurriculumBlock,
  CurriculumIdentityBlock,
  CurriculumLearningRef,
  CurriculumWeek,
};
