/**
 * Zip MPPE grade-3 learnings with US / England cells.
 * Run: node frontend/scripts/build-grade3-standards-crosswalk.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const national = JSON.parse(
  readFileSync(join(here, "../src/lib/eoschool-mppe-national-requirements.json"), "utf8"),
);

const H = {
  ri: "https://www.thecorestandards.org/ELA-Literacy/RI/3/",
  rl: "https://www.thecorestandards.org/ELA-Literacy/RL/3/",
  rf3: "https://www.thecorestandards.org/ELA-Literacy/RF/3/",
  rfk: "https://www.thecorestandards.org/ELA-Literacy/RF/K/",
  rf1: "https://www.thecorestandards.org/ELA-Literacy/RF/1/",
  w3: "https://www.thecorestandards.org/ELA-Literacy/W/3/",
  sl: "https://www.thecorestandards.org/ELA-Literacy/SL/3/",
  l3: "https://www.thecorestandards.org/ELA-Literacy/L/3/",
  l2: "https://www.thecorestandards.org/ELA-Literacy/L/2/",
  l1: "https://www.thecorestandards.org/ELA-Literacy/L/1/",
  lk: "https://www.thecorestandards.org/ELA-Literacy/L/K/",
  nbt4: "https://www.thecorestandards.org/Math/Content/4/NBT/",
  md1: "https://www.thecorestandards.org/Math/Content/1/MD/",
  md2: "https://www.thecorestandards.org/Math/Content/2/MD/",
  md3: "https://www.thecorestandards.org/Math/Content/3/MD/",
  md4: "https://www.thecorestandards.org/Math/Content/4/MD/",
  gK: "https://www.thecorestandards.org/Math/Content/K/G/",
  g2: "https://www.thecorestandards.org/Math/Content/2/G/",
  g3: "https://www.thecorestandards.org/Math/Content/3/G/",
  g4: "https://www.thecorestandards.org/Math/Content/4/G/",
  c3: "https://www.socialstudies.org/standards/c3",
  ngss: "https://www.nextgenscience.org/",
  en: "https://www.gov.uk/government/publications/national-curriculum-in-england-english-programmes-of-study",
  ma: "https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study",
  sc: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
  hi: "https://www.gov.uk/government/publications/national-curriculum-in-england-history-programmes-of-study",
  ge: "https://www.gov.uk/government/publications/national-curriculum-in-england-geography-programmes-of-study",
  mu: "https://www.gov.uk/government/publications/national-curriculum-in-england-music-programmes-of-study",
  co: "https://www.gov.uk/government/publications/national-curriculum-in-england-computing-programmes-of-study",
  nc: "https://www.gov.uk/government/publications/national-curriculum-in-england-primary-curriculum",
};

/** [code, text, fit, hrefKey] */
const cell = (code, text, fit, hrefKey) => ({ code, text, fit, href: H[hrefKey] });

const pair = (us, uk) => ({ us: cell(...us), uk: cell(...uk) });

