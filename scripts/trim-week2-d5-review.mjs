import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const week2 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../frontend/public/homescool/media/week2");

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
  "art-c3-w2-d5-l6": [
    "Esta semana usamos **Atención**, **Nombrar** y **Expresar** para dibujos **espejo** con el eje de **simetría**.",
    "**OiLS** nombra formas: círculo, punto, línea, ángulo y curva. El eje divide la figura en dos mitades iguales.",
    "Antes de copiar, **mide** la distancia de cada forma al eje; la otra mitad repite tamaño y lugar.",
    "Completa la media imagen sin inventar adornos nuevos; primero la parte simétrica, luego detalles.",
    "Si puedes trazar una figura espejo con OiLS, ya tienes la idea central de la semana.",
  ],
  "cie-c3-w2-d5-l6": [
    "El **esqueleto** sostiene el cuerpo, da forma y protege órganos delicados en cabeza, espalda y pecho.",
    "El **cráneo** cubre el **cerebro**; la **mandíbula** abajo se mueve al hablar y masticar.",
    "Las **vértebras** se apilan en la **columna** y protegen la **médula espinal**, camino de mensajes nerviosos.",
    "**Costillas**, **esternón** y vértebras arman la **caja torácica** que cuida **corazón** y **pulmones**.",
    "Cráneo, columna y caja torácica trabajan juntos: soporte por fuera y escudo por dentro.",
  ],
  "geo-c3-w2-d5-l6": [
    "Repasamos cuatro pares estado–capital; esta semana es un paso de la espiral hacia **24** estados.",
    "**Distrito Capital** — **Caracas** (capital nacional y del estado). **La Guaira** — **La Guaira** (capital costera).",
    "**Miranda** — **Los Teques** en la cordillera. **Aragua** — **Maracay** en el valle central; no los intercambies.",
    "Los cuatro pares viven en la **Región Central** y el litoral; ubícalos en un mapa mental cerca de Caracas.",
    "Texto final para recitar: DC—Caracas · La Guaira—La Guaira · Miranda—Los Teques · Aragua—Maracay.",
  ],
  "lat-c3-w2-d5-l6": [
    "**Et** = y · **ut** = para que (meta) · **non** = no. Tres palabras latinas con tres trabajos distintos en la frase.",
    "**Et** une ideas o nombres: *puer et puella*, *currit et ridet* — traduce «y» entre ambas partes.",
    "**Ut** responde «¿para qué?»: *laboro ut discam* — trabajo **para que** aprenda.",
    "**Non** niega antes del verbo: *non venit* (no viene), *non canto* (no canto).",
    "Si reconoces **et**, **ut** y **non** en una frase corta, ya repasaste la semana entera.",
  ],
  "ing-c3-w2-d5-l6": [
    "This week we learn to narrate **when** in Spanish: **one-word** verb forms or **two words** with **haber** plus the participle.",
    "Five **one-word** stations with *cantar*: **canto**, **cantaba**, **canté**, **cantaré**, **cantaría** — same root, different time.",
    "Two-word times always look like **haber** + **-ado/-ido**: *he cantado*, *había comido*; only **haber** changes with I/you/he.",
    "Choose by asking three questions: Is the past closed? Does the result still matter? Is it background or habit?",
    "If you can build one clear example of each path, you hold the heart of this week’s Spanish times.",
  ],
};

for (const [key, ideas] of Object.entries(bodies)) {
  const file = path.join(week2, `${key}.eoschool.json`);
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  const loc = doc.locale || "es";
  doc.lesson.points.forEach((p, i) => {
    p.body = block(ideas[i] ?? ideas[ideas.length - 1], loc);
  });
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
  console.log("trimmed", key);
}
