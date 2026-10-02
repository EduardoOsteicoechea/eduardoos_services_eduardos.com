/**
 * Inglés · ciclo 3 · semana 1 · nivel 6 — verbos del español: familias -ar, -er, -ir.
 * Narrativa inductiva "pregunta primero" (ver BRIEF.md y esp-c3-w1.mjs).
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "ing-c3-w1-d1",
    opening: "¿Por qué decimos «yo canto» y «tú cantas»? ¿Qué cambia?",
    repaso: null,
    units: [
      {
        h: "Punto 1: El verbo cambia con quien actúa",
        a: [
          "Un verbo es una palabra que dice una acción.",
          "«Cantar», «comer» y «vivir» son verbos.",
          "Cuando cambia quien actúa, el final del verbo cambia.",
          "Cambiar el verbo así se llama conjugar.",
        ],
      },
      {
        q: [
          "Sigamos. Mira «cantar». Si le quitas «-ar»,",
          "¿qué parte te queda?",
        ],
        h: "Punto 2: La raíz y la terminación",
        a: [
          "«Cantar» es el infinitivo: el verbo como en el diccionario.",
          "Si quitas «-ar», queda «cant-». Esa parte es la raíz.",
          "La raíz no cambia. Lo que añades al final es la terminación.",
          "«Cant-» más «-o» forma «canto».",
        ],
      },
      {
        q: [
          "Imagina tres cantantes: yo, tú y él.",
          "¿Cómo dirías «cantar» para cada uno?",
        ],
        h: "Punto 3: La familia -ar",
        a: [
          "Se dice: yo canto, tú cantas, él canta.",
          "Quitamos «-ar» y añadimos «-o», «-as» o «-a».",
          "«Hablar» hace lo mismo: hablo, hablas, habla.",
          "Estos verbos son de la familia «-ar».",
        ],
      },
      {
        q: [
          "Ahora tú: ¿cómo dirías «comer» con yo, tú y él?",
          "Usa la misma idea: quita el final y añade otro.",
        ],
        h: "Punto 4: La familia -er",
        a: [
          "Quitas «-er» y queda la raíz «com-».",
          "Se dice: yo como, tú comes, él come.",
          "«Beber» hace lo mismo: bebo, bebes, bebe.",
          "Estos verbos son de la familia «-er».",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿cómo dirías «vivir»?",
          "¿Se parece a «comer» o a «cantar»?",
        ],
        h: "Punto 5: La familia -ir",
        a: [
          "Se dice: yo vivo, tú vives, él vive.",
          "Familias del español: -ar (cantar → canto, cantas, canta),",
          "-er (comer → como, comes, come),",
          "-ir (vivir → vivo, vives, vive).",
          "«Escribir» también: escribo, escribes, escribe.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué dice un verbo?", o: ["Una acción", "Un lugar", "Un color", "Un número"] },
        { q: "¿Qué significa conjugar un verbo?", o: ["Cambiarlo según quien actúa", "Escribirlo más grande", "Quitarle todas las letras", "Traducirlo al inglés"] },
        { q: "¿Qué es «cantar»?", o: ["El infinitivo del verbo", "Una raíz", "Una terminación", "Un pronombre"] },
        { q: "Si quitas «-ar» de «cantar», ¿qué raíz queda?", o: ["cant-", "canta", "cantar", "-ar"] },
        { q: "¿Cómo se dice «cantar» con tú?", o: ["cantas", "canto", "canta", "cantar"] },
        { q: "¿Cómo se dice «comer» con yo?", o: ["como", "comes", "come", "comer"] },
        { q: "¿Cómo se dice «vivir» con él?", o: ["vive", "vives", "vivo", "vivir"] },
        { q: "¿De qué familia es «escribir»?", o: ["-ir", "-ar", "-er", "Ninguna"] },
      ],
      write: [
        "Escribe yo, tú y él con el verbo «hablar».",
        "Explica con tus palabras qué es la raíz de un verbo.",
      ],
      schematic: [
        "Dibuja un esquema: raíz «cant-» y tres terminaciones.",
        "Dibuja tres cajas: familia -ar, -er e -ir, con un verbo.",
      ],
    },
    image: [
      "Dibuja a tres personas: yo, tú y él, haciendo algo.",
      "Debajo de cada una escribe un verbo conjugado.",
      "Rotula la raíz y la terminación de uno de ellos.",
      "Revisa que el final del verbo cambie con cada persona.",
    ],
    summary: "Un verbo dice una acción. Conjugar es cambiar su final: hay tres familias, -ar, -er e -ir.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "ing-c3-w1-d2",
    opening: ayer,
    repaso: [
      "Ayer vimos que un verbo dice una acción.",
      "Conjugar es cambiar el final según quien actúa.",
      "La raíz se queda y la terminación cambia.",
    ],
    units: [
      {
        q: [
          "¿Te acuerdas de «cantar»? Quita «-ar» y añade un final:",
          "¿cómo se dice con yo, tú y él?",
        ],
        h: "Punto 1: Los tres finales de la familia -ar",
        a: [
          "Se dice: yo canto, tú cantas, él canta.",
          "Los finales son -o, -as y -a.",
          "Todos los verbos «-ar» usan estos tres finales.",
          "Así suena: -o para yo, -as para tú, -a para él.",
        ],
      },
      {
        q: [
          "Sigamos. Prueba ahora con «hablar» y con «bailar».",
          "¿Qué raíz tiene cada uno?",
        ],
        h: "Punto 2: La misma regla con otros verbos",
        a: [
          "«Hablar» tiene la raíz «habl-»: hablo, hablas, habla.",
          "«Bailar» tiene la raíz «bail-»: bailo, bailas, baila.",
          "Cambia la raíz, pero los finales son los mismos.",
          "Por eso una regla sirve para muchos verbos.",
        ],
      },
      {
        q: [
          "Cuenta una historia corta con «cantar»: ¿quién canta",
          "en la mañana, en la escuela y en casa? Usa yo, tú y él.",
        ],
        h: "Punto 3: Una historia con «cantar»",
        a: [
          "Por ejemplo: yo canto en la mañana.",
          "Tú cantas en la escuela.",
          "Él canta en casa.",
          "La raíz «cant-» es igual; solo cambia el final.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿se dice «yo cantaro»",
          "o «yo canto»? ¿Qué se olvidó?",
        ],
        h: "Punto 4: Primero quita, luego añade",
        a: [
          "Se dice «yo canto».",
          "En «cantaro» quedó pegado el «-ar» a la raíz.",
          "Primero quita «-ar» y después añade el final.",
          "Así «cant-» más «-o» forma «canto».",
        ],
      },
      {
        q: [
          "Ahora tú: ¿cómo dirías «bailar» con yo, tú y él?",
          "Dilo en voz alta y fíjate en los finales.",
        ],
        h: "Punto 5: Dilo en voz alta",
        a: [
          "Se dice: yo bailo, tú bailas, él baila.",
          "Los finales «-o», «-as» y «-a» se oyen al final.",
          "Leer en voz alta ayuda a no confundirlos.",
          "Repítelo con «cantar» y con «hablar».",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué raíz tiene «cantar»?", o: ["cant-", "canta", "cantar", "-ar"] },
        { q: "¿Qué final lleva «tú» en los verbos «-ar»?", o: ["-as", "-o", "-a", "-es"] },
        { q: "¿Cómo se dice «hablar» con él?", o: ["habla", "hablo", "hablas", "hablar"] },
        { q: "¿Cuál es la raíz de «bailar»?", o: ["bail-", "bailar", "baila", "-ar"] },
        { q: "¿Cómo se dice «bailar» con yo?", o: ["bailo", "bailas", "baila", "bailaro"] },
        { q: "¿Cuál forma está mal escrita?", o: ["yo cantaro", "yo canto", "tú cantas", "él canta"] },
        { q: "¿Qué se hace primero con «cantar»?", o: ["Quitar «-ar»", "Añadir «-as»", "Cambiar la raíz", "Escribir «cantaro»"] },
        { q: "¿Qué final lleva «yo» en los verbos «-ar»?", o: ["-o", "-as", "-a", "-ar"] },
      ],
      write: [
        "Escribe yo, tú y él con «hablar» y con «bailar».",
        "Explica por qué «yo cantaro» está mal escrito.",
      ],
      schematic: [
        "Dibuja un esquema: raíz «cant-» y sus tres finales.",
        "Dibuja una tabla con yo, tú y él para «hablar».",
      ],
    },
    image: [
      "Dibuja una escena donde alguien canta o baila.",
      "Escribe un verbo -ar conjugado para yo, tú y él.",
      "Subraya la terminación de cada verbo.",
      "Revisa que ninguno se quede con el «-ar» pegado.",
    ],
    summary: "En la familia -ar quitamos «-ar» y añadimos -o, -as o -a: canto, cantas, canta.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "ing-c3-w1-d3",
    opening: ayer,
    repaso: [
      "Ayer practicamos los verbos de la familia -ar.",
      "Con «cantar» y «hablar» usamos -o, -as y -a.",
      "Primero quitamos «-ar» y luego añadimos el final.",
    ],
    units: [
      {
        q: [
          "Mira «comer». Si quitas «-er», ¿qué raíz queda?",
          "¿Qué finales le pondrías para yo, tú y él?",
        ],
        h: "Punto 1: La familia -er",
        a: [
          "Queda la raíz «com-».",
          "Se dice: yo como, tú comes, él come.",
          "Los finales son -o, -es y -e.",
          "«Comer» es el infinitivo de la familia «-er».",
        ],
      },
      {
        q: [
          "Sigamos con «beber» y «leer». ¿Qué raíces tienen?",
          "¿Cómo dirías cada uno con yo, tú y él?",
        ],
        h: "Punto 2: Otros verbos «-er»",
        a: [
          "«Beber» tiene la raíz «beb-»: bebo, bebes, bebe.",
          "«Leer» tiene la raíz «le-»: leo, lees, lee.",
          "En «leer» la raíz es corta, pero la regla sirve igual.",
          "Los finales siguen siendo -o, -es y -e.",
        ],
      },
      {
        q: [
          "Imagina una comida: yo, tú y él comemos algo distinto.",
          "¿Cómo cuentas quién come arroz, fruta y pan?",
        ],
        h: "Punto 3: Una comida con «comer»",
        a: [
          "Yo como arroz.",
          "Tú comes fruta.",
          "Él come pan.",
          "La raíz «com-» se queda; solo cambia el final.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿se dice «tú comas»",
          "o «tú comes»?",
        ],
        h: "Punto 4: El final de tú en -er",
        a: [
          "Se dice «tú comes».",
          "«Comas» no es la forma que usamos hoy.",
          "Con los verbos «-er», el final de tú es «-es».",
          "Oye la diferencia: comes, bebes, lees.",
        ],
      },
      {
        q: [
          "Es tu turno: ¿cómo dirías «beber» y «leer» con tú?",
          "Fíjate en el final de cada una.",
        ],
        h: "Punto 5: El mismo final en todas",
        a: [
          "Se dice: tú bebes y tú lees.",
          "El final «-es» es el mismo en las dos.",
          "Los verbos «-er» usan -o, -es y -e.",
          "Con esta regla ya puedes conjugar muchos verbos.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué raíz queda al quitar «-er» de «comer»?", o: ["com-", "comer", "come", "-er"] },
        { q: "¿Cómo se dice «comer» con tú?", o: ["comes", "comas", "como", "comer"] },
        { q: "¿Cómo se dice «beber» con él?", o: ["bebe", "bebes", "bebo", "beber"] },
        { q: "¿Cómo se dice «leer» con yo?", o: ["leo", "lees", "lee", "leer"] },
        { q: "¿Qué finales usan los verbos «-er» con yo, tú y él?", o: ["-o, -es, -e", "-o, -as, -a", "-a, -e, -o", "-es, -o, -as"] },
        { q: "¿Cuál oración está bien escrita?", o: ["Tú comes fruta.", "Tú comas fruta.", "Yo come arroz.", "Él como pan."] },
        { q: "¿Cuál es la raíz de «beber»?", o: ["beb-", "beber", "bebe", "-er"] },
        { q: "En «Él come pan», ¿qué final lleva «come»?", o: ["-e", "-es", "-o", "-a"] },
      ],
      write: [
        "Escribe yo, tú y él con «comer», «beber» y «leer».",
        "Explica qué cambia entre los verbos «-ar» y «-er».",
      ],
      schematic: [
        "Dibuja un esquema: raíz «com-» y sus tres finales.",
        "Dibuja una tabla con yo, tú y él para «beber».",
      ],
    },
    image: [
      "Dibuja una mesa con tres personas comiendo.",
      "Escribe qué come cada una con «comer» conjugado.",
      "Encierra en un cuadro cada final «-es».",
      "Revisa que la raíz «com-» se quede igual.",
    ],
    summary: "En la familia -er quitamos «-er» y añadimos -o, -es o -e: como, comes, come.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "ing-c3-w1-d4",
    opening: ayer,
    repaso: [
      "Ayer practicamos los verbos de la familia -er.",
      "Con «comer», «beber» y «leer» usamos -o, -es y -e.",
      "El final de tú en esos verbos es «-es».",
    ],
    units: [
      {
        q: [
          "Mira «vivir». Si quitas «-ir», ¿qué raíz queda?",
          "¿Cómo dirías «vivir» con yo, tú y él?",
        ],
        h: "Punto 1: La familia -ir",
        a: [
          "Queda la raíz «viv-».",
          "Se dice: yo vivo, tú vives, él vive.",
          "Los finales son -o, -es y -e, como en «-er».",
          "«Vivir» es el infinitivo de la familia «-ir».",
        ],
      },
      {
        q: [
          "Sigamos con «escribir» y «abrir». ¿Cómo las dirías",
          "con yo, tú y él?",
        ],
        h: "Punto 2: Otros verbos «-ir»",
        a: [
          "«Escribir»: escribo, escribes, escribe.",
          "«Abrir»: abro, abres, abre.",
          "Las raíces son «escrib-» y «abr-».",
          "Otra vez los finales son -o, -es y -e.",
        ],
      },
      {
        q: [
          "Imagina que dibujas un mapa: ¿cómo dices quién vive aquí,",
          "quién cerca y quién lejos? Usa «vivir» con yo, tú y él.",
        ],
        h: "Punto 3: Un mapa con «vivir»",
        a: [
          "Yo vivo aquí.",
          "Tú vives cerca.",
          "Él vive lejos.",
          "Ahora cuenta lo mismo con «escribir».",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿se dice «yo vive» o «yo vivo»?",
          "¿Y se dice «él vivo» o «él vive»?",
        ],
        h: "Punto 4: Cada final con su persona",
        a: [
          "Se dice «yo vivo» y «él vive».",
          "El final «-o» es para yo y el final «-e» es para él.",
          "Si los mezclas, suena raro: «yo vive» no está bien.",
          "Antes de escribir, piensa quién hace la acción.",
        ],
      },
      {
        q: [
          "Llena esta tabla: las filas son cantar, comer y vivir.",
          "Las columnas son yo, tú y él. ¿Qué va en cada casilla?",
        ],
        h: "Punto 5: Las tres familias juntas",
        a: [
          "Cantar: canto, cantas, canta.",
          "Comer: como, comes, come.",
          "Vivir: vivo, vives, vive.",
          "«-er» e «-ir» tienen los mismos finales aquí.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué raíz queda al quitar «-ir» de «vivir»?", o: ["viv-", "vivir", "vive", "-ir"] },
        { q: "¿Cómo se dice «vivir» con tú?", o: ["vives", "vivo", "vive", "vivir"] },
        { q: "¿Cómo se dice «escribir» con yo?", o: ["escribo", "escribes", "escribe", "escribir"] },
        { q: "¿Cómo se dice «abrir» con él?", o: ["abre", "abres", "abro", "abrir"] },
        { q: "¿Cuál es la raíz de «abrir»?", o: ["abr-", "abrir", "abre", "-ir"] },
        { q: "¿Qué finales usan los verbos «-ir» con yo, tú y él?", o: ["-o, -es, -e", "-o, -as, -a", "-a, -e, -o", "-es, -o, -as"] },
        { q: "¿Cuál oración está bien escrita?", o: ["Él vive lejos.", "Yo vive lejos.", "Él vivo lejos.", "Tú vivo cerca."] },
        { q: "En la tabla, ¿cómo se dice «comer» con tú?", o: ["comes", "como", "come", "comas"] },
      ],
      write: [
        "Escribe yo, tú y él con «vivir», «escribir» y «abrir».",
        "Explica qué tienen igual los verbos «-er» e «-ir».",
      ],
      schematic: [
        "Dibuja una tabla: cantar, comer y vivir con yo, tú y él.",
        "Dibuja un mapa con dónde vive cada persona.",
      ],
    },
    image: [
      "Dibuja un mapa con tu casa y la de dos amigos.",
      "Escribe quién vive aquí, cerca y lejos con «vivir».",
      "Añade una frase con «escribir» o con «abrir».",
      "Revisa que cada final «-o», «-es» o «-e» sea correcto.",
    ],
    summary: "En la familia -ir quitamos «-ir» y añadimos -o, -es o -e: vivo, vives, vive.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "ing-c3-w1-d5",
    opening: ayer,
    repaso: [
      "Esta semana conociste tres familias de verbos.",
      "Aprendiste a quitar el final y a añadir otro.",
      "Hoy las recuerdas y se las cuentas a alguien.",
    ],
    units: [
      {
        q: [
          "Sin mirar nada: ¿cuáles son las tres familias de verbos",
          "y qué verbo usamos de ejemplo en cada una?",
        ],
        w: 3,
        h: "Punto 1: Las tres familias",
        a: [
          "Familias del español: -ar (cantar → canto, cantas, canta),",
          "-er (comer → como, comes, come),",
          "-ir (vivir → vivo, vives, vive).",
          "Si olvidaste alguna, dila otra vez en voz alta.",
        ],
      },
      {
        q: [
          "¿Qué pasos sigues para conjugar cualquier verbo?",
          "Piensa en el infinitivo, la raíz y el final.",
        ],
        h: "Punto 2: Los tres pasos",
        a: [
          "Primero mira el infinitivo y su familia.",
          "Después quita el final y guarda la raíz.",
          "Por último añade el final de yo, tú o él.",
          "Con «cantar»: «cant-» más «-o» forma «canto».",
        ],
      },
      {
        q: [
          "¿Qué finales tienen yo, tú y él en cada familia?",
          "¿Cuáles se parecen y cuáles no?",
        ],
        h: "Punto 3: Los finales de cada familia",
        a: [
          "La familia -ar usa -o, -as y -a.",
          "La familia -er usa -o, -es y -e.",
          "La familia -ir usa también -o, -es y -e.",
          "Solo «-ar» cambia; «-er» e «-ir» son iguales aquí.",
        ],
      },
      {
        q: [
          "Lee: «Yo hablo, tú comes y él escribe.»",
          "¿De qué familia es cada verbo?",
        ],
        h: "Punto 4: Descubre la familia",
        a: [
          "«Hablo» viene de «hablar»: familia -ar.",
          "«Comes» viene de «comer»: familia -er.",
          "«Escribe» viene de «escribir»: familia -ir.",
          "Quita el final y vuelve al infinitivo para saberlo.",
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
          "Inicio: «Hoy les cuento cómo cambian los verbos».",
          "Medio: un ejemplo de cada familia, en voz alta.",
          "Cierre: repite yo, tú y él y di «gracias».",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuántas familias de verbos estudiaste?", o: ["Tres", "Dos", "Cuatro", "Nueve"] },
        { q: "¿Qué verbo es ejemplo de la familia -ar?", o: ["cantar", "comer", "vivir", "escribir"] },
        { q: "¿Qué verbo es ejemplo de la familia -er?", o: ["comer", "cantar", "vivir", "hablar"] },
        { q: "¿Cómo se dice «vivir» con yo?", o: ["vivo", "vives", "vive", "vivir"] },
        { q: "¿Qué finales usa la familia -ar con yo, tú y él?", o: ["-o, -as, -a", "-o, -es, -e", "-e, -es, -o", "-a, -o, -as"] },
        { q: "«Escribe» viene de «escribir». ¿De qué familia es?", o: ["-ir", "-ar", "-er", "Ninguna"] },
        { q: "¿Qué haces primero para conjugar un verbo?", o: ["Mirar el infinitivo y su familia", "Añadir el final", "Escribir la raíz dos veces", "Cambiar el infinitivo"] },
        { q: "¿Qué familia tiene los mismos finales que «-er»?", o: ["-ir", "-ar", "Ninguna", "Todas"] },
      ],
      write: [
        "Escribe de memoria cantar, comer y vivir con yo, tú y él.",
        "Cuenta con tus palabras cómo se conjuga un verbo.",
      ],
      schematic: [
        "Dibuja un esquema con las tres familias y sus finales.",
        "Dibuja una oración tuya y une cada verbo con su familia.",
      ],
    },
    image: [
      "Dibuja un árbol con tres ramas: -ar, -er e -ir.",
      "Escribe en cada rama un verbo de ejemplo.",
      "Añade bajo cada verbo yo, tú y él conjugados.",
      "Revisa que cada final corresponda a su familia.",
    ],
    summary: "Hay tres familias de verbos: -ar, -er e -ir. Quitas el final y añades el de yo, tú o él.",
  },
];
