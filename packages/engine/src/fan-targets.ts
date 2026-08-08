// Phase 10 Stage 3 (KICKOFF-phase10-strategy-coach.md — read that doc's own
// "Stage 3 design" section first, it's the source of truth this file
// implements, not a summary of it). Fan DISTANCE on INCOMPLETE hands — the
// mockup's "Route to eight points" panel needs to say "you're partway to
// Half Flush, N tiles stand in the way" on a hand that hasn't won yet, which
// none of the 81 real detectors in scoring/fans-*.ts can do (they only ever
// run on a COMPLETE winning hand). This file is a SEPARATE, ADDITIVE layer
// alongside them — it never touches scoring, win-detection, or the
// exclusion table, and a hand's actual score is never computed from
// anything in here.
//
// Each family below is its own small, bespoke, individually-citable
// function (mirroring scoring/fans-*.ts's own per-fan-function convention
// deliberately) rather than a generic pattern-matching framework. Every
// estimator cites its fan's mcr_EN.pdf section — usually the SAME passage
// the real detector for that fan already cites, since this file's job is
// "how close," not "is it true," which the real detector already settled.
//
// probabilityBasis distinguishes two genuinely different kinds of number
// (see FanTargetEstimate's own comment) — 'shanten' families reuse this
// project's own validated shanten/ukeire machinery or an equally exact
// discrete count; 'heuristic' families are an explicitly non-rulebook-
// sourced teaching estimate (docs/rules/decisions.md #35, same posture as
// defense.ts's danger signals, #16). A future UI must never render the two
// as equivalently-precise percentages.
import type { Hand } from './hand.js'
import { meldTileTypeId } from './meld.js'
import { FAN_REGISTRY } from './scoring/registry.js'
import { isHonorTypeId, isTerminalTypeId, parseSuited, windTypeId, type SuitChar } from './scoring/set-helpers.js'
import { sevenPairsShantenFromCounts } from './shanten.js'
import { typeIdOfInstance, type TileTypeId, type Wind } from './tiles.js'
import { groupConcealedByType, ORDERED_STANDARD_TYPE_IDS } from './win-detection.js'
import type { WinCircumstanceContext } from './waits.js'

