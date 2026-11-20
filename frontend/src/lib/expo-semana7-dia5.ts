/** Semana 7, día 5. Guion de exposición que el niño completa y luego imprime. */

export const EXPO_STORAGE_KEY = "eduardoos.expo.s7d5";
export const EXPO_NAME_ID = "meta-name";
export const EXPO_DATE_ID = "meta-date";

export type ExpoLine = {
  id: string;
  label: string;
  kind: "text" | "check";
};

export type ExpoBeat = {
  title: string;
  fieldIds: string[];
};

export type ExpoOutlineBeat = {
  title: string;
  lines: string[];
};

export type ExpoSheet = {
  id: string;
  title: string;
  note: string;
  order: string[];
  questions: ExpoLine[];
  /** Agrupa las respuestas en el orden de la exposición. */
  beats: ExpoBeat[];
  speakLeft: ExpoLine[];
  speakRight: ExpoLine[];
};

const text = (id: string, label: string): ExpoLine => ({ id, label, kind: "text" });
const check = (id: string, label: string): ExpoLine => ({ id, label, kind: "check" });

export const EXPO_SHEETS: ExpoSheet[] = [
  {
    id: "bib",
    title: "Biblia",
    note: "Éxodo 16 a 26, Salmos 33 a 44, Marcos 12 a 16 y Lucas 1 y 2.",
    order: [
      "En el desierto Dios alimentó al pueblo y le dio agua.",
      "En el Sinaí le dio una ley para vivir.",
      "El tabernáculo: Dios quiere habitar con su pueblo.",
      "Jesús muere y resucita, y Lucas cuenta que nace.",
    ],
    questions: [
      text("bib-q1", "¿Qué comparten el maná y el pan de tu mesa, y qué no?"),
      text("bib-q2", "Dios dio agua. ¿Qué añade eso al cuidado, más allá de la comida?"),
      text("bib-q3", "Una ley no es un castigo suelto. ¿Para qué le sirvió al pueblo?"),
      text("bib-q4", "Elige un mandamiento de esa semana. ¿A quién protege?"),
      text("bib-q5", "¿En qué se parecen el tabernáculo y el nacimiento de Jesús?"),
      text("bib-q6", "¿En qué no son lo mismo el tabernáculo y el pesebre?"),
      text("bib-q7", "¿Por qué la cruz y la tumba vacía van juntas en Marcos?"),
      text("bib-q8", "Si cuentas solo el nacimiento y callas la cruz, ¿qué se pierde?"),
      text("bib-q9", "De un salmo de la semana, ¿qué idea le habla a un miedo tuyo?"),
      text("bib-q10", "En una oración: ¿qué quiere Dios con su pueblo esta semana?"),
      text("bib-q11", "¿Qué frase no dirías, porque no está en estas lecturas?"),
      text("bib-q12", "Para un hermano menor, una oración sobre el maná."),
      text("bib-q13", "Para ese hermano, una oración sobre el tabernáculo."),
      text("bib-q14", "Para ese hermano, una oración sobre Jesús en esta semana."),
      text("bib-q15", "¿Qué capítulo contarías primero si solo tuvieras un minuto?"),
    ],
    beats: [
      { title: "El desierto", fieldIds: ["bib-q1", "bib-q2", "bib-q12"] },
      { title: "La ley", fieldIds: ["bib-q3", "bib-q4"] },
      { title: "El tabernáculo", fieldIds: ["bib-q5", "bib-q6", "bib-q13"] },
      {
        title: "El Evangelio y el cierre",
        fieldIds: ["bib-q7", "bib-q8", "bib-q9", "bib-q10", "bib-q11", "bib-q14", "bib-q15"],
      },
    ],
    speakLeft: [
      text("bib-s1", "El desierto. La comida."),
      text("bib-s2", "El desierto. El agua."),
      text("bib-s3", "La ley. Qué recibió el pueblo."),
      text("bib-s4", "La ley. A quién protege un mandato."),
      text("bib-s5", "El tabernáculo. Qué es."),
      text("bib-s6", "El tabernáculo. Qué muestra de Dios."),
    ],
    speakRight: [
      text("bib-s7", "El Evangelio. El nacimiento."),
      text("bib-s8", "El Evangelio. La cruz."),
      text("bib-s9", "El Evangelio. La tumba vacía."),
      text("bib-s10", "Un salmo. La frase de confianza y el miedo de tu casa."),
      text("bib-s11", "Cierre. El cuidado de Dios y tu mesa de hoy."),
      check("bib-c1", "Dije el desierto antes que la ley."),
      check("bib-c2", "Dije el tabernáculo antes que el Evangelio."),
      check("bib-c3", "La cruz y la tumba vacía están las dos."),
      check("bib-c4", "El cierre habla de mi casa."),
      text("bib-short", "En cuatro oraciones cortas, el orden completo."),
    ],
  },
  {
    id: "ide",
    title: "Identidad",
    note: "Nación Agrícola, parte 1 y parte 2. Zamora y Castro no son la misma historia.",
    order: [
      "Qué es una nación agrícola.",
      "Zamora: tierra y campesinos. Lugar, fecha y frase.",
      "Castro: puertos y soberanía. Año, países y frase.",
      "En qué no son la misma historia, y qué te importa a ti.",
    ],
    questions: [
      text("ide-q1", "¿Por qué Zamora no nació en Barinas, y por qué Barinas importa?"),
      text("ide-q2", "Explica «Tierra y hombres libres» y «Horror a la oligarquía»."),
      text("ide-q3", "¿Qué proponía Zamora sobre la tierra y sobre la deuda?"),
      text("ide-q4", "Santa Inés y San Carlos no son el mismo hecho. ¿Qué pasó en cada uno?"),
      text("ide-q5", "En 1902, ¿qué atacaron los barcos?"),
      text("ide-q6", "¿Qué decidió Venezuela en 1903 y qué no entregó?"),
      text("ide-q7", "Di la soberanía en una oración, con los puertos o las leyes."),
      text("ide-q8", "Si dicen que Castro y Zamora hicieron lo mismo, ¿qué contestas?"),
      text("ide-q9", "Un alimento del campo en tu mesa. ¿De qué historia lo acercas?"),
      text("ide-q10", "Algo de tu familia que no debe decidir un extraño. ¿Por qué?"),
      text("ide-q11", "¿Qué dato de la primera clase había que corregir?"),
      text("ide-q12", "¿Qué no vas a decir de Zamora, porque la clase no lo afirma?"),
      text("ide-q13", "¿En qué año fue el bloqueo y qué países lo hicieron?"),
      text("ide-q14", "¿Dónde nació Castro, y en qué no se parece a Zamora?"),
    ],
    beats: [
      { title: "Nación agrícola", fieldIds: ["ide-q9"] },
      { title: "Zamora", fieldIds: ["ide-q1", "ide-q2", "ide-q3", "ide-q4", "ide-q11", "ide-q12"] },
      { title: "Castro", fieldIds: ["ide-q5", "ide-q6", "ide-q7", "ide-q13", "ide-q14"] },
      { title: "No son la misma historia", fieldIds: ["ide-q8", "ide-q10"] },
    ],
    speakLeft: [
      text("ide-s1", "Nación agrícola, en una oración."),
      text("ide-s2", "Zamora. Dónde nació y qué no es Barinas."),
      text("ide-s3", "Zamora. Santa Inés y la frase de la tierra."),
      text("ide-s4", "Castro. El año del bloqueo y los países."),
      text("ide-s5", "Castro. Lo que Venezuela no entregó."),
    ],
    speakRight: [
      text("ide-s6", "No los confundo porque…"),
      text("ide-s7", "Me importa en mi mesa o en mi casa porque…"),
      check("ide-c1", "Dije Cúa, no Barinas, como lugar de nacimiento."),
      check("ide-c2", "Barinas quedó en Santa Inés."),
      check("ide-c3", "El bloqueo es de barcos en los puertos."),
      check("ide-c4", "En 1903 Venezuela no quedó colonia."),
      text("ide-short", "Cuatro oraciones cortas, una por paso del orden."),
    ],
  },
  {
    id: "len",
    title: "Lenguaje",
    note: "Tres clases: viajes de Pablo, el plan del día y Apocalipsis.",
    order: [
      "Exploratoria: un lugar en los viajes de Pablo.",
      "Oralidad: mi idea y la de otra persona.",
      "Acuciosa: un detalle de Apocalipsis para enseñarlo.",
      "Cuándo uso cada modo.",
    ],
    questions: [
      text("len-q1", "¿Qué lugar localizaste en Hechos 13 o 14, y en qué capítulo?"),
      text("len-q2", "¿Por qué esa búsqueda no alcanza para aprender Apocalipsis 5?"),
      text("len-q3", "En el plan del día, escribe una idea tuya."),
      text("len-q4", "Escribe una idea de otra persona de la casa."),
      text("len-q5", "¿Cómo se juntan esas dos ideas en una decisión?"),
      text("len-q6", "Elige un detalle de Apocalipsis. ¿Qué dice el texto?"),
      text("len-q7", "¿Por qué se lo cuentas a alguien?"),
      text("len-q8", "Cuando busco un dato, ¿de qué modo leo?"),
      text("len-q9", "Cuando voy a informar, ¿de qué modo leo?"),
      text("len-q10", "Cuando decidimos juntos, ¿qué hago yo?"),
      text("len-q11", "¿Qué se pierde si lees Apocalipsis solo buscando una ciudad?"),
      text("len-q12", "¿Qué se pierde si en el plan del día solo hablas tú?"),
      text("len-q13", "¿Qué modo usas para contarle Apocalipsis a tu familia?"),
      text("len-q14", "¿Qué modo usas para buscar en qué ciudad estuvo Pablo?"),
    ],
    beats: [
      { title: "Lectura exploratoria", fieldIds: ["len-q1", "len-q2", "len-q14"] },
      { title: "Oralidad", fieldIds: ["len-q3", "len-q4", "len-q5", "len-q12"] },
      { title: "Lectura acuciosa", fieldIds: ["len-q6", "len-q7", "len-q11", "len-q13"] },
      { title: "Cuándo uso cada modo", fieldIds: ["len-q8", "len-q9", "len-q10"] },
    ],
    speakLeft: [
      text("len-s1", "Exploratoria. El lugar de Pablo y el capítulo."),
      text("len-s2", "Oralidad. Mi idea."),
      text("len-s3", "Oralidad. La idea del otro y la decisión."),
      text("len-s4", "Acuciosa. El detalle que enseño."),
      text("len-s5", "Acuciosa. A quién se lo digo."),
    ],
    speakRight: [
      text("len-s6", "Cada modo tiene su trabajo. Una oración."),
      check("len-c1", "El ejemplo de Pablo es un lugar, no todo Hechos."),
      check("len-c2", "En la decisión se oyen dos voces."),
      check("len-c3", "El detalle de Apocalipsis se puede señalar en el texto."),
      check("len-c4", "Dije cuándo uso cada modo."),
      text("len-s7", "Para quien no estuvo en la clase, una frase."),
      text("len-short", "Cuatro oraciones cortas, en el orden."),
    ],
  },
  {
    id: "mat",
    title: "Matemática",
    note: "Hojas del 18, del 19 y del 20. Formas, un cuerpo y un ejercicio explicado.",
    order: [
      "Dos formas planas: parecido y diferencia.",
      "Un cuerpo: por qué no es un dibujo plano.",
      "Un ejercicio de número, paso a paso.",
      "Qué hoja usaste para cada parte.",
    ],
    questions: [
      text("mat-q1", "Elige dos formas planas. ¿Cómo se llaman?"),
      text("mat-q2", "¿Qué comparten?"),
      text("mat-q3", "¿Qué las distingue?"),
      text("mat-q4", "Elige un cuerpo: cubo, esfera, cilindro, cono o pirámide."),
      text("mat-q5", "¿Qué tiene ese cuerpo que la forma plana no tiene?"),
      text("mat-q6", "¿Por qué una esfera y un círculo no son la misma respuesta?"),
      text("mat-q7", "De las tablas del 6 al 9, escribe los dos factores, sin el producto."),
      text("mat-q8", "Explica por qué el producto es ese."),
      text("mat-q9", "En una división exacta: ¿cuál es el todo, el grupo y el resultado?"),
      text("mat-q10", "En una multiplicación de tres cifras, ¿cuál es el primer paso?"),
      text("mat-q11", "¿Qué miras para no confundir un cono con un triángulo?"),
      text("mat-q12", "¿Qué hoja usaste para las formas y cuál para el número?"),
      text("mat-q13", "Una semejanza entre el cubo y el cuadrado, y la diferencia."),
      text("mat-q14", "¿Por qué el resultado solo se dice al final?"),
    ],
    beats: [
      { title: "Dos formas planas", fieldIds: ["mat-q1", "mat-q2", "mat-q3", "mat-q13"] },
      { title: "Un cuerpo", fieldIds: ["mat-q4", "mat-q5", "mat-q6", "mat-q11"] },
      { title: "El ejercicio, paso a paso", fieldIds: ["mat-q7", "mat-q8", "mat-q9", "mat-q10", "mat-q14"] },
      { title: "Qué hoja usé", fieldIds: ["mat-q12"] },
    ],
    speakLeft: [
      text("mat-s1", "Dos formas planas. El nombre."),
      text("mat-s2", "En qué se parecen y en qué no."),
      text("mat-s3", "Un cuerpo. El nombre y por qué no es plano."),
      text("mat-s4", "Paso 1 del ejercicio."),
      text("mat-s5", "Paso 2 del ejercicio."),
    ],
    speakRight: [
      text("mat-s6", "Paso 3 del ejercicio."),
      text("mat-s7", "El resultado, en una oración."),
      check("mat-c1", "Primero mostré dos formas planas, no dos cuerpos."),
      check("mat-c2", "Nombré el cuerpo y dije que se puede rodear o apoyar."),
      check("mat-c3", "Expliqué los pasos antes del resultado."),
      check("mat-c4", "El hecho de la tabla es del 6, del 7, del 8 o del 9."),
      text("mat-short", "Cuatro oraciones cortas, en el orden."),
    ],
  },
  {
    id: "cie",
    title: "Ciencias",
    note: "La pisca andina. Puntajes del 1 al 5. No son gramos.",
    order: [
      "Qué es la pisca y dónde se come.",
      "Tres ingredientes, con su grupo y su puntaje.",
      "Qué no va dentro del caldero y qué le falta al desayuno.",
      "Una comida de tu casa, con los mismos grupos.",
    ],
    questions: [
      text("cie-q1", "Papa y arepa empatan en energía. ¿Por qué no son el mismo grupo?"),
      text("cie-q2", "Leche: 5 en calcio. Huevo: 5 en proteína. ¿Qué pasa si quitas una?"),
      text("cie-q3", "El cilantro casi no da energía. ¿Para qué está en la sopa?"),
      text("cie-q4", "El agua va en el caldero y no es un grupo del trompo. ¿Qué hace?"),
      text("cie-q5", "La sal tampoco es un grupo. ¿Qué hace?"),
      text("cie-q6", "La arepa va al lado. ¿De qué grupo es y qué aporta?"),
      text("cie-q7", "¿Qué fruta agregas y de qué grupo es?"),
      text("cie-q8", "Ordena la preparación: papas, luego leche, luego huevo y cilantro."),
      text("cie-q9", "«Pizca andica» no es el nombre. Escríbelo bien y di qué cambiaste."),
      text("cie-q10", "¿Qué ingrediente aporta la energía y cuál la proteína?"),
      text("cie-q11", "Una comida de tu casa: tres alimentos y el grupo de cada uno."),
      text("cie-q12", "Comparada con el desayuno completo, ¿qué le falta a esa comida?"),
      text("cie-q13", "Cilantro, cebollín y ajo son hortalizas. ¿Cuál aporta más vitaminas?"),
      text("cie-q14", "¿Por qué la fruta no va dentro de la pisca y aun así hace falta?"),
    ],
    beats: [
      { title: "Qué es la pisca", fieldIds: ["cie-q9", "cie-q8"] },
      { title: "Tres ingredientes", fieldIds: ["cie-q1", "cie-q2", "cie-q3", "cie-q10", "cie-q13"] },
      { title: "Fuera del caldero", fieldIds: ["cie-q4", "cie-q5", "cie-q6", "cie-q7", "cie-q14"] },
      { title: "Una comida de mi casa", fieldIds: ["cie-q11", "cie-q12"] },
    ],
    speakLeft: [
      text("cie-s1", "La pisca es, y se come en…"),
      text("cie-s2", "Ingrediente 1. Nombre, grupo y puntaje."),
      text("cie-s3", "Ingrediente 2. Nombre, grupo y puntaje."),
      text("cie-s4", "Ingrediente 3. Nombre, grupo y puntaje."),
      text("cie-s5", "Fuera del caldero, y la fruta que falta."),
    ],
    speakRight: [
      text("cie-s6", "En mi casa, el plato parecido, con sus grupos."),
      check("cie-c1", "Dije pisca andina, no pizca andica."),
      check("cie-c2", "La arepa quedó al lado del caldero."),
      check("cie-c3", "El agua y la sal no quedaron como grupo del trompo."),
      check("cie-c4", "Nombré una fruta y cerré con una comida de mi casa."),
      text("cie-short", "Cuatro oraciones cortas, en el orden."),
    ],
  },
];

