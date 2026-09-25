/**
 * Proyecto (pro): one experiment per week → full lesson only on day 1.
 * Days 2–4 = short continuation / lab time (keep quiz accumulation).
 * Day 5 = brief wrap + expo prep (expo lines page still rendered by FE).
 *
 * Usage: node scripts/patch-homescool-pro-day1-only.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mediaRoot = path.resolve(__dirname, "../frontend/public/homescool/media");

const WEEKS = {
  1: {
    title: "Experimento «Guiñando»: persistencia de la visión",
    projectName: "el experimento «Guiñando»",
    what: "la persistencia de la visión con un disco que parece guiñar",
  },
  2: {
    title: "Lente de una gota de agua",
    projectName: "la lente de una gota de agua",
    what: "cómo una gota redondeada puede aumentar letras como una lupa",
  },
};

function continuationBody(weekMeta, day) {
  const focus =
    day === 2
      ? "Hoy no empiezas un proyecto nuevo. Continúas el mismo de la semana: " +
        weekMeta.projectName +
        ". Revisa el día 1 si olvidaste materiales o pasos."
      : day === 3
        ? "Sigue con " +
          weekMeta.projectName +
          ". Hoy te concentras en hacer bien el procedimiento y anotar lo que observas, sin cambiar de tema."
        : "Casi terminas la semana de proyecto. Termina o mejora " +
          weekMeta.projectName +
          " y deja claras tus observaciones para poder explicarlas.";

  const practice =
    day === 2
      ? "Práctica: Reúne lo que te falte, monta o corrige el experimento y escribe tres líneas: qué hiciste, qué viste y qué te falta."
      : day === 3
        ? "Práctica: Repite el procedimiento con cuidado. Anota velocidad o forma (según el experimento) y una observación concreta."
        : "Práctica: Completa una ficha breve: propósito, un resultado y una oración que explique por qué ocurrió.";

  const error =
    "Error común: No inventes otro experimento esta semana. El proyecto es uno solo: " +
    weekMeta.what +
    ".";

  return [
    "Esta semana hay un solo proyecto. El día 1 ya explicó materiales, pasos y el porqué. Los demás días son para trabajarlo.",
    "",
    focus,
    "",
    practice,
    "",
    error,
  ].join("\n");
}

function day5Body(weekMeta) {
  return [
    "Hoy cierras el proyecto de la semana: " +
      weekMeta.projectName +
      ". No es una clase nueva con tres temas distintos: es el mismo experimento del día 1, listo para presentarlo.",
    "",
    "Repasa en voz baja: qué quisiste observar, qué materiales usaste, qué viste y por qué crees que ocurrió. Usa palabras sencillas que un compañero entienda.",
    "",
    "Práctica: En la hoja de líneas de la expo, bosqueja o escribe tu presentación: idea principal, un ejemplo de lo que observaste y un cierre de una oración.",
    "",
    "Error común: Leer solo el título del experimento. Debes poder explicar el resultado con tus propias palabras.",
  ].join("\n");
}

function patchDay(doc, week, day) {
  const meta = WEEKS[week];
  doc.title = meta.title;
  if (day === 1) {
    // Keep day-1 lesson; only ensure summary mentions one project/week.
    if (!doc.lesson.summary || !/un solo proyecto|esta semana/i.test(doc.lesson.summary)) {
      const base = (doc.lesson.summary || "").trim();
      doc.lesson.summary = base
        ? `${base} Este es el único proyecto de la semana.`
        : `Este es el único proyecto de la semana: ${meta.what}.`;
    }
    return doc;
  }

  if (day >= 2 && day <= 4) {
    doc.lesson.kind = "deepen";
    doc.lesson.focusPoint = day - 1;
    doc.lesson.points = [
      {
        id: "p1",
        heading: day === 2 ? "Continúa el proyecto" : day === 3 ? "Trabaja el procedimiento" : "Cierra observaciones",
        body: continuationBody(meta, day),
      },
    ];
    doc.lesson.summary = "";
    return doc;
  }

  // day 5
  doc.lesson.kind = "review";
  doc.lesson.focusPoint = null;
  doc.lesson.points = [
    {
      id: "p1",
      heading: "Presenta el proyecto de la semana",
      body: day5Body(meta),
    },
  ];
  doc.lesson.summary = `Proyecto semanal: ${meta.what}. Día 5 = presentación / expo.`;
  return doc;
}

let n = 0;
for (const week of [1, 2]) {
  for (const day of [1, 2, 3, 4, 5]) {
    const file = path.join(
      mediaRoot,
      `week${week}`,
      `pro-c3-w${week}-d${day}-l6.eoschool.json`,
    );
    const doc = JSON.parse(fs.readFileSync(file, "utf8"));
    const before = JSON.stringify(doc.lesson);
    patchDay(doc, week, day);
    const after = JSON.stringify(doc.lesson);
    if (before !== after) {
      fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
      n += 1;
      console.log(`patched ${path.basename(file)} kind=${doc.lesson.kind} points=${doc.lesson.points.length}`);
    } else {
      console.log(`unchanged ${path.basename(file)}`);
    }
  }
}
console.log(`done filesChanged=${n}`);
