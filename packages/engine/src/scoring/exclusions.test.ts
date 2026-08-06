import { describe, expect, it } from 'vitest'
import { areExclusive, EXCLUDES } from './exclusions.js'

describe('EXCLUDES / areExclusive', () => {
  it('is symmetric: both directions of a known pair are registered', () => {
    expect(areExclusive(1, 38)).toBe(true) // Big Four Winds <-> Big Three Winds
    expect(areExclusive(38, 1)).toBe(true)
  })

  it('returns false for fans with no stated exclusion', () => {
    expect(areExclusive(1, 2)).toBe(false) // Big Four Winds / Big Three Dragons — no note either way
  })

  it('the three wait-types are mutually exclusive with each other', () => {
    expect(areExclusive(77, 78)).toBe(true)
    expect(areExclusive(77, 79)).toBe(true)
    expect(areExclusive(78, 79)).toBe(true)
  })

  it('All Terminals and All Honors are excluded against All Terminals and Honors (derived, not a literal quote)', () => {
    // Found via a failing scoreHand test in M2 session 4: every All
    // Terminals (8) or All Honors (11) hand unconditionally also satisfies
    // the broader All Terminals and Honors (18) criteria, so they must not
    // double-count — see the comment above RAW_EXCLUSION_PAIRS.
    expect(areExclusive(8, 18)).toBe(true)
    expect(areExclusive(11, 18)).toBe(true)
  })

  it('every registered fan id in the table is within 1-81', () => {
    for (const [a, set] of EXCLUDES.entries()) {
      expect(a).toBeGreaterThanOrEqual(1)
      expect(a).toBeLessThanOrEqual(81)
      for (const b of set) {
        expect(b).toBeGreaterThanOrEqual(1)
        expect(b).toBeLessThanOrEqual(81)
      }
    }
  })
})

// Prevalent Wind (60) / Seat Wind (61) vs Pung of Terminals or Honors (73)
// deliberately do NOT get a RAW_EXCLUSION_PAIRS entry — see
// docs/rules/decisions.md #24. Fan 73 is a countable per-unit fan, and a
// pairwise exclusion table entry would make resolveFanConflicts drop its
// WHOLE aggregated count (including credit for any other, independent
// terminal/honor pung in the same hand) instead of just the one physical
// pung that overlaps with 60/61. The real fix is in fans-1.test.ts's
// detectPungOfTerminalsOrHonors tests — it excludes the matching wind pung
// from its own count, the same way it already excludes dragon pungs by
// construction.
describe('Prevalent Wind / Seat Wind do not blanket-exclude Pung of Terminals or Honors', () => {
  it('Prevalent Wind (60) and Pung of Terminals or Honors (73) are not a whole-fan exclusion pair', () => {
    expect(areExclusive(60, 73)).toBe(false)
  })

  it('Seat Wind (61) and Pung of Terminals or Honors (73) are not a whole-fan exclusion pair', () => {
    expect(areExclusive(61, 73)).toBe(false)
  })
})

// The following describe blocks were all originally "KNOWN BUG" fixtures
// found by the validation harness (KICKOFF-validation-harness.md Stage 1,
// docs/rules/decisions.md #19) by cross-checking against PyMahjongGB 1.3.0's
// own exclusion table (fan_calculator.cpp's adjust_fan_table) — Step 3
// (decisions.md #22-#29) fixed every one of them; each `it` below now
// asserts the CORRECT (fixed) behavior, not the original bug. Each is the
// same shape of fix: a fan whose own definition structurally forces another
// (lower-value) fan's condition to also be true, so the pair was added to
// RAW_EXCLUSION_PAIRS to stop scoreHand double-counting both
// (§3.9.1.5's Non-Repeat Principle). Each is cited to the exact PyMahjongGB
// source line that independently implements the same suppression.
describe('All Simples / Pure Terminal Chows exclude No Honors', () => {
  it('All Simples (68) should exclude No Honors (76) — All Simples structurally has no honors', () => {
    // fan_calculator.cpp, "断幺不计无字" ("All Simples doesn't count No
    // Honors"). Our table already has this same pattern for 8 other fans
    // (see [8,76],[22,76],[25,76],[26,76],[29,76],[36,76],[37,76],[63,76]) —
    // 68 and 13 were simply missed when the table was transcribed.
    expect(areExclusive(68, 76)).toBe(true)
  })

  it('Pure Terminal Chows (13) should exclude No Honors (76) — one suit\'s terminal chows only, never an honor', () => {
    expect(areExclusive(13, 76)).toBe(true)
  })
})

describe('Out with Replacement Tile excludes Self-Drawn', () => {
  it('Out with Replacement Tile (46) should exclude Self-Drawn (80) — its own definition requires self-draw', () => {
    // fan_calculator.cpp, "杠上开花不计自摸". Same pattern our table already
    // has for Last Tile Draw ([44,80]) — 46 was missed. See
    // score-hand.test.ts for a dedicated isolated integration test —
    // docs/rules/decisions.md #20 found this pair has zero clean
    // occurrences in the 1200-hand harness sample (always entangled with
    // item #13's separate ambiguity), so this table-level unit test alone
    // isn't enough evidence the real fix works end-to-end.
    expect(areExclusive(46, 80)).toBe(true)
  })
})

describe('All Green excludes Half Flush and One Voided Suit', () => {
  it('All Green (3) should exclude Half Flush (50) and One Voided Suit (75) — fan 3 had NO exclusion entries at all before this', () => {
    // fan_calculator.cpp, "绿一色不计混一色、缺一门" ("All Green doesn't count
    // Half Flush, One Voided Suit"). All Green (only Bamboo 2/3/4/6/8 +
    // Green Dragon) trivially also satisfies both fans' own definitions
    // (one suit + honors; exactly one suit used) — same Non-Repeat shape as
    // every other pair in this table, just never transcribed for fan 3.
    expect(areExclusive(3, 50)).toBe(true)
    expect(areExclusive(3, 75)).toBe(true)
  })
})

