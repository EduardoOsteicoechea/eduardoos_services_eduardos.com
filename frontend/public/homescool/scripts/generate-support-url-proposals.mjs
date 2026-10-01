/**
 * Generates supportUrl proposals for c3·l6 cells. Run: node scripts/generate-support-url-proposals.mjs
 */
import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mediaRoot = path.join(__dirname, "..", "media");

/** @type {Record<string, { url: string, platform: string, lang: string, age: string, duration: string }>} */
const V = {
  matRap: {
    url: "https://www.youtube.com/watch?v=_UVcNBjoxs4",
    platform: "YouTube",
    lang: "en",
    age: "7–11",
    duration: "~3 min",
  },
  oils: {
    url: "https://www.youtube.com/watch?v=I6Fa5grz20c",
    platform: "YouTube",
    lang: "en",
    age: "8–12",
    duration: "~4 min",
  },
  symEduteca: {
    url: "https://www.youtube.com/watch?v=MtY-ZOwkROE",
    platform: "YouTube",
    lang: "es",
    age: "8–11",
    duration: "~3 min",
  },
  symPrim: {
    url: "https://www.youtube.com/watch?v=A-SUCAn8BUg",
    platform: "YouTube",
    lang: "es",
    age: "8–10",
    duration: "~5 min",
  },
  tissues4: {
    url: "https://www.youtube.com/watch?v=xy_XadXRHQw",
    platform: "YouTube",
    lang: "es",
    age: "12+",
    duration: "~9 min",
  },
  muscle: {
    url: "https://www.youtube.com/watch?v=gmc6QIanvD0",
    platform: "YouTube",
    lang: "es",
    age: "7–11",
    duration: "~3 min",
  },
  nervesKids: {
    url: "https://www.youtube.com/watch?v=krqempHBRAc",
    platform: "YouTube",
    lang: "es",
    age: "7–11",
    duration: "~3 min",
  },
  bonesSong: {
    url: "https://www.youtube.com/watch?v=ujAVv8xABD0",
    platform: "YouTube",
    lang: "es",
    age: "5–9",
    duration: "~3 min",
  },
  wordClasses: {
    url: "https://www.youtube.com/watch?v=A501o2l9zGk",
    platform: "YouTube",
    lang: "es",
    age: "7–11",
    duration: "~4 min",
  },
  nouns: {
    url: "https://www.youtube.com/watch?v=p0eyWoajuP8",
    platform: "YouTube",
    lang: "es",
    age: "7–10",
    duration: "~4 min",
  },
  adj: {
    url: "https://www.youtube.com/watch?v=fwR-fABQCws",
    platform: "YouTube",
    lang: "es",
    age: "7–11",
    duration: "~5 min",
  },
  prepConj: {
    url: "https://www.youtube.com/watch?v=VEgD7BOPMLk",
    platform: "YouTube",
    lang: "es",
    age: "8–11",
    duration: "~6 min",
  },
  indicTenses: {
    url: "https://www.youtube.com/watch?v=Ar_wJOw7tY8",
    platform: "YouTube",
    lang: "es",
    age: "9–12",
    duration: "~6 min",
  },
  verbPerson: {
    url: "https://www.youtube.com/watch?v=yqvey43rDj8",
    platform: "YouTube",
    lang: "es",
    age: "8–11",
    duration: "~5 min",
  },
  engVerbs: {
    url: "https://www.youtube.com/watch?v=j3EYciNco58",
    platform: "YouTube",
    lang: "en",
    age: "6–10",
    duration: "~3 min",
  },
  engTenses: {
    url: "https://www.youtube.com/watch?v=yqvey43rDj8",
    platform: "YouTube",
    lang: "es",
    age: "8–11",
    duration: "~5 min",
  },
  regionsVe: {
    url: "https://www.youtube.com/watch?v=j05_De-rdZc",
    platform: "YouTube",
    lang: "es",
    age: "9–14",
    duration: "~12 min",
  },
  geoVe: {
    url: "https://www.youtube.com/watch?v=lT4myeJST5o",
    platform: "YouTube",
    lang: "es",
    age: "10+",
    duration: "~15 min",
  },
  statesCaps: {
    url: "https://www.youtube.com/watch?v=j05_De-rdZc",
    platform: "YouTube",
    lang: "es",
    age: "9–14",
    duration: "~12 min",
  },
  hisPeoples: {
    url: "https://www.youtube.com/watch?v=oNpJSqZwGoE",
    platform: "YouTube",
    lang: "es",
    age: "7–11",
    duration: "~3 min",
  },
  colon: {
    url: "https://www.youtube.com/watch?v=VMju6kZ_gDE",
    platform: "YouTube",
    lang: "es",
    age: "7–11",
    duration: "~4 min",
  },
  colonRespect: {
    url: "https://www.youtube.com/watch?v=1Vgp46FTIAc",
    platform: "YouTube",
    lang: "es",
    age: "8–12",
    duration: "~4 min",
  },
  timeline: {
    url: "https://www.youtube.com/watch?v=9EiyoXmsT-I",
    platform: "YouTube",
    lang: "es",
    age: "8–11",
    duration: "~3 min",
  },
  mesopotamia: {
    url: "https://www.youtube.com/watch?v=Sw-SO3WTxAc",
    platform: "YouTube",
    lang: "es",
    age: "7–11",
    duration: "~6 min",
  },
  egyptKids: {
    url: "https://www.youtube.com/watch?v=oz_5vBhx_F8",
    platform: "YouTube",
    lang: "es",
    age: "7–11",
    duration: "~8 min",
  },
  thauma: {
    url: "https://www.youtube.com/watch?v=Q4imGLm1MiI",
    platform: "YouTube",
    lang: "en",
    age: "8–12",
    duration: "~2 min",
  },
  waterLens: {
    url: "https://www.youtube.com/watch?v=Q4imGLm1MiI",
    platform: "YouTube",
    lang: "en",
    age: "8–12",
    duration: "~2 min",
  },
  genesisKids: {
    url: "https://www.youtube.com/watch?v=ak06MSETeo4",
    platform: "YouTube",
    lang: "en",
    age: "8–12",
    duration: "~5 min",
  },
  creationEs: {
    url: "https://www.youtube.com/watch?v=UVou_Dmndqc",
    platform: "YouTube",
    lang: "es",
    age: "7–11",
    duration: "~5 min",
  },
  bibleBooks: {
    url: "https://www.youtube.com/watch?v=ak06MSETeo4",
    platform: "YouTube",
    lang: "en",
    age: "8–12",
    duration: "~5 min",
  },
  romansKids: {
    url: "https://www.youtube.com/watch?v=ak06MSETeo4",
    platform: "YouTube",
    lang: "en",
    age: "8–12",
    duration: "~5 min",
  },
  wayuuRespect: {
    url: "https://www.youtube.com/watch?v=1Vgp46FTIAc",
    platform: "YouTube",
    lang: "es",
    age: "8–12",
    duration: "~4 min",
  },
};

