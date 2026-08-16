# Open work — roll-up index

**Purpose:** one place to see everything deferred, across every area. Created 2026-08-07
after open UI/layout items were found stranded in dated `KICKOFF-phase*.md` files that
nothing pointed at any more.

## How this file works — read before editing

- **This is an index, not a backlog.** Where a live tracking section already exists, this
  file *links to it* and never restates its content. Copying an item here creates a second
  copy that will drift from the first. The rules/scoring backlog in
  `docs/rules/decisions.md § Open follow-up work` remains the authority for its own domain.
- **Section A is the exception** — those items have no other home, so they live here in
  full. If a §A item ever gets a proper home, replace it with a link.
- **Closing an item:** strike it through with `~~...~~` and a one-line reason plus date,
  matching the convention already used in `decisions.md § Open follow-up work`. Do not
  delete — the record of *why* something closed is worth more than the tidiness.
- **Adding an item:** if it belongs to rules/scoring, add it to `decisions.md` and link
  it here only if it needs cross-area visibility. Otherwise add to §A.

---

## The map — where each kind of open work is tracked

| Area | Authority | Status |
|---|---|---|
| Rules & scoring | `docs/rules/decisions.md § Open follow-up work` | Live, well maintained |
| Validation harness | `KICKOFF-validation-harness.md § What's actually still open` | Live, 5 items |
| Strategy Coach (Phase 10) | `KICKOFF-phase10-strategy-coach.md § State of play / resume here` | Live, current phase |
| UI acceptance gaps | `SPEC.md §5b` | Live, but see §C — partly stale |
| Product-level deferrals | `SPEC.md §11` | Live, coarse |
| Milestones | `PLAN.md §2` | M0–M6 and M8 complete, M7 ongoing |
| **UI / layout deferrals** | **§A below** | **New — these had no home** |
| **Cleanup sequence & lanes** | **§E below** | **Active — Phases 0-1 done; Phase 2 (A lane) done 2026-08-07, C lane not started** |
| **Found mid-cleanup, not worked** | **§F below** | **1 item (2026-08-08) — Dragon Pung undercounting** |

---

## A. UI & layout open work

These were deferred inside phase KICKOFF files and never rolled up anywhere. Each is
recorded with its origin so the original reasoning stays reachable.

**Every item carries how it was verified. Read the tag before trusting the item.**

| Tag | Means |
|---|---|
| `[code-verified]` | Checked against the actual source tree on the stated date. |
| `[doc-only]` | Taken from a KICKOFF/SPEC claim. **Not** checked against source — may already be done. |

Nothing here has been checked against a passing build or test run. A green suite would not
settle most of these anyway: they are design-state questions ("was this decided?"), not
correctness questions ("does it work?"). Only code inspection or an owner decision closes them.

