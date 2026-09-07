import { getMe, type MeResponse } from "./api";
import { refreshAuthChrome } from "./chrome";
import { showErrorModal } from "./error-modal";
import { go } from "./router";

export type SessionCopy = {
  loading: string;
  signInPrompt: string;
  loadError: string;
  unauthorized: string;
  tooMany: string;
  conflict: string;
  tooLarge: string;
  rejected: string;
  signInFailed: string;
  unauthorizedShort: string;
  checkForm: string;
  genericError: string;
};

const en: SessionCopy = {
  loading: "Loading session…",
  signInPrompt: "Sign in or create an account.",
  loadError: "Could not load the session.",
  unauthorized: "Sign in to continue.",
  tooMany: "Too many attempts. Try later.",
  conflict: "That username is already taken.",
  tooLarge: "That file is too large.",
  rejected: "The request was rejected.",
  signInFailed: "Sign-in failed.",
  unauthorizedShort: "Unauthorized.",
  checkForm: "Check the form and try again.",
  genericError: "Something went wrong.",
};

const es: SessionCopy = {
  loading: "Cargando sesión…",
  signInPrompt: "Inicia sesión o crea una cuenta.",
  loadError: "No se pudo cargar la sesión.",
  unauthorized: "Inicia sesión para continuar.",
  tooMany: "Demasiados intentos. Prueba más tarde.",
  conflict: "Ese nombre de usuario ya está en uso.",
  tooLarge: "Ese archivo es demasiado grande.",
  rejected: "La solicitud fue rechazada.",
  signInFailed: "No se pudo iniciar sesión.",
  unauthorizedShort: "No autorizado.",
  checkForm: "Revisa el formulario e inténtalo de nuevo.",
  genericError: "Algo salió mal.",
};

export function sessionCopy(): SessionCopy {
  return document.documentElement.lang.startsWith("es") ? es : en;
}

export function setBanner(root: ParentNode, text: string, kind = ""): void {
  const banner = root.querySelector("[data-banner]");
  if (banner instanceof HTMLElement) {
    banner.textContent = text;
    banner.className = `status ${kind}`.trim();
  }
}

export function setBusy(form: HTMLFormElement, busy: boolean): void {
  form.querySelectorAll("button, input").forEach((node) => {
    if (node instanceof HTMLButtonElement || node instanceof HTMLInputElement) {
      node.disabled = busy;
    }
  });
}

function messageForCode(copy: SessionCopy, code: string | undefined, fallback: string): string {
  switch (code) {
    case "rate_limited":
      return copy.tooMany;
    case "conflict":
      return copy.conflict;
    case "payload_too_large":
      return copy.tooLarge;
    case "forbidden":
      return copy.rejected;
    case "invalid_credentials":
      return copy.signInFailed;
    case "unauthorized":
      return copy.unauthorizedShort;
    case "invalid_request":
      return copy.checkForm;
    default:
      return fallback;
  }
}

export function genericMessage(
  copy: SessionCopy,
  status: number,
  data: MeResponse,
  success: string,
): { text: string; kind: string } {
  if (status >= 200 && status < 300) return { text: success, kind: "ok" };
  const fromApi = (data.message || "").trim();
  const text = fromApi || messageForCode(copy, data.error, copy.genericError);
  return { text, kind: "err" };
}

export function reportFailure(copy: SessionCopy, status: number, data: MeResponse, success: string): { text: string; kind: string } {
  const message = genericMessage(copy, status, data, success);
  if (message.kind === "err") {
    showErrorModal({
      message: message.text,
      requestId: data.request_id,
      details: [`error=${data.error || "unknown"}`, data.request_id ? `request_id=${data.request_id}` : ""].filter(Boolean).join("\n"),
      debug: data.debug,
    });
  }
  return message;
}

export function fillProfile(root: ParentNode, data: MeResponse): void {
  const summary = root.querySelector("[data-profile-summary]");
  if (summary instanceof HTMLElement) {
    summary.textContent = `${data.email ?? ""} · @${data.username ?? ""} · ${data.role ?? ""}`;
  }
  const form = root.querySelector("[data-profile-form]");
  if (form instanceof HTMLFormElement) {
    const display = form.elements.namedItem("display_name");
    const username = form.elements.namedItem("username");
    const phone = form.elements.namedItem("phone");
    if (display instanceof HTMLInputElement) display.value = data.display_name ?? "";
    if (username instanceof HTMLInputElement) username.value = data.username ?? "";
    if (phone instanceof HTMLInputElement) phone.value = data.phone ?? "";
  }
  const avatarImg = root.querySelector("[data-avatar-img]");
  if (avatarImg instanceof HTMLImageElement) {
    if (data.avatar) {
      avatarImg.src = `/api/profile/avatar?ts=${Date.now()}`;
      avatarImg.hidden = false;
    } else {
      avatarImg.removeAttribute("src");
      avatarImg.hidden = true;
    }
  }
}

export async function requireGuest(root: HTMLElement, copy: SessionCopy): Promise<boolean> {
  setBanner(root, copy.loading);
  const { status, data } = await getMe();
  if (status === 200) {
    go("/session/profile");
    return false;
  }
  if (status !== 401) {
    setBanner(root, copy.loadError, "err");
    showErrorModal({
      message: data.message || copy.loadError,
      requestId: data.request_id,
      details: data.request_id ? `request_id=${data.request_id}` : "",
      debug: data.debug,
    });
    return true;
  }
  setBanner(root, copy.signInPrompt);
  return true;
}

export async function requireAuth(root: HTMLElement, copy: SessionCopy): Promise<MeResponse | null> {
  setBanner(root, copy.loading);
  const { status, data } = await getMe();
  const fallback = root.querySelector("[data-guest-fallback]");
  const panel = root.querySelector("[data-authed-panel]");
  if (status === 401) {
    if (fallback instanceof HTMLElement) fallback.hidden = false;
    if (panel instanceof HTMLElement) panel.hidden = true;
    setBanner(root, copy.unauthorized, "err");
    return null;
  }
  if (status !== 200) {
    if (fallback instanceof HTMLElement) fallback.hidden = false;
    if (panel instanceof HTMLElement) panel.hidden = true;
    setBanner(root, copy.loadError, "err");
    showErrorModal({
      message: data.message || copy.loadError,
      requestId: data.request_id,
      details: data.request_id ? `request_id=${data.request_id}` : "",
      debug: data.debug,
    });
    return null;
  }
  if (fallback instanceof HTMLElement) fallback.hidden = true;
  if (panel instanceof HTMLElement) panel.hidden = false;
  return data;
}

export async function afterAuthChange(): Promise<void> {
  await refreshAuthChrome();
}
