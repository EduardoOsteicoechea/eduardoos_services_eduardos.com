/**
 * Proyecto · ciclo 3 · semana 1 · nivel 6 — experimento «Guiñando» (taumatropo),
 * narrativa inductiva "pregunta primero".
 *
 * unit = { q: [líneas de pregunta] (omitir en d1 punto 1),
 *          h: "Punto N: título", a: [líneas de respuesta], w?: líneas de espacio, c?: líneas para copiar }
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "pro-c3-w1-d1",
    opening: "¿Crees que un dibujo quieto puede parecer que se mueve?",
    repaso: null,
    units: [
      {
        h: "Punto 1: Un experimento es una prueba ordenada",
        a: [
          "Sí se puede, y lo vamos a comprobar con un experimento.",
          "Un experimento es una prueba hecha con orden.",
          "Sirve para observar algo y entender por qué pasa.",
          "El nuestro se llama «Guiñando»: un ojo que parece guiñar.",
        ],
      },
      {
        q: [
          "Imagina un disco con un ojo abierto de un lado",
          "y un ojo cerrado del otro. ¿Qué verías si gira rápido?",
        ],
        h: "Punto 2: El disco que parece guiñar",
        a: [
          "Verías un solo ojo que parece abrirse y cerrarse.",
          "Ese disco se llama taumatropo: un juguete antiguo.",
          "Tiene un dibujo en cada cara.",
          "Los dos dibujos no se mezclan en el papel.",
        ],
      },
      {
        q: [
          "Sigamos. ¿Con qué parte del cuerpo ves y cuál",
          "entiende lo que ves?",
        ],
        h: "Punto 3: La persistencia de la visión",
        a: [
          "Ves con los ojos, y el cerebro entiende lo que ves.",
          "La retina es la parte del ojo que recibe la imagen.",
          "El ojo guarda cada imagen por un instante muy corto.",
          "Si cambian muy rápido, el cerebro las une en una sola.",
          "A eso se le llama persistencia de la visión.",
        ],
      },
      {
        q: [
          "Imagina que vas a armar el disco. ¿Qué materiales",
          "crees que necesitas?",
        ],
        h: "Punto 4: Los materiales",
        a: [
          "Necesitas cartulina firme para hacer el disco.",
          "También un lápiz, cinta y tijeras.",
          "Pide ayuda a un adulto para recortar con las tijeras.",
          "Anota en tu bitácora, tu cuaderno de experimento, qué usaste.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: si los dos dibujos no quedan",
          "uno justo detrás del otro, ¿se verá el guiño?",
        ],
        h: "Punto 5: Los pasos del montaje",
        a: [
          "Es difícil verlo: los dibujos deben quedar alineados.",
          "Paso 1: dibuja el ojo abierto en una cara.",
          "Paso 2: dibuja el ojo cerrado en la otra cara.",
          "Paso 3: recorta el disco con ayuda y pégalo a un lápiz.",
          "Paso 4: gira el lápiz rápido entre tus manos.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es un experimento?", o: ["Una prueba hecha con orden", "Un cuento muy largo", "Un juego sin reglas", "Una lista de compras"] },
        { q: "¿Cómo se llama nuestro experimento de la semana?", o: ["Guiñando", "Girando", "Dibujando", "Brillando"] },
        { q: "¿Qué dibujos lleva el disco?", o: ["Ojo abierto y ojo cerrado", "Sol y luna", "Gato y perro", "Dos ojos abiertos"] },
        { q: "¿Qué parte del ojo recibe la imagen?", o: ["La retina", "La uña", "La pestaña", "El párpado"] },
        { q: "¿Qué une las imágenes rápidas en una sola?", o: ["El cerebro", "La cinta", "La tijera", "El lápiz"] },
        { q: "¿Cómo se llama guardar una imagen un instante?", o: ["Persistencia de la visión", "Refracción", "Bitácora", "Procedimiento"] },
        { q: "¿Para qué pides ayuda a un adulto?", o: ["Para recortar con las tijeras", "Para dibujar los ojos", "Para girar el disco", "Para escribir la bitácora"] },
        { q: "¿Qué pasa si los dibujos no quedan alineados?", o: ["Es difícil ver el guiño", "Se ve mejor el guiño", "El disco no gira nunca", "Se ven tres ojos"] },
      ],
      write: [
        "Escribe los materiales que necesitas para el disco.",
        "Explica con tus palabras qué es la persistencia de la visión.",
      ],
      schematic: [
        "Dibuja el disco con sus dos caras: ojo abierto y cerrado.",
        "Dibuja un esquema: ojo, retina, cerebro y la imagen unida.",
      ],
    },
    image: [
      "Dibuja un disco con un ojo abierto de un lado.",
      "Dibuja del otro lado el mismo ojo, pero cerrado.",
      "Rotula: disco, lápiz, cinta y cartulina.",
      "Añade una flecha que muestre hacia dónde gira.",
    ],
    summary: "Un experimento es una prueba ordenada. Hoy conociste el disco «Guiñando» y la persistencia de la visión.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "pro-c3-w1-d2",
    opening: ayer,
    repaso: [
      "Ayer supiste que un experimento es una prueba con orden.",
      "Conociste el disco «Guiñando»: ojo abierto y ojo cerrado.",
      "Aprendiste que el cerebro une imágenes que cambian rápido.",
    ],
    units: [
      {
        q: [
          "Piensa un momento: tu disco ya está armado. ¿Qué",
          "revisarías antes de girarlo?",
        ],
        h: "Punto 1: Revisar el disco",
        a: [
          "Revisa que los dos ojos queden centrados, uno detrás del otro.",
          "Revisa que la cartulina esté firme y no se doble.",
          "Revisa que la cinta deje girar el lápiz con suavidad.",
          "Si algo falla, corrígelo y prueba otra vez.",
        ],
      },
      {
        q: [
          "Imagina que giras el disco y no ves el guiño. ¿Eso",
          "significa que el experimento salió mal?",
        ],
        h: "Punto 2: Un intento que falla también enseña",
        a: [
          "No. Un intento que falla también te enseña algo.",
          "Te dice qué debes mejorar en el disco.",
          "Cambia una sola cosa y vuelve a probar.",
          "Así sabrás qué cambio sirvió.",
        ],
      },
      {
        q: [
          "Sigamos. ¿Cómo harías para no olvidar lo que probaste",
          "en cada intento?",
        ],
        h: "Punto 3: La bitácora",
        a: [
          "Lo anotas en la bitácora, el cuaderno de tu experimento.",
          "Arriba escribes la fecha de hoy.",
          "Cada vez que pruebas, anotas qué intento fue.",
          "También escribes qué pasó: si se vio el guiño o no.",
        ],
      },
      {
        q: [
          "¿Y cómo ordenarías esas notas para leerlas fácil?",
          "Piensa en filas y columnas.",
        ],
        h: "Punto 4: Una tabla para ordenar",
        a: [
          "Una tabla tiene filas y columnas, como una cuadrícula.",
          "Una columna dice «Intento» y la otra dice «Resultado».",
          "Cada fila es una prueba: intento 1, intento 2, intento 3.",
          "En el resultado escribe «sí se vio el guiño» o «no».",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿puedes empezar hoy otro",
          "experimento distinto con otros materiales?",
        ],
        h: "Punto 5: Un solo experimento esta semana",
        a: [
          "No. Esta semana hacemos un solo experimento.",
          "Seguimos con «Guiñando» hasta entenderlo bien.",
          "Un buen científico profundiza antes de cambiar de tema.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué revisas antes de girar el disco?", o: ["Que los ojos estén centrados", "El color del lápiz", "La hora del día", "El peso de la cinta"] },
        { q: "¿Qué es la bitácora?", o: ["El cuaderno del experimento", "Un tipo de tijera", "Un disco de cartulina", "Una luz especial"] },
        { q: "¿Qué se escribe arriba en la bitácora?", o: ["La fecha de hoy", "Tu color favorito", "El precio de la cartulina", "El nombre del lápiz"] },
        { q: "¿Qué columnas tiene nuestra tabla?", o: ["Intento y resultado", "Fecha y lugar", "Color y tamaño", "Peso y precio"] },
        { q: "Si falla un intento, ¿qué haces?", o: ["Cambias una sola cosa y pruebas", "Botas todo y empiezas otro", "Dejas de anotar", "Cambias cinco cosas"] },
        { q: "¿Cuántos experimentos hacemos esta semana?", o: ["Uno solo", "Cinco distintos", "Uno por día", "Ninguno"] },
        { q: "¿Qué anotas en la columna Resultado?", o: ["Si se vio el guiño o no", "La fecha de ayer", "El nombre del niño", "El precio del disco"] },
        { q: "¿Un intento que falla sirve de algo?", o: ["Sí, dice qué mejorar", "No, no sirve", "Solo si te ríes", "Solo si es el primero"] },
      ],
      write: [
        "Escribe tres líneas: qué hiciste, qué viste y qué falta.",
        "Explica para qué sirve una tabla en tu bitácora.",
      ],
      schematic: [
        "Dibuja una tabla con las columnas Intento y Resultado.",
        "Dibuja tu disco y marca si los ojos quedan centrados.",
      ],
    },
    image: [
      "Dibuja tu disco por la cara del ojo abierto.",
      "Marca una cruz en el centro para alinear bien.",
      "Dibuja al lado una tabla con tres filas de intentos.",
      "Rotula las columnas: Intento y Resultado.",
    ],
    summary: "En la bitácora anotas la fecha, cada intento y su resultado en una tabla.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "pro-c3-w1-d3",
    opening: ayer,
    repaso: [
      "Ayer revisaste el disco y corregiste lo que falló.",
      "Anotaste cada intento y su resultado en tu bitácora.",
      "Usaste una tabla con las columnas Intento y Resultado.",
    ],
    units: [
      {
        q: [
          "Piensa en una receta de cocina. ¿Por qué sus pasos",
          "van en orden?",
        ],
        h: "Punto 1: El procedimiento",
        a: [
          "Si cambias el orden, la receta no sale bien.",
          "Un procedimiento es una serie de pasos en orden.",
          "Seguir el orden permite observar qué sucede.",
          "Hoy seguimos los pasos del disco con mucho cuidado.",
        ],
      },
      {
        q: [
          "Sigamos. Si giras el disco despacio y luego rápido,",
          "¿cuál crees que mostrará mejor el guiño?",
        ],
        h: "Punto 2: Probar dos velocidades",
        a: [
          "Con el giro rápido se ve mejor el ojo que guiña.",
          "Con el giro lento se ven los dos dibujos por separado.",
          "Por eso comparamos: una prueba lenta y otra rápida.",
          "Anota cada una en tu tabla.",
        ],
      },
      {
        q: [
          "Imagina que mañana quieres repetir tu mejor intento.",
          "¿Qué tendrías que haber anotado?",
        ],
        h: "Punto 3: Un buen registro",
        a: [
          "Anotaste la velocidad: lenta o rápida.",
          "Y una observación concreta, algo que viste de verdad.",
          "Por ejemplo: «con giro rápido, el ojo guiñó».",
          "Un buen registro permite repetir el éxito mañana.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: si el disco guiñó una vez,",
          "¿ya sabes por qué pasa?",
        ],
        h: "Punto 4: Observar sin inventar",
        a: [
          "Todavía no. Primero observas con calma.",
          "Observar es mirar con atención lo que pasa de verdad.",
          "Anota solo lo que viste, no lo que imaginas.",
          "Luego piensas por qué pasó.",
        ],
      },
      {
        q: [
          "Ahora tú: ¿qué más podrías mejorar para que el",
          "guiño se vea más claro?",
        ],
        h: "Punto 5: Mejorar el disco",
        a: [
          "Puedes alinear mejor los dos ojos.",
          "Puedes usar una cartulina más firme.",
          "Puedes girar el lápiz con más suavidad.",
          "Cambia una sola cosa y anota qué pasó.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es un procedimiento?", o: ["Una serie de pasos en orden", "Un dibujo sin pasos", "Un tipo de cartulina", "Una luz muy fuerte"] },
        { q: "¿Qué velocidad muestra mejor el guiño?", o: ["La rápida", "La lenta", "Ninguna", "Con el disco quieto"] },
        { q: "¿Qué pasa con el giro muy lento?", o: ["Se ven los dos dibujos separados", "Se ve un ojo perfecto", "El disco brilla", "El ojo se cierra solo"] },
        { q: "¿Cuántas velocidades comparamos hoy?", o: ["Dos", "Una", "Cinco", "Diez"] },
        { q: "¿Qué anotas junto a la velocidad?", o: ["Una observación concreta", "El precio", "Tu comida favorita", "El nombre del lápiz"] },
        { q: "¿Qué significa observar?", o: ["Mirar con atención lo que pasa", "Imaginar lo que no pasó", "Adivinar el resultado", "Dibujar sin mirar"] },
        { q: "¿Para qué sirve un buen registro?", o: ["Para repetir el éxito mañana", "Para no hacer la tarea", "Para romper el disco", "Para cambiar de tema"] },
        { q: "¿Cuántas cosas cambias a la vez para mejorar?", o: ["Una sola", "Todas", "Ninguna", "Cinco"] },
      ],
      write: [
        "Escribe los pasos del disco numerados del 1 al 4.",
        "Cuenta qué velocidad probaste y qué observaste.",
      ],
      schematic: [
        "Dibuja una tabla con velocidad y observación.",
        "Dibuja el disco girando lento y girando rápido.",
      ],
    },
    image: [
      "Dibuja dos discos, uno girando lento y otro rápido.",
      "Dibuja el primero con los dos ojos separados.",
      "Dibuja el segundo con un solo ojo que guiña.",
      "Escribe debajo de cada uno: lenta o rápida.",
    ],
    summary: "Un procedimiento es una serie de pasos en orden. Comparas velocidades y anotas lo que observas.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "pro-c3-w1-d4",
    opening: ayer,
    repaso: [
      "Ayer comparaste un giro lento con uno rápido.",
      "Anotaste la velocidad y lo que observaste.",
      "Aprendiste a anotar solo lo que viste de verdad.",
    ],
    units: [
      {
        q: [
          "Casi terminas el experimento. ¿Qué debes tener listo",
          "para poder explicarlo mañana?",
        ],
        h: "Punto 1: Cerrar el experimento",
        a: [
          "Debes tener tu disco terminado y funcionando.",
          "Y tus datos anotados en la bitácora.",
          "Con eso podrás explicar qué pasó.",
        ],
      },
      {
        q: [
          "Antes de escribir una conclusión, ¿qué crees que",
          "conviene hacer primero?",
        ],
        h: "Punto 2: Planificar antes de escribir",
        a: [
          "Conviene planificar: pensar antes de escribir.",
          "Una conclusión es lo que descubriste al final.",
          "Haz un plan de tres líneas:",
          "qué hiciste, qué viste y qué crees que pasó.",
        ],
      },
      {
        q: [
          "Sigamos. Si tu disco guiñó, ¿qué ocurrió dentro",
          "de tu ojo y de tu cerebro?",
        ],
        h: "Punto 3: La explicación",
        a: [
          "La retina recibió la imagen del ojo abierto y del cerrado.",
          "El ojo guarda cada imagen por un instante.",
          "Como cambian tan rápido, el cerebro las une.",
          "Eso es la persistencia de la visión.",
        ],
      },
      {
        q: [
          "Imagina que alguien dice: «Funcionó» y nada más.",
          "¿Eso explica el experimento?",
        ],
        h: "Punto 4: Una conclusión completa",
        a: [
          "No. Falta contar qué viste y por qué crees que pasó.",
          "Puedes escribir: «Vi que el ojo guiñaba al girar rápido».",
          "Y seguir: «Creo que pasó porque el cerebro unió las imágenes».",
        ],
      },
      {
        q: [
          "Ahora tú: ¿cómo contarías tu resultado usando las",
          "palabras persistencia, retina y cerebro?",
        ],
        h: "Punto 5: La ficha del experimento",
        a: [
          "Tu ficha tiene el propósito: ¿puede un disco guiñar?",
          "Tiene un resultado de tu tabla de datos.",
          "Y una oración que explica por qué ocurrió.",
          "Usa las palabras persistencia, retina y cerebro.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es una conclusión?", o: ["Lo que descubriste al final", "Los materiales del inicio", "El título del disco", "La fecha de hoy"] },
        { q: "¿Qué haces antes de escribir la conclusión?", o: ["Planificar tres líneas", "Cambiar de experimento", "Borrar la bitácora", "Girar sin mirar"] },
        { q: "¿Qué recibe las imágenes en el ojo?", o: ["La retina", "La cinta", "El lápiz", "La cartulina"] },
        { q: "¿Quién une las imágenes que cambian rápido?", o: ["El cerebro", "La tijera", "El lápiz", "La mano"] },
        { q: "¿Cómo se llama este efecto?", o: ["Persistencia de la visión", "Bitácora", "Procedimiento", "Tabla"] },
        { q: "¿Cuál es la primera línea del plan?", o: ["Qué hiciste", "Qué comerás", "Quién ganó", "Cuánto costó"] },
        { q: "¿Qué tiene la ficha del experimento?", o: ["Propósito, resultado y explicación", "Solo un dibujo", "Solo la fecha", "Una lista de juegos"] },
        { q: "¿Basta con escribir «Funcionó»?", o: ["No, falta contar qué viste", "Sí, basta", "Sí, si es corto", "Solo si lo dice un adulto"] },
      ],
      write: [
        "Escribe tu plan de tres líneas sobre el experimento.",
        "Escribe una frase que empiece con «Creo que pasó porque».",
      ],
      schematic: [
        "Dibuja un esquema: ojo, retina, cerebro e imagen unida.",
        "Dibuja tu ficha con propósito, resultado y explicación.",
      ],
    },
    image: [
      "Dibuja un ojo grande con su retina al fondo.",
      "Dibuja una flecha que lleve la imagen al cerebro.",
      "Rotula: ojo, retina, cerebro e imagen unida.",
      "Añade tu disco girando al lado del ojo.",
    ],
    summary: "Para concluir planificas qué hiciste, qué viste y qué crees que pasó.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "pro-c3-w1-d5",
    opening: ayer,
    repaso: [
      "Esta semana armaste el disco «Guiñando».",
      "Anotaste tus intentos en una tabla de tu bitácora.",
      "Hoy vas a contárselo a alguien con orden.",
    ],
    units: [
      {
        q: [
          "Sin mirar nada: ¿qué hiciste esta semana en el",
          "experimento y qué descubriste?",
        ],
        w: 3,
        h: "Punto 1: Recordar la semana",
        a: [
          "Armaste un disco con un ojo abierto y uno cerrado.",
          "Lo giraste despacio y rápido, y anotaste todo.",
          "Descubriste la persistencia de la visión.",
        ],
      },
      {
        q: [
          "Si cuentas todo mezclado, ¿se entiende? ¿Qué orden",
          "usarías para contarlo?",
        ],
        h: "Punto 2: Cómo contarlo con orden",
        a: [
          "Primero el propósito: ¿puede un disco parecer que guiña?",
          "Luego los materiales: cartulina, lápiz, cinta y tijeras.",
          "Después la observación: lo que anotaste en la tabla.",
          "Al final la explicación: la persistencia de la visión.",
        ],
      },
      {
        q: [
          "Imagina que ya empiezas a hablar. ¿Cómo harías para",
          "que tu familia te entienda mejor?",
        ],
        h: "Punto 3: Mostrar lo que hiciste",
        a: [
          "Muestra tu disco o un dibujo mientras hablas.",
          "Habla despacio y mira a quien te escucha.",
          "Ensaya dos minutos en voz alta antes de empezar.",
          "No leas solo el título del experimento.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: si alguien te pregunta algo",
          "que no sabes, ¿qué respondes?",
        ],
        h: "Punto 4: Responder con tus datos",
        a: [
          "Responde con lo que anotaste en tu bitácora.",
          "No inventes una respuesta.",
          "Si no lo sabes, di: «Voy a probarlo otra vez».",
          "Escucha las preguntas con respeto.",
        ],
      },
      {
        q: [
          "Ahora tú: ¿con qué frase terminarías para explicar",
          "por qué el disco parece guiñar?",
        ],
        h: "Punto 5: El cierre de tu exposición",
        a: [
          "Termina diciendo: «Creo que pasó porque…».",
          "El ojo guarda cada imagen por un instante.",
          "El cerebro las une en una sola.",
          "Y al final di: «Gracias por escucharme».",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué se cuenta primero en la exposición?", o: ["El propósito", "El cierre", "Las gracias", "El precio"] },
        { q: "¿Qué materiales usaste en el disco?", o: ["Cartulina, lápiz, cinta y tijeras", "Arena y agua", "Pintura y pelotas", "Hilo y piedras"] },
        { q: "¿Qué muestras mientras hablas?", o: ["Tu disco o un dibujo", "Un video del cielo", "Una piedra", "Nada"] },
        { q: "¿Cuánto tiempo ensayas en voz alta?", o: ["Dos minutos", "Un segundo", "Una hora", "Una semana"] },
        { q: "Si no sabes una respuesta, ¿qué haces?", o: ["Dices que lo probarás otra vez", "La inventas", "Cambias de tema", "Te vas"] },
        { q: "¿De dónde sacas tus respuestas?", o: ["De tu bitácora", "De un sueño", "De un cuento", "De adivinar"] },
        { q: "¿Cómo terminas la explicación?", o: ["Con «Creo que pasó porque…»", "Con «No sé nada»", "Con un grito", "Con «Me voy»"] },
        { q: "¿Quién une las imágenes en una sola?", o: ["El cerebro", "La cinta", "La mano", "El papel"] },
      ],
      write: [
        "Escribe tu exposición en cuatro líneas, en orden.",
        "Escribe una pregunta posible y cómo la responderías.",
      ],
      schematic: [
        "Dibuja un esquema del orden: propósito a explicación.",
        "Dibuja tu disco y la tabla que mostrarías.",
      ],
    },
    image: [
      "Dibuja a un niño mostrando su disco a su familia.",
      "Dibuja la bitácora abierta sobre la mesa.",
      "Rotula: propósito, materiales, observación y explicación.",
      "Añade un globo con la frase «Creo que pasó porque…».",
    ],
    summary: "Al exponer cuentas el propósito, los materiales, lo que viste y por qué pasó.",
  },
];
