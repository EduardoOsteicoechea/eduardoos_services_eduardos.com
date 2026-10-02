/**
 * Historia · ciclo 3 · semana 1 · nivel 6 — "Los primeros pueblos de Venezuela".
 * Narrativa inductiva, todo "pregunta primero" (ver esp-c3-w1.mjs).
 *
 * Nota de hechos: los Timotocuicas se ubican en los Andes venezolanos (no en los
 * llanos). Caribes y Arawacos: costas y ríos. Wayús: La Guajira.
 */
const ayer = "¿Qué aprendiste ayer sobre esta misma materia?";

export default [
  // ───────────────────────── DÍA 1 ─────────────────────────
  {
    key: "his-c3-w1-d1",
    opening: "¿Crees que Venezuela estaba vacía antes de que llegara Colón?",
    repaso: null,
    units: [
      {
        h: "Punto 1: Venezuela ya tenía habitantes",
        a: [
          "No, Venezuela no estaba vacía.",
          "Mucho antes de Colón vivían aquí muchos pueblos.",
          "Se les llama pueblos originarios: son los primeros habitantes.",
          "Esta semana vas a conocer a cuatro de ellos.",
        ],
      },
      {
        q: [
          "Piensa en cómo vives tú. ¿Crees que todos esos pueblos",
          "vivían exactamente igual?",
        ],
        h: "Punto 2: Eran pueblos distintos",
        a: [
          "No vivían igual.",
          "Cada pueblo tenía su lugar, su lengua y sus costumbres.",
          "Por eso no se dice «los indígenas» como si fueran uno solo.",
          "Se nombra a cada pueblo por su nombre.",
        ],
      },
      {
        q: [
          "Entonces, ¿cómo se llamaban? Intenta recordar algún",
          "nombre que hayas oído.",
        ],
        h: "Punto 3: Los cuatro nombres guía",
        a: [
          "Hoy conoces cuatro pueblos:",
          "Timotocuicas, Caribes, Arawacos y Wayús.",
          "Los primeros habitantes de Venezuela antes de la llegada",
          "de Colón fueron los Timotocuicas, Caribes, Arawacos y Wayús.",
        ],
      },
      {
        q: [
          "Imagina un mapa con montañas, costa, selva y desierto.",
          "¿Crees que todos vivían en el mismo sitio?",
        ],
        h: "Punto 4: Cada pueblo, su lugar",
        a: [
          "Los Timotocuicas vivían en las montañas de los Andes.",
          "Los Caribes y los Arawacos vivían cerca de costas y ríos.",
          "Los Wayús viven en La Guajira, una tierra seca junto al mar.",
        ],
      },
      {
        q: [
          "¿Cómo crees que sabemos hoy cómo vivían?",
          "¿Quién nos lo puede contar?",
        ],
        h: "Punto 5: Cómo lo sabemos",
        a: [
          "Lo sabemos por objetos antiguos, como vasijas de barro.",
          "También por relatos que se cuentan de padres a hijos.",
          "Estudiamos a estos pueblos con respeto: eran personas reales.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué son los pueblos originarios?", o: ["Los primeros habitantes de un lugar", "Los barcos que llegaron", "Los jefes de los españoles", "Las montañas de los Andes"] },
        { q: "¿Estaba vacía Venezuela antes de Colón?", o: ["No, ya había muchos pueblos", "Sí, estaba vacía", "Solo había animales", "Solo vivía un pueblo"] },
        { q: "¿Vivían todos los pueblos exactamente igual?", o: ["No, cada uno tenía sus costumbres", "Sí, todos igual", "Sí, con la misma lengua", "Sí, en el mismo sitio"] },
        { q: "¿Cuál es uno de los cuatro pueblos de hoy?", o: ["Wayús", "Vikingos", "Romanos", "Egipcios"] },
        { q: "¿Dónde vivían los Timotocuicas?", o: ["En las montañas de los Andes", "En el desierto", "En el mar", "En una isla"] },
        { q: "¿Dónde viven los Wayús?", o: ["En La Guajira", "En los Andes", "En el Orinoco", "En una montaña"] },
        { q: "¿Cómo sabemos hoy cómo vivían?", o: ["Por vasijas y relatos antiguos", "Por la televisión", "Por fotos antiguas", "Por mensajes de texto"] },
        { q: "¿Cuántos pueblos guía conoces esta semana?", o: ["Cuatro", "Dos", "Siete", "Diez"] },
      ],
      write: [
        "Escribe los cuatro nombres de los pueblos de hoy.",
        "Explica qué es un pueblo originario con tus palabras.",
      ],
      schematic: [
        "Dibuja un mapa sencillo y ubica los cuatro pueblos.",
        "Dibuja un esquema: un pueblo, su lugar y cómo vivía.",
      ],
    },
    image: [
      "Dibuja un paisaje de Venezuela con montañas, costa y río.",
      "Escribe en cada lugar el pueblo que vivía allí.",
      "Pon una etiqueta con los cuatro nombres: Timotocuicas,",
      "Caribes, Arawacos y Wayús.",
    ],
    summary: "Venezuela ya tenía pueblos originarios distintos: Timotocuicas, Caribes, Arawacos y Wayús.",
  },

  // ───────────────────────── DÍA 2 ─────────────────────────
  {
    key: "his-c3-w1-d2",
    opening: ayer,
    repaso: [
      "Ayer supiste que Venezuela ya tenía pueblos originarios.",
      "Conociste a Timotocuicas, Caribes, Arawacos y Wayús.",
      "Cada pueblo vivía en su lugar y a su manera.",
    ],
    units: [
      {
        q: [
          "Imagina vivir en una montaña muy empinada. ¿Cómo",
          "sembrarías sin que la lluvia se lleve la tierra?",
        ],
        h: "Punto 1: Sembrar en las montañas",
        a: [
          "Los Timotocuicas vivían en los Andes venezolanos.",
          "Allí hacían terrazas: escalones planos en la montaña.",
          "Así la tierra se quedaba firme y se podía sembrar.",
          "También llevaban agua por canales hasta los cultivos.",
        ],
      },
      {
        q: [
          "¿Qué crees que cultivaban allá arriba, donde hace frío?",
        ],
        h: "Punto 2: Qué cultivaban",
        a: [
          "Cultivaban maíz y papa, entre otros alimentos.",
          "Un cultivo es una planta que se siembra para comer.",
          "Con tanto cuidado, la tierra les daba buena comida.",
        ],
      },
      {
        q: [
          "En una aldea hace falta alguien que guíe y ponga orden.",
          "¿Quién crees que lo hacía?",
        ],
        h: "Punto 3: Un jefe llamado cacique",
        a: [
          "Cada comunidad tenía un jefe llamado cacique.",
          "El cacique guiaba al pueblo y ayudaba a decidir.",
          "A esa forma de organizarse se le llama cacicazgo.",
        ],
      },
      {
        q: [
          "¿Y si dos aldeas tienen cosas distintas? ¿Cómo podrían",
          "conseguir lo que no tienen?",
        ],
        h: "Punto 4: El trueque",
        a: [
          "Con el trueque se cambia una cosa por otra, sin dinero.",
          "Los pueblos cambiaban alimentos y tejidos.",
          "Así se conectaban pueblos de lugares distintos.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿los Timotocuicas vivían en la",
          "costa o en la montaña?",
        ],
        h: "Punto 5: Cuidado con el lugar",
        a: [
          "Vivían en la montaña, en los Andes.",
          "Los Wayús son los que viven en La Guajira, junto al mar.",
          "Para no confundirlos, une cada pueblo con su lugar.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Dónde vivían los Timotocuicas?", o: ["En los Andes venezolanos", "En La Guajira", "En la costa", "En una isla"] },
        { q: "¿Qué es una terraza?", o: ["Un escalón plano hecho en la montaña", "Una canoa grande", "Un tejido", "Un idioma"] },
        { q: "¿Para qué servían las terrazas?", o: ["Para sembrar con la tierra firme", "Para pescar", "Para navegar", "Para tejer"] },
        { q: "¿Qué cultivaban los Timotocuicas?", o: ["Maíz y papa", "Solo pescado", "Solo cabras", "Solo yuca"] },
        { q: "¿Cómo llevaban agua a los cultivos?", o: ["Por canales", "En barcos", "Con cabras", "En hamacas"] },
        { q: "¿Cómo se llamaba el jefe de una comunidad?", o: ["Cacique", "Pescador", "Tejedor", "Navegante"] },
        { q: "¿Cómo se llama esa forma de organizarse?", o: ["Cacicazgo", "Trueque", "Terraza", "Cultivo"] },
        { q: "¿Qué es el trueque?", o: ["Cambiar una cosa por otra", "Comprar con dinero", "Tejer una hamaca", "Dibujar en piedra"] },
      ],
      write: [
        "Escribe qué cultivaban los Timotocuicas y dónde vivían.",
        "Explica con tus palabras qué hacía un cacique.",
      ],
      schematic: [
        "Dibuja una montaña con terrazas y rotula qué se siembra.",
        "Dibuja un esquema del trueque entre dos aldeas.",
      ],
    },
    image: [
      "Dibuja una montaña con terrazas como escalones.",
      "Rotula el maíz y la papa que se siembran allí.",
      "Dibuja un canal que lleva agua hasta los cultivos.",
      "Añade al cacique y escribe su nombre: cacique.",
    ],
    summary: "Los Timotocuicas vivían en los Andes, hacían terrazas y tenían caciques. Cambiaban cosas con el trueque.",
  },

  // ───────────────────────── DÍA 3 ─────────────────────────
  {
    key: "his-c3-w1-d3",
    opening: ayer,
    repaso: [
      "Ayer conociste a los Timotocuicas, en los Andes.",
      "Hacían terrazas y sembraban maíz y papa.",
      "Tenían caciques y cambiaban cosas con el trueque.",
    ],
    units: [
      {
        q: [
          "Piensa en ríos y mar. ¿Cómo viajarías por ahí si no",
          "hubiera puentes ni carros?",
        ],
        h: "Punto 1: Viajar en canoa",
        a: [
          "Caribes y Arawacos usaban canoas en ríos y costas.",
          "Una canoa es una barca hecha de un tronco.",
          "Así pescaban y visitaban otras aldeas.",
        ],
      },
      {
        q: [
          "Dime un alimento que se pueda sembrar cerca de un río.",
        ],
        h: "Punto 2: La yuca y la pesca",
        a: [
          "Los Arawacos sembraban yuca, una raíz que se come cocida.",
          "Los Caribes pescaban en la costa y en los ríos.",
          "Con las canoas cambiaban alimentos con otras aldeas.",
        ],
      },
      {
        q: [
          "Antes de que existieran los libros, ¿cómo crees que",
          "los abuelos enseñaban lo que sabían?",
        ],
        h: "Punto 3: Saber que se cuenta",
        a: [
          "Lo enseñaban hablando: con historias y canciones.",
          "A eso se le llama tradición oral.",
          "Los niños escuchaban y repetían para no olvidar.",
        ],
      },
      {
        q: [
          "¿Y si quieres dejar un mensaje para siempre?",
          "¿Dónde lo dibujarías?",
        ],
        h: "Punto 4: Dibujos en la piedra",
        a: [
          "Muchos pueblos grababan dibujos en rocas grandes.",
          "Esos dibujos se llaman petroglifos.",
          "Hay petroglifos en distintos lugares de Venezuela.",
          "Son mensajes muy antiguos que aún podemos ver.",
        ],
      },
      {
        q: [
          "Una pregunta con truco: ¿«caribe» es solo un nombre de",
          "cuentos de miedo o es un pueblo real?",
        ],
        h: "Punto 5: Un pueblo real",
        a: [
          "Los Caribes fueron un pueblo real, con cultura propia.",
          "Se conocían por navegar en canoa y pescar en la costa.",
          "Hay que tratarlos con respeto, como a cualquier pueblo.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Qué es una canoa?", o: ["Una barca hecha de un tronco", "Una hamaca tejida", "Un mapa antiguo", "Un jefe de aldea"] },
        { q: "¿Qué sembraban los Arawacos?", o: ["Yuca", "Trigo", "Uvas", "Arroz"] },
        { q: "¿Qué hacían los Caribes en la costa?", o: ["Pescaban", "Criaban cabras", "Hacían terrazas", "Tejían hamacas"] },
        { q: "¿Cómo enseñaban los abuelos antes de los libros?", o: ["Hablando, con historias y canciones", "Con la televisión", "Con computadoras", "Con cartas por correo"] },
        { q: "¿Cómo se llama contar saberes hablando?", o: ["Tradición oral", "Cacicazgo", "Trueque", "Terraza"] },
        { q: "¿Qué son los petroglifos?", o: ["Dibujos grabados en rocas", "Barcos de madera", "Mapas de papel", "Telas tejidas"] },
        { q: "¿Los Caribes fueron un pueblo real?", o: ["Sí, con cultura propia", "No, son de cuentos", "Fue un solo guerrero", "Eran los españoles"] },
        { q: "¿Para qué usaban canoas estos pueblos?", o: ["Para viajar por ríos y costas", "Para sembrar en montañas", "Para criar animales", "Para tejer"] },
      ],
      write: [
        "Escribe dos cosas que hacían los Caribes y los Arawacos.",
        "Explica con tus palabras qué es la tradición oral.",
      ],
      schematic: [
        "Dibuja una canoa en un río con yuca y peces.",
        "Dibuja un petroglifo con un mensaje sencillo.",
      ],
    },
    image: [
      "Dibuja un río con una canoa y una aldea en la orilla.",
      "Rotula la canoa, la yuca y los peces.",
      "Inventa un petroglifo sobre una roca grande.",
      "Escribe debajo qué mensaje quiere dejar.",
    ],
    summary: "Caribes y Arawacos vivían junto a ríos y costas, con canoas. Enseñaban hablando y grabando petroglifos.",
  },

  // ───────────────────────── DÍA 4 ─────────────────────────
  {
    key: "his-c3-w1-d4",
    opening: ayer,
    repaso: [
      "Ayer viste a Caribes y Arawacos junto al agua.",
      "Usaban canoas y los Arawacos sembraban yuca.",
      "Conociste la tradición oral y los petroglifos.",
    ],
    units: [
      {
        q: [
          "Imagina un lugar con mucho sol, poco agua y mucho viento.",
          "¿Quién crees que vive ahí y de qué vive?",
        ],
        h: "Punto 1: La Guajira",
        a: [
          "Ese lugar existe: se llama La Guajira.",
          "Está en el noroccidente de Venezuela, junto al mar.",
          "Es una tierra seca y con mucho viento.",
          "Allí viven los Wayús, también llamados wayúu.",
        ],
      },
      {
        q: [
          "En un lugar seco hay poca hierba. ¿Qué animales",
          "crees que se pueden criar allí?",
        ],
        h: "Punto 2: Pastores del desierto",
        a: [
          "Los Wayús crían cabras y ovejas.",
          "Cuidar animales se llama pastoreo.",
          "Esos animales llegaron con los españoles.",
          "Los Wayús los hicieron parte de su vida.",
        ],
      },
      {
        q: [
          "Si no tienes cama, ¿cómo podrías dormir?",
          "Pista: es algo que se cuelga.",
        ],
        h: "Punto 3: El chinchorro",
        a: [
          "Los Wayús tejen chinchorros, camas que se cuelgan.",
          "Un chinchorro es una hamaca tejida a mano.",
          "Tejer es entrelazar hilos para hacer una tela.",
          "Cada tejido lleva diseños con significado.",
        ],
      },
      {
        q: [
          "¿Crees que los Wayús aceptaron que otros mandaran",
          "en su tierra?",
        ],
        h: "Punto 4: Defender su tierra",
        a: [
          "Los Wayús defendieron su territorio por mucho tiempo.",
          "Eso se llama resistencia: no rendirse ante lo que se impone.",
          "Sus familias se organizaban en clanes, con líderes propios.",
          "Los líderes ayudaban a decidir y a resolver problemas.",
        ],
      },
      {
        q: [
          "¿Esa cultura se quedó en el pasado o sigue viva hoy?",
        ],
        h: "Punto 5: Una memoria viva",
        a: [
          "Sigue viva: los Wayús hablan su idioma y tejen hoy.",
          "Su idioma se llama wayuunaiki.",
          "Cuando una cultura continúa, tiene memoria viva.",
          "Algunas cosas cambiaron, pero su identidad sigue.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Dónde viven los Wayús?", o: ["En La Guajira", "En los Andes", "En un río", "En una isla"] },
        { q: "¿Cómo es La Guajira?", o: ["Seca y con mucho viento", "Fría y con nieve", "Llena de selva", "Siempre inundada"] },
        { q: "¿Qué es el pastoreo?", o: ["Cuidar animales", "Dibujar mapas", "Navegar en canoa", "Cambiar cosas"] },
        { q: "¿Qué es un chinchorro?", o: ["Una hamaca tejida a mano", "Una canoa", "Un tipo de mapa", "Un jefe"] },
        { q: "¿Qué significa tejer?", o: ["Entrelazar hilos para hacer tela", "Grabar en una roca", "Navegar la costa", "Sembrar yuca"] },
        { q: "¿Qué hicieron los Wayús para proteger su tierra?", o: ["La defendieron mucho tiempo", "La abandonaron", "Nunca se opusieron", "Se hicieron navegantes"] },
        { q: "¿Cómo se llama el idioma de los Wayús?", o: ["Wayuunaiki", "Latín", "Inglés", "Francés"] },
        { q: "¿Qué es la memoria viva?", o: ["Cuando una cultura continúa hoy", "Un libro antiguo", "Un dibujo en piedra", "Una canoa"] },
      ],
      write: [
        "Escribe tres cosas que hacen los Wayús en La Guajira.",
        "Explica qué es la resistencia con tus palabras.",
      ],
      schematic: [
        "Dibuja un esquema: La Guajira, cabras, chinchorro e idioma.",
        "Dibuja un chinchorro colgado y rotula sus partes.",
      ],
    },
    image: [
      "Dibuja La Guajira: sol, viento, cabras y mar.",
      "Dibuja un chinchorro colgado entre dos postes.",
      "Rotula los nombres: La Guajira, cabras y chinchorro.",
      "Añade un diseño tejido con colores.",
    ],
    summary: "Los Wayús viven en La Guajira, crían cabras, tejen chinchorros y defendieron su tierra. Su cultura sigue viva.",
  },

  // ───────────────────────── DÍA 5 ─────────────────────────
  {
    key: "his-c3-w1-d5",
    opening: ayer,
    repaso: [
      "Esta semana conociste a cuatro pueblos originarios.",
      "Cada uno vivió en un lugar y a su manera.",
      "Hoy los recuerdas y aprendes a contarlos.",
    ],
    units: [
      {
        q: [
          "Sin mirar nada, ¿quiénes fueron los primeros habitantes",
          "de Venezuela antes de la llegada de Colón?",
        ],
        w: 3,
        h: "Punto 1: Los cuatro pueblos",
        a: [
          "Los primeros habitantes de Venezuela antes de la llegada",
          "de Colón fueron los Timotocuicas, Caribes, Arawacos y Wayús.",
          "Si olvidaste alguno, dilo otra vez en voz alta.",
        ],
      },
      {
        q: [
          "Une cada pueblo con su lugar. ¿Dónde vivía cada uno?",
        ],
        h: "Punto 2: Cada pueblo, su lugar",
        a: [
          "Timotocuicas: montañas de los Andes, con terrazas y maíz.",
          "Caribes y Arawacos: costas y ríos, con canoas y yuca.",
          "Wayús: La Guajira, con cabras, chinchorros y tradición viva.",
        ],
      },
      {
        q: [
          "¿Qué tenían en común todos estos pueblos?",
          "Piensa en cómo se organizaban y cómo enseñaban.",
        ],
        h: "Punto 3: Lo que compartían",
        a: [
          "Tenían jefes, como los caciques, que guiaban a la comunidad.",
          "Cambiaban cosas con el trueque.",
          "Enseñaban hablando y grababan petroglifos en las rocas.",
        ],
      },
      {
        q: [
          "Vas a contarle esto a alguien de tu casa. ¿Cómo",
          "empezarías para que te entienda?",
        ],
        h: "Punto 4: Cómo contarlo con orden",
        a: [
          "Una buena explicación tiene inicio, medio y final.",
          "Inicio: «Antes de Colón, Venezuela ya tenía pueblos».",
          "Medio: di los cuatro pueblos y un dato de cada uno.",
          "Final: cuenta por qué hay que respetarlos.",
        ],
      },
      {
        q: [
          "¿Basta con repetir los cuatro nombres?",
          "¿Qué más necesitas saber?",
        ],
        h: "Punto 5: Saber más que nombres",
        a: [
          "No basta con los nombres.",
          "Hay que saber dónde y cómo vivía cada pueblo.",
          "Así cuentas su historia con respeto y sin confundirlos.",
        ],
      },
    ],
    quiz: {
      mcq: [
        { q: "¿Cuántos pueblos guía estudiaste esta semana?", o: ["Cuatro", "Dos", "Seis", "Nueve"] },
        { q: "¿Quiénes vivían en las montañas de los Andes?", o: ["Timotocuicas", "Wayús", "Caribes", "Arawacos"] },
        { q: "¿Quiénes viven en La Guajira?", o: ["Wayús", "Timotocuicas", "Arawacos", "Caribes"] },
        { q: "¿Quiénes usaban canoas en costas y ríos?", o: ["Caribes y Arawacos", "Solo Timotocuicas", "Solo Wayús", "Nadie"] },
        { q: "¿Cómo se llama cambiar cosas sin dinero?", o: ["Trueque", "Cacicazgo", "Pastoreo", "Petroglifo"] },
        { q: "¿Cómo se llama el jefe de una comunidad?", o: ["Cacique", "Pescador", "Tejedor", "Pastor"] },
        { q: "¿Qué partes tiene una buena explicación?", o: ["Inicio, medio y final", "Solo nombres", "Solo dibujos", "Solo fechas"] },
        { q: "¿Qué hay que saber, además de los nombres?", o: ["Dónde y cómo vivía cada pueblo", "Solo una fecha", "Solo los colores", "Nada más"] },
      ],
      write: [
        "Escribe de memoria los cuatro pueblos y dónde vivían.",
        "Cuenta con tus palabras cómo vivía uno de los pueblos.",
      ],
      schematic: [
        "Dibuja un mapa con los cuatro pueblos y sus lugares.",
        "Dibuja un esquema de inicio, medio y final de tu relato.",
      ],
    },
    image: [
      "Dibuja un mapa con montañas, costa, ríos y desierto.",
      "Rotula en cada zona el pueblo que vivía allí.",
      "Añade un dibujo pequeño de lo que hacía cada pueblo.",
      "Revisa que estén los cuatro pueblos.",
    ],
    summary: "Timotocuicas, Caribes, Arawacos y Wayús vivían en lugares distintos. Cuéntalos con inicio, medio y final.",
  },
];
