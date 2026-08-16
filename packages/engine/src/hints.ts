import { rankDiscards } from './bots/policy.js'
import { isRouteCompatible, STAGE3_FAN_IDS } from './fan-target-compatibility.js'
import { estimateFanTargets, type FanTargetEstimate } from './fan-targets.js'
import { groupConcealedByType, ORDERED_STANDARD_TYPE_IDS } from './win-detection.js'
import type { Hand } from './hand.js'
import type { Meld } from './meld.js'
import { MINIMUM_POINTS_TO_WIN } from './scoring/derive-context.js'
import { areExclusive } from './scoring/exclusions.js'
import { FAN_REGISTRY } from './scoring/registry.js'
import { isDragonTypeId, isWindTypeId, parseSuited } from './scoring/set-helpers.js'
import type { FanMatch } from './scoring/types.js'
import { calculateShantenFromCounts, type ShantenResult } from './shanten.js'
import { ALL_SHANTEN_SHAPES, evaluateDiscards, routeTableFor, type DiscardEvaluation, type RouteAssessment } from './tile-efficiency.js'
import { typeIdOf, typeIdOfInstance, type TileInstanceId, type TileTypeId } from './tiles.js'
import { computeWaits, type WaitOption, type WinCircumstanceContext } from './waits.js'

// KICKOFF-phase10-strategy-coach.md §1b's two heuristic constants, MOVED
// HERE from bots/policy.ts on 2026-08-06 when the Stage 1 regret-aware
// RANKING was reverted (docs/rules/decisions.md #18: three same-direction
// self-play runs never showed it helping) — but the DISPLAY these two
// constants feed (this file's route-viability marking and
// confidence/alternatives scoring) was explicitly kept, since it doesn't
// depend on which comparator rankDiscards uses. Hand-tuned against the
// fixture hands in this file's own test suite, not derived from theory;
// still explicitly Stage-2-replaceable.
//
// EARLY_GAME_MIN_SHANTEN: below this many shanten from tenpai, regret isn't
// a meaningful display signal either — committing to whichever route is
// already closest is correct that close to tenpai, so confidence/
// alternatives collapse to a plain ukeire comparison there too (see
// computeRouteRegret below).
const EARLY_GAME_MIN_SHANTEN = 3
// VIABLE_ROUTE_SHANTEN_MARGIN: a shape is "in play" this turn if the best
// any candidate discard can achieve for it is within this many shanten of
// the overall best achievable shanten. 1 is the smallest margin that can
// ever matter (0 would mean "only the single best shape counts"). Chosen
// and verified against the live hand this phase's own KICKOFF doc cites (a
// 2-Character triplet + 5-Bamboo pair hand where Standard sits exactly 1
// shanten behind Seven Pairs and must stay "in play").
const VIABLE_ROUTE_SHANTEN_MARGIN = 1

