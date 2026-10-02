/**
 * Español · ciclo 3 · semana 1 · nivel 6 — narrativa inductiva, todo "pregunta primero".
 *
 * Una sola regla de redacción: pregunta -> espacio para responder -> respuesta debajo
 * ("Punto N: ...") -> el niño la copia ("Cópiala aquí:"). Sin secciones de práctica,
 * error común ni pregunta final: todo vive dentro de ese mismo ritmo.
 * Una línea = una idea legible (~60 caracteres máx.).
 *
 * unit = { q: [líneas de pregunta] (omitir si la pregunta es la apertura),
 *          h: "Punto N: título", a: [líneas de respuesta], w?: líneas de espacio, c?: líneas para copiar }
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "esp-c3-w1-d1",
    opening: "¿Crees que todas las palabras hacen el mismo trabajo? ¿Por qué?",
    repaso: null,
    units: [
      {
        h: "Punto 1: Cada palabra tiene su trabajo",
        a: [
          "Las palabras son como un equipo de jugadores.",
          "Cada una tiene un trabajo distinto en la oración.",
          "Algunas nombran y otras dicen lo que alguien hace.",
          "Otras describen, otras unen y otras muestran emoción.",
          "En español hay nueve clases de palabras.",
        ],
      },
      {
        q: [
          "Ahora te pregunto: lee «La niña corre. Ella sonríe.»",
          "¿Qué palabra nombra, cuál dice lo que hace y cuál",
          "ocupa el lugar de un nombre?",
        ],
        h: "Punto 2: Nombrar, actuar y sustituir",
        a: [
          "«Niña» nombra algo: es un sustantivo.",
          "El sustantivo nombra personas, animales, cosas y lugares.",
          "También nombra ideas, como «alegría».",
          "«Corre» y «sonríe» dicen lo que hace ella: son verbos.",
          "«Ella» ocupa el lugar de «la niña»: es un pronombre.",
        ],
      },
      {
        q: [
          "Sigamos. «Casa» y «casa grande» no dicen lo mismo.",
          "¿Qué crees que hace la palabra «grande»?",
        ],
        h: "Punto 3: Palabras que describen",
        a: [
          "«Grande» es un adjetivo: dice cómo es la casa.",
          "El artículo acompaña al sustantivo: «el niño», «una casa».",
          "El adverbio dice cómo, cuándo o dónde pasa algo:",
          "«corre rápido», «llega hoy», «vive cerca».",
        ],
      },
      {
        q: [
          "Una última pista: ¿qué palabra une «pan» y «queso»?",
          "¿Y qué dices tú cuando algo te sorprende?",
        ],
        h: "Punto 4: Palabras que unen y sienten",
        a: [
          "«Y» une «pan» y «queso»: es una conjunción.",
          "Las conjunciones unen palabras o ideas: «y», «pero», «o».",
          "La preposición relaciona: «en la mesa», «con mamá».",
          "La interjección muestra una emoción de golpe: «¡Bravo!».",
        ],
      },
      {
        q: [
          "Ya conociste todos los trabajos. ¿Recuerdas cuántas",
          "clases hay y cómo se llaman?",
        ],
        h: "Punto 5: Las nueve clases",
        a: [
          "Son nueve: sustantivo, pronombre, verbo, adverbio,",
          "conjunción, interjección, preposición, adjetivo y artículo.",
          "Dilas en voz alta y con ritmo, como una canción.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué clase de palabra nombra personas, cosas y lugares?", o: ["Sustantivo", "Verbo", "Adverbio", "Interjección"] },
        { q: "En «La niña corre», ¿qué palabra dice lo que hace?", o: ["corre", "niña", "La", "Ella"] },
        { q: "¿Para qué sirve un pronombre como «ella»?", o: ["Ocupa el lugar de un nombre", "Dice cómo corre alguien", "Une dos ideas", "Muestra una emoción"] },
        { q: "En «casa grande», ¿cuál es el adjetivo?", o: ["grande", "casa", "en", "y"] },
        { q: "En «llega hoy», ¿qué clase de palabra es «hoy»?", o: ["Adverbio", "Pronombre", "Artículo", "Conjunción"] },
        { q: "¿Qué palabra une «pan» y «queso»?", o: ["y", "¡Bravo!", "grande", "ella"] },
        { q: "En «con mamá», ¿qué clase de palabra es «con»?", o: ["Preposición", "Interjección", "Verbo", "Sustantivo"] },
        { q: "¿Cuál de estas palabras es una interjección?", o: ["¡Bravo!", "con", "pero", "corre"] },
      ],
      write: [
        "Escribe una oración tuya y rodea el sustantivo y el verbo.",
        "Explica con tus palabras para qué sirve un pronombre.",
      ],
      schematic: [
        "Dibuja un esquema con los tres grupos de palabras de hoy.",
        "Dibuja una oración tuya y une cada palabra con su clase.",
      ],
    },
    image: [
      "Dibuja tu cocina o tu cuarto con personas y cosas.",
      "Rotula tres sustantivos, un verbo y un adjetivo.",
      "Debajo de cada etiqueta escribe qué clase de palabra es.",
      "Revisa que tu dibujo muestre a alguien haciendo algo.",
    ],
    summary: "Las palabras tienen trabajos distintos: nombrar, actuar, describir y unir. Hoy conociste las nueve clases.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "esp-c3-w1-d2",
    opening: ayer,
    repaso: [
      "Ayer vimos que cada palabra tiene su propio trabajo.",
      "El sustantivo nombra y el verbo dice lo que alguien hace.",
      "El pronombre ocupa el lugar de un nombre.",
    ],
    units: [
      {
        q: [
          "Ahora te pregunto: «ciudad» y «Barquisimeto» nombran lugares.",
          "¿Son iguales o se escriben de forma distinta?",
        ],
        h: "Punto 1: Sustantivos comunes y propios",
        a: [
          "«Ciudad» es un sustantivo común: sirve para cualquier ciudad.",
          "«Barquisimeto» es un sustantivo propio: es una ciudad concreta.",
          "Los nombres propios siempre empiezan con mayúscula.",
          "Tu nombre y el de tu calle también son propios.",
        ],
      },
      {
        q: [
          "Imagina que llegan más casas. ¿Cómo dirías ahora",
          "«una casa bonita» en plural?",
        ],
        h: "Punto 2: Las palabras se ponen de acuerdo",
        a: [
          "Se dice «unas casas bonitas».",
          "Si hay varias casas, todas las palabras pasan a plural.",
          "«Unas», «casas» y «bonitas» dicen lo mismo: son varias.",
        ],
      },
      {
        q: [
          "Mira: «yo canto». Si canta tu amiga, ¿cómo lo dices?",
          "¿Y si cantas tú?",
        ],
        h: "Punto 3: El verbo cambia según quién actúa",
        a: [
          "Se dice: yo canto, tú cantas, ella canta.",
          "El final del verbo cambia según quién hace la acción.",
          "La parte de adelante, «cant-», siempre se queda igual.",
          "Con «bailar» pasa igual: bailo, bailas, baila.",
        ],
      },
      {
        q: [
          "Un problema: «Sofía pinta un árbol. Sofía regala el árbol.»",
          "Suena repetido. ¿Cómo lo arreglarías?",
        ],
        h: "Punto 4: El pronombre evita repetir",
        a: [
          "Puedes decir: «Sofía pinta un árbol. Ella lo regala.»",
          "«Ella» ocupa el lugar de Sofía.",
          "«Lo» ocupa el lugar del árbol.",
          "Los pronombres nos ayudan a no repetir nombres.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: «ser» y «estar», ¿son",
          "sustantivos o verbos?",
        ],
        h: "Punto 5: Cuidado con las palabras cortas",
        a: [
          "Son verbos, aunque sean cortos.",
          "«Soy» y «está» dicen quién es alguien o cómo está.",
          "Un sustantivo nombra; un verbo cuenta lo que pasa o es.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuál de estas palabras es un sustantivo propio?", o: ["Barquisimeto", "ciudad", "cantar", "ella"] },
        { q: "¿Cómo se dice «una casa bonita» en plural?", o: ["unas casas bonitas", "una casas bonita", "unas casa bonitas", "una casa bonitas"] },
        { q: "Completa: «yo canto», «tú ___», «ella canta».", o: ["cantas", "canto", "cantan", "cantamos"] },
        { q: "¿Qué hace un pronombre como «lo» o «ella»?", o: ["Ocupa el lugar de un nombre", "Dice cómo es una cosa", "Une dos ideas", "Muestra una emoción"] },
        { q: "¿Qué clase de palabra es «ser»?", o: ["Un verbo", "Un sustantivo", "Un pronombre", "Un adjetivo"] },
        { q: "En «Ella lo regala», ¿a quién sustituye «ella»?", o: ["A Sofía", "Al árbol", "A pinta", "A regala"] },
        { q: "¿Con qué letra empieza un sustantivo propio?", o: ["Con mayúscula", "Con minúscula", "Con un número", "Con una tilde"] },
        { q: "¿Cuál de estas oraciones usa un pronombre?", o: ["Ella lo regala.", "Sofía pinta un árbol.", "La casa bonita.", "Un perro pequeño."] },
      ],
      write: [
        "Escribe un sustantivo común y uno propio de tu barrio.",
        "Explica por qué «unas casas bonitas» está bien escrito.",
      ],
      schematic: [
        "Dibuja un esquema: yo, tú y ella con el verbo «cantar».",
        "Dibuja dos columnas: sustantivo común y sustantivo propio.",
      ],
    },
    image: [
      "Dibuja a tu familia haciendo algo en casa.",
      "Escribe el nombre propio de cada persona.",
      "Rotula tres verbos que muestren qué hace cada uno.",
      "Usa «él» o «ella» para no repetir un nombre.",
    ],
    summary: "El sustantivo nombra, el verbo dice qué pasa y el pronombre ocupa el lugar de un nombre.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "esp-c3-w1-d3",
    opening: ayer,
    repaso: [
      "Ayer clasificamos sustantivos, verbos y pronombres.",
      "Preguntamos: ¿quién o qué? y ¿qué hace?",
      "Con esas preguntas encontramos cada clase de palabra.",
    ],
    units: [
      {
        q: [
          "Ahora te pregunto: tienes la palabra «casa». ¿Qué dos",
          "palabras le pondrías para decir cuál es y cómo es?",
        ],
        h: "Punto 1: Artículo y adjetivo acompañan",
        a: [
          "Por ejemplo: «la casa antigua».",
          "«La» es un artículo: dice cuál casa es.",
          "«Antigua» es un adjetivo: dice cómo es la casa.",
          "Los dos van junto al sustantivo y lo acompañan.",
        ],
      },
      {
        q: [
          "Ahora ordena estas palabras para formar una oración:",
          "«pequeño / el / perro / ladra / fuerte».",
        ],
        h: "Punto 2: El orden de las palabras",
        a: [
          "La oración queda: «El perro pequeño ladra fuerte.»",
          "El artículo va antes del sustantivo: «el perro».",
          "El adjetivo va junto al sustantivo: «perro pequeño».",
          "«Fuerte» cuenta cómo ladra el perro.",
        ],
      },
      {
        q: [
          "Compara «corre despacio» con «corre rápido».",
          "¿Qué palabra cambió y cuál se quedó igual?",
        ],
        h: "Punto 3: El adverbio cambia el detalle",
        a: [
          "El verbo «corre» se queda igual.",
          "Lo que cambia es el adverbio: dice cómo corre.",
          "El adverbio dice cómo, cuándo o dónde pasa algo:",
          "«despacio», «ayer», «cerca».",
        ],
      },
      {
        q: [
          "Y si digo «una casa muy grande», ¿qué hace «muy»?",
        ],
        h: "Punto 4: La palabra «muy»",
        a: [
          "«Muy» es un adverbio: hace más fuerte a «grande».",
          "También puede ir con otro adverbio: «muy bien».",
          "Y hay adverbios como «casi»: «casi siempre».",
        ],
      },
      {
        q: [
          "Una duda: ¿se dice «niño rápidamente» o «niño rápido»?",
        ],
        h: "Punto 5: Cada palabra en su lugar",
        a: [
          "Se dice «niño rápido».",
          "«Rápido» es un adjetivo y describe al niño.",
          "«Rápidamente» es un adverbio y va con el verbo:",
          "«corre rápidamente».",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "En «la casa antigua», ¿cuál es el artículo?", o: ["la", "casa", "antigua", "en"] },
        { q: "En «la casa antigua», ¿cuál es el adjetivo?", o: ["antigua", "la", "casa", "y"] },
        { q: "¿Qué dice un adjetivo?", o: ["Cómo es el sustantivo", "Qué hace el sustantivo", "Quién habla", "Dónde termina la oración"] },
        { q: "¿Cómo se ordena «pequeño / el / perro / ladra / fuerte»?", o: ["El perro pequeño ladra fuerte.", "Pequeño el perro fuerte ladra.", "Ladra fuerte el pequeño perro.", "Perro el ladra pequeño fuerte."] },
        { q: "En «corre despacio», ¿cuál es el adverbio?", o: ["despacio", "corre", "el", "niño"] },
        { q: "¿Qué dice el adverbio «ayer»?", o: ["Cuándo pasó algo", "Cómo es una cosa", "Quién actúa", "Cuántos son"] },
        { q: "¿Cuál frase está bien dicha?", o: ["Corre rápidamente.", "Niño rápidamente.", "Rápidamente casa.", "Corre casa."] },
        { q: "En «corre despacio» y «corre rápido», ¿qué cambia?", o: ["El adverbio", "El verbo", "El sustantivo", "El artículo"] },
      ],
      write: [
        "Describe tu mochila con un artículo y un adjetivo.",
        "Escribe dos oraciones gemelas que cambien un adverbio.",
      ],
      schematic: [
        "Dibuja «el perro pequeño ladra fuerte» y rotula cada palabra.",
        "Dibuja un esquema: artículo, adjetivo y adverbio con ejemplos.",
      ],
    },
    image: [
      "Dibuja un animal que se mueve muy rápido o muy despacio.",
      "Escribe su artículo y un adjetivo que lo describa.",
      "Añade un adverbio que diga cómo se mueve.",
      "Revisa que cada etiqueta diga qué clase de palabra es.",
    ],
    summary: "El artículo y el adjetivo acompañan al sustantivo; el adverbio dice cómo, cuándo o dónde pasa algo.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "esp-c3-w1-d4",
    opening: ayer,
    repaso: [
      "Ayer vimos que el artículo y el adjetivo acompañan.",
      "El adverbio dice cómo, cuándo o dónde pasa algo.",
      "Con ellos contamos las cosas con más detalle.",
    ],
    units: [
      {
        q: [
          "Ahora te pregunto: tienes «me gusta jugar» y «hoy llueve».",
          "¿Qué palabra pondrías en medio para unirlas?",
        ],
        h: "Punto 1: La conjunción une ideas",
        a: [
          "Puedes decir: «Me gusta jugar, pero hoy llueve.»",
          "«Pero» es una conjunción: une dos ideas.",
          "«Y» suma ideas y «o» da a escoger.",
          "«Pero» muestra que una idea choca con la otra.",
        ],
      },
      {
        q: [
          "Completa: «Sofía sale ___ su mamá».",
          "¿Qué pasa si pones «con»? ¿Y si pones «sin»?",
        ],
        h: "Punto 2: La preposición relaciona",
        a: [
          "«Con su mamá»: las dos salen juntas.",
          "«Sin su mamá»: Sofía sale sola.",
          "«Con» y «sin» son preposiciones.",
          "También lo son «en», «para» y «por».",
        ],
      },
      {
        q: [
          "Imagina un gato y una caja. ¿Dónde puede estar el gato?",
          "Dilo con tres palabras distintas.",
        ],
        h: "Punto 3: Las preposiciones dicen dónde",
        a: [
          "El gato puede estar «en la caja».",
          "O «sobre la caja», «bajo la caja» o «entre las cajas».",
          "Cambia la preposición y cambia el lugar del gato.",
        ],
      },
      {
        q: [
          "Alguien te pisa el pie. ¿Qué dices de golpe?",
        ],
        h: "Punto 4: La interjección siente",
        a: [
          "Dices «¡Ay!»: es una interjección.",
          "La interjección muestra una emoción de golpe.",
          "Otras son «¡Uy!», «¡Bravo!» y «¡Eh!».",
          "Se escribe entre signos de exclamación.",
        ],
      },
      {
        q: [
          "Quieres escribir un cartel con reglas para tu cuarto.",
          "¿Qué palabras te ayudarían a unir ideas y a decir dónde?",
        ],
        h: "Punto 5: Un cartel con propósito",
        a: [
          "Un cartel usa palabras que unen y que relacionan.",
          "Por ejemplo: «Guarda tus juguetes en la caja y cierra la puerta.»",
          "Aquí «en» relaciona y «y» une dos acciones.",
          "Para unir dos ideas completas usa «y» o «pero».",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué clase de palabra es «pero»?", o: ["Conjunción", "Preposición", "Interjección", "Adverbio"] },
        { q: "Completa: «Quiero helado ___ no hay».", o: ["pero", "en", "¡uy!", "con"] },
        { q: "¿Qué palabra sirve para dar a escoger?", o: ["o", "y", "pero", "¡Ay!"] },
        { q: "En «con su mamá», ¿qué clase de palabra es «con»?", o: ["Preposición", "Conjunción", "Verbo", "Adjetivo"] },
        { q: "¿Qué significa «Sofía sale sin su mamá»?", o: ["Sofía sale sola.", "Sofía sale con ella.", "Sofía se queda dormida.", "Sofía llama a su mamá."] },
        { q: "¿Cuál de estas palabras es una interjección?", o: ["¡Uy!", "para", "pero", "mesa"] },
        { q: "¿Cómo se escribe una interjección?", o: ["Entre signos de exclamación", "Entre comillas", "Sin ningún signo", "Con puntos suspensivos"] },
        { q: "¿Qué palabra suma dos ideas?", o: ["y", "o", "sin", "¡Eh!"] },
      ],
      write: [
        "Escribe una oración con «pero» y otra con «o».",
        "Explica qué cambia entre «con mamá» y «sin mamá».",
      ],
      schematic: [
        "Dibuja un esquema de conjunción, preposición e interjección.",
        "Dibuja tu cartel de tres reglas y rotula cada palabra.",
      ],
    },
    image: [
      "Dibuja a dos amigos jugando en un parque.",
      "Escribe lo que dice cada uno con una interjección.",
      "Añade un cartel que use «y», «pero» u «o».",
      "Rotula una preposición de lugar en tu escena.",
    ],
    summary: "La conjunción une, la preposición relaciona y la interjección muestra una emoción.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "esp-c3-w1-d5",
    opening: ayer,
    repaso: [
      "Esta semana conociste nueve clases de palabras.",
      "Cada una tiene su propio trabajo en la oración.",
      "Hoy las recuerdas y se las cuentas a alguien.",
    ],
    units: [
      {
        q: [
          "Ahora te pregunto: sin mirar nada, ¿cuáles son las",
          "nueve clases de palabras que aprendiste?",
        ],
        w: 3,
        h: "Punto 1: Las nueve clases",
        a: [
          "Son: sustantivo, pronombre, verbo, adverbio, conjunción,",
          "interjección, preposición, adjetivo y artículo.",
          "Si olvidaste alguna, vuelve a decirla en voz alta.",
        ],
      },
      {
        q: [
          "Si las repartes en tres grupos, ¿cómo llamarías",
          "a cada grupo?",
        ],
        h: "Punto 2: Tres grupos de palabras",
        a: [
          "Nombrar, actuar y sustituir: sustantivo, verbo, pronombre.",
          "Describir: adjetivo, artículo y adverbio.",
          "Unir y sentir: conjunción, preposición e interjección.",
        ],
      },
      {
        q: [
          "Lee «¡Uy! La niña alegre corre muy rápido y ella",
          "juega con Luna.» ¿Cuántas clases encuentras?",
        ],
        h: "Punto 3: Una oración con las nueve",
        a: [
          "Están las nueve.",
          "«¡Uy!» es interjección y «la» es artículo.",
          "«Niña» es sustantivo y «alegre» es adjetivo.",
          "«Corre» y «juega» son verbos; «muy» y «rápido», adverbios.",
          "«Y» es conjunción, «ella» es pronombre y «con» es preposición.",
        ],
      },
      {
        q: [
          "Vas a contarle esto a alguien de tu casa.",
          "¿Cómo empezarías tu exposición?",
        ],
        h: "Punto 4: Cómo contarlo con orden",
        a: [
          "Una buena exposición tiene inicio, medio y cierre.",
          "Inicio: «Hoy les voy a contar algo sobre las palabras».",
          "Medio: dos o tres ejemplos tuyos.",
          "Cierre: pide atención con «por favor» y termina con «gracias».",
        ],
      },
      {
        q: [
          "¿Basta con saber la lista de memoria?",
          "¿Qué más necesitas saber de cada palabra?",
        ],
        h: "Punto 5: Saber qué trabajo hace",
        a: [
          "No basta con la lista.",
          "Hay que saber qué trabajo hace cada palabra.",
          "Pregúntate: ¿qué hace esta palabra aquí?",
          "Así sabrás si es sustantivo, verbo o adjetivo.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuántas clases de palabras estudiaste esta semana?", o: ["Nueve", "Cinco", "Siete", "Doce"] },
        { q: "¿Qué grupo describe y da detalles?", o: ["Adjetivo, artículo y adverbio", "Sustantivo, verbo y pronombre", "Conjunción, preposición e interjección", "Verbo, adverbio y pronombre"] },
        { q: "¿Qué grupo une ideas y muestra emoción?", o: ["Conjunción, preposición e interjección", "Adjetivo, artículo y adverbio", "Sustantivo, verbo y pronombre", "Artículo, verbo y pronombre"] },
        { q: "En la oración de hoy, ¿qué clase de palabra es «ella»?", o: ["Pronombre", "Sustantivo", "Adverbio", "Artículo"] },
        { q: "En la oración de hoy, ¿qué clase de palabra es «muy»?", o: ["Adverbio", "Adjetivo", "Verbo", "Conjunción"] },
        { q: "En la oración de hoy, ¿qué clase de palabra es «con»?", o: ["Preposición", "Conjunción", "Pronombre", "Interjección"] },
        { q: "En la oración de hoy, ¿qué clase de palabra es «alegre»?", o: ["Adjetivo", "Sustantivo", "Adverbio", "Verbo"] },
        { q: "¿Cuál palabra de la oración de hoy es una interjección?", o: ["¡Uy!", "Luna", "juega", "y"] },
      ],
      write: [
        "Escribe de memoria las nueve clases de palabras.",
        "Cuenta con tus palabras qué hace cada grupo de palabras.",
      ],
      schematic: [
        "Dibuja un esquema con los tres grupos y sus clases.",
        "Dibuja una oración tuya y une cada palabra con su clase.",
      ],
    },
    image: [
      "Dibuja un árbol con nueve hojas, una por cada clase.",
      "Escribe en cada hoja el nombre de una clase de palabra.",
      "Añade un ejemplo corto en cada hoja.",
      "Revisa que no falte ninguna de las nueve.",
    ],
    summary: "Las nueve clases de palabras se agrupan por su trabajo: nombrar y actuar, describir, unir y sentir.",
  },
];
