/**
 * When several note rectangles overlap under a click, pick which content to open.
 */

import type { ScribNoteRegion } from "../../lib/scribAnnotations";

type ScribAnnotationPickModalProps = {
  open: boolean;
  candidates: ScribNoteRegion[];
  onPick: (region: ScribNoteRegion) => void;
  onClose: () => void;
};

export default function ScribAnnotationPickModal(
  props: ScribAnnotationPickModalProps,
) {
  if (!props.open || props.candidates.length === 0) return null;

  return (
    <div
      className="scrib-annotation-pick"
      role="dialog"
      aria-modal="true"
      aria-label="Elegir anotación"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="scrib-annotation-pick__panel">
        <header className="scrib-annotation-pick__head">
          <h2>Varias anotaciones aquí</h2>
          <button
            type="button"
            className="scrib-tool-rail__btn icon-btn"
            title="Cerrar"
            aria-label="Cerrar selección de anotación"
            onClick={props.onClose}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </header>
        <p className="scrib-annotation-pick__hint">
          Elige cuál quieres ver o editar.
        </p>
        <ul className="scrib-annotation-pick__list">
          {props.candidates.map((region) => (
            <li key={`${region.blockId}-${region.areaId}-${region.annotationId}`}>
              <button
                type="button"
                className="scrib-annotation-pick__item"
                title={region.name}
                aria-label={`Abrir ${region.name}`}
                onClick={() => props.onPick(region)}
              >
                <span
                  className="scrib-annotation-pick__swatch"
                  style={{ background: region.color }}
                  aria-hidden
                />
                <span className="scrib-annotation-pick__label">{region.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
