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
  "10 fotos en la carpeta fotos.",
  "La app las carga y arma el inventario.",
  "Tú confirmas color, forma, tacos y repetidos.",
];

const DAY38_READING = [
  "Fotografías 10 piezas y las guardas en la carpeta fotos.",
  "La app carga esas fotos y muestra el inventario.",
  "Cada foto tiene una ficha: color, forma y tacos. Tú la corriges y la confirmas.",
  "Un repetido es la misma forma y el mismo color. La app los marca. Tú dices si tiene razón.",
];

const DAY38_TASKS = [
  "Elige 10 piezas y saca una foto de cada una.",
  "Guarda las fotos en la carpeta fotos.",
  "Abre la app del inventario. Ella carga las fotos de esa carpeta.",
  "Pide la ficha de cada foto: color, forma y tacos.",
  "Corrige y confirma en la app.",
  "Revisa los repetidos que muestra la app.",
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
      canDo: "Al terminar puedes mostrar 10 fotos en la carpeta, 10 fichas confirmadas en la app y los repetidos a la vista.",
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
