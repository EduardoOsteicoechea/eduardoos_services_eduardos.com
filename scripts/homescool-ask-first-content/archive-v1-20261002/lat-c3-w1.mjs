/**
 * Latín · ciclo 3 · semana 1 · nivel 6 — narrativa inductiva, todo "pregunta primero".
 * Tema de la semana: preposiciones latinas cortas (in, apud, per, sine, a/ab, de)
 * y la relación que marca cada una (lugar, compañía, camino, ausencia, origen, tema).
 * Una línea = una idea legible (~60 caracteres máx.).
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "lat-c3-w1-d1",
    opening: "¿Es igual «el gato en la caja» que «el gato con la caja»?",
    repaso: null,
    units: [
      {
        h: "Punto 1: Palabras pequeñas que unen",
        a: [
          "No es igual: «en» y «con» cambian la historia.",
          "Son preposiciones: palabras cortas que muestran una relación.",
          "Una relación dice dónde, con quién, por dónde o de dónde.",
          "El latín también tiene preposiciones: hoy conocerás seis.",
          "Primero entiende la relación; después traduce la frase.",
        ],
      },
      {
        q: [
          "Imagina que dices «en el agua» y «con los amigos».",
          "¿Crees que en latín usan la misma palabra para las dos?",
        ],
        h: "Punto 2: In y apud",
        a: [
          "No: el latín usa dos palabras distintas.",
          "«In» suele significar «en»: in aqua es «en el agua».",
          "«Apud» significa «con» o «junto a».",
          "Apud amicos es «con los amigos».",
          "«In» habla de lugar; «apud» habla de compañía.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿«por el camino» y «sin agua»",
          "dicen lo mismo?",
        ],
        h: "Punto 3: Per y sine",
        a: [
          "No: una habla de un camino y la otra de algo que falta.",
          "«Per» significa «por»: per viam es «por el camino».",
          "«Sine» significa «sin»: sine aqua es «sin agua».",
          "Si hay camino o medio, piensa en per.",
          "Si algo falta, piensa en sine.",
        ],
      },
      {
        q: [
          "¿Y si una carta llega desde la ciudad? ¿Y si hablamos",
          "acerca de un libro? ¿Usarías la misma palabra?",
        ],
        h: "Punto 4: A/ab y de",
        a: [
          "Hay dos palabras: «a/ab» y «de».",
          "«A/ab» marca de dónde viene algo: ab urbe es «desde la ciudad».",
          "Suele ser «a» ante consonante y «ab» ante vocal.",
          "«De» marca el tema: de libro es «acerca del libro».",
        ],
      },
      {
        q: [
          "Ya conoces seis palabras. ¿Qué debes preguntarte primero",
          "cuando veas una de ellas?",
        ],
        h: "Punto 5: Primero la relación",
        a: [
          "Pregúntate: ¿dónde, con quién, por dónde o de dónde?",
          "Después traduce la frase completa.",
          "Recuerda la lista completa:",
          "in = en · apud = con · per = por · sine = sin ·",
          "a/ab = de · de = de.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué significa «in aqua»?", o: ["En el agua", "Con el agua", "Sin agua", "Por el agua"] },
        { q: "¿Qué significa «apud amicos»?", o: ["Con los amigos", "En los amigos", "Sin amigos", "Por los amigos"] },
        { q: "¿Qué significa «per viam»?", o: ["Por el camino", "Sin camino", "En el camino", "Con el camino"] },
        { q: "¿Qué significa «sine aqua»?", o: ["Sin agua", "Con agua", "En el agua", "Por el agua"] },
        { q: "¿Qué idea expresa «ab urbe»?", o: ["De dónde viene algo", "Con quién estás", "Qué falta", "Por dónde vas"] },
        { q: "¿Qué marca «de» en «de libro»?", o: ["El tema: acerca del libro", "Compañía", "Ausencia", "Camino"] },
        { q: "¿Qué es una preposición?", o: ["Palabra corta que muestra una relación", "Palabra que nombra animales", "Palabra que cuenta cosas", "Un verbo en pasado"] },
        { q: "¿Qué debes pensar primero al leer estas palabras?", o: ["La relación que marcan", "Cambiar el orden", "Saltar la palabra corta", "Traducir al azar"] },
      ],
      write: [
        "Escribe una frase con «en» y otra con «con».",
        "Explica con tus palabras para qué sirven per y sine.",
      ],
      schematic: [
        "Dibuja un esquema con las seis palabras y su relación.",
        "Dibuja un camino con per y una caja vacía con sine.",
      ],
    },
    image: [
      "Dibuja un lago, un camino y unos amigos juntos.",
      "Rotula in aqua en el lago y per viam en el camino.",
      "Rotula apud amicos junto a los amigos.",
      "Escribe al lado de cada rótulo qué significa.",
    ],
    summary: "Las preposiciones latinas son palabras cortas que muestran relaciones: lugar, compañía, camino, ausencia, origen y tema.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "lat-c3-w1-d2",
    opening: ayer,
    repaso: [
      "Ayer vimos que las preposiciones muestran una relación.",
      "Conociste seis: in, apud, per, sine, a/ab y de.",
      "Hoy practicas solo dos: in y apud.",
    ],
    units: [
      {
        q: [
          "Empecemos. ¿Qué pregunta responde «in»: «¿en dónde?»",
          "o «¿con quién?»",
        ],
        h: "Punto 1: In responde ¿en dónde?",
        a: [
          "«In» responde «¿en dónde?».",
          "In schola es «en la escuela».",
          "In aqua es «en el agua».",
          "In domo es «en la casa».",
        ],
      },
      {
        q: [
          "Y «apud», ¿qué pregunta responde? Piensa en tus amigos.",
        ],
        h: "Punto 2: Apud responde ¿con quién?",
        a: [
          "«Apud» responde «¿con quién?» o «¿junto a quién?».",
          "Apud magistrum es «con el maestro».",
          "Apud amicos es «con los amigos».",
          "Apud habla de compañía o cercanía.",
        ],
      },
      {
        q: [
          "Si quieres decir «en la escuela», ¿usas «in» o «apud»?",
        ],
        h: "Punto 3: No las cambies",
        a: [
          "Usas «in»: estás dentro de un lugar.",
          "Si hablas de estar en un lugar, usa «in».",
          "Si hablas de estar con alguien, usa «apud».",
          "Cambiar una por otra cambia el sentido.",
        ],
      },
      {
        q: [
          "Ahora tú: si cambias «magistrum» por «amicos», ¿qué",
          "cambia en «apud magistrum»?",
        ],
        h: "Punto 4: Cambia la compañía",
        a: [
          "Cambia con quién estás, pero «apud» sigue igual.",
          "Apud magistrum es «con el maestro».",
          "Apud amicos es «con los amigos».",
          "La compañía cambió; la relación sigue siendo compañía.",
        ],
      },
      {
        q: [
          "Para terminar, ¿cómo dirías en latín «en la escuela»",
          "y «con el maestro»?",
        ],
        h: "Punto 5: Armar parejas",
        a: [
          "«En la escuela» es «in schola».",
          "«Con el maestro» es «apud magistrum».",
          "Primero elige la relación: lugar o compañía.",
          "Luego escoge entre in y apud.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué pregunta responde «in»?", o: ["¿En dónde?", "¿Con quién?", "¿Por dónde?", "¿Qué falta?"] },
        { q: "¿Qué pregunta responde «apud»?", o: ["¿Con quién?", "¿En dónde?", "¿Por dónde?", "¿Qué falta?"] },
        { q: "¿Qué significa «in schola»?", o: ["En la escuela", "Con la escuela", "Sin escuela", "Por la escuela"] },
        { q: "¿Qué significa «apud magistrum»?", o: ["Con el maestro", "En el maestro", "Sin maestro", "Por el maestro"] },
        { q: "Para decir «en la escuela», ¿qué palabra usas?", o: ["in", "apud", "per", "sine"] },
        { q: "Para estar «con el maestro», ¿qué palabra usas?", o: ["apud", "in", "per", "sine"] },
        { q: "¿Qué significa «apud amicos»?", o: ["Con los amigos", "En los amigos", "Sin amigos", "Por los amigos"] },
        { q: "¿Qué relación muestra «in domo»?", o: ["Lugar: en la casa", "Compañía", "Ausencia", "Camino"] },
      ],
      write: [
        "Escribe dos frases con «in» y dos con «apud».",
        "Explica cuándo usas «in» y cuándo «apud».",
      ],
      schematic: [
        "Dibuja una escuela y rotula «in schola».",
        "Dibuja niños con su maestro y rotula «apud magistrum».",
      ],
    },
    image: [
      "Dibuja una escuela con un niño dentro.",
      "Rotula la escuela: in schola.",
      "Dibuja a unos niños junto a su maestro.",
      "Rotula al grupo: apud magistrum.",
    ],
    summary: "«In» dice en dónde estás; «apud» dice con quién o junto a quién estás.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "lat-c3-w1-d3",
    opening: ayer,
    repaso: [
      "Ayer practicaste «in» y «apud».",
      "Ayer viste que «in» dice dónde y «apud» dice con quién.",
      "Hoy aprendes dos relaciones nuevas: camino y ausencia.",
    ],
    units: [
      {
        q: [
          "Imagina que viajas por un bosque. ¿Cómo crees que se",
          "dice «por el bosque»?",
        ],
        h: "Punto 1: Per marca el camino",
        a: [
          "«Per» significa «por» o «a través de».",
          "Per silvam es «por el bosque».",
          "Per mare es «por el mar».",
          "Per marca por dónde pasas o con qué medio.",
        ],
      },
      {
        q: [
          "Ahora el bosque se queda a oscuras. ¿Cómo dirías",
          "«sin luz»?",
        ],
        h: "Punto 2: Sine marca lo que falta",
        a: [
          "«Sine» significa «sin».",
          "Sine luce es «sin luz».",
          "Sine nave es «sin barco».",
          "Sine dice que algo falta.",
        ],
      },
      {
        q: [
          "Compara «por el mar» y «sin barco». ¿Qué cambia",
          "si quitas el barco?",
        ],
        h: "Punto 3: Quitar el medio",
        a: [
          "Per mare es ir por el mar.",
          "Sine nave es estar sin barco.",
          "Al quitar el barco, cambió la relación.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿«sine» puede significar «por»?",
        ],
        h: "Punto 4: No las confundas",
        a: [
          "No: «sine» es «sin», nunca «por».",
          "Si algo falta, usa sine.",
          "Si hay camino o medio, usa per.",
          "Pregúntate: ¿falta algo o paso por un sitio?",
        ],
      },
      {
        q: [
          "Ahora tú: arma una frase con «per» y otra con «sine».",
        ],
        h: "Punto 5: Tus propias frases",
        a: [
          "Por ejemplo: per viam es «por el camino».",
          "Y sine aqua es «sin agua».",
          "Lee tus frases en voz alta.",
          "Marca la preposición para no perderla.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué significa «per silvam»?", o: ["Por el bosque", "Sin bosque", "En el bosque", "Con el bosque"] },
        { q: "¿Qué significa «sine luce»?", o: ["Sin luz", "Con luz", "En la luz", "Por la luz"] },
        { q: "¿Qué significa «per mare»?", o: ["Por el mar", "Sin mar", "En el mar", "Con el mar"] },
        { q: "¿Qué significa «sine nave»?", o: ["Sin barco", "Con barco", "Por el barco", "En el barco"] },
        { q: "¿Qué relación marca «per»?", o: ["Camino o medio", "Ausencia", "Compañía", "Origen"] },
        { q: "¿Qué relación marca «sine»?", o: ["Ausencia: algo falta", "Camino", "Lugar", "Tema"] },
        { q: "¿Cómo dices «por el camino» en latín?", o: ["per viam", "sine via", "apud viam", "ab via"] },
        { q: "¿Cómo dices «sin agua» en latín?", o: ["sine aqua", "per aquam", "in aqua", "apud aquam"] },
      ],
      write: [
        "Escribe dos frases con «por» y dos con «sin».",
        "Explica cuándo usas per y cuándo sine.",
      ],
      schematic: [
        "Dibuja un barco en el mar y rotula «per mare».",
        "Dibuja un mar sin barco y rotula «sine nave».",
      ],
    },
    image: [
      "Dibuja un bosque con un sendero y una lámpara apagada.",
      "Rotula el sendero: per silvam.",
      "Rotula la lámpara apagada: sine luce.",
      "Escribe al lado qué significa cada rótulo.",
    ],
    summary: "«Per» marca por dónde pasas o con qué medio; «sine» marca lo que falta.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "lat-c3-w1-d4",
    opening: ayer,
    repaso: [
      "Ayer contrastaste per y sine.",
      "Per marca el camino y sine marca lo que falta.",
      "Hoy cierras con a/ab y de, que parecen iguales.",
    ],
    units: [
      {
        q: [
          "Dos palabras latinas se traducen «de». ¿Crees que",
          "preguntan lo mismo?",
        ],
        h: "Punto 1: Dos palabras, dos preguntas",
        a: [
          "No: se parecen en español, pero el latín las distingue.",
          "«A/ab» pregunta: ¿desde dónde viene algo?",
          "«De» pregunta: ¿acerca de qué se habla?",
          "Por eso conviene preguntar antes de traducir.",
        ],
      },
      {
        q: [
          "Imagina que alguien llega desde la ciudad. ¿Qué palabra",
          "usarías: a/ab o de?",
        ],
        h: "Punto 2: A/ab marca el origen",
        a: [
          "Usarías a/ab, porque marca de dónde viene.",
          "Ab urbe es «desde la ciudad».",
          "A silva es «desde el bosque».",
          "Suele ser «a» ante consonante y «ab» ante vocal.",
        ],
      },
      {
        q: [
          "Ahora cuentas de qué trata un libro. ¿Qué palabra",
          "usarías?",
        ],
        h: "Punto 3: De marca el tema",
        a: [
          "Usarías «de», porque dices acerca de qué se habla.",
          "De libro es «acerca del libro».",
          "De amicis es «acerca de los amigos».",
          "«De» marca el tema.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿«ab urbe» y «de libro»",
          "responden la misma pregunta?",
        ],
        h: "Punto 4: Una tabla de dos columnas",
        a: [
          "No: una dice de dónde viene algo.",
          "La otra dice de qué se habla.",
          "Haz una tabla de dos columnas: a/ab y de.",
          "Pon un ejemplo en cada columna sin mezclarlos.",
        ],
      },
      {
        q: [
          "Sigamos. ¿Cómo dirías «desde el bosque» y",
          "«acerca de los amigos»?",
        ],
        h: "Punto 5: Escoger con una pregunta",
        a: [
          "«Desde el bosque» es «a silva».",
          "«Acerca de los amigos» es «de amicis».",
          "Primero pregunta: ¿origen o tema?",
          "Después escoge a/ab o de.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué significa «ab urbe»?", o: ["Desde la ciudad", "Acerca de la ciudad", "Sin ciudad", "Por la ciudad"] },
        { q: "¿Qué significa «a silva»?", o: ["Desde el bosque", "Acerca del bosque", "Sin bosque", "En el bosque"] },
        { q: "¿Qué significa «de libro»?", o: ["Acerca del libro", "Sin libro", "Por el libro", "Con el libro"] },
        { q: "¿Qué significa «de amicis»?", o: ["Acerca de los amigos", "Con los amigos", "Sin amigos", "Por los amigos"] },
        { q: "¿Qué pregunta responde «a/ab»?", o: ["¿Desde dónde viene?", "¿Acerca de qué?", "¿Con quién?", "¿Qué falta?"] },
        { q: "¿Qué pregunta responde «de»?", o: ["¿Acerca de qué se habla?", "¿Desde dónde viene?", "¿Por dónde pasa?", "¿Con quién está?"] },
        { q: "¿Cuándo usas «ab» en vez de «a»?", o: ["Ante una vocal", "Ante una consonante", "Al final de la frase", "Nunca"] },
        { q: "¿Cómo dices «desde la ciudad» en latín?", o: ["ab urbe", "apud urbem", "per urbem", "sine urbe"] },
      ],
      write: [
        "Escribe una frase con a/ab y otra con de.",
        "Explica qué pregunta hace cada una.",
      ],
      schematic: [
        "Dibuja una tabla de dos columnas: a/ab y de.",
        "Dibuja una flecha desde una ciudad y rotula «ab urbe».",
      ],
    },
    image: [
      "Dibuja una ciudad con un camino que sale de ella.",
      "Rotula una flecha que sale de la ciudad: ab urbe.",
      "Dibuja un libro abierto y rotula: de libro.",
      "Escribe qué pregunta responde cada rótulo.",
    ],
    summary: "«A/ab» dice de dónde viene algo; «de» dice acerca de qué se habla.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "lat-c3-w1-d5",
    opening: ayer,
    repaso: [
      "Esta semana conociste seis preposiciones latinas.",
      "Cada una muestra una relación distinta.",
      "Hoy las recuerdas y las cuentas con orden.",
    ],
    units: [
      {
        q: [
          "Sin mirar nada, ¿cuáles son las seis palabras y qué",
          "significa cada una?",
        ],
        w: 3,
        h: "Punto 1: Las seis palabras",
        a: [
          "Son estas:",
          "in = en · apud = con · per = por · sine = sin ·",
          "a/ab = de · de = de.",
          "Si olvidaste alguna, dila otra vez en voz alta.",
        ],
      },
      {
        q: [
          "Si las repartes por la relación que muestran,",
          "¿cómo las agruparías?",
        ],
        h: "Punto 2: Seis relaciones",
        a: [
          "Lugar: in. Compañía o cercanía: apud.",
          "Camino o medio: per. Ausencia: sine.",
          "Origen: a/ab. Tema: de.",
          "Cada palabra responde una pregunta distinta.",
        ],
      },
      {
        q: [
          "Lee: «sine aqua», «ab urbe» e «in schola». ¿Qué",
          "relación muestra cada una?",
        ],
        h: "Punto 3: Leer frases cortas",
        a: [
          "«Sine aqua» es «sin agua»: algo falta.",
          "«Ab urbe» es «desde la ciudad»: origen.",
          "«In schola» es «en la escuela»: lugar.",
          "Traduce primero la relación y luego la frase.",
        ],
      },
      {
        q: [
          "Vas a explicar esto a alguien de tu casa.",
          "¿Cómo empezarías tu exposición?",
        ],
        h: "Punto 4: Cómo contarlo con orden",
        a: [
          "Inicio: «Hoy les voy a enseñar palabras en latín».",
          "Medio: tres ejemplos, como «per viam» y «apud amicos».",
          "Di qué significa cada uno y qué relación muestra.",
          "Cierre: repite la lista y termina con «gracias».",
        ],
      },
      {
        q: [
          "¿Basta con memorizar la lista? ¿Qué debes preguntarte",
          "cada vez que veas una de estas palabras?",
        ],
        h: "Punto 5: Preguntar antes de traducir",
        a: [
          "No basta con la lista.",
          "Pregúntate: ¿dónde, con quién, por dónde, de dónde?",
          "También: ¿falta algo o se habla acerca de algo?",
          "Así traduces con sentido y no al azar.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué significa «apud»?", o: ["Con o junto a", "En", "Sin", "Por"] },
        { q: "¿Qué significa «sine»?", o: ["Sin", "Por", "En", "Con"] },
        { q: "¿Qué palabra marca el camino o el medio?", o: ["per", "sine", "apud", "de"] },
        { q: "¿Qué palabra marca el origen?", o: ["a/ab", "in", "apud", "per"] },
        { q: "¿Qué significa «in schola»?", o: ["En la escuela", "Con la escuela", "Sin escuela", "Desde la escuela"] },
        { q: "¿Qué significa «de libro»?", o: ["Acerca del libro", "Sin libro", "Por el libro", "Con el libro"] },
        { q: "¿Qué relación marca «sine aqua»?", o: ["Falta algo", "Compañía", "Lugar", "Tema"] },
        { q: "¿Cómo empieza una buena exposición?", o: ["Con un inicio que presenta el tema", "Con el cierre primero", "Sin ejemplos", "Leyendo la lista sin explicar"] },
      ],
      write: [
        "Escribe las seis palabras con su significado.",
        "Escribe tu exposición: inicio, medio y cierre.",
      ],
      schematic: [
        "Dibuja un esquema con las seis palabras y sus relaciones.",
        "Dibuja tres escenas y rotula cada una con su preposición.",
      ],
    },
    image: [
      "Dibuja un mapa con ciudad, bosque, casa y unos amigos.",
      "Rotula: ab urbe, per silvam, in domo y apud amicos.",
      "Debajo de cada rótulo escribe qué significa.",
      "Escribe qué relación muestra cada uno.",
    ],
    summary: "Las seis preposiciones muestran lugar, compañía, camino, ausencia, origen y tema; pregunta la relación antes de traducir.",
  },
];
