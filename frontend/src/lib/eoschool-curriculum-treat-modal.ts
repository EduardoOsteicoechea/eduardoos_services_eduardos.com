import { getCurriculumTreat, type CurriculumTreat } from "./eoschool-curriculum-treats";
import { mustLog } from "./dev-log";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  color: string;
  life: number;
};

const CONFETTI_COLORS = ["#e11d48", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6"];

let confettiRaf = 0;
let confettiParticles: Particle[] = [];
let confettiCanvas: HTMLCanvasElement | null = null;
let confettiCtx: CanvasRenderingContext2D | null = null;

function stopConfetti(): void {
  if (confettiRaf) {
    cancelAnimationFrame(confettiRaf);
    confettiRaf = 0;
  }
  confettiParticles = [];
  if (confettiCtx && confettiCanvas) {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

function resizeConfettiCanvas(canvas: HTMLCanvasElement): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = Math.max(1, Math.floor(w * dpr));
  canvas.height = Math.max(1, Math.floor(h * dpr));
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    confettiCtx = ctx;
  }
}

function spawnConfetti(canvas: HTMLCanvasElement, count = 120): void {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const cx = w * 0.5;
  const cy = h * 0.28;
  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI) / 1.2 - Math.PI / 2.4;
    const speed = 4 + Math.random() * 9;
    confettiParticles.push({
      x: cx + (Math.random() - 0.5) * w * 0.2,
      y: cy,
      vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
      vy: Math.sin(angle) * speed - 2,
      w: 0.25 + Math.random() * 0.45,
      h: 0.35 + Math.random() * 0.55,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.35,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      life: 1,
    });
  }
}

function tickConfetti(): void {
  if (!confettiCanvas || !confettiCtx) return;
  const ctx = confettiCtx;
  const w = confettiCanvas.clientWidth;
  const h = confettiCanvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const next: Particle[] = [];
  for (const p of confettiParticles) {
    p.vy += 0.18;
    p.vx *= 0.992;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life -= 0.008;
    if (p.life <= 0 || p.y > h + 2 * rem) continue;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect((-p.w * rem) / 2, (-p.h * rem) / 2, p.w * rem, p.h * rem);
    ctx.restore();
    next.push(p);
  }
  confettiParticles = next;
  if (confettiParticles.length) {
    confettiRaf = requestAnimationFrame(tickConfetti);
  } else {
    confettiRaf = 0;
  }
}

function startConfetti(canvas: HTMLCanvasElement): void {
  stopConfetti();
  confettiCanvas = canvas;
  resizeConfettiCanvas(canvas);
  spawnConfetti(canvas);
  confettiRaf = requestAnimationFrame(tickConfetti);
}

function setPunchlineVisible(modal: HTMLElement, visible: boolean): void {
  const punch = modal.querySelector<HTMLElement>("[data-curriculum-treat-punchline]");
  const reveal = modal.querySelector<HTMLButtonElement>("[data-curriculum-treat-reveal]");
  if (punch) punch.hidden = !visible;
  if (reveal) reveal.hidden = visible;
}

function fillTreat(modal: HTMLElement, treat: CurriculumTreat): void {
  const kind = modal.querySelector<HTMLElement>("[data-curriculum-treat-kind]");
  const setup = modal.querySelector<HTMLElement>("[data-curriculum-treat-setup]");
  const punch = modal.querySelector<HTMLElement>("[data-curriculum-treat-punchline]");
  const reveal = modal.querySelector<HTMLButtonElement>("[data-curriculum-treat-reveal]");

  if (kind) {
    kind.textContent = treat.kind === "riddle" ? "Adivinanza" : "Chiste";
  }
  if (setup) {
    const text = treat.setup.trim();
    setup.textContent = text || treat.punchline;
    setup.hidden = !text && treat.kind === "joke";
  }
  if (punch) {
    punch.textContent = treat.punchline;
  }

  const isRiddle = treat.kind === "riddle";
  if (isRiddle) {
    setPunchlineVisible(modal, false);
    if (reveal) {
      reveal.hidden = false;
      reveal.textContent = "Ver respuesta";
    }
  } else {
    setPunchlineVisible(modal, true);
    if (reveal) reveal.hidden = true;
    if (setup && !treat.setup.trim()) {
      setup.hidden = true;
    }
  }
}

export function closeCurriculumTreatModal(): void {
  const modal = document.querySelector<HTMLElement>("[data-curriculum-treat-modal]");
  if (!modal) return;
  stopConfetti();
  modal.hidden = true;
  document.body.classList.remove("eoschool-curriculum-treat-open");
  setPunchlineVisible(modal, false);
}

export async function openCurriculumTreatModal(dayId: string, sectionId: string): Promise<void> {
  const modal = document.querySelector<HTMLElement>("[data-curriculum-treat-modal]");
  if (!modal) return;

  const treat = await getCurriculumTreat(dayId, sectionId);
  fillTreat(modal, treat);
  modal.hidden = false;
  document.body.classList.add("eoschool-curriculum-treat-open");

  const canvas = modal.querySelector<HTMLCanvasElement>("[data-curriculum-treat-confetti]");
  if (canvas) startConfetti(canvas);

  if (mustLog) {
    console.log("[curriculum.treat] open", { dayId, sectionId, kind: treat.kind, key: treat.key });
  }

  modal.querySelector<HTMLButtonElement>("[data-curriculum-treat-close]")?.focus();
}

export function bindCurriculumTreatModal(): void {
  const modal = document.querySelector<HTMLElement>("[data-curriculum-treat-modal]");
  if (!modal || modal.dataset.treatBound === "true") return;
  modal.dataset.treatBound = "true";

  modal.querySelectorAll<HTMLElement>("[data-curriculum-treat-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeCurriculumTreatModal());
  });

  modal.querySelector<HTMLButtonElement>("[data-curriculum-treat-reveal]")?.addEventListener("click", () => {
    setPunchlineVisible(modal, true);
  });

  modal.addEventListener("click", (ev) => {
    if (ev.target === modal) closeCurriculumTreatModal();
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !modal.hidden) {
      ev.stopPropagation();
      closeCurriculumTreatModal();
    }
  }, true);

  window.addEventListener("resize", () => {
    if (modal.hidden || !confettiCanvas) return;
    resizeConfettiCanvas(confettiCanvas);
  });
}
