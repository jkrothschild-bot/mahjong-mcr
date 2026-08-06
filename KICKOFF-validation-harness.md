# Validation harness — the PyMahjongGB cross-check that never got built

Read `CLAUDE.md`, `PLAN.md` §4, and `docs/rules/decisions.md` in full before
starting. This phase touches no game logic and no UI. Its only product is
evidence about whether the scoring engine is right.

## Why this is overdue

`PLAN.md` §4 calls cross-validation "the anti-hallucination core": generate
thousands of completed hands, score them with both this engine and
**PyMahjongGB** (Peking University AI Lab's MCR fan calculator), fail the
build on any mismatch, and triage each one as *our bug*, *their bug*, or
*genuine rulebook ambiguity*.

`validation/` has only ever contained `.gitkeep`. The harness has never
existed. Consequences, stated plainly:

- The full 81-fan engine — M2, the milestone `PLAN.md` itself flags as
  highest-risk — has only ever been checked against fixtures hand-entered
  from the rulebook PDF by the same author/agent pair that wrote the
  detectors. Those catch transcription slips. They cannot catch a fan that
  was *misread the same way twice*, which is exactly what an independent
  implementation is for.
- `CLAUDE.md`'s rule that "scoring changes are not done until validated:
  rulebook fixtures pass AND the PyMahjongGB cross-check in `validation/`
  passes" has been unsatisfiable since it was written. It should currently
  be marked as such; **restoring that rule to a truthful, satisfiable state
  is part of this phase's definition of done.**
- `decisions.md` #18 previously asserted a validation gate had been checked
  while citing no number. That is the failure mode this phase exists to make
  structurally impossible: every claim of validation must point at a
  recorded, reproducible number.

## Scope

**In:** a seeded hand generator, a JSON bridge, a Python comparison script, a
fan-name mapping, a triage protocol, a documented allowlist of known
divergences, and a recorded coverage figure.

**Out:** changing any fan detector, `score-hand.ts`, `win-detection.ts`, or
any UI. If the harness finds a real engine bug, that bug's *fixture* is
added here and the fix is a separate commit — see the triage protocol.

## Stage 1 — bridge and first real comparison

### 1a. Hand generation (TypeScript, seeded)

Random deals almost never produce winning hands, so **construct** them
instead of sampling for them.

- Reuse `packages/engine/src/scenario.ts` and `scenarios/library.ts`. These
  were deliberately retained when practice mode was removed precisely
  because they are the project's only contrived-hand builder (see the note
  at the top of `scenario.ts` and SPEC.md §9) — this phase is the consumer
  that justified keeping them.
- Generate by picking a structure first (four sets + pair, seven pairs,
  thirteen orphans, and the knitted shapes), then materialising real
  `TileInstanceId`s for it, then verifying with the engine's own
  `isWinningHand` before emitting. A generated hand that isn't a win is a
  generator bug and must throw, not be silently skipped — silent skipping is
  how a harness ends up "passing" on an empty set.
- Every hand carries its full scoring context, because most of the 81 fans
  depend on it: `melds` (with `exposure` and `kongSource`), `concealedTiles`,
  `winningTile`, `winMethod`, `prevailingWind`, `seatWind`,
  `isLastTileOfWall`, `isLastDiscardOfGame`, `wonOnKongReplacement`,
  `isLastCopyOfItsKind`, and flower count.
- Seeded via the engine's own `mulberry32`, so any mismatch is reproducible
  from its seed alone. Emit the seed with every case.

### 1b. The JSON bridge

- TS writes `validation/cases/<seed>.json`: the generated hands plus this
  engine's `scoreHand` output for each (`fanMatches` as `{fanId, count}`,
  and `basicPoints`).
- Python reads that file, scores the same hands with PyMahjongGB, and writes
  a comparison report.
- **Verify PyMahjongGB's actual API against the installed package** rather
  than trusting any description of it, including this document's. It is
  broadly `MahjongFanCalculator(pack, hand, winTile, flowerCount,
  isSelfDrawn, is4thTile, isAboutKong, isWallLast, seatWind, prevalentWind)`
  returning `(fanCount, fanName)` tuples, but confirm argument order,
  tile-string encoding (e.g. `W1`/`B1`/`T1`/`F1`/`J1`), and seat/wind
  indexing empirically with a handful of known hands before generating
  thousands.

### 1c. Fan-name mapping — expect this to be the biggest source of noise

