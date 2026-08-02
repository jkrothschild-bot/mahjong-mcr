# §2.2 directive — hand fit (revised after step 6 matrix)

Supersedes §2.2 in `KICKOFF-tile-legibility-phase2.md`. Do these in order, reporting
after each.

## Established by the step-6 matrix

- §2.1 worked: `large` unwrapped at 1910/1440, rendering 81.8px vs. projected 81.9px.
- `normal` was never broken — 64.6px, unchanged. Do not touch it.
- `xlarge` wraps at all three widths and now renders *smaller* than `large`
  (68.0px vs 81.8px).
- Stage `scale` is 1.077 at all three widths (test viewports are 1000px tall, so
  `availHeight` is constant and only `designWidth` varies). All projections below assume
  1.077 — re-derive if viewport height changes.

## Two constraints, both closable

**1. The `max-w-[1536px]` cap is now binding.** Measured `designWidth` 1424 at a 1910px
viewport is exactly `768 × (1536 / 827)` — the cap, not the window, is limiting
`availWidth`. Removing it yields `designWidth` ≈ 1745 at 1910. It has no effect at
1440/1280, where the window binds.

**2. The sentinel costs a whole slot, and that slot is the entire remaining gap.**

| tileScale | slots incl. sentinel | slots excl. sentinel | hand region @ dW 1424 |
|---|---|---|---|
| large | `15×80−4 = 1196` | `14×80−4 = 1116` | 1392 — fits either way |
| xlarge | `15×96−4 = 1436` | `14×96−4 = 1340` | 1392 — **fits only if excluded** |

Reclaiming the sentinel unwraps `xlarge` at the *current* `designWidth`, with no cap
change. It is the fix for both remaining defects, not a minor cleanup.

## Work order

### 1. Reclaim the drop-zone sentinel slot

`HandTiles.tsx:154` passes `order.length + 1` to `computeRowPositions` with real
`tileWidth`/`tileHeight`.

Preferred: **exclude the sentinel from `computeRowPositions` entirely** and position it
separately (overlay, or derive its rect from the last real tile's position). The row
solver should only ever see real tiles.

Fallback if the sentinel genuinely needs to participate: give it zero or reduced width
so it cannot claim a full slot.

Do not solve this by widening the region — that just moves the boundary.

### 2. Fix `naturalHeight` to count occupied rows only

Independent of the sentinel: `computeRowPositions` currently derives `naturalHeight` from
allocated rows, so a row containing no real tiles inflates it, blows the region height
budget, and triggers the uniform group-shrink for the whole row — including tiles that
fit fine. This is what produced the 1280/large regression (65.7px with `rows: 1`;
sentinel bounding box at y≈819 vs real tiles at y≈715).

Derive `naturalHeight` from rows that actually contain tiles. Keep this fix even after
step 1, so a future off-by-one cannot silently reintroduce whole-row shrinking.

### 3. Remove the `max-w-[1536px]` cap

Let `availWidth` come from the viewport. `MAX_DESIGN_WIDTH` (1920) remains the only
ceiling. Verify `MAX_SCALE` in `GameStage.tsx` does not clamp once this is relieved —
report its value.

### 4. Shrink-to-fit-one-row instead of wrapping

When 14 tiles do not fit one row at nominal width, **reduce tile width to fit one row**
down to a legibility floor. Only wrap below that floor.

Solve for `w` from `14(w + gap) − gap ≤ regionWidth`.

Projected outcomes with steps 1–4:

| viewport | hand region | xlarge | result |
|---|---|---|---|
| 1910 (cap removed) | 1713 | fits nominal | **~99.1px** |
| 1440 | 1300 | 40px short → shrink | **~96px** |
| 1280 | 1152 | 188px short → shrink | **~85px** |

Monotonicity across normal → large → xlarge then holds **by construction** at every
viewport (85px > 81.8px > 64.6px). Do not add a runtime `Math.max` clamp — express it as
a test (§2.3 assertion 3). If the test fails, the fit logic is wrong; clamping would
only hide it.

Set the legibility floor explicitly and document the chosen value. It must be above
`normal`'s rendered width, or raising the setting can still lose.

### 5. Re-measure and stop

Report the full 3 viewports × 3 tileScales matrix again: rows, tile width, `designWidth`,
and each group's fit-scale. Assert all fit-scales are 1.0 except where step 4
deliberately shrank.

## Then: re-assess before any further work

Screenshot 1910/large and 1910/xlarge and compare against the original complaint
(~57px tiles, wrapped hand, ~980px board). At 99px on a ~1745-wide board the presenting
problem is likely resolved.

**Specifically re-assess whether the deferred base64-PNG tile-art item is still worth a
session.** The raster faces resample under non-integer scale, but at 99px with the
`rotateX(8deg)` tilt bug already fixed, that may no longer be visible. Judge from the
screenshots and a 200% zoom, not from principle.

## Constraints (unchanged)

Stable tile IDs. No auto-sorting. No changes to fan detection / win validation / hint
logic / game state. No third `transform: scale()` — ideally step 4 removes the per-group
one from the default path. Keep Settings / Hint / Tile counts / toolbar working.
