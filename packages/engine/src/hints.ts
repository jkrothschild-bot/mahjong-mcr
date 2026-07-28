import { rankDiscards } from './bots/policy.js'
import type { Hand } from './hand.js'
import type { Meld } from './meld.js'
import { MINIMUM_POINTS_TO_WIN } from './scoring/derive-context.js'
import { isDragonTypeId, isWindTypeId } from './scoring/set-helpers.js'
import type { FanMatch } from './scoring/types.js'
import { calculateShanten, type ShantenResult } from './shanten.js'
import { evaluateDiscards, type DiscardEvaluation } from './tile-efficiency.js'
import { typeIdOf, typeIdOfInstance, type TileInstanceId } from './tiles.js'
import { computeWaits, type WaitOption, type WinCircumstanceContext } from './waits.js'

// SPEC.md §6's "Best move" hint tab ≈ Nudge + Options: the recommended
// discard with a one-line reason is the shallow read; `alternatives` (the
// rest of the same ranked list) is the deeper "other reasonable choices"
// detail, both available the instant the tab opens. Reuses bots/policy.ts's
// own rankDiscards so the hint can never disagree with what a bot would
// actually do with the same hand (SPEC.md §6: "Hint engine and bot AI share
// the same evaluation core").
export interface BestMoveHint {
  recommendedDiscard: TileInstanceId
  reason: string
  alternatives: DiscardEvaluation[]
}

function buildReason(top: DiscardEvaluation): string {
  const { resultingShanten, ukeire } = top
  const tileWord = (n: number) => `${n} tile${n === 1 ? '' : 's'}`
  if (resultingShanten < 0) return 'Your hand is already complete — this discard is just a formality.'
  if (resultingShanten === 0) return `Keeps you tenpai (ready to win), waiting on ${tileWord(ukeire.totalCount)}.`
  return `Keeps you at ${resultingShanten}-shanten with the most outs — ${tileWord(ukeire.totalCount)} would improve your hand.`
}

// Null only when there's genuinely no discard decision to make (an empty
// hand — shouldn't occur mid-game, but keeps this total rather than
// throwing on a malformed caller).
export function computeBestMoveHint(hand: Hand): BestMoveHint | null {
  const evaluations = evaluateDiscards(hand)
  if (evaluations.length === 0) return null

  const [top, ...alternatives] = rankDiscards(evaluations)
  return { recommendedDiscard: top!.tile, reason: buildReason(top!), alternatives }
}

// SPEC.md §6's "Hand plan" tab: current shape, primary route, and whether
// the hand can reach the 8-point minimum — "a critical MCR-specific trap
// for learners" per the spec, since a structurally complete hand that
// scores under 8 points can't legally declare Hu at all (moves.ts's
// win-legality gate, M5 phase 1).
export interface FanProgress {
  fanId: number
  count: number
}

export interface HandPlanResult {
  shanten: ShantenResult
  // Fans guaranteed no matter how the hand ends up completing. At tenpai,
  // this is the EXACT intersection of every wait's fanMatches (both win
  // methods) — not a heuristic, since it's built directly from computeWaits,
  // itself tied to the trusted M2 scoreHand. Pre-tenpai, it's restricted to
  // a small set of fans already decidable from committed melds alone (see
  // lockedInFansFromMelds below) — deliberately not exhaustive, and not
  // cross-checked against the real exclusion table, so it's a simplified
  // progress indicator, not a scoring prediction.
  lockedInFans: FanProgress[]
  // [] unless shanten <= 0 — mirrors computeWaits' own "only meaningful at
  // tenpai" behavior exactly (this IS computeWaits' output, not recomputed).
  waits: WaitOption[]
  // null pre-tenpai (unknowable without waits). At tenpai: true iff ANY
  // wait (either win method) reaches the minimum.
  bestCaseReachesMinimum: boolean | null
  // At tenpai: true iff EVERY wait (both win methods) reaches the minimum.
  // false here is the trap SPEC.md §6 flags — bestCase can be true while
  // worstCase is false, meaning some of the player's waits wouldn't even
  // let them declare Hu.
  worstCaseReachesMinimum: boolean | null
}

function meldTypeId(meld: Meld): string {
  return typeIdOfInstance(meld.tiles[0]!)
}

