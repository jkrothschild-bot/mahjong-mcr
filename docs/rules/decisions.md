# Rulebook decisions

Rulings on MCR rule details that were ambiguous, underspecified in SPEC.md/PLAN.md,
or (initially) not checkable because `docs/rules/mcr_EN.pdf` hadn't been added to the
repo yet. Per CLAUDE.md: never implement a scoring/structural rule from memory — every
entry here must cite an actual rulebook section, or be marked provisional and revisited.

The rulebook was added in session 4 and cross-checked via a research pass (full extract:
`mcr_EN.pdf`, 42 pages, World Mahjong Organization). Three of the six original provisional
defaults below turned out to be **wrong**, not just unconfirmed — the engine code has been
corrected to match. See each item's status.

## Confirmed

1. **Robbing the kong (qiang gang)** — only a *promoted/added* kong (pung→kong upgrade)
   opens a win-claim window. Concealed kong is not robbable.
   **Status: CONFIRMED, §3.8/Appendix 1 Fan #47 "Robbing The Kong" (p.37)**, defined
   exclusively as winning off a tile added to an existing melded pung to form a kong — no
   other robbing scenario is described anywhere. A kong claimed directly from a discard
   doesn't need a separate rob mechanic since Hu already outranks Kong claims on a discard
   (§3.7.1). The rulebook never states outright that a concealed kong "cannot" be robbed,
   but Robbing-the-Kong's sole definition covers only the promotion case — no engine change
   needed here, original M1 implementation matches.

2. **Multi-simultaneous win (multi-ron)** — disallowed. If more than one seat could win off
   the same discard, the seat nearest in turn order after the discarder wins.
   **Status: CONFIRMED, §3.7.2.4 (p.13), exact quote**: "Only one player can win. When more
   than one person declares 'Hu' on a discard, the nearest next player following the
   discarder is the winner." No engine change needed, original M1 implementation matches.