### A1. Edge-strip topology — deferred through three phases  `[code-verified 2026-08-07]`
Deferred in `KICKOFF-phase4-discard-overlay.md` ("will be re-decided afterwards, on the
wasted-space evidence"), still deferred in `KICKOFF-phase5-melds-backs.md` ("Edge strips,
wall border lanes, central discards. All deferred"). The stated precondition — the discard
overlay and melds both landing so the board could "be judged fresh" — has since been met.
**This is the oldest open UI decision and its own trigger condition has passed.** Either
re-decide it or record that the current topology is final.

Confirmed still open: no `edgeStrip`/`EDGE_STRIP` reference exists anywhere in
`packages/ui/src`.

### A2. Latest-discard overlay footprint  `[doc-only]`
"Unresolved through Step 1b and 1c" per `KICKOFF-phase3-step1d-final-model.md` line 80.
Carried across three consecutive steps without resolution. Verify whether phase 4's
overlay work incidentally settled it; if so, close it, if not it is still open.

### A3. Side seat label vs. side seat tiles at worst-case occupancy  `[code-verified 2026-08-07]`
`SPEC.md §5b` item 6. Well characterised: the seat identity band collides with that seat's
own tiles once the 3rd column opens (19+ tiles, i.e. 4 kongs or heavy flowers). Real fix
needs the side column and discard field re-budgeted together.

**⚠ The guard test SPEC.md claims does not exist.** §5b item 6 states it is "Pinned by
`stageLayout.test.ts`'s `side rail label vs. side seat tiles` so a change that makes it
reachable at a *common* tile count fails loudly." Verified 2026-08-07: no test of that name
exists anywhere in `packages/`. `stageLayout.test.ts`'s `seat identity bands ride the table
rail` block asserts band *placement* (rails, rotation, centring) and asserts nothing about
collision with side seat tiles at occupancy.

This is worse than an untracked item — it is a **claimed safety net that isn't there**, so
the risk reads as contained when it isn't. Either write the test §5b describes, or correct
§5b to stop claiming it. Do not close A3 on the strength of that sentence.

**Partial progress, 2026-08-07 (Phase 1, §E):** `SPEC.md §5b` item 6 no longer claims the
nonexistent test — corrected in place. **A3 itself stays open**: there is still no guard
against the collision, and the underlying layout defect is unfixed. Writing the actual test
is Phase 4 (C lane).

### A4. Touch-target verification on a real iPad  `[code-verified 2026-08-07]`
`SPEC.md §5b` item 3. **Still genuinely open.** There is no `44px` constant, no test, and no
recorded on-device check anywhere in the repo — only the requirement text in `SPEC.md:17`.
This is the one §5b item that code inspection cannot close, because it needs a physical
device. Given iPad Safari is a primary target, this is the highest-value §A item.

### ~~A5. Tile movement animations~~ — moved to §C, 2026-08-07
~~`SPEC.md §11` and `KICKOFF-phase8-live-wall.md`, deliberately post-MVP.~~ **Wrong — these
are shipped.** See §C4. This entry was written from `SPEC.md §11`'s text without checking the
source, and is exactly the error this index exists to prevent. Left in place, struck through,
as the worked example.

### A6. Bot-seat meld reporting  `[doc-only]`
`KICKOFF-phase9-human-melds.md` line 87 — deliberately reported "as a follow-up rather than
half-doing it." Scope not restated here; read that file's surrounding context.

### ~~A7. Base64-PNG tile-art re-assessment~~ ✅ closed 2026-08-07
~~`KICKOFF-phase2-2-hand-fit.md` line 101 asked to "re-assess whether the deferred
base64-PNG tile-art item is still worth a" pass.~~ Confirmed obsolete: tile art has since
been resolved via the vendored FluffyStuff set plus original flower artwork
(`THIRD_PARTY_LICENSES.md`); no `base64` or `data:image` reference exists in `packages/ui/src`.

### A8. Tile legibility at 200% zoom  `[doc-only]`
`KICKOFF-tile-legibility-phase2.md §2.4` deferred a re-assessment "after 2.1/2.2 with fresh
screenshots at 200% zoom." Ties to `SPEC.md §10`'s accessibility scaling and `PLAN.md` M7.
Verify whether that re-assessment ever happened.

### A10. Human's own wall→hand draw has no travel animation  `[code-verified 2026-08-07]`
The player's own draw pops in at rest instead of animating from the wall; every other
draw/discard/meld pairing animates correctly. Investigated during M8 and left unresolved on
explicit owner direction ("not critical") — a legitimate call, correctly recorded.

**Surfaced during Phase 1, and it had no index entry.** It was written up only inside
`PLAN.md §2`'s M8 narrative, which is exactly the burial pattern that stranded the
edge-strip topology (§A1) for three phases: a real deferral, honestly described, inside prose
nobody re-reads. Indexed here 2026-08-07. Still deliberately deferred — this entry changes
its visibility, not its priority.

*Process note: this is the first test of `CLAUDE.md`'s capture rule since it was added, and
the rule half-worked. The limitation was written down, but into a milestone description
rather than into this index or §F. "Written down somewhere" is not the bar; "linked from the
index" is.*

### A9. `docs/playtest-notes.md` is empty  `[code-verified 2026-08-07]`
`PLAN.md §4.5` names owner play-testing as "the one thing that can't be automated" and
directs feedback into this file per session. The file contains only its header — it has never
been used. **This is not a task so much as a gap in the validation strategy**: every other
channel in `PLAN.md §4` (fixtures, cross-validation, property tests, simulations) is running
hard, and the only human one is idle. Worth a deliberate decision either to start using it or
to drop it from `PLAN.md §4` rather than leaving it as notional coverage.

### A11. Board-level Playwright e2e coverage is absent  `[code-verified 2026-08-08]`
`packages/ui/e2e/board.spec.ts` (one test: navigate to `/`, assert the board and all four
seat-wind letters render) was removed on `feat/landing-auth-persistence` and replaced by
`product-shell.spec.ts` (guest start/reload/resume, Play Without Help, iPad-viewport landing/
account forms) — none of which exercise the board itself. Two independent reasons the old
test could no longer pass as written, not one: (1) `/` now renders the landing page instead of
the game, so `page.goto('/')` never reaches a board; (2) `getByTestId('board')` was already
stale before this branch started — the M8 game-stage rewrite (commit `73c586b`, 2026-07-29)
renamed that testid to `game-stage`, and `board.spec.ts` was last touched 2026-08-03 without
picking up the rename, so this assertion had likely been silently failing for days already,
independent of the shell work.

**This coverage is load-bearing elsewhere and its loss is not merely cosmetic:**
- `PLAN.md`'s M8 entry states the game-stage rewrite was "independently verified via
  Playwright across desktop/iPad viewports and all three `tileScale` presets" — that
  verification has no standing automated re-check now.
- `PLAN.md §3` defines the `ux-reviewer` subagent entirely around Playwright screenshots at
  desktop/iPad viewports.
- §A4 above (iPad touch-target verification, still open) has just lost its nearest automated
  proxy.

**Not fixed in this pass** (commit-organization/investigation task, `feat/landing-auth-
persistence`) — the right fix is to PORT the old assertions (navigate through the shell into a
game, then check the board renders and seat winds are visible with the current `game-stage`
testid), not to restore the file as-is (reason 2 would still fail it) or leave it silently
gone. Whoever picks this up should also decide whether a `data-testid="board"` alias is worth
keeping for e2e stability independent of internal rewrites, given this is the second time a
testid rename has silently broken a consumer.

---

## B. Tracked elsewhere — pointers only

Do not restate these here; follow the link.

- **Rules & scoring backlog** — `docs/rules/decisions.md § Open follow-up work`.
  Currently: exclusion-citation backfill (~91 grandfathered pairs, low priority), two open
  rules questions from item #34(d) needing a `rules-lawyer` pass, a classifier peeling gap,
  one likely harness artifact, missing Appendix 4 re-verification, and fan-encyclopedia
  example hands.
- **Validation harness** — `KICKOFF-validation-harness.md § What's actually still open` (5
  items, overlapping the above). Plus **Stage 2 CI integration, gating every push — specified,
  not started** (`CLAUDE.md`).
