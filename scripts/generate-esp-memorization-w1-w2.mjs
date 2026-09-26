/**
 * Regenera esp-c3-w1-d* y esp-c3-w2-d* (nivel 6) alineado con objetivos-de-memorizacion-espanol.txt
 * Semana 1 → nueve categorías gramaticales; semana 2 → cuatro estructuras de oración.
 */
import fs from "node:fs";
import path from "node:path";

const mediaRoot = path.join("frontend", "public", "homescool", "media");

const MEM_W1 =
  "sustantivo, pronombre, verbo, adverbio, conjunción, interjección, preposición, adjetivo, artículo";
const MEM_W2 =
  "simple, compuesta coordinada, compuesta subordinada, compleja";

const weeks = {
  1: {
    title: "Las nueve categorías gramaticales",
    summary:
      "Las categorías gramaticales son los tipos de palabras que usamos al hablar y escribir. Esta semana aprendiste a reconocer sustantivos, verbos, pronombres, adjetivos, artículos, adverbios, conjunciones, preposiciones e interjecciones, y a memorizar su lista completa.",
    intro: [
      {
        id: "p1",
        heading: "Nombres, acciones y sustitutos",
        body:
          "Hoy vamos a descubrir tres categorías que aparecen en casi todas las oraciones. Una categoría gramatical es el tipo de palabra según su función. El sustantivo nombra personas, animales, cosas, lugares o ideas: «perro», «Caracas», «alegría». El verbo expresa acción o estado: «corro», «duermo», «soy». El pronombre sustituye a un sustantivo para no repetirlo: «él», «ella», «nosotros», «esto».\n\nMira la oración «María lee y ella sonríe». «María» es sustantivo porque nombra a una persona. «Lee» y «sonríe» son verbos porque cuentan acciones. «Ella» es pronombre porque vuelve a señalar a María sin repetir el nombre.\n\nPractica encontrando las tres categorías en oraciones de un cuento corto. Rodea sustantivos, subraya verbos y marca pronombres con un punto encima.\n\nPráctica: Escribe tres oraciones tuyas. En cada una identifica al menos un sustantivo, un verbo y, si puedes, un pronombre.\n\nError común: Confundir adjetivo con sustantivo. «Rojo» solo describe; «el rojo» como color puede ser sustantivo, pero «camisa roja» usa «roja» como adjetivo.",
      },
      {
        id: "p2",
        heading: "Palabras que describen y afinan",
        body:
          "Sigamos con palabras que modifican o acompañan a otras. El adjetivo describe al sustantivo: «casa grande», «niño valiente». El artículo acompaña al sustantivo y puede ser definido («el», «la», «los», «las») o indefinido («un», «una»). El adverbio modifica al verbo, a otro adverbio o a un adjetivo: «corre rápido», «muy bien», «casi siempre».\n\nEn «El perro negro corre muy rápido», «el» es artículo, «negro» es adjetivo, «muy» y «rápido» son adverbios. Cada uno responde una pregunta distinta: ¿cuál perro?, ¿de qué color?, ¿cómo corre?, ¿con qué intensidad?\n\nPráctica: Toma la oración «Una niña talentosa canta bastante bien». Separa artículo, adjetivo, adverbios, sustantivo y verbo.\n\nError común: Creer que «muy» es adjetivo. «Muy» no describe al sustantivo directamente; intensifica a «bien».",
      },
      {
        id: "p3",
        heading: "Palabras de enlace, lugar y emoción",
        body:
          "Por último, tres categorías que conectan o sitúan palabras. La conjunción une palabras u oraciones: «pan y mantequilla», «quiero jugar, pero llueve». La preposición marca relación de lugar, tiempo, causa u otra idea: «a», «de», «en», «con», «sin», «para», «por». La interjección expresa emoción o llamada de golpe: «¡Ay!», «¡Bravo!», «¡Eh!».\n\nEn «Voy a la escuela con mi hermana y ¡qué alegría!», «a», «con» son preposiciones; «y» es conjunción; «¡qué alegría!» funciona como interjección.\n\nMemorización: repite en voz alta las nueve categorías de esta semana: " +
          MEM_W1 +
          ". Cuando las digas en orden sin mirar, marca tu lista de estudio.\n\nPráctica: Escribe una oración que use al menos una conjunción, una preposición y una interjección. Luego enumera las nueve categorías de memoria.\n\nError común: Confundir preposición con conjunción. «Y» une elementos del mismo tipo; «a» introduce relación hacia un lugar o persona.",
      },
    ],
    deepen: [
      {
        heading: "Profundizar: sustantivo, verbo y pronombre",
        body:
          "Hoy profundizaremos en nombres, acciones y sustitutos. El sustantivo puede ser común («ciudad») o propio («Barquisimeto»), singular o plural. El verbo cambia según quién actúa: «yo canto», «tú cantas». El pronombre evita repetir: en lugar de «Ana ve a Ana en el espejo», decimos «Ana se ve en el espejo».\n\nJuega a clasificar palabras de un texto del día: primero solo sustantivos, luego solo verbos, luego pronombres. Después mezcla: «¿Qué categoría es «ellos»?». Pregunta también por función: el sustantivo responde «¿quién o qué?», el verbo «¿qué hace?».\n\nDesde otra perspectiva, dibuja tres columnas y coloca diez palabras sueltas donde corresponda. Si dudas, arma una mini-oración con cada palabra.\n\nPráctica: Copia un párrafo breve de un libro. Cuenta cuántos sustantivos, verbos y pronombres hay. Escribe una oración nueva usando las tres categorías.\n\nError común: Tomar «ser» o «estar» como sustantivos. Son verbos aunque sean cortos.\n\nMemorización: di en voz alta solo las categorías de este bloque — sustantivo, pronombre, verbo — y después las nueve completas: " +
          MEM_W1 +
          ".",
        summary:
          "Sustantivo nombra, verbo expresa acción o estado, pronombre reemplaza al sustantivo. Reconocerlos es el primer paso para analizar cualquier oración.",
      },
      {
        heading: "Profundizar: adjetivo, artículo y adverbio",
        body:
          "Hoy miraremos cómo describimos y afinamos el mensaje. El adjetivo concuerda en género y número con el sustantivo: «niño alto», «niña alta». El artículo ayuda a saber si hablamos de algo conocido («la mesa») o general («una mesa»). El adverbio muchas veces termina en «-mente» («lentamente»), pero también encontramos «bien», «mal», «hoy», «aquí».\n\nHaz el juego del detective: en una oración larga, encuentra primero el sustantivo principal y pregúntale «¿cómo es?» (adjetivo), «¿cuál?» (artículo), «¿cómo ocurre la acción?» (adverbio). Cambia un adjetivo y observa cómo cambia la imagen mental.\n\nOtra perspectiva: escribe la misma oración dos veces, una muy neutra y otra muy descriptiva con adjetivos y adverbios. Compara el efecto.\n\nPráctica: Elige cinco sustantivos. A cada uno añade artículo y adjetivo. Luego escribe un verbo con un adverbio que lo modifique.\n\nError común: Usar adjetivo donde va adverbio: «corre rápido» (adverbio), no «corre rápido» pensando que describe al sujeto como adjetivo.\n\nMemorización: repite adjetivo, artículo, adverbio y luego la lista de las nueve: " +
          MEM_W1 +
          ".",
        summary:
          "Artículo y adjetivo acompañan al sustantivo; el adverbio matiza la acción o la descripción. Juntos hacen el lenguaje más preciso.",
      },
      {
        heading: "Profundizar: conjunción, preposición e interjección",
        body:
          "Hoy cerramos las nueve categorías con las palabras que enlazan y emocionan. La conjunción coordinada («y», «o», «pero») une ideas del mismo nivel. La preposición casi siempre va delante de un sustantivo: «bajo la lluvia». La interjección suele ir sola o con signos de exclamación.\n\nPrueba el reto del cómic: escribe un diálogo con interjecciones y une las réplicas con conjunciones. En un segundo párrafo narrativo, marca todas las preposiciones y di qué relación muestran (lugar, tiempo, causa).\n\nDesde la memorización, usa tarjetas: en un lado el nombre de la categoría, en el otro un ejemplo. Mezcla y empareja.\n\nPráctica: Escribe cuatro oraciones. En la primera solo conjunciones destacadas; en la segunda subraya preposiciones; en la tercera añade una interjección; en la cuarta usa las tres.\n\nError común: Creer que «porque» es preposición; es conjunción porque introduce una oración con verbo.\n\nMemorización: esta es la meta de la semana. Di sin mirar las nueve categorías: " +
          MEM_W1 +
          ". Repite tres veces al día hasta el repaso del viernes.",
        summary:
          "Conjunción une, preposición relaciona, interjección expresa emoción. Con las nueve categorías puedes clasificar casi cualquier palabra.",
      },
    ],
    review: [
      {
        heading: "Panorama de la semana",
        body:
          "Esta semana el tema central fueron las nueve categorías gramaticales. Cada palabra que usamos pertenece a un tipo según su trabajo en la oración. Memorizar la lista completa te da un mapa para estudiar español el resto del año.\n\nRepasa con un párrafo tuyo: colorea sustantivos, verbos, pronombres, adjetivos, artículos, adverbios, conjunciones, preposiciones e interjecciones con colores distintos.\n\nMemorización: " +
          MEM_W1 +
          ".\n\nPráctica: Explica con tus palabras qué hace cada categoría y da un ejemplo.\n\nError común: Saltarse la memorización y solo hacer ejercicios; la lista debe poder decirse de memoria.",
      },
      {
        heading: "Panorama: nombres, acciones y sustitutos",
        body:
          "Sustantivo, verbo y pronombre formaron el primer bloque. El sustantivo nombra, el verbo cuenta la acción, el pronombre evita repetir.\n\nLee en voz alta tres oraciones y aplaude cada vez que escuches un verbo en tiempo presente.\n\nPráctica: Escribe dos oraciones con pronombre que reemplace un sustantivo largo.\n\nError común: Olvidar que los pronombres también tienen categoría propia.",
      },
      {
        heading: "Panorama: descripción y detalle",
        body:
          "Adjetivo, artículo y adverbio afinan el mensaje. Sin ellos la oración sería seca; con ellos se ve y se siente la escena.\n\nInventa un cartel publicitario de un juguete usando al menos dos adjetivos y un adverbio.\n\nPráctica: Transforma «El gato duerme» en una oración más rica sin cambiar el sustantivo principal.\n\nError común: Poner demasiados adjetivos sin orden; elige los más claros.",
      },
      {
        heading: "Panorama: enlaces y emoción",
        body:
          "Conjunción, preposición e interjección completan el sistema. Son cortas pero cambian el sentido: «salgo con lluvia» frente a «salgo, pero llueve».\n\nMemorización final del bloque: conjunción, preposición, interjección; luego las nueve juntas.\n\nPráctica: Escribe un mensaje a un amigo con una interjección amable y dos preposiciones.\n\nError común: Omitir signos de exclamación en interjecciones fuertes.",
      },
      {
        heading: "Síntesis y memorización",
        body:
          "Cierra la semana recitando la lista completa y aplicándola. Si puedes nombrar las nueve categorías y poner un ejemplo de cada una, dominaste el tema.\n\nMemorización (meta): " +
          MEM_W1 +
          ".\n\nPráctica: Graba tu voz o pídele a un adulto que te escuche. Corrige hasta lograr las nueve sin ayuda.\n\nError común: Confundir el orden; usa un ritmo o canción si te ayuda.",
      },
    ],
    quizzes: {
      1: [
        q("¿Cuántas categorías gramaticales estudiamos esta semana?", ["Siete", "Nueve", "Doce", "Cuatro"], "Nueve"),
        q("«Perro» es principalmente…", ["Verbo", "Sustantivo", "Adverbio", "Conjunción"], "Sustantivo"),
        q("«Corren» es…", ["Pronombre", "Verbo", "Artículo", "Preposición"], "Verbo"),
        q("«Ella» sustituye a un…", ["Adjetivo", "Sustantivo", "Artículo", "Gerundio"], "Sustantivo"),
        q("«Rápido» en «corre rápido» es…", ["Adjetivo", "Adverbio", "Sustantivo", "Conjunción"], "Adverbio"),
        q("«El» en «el libro» es…", ["Artículo", "Pronombre", "Verbo", "Interjección"], "Artículo"),
        q("«Y» en «pan y queso» es…", ["Preposición", "Conjunción", "Artículo", "Adverbio"], "Conjunción"),
        q("«¡Ay!» es una…", ["Preposición", "Interjección", "Conjunción", "Pronombre"], "Interjección"),
      ],
      2: [
        q("¿Qué categoría nombra personas o cosas?", ["Verbo", "Sustantivo", "Adverbio", "Conjunción"], "Sustantivo"),
        q("En «Nosotros jugamos», «nosotros» es…", ["Verbo", "Pronombre", "Artículo", "Preposición"], "Pronombre"),
        q("¿Qué palabra expresa acción?", ["Mesa", "Saltan", "Azul", "Muy"], "Saltan"),
        q("«Valiente» describe al sustantivo: es…", ["Adjetivo", "Verbo", "Pronombre", "Interjección"], "Adjetivo"),
        q("«Una» en «una flor» es artículo…", ["Definido", "Indefinido", "Demostrativo", "Relativo"], "Indefinido"),
        q("«Siempre» modifica al verbo: es…", ["Adverbio", "Sustantivo", "Conjunción", "Artículo"], "Adverbio"),
        q("Memorización: ¿cuál NO está en la lista de nueve?", ["Preposición", "Adjetivo", "Participio", "Interjección"], "Participio"),
        q("¿Qué categoría une «estudio» y «descanso»?", ["Preposición", "Conjunción", "Artículo", "Pronombre"], "Conjunción"),
      ],
      3: [
        q("«Bajo» en «bajo la mesa» es…", ["Conjunción", "Preposición", "Interjección", "Verbo"], "Preposición"),
        q("«Pero» introduce…", ["Una lista sin contraste", "Contraste entre ideas", "Solo emoción", "Solo lugar"], "Contraste entre ideas"),
        q("«¡Bravo!» es…", ["Interjección", "Artículo", "Pronombre", "Adjetivo"], "Interjección"),
        q("Clasifica «hermosa» en «casa hermosa».", ["Verbo", "Adjetivo", "Adverbio", "Conjunción"], "Adjetivo"),
        q("«Las» en «las flores» es artículo…", ["Indefinido", "Definido", "Demostrativo", "Numeral"], "Definido"),
        q("«Bien» en «canta bien» es…", ["Adjetivo", "Adverbio", "Sustantivo", "Preposición"], "Adverbio"),
        q("Orden de memorización: después de «verbo» viene…", ["Artículo", "Adverbio", "Sustantivo", "Preposición"], "Adverbio"),
        q("«Sin» en «sin miedo» es…", ["Conjunción", "Preposición", "Interjección", "Pronombre"], "Preposición"),
      ],
      4: [
        q("En «María lee y él sonríe», ¿cuántos verbos hay?", ["Uno", "Dos", "Ninguno", "Tres"], "Dos"),
        q("«Caracas» es sustantivo…", ["Común", "Propio", "Verbal", "Adverbial"], "Propio"),
        q("«Lo» en «lo vi» es pronombre…", ["Personal", "Neutro/complemento", "Artículo", "Conjunción"], "Neutro/complemento"),
        q("«Muy» modifica a…", ["Solo sustantivos", "Adjetivos u otros adverbios", "Solo artículos", "Solo preposiciones"], "Adjetivos u otros adverbios"),
        q("«Para» en «regalo para ti» es…", ["Conjunción", "Preposición", "Interjección", "Verbo"], "Preposición"),
        q("«O» presenta…", ["Alternativa", "Solo emoción", "Solo lugar", "Solo tiempo"], "Alternativa"),
        q("Memorización: la tercera categoría de la lista es…", ["Pronombre", "Verbo", "Adverbio", "Artículo"], "Verbo"),
        q("¿Qué categoría falta en «niño, corre, feliz» si buscas las nueve?", ["Verbo", "Sustantivo", "Conjunción y otras", "Ya están todas"], "Conjunción y otras"),
        q("Juego: «¡Eh!» clasifica como…", ["Interjección", "Adverbio", "Artículo", "Pronombre"], "Interjección"),
        q("«A» en «voy a casa» es…", ["Conjunción", "Preposición", "Interjección", "Adjetivo"], "Preposición"),
        q("Lista completa: ¿cuántas categorías memorizamos?", ["Ocho", "Nueve", "Diez", "Seis"], "Nueve"),
        q("«Azul» describiendo «mar azul» es…", ["Adjetivo", "Adverbio", "Verbo", "Conjunción"], "Adjetivo"),
      ],
      5: [
        q("Meta: las nueve categorías incluyen «artículo» y…", ["Gerundio", "Adjetivo", "Sílaba", "Acento"], "Adjetivo"),
        q("Repaso: «interjección» expresa…", ["Emoción o llamada", "Solo lugar", "Solo tiempo", "Plural"], "Emoción o llamada"),
        q("¿Cuál es pronombre?", ["Ella", "Ellaes", "Ellar", "Ellado"], "Ella"),
        q("¿Cuál es verbo en presente?", ["Cantaba", "Cantaré", "Canto", "Cantado"], "Canto"),
        q("Memorización: después de «conjunción» viene…", ["Artículo", "Interjección", "Sustantivo", "Verbo"], "Interjección"),
        q("«Con» es categoría…", ["Preposición", "Conjunción", "Artículo", "Adverbio"], "Preposición"),
        q("Panorama: el tema central de la semana fue…", ["Tiempos verbales", "Nueve categorías gramaticales", "Mapa de Venezuela", "Fracciones"], "Nueve categorías gramaticales"),
        q("¿Qué par es correcto?", ["«Rápido» sustantivo", "«Rápido» adverbio en «muy rápido»", "«El» verbo", "«Y» preposición"], "«Rápido» adverbio en «muy rápido»"),
        q("Síntesis: memoriza sin mirar…", ["Solo tres categorías", "Las nueve categorías", "Solo verbos", "Solo conjunciones"], "Las nueve categorías"),
        q("«Los» es…", ["Artículo definido plural", "Pronombre demostrativo siempre", "Verbo", "Interjección"], "Artículo definido plural"),
        q("Error típico: «porque» es…", ["Preposición", "Conjunción", "Artículo", "Interjección"], "Conjunción"),
        q("¿Qué categoría nombra «alegría»?", ["Verbo", "Sustantivo", "Adverbio", "Conjunción"], "Sustantivo"),
        q("Clasifica «debajo» en «debajo del puente».", ["Preposición/adverbio de lugar", "Solo interjección", "Solo artículo", "Solo pronombre"], "Preposición/adverbio de lugar"),
        q("Memorización: primera categoría de la lista es…", ["Pronombre", "Sustantivo", "Verbo", "Artículo"], "Sustantivo"),
        q("«Hablan» es…", ["Verbo", "Sustantivo", "Adjetivo", "Artículo"], "Verbo"),
        q("Repaso final: ¿listas las nueve de memoria?", ["Es opcional", "Es la meta de la semana", "Solo hay cinco", "Solo en inglés"], "Es la meta de la semana"),
      ],
    },
  },
  2: {
    title: "Las cuatro estructuras de oración",
    summary:
      "Las oraciones pueden ser simples o armarse con varias partes coordinadas o subordinadas. Esta semana aprendiste a reconocer oración simple, compuesta coordinada, compuesta subordinada y compleja, y a memorizar esos cuatro nombres.",
    intro: [
      {
        id: "p1",
        heading: "Oración simple",
        body:
          "Hoy vamos a estudiar cómo se construyen las oraciones. Una oración es un grupo de palabras con sentido completo que incluye sujeto y predicado. La oración simple tiene un solo núcleo verbal: una sola acción principal o un solo estado. «El niño juega» es simple: un sujeto («el niño») y un predicado («juega»).\n\nObserva «Las aves cantan al amanecer». Hay un solo verbo principal («cantan»). Aunque haya varias palabras, no hay segunda oración unida.\n\nPráctica: Escribe cinco oraciones simples sobre tu día. Subraya el verbo principal en cada una.\n\nError común: Creer que una oración larga siempre es compuesta. Cuenta verbos conjugados principales, no solo palabras.",
      },
      {
        id: "p2",
        heading: "Oración compuesta coordinada",
        body:
          "Una oración compuesta coordinada une dos o más oraciones simples del mismo nivel con conjunciones como «y», «o», «pero», «aunque» (cuando no subordinan). Cada parte podría ser una oración sola. «Estudio y descanso» coordina dos acciones: «estudio» y «descanso».\n\nEn «Quiero salir, pero llueve», las dos ideas son igual de importantes; la conjunción «pero» marca contraste. Puedes leer cada parte por separado.\n\nPráctica: Une dos oraciones simples tuyas con «y», otra pareja con «pero» y otra con «o».\n\nError común: Confundir coordinada con simple porque la oración es corta. Si hay dos verbos principales unidos por conjunción coordinante, es compuesta coordinada.",
      },
      {
        id: "p3",
        heading: "Subordinada y compleja",
        body:
          "La oración compuesta subordinada une una oración principal con una dependiente que no se entiende sola. La subordinada depende de la principal: «Llegué cuando sonó el timbre». «Cuando sonó el timbre» necesita la otra parte.\n\nLa oración compleja mezcla coordinación y subordinación, o incluye varias subordinadas. Es la forma más rica de contar historias: «Cuando terminé la tarea, salí al patio y jugué hasta que oscureció».\n\nMemorización: repite las cuatro estructuras: " +
          MEM_W2 +
          ". Díguelas en voz alta hasta poder nombrarlas sin mirar.\n\nPráctica: Escribe un ejemplo propio de subordinada y otro de compleja. Marca la parte que no puede ir sola.\n\nError común: Pensar que «compleja» significa «difícil de leer»; es un nombre técnico por cómo se combinan las partes.",
      },
    ],
    deepen: [
      {
        heading: "Profundizar: oración simple",
        body:
          "Hoy exploramos la simple desde varios ángulos. Cuenta solo un verbo conjugado que lleve la oración. Prueba el juego del eco: di una oración simple y tu compañero añade un adjetivo sin añadir otro verbo principal.\n\nDesde el análisis, separa sujeto y predicado. En «Mi hermana pequeña dibuja», el sujeto es «mi hermana pequeña» y el predicado «dibuja». Si añades «y canta», ya no es simple.\n\nOtra perspectiva: convierte un titular de noticia en oración simple eliminando segundas acciones.\n\nPráctica: Toma un párrafo corto y subraya solo las oraciones simples. Explica por qué cada una tiene un solo verbo principal.\n\nError común: Tratar «va a cantar» como dos verbos principales; «va a cantar» es una perífrasis con un núcleo «va».\n\nMemorización: di «simple» y recita las cuatro estructuras: " +
          MEM_W2 +
          ".",
        summary:
          "La oración simple tiene un solo verbo principal. Es la base para construir las demás estructuras.",
      },
      {
        heading: "Profundizar: compuesta coordinada",
        body:
          "Hoy jugamos a unir ideas del mismo peso. Las conjunciones coordinantes («y», «o», «pero», «ni», «sino») son pistas. Lee cada miembro por separado: si ambos tienen sentido completo, coordinas.\n\nHaz un cartel de dos columnas: columna A oraciones sobre el colegio, columna B sobre el hogar; luego únelas con «y», «pero» u «o» para crear coordinadas nuevas.\n\nDesde la lectura en voz alta, haz una pausa fuerte en la conjunción para oír las dos partes.\n\nPráctica: Escribe tres coordinadas con distinta conjunción. Marca los dos verbos principales.\n\nError común: Usar coma sin conjunción cuando necesitas «y» u «o» para que quede claro.\n\nMemorización: «compuesta coordinada» es la segunda estructura de la lista: " +
          MEM_W2 +
          ".",
        summary:
          "En la coordinada, dos o más oraciones del mismo nivel se unen con conjunciones coordinantes.",
      },
      {
        heading: "Profundizar: subordinada y compleja",
        body:
          "Hoy cerramos con las estructuras que dependen unas de otras. En la subordinada, una parte no basta sola: «porque estudié» necesita la principal. Palabras como «que», «cuando», «si», «aunque» (subordinantes) avisan.\n\nLa compleja combina mundos: puedes tener una coordinada dentro de una subordinada o varias subordinadas en cadena. Dibuja un esquema con cajas: caja grande = principal, cajas pegadas = subordinadas, ramas dobles = coordinación.\n\nMemorización final: las cuatro estructuras son " +
          MEM_W2 +
          ". Repite y explica con un ejemplo propio de cada una.\n\nPráctica: Escribe una oración compleja de al menos diez palabras. Colorea la principal y subraya cada subordinada.\n\nError común: Llamar «compleja» a cualquier oración larga sin mirar si hay mezcla de coordinación y subordinación.",
        summary:
          "Subordinada une principal y dependiente; compleja mezcla varias relaciones. Memoriza los cuatro nombres para clasificar cualquier oración.",
      },
    ],
    review: [
      {
        heading: "Panorama de la semana",
        body:
          "El tema central fueron las cuatro estructuras de oración. Clasificar ayuda a escribir con claridad y a entender textos largos.\n\nMemorización: " +
          MEM_W2 +
          ".\n\nPráctica: Lee un párrafo de un libro y etiqueta cada oración con S (simple), CC (coordinada), CS (subordinada) o CX (compleja).\n\nError común: Olvidar memorizar los cuatro nombres exactos.",
      },
      {
        heading: "Panorama: oración simple",
        body:
          "Un solo verbo principal, sentido completo. Es el ladrillo básico.\n\nPráctica: Escribe tres simples sobre la misma persona sin repetir el verbo.\n\nError común: Añadir «y» con otro verbo sin darte cuenta.",
      },
      {
        heading: "Panorama: compuesta coordinada",
        body:
          "Dos ideas del mismo nivel unidas por «y», «o», «pero»…\n\nPráctica: Convierte dos simples en una coordinada y vuelve a separarlas.\n\nError común: Confundir «pero» coordinante con subordinante en oraciones largas.",
      },
      {
        heading: "Panorama: subordinada y compleja",
        body:
          "La subordinada necesita apoyo; la compleja combina varias relaciones.\n\nMemorización: repite subordinada y compleja con un ejemplo cada una.\n\nPráctica: Inventa un cuento de dos frases: una subordinada y una compleja.",
      },
      {
        heading: "Síntesis y memorización",
        body:
          "Cierra recitando las cuatro estructuras y mostrando un ejemplo de cada una en voz alta.\n\nMemorización (meta): " +
          MEM_W2 +
          ".\n\nPráctica: Sin mirar, escribe los cuatro nombres y una oración ejemplo al lado.\n\nError común: Mezclar «compuesta subordinada» con «compleja» sin ver si hay también coordinación.",
      },
    ],
    quizzes: {
      1: [
        q("¿Cuántas estructuras de oración memorizamos?", ["Dos", "Cuatro", "Nueve", "Seis"], "Cuatro"),
        q("«El gato duerme» es oración…", ["Simple", "Compuesta coordinada", "Compleja", "Sin predicado"], "Simple"),
        q("«Estudio y juego» es…", ["Simple", "Compuesta coordinada", "Solo interjección", "Sin sujeto"], "Compuesta coordinada"),
        q("«Llegué cuando llamaste» es…", ["Simple", "Compuesta subordinada", "Solo sustantivo", "Sin verbo"], "Compuesta subordinada"),
        q("Oración compleja…", ["Mezcla coordinación y/o varias subordinadas", "Siempre tiene una palabra", "No lleva verbo", "Es igual a simple"], "Mezcla coordinación y/o varias subordinadas"),
        q("En la simple hay…", ["Un verbo principal", "Cinco verbos obligatorios", "Solo interjecciones", "Sin sujeto siempre"], "Un verbo principal"),
        q("«Pero» en coordinada suele marcar…", ["Contraste", "Solo lugar", "Solo plural", "Solo género"], "Contraste"),
        q("Memorización: la primera estructura es…", ["Compleja", "Simple", "Subordinada", "Coordinada"], "Simple"),
      ],
      2: [
        q("¿Cuál es simple?", ["Corro", "Corro y salto", "Corro cuando puedo", "Corro, canto y bailo cuando llueve"], "Corro"),
        q("«Leo o escribo» es…", ["Coordinada", "Simple", "Subordinada sola", "Sin predicado"], "Coordinada"),
        q("Coordina con «y»:", ["Dormí / porque cansado", "Comí / y bebí", "Si llueve / no salgo", "Cuando llegué / cené"], "Comí / y bebí"),
        q("Una subordinada depende de…", ["La oración principal", "Solo un sustantivo", "Un artículo", "Una interjección"], "La oración principal"),
        q("«Si estudias, aprendes» tiene subordinada con…", ["Si", "Solo punto", "Solo coma sin sentido", "Solo mayúscula"], "Si"),
        q("Memorización: segunda estructura…", ["Simple", "Compuesta coordinada", "Compleja", "Interjección"], "Compuesta coordinada"),
        q("¿Qué estructura une ideas del mismo nivel?", ["Subordinada", "Coordinada", "Solo simple", "Solo nombre"], "Coordinada"),
        q("«Llueve y salgo» con dos acciones principales es…", ["Compuesta coordinada", "Solo simple", "Solo interjección", "Sin verbo"], "Compuesta coordinada"),
      ],
      3: [
        q("«Terminé cuando sonó la campana» es…", ["Subordinada", "Solo simple", "Solo interjección", "Sin predicado"], "Subordinada"),
        q("La parte «cuando sonó la campana» sola…", ["Tiene sentido completo", "Depende de la principal", "Es solo sustantivo", "Es artículo"], "Depende de la principal"),
        q("¿Cuál oración es compleja?", ["Cuando llegué, cené y descansé", "Duermo", "¡Hola!", "Mesa azul"], "Cuando llegué, cené y descansé"),
        q("Identifica simple: «Las olas rompen».", ["Simple", "Coordinada", "Subordinada", "Compleja"], "Simple"),
        q("«Quiero ir, pero debo estudiar» es…", ["Coordinada", "Simple", "Solo nombre", "Solo adverbio"], "Coordinada"),
        q("Memorización: tercera estructura…", ["Simple", "Compuesta subordinada", "Artículo", "Verbo"], "Compuesta subordinada"),
        q("«Que» puede introducir…", ["Subordinada", "Solo mayúscula", "Solo punto", "Solo número"], "Subordinada"),
        q("Cuarta estructura memorizada…", ["Compleja", "Simple", "Sustantivo", "Adverbio"], "Compleja"),
      ],
      4: [
        q("Cuenta verbos principales en «Ana canta y baila».", ["Uno", "Dos", "Cero", "Cinco"], "Dos"),
        q("«Porque llovió, no salimos» es…", ["Subordinada", "Solo interjección", "Sin sujeto", "Solo artículo"], "Subordinada"),
        q("Simple con adjetivos largos sigue siendo…", ["Simple si hay un verbo principal", "Siempre compleja", "Siempre coordinada", "Sin estructura"], "Simple si hay un verbo principal"),
        q("Coordinada usa conjunción…", ["Coordinante (y, o, pero)", "Solo punto", "Solo mayúscula", "Solo número"], "Coordinante (y, o, pero)"),
        q("Compleja puede incluir…", ["Varias relaciones entre oraciones", "Solo una letra", "Solo interjección", "Nada"], "Varias relaciones entre oraciones"),
        q("Memorización: orden correcto empieza por…", ["Compleja, simple…", "Simple, coordinada…", "Verbo, sustantivo…", "Solo interjección…"], "Simple, coordinada…"),
        q("«Cuando termine, celebraremos y descansaremos» sugiere…", ["Compleja", "Solo simple", "Solo una palabra", "Sin verbo"], "Compleja"),
        q("Subordinada no se entiende…", ["Sola, sin principal", "Nunca", "Solo de día", "Solo en inglés"], "Sola, sin principal"),
        q("Juego: etiqueta «CC» a…", ["Pan y queso son ricos", "Duermo", "¡Hola!", "Solo «mesa»"], "Pan y queso son ricos"),
        q("Juego: etiqueta «CS» a…", ["Llegué cuando pudiste", "Corro", "Mesa", "Azul"], "Llegué cuando pudiste"),
        q("Lista de memorización tiene…", ["Cuatro estructuras", "Dos", "Nueve categorías", "Doce meses"], "Cuatro estructuras"),
        q("«O» en «estudio o leo» marca…", ["Alternativa coordinada", "Solo emoción", "Solo lugar", "Solo tiempo verbal"], "Alternativa coordinada"),
      ],
      5: [
        q("Meta semanal: memorizar…", ["Cuatro estructuras", "Solo verbos", "Solo mapas", "Solo tablas"], "Cuatro estructuras"),
        q("Repaso: «compuesta coordinada» une…", ["Ideas del mismo nivel", "Solo sustantivos", "Solo artículos", "Solo números"], "Ideas del mismo nivel"),
        q("«El perro ladra» es…", ["Simple", "Compleja", "Coordinada", "Subordinada"], "Simple"),
        q("Memorización: cuarta estructura…", ["Compleja", "Simple", "Pronombre", "Adverbio"], "Compleja"),
        q("«Aunque cansado, terminé» (análisis escolar) suele ser…", ["Compuesta", "Solo letra", "Solo punto", "Sin verbo"], "Compuesta"),
        q("Panorama: tema central…", ["Cuatro estructuras de oración", "Nueve categorías", "Geografía", "Matemáticas"], "Cuatro estructuras de oración"),
        q("Subordinada lleva…", ["Oración principal + dependiente", "Solo interjección", "Solo artículo", "Sin predicado"], "Oración principal + dependiente"),
        q("¿Cuál es coordinada?", ["Corro y nado", "Corro", "Cuando corro", "Corro, luego cuando…"], "Corro y nado"),
        q("Síntesis: las cuatro son…", ["simple, coordinada, subordinada, compleja", "solo verbos", "solo sustantivos", "solo adjetivos"], "simple, coordinada, subordinada, compleja"),
        q("Error típico: toda oración larga es…", ["Siempre compleja sin analizar", "Siempre simple", "Sin verbo", "Solo interjección"], "Siempre compleja sin analizar"),
        q("«Si llueve, me quedo» es…", ["Subordinada condicional", "Solo nombre", "Solo artículo", "Sin estructura"], "Subordinada condicional"),
        q("Memorización: segunda es…", ["Compuesta coordinada", "Simple", "Interjección", "Artículo"], "Compuesta coordinada"),
        q("Compleja puede mezclar…", ["Coordinación y subordinación", "Solo mayúsculas", "Solo puntos", "Solo números"], "Coordinación y subordinación"),
        q("Repaso final: ¿cuántas estructuras?", ["Cuatro", "Una", "Nueve", "Cero"], "Cuatro"),
        q("Etiqueta CX a oración con subordinada y coordinación.", ["Cuando llegué, cené y descansé", "Duermo", "¡Ay!", "Mesa"], "Cuando llegué, cené y descansé"),
        q("Memorización completa:", ["simple, compuesta coordinada, compuesta subordinada, compleja", "solo y, o, pero", "solo sustantivo", "solo verbo"], "simple, compuesta coordinada, compuesta subordinada, compleja"),
      ],
    },
  },
};

