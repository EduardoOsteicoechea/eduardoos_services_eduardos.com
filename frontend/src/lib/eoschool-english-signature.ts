import type { SubjectObjectiveGroup } from "./eoschool-mppe-curriculum-view";

/** First school week that carries the daily English signature. Weeks 1–7 stay without it. */
export const ENGLISH_FROM_WEEK = 8;

export const ENGLISH_SHEET_DATE = "2026-11-23";
export const ENGLISH_SHEET_HREF = "/eoschool/classes/eng-oraciones-2026-11-23.pdf";

const WEEKDAY_FOCUS: Record<number, { objective: string; skill: string }> = {
  1: {
    objective: "Presente: sujeto + verbo. He, she e it llevan s.",
    skill: "presente",
  },
  2: {
    objective: "Pasado: el verbo regular suma ed. go = went, eat = ate, see = saw, is = was.",
    skill: "pasado",
  },
  3: {
    objective: "Futuro: will + verbo, sin s y sin ed.",
    skill: "futuro",
  },
  4: {
    objective: "La preposición va con el lugar o el tiempo: in, on, at, under, next to, before, after.",
    skill: "preposición",
  },
  5: {
    objective: "La misma idea en presente, pasado y futuro, con la preposición al final.",
    skill: "repaso",
  },
};

/** One model sentence per week, from week 8 onward. */
const WEEK_SENTENCES = [
  "The boy walks to school.",
  "The cat sits under the table.",
  "She reads a book in the kitchen.",
  "We play in the park on Monday.",
  "He eats at home after school.",
  "The dog sleeps next to the door.",
  "They visit a friend before lunch.",
  "I see a bird in the tree.",
];

export function englishWeekday(calendarDate: string | undefined, fallback: number): number {
  if (!calendarDate) return fallback;
  const day = new Date(`${calendarDate}T12:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5 ? day : fallback;
}

export function englishOnThisDay(week: number, dayKind: string | undefined): boolean {
  return week >= ENGLISH_FROM_WEEK && dayKind !== "holiday";
}

export function englishGroupsForDay(
  week: number,
  dayInWeek: number,
  calendarDate?: string,
): SubjectObjectiveGroup[] {
  if (calendarDate === ENGLISH_SHEET_DATE) {
    return [
      {
        objective: "Armar la misma idea en presente, pasado y futuro, con la preposición en su lugar.",
        learnings: [
          "Hoja completa: escribe el tiempo y la preposición.",
          "Orden: quién, verbo, preposición y lugar.",
        ],
      },
    ];
  }
  const focus = WEEKDAY_FOCUS[dayInWeek] ?? WEEKDAY_FOCUS[1];
  const sentence = WEEK_SENTENCES[(week - ENGLISH_FROM_WEEK) % WEEK_SENTENCES.length];
  return [
    {
      objective: focus.objective,
      learnings: [`Escribe en ${focus.skill}: ${sentence}`, "Orden: quién, verbo, preposición y lugar."],
    },
  ];
}

export function englishSheetLink(calendarDate: string | undefined): { href: string; label: string } | null {
  if (calendarDate !== ENGLISH_SHEET_DATE) return null;
  return { href: ENGLISH_SHEET_HREF, label: "Hoja del 23 nov" };
}
