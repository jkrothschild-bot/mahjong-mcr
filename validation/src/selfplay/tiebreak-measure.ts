// By-product report for the Best Move / 8-point-route contradiction fix
// (decisions.md #39): the route-aware discard tie-break is now implemented
// in production (bots/policy.ts's rankDiscards calls hints.ts's
// routeAwareTieBreakValues within the already-efficiency-tied group). This
// script no longer justifies BUILDING the tie-break — that decision is made
// and shipped — it reports, as a by-product sanity check, how often the
// real production ranking now differs from what a pre-fix, efficiency-only
// ranking would have picked, using the ACTUAL exported
// routeAwareTieBreakValues (not a reimplementation, so this can never drift
// from what bots/computeBestMoveHint actually do).
//
// History: the first pass (pre-implementation) measured a hypothetical
// route-aware criterion against the SAME crediblePointsTotal estimate at
// every shanten, including tenpai — shown to be the wrong criterion there
// on owner review (decisions.md #39). A second measurement pass, using a
// corrected tenpai criterion candidate (worst-case real wait score), found
// the tenpai divergence rate barely moved (46.2% -> 44.3%) — the original
// "wrong criterion" hypothesis was largely DISPROVED, not confirmed; see
// decisions.md #39 for the full account. The FINAL tenpai criterion that
// shipped (live accepting tiles, tie-broken by best real score among them)
// is a further owner correction on top of that second pass, made because
// worst-case-across-waits conflates a dead wait (scores 1-7, can never
// legally be declared — scoreHand floors every win at >=8 via Chicken Hand)
// with a cheap one. This script reflects the FINAL, shipped criterion by
// calling the real production function directly.
//
// Deliberately does NOT change what any bot plays: every decision point is
// only OBSERVED via an extra, throwaway comparison against a local
// legacy-only reimplementation, then the real chooseMove/applyMove call
// proceeds exactly as production would (which already includes the
// route-aware tie-break) — same posture as sample.ts's own real-play
// sampling for item #37.
//
// NON-INDEPENDENCE (same caveat as decisions.md #37's own precision
// figures): every hand contributes multiple decision points, correlated
// within that hand's own trajectory — the rates below carry no error bar.
//
// Run (from repo root):
//   npm run selfplay:tiebreak --workspace=@mahjong-mcr/validation -- <count> <seedStart>
import {
  applyMove,
  BOT_PRESETS,
  chooseMove,
  evaluateDiscards,
  isHonorTypeId,
  isTerminalTypeId,
  ORDERED_STANDARD_TYPE_IDS,
  rankDiscards,
  routeAwareTieBreakValues,
  startHand,
  typeIdOfInstance,
  type DiscardEvaluation,
  type GameState,
  type Hand,
  type Seat,
  type TileTypeId,
  type WinCircumstanceContext,
} from '@mahjong-mcr/engine'

const HUMAN_SEAT: Seat = 0

function pendingSeatsNeedingDecision(state: GameState): Seat[] {
  switch (state.phase) {
    case 'awaitingDraw':
    case 'awaitingDiscard':
      return [state.currentSeat]
    case 'awaitingClaims':
    case 'awaitingRobKongClaims': {
      const pendingClaim = state.pendingClaim
      if (!pendingClaim) return []
      return pendingClaim.eligibleSeats.filter((seat) => pendingClaim.declarations[seat] === undefined)
    }
    case 'handEnded':
      return []
  }
}

// The pre-fix comparator, frozen verbatim (bots/policy.ts's own
// legacyDiscardCompare is unexported and now only the FINAL tie-break
// within rankDiscards, not the whole ranking) — an independent copy so this
// script's "how much did production change" comparison is against the real
// pre-fix baseline, not against itself under a different name.
function legacyDiscardCompare(a: DiscardEvaluation, b: DiscardEvaluation): number {
  if (a.ukeire.totalCount !== b.ukeire.totalCount) return b.ukeire.totalCount - a.ukeire.totalCount
  const aType = typeIdOfInstance(a.tile)
  const bType = typeIdOfInstance(b.tile)
  const aFlex = isHonorTypeId(aType) || isTerminalTypeId(aType) ? 0 : 1
  const bFlex = isHonorTypeId(bType) || isTerminalTypeId(bType) ? 0 : 1
  if (aFlex !== bFlex) return aFlex - bFlex
  return ORDERED_STANDARD_TYPE_IDS.indexOf(aType) - ORDERED_STANDARD_TYPE_IDS.indexOf(bType)
}

interface Decision {
  shanten: number
  diverges: boolean // does the real production pick differ from the pre-fix (legacy-only) pick?
  guardFired: boolean // routeAwareTieBreakValues returned null for this decision
}

