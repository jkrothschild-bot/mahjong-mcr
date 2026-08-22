# Phase 10 — route-aware Strategy Coach (stop committing early, explain why)

Read `CLAUDE.md`, `SPEC.md` §6, and `PLAN.md` before starting. This phase
upgrades the shared hint/bot evaluation core in `packages/engine` and the
coach UI that renders it. It is deliberately staged. **Stage 1 is complete,
reviewed, and accepted (2026-08-06) — see its own decision-tree resolution
below.** **Stage 3's engine layer (all 10 fan-target families plus the
`computeRouteToPoints` orchestration function) is complete as of
2026-08-07** — see its own "design" subsection for the full family list and
the state-of-play note just above "Explicitly NOT in this phase" for what
shipped and a real bug found while building it. Not yet done: the actual UI
panel that renders `computeRouteToPoints`'s output (still engine-only).
Stage 2 remains specified but not started.

## State of play / resume here (2026-08-06)

**Stage 1 (1a-1f) is complete, INCLUDING the decision tree's negative branch
— the ranking is reverted, the display is kept.** This also includes the
Hand Plan tab's route table (`computeHandPlan`'s `routes`/`primaryRoute`,
`HandPlanTab.tsx`) — a gap this doc's original 1a-1f list didn't call out
explicitly (it only named the Best Move tab) but which had the identical bug:
`HandPlanTab.tsx` was rendering a single crowned-min shape from
`calculateShanten`, the same collapse Stage 1a undid for discard ranking.
Fixed the same way: both routes shown when they're within
`VIABLE_ROUTE_SHANTEN_MARGIN` of each other, a primary route named only when
one is clearly ahead.

**The winrate question this doc originally left open is now resolved,
negative, and acted on (2026-08-06 — decisions.md #18).** Three 300-seed
self-play A/B runs exist (the doc's own §1e gate, run three separate times
under three different engine states): `oldWins=145 newWins=119`,
`oldWins=142 newWins=122`, `oldWins=132 newWins=117`. None individually
significant, but the regret-aware ranking has never once cleared this doc's
own stated bar (newWins >= oldWins) in any of the three tries. Per this doc's
own decision tree below (unchanged from when it was written, and followed
exactly): **that's the negative branch.**

**What was done about it:** `rankDiscards` (`packages/engine/src/bots/policy.ts`)
reverted to the pre-Stage-1 greedy comparator (`legacyDiscardCompare` alone).
`computeRouteRegret` and its two ranking-side constants
(`EARLY_GAME_MIN_SHANTEN`, `MAX_UKEIRE_SACRIFICE_FOR_FLEXIBILITY`) removed
from `policy.ts` entirely. Display-side Stage 1 work KEPT exactly as this
doc's decision tree specified: `evaluateDiscards`' per-candidate routes,
`BestMoveHint`'s structured output, confidence, alternatives, and both
rebuilt tabs all still work. This needed `computeRouteRegret` and
`VIABLE_ROUTE_SHANTEN_MARGIN` relocated (not deleted) from `policy.ts` into
`hints.ts` — this doc's own claim below that "`hints.ts`'s features/routeTable
computation doesn't depend on `rankDiscards`' comparator logic itself" was
right in spirit but understated in practice: `hints.ts` imported both symbols
from `policy.ts` directly for confidence/alternatives/route-viability, not
merely `evaluateDiscards`' routes — a real dependency the split had to
account for. `hints.test.ts`'s live-hand fixture (the 2C-triplet hand this
whole phase was built around) now correctly asserts the reverted (2C)
recommendation instead of the Stage-1 (isolated-tile) one — see
decisions.md #18 for the full before/after numbers. Full engine + UI suites
green, typecheck clean, both packages.

**Stage 2's premise has changed as a direct result.** This doc's own text
below already said as much would happen: "a confirmed-negative Stage 1 makes
Stage 2's depth-2 approach the thing actually being bet on to make
route-awareness pay for itself" — that is now the situation, not a
hypothetical. Stage 2's depth-2 evaluation (replacing the now-removed
Stage-1b constants with "flexibility falls out of the arithmetic instead of
a penalty constant") is the next real chance for route-awareness to help bot
play, not just hint display. **Stage 2 was NOT started this session** — the
instruction that produced this revert was explicit: do not start it.

**Stage 3 is now UN-GATED and ACTIVE (2026-08-06), chosen deliberately ahead
of Stage 2** — see Stage 3's own section below for the full reasoning and
design. Short version: Stage 2 is another bet on bot-ranking quality, and
that whole class of change has a 0-for-3 track record in this project so
far (the self-play runs above); Stage 3 adds a capability the coach never
had at all, and now has the precondition it always needed (a cross-validated
scoring engine — `validation/`'s harness now shows `our_bug` 0 across 1200
hands, per decisions.md #30-#34). Stage 2 remains fully specified and can
still be picked up later; choosing Stage 3 first doesn't retire it.

A properly-powered re-test (2000 seeds, a FRESH seed range — not another
`0..1999` sweep from the same generator, which would just repeat seeds
0-299 as a prefix — and a raised test timeout, since the current hardcoded
20 minutes only fits ~300 seeds) remains available if this specific
ranking question is ever reopened, e.g. if Stage 2 wants a clean
pre-depth-2 baseline to compare against. Not done this session; see
decisions.md #18 for exactly why (time-boxed to a "report honestly, change
no code" request, and raising the timeout would have meant editing the
test file being measured).

