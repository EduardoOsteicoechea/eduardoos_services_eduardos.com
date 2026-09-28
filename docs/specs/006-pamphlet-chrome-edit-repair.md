# 006 — Pamphlet header/footer (chrome) edit repair

Status: **planned** (partial FE patch shipped; still broken in production UX)  
Sites: `eduardoos.com`, `creevzla.org`, `iglesiabiblicapalabraviva.com` (parity)  
Scope: in-browser Pamphlet / EPAM editor (`frontend/src/lib/pamphlet-generator` + `backend/pkg/pdf`)

## Symptom

- Clicking **header** fields on the visible pamphlet (PDF preview) does not open a usable editor, or edits do not stick / do not show.
- **Footer** tooling (DHS “Pie” / footer profiles modal) appears to exist but feels **disconnected** from the pamphlet on screen (apply/copy/link does not reliably refresh what the user sees, or in-sheet footer fields are not editable like body text).

## Architecture (why body works and chrome does not)

| Layer | Body columns 1–8 | Header (col 0) / Footer (col 9) |
| --- | --- | --- |
| Paint | Backend packer + FE PDF canvas | Backend `drawHeader` / `drawFooter` |
| Click targets | Backend `layout.hits` → FE `.pamphlet-pdf-hit` | **Not emitted by backend** (as of this doc) |
| Editor | Edit dock (`edit_dock.ts`) | Historically: inline tray on hidden sheet DOM |
| Desktop sheet | Off-screen, `pointer-events: none` under `data-pdf-sot` | Same — **cannot** receive clicks |
| Mobile/tablet “cols” | Visible sheet | Sheet visible, but `data-pdf-sot` skips inline trays |

PDF-first mode (`data-pdf-sot`) made the **PDF stage** the only desktop interaction surface. Body items kept working because the packer registers hits. Header/footer ink is drawn without hits, so the old CreateElement tray path is unreachable on desktop.

## What was already tried (insufficient)

Commit series around 2026-09-28 (eduardoos `b76c3ca` + parity sites):

1. Teach `edit_dock` a `chromeMode` that edits `doc.header` / `doc.footer`.
2. Route `edit-open` / `editDock.open` for columns 0 and 9.
3. FE invents chrome hits in `pdf_sot.mergeChromeLayoutHits` by **equal vertical slices** of the header/footer bands.
4. Call `schedulePreviewRegen` after footer profile apply.

### Why that still fails or feels broken

1. **Wrong hit geometry** — Real header is title → double rule → subtitle → 2×2 meta, not six equal strips. Real footer is action → rule → message → two meta pair-rows. Equal slices miss the ink the user clicks and map to the wrong field index.
2. **Backend remains SoT for body only** — Chrome hits are a FE guess; they drift whenever `PAMPHLET_*_LAYOUT_MM` or `drawHeader`/`drawFooter` change.
3. **Live preview on every chrome keystroke** — `applyLiveText` for chrome calls `schedulePreview()`, which remounts the whole PDF + hits (~120 ms debounce). That races the dock, feels frozen, and can drop selection/focus.
4. **Footer modal ≠ footer editor** — Modal manages reusable **profiles** (CRUD + Copiar/Vincular). It is not the same UX as editing the open pamphlet’s footer fields. Users correctly perceive a “disconnect” if in-band footer clicks still do nothing or apply does not update the PDF they are looking at.
5. **No regression test** — Nothing asserts `layout.hits` includes `column: 0` / `column: 9`, or that approve persists chrome into the next preview payload.

## Repair goals

1. Clicking a **visible** header or footer field opens the edit dock with the correct field value.
2. Approve persists chrome into `currentDoc`, cloud/local save, and the next PDF preview.
3. Footer profiles (Copiar/Vincular) update the on-screen PDF without a full page reload.
4. Mobile/tablet cols view uses the same dock path (no reliance on suppressed inline trays).
5. Documented contract + tests so PDF-first cannot regress chrome again.

## Recommended design (do this)

### A. Backend: emit chrome layout hits (required)

In `backend/pkg/pdf/pamphlet.go`, while drawing header/footer, register hits with the same mm boxes used for text:

