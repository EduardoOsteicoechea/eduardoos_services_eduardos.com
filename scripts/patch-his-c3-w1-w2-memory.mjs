/**
 * Regenerate his week1–2 cell JSON from C3 Venezuela historia memory work (topics 1–2).
 */
import fs from "node:fs";
import path from "node:path";

const mediaRoot = path.join("frontend", "public", "homescool", "media");

const MEM_W1 =
  "Los primeros habitantes de Venezuela antes de la llegada de Colón fueron los Timotocuicas, Caribes, Arawacos y Wayús.";
const MEM_W2 =
  "El 3 de agosto de 1498 Cristóbal Colón llegó a Venezuela. En 1499 Alonso Ojeda, Américo Vespucio y Juan de la Cosa exploraron toda la costa desde Paria hasta la Guajira.";

function memBlock(week) {
  const text = week === 1 ? MEM_W1 : MEM_W2;
  const err =
    week === 1
      ? "Saltarse un nombre del texto o inventar pueblos que no están en la guía."
      : "Cambiar las fechas o el orden Paria–La Guajira.";
  return {
    id: "mem",
    heading: "Memorización",
    body: `Esta semana el texto que debes poder decir de memoria es:\n\n«${text}»\n\nLéelo en voz alta tres veces. Cubre la segunda mitad con la mano y repite solo la parte que no ves. Después intenta decirlo completo sin mirar.\n\nPráctica: Escribe el texto una vez. Luego táchalo con líneas y completa los huecos con las palabras que faltan.\n\nError común: ${err} Repite siempre la frase exacta de la guía.`,
  };
}

