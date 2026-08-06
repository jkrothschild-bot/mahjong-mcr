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
import { parseSuited, type SuitChar } from './scoring/set-helpers.js'
import { sevenPairsShantenFromCounts } from './shanten.js'
import { typeIdOfInstance, type TileTypeId } from './tiles.js'
import { groupConcealedByType } from './win-detection.js'

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

// Aggregates every family's estimate into one flat, sorted list. No fixed
// cap here — "top N for display" is a UI-layer decision for the later
// panel-composition step (KICKOFF-phase10-strategy-coach.md's Stage 3
// design, "Not solving in the engine layer"), not baked in here.
export function estimateFanTargets(hand: Hand): FanTargetEstimate[] {
  const estimates: (FanTargetEstimate | null)[] = [estimateSevenPairs(hand), estimateHalfFullFlush(hand), ...estimateDragonTargets(hand)]
  return estimates.filter((e): e is FanTargetEstimate => e !== null).sort((a, b) => b.value - a.value)
}