/** slot: w{week}/{subj}/d{day} -> V key or { falta, queries } */
const SLOT = {
  "w1/mat/d1": "matRap",
  "w1/mat/d2": "matRap",
  "w1/mat/d3": "matRap",
  "w1/mat/d4": "matRap",
  "w1/mat/d5": "matRap",
  "w2/mat/d1": "matRap",
  "w2/mat/d2": "matRap",
  "w2/mat/d3": "matRap",
  "w2/mat/d4": "matRap",
  "w2/mat/d5": "matRap",
  "w1/art/d1": "oils",
  "w1/art/d2": "oils",
  "w1/art/d3": "oils",
  "w1/art/d4": "oils",
  "w1/art/d5": "oils",
  "w2/art/d1": "symEduteca",
  "w2/art/d2": "symEduteca",
  "w2/art/d3": "symPrim",
  "w2/art/d4": "symPrim",
  "w2/art/d5": "symEduteca",
  "w1/cie/d1": "tissues4",
  "w1/cie/d2": "tissues4",
  "w1/cie/d3": "muscle",
  "w1/cie/d4": "nervesKids",
  "w1/cie/d5": "tissues4",
  "w2/cie/d1": "bonesSong",
  "w2/cie/d2": "bonesSong",
  "w2/cie/d3": "bonesSong",
  "w2/cie/d4": "bonesSong",
  "w2/cie/d5": "bonesSong",
  "w1/esp/d1": "wordClasses",
  "w1/esp/d2": "nouns",
  "w1/esp/d3": "adj",
  "w1/esp/d4": "prepConj",
  "w1/esp/d5": "wordClasses",
  "w2/esp/d1": "indicTenses",
  "w2/esp/d2": "verbPerson",
  "w2/esp/d3": "indicTenses",
  "w2/esp/d4": "indicTenses",
  "w2/esp/d5": "indicTenses",
  "w1/ing/d1": "engVerbs",
  "w1/ing/d2": "engVerbs",
  "w1/ing/d3": "engVerbs",
  "w1/ing/d4": "engVerbs",
  "w1/ing/d5": "engVerbs",
  "w2/ing/d1": "engTenses",
  "w2/ing/d2": "engTenses",
  "w2/ing/d3": "engTenses",
  "w2/ing/d4": "engTenses",
  "w2/ing/d5": "engTenses",
  "w1/geo/d1": "regionsVe",
  "w1/geo/d2": "geoVe",
  "w1/geo/d3": "geoVe",
  "w1/geo/d4": "regionsVe",
  "w1/geo/d5": "regionsVe",
  "w2/geo/d1": "statesCaps",
  "w2/geo/d2": "statesCaps",
  "w2/geo/d3": "statesCaps",
  "w2/geo/d4": "statesCaps",
  "w2/geo/d5": "statesCaps",
  "w1/his/d1": "hisPeoples",
  "w1/his/d2": "hisPeoples",
  "w1/his/d3": "hisPeoples",
  "w1/his/d4": "wayuuRespect",
  "w1/his/d5": "hisPeoples",
  "w2/his/d1": "colon",
  "w2/his/d2": "colon",
  "w2/his/d3": "colon",
  "w2/his/d4": "colon",
  "w2/his/d5": "colonRespect",
  "w1/LT/d1": "timeline",
  "w1/LT/d2": "timeline",
  "w1/LT/d3": "mesopotamia",
  "w1/LT/d4": "egyptKids",
  "w1/LT/d5": "timeline",
  "w2/LT/d1": "timeline",
  "w2/LT/d2": "timeline",
  "w2/LT/d3": "mesopotamia",
  "w2/LT/d4": "mesopotamia",
  "w2/LT/d5": "timeline",
  "w1/pro/d1": "thauma",
  "w1/pro/d2": "thauma",
  "w1/pro/d3": "thauma",
  "w1/pro/d4": "thauma",
  "w1/pro/d5": "thauma",
  "w2/pro/d1": "waterLens",
  "w2/pro/d2": "waterLens",
  "w2/pro/d3": "waterLens",
  "w2/pro/d4": "waterLens",
  "w2/pro/d5": "waterLens",
  "w1/teb/d1": "creationEs",
  "w1/teb/d2": "creationEs",
  "w1/teb/d3": "genesisKids",
  "w1/teb/d4": "genesisKids",
  "w1/teb/d5": "creationEs",
  "w2/teb/d1": "creationEs",
  "w2/teb/d2": "creationEs",
  "w2/teb/d3": "creationEs",
  "w2/teb/d4": "creationEs",
  "w2/teb/d5": "creationEs",
  "w1/exe/d1": "bibleBooks",
  "w1/exe/d2": "bibleBooks",
  "w1/exe/d3": "romansKids",
  "w1/exe/d4": "romansKids",
  "w1/exe/d5": "bibleBooks",
  "w2/exe/d1": "bibleBooks",
  "w2/exe/d2": "bibleBooks",
  "w2/exe/d3": "bibleBooks",
  "w2/exe/d4": "bibleBooks",
  "w2/exe/d5": "bibleBooks",
  "w1/lat/d1": {
    falta: true,
    queries: [
      "preposición in apud latín escolar niños YouTube",
      "latín preposiciones español primaria video",
    ],
  },
  "w1/lat/d2": {
    falta: true,
    queries: [
      "preposición in apud latín escolar niños YouTube",
      "latín preposiciones español primaria video",
    ],
  },
  "w1/lat/d3": {
    falta: true,
    queries: [
      "preposiciones per sine latín niños YouTube",
      "latín per sine español escuela",
    ],
  },
  "w1/lat/d4": {
    falta: true,
    queries: [
      "preposiciones a ab latín niños YouTube",
      "latín preposición de español video educativo",
    ],
  },
  "w1/lat/d5": {
    falta: true,
    queries: [
      "preposiciones latinas resumen niños YouTube",
      "latín preposiciones español primaria",
    ],
  },
  "w2/lat/d1": {
    falta: true,
    queries: [
      "conjunción et latín niños YouTube",
      "latín et ut non escolar video español",
    ],
  },
  "w2/lat/d2": {
    falta: true,
    queries: [
      "conjunción et latín niños YouTube",
      "latín et palabra y video educativo",
    ],
  },
  "w2/lat/d3": {
    falta: true,
    queries: [
      "conjunción ut latín niños YouTube",
      "latín ut para que video escolar",
    ],
  },
  "w2/lat/d4": {
    falta: true,
    queries: [
      "non latín negación niños YouTube",
      "latín non no video primaria",
    ],
  },
  "w2/lat/d5": {
    falta: true,
    queries: [
      "et ut non latín resumen niños YouTube",
      "latín conjunciones escolar español",
    ],
  },
};

