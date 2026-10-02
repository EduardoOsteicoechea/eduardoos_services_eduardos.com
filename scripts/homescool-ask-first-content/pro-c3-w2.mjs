/**
 * Proyecto · ciclo 3 · semana 2 · nivel 6 — experimento «gota-lupa» (refracción).
 * Ask First + metáfora de Venezuela: Cascada de La Llovizna (Puerto Ordaz, río Caroní).
 * Datos seguros usados: cascada rodeada de neblina fina que parece llovizna; gotas, lupa, neblina.
 * d1 gotas y lupa · d2 neblina y luz · d3 muchas gotas (repetir) · d4 contar el viaje · d5 exposición.
 */
export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "pro-c3-w2-d1",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "La semana pasada contaste tu experimento",
          "del disco «Guiñando» con orden.",
          "Hoy haces uno nuevo, con una gota",
          "de agua, como las de La Llovizna.",
        ],
      },
      {
        q: [
          "Imagina la Cascada de La Llovizna, en",
          "Puerto Ordaz. ¿Y si una gota fuera lupa?",
        ],
        h: "Punto 2: La pregunta del experimento",
        a: [
          "Nuestra pregunta es: ¿una gota redonda",
          "de agua agranda las letras?",
          "Una lupa hace ver grande lo pequeño.",
          "Esta semana lo vamos a comprobar.",
        ],
      },
      {
        q: [
          "La Llovizna tiene neblina de gotitas.",
          "Mira una gota en la ventana: ¿cómo es?",
        ],
        h: "Punto 3: La gota como lente",
        a: [
          "Una gota redonda es abultada",
          "en el centro, curva hacia afuera.",
          "Eso se llama lente convexa. Las lupas",
          "tienen una, y por eso agrandan.",
        ],
      },
      {
        q: [
          "Imagina la luz cruzando La Llovizna.",
          "¿Qué le pasa al entrar a una gota?",
        ],
        h: "Punto 4: La refracción",
        a: [
          "La luz cambia de dirección al pasar",
          "del aire al agua: eso es refracción.",
          "Las letras parecen más grandes,",
          "pero no crecen de verdad.",
        ],
      },
      {
        q: [
          "Para hacer tu gota-lupa en casa, ¿qué",
          "llevarías en la mochila?",
        ],
        h: "Punto 5: Los materiales",
        a: [
          "Alambre fino y un lápiz para el aro,",
          "un tazón con agua limpia y letras",
          "pequeñas impresas. Si el alambre",
          "tiene punta filosa, pide ayuda.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿puedes decir",
          "el resultado antes de probar?",
        ],
        h: "Punto 6: Los pasos y lo que ves",
        a: [
          "No. El resultado es lo que ves tú.",
          "Paso 1: haz un aro con el alambre.",
          "Paso 2: mójalo en agua y forma la gota.",
          "Paso 3: compara la letra sin y con gota.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Dónde queda la Cascada de La Llovizna?", o: ["En Puerto Ordaz", "En Mérida", "En Coro", "En Maracaibo"] },
        { q: "¿Qué quieres saber con el experimento?", o: ["Si una gota agranda las letras", "Si el agua es fría", "Si el alambre pesa", "Si el libro es viejo"] },
        { q: "¿Cómo es una gota redonda?", o: ["Abultada en el centro", "Plana y aplastada", "Larga y delgada", "Cuadrada"] },
        { q: "¿Cómo se llama una lente curva así?", o: ["Lente convexa", "Lente plana", "Lente rota", "Lente seca"] },
        { q: "¿Qué es la refracción?", o: ["Cambio de dirección de la luz", "El brillo del agua", "La sombra de la letra", "El peso de la gota"] },
        { q: "¿Crecen de verdad las letras?", o: ["No, solo lo parecen", "Sí, crecen mucho", "Solo con agua fría", "Solo las más grandes"] },
        { q: "¿Qué necesitas para hacer el aro?", o: ["Alambre fino y un lápiz", "Cartulina y tijeras", "Pintura y pincel", "Cuerda y clavos"] },
        { q: "¿Qué haces si el alambre es filoso?", o: ["Pides ayuda a un adulto", "Sigues sin cuidado", "Lo lanzas lejos", "Lo mojas más"] },
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
      "Dibuja un aro de alambre con una gota.",
      "Al fondo, la neblina de La Llovizna.",
      "Rotula: aro, gota, agua y letras.",
      "Dibuja la letra grande vista en la gota.",
    ],
    summary: "Una gota redonda es como una lupa: la luz cambia de dirección y las letras parecen más grandes.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "pro-c3-w2-d2",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer viste que una gota redonda es",
          "como una lupa: la luz cambia de",
          "dirección al entrar al agua.",
          "Hoy volvemos a La Llovizna a probar.",
        ],
      },
      {
        q: [
          "Vas a probar otra vez, como quien visita",
          "La Llovizna. ¿Qué llevas en la mochila?",
        ],
        h: "Punto 2: Revisar los materiales",
        a: [
          "Revisa que tengas alambre y un tazón",
          "con agua limpia.",
          "Ten a mano letras pequeñas impresas.",
          "Relee tus tres pasos antes de empezar.",
        ],
      },
      {
        q: [
          "Para ver la neblina fina hace falta luz.",
          "¿Dónde pondrías tu experimento?",
        ],
        h: "Punto 3: La luz estable",
        a: [
          "Cerca de una ventana, donde la luz",
          "no cambie mucho.",
          "Evita que el sol te dé en los ojos.",
          "Con buena luz, las letras se ven claras.",
        ],
      },
      {
        q: [
          "En La Llovizna anotarías lo que ves.",
          "Con la A y la O, ¿cómo lo anotas?",
        ],
        h: "Punto 4: Anotar en una tabla",
        a: [
          "Haz una tabla en tu bitácora, que es",
          "el cuaderno del experimento.",
          "Una columna dice «Letra» y otra",
          "«Qué vi». Anota si se veía borrosa.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: si la gota queda",
          "aplastada, ¿el resultado vale igual?",
        ],
        h: "Punto 5: La forma de la gota",
        a: [
          "No vale igual: la gota debe quedar",
          "redonda y abultada.",
          "Anota en la tabla si quedó redonda",
          "o aplastada, y prueba otra vez.",
        ],
      },
      {
        q: [
          "Ya conoces La Llovizna y la gota-lupa.",
          "¿Empezamos otro experimento hoy?",
        ],
        h: "Punto 6: Terminar lo que empezamos",
        a: [
          "Primero terminamos este experimento",
          "con datos claros.",
          "Esta semana seguimos solo con la gota.",
          "Anota qué hiciste, qué viste, qué falta.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Dónde pones el experimento?", o: ["Cerca de una ventana", "En un cuarto sin luz", "Bajo el sol en los ojos", "Dentro de un armario"] },
        { q: "¿Qué debes evitar con el sol?", o: ["Que te dé en los ojos", "Que entre por la ventana", "Que caliente la mesa", "Que se vea afuera"] },
        { q: "¿Qué letras pruebas hoy?", o: ["La A y la O", "La X y la Z", "La B y la T", "Solo la M"] },
        { q: "¿Qué columnas tiene la tabla?", o: ["Letra y Qué vi", "Fecha y Peso", "Color y Precio", "Hora y Lugar"] },
        { q: "¿Qué es la bitácora?", o: ["El cuaderno del experimento", "Un tipo de lupa", "Una letra grande", "Un vaso de agua"] },
        { q: "¿Cómo debe quedar la gota?", o: ["Redonda y abultada", "Aplastada", "Cuadrada", "Muy delgada"] },
        { q: "Si la gota queda aplastada, ¿qué haces?", o: ["Pruebas otra vez", "Dejas de anotar", "Cambias de tema", "Rompes el aro"] },
        { q: "¿Con qué experimento seguimos?", o: ["Con la gota-lupa", "Con un disco", "Con uno nuevo", "Con ninguno"] },
      ],
      write: [
        "Escribe tres líneas: qué hiciste, qué viste y qué falta.",
        "Explica por qué la gota debe quedar redonda.",
      ],
      schematic: [
        "Dibuja una tabla con las columnas Letra y Qué vi.",
        "Dibuja una gota redonda y otra aplastada.",
      ],
    },
    image: [
      "Dibuja una ventana con luz sobre la mesa.",
      "Pon el tazón, el aro y la gota.",
      "Dibuja la letra A vista por la gota.",
      "Rotula: ventana, luz, tazón, aro y gota.",
    ],
    summary: "Con buena luz y una gota redonda, anotas en una tabla qué viste con la A y la O.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "pro-c3-w2-d3",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer buscaste luz estable y anotaste",
          "en una tabla la A y la O.",
          "En La Llovizna hay muchísimas gotas.",
          "Hoy tú harás más de una.",
        ],
      },
      {
        q: [
          "Si lo ves una sola vez, ¿estás seguro?",
          "¿Qué harías para comprobarlo?",
        ],
        h: "Punto 2: Repetir para comprobar",
        a: [
          "Lo repites otra vez, con cuidado.",
          "Una sola gota no hace La Llovizna;",
          "una sola prueba tampoco convence.",
          "Repetir es parte de la ciencia.",
        ],
      },
      {
        q: [
          "Compararías dos fotos de La Llovizna",
          "desde el mismo sitio. ¿Y tus intentos?",
        ],
        h: "Punto 3: Comparar con cuidado",
        a: [
          "Mira las mismas letras, con gota",
          "y sin gota.",
          "Ponlas a la misma distancia del ojo.",
          "Así la diferencia viene de la gota.",
        ],
      },
      {
        q: [
          "Imagina dos gotas de La Llovizna.",
          "¿Cómo sabes cuál agranda mejor?",
        ],
        h: "Punto 4: Dos intentos seguidos",
        a: [
          "Haz dos gotas tuyas, una tras otra.",
          "Marca cuál dejó ver mejor las letras.",
          "Anotar lo que observas es recopilar",
          "datos. Hazlo en tu tabla.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: si la imagen",
          "se movió, ¿crecieron las letras?",
        ],
        h: "Punto 5: ¿Creció o solo se movió?",
        a: [
          "No siempre: puede moverse sin crecer.",
          "Mira si cambió el tamaño aparente,",
          "o sea, qué tan grande se ve algo.",
          "Anota si creció o solo se movió.",
        ],
      },
      {
        q: [
          "Si la gota sale mal, ¿cambias una cosa",
          "o cambias todo a la vez?",
        ],
        h: "Punto 6: Ajustar una sola cosa",
        a: [
          "Ajusta solo la forma de la gota.",
          "Luego mira otra vez las mismas letras.",
          "Anota qué cambió con ese ajuste.",
          "Así sabes qué ajuste sirvió.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Para qué repites el experimento?", o: ["Para comprobar lo que viste", "Para gastar el agua", "Para cambiar de tema", "Para borrar la tabla"] },
        { q: "¿Qué miras con gota y sin gota?", o: ["Las mismas letras", "Letras distintas", "Solo colores", "Solo la mesa"] },
        { q: "¿A qué distancia las miras?", o: ["Siempre a la misma", "Lejos y luego pegada", "Con los ojos cerrados", "Desde otro cuarto"] },
        { q: "¿Cuántos intentos haces seguidos?", o: ["Dos", "Uno", "Ocho", "Ninguno"] },
        { q: "¿Qué es recopilar datos?", o: ["Anotar lo que observas", "Tirar la tabla", "Adivinar", "Pintar la gota"] },
        { q: "¿Qué es el tamaño aparente?", o: ["Qué tan grande se ve algo", "El peso del papel", "El color del agua", "La hora del día"] },
        { q: "Si la imagen solo se movió, ¿qué pasó?", o: ["Puede no haber crecido", "Creció seguro", "Se rompió el agua", "Cambió el alambre"] },
        { q: "Si la gota sale mal, ¿qué ajustas?", o: ["Solo la forma de la gota", "Todo a la vez", "El libro entero", "La ventana"] },
      ],
      write: [
        "Escribe qué intento se vio mejor y por qué.",
        "Explica por qué repetir ayuda a confiar en lo que viste.",
      ],
      schematic: [
        "Dibuja una tabla con dos intentos.",
        "Dibuja la misma letra sin gota y con gota.",
      ],
    },
    image: [
      "Dibuja dos intentos: gota 1 y gota 2.",
      "Dibuja cómo se ve la letra en cada una.",
      "Marca con una estrella la mejor gota.",
      "Rotula: gota 1, gota 2 y tamaño aparente.",
    ],
    summary: "Una sola gota no basta: repites con cuidado, comparas y anotas datos para confiar en lo que viste.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "pro-c3-w2-d4",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer repetiste y anotaste dos intentos",
          "en tu tabla.",
          "Comparaste las mismas letras, con gota",
          "y sin gota. Hoy cuentas lo que viste.",
        ],
      },
      {
        q: [
          "Cuando vuelves de La Llovizna, cuentas",
          "lo que viste. ¿Qué dice una conclusión?",
        ],
        h: "Punto 2: Qué es una conclusión",
        a: [
          "Una conclusión cuenta lo que observaste.",
          "También explica por qué pasó,",
          "con palabras sencillas.",
          "Tu bitácora te ayuda a escribirla.",
        ],
      },
      {
        q: [
          "Tu tabla es un álbum de La Llovizna.",
          "¿Qué intento cuenta mejor lo que viste?",
        ],
        h: "Punto 3: Elegir el mejor intento",
        a: [
          "Elige el intento con la gota más redonda",
          "y la letra que se vio mejor.",
          "Con ese intento cuentas lo que viste.",
        ],
      },
      {
        q: [
          "Tu amigo conoce La Llovizna y pregunta:",
          "«¿Por qué tu gota agranda la letra?»",
        ],
        h: "Punto 4: La explicación de la gota",
        a: [
          "La gota redonda es una lente convexa:",
          "abultada en el centro.",
          "La luz cambia de dirección al pasar",
          "del aire al agua. Eso es refracción.",
        ],
      },
      {
        q: [
          "Cuentas tu viaje a La Llovizna. ¿Basta",
          "con decir «funcionó» de tu experimento?",
        ],
        h: "Punto 5: Las dos frases",
        a: [
          "No. Falta contar qué viste y por qué.",
          "Primera frase: «Vi que…».",
          "Segunda frase: «Creo que pasó porque…».",
          "Termínalas con datos de tu tabla.",
        ],
      },
      {
        q: [
          "Ahora tú: ¿cómo cerrarías tu conclusión",
          "con la gota redonda y la refracción?",
        ],
        h: "Punto 6: Escribir tu conclusión",
        a: [
          "«Vi que la letra se veía más grande».",
          "«Creo que pasó por la refracción».",
          "«La gota redonda es una lente convexa».",
          "Cámbialas si viste algo distinto.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué cuenta una conclusión?", o: ["Lo que viste y por qué", "Solo el título", "Solo los materiales", "Solo la fecha"] },
        { q: "¿Qué te ayuda a escribirla?", o: ["Tu bitácora", "Un cuento", "Una canción", "La suerte"] },
        { q: "¿Qué intento eliges para contar?", o: ["El de la gota más redonda", "El primero que hiciste", "El más borroso", "El que no anotaste"] },
        { q: "¿A qué se parece la gota redonda?", o: ["A una lente convexa", "A una pared plana", "A una regla", "A un espejo roto"] },
        { q: "¿Cómo se llama ese cambio de la luz?", o: ["Refracción", "Bitácora", "Tabla", "Conclusión"] },
        { q: "¿Cómo empieza la primera frase?", o: ["«Vi que…»", "«Creo que pasó porque…»", "«Nadie sabe»", "«Gracias»"] },
        { q: "¿Basta escribir «funcionó»?", o: ["No, falta contar qué viste", "Sí, es suficiente", "Sí, si es corto", "Solo los lunes"] },
        { q: "¿Por qué parecen grandes las letras?", o: ["Cambia la dirección de la luz", "Crecen en el papel", "El agua las infla", "El alambre las estira"] },
      ],
      write: [
        "Escribe tus dos frases: «Vi que…» y «Creo que pasó…».",
        "Explica con tus palabras qué es la refracción.",
      ],
      schematic: [
        "Dibuja la luz cambiando de dirección en la gota.",
        "Dibuja una lente convexa y una gota.",
      ],
    },
    image: [
      "Dibuja una gota redonda sobre una letra.",
      "Dibuja flechas de luz que entran a la gota.",
      "Haz que las flechas cambien de dirección.",
      "Rotula: aire, agua, luz y refracción.",
    ],
    summary: "Una buena conclusión cuenta qué viste y explica con la refracción por qué pasó.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "pro-c3-w2-d5",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer escribiste tu conclusión con dos",
          "frases: «Vi que…» y «Creo que pasó…».",
          "Hoy se la cuentas a alguien, como si",
          "le contaras La Llovizna.",
        ],
      },
      {
        q: [
          "Sin mirar: ¿qué preguntaste, hiciste",
          "y descubriste en tu viaje a La Llovizna?",
        ],
        h: "Punto 2: Recordar la semana",
        a: [
          "Preguntaste si una gota redonda agranda",
          "las letras. Armaste un aro y una gota.",
          "Repetiste, anotaste y explicaste",
          "con la refracción.",
        ],
      },
      {
        q: [
          "Si cuentas La Llovizna todo revuelto,",
          "¿se entiende? ¿Qué orden usarías?",
        ],
        h: "Punto 3: Cómo contarlo con orden",
        a: [
          "Primero, el propósito: tu pregunta.",
          "Luego, los materiales usados.",
          "Después, lo que observaste en la tabla.",
          "Al final, la explicación con refracción.",
        ],
      },
      {
        q: [
          "Quien cuenta La Llovizna muestra fotos.",
          "¿Qué muestras tú de tu experimento?",
        ],
        h: "Punto 4: Mostrar tus datos",
        a: [
          "Muestra tu bitácora o tu dibujo.",
          "Ensaya dos minutos en voz alta,",
          "sin leer solo el título.",
          "Habla despacio y mira a quien escucha.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿y si preguntan",
          "algo que no anotaste?",
        ],
        h: "Punto 5: Responder con tus datos",
        a: [
          "Responde con lo que anotaste.",
          "No inventes una respuesta.",
          "Si no sabes, di: «Lo probaré otra vez».",
          "Escucha cada pregunta con respeto.",
        ],
      },
      {
        q: [
          "Ahora tú: ¿con qué frase cierras tu",
          "exposición al despedirte de La Llovizna?",
        ],
        h: "Punto 6: El cierre de tu exposición",
        a: [
          "Cierra con: «Creo que pasó porque…».",
          "Explica la refracción: la luz cambia",
          "de dirección al entrar a la gota.",
          "Da las gracias a quien te escuchó.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué cuentas primero en tu exposición?", o: ["El propósito", "Las gracias", "La conclusión", "El precio"] },
        { q: "¿Qué va después del propósito?", o: ["Los materiales usados", "La despedida", "El final", "El precio"] },
        { q: "¿Qué muestras mientras hablas?", o: ["Tu bitácora o tu dibujo", "Una película", "Un juguete nuevo", "Nada"] },
        { q: "¿Cuánto ensayas en voz alta?", o: ["Dos minutos", "Un segundo", "Una hora", "Una semana"] },
        { q: "Si no sabes la respuesta, ¿qué dices?", o: ["«Lo probaré otra vez»", "Una respuesta inventada", "«No me preguntes»", "Nada"] },
        { q: "¿Qué explicas al final?", o: ["La refracción de la luz", "El color del agua", "El peso del alambre", "El tamaño del tazón"] },
        { q: "¿Con qué frase cierras?", o: ["«Creo que pasó porque…»", "«Vi que…»", "«Hasta luego»", "«No lo sé»"] },
        { q: "¿Qué haces al terminar?", o: ["Das las gracias", "Te vas rápido", "Borras la tabla", "Cambias de tema"] },
      ],
      write: [
        "Escribe tu exposición en cuatro líneas, en orden.",
        "Escribe una pregunta posible y cómo la responderías.",
      ],
      schematic: [
        "Dibuja el orden: propósito a explicación.",
        "Dibuja la luz entrando en la gota.",
      ],
    },
    image: [
      "Dibuja a un niño mostrando su bitácora.",
      "Dibuja el aro con la gota en la mesa.",
      "Rotula: propósito, materiales,",
      "observación y explicación.",
    ],
    summary: "Al exponer cuentas el propósito, los materiales, lo que viste y por qué pasó.",
  },
];
