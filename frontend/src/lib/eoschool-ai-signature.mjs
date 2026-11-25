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

export function aiGroupsForDay(planDay) {
  if (planDay <= AI_FROM_PLAN_DAY) {
    return [
      {
        objective: "La cerca",
        learnings: ["Di qué carpetas se pueden tocar. El agente no las inventa."],
      },
    ];
  }
  const focus = ROTATION[(planDay - (AI_FROM_PLAN_DAY + 1)) % ROTATION.length];
  return [{ objective: focus.objective, learnings: [focus.learning] }];
}

export function aiSheetSection(planDay) {
  const group = aiGroupsForDay(planDay)[0];
  const learning = group.learnings[0] ?? "";
  return {
    objective: group.objective,
    learning,
    activities: [learning],
  };
}
