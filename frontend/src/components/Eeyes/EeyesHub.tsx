/**
 * eEyes hub — pair devices, plan tasks, review completions, download shells.
 */

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
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
  eeyesBatches,
  eeyesCaptureDevices,
  eeyesDownloadUrl,
  eeyesPackAnalysis,
  eeyesUniquePackTasks,
  eeyesMediaUrl,
  eeyesNoticeStage,
  eeyesPhotoStage,
  getEeyesPairing,
  isEeyesNotice,
  isEeyesPhoto,
  listEeyesCompletions,
  listEeyesDevices,
  listEeyesReleases,
  listEeyesTasks,
  revokeEeyesDevice,
  scheduleEeyesPhoto,
  sendEeyesNotice,
  type CreateEeyesTaskInput,
  type EeyesCameraFacing,
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
  { id: "notify", title: "Notificación", description: "Enviar un aviso a cada dispositivo vinculado.", icon: "notifications" },
  {
    id: "photo",
    title: "Programar foto",
    description: "Foto automática con la cámara frontal o trasera.",
    icon: "photo_camera",
  },
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
      {view === "photo" ? <PhotoView /> : null}
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
      <p className="lede">
        {eeyesCaptureDevices(devices).length} vinculados. Un mismo aparato cuenta una vez; el teléfono, la tablet y el escritorio siguen por separado.
      </p>
      <div className="eeyes-row">
        {eeyesCaptureDevices(devices).map((d) => (
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

function deviceLabel(devices: EeyesDevice[], id: string): string {
  const found = devices.find((d) => d.id === id);
  return found ? `${found.label} (${found.platform})` : "Dispositivo";
}

async function forEachDevice(
  devices: EeyesDevice[],
  run: (deviceId: string, batchId: string) => Promise<void>,
) {
  const batchId = crypto.randomUUID();
  let sent = 0;
  let failed: unknown;
  for (const device of devices) {
    try {
      await run(device.id, batchId);
      sent += 1;
    } catch (err) {
      failed = err;
    }
  }
  if (sent === 0 && failed) throw failed;
}

function DeviceBatch({
  tasks,
  devices,
  analysis,
  render,
}: {
  tasks: EeyesTask[];
  devices: EeyesDevice[];
  analysis?: string;
  render: (task: EeyesTask) => ReactNode;
}) {
  const head = tasks[0];
  return (
    <section className="eeyes-batch">
      <h3>{head.title}</h3>
      {head.instructions ? <p className="lede">{head.instructions}</p> : null}
      {analysis ? (
        <div className="eeyes-pack-analysis">
          <strong>Análisis del paquete</strong>
          <p>{analysis}</p>
        </div>
      ) : null}
      <div className="eeyes-batch__items">
        {tasks.map((task) => (
          <article key={task.id} className="eeyes-task-card">
            <strong>{deviceLabel(devices, task.deviceId)}</strong>
            {render(task)}
          </article>
        ))}
      </div>
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
    setDevices(d);
    setTasks(t.filter((x) => !isEeyesNotice(x) && !isEeyesPhoto(x)));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (eeyesCaptureDevices(devices).length === 0) return;
    await forEachDevice(eeyesCaptureDevices(devices), (deviceId, batchId) =>
      createEeyesTask({ ...form, deviceId, batchId }),
    );
    setForm((f) => ({ ...f, title: "", instructions: "" }));
    await load();
  }

  return (
    <section className="product-dash__section">
      <h2>Tareas</h2>
      <p className="lede">La tarea, incluida la grabación de audio, se crea en cada dispositivo vinculado.</p>
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
        <button type="submit" disabled={eeyesCaptureDevices(devices).length === 0}>
          Crear en cada dispositivo
        </button>
      </form>
      {eeyesCaptureDevices(devices).length === 0 ? <p className="lede">Vincula un dispositivo antes de crear tareas.</p> : null}
      <div className="eeyes-batch-list">
        {eeyesBatches(tasks).map((group) => {
          const shown = eeyesUniquePackTasks(group, devices);
          if (shown.length === 0) return null;
          return (
          <DeviceBatch key={group[0].batchId || group[0].id} tasks={shown} devices={devices} analysis={eeyesPackAnalysis(group)} render={(t) => (
            <>
              <span className="lede">
                {t.audioSeconds > 0 ? `Audio ${t.audioSeconds} s · ` : ""}
                {t.status}
              </span>
              {t.status !== "completed" && t.status !== "cancelled" ? (
                <button type="button" onClick={() => void cancelEeyesTask(t.id).then(load)}>
                  Cancelar
                </button>
              ) : null}
            </>
          )} />
          );
        })}
      </div>
    </section>
  );
}

type NoticeWhen = "now" | "15" | "60" | "custom";

function resolveWhen(when: NoticeWhen, customAt: string): string | undefined {
  if (when === "now") return undefined;
  if (when === "custom") return customAt ? new Date(customAt).toISOString() : undefined;
  return new Date(Date.now() + Number(when) * 60_000).toISOString();
}

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
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [when, setWhen] = useState<NoticeWhen>("now");
  const [customAt, setCustomAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentLine, setSentLine] = useState("");

  const load = useCallback(async () => {
    const [d, t] = await Promise.all([listEeyesDevices(), listEeyesTasks()]);
    setDevices(d);
    setNotices(
      t
        .filter(isEeyesNotice)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (when === "custom" && !customAt) return;
    const targets = eeyesCaptureDevices(devices);
    if (targets.length === 0) return;
    setBusy(true);
    setSentLine("");
    try {
      const notifyAt = resolveWhen(when, customAt);
      await forEachDevice(targets, (deviceId, batchId) =>
        sendEeyesNotice({ deviceId, title, message, notifyAt, batchId }).then(() => undefined),
      );
      setTitle("");
      setMessage("");
      setSentLine(`Enviada a ${targets.length} dispositivo${targets.length === 1 ? "" : "s"}.`);
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
        Cada dispositivo vinculado mantiene una conexión abierta, refresca cada 15 minutos con la
        app cerrada y también al volver internet. El aviso se crea en todos.
      </p>
      <form className="eeyes-form" onSubmit={(e) => void onSubmit(e)}>
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
        <button type="submit" disabled={busy || eeyesCaptureDevices(devices).length === 0}>
          {busy ? "Enviando…" : "Enviar a cada dispositivo"}
        </button>
        {sentLine ? <p className="lede" aria-live="polite">{sentLine}</p> : null}
      </form>
      {eeyesCaptureDevices(devices).length === 0 ? <p className="lede">Vincula un dispositivo antes de enviar avisos.</p> : null}
      <div className="eeyes-batch-list">
        {eeyesBatches(notices).map((group) => {
          const shown = eeyesUniquePackTasks(group, devices);
          if (shown.length === 0) return null;
          return (
          <DeviceBatch key={group[0].batchId || group[0].id} tasks={shown} devices={devices} analysis={eeyesPackAnalysis(group)} render={(t) => (
            <>
              <span className="lede">{noticeStatusLabel(t)}</span>
              {t.status === "pending" ? (
                <button type="button" onClick={() => void cancelEeyesTask(t.id).then(load)}>
                  Cancelar
                </button>
              ) : null}
            </>
          )} />
          );
        })}
      </div>
    </section>
  );
}

const CAMERA_LABEL: Record<EeyesCameraFacing, string> = { back: "Trasera", front: "Frontal" };

function photoStatusLabel(t: EeyesTask): string {
  switch (eeyesPhotoStage(t)) {
    case "uploaded":
      return `Foto recibida ${fmtTime(t.completedAt)}`;
    case "cancelled":
      return "Cancelada";
    case "taken":
      return `Tomada ${fmtTime(t.notifyAckedAt)} · subiendo al servidor`;
    case "dispatched":
      return `Enviada al dispositivo ${fmtTime(t.notifyDispatchedAt)} · esperando la cámara`;
    case "scheduled":
      return `Programada ${fmtTime(t.notifyAt)}`;
    default:
      return "Esperando a que el dispositivo sincronice";
  }
}

const PHOTO_POLL_MS = 5_000;

function PhotoView() {
  const [devices, setDevices] = useState<EeyesDevice[]>([]);
  const [photos, setPhotos] = useState<EeyesTask[]>([]);
  const [mediaByTask, setMediaByTask] = useState<Record<string, { id: string; analysis?: string }[]>>({});
  const [title, setTitle] = useState("Foto programada");
  const [facing, setFacing] = useState<EeyesCameraFacing>("back");
  const [when, setWhen] = useState<NoticeWhen>("now");
  const [customAt, setCustomAt] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [d, t, c] = await Promise.all([listEeyesDevices(), listEeyesTasks(), listEeyesCompletions()]);
    setDevices(d);
    setPhotos(t.filter(isEeyesPhoto).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
    const media: Record<string, { id: string; analysis?: string }[]> = {};
    for (const { task, media: items } of c) {
      if (isEeyesPhoto(task)) {
        media[task.id] = items
          .filter((m) => m.kind === "image")
          .map((m) => ({ id: m.id, analysis: m.analysis }));
      }
    }
    setMediaByTask(media);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const waiting = photos.some((t) => t.status === "pending" || t.status === "in_progress");
  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(() => void load().catch(() => undefined), PHOTO_POLL_MS);
    return () => window.clearInterval(timer);
  }, [waiting, load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (when === "custom" && !customAt) return;
    const targets = eeyesCaptureDevices(devices);
    if (targets.length === 0) return;
    setBusy(true);
    try {
      const notifyAt = resolveWhen(when, customAt);
      await forEachDevice(targets, (deviceId, batchId) =>
        scheduleEeyesPhoto({ deviceId, title, cameraFacing: facing, notifyAt, batchId }),
      );
      await load();
    } catch {
      /* unwrap already opened the error modal */
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="product-dash__section">
      <h2>Programar foto</h2>
      <p className="lede">
        A la hora indicada cada dispositivo vinculado toma una foto con la cámara elegida y la sube.
        El teléfono muestra el indicador de cámara y un aviso cada vez que toma una.
      </p>
      <form className="eeyes-form" onSubmit={(e) => void onSubmit(e)}>
        <label>
          Cámara
          <select value={facing} onChange={(e) => setFacing(e.target.value as EeyesCameraFacing)}>
            <option value="back">Trasera</option>
            <option value="front">Frontal</option>
          </select>
        </label>
        <label>
          Título
          <input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
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
        <button type="submit" disabled={busy || eeyesCaptureDevices(devices).length === 0}>
          {busy ? "Programando…" : "Programar en cada dispositivo"}
        </button>
      </form>
      {eeyesCaptureDevices(devices).length === 0 ? <p className="lede">Vincula un dispositivo antes de programar fotos.</p> : null}
      <div className="eeyes-batch-list">
        {eeyesBatches(photos).map((group) => {
          const shown = eeyesUniquePackTasks(group, devices);
          if (shown.length === 0) return null;
          return (
          <DeviceBatch key={group[0].batchId || group[0].id} tasks={shown} devices={devices} analysis={eeyesPackAnalysis(group)} render={(t) => (
            <>
              <span className="lede">
                Cámara {CAMERA_LABEL[t.cameraFacing ?? "back"]} · {photoStatusLabel(t)}
              </span>
              {mediaByTask[t.id]?.length ? (
                <div className="eeyes-media-grid">
                  {mediaByTask[t.id].map((item) => (
                    <figure key={item.id} className="eeyes-media-frame">
                      <img src={eeyesMediaUrl(item.id)} alt={t.title} />
                      {item.analysis ? <figcaption>{item.analysis}</figcaption> : null}
                    </figure>
                  ))}
                </div>
              ) : null}
              {t.status === "pending" ? (
                <button type="button" onClick={() => void cancelEeyesTask(t.id).then(load)}>
                  Cancelar
                </button>
              ) : null}
            </>
          )} />
          );
        })}
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
  const [devices, setDevices] = useState<EeyesDevice[]>([]);
  useEffect(() => {
    void Promise.all([listEeyesCompletions(), listEeyesDevices()]).then(([rows, all]) => {
      setItems(rows);
      setDevices(all);
    });
  }, []);
  const groups = eeyesBatches(items.map((row) => row.task)).map((tasks) =>
    tasks.map((task) => items.find((row) => row.task.id === task.id)!),
  );
  return (
    <section className="product-dash__section">
      <h2>Completaciones</h2>
      {items.length === 0 ? <p className="lede">Aún no hay tareas completadas.</p> : null}
      <div className="eeyes-batch-list">
        {groups.map((group) => {
          const shown = eeyesUniquePackTasks(group.map((row) => row.task), devices);
          if (shown.length === 0) return null;
          return (
          <DeviceBatch
            key={group[0].task.batchId || group[0].task.id}
            tasks={shown}
            devices={devices}
            analysis={eeyesPackAnalysis(group.map((row) => row.task))}
            render={(task) => {
              const media = group.find((row) => row.task.id === task.id)?.media ?? [];
              return (
                <>
                  <span className="lede">
                    Completada {task.completedAt ? new Date(task.completedAt).toLocaleString() : ""}
                  </span>
                  <div className="eeyes-media-grid">
                    {media.map((m) =>
                      m.kind === "image" ? (
                        <figure key={m.id} className="eeyes-media-frame">
                          <img src={eeyesMediaUrl(m.id)} alt="" />
                          {m.analysis ? <figcaption>{m.analysis}</figcaption> : null}
                        </figure>
                      ) : (
                        <figure key={m.id} className="eeyes-media-frame">
                          <audio controls src={eeyesMediaUrl(m.id)} />
                          {m.analysis ? <figcaption>{m.analysis}</figcaption> : null}
                        </figure>
                      ),
                    )}
                  </div>
                </>
              );
            }}
          />
          );
        })}
      </div>
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
