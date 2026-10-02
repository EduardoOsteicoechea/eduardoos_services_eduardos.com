/**
 * Proyecto · ciclo 3 · semana 2 · nivel 6 — experimento «gota-lupa» (refracción),
 * narrativa inductiva "pregunta primero".
 *
 * unit = { q: [líneas de pregunta] (omitir en d1 punto 1),
 *          h: "Punto N: título", a: [líneas de respuesta], w?: líneas de espacio, c?: líneas para copiar }
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "pro-c3-w2-d1",
    opening: "¿Puede una gota de agua hacer que las letras se vean más grandes?",
    repaso: null,
    units: [
      {
        h: "Punto 1: La pregunta del experimento",
        a: [
          "Quizá sí: esta semana lo vamos a comprobar.",
          "Una gota redonda de agua puede actuar como una lupa.",
          "Una lupa hace que lo pequeño se vea más grande.",
          "Nuestro experimento busca saber si eso pasa de verdad.",
        ],
      },
      {
        q: [
          "Mira una gota de agua en una ventana. ¿Es plana o",
          "abultada en el centro?",
        ],
        h: "Punto 2: La gota como lente",
        a: [
          "Una gota bien formada es abultada en el centro.",
          "Una lente convexa es curva hacia afuera, así.",
          "Por eso una gota redonda se parece a una lente convexa.",
          "Las lupas se hacen con lentes convexas.",
        ],
      },
      {
        q: [
          "Sigamos. La luz viaja en línea recta. ¿Qué crees que",
          "le pasa cuando entra del aire al agua?",
        ],
        h: "Punto 3: La refracción",
        a: [
          "Cambia un poco de dirección.",
          "A ese cambio de dirección de la luz se le llama refracción.",
          "Por la refracción, las letras pueden verse más grandes.",
          "Las letras no crecen de verdad: siguen iguales.",
        ],
      },
      {
        q: [
          "Imagina que quieres hacer una gota redonda. ¿Qué",
          "materiales necesitarías?",
        ],
        h: "Punto 4: Los materiales",
        a: [
          "Necesitas alambre fino y un lápiz para guiar el aro.",
          "Necesitas un tazón con agua limpia.",
          "Y letras pequeñas impresas, de un libro o un periódico.",
          "Pide ayuda adulta si el alambre tiene punta filosa.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿puedes inventar el resultado",
          "antes de probar?",
        ],
        h: "Punto 5: Los pasos y lo que observas",
        a: [
          "No. El resultado es lo que ves con tus ojos.",
          "Paso 1: haz un aro con el alambre.",
          "Paso 2: mójalo en el agua para que quede una gota.",
          "Paso 3: acércalo a las letras y observa.",
          "Compara la misma letra sin gota y con gota.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué queremos saber con el experimento?", o: ["Si una gota agranda las letras", "Si el agua es fría", "Si el alambre pesa", "Si el libro es viejo"] },
        { q: "¿Qué forma debe tener la gota?", o: ["Redonda y abultada", "Plana y aplastada", "Larga y delgada", "Cuadrada"] },
        { q: "¿Cómo se llama una lente curva hacia afuera?", o: ["Lente convexa", "Lente plana", "Lente rota", "Lente seca"] },
        { q: "¿Qué es la refracción?", o: ["El cambio de dirección de la luz", "El brillo del agua", "La sombra de la letra", "El peso de la gota"] },
        { q: "¿Crecen de verdad las letras?", o: ["No, siguen iguales", "Sí, crecen de verdad", "Solo si el agua está fría", "Solo las letras grandes"] },
        { q: "¿Qué necesitas para hacer el aro?", o: ["Alambre fino y un lápiz", "Cartulina y tijeras", "Pintura y pincel", "Cuerda y clavos"] },
        { q: "¿Quién te ayuda si el alambre tiene punta filosa?", o: ["Un adulto", "Un amigo pequeño", "Una mascota", "Nadie"] },
        { q: "¿Qué comparas en el experimento?", o: ["La misma letra sin gota y con gota", "Dos colores de lápiz", "Dos tazones vacíos", "El ruido del agua"] },
      ],
      write: [
        "Escribe la pregunta de tu experimento con tus palabras.",
        "Explica qué es una lente convexa.",
      ],
      schematic: [
        "Dibuja una gota redonda sobre una letra pequeña.",
        "Dibuja la luz entrando del aire a la gota de agua.",
      ],
    },
    image: [
      "Dibuja un aro de alambre con una gota redonda.",
      "Dibuja debajo una palabra con letras pequeñas.",
      "Rotula: aro, gota, agua y letras.",
      "Dibuja la letra más grande al mirar por la gota.",
    ],
    summary: "Una gota redonda es como una lente convexa: por la refracción, las letras parecen más grandes.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "pro-c3-w2-d2",
    opening: ayer,
    repaso: [
      "Ayer supiste que una gota redonda se parece a una lupa.",
      "La luz cambia de dirección al pasar del aire al agua.",
      "Conociste los materiales y los pasos numerados.",
    ],
    units: [
      {
        q: [
          "Piensa un momento: ¿qué debes tener a la mano para",
          "un intento nuevo?",
        ],
        h: "Punto 1: Revisar los materiales",
        a: [
          "Revisa que tengas alambre, tazón y agua limpia.",
          "Ten a la mano las letras pequeñas impresas.",
          "Relee tus pasos numerados antes de empezar.",
        ],
      },
      {
        q: [
          "Sigamos. ¿Dónde pondrías el experimento para ver",
          "mejor? ¿Cerca de una ventana o en la oscuridad?",
        ],
        h: "Punto 2: La luz estable",
        a: [
          "Cerca de una ventana, donde haya luz que no cambie.",
          "Evita que el sol te dé directo en los ojos.",
          "Con buena luz, las letras se ven con más claridad.",
        ],
      },
      {
        q: [
          "Imagina que pruebas la letra A y luego la letra O.",
          "¿Cómo te acordarías de lo que viste en cada una?",
        ],
        h: "Punto 3: Anotar en una tabla",
        a: [
          "Haz una tabla en tu bitácora.",
          "Una columna dice «Letra» y otra dice «Qué vi».",
          "Anota si la gota agrandó más la A o la O.",
          "Anota si la imagen se veía borrosa.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: si la gota queda aplastada,",
          "¿el resultado vale igual?",
        ],
        h: "Punto 4: La forma de la gota",
        a: [
          "No es igual: la gota debe quedar redonda y abultada.",
          "Anota en la tabla si quedó redonda o aplastada.",
          "Si quedó aplastada, forma otra gota y prueba otra vez.",
        ],
      },
      {
        q: [
          "Ahora tú: ¿por qué no empezamos otro experimento",
          "distinto hoy?",
        ],
        h: "Punto 5: Terminar lo que empezamos",
        a: [
          "Primero se termina este experimento con datos claros.",
          "Esta semana seguimos solo con la gota-lupa.",
          "Al final escribe: qué hiciste, qué viste y qué falta.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Dónde pones el experimento para ver mejor?", o: ["Cerca de una ventana", "En un cuarto sin luz", "Bajo el sol en los ojos", "Dentro de un armario"] },
        { q: "¿Qué debes evitar con el sol?", o: ["Que te dé directo en los ojos", "Que entre por la ventana", "Que caliente la mesa", "Que se vea afuera"] },
        { q: "¿Qué letras probaste hoy?", o: ["La A y la O", "La X y la Z", "La B y la T", "Solo la M"] },
        { q: "¿Qué columnas tiene tu tabla de hoy?", o: ["Letra y Qué vi", "Fecha y Peso", "Color y Precio", "Hora y Lugar"] },
        { q: "¿Qué debes anotar de la imagen?", o: ["Si se veía borrosa", "Cuánto costó", "De qué color era la mesa", "Quién la vio"] },
        { q: "¿Cómo debe quedar la gota?", o: ["Redonda y abultada", "Aplastada", "Cuadrada", "Muy delgada"] },
        { q: "Si la gota queda aplastada, ¿qué haces?", o: ["Formas otra gota y pruebas", "Dejas de anotar", "Cambias de tema", "Rompes el aro"] },
        { q: "¿Con cuál experimento seguimos esta semana?", o: ["Con la gota-lupa", "Con el disco Guiñando", "Con uno nuevo", "Con ninguno"] },
      ],
      write: [
        "Escribe tres líneas: qué hiciste, qué viste y qué falta.",
        "Explica por qué la gota debe quedar redonda.",
      ],
      schematic: [
        "Dibuja una tabla con las columnas Letra y Qué vi.",
        "Dibuja una gota redonda y otra aplastada, y compáralas.",
      ],
    },
    image: [
      "Dibuja una ventana con luz entrando a tu mesa.",
      "Dibuja sobre la mesa el tazón y el aro con su gota.",
      "Dibuja la letra A vista a través de la gota.",
      "Rotula: ventana, luz, tazón, aro y gota.",
    ],
    summary: "Con buena luz y una gota redonda, anotas en una tabla qué viste con la A y la O.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "pro-c3-w2-d3",
    opening: ayer,
    repaso: [
      "Ayer buscaste una luz estable cerca de la ventana.",
      "Anotaste en una tabla qué viste con la A y con la O.",
      "Revisaste si la gota quedó redonda o aplastada.",
    ],
    units: [
      {
        q: [
          "Si ves algo una sola vez, ¿ya puedes estar seguro?",
          "¿Qué harías para comprobarlo?",
        ],
        h: "Punto 1: Repetir para comprobar",
        a: [
          "Lo repites otra vez, con cuidado.",
          "Repetir es parte de la ciencia.",
          "Así confías en lo que viste o descubres un error.",
        ],
      },
      {
        q: [
          "Sigamos. Para comparar bien, ¿qué cosas deben quedar",
          "iguales en los dos intentos?",
        ],
        h: "Punto 2: Comparar con cuidado",
        a: [
          "Mira las mismas letras con gota y sin gota.",
          "Ponlas a la misma distancia de tu ojo y del papel.",
          "Así sabes que la diferencia viene de la gota.",
          "No cambies muchas cosas a la vez.",
        ],
      },
      {
        q: [
          "Imagina que haces dos gotas seguidas. ¿Cómo sabrías",
          "cuál dejó ver mejor las letras?",
        ],
        h: "Punto 3: Dos intentos seguidos",
        a: [
          "Haz dos intentos, uno después del otro.",
          "Marca cuál gota dejó ver mejor las letras.",
          "Recopilar datos es anotar lo que observas.",
          "Eso lo haces en la tabla de tu bitácora.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: si la imagen se movió, ¿las",
          "letras crecieron?",
        ],
        h: "Punto 4: ¿Creció o solo se movió?",
        a: [
          "No siempre. La imagen puede moverse sin crecer.",
          "Mira bien si cambió el tamaño aparente.",
          "Tamaño aparente es lo grande que algo se ve.",
          "Anota si cambió el tamaño o solo se movió.",
        ],
      },
      {
        q: [
          "Ahora tú: ¿qué ajustarías si la gota sale mal?",
        ],
        h: "Punto 5: Ajustar una sola cosa",
        a: [
          "Ajusta solo la forma de la gota.",
          "Luego vuelve a mirar las mismas letras.",
          "Anota qué cambió con ese ajuste.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Para qué repites el experimento?", o: ["Para comprobar lo que viste", "Para gastar el agua", "Para cambiar de tema", "Para borrar la tabla"] },
        { q: "¿Qué miras con gota y sin gota?", o: ["Las mismas letras", "Letras distintas", "Solo colores", "Solo la mesa"] },
        { q: "¿A qué distancia las miras?", o: ["La misma en los dos intentos", "Lejos en uno y pegada en otro", "Con los ojos cerrados", "Desde otra habitación"] },
        { q: "¿Cuántos intentos haces seguidos hoy?", o: ["Dos", "Uno", "Ocho", "Ninguno"] },
        { q: "¿Qué es recopilar datos?", o: ["Anotar lo que observas", "Tirar la tabla", "Adivinar", "Pintar la gota"] },
        { q: "¿Qué es el tamaño aparente?", o: ["Qué tan grande algo se ve", "El peso del papel", "El color del agua", "La hora del día"] },
        { q: "Si la imagen solo se movió, ¿qué pasó?", o: ["Puede no haber crecido", "Creció seguro", "Se rompió el agua", "Cambió el alambre"] },
        { q: "Si la gota sale mal, ¿qué ajustas?", o: ["Solo la forma de la gota", "Todo a la vez", "El libro entero", "La ventana"] },
      ],
      write: [
        "Escribe qué intento dejó ver mejor las letras y por qué.",
        "Explica por qué repetir ayuda a confiar en lo que viste.",
      ],
      schematic: [
        "Dibuja una tabla con dos intentos, forma y qué viste.",
        "Dibuja la misma letra sin gota y con gota.",
      ],
    },
    image: [
      "Dibuja dos intentos lado a lado: gota 1 y gota 2.",
      "Dibuja la letra como se ve por cada gota.",
      "Marca con una estrella la gota que se vio mejor.",
      "Rotula: gota 1, gota 2 y tamaño aparente.",
    ],
    summary: "Repetir con cuidado te ayuda a confiar en lo que observaste y a anotar datos.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "pro-c3-w2-d4",
    opening: ayer,
    repaso: [
      "Ayer repetiste el experimento con cuidado.",
      "Hiciste dos intentos y los anotaste en tu tabla.",
      "Comparaste las mismas letras con gota y sin gota.",
    ],
    units: [
      {
        q: [
          "Hoy escribes una conclusión. ¿Qué crees que debe",
          "decir una buena conclusión?",
        ],
        h: "Punto 1: Qué es una conclusión",
        a: [
          "Una conclusión dice qué observaste.",
          "También explica la idea principal con palabras sencillas.",
          "Tu bitácora es tu guía para escribirla.",
        ],
      },
      {
        q: [
          "Sigamos. Mira tu tabla. ¿Cuál intento elegirías",
          "para contar lo que viste?",
        ],
        h: "Punto 2: Elegir el mejor intento",
        a: [
          "Elige el intento donde la gota quedó más redonda.",
          "Y donde la letra se vio mejor.",
          "Con ese intento contarás lo que viste.",
        ],
      },
      {
        q: [
          "Imagina que tu amigo pregunta: «¿Por qué la gota",
          "agranda la letra?». ¿Qué le dirías?",
        ],
        h: "Punto 3: La explicación de la gota",
        a: [
          "La gota redonda se parece a una lente convexa.",
          "Está más abultada en el centro.",
          "La luz cambia de dirección al pasar del aire al agua.",
          "Esa es la refracción: por eso las letras se ven más grandes.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿basta con escribir",
          "«funcionó»?",
        ],
        h: "Punto 4: Las dos frases",
        a: [
          "No. Falta contar qué viste y por qué pasó.",
          "Primera frase: «Vi que…».",
          "Segunda frase: «Creo que pasó porque…».",
          "Termínalas con datos de tu tabla.",
        ],
      },
      {
        q: [
          "Ahora tú: ¿cómo completarías esas dos frases con",
          "la gota redonda y la refracción?",
        ],
        h: "Punto 5: Escribir tu conclusión",
        a: [
          "«Vi que la letra se veía más grande con la gota».",
          "«Creo que pasó por la refracción de la luz».",
          "«La gota redonda actúa como una lente convexa».",
          "Cambia las frases si tu resultado fue distinto.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué dice una conclusión?", o: ["Lo que observaste y por qué", "Solo el título", "Solo los materiales", "Solo la fecha"] },
        { q: "¿Qué te guía para escribirla?", o: ["Tu bitácora", "Un cuento", "Una canción", "La suerte"] },
        { q: "¿Qué intento eliges para contar?", o: ["Donde la gota quedó más redonda", "El primero que hiciste", "El más borroso", "El que no anotaste"] },
        { q: "¿A qué se parece una gota redonda?", o: ["A una lente convexa", "A una pared plana", "A una regla", "A un espejo roto"] },
        { q: "¿Cómo se llama el cambio de dirección de la luz?", o: ["Refracción", "Bitácora", "Tabla", "Conclusión"] },
        { q: "¿Con qué empieza la primera frase de la conclusión?", o: ["«Vi que…»", "«Creo que pasó porque…»", "«Nadie sabe»", "«Gracias»"] },
        { q: "¿Basta con escribir «funcionó»?", o: ["No, falta contar qué viste", "Sí, es suficiente", "Sí, si es corto", "Solo los lunes"] },
        { q: "¿Por qué las letras se ven más grandes?", o: ["Cambia la dirección de la luz", "Crecen en el papel", "El agua las infla", "El alambre las estira"] },
      ],
      write: [
        "Escribe tus dos frases: «Vi que…» y «Creo que pasó…».",
        "Explica con tus palabras qué es la refracción.",
      ],
      schematic: [
        "Dibuja la luz entrando a la gota y cambiando de dirección.",
        "Dibuja una lente convexa y una gota redonda al lado.",
      ],
    },
    image: [
      "Dibuja una gota redonda sobre una letra grande.",
      "Dibuja flechas de luz que entran a la gota.",
      "Haz que las flechas cambien de dirección en el agua.",
      "Rotula: aire, agua, luz y refracción.",
    ],
    summary: "Una buena conclusión cuenta qué viste y explica con la refracción por qué pasó.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "pro-c3-w2-d5",
    opening: ayer,
    repaso: [
      "Esta semana investigaste si una gota puede ser lupa.",
      "Repetiste, anotaste datos y escribiste tu conclusión.",
      "Hoy se la cuentas a alguien con orden.",
    ],
    units: [
      {
        q: [
          "Sin mirar nada: ¿qué preguntaste, qué hiciste y qué",
          "descubriste esta semana?",
        ],
        w: 3,
        h: "Punto 1: Recordar la semana",
        a: [
          "Preguntaste si una gota redonda agranda las letras.",
          "Armaste un aro y formaste una gota con agua.",
          "Repetiste, anotaste y explicaste con la refracción.",
        ],
      },
      {
        q: [
          "Si cuentas todo revuelto, ¿se entiende? ¿Qué orden",
          "usarías?",
        ],
        h: "Punto 2: Cómo contarlo con orden",
        a: [
          "Primero el propósito: la pregunta de la gota redonda.",
          "Luego los materiales: alambre, agua y letras pequeñas.",
          "Después la observación: lo que anotaste en la tabla.",
          "Al final la explicación: refracción y lente convexa.",
        ],
      },
      {
        q: [
          "Imagina que ya hablas frente a tu familia. ¿Qué",
          "mostrarías para que te crean?",
        ],
        h: "Punto 3: Mostrar tus datos",
        a: [
          "Muestra tu bitácora o un dibujo de la gota.",
          "Ensaya dos minutos en voz alta, sin leer solo el título.",
          "Habla despacio y mira a quien te escucha.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: si alguien pregunta algo que",
          "no anotaste, ¿qué respondes?",
        ],
        h: "Punto 4: Responder con tus datos",
        a: [
          "Responde con lo que anotaste.",
          "No inventes una respuesta.",
          "Si no lo sabes, di: «Lo voy a probar otra vez».",
          "Escucha cada pregunta con respeto.",
        ],
      },
      {
        q: [
          "Ahora tú: ¿con qué frase terminarías tu explicación?",
        ],
        h: "Punto 5: El cierre de tu exposición",
        a: [
          "Termina con: «Creo que pasó porque…».",
          "Explica la refracción: la luz cambia de dirección.",
          "Y la gota redonda actúa como una lente convexa.",
          "Da las gracias a quien te escuchó.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué se cuenta primero en la exposición?", o: ["El propósito", "Las gracias", "La conclusión", "El precio"] },
        { q: "¿Qué materiales usaste?", o: ["Alambre, agua y letras pequeñas", "Pelota y cuerda", "Pintura y arena", "Libros y mesa"] },
        { q: "¿Qué muestras mientras hablas?", o: ["Tu bitácora o un dibujo", "Una película", "Un juguete nuevo", "Nada"] },
        { q: "¿Cuánto ensayas en voz alta?", o: ["Dos minutos", "Un segundo", "Una hora", "Una semana"] },
        { q: "Si no sabes la respuesta, ¿qué haces?", o: ["Dices que lo probarás otra vez", "La inventas", "Cambias de tema", "Te vas"] },
        { q: "¿Qué explica por qué las letras se ven más grandes?", o: ["La refracción de la luz", "El color del agua", "El peso del alambre", "El tamaño del tazón"] },
        { q: "¿Con qué frase cierras la explicación?", o: ["«Creo que pasó porque…»", "«Vi que…»", "«Hasta luego»", "«No lo sé»"] },
        { q: "¿A qué se parece la gota redonda?", o: ["A una lente convexa", "A una pared", "A una regla", "A un cubo"] },
      ],
      write: [
        "Escribe tu exposición en cuatro líneas, en orden.",
        "Escribe una pregunta posible y cómo la responderías.",
      ],
      schematic: [
        "Dibuja un esquema del orden: propósito a explicación.",
        "Dibuja la luz entrando en la gota con flechas.",
      ],
    },
    image: [
      "Dibuja a un niño mostrando su bitácora a su familia.",
      "Dibuja el aro con la gota sobre la mesa.",
      "Rotula: propósito, materiales, observación y explicación.",
      "Añade un globo con la frase «Creo que pasó porque…».",
    ],
    summary: "Al exponer cuentas el propósito, los materiales, lo que viste y por qué pasó.",
  },
];
