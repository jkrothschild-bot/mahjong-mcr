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
    understood as 7 bugs not 6 per CLAUDE.md's Step 0 correction) to 15 — the residual 15 splits
    between the pre-existing item #11 concealment ambiguity (8 hands, unrelated to Step 3) and
    the newly-found item #27 Tile Hog multi-type gap (7 hands, discovered but deliberately not
    fixed — out of the original 6-bug scope). Two more new, unfixed gaps surfaced along the way
    and are tracked below: item #27 itself, and the `[21,76]`/`[31,76]` All Even Pungs/All Fives
    finding from item #26's allowlist cleanup.

## Open follow-up work

- New, found while fixing Step 3's six bugs (not part of the original scope): `detectTileHog`
  only reports count 1 even when two separate tile types are each hogged in the same hand (item
  #27, fixture added, not fixed); All Even Pungs (21) and All Fives (31) also structurally
  exclude No Honors (76) but have no `[21,76]`/`[31,76]` entries (found via allowlist cleanup,
  item #26, no fixture yet).
- ~~Implement the "knitted" set concept~~ — **done, item #20.**
- ~~Get a `rules-lawyer` ruling on fan 48's point value~~ — **done, item #21 (no change needed).**
- Triage the remaining ~55 unclassified mismatches from item #20's run (rerun
  `validation/compare.py --json-report` for the current list — down from ~180 after item #20's
  fix plus the classifier's new pattern-composition logic).
- Appendix 4 (seat/table rotation detail) is missing from the available PDF — if a more
  complete copy ever turns up, re-verify item #4 (dealer rotation) against it specifically.
- Fan encyclopedia (M5, `scoring/encyclopedia.ts`) example hands: v1 ships id/name/points/rule
  text only, no worked example hands per fan — constructing 81 valid, correctly-scored
  examples is a substantially larger task, tracked here rather than folded into M5.
