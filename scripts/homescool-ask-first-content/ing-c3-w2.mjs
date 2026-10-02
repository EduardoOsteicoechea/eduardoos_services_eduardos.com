/**
 * Inglés · ciclo 3 · semana 2 · nivel 6 — tiempos del verbo en español:
 * una palabra (canto, cantaba, canté, cantaré, cantaría) o dos (haber + participio).
 * Formato Ask First v2 + hito de Venezuela: Teleférico de Mérida
 * (sube por tramos, con estaciones, hacia las alturas de la sierra).
 */
export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "ing-c3-w2-d1",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Viste verbos como cantar, comer, vivir.",
          "Terminan en -ar, -er o -ir.",
          "Hoy suben al teleférico de Mérida.",
          "Sube por tramos, con estaciones.",
        ],
      },
      {
        q: [
          "Cantas en el teleférico de Mérida.",
          "¿Cómo dices «cantar» ahora y ayer?",
        ],
        h: "Punto 2: El final dice cuándo",
        a: [
          "Cada estación es un momento.",
          "Ahora dices «canto»; ayer, «canté».",
          "Mañana dirás «cantaré».",
          "La raíz «cant-» se queda igual.",
        ],
      },
      {
        q: [
          "Mira «cantaba» y «cantaría». ¿Cuándo",
          "crees que pasa cada una?",
        ],
        h: "Punto 3: Más formas de una palabra",
        a: [
          "«Cantaba» es pasado que sigue abierto.",
          "«Cantaría» es lo que harías si pudieras.",
          "Una palabra: canto / cantaba / canté /",
          "cantaré / cantaría.",
        ],
      },
      {
        q: [
          "El teleférico sube por tramos. También",
          "«he cantado» va en dos. ¿Cuáles son?",
        ],
        h: "Punto 4: Dos tramos con haber",
        a: [
          "Primer tramo: «he», la ayudante «haber».",
          "Segundo: «cantado», el participio.",
          "Dos palabras: ayudante haber + forma",
          "de lo ya hecho (he cantado).",
        ],
      },
      {
        q: [
          "Una pregunta con truco: si todos comen,",
          "¿«hemos comido» o «hemos comidos»?",
        ],
        h: "Punto 5: El participio no cambia",
        a: [
          "Se dice «hemos comido».",
          "El participio (cantado, comido, vivido)",
          "no cambia, aunque sean muchos.",
          "Solo cambia la ayudante: he, has, ha.",
        ],
      },
      {
        q: [
          "Terminaste de subir. ¿Dices «ayer subí»",
          "o «ya he subido»? ¿Qué pista ayuda?",
        ],
        h: "Punto 6: Las pistas del momento",
        a: [
          "«Ayer» cierra el momento: «subí».",
          "«Ya» deja vivo el resultado: «he subido».",
          "Escucha la pista antes de elegir",
          "una palabra o dos.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cómo dices «cantar» ahora?", o: ["canto", "canté", "cantaré", "cantaría"] },
        { q: "¿Cuál forma habla de ayer?", o: ["canté", "canto", "cantaré", "cantaría"] },
        { q: "¿Qué parte de «cantar» no cambia?", o: ["La raíz «cant-»", "El final", "Todo", "Nada"] },
        { q: "¿Cuál es el participio de «cantar»?", o: ["cantado", "cantaba", "cantaré", "canto"] },
        { q: "En «he cantado», ¿cuál es la ayudante?", o: ["he", "cantado", "cant-", "canto"] },
        { q: "¿Cuál frase está bien dicha?", o: ["Hemos comido.", "Hemos comidos.", "He comidos.", "Hemos comer."] },
        { q: "¿Qué frase deja el resultado vivo?", o: ["Ya he subido.", "Ayer subí.", "Subiré mañana.", "Subiría."] },
        { q: "¿Cuál forma es de una sola palabra?", o: ["cantaba", "he cantado", "había cantado", "habré cantado"] },
      ],
      write: [
        "Escribe tres formas de «cantar» de una palabra.",
        "Explica qué hace «he» en «he cantado».",
      ],
      schematic: [
        "Dibuja el teleférico con canté, canto y cantaré.",
        "Dibuja «he» y «cantado» como dos tramos.",
      ],
    },
    image: [
      "Dibuja el teleférico de Mérida subiendo.",
      "Pon estaciones: ayer, ahora, mañana.",
      "Escribe canté, canto y cantaré en ellas.",
      "Dibuja a alguien cantando en una.",
    ],
    summary: "El verbo dice cuándo pasa algo, con una palabra (canté) o con dos (he cantado), como estaciones del teleférico.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "ing-c3-w2-d2",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer viste que el verbo dice cuándo.",
          "Una palabra cambia solo el final.",
          "Hoy practicas las formas de una palabra,",
          "como quien sube estación por estación.",
        ],
      },
      {
        q: [
          "Estás en el teleférico y cantas.",
          "¿Cómo dices «cantar» ahora?",
        ],
        h: "Punto 2: Lo que pasa ahora",
        a: [
          "Dices «canto»: pasa ahora.",
          "Es una sola palabra y la raíz «cant-»",
          "se queda igual.",
          "En inglés: «I sing».",
        ],
      },
      {
        q: [
          "De pequeño cantabas cada vez que subías.",
          "¿Dices «cantaba» o «canté»?",
        ],
        h: "Punto 3: El pasado que sigue abierto",
        a: [
          "Dices «cantaba»: el pasado abierto.",
          "Cuenta algo que se repetía o duraba.",
          "«De pequeño cantaba al subir.»",
          "En inglés: «I used to sing».",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ayer cantaste",
          "una vez arriba. ¿«cantaba» o «canté»?",
        ],
        h: "Punto 4: El pasado que se cierra",
        a: [
          "Dices «canté»: el pasado que se cerró.",
          "«Ayer canté arriba» terminó esa vez.",
          "«Cantaba» deja abierto; «canté» cierra.",
        ],
      },
      {
        q: [
          "Mañana subirás otra vez. ¿Y si pudieras",
          "subir hoy? ¿Cómo dices «cantar»?",
        ],
        h: "Punto 5: Después y «si pudiera»",
        a: [
          "«Cantaré» es lo que pasará más tarde.",
          "«Cantaría» es lo que harías si pudieras.",
          "Inglés: «I will sing», «I would sing».",
        ],
      },
      {
        q: [
          "Ahora tú: ¿cómo dices «bailar» en cinco",
          "momentos del viaje?",
        ],
        h: "Punto 6: Los cinco momentos",
        a: [
          "Dices: bailo, bailaba, bailé,",
          "bailaré y bailaría.",
          "La raíz «bail-» se queda; el final cambia.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué forma dice lo que pasará después?", o: ["cantaré", "cantaba", "canté", "canto"] },
        { q: "¿Cuál es un pasado que sigue abierto?", o: ["cantaba", "canté", "cantaré", "canto"] },
        { q: "Completa: «Ayer ___ arriba».", o: ["canté", "cantaba", "cantaría", "canto"] },
        { q: "¿Qué forma dice «si pudieras»?", o: ["cantaría", "cantaré", "canté", "canto"] },
        { q: "¿Qué parte de «cantar» se queda igual?", o: ["La raíz cant-", "El final", "Todo", "Nada"] },
        { q: "¿Cómo dices «bailar» para más tarde?", o: ["bailaré", "bailaba", "bailé", "bailaría"] },
        { q: "En inglés, ¿qué es «I would sing»?", o: ["cantaría", "canté", "cantaré", "canto"] },
        { q: "¿Cuántas palabras tiene «cantaba»?", o: ["Una", "Dos", "Tres", "Cuatro"] },
      ],
      write: [
        "Escribe una frase con «cantaba» y otra con «canté».",
        "Explica la diferencia entre «cantaba» y «canté».",
      ],
      schematic: [
        "Dibuja estaciones con las formas de «bailar».",
        "Dibuja una línea con «cantaba» y «canté».",
      ],
    },
    image: [
      "Dibuja el teleférico con cinco paradas.",
      "Escribe una forma de «bailar» en cada una.",
      "Rotula: ahora, antes, después, si pudiera.",
      "Revisa que la raíz «bail-» sea igual.",
    ],
    summary: "Con una palabra contamos cinco momentos: canto, cantaba, canté, cantaré y cantaría.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "ing-c3-w2-d3",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer practicaste las cinco formas",
          "de una palabra con «cantar».",
          "Hoy el verbo sube en dos tramos,",
          "como el teleférico de Mérida.",
        ],
      },
      {
        q: [
          "«He cantado» sube en dos tramos.",
          "¿Cuál es el primero y cuál el segundo?",
        ],
        h: "Punto 2: Las dos piezas",
        a: [
          "El primero es «haber»: he, has, ha,",
          "hemos, han. Es la ayudante.",
          "El segundo es el participio: «cantado».",
          "En inglés se parece a «I have sung».",
        ],
      },
      {
        q: [
          "Busca el segundo tramo de «cantar»,",
          "«comer» y «vivir». ¿Cómo terminan?",
        ],
        h: "Punto 3: El participio",
        a: [
          "Dices cantado, comido y vivido.",
          "Los verbos -ar hacen -ado.",
          "Los verbos -er e -ir hacen -ido.",
        ],
      },
      {
        q: [
          "Deja «cantado» quieto y cambia la",
          "ayudante: he, había, habré. ¿Qué pasa?",
        ],
        h: "Punto 4: Solo cambia la ayudante",
        a: [
          "«He cantado»: pasó y aún importa.",
          "«Había cantado»: estaba hecho antes.",
          "«Habré cantado»: estará hecho después.",
          "«Cantado» nunca cambia.",
        ],
      },
      {
        q: [
          "Pregunta con truco: si todos comieron,",
          "¿«han comido» o «han comidos»?",
        ],
        h: "Punto 5: El participio no lleva -s",
        a: [
          "Dices «han comido».",
          "El participio no lleva -s si son muchos.",
          "Revisa que el participio quede igual.",
        ],
      },
      {
        q: [
          "Llegas arriba. Compara «ayer subí» con",
          "«ya he subido». ¿Qué cambia?",
        ],
        h: "Punto 6: Una palabra o dos",
        a: [
          "«Ayer subí»: una palabra, ya cerró.",
          "«Ya he subido»: dos palabras;",
          "el resultado sigue vivo.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué dos piezas tiene «he cantado»?", o: ["Haber y participio", "Raíz y final", "Verbo y nombre", "Dos raíces"] },
        { q: "¿Cuál es el participio de «comer»?", o: ["comido", "comer", "como", "comiendo"] },
        { q: "¿Cuál es el participio de «cantar»?", o: ["cantado", "cantaba", "cantar", "canto"] },
        { q: "¿Cómo termina el participio de «vivir»?", o: ["-ido", "-ado", "-ando", "-ar"] },
        { q: "¿Cuál frase está bien escrita?", o: ["Han comido.", "Han comidos.", "Han comer.", "Han comiendo."] },
        { q: "¿Qué pieza cambia: he, has, ha, han?", o: ["La ayudante haber", "El participio", "La raíz", "Nada"] },
        { q: "¿Qué frase deja el resultado vivo?", o: ["Ya he subido.", "Ayer subí.", "Subiré mañana.", "Subiría."] },
        { q: "¿Qué forma dice «estaba hecho antes»?", o: ["había cantado", "he cantado", "habré cantado", "cantaré"] },
      ],
      write: [
        "Escribe he, has y ha con «cantado».",
        "Explica con tus palabras qué es el participio.",
      ],
      schematic: [
        "Dibuja dos tramos: haber y participio.",
        "Dibuja una tabla: cantado, comido, vivido.",
      ],
    },
    image: [
      "Dibuja el teleférico con dos tramos.",
      "Escribe «he» en uno y «cantado» en otro.",
      "Abajo escribe «he comido» y «he vivido».",
      "Subraya el participio en cada frase.",
    ],
    summary: "Las formas de dos palabras unen «haber» con un participio: he cantado, había comido.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "ing-c3-w2-d4",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer usaste «haber» y el participio.",
          "El participio no cambia.",
          "Hoy eliges, como quien decide",
          "en qué estación del teleférico bajar.",
        ],
      },
      {
        q: [
          "Te cuentan: «Terminé ayer». ¿Una palabra",
          "o dos? ¿Qué pista te lo dice?",
        ],
        h: "Punto 2: La pista del momento cerrado",
        a: [
          "Es una palabra: «terminé».",
          "«Ayer» es un momento cerrado,",
          "como una estación que ya pasaste.",
          "Pregunta uno: ¿hay un momento cerrado?",
        ],
      },
      {
        q: [
          "Ahora escuchas: «Ya he terminado».",
          "¿Qué cambió? ¿Aún importa el resultado?",
        ],
        h: "Punto 3: La pista del resultado vivo",
        a: [
          "Son dos palabras: «he terminado».",
          "«Ya» dice que el resultado sigue vivo,",
          "como estar ya en la estación de arriba.",
          "Pregunta dos: ¿importa ahora?",
        ],
      },
      {
        q: [
          "Subías leyendo cuando sonó el teléfono.",
          "¿Cuál de las dos acciones es el fondo?",
        ],
        h: "Punto 4: Fondo y golpe",
        a: [
          "«Leía» pinta el fondo: lo que pasaba.",
          "«Sonó» es el golpe: pasó y terminó.",
          "Las dos son de una sola palabra.",
          "Pregunta tres: ¿es fondo o costumbre?",
        ],
      },
      {
        q: [
          "Una pregunta con truco: con un «ayer»",
          "cerrado, ¿«ayer fui» o «ayer he ido»?",
        ],
        h: "Punto 5: No fuerces las dos palabras",
        a: [
          "Suena mejor «ayer fui».",
          "«Ayer» cierra el momento del viaje.",
          "Si el momento cerró, usa una palabra.",
        ],
      },
      {
        q: [
          "Tu turno con «subir»: «Mañana», «Ya» y",
          "«Cuando era pequeña». ¿Qué formas pones?",
        ],
        h: "Punto 6: Elige con las tres preguntas",
        a: [
          "«Mañana subiré»: una palabra, después.",
          "«Ya he subido»: dos palabras, vivo.",
          "«Cuando era pequeña subía»: costumbre.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué pide un momento cerrado («ayer»)?", o: ["Una palabra: terminé", "Dos palabras: he terminado", "cantaré", "habré terminado"] },
        { q: "¿Qué pista dice que el resultado vive?", o: ["Ya", "Ayer", "Mañana", "Cuando era pequeña"] },
        { q: "¿Cuál frase usa dos palabras?", o: ["Ya he terminado.", "Ayer terminé.", "Terminaré mañana.", "Terminaba."] },
        { q: "«Leía cuando sonó»: ¿cuál es el fondo?", o: ["Leía", "Sonó", "Cuando", "El teléfono"] },
        { q: "En «Leía cuando sonó el teléfono», ¿cuál es el golpe?", o: ["sonó", "leía", "cuando", "el"] },
        { q: "¿Qué forma sirve para una costumbre?", o: ["subía", "subí", "he subido", "subiré"] },
        { q: "¿Qué forma va con «mañana»?", o: ["subiré", "subí", "subía", "he subido"] },
        { q: "¿Cuál es la pregunta uno para elegir?", o: ["¿Hay un momento cerrado?", "¿Cuántas letras tiene?", "¿Es largo el participio?", "¿Quién escribe?"] },
      ],
      write: [
        "Escribe una frase de una palabra y otra de dos.",
        "Explica por qué «ayer terminé» es una palabra.",
      ],
      schematic: [
        "Dibuja un esquema con las tres preguntas.",
        "Dibuja «Leía cuando sonó» con fondo y golpe.",
      ],
    },
    image: [
      "Dibuja tres estaciones del teleférico.",
      "Escribe: «ayer», «ya» y «de pequeña».",
      "Pon una frase con «subir» en cada una.",
      "Encierra la que tiene dos palabras.",
    ],
    summary: "Para elegir una palabra o dos, escucha las pistas: momento cerrado, resultado vivo o costumbre.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "ing-c3-w2-d5",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer elegiste entre una palabra y dos",
          "con tres preguntas.",
          "Hoy repasas todo el viaje del teleférico",
          "y practicas cómo contarlo.",
        ],
      },
      {
        q: [
          "Sin mirar nada: ¿cuáles son las cinco",
          "formas de una palabra con «cantar»?",
        ],
        h: "Punto 2: Una palabra, cinco formas",
        a: [
          "Una palabra: canto / cantaba / canté /",
          "cantaré / cantaría.",
          "Cambia el final y la raíz se queda.",
        ],
      },
      {
        q: [
          "¿Y cómo se arman las de dos palabras?",
          "Piensa en los dos tramos.",
        ],
        h: "Punto 3: Dos palabras, dos tramos",
        a: [
          "Dos palabras: ayudante haber + forma",
          "de lo ya hecho (he cantado).",
          "Ayudante: he, has, ha, hemos, han.",
          "Participio: -ado o -ido, sin -s.",
        ],
      },
      {
        q: [
          "Antes de hablar, ¿qué tres preguntas",
          "te ayudan a elegir? Recuérdalas.",
        ],
        h: "Punto 4: Las tres preguntas",
        a: [
          "¿Hay un momento cerrado, como «ayer»?",
          "¿El resultado sigue vivo, como «ya»?",
          "¿Es fondo o costumbre del pasado?",
        ],
      },
      {
        q: [
          "Elige con «cantar»: «Ayer», «Ya» y",
          "«Cuando era pequeña». ¿Una o dos?",
        ],
        h: "Punto 5: Elige con «cantar»",
        a: [
          "«Ayer canté»: una palabra, cerrado.",
          "«Ya he cantado»: dos, resultado vivo.",
          "«Cuando era pequeña cantaba»: costumbre.",
        ],
      },
      {
        q: [
          "Vas a contárselo a alguien de tu casa.",
          "¿Cómo lo cuentas con orden?",
        ],
        h: "Punto 6: Cómo contarlo",
        a: [
          "Inicio: «Hoy les cuento cuándo pasa",
          "algo, como en el teleférico de Mérida».",
          "Medio: un ejemplo de una palabra y otro",
          "de dos, con su pista. Cierre: «Gracias».",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuál forma de «cantar» es de una?", o: ["cantaré", "he cantado", "había cantado", "habré cantado"] },
        { q: "¿Cuál forma de «cantar» lleva dos?", o: ["he cantado", "cantaba", "canté", "cantaría"] },
        { q: "¿Cuál es el participio de «cantar»?", o: ["cantado", "cantaba", "cantar", "canto"] },
        { q: "¿Qué ayudante lleva «he cantado»?", o: ["haber", "ser", "estar", "hacer"] },
        { q: "¿Por qué «ayer canté» lleva una palabra?", o: ["Ayer cierra el momento", "Porque es largo", "Porque es futuro", "No hay razón"] },
        { q: "¿Por qué «ya he cantado» lleva dos?", o: ["El resultado sigue vivo", "El momento está cerrado", "Es una costumbre", "Es lo que harías"] },
        { q: "¿Qué forma sirve para una costumbre?", o: ["cantaba", "canté", "cantaré", "he cantado"] },
        { q: "¿Qué forma dice lo que harías?", o: ["cantaría", "cantaré", "cantaba", "canto"] },
      ],
      write: [
        "Escribe de memoria las cinco formas de «cantar».",
        "Cuenta cuándo usar una palabra o dos.",
      ],
      schematic: [
        "Dibuja un esquema de una y de dos palabras.",
        "Dibuja el teleférico con tres frases tuyas.",
      ],
    },
    image: [
      "Dibuja el teleférico de Mérida subiendo.",
      "En cada estación, una forma de «cantar».",
      "Al lado, las dos piezas de «he cantado».",
      "Revisa que estén las cinco formas.",
    ],
    summary: "Contamos cuándo pasa algo con una palabra (canté) o con dos (he cantado), según las pistas.",
  },
];
