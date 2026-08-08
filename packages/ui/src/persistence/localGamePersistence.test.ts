import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_GAME_CONFIG } from '../app/gameConfig.js'
import { initLoopState } from '../game/useGameLoop.js'
import { ACTIVE_GAME_STORAGE_KEY, LocalGamePersistence } from './localGamePersistence.js'
import { parseSavedGame, type SavedGame } from './savedGameTypes.js'

function validGame(): SavedGame {
  return { schemaVersion: 1, id: 'session-1', status: 'active', startedAt: '2026-08-07T00:00:00.000Z', savedAt: '2026-08-07T01:00:00.000Z', config: DEFAULT_GAME_CONFIG, game: initLoopState(42) }
}

describe('LocalGamePersistence', () => {
  beforeEach(() => window.localStorage.clear())
  it('loads a valid active snapshot', async () => {
    const persistence = new LocalGamePersistence()
    await persistence.saveActiveGame(validGame())
    expect(await persistence.loadActiveGame()).toEqual(validGame())
  })
  it('tolerates corrupt JSON and rejects unsupported schema versions', async () => {
    const persistence = new LocalGamePersistence()
    window.localStorage.setItem(ACTIVE_GAME_STORAGE_KEY, '{bad')
    expect(await persistence.loadActiveGame()).toBeNull()
    window.localStorage.setItem(ACTIVE_GAME_STORAGE_KEY, JSON.stringify({ ...validGame(), schemaVersion: 2 }))
    expect(await persistence.loadActiveGame()).toBeNull()
  })
  it('does not expose completed games as resumable', async () => {
    const persistence = new LocalGamePersistence()
    window.localStorage.setItem(ACTIVE_GAME_STORAGE_KEY, JSON.stringify({ ...validGame(), status: 'completed' }))
    expect(await persistence.loadActiveGame()).toBeNull()
  })
  it('does not throw when storage writes fail', async () => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn(() => { throw new Error('quota') }), removeItem: vi.fn(), clear: vi.fn(), key: vi.fn(), length: 0 } satisfies Storage
    await expect(new LocalGamePersistence(storage).saveActiveGame(validGame())).resolves.toBeUndefined()
  })
})

describe('parseSavedGame', () => {
  it('rejects a snapshot whose move log cannot reconstruct its game state', () => {
    const invalid = validGame()
    invalid.game.gameState.currentSeat = 2
    expect(parseSavedGame(JSON.stringify(invalid))).toBeNull()
  })
})
