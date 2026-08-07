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
| Milestones | `PLAN.md §2` | M0–M6 complete, M7 ongoing |
| **UI / layout deferrals** | **§A below** | **New — these had no home** |
| **Cleanup sequence & lanes** | **§E below** | **Active — start at Phase 0** |
| **Found mid-cleanup, not worked** | **§F below** | **Empty — keep it that way** |

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

### A7. Base64-PNG tile-art re-assessment  `[code-verified 2026-08-07]`
`KICKOFF-phase2-2-hand-fit.md` line 101 asked to "re-assess whether the deferred
base64-PNG tile-art item is still worth a" pass. Likely obsolete — tile art has since been
resolved via the vendored FluffyStuff set plus original flower artwork
(`THIRD_PARTY_LICENSES.md`). Confirmed: no `base64` or `data:image` reference exists in `packages/ui/src`. **Closeable —
confirm and strike through.**

### A8. Tile legibility at 200% zoom  `[doc-only]`
`KICKOFF-tile-legibility-phase2.md §2.4` deferred a re-assessment "after 2.1/2.2 with fresh
screenshots at 200% zoom." Ties to `SPEC.md §10`'s accessibility scaling and `PLAN.md` M7.
Verify whether that re-assessment ever happened.

### A9. `docs/playtest-notes.md` is empty  `[code-verified 2026-08-07]`
`PLAN.md §4.5` names owner play-testing as "the one thing that can't be automated" and
directs feedback into this file per session. The file contains only its header — it has never
been used. **This is not a task so much as a gap in the validation strategy**: every other
channel in `PLAN.md §4` (fixtures, cross-validation, property tests, simulations) is running
hard, and the only human one is idle. Worth a deliberate decision either to start using it or
to drop it from `PLAN.md §4` rather than leaving it as notional coverage.

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
  Stage 3 in progress: 5 of 10 families done, 5 remaining (All Pungs, Prevalent Wind, Seat
  Wind, All Simples, No Honors), then the orchestration layer per that doc's CHANGE 3.
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

- **§5b item 2 — bot-seat turn indicator.** Appears **done**: `Board.tsx:267` passes
  `isCurrentTurn` for every seat, and `Seat.tsx:232` renders it. *However* it renders as a
  text-colour change (emerald vs. neutral) on a small identity band — worth confirming that
  clears `SPEC.md §5a` item 1's two-second bar before striking it through, since a colour
  shift on small text is exactly the kind of thing that passes in code review and fails on
  a real screen. Also relevant to §5a's colour-blind requirement.
- **§5b item 4 — tile art licensing.** **Done.** `THIRD_PARTY_LICENSES.md` documents the
  vendored FluffyStuff/riichi-mahjong-tiles set (CC0) with a commit pin.
- **§5b item 5 — missing flower/season assets.** **Done.** Eight original flower/season
  faces shipped, documented in `THIRD_PARTY_LICENSES.md`, with
  `FlowerTileFace.tsx` retained only as a fallback.
- **§C4 — `SPEC.md §11` still lists tile movement animations as deferred. They are shipped.**
  `motion@^12.43.0` is a dependency; `Positioned.tsx` wraps `motion/react`; `layoutId` is
  threaded through `HandTiles.tsx`, `DiscardField.tsx`, `SeatLine.tsx` and `Board.tsx`;
  `App.tsx` honours `useReducedMotion`; `SettingsPanel.tsx` exposes a tile-animation toggle;
  and commit `6df4c2b` specifically disables shared-layout animation *in the preview*, which
  only makes sense if it is live on the real board. `HandTiles.tsx:120` even names it
  "the `layoutId`-based settle animation (M8 Step 3)" — an M8 that `PLAN.md §2` does not list.
  **Correct `SPEC.md §11`, and check whether `PLAN.md §2` needs an M8 entry.**

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

