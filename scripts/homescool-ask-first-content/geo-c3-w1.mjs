/**
 * Geografía · ciclo 3 · semana 1 · nivel 6 — narrativa inductiva, todo "pregunta primero".
 * Tema de la semana: Venezuela — fronteras, puntos extremos y regiones.
 *
 * unit = { q: [líneas de pregunta] (omitir si la pregunta es la apertura),
 *          h: "Punto N: título", a: [líneas de respuesta], w?: líneas de espacio, c?: líneas para copiar }
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "geo-c3-w1-d1",
    opening: "¿Qué crees que rodea a Venezuela por todos sus lados?",
    repaso: null,
    units: [
      {
        h: "Punto 1: Una frontera separa países",
        a: [
          "Una frontera es la línea que separa un país de otro.",
          "Venezuela está rodeada por un mar y tres países vecinos.",
          "El mar queda arriba, en el norte del mapa.",
          "Vamos a descubrir lado por lado quién es cada vecino.",
        ],
      },
      {
        q: [
          "Sigamos. En un mapa, el norte va arriba y el sur abajo.",
          "Si el mar queda arriba, ¿dónde crees que queda Brasil?",
        ],
        h: "Punto 2: Norte, sur, este y oeste",
        a: [
          "Con el norte arriba, el sur queda abajo y el este a la derecha.",
          "Fronteras: Mar Caribe norte, Brasil sur,",
          "Guyana este, Colombia oeste.",
          "Así que Brasil queda abajo, hacia el sur.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿«Guyana» y «Guayana» son lo mismo?",
          "Fíjate bien en cómo se escriben.",
        ],
        h: "Punto 3: Guyana y Guayana",
        a: [
          "No son lo mismo, aunque suenan casi igual.",
          "Guyana, con «y», es un país vecino, al este.",
          "Guayana, con «ua», es una región de Venezuela.",
          "Una queda del otro lado de la frontera; la otra, adentro.",
        ],
      },
      {
        q: [
          "Imagina que caminas hasta el borde más lejano del país.",
          "¿Cómo llamarías a ese lugar?",
        ],
        h: "Punto 4: Los puntos extremos",
        a: [
          "Se llama punto extremo: el lugar más lejano en una dirección.",
          "Sirve para imaginar el marco de Venezuela.",
          "Hay uno al norte, uno al sur, uno al este y uno al oeste.",
          "Un punto extremo es un solo lugar, no toda la frontera.",
        ],
      },
      {
        q: [
          "¿Y adentro del país? ¿Crees que Venezuela es igual",
          "por todas partes? Piensa en montañas, llanuras y selvas.",
        ],
        h: "Punto 5: Las regiones",
        a: [
          "Una región es una parte grande del país con rasgos parecidos.",
          "Regiones: Central, Oriental, Occidental, Andes, Llanos, Guayana.",
          "Los Andes tienen montañas, los Llanos planicies y Guayana selvas.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué queda al norte de Venezuela?", o: ["El mar Caribe", "Brasil", "Guyana", "Colombia"] },
        { q: "¿Qué país queda al sur de Venezuela?", o: ["Brasil", "Guyana", "Perú", "Chile"] },
        { q: "¿Qué país queda al este de Venezuela?", o: ["Guyana", "Brasil", "Perú", "Chile"] },
        { q: "¿Qué país queda al oeste de Venezuela?", o: ["Colombia", "Guyana", "Perú", "Chile"] },
        { q: "En un mapa común, ¿hacia dónde queda el norte?", o: ["Arriba", "Abajo", "A la derecha", "A la izquierda"] },
        { q: "¿Qué es una frontera?", o: ["La línea que separa un país de otro", "Una montaña muy alta", "Un río muy largo", "Una región del país"] },
        { q: "¿Qué es un punto extremo?", o: ["El lugar más lejano en una dirección", "Toda la frontera de un país", "Una ciudad muy grande", "Un tipo de mapa"] },
        { q: "¿Cuál es el nombre de una región de Venezuela?", o: ["Guayana", "Guyana", "Brasil", "Colombia"] },
      ],
      write: [
        "Explica con tus palabras qué es una frontera.",
        "Escribe la diferencia entre Guyana y Guayana.",
      ],
      schematic: [
        "Dibuja el contorno de Venezuela y rotula sus cuatro lados.",
        "Dibuja un esquema de las seis regiones con un símbolo cada una.",
      ],
    },
    image: [
      "Dibuja el contorno de Venezuela en el recuadro.",
      "Escribe en cada lado: Caribe, Brasil, Guyana o Colombia.",
      "Dibuja una flecha hacia arriba y rotula la palabra norte.",
      "Revisa que cada vecino esté del lado correcto.",
    ],
    summary: "Venezuela tiene al mar Caribe al norte, a Brasil al sur, a Guyana al este y a Colombia al oeste.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "geo-c3-w1-d2",
    opening: ayer,
    repaso: [
      "Ayer vimos que una frontera separa un país de otro.",
      "Venezuela tiene cuatro lados, cada uno con su vecino.",
      "Y no se mezclan Guyana, el país, y Guayana, la región.",
    ],
    units: [
      {
        q: [
          "Cierra los ojos y mira el mapa. ¿Qué vecino está arriba?",
          "¿Y cuál está abajo?",
        ],
        h: "Punto 1: Arriba y abajo",
        a: [
          "Arriba, al norte, está el mar Caribe.",
          "Abajo, al sur, está Brasil.",
          "El mar también es un límite: allí termina la tierra",
          "y empieza el agua.",
        ],
      },
      {
        q: [
          "Ahora los lados. ¿Qué vecino queda a la derecha del mapa",
          "y cuál a la izquierda?",
        ],
        h: "Punto 2: Derecha e izquierda",
        a: [
          "A la derecha, al este, está Guyana.",
          "A la izquierda, al oeste, está Colombia.",
          "Un truco: el sol sale por el este.",
          "Y se esconde por el oeste.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿el mar Caribe es un país vecino?",
        ],
        h: "Punto 3: Vecinos de tierra y de agua",
        a: [
          "No: el mar Caribe es agua, no es un país.",
          "Brasil, Guyana y Colombia son vecinos de tierra.",
          "Con ellos Venezuela comparte una frontera en tierra firme.",
          "El mar Caribe es el vecino de agua, al norte.",
        ],
      },
      {
        q: [
          "Imagina que cruzas la frontera del oeste.",
          "¿A qué país llegas? ¿Y si cruzas la del este?",
        ],
        h: "Punto 4: Cruzar la frontera",
        a: [
          "Por el oeste llegas a Colombia.",
          "Por el este llegas a Guyana.",
          "Por el sur llegas a Brasil.",
          "Y por el norte no cruzas: te encuentras con el mar.",
        ],
      },
      {
        q: [
          "Un reto: di cada lado con su vecino, sin mirar el mapa.",
          "¿En qué orden te conviene decirlos?",
        ],
        h: "Punto 5: Dilo con orden",
        a: [
          "Fronteras: Mar Caribe norte, Brasil sur,",
          "Guyana este, Colombia oeste.",
          "Dilos siempre en el mismo orden: norte, sur, este, oeste.",
          "Así no mezclas un vecino con otro.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué vecino queda a la derecha del mapa, al este?", o: ["Guyana", "Colombia", "Brasil", "Perú"] },
        { q: "¿Qué vecino queda a la izquierda del mapa, al oeste?", o: ["Colombia", "Guyana", "Brasil", "Chile"] },
        { q: "¿Qué vecino queda abajo en el mapa, al sur?", o: ["Brasil", "Guyana", "Perú", "Chile"] },
        { q: "¿Por qué el mar Caribe no es un país vecino?", o: ["Porque es agua, no un país", "Porque está muy lejos", "Porque es muy pequeño", "Porque está al sur"] },
        { q: "Según el truco de hoy, ¿por dónde sale el sol?", o: ["Por el este", "Por el oeste", "Por el norte", "Por el sur"] },
        { q: "¿Cuál de estos es un vecino de tierra?", o: ["Brasil", "El mar Caribe", "Un río", "Una isla"] },
        { q: "En un mapa común, ¿hacia dónde queda el sur?", o: ["Hacia abajo", "Hacia arriba", "Hacia la derecha", "Hacia la izquierda"] },
        { q: "¿En qué orden dijimos los cuatro lados?", o: ["Norte, sur, este, oeste", "Oeste, este, sur, norte", "Sur, norte, oeste, este", "Este, oeste, norte, sur"] },
      ],
      write: [
        "Cuenta a alguien los cuatro vecinos de Venezuela en orden.",
        "Explica por qué el mar Caribe no es un país.",
      ],
      schematic: [
        "Dibuja una cruz con norte, sur, este y oeste y cada vecino.",
        "Dibuja a Venezuela con una flecha hacia cada vecino.",
      ],
    },
    image: [
      "Dibuja a Venezuela en el centro del recuadro.",
      "Pon una flecha hacia cada lado: norte, sur, este y oeste.",
      "Escribe en la punta de cada flecha el nombre del vecino.",
      "Colorea el mar Caribe de azul y los países de otro color.",
    ],
    summary: "Cada lado de Venezuela tiene su vecino: el mar Caribe al norte, Brasil al sur, Guyana al este y Colombia al oeste.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "geo-c3-w1-d3",
    opening: ayer,
    repaso: [
      "Ayer repasamos los cuatro vecinos de Venezuela.",
      "Norte, sur, este y oeste: cada lado tiene el suyo.",
      "El mar Caribe es agua; los otros tres son países.",
    ],
    units: [
      {
        q: [
          "Imagina que caminas hasta el punto más al norte del país.",
          "¿Cómo crees que se llama ese lugar?",
        ],
        h: "Punto 1: El extremo norte",
        a: [
          "Se llama Cabo San Román.",
          "Es una punta de la península de Paraguaná, junto al mar.",
          "En tierra firme, es el lugar más al norte de Venezuela.",
          "Desde allí solo tendrías el mar Caribe frente a ti.",
        ],
      },
      {
        q: [
          "Ahora viajas hacia el sur, casi hasta tocar Brasil.",
          "¿Qué crees que marca ese extremo?",
        ],
        h: "Punto 2: El extremo sur",
        a: [
          "Es el nacimiento del río Ararí.",
          "El nacimiento de un río es el lugar donde empieza.",
          "Queda en el sur del país, cerca de la frontera con Brasil.",
          "Allí termina Venezuela por el sur.",
        ],
      },
      {
        q: [
          "Sigamos hacia el este, cerca de Guyana. Allí se juntan",
          "dos ríos. ¿Cómo se llama un lugar donde se juntan ríos?",
        ],
        h: "Punto 3: El extremo este",
        a: [
          "Un lugar donde se juntan dos ríos se llama confluencia.",
          "El extremo este es la confluencia de Barima y Mururuma.",
          "Barima y Mururuma son los dos ríos que se encuentran.",
        ],
      },
      {
        q: [
          "Y ahora hacia el oeste, cerca de Colombia. ¿Qué crees",
          "que marca ese extremo? Recuerda el extremo sur.",
        ],
        h: "Punto 4: El extremo oeste",
        a: [
          "Otra vez es un nacimiento: el del río Intermedio.",
          "Queda en el oeste, cerca de la frontera con Colombia.",
          "Así Venezuela queda enmarcada por cuatro puntos.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿un punto extremo es toda",
          "la frontera de Venezuela con ese lado?",
        ],
        h: "Punto 5: Un punto no es una frontera",
        a: [
          "No: un punto extremo es un solo lugar.",
          "La frontera es toda la línea que separa a dos países.",
          "Los cuatro puntos son como las esquinas de un marco.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuál es el punto extremo norte?", o: ["Cabo San Román", "Río Ararí", "Río Intermedio", "Caracas"] },
        { q: "¿Cuál es el punto extremo sur?", o: ["El nacimiento del río Ararí", "Cabo San Román", "Barima y Mururuma", "El mar Caribe"] },
        { q: "¿Cuál es el punto extremo este?", o: ["La confluencia de Barima y Mururuma", "Cabo San Román", "El río Ararí", "El río Intermedio"] },
        { q: "¿Cuál es el punto extremo oeste?", o: ["El nacimiento del río Intermedio", "Cabo San Román", "El río Ararí", "El mar Caribe"] },
        { q: "¿Qué significa confluencia?", o: ["El lugar donde se juntan dos ríos", "Una montaña alta", "Una ciudad grande", "Una frontera con el mar"] },
        { q: "¿Qué es el nacimiento de un río?", o: ["El lugar donde empieza", "El lugar donde termina", "Un puente", "Una isla"] },
        { q: "¿De qué península es una punta Cabo San Román?", o: ["Paraguaná", "Paria", "Yucatán", "Florida"] },
        { q: "¿Un punto extremo es toda la frontera?", o: ["No, es un solo lugar", "Sí, es toda la línea", "Sí, es un país", "No, es una ciudad"] },
      ],
      write: [
        "Explica con tus palabras qué es un punto extremo.",
        "Escribe los cuatro puntos extremos y su dirección.",
      ],
      schematic: [
        "Dibuja a Venezuela con un punto en cada extremo.",
        "Dibuja dos ríos que se juntan y rotula la confluencia.",
      ],
    },
    image: [
      "Dibuja el contorno de Venezuela en el recuadro.",
      "Marca cuatro puntos: uno arriba, uno abajo, uno a cada lado.",
      "Escribe junto a cada punto su nombre de hoy.",
      "Une los cuatro puntos y mira el marco del país.",
    ],
    summary: "Los cuatro puntos extremos marcan el marco de Venezuela, pero cada uno es un solo lugar, no toda la frontera.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "geo-c3-w1-d4",
    opening: ayer,
    repaso: [
      "Ayer ubicamos los cuatro puntos extremos de Venezuela.",
      "Al norte, Cabo San Román; al sur, el río Ararí.",
      "Al este, Barima y Mururuma; al oeste, el río Intermedio.",
    ],
    units: [
      {
        q: [
          "¿Recuerdas cuántas regiones estudiamos de Venezuela",
          "y cómo se llaman?",
        ],
        h: "Punto 1: Las seis regiones",
        a: [
          "Regiones: Central, Oriental, Occidental, Andes, Llanos, Guayana.",
          "Cada región agrupa varios estados con rasgos parecidos.",
          "Un estado es una parte política del país;",
          "una región es una parte más grande.",
        ],
      },
      {
        q: [
          "Piensa en montañas muy altas, con aire fresco.",
          "¿Cuál de las seis regiones crees que las tiene?",
        ],
        h: "Punto 2: Los Andes, las montañas",
        a: [
          "Los Andes son la región de las montañas.",
          "Allí está el Pico Bolívar, la montaña más alta de Venezuela.",
          "En las alturas el aire es más fresco que en la costa.",
        ],
      },
      {
        q: [
          "Ahora piensa en un terreno casi plano, con ríos y pasto.",
          "¿Qué región será?",
        ],
        h: "Punto 3: Los Llanos, las planicies",
        a: [
          "Son los Llanos, grandes planicies.",
          "Una planicie es un terreno casi plano.",
          "Por los Llanos corren muchos ríos.",
        ],
      },
      {
        q: [
          "Y si te hablo de selvas y de montañas con la cima plana,",
          "llamadas tepuyes, ¿qué región es? Cuidado con el nombre.",
        ],
        h: "Punto 4: Guayana, selvas y tepuyes",
        a: [
          "Es Guayana, con «ua», la región de Venezuela.",
          "Allí hay selvas y tepuyes, montañas de cima plana.",
          "Guyana, con «y», es el país vecino del este.",
        ],
      },
      {
        q: [
          "Quieres dibujar un croquis para ubicar las otras tres",
          "regiones. ¿Desde dónde empezarías?",
        ],
        h: "Punto 5: Un croquis de las regiones",
        a: [
          "Un croquis es un dibujo sencillo, hecho a mano, de un lugar.",
          "Empieza con un punto de referencia, como Caracas.",
          "La región Central queda cerca de Caracas.",
          "Oriental va hacia el este y Occidental hacia el oeste.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuántas regiones estudiamos en Venezuela?", o: ["Seis", "Dos", "Tres", "Nueve"] },
        { q: "¿Qué región es la de las montañas?", o: ["Los Andes", "Los Llanos", "Guayana", "Central"] },
        { q: "¿Cuál es la montaña más alta de Venezuela?", o: ["Pico Bolívar", "Cabo San Román", "Río Ararí", "Caracas"] },
        { q: "¿Qué región tiene grandes planicies?", o: ["Los Llanos", "Los Andes", "Guayana", "Oriental"] },
        { q: "¿Qué región tiene selvas y tepuyes?", o: ["Guayana", "Los Andes", "Central", "Occidental"] },
        { q: "¿Qué es un tepuy?", o: ["Una montaña de cima plana", "Un río", "Una isla", "Una planicie"] },
        { q: "¿Qué es un croquis?", o: ["Un dibujo sencillo de un lugar", "Un río muy largo", "Una región", "Una montaña"] },
        { q: "¿Qué región queda cerca de Caracas?", o: ["Central", "Guayana", "Los Llanos", "Los Andes"] },
      ],
      write: [
        "Explica la diferencia entre Guyana y Guayana.",
        "Escribe las seis regiones con una palabra para cada una.",
      ],
      schematic: [
        "Dibuja un croquis de Venezuela dividido en seis regiones.",
        "Dibuja un símbolo para Los Andes, Los Llanos y Guayana.",
      ],
    },
    image: [
      "Dibuja un croquis sencillo de Venezuela.",
      "Marca a Caracas como tu punto de referencia.",
      "Dibuja un símbolo: una montaña, una llanura y una selva.",
      "Rotula Los Andes, Los Llanos y Guayana.",
    ],
    summary: "Los Andes tienen montañas, los Llanos planicies y Guayana selvas con tepuyes. Un croquis ayuda a ubicarlos.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "geo-c3-w1-d5",
    opening: ayer,
    repaso: [
      "Esta semana ubicaste a Venezuela en el mapa.",
      "Viste sus cuatro vecinos y sus cuatro puntos extremos.",
      "También conociste sus seis regiones.",
    ],
    units: [
      {
        q: [
          "Sin mirar nada, ¿cuáles son los cuatro vecinos de Venezuela?",
          "Dilos en orden.",
        ],
        w: 3,
        h: "Punto 1: Los cuatro vecinos",
        a: [
          "Fronteras: Mar Caribe norte, Brasil sur,",
          "Guyana este, Colombia oeste.",
          "Si olvidaste alguno, míralo en el mapa y dilo otra vez.",
        ],
      },
      {
        q: [
          "¿Y los cuatro puntos extremos? Empieza por el norte.",
        ],
        h: "Punto 2: Los puntos extremos",
        a: [
          "Norte: Cabo San Román.",
          "Sur: el nacimiento del río Ararí.",
          "Este: la confluencia de Barima y Mururuma.",
          "Oeste: el nacimiento del río Intermedio.",
        ],
      },
      {
        q: [
          "Ahora las regiones. ¿Cuál tiene montañas, cuál planicies",
          "y cuál selvas con tepuyes?",
        ],
        h: "Punto 3: Las seis regiones",
        a: [
          "Regiones: Central, Oriental, Occidental, Andes, Llanos, Guayana.",
          "Los Andes tienen montañas y los Llanos, planicies.",
          "Guayana tiene selvas y tepuyes.",
        ],
      },
      {
        q: [
          "Vas a contarle a tu familia dónde queda Venezuela.",
          "¿Cómo empezarías tu exposición?",
        ],
        h: "Punto 4: Cómo contarlo con orden",
        a: [
          "Una buena exposición tiene inicio, medio y cierre.",
          "Inicio: «Venezuela está rodeada por un mar y tres países».",
          "Medio: los vecinos, los extremos y las regiones.",
          "Cierre: repite lo más importante y di «gracias».",
        ],
      },
      {
        q: [
          "¿Qué te ayuda más: aprender los nombres de memoria",
          "o ponerlos sobre un mapa?",
        ],
        h: "Punto 5: Ubicar con el mapa",
        a: [
          "Las dos cosas ayudan, pero el mapa muestra cada lugar.",
          "Dibuja el contorno, pon la flecha del norte y rotula.",
          "No mezcles Guyana, el país, con Guayana, la región.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué queda al norte de Venezuela?", o: ["El mar Caribe", "Brasil", "Guyana", "Colombia"] },
        { q: "¿Qué país queda al oeste de Venezuela?", o: ["Colombia", "Guyana", "Perú", "Chile"] },
        { q: "¿Cuál es el punto extremo norte?", o: ["Cabo San Román", "Río Ararí", "Río Intermedio", "Caracas"] },
        { q: "¿Cuál es el punto extremo sur?", o: ["El nacimiento del río Ararí", "Cabo San Román", "Barima y Mururuma", "El mar Caribe"] },
        { q: "¿Qué región es la de las montañas?", o: ["Los Andes", "Los Llanos", "Guayana", "Central"] },
        { q: "¿Qué región tiene grandes planicies?", o: ["Los Llanos", "Los Andes", "Guayana", "Oriental"] },
        { q: "¿Cuántas regiones estudiamos en Venezuela?", o: ["Seis", "Dos", "Tres", "Nueve"] },
        { q: "¿Qué tiene una buena exposición?", o: ["Inicio, medio y cierre", "Solo un final", "Solo dibujos", "Ningún orden"] },
      ],
      write: [
        "Cuenta a alguien dónde queda Venezuela, con orden.",
        "Escribe los cuatro vecinos y los cuatro puntos extremos.",
      ],
      schematic: [
        "Dibuja a Venezuela con sus vecinos y sus cuatro extremos.",
        "Dibuja un croquis con las seis regiones y sus símbolos.",
      ],
    },
    image: [
      "Dibuja un mapa completo de Venezuela.",
      "Rotula sus cuatro vecinos y la flecha del norte.",
      "Marca los cuatro puntos extremos con una estrella.",
      "Añade un símbolo en Los Andes, Los Llanos y Guayana.",
    ],
    summary: "Venezuela se ubica por sus cuatro vecinos, sus cuatro puntos extremos y sus seis regiones.",
  },
];
