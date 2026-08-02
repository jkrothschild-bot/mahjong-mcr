# Phase 7 — board rebuild: seat lines + four-zone discard field

Supersedes the Phase 6 stop branch and Phase 5. Phase 6 measured the *concentric* sketch
layout and correctly returned <50px. This is a different layout: the six-tile grouping
constraint is removed, seat lines carry hand + melds + flowers together, and the discard
field is four full-height zones. Phase 6's 39px does not apply.

Reference mockup geometry is below. Verify the numbers, then build — no review gate.

## What produced the gain (attribution, largest first)

1. **No fixed grouping in discards.** The field stops being a cross with a dead centre and
   becomes four zones that tile it completely.
2. **Human melds move inline onto the hand row at full size.** Costs nothing — melded +
   concealed is always 13, so melds occupy slots the hand already had. Frees the entire
   54px melds row for the field.
3. **Each seat's hand, melds and flowers share one line.** Side seats use columns, top uses
   a single row. Removes the separate meld region entirely.
4. **Top seat stays on one line.** Two rows costs ~7 design px of discard size.

Estimated result: **67 design px / ~72 rendered**, versus 39 at Phase 6 and 44 today.
That is ~88% of the measured 82px readability threshold, and drops the hand disparity from
2.36:1 to 1.37:1.

**These are my figures and have run optimistic three times.** Verify with the optimiser
before building. If the real number lands ≥60 design px, build without checking back.

## Layout specification

Design space 1768 × 768 at `designWidth` 1768. All values scale with `designWidth`.

**Vertical bands (top to bottom):** header 14 · north seat line 54 · wall 24 ·
**discard field 498** · wall 24 · human row 140 · header 14

**Horizontal bands (left to right):** west seat 144 (3 columns) · wall 24 ·
**discard field 1432** · wall 24 · east seat 144 (3 columns)

### Discard field

- Four zones, 358 design px wide each, ordered left to right: **west bot · you · north bot ·
  east bot**. Decided deliberately — west and east zones sit on their own side; the middle
  two are the seats without a side.
- Each zone: 20px label band, then a 5 × 5 grid at 67 × 82 px tiles, 71/86 pitch.
- Zone label carries seat wind and name. Labels are the attribution mechanism — seat
  colour-coding was evaluated and rejected.
- **No fixed group size.** Do not reintroduce a 6-tile or 3-tile grouping in the field.

**Open point to resolve with measurement:** zone capacity at 67px is 25, against a 30
per-pile soft limit. Table capacity is 4 × 25 = 100 against the 83 rulebook ceiling, so the
*table* always fits; only a single skewed pile can exceed 25. Either:

- keep 67px and let a pile past 25 extend additively into the inter-zone gutter, or
- drop to ~61px, which yields 5 × 6 = 30 capacity per zone with no overflow case.

Recommend the former — 25 against a 21 average is decent margin, and 6px of tile size is
worth more than eliminating a rare case. Confirm with the optimiser and state the choice.

### Seat lines

- **Side seats (west/east): 3 columns × 9 rows**, holding hand + melds + flowers on one
  continuous line (25 tiles worst case: 4 kongs = 16 melded, 1 concealed, up to 8 flowers).
- **Side seats stop at the wall ring (y 590). They must not run into the human row.**
  Decided — this is what lets the human row span the full board width and hold 18 slots.
  It costs the field 96px of width and ~5px of tile size. Accepted deliberately.
- **North seat: one row**, hand + melds + flowers, 23–25 tiles at 44px.
- Tile content stays upright everywhere. Rotation was measured as a wash on size and costs
  glyph readability.

### Human row

- Spans the full board width (side seats are clear of it).
- **Concealed tiles and revealed melds share the row at full hand-tile size (92px)**, melds
  to the right of concealed, separated by a visible gap. 18 slots worst case
  (17 + drawn) = 1728px, fits 1768.
- **Flowers at discard size (67px), filling from the right end.** Full hand-tile size is
  impossible — 18 slots plus 8 flowers at 92px is 2,496px against 1,768.
- **Fill rule: hand slots fill from the left, flowers fill from the right.** In the
  practically-unreachable case where they meet (4 kongs plus many flowers), the existing
  `fitRowTileWidth` floor handles it. No reflow in any realistic state.
- **Hand tile sizing and `fitRowTileWidth`'s floor are unchanged.** Only the row's
  membership grows.

## Constraints

- **Size for worst-case occupancy.** Use the Phase 5 dev-only occupancy harness; verify at
  4 kongs + flowers on every seat and 83 discards distributed skewed, not a fresh hand.
- **Overflow is additive, never rescaling** (`CLAUDE.md` standing rule). No mid-hand reflow
  or resize under any circumstance.
- Every group's fit-scale exactly 1.0 at worst-case occupancy except deliberate
  fit-with-floor shrinks; assert it.
- Compact tile size monotonically non-decreasing across normal → large → xlarge; assert it.
- `fitRowTileWidth` never exceeds nominal (Phase 2 regression case where `normal`'s nominal
  sits below the floor).
- Reuse `packGroupsMajor` / `uniformGroupSizes` from Phase 4.
- Stable tile IDs. No auto-sorting. No changes to fan detection / win validation / hint
  logic / game state. Settings / Hint / Tile counts / All discards / toolbar keep working.
- `DESIGN_HEIGHT` 768. No third `transform: scale()`. No perspective. Landscape only.

## Tests

1. Worst-case occupancy at 1910 / 1440 / 1280 × all three tileScales: every region renders
   with fit-scale 1.0, no overlap, nothing outside the board.
2. **Side seat columns must not intrude into the human row band** — assert the boundary
   directly. This is the decision that makes the kong case safe.
3. Human row holds 18 slots at 92px plus at least 3 flowers without shrinking.
4. Discard zones do not overlap each other, the wall ring, or any seat line, across
   `designWidth` `[1024..1920]` step 8.
5. **Slack assertion on the side columns.** Phase 6's mockup exposed a near-zero-margin fit
   (13 rows × 58 = 754 of 768). Assert the actual remaining slack is above a stated
   minimum, so a future padding change can't silently push a seat to an extra column.
6. Existing suite green, including all Phase 2 and Phase 4 regression tests.

## Verification

- Screenshots at worst-case occupancy, all three viewports and tileScales. Report measured
  discard, meld, flower and hand tile sizes in design and rendered px.
- 200% browser zoom — no softening.
- iPad Safari landscape via `--host`. **Kevin runs this on the physical device**; emulation
  is not a substitute for touch behaviour.

## Settled — do not revisit

83 discard events table-wide (`mcr_EN.pdf` §3.4.30, §3.6.8, §3.5.7); ~21/player average.
Per-seat totals 13+K, up to 17. Raster-in-SVG tile faces verified fine on retina. Hand tile
sizing untouched. Seat colour-coding evaluated and rejected. Tile rotation evaluated and
rejected. Concentric ring layout measured and rejected (Phase 6).