### D2. 23 commits on `main` are unpushed ⚠
`origin/main` is at `6df4c2b`; local `main` is at `8e75552`, 23 commits ahead. That gap
contains the entire validation-triage body of work — 11 engine bug fixes, the citation guard,
the Stage 3 fan-target estimators — and it exists on one machine only. No other branch, no
stash. This is the largest single risk in the repo right now and it is not a code-quality
issue. Push.

### D3. Mockup baseline may be stale
`docs/Mockups/` contains `mahjong-seated-table-prototype-v6.html`, `-v7.html` and `-v8.html`
(all dated 2026-07-27). `CLAUDE.md` and `SPEC.md §5b`/§4 all name **v6** as "the current UI
baseline." Either v7/v8 were explored and rejected — in which case say so where v6 is named —
or the baseline moved and three documents are now pointing at the wrong file.

### D4. Keep this index current
See the new capture rule in `CLAUDE.md`. An index that is not updated at the moment work is
deferred becomes wrong faster than no index at all.

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

### Phase 0 — unblock (K, minutes)

1. **Push the 23 commits** (§D2). Nothing else should start until there is a shared base.
2. **Commit `.gitattributes`**, then `git add --renormalize . && git commit`.
3. **Reconcile the two landing-page specs** (see "Explicitly not tracked here" below). Pick
   one, `git add` it, delete or archive the other. **This blocks Codex** — it cannot build
   against two specs, and one of them is untracked.
4. **Decide the branch discipline.** Two agents on `main` will collide. Suggest
   `feat/landing-page` for C and `feat/phase10-stage3` for A, merged separately.

### Phase 1 — record corrections (A, one session, documents only, no code)

Do this **before Codex starts**, because it edits `SPEC.md` and `PLAN.md` — the exact files
Codex will read to build the landing page. Running it concurrently guarantees Codex builds
against a spec being corrected underneath it.

Highest ratio of items-closed to risk in the whole list. Every one of these closes by
correcting a record:

- §C1 — verify the bot turn indicator against `SPEC.md §5a` item 1's two-second bar and the
  colour-blind requirement, then strike through §5b item 2 (or keep it open with the real
  reason, which is legibility, not absence).
- §C2, §C3 — strike through §5b items 4 and 5. Both confirmed done.
- §C4 — correct `SPEC.md §11`: tile animations are shipped, not deferred. Check whether
  `PLAN.md §2` needs the M8 entry that `HandTiles.tsx:120` references.
- §A7 — strike through. Confirmed obsolete.
- §A3 — **either** write the guard test `SPEC.md §5b` item 6 claims exists, **or** correct
  §5b to stop claiming it. Writing it is the better outcome and is small; do not leave the
  false claim standing either way.
- §D3 — confirm v6 is still the baseline or point the three references at v7/v8.

Expected outcome: 5–6 items struck through, zero production code touched, zero merge risk.

### Phase 2 — split the lanes

**C:** landing page, against the single reconciled spec, on its own branch.
**A:** Phase 10 Stage 3 — the 5 remaining families (All Pungs, Prevalent Wind, Seat Wind,
All Simples, No Honors), then the orchestration layer per `KICKOFF-phase10`'s CHANGE 3, with
pairwise compatibility filtering added to its greedy sum.

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

*(empty as of 2026-08-07)*

---

## Explicitly not tracked here

- **Landing page, accounts, variant selection.** Planned separately and not part of any
  current milestone. `PLAN.md §6` warned against opening the multiplayer/public direction
  before M6; M6 is now complete, so it is legitimately openable — but it should enter
  `PLAN.md §2` as a milestone before it enters this index, not the other way round.

  Note: an untracked `Mahjong Learning Game — Landing Page, Accounts & Saved Games
  Specification.md` already sits in the repo root, unversioned. It specifies **two** initial
  modes (Learning Mode and Play Without Help). Decide whether it is the authority, `git add`
  it if so, and reconcile it with any other landing-page planning before building anything —
  two specs is worse than none.
