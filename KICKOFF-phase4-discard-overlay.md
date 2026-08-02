# Phase 4 — discard overlay (implementation)

First implementation work since Phase 2. The modelling arc is closed: the central-discard
topology tops out at 50.5 design px (54.3 rendered) against an 82px readability threshold,
so **the overlay is what actually solves discard legibility**, and it does so on the
current layout.

Sequencing decision: this ships first. Combined melds+backs region follows. The full
edge-strip topology is deferred and will be re-decided afterwards, on the wasted-space
question alone.

## THE critical technical instruction

**Render the overlay outside `GameStage`'s `transform: scale()`.** It is a viewport-level
element, not part of the 1024×`DESIGN_HEIGHT` design canvas.

Two reasons, both load-bearing:

1. Inside the stage it inherits the non-integer ~1.0758 scale — the exact mechanism that
   caused the original blur bug in this project.
2. Inside the stage it is capped by `DESIGN_HEIGHT` 768 and the middle band. Outside it
   gets the whole window: ~1900×950 at a 1910×1000 viewport, versus ~1394×430. That
   difference is the entire reason the overlay can be readable when the table can't.

The overlay does not consume `designWidth`, does not participate in `getSeatRegions`, and
must not affect any existing region budget.

## What it shows

All four players' discards at once, enlarged and readable. Discard reading in MCR is
comparative — you check what's safe across all opponents, not audit one player.

**Layout: four horizontal bands, one per player.** Order them to match table position
(across at top, then left and right, human at bottom) and label each with seat wind and
player name — horizontal bands lose the spatial who-threw-it mapping that the table has, so
labels are required, not optional.

**Geometry target** at a 1910×1000 viewport, ~1900×950 available:

| | value |
|---|---|
| band per player | ~1900 × 237 |
| tile size | **~90px rendered** |
| groups per band | 3 (6-column groups, packed horizontally) |
| bands per player | 2 (5 groups of 6 = 30 tiles) |
| band height | 2 × 114 = 228 ≤ 237 ✓ |

~90px clears the 82px marginal threshold and approaches hand-tile size (99px). Verify
rather than assume; report measured values.

**Per-tile requirements:**

- Discards in **throw order**, left to right, top to bottom within each band.
- The **most recent discard clearly marked** — it is the claim-relevant tile.
- 6-tile group rhythm preserved via inter-group gaps, consistent with the table.

## Reuse, don't rebuild

- **The group-major packing primitive** identified in Step 1b item 6: pack groups of size k
  along a specified long axis, wrapping only when exhausted, with distinct intra- and
  inter-group gaps. The overlay is the first consumer. Build it here, parameterised, so the
  melds/backs work and any future topology work reuse it. This is the payoff of that finding.
- **Existing tile components** at hand-tile size. No new tile rendering.
- **`fitRowTileWidth`** with a floor, so the overlay degrades on small viewports without
  ever overflowing.

## Interaction

- **Trigger:** a dedicated toolbar button (alongside Tile counts / Hint), **and** tap or
  click on the central discard area. Tap is required — iPad has no hover, so do not build
  this hover-only.
- **Dismissal:** Escape, the same toolbar button, or tap anywhere outside a band.
- **Game state:** the overlay reads state and changes nothing. Confirm whether bot turns
  are on a timer; if they are, the overlay must pause it, otherwise a player could lose a
  claim window while looking. If turns are strictly event-driven, no pause needed — state
  which applies.
- Opening and closing must not disturb hand tile order, selection state, or the drop-zone.

## Occupancy

- Size for **83 discards table-wide** (`mcr_EN.pdf` §3.4.30, §3.6.8, §3.5.7), with **30 as
  the per-block soft limit**.
- **Overflow is additive, never rescaling** — per the rule just added to `CLAUDE.md`. A band
  past 30 keeps its tile size and extends along its long axis. It never shrinks
  retroactively, and the overlay never reflows while open.

## Tests

1. At 1910×1000, all four bands render every discard at **≥82px rendered** with fit-scale
   exactly 1.0, at worst-case occupancy (83 table-wide, and a skewed 30-in-one-band case).
2. Overlay layout is independent of `designWidth` and `tileScale` — assert it does not
   change when either changes.
3. Overlay renders outside the stage transform — assert no inherited scale on its subtree.
4. Opening and closing leaves hand order, selection and drop-zone state untouched.
5. Degrades without overflow at 1280×800 and at iPad landscape dimensions.
6. Existing suite stays green, including all Phase 2 regression tests.

## Verification

- Desktop Chrome 1910 / 1440 / 1280, at all three tileScales, with a **deliberately filled
  discard pile** — screenshot each, report measured tile size.
- 200% browser zoom — confirm no softening (this is the test that proves the
  outside-the-transform requirement was met).
- **iPad Safari landscape** over Vite `--host`: tap trigger works, tiles sharp on retina,
  safe-area insets respected, dismissal reliable. This is the environment the whole
  affordance exists for.

## Constraints

Stable tile IDs. No auto-sorting. No changes to fan detection / win validation / hint logic
/ game state. No perspective transforms. Hand tile sizing and `fitRowTileWidth`'s floor
unchanged. Settings / Hint / Tile counts / toolbar keep working. Landscape only.

## Next, after this ships

Combined melds+backs region: one 17-slot region per bot seat (kong-corrected — 13+K, up to
17), melds face-up in front of concealed backs, one row. Addresses the "revealed hands too
small" half of the original complaint. Reuses the group-major primitive built here. The
edge-strip topology stays deferred until both are in and the board can be judged fresh.
