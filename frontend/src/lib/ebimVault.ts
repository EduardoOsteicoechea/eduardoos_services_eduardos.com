import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { renderPlainText, renderStudyMarkdown } from "./ebimMarkdown";

export type EbimDoc = {
  id: string;
  group: string;
  groupLabel: string;
  subgroup: string;
  label: string;
  file: string;
  html: string;
  kind: "lesson" | "reference";
  guide: string;
  lessonStep: number;
};

type Spec = {
  id: string;
  group: string;
  groupLabel: string;
  subgroup: string;
  label: string;
  file: string;
};

/** Study order. Every file under the vault must appear here. */
const SPECS: Spec[] = [
  { id: "index", group: "start", groupLabel: "Start", subgroup: "", label: "Index and study order", file: "00_INDEX_AND_STUDY_ORDER.md" },
  { id: "p1-summary", group: "p1", groupLabel: "ISO 19650-1", subgroup: "", label: "Summary and terms", file: "01_ISO_19650_1_Concepts_and_CDE/summary_and_terms.md" },
  { id: "p1-sources", group: "p1", groupLabel: "ISO 19650-1", subgroup: "", label: "Sources", file: "01_ISO_19650_1_Concepts_and_CDE/sources.md" },
  { id: "p2-summary", group: "p2", groupLabel: "ISO 19650-2", subgroup: "", label: "Summary and terms", file: "02_ISO_19650_2_Delivery_Phase/summary_and_terms.md" },
  { id: "p2-sources", group: "p2", groupLabel: "ISO 19650-2", subgroup: "", label: "Sources", file: "02_ISO_19650_2_Delivery_Phase/sources.md" },
  { id: "p3-summary", group: "p3", groupLabel: "ISO 19650-3", subgroup: "", label: "Summary and terms", file: "03_ISO_19650_3_Operational_Phase/summary_and_terms.md" },
  { id: "p3-sources", group: "p3", groupLabel: "ISO 19650-3", subgroup: "", label: "Sources", file: "03_ISO_19650_3_Operational_Phase/sources.md" },
  { id: "p4-summary", group: "p4", groupLabel: "ISO 19650-4", subgroup: "", label: "Summary and terms", file: "04_ISO_19650_4_Information_Exchange/summary_and_terms.md" },
  { id: "p4-sources", group: "p4", groupLabel: "ISO 19650-4", subgroup: "", label: "Sources", file: "04_ISO_19650_4_Information_Exchange/sources.md" },
  { id: "p5-summary", group: "p5", groupLabel: "ISO 19650-5", subgroup: "", label: "Summary and terms", file: "05_ISO_19650_5_Security/summary_and_terms.md" },
  { id: "p5-sources", group: "p5", groupLabel: "ISO 19650-5", subgroup: "", label: "Sources", file: "05_ISO_19650_5_Security/sources.md" },
  { id: "p6-summary", group: "p6", groupLabel: "LOIN and openBIM", subgroup: "", label: "Summary and terms", file: "06_Templates_LOIN_and_OpenBIM/summary_and_terms.md" },
  { id: "p6-sources", group: "p6", groupLabel: "LOIN and openBIM", subgroup: "", label: "Sources", file: "06_Templates_LOIN_and_OpenBIM/sources.md" },
  { id: "ids-readme", group: "p6", groupLabel: "LOIN and openBIM", subgroup: "Downloaded references", label: "IDS manual", file: "06_Templates_LOIN_and_OpenBIM/downloaded_refs/buildingsmart_ids-1.0-documentation-readme_2024.md" },
  { id: "ids-specifications", group: "p6", groupLabel: "LOIN and openBIM", subgroup: "Downloaded references", label: "IDS specifications", file: "06_Templates_LOIN_and_OpenBIM/downloaded_refs/buildingsmart_ids-1.0-specifications_2024.md" },
  { id: "ids-entity", group: "p6", groupLabel: "LOIN and openBIM", subgroup: "Downloaded references", label: "Entity facet", file: "06_Templates_LOIN_and_OpenBIM/downloaded_refs/buildingsmart_ids-1.0-entity-facet_2024.md" },
  { id: "ids-attribute", group: "p6", groupLabel: "LOIN and openBIM", subgroup: "Downloaded references", label: "Attribute facet", file: "06_Templates_LOIN_and_OpenBIM/downloaded_refs/buildingsmart_ids-1.0-attribute-facet_2024.md" },
  { id: "ids-classification", group: "p6", groupLabel: "LOIN and openBIM", subgroup: "Downloaded references", label: "Classification facet", file: "06_Templates_LOIN_and_OpenBIM/downloaded_refs/buildingsmart_ids-1.0-classification-facet_2024.md" },
  { id: "ids-property", group: "p6", groupLabel: "LOIN and openBIM", subgroup: "Downloaded references", label: "Property facet", file: "06_Templates_LOIN_and_OpenBIM/downloaded_refs/buildingsmart_ids-1.0-property-facet_2024.md" },
  { id: "ids-material", group: "p6", groupLabel: "LOIN and openBIM", subgroup: "Downloaded references", label: "Material facet", file: "06_Templates_LOIN_and_OpenBIM/downloaded_refs/buildingsmart_ids-1.0-material-facet_2024.md" },
  { id: "ids-partof", group: "p6", groupLabel: "LOIN and openBIM", subgroup: "Downloaded references", label: "Part-of facet", file: "06_Templates_LOIN_and_OpenBIM/downloaded_refs/buildingsmart_ids-1.0-partof-facet_2024.md" },
  { id: "ids-restrictions", group: "p6", groupLabel: "LOIN and openBIM", subgroup: "Downloaded references", label: "Restrictions", file: "06_Templates_LOIN_and_OpenBIM/downloaded_refs/buildingsmart_ids-1.0-restrictions_2024.md" },
  { id: "ids-metadata", group: "p6", groupLabel: "LOIN and openBIM", subgroup: "Downloaded references", label: "IDS metadata", file: "06_Templates_LOIN_and_OpenBIM/downloaded_refs/buildingsmart_ids-1.0-metadata_2024.md" },
  { id: "ids-schema", group: "p6", groupLabel: "LOIN and openBIM", subgroup: "Downloaded references", label: "IDS 1.0 schema", file: "06_Templates_LOIN_and_OpenBIM/downloaded_refs/buildingsmart_ids-1.0-schema_2024.xsd" },
  { id: "ids-example", group: "p6", groupLabel: "LOIN and openBIM", subgroup: "Downloaded references", label: "Pre-1.0 example", file: "06_Templates_LOIN_and_OpenBIM/downloaded_refs/buildingsmart_ids-aachen-example-schema-0.9.7_2022.ids" },
  { id: "ids-license", group: "p6", groupLabel: "LOIN and openBIM", subgroup: "Downloaded references", label: "IDS licence", file: "06_Templates_LOIN_and_OpenBIM/downloaded_refs/buildingsmart_ids-1.0-license_2024.txt" },
  { id: "plan", group: "plan", groupLabel: "Study plan", subgroup: "", label: "Plan and self-assessment", file: "07_Study_Plan/study_plan_and_self_assessment.md" },
];

