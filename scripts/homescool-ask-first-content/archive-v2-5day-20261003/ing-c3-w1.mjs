/**
 * Inglés · ciclo 3 · semana 1 · nivel 6 — verbos del español: familias -ar, -er, -ir.
 * Hito de Venezuela: Los tres senderos del Ávila (tres caminos hacia la misma cima).
 * Datos seguros usados: el Ávila separa Caracas del mar; se sube por distintos senderos.
 * Formato "Ask First" (ver BRIEF.md y GOLD.example.mjs).
 */
export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "ing-c3-w1-d1",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
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
          "La raíz es la cima. El final es la terminación.",
        ],
      },
      {
        q: [
          "El primer sendero del Ávila es el «-ar».",
          "¿Cómo dices «cantar» con yo, tú y él?",
        ],
        h: "Punto 4: El sendero -ar",
        a: [
          "Se dice: yo canto, tú cantas, él canta.",
          "Quitas «-ar» y añades -o, -as o -a.",
          "«Hablar» igual: hablo, hablas, habla.",
        ],
      },
      {
        q: [
          "El segundo sendero es el «-er». Con",
          "«comer», ¿cómo dices yo, tú y él?",
        ],
        h: "Punto 5: El sendero -er",
        a: [
          "Quitas «-er» y queda la raíz «com-».",
          "Se dice: yo como, tú comes, él come.",
          "«Beber» igual: bebo, bebes, bebe.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿cómo dices",
          "«vivir»? ¿Llega a la misma cima?",
        ],
        h: "Punto 6: El sendero -ir",
        a: [
          "Tres senderos, una cima, tres familias:",
          "-ar (cantar → canto, cantas, canta),",
          "-er (comer → como, comes, come),",
          "-ir (vivir → vivo, vives, vive).",
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
        { q: "¿Qué parte del verbo es la cima?", o: ["La raíz", "La terminación", "El infinitivo", "El pronombre"] },
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
      "Dibuja el Ávila con tres senderos",
      "hacia la misma cima.",
      "Rotula cada sendero: -ar, -er e -ir,",
      "y escribe un verbo conjugado en cada uno.",
    ],
    summary: "En los tres senderos del Ávila el verbo cambia su final, pero su raíz es la cima que no cambia.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "ing-c3-w1-d2",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer subimos el Ávila por tres senderos.",
          "Viste que el verbo cambia su final",
          "y que la raíz se queda, como la cima.",
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
          "En «cantaro» quedó pegado el «-ar».",
          "Primero quita «-ar» y luego añade",
          "el final: «cant-» más «-o» es «canto».",
        ],
      },
      {
        q: [
          "Cuenta un paseo con «cantar» y «bailar».",
          "¿Quién hace qué? Usa yo, tú y él.",
        ],
        h: "Punto 5: Una historia en el sendero",
        a: [
          "Por ejemplo: yo canto al empezar,",
          "tú bailas en el camino",
          "y él canta al llegar a la cima.",
          "La raíz se queda; solo cambia el final.",
        ],
      },
      {
        q: [
          "Subiendo el Ávila, dilo en voz alta:",
          "¿cómo se dice «hablar» y «bailar»?",
        ],
        h: "Punto 6: Dilo en voz alta",
        a: [
          "Se dice: yo hablo, tú hablas, él habla.",
          "Y también: yo bailo, tú bailas, él baila.",
          "Los finales se oyen al final de la palabra.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "En «canto», ¿qué raíz se queda?", o: ["cant-", "canta", "cantar", "-ar"] },
        { q: "¿Qué final lleva «tú» en un verbo -ar?", o: ["-as", "-o", "-a", "-es"] },
        { q: "¿Cómo se dice «hablar» con él?", o: ["habla", "hablo", "hablas", "hablar"] },
        { q: "¿Cuál es la raíz de «bailar»?", o: ["bail-", "bailar", "baila", "-ar"] },
        { q: "¿Cómo se dice «bailar» con yo?", o: ["bailo", "bailas", "baila", "bailaro"] },
        { q: "¿Cuál forma está mal escrita?", o: ["yo cantaro", "yo canto", "tú cantas", "él canta"] },
        { q: "¿Qué haces primero con «cantar»?", o: ["Quitar «-ar»", "Añadir «-as»", "Cambiar la raíz", "Escribir «cantaro»"] },
        { q: "¿Qué final lleva «yo» en un verbo -ar?", o: ["-o", "-as", "-a", "-ar"] },
      ],
      write: [
        "Escribe yo, tú y él con «hablar» y «bailar».",
        "Explica por qué «yo cantaro» está mal.",
      ],
      schematic: [
        "Dibuja un esquema: raíz «cant-» y tres finales.",
        "Dibuja el sendero -ar con yo, tú y él.",
      ],
    },
    image: [
      "Dibuja el sendero «-ar» del Ávila.",
      "En tres paradas escribe un verbo -ar",
      "para yo, tú y él.",
      "Subraya el final de cada verbo.",
    ],
    summary: "En el sendero «-ar» quitas «-ar» y añades -o, -as o -a: canto, cantas, canta.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "ing-c3-w1-d3",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer subimos por el sendero «-ar».",
          "Con «cantar» usamos -o, -as y -a.",
          "Quitamos «-ar» y añadimos el final.",
        ],
      },
      {
        q: [
          "En el sendero «-er» camina «comer».",
          "¿Qué raíz queda y qué finales lleva?",
        ],
        h: "Punto 2: El sendero -er",
        a: [
          "Al quitar «-er» queda la raíz «com-».",
          "Se dice: yo como, tú comes, él come.",
          "Los finales son -o, -es y -e.",
        ],
      },
      {
        q: [
          "Más caminantes en el sendero: «beber»",
          "y «leer». ¿Qué raíz tiene cada uno?",
        ],
        h: "Punto 3: Otros verbos «-er»",
        a: [
          "La raíz de «beber» es «beb-»:",
          "bebo, bebes, bebe.",
          "La de «leer» es «le-»: leo, lees, lee.",
          "La raíz es corta, pero la regla sirve.",
        ],
      },
      {
        q: [
          "En un descanso del Ávila, yo como",
          "arroz. ¿Y tú con fruta y él con pan?",
        ],
        h: "Punto 4: Un descanso con «comer»",
        a: [
          "Yo como arroz.",
          "Tú comes fruta.",
          "Él come pan.",
          "La raíz «com-» se queda; cambia el final.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿se dice",
          "«tú comas» o «tú comes»?",
        ],
        h: "Punto 5: El final de tú en -er",
        a: [
          "Se dice «tú comes».",
          "«Comas» no es de este sendero.",
          "En los verbos «-er», tú termina en «-es».",
          "Oye la diferencia: comes, bebes, lees.",
        ],
      },
      {
        q: [
          "Es tu turno en el sendero: ¿cómo dices",
          "«beber» y «leer» con tú?",
        ],
        h: "Punto 6: El mismo final en todas",
        a: [
          "Se dice: tú bebes y tú lees.",
          "El final «-es» es el mismo en las dos.",
          "Los verbos «-er» usan -o, -es y -e.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "Al quitar «-er» de «comer», ¿qué queda?", o: ["com-", "comer", "come", "-er"] },
        { q: "¿Cómo se dice «comer» con tú?", o: ["comes", "comas", "como", "comer"] },
        { q: "¿Cómo se dice «beber» con él?", o: ["bebe", "bebes", "bebo", "beber"] },
        { q: "¿Cómo se dice «leer» con yo?", o: ["leo", "lees", "lee", "leer"] },
        { q: "¿Qué finales usan los verbos «-er»?", o: ["-o, -es, -e", "-o, -as, -a", "-a, -e, -o", "-es, -o, -as"] },
        { q: "¿Cuál oración está bien escrita?", o: ["Tú comes fruta.", "Tú comas fruta.", "Yo come arroz.", "Él como pan."] },
        { q: "¿Cuál es la raíz de «beber»?", o: ["beb-", "beber", "bebe", "-er"] },
        { q: "En «Él come pan», ¿qué final tiene?", o: ["-e", "-es", "-o", "-a"] },
      ],
      write: [
        "Escribe yo, tú y él con «comer», «beber» y «leer».",
        "Explica qué cambia entre los verbos -ar y -er.",
      ],
      schematic: [
        "Dibuja un esquema: raíz «com-» y tres finales.",
        "Dibuja una tabla con yo, tú y él para «beber».",
      ],
    },
    image: [
      "Dibuja el sendero «-er» del Ávila",
      "con un descanso a mitad de camino.",
      "Escribe qué come yo, tú y él con «comer».",
      "Encierra en un cuadro cada final «-es».",
    ],
    summary: "En el sendero «-er» quitas «-er» y añades -o, -es o -e: como, comes, come.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "ing-c3-w1-d4",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer subimos por el sendero «-er».",
          "Con «comer», «beber» y «leer» usamos",
          "-o, -es y -e. Tú termina en «-es».",
        ],
      },
      {
        q: [
          "Llegamos al tercer sendero: el «-ir».",
          "¿Qué raíz tiene «vivir» y qué finales?",
        ],
        h: "Punto 2: El sendero -ir",
        a: [
          "Al quitar «-ir» queda la raíz «viv-».",
          "Se dice: yo vivo, tú vives, él vive.",
          "Los finales son -o, -es y -e,",
          "los mismos que en «-er».",
        ],
      },
      {
        q: [
          "También suben «escribir» y «abrir».",
          "¿Cómo se dicen con yo, tú y él?",
        ],
        h: "Punto 3: Otros verbos «-ir»",
        a: [
          "«Escribir»: escribo, escribes, escribe.",
          "«Abrir»: abro, abres, abre.",
          "Las raíces son «escrib-» y «abr-».",
          "Otra vez: -o, -es y -e.",
        ],
      },
      {
        q: [
          "En el mapa del Ávila, ¿cómo usas «vivir»",
          "para yo aquí, tú cerca y él lejos?",
        ],
        h: "Punto 4: Un mapa con «vivir»",
        a: [
          "Yo vivo aquí.",
          "Tú vives cerca.",
          "Él vive lejos.",
          "Ahora cuenta lo mismo con «escribir».",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿se dice",
          "«yo vive» o «yo vivo»? ¿Y «él vive»?",
        ],
        h: "Punto 5: Cada final con su persona",
        a: [
          "Se dice «yo vivo» y «él vive».",
          "El final «-o» es para yo y «-e» para él.",
          "«Yo vive» suena raro: no sigue el sendero.",
          "Antes de escribir, piensa quién actúa.",
        ],
      },
      {
        q: [
          "Ya pasaste por los tres senderos.",
          "¿Cómo dices cantar, comer y vivir?",
        ],
        h: "Punto 6: Los tres senderos juntos",
        a: [
          "Cantar: canto, cantas, canta.",
          "Comer: como, comes, come.",
          "Vivir: vivo, vives, vive.",
          "«-er» e «-ir» tienen los mismos finales.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "Al quitar «-ir» de «vivir», ¿qué queda?", o: ["viv-", "vivir", "vive", "-ir"] },
        { q: "¿Cómo se dice «vivir» con tú?", o: ["vives", "vivo", "vive", "vivir"] },
        { q: "¿Cómo se dice «escribir» con yo?", o: ["escribo", "escribes", "escribe", "escribir"] },
        { q: "¿Cómo se dice «abrir» con él?", o: ["abre", "abres", "abro", "abrir"] },
        { q: "¿Cuál es la raíz de «abrir»?", o: ["abr-", "abrir", "abre", "-ir"] },
        { q: "¿Qué finales usan los verbos «-ir»?", o: ["-o, -es, -e", "-o, -as, -a", "-a, -e, -o", "-es, -o, -as"] },
        { q: "¿Cuál oración está bien escrita?", o: ["Él vive lejos.", "Yo vive lejos.", "Él vivo lejos.", "Tú vivo cerca."] },
        { q: "¿Qué familia tiene los finales de «-er»?", o: ["-ir", "-ar", "Ninguna", "Todas"] },
      ],
      write: [
        "Escribe yo, tú y él con «vivir» y «abrir».",
        "Explica qué tienen igual -er e -ir.",
      ],
      schematic: [
        "Dibuja una tabla: cantar, comer y vivir.",
        "Dibuja un mapa con dónde vive cada uno.",
      ],
    },
    image: [
      "Dibuja un mapa del Ávila con tu casa",
      "y la de dos amigos. Escribe con «vivir»",
      "quién vive aquí, cerca y lejos.",
      "Revisa cada final: -o, -es o -e.",
    ],
    summary: "En el sendero «-ir» quitas «-ir» y añades -o, -es o -e: vivo, vives, vive.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "ing-c3-w1-d5",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer recorrimos el sendero «-ir».",
          "Con «vivir», «escribir» y «abrir»",
          "usamos -o, -es y -e.",
        ],
      },
      {
        q: [
          "Sin mirar: ¿cuáles son los tres senderos",
          "del Ávila y qué verbo sube por cada uno?",
        ],
        h: "Punto 2: Los tres senderos",
        a: [
          "Familias del español:",
          "-ar (cantar → canto, cantas, canta),",
          "-er (comer → como, comes, come),",
          "-ir (vivir → vivo, vives, vive).",
        ],
      },
      {
        q: [
          "¿Qué pasos sigues para conjugar un verbo",
          "en cualquier sendero del Ávila?",
        ],
        h: "Punto 3: Los tres pasos",
        a: [
          "Primero mira el infinitivo y su familia.",
          "Después quita el final y guarda la raíz.",
          "Por último añade el final de yo, tú o él.",
          "Con «cantar»: «cant-» más «-o» es «canto».",
        ],
      },
      {
        q: [
          "¿Qué senderos se parecen y cuál es",
          "distinto en yo, tú y él?",
        ],
        h: "Punto 4: Los finales de cada sendero",
        a: [
          "El sendero «-ar» usa -o, -as y -a.",
          "El sendero «-er» usa -o, -es y -e.",
          "El sendero «-ir» usa también -o, -es y -e.",
          "Solo «-ar» cambia; «-er» e «-ir» se parecen.",
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
          "Quita el final y vuelve al infinitivo.",
        ],
      },
      {
        q: [
          "Cuéntale a tu familia tu subida del Ávila.",
          "¿Cómo ordenas lo que dices?",
        ],
        h: "Punto 6: Cómo contarlo con orden",
        a: [
          "Exponer es contar con orden a otros.",
          "Inicio: «Hoy les cuento los tres senderos».",
          "Medio: un verbo de cada familia, en voz alta.",
          "Cierre: repite yo, tú y él y da las gracias.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuántos senderos recorriste?", o: ["Tres", "Dos", "Cuatro", "Nueve"] },
        { q: "¿Qué verbo sube por el sendero -ar?", o: ["cantar", "comer", "vivir", "escribir"] },
        { q: "¿Qué verbo sube por el sendero -er?", o: ["comer", "cantar", "vivir", "hablar"] },
        { q: "¿Cómo se dice «vivir» con yo?", o: ["vivo", "vives", "vive", "vivir"] },
        { q: "¿Qué finales usa el sendero -ar?", o: ["-o, -as, -a", "-o, -es, -e", "-e, -es, -o", "-a, -o, -as"] },
        { q: "«Escribe» viene de «escribir». ¿Qué sendero?", o: ["-ir", "-ar", "-er", "Ninguno"] },
        { q: "¿Qué haces primero para conjugar?", o: ["Mirar el infinitivo y su familia", "Añadir el final", "Escribir la raíz dos veces", "Cambiar el infinitivo"] },
        { q: "¿Qué sendero tiene los finales de «-er»?", o: ["-ir", "-ar", "Ninguno", "Todos"] },
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
      "Dibuja el Ávila con tres senderos",
      "hacia la misma cima.",
      "Rotula -ar, -er e -ir con un verbo",
      "y yo, tú y él conjugados en cada uno.",
    ],
    summary: "Tres senderos llevan a la misma cima: -ar, -er e -ir. Quitas el final y añades el de yo, tú o él.",
  },
];
