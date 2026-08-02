# Phase 2 (revised after Phase 1 findings)

**This supersedes Phase 2 in `KICKOFF-tile-legibility.md`.** Phase 1 invalidated several
of its assumptions. Read the deltas below before starting.

## What Phase 1 changed about the plan

- **Tiles are already SVG `<img>`, sourced from the FluffyStuff riichi set.**
  Original task 2.3 ("replace hand-drawn tiles with a vector set") is **done / not
  applicable**. Do not re-do it. The base64 PNG-inside-SVG detail is noted below as a
  separate, lower-priority item.
- **There is no CSS flexbox in the hand.** Original task 2.2's `flex-wrap: nowrap`
  advice is wrong. Wrapping is JS math in `computeRowPositions()` against a fixed
  design-space region width. Fix it there.
- **Original task 2.4 (bigger numerals, suit tints) is dropped.** See the arithmetic
  below — the tile presets are already large enough. Do not add these.
- **The `max-w-[1536px]` change is not the lever.** The design canvas is a fixed
  1024×768 uniformly scaled, and `scale` is height-bound (~1.077), so widening the
  width cap alone does nothing visible.

## The core finding to build on

Stage scale measured ~1.077. Nominal hand tile widths are 60 / 76 / 92.

| tileScale | nominal | × 1.077 | measured | implied group fit-scale |
|---|---|---|---|---|
| normal | 60 | 64.6 | 64.6 | 1.00 (no wrap) |
| large | 76 | 81.9 | 65.9 | 0.80 (wraps) |
| xlarge | 92 | 99.1 | 68.0 | 0.69 (wraps) |

**Eliminating the wrap alone yields ~82px (large) and ~99px (xlarge) with zero change
to `TILE_BOX_SIZE`.** The wrap triggers `Positioned.tsx`'s group fit-scale, which
shrinks the group by enough to cancel almost the entire requested size increase.

Corollary defect, fix as part of this work: **raising the tileScale setting currently
makes tiles smaller.** `large` (65.9px) renders below what `large` would be unwrapped
(81.9px), and `xlarge` (68.0px) is barely above `large`. The setting is actively
misleading.

*The table above is arithmetic derived from Phase 1's reported constants. Re-verify the
scale factor and nominal widths in code before relying on it.*

---

## 2.1 — Make the design canvas width adaptive (the main lever)

**Keep** the fixed-height design canvas and the single uniform `transform: scale()` in
`GameStage.tsx`. That architecture is sound: deterministic design-space layout is what
makes the Playwright measurements trustworthy. Do not replace it with fluid/responsive
CSS layout.

**Change** only that the canvas *width* is a constant. Derive it from available viewport
aspect, recomputed on resize:

```ts
// stageLayout.ts
const DESIGN_HEIGHT = 768;
const MIN_DESIGN_WIDTH = 1024;
const MAX_DESIGN_WIDTH = 1920;

const designWidth = clamp(
  MIN_DESIGN_WIDTH,
  Math.round(DESIGN_HEIGHT * (availWidth / availHeight)),
  MAX_DESIGN_WIDTH,
);
```

Height then always binds, `scale = availHeight / DESIGN_HEIGHT`, and the board fills the
window width at every size.

**Required follow-on:** `getSeatRegions()` and the hand region width (currently the
literal `992`) must become functions of `designWidth`, not constants. Audit
`stageLayout.ts` for every other hardcoded design-space coordinate that assumed 1024
and make it proportional or anchored. This is the bulk of the work in 2.1 — enumerate
them and report the list before editing.

**Target to hit:** xlarge needs `15 × (92 + gap) − gap` design px of hand region
(≈1436 at gap 4) to avoid wrapping, vs. 992 today.

Projected (verify these):

| viewport | availH | aspect | designWidth | scale | xlarge tile |
|---|---|---|---|---|---|
| 1910×1000 | 827 | 2.31 | ~1775 | 1.077 | ~99px |
| 1440×900 | 739 | 1.92 | ~1471 | 0.96 | ~88px |
| 1280×800 | 639 | 1.97 | ~1510 | 0.83 | ~77px |

**Acceptance:** board fills the large majority of window width at 1910px; resizing
scales it continuously with no jumps; `scale` changes when the window is *widened*, not
only when it is heightened.

