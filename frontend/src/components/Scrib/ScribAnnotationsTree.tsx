/**
 * Scrib annotations tree — docked like Bible/Institutes (scrib-ref-panel).
 */

import type { ScribNoteBlock } from "../../lib/scrib";
import type {
  ScribAnnotateSelection,
  ScribAnnotateSubtool,
} from "../../lib/scribAnnotations";
import type { ScribDockSide } from "./ScribToolbar";

type ScribAnnotationsTreeProps = {
  open: boolean;
  dockSide: ScribDockSide;
  blocks: ScribNoteBlock[];
  selection: ScribAnnotateSelection | null;
  subtool: ScribAnnotateSubtool;
  onSelectSubtool: (tool: ScribAnnotateSubtool) => void;
  onSelect: (sel: ScribAnnotateSelection) => void;
  onCreateBlock: () => void;
  onCreateArea: (blockId: string) => void;
  onCreateAnnotation: (blockId: string, areaId: string) => void;
  onRenameBlock: (blockId: string, name: string) => void;
  onRenameArea: (blockId: string, areaId: string, name: string) => void;
  onRenameAnnotation: (
    blockId: string,
    areaId: string,
    annotationId: string,
    name: string,
  ) => void;
  onSetBlockVisible: (blockId: string, visible: boolean) => void;
  onSetBlockColor: (blockId: string, color: string) => void;
  onSetAreaVisible: (blockId: string, areaId: string, visible: boolean) => void;
  onSetAreaColor: (blockId: string, areaId: string, color: string) => void;
  onOpenEditor: (sel: ScribAnnotateSelection) => void;
  onOpenView: (sel: ScribAnnotateSelection) => void;
  onDeleteBlock: (blockId: string) => void;
  onDeleteArea: (blockId: string, areaId: string) => void;
  onDeleteAnnotation: (blockId: string, areaId: string, annotationId: string) => void;
  onPopLastRect: () => void;
};

