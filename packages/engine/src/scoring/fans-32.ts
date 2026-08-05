import type { FanMatch, HandContext } from './types.js'
import { allSets, isHonorTypeId, isTerminalTypeId, parseSuited } from './set-helpers.js'

// 16. Four Shifted Chows ("Four Pure Shifted Chows" in §3.8.1) — 32 pts.
// §3.8.1 p.14 / App.1 p.28: "Four chows in one suit each shifted up 1 or 2
// numbers from the last, but not a combination of both." One suit, strictly
// increasing starting ranks, a SINGLE consistent shift of exactly 1 or
// exactly 2 throughout — a shift of 0 (identical chows) is Quadruple Chow
// (fan 14), not this fan, and is correctly excluded by requiring shift is 1 or 2.
function detectFourShiftedChows(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  if (sets.length !== 4) return []
  if (!sets.every((s) => s.kind === 'chow')) return []

  const parsed = sets.map((s) => parseSuited(s.typeId))
  if (parsed.some((p) => p === null)) return []
  const suits = new Set(parsed.map((p) => p!.suit))
  if (suits.size !== 1) return []

  const ranks = parsed.map((p) => p!.rank).sort((a, b) => a - b)
  const diffs = new Set<number>()
  for (let i = 1; i < ranks.length; i++) diffs.add(ranks[i]! - ranks[i - 1]!)
  if (diffs.size !== 1) return [] // must be a single consistent shift, not a mix of 1s and 2s
  const shift = diffs.values().next().value!
  if (shift !== 1 && shift !== 2) return []
  return [{ fanId: 16, count: 1 }]
}

// 17. Three Kongs — 32 pts. §3.8.1 p.14 / App.1 p.28: "A hand containing
// three Kongs." Exactly 3, not 4 — a 4-kong hand is Four Kongs (fan 5)
// instead, mirroring how Big/Little Four Winds and Big/Little Three
// Dragons use exact counts to stay mutually exclusive by construction.
function detectThreeKongs(ctx: HandContext): FanMatch[] {
  const kongCount = ctx.melds.filter((m) => m.kind === 'kong').length
  return kongCount === 3 ? [{ fanId: 17, count: 1 }] : []
}

// 18. All Terminals and Honors — 32 pts. §3.8.1 p.14 / App.1 p.29: "The
// pair(s), Pungs or Kongs is all made up of 1 or 9 Number Tiles and Honor
// Tiles." Unlike All Terminals (fan 8) or All Honors (fan 11) alone, both
// tile categories are allowed to mix freely here.
function detectAllTerminalsAndHonors(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  // See fans-2.ts's detectAllChows comment: a knittedStraight candidate's
  // `sets` can be empty or partial, which would otherwise make the "no
  // chows"/"every set is terminal-or-honor" checks below pass vacuously or
  // incompletely (docs/rules/decisions.md #20) — this is the exact false
  // positive first observed via the validation harness on a real Knitted
  // Straight case (targeted-35).
  if (sets.length !== 4) return []
  if (sets.some((s) => s.kind === 'chow')) return []
  if (!sets.every((s) => isTerminalTypeId(s.typeId) || isHonorTypeId(s.typeId))) return []
  const pair = ctx.decomposition.pair
  if (!(isTerminalTypeId(pair) || isHonorTypeId(pair))) return []
  return [{ fanId: 18, count: 1 }]
}

export const FANS_32_DETECTORS: Readonly<Record<number, (ctx: HandContext) => FanMatch[]>> = {
  16: detectFourShiftedChows,
  17: detectThreeKongs,
  18: detectAllTerminalsAndHonors,
}
