import { deleteAvatar, getCsrf, getMe, loginPayload, markSessionHint, postJSON, profileAvatarURL, resetCsrfMemory, uploadAvatar, type MeResponse } from "./api";
import { sessionLog, sessionLogCookies, sessionLogStorage } from "./dev-log";

declare global {
  interface Window {
    __profileActionsStarted?: boolean;
  }
}
import { applySessionAvatar, refreshAuthChrome } from "./chrome";
import { showErrorModal } from "./error-modal";
import { go } from "./router";

export { profileAvatarURL };

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
  phoneRegionRequired: string;
  phoneInvalid: string;
  profilePersistFailed: string;
};

export type PhoneRegion = { code: string; en: string; es: string };

export const PHONE_REGIONS: PhoneRegion[] = [
  { code: "+54", en: "Argentina", es: "Argentina" },
  { code: "+61", en: "Australia", es: "Australia" },
  { code: "+591", en: "Bolivia", es: "Bolivia" },
  { code: "+55", en: "Brazil", es: "Brasil" },
  { code: "+1", en: "Canada / United States", es: "Canadá / EE. UU." },
  { code: "+56", en: "Chile", es: "Chile" },
  { code: "+86", en: "China", es: "China" },
  { code: "+57", en: "Colombia", es: "Colombia" },
  { code: "+506", en: "Costa Rica", es: "Costa Rica" },
  { code: "+53", en: "Cuba", es: "Cuba" },
  { code: "+593", en: "Ecuador", es: "Ecuador" },
  { code: "+503", en: "El Salvador", es: "El Salvador" },
  { code: "+34", en: "Spain", es: "España" },
  { code: "+33", en: "France", es: "Francia" },
  { code: "+49", en: "Germany", es: "Alemania" },
  { code: "+502", en: "Guatemala", es: "Guatemala" },
  { code: "+504", en: "Honduras", es: "Honduras" },
  { code: "+91", en: "India", es: "India" },
  { code: "+39", en: "Italy", es: "Italia" },
  { code: "+52", en: "Mexico", es: "México" },
  { code: "+505", en: "Nicaragua", es: "Nicaragua" },
  { code: "+507", en: "Panama", es: "Panamá" },
  { code: "+595", en: "Paraguay", es: "Paraguay" },
  { code: "+51", en: "Peru", es: "Perú" },
  { code: "+351", en: "Portugal", es: "Portugal" },
  { code: "+44", en: "United Kingdom", es: "Reino Unido" },
  { code: "+598", en: "Uruguay", es: "Uruguay" },
  { code: "+58", en: "Venezuela", es: "Venezuela" },
];

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
  phoneRegionRequired: "Choose a region for the phone number.",
  phoneInvalid: "Enter a valid phone number.",
  profilePersistFailed: "The profile did not persist on the server. Try again.",
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
  phoneRegionRequired: "Elige una región para el teléfono.",
  phoneInvalid: "Introduce un teléfono válido.",
  profilePersistFailed: "El perfil no se guardó en el servidor. Inténtalo de nuevo.",
};

export function sessionCopy(): SessionCopy {
  return document.documentElement.lang.startsWith("es") ? es : en;
}

export function setBanner(root: ParentNode, text: string, kind = ""): void {
  const banner = root.querySelector("[data-banner]");
  if (banner instanceof HTMLElement) {
    banner.textContent = text;
    banner.className = `status ${kind}`.trim();
    banner.hidden = text.trim() === "";
  }
}

export function setBusy(form: HTMLFormElement, busy: boolean): void {
  form.setAttribute("aria-busy", busy ? "true" : "false");
  form.querySelectorAll("button").forEach((node) => {
    if (node instanceof HTMLButtonElement) {
      node.disabled = busy;
    }
  });
}

export function emailFromQuery(): string {
  try {
    return new URLSearchParams(globalThis.location.search).get("email")?.trim() ?? "";
  } catch {
    return "";
  }
}

export function prefillEmailFields(root: ParentNode, email: string): void {
  if (!email) {
    return;
  }
  root.querySelectorAll("input[name='email']").forEach((node) => {
    if (node instanceof HTMLInputElement && node.type === "email" && !node.value) {
      node.value = email;
    }
  });
}

