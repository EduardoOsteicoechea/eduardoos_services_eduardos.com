/**
 * Exégesis · ciclo 3 · semana 2 · nivel 6 — Romanos 1:2, método "pregunta primero".
 * Pregunta -> espacio para responder -> "Punto N: ..." -> copiar.
 * Hechos: el evangelio de Dios fue prometido de antemano, por medio de sus
 * profetas, en las santas Escrituras (Antiguo Testamento). Versículo parafraseado.
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "exe-c3-w2-d1",
    opening: "¿Se puede anunciar una buena noticia antes de que pase? ¿Cómo?",
    repaso: null,
    units: [
      {
        h: "Punto 1: Un versículo que sigue",
        a: [
          "Romanos 1:2 sigue hablando del evangelio de Dios.",
          "Dice que Dios lo había prometido antes.",
          "No fue una idea de último momento.",
          "Hoy descubrimos las tres partes de esta frase.",
        ],
      },
      {
        q: [
          "Si prometes algo hoy y lo cumples mañana,",
          "¿cuándo hiciste la promesa?",
        ],
        h: "Punto 2: Prometido de antemano",
        a: [
          "«De antemano» quiere decir antes de que ocurra.",
          "Dios anunció el evangelio mucho antes.",
          "Pablo enseña que no era un rumor nuevo.",
          "Ya formaba parte del plan de Dios.",
        ],
      },
      {
        q: [
          "¿Quién crees que lleva un mensaje de parte de Dios?",
          "¿Conoces el nombre de alguno?",
        ],
        h: "Punto 3: Los profetas",
        a: [
          "Los profetas son mensajeros de Dios.",
          "Isaías, Jeremías y Miqueas fueron profetas.",
          "Hablaban de parte de Dios a su pueblo.",
          "Por medio de ellos, Dios preparó el anuncio.",
        ],
      },
      {
        q: [
          "Una promesa hablada se puede olvidar.",
          "¿Dónde crees que quedó guardada esta promesa?",
        ],
        h: "Punto 4: Las santas Escrituras",
        a: [
          "Las Escrituras son los escritos sagrados de la Biblia.",
          "Pablo piensa sobre todo en el Antiguo Testamento.",
          "Allí ya estaba escrita la promesa del evangelio.",
        ],
      },
      {
        q: [
          "El Antiguo y el Nuevo Testamento, ¿son dos historias",
          "sin relación o una sola?",
        ],
        h: "Punto 5: Una sola historia",
        a: [
          "Son una sola historia de Dios.",
          "El primero anuncia y prepara.",
          "El segundo muestra el cumplimiento en Cristo.",
          "No los separes como si no se conocieran.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué dice Romanos 1:2 del evangelio?", o: ["Dios lo prometió antes", "Nadie lo conocía", "Lo inventó Pablo", "Llegó por sorpresa"] },
        { q: "¿Qué significa «de antemano»?", o: ["Antes de que ocurra", "Después de que ocurra", "Nunca", "Al mismo tiempo"] },
        { q: "¿Quiénes son los profetas?", o: ["Mensajeros de Dios", "Soldados de Roma", "Reyes antiguos", "Viajeros"] },
        { q: "¿Cuál de estos fue un profeta?", o: ["Isaías", "Pablo", "Pilato", "Pedro"] },
        { q: "¿Qué son las santas Escrituras?", o: ["Los escritos sagrados de la Biblia", "Cartas de un vecino", "Mapas de Roma", "Canciones"] },
        { q: "¿En qué piensa Pablo sobre todo al decir «Escrituras»?", o: ["En el Antiguo Testamento", "En un periódico", "En libros de Roma", "En un cuaderno"] },
        { q: "¿Qué muestra el Nuevo Testamento?", o: ["El cumplimiento en Cristo", "Otra historia distinta", "Una historia perdida", "Un rumor"] },
        { q: "¿Era el evangelio un rumor nuevo?", o: ["No, formaba parte del plan de Dios", "Sí, apareció ayer", "Sí, lo inventó Pablo", "Nadie lo sabe"] },
      ],
      write: [
        "Explica con tus palabras qué prometió Dios y cuándo.",
        "Escribe qué hacía un profeta en tiempos antiguos.",
      ],
      schematic: [
        "Dibuja una línea del tiempo: promesa antes, cumplimiento después.",
        "Dibuja un esquema con Dios, los profetas y las Escrituras.",
      ],
    },
    image: [
      "Dibuja un rollo antiguo abierto sobre una mesa.",
      "Rotula «Escrituras» en el rollo.",
      "Dibuja a un profeta que habla y rotúlalo.",
      "Escribe arriba «prometido de antemano».",
    ],
    summary: "Dios había prometido el evangelio antes, por medio de sus profetas, en las santas Escrituras.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "exe-c3-w2-d2",
    opening: ayer,
    repaso: [
      "Ayer vimos que Dios prometió el evangelio antes.",
      "Hablamos de los profetas y de las santas Escrituras.",
      "Dijimos que el plan de Dios no fue repentino.",
    ],
    units: [
      {
        q: [
          "Si un amigo te dice «te lo prometo», ¿qué te asegura?",
        ],
        h: "Punto 1: Prometer",
        a: [
          "Prometer es asegurar que algo va a pasar.",
          "Una promesa mira hacia adelante.",
          "Dios aseguró algo en Romanos 1:2.",
          "Esa promesa se cumpliría después.",
        ],
      },
      {
        q: [
          "Y «de antemano», ¿es antes o después de que algo",
          "ocurra?",
        ],
        h: "Punto 2: De antemano",
        a: [
          "Es antes de que ocurra.",
          "Dios anunció el evangelio antes de Cristo.",
          "Su plan no empezó de repente.",
          "Cumplió algo que ya había anunciado.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿esta promesa es igual",
          "que una promesa humana cualquiera?",
        ],
        h: "Punto 3: Promesa de Dios",
        a: [
          "Pablo no habla de un simple deseo.",
          "Habla del plan de Dios.",
          "Por eso la promesa es firme.",
          "No la leemos como una promesa humana cualquiera.",
        ],
      },
      {
        q: [
          "Haz una tarjeta: de un lado, Romanos 1:2.",
          "¿Qué escribirías del otro lado?",
        ],
        h: "Punto 4: La tarjeta",
        a: [
          "Un lado: el versículo, Romanos 1:2.",
          "Otro lado: qué significa «de antemano».",
          "Puedes escribir: Dios anunció el evangelio antes.",
        ],
      },
      {
        q: [
          "Ahora tú: completa «Dios prometió el evangelio ___",
          "de que llegara».",
        ],
        h: "Punto 5: Completa la frase",
        a: [
          "La palabra que falta es «antes».",
          "Dios prometió el evangelio antes de que llegara.",
          "Eso es lo que quiere decir «de antemano».",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es prometer?", o: ["Asegurar que algo va a pasar", "Olvidar algo", "Pedir algo", "Esconder algo"] },
        { q: "¿Hacia dónde mira una promesa?", o: ["Hacia adelante", "Hacia atrás", "Hacia ningún lado", "Hacia abajo"] },
        { q: "¿Qué significa «de antemano»?", o: ["Antes de que ocurra", "Después de que ocurra", "Mientras ocurre", "Nunca ocurre"] },
        { q: "¿Cuándo anunció Dios el evangelio?", o: ["Antes de Cristo", "Después de Cristo", "Ayer", "Nunca"] },
        { q: "¿De qué habla Pablo al decir «prometió»?", o: ["Del plan de Dios", "De un deseo humano", "De un rumor", "De un juego"] },
        { q: "¿Cómo empezó el plan de Dios?", o: ["No empezó de repente", "De repente", "Sin que nadie supiera", "Por casualidad"] },
        { q: "¿Qué escribes en un lado de la tarjeta?", o: ["Romanos 1:2", "Romanos 1:1", "Juan 3:16", "Tu nombre"] },
        { q: "Completa: Dios prometió el evangelio ___ de que llegara.", o: ["antes", "después", "mientras", "nunca"] },
      ],
      write: [
        "Escribe qué significa «prometió de antemano».",
        "Explica por qué la promesa de Dios no fue repentina.",
      ],
      schematic: [
        "Dibuja una línea: primero la promesa, luego el cumplimiento.",
        "Dibuja tu tarjeta con Romanos 1:2 de un lado y su idea del otro.",
      ],
    },
    image: [
      "Dibuja una tarjeta con dos lados.",
      "En un lado escribe «Romanos 1:2».",
      "En el otro escribe qué es «de antemano».",
      "Añade una flecha del pasado al cumplimiento.",
    ],
    summary: "Prometió de antemano quiere decir que Dios anunció el evangelio antes de que se cumpliera.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "exe-c3-w2-d3",
    opening: ayer,
    repaso: [
      "Ayer vimos que prometer es asegurar algo.",
      "«De antemano» quiere decir antes de que ocurra.",
      "Dios anunció el evangelio antes de Cristo.",
    ],
    units: [
      {
        q: [
          "Dios prometió el evangelio. ¿Por medio de quiénes",
          "lo dio a conocer?",
        ],
        h: "Punto 1: Por medio de sus profetas",
        a: [
          "Pablo dice: por medio de sus profetas.",
          "Dios habló a lo largo del tiempo.",
          "Usó mensajeros para anunciar su promesa.",
          "Esos mensajeros se llaman profetas.",
        ],
      },
      {
        q: [
          "¿Un profeta es un adivino que dice qué pasará mañana?",
        ],
        h: "Punto 2: Qué es un profeta",
        a: [
          "No. Un profeta anuncia la palabra de Dios.",
          "A veces advierte al pueblo.",
          "Otras veces le da esperanza.",
        ],
      },
      {
        q: [
          "¿Recuerdas el nombre de algún profeta?",
          "Escribe los que sepas.",
        ],
        h: "Punto 3: Profetas conocidos",
        a: [
          "Isaías, Jeremías y Miqueas fueron profetas.",
          "Son profetas del Antiguo Testamento.",
          "Cada uno llevó mensajes de Dios a su pueblo.",
          "Pablo dice que Dios usó profetas para su promesa.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿un profeta es lo mismo",
          "que un poeta cualquiera?",
        ],
        h: "Punto 4: Mensajero, no poeta",
        a: [
          "No. El poeta escribe lo que imagina.",
          "El profeta habla como mensajero de Dios.",
          "Por eso Pablo los menciona en el versículo.",
        ],
      },
      {
        q: [
          "Ahora tú: ¿cómo unirías «prometido», «profetas»",
          "y «evangelio» en una sola oración?",
        ],
        h: "Punto 5: Tres palabras, una oración",
        a: [
          "Dios prometió el evangelio por medio de sus profetas.",
          "Son tres ideas conectadas en una frase.",
          "Comprueba que las tres estén en el versículo.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Por medio de quiénes prometió Dios el evangelio?", o: ["De sus profetas", "De los soldados", "De los reyes de Roma", "De los vecinos"] },
        { q: "¿Qué hace un profeta?", o: ["Anuncia la palabra de Dios", "Adivina juegos", "Cobra impuestos", "Dibuja mapas"] },
        { q: "¿Qué hace a veces un profeta con el pueblo?", o: ["Lo advierte", "Lo olvida", "Lo vende", "Lo engaña"] },
        { q: "¿Qué da otras veces un profeta al pueblo?", o: ["Esperanza", "Impuestos", "Un viaje", "Un juego"] },
        { q: "¿Cuál de estos fue un profeta?", o: ["Miqueas", "Pablo", "Pilato", "Pedro"] },
        { q: "¿En qué parte de la Biblia están los profetas?", o: ["En el Antiguo Testamento", "Solo en Romanos", "En ninguna", "En un mapa"] },
        { q: "¿Un profeta es lo mismo que un poeta?", o: ["No, habla como mensajero de Dios", "Sí, son iguales", "Sí, escriben lo que imaginan", "Solo en Roma"] },
        { q: "¿Cuál oración une las tres palabras de hoy?", o: ["Dios prometió el evangelio por sus profetas.", "Pablo viajó a Roma.", "El poeta escribió un verso.", "Siervo y apóstol."] },
      ],
      write: [
        "Escribe dos profetas y qué tipo de mensaje daban.",
        "Explica en una oración la diferencia entre profeta y poeta.",
      ],
      schematic: [
        "Dibuja a Dios, un profeta y el pueblo con flechas de mensaje.",
        "Dibuja un esquema: prometido, profetas y evangelio.",
      ],
    },
    image: [
      "Dibuja a un profeta con un rollo en las manos.",
      "Rotula «mensajero de Dios».",
      "Dibuja al pueblo escuchando.",
      "Escribe el nombre de un profeta conocido.",
    ],
    summary: "Dios prometió el evangelio por medio de sus profetas, que fueron mensajeros de su palabra.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "exe-c3-w2-d4",
    opening: ayer,
    repaso: [
      "Ayer hablamos de los profetas.",
      "Son mensajeros que hablan de parte de Dios.",
      "Dios prometió el evangelio por medio de ellos.",
    ],
    units: [
      {
        q: [
          "Una promesa hablada se puede olvidar fácil.",
          "¿Cómo se guarda mejor una promesa?",
        ],
        h: "Punto 1: Escribir la promesa",
        a: [
          "Escrita, la promesa queda guardada.",
          "Pablo dice que está en las santas Escrituras.",
          "Son los escritos sagrados de la Biblia.",
        ],
      },
      {
        q: [
          "Cuando Pablo dice «Escrituras», ¿en qué libros",
          "crees que piensa?",
        ],
        h: "Punto 2: El Antiguo Testamento",
        a: [
          "Piensa sobre todo en el Antiguo Testamento.",
          "Allí ya estaba escrita la promesa.",
          "El evangelio está unido a lo que Dios ya había dicho.",
          "No depende de un rumor ni de una idea nueva.",
        ],
      },
      {
        q: [
          "¿Por qué importa que la promesa esté escrita?",
        ],
        h: "Punto 3: Por qué importa",
        a: [
          "Se puede leer una y otra vez.",
          "Se puede comprobar y enseñar a otros.",
          "No depende de lo que alguien recuerde.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿Romanos 1:2 repite lo que dijo",
          "Romanos 1:1?",
        ],
        h: "Punto 4: Cada versículo dice lo suyo",
        a: [
          "No. Romanos 1:1 presentó a Pablo.",
          "Romanos 1:2 une el evangelio con las Escrituras.",
          "Cada versículo aporta algo distinto.",
          "Hoy nos quedamos con lo que dice el segundo.",
        ],
      },
      {
        q: [
          "Ahora tú: si reescribes Romanos 1:2 con tus palabras,",
          "¿qué tres palabras no pueden faltar?",
        ],
        h: "Punto 5: Romanos 1:2 con tus palabras",
        a: [
          "No pueden faltar evangelio, profetas y Escrituras.",
          "Por ejemplo: Dios prometió el evangelio antes.",
          "Lo anunció por sus profetas y quedó en las Escrituras.",
          "Comprueba que no añadiste ideas ajenas.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cómo se guarda mejor una promesa?", o: ["Escrita", "Solo hablada", "Olvidada", "Escondida"] },
        { q: "¿Dónde dice Pablo que está la promesa?", o: ["En las santas Escrituras", "En un mapa", "En una canción", "En un rumor"] },
        { q: "¿Qué son las santas Escrituras?", o: ["Los escritos sagrados de la Biblia", "Cartas de Roma", "Cuentos nuevos", "Notas de clase"] },
        { q: "¿En qué piensa Pablo sobre todo?", o: ["En el Antiguo Testamento", "En un periódico", "En una carta nueva", "En un diario"] },
        { q: "¿De qué depende el evangelio?", o: ["De lo que Dios ya había dicho", "De un rumor", "De una idea nueva", "De la memoria de alguien"] },
        { q: "¿Por qué importa que la promesa esté escrita?", o: ["Se puede leer y comprobar", "Para que nadie la lea", "Para olvidarla", "Para cambiarla"] },
        { q: "¿Qué une Romanos 1:2 con el evangelio?", o: ["Las Escrituras", "Los soldados", "El viaje", "Un mapa"] },
        { q: "¿Qué tres palabras no pueden faltar al reescribirlo?", o: ["Evangelio, profetas y Escrituras", "Roma, viaje y carta", "Siervo, rey y juez", "Pablo, mapa y río"] },
      ],
      write: [
        "Reescribe Romanos 1:2 con tus palabras en una oración.",
        "Explica por qué importa que la promesa esté escrita.",
      ],
      schematic: [
        "Dibuja un esquema: promesa, profetas y Escrituras.",
        "Dibuja dos versículos y rotula qué dice cada uno.",
      ],
    },
    image: [
      "Dibuja un libro grande abierto con la palabra «Escrituras».",
      "Escribe dentro «promesa del evangelio».",
      "Añade una flecha que venga de los profetas.",
      "Rotula «Antiguo Testamento» junto al libro.",
    ],
    summary: "La promesa del evangelio quedó escrita en las santas Escrituras, sobre todo en el Antiguo Testamento.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "exe-c3-w2-d5",
    opening: ayer,
    repaso: [
      "Esta semana leímos Romanos 1:2 con cuidado.",
      "Dios prometió el evangelio antes, por sus profetas.",
      "Esa promesa quedó en las santas Escrituras.",
    ],
    units: [
      {
        q: [
          "Sin mirar nada, ¿qué dice Romanos 1:2? Cuéntalo",
          "con tus palabras.",
        ],
        w: 3,
        h: "Punto 1: Romanos 1:2 en una frase",
        a: [
          "Dios prometió el evangelio antes, por sus profetas.",
          "Esa promesa está en las santas Escrituras.",
          "Si olvidaste algo, dilo otra vez en voz alta.",
        ],
      },
      {
        q: [
          "¿Qué quiere decir «de antemano»?",
          "¿Qué nos enseña sobre el plan de Dios?",
        ],
        h: "Punto 2: De antemano",
        a: [
          "Quiere decir antes de que ocurra.",
          "El plan de Dios no empezó de repente.",
          "Dios cumplió algo que ya había anunciado.",
        ],
      },
      {
        q: [
          "¿Quiénes son los profetas y qué son las Escrituras?",
        ],
        h: "Punto 3: Profetas y Escrituras",
        a: [
          "Los profetas son mensajeros de Dios.",
          "Isaías, Jeremías y Miqueas fueron profetas.",
          "Las Escrituras son los escritos sagrados.",
          "Pablo piensa sobre todo en el Antiguo Testamento.",
        ],
      },
      {
        q: [
          "Vas a contárselo a alguien de tu casa.",
          "¿Cómo empezarías tu exposición?",
        ],
        h: "Punto 4: Cómo contarlo con orden",
        a: [
          "Una buena exposición tiene inicio, medio y cierre.",
          "Inicio: «Hoy les cuento una promesa de Dios».",
          "Medio: de antemano, los profetas y las Escrituras.",
          "Cierre: lo que dice el versículo, y gracias.",
        ],
      },
      {
        q: [
          "¿Basta con decir «evangelio» y nada más?",
          "¿Qué más dice el versículo?",
        ],
        h: "Punto 5: No reducir el versículo",
        a: [
          "No basta una sola palabra.",
          "El versículo dice cuándo, por quiénes y dónde.",
          "Antes, por sus profetas y en las Escrituras.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué versículo leímos esta semana?", o: ["Romanos 1:2", "Romanos 1:1", "Génesis 1:1", "Salmo 23"] },
        { q: "¿Qué prometió Dios de antemano?", o: ["El evangelio", "Un viaje a Roma", "Un mapa", "Un libro nuevo"] },
        { q: "¿Qué significa «de antemano»?", o: ["Antes de que ocurra", "Después de que ocurra", "Mientras ocurre", "Nunca"] },
        { q: "¿Por medio de quiénes lo prometió?", o: ["De sus profetas", "De los soldados", "De los jueces de Roma", "De los vecinos"] },
        { q: "¿Dónde quedó escrita la promesa?", o: ["En las santas Escrituras", "En un mapa", "En una canción", "En un rumor"] },
        { q: "¿Cuál fue un profeta?", o: ["Isaías", "Pablo", "Pilato", "Pedro"] },
        { q: "¿Qué parte de la Biblia piensa Pablo sobre todo?", o: ["El Antiguo Testamento", "Un periódico", "Una carta nueva", "Un diario"] },
        { q: "¿Cómo se cierra una buena exposición?", o: ["Con lo que dice el versículo", "Sin decir nada", "Con un chiste largo", "Con un rumor"] },
      ],
      write: [
        "Escribe Romanos 1:2 con tus palabras en dos frases.",
        "Cuenta cómo empezarías tu exposición para tu familia.",
      ],
      schematic: [
        "Dibuja un esquema: promesa, profetas y Escrituras.",
        "Dibuja las tres partes de una exposición: inicio, medio y cierre.",
      ],
    },
    image: [
      "Dibuja un camino con tres señales.",
      "Rotula las señales: antemano, profetas y Escrituras.",
      "Al final del camino escribe «evangelio».",
      "Revisa que cada palabra salga del versículo.",
    ],
    summary: "Romanos 1:2: Dios prometió el evangelio antes, por sus profetas, y quedó en las santas Escrituras.",
  },
];
