# 007 — Pamphlet page-1 column geometry & packing

Status: **shipped** (eduardoos.com; keep FE CSS / JS / PDF mm in lockstep)  
Sites: `eduardoos.com` (reference); apply same numbers on creevzla / iglesiabiblicapalabraviva when Pamphlet is ported  
Scope: `frontend/src/lib/pamphlet-generator` + `backend/pkg/pdf/pamphlet.go`  
Agent rule: `.cursor/rules/pamphlet-geometry-sot.mdc` — **update rules/spec before code** when changing this contract.

## Source of truth

1. **Canonical:** Go PDF builder `computePamphletGeometry` + draw + `layout` JSON
   (`BuildPamphletPDFWithLayout`, `schema_version` ≥ 5).
2. **FE mirror:** `pamphlet_geometry.ts` for densify + CSS vars before/without preview.
3. After each preview, FE **applies band fields from `layout`** (`applyPamphletGeometry`)
   and draws selection / “+” overlays **only** from `layout.hits` (no invented column boxes).

## Typography

- **Raleway** Regular + Bold for sheet CSS and PDF embeds (same family as the site
  `--font-family` / Layout load). Not Roboto.
- PDF: `backend/pkg/pdf/fonts/Raleway-Regular.ttf` + `Raleway-Bold.ttf`.
- FE sheet: `font-family: var(--font-family, "Raleway", sans-serif)` on pamphlet ink.
- Changing typeface requires updating `pamphlet-geometry-sot.mdc` + this spec first.

## Symptom (fixed historically)

Body text on page 1 painted **above** the column band (into the header / past the top of cols 1–2), and overflow did not reliably move to the next column.

## Reading order (authoritative)

Densify / spill / “+” placement follow:

**1 → 2** (page 1 right, under header) → **3 → 4 → 5 → 6** (page 2) → **7 → 8** (page 1 left, above footer).

Constant: `PAMPHLET_BODY_COLUMN_READING_ORDER` in `pamphlet_schema.ts`.

## Sheet geometry (US Letter landscape)

| Token / constant | mm | Role |
| --- | ---: | --- |
| Page height | 215.9 | Letter landscape |
| Page margin (each edge) | 10 | Grid tracks |
| Header band | from `header_layout.height` (default 34.5) | |
| Header → body gutter | from `header_layout.body_gutter` (default 5) | |
| Footer ↔ body gutter | from `footer_layout.body_gutter` (default 6) | |
| Footer band | from `footer_layout.height` (default 29.8) | |
| contentBand | `pageH − 2×margin` (195.9) | |

### Column ink heights (derived — never hardcode independently)

| Columns | Formula |
| --- | --- |
| **1, 2** (page 1 right) | `contentBand − headerH − headerBodyGutter` |
| **7, 8** (page 1 left) | `contentBand − footerBodyGutter − footerH` |
| **3–6** (page 2) | `contentBand` |
| page1Body track | `contentBand − headerH − headerGutter − footerGutter − footerH` |

Header height changes → cols **1–2** only. Footer height changes → cols **7–8** only.

Defaults at 34.5 / 5 / 6 / 29.8 → right **156.4**, left **160.1**, body track **120.6**.

Grid placement:

- Cols **1–2**: `grid-row: 4 / 7` → right band, `align-self: start`.
- Cols **7–8**: `grid-row: 2 / 5` → left band, `align-self: start`.

Do **not** change heights without updating:

1. Go `computePamphletGeometry` (SoT) + layout JSON fields
2. FE `pamphlet_geometry.ts` mirror
3. This spec + `pamphlet-geometry-sot.mdc` **first** if the contract changes

## Packing rules (pixel-perfect)

1. **Strict fit (FE)** — `PACK_FIT_EPSILON_MM = 0.05` (float only).
2. **Strict floor (PDF)** — `drawStackedItems` / `writeWrapped` must not paint below the column floor.
3. **Spill forward only** — when an item does not fit, move it to the next column in reading order.
4. **No force-pack past floor on col 8** — remainder that does not fit stays unpacked (PDF truncates; FE must not shove past `page1LeftCol`).
5. **“+” outside ink** — clamped to column floor from layout bands.
6. **Clip ink, not the shell** — `.pamphlet-column-ink` uses `overflow: clip`.

## Layout JSON bands (`schema_version` ≥ 5)

Preview returns (among others): `margin_mm`, `content_band_mm`, `page1_body_mm`,
`page1_right_col_mm`, `page1_left_col_mm`, `page2_col_mm`, `header_h_mm`,
`header_body_gutter_mm`, `footer_h_mm`, `footer_body_gutter_mm`,
`right_body_top_mm`, `left_body_top_mm`, `footer_top_mm`, floors, `hits[]`.

## Regression checklist

- [ ] Cols 1–2 top edge aligns with bottom of header-body gutter.
- [ ] Overflow from col 1 goes to col 2, then 3…8 — not into the page margin.
- [ ] PDF preview: no body text between page-1 bottom margin and page-2 top.
- [ ] Cols 7–8 do not paint into the footer band.
- [ ] “+” stays within the column floor from layout.
- [ ] Changing header height in layout shrinks only cols 1–2; footer height only 7–8.
- [ ] Hit overlays match PDF ink (no FE-synthesized chrome strips when schema ≥ 5).