function analyzeDecision(hand: Hand, context: WinCircumstanceContext): Decision | null {
  const evaluations = evaluateDiscards(hand)
  const minShanten = Math.min(...evaluations.map((e) => e.resultingShanten))
  const atMin = evaluations.filter((e) => e.resultingShanten === minShanten)

  const legacyBaseline = [...atMin].sort(legacyDiscardCompare)
  const distinctTypes = new Set(legacyBaseline.map((e) => typeIdOfInstance(e.tile)))
  if (distinctTypes.size < 2) return null // no genuine tie to break

  const routeValues = routeAwareTieBreakValues(hand, legacyBaseline, context)
  const production = rankDiscards(evaluations, hand, context)

  return {
    shanten: minShanten,
    diverges: typeIdOfInstance(production[0]!.tile) !== typeIdOfInstance(legacyBaseline[0]!.tile),
    guardFired: routeValues === null,
  }
}

function playOneHand(seed: number): Decision[] {
  let state = startHand({ seed, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
  const decisions: Decision[] = []

  let actions = 0
  const cap = 2000
  while (state.phase !== 'handEnded') {
    if (actions++ > cap) break
    const seat = pendingSeatsNeedingDecision(state)[0]
    if (seat === undefined) break

    if (seat === HUMAN_SEAT && state.phase === 'awaitingDiscard') {
      const hand = state.players[HUMAN_SEAT].hand
      const context: WinCircumstanceContext = { prevailingWind: state.prevailingWind, seatWind: state.players[HUMAN_SEAT].seatWind }
      const decision = analyzeDecision(hand, context)
      if (decision) decisions.push(decision)
    }

    const move = chooseMove(state, seat, BOT_PRESETS.balanced)
    state = applyMove(state, seat, move)
  }

  return decisions
}

function main(): void {
  const args = process.argv.slice(2)
  const count = Number(args[0] ?? 200)
  const seedStart = Number(args[1] ?? 5000)

  const t0 = process.hrtime.bigint()
  const all: Decision[] = []
  let handsPlayed = 0
  let handsErrored = 0

  for (let seed = seedStart; seed < seedStart + count; seed++) {
    try {
      all.push(...playOneHand(seed))
      handsPlayed++
    } catch (e) {
      handsErrored++
      // eslint-disable-next-line no-console
      console.log(`seed ${seed} errored: ${(e as Error).message}`)
    }
  }

  const t1 = process.hrtime.bigint()
  // eslint-disable-next-line no-console
  console.log(`hands=${handsPlayed} errored=${handsErrored} elapsedMs=${(Number(t1 - t0) / 1e6).toFixed(0)}`)
  // eslint-disable-next-line no-console
  console.log(`total seat0 discard decisions with a genuine tie (2+ distinct tied types): ${all.length}`)
  // eslint-disable-next-line no-console
  console.log(
    `\nNON-INDEPENDENCE: these are ${all.length} decisions from only ${handsPlayed} hands — rates below carry no error bar ` +
      "(same posture as decisions.md #37's own precision-figures note).",
  )

  const guardFired = all.filter((d) => d.guardFired)
  const diverging = all.filter((d) => d.diverges)
  // eslint-disable-next-line no-console
  console.log(
    `\nguard fired ('unknown' minimumPointsStatus, or no genuine multi-type tie): ${guardFired.length}/${all.length} (${all.length ? ((100 * guardFired.length) / all.length).toFixed(1) : '0.0'}%)`,
  )
  // eslint-disable-next-line no-console
  console.log(
    `production pick differs from the pre-fix (legacy-only) pick: ${diverging.length}/${all.length} (${all.length ? ((100 * diverging.length) / all.length).toFixed(1) : '0.0'}%)`,
  )

  // eslint-disable-next-line no-console
  console.log('\nby shanten:')
  // eslint-disable-next-line no-console
  console.log('shanten | n     | guard-fired | diverge-rate')
  const shantenKeys = [...new Set(all.map((d) => d.shanten))].sort((a, b) => a - b)
  for (const k of shantenKeys) {
    const atK = all.filter((d) => d.shanten === k)
    const guardK = atK.filter((d) => d.guardFired)
    const divK = atK.filter((d) => d.diverges)
    // eslint-disable-next-line no-console
    console.log(
      `${String(k).padStart(7)} | ${String(atK.length).padStart(5)} | ${((100 * guardK.length) / atK.length).toFixed(1).padStart(10)}% | ${((100 * divK.length) / atK.length).toFixed(1).padStart(11)}%`,
    )
  }
}

main()
