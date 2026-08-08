import type { SupabaseClient } from '@supabase/supabase-js'
import type { GamePersistence } from './GamePersistence.js'
import { parseSavedGame, type SavedGame } from './savedGameTypes.js'

interface GameSessionRow {
  id: string
  user_id: string
  assistance_mode: 'learning' | 'none'
  status: 'active' | 'completed' | 'abandoned'
  state_version: number
  state_json: unknown
  started_at: string
  updated_at: string
}

export class SupabaseGamePersistence implements GamePersistence {
  private readonly client: SupabaseClient
  private readonly userId: string
  constructor(client: SupabaseClient, userId: string) { this.client = client; this.userId = userId }

  async loadActiveGame(): Promise<SavedGame | null> {
    const { data, error } = await this.client.from('game_sessions').select('id,user_id,assistance_mode,status,state_version,state_json,started_at,updated_at').eq('user_id', this.userId).eq('status', 'active').order('updated_at', { ascending: false }).limit(1).maybeSingle()
    if (error) throw error
    if (!data) return null
    const row = data as GameSessionRow
    return parseSavedGame(JSON.stringify({ schemaVersion: row.state_version, id: row.id, ownerId: row.user_id, status: row.status, startedAt: row.started_at, savedAt: row.updated_at, config: { variant: 'mcr', mode: 'solo', assistance: row.assistance_mode }, game: row.state_json }))
  }

  async saveActiveGame(game: SavedGame): Promise<void> { await this.upsert(game) }
  async completeGame(game: SavedGame): Promise<void> { await this.upsert({ ...game, status: 'completed' }) }

  async clearActiveGame(): Promise<void> {
    const now = new Date().toISOString()
    const { error } = await this.client.from('game_sessions').update({ status: 'abandoned', finished_at: now, updated_at: now }).eq('user_id', this.userId).eq('status', 'active')
    if (error) throw error
  }

  private async upsert(game: SavedGame): Promise<void> {
    if (game.status === 'active') {
      const { error: abandonError } = await this.client.from('game_sessions').update({ status: 'abandoned', finished_at: game.savedAt, updated_at: game.savedAt }).eq('user_id', this.userId).eq('status', 'active').neq('id', game.id)
      if (abandonError) throw abandonError
    }
    const { error } = await this.client.from('game_sessions').upsert({ id: game.id, user_id: this.userId, variant: 'mcr', assistance_mode: game.config.assistance, status: game.status, state_version: game.schemaVersion, state_json: game.game, started_at: game.startedAt, updated_at: game.savedAt, finished_at: game.status === 'active' ? null : game.savedAt, result: game.status === 'completed' ? game.game.gameState.result ?? null : null, final_score: game.status === 'completed' ? game.game.matchScores : null }, { onConflict: 'id' })
    if (error) throw error
  }
}