const len = [
  pair(
    ["RI.3.3", "Grade 3 describe la relación entre los pasos de un procedimiento técnico.", "directo", "ri"],
    ["En/Y3-4/Reading", "En Years 3–4 se recupera información de textos de no ficción y se atiende a su estructura.", "directo", "en"],
  ),
  pair(
    ["RI.3.2", "Grade 3 resume la idea principal y los detalles de un texto informativo. Las biografías citadas son venezolanas.", "nacional", "ri"],
    ["En/Y3-4/Reading", "Years 3–4 leen no ficción y resumen ideas. Bolívar, Rodríguez y los epónimos locales no están en el programa inglés.", "nacional", "en"],
  ),
  pair(
    ["W.3.7", "Grade 3 hace investigaciones cortas para aprender sobre un tema.", "directo", "w3"],
    ["En/Y3-4/Reading", "Years 3–4 recuperan y registran información de textos de no ficción.", "directo", "en"],
  ),
  pair(
    ["RI.3.2", "Grade 3 determina la idea principal y los detalles de un texto informativo, incluidas las noticias.", "directo", "ri"],
    ["En/Y3-4/Reading", "Years 3–4 leen libros organizados de distintas maneras y con distintos propósitos, incluida la no ficción.", "directo", "en"],
  ),
  pair(
    ["RL.3.10", "Grade 3 lee y comprende literatura y textos informativos del grado. Elegir por gusto personal no es un criterio del estándar.", "parcial", "rl"],
    ["En/Y3-4/Reading", "Years 3–4 desarrollan una actitud positiva hacia la lectura de un rango amplio. El criterio de preferencia no se nombra.", "parcial", "en"],
  ),
  pair(
    ["RI.3.5", "Grade 3 usa las partes del texto y herramientas de búsqueda para localizar información.", "directo", "ri"],
    ["En/Y3-4/Reading", "Years 3–4 recuperan información de la no ficción y ven cómo la presentación contribuye al sentido.", "directo", "en"],
  ),
  pair(
    ["RI.3.5", "Grade 3 localiza información de un tema con eficacia, usando rasgos del texto.", "directo", "ri"],
    ["En/Y3-4/Reading", "Years 3–4 recuperan y registran información de textos de no ficción.", "directo", "en"],
  ),
  pair(
    ["RI.3.1", "Grade 3 hace y responde preguntas y se apoya de forma explícita en el texto.", "directo", "ri"],
    ["En/Y3-4/Reading", "Years 3–4 identifican las ideas principales de más de un párrafo y las resumen.", "directo", "en"],
  ),
  pair(
    ["W.3.8", "Grade 3 reúne información de fuentes impresas o digitales, toma notas breves y ordena la evidencia.", "directo", "w3"],
    ["En/Y3-4/Writing", "Years 3–4 redactan material de no ficción y organizan lo que van a escribir a partir de lo leído.", "directo", "en"],
  ),
  pair(
    ["L.K.1.f", "Ordenar palabras ya dadas para formar una oración conocida es una práctica de kindergarten, no de Grade 3.", "anterior", "lk"],
    ["En/Y1/Writing", "Year 1 compone una oración en voz alta antes de escribirla y secuencia oraciones cortas.", "anterior", "en"],
  ),
  pair(
    ["RF.K.1.d", "Reconocer y nombrar todas las letras mayúsculas y minúsculas es un estándar de kindergarten.", "anterior", "rfk"],
    ["En/Y1/Spelling", "Year 1 nombra las letras del alfabeto en orden.", "anterior", "en"],
  ),
  pair(
    ["RL.3.5", "Grade 3 se refiere a partes de cuentos, obras y poemas. Noticias y biografías caen en el texto informativo, no en este código.", "parcial", "rl"],
    ["En/Y3-4/Reading", "Years 3–4 discuten ficción, poesía, teatro, no ficción y libros de consulta, y reconocen formas distintas de poesía.", "directo", "en"],
  ),
  pair(
    ["SL.3.4", "Grade 3 informa sobre un texto con detalles pertinentes. Recomendar título y autor no es un requisito aparte.", "parcial", "sl"],
    ["En/Spoken", "El habla pide descripciones bien estructuradas y participar en la conversación sobre libros.", "parcial", "en"],
  ),
  pair(
    ["RL.3.3", "Grade 3 describe personajes y explica cómo sus acciones contribuyen a la secuencia de hechos.", "directo", "rl"],
    ["En/Y3-4/Reading", "Years 3–4 infieren sentimientos y motivos de los personajes y, al escribir, crean escenario, personajes y trama.", "directo", "en"],
  ),
  pair(
    ["W.3.10", "Grade 3 escribe con regularidad para tareas del grado. Resolver instrumentos de evaluación no es un contenido del estándar.", "parcial", "w3"],
    ["En/Y3-4/Writing", "Years 3–4 evalúan y corrigen lo escrito. La prueba como contenido no está en el programa.", "parcial", "en"],
  ),
  pair(
    ["RL.3.4", "Grade 3 distingue el lenguaje literal del no literal.", "directo", "rl"],
    ["En/Y5-6/Reading", "El lenguaje figurado se discute en Years 5–6. Years 3–4 hablan de palabras y frases que llaman la atención, sin nombrar la metáfora.", "parcial", "en"],
  ),
  pair(
    ["L.1.2.b", "Usar la puntuación final de la oración, incluidos interrogación y exclamación, es de Grade 1.", "anterior", "l1"],
    ["En/Y2/GPS", "Year 2 usa signos de interrogación y de exclamación para delimitar oraciones.", "anterior", "en"],
  ),
  pair(
    ["L.3.1.a", "Grade 3 explica la función de sustantivos, pronombres, verbos, adjetivos y adverbios.", "directo", "l3"],
    ["En/Y4/Appendix2", "Year 4 amplía el sintagma nominal con adjetivos, sustantivos y frases preposicionales.", "directo", "en"],
  ),
  pair(
    ["RF.3.3", "Grade 3 analiza palabras del grado. Palíndromos, pentavocálicas y curiosidades no son un contenido nombrado.", "parcial", "rf3"],
    ["En/Y4/Spelling", "Year 4 trabaja patrones de ortografía. Esas curiosidades del español no están en la lista.", "parcial", "en"],
  ),
  pair(
    ["L.2.4.d", "Predecir el significado de palabras compuestas a partir de sus partes es de Grade 2.", "anterior", "l2"],
    ["En/Y3-4/Reading", "Years 3–4 usan el diccionario y discuten el sentido de las palabras. La composición no es un apartado de Year 4.", "parcial", "en"],
  ),
  pair(
    ["RI.3.7", "Grade 3 usa mapas e ilustraciones para entender un texto. Los estados, ríos y el mar Caribe son contenido venezolano.", "nacional", "ri"],
    ["Ge/KS2/Maps", "Key Stage 2 usa mapas y atlas para localizar países. El mapa político de Venezuela no es el contenido inglés.", "nacional", "ge"],
  ),
  pair(
    ["3.MD.B.3", "Grade 3 dibuja e interpreta pictogramas y gráficos de barras a escala.", "directo", "md3"],
    ["Ma/Y4/Statistics", "Year 4 interpreta y presenta datos con gráficos de barras y gráficos de tiempo.", "directo", "ma"],
  ),
  pair(
    ["RI.3.7", "Grade 3 obtiene información de mapas e ilustraciones. Recorrer el mapamundi en busca de países es más geografía que lengua.", "parcial", "ri"],
    ["Ge/KS2/Locational", "Key Stage 2 localiza países del mundo en mapas, con atención a Europa y a América.", "directo", "ge"],
  ),
  pair(
    ["RI.3.7", "Grade 3 lee ilustraciones junto con las palabras. Las señales de tránsito y de peligro no son un contenido nombrado.", "parcial", "ri"],
    ["En/Y3-4/Reading", "Years 3–4 identifican cómo la presentación contribuye al sentido. La señalética vial no está en el programa.", "parcial", "en"],
  ),
  pair(
    ["C3 D2.His.3.3-5", "El marco C3, grados 3–5, pregunta por personas y grupos que cambiaron la historia. Miranda, Bolívar y Rodríguez son contenido nacional.", "nacional", "c3"],
    ["Hi/KS2", "Key Stage 2 estudia historia británica y local. Esos nombres venezolanos no están en el programa.", "nacional", "hi"],
  ),
  pair(
    ["C3 D2.Civ.7.3-5", "El marco C3 aplica virtudes cívicas. Los artículos de la Constitución de Venezuela son contenido nacional.", "nacional", "c3"],
    ["Hi/KS2", "Primaria en Inglaterra no tiene un programa estatutario de ciudadanía ni de la Constitución venezolana.", "nacional", "hi"],
  ),
  pair(
    ["SL.3.1", "Grade 3 conversa sobre temas del grado. No hay estándar de lengua de señas venezolana.", "nacional", "sl"],
    ["En/Spoken", "El programa de habla es oral. La Lengua de Señas Venezolana no está en el National Curriculum.", "nacional", "en"],
  ),
  pair(
    ["RI.3.5", "Grade 3 usa rasgos del texto para localizar información. Partida de nacimiento y cédula no son un contenido del grado.", "nacional", "ri"],
    ["En/Y3-4/Reading", "Years 3–4 leen no ficción. Esos documentos legales venezolanos no están en el programa.", "nacional", "en"],
  ),
  pair(
    ["L.1.2.a", "Escribir el propio nombre y palabras muy frecuentes con mayúscula inicial es de Grade 1.", "anterior", "l1"],
    ["En/Y1/GPS", "Year 1 usa mayúscula en nombres y escribe palabras con los fonemas ya enseñados.", "anterior", "en"],
  ),
  pair(
    ["L.2.2.a", "Las mayúsculas en nombres de personas son de Grade 1 y las de lugares geográficos, de Grade 2.", "anterior", "l2"],
    ["En/Y2/GPS", "Year 2 usa mayúsculas en nombres de personas, lugares y días de la semana.", "anterior", "en"],
  ),
  pair(
    ["L.3.2.e", "Grade 3 usa la ortografía convencional del inglés. La tilde del español no existe en ese sistema.", "nacional", "l3"],
    ["En/Y4/Spelling", "La ortografía de Year 4 no incluye la tilde.", "nacional", "en"],
  ),
  pair(
    ["W.3.2", "Grade 3 escribe textos informativos. Reescribir normas de convivencia se parece a eso; el respeto a la patria es contenido nacional.", "parcial", "w3"],
    ["En/Y3-4/Writing", "Years 3–4 planifican, redactan y revisan textos. El deber con la patria venezolana no está en el programa.", "parcial", "en"],
  ),
  pair(
    ["RF.3.3.a", "Grade 3 conoce prefijos y sufijos derivativos frecuentes. El diminutivo español -ita no es uno de ellos.", "parcial", "rf3"],
    ["En/Y3-4/Spelling", "Years 3–4 añaden prefijos y sufijos y ven cómo cambian la palabra. Los diminutivos del español no están en la lista.", "parcial", "en"],
  ),
  pair(
    ["L.3.4", "Grade 3 aclara el sentido de palabras desconocidas. Crucigramas y dameros no son un contenido nombrado.", "parcial", "l3"],
    ["En/Y3-4/Reading", "Years 3–4 usan diccionarios para comprobar el significado. Los juegos de palabras no son un apartado.", "parcial", "en"],
  ),
  pair(
    ["L.3.2.g", "Grade 3 consulta diccionarios y otros materiales para revisar la ortografía.", "directo", "l3"],
    ["En/Y3-4/Writing", "Years 3–4 revisan la ortografía y la puntuación de lo que escribieron.", "directo", "en"],
  ),
  pair(
    ["L.3.1.a", "Grade 3 explica la función del adjetivo. El inglés no concuerda el adjetivo en género y número con el sustantivo.", "nacional", "l3"],
    ["En/Y4/Appendix2", "Year 4 amplía el sintagma con adjetivos. Esos adjetivos no concuerdan en género ni en número.", "nacional", "en"],
  ),
  pair(
    ["W.3.5", "Con apoyo de pares y adultos, Grade 3 planifica, revisa y edita lo que escribe.", "directo", "w3"],
    ["En/Y3-4/Writing", "Years 3–4 planifican la escritura comentando textos parecidos y ensayan las oraciones en voz alta.", "directo", "en"],
  ),
  pair(
    ["SL.3.4", "Grade 3 cuenta una experiencia o informa un tema con claridad y a un ritmo comprensible.", "parcial", "sl"],
    ["En/Y3-4/Writing", "Years 3–4 componen y ensayan oraciones en voz alta, incluido el diálogo, antes de escribirlas.", "directo", "en"],
  ),
  pair(
    ["L.1.1.j", "Producir y ampliar oraciones simples y compuestas a partir de un modelo es de Grade 1.", "anterior", "l1"],
    ["En/Y1/Writing", "Year 1 secuencia oraciones para formar narrativas cortas.", "anterior", "en"],
  ),
  pair(
    ["W.3.10", "Grade 3 escribe con regularidad textos de distinta extensión y propósito.", "directo", "w3"],
    ["En/Y3-4/Writing", "Years 3–4 redactan organizando párrafos, en narrativa y en otros textos.", "directo", "en"],
  ),
  pair(
    ["L.1.1.a", "Imprimir todas las letras es de Grade 1. Copiar como método ya no es un estándar de Grade 3.", "anterior", "l1"],
    ["En/Y2/Handwriting", "Year 2 forma las minúsculas con tamaño relativo correcto. Copiar no es un objetivo de Year 4.", "anterior", "en"],
  ),
  pair(
    ["L.3.2.e", "Grade 3 escribe con la ortografía convencional de las palabras estudiadas. El dictado es un método, no el estándar.", "parcial", "l3"],
    ["En/Y4/Spelling", "Year 4 aplica las reglas de ortografía del apéndice. El dictado no es un contenido aparte.", "parcial", "en"],
  ),
  pair(
    ["W.3.5", "Con apoyo, Grade 3 fortalece el texto planificando, revisando y editando.", "directo", "w3"],
    ["En/Y3-4/Writing", "Years 3–4 evalúan la propia escritura y la de otros, proponen mejoras y revisan la prueba.", "directo", "en"],
  ),
  pair(
    ["L.1.1.a", "La caligrafía artística no está en Grade 3. El trazo de las letras es de Grade 1.", "anterior", "l1"],
    ["En/Y3-4/Handwriting", "Years 3–4 aumentan la legibilidad, la constancia y la calidad de la letra unida.", "parcial", "en"],
  ),
  pair(
    ["L.3.1.b", "Grade 3 forma y usa plurales regulares e irregulares.", "directo", "l3"],
    ["En/Y1/GPS", "El plural en -s o -es se enseña en Year 1. Year 4 no lo vuelve a fijar.", "anterior", "en"],
  ),
  pair(
    ["L.3.1.a", "Grade 3 explica la función de sustantivos y adjetivos. El género gramatical del español no tiene paralelo en inglés.", "nacional", "l3"],
    ["En/Y4/Appendix2", "Year 4 modifica el sustantivo con adjetivos. Esos adjetivos no marcan género.", "nacional", "en"],
  ),
  pair(
    ["L.3.1.a", "Añadir -a para el femenino es morfología del español. Grade 3 no tiene ese sistema.", "nacional", "l3"],
    ["En/Y4/Appendix2", "Year 4 no forma el femenino cambiando la terminación de la palabra.", "nacional", "en"],
  ),
  pair(
    ["L.3.5.b", "Grade 3 relaciona palabras con su uso en la vida real. Pares como hombre/mujer son léxico, no un sistema de género.", "nacional", "l3"],
    ["En/Y3-4/Reading", "Years 3–4 amplían vocabulario. No estudian el género por palabras distintas, como en español.", "nacional", "en"],
  ),
  pair(
    ["W.3.3", "Grade 3 escribe narraciones con secuencia clara, detalles y técnica adecuada.", "directo", "w3"],
    ["En/Y3-4/Writing", "En narrativa, Years 3–4 crean escenario, personajes y trama.", "directo", "en"],
  ),
  pair(
    ["W.3.3", "Grade 3 escribe narraciones. Reescribir un cuento conocido como versión nueva no está especificado.", "parcial", "w3"],
    ["En/Y3-4/Writing", "Years 3–4 crean trama y escenario. Recontar cuentos conocidos es sobre todo oral, no una reescritura.", "parcial", "en"],
  ),
  pair(
    ["RF.3.3", "Grade 3 decodifica palabras del inglés. Los dígrafos gu/qu del español no están en ese estándar.", "nacional", "rf3"],
    ["En/Y4/Spelling", "La ortografía de Year 4 no incluye gue, gui, que ni qui.", "nacional", "en"],
  ),
  pair(
    ["W.3.1", "Grade 3 escribe opiniones sobre textos y las sostiene con razones.", "directo", "w3"],
    ["En/Y3-4/Writing", "Years 3–4 escriben material que no es narrativo y lo organizan. La reseña como género no se nombra.", "parcial", "en"],
  ),
  pair(
    ["W.3.3", "Grade 3 establece una situación e introduce narrador o personajes al escribir una narración.", "directo", "w3"],
    ["En/Y3-4/Writing", "Years 3–4 componen narraciones con escenario, personajes y trama.", "directo", "en"],
  ),
  pair(
    ["L.3.2", "Grade 3 domina mayúsculas, puntuación y ortografía del grado. El punto final y la mayúscula inicial ya son de grados previos.", "parcial", "l3"],
    ["En/Y2/GPS", "Year 2 delimita oraciones con mayúscula y punto, y usa mayúsculas en nombres.", "anterior", "en"],
  ),
  pair(
    ["L.3.2.f", "Grade 3 usa patrones de ortografía del inglés. La regla de r/rr es del español.", "nacional", "l3"],
    ["En/Y4/Spelling", "Year 4 no enseña la oposición r/rr.", "nacional", "en"],
  ),
  pair(
    ["RF.1.3", "Los grupos consonánticos al inicio de sílaba se decodifican en Grade 1.", "anterior", "rf1"],
    ["En/Y1/Spelling", "Year 1 trabaja los grupos consonánticos iniciales.", "anterior", "en"],
  ),
  pair(
    ["W.3.8", "Grade 3 toma notas breves de lo leído y ordena la evidencia.", "directo", "w3"],
    ["En/Y3-4/Reading", "Years 3–4 identifican las ideas principales, las resumen y registran información de la no ficción.", "directo", "en"],
  ),
  pair(
    ["RF.1.3", "Las sílabas cerradas y los patrones básicos de decodificación son de Grade 1.", "anterior", "rf1"],
    ["En/Y1/Spelling", "Year 1 corresponde sonidos y grafías en sílabas simples.", "anterior", "en"],
  ),
  pair(
    ["RF.1.3", "El patrón consonante-vocal-consonante de una sílaba es de los primeros grados, no de Grade 3.", "anterior", "rf1"],
    ["En/Y1/Spelling", "Year 1 escribe palabras con los fonemas y las grafías ya enseñadas, incluidas sílabas CVC.", "anterior", "en"],
  ),
  pair(
    ["L.1.2.b", "Usar la puntuación final, pregunta y exclamación, es de Grade 1.", "anterior", "l1"],
    ["En/Y2/GPS", "Year 2 escribe oraciones interrogativas y exclamativas con sus signos.", "anterior", "en"],
  ),
  pair(
    ["SL.3.1", "Grade 3 participa en conversaciones con distintos compañeros, construye sobre las ideas de otros y expresa las propias con claridad.", "directo", "sl"],
    ["En/Spoken", "Escucha, responde y expresa respuestas, argumentos y opiniones.", "directo", "en"],
  ),
  pair(
    ["SL.3.6", "Grade 3 habla en oraciones completas cuando la situación lo pide. Las fórmulas de cortesía no son un contenido nombrado.", "parcial", "sl"],
    ["En/Spoken", "Se elige el registro adecuado a la situación. Gracias, por favor y los saludos no forman una lista del programa.", "parcial", "en"],
  ),
  pair(
    ["SL.3.1.d", "Grade 3 explica sus propias ideas a la luz de la conversación.", "directo", "sl"],
    ["En/Spoken", "Articula y justifica respuestas, argumentos y opiniones.", "directo", "en"],
  ),
  pair(
    ["SL.3.2", "Grade 3 identifica las ideas principales de un texto leído en voz alta o presentado en otros medios.", "directo", "sl"],
    ["En/Y3-4/Reading", "Years 3–4 conversan sobre libros que les leen y sobre los que leen solos, por turnos.", "directo", "en"],
  ),
  pair(
    ["SL.3.1.d", "Grade 3 explica sus ideas y tiene en cuenta lo que dijeron los demás.", "directo", "sl"],
    ["En/Spoken", "Considera y evalúa puntos de vista distintos, y construye sobre lo que aportan otros.", "directo", "en"],
  ),
  pair(
    ["SL.3.1", "Grade 3 conversa en parejas, en grupo y con el docente para construir ideas.", "directo", "sl"],
    ["En/Spoken", "Mantiene la atención y participa en conversaciones de colaboración.", "directo", "en"],
  ),
  pair(
    ["SL.3.3", "Grade 3 hace y responde preguntas sobre lo que dice otra persona, con elaboración y detalle.", "directo", "sl"],
    ["En/Spoken", "Hace preguntas pertinentes para ampliar lo que entiende.", "directo", "en"],
  ),
  pair(
    ["SL.3.3", "Grade 3 pide información con preguntas y responde a las de otros.", "directo", "sl"],
    ["En/Spoken", "Hace preguntas pertinentes para ampliar su conocimiento.", "directo", "en"],
  ),
  pair(
    ["SL.3.1", "Grade 3 discute ideas del grado. Comparar respuestas de una prueba no es un contenido nombrado.", "parcial", "sl"],
    ["En/Spoken", "Evalúa puntos de vista en la conversación. La comparación de pruebas no está en el programa.", "parcial", "en"],
  ),
  pair(
    ["SL.3.2", "Grade 3 saca las ideas principales de información presentada en medios visuales y orales.", "directo", "sl"],
    ["En/Spoken", "Participa en discusiones y da explicaciones. El cine foro no es un contenido de Year 4.", "parcial", "en"],
  ),
  pair(
    ["L.3.6", "Grade 3 adquiere y usa con precisión vocabulario conversacional, académico y de las materias.", "directo", "l3"],
    ["En/Y3-4/Reading", "Years 3–4 discuten palabras y frases, y amplían el vocabulario de lo que leen.", "directo", "en"],
  ),
  pair(
    ["SL.3.4", "Grade 3 cuenta una historia con hechos y detalles descriptivos, hablando con claridad.", "directo", "sl"],
    ["En/Y3-4/Reading", "Years 3–4 se familiarizan con cuentos y los recuentan en voz alta.", "directo", "en"],
  ),
  pair(
    ["SL.3.4", "Grade 3 cuenta una historia con claridad. Las fórmulas de inicio no están especificadas.", "parcial", "sl"],
    ["En/Y3-4/Reading", "Years 3–4 recuentan cuentos. Había una vez y las otras fórmulas no están en el programa.", "parcial", "en"],
  ),
  pair(
    ["SL.3.4", "Grade 3 informa sobre un tema, habla con claridad y a un ritmo comprensible.", "directo", "sl"],
    ["En/Spoken", "Da descripciones y explicaciones bien estructuradas, y habla con fluidez.", "directo", "en"],
  ),
  pair(
    ["SL.3.4", "Grade 3 cuenta y describe. Chistes, trabalenguas y adivinanzas no son un contenido nombrado.", "parcial", "sl"],
    ["En/Y3-4/Reading", "Years 3–4 preparan poemas para leerlos en voz alta y reconocen formas distintas de poesía.", "parcial", "en"],
  ),
  pair(
    ["SL.3.1", "Grade 3 discute temas del grado. No hay un estándar de lengua sobre la utilidad de la tecnología.", "parcial", "sl"],
    ["Co/KS2", "Key Stage 2 entiende las redes, incluido internet, y usa la tecnología de forma segura y responsable.", "parcial", "co"],
  ),
  pair(
    ["RF.3.4.b", "Grade 3 lee prosa y poesía del grado en voz alta, con precisión, ritmo y expresión.", "directo", "rf3"],
    ["Mu/KS2", "Key Stage 2 canta y toca con creciente precisión, fluidez y expresión. La declamación de coplas es, además, inglés.", "parcial", "mu"],
  ),
  pair(
    ["L.3.6", "Grade 3 amplía el vocabulario del grado. Los nombres de sonidos de animales no son un apartado.", "parcial", "l3"],
    ["En/Y3-4/Reading", "Years 3–4 discuten palabras y frases. El repertorio de sonidos de animales no está en el programa.", "parcial", "en"],
  ),
  pair(
    ["SL.3.4", "Grade 3 cuenta una historia con detalles descriptivos y habla con claridad.", "directo", "sl"],
    ["En/Spoken", "Da narraciones bien estructuradas para distintos propósitos.", "directo", "en"],
  ),
  pair(
    ["SL.3.1", "Grade 3 conversa sobre temas y textos del grado y expresa sus ideas con claridad.", "directo", "sl"],
    ["En/Y3-4/Reading", "Years 3–4 participan en la discusión sobre libros, por turnos y escuchando.", "directo", "en"],
  ),
  pair(
    ["L.3.1.a", "Grade 3 explica la función de los adjetivos.", "directo", "l3"],
    ["En/Y4/Appendix2", "Year 4 amplía el sintagma nominal con adjetivos modificadores.", "directo", "en"],
  ),
  pair(
    ["SL.3.1", "Grade 3 discute textos del grado. El comentario de noticias es un caso de esa conversación.", "parcial", "sl"],
    ["En/Spoken", "Considera puntos de vista y participa en la conversación. La noticia de actualidad no es un apartado.", "parcial", "en"],
  ),
  pair(
    ["RL.3.4", "Grade 3 distingue el sentido literal del no literal. El repertorio de refranes citado es venezolano.", "nacional", "rl"],
    ["En/Y3-4/Reading", "Years 3–4 discuten palabras y frases. Esos dichos populares venezolanos no están en el programa.", "nacional", "en"],
  ),
  pair(
    ["SL.3.2", "No hay estándar federal de artes en Grade 3. Lo más cercano es atender a una presentación y comentarla.", "nacional", "sl"],
    ["Mu/KS2", "Key Stage 2 escucha música en vivo y grabada con atención. Festivales y tradiciones venezolanas no son el contenido.", "parcial", "mu"],
  ),
  pair(
    ["SL.3.1.d", "Grade 3 explica sus ideas después de escuchar. Opinar sobre una obra no es un estándar de artes.", "parcial", "sl"],
    ["Mu/KS2", "Key Stage 2 aprecia música de distintas tradiciones y de grandes compositores, y desarrolla una idea de la historia de la música.", "parcial", "mu"],
  ),
];

