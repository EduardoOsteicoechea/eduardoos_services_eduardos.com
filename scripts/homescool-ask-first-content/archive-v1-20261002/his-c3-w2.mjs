/**
 * Historia · ciclo 3 · semana 2 · nivel 6 — "Primeros viajes españoles a Venezuela".
 * Narrativa inductiva, todo "pregunta primero" (ver esp-c3-w1.mjs).
 *
 * Nota de hechos: se usa «agosto de 1498» (sin día exacto) para no afirmar
 * una fecha dudosa. 1492 = primer viaje (islas del Caribe); 1498 = tercer viaje.
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "his-c3-w2-d1",
    opening: "¿Cuándo crees que llegó Colón a las costas de Venezuela?",
    repaso: null,
    units: [
      {
        h: "Punto 1: Una línea del tiempo",
        a: [
          "Una cronología es una línea de fechas en orden.",
          "Sirve para ver qué pasó antes y qué pasó después.",
          "Hoy ordenamos dos fechas: 1498 y 1499.",
          "Fueron los primeros viajes españoles a estas costas.",
        ],
      },
      {
        q: [
          "En 1492 Colón llegó al Caribe. ¿Crees que ya llegó",
          "a Venezuela en ese primer viaje?",
        ],
        h: "Punto 2: Colón en 1498",
        a: [
          "No: en 1492 llegó a islas del Caribe.",
          "Llegó a Venezuela en su tercer viaje, en 1498.",
          "Tocó tierra firme en Paria, hacia el oriente.",
          "Tierra firme es un continente, no una isla.",
        ],
      },
      {
        q: [
          "Un año después, otros marinos recorrieron la costa.",
          "¿Cuántos crees que eran y qué hacía cada uno?",
        ],
        h: "Punto 3: La expedición de 1499",
        a: [
          "En 1499 viajaron Ojeda, Vespucio y Juan de la Cosa.",
          "Una expedición es un viaje con un objetivo.",
          "Su objetivo era conocer la costa y contarlo.",
          "Ojeda guiaba, Vespucio escribía y Juan de la Cosa dibujaba.",
        ],
      },
      {
        q: [
          "Paria está al oriente. Si sigues la costa hacia el otro",
          "lado, ¿adónde llegas?",
        ],
        h: "Punto 4: De Paria a La Guajira",
        a: [
          "Llegas a La Guajira, en el noroccidente.",
          "Entre Paria y La Guajira se extiende el litoral.",
          "El litoral es la franja de tierra junto al mar.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿la costa estaba vacía cuando",
          "llegaron los barcos?",
        ],
        h: "Punto 5: La costa tenía habitantes",
        a: [
          "No estaba vacía: ya vivían pueblos originarios.",
          "Los barcos llegaron a un lugar con historia.",
          "Viajes: Colón 1498 llega a Paria; 1499 otras expediciones;",
          "ruta de Paria a La Guajira.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es una cronología?", o: ["Una línea de fechas en orden", "Un mapa de la costa", "Un barco grande", "Un relato de viaje"] },
        { q: "¿En qué viaje llegó Colón a Venezuela?", o: ["En el tercero", "En el primero", "En el segundo", "En el cuarto"] },
        { q: "¿En qué año llegó Colón a Paria?", o: ["1498", "1492", "1499", "1500"] },
        { q: "¿Qué es la tierra firme?", o: ["Un continente, no una isla", "Una isla pequeña", "Un barco", "Un puerto"] },
        { q: "¿Quiénes viajaron en 1499?", o: ["Ojeda, Vespucio y Juan de la Cosa", "Solo Colón", "Colón y Vespucio", "Solo Ojeda"] },
        { q: "¿Qué es una expedición?", o: ["Un viaje con un objetivo", "Un mapa viejo", "Una isla", "Un relato"] },
        { q: "¿Dónde queda Paria?", o: ["Hacia el oriente", "En el noroccidente", "Al sur", "En el centro"] },
        { q: "¿Qué es el litoral?", o: ["La franja de tierra junto al mar", "Una montaña", "Un tipo de barco", "Una fecha"] },
      ],
      write: [
        "Escribe las dos fechas de hoy y qué pasó en cada una.",
        "Explica qué es una cronología con tus palabras.",
      ],
      schematic: [
        "Dibuja una línea del tiempo con 1492, 1498 y 1499.",
        "Dibuja la costa con Paria al oriente y La Guajira al otro lado.",
      ],
    },
    image: [
      "Dibuja una línea del tiempo con tres marcas.",
      "Escribe 1492, 1498 y 1499 en las marcas.",
      "Debajo de cada año dibuja un barco o un mapa pequeño.",
      "Rotula Paria y La Guajira.",
    ],
    summary: "En 1498 Colón llegó a Paria y en 1499 otros exploradores recorrieron la costa hasta La Guajira.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "his-c3-w2-d2",
    opening: ayer,
    repaso: [
      "Ayer ordenaste dos fechas en una cronología.",
      "En 1498 llegó Colón; en 1499 siguió la expedición.",
      "La ruta fue desde Paria hasta La Guajira.",
    ],
    units: [
      {
        q: [
          "Imagina que escribes un titular de periódico sobre 1498.",
          "¿Qué datos pondrías para que se entienda?",
        ],
        h: "Punto 1: Un titular con datos",
        a: [
          "Un buen titular dice quién, cuándo y dónde.",
          "Quién: Cristóbal Colón. Cuándo: agosto de 1498.",
          "Dónde: Paria, en la costa de Venezuela.",
          "Así la fecha deja de ser un número suelto.",
        ],
      },
      {
        q: [
          "¿Qué diferencia hay entre una isla y la tierra firme?",
        ],
        h: "Punto 2: Isla y tierra firme",
        a: [
          "Una isla es tierra rodeada de agua por todos lados.",
          "La tierra firme es una tierra grande y continua.",
          "En 1498 Colón llegó a tierra firme, en Paria.",
        ],
      },
      {
        q: [
          "¿Y quién estaba ya en esa costa cuando llegó Colón?",
          "¿Qué responderías?",
        ],
        h: "Punto 3: Quién ya vivía allí",
        a: [
          "Ya vivían pueblos originarios, como los que estudiaste.",
          "Pescaban, sembraban y tenían sus propias aldeas.",
          "Colón no encontró una costa vacía.",
          "Contar la historia completa incluye a esos pueblos.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿Colón llegó a Venezuela en 1492",
          "o en 1498?",
        ],
        h: "Punto 4: No confundir las fechas",
        a: [
          "Fue en 1498, en su tercer viaje.",
          "1492 fue el primer viaje, a islas del Caribe.",
          "Para no confundirte, piensa: tercer viaje, 1498.",
        ],
      },
      {
        q: [
          "Mañana sigue la historia. ¿Quiénes crees que llegaron",
          "un año después, en 1499?",
        ],
        h: "Punto 5: Lo que viene",
        a: [
          "En 1499 llegaron Ojeda, Vespucio y Juan de la Cosa.",
          "Hicieron una expedición por la misma costa.",
          "Repítelo: Viajes: Colón 1498 llega a Paria; 1499 otras",
          "expediciones; ruta de Paria a La Guajira.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué datos tiene un buen titular?", o: ["Quién, cuándo y dónde", "Solo un número", "Solo un dibujo", "Solo un lugar"] },
        { q: "¿Quién llegó a Paria en 1498?", o: ["Cristóbal Colón", "Alonso de Ojeda", "Juan de la Cosa", "Américo Vespucio"] },
        { q: "¿Qué es una isla?", o: ["Tierra rodeada de agua", "Tierra grande y continua", "Una costa seca", "Una montaña"] },
        { q: "¿Qué tipo de tierra tocó Colón en Paria?", o: ["Tierra firme", "Una isla", "Un río", "Un lago"] },
        { q: "¿Quiénes vivían ya en la costa?", o: ["Pueblos originarios", "Nadie", "Solo marineros", "Solo exploradores"] },
        { q: "¿Cuál fue el viaje de 1492?", o: ["El primero, a islas del Caribe", "El tercero, a Paria", "El de Ojeda", "El de Juan de la Cosa"] },
        { q: "¿Qué año se asocia al tercer viaje de Colón?", o: ["1498", "1492", "1499", "1500"] },
        { q: "¿Qué pasó en 1499?", o: ["Una expedición por la misma costa", "Colón llegó a Paria", "Nadie navegó", "Se acabó el trueque"] },
      ],
      write: [
        "Escribe un titular sobre 1498 con quién, cuándo y dónde.",
        "Explica por qué la costa no estaba vacía en 1498.",
      ],
      schematic: [
        "Dibuja una isla y la tierra firme y rotula la diferencia.",
        "Dibuja un esquema: 1492, 1498 y 1499 con un dato en cada uno.",
      ],
    },
    image: [
      "Dibuja un periódico con tu titular sobre 1498.",
      "Pon quién, cuándo y dónde en el titular.",
      "Dibuja debajo un barco llegando a Paria.",
      "Añade a las personas que ya vivían en la costa.",
    ],
    summary: "En agosto de 1498 Colón llegó a tierra firme, en Paria, donde ya vivían pueblos originarios.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "his-c3-w2-d3",
    opening: ayer,
    repaso: [
      "Ayer repasaste la llegada de Colón en agosto de 1498.",
      "Llegó a tierra firme, en Paria.",
      "Y recordaste que la costa ya tenía pueblos originarios.",
    ],
    units: [
      {
        q: [
          "Piensa en un viaje largo en barco. ¿Qué personas harían",
          "falta y qué haría cada una?",
        ],
        h: "Punto 1: Un equipo de exploradores",
        a: [
          "En 1499 viajó un equipo de tres exploradores.",
          "Fueron Alonso de Ojeda, Américo Vespucio",
          "y Juan de la Cosa.",
          "Cada uno tenía una tarea distinta.",
        ],
      },
      {
        q: [
          "¿Quién crees que decidía el rumbo y las paradas?",
        ],
        h: "Punto 2: Ojeda, el líder",
        a: [
          "Alonso de Ojeda lideró la expedición.",
          "Liderar quiere decir guiar y tomar decisiones.",
          "Decidía el rumbo del barco y dónde detenerse.",
        ],
      },
      {
        q: [
          "¿Cómo se cuenta con palabras lo que se ve en un viaje?",
        ],
        h: "Punto 3: Vespucio, el relator",
        a: [
          "Américo Vespucio escribió relatos del viaje.",
          "Un relato cuenta lo que pasó, paso a paso.",
          "Describía el mar, la tierra y las personas que veía.",
          "Según se cuenta, vio casas sobre el agua y pensó en Venecia.",
        ],
      },
      {
        q: [
          "¿Y cómo guardarías lo recorrido para que otros",
          "no se pierdan?",
        ],
        h: "Punto 4: Juan de la Cosa, el cartógrafo",
        a: [
          "Juan de la Cosa fue cartógrafo: dibujaba mapas.",
          "Un mapa muestra la costa que se recorrió.",
          "Su mapa y el relato de Vespucio se completan.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿Colón viajó en 1499 con",
          "ese equipo?",
        ],
        h: "Punto 5: Cuidado con Colón",
        a: [
          "No: Colón corresponde al viaje de 1498.",
          "En 1499 viajaron Ojeda, Vespucio y Juan de la Cosa.",
          "Ellos exploraron la costa desde Paria hasta La Guajira.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuántos exploradores formaban el equipo de 1499?", o: ["Tres", "Uno", "Cinco", "Diez"] },
        { q: "¿Quién lideró la expedición de 1499?", o: ["Alonso de Ojeda", "Américo Vespucio", "Juan de la Cosa", "Cristóbal Colón"] },
        { q: "¿Qué quiere decir «liderar»?", o: ["Guiar y tomar decisiones", "Dibujar mapas", "Escribir cartas", "Pescar"] },
        { q: "¿Quién escribió relatos del viaje?", o: ["Américo Vespucio", "Alonso de Ojeda", "Juan de la Cosa", "Cristóbal Colón"] },
        { q: "¿Qué es un relato?", o: ["Contar lo que pasó, paso a paso", "Un dibujo de la costa", "Una isla", "Un barco"] },
        { q: "¿Quién fue el cartógrafo?", o: ["Juan de la Cosa", "Alonso de Ojeda", "Américo Vespucio", "Cristóbal Colón"] },
        { q: "¿Qué hace un cartógrafo?", o: ["Dibuja mapas", "Escribe relatos", "Dirige el barco", "Cultiva yuca"] },
        { q: "¿A qué viaje corresponde Colón?", o: ["Al de 1498", "Al de 1499", "Al de 1500", "Al de 1600"] },
      ],
      write: [
        "Escribe el nombre de cada explorador y su tarea.",
        "Explica por qué Colón no iba en la expedición de 1499.",
      ],
      schematic: [
        "Dibuja tres iconos: timón, cuaderno y mapa.",
        "Dibuja un esquema que una cada explorador con su tarea.",
      ],
    },
    image: [
      "Dibuja un timón, un cuaderno y un mapa.",
      "Escribe debajo de cada uno el nombre del explorador.",
      "Rotula su tarea: líder, relator o cartógrafo.",
      "Añade el año 1499 en una esquina.",
    ],
    summary: "En 1499 Ojeda lideró, Vespucio escribió relatos y Juan de la Cosa dibujó mapas de la costa.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "his-c3-w2-d4",
    opening: ayer,
    repaso: [
      "Ayer conociste a tres exploradores de 1499.",
      "Ojeda lideró, Vespucio relató y Juan de la Cosa hizo mapas.",
      "Cada uno tuvo una tarea distinta.",
    ],
    units: [
      {
        q: [
          "Mira un mapa de Venezuela. ¿Qué parte te muestra dónde",
          "termina la tierra y empieza el mar?",
        ],
        h: "Punto 1: La costa en el mapa",
        a: [
          "Esa parte es la costa o litoral.",
          "El litoral es la franja donde se juntan mar y tierra.",
          "En la costa había aldeas, ríos y lugares de trueque.",
        ],
      },
      {
        q: [
          "En un mapa, ¿cómo sabes hacia dónde queda cada lugar?",
        ],
        h: "Punto 2: Leer las direcciones",
        a: [
          "Oriente es donde sale el sol; occidente, donde se oculta.",
          "Paria está en el oriente de la costa venezolana.",
          "La Guajira está en el noroccidente.",
          "Noroccidente es hacia el norte y hacia el occidente.",
        ],
      },
      {
        q: [
          "Ahora tú: si viajas de Paria a La Guajira, ¿hacia dónde",
          "vas, al oriente o al occidente?",
        ],
        h: "Punto 3: El viaje de 1499",
        a: [
          "Vas hacia el occidente, siguiendo la costa.",
          "Los exploradores de 1499 hicieron ese recorrido.",
          "Navegaban pegados a la costa: eso se llama cabotaje.",
        ],
      },
      {
        q: [
          "¿Cómo marcarías en un mapa una ruta con paradas?",
        ],
        h: "Punto 4: Marcar una ruta",
        a: [
          "Pones un punto en cada parada, como Paria y La Guajira.",
          "Unes los puntos con una línea que sigue la costa.",
          "Escribes el nombre al lado de cada punto.",
          "Una leyenda explica qué significa cada marca.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿La Guajira está en el oriente?",
        ],
        h: "Punto 5: Cuidado con los extremos",
        a: [
          "No: La Guajira está en el noroccidente.",
          "Paria es el extremo del oriente.",
          "Si los cambias, el mapa queda al revés.",
          "Y no mezcles: 1498 es Colón y 1499 es la expedición.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es el litoral?", o: ["La franja donde se juntan mar y tierra", "Una montaña alta", "Un desierto", "Un río"] },
        { q: "¿Dónde queda Paria?", o: ["En el oriente", "En el noroccidente", "En el sur", "En el centro"] },
        { q: "¿Dónde queda La Guajira?", o: ["En el noroccidente", "En el oriente", "En el sur", "En el centro"] },
        { q: "¿Por dónde sale el sol?", o: ["Por el oriente", "Por el occidente", "Por el sur", "Por el norte"] },
        { q: "¿Hacia dónde va el viaje de Paria a La Guajira?", o: ["Hacia el occidente", "Hacia el oriente", "Hacia el sur", "Hacia el mar abierto"] },
        { q: "¿Qué es el cabotaje?", o: ["Navegar pegado a la costa", "Dibujar un mapa", "Escribir un relato", "Cambiar cosas"] },
        { q: "¿Qué explica la leyenda de un mapa?", o: ["Qué significa cada marca", "Quién ganó", "El clima de hoy", "La fecha de hoy"] },
        { q: "¿Quiénes exploraron la costa en 1499?", o: ["Ojeda, Vespucio y Juan de la Cosa", "Solo Colón", "Solo Vespucio", "Colón y Ojeda"] },
      ],
      write: [
        "Escribe dónde queda Paria y dónde queda La Guajira.",
        "Explica cómo marcarías una ruta con paradas en un mapa.",
      ],
      schematic: [
        "Dibuja la costa y traza la ruta de Paria a La Guajira.",
        "Dibuja una rosa de los vientos con oriente y occidente.",
      ],
    },
    image: [
      "Dibuja la costa de Venezuela como una línea larga.",
      "Marca Paria en el oriente y La Guajira en el noroccidente.",
      "Une los puntos con una línea y dibuja un barco.",
      "Añade una leyenda con el significado de tus marcas.",
    ],
    summary: "Paria está en el oriente y La Guajira en el noroccidente. La expedición de 1499 recorrió la costa entre ambos.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "his-c3-w2-d5",
    opening: ayer,
    repaso: [
      "Esta semana ordenaste los primeros viajes a Venezuela.",
      "Viste dos fechas, tres exploradores y una ruta.",
      "Hoy lo recuerdas y lo cuentas con orden.",
    ],
    units: [
      {
        q: [
          "Sin mirar nada, ¿qué pasó en 1498 y qué pasó en 1499?",
        ],
        w: 3,
        h: "Punto 1: Dos fechas",
        a: [
          "Viajes: Colón 1498 llega a Paria; 1499 otras expediciones;",
          "ruta de Paria a La Guajira.",
          "1498: Colón llegó a tierra firme, en Paria.",
          "1499: Ojeda, Vespucio y Juan de la Cosa exploraron la costa.",
        ],
      },
      {
        q: [
          "¿Cuál era la tarea de cada explorador de 1499?",
        ],
        h: "Punto 2: Tres tareas",
        a: [
          "Ojeda lideró: decidía el rumbo y las paradas.",
          "Vespucio escribió relatos de lo que veía.",
          "Juan de la Cosa fue cartógrafo: dibujó mapas.",
        ],
      },
      {
        q: [
          "Mira la ruta de punta a punta. ¿Dónde empieza, dónde",
          "termina y hacia dónde queda cada punto?",
        ],
        h: "Punto 3: La ruta en el mapa",
        a: [
          "Empieza en Paria, que está en el oriente.",
          "Termina en La Guajira, en el noroccidente.",
          "Entre los dos extremos se extiende el litoral.",
        ],
      },
      {
        q: [
          "Vas a explicarle esto a alguien de tu casa. ¿Cómo",
          "empezarías y cómo lo terminarías?",
        ],
        h: "Punto 4: Cómo contarlo con orden",
        a: [
          "Primero di las fechas: agosto de 1498 y el año 1499.",
          "Después nombra a las personas y lo que hizo cada una.",
          "Luego señala la ruta en un mapa.",
          "Al final recuerda a los pueblos que ya vivían allí.",
        ],
      },
      {
        q: [
          "¿Basta con decir años y nombres?",
          "¿Qué más hace falta para explicarlo bien?",
        ],
        h: "Punto 5: Fecha, personas y mapa",
        a: [
          "No basta: hay que unir fecha, personas y mapa.",
          "Así sabes qué pasó, quién lo hizo y dónde ocurrió.",
          "Una explicación así se entiende y se recuerda.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué pasó en 1498?", o: ["Colón llegó a tierra firme, en Paria", "Salió la expedición de 1499", "Vespucio dibujó un mapa", "Ojeda llegó a La Guajira"] },
        { q: "¿Qué hizo Alonso de Ojeda?", o: ["Lideró la expedición", "Dibujó mapas", "Escribió relatos", "Pescó"] },
        { q: "¿Qué hizo Américo Vespucio?", o: ["Escribió relatos", "Dibujó mapas", "Lideró la expedición", "Sembró yuca"] },
        { q: "¿Qué hizo Juan de la Cosa?", o: ["Dibujó mapas", "Escribió relatos", "Lideró la expedición", "Hizo trueque"] },
        { q: "¿Dónde empieza la ruta en el mapa?", o: ["En Paria", "En La Guajira", "En los Andes", "En el mar abierto"] },
        { q: "¿Dónde termina la ruta?", o: ["En La Guajira", "En Paria", "En los Andes", "En una isla"] },
        { q: "¿Qué hay que unir para explicar bien?", o: ["Fecha, personas y mapa", "Solo nombres", "Solo años", "Solo dibujos"] },
        { q: "¿Quiénes ya vivían en la costa?", o: ["Pueblos originarios", "Nadie", "Solo exploradores", "Solo Colón"] },
      ],
      write: [
        "Escribe de memoria las dos fechas y qué pasó en cada una.",
        "Cuenta con tus palabras la ruta de Paria a La Guajira.",
      ],
      schematic: [
        "Dibuja un esquema con fecha, personas y mapa.",
        "Dibuja la ruta con Paria, La Guajira y los tres exploradores.",
      ],
    },
    image: [
      "Dibuja una línea del tiempo con 1498 y 1499.",
      "Dibuja la costa con Paria y La Guajira marcadas.",
      "Rotula a Colón, Ojeda, Vespucio y Juan de la Cosa.",
      "Revisa que cada nombre esté en su año.",
    ],
    summary: "En 1498 llegó Colón a Paria y en 1499 tres exploradores recorrieron la costa hasta La Guajira.",
  },
];