- **Phase 10 Strategy Coach** — `KICKOFF-phase10-strategy-coach.md § State of play`.
  Stage 2 (depth-2 evaluation) specified, not started, deprioritised behind Stage 3.
  ~~Stage 3 in progress: 5 of 10 families done, 5 remaining~~ **Stage 3's engine layer done,
  2026-08-07/08 (§E Phase 2, `feat/phase10-stage3`, not yet merged to `main`):** all 10
  families plus the `computeRouteToPoints` orchestration layer (CHANGE 3's tri-state warning
  contract) shipped and tested. Compatibility filtering went through two passes: an honor-axis
  check found 2026-08-07, then a review pass 2026-08-08 found a second, uncovered shape axis
  (Seven Pairs vs. any pung-requiring fan) and replaced both hardcoded checks with
  `fan-target-compatibility.ts` — an exhaustive, fixture-verified table over all 45 pairs among
  the 10 families. See the KICKOFF doc's own state-of-play notes for the three bugs found (two
  overcounting, one undercounting) across both passes.
  **Open, recorded 2026-08-08, not yet fixed:** `computeRouteToPoints` undercounts Dragon
  Pung (fan 59) — a locked-in partial pung silently blocks a legitimate further unit's
  candidate. See the KICKOFF doc's own note for the confirmed repro and proposed handling.
  **Fixed 2026-08-16, `code-verified`, on `feat/phase10-stage3` (still not merged):** the
  CHANGE 3 contract's `warning`/`reachesMinimum` booleans were derived ONLY from the 10-family
  greedy approximation, never from `computeHandPlan`'s tenpai-exact `bestCaseReachesMinimum` —
  `warning: true` could assert "cannot reach 8 points" on a hand that genuinely could (e.g.
  tenpai on a fan outside the 10 families). Replaced with an explicit
  `minimumPointsStatus: 'reachable' | 'currentWaitsFallShort' | 'unknown'` tri-state.
  **Review pass, same day, caught the first version's own precedence bug before merge:** it
  checked the inflated family estimate (`bestCaseTotal`) BEFORE the grounded tenpai-exact
  answer, so `||` short-circuited past a real `bestCaseReachesMinimum === false` and reported
  `'reachable'` anyway — coupled directly to the `bestCaseTotal`-inflation defect noted below.
  Corrected to exact-beats-estimate precedence (tenpai-exact answer checked first and treated
  as final whenever it exists; the family estimate is consulted only pre-tenpai). The negative
  state was also renamed from `'unreachable'` to `'currentWaitsFallShort'` — the field is
  derived from the hand's CURRENT waits only, and a tenpai hand can always be broken and
  rebuilt toward something bigger, so `'unreachable'` overclaimed a permanence it can't
  support. Five fixtures now cover all three states, including a dedicated precedence
  regression guard. Full account: see the KICKOFF doc's own state-of-play notes, dated
  2026-08-16 (two entries: the original fix, then the same-day review correction). Full engine
  suite green (562 tests), typecheck clean, `scoring/`/`win-detection.ts`/`exclusions.ts`
  untouched throughout.
  **`bestCaseTotal`-inflation defect (referenced above) fixed 2026-08-16, `code-verified`, own
  session, fresh branch off `main` (`feat/phase10-route-credibility`), docs/rules/decisions.md
  item #37.** Measured first via a NEW, committed self-play calibration harness
  (`validation/src/selfplay/`, its own commit before any production code changed, 2,000 hands):
  `bestCaseTotal >= 8` on 93.3% of pre-tenpai decision points, driven ~93% by three families
  (Seven Pairs 19, Half/Full Flush 22/50, All Simples/No Honors 68/76). Fixed via the owner's
  (c)+(d) decision — `bestCaseTotal` itself untouched; a new `crediblePointsTotal` field
  (per-family native-distance gate, thresholds picked by measured precision movement, not by
  feel) now drives `minimumPointsStatus` pre-tenpai instead. Reachable-rate corrected 93.3% ->
  46.6%. **Two follow-ups recorded, not fixed this pass:** the other 7 families still carry
  95.2% of what stays 'reachable' post-gate (not gated this pass, per explicit scope); and a
  separate, higher-priority gap in `computeWaits`/`waits.ts` — a hand already structurally
  complete but under the 8-point minimum (shanten -1) gets no exact answer at all, since
  `computeWaits` only computes anything at exactly shanten 0, so it falls back to the same
  fuzzy pre-tenpai estimate as any earlier-game hand for precisely SPEC §6's named "1-7 point
  dead zone" trap. Full account: KICKOFF doc's own dated section, decisions.md item #37. Full
  engine suite green (567 tests), typecheck clean across `engine`/`ui`/`validation`,
  `scoring/`/`win-detection.ts`/`exclusions.ts` untouched.
  **Still open, `doc-only`, restated 2026-08-16 (unchanged by the fix above):** Stage 3 covers
  10 of 81 fans — Pure Straight/Mixed Straight dropped in CHANGE 1, knitted shapes never added.
  See the KICKOFF doc's own coverage-gap note for the reasoning; not decided whether either
  belongs in a v2 pass.
  Still open: the UI panel that renders `computeRouteToPoints`'s output — engine-only so far.
  The 2000-seed self-play re-test remains parked.
