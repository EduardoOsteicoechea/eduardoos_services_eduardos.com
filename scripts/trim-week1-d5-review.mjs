/**
 * Compact day-5 review overviews for week1 l6 (leave room; fill ~160–220 words).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const week1 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../frontend/public/homescool/media/week1");

const PR_ES = "Práctica: Ahora te toca a ti. Di en voz alta la idea clave.";
const ER_ES = "Error común: Mezclar ideas de dos puntos distintos.";
const PR_EN = "Practice: Your turn. Say the key idea out loud.";
const ER_EN = "Common mistake: Mixing up two different points.";

function block(idea, locale) {
  const pr = locale === "en" ? PR_EN : PR_ES;
  const er = locale === "en" ? ER_EN : ER_ES;
  return `${idea}\n\n${pr}\n\n${er}`;
}

const bodies = {
  "esp-c3-w1-d5-l6": [
    "Esta semana memorizaste las **nueve categorías** gramaticales y las usaste en oraciones reales.",
    "**Sustantivo**, **verbo** y **pronombre**: nombrar, actuar y sustituir sin repetir el nombre.",
    "**Adjetivo**, **artículo** y **adverbio** afinan el mensaje junto al sustantivo o al verbo.",
    "**Conjunción**, **preposición** e **interjección** unen ideas, marcan relación o emoción.",
    "Si recitas la lista completa y clasificas un párrafo breve, ya cerraste la semana.",
  ],
  "ing-c3-w1-d5-l6": [
    "This week you learned three Spanish verb families: **-ar**, **-er**, and **-ir** in the present.",
    "**-ar** with **cantar**: yo **canto**, tú **cantas**, él **canta** — drop -ar, then add the ending.",
    "**-er** with **comer**: yo **como**, tú **comes**, él **come** — hear the -es/-e endings.",
    "**-ir** with **vivir**: yo **vivo**, tú **vives**, él **vive** — same person pattern as -er here.",
    "If you can fill a yo/tú/él chart for all three families, you hold the heart of the week.",
  ],
  "lat-c3-w1-d5-l6": [
    "Repasamos preposiciones latinas cortas y la relación que marcan en español.",
    "**In** = en · **apud** = con o junto a (compañía o cercanía, no siempre lugar).",
    "**Per** = por o a través · **sine** = sin (camino o medio frente a ausencia).",
    "**A/ab** y **de** pueden verse como «de», pero preguntan origen, tema o separación.",
    "Si traduces primero la relación y luego la frase, ya repasaste la semana entera.",
  ],
  "mat-c3-w1-d5-l6": [
    "Multiplicar forma **grupos iguales**: factores por factores dan el **producto**.",
    "Tablas **1–4**: conservar, doblar y comprobar con suma repetida cuando dudes.",
    "Tablas **5–8**: patrón del 5 (0 o 5), doble de 4 y práctica paciente del 7.",
    "Tablas **9–12**: trucos del 9, cero del 10 y descomposición 10+2 para el 12.",
    "Si resuelves un producto de cada bloque y lo compruebas, cerraste la semana.",
  ],
  "his-c3-w1-d5-l6": [
    "Antes de **Colón**, Venezuela ya tenía pueblos diversos con territorios y modos de vida propios.",
    "**Timotocuicas** y los llanos: conucos, pesca, aldeas e intercambio.",
    "**Caribes** y **Arawacos**: costa, ríos, canoa, yuca e intercambio entre aldeas.",
    "**Wayús** en La **Guajira**: pastoreo, tejido del chinchorro y memoria viva.",
    "Texto guía: Timotocuicas, Caribes, Arawacos y Wayús antes de la llegada de Colón.",
  ],
  "LT-c3-w1-d5-l6": [
    "Una **línea de tiempo** ordena hitos; el mapa muestra el lugar sin mezclar fuentes.",
    "Separa tipos de información: historia antigua del Cercano Oriente y relato de Génesis.",
    "**Babel** y los **sumerios** (Tigris y Éufrates) se anotan con etiqueta de fuente.",
    "Otros pueblos se colocan con orden relativo, no amontonados en un solo punto.",
    "Si explicas orden más tipo de fuente con un ejemplo, ya repasaste la semana.",
  ],
  "geo-c3-w1-d5-l6": [
    "Ubica Venezuela por fronteras, puntos extremos y seis regiones de estudio.",
    "Fronteras: **Mar Caribe** norte, **Brasil** sur, **Guyana** este, **Colombia** oeste.",
    "Un **punto extremo** es una referencia lejana en una dirección; no es toda la frontera.",
    "Regiones: Central, Oriental, Occidental, Los Andes, Los Llanos y Guayana.",
    "No mezcles **Guyana** (país vecino) con **Guayana** (región venezolana).",
  ],
  "cie-c3-w1-d5-l6": [
    "Los **tejidos** son grupos de células parecidas con una tarea común en el cuerpo.",
    "**Epitelial** cubre y protege; **conectivo** une, sostiene o transporta materiales.",
    "**Muscular** mueve al contraerse, a veces a voluntad y a veces de modo más automático.",
    "**Nervioso** lleva mensajes rápidos para sentir, decidir y responder.",
    "Piel, hueso, músculo y nervio colaboran en un solo movimiento cotidiano.",
  ],
  "art-c3-w1-d5-l6": [
    "**OiLS** (Mona Brookes) mira el dibujo por partes sencillas antes de los detalles.",
    "**O** son redondos e **i** son puntos: primero la forma grande, luego la marca pequeña.",
    "**L** son líneas rectas horizontales, verticales o diagonales que forman ángulos.",
    "**S** son curvas suaves que dan movimiento al trazo sin perder la estructura.",
    "Un dibujo etiquetado con O, i, L y S resume la idea central de la semana.",
  ],
  "exe-c3-w1-d5-l6": [
    "Romanos 1:1 se lee con **exégesis**: atender con cuidado lo que el texto realmente dice.",
    "**Pablo** se presenta como autor al inicio de la carta; el saludo no sobra.",
    "**Siervo** y **apóstol** nombran servicio a Cristo y envío con un mensaje.",
    "Fue **apartado** para el **evangelio de Dios**, la buena noticia que viene de Dios.",
    "Si resumes el versículo sin añadir ideas ajenas, ya cerraste la semana.",
  ],
  "teb-c3-w1-d5-l6": [
    "La **redención** hilvana el relato bíblico desde el comienzo hasta la meta final.",
    "En Génesis aparecen creación, caída y promesa que sostiene la historia.",
    "Israel recibe pactos; el **evangelio** anuncia a Cristo y su obra.",
    "La esperanza mira la **nueva tierra** y la restauración de lo dañado.",
    "Si conectas creación, evangelio y nueva tierra en tres frases, repasaste la semana.",
  ],
};

for (const [key, ideas] of Object.entries(bodies)) {
  const file = path.join(week1, `${key}.eoschool.json`);
  if (!fs.existsSync(file)) {
    console.warn("missing", key);
    continue;
  }
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  const loc = doc.locale || "es";
  doc.lesson.points.forEach((p, i) => {
    p.body = block(ideas[i] ?? ideas[ideas.length - 1], loc);
  });
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
  console.log("trimmed", key);
}
