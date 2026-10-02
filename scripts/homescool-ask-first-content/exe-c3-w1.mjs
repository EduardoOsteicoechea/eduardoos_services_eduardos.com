/**
 * Exégesis · ciclo 3 · semana 1 · nivel 6 — Romanos 1:1, método "pregunta primero".
 * Pregunta -> espacio para responder -> "Punto N: ..." -> copiar.
 * Solo se afirma lo que dice Romanos 1:1 (Pablo, siervo, apóstol, apartado,
 * evangelio de Dios); el versículo se parafrasea, sin comillas.
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "exe-c3-w1-d1",
    opening: "Cuando recibes una carta, ¿qué miras primero? ¿Por qué?",
    repaso: null,
    units: [
      {
        h: "Punto 1: Leer con cuidado",
        a: [
          "Romanos es una carta de la Biblia.",
          "Se la escribió Pablo a los cristianos de Roma.",
          "Exégesis es leer un texto con mucho cuidado.",
          "Primero miramos lo que el texto dice de verdad.",
        ],
      },
      {
        q: [
          "Mira cómo empieza la carta. ¿Quién crees que la escribe",
          "y dónde lo dice?",
        ],
        h: "Punto 2: Quién escribe",
        a: [
          "En una carta antigua, el autor se presenta al inicio.",
          "Romanos 1:1 empieza con el nombre de Pablo.",
          "Así el lector sabe quién le habla.",
          "El saludo no sobra: nos dice quién escribe.",
        ],
      },
      {
        q: [
          "Pablo dice que es «siervo». ¿Qué crees que significa",
          "esa palabra?",
        ],
        h: "Punto 3: Siervo y apóstol",
        a: [
          "Siervo es quien pertenece a su señor y lo sirve.",
          "Pablo es siervo de Cristo.",
          "También se llama apóstol: un enviado con un mensaje.",
          "Los dos títulos cuentan cuál es su tarea.",
        ],
      },
      {
        q: [
          "Ahora viene una palabra difícil: «apartado».",
          "Si apartas un regalo, ¿qué haces con él?",
        ],
        h: "Punto 4: Apartado",
        a: [
          "Apartar es separar algo para un fin especial.",
          "Pablo fue apartado para una tarea.",
          "Esa tarea es el evangelio de Dios.",
        ],
      },
      {
        q: [
          "Y «evangelio», ¿qué te suena que quiere decir?",
          "¿Qué importa que sea «de Dios»?",
        ],
        h: "Punto 5: El evangelio de Dios",
        a: [
          "Evangelio quiere decir buena noticia.",
          "«De Dios» dice de dónde viene esa noticia.",
          "Viene de Dios; Pablo no la inventó.",
          "Por eso nunca quitamos «de Dios» al resumir.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es la exégesis?", o: ["Leer con cuidado lo que dice el texto", "Inventar una historia nueva", "Copiar sin leer", "Leer solo el final"] },
        { q: "¿Quién escribe la carta a los romanos?", o: ["Pablo", "Pedro", "Un soldado de Roma", "Un niño"] },
        { q: "¿Dónde se presenta el autor de una carta antigua?", o: ["Al inicio de la carta", "Al final de la carta", "En el sobre", "No se presenta"] },
        { q: "¿Qué significa «siervo»?", o: ["Quien pertenece a su señor y lo sirve", "Quien manda a todos", "Quien viaja solo", "Quien escribe cartas"] },
        { q: "¿Qué es un apóstol?", o: ["Un enviado con un mensaje", "Un soldado romano", "Un vecino de Roma", "Un cantante"] },
        { q: "¿Qué significa «apartado» en Romanos 1:1?", o: ["Separado para una tarea especial", "Lejos de todos", "Guardado en un cajón", "Castigado"] },
        { q: "¿Qué quiere decir «evangelio»?", o: ["Buena noticia", "Mala noticia", "Carta larga", "Canción antigua"] },
        { q: "¿De dónde viene el evangelio de Dios?", o: ["De Dios", "De Pablo", "De Roma", "De un rumor"] },
      ],
      write: [
        "Escribe qué significa leer un texto con cuidado.",
        "Explica con tus palabras quién es Pablo en este versículo.",
      ],
      schematic: [
        "Dibuja una carta y rotula el nombre de quien la escribe.",
        "Dibuja un esquema con siervo, apóstol y apartado.",
      ],
    },
    image: [
      "Dibuja una carta abierta con un sello y un nombre arriba.",
      "Rotula «Pablo» como el autor que se presenta.",
      "Añade tres etiquetas: siervo, apóstol y apartado.",
      "Escribe cerca la frase «evangelio de Dios».",
    ],
    summary: "Exégesis es leer con cuidado. Pablo se presenta, siervo y apóstol, apartado para el evangelio de Dios.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "exe-c3-w1-d2",
    opening: ayer,
    repaso: [
      "Ayer vimos que exégesis es leer con mucho cuidado.",
      "Supimos que Pablo escribe la carta y se presenta primero.",
      "También conocimos siervo, apóstol y apartado.",
    ],
    units: [
      {
        q: [
          "Antes de leer un versículo, ¿cómo sabes quién habla?",
        ],
        h: "Punto 1: Buscar quién habla",
        a: [
          "Busca primero a la persona que se presenta.",
          "En Romanos 1:1, el primer nombre es Pablo.",
          "El autor se presenta al inicio de la carta.",
          "Ese nombre orienta al lector.",
        ],
      },
      {
        q: [
          "Si copias el versículo, ¿qué palabra rodearías primero",
          "con un círculo?",
        ],
        h: "Punto 2: Rodear el nombre",
        a: [
          "Rodea «Pablo»: es quien dice «yo escribo».",
          "Copiar despacio ayuda a no saltarse nada.",
          "Cada palabra del saludo trae información.",
        ],
      },
      {
        q: [
          "Además de su nombre, ¿qué más dice el versículo",
          "sobre Pablo?",
        ],
        h: "Punto 3: Lo que el texto dice de él",
        a: [
          "Dice que es siervo de Cristo.",
          "Dice que es apóstol y que fue apartado.",
          "Dice que fue apartado para el evangelio de Dios.",
          "Todo eso está escrito en el versículo.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: Pablo viajó por muchos lugares.",
          "¿Lo dice Romanos 1:1?",
        ],
        h: "Punto 4: Lo que el texto no dice",
        a: [
          "No, ese dato no está en este versículo.",
          "Puede ser cierto, pero se lee en otros libros.",
          "La exégesis empieza por lo que está escrito.",
          "Después se pueden sumar otros datos.",
        ],
      },
      {
        q: [
          "Ahora tú: ¿cómo dirías en una frase quién es Pablo,",
          "usando solo el versículo?",
        ],
        h: "Punto 5: Tu frase sobre Pablo",
        a: [
          "Puedes decir: Pablo escribe y se presenta como siervo.",
          "Añade que es apóstol, apartado para el evangelio.",
          "Revisa que cada palabra esté en Romanos 1:1.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿A quién buscas primero para saber quién habla?", o: ["Al autor que se presenta", "Al último lector", "Al vecino", "A un rey"] },
        { q: "¿Cuál es el primer nombre en Romanos 1:1?", o: ["Pablo", "Pedro", "Roma", "Jesús"] },
        { q: "¿Qué haces con «Pablo» al copiar el versículo?", o: ["Lo rodeas con un círculo", "Lo borras", "Lo cambias", "Lo saltas"] },
        { q: "¿Qué dos títulos tiene Pablo en el versículo?", o: ["Siervo y apóstol", "Rey y soldado", "Maestro y juez", "Pastor y médico"] },
        { q: "¿Para qué fue apartado Pablo?", o: ["Para el evangelio de Dios", "Para ser rey", "Para viajar solo", "Para ser soldado"] },
        { q: "¿Qué dato NO dice Romanos 1:1 sobre Pablo?", o: ["Que viajó por muchos lugares", "Que es apóstol", "Que es siervo", "Que fue apartado"] },
        { q: "¿Con qué empieza la exégesis?", o: ["Con lo que está escrito", "Con una opinión", "Con un rumor", "Con un dibujo"] },
        { q: "¿Por qué no se salta el saludo?", o: ["Porque dice quién escribe", "Porque es muy largo", "Porque rima", "Porque es de otro libro"] },
      ],
      write: [
        "Copia Romanos 1:1 con tus palabras y rodea «Pablo».",
        "Escribe dos cosas que el texto dice sobre Pablo.",
      ],
      schematic: [
        "Dibuja a Pablo con tres etiquetas tomadas del versículo.",
        "Dibuja dos cajas: lo que el texto dice y lo que no dice.",
      ],
    },
    image: [
      "Dibuja una hoja con el versículo copiado.",
      "Rodea el nombre «Pablo» con un círculo grande.",
      "Escribe debajo dos cosas que el texto dice de él.",
      "Marca con una X un dato que el versículo no dice.",
    ],
    summary: "En Romanos 1:1 se lee primero quién habla y lo que el texto dice de Pablo, sin añadir datos de afuera.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "exe-c3-w1-d3",
    opening: ayer,
    repaso: [
      "Ayer copiamos el versículo y rodeamos el nombre Pablo.",
      "Vimos que el texto dice más cosas de él.",
      "Hoy miramos con calma sus dos títulos.",
    ],
    units: [
      {
        q: [
          "Pablo se llama «siervo». ¿A quién crees que sirve?",
        ],
        h: "Punto 1: Siervo",
        a: [
          "Siervo es quien pertenece a su señor y lo sirve.",
          "Pablo sirve a Cristo.",
          "Él mismo se presenta así en el saludo.",
          "Esta palabra habla de su relación con Cristo.",
        ],
      },
      {
        q: [
          "¿Y qué crees que hace un apóstol?",
        ],
        h: "Punto 2: Apóstol",
        a: [
          "Apóstol es un enviado con un mensaje.",
          "Se parece a un mensajero que lleva noticias.",
          "Pablo fue enviado para anunciar el mensaje de Jesús.",
          "Esta palabra habla de su misión.",
        ],
      },
      {
        q: [
          "Imagina dos columnas en tu cuaderno. ¿Qué pondrías",
          "en la de «siervo» y qué en la de «apóstol»?",
        ],
        h: "Punto 3: Dos columnas",
        a: [
          "Siervo: pertenece y sirve.",
          "Apóstol: enviado y mensajero.",
          "Las dos palabras no dicen lo mismo.",
          "Juntas muestran su relación y su misión.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿«siervo» y «apóstol» son solo",
          "apodos bonitos, como un adorno?",
        ],
        h: "Punto 4: No son adornos",
        a: [
          "No. Cada título explica algo de Pablo.",
          "Siervo dice a quién pertenece.",
          "Apóstol dice para qué fue enviado.",
          "Si quitas uno, falta una parte de la frase.",
        ],
      },
      {
        q: [
          "Ahora tú: ¿cómo usarías las dos palabras",
          "en una sola oración?",
        ],
        h: "Punto 5: Una oración con ambos",
        a: [
          "Pablo es siervo porque sirve a Cristo.",
          "Y es apóstol porque fue enviado con un mensaje.",
          "Comprueba que las dos palabras estén en el versículo.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué quiere decir «siervo»?", o: ["Pertenece a su señor y lo sirve", "Manda sobre todos", "Escribe cartas", "Vive en Roma"] },
        { q: "¿A quién sirve Pablo?", o: ["A Cristo", "A un rey de Roma", "A un vecino", "A nadie"] },
        { q: "¿Qué quiere decir «apóstol»?", o: ["Un enviado con un mensaje", "Un vecino de Roma", "Un soldado", "Un juez"] },
        { q: "¿Qué palabra habla de la relación de Pablo con Cristo?", o: ["Siervo", "Apóstol", "Carta", "Roma"] },
        { q: "¿Qué palabra habla de la misión de Pablo?", o: ["Apóstol", "Siervo", "Saludo", "Cuaderno"] },
        { q: "¿Los dos títulos dicen lo mismo?", o: ["No, cada uno dice algo distinto", "Sí, son idénticos", "Ninguno dice nada", "Son nombres de ciudades"] },
        { q: "¿Qué pasa si quitas uno de los títulos?", o: ["Falta una parte de la frase", "No cambia nada", "Se acaba la carta", "Cambia el autor"] },
        { q: "¿Los títulos son solo adornos?", o: ["No, explican algo de Pablo", "Sí, son apodos", "Sí, no significan nada", "Solo en Roma"] },
      ],
      write: [
        "Escribe una oración que use «siervo» y «apóstol».",
        "Explica por qué los títulos no son solo adornos.",
      ],
      schematic: [
        "Dibuja dos columnas: siervo y apóstol, con sus significados.",
        "Dibuja a un mensajero con una carta y rotula «apóstol».",
      ],
    },
    image: [
      "Dibuja a una persona sirviendo y a otra con un mensaje.",
      "Rotula la primera «siervo» y la segunda «apóstol».",
      "Escribe debajo qué significa cada palabra.",
      "Añade una oración con las dos palabras.",
    ],
    summary: "Pablo es siervo, porque pertenece y sirve a Cristo, y apóstol, porque fue enviado con un mensaje.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "exe-c3-w1-d4",
    opening: ayer,
    repaso: [
      "Ayer explicamos siervo y apóstol con dos columnas.",
      "Siervo es quien pertenece a su señor y lo sirve.",
      "Apóstol es un enviado con un mensaje.",
    ],
    units: [
      {
        q: [
          "Pablo fue «apartado». Si apartas un juguete para",
          "un regalo, ¿qué haces con él?",
        ],
        h: "Punto 1: Apartado",
        a: [
          "Apartar es separar algo para un fin especial.",
          "Pablo fue separado para una tarea.",
          "Esa tarea es el evangelio de Dios.",
        ],
      },
      {
        q: [
          "¿Qué es para ti una buena noticia?",
          "¿Cómo suena entonces la palabra «evangelio»?",
        ],
        h: "Punto 2: Evangelio",
        a: [
          "Evangelio quiere decir buena noticia.",
          "Pablo fue apartado para esa buena noticia.",
          "Es un mensaje que se cuenta a los demás.",
        ],
      },
      {
        q: [
          "Si alguien resume diciendo solo «el evangelio»,",
          "¿qué palabras le faltan?",
        ],
        h: "Punto 3: De Dios",
        a: [
          "Le faltan las palabras «de Dios».",
          "Dicen de dónde viene la buena noticia.",
          "Viene de Dios; Pablo no la inventó.",
          "Por eso no las quitamos al resumir.",
        ],
      },
      {
        q: [
          "Junta toda la semana: ¿qué frase armarías sobre Pablo?",
        ],
        h: "Punto 4: Una frase de la semana",
        a: [
          "Pablo, siervo y apóstol, apartado para el evangelio de Dios.",
          "Esa frase usa solo lo que dice el versículo.",
          "Cada palabra se puede comprobar en el texto.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿«Pablo era muy valiente»",
          "cabe en tu frase de Romanos 1:1?",
        ],
        h: "Punto 5: Texto y opinión",
        a: [
          "No cabe, porque el versículo no lo dice.",
          "Puede ser una buena idea, pero va aparte.",
          "Primero escribimos lo que el texto dice.",
          "Después podemos añadir lo que pensamos.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué significa «apartado»?", o: ["Separado para un fin especial", "Muy lejos", "Perdido", "Castigado"] },
        { q: "¿Para qué fue apartado Pablo?", o: ["Para el evangelio de Dios", "Para ser rey", "Para ser soldado", "Para vivir solo"] },
        { q: "¿Qué quiere decir «evangelio»?", o: ["Buena noticia", "Ley antigua", "Carta larga", "Canción"] },
        { q: "¿Qué dicen las palabras «de Dios»?", o: ["De dónde viene la buena noticia", "Dónde vive Pablo", "Cuándo se escribió", "Quién la copió"] },
        { q: "¿Quién inventó el evangelio de Dios?", o: ["Nadie: viene de Dios", "Pablo", "Un romano", "Un niño"] },
        { q: "¿Qué debe usar tu frase de síntesis?", o: ["Solo lo que dice el versículo", "Todo lo que imagines", "Datos de otros libros", "Rumores"] },
        { q: "¿«Pablo era muy valiente» está en Romanos 1:1?", o: ["No, el versículo no lo dice", "Sí, al inicio", "Sí, al final", "Solo en Roma"] },
        { q: "¿Qué va primero al leer?", o: ["Lo que el texto dice", "Lo que opinamos", "Un dibujo", "Un resumen ajeno"] },
      ],
      write: [
        "Escribe tu frase de la semana sobre Pablo.",
        "Explica por qué no quitamos «de Dios» al resumir.",
      ],
      schematic: [
        "Dibuja un esquema: apartado, evangelio y de Dios.",
        "Dibuja dos cajas: lo que dice el texto y mi opinión.",
      ],
    },
    image: [
      "Dibuja a Pablo con una carta y una luz que sale de ella.",
      "Rotula «apartado» y «evangelio de Dios».",
      "Escribe tu frase de la semana en una cinta.",
      "Revisa que cada palabra esté en el versículo.",
    ],
    summary: "Pablo fue apartado para el evangelio de Dios: una buena noticia que viene de Dios, no de Pablo.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "exe-c3-w1-d5",
    opening: ayer,
    repaso: [
      "Esta semana leímos Romanos 1:1 con mucho cuidado.",
      "Conocimos a Pablo, siervo y apóstol.",
      "Vimos que fue apartado para el evangelio de Dios.",
    ],
    units: [
      {
        q: [
          "Sin mirar nada, ¿qué es la exégesis y qué versículo",
          "leímos esta semana?",
        ],
        w: 3,
        h: "Punto 1: Exégesis y versículo",
        a: [
          "Exégesis es leer un texto con mucho cuidado.",
          "Leímos Romanos 1:1, el saludo de la carta.",
          "Si olvidaste algo, dilo otra vez en voz alta.",
        ],
      },
      {
        q: [
          "¿Quién escribe la carta y cómo lo sabemos?",
          "¿Qué dos títulos se da?",
        ],
        h: "Punto 2: Pablo y sus títulos",
        a: [
          "Escribe Pablo, y se presenta al inicio.",
          "Se llama siervo, porque pertenece a Cristo y lo sirve.",
          "Se llama apóstol: un enviado con un mensaje.",
        ],
      },
      {
        q: [
          "¿Qué significan «apartado» y «evangelio de Dios»?",
        ],
        h: "Punto 3: La tarea de Pablo",
        a: [
          "Apartado es separado para una tarea especial.",
          "Evangelio es una buena noticia.",
          "Es «de Dios» porque viene de Dios.",
        ],
      },
      {
        q: [
          "Vas a contárselo a alguien de tu casa.",
          "¿Cómo empezarías tu exposición?",
        ],
        h: "Punto 4: Cómo contarlo con orden",
        a: [
          "Una buena exposición tiene inicio, medio y cierre.",
          "Inicio: «Hoy les cuento cómo leer un versículo».",
          "Medio: Pablo, sus títulos y el evangelio de Dios.",
          "Cierre: lo que el texto dice, y gracias por escuchar.",
        ],
      },
      {
        q: [
          "¿Qué cuidado tendrás la próxima vez que leas",
          "un versículo?",
        ],
        h: "Punto 5: Leer sin añadir",
        a: [
          "Primero mira quién habla y qué dice.",
          "No agregues ideas que el texto no dice.",
          "No quites palabras importantes, como «de Dios».",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué versículo leímos esta semana?", o: ["Romanos 1:1", "Juan 3:16", "Génesis 1:1", "Salmo 23"] },
        { q: "¿Qué es la exégesis?", o: ["Leer con mucho cuidado un texto", "Adivinar el futuro", "Copiar rápido", "Cantar un salmo"] },
        { q: "¿Quién se presenta al inicio de la carta?", o: ["Pablo", "Pedro", "Un romano", "Un profeta"] },
        { q: "¿Qué dos títulos se da Pablo?", o: ["Siervo y apóstol", "Rey y juez", "Maestro y soldado", "Pastor y médico"] },
        { q: "¿Qué significa «apartado»?", o: ["Separado para una tarea especial", "Muy lejos", "Perdido", "Dormido"] },
        { q: "¿Qué significa «evangelio»?", o: ["Buena noticia", "Ley antigua", "Mala noticia", "Carta larga"] },
        { q: "¿Qué parte de una exposición va al inicio?", o: ["Presentar de qué hablarás", "Dar las gracias", "Las preguntas finales", "El cierre"] },
        { q: "¿Qué debes evitar al leer un versículo?", o: ["Añadir ideas que no dice", "Mirar quién habla", "Leer despacio", "Subrayar palabras"] },
      ],
      write: [
        "Escribe lo que aprendiste de Romanos 1:1 en tres frases.",
        "Cuenta con tus palabras qué hace un siervo y un apóstol.",
      ],
      schematic: [
        "Dibuja un esquema con Pablo, sus títulos y su tarea.",
        "Dibuja las tres partes de una exposición: inicio, medio y cierre.",
      ],
    },
    image: [
      "Dibuja una carta con cuatro etiquetas.",
      "Escribe en ellas: Pablo, siervo, apóstol y apartado.",
      "Debajo escribe «evangelio de Dios» con una flecha.",
      "Revisa que cada etiqueta salga del versículo.",
    ],
    summary: "Esta semana leímos Romanos 1:1 con cuidado: Pablo, siervo y apóstol, apartado para el evangelio de Dios.",
  },
];
