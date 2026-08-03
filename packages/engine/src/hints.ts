import { computeRouteRegret, rankDiscards, VIABLE_ROUTE_SHANTEN_MARGIN } from './bots/policy.js'
import { groupConcealedByType, ORDERED_STANDARD_TYPE_IDS } from './win-detection.js'
import type { Hand } from './hand.js'
import type { Meld } from './meld.js'
import { MINIMUM_POINTS_TO_WIN } from './scoring/derive-context.js'
import { isDragonTypeId, isWindTypeId, parseSuited } from './scoring/set-helpers.js'
import type { FanMatch } from './scoring/types.js'
import { calculateShanten, type ShantenResult } from './shanten.js'
import { ALL_SHANTEN_SHAPES, evaluateDiscards, type DiscardEvaluation, type RouteAssessment } from './tile-efficiency.js'
import { typeIdOf, typeIdOfInstance, type TileInstanceId, type TileTypeId } from './tiles.js'
import { computeWaits, type WaitOption, type WinCircumstanceContext } from './waits.js'

// KICKOFF-phase10-strategy-coach.md §1c's numbered "why" list — each entry
// maps to one bullet of that section (isolation, shape-lean, route
// flexibility). Never invented: every title/detail here is derived directly
// from evaluateDiscards/rankDiscards' own numbers, nothing guessed.
export interface HintFeature {
  title: string
  detail: string
}

// One route table row, for the RECOMMENDED discard specifically — `viable`
// mirrors bots/policy.ts's own VIABLE_ROUTE_SHANTEN_MARGIN test (within that
// margin of the best any candidate discard could achieve for this shape),
// so the UI doesn't have to re-derive the same threshold independently.
export interface RouteRow extends RouteAssessment {
  viable: boolean
}

export interface RankedAlternative {
  tile: TileInstanceId
  // This candidate's score relative to the recommended discard's own score,
  // clamped to [0,1] — the mockup's "other reasonable choices, with
  // percentages." Derived from the exact same regret numbers rankDiscards
  // used to order candidates (see candidateScore below), never a separate
  // re-derived approximation.
  relativeScore: number
}

// SPEC.md §6's "Best move" tab ≈ Nudge + Options: `headline` (+ the tile
// itself) is the shallow read; `features`/`routeTable` are the deeper
// "why this is the strongest move" detail, both available the instant the
// tab opens. Reuses bots/policy.ts's own rankDiscards so the hint can never
// disagree with what a bot would actually do with the same hand (SPEC.md
// §6: "Hint engine and bot AI share the same evaluation core").
//
// KICKOFF-phase10-strategy-coach.md Stage 1c replaced the old single
// `reason` string with this structured shape — deriveOneLinerReason below
// is the one-line fallback for any consumer that still just wants text.
export interface BestMoveHint {
  recommendedDiscard: TileInstanceId
  headline: string
  features: HintFeature[]
  routeTable: RouteRow[]
  confidence: number // 0-1: normalized margin between the top two candidates' scores
  alternatives: RankedAlternative[]
}

const SHAPE_LABEL: Record<ShantenResult['shape'], string> = {
  standard: 'Standard',
  sevenPairs: 'Seven Pairs',
  thirteenOrphans: 'Thirteen Orphans',
}

// The rulebook-points aside for a special shape's own route feature — the
// live case that forced this whole file's original shapeNote to exist: a
// pair-heavy opening hand where the arithmetic correctly says to break a
// concealed 2C TRIPLET, because the hand is closer to Seven Pairs than
// Standard, and (per docs/rules/decisions.md #5) a triplet counts as just
// one pair there, making the third copy dead weight. All true, none of it
// visible without naming the route explicitly.
const SPECIAL_SHAPE_ASIDE: Record<'sevenPairs' | 'thirteenOrphans', string> = {
  sevenPairs: "only pairs count there (24 pts), so a triplet's third copy is dead weight",
  thirteenOrphans: 'one of each terminal and honor (88 pts), so middle tiles are dead weight',
}

