/**
 * Arte · ciclo 3 · semana 1 · nivel 6 — Dibujar con OiLS: formas sencillas.
 * Formato Ask First v2 con metáfora venezolana (ver BRIEF.md).
 * Hito: Los Médanos de Coro (Falcón, cerca de Coro). Datos seguros: dunas de arena
 * que el viento mueve y moldea; son parque nacional. Imágenes: ondas en la arena,
 * curvas, líneas, huellas que se borran.
 * OiLS (Mona Brookes): O = formas redondas, i = puntos, L = rectas y ángulos, S = curvas.
 */
export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "art-c3-w1-d1",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Seguro has dibujado casas y soles.",
          "Todo eso se arma con piezas sencillas.",
          "Hoy las buscamos en los Médanos de Coro.",
        ],
      },
      {
        q: [
          "Imagina el sol sobre los Médanos.",
          "¿Qué forma tiene ese sol?",
        ],
        h: "Punto 2: La O, la forma redonda",
        a: [
          "El sol es una forma redonda.",
          "Esa forma se llama O, como la letra.",
          "Una O puede ser grande o chiquita.",
        ],
      },
      {
        q: [
          "Mira la arena de cerca. ¿Cómo dibujas",
          "un granito de arena o una huella?",
        ],
        h: "Punto 3: La i, el punto",
        a: [
          "Un granito de arena es un punto.",
          "El punto se llama i, como la letra.",
          "Una huella chiquita también es una i.",
        ],
      },
      {
        q: [
          "¿Cómo dibujas el horizonte detrás",
          "de las dunas? ¿Es recto o curvo?",
        ],
        h: "Punto 4: La L, la línea recta",
        a: [
          "El horizonte es una línea recta.",
          "Las rectas se llaman L, como la letra.",
          "Van acostadas, paradas o inclinadas.",
        ],
      },
      {
        q: [
          "El viento mueve la arena y la deja",
          "con ondas. ¿Qué línea dibuja ondas?",
        ],
        h: "Punto 5: La S, la línea curva",
        a: [
          "Las ondas de la arena son curvas.",
          "Las curvas se llaman S, como la letra.",
          "También pueden ser suaves o en espiral.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿dibujas",
          "primero la huella o la duna entera?",
        ],
        h: "Punto 6: Primero lo grande",
        a: [
          "Primero va lo grande: la duna.",
          "Después los detalles, como una huella.",
          "Así el dibujo queda en orden.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es la O en OiLS?", o: ["Una forma redonda", "Un punto", "Una recta", "Una curva"] },
        { q: "¿Qué es la i en OiLS?", o: ["Un punto", "Un círculo", "Una recta", "Una curva"] },
        { q: "¿Qué letra son las rectas?", o: ["L", "S", "O", "i"] },
        { q: "¿Qué letra son las curvas?", o: ["S", "L", "i", "O"] },
        { q: "¿Qué línea es el horizonte?", o: ["Una recta", "Una curva", "Un punto", "Un círculo"] },
        { q: "¿Qué forma tienen las ondas?", o: ["Curvas", "Rectas", "Puntos", "Círculos"] },
        { q: "¿Qué es un granito de arena al dibujar?", o: ["Un punto i", "Una O", "Una L", "Una S"] },
        { q: "¿Qué se dibuja primero?", o: ["Lo grande", "El detalle", "La huella", "La sombra"] },
      ],
      write: [
        "Escribe qué significa cada letra de OiLS.",
        "Cuenta por qué va primero lo grande.",
      ],
      schematic: [
        "Dibuja un cuadro con O, i, L y S.",
        "Dibuja una duna con un sol y una huella.",
      ],
    },
    image: [
      "Dibuja los Médanos de Coro: duna y sol.",
      "Usa S para la duna y O para el sol.",
      "Añade huellas con i y un palo con L.",
      "Revisa que lo grande vaya primero.",
    ],
    summary: "Un dibujo se arma con piezas sencillas: O redondas, i puntos, L rectas y S curvas. Primero va lo grande, como las dunas de los Médanos de Coro.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "art-c3-w1-d2",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer viste las cuatro piezas, OiLS:",
          "O redonda, i punto, L recta, S curva.",
          "Hoy buscamos O e i en los Médanos.",
        ],
      },
      {
        q: [
          "En los Médanos de Coro sale el sol.",
          "¿Qué forma dibujas para ese sol?",
        ],
        h: "Punto 2: La O, círculo grande",
        a: [
          "El sol es un círculo: es una O.",
          "Es la forma principal del dibujo.",
          "La dibujas primero, grande y clara.",
        ],
      },
      {
        q: [
          "Ahora mira la arena de cerca.",
          "¿Qué forma tiene un granito de arena?",
        ],
        h: "Punto 3: La i, el puntito",
        a: [
          "Un granito de arena es un punto.",
          "Una huella pequeña también es un punto.",
          "El punto se llama i, como la letra.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿el punto",
          "puede ser igual de grande que el sol?",
        ],
        h: "Punto 4: El punto es más pequeño",
        a: [
          "No. El punto es más chico que la O.",
          "Si miden igual, no se sabe cuál manda.",
          "Lo grande manda; lo pequeño acompaña.",
        ],
      },
      {
        q: [
          "¿Cómo marcas cuál es la O y cuál",
          "es la i cuando dibujas muchas?",
        ],
        h: "Punto 5: Etiquetar cada marca",
        a: [
          "Escribe una O junto a cada círculo.",
          "Escribe una i junto a cada punto.",
          "Etiquetar es ponerle nombre a la pieza.",
        ],
      },
      {
        q: [
          "Ya tienes el sol y los granitos.",
          "¿Cuántos detalles más pones?",
        ],
        h: "Punto 6: Un detalle a la vez",
        a: [
          "Añade un solo detalle pequeño.",
          "Si pones muchos, el dibujo se llena.",
          "Un detalle bien puesto es suficiente.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué letra es el sol?", o: ["O", "i", "L", "S"] },
        { q: "¿Qué letra es un granito de arena?", o: ["i", "O", "L", "S"] },
        { q: "¿Qué va primero, la O o la i?", o: ["La O", "La i", "Las dos juntas", "Ninguna"] },
        { q: "¿Cómo es el punto frente a la O?", o: ["Más pequeño", "Igual de grande", "Más grande", "Más largo"] },
        { q: "Si miden igual, ¿qué pasa?", o: ["No se sabe cuál manda", "Queda perfecto", "Se vuelve una L", "Se vuelve una S"] },
        { q: "¿Para qué sirve etiquetar?", o: ["Para nombrar cada pieza", "Para borrar el dibujo", "Para pintarlo", "Para agrandarlo"] },
        { q: "¿Qué letra va junto a un círculo?", o: ["O", "i", "L", "S"] },
        { q: "¿Qué pasa si pones muchos detalles?", o: ["El dibujo se llena", "Queda más claro", "Se vuelve una L", "Se vuelve una O"] },
      ],
      write: [
        "Escribe tres cosas redondas y tres puntitos.",
        "Explica por qué el punto es menor que la O.",
      ],
      schematic: [
        "Dibuja un sol y granitos; rotula O e i.",
        "Dibuja una O grande y una i pequeña.",
      ],
    },
    image: [
      "Dibuja un sol grande sobre una duna.",
      "Pon granitos de arena y huellas con i.",
      "Rotula cada marca con una O o una i.",
      "Revisa que cada punto sea más chico.",
    ],
    summary: "En los Médanos de Coro dibujamos con O e i: el sol es una O grande y los granitos de arena son puntos i. Los rotulamos para no confundirnos.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "art-c3-w1-d3",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer dibujaste el sol, que es una O.",
          "Y granitos de arena, que son i.",
          "Hoy llegan las rectas de las dunas.",
        ],
      },
      {
        q: [
          "Mira el horizonte y un palo clavado",
          "en la arena. ¿Hacia dónde va cada uno?",
        ],
        h: "Punto 2: Horizontal y vertical",
        a: [
          "El horizonte va de lado a lado:",
          "es horizontal, como si se acostara.",
          "El palo va de arriba abajo: vertical.",
          "Las dos son rectas: son líneas L.",
        ],
      },
      {
        q: [
          "La subida de una duna, ¿va derecha,",
          "parada o inclinada?",
        ],
        h: "Punto 3: La diagonal",
        a: [
          "Una subida va inclinada: es diagonal.",
          "No es horizontal ni vertical.",
          "Sigue siendo una recta: una L.",
        ],
      },
      {
        q: [
          "Un palo y la arena se juntan.",
          "¿Qué se forma en esa esquina?",
        ],
        h: "Punto 4: El ángulo",
        a: [
          "Donde dos rectas se juntan",
          "se forma un ángulo: una esquina.",
          "Puedes marcarlo con un arquito.",
        ],
      },
      {
        q: [
          "Dibuja un cuadrado y un triángulo.",
          "¿Cuántos lados tiene cada uno?",
        ],
        h: "Punto 5: Contar los lados",
        a: [
          "El cuadrado tiene cuatro lados rectos.",
          "El triángulo tiene tres lados rectos.",
          "Cada lado es una L.",
          "Tiene tantos ángulos como lados.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: si tu recta",
          "sale temblorosa, ¿sigue siendo L?",
        ],
        h: "Punto 6: Trazos firmes",
        a: [
          "Una L debe ser firme y derecha.",
          "Mira dónde empieza y dónde acaba.",
          "Traza despacio, con la mano segura.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué letra son las rectas?", o: ["L", "O", "i", "S"] },
        { q: "¿Cómo va una línea horizontal?", o: ["De lado a lado", "De arriba abajo", "Inclinada", "Curva"] },
        { q: "¿Cómo va una línea vertical?", o: ["De arriba abajo", "De lado a lado", "Inclinada", "Redonda"] },
        { q: "¿Cómo es la subida de una duna?", o: ["Diagonal", "Horizontal", "Vertical", "Espiral"] },
        { q: "¿Qué se forma donde dos rectas se juntan?", o: ["Un ángulo", "Un círculo", "Un punto", "Una curva"] },
        { q: "¿Cuántos lados tiene un triángulo?", o: ["Tres", "Cuatro", "Cinco", "Dos"] },
        { q: "¿Cuántos lados tiene un cuadrado?", o: ["Cuatro", "Tres", "Cinco", "Seis"] },
        { q: "¿Cómo debe ser una L al trazarla?", o: ["Firme y derecha", "Suave y curva", "Temblorosa", "Redonda"] },
      ],
      write: [
        "Escribe cómo va cada recta: horizontal, vertical, diagonal.",
        "Explica con tus palabras qué es un ángulo.",
      ],
      schematic: [
        "Dibuja un palo y el horizonte; marca el ángulo.",
        "Dibuja un cuadrado y un triángulo; cuenta lados.",
      ],
    },
    image: [
      "Dibuja un horizonte y un palo en la arena.",
      "Añade una subida de duna con una diagonal.",
      "Marca dos ángulos con un arquito.",
      "Revisa que ninguna recta salga curva.",
    ],
    summary: "Las L son rectas: horizontales, verticales y diagonales. En los Médanos de Coro, el horizonte y un palo muestran dónde se forma un ángulo.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "art-c3-w1-d4",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer dibujaste rectas L: horizontales,",
          "verticales y diagonales.",
          "Hoy llegan las curvas de las dunas.",
        ],
      },
      {
        q: [
          "El viento mueve la arena de las dunas.",
          "¿Qué línea dibuja su borde?",
        ],
        h: "Punto 2: La S, la línea curva",
        a: [
          "El borde de una duna es una curva.",
          "Esa línea se llama S, como la letra.",
          "Las curvas dan movimiento al dibujo.",
        ],
      },
      {
        q: [
          "Las curvas pueden ser de muchas",
          "formas. ¿Cómo es una onda en la arena?",
        ],
        h: "Punto 3: Tipos de curva",
        a: [
          "Puede ser suave, como una duna.",
          "Puede ser ondulada, como las ondas.",
          "O puede ser espiral, como un caracol.",
        ],
      },
      {
        q: [
          "Dibuja una duna, un sol y huellas.",
          "¿Qué letra usas para cada cosa?",
        ],
        h: "Punto 4: Combinar las letras",
        a: [
          "La duna es una S larga.",
          "El sol es una O.",
          "Las huellas son puntos: varias i.",
          "Con O, i y S ya hay un paisaje.",
        ],
      },
      {
        q: [
          "¿Por dónde empiezas: por las huellas",
          "o por la duna grande?",
        ],
        h: "Punto 5: Primero lo grande",
        a: [
          "Primero bloqueas: dibujas lo grande",
          "sin detalles. Es la duna y el sol.",
          "Al final pones las huellas, las i.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿qué pasa si",
          "empiezas por las huellas?",
        ],
        h: "Punto 6: Primero el esqueleto",
        a: [
          "Pierdes la forma de la duna.",
          "Las formas grandes son el esqueleto.",
          "Con el esqueleto firme, los detalles",
          "se acomodan solos.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué letra son las curvas?", o: ["S", "L", "O", "i"] },
        { q: "¿Qué línea usa el borde de una duna?", o: ["Una curva S", "Una recta L", "Un punto i", "Una O"] },
        { q: "En el paisaje, ¿qué letra es la duna?", o: ["S", "i", "L", "O"] },
        { q: "En el paisaje, ¿qué letra es el sol?", o: ["O", "S", "L", "i"] },
        { q: "¿Qué letra son las huellas?", o: ["i", "S", "L", "O"] },
        { q: "¿Qué significa bloquear?", o: ["Dibujar lo grande sin detalles", "Borrar todo", "Pintar de color", "Poner puntos"] },
        { q: "¿Qué se pone al final?", o: ["Las huellas, las i", "La duna grande", "El sol", "El esqueleto"] },
        { q: "¿Qué es el esqueleto del dibujo?", o: ["Las formas grandes", "Los adornos", "Las huellas", "El papel"] },
      ],
      write: [
        "Escribe qué letra usaste para la duna, el sol y las huellas.",
        "Explica por qué el esqueleto va antes.",
      ],
      schematic: [
        "Dibuja una duna con S, un sol con O y huellas con i.",
        "Dibuja los pasos: lo grande, curvas y huellas.",
      ],
    },
    image: [
      "Dibuja una duna, un sol y huellas.",
      "Primero lo grande, luego las curvas S.",
      "Al final pon las huellas, las i.",
      "Rotula cada parte con su letra.",
    ],
    summary: "Con las curvas S completamos OiLS. En los Médanos de Coro el viento moldea las dunas: primero va el esqueleto y los detalles al final.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "art-c3-w1-d5",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer dibujaste una duna con curvas S,",
          "un sol O y huellas i.",
          "Hoy lo recuerdas y lo cuentas.",
        ],
      },
      {
        q: [
          "Sin mirar: ¿qué significa cada letra",
          "de OiLS?",
        ],
        h: "Punto 2: Las cuatro letras",
        a: [
          "La O son las formas redondas.",
          "La i son los puntos pequeños.",
          "La L son las rectas, con ángulos.",
          "La S son las líneas curvas.",
        ],
      },
      {
        q: [
          "¿Quién enseñó a mirar un dibujo por",
          "piezas? ¿Y qué se mira primero?",
        ],
        h: "Punto 3: Mirar antes de dibujar",
        a: [
          "Mona Brookes enseñó a mirarlo así.",
          "Primero se mira la forma grande,",
          "y después el detalle.",
        ],
      },
      {
        q: [
          "Un dibujo de los Médanos de Coro tiene",
          "sol, duna, palo y huellas. ¿Qué letras?",
        ],
        h: "Punto 4: Buscar OiLS en la escena",
        a: [
          "El sol redondo es una O.",
          "La duna y sus ondas son S.",
          "El palo recto es una L.",
          "Y las huellas son puntos: i.",
        ],
      },
      {
        q: [
          "Vas a mostrar tu dibujo a tu familia.",
          "¿Cómo se lo cuentas con orden?",
        ],
        h: "Punto 5: Cómo contarlo",
        a: [
          "Empieza diciendo qué dibujaste.",
          "Sigue con lo grande, luego los detalles.",
          "Señala cada parte y di su letra.",
          "Cuenta qué fue difícil y da gracias.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿basta saber",
          "las letras de memoria?",
        ],
        h: "Punto 6: Usar lo que sabes",
        a: [
          "No basta con repetir la lista.",
          "Úsala al mirar y al dibujar.",
          "Pregúntate: ¿qué forma veo aquí?",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Quién enseñó a mirar por piezas?", o: ["Mona Brookes", "Un pintor", "Tu maestro", "Un escultor"] },
        { q: "En la escena, ¿qué letra es el sol?", o: ["O", "i", "L", "S"] },
        { q: "¿Qué letra son la duna y sus ondas?", o: ["S", "O", "i", "L"] },
        { q: "¿Qué letra es el palo recto?", o: ["L", "S", "O", "i"] },
        { q: "¿Qué letra son las huellas?", o: ["i", "L", "S", "O"] },
        { q: "¿Qué se mira primero en un dibujo?", o: ["La forma grande", "El detalle", "La sombra", "El marco"] },
        { q: "¿Cómo empiezas a contar tu dibujo?", o: ["Diciendo qué dibujaste", "Diciendo gracias", "Borrando algo", "Cambiando de tema"] },
        { q: "¿Qué haces además de saber las letras?", o: ["Usarlas al mirar y dibujar", "Olvidarlas", "Cambiarlas", "Esconderlas"] },
      ],
      write: [
        "Escribe de memoria qué significa cada letra de OiLS.",
        "Cuenta cómo explicarías tu dibujo, de inicio a fin.",
      ],
      schematic: [
        "Dibuja una escena y rotula una O, i, L y S.",
        "Dibuja las cuatro letras con un ejemplo cada una.",
      ],
    },
    image: [
      "Dibuja los Médanos de Coro con sol y duna.",
      "Añade un palo y huellas en la arena.",
      "Rotula una O, una i, una L y una S.",
      "Revisa que se vea primero lo grande.",
    ],
    summary: "OiLS nos ayuda a mirar un dibujo por piezas: O redondas, i puntos, L rectas y S curvas. En los Médanos de Coro primero se mira lo grande y luego el detalle.",
  },
];
