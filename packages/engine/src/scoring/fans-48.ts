import type { FanMatch, HandContext } from './types.js'
import { allSets, parseSuited } from './set-helpers.js'

// 14. Quadruple Chow — 48 pts. §3.8.1 p.14 / App.1 p.28: "Four chows of the
// same continuous number sequence in the same suit." All 4 sets are chows
// with the identical starting tile (e.g. four 1-2-3 of Characters) — this
// is physically exactly the maximum: 4 copies each of 3 consecutive ranks.
function detectQuadrupleChow(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  if (sets.length !== 4) return []
  if (!sets.every((s) => s.kind === 'chow')) return []
  const typeIds = new Set(sets.map((s) => s.typeId))
  if (typeIds.size !== 1) return []
  return [{ fanId: 14, count: 1 }]
}

// 15. Four Pure Shifted Pungs — 48 pts. §3.8.1 p.14 / App.1 p.28: "Four
// Pungs (or Kongs) in the same suit, each shifted one up from the last."
function detectFourPureShiftedPungs(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  if (sets.length !== 4) return []
  if (sets.some((s) => s.kind === 'chow')) return []

  const parsed = sets.map((s) => parseSuited(s.typeId))
  if (parsed.some((p) => p === null)) return [] // honor tiles can't be "shifted"
  const suits = new Set(parsed.map((p) => p!.suit))
  if (suits.size !== 1) return []

  const ranks = parsed.map((p) => p!.rank).sort((a, b) => a - b)
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i - 1]! + 1) return []
  }
  return [{ fanId: 15, count: 1 }]
}

export const FANS_48_DETECTORS: Readonly<Record<number, (ctx: HandContext) => FanMatch[]>> = {
  14: detectQuadrupleChow,
  15: detectFourPureShiftedPungs,
}
