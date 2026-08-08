import { beforeEach, describe, expect, it } from 'vitest'
import type { GamePersistence } from './GamePersistence.js'
import { LocalGamePersistence } from './localGamePersistence.js'
import { migrateGuestGame, PersistenceCoordinator } from './persistenceCoordinator.js'
import { DEFAULT_GAME_CONFIG } from '../app/gameConfig.js'
import { initLoopState } from '../game/useGameLoop.js'
import type { SavedGame } from './savedGameTypes.js'

function game(): SavedGame { return { schemaVersion: 1, id: 'save-1', status: 'active', startedAt: '2026-08-07T00:00:00Z', savedAt: '2026-08-07T01:00:00Z', config: DEFAULT_GAME_CONFIG, game: initLoopState(42) } }

class CloudStub implements GamePersistence {
  saved: SavedGame | null = null
  fail = false
  async loadActiveGame() { if (this.fail) throw new Error('offline'); return this.saved }
  async saveActiveGame(value: SavedGame) { if (this.fail) throw new Error('offline'); this.saved = value }
  async clearActiveGame() { if (this.fail) throw new Error('offline'); this.saved = null }
  async completeGame(value: SavedGame) { if (this.fail) throw new Error('offline'); this.saved = { ...value, status: 'completed' } }
}

describe('PersistenceCoordinator', () => {
  beforeEach(() => window.localStorage.clear())
  it('keeps a local recovery copy when the cloud write fails', async () => {
    const local = new LocalGamePersistence(); const cloud = new CloudStub(); cloud.fail = true
    const coordinator = new PersistenceCoordinator(local, cloud, 'user-1')
    await expect(coordinator.saveActiveGame(game())).rejects.toThrow('offline')
    expect(await local.loadRecoveryGame('user-1')).toMatchObject({ id: 'save-1', ownerId: 'user-1' })
  })
  it('loads the verified cloud game and refreshes the local recovery copy', async () => {
    const local = new LocalGamePersistence(); const cloud = new CloudStub(); cloud.saved = { ...game(), ownerId: 'user-1' }
    const coordinator = new PersistenceCoordinator(local, cloud, 'user-1')
    expect(await coordinator.loadActiveGame()).toMatchObject({ id: 'save-1' })
    expect(await local.loadRecoveryGame('user-1')).toMatchObject({ id: 'save-1' })
  })

  it('keeps the guest save until a cloud migration has been uploaded and verified', async () => {
    const local = new LocalGamePersistence(); const cloud = new CloudStub()
    await local.saveActiveGame(game())
    cloud.fail = true
    await expect(migrateGuestGame(local, cloud, 'user-1')).rejects.toThrow('offline')
    const retainedGuest = await local.loadActiveGame()
    expect(retainedGuest).toMatchObject({ id: 'save-1' })
    expect(retainedGuest?.ownerId).toBeUndefined()

    cloud.fail = false
    expect(await migrateGuestGame(local, cloud, 'user-1')).toBe(true)
    expect(await local.loadActiveGame()).toBeNull()
    expect(await local.loadRecoveryGame('user-1')).toMatchObject({ id: 'save-1', ownerId: 'user-1' })
  })
})
