/**
 * Scrib editor header tools — portal into #header-dynamic-menu-host.
 * Uses shared .dhs-action (icon-btn + label) like every other route tray.
 */

import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { APP_ROUTES } from "../../config/routes";
import { useHeaderDynamicHost } from "../HeaderDynamicMenu/HeaderDynamicMenu";
import "../HeaderDynamicMenu/HeaderDynamicMenu.css";

export type ScribToolMode = "draw" | "zoom" | "erase";

type ScribHeaderMenuProps = {
  mode: ScribToolMode;
  strokeWidthMm: number;
  canUndo: boolean;
  saving: boolean;
  isFullscreen: boolean;
  onDashboard: () => void;
  onSelectZoom: () => void;
  onSelectDraw: () => void;
  onStrokePlus: () => void;
  onStrokeMinus: () => void;
  onSelectErase: () => void;
  onEnterFullscreen: () => void;
  onOpenLayers: () => void;
  onOpenInstitutes: () => void;
  institutesOpen?: boolean;
  onOpenBible: () => void;
  bibleOpen?: boolean;
  onUndo: () => void;
  onPrint: () => void;
};

function actionClass(active?: boolean): string {
  return active
    ? "header-dynamic-menu__btn dhs-action header-dynamic-menu__btn--active is-active"
    : "header-dynamic-menu__btn dhs-action";
}

function ActionIcon({ name }: { name: string }) {
  return (
    <span className="icon-btn" aria-hidden="true">
      <span className="material-symbols-outlined" aria-hidden="true">
        {name}
      </span>
    </span>
  );
}

export default function ScribHeaderMenu(props: ScribHeaderMenuProps) {
  const host = useHeaderDynamicHost("scrib-header-menu");

  if (!host) return null;

  const menu: ReactNode = (
    <section
      id="scrib-header-menu"
      className="header-dynamic-menu header-dynamic-menu--labeled"
      aria-label="Scrib tools"
      ref={(node) => {
        if (node) window.__eduardoosHeaderDynamicMenu = node;
      }}
    >
      <div className="header-dynamic-menu__inner">
        <div className="header-dynamic-menu__actions" role="toolbar" aria-label="Scrib actions">
          <a
            className={actionClass()}
            href={APP_ROUTES.scrib}
            title="Dashboard"
            aria-label="Ir al dashboard"
            onClick={(e) => {
              e.preventDefault();
              props.onDashboard();
            }}
          >
            <ActionIcon name="dashboard" />
            <span className="header-dynamic-menu__label">Dashboard</span>
          </a>
          <button
            type="button"
            className={actionClass(props.mode === "zoom")}
            title="Modo zoom"
            aria-label="Modo zoom"
            aria-pressed={props.mode === "zoom"}
            onClick={props.onSelectZoom}
          >
            <ActionIcon name="zoom_in" />
            <span className="header-dynamic-menu__label">Zoom</span>
          </button>
          <button
            type="button"
            className={actionClass(props.mode === "draw")}
            title="Modo dibujar con lápiz"
            aria-label="Modo dibujar con lápiz"
            aria-pressed={props.mode === "draw"}
            onClick={props.onSelectDraw}
          >
            <ActionIcon name="draw" />
            <span className="header-dynamic-menu__label">Dibujar</span>
          </button>
          <button
            type="button"
            className={actionClass()}
            title="Aumentar grosor"
            aria-label="Aumentar grosor de trazo"
            onClick={props.onStrokePlus}
          >
            <ActionIcon name="add" />
            <span className="header-dynamic-menu__label">Más grueso</span>
          </button>
          <span className="scrib-stroke-widget" title="Grosor (mm)" aria-live="polite">
            Grosor {props.strokeWidthMm.toFixed(2)} mm
          </span>
          <button
            type="button"
            className={actionClass()}
            title="Reducir grosor"
            aria-label="Reducir grosor de trazo"
            onClick={props.onStrokeMinus}
          >
            <ActionIcon name="remove" />
            <span className="header-dynamic-menu__label">Más fino</span>
          </button>
          <button
            type="button"
            className={actionClass(props.mode === "erase")}
            title="Borrador"
            aria-label="Modo borrador"
            aria-pressed={props.mode === "erase"}
            onClick={props.onSelectErase}
          >
            <ActionIcon name="ink_eraser" />
            <span className="header-dynamic-menu__label">Borrar</span>
          </button>
          <button
            type="button"
            className={actionClass(props.isFullscreen)}
            title="Pantalla completa"
            aria-label="Abrir Scrib en pantalla completa"
            aria-pressed={props.isFullscreen}
            disabled={props.isFullscreen}
            onClick={props.onEnterFullscreen}
          >
            <ActionIcon name="fullscreen" />
            <span className="header-dynamic-menu__label">Pantalla completa</span>
          </button>
          <button
            type="button"
            className={actionClass()}
            title="Capas"
            aria-label="Modal de capas"
            onClick={props.onOpenLayers}
          >
            <ActionIcon name="layers" />
            <span className="header-dynamic-menu__label">Capas</span>
          </button>
          <button
            type="button"
            className={actionClass(Boolean(props.institutesOpen))}
            title={props.institutesOpen ? "Cerrar Institutes" : "Institutes — Capita"}
            aria-label={
              props.institutesOpen
                ? "Cerrar panel de Institutes"
                : "Abrir panel de Institutes por Capita"
            }
            aria-pressed={Boolean(props.institutesOpen)}
            onClick={props.onOpenInstitutes}
          >
            <ActionIcon name="menu_book" />
            <span className="header-dynamic-menu__label">Institutes</span>
          </button>
          <button
            type="button"
            className={actionClass(Boolean(props.bibleOpen))}
            title={props.bibleOpen ? "Cerrar Bible" : "Bible — book, chapter, verse"}
            aria-label={
              props.bibleOpen ? "Cerrar panel de Bible" : "Abrir panel de Bible"
            }
            aria-pressed={Boolean(props.bibleOpen)}
            onClick={props.onOpenBible}
          >
            <ActionIcon name="auto_stories" />
            <span className="header-dynamic-menu__label">Bible</span>
          </button>
          <button
            type="button"
            className={actionClass()}
            title="Descargar PDF de la hoja"
            aria-label="Descargar PDF US Letter en escala de grises clara"
            onClick={props.onPrint}
          >
            <ActionIcon name="print" />
            <span className="header-dynamic-menu__label">PDF</span>
          </button>
          <button
            type="button"
            className={actionClass()}
            title="Deshacer"
            aria-label="Revertir última acción"
            disabled={!props.canUndo}
            onClick={props.onUndo}
          >
            <ActionIcon name="undo" />
            <span className="header-dynamic-menu__label">Deshacer</span>
          </button>
          {props.saving ? (
            <span className="scrib-save-hint" aria-live="polite">
              Guardando…
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );

  return createPortal(menu, host);
}
