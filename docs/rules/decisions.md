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
   **Open**: the rulebook doesn't specify a mechanical limit on how close a replacement-draw
   pointer can approach the front before triggering an early draw game (e.g. what happens if
   normal draws and back-end replacement draws meet in the middle) — not addressed in the
   42-page text available; low risk, extremely rare in practice.

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
   fix; Honors-and-Knitted-Tiles deferred to M2 pending the fan-list extraction for its exact
   tile split.**

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

## Open follow-up work

- Implement Thirteen Orphans in `win-detection.ts` (this fix pass).
- Implement Honors-and-Knitted-Tiles in `win-detection.ts` once the fan-list extraction
  pins down the exact Lesser/Greater tile-composition split (Fan #20/#34) — tracked for M2.
- Appendix 4 (seat/table rotation detail) is missing from the available PDF — if a more
  complete copy ever turns up, re-verify item #4 (dealer rotation) against it specifically.