export default function ScribAnnotationsTree(props: ScribAnnotationsTreeProps) {
  if (!props.open) return null;

  const dockClass =
    props.dockSide === "right"
      ? "scrib-ref-panel scrib-ref-panel--dock-right scrib-annotations-tree"
      : "scrib-ref-panel scrib-ref-panel--dock-left scrib-annotations-tree";

  const canPopRect =
    props.selection &&
    (() => {
      const block = props.blocks.find((b) => b.id === props.selection!.blockId);
      if (!block) return false;
      if (!props.selection!.areaId) return block.rects.length > 0;
      const area = block.areas.find((a) => a.id === props.selection!.areaId);
      return Boolean(area && area.rects.length > 0);
    })();

  return (
    <aside className={dockClass} aria-label="Árbol de anotaciones">
      <header className="scrib-ref-panel__head">
        <h2>Anotaciones</h2>
      </header>
      <div className="scrib-ref-panel__scroll scrib-annotations-tree__scroll">
        <div className="scrib-annotations-tree__toolbar" role="toolbar" aria-label="Herramientas de área">
          <button
            type="button"
            className={
              props.subtool === "select"
                ? "scrib-annotations-tree__chip is-active"
                : "scrib-annotations-tree__chip"
            }
            aria-pressed={props.subtool === "select"}
            onClick={() => props.onSelectSubtool("select")}
          >
            Seleccionar
          </button>
          <button
            type="button"
            className={
              props.subtool === "rect"
                ? "scrib-annotations-tree__chip is-active"
                : "scrib-annotations-tree__chip"
            }
            aria-pressed={props.subtool === "rect"}
            title="Arrastrar rectángulo sobre la hoja"
            onClick={() => props.onSelectSubtool("rect")}
          >
            Rectángulo
          </button>
          <button
            type="button"
            className="scrib-annotations-tree__chip"
            disabled={!canPopRect}
            title="Eliminar último rectángulo del bloque o área seleccionado"
            onClick={props.onPopLastRect}
          >
            Quitar rect
          </button>
        </div>

        <button
          type="button"
          className="scrib-annotations-tree__add"
          onClick={props.onCreateBlock}
        >
          + Bloque
        </button>

        {props.blocks.length === 0 ? (
          <p className="scrib-ref-panel__status">Crea un bloque de notas.</p>
        ) : null}

        <ul className="scrib-annotations-tree__list">
          {props.blocks.map((block) => {
            const blockSelected =
              props.selection?.blockId === block.id && !props.selection.areaId;
            return (
              <li key={block.id} className="scrib-annotations-tree__block">
                <div
                  className={
                    blockSelected
                      ? "scrib-annotations-tree__row is-selected"
                      : "scrib-annotations-tree__row"
                  }
                >
                  <input
                    type="checkbox"
                    checked={block.visible}
                    title="Visible"
                    aria-label={`Visible ${block.name}`}
                    onChange={(e) =>
                      props.onSetBlockVisible(block.id, e.target.checked)
                    }
                  />
                  <input
                    type="color"
                    className="scrib-annotations-tree__color"
                    value={block.color}
                    title="Color del bloque"
                    aria-label={`Color ${block.name}`}
                    onChange={(e) => props.onSetBlockColor(block.id, e.target.value)}
                  />
                  <button
                    type="button"
                    className="scrib-annotations-tree__name"
                    onClick={() => props.onSelect({ blockId: block.id })}
                  >
                    {block.name}
                  </button>
                  <button
                    type="button"
                    className="scrib-annotations-tree__icon-btn"
                    title="Renombrar bloque"
                    aria-label="Renombrar bloque"
                    onClick={() => {
                      const name = window.prompt("Nombre del bloque", block.name);
                      if (name != null && name.trim()) {
                        props.onRenameBlock(block.id, name.trim());
                      }
                    }}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      edit
                    </span>
                  </button>
                  <button
                    type="button"
                    className="scrib-annotations-tree__icon-btn"
                    title="Eliminar bloque"
                    aria-label="Eliminar bloque"
                    onClick={() => {
                      if (window.confirm(`¿Eliminar bloque “${block.name}”?`)) {
                        props.onDeleteBlock(block.id);
                      }
                    }}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      delete
                    </span>
                  </button>
                </div>
                <button
                  type="button"
                  className="scrib-annotations-tree__add scrib-annotations-tree__add--nested"
                  onClick={() => props.onCreateArea(block.id)}
                >
                  + Área
                </button>
                <ul className="scrib-annotations-tree__areas">
                  {block.areas.map((area) => {
                    const areaSelected =
                      props.selection?.blockId === block.id &&
                      props.selection.areaId === area.id &&
                      !props.selection.annotationId;
                    return (
                      <li key={area.id} className="scrib-annotations-tree__area">
                        <div
                          className={
                            areaSelected
                              ? "scrib-annotations-tree__row is-selected"
                              : "scrib-annotations-tree__row"
                          }
                        >
                          <input
                            type="checkbox"
                            checked={area.visible}
                            title="Visible"
                            aria-label={`Visible ${area.name}`}
                            onChange={(e) =>
                              props.onSetAreaVisible(
                                block.id,
                                area.id,
                                e.target.checked,
                              )
                            }
                          />
                          <input
                            type="color"
                            className="scrib-annotations-tree__color"
                            value={area.color}
                            title="Color del área"
                            aria-label={`Color ${area.name}`}
                            onChange={(e) =>
                              props.onSetAreaColor(block.id, area.id, e.target.value)
                            }
                          />
                          <button
                            type="button"
                            className="scrib-annotations-tree__name"
                            onClick={() =>
                              props.onSelect({ blockId: block.id, areaId: area.id })
                            }
                          >
                            {area.name}
                          </button>
                          <button
                            type="button"
                            className="scrib-annotations-tree__icon-btn"
                            title="Renombrar área"
                            aria-label="Renombrar área"
                            onClick={() => {
                              const name = window.prompt("Nombre del área", area.name);
                              if (name != null && name.trim()) {
                                props.onRenameArea(block.id, area.id, name.trim());
                              }
                            }}
                          >
                            <span className="material-symbols-outlined" aria-hidden="true">
                              edit
                            </span>
                          </button>
                          <button
                            type="button"
                            className="scrib-annotations-tree__icon-btn"
                            title="Eliminar área"
                            aria-label="Eliminar área"
                            onClick={() => {
                              if (window.confirm(`¿Eliminar área “${area.name}”?`)) {
                                props.onDeleteArea(block.id, area.id);
                              }
                            }}
                          >
                            <span className="material-symbols-outlined" aria-hidden="true">
                              delete
                            </span>
                          </button>
                        </div>
                        <button
                          type="button"
                          className="scrib-annotations-tree__add scrib-annotations-tree__add--nested"
                          onClick={() => props.onCreateAnnotation(block.id, area.id)}
                        >
                          + Anotación
                        </button>
                        <ul className="scrib-annotations-tree__anns">
                          {area.annotations.map((ann) => {
                            const annSelected =
                              props.selection?.blockId === block.id &&
                              props.selection.areaId === area.id &&
                              props.selection.annotationId === ann.id;
                            const sel = {
                              blockId: block.id,
                              areaId: area.id,
                              annotationId: ann.id,
                            };
                            return (
                              <li key={ann.id} className="scrib-annotations-tree__ann">
                                <div
                                  className={
                                    annSelected
                                      ? "scrib-annotations-tree__row is-selected"
                                      : "scrib-annotations-tree__row"
                                  }
                                >
                                  <button
                                    type="button"
                                    className="scrib-annotations-tree__name"
                                    onClick={() => props.onSelect(sel)}
                                    onDoubleClick={() => props.onOpenEditor(sel)}
                                  >
                                    {ann.name}
                                  </button>
                                  <button
                                    type="button"
                                    className="scrib-annotations-tree__chip"
                                    title="Editar tinta"
                                    onClick={() => props.onOpenEditor(sel)}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    className="scrib-annotations-tree__chip"
                                    title="Ver al predicar"
                                    onClick={() => props.onOpenView(sel)}
                                  >
                                    Ver
                                  </button>
                                  <button
                                    type="button"
                                    className="scrib-annotations-tree__icon-btn"
                                    title="Renombrar anotación"
                                    aria-label="Renombrar anotación"
                                    onClick={() => {
                                      const name = window.prompt(
                                        "Nombre de la anotación",
                                        ann.name,
                                      );
                                      if (name != null && name.trim()) {
                                        props.onRenameAnnotation(
                                          block.id,
                                          area.id,
                                          ann.id,
                                          name.trim(),
                                        );
                                      }
                                    }}
                                  >
                                    <span
                                      className="material-symbols-outlined"
                                      aria-hidden="true"
                                    >
                                      edit
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    className="scrib-annotations-tree__icon-btn"
                                    title="Eliminar anotación"
                                    aria-label="Eliminar anotación"
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          `¿Eliminar anotación “${ann.name}”?`,
                                        )
                                      ) {
                                        props.onDeleteAnnotation(
                                          block.id,
                                          area.id,
                                          ann.id,
                                        );
                                      }
                                    }}
                                  >
                                    <span
                                      className="material-symbols-outlined"
                                      aria-hidden="true"
                                    >
                                      delete
                                    </span>
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
