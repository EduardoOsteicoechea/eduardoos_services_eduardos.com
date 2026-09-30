# 008 — Scrib annotations mode

## Purpose

Handwritten note blocks for biblical commentators / preachers: annotate regions of a Scrib sheet, write heading/body ink in a modal, and open floating preach views.

## Document model

Additive field on `ScribSheet`: `noteBlocks?: ScribNoteBlock[]` (default `[]`).

Hierarchy: **block** → **area** → **annotation** → `heading` / `body` (`StrokePath[]`) + `view` window box.

Drawn areas: `rects[]` in page mm on blocks and areas. Visible only when editor mode is `annotate`.

## Modes

Extends `ScribToolMode` with `"annotate"`. Sheet layer ink (`draw` / `erase`) is unchanged when annotation editor is closed. When the annotation editor is open, toolbar draw/erase/stroke/undo target heading/body ink (`ink target = note`).

## Chrome

- Orange fixed border while `mode === "annotate"`.
- Tree panel: `scrib-ref-panel` dock L/R (XOR with Bible / Institutes / layers).
- View windows: multiple `view.open`, drag + SE resize; persisted on the sheet.

## Persistence

Same `PUT` sheet document + client save pump. No new endpoints.

## Rollback

Git tag `scrib-core-pre-annotations` on `main` before feature work; branch `feature/scrib-annotations`.

## Non-goals (this milestone)

OCR, PDF inclusion of notes, auto-bbox from layer strokes, cross-sheet share.
