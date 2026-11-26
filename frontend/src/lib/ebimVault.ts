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
  return SPECS.map((spec) => {
    const source = readFileSync(join(vaultRoot, spec.file), "utf8");
    const markdown = spec.file.endsWith(".md");
    const html = markdown
      ? renderStudyMarkdown(source, (href) => resolveNoteHref(spec.file, href, ids))
      : renderPlainText(source);
    return { ...spec, html };
  });
}
