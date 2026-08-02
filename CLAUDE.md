# MCR Mahjong Trainer

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
  PyMahjongGB cross-check in validation/ passes.
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

