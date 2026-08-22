// Phase 10 Strategy Coach calibration harness — see this directory's
// section of ../../README.md for the full design rationale, and
// docs/rules/decisions.md for the recorded results of the run this backs.
//
// Unlike the PyMahjongGB harness above (which cross-checks `scoreHand`
// against an independent implementation), this harness never disputes a
// score — it plays full self-play hands with the engine's own production
// bot policy and asks a different question: how well does
// `computeRouteToPoints`'s `minimumPointsStatus` actually predict whether
// the hand it's evaluating goes on to finish at all, bucketed by shanten.
//
// Every seat plays `BOT_PRESETS.balanced` (production `chooseMove`) — seat 0
// is not special except that it's the one we sample. At every one of seat
// 0's own discard decisions, records shanten, the full (unfiltered)
// `estimateFanTargets` candidate list (via `computeRouteToPoints.candidates`)
// with each candidate's own native distance (sevenPairsShanten for fan 19;
// tilesNeeded.length for the others — see report.ts for how these feed the
// offline gate sweep), and today's real `bestCaseTotal`/`minimumPointsStatus`
// — never a hypothetical. Distinct hands accumulate into
// `selfplay-samples/samples.jsonl` (append mode, chunked runs), and each
// hand's own real final outcome (did seat 0 win, and at what actual score,
// via the same `deriveWinLegalityContext`/`scoreHand` path `moves.ts` itself
// uses for win-legality gating) into `selfplay-samples/outcomes.jsonl` — the
// join key is `seed`.
//
// Run (from repo root), chunked — a single hand costs ~1.8s of real
// self-play (the bots' own `evaluateDiscards` cost, not this script's
// instrumentation), so a few thousand hands needs to run in sub-10-minute
// chunks:
//   npm run selfplay:sample --workspace=@mahjong-mcr/validation -- <count> <seedStart>
import { appendFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  applyMove,
  BOT_PRESETS,
  chooseMove,
  computeHandPlan,
  computeRouteToPoints,
  deriveWinLegalityContext,
  groupConcealedByType,
  meldTileTypeId,
  scoreHand,
  sevenPairsShantenFromCounts,
  startHand,
  type FanTargetEstimate,
  type GameState,
  type Hand,
  type MinimumPointsStatus,
  type Seat,
} from '@mahjong-mcr/engine'

const OUT_DIR = fileURLToPath(new URL('../../selfplay-samples/', import.meta.url))
mkdirSync(OUT_DIR, { recursive: true })
const SAMPLES_FILE = OUT_DIR + 'samples.jsonl'
const OUTCOMES_FILE = OUT_DIR + 'outcomes.jsonl'

const HUMAN_SEAT: Seat = 0

interface CandidateRecord {
  fanId: number
  points: number
  probabilityBasis: FanTargetEstimate['probabilityBasis']
  completionProbability: number
  tilesNeededCount: number
  status: FanTargetEstimate['status']
}

interface Sample {
  seed: number
  turnIndex: number
  shanten: number
  meldCount: number
  sevenPairsShanten: number // Infinity (serialized "null" via JSON.stringify) whenever any meld exists
  concealedCounts: Record<string, number>
  melds: { kind: string; exposure: string; typeId: string }[]
  candidates: CandidateRecord[]
  lockedInFans: { fanId: number; count: number }[]
  lockedInPoints: number
  bestCaseTotal: number
  minimumPointsStatus: MinimumPointsStatus
  bestCaseReachesMinimum: boolean | null
}

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

function recordSample(seed: number, turnIndex: number, hand: Hand, prevailingWind: GameState['prevailingWind'], seatWind: GameState['players'][number]['seatWind']): Sample {
  const plan = computeHandPlan(hand, { prevailingWind, seatWind })
  const rtp = computeRouteToPoints(hand, { prevailingWind, seatWind })
  const counts = groupConcealedByType(hand.concealedTiles)
  const sevenPairsShanten = sevenPairsShantenFromCounts(counts, hand.melds.length)

  return {
    seed,
    turnIndex,
    shanten: plan.shanten.shanten,
    meldCount: hand.melds.length,
    sevenPairsShanten,
    concealedCounts: Object.fromEntries(Object.entries(counts).filter(([, n]) => (n as number) > 0)),
    melds: hand.melds.map((m) => ({ kind: m.kind, exposure: m.exposure, typeId: meldTileTypeId(m) })),
    candidates: rtp.candidates.map((c) => ({
      fanId: c.fanId,
      points: c.points,
      probabilityBasis: c.probabilityBasis,
      completionProbability: c.completionProbability,
      tilesNeededCount: c.tilesNeeded.length,
      status: c.status,
    })),
    lockedInFans: plan.lockedInFans,
    lockedInPoints: rtp.lockedInPoints,
    bestCaseTotal: rtp.bestCaseTotal,
    minimumPointsStatus: rtp.minimumPointsStatus,
    bestCaseReachesMinimum: plan.bestCaseReachesMinimum,
  }
}

