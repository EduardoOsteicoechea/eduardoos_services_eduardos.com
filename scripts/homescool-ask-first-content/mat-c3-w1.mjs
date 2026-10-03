/**
 * Matemática · ciclo 3 · semana 1 · nivel 6 — «Multiplicar con las tablas del 1 al 12». (v3: 3 días)
 * Formato Ask First + metáfora de Venezuela: Archipiélago Los Roques
 * (islas y cayos en grupos y filas; los números de cayos y animales son de ejemplo, «imagina que...»).
 * d1 = panorama (grupos iguales, factores, producto, trucos); d2 = tablas del 1 al 6; d3 = tablas del 7 al 12 y contarlo.
 * Todas las cuentas verificadas a mano.
 */
export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "mat-c3-w1-d1",
    units: [
      {
        h: "Punto 1: Repaso de la clase pasada",
        a: [
          "Ya sabes sumar el mismo número,",
          "como 5 + 5 + 5. Hoy lo harás más",
          "corto, en el archipiélago Los Roques.",
        ],
      },
      {
        q: [
          "Los Roques tiene cayos, islas pequeñas.",
          "¿Cuántas palmeras hay en 3 cayos de 4?",
        ],
        h: "Punto 2: Grupos iguales",
        a: [
          "Cada cayo es un grupo de 4 palmeras.",
          "4 + 4 + 4 = 12. Multiplicar es sumar",
          "grupos iguales: 3 × 4 = 12.",
        ],
      },
      {
        q: [
          "En 3 × 4 = 12 hay 3 cayos de 4 palmeras.",
          "¿Cómo se llaman el 3, el 4 y el 12?",
        ],
        h: "Punto 3: Factores y producto",
        a: [
          "El 3 y el 4 son los factores:",
          "el 3 cuenta cayos y el 4 palmeras.",
          "El 12 es el producto, el resultado.",
        ],
      },
      {
        q: [
          "Hay 12 tablas, del 1 al 12. ¿Hay trucos",
          "para contar cayos de Los Roques rápido?",
        ],
        h: "Punto 4: Cada tabla tiene su truco",
        a: [
          "El 1 deja igual: 1 × 9 = 9.",
          "El 2 dobla: 2 × 6 = 12.",
          "El 5 termina en 0 o 5: 5 × 6 = 30.",
          "El 10 añade un cero: 10 × 8 = 80.",
        ],
      },
      {
        q: [
          "Pedro dice que 3 × 4 = 7, porque suma",
          "3 + 4. ¿Tiene razón con sus cayos?",
        ],
        h: "Punto 5: No sumes los factores",
        a: [
          "No. Sumó 3 + 4, pero multiplicar es",
          "juntar tres cayos de cuatro palmeras.",
          "4 + 4 + 4 = 12, así que 3 × 4 = 12.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuánto es 3 × 4?", o: ["12", "7", "34", "16"] },
        { q: "¿Cómo se llama el resultado de multiplicar?", o: ["Producto", "Factor", "Sumando", "Resto"] },
        { q: "En 3 × 4, ¿qué cuenta el 3?", o: ["Los cayos", "Las palmeras", "El producto", "La suma"] },
        { q: "¿Cuánto es 2 × 6?", o: ["12", "8", "26", "10"] },
        { q: "¿En qué terminan los productos del 5?", o: ["En 0 o en 5", "En 2 o en 7", "En 3 o en 8", "En 1 o en 9"] },
        { q: "¿Cuánto es 10 × 8?", o: ["80", "18", "800", "88"] },
        { q: "¿Cuánto es 1 × 9?", o: ["9", "10", "1", "19"] },
        { q: "Pedro sumó 3 + 4. ¿Cuánto es 3 × 4?", o: ["12", "7", "10", "43"] },
      ],
      write: [
        "Escribe 3 × 5 como suma repetida. ¿Cuánto da?",
        "Cuenta con tus palabras qué es un factor.",
      ],
      schematic: [
        "Dibuja 3 cayos con 4 palmeras: 3 × 4 = 12.",
        "Dibuja 2 cayos con 6 palmeras: 2 × 6.",
      ],
    },
    image: [
      "Dibuja 3 grupos de 4 puntos: 3 × 4.",
      "Escribe la suma 4 + 4 + 4 en una fila.",
      "Rotula factores y producto con flechas.",
      "Deja vacía la casilla del producto.",
    ],
    summary: "Multiplicar es sumar grupos iguales, como cayos de Los Roques con las mismas palmeras.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "mat-c3-w1-d2",
    units: [
      {
        h: "Punto 1: Repaso de la clase pasada",
        a: [
          "La clase pasada viste que multiplicar es",
          "sumar grupos iguales, como los cayos",
          "de Los Roques: 3 × 4 = 12.",
        ],
      },
      {
        q: [
          "Imagina 1 cayo con 8 cangrejos. ¿Cuánto",
          "es 1 × 8? ¿Y 7 cayos con 2 pelícanos?",
        ],
        h: "Punto 2: Las tablas del 1 y del 2",
        a: [
          "Un cayo con 8 cangrejos: 1 × 8 = 8.",
          "El 2 dobla el número: 2 × 7 = 14,",
          "porque 7 + 7 = 14 pelícanos.",
        ],
      },
      {
        q: [
          "Imagina 3 cayos con 6 conchas cada uno.",
          "¿Cómo compruebas 3 × 6 sin la tabla?",
        ],
        h: "Punto 3: La tabla del 3",
        a: [
          "Suma el 6 tres veces: 6 + 6 + 6 = 18.",
          "Otra forma: el doble de 6 es 12,",
          "y con otro 6 llegas a 18: 3 × 6 = 18.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: 4 cayos con 9",
          "caracoles cada uno. ¿Cuántos son?",
        ],
        h: "Punto 4: La tabla del 4",
        a: [
          "El 4 es el doble del doble.",
          "El doble de 9 es 18; el de 18 es 36.",
          "Entonces 4 × 9 = 36 caracoles.",
        ],
      },
      {
        q: [
          "Cuenta los cayos de 5 en 5: 5, 10, 15,",
          "20... ¿En qué números terminas?",
        ],
        h: "Punto 5: La tabla del 5",
        a: [
          "Terminas en 0 o en 5: 25, 30, 35...",
          "Así 5 × 7 = 35 termina en 5.",
          "Y 5 × 6 = 30 termina en 0.",
        ],
      },
      {
        q: [
          "Si 3 filas de 7 cayos son 21 cayos,",
          "¿cuántos hay en 6 filas de 7?",
        ],
        h: "Punto 6: La tabla del 6",
        a: [
          "El 6 es el doble del 3.",
          "Entonces 6 × 7 es el doble de 21.",
          "El doble de 21 es 42: 6 × 7 = 42.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuánto es 1 × 8?", o: ["8", "1", "9", "18"] },
        { q: "¿Cuánto es 2 × 7?", o: ["14", "9", "12", "27"] },
        { q: "¿Cuánto es 3 × 6?", o: ["18", "9", "12", "36"] },
        { q: "¿Cuánto es 4 × 9?", o: ["36", "13", "27", "49"] },
        { q: "¿Cómo se comprueba 3 × 6 con suma?", o: ["6 + 6 + 6", "3 + 6", "3 + 3 + 3", "6 + 6"] },
        { q: "¿Cuál es el doble del doble de 9?", o: ["36", "18", "27", "45"] },
        { q: "¿Cuánto es 5 × 7?", o: ["35", "12", "30", "57"] },
        { q: "Si 3 × 7 = 21, ¿cuánto es 6 × 7?", o: ["42", "27", "28", "24"] },
      ],
      write: [
        "Resuelve 3 × 8 con suma repetida. Escribe los pasos.",
        "Inventa un problema de cayos para 4 × 5.",
      ],
      schematic: [
        "Dibuja 7 cayos con 2 pelícanos: 2 × 7 = 14.",
        "Dibuja el doble del doble: 9, 18 y 36.",
      ],
    },
    image: [
      "Dibuja una cuadrícula de 3 × 6 casillas.",
      "Pon un punto en cada casilla: 3 × 6.",
      "Escribe la suma 6 + 6 + 6 en una fila.",
      "Deja vacía la casilla del producto.",
    ],
    summary: "En Los Roques el 1 conserva, el 2 dobla, el 4 dobla el doble, el 5 termina en 0 o 5 y el 6 dobla el 3.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "mat-c3-w1-d3",
    units: [
      {
        h: "Punto 1: Repaso de la clase pasada",
        a: [
          "La clase pasada viste que el 2 dobla,",
          "el 4 dobla el doble y el 6 dobla el 3,",
          "como en los cayos de Los Roques.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: 7 cayos con 4",
          "pelícanos cada uno. ¿Cuántos son?",
        ],
        h: "Punto 2: La tabla del 7",
        a: [
          "Suma cuatro 7: 7 + 7 = 14",
          "y 14 + 14 = 28. Así 7 × 4 = 28.",
          "Con un vecino: 7 × 5 = 35 y 35 − 7 = 28.",
        ],
      },
      {
        q: [
          "Para 8 filas de 6 cayos, ¿qué tabla que",
          "ya conoces podrías doblar?",
        ],
        h: "Punto 3: La tabla del 8",
        a: [
          "La del 4: 4 × 6 = 24.",
          "El 8 es el doble del 4.",
          "El doble de 24 es 48: 8 × 6 = 48.",
        ],
      },
      {
        q: [
          "Cuenta cayos de 9 en 9: 9, 18, 27, 36,",
          "45. ¿Qué notas? ¿Y de 10 en 10?",
        ],
        h: "Punto 4: Las tablas del 9 y del 10",
        a: [
          "Los dígitos de cada número suman 9:",
          "63 = 6 + 3, así que 9 × 7 = 63.",
          "El 10 añade un cero: 10 × 8 = 80.",
        ],
      },
      {
        q: [
          "Para 12 cayos con 8 palmeras, ¿cómo usas",
          "el 10 y el 2? ¿Y qué pasa con el 11?",
        ],
        h: "Punto 5: Las tablas del 11 y del 12",
        a: [
          "Parte el 12 en 10 y 2.",
          "10 × 8 = 80, 2 × 8 = 16: 12 × 8 = 96.",
          "El 11 repite el dígito: 11 × 6 = 66.",
        ],
      },
      {
        q: [
          "Explica a tu familia cómo hallar 12 × 6.",
          "¿Qué dices primero, luego y al final?",
        ],
        h: "Punto 6: Cómo contarlo con orden",
        a: [
          "Primero: son 12 cayos con 6 palmeras.",
          "Luego: 10 × 6 = 60 y 2 × 6 = 12.",
          "Al final sumo: 60 + 12 = 72.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuánto es 7 × 4?", o: ["28", "11", "21", "35"] },
        { q: "¿Cuánto es 8 × 6?", o: ["48", "14", "42", "54"] },
        { q: "El 8 es el doble de ¿qué número?", o: ["4", "2", "6", "3"] },
        { q: "¿Cuánto es 9 × 7?", o: ["63", "16", "56", "72"] },
        { q: "¿Cuánto es 10 × 8?", o: ["80", "18", "800", "88"] },
        { q: "¿Cómo se parte 12 × 8?", o: ["10 × 8 y 2 × 8", "12 + 8", "8 + 8 + 2", "10 + 2 + 8"] },
        { q: "¿Cuánto es 11 × 6?", o: ["66", "17", "61", "116"] },
        { q: "¿Cuánto es 12 × 6?", o: ["72", "18", "60", "66"] },
      ],
      write: [
        "Cuenta con orden cómo hallas 12 × 6.",
        "Elige una tabla y cuenta su truco con tus palabras.",
      ],
      schematic: [
        "Dibuja la flecha del doble: de 24 a 48.",
        "Dibuja 12 × 8 en dos cajas: 10 × 8 y 2 × 8.",
      ],
    },
    image: [
      "Dibuja 12 filas de 6 puntos en 2 cajas:",
      "una caja de 10 filas y otra de 2 filas.",
      "Rotula 10 × 6 = 60 en la caja grande.",
      "Deja vacías 2 × 6 y el total 12 × 6.",
    ],
    summary: "Cada tabla tiene su truco, y 12 × 6 se cuenta con orden: parto en 10 y 2, y sumo 60 + 12 = 72.",
  },
];