**The `validation/` PyMahjongGB harness's own remaining follow-up work**
(see CLAUDE.md and `KICKOFF-validation-harness.md`) is mostly addressed as
of 2026-08-06 (decisions.md #30-#34: 11 bugs found and fixed, `our_bug` 0) —
what's left there (citation backfill, 2 open rules questions, a classifier
peeling gap, one likely harness-generator artifact) is now lower-priority
than either Stage 2 or 3 of this phase, not blocking either.

## The problem, from a live hand

Opening hand: 2C triplet, 5B pair, eight isolated tiles. The coach
recommended discarding a 2C. Arithmetically defensible — the hand is
4-shanten as Seven Pairs vs 5-shanten standard, and a triplet's third copy is
dead weight under Seven Pairs (docs/rules/decisions.md #5) — but
strategically premature: discarding an isolated wind instead keeps Seven
Pairs at 4 AND standard at 5, at a cost of only 3 outs (24 vs 27). The
greedy evaluator committed the hand to one route at 4-shanten to buy a
marginal gain.

Root cause: `rankDiscards` (bots/policy.ts) is min-shanten-then-max-outs,
one draw deep, computed only on the BEST route — `calculateShanten` collapses
the three shapes to their min before ranking ever sees them. Nothing in the
evaluator represents "how far from tenpai am I" or "which routes am I
keeping alive."

The owner's original hint mockup (see docs/Mockups — the "Strategy coach"
side panel with structured reasons, a "Route to eight points" table,
alternatives with percentages, and a confidence chip) is the target UI. Its
architecture is right; the current evaluator simply can't feed it.

## Stage 1 — route-aware ranking + structured explanations (THIS SESSION)

### 1a. Route table per discard candidate

For each candidate, compute shanten and ukeire PER SHAPE, not just the min:

