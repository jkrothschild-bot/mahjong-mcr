// Fan-vs-fan exclusion pairs ("does not combine with X" / "not valid if
// combined with X"), transcribed directly from each fan's own rulebook
// entry (docs/rules/mcr_EN.pdf, §3.8.1 + Appendix 1). This is how
// §3.9.1.5's Non-Repeat Principle ("when a fan is inevitably implied or
// included by another fan, both fan may not be scored") is actually
// implemented — the rulebook has already worked out the set-level
// implications for all 81 fans and expressed them as simple pairwise
// facts, so those facts are transcribed rather than re-derived from the
// abstract principle text. See scoring/registry.ts's file comment for why
// this is a symmetric, id-keyed table covering fans without a detector yet.
//
// Only genuine "does not combine" / "not valid if combined with" statements
// are encoded here — a "combines with X if self-drawn" note is a positive
// combinability statement (informational only; two fans not listed here are
// allowed to combine by default), not an exclusion, and is NOT encoded.
//
// Two entries below ([8,18] and [11,18]) are an exception: they were ADDED
// (not found stated explicitly in fan 18's own "does not combine with" text)
// because they're a direct, unconditional logical consequence of the fan
// definitions themselves — every hand satisfying All Terminals (8) or All
// Honors (11) necessarily also satisfies the broader All Terminals and
// Honors (18) criteria (a hand entirely of terminals, or entirely of
// honors, trivially qualifies as "terminals mixed with honors" too) — this
// is exactly what §3.9.1.5's Non-Repeat Principle describes ("a fan
// inevitably implied... by another fan"), just not spelled out as an
// explicit pairwise note for this particular pair. Found via a failing
// test (docs/rules/decisions.md has no separate entry for this — noted
// here since it's really an exclusions.ts data point, not a rules
// ambiguity). Contrast with Big Four Winds (1), which does NOT get a
// blanket exclusion against 18 despite sometimes co-occurring — that
// overlap depends on which pair tile the hand happens to have (not a
// universal implication), so it's a legitimate independent stack, not a
// Non-Repeat case.
const RAW_EXCLUSION_PAIRS: readonly [number, number][] = [
  // 8/11 -> 18: derived (see comment above), not a literal rulebook quote
  [8, 18],
  [11, 18],
  // 6 -> 19: derived, same reasoning — Seven Shifted Pairs (6) is a strictly
  // stricter version of Seven Pairs (19): 7 consecutive-rank same-suit pairs
  // are still, trivially, "seven pairs." Not stated explicitly in fan 6's or
  // fan 19's own text (fan 6 excludes Full Flush/Concealed Hand/Single Wait;
  // fan 19 excludes Concealed Hand/Single Wait — neither mentions the other).
  [6, 19],
  // 6 -> 76: derived. Seven Shifted Pairs requires 7 consecutive ranks in
  // one suit — honor tiles have no rank at all, so this shape can never
  // include one; every Seven Shifted Pairs hand is unavoidably also "No
  // Honors" (76). A genuine universal implication (unlike, say, Big Four
  // Winds vs. fan 18), found via a failing test once fan 76 existed.
  [6, 76],
  // 54 -> 59: derived. Two Dragon Pungs (54, named/flat 6pts for exactly 2
  // dragon pungs) unavoidably also satisfies the generic countable Dragon
  // Pung (59, 2pts each) at count 2 = 4pts for the SAME two physical pungs —
  // without this, both would stack (6+4=10) by double-counting one pair of
  // sets under two different naming schemes. Neither fan's own text mentions
  // the other. See docs/rules/decisions.md's M2-tail-batches entry.
  [54, 59],
  // 32 -> 65: derived, same "named exact-count fan implies the generic
  // countable per-unit fan" pattern as 54->59. Triple Pung (32, all 3 suits
  // share a rank) trivially contains 2 of those 3 suits, which is exactly
  // Double Pung's (65) own definition — without this, a hand could score
  // Triple Pung (16) AND Double Pung again for a sub-pair of the same pungs.
  [32, 65],
  // 41 -> 70: derived, same pattern again. Mixed Triple Chow (41, all 3
  // suits share a chow rank) trivially contains 2 of those 3 suits, which is
  // Mixed Double Chow's (70) own definition.
  [41, 70],
  // 48 -> 67: derived, same pattern. Two Concealed Kongs (48, named/flat
  // 8pts for exactly 2 concealed kongs) unavoidably also satisfies the
  // generic countable Concealed Kong (67, 2pts each) at count 2 = 4pts for
  // the same two physical kongs.
  [48, 67],
  // 57 -> 74: derived, same pattern. Two Melded Kongs (57, named/flat 4pts
  // for exactly 2 exposed kongs) unavoidably also satisfies the generic
  // countable Melded Kong (74, 1pt each) at count 2 = 2pts for the same two
  // physical kongs.
  [57, 74],
  // 28 -> 71: derived. Pure Straight (28: chow(1)+chow(4)+chow(7), same
  // suit) trivially contains chow(1)+chow(4) as a 6-consecutive-tile run —
  // exactly Short Straight's (71) own definition — as a sub-pair of its own
  // 3 chows. (Four Shifted Chows, fan 16, already excludes 71 via the
  // original rulebook-transcribed table; this adds the analogous Pure
  // Straight case, which the book's own text for fan 28/71 doesn't mention.)
  [28, 71],
  // 28 -> 72: derived, same source hand shape. Pure Straight's chow(1) and
  // chow(7) (same suit) are trivially also "Two Terminal Chows" (72, one
  // 1-2-3 and one 7-8-9 in the same suit) — the rulebook already excludes
  // this pairing for the OTHER two terminal-chow fans (13 and 29) but not
  // for Pure Straight specifically.
  [28, 72],
  // 38 -> 73: derived, same "named exact-count wind/honor fan implies the
  // generic per-unit Pung of Terminals or Honors fan" pattern already
  // present for fans 1/4/8/9/11 (all of which already exclude 73 in the
  // original table). Big Three Winds (38, 3 wind pungs) trivially also
  // satisfies 73's count-3 for those same pungs.
  [38, 73],
  // 56 -> 80: derived. Fully Concealed Hand (56) requires a self-drawn win
  // by its own definition, which is exactly Self-Drawn's (80) entire
  // definition — every hand satisfying 56 unavoidably also satisfies 80 for
  // the same win. Same pattern as fan 44's existing (rulebook-stated)
  // exclusion of 80.
  [56, 80],
  // 4/6/7/12/19 -> 56: derived. Fully Concealed Hand (56) means "won by
  // self-draw with no melded sets" — these five fans each already
  // structurally guarantee that same all-concealed shape by their own
  // definition (Nine Gates/Seven Shifted Pairs/Thirteen Orphans/Four
  // Concealed Pungs/Seven Pairs can never contain an exposed meld), so any
  // one of them completed by self-draw would otherwise double-score the
  // concealment itself as both the named fan's own value AND 56's 6pts on
  // top. Not stated in any of the six fans' own rulebook text (derived, same
  // shape as [56,80] just above). Evidence this was missing: PyMahjongGB's
  // `adjust_fan_table` explicitly downgrades Fully Concealed Hand to plain
  // Self-Drawn for Nine Gates (4) and Four Concealed Pungs (12) ("把不求人
  // 修正为自摸"), and its `calculate_special_form_fan` path (Seven Pairs
  // family/Thirteen Orphans/Honors-and-Knitted) never calls
  // `adjust_by_self_drawn` at all — the only place Fully Concealed Hand is
  // ever set — so 56 can structurally never fire for those shapes either.
  // docs/rules/decisions.md #23.
  [4, 56],
  [6, 56],
  [7, 56],
  [12, 56],
  [19, 56],
  // NOTE: [60,73]/[61,73] (Prevalent/Seat Wind vs Pung of Terminals or
  // Honors) deliberately do NOT belong in this table, unlike every other
  // "named exact-count fan implies the generic per-unit fan" pair above
  // (1/4/8/9/11/18/38 -> 73). Fan 73 is COUNTABLE (its FanMatch carries one
  // aggregated count across every qualifying pung in the hand), and
  // resolveFanConflicts drops a whole-fan MATCH, not a per-set contribution
  // — so a pairwise entry here would silently zero out credit for any OTHER
  // independent terminal/honor pung in the same hand whenever a wind pung
  // happens to also be present, not just the one overlapping pung. Fan 73's
  // own text ("A Dragon pung scores 2 points instead") already resolves its
  // one stated overlap at the physical-set level, not the whole-fan level —
  // confirmed by a worked example (App.1 p.38, fan 57 example 1) scoring
  // Dragon Pung AND Pung of Terminals or Honors side-by-side in one hand.
  // The correct fix lives in detectPungOfTerminalsOrHonors itself (fans-1.ts):
  // it excludes the specific pung(s) matching ctx.prevailingWind/seatWind
  // from its OWN count, the same way it already excludes dragon pungs by
  // construction, leaving any other qualifying pung still counted.
  // docs/rules/decisions.md #24 (supersedes #22's exclusion-table approach;
  // #22's underlying finding — these two overlap on the same physical pung
  // — was correct, only the implementation mechanism was wrong).
  // 1. Big Four Winds
  [1, 38], // Big Three Winds
  [1, 49], // All Pungs
  [1, 60], // Prevalent Wind
  [1, 61], // Seat Wind
  [1, 73], // Pung of Terminals or Honors
  // 2. Big Three Dragons
  [2, 54], // Two Dragon Pungs
  [2, 59], // Dragon Pung
  // 4. Nine Gates
  [4, 22], // Full Flush
  [4, 62], // Concealed Hand
  [4, 73], // Pung of Terminals or Honors
  // 5. Four Kongs
  [5, 79], // Single Wait
  // 6. Seven Shifted Pairs
  [6, 22], // Full Flush
  [6, 62], // Concealed Hand
  [6, 79], // Single Wait
  // 7. Thirteen Orphans
  [7, 52], // All Types
  [7, 62], // Concealed Hand
  [7, 79], // Single Wait
  // 8. All Terminals
  [8, 49], // All Pungs
  [8, 55], // Outside Hand
  [8, 73], // Pung of Terminals or Honors
  [8, 76], // No Honors
  // 9. Little Four Winds
  [9, 38], // Big Three Winds
  [9, 73], // Pung of Terminals or Honors
  // 10. Little Three Dragons
  [10, 54], // Two Dragon Pungs
  [10, 59], // Dragon Pung
  // 11. All Honors
  [11, 49], // All Pungs
  [11, 55], // Outside Hand
  [11, 73], // Pung of Terminals or Honors
  // 12. Four Concealed Pungs
  [12, 49], // All Pungs
  [12, 62], // Concealed Hand
  // 13. Pure Terminal Chows
  [13, 19], // Seven Pairs
  [13, 22], // Full Flush
  [13, 63], // All Chows
  [13, 69], // Pure Double Chow
  [13, 72], // Two Terminal Chows
  // 13 -> 76: derived, same pattern as the other [X,76] entries below (8,
  // 22, 25, 26, 27, 29, 36, 37, 63). Pure Terminal Chows (13: one suit's
  // 1-2-3 and 7-8-9 chows only) can never include an honor tile — a chow
  // has no honor-tile members at all. Simply missed when this fan's own
  // section was originally transcribed. docs/rules/decisions.md #26.
  [13, 76], // No Honors
  // 14. Quadruple Chow
  [14, 24], // Pure Shifted Pungs
  [14, 64], // Tile Hog
  [14, 69], // Pure Double Chow
  // 15. Four Pure Shifted Pungs
  [15, 23], // Pure Triple Chow
  [15, 49], // All Pungs
  // 16. Four Shifted Chows
  [16, 71], // Short Straight
  // 18. All Terminals and Honors
  [18, 49], // All Pungs
  [18, 73], // Pung of Terminals or Honors
  // 19. Seven Pairs
  [19, 62], // Concealed Hand
  [19, 79], // Single Wait
  // 20. Greater Honors and Knitted Tiles
  [20, 52], // All Types
  [20, 62], // Concealed Hand
  // 21. All Even Pungs
  [21, 49], // All Pungs
  [21, 68], // All Simples
  // 22. Full Flush
  [22, 76], // No Honors
  // 23. Pure Triple Chow
  [23, 24], // Pure Shifted Pungs
  [23, 69], // Pure Double Chow
  // 25. Upper Tiles
  [25, 76], // No Honors
  // 26. Middle Tiles
  [26, 76], // No Honors
  [26, 68], // All Simples
  // 27. Lower Tiles
  [27, 76], // No Honors
  // 29. Three-Suited Terminal Chows
  [29, 69], // Pure Double Chow
  [29, 72], // Two Terminal Chows
  [29, 76], // No Honors
  [29, 63], // All Chows
  // 31. All Fives
  [31, 68], // All Simples
  // 34. Lesser Honors and Knitted Tiles
  [34, 52], // All Types
  [34, 62], // Concealed Hand
  // 36. Upper Four
  [36, 76], // No Honors
  // 37. Lower Four
  [37, 76], // No Honors
  // 40. Reversible Tiles
  [40, 75], // One Voided Suit
  // 44. Last Tile Draw
  [44, 80], // Self-Drawn
  // 46. Out with Replacement Tile — derived, same pattern as [44,80] just
  // above. Both fans are flat (whole-hand, count always 1), so a whole-fan
  // exclusion entry is architecturally safe (unlike fan 73's countable
  // case — see item #24). The kong-replacement-draw path of fan 46
  // (detectOutWithReplacementTile's `wonOnKongReplacement` branch) requires
  // winMethod === 'selfDraw' by construction, which is Self-Drawn's (80)
  // entire definition — every hand reaching fan 46 via that path
  // unavoidably also satisfies 80 for the same win. (Fan 46's OTHER path,
  // the last-discard-of-game branch, has winMethod === 'discard' and so
  // never co-occurs with 80 in the first place — this pair is a no-op for
  // that path, not a conflict.) docs/rules/decisions.md #28.
  [46, 80], // Self-Drawn
  // 47. Robbing The Kong
  [47, 58], // Last Tile
  // 53. Melded Hand
  [53, 79], // Single Wait
  // 63. All Chows — "No Honors is implied" (Non-Repeat Principle example)
  [63, 76], // No Honors
  // 68. All Simples — derived, same "X structurally has no honors" pattern
  // as 63->76 just above and the other [X,76] entries (8, 13, 22, 25, 26,
  // 27, 29, 36, 37). All Simples (68: no terminal or honor tiles at all)
  // trivially satisfies No Honors (76) too. Simply missed when this fan's
  // own section was originally transcribed. docs/rules/decisions.md #26.
  [68, 76], // No Honors
  // 77/78/79 — the three wait-types are mutually exclusive (a winning tile
  // can only be waited on one way)
  [77, 78],
  [77, 79],
  [78, 79],
]

export const EXCLUDES: ReadonlyMap<number, ReadonlySet<number>> = (() => {
  const map = new Map<number, Set<number>>()
  const add = (a: number, b: number) => {
    if (!map.has(a)) map.set(a, new Set())
    map.get(a)!.add(b)
  }
  for (const [a, b] of RAW_EXCLUSION_PAIRS) {
    add(a, b)
    add(b, a)
  }
  return map
})()

export function areExclusive(fanIdA: number, fanIdB: number): boolean {
  return EXCLUDES.get(fanIdA)?.has(fanIdB) ?? false
}
