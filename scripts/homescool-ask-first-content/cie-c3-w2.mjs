/**
 * Ciencias · ciclo 3 · semana 2 · nivel 6 — «Huesos que cuidan tu cuerpo».
 * Narrativa inductiva "pregunta primero": pregunta -> espacio -> respuesta -> copiar.
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "cie-c3-w2-d1",
    opening: "¿Qué crees que pasaría si tu cuerpo no tuviera huesos?",
    repaso: null,
    units: [
      {
        h: "Punto 1: El esqueleto",
        a: [
          "Sin huesos serías blandito y no podrías ponerte de pie.",
          "El esqueleto es el conjunto de todos tus huesos.",
          "Da forma al cuerpo y lo sostiene.",
          "También protege partes delicadas, los órganos.",
          "Un órgano es una parte del cuerpo con un trabajo concreto.",
        ],
      },
      {
        q: [
          "Toca tu cabeza con cuidado. ¿Qué hueso sientes?",
          "¿Para qué crees que sirve?",
        ],
        h: "Punto 2: El cráneo",
        a: [
          "Es el cráneo, la caja de huesos de la cabeza.",
          "Funciona como un casco firme.",
          "Protege el cerebro, que ayuda a pensar y a recordar.",
          "Abajo está la mandíbula, que se mueve al hablar y masticar.",
        ],
      },
      {
        q: [
          "Pasa tu mano por tu espalda. ¿Es un solo hueso largo",
          "o son muchos huesos pequeños?",
        ],
        h: "Punto 3: Vértebras y columna",
        a: [
          "Son muchos huesos pequeños llamados vértebras.",
          "Las vértebras apiladas forman la columna vertebral.",
          "Dentro de ella va la médula espinal.",
          "La médula es el camino de nervios entre cerebro y cuerpo.",
        ],
      },
      {
        q: [
          "Respira hondo con la mano en el pecho. ¿Qué huesos sientes",
          "a los lados? ¿Y el esternón va en la espalda o al frente?",
        ],
        h: "Punto 4: Costillas y esternón",
        a: [
          "Los huesos curvos de los lados son las costillas.",
          "El hueso plano del frente es el esternón.",
          "Está al frente y al centro, nunca en la espalda.",
          "Con las vértebras forman la caja torácica, como una jaula.",
          "La caja cuida el corazón y los pulmones.",
        ],
      },
      {
        q: [
          "¿Recuerdas qué hueso protege a cada órgano?",
        ],
        h: "Punto 5: Cada hueso tiene su escudo",
        a: [
          "Cráneo protege el cerebro · columna protege la médula ·",
          "costillas + esternón protegen corazón y pulmones.",
          "Dilo señalando cada parte en tu propio cuerpo.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es el esqueleto?", o: ["El conjunto de todos tus huesos", "Un tipo de músculo", "La cubierta de la piel", "Un mensaje nervioso"] },
        { q: "¿Qué protege el cráneo?", o: ["El cerebro", "El corazón", "La médula", "Los pulmones"] },
        { q: "¿Qué parte de la cabeza se mueve al masticar?", o: ["La mandíbula", "El esternón", "La vértebra", "El cerebro"] },
        { q: "¿Qué es una vértebra?", o: ["Un hueso pequeño de la espalda", "Un hueso del pecho", "Una parte del cerebro", "Un músculo del brazo"] },
        { q: "¿Qué protege la columna vertebral?", o: ["La médula espinal", "El corazón", "El cerebro", "Los pulmones"] },
        { q: "¿Cómo son las costillas?", o: ["Huesos curvos a los lados", "Huesos planos al frente", "Huesos pequeños del cuello", "Huesos de la mandíbula"] },
        { q: "¿Dónde está el esternón?", o: ["Al frente, en el centro del pecho", "En la espalda", "En la cabeza", "En el brazo"] },
        { q: "¿Qué órganos protege la caja torácica?", o: ["Corazón y pulmones", "Cerebro y médula", "Estómago y riñones", "Piel y sangre"] },
      ],
      write: [
        "Escribe qué órgano protege cada grupo de huesos.",
        "Explica qué es el esqueleto con tus palabras.",
      ],
      schematic: [
        "Dibuja el esqueleto con cráneo, columna y costillas.",
        "Dibuja la caja torácica y rotula esternón y costillas.",
      ],
    },
    image: [
      "Dibuja una cabeza de perfil con su espalda y su pecho.",
      "Rotula cráneo, mandíbula, vértebras y costillas.",
      "Marca el esternón con una flecha al frente.",
      "Escribe qué órgano protege cada hueso.",
    ],
    summary: "El esqueleto sostiene el cuerpo y protege órganos: el cráneo, la columna y la caja torácica.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "cie-c3-w2-d2",
    opening: ayer,
    repaso: [
      "Ayer vimos que el esqueleto sostiene y protege el cuerpo.",
      "El cráneo protege el cerebro y la columna, la médula.",
      "Las costillas y el esternón cuidan corazón y pulmones.",
    ],
    units: [
      {
        q: [
          "Imagina un casco de bicicleta. ¿En qué se parece",
          "tu cráneo a ese casco?",
        ],
        h: "Punto 1: El cráneo, un casco firme",
        a: [
          "El cráneo es la caja de huesos de la cabeza.",
          "Como un casco, es firme y protege el cerebro.",
          "El cerebro es blando y delicado, por eso necesita escudo.",
        ],
      },
      {
        q: [
          "Fíjate: el cráneo tiene varios huesos arriba.",
          "¿Cómo crees que encajan entre sí?",
        ],
        h: "Punto 2: Piezas que encajan",
        a: [
          "Los huesos de arriba encajan como piezas de un casco.",
          "Tienen pequeñas uniones entre ellos.",
          "Esas uniones permiten crecer durante la infancia.",
        ],
      },
      {
        q: [
          "Abre y cierra la boca tocando delante de tus orejas.",
          "¿Qué hueso se mueve?",
        ],
        h: "Punto 3: La mandíbula se mueve",
        a: [
          "Se mueve la mandíbula, abajo en la cara.",
          "Es la parte ósea de la cara que abre y cierra con facilidad.",
          "Con ella masticas pan y dices «hola».",
        ],
      },
      {
        q: [
          "Cuando masticas, ¿el cerebro se queda sin protección?",
        ],
        h: "Punto 4: Qué cambia y qué se mantiene",
        a: [
          "No: la cúpula de arriba del cráneo permanece fija.",
          "Cambia la mandíbula, que se mueve.",
          "Se mantiene la cúpula, que sigue cubriendo el cerebro.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿toda tu cara es cráneo?",
        ],
        h: "Punto 5: Cráneo no es toda la cara",
        a: [
          "No: el cráneo es la caja que protege el cerebro.",
          "La mandíbula es una pieza móvil abajo.",
          "Distingue la caja protectora de la mandíbula móvil.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es el cráneo?", o: ["La caja de huesos de la cabeza", "Un hueso del pecho", "Un músculo de la cara", "Una parte de la columna"] },
        { q: "¿Para qué sirve el cráneo?", o: ["Para proteger el cerebro", "Para respirar", "Para mover los brazos", "Para sentir calor"] },
        { q: "¿A qué se parece el cráneo?", o: ["A un casco firme", "A una cuerda blanda", "A una jaula del pecho", "A una cadena de fichas"] },
        { q: "¿Qué permiten las uniones del cráneo?", o: ["Crecer durante la infancia", "Abrir la boca", "Respirar hondo", "Doblar la espalda"] },
        { q: "¿Qué hueso de la cabeza se mueve al masticar?", o: ["La mandíbula", "La cúpula", "El esternón", "La vértebra"] },
        { q: "Al masticar, ¿qué sigue cubriendo el cerebro?", o: ["La cúpula fija de arriba", "La mandíbula", "El esternón", "Las costillas"] },
        { q: "¿Toda la cara es cráneo?", o: ["No, la mandíbula es una pieza móvil", "Sí, toda la cara", "Sí, menos los ojos", "Solo la nariz es cráneo"] },
        { q: "¿Cómo es el cerebro?", o: ["Blando y delicado", "Duro como hueso", "Plano como el esternón", "Curvo como una costilla"] },
      ],
      write: [
        "Explica qué cambia y qué se mantiene al masticar.",
        "Escribe qué es el cráneo y qué protege.",
      ],
      schematic: [
        "Dibuja una cabeza de perfil con cráneo y mandíbula.",
        "Dibuja un casco y un cráneo y une lo que se parece.",
      ],
    },
    image: [
      "Dibuja una cabeza de perfil.",
      "Colorea suave el cráneo.",
      "Marca la mandíbula con una flecha.",
      "Escribe dos oraciones: qué es el cráneo y qué protege.",
    ],
    summary: "El cráneo es un casco de huesos que protege el cerebro; la mandíbula se mueve y la cúpula queda fija.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "cie-c3-w2-d3",
    opening: ayer,
    repaso: [
      "Ayer miramos el cráneo, la caja de huesos de la cabeza.",
      "Su cúpula fija protege el cerebro.",
      "La mandíbula se mueve para hablar y masticar.",
    ],
    units: [
      {
        q: [
          "Te agachas a recoger un lápiz. ¿Tu espalda es un palo",
          "rígido o puede doblarse? ¿Por qué?",
        ],
        h: "Punto 1: La columna es una cadena",
        a: [
          "La columna no es un palo largo.",
          "Es una cadena de vértebras apiladas.",
          "Sostiene el cuerpo erguido.",
          "Por eso tu espalda se dobla y vuelve a enderezarse.",
        ],
      },
      {
        q: [
          "Dentro de esa cadena hay un camino.",
          "¿Qué crees que viaja por ahí?",
        ],
        h: "Punto 2: La médula espinal",
        a: [
          "Dentro de la columna va la médula espinal.",
          "Es el cable de mensajes entre cerebro y músculos.",
          "La columna la protege, como un tubo de huesos.",
        ],
      },
      {
        q: [
          "Gira la cabeza a un lado. ¿Qué vértebras te dejan",
          "hacerlo: las del cuello o las de la espalda baja?",
        ],
        h: "Punto 3: Cuello, pecho y espalda baja",
        a: [
          "Las vértebras del cuello son más pequeñas.",
          "Gracias a ellas giras la cabeza.",
          "Las del pecho forman la espalda de la caja torácica.",
          "Las de abajo son más grandes y cargan peso al caminar.",
        ],
      },
      {
        q: [
          "Entre un hueso y otro de la columna hay algo blando.",
          "¿Para qué crees que sirve?",
        ],
        h: "Punto 4: Amortiguadores entre vértebras",
        a: [
          "Entre las vértebras hay amortiguadores.",
          "Ayudan a doblarte sin aplastar los nervios.",
          "Por eso puedes inclinarte y volver erguido.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿todas las vértebras son iguales?",
        ],
        h: "Punto 5: Cambian según su lugar",
        a: [
          "No: cambian de forma según su lugar.",
          "Las del cuello son pequeñas y las de abajo, grandes.",
          "Todas juntas protegen la médula espinal.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es la columna vertebral?", o: ["Una cadena de vértebras", "Un solo hueso largo", "Una parte del cráneo", "Un músculo de la espalda"] },
        { q: "¿Qué protege la columna?", o: ["La médula espinal", "El cerebro", "El corazón", "Los pulmones"] },
        { q: "¿Qué es la médula espinal?", o: ["Cable de mensajes cerebro-músculos", "Un hueso del cuello", "Un amortiguador", "Una costilla"] },
        { q: "¿Qué vértebras te dejan girar la cabeza?", o: ["Las del cuello", "Las de abajo", "Las del pecho", "Ninguna"] },
        { q: "¿Qué hacen las vértebras de abajo?", o: ["Cargan peso al caminar", "Giran la cabeza", "Protegen el cerebro", "Abren la boca"] },
        { q: "¿Qué hay entre las vértebras?", o: ["Amortiguadores", "Músculos del brazo", "Piel", "Cerebro"] },
        { q: "¿Qué permiten los amortiguadores?", o: ["Doblarte sin aplastar los nervios", "Respirar hondo", "Masticar pan", "Crecer el cráneo"] },
        { q: "¿Son iguales todas las vértebras?", o: ["No, cambian según su lugar", "Sí, todas iguales", "Sí, son círculos", "Solo en el cuello"] },
      ],
      write: [
        "Escribe cómo la columna protege la médula.",
        "Explica por qué la espalda se dobla sin romperse.",
      ],
      schematic: [
        "Dibuja tres vértebras apiladas con la médula dentro.",
        "Dibuja cuello, pecho y espalda baja con sus rótulos.",
      ],
    },
    image: [
      "Dibuja a un niño agachado a recoger un lápiz.",
      "Dibuja su columna como una cadena de vértebras.",
      "Rotula cuello, pecho y espalda baja.",
      "Pinta la médula espinal por dentro de la columna.",
    ],
    summary: "La columna es una cadena de vértebras que sostiene el cuerpo y protege la médula espinal.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "cie-c3-w2-d4",
    opening: ayer,
    repaso: [
      "Ayer vimos que la columna es una cadena de vértebras.",
      "Dentro de ella va la médula espinal.",
      "Entre las vértebras hay amortiguadores para doblarte.",
    ],
    units: [
      {
        q: [
          "Pon tus manos a los lados del pecho. ¿Qué huesos curvos",
          "sientes y cómo crees que se llaman?",
        ],
        h: "Punto 1: Las costillas",
        a: [
          "Los huesos curvos de los lados son las costillas.",
          "Rodean el pecho como una jaula.",
          "Atrás se unen a las vértebras del pecho.",
        ],
      },
      {
        q: [
          "Toca el centro de tu pecho, al frente. ¿Qué hueso plano",
          "sientes? ¿Está en la espalda o al frente?",
        ],
        h: "Punto 2: El esternón",
        a: [
          "Es el esternón, un hueso plano en el centro del pecho.",
          "Está al frente, nunca en la espalda.",
          "Las costillas del frente se unen a él.",
        ],
      },
      {
        q: [
          "Toca la punta de tu nariz. Las costillas se unen al",
          "esternón con algo parecido. ¿Qué crees que es?",
        ],
        h: "Punto 3: El cartílago une",
        a: [
          "Es cartílago, un material firme pero más flexible que el hueso.",
          "Es parecido al de la punta de la nariz.",
          "Por eso la caja puede moverse un poco al respirar.",
        ],
      },
      {
        q: [
          "Inhala hondo y mira tu pecho. ¿Qué pasa con la caja?",
        ],
        h: "Punto 4: La caja se mueve al respirar",
        a: [
          "Al inhalar, la caja se ensancha un poco.",
          "Al exhalar, vuelve a su lugar.",
          "Mientras se mueve, sigue protegiendo como un escudo.",
          "Los pulmones se llenan de aire dentro de ese espacio.",
        ],
      },
      {
        q: [
          "¿Qué órganos viven dentro de esta jaula de huesos?",
        ],
        h: "Punto 5: Corazón y pulmones a salvo",
        a: [
          "Dentro de la caja torácica están el corazón y los pulmones.",
          "Son órganos que necesitan cuidado constante.",
          "Costillas, esternón y vértebras los protegen.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué huesos forman la caja torácica?", o: ["Costillas, esternón y vértebras del pecho", "Cráneo y mandíbula", "Brazos y piernas", "Solo vértebras del cuello"] },
        { q: "¿Cómo son las costillas?", o: ["Curvas y a los lados", "Planas y al frente", "Pequeñas y en el cuello", "Redondas y en la cabeza"] },
        { q: "¿Cómo es el esternón?", o: ["Un hueso plano al frente", "Un hueso curvo atrás", "Un hueso del cráneo", "Un hueso de la mano"] },
        { q: "¿Qué es el cartílago?", o: ["Material firme y más flexible que el hueso", "Un tipo de sangre", "Un músculo del pecho", "Una parte del cráneo"] },
        { q: "¿Con qué se unen las costillas al esternón?", o: ["Con cartílagos", "Con piel", "Con sangre", "Con médula"] },
        { q: "¿Qué pasa con la caja al inhalar?", o: ["Se ensancha un poco", "Se encoge mucho", "Se rompe", "Se vuelve cartílago"] },
        { q: "¿Qué órganos protege la caja torácica?", o: ["Corazón y pulmones", "Cerebro y médula", "Piel y sangre", "Boca y nariz"] },
        { q: "Mientras la caja se mueve, ¿qué sigue haciendo?", o: ["Protegiendo como un escudo", "Dejando sin cubrir el corazón", "Convirtiéndose en columna", "Creciendo sin parar"] },
      ],
      write: [
        "Escribe qué órganos protege la caja torácica.",
        "Explica qué pasa con la caja al respirar.",
      ],
      schematic: [
        "Dibuja la caja torácica con costillas y esternón.",
        "Dibuja la caja al inhalar y al exhalar.",
      ],
    },
    image: [
      "Dibuja el pecho como un óvalo.",
      "Rotula vértebras atrás, esternón adelante y costillas.",
      "Dibuja el corazón y los pulmones adentro.",
      "Escribe qué órganos protege la caja.",
    ],
    summary: "La caja torácica, hecha de costillas, esternón y vértebras, protege el corazón y los pulmones.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "cie-c3-w2-d5",
    opening: ayer,
    repaso: [
      "Esta semana nombraste los huesos que sostienen y protegen.",
      "El cráneo cuida el cerebro y la columna, la médula.",
      "Las costillas y el esternón cuidan corazón y pulmones.",
    ],
    units: [
      {
        q: [
          "Sin mirar nada, ¿qué huesos protegen al cerebro, a la",
          "médula, al corazón y a los pulmones?",
        ],
        w: 3,
        h: "Punto 1: Cada hueso con su escudo",
        a: [
          "Cráneo protege el cerebro · columna protege la médula ·",
          "costillas + esternón protegen corazón y pulmones.",
          "Si olvidaste alguno, señálalo en tu cuerpo.",
        ],
      },
      {
        q: [
          "En tu brazo, ¿qué capas encuentras de afuera hacia",
          "adentro: piel, músculo y hueso? ¿En qué orden?",
        ],
        h: "Punto 2: De afuera hacia adentro",
        a: [
          "Primero está la piel, que cubre y protege.",
          "Debajo está el músculo, que mueve el cuerpo.",
          "Más adentro está el hueso, que sostiene.",
          "Piel, músculo y hueso trabajan en equipo.",
        ],
      },
      {
        q: [
          "¿Por qué crees que el hueso necesita al músculo",
          "para que tu cuerpo se mueva?",
        ],
        h: "Punto 3: Hueso y músculo, un equipo",
        a: [
          "El músculo se acorta y tira del hueso.",
          "Sin músculo, el hueso no se mueve solo.",
          "Sin hueso, el músculo no tendría de dónde tirar.",
          "Piensa en abrir una puerta con tu brazo.",
        ],
      },
      {
        q: [
          "¿Qué puedes hacer cada día para cuidar tus huesos",
          "y tus músculos?",
        ],
        h: "Punto 4: Cómo cuidar huesos y músculos",
        a: [
          "Muévete y juega: así se fortalecen músculos y huesos.",
          "Come alimentos con calcio, como la leche y el queso.",
          "Duerme bien y siéntate con la espalda derecha.",
          "Usa casco en bicicleta para cuidar tu cráneo.",
        ],
      },
      {
        q: [
          "Vas a contárselo a alguien de tu casa.",
          "¿Cómo ordenarías tu exposición?",
        ],
        h: "Punto 5: Cómo contarlo con orden",
        a: [
          "Inicio: «Hoy les voy a contar qué huesos nos protegen».",
          "Medio: un hueso, el órgano que cuida y un ejemplo.",
          "Cierre: un consejo para cuidar los huesos y «gracias».",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué hueso protege el cerebro?", o: ["El cráneo", "La columna", "El esternón", "Las costillas"] },
        { q: "¿Qué protege la columna?", o: ["La médula espinal", "El corazón", "Los pulmones", "El cerebro"] },
        { q: "¿Qué cuidan las costillas y el esternón?", o: ["Corazón y pulmones", "Cerebro y médula", "Piel y sangre", "Ojos y nariz"] },
        { q: "¿Cuál es el orden de afuera hacia adentro?", o: ["Piel, músculo, hueso", "Hueso, músculo, piel", "Músculo, piel, hueso", "Piel, hueso, músculo"] },
        { q: "¿Qué hace el músculo con el hueso?", o: ["Tira de él para moverlo", "Lo cubre como piel", "Lo convierte en cartílago", "Lo manda al cerebro"] },
        { q: "¿Qué alimento con calcio cuida los huesos?", o: ["La leche", "Los dulces", "La sal", "El refresco"] },
        { q: "¿Para qué sirve el casco en bicicleta?", o: ["Para cuidar el cráneo", "Para fortalecer la columna", "Para cuidar las costillas", "Para mover la mandíbula"] },
        { q: "¿Cómo termina una buena exposición?", o: ["Con un consejo y «gracias»", "Sin decir nada", "Con un chiste", "Con una pregunta sin respuesta"] },
      ],
      write: [
        "Escribe de memoria qué hueso protege cada órgano.",
        "Cuenta dos consejos para cuidar huesos y músculos.",
      ],
      schematic: [
        "Dibuja un esquema con cráneo, columna y caja torácica.",
        "Dibuja piel, músculo y hueso de afuera hacia adentro.",
      ],
    },
    image: [
      "Dibuja a un niño andando en bicicleta con casco.",
      "Rotula el cráneo, la columna y las costillas.",
      "Escribe qué órgano protege cada una.",
      "Añade un consejo para cuidar huesos y músculos.",
    ],
    summary: "Cráneo, columna y caja torácica protegen órganos; con movimiento, calcio y descanso cuidas huesos y músculos.",
  },
];
