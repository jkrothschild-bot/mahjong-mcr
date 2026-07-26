import { decomposeHand, isSevenPairs, isThirteenOrphans } from '../win-detection.js'
import type { Meld } from '../meld.js'
import type { TileInstanceId } from '../tiles.js'
import { areExclusive } from './exclusions.js'
import { FANS_32_DETECTORS } from './fans-32.js'
import { FANS_48_DETECTORS } from './fans-48.js'
import { FANS_64_DETECTORS } from './fans-64.js'
import { FANS_88_DETECTORS } from './fans-88.js'
import { FAN_REGISTRY } from './registry.js'
import type { FanMatch, HandContext, ScoreResult } from './types.js'

// All registered detectors across every implemented batch. Adding a new
// batch file (e.g. fans-24.ts) is purely additive: spread its detector map
// in here too.
const ALL_DETECTORS: Readonly<Record<number, (ctx: HandContext) => FanMatch[]>> = {
  ...FANS_88_DETECTORS,
  ...FANS_64_DETECTORS,
  ...FANS_48_DETECTORS,
  ...FANS_32_DETECTORS,
}

function pointsOf(match: FanMatch): number {
  return FAN_REGISTRY[match.fanId]!.points * match.count
}

// §3.9.1.5's "Freedom to Choose the Highest Points" principle: when two
// mutually-exclusive fans (per exclusions.ts, itself transcribed from the
// rulebook's own "does not combine with" notes) both match, keep only the
// higher-scoring one. Exported separately from scoreOneCandidate so it's
// directly testable against real exclusion pairs without needing a
// detector to exist for both sides yet (most exclusion partners for this
// session's 7 fans are fans from later, unimplemented batches).
export function resolveFanConflicts(matches: readonly FanMatch[]): FanMatch[] {
  let current = matches.slice()
  let changed = true
  while (changed) {
    changed = false
    outer: for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const a = current[i]!
        const b = current[j]!
        if (!areExclusive(a.fanId, b.fanId)) continue
        const drop = pointsOf(a) >= pointsOf(b) ? j : i
        current = current.filter((_, index) => index !== drop)
        changed = true
        break outer
      }
    }
  }
  return current
}

function scoreOneCandidate(ctx: HandContext): ScoreResult {
  const rawMatches = Object.values(ALL_DETECTORS).flatMap((detect) => detect(ctx))
  const fanMatches = resolveFanConflicts(rawMatches)
  const basicPoints = fanMatches.reduce((sum, m) => sum + pointsOf(m), 0)
  return { fanMatches, basicPoints }
}

export interface ScoreHandParams {
  concealedTiles: TileInstanceId[] // final concealed tiles, winning tile included
  melds: Meld[]
}

// Tries every valid decomposition (decomposeHand can return several for an
// ambiguous hand) plus each structurally-valid special shape as its own
// independent candidate, scores each, and returns the highest-scoring one
// — "Freedom to Choose the Highest Points" applied at the whole-hand level,
// on top of the same principle applying within one candidate's own fan
// conflicts (resolveFanConflicts above).
export function scoreHand(params: ScoreHandParams): ScoreResult {
  const { concealedTiles, melds } = params
  const candidates: HandContext[] = []

  for (const decomposition of decomposeHand(concealedTiles, melds)) {
    candidates.push({ concealedTiles, melds, decomposition, specialShape: null })
  }
  if (isSevenPairs(concealedTiles, melds)) {
    candidates.push({ concealedTiles, melds, decomposition: null, specialShape: 'sevenPairs' })
  }
  if (isThirteenOrphans(concealedTiles, melds)) {
    candidates.push({ concealedTiles, melds, decomposition: null, specialShape: 'thirteenOrphans' })
  }

  if (candidates.length === 0) return { fanMatches: [], basicPoints: 0 }

  let best = scoreOneCandidate(candidates[0]!)
  for (const candidate of candidates.slice(1)) {
    const result = scoreOneCandidate(candidate)
    if (result.basicPoints > best.basicPoints) best = result
  }
  return best
}
