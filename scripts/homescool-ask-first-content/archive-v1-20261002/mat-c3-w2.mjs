/**
 * Matemática · ciclo 3 · semana 2 · nivel 6 — "Tablas del 5 al 16".
 * Narrativa inductiva "pregunta primero". Todas las cuentas verificadas.
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "mat-c3-w2-d1",
    opening: "¿Puedes hallar 13 × 4 si solo sabes las tablas hasta el 12?",
    repaso: null,
    units: [
      {
        h: "Punto 1: Las tablas son como piezas",
        a: [
          "Sí se puede: se arma con tablas que ya conoces.",
          "Multiplicar es juntar grupos del mismo tamaño.",
          "Los factores se multiplican y dan el producto.",
          "7 × 6 son siete grupos de seis, o siete filas de seis.",
          "Esta semana vamos del 5 al 16, con trucos y sin adivinar.",
        ],
      },
      {
        q: [
          "Empecemos con el 5, el 6, el 7 y el 8. ¿Qué trucos",
          "recuerdas de las tablas?",
        ],
        h: "Punto 2: Tablas del 5 al 8",
        a: [
          "La tabla del 5 termina en 0 o en 5: 5 × 9 = 45.",
          "Para 6 × 7, dobla 3 × 7 = 21 y obtienes 42.",
          "Para 8 × 5, dobla 4 × 5 = 20 y obtienes 40.",
          "No lo mezcles: 6 × 7 = 42, pero 6 × 6 = 36.",
        ],
      },
      {
        q: [
          "¿Por qué crees que 9 × 8 y 8 × 9 dan lo mismo?",
        ],
        h: "Punto 3: Tablas del 9 al 12",
        a: [
          "Cambiar el orden de los factores no cambia el producto.",
          "9 × 8 = 72 y 8 × 9 = 72.",
          "Puedes elegir la tabla que recuerdes mejor.",
          "Y 12 × 10 = 120: son diez grupos de doce, no 1.200.",
        ],
      },
      {
        q: [
          "¿Cuánto crees que son 11 × 11 y 12 × 12?",
          "Piensa antes de mirar abajo.",
        ],
        h: "Punto 4: Los productos más grandes",
        a: [
          "11 × 11 = 121. No repite el dígito, no es 111.",
          "12 × 11 = 132.",
          "12 × 12 = 144: 12 × 10 = 120 y 12 × 2 = 24.",
          "120 + 24 = 144.",
        ],
      },
      {
        q: [
          "Sigamos con 13 × 4. ¿Qué dos tablas fáciles podrías",
          "usar para armarlo?",
        ],
        h: "Punto 5: Tablas del 13 al 16",
        a: [
          "Parte el 13 en 10 y 3: 10 × 4 = 40 y 3 × 4 = 12.",
          "40 + 12 = 52, así que 13 × 4 = 52.",
          "14 es el doble de 7 y 16 es el doble de 8.",
          "15 es tres veces 5.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuánto es 5 × 9?", o: ["45", "40", "50", "54"] },
        { q: "¿En qué terminan los productos de la tabla del 5?", o: ["En 0 o en 5", "En 2 o en 7", "En 3 o en 8", "En 1 o en 9"] },
        { q: "¿Cuánto es 6 × 7?", o: ["42", "36", "48", "40"] },
        { q: "¿Por qué 9 × 8 y 8 × 9 dan lo mismo?", o: ["Cambiar el orden no cambia el producto", "Porque 9 y 8 son iguales", "Porque siempre se suma 1", "Porque 8 es un cero"] },
        { q: "¿Cuánto es 12 × 12?", o: ["144", "124", "132", "154"] },
        { q: "¿Cuánto es 13 × 4?", o: ["52", "43", "40", "62"] },
        { q: "¿Cuánto es 11 × 11?", o: ["121", "111", "22", "110"] },
        { q: "El 16 es el doble de ¿qué número?", o: ["8", "7", "6", "4"] },
      ],
      write: [
        "Escribe la tabla del 5, desde 5 × 1 hasta 5 × 12.",
        "Explica con tus palabras cómo hallas 13 × 4.",
      ],
      schematic: [
        "Dibuja 7 filas con 6 puntos y escribe 7 × 6 = 42.",
        "Dibuja 13 × 4 en dos cajas: 10 × 4 y 3 × 4.",
      ],
    },
    image: [
      "Dibuja 8 filas con 5 puntos en cada fila.",
      "Escribe al lado: 8 × 5 = 40.",
      "Rotula las filas y los puntos de cada fila.",
      "Revisa que todas las filas tengan la misma cantidad.",
    ],
    summary: "Las tablas grandes se arman con tablas conocidas. Hoy vimos trucos del 5 al 16.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "mat-c3-w2-d2",
    opening: ayer,
    repaso: [
      "Ayer vimos que las tablas son como piezas.",
      "Multiplicar es juntar grupos del mismo tamaño.",
      "Hoy nos quedamos con el bloque del 5 al 8.",
    ],
    units: [
      {
        q: [
          "Escribe la tabla del 5: 5, 10, 15, 20... ¿Qué patrón",
          "ves en los productos?",
        ],
        h: "Punto 1: Un patrón en la tabla del 5",
        a: [
          "Terminan en 0 o en 5: 5, 10, 15, 20, 25, 30...",
          "Un patrón es una regla que se repite.",
          "Por eso 5 × 11 = 55 y 5 × 12 = 60.",
        ],
      },
      {
        q: [
          "En el salón, 7 niños llevan 6 libros cada uno.",
          "¿Cuántos libros hay en total?",
        ],
        h: "Punto 2: Un problema con la tabla del 6",
        a: [
          "Son siete grupos de seis libros: 7 × 6.",
          "Piensa 3 × 7 = 21 y dobla: 21 + 21 = 42.",
          "Hay 42 libros en total.",
          "Comprueba: 6 × 7 también da 42.",
        ],
      },
      {
        q: [
          "Sigamos con el 8. Si 4 × 6 = 24, ¿cuánto es 8 × 6?",
        ],
        h: "Punto 3: Dobles para el 8",
        a: [
          "El 8 es el doble del 4.",
          "Dobla el producto: 24 + 24 = 48.",
          "Entonces 8 × 6 = 48.",
          "Con 8 × 5 pasa igual: 4 × 5 = 20 y el doble es 40.",
        ],
      },
      {
        q: [
          "Imagina que debes hallar 7 × 8. ¿Cómo lo",
          "comprobarías?",
        ],
        h: "Punto 4: La tabla del 7 con dobles y vecinos",
        a: [
          "Dobla 7 × 4 = 28: 28 + 28 = 56.",
          "Entonces 7 × 8 = 56.",
          "Otra forma: 7 × 7 = 49, y 49 + 7 = 56.",
        ],
      },
      {
        q: [
          "Ana dice que 5 × 12 = 50 porque «suena bien».",
          "¿Cómo lo comprobarías?",
        ],
        h: "Punto 5: Comprueba, no adivines",
        a: [
          "Con el patrón: 5 × 10 = 50, y faltan 2 grupos de 5.",
          "2 × 5 = 10, y 50 + 10 = 60.",
          "Entonces 5 × 12 = 60.",
          "Nunca adivines: usa una suma, un doble o un patrón.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿En qué terminan los productos de la tabla del 5?", o: ["En 0 o en 5", "En 2 o en 7", "En 3 o en 8", "En 1 o en 9"] },
        { q: "¿Cuánto es 5 × 12?", o: ["60", "50", "55", "17"] },
        { q: "¿Cuántos libros llevan 7 niños con 6 libros cada uno?", o: ["42", "36", "13", "76"] },
        { q: "Si 3 × 7 = 21, ¿cuánto es 6 × 7?", o: ["42", "27", "28", "24"] },
        { q: "¿Cuánto es 8 × 6?", o: ["48", "14", "42", "54"] },
        { q: "Si 4 × 5 = 20, ¿cuánto es 8 × 5?", o: ["40", "25", "24", "28"] },
        { q: "¿Cuánto es 7 × 8?", o: ["56", "15", "49", "63"] },
        { q: "¿Qué sirve para comprobar un producto si dudas?", o: ["Una suma repetida o un doble", "Adivinar rápido", "Borrar el signo", "Cambiar los números"] },
      ],
      write: [
        "Explica cómo hallas 8 × 7 con el doble de 4 × 7.",
        "Resuelve 7 × 3 con una suma repetida. Escribe los pasos.",
      ],
      schematic: [
        "Dibuja 7 niños con 6 libros cada uno y escribe 7 × 6.",
        "Dibuja la flecha del doble: de 4 × 6 = 24 a 8 × 6 = 48.",
      ],
    },
    image: [
      "Dibuja 7 mochilas con 6 libros en cada una.",
      "Escribe al lado: 7 × 6 = 42.",
      "Rotula cuántos grupos hay y cuántos libros en cada grupo.",
      "Comprueba contando de 6 en 6 hasta llegar a 42.",
    ],
    summary: "En el bloque del 5 al 8 usamos patrones, dobles y comprobaciones para no adivinar.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "mat-c3-w2-d3",
    opening: ayer,
    repaso: [
      "Ayer practicamos patrones y dobles del 5 al 8.",
      "Vimos que 6 × 7 = 42 y que 8 × 6 = 48.",
      "Hoy pasamos al bloque del 9 al 12.",
    ],
    units: [
      {
        q: [
          "Si 9 × 8 = 72, ¿cuánto crees que es 8 × 9?",
        ],
        h: "Punto 1: El orden no cambia el producto",
        a: [
          "También 72: son los mismos grupos contados al revés.",
          "Cambiar el orden de los factores no cambia el producto.",
          "Puedes elegir la tabla que mejor recuerdes.",
          "Si sabes 8 × 9, ya sabes 9 × 8.",
        ],
      },
      {
        q: [
          "¿Cuánto crees que es 10 × 8? ¿80 u 800?",
        ],
        h: "Punto 2: Multiplicar por 10",
        a: [
          "Es 80: son diez grupos de ocho.",
          "También son ocho grupos de diez, o sea ocho decenas.",
          "Ocho decenas valen 80, no 800.",
          "Y 10 × 12 = 120: doce grupos de diez.",
        ],
      },
      {
        q: [
          "Piensa en 11 × 11. ¿Seguirá repitiéndose el dígito?",
        ],
        h: "Punto 3: Los productos del 11",
        a: [
          "No siempre: 11 × 11 = 121.",
          "Hasta 11 × 9 = 99 el dígito sí se repite.",
          "Para 12 × 11: 12 × 10 = 120 y 12 × 1 = 12.",
          "120 + 12 = 132.",
        ],
      },
      {
        q: [
          "Para 12 × 12, ¿cómo usarías la tabla del 10 y la",
          "del 2?",
        ],
        h: "Punto 4: El 12 se parte en 10 y 2",
        a: [
          "Parte el segundo 12 en 10 y 2.",
          "12 × 10 = 120 y 12 × 2 = 24.",
          "120 + 24 = 144.",
          "Entonces 12 × 12 = 144.",
        ],
      },
      {
        q: [
          "En una feria hay 12 puestos con 9 jugos cada uno.",
          "¿Cuántos jugos hay en total?",
        ],
        h: "Punto 5: Un problema de feria",
        a: [
          "Son doce grupos de nueve: 12 × 9.",
          "Parte el 12: 10 × 9 = 90 y 2 × 9 = 18.",
          "90 + 18 = 108 jugos.",
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
        { q: "¿Cuántos jugos hay en 12 puestos con 9 cada uno?", o: ["108", "90", "21", "118"] },
        { q: "Si 9 × 8 = 72, ¿cuánto es 8 × 9?", o: ["72", "17", "64", "81"] },
        { q: "¿Cómo se parte 12 × 12 para multiplicar fácil?", o: ["12 × 10 y 12 × 2", "12 + 12", "10 × 2", "12 × 1 y 12 × 1"] },
      ],
      write: [
        "Explica por qué 10 × 8 vale 80 y no 800.",
        "Resuelve 12 × 9 partiendo el 12 en 10 y 2. Escribe los pasos.",
      ],
      schematic: [
        "Dibuja 12 × 9 en dos cajas: 10 × 9 y 2 × 9.",
        "Dibuja 8 cajas de 10 frutas y escribe 8 × 10 = 80.",
      ],
    },
    image: [
      "Dibuja 8 cajas con 10 frutas en cada una.",
      "Escribe al lado: 8 × 10 = 80.",
      "Rotula «ocho decenas» y «80 frutas».",
      "Revisa que no hayas escrito 800.",
    ],
    summary: "El orden de los factores no cambia el producto, y el 12 se parte en 10 y 2.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "mat-c3-w2-d4",
    opening: ayer,
    repaso: [
      "Ayer practicamos el orden de los factores y las decenas.",
      "Vimos que 10 × 8 = 80 y que 12 × 12 = 144.",
      "Hoy construimos las tablas del 13 al 16.",
    ],
    units: [
      {
        q: [
          "Para 13 × 5, ¿qué tabla del 10 y qué tabla del 3",
          "usarías?",
        ],
        h: "Punto 1: El 13 se parte en 10 y 3",
        a: [
          "Parte el 13 en 10 y 3.",
          "10 × 5 = 50 y 3 × 5 = 15.",
          "50 + 15 = 65.",
          "Entonces 13 × 5 = 65.",
        ],
      },
      {
        q: [
          "Si 7 × 7 = 49, ¿cómo hallas 14 × 7?",
        ],
        h: "Punto 2: El 14 es el doble del 7",
        a: [
          "El 14 es el doble de 7.",
          "Dobla el producto: 49 + 49 = 98.",
          "Entonces 14 × 7 = 98.",
          "Comprueba: 10 × 7 = 70, 4 × 7 = 28 y 70 + 28 = 98.",
        ],
      },
      {
        q: [
          "¿Cómo hallarías 16 × 6? Pista: 8 × 6 = 48.",
        ],
        h: "Punto 3: El 16 es el doble del 8",
        a: [
          "El 16 es el doble de 8.",
          "Dobla 48: 48 + 48 = 96.",
          "Entonces 16 × 6 = 96.",
        ],
      },
      {
        q: [
          "¿Y 15 × 8? Pista: el 15 es tres veces el 5.",
        ],
        h: "Punto 4: El 15 es tres veces el 5",
        a: [
          "Primero 5 × 8 = 40.",
          "Tres veces 40 es 40 + 40 + 40 = 120.",
          "Entonces 15 × 8 = 120.",
          "No sumes 15 + 8 = 23: eso no es multiplicar.",
        ],
      },
      {
        q: [
          "Cada lápiz cuesta 800 bolívares. Compras 5 lápices",
          "y pagas con 5.000. ¿Cuánto te devuelven?",
        ],
        h: "Punto 5: Multiplicar con bolívares",
        a: [
          "Primero multiplica: 5 × 800 = 4.000 bolívares.",
          "Piensa 5 × 8 = 40 y añade dos ceros: 4.000.",
          "Luego resta: 5.000 − 4.000 = 1.000 bolívares.",
          "Te devuelven 1.000 bolívares.",
          "Comprueba sumando 800 cinco veces: da 4.000.",
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
        { q: "¿Cuánto cuestan 5 lápices a 800 bolívares cada uno?", o: ["4.000 bolívares", "4.800 bolívares", "400 bolívares", "805 bolívares"] },
        { q: "Pagas 5.000 por 4.000 bolívares. ¿Cuánto te devuelven?", o: ["1.000 bolívares", "9.000 bolívares", "500 bolívares", "4.000 bolívares"] },
        { q: "¿Cómo se parte 13 × 5 para multiplicar fácil?", o: ["10 × 5 y 3 × 5", "13 + 5", "10 + 3 + 5", "13 × 3"] },
      ],
      write: [
        "Explica cómo hallas 14 × 7 con el doble de 7 × 7.",
        "Halla el total de 3 lápices a 800 bolívares cada uno.",
      ],
      schematic: [
        "Dibuja 13 × 5 en dos cajas: 10 × 5 y 3 × 5.",
        "Dibuja 5 lápices de 800 bolívares y escribe el total.",
      ],
    },
    image: [
      "Dibuja 5 lápices y escribe 800 bolívares en cada uno.",
      "Escribe la cuenta: 5 × 800 = 4.000 bolívares.",
      "Dibuja un billete de 5.000 y rotula el cambio de 1.000.",
      "Revisa tu cuenta sumando 800 cinco veces.",
    ],
    summary: "El 13 se parte en 10 y 3, el 14 y el 16 son dobles y el 15 es tres veces 5.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "mat-c3-w2-d5",
    opening: ayer,
    repaso: [
      "Ayer construimos las tablas del 13 al 16.",
      "Partimos el 13 en 10 y 3, y doblamos el 14 y el 16.",
      "También resolvimos un problema con bolívares.",
    ],
    units: [
      {
        q: [
          "Hoy repasamos toda la semana. ¿Qué es multiplicar?",
        ],
        h: "Punto 1: Todo son grupos iguales",
        a: [
          "Multiplicar es formar grupos iguales.",
          "Esta semana recorrimos las tablas del 5 al 16.",
          "Los factores se multiplican y dan el producto.",
          "Si dudas, usa una suma repetida o un doble.",
        ],
      },
      {
        q: [
          "¿Qué trucos usaste del 5 al 8?",
        ],
        h: "Punto 2: Del 5 al 8",
        a: [
          "El 5 termina en 0 o en 5: 5 × 12 = 60.",
          "El 6 dobla el 3: 6 × 7 = 42.",
          "El 8 dobla el 4: 8 × 6 = 48.",
          "No mezcles 7 × 8 = 56 con 7 × 7 = 49.",
        ],
      },
      {
        q: [
          "¿Y del 9 al 12? ¿Qué cuidados tuviste?",
        ],
        h: "Punto 3: Del 9 al 12",
        a: [
          "El orden no cambia el producto: 9 × 8 = 8 × 9 = 72.",
          "10 × 8 = 80: ocho decenas, no 800.",
          "11 × 11 = 121, no 111.",
          "12 × 12 = 144 se parte en 120 + 24.",
        ],
      },
      {
        q: [
          "¿Y del 13 al 16? ¿Qué atajos usaste?",
        ],
        h: "Punto 4: Del 13 al 16",
        a: [
          "Partir el 13 en 10 y 3: 13 × 5 = 65.",
          "Doblar: 14 × 7 = 98.",
          "Triplicar el 5: 15 × 8 = 120.",
          "Con bolívares: 5 × 800 = 4.000.",
        ],
      },
      {
        q: [
          "Mira esta tabla de resultados: 6 × 7 = 42, 9 × 8 = 72",
          "y 12 × 12 = 144. ¿Cómo la contarías con orden?",
        ],
        h: "Punto 5: Cómo contarlo con orden",
        a: [
          "Cada fila tiene una multiplicación y su producto.",
          "Leo: «seis por siete, cuarenta y dos».",
          "Luego cuento los grupos: seis grupos de siete.",
          "Al final compruebo con un doble o una descomposición.",
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
        { q: "¿Cuánto cuestan 5 lápices a 800 bolívares cada uno?", o: ["4.000 bolívares", "4.800 bolívares", "400 bolívares", "805 bolívares"] },
        { q: "En una tabla de resultados, ¿qué hay en cada fila?", o: ["Una multiplicación y su producto", "Solo colores", "Solo el signo ×", "Un nombre de país"] },
        { q: "¿Qué representa multiplicar?", o: ["Formar grupos iguales", "Quitar de un grupo", "Repartir sin orden", "Ordenar números"] },
      ],
      write: [
        "Explica con tus palabras cómo lees la fila 6 × 7 = 42.",
        "Escribe tres trucos de la semana y un ejemplo de cada uno.",
      ],
      schematic: [
        "Dibuja una tabla de dos columnas: cuenta y producto.",
        "Dibuja un mapa con tres bloques: 5 a 8, 9 a 12 y 13 a 16.",
      ],
    },
    image: [
      "Dibuja una tabla con 3 filas: 6 × 7, 9 × 8 y 12 × 12.",
      "En cada fila escribe el producto: 42, 72 y 144.",
      "Añade una columna que diga qué truco usaste.",
      "Revisa que cada producto esté en su fila.",
    ],
    summary: "Del 5 al 16 multiplicamos con grupos iguales, trucos y comprobaciones, y ordenamos los resultados en una tabla.",
  },
];
