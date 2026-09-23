/** Client-side human check: random wait → checkbox → short action window. */

const WAIT_MIN_MS = 5000;
const WAIT_MAX_MS = 20000;
const ARM_MS = 5000;

type Phase = "waiting" | "ready" | "armed";

export type AntibotHandle = {
  isArmed: () => boolean;
  consume: () => void;
  restart: () => void;
  sync: () => void;
  setActive: (active: boolean) => void;
  destroy: () => void;
  /** Jumps straight to the armed window (tests / tooling only). */
  armNow: () => void;
};

type AntibotOpts = {
  /** When true (default), consume() starts a new wait. When false, hides the widget. */
  restartOnConsume?: boolean;
  /** Element before which the widget is inserted. Defaults to the action button. */
  insertBefore?: Element | null;
  /**
   * When the challenge is armed, called instead of forcing `disabled = false`
   * so the host can also require other conditions (e.g. chat composer content).
   */
  syncEnable?: () => void;
};

type Copy = {
  waiting: string;
  ready: string;
  armed: string;
  check: string;
};

const handles = new WeakMap<HTMLButtonElement, AntibotHandle>();

function copyForLang(): Copy {
  if (document.documentElement.lang.startsWith("es")) {
    return {
      waiting: "Espere mientras se habilita la verificación…",
      ready: "Marque la casilla para habilitar el botón.",
      armed: "Pulse el botón en los próximos 5 segundos.",
      check: "No soy un robot",
    };
  }
  return {
    waiting: "Wait while verification becomes available…",
    ready: "Check the box to enable the button.",
    armed: "Click the button within 5 seconds.",
    check: "I am not a robot",
  };
}

function randomWaitMs(): number {
  return WAIT_MIN_MS + Math.floor(Math.random() * (WAIT_MAX_MS - WAIT_MIN_MS + 1));
}

export function isAntibotArmed(button: HTMLButtonElement | null | undefined): boolean {
  if (!button) {
    return true;
  }
  if (!button.hasAttribute("data-antibot-action")) {
    return true;
  }
  return handles.get(button)?.isArmed() ?? false;
}

export function consumeAntibot(button: HTMLButtonElement | null | undefined): void {
  if (!button) {
    return;
  }
  handles.get(button)?.consume();
}

export function syncAntibotAction(button: HTMLButtonElement): void {
  handles.get(button)?.sync();
}

export function restartAntibot(button: HTMLButtonElement | null | undefined): void {
  if (!button) {
    return;
  }
  handles.get(button)?.restart();
}

/** Arms the challenge immediately (used by unit tests). */
export function armAntibotNow(button: HTMLButtonElement | null | undefined): void {
  if (!button) {
    return;
  }
  handles.get(button)?.armNow();
}

export function setAntibotActive(button: HTMLButtonElement | null | undefined, active: boolean): void {
  if (!button) {
    return;
  }
  handles.get(button)?.setActive(active);
}

/**
 * Inserts the antibot UI before the action button and gates that button until
 * the wait finishes, the checkbox is checked, and the 5s click window is open.
 */