/** Spanish reading guide. The notes stay in English; this tells the reader how to use each step. */
const GUIDES: Record<string, string> = {
  index:
    "Mapa de vigencia. Qué texto está publicado, cuál se está reescribiendo y qué queda fuera. Las ediciones de 2018 y 2020 siguen vigentes, y a la vez ISO ya prepara su sustitución. No memorices la tabla: úsala para saber qué fecha estás leyendo.",
  "p1-summary":
    "Quién pide la información, quién la produce y qué se pide. La organización define su necesidad; de ahí salen las necesidades del activo y del proyecto, y de esas sale lo que se exige en cada encargo. Un archivo se elabora en curso, se comparte para coordinar, se publica cuando se acepta, y el historial se archiva. El término correcto es nivel de necesidad de información. No uses LOD.",
  "p1-sources":
    "De dónde sale lo anterior: fichas de ISO y guías abiertas. Sirve para comprobar una frase, no para volver a explicar el sistema.",
  "p2-summary":
    "Mientras el activo se diseña y se construye, la información sigue ocho actividades, en este orden: necesidad, licitación, oferta, contrato, movilización, producción, entrega y cierre. El plan de ejecución se propone en la oferta y se confirma al contratar. Cada equipo declara sus entregas y el responsable las reúne en un solo plan. El registro de riesgos de aquí trata de la información, no de la seguridad física de la obra.",
  "p2-sources":
    "Guías del Reino Unido y ficha de ISO para la fase de entrega.",
  "p3-summary":
    "Cuando el activo ya se usa, un evento pide información nueva: un mantenimiento previsto, una avería que no se podía planear, o la compra de algo que ya existe. Lo aceptado al terminar la obra entra en el modelo del activo, y ese modelo hay que mantenerlo. Si el evento era previsible, el equipo ya está listo. Si no, primero ocurre el hecho y después se contrata.",
  "p3-sources":
    "Guía operativa y ficha de ISO para el activo en uso.",
  "p4-summary":
    "Un archivo se comparte para coordinar, y puede compartirse varias veces. Se publica cuando ya se acepta para usarlo. Antes de las dos decisiones se miran seis cualidades: el nombre, el formato, que conserve su identidad, que la conversión no lo estropee, que las partes coincidan y que no falte lo pedido. Esas pruebas no sustituyen lo que el encargo exigió.",
  "p4-sources":
    "Guía de intercambio de 2023 y ficha de ISO 19650-4.",
  "p5-summary":
    "La seguridad es proporcionada: no consiste en esconder todo el modelo. Primero se valora si la información es sensible y se guarda esa valoración. Si lo es, hacen falta una estrategia, un plan para aplicarla y un plan por si hay un incidente. Esas obligaciones entran en el contrato. PAS 1192-5 ya no es la norma vigente. Los códigos ST1 a ST4 no quedaron confirmados en este archivo: no los memorices.",
  "p5-sources":
    "Notas de NPSA y ficha de ISO 19650-5.",
  "p6-summary":
    "Los formatos que permiten comprobar lo anterior. El nivel de necesidad se expresa en geometría, datos y documentos. IFC es el archivo del modelo. IDS es una lista que un programa puede comprobar contra ese archivo. bSDD es el diccionario de términos, no lo que este cliente pidió. IDS 1.0 no comprueba la geometría.",
  "p6-sources":
    "Fichas de ISO 7817 e ISO 16739, y las páginas de buildingSMART.",
  "ids-readme":
    "Manual breve de IDS, en inglés. Una especificación dice a qué objetos se aplica y qué se les exige.",
  "ids-specifications":
    "Cómo se escribe esa especificación: aplicabilidad y requisitos.",
  "ids-entity":
    "Cómo se nombra una clase IFC, por ejemplo un muro.",
  "ids-attribute":
    "Cómo se exige un atributo, por ejemplo el nombre del objeto.",
  "ids-classification":
    "Cómo se pide un código de clasificación, por ejemplo Uniclass.",
  "ids-property":
    "Cómo se exige una propiedad, por ejemplo la resistencia al fuego.",
  "ids-material":
    "Cómo se exige un material.",
  "ids-partof":
    "Cómo se exige que un objeto forme parte de otro, por ejemplo que esté dentro de un espacio.",
  "ids-restrictions":
    "Cómo se limita un valor a una lista, un rango o un patrón.",
  "ids-metadata":
    "Título, autor y fecha del archivo IDS.",
  "ids-schema":
    "Esquema XML de IDS 1.0. Úsalo para comprobar un nombre de elemento, no para leerlo seguido.",
  "ids-example":
    "Ejemplo antiguo: todavía apunta al esquema 0.9.7. No sirve como modelo de la versión 1.0.",
  "ids-license":
    "Licencia de los archivos IDS copiados aquí. Permite conservarlos sin modificarlos.",
  plan:
    "Preguntas y un caso corto para comprobar si puedes explicarlo con tus palabras. Si una respuesta no sale, vuelve al tema correspondiente en esta misma página.",
};