function routeShanten(evaluation: DiscardEvaluation, shape: ShantenResult['shape']): number {
  return evaluation.routes.find((r) => r.shape === shape)!.shanten
}

// KICKOFF-phase10 §1c: "It has no support" — no in-suit neighbour within two
// ranks still in the concealed hand, and no second copy of itself. Raw
// counts only (unseen-count-aware combining with the rest of the board is a
// UI-layer concern, same posture as tile-efficiency.ts's own usefulTiles) —
// terminals fall out of the suited case for free (a rank-1/9 tile just has
// fewer in-range neighbours to check); honors have no "neighbour" concept at
// all, so isolation there is purely "no second copy."
function isolationFeature(counts: Readonly<Record<TileTypeId, number>>, typeId: TileTypeId): HintFeature | null {
  if ((counts[typeId] ?? 0) >= 2) return null // already paired/tripled — not isolated

  const suited = parseSuited(typeId)
  if (!suited) {
    return { title: 'It has no support', detail: "It's the only copy in your hand, with no pair or triplet forming from it." }
  }
  for (let delta = -2; delta <= 2; delta++) {
    if (delta === 0) continue
    const rank = suited.rank + delta
    if (rank < 1 || rank > 9) continue
    if ((counts[`${suited.suit}${rank}`] ?? 0) > 0) return null
  }
  return { title: 'It has no support', detail: 'No neighbouring tiles within two ranks in the same suit, and no second copy in hand.' }
}

// KICKOFF-phase10 §1c: "Your hand already leans towards pungs/pairs" (or
// chows) — pair/triplet-forming types (count >= 2) vs. chow-partial types
// (an in-suit tile within two ranks) among the hand's own raw counts. Not
// win-detection.ts's decomposeHand: that only ever runs on a COMPLETE
// winning hand and has nothing to say about a mid-shanten hand's shape —
// this is deliberately the same lightweight counting posture as
// usefulTiles/isolationFeature above, not a real block search.
function shapeLeanFeature(counts: Readonly<Record<TileTypeId, number>>): HintFeature | null {
  let pairish = 0
  let chowish = 0
  for (const type of ORDERED_STANDARD_TYPE_IDS) {
    const count = counts[type] ?? 0
    if (count === 0) continue
    if (count >= 2) pairish++
    const suited = parseSuited(type)
    if (!suited) continue
    for (let delta = 1; delta <= 2; delta++) {
      const rank = suited.rank + delta
      if (rank <= 9 && (counts[`${suited.suit}${rank}`] ?? 0) > 0) {
        chowish++
        break
      }
    }
  }
  if (pairish === 0 && chowish === 0) return null
  if (pairish > chowish) {
    return {
      title: 'Your hand already leans towards pungs/pairs',
      detail: `${pairish} type${pairish === 1 ? '' : 's'} already paired or better, vs. ${chowish} with a chow connection.`,
    }
  }
  if (chowish > pairish) {
    return {
      title: 'Your hand already leans towards chows',
      detail: `${chowish} type${chowish === 1 ? '' : 's'} with a chow connection, vs. ${pairish} paired or better.`,
    }
  }
  return null
}

// KICKOFF-phase10 §1c: "It preserves flexibility" — names the non-Standard
// routes the recommended discard's own route table keeps viable, and, when
// true, that a different discard among today's other best-shanten options
// would have dropped one of them (rankDiscards' whole reason for existing —
// see bots/policy.ts's computeRouteRegret).
function flexibilityFeature(top: DiscardEvaluation, atMin: readonly DiscardEvaluation[], routeTable: readonly RouteRow[]): HintFeature | null {
  const viableSpecial = routeTable.filter((r) => r.shape !== 'standard' && r.viable)
  if (viableSpecial.length === 0) return null

  const names = viableSpecial.map((r) => SHAPE_LABEL[r.shape]).join(' and ')
  const asides = viableSpecial.map((r) => SPECIAL_SHAPE_ASIDE[r.shape as 'sevenPairs' | 'thirteenOrphans']).join('; ')

  const droppedByAlternative = viableSpecial.filter((r) =>
    atMin.some((alt) => alt.tile !== top.tile && routeShanten(alt, r.shape) > r.shanten),
  )
  const altNote =
    droppedByAlternative.length > 0
      ? ` A different discard here would have set ${droppedByAlternative.length > 1 ? 'them' : SHAPE_LABEL[droppedByAlternative[0]!.shape]} back.`
      : ''

  return { title: `Keeps ${names} alive`, detail: `${asides}.${altNote}` }
}

