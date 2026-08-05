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

// KNOWN BUGS, found by the validation harness (KICKOFF-validation-harness.md
// Stage 1, docs/rules/decisions.md's newest "Confirmed" entry) by
// cross-checking against PyMahjongGB 1.3.0's own exclusion table
// (fan_calculator.cpp's adjust_fan_table). Recorded per CLAUDE.md's "every
// scoring bug found becomes a permanent test fixture before it is fixed"
// rule — these assertions describe ACTUAL (wrong) behavior; do not "fix"
// them to pass differently, fix exclusions.ts in a separate commit and then
// flip every `toBe(false)` below to `toBe(true)`.
//
// All five are the same shape of bug: a fan whose own definition
// structurally forces another (lower-value) fan's condition to also be
// true, but the pair was never added to RAW_EXCLUSION_PAIRS, so scoreHand
// currently double-counts both instead of keeping only the higher-value one
// (§3.9.1.5's Non-Repeat Principle). Each is cited to the exact PyMahjongGB
// source line that independently implements the same suppression.
describe('KNOWN BUG — missing exclusion pairs, found via PyMahjongGB cross-check', () => {
  it('Prevalent Wind (60) should exclude Pung of Terminals or Honors (73) — same physical wind pung', () => {
    // fan_calculator.cpp's adjust_fan_table has no direct "圈风刻不计幺九刻"
    // line, but get_1_pung_fan is only ever invoked on a pung NOT already
    // claimed by the seat/prevalent-wind check in adjust_by_packs_traits —
    // structurally, PyMahjongGB never double-awards a wind pung that
    // matches the table wind. Confirmed empirically: KICKOFF-validation-harness.md
    // Stage 1's targeted-43-chicken-hand case (prevalentWind=East, a
    // concealed East pung) scores ONLY 'Prevalent Wind' (2pts) on
    // PyMahjongGB's side, never also 'Pung of Terminals or Honors' (1pt),
    // for that same pung.
    expect(areExclusive(60, 73)).toBe(true)
  })

  it('Seat Wind (61) should exclude Pung of Terminals or Honors (73) — same physical wind pung', () => {
    expect(areExclusive(61, 73)).toBe(true)
  })

  it('All Simples (68) should exclude No Honors (76) — All Simples structurally has no honors', () => {
    // fan_calculator.cpp, "断幺不计无字" ("All Simples doesn't count No
    // Honors"). Our table already has this same pattern for 8 other fans
    // (see [8,76],[22,76],[25,76],[26,76],[27,76],[29,76],[36,76],[37,76],
    // [63,76] above) — 68 and 13 (below) were simply missed when the table
    // was transcribed.
    expect(areExclusive(68, 76)).toBe(false) // SHOULD be true
  })

  it('Pure Terminal Chows (13) should exclude No Honors (76) — one suit\'s terminal chows only, never an honor', () => {
    expect(areExclusive(13, 76)).toBe(false) // SHOULD be true
  })

  it('Out with Replacement Tile (46) should exclude Self-Drawn (80) — its own definition requires self-draw', () => {
    // fan_calculator.cpp, "杠上开花不计自摸". Same pattern our table already
    // has for Last Tile Draw ([44,80]) — 46 was missed.
    expect(areExclusive(46, 80)).toBe(false) // SHOULD be true
  })

  it('All Green (3) should exclude Half Flush (50) and One Voided Suit (75) — fan 3 has NO exclusion entries at all currently', () => {
    // fan_calculator.cpp, "绿一色不计混一色、缺一门" ("All Green doesn't count
    // Half Flush, One Voided Suit"). All Green (only Bamboo 2/3/4/6/8 +
    // Green Dragon) trivially also satisfies both fans' own definitions
    // (one suit + honors; exactly one suit used) — same Non-Repeat shape as
    // every other pair above, just never transcribed for fan 3 at all.
    expect(areExclusive(3, 50)).toBe(false) // SHOULD be true
    expect(areExclusive(3, 75)).toBe(false) // SHOULD be true
  })
})

// A SIXTH, related bug: PyMahjongGB never awards Fully Concealed Hand (56)
// alongside a fan that already structurally guarantees the entire hand is
// concealed — it downgrades to plain Self-Drawn (80) instead (still worth
// crediting the self-draw, just not double-crediting the concealment).
// Confirmed by direct source read: fan_calculator.cpp explicitly does this
// for Nine Gates (4) and Four Concealed Pungs (12) ("把不求人修正为自摸" —
// "correct Fully Concealed Hand to Self-Drawn" — in adjust_fan_table), and
// implicitly for all four special shapes (Seven Pairs family, Thirteen
// Orphans, Honors-and-Knitted) because calculate_special_form_fan never
// calls adjust_by_self_drawn at all — the only place Fully Concealed Hand
// is ever set — so it can never fire for those shapes in the first place.
// Confirmed empirically against every one of these labels in Stage 1's
// 1200-hand run.
describe('Fully Concealed Hand should be excluded by fans that already require full concealment', () => {
  it('Nine Gates (4) should exclude Fully Concealed Hand (56)', () => {
    expect(areExclusive(4, 56)).toBe(true)
  })
  it('Four Concealed Pungs (12) should exclude Fully Concealed Hand (56)', () => {
    expect(areExclusive(12, 56)).toBe(true)
  })
  it('Seven Shifted Pairs (6) should exclude Fully Concealed Hand (56)', () => {
    expect(areExclusive(6, 56)).toBe(true)
  })
  it('Seven Pairs (19) should exclude Fully Concealed Hand (56)', () => {
    expect(areExclusive(19, 56)).toBe(true)
  })
  it('Thirteen Orphans (7) should exclude Fully Concealed Hand (56)', () => {
    expect(areExclusive(7, 56)).toBe(true)
  })
})
