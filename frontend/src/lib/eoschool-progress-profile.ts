import { subjectProgressValue, type SubjectProgressTone } from "./eoschool-curriculum-progress-status";

export const ELIAS_STUDENT_KEY = "elias-osteicoechea";
export const PROFILE_READ_ON = "2026-11-27";
export const TOTAL_PLAN_DAYS = 200;
export const DAYS_PER_WEEK = 5;

const SECTION_ORDER = ["bib", "ide", "len", "mat", "cie", "eng", "ia"] as const;

const SECTION_LABEL: Record<string, string> = {
  bib: "Biblia",
  ide: "Identidad",
  len: "Lenguaje",
  mat: "Matemática",
  cie: "Ciencias",
  eng: "Inglés",
  ia: "IA",
};

/** Scores the manner reading was written against. A later edit must not keep that prose. */
export const ELIAS_READ_SCORES: Record<string, number> = {
  "d38:bib": 100,
  "d38:cie": 89,
  "d38:eng": 83,
  "d38:ia": 100,
  "d38:len": 70,
  "d38:mat": 86,
  "d39:bib": 94,
  "d39:eng": 78,
  "d39:ia": 70,
  "d39:ide": 72,
  "d39:len": 75,
  "d39:mat": 84,
  "d40:bib": 86,
  "d40:cie": 88,
  "d40:eng": 84,
  "d40:ia": 90,
  "d40:ide": 74,
  "d40:len": 60,
  "d40:mat": 80,
};

export type PlanDayDate = { planDay: number; calendarDate: string };

export type SubjectLine = {
  section: string;
  label: string;
  mean: number;
  tone: SubjectProgressTone;
  trail: string;
  first: number;
  last: number;
};

export type ProgressStats = {
  throughDay: number;
  week: number;
  totalPlanDays: number;
  completed: number;
  scheduled: number;
  scoreCount: number;
  mean: number | null;
  green: number;
  yellow: number;
  red: number;
  dayLines: { day: number; mean: number; count: number }[];
  subjects: SubjectLine[];
  firstScoredDay: number | null;
  lastScoredDay: number | null;
};

export type ProfileReading = { title: string; text: string };

export type ProgressProfileView = {
  calendar: string;
  pace: string;
  numbers: string;
  subjects: SubjectLine[];
  readings: ProfileReading[];
  footnote: string;
};

type ScorePoint = { day: number; section: string; score: number };

function roundMean(sum: number, count: number): number {
  return Math.round(sum / count);
}

export function scoreSignature(scores: Record<string, number>): string {
  return Object.entries(scores)
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
    .map(([key, value]) => `${key}:${value}`)
    .sort()
    .join("|");
}

export const ELIAS_READ_SIGNATURE = scoreSignature(ELIAS_READ_SCORES);

export function planDayOnOrBefore(days: readonly PlanDayDate[], isoDate: string): number {
  let best = 0;
  for (const day of days) {
    if (!day.calendarDate || day.calendarDate > isoDate) continue;
    if (day.planDay > best) best = day.planDay;
  }
  return best;
}

export function localIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function paceLabel(completed: number, scheduled: number): string {
  if (scheduled <= 0) return "";
  const ratio = completed / scheduled;
  if (ratio >= 0.9) return "Va con el día.";
  if (ratio >= 0.7) return "Va un poco detrás del día.";
  return "Va detrás del día.";
}

function parseScores(scores: Record<string, number>): ScorePoint[] {
  const points: ScorePoint[] = [];
  for (const [key, score] of Object.entries(scores)) {
    if (typeof score !== "number" || !Number.isFinite(score)) continue;
    const match = /^d(\d+):([a-z]+)$/.exec(key);
    if (!match) continue;
    const section = match[2];
    if (!SECTION_LABEL[section]) continue;
    points.push({ day: Number(match[1]), section, score });
  }
  points.sort((a, b) => a.day - b.day || a.section.localeCompare(b.section));
  return points;
}

