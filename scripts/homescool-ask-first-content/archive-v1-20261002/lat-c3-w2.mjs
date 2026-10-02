/**
 * Latín · ciclo 3 · semana 2 · nivel 6 — narrativa inductiva, todo "pregunta primero".
 * Tema de la semana: tres palabras latinas para leer frases sencillas:
 * et (y), ut (para que / meta) y non (no).
 * Una línea = una idea legible (~60 caracteres máx.).
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "lat-c3-w2-d1",
    opening: "¿Cómo unes «el niño» y «la niña» en una sola frase?",
    repaso: null,
    units: [
      {
        h: "Punto 1: Tres palabras, tres trabajos",
        a: [
          "Para unir dos cosas dices «y»: el niño y la niña.",
          "En latín esa palabra es «et».",
          "Esta semana conocerás tres: et, ut y non.",
          "Cada una hace un trabajo distinto en la frase.",
        ],
      },
      {
        q: [
          "«Puer» es niño y «puella» es niña. ¿Qué dice",
          "«puer et puella»?",
        ],
        h: "Punto 2: Et une",
        a: [
          "Dice «el niño y la niña».",
          "«Et» significa «y»: es una conjunción.",
          "Una conjunción une ideas del mismo nivel.",
          "En «puer et puella» une dos nombres.",
          "En «Puer currit et ridet» une dos acciones: corre y ríe.",
        ],
      },
      {
        q: [
          "Piensa en «trabajo para aprender». ¿«Para aprender»",
          "suma otra cosa o dice la meta?",
        ],
        h: "Punto 3: Ut muestra la meta",
        a: [
          "Dice la meta: para qué haces algo.",
          "En latín «ut» significa «para que».",
          "Laboro ut discam es «trabajo para aprender».",
          "Pregunta «¿para qué?» cuando veas «ut».",
        ],
      },
      {
        q: [
          "«Venit» significa «viene». ¿Qué crees que quiere decir",
          "«non venit»?",
        ],
        h: "Punto 4: Non niega",
        a: [
          "Quiere decir «no viene».",
          "«Non» significa «no»: es una negación.",
          "Va justo antes del verbo que niega.",
          "La acción es la misma, pero ahora no ocurre.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿«et» y «ut» sirven para lo",
          "mismo?",
        ],
        h: "Punto 5: Cada una tiene su trabajo",
        a: [
          "No: «et» suma cosas iguales y «ut» dice para qué.",
          "«Non» no suma ni explica: niega.",
          "Memoriza el trío:",
          "et = y · ut = para que / meta · non = no.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué significa «et»?", o: ["Y", "No", "Para que", "Nunca"] },
        { q: "¿Qué significa «puer et puella»?", o: ["El niño y la niña", "El niño no es niña", "El niño para la niña", "El niño sin la niña"] },
        { q: "En «Puer currit et ridet», ¿qué une «et»?", o: ["Dos acciones: corre y ríe", "Dos nombres", "Una meta y una acción", "Un lugar y un tiempo"] },
        { q: "¿Qué significa «ut» en esta lección?", o: ["Para que", "Y", "No", "Con"] },
        { q: "¿Qué pregunta responde «ut»?", o: ["¿Para qué?", "¿Dónde?", "¿Quién?", "¿Cuántos?"] },
        { q: "¿Qué significa «laboro ut discam»?", o: ["Trabajo para aprender", "Trabajo y aprendo", "No trabajo", "Aprendo sin trabajar"] },
        { q: "¿Qué significa «non venit»?", o: ["No viene", "Viene", "Viene y ve", "Viene para ver"] },
        { q: "¿Dónde va «non» en la frase?", o: ["Justo antes del verbo", "Al final de la frase", "Después del nombre", "En cualquier lugar"] },
      ],
      write: [
        "Escribe qué trabajo hace cada palabra: et, ut y non.",
        "Escribe «non venit» y explica qué significa.",
      ],
      schematic: [
        "Dibuja un esquema con et, ut y non y su trabajo.",
        "Dibuja una flecha de «laboro» a «ut discam».",
      ],
    },
    image: [
      "Dibuja a un niño y una niña con la palabra et en medio.",
      "Dibuja un cuaderno con una flecha y la palabra ut.",
      "Dibuja una puerta cerrada con la palabra non.",
      "Escribe debajo qué significa cada palabra.",
    ],
    summary: "Et une cosas iguales, ut dice la meta y non niega: tres palabras con tres trabajos distintos.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "lat-c3-w2-d2",
    opening: ayer,
    repaso: [
      "Ayer conociste tres palabras: et, ut y non.",
      "Ayer viste que «et» significa «y» y une cosas del mismo nivel.",
      "«Ut» dice la meta y «non» niega el verbo.",
    ],
    units: [
      {
        q: [
          "«Panis» es pan y «aqua» es agua. ¿Qué dice",
          "«panis et aqua»?",
        ],
        h: "Punto 1: Et une nombres",
        a: [
          "Dice «pan y agua».",
          "Aquí «et» une dos alimentos.",
          "Une nombres: cosas que se pueden nombrar.",
          "Los dos están al mismo nivel: ninguno explica al otro.",
        ],
      },
      {
        q: [
          "Sigamos. «Currit» es «corre» y «ridet» es «ríe».",
          "¿Qué dice «currit et ridet»?",
        ],
        h: "Punto 2: Et une acciones",
        a: [
          "Dice «corre y ríe».",
          "Ahora «et» une dos acciones.",
          "Las dos pasan seguidas, sin explicar por qué.",
          "Marcus et Lucia es «Marco y Lucía»: une dos nombres.",
        ],
      },
      {
        q: [
          "«Venit» es «viene» y «videt» es «ve».",
          "¿Cómo traduces «venit et videt»?",
        ],
        h: "Punto 3: Traducir et como y",
        a: [
          "Se traduce «viene y ve».",
          "Cuando traduzcas, deja «et» como «y».",
          "No lo cambies por «pero» ni por «o».",
          "Cada pieza suma; ninguna cambia la idea.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: en «laboro ut discam», ¿puedes",
          "cambiar «ut» por «et»?",
        ],
        h: "Punto 4: Et no explica el para qué",
        a: [
          "Si pones «et», la idea se vuelve una lista.",
          "Dirías «trabajo y aprendo».",
          "Eso ya no dice para qué trabajas.",
          "«Et» suma; no explica la meta.",
        ],
      },
      {
        q: [
          "Ahora tú: inventa una pareja con «et». ¿Qué dos",
          "palabras unirías? ¿Son nombres o acciones?",
        ],
        h: "Punto 5: Tu propia pareja",
        a: [
          "Por ejemplo: «panis et aqua» une dos nombres.",
          "O «currit et ridet» une dos acciones.",
          "Lee tu frase en voz alta y escucha la «y».",
          "Marca qué une tu «et»: nombres o acciones.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué significa «panis et aqua»?", o: ["Pan y agua", "Pan para agua", "No hay pan", "Pan sin agua"] },
        { q: "¿Qué significa «currit et ridet»?", o: ["Corre y ríe", "Corre para reír", "No corre", "Corre sin reír"] },
        { q: "En «panis et aqua», ¿qué une «et»?", o: ["Dos nombres", "Dos acciones", "Una meta", "Una negación"] },
        { q: "En «currit et ridet», ¿qué une «et»?", o: ["Dos acciones", "Dos nombres", "Una meta", "Una negación"] },
        { q: "¿Qué significa «venit et videt»?", o: ["Viene y ve", "Viene para ver", "No viene", "Ve y no viene"] },
        { q: "¿Cómo se traduce «et»?", o: ["Y", "Pero", "O", "No"] },
        { q: "¿Qué significa «Marcus et Lucia»?", o: ["Marco y Lucía", "Marco sin Lucía", "Marco para Lucía", "Marco no Lucía"] },
        { q: "Si cambias «ut» por «et», ¿qué pierdes?", o: ["La idea de para qué", "El verbo", "El nombre", "Las dos palabras"] },
      ],
      write: [
        "Escribe tres parejas unidas por «et».",
        "Explica por qué «et» no dice la meta.",
      ],
      schematic: [
        "Dibuja pan y agua unidos por «et».",
        "Dibuja un niño que corre y ríe, unido por «et».",
      ],
    },
    image: [
      "Dibuja una mesa con pan y una jarra de agua.",
      "Escribe entre los dos dibujos: et.",
      "Rotula debajo: panis et aqua.",
      "Escribe al lado qué significa.",
    ],
    summary: "Et significa «y» y une nombres o acciones del mismo nivel, sin explicar la meta.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "lat-c3-w2-d3",
    opening: ayer,
    repaso: [
      "Ayer practicaste «et» con nombres y acciones.",
      "Ayer viste que «et» une cosas iguales y no dice la meta.",
      "Hoy conocerás mejor a «ut», la palabra de la meta.",
    ],
    units: [
      {
        q: [
          "Empecemos. Cuando haces algo con un propósito, ¿qué",
          "pregunta te haces: «¿quién?» o «¿para qué?»",
        ],
        h: "Punto 1: Ut presenta la meta",
        a: [
          "Te preguntas «¿para qué?».",
          "La respuesta es la meta de la acción.",
          "«Ut» presenta esa meta en latín.",
          "Significa «para que» o «a fin de que».",
        ],
      },
      {
        q: [
          "«Laboro» es «trabajo» y «discam» es «aprenda».",
          "¿Qué dice «laboro ut discam»?",
        ],
        h: "Punto 2: Qué hago y para qué",
        a: [
          "Dice «trabajo para que aprenda».",
          "En español suena natural: «trabajo para aprender».",
          "«Laboro» es lo que hago.",
          "«Ut discam» responde para qué lo hago.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿«trabajo y aprendo» dice lo",
          "mismo que «trabajo para aprender»?",
        ],
        h: "Punto 3: Lista o meta",
        a: [
          "No: «trabajo y aprendo» es una lista.",
          "«Trabajo para aprender» dice la meta.",
          "Lee las dos frases en voz alta.",
          "La segunda explica por qué trabajas.",
        ],
      },
      {
        q: [
          "Sigamos. Cada vez que veas «ut», ¿qué pregunta puedes",
          "escribir al margen?",
        ],
        h: "Punto 4: Subrayar ut y su verbo",
        a: [
          "Escribe al margen: «¿para qué?».",
          "Subraya «ut» y el verbo que viene después.",
          "Ese verbo dice lo que se quiere lograr.",
          "Así no confundes «ut» con «et».",
        ],
      },
      {
        q: [
          "Ahora tú: inventa una frase en español con «para que»",
          "y señala cuál es la meta.",
        ],
        h: "Punto 5: Tu propia meta",
        a: [
          "Por ejemplo: «Leo para que aprendamos juntos».",
          "La meta es «aprendamos juntos».",
          "Lo que haces es «leo».",
          "«Para que» hace el mismo trabajo que ut.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué significa «ut» en esta lección?", o: ["Para que", "Y", "No", "Pero"] },
        { q: "¿Qué pregunta responde «ut»?", o: ["¿Para qué?", "¿Dónde?", "¿Quién?", "¿Cuándo?"] },
        { q: "¿Qué significa «laboro ut discam»?", o: ["Trabajo para aprender", "Trabajo y aprendo", "No trabajo", "Aprendo antes de trabajar"] },
        { q: "En «laboro ut discam», ¿qué es «laboro»?", o: ["Lo que hago", "La meta", "Una negación", "Un nombre"] },
        { q: "En esa frase, ¿qué responde «ut discam»?", o: ["Para qué trabajo", "Dónde trabajo", "Con quién trabajo", "Cuándo trabajo"] },
        { q: "¿Qué dice «trabajo y aprendo»?", o: ["Una lista de dos acciones", "La meta de trabajar", "Que no trabajo", "Que aprendo sin trabajar"] },
        { q: "¿Qué escribes al margen junto a «ut»?", o: ["¿Para qué?", "¿Quién?", "¿Dónde?", "¿Cuándo?"] },
        { q: "¿Qué palabra suma cosas iguales y no dice la meta?", o: ["et", "ut", "non", "venit"] },
      ],
      write: [
        "Escribe una frase con «para que» y marca la meta.",
        "Explica la diferencia entre «et» y «ut».",
      ],
      schematic: [
        "Dibuja una flecha de «laboro» a «ut discam».",
        "Dibuja dos cuadros: et como lista y ut como meta.",
      ],
    },
    image: [
      "Dibuja a un niño con un libro y una flecha hacia una estrella.",
      "Rotula al niño: laboro.",
      "Rotula la estrella: ut discam.",
      "Escribe debajo: ¿para qué?",
    ],
    summary: "Ut presenta la meta de una acción y responde «¿para qué?»; no suma cosas como et.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "lat-c3-w2-d4",
    opening: ayer,
    repaso: [
      "Ayer practicaste «ut» con la pregunta «¿para qué?».",
      "Ayer viste que «ut» presenta la meta de la acción.",
      "Hoy practicas «non», la palabra que dice que no.",
    ],
    units: [
      {
        q: [
          "«Canto» significa «yo canto». ¿Cómo dirías «yo no canto»?",
          "(Pista: «non» significa «no».)",
        ],
        h: "Punto 1: Non da vuelta al sentido",
        a: [
          "Dirías «non canto».",
          "«Non» va justo antes del verbo.",
          "El verbo no cambia de forma.",
          "Solo «non» da vuelta al sentido.",
        ],
      },
      {
        q: [
          "«Venit» es «viene». ¿En qué se diferencian «venit»",
          "y «non venit»?",
        ],
        h: "Punto 2: Afirmar y negar",
        a: [
          "«Venit» afirma: viene.",
          "«Non venit» niega: no viene.",
          "La acción es la misma.",
          "Cambia solo si ocurre o no ocurre.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿«non» puede ir al final de la",
          "frase, lejos del verbo?",
        ],
        h: "Punto 3: Non va antes del verbo",
        a: [
          "Mejor no: «non» va justo antes del verbo.",
          "«Non laborat» es «no trabaja».",
          "Si lo alejas, cuesta saber qué niegas.",
          "Una sola «non» basta: repetirla confunde.",
        ],
      },
      {
        q: [
          "Ahora tú: haz una tabla de tres filas. ¿Cómo queda con",
          "«canto», «non canto» y «non venit»?",
        ],
        h: "Punto 4: Una tabla de tres filas",
        a: [
          "Fila 1: «canto» es «yo canto».",
          "Fila 2: «non canto» es «yo no canto».",
          "Fila 3: «non venit» es «no viene».",
          "Compara las filas y traduce cada una.",
        ],
      },
      {
        q: [
          "¿Cómo compruebas que tu traducción de «non venit» no",
          "suene afirmativa?",
        ],
        h: "Punto 5: Revisar la traducción",
        a: [
          "Busca «non» antes del verbo.",
          "Si ves «non venit», debe sonar «no viene».",
          "Si suena «viene», revisa otra vez.",
          "Lee en voz alta y escucha el «no» antes de la acción.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué significa «non»?", o: ["No", "Y", "Para que", "Con"] },
        { q: "¿Qué significa «non venit»?", o: ["No viene", "Viene", "Viene y ve", "Viene para ver"] },
        { q: "¿Qué significa «non canto»?", o: ["Yo no canto", "Yo canto", "Tú no cantas", "Canto para que"] },
        { q: "¿Qué significa «non laborat»?", o: ["No trabaja", "Trabaja", "Trabajo para aprender", "Trabaja y ríe"] },
        { q: "¿Dónde va «non»?", o: ["Justo antes del verbo", "Al final", "Después del nombre", "Lejos del verbo"] },
        { q: "¿Qué cambia entre «venit» y «non venit»?", o: ["La acción no ocurre", "El verbo", "El nombre", "La meta"] },
        { q: "¿Cuántas «non» bastan para negar un verbo?", o: ["Una", "Dos", "Tres", "Ninguna"] },
        { q: "Si «non venit» suena «viene», ¿qué haces?", o: ["Revisas dónde está «non»", "Lo dejas así", "Quitas «non»", "Cambias el verbo"] },
      ],
      write: [
        "Escribe una tabla: afirmación, con «non» y traducción.",
        "Explica por qué «non» va antes del verbo.",
      ],
      schematic: [
        "Dibuja un semáforo: verde «venit», rojo «non venit».",
        "Dibuja una flecha de «non» al verbo que niega.",
      ],
    },
    image: [
      "Dibuja un semáforo con luz verde y luz roja.",
      "Rotula la luz verde: venit.",
      "Rotula la luz roja: non venit.",
      "Escribe al lado qué significa cada rótulo.",
    ],
    summary: "Non niega: va justo antes del verbo y convierte «viene» en «no viene».",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "lat-c3-w2-d5",
    opening: ayer,
    repaso: [
      "Esta semana conociste tres palabras: et, ut y non.",
      "Cada una hace un trabajo distinto en la frase.",
      "Hoy las recuerdas y las cuentas con orden.",
    ],
    units: [
      {
        q: [
          "Sin mirar nada, ¿qué significa cada una:",
          "«et», «ut» y «non»?",
        ],
        w: 3,
        h: "Punto 1: Las tres palabras",
        a: [
          "Son estas:",
          "et = y · ut = para que / meta · non = no.",
          "Si olvidaste alguna, dila otra vez en voz alta.",
        ],
      },
      {
        q: [
          "¿Qué trabajo hace cada una dentro de la frase?",
        ],
        h: "Punto 2: Tres trabajos",
        a: [
          "«Et» une cosas iguales: nombres o acciones.",
          "«Ut» dice la meta: responde «¿para qué?».",
          "«Non» niega: va justo antes del verbo.",
        ],
      },
      {
        q: [
          "Lee «panis et aqua», «laboro ut discam» y «non venit».",
          "¿Qué pieza aparece en cada una?",
        ],
        h: "Punto 3: Reconocer la pieza",
        a: [
          "«Panis et aqua» es «pan y agua»: et une nombres.",
          "«Laboro ut discam» es «trabajo para aprender»: meta.",
          "«Non venit» es «no viene»: negación.",
          "Busca primero la pieza y luego traduce.",
        ],
      },
      {
        q: [
          "Vas a contarle esto a alguien de tu casa.",
          "¿Cómo empezarías tu exposición?",
        ],
        h: "Punto 4: Cómo contarlo con orden",
        a: [
          "Inicio: «Hoy les voy a enseñar tres palabras en latín».",
          "Medio: un ejemplo de cada una: et, ut y non.",
          "Di qué significa cada ejemplo.",
          "Cierre: repite la lista y termina con «gracias».",
        ],
      },
      {
        q: [
          "Ves una frase latina corta. ¿Qué es lo primero que",
          "buscas para empezar a leerla?",
        ],
        h: "Punto 5: Buscar la pieza primero",
        a: [
          "Busca si aparece et, ut o non.",
          "Si une dos cosas iguales, es et.",
          "Si dice para qué, es ut.",
          "Si niega la acción, es non.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué significa «et»?", o: ["Y", "No", "Para que", "Nunca"] },
        { q: "¿Qué significa «ut» en esta lección?", o: ["Para que", "Y", "No", "Pero"] },
        { q: "¿Qué significa «non»?", o: ["No", "Y", "Para que", "Con"] },
        { q: "¿Qué palabra une dos cosas iguales?", o: ["et", "ut", "non", "venit"] },
        { q: "¿Qué palabra responde «¿para qué?»?", o: ["ut", "et", "non", "venit"] },
        { q: "¿Qué palabra niega el verbo?", o: ["non", "et", "ut", "venit"] },
        { q: "¿Qué significa «laboro ut discam»?", o: ["Trabajo para aprender", "Trabajo y aprendo", "No trabajo", "Aprendo sin trabajar"] },
        { q: "¿Qué parte de la exposición termina con «gracias»?", o: ["El cierre", "El inicio", "El medio", "Ninguna"] },
      ],
      write: [
        "Escribe et, ut y non con su significado.",
        "Escribe tu exposición: inicio, medio y cierre.",
      ],
      schematic: [
        "Dibuja tres cajas: et (une), ut (meta) y non (niega).",
        "Dibuja una frase tuya y rodea et, ut o non.",
      ],
    },
    image: [
      "Dibuja tres cajas en fila: una con et, una con ut y una con non.",
      "Dentro de cada caja dibuja un ejemplo pequeño.",
      "Escribe debajo de cada caja su significado.",
      "Escribe una frase corta que use una de las tres.",
    ],
    summary: "Et une, ut dice para qué y non niega; busca primero la pieza y luego traduce.",
  },
];
