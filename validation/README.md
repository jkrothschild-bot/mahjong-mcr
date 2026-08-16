# Validation harness

Cross-checks this engine's scoring (`packages/engine/src/scoring`) against
**PyMahjongGB**, an independent MCR fan calculator, per
`KICKOFF-validation-harness.md`. This is Stage 1: a seeded hand generator, a
JSON bridge, and a Python comparison script. See that doc for the full
design rationale and `docs/rules/decisions.md` for the recorded results of
the last run.

`packages/` never imports anything from here, and this package never
touches scoring logic — it only calls `scoreHand` and reports what comes
back.

## One-time setup

```sh
npm install                              # from the repo root — installs tsx etc.
pip install -r validation/requirements.txt   # builds PyMahjongGB locally (needs a C/C++ toolchain)
```

## Running the harness

```sh
# 1. Generate hands (TypeScript) — writes validation/cases/<runSeed>.json
npm run generate --workspace=@mahjong-mcr/validation -- <count> <runSeed>
# e.g.
npm run generate --workspace=@mahjong-mcr/validation -- 1200 20260805

# 2. Compare against PyMahjongGB (Python)
python validation/compare.py
# optionally write a machine-readable report:
python validation/compare.py --json-report validation/.report.json
```

`<count>` defaults to 1000, `<runSeed>` defaults to the current time. Every
individual hand also carries its own derived seed (`runSeed` mixed through
the engine's `mulberry32`/`nextSeed`), printed in `compare.py`'s output, so
any mismatch is reproducible on its own without needing the whole batch.

`compare.py` reads every `*.json` file under `validation/cases/` (not just
the most recent one), so multiple runs accumulate rather than overwrite each
other — remove old files if you want a clean single-run report.

## Reading the report

Each hand is compared at two levels (points and the exact fan multiset) and
every mismatch is classified into one of four buckets — see
`allowlist.py`'s module docstring for the full triage rules:

- **their_bug** — a PyMahjongGB-specific implementation choice or house-rule
  extension (e.g. its non-standard "Concealed Kong and Melded Kong" fan,
  transparently folded back into the two official fans it replaces before
  comparison — see `compare.py`'s `translate_pmgb_result`).
- **ambiguity** — a `docs/rules/decisions.md` provisional ruling that
  PyMahjongGB happens to implement differently. Never "fixed" to match
  PyMahjongGB without a rulebook citation.
- **our_bug** — a confirmed engine bug. Each one already has a permanent,
  intentionally-failing-by-design test fixture committed (see the file/line
  cited in the report's breakdown) documenting the *actual* (wrong)
  behavior; CLAUDE.md's rule is fixture first, fix in a separate commit.
- **UNCLASSIFIED** — genuinely untriaged; see `docs/rules/decisions.md` for
  the current residual count and what's known about it.

The report also prints a coverage line: how many of the 81 fans were
exercised at least once, and which weren't. A coverage drop should be
treated as a regression — see `KICKOFF-validation-harness.md` 1f.

## Known, permanent gaps

Fans 20 (Greater Honors and Knitted Tiles), 34 (Lesser Honors and Knitted
Tiles), and 35 (Knitted Straight) can never appear in a generated case:
`decomposeHand` has no notion of a "knitted" set, so `isWinningHand` returns
`false` for every hand these fans require — see the "KNOWN BUG" block in
`packages/engine/src/win-detection.test.ts`. Fan 81 (Flower Tiles) is out of
scope by design: every generated case has `flowerCount: 0` (see
`generate.ts`'s header comment).

## Strategy Coach self-play calibration harness (Phase 10)

A second, unrelated harness under `src/selfplay/` — same package, same TS +
`tsx` conventions, but it doesn't touch scoring or PyMahjongGB at all. It
plays full self-play hands with the engine's own production bot policy
(`bots/policy.ts`'s `chooseMove`) and measures how well
`computeRouteToPoints`'s `minimumPointsStatus` predicts whether the hand it's
evaluating actually goes on to finish (a legal win — always >=8 points by
construction of the win-legality gate). See
`KICKOFF-phase10-strategy-coach.md`'s state-of-play notes and
`docs/rules/decisions.md` for the recorded results of the runs this backs.

```sh
# 1. Play hands and record samples (chunked — a single hand costs ~1.8s of
#    real self-play, so a few thousand hands needs sub-10-minute chunks).
#    Appends to selfplay-samples/{samples,outcomes}.jsonl.
npm run selfplay:sample --workspace=@mahjong-mcr/validation -- <count> <seedStart>
# e.g., run in 250-hand chunks:
npm run selfplay:sample --workspace=@mahjong-mcr/validation -- 250 0
npm run selfplay:sample --workspace=@mahjong-mcr/validation -- 250 250
# ...

# 2. Report calibration: BEFORE (today's real minimumPointsStatus) vs AFTER
#    (a hypothetical per-family distance gate on fans 19/22/50/68/76, reusing
#    the REAL areExclusive/isRouteCompatible selection logic so it can never
#    drift from computeRouteToPoints' own rule — only the admission bar
#    changes), bucketed by shanten.
npm run selfplay:report --workspace=@mahjong-mcr/validation -- <sevenPairsShantenMax> <flushTilesNeededMax> <simplesHonorsTilesNeededMax>
# e.g., the thresholds actually shipped (see decisions.md):
npm run selfplay:report --workspace=@mahjong-mcr/validation -- 1 1 1
```

`report.ts` self-checks on every run: recomputing the ungated total via its
own re-implementation of the selection walk must reproduce today's real
`bestCaseTotal`/`minimumPointsStatus` exactly, or it refuses to trust the
gated numbers it prints. Read **honestly**, not just at face value: seat 0 is
always played by the same efficiency-only bot policy as every other seat,
not a coached human optimizing for the 8-point minimum, and the report's own
output shows `P(seat0 eventually wins)` sits nearly flat (~18-20%) across
shanten 1 through 5 — most of the variance in "did this hand finish" is
4-player race/wall-exhaustion noise, not hand quality at the sampled
decision point. This caps how much lift *any* estimate-based signal can
show against this ground truth; the report's own before/after numbers and
`docs/rules/decisions.md`'s entry say so explicitly rather than overselling
a clean win.

## Layout

```
validation/
  src/
    tile-codes.ts        this engine's tile ids <-> PyMahjongGB's tile codes
    fan-map.json          the single source of truth joining both fan tables by name (loaded by both TS and Python)
    fan-map.ts             loads + asserts fan-map.json is total against FAN_REGISTRY
    hand-helpers.ts        TileAllocator, meld constructors, small RNG-based pickers
    case-types.ts           GeneratedCase — one verified-winning hand plus its scoring context
    win-circumstance.ts      randomizes win-method/wind/rare-flag context consistently
    generators/
      standard.ts             random four-sets-plus-pair hands (melds, kongs, chows, pungs)
      seven-pairs.ts            random Seven Pairs / Seven Shifted Pairs
      thirteen-orphans.ts        random Thirteen Orphans
      targeted.ts                 hand-crafted constructors for fans random generation can't reach
    build-pmgb-input.ts   converts a GeneratedCase into MahjongFanCalculator's exact argument shape
    score-with-engine.ts  thin wrapper around this engine's own scoreHand
    generate.ts           CLI entry point (see "Running the harness" above)
    selfplay/               Phase 10 Strategy Coach calibration harness (see its own section above) — unrelated to PyMahjongGB
      sample.ts               plays self-play hands, writes selfplay-samples/{samples,outcomes}.jsonl
      report.ts                reads that JSONL, prints the before/after calibration report
  fan-map.json           (see above — read by both languages)
  compare.py              the Python half: scores every case with PyMahjongGB and reports
  allowlist.py             the triage classifier + the cited known-divergence record
  requirements.txt
  cases/                  generated output (gitignored; regenerate with the command above)
  selfplay-samples/       selfplay harness output (gitignored; regenerate with the command above)
```
