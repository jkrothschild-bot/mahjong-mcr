# Phase 3 — Step 1c: the melded+concealed=13 invariant

Follows your Step 1b no-go. **Still no implementation.** Step 1b's conclusion is
provisionally withdrawn pending this pass — a structural saving was missed by both of us,
and it may be large enough to change the verdict.

## The missed invariant

**A seat always displays exactly 13 tiles, regardless of how many are exposed.** Claiming
a pung or kong *moves* tiles from concealed to melded; it never adds any. Step 1b sized
each seat's strip for melds' row requirement *plus* backs' row requirement — sizing two
regions for their independent maxima when their sum is a constant.

Two consequences:

### 1. Melds and backs are one region, not two

One **13-slot region per bot seat**: melds face-up at the front, concealed backs behind.
This is also the physical-table arrangement. Applies to all four seats.

Replaces the separate melds region + backs region in the current `SeatRegions` shape.

### 2. The human's hand and melds are one row

Your hand is always 13 + drawn = **14 displayed tiles**. Melds occupy hand slots rather
than needing their own row. So the human strip is a single 14-slot row, not a hand row
plus a melds row.

Melded sets render at hand-tile size inline, visually separated from concealed tiles.
At xlarge that is 14 × 96 = 1344 design px — fits within `designWidth` 1768. Verify it
fits at 1328 and 1024 too; if not, define the fallback (compact melds inline, or a
separate row only when needed — but never a mid-hand reflow).

**Do not change hand tile sizing.** This changes only what shares the hand's row.

## Revised strip budget hypothesis — verify, do not assume

| | Step 1b | with the invariant | basis |
|---|---|---|---|
| across strip | 100px | **~85px** | 13 slots in one horizontal row |
| human strip | 154–202px | **~150px** | one 14-slot row, xlarge |
| side strips | 200px each | **~128px each** | 13 slots in 2 columns × 7 rows |
| wall lanes | 36 × 4 | unchanged | grounded in `WALL_TILE_HEIGHT` |
| **middle band** | **1296 × 400** | **~1440 × 461** | **+28% area** |

Against the readability requirement, in rendered px at scale 1.0758:

- available ≈ **768k rendered px²**
- 83 tiles at 82×100 ≈ **680k rendered px²**
- ⇒ roughly **13% slack**, versus 13% *over* budget in Step 1b

**Treat this as a hypothesis, not a result.** My estimates have been optimistic twice
(~66px, then ~63px); your optimizer came in below both. 13% slack is inside my error
margin. The modelling decides.

## The tradeoff to measure

Narrowing side strips from 200px (4 columns) to ~128px (2 columns) means **a claimed kong
wraps across columns.** That is the cost of the width saving. Measure both:

- 2 columns / 128px — maximum central width, kongs wrap
- 4 columns / 200px — kongs intact, less central width

Report the resulting discard tile width for each, and recommend. If 4 columns still clears
the target, prefer it — intact kongs are worth real width.

## What to model and report

1. Per-seat 13-slot region geometry, all three tileScales, at `designWidth` 1024 / 1328 /
   1768. Confirm a kong renders without internal wrapping at whichever column count you
   recommend.
2. Human 14-slot combined row: does it fit at all three `designWidth` values at all three
   tileScales? State the fallback where it doesn't.
3. Resulting middle band dimensions at all three `designWidth` values.
4. Discard geometry in the enlarged band, using the **asymmetric allocation search** from
   Step 1b (the balanced min-scale optimiser — it was the right method, only the input
   area was too small). Report achieved uniform tile width for both side-strip options.
5. Comparison against 44px (today), 60px (target), 82px (marginal readability) — in both
   design and **rendered** px. Step 1b's numbers were design-space only; the readability
   thresholds were measured in rendered px, and I failed to state which unit the 60px
   target used. **It means 60 design px; the rendered equivalent of the 82px marginal
   threshold is ~76 design px.** Report both columns from here on.
6. Where the latest-discard-at-hand-size overlay's footprint comes from — unresolved in
   Step 1b and still needs an answer.
7. Flowers: 8 across all players. Confirm they fit in the revised strips.
8. **Go/no-go**, with the recommended side-strip option.

## Findings from Step 1b to carry forward — settled

- **83 discard events table-wide** (`mcr_EN.pdf` §3.4.30, §3.6.8, §3.5.7). Not to be
  re-derived.
- **Standardise on 30 as the per-block soft limit** — identical footprint to 25 because
  both round to 5 groups of 6. Free headroom.
- **Discards' group-major packing and melds' cluster/transpose need are one parameterised
  primitive**: pack groups of size k along a specified long axis, wrapping only when that
  axis is exhausted, with distinct intra- and inter-group gaps. One function.
- **Overflow is additive, never rescaling.** A block past its soft limit keeps its fixed
  tile size and extends along its long axis into adjacent neutral space. Never shrinks
  retroactively. **Add this to `CLAUDE.md` as a standing rule** — it is the general form of
  the bug removed twice already, and it applies regardless of which layout wins.
- Transpose the packing axis; keep tile content upright.
- Group-of-6 on the transposed axis is worth revisiting, but is worth only a few px — not
  the lever.

## Deferred until this pass reports

The discard-affordance question (recent-readable-plus-aggregate vs. tap-to-zoom vs. Tile
counts panel) and the go/no-go on the topology as a whole. Both were about what to do if
readable piles are impossible. If this pass clears the threshold, neither is needed.

## Unchanged constraints

Size for worst-case occupancy; no mid-hand reflow or shrink ever; fit-scale exactly 1.0
except deliberate fit-with-floor; flat top-down rendering, no perspective; wall lanes
reserved now, flat depleting segments, realism deferred; `DESIGN_HEIGHT` 768; no third
`transform: scale()`; stable tile IDs; no auto-sorting; no changes to fan detection / win
validation / hint logic / game state; Settings / Hint / Tile counts / toolbar keep working;
landscape only; **hand tile sizing untouched**.
