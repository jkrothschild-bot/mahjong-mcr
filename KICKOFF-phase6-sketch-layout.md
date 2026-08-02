# Phase 6 — measure the sketched layout

A hand-drawn target layout now exists (see `docs/layout-sketch.jpg` — save the sketch there).
It differs structurally from everything modelled in Steps 1a–1d, so the 50.5px result does
**not** apply to it.

**One short measurement pass, then implement.** Not another modelling arc. If the number
clears the threshold, go straight to build without a further review gate.

## The sketched layout

Concentric rings, using the full board rather than reserved zones:

```
+================================================================+
|  bot hand (backs), single line hard against the edge           |
|  bot revealed hand (melds), second line just inside            |
|  +----------------------------------------------------------+  |
|  |  WALL — thin ring, all four sides                        |  |
|  |  +----------------------------------------------------+  |  |
|  |  |                                                    |  |  |
|  |  |     CONTIGUOUS CENTRAL DISCARD FIELD               |  |  |
|  |  |     four sub-groups, each nearest its thrower      |  |  |
|  |  |     ~21 tiles per player (83 total / 4)            |  |  |
|  |  |                                                    |  |  |
|  |  +----------------------------------------------------+  |  |
|  +----------------------------------------------------------+  |
+================================================================+
```

Human seat follows the same pattern on the bottom edge: hand row plus revealed row.

## The four structural differences from what was modelled

These are what to test. Named in order of expected impact.

### 1. Discards are ONE contiguous field, not four framed blocks

Steps 1b and 1d used a frame arrangement: a full-height column reserved down each side for
the left/right piles, with the remainder split between top and bottom. That reserves each
column for its tallest requirement and leaves the corners dead.

**Model a contiguous central rectangle instead**, packed as a single field with four
labelled sub-groups positioned nearest their throwers. Sub-groups may share row/column
boundaries rather than each owning a reserved strip.

This is the difference most likely to explain the gap between the available area and the
50.5px result.

### 2. Seat rows are thin lines hard against the board edge

Backs as a single line along the edge; melds as a second line just inside. 1–2 tiles deep,
not the 112–200px multi-row grids previously modelled, and not inset from the edge.

Note the height constraint: 13 tiles stacked vertically at 58px pitch is ~754px against a
768 design height — a single-column side seat only works at small tile sizes. Two columns
of 7 gives more size headroom at the cost of strip width. **Measure both.**

### 3. Break the uniform-compact-size coupling

Compact size is currently uniform across discards, melds and backs. That means growing
discards fattens the seat strips, which shrinks the middle band — the feedback loop that
pinned the Step 1d fixed point at 50.5px.

**Face-down backs carry no information beyond their count.** Model backs at an independent,
smaller size. Step 1c tested this and found no benefit, but that was inside the frame
arrangement where melds were always the binding constraint; in a thin-edge layout the
binding constraint may differ. Re-test, don't assume the earlier result carries.

Consider decoupling melds from discards too, and report separately.

### 4. Side-seat tile rotation

The sketch allows side-seat tiles rotated 90°. Rotation swaps which dimension is
constrained, which helps a single-column arrangement and may not help a two-column one.
**Test, don't assume it helps** — earlier arithmetic suggests unrotated two-column is more
width-efficient. Keep tile content upright regardless (settled in Step 1b).

## What to report — keep it short

1. Achieved uniform/decoupled discard tile size for the sketched layout, at `designWidth`
   1024 / 1328 / 1768, all three tileScales, in **design and rendered px**.
2. Achieved meld and back tile sizes.
3. Which of the four differences above contributed what — so the result is attributable.
4. Comparison against: 44px today, 82px rendered marginal readability, and the 99px hand
   tile size (the disparity ratio matters visually, not just the absolute).
5. Whether the wall ring fits at the sketched thinness on all four sides.

## Decision rule — implement on any reasonable outcome

- **≥76 design px (~82 rendered)** ⇒ board is readable unaided. Build it; the Phase 4
  overlay becomes a convenience.
- **60–75 design px** ⇒ build it. Disparity against the 99px hand drops to ~1.4:1, a large
  visual improvement, with the overlay covering close reading.
- **50–59 design px** ⇒ build it only if it is clearly better than the current layout on
  the wasted-space complaint; otherwise stop and keep the current board plus the overlay.
- **<50 design px** ⇒ report and stop. Something is wrong with the model, not the layout.

No further modelling pass in any branch.

## Carry forward — settled, do not re-derive

- 83 discard events table-wide (`mcr_EN.pdf` §3.4.30, §3.6.8, §3.5.7); ~21/player average;
  30 as per-block soft limit.
- Per-seat totals are 13+K, up to 17 (Four Kongs). Worst case for packing is 4 groups of 4
  plus 1 concealed.
- `packGroupsMajor` / `uniformGroupSizes` exist from Phase 4 — reuse, don't rebuild.
- Overflow is additive, never rescaling (`CLAUDE.md` standing rule). Size for worst-case
  occupancy; never reflow or shrink mid-hand.
- Tile content stays upright. Flat top-down rendering, no perspective.
- Raster-in-SVG tile faces verified fine on retina.
- Hand tile sizing and `fitRowTileWidth`'s floor: unchanged.
- Dev-only occupancy harness (Phase 5) is the way to verify worst case — do not rely on
  driving bots.

## Constraints

Stable tile IDs. No auto-sorting. No changes to fan detection / win validation / hint logic
/ game state. Settings / Hint / Tile counts / All discards / toolbar keep working.
`DESIGN_HEIGHT` 768. No third `transform: scale()`. Landscape only.

## Relationship to Phase 5

Phase 5 (combined melds+backs region) is **superseded** if this layout is built — the
sketch puts melds and backs on separate adjacent lines rather than merging them into one
region. Do not build Phase 5 first. If this phase reports a stop branch, revisit Phase 5.