const W1 = {
  title: "Los primeros habitantes de Venezuela",
  summary:
    "Esta semana aprendimos que Venezuela ya estaba habitada antes de Colón por pueblos diversos, entre ellos Timotocuicas, Caribes, Arawacos y Wayús. Los estudiamos desde el mapa, la vida cotidiana y las fuentes que nos ayudan a recordarlos.",
  intro: [
    {
      id: "p1",
      heading: "¿Quiénes vivían aquí antes de Colón?",
      body: `Antes de la llegada de Colón, el territorio que hoy llamamos Venezuela ya estaba habitado. Pueblo originario significa una comunidad que vivía en América mucho antes de los barcos europeos. Esta semana el tema central es conocer a algunos de esos pueblos y entender que no formaban un solo grupo igual.

Los Timotocuicas, los Caribes, los Arawacos y los Wayús son cuatro nombres que debes reconocer. Cada uno se relaciona con regiones y costumbres distintas. Decir sus nombres con orden es el primer paso para contar bien la historia venezolana.

Observa el mapa mental: al centro escribe «Venezuela antes de Colón». Añade los cuatro nombres alrededor y una palabra sobre dónde suele ubicarse cada pueblo en las lecciones de esta semana.

Práctica: Copia los cuatro nombres en tu cuaderno. Di en voz alta: «Antes de Colón ya vivían aquí…» y completa con los cuatro pueblos.

Error común: Pensar que «indígena» es un solo pueblo. Son muchas culturas con lenguas, alimentos y territorios propios.`,
    },
    {
      id: "p2",
      heading: "Mapa y modos de vida",
      body: `Un territorio es un espacio donde un grupo vive, pesca, cultiva o recorre rutas de intercambio. Mirar la geografía ayuda a entender por qué no todos los pueblos vivían igual. En los llanos, cerca del río Orinoco, se asocian a menudo los Timotocuicas con agricultura y aldeas. En el litoral y las islas cercanas aparecen con frecuencia relatos sobre pueblos caribes ligados al mar y a la navegación en canoa.

Los Arawacos se vinculan a amplias zonas del norte de Sudamérica, incluidas selvas y ríos donde cultivaban yuca y maíz. Los Wayús habitan principalmente la península de La Guajira, al noroccidente, con un clima árido y fuerte tradición de pastoreo y comercio. Estas ideas son aproximaciones: dentro de cada nombre hay comunidades concretas con historias propias.

Imagina un día en cada zona: en el llano alguien cuida conucos; en la costa alguien prepara una canoa; en La Guajira alguien cruza el desierto con animales. La diversidad hace interesante la historia.

Práctica: Dibuja un mapa sencillo de Venezuela y escribe un pueblo junto a cada región (llanos, litoral, Guajira). Añade una actividad que podría hacer allí.

Error común: Ubicar todos los pueblos en el mismo lugar. Usa el mapa para separar regiones.`,
    },
    {
      id: "p3",
      heading: "Tres miradas para estudiarlos",
      body: `Los historiadores usan varias miradas para hablar de tiempos lejanos. La arqueología estudia restos de cerámica, herramientas y lugares antiguos. Las lenguas vivas y las tradiciones orales ayudan a enlazar el pasado con comunidades actuales. La comparación entre regiones muestra que el contacto entre pueblos existía antes de Colón mediante rutas de trueque.

Desde la mirada del respeto, nombrar a los pueblos evita la idea de un «descubrimiento» de una tierra vacía. Desde la mirada curiosa, puedes preguntar qué comían, cómo se organizaban o qué objetos intercambiaban. Desde la mirada del presente, muchas familias siguen identificándose con estos legados.

Esta semana volverás a estas tres preguntas: ¿quiénes eran?, ¿dónde y cómo vivían?, ¿qué fuentes nos ayudan a recordarlos? Así mantienes el interés cada día sin repetir la misma clase.

Práctica: Elige uno de los cuatro pueblos y escribe tres oraciones: una sobre su región, otra sobre una actividad y otra sobre por qué importa recordarlo.

Error común: Creer que solo existen los nombres de un libro y no personas reales con descendientes hoy.`,
    },
  ],
  deepen: [
    {
      heading: "Timotocuicas y los llanos",
      body: `Hoy profundizamos en los Timotocuicas y su relación con los llanos del centro y oriente de Venezuela. Un llano es una planicie amplia con pastos y ríos. Los Timotocuicas cultivaban en conucos, que son parcelas donde sembraban yuca, maíz y otras plantas. También pescaban y cazaban según la estación.

Las aldeas se organizaban con casas circulares o grandes viviendas comunitarias en algunos relatos. El trueque conectaba productos del río con los de otras zonas. Cuando lees «Timotocuica», piensa en gente del Orinoco y sus afluentes, no en un pueblo único sin variaciones.

Compara dos días del llano: en época de lluvias los ríos crecen y cambian las rutas; en sequía el ganado y la caza pueden acercarse a los poblados. Esa variación también forma parte de la historia.

Práctica: Escribe un mini-diario de un día en un llano: mañana en el conuco, tarde pescando, noche contando una historia en la aldea. Menciona la palabra Timotocuica.

Error común: Confundir Timotocuicas con Wayús. Los Wayús pertenecen principalmente a La Guajira, no al llano central.`,
    },
    {
      heading: "Caribes, Arawacos y el mar",
      body: `Hoy profundizamos en Caribes y Arawacos desde el litoral y los ríos del norte. Caribes se usa para hablar de pueblos ligados al mar Caribe, a la pesca y a viajes en canoa. Arawacos forman una familia lingüística amplia; en Venezuela aparecen en zonas de selva y costa con agricultura de yuca y redes de intercambio.

La canoa permitía la cabotaje, que es navegar pegado a la costa. Así llegaban conchas, sal, alimentos y noticias entre aldeas. No todos los encuentros eran iguales: algunos relatos europeos exageraron la ferocidad de los «caribes» para justificar conquistas. Como historiador joven, contrasta el estereotipo con la vida real de pescadores y agricultores.

Imagina un trueque en la playa: un grupo trae pescado y otro trae cerámica o semillas. Cada objeto tiene valor distinto según la necesidad del día. Esa economía existía antes de la moneda europea.

Práctica: Haz dos columnas tituladas Caribes y Arawacos. Escribe en cada una una región, una comida y un medio de transporte. Luego escribe una oración que explique un trueque posible entre ambos.

Error común: Usar «caribe» solo como enemigo de cuentos. Es un nombre de pueblos con cultura propia.`,
    },
    {
      heading: "Wayúu y la memoria viva",
      body: `Hoy profundizamos en los Wayús y en cómo cerramos el tema de la semana. La península de La Guajira, al noroccidente, tiene desiertos, viento constante y costa al mar. Los Wayús —también escrito Wayúu— son conocidos por el pastoreo de cabras, la tejeduría del chinchorro y rutas comerciales que cruzan la frontera con Colombia.

La memoria viva significa que tradiciones, idioma y parentesco siguen hoy. Estudiar Wayús conecta el pasado precolombino con comunidades presentes. Pregunta siempre: ¿qué continúa y qué cambió después del contacto europeo? Esa pregunta prepara semanas futuras de historia.

Repasa los cuatro nombres con un juego: di la región cuando alguien en casa diga el pueblo. Timotocuicas → llanos; Caribes → litoral; Arawacos → selva y costa norte; Wayús → Guajira.

Práctica: Investiga una artesanía wayúu (por ejemplo el chinchorro) y escribe tres oraciones explicando para qué sirve y qué clima la hace necesaria.

Error común: Olvidar a los Wayús al repetir la lista. Son uno de los cuatro nombres del texto de memorización.`,
    },
  ],
  review: [
    {
      heading: "Panorama de la semana",
      body: `Esta semana el tema central fueron los primeros habitantes de Venezuela antes de Colón. Aprendimos cuatro nombres —Timotocuicas, Caribes, Arawacos y Wayús— y los relacionamos con regiones y formas de vida. También usamos tres miradas: mapa, actividades cotidianas y fuentes para recordar el pasado.

Una historia completa empieza reconociendo que el territorio no estaba vacío. Después explica dónde vivía cada pueblo y qué hacía en su entorno. Por último, conecta el pasado con el presente de las comunidades.

Práctica: Di el texto de memorización completo. Luego añade una oración propia sobre la región que más te interesó.

Error común: Recitar los nombres sin decir que ya vivían aquí antes de los europeos.`,
    },
    {
      heading: "Panorama: Los cuatro pueblos",
      body: `Los Timotocuicas se vinculan a los llanos y al cultivo en conucos junto al Orinoco. Los Caribes aparecen en relatos costeros y marítimos del Caribe. Los Arawacos se extienden por selvas y ríos del norte con agricultura y trueque. Los Wayús habitan La Guajira con pastoreo, tejido y comercio.

Decir los cuatro nombres en orden ya es un logro de memoria. Mejor aún es añadir una pista geográfica a cada uno. Así el niño ve la historia como un mapa vivo y no como una lista aburrida.

Práctica: Haz cuatro tarjetas: nombre al frente, región y una actividad detrás. Mezcla y practica.

Error común: Mezclar regiones, por ejemplo poner Wayús en los llanos.`,
    },
    {
      heading: "Panorama: Mapa y vida diaria",
      body: `El mapa ordena la semana. Llanos para conucos y pesca; litoral para canoas; selva y ríos para yuca y maíz; Guajira para viento, cabras y chinchorros. La vida diaria incluye alimentarse, intercambiar objetos, contar historias y cuidar el territorio.

Puedes comparar tu día con un día imaginado en cada región: ¿qué desayuno habría?, ¿cómo se viajaría?, ¿con quién se compartiría la cena? Esa comparación mantiene el interés del niño.

Práctica: Dibuja cuatro iconos (planta, canoa, cabra, casa) y escribe debajo el pueblo que elegiste para cada uno.

Error común: Pensar que todos comían lo mismo. El clima cambia la dieta.`,
    },
    {
      heading: "Panorama: Fuentes y respeto",
      body: `La arqueología muestra cerámica y lugares antiguos. Las lenguas y tradiciones orales conectan con el presente. El respeto evita decir que América fue «descubierta» como si no hubiera dueños y habitantes.

Desde la ética, nombrar pueblos es reconocer derechos y memoria. Desde la curiosidad científica, cada hallazgo puede cambiar un detalle del mapa. Ambas miradas pueden convivir en tu cuaderno.

Práctica: Escribe dos oraciones: una con la palabra arqueología y otra con tradición oral.

Error común: Creer que la historia terminó en 1492. Esta semana estudia lo que ocurrió antes.`,
    },
    {
      heading: "Síntesis y memorización",
      body: `Síntesis significa unir las piezas. Quiénes: Timotocuicas, Caribes, Arawacos y Wayús. Dónde: llanos, litoral, selva y Guajira. Por qué importa: Venezuela ya tenía historia, rutas y culturas antes de Colón.

Texto de memorización de la semana:\n\n«${MEM_W1}»\n\nSi puedes decirlo completo y explicar un ejemplo de cada pueblo, dominaste el tema central. La próxima semana estudiarás la llegada europea, pero siempre sobre un territorio que ya estaba habitado.

Práctica: Escribe un párrafo de cinco oraciones. La primera recita el texto guía; las otras cuatro dan un detalle de región o actividad.

Error común: Repetir solo el título de la semana sin nombres ni regiones.`,
    },
  ],
  d1Quiz: [
    ["¿Había habitantes en Venezuela antes de Colón?", ["No", "Solo después de 1600", "Sí", "Solo en Europa"], "Sí"],
    ["Un pueblo de la lista de la semana:", ["Romanos", "Timotocuicas", "Vikingos", "Mongoles"], "Timotocuicas"],
    ["Otro pueblo de la lista:", ["Wayús", "Sumerios", "Celtas", "Persas"], "Wayús"],
    ["Tema central de la semana:", ["tres viajes de Colón", "primeros habitantes de Venezuela", "Guerra Federal", "petróleo"], "primeros habitantes de Venezuela"],
    ["Los Timotocuicas se asocian sobre todo a:", ["La Guajira", "los llanos", "el Polo Norte", "Europa"], "los llanos"],
    ["Los Wayús viven principalmente en:", ["La Guajira", "los Andes", "el Amazonas profundo", "Antártida"], "La Guajira"],
    ["Antes de Colón, Venezuela estaba:", ["vacía", "sin culturas", "habitada por pueblos originarios", "solo con animales"], "habitada por pueblos originarios"],
    ["Cuántos pueblos nombra el texto de memorización:", ["dos", "cuatro", "diez", "ninguno"], "cuatro"],
  ],
  d2Quiz: [
    ["Hoy profundizas en:", ["Wayús", "Timotocuicas", "Revolución Francesa", "petróleo"], "Timotocuicas"],
    ["Un conuco es:", ["un barco", "una parcela de cultivo", "una moneda", "un castillo"], "una parcela de cultivo"],
    ["Río asociado a los llanos:", ["Sena", "Orinoco", "Tíber", "Danubio"], "Orinoco"],
    ["En los llanos muchos cultivaban:", ["yuca y maíz", "solo hielo", "solo café europeo", "nada"], "yuca y maíz"],
    ["Timotocuicas ≠ Wayús porque:", ["son el mismo pueblo", "Wayús están en La Guajira", "no existieron", "vivían en Europa"], "Wayús están en La Guajira"],
    ["Actividad típica del llano:", ["pesca y cultivo", "solo esquí", "solo metro", "solo fábricas"], "pesca y cultivo"],
    ["Pueblo de la memorización en llanos:", ["Caribes", "Timotocuicas", "Romanos", "Griegos"], "Timotocuicas"],
    ["Error: tierra vacía antes de Colón es:", ["verdad", "falso", "ley de física", "teorema"], "falso"],
  ],
  d3Quiz: [
    ["Hoy profundizas en:", ["Caribes y Arawacos", "solo matemáticas", "tablas del 12", "latín solo"], "Caribes y Arawacos"],
    ["Los Caribes se relacionan mucho con:", ["el mar y canoas", "solo desiertos polares", "solo trenes", "la Luna"], "el mar y canoas"],
    ["Cabotaje significa:", ["volar alto", "navegar cerca de la costa", "caminar en montaña", "escribir latín"], "navegar cerca de la costa"],
    ["Arawacos cultivaban entre otros:", ["yuca", "solo nieve", "solo petróleo", "hielo"], "yuca"],
    ["Trueque es:", ["intercambio sin moneda moderna", "guerra total", "olvido", "impuesto"], "intercambio sin moneda moderna"],
    ["Estereotipo falso sobre caribes:", ["eran solo pescadores", "eran solo «salvajes» de cuentos", "usaban canoas", "vivían en el Caribe"], "eran solo «salvajes» de cuentos"],
    ["Pueblo costero de la lista:", ["Caribes", "Vikingos", "Egipcios", "Chinos antiguos"], "Caribes"],
    ["Arawacos pertenecen a una familia:", ["de barcos", "lingüística amplia", "de planetas", "de reyes españoles"], "lingüística amplia"],
  ],
  d4Quiz: [
    ["Hoy profundizas en:", ["Wayús y síntesis", "solo Colón 1492", "solo tablas", "solo griego"], "Wayús y síntesis"],
    ["La Guajira tiene clima:", ["ártico", "áido y ventoso", "solo polar", "sin viento"], "áido y ventoso"],
    ["Artesanía wayúu citada:", ["chinchorro", "submarino", "cohete", "robot"], "chinchorro"],
    ["Memoria viva significa:", ["tradiciones que continúan hoy", "solo dinosaurios", "olvido total", "solo libros"], "tradiciones que continúan hoy"],
    ["Cuarto pueblo del texto:", ["Wayús", "Romanos", "Persas", "Aztecas de México solo"], "Wayús"],
    ["Juego de repaso: Timotocuicas →", ["Guajira", "llanos", "Luna", "Europa"], "llanos"],
    ["Juego: Wayús →", ["llanos", "La Guajira", "Antártida", "Roma"], "La Guajira"],
    ["Lista completa incluye:", ["Timotocuicas, Caribes, Arawacos, Wayús", "solo dos nombres", "solo europeos", "nadie"], "Timotocuicas, Caribes, Arawacos, Wayús"],
  ],
  d5Quiz: [
    ["Orden del estudio: primero…", ["petróleo", "quiénes vivían antes de Colón", "solo 1999", "solo 1810"], "quiénes vivían antes de Colón"],
    ["Texto de memorización habla de:", ["primeros habitantes", "Guerra Federal", "Caracazo", "petróleo 1922"], "primeros habitantes"],
    ["Timotocuicas:", ["llanos", "solo mar", "solo nieve", "Europa"], "llanos"],
    ["Caribes:", ["litoral y mar", "solo desierto polar", "solo Andes altos", "Roma"], "litoral y mar"],
    ["Arawacos:", ["selva y costa norte", "solo Luna", "solo metro", "ninguna región"], "selva y costa norte"],
    ["Wayús:", ["La Guajira", "Orinoco bajo", "Patagonia", "Marte"], "La Guajira"],
    ["Síntesis: territorio antes de Colón:", ["vacío", "habitado", "sin nombres", "sin rutas"], "habitado"],
    ["Meta de memoria:", ["decir el texto guía", "olvidar nombres", "solo dibujar", "no hablar"], "decir el texto guía"],
  ],
};

