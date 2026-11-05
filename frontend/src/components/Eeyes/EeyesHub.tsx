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
      <p className="lede">Genera 3 códigos consecutivos y escríbelos en la app Android o Desktop.</p>
      <button type="button" onClick={() => void start()} disabled={busy}>
        {busy ? "Generando…" : "Generar códigos"}
      </button>
      {pairing ? (
        <>
          <div className="eeyes-codes" aria-live="polite">
            <div className="eeyes-code" title="Código 1">
              {pairing.code1}
            </div>
            <div className="eeyes-code" title="Código 2">
              {pairing.code2}
            </div>
            <div className="eeyes-code" title="Código 3">
              {pairing.code3}
            </div>
          </div>
          <p className="lede">
            Estado: {pairing.status}
            {pairing.status === "paired" && pairing.deviceLabel ? ` · ${pairing.deviceLabel}` : ""}
            {pairing.status !== "paired" ? ` · expira en ${secondsLeft}s` : ""}
          </p>
        </>
      ) : null}
    </section>
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

function noticeStatusLabel(t: EeyesTask): string {
  if (t.status === "completed") {
    return `Entregada ${t.completedAt ? new Date(t.completedAt).toLocaleString() : ""}`;
  }
  if (t.status === "cancelled") return "Cancelada";
  const at = t.notifyAt ? new Date(t.notifyAt) : null;
  if (at && at.getTime() > Date.now()) return `Programada ${at.toLocaleString()}`;
  return "Pendiente de entrega";
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
