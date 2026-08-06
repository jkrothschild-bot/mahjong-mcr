# Phase 10 — route-aware Strategy Coach (stop committing early, explain why)

Read `CLAUDE.md`, `SPEC.md` §6, and `PLAN.md` before starting. This phase
upgrades the shared hint/bot evaluation core in `packages/engine` and the
coach UI that renders it. It is deliberately staged: **Stage 1 is this
session's deliverable.** Stages 2 and 3 are specified so the Stage 1 data
shapes don't have to be reworked to accommodate them, but do NOT start them
until Stage 1 is merged, validated, and reviewed by the owner.

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

**Stage 3 is unchanged** — still gated, still not started, still the same
scope (fan-distance partial matchers for the "Route to eight points" panel).

A properly-powered re-test (2000 seeds, a FRESH seed range — not another
`0..1999` sweep from the same generator, which would just repeat seeds
0-299 as a prefix — and a raised test timeout, since the current hardcoded
20 minutes only fits ~300 seeds) remains available if this specific
ranking question is ever reopened, e.g. if Stage 2 wants a clean
pre-depth-2 baseline to compare against. Not done this session; see
decisions.md #18 for exactly why (time-boxed to a "report honestly, change
no code" request, and raising the timeout would have meant editing the
test file being measured).

**Next session should still consider the `validation/` PyMahjongGB
harness's own remaining follow-up work** (see CLAUDE.md and
`KICKOFF-validation-harness.md`) before Stage 2 — unrelated to this phase's
ranking question, but was the older, bigger gap and has its own open items.

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

## Stage 2 — depth-2 evaluation (LATER SESSION, do not start)

Replace 1b's hand-tuned threshold with ukeire-2: for each candidate, weight
each improving draw by the quality of the position it leads to (its own
best-discard ukeire), so flexibility falls out of the arithmetic instead of
a penalty constant. Keys: the shared shanten cache must hold up under the
squared probe count — profile first; keep the Stage 1 constants as the
fallback if depth-2 can't hit interactive latency on an iPad. Confidence
then becomes the margin on the depth-2 score. Validation: same self-play
harness, new-vs-Stage-1.

## Stage 3 — "Route to eight points" fan planning (LATER SESSION, do not start)

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