// REGRESSION, not a fixed bug — docs/rules/decisions.md #23 was WRONG and is
// pending revert (see the new item logged during Step 4/5 triage). #23 added
// these five pairs on PyMahjongGB-only evidence (fan_calculator.cpp's
// "把不求人修正为自摸" downgrade for Nine Gates/Four Concealed Pungs, plus the
// special-shape path never setting Fully Concealed Hand at all), WITHOUT the
// direct rulebook citation KICKOFF-validation-harness.md 1e requires before
// changing engine behavior to match PyMahjongGB. Direct re-read of
// docs/rules/mcr_EN.pdf's §3.8.1 fan table (p.14-15) shows the rulebook says
// the opposite for every one of these five fans — each entry ends with the
// table's own explicit parenthetical:
//   - Fan 4 (Nine Gates): "...creating the nine-sided wait of
//     1,2,3,4,5,6,7,8,9. (Fully Concealed may be combined if Self-Drawn)."
//   - Fan 6 (Seven Shifted Pairs): "...(Fully Concealed may be combined if
//     Self-Drawn)."
//   - Fan 7 (Thirteen Orphans): "...along with a pair of the 13th. (Fully
//     Concealed may be combined if Self-Drawn)."
//   - Fan 12 (Four Concealed Pungs): "...(achieved without melding – Fully
//     Concealed may be combined if Self-Drawn)."
//   - Fan 19 (Seven Pairs): "A hand formed by seven pairs. (Fully Concealed
//     may be combined if Self-Drawn)."
// This is a case KICKOFF-validation-harness.md 1e warned about directly:
// "quietly replace our misreadings with theirs" — our engine and
// PyMahjongGB apparently share the SAME wrong answer here (both suppress
// fan 56 for these shapes), which is exactly why the 1200-hand cross-check
// never flagged it as a mismatch; only a direct rulebook re-read caught it.
// These `it`s below still assert the CURRENT (buggy) `true` — matching
// exclusions.ts's still-present [4,56]/[6,56]/[7,56]/[12,56]/[19,56] entries
// — pending the revert; flip to `false` once exclusions.ts is corrected.
describe('KNOWN REGRESSION (decisions.md #23 was wrong): Fully Concealed Hand should NOT be excluded by these five fans', () => {
  it('Nine Gates (4) incorrectly excludes Fully Concealed Hand (56) — rulebook says they combine', () => {
    expect(areExclusive(4, 56)).toBe(true) // WRONG, should be false — see comment above
  })
  it('Four Concealed Pungs (12) incorrectly excludes Fully Concealed Hand (56) — rulebook says they combine', () => {
    expect(areExclusive(12, 56)).toBe(true) // WRONG, should be false
  })
  it('Seven Shifted Pairs (6) incorrectly excludes Fully Concealed Hand (56) — rulebook says they combine', () => {
    expect(areExclusive(6, 56)).toBe(true) // WRONG, should be false
  })
  it('Seven Pairs (19) incorrectly excludes Fully Concealed Hand (56) — rulebook says they combine', () => {
    expect(areExclusive(19, 56)).toBe(true) // WRONG, should be false
  })
  it('Thirteen Orphans (7) incorrectly excludes Fully Concealed Hand (56) — rulebook says they combine', () => {
    expect(areExclusive(7, 56)).toBe(true) // WRONG, should be false
  })
})

// NEW bug, found during Step 4/5 triage (docs/rules/decisions.md, item
// logged alongside the #23 regression above) — NOT fixed here, fixture only.
// All Even Pungs (21: pungs/kongs of 2/4/6/8 only) and All Fives (31: every
// set includes a 5) each structurally can never include an honor tile, same
// shape as the 8 other [X,76] entries already in this table (8, 13, 22, 25,
// 26, 27, 29, 36, 37, 63, 68) — simply missed when those two fans were
// transcribed. Found via validation/allowlist.py cleanup (decisions.md #26).
describe('KNOWN BUG: All Even Pungs / All Fives should exclude No Honors', () => {
  it('All Even Pungs (21) should exclude No Honors (76) but does not yet', () => {
    expect(areExclusive(21, 76)).toBe(false) // WRONG, should be true
  })
  it('All Fives (31) should exclude No Honors (76) but does not yet', () => {
    expect(areExclusive(31, 76)).toBe(false) // WRONG, should be true
  })
})

// NEW bug, found during Step 4/5 triage's unclassified-mismatch pass — NOT
// fixed here, fixture only. All Terminals and Honors (18: pair/pungs/kongs
// made up of 1/9/honor tiles) trivially implies Outside Hand's (55: every
// set — including the pair — includes a terminal or honor) weaker
// condition, same "narrower named fan implies a broader one" shape already
// present for All Terminals ([8,55]) and All Honors ([11,55]) just above —
// 18 is the union of 8 and 11 and was simply missed. Found via the
// validation harness (1200-hand cross-check, seed 20260805): every hand
// that fires fan 18 also fires our fan 55, but PyMahjongGB never scores
// Outside Hand alongside All Terminals and Honors.
describe('KNOWN BUG: All Terminals and Honors should exclude Outside Hand', () => {
  it('All Terminals and Honors (18) should exclude Outside Hand (55) but does not yet', () => {
    expect(areExclusive(18, 55)).toBe(false) // WRONG, should be true
  })
})
