import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "../../public/ereport-tracker.html"), "utf8");

let dom: JSDOM | null = null;

/** Boots the real tracker document so the canvas controls run against live state. */
async function boot() {
  dom = new JSDOM(html, {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    url: "https://eduardoos.com/ereport-tracker.html",
    beforeParse(window) {
      // jsdom 26 lacks structuredClone; the tracker snapshots state with it.
      (window as any).structuredClone = (v: unknown) => JSON.parse(JSON.stringify(v));
      (window as any).confirm = () => true;
      (window as any).alert = () => {};
      (window as any).scrollTo = () => {};
      window.Element.prototype.scrollIntoView = function scrollIntoView() {};
    },
  });
  await tick(120);
  return dom.window as unknown as Window & typeof globalThis;
}

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

afterEach(() => {
  dom?.window.close();
  dom = null;
});

const all = (w: Window, sel: string) => [...w.document.querySelectorAll(sel)] as HTMLElement[];
const click = (el: Element | null | undefined) => {
  expect(el, "control is rendered").toBeTruthy();
  (el as HTMLElement & { onclick: () => void }).onclick();
};

describe("tracker canvas authoring", () => {
  it("boots and renders the seed report with an add-section control", async () => {
    const w = await boot();
    expect(all(w, ".section-block").length).toBe(1);
    expect(all(w, '.app-actions [data-act="add-section"]').length).toBe(1);
  });

  it("adds a main section, a subsection, an open issue and a row", async () => {
    const w = await boot();
    click(all(w, '.app-actions [data-act="add-section"]')[0]);
    expect(all(w, ".section-block").length).toBe(2);

    const sid = all(w, ".section-block")[1].dataset.section as string;
    const section = () => w.document.querySelector(`[data-section="${sid}"]`) as HTMLElement;
    expect(section().querySelectorAll(".group-block").length).toBe(0);

    click(section().querySelector('[data-act="add-group"]'));
    expect(section().querySelectorAll(".group-block").length).toBe(1);

    click(section().querySelector('[data-act="add-section-item"]'));
    expect(section().querySelectorAll(".section-open .item-card").length).toBe(1);

    const gid = section().querySelector(".group-block")?.getAttribute("data-group") as string;
    click(section().querySelector('[data-act="add-item"]'));
    expect(section().querySelector(`[data-group="${gid}"]`)?.querySelectorAll(".item-card").length).toBe(2);
  });

  it("retypes a section between funcionalidades and subartículos", async () => {
    const w = await boot();
    const hint = () => w.document.querySelector(".section-actions .hint")?.textContent?.trim();
    expect(hint()).toBe("Por funcionalidad");
    click(w.document.querySelector('[data-act="toggle-kind"]'));
    expect(hint()).toBe("Por subartículo");
  });

  it("deletes a subsection and a whole section", async () => {
    const w = await boot();
    click(all(w, '.app-actions [data-act="add-section"]')[0]);
    const sid = all(w, ".section-block")[1].dataset.section as string;
    click(w.document.querySelector(`[data-section="${sid}"] [data-act="add-group"]`));
    const groups = all(w, ".group-block").length;

    click(w.document.querySelector(`[data-section="${sid}"] [data-act="del-group"]`));
    expect(all(w, ".group-block").length).toBe(groups - 1);

    click(w.document.querySelector(`[data-section="${sid}"] [data-act="del-section"]`));
    expect(all(w, ".section-block").length).toBe(1);
  });

  it("hides delete controls when the host sets canDelete false", async () => {
    const w = await boot();
    expect(all(w, '[data-act="del-section"]').length).toBeGreaterThan(0);
    expect(all(w, '[data-act="remove"]').length).toBeGreaterThan(0);
    w.postMessage(
      {
        target: "ereport-tracker",
        type: "config",
        uploadUrl: "",
        csrf: "",
        canDelete: false,
      },
      "*",
    );
    await tick(40);
    expect(all(w, '[data-act="del-section"]').length).toBe(0);
    expect(all(w, '[data-act="clear-section"]').length).toBe(0);
    expect(all(w, '[data-act="del-group"]').length).toBe(0);
    expect(all(w, '[data-act="clear-group"]').length).toBe(0);
    expect(all(w, '[data-act="remove"]').length).toBe(0);
    expect(all(w, '.app-actions [data-act="add-section"]').length).toBe(1);
    expect(all(w, '[data-act="add-section-item"]').length).toBeGreaterThan(0);
    expect(all(w, '[data-act="add-item"]').length).toBeGreaterThan(0);
  });
});

