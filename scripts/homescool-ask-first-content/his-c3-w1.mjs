/**
 * Historia · ciclo 3 · semana 1 · nivel 6 — "Los primeros pueblos de Venezuela".
 * Formato Ask First v3 (3 días) con metáfora venezolana.
 * Hito: Palafitos de la Laguna de Sinamaica (Zulia): casas levantadas sobre el agua con palos.
 * Datos seguros usados: pueblos añú, casas sobre el agua con palos (palafitos), canoas,
 * vivir con el entorno. Nada más.
 *
 * Reparto: d1 = panorama (quiénes y dónde); d2 = Andes y ríos de cerca (Timotocuicas, Caribes, Arawacos);
 * d3 = los Wayús, cómo se guarda el saber y contar los cuatro pueblos con orden.
 *
 * Nota de hechos: los Timotocuicas se ubican en los Andes venezolanos. Caribes y Arawacos:
 * costas y ríos. Wayús: La Guajira. Los añú NO se cuentan entre los cuatro pueblos guía.
 */
export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "his-c3-w1-d1",
    units: [
      {
        h: "Punto 1: Repaso de la clase pasada",
        a: [
          "Ya conoces montañas, ríos y costas",
          "de Venezuela. Hoy preguntas quién",
          "vivió en esos lugares hace mucho.",
        ],
      },
      {
        q: [
          "En Sinamaica hay casas sobre el agua.",
          "¿Venezuela estaba vacía antes de Colón?",
        ],
        h: "Punto 2: Venezuela ya tenía habitantes",
        a: [
          "No estaba vacía: ya había pueblos.",
          "Se llaman pueblos originarios:",
          "son los primeros habitantes del lugar.",
        ],
      },
      {
        q: [
          "En Sinamaica los añú viven en casas",
          "sobre el agua. ¿Vivían todos igual?",
        ],
        h: "Punto 3: Eran pueblos distintos",
        a: [
          "No vivían igual: cada pueblo tenía",
          "su lugar, su lengua y sus costumbres.",
          "Un palafito es una casa sobre el agua.",
        ],
      },
      {
        q: [
          "Cada lugar tiene su nombre, como",
          "Sinamaica. ¿Qué pueblos conoces?",
        ],
        h: "Punto 4: Los cuatro nombres guía",
        a: [
          "Los primeros habitantes de Venezuela",
          "antes de la llegada de Colón fueron",
          "los Timotocuicas, Caribes,",
          "Arawacos y Wayús.",
        ],
      },
      {
        q: [
          "Una casa de Sinamaica va sobre el agua.",
          "¿Dónde vivía cada pueblo?",
        ],
        h: "Punto 5: Cada pueblo, su lugar",
        a: [
          "Timotocuicas: montañas de los Andes.",
          "Caribes y Arawacos: costas y ríos.",
          "Wayús: La Guajira, seca y junto al mar.",
        ],
      },
      {
        q: [
          "Un palafito se puede mirar hoy. ¿Y los",
          "pueblos de antes? ¿Cómo los conocemos?",
        ],
        h: "Punto 6: Cómo lo sabemos",
        a: [
          "Lo sabemos por objetos antiguos,",
          "como vasijas de barro, y por relatos",
          "que van de padres a hijos.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué son los palafitos?", o: ["Casas sobre el agua con palos", "Barcos grandes", "Cuevas de roca", "Casas en la nieve"] },
        { q: "¿Qué es un pueblo originario?", o: ["Los primeros habitantes del lugar", "Un barco español", "Una montaña alta", "Un tipo de casa"] },
        { q: "¿Estaba vacía Venezuela antes de Colón?", o: ["No, ya había pueblos", "Sí, estaba vacía", "Solo había palafitos", "Solo vivía un pueblo"] },
        { q: "¿Vivían todos los pueblos igual?", o: ["No, cada uno tenía sus costumbres", "Sí, todos igual", "Sí, con la misma lengua", "Sí, en el mismo lugar"] },
        { q: "¿Cuál es uno de los cuatro pueblos?", o: ["Wayús", "Vikingos", "Romanos", "Egipcios"] },
        { q: "¿Dónde vivían los Timotocuicas?", o: ["En las montañas de los Andes", "En La Guajira", "En un palafito", "En una isla"] },
        { q: "¿Dónde viven los Wayús?", o: ["En La Guajira", "En los Andes", "Sobre el agua", "En una isla"] },
        { q: "¿Cómo sabemos cómo vivían?", o: ["Por vasijas de barro y relatos", "Por la televisión", "Por fotos antiguas", "Por mensajes de texto"] },
      ],
      write: [
        "Escribe los cuatro pueblos de hoy.",
        "Explica qué es un palafito con tus palabras.",
      ],
      schematic: [
        "Dibuja un mapa y ubica los cuatro pueblos.",
        "Dibuja un palafito: casa, palos y agua.",
      ],
    },
    image: [
      "Dibuja la Laguna de Sinamaica con",
      "un palafito sobre el agua y palos.",
      "Al lado, dibuja montañas, costa y río.",
      "Rotula los cuatro pueblos y su lugar.",
    ],
    summary: "Venezuela ya tenía pueblos originarios: Timotocuicas, Caribes, Arawacos y Wayús.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "his-c3-w1-d2",
    units: [
      {
        h: "Punto 1: Repaso de la clase pasada",
        a: [
          "La clase pasada viste a los cuatro",
          "pueblos y su lugar. Desde Sinamaica",
          "hoy subes a los Andes y bajas a los ríos.",
        ],
      },
      {
        q: [
          "Un palafito se sostiene con palos.",
          "¿Cómo sostener la tierra en la montaña?",
        ],
        h: "Punto 2: Terrazas para sembrar",
        a: [
          "Los Timotocuicas vivían en los Andes.",
          "Hacían terrazas: escalones planos",
          "en la montaña, para sembrar maíz y papa.",
        ],
      },
      {
        q: [
          "En Sinamaica una casa necesita palos",
          "firmes. ¿Y una aldea, quién la guía?",
        ],
        h: "Punto 3: Un jefe llamado cacique",
        a: [
          "Cada comunidad tenía un jefe llamado",
          "cacique. Guiaba al pueblo y ayudaba",
          "a decidir. Eso se llama cacicazgo.",
        ],
      },
      {
        q: [
          "Los añú viven en palafitos. Si tu aldea",
          "no tiene algo, ¿cómo lo consigues?",
        ],
        h: "Punto 4: El trueque",
        a: [
          "Con el trueque se cambia una cosa",
          "por otra, sin dinero. Los pueblos",
          "cambiaban alimentos y tejidos.",
        ],
      },
      {
        q: [
          "En la Laguna de Sinamaica hay canoas.",
          "¿Cómo viajas por el agua sin puentes?",
        ],
        h: "Punto 5: Viajar en canoa",
        a: [
          "Caribes y Arawacos usaban canoas",
          "en ríos y costas. La canoa es una barca",
          "hecha de un tronco.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿quién sembraba",
          "yuca y quién pescaba en la costa?",
        ],
        h: "Punto 6: La yuca y la pesca",
        a: [
          "Los Arawacos sembraban yuca, una raíz",
          "que se come cocida. Los Caribes",
          "pescaban en la costa y en los ríos.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es una terraza?", o: ["Un escalón plano en la montaña", "Una canoa grande", "Un tejido", "Un idioma"] },
        { q: "¿Qué cultivaban los Timotocuicas?", o: ["Maíz y papa", "Solo pescado", "Solo cabras", "Solo yuca"] },
        { q: "¿Cómo se llamaba el jefe de una aldea?", o: ["Cacique", "Pescador", "Tejedor", "Navegante"] },
        { q: "¿Cómo se llama guiarse con un cacique?", o: ["Cacicazgo", "Trueque", "Terraza", "Cultivo"] },
        { q: "¿Qué es el trueque?", o: ["Cambiar una cosa por otra", "Comprar con dinero", "Tejer una hamaca", "Dibujar en piedra"] },
        { q: "¿Qué es una canoa?", o: ["Una barca hecha de un tronco", "Una hamaca tejida", "Un mapa antiguo", "Un jefe de aldea"] },
        { q: "¿Qué sembraban los Arawacos?", o: ["Yuca", "Trigo", "Uvas", "Arroz"] },
        { q: "¿Qué hacían los Caribes en la costa?", o: ["Pescaban", "Criaban cabras", "Hacían terrazas", "Tejían hamacas"] },
      ],
      write: [
        "Escribe qué cultivaban los Timotocuicas y dónde.",
        "Explica con tus palabras qué hacía un cacique.",
      ],
      schematic: [
        "Dibuja una montaña con terrazas y rotula qué se siembra.",
        "Dibuja una canoa en un río con yuca y peces.",
      ],
    },
    image: [
      "Dibuja una montaña con terrazas",
      "y rotula el maíz y la papa.",
      "Al lado, dibuja una canoa en un río",
      "con yuca y peces, y un palafito.",
    ],
    summary: "Los Timotocuicas hacían terrazas en los Andes y tenían caciques. Caribes y Arawacos usaban canoas.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "his-c3-w1-d3",
    units: [
      {
        h: "Punto 1: Repaso de la clase pasada",
        a: [
          "La clase pasada viste terrazas, caciques,",
          "trueque y canoas, como las de Sinamaica.",
          "Hoy conoces a los Wayús y lo ordenas todo.",
        ],
      },
      {
        q: [
          "Los añú viven con el agua de la laguna.",
          "¿Quién vive donde hay sol y poco agua?",
        ],
        h: "Punto 2: La Guajira",
        a: [
          "Ese lugar se llama La Guajira. Es seco,",
          "con mucho viento, junto al mar.",
          "Allí viven los Wayús y crían cabras.",
        ],
      },
      {
        q: [
          "Si no tienes cama, ¿cómo podrías dormir?",
          "Pista: es algo que se cuelga.",
        ],
        h: "Punto 3: El chinchorro",
        a: [
          "Los Wayús tejen chinchorros:",
          "hamacas hechas a mano para dormir.",
          "Tejer es entrelazar hilos y hacer tela.",
        ],
      },
      {
        q: [
          "¿Los Wayús aceptaron que otros mandaran",
          "en su tierra? ¿Y su cultura sigue hoy?",
        ],
        h: "Punto 4: Resistir y seguir vivos",
        a: [
          "Defendieron su territorio mucho tiempo.",
          "Eso es resistencia: no rendirse.",
          "Hoy siguen tejiendo y hablando su idioma.",
        ],
      },
      {
        q: [
          "Sin libros, ¿cómo guardaban sus saberes?",
          "¿Y cómo dejabas un mensaje para siempre?",
        ],
        h: "Punto 5: Hablar y grabar",
        a: [
          "Enseñaban hablando, con historias y",
          "canciones: es la tradición oral. Y grababan",
          "dibujos en rocas, los petroglifos.",
        ],
      },
      {
        q: [
          "Vas a contarlo en casa, con inicio,",
          "medio y final. ¿Con qué frase empiezas?",
        ],
        h: "Punto 6: Cómo contarlo con orden",
        a: [
          "Los primeros habitantes de Venezuela",
          "antes de la llegada de Colón fueron",
          "los Timotocuicas, Caribes,",
          "Arawacos y Wayús.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Dónde viven los Wayús?", o: ["En La Guajira", "En los Andes", "En un río", "Sobre la laguna"] },
        { q: "¿Cómo es La Guajira?", o: ["Seca y con mucho viento", "Fría y con nieve", "Llena de selva", "Siempre inundada"] },
        { q: "¿Qué es un chinchorro?", o: ["Una hamaca hecha a mano", "Una canoa", "Un tipo de mapa", "Un jefe"] },
        { q: "¿Qué hicieron los Wayús con su tierra?", o: ["La defendieron mucho tiempo", "La abandonaron", "Nunca se opusieron", "Se hicieron navegantes"] },
        { q: "¿Cómo enseñaban los abuelos sin libros?", o: ["Hablando, con historias y canciones", "Con computadoras", "Con cartas", "Con televisión"] },
        { q: "¿Qué son los petroglifos?", o: ["Dibujos grabados en rocas", "Barcos de madera", "Mapas de papel", "Telas tejidas"] },
        { q: "¿Qué partes tiene un relato?", o: ["Inicio, medio y final", "Solo nombres", "Solo dibujos", "Solo fechas"] },
        { q: "¿Quiénes vivían en los Andes?", o: ["Timotocuicas", "Wayús", "Caribes", "Arawacos"] },
      ],
      write: [
        "Escribe los cuatro pueblos y dónde vivían.",
        "Cuenta con tus palabras cómo vivían los Wayús.",
      ],
      schematic: [
        "Dibuja un mapa con los cuatro pueblos.",
        "Dibuja un esquema de inicio, medio y final.",
      ],
    },
    image: [
      "Dibuja un mapa con montañas, costa,",
      "ríos y desierto. Rotula cada pueblo.",
      "Añade un chinchorro y un palafito",
      "en Sinamaica. Revisa los cuatro pueblos.",
    ],
    summary: "Los Wayús viven en La Guajira y resisten. Timotocuicas, Caribes, Arawacos y Wayús vivían en lugares distintos.",
  },
];
