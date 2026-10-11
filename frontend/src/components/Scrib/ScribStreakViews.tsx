/**
 * Scrib streak views — config, today, side-by-side sheets, stats.
 */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ViewLoading } from "../ViewLoading/ViewLoading";
import {
  fetchScribLibrary,
  fetchScribSheet,
  scribSheetHref,
  SCRIB_PAGE_HEIGHT_MM,
  SCRIB_PAGE_WIDTH_MM,
  type ScribBookCard,
  type ScribSheet,
} from "../../lib/scrib";
import { SCRIB_BIBLE_BOOKS } from "../../lib/scribBible";
import {
  completeScribStreakDay,
  fetchScribStreakConfig,
  fetchScribStreakDays,
  fetchScribStreakStats,
  fetchScribStreakToday,
  saveScribStreakConfig,
  type ScribStreakConfig,
  type ScribStreakItem,
  type ScribStreakKind,
  type ScribStreakStats,
  type ScribStreakToday,
  type ScribStreakDay,
} from "../../lib/scribStreak";
import { DashboardSection } from "../ProductDashboard/ProductDashboard";

type DraftItem = {
  key: string;
  kind: ScribStreakKind;
  label: string;
  quantityPerDay: number;
  scribBookId: string;
  scribSheetId: string;
  bibleBookId: string;
  chapter: number;
  verse: number;
  paragraphId: string;
  id?: string;
};