## 2.2 — Eliminate hand wrapping structurally

Work in `computeRowPositions()` / `getSeatRegions()` (`stageLayout.ts:46-73`), **not** in
CSS.

- After 2.1, the hand region should be wide enough that 15 slots fit at all three tile
  scales. Verify this rather than assuming it.
- **Change the wrap-then-shrink behaviour.** A 2-row hand that is then group-shrunk is
  the worst outcome available — it is both harder to read *and* smaller. If the hand
  genuinely cannot fit one row, prefer reducing tile width down to a legibility floor
  and keeping one row; only wrap below that floor.
- **The drop-zone sentinel currently consumes a full tile-width slot.** If it does not
  need full width, reclaiming it is a free ~6.7% (1 of 15 slots). Check and reclaim if
  safe.
- Add a guard so the rendered tile width for a given tileScale setting can **never** be
  smaller than the rendered width at a lower setting.

**Acceptance:** hand is one row at all three tileScale settings, at every viewport width
down to iPad *landscape*. Raising tileScale always visibly increases tile size.

## 2.3 — Guardrails (do not skip; this is why the bug was invisible)

`tileStyles.ts` documents that `normal` fits 15 column slots with **zero spare**. Any
change to gap, padding or region width silently causes a wrap, and a wrap silently
shrinks tiles. A comment is not sufficient.

Add tests:

1. For each tileScale × a set of representative viewports: assert the hand occupies
   exactly **one** row.
2. Assert every group's fit-scale is exactly `1.0` in the default desktop case — i.e.
   nothing is being silently shrunk.
3. Assert rendered tile width is **monotonically non-decreasing** across
   normal → large → xlarge.
4. Assert `designWidth × scale` is within a small epsilon of available width at
   16:9-and-wider viewports (the board actually fills the window).

## 2.4 — Deferred / explicitly out of scope

- **iPad portrait is not fixed by this work.** At 0.75 aspect, `designWidth` clamps to
  `MIN_DESIGN_WIDTH`, width becomes binding, and the board shrinks; 15 slots × 60px
  needs ~956 design px at a scale well under 1. Portrait needs its own layout.
  **Declare landscape-only for now** and do not let portrait block 2.1/2.2. Note it in
  `SPEC.md` as a known limitation.
- **The base64-PNG-inside-SVG tile art.** The 34 standard tiles embed raster art rather
  than being true vector, so they will resample under non-integer scale (this is what
  made the `rotateX(8deg)` tilt soft). With the tilt bug fixed and tiles at ~99px this
  may be acceptable. Re-assess *after* 2.1/2.2 with fresh screenshots at 200% zoom and
  on iPad retina. If it still reads soft, sourcing true-vector faces is a separate
  session — do not bundle it here.
- Confirm `MAX_SCALE` in `GameStage.tsx` is not low enough to clamp once the height
  constraint is relieved. Report its value.

---

## Hard constraints (unchanged)

- Stable unique tile IDs preserved. No auto-sorting. See `CLAUDE.md`.
- Do not touch fan detection, win validation, shanten/hint logic, or game state.
- Do not add a third `transform: scale()`. Ideally 2.2 removes the per-group one from
  the default path entirely.
- Keep Settings / Hint / Tile counts / toolbar functionality working.

## Optional supporting change

Reclaiming the ~108px toolbar row above the stage in `Board.tsx` (overlay it, or move it
inside the design canvas) raises `availHeight` and lifts `scale` from ~1.077 to ~1.22,
multiplying every tile size above by ~13%. Cheap and compounding — but do it *after*
2.1/2.2 land, so the two effects can be measured separately.

## Verification

1. Desktop Chrome at 1910 / 1440 / 1280 wide × all three tileScale settings —
   screenshot the matrix, report measured tile width in each cell.
2. Resize continuously through that range: no wrap, no overflow, no jump.
3. Browser zoom 200% — assess tile face sharpness, report honestly.
4. iPad Safari landscape over Vite `--host`: one-row hand, sharp faces, safe-area
   respected, tap targets reliable. Eruda for on-device debugging.
5. Full test suite green, including the new tests from 2.3.
6. Report anything changed that you were not confident about.
