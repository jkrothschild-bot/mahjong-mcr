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