// Post-hoc final score for a real win, using the SAME
// deriveWinLegalityContext/scoreHand path moves.ts's own win-legality gate
// uses prospectively — logLengthForKongCheck must be state.actionLog.length
// - 1 here (not the default) since finalizeWin already appended the
// trailing 'win' action by the time this runs on the ended state; see that
// function's own comment ("a post-hoc caller... skips the trailing 'win'
// log entry").
function finalScoreFor(finalState: GameState, seat: Seat): number | null {
  const result = finalState.result
  if (!result || result.outcome !== 'win' || !(result.winnerSeats ?? []).includes(seat)) return null
  const winMethod = result.winMethod!
  const winningTile = result.winningTile!
  const hand = finalState.players[seat].hand
  const context = deriveWinLegalityContext(finalState, seat, winMethod, winningTile, finalState.actionLog.length - 1)
  const concealedTiles = winMethod === 'selfDraw' ? hand.concealedTiles : [...hand.concealedTiles, winningTile]
  return scoreHand({ concealedTiles, melds: hand.melds, ...context }).basicPoints
}

function playOneHand(seed: number): { samples: Sample[]; outcome: Record<string, unknown> } {
  let state = startHand({ seed, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
  const samples: Sample[] = []
  let turnIndex = 0
  samples.push(recordSample(seed, turnIndex, state.players[HUMAN_SEAT].hand, state.prevailingWind, state.players[HUMAN_SEAT].seatWind))

  let actions = 0
  const cap = 2000
  let cappedOut = false
  while (state.phase !== 'handEnded') {
    if (actions++ > cap) {
      cappedOut = true
      break
    }
    const seat = pendingSeatsNeedingDecision(state)[0]
    if (seat === undefined) {
      cappedOut = true
      break
    }
    const move = chooseMove(state, seat, BOT_PRESETS.balanced)
    const wasHumanDiscard = seat === HUMAN_SEAT && state.phase === 'awaitingDiscard'
    state = applyMove(state, seat, move)
    if (wasHumanDiscard) {
      turnIndex++
      samples.push(recordSample(seed, turnIndex, state.players[HUMAN_SEAT].hand, state.prevailingWind, state.players[HUMAN_SEAT].seatWind))
    }
  }

  const result = state.result
  const seat0Won = !cappedOut && result?.outcome === 'win' && (result.winnerSeats ?? []).includes(HUMAN_SEAT)
  const outcome = {
    seed,
    outcome: cappedOut ? 'capped' : (result?.outcome ?? 'capped'),
    seat0Won,
    seat0FinalScore: cappedOut ? null : finalScoreFor(state, HUMAN_SEAT),
    winnerSeat: !cappedOut && result?.outcome === 'win' ? (result.winnerSeats?.[0] ?? null) : null,
  }
  return { samples, outcome }
}

function main(): void {
  const args = process.argv.slice(2)
  const count = Number(args[0] ?? 50)
  const seedStart = Number(args[1] ?? 0)

  const t0 = process.hrtime.bigint()
  let handsPlayed = 0
  let handsErrored = 0
  const sampleLines: string[] = []
  const outcomeLines: string[] = []

  for (let seed = seedStart; seed < seedStart + count; seed++) {
    try {
      const { samples, outcome } = playOneHand(seed)
      for (const s of samples) sampleLines.push(JSON.stringify(s))
      outcomeLines.push(JSON.stringify(outcome))
      handsPlayed++
    } catch (e) {
      handsErrored++
      // eslint-disable-next-line no-console
      console.log(`seed ${seed} errored: ${(e as Error).message}`)
      outcomeLines.push(JSON.stringify({ seed, outcome: 'errored', seat0Won: false, seat0FinalScore: null, winnerSeat: null }))
    }
  }

  appendFileSync(SAMPLES_FILE, sampleLines.join('\n') + '\n')
  appendFileSync(OUTCOMES_FILE, outcomeLines.join('\n') + '\n')

  const t1 = process.hrtime.bigint()
  // eslint-disable-next-line no-console
  console.log(
    `chunk seeds=[${seedStart},${seedStart + count}) handsPlayed=${handsPlayed} handsErrored=${handsErrored} ` +
      `samples=${sampleLines.length} elapsedMs=${(Number(t1 - t0) / 1e6).toFixed(0)}`,
  )
}

main()
