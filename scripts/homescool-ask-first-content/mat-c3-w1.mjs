/**
 * Matemática · ciclo 3 · semana 1 · nivel 6 — "Multiplicar con las tablas del 1 al 12".
 * Narrativa inductiva "pregunta primero". Todas las cuentas verificadas a mano
 * (y otra vez por el script de verificación aparte).
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "mat-c3-w1-d1",
    opening: "¿Cuántas manzanas hay en 3 bolsas con 4 manzanas cada una?",
    repaso: null,
    units: [
      {
        h: "Punto 1: Multiplicar es juntar grupos iguales",
        a: [
          "Hay 3 bolsas y en cada una hay 4 manzanas.",
          "Podemos sumar: 4 + 4 + 4 = 12 manzanas.",
          "Multiplicar es una forma corta de sumar grupos iguales.",
          "Lo escribimos así: 3 × 4 = 12.",
          "Se lee «tres por cuatro» o «tres grupos de cuatro».",
        ],
      },
      {
        q: [
          "Sigamos. En 3 × 4 = 12, ¿cómo crees que se llama",
          "el 12? ¿Y el 3 y el 4?",
        ],
        h: "Punto 2: Factores y producto",
        a: [
          "El 3 y el 4 son los factores: los números que se multiplican.",
          "El 12 es el producto: la respuesta de multiplicar.",
          "El 3 dice cuántos grupos hay.",
          "El 4 dice cuántos hay en cada grupo.",
        ],
      },
      {
        q: [
          "Imagina 1 caja con 9 caramelos. ¿Cuánto es 1 × 9?",
          "¿Y cómo sacarías la tabla del 2, del 3 y del 4?",
        ],
        h: "Punto 3: Tablas del 1 al 4",
        a: [
          "La tabla del 1 deja el mismo número: 1 × 9 = 9.",
          "La del 2 es el doble: 2 × 6 = 12.",
          "La del 4 es el doble de la del 2: 4 × 6 = 24.",
          "La del 3 se comprueba sumando: 3 × 4 = 4 + 4 + 4.",
        ],
      },
      {
        q: [
          "Cuenta de 5 en 5: 5, 10, 15, 20... ¿En qué números",
          "terminas siempre? ¿Y cómo sacarías la del 6 y la del 8?",
        ],
        h: "Punto 4: Tablas del 5 al 8",
        a: [
          "Los productos del 5 terminan en 0 o en 5: 5 × 6 = 30.",
          "El 6 es el doble del 3: 3 × 4 = 12, y 6 × 4 = 24.",
          "El 8 es el doble del 4: 4 × 5 = 20, y 8 × 5 = 40.",
          "La del 7 pide práctica paciente, y la veremos con calma.",
        ],
      },
      {
        q: [
          "¿Cómo harías 12 × 7 si solo sabes la tabla del 10",
          "y la del 2?",
        ],
        h: "Punto 5: Tablas del 9 al 12",
        a: [
          "Parte el 12 en 10 y 2: (10 × 7) + (2 × 7).",
          "10 × 7 = 70 y 2 × 7 = 14, así que 12 × 7 = 84.",
          "La del 10 añade un cero: 10 × 8 = 80.",
          "La del 11 repite el dígito: 11 × 5 = 55.",
          "En la del 9 los dígitos suman 9: 9 × 6 = 54, y 5 + 4 = 9.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuánto es 3 × 4?", o: ["12", "7", "34", "16"] },
        { q: "¿Cómo se llama el resultado de multiplicar?", o: ["Producto", "Factor", "Sumando", "Resto"] },
        { q: "¿Qué significa 5 × 3?", o: ["Cinco grupos de tres", "Cinco más tres", "Cinco menos tres", "Tres más cinco"] },
        { q: "Si 2 × 6 = 12, ¿cuánto es 4 × 6?", o: ["24", "16", "18", "10"] },
        { q: "¿En qué terminan los productos de la tabla del 5?", o: ["En 0 o en 5", "En 2 o en 7", "En 3 o en 8", "En 1 o en 9"] },
        { q: "¿Cuánto es 8 × 5?", o: ["40", "13", "35", "45"] },
        { q: "¿Cuánto es 12 × 7?", o: ["84", "19", "74", "94"] },
        { q: "¿Cuánto es 10 × 8?", o: ["80", "18", "800", "88"] },
      ],
      write: [
        "Escribe 3 × 5 como suma repetida y halla el producto.",
        "Explica qué es un factor y qué es el producto.",
      ],
      schematic: [
        "Dibuja 3 bolsas con 4 manzanas y escribe 3 × 4 = 12.",
        "Dibuja 12 × 7 partido en dos cajas: 10 × 7 y 2 × 7.",
      ],
    },
    image: [
      "Dibuja 4 grupos con 5 estrellas en cada grupo.",
      "Escribe debajo la suma repetida: 5 + 5 + 5 + 5.",
      "Rotula los factores y el producto: 4 × 5 = 20.",
      "Revisa que todos los grupos tengan la misma cantidad.",
    ],
    summary: "Multiplicar es juntar grupos iguales. Los factores se multiplican y dan el producto.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "mat-c3-w1-d2",
    opening: ayer,
    repaso: [
      "Ayer vimos que multiplicar es juntar grupos iguales.",
      "Los números que se multiplican son los factores.",
      "La respuesta es el producto: 3 × 4 = 12.",
    ],
    units: [
      {
        q: [
          "Tienes 1 caja con 8 caramelos. ¿Cuántos caramelos",
          "hay? ¿Qué pasa siempre con la tabla del 1?",
        ],
        h: "Punto 1: La tabla del 1 conserva el número",
        a: [
          "Hay 8 caramelos: 1 × 8 = 8.",
          "Un solo grupo es el número completo.",
          "Por eso 1 × 5 = 5 y 1 × 9 = 9.",
        ],
      },
      {
        q: [
          "Hay 7 mesas y cada mesa tiene 2 sillas.",
          "¿Cuántas sillas hay en total?",
        ],
        h: "Punto 2: La tabla del 2 es el doble",
        a: [
          "Son 14 sillas: 2 × 7 = 14.",
          "Con 2 en cada grupo, el resultado es el doble de 7.",
          "El doble de 7 es 7 + 7 = 14.",
          "También 2 × 9 = 18, porque 9 + 9 = 18.",
        ],
      },
      {
        q: [
          "Imagina que no te sabes 3 × 6. ¿Cómo lo",
          "comprobarías sin la tabla?",
        ],
        h: "Punto 3: La tabla del 3 se comprueba sumando",
        a: [
          "Suma el 6 tres veces: 6 + 6 + 6 = 18.",
          "Entonces 3 × 6 = 18.",
          "Otra forma: el doble de 6 es 12, y sumas otro 6: 18.",
          "La suma repetida sirve para comprobar cualquier producto.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿cuánto es 4 × 9?",
          "Pista: es el doble del doble de 9.",
        ],
        h: "Punto 4: La tabla del 4 es el doble del doble",
        a: [
          "El doble de 9 es 18.",
          "El doble de 18 es 36.",
          "Entonces 4 × 9 = 36.",
          "Comprueba: 9 + 9 + 9 + 9 = 36.",
        ],
      },
      {
        q: [
          "Pedro dice que 3 × 4 = 7, porque suma 3 + 4.",
          "¿Tiene razón?",
        ],
        h: "Punto 5: No sumes los factores",
        a: [
          "No. Sumó los factores, y multiplicar es otra cosa.",
          "3 × 4 son tres grupos de cuatro.",
          "4 + 4 + 4 = 12, así que 3 × 4 = 12.",
          "Pregúntate siempre: ¿cuántos grupos y de cuántos?",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuánto es 1 × 8?", o: ["8", "1", "9", "18"] },
        { q: "¿Cuántas sillas hay en 7 mesas con 2 sillas cada una?", o: ["14", "9", "12", "27"] },
        { q: "¿Cuánto es 3 × 6?", o: ["18", "9", "12", "36"] },
        { q: "¿Cuánto es 4 × 9?", o: ["36", "13", "27", "49"] },
        { q: "¿Cuánto es 2 × 9?", o: ["18", "11", "29", "81"] },
        { q: "¿Cómo se comprueba 3 × 6 con una suma?", o: ["6 + 6 + 6", "3 + 6", "3 + 3 + 3", "6 + 6"] },
        { q: "¿Qué significa 3 × 4?", o: ["Tres grupos de cuatro", "3 + 4 = 7", "Cuatro menos tres", "Tres grupos de tres"] },
        { q: "¿Cuál es el doble del doble de 9?", o: ["36", "18", "27", "45"] },
      ],
      write: [
        "Resuelve 3 × 8 con suma repetida. Escribe los pasos.",
        "Inventa un problema de grupos iguales para 4 × 5.",
      ],
      schematic: [
        "Dibuja 7 mesas con 2 sillas y escribe 2 × 7 = 14.",
        "Dibuja el doble del doble: 9, 18 y 36.",
      ],
    },
    image: [
      "Dibuja 3 grupos con 6 flores en cada grupo.",
      "Escribe la suma repetida: 6 + 6 + 6 = 18.",
      "Rotula debajo: 3 × 6 = 18.",
      "Revisa que los tres grupos sean iguales.",
    ],
    summary: "La tabla del 1 conserva, la del 2 dobla, la del 4 dobla el doble y la del 3 se comprueba sumando.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "mat-c3-w1-d3",
    opening: ayer,
    repaso: [
      "Ayer practicamos las tablas del 1 al 4.",
      "El 1 conserva, el 2 dobla y el 4 dobla el doble.",
      "Y comprobamos con suma repetida cuando dudamos.",
    ],
    units: [
      {
        q: [
          "Cuenta de 5 en 5: 5, 10, 15, 20... ¿En qué números",
          "terminan los productos de la tabla del 5?",
        ],
        h: "Punto 1: La tabla del 5 tiene un patrón",
        a: [
          "Terminan en 0 o en 5: 5, 10, 15, 20, 25, 30...",
          "Así 5 × 7 = 35 termina en 5.",
          "Y 5 × 6 = 30 termina en 0.",
          "Para 5 × 12 cuenta doce veces de 5 en 5: llegas a 60.",
        ],
      },
      {
        q: [
          "Sabes que 3 × 5 = 15. ¿Cómo sacarías 6 × 5?",
        ],
        h: "Punto 2: La tabla del 6 dobla la del 3",
        a: [
          "El 6 es el doble del 3.",
          "Entonces 6 × 5 es el doble de 15.",
          "El doble de 15 es 30, así que 6 × 5 = 30.",
          "Con 6 × 7: 3 × 7 = 21 y su doble es 42.",
        ],
      },
      {
        q: [
          "Para 8 × 6, ¿qué tabla que ya conoces podrías doblar?",
        ],
        h: "Punto 3: La tabla del 8 dobla la del 4",
        a: [
          "La del 4: 4 × 6 = 24.",
          "El 8 es el doble del 4.",
          "El doble de 24 es 48.",
          "Entonces 8 × 6 = 48.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿cuánto es 7 × 4 si no te",
          "acuerdas del resultado?",
        ],
        h: "Punto 4: La tabla del 7 pide paciencia",
        a: [
          "Usa una suma repetida: 7 + 7 + 7 + 7.",
          "7 + 7 = 14 y 14 + 14 = 28.",
          "Entonces 7 × 4 = 28.",
          "O usa un vecino: 7 × 5 = 35, y 35 − 7 = 28.",
        ],
      },
      {
        q: [
          "Camila dice que 5 × 7 = 12 porque suma 5 + 7.",
          "¿Qué le dirías?",
        ],
        h: "Punto 5: Comprueba antes de decidir",
        a: [
          "Que sumó, pero debía formar grupos.",
          "5 × 7 son cinco grupos de siete.",
          "Los productos del 5 terminan en 0 o en 5.",
          "El 12 no termina así: la respuesta es 35.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuánto es 5 × 7?", o: ["35", "12", "30", "57"] },
        { q: "¿En qué terminan los productos de la tabla del 5?", o: ["En 0 o en 5", "En 1 o en 6", "En 2 o en 7", "En 3 o en 8"] },
        { q: "Si 3 × 7 = 21, ¿cuánto es 6 × 7?", o: ["42", "27", "28", "24"] },
        { q: "¿Cuánto es 6 × 5?", o: ["30", "11", "35", "25"] },
        { q: "Si 4 × 6 = 24, ¿cuánto es 8 × 6?", o: ["48", "32", "30", "14"] },
        { q: "¿Cuánto es 7 × 4?", o: ["28", "11", "21", "35"] },
        { q: "El 8 es el doble de ¿qué número?", o: ["4", "2", "6", "3"] },
        { q: "¿Cómo se comprueba 7 × 4 con una suma?", o: ["7 + 7 + 7 + 7", "7 + 4", "4 + 4 + 4", "7 + 7 + 7"] },
      ],
      write: [
        "Explica cómo hallas 6 × 5 con la tabla del 3.",
        "Halla 8 × 5 con el doble de 4 × 5. Escribe los pasos.",
      ],
      schematic: [
        "Dibuja 6 grupos de 5 puntos y escribe 6 × 5 = 30.",
        "Dibuja la flecha del doble: de 4 × 6 = 24 a 8 × 6 = 48.",
      ],
    },
    image: [
      "Dibuja 8 cajas con 6 lápices en cada una.",
      "Escribe el doble: 4 × 6 = 24 y luego 8 × 6 = 48.",
      "Rotula cuántos grupos hay y cuántos lápices en cada uno.",
      "Revisa que 48 sea el doble de 24.",
    ],
    summary: "El 5 termina en 0 o 5, el 6 dobla el 3, el 8 dobla el 4 y el 7 se comprueba sumando.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "mat-c3-w1-d4",
    opening: ayer,
    repaso: [
      "Ayer practicamos las tablas del 5 al 8.",
      "El 5 termina en 0 o 5, el 6 dobla el 3 y el 8 dobla el 4.",
      "Para el 7 usamos suma repetida o un número vecino.",
    ],
    units: [
      {
        q: [
          "Mira los productos del 9: 9, 18, 27, 36, 45.",
          "¿Qué notas en sus dígitos?",
        ],
        h: "Punto 1: La tabla del 9 y sus trucos",
        a: [
          "Los dos dígitos suman 9: 1 + 8, 2 + 7, 3 + 6, 4 + 5.",
          "Comprueba: 9 × 7 = 63, y 6 + 3 = 9.",
          "Truco de dedos: dobla el dedo número 7 de tus diez dedos.",
          "Quedan 6 dedos a la izquierda y 3 a la derecha: 63.",
        ],
      },
      {
        q: [
          "¿Qué crees que pasa al multiplicar un número por 10?",
        ],
        h: "Punto 2: La tabla del 10 añade un cero",
        a: [
          "Se le añade un cero al otro factor.",
          "10 × 8 = 80 y 10 × 9 = 90.",
          "10 × 8 son diez grupos de ocho: 80, no 800.",
        ],
      },
      {
        q: [
          "Mira 11 × 4, 11 × 5 y 11 × 6. ¿Qué números esperas?",
        ],
        h: "Punto 3: La tabla del 11 repite el dígito",
        a: [
          "11 × 4 = 44, 11 × 5 = 55 y 11 × 6 = 66.",
          "El dígito se repite hasta 11 × 9 = 99.",
          "Después ya no: 11 × 11 = 121.",
        ],
      },
      {
        q: [
          "Para 12 × 8, ¿cómo usarías la tabla del 10 y la",
          "del 2?",
        ],
        h: "Punto 4: El 12 se parte en 10 y 2",
        a: [
          "Parte el 12 en 10 y 2.",
          "10 × 8 = 80 y 2 × 8 = 16.",
          "Suma las dos partes: 80 + 16 = 96.",
          "Entonces 12 × 8 = 96.",
        ],
      },
      {
        q: [
          "Un amigo dice que 12 × 8 = 80 porque 12 es casi 10.",
          "¿Qué le responderías?",
        ],
        h: "Punto 5: No olvides la segunda parte",
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
        { q: "¿Qué patrón tienen los productos de la tabla del 9?", o: ["Sus dígitos suman 9", "Terminan en 0 o 5", "Son siempre pares", "Repiten el dígito"] },
        { q: "¿Cuánto es 10 × 9?", o: ["90", "19", "900", "99"] },
        { q: "¿Cuánto es 11 × 6?", o: ["66", "17", "61", "116"] },
        { q: "¿Cuánto es 11 × 11?", o: ["121", "111", "22", "110"] },
        { q: "¿Cómo se parte 12 × 8 para multiplicar fácil?", o: ["10 × 8 y 2 × 8", "12 + 8", "8 + 8 + 2", "10 + 2 + 8"] },
        { q: "¿Cuánto es 12 × 8?", o: ["96", "20", "80", "86"] },
        { q: "Si alguien dice que 12 × 8 = 80, ¿qué le falta?", o: ["Sumar 2 × 8 = 16", "Restar 2", "Quitar un cero", "Nada, está bien"] },
      ],
      write: [
        "Explica cómo hallas 12 × 6 con la tabla del 10 y la del 2.",
        "Escribe el truco de los dedos para 9 × 4.",
      ],
      schematic: [
        "Dibuja tus diez dedos y marca el que doblas para 9 × 7.",
        "Dibuja 12 × 8 en dos cajas: 10 × 8 y 2 × 8.",
      ],
    },
    image: [
      "Dibuja tus dos manos con los diez dedos.",
      "Tacha el dedo número 7 y cuenta los dedos de cada lado.",
      "Escribe: 6 dedos y 3 dedos forman 63, o sea 9 × 7.",
      "Rotula debajo: 9 × 7 = 63.",
    ],
    summary: "El 9 suma 9, el 10 añade un cero, el 11 repite el dígito y el 12 se parte en 10 y 2.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "mat-c3-w1-d5",
    opening: ayer,
    repaso: [
      "Ayer practicamos las tablas del 9 al 12.",
      "El 9 suma 9, el 10 añade un cero y el 11 repite el dígito.",
      "El 12 se parte en 10 y 2 para multiplicar fácil.",
    ],
    units: [
      {
        q: [
          "Hoy repasamos toda la semana. ¿Qué es multiplicar?",
          "Cuéntalo con un ejemplo.",
        ],
        h: "Punto 1: Todo son grupos iguales",
        a: [
          "Multiplicar es juntar grupos iguales.",
          "Los factores se multiplican y dan el producto.",
          "Por ejemplo, 3 × 4 = 12.",
          "Si dudas, comprueba con una suma repetida.",
        ],
      },
      {
        q: [
          "¿Qué trucos te sirvieron para las tablas del 1 al 8?",
        ],
        h: "Punto 2: Trucos del 1 al 8",
        a: [
          "El 1 deja el número y el 2 lo dobla.",
          "El 4 dobla el doble: 4 × 9 = 36.",
          "El 5 termina en 0 o en 5: 5 × 7 = 35.",
          "El 6 dobla el 3 y el 8 dobla el 4: 8 × 6 = 48.",
        ],
      },
      {
        q: [
          "¿Y para las tablas del 9 al 12? ¿Qué recuerdas?",
        ],
        h: "Punto 3: Trucos del 9 al 12",
        a: [
          "En el 9 los dígitos suman 9: 9 × 7 = 63.",
          "El 10 añade un cero: 10 × 8 = 80.",
          "El 11 repite el dígito: 11 × 6 = 66.",
          "El 12 se parte en 10 y 2: 12 × 7 = 84.",
        ],
      },
      {
        q: [
          "Mario practicó 3 tablas el lunes, 2 el martes y 4 el",
          "miércoles. ¿Cómo lo mostrarías con dibujos?",
        ],
        h: "Punto 4: Un pictograma ordena datos",
        a: [
          "Con un pictograma: cada dibujo vale una tabla.",
          "Lunes: 3 dibujos. Martes: 2. Miércoles: 4.",
          "En total son 3 + 2 + 4 = 9 tablas.",
          "Un pictograma muestra datos con dibujos que se pueden contar.",
        ],
      },
      {
        q: [
          "Si debes explicar cómo hallar 12 × 6 a tu familia,",
          "¿qué dirías primero, después y al final?",
        ],
        h: "Punto 5: Cómo contarlo con orden",
        a: [
          "Primero digo cuántos grupos hay y de cuántos.",
          "Luego parto el 12: 10 × 6 = 60 y 2 × 6 = 12.",
          "Después sumo: 60 + 12 = 72.",
          "Al final compruebo: el doble de 6 × 6 = 36 es 72.",
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
        { q: "¿Cuántas tablas son 3 + 2 + 4 dibujos?", o: ["9", "8", "10", "24"] },
        { q: "¿Qué tabla se parte en 10 y 2?", o: ["La del 12", "La del 11", "La del 9", "La del 5"] },
      ],
      write: [
        "Cuenta con orden cómo hallar 12 × 6, con tus palabras.",
        "Escribe tres trucos de tablas y un ejemplo de cada uno.",
      ],
      schematic: [
        "Dibuja un pictograma: 3 dibujos el lunes y 4 el martes.",
        "Dibuja una tabla de dos columnas: cuenta y producto.",
      ],
    },
    image: [
      "Dibuja un pictograma de tu semana de práctica.",
      "Usa un dibujo por cada tabla que practicaste.",
      "Rotula los días y escribe cuántos dibujos hay en total.",
      "Escribe una multiplicación que hayas aprendido.",
    ],
    summary: "Multiplicar es juntar grupos iguales, y cada tabla tiene su truco. Un pictograma ordena los datos.",
  },
];