// KICKOFF-phase10-strategy-coach.md §1b: for each candidate at the best
// achievable resultingShanten, how much worse it makes its own worst VIABLE
// route, relative to the best any candidate could do for that same route —
// "worst-case regret across viable routes." A candidate that keeps every
// viable route exactly at its own best-achievable shanten scores 0 regret;
// one that lets a still-viable route slip scores > 0, in shanten units.
// Feeds ONLY this file's display numbers now (confidence, alternatives'
// relativeScore) — bots/policy.ts's rankDiscards no longer uses this at all
// (reverted to plain ukeire-first ranking, see that file's own comment).
//
// Candidates below the best resultingShanten get Infinity — they were never
// really in contention, so "regret" isn't a meaningful number for them;
// callers should never rank by this value without also filtering to
// resultingShanten === the best.
function computeRouteRegret(evaluations: readonly DiscardEvaluation[]): Map<TileInstanceId, number> {
  const minShanten = Math.min(...evaluations.map((e) => e.resultingShanten))
  const regret = new Map<TileInstanceId, number>()

  if (minShanten < EARLY_GAME_MIN_SHANTEN) {
    for (const e of evaluations) regret.set(e.tile, e.resultingShanten === minShanten ? 0 : Infinity)
    return regret
  }

  const atMin = evaluations.filter((e) => e.resultingShanten === minShanten)
  const routeShantenFor = (e: DiscardEvaluation, shape: ShantenResult['shape']): number =>
    e.routes.find((r) => r.shape === shape)!.shanten

  const bestForShape = new Map<ShantenResult['shape'], number>(
    ALL_SHANTEN_SHAPES.map((shape) => [shape, Math.min(...atMin.map((e) => routeShantenFor(e, shape)))]),
  )
  const viableShapes = ALL_SHANTEN_SHAPES.filter((shape) => bestForShape.get(shape)! <= minShanten + VIABLE_ROUTE_SHANTEN_MARGIN)

  for (const e of evaluations) {
    if (e.resultingShanten !== minShanten) {
      regret.set(e.tile, Infinity)
      continue
    }
    regret.set(e.tile, Math.max(...viableShapes.map((shape) => routeShantenFor(e, shape) - bestForShape.get(shape)!)))
  }
  return regret
}

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
  // KICKOFF-phase10 gap close: per-shape shanten/outs for the CURRENT hand
  // (not a post-discard candidate — that's evaluateDiscards' job), so "how
  // far is Seven Pairs really" is never crowned away by `shanten` above's own
  // min-first collapse. `viable` reuses bots/policy.ts's own
  // VIABLE_ROUTE_SHANTEN_MARGIN — the SAME threshold the Best Move tab's
  // route table already uses — rather than a second, independently-tuned
  // number that could drift out of sync with it.
  routes: RouteRow[]
  // Set only when exactly one route is viable, i.e. every other route sits
  // outside VIABLE_ROUTE_SHANTEN_MARGIN of the best. A hand 4-shanten by
  // Seven Pairs and 5-shanten by Standard has a 1-shanten gap — inside the
  // margin, so BOTH stay viable and this is null. Shanten counts steps, not
  // likelihood (a two-sided run partial has roughly triple Seven Pairs'
  // acceptance per pairing a single), so a 1-shanten numeric lead isn't a
  // real commitment yet — naming a primary route there would overstate it.
  primaryRoute: ShantenResult['shape'] | null
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
  const cache = new Map<string, number>()
  const counts = groupConcealedByType(hand.concealedTiles)
  const shanten = calculateShantenFromCounts(counts, hand.melds.length, cache)
  const rawRoutes = routeTableFor(counts, hand.melds.length, cache)
  const bestRouteShanten = Math.min(...rawRoutes.map((r) => r.shanten))
  const routes: RouteRow[] = rawRoutes.map((r) => ({ ...r, viable: r.shanten <= bestRouteShanten + VIABLE_ROUTE_SHANTEN_MARGIN }))
  const viableRoutes = routes.filter((r) => r.viable)
  const primaryRoute = viableRoutes.length === 1 ? viableRoutes[0]!.shape : null

  const waits = computeWaits(hand.concealedTiles, hand.melds, context)

  if (waits.length === 0) {
    return {
      shanten,
      routes,
      primaryRoute,
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
    routes,
    primaryRoute,
    lockedInFans: intersectFanMatches(allFanMatchLists),
    waits,
    bestCaseReachesMinimum: allBasicPoints.some((p) => p >= MINIMUM_POINTS_TO_WIN),
    worstCaseReachesMinimum: allBasicPoints.every((p) => p >= MINIMUM_POINTS_TO_WIN),
  }
}

