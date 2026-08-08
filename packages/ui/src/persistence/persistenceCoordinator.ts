import type { GamePersistence } from './GamePersistence.js'
import { localGamePersistence, LocalGamePersistence } from './localGamePersistence.js'
import type { SavedGame } from './savedGameTypes.js'
import { SupabaseGamePersistence } from './supabaseGamePersistence.js'
import { getSupabaseClient } from '../auth/supabaseClient.js'

export class PersistenceCoordinator implements GamePersistence {
  private readonly local: LocalGamePersistence
  private readonly cloud: GamePersistence
  private readonly userId: string
  constructor(local: LocalGamePersistence, cloud: GamePersistence, userId: string) { this.local = local; this.cloud = cloud; this.userId = userId }

  async loadActiveGame(): Promise<SavedGame | null> {
    try {
      const cloudGame = await this.cloud.loadActiveGame()
      if (cloudGame) await this.local.saveActiveGame({ ...cloudGame, ownerId: this.userId })
      return cloudGame ?? await this.local.loadRecoveryGame(this.userId)
    } catch {
      return this.local.loadRecoveryGame(this.userId)
    }
  }

  async saveActiveGame(game: SavedGame): Promise<void> {
    const owned = { ...game, ownerId: this.userId }
    await this.local.saveActiveGame(owned)
    await this.cloud.saveActiveGame(owned)
  }

  async clearActiveGame(): Promise<void> {
    await this.cloud.clearActiveGame()
    await this.local.clearActiveGame()
  }

  async completeGame(game: SavedGame): Promise<void> {
    const owned = { ...game, ownerId: this.userId, status: 'completed' as const }
    await this.local.completeGame(owned)
    await this.cloud.completeGame(owned)
  }
}

export function gamePersistenceForUser(userId: string | null): GamePersistence {
  if (!userId) return localGamePersistence
  const client = getSupabaseClient()
  return client ? new PersistenceCoordinator(localGamePersistence, new SupabaseGamePersistence(client, userId), userId) : localGamePersistence
}

export async function migrateGuestGameToUser(userId: string): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false
  const cloud = new SupabaseGamePersistence(client, userId)
  return migrateGuestGame(localGamePersistence, cloud, userId)
}

export async function migrateGuestGame(local: LocalGamePersistence, cloud: GamePersistence, userId: string): Promise<boolean> {
  const guest = await local.loadActiveGame()
  if (!guest) return false
  const owned = { ...guest, ownerId: userId }
  await cloud.saveActiveGame(owned)
  const verified = await cloud.loadActiveGame()
  if (!verified || verified.id !== guest.id) throw new Error('Cloud save verification failed')
  await local.saveActiveGame(owned)
  return true
}
