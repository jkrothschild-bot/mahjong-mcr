import { decomposeHand, isSevenPairs, isThirteenOrphans } from '../win-detection.js'
import type { Meld } from '../meld.js'
import type { TileInstanceId, Wind } from '../tiles.js'
import { areExclusive } from './exclusions.js'
import { FANS_1_DETECTORS } from './fans-1.js'
import { FANS_2_DETECTORS } from './fans-2.js'
import { FANS_4_DETECTORS } from './fans-4.js'
import { FANS_6_DETECTORS } from './fans-6.js'
import { FANS_8_DETECTORS } from './fans-8.js'
import { FANS_12_DETECTORS } from './fans-12.js'
import { FANS_16_DETECTORS } from './fans-16.js'
import { FANS_24_DETECTORS } from './fans-24.js'
import { FANS_32_DETECTORS } from './fans-32.js'
import { FANS_48_DETECTORS } from './fans-48.js'
import { FANS_64_DETECTORS } from './fans-64.js'
import { FANS_88_DETECTORS } from './fans-88.js'
import { FAN_REGISTRY } from './registry.js'
import type { DetailedScoreResult, FanMatch, HandContext, ScoreResult } from './types.js'

const CHICKEN_HAND_FAN_ID = 43

// All registered detectors across every implemented batch. Adding a new
// batch file (e.g. fans-4.ts) is purely additive: spread its detector map
// in here too. Fan 43 (Chicken Hand) is deliberately absent from every
// batch map — it's a whole-scorer fallback, handled below in
// scoreOneCandidate, not a per-fan detector (see fans-8.ts's comment).
const ALL_DETECTORS: Readonly<Record<number, (ctx: HandContext) => FanMatch[]>> = {
  ...FANS_88_DETECTORS,
  ...FANS_64_DETECTORS,
  ...FANS_48_DETECTORS,
  ...FANS_32_DETECTORS,
  ...FANS_24_DETECTORS,
  ...FANS_16_DETECTORS,
  ...FANS_12_DETECTORS,
  ...FANS_8_DETECTORS,
  ...FANS_6_DETECTORS,
  ...FANS_4_DETECTORS,
  ...FANS_2_DETECTORS,
  ...FANS_1_DETECTORS,
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
  if (fanMatches.length === 0) {
    // Chicken Hand (fan 43), §3.8.1 p.16: "A hand that would otherwise earn
    // 0 points" falls back to this — guarantees every structurally valid
    // win is worth at least 8 points, satisfying §3.9.1.1's minimum by
    // construction. Only kicks in when NO other fan matches this
    // candidate; scoreHand's max-across-candidates selection already
    // prefers any real-fan total over this whenever one exists.
    return { fanMatches: [{ fanId: CHICKEN_HAND_FAN_ID, count: 1 }], basicPoints: FAN_REGISTRY[CHICKEN_HAND_FAN_ID]!.points }
  }
  const basicPoints = fanMatches.reduce((sum, m) => sum + pointsOf(m), 0)
  return { fanMatches, basicPoints }
}

export interface ScoreHandParams {
  concealedTiles: TileInstanceId[] // final concealed tiles, winning tile included
  melds: Meld[]
  // Win-circumstance context for the 8-point tier's "special situation"
  // fans — see HandContext's own doc comment in types.ts for why these are
  // optional and not yet wired from real game state.
  winMethod?: 'selfDraw' | 'discard' | 'robKong'
  isLastTileOfWall?: boolean
  isLastDiscardOfGame?: boolean
  wonOnKongReplacement?: boolean
  // Context for the 4/2/1-point tiers — see HandContext's own doc comment
  // in types.ts for why these are optional and not yet wired from real
  // game state.
  isLastCopyOfItsKind?: boolean
  prevailingWind?: Wind
  seatWind?: Wind
  winningTile?: TileInstanceId
}

// Tries every valid decomposition (decomposeHand can return several for an
// ambiguous hand) plus each structurally-valid special shape as its own
// independent candidate, scores each, and returns the highest-scoring one
// — "Freedom to Choose the Highest Points" applied at the whole-hand level,
// on top of the same principle applying within one candidate's own fan
// conflicts (resolveFanConflicts above).
//
// Additionally reports WHICH candidate won, as winningShape. That parse was
// always computed here and simply discarded; the selection logic below is
// unchanged, so no hand's score can move as a result of exposing it. See
// scoreHand below for why this is a second entry point rather than a wider
// return type on the existing one.
export function scoreHandDetailed(params: ScoreHandParams): DetailedScoreResult {
  const {
    concealedTiles,
    melds,
    winMethod,
    isLastTileOfWall,
    isLastDiscardOfGame,
    wonOnKongReplacement,
    isLastCopyOfItsKind,
    prevailingWind,
    seatWind,
    winningTile,
  } = params
  const winCircumstance = {
    winMethod,
    isLastTileOfWall,
    isLastDiscardOfGame,
    wonOnKongReplacement,
    isLastCopyOfItsKind,
    prevailingWind,
    seatWind,
    winningTile,
  }
  const candidates: HandContext[] = []

  for (const decomposition of decomposeHand(concealedTiles, melds)) {
    candidates.push({ concealedTiles, melds, decomposition, specialShape: null, ...winCircumstance })
  }
  if (isSevenPairs(concealedTiles, melds)) {
    candidates.push({ concealedTiles, melds, decomposition: null, specialShape: 'sevenPairs', ...winCircumstance })
  }
  if (isThirteenOrphans(concealedTiles, melds)) {
    candidates.push({ concealedTiles, melds, decomposition: null, specialShape: 'thirteenOrphans', ...winCircumstance })
  }

  if (candidates.length === 0) return { fanMatches: [], basicPoints: 0, winningShape: null }

  // Strictly `>`, so the FIRST candidate wins a tie — preserved exactly as
  // it was before winningShape existed. Tie-breaking is now observable
  // (which parse gets reported, not just the total), so this is no longer
  // an arbitrary implementation detail: changing it would change what the
  // board draws even though every score stays identical.
  let bestCandidate = candidates[0]!
  let best = scoreOneCandidate(bestCandidate)
  for (const candidate of candidates.slice(1)) {
    const result = scoreOneCandidate(candidate)
    if (result.basicPoints > best.basicPoints) {
      best = result
      bestCandidate = candidate
    }
  }
  return {
    ...best,
    winningShape: { decomposition: bestCandidate.decomposition, specialShape: bestCandidate.specialShape },
  }
}

// The scoring entry point everything except the reveal display uses.
//
// Deliberately reconstructs a bare { fanMatches, basicPoints } object rather
// than returning scoreHandDetailed's result directly: ScoreResult is asserted
// with toEqual across the whole fixture suite and the PyMahjongGB cross-check,
// and an extra `winningShape` key would fail all of it. Narrowing here — one
// place, one line — keeps the detailed variant purely additive and guarantees
// no caller can accidentally start depending on display metadata.
export function scoreHand(params: ScoreHandParams): ScoreResult {
  const { fanMatches, basicPoints } = scoreHandDetailed(params)
  return { fanMatches, basicPoints }
}
