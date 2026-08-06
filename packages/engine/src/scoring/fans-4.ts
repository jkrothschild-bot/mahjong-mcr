import type { FanMatch, HandContext } from './types.js'
import { allSets, isHonorTypeId, isTerminalTypeId, parseSuited } from './set-helpers.js'

// 55. Outside Hand — 4 pts. §3.8.1 p.16 / App.1 p.38: "Each set (including
// the pair) must contain at least one Terminal or Honor tile." Unlike All
// Terminals and Honors (fan 18), chows ARE allowed here — a chow only
// qualifies if it touches a terminal (1-2-3 or 7-8-9, not a middle run like
// 4-5-6), and a pung/kong/pair qualifies only if its own tile type IS a
// terminal or honor (a pung is 3 identical tiles, so "contains" and "is" are
// the same thing for it).
function detectOutsideHand(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  // See fans-2.ts's detectAllChows comment: a knittedStraight candidate's
  // `sets` only covers the non-knitted remainder, so this loop would
  // otherwise pass over an incomplete list without ever seeing the 3
  // invisible knitted sets (docs/rules/decisions.md #20).
  if (sets.length !== 4) return []
  for (const s of sets) {
    if (s.kind === 'chow') {
      const parsed = parseSuited(s.typeId)
      if (!parsed || (parsed.rank !== 1 && parsed.rank !== 7)) return []
    } else if (!isTerminalTypeId(s.typeId) && !isHonorTypeId(s.typeId)) {
      return []
    }
  }
  const pair = ctx.decomposition.pair
  if (!isTerminalTypeId(pair) && !isHonorTypeId(pair)) return []
  return [{ fanId: 55, count: 1 }]
}

// 56. Fully Concealed Hand — 4 pts. §3.8.1 p.16 / App.1 p.38: "A hand that
// is completed by Self-Drawing the winning tile, with no melded (exposed)
// sets at all." Naturally mutually exclusive with Concealed Hand (fan 62,
// same "zero EXPOSED melds" shape but a discard win) by winMethod alone —
// no exclusion-table entry needed, matching Half Flush/Full Flush's pattern.
//
// FIXED (docs/rules/decisions.md #30(b), then #33): used to check
// `ctx.melds.length === 0` — literally zero sets of any kind — but a
// concealed kong doesn't break concealment. §3.6.8 "How to Kong" is
// direct and unambiguous: "(2) Concealed Kong: ... four identical tiles
// concealed within the hand ... With a Concealed Kong, the hand can be
// considered to be Concealed (if nothing else is melded)" — contrasted
// with "(1) Melded Kong: ... the hand is no longer concealed (even if
// there are no other melds in your hand)." Fan 12 Four Concealed Pungs's
// own table text corroborates: "...(achieved without melding – Fully
// Concealed may be combined if Self-Drawn)". Fixed to check that no meld
// is EXPOSED, not that there are no melds at all — a self-drawn win with
// only concealed kong(s) still qualifies.
function detectFullyConcealedHand(ctx: HandContext): FanMatch[] {
  const noExposedMelds = ctx.melds.every((m) => m.exposure === 'concealed')
  return noExposedMelds && ctx.winMethod === 'selfDraw' ? [{ fanId: 56, count: 1 }] : []
}

// 57. Two Melded Kongs — 4 pts. §3.8.1 p.16 / App.1 p.38: "A hand that
// includes two Melded (exposed) Kongs." "Melded" = exposed, i.e. claimed
// from a discard or promoted from an exposed pung — contrast with Two
// Concealed Kongs (fan 48).
function detectTwoMeldedKongs(ctx: HandContext): FanMatch[] {
  const count = ctx.melds.filter((m) => m.kind === 'kong' && m.exposure === 'exposed').length
  return count === 2 ? [{ fanId: 57, count: 1 }] : []
}

// 58. Last Tile — 4 pts. §3.8.1 p.16 / App.1 p.38: "Winning on a tile that
// is the last of its kind, with the other three copies already visible to
// all players (via discards or exposed melds)." Not derivable from
// HandContext's existing fields — needs the caller to tell us this
// directly, similar to the win-circumstance fields. See
// docs/rules/decisions.md for the follow-up note on wiring a real value in
// from live game state (discard piles + exposed melds across all seats).
function detectLastTile(ctx: HandContext): FanMatch[] {
  return ctx.isLastCopyOfItsKind ? [{ fanId: 58, count: 1 }] : []
}

export const FANS_4_DETECTORS: Readonly<Record<number, (ctx: HandContext) => FanMatch[]>> = {
  55: detectOutsideHand,
  56: detectFullyConcealedHand,
  57: detectTwoMeldedKongs,
  58: detectLastTile,
}
