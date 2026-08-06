# MCR Mahjong Mentor

Single-player web game for learning Chinese Official Mahjong (MCR rules),
playable in browser and on iPad Safari. Built per SPEC.md and PLAN.md — read
both before any work.

## Non-negotiable rules
- Rules ground truth is docs/rules/mcr_EN.pdf ONLY. Never implement a scoring
  rule from memory; cite the rulebook section in code comments for every fan.
- Suit numerals and wind/dragon letters are baked directly into tile face
  artwork (per docs/Mockups/mahjong-visual-design-spec-v6.md), never a
  separate corner badge or HTML overlay, and never toggleable off.
- Discard rivers are a fixed grid (six columns, new row after six) — tiles
  never overlap, fan, or cascade. This is a hard rule, not a style choice.
- Wall stacks and concealed bot hands use visually distinct tile backs with
  clear physical separation — never similar enough to require guessing.
- The Strategy Coach (hint system) is hidden by default and only appears when
  the player taps Hint — never automatic, never shown for bots. See SPEC.md
  §6 for how its tabs (Best move / Hand plan / Tile safety) map onto the
  original nudge/options/tutor depth levels.
- Any new or changed UI must be checked against SPEC.md §5a (information
  clarity) AND §5c (tactile/physical feel) before it's considered done — these
  are two separate bars. Visually polished but hard to read fails 5a; clear
  but flat-looking fails 5c.
- docs/Mockups/mahjong-seated-table-prototype-v6.html is the current UI
  baseline. Treat it as a refinable starting point, not a frozen artifact —
  known open gaps (sort toolbar, bot-turn indicator, on-demand coach, missing
  flower tiles, touch-target verification, asset licensing) are tracked in
  SPEC.md §5b and must be resolved in Session 5a, not silently dropped.
- packages/engine must stay pure TypeScript: no React/DOM imports, seeded RNG,
  fully serializable state (this also enables replay in M6 — don't shortcut it).
- Scoring changes are not done until validated: rulebook fixtures pass AND the
  PyMahjongGB cross-check in validation/ has been rerun for the fan(s) touched,
  introducing no NEW `our_bug`/UNCLASSIFIED mismatches (see
  validation/README.md for the exact command; validation/allowlist.py's module
  docstring for what `their_bug`/`ambiguity`/`our_bug`/UNCLASSIFIED mean). The
  harness exists and has been run for real, most recently 2026-08-06
  (docs/rules/decisions.md #31, superseding #19: 1200 hands, seed 20260805,
  80/81 fans covered) — this rule is satisfiable now, but not fully clean:
  that run found **9 confirmed engine bugs total**, not 7 — the 6 exclusion/
  detector bugs from the original #19 run (all fixed, Step 3), the
  `decomposeHand`-has-no-"knitted"-set gap (also fixed, item #20), PLUS
  **3 more found in the Step 4/5 pass (decisions.md #30)**: `detectTileHog`
  still undercounts multi-type hogs (item #27, unfixed), All Even Pungs/All
  Fives are missing their `[21,76]`/`[31,76]` No-Honors exclusions (unfixed),
  and — the highest-priority one — **a REGRESSION in an already-shipped
  commit**: item #23's `[4,56]`/`[6,56]`/`[7,56]`/`[12,56]`/`[19,56]`
  exclusions directly contradict `mcr_EN.pdf`'s own primary fan table
  ("Fully Concealed may be combined if Self-Drawn" is stated explicitly for
  all five) and must be reverted. Two further NEW bugs (not counted in the
  "9" above since they weren't in the original 6/7-bug framing at all) were
  also found and fixtured in the same pass: `detectFullyConcealedHand`/
  `detectConcealedHand` wrongly reject a concealed kong, and
  `detectTwoConcealedPungs` wrongly excludes kongs from its count, and
  `detectAllTypes` never checks the Seven Pairs shape (this last one alone
  explained 20 of the ~55 unclassified hands). Every one of these has a
  permanent failing-by-design fixture already committed — see
  decisions.md #30 for the full list and #31's "Open follow-up work" for
  what's next. **29 hands remain genuinely unclassified** (down from ~180
  after item #20's classifier fix, then 55 after item #29's Step-3 tally) —
  of those, ~14 are benign equal-scoring decomposition ties (not a bug on
  either side) and 6 trace to a bug in the validation harness itself
  (`validation/src/win-circumstance.ts`, not `packages/engine`), leaving
  ~9 genuinely still open. Don't cite "PyMahjongGB cross-check passes" for
  the WHOLE engine without qualification — it means clean *for the fans your
  change touches*, checked against the current baseline in decisions.md #31,
  not zero mismatches system-wide (some are expected forever: PyMahjongGB's
  own house-rule extensions, and one still-provisional rulebook ambiguity,
  #11 — which item #30(c) found may also be masking an additional, distinct,
  as-yet-unquantified our_bug). Stage 2 (CI integration, gating every push)
  is separate follow-up work, not started.
- Run typecheck + full test suite before every commit. Never commit red.
- Every scoring bug found becomes a permanent test fixture before it is fixed.
- Record any rulebook-ambiguity ruling in docs/rules/decisions.md.
- Overflow is additive, never rescaling: a region past its soft occupancy
  limit keeps its fixed tile size and extends along its long axis into
  adjacent neutral space. It never shrinks retroactively, and layout never
  reflows mid-hand. This is the general form of a shrink-during-play bug
  already removed twice from this project — it applies to every region,
  regardless of which layout/topology work is in progress when you read this.

## Conventions
- TypeScript strict; Vitest for tests; small commits with clear messages.
- UI: React + Vite + Tailwind; SVG/raster tile assets; touch targets ≥ 44px (iPad).
- Current milestone lives in PLAN.md §2 — work only on the current milestone.

## Movements

Tile order in hand is player-controlled state stored in the client; never auto-sort in game logic.
Every tile has a stable unique ID that persists from wall to hand to discard/meld. Never destroy and recreate tile objects when they change zones — move the same object between zone collections.
UI renders tiles by ID and zone. Do not hard-code layouts that teleport tiles between states; keep zone-to-zone movement in one place so animation can be added later.

That stable-ID rule is the single most important line — it's what makes the animation trivially addable later, and it's exactly the kind of thing an agent will skip if you don't state it.