function walk(d, a = []) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory() && !f.startsWith("_")) walk(p, a);
    else if (f.endsWith("l6.eoschool.json")) a.push(p);
  }
  return a;
}

function oembed(url) {
  return new Promise((res) => {
    https
      .get(
        `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
        (r) => {
          let d = "";
          r.on("data", (c) => (d += c));
          r.on("end", () => {
            try {
              const j = JSON.parse(d);
              res({ ok: true, title: j.title });
            } catch {
              res({ ok: false, title: "" });
            }
          });
        },
      )
      .on("error", () => res({ ok: false, title: "" }));
  });
}

const titleCache = new Map();
async function videoTitle(url) {
  if (titleCache.has(url)) return titleCache.get(url);
  const r = await oembed(url);
  titleCache.set(url, r);
  return r;
}

const cells = [];
for (const f of walk(mediaRoot)) {
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  if (j.cycle !== 3) continue;
  const subj = j.subject === "LT" ? "LT" : (j.subject || "").toLowerCase();
  const key = `c3-w${j.week}-d${j.day}-l6-${subj}`;
  const slot = `w${j.week}/${subj}/d${j.day}`;
  const tema = `${j.title} · ${j.lesson?.points?.[0]?.heading || ""}`.slice(0, 120);
  cells.push({
    key,
    slot,
    tema,
    locale: j.locale || "es",
    current: j.supportUrl || "",
  });
}
cells.sort((a, b) => a.key.localeCompare(b.key));

const rows = [];
const patch = {};
const missingToday = cells.filter((c) => !c.current).map((c) => c.key);

for (const c of cells) {
  const slotRef = SLOT[c.slot];
  let status = "ok";
  let why = "";
  let ytTitle = "";
  let url = "";
  let platform = "";
  let lang = "";
  let age = "";
  let duration = "";
  let queries = [];

  if (!slotRef) {
    status = "falta";
    queries = ["homescool slot map", c.slot];
  } else if (typeof slotRef === "object" && slotRef.falta) {
    status = "falta";
    queries = slotRef.queries;
  } else {
    const meta = V[slotRef];
    url = meta.url;
    platform = meta.platform;
    lang = meta.lang;
    age = meta.age;
    duration = meta.duration;
    const t = await videoTitle(url);
    if (!t.ok) {
      status = "no-verificado";
      ytTitle = "(oEmbed falló)";
    } else {
      ytTitle = t.title;
    }
    if (c.current !== url) status = c.current ? "reemplazar" : "ok";
    if (!t.ok) status = "no-verificado";
    // locale mismatch hint
    if (c.locale === "es" && lang === "en" && !["mat", "ing", "pro"].includes(c.key.split("-").pop())) {
      /* ing/mat/pro allow EN */
    }
    if (subjLocaleMismatch(c, lang)) status = status === "ok" ? "reemplazar" : status;
  }

  if (url && (status === "reemplazar" || status === "ok" || !c.current)) {
    patch[c.key] = { supportUrl: url };
  }

  rows.push({
    key: c.key,
    tema: c.tema,
    videoTitle: ytTitle,
    url,
    platform,
    lang,
    why: why || defaultWhy(c, slotRef),
    age,
    duration,
    status,
    queries,
    current: c.current,
  });
}

function subjLocaleMismatch(c, lang) {
  const subj = c.key.split("-").pop();
  if (subj === "ing") return lang !== "en";
  if (["esp", "lat", "his", "geo", "cie", "art", "LT", "teb", "exe", "pro"].includes(subj) && c.locale === "es")
    return lang === "en" && subj !== "pro";
  return false;
}

function defaultWhy(c, slotRef) {
  if (typeof slotRef === "object") return "";
  if (!slotRef) return "";
  return "Alineado al foco del día en la celda";
}

const out = path.join(__dirname, "..", "support-url-proposals-c3-l6.json");
fs.writeFileSync(out, JSON.stringify({ generated: new Date().toISOString(), rows, patch, missingToday }, null, 2));
console.log("Wrote", out, "rows", rows.length);
