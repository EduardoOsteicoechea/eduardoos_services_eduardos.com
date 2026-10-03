/**
 * Matemática · ciclo 3 · semana 2 · nivel 6 — «Tablas del 5 al 16».
 * Ask First + metáfora de Venezuela: Parque Nacional Morrocoy (Falcón).
 * Datos seguros usados: cayos, playas y manglares cerca de la costa; cayos en hilera, manglar, bote.
 * Todas las cantidades de cayos, botes, niños y plantas son ejemplos imaginados.
 * Todas las cuentas verificadas.
 */
export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "mat-c3-w2-d1",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "La semana pasada recorriste las tablas",
          "del 1 al 12 y juntaste grupos iguales.",
          "Hoy subes a un bote rumbo a Morrocoy,",
          "en Falcón, para llegar hasta el 16.",
        ],
      },
      {
        q: [
          "Imagina 4 cayos con 6 botes en cada uno.",
          "¿Cómo los cuentas sin ir de uno en uno?",
        ],
        h: "Punto 2: Grupos iguales y producto",
        a: [
          "Multiplicas: 4 × 6 = 24 botes.",
          "Los números que se multiplican se llaman",
          "factores, y el resultado es el producto.",
        ],
      },
      {
        q: [
          "Imagina 9 botes con 5 niños en cada uno.",
          "¿Cuántos niños son? ¿En qué termina?",
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
          "Imagina 12 cayos con 12 botes cada uno.",
          "¿Cuántos son? ¿Cómo lo puedes partir?",
        ],
        h: "Punto 5: Los productos más grandes",
        a: [
          "Parte uno de los 12 en 10 y 2:",
          "12 × 10 = 120 y 12 × 2 = 24.",
          "120 + 24 = 144 botes en total.",
          "Ojo: 11 × 11 = 121, no 111.",
        ],
      },
      {
        q: [
          "Imagina 13 botes con 4 niños cada uno.",
          "¿Qué dos tablas fáciles te ayudan?",
        ],
        h: "Punto 6: Tablas del 13 al 16",
        a: [
          "Parte el 13 en 10 y 3.",
          "10 × 4 = 40 y 3 × 4 = 12.",
          "40 + 12 = 52 niños.",
          "El 14 es el doble de 7; el 16, de 8.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuánto es 5 × 9?", o: ["45", "40", "50", "54"] },
        { q: "¿En qué termina la tabla del 5?", o: ["En 0 o en 5", "En 2 o en 7", "En 3 o en 8", "En 1 o en 9"] },
        { q: "¿Cuánto es 6 × 7?", o: ["42", "36", "48", "40"] },
        { q: "Si 9 × 8 = 72, ¿cuánto es 8 × 9?", o: ["72", "17", "64", "81"] },
        { q: "¿Cuánto es 12 × 12?", o: ["144", "124", "132", "154"] },
        { q: "¿Cuánto es 11 × 11?", o: ["121", "111", "22", "110"] },
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
      "Dibuja una hilera de 4 cayos de Morrocoy.",
      "En cada cayo dibuja 6 botes.",
      "Escribe al lado: 4 × 6 = 24.",
      "Rotula los factores y el producto.",
    ],
    summary: "En Morrocoy las tablas grandes se arman con tablas que ya conoces.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "mat-c3-w2-d2",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer subiste al bote rumbo a Morrocoy",
          "y viste que las tablas son piezas.",
          "Hoy visitas los cayos del 5 al 8.",
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
          "En 12 cayos hay 5 × 12 = 60 botes.",
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
          "Comprueba: 6 × 7 también da 42.",
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
          "Imagina 7 cayos con 8 botes cada uno.",
          "¿Cómo compruebas cuántos botes son?",
        ],
        h: "Punto 5: La tabla del 7 con dobles",
        a: [
          "Dobla 7 × 4 = 28: 28 + 28 = 56.",
          "Otra forma: 7 × 7 = 49 y 49 + 7 = 56.",
          "Entonces 7 × 8 = 56 botes.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: un guía dice",
          "que 12 cayos de 5 botes son 50. ¿Cierto?",
        ],
        h: "Punto 6: Comprueba, no adivines",
        a: [
          "5 × 10 = 50, y faltan 2 cayos de 5.",
          "2 × 5 = 10, y 50 + 10 = 60 botes.",
          "Nunca adivines: usa un doble o un patrón.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿En qué terminan los productos del 5?", o: ["En 0 o en 5", "En 2 o en 7", "En 3 o en 8", "En 1 o en 9"] },
        { q: "¿Cuánto es 5 × 12?", o: ["60", "50", "55", "17"] },
        { q: "¿Cuántos botes hay en 7 cayos de 6?", o: ["42", "36", "13", "76"] },
        { q: "Si 3 × 7 = 21, ¿cuánto es 6 × 7?", o: ["42", "27", "28", "24"] },
        { q: "¿Cuánto es 8 × 6?", o: ["48", "14", "42", "54"] },
        { q: "¿Cuánto es 7 × 8?", o: ["56", "15", "49", "63"] },
        { q: "¿Qué es un patrón?", o: ["Una regla que se repite", "Un número solo", "Un tipo de bote", "Un signo de resta"] },
        { q: "Si 7 × 7 = 49, ¿cuánto es 7 × 8?", o: ["56", "55", "57", "42"] },
      ],
      write: [
        "Explica cómo hallas 8 × 6 con 4 × 6 = 24.",
        "Resuelve 7 × 8 con un doble. Escribe los pasos.",
      ],
      schematic: [
        "Dibuja 7 cayos con 6 botes y escribe 7 × 6.",
        "Dibuja la flecha del doble: de 4 × 6 a 8 × 6.",
      ],
    },
    image: [
      "Dibuja una hilera de 7 cayos.",
      "Pon 6 botes en cada cayo.",
      "Escribe al lado: 7 × 6 = 42.",
      "Comprueba contando de 6 en 6 hasta 42.",
    ],
    summary: "Entre los cayos, del 5 al 8, usamos patrones y dobles para no adivinar.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "mat-c3-w2-d3",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer contaste botes: 6 × 7 = 42",
          "y 8 × 6 = 48. Hoy entras al manglar",
          "de Morrocoy, del 9 al 12.",
        ],
      },
      {
        q: [
          "Un manglar imaginario tiene 9 filas de 8",
          "plantas. ¿Y 8 filas de 9, da otro total?",
        ],
        h: "Punto 2: El orden no cambia el producto",
        a: [
          "Da lo mismo: 9 × 8 = 72 y 8 × 9 = 72.",
          "Son las mismas plantas al revés.",
          "Si sabes 8 × 9, ya sabes 9 × 8.",
        ],
      },
      {
        q: [
          "En el manglar imagina 8 grupos de 10",
          "plantas. ¿Son 80 o son 800?",
        ],
        h: "Punto 3: Multiplicar por 10",
        a: [
          "Son 80: ocho decenas.",
          "Una decena es un grupo de 10.",
          "Ocho decenas valen 80, no 800.",
          "Y 10 × 12 = 120: doce decenas.",
        ],
      },
      {
        q: [
          "Piensa en 11 filas de 11 plantas.",
          "¿Seguirá repitiéndose el dígito?",
        ],
        h: "Punto 4: Los productos del 11",
        a: [
          "Hasta 11 × 9 = 99 el dígito se repite.",
          "Pero 11 × 11 = 121, no 111.",
          "Para 12 × 11, suma 12 × 10 = 120",
          "y 12 × 1 = 12: 120 + 12 = 132.",
        ],
      },
      {
        q: [
          "¿Cómo usas la tabla del 10 y la del 2",
          "para hallar 12 filas de 12 plantas?",
        ],
        h: "Punto 5: El 12 se parte en 10 y 2",
        a: [
          "Parte uno de los 12 en 10 y 2.",
          "12 × 10 = 120 y 12 × 2 = 24.",
          "120 + 24 = 144 plantas.",
        ],
      },
      {
        q: [
          "Imagina 12 botes que entran al manglar,",
          "con 9 turistas cada uno. ¿Cuántos son?",
        ],
        h: "Punto 6: Un problema de manglar",
        a: [
          "Son doce grupos de nueve: 12 × 9.",
          "Parte el 12: 10 × 9 = 90 y 2 × 9 = 18.",
          "90 + 18 = 108 turistas.",
          "Comprueba: 9 × 12 también da 108.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuánto es 12 × 12?", o: ["144", "121", "122", "24"] },
        { q: "¿Cuánto es 10 × 8?", o: ["80", "800", "18", "90"] },
        { q: "¿Cuánto valen ocho decenas?", o: ["80", "8", "800", "88"] },
        { q: "¿Cuánto es 11 × 11?", o: ["121", "111", "22", "110"] },
        { q: "¿Cuánto es 12 × 11?", o: ["132", "122", "123", "144"] },
        { q: "¿Cuántos turistas son 12 × 9?", o: ["108", "90", "21", "118"] },
        { q: "Si 9 × 8 = 72, ¿cuánto es 8 × 9?", o: ["72", "17", "64", "81"] },
        { q: "¿Qué es una decena?", o: ["Un grupo de 10", "Un grupo de 100", "Un grupo de 2", "Un solo bote"] },
      ],
      write: [
        "Explica por qué 10 × 8 vale 80 y no 800.",
        "Resuelve 12 × 9 partiendo el 12 en 10 y 2.",
      ],
      schematic: [
        "Dibuja 12 × 9 en dos cajas: 10 × 9 y 2 × 9.",
        "Dibuja 8 grupos de 10 plantas: 8 × 10 = 80.",
      ],
    },
    image: [
      "Dibuja un manglar con 8 filas.",
      "En cada fila pon 10 plantas.",
      "Escribe al lado: 8 × 10 = 80.",
      "Rotula «ocho decenas» y «80 plantas».",
    ],
    summary: "En el manglar el orden no cambia el producto, y el 12 se parte en 10 y 2.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "mat-c3-w2-d4",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer, en el manglar, viste que el orden",
          "no cambia el producto: 12 × 12 = 144.",
          "Hoy pisas la playa de Morrocoy: 13 a 16.",
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
        h: "Punto 3: El 14 es el doble del 7",
        a: [
          "El 14 es el doble de 7.",
          "Dobla el producto: 49 + 49 = 98.",
          "Comprueba: 10 × 7 = 70, 4 × 7 = 28,",
          "y 70 + 28 = 98.",
        ],
      },
      {
        q: [
          "Imagina 16 botes con 6 niños cada uno.",
          "Pista: 8 × 6 = 48. ¿Cuántos niños son?",
        ],
        h: "Punto 4: El 16 es el doble del 8",
        a: [
          "El 16 es el doble de 8.",
          "Dobla 48: 48 + 48 = 96.",
          "Entonces 16 × 6 = 96 niños.",
        ],
      },
      {
        q: [
          "En la playa hay 15 toallas con 8 niños",
          "cada una. Pista: 15 es tres veces 5.",
        ],
        h: "Punto 5: El 15 es tres veces el 5",
        a: [
          "Primero 5 × 8 = 40.",
          "Tres veces 40: 40 + 40 + 40 = 120.",
          "Entonces 15 × 8 = 120 niños.",
          "No sumes 15 + 8: eso no multiplica.",
        ],
      },
      {
        q: [
          "En la playa pagas 5.000 por 5 helados",
          "de 800 bolívares. ¿Cuánto te devuelven?",
        ],
        h: "Punto 6: Multiplicar con bolívares",
        a: [
          "Primero: 5 × 800 = 4.000 bolívares.",
          "Piensa 5 × 8 = 40 y añade dos ceros.",
          "Luego resta: 5.000 − 4.000 = 1.000.",
          "Te devuelven 1.000 bolívares.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuánto es 13 × 5?", o: ["65", "18", "53", "55"] },
        { q: "¿Cuánto es 14 × 7?", o: ["98", "21", "49", "84"] },
        { q: "¿Cuánto es 16 × 6?", o: ["96", "22", "86", "106"] },
        { q: "¿Cuánto es 15 × 8?", o: ["120", "23", "110", "130"] },
        { q: "El 14 es el doble de ¿qué número?", o: ["7", "5", "6", "4"] },
        { q: "¿Cuánto cuestan 5 helados de 800?", o: ["4.000 bolívares", "4.800 bolívares", "400 bolívares", "805 bolívares"] },
        { q: "¿Cuánto devuelven de 5.000 por 4.000?", o: ["1.000 bolívares", "9.000 bolívares", "500 bolívares", "4.000 bolívares"] },
        { q: "¿Cómo se parte 13 × 5?", o: ["10 × 5 y 3 × 5", "13 + 5", "10 + 3 + 5", "13 × 3"] },
      ],
      write: [
        "Explica cómo hallas 14 × 7 con 7 × 7 = 49.",
        "Halla el total de 3 helados de 800 bolívares.",
      ],
      schematic: [
        "Dibuja 13 × 5 en dos cajas: 10 × 5 y 3 × 5.",
        "Dibuja 5 helados de 800 y escribe el total.",
      ],
    },
    image: [
      "Dibuja una playa con 13 toallas.",
      "Pon 5 niños en cada toalla.",
      "Escribe al lado: 13 × 5 = 65.",
      "Rotula las cajas 10 × 5 y 3 × 5.",
    ],
    summary: "En la playa el 13 se parte en 10 y 3, el 14 y el 16 son dobles y el 15 es tres veces 5.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "mat-c3-w2-d5",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer, en la playa de Morrocoy, partiste",
          "el 13 en 10 y 3 y doblaste el 14 y el 16.",
          "Hoy haces el recorrido completo en bote.",
        ],
      },
      {
        q: [
          "Primer cayo: las tablas del 5 al 8.",
          "¿Qué trucos usaste allí?",
        ],
        h: "Punto 2: Del 5 al 8",
        a: [
          "El 5 termina en 0 o en 5: 5 × 12 = 60.",
          "El 6 dobla el 3: 6 × 7 = 42.",
          "El 8 dobla el 4: 8 × 6 = 48.",
          "Y 7 × 8 = 56, porque 49 + 7 = 56.",
        ],
      },
      {
        q: [
          "Entras al manglar: tablas del 9 al 12.",
          "¿Qué cuidados tuviste?",
        ],
        h: "Punto 3: Del 9 al 12",
        a: [
          "El orden no cambia: 9 × 8 = 8 × 9 = 72.",
          "10 × 8 = 80: ocho decenas, no 800.",
          "11 × 11 = 121, no 111.",
          "12 × 12 = 120 + 24 = 144.",
        ],
      },
      {
        q: [
          "Llegas a la playa: tablas del 13 al 16.",
          "¿Qué atajos usaste?",
        ],
        h: "Punto 4: Del 13 al 16",
        a: [
          "Partir el 13 en 10 y 3: 13 × 5 = 65.",
          "Doblar: 14 × 7 = 98 y 16 × 6 = 96.",
          "Triplicar el 5: 15 × 8 = 120.",
          "Con bolívares: 5 × 800 = 4.000.",
        ],
      },
      {
        q: [
          "Tu cuaderno de viaje por Morrocoy anota",
          "6 × 7, 9 × 8 y 12 × 12. ¿Cómo lo lees?",
        ],
        h: "Punto 5: Cómo contarlo con orden",
        a: [
          "Cada fila trae una cuenta y su producto.",
          "Lees: «seis por siete, cuarenta y dos».",
          "9 × 8 = 72 y 12 × 12 = 144.",
          "Al final compruebas con un doble.",
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
          "Luego di el truco: 7 × 4 = 28, doble 56.",
          "Al final comprueba: 49 + 7 = 56.",
          "Así tu amigo puede repetirlo contigo.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuánto es 7 × 8?", o: ["56", "49", "15", "63"] },
        { q: "¿Cuánto es 9 × 8?", o: ["72", "17", "81", "64"] },
        { q: "¿Cuánto es 12 × 12?", o: ["144", "24", "124", "121"] },
        { q: "¿Cuánto es 15 × 8?", o: ["120", "23", "110", "115"] },
        { q: "¿Cuánto es 14 × 7?", o: ["98", "21", "84", "49"] },
        { q: "¿Cuánto es 5 × 800 en bolívares?", o: ["4.000 bolívares", "4.800 bolívares", "400 bolívares", "805 bolívares"] },
        { q: "¿Qué trae cada fila de la tabla?", o: ["Una cuenta y su producto", "Solo colores", "Solo el signo ×", "Un nombre de país"] },
        { q: "¿Qué dices primero en tu recorrido?", o: ["La cuenta", "El truco", "La comprobación", "El final"] },
      ],
      write: [
        "Explica cómo lees la fila 6 × 7 = 42.",
        "Escribe tres trucos de la semana y un ejemplo.",
      ],
      schematic: [
        "Dibuja una tabla de dos columnas: cuenta y producto.",
        "Dibuja un mapa con tres paradas: cayos, manglar y playa.",
      ],
    },
    image: [
      "Dibuja un mapa de Morrocoy en bote.",
      "Marca: cayos, manglar y playa.",
      "Bajo cada parada escribe una cuenta:",
      "7 × 8 = 56, 12 × 12 = 144, 15 × 8 = 120.",
    ],
    summary: "Del 5 al 16 recorriste Morrocoy con grupos iguales, trucos y comprobaciones, y contaste todo en orden.",
  },
];
