/**
 * Geografía · ciclo 3 · semana 2 · nivel 6 — Ask First + metáfora de Venezuela (v3: 3 días).
 * Tema: cuatro estados y sus capitales
 * (Distrito Capital—Caracas, La Guaira—La Guaira, Miranda—Los Teques, Aragua—Maracay).
 * Hito: La Gran Sabana (estado Bolívar). Datos seguros: región de sabanas con tepuyes y ríos;
 * tepuy = montaña de cima plana; imágenes: llanura grande con montañas-mesa, regiones.
 *
 * d1 = panorama (región, estado, capital, los cuatro pares)
 * d2 = cada capital de cerca (Caracas, La Guaira, Los Teques, Maracay)
 * d3 = ubicarlas en un croquis y contarlas con orden (cierra la semana)
 */
export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "geo-c3-w2-d1",
    units: [
      {
        h: "Punto 1: Repaso de la clase pasada",
        a: [
          "La semana pasada viste que Venezuela",
          "tiene fronteras y regiones. Hoy bajas",
          "del mapa grande a los estados, con la",
          "Gran Sabana como guía.",
        ],
      },
      {
        q: [
          "La Gran Sabana tiene sabanas, tepuyes",
          "y ríos. ¿Es un estado o una región?",
        ],
        h: "Punto 2: Región y estado",
        a: [
          "Es una región: un lugar con rasgos",
          "parecidos, como sabanas y tepuyes.",
          "Está en el estado Bolívar. Un estado",
          "es una parte del país con gobierno.",
        ],
      },
      {
        q: [
          "Cada estado tiene una ciudad principal",
          "donde está su gobierno. ¿Cómo se llama?",
        ],
        h: "Punto 3: La capital",
        a: [
          "Se llama capital. Es como el tepuy",
          "más conocido de la sabana: sirve",
          "para orientarte en el mapa.",
        ],
      },
      {
        q: [
          "Viaja con tu dedo desde la Gran Sabana",
          "hasta la capital del país. ¿Cuál es?",
        ],
        h: "Punto 4: Distrito Capital y Caracas",
        a: [
          "Es Caracas, la capital de Venezuela.",
          "Está en el Distrito Capital, que es",
          "un lugar aparte de los 23 estados.",
        ],
      },
      {
        q: [
          "Sigue hacia el mar. Un estado se llama",
          "La Guaira. ¿Cómo se llama su capital?",
        ],
        h: "Punto 5: La Guaira y La Guaira",
        a: [
          "Su capital también es La Guaira.",
          "Estado y capital se llaman igual.",
          "Queda junto al mar Caribe.",
        ],
      },
      {
        q: [
          "Tierra adentro hay dos estados más:",
          "Miranda y Aragua. ¿Y sus capitales?",
        ],
        h: "Punto 6: Miranda y Aragua",
        a: [
          "Distrito Capital—Caracas ·",
          "La Guaira—La Guaira ·",
          "Miranda—Los Teques ·",
          "Aragua—Maracay.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es la Gran Sabana?", o: ["Una región con tepuyes", "Una capital", "Un mar", "Un número"] },
        { q: "¿En qué estado está la Gran Sabana?", o: ["Bolívar", "Miranda", "Aragua", "La Guaira"] },
        { q: "¿Qué es un estado?", o: ["Parte del país con gobierno", "Un río", "Un tepuy", "Un mar"] },
        { q: "¿Qué es una capital?", o: ["La ciudad principal del estado", "Una montaña", "Un río", "Una isla"] },
        { q: "¿Cuál es la capital de Venezuela?", o: ["Caracas", "Maracay", "Los Teques", "La Guaira"] },
        { q: "¿Dónde está Caracas?", o: ["Distrito Capital", "Miranda", "Aragua", "Bolívar"] },
        { q: "¿Cuál es la capital de La Guaira?", o: ["La Guaira", "Maiquetía", "Caracas", "Maracay"] },
        { q: "¿Qué par une bien el estado con su capital?", o: ["Aragua—Maracay", "Miranda—Maracay", "Aragua—Los Teques", "Miranda—Caracas"] },
      ],
      write: [
        "Explica con tus palabras qué es una capital.",
        "Escribe los cuatro estados con su capital.",
      ],
      schematic: [
        "Dibuja el estado Bolívar con la Gran Sabana.",
        "Dibuja dos columnas: estado y capital.",
      ],
    },
    image: [
      "Dibuja cuatro tarjetas, una por estado.",
      "En cada una escribe estado y capital,",
      "completando los pares que faltan.",
      "Marca con una estrella a Caracas.",
    ],
    summary: "La Gran Sabana es una región; los estados tienen capital: Caracas, La Guaira, Los Teques y Maracay.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "geo-c3-w2-d2",
    units: [
      {
        h: "Punto 1: Repaso de la clase pasada",
        a: [
          "La clase pasada supiste que la Gran",
          "Sabana es una región y que cada estado",
          "tiene su capital. Hoy visitas cada",
          "capital más de cerca.",
        ],
      },
      {
        q: [
          "Los tepuyes te orientan en la sabana.",
          "¿Qué ciudad orienta a todo el país?",
        ],
        h: "Punto 2: Caracas, capital del país",
        a: [
          "Es Caracas, en el Distrito Capital.",
          "Allí está el gobierno de todo el país.",
          "Es como un tepuy que todos ven.",
        ],
      },
      {
        q: [
          "Sales de Caracas hacia el mar. ¿Qué hay",
          "en La Guaira para los barcos?",
        ],
        h: "Punto 3: La Guaira, estado con puerto",
        a: [
          "Hay un puerto, donde llegan los barcos.",
          "En Maiquetía está el aeropuerto.",
          "La Guaira es una franja junto al mar.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿la capital de",
          "La Guaira es Maiquetía?",
        ],
        h: "Punto 4: Un nombre repetido",
        a: [
          "No. La capital es La Guaira,",
          "igual que el estado.",
          "Maiquetía es otra ciudad del estado,",
          "famosa por su aeropuerto.",
        ],
      },
      {
        q: [
          "Tierra adentro están Miranda y Aragua.",
          "¿Cuál capital queda arriba, como un",
          "tepuy, y cuál abajo, como la sabana?",
        ],
        h: "Punto 5: Los Teques y Maracay",
        a: [
          "Los Teques, de Miranda, va arriba,",
          "en las montañas cerca de Caracas.",
          "Maracay, de Aragua, va abajo,",
          "en un valle junto al lago de Valencia.",
        ],
      },
      {
        q: [
          "Alguien dice que Maracay es la capital",
          "de Miranda. ¿Qué le respondes?",
        ],
        h: "Punto 6: No las mezcles",
        a: [
          "No. Maracay es la capital de Aragua.",
          "La de Miranda es Los Teques.",
          "Pregúntate: ¿capital de qué estado?",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué ciudad es la capital del país?", o: ["Caracas", "Los Teques", "Maracay", "La Guaira"] },
        { q: "¿Qué hay en La Guaira para los barcos?", o: ["Un puerto", "Un tepuy", "Un valle", "Una cueva"] },
        { q: "¿Dónde está el aeropuerto de hoy?", o: ["En Maiquetía", "En Maracay", "En Los Teques", "En Caracas"] },
        { q: "¿Cuál es la capital del estado La Guaira?", o: ["La Guaira", "Maiquetía", "Caracas", "Maracay"] },
        { q: "¿Cuál es la capital de Miranda?", o: ["Los Teques", "Maracay", "Caracas", "La Guaira"] },
        { q: "¿Cuál es la capital de Aragua?", o: ["Maracay", "Los Teques", "Caracas", "La Guaira"] },
        { q: "¿Qué ciudad queda en las montañas?", o: ["Los Teques", "Maracay", "La Guaira", "Maiquetía"] },
        { q: "¿Qué te preguntas para no mezclar?", o: ["¿Capital de qué estado?", "¿Qué hora es?", "¿Cuántos tepuyes hay?", "¿Qué río es?"] },
      ],
      write: [
        "Explica por qué Caracas es especial en el país.",
        "Explica cómo no mezclar Los Teques y Maracay.",
      ],
      schematic: [
        "Dibuja el mar, el puerto de La Guaira y Caracas.",
        "Dibuja un cerro con Los Teques y un valle con Maracay.",
      ],
    },
    image: [
      "Dibuja el mar arriba, con La Guaira.",
      "Debajo, un cerro con Los Teques.",
      "Abajo, un valle con Maracay y un lago.",
      "Rotula Caracas y márcala con estrella.",
    ],
    summary: "Caracas guía al país; La Guaira tiene puerto; Los Teques va en el cerro y Maracay en el valle.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "geo-c3-w2-d3",
    units: [
      {
        h: "Punto 1: Repaso de la clase pasada",
        a: [
          "La clase pasada viste que La Guaira",
          "tiene puerto, Los Teques está en el",
          "cerro y Maracay en el valle. Hoy los",
          "ubicas en un dibujo.",
        ],
      },
      {
        q: [
          "Un croquis es un dibujo sencillo de un",
          "lugar. ¿Por dónde empiezas el tuyo?",
        ],
        h: "Punto 2: El punto de referencia",
        a: [
          "Con un punto de referencia: un lugar",
          "conocido desde donde te orientas.",
          "Como un tepuy en la Gran Sabana.",
          "Hoy será Caracas.",
        ],
      },
      {
        q: [
          "¿Hacia dónde queda La Guaira si sales",
          "de Caracas hacia el mar Caribe?",
        ],
        h: "Punto 3: Caracas y La Guaira",
        a: [
          "Queda al norte de Caracas, hacia el mar.",
          "El norte va hacia arriba en el mapa.",
          "Dibuja una flecha que lo marque.",
        ],
      },
      {
        q: [
          "Ahora vas a Los Teques y sigues hasta",
          "Maracay. ¿Hacia qué lado quedan?",
        ],
        h: "Punto 4: Hacia el oeste",
        a: [
          "Quedan al oeste de Caracas. Los Teques",
          "está cerquita; Maracay, mucho más lejos.",
          "Ponlas a la izquierda de Caracas.",
        ],
      },
      {
        q: [
          "Eres guía en la Gran Sabana y vas a",
          "exponer. ¿Cómo cuentas los cuatro pares?",
        ],
        h: "Punto 5: Cuéntalos con orden",
        a: [
          "Una exposición tiene inicio, medio y",
          "cierre. Di primero el estado y luego",
          "su capital: Distrito Capital—Caracas ·",
          "La Guaira—La Guaira · Miranda—Los Teques ·",
          "Aragua—Maracay.",
        ],
      },
      {
        q: [
          "Alguien dice que La Guaira va a la",
          "izquierda de Caracas. ¿Qué le dices?",
        ],
        h: "Punto 6: Corregir con calma",
        a: [
          "Le dices: La Guaira va arriba,",
          "porque está al norte, junto al mar.",
          "Los Teques y Maracay van a la izquierda.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es un croquis?", o: ["Un dibujo sencillo de un lugar", "Un río largo", "Un tepuy", "Un estado"] },
        { q: "¿Cuál es el punto de referencia de hoy?", o: ["Caracas", "Maracay", "Los Teques", "La Guaira"] },
        { q: "¿Dónde queda La Guaira de Caracas?", o: ["Al norte", "Al sur", "Al este", "Al oeste"] },
        { q: "¿Dónde queda Los Teques de Caracas?", o: ["Al oeste", "Al norte", "Al este", "En el mar"] },
        { q: "¿Qué ciudad queda más lejos de Caracas?", o: ["Maracay", "Los Teques", "La Guaira", "Maiquetía"] },
        { q: "¿Hacia dónde va el norte en el mapa?", o: ["Hacia arriba", "Hacia abajo", "A la derecha", "Al centro"] },
        { q: "¿Qué tiene una buena exposición?", o: ["Inicio, medio y cierre", "Solo un final", "Solo dibujos", "Ningún orden"] },
        { q: "¿Qué dices primero en cada par?", o: ["El estado", "La capital", "El río", "El tepuy"] },
      ],
      write: [
        "Explica cómo llegas de Caracas a Los Teques.",
        "Cuenta a alguien los cuatro pares, con orden.",
      ],
      schematic: [
        "Dibuja un croquis con Caracas al centro y el norte.",
        "Dibuja La Guaira, Los Teques y Maracay en su lugar.",
      ],
    },
    image: [
      "Dibuja una flecha que marque el norte.",
      "Pon una estrella en el centro: Caracas.",
      "La Guaira arriba; Los Teques y Maracay",
      "a la izquierda. Rotula cada estado.",
    ],
    summary: "En un croquis, La Guaira va al norte de Caracas y Los Teques y Maracay al oeste; cuéntalos con orden.",
  },
];
