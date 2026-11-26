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
  "Dejas 10 fotos en todays_homework.",
  "El agente las pasa a assets si se ve la pieza.",
  "Tú confirmas color, forma, tacos y repetidos.",
];

const DAY38_READING = [
  "Fotografías 10 piezas y las dejas en todays_homework.",
  "El agente mira cada foto. Si se ve una sola pieza, la mueve a assets. Si no, te pide que la refines.",
  "La app carga assets y muestra el inventario.",
  "Cada foto tiene una ficha: color, forma y tacos. Tú la corriges y la confirmas.",
  "Un repetido es la misma forma y el mismo color. La app los marca. Tú dices si tiene razón.",
];

const DAY38_TASKS = [
  "Elige 10 piezas y saca una foto de cada una.",
  "Deja las fotos en todays_homework.",
  "El agente pasa a assets las que se ven bien.",
  "Abre la app del inventario. Ella carga assets.",
  "Pide la ficha de cada foto: color, forma y tacos.",
  "Corrige y confirma en la app.",
  "Revisa los repetidos que muestra la app.",
];

export function aiGroupsForDay(planDay) {
  if (planDay <= AI_FROM_PLAN_DAY) {
    return [{ objective: "Diez fotos", learnings: DAY38_CARD }];
  }
  if (planDay === 39) {
    return [{
      objective: "Planos",
      learnings: [
        "Eliges 2 fotos de imagenes/completo.",
        "Creas planos y copias tú esas fotos.",
        "Pides planta.svg y cuatro fachadas hasta que se parezcan.",
      ],
    }];
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
      canDo: "Al terminar puedes mostrar 10 fotos en assets, 10 fichas confirmadas en la app y los repetidos a la vista.",
    };
  }
  if (planDay === 39) {
    return {
      objective: "Planos de dos legos",
      learning:
        "Eliges 2 fotos de legos armados en imagenes/completo. · Creas tú la carpeta planos y copias tú las fotos. · Pides planta.svg y cuatro fachadas hasta que se parezcan a la foto.",
      activities: [
        "Elige 2 fotos de legos armados en imagenes/completo.",
        "Crea tú la carpeta planos. El agente no la crea.",
        "Copia tú esas 2 fotos dentro de planos.",
        "Pide la planta: la vista desde arriba.",
        "Pide fachada-frente, fachada-atras, fachada-izquierda y fachada-derecha.",
        "Cada lego queda en una carpeta con el nombre de su foto.",
        "Dentro van la foto, planta.svg y las cuatro fachadas.",
        "Si un plano no se parece a la foto, pide ese plano otra vez.",
      ],
      canDo: "Al terminar puedes mostrar dos carpetas, cada una con la foto, la planta y las cuatro fachadas.",
    };
  }
  if (planDay === 40) {
    return {
      objective: "Página",
      learning:
        "La página del inventario muestra un solo dato de una ficha que tú ya confirmaste. · Puede ser el color, la forma o la cantidad. · Si tú no lo dijiste, la página no lo pone.",
      activities: [
        "¿Qué pieza ya confirmaste?",
        "¿Qué dato eliges para la página: color, forma o cantidad?",
        "Escribe ese dato, tal como lo confirmaste.",
        "¿Puede la página poner un color que tú no dijiste?",
        "Escribe la línea de la página.",
      ],
      canDo: "Al terminar puedes elegir un dato confirmado y escribir la línea que muestra la página.",
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