- **M7 Polish (ongoing)** — `PLAN.md §2`: tile art finalisation, iPad touch tuning,
  accessibility scaling, colour-blind palette, save/resume.
- **Product deferrals** — `SPEC.md §11`: multiplayer, accounts, other rulesets, app-store
  packaging.

---

## C. Stale records — the docs say open, the code says done

Found 2026-08-07 by checking `SPEC.md §5b` against the actual source tree. These need the
*document* corrected, not new work. Verify each, then strike through in `SPEC.md §5b`
directly with a date, the same way item 1 already was.

- **§C1 — §5b item 2, bot-seat turn indicator.** Appears **done**: `Board.tsx:267` passes
  `isCurrentTurn` for every seat, and `Seat.tsx:232` renders it. *However* it renders as a
  text-colour change (emerald vs. neutral) on a small identity band — worth confirming that
  clears `SPEC.md §5a` item 1's two-second bar before striking it through, since a colour
  shift on small text is exactly the kind of thing that passes in code review and fails on
  a real screen. Also relevant to §5a's colour-blind requirement. **Owner judgment required
  — not closed by Phase 1** (§E). Still open as of 2026-08-07.
- **~~§C2 — §5b item 4, tile art licensing.~~ ✅ struck through in SPEC.md, 2026-08-07.**
  `THIRD_PARTY_LICENSES.md` documents the vendored FluffyStuff/riichi-mahjong-tiles set (CC0)
  with a commit pin.
