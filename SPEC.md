# MCR Mahjong Trainer — Game Specification (v5)

## 1. Purpose

A single-player web game for learning **Chinese Official Mahjong (Mahjong Competition Rules, MCR)**. The player plays against three bots. The game's differentiators over existing online options:

1. **Readable for non-Chinese speakers** — no reliance on reading Chinese characters.
2. **Built-in learning aids** — on-demand hints explaining strategic options and which of the 81 fans (scoring patterns) are within reach.
3. **Configurable pacing** — bot speed set by the player.
4. **Best-in-class clarity and feel** — the interface must be clearer than every existing option the owner has tried (§5a), and must feel like a real table with real tiles, not a flat wireframe (§5c). Both are first-class requirements, not side effects of the functional features.

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

## 4. Tile design (accessibility-first, and physically believable — see §5c)

Fixed convention, always on — **not a toggle**. Per the owner's `docs/Mockups` v6 design (adopted as baseline — see §5b/§5c; this is a refinable starting point, not a frozen final answer), suit numerals and wind/dragon letters are **printed directly into the tile face artwork** — never a separate corner badge, HTML overlay, or neighbouring label:

- **Characters (万/wan), Dots, Bamboo:** traditional face with a small Arabic numeral (1–9) baked into the art (red for Characters, blue for Dots, green for Bamboo per v6).
- **Winds:** traditional character with a small Latin letter (E/S/W/N) baked into the art — this is the one the player relies on most and must never be hidden behind a settings toggle or omitted from an art variant.
- **Dragons:** conventional Red/Green/White designs with a baked-in letter — v6 uses **C / F / P** (Chun/red, Faat/green, Pak/white); `R/G/W` remains an acceptable alternative if that reads clearer.
- **Flowers/Seasons:** numbered, distinct color band, never confusable with playing tiles. **Not yet present in the `docs/Mockups/assets` set — confirm these 8 tiles get created before M2/M3 need them (§3 requires all 144 tiles including flowers).**
- Indices must stay legible at the smallest tile size actually rendered on iPad — verify this directly on-device with the real assets rather than assuming; a baked-in index trades a little guaranteed contrast for looking like a real tile, so it's worth confirming that trade paid off.
- The only tile-related toggle is a **style choice** between finished art variants, never an on/off for whether an index shows.
- Tiles render with tactile depth — bevel/highlight, drop shadow, a felt table underneath — not flat rectangles on a flat background; see §5c. `docs/Mockups/mahjong-seated-table-prototype-v6.html` demonstrates this with real raster tile assets over a CSS-built wood-and-felt table; no WebGL, no 3D engine, no change to the stack in PLAN.md §1.
- Tile art: `docs/Mockups/assets/*.png` is the current asset set — confirm its licensing/origin (owner-generated vs. sourced) before the repo goes public, same as any adopted third-party art would need.

## 5. Game screen (single main view)

- **Player hand** (bottom): face-up, large. Drag-to-reorder AND one-tap sort buttons — **Suit, Number, Honors, Simples, Odds, Evens** (per reference image; richer than a single "auto-sort"). Sorting is purely visual — never changes engine state.
- **Discard pools:** each player's discards in a fixed grid (v6: six columns, new row after six), in discard order, **never overlapping, fanning, or cascading** — this is a hard rule, not a style preference, since messy discard rivers were one of the owner's original core complaints about existing clients.
- **Melds:** exposed chows/pungs/kongs shown beside each player's position; flowers displayed separately.
- **Wall vs. concealed bot hands:** visually distinct tile backs (v6: pale jade wall stacks, shown two-high, vs. deep midnight-blue concealed bot hands), with clear physical separation between a bot's hand and the nearest wall stack — never rendered so similarly that a player has to guess which is which.
- **Tile inspector:** tapping/clicking any tile (in hand or elsewhere) highlights all visible copies of that tile and shows a count: how many are in discards/melds, how many remain unseen. (v6 implements this as a toggle plus click-to-select — an acceptable, arguably cleaner variant of "click any tile," confirmed against this requirement in Session 5a.)
- **Wall counter:** number of tiles left to draw.
- **Wind indicator:** prevailing wind, seat winds, dealer marker, hand number (e.g., "East 2 of 16").
- **Turn indicator:** unambiguous at a glance whose turn it is — for every seat, not only the player's own turn. A glow or highlight demonstrated only for the player's turn is not sufficient proof this requirement is met; confirm the bot-turn case renders with equal clarity (see §5a, item 1, and the open gap noted in §5b).
- **Score panel** (collapsible):
  - Current match scores for all four players.
  - **Live fan tracker for the player's own hand:** which fans are already locked in, which are close (e.g., "1 tile from Mixed Straight, 8 pts"), and current total if the hand were completed now. This is the core learning surface.
