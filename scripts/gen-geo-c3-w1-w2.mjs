/**
 * Regenera geo ciclo 3 semanas 1–2 (10 celdas) según c3-memory-work-venezuela-geografia.md
 */
import fs from "node:fs";
import path from "node:path";

const mediaRoot = path.join("frontend", "public", "homescool", "media");

function mcq(id, originDay, prompt, answer, distractors) {
  const choices = [answer, ...distractors];
  return { id, originDay, type: "mcq", prompt, choices, answer };
}

function writeQs(id, originDay, prompt) {
  return { id, originDay, type: "write", prompt, answer: "" };
}

const week1 = {
  title: "Fronteras, límites y regiones de Venezuela",
  summary:
    "Esta semana ubicaste a Venezuela con sus fronteras, sus puntos extremos del mapa y sus seis regiones naturales.",
  points: [
    {
      heading: "Fronteras de Venezuela",
      intro:
        "Una frontera es la línea que separa un país de otro. Venezuela comparte frontera con tres países y con el mar. Al norte está el Mar Caribe; al sur, Brasil; al este, Guyana; y al oeste, Colombia.\n\nImagina que caminas hacia cada punto cardinal desde el centro del mapa: hacia arriba llegas al mar; hacia abajo, a la selva amazónica con Brasil; hacia la derecha, a Guyana; hacia la izquierda, a Colombia. Esas direcciones son la base del texto que memorizarás.\n\nPráctica: Dibuja un rectángulo que represente Venezuela. Escribe en cada lado el nombre del vecino o del mar. Repite en voz alta: norte–Caribe, sur–Brasil, este–Guyana, oeste–Colombia.\n\nError común: Confundir Guyana con Guayana. Guyana es el país vecino al este; Guayana es una región natural dentro de Venezuela.",
      deepen:
        "Hoy profundizamos las fronteras mirando el mapa como un viajero. El Mar Caribe al norte significa que Venezuela tiene costa y puertos hacia el atlántico tropical. Brasil al sur conecta con la cuenca amazónica. Guyana al este limita con la selva y las sabanas del Escudo Guayanés. Colombia al oeste une los Andes y los llanos compartidos.\n\nPregúntate: si un barco sale de La Guaira, ¿hacia qué frontera no puede ir caminando? Solo hacia el norte, porque el mar no es un país vecino terrestre. Si un camión sale de San Cristóbal, la primera frontera internacional hacia el oeste es Colombia.\n\nPráctica: En tu mapa, traza dos rutas imaginarias: una de Caracas hacia Colombia y otra de Ciudad Bolívar hacia Brasil. Nombra qué fronteras cruzarías si fueras en línea recta sobre el mapa.\n\nError común: Decir que Venezuela limita con Perú o con Ecuador. Los únicos vecinos terrestres son Colombia, Brasil y Guyana.",
    },
    {
      heading: "Puntos límites de Venezuela",
      intro:
        "Un punto límite es el lugar más extremo del país en una dirección. No es lo mismo que la frontera entera: es un punto concreto del mapa. Al norte está el Cabo San Román; al sur, el nacimiento del río Ararí; al este, la confluencia de los ríos Barima y Mururuma; al oeste, el nacimiento del río Intermedio.\n\nPiensa en los puntos límites como las “esquinas lejanas” de Venezuela. Ayudan a medir qué tan largo y ancho es el país y a situarlo en América del Sur.\n\nPráctica: Haz cuatro tarjetas: norte, sur, este y oeste. En el reverso escribe el nombre del punto límite. Mezcla las tarjetas y ordénalas de nuevo.\n\nError común: Nombrar una ciudad grande (como Caracas) como punto límite. Los puntos de la lista son lugares geográficos específicos del texto de memorización.",
      deepen:
        "Hoy exploramos los puntos límites como un cartógrafo. El Cabo San Román, en la península de Guajira, señala hasta dónde llega Venezuela al norte en tierra. El nacimiento del río Ararí marca el extremo sur en la frontera con Brasil. Al este, Barima y Mururuma se juntan en un río: esa confluencia es el límite con Guyana. Al oeste, el nacimiento del río Intermedio señala el extremo hacia Colombia.\n\nComparar puntos límites con fronteras: la frontera con Brasil es una línea larga; el nacimiento del Ararí es un lugar que representa el extremo sur en el estudio de esta semana.\n\nPráctica: Escribe una oración por cada punto límite que diga en qué dirección está y con qué vecino o mar se relaciona. Lee las cuatro oraciones en orden norte → sur → este → oeste.\n\nError común: Intercambiar este y oeste. Barima y Mururuma van al este; el río Intermedio, al oeste.",
    },
    {
      heading: "Regiones de Venezuela",
      intro:
        "Una región es una parte grande del país con relieve, clima y vida parecidos. Venezuela se estudia en seis regiones: Central, Oriental, Occidental, Los Andes, Los Llanos y Guayana.\n\nLa región Central incluye la zona de Caracas y valles cercanos. La Oriental mira hacia el Caribe y el oriente. La Occidental y Los Andes están hacia el oeste y la montaña. Los Llanos son las planicies del centro-sur. Guayana es el sur rocoso y selvático con tepuyes.\n\nPráctica: Escribe las seis regiones en una lista. Al lado de cada una, dibuja un icono simple (montaña, llano, ciudad, selva).\n\nError común: Usar solo el nombre de un estado como sinónimo de región. Un estado puede estar dentro de una región, pero la región es más amplia.",
      deepen:
        "Hoy vemos las regiones con los ojos de quien vive el clima. En Los Andes hace frío en las alturas; en Los Llanos, calor y lluvias estacionales; en Guayana, selva y mesetas antiguas; en la Central y Oriental, costa y ciudades; en la Occidental, lago y llanos andinos.\n\nMemorizar las seis regiones te ayuda después con estados, ríos y capitales: cuando escuches “Mérida”, pensarás en Los Andes; cuando escuches “Apure”, en Los Llanos.\n\nPráctica: Elige dos regiones distintas. Para cada una escribe qué clima imaginas, un animal o planta típica y un estado que creas que pertenece ahí. Comprueba en un mapa.\n\nError común: Olvidar Guayana o confundirla con Guyana el país. Guayana es región venezolana al sur; Guyana es el vecino al este.",
    },
  ],
  d1Quiz: [
    mcq("d1-q1", 1, "Al norte de Venezuela está:", "Mar Caribe", ["Brasil", "Perú", "Chile"]),
    mcq("d1-q2", 1, "Vecino al sur:", "Brasil", ["Colombia", "Guyana", "Ecuador"]),
    mcq("d1-q3", 1, "Vecino al este:", "Guyana", ["Brasil", "Colombia", "Surinam"]),
    mcq("d1-q4", 1, "Vecino al oeste:", "Colombia", ["Brasil", "Panamá", "Guyana"]),
    mcq("d1-q5", 1, "Punto límite al norte:", "Cabo San Román", ["Pico Bolívar", "Maracaibo", "Orinoco"]),
    mcq("d1-q6", 1, "Punto límite al sur:", "Nacimiento del río Ararí", ["Cabo San Román", "Caracas", "Barima"]),
    mcq("d1-q7", 1, "Una región de la lista:", "Los Llanos", ["Europa", "Antártida", "Escandinavia"]),
    mcq("d1-q8", 1, "Tema de la semana:", "fronteras, límites y regiones", ["solo capitales europeas", "solo ríos de Asia", "solo climas de África"]),
  ],
  d2Quiz: [
    mcq("d2-q1", 2, "Hoy profundizas:", "Fronteras de Venezuela", ["solo océano Pacífico", "solo Europa", "solo un estado"]),
    mcq("d2-q2", 2, "Si sales de La Guaira en barco, vas hacia:", "el Mar Caribe / norte", ["Brasil directo", "los Andes", "Guyana sin mar"]),
    mcq("d2-q3", 2, "La frontera terrestre al oeste es con:", "Colombia", ["Chile", "Argentina", "México"]),
    mcq("d2-q4", 2, "Guyana está al:", "este", ["norte", "oeste", "centro de Europa"]),
    mcq("d2-q5", 2, "Brasil está al:", "sur", ["norte", "este", "oeste"]),
    mcq("d2-q6", 2, "¿Cuántos vecinos terrestres tiene Venezuela en la lista?", "tres", ["uno", "cinco", "ninguno"]),
    mcq("d2-q7", 2, "El mar al norte se llama:", "Mar Caribe", ["Mar Muerto", "Mar Rojo", "Mar del Norte"]),
    mcq("d2-q8", 2, "Frontera significa:", "línea entre países", ["solo una ciudad", "solo un río interior", "solo una montaña"]),
  ],
  d3Quiz: [
    mcq("d3-q1", 3, "Punto límite al este:", "Confluencia Barima y Mururuma", ["Cabo San Román", "Intermedio", "Ararí"]),
    mcq("d3-q2", 3, "Punto límite al oeste:", "Nacimiento del río Intermedio", ["Barima", "Mururuma", "Orinoco"]),
    mcq("d3-q3", 3, "Hoy profundizas:", "Puntos límites", ["solo fronteras", "solo capitales", "solo islas griegas"]),
    mcq("d3-q4", 3, "El extremo sur en la lista es:", "nacimiento del río Ararí", ["La Guaira", "Margarita", "Coro"]),
    mcq("d3-q5", 3, "Cabo San Román está al:", "norte", ["sur", "este", "oeste"]),
    mcq("d3-q6", 3, "Un punto límite es:", "lugar extremo del país", ["cualquier ciudad", "solo la capital", "solo un puerto"]),
    mcq("d3-q7", 3, "Barima y Mururuma se relacionan con:", "este / Guyana", ["oeste / Colombia", "norte / mar", "sur / Chile"]),
    mcq("d3-q8", 3, "Orden correcto de estudio:", "norte, sur, este, oeste", ["solo alfabético de ciudades", "solo meses del año", "solo días de la semana"]),
  ],
  d4Quiz: [
    mcq("d4-q1", 4, "Región de tepuyes y selva sur:", "Guayana", ["Los Llanos", "Central", "Oriental"]),
    mcq("d4-q2", 4, "Región de planicies inundables:", "Los Llanos", ["Los Andes", "Guayana", "Antártida"]),
    mcq("d4-q3", 4, "Región andina:", "Los Andes", ["Los Llanos", "Oriental", "Mar Caribe"]),
    mcq("d4-q4", 4, "Hoy profundizas:", "Regiones de Venezuela", ["solo fronteras", "solo un río", "solo Europa"]),
    mcq("d4-q5", 4, "¿Cuántas regiones memorizas esta semana?", "seis", ["tres", "diez", "doce"]),
    mcq("d4-q6", 4, "Caracas suele asociarse a:", "Región Central", ["Guayana", "Los Llanos", "Europa"]),
    mcq("d4-q7", 4, "Región hacia el Caribe oriental:", "Oriental", ["Occidental", "Los Andes", "Antártida"]),
    mcq("d4-q8", 4, "Región del lago y occidente:", "Occidental", ["Oriental", "Central", "Asia"]),
  ],
};

