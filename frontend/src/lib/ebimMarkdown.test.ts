import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadCurriculum } from "./ebimCurriculum";
import { renderStudyMarkdown } from "./ebimMarkdown";
import { loadEbimDocs } from "./ebimVault";

const vault = join(dirname(fileURLToPath(import.meta.url)), "../../../iso19650_study_vault");

describe("renderStudyMarkdown", () => {
  it("escapes html, demotes the title, and rewrites a note link", () => {
    const html = renderStudyMarkdown(
      "# Title\n\nSee [part 2](../02/summary_and_terms.md) and <script>alert(1)</script>.\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n",
      (href) => (href.endsWith("summary_and_terms.md") ? "p2-summary" : null),
    );
    expect(html).toContain("<h2>Title</h2>");
    expect(html).toContain('data-ebim-jump="p2-summary"');
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("<th>A</th>");
    expect(html).toContain("<td>2</td>");
  });
});

describe("loadCurriculum", () => {
  it("orders the reading from what is current to how to check it", () => {
    const screens = loadCurriculum();
    expect(screens.map((screen) => screen.id)).toEqual([
      "vigencia",
      "personas",
      "requisitos",
      "cde",
      "loin",
      "entrega",
      "operacion",
      "intercambio",
      "seguridad",
      "formatos",
      "fuentes",
      "preguntas",
    ]);
    expect(screens.filter((screen) => screen.id !== "preguntas").every((screen) => screen.html.includes("http"))).toBe(true);
    expect(screens.find((screen) => screen.id === "loin")?.html).toContain("level of information need");
  });
});
describe("loadEbimDocs", () => {
  it("loads every vault file in study order", () => {
    const docs = loadEbimDocs(vault);
    expect(docs[0]?.id).toBe("index");
    expect(docs[0]?.kind).toBe("lesson");
    expect(docs.find((doc) => doc.id === "p1-summary")?.guide).toContain("nivel de necesidad de información");
    expect(docs.find((doc) => doc.id === "ids-entity")?.kind).toBe("reference");
    expect(docs.at(-1)?.id).toBe("plan");
    expect(docs.map((doc) => doc.id)).toEqual([
      "index",
      "p1-summary",
      "p1-sources",
      "p2-summary",
      "p2-sources",
      "p3-summary",
      "p3-sources",
      "p4-summary",
      "p4-sources",
      "p5-summary",
      "p5-sources",
      "p6-summary",
      "p6-sources",
      "ids-readme",
      "ids-specifications",
      "ids-entity",
      "ids-attribute",
      "ids-classification",
      "ids-property",
      "ids-material",
      "ids-partof",
      "ids-restrictions",
      "ids-metadata",
      "ids-schema",
      "ids-example",
      "ids-license",
      "plan",
    ]);
    expect(docs.every((doc) => doc.html.length > 0)).toBe(true);
  });
});