export function loginBodyFromForm(form: HTMLFormElement): { identifier: string; password: string } {
  const identifier = form.elements.namedItem("identifier");
  const password = form.elements.namedItem("password");
  const idValue = identifier instanceof HTMLInputElement ? identifier.value : String(new FormData(form).get("identifier") ?? "");
  const passwordValue = password instanceof HTMLInputElement ? password.value : String(new FormData(form).get("password") ?? "");
  return loginPayload(idValue, passwordValue);
}

export function guardSessionSubmit(event: Event): HTMLFormElement | null {
  event.preventDefault();
  event.stopImmediatePropagation();
  const form = event.currentTarget;
  return form instanceof HTMLFormElement ? form : null;
}

export function digitsOnlyPhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function composeE164(region: string, national: string): string | null {
  const code = region.trim();
  const digits = digitsOnlyPhone(national);
  if (!digits) {
    return null;
  }
  if (!/^\+[1-9]\d{0,2}$/.test(code)) {
    return null;
  }
  return `${code}${digits}`;
}

export function splitE164(phone: string | null | undefined): { region: string; national: string } {
  const digits = digitsOnlyPhone(phone ?? "");
  if (!digits) {
    return { region: "", national: "" };
  }
  const value = `+${digits}`;
  const codes = PHONE_REGIONS.map((region) => region.code).sort((a, b) => b.length - a.length);
  for (const code of codes) {
    if (value.startsWith(code)) {
      return { region: code, national: value.slice(code.length) };
    }
  }
  const match = value.match(/^\+([1-9]\d{0,2})(\d+)$/);
  if (match) {
    return { region: `+${match[1]}`, national: match[2] };
  }
  return { region: "", national: digits };
}

export function paintPhoneRegions(select: HTMLSelectElement, selected = ""): void {
  const spanish = document.documentElement.lang.startsWith("es");
  const regions = [...PHONE_REGIONS].sort((a, b) => {
    const left = spanish ? a.es : a.en;
    const right = spanish ? b.es : b.en;
    return left.localeCompare(right, spanish ? "es" : "en");
  });
  select.replaceChildren();
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = spanish ? "Región" : "Region";
  select.append(blank);
  for (const region of regions) {
    const option = document.createElement("option");
    option.value = region.code;
    option.textContent = `${spanish ? region.es : region.en} (${region.code})`;
    select.append(option);
  }
  if (selected && !regions.some((region) => region.code === selected)) {
    const extra = document.createElement("option");
    extra.value = selected;
    extra.textContent = selected;
    select.append(extra);
  }
  select.value = selected;
}

export function sanitizePhoneNational(input: HTMLInputElement): void {
  const next = digitsOnlyPhone(input.value);
  if (input.value !== next) {
    input.value = next;
  }
}

export function syncPhoneValidity(form: HTMLFormElement): void {
  const national = form.querySelector("[data-phone-national]");
  if (!(national instanceof HTMLInputElement)) {
    return;
  }
  sanitizePhoneNational(national);
  const copy = sessionCopy();
  const region = form.querySelector("[data-phone-region]");
  const regionValue = region instanceof HTMLSelectElement ? region.value.trim() : "";
  const digits = national.value;
  if (!digits) {
    national.setCustomValidity("");
    return;
  }
  if (!regionValue) {
    national.setCustomValidity(copy.phoneRegionRequired);
    return;
  }
  const composed = composeE164(regionValue, digits);
  if (!composed || !/^\+[1-9]\d{7,14}$/.test(composed)) {
    national.setCustomValidity(copy.phoneInvalid);
    return;
  }
  national.setCustomValidity("");
}