const mat = [
  pair(
    ["K.G.A.1", "Describir posiciones relativas —arriba, abajo, al lado, delante, detrás— es de kindergarten.", "anterior", "gK"],
    ["Ma/Y1/Position", "Year 1 describe posición, dirección y movimiento, incluidos giros de cuarto y de medio.", "anterior", "ma"],
  ),
  pair(
    ["3.MD.A.1", "Grade 3 dice y escribe la hora al minuto y resuelve problemas de intervalos. Orientarse en el tiempo es más amplio que el reloj.", "parcial", "md3"],
    ["Ma/Y4/Measurement", "Year 4 lee relojes analógicos y digitales de 12 y 24 horas y convierte horas, minutos y segundos.", "parcial", "ma"],
  ),
  pair(
    ["3.G.A.1", "Grade 3 entiende que las figuras comparten atributos y así forman familias. Los cuerpos geométricos pesan menos en este código.", "parcial", "g3"],
    ["Ma/Y4/Geometry", "Year 4 compara y clasifica figuras, incluidos cuadriláteros y triángulos, por propiedades y tamaño.", "parcial", "ma"],
  ),
  pair(
    ["2.G.A.1", "Identificar triángulos, cuadriláteros, pentágonos, hexágonos y cubos es de Grade 2.", "anterior", "g2"],
    ["Ma/Y2/Geometry", "Year 2 describe figuras planas por el número de lados. Year 4 clasifica por propiedades, sin volver a contar lados como objetivo.", "anterior", "ma"],
  ),
  pair(
    ["2.G.A.1", "Grade 2 reconoce figuras con un número dado de caras iguales e identifica cubos.", "anterior", "g2"],
    ["Ma/Y2/Geometry", "Year 2 describe cuerpos e incluye el número de aristas, vértices y caras.", "anterior", "ma"],
  ),
  pair(
    ["3.G.A.1", "Grade 3 clasifica figuras planas y no distingue el círculo de la circunferencia.", "parcial", "g3"],
    ["Ma/Y4/Geometry", "Year 4 clasifica figuras por propiedades. No separa círculo y circunferencia.", "parcial", "ma"],
  ),
  pair(
    ["C3 D2.Geo.1.3-5", "El marco C3, grados 3–5, construye mapas de lugares conocidos. No es un estándar de geometría de Grade 3.", "parcial", "c3"],
    ["Ge/KS2/Fieldwork", "Key Stage 2 observa el entorno y lo presenta con métodos que incluyen el croquis.", "directo", "ge"],
  ),
  pair(
    ["4.G.A.1", "Dibujar puntos, rectas, segmentos, rayos y ángulos es de Grade 4. El plano no está en ese estándar.", "parcial", "g4"],
    ["Ma/Y3/Geometry", "Year 3 reconoce ángulos y líneas horizontales y verticales. El punto y el plano no se definen en Year 4.", "anterior", "ma"],
  ),
  pair(
    ["4.G.A.1", "Identificar y trazar rectas paralelas y perpendiculares es de Grade 4, no de Grade 3.", "parcial", "g4"],
    ["Ma/Y3/Geometry", "Year 3 identifica pares de rectas perpendiculares y paralelas.", "anterior", "ma"],
  ),
  pair(
    ["1.MD.A.2", "Medir longitudes con unidades no convencionales, repitiendo un objeto corto, es de Grade 1.", "anterior", "md1"],
    ["Ma/Y1/Measurement", "Year 1 compara y empieza a medir longitudes. La distinción convencional / no convencional es de ese tramo.", "anterior", "ma"],
  ),
  pair(
    ["1.MD.A.2", "Medir una longitud con el propio cuerpo o con otra unidad no convencional es de Grade 1.", "anterior", "md1"],
    ["Ma/Y1/Measurement", "Year 1 mide longitudes y alturas con unidades al alcance del niño, antes del sistema métrico de años posteriores.", "anterior", "ma"],
  ),
  pair(
    ["3.MD.A.2", "Grade 3 mide y estima masas y volúmenes en gramos, kilogramos y litros. Longitud y tiempo están en estándares vecinos.", "parcial", "md3"],
    ["Ma/Y3/Measurement", "Year 3 mide, compara, suma y resta longitudes, masa y capacidad. Year 4 convierte unidades ya conocidas.", "anterior", "ma"],
  ),
  pair(
    ["4.MD.A.2", "Grade 4 resuelve problemas de dinero con las cuatro operaciones. Grade 3 no tiene ese estándar, y la unidad es el dólar, no el bolívar.", "parcial", "md4"],
    ["Ma/Y4/Measurement", "Year 4 estima, compara y calcula medidas, incluido el dinero en libras y peniques.", "parcial", "ma"],
  ),
  pair(
    ["4.NBT.A.2", "Leer y comparar números de varias cifras es de Grade 4. Grade 3 opera dentro del millar.", "parcial", "nbt4"],
    ["Ma/Y4/NPV", "Year 4 reconoce el valor de cada cifra en un número de cuatro cifras y compara números más allá de 1000.", "directo", "ma"],
  ),
  pair(
    ["4.NBT.B.4", "Sumar y restar números de varias cifras con fluidez es de Grade 4. Grade 3 suma y resta dentro de 1000.", "parcial", "nbt4"],
    ["Ma/Y4/Add", "Year 4 suma y resta números de hasta cuatro cifras con el método en columnas. Las propiedades de la adición se ven antes.", "parcial", "ma"],
  ),
  pair(
    ["4.NBT.A.2", "Leer y escribir números de varias cifras, y decir su nombre, es de Grade 4.", "parcial", "nbt4"],
    ["Ma/Y4/NPV", "Year 4 representa, estima, ordena y compara números más allá de 1000.", "directo", "ma"],
  ),
  pair(
    ["4.NBT.B.5", "Multiplicar un número de hasta cuatro cifras por uno de una cifra, y dos números de dos cifras, es de Grade 4. Por 10, 20… 90 también está en Grade 3, dentro de un rango menor.", "parcial", "nbt4"],
    ["Ma/Y4/Mul", "Year 4 multiplica números de dos y de tres cifras por uno de una cifra. Multiplicar y dividir por 10, 100 y 1000 se fija en Year 5.", "parcial", "ma"],
  ),
  pair(
    ["3.MD.B.3", "Grade 3 representa datos en pictogramas y gráficos de barras a escala, y resuelve problemas de comparación.", "directo", "md3"],
    ["Ma/Y4/Statistics", "Year 4 interpreta y presenta datos discretos y continuos con gráficos de barras y de tiempo, y usa también pictogramas y tablas.", "directo", "ma"],
  ),
];

