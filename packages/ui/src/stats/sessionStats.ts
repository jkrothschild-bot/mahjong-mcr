import type { GameState, Seat } from '@mahjong-mcr/engine'
import { deriveHandOutcome } from '../game/deriveScoreContext.js'

export interface SessionStats {
  handsPlayed: number
  wins: number
  totalPointsWon: number // sum of settlement points across only the human's own wins
  dealIns: number // hands where the human discarded the winning tile for someone else
  winsByFan: Record<number, number> // fanId -> total times matched across the human's wins
}

export const EMPTY_STATS: SessionStats = { handsPlayed: 0, wins: 0, totalPointsWon: 0, dealIns: 0, winsByFan: {} }

// Pure — folds one finished hand's result into a running SessionStats.
// Exhaustive draws only bump handsPlayed. A discard win by someone else
// where humanSeat is the discarder counts as a deal-in. Fan/point data for
// the human's own wins comes from deriveHandOutcome (game/deriveScoreContext.ts),
// the same source ScoreScreen uses, so this can never drift from what the
// player actually saw on the end-of-hand screen.
export function applyHandResult(stats: SessionStats, endedState: GameState, humanSeat: Seat): SessionStats {
  const result = endedState.result
  if (!result) return stats // hand hasn't ended yet — nothing to fold in

  const handsPlayed = stats.handsPlayed + 1
  if (result.outcome === 'exhaustiveDraw') {
    return { ...stats, handsPlayed }
  }

  const isHumanWin = result.winnerSeats?.[0] === humanSeat
  if (!isHumanWin) {
    const isHumanDealIn = result.winMethod === 'discard' && result.loserSeat === humanSeat
    return { ...stats, handsPlayed, dealIns: stats.dealIns + (isHumanDealIn ? 1 : 0) }
  }

  const outcome = deriveHandOutcome(endedState)
  if (!outcome) return { ...stats, handsPlayed } // shouldn't happen for outcome === 'win', kept a pure fallback

  const winsByFan = { ...stats.winsByFan }
  for (const match of outcome.scoreResult.fanMatches) {
    winsByFan[match.fanId] = (winsByFan[match.fanId] ?? 0) + match.count
  }

  return {
    handsPlayed,
    wins: stats.wins + 1,
    totalPointsWon: stats.totalPointsWon + outcome.settlement.basicPoints + outcome.settlement.flowerPoints,
    dealIns: stats.dealIns,
    winsByFan,
  }
}

const STORAGE_KEY = 'mcr-mahjong:session-stats:v1'

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isFanCountRecord(value: unknown): value is Record<number, number> {
  if (typeof value !== 'object' || value === null) return false
  return Object.entries(value).every(([key, count]) => Number.isFinite(Number(key)) && isNumber(count))
}

// Pure — no localStorage access — directly unit-testable, including
// corrupt/partial/missing input. Never throws: anything unrecognized falls
// back to the corresponding EMPTY_STATS field, not the whole object, same
// resilience posture as settings/useSettings.ts's loadSettings.
export function loadStats(raw: string | null): SessionStats {
  if (raw === null) return EMPTY_STATS
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return EMPTY_STATS
  }
  if (typeof parsed !== 'object' || parsed === null) return EMPTY_STATS
  const candidate = parsed as Partial<Record<keyof SessionStats, unknown>>
  return {
    handsPlayed: isNumber(candidate.handsPlayed) ? candidate.handsPlayed : EMPTY_STATS.handsPlayed,
    wins: isNumber(candidate.wins) ? candidate.wins : EMPTY_STATS.wins,
    totalPointsWon: isNumber(candidate.totalPointsWon) ? candidate.totalPointsWon : EMPTY_STATS.totalPointsWon,
    dealIns: isNumber(candidate.dealIns) ? candidate.dealIns : EMPTY_STATS.dealIns,
    winsByFan: isFanCountRecord(candidate.winsByFan) ? candidate.winsByFan : { ...EMPTY_STATS.winsByFan },
  }
}

export function serializeStats(stats: SessionStats): string {
  return JSON.stringify(stats)
}

export { STORAGE_KEY as SESSION_STATS_STORAGE_KEY }