// Phase 10 Stage 3 orchestration layer (KICKOFF-phase10-strategy-coach.md's
// "Route to eight points" panel) — sits one layer above fan-targets.ts'
// estimateFanTargets exactly the way computeBestMoveHint sits above
// evaluateDiscards: fan-targets.ts stays a flat, per-family list (so each
// family stays independently fixtured and cited, per that file's own
// comment); composing "locked-in fans + best candidates, together" into one
// picture is this file's job instead.
// CHANGE 3 (KICKOFF-phase10-strategy-coach.md, owner review 2026-08-07)
// specified an explicit tri-state so a UI never has to infer this from an
// empty candidates/selected array. The FIRST shipped version of this
// contract (a plain `warning: boolean`, `reachesMinimum: boolean` pair)
// violated its own spirit: `reachesMinimum` was silently only "does the
// 10-family greedy approximation clear the bar," never the tenpai-exact
// answer `computeHandPlan` already derives from real `computeWaits` output
// (which covers every fan, including fan 43 Chicken Hand — outside all 10
// Stage 3 families). That made `warning: true` assert "this hand cannot
// reach 8 points" on hands that provably CAN — e.g. tenpai on a legal
// Chicken Hand win, or on Pure/Mixed Straight (deliberately outside the 10
// families per CHANGE 1).
//
// The SECOND version (still on this branch, before this comment) fixed that
// but got the PRECEDENCE backwards: it checked `bestCaseTotal >=
// MINIMUM_POINTS_TO_WIN` FIRST, so an inflated family estimate (see
// bestCaseTotal's own doc comment on the estimator-generosity defect) could
// short-circuit past a grounded tenpai-exact 'false' and report 'reachable'
// anyway — confirmed via this file's own test fixtures below (tenpai,
// bestCaseReachesMinimum false, bestCaseTotal >= 8 purely from estimator
// noise). Exact must beat estimate, not the reverse: computeHandPlan's own
// bestCaseReachesMinimum is checked FIRST whenever it exists (non-null,
// i.e. tenpai), and the family estimate is consulted only when there is no
// exact answer to defer to. Three genuinely different states, not two:
export type MinimumPointsStatus =
  // A concrete route to >=8 is identified — either computeHandPlan's own
  // real-waits-derived bestCaseReachesMinimum says so directly (even when
  // the winning fan sits outside all 10 Stage 3 families and so never
  // appears in `selected`), or, pre-tenpai where no exact answer exists yet,
  // the 10-family greedy sum (lockedInPoints + selected) clears
  // MINIMUM_POINTS_TO_WIN on its own.
  | 'reachable'
  // Grounded ONLY in computeHandPlan's tenpai-exact bestCaseReachesMinimum
  // being false (built from computeWaits over the real scoreHand, every
  // wait, both win methods) — never inferred from the 10 families' own
  // partial coverage falling short, since that only proves "these 10
  // families don't reach it," not "nothing does."
  //
  // Deliberately NOT named 'unreachable': bestCaseReachesMinimum is derived
  // from the hand's CURRENT waits only. A tenpai hand can always be broken
  // and rebuilt toward a different, larger hand — this state says nothing
  // about that possibility, only that finishing the CURRENT shape, on any
  // of its CURRENT waits, tops out under the minimum. Name it for exactly
  // what it claims; UI copy gets written directly off this name, and
  // "unreachable" would overclaim a permanence this field cannot support.
  | 'currentWaitsFallShort'
  // The honest pre-tenpai default: no tenpai-exact answer exists yet, and
  // the 10-family estimate hasn't found a route either. Partial family
  // coverage this far from tenpai is not grounds to assert impossibility —
  // this hand may well complete via a family Stage 3 never modeled, or one
  // it modeled but hasn't reached shanten-0 progress on yet.
  | 'unknown'

