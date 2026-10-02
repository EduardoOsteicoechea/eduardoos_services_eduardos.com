/**
 * Español · ciclo 3 · semana 2 · nivel 6 — narrativa inductiva, todo "pregunta primero".
 *
 * Tema de la semana (según el JSON vivo): narrar CUÁNDO ocurre una acción.
 * d1 intro (una palabra / dos palabras) · d2 una sola palabra · d3 haber + participio
 * · d4 elegir según las pistas de tiempo · d5 repaso y exposición.
 *
 * unit = { q: [líneas de pregunta] (omitir si la pregunta es la apertura),
 *          h: "Punto N: título", a: [líneas de respuesta], w?: líneas de espacio, c?: líneas para copiar }
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "esp-c3-w2-d1",
    opening: "¿Cómo cuentas si algo pasa hoy, pasó ayer o pasará mañana?",
    repaso: null,
    units: [
      {
        h: "Punto 1: El verbo cuenta cuándo pasa algo",
        a: [
          "El verbo nombra lo que alguien hace, como «cantar».",
          "Pero también dice cuándo lo hace: ahora, ayer o mañana.",
          "Con «yo», el final cambia: canto, canté, cantaré.",
          "Cambiar el verbo así se llama conjugar.",
        ],
      },
      {
        q: [
          "Mira: «Yo canto». «Yo canté». «Yo cantaré».",
          "¿Qué parte de «cantar» se queda igual y cuál cambia?",
        ],
        h: "Punto 2: La raíz se queda y el final cambia",
        a: [
          "La parte de adelante, «cant-», se queda igual: es la raíz.",
          "La parte de atrás cambia: es la desinencia, el final.",
          "«Canto» es ahora, «canté» ya pasó y «cantaré» vendrá.",
          "Una sola palabra dice quién actúa y cuándo.",
        ],
      },
      {
        q: [
          "Imagina que de niño cantabas siempre en el coro.",
          "¿Cómo dirías ese pasado que duró mucho tiempo?",
        ],
        h: "Punto 3: Cinco formas con una sola palabra",
        a: [
          "Una palabra: canto, cantaba, canté, cantaré, cantaría.",
          "«Canto» es ahora; «cantaba» es un pasado que duró.",
          "«Canté» es un pasado que ya cerró.",
          "«Cantaré» es después y «cantaría» es algo que imaginas.",
        ],
      },
      {
        q: [
          "Ahora mira «he cantado». ¿Cuántas palabras ves?",
          "¿Cuál es el ayudante y cuál es la acción?",
        ],
        h: "Punto 4: Dos palabras que trabajan juntas",
        a: [
          "A veces el verbo usa dos palabras: «he cantado».",
          "«He» viene de «haber» y es el ayudante.",
          "«Cantado» es el participio: termina en -ado o -ido.",
          "Dos palabras: haber más participio, como he cantado.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ayer fuiste al cine y volviste.",
          "¿Dices «Ayer iba al cine» o «Ayer fui al cine»?",
        ],
        h: "Punto 5: Elegir según el momento",
        a: [
          "Si el viaje ya cerró, di: «Ayer fui al cine».",
          "«Iba» sirve para un pasado que se alarga o se repite.",
          "Antes de hablar, pregúntate: ¿ya terminó o seguía?",
          "Esa pregunta te ayuda a elegir bien la forma.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cómo se llama cambiar el verbo según cuándo pasa?", o: ["Conjugar", "Copiar", "Dividir", "Rotular"] },
        { q: "En «cantar», ¿cómo se llama la parte «cant-»?", o: ["La raíz", "La desinencia", "El participio", "El ayudante"] },
        { q: "¿Cómo se llama la parte que cambia al final?", o: ["La desinencia", "La raíz", "El participio", "La mayúscula"] },
        { q: "¿Cuál forma cuenta un pasado que ya cerró?", o: ["canté", "canto", "cantaré", "cantaría"] },
        { q: "¿Cuál forma habla de algo que pasará después?", o: ["cantaré", "cantaba", "canté", "he cantado"] },
        { q: "En «he cantado», ¿cuál es el participio?", o: ["cantado", "he", "cant-", "yo"] },
        { q: "¿Cómo terminan los participios de la clase?", o: ["En -ado o -ido", "En -ar o -er", "En -s o -n", "En -ito"] },
        { q: "¿Cómo dices que el viaje de ayer ya cerró?", o: ["Ayer fui al cine.", "Ayer iba al cine.", "Ayer iré al cine.", "Ayer voy al cine."] },
      ],
      write: [
        "Escribe canto, canté y cantaré. Di cuándo pasa cada una.",
        "Explica con tus palabras qué es «he cantado».",
      ],
      schematic: [
        "Dibuja una línea del tiempo con canté, canto y cantaré.",
        "Dibuja «he cantado» y señala el ayudante y el participio.",
      ],
    },
    image: [
      "Dibuja una línea del tiempo con ayer, hoy y mañana.",
      "Escribe «canté», «canto» y «cantaré» en su lugar.",
      "Dibuja una cara cantando en cada momento.",
      "Debajo escribe «he cantado» y marca el ayudante.",
    ],
    summary: "El verbo cambia su final para decir cuándo pasa algo. Puede usar una palabra o dos.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "esp-c3-w2-d2",
    opening: ayer,
    repaso: [
      "Ayer vimos que el verbo cambia para decir cuándo pasa algo.",
      "La raíz se queda igual y el final, la desinencia, cambia.",
      "Hay formas de una palabra y formas de dos palabras.",
    ],
    units: [
      {
        q: [
          "Piensa en el verbo «terminar». Hoy yo termino la tarea.",
          "¿Cómo dices que ayer la terminaste a las cinco?",
        ],
        h: "Punto 1: Lo que cerró usa «terminé»",
        a: [
          "Dices: «Ayer terminé la tarea a las cinco».",
          "«Terminé» cierra el hecho: ya se acabó.",
          "Esa forma se llama pretérito: un pasado que ya cerró.",
          "Su pista suele ser una palabra como «ayer».",
        ],
      },
      {
        q: [
          "Imagina que cuentas tu infancia: «yo cantaba en el coro».",
          "¿Ese pasado cerró de golpe o se alargaba?",
        ],
        h: "Punto 2: Lo que se alargaba usa «cantaba»",
        a: [
          "«Cantaba» pinta un pasado que se alarga o se repite.",
          "Ejemplo: «Cuando era niño, cantaba en el coro».",
          "A esa forma se le llama imperfecto.",
          "Pinta el fondo, como el paisaje de un cuento.",
        ],
      },
      {
        q: [
          "Sigamos. Hoy es lunes y piensas en el mapa de mañana.",
          "¿Cómo dices que lo terminarás?",
        ],
        h: "Punto 3: Lo que viene usa «terminaré»",
        a: [
          "Dices: «Mañana terminaré el mapa».",
          "«Terminaré» mira hacia delante: es el futuro.",
          "«Terminaría» imagina algo que podría pasar.",
          "Así, cada final responde a una pregunta sobre el tiempo.",
        ],
      },
      {
        q: [
          "Los verbos «leer» y «correr» también cambian.",
          "¿Cómo crees que suenan para ayer, antes y mañana?",
        ],
        h: "Punto 4: Otros verbos hacen lo mismo",
        a: [
          "Con «leer»: «leía» se alarga, «leí» cerró, «leeré» vendrá.",
          "Con «correr»: corría, corrí, correré.",
          "La raíz se queda y el final cambia.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ayer fuiste al cine y volviste.",
          "¿Dices «Ayer iba al cine» o «Ayer fui al cine»?",
        ],
        h: "Punto 5: Cuidado con el hecho cerrado",
        a: [
          "Dices: «Ayer fui al cine».",
          "El viaje ya cerró, así que usas «fui».",
          "«Iba» se queda para costumbres: «Iba cada sábado».",
          "Pregúntate siempre: ¿se cerró o se alargaba?",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "Completa: «Ayer ___ la tarea a las cinco».", o: ["terminé", "terminaba", "terminaré", "terminaría"] },
        { q: "¿Cuál forma cuenta un pasado que se alarga?", o: ["cantaba", "canté", "cantaré", "canto"] },
        { q: "Completa: «Mañana ___ el mapa».", o: ["terminaré", "terminé", "terminaba", "termino"] },
        { q: "¿Cómo se llama el pasado que ya cerró?", o: ["Pretérito", "Futuro", "Imperfecto", "Participio"] },
        { q: "¿Cuál es la raíz de «corría», «corrí» y «correré»?", o: ["corr-", "-ía", "-é", "haber"] },
        { q: "¿Cuál forma de «leer» es un pasado que ya cerró?", o: ["leí", "leía", "leeré", "leo"] },
        { q: "¿Cómo dices que el viaje de ayer ya cerró?", o: ["Ayer fui al cine.", "Ayer iba al cine.", "Ayer iré al cine.", "Ayer voy al cine."] },
        { q: "¿Para qué sirve «cantaba» en «Cuando era niño, cantaba»?", o: ["Pinta un pasado que se alarga", "Cierra el hecho de golpe", "Mira hacia delante", "Une dos ideas"] },
      ],
      write: [
        "Escribe tres oraciones con «yo»: pasado cerrado, largo y futuro.",
        "Explica por qué se dice «Ayer fui al cine».",
      ],
      schematic: [
        "Dibuja una línea del tiempo con terminaba, terminé y terminaré.",
        "Dibuja una tabla de leer y correr con tres formas cada una.",
      ],
    },
    image: [
      "Dibuja tres escenas pequeñas: ayer, de niño y mañana.",
      "Debajo de cada escena escribe una oración con «yo».",
      "Usa una forma que cerró, una que se alarga y una futura.",
      "Subraya la raíz de cada verbo con un color.",
    ],
    summary: "Con una sola palabra el verbo dice si el hecho cerró, se alargaba o vendrá después.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "esp-c3-w2-d3",
    opening: ayer,
    repaso: [
      "Ayer profundizamos los tiempos de una sola palabra.",
      "«Terminé» cierra el hecho y «cantaba» lo alarga.",
      "«Terminaré» mira hacia delante.",
    ],
    units: [
      {
        q: [
          "Mira: «he cantado». ¿Cuántas palabras tiene?",
          "¿Qué trabajo crees que hace cada una?",
        ],
        h: "Punto 1: Dos piezas que van juntas",
        a: [
          "La primera pieza es «haber» conjugado: he, has, ha.",
          "La segunda pieza es el participio: cantado, comido.",
          "Juntas cuentan un hecho que ya se hizo.",
          "Aquí «haber» solo ayuda; no quiere decir «existe».",
        ],
      },
      {
        q: [
          "El participio de «cantar» es «cantado».",
          "¿Cómo crees que será el de «comer»?",
        ],
        h: "Punto 2: Cómo se arma el participio",
        a: [
          "A los verbos en -ar les pones -ado: cantar, cantado.",
          "A los verbos en -er les pones -ido: comer, comido.",
          "Con «haber»: he comido, has comido, ha comido.",
        ],
      },
      {
        q: [
          "Imagina que ya comiste y te ofrecen más.",
          "¿Cómo dices que la comida sigue contigo ahora?",
        ],
        h: "Punto 3: «He comido» llega hasta hoy",
        a: [
          "Dices: «He comido»; el resultado llega hasta ahora.",
          "Ya comiste, y todavía estás lleno hoy.",
          "«He cantado» dice que ya cantaste y aún importa hoy.",
        ],
      },
      {
        q: [
          "Sigamos. Lee: «Cuando llegué, mi amiga había salido».",
          "¿Qué pasó primero: llegar tú o salir ella?",
        ],
        h: "Punto 4: Había salido: antes de otro pasado",
        a: [
          "Primero salió ella; después llegaste tú.",
          "«Había salido» cuenta lo que pasó antes de otro pasado.",
          "«Habré cantado» es un futuro que ya estará cumplido.",
          "«Habría cantado» es algo que imaginas.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿se dice «hemos comidos»",
          "o «hemos comido»?",
        ],
        h: "Punto 5: El participio no cambia",
        a: [
          "Se dice «hemos comido».",
          "Lo que cambia es «haber»: he, has, hemos.",
          "El participio se queda igual con todos: comido.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuántas palabras tiene «he cantado»?", o: ["Dos", "Una", "Tres", "Ninguna"] },
        { q: "En «he cantado», ¿cuál es el ayudante?", o: ["he", "cantado", "cant-", "-ado"] },
        { q: "¿Cuál es el participio de «comer»?", o: ["comido", "comado", "comiendo", "comió"] },
        { q: "¿Cuál es el participio de «cantar»?", o: ["cantado", "cantido", "cantando", "cantó"] },
        { q: "¿Qué cuenta «he comido»?", o: ["Un hecho cuyo resultado llega a hoy", "Un pasado muy lejano", "Algo que nunca pasó", "Una orden"] },
        { q: "En «Cuando llegué, mi amiga había salido», ¿qué fue primero?", o: ["Salir ella", "Llegar tú", "Las dos a la vez", "Ninguna"] },
        { q: "¿Cuál se dice bien?", o: ["Hemos comido.", "Hemos comidos.", "Hemos comida.", "Hemos comiendo."] },
        { q: "¿Qué forma imagina algo, como una hipótesis?", o: ["habría cantado", "he cantado", "había cantado", "cantó"] },
      ],
      write: [
        "Escribe he, habías y habremos con el participio «comido».",
        "Explica por qué se dice «hemos comido» y no «hemos comidos».",
      ],
      schematic: [
        "Dibuja «he cantado» y señala el ayudante y el participio.",
        "Dibuja una línea con «había salido» antes de «llegué».",
      ],
    },
    image: [
      "Dibuja una casa con tu amiga saliendo por la puerta.",
      "Dibújate llegando después, y escribe «Cuando llegué».",
      "Escribe debajo «había salido» y marca el ayudante.",
      "Añade una flecha que muestre qué pasó primero.",
    ],
    summary: "Haber más participio cuenta un hecho ya hecho. El participio no cambia; cambia haber.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "esp-c3-w2-d4",
    opening: ayer,
    repaso: [
      "Ayer vimos que haber más participio usa dos palabras.",
      "Dijimos he cantado, había cantado y habré cantado.",
      "El participio no cambia: se dice «hemos comido».",
    ],
    units: [
      {
        q: [
          "Compara: «Ayer terminé» y «Ya he terminado».",
          "¿Qué palabra de tiempo te da una pista en cada una?",
        ],
        h: "Punto 1: Las palabras de tiempo dan pistas",
        a: [
          "«Ayer» cierra el hecho: «Ayer terminé la tarea».",
          "«Ya» trae el resultado hasta hoy: «Ya he terminado».",
          "Palabras como ayer, ya y cuando te orientan.",
          "Antes de conjugar, búscalas en la oración.",
        ],
      },
      {
        q: [
          "Lee: «Leía cuando sonó el teléfono».",
          "¿Cuál acción es el fondo y cuál es el golpe?",
        ],
        h: "Punto 2: Fondo y golpe en un cuento",
        a: [
          "«Leía» es el fondo: algo que estaba en marcha.",
          "«Sonó» es el golpe: pasó de repente y cerró.",
          "El fondo usa una forma larga y el golpe una cerrada.",
          "Es como un paisaje donde algo salta de pronto.",
        ],
      },
      {
        q: [
          "Completa: «Cuando llegué, mi amiga ___ salido».",
          "¿Pones «ha», «había» o «habrá»?",
        ],
        h: "Punto 3: Lo anterior a otro pasado",
        a: [
          "Pones «había»: «Cuando llegué, mi amiga había salido».",
          "Salir pasó antes que llegar.",
          "Para lo anterior a otro pasado usas dos palabras.",
        ],
      },
      {
        q: [
          "Vas a elegir la forma de un verbo.",
          "¿Qué te preguntarías antes de decidir?",
        ],
        h: "Punto 4: Tres preguntas para elegir",
        a: [
          "Primera: ¿el hecho cerró? Entonces usa «terminé».",
          "Segunda: ¿el resultado sigue vivo? Usa «he terminado».",
          "Tercera: ¿era un fondo que se alargaba? Usa «leía».",
          "Así eliges una palabra o dos según tu cuento.",
        ],
      },
      {
        q: [
          "Ahora tú: inventa tres oraciones sobre tu día de ayer.",
          "Usa una forma de una palabra y una de dos.",
        ],
        h: "Punto 5: Un mini-relato de tres oraciones",
        a: [
          "Por ejemplo: «Ayer jugué en el patio».",
          "«Jugaba cuando sonó la campana».",
          "«Ya he guardado mis juguetes».",
          "Cada oración tiene su razón: cerró, fondo o resultado.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "En «Ayer terminé», ¿qué dice la pista «ayer»?", o: ["El hecho cerró", "Sigue vivo hoy", "Es un fondo", "Es una orden"] },
        { q: "¿Qué palabra trae el resultado hasta hoy?", o: ["Ya", "Ayer", "Cuando", "Mañana"] },
        { q: "En «Leía cuando sonó el teléfono», ¿cuál es el fondo?", o: ["Leía", "Sonó", "Teléfono", "Cuando"] },
        { q: "En esa misma oración, ¿cuál es el golpe?", o: ["Sonó", "Leía", "Cuando", "El"] },
        { q: "Completa: «Cuando llegué, mi amiga ___ salido».", o: ["había", "ha", "hemos", "habrá"] },
        { q: "¿Qué pregunta te ayuda a elegir «terminé»?", o: ["¿El hecho cerró?", "¿Cuántas letras tiene?", "¿Es una palabra larga?", "¿Cómo se escribe?"] },
        { q: "¿Qué forma usas para un fondo que se alargaba?", o: ["leía", "leí", "leeré", "he leído"] },
        { q: "¿Cuál oración trae un resultado que llega a hoy?", o: ["Ya he guardado mis juguetes.", "Ayer jugué en el patio.", "Jugaba cuando sonó la campana.", "Mañana jugaré."] },
      ],
      write: [
        "Escribe un mini-relato de tres oraciones sobre tu ayer.",
        "Explica cómo eliges entre «terminé» y «he terminado».",
      ],
      schematic: [
        "Dibuja un esquema con las tres preguntas para elegir.",
        "Dibuja «Leía cuando sonó» con el fondo y el golpe.",
      ],
    },
    image: [
      "Dibuja a alguien leyendo y un teléfono que suena.",
      "Rotula «leía» en el fondo y «sonó» en el golpe.",
      "Añade un reloj y escribe «ya he terminado».",
      "Escribe debajo una frase con «ayer» y otra con «ya».",
    ],
    summary: "Para elegir miras las pistas: ¿cerró?, ¿sigue vivo?, ¿era fondo? Así usas una palabra o dos.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "esp-c3-w2-d5",
    opening: ayer,
    repaso: [
      "Ayer aprendimos a elegir entre una palabra y dos.",
      "Miramos ayer, ya y cuando para saber qué forma usar.",
      "Hoy ordenamos la semana y la contamos.",
    ],
    units: [
      {
        q: [
          "Sin mirar nada: ¿qué cinco formas de «cantar»",
          "dicen cuándo pasa algo con una sola palabra?",
        ],
        w: 3,
        h: "Punto 1: Las formas de una sola palabra",
        a: [
          "Una palabra: canto, cantaba, canté, cantaré, cantaría.",
          "«Canto» es ahora y «cantaba» es un pasado que se alarga.",
          "«Canté» cerró, «cantaré» vendrá y «cantaría» se imagina.",
        ],
      },
      {
        q: [
          "¿Y cuándo usamos dos palabras? ¿Cuáles son?",
          "¿Qué recuerdas de «he cantado»?",
        ],
        h: "Punto 2: Las formas de dos palabras",
        a: [
          "Dos palabras: haber más participio, como he cantado.",
          "Cambia «haber»: he, has, hemos, había. El participio, no.",
          "«He cantado» trae el resultado hasta hoy.",
        ],
      },
      {
        q: [
          "Lee: «Ayer terminé el mapa. Ya he guardado todo.»",
          "¿Cuál oración cerró y cuál trae el resultado a hoy?",
        ],
        h: "Punto 3: Elegir con las pistas",
        a: [
          "«Ayer terminé» cerró: «ayer» es la pista.",
          "«Ya he guardado» trae el resultado hasta hoy.",
          "«Leía cuando sonó» tiene fondo y golpe.",
          "«Cuando llegué, había salido» pone uno antes del otro.",
        ],
      },
      {
        q: [
          "Vas a contarle a alguien lo que aprendiste.",
          "¿Cómo empezarías para que te entienda?",
        ],
        h: "Punto 4: Cómo contarlo con orden",
        a: [
          "Una buena exposición tiene inicio, medio y cierre.",
          "Inicio: «Hoy les cuento cómo decimos cuándo pasa algo».",
          "Medio: da un ejemplo de una palabra y uno de dos.",
          "Cierre: repite la regla y di «gracias» a quien escuchó.",
        ],
      },
      {
        q: [
          "¿Basta con repetir la lista de formas?",
          "¿Qué debes preguntarte cuando hablas?",
        ],
        h: "Punto 5: Elegir bien, no solo recordar",
        a: [
          "No basta con la lista: hay que elegir bien.",
          "Pregúntate: ¿cerró?, ¿sigue vivo?, ¿era fondo?",
          "Así sabes si usas una palabra o dos.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuántas formas de una palabra viste con «cantar»?", o: ["Cinco", "Dos", "Tres", "Nueve"] },
        { q: "¿Cuál forma de una palabra mira hacia el futuro?", o: ["cantaré", "canté", "cantaba", "canto"] },
        { q: "¿De qué dos piezas se arma «he cantado»?", o: ["Haber y participio", "Raíz y desinencia", "Sustantivo y verbo", "Artículo y adjetivo"] },
        { q: "¿Qué cambia en «he, has, hemos cantado»?", o: ["Solo haber", "Solo el participio", "Todo", "Nada"] },
        { q: "¿Cuál es el participio de «comer»?", o: ["comido", "comí", "comeré", "comería"] },
        { q: "¿Qué oración trae el resultado hasta hoy?", o: ["Ya he guardado todo.", "Ayer terminé el mapa.", "Leía cuando sonó.", "Mañana guardaré todo."] },
        { q: "En «Leía cuando sonó», ¿qué palabra es el fondo?", o: ["Leía", "Sonó", "Cuando", "Ninguna"] },
        { q: "¿Cómo se organiza una buena exposición?", o: ["Inicio, medio y cierre", "Solo un cierre", "Solo ejemplos", "Una lista sin orden"] },
      ],
      write: [
        "Escribe de memoria las cinco formas de «cantar».",
        "Cuenta tu ayer con una forma de una palabra y una de dos.",
      ],
      schematic: [
        "Dibuja un esquema con las formas de una y de dos palabras.",
        "Dibuja una línea del tiempo con tres formas y su ejemplo.",
      ],
    },
    image: [
      "Dibuja una línea del tiempo con ayer, ya y mañana.",
      "Escribe una forma de «cantar» en cada momento.",
      "Añade «he cantado» donde el resultado llega a hoy.",
      "Revisa que cada frase diga cuándo pasa algo.",
    ],
    summary: "Esta semana aprendiste a contar cuándo pasa algo con una palabra o con haber más participio.",
  },
];