- **~~§C3 — §5b item 5, missing flower/season assets.~~ ✅ struck through in SPEC.md,
  2026-08-07.** Eight original flower/season faces shipped, documented in
  `THIRD_PARTY_LICENSES.md`, with `FlowerTileFace.tsx` retained only as a fallback.
- **~~§C4 — tile movement animations.~~ ✅ corrected in SPEC.md, 2026-08-07.** The claim
  actually lives in **`SPEC.md §12`** (Movements), not §11 as first written here — §11 is the
  unrelated "Future (explicitly deferred)" product-scope list. `motion@^12.43.0` is a
  dependency; `Positioned.tsx` wraps `motion/react`; `layoutId` is threaded through
  `HandTiles.tsx`, `DiscardField.tsx`, `SeatLine.tsx` and `Board.tsx`; `App.tsx` honours
  `useReducedMotion`; `SettingsPanel.tsx` exposes a tile-animation toggle. §12 now says so.
  `PLAN.md §2` gained the M8 entry `HandTiles.tsx:120`'s comment referenced but that the
  milestone list itself never had.
- **~~§C5 — claim call-out tile naming regression.~~ ✅ fixed 2026-08-08.**
  `GameEventAnnouncement` now visibly renders the shared `describeAction()` wording,
  restoring actor, action, source and claimed-tile context while retaining the prominent
  announcement and sound.

Leaving these reading as open is not harmless — it is what makes a long-lived checklist stop
being trusted, and it inflates the apparent size of the remaining work.

**And the inverse, which is worse:** `SPEC.md §5b` item 6 claims a guard test that does not
exist (see §A3). Stale-open items inflate the apparent work; a stale *claimed protection*
deflates the apparent risk. When sweeping §5b, check both directions — that every item
marked open is still open, **and** that every safety net an item leans on actually exists.

---

## D. Process & tooling

### D1. `.gitattributes` — CRLF normalisation ✅ fixed 2026-08-07
Before the fix, `git status` reported 16 modified files that were pure line-ending churn
(2440 insertions against 2440 deletions; `git diff --ignore-all-space` empty). No
`.gitattributes` existed and `core.autocrlf` was unset.