- **Claim prompts:** when a discard can be claimed (chow/pung/kong/win), show clear buttons with a configurable decision timer (or no timer in relaxed mode).
- **End-of-hand screen:** winning hand laid out, every scored fan listed by official name + points, settlement math shown explicitly.

### 5a. UI acceptance checklist (information clarity — must satisfy before it's "done")

This is the concrete, testable standard behind "clearer than anything on the market" — the `ux-reviewer` agent (PLAN.md §3) checks new UI against this list directly, and it's the bar the owner judges any layout mockup against before real engine-wiring work starts (see PLAN.md's revised M3). A player who has never seen the game before should be able to answer every one of these **within about two seconds of looking at the screen**, with no clicking required:

1. Whose turn is it right now?
2. What is the prevailing wind, and what is my seat wind?
3. How many tiles are left in the wall?
4. What's currently in my hand?
5. What have I discarded so far, and what have my opponents discarded?
6. What melds (if any) has each player exposed?
7. What is the current match score for all four players?

And within one click:

8. How many of a given tile are still unseen (tile inspector)?
9. What are my live options if I ask for a hint?

A design that requires hunting, hovering, or opening a menu to answer 1–7 does not meet the bar, no matter how visually polished it is otherwise.

### 5b. Reference material and mockup history

- The owner's own screenshots of mahjong clients already tried (the good and the bad) are treated as primary design input, not just inspiration — specific elements from them get evaluated against §5a/§5c and either adopted or explicitly rejected with a reason, rather than the spec re-describing "a good UI" in the abstract. Keep these in `docs/design/references/` with a short note per image on what's specifically good or bad.
- **Current baseline (v6):** `docs/Mockups/mahjong-seated-table-prototype-v6.html` + `docs/Mockups/mahjong-visual-design-spec-v6.md` + `docs/Mockups/assets/*.png`, owner-authored. This is a refinable working baseline for Session 5a, not a finished, untouchable artifact — every functional requirement in §5/§5a still applies regardless of what v6 already happens to show. Earlier internal mockups (`ui-mockup.html` v1/v2, and `docs/Mockups/Archive/` v3–v5) remain as history/reference but are superseded by v6 for the tactile table/tile rendering approach.
- **Open gaps to resolve in Session 5a, not silently drop:**
  1. ~~Sort toolbar (Suit/Number/Honors/Simples/Odds/Evens) — present in the owner's reference screenshot and required by §5, not shown in v6; confirm it gets added.~~
     **Closed by owner decision — reduced to a single "Sort" button that always sorts by suit.** Shipped as 6 buttons, then a `<select>`, then this. Rationale: suit is the sort actually used in play, and a picker makes a one-step job into two steps. This *supersedes* the six-mode requirement in §5 and PLAN.md M3 — those still describe the reference screenshot's toolbar and should be read against this line. The other five comparators remain implemented and tested in `handOrder.ts`, so restoring a multi-mode control is a UI-only change with no logic to rewrite.
  2. Turn indicator for bot seats, not just the player's own turn (see §5 above).
  3. Touch-target size after v6's CSS-transform scale-down — verify ≥44px on a real iPad, not just assumed from the desktop layout.
  4. Tile art asset licensing/origin for `docs/Mockups/assets` (§4).
  5. Missing flower/season tile assets (§4).
  6. **Side seat label vs. side seat tiles at worst-case occupancy.** Every
     seat's identity band (wind letter, dealer/turn badge, match score) sits
     centred on that seat's own wood rail. On the left/right rails this
     collides with that seat's own tiles once the 3rd column opens — 19+
     tiles, i.e. 4 kongs or heavy flowers. The label is drawn on top with an
     opaque backdrop so it stays legible, but it covers a tile back when it
     happens. Not fixable within the current side-column geometry: reserving
     a 14px rail strip drops the column from 156px to 142px and shrinks bot
     tiles from 49px to ~44px (undoing `SEAT_LINE_PX`'s deliberate ≥10%
     legibility bump), and widening the column to 170px starves the
     discard field's worst-case zone (352px → 345px, against 351px needed).
     Pinned by `stageLayout.test.ts`'s `side rail label vs. side seat tiles`
     so a change that makes it reachable at a *common* tile count fails
     loudly. Real fix would need the side column and the discard field
     re-budgeted together.

### 5c. Visual fidelity bar ("feels like a real table," not just "shows the right information")

Clarity (§5a) and physical believability are tracked as two separate, both-required bars. A screen can pass §5a and still fail here if it reads as a flat wireframe rather than a real game. Concretely:

