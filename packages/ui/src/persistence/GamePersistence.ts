import type { SavedGame } from './savedGameTypes.js'

export interface GamePersistence {
  loadActiveGame(): Promise<SavedGame | null>
  saveActiveGame(game: SavedGame): Promise<void>
  clearActiveGame(): Promise<void>
  completeGame(game: SavedGame): Promise<void>
}