**Why this mattered beyond tidiness:** "`git status` confirms only the expected files were
touched" is a standing stop-condition check in this project's session protocol. With 16 files
permanently showing as modified, that check returned noise, and at least one session report
described `git status` as clean when it was not. A verification step that always shows the
same false positive stops being read.

After applying `.gitattributes`, run once to renormalise:
```
git add --renormalize .
git commit -m "Normalise line endings via .gitattributes"
```

### ~~D2. 23 commits on `main` are unpushed~~ ✅ fixed 2026-08-07
~~`origin/main` is at `6df4c2b`; local `main` is at `8e75552`, 23 commits ahead.~~ Pushed:
`origin/main` now at `7680161` (25 commits — the original 23, plus the `.gitattributes` and
`OPEN-WORK.md`/`CLAUDE.md` commits that landed alongside it). Also folded in while pushing:
the landing-page spec is now tracked (owner confirmed it's the sole authoritative version —
the "two specs" concern below turned out to reference a file outside the repo, in a local
agent-session output directory, not a second in-repo spec).

### D3. Mockup baseline may be stale
`docs/Mockups/` contains `mahjong-seated-table-prototype-v6.html`, `-v7.html` and `-v8.html`
(all dated 2026-07-27). `CLAUDE.md` and `SPEC.md §5b`/§4 all name **v6** as "the current UI
baseline." Either v7/v8 were explored and rejected — in which case say so where v6 is named —
or the baseline moved and three documents are now pointing at the wrong file.

### D4. Keep this index current
See the new capture rule in `CLAUDE.md`. An index that is not updated at the moment work is
deferred becomes wrong faster than no index at all.

### D5. `PLAN.md`'s M8 Playwright-verification claim was not reproducible — corrected 2026-08-08
Same stale-claim class as `SPEC.md §5b` item 6 (a claimed safety net that isn't actually
there): M8's entry stated each of its four steps was "independently verified via Playwright
across desktop/iPad viewports and all three `tileScale` presets," phrased as a standing,
re-checkable fact. It described the one-off verification runs performed during the M8 session
itself accurately at the time, but `board.spec.ts` — the only board-level Playwright coverage
that could ever re-confirm it — had already gone stale from the M8 testid rename before this
milestone entry was even written up (§A11), then was removed entirely on
`feat/landing-auth-persistence`. `PLAN.md` now says so in place, dated, not just struck
through blind — see §A11 for the full two-cause account.

### ~~D6. `npm test` excludes Playwright e2e by construction~~ ✅ fixed 2026-08-08
~~`package.json`'s root `"test"` script is `npm run test --workspaces --if-present`, which for
`packages/ui` runs only its `"test"` script (`vitest run`). `"test:e2e"` (`playwright test`) is
a separate script the root `npm test` never touches.~~ Every "full suite green" report in this
project's history up to this point had excluded e2e by construction — this is exactly how
`board.spec.ts` stayed silently broken from the M8 testid rename (2026-07-29) until it was
deleted (2026-08-08) without anyone's `npm test` ever flagging it (§A11/§D5).

**Owner chose option 1 (fold e2e into the standard check).** Root `"test"` is now
`npm run test --workspaces --if-present && npm run test:e2e --workspace=@mahjong-mcr/ui
--if-present`. Two supporting changes made this self-sufficient rather than order-dependent:
`playwright.config.ts`'s `webServer.command` now chains `npm run build && npm run preview`
(previously just `preview`, which silently served a stale/absent `dist/` if nothing had built
it first) — so `test:e2e` no longer depends on a separate build step having already run, in CI
or locally. `.github/workflows/ci.yml` gained a `playwright install --with-deps chromium` step
(CI never needed browsers installed before, since it never ran e2e). Verified locally: full
`npm test` from repo root — 466 engine + 448 ui vitest tests, then 9 e2e tests (3 tests × 3
viewport projects) — all green, ~90s total added over the vitest-only baseline. `npm run
typecheck` unaffected.

This does not restore board-level e2e coverage itself — that remains open at §A11 — it only
means the NEXT time something like `board.spec.ts`'s drift happens, `npm test` will now
actually catch it instead of silently passing.