export interface RouteToPointsResult {
  // Every applicable Stage 3 target for this hand, unfiltered —
  // estimateFanTargets(hand, context) verbatim, sorted by value descending.
  candidates: FanTargetEstimate[]
  // The pairwise-COMPATIBLE subset of `candidates` actually counted toward
  // bestCaseTotal: walks `candidates` in value order (greedy), keeping a
  // candidate only if BOTH scoring/exclusions.ts's real mutual-exclusion
  // table AND fan-target-compatibility.ts's route-compatibility table say
  // it can coexist with everything already kept AND with every already
  // locked-in fan. Without this filter, a naive value-sum could recommend
  // e.g. No Honors alongside Dragon Pung — completing one structurally
  // destroys the other, so summing their points would suggest a route no
  // real hand could ever actually score.
  selected: FanTargetEstimate[]
  // Sum of already-locked-in fans' points (computeHandPlan's own
  // lockedInFans — melds-only pre-tenpai, the stricter real-waits
  // intersection at tenpai, per that function's existing logic).
  lockedInPoints: number
  // lockedInPoints + sum(selected fans' points). A CEILING from the 10
  // Stage 3 families ALONE — not a forecast, and not the ground truth about
  // whether ANY route reaches the minimum (see minimumPointsStatus for
  // that): a tenpai hand winning via a fan outside the 10 families can
  // clear MINIMUM_POINTS_TO_WIN for real while this number stays low. Each
  // selected target's own completionProbability (and probabilityBasis tier)
  // still applies on top of this and is not folded in here.
  bestCaseTotal: number
  // SPEC §6 names "whether the hand can reach the 8-point minimum" as the
  // single most valuable thing this panel can say — a UI is REQUIRED to
  // render this, not merely permitted to. See MinimumPointsStatus's own
  // comment for what grounds each of the three states.
  minimumPointsStatus: MinimumPointsStatus
}

