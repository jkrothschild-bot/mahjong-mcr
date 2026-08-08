import { replayToIndex, type Seat } from '@mahjong-mcr/engine'
import { isGameConfig, type GameConfig } from '../app/gameConfig.js'
import type { LoopState } from '../game/useGameLoop.js'

export interface SavedGameV1 {
  schemaVersion: 1
  id: string
  ownerId?: string
  status: 'active' | 'completed' | 'abandoned'
  startedAt: string
  savedAt: string
  config: GameConfig
  game: LoopState
}

export type SavedGame = SavedGameV1

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isScoreRecord(value: unknown): value is Record<Seat, number> {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return ['0', '1', '2', '3'].every((seat) => isFiniteNumber(candidate[seat]))
}

function isMatchState(value: unknown): value is LoopState['matchState'] {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<LoopState['matchState']>
  return isFiniteNumber(candidate.matchSeed)
    && (candidate.prevailingWind === 'east' || candidate.prevailingWind === 'south' || candidate.prevailingWind === 'west' || candidate.prevailingWind === 'north')
    && (candidate.roundHandIndex === 1 || candidate.roundHandIndex === 2 || candidate.roundHandIndex === 3 || candidate.roundHandIndex === 4)
    && (candidate.dealerSeat === 0 || candidate.dealerSeat === 1 || candidate.dealerSeat === 2 || candidate.dealerSeat === 3)
    && isFiniteNumber(candidate.matchHandNumber)
    && typeof candidate.completed === 'boolean'
    && Array.isArray(candidate.handSeeds)
    && candidate.handSeeds.every(isFiniteNumber)
}

// Validation deliberately relies on the engine's existing replay boundary:
// if every recorded move can reconstruct the exact stored GameState, the
// snapshot is internally consistent without duplicating Mahjong rules here.
export function isLoopState(value: unknown): value is LoopState {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<LoopState>
  if (!candidate.gameState || !isMatchState(candidate.matchState) || !isScoreRecord(candidate.matchScores)) return false
  if (!Array.isArray(candidate.matchMoveLogs) || candidate.matchMoveLogs.length === 0) return false
  try {
    let replayed: unknown
    for (const log of candidate.matchMoveLogs) {
      if (!log || typeof log !== 'object' || !Array.isArray(log.moves) || !log.startParams) return false
      replayed = replayToIndex(log.startParams, log.moves, log.moves.length)
    }
    return candidate.matchMoveLogs.length === candidate.matchState.matchHandNumber
      && JSON.stringify(replayed) === JSON.stringify(candidate.gameState)
      && candidate.gameState.handNumber === candidate.matchState.matchHandNumber
      && candidate.gameState.prevailingWind === candidate.matchState.prevailingWind
      && candidate.gameState.dealerSeat === candidate.matchState.dealerSeat
  } catch {
    return false
  }
}

export function parseSavedGame(raw: string): SavedGame | null {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Partial<SavedGameV1>
  if (candidate.schemaVersion !== 1 || typeof candidate.id !== 'string' || candidate.id.length === 0) return null
  if (candidate.ownerId !== undefined && typeof candidate.ownerId !== 'string') return null
  if (candidate.status !== 'active' && candidate.status !== 'completed' && candidate.status !== 'abandoned') return null
  if (typeof candidate.startedAt !== 'string' || typeof candidate.savedAt !== 'string') return null
  if (!isGameConfig(candidate.config) || !isLoopState(candidate.game)) return null
  return candidate as SavedGameV1
}

export function isMatchComplete(snapshot: LoopState): boolean {
  return snapshot.matchState.completed || (snapshot.gameState.phase === 'handEnded' && snapshot.matchState.matchHandNumber === 16)
}

export function createSessionId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}
