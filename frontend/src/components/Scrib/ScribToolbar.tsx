/**
 * Scrib sheet icon-only tool rail — same actions as the dynamic header menu.
 * Theme tokens; docks flush to the viewport edge beside the book panel.
 */

import type { ScribBackgroundPattern } from "../../lib/scrib";
import type { ScribAnnotateSubtool } from "../../lib/scribAnnotations";
import type { ScribToolMode } from "./ScribHeaderMenu";

export type ScribDockSide = "left" | "right";

type ScribToolbarProps = {
  mode: ScribToolMode;
  strokeWidthMm: number;
  canUndo: boolean;
  saving: boolean;
  isFullscreen: boolean;
  backgroundPattern: ScribBackgroundPattern;
  institutesOpen: boolean;
  bibleOpen: boolean;
  annotateSubtool: ScribAnnotateSubtool;
  annotateColor: string;
  dockSide: ScribDockSide;
  onDashboard: () => void;
  onSelectZoom: () => void;
  onSelectDraw: () => void;
  onStrokePlus: () => void;
  onStrokeMinus: () => void;
  onSelectErase: () => void;
  onSelectAnnotate: () => void;
  onAnnotateSubtool: (tool: ScribAnnotateSubtool) => void;
  onAnnotateColor: (color: string) => void;
  onEnterFullscreen: () => void;
  onOpenLayers: () => void;
  onToggleBackgroundPattern: () => void;
  onOpenInstitutes: () => void;
  onOpenBible: () => void;
  onUndo: () => void;
  onPrint: () => void;
  onToggleDock: () => void;
};

function ToolIcon({ name }: { name: string }) {
  return (
    <span className="material-symbols-outlined" aria-hidden="true">
      {name}
    </span>
  );
}

function toolClass(active?: boolean): string {
  return active
    ? "scrib-tool-rail__btn icon-btn is-active"
    : "scrib-tool-rail__btn icon-btn";
}

