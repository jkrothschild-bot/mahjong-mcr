# MCR Mahjong Trainer — Game Specification (v2)

## 1. Purpose

A single-player web game for learning **Chinese Official Mahjong (Mahjong Competition Rules, MCR)**. The player plays against three bots. The game's differentiators over existing online options:

1. **Readable for non-Chinese speakers** — no reliance on reading Chinese characters.
2. **Built-in learning aids** — on-demand hints explaining strategic options and which of the 81 fans (scoring patterns) are within reach.
3. **Configurable pacing** — bot speed set by the player.
4. **Clear information display** — visible discards, per-tile discard history, running/potential score.

Out of scope for v1 (planned for later): multiplayer, online accounts, leaderboards, mobile app-store distribution.

## 2. Platforms

- Runs in a modern desktop browser (Chrome, Edge, Safari, Firefox).
- Fully usable on **iPad Safari** (touch targets ≥ 44px, responsive layout for landscape iPad; portrait optional).
- No install, no backend required for v1 — a purely static site (all game logic client-side).

## 3. Rules — single source of truth

- Ruleset: **Mahjong Competition Rules (MCR)**, as published by the World Mahjong Organization and mirrored by the European Mahjong Association: the official English rulebook PDF at mahjong-europe.org (`mcr_EN.pdf`).
- All rules questions are resolved by that document. The rulebook (or extracts of it) must be checked into the repo as `docs/rules/` so agents implement from the actual text, never from memory.
- Key MCR rules the engine must implement:
  - 4 players, 144 tiles (including 8 flower/season tiles).
  - Standard draw/discard flow; claims: chow (chi), pung, kong (exposed, concealed, promoted), win (hu).
  - **8-point minimum** to declare a win (flowers don't count toward the minimum).
  - All **81 fans** with correct point values, combination rules, and the exclusion/implication principles (non-repeat, non-separation, non-identical-principle, account-once, etc. as defined in the rulebook).
  - Prevailing wind / seat wind rotation across a 16-hand match (4 rounds × 4 hands).
  - Payment rules: winner receives 8 + fan points from each non-discarder; discarder pays 8 + fan points (per official MCR settlement).
  - Dead-wall/wall-exhaustion draw rules per rulebook.

## 4. Tile design (accessibility-first)

Fixed convention, always on — **not a toggle**. Every tile permanently carries a small badge in the top-left corner, matching the style of well-designed existing clients (reference: owner-supplied screenshot of a working example):

- **Characters (万/wan) suit:** traditional face + small **Arabic numeral** (1–9), top-left.
- **Dots and Bamboo:** conventional designs (already language-neutral) + small numeral, top-left, for consistency with the other suits.
- **Winds:** traditional character + small **letter badge (E/S/W/N)**, top-left, always visible — this is the one the player relies on most and must never be hidden behind a settings toggle.
- **Dragons:** conventional Red/Green/White designs + small letter badge, top-left — following the reference image's convention of **C / F / P** (Chun/red, Faat/green, Pak/white); can read as `R/G/W` instead if that proves clearer once built.
- **Flowers/Seasons:** numbered, distinct color band, never confusable with playing tiles.
- Badges must stay legible at the smallest tile size rendered on iPad.
- The only tile-related toggle is a **style choice** (which of the 2–3 art options below), never an on/off for badges.
- Tile art: start from an existing open-license SVG tile set (e.g., the FluffyStuff riichi-mahjong-tiles set on GitHub — verify license before shipping) and overlay badges as SVG layers; or generate a custom SVG set. Present 2–3 style options to the owner before finalizing.

## 5. Game screen (single main view)

- **Player hand** (bottom): face-up, large. Drag-to-reorder AND one-tap sort buttons — **Suit, Number, Honors, Simples, Odds, Evens** (per reference image; richer than a single "auto-sort"). Sorting is purely visual — never changes engine state.
- **Discard pools:** each player's discards displayed in tidy rows in front of their position (river style), in discard order, never overlapping.
- **Melds:** exposed chows/pungs/kongs shown beside each player's position; flowers displayed separately.
- **Tile inspector:** tapping/clicking any tile (in hand or elsewhere) highlights all visible copies of that tile and shows a count: how many are in discards/melds, how many remain unseen.
- **Wall counter:** number of tiles left to draw.
- **Wind indicator:** prevailing wind, seat winds, dealer marker, hand number (e.g., "East 2 of 16").
- **Score panel** (collapsible):
  - Current match scores for all four players.
  - **Live fan tracker for the player's own hand:** which fans are already locked in, which are close (e.g., "1 tile from Mixed Straight, 8 pts"), and current total if the hand were completed now. This is the core learning surface.
- **Claim prompts:** when a discard can be claimed (chow/pung/kong/win), show clear buttons with a configurable decision timer (or no timer in relaxed mode).
- **End-of-hand screen:** winning hand laid out, every scored fan listed by official name + points, settlement math shown explicitly.

## 6. Hint system (the key feature)

Invoked by a **Hint button** (never automatic, never shown to bots). Three levels, selectable in settings:

1. **Nudge:** "Consider your discard — two of your tiles are nearly useless to the hand." (no specifics)
2. **Options:** lists 2–3 candidate discards with reasoning: tile efficiency (how many useful draws each keeps), safety (what it might feed opponents), and which fans each direction preserves.
3. **Tutor:** full analysis — shanten count (tiles-from-ready), best discard, the fan combinations realistically reachable from this hand with their point totals, and whether the hand can reach the 8-point minimum (a critical MCR-specific trap for learners).

Additional learning aids:

- **Fan encyclopedia:** built-in browsable reference of all 81 fans with example hands, searchable, linked from the hint output and the end-of-hand screen (tap a fan name → see its definition).
- **Post-hand review (v1.1+):** after each hand, optionally show the 2–3 biggest mistakes ("at turn 7, discarding 6-dot kept you 2 shanten; 9-wan was better").
- Hint engine and bot AI share the same evaluation core (shanten calculator + fan-potential estimator).

## 7. Bots

- 3 bots, playing legally and competently (tile efficiency + basic fan targeting + rudimentary defense). Strength does not need to be expert in v1.
- **Speed setting:** slider or presets — Instant / Fast (~0.5s) / Normal (~1.5s) / Relaxed (~3s) per bot action, adjustable mid-game.
- Optional "step mode": bots move only when the player taps Next (for studying).
- Bot difficulty presets (v1.1+): Beginner / Standard.

## 8. Settings

- Bot speed; hint level; claim-timer on/off and duration; sound on/off; color-blind-safe palette; tile size / zoom.
- Settings persist locally (localStorage) — no accounts.

## 9. Additional feature ideas (beyond the original ask)

Features common to the stronger mahjong clients on the market, or general trainer-app patterns, that would meaningfully raise the bar here. Flagged as ideas to prioritize deliberately, not all-or-nothing:

- **Ready-hand / waits display:** once your hand is one tile from complete, show exactly which tile(s) complete it and the resulting fan value for each — the single highest-value addition for a learner beyond what was originally scoped, since "am I even close, and to what" is the question new MCR players struggle with most.
- **Tile-count grid:** a small reference panel listing all 34 tile types with how many of each remain unseen (visible in discards/melds subtracted from 4) — turns the tile-inspector idea into an always-available overview rather than a click-one-at-a-time lookup.
- **Full match replay ("kifu") with scrubber:** record every draw/discard/claim; after a hand (or match) ends, step back through it move by move, not just a 2–3-line post-hand summary. This is the core study loop in serious mahjong clients and is worth more long-term than live hints.
- **"Ask about this position" export:** a button that turns the current hand + visible board state into a clean, structured text (or image) summary — built specifically to replace the screenshot-into-Claude/ChatGPT workaround already in use. Two versions worth considering: (a) a copy-to-clipboard structured summary for pasting into any AI chat, and (b) later, an optional built-in "ask an AI" panel that sends that same structured summary to an LLM directly, so the workaround becomes a feature.
- **Defense/danger indicator:** a subtle per-tile risk rating in hand based on what's visible (e.g., an opponent showing two pungs in one suit, a tile no one has discarded late in the hand) — teaches the defensive half of strategy, which the hint system otherwise under-serves.
- **Scenario/practice mode:** start from a specific preset hand (e.g., "two away from Mixed Triple Chow") instead of always a random deal — turns the fan encyclopedia from reference material into hands-on drills.
- **Confirm-before-discard toggle:** optional tap-to-confirm before a discard commits, to prevent misclick regret — small thing, matters a lot for a beginner still reading tiles carefully.
- **Claim call-outs:** brief animation/sound when a bot pungs, kongs, or wins off your discard, with a one-line explanation ("West ponged your 5-dot") — avoids the "wait, what just happened" confusion common in fast clients.
- **Session stats:** win rate, average points per win, deal-in rate, and which fans you actually complete most/least often over time — motivating, and shows learning progress the hint system alone can't.
- **Accessibility beyond color-blind palette:** adjustable tile/text scaling, and text labels/aria-attributes on tiles so the board is usable with screen magnification on iPad.

## 10. Non-functional requirements

- **Correctness is the top requirement.** The scoring engine must be validated against independent references (see PLAN.md §Testing): official rulebook worked examples + cross-checking against an existing open-source MCR fan calculator (e.g., PyMahjongGB) over large numbers of generated hands.
- Game engine is a **pure, UI-independent TypeScript module** (deterministic given a seeded RNG) — enables headless testing, replay, and a future server version.
- Full game state serializable: save/resume a game, replay a hand, export a hand position (useful for asking questions about a position later — see §9).
- Load time < 3s on typical broadband; works offline after first load (PWA nice-to-have, not required in v1).
- No personal data collected; no backend.

## 11. Future (explicitly deferred)

- Local multiplayer / online multiplayer (engine's purity + serializable state keeps this door open).
- Accounts, stats history, difficulty ladder, other rulesets (riichi, Hong Kong).
- App-store packaging.