const W2 = {
  title: "La llegada de los españoles a Venezuela",
  summary:
    "Esta semana estudiamos la llegada de Colón el 3 de agosto de 1498 y la exploración de 1499 por Ojeda, Vespucio y Juan de la Cosa desde Paria hasta La Guajira. Vimos el hecho desde la cronología, los exploradores y el mapa de la costa.",
  intro: [
    {
      id: "p1",
      heading: "Colón llega en 1498",
      body: `El tema central de esta semana es cómo los españoles llegaron a las costas de Venezuela a fines del siglo XV. Una cronología es una línea de fechas ordenadas. El 3 de agosto de 1498 Cristóbal Colón tocó tierras que hoy forman parte de Venezuela durante su tercer viaje al «Nuevo Mundo».

Colón buscaba rutas y riquezas para la Corona de Castilla. No viajaba solo por curiosidad: llevaba barcos, hombres y órdenes. Cuando estudiamos 1498, preguntamos qué vio, a quién encontró y qué escribieron después. Ese día abre la etapa europea en la costa venezolana.

Coloca en una línea el año 1498 y escribe «3 de agosto: Colón en Venezuela». Debajo anota «tercer viaje» para no mezclarlo con 1492 en el Caribe.

Práctica: Escribe la fecha completa y una oración que diga qué ocurrió ese día.

Error común: Creer que Colón llegó a Venezuela en 1492. Ese año fue al Caribe en el primer viaje.`,
    },
    {
      id: "p2",
      heading: "La expedición de 1499",
      body: `Un año después, en 1499, otra expedición recorrió la costa con más detalle. Explorar significa ir conociendo lugares para dibujarlos en mapas y contarlos en crónicas. Alonso de Ojeda, Américo Vespucio y Juan de la Cosa fueron figuras clave de ese viaje.

Ojeda había participado en viajes anteriores y conocía la logística de las flotas. Vespucio observaba costas y describía lo visto; su nombre se asocia luego al continente «América». Juan de la Cosa era cartógrafo, es decir, alguien que dibuja mapas; su trabajo ayudó a fijar la forma de la línea costera.

En 1499 no se quedaron solo en un punto: avanzaron siguiendo la costa. Esa continuidad muestra que el interés europeo pasó de un encuentro aislado a un reconocimiento del litoral.

Práctica: Haz tres tarjetas con los nombres Ojeda, Vespucio y de la Cosa. En cada una escribe un rol: explorar, describir, mapear.

Error común: Mezclar 1498 y 1499. Colón llega en 1498; la gran exploración costera es 1499.`,
    },
    {
      id: "p3",
      heading: "De Paria a La Guajira",
      body: `Paria es la región del golfo entre Trinidad y la tierra firme venezolana. La Guajira es la península noroccidental, hogar de los Wayús y puerta al Caribe occidental. La expedición de 1499 recorrió «toda la costa» entre esos extremos, lo que ayudó a los europeos a imaginar el contorno de lo que luego llamarían Tierra Firme.

Mirada de mapa: imagina la costa como una cuerda desde Paria hacia el oeste hasta La Guajira. Cada bahía y cabo que nombraron apareció en cartas. Mirada de los habitantes: muchos pueblos seguían viviendo sus rutas; el paso de barcos era un evento nuevo. Mirada de consecuencias: más viajes, más reclamos y más presión sobre territorios.

Esta semana evaluarás el tema con esas tres miradas cada día para no aburrirte repitiendo solo fechas.

Práctica: Dibuja una línea costera simple. Marca Paria al este y La Guajira al noroeste. Escribe 1498 cerca de Paria y 1499 a lo largo de la línea.

Error común: Pensar que «explorar toda la costa» significa que no había personas. Había comunidades en cada tramo.`,
    },
  ],
  deepen: [
    {
      heading: "El 3 de agosto de 1498",
      body: `Hoy profundizamos en la llegada de Colón. El diario de viaje y las cartas de la época describen avistamientos de tierra, encuentros con canoas y primeros intercambios. Tierra firme es la gran masa continental, distinta de una isla pequeña. Venezuela entra en la historia europea como parte de ese tercer viaje.

Pregunta desde la mirada del marinero: ¿qué buscaban al seguir la costa? Ruta, agua dulce, alimentos y noticias para la Corona. Pregunta desde la mirada de los pueblos costeros: ¿qué significaron esas velas y esos hombres? Curiosidad, trueque, miedo o defensa del territorio.

El 3 de agosto no es un dato suelto: es la fecha ancla del texto de memorización. Úsala para iniciar cualquier resumen oral de la semana.

Práctica: Escribe un titular de periódico imaginario del 4 de agosto de 1498 con dos frases: una sobre la flota y otra sobre quienes ya vivían en la costa.

Error común: Olvidar el día exacto. Practica «tres de agosto de mil cuatrocientos noventa y ocho».`,
    },
    {
      heading: "Ojeda, Vespucio y de la Cosa",
      body: `Hoy profundizamos en los exploradores de 1499. Alonso de Ojeda lideró la expedición con experiencia militar y marítima. Américo Vespucio escribió relatos que circularon en Europa y ayudaron a difundir noticias sobre estas tierras. Juan de la Cosa plasmó la costa en mapas que otros navegantes usarían después.

Compara roles: Ojeda decide rutas y negocia con la tripulación; Vespucio observa pueblos y recursos; de la Cosa traduce lo visto a líneas en pergamino. Ninguno actuaba solo: una flota es cooperación y jerarquía a la vez.

Desde la mirada económica, buscaban perlas, comercio y puertos. Desde la mirada política, cada viaje servía a la Corona española para reclamar territorios. Desde la mirada humana, eran personas con miedos, enfermedades y errores de lectura cultural.

Práctica: Escribe un diálogo corto entre Vespucio y de la Cosa: uno describe una bahía y el otro pregunta dónde ponerla en el mapa.

Error común: Atribuir el mapa de 1499 solo a Colón. Colón es 1498; esta travesía es 1499 con otros nombres.`,
    },
    {
      heading: "La costa de Paria a La Guajira",
      body: `Hoy profundizamos en el recorrido costero. Paria aparece en crónicas como zona de encuentro temprano con tierra firme. Avanzar hacia el oeste lleva a cabos, golfos y la península guajira. «Toda la costa» indica un esfuerzo por no quedarse en un solo puerto.

Mirada geográfica: anota viento, corrientes y fondos marinos que influyen en dónde anclan. Mirada cultural: cada tramo tiene pueblos con lenguas distintas. Mirada histórica: el recorrido de 1499 prepara años de asentamientos y conflictos posteriores.

Cierra la semana relacionando 1498 como primer contacto oficial en la fecha del texto y 1499 como exploración sistemática con nombres propios. Las dos fechas trabajan juntas.

Práctica: En tu mapa, añade tres iconos de ancla entre Paria y La Guajira. Escribe junto a cada uno un recurso que los europeos buscaban (perlas, agua, alimentos).

Error común: Creer que La Guajira está en el oriente. Está al noroccidente de Venezuela.`,
    },
  ],
  review: [
    {
      heading: "Panorama de la semana",
      body: `Esta semana dominamos la llegada española temprana a Venezuela con dos fechas: 3 de agosto de 1498, cuando Colón llegó, y 1499, cuando Ojeda, Vespucio y Juan de la Cosa exploraron la costa de Paria a La Guajira. Usamos miradas de cronología, exploradores y mapa.

Contar la historia completa une fecha, nombres y geografía. También recuerda que la costa ya estaba habitada; los viajes europeos se superponen a pueblos originarios estudiados la semana anterior.

Práctica: Di el texto de memorización. Luego señala en un mapa Paria y La Guajira.

Error común: Decir solo «llegó Colón» sin mencionar 1499 y la exploración costera.`,
    },
    {
      heading: "Panorama: 1498 y Colón",
      body: `Colón llegó el 3 de agosto de 1498 en su tercer viaje. Ese momento enlaza Venezuela con la expansión europea y con los diarios de navegación. No reemplaza la historia anterior de los pueblos originarios; la continúa con un nuevo actor.

Repasa la fecha en voz alta varias veces. Asóciala a «tierra firme» y al golfo de Paria para fijarla en la memoria visual.

Práctica: Escribe la fecha tres veces con letra clara y una vez con los ojos cerrados si puedes.

Error común: Usar 1492 como llegada a Venezuela.`,
    },
    {
      heading: "Panorama: 1499 y los exploradores",
      body: `En 1499 la expedición con Ojeda, Vespucio y de la Cosa recorrió el litoral. Ojeda lideró, Vespucio relató y de la Cosa cartografió. Conocer los roles evita mezclar nombres al recitar.

Pregunta de repaso: ¿qué aportó cada uno con una palabra? Liderazgo, relato, mapa.

Práctica: Ordena las tarjetas de nombres según el rol que escribiste el lunes.

Error común: Olvidar a Juan de la Cosa al repetir el texto.`,
    },
    {
      heading: "Panorama: Paria y La Guajira",
      body: `Paria al oriente y La Guajira al noroccidente marcan los extremos del recorrido de 1499. Entre ambos hay cientos de kilómetros de costa con bahías, ríos y pueblos. El mapa convierte palabras en imagen.

Imagina la costa como un camino marítimo. Cada parada enseña algo distinto sobre vientos, recursos y encuentros.

Práctica: Traza la línea costera y escribe «Paria» y «La Guajira» en los extremos correctos.

Error común: Invertir oriente y occidente en el dibujo.`,
    },
    {
      heading: "Síntesis y memorización",
      body: `Síntesis: 1498, Colón, Venezuela; 1499, Ojeda, Vespucio, de la Cosa, costa de Paria a La Guajira.

Texto de memorización de la semana:\n\n«${MEM_W2}»\n\nSi puedes decirlo completo y explicar cada frase con un ejemplo, cumpliste el objetivo de la semana. La historia sigue después con colonización, pero esta semana fija los primeros pasos europeos en fechas y nombres.

Práctica: Escribe un párrafo de cuatro oraciones. Usa ambas fechas y los tres exploradores de 1499, y cierra recitando el texto guía.

Error común: Memorizar nombres sin saber qué hizo cada expedición.`,
    },
  ],
  d1Quiz: [
    ["Colón llegó a Venezuela en:", ["1492", "3 de agosto de 1498", "1810", "1922"], "3 de agosto de 1498"],
    ["Ese viaje de Colón fue el:", ["primero", "segundo", "tercero", "quinto"], "tercero"],
    ["La exploración costera de 1499 incluye a:", ["Ojeda, Vespucio y de la Cosa", "solo Bolívar", "solo Páez", "solo Miranda"], "Ojeda, Vespucio y de la Cosa"],
    ["Tema de la semana:", ["llegada española a Venezuela", "Guerra Federal", "petróleo", "Caracazo"], "llegada española a Venezuela"],
    ["Paria está relacionada con:", ["golfo y oriente", "los Andes altos", "Europa", "la Luna"], "golfo y oriente"],
    ["La Guajira está al:", ["noroccidente", "centro de Europa", "Polo Sur", "fondo del mar"], "noroccidente"],
    ["1499 exploró:", ["toda la costa de Paria a La Guajira", "solo Madrid", "solo Roma", "ninguna costa"], "toda la costa de Paria a La Guajira"],
    ["Antes de estos viajes la costa:", ["no tenía habitantes", "tenía pueblos originarios", "era solo hielo", "no existía"], "tenía pueblos originarios"],
  ],
  d2Quiz: [
    ["Hoy profundizas:", ["3 de agosto de 1498", "1999", "1811", "2000"], "3 de agosto de 1498"],
    ["Colón en 1498 buscaba también:", ["rutas y recursos para Castilla", "solo jugar", "solo latín", "cerrar el mar"], "rutas y recursos para Castilla"],
    ["Tierra firme significa:", ["continente, no isla pequeña", "solo nube", "solo barco", "solo castillo"], "continente, no isla pequeña"],
    ["Fecha del texto de memorización (Colón):", ["3 de agosto de 1498", "5 de julio de 1811", "14 de diciembre de 1922", "23 de enero de 1958"], "3 de agosto de 1498"],
    ["1498 es distinto de 1492 porque:", ["1492 fue primer viaje al Caribe", "son el mismo día", "1492 es Venezuela", "no hay diferencia"], "1492 fue primer viaje al Caribe"],
    ["Tercer viaje de Colón:", ["1498", "1492", "1493", "1500"], "1498"],
    ["Encuentro en costa implica también:", ["pueblos que ya vivían allí", "solo robots", "solo vacío", "solo dinosaurios"], "pueblos que ya vivían allí"],
    ["Ancla de memoria de la semana:", ["3 de agosto de 1498", "solo 1499", "solo 1810", "solo tablas"], "3 de agosto de 1498"],
  ],
  d3Quiz: [
    ["Hoy profundizas:", ["expedición de 1499", "solo matemáticas", "solo tejidos", "solo griego"], "expedición de 1499"],
    ["Ojeda en 1499:", ["lideró la expedición", "pintó OiLS", "inventó el teléfono", "firmó la independencia"], "lideró la expedición"],
    ["Vespucio se asocia a:", ["relatos y observación", "solo mapas sin ver", "solo ejército de Bolívar", "solo petróleo"], "relatos y observación"],
    ["Juan de la Cosa era:", ["cartógrafo", "rey de España", "emperador romano", "astronauta"], "cartógrafo"],
    ["Año de Ojeda, Vespucio y de la Cosa:", ["1499", "1498", "1810", "1999"], "1499"],
    ["1499 ≠ 1498 porque:", ["1499 recorre la costa con otros líderes", "son iguales", "1498 es 1499", "ninguna"], "1499 recorre la costa con otros líderes"],
    ["Explorar significa:", ["conocer lugares para mapas y crónicas", "olvidar", "cerrar el mar", "solo cantar"], "conocer lugares para mapas y crónicas"],
    ["Tres nombres del texto:", ["Ojeda, Vespucio, de la Cosa", "solo Colón", "solo Páez", "solo Chávez"], "Ojeda, Vespucio, de la Cosa"],
  ],
  d4Quiz: [
    ["Hoy profundizas:", ["costa Paria–La Guajira", "solo tablas", "solo latín", "solo arte"], "costa Paria–La Guajira"],
    ["Paria se ubica hacia el:", ["oriente / golfo", "Polo Norte", "centro de España", "fondo del océano"], "oriente / golfo"],
    ["La Guajira al:", ["noroccidente", "oriente extremo", "Europa", "Luna"], "noroccidente"],
    ["«Toda la costa» en 1499 indica:", ["recorrido largo del litoral", "solo un puerto", "solo isla", "ningún mapa"], "recorrido largo del litoral"],
    ["Recurso buscado en la costa:", ["perlas y comercio", "solo nieve", "solo hielo", "nada"], "perlas y comercio"],
    ["La Guajira es hogar de:", ["Wayús", "solo romanos", "solo vikingos", "nadie"], "Wayús"],
    ["Extremos del texto de memorización:", ["Paria y La Guajira", "Madrid y Roma", "Luna y Marte", "solo Paria"], "Paria y La Guajira"],
    ["Síntesis de fechas:", ["1498 Colón, 1499 exploración costera", "solo 1492", "solo 1810", "solo 1999"], "1498 Colón, 1499 exploración costera"],
  ],
  d5Quiz: [
    ["Primera fecha clave:", ["3 de agosto de 1498", "5 de julio de 1811", "1922", "1989"], "3 de agosto de 1498"],
    ["Segunda fecha clave:", ["1499", "1492", "1600", "2020"], "1499"],
    ["Colón:", ["llegó a Venezuela 1498", "llegó a Venezuela 1492", "no llegó", "solo a Europa"], "llegó a Venezuela 1498"],
    ["Exploradores 1499:", ["Ojeda, Vespucio, de la Cosa", "solo Miranda", "solo Zamora", "solo Gómez"], "Ojeda, Vespucio, de la Cosa"],
    ["Recorrido:", ["Paria a La Guajira", "Madrid a París", "Roma a Grecia", "solo interior"], "Paria a La Guajira"],
    ["Cartógrafo:", ["Juan de la Cosa", "Colón solo", "Bolívar", "Páez"], "Juan de la Cosa"],
    ["Texto de memorización incluye:", ["dos frases con fechas", "solo una palabra", "solo petróleo", "nada"], "dos frases con fechas"],
    ["Meta:", ["explicar fechas, nombres y mapa", "olvidar 1499", "solo dibujar", "no hablar"], "explicar fechas, nombres y mapa"],
  ],
};

