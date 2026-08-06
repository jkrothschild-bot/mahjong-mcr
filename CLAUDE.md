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
  (docs/rules/decisions.md #33, superseding #19/#31/#32: 1200 hands, seed
  20260805, 80/81 fans covered). **Current tally, read as HAND counts, not
  distinct-cause counts: their_bug 110, ambiguity 194, our_bug 0,
  unclassified 23.** `our_bug` is genuinely 0 — every distinct engine bug
  found in the 2026-08-06 Step 4/5 triage (`detectTileHog` undercounting,
  `[21,76]`/`[31,76]` and `[18,55]` missing exclusions,
  `detectFullyConcealedHand`/`detectConcealedHand`/`detectTwoConcealedPungs`
  mishandling concealed kongs, `detectAllTypes` never checking Seven Pairs)
  is fixed, each its own commit, each re-verified against `mcr_EN.pdf`
  before fixing — decisions.md #33 for the full list. Of the 23
  `unclassified` hands, ~14 are believed to be benign equal-scoring
  decomposition ties (two valid decompositions score the same total, no
  rulebook tiebreak exists, neither side is wrong) but this should be
  reconfirmed against the current run, not assumed from an earlier
  snapshot — see decisions.md #33's own note and KICKOFF-validation-
  harness.md's open-items list.
  **A more severe class of defect was found and fixed on 2026-08-06
  (decisions.md #32): item #23, an already-SHIPPED commit, turned out to
  directly contradict `mcr_EN.pdf`'s own primary fan table** — it had
  "fixed" the engine to match PyMahjongGB's behavior with no independent
  rulebook citation, and was reverted once a direct table re-read caught it.
  **The general lesson matters more than this one instance: an engine
  change justified only by matching PyMahjongGB, with no independent
  citation, becomes invisible to this cross-check FOREVER once it ships** —
  both engines then agree, so no future run, however large, can ever flag
  it again; only a human re-reading the primary source catches it. An audit
  of every other exclusion/detector change in items #19-#31 found exactly
  one instance (item #23 itself) — but auditing once by hand doesn't
  prevent a repeat, so **a citation guard now exists and is load-bearing**:
  `packages/engine/src/scoring/exclusion-citations.ts` grandfathers every
  exclusion pair that existed before the guard, and requires a real,
  non-empty rulebook citation (not a bare PyMahjongGB source reference) for
  any pair added or changed after — `exclusions.test.ts`'s guard test fails
  otherwise. When touching `exclusions.ts`, add the citation to that file,
  not just a code comment. Don't cite "PyMahjongGB cross-check passes" for
  the WHOLE engine without qualification — it means clean *for the fans
  your change touches*, checked against the current baseline in
  decisions.md #33, not zero mismatches system-wide (some are expected
  forever: PyMahjongGB's own house-rule extensions, and one still-
  provisional rulebook ambiguity, #11). Stage 2 (CI integration, gating
  every push) is separate follow-up work, not started.
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