- `column = 0` (`HEADER_COLUMN`), `index` = index in `HEADER_FIELD_KEYS` (`title`, `subtitle`, `author`, `series`, `series_chapter`, `date`).
- `column = 9` (`FOOTER_COLUMN`), `index` = index in `FOOTER_FIELD_KEYS`.
- `kind` = stable string, e.g. `header_title`, `footer_action`.
- `page = 1` for both bands on page 1.
- Geometry must match paint (title band height, subtitle box, each meta cell; action, message, each meta label/value cell). Prefer one helper that both paints and reports the box.

FE then:

- Prefer backend hits for chrome.
- Keep `mergeChromeLayoutHits` only as a **dev fallback** when preview omits chrome hits (log under `mustLog`), or delete it once backend is live on all three sites.

### B. Frontend: chrome edit session (required)

Keep dock `chromeMode`, but change behavior:

1. **Open** from `onHitClick` when `column` is 0 or 9 (already wired).
2. **Live text** updates `currentDoc` + hidden sheet DOM (`syncLiveChromeContent`).
3. **Do not** call `schedulePreview()` on every chrome keystroke. Regenerate PDF on:
   - Approve (`commitChromeOnly`),
   - Cancel (optional restore preview if needed),
   - Footer profile Copiar/Vincular,
   - Series modal save.
4. Toolbar: hide body-only actions (move/add/delete/notes); keep OK / cancel / copy + char counter.
5. Optional UX upgrade (same turn if cheap): DHS actions “Editar cabecera” / “Editar pie” open a small multi-field form in the dock so users are not dependent on pixel-perfect band clicks.

### C. Footer profiles bridge (required)

In `applyFooterProfile`:

1. Update `currentDoc.footer` (+ bind fields).
2. `renderPageChrome`.
3. `schedulePersist` + **`schedulePreviewRegen`** (must stay).
4. Status string confirming the open pamphlet changed.

Do not treat the footer modal as a substitute for in-band footer field hits.

### D. Tests (required)

Backend (`go test`):

- Preview/layout fixture: hits contain at least one `column==0` and one `column==9` on page 1 with positive `w_mm`/`h_mm`.

Frontend (vitest or focused unit):

- `writeChromeContent` / dock chrome open path updates header/footer keys.
- Optional: mock preview layout with chrome hits → `onHitClick(0, i)` opens chrome session.

### E. Manual acceptance

Desktop PDF view, open pamphlet:

1. Hover header band → dashed hit appears over title / subtitle / meta cells (not random strips).
2. Click title → dock shows title; edit; Approve → PDF title updates; reload/reopen still has new title.
3. Click footer action → same for footer.
4. Footers modal → Copiar on a profile → PDF footer updates without reload.
5. Switch to mobile/tablet cols view → click header field on sheet → same dock path.

## Out of scope

- Changing pamphlet JSON schema keys for header/footer.
- Redesigning PDF page geometry.
- Shared npm package across sites (copy parity files as today).

## Implementation order

1. Backend chrome hits in `drawHeader` / `drawFooter` + Go test.
2. FE: stop live preview on chrome keystrokes; trust backend hits (fallback optional).
3. Verify footer profile → preview path.
4. Optional DHS multi-field chrome forms.
5. Parity copy to creevzla + iglesia; scoped build; commit/push each repo; watch Deploy.

## File map

| Area | Files |
| --- | --- |
| Backend hits | `backend/pkg/pdf/pamphlet.go`, `backend/pamphlet_test.go` (or pdf package tests) |
| FE dock | `frontend/src/lib/pamphlet-generator/src/edit_dock.ts` |
| FE host | `frontend/src/lib/pamphlet-generator/src/main.ts` |
| FE hits | `frontend/src/lib/pamphlet-generator/src/pdf_sot.ts` |
| Schema constants | `frontend/src/lib/pamphlet-generator/src/pamphlet_schema.ts` (`HEADER_COLUMN` / `FOOTER_COLUMN` / field key lists) |
| This doc | `docs/specs/006-pamphlet-chrome-edit-repair.md` |

## Status log

| Date | Note |
| --- | --- |
| 2026-09-28 | FE-only chromeMode + equal-slice hits shipped; user reports still broken. This spec written as the repair plan. |
| — | Mark **done** when backend hits + no-live-preview-on-chrome + acceptance checklist pass on eduardoos production. |
