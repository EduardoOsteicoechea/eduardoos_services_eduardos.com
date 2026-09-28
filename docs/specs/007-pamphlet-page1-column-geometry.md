# 007 — Pamphlet page-1 column geometry & packing

Status: **shipped** (eduardoos.com; keep FE CSS / JS / PDF mm in lockstep)  
Sites: `eduardoos.com` (reference); apply same numbers on creevzla / iglesiabiblicapalabraviva when Pamphlet is ported  
Scope: `frontend/src/lib/pamphlet-generator` + `backend/pkg/pdf/pamphlet.go`

## Symptom (fixed)

Body text on page 1 painted **above** the column band (into the header / past the top of cols 1–2), and overflow did not reliably move to the next column.

## Reading order (authoritative)

Densify / spill / “+” placement follow:

**1 → 2** (page 1 right, under header) → **3 → 4 → 5 → 6** (page 2) → **7 → 8** (page 1 left, above footer).

Constant: `PAMPHLET_BODY_COLUMN_READING_ORDER` in `pamphlet_schema.ts`.

## Sheet geometry (US Letter landscape)

| Token / constant | mm | cm | Role |
| --- | ---: | ---: | --- |
| Page height | 215.9 | 21.59 | Letter landscape |
| Page margin (each edge) | 10 | 1.0 | Grid tracks |
| Header band | 34.5 | 3.45 | `--page-header-height` / `PAMPHLET_HEADER_LAYOUT_MM.height` |
| Header → body gutter | 5 | 0.5 | `--header-body-gutter` |
| Page-1 center body track | 120.6 | 12.06 | `--page1-body-height` |
| Footer ↔ body gutter | 6 | 0.6 | `--footer-body-gutter` |
| Footer band | 29.8 | 2.98 | `--page-footer-height` |
| Page-2 / full content band | 195.9 | 19.59 | `215.9 − 2×10` |

### Column ink heights (must match CSS, JS `maxHeightForColumn`, PDF)

| Columns | mm | cm | Formula |
| --- | ---: | ---: | --- |
| **1, 2** (page 1 right) | **156.4** | **15.64** | `195.9 − 34.5 − 5` |
| **7, 8** (page 1 left) | **160.1** | **16.01** | `195.9 − 6 − 29.8` |
| **3–6** (page 2) | **195.9** | **19.59** | full content band |

Grid placement:

- Cols **1–2**: `grid-row: 4 / 7` (body + footer-gutter + footer tracks on the right) → **156.4 mm**, `align-self: start` (top = under header).
- Cols **7–8**: `grid-row: 2 / 5` (header + header-gutter + body on the left) → **160.1 mm**, `align-self: start`.

Do **not** change these heights without updating all three of:

1. `style.css` (`--page1-right-col-height`, `--page1-left-col-height`)
2. `main.ts` (`page1RightColHeightMm`, `page1LeftColHeightMm`)
3. `backend/pkg/pdf/pamphlet.go` (`PamphletPage1RightColMm`, `PamphletPage1LeftColMm`)

## Packing rules (pixel-perfect)

1. **Strict fit (FE)** — `PACK_FIT_EPSILON_MM = 0.05` (float only). Never restore a soft floor like `2.5`; that packed past the band and looked like “columns stick out at the top”.
2. **Strict floor (PDF)** — `drawStackedItems` / `writeWrapped` must **not** paint below the column floor into the 10mm page margin or the footer gutter. A previous “overflow:visible soft floor” (~one body line) made ink disappear “under the sheet” between page 1 and page 2. Truncated remainder is spilled by FE densify on the next reflow, not drawn in the margin.
3. **Spill forward only** — when an item does not fit, move it (and the rest of the queue) to the **next** column in reading order; do not pull later columns into column 1.
4. **“+” outside ink** — `.pamphlet-add-item-button` is `position: absolute; top: 100%` on the column shell. It does **not** consume column mm.
5. **Clip ink, not the shell** — items live in `.pamphlet-column-ink` with `overflow: clip`. The column shell stays `overflow: visible` so “+” is visible. **Never** set `overflow: visible` on the whole column merely because “+” is present (that regression painted body text into the header).

## DOM shape

```html
<div class="dumb-column pamphlet-column-1">
  <div class="pamphlet-column-ink">…items + spacers…</div>
  <button class="pamphlet-add-item-button" type="button">…</button>
</div>
```

Helpers: `ensureColumnInk`, `columnBodyItems` in `pamphlet_io.ts`.

## Regression checklist

- [ ] Cols 1–2 top edge aligns with bottom of header-body gutter (no ink in header).
- [ ] Overflow from col 1 goes to col 2, then 3…8 — not upward / not into the page margin.
- [ ] PDF preview: no body text between page-1 bottom margin and page-2 top (no ink “under the sheet”).
- [ ] Cols 7–8 do not paint into the footer band.
- [ ] “+” remains clickable below the last packed column without unlocking ink overflow.
- [ ] Print / PDF band heights still 156.4 / 160.1 / 195.9 mm.
- [ ] Opening an existing .epam reflows without leaving clipped text above the band.
