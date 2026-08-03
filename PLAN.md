# MCR Mahjong Mentor — Project Plan (v2, aligned to SPEC.md v2)

## 1. Technology choices (and why)

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** (strict mode) | Type safety matters enormously for a rules engine; best AI-coding-tool support of any language |
| UI | **React + Vite** | Turn-based game = ordinary web app; no game engine (Unity/Phaser) needed or wanted |
| Tile rendering | **SVG components** | Crisp at any size, easy to layer fixed badges (numerals/letters) over base art, trivially themeable |
| Styling | Tailwind CSS | Fast iteration, good responsive/touch defaults |
| Engine | Pure TS package (`packages/engine`), zero UI imports, seeded RNG | Headless testing, replays, future server reuse |
| Tests | **Vitest** (unit + property tests) + Playwright (a few UI smoke tests) | Vitest for engine correctness; Playwright to catch broken interactions incl. iPad viewport |
| Scoring validation | Python harness calling **PyMahjongGB** in CI | Independent cross-check of the fan calculator (see §4) |
| Hosting | **GitHub Pages** (v1) | Free, static, HTTPS, fine for iPad Safari; zero backend to maintain |

Repo layout:

```
mahjong-mcr/
  CLAUDE.md
  SPEC.md
  docs/rules/            # official MCR rulebook + extracted fan list + decisions.md
  docs/playtest-notes.md # your running feedback file
  packages/engine/        # tiles, wall, hands, melds, legality, scoring, shanten, waits, bots, hints
  packages/ui/            # React app
  validation/             # Python cross-check harness vs PyMahjongGB
  .github/workflows/      # CI: typecheck, tests, cross-validation, deploy to Pages
```

## 2. Milestones (each ends with something you can run)

**M0 — Scaffold (days):** repo, Vite+TS+React, CI, deployed "hello board" on GitHub Pages. Proves the whole pipeline early.

**M1 — Engine core (week 1–2):** tile/wall/hand model, legal draw–discard–claim flow, win detection (structural), seeded RNG, serializable game state. Headless: playable via tests only.

**M2 — Scoring engine (week 2–4):** all 81 fans + combination/exclusion rules + settlement. Built rulebook-first, validated per §4. *Highest-risk milestone; do not stack other work on it.*

**M3 — Playable UI (week 3–5, overlaps M2):** board layout, hand sorting (drag-to-reorder plus a **single "Sort" button that sorts by suit** — this replaces the six-mode toolbar (Suit/Number/Honors/Simples/Odds/Evens) originally planned from the reference screenshot; suit is the sort actually used in play, and a picker made a one-step job into two. The other five comparators stay implemented and tested in `handOrder.ts`, so restoring a multi-mode control is a UI-only change. See SPEC.md §5b for the recorded decision), discard rivers, claim buttons with call-out animations/sound ("West ponged your 5-dot"), bot speed control, tile inspector, tile-count grid (all 34 types, unseen counts), confirm-before-discard toggle, end-of-hand score screen. First version you can actually play.

**M4 — Shanten, bots & waits (week 5–6) — complete:** shanten calculator, tile-efficiency evaluator, 3 competent bots, step mode, and the **ready-hand/waits display** (once one tile from complete, show exactly what completes it and the resulting fan value) — this reuses the shanten engine directly, so it belongs in the same milestone rather than being bolted on later.

**M5 — Hints, fan tracker & defense (week 6–8) — complete:** 3-level hint system, live fan tracker panel, fan encyclopedia, and a basic **defense/danger indicator** per tile (reuses the M4 evaluator plus visible-tile counts from M3). Also closed a real gap found during this milestone: `moves.ts` now enforces the §3.9.1.1 8-point minimum to declare Hu, which nothing previously checked.

**M6 — Replay, practice mode & export (week 8–10) — complete:** full match replay ("kifu") with a scrubber built on M1's serializable state; scenario/practice mode (7 curated preset hands instead of a random deal) — *shipped, then removed in a later UI-simplification pass; the engine-side preset builder is retained for hint fixtures, see SPEC.md §9* —; the **"ask about this position" export** (plain-text summary with copy-to-clipboard — the built-in replacement for pasting screenshots into an AI chat); session stats (win rate, deal-in rate, avg points per win, top fans completed). Also closed two real layout gaps found during this milestone: Tailwind's `grid-rows-3` was forcing all three board rows to equal height (fixed via `grid-rows-[auto_auto_auto]`), and `ClaimPrompt` was rendering in normal document flow instead of as a fixed overlay like every other modal — both could push the board past the iPad viewport during extended real play, which SPEC.md §5a's no-scroll rule forbids.

**M7 — Polish (ongoing):** finalize tile art choice, iPad touch tuning, accessibility scaling (tile/text size, screen-magnification labels), color-blind palette, save/resume.