function mcq(id, originDay, prompt, choices, answer) {
  return { id, originDay, type: "mcq", prompt, choices, answer };
}

function writeQuestions(day, specs) {
  const out = [];
  for (let d = 1; d <= day; d++) {
    const key = `d${d}Quiz`;
    const week = specs;
    const list = week[key];
    if (!list) continue;
    list.forEach((row, i) => {
      const [prompt, choices, answer] = row;
      out.push(mcq(`d${d}-q${i + 1}`, d, prompt, choices, answer));
    });
  }
  return out;
}

function writeQuestionsFromWeek(weekSpec, day) {
  const out = [];
  for (let d = 1; d <= day; d++) {
    const list = weekSpec[`d${d}Quiz`];
    list.forEach((row, i) => {
      const [prompt, choices, answer] = row;
      out.push(mcq(`d${d}-q${i + 1}`, d, prompt, choices, answer));
    });
  }
  return out;
}

const writeExtrasD4 = [
  { id: "d4-w1", originDay: 4, type: "write", prompt: "Escribe tres ideas clave de his que recuerdes de la lección.", answer: "" },
  { id: "d4-w2", originDay: 4, type: "write", prompt: "Explica con tus palabras el punto que profundizaste hoy en his.", answer: "" },
  { id: "d4-w3", originDay: 4, type: "write", prompt: "Da un ejemplo propio relacionado con his.", answer: "" },
  { id: "d4-w4", originDay: 4, type: "write", prompt: "¿Qué duda te queda de his? ¿Cómo la resolverías?", answer: "" },
];

