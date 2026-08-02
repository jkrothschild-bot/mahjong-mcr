# Phase 5 — combined melds+backs region

Addresses the second half of the original complaint ("revealed hands unreadable"). Phase 4
shipped the discard overlay; the edge-strip topology remains deferred.

**No modelling pass.** Scope is small enough that sizing is solved inside the
implementation and reported with measurements. Do not open a separate modelling phase.

## Prerequisite — dev-only occupancy harness

Build this first; it unblocks the verification this phase needs and work already on the
roadmap.

A **dev-only state injection hook** — URL param or debug function — that populates game
state with synthetic occupancy and renders it: N discards per player, and a bot seat with
a specified meld configuration (e.g. 4 kongs + 1 concealed).

- Reuse the synthetic data already written for the Phase 4 overlay unit tests.
- Hang it on the existing dev-only-includes pattern in `CLAUDE.md`. Must not ship in
  production builds.
- This sidesteps the claim-prompt stall in the bot-driving script rather than solving it.

**First use: capture the worst-case discard overlay screenshot missing from Phase 4** —
83 total, and a skewed 30-in-one-band case. Unit tests assert counts and no-throw; they
cannot catch visual clipping, band collision, or labels colliding with tiles at 30 deep.
Every bug in this project so far has been invisible at low occupancy.

It will also serve the fan-detection stress-testing already on the roadmap, which needs
contrived hands for the same reason.

## The change

**One region per bot seat, replacing the separate melds region and backs region.** Melds
face-up at the front, concealed backs behind, in a single row — the physical-table
arrangement.

**Size it for 17 slots, not 13.** Kongs add +1 each (13+K); a Four Kongs hand sits at 17.
Worst case for packing is 4 groups of 4 plus 1 concealed — most inter-group gaps. Step 1c
measured this at roughly +23–29% over a 13-slot region depending on column count.

**Where the win comes from:** melds and backs are currently sized as two independent
regions when their sum is bounded. Merging frees real area, which pays for larger compact
tiles.

**Re-couple compact tile size to tileScale.** Undo the 44×54 unification
(`tileStyles.ts:146-154` and `:97-105`). This is the actual lever on legibility — Step 1d
established that the 44px nominal, not geometry, was capping every previous result. Solve
for the largest compact size the merged regions support at each tileScale, within the
**existing seat rectangles** (the edge-strip topology is deferred — regions do not move).

**Reuse `packGroupsMajor`** from Phase 4. Meld groups are variable size (3 for
pung/chow, 4 for kong); the primitive already takes group sizes. No new packing code.

## Explicitly NOT in this phase

- **The human 14-slot inline-melds row.** Its only benefit was freeing human-strip height
  to feed the middle band, and the middle band is deferred with the topology. Without that
  payoff it is a visible change to the hand row for no gain. Human melds stay where they
  are.
- Edge strips, wall border lanes, central discards. All deferred.
- Hand tile sizing and `fitRowTileWidth`'s floor. Unchanged.

## Constraints

- **Size for worst-case occupancy** — 4 kongs + 1 concealed, verified with the harness
  above, not a typical mid-game state.
- **Overflow is additive, never rescaling** (`CLAUDE.md` standing rule). Never reflow or
  shrink mid-hand as melds are claimed — a seat's region must be sized for 17 from the
  start, so claiming a kong never triggers a resize.
- Every group's fit-scale exactly 1.0 at worst-case occupancy; assert it.
- Compact tile size monotonically non-decreasing across normal → large → xlarge; assert it.
- `fitRowTileWidth` never exceeds nominal (the regression test from Phase 2 — `normal`'s
  nominal sits below the floor).
- Stable tile IDs. No auto-sorting. No changes to fan detection / win validation / hint
  logic / game state. Settings / Hint / Tile counts / toolbar and the Phase 4 overlay keep
  working. Landscape only.

## Verification

1. Harness-driven worst case (4 kongs + 1 concealed, every bot seat simultaneously) at
   1910 / 1440 / 1280, all three tileScales. Report measured compact tile size in design
   **and** rendered px, plus fit-scale per group.
2. Compare against 44px (today), and 82px rendered marginal readability. State honestly
   how far short it lands — a partial improvement is the expected outcome, not a failure.
3. The missing Phase 4 worst-case discard overlay screenshots.
4. Full suite green including all Phase 2 and Phase 4 regression tests.
5. Screenshot the board at worst case for a visual check — clipping and collisions are what
   the unit tests cannot see.

## Then

With Phase 4 and 5 in, the board can be judged fresh. The edge-strip topology's remaining
justification is the wasted-space complaint alone (it was worth only +15% on discards, and
the overlay has since made that moot). Decide it by looking, not by modelling.
