/**
 * GOLD EXAMPLE — formato Homescool "Ask First" con metáfora venezolana.
 * Es la plantilla exacta de tono, ritmo y forma. NO se construye (no coincide con *-c3-w*.mjs).
 *
 * Materia: Español · ciclo 3 · semana 1 · día 2 · nivel 6
 * Hito de Venezuela: Sierra Nevada de Mérida (ver docs/homescool-venezuela-metaphors.md)
 *
 * Forma de una clase:
 *   key
 *   units[0] = { h: "Punto 1: Repaso de ayer", a: [...] }   // la apertura «¿Qué aprendiste ayer?» la pone el generador
 *   units[1..N] = { q: [líneas de pregunta], h: "Punto N: título", a: [líneas de respuesta] }
 *   quiz  = { mcq: [{ q, o: [correcta, mala, mala, mala] } x8], write: [2 textos], schematic: [2 textos] }
 *   image = [4 líneas]   (instrucción de imagen: se envuelve a una caja de 59 mm)
 *   summary
 *
 * Cada unit produce, en la hoja:
 *   pregunta -> línea en blanco -> línea de guiones (el niño intenta) -> línea en blanco ->
 *   "Punto N: título" -> línea en blanco -> respuesta (2 a 4 líneas cortas) -> línea en blanco ->
 *   "Escribe aquí lo que aprendiste:" -> línea de guiones -> línea en blanco.
 * El generador añade los guiones y los espacios; el módulo solo trae q, h y a.
 *
 * Reglas de redacción: una idea por línea, ~40 caracteres como máximo (el generador envuelve si te pasas),
 * 5 a 7 Puntos por clase, sin secciones de práctica / error común / pregunta final,
 * la metáfora vive dentro de las preguntas y de las respuestas.
 */
export default [
  {
    key: "esp-c3-w1-d2",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer viste que cada palabra tiene",
          "su propio trabajo, como cada",
          "explorador en la Sierra Nevada.",
        ],
      },
      {
        q: [
          "En la Sierra Nevada hay una montaña",
          "y hay el Pico Bolívar. ¿Son iguales?",
        ],
        h: "Punto 2: Nombre común y nombre propio",
        a: [
          "«Montaña» es un nombre común:",
          "sirve para cualquier montaña.",
          "«Pico Bolívar» es un nombre propio:",
          "es una montaña concreta.",
        ],
      },
      {
        q: [
          "Si llegan muchos frailejones al valle,",
          "¿cómo dices «el frailejón alto»?",
        ],
        h: "Punto 3: Las palabras se ponen de acuerdo",
        a: [
          "Dices «los frailejones altos».",
          "Si hay varios, todas las palabras",
          "pasan a plural y se ponen de acuerdo.",
        ],
      },
      {
        q: [
          "Mira: «yo subo». Si sube tu amiga,",
          "¿cómo lo dices? ¿Y si subes tú?",
        ],
        h: "Punto 4: El verbo cambia",
        a: [
          "Dices: yo subo, tú subes, ella sube.",
          "El final cambia según quién sube.",
          "La parte «sub-» se queda igual.",
        ],
      },
      {
        q: [
          "«Sofía sube. Sofía mira la nieve.»",
          "Suena repetido. ¿Cómo lo arreglas?",
        ],
        h: "Punto 5: El pronombre evita repetir",
        a: [
          "Dices: «Sofía sube. Ella la mira.»",
          "«Ella» ocupa el lugar de Sofía,",
          "como un compañero que la reemplaza.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: «ser» y «estar»,",
          "¿son nombres o son verbos?",
        ],
        h: "Punto 6: Cuidado con las palabras cortas",
        a: [
          "Son verbos, aunque sean cortos.",
          "«Soy andino» y «estoy en la cima»",
          "dicen quién eres y dónde estás.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuál es un nombre propio?", o: ["Pico Bolívar", "montaña", "laguna", "nieve"] },
        { q: "¿Qué nombre común sirve para cualquier montaña?", o: ["montaña", "Pico Bolívar", "Mérida", "Sofía"] },
        { q: "¿Cómo se dice «el frailejón alto» en plural?", o: ["los frailejones altos", "los frailejón alto", "el frailejones altos", "los frailejones alto"] },
        { q: "Cuando hay varios, ¿qué pasa con las palabras?", o: ["Todas pasan a plural", "Solo cambia el nombre", "Ninguna cambia", "Solo cambia el adjetivo"] },
        { q: "¿Qué parte del verbo «subo» no cambia?", o: ["sub-", "-o", "yo", "-es"] },
        { q: "¿Cómo dices «ella» con el verbo subir?", o: ["ella sube", "ella subo", "ella subes", "ella subimos"] },
        { q: "¿Qué palabra ocupa el lugar de Sofía?", o: ["Ella", "Nieve", "Monte", "Sube"] },
        { q: "«Soy» y «estoy», ¿son nombres o verbos?", o: ["Verbos", "Nombres", "Pronombres", "Adjetivos"] },
      ],
      write: [
        "Escribe un nombre común y uno propio de tu barrio.",
        "Cuenta con tus palabras para qué sirve un pronombre.",
      ],
      schematic: [
        "Dibuja dos columnas: nombre común y nombre propio.",
        "Dibuja un esquema: yo, tú y ella con el verbo subir.",
      ],
    },
    image: [
      "Dibuja una montaña con tres cumbres.",
      "En cada cumbre escribe una palabra distinta:",
      "un nombre, un verbo y un pronombre.",
      "Revisa que cada palabra haga su trabajo.",
    ],
    summary: "En la Sierra Nevada cada palabra tiene su trabajo: nombrar, actuar o reemplazar.",
  },
];