- `standardShanten` / `sevenPairsShanten` / `thirteenOrphansShanten` are
  already exported separately from shanten.ts — the collapse to min is the
  only thing being undone. Reuse the existing shared-cache pattern
  (tile-efficiency.ts's `cache` threading); per-route ukeire triples the
  probe count, so verify the cache keeps a full 14-candidate evaluation in
  low milliseconds before wiring the UI to it (measure, don't assume — same
  standard shanten.ts's own comments set).
- Extend `DiscardEvaluation` additively (new fields, nothing removed):
  `routes: { shape, shanten, ukeireCount }[]`.

### 1b. Flexibility-aware ranking rule

In `rankDiscards`, keyed to distance from tenpai:

- **shanten ≥ 3 ("early"):** a candidate that worsens any VIABLE route
  (viable = within 1 shanten of the best route) is penalized unless its
  best-route gain exceeds a real threshold. Concretely: prefer the candidate
  minimizing worst-case regret across viable routes; break remaining ties by
  today's rules (ukeire, then honor/terminal-first, then fixed type order —
  keep the determinism, it's what makes this snapshot-testable).
- **shanten ≤ 2 ("late"):** collapse to exactly today's greedy behaviour.
  Committing near tenpai is correct; do not "improve" it.
- The threshold and the ≥3 boundary are heuristic constants — name them,
  comment them as Stage-2-replaceable, and pick them by checking against the
  fixture hands below rather than by feel.

### 1c. Structured hint output

`computeBestMoveHint` currently returns a one-line `reason` string. Replace
with structured data (keep a derived one-liner for anywhere that still wants
text):

```ts
interface BestMoveHint {
  recommendedDiscard: TileInstanceId
  headline: string                    // e.g. "Lowest-value singleton"
  features: HintFeature[]             // the mockup's numbered "why" list
  routeTable: RouteAssessment[]       // per-shape shanten/outs, viability
  confidence: number                  // 0-1, margin between top two candidates' scores
  alternatives: RankedAlternative[]   // each with its own relative score, for the mockup's %
}
```

Every feature in the mockup maps to something 1a/1b already computes:

- "It has no support" → isolation: neighbours within ±2 in-suit plus
  remaining copies of itself (unseen-count-aware is a UI concern; raw counts
  are fine here, same posture as usefulTiles).
- "Your hand already leans towards pungs/pairs" → pair+triplet count vs
  chow-partial count from the existing decomposition machinery.
- "It preserves flexibility" → the route table itself: name the routes the
  recommended discard keeps alive that alternatives kill.
- Confidence → normalized score margin between the top two candidates. It
  must be an honest number derived from the ranking — never invented.

### 1d. Bots follow the same ranking

hints.ts reuses `rankDiscards` precisely so the hint can never disagree with
what a bot would do (SPEC §6: shared evaluation core). Keep that: this change
upgrades the bots too. That is a feature — it's also the validation harness.

### 1e. Stage 1 validation (gate for merging)

1. **Fixture hands, permanent per CLAUDE.md's fixture rule:**
   - The live hand above (1C 2C 2C 2C 6C 9C 4D 3B 5B 5B 8B WE WS WN):
     assert the recommendation is an isolated honor, NOT a 2C, and that the
     route table shows both routes alive.
   - A pair-heavy hand at 2-shanten where committing to Seven Pairs IS
     correct: assert the coach now recommends exactly what the old greedy
     ranking did (the late-game collapse in 1b working).
   - hints.test.ts's existing shapeNote hand: the Seven Pairs explanation
     must survive, now expressed through routeTable/features.
2. **Self-play winrate:** bots with the new ranking vs bots with the old,
   several hundred seeded headless games (the M4 simulation harness already
   plays full games headless). The new ranking should win or draw
   overall — report the number honestly; a regression blocks the merge.
3. **Determinism:** same seed → same recommendations. Existing bot snapshot
   tests must pass unchanged in late-game positions.
4. Full suite + typecheck green before every commit, as always.

### 1f. UI for Stage 1

Rebuild the Best move tab to render the structured hint: recommended tile
with headline, the numbered features list, the route table, alternatives
with their relative percentages, confidence chip. Follow the mockup's
information design, but its visual styling is aspirational — the current
app's panel styling wins where they conflict. Coach stays hidden until the
player taps Hint (CLAUDE.md hard rule — the mockup's always-visible side
panel does NOT override it). Check against SPEC §5a AND §5c separately
before calling it done.

## Stage 2 — depth-2 evaluation (DEPRIORITIZED, not started — see Stage 3 below)

Replace 1b's hand-tuned threshold with ukeire-2: for each candidate, weight
each improving draw by the quality of the position it leads to (its own
best-discard ukeire), so flexibility falls out of the arithmetic instead of
a penalty constant. Keys: the shared shanten cache must hold up under the
squared probe count — profile first; keep the Stage 1 constants as the
fallback if depth-2 can't hit interactive latency on an iPad. Confidence
then becomes the margin on the depth-2 score. Validation: same self-play
harness, new-vs-Stage-1.

**Deliberately NOT picked up next, as of 2026-08-06 — the owner chose Stage 3
instead, explicitly.** Reasoning recorded here since it's a real prioritization
call, not a default ordering: Stage 2 is another bet on improving BOT
RANKING specifically, and three self-play runs (decisions.md #18) have
already shown that entire class of change — tuning the discard comparator —
not paying off in this project so far (Stage 1's own regret-aware ranking
never once beat plain greedy across three tries). Stage 3 instead adds a
capability the coach genuinely doesn't have at all yet (not a refinement of
an existing one), was in the owner's original mockup from the start, and now
has a precondition it always needed but didn't have until this session: a
cross-validated scoring engine underneath it (decisions.md #30-#34 — 11
confirmed bugs found and fixed via the PyMahjongGB harness, `our_bug` now 0
across a 1200-hand sample). Stage 2 remains fully specified above and can be
picked up later; nothing about choosing Stage 3 first invalidates it.

## Stage 3 — "Route to eight points" fan planning (ACTIVE — un-gated 2026-08-06)

The mockup panel the engine genuinely can't feed yet: fan DISTANCE on
incomplete hands. All 81 detectors run only on complete hands;
`lockedInFansFromMelds` covers melds only. Build partial matchers for the
common target families first — Seven Pairs, All Pungs, Half/Full Flush, the
straight family, wind/dragon pungs, All Simples/No Honors — each returning
tiles-needed and rough completion probability; value ≈ P(complete) × points
with `MINIMUM_POINTS_TO_WIN` as a hard constraint. A dozen families covers
most real planning; exhaustiveness is explicitly not the bar. Every
estimator cites its fan's rulebook section like the real detectors do, and
each gets fixtures. This stage feeds both the "Route to eight points" panel
and, eventually, value-aware ranking (points × probability rather than pure
efficiency) — that last step changes bot behaviour again, so it re-runs the
self-play gate.

**Un-gated 2026-08-06 — Stage 1 reviewed and accepted by the owner, Stage 3
explicitly chosen ahead of Stage 2** (see Stage 2's own note above for the
reasoning). Do NOT touch `packages/engine`'s scoring, win-detection, or
exclusion table for this stage — Stage 3 only ADDS new partial-hand
estimators alongside them; if it surfaces a scoring discrepancy in the
existing 81 detectors, stop, fixture first, fix separately (unchanged from
this doc's original "Explicitly NOT in this phase" list), and re-run the
validation harness, not the self-play one.

### Stage 3 design (2026-08-06) — data shapes, families, and how probability
is estimated, agreed BEFORE writing any estimator ("see the shape before the
volume")

**Revised 2026-08-07 per owner review, before any estimator was written —
three changes from the first draft, recorded here in place (not as a diff)
so this section stays the single current source of truth:**

**Data shape** (`packages/engine/src/fan-targets.ts`, new file — mirrors
`hints.ts`'s `computeHandPlan` in spirit: pure, takes a `Hand` +
`WinCircumstanceContext`, returns a plain data structure, no UI):

```ts
export interface FanTargetEstimate {
  fanId: number
  points: number
  // 'locked': already structurally guaranteed (same bar as hints.ts's
  // lockedInFansFromMelds — not this file's own separate judgment call).
  // 'inProgress': not locked, but the hand has a real structural lean
  // toward it, worth surfacing as a target.
  // (Nothing lower than these two is ever returned — a family judged
  // unreachable simply isn't in the array. Exhaustiveness isn't the bar;
  // an empty array for a given family on a given hand is a normal,
  // expected result, not a gap to fill.)
  status: 'locked' | 'inProgress'
  tilesNeeded: TileTypeId[]        // distinct types that would help, deduped
  completionProbability: number    // 0-1, see "How probability is estimated" below
  // CHANGE 2 (owner review, 2026-08-07): the two probability mechanisms
  // below are NOT commensurable — a shanten-derived number and a rough
  // tile-counting heuristic must never render as if they were equally
  // precise percentages. This field is what lets a future UI branch on
  // that (different vocabulary, different visual weight, whatever the
  // panel design calls for) instead of quietly flattening the distinction
  // away. 'shanten' families reuse the project's own validated
  // shanten/ukeire machinery; 'heuristic' families are a teaching estimate
  // only, same posture as defense.ts (decisions.md #16, and this file's
  // own #35 for the specific formula) — NOT a rulebook-derived probability
  // and never claimed to be one.
  probabilityBasis: 'shanten' | 'heuristic'
  value: number                    // completionProbability * points, for ranking/selection
}

export function estimateFanTargets(hand: Hand, context: WinCircumstanceContext = {}): FanTargetEstimate[]
// Sorted by value descending. No fixed cap in the engine layer itself —
// "top N for display" is a UI-layer decision for the later panel-building
// step, not baked into the estimator.
```

Each family gets its OWN private matcher (`estimateSevenPairs`,
`estimateAllPungs`, etc.), all called from `estimateFanTargets` and merged.
This mirrors `scoring/fans-*.ts`'s own per-fan-function convention
deliberately — Stage 3 is not a generic pattern-matching framework, it's a
set of bespoke, individually-citable estimators, same posture as the real
detectors.

**Not solving in the engine layer**: which SUBSET of `FanTargetEstimate`s to
feature in the actual "Route to eight points" card, and how to phrase the
mockup's "done / developing / needed" narrative around a running total. That
composition (locked-in fans + best candidate(s) discussed together) is a
`hints.ts`-level orchestration concern for a later step in this same stage,
analogous to how Stage 1's own `computeBestMoveHint` sat one layer above
`evaluateDiscards`. Keeping `estimateFanTargets` a flat, per-family list (not
a pre-composed "plan") is what lets it be independently fixtured and cited
per family, same as the real detectors.

**CHANGE 3 (owner review, 2026-08-07) — the orchestration layer's contract
now includes an explicit "no route reaches the minimum" signal, specified
here even though the orchestration function itself is later work.** SPEC §6
names this exact trap ("whether the hand can reach the 8-point minimum — a
critical MCR-specific trap for learners") as the single most valuable thing
this panel can say, so silence (an empty candidates array with no further
comment) is not an acceptable outcome for it — the future
`computeRouteToPoints`-style function must return a THIRD, explicit state
alongside its candidate list: whether the best achievable combination
(locked-in fans + the best `FanTargetEstimate`s, greedily summed by value)
clears `MINIMUM_POINTS_TO_WIN`, and if not, a dedicated
`warning: true` (or equivalent tri-state, not a boolean default-false that
reads the same as "not checked yet") the UI is required to render, not
merely permitted to. Deferred to the same later orchestration step as the
rest of the panel-composition logic, but the CONTRACT is fixed now so the
eventual implementation isn't tempted to treat an empty list as
self-explanatory.

**The families — CHANGE 1 (owner review, 2026-08-07): Big Three Dragons
added; Pure Straight and Mixed Straight dropped to make room (a player can
see a straight forming unaided more easily than a lot of these other
targets — the panel earns its keep more on the harder-to-eyeball ones).**
10 total, not 11 — "a dozen" was always approximate and exhaustiveness was
never the bar; getting the right ones in v1 matters more than hitting a
specific count.

1. Seven Pairs (fan 19, 24pts) — `shanten` basis
2. All Pungs (fan 49, 6pts) — `shanten` basis
3. Half Flush (fan 50, 6pts) / 4. Full Flush (fan 22, 24pts) — `heuristic`
   basis; one shared suit-concentration metric, two point tiers depending
   on whether honors remain
5. Dragon Pung (fan 59, 2pts/unit) — `shanten`-ADJACENT basis (see below);
   6. Big Three Dragons (fan 2, 88pts) — same basis, nearly free given
   Dragon Pung's own machinery already exists (a player holding two dragon
   pungs — exactly the beginner this panel serves — is one pung-completion
   away, a trivial extension of the Dragon Pung estimator's own per-dragon
   tracking); 7. Prevalent Wind (fan 60, 2pts) / 8. Seat Wind (fan 61,
   2pts) — `heuristic` basis (a single named wind, not a multi-unit count
   like Dragon Pung/Big Three Dragons, so it's simpler to fold into the
   tile-membership-style formula than to special-case)
9. All Simples (fan 68, 2pts) / 10. No Honors (fan 76, 1pt) — `heuristic`
   basis; closely related (All Simples is strictly narrower — no honors
   AND no terminals), kept as two estimators since they're two different
   fans a hand can be working toward independently

Not exhaustive by design (per the doc's own text) — e.g. Pure/Mixed
Straight (dropped above, but a legitimate later addition), Big Four Winds,
knitted shapes, and the shifted-pung/chow families are all real but rarer
or easier-to-eyeball, not v1.

**How probability is estimated.** Two mechanisms, matching the new
`probabilityBasis` field exactly — see that field's own comment for why
they must never be presented as equivalent:

- **`shanten` families (Seven Pairs, All Pungs)** — completion means
  reaching a specific STRUCTURE. Reuse the project's own already-validated
  shanten machinery directly rather than inventing a parallel one:
  - Seven Pairs: `sevenPairsShantenFromCounts` already exists
    (`shanten.ts`) and is exactly this family's own distance metric —
    `tilesNeeded` = the types with count 1 (need a second copy);
    `completionProbability` derived from shanten the same way
    `hints.ts`'s existing wait-viability margin already treats "how many
    steps away" as a probability proxy (fewer steps = higher probability,
    monotonic, not a literal draw-simulation).
  - All Pungs: a NEW, analogous "steps from all-pung" count — how many of
    the current decomposition's non-pung/kong groups (chows, or an
    unpaired partial) would need converting; `tilesNeeded` = the specific
    tiles that would complete a pung for each such group (reuses
    `tile-efficiency.ts`'s existing per-candidate ukeire machinery rather
    than a new tile-counting pass).
  - Dragon Pung / Big Three Dragons: structurally counted (how many of the
    3 dragon types are already a pung, a pair, or absent), not a shanten-
    formula reuse in the literal sense, but still a discrete, exact
    "N of 3 already complete" count rather than a rough formula — closer
    in spirit to `shanten`'s precision than to the tile-membership
    heuristic below, so tagged `shanten` basis too (see the estimator's
    own comment for the exact justification once written).
- **`heuristic` families (Half/Full Flush, All Simples/No Honors,
  Prevalent/Seat Wind)** — completion means "every remaining/kept tile
  satisfies some predicate" (single suit; no terminal/honor; a specific
  wind reaches pung count). `tilesNeeded` = the OFFENDING tiles that would
  need to go (for suit/simples families) or the exact tile(s) that would
  complete the pung (for wind). `completionProbability` from a simple,
  explicitly-labeled-as-rough formula: something monotonic in "how many
  offending tiles remain, relative to the concealed hand's own size"
  (exact formula to be pinned down per-family against fixture hands when
  writing each estimator, same "pick constants against fixtures, not by
  feel" discipline as Stage 1's `EARLY_GAME_MIN_SHANTEN`/
  `VIABLE_ROUTE_SHANTEN_MARGIN` were) — recorded in decisions.md as
  explicitly non-rulebook-sourced (item #35), same treatment as
  `defense.ts` (#16).

**`MINIMUM_POINTS_TO_WIN` as a hard constraint**: not enforced inside
`estimateFanTargets` itself (a single family's own points are usually well
under 8 alone) — enforced at the future orchestration layer per CHANGE 3
above.

**Citations and fixtures**: every estimator's own comment cites its fan's
`mcr_EN.pdf` section, matching the real detectors' own convention exactly
(no exception for being "just an estimator") — verified fresh via
`rules-lawyer` where the estimator's own structural reading isn't already
settled by an existing, already-cited detector for the SAME fan (most of
these already have a real detector in `scoring/fans-*.ts` with its own
citation — the estimator's job is "how close," not "is it true," so it can
often cite the SAME already-verified passage rather than needing a fresh
rules-lawyer pass per family). Each family gets its own fixtures in a new
`fan-targets.test.ts`, same discipline as every `fans-N.test.ts` file.

**First 3 families to implement, per explicit instruction, before the
remaining 7**: Seven Pairs (`shanten` basis), Half/Full Flush (`heuristic`
basis), and Dragon Pung/Big Three Dragons together (the `shanten`-adjacent
basis) — one of each mechanism, working end to end, before the rest.

**All 10 families plus the orchestration layer are now done (2026-08-07,
Phase 2 of OPEN-WORK.md's cleanup sequence, on `feat/phase10-stage3`).**
The remaining 5: All Pungs (fan 49, `shanten` basis — a genuinely new
"pungs-only" restricted shanten metric, since no such shape exists in
`shanten.ts`; unlike the general standard shape, pung/pair blocks never
interact across TYPES the way chow blocks interact across adjacent RANKS,
so greedy-by-value block selection is provably optimal here, no exhaustive
search needed — see the estimator's own comment in `fan-targets.ts` for the
full reasoning and a worked example); Prevalent Wind / Seat Wind (fans 60/
61, `heuristic` basis per the design's own classification, `count/3` of the
target wind tile); All Simples / No Honors (fans 68/76, `heuristic` basis,
same shared-scan style as Half/Full Flush).

`computeRouteToPoints` (`hints.ts`) is the CHANGE-3 orchestration layer:
composes `computeHandPlan`'s already-locked-in fans with a greedy,
value-ordered selection from `estimateFanTargets`'s candidates, filtered for
pairwise compatibility, into a `bestCaseTotal` and an explicit
`reachesMinimum`/`warning` tri-state — never inferred from an empty list,
per CHANGE 3's own contract.

**Real bug found and fixed while building this, not from planning:**
`scoring/exclusions.ts`'s table only needs an entry when two fans could
naively co-fire on the same COMPLETE hand — it has no entry for e.g. Half
Flush (50) vs. All Simples (68), because a complete hand can never satisfy
both anyway (Half Flush structurally requires a honor tile; All Simples
forbids one), so the real detectors just never co-fire and no rule was ever
needed. But two of fan-targets.ts's ESTIMATORS, running on an INCOMPLETE
hand, genuinely can both fire at once — "keep working toward Half Flush"
and "keep working toward All Simples" are contradictory directions for the
same current tiles, not a naive co-firing. An early version of
`computeRouteToPoints` summed both fans' raw points into a false "reaches
8" on a hand that could never actually score both. Fixed with a small,
explicit `directionallyIncompatible` check in `hints.ts` (which fans
require vs. forbid a honor tile — a direct, already-cited consequence of
each fan's own definition, not an independent rulebook claim) alongside the
real `exclusions.ts` table. Fixtured directly (`hints.test.ts`'s
"filters directionally-incompatible candidates" test) before the fix, per
CLAUDE.md's fixture-first convention. A second, related gap — a
zero-`completionProbability` candidate (Seven Pairs at its own formula's
worst-case shanten) still contributing its FULL raw points to the greedy
sum — was caught by the same fixture and fixed by excluding
`completionProbability <= 0` candidates from `selected` (still visible in
`candidates`, just never counted toward the ceiling).

No changes to `scoring/`, `win-detection.ts`, or `exclusions.ts` — both
bugs were in this session's own new orchestration code, not any existing
detector, so no PyMahjongGB harness re-run was needed (CLAUDE.md's
re-run trigger is a scoring-logic change; nothing under `scoring/` changed).

**Second review pass, 2026-08-08 — the honor-axis fix above was incomplete,
replaced with an exhaustive table.** The `directionallyIncompatible` check
described above only covered the HONOR axis (which fans require vs. forbid
a honor tile). Review found a SECOND, un-covered axis: Seven Pairs (19) is
a shape with no pung/kong at all (`win-detection.ts` `isSevenPairs`'s own
`every count === 2`), incompatible with the 5 fans requiring one (All
Pungs included) — not caught by the honor sets, since neither fan is honor-
related. A concealed hand sitting on several pairs made both
`estimateSevenPairs` and `estimateAllPungs` fire, and `computeRouteToPoints`
summed both into a false "reaches 8." Fixtured first (`hints.test.ts`'s
"filters shape-incompatible candidates" test), confirmed failing, before
any fix.

Rather than patch a third hardcoded set, `packages/engine/src/
fan-target-compatibility.ts` (+ its own `.test.ts`) now enumerates and
classifies **all 45 unordered pairs** among the 10 families exhaustively —
25 compatible, 20 incompatible — replacing both `REQUIRES_HONOR_TILE`/
`FORBIDS_HONOR_TILE` and `directionallyIncompatible` entirely. A pair is
ROUTE-COMPATIBLE iff some complete, legal MCR hand scores both — strictly
weaker than "not in `exclusions.ts`", since that table only ever needs a
pair when two fans could naively co-fire on a COMPLETE hand; a pair that's
simply impossible together needs no entry there. Every INCOMPATIBLE verdict
is grounded in the real detectors' own already-cited guard conditions or
`win-detection.ts`'s structural definitions; every COMPATIBLE verdict has a
constructed hand in the test file where **both real detectors** (not the
estimators) actually fire together — a completeness test fails if any of
the 45 pairs lacks an explicit entry, so "compatible by omission" can't
recur a third time. `computeRouteToPoints` now checks this table alongside
`areExclusive`, not instead of it (three of the 25 compatible pairs — Full
Flush/No Honors, Dragon Pung/Big Three Dragons, All Simples/No Honors — are
ALSO real `exclusions.ts` entries; the two questions are independent:
whether conditions can coexist at all vs. whether real scoring counts both
once they do).

**A third bug, caught mid-wiring before it shipped, not by planning either:**
the new table only classifies pairs among the 10 Stage 3 families and
(correctly, for pairs among the 10) defaults an unknown pair to
incompatible. Applied naively, this also defaulted any locked-in fan from
OUTSIDE the 10 (e.g. Concealed Kong, fan 67) to "incompatible with
everything" — wrongly blocking every Stage 3 candidate whenever such a fan
was locked in. Fixtured (`hints.test.ts`'s "a locked-in fan outside the 10
Stage 3 families" test — first written broken against an accidentally-
tenpai hand that masked the bug behind a legitimately-locked Half Flush,
corrected once the shanten was checked directly), confirmed failing, fixed
by gating the compatibility check on `STAGE3_FAN_IDS.includes(id)`.

**Found and reported, deliberately NOT fixed this pass — recorded here per
CLAUDE.md's capture rule, not left in the chat transcript only:**
`computeRouteToPoints`'s `chosenFanIds.includes(candidate.fanId)` guard
(prevents re-selecting a fan already counted) also silently drops a
legitimate FURTHER unit of a countable fan once ANY amount of it is already
locked in. Dragon Pung (fan 59) is the only such fan among the 10:
confirmed via direct repro that one melded dragon pung + a second dragon at
2 concealed copies produces a real, non-null `fanId: 59` candidate worth +2
points that never reaches `selected`, undercounting `bestCaseTotal` by
that amount. This is a distinct bug (undercount, not overcount) from
everything above, out of scope for a route-COMPATIBILITY fix — it's a
per-unit accounting question. Proposed handling, not yet decided: track
remaining capacity per countable fan separately from the compatibility
check, so a partial lock-in doesn't block a legitimate next increment.
Whoever picks this up next should decide the approach before touching
`computeRouteToPoints` again.

**Tri-state `warning`/`reachesMinimum` bug found and fixed, 2026-08-16, on
`feat/phase10-stage3` (not yet merged to `main`).** `computeRouteToPoints`
called `computeHandPlan(hand, context)` but destructured only
`.lockedInFans` from the result, discarding `.bestCaseReachesMinimum` — at
tenpai, the EXACT answer, derived from `computeWaits` over the real
`scoreHand`, covering every one of the 81 fans (including fan 43 Chicken
Hand, `scoring/score-hand.ts`'s zero-fan 8-point floor). `warning`/
`reachesMinimum` were instead derived purely from `bestCaseTotal` — the
10-family greedy approximation — so `warning: true` asserted "this hand
cannot reach 8 points" when it actually meant only "none of the 10 Stage 3
families reaches 8." Confirmed via a constructed repro before any fix
(`hints.test.ts`'s "is reachable via the tenpai-exact fallback..." test): two
exposed chow melds (Dots 4-5-6, Bamboo 1-2-3) block Seven Pairs/All
Pungs/Half-Full Flush structurally, so the 10 families and locked-in fans
together total only 3 points — yet the hand is genuinely tenpai on a
ryanmen where one branch scores 11/12 points via Mixed Triple Chow (fan 41,
8pts, outside all 10 families and not caught by `lockedInFans` either,
since it's not common to both branches of the wait). Old code would have
told a learner this hand can never reach 8; it can.

Fixed by replacing the `warning: boolean` / `reachesMinimum: boolean` pair
with a single `minimumPointsStatus: 'reachable' | 'currentWaitsFallShort' |
'unknown'` tri-state on `RouteToPointsResult` (`packages/engine/src/hints.ts`).
Two fixtures added to `hints.test.ts`'s `computeRouteToPoints` suite for
this first pass: the differential-wait repro above, and a
tenpai-with-a-grounded-no hand (two exposed number pungs in different
suits + a tanki wait, both win methods scoring under 8, confirmed via
`computeHandPlan` directly before asserting on `computeRouteToPoints`). The
pre-existing pre-tenpai "scattered hand" fixture was corrected from
asserting `warning: true` to asserting `'unknown'` — under the old boolean
contract this fixture was itself already misusing the pre-fix API's only
available "no" state for a hand with no grounds to say so; it's pre-tenpai,
so `computeHandPlan.bestCaseReachesMinimum` is `null`, not `false`.

**Review pass, same day (2026-08-16), found this first fix's own precedence
was backwards — corrected before merge, still on `feat/phase10-stage3`.**
The first version's branch read `bestCaseTotal >= MINIMUM_POINTS_TO_WIN ||
handPlan.bestCaseReachesMinimum === true`, checking the ESTIMATE first —
`||` short-circuits, so an inflated `bestCaseTotal` (see the separate
estimator-generosity defect two paragraphs below) could report `'reachable'`
even when `bestCaseReachesMinimum` was a grounded, tenpai-exact `false`.
The review caught this by re-examining the fix's own scratch exploration
transcript: two constructed hands (a three-suit tenpai shape with no melds,
and a two-melds-plus-tanki-wait shape) had ALREADY reproduced exactly this
— `bestCaseReachesMinimum: false` alongside `bestCaseTotal` of 53 and 10
respectively — but the first pass read those results as merely
demonstrating the (separately real) estimator-inflation defect, not as a
live failure of its OWN new branch. Corrected to the actual principle —
exact beats estimate, estimate only speaks when exact is silent:
`handPlan.bestCaseReachesMinimum !== null ? (bestCaseReachesMinimum ?
'reachable' : 'currentWaitsFallShort') : (bestCaseTotal >=
MINIMUM_POINTS_TO_WIN ? 'reachable' : 'unknown')` — the tenpai-exact answer,
when it exists, is checked FIRST and is final either direction; the family
estimate is consulted only pre-tenpai, and only to raise `'unknown'` to
`'reachable'`, never to downgrade a tenpai-exact `true`.

Same review also renamed the negative state from `'unreachable'` to
`'currentWaitsFallShort'`: `bestCaseReachesMinimum` is derived from the
hand's CURRENT waits only, and a tenpai hand can always be broken and
rebuilt toward a different, larger hand — `'unreachable'` claimed a
permanence the field can't support, and the UI copy this drives will be
written directly off the name. A third fixture was added specifically to
pin the precedence fix: the three-suit no-melds hand from the review's own
re-examination above (`bestCaseReachesMinimum: false`, `bestCaseTotal: 53`)
now asserts `'currentWaitsFallShort'`, not `'reachable'` — this is the
regression guard for the exact bug the review found. Five fixtures total in
`hints.test.ts`'s `computeRouteToPoints` suite now cover all three states,
including both the original grounded-no fixture and this precedence
regression guard.

No changes to `scoring/`, `win-detection.ts`, or `exclusions.ts` in either
pass — purely an orchestration-layer fix in `hints.ts`, so no PyMahjongGB
re-run needed (same posture as the two bugs recorded above). Full engine
suite green (562 tests, 1 pre-existing skip) after the review-pass fix,
typecheck clean.

~~**A separate, pre-existing defect surfaced while hunting for these
fixtures, NOT fixed here (out of scope — touching `fan-targets.ts`'s
estimators was excluded from this pass): the family estimators' own
"ceiling, not forecast" design (`RouteToPointsResult.bestCaseTotal` sums
FULL raw points for any candidate with `completionProbability > 0`,
however small, per that field's own doc comment) makes `bestCaseTotal`
reach 8+ almost trivially for most non-degenerate hands...**~~ **Fixed
2026-08-16, own session, on a fresh branch off `main` (`feat/phase10-
route-credibility`) — see the dated section below for the measured
before/after and `docs/rules/decisions.md` item #37 for the full ruling.**

**`crediblePointsTotal` fix (2026-08-16) — the `bestCaseTotal`-inflation
defect above, measured and fixed via a calibration harness, not fixed by
guesswork.** Confirmed via `validation/src/selfplay/`'s new self-play
calibration harness (own commit, 2,000 hands, before any production code
changed): `bestCaseTotal >= MINIMUM_POINTS_TO_WIN` on 93.3% of PRE-TENPAI
decision points, making `minimumPointsStatus` 'reachable' almost
unconditionally before tenpai — three families (Seven Pairs 19, Half/Full
Flush 22/50, All Simples/No Honors 68/76) alone carried ~93% of that
inflation, exactly as the earlier investigation pass's smaller-sample
estimate had suggested. `'unknown'` occurred on only 6.7% of pre-tenpai
samples, and 95.2% of THOSE were melded hands (not, as might be guessed,
merely early-game ones) — a declared meld structurally kills all three
loose families at once.

Fixed per the owner's (c)+(d) decision from the investigation pass:
`bestCaseTotal` itself is UNTOUCHED (still the un-gated ceiling its own doc
comment describes); a NEW `crediblePointsTotal` field drives
`minimumPointsStatus`'s pre-tenpai fallback instead, computed via a
per-family gate on each family's own NATIVE distance metric (shanten steps
for Seven Pairs via `sevenPairsShantenFromCounts`; offending-tile count for
the rest via `tilesNeeded.length`) — never a shared probability number
across `probabilityBasis` values, which would repeat the exact mixed-basis
mistake `fan-targets.ts` (decisions.md item #35) already forbids elsewhere.
Thresholds (`SEVEN_PAIRS_CREDIBLE_SHANTEN_MAX` / `FLUSH_CREDIBLE_TILES_
NEEDED_MAX` / `SIMPLES_HONORS_CREDIBLE_TILES_NEEDED_MAX`, all `= 1`) were
picked by sweeping `{1,1,1}`/`{2,2,2}`/`{3,3,3}` against the SAME dataset
and measuring which moved precision — P(hand eventually finishes |
`'reachable'`) vs. P(... | not) — not by which looked most sensible.
`{1,1,1}` won on both the reachable-rate correction (93.3% → 46.6%, the
largest of the three) and precision at shanten 1-3 (e.g. shanten 1: 22.4%
vs. 17.0%, the widest gap of the three tried).

**Read honestly, not as a clean win:** ground truth is "did seat 0
eventually win" (seat 0 played by the same efficiency-only bot policy as
every other seat, not a coached human), and P(seat 0 eventually wins) sits
nearly flat (~18-20%) across shanten 1-5 regardless of prediction — most of
the outcome variance is 4-player race/wall-exhaustion noise, not hand
quality at the sampled decision point, capping how much precision lift ANY
estimate-based signal can show against this ground truth. The clean
evidence is the reachable-rate correction; the precision numbers corroborate
without being the headline claim. Full account, the sweep table, and both
follow-ups below: `docs/rules/decisions.md` item #37.

**Two findings recorded, deliberately NOT fixed this pass:**
1. Of pre-tenpai samples still `crediblePointsTotal`-'reachable' after the
   `{1,1,1}` gate, 95.2% would flip to non-reachable if the other 7
   families (All Pungs 49, Dragon Pung 59, Big Three Dragons 2,
   Prevalent/Seat Wind 60/61) were excluded entirely too — they were
   comparatively invisible against the original inflation but dominate what
   is left once the worst three are fixed. A follow-up gating pass on those
   seven is very likely warranted, scoped out of this pass on explicit
   instruction ("gate only three families... do not build ten gates on
   spec") — not built, not measured beyond this one sensitivity check.
2. A SEPARATE, higher-priority gap, found investigating why 39% of
   shanten=-1 samples (a hand already structurally complete but under the
   8-point minimum — confirmed via real captured hands, e.g. 4 exposed
   melds + a genuine concealed pair) returned `'unknown'`: `computeWaits`
   (`waits.ts`) only computes anything at exactly `shanten === 0`, so an
   ALREADY-complete-but-under-minimum hand falls through to `null` even
   though its current score is trivially, exactly computable — no
   draw-simulation needed, the hand is sitting there fully formed. This is
   precisely the "1-7 point dead zone" trap SPEC §6 names as the panel's
   single most valuable thing to say, caught live: a real bot was forced to
   break an already-formed hand because it didn't meet the minimum, and the
   coach's own behavior at that exact moment was still nearly as
   uninformative as before this whole pass. Needs its own design decision
   (what win-method context to assume for a hand never actually completed
   by a real draw/claim event) — touches `waits.ts`, out of THIS pass's
   scope, not fixed here.

No changes to `scoring/`, `win-detection.ts`, or `exclusions.ts`. Full
engine suite green (567 tests, 1 pre-existing skip), typecheck clean across
all three workspaces (`engine`, `ui`, `validation`).

**Still-open coverage gap, unchanged by this fix, restated here since the
fix's own repro fixture leans directly on it:** Stage 3 covers 10 of the
81 fans. CHANGE 1 (2026-08-07) deliberately dropped Pure Straight (fan 21)
and Mixed Straight (fan 39) to make room for Big Three Dragons, reasoning
that a player can see a straight forming unaided more easily than the
harder-to-eyeball fans kept instead. Knitted shapes (Knitted Straight,
Lesser/Greater Honors and Knitted Tiles) were never added at all — named
as "real but rarer" in the original design notes and never revisited.
Nothing about this pass's fix changes that scope decision; it only makes
the panel honest about a hand reaching 8 through one of the fans Stage 3
doesn't model (exactly what this fix's own repro fixture demonstrates via
Mixed Triple Chow, a fan outside the 10 families for a different reason —
never in the candidate list at all, dropped or otherwise). Whoever revisits
Stage 3's family coverage next should decide whether Pure/Mixed Straight
belong back in, and whether knitted shapes are worth a v2 family, rather
than this being silently forgotten.

## Explicitly NOT in this phase (any stage)

- Defense/safety integration into the discard ranking (Tile safety tab
  already exists separately; merging them is its own phase).
- Runtime LLM calls for hint generation — permanently out, per the owner's
  recorded decision (deterministic rule-based logic only).
- Claim/meld advice (pon/chi/kong decisions). Discard ranking only.
- Changing MINIMUM_POINTS_TO_WIN handling, scoring, or win validation.
  If any stage surfaces a scoring discrepancy: stop, fixture first, then fix
  (CLAUDE.md).

## Constraints

- packages/engine stays pure TS, seeded, serializable — no React imports, no
  Date.now/Math.random in evaluation paths.
- Hint and bot share one evaluation core. Never fork them.
- All API changes additive where possible; where `BestMoveHint` must break
  (1c), update every consumer in the same commit — no half-migrated states.
- Performance: a full discard evaluation must stay imperceptible in the UI
  (the existing cache-sharing comment cites ~1s uncached vs low-ms cached —
  that standard holds for the route table too).
- Record any rulebook-ambiguity ruling in docs/rules/decisions.md.