3. **Dead wall — CORRECTED, was wrong.** There is no fixed dead-wall reserve. The term
   "dead wall" never appears in the rulebook; §3.4.30 defines a Draw Game as occurring when
   "the wall has been completely depleted" — the entire 144-tile wall is drawn down (minus
   what's dealt), with kong/flower replacements simply coming from the opposite ("back") end
   of the same single pool (§3.4.20, §3.6.8). The initial deal (53 tiles: dealer 14, others
   13) is confirmed correct (§3.5.7.5), but M1's `DEAD_WALL_SIZE = 14` reserved-buffer model
   was invented, not sourced, and has been removed — `packages/engine/src/wall.ts` now draws
   to full exhaustion (144 tiles total, minus whatever was dealt).
   **Resolved (was "Open")**: whether normal draws and back-end replacement draws could meet
   before the physical 144 count is exhausted turned out not to need a rulebook answer —
   Phase 8's two-pointer `Wall` (item 17 below) makes it arithmetically impossible. Every draw
   consumes exactly one tile from exactly one end, so `frontIndex`/`backIndex` cannot cross;
   the pointers meeting *is* the wall being empty, not a separate case requiring a tie-break
   rule.

4. **Dealer rotation — CORRECTED, was wrong.** The dealer passes to the next seat
   unconditionally after every hand — no repeat on a dealer win, no repeat on an exhaustive
   draw. A complete game/session is a fixed 4 rounds × 4 hands = 16 hands, no more, no fewer.
   **Status: CONFIRMED (as strongly as the available text supports), §3.4.8 and §3.6.2**,
   both stating the dealer/dice pass to the next player after every hand "regardless of
   whether he wins the hand or not," with no stated exception, combined with §3.4.3's
   definition of a round (everybody dealer once = 4 hands). `packages/engine/src/match.ts`'s
   `advanceMatch` has been rewritten to rotate unconditionally; `repeatCount` field removed.
   **Residual uncertainty**: this is unusual relative to most mahjong variants (where dealer
   repeat-on-win is near-universal), and the one appendix that would have a rotation detail
   chart (Appendix 4, "Procedures for Seat Rotation") is listed in the table of contents but
   **not physically present** in this 42-page PDF. If a more complete copy of the rulebook
   ever turns up, re-check this against Appendix 4 specifically before treating it as final.

5. **Seven pairs** — two sub-questions, split status:
   - **Fully concealed (no melds)**: suggestively supported, not a direct quote.
     §3.7.2.2's shape notation for Seven Pairs shows no meld option (unlike the standard
     shapes, which explicitly allow melded pung/kong), and Fan #19 excludes combining with
     "Concealed Hand" as a separate fan — consistent with Seven Pairs being inherently fully
     concealed, but no sentence states this outright. **Status: still provisional**, kept as
     the engine's default since no evidence contradicts it.
   - **Exactly 7 distinct pairs** (vs. one tile counted twice via its 4 copies): **genuinely
     unaddressed** — checked every "Seven Pairs" and "Tile Hog" (Fan #64, p.40) occurrence
     including all worked examples; nothing clarifies it. **Status: still provisional**,
     kept as the conservative default (safer to under-accept a rare edge case).

6. **Hand shapes — CORRECTED, was wrong.** M1 originally implemented only two winning
   shapes (four-sets-plus-pair, seven pairs). **The rulebook recognizes four**, per §3.7.2.2
   (p.13) itself — a Chapter 7 structural fact, not just a Chapter 8 scoring-table fact:
   1. Four sets + a pair (already implemented)
   2. Seven Pairs (already implemented)
   3. **Thirteen Orphans** — one of each terminal/honor type (13 distinct types) + a
      duplicate of any one of them as the pair (14 tiles, 1 pair). Not yet implemented —
      tracked as follow-up work in this same fix pass.
   4. **Lesser/Greater Honors and Knitted Tiles** — 14 *single* tiles with **no pair at
      all**, a genuine exception to "every winning hand has a pair." Exact tile-composition
      split between "Lesser" and "Greater" variants lives in Fan #20 (Greater, 24 pts, p.30)
      and Fan #34 (Lesser, 12 pts, p.34) in the Chapter 8 fan list, not Chapter 7 itself —
      needs the fan-list extraction to pin down precisely before implementing; tracked as
      follow-up work, not done in this pass (see PLAN.md M2 session notes).
   **Status: CONFIRMED shapes exist (§3.7.2.2, p.13); Thirteen Orphans implemented in this
   fix.**
   **Deferral CLOSED 2026-08-05 (item #20).** Item 4's tile-composition split was in fact
   pinned down in the very next session (item #12, below) and the fan-20/34 detectors were
   written against it — but the *shape-recognition* half of this deferral silently never
   happened: nobody wired the resulting shape into `decomposeHand`/`isWinningHand`, so the
   deferral note here kept saying "not yet implemented" for years after the detectors
   actually were, while `isWinningHand` kept returning `false` for every hand needing them.
   Found by the validation harness (item #19) and fixed in item #20, which also covers fan 35
   (Knitted Straight) — a related but structurally distinct shape this item never mentioned
   at all.

## Newly confirmed (not originally in this doc)

7. **Flowers vs. the 8-point minimum** — flower/bonus-tile points do NOT count toward the
   8-point minimum required to declare a win; they're pure bonus points added after a hand
   already qualifies on its own fan. **Status: CONFIRMED, §3.11.6.6 (p.22)**: the hand must
   be "worth 8 points or more (not counting the points for Flowers)"; also Fan #81 (p.41) and
   Fan #43 "Chicken Hand" (p.36). Already assumed correctly in SPEC.md; relevant for M2, no
   M1 engine change needed (M1 has no scoring yet).

8. **Discard-claim priority — CONFIRMED exact wording.** Hu > Pung/Kong > Chow.
   **§3.7.1 (p.13)**: "A call for 'Hu' takes priority over claims for Kong, Pung, or Chow."
   **§3.6.7**: "A call for pung takes priority over a call for chow." Matches M1's existing
   implementation exactly, no change needed.

9. **Combination/exclusion principles — CONFIRMED, exact names and text (§3.9.1.5, p.18-19)**
   for M2 scoring to implement directly, using the book's own terminology (not generic
   "category limit" language):
   1. **The Non-Repeat Principle**: "When a fan is inevitably implied or included by another
      fan, both fan may not be scored."
   2. **The Non-Separation Principle ("Unbreakable")**: "After combining sets to create a
      fan, it is forbidden to rearrange those same sets to create a different fan."
   3. **The Non-Identical Principle**: "Once a set has been used to create a fan, it is not
      allowed to use the same set together with other sets to create the same fan again."
   4. **Freedom to Choose the Highest Points ("the High-versus-Low Principle")**: "If you can
      use a set to form both a high-score fan and a low-score fan, it is your right to choose
      the high-score fan."
   5. **The Account-Once Principle ("Exclusionary rule")**: "When you have combined some sets
      to create a fan, you can only combine any remaining sets once with a set that has
      already been used."

10. **Settlement/payment formulas — CONFIRMED, exact quotes (§3.9.1.2-3, p.18)** for M2:
    "Extra Points" = flat 8, paid by every non-winner regardless of method.
    - **Self-drawn win**: each of the 3 other players pays `8 + BasicPoints` to the winner.
    - **Discard win**: the discarder pays `8 + BasicPoints`; the other two players each pay
      `8` (Extra Points only).

11. **"Concealed" pung/kong for scoring purposes (fans like #12 Four Concealed Pungs, #33
    Three Concealed Pungs, #56 Fully Concealed Hand, #62 Concealed Hand) — a set completed by
    the winning tile itself (self-draw or discard) still counts as concealed**, as long as it
    was never claimed with an explicit call mid-hand. Implemented in
    `scoring/set-helpers.ts`'s `CombinedSet.concealed`: true for every set derived from
    `decomposeHand`'s concealed-tile decomposition (which includes the appended winning tile)
    and for a concealed kong; false only for an exposed meld (a pung/chow/kong actually
    claimed from a discard, or a promoted kong).
    Status: **provisional** — this is the common interpretation across most mahjong rulesets,
    but not a statement I found explicitly in the available MCR text. Revisit if a rulebook
    passage addressing this specific nuance turns up (e.g. while implementing fan #56/#62,
    which hinge on the same distinction).

12. **Greater Honors and Knitted Tiles (fan #20) — exact tile-composition rule**, resolved by
    rendering Appendix 1 page 29's worked example directly (image, not text extraction — the
    tile diagrams are pictures that `pdftotext` can't read). The example shows: all 7 distinct
    honors (E/S/W/N/Red/Green/White) + 7 suit singles split 3+2+2 across three DIFFERENT
    knitted sequences ({1,4,7}/{2,5,8}/{3,6,9}), one sequence per suit — e.g. Characters 1,7
    (2 of "1-4-7"), Dots/Bamboo covering the other two sequences. Implemented as: 14 distinct
    singles total (no pair, no melds — matches §3.7.2.2 shape 3), exactly 7 honors, and the
    remaining 7 suit tiles partitioned so each suit's ranks all share one knitted-sequence
    residue (`rank % 3`) and all three sequences are used across the three suits.
    Status: **the 7/7 honor-vs-suit split and the "3 different sequences, one per suit" rule
    are confirmed by the example**; the specific 3/2/2 per-suit count is *not* asserted as a
    fixed formula — only that specific example happens to use it — the implemented rule
    allows any non-empty per-suit split summing to 7, which is the more general reading both
    the text and the example support. Revisit if a cleaner example or additional worked case
    ever contradicts the "any non-empty split" assumption.

13. **Fan #45 (Last Tile Claim) and fan #46 (Out with Replacement Tile) textually overlap —
    confirmed in the rulebook's own summary table (§3.8.1 p.16, rendered directly as an image
    to check this precisely), not an extraction error.** Fan 45: "The last tile (of the game)
    discarded by another player." Fan 46's own text, verbatim: "Going out (making mahjong) off
    the discard which is the last tile in the game. Going out (making mahjong) on the
    replacement tile drawn after achieving a kong (not on a Flower replacement)." Fan 46's
    first clause is the *identical* condition as fan 45's entire definition. No exclusion
    between 45 and 46 is stated anywhere (unlike fan 44's explicit "points for Self-Drawn may
    not be combined" note, or fan 47's "points for Last Tile may not be combined" note).
    Implemented literally: both fans fire together whenever a discard win happens to be the
    literal last discard of the game (scoring 8+8=16 for that specific rare event), per
    `scoring/fans-8.ts`'s `detectLastTileClaim`/`detectOutWithReplacementTile`.
    Status: **provisional** — this reads as a genuine rulebook redundancy (or an intentional
    double-award for a specific rare event) rather than a translation artifact, but no
    corroborating source was checked. Revisit if this combination ever looks wrong in practice
    (e.g. once the scorer is wired into live play and this scenario actually occurs).

14. **M2's final three point tiers (4/2/1) — the fan-scoring system is now 100% complete
    (81/81 fans have metadata; 78 have detectors — 43 and 81 are deliberate whole-scorer/
    settlement fallbacks, not per-fan detectors).** Several judgment calls made closing out
    this last stretch:
    - **A real architectural bug, found and fixed**: fans 6 (Seven Shifted Pairs), 7
      (Thirteen Orphans), and 19 (Seven Pairs) re-derived their shape from raw
      `concealedTiles` instead of checking `ctx.specialShape`/`ctx.decomposition`. Since
      `scoreHand` trials the *same* 14 tiles as several independent candidates (the special
      shape, plus every standard decomposition `decomposeHand` finds), an ungated detector
      could fire on a standard-decomposition candidate too, illegitimately stacking a
      pair-based fan onto sets that candidate is reading as chows/pungs instead — a direct
      violation of the Non-Separation Principle (§3.9.1.5). Surfaced once the 1/2-point
      tiers added chow/pair-based fans that could piggyback this way (Seven Shifted Pairs
      jumped from a clean 88 to 95). Fixed by gating all three on `ctx.specialShape`.
    - **Outside Hand (55)** implemented literally: every set (chow, pung, kong) *and* the
      pair must individually contain a terminal or honor tile — a chow only qualifies if it
      touches a terminal (1-2-3 or 7-8-9, not a middle run), a pung/kong/pair qualifies only
      if its own tile type *is* one (a pung is 3 identical tiles, so "contains" and "is" are
      equivalent for it).
    - **One Voided Suit (75)** implemented as *exactly* 2 suits used, not "at most 2" —
      a 1-suit hand is Half/Full Flush's territory instead. Not a direct rulebook quote;
      the alternate ("at most 2") reading would make this fan silently stack onto every
      Half/Full Flush hand too, which reads wrong. **Status: provisional.**
    - **Last Tile (58)**, **Prevalent Wind (60)** / **Seat Wind (61)** all need context the
      live engine doesn't populate yet (cross-table tile visibility; a prevailing/seat wind
      concept at all — `game-state.ts` has neither). Added as new optional `HandContext`
      fields (`isLastCopyOfItsKind`, `prevailingWind`, `seatWind`), same "declared now, wired
      from real game state later" pattern as the 8-point tier's win-circumstance fields.
    - **Edge/Closed/Single Wait (77/78/79)** — implemented properly, not approximated: added
      a `winningTile` context field, then for a given decomposition candidate, removed that
      tile from the hand and checked *all 34 standard tile types* against
      `isWinningHand` to count how many independently complete the pre-win 13 tiles. Each
      fan's own text includes "(not valid if waiting for more than one tile)" — this is
      exactly that check, not a simplification: only when exactly one type completes the
      hand does a shape get classified (pair-match → Single; middle-of-a-chow → Closed;
      the "3" of 1-2-3 or "7" of 7-8-9 specifically → Edge, since no tile exists on the far
      side of either). The one residual limitation: it evaluates one decomposition candidate
      at a time, consistent with how every other fan here works.
    - **Several new DERIVED exclusions** (same "not a literal rulebook quote, but a direct
      logical consequence" category as the earlier `[8,18]`/`[11,18]`/`[6,19]` entries),
      needed because this session introduced the first *generic, per-unit countable* fans
      (Dragon Pung 59, Double Pung 65, Mixed Double Chow 70, Concealed Kong 67, Melded Kong
      74) — each of which unavoidably also fires whenever a same-family *named exact-count*
      fan fires for the same physical sets: `[54,59]`, `[32,65]`, `[41,70]`, `[48,67]`,
      `[57,74]`, `[38,73]`. Also added `[28,71]`/`[28,72]` (Pure Straight trivially contains
      a Short Straight and a Two-Terminal-Chows sub-shape), `[56,80]` (Fully Concealed Hand
      requires self-draw by definition, same as Self-Drawn), and `[6,76]` (Seven Shifted
      Pairs can never include an honor tile — honors have no rank — so it's unconditionally
      also "No Honors").
    - **Fan 81 (Flower Tiles)** has no detector in `fans-1.ts`, same as Chicken Hand (43):
      it's scored via `settlement.ts`'s separate `flowerPoints`, never as a `basicPoints`
      fan match.

15. **8-point win-legality gate now enforced (M5) — cross-references item #7.** §3.9.1.1
    (p.18), exact quote: "when all its associated Fan are added, they must total at least 8
    points or more." Item #7 already confirmed flower points are excluded from this check;
    what was still missing, until M5, was the check itself — `moves.ts` only ever verified
    *structural* completeness (`isWinningHand`), never the point total, so a hand scoring 1-7
    points (Chicken Hand's 8-point fallback, fan 43, only fires when a hand would otherwise
    score exactly 0 named fans — not when it scores some small amount under 8) could be, and
    was, declared a legal win. Fixed via `scoring/derive-context.ts`'s
    `buildProspectiveScoreHandParams`/`MINIMUM_POINTS_TO_WIN`, wired into `moves.ts` at both
    advisory sites (`legalDiscardPhaseMoves`, `computeClaimOptionsForSeat`) and as a safety-net
    throw in `finalizeWin`. Proven with a fixture scoring exactly 4 points (Dragon Pung +
    Concealed Hand) that used to pass and is now correctly rejected.

## Non-rulebook additions (explicitly NOT sourced from mcr_EN.pdf)

15. **Shanten calculator (M4, `packages/engine/src/shanten.ts`)** — the three formulas
    below are standard mahjong-theory results (shanten-calculation literature), not derived
    from or citable to `mcr_EN.pdf`, which never discusses "how close to winning" as a
    structural concept. Recorded here explicitly so they are never later mistaken for a
    rulebook-sourced rule the way every other entry in this file is:
    - **Standard shape (4 sets + pair)**: `shanten = 8 - 2*(melds + S) - T - P`, where `S` =
      complete sets, `T` = partial sets (taatsu), capped so `melds + S + T <= 4`, and `P` = 1
      if a pair is reserved as the head. Verified against this repo's own `tenpaiWaitingOnC5`
      fixture and a battery of hand-built cases spanning shanten -1 through the theoretical
      max of 8.
    - **Seven Pairs**: `shanten = 6 - pairs + max(0, 7 - kinds)`.
    - **Thirteen Orphans**: `shanten = 13 - kinds - hasPair`.
    All three are cross-checked computationally against the already-rulebook-validated
    `isWinningHand` (M1) via a property test (`shanten <= -1 <=> isWinningHand`), so while the
    *formulas* are borrowed theory, their *behavior* is still validated against this project's
    ground truth, not just against each other.

16. **Defense/danger indicator (M5, `packages/engine/src/defense.ts`) — deliberately NOT
    rulebook-sourced, and not meant to be.** SPEC.md §9 frames this as a teaching heuristic
    ("teaches the defensive half of strategy"), not a rules mechanic, so `assessTileSafety`'s
    three signals (every opponent already discarded a tile → low risk; an opponent with 2+
    exposed melds concentrated in that tile's suit → high risk; nobody having discarded it yet
    this deep into the hand → medium/"untested") are common cross-variant mahjong strategy
    conventions, not MCR rules. In particular, the classic "genbutsu" safety read (a tile an
    opponent already discarded can't complete their hand) is a Japanese-mahjong furiten
    convention — MCR's own furiten status is genuinely unconfirmed in the available rulebook
    text (never addressed anywhere in `mcr_EN.pdf`), so this is presented in the UI as a
    heuristic signal, not a guarantee.

17. **Wall pointer model — CORRECTED, was wrong (Phase 8 live-wall investigation).** Kong
    replacement draws (concealed, added, claimed) and every flower replacement — including
    flower replacements that occur during the initial deal — come from the **back end** of the
    wall, not the front. **Status: CONFIRMED, unambiguous, cited twice**: §3.6.8 "How to Kong"
    (p.12) says so directly for kong replacements ("take a replacement tile from the back end
    of the wall"); §3.4.20 "Flower replacement ('Bu Hua')" (p.6) — a general glossary
    definition, not scoped to dealing — says the same for flowers, and is exercised again
    verbatim at §3.5.7 item 6 (p.11) for the deal-time flower check specifically. Ordinary turn
    draws and the initial deal's own primary tiles come from the front (§3.5.7 item 5, p.10,
    "clockwise from the break").

    Before this fix, `packages/engine/src/wall.ts`'s `Wall` was a single `{ tiles, drawIndex }`
    monotonic counter — every draw (deal, normal turn, AND every kong/flower replacement) came
    from the same front-advancing index. This was a genuine rules deviation in the engine, not
    merely a rendering gap: `moves.ts` silently drew every replacement from the wrong end.
    Fixed to `{ tiles, frontIndex, backIndex }`, two independent pointers; `drawTile`/
    `drawWithFlowerReplacement` now take an explicit `'front' | 'back'` end, and every call site
    in `moves.ts` passes the correct one. Confirmed behaviorally identical in every way that
    matters to scoring: `drawableRemaining` (`backIndex - frontIndex + 1`) still matches the
    old `tiles.length - drawIndex` count draw-for-draw, so fan 44 (Last Tile Draw), fan 45
    (Last Tile Claim), and fan 46 (Out with Replacement Tile) — which only depend on wall
    emptiness and action-log adjacency, never on which physical tile is drawn — fire on exactly
    the same turns as before. Full fan/scoring suite (246 tests) re-run after the fix with zero
    behavioral changes to any existing test's expectations.

    **Open (real, flagged, not resolved)**: the rulebook states the physical draw direction for
    the *initial deal* explicitly (§3.5.7 item 5, "clockwise from the break"), but never
    restates it for ordinary post-deal turn draws (§3.6.3 only says a player draws, not which
    direction along the wall). Continuing the same physical direction is a reasonable inference
    by continuity, used for Phase 8's rendering, but is not a directly quoted rule for the
    in-play case.

    **Rendering convention, not a rulebook rule**: this app's wall renders as one shared ring
    (top/bottom/left/right of the discard field), not four separate per-seat walls the way a
    physical table has them, and the engine models no real dice/break-point at all (a
    pre-shuffled array drawn sequentially is statistically identical to a dice-rolled break —
    nothing about fairness depends on simulating the roll). Phase 8's rendering anchors the
    break position to the current dealer's seat (`state.dealerSeat`, already tracked, already
    replay-safe, already rotates hand-to-hand per item #4), per §3.5.7 item 5's "counting from
    the right-hand end of the dealer's own wall" — the closest faithful mapping onto a single
    shared ring. The rulebook does not itself dictate a convention for a single shared ring, so
    this is documented here as an explicit UI decision, not a rules citation.

18. **Route-aware discard ranking, Stage 1 (`packages/engine/src/bots/policy.ts`'s
    `rankDiscards`/`computeRouteRegret`, KICKOFF-phase10-strategy-coach.md) — deliberately NOT
    rulebook-sourced.** Like item #15's shanten calculator, this is mahjong-strategy theory
    (a discard-ranking heuristic), not anything `mcr_EN.pdf` addresses — the rulebook defines
    what a legal/winning hand and its score are, never how a player *should* choose among legal
    discards. Two hand-tuned constants govern it, both named and commented in `policy.ts` as
    explicitly Stage-2-replaceable, not derived from theory:
    - `EARLY_GAME_MIN_SHANTEN = 3` — at or above this many shanten from tenpai, ranking
      considers which alternate hand-shape "routes" (Standard/Seven Pairs/Thirteen Orphans) a
      candidate discard keeps alive, not just raw outs; below it, ranking is exactly the
      pre-Stage-1 greedy rule (most outs, then honor/terminal-first, then fixed type order).
    - `VIABLE_ROUTE_SHANTEN_MARGIN = 1` — a route counts as "in play" this turn if the best any
      candidate discard could achieve for it is within this many shanten of the overall best
      achievable shanten.
    Both were picked and verified against this phase's own fixture hands (`hints.test.ts`,
    `policy.test.ts`), not by feel alone.

    **Self-play merge gate — INCONCLUSIVE, not confirmed either way (2026-08-03).** The doc's own
    merge gate (`bots/selfplay-compare.test.ts`, `SELFPLAY_COMPARE=1` — not part of the default
    suite) was actually run at the specified "several hundred seeds": 300 seeds, `newWins=122
    oldWins=142 draws=36`. This entry previously claimed the gate was "checked... per the doc's
    own merge gate" without citing that number — that was wrong; the number was never a pass.
    Read honestly, though, it is *not* a confirmed regression either: 264 decisive games, and
    under a null of "no real difference" (p=0.5 each) the expected split is 132/132 with sd ≈
    √(264 × 0.25) ≈ 8.1. 122 is (132 − 122) / 8.1 ≈ 1.2 sd below expectation, two-tailed p ≈ 0.22
    — well short of significant. The earlier pre-cap diagnostic cited above the constants
    (119 vs 145, same 300-seed scale) is ≈ 1.6 sd, also not significant on its own. Critically,
    the two runs are **not independent confirmations** of each other — same seed range, same
    engine, one is just the other with `MAX_UKEIRE_SACRIFICE_FOR_FLEXIBILITY` added — so they
    don't compound into stronger evidence of a real effect. Resolving this properly needs on the
    order of 2000 seeds — not yet run. See KICKOFF-phase10-strategy-coach.md's "State of play"
    section for the decision this blocks and what to do once a real number exists.

    **Third data point, 300 seeds, 2026-08-06 — still not the 2000-seed run this needs, reported
    honestly as a third underpowered sample, not a resolution.** Run at the tail end of an
    unrelated scoring-validation session (time-permitting work, explicitly no code changes made
    based on the result): `newWins=117 oldWins=132 draws=51 mixedWins=0`. 249 decisive games,
    expected split 124.5/124.5 under the null, sd ≈ √(249 × 0.25) ≈ 7.9. 117 is
    (124.5 − 117) / 7.9 ≈ 0.95 sd below expectation, two-tailed p ≈ 0.34 — the *weakest* signal
    of the three runs, individually. **Important caveat this run adds, not just repeats**: this
    test always sweeps seeds `0..SEED_COUNT-1` from zero, so all three 300-seed runs used the
    *exact same seed range* — this run is not a fresh independent sample of NEW seeds, it's a
    re-measurement of the same 300 hands under whatever `packages/engine` looked like at the
    time. Between the second run (2026-08-03) and this one, substantial unrelated scoring-engine
    work landed (this session's own Step 4/5 fixes, plus everything since) — `legalMoves`'s win
    detection and the shanten/route computations `rankDiscards` depends on both consume
    `scoreHand`'s output, so a changed engine can genuinely change how these exact same seeds
    play out, which is presumably why the tally differs from run 2 rather than reproducing it
    bit-for-bit. So this is a third measurement under a third distinct condition, not a third
    independent sample in the statistical sense — pooling it with the first two for a combined
    significance test would be invalid without accounting for that.

    **Honest read of all three together: neutral to slightly negative, not "no consistent
    signal."** All three runs land on the SAME side (`newWins < oldWins`) by a comparable
    magnitude (≈1.6, ≈1.2, ≈0.95 sd), and none individually clears conventional significance. A
    naive pool (treating all three as independent, which per the caveat above they are not) gives
    `newWins=358 oldWins=419` across 777 decisive games — (388.5 − 358) / √(777 × 0.25) ≈ 2.19 sd,
    two-tailed p ≈ 0.03, which WOULD cross p<0.05 if the independence assumption held. It doesn't
    fully hold (same seed range every time, two of three runs sharing one engine state), so this
    pooled figure is illustrative of "the direction keeps repeating," not a valid combined test —
    treat it as a reason to actually run the real 2000-fresh-seed test, not as a substitute for
    it. **Still no code changed based on any of this** at the time it was written — see the
    revert below, decided the same day on the strength of these three runs together.

    **REVERTED, 2026-08-06 — the negative branch of this item's own decision tree
    (`KICKOFF-phase10-strategy-coach.md`).** Three self-play runs now exist, all 300 seeds:
    `oldWins=145 newWins=119` (pre-cap diagnostic), `oldWins=142 newWins=122` (the doc's own
    merge gate, actually run), `oldWins=132 newWins=117` (the third run above). **Every run lands
    on the same side — the regret-aware ranking has never once shown newWins >= oldWins, the
    doc's own stated bar for keeping it — and none individually reaches significance.** Per the
    reasoning above, the three are not independent samples (shared seed range 0-299 throughout;
    runs 2 and 3 additionally share engine state with each other more than with run 1), so this
    is NOT "three failed attempts to prove a regression" — it's better read as "the ranking has
    had three chances, under three different conditions, to show a real benefit, and has not
    shown one in any of them." That is the basis for reverting: not a confirmed-significant
    regression, but an unvalidated constant with zero supporting evidence across every
    opportunity it's had to produce any, kept in production code making real bot/hint decisions.
    Reverted `rankDiscards` (`bots/policy.ts`) to the pre-Stage-1 greedy comparator
    (`legacyDiscardCompare` alone) — removed `computeRouteRegret` and its two ranking-side
    constants (`EARLY_GAME_MIN_SHANTEN`, `MAX_UKEIRE_SACRIFICE_FOR_FLEXIBILITY`) from that file
    entirely. **Display-side Stage 1 work is explicitly KEPT, per the doc's own reasoning that
    it — not the ranking — is what actually fixed the reported problem**: `evaluateDiscards`'
    per-candidate routes, `BestMoveHint`'s structured output, confidence, alternatives, and both
    rebuilt tabs all still work exactly as before. This required relocating (not deleting)
    `computeRouteRegret` and `VIABLE_ROUTE_SHANTEN_MARGIN` from `policy.ts` into `hints.ts` —
    the KICKOFF doc's own claim that "`hints.ts`'s features/routeTable computation doesn't
    depend on `rankDiscards`' comparator logic itself" was correct in spirit but understated in
    practice: `hints.ts` imported `computeRouteRegret`/`VIABLE_ROUTE_SHANTEN_MARGIN` from
    `policy.ts` directly, for confidence/alternatives/route-viability, not merely
    `evaluateDiscards`' routes — a real code dependency the split had to account for, found by
    attempting the revert and reading the actual import graph, not by re-trusting the doc's own
    prediction. Both fixture tests asserting the old regret-aware recommendation (`kickoffLiveHand`
    in `hints.test.ts`) were updated to the new, correct, greedy recommendation (a 2C, exactly the
    pre-Stage-1 answer) rather than deleted — the route table still correctly shows Standard and
    Seven Pairs both structurally alive regardless of which tile is recommended, since viability is
    judged against the best any candidate could achieve, not the recommended candidate alone; this
    is the concrete case for "the coach shows the flexibility, the bot doesn't need to enforce it."
    Full engine + UI suites green (packages/engine 445 passed/1 skipped; packages/ui 395 passed),
    typecheck clean, both packages.

    **A properly-powered run remains available if this question is ever reopened**: 2000 seeds, a
    FRESH seed range (not `0..1999` from the same generator, which would just re-run seeds 0-299
    yet again as a prefix — pick a disjoint range or add a seed-offset parameter to
    `selfplay-compare.test.ts`), and a raised test timeout (the current hardcoded 20 minutes fits
    ~300 seeds at ~1.5s/seed; 2000 needs roughly 50 minutes). None of that was done here — this
    session's third run stayed at 300 seeds specifically because the timeout couldn't be changed
    without editing the test file, which was out of scope for a "report honestly, change no code"
    request.

    **Downstream effect on Stage 2's own premise** (this item's original text, still accurate):
    with Stage 1's ranking now confirmed-negative-in-direction (not confirmed-significant, but
    never once positive either) rather than merely unresolved, Stage 2's depth-2 evaluation
    ("flexibility falls out of the arithmetic instead of a penalty constant") is now THE thing
    being bet on to make route-awareness pay for itself in bot play — see
    `KICKOFF-phase10-strategy-coach.md`'s updated state-of-play. Stage 2 itself was not started
    this session.

19. **Validation harness Stage 1 (`KICKOFF-validation-harness.md`) — the PyMahjongGB cross-check
    now exists and has been run for real (2026-08-05).** 1200 hands generated (seed range: run
    seed `20260805`, per-hand seeds derived from it via the engine's own `mulberry32`/`nextSeed`;
    52 hand-crafted "targeted" cases plus 1148 random cases across the standard/seven-pairs/
    thirteen-orphans shapes — see `validation/README.md` for the exact rerun command),
    scored by both this engine's `scoreHand` and PyMahjongGB 1.3.0, compared at both the
    points level and the exact fan-multiset level (`validation/compare.py`). **This is the
    first number CLAUDE.md's scoring-validation rule can point to; see item below restoring
    that rule to a truthful state.**
    - **Coverage: 77/81 fans exercised at least once.** The 4 uncovered are fan 81 (Flower
      Tiles — out of scope by design, every generated case has `flowerCount: 0` since
      `scoreHand` never takes one) and fans 20/34/35 (Greater/Lesser Honors and Knitted
      Tiles, Knitted Straight) — a genuine, newly-found engine gap, not a generator
      shortfall: see the next bullet.
    - **NEW real bug, more severe than item #6's "not yet implemented" framing suggested:
      `decomposeHand` has no notion of a "knitted" set at all**, so `isWinningHand` returns
      `false` for every hand fans 20/34/35 require — a player could never even legally
      declare such a hand won (`moves.ts`'s win-legality gate calls `isWinningHand`
      directly), and `scoreHand` returns `{fanMatches: [], basicPoints: 0}` for one, not even
      Chicken Hand's 8-point floor. The three fans' own detector functions are correctly
      implemented and unit-tested (`fans-24.test.ts`/`fans-12.test.ts`) — the gap is entirely
      in candidate generation never producing a matching `HandContext` for the detectors to
      run against, meaning they are currently dead code. Permanent fixture:
      `packages/engine/src/win-detection.test.ts`'s "KNOWN BUG" `describe` block (two cases:
      a valid Knitted Straight and a valid Greater Honors and Knitted Tiles hand, both
      asserting `isWinningHand(...) === false`, which is the wrong answer). **Not fixed here**
      per this phase's "no game logic changes" scope — tracked below.
    - **Six confirmed engine bugs, each a missing entry in `exclusions.ts`'s Non-Repeat table,
      found by cross-referencing PyMahjongGB's own suppression logic
      (`fan_calculator.cpp`'s `adjust_fan_table`) fan-by-fan.** Each has a permanent fixture in
      `packages/engine/src/scoring/exclusions.test.ts` (plus one in `fans-2.test.ts` for the
      Tile Hog case, which is a detector bug rather than a missing exclusion) asserting the
      current wrong `areExclusive(...) === false`; the fix (adding the pair, or for Tile Hog,
      correcting the chow-handling) is separate follow-up work, not done in this phase. 1200-hand
      occurrence counts (a hand can trip more than one):
      - 113x — Fully Concealed Hand (56) should be excluded by any fan whose own definition
        already requires full concealment: Nine Gates (4) and Four Concealed Pungs (12)
        explicitly (PyMahjongGB's own comment: "把不求人修正为自摸" — "correct Fully Concealed
        Hand to Self-Drawn"), plus Seven Shifted Pairs (6), Seven Pairs (19), and Thirteen
        Orphans (7) implicitly (PyMahjongGB's special-shape path never calls the function that
        sets Fully Concealed Hand at all). Missing: `[4,56]`, `[6,56]`, `[7,56]`, `[12,56]`,
        `[19,56]`.
      - 90x — Prevalent Wind (60) / Seat Wind (61) should exclude Pung of Terminals or Honors
        (73) for the *same physical wind pung* — PyMahjongGB never double-awards it. Missing:
        `[60,73]`, `[61,73]`.
      - 78x — **Tile Hog (64) detector bug, not a missing exclusion.** `detectTileHog`
        (`fans-2.ts`) sums a meld's contribution as `meldTileTypeId(meld)` (the chow's *lowest*
        tile) `+= meld.tiles.length`, which is correct for a pung/kong (all tiles really are
        that one type) but wrong for a chow: it attributes all 3 of the chow's *different*
        tiles to a single count bump on the low tile's type instead of crediting each of the
        3 distinct types +1. A real Tile Hog spanning an exposed pung plus an adjacent exposed
        chow is silently missed.
      - 52x — All Simples (68) / Pure Terminal Chows (13) should exclude No Honors (76) — the
        same pattern our table already has for 8 *other* fans ([8,76] etc.), just missed for
        these two. Missing: `[68,76]`, `[13,76]`.
      - 31x — Out with Replacement Tile (46) should exclude Self-Drawn (80) — its own
        definition requires self-draw (PyMahjongGB: "杠上开花不计自摸"), same pattern as the
        already-present `[44,80]`. Missing: `[46,80]`.
      - 1x — All Green (3) currently has **zero** exclusion entries at all; should exclude Half
        Flush (50) and One Voided Suit (75) (PyMahjongGB: "绿一色不计混一色、缺一门"). Missing:
        `[3,50]`, `[3,75]`.
    - **One confirmed point-value divergence, not yet triaged against the rulebook.** Fan 48
      "Two Concealed Kongs": `registry.ts` lists it at 8 points in its own tier (cited to
      §3.8.1); PyMahjongGB's `fan_value_table` lists the identically-named fan at 6 points,
      grouped with All Pungs/Half Flush/Mixed Shifted Chows/All Types/Melded Hand/Two Dragons
      Pungs. Recorded in `validation/fan-map.json`'s `_pointValueDivergence` note and filed
      `their_bug` in `validation/allowlist.py` provisionally (our own registry cites a
      rulebook section already; PyMahjongGB is "a second opinion, not an oracle" per
      `KICKOFF-validation-harness.md` 1e) — **genuinely needs a `rules-lawyer` pass against
      §3.8.1's table directly before either side is trusted over the other.**
    - **One genuine rulebook ambiguity, now backed by independent-implementation evidence —
      item #11 above.** PyMahjongGB marks a pung as *exposed* for scoring whenever it's
      completed by a discard or robbed-kong win (not a chow) — the common "a triplet completed
      by ron isn't concealed" convention from other mahjong families
      (`fan_calculator.cpp`: "点和的牌张，如果不能解释为顺子中的一张，那么将其解释为刻子，并标记这个
      刻子为明刻"). Item #11's provisional ruling says the opposite. This was, by a wide
      margin, the single largest source of mismatches in the 1200-hand run (96 hands
      classified `ambiguity`, plus it's the majority contributor inside several of the
      `our_bug` counts above via interaction — e.g. downgrading Four Concealed Pungs to Three
      Concealed Pungs also changes which Non-Repeat suppression applies). **Per
      `KICKOFF-validation-harness.md` 1e's explicit instruction, item #11's ruling is NOT
      changed here without a rulebook citation** — this entry exists so the evidence is on
      record for whoever revisits it. Still provisional.
    - **180 of 1200 hands (15%) remain genuinely unclassified** — mostly combinations of the
      root causes above (e.g. a hand hitting both the concealment ambiguity AND a missing
      Fully-Concealed-Hand exclusion simultaneously isn't caught by either classifier pattern
      alone) plus at least one more not-yet-isolated interaction involving Outside Hand (55)
      that a `targeted-1-big-four-winds` case surfaced but wasn't chased to a root cause.
      Tracked as follow-up, not swept under the rug — see `validation/compare.py`'s own
      `--json-report` output for the full list, reproducible from `runSeed=20260805`.
    - **`CLAUDE.md`'s scoring-validation rule restored to a truthful, satisfiable state** (was
      unconditionally unsatisfiable since it was written — see that file's own updated wording
      and `validation/README.md` for how to rerun).

20. **Knitted-tile shapes (fans 20/34/35) are now reachable — item #19's bug fixed, 2026-08-05.**
    `win-detection.ts` gained `isHonorsAndKnittedTiles` (the shared shape behind fans 20/34: 14
    distinct single tiles, no pair, no melds — honor count 5/6/7, suit tiles partitioned across
    the 3 suits with each suit's ranks sharing one knitted sequence and all three sequences
    used) and `knittedStraightRemainders` (fan 35: the 9-tile knitted pattern stands in for 3 of
    the standard 4 sets, decomposing whatever's left via the same core search `decomposeHand`
    already used — extracted into `decomposeWithSetsNeeded` so both share one implementation).
    Both are wired into `isWinningHand` and `scoreHandDetailed`'s candidate generation. Tile
    compositions implement item #6's shape-4 recognition and item #12's Greater-Honors split
    exactly as already ruled there; no new tile-composition ruling was needed for fans 20/34.
    - **Fan 35's structure verified directly against `mcr_EN.pdf` via `rules-lawyer` before
      implementing** (not from the pre-existing `fans-12.ts` code comment alone, per CLAUDE.md's
      "never implement from memory" rule — that comment turned out to be correct, but it hadn't
      been independently re-checked since it was written). **§3.8.1 p.15 and Appendix 1 p.34,
      exact quote**: "A special Straight which is formed not with standard chows but with 3
      different Knitted sequences. For example, 1-4-7 of Dots, 2-5-8 of Characters, and 3-6-9 of
      Bamboos - but not necessarily in this order." Confirmed as the pair+extra-set shape (NOT
      fan 20/34's no-pair 14-singles shape) by: (a) the text itself calling it "a special
      Straight" — the rulebook's term for a set-based shape (fan 28 Pure Straight, fan 39 Mixed
      Straight), never used for the no-pair shapes; (b) fans 20/34's own text explicitly says
      "singles" and fan 35's never does; (c) Appendix 1 p.34's three worked examples, one
      captioned "Combined with Tile Hog" (fan 64) — Tile Hog requires a repeated tile type
      appearing outside a Kong, structurally impossible under a no-duplicate 14-distinct-singles
      shape, so the example alone rules out the no-pair reading.
    - **Real bug found and fixed in the SAME pass, before it ever shipped**: 7 existing fan
      detectors trusted `allSets(ctx.melds, ctx.decomposition)` to represent the hand's complete
      4-set picture — true for every candidate type that existed before this fix, but violated
      by the new Knitted Straight candidate (whose `decomposition` covers only the 0-1 real sets
      left over after the 9 knitted tiles are set aside; the other 3 "sets" are invisible to
      `allSets()`). Detectors making a universal claim across `sets` (`.every(...)` or an
      equivalent loop) without first checking `sets.length === 4` would pass vacuously or
      incompletely on the short list. Found by a full audit of every `allSets(` call site in
      `scoring/fans-*.ts`, confirmed live via the validation harness (`targeted-35` scored a
      spurious "All Terminals and Honors" before the fix). Fixed by adding the same
      `sets.length !== 4` guard the safe detectors already used, to: `detectAllChows` (63,
      fans-2.ts), `detectOutsideHand` (55, fans-4.ts), `detectAllPungs` (49, fans-6.ts),
      `detectAllFives` (31, fans-16.ts), `detectAllEvenPungs` (21, fans-24.ts),
      `detectAllTerminalsAndHonors` (18, fans-32.ts), `detectAllTerminals` (8, fans-64.ts) and
      `detectAllHonors` (11, fans-64.ts) — **committed separately from this item** (its own
      commit, so it can be reverted alone if the guard pattern ever turns out wrong) even
      though it was found and fixed in the same working session. Every one of these guards is
      a structural no-op for every pre-existing candidate type (their `sets.length` was already
      always 4) — confirmed by the full 430-test engine suite staying green with zero
      behavioral change to any existing fixture. Regression test: `score-hand.test.ts`'s "does
      not let a Knitted Straight hand falsely trigger whole-hand-universal fans".
    - **Reaches the player, not just the scorer — verified end-to-end.** `moves.ts`'s
      `legalDiscardPhaseMoves`/`computeClaimOptionsForSeat` (the sole gate behind both
      `TurnActionPrompt`'s "Declare win" button and `ClaimPrompt`'s "Win" button) call
      `isWinningHand` directly with no other wiring needed — both UI prompts are driven purely
      by `legalMoves`, so the win-detection.ts fix propagates automatically. Added UI-level
      tests for both paths: `TurnActionPrompt.test.tsx`'s "offers a self-drawn win on a Knitted
      Straight hand" and `ClaimPrompt.test.tsx`'s "offers a win when a discard completes a
      Knitted Straight hand".
    - **Harness re-run after the fix**: coverage rose from 77/81 to **80/81** — the only fan
      still uncovered is #81 (Flower Tiles), out of scope by design (§19). Added 3 new targeted
      generators (`targeted-20/34/35`) to `validation/`'s harness itself, which had been
      deliberately skipping these fans pending exactly this fix. `targeted-20` (Greater Honors)
      scores an EXACT match against PyMahjongGB (24 pts both sides). `targeted-35` (Knitted
      Straight) also scores an exact match (15 pts: fan 35 + Concealed Hand + Pung of Terminals
      or Honors on both sides) — direct confirmation that App.1 p.35's Example 3 caption
      ("Combined with... Pung of Terminals or Honors") is correctly implemented.
      `targeted-34` (Lesser Honors) does NOT match — see the next two `ambiguity`/`their_bug`
      findings below, both new.
    - **New `their_bug` finding**: PyMahjongGB's `calculate_honors_and_knitted_tiles`
      additionally sets `KNITTED_STRAIGHT` whenever `LESSER_HONORS_AND_KNITTED_TILES` fires AND
      the hand's suited-tile count is exactly 9 (`if (numbered_cnt == 9) { fan_table[
      KNITTED_STRAIGHT] = 1; }`) — i.e. it stacks fan 35 onto ANY 5-honor/9-suit Lesser Honors
      hand, even though that hand has no pair and no extra set at all (the no-pair 14-singles
      shape, not fan 35's shape). Not supported by §3.8.1/App.1 p.34's text (see above) — filed
      `their_bug` in `validation/allowlist.py`, not implemented.
    - **New evidence for the already-provisional item #13**: the same `targeted-34` case's win
      circumstance happened to land on a plain last-discard win, and our engine's fan 46 (Out
      with Replacement Tile) fired alongside fan 45 (Last Tile Claim) per item #13's reading —
      but PyMahjongGB's `adjust_by_win_flag` gates fan 46 ONLY on `WIN_FLAG_ABOUT_KONG`, a
      completely separate flag from `WIN_FLAG_WALL_LAST` (which alone drives fan 44/45), and
      never stacks 46 onto a plain last-discard win. Item #13 already said "revisit if this
      combination ever looks wrong in practice" — recorded here as that revisit. Still
      provisional; not changed without a direct rulebook citation resolving the overlap either
      way. Filed `ambiguity` in `validation/allowlist.py`.
    - **Harness classifier improved in the same pass**: `validation/allowlist.py`'s
      `classify_mismatch` now peels off every recognized pattern from a mismatch's fan-name diff
      iteratively (not just checking one family at a time), so a hand tripping two independent
      known causes at once — like `targeted-34` above — gets a composed classification instead
      of falling through to unclassified. **This is re-attribution, not resolution**: the 126
      hands that moved out of "unclassified" (181 → 55) were already-mismatched hands that the
      simpler single-family classifier couldn't explain; none of them are newly fixed, and no
      engine behavior changed in this step — only which citation(s) a mismatch is filed under.
    - **A real misattribution this exact change caught, worth recording precisely**: item #19's
      "31x — Out with Replacement Tile should exclude Self-Drawn (missing `[46,80]`)" count was
      wrong from the moment it was written, not a regression introduced by the classifier
      change. The old single-family check (`all_diff_names <= {"Out with Replacement Tile",
      "Self-Drawn"}`) matches a diff of size 1 just as trivially as size 2, so every one of
      those 31 hands — confirmed by direct query, all 31, zero exceptions — was actually a bare
      `{"Out with Replacement Tile"}` diff: item #13's overlap (fan 45/46 both firing on a plain
      last-discard win), not a `[46,80]` Self-Drawn double-count at all. The new peeling
      classifier checks item #13's narrower pattern first and correctly reclassifies all 31 as
      `ambiguity`; the `[46,80]` `our_bug` citation now has **zero** confirmed occurrences in
      this 1200-hand sample (verified directly against the current run, not inferred). **This
      does not mean `[46,80]` is not a real bug** — `fan_calculator.cpp`'s "杠上开花不计自摸" is
      still a direct, unambiguous statement that PyMahjongGB excludes fan 80 whenever fan 46
      fires, and `exclusions.test.ts`'s fixture for it stands on that source-level evidence
      regardless of sample luck — it means this specific 1200-hand/seed-20260805 sample has
      never yet produced a hand that isolates `[46,80]` cleanly from item #13's overlap (would
      need a hand where BOTH fan 46 fires AND our engine's Self-Drawn detector separately fires
      alongside it, on a kong-replacement self-draw specifically — `targeted-46-out-with-
      replacement`'s own case doesn't isolate it either, see that generator). Before fixing
      `[46,80]` in Step 3, re-verify this specific citation empirically rather than trusting the
      family definition alone — the family as currently written is technically correct (a real
      bug) but has not been seen in isolation, only in a form that reads as something else.

21. **Fan 48 "Two Concealed Kongs" point value — CONFIRMED 8 points, `registry.ts` was already
    correct.** Resolved via the same `rules-lawyer` pass as item #20. **§3.8.1 p.16** (summary
    table, the "8" tier spanning fans 43-48: Chicken Hand, Last Tile Draw, Last Tile Claim, Out
    with Replacement Tile, Robbing The Kong, **Two Concealed Kongs**) and **Appendix 1 p.37**
    ("8-Point Fan" section, fan 48's own heading and worked example) both independently state 8
    points, matching `registry.ts` exactly. PyMahjongGB's 6-point figure describes the
    rulebook's ACTUAL 6-point tier (fans 49-54: All Pungs, Half Flush, Mixed Shifted Chows, All
    Types, Melded Hand, Two Dragons Pungs — a real 6-point group, just for different fans) — a
    mismap on PyMahjongGB's side, not a rulebook ambiguity. **No engine change** — `registry.ts`
    stands as-is. Filed `their_bug` in `validation/allowlist.py` with this citation, replacing
    the earlier provisional filing from item #19.

22. **Step 3, fix 1/6: Prevalent Wind (60) / Seat Wind (61) now exclude Pung of Terminals or
    Honors (73) — `[60,73]`/`[61,73]` added to `exclusions.ts`.** Same "named exact-count
    wind/honor fan implies the generic per-unit Pung of Terminals or Honors fan" pattern already
    present in the original rulebook-transcribed table for fans 1/4/8/9/11/18 and the derived
    entry for fan 38 (§3.9.1.5's Non-Repeat Principle: "when a fan is inevitably implied or
    included by another fan, both fan may not be scored") — a Prevalent Wind or Seat Wind pung
    is, by definition, also a wind pung, which trivially satisfies 73's per-pung count for that
    same physical pung. Not a literal quote in either fan's own rulebook text (derived, like
    [38,73]). Evidence this was actually missing: PyMahjongGB's `fan_calculator.cpp` never
    double-awards a wind pung already claimed by the seat/prevalent-wind check in
    `adjust_by_packs_traits` (see the fixture's own comment in `exclusions.test.ts` for the exact
    empirical case). Fixture: `exclusions.test.ts`'s two `it` blocks in the "KNOWN BUG — missing
    exclusion pairs" describe, both flipped `toBe(false) // SHOULD be true` → `toBe(true)`.
    **Harness re-run (1200 hands, seed 20260805, regenerated so `ours` reflects the fix):**
    `our_bug` total 449 → 376 (−73, all ex-`[60,73]`/`[61,73]` hands either now match PyMahjongGB
    exactly or fall through to the item #11 concealment ambiguity alone); `ambiguity` 137 → 156
    (+19, hands that used to combine this bug with item #11's ambiguity now show the ambiguity
    alone); `their_bug` unchanged at 6; **unclassified unchanged at 55** (no new mismatches
    introduced); coverage unchanged at 80/81. Full engine suite green (430 passed, 1 skipped).

23. **Step 3, fix 2/6: Fully Concealed Hand (56) now excluded by five fans that already
    structurally require full concealment — `[4,56]`/`[6,56]`/`[7,56]`/`[12,56]`/`[19,56]`
    added to `exclusions.ts`.** Nine Gates (4), Seven Shifted Pairs (6), Thirteen Orphans (7),
    Four Concealed Pungs (12), and Seven Pairs (19) can each never contain an exposed meld by
    their own definition, so a self-drawn win on any of them was double-scoring the concealment
    itself as both the named fan's value and Fully Concealed Hand's 6pts on top — same
    Non-Repeat Principle (§3.9.1.5) shape as item #22 and the existing `[56,80]` derived entry.
    Not a literal quote in any of the six fans' own rulebook text. Evidence: PyMahjongGB's
    `adjust_fan_table` explicitly downgrades Fully Concealed Hand to plain Self-Drawn for Nine
    Gates and Four Concealed Pungs ("把不求人修正为自摸"), and its special-shape scoring path
    never calls the self-drawn-concealment setter at all for the other three, so 56 can
    structurally never fire for those either. Fixture: `exclusions.test.ts`'s "Fully Concealed
    Hand should be excluded..." describe (renamed from "KNOWN BUG — ..." now that it's fixed),
    all five `it` blocks flipped to `toBe(true)`. **Harness re-run:** `our_bug` 376 → 286 (−90);
    `ambiguity` unchanged at 156; `their_bug` unchanged at 6; **unclassified unchanged at 55**;
    coverage unchanged at 80/81. Full engine suite green (430 passed, 1 skipped).

24. **Correction to item #22: Prevalent/Seat Wind vs Pung of Terminals or Honors needed a
    set-level fix in the detector, not a whole-fan `exclusions.ts` entry — the `[60,73]`/
    `[61,73]` pairs are now REMOVED.** Found while re-running the harness after item #22 landed:
    of the mismatches still citing that family, most had a diff of `{'Pung of Terminals or
    Honors'}` alone, with NO wind fan present — a symptom the family's loose name-overlap check
    (`remaining & family`) shouldn't have been claiming credit for. Direct inspection (seed
    601187264) showed why: our engine scored `{Three Concealed Pungs, All Pungs, Dragon Pung,
    Prevalent Wind, Seat Wind, One Voided Suit, Self-Drawn}` — missing `Pung of Terminals or
    Honors` entirely — while PyMahjongGB scored the same set PLUS `Pung of Terminals or Honors:
    1`, alongside Prevalent Wind and Seat Wind, not instead of them. Fan 73 is a **countable**
    per-unit fan (one `FanMatch` with an aggregated count across every qualifying pung in the
    hand); `resolveFanConflicts` drops a whole `FanMatch`, not a per-set contribution — so the
    `[60,73]`/`[61,73]` pairwise entries were zeroing out fan 73's ENTIRE count (including
    credit for the hand's fourth, unrelated terminal pung) whenever a wind pung was merely
    *present*, not just excluding the one physical pung that actually overlaps.
    **rules-lawyer consulted** (full transcript context: fan 73's own text, "A Dragon pung
    scores 2 points instead," is the only on-point precedent for how this fan resolves overlap,
    and it does so per physical set — confirmed by App.1 p.38's fan 57 example 1, which scores
    Dragon Pung AND Pung of Terminals or Honors side-by-side in the same hand for two different
    physical pungs). No rulebook passage states the Prevalent/Seat Wind exclusion's granularity
    directly (same "derived, not a literal quote" status as before), but fan 73's own dragon
    clause is the closest analogous case and it is unambiguously set-level. **Fix:**
    `detectPungOfTerminalsOrHonors` (`fans-1.ts`) now excludes any set whose `typeId` matches
    `ctx.prevailingWind`/`seatWind` from its own count — by construction, the same way it already
    excludes dragon pungs — instead of relying on a table-level exclusion. `exclusions.ts`'s
    `[60,73]`/`[61,73]` entries removed with a comment explaining why they don't belong there.
    `exclusions.test.ts`'s two fixtures rewritten to assert `areExclusive(60,73)`/`(61,73)` are
    `false` (a documented non-pair, not a bug), with new fixtures added to `fans-1.test.ts`
    covering: an unrelated terminal pung still counts alongside an excluded wind pung; the
    seat-wind case; and a "double wind" pung (matches both prevailing AND seat wind at once)
    excluded exactly once, not double-subtracted. Also removed the now-obsolete
    `[60,73]`/`[61,73]` entry from `validation/allowlist.py`'s `OUR_BUG_FAMILIES` — it was still
    catching 1 residual mismatch under a stale citation after this fix landed; that mismatch now
    correctly falls through to unclassified instead of being hidden behind a closed bug's name.
    **Harness re-run:** `our_bug` 191 → 121 (a further **−70** beyond item #22's own reported
    delta, confirming the whole-fan-drop mechanism was itself causing new mismatches, not just
    failing to fix old ones); `ambiguity` 156 → 195 (+39); `their_bug` unchanged at 6;
    unclassified 54 → 55 (+1, the one hand that was falsely claimed by the now-removed stale
    citation, now honestly reported as needing real triage); coverage unchanged at 80/81. Full
    engine suite green (433 passed, 1 skipped — 3 new fixtures added).

25. **Step 3, fix 3/6: Tile Hog (64) now correctly counts a chow's 3 distinct tile types
    individually, instead of misattributing all 3 to the chow's low tile.** `detectTileHog`
    (`fans-2.ts`) used to add `meld.tiles.length` to `counts[meldTileTypeId(meld)]` for every
    meld — correct for a pung/kong (all physical tiles really share one type) but wrong for a
    chow, where `meldTileTypeId` returns only the low tile's type (`meld.ts`'s "typeId =
    tiles[0]" convention, deliberately used elsewhere for representing a chow AS one set) — so a
    hand with an exposed pung of a tile PLUS an exposed chow starting at that same tile (a
    genuine 4th physical copy, real Tile Hog) silently read as 6 copies of the pung's type and
    never hit the `=== 4` check. Fixed by crediting each meld tile's own type individually via
    `typeIdOfInstance`, only using `meldTileTypeId` for the (correct, pung/kong-only) kong-type
    check. Not a rulebook ambiguity — a straightforward implementation bug; evidence was
    PyMahjongGB's cross-check (the single largest `our_bug` bucket, ~78-87 hands depending on
    which other fixes had already landed). Fixture: `fans-2.test.ts`'s Tile Hog describe, its
    "BUG: misses..." `it` renamed and flipped `toEqual([])` → `toEqual([{ fanId: 64, count: 1
    }])`. **Harness re-run (isolated: before/after this fix alone, both against the item #23
    baseline, before item #24's wind correction):** `our_bug` 286 → 191 (−95); unclassified 55 →
    54 (−1); `ambiguity`/`their_bug` unchanged; coverage unchanged at 80/81. Full engine suite
    green (430 passed, 1 skipped — no new tests, existing fixture flipped in place).

26. **Step 3, fix 4/6: All Simples (68) and Pure Terminal Chows (13) now exclude No Honors
    (76) — `[68,76]`/`[13,76]` added to `exclusions.ts`.** Both fans are flat (whole-hand
    condition, not countable) — All Simples (no terminal or honor tiles) and Pure Terminal Chows
    (one suit's 1-2-3 and 7-8-9 chows only) each structurally can never include an honor tile, so
    a hand satisfying either was double-scoring "no honors" as both the named fan's value and No
    Honors's 1pt on top — same shape as the 8 other already-present `[X,76]` entries (8, 22, 25,
    26, 27, 29, 36, 37, 63), just missed for these two when the table was transcribed. Unlike
    item #24's fan 73 case, both 76 and its excluding fans here are flat, so a whole-fan
    `exclusions.ts` entry is architecturally correct (no partial-credit-loss risk). Evidence:
    PyMahjongGB's `fan_calculator.cpp`, `"断幺不计无字"` ("All Simples doesn't count No Honors").
    Fixture: `exclusions.test.ts`'s two `it` blocks (moved out of the "KNOWN BUG" describe into
    their own, since fixed), flipped to `toBe(true)`. **Also removed a now-stale
    `OUR_BUG_FAMILIES` entry** from `validation/allowlist.py` (same pattern as item #24's
    cleanup): its frozenset was just `{"No Honors"}`, loose enough to keep claiming credit for 2
    residual mismatches after this fix landed. Direct inspection showed those 2 are a genuinely
    **different, still-open gap**: All Even Pungs (21) and All Fives (31) each also structurally
    exclude No Honors (both are pungs of numbered tiles only) but were never given `[21,76]`/
    `[31,76]` entries either — noted below as new follow-up, not fixed here (out of Step 3's
    original 6-bug scope). **Harness re-run:** `our_bug` 121 → 50 (−71, includes both this fix
    landing and the stale-family cleanup); unclassified unchanged at 55 (the 2 newly-honest
    hands are counted in the family-cleanup step below, not this one); coverage unchanged at
    80/81. Full engine suite green (433 passed, 1 skipped).

