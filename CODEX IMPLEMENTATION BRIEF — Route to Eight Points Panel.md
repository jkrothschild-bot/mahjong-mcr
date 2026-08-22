# CODEX IMPLEMENTATION BRIEF
## MCR Mahjong Mentor — "Route to Eight Points" Panel

> **Amended after owner review, 2026-08-22.** Five corrections are marked inline with
> "(review, 2026-08-22)" or "CORRECTED IN REVIEW": §1.3 (this panel probably does render
> tiles), §6.3 (`lockedInPoints` is anonymous — how to get the fan names), §7.1 (the
> `'reachable'` copy was overclaiming), §9 (fixture reference identity, and fixture 4 was a
> payload the engine cannot produce), §15 (a new legitimate lane-A escalation). Where an
> amendment contradicts the original text, the amendment wins.
>
> **§3 is RESOLVED (2026-08-22): a fourth tab.** See §3.1 — it is no longer a stop condition,
> and it carries two required obligations (§3.1a, §3.1b).

### Repository

`jkrothschild-bot/mahjong-mcr`

### Working branch

Create/use:

`feat/route-to-points-panel`

Base this branch on `main`.

`main` already contains all Phase 10 Stage 3 engine work (`feat/phase10-stage3` and
`feat/phase10-route-credibility` are both fully merged — 0 commits ahead of `main` as of this
brief). You are not racing an in-flight engine branch, but you are still bound by the lane
boundary below.

---

# 1. Authoritative requirements — read before writing any code

In this order:

1. `CLAUDE.md` — in particular the Strategy Coach rule (hidden until Hint is tapped, never
   shown for bots) and the tile/UI hard rules.
2. `SPEC.md` §6 (Hint system / Strategy Coach), §5a (information clarity checklist), §5c
   (visual fidelity bar).
3. `CLAUDE.md`'s Movements section (stable tile IDs) AND `CLAUDE.md`'s tile-artwork
   non-negotiable. **Correction (review, 2026-08-22): this panel probably DOES render tiles.**
   `FanTargetEstimate.tilesNeeded` is a `TileTypeId[]`, and §8 suggests copy like "needs N more
   of [suit]". If you render tile faces rather than plain text names, CLAUDE.md's rule that suit
   numerals and wind/dragon letters are baked into the tile artwork — never a separate corner
   badge or HTML overlay, never toggleable off — applies in full. **Decide your tile
   representation (faces vs. text names) and state it before building the candidate rows.**
4. `KICKOFF-phase10-strategy-coach.md` — specifically the "Stage 3 design" subsection and its
   "Not solving in the engine layer" note. That note is what authorizes this brief: the engine
   layer explicitly left "which subset of `FanTargetEstimate`s to feature ... and how to phrase
   the mockup's 'done / developing / needed' narrative" as a UI-layer decision, not yet made.
5. `docs/Mockups/mahjong-seated-table-prototype-v6.html` — search for `Route to eight points`.
   This is the ORIGINAL visual reference (a `route-card` of `route-line` rows, a done/
   in-progress/needed vocabulary, a confidence chip elsewhere in the same panel). Treat it as a
   refinable starting point, same posture `SPEC.md` §5b already applies to the rest of v6 — not
   a frozen spec, and in particular its confidence-chip pattern (a single "86% confidence"
   percentage) is NOT compatible with this panel's real contract (see §6 below) and must not be
   copied as-is.
6. `packages/ui/src/hints/HintPanel.tsx` and `packages/ui/src/hints/HandPlanTab.tsx` — current
   tab shell and the existing, narrower "can this hand reach 8 points" surface you'll be
   extending or replacing (see §4).
7. `packages/engine/src/hints.ts` lines ~460-787 (`RouteToPointsResult`, `MinimumPointsStatus`,
   `computeRouteToPoints`) and `packages/engine/src/fan-targets.ts` (`FanTargetEstimate`,
   `estimateFanTargets`) — the doc comments on these are the actual source of truth for §6 below;
   §6 restates them so you don't need engine access to build, but if anything here reads
   ambiguous, the doc comments in those two files win.
8. `docs/rules/decisions.md` item #37 — why `crediblePointsTotal` exists as a second, stricter
   number instead of a repurposed `bestCaseTotal`. Context for §6/§7 below, not something you
   need to act on directly.

---

# 2. Primary objective

Build the UI that renders `computeRouteToPoints`'s output as the "Route to eight points" panel
inside the Strategy Coach — the panel `KICKOFF-phase10-strategy-coach.md` describes as "the
mockup panel the engine genuinely can't feed yet," now that it can.

This is UI composition only: given a `RouteToPointsResult`, decide what subset to show, in what
order, with what wording and visual treatment, and where in the existing tab shell it lives.

---

# 3. Container — DECIDED by the owner, 2026-08-22: a FOURTH TAB

**Does this become a fourth tab in `HintPanel.tsx`, or a section inside the existing Hand Plan
tab?**

