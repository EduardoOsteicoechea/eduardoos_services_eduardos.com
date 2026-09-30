/**
 * Scrib annotations tree — docked like Bible/Institutes (scrib-ref-panel).
 * Icon-only actions; nested lists draw connector lines.
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

function IconBtn({
  name,
  title,
  active,
  disabled,
  onClick,
}: {
  name: string;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? "scrib-annotations-tree__icon-btn icon-btn is-active"
          : "scrib-annotations-tree__icon-btn icon-btn"
      }
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        {name}
      </span>
    </button>
  );
}

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
        <div
          className="scrib-annotations-tree__toolbar"
          role="toolbar"
          aria-label="Herramientas de área"
        >
          <IconBtn
            name="arrow_selector_tool"
            title="Seleccionar"
            active={props.subtool === "select"}
            onClick={() => props.onSelectSubtool("select")}
          />
          <IconBtn
            name="crop_square"
            title="Arrastrar rectángulo sobre la hoja"
            active={props.subtool === "rect"}
            onClick={() => props.onSelectSubtool("rect")}
          />
          <IconBtn
            name="ink_eraser"
            title="Eliminar último rectángulo del bloque o área seleccionado"
            disabled={!canPopRect}
            onClick={props.onPopLastRect}
          />
          <IconBtn
            name="create_new_folder"
            title="Crear bloque"
            onClick={props.onCreateBlock}
          />
        </div>

        {props.blocks.length === 0 ? (
          <p className="scrib-ref-panel__status">Crea un bloque de notas.</p>
        ) : null}

        <ul className="scrib-annotations-tree__list">
          {props.blocks.map((block, blockIndex) => {
            const blockSelected =
              props.selection?.blockId === block.id &&
              !props.selection.areaId &&
              typeof props.selection.rectIndex !== "number";
            const isLastBlock = blockIndex === props.blocks.length - 1;
            return (
              <li
                key={block.id}
                className={
                  isLastBlock
                    ? "scrib-annotations-tree__node scrib-annotations-tree__node--last"
                    : "scrib-annotations-tree__node"
                }
              >
                <div
                  className={
                    blockSelected
                      ? "scrib-annotations-tree__row is-selected"
                      : "scrib-annotations-tree__row"
                  }
                >
                  <span className="scrib-annotations-tree__branch" aria-hidden />
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
                  <IconBtn
                    name="add_box"
                    title="Crear área"
                    onClick={() => props.onCreateArea(block.id)}
                  />
                  <IconBtn
                    name="edit"
                    title="Renombrar bloque"
                    onClick={() => {
                      const name = window.prompt("Nombre del bloque", block.name);
                      if (name != null && name.trim()) {
                        props.onRenameBlock(block.id, name.trim());
                      }
                    }}
                  />
                  <IconBtn
                    name="delete"
                    title="Eliminar bloque"
                    onClick={() => {
                      if (window.confirm(`¿Eliminar bloque “${block.name}”?`)) {
                        props.onDeleteBlock(block.id);
                      }
                    }}
                  />
                </div>

                <ul className="scrib-annotations-tree__children">
                    {block.areas.map((area, areaIndex) => {
                      const areaSelected =
                        props.selection?.blockId === block.id &&
                        props.selection.areaId === area.id &&
                        !props.selection.annotationId &&
                        typeof props.selection.rectIndex !== "number";
                      const isLastArea = areaIndex === block.areas.length - 1;
                      return (
                        <li
                          key={area.id}
                          className={
                            isLastArea
                              ? "scrib-annotations-tree__node scrib-annotations-tree__node--last"
                              : "scrib-annotations-tree__node"
                          }
                        >
                          <div
                            className={
                              areaSelected
                                ? "scrib-annotations-tree__row is-selected"
                                : "scrib-annotations-tree__row"
                            }
                          >
                            <span
                              className="scrib-annotations-tree__branch"
                              aria-hidden
                            />
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
                                props.onSetAreaColor(
                                  block.id,
                                  area.id,
                                  e.target.value,
                                )
                              }
                            />
                            <button
                              type="button"
                              className="scrib-annotations-tree__name"
                              onClick={() =>
                                props.onSelect({
                                  blockId: block.id,
                                  areaId: area.id,
                                })
                              }
                            >
                              {area.name}
                            </button>
                            <IconBtn
                              name="note_add"
                              title="Crear anotación"
                              onClick={() =>
                                props.onCreateAnnotation(block.id, area.id)
                              }
                            />
                            <IconBtn
                              name="edit"
                              title="Renombrar área"
                              onClick={() => {
                                const name = window.prompt(
                                  "Nombre del área",
                                  area.name,
                                );
                                if (name != null && name.trim()) {
                                  props.onRenameArea(
                                    block.id,
                                    area.id,
                                    name.trim(),
                                  );
                                }
                              }}
                            />
                            <IconBtn
                              name="delete"
                              title="Eliminar área"
                              onClick={() => {
                                if (
                                  window.confirm(`¿Eliminar área “${area.name}”?`)
                                ) {
                                  props.onDeleteArea(block.id, area.id);
                                }
                              }}
                            />
                          </div>

                          <ul className="scrib-annotations-tree__children">
                            {area.annotations.map((ann, annIndex) => {
                              const annSelected =
                                props.selection?.blockId === block.id &&
                                props.selection.areaId === area.id &&
                                props.selection.annotationId === ann.id;
                              const sel: ScribAnnotateSelection = {
                                blockId: block.id,
                                areaId: area.id,
                                annotationId: ann.id,
                              };
                              const isLastAnn =
                                annIndex === area.annotations.length - 1;
                              return (
                                <li
                                  key={ann.id}
                                  className={
                                    isLastAnn
                                      ? "scrib-annotations-tree__node scrib-annotations-tree__node--last"
                                      : "scrib-annotations-tree__node"
                                  }
                                >
                                  <div
                                    className={
                                      annSelected
                                        ? "scrib-annotations-tree__row is-selected"
                                        : "scrib-annotations-tree__row"
                                    }
                                  >
                                    <span
                                      className="scrib-annotations-tree__branch"
                                      aria-hidden
                                    />
                                    <button
                                      type="button"
                                      className="scrib-annotations-tree__name"
                                      onClick={() => props.onSelect(sel)}
                                      onDoubleClick={() => props.onOpenEditor(sel)}
                                    >
                                      {ann.name}
                                    </button>
                                    <IconBtn
                                      name="draw"
                                      title="Editar tinta"
                                      onClick={() => props.onOpenEditor(sel)}
                                    />
                                    <IconBtn
                                      name="visibility"
                                      title="Ver al predicar"
                                      onClick={() => props.onOpenView(sel)}
                                    />
                                    <IconBtn
                                      name="edit"
                                      title="Renombrar anotación"
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
                                    />
                                    <IconBtn
                                      name="delete"
                                      title="Eliminar anotación"
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
                                    />
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