27. **New bug found while verifying item #25's Tile Hog fix — NOT one of Step 3's original 6:
    `detectTileHog` only ever reports count 1, even when TWO separate tile types are each
    hogged in the same hand.** `detectTileHog`'s loop does `return [{ fanId: 64, count: 1 }]` on
    the *first* qualifying type it finds instead of continuing to tally every qualifying type.
    PyMahjongGB scores this fan per qualifying type (cross-check evidence: several hands score
    `'Tile Hog': 2` on PyMahjongGB's side against our `count: 1`, e.g. seed 1823602851 — a hand
    with two independently-hogged tile types). **Fixture added, NOT fixed yet** (fixture-first
    per CLAUDE.md): `fans-2.test.ts`'s Tile Hog describe, new `it` "BUG: only counts the first
    tile-hogged type, not every qualifying type" asserts the current (wrong) `count: 1` for a
    hand with two hogged types; fix should make it `count: 2`. `validation/allowlist.py`'s
    `OUR_BUG_FAMILIES` entry for `"Tile Hog"` repointed to this new citation (the old
    chow-miscounting citation it used to describe is item #25, already fixed — reusing the same
    frozenset for a different citation was deliberate, not an oversight; see the entry's own
    comment). Item #25's fixture (the chow-miscounting bug) stays fixed and green — this is a
    separate, additional gap in the same detector, not a regression of that fix. Tracked below
    as new follow-up, not part of Step 3 proper — out of the originally authorized scope for
    this pass.