function q(prompt, choices, answer) {
  return { type: "mcq", prompt, choices, answer };
}

function buildQuiz(weekNum, day) {
  const bank = weeks[weekNum].quizzes;
  const all = [];
  for (let d = 1; d <= day; d++) {
    const items = bank[d];
    items.forEach((item, i) => {
      all.push({
        id: `d${d}-q${i + 1}`,
        originDay: d,
        type: "mcq",
        prompt: item.prompt,
        choices: item.choices,
        answer: item.answer,
      });
    });
  }
  const expected = day === 4 ? 36 : day === 5 ? 52 : day * 8;
  if (all.length !== expected) {
    throw new Error(`week${weekNum} day${day}: expected ${expected} questions, got ${all.length}`);
  }
  return { questionCount: expected, questions: all };
}

function writeCell(weekNum, day, doc) {
  const dir = path.join(mediaRoot, `week${weekNum}`);
  const file = path.join(dir, `esp-c3-w${weekNum}-d${day}-l6.eoschool.json`);
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
  console.log("wrote", file);
}

for (const weekNum of [1, 2]) {
  const w = weeks[weekNum];
  for (let day = 1; day <= 5; day++) {
    let lesson;
    if (day === 1) {
      lesson = {
        kind: "intro",
        focusPoint: null,
        points: w.intro,
        summary: w.summary,
      };
    } else if (day <= 4) {
      const d = w.deepen[day - 2];
      lesson = {
        kind: "deepen",
        focusPoint: day - 1,
        points: [{ id: "p1", heading: d.heading, body: d.body }],
        summary: d.summary || "",
      };
    } else {
      lesson = {
        kind: "review",
        focusPoint: null,
        points: w.review.map((p, i) => ({
          id: `p${i + 1}`,
          heading: p.heading,
          body: p.body,
        })),
        summary: w.summary,
      };
    }
    const doc = {
      format: "eoschool",
      version: 1,
      cycle: 3,
      week: weekNum,
      day,
      level: 6,
      subject: "esp",
      locale: "es",
      title: w.title,
      lesson,
      quiz: buildQuiz(weekNum, day),
      media: [],
    };
    writeCell(weekNum, day, doc);
  }
}