`CLAUDE.md` states the three existing tabs (Best move / Hand plan / Tile safety) map onto the
original nudge/options/tutor depth levels — SPEC §6 is explicit about this mapping. A fourth tab
has no obvious depth level to map onto, so adding one may break that framing rather than extend
it.

**Recommendation: section inside the Hand Plan tab, not a fourth tab.**

Reasoning:

- SPEC §6 already assigns this exact content to Hand Plan: "**Hand plan tab ≈ Tutor:** current
  hand shape, primary route, shanten-equivalent structure, and what would change the plan — full
  analysis, **including whether the hand can reach the 8-point minimum** (a critical
  MCR-specific trap for learners)." The spec text doesn't leave this as an open slot — it names
  Hand Plan as where this lives.
- `HandPlanTab.tsx` already renders a narrower version of the same signal today (the
  `plan.worstCaseReachesMinimum === false` amber alert at the bottom of the file, driven by
  `computeHandPlan` directly rather than `computeRouteToPoints`). A fourth tab would leave two
  places a player might look for "can I reach 8 points," potentially disagreeing with each
  other. A section extends the one place that already exists.
- The nudge/options/tutor mapping has no natural fourth rung. Route-to-points is an elaboration
  of "primary route" (already Hand Plan content), not a new kind of question.

**Trade-off:** Hand Plan already renders current shape + route table + locked-in fans, and this
panel adds a candidates list, a selected/credible split, and a status banner on top of that — the
tab may get visually crowded or need internal scroll/collapse, which a dedicated tab would avoid
by giving the content its own full-height space.

---

## 3.1 The decision (2026-08-22)

**The owner considered the recommendation above and chose the FOURTH TAB.** Build it as a new
tab in `HintPanel.tsx`, alongside Best move / Hand plan / Tile safety. The reasoning below still
records why a section was recommended; it is kept so the trade-off stays visible, not because
the decision is open. **It is not open. Do not stop on §3 — build the fourth tab.**

The rationale for the override is space: this panel adds a status banner, a locked-in list, a
candidates list and a credible/ceiling split on top of what Hand Plan already renders, and a
crowded tab that needs internal scrolling fails `SPEC.md` §5a's clarity bar more surely than an
extra tab breaks a naming convention.

**Two obligations follow from choosing a fourth tab. Both are required, not optional.**

**3.1a — Remove the superseded alert anyway.** The existing `plan.worstCaseReachesMinimum` amber
alert in `HandPlanTab.tsx` (~lines 90-96) is strictly less informative than `minimumPointsStatus`
(two states vs. three, and not grounded in the pre-tenpai `crediblePointsTotal` fallback). With a
separate tab there would otherwise be TWO surfaces answering "can I reach 8 points," computed by
two different code paths, free to disagree with each other in front of a learner. Delete the old
alert from `HandPlanTab.tsx` as part of this work and let the new tab be the single source of
truth for that question. Add a test asserting it is gone (§11).

