import type { FanMatch, HandContext } from './types.js'
import { allSets, combinations3, parseSuited, type ParsedSuited } from './set-helpers.js'

const SUITS = ['C', 'D', 'B'] as const

// 28. Pure Straight — 16 pts. §3.8.1 p.15 / App.1 p.32: "A hand using one
// each of all the numbers 1 through 9 from any one suit, forming three
// consecutive chows." I.e. chows starting at 1, 4, and 7 of the same suit
// (covering 1-9 exactly once each) present among the sets — the 4th set
// (whatever it is) doesn't matter, so this checks presence, not exact
// counts, unlike the "N-tier" fan families elsewhere in this file.
function detectPureStraight(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const chowRanksBySuit: Record<'C' | 'D' | 'B', Set<number>> = { C: new Set(), D: new Set(), B: new Set() }
  for (const s of sets) {
    if (s.kind !== 'chow') continue
    const parsed = parseSuited(s.typeId)
    if (parsed) chowRanksBySuit[parsed.suit].add(parsed.rank)
  }
  const hasStraight = SUITS.some((suit) => {
    const ranks = chowRanksBySuit[suit]
    return ranks.has(1) && ranks.has(4) && ranks.has(7)
  })
  return hasStraight ? [{ fanId: 28, count: 1 }] : []
}

// 29. Three-Suited Terminal Chows — 16 pts. §3.8.1 p.15 / App.1 p.32: "1-2-3
// and 7-8-9 in one suit, 1-2-3 and 7-8-9 in another suit, and a pair of
// fives in the remaining suit." All 4 sets are chows: two suits each
// contribute exactly {1-2-3, 7-8-9}, the third (unused-by-chows) suit
// supplies the pair of 5s.
function detectThreeSuitedTerminalChows(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  if (sets.length !== 4) return []
  if (!sets.every((s) => s.kind === 'chow')) return []

  const parsed = sets.map((s) => parseSuited(s.typeId))
  if (parsed.some((p) => p === null)) return []
  const bySuit: Record<'C' | 'D' | 'B', number[]> = { C: [], D: [], B: [] }
  for (const p of parsed) bySuit[p!.suit].push(p!.rank)

  const suitsWithChows = SUITS.filter((suit) => bySuit[suit].length > 0)
  if (suitsWithChows.length !== 2) return []
  for (const suit of suitsWithChows) {
    const ranks = bySuit[suit].slice().sort((a, b) => a - b)
    if (ranks.length !== 2 || ranks[0] !== 1 || ranks[1] !== 7) return []
  }
  const thirdSuit = SUITS.find((suit) => !suitsWithChows.includes(suit))!
  if (ctx.decomposition.pair !== `${thirdSuit}5`) return []
  return [{ fanId: 29, count: 1 }]
}

// 30. Pure Shifted Chows — 16 pts. §3.8.1 p.15 / App.1 p.33: "Three chows in
// one suit each shifted up either one or two numbers from the last, but
// not a combination of both."
//
// FIXED (docs/rules/decisions.md #34): used to require the WHOLE hand to
// have exactly 3 chows, incorrectly rejecting a hand with a 4th, unrelated
// chow alongside a genuine qualifying trio (found via the validation
// harness, seed 3563778031: 4 exposed chows, only 3 of which formed a
// same-suit shifted-by-1 run). Now searches every 3-combination of the
// hand's chow-type sets, matching detectPureShiftedPungs' identical fix
// just above (fans-24.ts) — and, symmetrically, this now ALSO fires on a
// genuine Four Shifted Chows hand (fan 16, all 4 consecutively shifted),
// same as detectPureShiftedPungs now also fires alongside Four Pure Shifted
// Pungs (fan 15) — both handled by new exclusions.ts entries ([16,30] and
// [15,24]) rather than relying on the old exact-count check's incidental
// (and, as this fix shows, incomplete) mutual exclusion.
function detectPureShiftedChows(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const chows = sets.filter((s) => s.kind === 'chow')
  for (const trio of combinations3(chows)) {
    const parsed = trio.map((s) => parseSuited(s.typeId))
    if (parsed.some((p) => p === null)) continue
    const suits = new Set(parsed.map((p) => p!.suit))
    if (suits.size !== 1) continue
    const ranks = parsed.map((p) => p!.rank).sort((a, b) => a - b)
    const diffs = new Set<number>()
    for (let i = 1; i < ranks.length; i++) diffs.add(ranks[i]! - ranks[i - 1]!)
    if (diffs.size !== 1) continue
    const shift = diffs.values().next().value!
    if (shift === 1 || shift === 2) return [{ fanId: 30, count: 1 }]
  }
  return []
}

// 31. All Fives — 16 pts. §3.8.1 p.15 / App.1 p.33: "A hand in which every
// set (chow, pung, kong, pair) includes the number '5'." A pung/kong must
// be rank 5 itself; a chow must span rank 5 (start at 3, 4, or 5); the pair
// must be rank 5. No honors anywhere (they have no rank).
function detectAllFives(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  // See fans-2.ts's detectAllChows comment: a knittedStraight candidate's
  // `sets` only covers the non-knitted remainder, so this loop would
  // otherwise never see the 3 invisible knitted sets (docs/rules/decisions.md #20).
  if (sets.length !== 4) return []
  for (const s of sets) {
    const parsed = parseSuited(s.typeId)
    if (!parsed) return []
    if (s.kind === 'chow') {
      if (parsed.rank < 3 || parsed.rank > 5) return []
    } else if (parsed.rank !== 5) {
      return []
    }
  }
  const pairParsed = parseSuited(ctx.decomposition.pair)
  if (!pairParsed || pairParsed.rank !== 5) return []
  return [{ fanId: 31, count: 1 }]
}

// 32. Triple Pung — 16 pts. §3.8.1 p.15 / App.1 p.34: "Three Pungs (or
// Kongs) of the same number in each suit." One pung/kong of the identical
// rank in all three suits — the 4th set (whatever it is) doesn't matter.
function detectTriplePung(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const pungs = sets.filter((s) => s.kind !== 'chow')
  const parsed: ParsedSuited[] = []
  for (const s of pungs) {
    const p = parseSuited(s.typeId)
    if (p) parsed.push(p)
  }
  for (let rank = 1; rank <= 9; rank++) {
    const suitsWithThisRank = new Set(parsed.filter((p) => p.rank === rank).map((p) => p.suit))
    if (suitsWithThisRank.size === 3) return [{ fanId: 32, count: 1 }]
  }
  return []
}

// 33. Three Concealed Pungs — 16 pts. §3.8.1 p.15 / App.1 p.34: "Three
// Concealed Pungs or Kongs (achieved without melding)." Exactly 3 (not 4 —
// that's Four Concealed Pungs, fan 12); the 4th set can be anything,
// including an exposed pung or a chow.
function detectThreeConcealedPungs(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const concealedPungCount = sets.filter((s) => s.kind !== 'chow' && s.concealed).length
  return concealedPungCount === 3 ? [{ fanId: 33, count: 1 }] : []
}

export const FANS_16_DETECTORS: Readonly<Record<number, (ctx: HandContext) => FanMatch[]>> = {
  28: detectPureStraight,
  29: detectThreeSuitedTerminalChows,
  30: detectPureShiftedChows,
  31: detectAllFives,
  32: detectTriplePung,
  33: detectThreeConcealedPungs,
}