export function buildProgressStats(
  scores: Record<string, number>,
  input: { throughDay: number; completed: number; scheduled: number; totalPlanDays?: number },
): ProgressStats {
  const points = parseScores(scores);
  const byDay = new Map<number, number[]>();
  const bySection = new Map<string, number[]>();
  let green = 0;
  let yellow = 0;
  let red = 0;
  let sum = 0;
  for (const point of points) {
    sum += point.score;
    const tone = subjectProgressValue(true, point.score).tone;
    if (tone === "green") green += 1;
    else if (tone === "yellow") yellow += 1;
    else red += 1;
    const dayScores = byDay.get(point.day) ?? [];
    dayScores.push(point.score);
    byDay.set(point.day, dayScores);
    const sectionScores = bySection.get(point.section) ?? [];
    sectionScores.push(point.score);
    bySection.set(point.section, sectionScores);
  }
  const dayLines = [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, values]) => ({
      day,
      mean: roundMean(values.reduce((total, value) => total + value, 0), values.length),
      count: values.length,
    }));
  const subjects: SubjectLine[] = [];
  for (const section of SECTION_ORDER) {
    const values = bySection.get(section);
    if (!values?.length) continue;
    const mean = roundMean(values.reduce((total, value) => total + value, 0), values.length);
    subjects.push({
      section,
      label: SECTION_LABEL[section],
      mean,
      tone: subjectProgressValue(true, mean).tone,
      trail: values.join(" → "),
      first: values[0],
      last: values[values.length - 1],
    });
  }
  const throughDay = input.throughDay;
  return {
    throughDay,
    week: throughDay > 0 ? Math.ceil(throughDay / DAYS_PER_WEEK) : 0,
    totalPlanDays: input.totalPlanDays ?? TOTAL_PLAN_DAYS,
    completed: input.completed,
    scheduled: input.scheduled,
    scoreCount: points.length,
    mean: points.length ? roundMean(sum, points.length) : null,
    green,
    yellow,
    red,
    dayLines,
    subjects,
    firstScoredDay: dayLines[0]?.day ?? null,
    lastScoredDay: dayLines[dayLines.length - 1]?.day ?? null,
  };
}

function calendarText(stats: ProgressStats): string {
  if (stats.throughDay <= 0) return "El año escolar todavía no llega al día 1.";
  const counted =
    stats.scheduled > 0
      ? `De las ${stats.scheduled} materias programadas hasta ese día, ${stats.completed} están hechas.`
      : "";
  const scored =
    stats.firstScoredDay != null && stats.lastScoredDay != null
      ? `Las notas van del día ${stats.firstScoredDay} al día ${stats.lastScoredDay}.`
      : "Todavía no hay notas.";
  return `Hoy corresponde el día ${stats.throughDay} de ${stats.totalPlanDays}, semana ${stats.week}. ${counted} ${scored} Los criterios de tercer grado son la barra de fin de año. En la semana ${stats.week} se mira si va con el día y si lo ya pedido se sostiene.`;
}

function numbersText(stats: ProgressStats): string {
  if (stats.mean == null || stats.scoreCount === 0) return "Sin puntajes, no hay promedio.";
  const days = stats.dayLines.map((line) => `día ${line.day} en ${line.mean}`).join(", ");
  const below = stats.red === 0 ? "Ninguna nota queda por debajo de 50." : `${stats.red} quedan por debajo de 50.`;
  return `Promedio ${stats.mean} en ${stats.scoreCount} notas. ${stats.green} en verde, desde 80. ${stats.yellow} en amarillo, desde 50. ${below} Por día: ${days}.`;
}