export function profilePatchBody(form: HTMLFormElement): {
  display_name: string | null;
  username: string;
  phone: string | null;
} {
  const data = new FormData(form);
  const displayName = String(data.get("display_name") ?? "").trim();
  return {
    display_name: displayName === "" ? null : displayName,
    username: String(data.get("username") ?? "").trim(),
    phone: composeE164(String(data.get("phone_region") ?? ""), String(data.get("phone_national") ?? "")),
  };
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
    summary.textContent = data.email ?? "";
  }
  const form = root.querySelector("[data-profile-form]");
  if (form instanceof HTMLFormElement) {
    const display = form.querySelector("[name='display_name']");
    const username = form.querySelector("[name='username']");
    const region = form.querySelector("[data-phone-region]");
    const national = form.querySelector("[data-phone-national]");
    const parts = splitE164(data.phone);
    if (display instanceof HTMLInputElement) display.value = data.display_name ?? "";
    if (username instanceof HTMLInputElement) username.value = data.username ?? "";
    if (region instanceof HTMLSelectElement) paintPhoneRegions(region, parts.region);
    if (national instanceof HTMLInputElement) national.value = parts.national;
  }
  const avatarWrap = root.querySelector("[data-avatar-wrap]");
  const avatarImg = root.querySelector("[data-avatar-img]");
  const avatarRemove = root.querySelector("[data-avatar-delete]");
  const fallback = root.querySelector("[data-avatar-fallback]");
  const src = profileAvatarURL(data.avatar);
  const showAvatar = (visible: boolean) => {
    if (avatarWrap instanceof HTMLElement) avatarWrap.hidden = !visible;
    if (avatarImg instanceof HTMLImageElement) avatarImg.hidden = !visible;
    if (avatarRemove instanceof HTMLElement) avatarRemove.hidden = !visible;
    if (fallback instanceof HTMLElement) fallback.hidden = visible;
  };
  if (avatarImg instanceof HTMLImageElement) {
    if (src) {
      avatarImg.onerror = () => {
        avatarImg.removeAttribute("src");
        showAvatar(false);
      };
      avatarImg.src = src;
      showAvatar(true);
    } else {
      avatarImg.removeAttribute("src");
      showAvatar(false);
    }
  } else {
    showAvatar(false);
  }
  applySessionAvatar(data.avatar);
}

function currentSessionPath(): string {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  return `${path}${location.search}`;
}

export function onBoundPageReady(selector: string, init: (root: HTMLElement) => void): void {
  const expectedKey = currentSessionPath();
  const start = () => {
    if (currentSessionPath() !== expectedKey) {
      return;
    }
    const root = document.querySelector(selector);
    if (!(root instanceof HTMLElement)) {
      return;
    }
    const boundKey = root.dataset.boundKey || "";
    if (boundKey === expectedKey) {
      return;
    }
    root.dataset.bound = "true";
    root.dataset.boundKey = expectedKey;
    init(root);
  };
  document.addEventListener("astro:page-load", start);
  document.addEventListener("astro:after-swap", start);
  start();
}

export function onSessionPageReady(init: (root: HTMLElement) => void): void {
  onBoundPageReady("[data-session]", init);
}

export async function requireGuest(root: HTMLElement, copy: SessionCopy): Promise<boolean> {
  setBanner(root, copy.loading);
  sessionLog("session.requireGuest.start");
  try {
    const { status, data } = await getMe();
    sessionLog("session.requireGuest.me", { status, userId: data.id, error: data.error });
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
  } catch {
    setBanner(root, copy.loadError, "err");
    showErrorModal({ message: copy.loadError });
    return true;
  }
}

export async function requireAuth(root: HTMLElement, copy: SessionCopy): Promise<MeResponse | null> {
  setBanner(root, copy.loading);
  sessionLog("session.requireAuth.start");
  const fallback = root.querySelector("[data-guest-fallback]");
  const panels = Array.from(root.querySelectorAll("[data-authed-panel]")).filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );
  const setPanelsHidden = (hidden: boolean) => {
    for (const panel of panels) {
      panel.hidden = hidden;
    }
  };

  try {
    const { status, data } = await getMe();
    sessionLog("session.requireAuth.me", { status, userId: data.id, role: data.role, error: data.error });
    if (status === 401) {
      if (fallback instanceof HTMLElement) fallback.hidden = false;
      setPanelsHidden(true);
      setBanner(root, copy.unauthorized, "err");
      return null;
    }
    if (status !== 200) {
      if (fallback instanceof HTMLElement) fallback.hidden = false;
      setPanelsHidden(true);
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
    setPanelsHidden(false);
    await refreshAuthChrome();
    return data;
  } catch {
    if (fallback instanceof HTMLElement) fallback.hidden = false;
    setPanelsHidden(true);
    setBanner(root, copy.loadError, "err");
    showErrorModal({ message: copy.loadError });
    return null;
  }
}