describe("tracker validation criteria", () => {
  it("adds criteria chips and keeps them removable", async () => {
    const w = await boot();
    const addCriterion = (label: string) => {
      const input = w.document.getElementById("criteria-add-input") as HTMLInputElement;
      input.value = label;
      click(w.document.getElementById("criteria-add-btn"));
    };
    addCriterion("RVT2025");
    addCriterion("RVT2026");
    expect(all(w, ".criteria-chip").length).toBe(2);

    click(all(w, '.criteria-chip [data-act="crit-remove"]')[0]);
    expect(all(w, ".criteria-chip").length).toBe(1);
  });
});

describe("tracker checklist status", () => {
  it("derives reject / warning / approved from checklist checks", async () => {
    const w = await boot();
    const card = () => all(w, ".item-card")[0];
    expect(card().classList.contains("is-reprobado")).toBe(true);

    click(card().querySelector('[data-act="item-tab"][data-tab="checklist"]'));
    expect(card().querySelectorAll(".checklist-row").length).toBe(1);
    click(card().querySelector('[data-act="add-check"]'));
    expect(card().querySelectorAll(".checklist-row").length).toBe(2);
    expect(card().classList.contains("is-reprobado")).toBe(true);

    click(card().querySelectorAll('[data-act="toggle-check"]')[0]);
    expect(card().classList.contains("is-none")).toBe(true);

    click(card().querySelectorAll('[data-act="toggle-check"]')[1]);
    expect(card().classList.contains("is-aprobado")).toBe(true);
  });

  it("heals legacy items without UX checklist into UX cumplidas (including former reprobado)", async () => {
    const w = await boot();
    w.postMessage(
      {
        target: "ereport-tracker",
        type: "load",
        payload: {
          reportName: "Legacy",
          orgName: "Org",
          theme: "dark",
          validationCriteria: [],
          sections: [
            {
              id: "sec-legacy",
              title: "1. Legacy",
              kind: "funcionalidades",
              productHistory: "",
              items: [],
              groups: [
                {
                  id: "g-legacy",
                  title: "General",
                  productHistory: "",
                  items: [
                    {
                      id: "legacy-ok",
                      nombre: "Was approved",
                      incidencia: "old approved issue",
                      status: "aprobado",
                      checklist: [],
                      solucion: "",
                      imagesIncidencia: [],
                      imagesSolucion: [],
                      images: [],
                    },
                    {
                      id: "legacy-bad",
                      nombre: "Was flipped to reject",
                      incidencia: "autosave corrupted",
                      status: "reprobado",
                      checklist: [],
                      solucion: "",
                      imagesIncidencia: [],
                      imagesSolucion: [],
                      images: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      "*",
    );
    await tick(80);
    const cards = all(w, ".item-card");
    expect(cards[0].classList.contains("is-aprobado")).toBe(true);
    expect(cards[1].classList.contains("is-aprobado")).toBe(true);
    click(cards[1].querySelector('[data-act="item-tab"][data-tab="checklist"]'));
    const labels = all(w, ".checklist-label").map((el) => (el as HTMLInputElement).value);
    expect(labels).toContain("UX cumplidas");
  });

  it("opens product history from section and group concept buttons", async () => {
    const w = await boot();
    click(w.document.querySelector('.section-title-main [data-act="product-history"]'));
    expect(w.document.getElementById("history-modal")?.classList.contains("open")).toBe(true);
    (w.document.getElementById("history-text") as HTMLTextAreaElement).value = "Section history";
    click(w.document.getElementById("history-save"));
    expect(w.document.getElementById("history-modal")?.classList.contains("open")).toBe(false);

    click(w.document.querySelector('.group-head-main [data-act="product-history"]'));
    expect(w.document.getElementById("history-modal")?.classList.contains("open")).toBe(true);
    (w.document.getElementById("history-text") as HTMLTextAreaElement).value = "Item history";
    click(w.document.getElementById("history-save"));
    expect(w.document.getElementById("history-modal")?.classList.contains("open")).toBe(false);
  });
});

describe("tracker host commands", () => {
  const send = async (w: Window, command: string) => {
    w.postMessage({ target: "ereport-tracker", type: "command", command }, "*");
    await tick(60);
  };

  it("adds a subsection and an open issue from the host", async () => {
    const w = await boot();
    const groups = all(w, ".group-block").length;
    await send(w, "add-group");
    expect(all(w, ".group-block").length).toBe(groups + 1);

    const issues = all(w, ".section-open .item-card").length;
    await send(w, "add-open-issue");
    expect(all(w, ".section-open .item-card").length).toBe(issues + 1);
  });

  it("collapses and expands the whole report", async () => {
    const w = await boot();
    await send(w, "add-section");
    await send(w, "collapse-all");
    expect(all(w, ".section-block.is-collapsed").length).toBe(all(w, ".section-block").length);
    await send(w, "expand-all");
    expect(all(w, ".section-block.is-collapsed").length).toBe(0);
  });
});
