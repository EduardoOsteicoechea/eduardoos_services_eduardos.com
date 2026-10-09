# 008 — Scrib annotations mode

## Purpose

Handwritten note regions for biblical commentators / preachers: draw colored rectangles on a Scrib sheet, write heading/body ink in a modal, and open floating preach views.

## Document model

Additive field on `ScribSheet`: `noteBlocks?: ScribNoteBlock[]` (default `[]`).

Each drawable unit is a **region**: one rectangle + `heading` / `body` ink (`StrokePath[]`) + `view` window box.

Persistence keeps the existing nested JSON shape (`block` → `area` with one `rect` → one `annotation`) so the Go API stays unchanged. The editor UX treats regions as flat.

## Modes

Extends `ScribToolMode` with `"annotate"`. Sheet layer ink (`draw` / `erase`) is unchanged when the annotation editor is closed. When the annotation editor is open, toolbar draw/erase/stroke/undo target heading/body ink (`ink target = note`).

Annotate subtools (toolbar / DHS when `mode === "annotate"`):

- **Color** — fill/stroke color for the next rectangle
- **Rect** — drag a rectangle on the page (creates a region)
- **Select** — tap a rectangle to open its content; if several overlap, a pick modal lists them

## Chrome

- Orange fixed border while `mode === "annotate"`.
- No note tree panel.
- Floating note editor (no title text): toolbar move / draw-settings / zoom / pan / center; `1.875rem` round close at top-right vertex; square SE resize; Esc closes. Heading canvas `3.75rem`; body `15rem` default and grows with the panel.
- View windows: multiple `view.open`, drag + SE resize; persisted on the sheet.

## Persistence

Same `PUT` sheet document + client save pump. No new endpoints.

## Rollback

Git tag `scrib-core-pre-annotations` on `main` before feature work; branch `feature/scrib-annotations`.

## Non-goals (this milestone)

OCR, PDF inclusion of notes, auto-bbox from layer strokes, cross-sheet share.