const cie = [
  pair(
    ["5-PS3-1", "No hay un desempeño de Grade 3 sobre grupos de alimentos. Grade 5 modela que la energía de la comida de los animales vino del sol.", "parcial", "ngss"],
    ["Sc/Y3/Animals", "Year 3 identifica que los animales, humanos incluidos, necesitan el tipo y la cantidad adecuados de nutrición.", "anterior", "sc"],
  ),
  pair(
    ["5-PS3-1", "Grade 5 relaciona la comida con la energía del cuerpo. Grade 3 no tiene un estándar de alimentación saludable.", "parcial", "ngss"],
    ["Sc/Y3/Animals", "Year 3 explica que las personas y los demás animales obtienen la nutrición de lo que comen.", "anterior", "sc"],
  ),
  pair(
    ["5-PS3-1", "Los platos típicos de Venezuela no están en NGSS. Lo más cercano es la energía de los alimentos, en Grade 5.", "nacional", "ngss"],
    ["Sc/Y3/Animals", "Year 3 trata la nutrición, no la cocina venezolana.", "nacional", "sc"],
  ),
  pair(
    ["5-PS3-1", "Valorar las tradiciones culinarias venezolanas no es un desempeño NGSS.", "nacional", "ngss"],
    ["Sc/Y3/Animals", "Year 3 no incluye el gusto por las tradiciones culinarias de Venezuela.", "nacional", "sc"],
  ),
  pair(
    ["5-PS3-1", "Grade 5 habla de la energía de los alimentos para el cuerpo, no del bienestar de la comunidad.", "parcial", "ngss"],
    ["Sc/Y3/Animals", "Year 3 trata la nutrición del organismo, no el bienestar comunitario.", "parcial", "sc"],
  ),
  pair(
    ["5-PS1-4", "Investigar si al mezclar dos o más sustancias aparece una sustancia nueva es de Grade 5, no de Grade 3.", "parcial", "ngss"],
    ["Sc/Y5/Materials", "Year 5 decide cómo separar mezclas filtrando, tamizando o evaporando. Year 4 estudia sólidos, líquidos y gases, no esa clasificación.", "parcial", "sc"],
  ),
  pair(
    ["5-PS1-3", "Identificar materiales por sus propiedades, con observaciones y mediciones, es de Grade 5.", "parcial", "ngss"],
    ["Sc/Y5/Materials", "Year 5 compara y agrupa materiales según propiedades y entiende las mezclas. Year 4 se queda en los estados de la materia.", "parcial", "sc"],
  ),
  pair(
    ["5-PS1-4", "Grade 5 investiga el resultado de mezclar sustancias. Los métodos de separación no son un desempeño de Grade 3.", "parcial", "ngss"],
    ["Sc/Y5/Materials", "Year 5 separa mezclas por filtrado, tamizado y evaporación.", "parcial", "sc"],
  ),
  pair(
    ["5-PS1-4", "Grade 5 conduce una investigación sobre mezclas. Ese desempeño no está en Grade 3.", "parcial", "ngss"],
    ["Sc/Y5/Materials", "Year 5 investiga cambios y mezclas. La indagación científica de Years 3–4 pide preguntas y observaciones, pero el contenido de mezclas es de Year 5.", "parcial", "sc"],
  ),
  pair(
    ["5-PS1-4", "Sacar conclusiones de una investigación sobre mezclas corresponde a Grade 5.", "parcial", "ngss"],
    ["Sc/Y3-4/WS", "En Years 3–4 se usan los resultados para sacar conclusiones simples, predecir y plantear nuevas preguntas. El contenido de mezclas es de Year 5.", "parcial", "sc"],
  ),
  pair(
    ["3-LS4-3", "Grade 3 argumenta que en un hábitat unos organismos sobreviven bien, otros menos y otros no.", "parcial", "ngss"],
    ["Sc/Y4/Living", "Year 4 agrupa seres vivos, usa claves de clasificación del entorno y reconoce que el ambiente puede cambiar.", "directo", "sc"],
  ),
  pair(
    ["3-LS4-3", "Grade 3 relaciona el hábitat con la supervivencia. El papel del agua en todos los organismos no es el enunciado.", "parcial", "ngss"],
    ["Sc/Y3/Plants", "Year 3 explora que las plantas necesitan aire, luz, agua, nutrientes del suelo y espacio.", "anterior", "sc"],
  ),
  pair(
    ["3-LS4-4", "Grade 3 valora una solución cuando el ambiente cambia y pueden cambiar las plantas y los animales que viven ahí.", "parcial", "ngss"],
    ["Sc/Y4/Living", "Year 4 reconoce que los ambientes pueden cambiar y que eso a veces pone en peligro a los seres vivos.", "directo", "sc"],
  ),
  pair(
    ["3-LS4-4", "Grade 3 trata el cambio del ambiente y su efecto en los seres vivos. No nombra el cambio climático.", "parcial", "ngss"],
    ["Sc/Y4/Living", "Year 4 reconoce que un ambiente que cambia puede poner en peligro a los seres vivos. No nombra el cambio climático.", "parcial", "sc"],
  ),
  pair(
    ["3-LS4-4", "Grade 3 argumenta sobre soluciones cuando cambia el ambiente. La actitud de proteger la biodiversidad no es el desempeño.", "parcial", "ngss"],
    ["Sc/Y4/Living", "Year 4 ve el peligro de un ambiente que cambia. Valorar y proteger no es una frase del programa.", "parcial", "sc"],
  ),
  pair(
    ["4-LS1-1", "Argumentar que plantas y animales tienen estructuras internas y externas que sirven para sobrevivir y crecer es de Grade 4.", "parcial", "ngss"],
    ["Sc/Y3/Plants", "Year 3 identifica y describe la función de raíz, tallo, hojas y flores.", "anterior", "sc"],
  ),
  pair(
    ["3-LS1-1", "Grade 3 modela que los organismos tienen ciclos de vida distintos y que todos nacen, crecen, se reproducen y mueren.", "directo", "ngss"],
    ["Sc/Y3/Plants", "Year 3 explora el papel de la flor en el ciclo de las plantas con flor, incluida la formación de la semilla.", "anterior", "sc"],
  ),
  pair(
    ["MS-LS1-6", "El papel de la fotosíntesis en el ciclo de la materia es de secundaria, no de Grade 3.", "parcial", "ngss"],
    ["Sc/Y3/Plants", "Year 3 explora que las plantas necesitan aire, luz y agua para vivir y crecer. No nombra la fotosíntesis.", "parcial", "sc"],
  ),
  pair(
    ["5-LS2-1", "Modelar el movimiento de la materia entre plantas, animales, descomponedores y el ambiente es de Grade 5.", "parcial", "ngss"],
    ["Sc/Y4/Living", "Year 4 agrupa seres vivos y ve ambientes que cambian. No describe la producción de oxígeno.", "parcial", "sc"],
  ),
  pair(
    ["4-ESS3-1", "Grade 4 describe que la energía y los combustibles vienen de recursos naturales y que su uso afecta el ambiente.", "parcial", "ngss"],
    ["Sc/Y4/Electricity", "Year 4 identifica aparatos que funcionan con electricidad y construye un circuito en serie. No cubre todas las formas y fuentes.", "parcial", "sc"],
  ),
  pair(
    ["4-ESS3-1", "Grade 4 relaciona energía, combustibles y efecto ambiental. El acceso de la comunidad al desarrollo no es el enunciado.", "parcial", "ngss"],
    ["Ge/KS2/Human", "Key Stage 2 describe la distribución de recursos naturales, incluida la energía.", "parcial", "ge"],
  ),
  pair(
    ["4-ESS3-1", "Grade 4 ve que el uso de la energía afecta el ambiente. La actitud de consumo responsable no es el desempeño.", "parcial", "ngss"],
    ["Sc/Y4/Electricity", "Year 4 identifica aparatos eléctricos. No fija una actitud de consumo.", "parcial", "sc"],
  ),
  pair(
    ["4-ESS3-1", "Grade 4 obtiene información sobre energía, combustibles y su efecto en el ambiente.", "parcial", "ngss"],
    ["Ge/KS2/Human", "Key Stage 2 estudia recursos naturales, incluida la energía, y el uso del suelo.", "parcial", "ge"],
  ),
  pair(
    ["5-PS2-1", "Argumentar que la gravedad de la Tierra sobre los objetos se dirige hacia abajo es de Grade 5. Grade 3 estudia fuerzas equilibradas y desequilibradas.", "parcial", "ngss"],
    ["Sc/Y5/Forces", "Year 5 explica que los objetos sin apoyo caen hacia la Tierra por la gravedad. Year 4 no tiene ese contenido.", "parcial", "sc"],
  ),
  pair(
    ["5-PS2-1", "La caída hacia la Tierra por la gravedad es de Grade 5.", "parcial", "ngss"],
    ["Sc/Y5/Forces", "Year 5 observa el efecto de la gravedad y también la resistencia del aire, el agua y la fricción.", "parcial", "sc"],
  ),
  pair(
    ["5-ESS1-2", "Representar patrones del día y la noche y de algunas estrellas es de Grade 5.", "parcial", "ngss"],
    ["Sc/Y5/Earth", "Year 5 describe el movimiento de la Tierra y de otros planetas, y explica el día y la noche por la rotación.", "parcial", "sc"],
  ),
];