// Restricted to fans a single committed meld can decide on its own, so this
// never needs the concealed-tile decomposition the real per-fan detectors
// require (and never claims to replace them — see HandPlanResult's own doc
// comment above). Each fan's rule text lives in scoring/encyclopedia.ts;
// citations here just point at the specific condition being checked.
function lockedInFansFromMelds(melds: readonly Meld[], context: WinCircumstanceContext): FanProgress[] {
  const result: FanProgress[] = []

  const kongCount = melds.filter((m) => m.kind === 'kong').length
  const concealedKongCount = melds.filter((m) => m.kind === 'kong' && m.exposure === 'concealed').length
  const meldedKongCount = kongCount - concealedKongCount

  if (kongCount === 4) result.push({ fanId: 5, count: 1 }) // Four Kongs
  else if (kongCount === 3) result.push({ fanId: 17, count: 1 }) // Three Kongs

  if (concealedKongCount === 2) result.push({ fanId: 48, count: 1 }) // Two Concealed Kongs
  else if (concealedKongCount >= 1) result.push({ fanId: 67, count: concealedKongCount }) // Concealed Kong, per kong

  if (meldedKongCount === 2) result.push({ fanId: 57, count: 1 }) // Two Melded Kongs
  else if (meldedKongCount >= 1) result.push({ fanId: 74, count: meldedKongCount }) // Melded Kong, per kong

  const dragonPungCount = melds.filter((m) => m.kind !== 'chow' && isDragonTypeId(meldTypeId(m))).length
  if (dragonPungCount >= 1) result.push({ fanId: 59, count: dragonPungCount }) // Dragon Pung, per pung

  const windPungs = melds.filter((m) => m.kind !== 'chow' && isWindTypeId(meldTypeId(m)))
  if (context.prevailingWind && windPungs.some((m) => meldTypeId(m) === typeIdOf({ kind: 'wind', wind: context.prevailingWind! }))) {
    result.push({ fanId: 60, count: 1 }) // Prevalent Wind
  }
  if (context.seatWind && windPungs.some((m) => meldTypeId(m) === typeIdOf({ kind: 'wind', wind: context.seatWind! }))) {
    result.push({ fanId: 61, count: 1 }) // Seat Wind
  }

  return result
}

// A fan counts as "locked in" only if it appears in EVERY listed fanMatches
// array (both win methods, every wait option) — the strictest, most honest
// reading of "guaranteed no matter how this hand actually completes."
function intersectFanMatches(fanMatchLists: readonly FanMatch[][]): FanProgress[] {
  if (fanMatchLists.length === 0) return []
  const [first, ...rest] = fanMatchLists
  const result: FanProgress[] = []
  for (const match of first!) {
    let minCount = match.count
    let presentInAll = true
    for (const list of rest) {
      const found = list.find((m) => m.fanId === match.fanId)
      if (!found) {
        presentInAll = false
        break
      }
      minCount = Math.min(minCount, found.count)
    }
    if (presentInAll) result.push({ fanId: match.fanId, count: minCount })
  }
  return result
}

export function computeHandPlan(hand: Hand, context: WinCircumstanceContext = {}): HandPlanResult {
  const shanten = calculateShanten(hand.concealedTiles, hand.melds)
  const waits = computeWaits(hand.concealedTiles, hand.melds, context)

  if (waits.length === 0) {
    return {
      shanten,
      lockedInFans: lockedInFansFromMelds(hand.melds, context),
      waits: [],
      bestCaseReachesMinimum: null,
      worstCaseReachesMinimum: null,
    }
  }

  const allFanMatchLists = waits.flatMap((w) => [w.discardScore.fanMatches, w.selfDrawScore.fanMatches])
  const allBasicPoints = waits.flatMap((w) => [w.discardScore.basicPoints, w.selfDrawScore.basicPoints])

  return {
    shanten,
    lockedInFans: intersectFanMatches(allFanMatchLists),
    waits,
    bestCaseReachesMinimum: allBasicPoints.some((p) => p >= MINIMUM_POINTS_TO_WIN),
    worstCaseReachesMinimum: allBasicPoints.every((p) => p >= MINIMUM_POINTS_TO_WIN),
  }
}