export default function ScribToolbar(props: ScribToolbarProps) {
  const dockRight = props.dockSide === "right";
  const dockIcon = dockRight ? "keyboard_arrow_left" : "keyboard_arrow_right";
  const dockLabel = dockRight
    ? "Mover barra y panel a la izquierda"
    : "Mover barra y panel a la derecha";

  return (
    <aside
      className={
        dockRight
          ? "scrib-tool-rail scrib-tool-rail--right"
          : "scrib-tool-rail scrib-tool-rail--left"
      }
      aria-label="Scrib tools"
      role="toolbar"
    >
      <button
        type="button"
        className={toolClass()}
        title="Dashboard"
        aria-label="Ir al dashboard"
        onClick={props.onDashboard}
      >
        <ToolIcon name="dashboard" />
      </button>
      <button
        type="button"
        className={toolClass(props.mode === "zoom")}
        title="Modo zoom"
        aria-label="Modo zoom"
        aria-pressed={props.mode === "zoom"}
        onClick={props.onSelectZoom}
      >
        <ToolIcon name="zoom_in" />
      </button>
      <button
        type="button"
        className={toolClass(props.mode === "draw")}
        title="Modo dibujar con lápiz"
        aria-label="Modo dibujar con lápiz"
        aria-pressed={props.mode === "draw"}
        onClick={props.onSelectDraw}
      >
        <ToolIcon name="draw" />
      </button>
      <button
        type="button"
        className={toolClass()}
        title="Aumentar grosor"
        aria-label="Aumentar grosor de trazo"
        onClick={props.onStrokePlus}
      >
        <ToolIcon name="add" />
      </button>
      <span
        className="scrib-tool-rail__stroke"
        title={`Grosor ${props.strokeWidthMm.toFixed(2)} mm`}
        aria-live="polite"
      >
        {props.strokeWidthMm.toFixed(2)}
      </span>
      <button
        type="button"
        className={toolClass()}
        title="Reducir grosor"
        aria-label="Reducir grosor de trazo"
        onClick={props.onStrokeMinus}
      >
        <ToolIcon name="remove" />
      </button>
      <button
        type="button"
        className={toolClass(props.mode === "erase")}
        title="Borrador"
        aria-label="Modo borrador"
        aria-pressed={props.mode === "erase"}
        onClick={props.onSelectErase}
      >
        <ToolIcon name="ink_eraser" />
      </button>
      <button
        type="button"
        className={toolClass(props.mode === "annotate")}
        title="Modo anotación"
        aria-label="Modo anotación"
        aria-pressed={props.mode === "annotate"}
        onClick={props.onSelectAnnotate}
      >
        <ToolIcon name="edit_note" />
      </button>
      {props.mode === "annotate" ? (
        <>
          <label
            className="scrib-tool-rail__color"
            title="Color del rectángulo"
          >
            <span className="page-title-sr">Color del rectángulo</span>
            <input
              type="color"
              value={props.annotateColor}
              aria-label="Color del rectángulo de anotación"
              onChange={(e) => props.onAnnotateColor(e.target.value)}
            />
          </label>
          <button
            type="button"
            className={toolClass(props.annotateSubtool === "rect")}
            title="Dibujar rectángulo"
            aria-label="Dibujar rectángulo de anotación"
            aria-pressed={props.annotateSubtool === "rect"}
            onClick={() => props.onAnnotateSubtool("rect")}
          >
            <ToolIcon name="crop_square" />
          </button>
          <button
            type="button"
            className={toolClass(props.annotateSubtool === "select")}
            title="Seleccionar rectángulo y ver contenido"
            aria-label="Seleccionar rectángulo y ver contenido"
            aria-pressed={props.annotateSubtool === "select"}
            onClick={() => props.onAnnotateSubtool("select")}
          >
            <ToolIcon name="arrow_selector_tool" />
          </button>
          <button
            type="button"
            className={toolClass(props.annotateSubtool === "edit")}
            title="Editar rectángulo (color y esquinas)"
            aria-label="Editar rectángulo: color y esquinas"
            aria-pressed={props.annotateSubtool === "edit"}
            onClick={() => props.onAnnotateSubtool("edit")}
          >
            <ToolIcon name="tune" />
          </button>
        </>
      ) : null}
      <button
        type="button"
        className={toolClass(props.isFullscreen)}
        title="Pantalla completa"
        aria-label="Abrir Scrib en pantalla completa"
        aria-pressed={props.isFullscreen}
        disabled={props.isFullscreen}
        onClick={props.onEnterFullscreen}
      >
        <ToolIcon name="fullscreen" />
      </button>
      <button
        type="button"
        className={toolClass()}
        title="Capas"
        aria-label="Modal de capas"
        onClick={props.onOpenLayers}
      >
        <ToolIcon name="layers" />
      </button>
      <button
        type="button"
        className={toolClass(props.backgroundPattern === "ruled-4-3-3")}
        title={
          props.backgroundPattern === "ruled-4-3-3"
            ? "Fondo 4+3+3 — cambiar a 4+3"
            : "Fondo 4+3 — cambiar a 4+3+3"
        }
        aria-label={
          props.backgroundPattern === "ruled-4-3-3"
            ? "Cambiar fondo a renglón 4+3"
            : "Cambiar fondo a renglón 4+3+3"
        }
        aria-pressed={props.backgroundPattern === "ruled-4-3-3"}
        onClick={props.onToggleBackgroundPattern}
      >
        <ToolIcon name="format_line_spacing" />
      </button>
      <button
        type="button"
        className={toolClass(props.institutesOpen)}
        title={props.institutesOpen ? "Cerrar Institutes" : "Institutes — Capita"}
        aria-label={
          props.institutesOpen
            ? "Cerrar panel de Institutes"
            : "Abrir panel de Institutes por Capita"
        }
        aria-pressed={props.institutesOpen}
        onClick={props.onOpenInstitutes}
      >
        <ToolIcon name="menu_book" />
      </button>
      <button
        type="button"
        className={toolClass(props.bibleOpen)}
        title={props.bibleOpen ? "Cerrar Bible" : "Bible — book, chapter, verse"}
        aria-label={
          props.bibleOpen ? "Cerrar panel de Bible" : "Abrir panel de Bible"
        }
        aria-pressed={props.bibleOpen}
        onClick={props.onOpenBible}
      >
        <ToolIcon name="auto_stories" />
      </button>
      <button
        type="button"
        className={toolClass()}
        title="Descargar PDF de la hoja"
        aria-label="Descargar PDF US Letter en escala de grises clara"
        onClick={props.onPrint}
      >
        <ToolIcon name="print" />
      </button>
      <button
        type="button"
        className={toolClass()}
        title="Deshacer"
        aria-label="Revertir última acción"
        disabled={!props.canUndo}
        onClick={props.onUndo}
      >
        <ToolIcon name="undo" />
      </button>
      <button
        type="button"
        className={toolClass(dockRight)}
        title={dockLabel}
        aria-label={dockLabel}
        aria-pressed={dockRight}
        onClick={props.onToggleDock}
      >
        <ToolIcon name={dockIcon} />
      </button>
      {props.saving ? (
        <span className="scrib-tool-rail__saving" aria-live="polite" title="Guardando…">
          …
        </span>
      ) : null}
    </aside>
  );
}