const ide = [
  pair(
    ["C3 D2.His.1.3-5", "El marco C3, grados 3–5, ordena hechos relacionados en una secuencia. Los períodos indígena, colonial, agrícola y petrolero son de Venezuela.", "nacional", "c3"],
    ["Hi/KS2", "Key Stage 2 construye una cronología segura de la historia británica, local y mundial. Esos períodos venezolanos no están en el programa.", "nacional", "hi"],
  ),
  pair(
    ["C3 D2.His.2.3-5", "El marco C3 compara la vida en un período histórico con la vida de hoy.", "parcial", "c3"],
    ["Hi/KS2", "Key Stage 2 estudia las primeras civilizaciones y cómo cambia lo que sabemos del pasado. La historia de la comunicación no es un tema cerrado de Year 4.", "parcial", "hi"],
  ),
  pair(
    ["C3 D2.Geo.1.3-5", "El marco C3 construye mapas de lugares familiares y no familiares.", "parcial", "c3"],
    ["Ge/KS2/Fieldwork", "Key Stage 2 hace trabajo de campo del entorno cercano y puede presentarlo con croquis. El caserío venezolano es un ejemplo local, no el contenido inglés.", "parcial", "ge"],
  ),
  pair(
    ["3-ESS3-1", "Grade 3 argumenta sobre una solución de diseño que reduce el impacto de un peligro meteorológico. El mar Caribe y la pesca son contenido regional.", "parcial", "ngss"],
    ["Ge/KS2/Physical", "Key Stage 2 describe clima, ríos, costas y el ciclo del agua, y puede estudiar una región de América.", "parcial", "ge"],
  ),
  pair(
    ["C3 D2.Geo.3.3-5", "El marco C3 usa mapas de distintas escalas para localizar rasgos. Estados, capitales y Caracas son contenido nacional.", "nacional", "c3"],
    ["Ge/KS2/Locational", "Key Stage 2 nombra y localiza condados y ciudades del Reino Unido. La organización territorial de Venezuela no está en el programa.", "nacional", "ge"],
  ),
  pair(
    ["C3 D2.His.3.3-5", "El marco C3 pregunta por personas y grupos que marcaron cambios históricos. La resistencia indígena y el cacicazgo son contenido nacional.", "nacional", "c3"],
    ["Hi/KS2", "Key Stage 2 estudia sociedades no europeas como contraste con la historia británica. Esos liderazgos venezolanos no están en el programa.", "nacional", "hi"],
  ),
  pair(
    ["C3 D2.His.3.3-5", "El marco C3 atiende a grupos que sostuvieron cambios históricos. El trabajo afrovenezolano y esa gastronomía son contenido nacional.", "nacional", "c3"],
    ["Hi/KS2", "Key Stage 2 no incluye la historia afrovenezolana ni los alimentos de origen africano en la cocina de Venezuela.", "nacional", "hi"],
  ),
  pair(
    ["C3 D2.His.3.3-5", "El marco C3 estudia personas que marcaron la historia. La juventud de Bolívar es contenido nacional.", "nacional", "c3"],
    ["Hi/KS2", "Key Stage 2 puede estudiar a una persona significativa en un estudio local o británico. No incluye la biografía de Bolívar.", "nacional", "hi"],
  ),
  pair(
    ["C3 D2.His.3.3-5", "El marco C3 genera preguntas sobre personas y hechos. El Juramento del Monte Sacro es contenido nacional.", "nacional", "c3"],
    ["Hi/KS2", "Key Stage 2 no incluye el Juramento del Monte Sacro.", "nacional", "hi"],
  ),
  pair(
    ["C3 D2.His.3.3-5", "El marco C3 atiende a líderes de cambios históricos. Zamora y Cipriano Castro son contenido nacional.", "nacional", "c3"],
    ["Hi/KS2", "Key Stage 2 no incluye a Ezequiel Zamora ni a Cipriano Castro.", "nacional", "hi"],
  ),
  pair(
    ["C3 D2.Civ.1.3-5", "El marco C3 distingue responsabilidades de cargos de gobierno. La lista de presidentes de Venezuela es contenido nacional.", "nacional", "c3"],
    ["Hi/KS2", "Key Stage 2 extiende la cronología británica más allá de 1066. No lista presidentes de Venezuela.", "nacional", "hi"],
  ),
  pair(
    ["C3 D2.His.3.3-5", "El marco C3 estudia personas que marcaron cambios. Simón Rodríguez, Prieto Figueroa y el Día del Maestro son contenido nacional.", "nacional", "c3"],
    ["Hi/KS2", "Key Stage 2 no incluye a esos maestros ni el Día del Maestro venezolano.", "nacional", "hi"],
  ),
  pair(
    ["C3 D2.Geo.4.3-5", "El marco C3 explica cómo la cultura influye en la forma de vivir un lugar. El mestizaje venezolano es contenido nacional.", "nacional", "c3"],
    ["Ge/KS2/Place", "Key Stage 2 compara la geografía humana de una región del Reino Unido, una de Europa y una de América. No estudia el mestizaje venezolano.", "nacional", "ge"],
  ),
  pair(
    ["C3 D2.Civ.10.3-5", "El marco C3 identifica creencias y valores detrás de un punto de vista cívico. Los símbolos patrios de Venezuela son contenido nacional.", "nacional", "c3"],
    ["Hi/KS2", "El National Curriculum de primaria no fija una lección sobre bandera, escudo e himno de Venezuela.", "nacional", "hi"],
  ),
  pair(
    ["2.MD.C.8", "Grade 2 resuelve problemas con dólares y centavos. El origen del bolívar no está en el estándar.", "nacional", "md2"],
    ["Ma/Y4/Measurement", "Year 4 calcula con libras y peniques. No estudia el origen del bolívar.", "nacional", "ma"],
  ),
  pair(
    ["C3 D2.Geo.8.3-5", "El marco C3 relaciona asentamientos con el uso de recursos naturales. Costa-montaña, Llanos y Guayana son contenido nacional.", "nacional", "c3"],
    ["Ge/KS2/Locational", "Key Stage 2 localiza regiones del Reino Unido, su relieve y el uso del suelo. Esas regiones venezolanas no están en el programa.", "nacional", "ge"],
  ),
  pair(
    ["C3 D2.Civ.2.3-5", "El marco C3 explica que una democracia depende de la participación de las personas.", "parcial", "c3"],
    ["Ge/KS2/Fieldwork", "Key Stage 2 observa rasgos humanos del entorno cercano. Los roles de la escuela no son un apartado.", "parcial", "ge"],
  ),
  pair(
    ["C3 D2.Civ.12.3-5", "El marco C3 explica cómo las reglas y las leyes cambian la sociedad y cómo las personas cambian las reglas.", "parcial", "c3"],
    ["En/Spoken", "El programa de habla pide participar en conversaciones de colaboración. Repartir tareas del equipo no es un objetivo de Year 4.", "parcial", "en"],
  ),
  pair(
    ["C3 D2.Civ.10.3-5", "No hay estándar de Grade 3 sobre planificación familiar. El marco C3 sí pide reconocer puntos de vista distintos sobre asuntos cívicos.", "parcial", "c3"],
    ["NC/KS2", "El National Curriculum de 2014 no fija un programa de Year 4 sobre diversidad familiar ni planificación familiar.", "parcial", "nc"],
  ),
  pair(
    ["RI.3.7", "Grade 3 lee ilustraciones y símbolos junto con un texto. Las señales de tránsito para conductores y peatones no son el contenido.", "parcial", "ri"],
    ["Ge/KS2/Maps", "Key Stage 2 usa símbolos y leyenda en mapas. No son las señales de tránsito.", "parcial", "ge"],
  ),
];

