import { useCallback, useEffect, useRef, useState } from "react";
import { synthesizeVoice } from "../../lib/api";
import {
  analyzeEocode,
  editEocode,
  fetchEocodeFile,
  fetchEocodeState,
  identifyEocode,
  uploadEocodeAsset,
  validateEocode,
  type EocodeFileEntry,
} from "../../lib/eocode";
import { renderMarkdown } from "../../lib/markdown";
import {
  enqueueVoiceAudio,
  startVoiceHost,
  voiceLang,
  voiceReplyEnabled,
  type VoiceHost,
} from "../../lib/voice";
import "./EocodeStudio.css";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: number;
  role: ChatRole;
  content: string;
  assets?: { url: string; path: string }[];
};

type ViewFile = {
  path: string;
  type: string;
  content: string;
};

type AccessState = "loading" | "ok" | "signin" | "denied" | "error";

/** Strips markdown so spoken replies stay readable. */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*#+\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isMarkdownPath(path: string): boolean {
  return path.toLowerCase().endsWith(".md");
}

/** Appends a redacted backend detail block so failures are visible in the chat. */
function withDetail(message: string, detail?: string): string {
  return detail ? `${message}\n\n\`\`\`\n${detail}\n\`\`\`` : message;
}

function fileIcon(type: string): string {
  switch (type) {
    case "python":
      return "code";
    case "image":
      return "image";
    case "svg":
      return "polyline";
    case "rule":
    case "markdown":
      return "rule";
    default:
      return "description";
  }
}

function Markdown({ text, className = "eocode-msg-body" }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      renderMarkdown(text, ref.current);
    }
  }, [text]);
  return <div className={className} ref={ref} />;
}