export async function afterAuthChange(): Promise<void> {
  sessionLog("session.afterAuthChange.start");
  markSessionHint();
  resetCsrfMemory();
  await getCsrf();
  await refreshAuthChrome();
  sessionLogCookies("afterAuthChange");
  sessionLog("session.afterAuthChange.done");
}

function profileActionCopy(): { saved: string; avatarUpdated: string; avatarRemoved: string; chooseImage: string } {
  if (document.documentElement.lang.startsWith("es")) {
    return {
      saved: "Perfil guardado.",
      avatarUpdated: "Avatar actualizado.",
      avatarRemoved: "Avatar eliminado.",
      chooseImage: "Elige un archivo de imagen.",
    };
  }
  return {
    saved: "Profile saved.",
    avatarUpdated: "Avatar updated.",
    avatarRemoved: "Avatar removed.",
    chooseImage: "Choose an image file.",
  };
}

async function persistProfileForm(form: HTMLFormElement): Promise<void> {
  const root = form.closest("[data-session]");
  if (!(root instanceof HTMLElement)) {
    return;
  }
  const copy = sessionCopy();
  const actions = profileActionCopy();
  syncPhoneValidity(form);
  if (!form.reportValidity()) {
    return;
  }
  setBusy(form, true);
  try {
    const patch = profilePatchBody(form);
    sessionLog("session.profile.save_start", patch);
    const result = await postJSON<MeResponse>("/profile", patch);
    const message = reportFailure(copy, result.status, result.data, actions.saved);
    setBanner(root, message.text, message.kind);
    if (result.status !== 200) {
      return;
    }
    fillProfile(root, result.data);
    const confirmed = await getMe();
    sessionLog("session.profile.confirm_read", {
      status: confirmed.status,
      displayName: confirmed.data.display_name,
      phone: confirmed.data.phone,
    });
    if (confirmed.status === 200) {
      const savedName = result.data.display_name ?? "";
      const savedPhone = result.data.phone ?? "";
      if ((confirmed.data.display_name ?? "") !== savedName || (confirmed.data.phone ?? "") !== savedPhone) {
        setBanner(root, copy.profilePersistFailed, "err");
        showErrorModal({
          message: copy.profilePersistFailed,
          requestId: confirmed.requestId,
          details: confirmed.requestId ? `request_id=${confirmed.requestId}` : "",
        });
        return;
      }
      fillProfile(root, confirmed.data);
    }
  } catch {
    setBanner(root, copy.loadError, "err");
    showErrorModal({ message: copy.loadError });
  } finally {
    setBusy(form, false);
  }
}

async function persistLoginForm(form: HTMLFormElement): Promise<void> {
  if (form.dataset.loginBusy === "true") {
    return;
  }
  const root = form.closest("[data-session]");
  if (!(root instanceof HTMLElement)) {
    return;
  }
  const copy = sessionCopy();
  if (!form.reportValidity()) {
    return;
  }
  const body = loginBodyFromForm(form);
  if (!body.identifier || body.password.length < 8) {
    setBanner(root, copy.checkForm, "err");
    showErrorModal({ message: copy.checkForm });
    const password = form.elements.namedItem("password");
    if (password instanceof HTMLInputElement) {
      password.focus();
    }
    return;
  }
  form.dataset.loginBusy = "true";
  setBusy(form, true);
  try {
    sessionLog("session.login.start", { identifier: body.identifier });
    const result = await postJSON<MeResponse>("/auth/login", body);
    sessionLog("session.login.result", { status: result.status, userId: result.data.id, error: result.data.error });
    sessionLogCookies("after login");
    const signedIn = document.documentElement.lang.startsWith("es") ? "Sesión iniciada." : "Signed in.";
    const message = reportFailure(copy, result.status, result.data, signedIn);
    setBanner(root, message.text, message.kind);
    if (result.status === 200) {
      await afterAuthChange();
      go("/session/profile");
    }
  } catch {
    setBanner(root, copy.loadError, "err");
    showErrorModal({ message: copy.loadError });
  } finally {
    delete form.dataset.loginBusy;
    setBusy(form, false);
  }
}