// scoring/exclusions.ts's table only ever needs a pair when two fans COULD
// naively co-fire on the same COMPLETE hand (the real detectors' own
// domain) — it has no entry for e.g. [50,76] (Half Flush / No Honors)
// because a complete hand can never satisfy both anyway (detectHalfFlush's
// own `hasHonor` guard makes that structurally impossible), so the real
// detectors just never co-fire and no rule is needed. fan-targets.ts's
// estimators don't have that luxury: on an INCOMPLETE hand, "keep working
// toward Half Flush" and "keep working toward No Honors" are two genuinely
// contradictory FUTURE directions for the SAME current tiles (one wants to
// keep the honor tile present, the other wants it gone), even though no
// COMPLETE hand could ever be both.
//
// Caught TWO instances of this the hard way, on two separate axes: an early
// version of computeRouteToPoints let Half Flush (50) sum with All Simples
// (68) — the honor axis — and a later version let Seven Pairs (19) sum with
// All Pungs (49) — the shape axis (Seven Pairs structurally has no
// pung/kong at all) — both into a false "reaches 8 points" on a hand that
// could never actually score both. Two hand-picked axes were never going to
// be the last ones found by accident, so fan-target-compatibility.ts now
// enumerates and classifies all 45 pairs among the 10 families exhaustively
// (25 compatible, 20 incompatible), each grounded in the real detectors'
// own already-cited guard conditions or win-detection.ts's structural
// definitions — see that module's own header for the full reasoning and
// fan-target-compatibility.test.ts for a constructed hand per compatible
// pair where both real detectors actually fire together.
export function computeRouteToPoints(hand: Hand, context: WinCircumstanceContext = {}): RouteToPointsResult {
  const handPlan = computeHandPlan(hand, context)
  const lockedInFans = handPlan.lockedInFans
  const lockedInPoints = lockedInFans.reduce((sum, f) => sum + (FAN_REGISTRY[f.fanId]?.points ?? 0) * f.count, 0)

  const candidates = estimateFanTargets(hand, context)
  const selected: FanTargetEstimate[] = []
  const chosenFanIds: number[] = lockedInFans.map((f) => f.fanId)

  // A zero-probability candidate (this file's own linear shanten/heuristic
  // scales bottom out at exactly 0, not just "small") contributes nothing
  // real to a BEST case — counting its full raw points anyway would make
  // "reaches the minimum" trivially true for nearly any hand with 3+
  // compatible families in play, defeating the entire point of the CHANGE 3
  // warning (SPEC §6's trap). Excluded from `selected`/`bestCaseTotal` only;
  // still present in `candidates` verbatim.
  //
  // KNOWN GAP, not fixed here (investigated and reported separately,
  // 2026-08-08): a fanId already in chosenFanIds via lockedInFans is always
  // skipped below, even when the candidate represents a legitimate FURTHER
  // unit of the same countable fan (Dragon Pung, fanId 59, is the only such
  // fan among the 10) — e.g. one melded dragon pung already locked in plus
  // a second dragon at 2 concealed copies produces a real +2-point
  // candidate that this loop silently drops. Tracked in OPEN-WORK.md; not
  // folded into this pass, which is scoped to route COMPATIBILITY, not
  // per-unit accounting.
  //
  // fan-target-compatibility.ts's table only classifies pairs among the 10
  // Stage 3 families and defaults an unknown pair to incompatible (safe
  // there, since the completeness test guarantees no pair among the 10 is
  // ever actually unknown) — WRONG for a locked-in fan from outside the 10
  // (e.g. Concealed Kong), where this module simply has no opinion. Caught
  // via hints.test.ts's "a locked-in fan outside the 10 Stage 3 families"
  // fixture while wiring this in, before it shipped: the `STAGE3_FAN_IDS`
  // guard below is what makes that case fall through to "compatible"
  // instead of being silently blocked.
  //
  // PRECONDITION for that fall-through to stay safe (reviewed 2026-08-08):
  // falling through to "compatible" for a locked-in fan outside the 10
  // relies on `areExclusive` alone NOT being sufficient here — exclusions.ts
  // deliberately omits structurally-impossible pairs (its whole domain is
  // COMPLETE hands; see fan-target-compatibility.ts's own header) — so the
  // real safety net is that every one of fan-targets.ts's estimators
  // already reads `hand.melds` and refuses to propose a candidate the
  // melds structurally rule out. `estimateSimplesAndHonors`'s
  // `meldHasHonor`/`meldHasTerminal` check (fan-targets.ts:390-392) is the
  // LOAD-BEARING case: a melded pung of terminals or honors can lock in
  // some other real fan entirely outside the 10 (e.g. fan 73, Pung of
  // Terminals or Honors) that structurally forbids All Simples/No Honors,
  // with no `exclusions.ts` entry to catch it — this only stays safe
  // because the estimator itself sees those same meld tiles as offending
  // and never emits the conflicting candidate in the first place, not
  // because anything in this file checked. **If a future estimator is
  // added that inspects only `hand.concealedTiles` and ignores
  // `hand.melds`, this precondition breaks silently**: the fall-through
  // below would then treat a locked-in out-of-domain fan as compatible
  // with a candidate the melds already ruled out.
  for (const candidate of candidates) {
    if (candidate.completionProbability <= 0) continue
    if (chosenFanIds.includes(candidate.fanId)) continue
    if (
      chosenFanIds.some(
        (id) => areExclusive(id, candidate.fanId) || (STAGE3_FAN_IDS.includes(id) && !isRouteCompatible(id, candidate.fanId)),
      )
    )
      continue
    selected.push(candidate)
    chosenFanIds.push(candidate.fanId)
  }

  const bestCaseTotal = lockedInPoints + selected.reduce((sum, c) => sum + c.points, 0)

  // Exact beats estimate, estimate only speaks when exact is silent.
  // handPlan.bestCaseReachesMinimum is non-null only at tenpai, where it's
  // the real computeWaits-derived answer — checked FIRST and taken as final
  // either way (true -> 'reachable', false -> 'currentWaitsFallShort'),
  // never overridden by bestCaseTotal. The family estimate is consulted
  // only pre-tenpai, where there is no exact answer yet, and even then only
  // to raise 'unknown' to 'reachable' — it can never downgrade a tenpai-exact
  // 'true'. See MinimumPointsStatus's own doc comment for why the earlier
  // version of this branch (bestCaseTotal checked first) was backwards.
  const minimumPointsStatus: MinimumPointsStatus =
    handPlan.bestCaseReachesMinimum !== null
      ? handPlan.bestCaseReachesMinimum
        ? 'reachable'
        : 'currentWaitsFallShort'
      : bestCaseTotal >= MINIMUM_POINTS_TO_WIN
        ? 'reachable'
        : 'unknown'

  return { candidates, selected, lockedInPoints, bestCaseTotal, minimumPointsStatus }
}
