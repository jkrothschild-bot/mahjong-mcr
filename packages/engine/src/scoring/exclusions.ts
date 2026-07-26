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
  // 47. Robbing The Kong
  [47, 58], // Last Tile
  // 53. Melded Hand
  [53, 79], // Single Wait
  // 63. All Chows — "No Honors is implied" (Non-Repeat Principle example)
  [63, 76], // No Honors
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
