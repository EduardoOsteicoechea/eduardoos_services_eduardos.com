/**
 * Arte · ciclo 3 · semana 2 · nivel 6 — Dibujos espejo paso a paso.
 * Narrativa inductiva "pregunta primero" (ver BRIEF.md).
 * Ruta de la semana: Atención (mirar), Nombrar (decir forma y lugar), Expresar (dibujar la copia).
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "art-c3-w2-d1",
    opening: "¿Crees que puedes copiar un dibujo como si fueras un espejo?",
    repaso: null,
    units: [
      {
        h: "Punto 1: El eje de simetría",
        a: [
          "Un espejo devuelve una imagen parecida a lo que tiene delante.",
          "En dibujo usamos esa idea sin necesidad de un espejo.",
          "Una hoja o una taza vista de frente tiene dos mitades parecidas.",
          "La línea que las separa se llama eje de simetría.",
        ],
      },
      {
        q: [
          "¿Y si dibujas un círculo a dos dedos del eje, a la izquierda?",
          "¿Dónde pondrías su pareja?",
        ],
        h: "Punto 2: Cada forma tiene su pareja",
        a: [
          "La pareja va a dos dedos del eje, pero a la derecha.",
          "Debe ser del mismo tipo y del mismo tamaño.",
          "Y debe estar a la misma distancia del eje.",
          "Cuando todo coincide, hay simetría.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: si una forma se ve más bonita grande,",
          "¿puedes agrandarla solo en la copia?",
        ],
        h: "Punto 3: Lugar y tamaño importan",
        a: [
          "No. En simetría, el lugar y el tamaño importan.",
          "Si cambias el tamaño, las dos mitades ya no coinciden.",
          "Primero copia igual; los adornos vienen después.",
        ],
      },
      {
        q: [
          "Sigamos. ¿Cómo te ayudaría un papel doblado por la mitad?",
        ],
        h: "Punto 4: Doblar el papel",
        a: [
          "Dobla el papel por la mitad y marca el pliegue.",
          "El pliegue es tu eje.",
          "Dibuja tres formas distintas a un lado del eje.",
          "Doblar sirve para comprobar si las mitades coinciden.",
        ],
      },
      {
        q: [
          "¿En qué orden trabajarías para no equivocarte?",
        ],
        h: "Punto 5: Primero mirar, luego dibujar",
        a: [
          "Primero mira con atención, antes de trazar.",
          "Luego traza el eje y nombra cada forma con OiLS.",
          "Por último, expresas: dibujas tu imagen con lo observado.",
          "Atención, nombrar y expresar: ese es nuestro camino.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cómo se llama la línea que parte una figura en dos?", o: ["Eje de simetría", "Espiral", "Diagonal", "Punto"] },
        { q: "¿Qué hace un espejo con lo que tiene delante?", o: ["Devuelve una imagen parecida", "La borra", "La hace más pequeña", "La pinta de color"] },
        { q: "Si un círculo está a dos dedos del eje, ¿dónde va su pareja?", o: ["A dos dedos, al otro lado", "A un dedo del eje", "Sobre el eje", "Muy lejos del eje"] },
        { q: "¿Qué debe coincidir en dos formas pareja?", o: ["Tipo, tamaño y distancia", "Solo el color", "Solo el nombre", "Solo la sombra"] },
        { q: "¿Cambia el tamaño de una forma solo porque se ve bonita?", o: ["No, el tamaño importa", "Sí, siempre", "Solo la mitad", "Solo con color"] },
        { q: "¿Qué marcas al doblar el papel por la mitad?", o: ["El eje", "Un punto", "Una espiral", "Un ángulo"] },
        { q: "¿Qué se hace primero antes de trazar?", o: ["Mirar con atención", "Pintar", "Sombrear", "Borrar"] },
        { q: "¿Para qué sirve doblar el papel al final?", o: ["Para comprobar las mitades", "Para romperlo", "Para cambiar el eje", "Para pintarlo"] },
      ],
      write: [
        "Explica con tus palabras qué es el eje de simetría.",
        "Cuenta los tres pasos: atención, nombrar y expresar.",
      ],
      schematic: [
        "Dibuja un eje vertical con una forma a cada lado.",
        "Dibuja una hoja con su eje y sus dos mitades.",
      ],
    },
    image: [
      "Dibuja un eje vertical en tu hoja.",
      "A un lado, dibuja tres formas con círculos, puntos o curvas.",
      "Marca con el dedo la distancia de cada forma al eje.",
      "Escribe al margen los nombres OiLS de tus formas.",
    ],
    summary: "El eje parte una figura en dos mitades. Cada forma tiene su pareja al otro lado, con el mismo tipo, tamaño y distancia.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "art-c3-w2-d2",
    opening: ayer,
    repaso: [
      "Ayer vimos que el eje parte una figura en dos mitades.",
      "Cada forma tiene su pareja del otro lado.",
      "Debe coincidir en tipo, tamaño y distancia al eje.",
    ],
    units: [
      {
        q: [
          "¿Qué ves cuando miras una figura con mucha calma?",
          "¿Solo las líneas o también lo que hay entre ellas?",
        ],
        h: "Punto 1: Atención es mirar con calma",
        a: [
          "Atención es observar con calma antes de dibujar.",
          "Se miran las formas y también los espacios vacíos.",
          "Los espacios vacíos son los huecos entre las líneas.",
          "El hueco también te dice cómo es la figura.",
        ],
      },
      {
        q: [
          "Imagina media mariposa pegada al borde del papel.",
          "¿Qué falta y cómo sabrías cómo es?",
        ],
        h: "Punto 2: La media imagen",
        a: [
          "Una media imagen muestra solo un lado de la figura.",
          "El otro lado falta, pero lo puedes deducir.",
          "Será igual al primero, pero del lado contrario.",
          "Por eso hay que mirar muy bien el lado que sí existe.",
        ],
      },
      {
        q: [
          "Antes de trazar, ¿qué formas OiLS ves? ¿Hay un círculo",
          "cerca del eje? ¿Un ángulo abierto hacia afuera?",
        ],
        h: "Punto 3: Listar lo que ves",
        a: [
          "Haz una lista corta en voz baja: círculo, punto, curva.",
          "Anota qué formas OiLS hay y dónde están.",
          "Una lista te evita olvidar partes.",
          "Hacer la lista es parte de mirar con atención.",
        ],
      },
      {
        q: [
          "¿Cómo sabrías a qué distancia del eje está cada forma,",
          "si no tienes regla?",
        ],
        h: "Punto 4: Medir con el dedo",
        a: [
          "Usa tu dedo como medida: a un dedo, a dos dedos.",
          "Mide desde el eje hasta cada forma.",
          "Anota la distancia al margen del dibujo.",
          "Esa medida te guiará cuando copies al otro lado.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿conviene sombrear antes de que",
          "las líneas principales coincidan?",
        ],
        h: "Punto 5: Primero forma y distancia",
        a: [
          "No. Primero van la forma y la distancia al eje.",
          "Los detalles y las sombras van después.",
          "Si adornas antes, es difícil corregir un error.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es la atención al dibujar?", o: ["Observar con calma", "Dibujar muy rápido", "Pintar de color", "Borrar todo"] },
        { q: "¿Qué son los espacios vacíos?", o: ["Huecos entre las líneas", "Manchas de color", "Líneas gruesas", "El borde del papel"] },
        { q: "¿Qué muestra una media imagen?", o: ["Solo un lado de la figura", "La figura entera", "Solo el color", "Solo el eje"] },
        { q: "¿Qué haces antes de trazar la copia?", o: ["Listar las formas OiLS", "Sombrear", "Pintar", "Doblar y romper"] },
        { q: "¿Con qué puedes medir la distancia al eje?", o: ["Con tu dedo", "Con un color", "Con un borrador", "Con una sombra"] },
        { q: "¿Desde dónde mides la distancia de una forma?", o: ["Desde el eje", "Desde el borde del papel", "Desde tu mano", "Desde la sombra"] },
        { q: "¿Qué va primero: la forma o los adornos?", o: ["La forma y la distancia", "Los adornos", "Las sombras", "Los colores"] },
        { q: "¿Por qué no conviene sombrear antes?", o: ["Es difícil corregir errores", "Gasta el lápiz", "Cambia el eje", "Hace el papel más grande"] },
      ],
      write: [
        "Explica qué es una media imagen con tus palabras.",
        "Cuenta cómo mides la distancia de una forma al eje.",
      ],
      schematic: [
        "Dibuja un eje y una media imagen con dos curvas y un ángulo.",
        "Dibuja flechas que muestren la distancia de cada forma al eje.",
      ],
    },
    image: [
      "Divide tu hoja con un eje vertical.",
      "En un lado dibuja dos curvas y un ángulo.",
      "Anota al margen la distancia de cada forma al eje.",
      "No sombrees todavía: primero forma y distancia.",
    ],
    summary: "Atención es mirar con calma la media imagen y los espacios vacíos. Medimos con el dedo antes de copiar.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "art-c3-w2-d3",
    opening: ayer,
    repaso: [
      "Ayer practicaste la atención antes de dibujar.",
      "Miraste la media imagen y los espacios vacíos.",
      "Mediste con el dedo la distancia de cada forma al eje.",
    ],
    units: [
      {
        q: [
          "Si te digo «hay una forma», ¿te sirve para copiarla?",
          "¿Qué más necesitarías saber?",
        ],
        h: "Punto 1: Nombrar es decir con precisión",
        a: [
          "Nombrar es decir qué forma es y dónde está.",
          "Usa el vocabulario OiLS: círculo, punto, línea, ángulo, curva.",
          "Y di dónde está respecto al eje de simetría.",
          "El eje es la línea central del dibujo.",
        ],
      },
      {
        q: [
          "Prueba decir dónde está una curva. ¿Cómo lo dirías",
          "para que otra persona la dibuje igual?",
        ],
        h: "Punto 2: Una frase que sirve",
        a: [
          "Por ejemplo: «Curva grande a un dedo del eje, arriba del centro».",
          "Esa frase dice la forma, el tamaño, la distancia y el lugar.",
          "Con una frase así, otra persona podría dibujarla.",
        ],
      },
      {
        q: [
          "Ahora pasa al otro lado. ¿Qué palabra de la frase",
          "tendrías que cambiar?",
        ],
        h: "Punto 3: Cambiar izquierda por derecha",
        a: [
          "Solo cambias izquierda por derecha.",
          "La curva sigue siendo grande, a un dedo y arriba del centro.",
          "Solo cambia el lado: la copia queda del otro lado del eje.",
        ],
      },
      {
        q: [
          "¿Cuándo escribirías la frase: antes de trazar la copia",
          "o después?",
        ],
        h: "Punto 4: Escribir antes de trazar",
        a: [
          "Escríbela antes de trazar la copia.",
          "Léela en voz alta mientras dibujas.",
          "Nombrar bien evita adivinar a ciegas.",
          "Quien nombra con precisión dibuja con seguridad.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿qué le falta a la frase",
          "«hay una forma»?",
        ],
        h: "Punto 5: Lo que le falta a la frase",
        a: [
          "Le falta el nombre OiLS: ¿círculo, punto, línea o curva?",
          "Le falta la distancia al eje: ¿a cuántos dedos?",
          "Y le falta el lugar: ¿arriba, abajo o al centro?",
          "Con esas tres cosas, tu frase ya sirve.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es nombrar al dibujar?", o: ["Decir qué forma es y dónde está", "Pintar la forma", "Borrar la forma", "Copiar sin mirar"] },
        { q: "¿Qué palabras forman el vocabulario OiLS?", o: ["Círculo, punto, línea, ángulo, curva", "Rojo, azul, verde", "Mesa, silla, cama", "Arriba, abajo, centro"] },
        { q: "¿Qué dice la frase «a un dedo del eje»?", o: ["La distancia", "El color", "El nombre", "La sombra"] },
        { q: "¿Qué cambias en la frase al pasar al otro lado?", o: ["Izquierda por derecha", "La forma", "El tamaño", "La distancia"] },
        { q: "¿Cuándo escribes la frase?", o: ["Antes de trazar la copia", "Después de colorear", "Al borrar", "Nunca"] },
        { q: "¿Qué evita nombrar bien?", o: ["Adivinar a ciegas", "Mirar el eje", "Doblar el papel", "Usar lápiz"] },
        { q: "¿Qué le falta a la frase «hay una forma»?", o: ["Nombre, distancia y lugar", "Un color", "Una sombra", "Un marco"] },
        { q: "¿Qué es el eje de simetría?", o: ["La línea central del dibujo", "Una sombra", "Un adorno", "Un color"] },
      ],
      write: [
        "Escribe tres frases que nombren forma y posición.",
        "Explica por qué conviene escribir antes de trazar.",
      ],
      schematic: [
        "Dibuja una figura con eje y rotula tres formas con su frase.",
        "Dibuja flechas del eje a cada forma con su distancia.",
      ],
    },
    image: [
      "Elige una figura simétrica sencilla y dibuja su eje.",
      "Rotula cada forma con su nombre OiLS.",
      "Escribe tres frases: forma, distancia al eje y lugar.",
      "Todavía no dibujes la copia: primero nombra bien.",
    ],
    summary: "Nombrar es decir la forma, la distancia al eje y el lugar. Una buena frase guía la copia al otro lado.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "art-c3-w2-d4",
    opening: ayer,
    repaso: [
      "Ayer practicaste nombrar las formas con precisión.",
      "Dijiste qué forma era y dónde estaba respecto al eje.",
      "Esas frases guían la copia al otro lado.",
    ],
    units: [
      {
        q: [
          "Hoy vas a dibujar una imagen espejo completa.",
          "¿Qué crees que significa expresar?",
        ],
        h: "Punto 1: Expresar es crear tu dibujo",
        a: [
          "Expresar es convertir lo que observaste en tu dibujo.",
          "Hay que hacerlo con cuidado y con orden.",
          "Para lograr simetría, conserva el tipo de forma,",
          "el tamaño aproximado y la distancia al eje.",
        ],
      },
      {
        q: [
          "Imagina media mariposa. ¿Qué harías primero",
          "y qué dejarías para el final?",
        ],
        h: "Punto 2: Un orden que funciona",
        a: [
          "Primero traza el eje.",
          "Segundo, copia el contorno grande.",
          "Tercero, revisa los pares OiLS uno por uno.",
          "Por último, añade los detalles pequeños.",
        ],
      },
      {
        q: [
          "Si un ala tiene dos curvas, ¿cuántas curvas necesita",
          "la otra ala?",
        ],
        h: "Punto 3: Cada par debe coincidir",
        a: [
          "La otra ala necesita las mismas dos curvas, no una sola.",
          "Cada forma de un lado tiene su pareja en el otro.",
          "Revisa pareja por pareja: tipo, tamaño y distancia.",
          "Así ninguna forma se queda sin su copia.",
        ],
      },
      {
        q: [
          "¿Cómo puedes comprobar si tu dibujo quedó simétrico?",
        ],
        h: "Punto 4: Doblar y comprobar",
        a: [
          "Dobla el papel por el eje y mira si las formas se encuentran.",
          "Si no coinciden, corrige una curva antes de añadir color.",
          "Los adornos esperan hasta que todo coincida.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: si un lado tiene muchos adornos,",
          "¿puedes dejar el otro vacío?",
        ],
        h: "Punto 5: Cerrar la forma en ambos lados",
        a: [
          "No. Cierra primero la forma principal en ambos lados.",
          "Los adornos vienen cuando las dos mitades están completas.",
          "Así el dibujo queda equilibrado, igual de lleno a cada lado.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es expresar al dibujar?", o: ["Hacer tu dibujo con lo observado", "Mirar sin dibujar", "Borrar el eje", "Copiar sin cuidado"] },
        { q: "¿Qué se traza primero en la mariposa?", o: ["El eje", "Los adornos", "El color", "Las sombras"] },
        { q: "¿Qué se copia después del eje?", o: ["El contorno grande", "Los adornos", "Las sombras", "Los puntos pequeños"] },
        { q: "¿Qué se añade por último?", o: ["Los detalles pequeños", "El eje", "El contorno", "El papel"] },
        { q: "Si un ala tiene dos curvas, ¿cuántas tiene la otra?", o: ["Dos", "Una", "Tres", "Ninguna"] },
        { q: "¿Qué debe conservar la copia?", o: ["Tipo, tamaño y distancia", "Solo el color", "Solo el nombre", "Solo el adorno"] },
        { q: "¿Cómo compruebas que las mitades coinciden?", o: ["Doblando por el eje", "Pintando todo", "Borrando el eje", "Mirando de lejos"] },
        { q: "Si no coinciden, ¿qué haces antes de añadir color?", o: ["Corriges una curva", "Cambias el papel", "Borras el eje", "Añades adornos"] },
      ],
      write: [
        "Escribe los cuatro pasos para dibujar una imagen espejo.",
        "Explica cómo compruebas que tu dibujo es simétrico.",
      ],
      schematic: [
        "Dibuja media mariposa con su eje y sus pares OiLS marcados.",
        "Dibuja los cuatro pasos en orden con flechas.",
      ],
    },
    image: [
      "Dibuja media mariposa con círculos, curvas y ángulos.",
      "Completa el ala paso a paso y compara distancias al eje.",
      "Dobla el papel por el eje para comprobar las mitades.",
      "Corrige una curva si no coinciden antes de añadir color.",
    ],
    summary: "Expresar es dibujar la copia con orden: eje, contorno, pares OiLS y detalles. Doblar el papel comprueba la simetría.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "art-c3-w2-d5",
    opening: ayer,
    repaso: [
      "Esta semana hiciste dibujos espejo paso a paso.",
      "Usaste atención, nombrar y expresar.",
      "Hoy los recuerdas y aprendes a contarlos.",
    ],
    units: [
      {
        q: [
          "Sin mirar nada: ¿cuáles son los tres pasos que usamos",
          "para dibujar un espejo?",
        ],
        w: 3,
        h: "Punto 1: Atención, nombrar y expresar",
        a: [
          "Atención: mirar con calma la media imagen.",
          "Nombrar: decir qué forma es y dónde está.",
          "Expresar: dibujar tu imagen con lo que observaste.",
          "Si olvidaste alguno, dilo otra vez en voz alta.",
        ],
      },
      {
        q: [
          "¿Qué es el eje de simetría y qué hace con la figura?",
        ],
        h: "Punto 2: El eje de simetría",
        a: [
          "El eje es una línea recta que parte la figura en dos.",
          "Las dos mitades son iguales, como en un espejo.",
          "OiLS nombra las formas: círculo, punto, línea, ángulo, curva.",
          "Cada forma tiene su pareja al otro lado del eje.",
        ],
      },
      {
        q: [
          "Antes de copiar, ¿qué debes medir de cada forma?",
        ],
        h: "Punto 3: Medir antes de copiar",
        a: [
          "Mide la distancia de cada forma al eje.",
          "La otra mitad repite el mismo tamaño y el mismo lugar.",
          "Primero la parte simétrica; los detalles, al final.",
          "No inventes adornos nuevos antes de cerrar la figura.",
        ],
      },
      {
        q: [
          "Vas a explicarle tu dibujo espejo a alguien de tu casa.",
          "¿Cómo lo contarías con orden?",
        ],
        h: "Punto 4: Cómo contarlo con orden",
        a: [
          "Empieza mostrando el eje y diciendo qué dibujaste.",
          "Sigue con las formas: nómbralas y di dónde están.",
          "Explica cómo comprobaste que las mitades coinciden.",
          "Cierra contando qué fue lo más difícil y da las gracias.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: si puedes trazar una figura espejo",
          "con OiLS, ¿qué ya sabes hacer?",
        ],
        h: "Punto 5: La idea central de la semana",
        a: [
          "Ya sabes mirar con atención una media imagen.",
          "Ya sabes nombrar las formas y su lugar.",
          "Y ya sabes expresar una figura simétrica completa.",
          "Esa es la idea central de la semana.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuáles son los tres pasos de la semana?", o: ["Atención, nombrar y expresar", "Pintar, borrar y doblar", "Medir, cortar y pegar", "Copiar, sombrear y colorear"] },
        { q: "¿Qué es atención?", o: ["Mirar con calma la media imagen", "Dibujar rápido", "Pintar de color", "Borrar el eje"] },
        { q: "¿Qué es nombrar?", o: ["Decir qué forma es y dónde está", "Mirar sin hablar", "Doblar el papel", "Cambiar el eje"] },
        { q: "¿Qué es expresar?", o: ["Dibujar tu imagen con lo observado", "Mirar sin trazar", "Borrar la copia", "Medir con el dedo"] },
        { q: "¿Qué hace el eje con la figura?", o: ["La parte en dos mitades", "La pinta", "La agranda", "La borra"] },
        { q: "¿Qué debes medir antes de copiar?", o: ["La distancia al eje", "El color", "La sombra", "El papel"] },
        { q: "¿Qué va primero: la parte simétrica o los detalles?", o: ["La parte simétrica", "Los detalles", "Las sombras", "Los adornos"] },
        { q: "¿Cómo empiezas a contar tu dibujo espejo?", o: ["Mostrando el eje", "Dando las gracias", "Borrando algo", "Cambiando de tema"] },
      ],
      write: [
        "Escribe de memoria los tres pasos para dibujar un espejo.",
        "Cuenta cómo explicarías tu dibujo, de inicio a cierre.",
      ],
      schematic: [
        "Dibuja un esquema con atención, nombrar y expresar en orden.",
        "Dibuja una figura espejo con su eje y sus pares marcados.",
      ],
    },
    image: [
      "Dibuja una figura espejo con su eje de simetría.",
      "Marca con la misma letra cada pareja de formas OiLS.",
      "Escribe debajo los tres pasos: atención, nombrar, expresar.",
      "Revisa que ambas mitades coincidan antes de colorear.",
    ],
    summary: "En un dibujo espejo miramos con atención, nombramos cada forma y expresamos la copia con el mismo tipo, tamaño y distancia.",
  },
];