**3.1b — The tab naming/mapping docs go stale the moment you add a fourth tab, and this repo has
a standing problem with exactly that** (`OPEN-WORK.md` §C is an entire section of "the docs say
one thing, the code says another"). `CLAUDE.md`'s Strategy Coach rule and `SPEC.md` §6 both state
the three tabs map onto the original nudge/options/tutor depth levels — a fourth rung has no
mapping. You are NOT authorised to rewrite `CLAUDE.md` or `SPEC.md` yourself. Instead: pick the
tab's user-facing label, and record the resulting doc inconsistency as an item in `OPEN-WORK.md`
§A, naming both files and the exact claims that are now stale, so the owner can reconcile them in
lane A. Do this in the same commit that wires the tab in — not afterwards, not only in the PR
description.

---

# 4. Explicit non-goals

Do NOT implement:

- Any change to `packages/engine` — this brief documents the contract precisely (§6) so you
  never need to read engine source to build against it.
- A confidence-percentage chip for the whole panel (the v6 mockup's "86% confidence" pattern).
  `RouteToPointsResult` has no single confidence number, and inventing one that blends
  `'shanten'`- and `'heuristic'`-basis candidates would repeat exactly the mixed-basis mistake
  `docs/rules/decisions.md` #35 and #37 already document and fixed at the engine layer. Don't
  reintroduce it in the UI.
- New fan detection, new scoring, new shanten/probability logic of any kind. If a display
  decision seems to require new Mahjong logic (e.g. "should we combine these two candidates'
  probabilities"), stop and flag it — don't compute it in the component.
- A change to which tab is open by default, or any change that makes the coach visible before
  Hint is tapped (see §7).

---

# 5. Lane boundary

Per `OPEN-WORK.md` §E's lane table, `packages/ui` is lane C (yours); `packages/engine` is lane A
(Claude's). Stay inside `packages/ui`. If implementing this panel appears to require a change to
`packages/engine/src/hints.ts` or `fan-targets.ts` (a new field, a different aggregation, etc.),
stop that part and flag it in the handoff instead of making the change yourself.

Two other lane-C worktrees may be active concurrently (`feat/landing-cta-clarity`,
`feat/authentic-mcr-wall-deal`). Check `git log --oneline main..<branch>` for both before you
start if you're unsure whether they touch `packages/ui/src/hints/**` or `HintPanel.tsx` — this
brief doesn't assume isolation from them.

---

# 6. The contract, field by field

Everything below restates the doc comments already on `RouteToPointsResult` and
`FanTargetEstimate` in `packages/engine/src/hints.ts` and `fan-targets.ts`. Those comments are
hard-won — several were rewritten after a shipped bug (see decisions.md #37 and
`KICKOFF-phase10-strategy-coach.md`'s CHANGE 3 history) — so treat the "does NOT mean" lines
below as seriously as the "means" lines.

## 6.1 `FanTargetEstimate`

```ts
export interface FanTargetEstimate {
  fanId: number
  points: number
  status: 'locked' | 'inProgress'
  tilesNeeded: TileTypeId[]
  completionProbability: number
  probabilityBasis: 'shanten' | 'heuristic'
  value: number
}
```

- **`fanId`** — one of MCR's 81 fan IDs. Look up display name/points via the fan registry data
  you're given in the fixtures (§9) — don't hardcode a second name table in the component; take
  the name as part of the fixture/props shape.
- **`points`** — this fan's fixed point value if it fires (e.g. Half Flush is always 6). NOT an
  expected value — it does not already incorporate `completionProbability`.
- **`status`**
  - `'locked'` — already structurally guaranteed from the hand as it stands. `tilesNeeded` is
    always empty in this case. Means "this specific fan will fire if the hand completes along
    this shape," not "the hand is complete."
  - `'inProgress'` — not locked, but the hand has a real structural lean toward it. This is the
    ONLY other state; there is no `'unlikely'` or `'blocked'` status. A family judged too far off
    to be worth surfacing simply produces no candidate at all for that hand — an empty
    `candidates` array (or a missing family within it) is a normal, expected result, not a gap.
    **Do not render "0 candidates" as an error or a "nothing to work with" failure state per se
    — see the melded-hand fixture in §9 for how to handle it.**
- **`tilesNeeded`** — distinct tile types (deduped) that would help. Empty when `status` is
  `'locked'`. This is NOT a full list of every tile that could ever help in every possible
  future — it's the estimator's own current read.
- **`completionProbability`** — a 0-1 number. **Its meaning depends entirely on
  `probabilityBasis` — see below. Never treat this as one uniform statistical quantity across
  the array.**
- **`probabilityBasis`** — THE non-negotiable field for this panel. Two genuinely different kinds
  of number:
  - `'shanten'` — derived from this project's own validated shanten/ukeire distance metric, or an
    equally exact discrete count (e.g. "2 of 3 required dragon pungs already complete"). As
    precise as the rest of the engine's hand-shape reasoning.
  - `'heuristic'` — an explicitly non-rulebook-sourced teaching estimate (docs/rules/decisions.md
    #35). Monotonic and directionally honest ("more offending tiles = lower"), but NOT derived
    from anything resembling real draw probability. It is a rough signal, not a statistic.
  - **These must never be rendered as equally precise numbers side by side.** See §7 for the
    concrete non-negotiable.
- **`value`** — `completionProbability * points`. Exists for ranking/selecting candidates (which
  is why `selected`/`credibleSelected` are pre-sorted for you). It is NOT itself a points
  prediction and should not be displayed as one (e.g. don't render "expected value: 4.2 pts").

## 6.2 `MinimumPointsStatus`

```ts
export type MinimumPointsStatus = 'reachable' | 'currentWaitsFallShort' | 'unknown'
```

Three states, not two, and not interchangeable:

- **`'reachable'`** — a concrete route to ≥8 points is identified. Either grounded in the hand's
  real, tenpai-exact waits (strongest case), or, pre-tenpai, `crediblePointsTotal` alone already
  clears the minimum.
- **`'currentWaitsFallShort'`** — grounded ONLY in the tenpai-exact answer: finishing the hand's
  CURRENT shape, on any of its CURRENT waits, tops out under 8 points. **This is deliberately not
  named `'unreachable'`. It says nothing about whether breaking tenpai and rebuilding toward a
  different hand could still reach 8 — that possibility is always open and this field takes no
  position on it.** See §7 for the exact copy requirement this drives.
- **`'unknown'`** — the honest pre-tenpai default: no tenpai-exact answer exists yet, and the
  gated `crediblePointsTotal` hasn't found a credible route either. This is NOT a claim that the
  hand is in trouble — most hands sit here for most of their life. Partial family coverage
  falling short this early is not evidence of anything; the hand may complete via a fan Stage 3
  never modeled at all (only 10 of 81 fans have estimators), or via a family it modeled but
  hasn't reached credible progress on yet.

## 6.3 `RouteToPointsResult`

```ts
export interface RouteToPointsResult {
  candidates: FanTargetEstimate[]
  selected: FanTargetEstimate[]
  lockedInPoints: number
  bestCaseTotal: number
  credibleSelected: FanTargetEstimate[]
  crediblePointsTotal: number
  minimumPointsStatus: MinimumPointsStatus
}
```

- **`candidates`** — every applicable target for this hand, unfiltered, sorted by `value`
  descending. This is the full list; `selected`/`credibleSelected` are curated subsets of it (by
  reference — same objects).
- **`selected`** — the pairwise-compatible subset of `candidates` that was actually walked into
  `bestCaseTotal`. A naive value-sum over `candidates` could double-count structurally
  incompatible fans (e.g. No Honors and Dragon Pung can never coexist); `selected` is already
  filtered to a set that could genuinely coexist.
- **`lockedInPoints`** — sum of already-locked-in fans' points (melds pre-tenpai, or the stricter
  real-waits intersection at tenpai). This is real, not speculative.
  **Gap you must work around (review, 2026-08-22):** this is an ANONYMOUS INTEGER —
  `RouteToPointsResult` does not carry the fan IDs behind it. The named list lives on
  `HandPlanResult.lockedInFans` (a `FanProgress[]` of `{ fanId, count }`), not here. But §10's
  clarity bar and §16's definition of done both require the player to see WHICH fans are locked
  in, so the number alone cannot satisfy them. **Resolution, and it stays inside lane C:**
  call `computeHandPlan(hand, { prevailingWind, seatWind })` from the new tab component and read
  `lockedInFans` off that result, exactly as `HandPlanTab.tsx` already does today (copy its call
  signature — it is the existing convention for this). This is NOT an engine change and NOT a
  lane-A blocker; do not escalate it under §15.
- **`bestCaseTotal`** — `lockedInPoints + sum(selected fans' points)`. **An UN-GATED aspirational
  CEILING** — "what's the absolute best this hand could ever show," assuming every `inProgress`
  candidate with any nonzero probability eventually lands. It is NOT a forecast and NOT the
  ground truth about whether the hand can reach 8 points. **Never use this number to answer "can
  this hand reach the minimum" — that's what `minimumPointsStatus` is for.** A tenpai hand
  winning via a fan outside the 10 modeled families can clear the minimum for real while this
  number stays low; conversely a pre-tenpai hand can show a `bestCaseTotal` well over 8 while
  `minimumPointsStatus` is `'unknown'` or the hand never actually gets there (see §9's
  disagreement fixture — this is the exact failure mode `crediblePointsTotal` exists to correct
  for, per decisions.md #37).
- **`credibleSelected`** — the same greedy/compatibility walk as `selected`, but three families
  known to carry ~93% of `bestCaseTotal`'s over-optimism (Seven Pairs, Half/Full Flush, All
  Simples/No Honors) are admitted only within a measured distance-of-shape gate, not merely
  "nonzero probability." The other 7 families are ungated (same bar as `selected`).
- **`crediblePointsTotal`** — `lockedInPoints + sum(credibleSelected fans' points)`. **This is
  the grounded, gated number** — the one `minimumPointsStatus`'s pre-tenpai fallback actually
  compares against the 8-point minimum. If the panel shows one running total to a beginner as
  "your current best real route," this is it — not `bestCaseTotal`. See §7 for the explicit
  labeling requirement if both are shown.
- **`minimumPointsStatus`** — see §6.2. **SPEC §6 names this the single most valuable thing this
  panel can say. It is REQUIRED to render, not optional, regardless of which container (§3) it
  ends up in.**

---

# 7. Non-negotiables

These are hard requirements, not style suggestions. A build that violates any of these is not
done, regardless of how it looks.

1. **`'shanten'` and `'heuristic'` candidates must never be rendered as equally precise numbers.**
   No percentages on `'heuristic'`-basis candidates, full stop — not "12%," not "~12%," nothing
   numeric. Use different vocabulary and different visual treatment per tier (see §8 for
   concrete direction). A player must be able to tell at a glance, without reading fine print,
   that a `'shanten'` candidate and a `'heuristic'` candidate are different kinds of claim.
2. **`minimumPointsStatus` is required to render**, in whichever container §3 lands on. Silence
   (an empty candidates list with no status shown) is not an acceptable state.
3. **`'currentWaitsFallShort'` copy must never say "this hand cannot reach 8 points."** It must
   say the CURRENT waits fall short, and that breaking tenpai and rebuilding is still possible.
   Exact copy is in §7.1 — don't improvise a paraphrase that reintroduces the overclaim.
4. **If both `bestCaseTotal` and `crediblePointsTotal` are shown, they must be labeled
   distinctly** — never as two numbers under the same heading. See §7.2 for which one, if either,
   is the beginner-facing headline.
5. **The coach stays hidden until Hint is tapped, never shown for bots.** This panel lives inside
   the existing `HintPanel` (or a tab within it) — don't give it a separate always-visible surface,
   don't render it for any seat other than the human player's.
6. **Check the finished panel against SPEC §5a and §5c before calling it done** — see §10. These
   are two separate bars; passing one does not imply the other.

## 7.1 Copy for the three `minimumPointsStatus` states

Use this copy directly (adapt only for length/container constraints — the meaning in each must
survive):

**`'reachable'`**
> Headline: **A route to 8 points is open**
> Supporting line: *There's a way to the 8-point minimum from here — it still has to come
> together.*

**Why not "On track for 8 points" (review, 2026-08-22).** `'reachable'` is produced by two paths
of very different strength, and the field does not tell you which one fired. At tenpai it is
exact — grounded in the hand's real waits, scored by the full 81-fan scorer. Pre-tenpai it means
only that `crediblePointsTotal` (a gated CEILING, which assumes every credible candidate lands)
clears 8. Copy like "on track" asserts the tenpai-grade confidence in both cases. That is the
same conflation §7's non-negotiable #1 forbids between `'shanten'` and `'heuristic'` candidates,
committed one level up at the headline. The copy must stay hedged enough to be true in the
weaker case — **do not strengthen it.** If you believe the hedge makes the panel too vague to be
useful, that is a §15 escalation, not a licence to reword.

**`'currentWaitsFallShort'`**
> Headline: **Your current waits fall short**
> Supporting line: *Finishing this exact hand won't reach 8 points on any of its current waits.
> Breaking tenpai and rebuilding toward a different hand could still get you there.*

**`'unknown'`**
> Headline: **No clear route yet**
> Supporting line: *Too early to tell — this hand hasn't shown a credible route to 8 points yet,
> but it's not ruled out either.*

Do not write a fourth, "in between" message for any other engine value — there are only these
three states.

## 7.2 Which total the beginner sees

**Recommendation (not the owner-decides item, but follow this unless directed otherwise):**
`crediblePointsTotal` is the number a beginner sees as "your current best route" — it's the one
`minimumPointsStatus` is actually grounded in pre-tenpai, so showing it keeps the headline status
and the supporting number consistent with each other.

`bestCaseTotal` may be shown, but only as a clearly secondary, explicitly-labeled aside (e.g. a
smaller line reading "Absolute ceiling if everything breaks your way: N pts" or similar) — never
as a peer number next to `crediblePointsTotal` under a shared, unqualified label like "Total." If
in doubt, prefer omitting `bestCaseTotal` from the default view entirely over mislabeling it;
re-decompressing it into a real number without decompressing its meaning is exactly the failure
`docs/rules/decisions.md` #37 fixed at the engine layer — don't reintroduce it in the UI layer by
showing the number without the caveat.

---

# 8. Visual treatment guidance (yours to execute, not prescribed pixel-for-pixel)

The mockup's `done` / plain / `Needed` vocabulary (§1.5, `route-line` rows) is a reasonable
starting point for `status`/tier styling, adapted for the real contract:

- **Locked-in fans** (`status: 'locked'`, plus `lockedInPoints`'s real contributors if you have
  names for them) — the mockup's `✓ done` treatment: checkmark, settled/confirmed color.
- **`'shanten'`-basis `inProgress` candidates** — can carry a number (e.g. "2 of 3 tiles," a
  shanten-style distance, or `completionProbability` re-expressed as a coarse qualitative band
  like High/Medium/Low if you want a single glance-able signal) since this tier's numbers are
  actually exact. Still shouldn't be a bare unlabeled percentage — pair it with a distance-style
  phrase ("1 tile away") rather than "73%," since the underlying metric is a discrete count, not
  a probability distribution.
- **`'heuristic'`-basis `inProgress` candidates** — text-only distance language ("developing,"
  "a few tiles off," "needs N more of [suit]") with a visibly lighter/more tentative treatment
  (lower-emphasis color, an icon distinct from the shanten tier's, or both). No numbers of any
  kind attached to `completionProbability` for this tier.
- Sort/group by tier (locked → shanten-basis in-progress → heuristic-basis in-progress) rather
  than pure `value` order, so the precision boundary is visually legible as a grouping, not just
  a color difference a player has to notice tile-by-tile.

This section is guidance for a first pass, not a locked spec — use judgment on exact colors/
icons within the constraints of §7.1.

---

# 9. Fixtures — build against these, no engine required

Export these as a small TypeScript module (suggested location:
`packages/ui/src/hints/routeToPointsFixtures.ts`, or a `__fixtures__` folder if that matches
existing test conventions better — your call) with named exports, each typed as
`RouteToPointsResult`. Illustrative only — structurally valid against the real types, but not
captured from a live engine run. Treat point values/fan IDs as realistic, not as something to
re-verify against the rulebook; that's lane A's job, not yours.

Fan reference for the IDs used below (name — points): 2 Big Three Dragons (88), 19 Seven Pairs
(24), 22 Full Flush (24), 49 All Pungs (6), 50 Half Flush (6), 59 Dragon Pung (2), 60 Prevalent
Wind (2), 61 Seat Wind (2), 68 All Simples (2), 76 No Honors (1).

**Reference identity matters (review, 2026-08-22).** §6.3 states that `selected` and
`credibleSelected` are subsets of `candidates` BY REFERENCE — the real engine puts the same
object into more than one array. Your fixtures must preserve that: declare each candidate once
as a shared `const` and reference it from every array it belongs to (the fixtures below have
been rewritten to do this). If you write duplicate object literals instead, any component logic
relying on reference identity — e.g. `candidates.filter(c => !credibleSelected.includes(c))` to
render "considered, but not credible yet" — will pass against fixtures and break against the
live engine.

**`TileTypeId` is just `string`.** Wrong tile codes typecheck silently. The codes used below are
real (`'DG'` green dragon, `'WE'` east wind, `'C2'`/`'D4'`/`'B6'` for characters/dots/bamboo);
check any you add by hand against `packages/engine/src/tiles.ts` rather than trusting the
compiler.

```ts
import type { FanTargetEstimate, RouteToPointsResult } from '@mahjong-mcr/engine'

// Candidates are declared ONCE and shared by reference across candidates /
// selected / credibleSelected, mirroring what the real engine does. See the
// "Reference identity matters" note above — do not inline duplicate literals.

const dragonPungCandidate: FanTargetEstimate = {
  fanId: 59, // Dragon Pung, 2 pts
  points: 2,
  status: 'inProgress',
  tilesNeeded: ['DG'],
  completionProbability: 0.67,
  probabilityBasis: 'shanten',
  value: 1.34,
}

const sevenPairsCandidate: FanTargetEstimate = {
  fanId: 19, // Seven Pairs, 24 pts
  points: 24,
  status: 'inProgress',
  tilesNeeded: ['C2', 'C5', 'D4', 'D8', 'B1', 'B6'],
  completionProbability: 0.14,
  probabilityBasis: 'shanten',
  value: 3.36,
}

const halfFlushCandidate: FanTargetEstimate = {
  fanId: 50, // Half Flush, 6 pts
  points: 6,
  status: 'inProgress',
  tilesNeeded: ['C2', 'C5', 'D4', 'D8'],
  completionProbability: 0.22,
  probabilityBasis: 'heuristic',
  value: 1.32,
}

const allSimplesCandidate: FanTargetEstimate = {
  fanId: 68, // All Simples, 2 pts
  points: 2,
  status: 'inProgress',
  tilesNeeded: ['WE'],
  completionProbability: 0.31,
  probabilityBasis: 'heuristic',
  value: 0.62,
}

// 1. REACHABLE — tenpai, grounded in real waits. One locked-in fan, plus one
// further shanten-basis candidate already selected into the credible route.
export const reachableFixture: RouteToPointsResult = {
  candidates: [dragonPungCandidate],
  selected: [dragonPungCandidate],
  lockedInPoints: 2, // Seat Wind pung (61), already melded
  bestCaseTotal: 4,
  credibleSelected: [dragonPungCandidate],
  crediblePointsTotal: 4,
  // NOTE: minimumPointsStatus here is 'reachable' via the tenpai-exact path
  // (computeHandPlan's real-waits answer), NOT because crediblePointsTotal
  // (4) clears 8 on its own — it doesn't. This is deliberate: never infer
  // minimumPointsStatus from crediblePointsTotal >= 8 in the UI. Always
  // render the field exactly as given.
  minimumPointsStatus: 'reachable',
}

// 2. CURRENT WAITS FALL SHORT — tenpai, but every current wait tops out
// under 8. Copy must use the exact §7.1 wording, not "cannot reach 8."
export const currentWaitsFallShortFixture: RouteToPointsResult = {
  candidates: [],
  selected: [],
  lockedInPoints: 2, // Prevalent Wind pung (60), already melded
  bestCaseTotal: 2,
  credibleSelected: [],
  crediblePointsTotal: 2,
  minimumPointsStatus: 'currentWaitsFallShort',
}

// 3. UNKNOWN, WITH A SHARP bestCaseTotal / crediblePointsTotal DISAGREEMENT —
// pre-tenpai, 2-shanten, concealed. bestCaseTotal (24) clears the minimum
// three times over on the strength of ONE barely-started Seven Pairs
// candidate admitted at FULL raw points for a 0.14 probability, while
// crediblePointsTotal (0) shows nothing here is actually close enough to be
// credible. The two heuristic candidates sit in `candidates` but lose the
// compatibility walk to Seven Pairs, so they never reach `selected` either.
//
// COMMENT CORRECTED IN REVIEW (2026-08-22): the original said bestCaseTotal
// was 12 and came from "three loose heuristic candidates". Neither matched
// the data below, which is 24 from a single shanten-basis candidate.
//
// This is the exact failure mode docs/rules/decisions.md #37 fixed at the
// engine layer. The panel must not undo it by treating bestCaseTotal as the
// headline number.
export const sharpDisagreementFixture: RouteToPointsResult = {
  candidates: [sevenPairsCandidate, halfFlushCandidate, allSimplesCandidate],
  selected: [sevenPairsCandidate],
  lockedInPoints: 0,
  bestCaseTotal: 24,
  credibleSelected: [],
  crediblePointsTotal: 0,
  minimumPointsStatus: 'unknown',
}

// 4. MELDED HAND, GENUINELY NOTHING TO OFFER — 1-SHANTEN, THREE MELDS TOTAL.
//
// CORRECTED IN REVIEW (2026-08-22). The original version of this fixture
// described "three exposed melds across two suits plus an honor pung" — four
// melds. Four melds is 12 melded tiles + 1 concealed = 13, i.e. a tanki wait,
// which is ALWAYS tenpai. At tenpai computeHandPlan.bestCaseReachesMinimum is
// non-null, so minimumPointsStatus can only be 'reachable' or
// 'currentWaitsFallShort' — NEVER 'unknown'. The original was a payload the
// engine cannot produce, which would have meant building the empty state
// against an impossible case.
//
// Corrected shape: exactly THREE exposed melds (9 tiles) + 4 concealed = 13,
// at 1-shanten. Two suited chows in different suits rule out the flush
// families, Seven Pairs (any meld at all) and All Pungs (chow melds); the
// third meld is a pung of North wind while the player is East in an East
// round, so neither Seat Wind (61) nor Prevalent Wind (60) fires. That is why
// lockedInPoints is genuinely 0 — lockedInFansFromMelds only awards kongs,
// Dragon Pung, Prevalent Wind and Seat Wind pre-tenpai. Do NOT swap in a
// dragon pung: fan 59 would fire and lockedInPoints would be 2.
//
// candidates is empty, not merely low-value — the "don't render an empty list
// as an error" case from §6.1. With the {1,1,1} credibility gate now shipped,
// this is a state the player will see often, so the empty copy has to be
// genuinely useful rather than a shrug.
export const meldedNothingToOfferFixture: RouteToPointsResult = {
  candidates: [],
  selected: [],
  lockedInPoints: 0,
  bestCaseTotal: 0,
  credibleSelected: [],
  crediblePointsTotal: 0,
  minimumPointsStatus: 'unknown',
}
```

Requirement coverage: fixture 1 → `'reachable'`; fixture 2 → `'currentWaitsFallShort'`; fixtures 3
and 4 → `'unknown'` (two different reasons to be there — sharp disagreement vs. a shape with
nothing to offer at all); fixture 3 → the `bestCaseTotal`/`crediblePointsTotal` disagreement case;
fixture 4 → the melded/nothing-to-offer empty-state case.

---

# 10. SPEC §5a / §5c check before calling this done

Both are required; neither substitutes for the other.

**§5a (information clarity)** — within one click of tapping Hint (SPEC §5a explicitly puts "what
are my live options if I ask for a hint" in the one-click tier, not the two-second tier), a
player who has never seen this panel before should be able to tell, without hunting:

- Whether their hand can currently reach 8 points, and which of the three states that is.
- Which fans are already locked in vs. still being worked toward.
- That a `'heuristic'` candidate is a rougher signal than a `'shanten'` candidate, without reading
  a tooltip to learn that.

**§5c (tactile/physical feel)** — this is a card/list inside an already-tactile modal
(`HintPanel.tsx`'s existing `rounded-lg border ... bg-neutral-900` treatment). Match the existing
panel's depth/weight conventions (existing `route-card`-equivalent styling if any exists
elsewhere in `packages/ui/src/hints`, or the panel's own established border/shadow language) —
don't ship this as a flatter, more wireframe-y insert than the rest of the coach panel it lives
in.

Run both checks explicitly before considering this brief's work complete — don't rely on "it
compiles and the tests pass" as a proxy for either.

---

# 11. Tests

Add tests for at minimum:

- All three `minimumPointsStatus` states render the exact §7.1 copy (or your final adapted
  wording — but assert the meaning-preserving parts: `'currentWaitsFallShort'` must never
  contain phrasing equivalent to "cannot reach").
- A `'heuristic'`-basis candidate never renders a `%` character or any other numeric probability
  in its row.
- A `'shanten'`-basis candidate and a `'heuristic'`-basis candidate render with visually/
  DOM-distinguishable treatment (different class, different test id, different icon — assert
  something concrete, not just "looks different").
- Empty `candidates` (the melded fixture) renders a real empty/neutral state, not a blank gap or
  an error-styled message.
- The panel does not render for a bot seat, and does not render before Hint is tapped (reuse
  whatever pattern `HintPanel.tsx`'s existing tests already use for this, if any exist — check
  `HintPanel.test.tsx` before writing a new one from scratch).
- The old `worstCaseReachesMinimum` alert is GONE from `HandPlanTab.tsx`, not left in place
  alongside the new tab's status banner (§3.1a — this is required now that §3 resolved to a
  fourth tab, precisely because a separate tab would otherwise leave two disagreeing answers to
  the same question).
- The new tab appears in `HintPanel.tsx`'s tablist with correct `role="tab"` /
  `aria-selected` wiring, matching the three existing tabs' pattern.

---

# 12. Build quality gates

Before every commit:

```bash
npm run typecheck
npm test
npm run build
```

Also:

```bash
npm run lint --workspace=@mahjong-mcr/ui
```

Do not commit red. No scoring-validation harness run is necessary — this brief touches no
scoring/rules files. If you find yourself needing to touch anything under `packages/engine`,
that's a sign the lane boundary (§5) has been crossed; stop and flag it rather than proceeding.

---

# 13. Commit strategy

Small commits, suggested sequence:

### Commit 1
Fixtures (§9) — `routeToPointsFixtures.ts`, typed against `RouteToPointsResult`, no UI changes
yet.

### Commit 2
The panel component itself (container per §3's resolved decision), wired to the fixtures, not
yet wired into `HintPanel.tsx`/`HandPlanTab.tsx`.

### Commit 3
Wire into the tab shell (either the new tab or the Hand Plan section), including removal of the
superseded `worstCaseReachesMinimum` alert if applicable.

### Commit 4
Tests (§11).

Do not mix unrelated cleanup into these commits.

---

# 14. Deferred work

Follow the repository rule: nothing is "deferred" merely because it was mentioned in this brief
or in an agent response. If you discover legitimate future work that's deliberately postponed
(e.g. "the mockup's confidence chip idea could come back once there's a real single-number
confidence metric to back it"), record it in `OPEN-WORK.md` §A (UI/layout items) per `CLAUDE.md`,
not just in a commit message or PR description.

---

# 15. Stop conditions / ask-for-owner-decision items

- ~~§3's tab-vs-section question~~ **RESOLVED 2026-08-22 — fourth tab (see §3.1). Not a stop
  condition any more; do not pause on it.**
- Any requirement that appears to need a change inside `packages/engine` (§5).
- A conflict discovered with `feat/landing-cta-clarity` or `feat/authentic-mcr-wall-deal` over
  shared files (`App.tsx`, `HintPanel.tsx`, or similar).
- Anything that would require inventing a new cross-basis confidence number (§4's non-goal) to
  make the panel "look complete" — flag it instead of building it.
- **(Added in review, 2026-08-22.)** If §7.1's deliberately hedged `'reachable'` copy proves too
  vague to be useful — i.e. the panel genuinely needs to distinguish a tenpai-exact `'reachable'`
  from a pre-tenpai estimated one — that IS a legitimate lane-A request: the engine would have to
  expose which path grounded the status. Flag it. Do NOT approximate it by inferring the
  grounding from `crediblePointsTotal >= 8` inside the component; fixture 1 in §9 is a live
  counter-example where that inference gives the wrong answer.

---

# 16. Definition of done

1. §3.1's decision is implemented as a FOURTH TAB in `HintPanel.tsx`, and both of its
   obligations are met: the superseded `worstCaseReachesMinimum` alert is deleted from
   `HandPlanTab.tsx` (§3.1a), and the now-stale tab-mapping claims in `CLAUDE.md` / `SPEC.md`
   §6 are recorded as an `OPEN-WORK.md` §A item in the same commit that wires the tab in
   (§3.1b).
2. `minimumPointsStatus` renders in all three states, using the §7.1 copy (or a reviewed
   equivalent that preserves its meaning), in every fixture from §9.
3. No `'heuristic'`-basis candidate ever renders a numeric probability.
4. `'shanten'`- and `'heuristic'`-basis candidates are visually and lexically distinguishable at
   a glance.
5. `bestCaseTotal` and `crediblePointsTotal`, if both shown, are distinctly labeled;
   `crediblePointsTotal` is the beginner-facing headline number per §7.2 (or a documented,
   deliberate deviation).
6. The empty-candidates case (melded, nothing to offer) renders a real state, not a visual gap.
7. The coach panel is unreachable before Hint is tapped and never renders for a bot seat.
8. SPEC §5a and §5c have both been checked against the finished panel (§10), not just typechecked
   and tested.
9. All tests in §11 pass; `npm run typecheck`, `npm test`, `npm run build` all pass.
10. Any newly discovered deferred work is recorded in `OPEN-WORK.md` §A, not left only in this
    brief or in chat.

---

# 17. First action before coding

Do not write component code yet. First:

1. Read the files in §1, in order.
2. Get the owner's answer to §3.
3. Inspect `packages/ui/src/hints/HintPanel.tsx`, `HandPlanTab.tsx`, and `HandPlanTab.test.tsx`
   (if it exists) to confirm current conventions (styling classes, test id patterns, how
   `computeHandPlan`'s existing tri-state-adjacent alert is tested today) before adding a
   parallel pattern that doesn't match.
4. Only then write the fixtures (§9) and start on the component.
