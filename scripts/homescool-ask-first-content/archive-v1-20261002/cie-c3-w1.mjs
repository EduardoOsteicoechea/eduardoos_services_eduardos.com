/**
 * Ciencias · ciclo 3 · semana 1 · nivel 6 — «Los cuatro tejidos del cuerpo».
 * Narrativa inductiva "pregunta primero": pregunta -> espacio -> respuesta -> copiar.
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "cie-c3-w1-d1",
    opening: "¿Crees que tu piel y tu músculo están hechos de lo mismo?",
    repaso: null,
    units: [
      {
        h: "Punto 1: Un tejido es un equipo de células",
        a: [
          "Tu cuerpo está hecho de células muy pequeñas.",
          "Un tejido es un grupo de células parecidas.",
          "Esas células trabajan juntas, como un equipo.",
          "En ciencias, «tejido» no es tela: es un equipo de células.",
          "Hay cuatro tejidos: epitelial, conectivo, muscular y nervioso.",
        ],
      },
      {
        q: [
          "Piensa en tu piel y en tu hueso. Uno cubre el cuerpo",
          "y el otro lo sostiene. ¿Cómo crees que se llaman esos equipos?",
        ],
        h: "Punto 2: Epitelial y conectivo",
        a: [
          "El tejido epitelial cubre y protege: la piel es epitelial.",
          "El tejido conectivo une, sostiene o transporta.",
          "El hueso, el cartílago y la sangre son tejido conectivo.",
          "El hueso sostiene y la sangre transporta.",
        ],
      },
      {
        q: [
          "Doblas el brazo y, a la vez, tu corazón late.",
          "¿Cuál de los dos movimientos decides tú?",
        ],
        h: "Punto 3: El tejido muscular",
        a: [
          "El tejido muscular mueve el cuerpo al contraerse.",
          "Doblar el brazo lo decides tú: es un movimiento voluntario.",
          "El corazón late sin que lo ordenes tú.",
          "Cuando el músculo se acorta, tira del hueso.",
        ],
      },
      {
        q: [
          "Tocas algo caliente y apartas la mano de golpe.",
          "¿Quién avisó a tu músculo que se moviera?",
        ],
        h: "Punto 4: El tejido nervioso",
        a: [
          "El tejido nervioso lleva mensajes rápidos por el cuerpo.",
          "Sus caminos son el cerebro, la médula y los nervios.",
          "Siente, decide y responde: así se mueve el músculo.",
        ],
      },
      {
        q: [
          "Ya conoces los cuatro equipos. ¿Recuerdas cómo se",
          "llaman y qué hace cada uno?",
        ],
        h: "Punto 5: Los cuatro tejidos",
        a: [
          "Cuatro tejidos: epitelial (cubre), conectivo (une),",
          "muscular (mueve), nervioso (mensaje).",
          "Dilos en voz alta, uno por uno.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es un tejido?", o: ["Un grupo de células parecidas", "Un trozo de tela", "Un hueso largo", "Un mensaje nervioso"] },
        { q: "¿Qué tejido cubre y protege el cuerpo?", o: ["Epitelial", "Conectivo", "Muscular", "Nervioso"] },
        { q: "¿Cuál de estos es tejido conectivo?", o: ["La sangre", "La piel", "El nervio", "El músculo del brazo"] },
        { q: "¿Cuál es un movimiento voluntario?", o: ["Doblar el brazo", "Latir del corazón", "Cubrir la piel", "Transportar sangre"] },
        { q: "¿Qué hace el músculo cuando se acorta?", o: ["Tira del hueso", "Cubre la piel", "Transporta sangre", "Envía mensajes"] },
        { q: "¿Qué tejido lleva mensajes rápidos?", o: ["Nervioso", "Epitelial", "Conectivo", "Muscular"] },
        { q: "¿Qué forma los caminos del tejido nervioso?", o: ["Cerebro, médula y nervios", "Piel y uñas", "Hueso y cartílago", "Sangre y aire"] },
        { q: "¿Qué tejido sostiene y transporta?", o: ["Conectivo", "Epitelial", "Muscular", "Nervioso"] },
      ],
      write: [
        "Escribe qué hace cada uno de los cuatro tejidos.",
        "Explica con tus palabras qué es un tejido.",
      ],
      schematic: [
        "Dibuja un esquema con los cuatro tejidos y su trabajo.",
        "Dibuja el camino: mensaje, nervio, músculo y movimiento.",
      ],
    },
    image: [
      "Dibuja a un niño que corre y se rasca el brazo.",
      "Rotula la piel, un hueso, un músculo y un nervio.",
      "Debajo de cada rótulo escribe el nombre de su tejido.",
      "Añade una flecha que muestre el mensaje del nervio.",
    ],
    summary: "Un tejido es un equipo de células. Los cuatro tejidos cubren, unen, mueven y llevan mensajes.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "cie-c3-w1-d2",
    opening: ayer,
    repaso: [
      "Ayer vimos que un tejido es un equipo de células parecidas.",
      "Conocimos cuatro: epitelial, conectivo, muscular y nervioso.",
      "El epitelial cubre y el conectivo une, sostiene o transporta.",
    ],
    units: [
      {
        q: [
          "¿Qué parte de tu cuerpo te protege por fuera,",
          "como un abrigo?",
        ],
        h: "Punto 1: El epitelial es una cubierta",
        a: [
          "La piel es tejido epitelial: cubre y protege tu cuerpo.",
          "Es como un abrigo que te cuida del mundo de afuera.",
          "Cubrir y proteger es el trabajo del epitelial.",
        ],
      },
      {
        q: [
          "Piensa en un hueso de tu brazo.",
          "¿Qué trabajo hace por tu cuerpo?",
        ],
        h: "Punto 2: El hueso sostiene",
        a: [
          "El hueso es tejido conectivo: sostiene el cuerpo.",
          "Gracias a tus huesos puedes estar de pie.",
          "El conectivo une, sostiene o transporta.",
        ],
      },
      {
        q: [
          "Toca la punta de tu nariz y tus orejas. ¿Son duras",
          "como un hueso o se doblan un poco?",
        ],
        h: "Punto 3: El cartílago es firme y flexible",
        a: [
          "Se doblan un poco: eso es cartílago.",
          "El cartílago es firme, pero más flexible que el hueso.",
          "Es tejido conectivo, igual que el hueso.",
          "Lo encuentras en la nariz y en las orejas.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: la sangre corre por tu cuerpo.",
          "¿La pondrías con el epitelial o con el conectivo?",
        ],
        h: "Punto 4: La sangre transporta",
        a: [
          "La sangre es tejido conectivo de transporte.",
          "Lleva materiales por todo el cuerpo.",
          "No cubre como la piel; por eso no es epitelial.",
          "Recuerda: el hueso sostiene y la sangre transporta.",
        ],
      },
      {
        q: [
          "Haz una tabla con dos columnas: epitelial y conectivo.",
          "¿Dónde pondrías piel, hueso, cartílago y sangre?",
        ],
        h: "Punto 5: Ordenar en una tabla",
        a: [
          "En la columna del epitelial va la piel.",
          "En la del conectivo van hueso, cartílago y sangre.",
          "A cada ejemplo le pones su función: cubre, sostiene o transporta.",
          "Así clasificas como un científico escolar.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué tejido es la piel?", o: ["Epitelial", "Conectivo", "Muscular", "Nervioso"] },
        { q: "¿Qué función tiene el tejido epitelial?", o: ["Cubrir y proteger", "Transportar materiales", "Llevar mensajes", "Mover el brazo"] },
        { q: "¿Qué hace el hueso?", o: ["Sostiene el cuerpo", "Cubre la piel", "Lleva mensajes", "Hace latir el corazón"] },
        { q: "¿Cómo es el cartílago?", o: ["Firme y flexible", "Líquido y rojo", "Duro y sin doblarse", "Fino y transparente"] },
        { q: "¿Dónde hay cartílago?", o: ["En la nariz y las orejas", "En las uñas", "En el cerebro", "En la sangre"] },
        { q: "¿Qué tejido es la sangre?", o: ["Conectivo", "Epitelial", "Muscular", "Nervioso"] },
        { q: "¿Qué hace la sangre en el cuerpo?", o: ["Transporta materiales", "Sostiene el cuerpo", "Cubre por fuera", "Mueve el brazo"] },
        { q: "¿En qué columna de la tabla va el hueso?", o: ["Conectivo", "Epitelial", "Muscular", "Nervioso"] },
      ],
      write: [
        "Escribe cinco ejemplos y la función de cada uno.",
        "Explica por qué la sangre no es epitelial.",
      ],
      schematic: [
        "Dibuja la tabla de epitelial y conectivo con ejemplos.",
        "Dibuja una nariz y una oreja y rotula el cartílago.",
      ],
    },
    image: [
      "Dibuja una mano con piel, huesos y una gota de sangre.",
      "Rotula la piel como epitelial.",
      "Rotula el hueso y la sangre como conectivo.",
      "Añade una flecha que diga qué función hace cada uno.",
    ],
    summary: "El epitelial cubre; el conectivo une: el hueso sostiene, el cartílago es flexible y la sangre transporta.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "cie-c3-w1-d3",
    opening: ayer,
    repaso: [
      "Ayer clasificamos ejemplos de epitelial y conectivo.",
      "La piel cubre, el hueso sostiene y la sangre transporta.",
      "El cartílago es firme y flexible.",
    ],
    units: [
      {
        q: [
          "Mira tu brazo quieto y luego doblado. ¿Qué cambia",
          "en el músculo cuando lo doblas?",
        ],
        h: "Punto 1: El músculo se contrae",
        a: [
          "El músculo se acorta y cambia de forma.",
          "A eso se le llama contraerse.",
          "Al acortarse, el músculo tira del hueso.",
          "Así se mueve tu brazo.",
        ],
      },
      {
        q: [
          "Salta con los dos pies.",
          "¿Tú decidiste ese movimiento?",
        ],
        h: "Punto 2: Músculos que tú ordenas",
        a: [
          "Saltar lo decides tú: es un movimiento voluntario.",
          "Con músculos voluntarios caminas, saltas y escribes.",
          "Tu cerebro decide y el músculo obedece.",
        ],
      },
      {
        q: [
          "Ponte la mano en el pecho. ¿Late tu corazón",
          "porque tú se lo ordenas?",
        ],
        h: "Punto 3: Músculos que trabajan solos",
        a: [
          "No: el corazón late sin que lo ordenes tú.",
          "Su músculo trabaja día y noche, también cuando duermes.",
          "El del estómago también trabaja sin que lo pienses.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿se mueven los huesos solos,",
          "sin ayuda de ningún músculo?",
        ],
        h: "Punto 4: El hueso necesita al músculo",
        a: [
          "No: sin músculo, el hueso no se mueve.",
          "El músculo tira del hueso y el hueso se mueve.",
          "Hueso y músculo trabajan en equipo.",
        ],
      },
      {
        q: [
          "Haz una lista de tres movimientos tuyos. ¿Cuáles",
          "controlas a propósito y cuáles no?",
        ],
        h: "Punto 5: Voluntarios o automáticos",
        a: [
          "Caminar y escribir los controlas a propósito.",
          "Los latidos del corazón pasan solos.",
          "Marca con una estrella los que tú decides.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué tejido permite el movimiento?", o: ["Muscular", "Epitelial", "Conectivo", "Nervioso"] },
        { q: "¿Qué hace un músculo al contraerse?", o: ["Se acorta y tira del hueso", "Se hace de tela", "Cubre el hueso como piel", "Se convierte en cartílago"] },
        { q: "¿Cuál es un movimiento voluntario?", o: ["Saltar con los dos pies", "Latir del corazón", "Mover el estómago", "Correr de la sangre"] },
        { q: "¿Cómo se llama que un músculo se acorte?", o: ["Contraerse", "Cubrir", "Transportar", "Crecer"] },
        { q: "¿Se mueven los huesos solos, sin músculo?", o: ["No, necesitan al músculo", "Sí, siempre solos", "Sí, con ayuda de la piel", "Solo cuando duermes"] },
        { q: "¿Qué hace el músculo con el hueso?", o: ["Tira de él", "Lo cubre como piel", "Lo vuelve cartílago", "Lo envía como mensaje"] },
        { q: "¿Quién decide un movimiento voluntario?", o: ["Tu cerebro", "Tu piel", "Tu sangre", "Tu cartílago"] },
        { q: "¿Qué músculo trabaja mientras duermes?", o: ["El del corazón", "El del brazo que escribe", "El de la pierna que salta", "Ninguno trabaja"] },
      ],
      write: [
        "Escribe tres movimientos y marca los voluntarios.",
        "Explica por qué el hueso necesita al músculo.",
      ],
      schematic: [
        "Dibuja un brazo quieto y uno doblado con su músculo.",
        "Dibuja dos columnas: voluntarios y los que pasan solos.",
      ],
    },
    image: [
      "Dibuja a un niño saltando con el brazo doblado.",
      "Rotula el músculo que tira del hueso.",
      "Pon una estrella en un movimiento voluntario.",
      "Dibuja un corazón y escribe que late solo.",
    ],
    summary: "El músculo se acorta y tira del hueso. Algunos movimientos los decides tú y otros pasan solos.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "cie-c3-w1-d4",
    opening: ayer,
    repaso: [
      "Ayer comparamos movimientos que decides y que pasan solos.",
      "El músculo se acorta y tira del hueso.",
      "Hueso y músculo trabajan en equipo.",
    ],
    units: [
      {
        q: [
          "Imagina que tocas una olla caliente. ¿Cómo se entera",
          "tu mano de que algo quema?",
        ],
        h: "Punto 1: El nervioso lleva mensajes",
        a: [
          "El tejido nervioso lleva mensajes por todo el cuerpo.",
          "Sus mensajes son eléctricos y químicos, y muy veloces.",
          "Sus caminos son el cerebro, la médula y los nervios.",
        ],
      },
      {
        q: [
          "Sigamos. Con ese mensaje en camino,",
          "¿qué hace tu mano? ¿Quién la mueve?",
        ],
        h: "Punto 2: Sensor, mensaje y respuesta",
        a: [
          "Primero tu piel siente el calor y avisa.",
          "Luego el mensaje viaja por el nervio.",
          "Y el músculo responde: apartas la mano.",
        ],
      },
      {
        q: [
          "Dibuja en tu mente tres cajas. ¿Cuál va primero,",
          "cuál en medio y cuál al final?",
        ],
        h: "Punto 3: El camino en tres cajas",
        a: [
          "Primera caja: el estímulo, algo que sientes.",
          "Segunda caja: el mensaje viaja por el nervio.",
          "Tercera caja: el músculo hace la respuesta.",
          "Siempre va en ese orden.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿el nervioso es solo el cerebro,",
          "o también es un tejido del cuerpo?",
        ],
        h: "Punto 4: El nervioso es un tejido",
        a: [
          "Es un tejido, igual que los otros tres.",
          "Está hecho de células que trabajan juntas.",
          "No solo piensa: también lleva mensajes por el cuerpo.",
        ],
      },
      {
        q: [
          "Antes de terminar, ¿puedes decir los cuatro tejidos",
          "con una frase corta para cada uno?",
        ],
        h: "Punto 5: Repasamos los cuatro",
        a: [
          "El epitelial cubre y el conectivo une.",
          "El muscular mueve y el nervioso lleva el mensaje.",
          "Con ellos clasificas lo que observas con evidencia.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué tejido lleva mensajes a gran velocidad?", o: ["Nervioso", "Epitelial", "Conectivo", "Muscular"] },
        { q: "¿Qué forma los caminos del tejido nervioso?", o: ["Cerebro, médula y nervios", "Piel y uñas", "Hueso y cartílago", "Sangre y aire"] },
        { q: "Si tocas algo caliente, ¿qué es el estímulo?", o: ["Sentir algo caliente", "Apartar la mano", "Doblar el brazo", "Cubrir la piel"] },
        { q: "¿Qué hace el músculo en la respuesta?", o: ["Aparta la mano", "Siente el calor", "Envía el mensaje", "Cubre la mano"] },
        { q: "¿Qué viaja por el nervio?", o: ["El mensaje", "La piel", "El hueso", "El cartílago"] },
        { q: "¿Cuál es el orden correcto?", o: ["Estímulo, mensaje, respuesta", "Respuesta, mensaje, estímulo", "Mensaje, respuesta, estímulo", "Estímulo, respuesta, mensaje"] },
        { q: "¿El tejido nervioso es solo el cerebro?", o: ["No, también médula y nervios", "Sí, solo el cerebro", "No es un tejido", "Sí, solo los nervios"] },
        { q: "¿Qué tejido mueve el cuerpo?", o: ["Muscular", "Epitelial", "Conectivo", "Nervioso"] },
      ],
      write: [
        "Escribe el camino de tocar algo caliente en tres pasos.",
        "Nombra los cuatro tejidos y lo que hace cada uno.",
      ],
      schematic: [
        "Dibuja tres cajas: estímulo, mensaje y respuesta.",
        "Dibuja un esquema de los cuatro tejidos con flechas.",
      ],
    },
    image: [
      "Dibuja una mano que toca una olla caliente.",
      "Dibuja una flecha desde la piel por el nervio.",
      "Dibuja otra flecha hasta el músculo del brazo.",
      "Rotula estímulo, mensaje y respuesta.",
    ],
    summary: "El tejido nervioso lleva mensajes: sientes, el nervio avisa y el músculo responde.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "cie-c3-w1-d5",
    opening: ayer,
    repaso: [
      "Esta semana aprendiste que un tejido es un equipo de células.",
      "Hay cuatro: epitelial, conectivo, muscular y nervioso.",
      "Hoy los recuerdas y se los cuentas a alguien.",
    ],
    units: [
      {
        q: [
          "Sin mirar nada, ¿cuáles son los cuatro tejidos",
          "y qué hace cada uno?",
        ],
        w: 3,
        h: "Punto 1: Los cuatro tejidos",
        a: [
          "Cuatro tejidos: epitelial (cubre), conectivo (une),",
          "muscular (mueve), nervioso (mensaje).",
          "Si olvidaste alguno, dilo otra vez en voz alta.",
        ],
      },
      {
        q: [
          "Cuando saltas, ¿qué tejidos crees que trabajan",
          "juntos en ese solo movimiento?",
        ],
        h: "Punto 2: Los tejidos colaboran",
        a: [
          "Piel, hueso, músculo y nervio colaboran en un movimiento.",
          "El nervio manda el mensaje y el músculo se contrae.",
          "El músculo tira del hueso y la piel cubre y protege.",
          "Ninguno trabaja solo.",
        ],
      },
      {
        q: [
          "Elige un tejido. ¿Qué pasaría si fallara un día entero?",
        ],
        h: "Punto 3: Cada tejido hace falta",
        a: [
          "Sin nervioso, el músculo no sabría cuándo moverse.",
          "Sin muscular, el cuerpo no podría moverse.",
          "Sin conectivo, nada sostendría ni transportaría.",
          "Sin epitelial, el cuerpo no tendría cubierta que lo proteja.",
        ],
      },
      {
        q: [
          "Vas a contárselo a alguien de tu casa.",
          "¿Cómo empezarías tu exposición?",
        ],
        h: "Punto 4: Cómo contarlo con orden",
        a: [
          "Una buena exposición tiene inicio, medio y cierre.",
          "Inicio: «Hoy les voy a contar de qué estamos hechos».",
          "Medio: un ejemplo de cada tejido.",
          "Cierre: repite los cuatro tejidos y di «gracias».",
        ],
      },
      {
        q: [
          "¿Qué analogía usarías para explicar los cuatro tejidos?",
          "Puede ser una casa, una máquina o un equipo.",
        ],
        h: "Punto 5: Una analogía ayuda",
        a: [
          "En una casa, el epitelial son el techo y las paredes.",
          "El conectivo son las vigas que sostienen.",
          "El muscular son las puertas que se mueven.",
          "El nervioso son los cables que llevan los mensajes.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuántos tejidos estudiaste esta semana?", o: ["Cuatro", "Dos", "Seis", "Nueve"] },
        { q: "¿Qué tejido cubre y protege?", o: ["Epitelial", "Conectivo", "Muscular", "Nervioso"] },
        { q: "¿Qué tejido une, sostiene o transporta?", o: ["Conectivo", "Epitelial", "Muscular", "Nervioso"] },
        { q: "¿Qué pasaría sin tejido nervioso?", o: ["El músculo no sabría cuándo moverse", "El hueso se haría tela", "La piel dejaría de cubrir", "La sangre sería epitelial"] },
        { q: "¿Qué tejidos colaboran al saltar?", o: ["Piel, hueso, músculo y nervio", "Solo el hueso", "Solo la piel", "Solo el cartílago"] },
        { q: "¿Cómo se organiza una exposición?", o: ["Inicio, medio y cierre", "Solo un cierre", "Solo ejemplos", "Sin ningún orden"] },
        { q: "En la analogía de la casa, ¿qué son los cables?", o: ["El tejido nervioso", "El epitelial", "El conectivo", "El muscular"] },
        { q: "En la frase de hoy, ¿qué hace el muscular?", o: ["Mueve", "Cubre", "Une", "Lleva el mensaje"] },
      ],
      write: [
        "Escribe de memoria los cuatro tejidos y su trabajo.",
        "Cuenta cómo colaboran los tejidos al saltar.",
      ],
      schematic: [
        "Dibuja un esquema con los cuatro tejidos y su trabajo.",
        "Dibuja una casa y rotula qué tejido es cada parte.",
      ],
    },
    image: [
      "Dibuja a un niño que salta de alegría.",
      "Rotula piel, hueso, músculo y nervio.",
      "Escribe qué tejido es cada rótulo.",
      "Añade una flecha que muestre el mensaje del nervio.",
    ],
    summary: "Los cuatro tejidos cubren, unen, mueven y llevan mensajes, y colaboran en cada movimiento.",
  },
];
