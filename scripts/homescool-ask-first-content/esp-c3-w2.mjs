/**
 * Español · ciclo 3 · semana 2 · nivel 6 — Ask First + metáfora de Venezuela.
 *
 * Tema: el verbo cuenta cuándo pasa algo.
 * Hito: Cumaná, fundada por los españoles en 1515 (estado Sucre): un pasado que sigue vivo en el presente.
 * d1 intro (una palabra / dos palabras) · d2 pasado cerrado y pasado que se alarga
 * · d3 haber + participio · d4 pistas de tiempo en un cuento · d5 repaso y exposición.
 */
export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "esp-c3-w2-d1",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "La semana pasada conociste nueve clases",
          "de palabras. Una es el verbo:",
          "la palabra que dice qué se hace.",
          "Hoy el verbo viaja a Cumaná contigo.",
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
          "El verbo dice qué pasa y cuándo pasa.",
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
          "De niña cantabas en Cumaná cada tarde.",
          "¿Cuántas formas de una palabra hay?",
        ],
        h: "Punto 4: Cinco formas con una palabra",
        a: [
          "Una palabra: canto / cantaba / canté /",
          "cantaré / cantaría.",
          "«Cantaba» es un pasado que se alarga.",
          "«Canté» es un pasado que ya cerró.",
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
          "(he cantado).",
          "«He» es el ayudante, de «haber».",
          "«Cantado» es el participio: la acción.",
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
        { q: "¿De qué verbo viene «he»?", o: ["haber", "hacer", "ir", "ser"] },
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
      "con ayer, hoy y mañana.",
      "Escribe «canté», «canto» y «cantaré»",
      "en su lugar y marca «he cantado».",
    ],
    summary: "El verbo cuenta cuándo pasa algo, como el pasado de Cumaná que sigue vivo hoy.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "esp-c3-w2-d2",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer viste que el verbo dice cuándo.",
          "La raíz se queda y el final cambia.",
          "Hoy volvemos a Cumaná, una ciudad",
          "con un pasado que sigue vivo.",
        ],
      },
      {
        q: [
          "Los españoles fundaron Cumaná en 1515.",
          "¿Ese hecho se cerró o se alargó?",
        ],
        h: "Punto 2: El pasado que cerró",
        a: [
          "«Fundaron» cierra el hecho: ya se acabó.",
          "Esa forma se llama pretérito.",
          "Su pista es «ayer» o «en 1515».",
        ],
      },
      {
        q: [
          "Un niño vivía en Cumaná y salía a jugar.",
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
          "Hoy dibujo el mapa de Cumaná.",
          "¿Cómo dices ayer y mañana?",
        ],
        h: "Punto 4: Una escena, tres formas",
        a: [
          "«Ayer dibujé el mapa»: ya lo terminé.",
          "«Dibujaba cada tarde»: se repetía.",
          "«Mañana dibujaré»: vendrá después.",
        ],
      },
      {
        q: [
          "Lees sobre Cumaná. ¿Cómo dices que ayer",
          "lo leíste y antes lo leías?",
        ],
        h: "Punto 5: Otros verbos hacen igual",
        a: [
          "Leer: «leí» cerró, «leía» se alargaba,",
          "«leeré» vendrá.",
          "Correr: corrí, corría, correré.",
        ],
      },
      {
        q: [
          "Un niño de Cumaná dice: «Jugué una hora»",
          "y «Jugaba cada tarde». ¿Cuál se repetía?",
        ],
        h: "Punto 6: ¿Cerró o se alargaba?",
        a: [
          "«Jugué una hora» cerró: tuvo final.",
          "«Jugaba cada tarde» se repetía.",
          "Pregúntate: ¿cerró o se alargaba?",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cómo se llama el pasado que cerró?", o: ["Pretérito", "Futuro", "Imperfecto", "Participio"] },
        { q: "¿Cómo se llama el pasado que se alarga?", o: ["Imperfecto", "Pretérito", "Futuro", "La raíz"] },
        { q: "¿Cuál forma cierra el hecho?", o: ["fundaron", "vivía", "dibujaba", "jugaba"] },
        { q: "¿Cuál forma pinta algo que duró?", o: ["vivía", "fundaron", "jugué", "leí"] },
        { q: "Completa: «Mañana ___ el mapa».", o: ["dibujaré", "dibujé", "dibujaba", "dibujo"] },
        { q: "¿Cuál forma de «leer» cerró?", o: ["leí", "leía", "leeré", "leo"] },
        { q: "¿Cuál oración se repetía?", o: ["Jugaba cada tarde.", "Jugué una hora.", "Jugaré mañana.", "He jugado."] },
        { q: "¿Qué pregunta te ayuda a elegir?", o: ["¿Cerró o se alargaba?", "¿Cuántas letras tiene?", "¿Es corta o larga?", "¿Rima con algo?"] },
      ],
      write: [
        "Escribe tres oraciones con «yo»: cerró, se alargó y vendrá.",
        "Cuenta por qué «Fundaron Cumaná en 1515» cerró.",
      ],
      schematic: [
        "Dibuja una línea con dibujé, dibujaba y dibujaré.",
        "Dibuja una tabla de leer y correr con tres formas.",
      ],
    },
    image: [
      "Dibuja tres escenas de Cumaná:",
      "ayer, de niño y mañana.",
      "Debajo escribe una oración con «yo»",
      "y subraya la raíz de cada verbo.",
    ],
    summary: "Una palabra dice si el hecho cerró, se alargaba o vendrá, como el pasado y el hoy de Cumaná.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "esp-c3-w2-d3",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer viste dos pasados: «fundaron»",
          "cerró y «vivía» se alargaba.",
          "Hoy sumamos un pasado que llega a hoy,",
          "como Cumaná.",
        ],
      },
      {
        q: [
          "Cumaná ha llegado hasta hoy.",
          "¿Cuántas palabras tiene «ha llegado»?",
        ],
        h: "Punto 2: Dos piezas que van juntas",
        a: [
          "«Ha» es «haber» conjugado: la ayudante.",
          "«Llegado» es el participio: la acción.",
          "Juntas cuentan un hecho ya hecho.",
        ],
      },
      {
        q: [
          "Paseas por Cumaná: «he cantado».",
          "¿Cómo armas el participio de «comer»?",
        ],
        h: "Punto 3: Cómo se arma el participio",
        a: [
          "Verbos en -ar: -ado. Cantar, cantado.",
          "Verbos en -er: -ido. Comer, comido.",
          "Con haber: he comido, has comido.",
        ],
      },
      {
        q: [
          "Ya comiste en Cumaná y te ofrecen más.",
          "¿Cómo dices que sigues lleno?",
        ],
        h: "Punto 4: «He comido» llega hasta hoy",
        a: [
          "«He comido» trae el resultado hasta hoy.",
          "Ya comiste y todavía estás lleno.",
          "Como Cumaná: nació antes y sigue hoy.",
        ],
      },
      {
        q: [
          "«Cuando llegué a Cumaná, mi amiga",
          "había salido». ¿Quién se fue primero?",
        ],
        h: "Punto 5: «Había salido» va antes",
        a: [
          "Primero salió ella; después llegaste tú.",
          "«Había salido» pasó antes que llegar.",
          "Es el pasado del pasado.",
        ],
      },
      {
        q: [
          "Una pregunta con truco:",
          "¿«hemos comidos» o «hemos comido»?",
        ],
        h: "Punto 6: El participio no cambia",
        a: [
          "Se dice «hemos comido».",
          "Cambia «haber»: he, has, hemos.",
          "El participio queda igual: comido.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuántas palabras tiene «ha llegado»?", o: ["Dos", "Una", "Tres", "Cuatro"] },
        { q: "En «ha llegado», ¿cuál ayuda?", o: ["ha", "llegado", "lleg-", "-ado"] },
        { q: "¿Cuál es el participio de «comer»?", o: ["comido", "comado", "comiendo", "comió"] },
        { q: "¿Cuál es el participio de «cantar»?", o: ["cantado", "cantido", "cantando", "cantó"] },
        { q: "¿Qué cuenta «he comido»?", o: ["Un hecho que llega a hoy", "Un pasado muy lejano", "Algo que nunca pasó", "Una orden"] },
        { q: "En «había salido», ¿qué fue primero?", o: ["Salir ella", "Llegar tú", "Las dos a la vez", "Ninguna"] },
        { q: "¿Cuál se dice bien?", o: ["Hemos comido.", "Hemos comidos.", "Hemos comida.", "Hemos comiendo."] },
        { q: "En «he, has, hemos», ¿qué cambia?", o: ["La forma de haber", "El participio", "Todo", "Nada"] },
      ],
      write: [
        "Escribe he, has y hemos con el participio «comido».",
        "Cuenta por qué se dice «hemos comido».",
      ],
      schematic: [
        "Dibuja «ha llegado» y señala el ayudante y el participio.",
        "Dibuja una línea con «había salido» antes de «llegué».",
      ],
    },
    image: [
      "Dibuja una casa en Cumaná y a tu amiga",
      "saliendo por la puerta.",
      "Dibújate llegando después y escribe",
      "«había salido» con una flecha de orden.",
    ],
    summary: "Haber más participio cuenta un hecho que llega a hoy. Cambia haber; el participio no.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "esp-c3-w2-d4",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer viste «he comido» y «había salido».",
          "Dos palabras: haber y participio.",
          "Hoy buscamos pistas de tiempo en un",
          "cuento que pasa en Cumaná.",
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
          "Quieres saber cuándo llegó tu amigo.",
          "¿Cómo lo preguntas? ¿Y cómo lo gritas?",
        ],
        h: "Punto 4: Preguntar y exclamar el tiempo",
        a: [
          "Preguntas: «¿Cuándo llegaste a Cumaná?»",
          "Exclamas: «¡Ya he llegado!»",
          "Los signos se abren y se cierran.",
        ],
      },
      {
        q: [
          "Completa: «Cuando llegué, mi amiga",
          "___ salido». ¿«ha», «había» o «habrá»?",
        ],
        h: "Punto 5: Lo anterior a otro pasado",
        a: [
          "Pones «había»: ella ya había salido.",
          "Salir pasó antes que llegar.",
          "La pista es «cuando llegué».",
        ],
      },
      {
        q: [
          "Vas a elegir una forma.",
          "¿Qué te preguntas antes de decidir?",
        ],
        h: "Punto 6: Tres preguntas para elegir",
        a: [
          "¿Cerró? Usa «terminé».",
          "¿Sigue vivo hoy? Usa «he terminado».",
          "¿Era fondo? Usa «terminaba».",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "En «Ayer terminé», ¿qué dice «ayer»?", o: ["El hecho cerró", "Sigue vivo hoy", "Es un fondo", "Es una orden"] },
        { q: "¿Qué palabra trae el resultado a hoy?", o: ["Ya", "Ayer", "Cuando", "Mañana"] },
        { q: "En la campana, ¿cuál verbo es el fondo?", o: ["Caminaba", "Sonó", "Campana", "Cuando"] },
        { q: "En ese cuento, ¿cuál verbo es el golpe?", o: ["Sonó", "Caminaba", "Cuando", "Por"] },
        { q: "Cuando llegué, ella ___ salido.", o: ["había", "ha", "hemos", "habrá"] },
        { q: "¿Cuál pregunta está bien escrita?", o: ["¿Cuándo llegaste a Cumaná?", "Cuándo llegaste a Cumaná?", "¿Cuándo llegaste a Cumaná", "Cuándo llegaste a Cumaná"] },
        { q: "¿Qué pregunta ayuda a elegir «terminé»?", o: ["¿Cerró el hecho?", "¿Cuántas letras tiene?", "¿Es larga la palabra?", "¿Rima con algo?"] },
        { q: "¿Qué forma usas para un fondo?", o: ["terminaba", "terminé", "he terminado", "terminaré"] },
      ],
      write: [
        "Escribe tres oraciones sobre tu ayer: cerró, fondo y hoy.",
        "Escribe una pregunta y una exclamación sobre el tiempo.",
      ],
      schematic: [
        "Dibuja un esquema con las tres preguntas para elegir.",
        "Dibuja «Caminaba cuando sonó» con fondo y golpe.",
      ],
    },
    image: [
      "Dibuja a alguien caminando por Cumaná",
      "y una campana que suena.",
      "Rotula «caminaba» como fondo",
      "y «sonó» como golpe.",
    ],
    summary: "Para elegir miras las pistas: ¿cerró?, ¿sigue vivo hoy?, ¿era fondo? Así cuentas bien cuándo pasa.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "esp-c3-w2-d5",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer buscaste pistas: ayer, ya y cuando.",
          "Viste el fondo y el golpe de un cuento.",
          "Hoy lo ordenas todo para contarlo,",
          "como se cuenta la historia de Cumaná.",
        ],
      },
      {
        q: [
          "Sin mirar: ¿qué cinco formas de «cantar»",
          "dicen cuándo con una sola palabra?",
        ],
        h: "Punto 2: Las formas de una palabra",
        a: [
          "Una palabra: canto / cantaba / canté /",
          "cantaré / cantaría.",
          "«Canté» cerró; «cantaba» se alargó.",
        ],
      },
      {
        q: [
          "¿Y cuándo usas dos palabras?",
          "¿Cuáles son?",
        ],
        h: "Punto 3: Las formas de dos palabras",
        a: [
          "Dos palabras: haber + participio",
          "(he cantado).",
          "Cambia «haber»: he, has, hemos, había.",
          "El participio queda igual.",
        ],
      },
      {
        q: [
          "Lee: «Fundaron Cumaná en 1515.",
          "Hoy sigue allí.» ¿Cuál forma cerró?",
        ],
        h: "Punto 4: Pasado y presente en Cumaná",
        a: [
          "«Fundaron» cerró: la pista es «en 1515».",
          "«Sigue» habla de hoy.",
          "«Ha llegado» une el pasado con hoy.",
        ],
      },
      {
        q: [
          "Vas a contarle a alguien lo aprendido.",
          "¿Cómo empiezas para que te entienda?",
        ],
        h: "Punto 5: Cómo contarlo con orden",
        a: [
          "Tiene inicio, medio y cierre.",
          "Inicio: «Hoy cuento cuándo pasa algo».",
          "Medio: ejemplos de una y dos palabras.",
          "Cierre: repite la regla y da gracias.",
        ],
      },
      {
        q: [
          "Ahora cuenta tu ayer. ¿Cómo usas una",
          "forma de cada tipo?",
        ],
        h: "Punto 6: Elegir bien, no solo recordar",
        a: [
          "«Ayer dibujé Cumaná».",
          "«Dibujaba cuando sonó la campana».",
          "«Ya he guardado mis lápices».",
          "Cada una dice cuándo pasa algo.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuántas formas de una palabra viste?", o: ["Cinco", "Dos", "Tres", "Nueve"] },
        { q: "¿Cuál forma de una palabra es futuro?", o: ["cantaré", "canté", "cantaba", "canto"] },
        { q: "¿De qué se arma «he cantado»?", o: ["Haber y participio", "Raíz y final", "Nombre y verbo", "Artículo y adjetivo"] },
        { q: "En «he, has, hemos», ¿qué cambia?", o: ["La forma de haber", "El participio", "Todo", "Nada"] },
        { q: "¿Cuál es la pista de «fundaron»?", o: ["En 1515", "Hoy", "Ya", "Cuando"] },
        { q: "¿Qué oración llega hasta hoy?", o: ["Ya he guardado mis lápices.", "Ayer dibujé Cumaná.", "Dibujaba cuando sonó.", "Mañana dibujaré."] },
        { q: "¿Cómo se organiza una exposición?", o: ["Inicio, medio y cierre", "Solo un cierre", "Solo ejemplos", "Lista sin orden"] },
        { q: "¿Qué forma une el pasado con hoy?", o: ["ha llegado", "fundaron", "canté", "cantaba"] },
      ],
      write: [
        "Escribe de memoria las cinco formas de «cantar».",
        "Cuenta tu ayer con una forma de una palabra y una de dos.",
      ],
      schematic: [
        "Dibuja un esquema con formas de una y dos palabras.",
        "Dibuja una línea del tiempo con tres formas y su ejemplo.",
      ],
    },
    image: [
      "Dibuja Cumaná y una línea del tiempo",
      "con ayer, ya y mañana.",
      "Escribe una forma de «cantar» en cada",
      "momento y marca «he cantado».",
    ],
    summary: "Contaste cuándo pasa algo con una palabra o con haber más participio, como el pasado vivo de Cumaná.",
  },
];