function eliasManner(): ProfileReading[] {
  return [
    {
      title: "Lectura",
      text: "Localizar el dato explícito va en verde. Cuando falla, cambia ese dato por otro parecido: un ángel en el lugar del rostro de Moisés, o el tabernáculo en el lugar de los muebles de Bezaleel. Ese es el criterio de tercer grado, y es el que hay que seguir practicando.",
    },
    {
      title: "Lenguaje",
      text: "Es la franja más atrás de lo que el texto ya le pidió. El promedio no llega a 80 y el día 40 queda en 60. Encuentra varios hechos y suelta la frase exacta y la lección: amar al enemigo quedó en ser amable, y la casa del que oye y hace la puso en el suelo. El párrafo tiene inicio, medio y fin, y se le va la idea que cierra el sentido.",
    },
    {
      title: "Matemática",
      text: "Las tablas, que son la barra de tercer grado, están. La división exacta la comprueba con la multiplicación. Sabe que 1/4 va antes que 1/2 y que es menor; en un ítem dejó 1/4 escrito como 4. La multiplicación que se le corre un dígito es de tres cifras. La barra del grado pide dos cifras por una: el error es de ejecución en una cuenta más grande que esa barra. Figura plana y cuerpo todavía se le mezclan. Esa distinción, a fin de año, tiene que estar firme. En la semana 8 no lo está.",
    },
    {
      title: "Ciencias",
      text: "El imán cumple el criterio de la fuerza: actúa sin tocar, y los polos iguales se empujan. El grupo de alimentos se le cruza, entre lácteos, harina y calcio. Eso es contenido de estas semanas. El criterio de fin de año, que el animal no fabrica su comida, no aparece en estas notas.",
    },
    {
      title: "Inglés",
      text: "Copia la oración y el orden de las palabras sale. La oración propia se traba en lo mismo: will deja el verbo en la forma base, falta la s de la tercera persona, y faltan to, in y on. Va en la barra de una oración simple, con la misma falla repetida.",
    },
    {
      title: "Identidad",
      text: "Esto es del plan, no de la barra internacional. El orden de los hechos ya cuadra. El nombre propio y el año, pegados a ese hecho, todavía no.",
    },
    {
      title: "Dibujo",
      text: "Guarda el bulto de la pieza y deja fuera el detalle que no es el contorno: el grosor y la rampa. Al día siguiente, cuando tiene que decir el método, la nota sube. Entiende el procedimiento al hablarlo. La mano todavía no registra cada rasgo.",
    },
    {
      title: "La manera",
      text: "Avanza por el dato que se puede señalar y por el procedimiento que ya ensayó. Ahí se le ve capaz. Se le afloja cuando la respuesta correcta no es la primera idea cercana, o cuando hay que guardar un detalle que no es el bulto principal. A los ocho años se piensa con lo concreto que se tiene delante, y la segunda condición se cae. El calendario lo lleva. La manera es precisa en el procedimiento visible y blanda en la frase y en el matiz. Termina las hojas. Después de un día bajo en el dibujo, al siguiente recupera cuando la tarea pasa a palabras.",
    },
    {
      title: "Qué enseñar ahora",
      text: "Esta semana toca la frase exacta y la inferencia en lenguaje. En matemática, revisar el dígito de la cuenta larga y nombrar la figura y el cuerpo con el objeto en la mano. En inglés, repetir la misma oración hasta que will deje el verbo quieto. En identidad, pegar el nombre y el año al hecho que ya ordena.",
    },
    {
      title: "Qué no se ve aquí",
      text: "Estas notas no dicen nada del sueño, del movimiento, de la pantalla ni del trato con otros. Esas filas de los criterios quedan sin leer.",
    },
  ];
}

export function buildProgressProfile(
  studentKey: string,
  scores: Record<string, number>,
  input: { throughDay: number; completed: number; scheduled: number },
): ProgressProfileView {
  const stats = buildProgressStats(scores, input);
  const readings: ProfileReading[] = [];
  if (studentKey === ELIAS_STUDENT_KEY && stats.scoreCount > 0) {
    if (scoreSignature(scores) === ELIAS_READ_SIGNATURE) {
      readings.push(...eliasManner());
    } else {
      readings.push({
        title: "Lectura en espera",
        text: `Los números de arriba son los de ahora. La lectura de la manera se escribió el ${PROFILE_READ_ON} sobre los días 38 a 40. Esas notas ya no coinciden, así que esa lectura no se muestra.`,
      });
    }
  } else if (stats.scoreCount > 0) {
    readings.push({
      title: "Lectura",
      text: "La lectura de la manera de avanzar está escrita para Elías. Aquí quedan los números de este estudiante.",
    });
  }
  return {
    calendar: calendarText(stats),
    pace: paceLabel(stats.completed, stats.scheduled),
    numbers: numbersText(stats),
    subjects: stats.subjects,
    readings,
    footnote: "Un criterio que falta señala qué enseñar. Esta lectura no es un diagnóstico.",
  };
}