export function attachAntibot(actionButton: HTMLButtonElement, opts: AntibotOpts = {}): AntibotHandle {
  const existing = handles.get(actionButton);
  if (existing) {
    return existing;
  }

  const restartOnConsume = opts.restartOnConsume !== false;
  const syncEnable = opts.syncEnable;
  const copy = copyForLang();
  const insertBefore = opts.insertBefore ?? actionButton;

  const root = document.createElement("div");
  root.className = "antibot";
  root.dataset.antibot = "true";

  const bar = document.createElement("div");
  bar.className = "antibot-bar";
  bar.setAttribute("role", "progressbar");
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", "100");
  bar.setAttribute("aria-valuenow", "0");

  const fill = document.createElement("div");
  fill.className = "antibot-bar-fill";
  bar.append(fill);

  const status = document.createElement("p");
  status.className = "antibot-status hint";
  status.dataset.antibotStatus = "true";

  const checkWrap = document.createElement("label");
  checkWrap.className = "antibot-check";
  checkWrap.hidden = true;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.dataset.antibotCheck = "true";
  checkbox.disabled = true;

  const checkLabel = document.createElement("span");
  checkLabel.textContent = copy.check;

  checkWrap.append(checkbox, checkLabel);
  root.append(bar, status, checkWrap);
  insertBefore.parentNode?.insertBefore(root, insertBefore);

  actionButton.dataset.antibotAction = "true";
  actionButton.disabled = true;

  let phase: Phase = "waiting";
  let active = true;
  let waitTotal = randomWaitMs();
  let waitStarted = 0;
  let armStarted = 0;
  let raf = 0;
  let destroyed = false;

  const setProgress = (ratio: number): void => {
    const clamped = Math.max(0, Math.min(1, ratio));
    fill.style.transform = `scaleX(${clamped})`;
    bar.setAttribute("aria-valuenow", String(Math.round(clamped * 100)));
  };

  const applyButton = (): void => {
    if (destroyed || !active) {
      return;
    }
    const formBusy = actionButton.closest("form")?.getAttribute("aria-busy") === "true";
    if (formBusy || phase !== "armed") {
      actionButton.disabled = true;
      return;
    }
    if (syncEnable) {
      syncEnable();
      return;
    }
    actionButton.disabled = false;
  };

  const setPhase = (next: Phase): void => {
    phase = next;
    if (next === "waiting") {
      checkWrap.hidden = true;
      checkbox.checked = false;
      checkbox.disabled = true;
      status.textContent = copy.waiting;
      setProgress(0);
    } else if (next === "ready") {
      checkWrap.hidden = false;
      checkbox.checked = false;
      checkbox.disabled = false;
      status.textContent = copy.ready;
      setProgress(1);
    } else {
      checkWrap.hidden = false;
      checkbox.checked = true;
      checkbox.disabled = false;
      status.textContent = copy.armed;
      setProgress(1);
    }
    applyButton();
  };

  const stopRaf = (): void => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  const tick = (now: number): void => {
    if (destroyed || !active) {
      return;
    }
    if (phase === "waiting") {
      const elapsed = now - waitStarted;
      setProgress(elapsed / waitTotal);
      if (elapsed >= waitTotal) {
        setPhase("ready");
        return;
      }
      raf = requestAnimationFrame(tick);
      return;
    }
    if (phase === "armed") {
      const elapsed = now - armStarted;
      setProgress(1 - elapsed / ARM_MS);
      if (elapsed >= ARM_MS) {
        setPhase("ready");
        return;
      }
      raf = requestAnimationFrame(tick);
    }
  };

  const startWait = (): void => {
    stopRaf();
    waitTotal = randomWaitMs();
    waitStarted = performance.now();
    setPhase("waiting");
    raf = requestAnimationFrame(tick);
  };

  const startArm = (): void => {
    stopRaf();
    armStarted = performance.now();
    setPhase("armed");
    raf = requestAnimationFrame(tick);
  };

  const onCheckChange = (): void => {
    if (!active || destroyed) {
      return;
    }
    if (phase === "waiting") {
      checkbox.checked = false;
      return;
    }
    if (checkbox.checked) {
      startArm();
      return;
    }
    stopRaf();
    setPhase("ready");
  };

  const onFormSubmit = (event: Event): void => {
    if (!active || destroyed) {
      return;
    }
    if (phase === "armed") {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  checkbox.addEventListener("change", onCheckChange);
  const form = actionButton.closest("form");
  form?.addEventListener("submit", onFormSubmit, true);

  const handle: AntibotHandle = {
    isArmed: () => active && phase === "armed",
    consume: () => {
      if (destroyed) {
        return;
      }
      stopRaf();
      if (!restartOnConsume) {
        active = false;
        root.hidden = true;
        checkbox.checked = false;
        phase = "ready";
        actionButton.removeAttribute("data-antibot-action");
        return;
      }
      startWait();
    },
    restart: () => {
      if (destroyed) {
        return;
      }
      active = true;
      root.hidden = false;
      actionButton.dataset.antibotAction = "true";
      startWait();
    },
    sync: () => {
      applyButton();
    },
    setActive: (next) => {
      if (destroyed) {
        return;
      }
      active = next;
      root.hidden = !next;
      if (!next) {
        stopRaf();
        actionButton.removeAttribute("data-antibot-action");
        actionButton.disabled = false;
        return;
      }
      actionButton.dataset.antibotAction = "true";
      startWait();
    },
    armNow: () => {
      if (destroyed || !active) {
        return;
      }
      checkbox.checked = true;
      startArm();
    },
    destroy: () => {
      if (destroyed) {
        return;
      }
      destroyed = true;
      stopRaf();
      checkbox.removeEventListener("change", onCheckChange);
      form?.removeEventListener("submit", onFormSubmit, true);
      handles.delete(actionButton);
      actionButton.removeAttribute("data-antibot-action");
      root.remove();
    },
  };

  handles.set(actionButton, handle);
  startWait();
  return handle;
}

/** Finds the primary submit button in a form and attaches antibot. */
export function attachFormAntibot(form: HTMLFormElement, opts: AntibotOpts = {}): AntibotHandle | null {
  const button =
    form.querySelector<HTMLButtonElement>("button[data-session-login], button[type='submit']") ??
    form.querySelector<HTMLButtonElement>("button");
  if (!button) {
    return null;
  }
  return attachAntibot(button, opts);
}
