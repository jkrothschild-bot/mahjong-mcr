import type { GamePersistence } from './GamePersistence.js'
import { parseSavedGame, type SavedGame } from './savedGameTypes.js'

export const ACTIVE_GAME_STORAGE_KEY = 'mcr-mahjong:active-game:v1'

export class LocalGamePersistence implements GamePersistence {
  private readonly storage: Storage

  constructor(storage: Storage = window.localStorage) {
    this.storage = storage
  }

  async loadActiveGame(): Promise<SavedGame | null> {
    try {
      const raw = this.storage.getItem(ACTIVE_GAME_STORAGE_KEY)
      if (raw === null) return null
      const game = parseSavedGame(raw)
      return game?.status === 'active' && game.ownerId === undefined ? game : null
    } catch {
      return null
    }
  }

  async saveActiveGame(game: SavedGame): Promise<void> {
    try {
      this.storage.setItem(ACTIVE_GAME_STORAGE_KEY, JSON.stringify(game))
    } catch {
      // Quota/private-browsing failures must not interrupt the live game.
    }
  }

  async clearActiveGame(): Promise<void> {
    try {
      this.storage.removeItem(ACTIVE_GAME_STORAGE_KEY)
    } catch {
      // The player can keep playing even if browser storage is unavailable.
    }
  }

  async loadRecoveryGame(userId: string): Promise<SavedGame | null> {
    try {
      const raw = this.storage.getItem(ACTIVE_GAME_STORAGE_KEY)
      if (raw === null) return null
      const game = parseSavedGame(raw)
      return game?.status === 'active' && game.ownerId === userId ? game : null
    } catch {
      return null
    }
  }

  async completeGame(game: SavedGame): Promise<void> {
    await this.saveActiveGame({ ...game, status: 'completed' })
  }
}

export const localGamePersistence = new LocalGamePersistence()
