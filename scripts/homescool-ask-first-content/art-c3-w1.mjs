/**
 * Arte · ciclo 3 · semana 1 · nivel 6 — Dibujar con OiLS: formas sencillas.
 * Narrativa inductiva "pregunta primero" (ver BRIEF.md).
 * OiLS (Mona Brookes): O = formas redondas, i = puntos, L = rectas y ángulos, S = curvas.
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "art-c3-w1-d1",
    opening: "¿Crees que un dibujo difícil se arma con piezas sencillas?",
    repaso: null,
    units: [
      {
        h: "Punto 1: Mirar por piezas",
        a: [
          "Un buen dibujo empieza por mirar, no por dibujar.",
          "Mona Brookes enseñó a ver un dibujo como piezas sencillas.",
          "Esas piezas se llaman OiLS: una letra para cada tipo.",
          "Primero las formas grandes; después, los detalles.",
        ],
      },
      {
        q: [
          "Mira una flor. ¿Con qué formas la dibujarías si solo",
          "pudieras usar redondos y puntitos?",
        ],
        h: "Punto 2: O de redondo, i de punto",
        a: [
          "La «O» es una forma redonda, como un círculo.",
          "La «i» es un punto o una marca pequeña.",
          "Una flor es un círculo grande (O) con un punto al centro (i).",
          "Primero va lo grande y luego lo pequeño.",
        ],
      },
      {
        q: [
          "Sigamos. Piensa en la esquina de una casa.",
          "¿Qué clase de líneas se encuentran ahí?",
        ],
        h: "Punto 3: L de línea recta",
        a: [
          "La «L» son las líneas rectas.",
          "Pueden ser horizontales, verticales o diagonales.",
          "Donde dos rectas se encuentran se forma un ángulo.",
          "Una casa se arma con rectas y ángulos.",
        ],
      },
      {
        q: [
          "¿Y el cuello de un cisne? ¿Es recto o hace otra cosa?",
        ],
        h: "Punto 4: S de línea curva",
        a: [
          "La «S» son las líneas curvas.",
          "Pueden ser suaves, onduladas o en espiral.",
          "El cuello de un cisne y el borde de una hoja usan S.",
          "Las curvas le dan movimiento al dibujo.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿conviene dibujar un objeto",
          "usando solo curvas o solo rectas?",
        ],
        h: "Punto 5: Las cuatro letras juntas",
        a: [
          "Es mejor usar las cuatro letras: O, i, L y S.",
          "Una flor tiene O e i; su tallo puede ser L o S.",
          "Dibuja primero la forma grande y luego los detalles.",
          "Toda la semana practicaremos cada letra con calma.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué forma representa la letra «O» en OiLS?", o: ["Las formas redondas", "Los puntos", "Las líneas rectas", "Las curvas"] },
        { q: "¿Qué representa la «i» en OiLS?", o: ["Un punto o marca pequeña", "Un círculo grande", "Una línea recta", "Una curva larga"] },
        { q: "¿Qué letra de OiLS son las líneas rectas?", o: ["L", "S", "O", "i"] },
        { q: "¿Qué letra de OiLS son las líneas curvas?", o: ["S", "L", "i", "O"] },
        { q: "¿Qué se forma donde dos rectas se encuentran?", o: ["Un ángulo", "Un punto", "Una espiral", "Un círculo"] },
        { q: "¿Qué se dibuja primero en un dibujo con OiLS?", o: ["La forma grande", "El detalle pequeño", "El adorno", "La sombra"] },
        { q: "¿Cómo se arma una flor sencilla con OiLS?", o: ["Círculo grande y punto al centro", "Solo rectas", "Solo curvas largas", "Solo puntos"] },
        { q: "¿Qué usa el cuello de un cisne?", o: ["Una curva S", "Una línea L", "Un punto i", "Un ángulo"] },
      ],
      write: [
        "Escribe qué significa cada letra de OiLS con tus palabras.",
        "Explica por qué se dibuja primero lo grande y luego lo pequeño.",
      ],
      schematic: [
        "Dibuja un cuadro con las cuatro letras: O, i, L y S.",
        "Dibuja una flor y señala su círculo O y su punto i.",
      ],
    },
    image: [
      "Dibuja una flor o un pez usando primero O e i.",
      "Señala cada forma con su letra: O para redondos, i para puntos.",
      "Añade una línea L o una curva S para el tallo o la cola.",
      "Revisa que lo grande esté antes que los detalles.",
    ],
    summary: "Un dibujo se arma con piezas sencillas: O redondos, i puntos, L rectas y S curvas. Primero lo grande y luego el detalle.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "art-c3-w1-d2",
    opening: ayer,
    repaso: [
      "Ayer vimos que un dibujo se arma con piezas sencillas.",
      "Se llaman OiLS: O redondos, i puntos, L rectas y S curvas.",
      "Primero va la forma grande y luego el detalle.",
    ],
    units: [
      {
        q: [
          "¿Qué objetos de tu casa son redondos?",
          "¿Y cuáles parecen puntitos?",
        ],
        h: "Punto 1: Buscar O e i en objetos",
        a: [
          "Un plato y una rueda son redondos: son O.",
          "Una semilla y un grano de arroz son puntitos: son i.",
          "Mirar objetos reales te enseña a ver las formas.",
          "Hoy usamos solo O e i.",
        ],
      },
      {
        q: [
          "Imagina que dibujas tres objetos solo con círculos y puntos.",
          "¿Qué pondrías primero, el círculo o el punto?",
        ],
        h: "Punto 2: Primero el círculo",
        a: [
          "Primero va el círculo grande, que es la forma principal.",
          "Después pones el punto, que es el detalle.",
          "Así el dibujo tiene orden y se ve claro.",
          "Con círculos y puntos puedes hacer una cara o una rueda.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿el punto puede ser tan grande",
          "como el círculo?",
        ],
        h: "Punto 3: El punto es más pequeño",
        a: [
          "No. El punto debe ser menor que el círculo principal.",
          "Si los dos miden igual, no se sabe cuál manda.",
          "Jerarquía es saber qué es lo más importante.",
          "Lo grande manda y lo pequeño lo acompaña.",
        ],
      },
      {
        q: [
          "¿Cómo sabrías cuál es cuál si dibujas muchos objetos juntos?",
        ],
        h: "Punto 4: Etiquetar cada marca",
        a: [
          "Escribe una «O» junto a cada redondo.",
          "Escribe una «i» junto a cada punto.",
          "Así compruebas que miraste bien.",
          "Etiquetar es ponerle nombre a cada pieza.",
        ],
      },
      {
        q: [
          "Ya tienes tus tres objetos. ¿Qué detalle mínimo podrías",
          "añadir sin romper el orden?",
        ],
        h: "Punto 5: Un detalle mínimo",
        a: [
          "Añade un solo detalle pequeño, como un punto extra.",
          "Si añades muchos, el dibujo se llena y se confunde.",
          "Un detalle bien puesto vale más que diez apurados.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué letra de OiLS es un plato o una rueda?", o: ["O", "i", "L", "S"] },
        { q: "¿Qué letra de OiLS es un grano de arroz?", o: ["i", "O", "L", "S"] },
        { q: "¿Qué se dibuja primero: el círculo o el punto?", o: ["El círculo", "El punto", "El adorno", "La sombra"] },
        { q: "¿Cómo debe ser el punto frente al círculo?", o: ["Más pequeño", "Igual de grande", "Más grande", "Más oscuro"] },
        { q: "¿Qué pasa si el punto es tan grande como el círculo?", o: ["No se sabe cuál manda", "Queda perfecto", "Se vuelve una L", "Se vuelve una S"] },
        { q: "¿Qué letras usamos solo hoy?", o: ["O e i", "L y S", "O y L", "i y S"] },
        { q: "¿Qué es una semilla en un dibujo con OiLS?", o: ["Un punto i", "Un círculo O", "Una recta L", "Una curva S"] },
        { q: "¿Para qué sirve etiquetar cada marca?", o: ["Para comprobar que miraste bien", "Para borrar el dibujo", "Para pintarlo de color", "Para hacerlo más grande"] },
      ],
      write: [
        "Escribe tres objetos redondos y tres que parezcan puntos.",
        "Explica por qué el punto debe ser menor que el círculo.",
      ],
      schematic: [
        "Dibuja tres objetos con solo O e i y etiqueta cada marca.",
        "Dibuja un círculo grande con un punto pequeño y compáralos.",
      ],
    },
    image: [
      "Dibuja tres objetos usando solo círculos y puntos.",
      "Pon el círculo grande primero y el punto después.",
      "Etiqueta cada marca con una «O» o una «i».",
      "Revisa que cada punto sea menor que su círculo.",
    ],
    summary: "Hoy dibujamos con O e i: el círculo es lo grande y el punto es lo pequeño. Los etiquetamos para no confundirnos.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "art-c3-w1-d3",
    opening: ayer,
    repaso: [
      "Ayer dibujaste objetos solo con O (redondos) e i (puntos).",
      "Buscaste platos, ruedas, semillas y granos de arroz.",
      "Pusiste el círculo grande primero y el punto después.",
    ],
    units: [
      {
        q: [
          "Mira tu mesa. ¿Qué líneas ves en sus bordes?",
          "¿Hacia dónde van?",
        ],
        h: "Punto 1: Horizontales y verticales",
        a: [
          "Una mesa usa líneas horizontales y verticales.",
          "La horizontal va de lado a lado, como el horizonte.",
          "La vertical va de arriba abajo, como un poste.",
          "Las dos son rectas: son líneas L.",
        ],
      },
      {
        q: [
          "¿Y una rampa? ¿Va derecha, parada o inclinada?",
        ],
        h: "Punto 2: La diagonal",
        a: [
          "Una rampa va inclinada: es una diagonal.",
          "La diagonal no es horizontal ni vertical.",
          "Con las tres rectas puedes armar muchas cosas.",
          "Una L siempre debe quedar recta, sin curvarse.",
        ],
      },
      {
        q: [
          "Sigamos. Cuando dos rectas se encuentran, ¿qué se forma?",
          "Piensa en la esquina de una casa.",
        ],
        h: "Punto 3: El ángulo",
        a: [
          "Donde dos rectas se encuentran se forma un ángulo.",
          "Puedes marcar el ángulo con un arco pequeño.",
          "La esquina de una mesa o de un techo es un ángulo.",
          "Un techo se arma con dos diagonales que se juntan.",
        ],
      },
      {
        q: [
          "Dibuja un cuadrado y un triángulo.",
          "¿Cuántos lados tiene cada uno?",
        ],
        h: "Punto 4: Contar lados",
        a: [
          "El cuadrado tiene cuatro lados rectos.",
          "El triángulo tiene tres lados rectos.",
          "Una figura cerrada de lados rectos es un polígono.",
          "En estas figuras hay tantos ángulos como lados.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: si tu línea sale temblorosa,",
          "¿sigue siendo una L?",
        ],
        h: "Punto 5: Trazos firmes",
        a: [
          "Una L debe ser firme y tener una dirección clara.",
          "Antes de trazar, mira dónde empieza y dónde termina.",
          "Traza despacio, con la mano segura.",
          "Practica tres trazos: horizontal, vertical y diagonal.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué letra de OiLS son las líneas rectas?", o: ["L", "O", "i", "S"] },
        { q: "¿Cómo es una línea horizontal?", o: ["Va de lado a lado", "Va de arriba abajo", "Va inclinada", "Es una curva"] },
        { q: "¿Cómo es una línea vertical?", o: ["Va de arriba abajo", "Va de lado a lado", "Va inclinada", "Es redonda"] },
        { q: "¿Qué línea usa una rampa?", o: ["Una diagonal", "Una horizontal", "Una vertical", "Una espiral"] },
        { q: "¿Qué se forma donde dos rectas se encuentran?", o: ["Un ángulo", "Un círculo", "Un punto", "Una curva"] },
        { q: "¿Cuántos lados tiene un triángulo?", o: ["Tres", "Cuatro", "Cinco", "Dos"] },
        { q: "¿Cuántos lados tiene un cuadrado?", o: ["Cuatro", "Tres", "Cinco", "Seis"] },
        { q: "¿Cómo debe quedar una línea L?", o: ["Recta y firme", "Curva y suave", "Temblorosa", "Redonda"] },
      ],
      write: [
        "Escribe qué hace cada una: horizontal, vertical y diagonal.",
        "Explica cómo se forma un ángulo con tus palabras.",
      ],
      schematic: [
        "Dibuja un mueble solo con rectas L y marca dos ángulos.",
        "Dibuja un cuadrado y un triángulo y cuenta sus lados.",
      ],
    },
    image: [
      "Dibuja una mesa o una flecha usando solo líneas L.",
      "Marca dos ángulos con un arco pequeño.",
      "Usa al menos una horizontal, una vertical y una diagonal.",
      "Revisa que ninguna línea quede curva ni temblorosa.",
    ],
    summary: "Las L son rectas: horizontales, verticales y diagonales. Donde se encuentran dos rectas se forma un ángulo.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "art-c3-w1-d4",
    opening: ayer,
    repaso: [
      "Ayer practicaste las líneas L rectas.",
      "Vimos horizontales, verticales y diagonales.",
      "Donde se encuentran dos rectas se forma un ángulo.",
    ],
    units: [
      {
        q: [
          "Piensa en una ola o en una hoja. ¿Qué tipo de línea",
          "usarías para su borde?",
        ],
        h: "Punto 1: La curva S",
        a: [
          "Una línea curva y suave es una S.",
          "Una ola, una hoja o una serpiente corta usan S.",
          "La S puede ser suave, ondulada o en espiral.",
          "Las curvas le dan movimiento a tu dibujo.",
        ],
      },
      {
        q: [
          "Imagina que dibujas una serpiente. ¿Qué letras usarías",
          "para su cuerpo, su cabeza y sus ojos?",
        ],
        h: "Punto 2: Combinar las letras",
        a: [
          "El cuerpo es una S larga.",
          "La cabeza puede ser una O.",
          "Los ojos son dos puntos: dos i.",
          "Con O, i y S ya tienes una serpiente.",
        ],
      },
      {
        q: [
          "¿Por dónde empezarías un dibujo con las cuatro letras?",
          "¿Por lo grande o por los adornos?",
        ],
        h: "Punto 3: El orden para dibujar",
        a: [
          "Primero bloquea las formas grandes: O y L.",
          "Bloquear es dibujar lo grande, sin detalles.",
          "Después añade las curvas S.",
          "Al final pones los puntos i.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿qué pasa si empiezas",
          "por los adornos?",
        ],
        h: "Punto 4: Primero la estructura",
        a: [
          "Pierdes la forma grande y el dibujo se descuadra.",
          "La estructura OiLS es el esqueleto del dibujo.",
          "Con el esqueleto firme, los detalles se acomodan.",
          "Primero el esqueleto; después, la decoración.",
        ],
      },
      {
        q: [
          "Ahora tú: ¿cómo nombrarías cada letra que usaste",
          "en tu dibujo?",
        ],
        h: "Punto 5: Nombrar lo que dibujaste",
        a: [
          "Haz una lista al margen: O, i, L y S.",
          "Junto a cada letra, escribe qué parte del dibujo es.",
          "Por ejemplo: «S: el cuerpo de la serpiente».",
          "Así demuestras que sabes lo que dibujaste.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué letra de OiLS son las líneas curvas?", o: ["S", "L", "O", "i"] },
        { q: "¿Qué objeto usa una curva S?", o: ["Una ola", "Una mesa", "Una caja", "Un plato"] },
        { q: "En la serpiente, ¿qué letra es el cuerpo?", o: ["S", "i", "L", "O"] },
        { q: "En la serpiente, ¿qué letra son los ojos?", o: ["i", "S", "L", "O"] },
        { q: "¿Qué se dibuja primero en un dibujo con OiLS?", o: ["Las formas grandes", "Los puntos", "Los adornos", "La sombra"] },
        { q: "¿Qué se pone al final del dibujo?", o: ["Los puntos i", "Las formas grandes", "El esqueleto", "El eje"] },
        { q: "¿Qué pasa si empiezas por los adornos?", o: ["Pierdes la forma grande", "El dibujo queda firme", "Se vuelve una L", "Se borran los puntos"] },
        { q: "¿Qué escribes al margen al terminar?", o: ["La lista O-i-L-S", "Tu nombre", "La fecha", "Un número"] },
      ],
      write: [
        "Escribe qué parte de tu dibujo es O, i, L y S.",
        "Explica por qué la estructura va antes que los adornos.",
      ],
      schematic: [
        "Dibuja una serpiente y rotula su S, su O y sus dos i.",
        "Dibuja los pasos: formas grandes, curvas y puntos.",
      ],
    },
    image: [
      "Dibuja una hoja, una ola o una serpiente con las cuatro letras.",
      "Primero las formas grandes, luego las curvas S, al final las i.",
      "Escribe la lista O-i-L-S al margen del dibujo.",
      "Junto a cada letra anota qué parte representa.",
    ],
    summary: "Con las curvas S completamos OiLS. Un buen dibujo empieza con la estructura y deja los adornos para el final.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "art-c3-w1-d5",
    opening: ayer,
    repaso: [
      "Esta semana aprendiste a mirar un dibujo por partes.",
      "Vimos formas redondas, puntos, rectas y curvas.",
      "Hoy las recuerdas y aprendes a contarlas.",
    ],
    units: [
      {
        q: [
          "Sin mirar nada: ¿qué significa cada letra de OiLS?",
        ],
        w: 3,
        h: "Punto 1: Las cuatro letras",
        a: [
          "La «O» son las formas redondas.",
          "La «i» son los puntos o marcas pequeñas.",
          "La «L» son las líneas rectas que forman ángulos.",
          "La «S» son las líneas curvas.",
        ],
      },
      {
        q: [
          "¿Quién enseñó esta forma de mirar los dibujos?",
          "¿Y qué se mira primero?",
        ],
        h: "Punto 2: Mirar antes de dibujar",
        a: [
          "Mona Brookes enseñó a mirar un dibujo por piezas.",
          "Primero se mira la forma grande y luego el detalle.",
          "Mirar bien antes de dibujar evita errores.",
          "Un dibujo con O, i, L y S resume la semana.",
        ],
      },
      {
        q: [
          "Imagina una casa con ventana redonda y humo en espiral.",
          "¿Qué letras de OiLS encuentras?",
        ],
        h: "Punto 3: Buscar OiLS en una escena",
        a: [
          "La ventana redonda es una O.",
          "Las paredes y el techo son rectas: son L.",
          "El humo en espiral es una S.",
          "Y la perilla de la puerta es un punto: una i.",
        ],
      },
      {
        q: [
          "Vas a mostrar tu dibujo a alguien de tu casa.",
          "¿Cómo se lo explicarías con orden?",
        ],
        h: "Punto 4: Cómo contarlo con orden",
        a: [
          "Empieza diciendo qué dibujaste.",
          "Sigue con la forma grande y luego con los detalles.",
          "Señala cada parte y di su letra: O, i, L o S.",
          "Termina contando qué fue lo más difícil y da las gracias.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿basta con saber las letras",
          "de memoria?",
        ],
        h: "Punto 5: Saber para qué sirve",
        a: [
          "No basta con la lista de letras.",
          "Hay que usarlas al mirar y al dibujar.",
          "Pregúntate: ¿qué forma veo aquí?",
          "Así tu dibujo tendrá orden y entenderás lo que hiciste.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Quién enseñó a mirar un dibujo por piezas sencillas?", o: ["Mona Brookes", "Un pintor famoso", "Tu maestro de música", "Un escultor"] },
        { q: "En la casa de hoy, ¿qué letra es la ventana redonda?", o: ["O", "i", "L", "S"] },
        { q: "En la casa de hoy, ¿qué letra es el humo en espiral?", o: ["S", "O", "i", "L"] },
        { q: "En la casa de hoy, ¿qué letra son las paredes?", o: ["L", "S", "O", "i"] },
        { q: "En la casa de hoy, ¿qué letra es la perilla?", o: ["i", "L", "S", "O"] },
        { q: "¿Qué se mira primero en un dibujo?", o: ["La forma grande", "El detalle pequeño", "La sombra", "El marco"] },
        { q: "¿Cómo empiezas a contar tu dibujo?", o: ["Diciendo qué dibujaste", "Terminando con gracias", "Borrando algo", "Cambiando de tema"] },
        { q: "¿Qué debes hacer además de saber las letras?", o: ["Usarlas al mirar y dibujar", "Olvidarlas", "Cambiarlas", "Esconderlas"] },
      ],
      write: [
        "Escribe de memoria qué significa cada letra de OiLS.",
        "Cuenta cómo explicarías tu dibujo, de inicio a cierre.",
      ],
      schematic: [
        "Dibuja una casa y rotula una O, una i, una L y una S.",
        "Dibuja un esquema con las cuatro letras y un ejemplo de cada una.",
      ],
    },
    image: [
      "Dibuja una casa con ventana redonda, techo y humo en espiral.",
      "Rotula una O, una i, una L y una S en tu dibujo.",
      "Escribe al margen la lista O-i-L-S con un ejemplo de cada una.",
      "Revisa que se vea primero lo grande y luego los detalles.",
    ],
    summary: "OiLS nos ayuda a mirar un dibujo por piezas: O redondos, i puntos, L rectas y S curvas. Primero lo grande y luego el detalle.",
  },
];