const packs = { len, mat, cie, ide };
const icons = { len: "menu_book", mat: "calculate", cie: "science", ide: "public" };
const order = ["len", "mat", "cie", "ide"];

const areas = order.map((id) => {
  const source = national.areas.find((area) => area.id === id);
  const cells = packs[id];
  const expected = source.grade3Units.flatMap((unit) =>
    unit.learnings.map((learning) => ({ unitTitle: unit.title, learning })),
  );
  if (cells.length !== expected.length) {
    throw new Error(`${id}: mappings ${cells.length} != learnings ${expected.length}`);
  }
  return {
    id,
    title: source.title,
    icon: icons[id],
    rows: expected.map((row, index) => ({ ...row, ...cells[index] })),
  };
});

const doc = {
  meta: {
    grade: "3er grado",
    columns: [
      { id: "vzla", title: "Venezuela", programme: "MPPE, aprendizajes de 3.er grado" },
      { id: "us", title: "Estados Unidos", programme: "Common Core Grade 3, NGSS y marco C3" },
      { id: "uk", title: "Inglaterra", programme: "National Curriculum Year 4 y Key Stage 2" },
    ],
    sources: [
      {
        id: "vzla",
        title: "MPPE, propuestas de contenidos de 3.er grado",
        href: "/eoschool/requirements/national",
        note: "Aprendizajes ya cargados en este sitio. La columna Venezuela los repite sin cambiar el texto.",
      },
      {
        id: "ccss",
        title: "Common Core State Standards",
        href: "https://www.thecorestandards.org/",
        note: "© 2010 National Governors Association Center for Best Practices and Council of Chief State School Officers. All rights reserved.",
      },
      {
        id: "ngss",
        title: "Next Generation Science Standards",
        href: "https://www.nextgenscience.org/",
        note: "Cuando el tema no está en Grade 3, el código indica el grado donde sí aparece.",
      },
      {
        id: "c3",
        title: "College, Career, and Civic Life (C3) Framework",
        href: "https://www.socialstudies.org/standards/c3",
        note: "Marco de ciencias sociales para los grados 3–5. No es un estándar federal.",
      },
      {
        id: "dfe",
        title: "National curriculum in England: primary curriculum",
        href: "https://www.gov.uk/government/publications/national-curriculum-in-england-primary-curriculum",
        note: "Contains public sector information licensed under the Open Government Licence v3.0. Lengua, matemática y ciencias citan Year 4 cuando el programa lo fija; Historia y Geografía son de Key Stage 2.",
      },
    ],
  },
  areas,
};

const out = join(here, "../src/lib/eoschool-grade3-standards-crosswalk.json");
writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`wrote ${areas.reduce((n, area) => n + area.rows.length, 0)} rows`);
