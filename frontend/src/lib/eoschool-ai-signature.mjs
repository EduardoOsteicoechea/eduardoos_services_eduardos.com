/** Inteligencia Artificial, from plan day 38. One question a day. The child answers. */

export const AI_FROM_PLAN_DAY = 38;

const ROTATION = [
  {
    objective: "Inventario",
    learning: "Describe una pieza: tipo, color y cantidad. Tú lo dices; el agente solo lo anota.",
  },
  {
    objective: "Página",
    learning: "Decide un dato del inventario que la página muestra.",
  },
  {
    objective: "Imagen",
    learning: "Dicta qué quieres ver en la imagen y qué no debe salir.",
  },
  {
    objective: "Modelo",
    learning: "Di qué hacer si faltan piezas de un color.",
  },
  {
    objective: "Revisión",
    learning: "Di un criterio y cuántos puntos vale.",
  },
];

export function aiOnThisDay(planDay, dayKind) {
  return planDay >= AI_FROM_PLAN_DAY && dayKind !== "holiday";
}

const DAY38_CARD = [
  "Elige 10 piezas. Una foto de cada una.",
  "La IA anota color, forma y tacos. Tú corriges.",
  "Marca repetidos: misma forma y mismo color.",
];

const DAY38_READING = [
  "Hoy miras piezas de Lego. No programas. No armas una página.",
  "Cada pieza tiene propiedades. Una propiedad es algo que ves. El color se ve. La forma se ve. Los tacos de arriba se ven, si la pieza los tiene.",
  "La forma tiene un nombre. Ladrillo: es alto y tiene tacos. Placa: es baja y tiene tacos. Teja: es lisa, sin tacos. Rampa: un lado sube. Si no es ninguna de esas, dices «otra».",
  "Un tipo es una forma. Dos piezas del mismo tipo pueden tener distinto color. Un ladrillo rojo y un ladrillo azul son el mismo tipo. Un ladrillo rojo y una placa roja no lo son.",
  "Hoy eliges 10 piezas. Sacas una foto de cada una. Guardas las fotos en la carpeta fotos de este curso. Una foto, una pieza.",
  "Luego le pides a la IA de Cursor que mire cada foto. Ella escribe tres cosas: el color, la forma y si ve tacos. Eso es la ficha. Tú lees la ficha. Si algo está mal, lo corriges. La IA no inventa una pieza que no fotografiaste. No adivina tacos que no se ven. Si no está segura, pregunta. Tú contestas.",
  "Un repetido es la misma forma y el mismo color. Dos ladrillos rojos iguales son un repetido. La IA los marca. Tú dices si tiene razón.",
  "Al terminar hay 10 fotos, 10 fichas corregidas por ti y la lista de repetidos. Si no hay, escribes: no hay repetidos.",
];

const DAY38_TASKS = [
  "Elige 10 piezas.",
  "Saca una foto de cada una.",
  "Guarda las fotos en la carpeta fotos.",
  "Pide la ficha: color, forma y tacos.",
  "Corrige lo que esté mal.",
  "Marca los repetidos. Misma forma y mismo color.",
  "Escribe los 10 nombres de archivo.",
  "Elige una pieza. Escribe color y forma con tus palabras.",
  "¿La IA se equivocó en alguna? ¿Qué corregiste?",
  "¿Hay repetidos? Escribe los pares, o «no hay».",
  "¿Qué no puede inventar la IA?",
  "¿Qué es un repetido?",
];

export function aiGroupsForDay(planDay) {
  if (planDay <= AI_FROM_PLAN_DAY) {
    return [{ objective: "Diez fotos", learnings: DAY38_CARD }];
  }
  const focus = ROTATION[(planDay - (AI_FROM_PLAN_DAY + 1)) % ROTATION.length];
  return [{ objective: focus.objective, learnings: [focus.learning] }];
}

export function aiSheetSection(planDay) {
  if (planDay <= AI_FROM_PLAN_DAY) {
    return {
      objective: "Diez fotos",
      learning: DAY38_READING.join(" · "),
      activities: DAY38_TASKS,
      canDo: "Al terminar puedes mostrar 10 fotos, una por pieza, 10 fichas corregidas por ti y la lista de repetidos, o la frase «no hay repetidos».",
    };
  }
  const group = aiGroupsForDay(planDay)[0];
  const learning = group.learnings[0] ?? "";
  return {
    objective: group.objective,
    learning,
    activities: [learning],
    canDo: "Al terminar puedes decir la respuesta con tus palabras.",
  };
}