const week2 = {
  title: "Estados y capitales de Venezuela (I)",
  summary:
    "Esta semana memorizaste cuatro pares estado–capital del centro y litoral: Distrito Capital, La Guaira, Miranda y Aragua.",
  points: [
    {
      heading: "Distrito Capital y La Guaira",
      intro:
        "Un estado es una división política de Venezuela; la capital es la sede de su gobierno. Esta semana memorizas cuatro pares. Empezamos por el Distrito Capital—Caracas y La Guaira—La Guaira.\n\nCaracas es la capital nacional y la capital del Distrito Capital. La Guaira es el estado costero cuya capital lleva el mismo nombre: La Guaira. Ambos están en la zona central-litoral, cerca del mar.\n\nPráctica: Escribe dos tarjetas: Distrito Capital → Caracas y La Guaira → La Guaira. Explica en una frase por qué Caracas es especial para todo el país.\n\nError común: Pensar que Maiquetía es la capital del estado La Guaira. La capital del estado es La Guaira.",
      deepen:
        "Hoy miramos el par Distrito Capital—Caracas y La Guaira—La Guaira desde el mapa político. Caracas concentra sedes nacionales; el Distrito Capital es una entidad pequeña pero muy poblada. El estado La Guaira es la franja litoral que conecta el puerto con la cordillera.\n\nCuando memorices, di siempre los dos nombres juntos, como una sola frase: «Distrito Capital, Caracas» y «La Guaira, La Guaira». Repetir en voz alta fija el ritmo del texto de memorización.\n\nPráctica: En un mapa, señala Caracas y La Guaira. Escribe tres diferencias: tamaño del estado, relación con el mar y función de cada capital.\n\nError común: Usar solo «Caracas» sin decir a qué estado pertenece cuando practicas el texto de memoria.",
    },
    {
      heading: "Miranda y Aragua",
      intro:
        "Miranda tiene como capital a Los Teques, en la cordillera cercana a Caracas. Aragua tiene como capital a Maracay, en el valle central hacia el lago de Valencia. Son estados vecinos de la Región Central.\n\nMaracay es una ciudad grande y conocida, pero no es la capital de Miranda: esa es Los Teques. Separar los pares evita mezclar nombres cuando recitas de memoria.\n\nPráctica: Completa: Miranda — ___ y Aragua — ___. Luego inventa una pista: «Teques suena a cerro» y «Maracay al valo central».\n\nError común: Decir Maracay cuando preguntan la capital de Miranda.",
      deepen:
        "Hoy exploramos Miranda y Aragua comparando su relieve. Los Teques está en altura, sobre el valle de Caracas; Maracay está en planicie y valle fértil, cerca del Henri Pittier y del lago de Valencia. Esa diferencia ayuda a recordar qué capital va con cada estado.\n\nJuega a «detective del mapa»: si te dicen «Los Teques», debes responder «Miranda»; si dicen «Maracay», «Aragua». Invierte el juego: estado primero, capital después.\n\nPráctica: Dibuja cuatro cajas con los cuatro pares de la semana. Colorea de azul los dos del litoral (DC y La Guaira) y de verde los dos del interior central (Miranda y Aragua).\n\nError común: Olvidar que Los Teques lleva artículo y mayúscula como nombre propio de la capital.",
    },
    {
      heading: "Memorizar y ubicar los cuatro pares",
      intro:
        "Memorizar es guardar en la memoria un texto exacto para recitarlo después. Los cuatro pares de esta semana son: Distrito Capital—Caracas; La Guaira—La Guaira; Miranda—Los Teques; Aragua—Maracay.\n\nUbícalos en la Región Central y litoral: todos están cerca del mar o del valle de Caracas. Agruparlos en una sola zona del mapa hace más fácil repasarlos que aprenderlos como lista suelta.\n\nPráctica: Recita los cuatro pares dos veces. La segunda vez cierra los ojos. Luego señala en el mapa cada capital.\n\nError común: Añadir estados que no están en el texto de esta semana. Solo son estos cuatro pares hasta que avancemos a la siguiente lista.",
      deepen:
        "Hoy repasamos los cuatro pares desde tres perspectivas: ritmo, mapa y significado. Ritmo: canta o marca compás en cada pareja estado–capital. Mapa: coloca chinchetas o marcas en Caracas, La Guaira, Los Teques y Maracay. Significado: recuerda que una capital es sede de gobierno, no siempre la ciudad más turística.\n\nPrepara una «expo de bolsillo»: en treinta segundos nombra los cuatro estados y sus capitales sin mirar. Si fallas uno, vuelve al mapa y repite solo ese par.\n\nPráctica: Escribe el texto de memorización completo de la semana. Subraya las capitales. Lee en voz alta tres veces.\n\nError común: Mezclar con pares de otras semanas (Zulia—Maracaibo aún no es tarea de esta semana).",
    },
  ],
  d1Quiz: [
    mcq("d1-q1", 1, "Capital del Distrito Capital:", "Caracas", ["Maracay", "Los Teques", "La Guaira"]),
    mcq("d1-q2", 1, "Capital de La Guaira:", "La Guaira", ["Caracas", "Maiquetía", "Valencia"]),
    mcq("d1-q3", 1, "Capital de Miranda:", "Los Teques", ["Maracay", "Barcelona", "Caracas"]),
    mcq("d1-q4", 1, "Capital de Aragua:", "Maracay", ["Los Teques", "Coro", "Barquisimeto"]),
    mcq("d1-q5", 1, "¿Cuántos pares memorizas esta semana?", "cuatro", ["veinticuatro", "dos", "doce"]),
    mcq("d1-q6", 1, "Caracas es capital nacional y del:", "Distrito Capital", ["Zulia", "Bolívar", "Amazonas"]),
    mcq("d1-q7", 1, "Maracay pertenece a:", "Aragua", ["Miranda", "La Guaira", "Táchira"]),
    mcq("d1-q8", 1, "Tema de la semana:", "cuatro estados y capitales (I)", ["fronteras de Europa", "ríos de África", "sierras de Asia"]),
  ],
  d2Quiz: [
    mcq("d2-q1", 2, "Hoy profundizas:", "Distrito Capital y La Guaira", ["solo Amazonas", "solo Europa", "solo ríos"]),
    mcq("d2-q2", 2, "Par correcto:", "Distrito Capital — Caracas", ["Distrito Capital — Maracay", "Miranda — Caracas", "Aragua — Caracas"]),
    mcq("d2-q3", 2, "La Guaira —", "La Guaira", ["Caracas", "Los Teques", "Valencia"]),
    mcq("d2-q4", 2, "Caracas es capital:", "nacional y del DC", ["solo de Zulia", "solo de Guyana", "de todos los estados"]),
    mcq("d2-q5", 2, "El estado La Guaira está:", "en la costa", ["en los Andes", "en la Antártida", "en Europa"]),
    mcq("d2-q6", 2, "Memorizar significa:", "recitar el texto de memoria", ["solo dibujar", "solo adivinar", "ignorar el mapa"]),
    mcq("d2-q7", 2, "¿Maiquetía es la capital del estado La Guaira?", "No (es La Guaira)", ["Sí", "Sí, y del DC", "Sí, de Miranda"]),
    mcq("d2-q8", 2, "Zona de estudio:", "Central y litoral", ["solo Guayana", "solo Amazonas", "solo Europa"]),
  ],
  d3Quiz: [
    mcq("d3-q1", 3, "Capital de Miranda:", "Los Teques", ["Maracay", "Caracas", "La Guaira"]),
    mcq("d3-q2", 3, "Capital de Aragua:", "Maracay", ["Los Teques", "San Felipe", "Coro"]),
    mcq("d3-q3", 3, "Hoy profundizas:", "Miranda y Aragua", ["solo fronteras", "solo Guyana", "solo océanos"]),
    mcq("d3-q4", 3, "Maracay no es capital de:", "Miranda", ["Aragua", "ningún estado", "La Guaira"]),
    mcq("d3-q5", 3, "Los Teques suele asociarse a:", "relieve alto / Miranda", ["litoral", "Guyana país", "Europa"]),
    mcq("d3-q6", 3, "Maracay está en:", "Aragua", ["Miranda", "La Guaira", "Bolívar"]),
    mcq("d3-q7", 3, "Pista: «Teques» ayuda a recordar:", "Miranda", ["Zulia", "Apure", "Sucre"]),
    mcq("d3-q8", 3, "Pista: «Maracay» ayuda a recordar:", "Aragua", ["Miranda", "DC", "Amazonas"]),
  ],
  d4Quiz: [
    mcq("d4-q1", 4, "Texto completo incluye:", "DC, La Guaira, Miranda, Aragua", ["solo Zulia", "solo Brasil", "solo Chile"]),
    mcq("d4-q2", 4, "Hoy profundizas:", "memorizar y ubicar los cuatro pares", ["solo fronteras", "solo regiones", "solo Europa"]),
    mcq("d4-q3", 4, "Orden de práctica útil:", "mapa + recitación", ["solo gritar", "solo borrar", "sin repetir"]),
    mcq("d4-q4", 4, "Zulia — Maracaibo es de:", "otra semana", ["esta semana", "siempre igual", "no existe"]),
    mcq("d4-q5", 4, "Cuatro capitales de la semana:", "Caracas, La Guaira, Los Teques, Maracay", ["solo Caracas", "solo Europa", "ninguna"]),
    mcq("d4-q6", 4, "Capital es:", "sede del gobierno del estado", ["cualquier playa", "cualquier montaña", "un continente"]),
    mcq("d4-q7", 4, "Agrupar en Región Central ayuda a:", "ubicar y recordar", ["olvidar", "mezclar países", "saltar el mapa"]),
    mcq("d4-q8", 4, "Repaso en voz alta sirve para:", "fijar el ritmo del texto", ["evitar el mapa", "no practicar", "cambiar los nombres"]),
  ],
};