---

## E. Cleanup sequence (agreed 2026-08-07)

### The one rule that makes this work

**The list is frozen as of 2026-08-07.** Anything discovered during cleanup goes into §F
below and is **not worked** in this pass — unless it *blocks* the item in hand, in which case
say so explicitly before touching it.

This project's diversion mechanism is well evidenced: a session sets out to do X, finds a
real defect, and chases it. That instinct found 11 genuine engine bugs, so the answer is not
"stop chasing." The answer is that **finding and fixing are separate decisions**. Record
always; fix only what's in scope. §F is where the recording goes.

**Cleanup is finished when every item is struck through OR has an owner and a lane** — not
when everything is built. Several items below close by *deciding*, not by coding.

### Lanes

| Lane | Owner | Scope |
|---|---|---|
| **K** | Kevin | Anything needing a physical device, a product judgment, or a push |
| **C** | Codex | `packages/ui` — landing page, then UI items |
| **A** | Claude | `packages/engine` — scoring, rules, validation |

Lanes exist to keep two agents out of the same files. **Both lanes touch `SPEC.md`,
`PLAN.md` and this file** — that is where collisions will happen, so Phase 1 below gets them
correct *before* either agent starts.

### ~~Phase 0 — unblock~~ ✅ done 2026-08-07

1. ~~**Push the 23 commits** (§D2).~~ Done — see §D2.
2. ~~**Commit `.gitattributes`**, then renormalize.~~ Done. `git add --renormalize .` found
   nothing to renormalize (a prior session's fix already covered it, per the original §D1);
   the command's only effect was to catch a real, unrelated modified `CLAUDE.md`, which was
   committed separately on its own merits (the capture-rule addition, alongside adding
   `OPEN-WORK.md` itself).
3. ~~**Reconcile the two landing-page specs.**~~ Done — see §D2. Only one spec ever existed
   in-repo; it is now tracked (commit `7680161`).
4. ~~**Decide the branch discipline.**~~ Decided: `feat/phase10-stage3` created and pushed
   for lane A's next chunk (the remaining 5 Stage 3 families). `feat/landing-page` for lane C
   is Codex's to create when that work starts.

### Phase 1 — record corrections (A, one session, documents only, no code) — 4/4 agent items done 2026-08-07

**Agent-closeable — done:**

- ~~§C2, §C3 — strike through §5b items 4 and 5.~~ Done in `SPEC.md`.
- ~~§C4 — correct `SPEC.md §11`.~~ Done — the claim actually lived in `SPEC.md §12`, not §11
  (corrected in place, see §C4 above). `PLAN.md §2` gained the M8 entry.
- ~~§A7 — strike through.~~ Done above.
- ~~§A3 — correct `SPEC.md §5b` item 6's false guard-test claim.~~ Done — doc corrected;
  **A3 itself is still open** (see A3 above), only the false claim is resolved. Writing the
  actual test remains Phase 4, C lane.

**Owner judgment required — NOT closed by this pass, still open:**

- §C1 — bot turn indicator. The code half is already verified: `Board.tsx:267` passes
  `isCurrentTurn` for every seat and `Seat.tsx:232` renders it. But it renders as **text
  colour alone** (emerald vs. neutral) on a small identity band. Whether that answers
  `SPEC.md §5a` item 1 within two seconds is a judgment on a real screen, and colour-only
  encoding is precisely what §5a's colour-blind requirement exists to catch. An agent
  checking "is the prop passed?" will rubber-stamp this. **Kevin decides, on a device.**
  Prior expectation: it probably fails both bars and needs a non-colour cue.
- §D3 — v6 vs. v7/v8 mockup baseline. Kevin authored all three; only he knows whether v7/v8
  were rejected explorations or an unrecorded supersession.

Outcome: 4 items struck through (plus one, §5b item 1, already struck before Phase 1 started),
2 reassigned to K with a reason, zero production code touched, zero merge risk. Codex can
start the moment this lands.

### Phase 2 — split the lanes

**C:** landing page, against the single reconciled spec, on its own branch. Not started by
this session — Codex's lane.
**A:** ~~Phase 10 Stage 3 — the 5 remaining families... then the orchestration layer...~~
**Done, 2026-08-07/08, on `feat/phase10-stage3` (not yet merged to `main`).** All 5 remaining
families (All Pungs, Prevalent Wind, Seat Wind, All Simples, No Honors) plus
`computeRouteToPoints` (the CHANGE 3 orchestration layer) shipped with pairwise compatibility
filtering — see `KICKOFF-phase10-strategy-coach.md`'s own state-of-play notes for three real
bugs this filtering caught across two passes (exclusions.ts's table alone doesn't catch these;
it only covers pairs that could naively co-fire on a COMPLETE hand), replacing two hardcoded
axis-checks with `fan-target-compatibility.ts`'s exhaustive 45-pair table. One further bug
(Dragon Pung per-unit undercounting) found and recorded, deliberately not fixed this pass.
Full engine suite green (559 tests), typecheck clean, zero files touched under
`scoring/`/`win-detection.ts`/`exclusions.ts`.
**Still open, not this phase:** merging `feat/phase10-stage3` to `main`, and the actual UI
panel rendering `computeRouteToPoints`'s output (engine-only so far).

### Phase 3 — verification pass (A, small)

Resolve the three `[doc-only]` items — §A2, §A6, §A8 — to a known state. Each is a code read,
not a build. A5 is the reason this matters: a `[doc-only]` item was wrong.

### Phase 4 — remaining real work, one item at a time

**A (engine):** the two open rules questions needing a `rules-lawyer` pass; the
`classify_mismatch` peeling gap; seed `4009266348`; then the long tail — exclusion-citation
backfill (~91 pairs), validation Stage 2 CI gating, fan-encyclopedia example hands.

**C (UI):** §A1 edge-strip topology — its trigger condition passed three phases ago, so
either re-decide or record the current topology as final; then §A3's fix if the test showed
it reachable.

**K (only Kevin can):** §A4 iPad touch-target verification — needs a real device, and it is
the highest-value open UI item. §A9 — decide whether `docs/playtest-notes.md` starts being
used or comes out of `PLAN.md §4`. Neither of these can be delegated to an agent, and both
will sit forever if not named as yours.

**Not actionable, leave parked:** Appendix 4 re-verification (blocked on a better PDF ever
surfacing); the 2000-seed self-play re-test (only if Stage 2 reopens the question).

---

## F. Found during cleanup — deliberately NOT worked

Append here and keep going. Nothing in this section gets fixed during the cleanup pass; it is
triaged after §E completes. An empty section means the pass stayed in scope.

- **`computeRouteToPoints` undercounts Dragon Pung** (found 2026-08-08, during Phase 2's
  compatibility-table fix — two other bugs found the same pass were fixed because they blocked
  the work in hand; this one wasn't and is deliberately deferred). Full account, confirmed
  repro, and proposed handling: `KICKOFF-phase10-strategy-coach.md` § State of play. Still
  open as of this merge (2026-08-08).
- ~~The claim call-out regression found here~~ ✅ fixed and closed as §C5 above, 2026-08-08
  (`feat/landing-auth-persistence`). Struck through rather than removed, per this section's own
  closing convention — the record of what was found and fixed is worth more than the tidiness.

---

## Explicitly not tracked here

- **Landing page, accounts, variant selection.** Planned separately and not part of any
  current milestone. `PLAN.md §6` warned against opening the multiplayer/public direction
  before M6; M6 is now complete, so it is legitimately openable — but it should enter
  `PLAN.md §2` as a milestone before it enters this index, not the other way round.

  ~~Note: an untracked `Mahjong Learning Game — Landing Page, Accounts & Saved Games
  Specification.md` already sits in the repo root, unversioned.~~ **Resolved — see §D2.**
  Now tracked as the sole authoritative spec (commit `7680161`); Codex builds against it.
