# Claude Code Kickoff Pack (v5, aligned to SPEC.md v5 / PLAN.md v2)

How to start the project in VS Code with Claude Code. Do these in order.

## Step 0 — One-time setup (you, ~15 min)

1. Install Node.js (LTS), Git, and GitHub CLI (`gh`); run `gh auth login`.
2. Create an empty folder `mahjong-mcr`, open it in VS Code, open the Claude Code panel/terminal.
3. Copy `SPEC.md` and `PLAN.md` into the folder, plus the `CLAUDE.md` below.
4. Download the official MCR rulebook (mahjong-europe.org → MCR → `mcr_EN.pdf`) into `docs/rules/`.
5. Create `docs/design/references/` and add 2–4 screenshots of other mahjong clients you've used, each with a short text note on what's specifically good or bad about it. (Your own `docs/Mockups/` — the v6 seated-table prototype, its design spec, and tile assets — is already in the repo and is now the working baseline; nothing further to copy there.)

## CLAUDE.md (paste into repo root)

```markdown
# MCR Mahjong Trainer

Single-player web game for learning Chinese Official Mahjong (MCR rules),
playable in browser and on iPad Safari. Built per SPEC.md and PLAN.md — read
both before any work.

## Non-negotiable rules
- Rules ground truth is docs/rules/mcr_EN.pdf ONLY. Never implement a scoring
  rule from memory; cite the rulebook section in code comments for every fan.
- Tile badges (numerals on suits, letters E/S/W/N on winds, C/F/P on dragons)
  are PERMANENT and always on. Never implement them as a settings toggle.
- Any new or changed UI must be checked against SPEC.md §5a (information
  clarity) AND §5c (tactile/physical feel) before it's considered done — these
  are two separate bars, not one. Visually polished but hard to read fails 5a;
  clear but flat-looking fails 5c.
- packages/engine must stay pure TypeScript: no React/DOM imports, seeded RNG,
  fully serializable state (this also enables replay in M6 — don't shortcut it).
- Scoring changes are not done until validated: rulebook fixtures pass AND the
  PyMahjongGB cross-check in validation/ passes.
- Run typecheck + full test suite before every commit. Never commit red.
- Every scoring bug found becomes a permanent test fixture before it is fixed.
- Record any rulebook-ambiguity ruling in docs/rules/decisions.md.

## Conventions
- TypeScript strict; Vitest for tests; small commits with clear messages.
- UI: React + Vite + Tailwind; SVG tiles; touch targets ≥ 44px (iPad).
- Current milestone lives in PLAN.md §2 — work only on the current milestone.
```

## First prompts to feed Claude Code (one session each)

**Session 1 — scaffold (M0):**
> Read SPEC.md, PLAN.md, and CLAUDE.md. Enter plan mode and propose the M0 scaffold: monorepo layout per PLAN.md §1, Vite+React+TS+Tailwind app showing a placeholder board, Vitest wired up, GitHub Actions CI (typecheck + test), and deployment to GitHub Pages. After I approve: implement, create the GitHub repo with gh, push, and give me the live Pages URL to open on my iPad.

**Session 2 — subagents:**
> Create three subagents in .claude/agents/ per PLAN.md §3: (1) scoring-validator — verification only, runs the validation harness and rulebook checks, never edits engine source; (2) rules-lawyer — answers rules questions strictly by citing docs/rules/, never from memory; (3) ux-reviewer — Playwright screenshots at desktop and iPad viewports, critiques against SPEC.md §5a (information clarity) and §5c (tactile feel) as two separate checks, confirms discard rivers never overlap/fan, confirms wall vs. bot-hand backs stay visually distinct, confirms measured touch-target sizes on the iPad viewport, and explicitly flags if any tile index is ever hidden or toggleable.

**Session 3 — engine core (M1):**
> Plan mode first: design packages/engine per SPEC.md §3/§10 — tile model, wall with flowers, deal, draw/discard, chow/pung/kong claims with correct priority, structural win detection, seeded RNG, serializable GameState. No scoring yet. Include property tests for the invariants in PLAN.md §4.3. Keep GameState logging (draws/discards/claims) complete enough to support full replay later — don't design yourself into a corner on this.