function buildDay1(w) {
  return {
    format: "eoschool",
    version: 1,
    cycle: 3,
    week: w.week,
    day: 1,
    level: 6,
    subject: "geo",
    locale: "es",
    title: w.data.title,
    lesson: {
      kind: "intro",
      focusPoint: null,
      points: w.data.points.map((p, i) => ({
        id: `p${i + 1}`,
        heading: p.heading,
        body: p.intro,
      })),
      summary: w.data.summary,
    },
    quiz: { questionCount: 8, questions: w.data.d1Quiz },
    media: [],
  };
}

function buildDeepen(w, day, focusPoint) {
  const p = w.data.points[focusPoint - 1];
  const questions = [];
  for (let d = 1; d < day; d++) {
    const key = `d${d}Quiz`;
    questions.push(...w.data[key]);
  }
  questions.push(...w.data[`d${day}Quiz`]);
  const summary = day === 4 ? w.data.summary : "";
  return {
    format: "eoschool",
    version: 1,
    cycle: 3,
    week: w.week,
    day,
    level: 6,
    subject: "geo",
    locale: "es",
    title: w.data.title,
    lesson: {
      kind: "deepen",
      focusPoint,
      points: [{ id: "p1", heading: p.heading, body: p.deepen }],
      summary,
    },
    quiz: { questionCount: 8 * day, questions },
    media: [],
  };
}

