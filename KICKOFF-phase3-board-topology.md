# Phase 3 (final revision) — physical-table board topology

**Supersedes both `KICKOFF-phase3-compact-tiles.md` and
`KICKOFF-phase3-central-discards.md`.** Decision taken after comparing against reference
clients: adopt the standard physical-table topology rather than incrementally growing the
current seat-rectangle layout.

## Target topology

```
+--------------------------------------------------------------+
|  ACROSS BOT strip: melds + backs (+ flowers)          ~110px |
+--------------------------------------------------------------+
|  wall border (top)                                     ~36px |
+------+------------------------------------------------+------+
| LEFT | wall |                                   | wall | RGHT |
| BOT  | (l)  |        CENTRAL DISCARD AREA       | (r)  | BOT  |
| strip|      |  four per-player blocks, each     |      | strip|
| ~120 |      |  aligned to its thrower's side    |      | ~120 |
+------+------------------------------------------------+------+
|  wall border (bottom)                                  ~36px |
+--------------------------------------------------------------+
|  HUMAN strip: flowers/melds row + hand row            ~160px |
+--------------------------------------------------------------+
```

- Seats become **thin edge strips**: the across bot on top, side bots left/right, human on
  the bottom. Bot strips contain melds + concealed backs (+ flowers). The human strip
  contains the hand (unchanged — do not touch hand sizing) plus melds/flowers.
- **Wall becomes a border** just inside the seat strips, replacing `WALL_SEGMENT_REGION`.
- **Centre is discards only**, in four per-player blocks, each adjacent to its thrower's
  edge. Attribution is spatial; no tints or labels unless geometry makes it ambiguous.
- The **most recent discard renders at hand-tile size**, independent of pile size — it is
  the only discard requiring instant readability (claim decisions). The current
  latest-discard highlight carries over.

Strip sizes above are starting estimates, not requirements. Derive real ones in step 1.

## Why (measured motivation — do not relitigate)

- Compact tiles at 44px are unreadable on both desktop and iPad (verified). Legibility
  thresholds measured on this project: ~82px marginal, ~99px comfortable, for hand tiles.
- Discards can never reach 82px at worst-case occupancy — the arithmetic ceiling for the
  old reclaim plan was ~61px perfect-packing. The edge-strip topology yields a central
  area of roughly **1450×390 ≈ 565k design px²** at `designWidth` 1768 (+~22%), raising
  the ceiling to **~66–68px**, comfortably above normal (60) with slack for packing loss.
- Reference clients (mahjong4friends and others) use exactly this topology; the current
  four-fat-rectangles layout is the outlier.

*All figures estimated from Phase 1 coordinates; step 1 replaces them with real ones.*

## Explicit scope decisions

1. **Flat, top-down rendering only.** One reference client uses a 3D-perspective table —
   its *topology* is the lesson, not its rendering. Do not introduce perspective
   transforms; a rotateX tilt already caused one blur bug in this project.
2. **Wall border is reserved-space-first, pretty-later.** Reserve the ~36px border lanes
   in the region model now; render the wall as simple flat depleting segments (drawn
   count ⇒ segments removed). Two-tier stacks, depth shading, and break-position realism
   are explicitly deferred. The central layout must not depend on the wall's rendering.
3. **Side-seat tiles may rotate 90°** (reference style) or stay upright in a narrow grid —
   whichever fits the ~120px strips better. Report the choice with measurements. If
   rotating, verify the raster-in-SVG faces survive rotation without softening (the
   art is raster inside SVG; 90° is a lossless orientation, but confirm on retina).
4. **The anchor-policy parity test retires with this work.** It existed to prove
   incremental edits didn't disturb the hand-tuned seat tables; this redesign replaces
   those tables wholesale. Delete it deliberately (note it in the commit message), and
   snapshot the **new** layout at `designWidth` 1024 as the replacement parity baseline.
   Everything else carries forward unchanged: adaptive `designWidth`, quantisation,
   `StageMetricsContext`, `fitRowTileWidth`, the property tests, worst-case-occupancy
   discipline.

## Step 1 — geometry feasibility report. Implement nothing yet.

1. **Worst-case discard count**, derived from MCR rules (144 tiles, deal, melds, wall
   exhaustion). State per-player max and total. Working estimate ~22/~88; confirm or
   correct.
2. **Strip budget**: real minimum heights/widths for each edge strip at each tileScale,
   given uniform compact tile size and worst-case melds+backs occupancy (use the
   melded + concealed = 13 coupling, don't size both for independent maxima).
3. **Wall border cost**: lane thickness needed for flat segment rendering, all four sides.
4. **Resulting central area** at `designWidth` 1024 / 1328 / 1768, after strips + wall
   lanes.
5. **At least two central block geometries** (e.g. four quadrants aligned to throwers;
   cross arrangement), each with tiles-per-row, rows, footprint at worst case, resulting
   uniform tile width at all three `designWidth` values.
6. **Go/no-go**: target is uniform discard width **≥ 60 design px at `designWidth` 1768
   at worst-case occupancy**. Report achieved width at 1328/1184 where 60 is not expected
   to hold (fit-with-floor shrink applies there). Confirm the latest-discard-at-hand-size
   overlay works independent of pile geometry.
7. Anything in the current codebase that structurally resists this topology (e.g.
   assumptions that discards belong to seat regions) — list, don't fix.

## Step 2 onward — after the report is reviewed

1. New region model: edge strips + wall lanes + central discard region, all functions of
   `designWidth`. New snapshot parity test at 1024.
2. Move discard rendering to the central region with per-player sub-blocks; spatial
   attribution; latest-discard overlay at hand size.
3. Wall border rendering (flat, depleting).
4. Re-couple compact tile size to tileScale (undo the 44×54 unification,
   `tileStyles.ts:146-154`, `:97-105`); apply `fitRowTileWidth` with a floor to every
   compact group.
5. Tests (below), re-measure, screenshots at worst-case occupancy.

## Constraints (unchanged from all prior phases)

- Size every region for **worst-case occupancy**, never current state. All measurements
  and screenshots with deliberately filled piles.
- Every group fit-scale exactly 1.0 at worst-case occupancy except deliberate
  fit-with-floor shrinks; assert it.
- Compact size monotonically non-decreasing across normal → large → xlarge; assert it.
- Property test across `designWidth` `[1024..1920]` step 8: no overlap among strips, wall
  lanes, central blocks; everything in bounds; centred things centred; right-anchored
  margins preserved.
- Retain `fitRowTileWidth` regression tests (incl. never-exceeds-nominal).
- `DESIGN_HEIGHT` 768. No third `transform: scale()`. No perspective transforms.
- Stable tile IDs. No auto-sorting. No changes to fan detection / win validation / hint
  logic / game state. Settings / Hint / Tile counts / toolbar keep working.
- Landscape only; portrait remains documented as a known limitation.
- Hand rendering and sizing: **do not touch.**

## Settled questions — do not reopen

- Tile face assets: raster-in-SVG verified fine on iPad retina at 99px. No vector
  replacement.
- Hand layout: resolved (one row, fit-scale 1.0, 99/95.7/84.4px xlarge across
  1910/1440/1280).
- Sentinel: excluded from row solver; `naturalHeight` counts occupied rows only.
