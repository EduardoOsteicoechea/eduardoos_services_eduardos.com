/** Equalize day-card heights: slots 1–4 match tallest among them; slot 5 matches that height with overflow. */

function rootFontSizePx(): number {
  const raw = getComputedStyle(document.documentElement).fontSize;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 16;
}

function pxToRem(px: number): string {
  return `${px / rootFontSizePx()}rem`;
}

const PHONE_QUERY = "(max-width: 47.999rem)";

function equalizeOneWeek(weekDays: HTMLElement): void {
  const cards = [...weekDays.querySelectorAll<HTMLElement>(".eoschool-curriculum__day-card")];
  if (cards.length < 5) return;

  for (const card of cards) {
    card.style.height = "";
    card.style.maxHeight = "";
  }

  if (window.matchMedia(PHONE_QUERY).matches) return;

  const first4 = cards.slice(0, 4);
  const day5 = cards[4];
  const collapsed = (card: HTMLElement) => card.classList.contains("eoschool-curriculum__day-card--collapsed");
  const open4 = first4.filter((card) => !collapsed(card));
  const measure = open4.length ? open4 : first4;

  const maxPx = Math.max(...measure.map((c) => c.getBoundingClientRect().height));
  if (!(maxPx > 0)) return;

  const heightRem = pxToRem(maxPx);
  for (const card of first4) {
    if (collapsed(card)) continue;
    card.style.height = heightRem;
  }
  if (day5 && !collapsed(day5)) {
    day5.style.height = heightRem;
    day5.style.maxHeight = heightRem;
  }
}

let refreshAll: (() => void) | null = null;

/** Re-equalize day card heights after subject expand/collapse. */
export function refreshCurriculumDayHeights(root: HTMLElement | null): void {
  if (!root || typeof window === "undefined") return;
  if (refreshAll) {
    refreshAll();
    return;
  }
  const weeks = [...root.querySelectorAll<HTMLElement>(".eoschool-curriculum__week-days")];
  for (const week of weeks) equalizeOneWeek(week);
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
  refreshAll = run;

  run();
  window.addEventListener("resize", run, { passive: true });

  // Font-size chrome updates documentElement.style.fontSize.
  const mo = new MutationObserver(run);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
}
