/**
 * Matemática · ciclo 3 · semana 2 · nivel 6 — «Tablas del 5 al 16». Método v3 (3 días).
 * Ask First + metáfora de Venezuela: Parque Nacional Morrocoy (Falcón).
 * Datos seguros usados: cayos, playas y manglares cerca de la costa; cayos en hilera, manglar, bote.
 * Todas las cantidades de cayos, botes, niños y plantas son ejemplos imaginados.
 * d1 = panorama del 5 al 16 · d2 = cayos (5 al 8) y manglar (9 al 12) · d3 = playa (13 al 16) y contar el recorrido.
 * Todas las cuentas verificadas.
 */
export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "mat-c3-w2-d1",
    units: [
      {
        h: "Punto 1: Repaso de la clase pasada",
        a: [
          "La semana pasada contaste grupos iguales",
          "entre los cayos de Los Roques.",
          "Hoy navegas hasta Morrocoy, en Falcón.",
        ],
      },
      {
        q: [
          "Imagina 4 cayos de Morrocoy con 6 botes",
          "en cada uno. ¿Cómo los cuentas rápido?",
        ],
        h: "Punto 2: Grupos iguales y producto",
        a: [
          "Multiplicas: 4 × 6 = 24 botes.",
          "Los números que multiplicas son factores",
          "y el resultado es el producto.",
        ],
      },
      {
        q: [
          "En cada bote caben 5 niños. ¿Cuántos",
          "hay en 9 botes? ¿En qué termina?",
        ],
        h: "Punto 3: Tablas del 5 al 8",
        a: [
          "5 × 9 = 45 niños. La tabla del 5",
          "termina siempre en 0 o en 5.",
          "Para 6 × 7, dobla 3 × 7 = 21: da 42.",
        ],
      },
      {
        q: [
          "¿Es igual 9 botes con 8 niños cada uno",
          "que 8 botes con 9 niños cada uno?",
        ],
        h: "Punto 4: Tablas del 9 al 12",
        a: [
          "Sí: 9 × 8 = 72 y 8 × 9 = 72.",
          "Cambiar el orden de los factores",
          "no cambia el producto.",
        ],
      },
      {
        q: [
          "En el manglar imagina 12 filas de 12",
          "plantas. ¿Cómo las cuentas?",
        ],
        h: "Punto 5: Los productos más grandes",
        a: [
          "Parte uno de los 12 en 10 y 2:",
          "12 × 10 = 120 y 12 × 2 = 24.",
          "120 + 24 = 144 plantas.",
        ],
      },
      {
        q: [
          "En la playa hay 13 botes con 4 niños",
          "cada uno. ¿Qué dos tablas te ayudan?",
        ],
        h: "Punto 6: Tablas del 13 al 16",
        a: [
          "Parte el 13 en 10 y 3: 10 × 4 = 40",
          "y 3 × 4 = 12. Suma: 40 + 12 = 52.",
          "El 14 es el doble de 7; el 16, de 8.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuánto es 4 × 6?", o: ["24", "10", "20", "46"] },
        { q: "¿Cómo se llama el resultado de multiplicar?", o: ["Producto", "Factor", "Cayo", "Resto"] },
        { q: "¿En qué termina la tabla del 5?", o: ["En 0 o en 5", "En 2 o en 7", "En 3 o en 8", "En 1 o en 9"] },
        { q: "¿Cuánto es 6 × 7?", o: ["42", "36", "48", "40"] },
        { q: "Si 9 × 8 = 72, ¿cuánto es 8 × 9?", o: ["72", "17", "64", "81"] },
        { q: "¿Cuánto es 12 × 12?", o: ["144", "124", "132", "154"] },
        { q: "¿Cuánto es 13 × 4?", o: ["52", "43", "40", "62"] },
        { q: "El 16 es el doble de ¿qué número?", o: ["8", "7", "6", "4"] },
      ],
      write: [
        "Cuenta qué es un factor y qué es un producto.",
        "Explica cómo hallas 13 × 4 con 10 y 3.",
      ],
      schematic: [
        "Dibuja 4 cayos con 6 botes y escribe 4 × 6.",
        "Dibuja 13 × 4 en dos cajas: 10 × 4 y 3 × 4.",
      ],
    },
    image: [
      "Dibuja una cuadrícula de 4 × 6 casillas.",
      "Escribe al lado 4 × 6 = 24.",
      "Rotula factores y producto con flechas.",
      "Deja vacía una casilla para 13 × 4.",
    ],
    summary: "En Morrocoy las tablas grandes se arman con tablas que ya conoces.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "mat-c3-w2-d2",
    units: [
      {
        h: "Punto 1: Repaso de la clase pasada",
        a: [
          "La clase pasada viste Morrocoy de lejos:",
          "4 × 6 = 24 y 13 × 4 = 52.",
          "Hoy te acercas a los cayos y al manglar.",
        ],
      },
      {
        q: [
          "Cada cayo de la hilera tiene 5 botes.",
          "¿Cuántos hay en 1, 2, 3 y 4 cayos?",
        ],
        h: "Punto 2: Un patrón en la tabla del 5",
        a: [
          "Cuentas 5, 10, 15 y 20: terminan",
          "en 0 o en 5. Eso es un patrón,",
          "una regla que se repite.",
        ],
      },
      {
        q: [
          "En 7 cayos hay 6 botes en cada cayo.",
          "¿Cuántos botes hay en total?",
        ],
        h: "Punto 3: Un problema con la tabla del 6",
        a: [
          "Son siete grupos de seis: 7 × 6.",
          "Piensa 3 × 7 = 21 y dóblalo:",
          "21 + 21 = 42 botes.",
        ],
      },
      {
        q: [
          "Si 4 cayos con 6 botes dan 24 botes,",
          "¿cuántos botes dan 8 cayos con 6?",
        ],
        h: "Punto 4: Dobles para el 8",
        a: [
          "El 8 es el doble del 4.",
          "Dobla el producto: 24 + 24 = 48.",
          "Entonces 8 × 6 = 48 botes.",
        ],
      },
      {
        q: [
          "En el manglar hay 9 filas de 8 plantas.",
          "¿Y 8 filas de 9 plantas, da otro total?",
        ],
        h: "Punto 5: El orden no cambia el producto",
        a: [
          "Da lo mismo: 9 × 8 = 72 y 8 × 9 = 72.",
          "Son las mismas plantas al revés.",
          "Si sabes 8 × 9, ya sabes 9 × 8.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: en el manglar",
          "hay 8 grupos de 10 plantas. ¿80 u 800?",
        ],
        h: "Punto 6: Multiplicar por 10",
        a: [
          "Son 80: ocho decenas.",
          "Una decena es un grupo de 10.",
          "Y 10 × 12 = 120: doce decenas.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿En qué terminan los productos del 5?", o: ["En 0 o en 5", "En 2 o en 7", "En 3 o en 8", "En 1 o en 9"] },
        { q: "¿Qué es un patrón?", o: ["Una regla que se repite", "Un número solo", "Un tipo de bote", "Un signo de resta"] },
        { q: "¿Cuántos botes hay en 7 cayos de 6?", o: ["42", "36", "13", "76"] },
        { q: "Si 3 × 7 = 21, ¿cuánto es 6 × 7?", o: ["42", "27", "28", "24"] },
        { q: "¿Cuánto es 8 × 6?", o: ["48", "14", "42", "54"] },
        { q: "Si 9 × 8 = 72, ¿cuánto es 8 × 9?", o: ["72", "17", "64", "81"] },
        { q: "¿Cuánto valen ocho decenas?", o: ["80", "8", "800", "88"] },
        { q: "¿Qué es una decena?", o: ["Un grupo de 10", "Un grupo de 100", "Un grupo de 2", "Un solo bote"] },
      ],
      write: [
        "Explica cómo hallas 8 × 6 con 4 × 6 = 24.",
        "Explica por qué 10 × 8 vale 80 y no 800.",
      ],
      schematic: [
        "Dibuja 7 cayos con 6 botes y escribe 7 × 6.",
        "Dibuja 8 grupos de 10 plantas: 8 × 10 = 80.",
      ],
    },
    image: [
      "Dibuja una cuadrícula de 7 × 6 casillas.",
      "Pon un punto en cada casilla.",
      "Escribe al lado: 7 × 6 = 42.",
      "Deja vacía una caja: 3 × 7 y su doble.",
    ],
    summary: "Entre los cayos y el manglar usamos patrones y dobles, y el orden no cambia el producto.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "mat-c3-w2-d3",
    units: [
      {
        h: "Punto 1: Repaso de la clase pasada",
        a: [
          "La clase pasada, en los cayos y el manglar,",
          "hallaste 7 × 6 = 42 y 8 × 9 = 72.",
          "Hoy pisas la playa y cuentas el recorrido.",
        ],
      },
      {
        q: [
          "Imagina 13 toallas en la playa.",
          "Cada una tiene 5 niños. ¿Cuántos son?",
        ],
        h: "Punto 2: El 13 se parte en 10 y 3",
        a: [
          "Parte el 13 en 10 y 3.",
          "10 × 5 = 50 y 3 × 5 = 15.",
          "50 + 15 = 65 niños.",
        ],
      },
      {
        q: [
          "En la orilla hay 14 botes con 7 niños.",
          "Si 7 × 7 = 49, ¿cómo hallas 14 × 7?",
        ],
        h: "Punto 3: El 14 y el 16 son dobles",
        a: [
          "El 14 es el doble de 7: 49 + 49 = 98.",
          "El 16 es el doble de 8.",
          "Si 8 × 6 = 48, entonces 16 × 6 = 96.",
        ],
      },
      {
        q: [
          "En la playa hay 15 toallas con 8 niños",
          "cada una. Pista: 15 es tres veces 5.",
        ],
        h: "Punto 4: El 15 es tres veces el 5",
        a: [
          "Primero 5 × 8 = 40.",
          "Tres veces 40: 40 + 40 + 40 = 120.",
          "Entonces 15 × 8 = 120 niños.",
        ],
      },
      {
        q: [
          "Pagas 5.000 bolívares por 5 helados de",
          "800 cada uno. ¿Cuánto te devuelven?",
        ],
        h: "Punto 5: Multiplicar con bolívares",
        a: [
          "5 × 800 = 4.000 bolívares.",
          "Luego restas: 5.000 − 4.000 = 1.000.",
          "Te devuelven 1.000 bolívares.",
        ],
      },
      {
        q: [
          "Un amigo no vino a Morrocoy. ¿Cómo le",
          "cuentas, en orden, lo que aprendiste?",
        ],
        h: "Punto 6: Cuenta tu recorrido en orden",
        a: [
          "Primero di la cuenta: 7 × 8.",
          "Luego el truco: 49 + 7 = 56.",
          "Recorre cayos, manglar y playa.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuánto es 13 × 5?", o: ["65", "18", "53", "55"] },
        { q: "¿Cuánto es 14 × 7?", o: ["98", "21", "49", "84"] },
        { q: "Si 8 × 6 = 48, ¿cuánto es 16 × 6?", o: ["96", "22", "86", "106"] },
        { q: "¿Cuánto es 15 × 8?", o: ["120", "23", "110", "130"] },
        { q: "El 14 es el doble de ¿qué número?", o: ["7", "5", "6", "4"] },
        { q: "¿Cuánto cuestan 5 helados de 800?", o: ["4.000 bolívares", "4.800 bolívares", "400 bolívares", "805 bolívares"] },
        { q: "De 5.000 pagas 4.000. ¿Cuánto devuelven?", o: ["1.000 bolívares", "9.000 bolívares", "500 bolívares", "4.000 bolívares"] },
        { q: "¿Qué dices primero en tu recorrido?", o: ["La cuenta", "El truco", "La comprobación", "El final"] },
      ],
      write: [
        "Explica cómo hallas 14 × 7 con 7 × 7 = 49.",
        "Cuenta a un amigo cómo hallas 7 × 8.",
      ],
      schematic: [
        "Dibuja 13 × 5 en dos cajas: 10 × 5 y 3 × 5.",
        "Dibuja 5 helados de 800 y escribe el total.",
      ],
    },
    image: [
      "Dibuja 13 filas de 5 puntos en 2 cajas.",
      "Una caja de 10 filas y otra de 3 filas.",
      "Rotula 10 × 5 = 50 en la caja grande.",
      "Deja vacías 3 × 5 y el total 13 × 5.",
    ],
    summary: "En la playa el 13 se parte en 10 y 3, el 14 y el 16 son dobles y el 15 es tres veces 5.",
  },
];
