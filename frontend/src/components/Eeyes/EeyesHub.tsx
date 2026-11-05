/**
 * eEyes hub — pair devices, plan tasks, review completions, download shells.
 */

import { useCallback, useEffect, useState, type FormEvent } from "react";
import ServiceGate from "../ServiceGate/ServiceGate";
import {
  DashboardGrid,
  ProductHeaderMenu,
  ProductHubShell,
  useProductView,
  type DashboardCardItem,
  type HeaderMenuItem,
} from "../ProductDashboard/ProductDashboard";
import "../ProductDashboard/ProductDashboard.css";
import {
  cancelEeyesTask,
  createEeyesPairing,
  createEeyesTask,
  eeyesDownloadUrl,
  eeyesMediaUrl,
  eeyesNoticeStage,
  getEeyesPairing,
  isEeyesNotice,
  listEeyesCompletions,
  listEeyesDevices,
  listEeyesReleases,
  listEeyesTasks,
  revokeEeyesDevice,
  sendEeyesNotice,
  type CreateEeyesTaskInput,
  type EeyesCompletion,
  type EeyesDevice,
  type EeyesPairing,
  type EeyesRelease,
  type EeyesTask,
} from "../../lib/eeyes";

const CARDS: DashboardCardItem[] = [
  { id: "pair", title: "Vincular", description: "Mostrar 3 códigos para la app.", icon: "qr_code_2" },
  { id: "devices", title: "Dispositivos", description: "Ver, renombrar o revocar.", icon: "smartphone" },
  { id: "tasks", title: "Tareas", description: "Planificar capturas humanas.", icon: "task_alt" },
  { id: "notify", title: "Notificación", description: "Enviar un aviso a un dispositivo.", icon: "notifications" },
  { id: "completions", title: "Completaciones", description: "Fotos y audio recibidos.", icon: "photo_library" },
  { id: "downloads", title: "Descargas", description: "APK Android y EXE Desktop.", icon: "download" },
  {
    id: "diagnostics",
    title: "Diagnóstico",
    description: "Sincronización y recorrido de cada notificación.",
    icon: "troubleshoot",
  },
];

const MENU: HeaderMenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  ...CARDS.map((c) => ({ id: c.id, label: c.title, icon: c.icon })),
];

export default function EeyesHub() {
  return (
    <ServiceGate serviceId="eeyes" serviceLabel="eEyes" requireSubscription>
      <EeyesHubInner />
    </ServiceGate>
  );
}

function EeyesHubInner() {
  const [view, setView] = useProductView("dashboard");
  return (
    <ProductHubShell>
      <ProductHeaderMenu menuId="eeyes-hub-menu" items={MENU} activeId={view} onSelect={setView} />
      {view === "dashboard" ? <DashboardGrid cards={CARDS} onSelect={setView} /> : null}
      {view === "pair" ? <PairView /> : null}
      {view === "devices" ? <DevicesView /> : null}
      {view === "tasks" ? <TasksView /> : null}
      {view === "notify" ? <NotifyView /> : null}
      {view === "completions" ? <CompletionsView /> : null}
      {view === "downloads" ? <DownloadsView /> : null}
      {view === "diagnostics" ? <DiagnosticsView /> : null}
    </ProductHubShell>
  );
}