export interface FanTargetEstimate {
  fanId: number
  points: number
  // 'locked': already structurally guaranteed (a stricter, per-family bar
  // than hints.ts's lockedInFansFromMelds — that function only ever looks
  // at melds; this file's estimators may also recognize a fan as locked
  // from the CONCEALED hand alone, e.g. three concealed dragon tiles that
  // were never declared as a meld at all).
  // 'inProgress': not locked, but the hand has a real structural lean
  // toward it, worth surfacing as a target.
  // Nothing lower than these two is ever returned — a family judged too
  // far off or structurally unreachable simply isn't in the array.
  // Exhaustiveness isn't the bar (KICKOFF-phase10-strategy-coach.md Stage
  // 3); an empty result for a given family on a given hand is normal.
  status: 'locked' | 'inProgress'
  // Distinct tile types that would help, deduped. Empty when status is
  // 'locked' (nothing left to do for this specific fan).
  tilesNeeded: TileTypeId[]
  // 0-1. See probabilityBasis below for what this number actually means —
  // it is NOT a uniform statistical quantity across every FanTargetEstimate.
  completionProbability: number
  // Distinguishes two genuinely different kinds of completionProbability:
  //   - 'shanten': derived from this project's own already-validated
  //     shanten/ukeire distance metric, or an equally exact discrete count
  //     (e.g. "2 of 3 required dragon pungs already complete"). As precise
  //     as the rest of the engine's own hand-shape reasoning.
  //   - 'heuristic': a rough, explicitly non-rulebook-sourced teaching
  //     estimate (docs/rules/decisions.md #35) — monotonic and directionally
  //     honest, but not derived from anything resembling real draw
  //     probability. A future UI MUST NOT present this alongside a
  //     'shanten' estimate as if the two numbers were equally precise
  //     (different vocabulary/visual treatment per tier, decided when the
  //     panel itself is built).
  probabilityBasis: 'shanten' | 'heuristic'
  // completionProbability * points — for ranking/selecting which targets to
  // feature, not itself a points prediction.
  value: number
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

// 19. Seven Pairs — 24 pts. §3.8.1 p.15 / App.1 p.29: "A hand formed by
// seven pairs." (Same citation scoring/fans-24.ts's real detectSevenPairs
// already uses.) probabilityBasis: 'shanten' — directly reuses
// sevenPairsShantenFromCounts (shanten.ts), the project's own already-
// validated distance metric for this exact shape, rather than a new
// formula. Structurally impossible with any meld at all (Seven Pairs is a
// fully-concealed-only shape — sevenPairsShantenFromCounts itself already
// encodes this via its own meldCount !== 0 -> Infinity check).
//
// completionProbability maps shanten (range: -1 complete .. 6 worst case
// for a real 13-tile hand, per sevenPairsShantenFromCounts's own "6 - pairs
// + max(0, 7-kinds)" formula) onto [0,1] via a simple linear scale — NOT a
// literal draw-simulation, just a monotonic "fewer steps = higher"
// translation of the exact same distance real shanten-based UI elsewhere
// (hints.ts's route-viability margin) already treats the same way.
export function estimateSevenPairs(hand: Hand): FanTargetEstimate | null {
  if (hand.melds.length > 0) return null
  const counts = groupConcealedByType(hand.concealedTiles)
  const shanten = sevenPairsShantenFromCounts(counts, hand.melds.length)
  if (shanten === Infinity) return null

  const fanId = 19
  const points = FAN_REGISTRY[fanId]!.points
  const tilesNeeded = (Object.entries(counts) as [TileTypeId, number][])
    .filter(([, count]) => count === 1)
    .map(([id]) => id)
    .sort()

  const status: 'locked' | 'inProgress' = shanten < 0 ? 'locked' : 'inProgress'
  const completionProbability = clamp01((6 - shanten) / 7)
  return { fanId, points, status, tilesNeeded: status === 'locked' ? [] : tilesNeeded, completionProbability, probabilityBasis: 'shanten', value: completionProbability * points }
}

// 50. Half Flush — 6 pts. §3.8.1 p.16 / App.1 p.38: "Formed by tiles from
// any one of the three suits, in combination with Honor tiles." /
// 22. Full Flush — 24 pts. §3.8.1 p.15 / App.1 p.30: "All the tiles are in
// the same suit." (Same citations scoring/fans-6.ts's detectHalfFlush and
// scoring/fans-24.ts's detectFullFlush already use.) One shared suit-
// concentration estimator, same mutual-exclusivity logic those two real
// detectors already encode (Full Flush requires zero honors anywhere; a
// single honor tile makes it Half Flush's territory instead, never both).
//
// probabilityBasis: 'heuristic' (docs/rules/decisions.md #35) — completion
// means "every remaining/kept tile satisfies a predicate," not reaching a
// discrete counted structure, so there's no shanten-style formula to reuse.
// completionProbability is a simple, explicitly rough monotonic function of
// how many concealed tiles belong to a suit other than the target: fewer
// offending tiles relative to the concealed hand's own size -> higher.
export function estimateHalfFullFlush(hand: Hand): FanTargetEstimate | null {
  const meldTypeIds = hand.melds.flatMap((m) => m.tiles.map(typeIdOfInstance))
  const meldSuits = new Set(meldTypeIds.map(parseSuited).filter((p): p is NonNullable<typeof p> => p !== null).map((p) => p.suit))
  if (meldSuits.size > 1) return null // melds already span 2+ suits — structurally impossible

  const concealedTypeIds = hand.concealedTiles.map(typeIdOfInstance)
  const suitCounts: Record<SuitChar, number> = { C: 0, D: 0, B: 0 }
  let honorCount = 0
  for (const id of [...concealedTypeIds, ...meldTypeIds]) {
    const parsed = parseSuited(id)
    if (parsed) suitCounts[parsed.suit]++
    else honorCount++
  }

  let targetSuit: SuitChar
  if (meldSuits.size === 1) {
    targetSuit = [...meldSuits][0]!
  } else {
    targetSuit = 'C'
    let best = -1
    for (const suit of ['C', 'D', 'B'] as const) {
      if (suitCounts[suit] > best) {
        best = suitCounts[suit]
        targetSuit = suit
      }
    }
  }
  if (suitCounts[targetSuit] === 0) return null // no suited tiles at all toward any flush

  const targetsFullFlush = honorCount === 0
  const fanId = targetsFullFlush ? 22 : 50
  const points = FAN_REGISTRY[fanId]!.points

  const offendingSuited = concealedTypeIds.filter((id) => {
    const parsed = parseSuited(id)
    return parsed !== null && parsed.suit !== targetSuit
  })
  // Honors are never "offending" for a Half Flush target (they're required,
  // not just tolerated) — only relevant when still aiming for Full Flush.
  const offendingHonors = targetsFullFlush ? concealedTypeIds.filter((id) => parseSuited(id) === null) : []
  const tilesNeeded = [...new Set([...offendingSuited, ...offendingHonors])].sort()

  const status: 'locked' | 'inProgress' = tilesNeeded.length === 0 ? 'locked' : 'inProgress'
  const denominator = concealedTypeIds.length || 1
  const completionProbability = clamp01(1 - tilesNeeded.length / denominator)
  return { fanId, points, status, tilesNeeded, completionProbability, probabilityBasis: 'heuristic', value: completionProbability * points }
}

const DRAGON_TYPE_IDS = ['DR', 'DG', 'DW'] as const

interface DragonStatus {
  typeId: (typeof DRAGON_TYPE_IDS)[number]
  concealedCount: number
  isPung: boolean // complete pung/kong, whether declared as a meld or already 3+ concealed copies
}

function dragonStatuses(hand: Hand): DragonStatus[] {
  const concealedCounts = groupConcealedByType(hand.concealedTiles)
  const meldDragonTypes = new Set(
    hand.melds
      .filter((m) => m.kind !== 'chow')
      .map((m) => meldTileTypeId(m))
      .filter((id): id is (typeof DRAGON_TYPE_IDS)[number] => (DRAGON_TYPE_IDS as readonly string[]).includes(id)),
  )
  return DRAGON_TYPE_IDS.map((typeId) => {
    const concealedCount = concealedCounts[typeId] ?? 0
    return { typeId, concealedCount, isPung: meldDragonTypes.has(typeId) || concealedCount >= 3 }
  })
}

// 59. Dragon Pung — 2 pts, PER QUALIFYING PUNG. §3.8.1 p.16 / App.1 p.39:
// "A Pung or Kong of Dragon Tiles." (Same citation scoring/fans-2.ts's
// detectDragonPung already uses.) / 2. Big Three Dragons — 88 pts. §3.8.1
// p.14 / App.1 p.24: "Pungs or Kongs of all three Dragon Tiles." (Same
// citation scoring/fans-88.ts's detectBigThreeDragons already uses.)
//
// One shared scan (only 3 dragon types exist, 4 copies each — cheap to
// check all three every time) feeding two targets: the closest NOT-YET-
// complete dragon pung (fan 59's own per-unit nature means completing any
// one is real, immediate value), and — only once 2 of the 3 are already
// complete, since further off than that is too speculative for v1 (Stage 3
// design: "exhaustiveness is explicitly not the bar") — Big Three Dragons
// itself. probabilityBasis: 'shanten' for both — "how many of a specific
// dragon's 4 copies are already held" and "how many of the 3 dragons are
// already complete" are both exact discrete counts, not a rough formula,
// same precision tier as the real shanten machinery even though neither
// literally calls into shanten.ts.
export function estimateDragonTargets(hand: Hand): FanTargetEstimate[] {
  const statuses = dragonStatuses(hand)
  const completeCount = statuses.filter((s) => s.isPung).length
  const results: FanTargetEstimate[] = []

  const incomplete = statuses.filter((s) => !s.isPung)
  const bestIncomplete = incomplete.reduce<DragonStatus | null>(
    (best, s) => (best === null || s.concealedCount > best.concealedCount ? s : best),
    null,
  )
  if (bestIncomplete && bestIncomplete.concealedCount > 0) {
    const points = FAN_REGISTRY[59]!.points
    const completionProbability = clamp01(bestIncomplete.concealedCount / 3)
    results.push({
      fanId: 59,
      points,
      status: 'inProgress',
      tilesNeeded: [bestIncomplete.typeId],
      completionProbability,
      probabilityBasis: 'shanten',
      value: completionProbability * points,
    })
  }

  if (completeCount === 3) {
    const points = FAN_REGISTRY[2]!.points
    results.push({ fanId: 2, points, status: 'locked', tilesNeeded: [], completionProbability: 1, probabilityBasis: 'shanten', value: points })
  } else if (completeCount === 2) {
    const remaining = statuses.find((s) => !s.isPung)!
    const points = FAN_REGISTRY[2]!.points
    const completionProbability = clamp01(remaining.concealedCount / 3)
    results.push({
      fanId: 2,
      points,
      status: 'inProgress',
      tilesNeeded: [remaining.typeId],
      completionProbability,
      probabilityBasis: 'shanten',
      value: completionProbability * points,
    })
  }

  return results
}

// 49. All Pungs — 6 pts. §3.8.1 p.16 / App.1 p.38: "A hand formed by four
// Pungs (or Kongs) and one pair." (Same citation scoring/fans-6.ts's real
// detectAllPungs already uses.) probabilityBasis: 'shanten' — a genuinely
// new distance metric (shanten.ts has no "pungs only" shape), but built from
// the SAME additive block-cost theory standardShantenFromCounts itself
// documents as "standard shanten-calculator theory, not sourced from the MCR
// rulebook" — restricted to pung/kong-eligible blocks only (no chow option).
// Unlike the general standard shape, pung/pair blocks never interact across
// TYPES the way chow blocks do across adjacent RANKS (a pung of C1 and a
// pung of C4 never compete for the same tile), so the optimal block
// selection has no cross-type search to do: for a given tile budget, always
// prefer completing an available pung (value 2/slot) over settling for a
// pair-toward-pung (value 1/slot) — greedy-by-value is provably optimal
// here, unlike the general case searchBlocks() exists to solve exhaustively.
// Structurally impossible with any CHOW meld (a chow can never become a
// pung); exposed pung/kong melds are fine, mirroring detectAllPungs' own
// `sets.every(s => s.kind !== 'chow')` check.
function pungOnlyBlockValue(counts: Readonly<Record<TileTypeId, number>>, budget: number): number {
  let pungEligible = 0
  let pairEligible = 0
  for (const id of ORDERED_STANDARD_TYPE_IDS) {
    const count = counts[id] ?? 0
    if (count >= 3) pungEligible++
    else if (count === 2) pairEligible++
  }
  const usedPungs = Math.min(pungEligible, budget)
  const usedPairs = Math.min(pairEligible, budget - usedPungs)
  return 2 * usedPungs + usedPairs
}

function allPungsShantenFromCounts(counts: Readonly<Record<TileTypeId, number>>, meldCount: number): number {
  const n = 4 - meldCount
  if (n < 0) return Infinity

  let best = 8 - 2 * meldCount - pungOnlyBlockValue(counts, n)

  // Mirrors standardShantenFromCounts' own head-pair trial loop exactly —
  // try reserving each type with >=2 copies as the head, recompute the
  // block value on what's left, take the min.
  for (const type of ORDERED_STANDARD_TYPE_IDS) {
    if ((counts[type] ?? 0) < 2) continue
    const withoutHead = { ...counts }
    withoutHead[type]! -= 2
    best = Math.min(best, 8 - 2 * meldCount - pungOnlyBlockValue(withoutHead, n) - 1)
  }

  return best
}

export function estimateAllPungs(hand: Hand): FanTargetEstimate | null {
  if (hand.melds.some((m) => m.kind === 'chow')) return null
  const counts = groupConcealedByType(hand.concealedTiles)
  const shanten = allPungsShantenFromCounts(counts, hand.melds.length)
  if (shanten === Infinity) return null

  const fanId = 49
  const points = FAN_REGISTRY[fanId]!.points
  // The direct completion target for each existing pair-toward-pung group —
  // its own third copy. Doesn't attempt to also account for hands still
  // missing pairs entirely (too far off to name a specific tile yet); an
  // empty result there is treated as "too speculative for v1" and the whole
  // estimate is skipped below, same posture as Dragon Pung's own
  // concealedCount === 0 skip.
  const tilesNeeded = (Object.entries(counts) as [TileTypeId, number][])
    .filter(([, count]) => count === 2)
    .map(([id]) => id)
    .sort()

  const status: 'locked' | 'inProgress' = shanten < 0 ? 'locked' : 'inProgress'
  if (status === 'inProgress' && tilesNeeded.length === 0) return null

  // Worst case for a fresh, meldless hand is shanten 8 (n=4, zero pung/pair
  // blocks available); the additive formula's own "8 - 2*meldCount" baseline
  // scales that worst case down as melds accumulate, so the same proportion
  // is used as the denominator here rather than a fixed constant.
  const worst = 8 - 2 * hand.melds.length
  const completionProbability = status === 'locked' ? 1 : clamp01((worst - shanten) / (worst + 1))
  return { fanId, points, status, tilesNeeded: status === 'locked' ? [] : tilesNeeded, completionProbability, probabilityBasis: 'shanten', value: completionProbability * points }
}

// 60. Prevalent Wind — 2 pts. §3.8.1 p.16 / App.1 p.39: "A Pung or Kong of
// the Wind Tile that matches the current Prevalent (round) Wind." / 61. Seat
// Wind — 2 pts. §3.8.1 p.16 / App.1 p.39: "A Pung or Kong of the Wind Tile
// that matches the player's own Seat Wind." (Same citations
// scoring/fans-2.ts's real detectPrevalentWind/detectSeatWind already use.)
// Needs context — silently produces nothing for whichever wind isn't
// supplied, same undefined-safe posture as the real detectors' own
// `!ctx.prevailingWind`/`!ctx.seatWind` guards.
//
// probabilityBasis: 'heuristic' per the Stage 3 design's own classification
// (KICKOFF-phase10-strategy-coach.md) — a single named wind is simpler to
// treat with this file's general per-family formula style than to build
// Dragon Pung's shared multi-unit scan for just one target tile each.
// completionProbability is simply currentCount/3 (an exact discrete count,
// same shape as Dragon Pung's own formula) — still filed under 'heuristic'
// because, unlike Dragon Pung/Big Three Dragons, there's no multi-unit
// "how many of N are already done" structure backing it, just a single
// count; decisions.md #35 covers the classification rationale.
function windTarget(hand: Hand, wind: Wind | undefined, fanId: 60 | 61): FanTargetEstimate | null {
  if (!wind) return null
  const targetType = windTypeId(wind)
  const concealedCount = groupConcealedByType(hand.concealedTiles)[targetType] ?? 0
  const isMeldedPung = hand.melds.some((m) => m.kind !== 'chow' && meldTileTypeId(m) === targetType)
  const points = FAN_REGISTRY[fanId]!.points

  if (isMeldedPung || concealedCount >= 3) {
    return { fanId, points, status: 'locked', tilesNeeded: [], completionProbability: 1, probabilityBasis: 'heuristic', value: points }
  }
  if (concealedCount === 0) return null // too speculative for v1, same posture as Dragon Pung
  const completionProbability = clamp01(concealedCount / 3)
  return { fanId, points, status: 'inProgress', tilesNeeded: [targetType], completionProbability, probabilityBasis: 'heuristic', value: completionProbability * points }
}

export function estimateWindTargets(hand: Hand, context: WinCircumstanceContext = {}): FanTargetEstimate[] {
  const results = [windTarget(hand, context.prevailingWind, 60), windTarget(hand, context.seatWind, 61)]
  return results.filter((e): e is FanTargetEstimate => e !== null)
}

// 68. All Simples — 2 pts. §3.8.1 p.16 / App.1 p.40: "A hand formed entirely
// without Terminal or Honor tiles." / 76. No Honors — 1 pt. §3.8.1 p.16 /
// App.1 p.41: "A hand formed entirely of suit tiles, without Winds or
// Dragons." (Same citations scoring/fans-2.ts's detectAllSimples and
// scoring/fans-1.ts's detectNoHonors already use.) One shared tile-
// membership scan feeding both — All Simples is strictly narrower (bans
// terminals too), but they're kept as two separate estimates since a hand
// can be legitimately working toward either independently (e.g. a hand
// with a locked terminal chow can still reach No Honors but never All
// Simples).
//
// probabilityBasis: 'heuristic' (decisions.md #35) — same "offending tiles
// relative to hand size" formula as Half/Full Flush.
export function estimateSimplesAndHonors(hand: Hand): FanTargetEstimate[] {
  const meldTypeIds = hand.melds.flatMap((m) => m.tiles.map(typeIdOfInstance))
  const meldHasHonor = meldTypeIds.some(isHonorTypeId)
  const meldHasTerminal = meldTypeIds.some(isTerminalTypeId)

  const concealedTypeIds = hand.concealedTiles.map(typeIdOfInstance)
  const denominator = concealedTypeIds.length || 1
  const results: FanTargetEstimate[] = []

  if (!meldHasHonor) {
    const fanId = 76
    const points = FAN_REGISTRY[fanId]!.points
    const tilesNeeded = [...new Set(concealedTypeIds.filter(isHonorTypeId))].sort()
    const status: 'locked' | 'inProgress' = tilesNeeded.length === 0 ? 'locked' : 'inProgress'
    const completionProbability = clamp01(1 - tilesNeeded.length / denominator)
    results.push({ fanId, points, status, tilesNeeded, completionProbability, probabilityBasis: 'heuristic', value: completionProbability * points })
  }

  if (!meldHasHonor && !meldHasTerminal) {
    const fanId = 68
    const points = FAN_REGISTRY[fanId]!.points
    const tilesNeeded = [...new Set(concealedTypeIds.filter((id) => isHonorTypeId(id) || isTerminalTypeId(id)))].sort()
    const status: 'locked' | 'inProgress' = tilesNeeded.length === 0 ? 'locked' : 'inProgress'
    const completionProbability = clamp01(1 - tilesNeeded.length / denominator)
    results.push({ fanId, points, status, tilesNeeded, completionProbability, probabilityBasis: 'heuristic', value: completionProbability * points })
  }

  return results
}

// Aggregates every family's estimate into one flat, sorted list. No fixed
// cap here — "top N for display" is a UI-layer decision for the later
// panel-composition step (KICKOFF-phase10-strategy-coach.md's Stage 3
// design, "Not solving in the engine layer"), not baked in here.
export function estimateFanTargets(hand: Hand, context: WinCircumstanceContext = {}): FanTargetEstimate[] {
  const estimates: (FanTargetEstimate | null)[] = [
    estimateSevenPairs(hand),
    estimateAllPungs(hand),
    estimateHalfFullFlush(hand),
    ...estimateDragonTargets(hand),
    ...estimateWindTargets(hand, context),
    ...estimateSimplesAndHonors(hand),
  ]
  return estimates.filter((e): e is FanTargetEstimate => e !== null).sort((a, b) => b.value - a.value)
}
