# Phase 8 — live double-stacked wall

Turn the decorative `WallRing` from Phase 7 into a real wall: built as double-stacked
tiles, depleting as tiles are drawn, shortening from the break point.

## Investigate first — report before building

### From the rulebook (`docs/rules/mcr_EN.pdf`)

Use the rules-lawyer agent, as with the 83-discard derivation. Cite sections.

1. **Wall construction.** Confirm the standard build — 4 walls × 18 stacks × 2 tiles = 144.
   State the per-side stack count from the rules rather than assuming.
2. **Break point.** How is the starting position determined (dice roll procedure), and from
   which wall does dealing begin relative to the dealer?
3. **Draw direction.** Which way does drawing proceed around the wall from the break?
4. **Kong replacement draws.** Phase 6 established these come from the same pool
   (§3.6.8) rather than adding capacity. **Confirm whether the replacement tile comes from
   the front of the wall or the tail end** — if it's the tail, the wall depletes from *both*
   ends and the rendering must show that.
5. **Confirm no dead wall** (§3.4.30 per the earlier finding) — the wall depletes to zero.

### From the codebase

6. Does game state model a **break point** and dice roll, or does dealing just consume an
   array from index 0? If there's no break concept, say so — adding one is in scope but
   should be flagged as extra work.
7. Is there a `wall.drawIndex` or equivalent, and is it **reconstructible for Replay and
   Export**? Wall rendering must be derivable from replayable state, not from a mutable
   counter that replay can't reproduce.
8. How does the initial deal consume the wall (53 tiles — 13 × 4 plus the dealer's 14th)?
   At game start the wall should already render 53 tiles short.

## Requirements

### Construction and appearance

- Wall renders as **double-stacked tiles** on all four sides, forming the ring already
  reserved by the Phase 7 layout.
- **Flat top-down rendering only — no perspective transforms.** A rotateX tilt caused a
  real blur bug in this project. Convey the stack by drawing each position as a tile end
  with a visible split between upper and lower, not by faking depth.
- **Render one element per stack, not per tile** (~72 elements rather than 144), with three
  states: both tiles, lower only, empty. Keep it light for iPad.
- Tiles show backs, not faces.

### Depletion

- As tiles are drawn, they leave the wall. Within a stack the **upper tile goes first, then
  the lower**, then drawing moves to the next stack.
- Depletion proceeds from the **break point in the correct direction**, per the rulebook
  findings above — not from an arbitrary end.
- The wall visibly **gets shorter** as it empties: emptied stacks disappear rather than
  rendering as placeholders.
- If kong replacements draw from the tail, the wall shortens from both ends and the
  rendering must reflect it.
- The existing wall counter in the top bar must stay consistent with what's drawn — a
  mismatch between "Wall 74" and the visible tile count is worse than no wall at all.
  Assert it.

## Hard constraints

- **The reserved wall lane must not reflow as the wall depletes.** The lane keeps its
  thickness; only the tiles inside it change. Any reflow would resize the discard field
  mid-hand — the failure mode removed three times in this project and now a standing
  `CLAUDE.md` rule.
- **Do not silently shrink the discard field.** A convincing double stack may want more
  than the current 24px lane. Every extra pixel on the top and bottom lanes comes out of
  the discard field's height. If you need more thickness, **report the cost in measured
  discard tile size before taking it** — Phase 7 measured 68.4 design px and that number
  must not regress without an explicit decision.
- **Stable unique tile IDs** for wall tiles, per `CLAUDE.md`. A specific tile must be
  identifiable as it moves from wall to hand.
- **Build animation-ready, but do not animate.** Per the existing architectural note, the
  rendering layer should support a future animated wall-to-hand transition without rework —
  stable IDs and positions derived from state, not from imperative mutation. Draw
  animations remain deferred.
- No changes to fan detection, win validation, hint logic, or the rules of dealing. This is
  a rendering and state-exposure task; if it appears to need a change to dealing logic,
  stop and ask.
- Landscape only. `DESIGN_HEIGHT` 768. No third `transform: scale()`.
- Settings / Hint / Tile counts / All discards / toolbar keep working.

## Tests

1. At game start, the wall renders exactly 144 − 53 = 91 tiles, and matches the counter.
2. Wall tile count equals the counter after every draw, across a full hand to exhaustion —
   drive with the dev-only occupancy harness, not by playing bots.
3. Depletion starts at the break point and proceeds in the correct direction; stacks empty
   upper-then-lower.
4. Kong replacement draws deplete from the correct end (whichever the rulebook gives).
5. Wall lane geometry is invariant as the wall depletes — assert the discard field's
   dimensions are identical at 144 tiles and at 0.
6. Wall state is reconstructible from replayable state: replay a recorded hand and assert
   the wall renders identically at each step.
7. Existing suite green, including Phase 2, 4 and 7 regression tests.

## Verification

- Screenshots at: full wall (before deal), after the initial deal, mid-hand, and near
  exhaustion.
- Report measured discard tile size before and after, in design and rendered px, to confirm
  no regression from 68.4.
- 200% zoom — no softening on the stack split lines.
- iPad Safari landscape via `--host` — Kevin runs this on the physical device.
