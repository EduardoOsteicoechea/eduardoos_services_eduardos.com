/**
 * Inglés · ciclo 3 · semana 2 · nivel 6 — tiempos del verbo en español:
 * una palabra (canto, cantaba, canté, cantaré, cantaría) o dos (haber + participio).
 * Narrativa inductiva "pregunta primero" (ver BRIEF.md y esp-c3-w1.mjs).
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "ing-c3-w2-d1",
    opening: "¿Cómo sabe alguien si lo que cuentas pasó o está por pasar?",
    repaso: null,
    units: [
      {
        h: "Punto 1: El verbo también dice cuándo",
        a: [
          "Un verbo dice una acción: cantar, comer, vivir.",
          "Conjugar es cambiarlo según quién actúa y cuándo pasa.",
          "La raíz se queda y el final nos cuenta el momento.",
          "Hoy veremos formas de una palabra y de dos palabras.",
        ],
      },
      {
        q: [
          "Mira «cantar». ¿Cómo dirías que cantas ahora y que",
          "cantaste ayer? ¿Cambió la raíz o el final?",
        ],
        h: "Punto 2: Cinco formas de una sola palabra",
        a: [
          "Con «cantar» hay cinco formas de una palabra cada una.",
          "«Canto» es ahora. «Cantaba» es pasado que sigue abierto.",
          "«Canté» es pasado cerrado: ya terminó.",
          "«Cantaré» es más tarde.",
          "«Cantaría» es lo que harías si pudieras.",
        ],
      },
      {
        q: [
          "Sigamos. A veces hacen falta dos palabras: «he cantado».",
          "¿Cuál crees que es la palabra ayudante?",
        ],
        h: "Punto 3: Dos palabras con haber",
        a: [
          "En «he cantado», la ayudante es «he», de «haber».",
          "Aquí «haber» es ayudante; no significa «hay».",
          "«Cantado» es el participio: la forma de lo ya hecho.",
          "Termina en -ado (cantado) o en -ido (comido, vivido).",
        ],
      },
      {
        q: [
          "Una pregunta con truco: si comemos todos,",
          "¿se dice «hemos comido» o «hemos comidos»?",
        ],
        h: "Punto 4: El participio no cambia",
        a: [
          "Se dice «hemos comido».",
          "El participio no cambia por ser muchos.",
          "Solo cambia «haber»: he, has, ha, hemos, han.",
          "«Había comido» es comer antes de otro momento pasado.",
        ],
      },
      {
        q: [
          "Ahora tú: ¿dirías «ayer terminé» o «ya he terminado»",
          "para un trabajo que acabaste ayer? ¿Qué pista ayuda?",
        ],
        h: "Punto 5: Las pistas del momento",
        a: [
          "«Ayer terminé»: ayer cierra la acción.",
          "«Ya he terminado»: el resultado sigue vivo ahora.",
          "Las palabras ayer, ya y cuando son pistas.",
          "Escucha la pista antes de elegir una o dos palabras.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué forma de «cantar» es de una sola palabra?", o: ["cantaba", "he cantado", "había cantado", "habré cantado"] },
        { q: "¿Cuándo pasa «canto»?", o: ["Ahora", "Ayer", "Mañana", "Nunca"] },
        { q: "¿Qué forma es un pasado cerrado?", o: ["canté", "cantaba", "cantaré", "canto"] },
        { q: "¿Qué forma habla de más tarde?", o: ["cantaré", "canté", "cantaba", "canto"] },
        { q: "En «he cantado», ¿cuál es la palabra ayudante?", o: ["he", "cantado", "canto", "cant-"] },
        { q: "¿Cuál es el participio de «comer»?", o: ["comido", "comer", "como", "comiendo"] },
        { q: "¿Cuál frase está bien escrita?", o: ["Hemos comido.", "Hemos comidos.", "He comidos.", "Hemos comer."] },
        { q: "¿Qué frase deja el resultado vivo ahora?", o: ["Ya he terminado.", "Ayer terminé.", "Terminaré mañana.", "Terminaría."] },
      ],
      write: [
        "Escribe tres formas de «cantar» de una sola palabra.",
        "Explica qué hace «he» en la frase «he cantado».",
      ],
      schematic: [
        "Dibuja una línea del tiempo con canto, canté y cantaré.",
        "Dibuja «he» y «cantado» como dos piezas que se unen.",
      ],
    },
    image: [
      "Dibuja una línea del tiempo con tres momentos.",
      "Escribe «ayer», «ahora» y «mañana» debajo de cada uno.",
      "Escribe una forma de «cantar» en cada momento.",
      "Dibuja a alguien cantando en la línea.",
    ],
    summary: "El verbo dice cuándo pasa algo, con una palabra (canté) o con dos (he cantado).",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "ing-c3-w2-d2",
    opening: ayer,
    repaso: [
      "Ayer vimos que el verbo dice qué pasa y cuándo.",
      "Hay formas de una palabra y formas de dos palabras.",
      "Una palabra: canto, cantaba, canté, cantaré, cantaría.",
    ],
    units: [
      {
        q: [
          "Mira «cantar». ¿Cómo suena si cantas ahora y si cantas",
          "mañana? ¿Qué cambió: la raíz o el final?",
        ],
        h: "Punto 1: Ahora y después",
        a: [
          "Ahora se dice «canto» y mañana se dice «cantaré».",
          "La raíz «cant-» se queda igual.",
          "El final es el que nos cuenta cuándo pasa.",
          "Son formas de una sola palabra.",
        ],
      },
      {
        q: [
          "Cuenta qué hacías de pequeño en la ducha cada día,",
          "con «cantar». ¿Qué forma usas?",
        ],
        h: "Punto 2: El pasado que sigue abierto",
        a: [
          "Se dice «cantaba»: el pasado que se queda abierto.",
          "«Cantaba» cuenta algo que se repetía o duraba.",
          "No dice cuándo empezó ni cuándo terminó.",
          "Por ejemplo: «De pequeño cantaba en la ducha cada día.»",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ayer cantaste una sola vez en",
          "el concierto. ¿Cómo lo cuentas? ¿Se parece a «cantaba»?",
        ],
        h: "Punto 3: El pasado que se cierra",
        a: [
          "Se dice «canté»: el pasado que ya se cerró.",
          "«Ayer canté en el concierto» termina esa noche.",
          "«Cantaba» deja el momento abierto; «canté» lo cierra.",
          "Esa es la diferencia entre las dos formas.",
        ],
      },
      {
        q: [
          "Piensa en lo que pasará y en lo que harías si pudieras.",
          "¿Cómo dices «cantar» en cada caso?",
        ],
        h: "Punto 4: Después y «si pudiera»",
        a: [
          "«Cantaré» es lo que pasará más tarde.",
          "«Cantaría» es lo que harías si pudieras.",
          "En inglés: «I will sing» y «I would sing».",
          "Las dos siguen siendo una sola palabra.",
        ],
      },
      {
        q: [
          "Ahora tú: ¿cómo dirías «bailar» ahora, de pequeño,",
          "ayer, mañana y si pudieras?",
        ],
        h: "Punto 5: Los cinco relojes",
        a: [
          "Se dice: bailo, bailaba, bailé, bailaré y bailaría.",
          "Son cinco formas de una palabra, como con «cantar».",
          "La raíz «bail-» se queda y cambia el final.",
          "Dilas en voz alta, como cinco relojes.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué forma de «cantar» dice lo que pasará después?", o: ["cantaré", "cantaba", "canté", "canto"] },
        { q: "¿Qué forma cuenta algo que se repetía de pequeño?", o: ["cantaba", "canté", "cantaré", "cantaría"] },
        { q: "Completa: «Ayer ___ en el concierto».", o: ["canté", "cantaba", "cantaría", "canto"] },
        { q: "¿Qué forma dice lo que harías si pudieras?", o: ["cantaría", "cantaré", "canté", "canto"] },
        { q: "¿Qué parte de «cantar» se queda igual?", o: ["La raíz cant-", "El final", "Todo", "Nada"] },
        { q: "¿Cómo se dice «bailar» para más tarde?", o: ["bailaré", "bailaba", "bailé", "bailaría"] },
        { q: "En inglés, ¿qué dice «I would sing»?", o: ["cantaría", "canté", "cantaré", "cantaba"] },
        { q: "¿Cuántas palabras tiene «cantaba»?", o: ["Una", "Dos", "Tres", "Cuatro"] },
      ],
      write: [
        "Escribe una frase con «cantaba» y otra con «canté».",
        "Explica la diferencia entre «cantaba» y «canté».",
      ],
      schematic: [
        "Dibuja cinco relojes con las cinco formas de «cantar».",
        "Dibuja una línea del tiempo con «cantaba» y «canté».",
      ],
    },
    image: [
      "Dibuja cinco relojes en fila.",
      "Escribe una forma de «bailar» debajo de cada reloj.",
      "Rotula cuál es ahora, antes, después y «si pudiera».",
      "Revisa que la raíz «bail-» sea igual en todos.",
    ],
    summary: "Con una palabra contamos cinco momentos: canto, cantaba, canté, cantaré y cantaría.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "ing-c3-w2-d3",
    opening: ayer,
    repaso: [
      "Ayer vimos las cinco formas de una sola palabra.",
      "Son canto, cantaba, canté, cantaré y cantaría.",
      "Hoy veremos las que llevan dos palabras.",
    ],
    units: [
      {
        q: [
          "Mira «he cantado». ¿Cuántas piezas tiene?",
          "¿Cuál crees que cambia y cuál se queda?",
        ],
        h: "Punto 1: Las dos piezas",
        a: [
          "La primera pieza es «haber»: he, has, ha, hemos, han.",
          "La segunda es el participio: «cantado».",
          "El participio termina en -ado o en -ido.",
          "En inglés se parece a «I have sung».",
        ],
      },
      {
        q: [
          "Busca el participio de «cantar», «comer» y «vivir».",
          "¿Cómo termina cada uno?",
        ],
        h: "Punto 2: El participio",
        a: [
          "Se dice: cantado, comido y vivido.",
          "Los verbos «-ar» hacen -ado.",
          "Los verbos «-er» e «-ir» hacen -ido.",
          "Subraya el participio y lo reconocerás rápido.",
        ],
      },
      {
        q: [
          "Sigamos. Si usas siempre «cantado» y cambias solo la",
          "ayudante, ¿qué pasa? Prueba con he, había, habré y habría.",
        ],
        h: "Punto 3: Solo cambia la ayudante",
        a: [
          "«He cantado»: ya pasó y todavía importa ahora.",
          "«Había cantado»: ya estaba hecho antes de otro pasado.",
          "«Habré cantado»: estará hecho en un momento del futuro.",
          "«Habría cantado»: lo habría hecho, pero no pasó.",
          "El participio «cantado» no cambia.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: si todos comieron, ¿se dice",
          "«han comido» o «han comidos»?",
        ],
        h: "Punto 4: El participio no lleva -s",
        a: [
          "Se dice «han comido».",
          "El participio no lleva -s por ser muchos.",
          "Solo cambia «haber»: he, has, ha, hemos, han.",
          "Revisa siempre que el participio quede igual.",
        ],
      },
      {
        q: [
          "Compara «ayer comí» con «ya he comido».",
          "¿Dicen lo mismo de la comida? ¿Qué cambia?",
        ],
        h: "Punto 5: Una palabra o dos",
        a: [
          "Las dos hablan de comer, pero con sentido distinto.",
          "«Ayer comí»: una palabra, y el pasado se cerró.",
          "«Ya he comido»: dos palabras, y el resultado sigue vivo.",
          "Escribe tu propio par de frases para practicar.",
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
        { q: "¿Qué pieza cambia en he, has, ha, hemos, han?", o: ["La ayudante haber", "El participio", "La raíz", "Nada"] },
        { q: "¿Qué frase deja el resultado vivo ahora?", o: ["Ya he comido.", "Ayer comí.", "Comeré mañana.", "Comería."] },
        { q: "¿Qué forma dice «ya estaba hecho antes»?", o: ["había cantado", "he cantado", "habré cantado", "cantaré"] },
      ],
      write: [
        "Escribe he, has y ha con el participio «cantado».",
        "Explica con tus palabras qué es el participio.",
      ],
      schematic: [
        "Dibuja dos piezas que se unen: haber y participio.",
        "Dibuja una tabla con cantado, comido y vivido.",
      ],
    },
    image: [
      "Dibuja dos piezas de rompecabezas que se unen.",
      "Escribe «he» en una y «cantado» en la otra.",
      "Debajo escribe «he comido» y «he vivido».",
      "Subraya el participio en cada frase.",
    ],
    summary: "Las formas de dos palabras unen «haber» con un participio: he cantado, había comido.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "ing-c3-w2-d4",
    opening: ayer,
    repaso: [
      "Ayer vimos las formas de dos palabras con «haber».",
      "El participio termina en -ado o en -ido.",
      "Solo cambia la ayudante: he, has, ha, hemos, han.",
    ],
    units: [
      {
        q: [
          "Te cuentan: «Terminé ayer». ¿Es una palabra o dos?",
          "¿Qué pista te lo dice?",
        ],
        h: "Punto 1: La pista del momento cerrado",
        a: [
          "Es una palabra: «terminé».",
          "«Ayer» pone un momento cerrado en el pasado.",
          "Primera pregunta: ¿hay un momento cerrado, como «ayer»?",
          "Si lo hay, solemos usar una palabra: «canté», «terminé».",
        ],
      },
      {
        q: [
          "Ahora escucha: «Ya he terminado». ¿Qué cambió?",
          "¿Todavía importa el resultado?",
        ],
        h: "Punto 2: La pista del resultado vivo",
        a: [
          "Aquí usamos dos palabras: «he terminado».",
          "«Ya» avisa que el resultado sigue vivo ahora.",
          "Si el resultado importa ahora, suele ir con «haber».",
          "Esa es la segunda pregunta.",
        ],
      },
      {
        q: [
          "Piensa en «Leía cuando sonó el teléfono».",
          "¿Cuál parte es el fondo y cuál es el golpe repentino?",
        ],
        h: "Punto 3: Fondo y golpe",
        a: [
          "«Leía» pinta el fondo: lo que pasaba mientras tanto.",
          "«Sonó» es el golpe: pasó una vez y terminó.",
          "Las dos son formas de una sola palabra.",
          "Tercera pregunta: ¿es fondo o costumbre del pasado?",
        ],
      },
      {
        q: [
          "Una pregunta con truco: para un «ayer» cerrado,",
          "¿suena mejor «ayer fui» o «ayer he ido»?",
        ],
        h: "Punto 4: No fuerces las dos palabras",
        a: [
          "Con un «ayer» cerrado suena mejor «ayer fui».",
          "«Ayer» cierra el momento, así que elegimos una palabra.",
        ],
      },
      {
        q: [
          "Es tu turno: completa con «comer» las frases «Mañana»,",
          "«Ya» y «Cuando era pequeña». ¿Qué formas pones?",
        ],
        h: "Punto 5: Elige con las tres preguntas",
        a: [
          "«Mañana comeré»: una palabra, para más tarde.",
          "«Ya he comido»: dos palabras, el resultado vive.",
          "«Cuando era pequeña comía»: una palabra, costumbre.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué forma pide un momento cerrado como «ayer»?", o: ["Una palabra: terminé", "Dos palabras: he terminado", "cantaré", "habré terminado"] },
        { q: "¿Qué pista dice que el resultado sigue vivo?", o: ["Ya", "Ayer", "Mañana", "Cuando era pequeña"] },
        { q: "¿Cuál frase usa dos palabras?", o: ["Ya he terminado.", "Ayer terminé.", "Terminaré mañana.", "Terminaba."] },
        { q: "En «Leía cuando sonó el teléfono», ¿cuál pinta el fondo?", o: ["Leía", "Sonó", "Cuando", "Teléfono"] },
        { q: "En esa frase, ¿cuál es el golpe que termina?", o: ["sonó", "leía", "cuando", "el"] },
        { q: "¿Qué forma sirve para una costumbre del pasado?", o: ["comía", "comí", "he comido", "comeré"] },
        { q: "¿Cuál forma va con «mañana»?", o: ["comeré", "comí", "comía", "he comido"] },
        { q: "¿Cuál es la primera pregunta para elegir?", o: ["¿Hay un momento cerrado como «ayer»?", "¿Cuántas letras tiene el verbo?", "¿Es largo el participio?", "¿Quién escribe?"] },
      ],
      write: [
        "Escribe una frase con una palabra y otra con dos palabras.",
        "Explica por qué «ayer terminé» tiene una sola palabra.",
      ],
      schematic: [
        "Dibuja un esquema con las tres preguntas para elegir.",
        "Dibuja «Leía cuando sonó el teléfono» con fondo y golpe.",
      ],
    },
    image: [
      "Dibuja tres cajas: «ayer», «ya» y «cuando era pequeña».",
      "Escribe una frase con «comer» en cada caja.",
      "Encierra cuáles tienen una palabra y cuál tiene dos.",
      "Revisa que cada frase siga su pista.",
    ],
    summary: "Para elegir una palabra o dos, escucha las pistas: momento cerrado, resultado vivo o costumbre.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "ing-c3-w2-d5",
    opening: ayer,
    repaso: [
      "Esta semana aprendiste a contar cuándo pasa algo.",
      "Hay formas de una palabra y formas de dos palabras.",
      "Hoy las recuerdas y se las cuentas a alguien.",
    ],
    units: [
      {
        q: [
          "Sin mirar nada: ¿cuáles son las cinco formas de una",
          "palabra con «cantar» y cómo son las de dos palabras?",
        ],
        w: 2,
        h: "Punto 1: Una palabra o dos",
        a: [
          "Una palabra: canto / cantaba / canté / cantaré / cantaría.",
          "Dos palabras: ayudante haber + forma de lo ya hecho (he cantado).",
        ],
      },
      {
        q: [
          "¿Cuándo pasa cada forma? Une cada una con su momento:",
          "ahora, pasado abierto, pasado cerrado, después y «si pudiera».",
        ],
        h: "Punto 2: Los cinco relojes",
        a: [
          "«Canto» es ahora y «cantaba» es pasado abierto.",
          "«Canté» es pasado cerrado y «cantaré» es después.",
          "«Cantaría» es lo que harías si pudieras.",
        ],
      },
      {
        q: [
          "Ahora las de dos palabras: ¿qué ayudante y qué participio",
          "usarías para decir que «cantar» ya está hecho?",
        ],
        h: "Punto 3: Haber más participio",
        a: [
          "La ayudante es «haber»: he, has, ha, hemos, han.",
          "El participio es «cantado»: -ado o -ido.",
          "Se dice «he cantado», «había comido», «habré vivido».",
        ],
      },
      {
        q: [
          "Elige con «cantar»: «Ayer», «Ya» y «Cuando era pequeña».",
          "¿Una palabra o dos en cada una?",
        ],
        h: "Punto 4: Elige con las tres preguntas",
        a: [
          "«Ayer canté»: una palabra, momento cerrado.",
          "«Ya he cantado»: dos palabras, resultado vivo.",
          "«Cuando era pequeña cantaba»: una palabra, costumbre.",
        ],
      },
      {
        q: [
          "Vas a contárselo a alguien de tu casa.",
          "¿Cómo empezarías para que te entienda?",
        ],
        h: "Punto 5: Cómo contarlo con orden",
        a: [
          "Una buena exposición tiene inicio, medio y cierre.",
          "Inicio: «Hoy les cuento cómo decir cuándo pasa algo».",
          "Medio: un ejemplo de una palabra y uno de dos.",
          "Cierre: repite las tres preguntas y di «gracias».",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué forma de «cantar» es de una sola palabra?", o: ["cantaré", "he cantado", "había cantado", "habré cantado"] },
        { q: "¿Qué forma de «cantar» lleva dos palabras?", o: ["he cantado", "cantaba", "canté", "cantaría"] },
        { q: "¿Cuál es el participio de «cantar»?", o: ["cantado", "cantaba", "cantar", "canto"] },
        { q: "¿Qué ayudante lleva «he cantado»?", o: ["haber", "ser", "estar", "hacer"] },
        { q: "«Ayer canté» usa una palabra. ¿Por qué?", o: ["Ayer cierra el momento", "Porque es largo", "Porque es futuro", "No hay razón"] },
        { q: "«Ya he cantado» usa dos palabras. ¿Por qué?", o: ["El resultado sigue vivo", "El momento es cerrado", "Es una costumbre", "Es lo que harías"] },
        { q: "¿Qué forma sirve para una costumbre del pasado?", o: ["cantaba", "canté", "cantaré", "he cantado"] },
        { q: "¿Qué forma dice lo que harías si pudieras?", o: ["cantaría", "cantaré", "cantaba", "canto"] },
      ],
      write: [
        "Escribe de memoria las cinco formas de una palabra de «cantar».",
        "Cuenta con tus palabras cuándo usar una o dos palabras.",
      ],
      schematic: [
        "Dibuja un esquema con las formas de una y de dos palabras.",
        "Dibuja una línea del tiempo con tres frases tuyas.",
      ],
    },
    image: [
      "Dibuja un reloj grande con cinco números.",
      "Escribe en cada número una forma de «cantar».",
      "Al lado dibuja las dos piezas de «he cantado».",
      "Revisa que no falte ninguna de las cinco formas.",
    ],
    summary: "Contamos cuándo pasa algo con una palabra (canté) o con dos (he cantado), según las pistas.",
  },
];
