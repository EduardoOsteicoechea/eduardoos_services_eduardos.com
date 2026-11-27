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
        "En completo ya hay fotos. Cada una es una sola pieza.",
        "Elige dos y crea tú la carpeta planos.",
        "Pide un dibujo cada vez: arriba, frente, atrás, derecha, izquierda.",
      ],
    }];
  }
  if (planDay === 40) {
    return [{
      objective: "Fotos y planos",
      learnings: [
        "Resumen: fotografié piezas sueltas y pedí sus planos.",
        "Aprendizaje clave: un plano es la pieza desde un solo lado. Planta es desde arriba. Fachada es un lado.",
        "Conclusión: nombro la planta y las cuatro fachadas, de una en una.",
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
      objective: "Plano de una pieza",
      learning:
        "Hoy le pides al agente el dibujo de una pieza de lego, un lado cada vez. · En completo ya están las fotos. Cada foto es una sola pieza, sin armar. · Elige dos. Crea tú la carpeta planos y copia tú esas dos fotos. El agente no hace eso. · Un plano es la pieza mirada desde un solo lado. · Primero la planta, desde arriba. Luego, de uno en uno, el frente, atrás, el lado derecho y el lado izquierdo. · Cuando la primera tenga esos cinco dibujos, repites el orden con la segunda. · Si un dibujo no se parece a la foto, pides otra vez ese mismo.",
      activities: [
        "Mira las fotos de completo. Cada una es una sola pieza.",
        "Elige dos fotos. Solo dos.",
        "Crea tú la carpeta planos. El agente no la crea.",
        "Copia tú esas dos fotos dentro de planos.",
        "Pide la planta: la pieza mirada desde arriba.",
        "Pide el frente. Espera el dibujo.",
        "Pide atrás. Espera el dibujo.",
        "Pide el lado derecho. Espera el dibujo.",
        "Pide el lado izquierdo. Espera el dibujo.",
        "Repite ese orden con la segunda pieza.",
        "Si un dibujo no se parece a la foto, pide otra vez ese mismo.",
      ],
      canDo: "Al terminar puedes mostrar dos carpetas, cada una con la foto y los cinco dibujos.",
    };
  }
  if (planDay === 40) {
    return {
      objective: "Fotos y planos",
      learning:
        "Resumen: fotografié piezas sueltas y pedí sus planos. · Puntos principales: cada foto es una pieza, con color, forma y tacos. Elegí dos. Pedí un dibujo cada vez. · Aprendizaje clave: un plano muestra la pieza desde un solo lado. Planta es desde arriba. Fachada es un lado. · Conclusión: nombro la planta y las cuatro fachadas, en orden.",
      activities: [
        "Di qué es un plano y nombra la planta y las cuatro fachadas.",
        "¿La foto es de una pieza sola o de un lego armado?",
        "¿Qué es un plano?",
        "¿Qué es un taco en la pieza?",
        "¿Cómo se llama la vista desde arriba?",
        "¿Qué quiere decir fachada?",
        "¿Pides los cinco dibujos juntos o uno por uno?",
        "Si un dibujo no se parece a la foto, ¿qué pides?",
      ],
      canDo: "Al terminar puedes decir qué es un plano y nombrar los cinco lados.",
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