export function startProfileActions(): void {
  if (window.__profileActionsStarted) {
    return;
  }
  window.__profileActionsStarted = true;

  document.addEventListener(
    "keydown",
    (event) => {
      const node = event.target;
      if (!(node instanceof HTMLInputElement) || !node.matches("[data-phone-national]")) {
        return;
      }
      if (event.key === "+" || event.key === "Add") {
        event.preventDefault();
      }
    },
    true,
  );

  document.addEventListener(
    "beforeinput",
    (event) => {
      const node = event.target;
      if (!(node instanceof HTMLInputElement) || !node.matches("[data-phone-national]")) {
        return;
      }
      if (event.data?.includes("+")) {
        event.preventDefault();
      }
    },
    true,
  );

  document.addEventListener("input", (event) => {
    const node = event.target;
    if (node instanceof HTMLInputElement && node.matches("[data-phone-national]")) {
      sanitizePhoneNational(node);
    }
  });

  document.addEventListener(
    "submit",
    (event) => {
      const form = event.target;
      if (
        !(form instanceof HTMLFormElement) ||
        !form.matches("[data-login], [data-profile-form], [data-avatar-form]")
      ) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      if (form.matches("[data-login]")) {
        void persistLoginForm(form);
        return;
      }
      if (form.matches("[data-profile-form]")) {
        void persistProfileForm(form);
        return;
      }
      void persistAvatarForm(form);
    },
    true,
  );

  document.addEventListener("click", (event) => {
    const node = event.target;
    if (!(node instanceof Element)) {
      return;
    }
    const login = node.closest("[data-session-login]");
    if (login) {
      const form = login.closest("[data-login]");
      if (form instanceof HTMLFormElement) {
        event.preventDefault();
        void persistLoginForm(form);
      }
      return;
    }
    const save = node.closest("[data-profile-save]");
    if (save) {
      const form = save.closest("[data-profile-form]");
      if (form instanceof HTMLFormElement) {
        event.preventDefault();
        void persistProfileForm(form);
      }
      return;
    }
    const upload = node.closest("[data-avatar-upload]");
    if (upload) {
      const form = upload.closest("[data-avatar-form]");
      if (form instanceof HTMLFormElement) {
        event.preventDefault();
        void persistAvatarForm(form);
      }
      return;
    }
    const remove = node.closest("[data-avatar-delete]");
    if (remove) {
      event.preventDefault();
      void persistAvatarDelete(remove);
    }
  });
}

async function persistAvatarForm(form: HTMLFormElement): Promise<void> {
  const root = form.closest("[data-session]");
  if (!(root instanceof HTMLElement)) {
    return;
  }
  const copy = sessionCopy();
  const actions = profileActionCopy();
  const fileInput = form.querySelector("[name='file']");
  if (!(fileInput instanceof HTMLInputElement) || !fileInput.files?.[0]) {
    setBanner(root, actions.chooseImage, "err");
    showErrorModal({ message: actions.chooseImage });
    return;
  }
  setBusy(form, true);
  try {
    const result = await uploadAvatar(fileInput.files[0]);
    const message = reportFailure(copy, result.status, result.data, actions.avatarUpdated);
    setBanner(root, message.text, message.kind);
    if (result.status === 200) {
      fillProfile(root, result.data);
    }
  } catch {
    setBanner(root, copy.loadError, "err");
    showErrorModal({ message: copy.loadError });
  } finally {
    setBusy(form, false);
  }
}

async function persistAvatarDelete(trigger: Element): Promise<void> {
  const root = trigger.closest("[data-session]");
  if (!(root instanceof HTMLElement)) {
    return;
  }
  const copy = sessionCopy();
  const actions = profileActionCopy();
  try {
    const result = await deleteAvatar();
    const message = reportFailure(copy, result.status, result.data, actions.avatarRemoved);
    setBanner(root, message.text, message.kind);
    if (result.status === 200) {
      fillProfile(root, result.data);
    }
  } catch {
    setBanner(root, copy.loadError, "err");
    showErrorModal({ message: copy.loadError });
  }
}