function buildHeadline(top: DiscardEvaluation, isolated: boolean): string {
  if (top.resultingShanten < 0) return 'Hand already complete'
  if (top.resultingShanten === 0) return 'Completes your wait'
  return isolated ? 'Lowest-value singleton' : 'Strongest discard available'
}

// A candidate's outs, penalized by how much worse it makes its own
// worst-case viable route (computeRouteRegret) — the SAME regret
// rankDiscards ranked by, turned into one comparable number so confidence/
// alternative-% can stay honestly derived from the real ranking rather than
// a separately invented score. REGRET_SCORE_PENALTY (an "outs-equivalent"
// per shanten of regret) is a Stage-2-replaceable heuristic constant, same
// posture as bots/policy.ts's own — Stage 2's depth-2 evaluation replaces
// both at once.
const REGRET_SCORE_PENALTY = 6

function candidateScore(evaluation: DiscardEvaluation, regret: number): number {
  if (regret === Infinity) return -Infinity
  return evaluation.ukeire.totalCount - regret * REGRET_SCORE_PENALTY
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

// Null only when there's genuinely no discard decision to make (an empty
// hand — shouldn't occur mid-game, but keeps this total rather than
// throwing on a malformed caller).
export function computeBestMoveHint(hand: Hand): BestMoveHint | null {
  const evaluations = evaluateDiscards(hand)
  if (evaluations.length === 0) return null

  const ranked = rankDiscards(evaluations) // already just the best-resultingShanten group, ordered
  const top = ranked[0]!
  const regretByTile = computeRouteRegret(evaluations)

  const minShanten = top.resultingShanten
  const bestForShape = new Map<ShantenResult['shape'], number>(
    ALL_SHANTEN_SHAPES.map((shape) => [shape, Math.min(...ranked.map((e) => routeShanten(e, shape)))]),
  )
  const routeTable: RouteRow[] = top.routes.map((route) => ({
    ...route,
    viable: bestForShape.get(route.shape)! <= minShanten + VIABLE_ROUTE_SHANTEN_MARGIN,
  }))

  const counts = groupConcealedByType(hand.concealedTiles)
  const topTypeId = typeIdOfInstance(top.tile)
  const features: HintFeature[] = [
    isolationFeature(counts, topTypeId),
    shapeLeanFeature(counts),
    flexibilityFeature(top, ranked, routeTable),
  ].filter((f): f is HintFeature => f !== null)

  const scores = ranked.map((e) => candidateScore(e, regretByTile.get(e.tile) ?? 0))
  const topScore = scores[0]!
  const confidence = ranked.length <= 1 || topScore <= 0 ? 1 : clamp01((topScore - scores[1]!) / topScore)
  const alternatives: RankedAlternative[] = ranked.slice(1).map((e, i) => ({
    tile: e.tile,
    relativeScore: topScore > 0 ? clamp01(scores[i + 1]! / topScore) : 0,
  }))

  return {
    recommendedDiscard: top.tile,
    headline: buildHeadline(top, isolationFeature(counts, topTypeId) !== null),
    features,
    routeTable,
    confidence,
    alternatives,
  }
}

// Keep a derived one-liner for anywhere that still wants plain text (Stage
// 1c's own instruction) — joins the headline with the first feature's
// detail, if any. No current UI consumer needs this (BestMoveTab.tsx renders
// the structured hint directly), but it's a cheap, honest fallback rather
// than leaving text-only callers with nothing.
export function deriveOneLinerReason(hint: BestMoveHint): string {
  const first = hint.features[0]
  return first ? `${hint.headline} — ${first.detail}` : hint.headline
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