28. **Step 3, fix 5/6: Out with Replacement Tile (46) now excludes Self-Drawn (80) —
    `[46,80]` added to `exclusions.ts`.** Both fans are flat, so a whole-fan exclusion is
    architecturally safe (same reasoning as item #26, unlike item #24's fan 73 case). Fan 46's
    kong-replacement-draw path (`detectOutWithReplacementTile`'s `wonOnKongReplacement` branch)
    requires `winMethod === 'selfDraw'` by construction — exactly fan 80's entire definition —
    so every hand reaching 46 that way unavoidably also satisfies 80 for the same win. (Fan 46's
    other path, the last-discard-of-game branch, has `winMethod === 'discard'` and so never
    co-occurs with 80 at all — this pair is inert for that path, matching item #13's separately-
    tracked ambiguity, not a new conflict with it.) Evidence: PyMahjongGB's `fan_calculator.cpp`,
    `"杠上开花不计自摸"` ("Kong-replacement-flower doesn't count Self-Drawn"). Same pattern as the
    existing `[44,80]` (Last Tile Draw) entry. **Per item #20's flag, this pair had zero clean
    occurrences in the 1200-hand harness sample** (every apparent hit was actually item #13's
    unrelated ambiguity) — validated instead with a dedicated, deterministic integration test:
    `score-hand.test.ts`'s new "scores Out with Replacement Tile alone, not stacked with
    Self-Drawn, on a kong-replacement self-draw win", constructing a concealed-kong hand won by
    self-draw on the kong's own replacement tile and asserting fan 46 present, fan 80 absent
    (`fanIds` = `[46, 67, 73]` — Concealed Kong and Pung of Terminals or Honors are unavoidable
    structural freebies of using a wind kong at all, not part of what's being isolated). Fixture:
    `exclusions.test.ts`'s `it` moved out of "KNOWN BUG" into its own describe, flipped to
    `toBe(true)`. **Harness re-run:** `our_bug` 48 → 16 (−32, including items #25's/#26's own
    remaining tail plus this fix); `their_bug` 6 → 7 (+1); `ambiguity` 202 → 204 (+2);
    unclassified unchanged at 57; coverage unchanged at 80/81; the harness's own
    `targeted-46-out-with-replacement` case, which never isolated this pair before, no longer
    mismatches at all. Full engine suite green (435 passed, 1 skipped — 1 new integration test).

29. **Step 3, fix 6/6 (last of the original six): All Green (3) now excludes Half Flush (50)
    and One Voided Suit (75) — `[3,50]`/`[3,75]` added to `exclusions.ts`.** Fan 3 had no
    exclusion entries at all before this. All three fans are flat, so a whole-fan exclusion is
    architecturally safe. All Green (only Bamboo 2/3/4/6/8 + Green Dragon) trivially satisfies
    both Half Flush's (exactly one suit plus honors) and One Voided Suit's (exactly one suit
    used) own definitions for the same tiles. Evidence: PyMahjongGB's `fan_calculator.cpp`,
    `"绿一色不计混一色、缺一门"` ("All Green doesn't count Half Flush, One Voided Suit"). Fixture:
    `exclusions.test.ts`'s `it` moved out of "KNOWN BUG" into its own describe, flipped to
    `toBe(true)`; the "KNOWN BUG" header comment removed too, since this was the last fixture
    under it — every `it` in the file now asserts correct, fixed behavior. **Harness re-run:**
    `our_bug` 16 → 15 (−1); `their_bug`/`ambiguity` unchanged at 7/204; unclassified unchanged at
    57; coverage unchanged at 80/81. Full engine suite green (435 passed, 1 skipped).

    **Step 3 complete.** All six originally-confirmed exclusion/detector bugs from item #19 are
    fixed, each in its own commit, fixture-first, with a harness delta reported for every one:
    `[60,73]`/`[61,73]` (item #22, corrected to a detector-level fix in item #24), Fully
    Concealed Hand family (item #23), Tile Hog chow-counting (item #25), All Simples/Pure
    Terminal Chows vs No Honors (item #26), Out with Replacement Tile vs Self-Drawn (item #28),
    All Green family (this item). `our_bug` fell from 449 (item #19's original count, now
    understood as 7 bugs not 6 per CLAUDE.md's Step 0 correction) to 15.
    **Correction (see item #30): the "residual 15 splits between item #11 and item #27" claim
    two sentences above this note originally made is WRONG** — item #11 is classified
    `ambiguity`, not `our_bug`, and cannot be part of an `our_bug` count by construction. The
    true breakdown, re-derived in item #30, is 7 hands (item #27, Tile Hog) + 8 hands (a
    previously-unnamed eighth bug, also found in item #30). Left the original wrong sentence
    text just above unedited (rather than silently rewritten) so the correction is visible
    in-place; do not trust it, trust item #30 instead.

30. **Step 4/5 (2026-08-06): the ~55-57 unclassified mismatches triaged, the allowlist
    re-validated end-to-end, and FOUR new confirmed engine bugs found — one of them a
    regression in an already-shipped commit (item #23).** Full methodology: re-ran the harness
    fresh (`npm run generate -- 1200 20260805` against the current engine, then
    `compare.py --json-report`) rather than trusting item #29's stored numbers, added an
    `ourBugDetail` array to `compare.py`'s JSON report (mirroring the existing
    `unclassifiedDetail`) so every `our_bug` hand's seed/diff/citation is inspectable, not just
    aggregate counts — this is what surfaced the item #29 misattribution above. Every finding
    below follows the same triage protocol as Step 3: reproduce from the seed, consult
    `mcr_EN.pdf` directly (via `rules-lawyer` for the ones needing a fresh citation, or direct
    `Read` of the PDF pages myself for the highest-stakes one), classify, fixture-first for any
    `our_bug`, never fix engine logic to match PyMahjongGB without a citation.

    **(a) REGRESSION, not a fix — item #23 is WRONG and must be reverted.** Investigating why
    the "Fully Concealed Hand" `our_bug` citation was still catching 8 hands after item #23
    supposedly fixed exactly this family led to re-reading `mcr_EN.pdf`'s primary fan table
    (§3.8.1, p.14-15) directly. It explicitly annotates fans 4 (Nine Gates), 6 (Seven Shifted
    Pairs), 7 (Thirteen Orphans), 12 (Four Concealed Pungs), and 19 (Seven Pairs) with **"(Fully
    Concealed may be combined if Self-Drawn)"** — the literal opposite of what item #23 encoded
    into `exclusions.ts` as `[4,56]`/`[6,56]`/`[7,56]`/`[12,56]`/`[19,56]`. Item #23 was based on
    PyMahjongGB's `adjust_fan_table` behavior (`"把不求人修正为自摸"`) without the direct rulebook
    citation `KICKOFF-validation-harness.md` 1e requires before changing engine behavior to
    match PyMahjongGB — precisely the failure mode that document's own text warns is "the one
    failure mode that makes this phase actively harmful." **This is invisible to the harness
    cross-check by construction**: PyMahjongGB and our (post-#23) engine now share the SAME
    wrong answer for these five fans, so no mismatch is ever generated to catch it — only a
    direct rulebook re-read surfaced it. Fixture-first, not yet reverted:
    `exclusions.test.ts`'s "KNOWN REGRESSION" describe block still asserts the current (wrong)
    `areExclusive(...) === true` for all five pairs, annotated `// WRONG, should be false`, with
    the five exact rulebook quotes. **Reverting `exclusions.ts` itself is the highest-priority
    follow-up from this session — see the KICKOFF scheduling note below.**

    **(b) NEW bug: `detectFullyConcealedHand` (fan 56) and its sibling `detectConcealedHand`
    (fan 62) wrongly disqualify a hand containing a CONCEALED kong.** Both check
    `ctx.melds.length === 0` (fans-4.ts / fans-2.ts) — literally zero sets of any kind — but
    each fan's own rulebook text says "without any melds" specifically, and the same §3.8.1
    table consistently uses "meld"/"melded" to mean claimed-from-another-player throughout (fan
    5 "Four Kongs...may be concealed or melded"; fan 57 "One Melded Kong and one Concealed Kong
    are 6 points"; fans 67/74's Concealed-vs-Melded-Kong split) — a concealed kong a player
    declares themselves is definitionally not a "meld" under this vocabulary. Confirmed via
    `rules-lawyer` against the primary table AND Appendix 1 (p.16, p.39). This is the bug that
    was hiding behind item #23's now-stale citation — it produces the exact same
    `{"Fully Concealed Hand", "Self-Drawn"}` name-diff signature the old (fixed) missing-
    exclusion bug used to, so the allowlist kept crediting a closed bug for a live one until
    this session's `ourBugDetail` breakdown forced a look at the actual hands. Fixture-first, not
    fixed: two new `it`s in `fans-4.test.ts`/`fans-2.test.ts` (fan 56 and 62 respectively).
    `validation/allowlist.py`'s `OUR_BUG_FAMILIES` citation for this family repointed to the new
    fixtures (same name-frozenset, corrected root cause). 8 hands in the current 1200-hand run.

    **(c) NEW bug: `detectTwoConcealedPungs` (fan 66) wrongly excludes concealed kongs from its
    count.** The detector's own comment claimed fan 66's rulebook wording is deliberately
    "Pungs" only (no kongs), unlike fan 12/33's "Pungs or Kongs" — this distinction does not
    exist in the actual PDF text (confirmed via `rules-lawyer` AND independently by reading
    Appendix 1 p.40 myself): fan 66's own worked example is **"Concealed Pung; Concealed Kong,
    won with a discarded 3 Character... Combined with Double Pung, Concealed Kong..."** — the
    example itself composes "Two [Concealed Pungs]" from one concealed pung PLUS one concealed
    kong. Every sibling detector in this codebase (fans-16.ts's Three Concealed Pungs,
    fans-64.ts's Four Concealed Pungs) correctly filters `s.kind !== 'chow'` (pung-or-kong);
    `detectTwoConcealedPungs` filtering `s.kind === 'pung'` is the sole exception in the whole
    `scoring/` directory (checked via `grep -n "kind === 'pung'"` across every `fans-*.ts`) — an
    outlier against the codebase's own established convention, and apparently never
    independently re-verified against the PDF (violating CLAUDE.md's "never implement a scoring
    rule from memory" rule — the wrong claim had stood, uncited-to-the-actual-PDF, since this
    detector was first written). Fixture-first, not fixed: new `it` in `fans-2.test.ts`.
    **Known limitation, not resolved**: this bug produces the identical `{"Two Concealed
    Pungs"}` name-diff signature as the pre-existing item #11 concealment-completion ambiguity,
    and `classify_mismatch` cannot distinguish the two causes from fan names alone (no access to
    whether a hand actually contains a concealed kong) — flagged directly in
    `allowlist.py`'s `CONCEALMENT_FAMILY` comment. Some unknown fraction of the "148 hands"
    filed under item #11 below are actually this bug, not the concealment ambiguity; the item
    #11 count should no longer be read as clean.

    **(d) NEW bug: `exclusions.ts` is missing `[18, 55]`.** All Terminals and Honors (18: the
    pair/pungs/kongs are all 1/9/honor tiles) trivially implies Outside Hand's (55: every set,
    including the pair, includes a terminal or honor) weaker condition — the exact same
    "narrower named fan implies a broader one" shape already correctly transcribed for All
    Terminals (`[8,55]`) and All Honors (`[11,55]`) individually. Fan 18 is the union of 8 and
    11 (any hand satisfying either structurally satisfies 18's own condition too) and was simply
    missed. Confirmed directly against 6 real hands in the current run, every one showing fan 18
    present in `ourFans` alongside `Outside Hand`. Fixture-first, not fixed: new `it` in
    `exclusions.test.ts`. This was masquerading as an unexplained residue on top of item #11's
    concealment-family diff in 6 of the ~55 unclassified hands (Big Four Winds / All Terminals
    and Honors shapes where item #11 already explains 3 of the 4 diff names, leaving "Outside
    Hand" unexplained until this fix).

    **(e) NEW bug: `detectAllTypes` (fan 52) never fires for a Seven Pairs hand.** The detector
    bails out via `if (!ctx.decomposition) return []` before ever inspecting
    `ctx.specialShape`, so a Seven Pairs candidate (`decomposition: null, specialShape:
    'sevenPairs'`, per `score-hand.ts`'s candidate list) can never reach it. The detector's own
    comment asserted fan 52 needs "the 4 real sets plus the pair" (i.e. the standard shape only)
    — `rules-lawyer` confirmed this is a misreading: fan 52's own primary-table text ("each of
    the five sets is composed of a different type of tile") has no structural pung/kong/chow/
    pair requirement, and **fan 19 Seven Pairs's own Appendix 1 worked example (24-Point Fan
    section, Example 1: pairs of Dots/Bamboo/Characters/Red Dragon/East Wind/North Wind) is
    directly captioned "Combined with All Types."** This was the single largest unclassified
    bucket in the harness — 20 of the ~55 hands, every Seven Pairs hand whose 7 pairs happened
    to span all 5 categories. Fixture-first, not fixed: new `it` in `fans-6.test.ts`.

    **(f) Two named-but-previously-unfixtured gaps, now fixtured per this session's Part A
    instruction (still not fixed):** item #27 (`detectTileHog` undercounts when two separate
    tile types are each hogged — already fixtured in Step 3, unchanged) and the All Even
    Pungs (21) / All Fives (31) vs No Honors (76) missing exclusions first noted in item #26's
    allowlist cleanup but never fixtured until now — `exclusions.test.ts`'s new
    `[21,76]`/`[31,76]` block. Confirms all 15 of item #29's original `our_bug` hands: 7 explained
    by item #27 (Tile Hog), 8 by finding (b) above (NOT item #11 as item #29 wrongly claimed —
    see the correction appended to that item). Zero hands were left unexplained by these two
    named causes plus the new finding — i.e. Part A's "unnamed third bug" turned out to BE
    finding (b), not a separate fifth thing.

    **(g) Allowlist re-validated (`validation/allowlist.py`) — two entries were stale (matched
    zero hands, their underlying bugs already fixed by Step 3 but never removed from
    `OUR_BUG_FAMILIES`), removed:** the `"Out with Replacement Tile"/"Self-Drawn"` family
    (bug fixed in item #28) and the `"Half Flush"/"One Voided Suit"` All Green family (bug
    fixed in item #29) — both confirmed via direct citation-frequency query against the current
    run before removal, not assumed. The `"Fully Concealed Hand"/"Self-Drawn"` family's citation
    was corrected per (b) above rather than removed, since it still matches real hands, just for
    a different reason than its old text claimed. `KNITTED_STRAIGHT_BONUS_STACK_NAMES` (item
    #20's `their_bug`) was checked and confirmed NOT stale — it still matches 1 hand
    (`targeted-34`), combined with item #13's ambiguity in the same diff; earlier apparent
    "0 occurrences" was an artifact of grouping by final category bucket instead of citation
    string. `CONCEALMENT_FAMILY`'s overbreadth re (c) above is flagged in its own module comment
    rather than mechanically resolved (would need `classify_mismatch` to see raw hand data, not
    just fan-name diffs — out of scope for this pass).

    **(h) Residual ~29 unclassified, characterized but not all individually resolved:**
    - **~14 hands: benign decomposition ties, not a bug on either side.** A "Single Wait"
      (ours) vs "Closed Wait"/"Edge Wait" (PyMahjongGB) 1-for-1 swap (fans 77/78/79 are all
      worth exactly 1 point) where the hand's TOTAL points match exactly between engines in 12
      of these cases (the 2 remaining also combine with item #13's already-known ambiguity).
      §3.9.1's "Freedom to Choose the Highest Points" principle doesn't resolve which of two
      EQUALLY-scoring decompositions gets reported when a hand has more than one valid
      decomposition and the wait-shape differs between them — there is no rulebook-stated
      tiebreak, so two independent implementations can legitimately disagree on which 1-point
      wait-fan to report without either being wrong. Deliberately NOT added to `allowlist.py`
      as a blind name-based family (unlike the confirmed bugs above) — doing so would also
      swallow seed `4009266348`'s single non-tied case below, which is NOT a benign tie and
      needs to stay visible.
    - **6 hands: a harness (not engine) bug in `validation/src/win-circumstance.ts`.**
      `otherCopiesInOwnHand` sums matching-type tiles across ALL of a player's own melds,
      including the SAME exposed pung that `forcedLastCopy`'s very next check exists to detect
      (an exposed pung of exactly 3 matching the winning tile's type, which should force
      `isLastCopyOfItsKind = true`). Since an exposed pung's own 3 tiles always make
      `otherCopiesInOwnHand > 0`, `forcedLastCopy` returns `false` at its first line before ever
      reaching the `inAnyPack` check that was supposed to catch exactly this case — confirmed
      directly against 5 real hands, every one showing `is4thTile: false` recorded despite an
      exposed pung of the winning tile's own type sitting in `pack`. PyMahjongGB's own
      structural override (independent of the flag it's given, per this file's existing
      comment) correctly detects the real last-tile condition anyway, which is why these show
      up as PyMahjongGB-only "Last Tile" mismatches. A 6th hand (`targeted-58-last-tile`,
      generators/targeted.ts's hardcoded case) shows the same family from the other direction:
      it force-sets `isLastCopyOfItsKind: true` for a hand whose winning tile completes a PAIR
      (i.e. the winner's own remaining tiles DO hold another copy — the pair partner), which
      per this same file's documented PyMahjongGB-override logic should force FALSE, not TRUE.
      Not fixed here — this is validation-harness code, not `packages/engine`, and out of this
      session's authorized scope, but flagged clearly since it makes 6 of the ~55 unclassified
      hands look like open rules questions when they're actually a harness modeling bug.
    - **~9 hands: genuinely still open, individually under-investigated this session.**
      `targeted-4-nine-gates` (a `No Honors`/`Pung of Terminals or Honors` swap at equal total
      points — likely another benign multi-decomposition tie given Nine Gates' famous 9-way
      wait, not yet confirmed the way the fans-77/78/79 pattern above was);
      `targeted-8-all-terminals` (`Double Pung` ×2 on our side only, PyMahjongGB scores neither
      — plausibly another missing exclusion, e.g. `[8,65]`, unverified); `targeted-29-three-
      suited-terminal-chows` (`Mixed Double Chow` ×2 ours-only — plausibly `[29,70]`,
      unverified); `targeted-25-upper-tiles`/`targeted-27-lower-tiles` (an Upper/Lower Four vs
      Concealed Hand cascade resembling item #11's pattern but for fans not yet checked against
      `CONCEALMENT_FAMILY`'s exclusion partners); three `standard` hands showing PyMahjongGB
      scoring `Pure Shifted Pungs` or `Pure Shifted Chows` that our engine misses entirely
      (seeds `1613793028`, `3097971845`, `3563778031` — possibly a real detector gap, not just
      an exclusion, unverified); and seed `4009266348`, the one wait-type hand that is NOT a
      benign tie (PyMahjongGB scores 1 more point via `Single Wait` that we don't, on a hand
      structurally identical to a clean "waiting to pair a lone tile after 4 pungs" shape) —
      manually reconstructing this exact tile composition against the live engine
      (`scoreHandDetailed`) produces the CORRECT answer (matches PyMahjongGB's 75, with fan 79
      present), so this is most likely a second, distinct harness-generator artifact (the
      stored case's `ours: 74` doesn't reproduce from its own recorded tile composition) rather
      than a real `scoreHandDetailed` bug — inconclusive, not confirmed either way.
    None of these 9 have a fixture yet; do not assume they're `our_bug` vs `their_bug` vs
    harness-artifact without doing the same reproduce-then-cite work the confirmed items above
    got.

    **Harness re-run, final numbers for this session (1200 hands, seed 20260805, engine as of
    this session's fixture commits — see item #31):** `their_bug` 7 (unchanged), `ambiguity` 204
    (unchanged), `our_bug` 15 → 43 (+28: 8 finding-(b) + 6 finding-(d) + 20 finding-(e), net of
    the 2 already-counted-elsewhere items in (f) which were already in the 15), `unclassified`
    57 → 29. Full engine test suite green throughout (442 passed, 1 skipped — 7 new fixtures:
    fans-4.test.ts ×1, fans-2.test.ts ×2, fans-6.test.ts ×1, exclusions.test.ts ×3 new describe
    blocks covering 8 new `it`s total across the regression-confirmation and the two newly-cited
    missing exclusions). No engine logic changed — every finding above is fixture-only, per Part
    A/B's explicit instruction and CLAUDE.md's standing fixture-first rule.

31. **Step 5: final validated baseline, 2026-08-06 — SUPERSEDED by item #32's post-revert
    re-run below; kept here for the historical record of what Step 4/5 looked like before the
    revert.** 1200 hands, seed 20260805 (52 targeted + 1148 random across standard/seven-pairs/
    thirteen-orphans), scored by this engine's `scoreHand` and PyMahjongGB 1.3.0, compared at
    both the points and exact-fan-multiset level.
    **their_bug: 7 hands. ambiguity: 204 hands. our_bug: 43 HANDS, not 43 distinct bugs — these
    43 hands are explained by 6 distinct fixture-backed bug families (item #30 (b)-(f) plus the
    then-still-open item #23 regression, itself counted separately, not among the 43 — see item
    #32). unclassified: 29 hands (14 benign decomposition ties, not a bug on either side; 6
    trace to a bug in the VALIDATION HARNESS itself — `validation/src/win-circumstance.ts` —
    not engine debt at all; 9 genuinely still open, unverified — see item #30 (h) for the full
    breakdown of which hands are which). Coverage: 80/81 fans (only fan 81, Flower Tiles, out of
    scope by design).** Re-run command: `npm run generate
    --workspace=@mahjong-mcr/validation -- 1200 20260805 && python validation/compare.py
    --json-report validation/.report.json` from the repo root (requires the PyMahjongGB Python
    environment — see `validation/README.md`).

32. **Item #23 reverted (2026-08-06), the general lesson it teaches, and an audit of every
    other exclusion/detector change in items #19-#31 for the same defect.**

    **(a) The revert itself.** `exclusions.ts`'s `[4,56]`/`[6,56]`/`[7,56]`/`[12,56]`/`[19,56]`
    removed; `exclusions.test.ts`'s "KNOWN REGRESSION" describe block renamed and its five
    assertions flipped from the documented-wrong `true` to the correct `false`. No other test in
    the engine suite depended on the old (wrong) exclusion behavior (checked directly — grepped
    every `.test.ts` for `fanId.*56` outside the two files being edited). Full engine suite green
    throughout (442 passed, 1 skipped, unchanged — this was a pure revert, not a new fixture).

    **Harness re-run immediately surfaced a real, and correctly-directioned, consequence**: our
    engine now correctly scores Fully Concealed Hand (56) for a self-drawn Nine Gates/Seven
    Shifted Pairs/Thirteen Orphans/Four Concealed Pungs/Seven Pairs hand, but PyMahjongGB's own
    implementation still doesn't (per item #23's own citation of its `adjust_fan_table`
    behavior) — so this is now a **newly confirmed `their_bug`**, not a mismatch to hide. 108
    hands in the 1200-hand sample. `validation/allowlist.py` gained a new pattern
    (`FULLY_CONCEALED_COMBINES_SHAPE_NAMES`/`FULLY_CONCEALED_COMBINES_CITATION`) with a
    dedicated pre-check in `classify_mismatch` — needed because this new `their_bug` produces
    the EXACT SAME `{"Fully Concealed Hand", "Self-Drawn"}` diff shape as the still-open
    concealed-kong `our_bug` from item #30(b), just in the opposite direction (our side has the
    extra fan here; PyMahjongGB has it in #30(b)'s case). Disambiguated by checking whether any
    of the five shape names appear in the hand's full fan set, not just the diff — the
    concealed-kong bug is shape-independent, so this reliably tells the two apart. Verified: of
    the 116 hands citing this family before the fix, 108 were the new their_bug (shape hands)
    and 8 were the genuine still-open our_bug (concealed-kong hands, unchanged from item #30(b)'s
    own count). **Final re-run: their_bug 7 → 102 hands (+95: 108 newly-confirmed minus the fact
    some were already counted differently before), ambiguity 204 (unchanged), our_bug 43
    (unchanged — the revert didn't touch any of the 6 confirmed bug families, it only corrected
    which category a DIFFERENT set of hands falls into), unclassified 29 (unchanged). Full detail
    in `validation/.report.json` (gitignored, regenerate via item #31's command).**

    **(b) The general lesson, stated explicitly, not just as an item-#23-specific note:** an
    engine change justified ONLY by matching PyMahjongGB's behavior — with no independent
    `mcr_EN.pdf` citation — becomes PERMANENTLY invisible to this harness the moment it ships.
    Once both engines agree (even on the same wrong answer), there is no mismatch left to
    generate, so no future harness run, however many hands or seeds, can ever flag it again. The
    only thing that caught item #23 was a human going back and re-reading the primary rulebook
    table directly, for an unrelated reason (chasing why a citation looked stale). This is
    structurally the same failure mode as item #6's original knitted-shape deferral (both used
    the same "out of scope, revisit later" framing and both went undetected far longer than
    either should have) — the cross-check finding zero mismatches for a fan/exclusion is
    evidence of agreement, not evidence of correctness, and KICKOFF-validation-harness.md 1e's
    "do not fix to match PyMahjongGB without a citation" rule exists specifically to prevent
    this, not as a nice-to-have.

    **(c) Audit of every exclusion/detector change in items #19-#31 for the same defect —
    checked individually, not assumed clean.** For each, the question is: was the change
    justified SOLELY by PyMahjongGB's behavior, with no independent rulebook citation (either a
    direct `rules-lawyer`/PDF quote, or a self-evident logical entailment from the two fans'
    OWN already-rulebook-quoted definitions)?
    - **Item #23 ([4,56] family): DEFECTIVE — confirmed, reverted above.** Sole justification
      was `adjust_fan_table`'s PyMahjongGB behavior; no independent citation existed until this
      session's direct table re-read, which showed the opposite.
    - **Item #22 (`[60,73]`/`[61,73]`, later corrected by #24): a near-miss, flagged but not
      itself wrong.** Justified by pattern-analogy to fans 1/4/8/9/11/18's already-transcribed
      table entries plus PyMahjongGB's behavior as discovery evidence — **no fresh independent
      citation was obtained at the time it was written**, the same process gap item #23 had.
      It happened to be right (later independently confirmed by item #24's `rules-lawyer` pass,
      which was consulted for a different question — the exclusion's granularity — and
      incidentally reconfirmed the underlying finding). Worth remembering: this process gap
      produced one wrong answer (item #23) and one right-by-luck answer (item #22) in the same
      six-bug batch. Not re-opened; already independently verified via item #24, just not
      verified until after the fact.
    - **Items #20, #21, #24, #30(b), #30(c), #30(e): CLEAN.** Each has a direct `rules-lawyer`
      pass (or, for #30(c), an additional independent PDF re-read of Appendix 1 p.40 by hand)
      cited with exact section/page and quoted text, obtained BEFORE the fix/fixture was
      written, not after.
    - **Items #25, #26, #27, #28, #29, #30(d), #30(f): CLEAN, but via a different mechanism —
      self-evident logical entailment, not a fresh citation.** Each of these derives its
      conclusion directly from two fans' definitions that were ALREADY quoted verbatim
      elsewhere in this document or the primary table (e.g. item #26: All Simples's own text
      already says "without Terminal or Honor Tiles", so it structurally cannot fail No Honors's
      own "without Winds or Dragons" test — this is arithmetic on already-cited text, not a new
      interpretive claim requiring its own citation). PyMahjongGB's behavior served as the
      DISCOVERY signal (how the gap was found) and corroborating evidence, never as the SOLE
      justification. This is the legitimate way to use PyMahjongGB without falling into item
      #23's trap: as a hypothesis generator, checked against already-established rulebook text,
      not as the terminal authority.
    - **Conclusion: item #23 is the only defective entry found.** No other exclusion or detector
      change across items #19-#31 relied solely on PyMahjongGB's behavior without independent
      grounding. Item #22 is flagged as a process near-miss worth remembering, not as a second
      bug requiring action.

33. **All six confirmed Step 4/5 `our_bug` causes fixed (2026-08-06), a citation guard added
    first, and the validation harness's own bug fixed — final baseline: `our_bug` 0.** Full
    detail and per-fix harness deltas are in each fix's own commit message (`git log`); this
    entry records the session's shape and the final numbers, not a re-derivation of each fix.

    **(a) Citation guard added FIRST, before any exclusion edit**, per this session's explicit
    instruction and item #32(c)'s audit finding (nothing currently prevents an uncited exclusion
    from landing the way item #23 did). New `packages/engine/src/scoring/exclusion-citations.ts`:
    `GRANDFATHERED_PAIRS` is a frozen, hardcoded snapshot of every pair in `RAW_EXCLUSION_PAIRS`
    as of this commit (not a live reference — it cannot silently grow to cover a pair added
    later); anything not in that snapshot needs a real, non-empty entry in `CITATIONS`.
    `exclusions.test.ts`'s new guard test fails if any live pair is covered by neither. Verified
    the guard actually fires (not just "should" fire) by temporarily adding an uncited pair and
    confirming the test failed, then reverting — this is the one part of this item actually
    checked empirically rather than argued. Per this session's explicit instruction, no existing
    entries were backfilled with real citations; they remain grandfathered.

    **(b) All six causes fixed, each its own commit, each re-verified against `mcr_EN.pdf`
    before fixing (not against this session's own earlier conclusions or existing code
    comments) — fixture-first-then-fix throughout, per CLAUDE.md's standing rule:**
    - `detectTileHog` (#27) multi-type undercount — fixed to tally every qualifying type, not
      just the first.
    - `[21,76]`/`[31,76]` (All Even Pungs / All Fives vs No Honors) — added, cited directly to
      each fan's own already-quoted §3.8.1 text (a self-evident entailment, no fresh
      `rules-lawyer` pass needed).
    - `[18,55]` (All Terminals and Honors vs Outside Hand) — added, same self-evident-entailment
      basis as above (18 is the union of already-cited 8 and 11).
    - `detectAllTypes` never checking the Seven Pairs shape — fixed with a
      `specialShape === 'sevenPairs'` branch; this alone had been the single largest bug by hand
      count (20 of the original ~55 unclassified hands).
    - `detectFullyConcealedHand`/`detectConcealedHand` rejecting a concealed kong — re-verified
      via a FRESH, independent `rules-lawyer` pass per this session's explicit instruction (not
      reusing item #30(b)'s own citation), since this is the same rulebook territory item #23
      got wrong. The fresh pass found an even more direct citation than item #30(b) had: §3.6.8
      "How to Kong" states outright, "With a Concealed Kong, the hand can be considered to be
      Concealed (if nothing else is melded)."
    - `detectTwoConcealedPungs` excluding kongs from its count — same fresh-re-verification
      treatment; confirmed again via fan 66's own Appendix 1 worked example, which composes
      "Two [Concealed Pungs]" from one concealed pung plus one concealed kong.
    Both concealment fixes had real, caught-by-the-harness downstream effects on
    `score-hand.test.ts`'s existing `[46,80]` isolation fixture (a hand that now correctly scores
    two more fans than it used to) — updated in place, not treated as a regression, since the
    new totals are the fixes working as intended on a hand that happened to already exist as a
    fixture for something else.

    **(c) The validation harness's own bug (item #30(h), `win-circumstance.ts`'s
    `otherCopiesInOwnHand`) also fixed — NOT engine debt, but was inflating the apparent
    unclassified count.** The first fix attempt (scope the check to concealed tiles only,
    matching PyMahjongGB's own documented override) broke a DIFFERENT, previously-working
    robKong case, because the same function's return value fed a second, unrelated check (robKong
    physical feasibility) that genuinely needed melds included. Caught by re-running the harness
    and investigating the one new mismatch it produced — not assumed clean from the aggregate
    count dropping by roughly the expected amount. Correct fix: two separately-scoped functions.
    Also fixed a second, related bug in `generators/targeted.ts`'s `targeted-58-last-tile` case,
    which hardcoded `isLastCopyOfItsKind: true` for a hand whose (randomly picked) winning tile
    could land on the pair — forced instead to a tile with no other same-type copies anywhere in
    the hand.

    **Final baseline, 1200 hands, seed 20260805, this session's fixes fully applied:**
    **their_bug 110. ambiguity 194. our_bug 0. unclassified 23. Coverage 80/81 fans** (fan 81,
    Flower Tiles, out of scope by design). Full engine suite green throughout every step (446
    passed, 1 skipped). Re-run command unchanged from item #31.

    **The `our_bug`/`their_bug` numbers above are HAND counts, not distinct-cause counts** — read
    every count in this document the same way unless stated otherwise. The 0 `our_bug` reflects
    that all 6 distinct causes found in Step 4/5 are now fixed, not that only 6 hands existed;
    at the peak (item #31's post-triage, pre-fix snapshot) those 6 causes together explained 43
    hands. Of the 23 remaining `unclassified` hands: ~14 are benign equal-scoring decomposition
    ties (not a bug on either side — see item #30(h)'s first bullet, unaffected by anything in
    this item); the rest are the genuinely-still-open residual from item #30(h)'s third bullet,
    now minus `4009266348` and `targeted-4-nine-gates`'s prior framing, which should be
    re-examined against the current run rather than assumed identical to the earlier snapshot
    (see item #30(h) for what was known about each at the time it was written; this item does
    not re-verify that residual, only reports the current total).

34. **Part 1 re-triage of the unclassified residual against the CURRENT run (2026-08-06) —
    23 hands re-derived from scratch, not trusted from item #30(h)'s pre-fix snapshot.** Full
    per-hand fan-set detail pulled (not just diffs) for every hand not already an obvious
    equal-total tie, per `KICKOFF-validation-harness.md`'s explicit instruction to confirm
    rather than assume. **Found and fixed 5 more real bugs along the way** — see the previous
    commit's message for the full technical detail (`[25,36]`, `[27,37]`, `[29,70]`,
    `detectPureShiftedPungs`/`detectPureShiftedChows`'s exact-count bug, and the resulting
    `[15,24]`/`[16,30]` entries); this item records the re-triage's own findings and final
    breakdown.

    **(a) Confirmed: 15 of the 23 (was ~14 before one more resolved into this bucket) are
    benign equal-scoring decomposition ties, not a bug on either side.** Verified by directly
    checking `ours == pmgb` point totals for every hand whose diff is a "Single Wait" ↔
    "Closed Wait"/"Edge Wait" swap (fans 77/78/79, each worth exactly 1 point) — 13 hands are a
    clean 1-for-1 swap at equal totals; 2 more (`1589741832`, `768779158`) combine the same
    swap with the already-cited item #13 ambiguity (`Out with Replacement Tile`), confirmed by
    the point gap between `ours`/`pmgb` matching fan 46's exact value (8) in both cases, not an
    unequal/unexplained residual. No rulebook tiebreak exists for two equally-scoring
    decompositions (§3.9.1's "Freedom to Choose the Highest Points" principle resolves ties in
    favor of the higher score, not between two options that already tie) — this is genuinely
    undecidable in the sense that neither engine is wrong, not undecidable for lack of
    investigation.

    **(b) Found and fixed: 5 hands traced to the 5 new bugs above**, reclassified from
    unclassified into (in each case) a clean, structurally-verified root cause — not
    rules-lawyer-dependent, since each is a direct logical entailment from already-cited
    rulebook text or a straightforward detector-logic bug, matching the same "self-evident
    entailment" standard item #32(c)'s audit already validated as sound. One of the five
    (`targeted-27-lower-tiles`) turned out to be a compound case: fixing `[27,37]` peeled away
    its `Lower Four` component, and what was left underneath was just another instance of the
    benign wait-type tie in (a) — moved there, not double-counted.

    **(c) One hand's residual reclassified into the ALREADY-EXISTING item #11 ambiguity, not a
    new finding**: `targeted-25-upper-tiles`'s diff was `{Upper Four, Concealed Hand}` before
    the `[25,36]` fix; once `Upper Four` was correctly excluded, the sole remaining name
    (`Concealed Hand`) was already a member of `allowlist.py`'s `CONCEALMENT_FAMILY` — it
    reclassified automatically, with no further code change needed. Worth remembering
    generally: a hand that LOOKS like it needs new investigation can turn out to be an
    already-solved cause simply obscured by an unrelated, now-fixed name in the same diff — the
    same shape as item #30(d)'s `[18,55]` finding hiding behind item #11's diff in 6 other hands.

    **(d) Two hands genuinely still open, honestly characterized but NOT fully resolved —
    real uncertainty, not unexamined:**
    - `targeted-4-nine-gates` (seed `20260809`) and `targeted-8-all-terminals` (seed
      `20260811`): both hands' `Fully Concealed Hand`/`Self-Drawn` component IS already
      explained by item #32/#33's confirmed `their_bug` (PyMahjongGB not implementing the
      rulebook's stated Fully-Concealed-combines-with-these-5-shapes rule) — both hands' own
      fan sets include `Four Concealed Pungs`/`Nine Gates`, two of the five named shapes. But
      `classify_mismatch`'s `FULLY_CONCEALED_COMBINES_SHAPE_NAMES` check is a strict
      all-diff-names-must-be-exactly-these-two pre-check, not a peelable pattern like the rest
      of `ALL_PATTERNS` — so when EITHER hand's diff contains anything else, the whole hand
      falls through uncaught, even though part of it is fully explained. **This is a real
      classifier limitation, left unfixed this pass** (a deliberate scope decision, not an
      oversight — see the Open follow-up work entry below) so it's recorded honestly rather
      than silently working around it.
      - Nine Gates's OWN remaining residual (`No Honors` ours-only, `Pung of Terminals or
        Honors` pmgb-only) is a genuine open question, not resolved: Nine Gates is always
        single-suit, so `No Honors` (76) should always be structurally true for it, suggesting
        a possible missing `[4,76]` exclusion (matching the many `[X,76]` entries already
        found this project) — but `Pung of Terminals or Honors` appearing on PyMahjongGB's side
        (count 1) with NOTHING on ours is not explained by that alone. Manually re-decomposing
        this hand's own 14 tiles (`W1×3, W2,W3,W4, W5×2 [one is the winning tile], W6,W7,W8,
        W9×3`) into a standard 4-sets+pair shape (`111` pung + `234` chow + `55` pair + `678`
        chow + `999` pung) suggests PyMahjongGB might stack a regular per-unit fan onto Nine
        Gates from an ALTERNATE decomposition of the same tiles — but that reading would predict
        count 2 (both terminal pungs), not PyMahjongGB's actual count 1, so this hypothesis is
        NOT confirmed. Whether special shapes should ever additionally score regular per-unit
        fans from an alternate decomposition at all is a genuine rules-architecture question,
        not something resolved by inspection — needs a dedicated `rules-lawyer` pass in a future
        session, not a guess here.
      - All-Terminals' own remaining residual (`Double Pung` count 2, ours-only) is similarly
        unresolved: the hand's 4 pungs genuinely do form two independent same-rank/
        different-suit pairs (Characters-1/Dots-1 and Characters-9/Bamboo-9), so our count of 2
        is arithmetically defensible by Double Pung's own definition — but unlike `[25,36]`-
        style findings, this is NOT a universal logical entailment of All Terminals (a hand
        could easily have 4 terminal pungs with no rank collision at all), so there's no clean
        "always implied" argument to derive an exclusion from by inspection. Whether All
        Terminals structurally excludes Double Pung for some OTHER rulebook reason is unverified.
    - `4009266348` (seed, `standard`): unchanged from item #30(h)'s own investigation —
      manually reconstructing this hand's exact tile composition against the live engine
      produces the CORRECT answer (matches PyMahjongGB), so the stored case's own mismatch is
      most likely a harness-generator artifact distinct from anything fixed in items #33/#34,
      not a `scoreHand` bug. Not re-investigated further this pass (single hand, already
      time-boxed once).

    **Final re-triaged breakdown of the 23 (now 18 after (b)/(c)'s fixes): 15 benign ties (a),
    3 genuinely still open (d) — `targeted-4-nine-gates`, `targeted-8-all-terminals`,
    `4009266348`.** Harness re-run: `unclassified` 23 → 18, `ambiguity` 194 → 195 (the (c)
    reclassification), `our_bug`/`their_bug` unchanged at 0/110. Full suite green (452 passed,
    1 skipped), typecheck clean.

    **On the citation-backfill item**: deliberately NOT done this session, per explicit
    instruction. The guard (item #33(a)) already makes a NEW uncited exclusion impossible to
    land silently — the risk item #23 represented — and this session's own work is a second,
    independent data point that the EXISTING (grandfathered) table is behaving correctly: six
    more genuinely-new bugs were found and fixed via the harness cross-check in this pass alone
    (bringing the running total found via this method to 11 across items #30/#34), and not one
    of them turned out to be caused by an already-existing, wrongly-transcribed entry — every
    fix added something that was MISSING, never corrected something already present and wrong.
    `our_bug` sitting at 0 across a 1200-hand sample, sustained across two full triage passes
    now, is real evidence for the existing table's health, not proof of it — the citation
    backfill remains open but correctly deprioritized, not forgotten (see
    `KICKOFF-validation-harness.md`'s own updated list).

35. **Fan-target completion probability, `heuristic`-basis families (Phase 10 Stage 3,
    `packages/engine/src/fan-targets.ts`) — deliberately NOT sourced from `mcr_EN.pdf`, same
    posture as item #16's `defense.ts`.** `mcr_EN.pdf` defines what each fan IS, never how
    likely a partial hand is to complete one — there is no rulebook passage to cite for "how
    close" the way every other entry in this file cites one for "is it true." The `fanId`,
    `points`, and structural completion CONDITION each `heuristic`-basis estimator checks are
    all real, cited fan definitions (same as every detector in `scoring/fans-*.ts`); only the
    numeric `completionProbability` formula itself — a monotonic function of how many
    "offending" tiles remain relative to hand size, with constants picked against fixture hands
    the same way Stage 1's `EARLY_GAME_MIN_SHANTEN`/`VIABLE_ROUTE_SHANTEN_MARGIN` were — is
    non-rulebook. `FanTargetEstimate.probabilityBasis` marks each estimate `'shanten'` (reuses
    this project's own already-validated shanten/ukeire machinery — Seven Pairs, All Pungs,
    Dragon Pung/Big Three Dragons) or `'heuristic'` (this item — Half/Full Flush, All Simples/
    No Honors, Prevalent/Seat Wind) specifically so a future UI never presents the two as
    equivalently-precise percentages (owner review, `KICKOFF-phase10-strategy-coach.md`'s Stage
    3 design, CHANGE 2, 2026-08-07). Exact per-family formulas and constants are recorded in
    each estimator's own code comment in `fan-targets.ts`, not duplicated here — this entry is
    the umbrella citation for the CLASS of non-rulebook reasoning, matching how item #16 covers
    `defense.ts`'s three signals under one entry rather than three.

36. **`classifyWait`'s falsy-zero guard suppressed all three wait fans for one physical tile
    (fans 77/78/79) — a real engine bug, found 2026-08-09 by an independent review, NOT by the
    PyMahjongGB harness's own triage.** `scoring/fans-1.ts`'s `classifyWait` opened with
    `if (!ctx.winningTile || !ctx.decomposition) return null`. `TileInstanceId` is a 0-based
    index into `TILE_TYPE_BY_ID` and instance `0` is a real tile — the first physical copy of
    `C1` — so `!0 === true` made the guard treat a valid winning tile as absent. Whenever the
    winning tile was that specific copy, Edge Wait (77), Closed Wait (78) and Single Wait (79)
    all silently failed to fire.

    **Why this is worse than a 1-point display defect:** `moves.ts`'s `canDeclareWin` gates
    legality on `scoreHand(params).basicPoints >= MINIMUM_POINTS_TO_WIN`, so a hand whose 8th
    point comes from a wait fan was REJECTED as an illegal win when the winning tile happened to
    be instance 0. The identical hand was legal or illegal purely by which physical copy
    completed it — a direct violation of the invariant that a score depends only on tile TYPES
    plus context. Pinned by `score-hand.test.ts`'s companion fixture (7 vs 8 points on one hand)
    and `fans-1.test.ts`'s detector-level fixture.

    **Why 559 green tests missed it:** every existing fixture picks its own tile instances via
    `idsFor`, which naturally allocates low indices for the hand's FIRST-named type — so
    instance 0 only lands on the winning tile if a fixture happens to make `C1` both the pair
    and the win, which none did. Unit fixtures cannot systematically reach this class. The check
    that does is `property.test.ts`'s new `scoring is invariant under physical tile identity`
    test: re-map every tile in a scored hand to a different physical copy of the same type and
    assert the score is unchanged. It caught the bug in one run (47 failures / 12,000
    comparisons, every one traced to this single cause) and went to 0 after the fix.

    **Validation:** full suite green (561 passed, 1 skipped); typecheck clean. PyMahjongGB
    cross-check rerun for the fans touched per CLAUDE.md — 4,500 hands across three fresh seeds
    (`20260809`, `777001`, `424242`), `our_bug` 0, `unclassified` 69 → 54, no NEW
    `our_bug`/UNCLASSIFIED introduced. Note the pre-fix residual on those seeds (69/4500 = 1.53%)
    matched item #34's recorded 1200-hand rate (18/1200 = 1.5%) almost exactly, which is worth
    remembering: **a stable unclassified RATE across runs is not evidence of an absent bug.**
    This one sat inside that residual for two full triage passes, misread as more of the same
    benign `Single Wait` ↔ `Closed Wait` decomposition ties item #34(a) had already confirmed.
    The tell that separated it from a genuine tie was the points column, not the fan-name diff:
    a benign tie has `ours == pmgb` totals, these had `ours == pmgb - 1`.

## Open follow-up work

- ~~**Highest priority, a live scoring regression:** revert `exclusions.ts`'s `[4,56]`/`[6,56]`/
  `[7,56]`/`[12,56]`/`[19,56]`~~ — **done, item #32(a) (2026-08-06).**
- ~~Add a test asserting every `exclusions.ts` entry carries a rulebook citation~~ — **done, item
  #33(a) (2026-08-06):** `exclusion-citations.ts` + `exclusions.test.ts`'s guard test. Existing
  entries were grandfathered, not backfilled — **backfilling real citations for the ~91
  grandfathered pairs remains open**, lower priority than it was before the guard existed (the
  guard's whole point is that a wrong NEW entry can no longer land silently; the grandfathered
  ones are unverified but not actively growing).
- ~~Fix `detectFullyConcealedHand`/`detectConcealedHand`~~ — **done, item #33(b).**
- ~~Fix `detectTwoConcealedPungs`~~ — **done, item #33(b).**
- ~~Add `exclusions.ts`'s `[18, 55]`~~ — **done, item #33(b).**
- ~~Add a `specialShape === 'sevenPairs'` branch to `detectAllTypes`~~ — **done, item #33(b).**
- ~~Fix `detectTileHog`'s multi-type undercount~~ — **done, item #33(b).**
- ~~Add `exclusions.ts`'s `[21,76]`/`[31,76]`~~ — **done, item #33(b).**
- ~~Fix `validation/src/win-circumstance.ts`'s `otherCopiesInOwnHand`~~ — **done, item #33(c).**
- ~~Re-triage the unclassified residual against the current run~~ — **done, item #34: 5 more bugs
  found and fixed ([25,36], [27,37], [29,70], the PureShiftedPungs/Chows exact-count bug and its
  [15,24]/[16,30] follow-on), 15 of 23 confirmed benign ties, 3 genuinely still open (below).**
- **`classify_mismatch`'s `FULLY_CONCEALED_COMBINES_SHAPE_NAMES` check (item #32's their_bug) is
  a strict all-or-nothing pre-check, not a peelable pattern like the rest of `ALL_PATTERNS`** —
  found during item #34's re-triage: `targeted-4-nine-gates` and `targeted-8-all-terminals` both
  have this already-known cause as PART of their diff, but it doesn't get peeled off because
  something else is also present, so the whole hand falls through to unclassified instead of
  showing as "already explained + genuinely new residual." Low risk, well-scoped fix (make it a
  peelable entry with the same shape-name gate, not a strict subset check) — deliberately not
  done in item #34's pass to keep that session's own scope bounded.
- **Two genuinely open rules questions from item #34(d), not yet resolved:**
  - Does Nine Gates (4) structurally exclude No Honors (76) (missing `[4,76]`, matching the
    many other `[X,76]` entries)? And separately: does PyMahjongGB stack regular per-unit fans
    (like Pung of Terminals or Honors) onto a special-shape hand from an alternate standard
    decomposition of the same tiles — and if so, does the rulebook support that, or is it
    another PyMahjongGB-specific behavior? `targeted-4-nine-gates`'s own residual doesn't
    resolve cleanly under either single hypothesis alone (see item #34(d) for the exact
    numbers that don't fit). Needs a dedicated `rules-lawyer` pass.
  - Does All Terminals (8) exclude Double Pung (65) for some rulebook reason not yet found?
    `targeted-8-all-terminals`'s own Double Pung count (2) is arithmetically defensible by
    fan 65's own definition, so this isn't a clean "always implied" case the way `[25,36]` was
    — needs independent verification, not assumed either way.
  - `4009266348` (seed): a likely harness-generator artifact (manual reconstruction produces
    the correct answer against the live engine), distinct from anything fixed in items
    #33/#34 — single hand, low priority, not re-investigated this pass.
- **Backfill real citations for the ~91 grandfathered exclusion pairs in
  `exclusion-citations.ts`** — deliberately deferred again in item #34 (explicit instruction).
  The guard already prevents a new uncited entry from landing; two full triage passes now
  (items #30 and #34, 11 genuinely-new bugs found and fixed total) have found the existing
  table's entries to be MISSING things, never WRONG about something already present — real,
  accumulating evidence the grandfathered table is healthy, not just an assumption. Still
  formally unverified pair-by-pair; still open; still correctly low priority.
- ~~Implement the "knitted" set concept~~ — **done, item #20.**
- ~~Get a `rules-lawyer` ruling on fan 48's point value~~ — **done, item #21 (no change needed).**
- ~~Triage the remaining ~55 unclassified mismatches~~ — **done, item #30.**
- Appendix 4 (seat/table rotation detail) is missing from the available PDF — if a more
  complete copy ever turns up, re-verify item #4 (dealer rotation) against it specifically.
- Fan encyclopedia (M5, `scoring/encyclopedia.ts`) example hands: v1 ships id/name/points/rule
  text only, no worked example hands per fan — constructing 81 valid, correctly-scored
  examples is a substantially larger task, tracked here rather than folded into M5.
- Phase 10's 2000-seed self-play regression question (item #18's "State of play" note) — still
  parked; see item #33's own session for whether it was picked up as time-permitting work.