const writeExtrasD5 = [
  "Resume en tres oraciones la semana de his.",
  "Lista los tres puntos principales de his con una frase cada uno.",
  "Escribe una pregunta de repaso sobre his y respóndela.",
  "¿Cómo conectarías his con algo de tu vida diaria?",
  "Nombre el error común que más te ayudó evitar en his.",
  "Dibuja o describe un esquema mental de his.",
  "Enseña a un familiar una idea de his en pocas palabras.",
  "Meta de estudio para la próxima semana en his.",
].map((prompt, i) => ({
  id: `d5-w${i + 1}`,
  originDay: 5,
  type: "write",
  prompt,
  answer: "",
}));

function buildWeek(weekNum, spec) {
  for (let day = 1; day <= 5; day++) {
    let lesson;
    if (day === 1) {
      const memText = weekNum === 1 ? MEM_W1 : MEM_W2;
      lesson = {
        kind: "intro",
        focusPoint: null,
        points: spec.intro,
        summary: `${spec.summary}\n\nMemorización: «${memText}»`,
      };
    } else if (day <= 4) {
      lesson = {
        kind: "deepen",
        focusPoint: day - 1,
        points: [spec.deepen[day - 2], memBlock(weekNum)],
        summary: day === 4 ? spec.deepen[2].body.split("\n\n")[0] : "",
      };
    } else {
      lesson = {
        kind: "review",
        focusPoint: null,
        points: spec.review,
        summary: spec.summary,
      };
    }

    const questions = writeQuestionsFromWeek(spec, day);
    if (day === 4) {
      for (const w of writeExtrasD4) questions.push(w);
    }
    if (day === 5) {
      for (const w of writeExtrasD4) questions.push(w);
      for (const w of writeExtrasD5) questions.push(w);
    }

    const doc = {
      format: "eoschool",
      version: 1,
      cycle: 3,
      week: weekNum,
      day,
      level: 6,
      subject: "his",
      locale: "es",
      title: spec.title,
      lesson,
      quiz: { questionCount: questions.length, questions },
      media: [],
    };

    const dest = path.join(
      mediaRoot,
      `week${weekNum}`,
      `his-c3-w${weekNum}-d${day}-l6.eoschool.json`,
    );
    fs.writeFileSync(dest, JSON.stringify(doc, null, 2) + "\n", "utf8");
    console.log("wrote", dest, "questions", questions.length);
  }
}

buildWeek(1, W1);
buildWeek(2, W2);
