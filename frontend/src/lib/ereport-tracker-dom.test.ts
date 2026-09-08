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
});

describe("tracker validation criteria", () => {
  it("adds criteria that fan out to every item, and removes them again", async () => {
    const w = await boot();
    const addCriterion = (label: string) => {
      const input = w.document.getElementById("criteria-add-input") as HTMLInputElement;
      input.value = label;
      click(w.document.getElementById("criteria-add-btn"));
    };
    addCriterion("RVT2025");
    addCriterion("RVT2026");
    expect(all(w, ".criteria-chip").length).toBe(2);
    expect(all(w, ".item-card")[0].querySelectorAll(".status-criteria-row").length).toBe(2);

    click(all(w, '.criteria-chip [data-act="crit-remove"]')[0]);
    expect(all(w, ".criteria-chip").length).toBe(1);
    expect(all(w, ".item-card")[0].querySelectorAll(".status-criteria-row").length).toBe(1);
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