**Session 4 — scoring (M2, the big one):**
> Plan mode first: design the fan calculator for all 81 MCR fans from docs/rules/mcr_EN.pdf, including combination and exclusion principles and settlement. Before implementing, build the validation/ harness: (a) test fixtures from every worked example in the rulebook, (b) a Python cross-check against PyMahjongGB over generated hands, wired into CI. Implement fans in rulebook order, small batches, validating each batch. Use rules-lawyer for any ambiguity and log rulings in docs/rules/decisions.md.

**Session 5a — confirm and close the gaps on the v6 baseline, no engine wiring (M3, part one):**
> Do not implement against packages/engine yet. Read SPEC.md §5, §5a, §5b, and §5c. `docs/Mockups/mahjong-seated-table-prototype-v6.html` (with `mahjong-visual-design-spec-v6.md` and the assets alongside it) is the adopted baseline — treat it as a strong, refinable starting point, not a finished artifact to leave untouched. Also review docs/design/references/ (my screenshots of other mahjong clients with notes on what's good/bad about each) and the earlier internal mockups in docs/Mockups/Archive/ for context on what changed and why. Produce an updated variant, still static/dummy-data, that: (1) adds the sort toolbar (Suit/Number/Honors/Simples/Odds/Evens) from my reference screenshot, which v6 doesn't currently have; (2) adds an equally clear turn indicator for bot seats, not just the player's; (3) changes the Strategy Coach to hidden-by-default, revealed only by a Hint button — see SPEC.md §6 for how the existing tabs map onto that; (4) confirms tile-count grid and confirm-before-discard toggle are present per §5; (5) flags whether touch targets stay ≥44px after the CSS scale-down on an iPad-sized viewport. Confirm the result against every item in §5a and §5c explicitly. Do not proceed to Session 5b until I've approved the result.

**Session 5b — wire the confirmed layout to the engine (M3, part two):**
> Plan mode first: implement packages/ui for real, using the Session 5a output as the reference, now wired to packages/engine's actual GameState instead of dummy data. Preserve the tactile rendering approach exactly — this is not the point where it gets simplified back to flat placeholders. Keep every element from SPEC.md §5a/§5c working with live data: turn indicator (all seats), wind/wall indicators, hand + discards + melds, tile inspector, sort toolbar, claim buttons with call-out animation/sound, confirm-before-discard toggle, tile-count grid, end-of-hand score screen, and the on-demand Strategy Coach.

**Session 6 — finish tile face art (during/after M3):**
> The tactile rendering and face-art style are already settled (v6). This session is narrow: confirm the licensing/origin of docs/Mockups/assets/*.png, generate the missing 8 flower/season tiles in the same style, and verify index (numeral/letter) legibility at true rendered size on an iPad. Only produce alternative face-art styles if I ask for them — the base look is not up for redesign here.

**Session 7 — shanten, bots & waits (M4):**
> Plan mode first: implement the shanten calculator and tile-efficiency evaluator, 3 bots that use it, step mode, and the ready-hand/waits display (SPEC.md §9) — show the exact tiles that complete the hand and each one's fan value once the player is tenpai. Add the property test confirming displayed waits always match a structurally valid completion per the M2 scoring engine.

**Session 8 — hints, fan tracker & defense (M5):**
> Plan mode first: implement the 3-level hint system and live fan tracker (SPEC.md §6), the fan encyclopedia, and a basic defense/danger indicator per tile (SPEC.md §9) reusing the M4 evaluator. Expect to iterate on wording/usefulness after I play it — note issues in docs/playtest-notes.md rather than trying to perfect this in one pass.

**Session 9 — replay, practice mode & export (M6):**
> Plan mode first: implement full match replay with a scrubber built on the serializable GameState from M1, a practice mode that loads a preset hand instead of a random deal, the "ask about this position" structured export (SPEC.md §9), and basic session stats. Confirm with me which of these I actually want before building all of them — PLAN.md §6 flags this milestone as scope to decide feature-by-feature, not commit to wholesale.

## Your recurring loop (what YOU do each session)

1. Open the session with: "Read CLAUDE.md. Continue milestone N."
2. Review the plan it proposes; approve or adjust.
3. When it finishes: play the game, note anything confusing or wrong in `docs/playtest-notes.md`, and feed that file into the next session.
4. Periodically: "Run the scoring-validator agent and show me the report."
5. For any UI change: hold it against SPEC.md §5a (clarity) and §5c (feel) yourself before accepting it — two separate two-second tests, not one.
