/** Equalize day-card heights: slots 1–4 match tallest among them; slot 5 matches that height with overflow. */

function rootFontSizePx(): number {
  const raw = getComputedStyle(document.documentElement).fontSize;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 16;
}

function pxToRem(px: number): string {
  return `${px / rootFontSizePx()}rem`;
}

function equalizeOneWeek(weekDays: HTMLElement): void {
  const cards = [...weekDays.querySelectorAll<HTMLElement>(".eoschool-curriculum__day-card")];
  if (cards.length < 5) return;

  const first4 = cards.slice(0, 4);
  const day5 = cards[4];

  for (const card of cards) {
    card.style.height = "";
    card.style.maxHeight = "";
  }

  const maxPx = Math.max(...first4.map((c) => c.getBoundingClientRect().height));
  if (!(maxPx > 0)) return;

  const heightRem = pxToRem(maxPx);
  for (const card of first4) {
    card.style.height = heightRem;
  }
  day5.style.height = heightRem;
  day5.style.maxHeight = heightRem;
}

export function initCurriculumDayHeights(root: HTMLElement | null): void {
  if (!root || typeof window === "undefined") return;

  const weeks = [...root.querySelectorAll<HTMLElement>(".eoschool-curriculum__week-days")];
  if (!weeks.length) return;

  let frame = 0;
  const run = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      for (const week of weeks) equalizeOneWeek(week);
    });
  };

  run();
  window.addEventListener("resize", run, { passive: true });

  // Font-size chrome updates documentElement.style.fontSize.
  const mo = new MutationObserver(run);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
}