export function expoFieldIds(sheets: ExpoSheet[] = EXPO_SHEETS): string[] {
  const ids: string[] = [];
  for (const sheet of sheets) {
    for (const line of [...sheet.questions, ...sheet.speakLeft, ...sheet.speakRight]) {
      ids.push(line.id);
    }
  }
  return ids;
}

/** Acepta solo texto corto guardado en este navegador. Ignora basura. */
export function parseExpoAnswers(raw: string | null): Record<string, string> {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const allowed = new Set([
    ...expoFieldIds(),
    EXPO_NAME_ID,
    EXPO_DATE_ID,
    ...EXPO_SHEETS.map((sheet) => outlineStorageId(sheet.id)),
  ]);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!allowed.has(key) || typeof value !== "string") continue;
    out[key] = value.slice(0, 2000);
  }
  return out;
}

export function outlineStorageId(sheetId: string): string {
  return `outline-${sheetId}`;
}

/** Arma el esquema de exposición con las oraciones ya escritas. */
export function outlineFromAnswers(
  sheet: ExpoSheet,
  answers: Record<string, string>,
): ExpoOutlineBeat[] {
  return sheet.beats.map((beat) => ({
    title: beat.title,
    lines: beat.fieldIds
      .map((id) => (answers[id] ?? "").trim())
      .filter((line) => line.length > 0),
  }));
}

export function outlinePlainText(sheet: ExpoSheet, answers: Record<string, string>): string {
  return outlineFromAnswers(sheet, answers)
    .map((beat, index) => {
      const body = beat.lines.length > 0 ? beat.lines.map((line) => `- ${line}`).join("\n") : "-";
      return `${index + 1}. ${beat.title}\n${body}`;
    })
    .join("\n");
}