function buildDay4(w) {
  const doc = buildDeepen(w, 4, 3);
  const memPrompt =
    w.week === 1
      ? "Escribe de memoria las fronteras y los cuatro puntos límites de Venezuela."
      : "Escribe de memoria los cuatro pares estado–capital de esta semana.";
  doc.quiz.questions.push(
    writeQs("d4-w1", 4, memPrompt),
    writeQs("d4-w2", 4, "Explica con tus palabras el punto que profundizaste hoy en geografía."),
    writeQs("d4-w3", 4, "Da un ejemplo propio en el mapa relacionado con la lección."),
    writeQs("d4-w4", 4, "¿Qué duda te queda? ¿Cómo la resolverías con un mapa?"),
  );
  doc.quiz.questionCount = 36;
  return doc;
}

function buildDay5(w) {
  const data = w.data;
  const overview = (heading, bodyChunk) =>
    `En este bloque conectamos ${heading.toLowerCase()} con un ejemplo concreto.\n\n${bodyChunk}\n\nLee el ejemplo otra vez y explícalo con tus palabras antes de la tarea.\n\nPráctica: Escribe dos oraciones completas que nombren la idea y den su ejemplo.\n\nError común: No repitas solo el título sin explicar qué significa.`;

  const points = [
    {
      id: "p1",
      heading: "Panorama de la semana",
      body: overview(
        "panorama de la semana",
        `${data.summary}\n\n${data.points[0].intro.split("\n\n")[0]}`,
      ),
    },
    {
      id: "p2",
      heading: `Panorama: ${data.points[0].heading}`,
      body: overview(`panorama: ${data.points[0].heading}`, data.points[0].intro),
    },
    {
      id: "p3",
      heading: `Panorama: ${data.points[1].heading}`,
      body: overview(`panorama: ${data.points[1].heading}`, data.points[1].intro),
    },
    {
      id: "p4",
      heading: `Panorama: ${data.points[2].heading}`,
      body: overview(`panorama: ${data.points[2].heading}`, data.points[2].intro),
    },
    {
      id: "p5",
      heading: "Síntesis y texto de memorización",
      body: overview(
        "síntesis",
        `Repasa en voz alta todo el texto de memorización de la semana. ${data.summary}`,
      ),
    },
  ];

  const day4 = buildDay4(w);
  const questions = [...day4.quiz.questions];
  const extraMcq = w.week === 1
    ? [
        mcq("d5-q1", 5, "Repaso: región de los llanos", "Los Llanos", ["Guayana", "Europa", "Central"]),
        mcq("d5-q2", 5, "Repaso: región occidental", "Occidental", ["Oriental", "Asia", "Antártida"]),
        mcq("d5-q3", 5, "Repaso: tres vecinos terrestres", "Colombia, Brasil y Guyana", ["solo Chile", "solo España", "ninguno"]),
        mcq("d5-q4", 5, "Repaso: mar al norte", "Mar Caribe", ["Pacífico", "Muerto", "Rojo"]),
        mcq("d5-q5", 5, "Repaso: seis regiones", "sí, las seis de la lista", ["solo dos", "solo una", "ninguna"]),
        mcq("d5-q6", 5, "Repaso: punto sur", "nacimiento del río Ararí", ["Cabo San Román", "Caracas", "Orinoco"]),
        mcq("d5-q7", 5, "Repaso: punto este", "Barima y Mururuma", ["Intermedio", "Ararí", "Naiguatá"]),
        mcq("d5-q8", 5, "Repaso: punto oeste", "nacimiento del río Intermedio", ["Barima", "Mururuma", "Caribe"]),
        mcq("d5-q9", 5, "Tema semana 1", data.d1Quiz[7].answer, ["solo capitales europeas", "solo Asia", "solo África"]),
        mcq("d5-q10", 5, "Región Central en la lista", "sí", ["no existe", "es un país", "es un océano"]),
        mcq("d5-q11", 5, "Los Andes en la lista", "sí", ["no", "es Guyana país", "es Europa"]),
        mcq("d5-q12", 5, "Guayana en la lista", "sí", ["no", "es solo Brasil", "es solo mar"]),
      ]
    : [
        mcq("d5-q1", 5, "Repaso: Miranda —", "Los Teques", ["Maracay", "Caracas", "Coro"]),
        mcq("d5-q2", 5, "Repaso: Aragua —", "Maracay", ["Los Teques", "Valencia", "Barquisimeto"]),
        mcq("d5-q3", 5, "Repaso: DC —", "Caracas", ["La Guaira", "Maracay", "Maturín"]),
        mcq("d5-q4", 5, "Repaso: La Guaira —", "La Guaira", ["Caracas", "Maiquetía", "Coro"]),
        mcq("d5-q5", 5, "¿Cuántos pares en la semana?", "cuatro", ["veinticuatro", "uno", "cero"]),
        mcq("d5-q6", 5, "Zulia — Maracaibo", "otra semana", ["esta semana", "siempre hoy", "no existe"]),
        mcq("d5-q7", 5, "Capital nacional", "Caracas", ["Maracay", "Los Teques", "Coro"]),
        mcq("d5-q8", 5, "Zona de estudio", "Central y litoral", ["solo Guayana", "solo Europa", "solo Asia"]),
        mcq("d5-q9", 5, "Tema semana 2", data.d1Quiz[7].answer, ["fronteras de Europa", "ríos de África", "solo Asia"]),
        mcq("d5-q10", 5, "Memorizar es", "recitar el texto de memoria", ["solo borrar", "solo adivinar", "no usar mapa"]),
        mcq("d5-q11", 5, "Maracay es capital de", "Aragua", ["Miranda", "DC", "Zulia"]),
        mcq("d5-q12", 5, "Los Teques es capital de", "Miranda", ["Aragua", "La Guaira", "Bolívar"]),
      ];
  questions.push(...extraMcq);
  questions.push(
    writeQs("d5-w1", 5, "Recita o escribe de memoria el texto completo de memorización de la semana."),
    writeQs("d5-w2", 5, "Dibuja o describe en el mapa lo aprendido esta semana."),
    writeQs("d5-w3", 5, "Cuenta a alguien tres ideas nuevas de geografía de Venezuela."),
    writeQs("d5-w4", 5, "Prepara una mini exposición de un minuto sobre el tema de la semana."),
  );
  if (questions.length !== 52) {
    throw new Error(`week ${w.week} day 5 expected 52 questions, got ${questions.length}`);
  }
  return {
    format: "eoschool",
    version: 1,
    cycle: 3,
    week: w.week,
    day: 5,
    level: 6,
    subject: "geo",
    locale: "es",
    title: data.title,
    lesson: { kind: "review", focusPoint: null, points, summary: "" },
    quiz: { questionCount: 52, questions },
    media: [],
  };
}

function writeWeek(weekNum, data) {
  const w = { week: weekNum, data };
  const dir = path.join(mediaRoot, `week${weekNum}`);
  const files = {
    1: buildDay1(w),
    2: buildDeepen(w, 2, 1),
    3: buildDeepen(w, 3, 2),
    4: buildDay4(w),
    5: buildDay5(w),
  };
  for (const [day, doc] of Object.entries(files)) {
    const name = `geo-c3-w${weekNum}-d${day}-l6.eoschool.json`;
    fs.writeFileSync(path.join(dir, name), `${JSON.stringify(doc, null, 2)}\n`);
    console.log(`wrote ${name} questions=${doc.quiz.questionCount}`);
  }
}

writeWeek(1, week1);
writeWeek(2, week2);