export default function EocodeStudio() {
  const [access, setAccess] = useState<AccessState>("loading");
  const [files, setFiles] = useState<EocodeFileEntry[]>([]);
  const [viewFile, setViewFile] = useState<ViewFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState("/api/eocode/preview/");
  const [previewVersion, setPreviewVersion] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [pendingAssets, setPendingAssets] = useState<{ url: string; path: string }[]>([]);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const previewPaneRef = useRef<HTMLElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const micRef = useRef<HTMLButtonElement | null>(null);
  const speakToggleRef = useRef<HTMLButtonElement | null>(null);
  const voiceCaptionRef = useRef<HTMLParagraphElement | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const nextId = useRef(1);

  const loadState = useCallback(async () => {
    const result = await fetchEocodeState();
    if (result.status === 200 && result.state) {
      setFiles(result.state.files);
      if (result.state.preview_url) {
        setPreviewUrl(result.state.preview_url);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await fetchEocodeState();
        if (cancelled) return;
        if (result.status === 401) {
          setAccess("signin");
          return;
        }
        if (result.status === 403) {
          setAccess("denied");
          return;
        }
        if (result.status !== 200 || !result.state) {
          setAccess("error");
          return;
        }
        setFiles(result.state.files);
        setPreviewUrl(result.state.preview_url || "/api/eocode/preview/");
        setAccess("ok");
      } catch {
        if (!cancelled) setAccess("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const log = logRef.current;
    if (log) {
      log.scrollTop = log.scrollHeight;
    }
  }, [messages, stage]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const speakReply = useCallback(async (text: string) => {
    if (!voiceReplyEnabled()) {
      return;
    }
    const plain = stripMarkdown(text).slice(0, 500);
    if (!plain) {
      return;
    }
    const audio = await synthesizeVoice(plain, voiceLang());
    if (audio) {
      enqueueVoiceAudio(audio.base64, audio.mime);
    }
  }, []);

  useEffect(() => {
    if (access !== "ok") {
      return;
    }
    const mic = micRef.current;
    if (!mic) {
      return;
    }
    const host: VoiceHost = {
      mic,
      toggle: speakToggleRef.current,
      caption: voiceCaptionRef.current,
      setDraft: (text) => setDraft(text),
      setBusy: (value) => setBusy(value),
      history: () =>
        messagesRef.current
          .slice(-6)
          .map((message) => ({ role: message.role, content: message.content }))
          .filter((message) => message.content),
    };
    startVoiceHost(host);
  }, [access]);

  const pushMessage = useCallback((role: ChatRole, content: string, assets?: ChatMessage["assets"]) => {
    setMessages((prev) => [...prev, { id: nextId.current++, role, content, assets }]);
  }, []);

  const patchLastAssistant = useCallback((content: string) => {
    setMessages((prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i >= 0; i -= 1) {
        if (copy[i].role === "assistant") {
          copy[i] = { ...copy[i], content };
          break;
        }
      }
      return copy;
    });
  }, []);

  const onAttach = useCallback(async (list: FileList | null) => {
    if (!list) return;
    for (const file of Array.from(list)) {
      const result = await uploadEocodeAsset(file);
      if (result.ok) {
        setPendingAssets((prev) => [...prev, { url: result.data.url, path: result.data.path }]);
      }
    }
  }, []);

  const openFile = useCallback(async (file: EocodeFileEntry) => {
    if (file.type === "image" || file.type === "svg") {
      setViewFile({ path: file.path, type: file.type, content: "" });
      return;
    }
    const content = await fetchEocodeFile(file.path);
    if (content) {
      setViewFile(content);
    }
  }, []);

  const backToSite = useCallback(() => {
    setViewFile(null);
  }, []);

  const newChat = useCallback(() => {
    setMessages([]);
    setStage("");
    setViewFile(null);
    void loadState();
  }, [loadState]);

  const reloadSite = useCallback(() => {
    setViewFile(null);
    setPreviewVersion((v) => v + 1);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const node = previewPaneRef.current;
    if (!node) {
      return;
    }
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void node.requestFullscreen?.();
    }
  }, []);

  const send = useCallback(async () => {
    if (busy) return;
    const text = draft.trim();
    if (!text && pendingAssets.length === 0) return;
    const attached = pendingAssets;
    setPendingAssets([]);
    setDraft("");
    const message = text || "Revisa las imagenes que adjunte.";
    const withAssets = attached.length
      ? `${message}\n\n[Imagenes subidas: ${attached.map((a) => a.path).join(", ")}]`
      : message;
    pushMessage("user", text || "Imagen adjunta", attached);
    pushMessage("assistant", "");
    setBusy(true);
    let finalText = "";
    const setAssistant = (next: string) => {
      finalText = next;
      patchLastAssistant(next);
    };
    try {
      setStage("Clasificando la peticion...");
      const identified = await identifyEocode(withAssets);
      if (!identified.ok) {
        setAssistant(withDetail(identified.message, identified.detail));
        return;
      }
      if (identified.data.type === "consult") {
        setAssistant(identified.data.text || "(Sin respuesta)");
        void speakReply(finalText);
        return;
      }
      setStage("Analizando el cambio...");
      const analyzed = await analyzeEocode(withAssets);
      if (!analyzed.ok) {
        setAssistant(withDetail(analyzed.message, analyzed.detail));
        return;
      }
      const plan = analyzed.data;
      const targets = [...plan.files_to_edit.map((p) => p.path), ...plan.new_files.map((p) => p.path)];
      let summary = plan.preliminary || "";
      if (targets.length) {
        summary += `\n\n**Archivos previstos:** ${targets.map((t) => `\`${t}\``).join(", ")}`;
      }
      if (plan.delete_files.length) {
        summary += `\n\n**Archivos a borrar:** ${plan.delete_files.map((p) => `\`${p.path}\``).join(", ")}`;
      }
      if (plan.questions.length) {
        summary += `\n\n**Preguntas de clarificacion:**\n${plan.questions.map((q) => `- ${q}`).join("\n")}`;
      }
      setAssistant(summary);
      if (!targets.length && plan.delete_files.length === 0) {
        return;
      }
      setStage("Escribiendo archivos...");
      const edited = await editEocode(withAssets, plan);
      if (!edited.ok) {
        setAssistant(`${summary}\n\n${withDetail(edited.message, edited.detail)}`);
        return;
      }
      const written = edited.data.files;
      let done = `${summary}\n\n**Archivos escritos:** ${written.map((f) => `\`${f}\``).join(", ")}`;
      if (edited.data.changed.length) {
        done += `\n\n**Con cambios reales:** ${edited.data.changed.map((f) => `\`${f}\``).join(", ")}`;
      }
      if (edited.data.unchanged.length) {
        done += `\n\n**Sin cambios reales:** ${edited.data.unchanged.map((f) => `\`${f}\``).join(", ")} (el agente devolvio el mismo contenido).`;
      }
      if (edited.data.deleted.length) {
        done += `\n\n**Archivos borrados:** ${edited.data.deleted.map((f) => `\`${f}\``).join(", ")}`;
      }
      if (edited.data.render_ok === false) {
        done += `\n\n**El sitio no renderiza.**${edited.data.render_error ? `\n\n\`\`\`\n${edited.data.render_error}\n\`\`\`` : ""}`;
      }
      setAssistant(done);
      if (written.length) {
        setStage("Validando el cambio...");
        const validated = await validateEocode(withAssets, written);
        if (!validated.ok) {
          setAssistant(`${done}\n\n${withDetail(validated.message, validated.detail)}`);
        } else {
          let tail = "";
          if (validated.data.needs_correction && validated.data.files.length) {
            tail = `\n\n**Corregidos:** ${validated.data.files.map((f) => `\`${f}\``).join(", ")}`;
          }
          if (validated.data.notes) {
            tail += `\n\n${validated.data.notes}`;
          }
          setAssistant(`${done}${tail}`);
        }
      }
      await loadState();
      setViewFile(null);
      setPreviewVersion((v) => v + 1);
      void speakReply(finalText);
    } catch {
      setAssistant("Algo salio mal. Intenta de nuevo.");
    } finally {
      setBusy(false);
      setStage("");
    }
  }, [busy, draft, pendingAssets, pushMessage, patchLastAssistant, loadState, speakReply]);

  const printPreview = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      win.focus();
      win.print();
    }
  }, []);

  if (access === "loading") {
    return (
      <section className="eocode-gate">
        <h1>eocode</h1>
        <p className="lede">Cargando el estudio de programacion...</p>
      </section>
    );
  }

  if (access === "signin") {
    return (
      <section className="eocode-gate">
        <h1>eocode</h1>
        <p className="lede">Inicia sesion para usar el estudio de programacion.</p>
        <a className="btn btn--primary" href="/session?next=%2Feocode">
          Iniciar sesion
        </a>
      </section>
    );
  }

  if (access === "denied") {
    return (
      <section className="eocode-gate">
        <h1>eocode</h1>
        <p className="lede">
          eocode es un estudio privado. Pidele a un administrador que te conceda acceso.
        </p>
        <a className="btn" href="/contact">
          Contacto
        </a>
      </section>
    );
  }

  if (access === "error") {
    return (
      <section className="eocode-gate">
        <h1>eocode</h1>
        <p className="lede">No se pudo cargar el estudio. Intenta recargar la pagina.</p>
      </section>
    );
  }

  const previewSrc = `${previewUrl}${previewUrl.includes("?") ? "&" : "?"}v=${previewVersion}`;

  return (
    <div className="eocode-studio">
      <section className="eocode-chat-pane" aria-label="Chat de programacion">
        <div className="eocode-log" ref={logRef}>
          {messages.length === 0 ? (
            <p className="hint">
              Pidele al agente que programe tu portafolio. El sitio es un motor SSR en
              Python: el agente edita los generadores de HTML.
            </p>
          ) : null}
          {messages.map((item) => (
            <article key={item.id} className={`eocode-msg eocode-msg-${item.role}`}>
              {item.assets?.length ? (
                <div className="agent-chat-msg-thumbs">
                  {item.assets.map((asset) => (
                    <img key={asset.path} src={asset.url} alt="" />
                  ))}
                </div>
              ) : null}
              <Markdown text={item.content} />
            </article>
          ))}
          {stage ? <p className="eocode-stage">{stage}</p> : null}
        </div>

        {pendingAssets.length ? (
          <div className="agent-chat-thumbs eocode-pending">
            {pendingAssets.map((asset) => (
              <span className="agent-chat-thumb" key={asset.path}>
                <img src={asset.url} alt="" />
                <button
                  className="icon-btn"
                  type="button"
                  aria-label="Quitar imagen"
                  onClick={() => setPendingAssets((prev) => prev.filter((a) => a.path !== asset.path))}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">close</span>
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <form
          className="agent-chat-form"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <div className="agent-chat-composer">
            <p className="agent-chat-voice" ref={voiceCaptionRef} hidden aria-live="polite"></p>
            <div className="agent-chat-compose-row">
              <div className="eocode-fields">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void send();
                    }
                  }}
                  rows={1}
                  maxLength={4000}
                  aria-label="Mensaje"
                  placeholder="Describe el cambio o pregunta sobre tu sitio."
                />
                <label className="agent-chat-drop">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    hidden
                    onChange={(event) => {
                      const list = event.target.files;
                      event.target.value = "";
                      void onAttach(list);
                    }}
                  />
                  <span className="material-symbols-outlined" aria-hidden="true">imagesmode</span>
                  <span className="hint">Imagenes</span>
                </label>
              </div>
              <div className="agent-chat-tools">
                <button
                  ref={speakToggleRef}
                  className="icon-btn"
                  type="button"
                  hidden
                  aria-pressed="true"
                  aria-label="Leer respuestas"
                  title="Leer respuestas"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">volume_up</span>
                </button>
                <button
                  ref={micRef}
                  className="icon-btn"
                  type="button"
                  hidden
                  aria-pressed="false"
                  aria-label="Grabar voz"
                  title="Grabar voz"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">mic</span>
                </button>
                <button
                  className="btn btn--primary eocode-send"
                  type="submit"
                  disabled={busy || (!draft.trim() && pendingAssets.length === 0)}
                  aria-label="Enviar"
                  title="Enviar"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">send</span>
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="eocode-actions" role="toolbar" aria-label="Acciones del estudio">
          <button className="icon-btn" type="button" onClick={newChat} aria-label="Nuevo chat" title="Nuevo chat">
            <span className="material-symbols-outlined" aria-hidden="true">add_comment</span>
          </button>
          <button className="icon-btn" type="button" onClick={reloadSite} aria-label="Recargar sitio" title="Recargar sitio">
            <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
          </button>
          <button className="icon-btn" type="button" onClick={printPreview} aria-label="Imprimir a PDF" title="Imprimir a PDF">
            <span className="material-symbols-outlined" aria-hidden="true">print</span>
          </button>
          <button className="icon-btn" type="button" onClick={toggleFullscreen} aria-label="Pantalla completa" title="Pantalla completa">
            <span className="material-symbols-outlined" aria-hidden="true">
              {isFullscreen ? "fullscreen_exit" : "fullscreen"}
            </span>
          </button>
        </div>

        <details className="eocode-files">
          <summary>Archivos ({files.length})</summary>
          <ul>
            {files.map((file) => (
              <li key={file.path}>
                <button
                  type="button"
                  className="eocode-file"
                  aria-current={viewFile?.path === file.path ? "true" : undefined}
                  onClick={() => void openFile(file)}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">{fileIcon(file.type)}</span>
                  {file.path}
                </button>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section className="eocode-preview-pane" aria-label="Vista del sitio" ref={previewPaneRef}>
        {viewFile ? (
          <div className="eocode-fileview">
            <header className="eocode-fileview-head">
              <span className="eocode-fileview-path">{viewFile.path}</span>
              <button className="icon-btn" type="button" onClick={backToSite} aria-label="Volver al sitio" title="Volver al sitio">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </header>
            {viewFile.type === "image" || viewFile.type === "svg" ? (
              <img className="eocode-fileview-img" src={`${previewUrl}${viewFile.path}`} alt="" />
            ) : isMarkdownPath(viewFile.path) ? (
              <Markdown text={viewFile.content} className="eocode-fileview-body" />
            ) : (
              <pre className="eocode-fileview-pre">{viewFile.content}</pre>
            )}
          </div>
        ) : (
          <iframe
            key={previewVersion}
            ref={iframeRef}
            className="eocode-frame"
            src={previewSrc}
            title="Vista previa del sitio"
            sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-popups"
          />
        )}
      </section>
    </div>
  );
}
