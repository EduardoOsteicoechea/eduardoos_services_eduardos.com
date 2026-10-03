/**
 * Español · ciclo 3 · semana 2 · nivel 6 — Ask First + metáfora de Venezuela (v3, 3 días).
 *
 * Tema: el verbo cuenta cuándo pasa algo.
 * Hito: Cumaná, fundada por los españoles en 1515 (estado Sucre): un pasado que sigue vivo en el presente.
 * d1 panorama (una palabra / dos palabras) · d2 dos pasados + haber con participio
 * · d3 pistas de tiempo, fondo y golpe, y contar lo aprendido.
 */
export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "esp-c3-w2-d1",
    units: [
      {
        h: "Punto 1: Repaso de la clase pasada",
        a: [
          "La semana pasada viste nueve clases",
          "de palabras. El verbo dice qué se hace.",
          "Hoy ese verbo viaja a Cumaná contigo.",
        ],
      },
      {
        q: [
          "Los españoles fundaron Cumaná en 1515.",
          "¿Eso pasó hoy, ayer o hace mucho?",
        ],
        h: "Punto 2: El verbo dice cuándo",
        a: [
          "«Fundaron» cuenta que ya pasó.",
          "«Existe» cuenta lo que pasa hoy.",
          "El verbo dice qué pasa y cuándo.",
        ],
      },
      {
        q: [
          "Cantas en Cumaná. Hoy dices «yo canto».",
          "¿Cómo lo dices para ayer y mañana?",
        ],
        h: "Punto 3: Raíz fija, final que cambia",
        a: [
          "Dices «yo canté» y «yo cantaré».",
          "La parte «cant-» no cambia: es la raíz.",
          "El final cambia y dice cuándo.",
        ],
      },
      {
        q: [
          "Con la raíz «cant-» y una sola palabra",
          "puedes decir cuándo. ¿Cuántas formas?",
        ],
        h: "Punto 4: Cinco formas con una palabra",
        a: [
          "Una palabra: canto / cantaba / canté /",
          "cantaré / cantaría. «Canté» ya cerró,",
          "«cantaba» es un pasado que se alarga.",
        ],
      },
      {
        q: [
          "Mira «he cantado». ¿Cuántas palabras?",
          "¿Cuál ayuda y cuál es la acción?",
        ],
        h: "Punto 5: Dos palabras con haber",
        a: [
          "Dos palabras: haber + participio",
          "(he cantado). «He» es el ayudante",
          "y «cantado» es el participio.",
        ],
      },
      {
        q: [
          "Ayer fuiste a Cumaná y volviste.",
          "¿Dices «Ayer iba» o «Ayer fui»?",
        ],
        h: "Punto 6: Elige según el momento",
        a: [
          "Dices «Ayer fui a Cumaná».",
          "El viaje ya cerró, por eso «fui».",
          "«Iba» es un pasado que se alarga.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué dice el verbo, además de qué pasa?", o: ["Cuándo pasa", "De qué color es", "Cuántos hay", "Dónde queda el mapa"] },
        { q: "¿En qué año fundaron Cumaná?", o: ["1515", "1551", "1155", "1115"] },
        { q: "¿Cómo se llama la parte «cant-»?", o: ["La raíz", "El final", "El participio", "El ayudante"] },
        { q: "¿Cuál forma es un pasado que cerró?", o: ["canté", "canto", "cantaré", "cantaría"] },
        { q: "¿Cuál forma es un pasado que se alarga?", o: ["cantaba", "canté", "cantaré", "canto"] },
        { q: "En «he cantado», ¿cuál es el ayudante?", o: ["he", "cantado", "cant-", "yo"] },
        { q: "¿Cuántas palabras tiene «he cantado»?", o: ["Dos", "Una", "Tres", "Cinco"] },
        { q: "¿Cómo dices que el viaje cerró?", o: ["Ayer fui a Cumaná.", "Ayer iba a Cumaná.", "Ayer iré a Cumaná.", "Ayer voy a Cumaná."] },
      ],
      write: [
        "Escribe canto, canté y cantaré. Di cuándo pasa cada una.",
        "Cuenta con tus palabras qué es «he cantado».",
      ],
      schematic: [
        "Dibuja una línea del tiempo con canté, canto y cantaré.",
        "Dibuja «he cantado» y señala el ayudante y el participio.",
      ],
    },
    image: [
      "Dibuja Cumaná y una línea del tiempo",
      "con ayer, hoy y mañana. Escribe",
      "«canté», «canto» y «cantaré» en su lugar",
      "y deja un espacio para «he cantado».",
    ],
    summary: "El verbo cuenta cuándo pasa algo, como el pasado de Cumaná que sigue vivo hoy.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "esp-c3-w2-d2",
    title: "Dos pasados y haber con participio",
    units: [
      {
        h: "Punto 1: Repaso de la clase pasada",
        a: [
          "La clase pasada viste que el verbo",
          "dice cuándo: la raíz se queda y el",
          "final cambia. Hoy, Cumaná otra vez.",
        ],
      },
      {
        q: [
          "Los españoles fundaron Cumaná en 1515.",
          "¿Ese hecho se cerró o se alargó?",
        ],
        h: "Punto 2: El pasado que cerró",
        a: [
          "«Fundaron» cierra el hecho: ya acabó.",
          "Esa forma se llama pretérito.",
          "Su pista es «ayer» o «en 1515».",
        ],
      },
      {
        q: [
          "Un niño vivía en Cumaná y jugaba.",
          "¿Ese pasado duró un rato o mucho?",
        ],
        h: "Punto 3: El pasado que se alarga",
        a: [
          "«Vivía» pinta algo que duró mucho.",
          "Esa forma se llama imperfecto.",
          "Es el fondo del cuento, el paisaje.",
        ],
      },
      {
        q: [
          "Cumaná ha llegado hasta hoy.",
          "¿Cuántas palabras tiene «ha llegado»?",
        ],
        h: "Punto 4: Dos piezas que van juntas",
        a: [
          "«Ha» es de «haber»: la ayudante.",
          "«Llegado» es el participio: la acción.",
          "Juntas cuentan un hecho ya hecho.",
        ],
      },
      {
        q: [
          "Ya sabes que cantar da «cantado».",
          "¿Cómo armas el participio de «comer»?",
        ],
        h: "Punto 5: Cómo se arma el participio",
        a: [
          "Verbos en -ar: -ado. Cantar, cantado.",
          "Verbos en -er: -ido. Comer, comido.",
          "Se dice «hemos comido», no «comidos».",
        ],
      },
      {
        q: [
          "Ya comiste en Cumaná y te ofrecen más.",
          "¿Cómo dices que sigues lleno?",
        ],
        h: "Punto 6: «He comido» llega hasta hoy",
        a: [
          "«He comido» trae el resultado hasta hoy.",
          "Ya comiste y todavía estás lleno.",
          "Como Cumaná: nació antes y sigue hoy.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cómo se llama el pasado que cerró?", o: ["Pretérito", "Futuro", "Imperfecto", "Participio"] },
        { q: "¿Cómo se llama el pasado que se alarga?", o: ["Imperfecto", "Pretérito", "Futuro", "La raíz"] },
        { q: "¿Cuál forma pinta algo que duró?", o: ["vivía", "fundaron", "comí", "llegó"] },
        { q: "¿Cuántas palabras tiene «ha llegado»?", o: ["Dos", "Una", "Tres", "Cuatro"] },
        { q: "En «ha llegado», ¿cuál es el ayudante?", o: ["ha", "llegado", "lleg-", "-ado"] },
        { q: "¿Cuál es el participio de «comer»?", o: ["comido", "comado", "comiendo", "comió"] },
        { q: "¿Cuál se dice bien?", o: ["Hemos comido.", "Hemos comidos.", "Hemos comida.", "Hemos comiendo."] },
        { q: "¿Qué cuenta «he comido»?", o: ["Un hecho que llega a hoy", "Un pasado muy lejano", "Algo que nunca pasó", "Una orden"] },
      ],
      write: [
        "Escribe he, has y hemos con «comido».",
        "Cuenta por qué «Fundaron Cumaná» cerró.",
      ],
      schematic: [
        "Dibuja «ha llegado»: ayudante y participio.",
        "Dibuja una línea con «fundaron» y «vivía».",
      ],
    },
    image: [
      "Dibuja Cumaná en tres momentos:",
      "1515 con «fundaron», un niño con",
      "«vivía» y hoy con «ha llegado». Deja",
      "vacíos los rótulos para completarlos.",
    ],
    summary: "Fundaron cerró y vivía se alargó. Haber más participio cuenta un hecho que llega a hoy.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "esp-c3-w2-d3",
    title: "Pistas de tiempo y contar lo aprendido",
    units: [
      {
        h: "Punto 1: Repaso de la clase pasada",
        a: [
          "La clase pasada viste dos pasados y",
          "«he comido». Hoy buscas pistas de",
          "tiempo y cuentas la historia de Cumaná.",
        ],
      },
      {
        q: [
          "Compara «Ayer terminé»",
          "y «Ya he terminado». ¿Cuál es la pista?",
        ],
        h: "Punto 2: Las palabras de tiempo",
        a: [
          "«Ayer» y «en 1515» cierran el hecho.",
          "«Ya» trae el resultado hasta hoy.",
          "Ayer, ya y cuando son pistas.",
        ],
      },
      {
        q: [
          "Lee: «Caminaba por Cumaná cuando sonó",
          "una campana». ¿Cuál es el fondo?",
        ],
        h: "Punto 3: Fondo y golpe en un cuento",
        a: [
          "«Caminaba» es el fondo: en marcha.",
          "«Sonó» es el golpe: pasó de repente.",
          "El fondo es largo; el golpe, cerrado.",
        ],
      },
      {
        q: [
          "Completa: «Cuando llegué, mi amiga",
          "___ salido». ¿«ha», «había» o «habrá»?",
        ],
        h: "Punto 4: Lo anterior a otro pasado",
        a: [
          "Pones «había»: ella ya había salido.",
          "Salir pasó antes que llegar.",
          "La pista es «cuando llegué».",
        ],
      },
      {
        q: [
          "Vas a contarle a alguien lo aprendido.",
          "¿Cómo lo ordenas para que te entienda?",
        ],
        h: "Punto 5: Cómo contarlo con orden",
        a: [
          "Inicio: «Hoy cuento cuándo pasa algo».",
          "Medio: formas de una y dos palabras.",
          "Cierre: repite la regla y da gracias.",
        ],
      },
      {
        q: [
          "Ahora cuenta tu ayer. ¿Qué preguntas",
          "te haces para elegir cada forma?",
        ],
        h: "Punto 6: Elegir bien, no solo recordar",
        a: [
          "¿Cerró? «Ayer dibujé Cumaná».",
          "¿Era fondo? «Dibujaba cuando sonó».",
          "¿Llega a hoy? «Ya he guardado todo».",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "En «Ayer terminé», ¿qué dice «ayer»?", o: ["El hecho cerró", "Sigue vivo hoy", "Es un fondo", "Es una orden"] },
        { q: "¿Qué palabra trae el resultado a hoy?", o: ["Ya", "Ayer", "Cuando", "Mañana"] },
        { q: "En «Caminaba cuando sonó», ¿cuál es el fondo?", o: ["Caminaba", "Sonó", "Campana", "Cuando"] },
        { q: "En «Caminaba cuando sonó», ¿cuál es el golpe?", o: ["Sonó", "Caminaba", "Cuando", "Por"] },
        { q: "Completa: «Cuando llegué, ella ya ___ salido.»", o: ["había", "ha", "hemos", "habrá"] },
        { q: "Con «Ayer dibujé Cumaná», ¿qué te preguntas?", o: ["¿Cerró?", "¿Es corta?", "¿Rima?", "¿Cuántas letras?"] },
        { q: "¿Qué forma usas para un fondo?", o: ["dibujaba", "dibujé", "he dibujado", "dibujaré"] },
        { q: "¿Cómo se organiza una exposición?", o: ["Inicio, medio y cierre", "Solo un cierre", "Solo ejemplos", "Lista sin orden"] },
      ],
      write: [
        "Cuenta tu ayer: una forma que cerró y un fondo.",
        "Escribe una oración con «había» y su pista.",
      ],
      schematic: [
        "Dibuja «Caminaba cuando sonó»: fondo y golpe.",
        "Dibuja un esquema: inicio, medio y cierre.",
      ],
    },
    image: [
      "Dibuja a alguien caminando por Cumaná",
      "y una campana que suena. Rotula",
      "«caminaba» como fondo y «sonó» como",
      "golpe; deja vacía la línea de tiempo.",
    ],
    summary: "Para contar cuándo pasa algo miras las pistas: ¿cerró?, ¿era fondo?, ¿llega a hoy?",
  },
];
