/**
 * Inglés · ciclo 3 · semana 1 · nivel 6 — verbos del español: familias -ar, -er, -ir (v3, 3 días).
 * Hito de Venezuela: Los tres senderos del Ávila (tres caminos hacia la misma cima).
 * Datos seguros usados: el Ávila separa Caracas del mar; se sube por distintos senderos.
 * d1 = panorama de los tres senderos · d2 = -ar y -er más de cerca · d3 = -ir, los tres juntos y contarlo.
 * Formato "Ask First" (ver BRIEF.md y GOLD.example.mjs).
 */
export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "ing-c3-w1-d1",
    units: [
      {
        h: "Punto 1: Repaso de la clase pasada",
        a: [
          "Ya sabes que hay palabras de acción:",
          "cantar, comer, vivir. Son verbos.",
          "Hoy subimos el Ávila con ellos.",
        ],
      },
      {
        q: [
          "El Ávila separa Caracas del mar.",
          "¿Por qué «yo canto» pero «tú cantas»?",
        ],
        h: "Punto 2: El verbo cambia con quien actúa",
        a: [
          "Un verbo dice una acción: cantar, subir.",
          "Si cambia quien actúa, cambia el final.",
          "Cambiar el verbo así se llama conjugar.",
        ],
      },
      {
        q: [
          "Quita «-ar» de «cantar». ¿Qué parte",
          "queda quieta, como la cima del Ávila?",
        ],
        h: "Punto 3: La raíz y la terminación",
        a: [
          "«Cantar» es el infinitivo: el verbo",
          "como lo trae el diccionario.",
          "Sin «-ar» queda «cant-»: la raíz.",
          "La raíz es la cima. El final cambia.",
        ],
      },
      {
        q: [
          "Hay muchos senderos para subir el Ávila.",
          "¿Cuántas familias de verbos hay?",
        ],
        h: "Punto 4: Tres familias, tres senderos",
        a: [
          "Hay tres familias, según cómo termina",
          "el infinitivo: -ar, -er e -ir.",
          "Cada familia es un sendero del Ávila.",
        ],
      },
      {
        q: [
          "Sube un verbo por cada sendero.",
          "¿Cómo dices yo, tú y él con ellos?",
        ],
        h: "Punto 5: Un verbo en cada sendero",
        a: [
          "-ar (cantar → canto, cantas, canta),",
          "-er (comer → como, comes, come),",
          "-ir (vivir → vivo, vives, vive).",
        ],
      },
      {
        q: [
          "Una pregunta con truco: en los tres",
          "senderos, ¿cambia la raíz o el final?",
        ],
        h: "Punto 6: Una cima, tres senderos",
        a: [
          "Cambia el final, no la raíz.",
          "Las tres familias llegan a la misma",
          "cima: la raíz que se queda quieta.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué dice un verbo?", o: ["Una acción", "Un lugar", "Un color", "Un número"] },
        { q: "¿Qué es conjugar un verbo?", o: ["Cambiar su final", "Escribirlo más grande", "Quitarle la raíz", "Traducirlo al inglés"] },
        { q: "¿Qué es «cantar»?", o: ["El infinitivo", "Una raíz", "Una terminación", "Un pronombre"] },
        { q: "Sin «-ar», ¿qué raíz tiene «cantar»?", o: ["cant-", "canta", "cantar", "-ar"] },
        { q: "¿Cómo se dice «cantar» con tú?", o: ["cantas", "canto", "canta", "cantar"] },
        { q: "¿Cómo se dice «comer» con yo?", o: ["como", "comes", "come", "comer"] },
        { q: "¿Cómo se dice «vivir» con él?", o: ["vive", "vives", "vivo", "vivir"] },
        { q: "¿Cuántas familias de verbos hay?", o: ["Tres", "Dos", "Cuatro", "Nueve"] },
      ],
      write: [
        "Escribe yo, tú y él con «hablar».",
        "Explica con tus palabras qué es la raíz.",
      ],
      schematic: [
        "Dibuja un esquema: raíz «cant-» y tres finales.",
        "Dibuja el Ávila con tres senderos y una cima.",
      ],
    },
    image: [
      "Dibuja el cerro Ávila con tres senderos",
      "que suben hacia la misma cima. Rotula",
      "cada sendero: -ar, -er e -ir. Deja un",
      "espacio para escribir un verbo en cada uno.",
    ],
    summary: "En los tres senderos del Ávila el verbo cambia su final, pero su raíz es la cima que no cambia.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "ing-c3-w1-d2",
    title: "Spanish -ar and -er verbs",
    units: [
      {
        h: "Punto 1: Repaso de la clase pasada",
        a: [
          "La clase pasada viste tres senderos",
          "del Ávila: -ar, -er e -ir. El verbo",
          "cambia su final y la raíz se queda.",
        ],
      },
      {
        q: [
          "En el sendero «-ar» sube «cantar».",
          "¿Qué finales usan yo, tú y él?",
        ],
        h: "Punto 2: Los tres finales de -ar",
        a: [
          "Se dice: yo canto, tú cantas, él canta.",
          "Los finales son -o, -as y -a.",
          "Todos los «-ar» usan estos tres finales.",
        ],
      },
      {
        q: [
          "Por el mismo sendero suben «hablar»",
          "y «bailar». ¿Cuál es su raíz?",
        ],
        h: "Punto 3: La misma regla con otros verbos",
        a: [
          "La raíz de «hablar» es «habl-».",
          "La de «bailar» es «bail-».",
          "Cambian las raíces, pero los finales",
          "son los mismos: -o, -as y -a.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: en el sendero,",
          "¿se dice «yo cantaro» o «yo canto»?",
        ],
        h: "Punto 4: Primero quita, luego añade",
        a: [
          "Se dice «yo canto».",
          "Primero quita «-ar» y luego añade",
          "el final: «cant-» más «-o» es «canto».",
        ],
      },
      {
        q: [
          "Ahora camina el sendero «-er» con «comer».",
          "¿Qué raíz queda y qué finales lleva?",
        ],
        h: "Punto 5: El sendero -er",
        a: [
          "Al quitar «-er» queda la raíz «com-».",
          "Se dice: yo como, tú comes, él come.",
          "Los finales son -o, -es y -e.",
        ],
      },
      {
        q: [
          "También caminan «beber» y «leer».",
          "¿Se dice «tú comas» o «tú comes»?",
        ],
        h: "Punto 6: Otros verbos «-er»",
        a: [
          "Se dice «tú comes»: tú termina en «-es».",
          "Y también: bebo, bebes, bebe",
          "y leo, lees, lee.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "En «canto», ¿qué raíz se queda?", o: ["cant-", "canta", "cantar", "-ar"] },
        { q: "¿Qué final lleva «tú» en un verbo -ar?", o: ["-as", "-o", "-a", "-es"] },
        { q: "¿Cuál es la raíz de «bailar»?", o: ["bail-", "bailar", "baila", "-ar"] },
        { q: "¿Cuál forma está mal escrita?", o: ["yo cantaro", "yo canto", "tú cantas", "él canta"] },
        { q: "Al quitar «-er» de «comer», ¿qué queda?", o: ["com-", "comer", "come", "-er"] },
        { q: "¿Cómo se dice «comer» con tú?", o: ["comes", "comas", "como", "comer"] },
        { q: "¿Cómo se dice «beber» con él?", o: ["bebe", "bebes", "bebo", "beber"] },
        { q: "¿Qué finales usan los verbos «-er»?", o: ["-o, -es, -e", "-o, -as, -a", "-a, -e, -o", "-es, -o, -as"] },
      ],
      write: [
        "Escribe yo, tú y él con «hablar» y «comer».",
        "Explica por qué «yo cantaro» está mal.",
      ],
      schematic: [
        "Dibuja un esquema: raíz «com-» y tres finales.",
        "Dibuja el sendero -ar con yo, tú y él.",
      ],
    },
    image: [
      "Dibuja dos senderos del Ávila, -ar y -er.",
      "En cada uno escribe un verbo conjugado",
      "con yo, tú y él. Subraya el final de",
      "cada verbo y deja la raíz sin subrayar.",
    ],
    summary: "En el sendero «-ar» añades -o, -as o -a, y en el «-er» añades -o, -es o -e.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "ing-c3-w1-d3",
    title: "Spanish -ir verbs and the three paths",
    mppe: [
      { id: "len-esc-03", label: "I write short Spanish sentences with correct endings." },
      { id: "len-ora-05", label: "I say conjugations aloud clearly." },
    ],
    units: [
      {
        h: "Punto 1: Repaso de la clase pasada",
        a: [
          "La clase pasada subiste por «-ar» y «-er».",
          "Con «cantar» usaste -o, -as y -a.",
          "Con «comer» usaste -o, -es y -e.",
        ],
      },
      {
        q: [
          "Llegamos al tercer sendero del Ávila:",
          "el «-ir». ¿Qué raíz tiene «vivir»?",
        ],
        h: "Punto 2: El sendero -ir",
        a: [
          "Al quitar «-ir» queda la raíz «viv-».",
          "Se dice: yo vivo, tú vives, él vive.",
          "Son los mismos finales que en «-er».",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿se dice",
          "«yo vive» o «yo vivo»? ¿Y «él vive»?",
        ],
        h: "Punto 3: Cada final con su persona",
        a: [
          "Se dice «yo vivo» y «él vive».",
          "El final «-o» es para yo y «-e» para él.",
          "Antes de escribir, piensa quién actúa.",
        ],
      },
      {
        q: [
          "Ya pasaste por los tres senderos.",
          "¿Cómo dices cantar, comer y vivir?",
        ],
        h: "Punto 4: Los tres senderos juntos",
        a: [
          "-ar (cantar → canto, cantas, canta),",
          "-er (comer → como, comes, come),",
          "-ir (vivir → vivo, vives, vive).",
        ],
      },
      {
        q: [
          "Lee: «Yo hablo, tú comes y él escribe.»",
          "¿Por cuál sendero va cada verbo?",
        ],
        h: "Punto 5: Descubre el sendero",
        a: [
          "«Hablo» viene de «hablar»: sendero -ar.",
          "«Comes» viene de «comer»: sendero -er.",
          "«Escribe» viene de «escribir»: sendero -ir.",
        ],
      },
      {
        q: [
          "Cuéntale a tu familia tu subida del Ávila.",
          "¿Cómo ordenas lo que dices?",
        ],
        h: "Punto 6: Cómo contarlo con orden",
        a: [
          "Inicio: «Hoy les cuento los tres senderos».",
          "Medio: un verbo de cada familia, en voz alta.",
          "Cierre: repite yo, tú y él y da las gracias.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "Al quitar «-ir» de «vivir», ¿qué queda?", o: ["viv-", "vivir", "vive", "-ir"] },
        { q: "¿Cómo se dice «vivir» con tú?", o: ["vives", "vivo", "vive", "vivir"] },
        { q: "¿Qué finales usan los verbos «-ir»?", o: ["-o, -es, -e", "-o, -as, -a", "-a, -e, -o", "-es, -o, -as"] },
        { q: "¿Cuál oración está bien escrita?", o: ["Él vive lejos.", "Yo vive lejos.", "Él vivo lejos.", "Tú vivo cerca."] },
        { q: "¿Cuántos senderos recorriste?", o: ["Tres", "Dos", "Cuatro", "Nueve"] },
        { q: "«Hablo» viene de «hablar». ¿Qué sendero?", o: ["-ar", "-er", "-ir", "Ninguno"] },
        { q: "«Escribe» viene de «escribir». ¿Qué sendero?", o: ["-ir", "-ar", "-er", "Ninguno"] },
        { q: "¿Qué dices al cerrar tu exposición?", o: ["Repito yo, tú y él", "Cambio la raíz", "Borro los verbos", "No digo nada"] },
      ],
      write: [
        "Escribe de memoria cantar, comer y vivir con yo, tú y él.",
        "Cuenta con tus palabras cómo se conjuga un verbo.",
      ],
      schematic: [
        "Dibuja un esquema con los tres senderos y sus finales.",
        "Dibuja una oración tuya y une cada verbo con su sendero.",
      ],
    },
    image: [
      "Dibuja el cerro Ávila con tres senderos",
      "hacia la misma cima. Rotula -ar, -er e -ir",
      "y deja espacio para escribir en cada uno",
      "un verbo con yo, tú y él conjugados.",
    ],
    summary: "Tres senderos llevan a la misma cima: -ar, -er e -ir. Quitas el final y añades el de yo, tú o él.",
  },
];
