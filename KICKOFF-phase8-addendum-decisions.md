# Phase 8 addendum — decisions A and B

Answers to the two open questions from your investigation report. Everything else in
`KICKOFF-phase8-live-wall.md` stands unchanged. Proceed to build after the engine change
below.

## Decision A — fix the engine. Two pointers, no compatibility path.

Chosen: **A3.** Finding #7 is a rules deviation, not a rendering gap — §3.6.8 and §3.4.20
both specify the back end and the engine uses the front. Fix the engine so the renderer
reads reality rather than inferring it.

- `Wall` becomes `{ tiles, frontIndex, backIndex }`.
- `performDrawWithLog` takes which end to draw from. **Back end for every replacement
  draw**: concealed kong, added kong, claimed kong, and flower replacement — including
  flower replacements that occur during the initial deal (§3.4.20 is general, not
  deal-scoped). Front for ordinary turn draws.
- **No replay compatibility path needed** — nothing recorded is worth preserving. If any
  test fixtures contain recorded move logs, regenerate them and say so.

### Naming

**Do not repurpose `source: 'deadWall'`.** You established from §3.4.30 that MCR has no dead
wall; naming a back-end draw after a concept the rules don't contain will mislead every
future reader. Remove or rename that union member. If a `source` field survives on the draw
action, make it `'front' | 'back'`.

### Exhaustion — must be exactly equivalent to today

Remaining count becomes `backIndex - frontIndex + 1`. Total available draws is unchanged:
144 minus the deal (53 plus any flower replacements). Assert the new exhaustion condition
fires on the same draw number as the old `drawIndex >= tiles.length`.

**Your residual gap #3 in `decisions.md` is resolved and can be closed:** the pointers
meeting *is* the wall being empty. Every draw consumes exactly one tile from one end or the
other, so they cannot meet early. Meeting early is arithmetically impossible, not merely
unlikely.

### Fan safety — the one thing to verify carefully

Front-versus-back doesn't change fairness (uniform permutation) and doesn't change *when*
the wall exhausts, so `Last Tile Draw`, `Last Tile Claim` and `Out with Replacement Tile`
should trigger on exactly the same turns as before. It changes only which specific tile is
last.

**Assert that.** Fan correctness is the point of this application, and this is the one place
a wall change could touch it. Run the existing fan tests and confirm no behavioural change;
if any fan test shifts, stop and report rather than updating the expectation.

## Decision B — dealer-anchored break, no dice

Your proposed convention is correct and signed off:

- Break position **P anchored to the dealer's wall**, derived from `state.dealerSeat` —
  matches §3.5.7's "right-hand end of the dealer's own wall", already rotates hand-to-hand,
  already replay-safe.
- Front pointer advances forward from P; back pointer moves backward from P. The two start
  adjacent and consume the ring in both directions until they meet on the far side.
- **No dice.** The offset affects nothing and teaches nothing. Optional and free: derive a
  pseudo-offset from whatever seed `startHand` already uses, so the break varies per hand
  without adding state. Take it only if the seed is readily available.
- **Mark the break visually** — a small gap or marker on the ring — so the depletion origin
  is legible. Since the dealer rotates, the break moving each hand is a useful cue that the
  dealership changed.

Record the convention in `decisions.md` as a rendering convention, explicitly noting the
rulebook does not dictate one for a single shared ring rather than four per-seat walls.

## Carried forward from the main doc

- Read `state.wall` pointers directly. **Never assume 91 remaining after the deal** — flower
  replacements during dealing consume extra tiles (your finding #8).
- One element per stack (~72), three states: both, lower only, empty. Upper tile drawn
  first, then lower.
- Flat top-down; no perspective transforms.
- The reserved wall lane must not reflow as the wall depletes.
- **Discard tile size must not regress from 68.4 design px.** If `WALL_H` needs to grow past
  24px, report the cost in measured discard size before taking it. Your preliminary read
  that it won't need to grow is noted — measure and confirm.
- Stable tile IDs; animation-ready but not animated.
- Wall counter in the top bar must equal the rendered tile count at every point — assert it.

## Tests

1. Rendered wall tile count equals `backIndex - frontIndex + 1` after every draw, through a
   full hand to exhaustion, driven by the occupancy harness.
2. Exhaustion fires on the same draw number as before the change.
3. Existing fan tests unchanged — especially `Last Tile Draw`, `Last Tile Claim`, `Out with
   Replacement Tile`.
4. Every replacement draw (all three kong types, flower replacement, flower replacement
   during the deal) consumes from `backIndex`; ordinary draws from `frontIndex`.
5. Depletion renders outward from P in both directions; stacks empty upper-then-lower.
6. Wall lane geometry identical at 144 tiles and at 0; discard field dimensions unchanged.
7. Wall state reconstructible via Replay — replay a recorded hand and assert identical wall
   rendering at each step.
8. Full suite green, including Phase 2, 4 and 7 regression tests.
