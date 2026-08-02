# Phase 3 — Step 1d: final modelling pass

**This is the last modelling pass before implementation.** Four passes have caught three
genuine dead ends, but the remaining uncertainty is packing efficiency, which models
estimate poorly and implementation measures exactly. Decision rule is at the bottom — it
commits to building regardless of outcome.

## Do this first, independent of everything else

**Add to `CLAUDE.md`:** overflow is additive, never rescaling. A region past its soft
occupancy limit keeps its fixed tile size and extends along its long axis into adjacent
neutral space; it never shrinks retroactively, and layout never reflows mid-hand. This is
the general form of a bug removed twice from this project and holds regardless of which
topology wins. Do not wait for the rest of this pass.

## Accepted from your Step 1c report

- **The 13-invariant is wrong as I stated it.** Kongs add +1 each: steady state is 13+K,
  up to 17 on a Four Kongs hand. Your 4-groups-of-3 pessimistic case bounds the kong
  scenario; keep using it. Size the per-seat region for **17**, not 13, and state the cost.
- **Scale-dependent side-strip column count** — 2 columns (~112px) at normal/large, 4
  columns (200px) at xlarge. Accepted; not a single fixed answer.
- **Flowers inline, compact size, additive width.** Confirmed — that was the intent of the
  "(+ flowers)" parenthetical. Item 3's figures stand on that reading.
- **`fitRowTileWidth` reuse for the human 14-slot row is correct** and does not violate the
  "don't touch hand sizing" constraint. The mechanism and floor are unchanged; only the
  row's membership grows. Proceed.
- Middle-band gain is ~16–17%, not the 28% I hypothesised. The shortfall was on side-strip
  width, not height.
- The 1328 regression-below-baseline from Step 1b no longer holds at normal/large. Real
  confirmed improvement.

## The framing error to correct — this is the pass's whole point

`TILE_FACE_COMPACT_PX` is **44×54**, and `fitRowTileWidth` only ever shrinks from nominal.
So no previous pass could return a discard width above 44px — every model has been
measuring forced shrinkage, not achievable size. The unused slack you found at 1768 is the
answer nobody was allowed to reach for.

**Re-couple compact tile size to tileScale and treat nominal compact size as a free
variable to be solved for**, not an input. Undo the 44×54 unification
(`tileStyles.ts:146-154`, `:97-105`) as part of this model.

### Solve it as a fixed point, not sequentially

Compact size is currently uniform across discards, melds and backs. So raising it grows the
**strips**, which shrinks the **middle band**, which shrinks the **pile budget**. Iterating
"raise size → remeasure band → raise again" will oscillate and land arbitrarily.

Solve for the compact size where strip requirements, middle-band dimensions and pile
packing balance simultaneously. State the method used.

### Rough headroom for sanity-checking only

Normal scale, `designWidth` 1768, middle band ~1472×516:

| basis | theoretical max | after plausible packing loss |
|---|---|---|
| 4 × 30 = 120 tiles | ~68 design px | ~54 design px |
| 83 shared | ~82 design px | ~65 design px |

My estimates have run optimistic three times (~66, ~63, then the 28% band gain that came
in at 17%). Use these only to detect gross errors, not as targets.

## Model these variants

1. **Uniform compact size** across discards/melds/backs — the current constraint.
2. **Decoupled backs.** Face-down backs carry no information beyond their count, but under
   uniformity they occupy strip area at full readable size, and strip area is exactly what
   the middle band competes for. Model backs at a smaller independent size and report the
   middle-band and discard-width gain. If the gain is material, this is a cheap win and the
   earlier "treat both the same" decision should be revisited.
3. **Sizing basis**: 4×30 independent vs. 83 shared, per Step 1b.

Report the matrix across: variant × sizing basis × tileScale × `designWidth`
(1024/1328/1768), in **both design and rendered px**.

## Also resolve

- **The latest-discard overlay footprint.** Unresolved through Step 1b and 1c. It needs an
  answer this pass: either a reserved slot adjacent to each block, or it replaces the
  pile's own most-recent tile position in place. Pick one and cost it.
- **Per-seat region sized for 17**, not 13 — report the cost against the 13-based figures
  in Step 1c item 1.

## Decision rule — commits to building either way

- **≥60 design px** at `designWidth` 1768 on the recommended variant ⇒ **build the full
  topology.** Proceed to implementation.
- **50–59 design px** ⇒ **build it anyway**, and add tap/hover-to-zoom on discard blocks as
  the legibility completion. Do not run a fifth modelling pass.
- **<50 design px** ⇒ **abandon the central-discard topology.** Fall back to: keep discards
  in seat regions, take the strip/wall/space-reclaim wins only, and solve legibility with
  the zoom affordance plus the existing Tile counts panel.

State which branch the numbers select, and stop for review before writing implementation
code.

## Unchanged constraints

Worst-case occupancy sizing; no mid-hand reflow or shrink; fit-scale exactly 1.0 except
deliberate fit-with-floor; flat top-down rendering, no perspective; wall lanes reserved,
flat depleting segments, realism deferred; `DESIGN_HEIGHT` 768; no third
`transform: scale()`; stable tile IDs; no auto-sorting; no changes to fan detection / win
validation / hint logic / game state; Settings / Hint / Tile counts / toolbar keep working;
landscape only; hand tile size and `fitRowTileWidth`'s floor unchanged.

## Settled — do not revisit

83 discard events table-wide (`mcr_EN.pdf` §3.4.30, §3.6.8, §3.5.7). 30 as per-block soft
limit (free vs. 25 under group-of-6 rounding). Discards' group-major packing and melds'
cluster/transpose are one parameterised primitive. Transpose the axis, keep tile content
upright. Raster-in-SVG tile faces verified fine on retina. Hand layout resolved.
