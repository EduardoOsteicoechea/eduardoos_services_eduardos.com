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
    "Empieza aquí. Esta página es el mapa del recorrido: qué partes existen, en qué orden conviene leerlas y qué textos están en revisión. No intentes memorizar la tabla. Quédate con el orden y con esta advertencia: las partes 1, 2 y 3 siguen vigentes, pero ISO ya las está reescribiendo. Cuando termines, sigue con la lección de conceptos.",
  "p1-summary":
    "Esta es la primera lección. Léela como una historia con tres momentos. Primero, quién pide la información y quién la produce. Después, qué se pide: la organización define su necesidad, de ahí salen las necesidades del activo y del proyecto, y de esas sale lo que se exige en cada encargo. Al final, cómo viaja un archivo: se elabora en curso, se comparte para coordinar, se publica cuando se acepta, y el archivo guarda la historia. El término correcto es nivel de necesidad de información. No uses LOD. La lista de fuentes está al lado, por si quieres comprobar una frase. Para seguir la lección, pasa a la parte 2.",
  "p1-sources":
    "Esto no es la lección. Es la bibliografía de los conceptos: qué se consultó, qué está de pago y qué se dejó fuera. Ábrela solo cuando una frase de la lección te parezca dudosa y quieras ver de dónde sale.",
  "p2-summary":
    "La parte 2 es el proceso mientras el activo se diseña y se construye. Son ocho actividades, y hay que leerlas en orden. Fíjate en tres decisiones. El plan de ejecución se propone en la oferta y se confirma después del contrato. Cada equipo arma su plan de entrega y el responsable lo reúne en un plan maestro. El registro de riesgos de este capítulo trata de la información, no de la seguridad de la obra. Cuando lo tengas claro, sigue con la operación.",
  "p2-sources":
    "Bibliografía de la fase de entrega. Úsala para abrir la guía del Reino Unido o la ficha de ISO si necesitas el texto de apoyo. No sustituye a la lección anterior.",
  "p3-summary":
    "Aquí el activo ya se usa. Un evento dispara la necesidad de información nueva: un mantenimiento previsto, una avería que no se podía planear, o la compra de un activo que ya existe. Lo que se acepta al terminar la obra pasa al modelo de información del activo, y ese modelo hay que mantenerlo. No todo se contrata antes del evento. Si el evento era previsible, el equipo ya está movilizado. Si no, primero ocurre el evento y después se contrata.",
  "p3-sources":
    "Bibliografía de la fase operativa. Consúltala para localizar la guía de la parte 3. La lección ya está en el paso anterior.",
  "p4-summary":
    "Esta lección explica cuándo un archivo se comparte y cuándo se publica. Compartir es enseñarlo para coordinar, y puede ocurrir varias veces. Publicar es aceptarlo para usarlo, y conviene hacerlo una vez. Antes de cualquiera de las dos decisiones se revisan seis cualidades: el nombre, el formato, que no cambie de identidad entre versiones, que la conversión no lo estropee, que las partes coincidan, y que no falte lo pedido. Esas pruebas no reemplazan lo que el encargo exigió. Lo complementan.",
  "p4-sources":
    "Bibliografía del intercambio. Ábrela si quieres la guía de marzo de 2023 o la ficha de ISO 19650-4. No es otra lección.",
  "p5-summary":
    "La seguridad de esta parte es proporcionada. No consiste en esconder todo el modelo. Primero se valora si la información es sensible. Si no lo es, se guarda esa valoración. Si lo es, se escribe una estrategia, un plan para aplicarla y un plan por si hay un incidente. Esas obligaciones entran en el contrato, aunque la parte 5 no use la palabra protocolo. PAS 1192-5 ya no es la norma que hay que seguir. No memorices los códigos ST1 a ST4: en este archivo no quedaron confirmados.",
  "p5-sources":
    "Bibliografía de seguridad. Sirve para abrir las notas de NPSA y la ficha de ISO. La lección es el paso anterior.",
  "p6-summary":
    "Hasta aquí el proceso. Ahora, los formatos que permiten comprobarlo. El nivel de necesidad se dice en tres cosas: geometría, datos y documentos. IFC es el archivo del modelo. IDS es una lista que un programa puede comprobar contra ese archivo. bSDD es el diccionario de términos, no lo que el cliente pidió en este proyecto. IDS 1.0 no comprueba la geometría. Los manuales técnicos que siguen son consulta. Léelos solo si la lección te dejó una duda concreta.",
  "p6-sources":
    "Bibliografía de nivel de necesidad, IFC, IDS y bSDD. Úsala para las fichas de ISO y las páginas de buildingSMART. La explicación está en la lección anterior.",
  "ids-readme":
    "Manual breve de IDS, en inglés. Léelo después de la lección de formatos abiertos. Busca solo qué es una especificación: a qué objetos se aplica y qué se les exige. No recorras este apartado como si fuera otra parte de la ISO.",
  "ids-specifications":
    "Detalle de cómo se escribe una especificación IDS. Es consulta. Si ya entendiste aplicabilidad y requisitos en la lección, puedes saltarla.",
  "ids-entity":
    "Consulta técnica: cómo IDS nombra una clase IFC, por ejemplo un muro. No es un paso del recorrido. Vuelve a la lección de formatos abiertos si esto no responde a una duda concreta.",
  "ids-attribute":
    "Consulta técnica: cómo IDS exige un atributo, como el nombre de un objeto. Léela solo si estás escribiendo un ejemplo.",
  "ids-classification":
    "Consulta técnica: cómo IDS pide un código de clasificación, por ejemplo Uniclass. No hace falta leerla para entender la ISO.",
  "ids-property":
    "Consulta técnica: cómo IDS exige una propiedad dentro de un conjunto, por ejemplo la resistencia al fuego. Es el caso más útil si quieres probar un ejemplo después de la lección.",
  "ids-material":
    "Consulta técnica: cómo IDS exige un material. Es un apartado corto de referencia.",
  "ids-partof":
    "Consulta técnica: cómo IDS exige que un objeto forme parte de otro, por ejemplo que esté dentro de un espacio. Léela solo si el ejemplo lo necesita.",
  "ids-restrictions":
    "Consulta técnica: cómo limitar un valor a una lista, un rango o un patrón. Úsala cuando el ejemplo pida algo más que la existencia de la propiedad.",
  "ids-metadata":
    "Consulta técnica: título, autor y fecha del archivo IDS. No cambia el significado de la lección.",
  "ids-schema":
    "El esquema XML de IDS 1.0, en crudo. No está escrito para leerse seguido. Ábrelo solo si estás comprobando un nombre de elemento.",
  "ids-example":
    "Un ejemplo viejo que todavía apunta al esquema 0.9.7. Está aquí para que no lo uses como modelo de la versión 1.0. No es una lección.",
  "ids-license":
    "La licencia de los archivos IDS copiados en este archivo. Permite guardar el texto sin modificarlo. No forma parte del estudio.",
  plan:
    "Cierra el recorrido. Cada módulo repite lo que ya leíste y te pide explicarlo o aplicarlo en un caso corto. Haz las preguntas sin mirar. Si no puedes decirlo con tus palabras, vuelve solo a esa lección, no a todo el archivo.",
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
