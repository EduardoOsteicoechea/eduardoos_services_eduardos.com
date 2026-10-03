/**
 * Ciencias · ciclo 3 · semana 1 · nivel 6 — «Los cuatro tejidos del cuerpo».
 * Hito de Venezuela: Relámpago del Catatumbo (solo datos seguros: tormentas con
 * relámpagos que se ven de noche en una zona muy conocida del Lago de Maracaibo;
 * imágenes: señales de luz, mensajes rápidos, noche).
 * Formato Ask First v2: q (pregunta), h (Punto), a (respuesta).
 */
export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "cie-c3-w1-d1",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ya sabes que tu cuerpo salta, siente",
          "y se protege. Hoy lo miramos como",
          "en una noche del Relámpago del Catatumbo.",
        ],
      },
      {
        q: [
          "Estás de noche junto al lago del Catatumbo.",
          "¿De qué crees que está hecho tu cuerpo?",
        ],
        h: "Punto 2: Un tejido es un equipo",
        a: [
          "Tu cuerpo está hecho de células.",
          "Son partes muy pequeñas.",
          "Un tejido es un grupo de células",
          "parecidas que trabajan juntas.",
        ],
      },
      {
        q: [
          "Sopla el viento sobre el lago. ¿Qué te cubre?",
          "¿Y qué te mantiene derecho en el bote?",
        ],
        h: "Punto 3: Epitelial y conectivo",
        a: [
          "El tejido epitelial cubre y protege.",
          "La piel es epitelial.",
          "El conectivo une, sostiene o transporta:",
          "hueso, cartílago y sangre.",
        ],
      },
      {
        q: [
          "Remas hacia los relámpagos. ¿Quién mueve",
          "tus brazos? ¿Y quién hace latir tu corazón?",
        ],
        h: "Punto 4: El tejido muscular",
        a: [
          "El tejido muscular mueve el cuerpo",
          "al contraerse, es decir, al acortarse.",
          "Remar lo decides tú.",
          "El corazón late sin que lo ordenes.",
        ],
      },
      {
        q: [
          "Brilla un relámpago y cierras los ojos.",
          "¿Quién avisó a tu cuerpo tan rápido?",
        ],
        h: "Punto 5: El tejido nervioso",
        a: [
          "El tejido nervioso lleva mensajes rápidos.",
          "Sus caminos: cerebro, médula y nervios.",
          "Es como una señal de luz de noche.",
        ],
      },
      {
        q: [
          "En esa noche del Catatumbo, tus cuatro",
          "tejidos trabajan. ¿Recuerdas sus nombres?",
        ],
        h: "Punto 6: Los cuatro tejidos",
        a: [
          "Cuatro tejidos: epitelial (cubre),",
          "conectivo (une), muscular (mueve),",
          "nervioso (mensaje).",
          "Dilos en voz alta, uno por uno.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es un tejido?", o: ["Un grupo de células parecidas", "Un trozo de tela", "Un hueso largo", "Un relámpago"] },
        { q: "¿Qué tejido cubre y protege?", o: ["Epitelial", "Conectivo", "Muscular", "Nervioso"] },
        { q: "¿Cuál es tejido conectivo?", o: ["La sangre", "La piel", "El nervio", "El corazón"] },
        { q: "¿Qué hace un músculo al contraerse?", o: ["Se acorta", "Se hace tela", "Cubre la piel", "Envía mensajes"] },
        { q: "¿Cuál movimiento decides tú?", o: ["Remar", "Latir del corazón", "Cubrir la piel", "Transportar sangre"] },
        { q: "¿Qué tejido lleva mensajes rápidos?", o: ["Nervioso", "Epitelial", "Conectivo", "Muscular"] },
        { q: "¿Cuáles son caminos del nervioso?", o: ["Cerebro, médula y nervios", "Piel y uñas", "Hueso y cartílago", "Sangre y aire"] },
        { q: "¿Cuántos tejidos son en total?", o: ["Cuatro", "Dos", "Seis", "Nueve"] },
      ],
      write: [
        "Escribe qué hace cada uno de los cuatro tejidos.",
        "Cuenta con tus palabras qué es un tejido.",
      ],
      schematic: [
        "Dibuja un esquema de los cuatro tejidos.",
        "Dibuja el camino del aviso: relámpago, ojo, nervio.",
      ],
    },
    image: [
      "Dibuja un niño en un bote de noche.",
      "Rotula piel, hueso, músculo y nervio.",
      "Escribe el tejido de cada rótulo.",
      "Dibuja un relámpago del Catatumbo al fondo.",
    ],
    summary: "Un tejido es un equipo de células. Los cuatro tejidos cubren, unen, mueven y llevan mensajes.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "cie-c3-w1-d2",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer viste que un tejido es un equipo",
          "de células y que hay cuatro tejidos.",
          "Hoy sigues de noche en el Catatumbo.",
        ],
      },
      {
        q: [
          "Viajas en bote hacia los relámpagos del",
          "Catatumbo y salpica el agua. ¿Qué te cubre?",
        ],
        h: "Punto 2: La piel cubre",
        a: [
          "La piel es tejido epitelial.",
          "Cubre y protege tu cuerpo.",
          "Es como un abrigo que te cuida",
          "del viento y del agua.",
        ],
      },
      {
        q: [
          "El bote se mece, pero tú sigues de pie.",
          "¿Qué te sostiene por dentro?",
        ],
        h: "Punto 3: El hueso sostiene",
        a: [
          "El hueso es tejido conectivo.",
          "Sostiene el cuerpo y te deja estar de pie.",
          "El conectivo une, sostiene o transporta.",
        ],
      },
      {
        q: [
          "Toca la punta de tu nariz y tus orejas.",
          "¿Son duras como un hueso o se doblan?",
        ],
        h: "Punto 4: El cartílago es flexible",
        a: [
          "Se doblan un poco: eso es cartílago.",
          "Es firme, pero más flexible que el hueso.",
          "También es tejido conectivo.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: la sangre corre",
          "cuando remas. ¿Es epitelial o conectivo?",
        ],
        h: "Punto 5: La sangre transporta",
        a: [
          "La sangre es tejido conectivo.",
          "Transporta materiales por todo el cuerpo.",
          "No cubre como la piel.",
          "El hueso sostiene y la sangre transporta.",
        ],
      },
      {
        q: [
          "Anotas lo que viste en el Catatumbo en dos",
          "columnas. ¿Dónde van piel, hueso y sangre?",
        ],
        h: "Punto 6: Ordenar en una tabla",
        a: [
          "En la columna epitelial va la piel.",
          "En la conectiva van hueso, cartílago",
          "y sangre.",
          "A cada ejemplo le pones su función.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué tejido es la piel?", o: ["Epitelial", "Conectivo", "Muscular", "Nervioso"] },
        { q: "¿Qué hace el tejido epitelial?", o: ["Cubre y protege", "Transporta", "Lleva mensajes", "Mueve el brazo"] },
        { q: "¿Qué hace el hueso?", o: ["Sostiene el cuerpo", "Cubre la piel", "Lleva mensajes", "Hace latir el corazón"] },
        { q: "¿Cómo es el cartílago?", o: ["Firme y flexible", "Líquido y rojo", "Duro sin doblarse", "Fino y transparente"] },
        { q: "¿Dónde hay cartílago?", o: ["En la nariz y las orejas", "En las uñas", "En el cerebro", "En la sangre"] },
        { q: "¿Qué tejido es la sangre?", o: ["Conectivo", "Epitelial", "Muscular", "Nervioso"] },
        { q: "¿Qué hace la sangre?", o: ["Transporta materiales", "Sostiene el cuerpo", "Cubre por fuera", "Mueve el brazo"] },
        { q: "¿Dónde va el hueso en la tabla?", o: ["En el conectivo", "En el epitelial", "En el muscular", "En el nervioso"] },
      ],
      write: [
        "Escribe tres ejemplos y la función de cada uno.",
        "Explica por qué la sangre no es epitelial.",
      ],
      schematic: [
        "Dibuja la tabla de epitelial y conectivo.",
        "Dibuja una oreja y rotula el cartílago.",
      ],
    },
    image: [
      "Dibuja una mano con piel, huesos y sangre.",
      "Rotula la piel como epitelial.",
      "Rotula hueso y sangre como conectivo.",
      "Dibuja un relámpago del Catatumbo detrás.",
    ],
    summary: "El epitelial cubre; el conectivo une: el hueso sostiene, el cartílago es flexible y la sangre transporta.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "cie-c3-w1-d3",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer ordenaste ejemplos: la piel cubre,",
          "el hueso sostiene y la sangre transporta.",
          "Hoy remas hacia el Catatumbo.",
        ],
      },
      {
        q: [
          "Remas hacia el Relámpago del Catatumbo.",
          "¿Qué cambia en el músculo de tu brazo?",
        ],
        h: "Punto 2: El músculo se contrae",
        a: [
          "El músculo se acorta y cambia de forma.",
          "A eso se le llama contraerse.",
          "Al acortarse, tira del hueso.",
          "Así se mueve tu brazo.",
        ],
      },
      {
        q: [
          "Giras el remo a la izquierda porque quieres.",
          "¿Quién decidió ese movimiento?",
        ],
        h: "Punto 3: Músculos que tú ordenas",
        a: [
          "Lo decides tú: es un movimiento voluntario.",
          "Tu cerebro decide y el músculo obedece.",
          "Así caminas, saltas y escribes.",
        ],
      },
      {
        q: [
          "Mientras miras los relámpagos, pon la mano",
          "en el pecho. ¿Lo ordenas tú?",
        ],
        h: "Punto 4: Músculos que trabajan solos",
        a: [
          "No: el corazón late sin que lo ordenes.",
          "Su músculo trabaja día y noche,",
          "también cuando duermes.",
          "El del estómago también trabaja solo.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿se mueven los huesos",
          "del brazo solos, sin ayuda de un músculo?",
        ],
        h: "Punto 5: El hueso necesita al músculo",
        a: [
          "No: sin músculo, el hueso no se mueve.",
          "El músculo tira del hueso",
          "y el hueso se mueve.",
          "Hueso y músculo trabajan en equipo.",
        ],
      },
      {
        q: [
          "En la noche del Catatumbo haces tres cosas:",
          "remar, respirar y mirar. ¿Cuáles decides tú?",
        ],
        h: "Punto 6: Voluntarios o automáticos",
        a: [
          "Remar y mirar los controlas tú.",
          "Los latidos del corazón pasan solos.",
          "Los voluntarios los decides a propósito.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué tejido permite el movimiento?", o: ["Muscular", "Epitelial", "Conectivo", "Nervioso"] },
        { q: "¿Qué hace un músculo al contraerse?", o: ["Se acorta y tira del hueso", "Se hace de tela", "Cubre el hueso", "Se vuelve cartílago"] },
        { q: "¿Cuál movimiento es voluntario?", o: ["Remar", "Latir del corazón", "Mover el estómago", "Correr de la sangre"] },
        { q: "¿Cómo se llama acortarse un músculo?", o: ["Contraerse", "Cubrir", "Transportar", "Crecer"] },
        { q: "¿Se mueve un hueso sin músculo?", o: ["No, necesita al músculo", "Sí, siempre solo", "Sí, con la piel", "Solo al dormir"] },
        { q: "¿Qué hace el músculo con el hueso?", o: ["Tira de él", "Lo cubre", "Lo vuelve cartílago", "Lo envía como mensaje"] },
        { q: "¿Quién decide un movimiento voluntario?", o: ["Tu cerebro", "Tu piel", "Tu sangre", "Tu cartílago"] },
        { q: "¿Qué músculo trabaja mientras duermes?", o: ["El del corazón", "El que gira el remo", "El que salta", "Ninguno"] },
      ],
      write: [
        "Escribe tres movimientos y marca los voluntarios.",
        "Explica por qué el hueso necesita al músculo.",
      ],
      schematic: [
        "Dibuja un brazo estirado y uno doblado.",
        "Dibuja dos columnas: voluntarios y solos.",
      ],
    },
    image: [
      "Dibuja un niño que rema de noche.",
      "Rotula el músculo que tira del hueso.",
      "Pon una estrella en el movimiento voluntario.",
      "Dibuja un corazón y escribe que late solo.",
    ],
    summary: "El músculo se acorta y tira del hueso. Algunos movimientos los decides tú y otros pasan solos.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "cie-c3-w1-d4",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer viste que el músculo se acorta",
          "y tira del hueso. Hoy sigues la señal",
          "que le avisa: es el tejido nervioso.",
        ],
      },
      {
        q: [
          "De noche, un relámpago del Catatumbo brilla",
          "de pronto. ¿Cómo se entera tu cerebro?",
        ],
        h: "Punto 2: El nervioso lleva mensajes",
        a: [
          "El tejido nervioso lleva mensajes rápidos.",
          "Sus caminos son el cerebro,",
          "la médula y los nervios.",
          "Es como una señal de luz en la noche.",
        ],
      },
      {
        q: [
          "El relámpago te asusta y apartas la mano",
          "del borde del bote. ¿Qué pasó primero?",
        ],
        h: "Punto 3: Estímulo, mensaje, respuesta",
        a: [
          "Primero sientes algo: eso es el estímulo.",
          "Luego el mensaje viaja por el nervio.",
          "Y el músculo responde: apartas la mano.",
        ],
      },
      {
        q: [
          "Imagina tres cajas como tres destellos.",
          "¿Cuál va primero, cuál en medio y cuál al final?",
        ],
        h: "Punto 4: El camino en tres cajas",
        a: [
          "Primera caja: el estímulo.",
          "Segunda caja: el mensaje por el nervio.",
          "Tercera caja: la respuesta del músculo.",
          "Siempre va en ese orden.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿el nervioso es solo",
          "el cerebro, o también es un tejido?",
        ],
        h: "Punto 5: El nervioso es un tejido",
        a: [
          "Es un tejido, como los otros tres.",
          "Está hecho de células que trabajan juntas.",
          "No solo piensa: lleva mensajes por el cuerpo.",
        ],
      },
      {
        q: [
          "Antes de que acabe la noche en el Catatumbo,",
          "¿dices los cuatro tejidos con una frase?",
        ],
        h: "Punto 6: Repasamos los cuatro",
        a: [
          "El epitelial cubre y el conectivo une.",
          "El muscular mueve.",
          "El nervioso lleva el mensaje.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué tejido lleva mensajes rápidos?", o: ["Nervioso", "Epitelial", "Conectivo", "Muscular"] },
        { q: "¿Cuáles son caminos del nervioso?", o: ["Cerebro, médula y nervios", "Piel y uñas", "Hueso y cartílago", "Sangre y aire"] },
        { q: "¿Qué es un estímulo?", o: ["Algo que sientes", "Apartar la mano", "Doblar el brazo", "Cubrir la piel"] },
        { q: "¿Qué hace el músculo al responder?", o: ["Aparta la mano", "Siente el susto", "Envía el mensaje", "Cubre la mano"] },
        { q: "¿Qué viaja por el nervio?", o: ["El mensaje", "La piel", "El hueso", "El cartílago"] },
        { q: "¿Cuál es el orden correcto?", o: ["Estímulo, mensaje, respuesta", "Respuesta, mensaje, estímulo", "Mensaje, respuesta, estímulo", "Estímulo, respuesta, mensaje"] },
        { q: "¿El nervioso es solo el cerebro?", o: ["No, también médula y nervios", "Sí, solo el cerebro", "No es un tejido", "Sí, solo los nervios"] },
        { q: "¿Qué tejido mueve el cuerpo?", o: ["Muscular", "Epitelial", "Conectivo", "Nervioso"] },
      ],
      write: [
        "Escribe el camino del susto en tres pasos.",
        "Nombra los cuatro tejidos y su trabajo.",
      ],
      schematic: [
        "Dibuja tres cajas: estímulo, mensaje, respuesta.",
        "Dibuja un esquema de los cuatro tejidos.",
      ],
    },
    image: [
      "Dibuja un niño en el bote y un relámpago.",
      "Dibuja una flecha del ojo por el nervio.",
      "Dibuja otra flecha hasta el músculo.",
      "Rotula estímulo, mensaje y respuesta.",
    ],
    summary: "El tejido nervioso lleva mensajes: sientes, el nervio avisa y el músculo responde.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "cie-c3-w1-d5",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer seguiste el camino del aviso:",
          "estímulo, mensaje y respuesta.",
          "Hoy juntas todo lo de la semana.",
        ],
      },
      {
        q: [
          "Sin mirar nada, ¿cuáles son los cuatro",
          "tejidos y qué hace cada uno?",
        ],
        h: "Punto 2: Los cuatro tejidos",
        a: [
          "Cuatro tejidos: epitelial (cubre),",
          "conectivo (une), muscular (mueve),",
          "nervioso (mensaje).",
          "Si olvidaste uno, dilo otra vez.",
        ],
      },
      {
        q: [
          "En una noche del Relámpago del Catatumbo,",
          "¿qué tejidos trabajan cuando remas?",
        ],
        h: "Punto 3: Los tejidos colaboran",
        a: [
          "El nervio manda el mensaje.",
          "El músculo se contrae y tira del hueso.",
          "La piel cubre y la sangre transporta.",
          "Ninguno trabaja solo.",
        ],
      },
      {
        q: [
          "Elige un tejido. ¿Qué pasaría si fallara",
          "mientras miras los relámpagos?",
        ],
        h: "Punto 4: Cada tejido hace falta",
        a: [
          "Sin nervioso, el músculo no sabría",
          "cuándo moverse.",
          "Sin muscular, no podrías remar.",
          "Sin epitelial, nada te cubriría.",
        ],
      },
      {
        q: [
          "Vas a contárselo a tu familia. ¿Cómo",
          "empezarías para que te entiendan?",
        ],
        h: "Punto 5: Cómo contarlo con orden",
        a: [
          "Una exposición tiene inicio, medio y cierre.",
          "Inicio: «Hoy les cuento de qué estamos hechos».",
          "Medio: un ejemplo de cada tejido.",
          "Cierre: repite los cuatro y di «gracias».",
        ],
      },
      {
        q: [
          "Para explicarlo mejor, ¿qué podrías comparar",
          "con los cuatro tejidos? ¿Una casa, quizás?",
        ],
        h: "Punto 6: Una analogía ayuda",
        a: [
          "En una casa, el epitelial es el techo.",
          "El conectivo son las vigas que sostienen.",
          "El muscular son las puertas que se mueven.",
          "El nervioso son los cables del mensaje.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuántos tejidos estudiaste?", o: ["Cuatro", "Dos", "Seis", "Nueve"] },
        { q: "¿Qué tejido cubre y protege?", o: ["Epitelial", "Conectivo", "Muscular", "Nervioso"] },
        { q: "¿Qué tejido une, sostiene o transporta?", o: ["Conectivo", "Epitelial", "Muscular", "Nervioso"] },
        { q: "¿Qué pasaría sin tejido nervioso?", o: ["El músculo no sabría cuándo moverse", "El hueso sería tela", "La piel dejaría de cubrir", "La sangre sería epitelial"] },
        { q: "¿Qué tejidos colaboran al remar?", o: ["Nervio, músculo, hueso y piel", "Solo el hueso", "Solo la piel", "Solo el cartílago"] },
        { q: "¿Cómo se ordena una exposición?", o: ["Inicio, medio y cierre", "Solo un cierre", "Solo ejemplos", "Sin ningún orden"] },
        { q: "En la casa, ¿qué son los cables?", o: ["El tejido nervioso", "El epitelial", "El conectivo", "El muscular"] },
        { q: "En la frase, ¿qué hace el muscular?", o: ["Mueve", "Cubre", "Une", "Lleva el mensaje"] },
      ],
      write: [
        "Escribe de memoria los cuatro tejidos.",
        "Cuenta cómo colaboran al remar de noche.",
      ],
      schematic: [
        "Dibuja un esquema de los cuatro tejidos.",
        "Dibuja una casa y rotula cada tejido.",
      ],
    },
    image: [
      "Dibuja un niño que rema de noche.",
      "Rotula piel, hueso, músculo y nervio.",
      "Escribe qué tejido es cada rótulo.",
      "Dibuja el relámpago del Catatumbo al fondo.",
    ],
    summary: "Los cuatro tejidos cubren, unen, mueven y llevan mensajes, y colaboran en cada movimiento.",
  },
];
