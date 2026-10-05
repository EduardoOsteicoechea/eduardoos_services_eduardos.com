/** MPPE day activity engine — typed templates, modes, canDo, QA (rev 7). */

export const SAMPLE_DAYS = [
  4, 11, 28, 35, 42, 59, 66, 73, 90, 97, 104, 111, 128, 135, 142, 159, 166, 173, 190, 197,
];

export const MINUTES = { bib: 12, academic: 20 };

const MINISTERIAL_START =
  /^(valora|desarrolla|demuestra|es capaz de|comprende|reconoce|identifica|participa|recomienda|registra|recopila|usa en la escritura)\b/i;

const MINISTERIAL_INLINE =
  /\b(valora|desarrolla|demuestra|es capaz de|participa en|recomienda|recopila,?\s+organiza)\b/i;

function clipWords(text, maxWords = 10) {
  const words = String(text ?? "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}…`;
}

/** Idea central para consignas (no pegar el MPPE). */
export function topicShort(learningPhrase, learningRaw, maxWords = 10) {
  let t = String(learningRaw ?? "").replace(/\s+/g, " ").trim().replace(/\.+$/, "");
  const stripPrefixes = [
    /^comprende\s+(qué es\s+)?/i,
    /^reconoce\s+(la importancia de\s+)?/i,
    /^conoce\s+(y comparte[^,]+,?\s+)?/i,
    /^registra por escrito\s+/i,
    /^desarrolla\s+habilidades para\s+/i,
    /^desarrolla\s+/i,
    /^participa en\s+/i,
    /^recomienda\s+/i,
    /^usa en la escritura\s+/i,
    /^recopila,?\s+/i,
    /^identifica\s+/i,
    /^ejecuta\s+/i,
  ];
  for (const re of stripPrefixes) t = t.replace(re, "");
  const semi = t.indexOf(";");
  if (semi > 12 && semi < 90) t = t.slice(0, semi);
  const colon = t.indexOf(":");
  if (colon > 12 && colon < 70) t = t.slice(0, colon);
  t = t.trim();
  if (/^orientarte en el espacio/i.test(learningPhrase || "")) return "orientarte en el espacio";
  if (/alimentación saludable/i.test(t)) return "alimentación saludable y grupos de alimentos";
  if (/normas|convivencia|trabajo en equipo/i.test(t)) return "normas de convivencia y trabajo en equipo";
  if (/ortograf|r\/rr/i.test(t)) return "reglas de r y rr en palabras";
  if (/presidentes|petr[oó]leo|siglo (xx|xxi)/i.test(t)) return "hitos de la historia reciente de Venezuela";
  if (/agua/i.test(t) && !/biodivers/i.test(t)) return "el agua y la vida";
  if (/cambio climático|clima/i.test(t)) return "el clima y su cuidado";
  if (/conservaci/i.test(t)) return "cuidar agua y vida en tu barrio";
  if (/recomienda.*reseña|reseñas escritas/i.test(t)) return "escribir reseñas de libros";
  if (/registra por escrito|lectura de textos/i.test(t)) return "ideas de un texto leído";
  if (/expresiones l[uú]dicas|trabalenguas|adivinanzas/i.test(t)) return "juegos de palabras y cuentos cortos";
  if (/señales b[aá]sicas|señal[eé]tica|tr[aá]nsito/i.test(t)) return "señales de seguridad y tránsito";
  if (learningPhrase && learningPhrase.length < 55 && !MINISTERIAL_INLINE.test(learningPhrase)) {
    return clipWords(learningPhrase, maxWords);
  }
  if (!t) return "el tema del día";
  return clipWords(t.charAt(0).toLowerCase() + t.slice(1), maxWords);
}

export function dedupeObjectiveTitle(title) {
  if (!title) return title;
  const parts = String(title).split(" · ").map((s) => s.trim()).filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out.join(" · ") || title;
}

export function classifyMode(sectionId, learning, objective) {
  const L = (learning || "").toLowerCase();
  const len = (learning || "").length;
  if (
    sectionId !== "bib" &&
    (len > 220 ||
      /presidentes de venezuela|siglo (xx|xxi)|todos los|enumerar|lista de/i.test(L) ||
      (L.split(/[,;]/).length > 5 && len > 140) ||
      /reglas ortogr[aá]ficas b[aá]sicas: al principio/i.test(L))
  ) {
    return "fragmentado";
  }
  if (
    sectionId !== "bib" &&
    (/^escribe,?\s+en forma convencional,\s+tu nombre/i.test(learning || "") ||
      /onomatopey|gracias y por favor|solo el nombre|reconoce su nombre/i.test(L) ||
      (len < 42 &&
        !/\d/.test(L) &&
        !/mapa|fracci|operaci|pol[ií]gono|orienta espacial|se orienta/i.test(L)))
  ) {
    return "apalancado";
  }
  return "directo";
}

export function classifyKind(sectionId, learning, objective) {
  const L = (learning || "").toLowerCase();
  const O = (objective || "").toLowerCase();
  if (sectionId === "bib") return "bible";
  if (sectionId === "mat") {
    if (/orienta espacial|se orienta|puntos de referencia|ubicaci[oó]n espacial/i.test(L))
      return "spatialOrientation";
    if (/c[ií]rculo|circunferencia/i.test(L)) return "geometryCircles";
    if (/recta|punto|paralel|perpendic/i.test(L)) return "geometry";
    if (/pol[ií]gono|lados|v[eé]rtice|figura|per[ií]metro|ángulo/i.test(L)) return "geometryShapes";
    if (/valor posicional|unidades|decenas|centenas|miles|descompon/i.test(L)) return "placeValue";
    if (/fracci/i.test(L)) return "fractions";
    if (/medir|medida|longitud|masa|capacidad|tiempo|regla/i.test(L)) return "measurement";
    if (/gr[aá]fico|datos|tabla|pictograma|encuesta|recopila|clasifica.*datos/i.test(L)) return "data";
    if (/moneda|bol[ií]var|compra|vuelto|precio/i.test(L)) return "money";
    if (/suma|resta|multiplic|divisi|operaci|problema|n[uú]mero|adici|sustracci/i.test(L)) return "operations";
    if (/plano|mapa/i.test(L)) return "spatialOrientation";
    if (/geometr/i.test(O) && !L) return "geometryShapes";
    return "default";
  }
  if (sectionId === "len") {
    if (/mapa de venezuela|ubica y lee en el mapa|localiza.*mapa/i.test(L)) return "map";
    if (/dictado/i.test(L)) return "dictation";
    if (/ortograf|r\/rr|singular.?plural|plural y singular/i.test(L)) return "orthography";
    if (/onomatopey|sonidos de (la|los|las)/i.test(L)) return "onomatopoeia";
    if (/señales? (de tr[aá]nsito|viales)|señal de/i.test(L)) return "signs";
    if (/registra por escrito|contenidos fundamentales|a partir de la lectura/i.test(L)) return "readingNotes";
    if (/reseña|cr[ií]tica|opini[oó]n sobre/i.test(L)) return "review";
    if (/refr[aá]n|dicho/i.test(L)) return "proverb";
    if (/argumenta|debate/i.test(L)) return "argument";
    if (/narrat|cuento|relato|expresiones l[uú]dicas|chistes|adivinanzas/i.test(L)) return "narrative";
    if (/mapa|localiza|etiqueta/i.test(L)) return "map";
    return "default";
  }
  if (sectionId === "cie") {
    if (/conservaci|proyecto.*(agua|biodivers)/i.test(L)) return "conservation";
    if (/cambio clim[aá]tico|efectos del cambio clim[aá]tico|efectos del clima|calentamiento|lluvias extremas|clima en/i.test(L))
      return "climate";
    if (/agua/i.test(L) && !/biodivers|conservaci/i.test(L)) return "water";
    if (/mezcla|disoluci|soluble/i.test(L)) return "mixture";
    if (/planta|semilla|fotos[ií]ntesis|ra[ií]z/i.test(L)) return "plants";
    if (/gravedad|fuerza|movimiento|ca[ií]da|astron[oó]m/i.test(L)) return "forces";
    if (/biodivers|ecosistema|h[aá]bitat/i.test(L)) return "biodiversity";
    if (/alimentaci[oó]n saludable|grupos de alimentos/i.test(L)) return "nutrition";
    return "observation";
  }
  if (sectionId === "ide") {
    if (/normas|reglas.*convivencia|trabajo en equipo|colaboraci|distribuci[oó]n de tareas/i.test(L))
      return "normsTeam";
    if (
      /planificaci[oó]n familiar|diversidad familiar|necesidades b[aá]sicas|bienestar de las familias/i.test(L)
    )
      return "familyNeeds";
    if (/presidentes|petr[oó]leo|per[ií]odos de la historia|republicano petrolero|naci[oó]n petrolera/i.test(L))
      return "historyMilestones";
    if (/capital|estados|mapa|frontera|r[ií]os|lagos/i.test(L)) return "mapPlaces";
    if (/biograf|personaje|h[eé]roe/i.test(L)) return "biography";
    if (/vivienda|comunidad|barrio|plano/i.test(L)) return "mapPlaces";
    if (/cultura|tradici|folklor|gastronom|m[uú]sica|fiesta/i.test(L)) return "culture";
    if (/derecho|deber|constituci/i.test(L)) return "rights";
    return "default";
  }
  return "default";
}

function matConcreteSet(planDay) {
  const sets = [
    ["234 + 156 =", "8000 − 325 =", "47 × 6 =", "84 ÷ 4 ="],
    ["1250 + 340 =", "5000 − 1278 =", "8 × 125 =", "96 ÷ 8 ="],
    ["367 + 428 =", "10000 − 4567 =", "12 × 9 =", "72 ÷ 6 ="],
    ["589 + 211 =", "4500 − 1893 =", "25 × 4 =", "63 ÷ 7 ="],
  ];
  return sets[(planDay - 1) % sets.length];
}

function sanitizeActivities(activities, learning, topic) {
  const L = String(learning ?? "").replace(/\s+/g, " ").trim();
  const out = [];
  for (let act of activities) {
    let t = String(act);
    if (L.length >= 40) {
      for (let n = 40; n >= 20; n -= 5) {
        const chunk = L.slice(0, n);
        if (chunk.length >= 20 && t.includes(chunk)) {
          t = t.split(chunk).join(topic);
        }
      }
    }
    t = t.replace(/\bsobre (registrar|recopila|desarrolla|participa|reconoce)\b/gi, "sobre el tema");
    t = t.replace(/\b4 oraciones sobre [^.;]{35,}/gi, "4 oraciones con tus ideas en lista");
    t = t.replace(/\bEncuesta a \d+ personas sobre [^;]+;/gi, "Encuesta a 4 personas sobre un tema sencillo (fruta favorita, medio de transporte);");
    if (MINISTERIAL_INLINE.test(t) && /sobre [^.;]{30,}/i.test(t)) {
      t = t.replace(/sobre [^.;]{20,}/gi, `sobre ${topic}`);
    }
    out.push(t);
  }
  return out;
}

export function qaHardRules(sectionId, pack, learning) {
  const fails = [];
  const L = (learning || "").toLowerCase();
  const kind = pack.kind || pack.activityKind;
  const joined = (pack.activities ?? []).join(" ").toLowerCase();

  if (sectionId === "mat" && /orienta espacial|se orienta/i.test(L) && kind !== "spatialOrientation") {
    fails.push("mat spatial learning but wrong kind");
  }
  if (sectionId === "cie") {
    if (/agua/i.test(L) && !/biodivers|conservaci/i.test(L) && kind === "biodiversity") {
      fails.push("cie water learning but biodiversity kind");
    }
    if (/cambio clim[aá]tico|efectos del clima/i.test(L) && kind !== "climate") {
      fails.push("cie climate learning but wrong kind");
    }
    if (/conservaci/i.test(L) && kind !== "conservation") {
      fails.push("cie conservation learning but wrong kind");
    }
  }
  if (sectionId === "ide" && /normas|trabajo en equipo|convivencia/i.test(L)) {
    if (/comida, m[uú]sica o fiesta|gastronom/i.test(joined)) fails.push("ide norms topic but culture party activity");
    if (kind !== "normsTeam") fails.push("ide norms learning but wrong kind");
  }
  const Lnorm = String(learning ?? "").replace(/\s+/g, " ");
  for (const act of pack.activities ?? []) {
    if (Lnorm.length >= 40 && act.includes(Lnorm.slice(0, 40))) fails.push("ministerial paste in activity");
    if (MINISTERIAL_START.test(act)) fails.push("ministerial verb in activity");
    if (MINISTERIAL_INLINE.test(act) && act.length > 90 && /sobre [^.;]{25,}/i.test(act)) {
      fails.push("ministerial wording in activity");
    }
  }
  return fails;
}

function variantIndex(week, dayInWeek, n) {
  const w = Math.max(1, week | 0);
  const d = Math.min(5, Math.max(1, dayInWeek | 0));
  return ((w - 1) * 5 + (d - 1)) % n;
}

function tplMat(kind, mode, ctx) {
  const topic = ctx.topic;
  const items = matConcreteSet(ctx.planDay ?? 1).join(" ");
  const packs = {
    spatialOrientation: {
      directo: {
        canDo: "leer un croquis y seguir 4 instrucciones con palabras de posición",
        minutes: 18,
        activities: [
          `Dibuja un croquis de tu cuarto y marca norte, puerta y ventana; escribe 4 instrucciones para ir de la puerta a la ventana usando arriba/abajo, izquierda/derecha y delante/detrás.`,
          `Intercambia con un adulto: sigue sus instrucciones en el croquis y corrige si algo no cuadra.`,
        ],
      },
      apalancado: {
        canDo: "orientarte en el espacio con un mapa sencillo y vocabulario preciso",
        minutes: 20,
        activities: [
          `Haz un mapa de una habitación con 5 objetos etiquetados; escribe 4 órdenes para llegar de un objeto a otro.`,
          `Explica en 2 oraciones por qué elegiste cada punto de referencia.`,
        ],
      },
      fragmentado: {
        canDo: "usar 3 puntos de referencia en un croquis del barrio o casa",
        minutes: 18,
        activities: [
          `Elige solo 3 lugares (casa, colegio, plaza) en un croquis; etiquétalos y escribe una frase por cada uno diciendo dónde está respecto a otro.`,
          `Señala en el dibujo norte aproximado y una ruta de 2 pasos entre dos lugares.`,
        ],
      },
    },
    geometry: {
      directo: {
        canDo: "trazar rectas y puntos o clasificar figuras con vocabulario de geometría",
        minutes: 18,
        activities: [
          `En cuadrícula, traza 3 rectas y marca 5 puntos; etiqueta rectas paralelas o perpendiculares si las hay.`,
          `Escribe 2 oraciones: «Una recta es…» y «Un punto es…» con tus palabras del cuaderno.`,
        ],
      },
      apalancado: {
        canDo: "diferenciar rectas y puntos en un dibujo etiquetado",
        minutes: 20,
        activities: [
          `Dibuja un plano simple; marca 4 puntos y 2 rectas; explica en 3 frases qué diferencia recta de punto.`,
          `Busca en casa 2 objetos con bordes rectos; dibuja y nombra.`,
        ],
      },
      fragmentado: {
        canDo: "mostrar en un dibujo una recta y un punto con etiquetas",
        minutes: 15,
        activities: [
          `Un solo dibujo: 1 recta y 3 puntos etiquetados sobre ${topic}.`,
          `1 frase comparando recta y punto.`,
        ],
      },
    },
    geometryCircles: {
      directo: {
        canDo: "dibujar un círculo y una circunferencia y explicar la diferencia",
        minutes: 18,
        activities: [
          `Dibuja un círculo sombreado y una circunferencia (solo el borde); etiqueta cada uno.`,
          `2 oraciones: «El círculo es…» y «La circunferencia es…» con un ejemplo del cuaderno.`,
        ],
      },
      apalancado: {
        canDo: "comparar círculo y circunferencia en objetos de la casa",
        minutes: 20,
        activities: [
          `Busca 2 objetos (plato, aro, moneda); marca si ves círculo relleno o solo borde.`,
          `Tabla: objeto → círculo o circunferencia → por qué.`,
        ],
      },
      fragmentado: {
        canDo: "mostrar un dibujo de círculo y otro de circunferencia",
        minutes: 15,
        activities: [
          `Dos dibujos etiquetados en el cuaderno.`,
          `1 frase comparando ambos.`,
        ],
      },
    },
    geometryShapes: {
      directo: {
        canDo: "clasificar figuras por lados y vértices y nombrarlas con precisión",
        minutes: 18,
        activities: [
          `Recorta o dibuja 6 figuras; ordena en tabla: nombre, número de lados, número de vértices.`,
          `Elige 2 figuras y explica en una oración qué las hace diferentes.`,
        ],
      },
      apalancado: {
        canDo: "describir polígonos con lados paralelos o iguales",
        minutes: 20,
        activities: [
          `Dibuja 4 polígonos distintos; subraya lados paralelos si los hay y cuenta vértices.`,
          `Escribe 3 oraciones: «Esta figura tiene… porque…».`,
        ],
      },
      fragmentado: {
        canDo: "identificar 4 figuras del entorno y contar sus lados",
        minutes: 15,
        activities: [
          `Busca 4 objetos en casa con forma de polígono; anota nombre del objeto, figura y lados.`,
          `Dibuja la figura más parecida y etiqueta lados y vértices.`,
        ],
      },
    },
    placeValue: {
      directo: {
        canDo: "leer, escribir y descomponer números hasta 10 000",
        minutes: 20,
        activities: [
          `Escribe 5 números del tema en cifras y palabras; descompón cada uno en UM, C, D y U.`,
          `Compara 2 números con > o < y explica en una frase cuál es mayor.`,
        ],
      },
      apalancado: {
        canDo: "usar valor posicional en un problema de dos pasos",
        minutes: 20,
        activities: [
          `Arma un cartel con un número de 4 cifras en bloques UM-C-D-U; escribe el número de 3 formas.`,
          `Inventa un problema de compra con ese número y resuélvelo en 2 pasos.`,
        ],
      },
      fragmentado: {
        canDo: "descomponer un número de 4 cifras en unidades, decenas, centenas y miles",
        minutes: 15,
        activities: [
          `Elige un solo número relacionado con ${topic}; descomponlo y dibuja bloques.`,
          `Escribe una frase: «Mi número es mayor/menor que… porque…».`,
        ],
      },
    },
    operations: {
      directo: {
        canDo: "resolver 4 ítems y explicar un procedimiento en el cuaderno",
        minutes: 20,
        activities: [
          `Resuelve en el cuaderno: ${items}. Muestra el procedimiento en al menos 2.`,
          `Elige 1 resultado y explica con palabras por qué tiene sentido.`,
        ],
      },
      apalancado: {
        canDo: "plantear y resolver 2 problemas contextualizados",
        minutes: 20,
        activities: [
          `Inventa 2 problemas de la vida diaria sobre ${topic}; resuélvelos y etiqueta datos y operación.`,
          `Compara las dos respuestas: ¿cuál necesitó más pasos? Una oración.`,
        ],
      },
      fragmentado: {
        canDo: "resolver 3 ítems cortos del aprendizaje de hoy",
        minutes: 18,
        activities: [
          `Haz 3 cálculos o problemas cortos ligados a ${topic}; no hace falta cubrir todo el listado del plan.`,
          `Subraya la operación principal en cada ítem.`,
        ],
      },
    },
    measurement: {
      directo: {
        canDo: "medir, registrar y comparar dos longitudes con unidades",
        minutes: 18,
        activities: [
          `Mide 4 objetos con regla o cinta; tabla: objeto, medida, unidad.`,
          `Compara dos medidas: ¿cuánto más largo es uno? Escribe la resta.`,
        ],
      },
      apalancado: {
        canDo: "estimar y luego medir con explicación",
        minutes: 20,
        activities: [
          `Estima 3 longitudes antes de medir; anota estimación y medida real.`,
          `Explica en 2 oraciones cuándo te equivocaste más y por qué.`,
        ],
      },
      fragmentado: {
        canDo: "medir 3 objetos y ordenarlos de menor a mayor",
        minutes: 15,
        activities: [
          `Mide solo 3 objetos de ${topic}; ordénalos y dibuja una recta numérica simple.`,
          `Escribe una frase comparando el más grande y el más pequeño.`,
        ],
      },
    },
    data: {
      directo: {
        canDo: "armar un pictograma o barras con 4 datos y leerlo",
        minutes: 18,
        activities: [
          `Encuesta a 4 personas: «¿Cuál es tu fruta favorita?»; registra y haz barras o pictograma.`,
          `Escribe 2 preguntas que se respondan mirando tu gráfico.`,
        ],
      },
      apalancado: {
        canDo: "interpretar un gráfico y sacar una conclusión",
        minutes: 20,
        activities: [
          `Dibuja un gráfico de barras con datos inventados pero realistas de ${topic}.`,
          `Escribe 2 oraciones: «Yo pienso que… porque el gráfico muestra…».`,
        ],
      },
      fragmentado: {
        canDo: "registrar 4 datos y hacer una pregunta sobre ellos",
        minutes: 15,
        activities: [
          `Anota 4 datos simples del tema; no necesitas encuesta grande.`,
          `Formula 1 pregunta y respóndela con tus datos.`,
        ],
      },
    },
    money: {
      directo: {
        canDo: "calcular un total y un vuelto con bolívares",
        minutes: 18,
        activities: [
          `3 precios de ${topic}; suma el total y simula pago con billetes/monedas de juguete.`,
          `Un problema de vuelto en 2 pasos; muestra cuentas.`,
        ],
      },
      apalancado: {
        canDo: "resolver 2 situaciones de compra con explicación",
        minutes: 20,
        activities: [
          `Inventa 2 tickets de compra; calcula total y vuelto en cada uno.`,
          `Explica qué monedas usarías para pagar exacto.`,
        ],
      },
      fragmentado: {
        canDo: "calcular el total de 2 artículos y el vuelto",
        minutes: 15,
        activities: [
          `Solo 2 artículos hoy; suma y calcula vuelto si pagas con un billete redondo.`,
          `Dibuja las monedas que recibes de vuelto.`,
        ],
      },
    },
    fractions: {
      directo: {
        canDo: "representar fracciones unitarias con dibujos y palabras",
        minutes: 18,
        activities: [
          `Dibuja 4 rectángulos; sombrea fracciones unitarias de ${topic} y escribe ½, ⅓, etc.`,
          `Compara dos fracciones: ¿cuál es mayor? Una oración con «porque».`,
        ],
      },
      apalancado: {
        canDo: "explicar fracciones en una situación real",
        minutes: 20,
        activities: [
          `Parte una fruta o dibuja una pizza en 4; escribe 3 oraciones sobre partes iguales.`,
          `Resuelve 2 ítems cortos de fracciones del tema.`,
        ],
      },
      fragmentado: {
        canDo: "mostrar una fracción unitaria en un dibujo etiquetado",
        minutes: 15,
        activities: [
          `Un solo dibujo dividido en partes iguales; etiqueta numerador y denominador.`,
          `Escribe una frase: «La fracción ___ significa…».`,
        ],
      },
    },
    default: {
      directo: {
        canDo: "practicar el contenido de hoy con procedimiento escrito",
        minutes: 18,
        activities: [
          `Resuelve: ${items}. Si no aplica, haz 4 ítems cortos del cuaderno del día.`,
          `Explica en 2 oraciones qué estrategia usaste.`,
        ],
      },
      apalancado: {
        canDo: "subir el reto con problemas y explicación escrita",
        minutes: 20,
        activities: [
          `2 problemas de 2 pasos sobre ${topic}; resuelve y justifica.`,
          `Escribe 3 oraciones completas resumiendo lo que practicaste.`,
        ],
      },
      fragmentado: {
        canDo: "lograr una meta concreta del aprendizaje de hoy",
        minutes: 15,
        activities: [
          `Elige 1 idea central de ${topic}; haz 3 ejercicios cortos solo de esa idea.`,
          `Cierra con «Hoy pude…» en una oración medible.`,
        ],
      },
    },
  };
  const resolvedKind = packs[kind] ? kind : kind === "spatial" ? "spatialOrientation" : kind;
  const k = packs[resolvedKind] ?? packs.default;
  const m = k[mode] ?? k.directo;
  return { ...m, kind: resolvedKind, mode };
}

function tplLen(kind, mode, ctx) {
  const topic = ctx.topic;
  const base = {
    map: {
      directo: {
        canDo: "localizar y etiquetar información en un mapa o esquema",
        minutes: 18,
        activities: [
          `Dibuja o usa un mapa del tema; etiqueta 5 lugares y escribe 2 frases de ubicación.`,
          `Haz 3 preguntas «¿dónde está…?» y respóndelas con el mapa.`,
        ],
      },
      apalancado: {
        canDo: "describir rutas y posiciones con vocabulario del texto",
        minutes: 20,
        activities: [
          `Mapa con 6 etiquetas; escribe 4 instrucciones para ir de A a B.`,
          `Párrafo de 4 líneas describiendo un recorrido.`,
        ],
      },
      fragmentado: {
        canDo: "etiquetar 4 puntos clave en un mapa del tema",
        minutes: 15,
        activities: [
          `Solo 4 etiquetas hoy en un mapa de ${topic}.`,
          `Una lista: lugar → dirección en una frase.`,
        ],
      },
    },
    readingNotes: {
      directo: {
        canDo: "leer un párrafo y anotar ideas clave en oraciones propias",
        minutes: 18,
        activities: [
          `Lee un párrafo corto con un adulto; anota 3 ideas clave en lista.`,
          `Escribe 4 oraciones completas usando esas ideas (no copies el texto).`,
        ],
      },
      apalancado: {
        canDo: "resumir un texto en 6 líneas con vocabulario preciso",
        minutes: 20,
        activities: [
          `Lee un texto informativo; subraya 5 palabras importantes.`,
          `Resumen de 6 líneas con tus palabras y las 5 palabras.`,
        ],
      },
      fragmentado: {
        canDo: "anotar 3 ideas de un texto leído",
        minutes: 15,
        activities: [
          `Un párrafo corto; 3 ideas en viñetas.`,
          `1 oración: «Lo más importante fue…».`,
        ],
      },
    },
    orthography: {
      directo: {
        canDo: "usar r y rr correctamente en palabras y oraciones",
        minutes: 18,
        activities: [
          `Tabla: 6 palabras con r al inicio/medio y 6 con rr (ej. carro/caro, perro/pero); escribe cada par.`,
          `6 oraciones propias que usen 6 palabras de tu tabla.`,
        ],
      },
      apalancado: {
        canDo: "explicar un cambio de significado con r/rr",
        minutes: 20,
        activities: [
          `10 palabras del dictado del adulto; marca r vs rr.`,
          `Párrafo de 5 líneas usando 8 palabras sin errores.`,
        ],
      },
      fragmentado: {
        canDo: "escribir 6 palabras con r o rr sin confundirlas",
        minutes: 15,
        activities: [
          `Solo 6 palabras hoy; corrige con un adulto.`,
          `2 oraciones con la palabra más difícil.`,
        ],
      },
    },
    onomatopoeia: {
      directo: {
        canDo: "usar 4 onomatopeyas en oraciones descriptivas",
        minutes: 18,
        activities: [
          `Lista 4 sonidos (animal, motor, naturaleza, hogar) y escribe su onomatopeya.`,
          `4 oraciones que incluyan cada onomatopeya; lee en voz alta.`,
        ],
      },
      apalancado: {
        canDo: "escribir un mini-poema con onomatopeyas",
        minutes: 20,
        activities: [
          `Mini-poema de 6 versos con al menos 4 onomatopeyas distintas.`,
          `Dibuja qué escena representa tu poema.`,
        ],
      },
      fragmentado: {
        canDo: "inventar 3 onomatopeyas en frases",
        minutes: 15,
        activities: [
          `3 sonidos y 3 oraciones.`,
          `¿Cuál sonido es más fuerte? 1 frase con «porque».`,
        ],
      },
    },
    signs: {
      directo: {
        canDo: "dibujar 4 señales y explicar su significado",
        minutes: 18,
        activities: [
          `Dibuja 4 señales de tránsito o seguridad; debajo escribe qué significa cada una.`,
          `Ordena las señales de más a menos importante para caminar seguro.`,
        ],
      },
      apalancado: {
        canDo: "crear un cartel de señales para tu cuadra",
        minutes: 20,
        activities: [
          `Cartel con 5 señales dibujadas y etiquetadas.`,
          `Explica a un adulto 2 señales con «porque debemos obedecerla».`,
        ],
      },
      fragmentado: {
        canDo: "mostrar 3 señales con significado escrito",
        minutes: 15,
        activities: [
          `3 señales en el cuaderno con significado.`,
          `1 frase: «La señal que más veo es…».`,
        ],
      },
    },
    review: {
      directo: {
        canDo: "escribir una reseña corta de 6–8 líneas",
        minutes: 20,
        activities: [
          `Reseña: título, de qué trata, parte que más te gustó y por qué (6–8 líneas).`,
          `Ilustra la escena favorita en un dibujo pequeño.`,
        ],
      },
      apalancado: {
        canDo: "opinar con 2 razones sobre un texto",
        minutes: 20,
        activities: [
          `Reseña de 8 líneas + 2 razones con «porque».`,
          `Pregunta al adulto si está de acuerdo; anota su idea en 1 frase.`,
        ],
      },
      fragmentado: {
        canDo: "escribir 5 líneas de opinión sobre un texto",
        minutes: 15,
        activities: [
          `5 líneas: título, idea y opinión.`,
          `1 estrella de 1 a 5 y por qué.`,
        ],
      },
    },
    dictation: {
      directo: {
        canDo: "escribir un dictado con ortografía revisada",
        minutes: 18,
        activities: [
          `Dictado: el adulto lee 8 palabras (tema del día); corrige y copia la versión final.`,
          `Elige 3 palabras y úsalas en oraciones propias.`,
        ],
      },
      apalancado: {
        canDo: "dictado, corrección y párrafo corto",
        minutes: 20,
        activities: [
          `Dictado de 10 palabras; corrige y escribe un párrafo de 5 líneas usando 5 de ellas.`,
          `Subraya las palabras del tema en tu párrafo.`,
        ],
      },
      fragmentado: {
        canDo: "escribir 6 palabras del tema sin errores",
        minutes: 15,
        activities: [
          `Solo 6 palabras en dictado hoy de ${topic}.`,
          `2 oraciones con las 2 palabras más difíciles.`,
        ],
      },
    },
    argument: {
      directo: {
        canDo: "dar 2 razones con «porque» sobre el tema",
        minutes: 18,
        activities: [
          `Escribe: «Yo pienso que…» y 2 razones con «porque» sobre ${topic}.`,
          `Lee en voz alta y ajusta si falta una razón.`,
        ],
      },
      apalancado: {
        canDo: "argumentar con 2 razones y un contraejemplo breve",
        minutes: 20,
        activities: [
          `Opinión + 2 razones + «Alguien podría pensar… pero…».`,
          `Cierra con una pregunta para la familia.`,
        ],
      },
      fragmentado: {
        canDo: "expresar una opinión con una razón clara",
        minutes: 15,
        activities: [
          `Una opinión y una razón sobre ${topic}.`,
          `Dibuja un ícono que apoye tu idea.`,
        ],
      },
    },
    narrative: {
      directo: {
        canDo: "escribir un párrafo narrativo de 6 líneas",
        minutes: 20,
        activities: [
          `Lee un texto corto del tema; escribe un final alternativo de 6 líneas.`,
          `Subraya verbo y sustantivo en 3 oraciones.`,
        ],
      },
      apalancado: {
        canDo: "narrar con inicio, nudo y desenlace breve",
        minutes: 20,
        activities: [
          `Cuento de 8 líneas ligado a ${topic}; marca inicio, nudo y final.`,
          `Lee a un adulto y responde 1 pregunta de comprensión.`,
        ],
      },
      fragmentado: {
        canDo: "escribir 5 oraciones de un relato del tema",
        minutes: 18,
        activities: [
          `5 oraciones solamente; personaje y problema claros sobre ${topic}.`,
          `Título creativo en una línea.`,
        ],
      },
    },
    default: {
      directo: {
        canDo: "leer y escribir con oraciones completas sobre el tema",
        minutes: 18,
        activities: [
          `Lee un texto corto con un adulto; anota 3 ideas y escribe 4 oraciones con ellas.`,
          `Lista 5 palabras clave del texto y úsalas en 2 frases nuevas.`,
        ],
      },
      apalancado: {
        canDo: "producir un párrafo informativo de 6–8 líneas",
        minutes: 20,
        activities: [
          `Párrafo informativo de 6 líneas sobre ${topic}; revisa mayúsculas y puntos.`,
          `Haz 1 pregunta al adulto y anota su respuesta en 2 frases.`,
        ],
      },
      fragmentado: {
        canDo: "resumir la idea central en 4 oraciones",
        minutes: 15,
        activities: [
          `4 oraciones que expliquen la idea central de ${topic}; no todo el listado del plan.`,
          `Dibuja un ícono que represente la idea.`,
        ],
      },
    },
  };
  const k = base[kind] ?? base.default;
  const m = k[mode] ?? k.directo;
  return { ...m, kind, mode };
}

function tplCie(kind, mode, ctx) {
  const topic = ctx.topic;
  const base = {
    mixture: {
      directo: {
        canDo: "probar 3 mezclas seguras y registrar qué pasa",
        minutes: 18,
        activities: [
          `3 mezclas con agua, sal, aceite o azúcar (con adulto); tabla: materiales, qué observé.`,
          `Clasifica: ¿se disuelve o no? Una frase con evidencia.`,
        ],
      },
      apalancado: {
        canDo: "comparar mezclas y explicar con vocabulario del tema",
        minutes: 20,
        activities: [
          `4 ensayos cortos; escribe hipótesis antes y resultado después.`,
          `Párrafo de 3 líneas: «La mezcla ___ porque…».`,
        ],
      },
      fragmentado: {
        canDo: "hacer 2 mezclas y anotar resultados",
        minutes: 15,
        activities: [
          `Solo 2 mezclas hoy de ${topic}; dibujo + 1 frase cada una.`,
          `¿Cuál fue diferente? Compara en una oración.`,
        ],
      },
    },
    plants: {
      directo: {
        canDo: "observar una planta y registrar partes y función",
        minutes: 18,
        activities: [
          `Observa una planta 10 min; dibujo etiquetado (raíz, tallo, hoja).`,
          `2 frases: qué necesita para vivir según ${topic}.`,
        ],
      },
      apalancado: {
        canDo: "comparar dos plantas con tabla de evidencias",
        minutes: 20,
        activities: [
          `Tabla de 2 plantas: tamaño, hojas, lugar; conclusión de 2 líneas.`,
          `Pregunta «¿por qué?» y respuesta con lo observado.`,
        ],
      },
      fragmentado: {
        canDo: "dibujar una planta y anotar 3 datos observados",
        minutes: 15,
        activities: [
          `Una planta hoy; 3 datos en lista.`,
          `1 inferencia: «Creo que… porque vi…».`,
        ],
      },
    },
    forces: {
      directo: {
        canDo: "registrar 3 caídas o empujes y describir la dirección",
        minutes: 18,
        activities: [
          `3 pruebas seguras de caída o rodar; anota altura y qué pasó.`,
          `Frase: «La fuerza de gravedad hace que…».`,
        ],
      },
      apalancado: {
        canDo: "comparar dos objetos: ¿cuál cayó más rápido? ¿por qué?",
        minutes: 20,
        activities: [
          `Experimento con 2 objetos; tabla y conclusión con «porque».`,
          `Dibuja flechas de dirección de la fuerza.`,
        ],
      },
      fragmentado: {
        canDo: "observar una caída y escribir hipótesis y resultado",
        minutes: 12,
        activities: [
          `1 sola prueba de ${topic}; hipótesis + resultado.`,
          `Dibujo con etiquetas.`,
        ],
      },
    },
    biodiversity: {
      directo: {
        canDo: "listar 5 seres vivos locales y su hábitat",
        minutes: 18,
        activities: [
          `Camina o mira por la ventana; lista 5 seres y hábitat.`,
          `¿Cuál depende de otro? Una frase causa-efecto.`,
        ],
      },
      apalancado: {
        canDo: "clasificar evidencia local con criterio",
        minutes: 20,
        activities: [
          `Fotos o dibujos de 6 organismos; clasifica en 2 grupos y justifica.`,
          `Escribe 3 oraciones sobre biodiversidad en tu zona.`,
        ],
      },
      fragmentado: {
        canDo: "registrar 4 ejemplos de vida en tu entorno",
        minutes: 15,
        activities: [
          `4 ejemplos solamente de ${topic}.`,
          `1 acción para cuidarlos en una frase.`,
        ],
      },
    },
    climate: {
      directo: {
        canDo: "nombrar 2 efectos del clima local y 1 acción de cuidado",
        minutes: 18,
        activities: [
          `Observa el clima de hoy y de ayer; anota 2 efectos (lluvia, calor, viento) en tu cuaderno.`,
          `1 acción concreta para cuidar el ambiente (basura, agua, plantas) y 1 frase «porque».`,
        ],
      },
      apalancado: {
        canDo: "comparar dos días y explicar un cambio con evidencia",
        minutes: 20,
        activities: [
          `Tabla 2 días: clima, qué pasó afuera, cómo te afectó.`,
          `Párrafo de 4 líneas: «El clima cambió… porque vi…».`,
        ],
      },
      fragmentado: {
        canDo: "registrar 1 efecto del clima y 1 cuidado",
        minutes: 15,
        activities: [
          `1 efecto observable hoy; dibujo con etiqueta.`,
          `1 frase de cuidado para tu casa o barrio.`,
        ],
      },
    },
    nutrition: {
      directo: {
        canDo: "clasificar alimentos en grupos y elegir una comida equilibrada",
        minutes: 18,
        activities: [
          `Dibuja o lista 8 alimentos de tu cocina; clasifica en 3 grupos (energía, construcción, protección).`,
          `Marca con ✓ una merienda saludable y explica en 2 frases.`,
        ],
      },
      apalancado: {
        canDo: "armar un plato equilibrado y justificarlo",
        minutes: 20,
        activities: [
          `Dibuja un plato con 4 grupos representados; etiqueta.`,
          `«Yo pienso que es saludable porque…» — 2 razones.`,
        ],
      },
      fragmentado: {
        canDo: "nombrar 4 alimentos saludables y 2 a limitar",
        minutes: 15,
        activities: [
          `Lista 4 + 2 con una palabra de por qué.`,
          `Dibujo de un plato sencillo.`,
        ],
      },
    },
    conservation: {
      directo: {
        canDo: "elegir 3 acciones de cuidado y realizar 1 hoy",
        minutes: 18,
        activities: [
          `Lista 3 acciones concretas (agua, basura, plantas o animales); haz 1 hoy y anótala.`,
          `Escribe 2 oraciones: qué hiciste y por qué ayuda al ambiente.`,
        ],
      },
      apalancado: {
        canDo: "diseñar un mini-proyecto de conservación con pasos",
        minutes: 20,
        activities: [
          `Cartel de 4 pasos para ahorrar agua o proteger un hábitat; dibuja y explica.`,
          `Pregunta a un adulto qué hace la familia por el ambiente; anota 3 respuestas.`,
        ],
      },
      fragmentado: {
        canDo: "comprometerse con 1 acción de cuidado ambiental",
        minutes: 15,
        activities: [
          `1 acción hoy (cerrar llave, no botar basura, plantar semilla); regístrala con foto o dibujo.`,
          `1 frase: «Yo puedo cuidar… porque…».`,
        ],
      },
    },
    water: {
      directo: {
        canDo: "explicar por qué el agua es vital con evidencia de observación",
        minutes: 18,
        activities: [
          `Observa cómo usas el agua en casa hoy; anota 4 usos en lista.`,
          `Escribe 2 oraciones: «Los seres vivos necesitan agua porque…» con un ejemplo que viste.`,
        ],
      },
      apalancado: {
        canDo: "comparar dos usos del agua y registrar datos",
        minutes: 20,
        activities: [
          `Mide 2 recipientes con agua (vasos); tabla: uso, cantidad aproximada, para qué sirve.`,
          `Conclusión de 3 líneas sobre ${topic}.`,
        ],
      },
      fragmentado: {
        canDo: "nombrar 3 formas en que el agua ayuda a los seres vivos",
        minutes: 15,
        activities: [
          `3 viñetas con ejemplos de plantas o animales y agua.`,
          `Dibujo de un ciclo simple agua → planta → animal (etiquetas).`,
        ],
      },
    },
    observation: {
      directo: {
        canDo: "observar, registrar y comparar con una tabla",
        minutes: 18,
        activities: [
          `Observa 15 min algo de ${topic}; tabla con 3 filas de datos.`,
          `Compara 2 filas: similitud y diferencia.`,
        ],
      },
      apalancado: {
        canDo: "inferir con evidencia de tu registro",
        minutes: 20,
        activities: [
          `Bitácora con dibujo + datos; hipótesis de 1 frase.`,
          `Responde «¿qué pasaría si…?» con 2 líneas.`,
        ],
      },
      fragmentado: {
        canDo: "anotar 3 observaciones y una conclusión",
        minutes: 15,
        activities: [
          `3 observaciones de ${topic}; no hace falta cubrir todo el plan.`,
          `Conclusión: «Observé que…».`,
        ],
      },
    },
  };
  const k = base[kind] ?? base.observation;
  const m = k[mode] ?? k.directo;
  return { ...m, kind, mode };
}

function tplIde(kind, mode, ctx) {
  const topic = ctx.topic;
  const title = ctx.ideTitle || topic;
  const base = {
    normsTeam: {
      directo: {
        canDo: "listar 5 normas de convivencia y cumplir un rol en equipo",
        minutes: 18,
        activities: [
          `Con un adulto, lista 5 normas para convivir en casa o salón; escríbelas en cartel.`,
          `Tarea compartida 10 min (ordenar, cocinar, juego): elige tu rol y cuéntalo en 3 frases.`,
        ],
      },
      apalancado: {
        canDo: "resolver un conflicto con normas y roles claros",
        minutes: 20,
        activities: [
          `Dramatiza un problema en el patio; escribe solución con 2 normas y 2 roles.`,
          `«Yo pienso que el equipo funciona si…» — 2 razones.`,
        ],
      },
      fragmentado: {
        canDo: "nombrar 3 normas y 1 rol que cumpliste hoy",
        minutes: 15,
        activities: [
          `3 normas en lista; marca la que practicaste hoy.`,
          `1 frase: «Mi rol fue… y ayudó porque…».`,
        ],
      },
    },
    familyNeeds: {
      directo: {
        canDo: "nombrar 4 necesidades básicas de tu familia",
        minutes: 18,
        activities: [
          `Lista: comida, techo, cuidado/afecto, escuela (u otras); dibuja un ícono por cada una.`,
          `2 frases: «En mi casa cubrimos ___ cuando…».`,
        ],
      },
      apalancado: {
        canDo: "comparar necesidades de dos familias ficticias",
        minutes: 20,
        activities: [
          `Tabla 2 familias de cuento: necesidad → cómo la cubren.`,
          `Párrafo: qué necesidad es igual para todos los niños.`,
        ],
      },
      fragmentado: {
        canDo: "explicar 3 necesidades con ejemplos de tu casa",
        minutes: 15,
        activities: [
          `3 necesidades con ejemplo real; sin listas adultas complicadas.`,
          `Dibujo de tu familia cuidándose.`,
        ],
      },
    },
    historyMilestones: {
      directo: {
        canDo: "anotar 3 hitos históricos con fecha o lugar",
        minutes: 18,
        activities: [
          `Lee con un adulto sobre ${topic}; 3 hitos en línea de tiempo (fecha o siglo + hecho).`,
          `Dibuja un símbolo por hito (petróleo, independencia, etc. si aplica).`,
        ],
      },
      apalancado: {
        canDo: "relacionar un hito con Venezuela hoy",
        minutes: 20,
        activities: [
          `4 hitos en tabla: hecho → consecuencia para el país.`,
          `1 frase: «Esto me importa porque…».`,
        ],
      },
      fragmentado: {
        canDo: "quedarte con 3 hitos del tema de hoy",
        minutes: 15,
        activities: [
          `Solo 3 hitos (no toda la lista del plan); viñetas con año o lugar.`,
          `Mapa o dibujo con 3 etiquetas.`,
        ],
      },
    },
    mapPlaces: {
      directo: {
        canDo: "ubicar en un mapa 4 lugares del aprendizaje",
        minutes: 18,
        activities: [
          `Mapa de Venezuela; etiqueta 4 lugares del tema del día.`,
          `2 frases: «___ está al ___ de ___».`,
        ],
      },
      apalancado: {
        canDo: "explicar rutas y lugares con un mapa etiquetado",
        minutes: 20,
        activities: [
          `Mapa con 6 etiquetas; 3 datos por lugar en lista corta.`,
          `Conecta un lugar con tu comunidad en 2 oraciones.`,
        ],
      },
      fragmentado: {
        canDo: "señalar 3 lugares clave en un mapa",
        minutes: 15,
        activities: [
          `Solo 3 etiquetas hoy en el mapa.`,
          `Línea de tiempo de 3 fechas si el tema es histórico.`,
        ],
      },
    },
    map: {
      directo: {
        canDo: "ubicar en un mapa 4 lugares del aprendizaje",
        minutes: 18,
        activities: [
          `Mapa de Venezuela o región de ${title}; etiqueta 4 lugares del tema.`,
          `2 frases: «___ está al ___ de ___».`,
        ],
      },
      apalancado: {
        canDo: "explicar rutas y capitales con un mapa etiquetado",
        minutes: 20,
        activities: [
          `Mapa con 6 etiquetas; escribe 3 datos que aprendiste de cada una (lista corta).`,
          `Conecta un lugar con tu comunidad en 2 oraciones.`,
        ],
      },
      fragmentado: {
        canDo: "señalar 3 lugares clave en un mapa",
        minutes: 15,
        activities: [
          `Solo 3 etiquetas hoy de ${title}.`,
          `Línea de tiempo de 3 fechas si el tema es histórico.`,
        ],
      },
    },
    biography: {
      directo: {
        canDo: "escribir 4 hechos de una biografía con fechas o lugares",
        minutes: 18,
        activities: [
          `Lee con un adulto sobre el tema; 4 hechos en viñetas (quién, cuándo, qué hizo).`,
          `Dibuja un retrato simple y pie de foto de 1 línea.`,
        ],
      },
      apalancado: {
        canDo: "relatar una vida en 6 líneas con causa-efecto",
        minutes: 20,
        activities: [
          `Mini biografía de 6 líneas; subraya un logro y su consecuencia.`,
          `Pregunta al adulto: «¿qué valor muestra?» — 1 frase.`,
        ],
      },
      fragmentado: {
        canDo: "anotar 3 hitos de la persona o época",
        minutes: 15,
        activities: [
          `3 hitos del tema de hoy; no toda la lista del plan.`,
          `Dibujo o símbolo por cada hito.`,
        ],
      },
    },
    community: {
      directo: {
        canDo: "dibujar un plano de tu comunidad con 5 lugares",
        minutes: 18,
        activities: [
          `Plano simple: casa, colegio, plaza, iglesia, tienda (los que existan).`,
          `Escribe cómo cada lugar ayuda a la convivencia (1 frase cada uno).`,
        ],
      },
      apalancado: {
        canDo: "comparar tu barrio con otro lugar de Venezuela",
        minutes: 20,
        activities: [
          `Tabla: mi barrio / otro lugar — 3 filas.`,
          `Párrafo de 4 líneas: qué compartimos como venezolanos.`,
        ],
      },
      fragmentado: {
        canDo: "nombrar 4 servicios de tu comunidad",
        minutes: 15,
        activities: [
          `Lista 4 servicios y dibuja 1; frase de para qué sirve.`,
          `¿Cuál visitaste esta semana? 1 oración.`,
        ],
      },
    },
    culture: {
      directo: {
        canDo: "registrar 3 hechos culturales y una conexión personal",
        minutes: 18,
        activities: [
          `3 hechos de ${title} (comida, música o fiesta); viñetas.`,
          `«En mi casa nosotros…» — 2 frases.`,
        ],
      },
      apalancado: {
        canDo: "comparar dos manifestaciones culturales",
        minutes: 20,
        activities: [
          `Elige 2 manifestaciones; tabla similitud/diferencia.`,
          `Dibuja un elemento (instrumento, plato) y etiqueta.`,
        ],
      },
      fragmentado: {
        canDo: "explicar 1 tradición con 3 detalles",
        minutes: 15,
        activities: [
          `1 tradición de ${title}; 3 detalles en oraciones.`,
          `Dibujo con leyenda.`,
        ],
      },
    },
    rights: {
      directo: {
        canDo: "dar 3 ejemplos de derechos y deberes en la escuela",
        minutes: 18,
        activities: [
          `Solo si el tema lo pide: 3 derechos y 3 deberes en tu salón; ejemplos reales.`,
          `Dramatiza 1 situación en 4 frases.`,
        ],
      },
      apalancado: {
        canDo: "resolver un conflicto ficticio con respeto",
        minutes: 20,
        activities: [
          `Caso corto en el patio; escribe solución en 5 líneas.`,
          `«Yo pienso que debemos… porque…».`,
        ],
      },
      fragmentado: {
        canDo: "nombrar 2 derechos y 2 deberes del niño",
        minutes: 15,
        activities: [
          `2 y 2 solamente; ejemplos de tu edad.`,
          `Dibujo de convivencia.`,
        ],
      },
    },
    default: {
      directo: {
        canDo: "explicar 4 hechos concretos del tema con tus palabras",
        minutes: 18,
        activities: [
          `Investiga con un adulto 4 hechos de ${title}; escríbelos en oraciones.`,
          `Conecta 1 hecho con tu vida: «Esto me importa porque…».`,
        ],
      },
      apalancado: {
        canDo: "hacer una línea de tiempo corta o tabla de 4 filas",
        minutes: 20,
        activities: [
          `Línea de tiempo de 4 eventos o tabla persona-hecho-lugar.`,
          `Lee en voz alta y responde 1 pregunta del adulto.`,
        ],
      },
      fragmentado: {
        canDo: "quedarte con 3 hechos medibles del tema de hoy",
        minutes: 15,
        activities: [
          `3 hechos solamente de ${title}.`,
          `Mapa o dibujo con 3 etiquetas.`,
        ],
      },
    },
  };
  const resolved = base[kind] ? kind : kind === "map" ? "mapPlaces" : kind;
  const k = base[resolved] ?? base.default;
  const m = k[mode] ?? k.directo;
  return { ...m, kind: resolved, mode };
}

function tplBib(ctx) {
  const v = variantIndex(ctx.week, ctx.dayInWeek, 4);
  const prompts = [
    [
      "Lee la pista más corta en voz alta; subraya 1 verbo importante.",
      "Escribe 1 pregunta de comprensión y respóndela con el texto.",
      "Aplica en 1 frase: «Hoy en casa puedo…» según la lectura.",
    ],
    [
      "Lee por turnos una pista cada persona.",
      "Anota 2 palabras nuevas y su significado.",
      "1 frase: «Lo que Dios me enseña hoy es…».",
    ],
    [
      "Lee en silencio y marca un versículo clave (8–12 versículos si es largo).",
      "Responde: ¿qué pasó? — 2 frases.",
      "1 acción concreta de respeto o ayuda en familia.",
    ],
    [
      "Elige solo NT o AT si el día es muy largo; lee una sección.",
      "Dibuja un símbolo del pasaje.",
      "Pregunta al adulto 1 duda y anota la respuesta en 1 frase.",
    ],
  ];
  const acts = prompts[v].slice(0, 2);
  if (!/casa|aplica|frase/i.test(acts.join(" "))) {
    acts[acts.length - 1] = `${acts[acts.length - 1]} Cierra con 1 frase de aplicación en familia.`;
  }
  return {
    kind: "bible",
    mode: "directo",
    canDo: "contar la idea del pasaje y aplicarla en una frase",
    minutes: 10,
    activities: acts,
  };
}

export function buildSectionPack(sectionId, input) {
  const {
    planDay,
    week,
    learning,
    learningPhrase,
    objective,
    ideTitle,
    finalizeActivity,
  } = input;
  const dayInWeek = ((planDay - 1) % 5) + 1;
  const mode = classifyMode(sectionId, learning || "", objective || "");
  const kind = classifyKind(sectionId, learning || "", objective || "");
  const topic = topicShort(learningPhrase, learning);
  const ctx = { topic, ideTitle, week, dayInWeek, planDay, learning };

  let raw;
  if (sectionId === "bib") raw = tplBib(ctx);
  else if (sectionId === "mat") raw = tplMat(kind, mode, ctx);
  else if (sectionId === "len") raw = tplLen(kind, mode, ctx);
  else if (sectionId === "cie") raw = tplCie(kind, mode, ctx);
  else if (sectionId === "ide") raw = tplIde(kind, mode, ctx);
  else raw = tplLen("default", mode, ctx);

  const ceiling = sectionId === "bib" ? MINUTES.bib : MINUTES.academic;
  const minutes = Math.min(raw.minutes ?? ceiling, ceiling);
  const canDo = raw.canDo?.startsWith("Al terminar")
    ? raw.canDo
    : `Al terminar puedes ${raw.canDo}.`;

  let activities = (raw.activities || []).slice(0, 2).map((line) => String(line).replace(/\$\{topic\}/g, topic));
  activities = sanitizeActivities(activities, learning, topic);
  activities = activities.map((t) => (finalizeActivity ? finalizeActivity(t) : t));

  const pack = {
    mode: raw.mode || mode,
    kind: raw.kind || kind,
    minutesEstimate: minutes,
    canDo,
    topicShort: topic,
    activities,
  };
  for (const f of qaHardRules(sectionId, pack, learning)) {
    if (process.env.MPPE_QA_STRICT) throw new Error(`d${planDay} ${sectionId}: ${f}`);
  }
  return pack;
}

export function rubricScoreSection(sectionId, pack) {
  const a = (pack.activities ?? []).join(" ").toLowerCase();
  let score = 0;
  const bump = (cond) => {
    if (cond) score += 1;
  };
  if (sectionId === "mat") {
    bump(/\d|número|suma|resta|medir|figura|lado|gráfico|pictograma|encuesta|fracci|bol[ií]var|cm|tabla|ejercicio|ítem|calcul|croquis|instruccion|círculo|circunferencia/i.test(a));
    bump(/problema|compara|clasifica|explica|por qué|porque|pasos|resuelve|inventa/i.test(a));
    bump(/cuaderno|dibuja|tabla|registra|procedimiento|etiqueta|muestra/i.test(a));
    bump(/lado|vértice|unidad|mayor|menor|paralel|valor|estimaci|izquierda|derecha|delante|detrás|norte|posici|longitud|regla|palmo/i.test(a));
  } else if (sectionId === "len") {
    bump(/lee|escribe|dictado|oral|párrafo|oracion|frases|texto|tabla|reseña|onomatopey|señal/i.test(a));
    bump(/oraciones|líneas|párrafo|lista|viñeta|palabras/i.test(a));
    bump(/corrige|porque|por qué|mapa|etiqueta|subraya|mayúscula|pregunta|significa|importante|seguro|gustó|título/i.test(a));
    bump(
      pack.mode === "apalancado"
        ? /párrafo|6|8|10|explica|líneas/i.test(a)
        : /frases|oraciones|escribe|lee/i.test(a),
    );
  } else if (sectionId === "cie") {
    bump(/observa|experimento|mezcla|planta|mide|prueba|ensayo|agua|camina|ventana|clima|alimento|clasifica/i.test(a));
    bump(/tabla|dibujo|anota|registro|hipótesis|datos|bitácora|lista|viñeta|grupos/i.test(a));
    bump(/compara|porque|infer|conclusi|evidencia|creo que|necesitan|saludable|equilibr/i.test(a));
    bump((pack.minutesEstimate ?? 20) <= 20 && /paso|mezcla|observa|anota|oraciones|marca|dibuja/i.test(a));
  } else if (sectionId === "ide") {
    bump(/mapa|hecho|venezuela|comunidad|biograf|línea|tabla|plano|investiga|tradici|hito|norma|rol/i.test(a));
    bump(/dibuja|escribe|etiqueta|lista|viñeta|frases|oraciones|detalles|leyenda|cartel/i.test(a));
    bump(/mi casa|mi barrio|yo |familia|nosotros|importa porque|necesidad|conviv|equipo/i.test(a));
    bump(pack.mode !== "fragmentado" || /solo|3 |4 |hoy|hitos/i.test(a));
  } else if (sectionId === "bib") {
    bump(/lee|lectura|voz|versículo|pista|turnos|silencio|subraya/i.test(a));
    bump(/pregunta|comprensión|qué pasó|responde|palabras|significado|anota/i.test(a));
    bump(/casa|familia|aplica|hoy|frase|dios|enseña|puedo/i.test(a));
    bump((pack.minutesEstimate ?? 12) <= 12);
  }
  return score;
}

export function qaSection(sectionId, pack, learning) {
  const failures = [];
  const ceiling = sectionId === "bib" ? MINUTES.bib : MINUTES.academic;
  if (!pack.canDo || !/al terminar puedes/i.test(pack.canDo)) failures.push("missing canDo");
  if ((pack.minutesEstimate ?? 0) > ceiling) failures.push("minutes over ceiling");
  if (!pack.mode) failures.push("missing mode");
  const rs = rubricScoreSection(sectionId, pack);
  if (rs < 3) failures.push(`rubric ${rs}/4`);
  failures.push(...qaHardRules(sectionId, { ...pack, kind: pack.kind }, learning));
  for (const act of pack.activities ?? []) {
    if (MINISTERIAL_START.test(act)) failures.push("ministerial verb in activity");
    if (/\w…\w/u.test(act)) failures.push("mid-word ellipsis");
    if (act.length > 120) failures.push("activity too long");
    if ((act ?? "").trim().length < 12) failures.push("activity too short");
  }
  if (sectionId !== "bib" && pack.mode === "apalancado") {
    const joined = (pack.activities ?? []).join(" ");
    const hasPush = /oracion|párrafo|explica|porque|por qué|problema|compara|hipótesis|líneas|tabla|8 |10 /i.test(joined);
    if (!hasPush) failures.push("apalancado without G3 push");
  }
  return failures;
}

export function qaDaySheet(sheet) {
  const all = [];
  for (const sec of sheet.sections ?? []) {
    const pack = {
      canDo: sec.canDo,
      mode: sec.mode,
      kind: sec.activityKind,
      minutesEstimate: sec.minutesEstimate,
      activities: sec.activities,
    };
    for (const f of qaSection(sec.id, pack, sec.learning)) {
      all.push({ planDay: sheet.planDay, section: sec.id, cause: f });
    }
  }
  return all;
}

export function qaSamplePassRate(sheets) {
  const totalActs = sheets.reduce((n, s) => n + (s.sections?.length ?? 0) * 2, 0);
  const fails = sheets.flatMap((s) => qaDaySheet(s));
  const failActs = fails.length;
  const pass = Math.max(0, 1 - failActs / Math.max(1, totalActs * 2));
  return { passRate: pass, failures: fails, totalSections: sheets.length * 5 };
}
