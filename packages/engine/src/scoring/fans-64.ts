import type { FanMatch, HandContext } from './types.js'
import { allSets, isDragonTypeId, isHonorTypeId, isTerminalTypeId, isWindTypeId } from './set-helpers.js'

// 8. All Terminals — 64 pts. §3.8.1 p.14 / App.1 p.26: "The pair(s), Pungs
// or Kongs are all made up of 1 or 9 Number Tiles, without Honor Tiles."
// Implies no chows (structurally impossible to build one entirely from
// rank-1/9 tiles anyway, but checked explicitly rather than relying on
// that — a chow's typeId is only its lowest tile, so silently trusting it
// here would risk misreading e.g. a 7-8-9 chow's 'C7' tile as terminal-ish).
function detectAllTerminals(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  if (sets.some((s) => s.kind === 'chow')) return []
  if (!sets.every((s) => isTerminalTypeId(s.typeId))) return []
  if (!isTerminalTypeId(ctx.decomposition.pair)) return []
  return [{ fanId: 8, count: 1 }]
}

// 9. Little Four Winds — 64 pts. §3.8.1 p.14 / App.1 p.26: "three Pungs or
// Kongs of Wind Tiles and a pair of the fourth Wind." Only 4 copies of
// each wind exist, so if the pair is a wind type at all, it's necessarily
// the one NOT among the 3 pungs (2 pungs of the same wind would need 6
// copies) — no separate "different from the pungs" check needed.
function detectLittleFourWinds(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const windPungs = sets.filter((s) => s.kind !== 'chow' && isWindTypeId(s.typeId))
  if (windPungs.length !== 3) return []
  if (!isWindTypeId(ctx.decomposition.pair)) return []
  return [{ fanId: 9, count: 1 }]
}

// 10. Little Three Dragons — 64 pts. §3.8.1 p.14 / App.1 p.27: "two Pungs
// or Kongs of the Dragon Tiles and a pair of the third Dragon." Same
// structural argument as Little Four Winds.
function detectLittleThreeDragons(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const dragonPungs = sets.filter((s) => s.kind !== 'chow' && isDragonTypeId(s.typeId))
  if (dragonPungs.length !== 2) return []
  if (!isDragonTypeId(ctx.decomposition.pair)) return []
  return [{ fanId: 10, count: 1 }]
}

// 11. All Honors — 64 pts. §3.8.1 p.14 / App.1 p.27: "The pair(s), Pungs or
// Kongs are all made up of Honor Tiles." A chow of honor tiles is
// structurally impossible (win-detection.ts's chowNeighbors returns null
// for honor type ids), but the explicit check is kept for the same
// robustness reason as All Terminals above.
function detectAllHonors(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  if (sets.some((s) => s.kind === 'chow')) return []
  if (!sets.every((s) => isHonorTypeId(s.typeId))) return []
  if (!isHonorTypeId(ctx.decomposition.pair)) return []
  return [{ fanId: 11, count: 1 }]
}

// 12. Four Concealed Pungs — 64 pts. §3.8.1 p.14 / App.1 p.27: "A hand that
// includes four Concealed Pungs or Kongs (achieved without melding)." Any
// tile type is fine — the requirement is purely about all 4 sets being
// concealed pung/kong, not chow. See set-helpers.ts's CombinedSet.concealed
// doc comment for what "concealed" means here (and the judgment call about
// a set completed by the winning tile itself still counting as concealed).
function detectFourConcealedPungs(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  if (sets.length !== 4) return []
  if (!sets.every((s) => s.concealed && s.kind !== 'chow')) return []
  return [{ fanId: 12, count: 1 }]
}

// 13. Pure Terminal Chows — 64 pts. §3.8.1 p.14 / App.1 p.27: "two each of
// the lower and upper terminal Chows in one suit only, and a pair of fives
// in the same suit." I.e. exactly 2x (1-2-3) + 2x (7-8-9) in one suit, plus
// a pair of 5s in that same suit — all 4 sets are chows, none are
// pung/kong.
function detectPureTerminalChows(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  if (sets.length !== 4) return []
  if (!sets.every((s) => s.kind === 'chow')) return []

  const suitChars = new Set(sets.map((s) => s.typeId[0]))
  if (suitChars.size !== 1) return []
  const suitChar = suitChars.values().next().value!

  const lowChows = sets.filter((s) => s.typeId === `${suitChar}1`).length
  const highChows = sets.filter((s) => s.typeId === `${suitChar}7`).length
  if (lowChows !== 2 || highChows !== 2) return []
  if (ctx.decomposition.pair !== `${suitChar}5`) return []
  return [{ fanId: 13, count: 1 }]
}

export const FANS_64_DETECTORS: Readonly<Record<number, (ctx: HandContext) => FanMatch[]>> = {
  8: detectAllTerminals,
  9: detectLittleFourWinds,
  10: detectLittleThreeDragons,
  11: detectAllHonors,
  12: detectFourConcealedPungs,
  13: detectPureTerminalChows,
}
