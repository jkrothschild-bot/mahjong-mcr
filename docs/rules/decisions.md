# Rulebook decisions

Rulings on MCR rule details that were ambiguous, underspecified in SPEC.md/PLAN.md,
or not yet confirmable because `docs/rules/mcr_EN.pdf` hadn't been added to the repo
at the time. Per CLAUDE.md: never implement a scoring/structural rule from memory —
every entry here should eventually be checked against the actual rulebook text (via
the `rules-lawyer` agent) and updated from "provisional" to "confirmed" with a section
citation, or corrected.

## Provisional (added during M1, packages/engine)

1. **Robbing the kong (qiang gang)** — only a *promoted/added* kong (pung→kong upgrade)
   opens a win-claim window for other players. A kong claimed directly from a discard
   never needs a separate rob mechanic (win already beats it in the normal discard-claim
   priority). A concealed kong (ankan) is never robbable.
   Status: common convention across mahjong rulesets; not yet confirmed for MCR specifically.

2. **Multi-simultaneous win (multi-ron)** — disallowed in M1's engine. If two different
   seats are structurally both able to win off the same discard, the engine tie-breaks to
   whichever seat is nearest in turn order after the discarder, and only that seat wins.
   Status: MCR's actual settlement convention for multi-ron is unknown; this affects M2
   payment math and should be revisited before M2 locks in settlement rules.

3. **Dead wall size = 14 tiles; initial deal = 53 tiles** (13 × 4 players + the dealer's
   14th tile folded into the deal itself, so the dealer's first turn is a discard, not a
   draw). Standard generic-mahjong convention.
   Status: not yet confirmed against MCR's exact dead-wall/replacement-tile rules. Low risk
   either way — only affects how many kong/flower replacement draws are possible before an
   early exhaustive draw.

4. **Dealer rotation** — the dealer repeats the same seat (and the match doesn't advance
   `roundHandIndex`/`prevailingWind`) when the dealer wins the hand, or on an exhaustive
   draw. Otherwise the dealer seat rotates. A repeat is an *additional* hand layered on top
   of the 16 non-repeat dealer slots (4 winds × 4 hands), not a replacement for one of them.
   Status: generic-mahjong default; MCR's exact dealer-repeat conditions (and whether repeats
   can be capped) are unconfirmed. Only affects match-length bookkeeping/display, not any
   single hand's structural correctness.

5. **Seven pairs** — requires a fully concealed hand (no melds of any kind, including a
   concealed kong) and exactly 7 *distinct* pairs (four of the same tile does not count as
   two pairs of that type).
   Status: conservative/common default. Deliberately under-accepting a rare edge case is
   safer than silently over-accepting an invalid one until confirmed.

6. **No third hand-shape** — M1 recognizes exactly two winning shapes: four sets + a pair,
   and seven pairs. No Thirteen-Orphans-equivalent shape is implemented.
   Status: no evidence MCR has such a hand; revisit only if M2's full 81-fan list surfaces one.

## How to resolve these

Once `docs/rules/mcr_EN.pdf` is added, consult the `rules-lawyer` agent for each item above,
update this file with the confirmed rule + section citation, and file any engine changes needed
as normal follow-up work (not silently — CLAUDE.md requires citing the rulebook section for
every scoring/structural rule).