This engine identifies fans by numeric id (`FAN_REGISTRY`, `{id, name,
points}`); PyMahjongGB returns names. A mapping table of all 81 is required,
and near-synonyms will not line up automatically.

- Build the map explicitly, one entry per fan, and **assert it is total** —
  any PyMahjongGB name the map doesn't cover must fail loudly rather than be
  dropped, or fan-level comparison silently degrades to points-only.
- Compare at two levels and report them separately: **total points** and
  **the exact fan multiset**. A hand can hit the right total via the wrong
  fans; that's a real bug this catches only at the second level.

### 1d. Known-divergence allowlist (explicit, cited, never silent)

Several mismatches are *expected* because this project made recorded rulings
that PyMahjongGB may not share. These go in a version-controlled allowlist
where each entry cites its `decisions.md` item and the rulebook section:

- #5 — seven pairs: four of one tile is **not** two pairs.
- #6 / #12 — the knitted shapes and Greater Honors composition.
- #7 — flowers do not count toward the 8-point minimum. Flower points are
  added outside `scoreHand` (`deriveScoreContext.ts`), so the comparison
  must either exclude them on both sides or pass `flowerCount` consistently.
  Decide once, state it in the report header, and assert it.
- #13 — the Last Tile Claim / Out with Replacement Tile overlap.
- Sub-8-point hands: this engine returns Chicken Hand (#43) as a floor;
  PyMahjongGB may raise instead. Define the comparison semantics rather than
  letting exceptions read as passes.

An allowlist entry without a rulebook citation is not allowed. The allowlist
is the honest record of where we knowingly differ — it must never become a
place to hide unexplained failures.

### 1e. Triage protocol (`PLAN.md` §4)

For each mismatch, in this order:

1. **Reproduce** from the seed alone.
2. **Consult the rulebook** — `docs/rules/mcr_EN.pdf` only, via the
   `rules-lawyer` posture (cite the section; never from memory).
3. Classify: **our bug** / **their bug** / **genuine ambiguity**.
4. Our bug → add the hand as a permanent fixture FIRST, then fix in a
   separate commit (`CLAUDE.md`'s standing rule).
   Their bug → allowlist entry with citation.
   Ambiguity → record the ruling in `decisions.md`, then allowlist.

**Do not "fix" the engine to match PyMahjongGB without a rulebook citation.**
That is the one failure mode that makes this phase actively harmful: it would
quietly replace our misreadings with theirs and destroy the independence that
gives the cross-check its entire value. PyMahjongGB is a second opinion, not
an oracle.

### 1f. Coverage — a harness that exercises nothing passes trivially

Randomly-constructed hands will hit All Chows constantly and Big Four Winds
never. Report, per run: how many of the 81 fans were exercised at least once,
and list those that were not. Add targeted generators for the unreached ones,
seeded from the existing rulebook fixtures in `scoring/fans-*.test.ts`.

A run whose coverage figure drops must fail, so the harness can't silently
degrade into testing the easy 20 fans.

### Stage 1 done when

- ≥1000 generated hands compared, with the tally recorded in
  `decisions.md`: hands compared, mismatches by category, fans covered, date,
  and the seed range.
- Every mismatch triaged to a category — none left as "unknown".
- Coverage figure recorded and asserted.
- `CLAUDE.md`'s scoring rule restored to a truthful, satisfiable form,
  documenting how to run the harness.
- `README` or the harness's own docstring states the exact command.

## Stage 2 — CI integration (LATER; do not start until Stage 1 is reviewed)

Add Python to CI and gate the build. Expect real friction: install cost,
runtime at scale, and flakiness if generation isn't fully deterministic.
Decide deliberately between running on every push versus nightly/pre-release
with a smaller smoke set on push — and record the decision. A cross-check
that's too slow to run gets disabled, which is worse than one scoped to fit.

## Constraints

- `packages/engine` stays pure TypeScript, seeded, serialisable. The bridge
  is a script under `validation/`, not an engine dependency; nothing in
  `packages/` may import from `validation/`.
- No network access at scoring time. PyMahjongGB is a local dependency,
  pinned to an exact version — an unpinned comparison oracle silently
  changes what "validated" means.
- Do not touch scoring logic in this phase. Fixtures first, fixes separately.
- Report honestly. A run that finds twenty mismatches is a *successful* run
  — that is the point. A run reporting zero mismatches should be treated as
  suspicious until its coverage figure proves it compared anything.

## Resume here (2026-08-05)

Steps 0-2 of the post-Stage-1 findings work are done and committed (7
commits, `938bfb9`..`3aed2d8`): CLAUDE.md's bug count corrected, the
knitted-tile shape gap fixed (fans 20/34/35, plus the 7-detector
`sets.length !== 4` guard it exposed, its own separate/revertable commit),
and fan 48 "Two Concealed Kongs" confirmed at 8 points (no engine change).
Harness coverage is 80/81 (only fan 81, out of scope by design, remains
uncovered). Full findings in `docs/rules/decisions.md` #20/#21.

**Step 3 (the six original exclusion/detector bugs) is next.** Both checks
below were actually run while writing this note, not left as reasoning or
TODOs — results follow.

**(a) Evidence the detector-guard's "zero behavioral change" claim from the
harness delta, not from reasoning alone.** Done: checked out the 7 files at
their pre-fix content (`git show <commit>~1:<path>`, the commit right before
`d2e5115`), regenerated the same `runSeed=20260805` cases, and compared
every hand touching the 7 affected fans (All Terminals, All Honors, All
Terminals and Honors, All Even Pungs, All Fives, All Pungs, All Chows)
against the post-fix run by seed:
  - Before: 123 hands touched these fans, 79 mismatched.
  - After: 122 hands touched these fans, 78 mismatched.
  - Exact set difference: **`{20260860}` (= `targeted-35-knitted-straight`)
    is the only seed that changed — present in the "before" mismatch list,
    absent from "after."** Every other mismatched hand (78 of them) is
    byte-for-byte the same seed in both runs. Zero new mismatches
    introduced, zero mismatches removed other than the one the fix targeted.
  - This is the harness-delta evidence the "zero behavioral change" claim
    was missing — confirmed empirically, not just via the full test suite
    staying green and the `sets.length` invariant argument (both still
    true, but now corroborated rather than standing alone).

**(b) Confirm no hand previously classified `our_bug` became non-`our_bug`
under the new multi-cause (peeling) classifier.** Done for all 6
`OUR_BUG_FAMILIES` entries, not left as a TODO — ran the systematic sweep
while writing this note (query each family for hands whose diff is
*exactly* that family, i.e. genuinely isolated, not just a loose subset
match). Results:
  - `[60,73]`/`[61,73]` (Prevalent/Seat Wind vs Pung of Terminals or
    Honors): **solid, 89 isolated hands**, every one confirmed to have a
    Prevalent Wind or Seat Wind fan present on our side (so the bare
    `{"Pung of Terminals or Honors"}` diff genuinely is this mechanism, not
    a stray terminal pung explained some other way).
  - `{Fully Concealed Hand, Self-Drawn}` (missing `[4,56]`/`[6,56]`/
    `[7,56]`/`[12,56]`/`[19,56]`): **solid, 78 hands with the exact 2-name
    diff.**
  - `{No Honors}` (missing `[68,76]`/`[13,76]`): **solid, 52 exact hits.**
  - `{Tile Hog}`: **solid, 78 exact hits.**
  - `{Half Flush, One Voided Suit}` (missing `[3,50]`/`[3,75]`): **thin but
    clean** — only 1 occurrence in this sample (All Green is rare), but
    unambiguous: `All Green` itself matches on both sides, the only diff is
    an extra `Half Flush` on ours, no alternative explanation fits.
  - `[46,80]` (Out with Replacement Tile should exclude Self-Drawn): **NOT
    solid — zero genuine occurrences.** All 31 hands that used to cite this
    family (under the old, non-peeling classifier) turned out to be bare
    `{"Out with Replacement Tile"}` diffs — decisions.md #13's overlap, not
    `[46,80]` at all. The peeling classifier already fixed the
    misclassification (it now correctly reports these as `ambiguity`); this
    is not a new problem the peeling change introduced, it's a pre-existing
    one the peeling change happened to reveal (the old single-family subset
    check was already loose enough to match a diff of size 1 against a
    2-name family). Recorded in `decisions.md` #20.
  - **Net conclusion**: the peeling classifier did not silently downgrade
    any real bug — priority ordering (`our_bug` > `ambiguity` > `their_bug`)
    holds correctly wherever a genuine our_bug signature is present. The
    one family that turned out unreliable was unreliable before the peeling
    change too; peeling just exposed it. `[46,80]` is still believed to be
    a real bug (direct evidence from `fan_calculator.cpp`'s "杠上开花不计自摸"),
    just not yet seen in isolation in this sample — when fixing it in
    Step 3, do not rely on this harness run to validate the fix; construct
    a dedicated targeted-46-style case that isolates it first (self-drawn
    kong-replacement win, `Self-Drawn` and `Out with Replacement Tile` both
    genuinely eligible on the same hand), confirm PyMahjongGB agrees, then
    fix.

Also worth remembering going into Step 3: the ~55 unclassified mismatches
this run reports (`decisions.md` #19/#20) are almost certainly going to
shift again once Step 3's fixes land, the same way item #20's own fix
shifted 126 hands out of unclassified without changing engine behavior —
don't assume the residual count is stable, re-run after each fix per
CLAUDE.md's standing rule.

## Steps 4/5 complete (2026-08-06), all resulting bugs fixed (2026-08-06) — see decisions.md #30-#33

Step 3's six original bugs are fixed. Step 4 (triage the unclassified
residual) and Step 5 (record a final baseline) are also done, and — in a
follow-up pass the same day — every bug those steps found is now ALSO
fixed, not left deferred the way item #6's knitted-shape gap once was:

- ~~Revert `exclusions.ts`'s `[4,56]`/`[6,56]`/`[7,56]`/`[12,56]`/`[19,56]`~~
  — **done, decisions.md #32(a).**
- ~~Add a citation guard (test + `exclusion-citations.ts`) so an uncited
  exclusion can't land silently again~~ — **done, decisions.md #33(a), done
  FIRST per instruction, before any exclusion edit.** Existing entries were
  grandfathered, not backfilled with real citations — that backfill is the
  one piece of this list still open, see below.
- ~~Fix `detectFullyConcealedHand`/`detectConcealedHand` rejecting a
  concealed kong~~ — **done, decisions.md #33(b)**, re-verified via a FRESH
  independent `rules-lawyer` pass first (not reusing #30(b)'s own citation),
  since this is the same rulebook territory item #23 got wrong.
- ~~Fix `detectTwoConcealedPungs` excluding kongs from its count~~ —
  **done, decisions.md #33(b)**, same fresh-re-verification treatment.
- ~~Add `exclusions.ts`'s `[18, 55]`~~ — **done, decisions.md #33(b).**
- ~~Add a `specialShape === 'sevenPairs'` branch to `detectAllTypes`~~ —
  **done, decisions.md #33(b).**
- ~~Fix `detectTileHog`'s multi-type undercount~~ — **done, decisions.md
  #33(b).**
- ~~Add `exclusions.ts`'s `[21,76]`/`[31,76]`~~ — **done, decisions.md
  #33(b).**
- ~~Fix `validation/src/win-circumstance.ts`'s `otherCopiesInOwnHand`~~ —
  **done, decisions.md #33(c)** — the first fix attempt broke a different,
  previously-working case by over-narrowing a function two different
  callers needed different scopes from; caught by re-running the harness
  and investigating the one new mismatch, not assumed clean. Corrected to
  two separately-scoped functions. Also fixed a related bug in
  `generators/targeted.ts`'s `targeted-58-last-tile` case in the same pass.

**Final baseline (decisions.md #33): 1200 hands, `their_bug` 110,
`ambiguity` 194, `our_bug` 0, `unclassified` 23, coverage 80/81 fans.**

**What's actually still open:**

1. **Backfill real citations for the ~91 grandfathered exclusion pairs**
   in `exclusion-citations.ts` — deliberately deferred when the guard was
   built (decisions.md #33(a)), now lower-priority than before since the
   guard already prevents a NEW uncited entry, but the existing table is
   still formally unverified pair-by-pair.
2. **Re-triage the 23-hand unclassified residual against the CURRENT
   run** — decisions.md #30(h)'s "~9 genuinely open" characterization was
   written against a pre-fix snapshot; `ambiguity` alone moved by 25 hands
   in one fix and 6 in another since then, so re-derive which hands are
   actually still unexplained rather than trusting the old list. ~14 of
   the 23 are very likely still the benign equal-scoring decomposition
   ties from #30(h)'s first bullet (no rulebook tiebreak exists, neither
   engine is wrong), but confirm rather than assume.
3. Phase 10's 2000-seed self-play regression question
   (`KICKOFF-phase10-strategy-coach.md`'s "State of play" section) —
   unrelated to scoring validation; still parked unless picked up as
   explicitly-authorized time-permitting work in a given session.