function newDraftKey(): string {
  return `d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function itemToDraft(item: ScribStreakItem): DraftItem {
  return {
    key: item.id || newDraftKey(),
    id: item.id,
    kind: item.kind,
    label: item.label,
    quantityPerDay: item.quantityPerDay || 1,
    scribBookId: item.scribBookId,
    scribSheetId: item.scribSheetId,
    bibleBookId: item.cursor.bible?.bibleBookId || "romans",
    chapter: item.cursor.bible?.chapter || 1,
    verse: item.cursor.bible?.verse || 1,
    paragraphId: item.cursor.institutes?.paragraphId || "I.I.1",
  };
}

function emptyDraft(): DraftItem {
  return {
    key: newDraftKey(),
    kind: "bible",
    label: "",
    quantityPerDay: 1,
    scribBookId: "",
    scribSheetId: "",
    bibleBookId: "romans",
    chapter: 1,
    verse: 1,
    paragraphId: "I.I.1",
  };
}

function draftToItem(d: DraftItem): ScribStreakItem {
  if (d.kind === "bible") {
    const cursor = {
      bible: {
        bibleBookId: d.bibleBookId,
        chapter: d.chapter,
        verse: d.verse,
      },
    };
    return {
      id: d.id || "",
      kind: "bible",
      label: d.label.trim() || d.bibleBookId,
      quantityPerDay: d.quantityPerDay,
      scribBookId: d.scribBookId,
      scribSheetId: d.scribSheetId,
      cursor,
      startCursor: cursor,
    };
  }
  const cursor = { institutes: { paragraphId: d.paragraphId.trim() } };
  return {
    id: d.id || "",
    kind: "institutes",
    label: d.label.trim() || `Institutes ${d.paragraphId}`,
    quantityPerDay: d.quantityPerDay,
    scribBookId: d.scribBookId,
    scribSheetId: d.scribSheetId,
    cursor,
    startCursor: cursor,
  };
}

function SheetMiniPreview({ sheet }: { sheet: ScribSheet | null }) {
  if (!sheet) {
    return <p className="scrib-streak__muted">Sin hoja</p>;
  }
  return (
    <svg
      className="scrib-streak__mini-sheet"
      viewBox={`0 0 ${SCRIB_PAGE_WIDTH_MM} ${SCRIB_PAGE_HEIGHT_MM}`}
      role="img"
      aria-label={sheet.name}
    >
      <rect
        x={0}
        y={0}
        width={SCRIB_PAGE_WIDTH_MM}
        height={SCRIB_PAGE_HEIGHT_MM}
        fill="var(--color-surface)"
        stroke="var(--color-border)"
        strokeWidth={0.2}
      />
      {sheet.layers.map((layer) =>
        layer.paths.map((path, i) => (
          <path
            key={`${layer.id}-${i}`}
            d={path.d}
            fill="none"
            stroke="var(--color-text)"
            strokeWidth={path.strokeWidth}
            opacity={layer.opacity}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )),
      )}
    </svg>
  );
}

export function ScribStreakConfigView() {
  const [books, setBooks] = useState<ScribBookCard[]>([]);
  const [userSafe, setUserSafe] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [drafts, setDrafts] = useState<DraftItem[]>([emptyDraft()]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [lib, cfgRes] = await Promise.all([fetchScribLibrary(), fetchScribStreakConfig()]);
    if (lib.error) setError(lib.error);
    setUserSafe(lib.userSafe);
    setBooks(lib.books);
    if (cfgRes.error) setError(cfgRes.error);
    if (cfgRes.config) {
      setEnabled(cfgRes.config.enabled);
      setReminderEnabled(cfgRes.config.reminderEnabled);
      setStartDate(cfgRes.config.startDate || "");
      setDrafts(
        cfgRes.config.items.length > 0
          ? cfgRes.config.items.map(itemToDraft)
          : [emptyDraft()],
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOk("");
    const config: ScribStreakConfig = {
      enabled,
      reminderEnabled,
      startDate,
      items: drafts.map(draftToItem),
    };
    const res = await saveScribStreakConfig(config);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setOk("Configuración guardada.");
    if (res.config) {
      setDrafts(res.config.items.map(itemToDraft));
      setStartDate(res.config.startDate);
    }
  }

  function sheetsForBook(bookId: string) {
    return books.find((b) => b.id === bookId)?.sheets ?? [];
  }

  if (loading) return <ViewLoading label="Loading streak config" />;

  return (
    <DashboardSection title="Configurar racha">
      <form className="scrib-streak__form" onSubmit={onSave}>
        <label className="scrib-streak__check">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Racha activa
        </label>
        <label className="scrib-streak__check">
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
          />
          Recordatorio diario (03:00 Caracas)
        </label>
        <label className="scrib-streak__field">
          Fecha de inicio
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </label>

        {drafts.map((d, index) => (
          <fieldset key={d.key} className="scrib-streak__item">
            <legend>Ítem {index + 1}</legend>
            <label className="scrib-streak__field">
              Tipo
              <select
                value={d.kind}
                onChange={(e) => {
                  const kind = e.target.value as ScribStreakKind;
                  setDrafts((prev) =>
                    prev.map((x) => (x.key === d.key ? { ...x, kind } : x)),
                  );
                }}
              >
                <option value="bible">Biblia</option>
                <option value="institutes">Calvin&apos;s Institutes</option>
              </select>
            </label>
            <label className="scrib-streak__field">
              Etiqueta
              <input
                value={d.label}
                onChange={(e) =>
                  setDrafts((prev) =>
                    prev.map((x) =>
                      x.key === d.key ? { ...x, label: e.target.value } : x,
                    ),
                  )
                }
                placeholder="Romans"
              />
            </label>
            <label className="scrib-streak__field">
              Cantidad por día
              <input
                type="number"
                min={1}
                max={50}
                value={d.quantityPerDay}
                onChange={(e) =>
                  setDrafts((prev) =>
                    prev.map((x) =>
                      x.key === d.key
                        ? { ...x, quantityPerDay: Number(e.target.value) || 1 }
                        : x,
                    ),
                  )
                }
              />
            </label>

            {d.kind === "bible" ? (
              <>
                <label className="scrib-streak__field">
                  Libro bíblico
                  <select
                    value={d.bibleBookId}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((x) =>
                          x.key === d.key
                            ? { ...x, bibleBookId: e.target.value }
                            : x,
                        ),
                      )
                    }
                  >
                    {SCRIB_BIBLE_BOOKS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="scrib-streak__field">
                  Capítulo inicial
                  <input
                    type="number"
                    min={1}
                    value={d.chapter}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((x) =>
                          x.key === d.key
                            ? { ...x, chapter: Number(e.target.value) || 1 }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
                <label className="scrib-streak__field">
                  Versículo inicial
                  <input
                    type="number"
                    min={1}
                    value={d.verse}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((x) =>
                          x.key === d.key
                            ? { ...x, verse: Number(e.target.value) || 1 }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
              </>
            ) : (
              <label className="scrib-streak__field">
                Párrafo inicial (p. ej. I.I.1)
                <input
                  value={d.paragraphId}
                  onChange={(e) =>
                    setDrafts((prev) =>
                      prev.map((x) =>
                        x.key === d.key
                          ? { ...x, paragraphId: e.target.value }
                          : x,
                      ),
                    )
                  }
                />
              </label>
            )}

            <label className="scrib-streak__field">
              Sección Scrib
              <select
                value={d.scribBookId}
                required
                onChange={(e) => {
                  const bookId = e.target.value;
                  const sheets = sheetsForBook(bookId);
                  setDrafts((prev) =>
                    prev.map((x) =>
                      x.key === d.key
                        ? {
                            ...x,
                            scribBookId: bookId,
                            scribSheetId: sheets[0]?.id || "",
                          }
                        : x,
                    ),
                  );
                }}
              >
                <option value="">Elegir sección</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="scrib-streak__field">
              Hoja de trabajo
              <select
                value={d.scribSheetId}
                required
                onChange={(e) =>
                  setDrafts((prev) =>
                    prev.map((x) =>
                      x.key === d.key
                        ? { ...x, scribSheetId: e.target.value }
                        : x,
                    ),
                  )
                }
              >
                <option value="">Elegir hoja</option>
                {sheetsForBook(d.scribBookId).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            {d.scribBookId && d.scribSheetId ? (
              <a
                className="scrib-streak__link"
                href={scribSheetHref(userSafe, d.scribBookId, d.scribSheetId)}
              >
                Abrir hoja
              </a>
            ) : null}
            <button
              type="button"
              className="btn"
              disabled={drafts.length <= 1}
              onClick={() =>
                setDrafts((prev) => prev.filter((x) => x.key !== d.key))
              }
            >
              Quitar ítem
            </button>
          </fieldset>
        ))}

        <div className="scrib-streak__actions">
          <button
            type="button"
            className="btn"
            onClick={() => setDrafts((prev) => [...prev, emptyDraft()])}
          >
            Añadir ítem
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            Guardar
          </button>
        </div>
        {error ? <p className="scrib-dashboard__error">{error}</p> : null}
        {ok ? <p className="scrib-streak__ok">{ok}</p> : null}
      </form>
    </DashboardSection>
  );
}

export function ScribStreakTodayView() {
  const [today, setToday] = useState<ScribStreakToday | null>(null);
  const [userSafe, setUserSafe] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    const [lib, res] = await Promise.all([fetchScribLibrary(), fetchScribStreakToday()]);
    setUserSafe(lib.userSafe);
    if (res.error) setError(res.error);
    setToday(res.today);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onComplete() {
    if (!today || busy) return;
    setBusy(true);
    setError("");
    const res = await completeScribStreakDay(today.date);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    await reload();
  }

  if (loading) return <ViewLoading label="Loading today" />;

  return (
    <DashboardSection title="Hoy">
      {!today?.enabled ? (
        <p className="scrib-streak__muted">
          La racha no está activa. Configúrala en «Configurar racha».
        </p>
      ) : null}
      {today ? (
        <>
          <p className="scrib-streak__meta">
            Fecha {today.date}
            {today.completed ? " · Completado" : " · Pendiente"}
          </p>
          <ul className="scrib-streak__list">
            {today.assignments.map((asg) => (
              <li key={asg.itemId} className="scrib-streak__list-item">
                <strong>{asg.label}</strong>
                <span>
                  {asg.units.map((u) => u.label).join(", ") || "—"}
                </span>
                <a
                  className="scrib-streak__link"
                  href={scribSheetHref(userSafe, asg.scribBookId, asg.scribSheetId)}
                >
                  Abrir hoja
                </a>
              </li>
            ))}
          </ul>
          {!today.completed && today.assignments.length > 0 ? (
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy}
              onClick={() => void onComplete()}
            >
              Marcar día completo
            </button>
          ) : null}
        </>
      ) : null}
      {error ? <p className="scrib-dashboard__error">{error}</p> : null}
    </DashboardSection>
  );
}

export function ScribStreakSheetsView() {
  const [items, setItems] = useState<ScribStreakItem[]>([]);
  const [sheets, setSheets] = useState<Record<string, ScribSheet | null>>({});
  const [userSafe, setUserSafe] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const [lib, cfg] = await Promise.all([
        fetchScribLibrary(),
        fetchScribStreakConfig(),
      ]);
      setUserSafe(lib.userSafe);
      if (cfg.error) setError(cfg.error);
      const list = cfg.config?.items ?? [];
      setItems(list);
      const loaded: Record<string, ScribSheet | null> = {};
      await Promise.all(
        list.map(async (item) => {
          const key = `${item.scribBookId}:${item.scribSheetId}`;
          const res = await fetchScribSheet(item.scribBookId, item.scribSheetId);
          loaded[key] = res.sheet;
        }),
      );
      setSheets(loaded);
      setLoading(false);
    })();
  }, []);

  if (loading) return <ViewLoading label="Loading sheets" />;

  return (
    <DashboardSection title="Hojas del día">
      {items.length === 0 ? (
        <p className="scrib-streak__muted">No hay ítems configurados.</p>
      ) : (
        <div className="scrib-streak__sheets">
          {items.map((item) => {
            const key = `${item.scribBookId}:${item.scribSheetId}`;
            return (
              <article key={item.id || key} className="scrib-streak__sheet-card">
                <h3>{item.label}</h3>
                <SheetMiniPreview sheet={sheets[key] ?? null} />
                <a
                  className="scrib-streak__link"
                  href={scribSheetHref(userSafe, item.scribBookId, item.scribSheetId)}
                >
                  Abrir en editor
                </a>
              </article>
            );
          })}
        </div>
      )}
      {error ? <p className="scrib-dashboard__error">{error}</p> : null}
    </DashboardSection>
  );
}

export function ScribStreakStatsView() {
  const [stats, setStats] = useState<ScribStreakStats | null>(null);
  const [days, setDays] = useState<ScribStreakDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const [s, d] = await Promise.all([
        fetchScribStreakStats(),
        fetchScribStreakDays(),
      ]);
      if (s.error) setError(s.error);
      if (d.error) setError(d.error);
      setStats(s.stats);
      setDays(d.days);
      setLoading(false);
    })();
  }, []);

  const sorted = useMemo(
    () => [...days].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [days],
  );

  if (loading) return <ViewLoading label="Loading streak" />;

  return (
    <DashboardSection title="Racha">
      {stats ? (
        <div className="scrib-streak__stats">
          <p>
            Racha actual: <strong>{stats.currentStreak}</strong>
          </p>
          <p>
            Mejor racha: <strong>{stats.bestStreak}</strong>
          </p>
          <p>
            Días completados: <strong>{stats.completedDays}</strong>
          </p>
          <p>
            Hoy ({stats.todayDate}):{" "}
            {stats.todayDone ? "completado" : "pendiente"}
          </p>
        </div>
      ) : null}
      <ul className="scrib-streak__list">
        {sorted.map((day) => (
          <li key={day.date} className="scrib-streak__list-item">
            <strong>{day.date}</strong>
            <span>
              {day.assignments.map((a) => a.label).join(" · ") || "Completado"}
            </span>
          </li>
        ))}
      </ul>
      {error ? <p className="scrib-dashboard__error">{error}</p> : null}
    </DashboardSection>
  );
}
