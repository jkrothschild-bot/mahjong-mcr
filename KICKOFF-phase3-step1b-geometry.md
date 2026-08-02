# Phase 3 — Step 1b: revised geometry model

Follows your Step 1 feasibility report. Still **no implementation.** This resolves the two
open questions, changes one packing rule, and asks for one more modelling pass.

## Your Step 1 findings — accepted, do not re-derive

- **83 discard events table-wide**, from `mcr_EN.pdf` (§3.4.30 no dead wall, §3.6.8 kong
  replacements draw from the same pool, §3.5.7 deal). Supersedes my ~88 estimate. Average
  ~21/player.
- **Left/right strips need ~200px, not 120px.** Kong wrapping below 4 columns is real; the
  transpose primitive lands at roughly the same number (13 tiles in columns of 4 ≈ 192px).
  Accepted. Budget 400px of `designWidth` for both.
- **Wide strips need a horizontal meld-cluster mode** that `groupBreakAfter` doesn't
  support. Accepted as required new work.
- **Human strip height is tileScale-dependent** (~154/178/202px), not a fixed 160.
  Accepted.
- **Wall lanes 36px × 4**, grounded in `WALL_TILE_HEIGHT` 34 + 2.
- **Transpose the packing axis, keep tile content upright.** Agreed — no legibility risk
  for no packing gain. Backs' existing orientation prop is unaffected.
- All seven structural blockers in your item 7 are accepted as the real work.

## Decision 1 — packing rule changes: groups of 6, packed horizontally

Your ~31px ceiling for top/bottom is correct arithmetic, and the cause is the 6-column
rule forcing tile count into the scarce axis (height) while leaving central width unused.

**New rule — group-major packing.** The 6-tile group stays the visual unit; groups pack
along the block's *long* axis before wrapping along its short axis.

- **Wide blocks (across, human):** each group is a horizontal run of 6. Groups lay
  left-to-right with an inter-group gap visibly larger than the intra-group tile gap.
  Wrap to a new band below only when width is exhausted.
- **Tall blocks (left, right):** transposed. Each group is a vertical run of 6. Groups lay
  top-to-bottom, adding columns left-to-right when height is exhausted.

The 6-wide rhythm is preserved by the inter-group gap rather than by a hard column count.

**`CLAUDE.md` must be amended.** The existing hard rule reads as a fixed 6-column count.
Reword it to state the *group size* is 6 and that groups pack along the block's long axis.
Do this as part of this work — otherwise a future session will "fix" the layout back and
silently reintroduce the 31px ceiling. Note the amendment in the commit message.

## Decision 2 — model asymmetric allocation

Your report modelled quadrant and edge-aligned arrangements. Neither handles the four-way
competition for the central rectangle, where top/bottom blocks want width and left/right
want height, and each steals the other's preferred axis.

Model **asymmetric allocation** as a third arrangement and choose on measurements.

### Corrected ceiling — use this to sanity-check candidates

My earlier ~66px figure for top/bottom was optimistic: it gave the top block the full
central width, ignoring left/right competition. Whole-area arithmetic at `designWidth`
1768, central ≈ 1296×400 ≈ 518k design px², compact aspect 1:1.227, gap overhead included:

| sizing target | uniform tile width ceiling |
|---|---|
| 83 tiles (rulebook, shared) | **~63px** |
| 100 tiles (4 × 25 margin) | **~57px** |

The 60px go/no-go target falls between them. **This makes the 4×25 over-provisioning the
deciding factor, not a footnote.** Four blocks cannot peak simultaneously — the rulebook
caps the table at 83.

Model all three sizing bases and report the achieved width for each:

1. 4 × 25 independent (your current margin)
2. 83 shared, with per-block soft limits and a defined overflow behaviour
3. Asymmetric per-block capacity — e.g. larger allocation to the human and across blocks
   whose geometry is width-favoured, smaller to left/right — justified by expected
   distribution rather than equal split

For option 2, state explicitly what happens when one player's pile exceeds its soft limit
while the table total stays under 83. Reflowing mid-hand is unacceptable (it is the
shrink-during-play failure this project already removed twice) — so the answer must be a
fixed allocation with headroom, not dynamic reallocation.

## What to report

1. Asymmetric arrangement geometry: per-block position, capacity, tiles-per-group-run,
   groups-per-band, footprint, at `designWidth` 1024 / 1328 / 1768.
2. Achieved uniform compact tile width for each of the three sizing bases above, at all
   three `designWidth` values.
3. Comparison against: 44px (today), 60px (target), 82px (marginal readability).
4. Whether the latest-discard-at-hand-size overlay works independent of block geometry.
5. Realistic skew bound: how far can one player's discard count deviate from ~21 given
   claims and kongs? If a hard bound isn't derivable from the rules, state the engineering
   figure and the reasoning — as you correctly did for 25.
6. Whether group-major packing needs any change to `computeRowPositions` beyond the
   horizontal-cluster mode already identified in your item 7.
7. **Go/no-go**, with a recommendation among the three sizing bases.

## Unchanged constraints

- Size for worst-case occupancy; all measurements and screenshots at filled piles.
- No mid-hand reflow or shrink under any circumstances.
- Every group fit-scale exactly 1.0 at worst-case occupancy except deliberate
  fit-with-floor shrinks.
- Flat top-down rendering; no perspective transforms.
- Wall border: reserve lanes now, flat depleting segments, realism deferred.
- `DESIGN_HEIGHT` 768; no third `transform: scale()`.
- Stable tile IDs; no auto-sorting; no changes to fan detection / win validation / hint
  logic / game state; Settings / Hint / Tile counts / toolbar keep working.
- Landscape only.
- **Hand rendering and sizing: do not touch.**
- Anchor-policy parity test retires with this redesign; replace with a snapshot of the new
  layout at `designWidth` 1024.
