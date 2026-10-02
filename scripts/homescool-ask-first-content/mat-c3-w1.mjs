/**
 * Matemática · ciclo 3 · semana 1 · nivel 6 — «Multiplicar con las tablas del 1 al 12».
 * Formato Ask First + metáfora de Venezuela: Archipiélago Los Roques
 * (islas y cayos en grupos y filas; los números de cayos y animales son de ejemplo, «imagina que...»).
 * Todas las cuentas verificadas a mano.
 */
export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "mat-c3-w1-d1",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ya sabes sumar el mismo número,",
          "como 5 + 5 + 5. Hoy lo harás más",
          "corto, en el archipiélago Los Roques.",
        ],
      },
      {
        q: [
          "Imagina que en Los Roques hay 3 cayos",
          "con 4 palmeras cada uno. ¿Cuántas son?",
        ],
        h: "Punto 2: Grupos iguales",
        a: [
          "Un cayo es una isla pequeña.",
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
          "los números que se multiplican.",
          "El 12 es el producto, el resultado.",
          "El 3 cuenta grupos; el 4, cuántos hay.",
        ],
      },
      {
        q: [
          "Imagina 1 cayo con 9 gaviotas. ¿Cuánto",
          "es 1 × 9? ¿Y cómo sacas 2 × 6 y 4 × 6?",
        ],
        h: "Punto 4: Tablas del 1 al 4",
        a: [
          "La tabla del 1 deja igual: 1 × 9 = 9.",
          "La del 2 es el doble: 2 × 6 = 12.",
          "La del 4 es el doble del doble:",
          "4 × 6 = 24, porque 12 + 12 = 24.",
        ],
      },
      {
        q: [
          "Imagina 6 cayos con 5 tortugas cada uno.",
          "Cuenta de 5 en 5. ¿En qué terminas?",
        ],
        h: "Punto 5: Tablas del 5 al 8",
        a: [
          "El 5 termina en 0 o en 5: 6 × 5 = 30.",
          "El 6 es el doble del 3: 3 × 5 = 15,",
          "y el doble de 15 es 30.",
          "El 8 es el doble del 4: 8 × 5 = 40.",
        ],
      },
      {
        q: [
          "Imagina 12 cayos con 7 palmeras cada uno.",
          "¿Cómo lo haces con la del 10 y la del 2?",
        ],
        h: "Punto 6: Tablas del 9 al 12",
        a: [
          "Parte el 12 en 10 y 2:",
          "10 × 7 = 70 y 2 × 7 = 14.",
          "70 + 14 = 84, así que 12 × 7 = 84.",
          "Y la del 10 añade un cero: 10 × 8 = 80.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuánto es 3 × 4?", o: ["12", "7", "34", "16"] },
        { q: "¿Cómo se llama el resultado?", o: ["Producto", "Factor", "Sumando", "Resto"] },
        { q: "En 3 × 4, ¿qué cuenta el 3?", o: ["Cuántos grupos hay", "Cuántos hay en cada uno", "El producto", "La suma de ambos"] },
        { q: "Si 2 × 6 = 12, ¿cuánto es 4 × 6?", o: ["24", "18", "16", "10"] },
        { q: "¿En qué terminan los productos del 5?", o: ["En 0 o en 5", "En 2 o en 7", "En 3 o en 8", "En 1 o en 9"] },
        { q: "¿Cuánto es 8 × 5?", o: ["40", "13", "35", "45"] },
        { q: "¿Cuánto es 12 × 7?", o: ["84", "19", "74", "94"] },
        { q: "¿Cuánto es 10 × 8?", o: ["80", "18", "800", "88"] },
      ],
      write: [
        "Escribe 3 × 5 como suma repetida. ¿Cuánto da?",
        "Cuenta con tus palabras qué es un factor.",
      ],
      schematic: [
        "Dibuja 3 cayos con 4 palmeras: 3 × 4 = 12.",
        "Dibuja 12 × 7 en dos cajas: 10 × 7 y 2 × 7.",
      ],
    },
    image: [
      "Dibuja un mapa con 4 cayos de Los Roques.",
      "Pon 5 palmeras en cada cayo.",
      "Escribe 5 + 5 + 5 + 5 y rotula 4 × 5 = 20.",
      "Revisa que todos los cayos sean iguales.",
    ],
    summary: "Multiplicar es sumar grupos iguales, como cayos de Los Roques con las mismas palmeras.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "mat-c3-w1-d2",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer viste que multiplicar es sumar",
          "grupos iguales, como los cayos de",
          "Los Roques: 3 × 4 = 12.",
        ],
      },
      {
        q: [
          "Imagina 1 cayo con 8 cangrejos.",
          "¿Cuánto es 1 × 8? ¿Qué hace el 1?",
        ],
        h: "Punto 2: La tabla del 1",
        a: [
          "Hay 8 cangrejos: 1 × 8 = 8.",
          "Un solo grupo es el número completo.",
          "Por eso 1 × 5 = 5 y 1 × 9 = 9.",
        ],
      },
      {
        q: [
          "Imagina 7 cayos con 2 pelícanos cada uno.",
          "¿Cuántos pelícanos hay en total?",
        ],
        h: "Punto 3: La tabla del 2",
        a: [
          "Son 14 pelícanos: 2 × 7 = 14.",
          "El 2 dobla el 7: 7 + 7 = 14.",
          "También 2 × 9 = 18, porque 9 + 9 = 18.",
        ],
      },
      {
        q: [
          "Imagina 3 cayos con 6 conchas cada uno.",
          "¿Cómo compruebas 3 × 6 sin la tabla?",
        ],
        h: "Punto 4: La tabla del 3",
        a: [
          "Suma el 6 tres veces: 6 + 6 + 6 = 18.",
          "Entonces 3 × 6 = 18.",
          "Otra forma: el doble de 6 es 12,",
          "y con otro 6 llegas a 18.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: 4 cayos con 9",
          "caracoles cada uno. ¿Cuántos son?",
        ],
        h: "Punto 5: La tabla del 4",
        a: [
          "El 4 es el doble del doble.",
          "El doble de 9 es 18; el de 18 es 36.",
          "Entonces 4 × 9 = 36.",
          "Comprueba: 9 + 9 + 9 + 9 = 36.",
        ],
      },
      {
        q: [
          "Pedro dice que 3 × 4 = 7, porque suma",
          "3 + 4. ¿Tiene razón con sus cayos?",
        ],
        h: "Punto 6: No sumes los factores",
        a: [
          "No. Sumó 3 + 4, pero multiplicar es",
          "juntar tres cayos de cuatro palmeras.",
          "4 + 4 + 4 = 12, así que 3 × 4 = 12.",
          "Pregunta: ¿cuántos grupos y de cuántos?",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuánto es 1 × 8?", o: ["8", "1", "9", "18"] },
        { q: "¿Cuánto es 2 × 7?", o: ["14", "9", "12", "27"] },
        { q: "¿Cuánto es 3 × 6?", o: ["18", "9", "12", "36"] },
        { q: "¿Cuánto es 4 × 9?", o: ["36", "13", "27", "49"] },
        { q: "¿Cuánto es 2 × 9?", o: ["18", "11", "29", "81"] },
        { q: "¿Cómo se comprueba 3 × 6 con suma?", o: ["6 + 6 + 6", "3 + 6", "3 + 3 + 3", "6 + 6"] },
        { q: "Pedro sumó 3 + 4. ¿Cuánto es 3 × 4?", o: ["12", "7", "10", "43"] },
        { q: "¿Cuál es el doble del doble de 9?", o: ["36", "18", "27", "45"] },
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
      "Dibuja 3 cayos de Los Roques.",
      "Pon 6 conchas en cada cayo.",
      "Escribe 6 + 6 + 6 = 18 y rotula 3 × 6 = 18.",
      "Revisa que los tres cayos sean iguales.",
    ],
    summary: "En Los Roques el 1 conserva, el 2 dobla, el 4 dobla el doble y el 3 se comprueba sumando.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "mat-c3-w1-d3",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer viste que el 1 deja igual, el 2",
          "dobla y el 4 dobla el doble, como",
          "en los cayos de Los Roques.",
        ],
      },
      {
        q: [
          "Cuenta de 5 en 5 los cayos: 5, 10, 15,",
          "20... ¿En qué números terminas?",
        ],
        h: "Punto 2: La tabla del 5",
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
        h: "Punto 3: La tabla del 6",
        a: [
          "El 6 es el doble del 3.",
          "Entonces 6 × 7 es el doble de 21.",
          "El doble de 21 es 42: 6 × 7 = 42.",
        ],
      },
      {
        q: [
          "Para 8 filas de 6 cayos, ¿qué tabla que",
          "ya conoces podrías doblar?",
        ],
        h: "Punto 4: La tabla del 8",
        a: [
          "La del 4: 4 × 6 = 24.",
          "El 8 es el doble del 4.",
          "El doble de 24 es 48: 8 × 6 = 48.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: 7 cayos con 4",
          "pelícanos cada uno. ¿Cuántos son?",
        ],
        h: "Punto 5: La tabla del 7",
        a: [
          "Suma cuatro 7: 7 + 7 + 7 + 7.",
          "7 + 7 = 14 y 14 + 14 = 28.",
          "Así 7 × 4 = 28. Con un vecino:",
          "7 × 5 = 35 y 35 − 7 = 28.",
        ],
      },
      {
        q: [
          "Camila dice que 5 × 7 = 12, porque suma",
          "5 + 7. ¿Cómo lo revisas con el 5?",
        ],
        h: "Punto 6: Comprueba antes de decidir",
        a: [
          "Sumó, pero debía formar grupos.",
          "5 × 7 son cinco grupos de siete.",
          "Los productos del 5 terminan en 0 o 5.",
          "El 12 no termina así: la respuesta es 35.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuánto es 5 × 7?", o: ["35", "12", "30", "57"] },
        { q: "¿En qué terminan los productos del 5?", o: ["En 0 o en 5", "En 1 o en 6", "En 2 o en 7", "En 3 o en 8"] },
        { q: "Si 3 × 7 = 21, ¿cuánto es 6 × 7?", o: ["42", "27", "28", "24"] },
        { q: "¿Cuánto es 5 × 6?", o: ["30", "11", "35", "25"] },
        { q: "¿Cuánto es 8 × 6?", o: ["48", "14", "42", "54"] },
        { q: "¿Cuánto es 7 × 4?", o: ["28", "11", "21", "35"] },
        { q: "El 8 es el doble de ¿qué número?", o: ["4", "2", "6", "3"] },
        { q: "¿Cómo se comprueba 7 × 4 con suma?", o: ["7 + 7 + 7 + 7", "7 + 4", "4 + 4 + 4", "7 + 7 + 7"] },
      ],
      write: [
        "Explica cómo hallas 6 × 7 con la tabla del 3.",
        "Halla 8 × 5 con el doble de 4 × 5. Escribe los pasos.",
      ],
      schematic: [
        "Dibuja 6 filas de 5 cayos: 6 × 5 = 30.",
        "Dibuja la flecha del doble: de 24 a 48.",
      ],
    },
    image: [
      "Dibuja 8 filas de Los Roques con 6 cayos.",
      "Escribe el doble: 4 × 6 = 24 y 8 × 6 = 48.",
      "Rotula cuántas filas hay y cuántos cayos.",
      "Revisa que 48 sea el doble de 24.",
    ],
    summary: "En las filas de Los Roques el 5 termina en 0 o 5, el 6 dobla el 3, el 8 dobla el 4 y el 7 se suma.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "mat-c3-w1-d4",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer viste el 5, el 6, el 7 y el 8.",
          "El 6 dobla el 3 y el 8 dobla el 4,",
          "como las filas de cayos de Los Roques.",
        ],
      },
      {
        q: [
          "Cuenta cayos de 9 en 9: 9, 18, 27, 36,",
          "45. ¿Qué notas en los dígitos?",
        ],
        h: "Punto 2: La tabla del 9",
        a: [
          "Sus dígitos suman 9: 1 + 8, 2 + 7...",
          "Y 9 × 7 = 63, porque 6 + 3 = 9.",
          "Truco: dobla el dedo 7 de tus diez.",
          "Quedan 6 dedos a un lado y 3 al otro.",
        ],
      },
      {
        q: [
          "¿Qué pasa si 10 cayos tienen 8 palmeras",
          "cada uno? ¿Cuántas hay?",
        ],
        h: "Punto 3: La tabla del 10",
        a: [
          "Añades un cero al otro factor.",
          "10 × 8 = 80 y 10 × 9 = 90.",
          "Son diez grupos de ocho: 80, no 800.",
        ],
      },
      {
        q: [
          "Mira 11 × 4, 11 × 5 y 11 × 6 en filas",
          "de cayos. ¿Qué números esperas?",
        ],
        h: "Punto 4: La tabla del 11",
        a: [
          "11 × 4 = 44, 11 × 5 = 55, 11 × 6 = 66.",
          "El dígito se repite hasta 11 × 9 = 99.",
          "Después ya no: 11 × 11 = 121.",
        ],
      },
      {
        q: [
          "Para 12 cayos con 8 palmeras, ¿cómo usas",
          "la tabla del 10 y la del 2?",
        ],
        h: "Punto 5: El 12 se parte en 10 y 2",
        a: [
          "Parte el 12 en 10 y 2.",
          "10 × 8 = 80 y 2 × 8 = 16.",
          "Suma 80 + 16 = 96: 12 × 8 = 96.",
        ],
      },
      {
        q: [
          "Un amigo dice que 12 × 8 = 80, porque",
          "12 es casi 10. ¿Qué le respondes?",
        ],
        h: "Punto 6: No olvides la segunda parte",
        a: [
          "Que le falta sumar 2 × 8 = 16.",
          "El 80 es solo 10 × 8.",
          "Por eso 12 × 8 = 96, no 80.",
          "Siempre suma las dos partes.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuánto es 9 × 7?", o: ["63", "16", "72", "54"] },
        { q: "¿Qué patrón tiene el 9?", o: ["Sus dígitos suman 9", "Terminan en 0 o 5", "Son siempre pares", "Repiten el dígito"] },
        { q: "¿Cuánto es 10 × 9?", o: ["90", "19", "900", "99"] },
        { q: "¿Cuánto es 11 × 6?", o: ["66", "17", "61", "116"] },
        { q: "¿Cuánto es 11 × 11?", o: ["121", "111", "22", "110"] },
        { q: "¿Cómo se parte 12 × 8?", o: ["10 × 8 y 2 × 8", "12 + 8", "8 + 8 + 2", "10 + 2 + 8"] },
        { q: "¿Cuánto es 12 × 8?", o: ["96", "20", "80", "86"] },
        { q: "Si dicen 12 × 8 = 80, ¿qué falta?", o: ["Sumar 2 × 8 = 16", "Restar 2", "Quitar un cero", "Nada, está bien"] },
      ],
      write: [
        "Explica cómo hallas 12 × 6 con el 10 y el 2.",
        "Escribe el truco de los dedos para 9 × 4.",
      ],
      schematic: [
        "Dibuja tus diez dedos y marca el que doblas para 9 × 7.",
        "Dibuja 12 × 8 en dos cajas: 10 × 8 y 2 × 8.",
      ],
    },
    image: [
      "Dibuja tus dos manos con los diez dedos.",
      "Tacha el dedo 7 y cuenta cada lado.",
      "Escribe: 6 dedos y 3 dedos forman 63.",
      "Rotula debajo: 9 × 7 = 63.",
    ],
    summary: "El 9 suma 9, el 10 añade un cero, el 11 repite el dígito y el 12 se parte en 10 y 2.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "mat-c3-w1-d5",
    units: [
      {
        h: "Punto 1: Repaso de ayer",
        a: [
          "Ayer viste los trucos del 9 al 12:",
          "el 9 suma 9, el 10 añade un cero,",
          "el 11 repite y el 12 se parte en 10 y 2.",
        ],
      },
      {
        q: [
          "Hoy repasas la semana. ¿Qué es",
          "multiplicar? Cuéntalo con Los Roques.",
        ],
        h: "Punto 2: Todo son grupos iguales",
        a: [
          "Multiplicar es juntar grupos iguales.",
          "Con 3 cayos de 4 palmeras: 3 × 4 = 12.",
          "Los factores dan el producto, el 12.",
          "Si dudas, comprueba con una suma.",
        ],
      },
      {
        q: [
          "¿Qué trucos te sirvieron del 1 al 8?",
          "Piensa en filas de cayos.",
        ],
        h: "Punto 3: Trucos del 1 al 8",
        a: [
          "El 1 deja igual y el 2 dobla.",
          "El 4 dobla el doble: 4 × 9 = 36.",
          "El 5 termina en 0 o 5: 5 × 7 = 35.",
          "El 8 dobla el 4: 8 × 6 = 48.",
        ],
      },
      {
        q: [
          "¿Y del 9 al 12? ¿Qué recuerdas al",
          "contar filas grandes de cayos?",
        ],
        h: "Punto 4: Trucos del 9 al 12",
        a: [
          "El 9 suma 9 en sus dígitos: 9 × 7 = 63.",
          "El 10 añade un cero: 10 × 8 = 80.",
          "El 11 repite el dígito: 11 × 6 = 66.",
          "El 12 se parte en 10 y 2: 12 × 7 = 84.",
        ],
      },
      {
        q: [
          "Mario practicó 3 tablas el lunes, 2 el",
          "martes y 4 el miércoles. ¿Cómo lo ordena?",
        ],
        h: "Punto 5: Un pictograma ordena datos",
        a: [
          "Con un pictograma: un cayo por tabla.",
          "Lunes: 3 dibujos; martes: 2; miércoles: 4.",
          "Total: 3 + 2 + 4 = 9 tablas.",
          "Un pictograma muestra datos con dibujos.",
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
          "Después sumo: 60 + 12 = 72.",
          "Compruebo: 6 × 6 = 36, y su doble, 72.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué significa multiplicar?", o: ["Juntar grupos iguales", "Quitar de un grupo", "Repartir sin orden", "Ordenar números"] },
        { q: "¿Cuánto es 4 × 9?", o: ["36", "13", "27", "45"] },
        { q: "¿Cuánto es 8 × 6?", o: ["48", "14", "42", "54"] },
        { q: "¿Cuánto es 9 × 7?", o: ["63", "16", "56", "72"] },
        { q: "¿Cuánto es 12 × 6?", o: ["72", "18", "60", "66"] },
        { q: "¿Para qué sirve un pictograma?", o: ["Mostrar datos con dibujos", "Borrar números", "Evitar multiplicar", "Cambiar el orden"] },
        { q: "¿Cuántas tablas son 3 + 2 + 4?", o: ["9", "8", "10", "24"] },
        { q: "¿Qué tabla se parte en 10 y 2?", o: ["La del 12", "La del 11", "La del 9", "La del 5"] },
      ],
      write: [
        "Cuenta con orden cómo hallar 12 × 6, con tus palabras.",
        "Escribe tres trucos de tablas y un ejemplo de cada uno.",
      ],
      schematic: [
        "Dibuja un pictograma: 3 cayos el lunes y 4 el martes.",
        "Dibuja una tabla de dos columnas: cuenta y producto.",
      ],
    },
    image: [
      "Dibuja un pictograma de tu semana.",
      "Usa un cayo de Los Roques por cada tabla.",
      "Rotula los días y escribe el total de cayos.",
      "Escribe una multiplicación que aprendiste.",
    ],
    summary: "Multiplicar es juntar grupos iguales, y cada tabla tiene su truco. Un pictograma ordena los datos.",
  },
];
