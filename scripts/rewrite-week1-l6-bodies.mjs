/**
 * Curated class-band bodies for ciclo 3 week 1 level-6.
 * Preserves id / mppe / memoryPhrase / supportUrl / quiz.
 * Run before rebalance-week1-l6.mjs and trim-week1-d5-review.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const week1 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../frontend/public/homescool/media/week1");

const es = (idea, practice, error) =>
  `${idea.trim()}\n\nPráctica: Ahora te toca a ti. ${practice.trim()}\n\nError común: ${error.trim()}`;

const en = (idea, practice, error) =>
  `${idea.trim()}\n\nPractice: Your turn. ${practice.trim()}\n\nCommon mistake: ${error.trim()}`;

/** @type {Record<string, { points?: string[]; weekRecap?: string; priorDayRecap?: string; summary?: string }>} */
const PATCH = {
  // ——— PRO ———
  "pro-c3-w1-d1-l6": {
    summary: "Esta semana construyes el experimento «Guiñando» y explicas la persistencia de la visión.",
    points: [
      es(
        "Un experimento es una prueba ordenada para observar un fenómeno. La **persistencia de la visión** ocurre cuando el ojo guarda una imagen por un instante y el cerebro une imágenes que cambian rápido. El experimento «Guiñando» usa dos dibujos: un ojo abierto y un ojo cerrado. Cuando el disco gira rápido, parece que el ojo guiña.\n\nNecesitas cartulina firme, lápiz, cinta y tijeras con ayuda adulta. Dibuja las dos caras alineadas para que, al girar, coincidan en el mismo lugar.",
        "Reúne materiales, dibuja las dos caras y revisa que queden alineadas. Anota en tu bitácora qué usaste.",
        "Si los dibujos no coinciden al girar, el efecto será difícil de ver.",
      ),
      es(
        "Un **procedimiento** es una serie de pasos en orden. Seguir el orden permite observar qué sucede y explicarlo después. Para este thaumatropo: dibuja, recorta con ayuda, une las caras y haz girar el disco.\n\nPrueba una velocidad lenta y otra rápida. Compara: ¿cuándo parece un solo ojo que guiña? Anota el intento en una tabla de dos columnas: velocidad y resultado.",
        "Escribe los pasos numerados y marca cuál velocidad produjo el mejor efecto.",
        "Girar demasiado lento hace que las dos imágenes no parezcan una sola.",
      ),
      es(
        "La **retina** recibe imágenes en el ojo. En la persistencia de la visión, el cerebro recibe imágenes tan seguidas que parece unirlas. Por eso el disco muestra un ojo que guiña aunque los dibujos sigan en lados distintos.\n\nEl efecto se parece a una secuencia rápida de dibujos, no a magia. Explica con las palabras imagen, ojo y cerebro.",
        "Escribe tres oraciones: qué hiciste, qué viste y por qué crees que pasó.",
        "Los dibujos no se mezclan físicamente; el efecto ocurre al mirar el giro rápido.",
      ),
    ],
  },
  "pro-c3-w1-d2-l6": {
    weekRecap: "Proyecto único: disco «Guiñando» y persistencia de la visión. Bitácora con fecha, intento y resultado.",
    points: [
      es(
        "Esta semana hay un solo proyecto. El día 1 ya explicó materiales, pasos y el porqué; hoy continúas el mismo experimento «Guiñando». No empieces otro tema.\n\nRevisa alineación de las caras, firmeza del disco y si la cinta deja girar con suavidad. En la **bitácora**, anota fecha, intento y resultado (¿se vio el guiño?) en una **tabla** de dos columnas.\n\nSi el efecto falla, cambia una sola variable: velocidad, tamaño del dibujo o alineación. Así sabrás qué ayudó.",
        "Reúne lo que falte, monta o corrige el experimento y escribe tres líneas: qué hiciste, qué viste y qué te falta.",
        "No inventes otro experimento esta semana. El proyecto es uno solo: la persistencia de la visión.",
      ),
    ],
  },
  "pro-c3-w1-d3-l6": {
    weekRecap: "Proyecto único: disco «Guiñando» y persistencia de la visión. Bitácora con fecha, intento y resultado.",
    priorDayRecap: "Ayer montaste o corregiste el disco y anotaste si se vio el guiño.",
    points: [
      es(
        "Sigue con el experimento «Guiñando». Hoy te concentras en el **procedimiento** y en anotar lo que observas sin cambiar de tema.\n\nCompara dos velocidades de giro. Marca en tu tabla cuál intento funcionó mejor y con qué detalle (más rápido, más alineado, disco más firme). Un buen registro permite repetir el éxito mañana.\n\nSi trabajas con un adulto, pídele que gire mientras tú miras y dictas la observación.",
        "Repite el procedimiento con cuidado. Anota velocidad y una observación concreta en la bitácora.",
        "No inventes otro experimento esta semana; profundiza en el mismo disco.",
      ),
    ],
  },
  "pro-c3-w1-d4-l6": {
    weekRecap: "Proyecto único: disco «Guiñando» y persistencia de la visión. Bitácora con fecha, intento y resultado.",
    priorDayRecap: "Ayer comparaste velocidades y anotaste cuál intento funcionó mejor.",
    points: [
      es(
        "Casi terminas la semana de proyecto. Termina o mejora el experimento «Guiñando» y deja claras tus observaciones para explicarlas mañana.\n\nAntes de la conclusión, **planifica** tres líneas: qué hiciste, qué viste, qué crees que pasó. Usa las palabras persistencia, retina y cerebro si te ayudan.\n\nPrepara un dibujo o foto del disco para la presentación. Una ficha breve (propósito, resultado, explicación) sirve de guion.",
        "Completa la ficha: propósito, un resultado y una oración que explique por qué ocurrió.",
        "No inventes otro experimento; cierra este con datos de tu bitácora.",
      ),
    ],
  },
  "pro-c3-w1-d5-l6": {
    summary: "Día 5: presentación del proyecto semanal con bitácora y explicación clara.",
    points: [
      es(
        "Cierras la semana del disco «Guiñando» y preparas tu miniexposición. Presentar es contar con claridad qué investigaste, qué materiales usaste, qué observaste y qué conclusión escribiste.\n\nUn orden útil es: propósito (¿puede un disco parecer un ojo que guiña?), materiales, observación (tabla de la bitácora) y explicación (persistencia de la visión). Ensaya dos minutos en voz alta; muestra el disco o un dibujo. Responde una pregunta con tus datos, no inventando.",
        "Practica frente a un adulto con ese orden. Termina con «Creo que pasó porque…».",
        "No leas solo el título del experimento. Cuenta pasos, datos y conclusión.",
      ),
    ],
  },

  // ——— ESP ———
  "esp-c3-w1-d1-l6": {
    summary: "Nueve categorías gramaticales: reconocerlas en oraciones y memorizar la lista completa.",
    points: [
      es(
        "Una **categoría gramatical** es el tipo de palabra según su función. El **sustantivo** nombra personas, animales, cosas, lugares o ideas: «perro», «Caracas», «alegría». El **verbo** expresa acción o estado: «corro», «duermo», «soy». El **pronombre** sustituye a un sustantivo para no repetirlo: «él», «ella», «nosotros», «esto».\n\nEstas tres categorías aparecen en casi todas las oraciones. Pregunta: ¿quién o qué? (sustantivo/pronombre) y ¿qué hace? (verbo).",
        "Escribe tres oraciones tuyas. En cada una marca un sustantivo, un verbo y, si puedes, un pronombre.",
        "Confundir adjetivo con sustantivo. «Roja» describe; «camisa» nombra.",
      ),
      es(
        "El **adjetivo** describe al sustantivo: «casa grande», «niño valiente». El **artículo** acompaña al sustantivo: definido («el», «la») o indefinido («un», «una»). El **adverbio** modifica al verbo, a otro adverbio o a un adjetivo: «corre rápido», «muy bien», «casi siempre».\n\nEstas palabras afinan el mensaje sin ser la acción principal. En «Una niña talentosa canta bastante bien» hay artículo, adjetivo, sustantivo, verbo y adverbios.",
        "Separa en esa oración artículo, adjetivo, adverbios, sustantivo y verbo.",
        "Creer que «muy» es adjetivo. «Muy» intensifica; no describe al sustantivo solo.",
      ),
      es(
        "La **conjunción** une palabras u oraciones: «pan y mantequilla», «quiero jugar, pero llueve». La **preposición** marca relación: «a», «de», «en», «con», «sin», «para», «por». La **interjección** expresa emoción de golpe: «¡Ay!», «¡Bravo!», «¡Eh!».\n\nCon estas tres cierras las nueve categorías de la semana. Practica enumerarlas de memoria con un ritmo.",
        "Escribe una oración con conjunción, preposición e interjección. Luego enumera las nueve categorías.",
        "Confundir preposición con conjunción. «Y» une; «a» introduce relación.",
      ),
    ],
  },
  "esp-c3-w1-d2-l6": {
    weekRecap: "Nueve categorías: sustantivo, pronombre, verbo, adverbio, conjunción, interjección, preposición, adjetivo, artículo.",
    points: [
      es(
        "El **sustantivo** puede ser común («ciudad») o propio («Barquisimeto»), singular o plural. El **verbo** cambia según quién actúa: «yo canto», «tú cantas». El **pronombre** evita repetir: en lugar de «Ana ve a Ana», decimos «Ana se ve».\n\nClasifica palabras de un texto breve: primero solo sustantivos, luego verbos, luego pronombres. Pregunta por función: el sustantivo responde «¿quién o qué?», el verbo «¿qué hace?».\n\nPrueba con «Ellos leen el libro»: ¿cuál es el pronombre? ¿Cuál el verbo? ¿Cuál el sustantivo?",
        "Copia un párrafo breve. Cuenta sustantivos, verbos y pronombres. Escribe una oración nueva usando las tres.",
        "Tomar «ser» o «estar» como sustantivos. Son verbos aunque sean cortos.",
      ),
    ],
  },
  "esp-c3-w1-d3-l6": {
    weekRecap: "Nueve categorías: sustantivo, pronombre, verbo, adverbio, conjunción, interjección, preposición, adjetivo, artículo.",
    priorDayRecap: "Ayer clasificaste sustantivos, verbos y pronombres en un texto breve.",
    points: [
      es(
        "El **artículo** y el **adjetivo** acompañan al sustantivo; el **adverbio** matiza el verbo o el adjetivo. En «La casa antigua se ve muy cerca», «la» es artículo, «antigua» adjetivo y «muy» / «cerca» trabajan como adverbios.\n\nCambia un solo adjetivo y un solo adverbio en la misma oración para ver cómo cambia el tono. Compara «corre despacio» con «corre rápido»: el verbo sigue, el detalle cambia.\n\nRecuerda: el adjetivo mira al sustantivo; el adverbio mira a la acción o a la intensidad.",
        "Escribe dos oraciones gemelas que solo cambien adjetivo o adverbio. Subraya cada categoría.",
        "Poner el adverbio como si describiera al sustantivo: «niño rápidamente» suena mal; di «niño rápido» o «corre rápidamente».",
      ),
    ],
  },
  "esp-c3-w1-d4-l6": {
    weekRecap: "Nueve categorías: sustantivo, pronombre, verbo, adverbio, conjunción, interjección, preposición, adjetivo, artículo.",
    priorDayRecap: "Ayer distinguiste artículo, adjetivo y adverbio en oraciones gemelas.",
    points: [
      es(
        "La **conjunción** une ideas del mismo nivel («y», «pero», «o»). La **preposición** introduce relación («en la mesa», «con mamá»). La **interjección** estalla emoción («¡Uy!»).\n\nArma una mini-historia de tres oraciones: una con «y», una con «pero» y una con una preposición de lugar. Al final, añade una interjección que encaje con el final.\n\nDi en voz alta la lista de nueve categorías; si fallas una, vuelve a este bloque de enlaces.",
        "Escribe la mini-historia y marca conjunción, preposición e interjección con colores distintos.",
        "Usar «en» como si fuera conjunción. «En» relaciona; no une dos oraciones solas.",
      ),
    ],
  },

  // ——— ING (locale en) ———
  "ing-c3-w1-d1-l6": {
    summary: "Three Spanish verb families: -ar, -er, and -ir. Conjugate cantar, comer, and vivir for yo, tú, and él.",
    points: [
      en(
        "A Spanish verb names an action. To **conjugate** means to change it for the person who acts. An **infinitive** is the dictionary form, such as **cantar**. The **stem** remains after you drop **-ar**; the **ending** is what you add.\n\n**Cantar** belongs to the **-ar** family. With stem **cant-**: yo **canto**, tú **cantas**, él **canta**. **Hablar** follows the same pattern: hablo, hablas, habla.",
        "Write yo / tú / él for cantar and hablar. Say them out loud.",
        "Keeping the -ar on the stem (cantaro). Drop -ar first, then add the ending.",
      ),
      en(
        "**Comer** is an infinitive in the Spanish **-er** family. Its stem is **com-**. Present endings for yo, tú, and él are **-o**, **-es**, and **-e**.\n\nCom- plus -o makes yo **como**; plus -es makes tú **comes**; plus -e makes él **come**. **Beber** works the same way: bebo, bebes, bebe. Notice -er and -ir share -o/-es/-e for these three persons, but the infinitive ending still shows the family.",
        "Write yo / tú / él for comer and beber. Circle the endings.",
        "Using -as/-a (from -ar) with comer. Say comes / come, not comas / coma in this present pattern.",
      ),
      en(
        "**Vivir** is an infinitive in the Spanish **-ir** family. Its stem is **viv-**. For yo, tú, and él the present endings are again **-o**, **-es**, and **-e**: **vivo**, **vives**, **vive**.\n\n**Escribir** follows the same route: escribo, escribes, escribe. Compare three infinitives side by side: cantar / comer / vivir. The family label sits on the infinitive; the person shows in the ending.",
        "Make a three-column chart for cantar, comer, and vivir (yo, tú, él).",
        "Mixing families: writing «yo vive» or «él canto». Match stem family and person ending.",
      ),
    ],
  },
  "ing-c3-w1-d2-l6": {
    weekRecap: "Spanish families: -ar (cantar), -er (comer), -ir (vivir). Conjugate for yo, tú, and él in the present.",
    points: [
      en(
        "Stay with the **-ar** family today. Remember: verb = action; conjugate = change for who; stem = fixed part; ending = tip. With **cantar**, drop **-ar** to keep **cant-**, then add **-o / -as / -a**.\n\nBuild a tiny story: yo **canto** in the morning, tú **cantas** at school, él **canta** at home. Switch the verb to **hablar** or **bailar** without changing the endings pattern.\n\nCompare **canto** and **cantas** out loud: what stays (the stem) and what changes (the ending).",
        "Write six forms: cantar and hablar for yo, tú, and él. Underline each ending.",
        "Leaving -ar on the verb (yo cantaro). Always drop the infinitive ending first.",
      ),
    ],
  },
  "ing-c3-w1-d3-l6": {
    weekRecap: "Spanish families: -ar (cantar), -er (comer), -ir (vivir). Conjugate for yo, tú, and él in the present.",
    priorDayRecap: "Yesterday you practiced -ar forms with cantar and hablar.",
    points: [
      en(
        "Today deepen the **-er** family with **comer**. Stem **com-** plus **-o / -es / -e** gives **como**, **comes**, **come**. Try **beber** and **leer** (leo, lees, lee) the same way.\n\nMake food sentences: yo **como** arroz, tú **comes** fruta, él **come** pan. Then swap only the person ending and keep the stem.\n\nSay the -ar and -er tú forms side by side: **cantas** vs **comes**. Hear how -as and -es mark different families.",
        "Write yo / tú / él for comer, beber, and leer. Box every -es ending.",
        "Using -ar endings on -er verbs (tú comas). Present tú for -er is comes.",
      ),
    ],
  },
  "ing-c3-w1-d4-l6": {
    weekRecap: "Spanish families: -ar (cantar), -er (comer), -ir (vivir). Conjugate for yo, tú, and él in the present.",
    priorDayRecap: "Yesterday you practiced -er forms with comer, beber, and leer.",
    points: [
      en(
        "Close the week’s deepen path with **-ir**: **vivir → vivo, vives, vive**. Add **escribir** and **abrir** (abro, abres, abre).\n\nBuild a city chart: yo **vivo** aquí, tú **vives** cerca, él **vive** lejos. Then rewrite the same chart with **escribir**.\n\nReview all three families in one glance: cantar / comer / vivir for yo only, then for tú only. Your ear should catch -o, then -as/-es, then -a/-e.",
        "Fill a 3×3 grid: rows cantar, comer, vivir; columns yo, tú, él.",
        "Writing «yo vivés» or mixing -ir with -ar endings. Keep -ir present as -o/-es/-e for these persons.",
      ),
    ],
  },

  // ——— LAT ———
  "lat-c3-w1-d1-l6": {
    summary: "Preposiciones latinas cortas: in, apud, per, sine, a/ab y de, con su idea en español.",
    points: [
      es(
        "Una **preposición** latina es una palabra corta que muestra relación. **In** suele significar **en** (lugar dentro o sobre). **Apud** puede significar **con** o **junto a** (compañía o cercanía).\n\nEjemplos: **in** aqua = en el agua; **apud** amicos = con los amigos. Primero entiende la relación; después traduce.",
        "Escribe tres frases en español con «en» y tres con «con». Indica si usarías in o apud.",
        "Traducir apud siempre como «en». Su idea principal es compañía o cercanía.",
      ),
      es(
        "**Per** suele marcar camino o medio: **por**. **Sine** marca ausencia: **sin**. **Per** viam = por el camino; **sine** aqua = sin agua.\n\nPiensa en preguntas: ¿por dónde? (per) y ¿falta algo? (sine). No las intercambies: «sin camino» no es lo mismo que «por el camino».",
        "Inventa dos oraciones con «por» y dos con «sin». Escribe al lado per o sine.",
        "Usar per para decir «sin». Per = por / a través; sine = sin.",
      ),
      es(
        "**A/ab** y **de** pueden traducirse «de», pero no siempre igual. **A/ab** suele marcar origen o alejamiento (de / desde). **De** también puede marcar origen, tema o separación según la frase.\n\nEjemplos guía: **a** Roma (desde Roma, en algunos contextos escolares), **de** libro (del libro / acerca del libro). Pregunta siempre: ¿origen, tema o separación?",
        "Copia dos ejemplos con a/ab y dos con de. Explica en una línea qué relación muestra cada uno.",
        "Creer que a y de son la misma palabra latina. Se parecen en español, pero el latín las distingue.",
      ),
    ],
  },
  "lat-c3-w1-d2-l6": {
    weekRecap: "in = en · apud = con · per = por · sine = sin · a/ab = de · de = de. Relaciones de lugar, compañía, camino y origen.",
    points: [
      es(
        "Hoy practicas solo **in** y **apud**. **In** responde «¿en dónde?». **Apud** responde «¿con quién?» o «¿junto a quién?».\n\nArma pares: in schola / apud magistrum. Traduce primero la relación y luego la frase completa. Cambia el nombre después de apud y mira cómo cambia la compañía, no el lugar.\n\nDi en voz alta: in = en; apud = con.",
        "Escribe cuatro mini-frases: dos con in y dos con apud. Subraya la preposición.",
        "Poner apud donde corresponde in («apud aqua»). Usa in para el lugar dentro/en.",
      ),
    ],
  },
  "lat-c3-w1-d3-l6": {
    weekRecap: "in = en · apud = con · per = por · sine = sin · a/ab = de · de = de. Relaciones de lugar, compañía, camino y origen.",
    priorDayRecap: "Ayer practicaste in (en) y apud (con) en mini-frases.",
    points: [
      es(
        "Hoy profundizas **per** y **sine**. **Per** = por / a través de; **sine** = sin. Imagina un camino: caminas **per** silvam (por el bosque) o te quedas **sine** luce (sin luz).\n\nInventa contrastes: per mare / sine nave. Explica qué cambia cuando quitas el medio o el camino.\n\nRecita: per = por; sine = sin.",
        "Escribe tres contrastes per/sine y tradúcelos. Marca la preposición en rojo.",
        "Traducir sine como «por». Si falta algo, es sine; si hay camino o medio, mira per.",
      ),
    ],
  },
  "lat-c3-w1-d4-l6": {
    weekRecap: "in = en · apud = con · per = por · sine = sin · a/ab = de · de = de. Relaciones de lugar, compañía, camino y origen.",
    priorDayRecap: "Ayer contrastaste per (por) y sine (sin) en frases cortas.",
    points: [
      es(
        "Cierra con **a/ab** y **de**. Ambas pueden verse como «de» en español, pero preguntas distintas: ¿desde dónde / de quién? (a/ab) y ¿de qué / acerca de qué? (de), según el ejemplo de la guía.\n\nHaz una tabla de dos columnas y coloca ejemplos de la lección. Luego inventa uno nuevo en cada columna sin mezclarlas.\n\nRepasa las seis preposiciones de la semana en voz alta.",
        "Completa la tabla a/ab vs de con cuatro ejemplos y una oración tuya en cada lado.",
        "Usar siempre la misma traducción «de» sin preguntar la relación. Pregunta origen, tema o separación.",
      ),
    ],
  },

  // ——— MAT ———
  "mat-c3-w1-d1-l6": {
    summary: "Multiplicar como grupos iguales: tablas del 1 al 12 con patrones y comprobación.",
    points: [
      es(
        "Multiplicar es formar **grupos iguales**. Los números que se multiplican son **factores**; la respuesta es el **producto**. El signo × dice cuántos grupos y cuántos hay en cada grupo.\n\nTablas **1 a 4**: la del 1 conserva el número (1×9=9); la del 2 busca el doble; la del 3 y la del 4 pueden comprobarse con suma repetida (3×4=4+4+4).",
        "Resuelve 1×8, 2×7, 3×6 y 4×9. Escribe la suma repetida de uno de ellos.",
        "Sumar los factores (3+4) en lugar de formar grupos (3×4).",
      ),
      es(
        "Tablas **5 a 8**: la del 5 termina en 0 o 5; la del 6 combina ideas del 2 y del 3; la del 7 pide práctica paciente; la del 8 duplica la del 4.\n\nBusca patrones en voz alta: 5, 10, 15, 20… y 8, 16, 24…. Si dudas, dibuja grupos o usa dedos por grupos, no adivines.",
        "Resuelve 5×6, 6×4, 7×3 y 8×5. Explica un patrón que usaste.",
        "Memorizar sin patrón. Un patrón te ayuda cuando olvidas un producto.",
      ),
      es(
        "Tablas **9 a 12**: la del 9 tiene trucos con dedos o suma de dígitos; la del 10 añade un cero al otro factor; la del 11 (hasta 9×11) repite dígitos; la del 12 une 10× y 2×.\n\nEjemplo: 12×7 = (10×7)+(2×7) = 70+14 = 84. Descomponer hace manejable lo grande.",
        "Resuelve 9×6, 10×8, 11×5 y 12×7. Muestra una descomposición para 12×7.",
        "Olvidar que 12×n = 10×n + 2×n. Usa esa ayuda antes de rendirte.",
      ),
    ],
  },
  "mat-c3-w1-d2-l6": {
    weekRecap: "Multiplicar = grupos iguales. Factores y producto. Tablas 1–12 con patrones y comprobación.",
    points: [
      es(
        "Practica las tablas del **1 al 4** desde grupos iguales. 1×n deja n; 2×n es el doble; 3×n y 4×n se comprueban sumando n tres o cuatro veces.\n\nArma una cartela: dibuja 3 grupos de 4 puntos y escribe 3×4=12. Luego cambia a 4×3 y mira que el producto coincide aunque cambie el dibujo.\n\nDi en voz alta la tabla del 4 hasta 4×10.",
        "Resuelve 1×8, 2×7, 3×6 y 4×9. Inventa un problema de grupos iguales para uno.",
        "Sumar los dos factores. Para 3×4 cuenta tres grupos de cuatro.",
      ),
    ],
  },
  "mat-c3-w1-d3-l6": {
    weekRecap: "Multiplicar = grupos iguales. Factores y producto. Tablas 1–12 con patrones y comprobación.",
    priorDayRecap: "Ayer practicaste las tablas del 1 al 4 con grupos y suma repetida.",
    points: [
      es(
        "Hoy entran las tablas del **5 al 8**. Usa el patrón del 5 (0 o 5 al final). Para el 6, piensa 3×n y duplícalo, o 2×n y súmalo tres veces según te resulte más claro.\n\nEl 7 se afirma con repetición breve: elige cuatro productos y repítelos en voz alta. El 8 puede ser el doble de la tabla del 4: si 4×6=24, entonces 8×6=48.\n\nComprueba un producto con suma repetida cuando dudes.",
        "Resuelve 5×7, 6×5, 7×4 y 8×6. Escribe cómo comprobaste uno.",
        "Adivinar el 7 sin estrategia. Usa suma repetida o un producto vecino.",
      ),
    ],
  },
  "mat-c3-w1-d4-l6": {
    weekRecap: "Multiplicar = grupos iguales. Factores y producto. Tablas 1–12 con patrones y comprobación.",
    priorDayRecap: "Ayer practicaste las tablas del 5 al 8 con patrones y comprobación.",
    points: [
      es(
        "Cierra con **9 a 12**. Para 9×n, prueba un truco de dedos o revisa que los dígitos del producto sumen 9 (en varios casos). Para 10×n, escribe n y un cero. Para 11×n (con n de 1 a 9), suele repetirse el dígito: 11×4=44.\n\nPara 12×n, descompón: 12×8 = 10×8 + 2×8. Explica cada paso en voz alta antes de escribir el resultado.",
        "Resuelve 9×7, 10×9, 11×6 y 12×8. Muestra la descomposición de 12×8.",
        "Tratar 12×n como si fuera 10×n solamente. Suma también el 2×n.",
      ),
    ],
  },

  // ——— HIS (trim deepen band; keep 2 points) ———
  "his-c3-w1-d1-l6": {
    summary: "Antes de Colón, Venezuela ya tenía pueblos diversos: mapa, modos de vida y respeto.",
    points: [
      es(
        "Antes de la llegada de **Colón**, el territorio que hoy llamamos Venezuela ya estaba habitado. **Pueblo originario** significa una comunidad que vivía en América mucho antes de los barcos europeos. Esta semana conoces a algunos de esos pueblos y entiendes que no formaban un solo grupo igual.\n\nLos cuatro nombres guía son **Timotocuicas**, **Caribes**, **Arawacos** y **Wayús**.",
        "Copia los cuatro nombres. Di: «Antes de Colón ya vivían aquí…» y completa la lista.",
        "Pensar que «indígena» es un solo pueblo. Son muchas culturas distintas.",
      ),
      es(
        "Un **territorio** es un espacio donde un grupo vive, pesca, cultiva o recorre rutas. La geografía ayuda a entender por qué no todos vivían igual. En los llanos, cerca del Orinoco, se asocian a menudo los **Timotocuicas** con agricultura y aldeas; en la costa, viajes y pesca; en La Guajira, otros modos.\n\nEl mapa evita poner a todos en el mismo punto.",
        "Dibuja un mapa sencillo y escribe un pueblo junto a cada región (llanos, litoral, Guajira).",
        "Ubicar todos los pueblos en el mismo lugar.",
      ),
      es(
        "Los historiadores usan varias miradas: **arqueología** (cerámica, herramientas), lenguas y tradiciones orales, y comparación entre regiones. El trueque existía antes de Colón.\n\nEstudiar con respeto significa hablar de personas reales, no de personajes de cuento.",
        "Elige un pueblo y escribe tres oraciones: región, actividad e importancia de recordarlo.",
        "Creer que solo existen nombres de libro y no comunidades con memoria viva.",
      ),
    ],
  },
  "his-c3-w1-d2-l6": {
    weekRecap: "Timotocuicas, Caribes, Arawacos y Wayús habitaban Venezuela antes de Colón. Mapa, vida y respeto.",
    points: [
      es(
        "Profundizamos en los **Timotocuicas** y su relación con los llanos. Un **llano** es una planicie con pastos y ríos. Cultivaban en **conucos** (yuca, maíz), pescaban y cazaban según la estación. El trueque conectaba productos del río con otras zonas.\n\nImagina un día: mañana en el conuco, tarde cerca del agua, noche con relatos en la aldea.",
        "Escribe un mini-diario de ese día y menciona la palabra Timotocuica.",
        "Confundir Timotocuicas con Wayús. Los Wayús se asocian sobre todo a La Guajira.",
      ),
      es(
        "Texto de memoria de la semana:\n\n«Los primeros habitantes de Venezuela antes de la llegada de **Colón** fueron los **Timotocuicas**, **Caribes**, **Arawacos** y **Wayús**.»\n\nLéelo tres veces; tapa la mitad y completa.",
        "Escríbelo una vez; luego completa huecos sin mirar la guía.",
        "Saltarse un nombre o inventar pueblos fuera de la lista.",
      ),
    ],
  },
  "his-c3-w1-d3-l6": {
    weekRecap: "Timotocuicas, Caribes, Arawacos y Wayús habitaban Venezuela antes de Colón. Mapa, vida y respeto.",
    priorDayRecap: "Ayer profundizaste en Timotocuicas, llanos y conucos.",
    points: [
      es(
        "**Caribes** se ligan al mar Caribe, la pesca y viajes en canoa. **Arawacos** forman una familia lingüística amplia; en Venezuela aparecen en selva y costa con yuca e intercambio. La canoa permitía el **cabotaje** (navegar pegado a la costa).\n\nCompara región, comida y transporte en dos columnas.",
        "Haz columnas Caribes / Arawacos con región, comida y transporte.",
        "Usar «caribe» solo como enemigo de cuentos. Es nombre de pueblos con cultura propia.",
      ),
      es(
        "Repite el texto guía con los cuatro pueblos y Colón. Marca con el dedo cada nombre al decirlo. Si fallas uno, reinicia la frase completa.",
        "Recita el texto a un adulto y pide que señale si faltó un nombre.",
        "Cambiar el orden hasta perder un pueblo de la lista.",
      ),
    ],
  },
  "his-c3-w1-d4-l6": {
    weekRecap: "Timotocuicas, Caribes, Arawacos y Wayús habitaban Venezuela antes de Colón. Mapa, vida y respeto.",
    priorDayRecap: "Ayer comparaste Caribes y Arawacos en costa, ríos e intercambio.",
    points: [
      es(
        "Los **Wayús** (también Wayúu) se asocian a La **Guajira**: desierto, viento y costa. Pastoreo, tejeduría del chinchorro y rutas que cruzan hacia Colombia. La **memoria viva** significa que idioma y tradiciones continúan hoy.\n\nPregunta: ¿qué continúa y qué cambió después del contacto europeo?",
        "Elige una artesanía wayúu y escribe tres oraciones: para qué sirve y qué clima la hace útil.",
        "Olvidar a los Wayús al repetir la lista de cuatro pueblos.",
      ),
      es(
        "Cierra memorizando la frase completa de la semana sin mirar. Si puedes explicarla con mapa (llanos, costa, Guajira), ya uniste memoria y sentido.",
        "Di el texto de memoria y señala en un mapa tres regiones distintas.",
        "Recitar nombres sin saber ubicar ninguno en el mapa.",
      ),
    ],
  },

  // ——— LT ———
  "LT-c3-w1-d1-l6": {
    summary: "Línea de tiempo: ordenar relatos y pueblos antiguos sin mezclar tipos de fuente.",
    points: [
      es(
        "Una **línea de tiempo** pone hechos en orden: primero lo más antiguo, después lo más reciente. Un **hito** es un hecho importante que ayuda a recordar una época.\n\nEsta semana miras dos clases de información: historia de pueblos del Mediterráneo y del Cercano Oriente, y el relato de Génesis. Son fuentes distintas; se anotan con cuidado.",
        "Dibuja una línea y marca dos hitos con etiquetas distintas: «historia» y «Génesis».",
        "Tratar una fecha histórica y un capítulo bíblico como el mismo tipo de dato.",
      ),
      es(
        "El relato de **Babel** y el pueblo de los **sumerios** (entre Tigris y Éufrates) ayudan a practicar orden: primero entiendes cada nombre; después lo colocas en la línea sin mezclar explicaciones.\n\nPregunta siempre: ¿qué sé de este hito y de qué tipo de fuente viene?",
        "Escribe dos fichas: Babel y sumerios. En cada una, una frase y la etiqueta de fuente.",
        "Poner Babel y sumerios en el mismo punto sin explicación.",
      ),
      es(
        "Otros pueblos del mundo antiguo se estudian con mapa y orden. El mapa muestra **dónde**; la línea muestra **cuándo**. Usar los dos evita confundir lugares lejanos con una sola historia mezclada.\n\nAl final de la semana debes poder explicar el orden con tus palabras.",
        "Elige un pueblo antiguo y colócalo en línea + mapa con una frase.",
        "Memorizar nombres sin orden. Sin orden, la línea no sirve.",
      ),
    ],
  },
  "LT-c3-w1-d2-l6": {
    weekRecap: "Orden: primero el relato, después el mapa. Babel, sumerios (Tigris y Éufrates) y otros pueblos.",
    points: [
      es(
        "Una línea de tiempo ordena: primero lo antiguo, después lo reciente. Esta lección mira historia antigua y el relato de Génesis (creación y caída) como fuentes distintas.\n\n«Caída» nombra, dentro de ese relato, la entrada del pecado. Por eso se anotan en pistas paralelas, no en un solo punto mezclado.\n\nPractica dos líneas: una histórica y una del relato.",
        "Dibuja dos líneas paralelas: «historia antigua» y «Génesis». Anota un hito en cada una.",
        "Tratar fecha histórica y capítulo bíblico como el mismo tipo de dato.",
      ),
    ],
  },
  "LT-c3-w1-d3-l6": {
    weekRecap: "Orden: primero el relato, después el mapa. Babel, sumerios (Tigris y Éufrates) y otros pueblos.",
    priorDayRecap: "Ayer dibujaste líneas paralelas para historia y Génesis.",
    points: [
      es(
        "Hoy fijas **Babel** y los **sumerios**. Babel aparece en el relato; los sumerios se estudian con el mapa de Mesopotamia, entre **Tigris** y **Éufrates**.\n\nEscribe qué sabes de cada uno en dos oraciones y luego colócalos: uno en la pista del relato y otro en la pista histórica, o explica por qué tu guía los separa.\n\nEl río en el mapa no sustituye al relato; el relato no borra el mapa.",
        "Completa fichas Babel / sumerios con frase, pista y un dibujo pequeño.",
        "Decir que Babel «es» solo una ciudad sumeria sin mirar cómo lo presenta la lección.",
      ),
    ],
  },
  "LT-c3-w1-d4-l6": {
    weekRecap: "Orden: primero el relato, después el mapa. Babel, sumerios (Tigris y Éufrates) y otros pueblos.",
    priorDayRecap: "Ayer separaste Babel y sumerios en fichas y pistas distintas.",
    points: [
      es(
        "Cierra añadiendo otro pueblo del mundo antiguo en tu línea y en el mapa. Pregunta: ¿antes o después del hito que ya marqué? ¿Cerca o lejos en el mapa?\n\nResume la semana en tres frases: qué es una línea de tiempo, por qué hay pistas distintas y un ejemplo (Babel o sumerios).\n\nSi puedes enseñar tu línea a alguien, ya ordenaste con sentido.",
        "Añade un pueblo más y escribe el resumen de tres frases.",
        "Llenar la línea de nombres sin fechas relativas ni etiquetas de fuente.",
      ),
    ],
  },

  // ——— GEO ———
  "geo-c3-w1-d1-l6": {
    summary: "Venezuela por fronteras, puntos extremos y seis regiones de estudio.",
    points: [
      es(
        "Una **frontera** separa un país de otro. En el mapa de Venezuela: al norte el **Mar Caribe**; al sur **Brasil**; al este **Guyana**; al oeste **Colombia**.\n\nLos puntos cardinales ayudan: norte arriba, sur abajo, este derecha, oeste izquierda en un mapa común. No confundas **Guyana** (país) con **Guayana** (región).",
        "Dibuja un contorno y escribe en cada lado Caribe, Brasil, Guyana o Colombia.",
        "Mezclar Guyana (país) con Guayana (región venezolana).",
      ),
      es(
        "Un **punto extremo** es el lugar más lejano del país en una dirección; no es toda la frontera. Sirve para imaginar el «marco» de Venezuela: lo más al norte, sur, este y oeste según tu guía.\n\nUbicar extremos evita pensar que el país es solo Caracas o solo la costa.",
        "Marca en tu mapa mental o dibujo cuatro extremos y nómbralos con la guía.",
        "Creer que un extremo es una frontera completa.",
      ),
      es(
        "Una **región** es una parte grande que comparte relieve o clima. Seis regiones de estudio: Central, Oriental, Occidental, Los Andes, Los Llanos y Guayana.\n\nAndes = montañas; Llanos = planicies; Guayana = selvas y tepuyes. Una región puede tener varios estados.",
        "Escribe las seis regiones con un símbolo: montaña, llanura, costa o selva.",
        "Confundir estado con región, o Guayana con Guyana.",
      ),
    ],
  },
  "geo-c3-w1-d2-l6": {
    weekRecap: "Fronteras: Caribe, Brasil, Guyana, Colombia. Regiones: Central, Oriental, Occidental, Andes, Llanos, Guayana.",
    points: [
      es(
        "Repasa las cuatro fronteras con puntos cardinales. Norte = Mar Caribe; sur = Brasil; este = Guyana; oeste = Colombia.\n\nDibuja y repite el orden en voz alta hasta poder hacerlo sin mirar. Luego señala con el dedo cada lado del mapa.\n\nCierra preguntándote: ¿Guyana es país o región? País al este.",
        "Dibuja el contorno y etiqueta las cuatro fronteras. Repite el orden tres veces.",
        "Poner Brasil al este o Guyana al sur.",
      ),
    ],
  },
  "geo-c3-w1-d3-l6": {
    weekRecap: "Fronteras: Caribe, Brasil, Guyana, Colombia. Regiones: Central, Oriental, Occidental, Andes, Llanos, Guayana.",
    priorDayRecap: "Ayer etiquetaste las cuatro fronteras con puntos cardinales.",
    points: [
      es(
        "Un punto límite o extremo es un lugar muy lejano en una dirección; no sustituye el dibujo de toda la frontera. Sirve para «estirar» el mapa en tu mente.\n\nCon la guía de la clase, nombra o describe el extremo norte, sur, este y oeste. Relaciónalos con las fronteras vecinas sin mezclar nombres.\n\nCompara: frontera = línea larga; extremo = punto de referencia.",
        "Escribe cuatro frases: «Al norte…», «Al sur…», «Al este…», «Al oeste…».",
        "Hablar del extremo como si fuera todo el país vecino.",
      ),
    ],
  },
  "geo-c3-w1-d4-l6": {
    weekRecap: "Fronteras: Caribe, Brasil, Guyana, Colombia. Regiones: Central, Oriental, Occidental, Andes, Llanos, Guayana.",
    priorDayRecap: "Ayer distinguiste punto extremo y frontera completa.",
    points: [
      es(
        "Las seis regiones: Central, Oriental, Occidental, Los Andes, Los Llanos y Guayana. Cada una agrupa varios estados con rasgos compartidos.\n\nHaz un croquis simple: divide el país en zonas y pon un símbolo. Pronuncia Guayana (región) frente a Guyana (país) hasta que no se mezclen.\n\nSi puedes listar fronteras y regiones, ya tienes el mapa mental de la semana.",
        "Escribe las seis regiones con símbolo y una palabra clave cada una.",
        "Confundir un estado con una región, o Guayana con Guyana.",
      ),
    ],
  },

  // ——— CIE ———
  "cie-c3-w1-d1-l6": {
    summary: "Cuatro tejidos: epitelial, conectivo, muscular y nervioso; cada uno con una tarea.",
    points: [
      es(
        "Un **tejido** es un grupo de células parecidas que trabajan juntas. El **epitelial** cubre y protege (piel). El **conectivo** une, sostiene o transporta (hueso, cartílago, sangre).\n\nEn ciencias, «tejido» no significa tela: significa equipo de células.",
        "Haz dos columnas: epitelial y conectivo. Coloca piel, hueso, cartílago y sangre.",
        "Pensar que tejido solo significa tela de ropa.",
      ),
      es(
        "El tejido **muscular** permite el movimiento. Hay músculo que mueves a voluntad (como el del brazo) y otros que trabajan sin que lo pienses (como el del estómago).\n\nCuando flexionas el brazo, el músculo se acorta y tira del hueso. Observa qué cambió.",
        "Escribe una frase sobre un movimiento voluntario y otra sobre uno que no controlas igual.",
        "Creer que todo músculo se mueve solo cuando quieres.",
      ),
      es(
        "El tejido **nervioso** lleva mensajes. El cerebro, la médula y los nervios forman caminos rápidos: sientes, decides y respondes.\n\nSin mensajes nerviosos, los músculos no sabrían cuándo contraerse. Los cuatro tejidos colaboran.",
        "Dibuja un esquema simple: mensaje → nervio → músculo → movimiento.",
        "Olvidar que el nervioso también es un tejido, no solo «el cerebro solo».",
      ),
    ],
  },
  "cie-c3-w1-d2-l6": {
    weekRecap: "Cuatro tejidos: epitelial (cubre), conectivo (une), muscular (mueve), nervioso (mensaje).",
    points: [
      es(
        "Profundiza **epitelial** y **conectivo**. Epitelial = cubierta y protección. Conectivo = unión, soporte o transporte; incluye hueso, cartílago y sangre.\n\nEl cartílago es firme y flexible (nariz, orejas). La sangre transporta; el hueso sostiene.\n\nClasifica ejemplos cotidianos: ¿piel de la mano? ¿hueso del dedo?",
        "Completa la tabla epitelial/conectivo con cinco ejemplos y una función cada uno.",
        "Meter la sangre en epitelial. La sangre es tejido conectivo de transporte.",
      ),
    ],
  },
  "cie-c3-w1-d3-l6": {
    weekRecap: "Cuatro tejidos: epitelial (cubre), conectivo (une), muscular (mueve), nervioso (mensaje).",
    priorDayRecap: "Ayer clasificaste ejemplos de epitelial y conectivo.",
    points: [
      es(
        "El tejido **muscular** produce movimiento al contraerse. Compara un salto (voluntario) con el latido del corazón (no lo ordenas igual).\n\nObserva tu brazo: quieto vs flexionado. El músculo cambia de forma y tira. Anota qué sentiste.\n\nRelaciona: sin músculo, el hueso solo no camina.",
        "Escribe tres movimientos y marca cuáles controlas a propósito.",
        "Decir que los huesos se mueven solos sin músculo.",
      ),
    ],
  },
  "cie-c3-w1-d4-l6": {
    weekRecap: "Cuatro tejidos: epitelial (cubre), conectivo (une), muscular (mueve), nervioso (mensaje).",
    priorDayRecap: "Ayer comparaste movimientos voluntarios y otros más automáticos.",
    points: [
      es(
        "El tejido **nervioso** envía mensajes eléctricos químicos a gran velocidad. Tocas algo caliente y apartas la mano: hay sensor, mensaje y respuesta muscular.\n\nDibuja el camino en tres cajas. Luego repasa los cuatro tejidos en una frase cada uno.\n\nSi puedes explicar la colaboración piel–nervio–músculo–hueso, ya integraste la semana.",
        "Completa: estímulo → … → … → respuesta. Nombra los cuatro tejidos al final.",
        "Pensar que el nervioso solo «piensa» y no forma tejido del cuerpo.",
      ),
    ],
  },

  // ——— ART ———
  "art-c3-w1-d1-l6": {
    summary: "OiLS: mirar el dibujo por partes — redondos, puntos, rectas y curvas.",
    points: [
      es(
        "**OiLS** (Mona Brookes) enseña a mirar un dibujo como piezas sencillas antes de los detalles. **O** = formas redondas; **i** = puntos o marcas pequeñas.\n\nUna flor puede ser un círculo grande (O) con un punto en el centro (i). Primero lo grande, luego lo pequeño.",
        "Dibuja una flor o un pez usando primero O e i. Señala cada forma con la letra.",
        "Empezar por detalles diminutos y perder la forma grande.",
      ),
      es(
        "**L** son líneas **rectas**: horizontal, vertical y diagonal. En la esquina de una casa se encuentran y forman **ángulos**.\n\nPractica tres trazos firmes: una horizontal, una vertical y una diagonal. Luego arma un techo simple.",
        "Dibuja una casa con solo líneas L. Marca un ángulo con un arco pequeño.",
        "Hacer todas las líneas temblorosas sin intención; busca dirección clara.",
      ),
      es(
        "**S** son líneas **curvas**: suaves, onduladas o en espiral. El cuello de un cisne o el borde de una hoja usan S.\n\nCombina O, i, L y S en un solo dibujo sencillo. Nombra cada parte en voz alta.",
        "Dibuja un objeto con al menos una O, una i, una L y una S. Etiquétalas.",
        "Usar solo curvas o solo rectas. La semana entrena las cuatro letras.",
      ),
    ],
  },
  "art-c3-w1-d2-l6": {
    weekRecap: "OiLS: O redondos, i puntos, L rectas, S curvas. Primero la forma grande, luego el detalle.",
    points: [
      es(
        "Hoy solo **O** e **i**. Busca en objetos reales: plato (O), semilla (i), rueda (O), grano de arroz (i).\n\nDibuja tres objetos usando únicamente círculos y puntos. Después añade un detalle mínimo. Compara tamaño: el punto debe ser menor que el redondo principal.\n\nDi: O = redondo; i = punto.",
        "Completa una lámina de tres objetos solo con O e i. Etiqueta cada marca.",
        "Hacer el punto tan grande como el círculo y perder la jerarquía.",
      ),
    ],
  },
  "art-c3-w1-d3-l6": {
    weekRecap: "OiLS: O redondos, i puntos, L rectas, S curvas. Primero la forma grande, luego el detalle.",
    priorDayRecap: "Ayer dibujaste objetos solo con O (redondos) e i (puntos).",
    points: [
      es(
        "Hoy entrenas **L**: rectas horizontales, verticales y diagonales. Una mesa usa horizontales y verticales; una rampa usa diagonal.\n\nHaz una cuadrícula suave y traza un camino de tres segmentos L. Observa los ángulos donde se cruzan.\n\nAñade una O pequeña al final del camino para unir con el día anterior.",
        "Dibuja un mueble o flecha solo con L. Marca dos ángulos.",
        "Curvar las «L» sin querer. Si es L, la línea debe ser recta.",
      ),
    ],
  },
  "art-c3-w1-d4-l6": {
    weekRecap: "OiLS: O redondos, i puntos, L rectas, S curvas. Primero la forma grande, luego el detalle.",
    priorDayRecap: "Ayer practicaste líneas L rectas y ángulos claros.",
    points: [
      es(
        "Cierra con **S** curvas y un dibujo que combine OiLS. Una hoja, una ola o una serpiente corta sirven de modelo.\n\nPrimero bloquea formas grandes (O/L), luego curvas S, al final puntos i. Fotografía o muestra el resultado y nombra cada letra usada.\n\nSi puedes enseñar OiLS a alguien en un minuto, ya dominas la idea.",
        "Dibuja un motivo con las cuatro letras y escribe la lista O-i-L-S al margen.",
        "Empezar por adornos antes de la estructura OiLS.",
      ),
    ],
  },

  // ——— EXE ———
  "exe-c3-w1-d1-l6": {
    summary: "Exégesis de Romanos 1:1: Pablo, siervo y apóstol, apartado para el evangelio de Dios.",
    points: [
      es(
        "La **exégesis** es explicar un texto con cuidado, atendiendo a lo que realmente dice. Romanos 1:1 presenta a **Pablo** como quien escribe. Antes de una idea larga, mira quién habla y qué palabras usa.\n\nEl saludo no sobra: identifica al autor.",
        "Busca Romanos 1:1, subraya «Pablo» y escribe: «Pablo es el autor que se presenta en este versículo».",
        "Saltar el saludo como si no importara.",
      ),
      es(
        "Romanos 1:1 llama a Pablo **siervo** de Cristo Jesús y **apóstol**. Siervo = pertenece y sirve. Apóstol = enviado con un mensaje.\n\nLos dos títulos explican su tarea: servir a Cristo y anunciar.",
        "Escribe una oración con «siervo» y otra con «apóstol». Encuentra ambas en el versículo.",
        "Tratar los títulos como adornos sin significado.",
      ),
      es(
        "**Apartado** significa separado para una tarea especial. Pablo fue apartado para el **evangelio de Dios**: buena noticia que viene de Dios, no inventada por Pablo.\n\nNo quites «de Dios» al resumir.",
        "Completa: «El evangelio de Dios es la buena noticia que…». Lee el versículo completo otra vez.",
        "Resumir el evangelio sin decir de dónde viene.",
      ),
    ],
  },
  "exe-c3-w1-d2-l6": {
    weekRecap: "Romanos 1:1: Pablo, siervo y apóstol, apartado para el evangelio de Dios.",
    points: [
      es(
        "Vuelve al comienzo del versículo: el nombre **Pablo**. En una carta antigua, el autor se presenta al inicio. Eso orienta al lector.\n\nCopia el versículo completo con calma. Encierra «Pablo» en un círculo. Pregunta: ¿qué más dice de él en la misma frase?\n\nLa exégesis empieza por lo obvio escrito, no por ideas lejanas.",
        "Copia Romanos 1:1 y escribe dos hechos que el texto afirma sobre Pablo.",
        "Hablar de Pablo con datos que el versículo no dice todavía.",
      ),
    ],
  },
  "exe-c3-w1-d3-l6": {
    weekRecap: "Romanos 1:1: Pablo, siervo y apóstol, apartado para el evangelio de Dios.",
    priorDayRecap: "Ayer copiaste Romanos 1:1 y marcaste el nombre Pablo.",
    points: [
      es(
        "Hoy sostienes los títulos **siervo** y **apóstol**. No son apodos vacíos: describen relación y misión.\n\nHaz dos columnas y escribe sinónimos escolares: siervo → sirve / pertenece; apóstol → enviado / mensajero. Luego vuelve al texto y léelos dentro de la frase completa.\n\nPregunta: ¿a quién sirve? ¿con qué mensaje fue enviado?",
        "Completa las dos columnas y una oración que use ambos títulos.",
        "Invertir los significados o dejar un título sin explicación.",
      ),
    ],
  },
  "exe-c3-w1-d4-l6": {
    weekRecap: "Romanos 1:1: Pablo, siervo y apóstol, apartado para el evangelio de Dios.",
    priorDayRecap: "Ayer explicaste siervo y apóstol con columnas de sinónimos.",
    points: [
      es(
        "Cierra con **apartado** y **evangelio de Dios**. Apartado = separado para una tarea. Evangelio = buena noticia; «de Dios» marca el origen.\n\nUne toda la semana en una frase propia que mencione Pablo, un título y el evangelio. Comprueba cada palabra contra el versículo.\n\nSi tu frase añade ideas nuevas, sepáralas: primero lo que el texto dice.",
        "Escribe tu frase de síntesis y subraya solo las palabras apoyadas en Romanos 1:1.",
        "Mezclar opiniones propias con lo que el versículo afirma.",
      ),
    ],
  },

  // ——— TEB ———
  "teb-c3-w1-d1-l6": {
    summary: "Historia de redención: creación y caída, Israel y Cristo, esperanza de la nueva tierra.",
    points: [
      es(
        "La **teología bíblica** sigue el gran relato de la Biblia. **Redención** significa rescate y restauración. Génesis presenta creación, caída y promesa.\n\nLa creación muestra un mundo bueno; la caída, la entrada del pecado; la promesa, que Dios no abandona.",
        "Ordena: creación, caída, promesa. Escribe una oración sencilla para cada una.",
        "Leer Génesis como cuentos sueltos sin conexión.",
      ),
      es(
        "El relato avanza hacia **Cristo** y el **evangelio**. Dios formó a **Israel** y habló por los profetas. Un **pacto** es una promesa o relación que Dios establece con su pueblo.\n\nEl evangelio es la buena noticia de Jesús: su vida, muerte y resurrección.",
        "Dibuja tres cajas: Israel, Cristo y evangelio. Une con flechas y una frase en cada una.",
        "Reducir el relato a una lista de reglas sin promesa ni cumplimiento.",
      ),
      es(
        "**Consumación** es la meta final. La **nueva tierra** nombra la esperanza de renovación: justicia, sin muerte ni llanto. **Restauración** es reparar lo dañado.\n\nLa redención mira hacia una creación renovada, no solo a escapar del mundo.",
        "Escribe tres oraciones que conecten creación, evangelio y nueva tierra.",
        "Contar la historia sin la meta final.",
      ),
    ],
  },
  "teb-c3-w1-d2-l6": {
    weekRecap: "Redención: creación y caída, Israel y Cristo, esperanza de la nueva tierra.",
    points: [
      es(
        "Vuelve a Génesis: creación, caída y promesa. Abraham y su familia aparecen dentro de la promesa.\n\nHaz una línea de cinco palabras: creación → caída → promesa → diluvio → patriarcas. Di una frase por estación.\n\nLa teología bíblica busca el hilo, no piezas sueltas.",
        "Ordena las cinco palabras y escribe una oración por cada una.",
        "Saltar la promesa y quedarte solo en la caída.",
      ),
    ],
  },
  "teb-c3-w1-d3-l6": {
    weekRecap: "Redención: creación y caída, Israel y Cristo, esperanza de la nueva tierra.",
    priorDayRecap: "Ayer ordenaste creación, caída, promesa y patriarcas.",
    points: [
      es(
        "Hoy conectas **Israel**, **Cristo** y el **evangelio**. Israel recibe pactos y promesas; los profetas apuntan hacia adelante; el evangelio anuncia a Jesús.\n\nEn tres cajas escribe una frase mínima. Luego explica la flecha: promesa → cumplimiento.\n\nNo borres Israel al hablar de Cristo; la historia los une.",
        "Completa el esquema de tres cajas y léelo en voz alta.",
        "Hablar del evangelio como si empezara sin Antiguo Testamento.",
      ),
    ],
  },
  "teb-c3-w1-d4-l6": {
    weekRecap: "Redención: creación y caída, Israel y Cristo, esperanza de la nueva tierra.",
    priorDayRecap: "Ayer uniste Israel, Cristo y evangelio en un esquema de flechas.",
    points: [
      es(
        "Cierra con la **nueva tierra** y la idea de **consumación**. La esperanza bíblica mira renovación de la creación, con justicia y sin llanto.\n\nEscribe un puente de tres oraciones: cómo empezó (creación), qué anuncia el evangelio y hacia qué meta camina la historia.\n\nSi el puente menciona redención y restauración, ya cerraste la semana.",
        "Escribe el puente de tres oraciones y subraya creación / evangelio / nueva tierra.",
        "Terminar el relato solo en el pasado sin esperanza futura.",
      ),
    ],
  },
};

function apply() {
  let n = 0;
  for (const [key, patch] of Object.entries(PATCH)) {
    const file = path.join(week1, `${key}.eoschool.json`);
    if (!fs.existsSync(file)) {
      console.warn("missing", key);
      continue;
    }
    const doc = JSON.parse(fs.readFileSync(file, "utf8"));
    if (patch.summary !== undefined) doc.lesson.summary = patch.summary;
    if (patch.weekRecap !== undefined) doc.lesson.weekRecap = patch.weekRecap;
    if (patch.priorDayRecap !== undefined) doc.lesson.priorDayRecap = patch.priorDayRecap;
    if (patch.points) {
      patch.points.forEach((body, i) => {
        if (!doc.lesson.points[i]) doc.lesson.points[i] = { id: `p${i + 1}`, heading: doc.lesson.points[i - 1]?.heading || "Punto", body };
        else doc.lesson.points[i].body = body;
      });
    }
    fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
    n += 1;
    console.log("rewrote", key);
  }
  console.log("patched", n, "files");
}

apply();