Elapsed estimate with Claude Code doing the implementation and you testing/directing: **8–10 part-time weeks** to end of M6 (this grew from the original 6–8 week estimate once the §9 feature list was added — see the note in §6 on scope). M0–M5 is already a complete, genuinely useful trainer; M6 is a deliberate second phase, not required before you can start learning on it.

## 3. Using Claude Code agents

Practical advice: **don't build an elaborate multi-agent org on day one.** The default Claude Code loop (plan mode → implement → test) covers most work. Where subagents genuinely earn their keep here:

1. **`scoring-validator` (tester agent) — the important one.** A subagent whose only job is adversarial verification of the scoring engine: run the PyMahjongGB cross-check, re-derive disputed hands from `docs/rules/`, and report mismatches. Crucially, it *verifies* and never edits engine code — separation between implementer and checker is what protects you from self-grading (same-model-writes-code-and-tests risk).
2. **`rules-lawyer`** — answers "what does the rulebook say about X?" strictly by citing `docs/rules/`, never from memory. Consult before implementing any ambiguous fan.
3. **`ux-reviewer`** — takes Playwright screenshots at desktop + iPad viewport sizes and critiques readability/touch targets against SPEC §4–5, and specifically checks that badges (numerals/letters) are never hidden by a toggle.

Define these as three files in `.claude/agents/` (Claude Code can write them for you — see KICKOFF.md). Skip a separate "core logic agent" — that's just your main session.

Workflow habits that matter more than agent count:

- Start every feature in **plan mode** (Shift+Tab); approve the plan before code is written.
- Keep `CLAUDE.md` updated with decisions made, so every new session starts with context.
- One milestone per session/branch; commit small and often; make Claude run the test suite before every commit.
- When a scoring bug is found, first add the failing hand as a permanent test fixture, then fix.

Model usage (per earlier discussion): Fable 5 for the up-front architecture/plan review of M1–M2; Opus 5 as the daily driver; Sonnet 5 for routine UI work.

## 4. Testing & validation strategy (the anti-hallucination core)

1. **Rulebook fixtures:** every worked example and every fan definition in the official MCR rulebook becomes a test case, hand-entered from the PDF in `docs/rules/` (ground truth Claude didn't write).
2. **Cross-validation:** CI generates thousands of random completed hands and compares your engine's fan/score output against **PyMahjongGB** (Peking University AI Lab's fan calculator). Any mismatch fails the build and gets triaged: your bug, their bug, or genuine rulebook ambiguity (then `rules-lawyer` + rulebook decide).
3. **Property tests:** invariants that must always hold — 144 tiles conserved; winning hands are exactly 14 tiles in valid sets; total score ≥ 8; exclusion rules never double-count; game always terminates; **waits shown to the player always match a structural completion the scoring engine agrees is valid**; **replaying a recorded game with the same seed reproduces the exact same hand**.
4. **Full-game simulations:** bots play thousands of complete games headless; assert no crashes, no illegal moves, sane score distributions.
5. **Your play-testing:** you judge UX and hint usefulness — the one thing that can't be automated. Keep a running notes file (`docs/playtest-notes.md`); feed it back per session.

## 5. GitHub & deployment

1. **Repo:** create `mahjong-mcr` on GitHub (private while learning; flip to public later if you want). Claude Code handles `git init`, commits, and `gh repo create` — you just need GitHub CLI (`gh`) installed and logged in.
2. **CI (GitHub Actions):** on every push — typecheck, Vitest, cross-validation harness. On push to `main` — build and deploy.
3. **Hosting v1: GitHub Pages.** Free, HTTPS, static. Your game will live at `https://<username>.github.io/mahjong-mcr/`, reachable from any browser including iPad. Setup is one workflow file + enabling Pages in repo settings (Claude Code does both).
4. **Later options:** Cloudflare Pages or Vercel (free tiers, custom domain, painless) if you outgrow Pages; a small server (e.g., Fly.io + WebSockets) only when multiplayer happens.
5. **Licensing note:** before making the repo public, verify the license of whatever tile art you adopt and attribute properly; the rulebook PDF is WMO/EMA material — link to it rather than redistributing if its terms are unclear.

## 6. Risks (honest list)

- **Scoring exclusion rules** are the subtlest part of MCR; even reference implementations disagree on edge cases. Mitigation: §4, plus decide edge cases by rulebook text and record each ruling in `docs/rules/decisions.md`.
- **Hint and defense-indicator quality** are judgment features; expect several iterations before they feel genuinely instructive rather than robotic or noisy.
- **Scope growth:** SPEC.md §9 added six-plus features (waits display, tile-count grid, replay, defense indicator, practice mode, AI export, stats) beyond the original ask, which is why the estimate moved from 6–8 to 8–10 weeks. Recommendation: treat M0–M5 as the real target for "a genuinely better trainer than what's out there," play it, and decide M6 feature-by-feature from there rather than committing to all of it up front.
- **The multiplayer/public itch.** The engine design (§1) keeps that door open; resist opening it before M6.