- Tiles read as physical objects with thickness and light on them — bevel/highlight on the face, a shadow that grounds them on the table — not flat colored rectangles.
- The table itself has a felt surface and a bordering wood rail, not a flat solid-color background.
- Picking up / selecting a hand tile has a tactile lift response (the tile visibly rises toward the player), not just a color change.
- **v6 already clears this bar** — real tile-face assets over a layered CSS wood-and-felt table, no WebGL, no 3D engine, no change to the React/Vite stack in PLAN.md §1 — and is judged against the owner's own reference screenshots (§5b) as the quality floor it needs to match or beat, not an abstract "looks nice."
- Consequence for sequencing: because this is a look-and-feel concern that affects the whole board at once, it was resolved together with the layout, not deferred to a later "tile art" pass. Session 6 narrows to finishing/choosing face-art details (missing flower tiles, any style refinement) now that the tactile rendering approach is already settled.

## 6. Hint system / Strategy Coach (the key feature)

**On-demand only, hidden by default** — the coach panel does not appear until the player taps Hint, and is never shown for bots. This was an explicit decision: an always-visible co-pilot (as v6's mockup shows it by default) risks becoming a crutch the player never weans off; gating it behind a deliberate action forces the player to commit to a read of the hand first.

Content is organized as v6's tabbed panel (Best move / Hand plan / Tile safety), which maps onto the original three depth levels rather than replacing them:

- **Best move tab ≈ Nudge + Options:** the recommended discard with a one-line reason is the shallow read; the numbered "why this is the strongest move" reasoning and "other reasonable choices" below it are the deeper options-level detail, both available as soon as the tab is open — no extra click needed to go from nudge to reasoning once the player has chosen to ask.
- **Hand plan tab ≈ Tutor:** current hand shape, primary route, shanten-equivalent structure, and what would change the plan — full analysis, including whether the hand can reach the 8-point minimum (a critical MCR-specific trap for learners).
- **Tile safety tab:** visible-copy evidence and defensive reasoning for the selected tile (reuses the tile-inspector counts from §5, and doubles as the defense/danger indicator from §9).

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
- **"Ask about this position" export:** a button that turns the current hand + visible board state into a clean, structured text (or image) summary — built specifically to replace the screenshot-into-Claude/ChatGPT workaround already in use. Kept as a copy/export-only feature (no live in-app API call) — see PLAN.md's cost discussion.
- **Defense/danger indicator:** a subtle per-tile risk rating in hand based on what's visible (e.g., an opponent showing two pungs in one suit, a tile no one has discarded late in the hand) — teaches the defensive half of strategy, which the hint system otherwise under-serves.
- **Scenario/practice mode:** start from a specific preset hand (e.g., "two away from Mixed Triple Chow") instead of always a random deal — turns the fan encyclopedia from reference material into hands-on drills.
- **Confirm-before-discard toggle:** optional tap-to-confirm before a discard commits, to prevent misclick regret — small thing, matters a lot for a beginner still reading tiles carefully.
- **Claim call-outs:** brief animation/sound when a bot pungs, kongs, or wins off your discard, with a one-line explanation ("West ponged your 5-dot") — avoids the "wait, what just happened" confusion common in fast clients.
- **Session stats:** win rate, average points per win, deal-in rate, and which fans you actually complete most/least often over time — motivating, and shows learning progress the hint system alone can't.
- **Accessibility beyond color-blind palette:** adjustable tile/text scaling, and text labels/aria-attributes on tiles so the board is usable with screen magnification on iPad.

## 10. Non-functional requirements

- **Correctness is the top requirement.** The scoring engine must be validated against independent references (see PLAN.md §Testing): official rulebook worked examples + cross-checking against an existing open-source MCR fan calculator (e.g., PyMahjongGB) over large numbers of generated hands.
- Game engine is a **pure, UI-independent TypeScript module** (deterministic given a seeded RNG) — enables headless testing, replay, and a future server version. Visual polish (§5c) lives entirely in packages/ui and never leaks into the engine.
- Full game state serializable: save/resume a game, replay a hand, export a hand position (useful for asking questions about a position later — see §9).
- Load time < 3s on typical broadband; works offline after first load (PWA nice-to-have, not required in v1).
- No personal data collected; no backend.

## 11. Future (explicitly deferred)

- Local multiplayer / online multiplayer (engine's purity + serializable state keeps this door open).
- Accounts, stats history, difficulty ladder, other rulesets (riichi, Hong Kong).
- App-store packaging.

## 12. Movements
Hand ordering: The order of tiles in a player's hand is user-controlled. Players can rearrange their own tiles at any time (drag-and-drop or tap-to-swap). The game must never auto-sort a hand without the player's action; a "sort hand" button may be offered as an explicit action. Hand order is local presentation state only — it does not affect game logic and is not visible to other players.

Tile transitions (deferred, architecture required now): Visual animations for tile movement (wall → hand on draw, hand → discard, claimed tile → meld) are a post-MVP feature. However, the rendering layer must represent tiles as persistent objects with positions, so transitions between zones can be animated later without rework.