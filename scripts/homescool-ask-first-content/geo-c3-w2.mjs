/**
 * Geografía · ciclo 3 · semana 2 · nivel 6 — narrativa inductiva, todo "pregunta primero".
 * Tema de la semana: cuatro estados de Venezuela y sus capitales
 * (Distrito Capital—Caracas, La Guaira—La Guaira, Miranda—Los Teques, Aragua—Maracay).
 *
 * unit = { q: [líneas de pregunta] (omitir si la pregunta es la apertura),
 *          h: "Punto N: título", a: [líneas de respuesta], w?: líneas de espacio, c?: líneas para copiar }
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "geo-c3-w2-d1",
    opening: "¿Cómo se llama la ciudad principal de un estado?",
    repaso: null,
    units: [
      {
        h: "Punto 1: Estados y capitales",
        a: [
          "Un estado es una gran parte del país con su propio gobierno.",
          "La ciudad principal, donde está ese gobierno, es su capital.",
          "Venezuela tiene 23 estados y el Distrito Capital.",
          "Esta semana conoceremos cuatro, cada uno con su capital.",
        ],
      },
      {
        q: [
          "Piensa en la ciudad donde funciona el gobierno de todo el país.",
          "¿Cómo se llama?",
        ],
        h: "Punto 2: Distrito Capital y Caracas",
        a: [
          "Es Caracas, la capital de Venezuela.",
          "Caracas está en el Distrito Capital.",
          "Es especial porque sirve a todo el país, no solo a su estado.",
        ],
      },
      {
        q: [
          "Ahora imagina un estado con un puerto junto al mar.",
          "Se llama La Guaira. ¿Cómo crees que se llama su capital?",
        ],
        h: "Punto 3: La Guaira, estado y capital",
        a: [
          "La capital del estado La Guaira se llama también La Guaira.",
          "Estado y capital tienen el mismo nombre.",
          "Es un estado de costa, frente al mar Caribe.",
          "Cerca queda Maiquetía, pero esa no es la capital.",
        ],
      },
      {
        q: [
          "Hay una ciudad en las montañas llamada Los Teques.",
          "¿De qué estado crees que es la capital?",
        ],
        h: "Punto 4: Miranda y Los Teques",
        a: [
          "Los Teques es la capital del estado Miranda.",
          "Queda en las montañas, cerca del valle de Caracas.",
        ],
      },
      {
        q: [
          "Más al oeste, en un valle, está Maracay.",
          "¿De qué estado crees que es la capital?",
        ],
        h: "Punto 5: Aragua y Maracay",
        a: [
          "Maracay es la capital del estado Aragua.",
          "Queda en un valle del centro del país.",
          "Repite los cuatro pares así:",
          "Distrito Capital—Caracas · La Guaira—La Guaira ·",
          "Miranda—Los Teques · Aragua—Maracay.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuál es la capital del Distrito Capital?", o: ["Caracas", "Maracay", "Los Teques", "La Guaira"] },
        { q: "¿Cuál es la capital del estado La Guaira?", o: ["La Guaira", "Maiquetía", "Caracas", "Maracay"] },
        { q: "¿Cuál es la capital del estado Miranda?", o: ["Los Teques", "Maracay", "Caracas", "La Guaira"] },
        { q: "¿Cuál es la capital del estado Aragua?", o: ["Maracay", "Los Teques", "Caracas", "La Guaira"] },
        { q: "¿Qué es una capital?", o: ["La ciudad donde está el gobierno", "Un río muy largo", "Un mar", "Una montaña"] },
        { q: "¿Qué par de estado y capital está bien escrito?", o: ["Aragua — Maracay", "Miranda — Maracay", "La Guaira — Caracas", "Distrito Capital — Los Teques"] },
        { q: "¿Qué estado tiene a Los Teques como capital?", o: ["Miranda", "Aragua", "Distrito Capital", "La Guaira"] },
        { q: "¿Cuál es la capital de Venezuela?", o: ["Caracas", "Maracay", "Los Teques", "La Guaira"] },
      ],
      write: [
        "Explica qué es un estado y qué es una capital.",
        "Escribe los cuatro pares de estado y capital de la semana.",
      ],
      schematic: [
        "Dibuja cuatro tarjetas: un estado y su capital en cada una.",
        "Dibuja un mapa sencillo y marca a Caracas con una estrella.",
      ],
    },
    image: [
      "Dibuja cuatro tarjetas grandes en el recuadro.",
      "Escribe en cada una un estado y, debajo, su capital.",
      "Dibuja un símbolo pequeño para cada capital.",
      "Revisa que Los Teques y Maracay no se mezclen.",
    ],
    summary: "Cada estado tiene una capital: Caracas, La Guaira, Los Teques y Maracay son las de esta semana.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "geo-c3-w2-d2",
    opening: ayer,
    repaso: [
      "Ayer aprendimos qué es un estado y qué es una capital.",
      "Conocimos cuatro estados: Distrito Capital, La Guaira,",
      "Miranda y Aragua, cada uno con su capital.",
    ],
    units: [
      {
        q: [
          "¿Qué estado tiene a Caracas como capital?",
          "¿Y qué hace especial a Caracas?",
        ],
        h: "Punto 1: Distrito Capital",
        a: [
          "Caracas está en el Distrito Capital.",
          "Es la capital de todo el país.",
          "Allí funcionan las sedes principales del gobierno nacional.",
        ],
      },
      {
        q: [
          "Imagina que sales de Caracas hacia el mar Caribe.",
          "¿Qué crees que tendrías que cruzar primero?",
        ],
        h: "Punto 2: Entre Caracas y el mar",
        a: [
          "Tendrías que cruzar las montañas de la costa.",
          "Caracas queda en un valle entre montañas.",
          "Del otro lado de esas montañas llegas al estado La Guaira.",
        ],
      },
      {
        q: [
          "Y en La Guaira, junto al mar, ¿qué crees que hay para",
          "que lleguen los barcos y los aviones?",
        ],
        h: "Punto 3: Un estado con puerto",
        a: [
          "En La Guaira hay un puerto, donde llegan los barcos.",
          "En Maiquetía está el aeropuerto, para los aviones.",
          "El estado La Guaira es una franja larga junto al mar.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿la capital del estado La Guaira",
          "es Maiquetía?",
        ],
        h: "Punto 4: Un nombre repetido",
        a: [
          "No: la capital es La Guaira, igual que el estado.",
          "Maiquetía es otra ciudad del estado, famosa por su aeropuerto.",
          "Estado y capital se llaman igual: ¡es fácil de recordar!",
        ],
      },
      {
        q: [
          "Prueba tu memoria: di los cuatro pares completos,",
          "primero el estado y luego su capital.",
        ],
        h: "Punto 5: Dilo completo",
        a: [
          "Distrito Capital—Caracas · La Guaira—La Guaira ·",
          "Miranda—Los Teques · Aragua—Maracay.",
          "Di siempre primero el estado y después su capital.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué estado tiene a Caracas como capital?", o: ["Distrito Capital", "Miranda", "Aragua", "La Guaira"] },
        { q: "¿Qué ciudad es la capital de todo el país?", o: ["Caracas", "Los Teques", "Maracay", "La Guaira"] },
        { q: "¿Qué hay entre Caracas y el mar Caribe?", o: ["Montañas de la costa", "Un desierto", "Un glaciar", "Una selva"] },
        { q: "¿Qué estado es una franja larga junto al mar?", o: ["La Guaira", "Miranda", "Aragua", "Distrito Capital"] },
        { q: "¿Qué hay en La Guaira para los barcos?", o: ["Un puerto", "Un volcán", "Un glaciar", "Una selva"] },
        { q: "¿Dónde está el aeropuerto que vimos hoy?", o: ["En Maiquetía", "En Maracay", "En Los Teques", "En Caracas"] },
        { q: "¿Cuál es la capital del estado La Guaira?", o: ["La Guaira", "Maiquetía", "Caracas", "Maracay"] },
        { q: "¿Qué debes decir primero al repasar un par?", o: ["El estado", "La capital", "El río", "La región"] },
      ],
      write: [
        "Explica por qué Caracas es especial para todo el país.",
        "Cuenta qué hay en el estado La Guaira junto al mar.",
      ],
      schematic: [
        "Dibuja el mar, las montañas y Caracas, en ese orden.",
        "Dibuja el estado La Guaira como una franja junto al mar.",
      ],
    },
    image: [
      "Dibuja el mar Caribe en la parte de arriba del recuadro.",
      "Debajo dibuja una franja de costa con un puerto y un barco.",
      "Más abajo, dibuja montañas y un valle con Caracas.",
      "Rotula: mar Caribe, La Guaira y Caracas.",
    ],
    summary: "Caracas sirve a todo el país; La Guaira es un estado de costa con puerto y su capital se llama igual.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "geo-c3-w2-d3",
    opening: ayer,
    repaso: [
      "Ayer vimos que Caracas es la capital de todo el país.",
      "La Guaira es un estado junto al mar y tiene puerto.",
      "Su capital se llama igual que el estado: La Guaira.",
    ],
    units: [
      {
        q: [
          "Hay un estado llamado Miranda, muy cerca de Caracas.",
          "¿Recuerdas cuál es su capital?",
        ],
        h: "Punto 1: Miranda y Los Teques",
        a: [
          "La capital de Miranda es Los Teques.",
          "Queda en las montañas, cerca del valle de Caracas.",
          "Truco: imagina «Los Teques» en lo alto de un cerro.",
        ],
      },
      {
        q: [
          "Ahora viajemos hacia el oeste, a un valle muy fértil.",
          "¿Qué ciudad crees que encontramos allí?",
        ],
        h: "Punto 2: Aragua y Maracay",
        a: [
          "Es Maracay, la capital del estado Aragua.",
          "Queda en un valle del centro del país.",
          "Está cerca del lago de Valencia.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿Maracay es la capital de Miranda?",
        ],
        h: "Punto 3: No las mezcles",
        a: [
          "No: Maracay es la capital de Aragua.",
          "Muchos se confunden porque Maracay es muy conocida.",
          "Pregúntate siempre: ¿capital de qué estado?",
          "La capital de Miranda es Los Teques.",
        ],
      },
      {
        q: [
          "Mira estos dos lugares: uno en el cerro y otro en el valle.",
          "¿Cuál va con Miranda y cuál con Aragua?",
        ],
        h: "Punto 4: Cerro y valle",
        a: [
          "Los Teques va con Miranda: está en las montañas.",
          "Maracay va con Aragua: está en el valle.",
          "Puedes decir: Miranda con Teques en el cerro,",
          "y Aragua con Maracay en el valle.",
        ],
      },
      {
        q: [
          "Recita los cuatro pares de la semana sin mirar.",
          "¿Cuántos recuerdas?",
        ],
        h: "Punto 5: Los cuatro pares",
        a: [
          "Distrito Capital—Caracas · La Guaira—La Guaira ·",
          "Miranda—Los Teques · Aragua—Maracay.",
          "Tápalos con la mano y dilos otra vez.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuál es la capital del estado Miranda?", o: ["Los Teques", "Maracay", "Caracas", "La Guaira"] },
        { q: "¿Cuál es la capital del estado Aragua?", o: ["Maracay", "Los Teques", "Caracas", "La Guaira"] },
        { q: "¿Maracay es la capital de Miranda?", o: ["No, es la de Aragua", "Sí, siempre", "No, es la de La Guaira", "Sí, y la de Aragua"] },
        { q: "¿Qué ciudad queda en las montañas cerca de Caracas?", o: ["Los Teques", "Maracay", "La Guaira", "Maiquetía"] },
        { q: "¿Qué ciudad queda en un valle del centro del país?", o: ["Maracay", "Los Teques", "La Guaira", "Caracas"] },
        { q: "¿Qué lago queda cerca de Maracay?", o: ["El lago de Valencia", "El lago Titicaca", "El lago Victoria", "El lago Michigan"] },
        { q: "¿Qué debes preguntarte para no confundir capitales?", o: ["¿Capital de qué estado?", "¿Qué hora es?", "¿Qué río es?", "¿Cuántos son?"] },
        { q: "¿Qué estado va con Los Teques?", o: ["Miranda", "Aragua", "La Guaira", "Distrito Capital"] },
      ],
      write: [
        "Explica cómo no mezclar Los Teques con Maracay.",
        "Escribe los cuatro pares de estado y capital sin mirar.",
      ],
      schematic: [
        "Dibuja un cerro con Los Teques y un valle con Maracay.",
        "Dibuja dos tarjetas: Miranda con su capital y Aragua con la suya.",
      ],
    },
    image: [
      "Dibuja dos montañas y un valle entre ellas.",
      "Escribe Los Teques en lo alto de una montaña.",
      "Escribe Maracay en el valle, cerca de un lago.",
      "Rotula debajo el estado de cada una.",
    ],
    summary: "Miranda va con Los Teques, en las montañas, y Aragua va con Maracay, en el valle. No se mezclan.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "geo-c3-w2-d4",
    opening: ayer,
    repaso: [
      "Ayer vimos que Los Teques es la capital de Miranda.",
      "Y que Maracay es la capital de Aragua.",
      "Una queda en el cerro y la otra en el valle.",
    ],
    units: [
      {
        q: [
          "Sales de Caracas hacia el mar Caribe. ¿Hacia qué punto",
          "cardinal vas y qué estado encuentras?",
        ],
        h: "Punto 1: Caracas y La Guaira",
        a: [
          "Caracas será tu punto de referencia, el centro del dibujo.",
          "La Guaira queda al norte de Caracas, hacia el mar.",
          "El norte va hacia arriba en el mapa.",
        ],
      },
      {
        q: [
          "Ahora te vas hacia Los Teques. ¿Hacia qué lado de",
          "Caracas crees que queda?",
        ],
        h: "Punto 2: Caracas y Los Teques",
        a: [
          "Los Teques queda al oeste de Caracas, cerquita.",
          "Está un poquito hacia abajo, entre las montañas.",
        ],
      },
      {
        q: [
          "Sigue más lejos en esa misma dirección. ¿A qué ciudad",
          "llegas después de Los Teques?",
        ],
        h: "Punto 3: Hasta Maracay",
        a: [
          "Llegas a Maracay, también hacia el oeste.",
          "Queda mucho más lejos que Los Teques.",
          "Maracay está en un valle, cerca del lago de Valencia.",
        ],
      },
      {
        q: [
          "Ahora dibújalo. ¿Qué necesitas para que tu croquis",
          "le sirva a quien lo mire?",
        ],
        h: "Punto 4: El croquis",
        a: [
          "Un croquis es un dibujo sencillo de un lugar.",
          "Necesita una flecha que marque el norte.",
          "Y un punto de referencia: aquí, Caracas.",
          "Pon los otros lugares alrededor, según su dirección.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿dónde pondrías La Guaira,",
          "arriba o abajo de Caracas?",
        ],
        h: "Punto 5: Cada ciudad en su lugar",
        a: [
          "Arriba, porque está al norte, junto al mar.",
          "Los Teques y Maracay van a la izquierda, hacia el oeste.",
          "Así tu croquis muestra dónde está cada capital.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué ciudad es el punto de referencia de hoy?", o: ["Caracas", "Maracay", "Los Teques", "La Guaira"] },
        { q: "¿Hacia dónde queda La Guaira respecto a Caracas?", o: ["Al norte", "Al sur", "Al este", "Al oeste"] },
        { q: "¿Hacia dónde queda Los Teques respecto a Caracas?", o: ["Al oeste", "Al norte", "Al este", "Al mar"] },
        { q: "¿Qué ciudad queda más lejos de Caracas?", o: ["Maracay", "Los Teques", "La Guaira", "Maiquetía"] },
        { q: "¿Qué es un croquis?", o: ["Un dibujo sencillo de un lugar", "Un río largo", "Una montaña", "Un estado"] },
        { q: "¿Qué marca la flecha de un croquis?", o: ["El norte", "El tamaño", "La hora", "El clima"] },
        { q: "¿Qué es un punto de referencia?", o: ["El lugar desde donde te orientas", "Un lugar lejano", "Un mar", "Un río"] },
        { q: "¿Hacia dónde va el norte en el mapa?", o: ["Hacia arriba", "Hacia abajo", "A la derecha", "Al centro"] },
      ],
      write: [
        "Explica cómo llegas de Caracas a Los Teques.",
        "Cuenta qué necesita un croquis para ser útil.",
      ],
      schematic: [
        "Dibuja un croquis con Caracas al centro y la flecha del norte.",
        "Dibuja un croquis con La Guaira, Los Teques y Maracay.",
      ],
    },
    image: [
      "Dibuja una flecha que marque el norte.",
      "Dibuja una estrella en el centro: es Caracas.",
      "Pon La Guaira arriba, Los Teques y Maracay a la izquierda.",
      "Rotula cada ciudad con su estado.",
    ],
    summary: "Con un croquis ubicas las capitales: La Guaira al norte de Caracas, y Los Teques y Maracay hacia el oeste.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "geo-c3-w2-d5",
    opening: ayer,
    repaso: [
      "Esta semana conociste cuatro estados con sus capitales.",
      "Viste que Caracas sirve a todo el país.",
      "Y que Los Teques y Maracay no se deben mezclar.",
    ],
    units: [
      {
        q: [
          "Sin mirar nada, ¿cuáles son los cuatro estados de la",
          "semana y la capital de cada uno?",
        ],
        w: 3,
        h: "Punto 1: Los cuatro pares",
        a: [
          "Distrito Capital—Caracas · La Guaira—La Guaira ·",
          "Miranda—Los Teques · Aragua—Maracay.",
          "Si olvidaste alguno, vuelve a decirlo en voz alta.",
        ],
      },
      {
        q: [
          "¿Cuál de los cuatro estados tiene una capital con su",
          "mismo nombre?",
        ],
        h: "Punto 2: El nombre repetido",
        a: [
          "Es La Guaira: el estado y su capital se llaman igual.",
          "Queda junto al mar Caribe y tiene puerto.",
          "Maiquetía no es su capital, aunque tenga el aeropuerto.",
        ],
      },
      {
        q: [
          "Ahora ubícalas. ¿Cuál capital está en el cerro,",
          "cuál en el valle y cuál junto al mar?",
        ],
        h: "Punto 3: Cerro, valle y mar",
        a: [
          "Los Teques, capital de Miranda, está en las montañas.",
          "Maracay, capital de Aragua, está en un valle.",
          "La Guaira está junto al mar, al norte de Caracas.",
          "Caracas está en un valle entre montañas.",
        ],
      },
      {
        q: [
          "Vas a contarle a tu familia lo que aprendiste.",
          "¿Cómo empezarías tu exposición?",
        ],
        h: "Punto 4: Cómo contarlo con orden",
        a: [
          "Una buena exposición tiene inicio, medio y cierre.",
          "Inicio: «Hoy les cuento cuatro estados y sus capitales».",
          "Medio: cada estado con su capital y dónde queda.",
          "Cierre: repite los cuatro pares y di «gracias».",
        ],
      },
      {
        q: [
          "Si alguien dice que Maracay es la capital de Miranda,",
          "¿qué le responderías?",
        ],
        h: "Punto 5: Corregir con calma",
        a: [
          "Le dirías: Maracay es la capital de Aragua.",
          "La capital de Miranda es Los Teques.",
          "Pregunta siempre: ¿capital de qué estado?",
          "Así no mezclas un estado con otro.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuál es la capital del Distrito Capital?", o: ["Caracas", "Maracay", "Los Teques", "La Guaira"] },
        { q: "¿Qué estado tiene su capital con el mismo nombre?", o: ["La Guaira", "Miranda", "Aragua", "Distrito Capital"] },
        { q: "¿Cuál es la capital de Miranda?", o: ["Los Teques", "Maracay", "Caracas", "La Guaira"] },
        { q: "¿Cuál es la capital de Aragua?", o: ["Maracay", "Los Teques", "Caracas", "La Guaira"] },
        { q: "¿Qué ciudad está junto al mar, al norte de Caracas?", o: ["La Guaira", "Maracay", "Los Teques", "Caracas"] },
        { q: "¿Qué capital está en las montañas cerca de Caracas?", o: ["Los Teques", "Maracay", "La Guaira", "Maiquetía"] },
        { q: "¿Qué tiene una buena exposición?", o: ["Inicio, medio y cierre", "Solo un final", "Solo dibujos", "Ningún orden"] },
        { q: "Si dicen que Maracay es la de Miranda, ¿qué respondes?", o: ["Es la capital de Aragua", "Tienen razón", "Es la de La Guaira", "Es la de Caracas"] },
      ],
      write: [
        "Cuenta a alguien los cuatro pares, con orden.",
        "Explica cómo corregir a quien mezcla Maracay y Los Teques.",
      ],
      schematic: [
        "Dibuja un mapa con las cuatro capitales y su estado.",
        "Dibuja un croquis con la flecha del norte y Caracas al centro.",
      ],
    },
    image: [
      "Dibuja un mapa sencillo con una flecha hacia el norte.",
      "Pon una estrella en Caracas, en el centro.",
      "Marca La Guaira, Los Teques y Maracay en su lugar.",
      "Rotula cada capital con su estado.",
    ],
    summary: "Cuatro estados, cuatro capitales: Caracas, La Guaira, Los Teques y Maracay, cada una con su estado.",
  },
];
