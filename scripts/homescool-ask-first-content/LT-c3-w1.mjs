/**
 * Línea de tiempo · ciclo 3 · semana 1 · nivel 6 — narrativa inductiva, todo "pregunta primero".
 *
 * Pregunta -> espacio para responder -> respuesta debajo ("Punto N: ...") -> el niño la copia.
 * Hechos tomados de la celda viva: línea de tiempo, hito, mapa vs. línea, dos fuentes
 * (historia antigua y relato de Génesis), Babel, sumerios (Tigris y Éufrates), otros pueblos.
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "LT-c3-w1-d1",
    opening: "¿Cómo sabrías qué pasó primero y qué pasó después?",
    repaso: null,
    units: [
      {
        h: "Punto 1: Una línea de tiempo pone orden",
        a: [
          "Una línea de tiempo pone los hechos en orden.",
          "Primero va lo más antiguo y después lo más reciente.",
          "Es como una fila: cada hecho espera su turno.",
          "Así no se mezcla lo que pasó antes con lo de después.",
        ],
      },
      {
        q: [
          "Tienes dos fotos de tu abuelo: de niño y de señor mayor.",
          "¿Cuál pondrías primero en la línea?",
        ],
        h: "Punto 2: Los hitos",
        a: [
          "Va primero la foto del abuelo de niño.",
          "Cada foto marca un momento importante de su vida.",
          "Un hito es un hecho importante que ayuda a recordar",
          "una época. En la línea, cada hito tiene su lugar.",
        ],
      },
      {
        q: [
          "Sigamos. ¿Qué crees que muestra un mapa?",
          "¿Y qué muestra una línea de tiempo?",
        ],
        h: "Punto 3: El mapa y la línea",
        a: [
          "El mapa muestra dónde pasó algo.",
          "La línea de tiempo muestra cuándo pasó.",
          "Con los dos no confundimos lugares lejanos",
          "con una sola historia mezclada.",
        ],
      },
      {
        q: [
          "Esta semana leeremos historia de pueblos antiguos y el",
          "libro de Génesis. ¿Crees que se anotan igual?",
        ],
        h: "Punto 4: Dos clases de información",
        a: [
          "No se anotan igual: son fuentes distintas.",
          "La historia antigua estudia pueblos del Mediterráneo",
          "y del Cercano Oriente.",
          "Génesis es el primer libro de la Biblia: un relato.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿pondrías un hecho de historia",
          "y un capítulo de la Biblia en el mismo punto?",
        ],
        h: "Punto 5: Cada fuente con su etiqueta",
        a: [
          "No. Los marcamos con etiquetas distintas:",
          "«historia» y «Génesis».",
          "Orden antiguo: primero el relato, después el mapa.",
          "Recuerda: Babel, sumerios (Tigris y Éufrates),",
          "y otros pueblos del mundo antiguo.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Para qué sirve una línea de tiempo?", o: ["Para poner los hechos en orden", "Para medir la temperatura", "Para dibujar solo mapas", "Para contar animales"] },
        { q: "¿Qué va primero en una línea de tiempo?", o: ["Lo más antiguo", "Lo más reciente", "Lo más grande", "Lo más lejano"] },
        { q: "¿Qué es un hito?", o: ["Un hecho importante de una época", "El nombre de un río", "Una montaña muy alta", "Un dibujo sin orden"] },
        { q: "¿Qué muestra un mapa?", o: ["Dónde pasó algo", "Cuándo pasó algo", "Quién lo escribió", "Cuánto duró"] },
        { q: "¿Qué muestra la línea de tiempo?", o: ["Cuándo pasó algo", "Dónde queda un río", "Cuántos años tienes", "Qué hora es"] },
        { q: "¿Qué es Génesis?", o: ["El primer libro de la Biblia", "Un pueblo antiguo", "Un río de Asia", "Un mapa del mundo"] },
        { q: "¿Cómo anotamos historia y Génesis?", o: ["Con etiquetas distintas", "En un solo punto", "Sin ninguna etiqueta", "Con el mismo dibujo"] },
        { q: "¿Qué nombres recordamos de esta semana?", o: ["Babel y los sumerios", "Pirámides y faraones", "Reyes y castillos", "Barcos y piratas"] },
      ],
      write: [
        "Escribe qué va primero y qué va después en tu día de ayer.",
        "Explica con tus palabras qué es un hito.",
      ],
      schematic: [
        "Dibuja una línea de tiempo con tres hitos de tu vida.",
        "Dibuja dos cajas: una «historia» y otra «Génesis».",
      ],
    },
    image: [
      "Dibuja una línea con dos hitos de tu vida.",
      "Rotula cada hito con una etiqueta corta.",
      "Pon primero el más antiguo y después el más reciente.",
      "Revisa que tu línea se lea de primero a después.",
    ],
    summary: "Una línea de tiempo pone los hechos en orden y el mapa dice dónde pasaron; la historia y Génesis llevan etiquetas distintas.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "LT-c3-w1-d2",
    opening: ayer,
    repaso: [
      "Ayer vimos que una línea de tiempo pone los hechos en orden.",
      "Un hito es un hecho importante de una época.",
      "El mapa dice dónde y la línea dice cuándo.",
    ],
    units: [
      {
        q: [
          "Dos amigos te cuentan algo del pasado: uno lo leyó en un",
          "libro de historia y el otro, en la Biblia. ¿Es igual?",
        ],
        h: "Punto 1: Las fuentes",
        a: [
          "No es igual: vienen de fuentes distintas.",
          "Una fuente es el lugar de donde viene lo que sabemos.",
          "La historia antigua estudia a los pueblos del pasado.",
          "Génesis es un relato bíblico.",
        ],
      },
      {
        q: [
          "Imagina dos rieles de tren, uno al lado del otro.",
          "¿Para qué nos servirían dos líneas en la línea de tiempo?",
        ],
        h: "Punto 2: Dos líneas paralelas",
        a: [
          "Una línea es «historia antigua» y la otra es «Génesis».",
          "Van lado a lado, pero no se mezclan.",
          "Cada hito va en la línea de su fuente.",
        ],
      },
      {
        q: [
          "Génesis cuenta cómo Dios creó el mundo. ¿Qué otro",
          "gran hecho cuenta dentro del mismo relato?",
        ],
        h: "Punto 3: Creación y caída",
        a: [
          "La creación: Dios hizo el mundo y todo lo que hay en él.",
          "La caída nombra la entrada del pecado en el mundo.",
          "Son dos hitos de la línea de Génesis.",
        ],
      },
      {
        q: [
          "Ahora piensa en un lugar. «Mesopotamia» significa",
          "«tierra entre ríos». ¿Qué ríos crees que son?",
        ],
        h: "Punto 4: Mesopotamia en el mapa",
        a: [
          "Son el Tigris y el Éufrates.",
          "Mesopotamia queda en el Cercano Oriente.",
          "Es un lugar del mapa de la historia antigua.",
          "Búscala entre sus dos ríos y no te perderás.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: la caída, ¿va en la línea de",
          "historia antigua o en la línea de Génesis?",
        ],
        h: "Punto 5: Cada hito en su línea",
        a: [
          "Va en la línea de Génesis, porque viene de ese relato.",
          "Mesopotamia va en la línea de historia antigua.",
          "Así nunca mezclamos fecha histórica con capítulo bíblico.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es una fuente?", o: ["El lugar de donde viene lo que sabemos", "Un tipo de mapa", "Un río grande", "Un dibujo con color"] },
        { q: "¿Qué estudia la historia antigua?", o: ["A los pueblos del pasado", "Solo animales", "El clima de hoy", "Los números"] },
        { q: "¿Cómo son las dos líneas de la clase de hoy?", o: ["Paralelas", "Cruzadas", "Iguales", "Redondas"] },
        { q: "¿Qué nombra la caída en Génesis?", o: ["La entrada del pecado", "Un río de Asia", "Un pueblo antiguo", "Un tipo de mapa"] },
        { q: "¿Qué significa «Mesopotamia»?", o: ["Tierra entre ríos", "Tierra de montañas", "Mar de arena", "Isla grande"] },
        { q: "¿Qué ríos rodean Mesopotamia?", o: ["El Tigris y el Éufrates", "El Nilo y el Indo", "El Amazonas y el Orinoco", "El Rin y el Danubio"] },
        { q: "¿En qué línea va la caída?", o: ["En la de Génesis", "En la de historia antigua", "En ninguna línea", "En las dos a la vez"] },
        { q: "¿Por qué usamos dos líneas paralelas?", o: ["Para no mezclar las fuentes", "Para gastar más papel", "Para dibujar más río", "Para contar rápido"] },
      ],
      write: [
        "Explica qué es una fuente con un ejemplo tuyo.",
        "Escribe un hito de Génesis y uno de historia antigua.",
      ],
      schematic: [
        "Dibuja dos líneas paralelas: «historia antigua» y «Génesis».",
        "Dibuja un mapa sencillo de Mesopotamia con sus dos ríos.",
      ],
    },
    image: [
      "Dibuja dos líneas paralelas, una sobre otra.",
      "Rotula la de arriba «historia antigua».",
      "Rotula la de abajo «Génesis» y marca un hito en cada una.",
      "Revisa que ningún hito esté en las dos a la vez.",
    ],
    summary: "Usamos dos líneas paralelas, historia antigua y Génesis, para no mezclar fuentes; Mesopotamia queda entre el Tigris y el Éufrates.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "LT-c3-w1-d3",
    opening: ayer,
    repaso: [
      "Ayer dibujaste dos líneas paralelas: historia y Génesis.",
      "Cada hito va en la línea de su fuente.",
      "Mesopotamia queda entre el Tigris y el Éufrates.",
    ],
    units: [
      {
        q: [
          "Hoy hay dos nombres nuevos: Babel y los sumerios.",
          "¿Crees que son lo mismo?",
        ],
        h: "Punto 1: Babel y los sumerios",
        a: [
          "No los mezclamos: vienen de fuentes distintas.",
          "Babel aparece en el relato de Génesis.",
          "Los sumerios se estudian con historia y con el mapa.",
          "Cada uno va en su línea.",
        ],
      },
      {
        q: [
          "Los sumerios fueron un pueblo. ¿Dónde crees que vivían?",
          "Pista: entre dos ríos.",
        ],
        h: "Punto 2: Dónde vivían los sumerios",
        a: [
          "Vivían en Mesopotamia, entre el Tigris y el Éufrates.",
          "Un pueblo es una comunidad con costumbres y lengua propia.",
          "Los sumerios escribían con marcas de cuña sobre barro.",
          "Esa escritura se llama cuneiforme.",
        ],
      },
      {
        q: [
          "Haz una ficha de Babel. ¿Qué dos cosas escribirías:",
          "una frase y qué más?",
        ],
        h: "Punto 3: La ficha de Babel",
        a: [
          "La ficha lleva una frase y la etiqueta de fuente.",
          "Frase: el relato cuenta de una ciudad y una torre.",
          "También cuenta que las lenguas se volvieron distintas.",
          "Etiqueta: «Génesis».",
        ],
      },
      {
        q: [
          "Ahora la ficha de los sumerios. ¿Qué etiqueta lleva?",
          "¿Y qué frase pondrías?",
        ],
        h: "Punto 4: La ficha de los sumerios",
        a: [
          "Frase: los sumerios vivieron en Mesopotamia.",
          "Etiqueta: «historia».",
          "Puedes añadir un dibujo pequeño de los dos ríos.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿Babel es solo una ciudad de los",
          "sumerios? ¿O la lección la presenta de otra manera?",
        ],
        h: "Punto 5: No mezclar",
        a: [
          "La lección presenta a Babel como un relato de Génesis.",
          "No decimos que Babel «es» una ciudad sumeria.",
          "Si los pones juntos, explica por qué.",
          "Si no puedes explicarlo, ponlos en pistas separadas.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Dónde aparece Babel?", o: ["En el relato de Génesis", "En un mapa de ríos", "En una tabla de números", "En un libro de cocina"] },
        { q: "¿Cómo se estudian los sumerios?", o: ["Con historia y con el mapa", "Solo con un cuento", "Con una canción", "Con un juego"] },
        { q: "¿Dónde vivían los sumerios?", o: ["En Mesopotamia", "En una isla", "En el desierto del Sahara", "En la selva"] },
        { q: "¿Entre qué ríos vivían los sumerios?", o: ["Tigris y Éufrates", "Nilo y Congo", "Orinoco y Amazonas", "Rin y Sena"] },
        { q: "¿Cómo se llama la escritura sumeria?", o: ["Cuneiforme", "Alfabeto latino", "Dibujo animado", "Código postal"] },
        { q: "¿Qué lleva una ficha?", o: ["Una frase y la etiqueta de fuente", "Solo un número", "Solo un color", "Un nombre sin frase"] },
        { q: "¿Qué etiqueta lleva la ficha de Babel?", o: ["Génesis", "Historia", "Mapa", "Río"] },
        { q: "¿Qué etiqueta lleva la ficha de los sumerios?", o: ["Historia", "Génesis", "Torre", "Lengua"] },
      ],
      write: [
        "Escribe la frase y la etiqueta de tu ficha de Babel.",
        "Explica por qué Babel y los sumerios van en pistas distintas.",
      ],
      schematic: [
        "Dibuja las fichas de Babel y de los sumerios, lado a lado.",
        "Dibuja un mapa con el Tigris, el Éufrates y Mesopotamia.",
      ],
    },
    image: [
      "Dibuja dos fichas pequeñas, una al lado de la otra.",
      "En una escribe «Babel» y su etiqueta.",
      "En la otra escribe «sumerios» y su etiqueta.",
      "Añade un dibujo pequeño de los dos ríos.",
    ],
    summary: "Babel viene del relato de Génesis y los sumerios, de la historia y el mapa de Mesopotamia; cada uno va en su pista.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "LT-c3-w1-d4",
    opening: ayer,
    repaso: [
      "Ayer hiciste fichas de Babel y de los sumerios.",
      "Cada ficha lleva una frase y su etiqueta de fuente.",
      "Babel fue de Génesis y los sumerios fueron de historia.",
    ],
    units: [
      {
        q: [
          "Tu línea tiene solo dos nombres. ¿Qué harías para que",
          "cuente la historia del mundo antiguo?",
        ],
        h: "Punto 1: Más pueblos en la línea",
        a: [
          "Añadiría otros pueblos del mundo antiguo.",
          "Cada pueblo nuevo se coloca en la línea y en el mapa.",
          "Así la línea cuenta más de lo que pasó en el mundo.",
        ],
      },
      {
        q: [
          "Mira el mapa. ¿Dónde crees que quedan Egipto, India,",
          "Creta y Grecia?",
        ],
        h: "Punto 2: Cuatro lugares en el mapa",
        a: [
          "Egipto queda en África, junto al río Nilo.",
          "India queda en el sur de Asia.",
          "Creta es una isla del mar Mediterráneo.",
          "Grecia queda en el sur de Europa.",
        ],
      },
      {
        q: [
          "Llega un pueblo nuevo a tu línea. ¿Qué dos preguntas",
          "te harías sobre su lugar en el tiempo?",
        ],
        h: "Punto 3: Antes o después",
        a: [
          "Pregunta: ¿va antes o después de lo que ya marqué?",
          "Eso se llama orden relativo.",
          "Los sumerios existieron mucho antes que los griegos.",
          "Sin ese orden, los nombres quedan amontonados.",
        ],
      },
      {
        q: [
          "Y en el mapa, ¿qué preguntarías?",
          "Pista: no es sobre el tiempo, es sobre el lugar.",
        ],
        h: "Punto 4: Cerca o lejos",
        a: [
          "Pregunta: ¿queda cerca o lejos de lo que ya marqué?",
          "Creta y Grecia están cerca, en el Mediterráneo.",
          "India y Egipto están lejos una de la otra.",
          "El mapa muestra dónde; la línea muestra cuándo.",
        ],
      },
      {
        q: [
          "Quieres leer tu línea en voz alta. ¿Qué tres cosas",
          "contarías sobre la semana?",
        ],
        h: "Punto 5: Resumir en tres frases",
        a: [
          "Primera: qué es una línea de tiempo.",
          "Segunda: por qué hay pistas distintas.",
          "Tercera: un ejemplo, Babel o los sumerios.",
          "Léelas despacio, con la voz clara.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué hacemos con un pueblo nuevo?", o: ["Lo colocamos en la línea y en el mapa", "Lo borramos", "Lo escondemos", "Lo mezclamos con Babel"] },
        { q: "¿Dónde queda Egipto?", o: ["En África, junto al Nilo", "En Europa", "En una isla", "En América"] },
        { q: "¿Qué es Creta?", o: ["Una isla del Mediterráneo", "Un río de Asia", "Un pueblo sumerio", "Una montaña de Egipto"] },
        { q: "¿Dónde queda India?", o: ["En el sur de Asia", "En el norte de África", "En el sur de Europa", "En Mesopotamia"] },
        { q: "¿Qué pregunta hacemos para el tiempo?", o: ["¿Va antes o después?", "¿De qué color es?", "¿Cuánto pesa?", "¿Cómo suena?"] },
        { q: "¿Qué pregunta hacemos para el mapa?", o: ["¿Queda cerca o lejos?", "¿Cuántos años tiene?", "¿Quién lo cuenta?", "¿Cuál es su sabor?"] },
        { q: "¿Quiénes existieron mucho antes que los griegos?", o: ["Los sumerios", "Los astronautas", "Los piratas", "Los vikingos"] },
        { q: "¿Qué lleva el resumen de la semana?", o: ["Tres frases", "Un solo número", "Diez dibujos", "Una canción"] },
      ],
      write: [
        "Escribe tu resumen de tres frases sobre la semana.",
        "Explica qué significa «antes o después» en la línea.",
      ],
      schematic: [
        "Dibuja un mapa con Egipto, India, Creta y Grecia.",
        "Dibuja una línea con Babel, sumerios y un pueblo nuevo.",
      ],
    },
    image: [
      "Dibuja un mapa sencillo con cuatro lugares.",
      "Rotula Egipto, India, Creta y Grecia.",
      "Debajo dibuja una línea con un pueblo nuevo.",
      "Revisa que cada nombre esté en su lugar.",
    ],
    summary: "Cada pueblo nuevo se coloca en la línea (antes o después) y en el mapa (cerca o lejos), y la semana se cuenta en tres frases.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "LT-c3-w1-d5",
    opening: ayer,
    repaso: [
      "Esta semana ordenaste relatos y pueblos antiguos.",
      "Usaste una línea de tiempo y un mapa a la vez.",
      "Hoy lo recuerdas y se lo cuentas a alguien.",
    ],
    units: [
      {
        q: [
          "Sin mirar nada, ¿qué es una línea de tiempo",
          "y qué es un hito?",
        ],
        w: 3,
        h: "Punto 1: La línea y el hito",
        a: [
          "Una línea de tiempo ordena los hitos.",
          "Un hito es un hecho importante de una época.",
          "El mapa muestra el lugar sin mezclar las fuentes.",
        ],
      },
      {
        q: [
          "¿Por qué la historia antigua y Génesis no se ponen",
          "en el mismo punto de la línea?",
        ],
        h: "Punto 2: Dos tipos de información",
        a: [
          "Son dos fuentes distintas.",
          "Una estudia pueblos del Cercano Oriente.",
          "La otra es el relato de Génesis.",
          "Por eso llevan etiquetas y pistas separadas.",
        ],
      },
      {
        q: [
          "¿Qué nombres de la semana recuerdas? ¿Y en qué",
          "pista pondrías cada uno?",
        ],
        h: "Punto 3: Babel y los sumerios",
        a: [
          "Babel va en la pista de Génesis.",
          "Los sumerios van en la pista de historia.",
          "Vivieron en Mesopotamia, entre el Tigris y el Éufrates.",
          "Después vinieron más pueblos, como Egipto y Grecia.",
        ],
      },
      {
        q: [
          "Vas a contarle esto a tu familia.",
          "¿Cómo lo dirías para que se entienda?",
        ],
        h: "Punto 4: Cómo contarlo con orden",
        a: [
          "Orden antiguo: primero el relato, después el mapa.",
          "Recuerda: Babel, sumerios (Tigris y Éufrates),",
          "y otros pueblos del mundo antiguo.",
          "Inicio: la línea. Medio: un ejemplo. Cierre: el mapa.",
        ],
      },
      {
        q: [
          "¿Basta con repetir una lista de nombres?",
          "¿Qué más necesitas saber de cada uno?",
        ],
        h: "Punto 5: Saber de dónde viene cada dato",
        a: [
          "No basta con la lista de nombres.",
          "Hay que saber de qué fuente viene cada uno.",
          "Pregúntate: ¿qué sé de este hito y de dónde viene?",
          "Así explicas el orden y no solo repites nombres.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué hace una línea de tiempo?", o: ["Ordena los hitos", "Mide ríos", "Pinta mapas", "Cuenta pueblos"] },
        { q: "¿Qué muestra el mapa en esta semana?", o: ["El lugar de cada pueblo", "La hora del día", "El precio del pan", "El clima de hoy"] },
        { q: "¿Por qué hay etiquetas distintas?", o: ["Porque son fuentes distintas", "Porque sobran colores", "Porque da igual", "Porque es más corto"] },
        { q: "¿En qué pista va Babel?", o: ["En la de Génesis", "En la de historia", "En la de ríos", "En ninguna"] },
        { q: "¿En qué pista van los sumerios?", o: ["En la de historia", "En la de Génesis", "En la de la torre", "En ninguna"] },
        { q: "¿Entre qué ríos vivían los sumerios?", o: ["Tigris y Éufrates", "Nilo e Indo", "Orinoco y Caroní", "Sena y Rin"] },
        { q: "¿Qué va primero en el orden antiguo?", o: ["El relato", "El mapa", "La torre", "El resumen"] },
        { q: "¿Basta con repetir una lista de nombres?", o: ["No, hay que saber la fuente", "Sí, basta con eso", "Sí, si es rápido", "No, hay que cantarla"] },
      ],
      write: [
        "Cuenta con tus palabras qué aprendiste esta semana.",
        "Explica por qué Babel y los sumerios van en pistas distintas.",
      ],
      schematic: [
        "Dibuja las dos pistas con Babel, sumerios y un pueblo más.",
        "Dibuja un mapa con Mesopotamia y sus dos ríos.",
      ],
    },
    image: [
      "Dibuja una línea con tres hitos de la semana.",
      "Pon la etiqueta de fuente en cada uno.",
      "Debajo dibuja un mapa pequeño de Mesopotamia.",
      "Revisa que el orden se lea de primero a después.",
    ],
    summary: "La semana fue ordenar: la línea dice cuándo, el mapa dice dónde, y cada dato lleva su fuente.",
  },
];