const LESSON_IDS = new Set([
  "index",
  "p1-summary",
  "p2-summary",
  "p3-summary",
  "p4-summary",
  "p5-summary",
  "p6-summary",
  "plan",
]);

function walkFiles(dir: string, root: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) {
      found.push(...walkFiles(abs, root));
      continue;
    }
    found.push(relative(root, abs).split(sep).join("/"));
  }
  return found;
}

function resolveNoteHref(fromFile: string, href: string, ids: Map<string, string>): string | null {
  const pathOnly = href.split("#")[0]?.trim() || "";
  if (!pathOnly || /^https?:\/\//i.test(pathOnly)) return null;
  const base = fromFile.split("/").slice(0, -1);
  const parts = [...base];
  for (const segment of pathOnly.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") parts.pop();
    else parts.push(segment);
  }
  return ids.get(parts.join("/")) ?? null;
}

export function loadEbimDocs(vaultRoot: string): EbimDoc[] {
  const onDisk = walkFiles(vaultRoot, vaultRoot).sort();
  const listed = SPECS.map((spec) => spec.file);
  const missing = listed.filter((file) => !onDisk.includes(file));
  const extra = onDisk.filter((file) => !listed.includes(file));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `eBim vault list is out of date. Missing: ${missing.join(", ") || "none"}. Extra: ${extra.join(", ") || "none"}.`,
    );
  }
  const ids = new Map(SPECS.map((spec) => [spec.file, spec.id]));
  let lessonStep = 0;
  return SPECS.map((spec) => {
    const source = readFileSync(join(vaultRoot, spec.file), "utf8");
    const markdown = spec.file.endsWith(".md");
    const html = markdown
      ? renderStudyMarkdown(source, (href) => resolveNoteHref(spec.file, href, ids))
      : renderPlainText(source);
    const kind = LESSON_IDS.has(spec.id) ? "lesson" : "reference";
    if (kind === "lesson") lessonStep += 1;
    const guide = GUIDES[spec.id];
    if (!guide) throw new Error(`eBim guide missing for ${spec.id}`);
    return { ...spec, html, kind, guide, lessonStep: kind === "lesson" ? lessonStep : 0 };
  });
}