function PairView() {
  const [pairing, setPairing] = useState<EeyesPairing | null>(null);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const refresh = useCallback(async (id: string) => {
    const p = await getEeyesPairing(id);
    setPairing((prev) => ({ ...p, code1: prev?.code1, code2: prev?.code2, code3: prev?.code3 }));
  }, []);

  useEffect(() => {
    if (!pairing?.id || pairing.status === "paired") return;
    const t = window.setInterval(() => {
      void refresh(pairing.id);
    }, 2000);
    return () => window.clearInterval(t);
  }, [pairing?.id, pairing?.status, refresh]);

  useEffect(() => {
    if (!pairing?.expiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((Date.parse(pairing.expiresAt) - Date.now()) / 1000));
      setSecondsLeft(left);
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [pairing?.expiresAt]);

  async function start() {
    setBusy(true);
    try {
      const p = await createEeyesPairing();
      setPairing(p);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="product-dash__section">
      <h2>Vincular dispositivo</h2>
      <p className="lede">
        La app pide verificar tu identidad (huella, rostro o Windows Hello) y luego tres códigos. Aquí
        aparece uno cada vez: el siguiente solo se muestra cuando la app acepta el anterior.
      </p>
      <button type="button" onClick={() => void start()} disabled={busy}>
        {busy ? "Generando…" : "Generar códigos"}
      </button>
      {pairing ? <PairingCode pairing={pairing} secondsLeft={secondsLeft} /> : null}
    </section>
  );
}

function PairingCode({ pairing, secondsLeft }: { pairing: EeyesPairing; secondsLeft: number }) {
  if (pairing.status === "paired") {
    return (
      <p className="lede" aria-live="polite">
        Vinculado{pairing.deviceLabel ? ` · ${pairing.deviceLabel}` : ""}.
      </p>
    );
  }
  if (pairing.status !== "open" || secondsLeft <= 0) {
    return <p className="lede">Los códigos caducaron. Genera unos nuevos.</p>;
  }
  const step = Math.min(Math.max(pairing.step ?? 0, 0), 2);
  const code = [pairing.code1, pairing.code2, pairing.code3][step];
  return (
    <>
      <p className="lede">Código {step + 1} de 3</p>
      <div className="eeyes-codes" aria-live="polite">
        <div className="eeyes-code" title={`Código ${step + 1}`}>
          {code}
        </div>
      </div>
      <p className="lede">
        {step === 0
          ? "Verifica tu identidad en la app y escribe este código."
          : "Código anterior aceptado. Escribe este en la app."}{" "}
        Expira en {secondsLeft}s.
      </p>
    </>
  );
}

function DevicesView() {
  const [devices, setDevices] = useState<EeyesDevice[]>([]);
  const load = useCallback(async () => {
    setDevices(await listEeyesDevices());
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="product-dash__section">
      <h2>Dispositivos</h2>
      <div className="eeyes-row">
        {devices.map((d) => (
          <article key={d.id} className="eeyes-device-card">
            <strong>{d.label}</strong>
            <span className="lede">
              {d.platform} · {d.model} · v{d.shellVersion || "?"}
            </span>
            <span className="lede">Expira: {new Date(d.expiresAt).toLocaleString()}</span>
            <span className="lede">Último contacto: {new Date(d.lastSeenAt).toLocaleString()}</span>
            {d.revokedAt ? (
              <span className="lede">Revocado</span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void revokeEeyesDevice(d.id).then(load);
                }}
              >
                Revocar
              </button>
            )}
          </article>
        ))}
      </div>
      {devices.length === 0 ? <p className="lede">No hay dispositivos vinculados.</p> : null}
    </section>
  );
}

function TasksView() {
  const [devices, setDevices] = useState<EeyesDevice[]>([]);
  const [tasks, setTasks] = useState<EeyesTask[]>([]);
  const [form, setForm] = useState<CreateEeyesTaskInput>({
    title: "",
    instructions: "",
    deviceId: "",
    photoIntervalSec: 0,
    maxPhotos: 10,
    audioSeconds: 15,
  });

  const load = useCallback(async () => {
    const [d, t] = await Promise.all([listEeyesDevices(), listEeyesTasks()]);
    setDevices(d.filter((x) => !x.revokedAt));
    setTasks(t.filter((x) => !isEeyesNotice(x)));
    if (!form.deviceId && d[0]) setForm((f) => ({ ...f, deviceId: d[0].id }));
  }, [form.deviceId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await createEeyesTask(form);
    setForm((f) => ({ ...f, title: "", instructions: "" }));
    await load();
  }

  return (
    <section className="product-dash__section">
      <h2>Tareas</h2>
      <form className="eeyes-form" onSubmit={(e) => void onSubmit(e)}>
        <label>
          Título
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label>
          Instrucciones
          <textarea
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
          />
        </label>
        <label>
          Dispositivo
          <select
            required
            value={form.deviceId}
            onChange={(e) => setForm({ ...form, deviceId: e.target.value })}
          >
            <option value="">Selecciona…</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label} ({d.platform})
              </option>
            ))}
          </select>
        </label>
        <label>
          Notificar en (ISO local)
          <input
            type="datetime-local"
            onChange={(e) =>
              setForm({
                ...form,
                notifyAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
              })
            }
          />
        </label>
        <label>
          Intervalo foto (s, 0 = manual)
          <input
            type="number"
            min={0}
            value={form.photoIntervalSec}
            onChange={(e) => setForm({ ...form, photoIntervalSec: Number(e.target.value) || 0 })}
          />
        </label>
        <label>
          Máx. fotos
          <input
            type="number"
            min={1}
            max={50}
            value={form.maxPhotos}
            onChange={(e) => setForm({ ...form, maxPhotos: Number(e.target.value) || 1 })}
          />
        </label>
        <label>
          Audio (s)
          <input
            type="number"
            min={0}
            max={300}
            value={form.audioSeconds}
            onChange={(e) => setForm({ ...form, audioSeconds: Number(e.target.value) || 0 })}
          />
        </label>
        <button type="submit">Crear tarea</button>
      </form>
      <div className="eeyes-row">
        {tasks.map((t) => (
          <article key={t.id} className="eeyes-task-card">
            <strong>{t.title}</strong>
            <span className="lede">{t.status}</span>
            <span className="lede">{t.instructions}</span>
            {t.status !== "completed" && t.status !== "cancelled" ? (
              <button type="button" onClick={() => void cancelEeyesTask(t.id).then(load)}>
                Cancelar
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

type NoticeWhen = "now" | "15" | "60" | "custom";

function fmtTime(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleString() : "";
}

function noticeStatusLabel(t: EeyesTask): string {
  switch (eeyesNoticeStage(t)) {
    case "shown":
      return `Mostrada en el dispositivo ${fmtTime(t.notifyAckedAt)}`;
    case "cancelled":
      return "Cancelada";
    case "dispatched":
      return `Enviada al dispositivo ${fmtTime(t.notifyDispatchedAt)} · esperando que la muestre`;
    case "scheduled":
      return `Programada ${fmtTime(t.notifyAt)} · el dispositivo aún no la ha recogido`;
    default:
      return "Esperando a que el dispositivo sincronice";
  }
}

function NotifyView() {
  const [devices, setDevices] = useState<EeyesDevice[]>([]);
  const [notices, setNotices] = useState<EeyesTask[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [when, setWhen] = useState<NoticeWhen>("now");
  const [customAt, setCustomAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentLine, setSentLine] = useState("");

  const load = useCallback(async () => {
    const [d, t] = await Promise.all([listEeyesDevices(), listEeyesTasks()]);
    const live = d.filter((x) => !x.revokedAt);
    setDevices(live);
    setNotices(
      t
        .filter(isEeyesNotice)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    );
    setDeviceId((cur) => cur || live[0]?.id || "");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resolveNotifyAt(): string | undefined {
    if (when === "now") return undefined;
    if (when === "custom") return customAt ? new Date(customAt).toISOString() : undefined;
    return new Date(Date.now() + Number(when) * 60_000).toISOString();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (when === "custom" && !customAt) return;
    setBusy(true);
    setSentLine("");
    try {
      const notice = await sendEeyesNotice({ deviceId, title, message, notifyAt: resolveNotifyAt() });
      setTitle("");
      setMessage("");
      setSentLine(noticeStatusLabel(notice));
      await load();
    } catch {
      /* unwrap already opened the error modal */
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="product-dash__section">
      <h2>Enviar notificación</h2>
      <p className="lede">
        El dispositivo la recibe al sincronizar: al abrir la app o en segundo plano cada 15 minutos.
        Programada, se dispara a su hora aunque la app esté cerrada.
      </p>
      <form className="eeyes-form" onSubmit={(e) => void onSubmit(e)}>
        <label>
          Dispositivo
          <select required value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
            <option value="">Selecciona…</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label} ({d.platform})
              </option>
            ))}
          </select>
        </label>
        <label>
          Título
          <input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Mensaje
          <textarea maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
        <label>
          Cuándo
          <select value={when} onChange={(e) => setWhen(e.target.value as NoticeWhen)}>
            <option value="now">Ahora</option>
            <option value="15">En 15 minutos</option>
            <option value="60">En 1 hora</option>
            <option value="custom">Fecha y hora…</option>
          </select>
        </label>
        {when === "custom" ? (
          <label>
            Fecha y hora
            <input
              type="datetime-local"
              required
              value={customAt}
              onChange={(e) => setCustomAt(e.target.value)}
            />
          </label>
        ) : null}
        <button type="submit" disabled={busy || !deviceId}>
          {busy ? "Enviando…" : "Enviar notificación"}
        </button>
        {sentLine ? <p className="lede" aria-live="polite">{sentLine}</p> : null}
      </form>
      {devices.length === 0 ? <p className="lede">Vincula un dispositivo antes de enviar avisos.</p> : null}
      <div className="eeyes-row">
        {notices.map((t) => (
          <article key={t.id} className="eeyes-task-card">
            <strong>{t.title}</strong>
            {t.instructions ? <span className="lede">{t.instructions}</span> : null}
            <span className="lede">{noticeStatusLabel(t)}</span>
            {t.status === "pending" ? (
              <button type="button" onClick={() => void cancelEeyesTask(t.id).then(load)}>
                Cancelar
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

const SYNC_STALE_MS = 20 * 60_000;

function minutesAgo(iso?: string | null): string {
  if (!iso) return "nunca";
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return "hace menos de 1 min";
  if (mins < 120) return `hace ${mins} min`;
  return new Date(iso).toLocaleString();
}

function deviceHealth(d: EeyesDevice): string {
  if (d.revokedAt) return "Revocado: ya no recibe nada.";
  if (Date.parse(d.expiresAt) <= Date.now()) return "Caducado: vuelve a vincularlo.";
  if (!d.lastSyncAt) return "Nunca ha sincronizado con esta versión: abre la app en el dispositivo.";
  if (Date.now() - Date.parse(d.lastSyncAt) > SYNC_STALE_MS) {
    return "No sincroniza desde hace más de 20 min: abre la app; si pide códigos, este registro quedó huérfano.";
  }
  return "Sincronizando con normalidad.";
}

function DiagnosticsView() {
  const [devices, setDevices] = useState<EeyesDevice[]>([]);
  const [tasks, setTasks] = useState<EeyesTask[]>([]);
  const [loadedAt, setLoadedAt] = useState("");

  const load = useCallback(async () => {
    const [d, t] = await Promise.all([listEeyesDevices(), listEeyesTasks()]);
    setDevices(d);
    setTasks(
      t
        .filter((x) => x.notifyAt)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 20),
    );
    setLoadedAt(new Date().toLocaleTimeString());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const labelOf = (id: string) => devices.find((d) => d.id === id)?.label || id;

  return (
    <section className="product-dash__section">
      <h2>Diagnóstico</h2>
      <p className="lede">
        Recorrido de una notificación: se crea aquí → el dispositivo la recoge al sincronizar (al abrir la
        app o cada ~15 min) → la muestra y lo confirma. Si se queda en un paso, este panel dice cuál.
      </p>
      <button type="button" onClick={() => void load()}>
        Actualizar
      </button>
      {loadedAt ? <p className="lede">Actualizado {loadedAt}</p> : null}
      <h3>Dispositivos</h3>
      <div className="eeyes-row">
        {devices.map((d) => (
          <article key={d.id} className="eeyes-device-card">
            <strong>{d.label}</strong>
            <span className="lede">
              {d.platform} · v{d.shellVersion || "?"} · id {d.id}
            </span>
            <span className="lede">Último contacto: {minutesAgo(d.lastSeenAt)}</span>
            <span className="lede">
              Última sincronización: {minutesAgo(d.lastSyncAt)}
              {d.lastSyncAt ? ` · ${d.lastSyncNotifications ?? 0} notificaciones entregadas` : ""}
            </span>
            <span className="lede">Expira: {new Date(d.expiresAt).toLocaleString()}</span>
            <span className="lede">{deviceHealth(d)}</span>
          </article>
        ))}
      </div>
      {devices.length === 0 ? <p className="lede">No hay dispositivos vinculados.</p> : null}
      <h3>Notificaciones recientes</h3>
      <div className="eeyes-row">
        {tasks.map((t) => (
          <article key={t.id} className="eeyes-task-card">
            <strong>{t.title}</strong>
            <span className="lede">
              {isEeyesNotice(t) ? "Aviso" : "Tarea"} · {labelOf(t.deviceId)}
            </span>
            <span className="lede">Creada {fmtTime(t.createdAt)} · para {fmtTime(t.notifyAt)}</span>
            <span className="lede">{noticeStatusLabel(t)}</span>
          </article>
        ))}
      </div>
      {tasks.length === 0 ? <p className="lede">Aún no hay notificaciones.</p> : null}
    </section>
  );
}

function CompletionsView() {
  const [items, setItems] = useState<EeyesCompletion[]>([]);
  useEffect(() => {
    void listEeyesCompletions().then(setItems);
  }, []);
  return (
    <section className="product-dash__section">
      <h2>Completaciones</h2>
      {items.length === 0 ? <p className="lede">Aún no hay tareas completadas.</p> : null}
      {items.map(({ task, media }) => (
        <article key={task.id} className="eeyes-completion-card">
          <strong>{task.title}</strong>
          <span className="lede">
            Completada {task.completedAt ? new Date(task.completedAt).toLocaleString() : ""}
          </span>
          <div className="eeyes-media-grid">
            {media.map((m) =>
              m.kind === "image" ? (
                <img key={m.id} src={eeyesMediaUrl(m.id)} alt="" />
              ) : (
                <audio key={m.id} controls src={eeyesMediaUrl(m.id)} />
              ),
            )}
          </div>
        </article>
      ))}
    </section>
  );
}

function DownloadsView() {
  const [android, setAndroid] = useState<EeyesRelease>(null);
  const [desktop, setDesktop] = useState<EeyesRelease>(null);
  useEffect(() => {
    void listEeyesReleases().then((r) => {
      setAndroid(r.android);
      setDesktop(r.desktop);
    });
  }, []);

  function card(platform: "android" | "desktop", rel: EeyesRelease) {
    return (
      <article className="eeyes-device-card">
        <strong>{platform === "android" ? "Android APK" : "Desktop EXE"}</strong>
        {rel ? (
          <>
            <span className="lede">
              {rel.versionName} (code {rel.versionCode})
            </span>
            <span className="lede">sha256: {rel.sha256}</span>
            <a href={eeyesDownloadUrl(platform)}>Descargar</a>
          </>
        ) : (
          <span className="lede">Aún no hay release publicado.</span>
        )}
      </article>
    );
  }

  return (
    <section className="product-dash__section">
      <h2>Descargas</h2>
      <p className="lede">
        Instala la app, ábrela y teclea los 3 códigos de Vincular. El acceso dura 30 días y se puede
        revocar aquí al instante.
      </p>
      <div className="eeyes-row">
        {card("android", android)}
        {card("desktop", desktop)}
      </div>
    </section>
  );
}
