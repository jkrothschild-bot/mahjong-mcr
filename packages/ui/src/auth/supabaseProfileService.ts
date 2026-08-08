import type { GameConfig } from '../app/gameConfig.js'
import type { ProfileService } from './ProfileService.js'
import { getSupabaseClient } from './supabaseClient.js'

class SupabaseProfileService implements ProfileService {
  async savePreferredAssistance(userId: string, assistance: GameConfig['assistance']): Promise<void> {
    const client = getSupabaseClient()
    if (!client) return
    const { error } = await client.from('profiles').upsert({ id: userId, preferred_assistance: assistance, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    if (error) throw error
  }

  async saveAccountProfile(userId: string, profile: { displayName: string | null; preferredAssistance: GameConfig['assistance'] }): Promise<void> {
    const client = getSupabaseClient()
    if (!client) return
    const { error } = await client.from('profiles').upsert({ id: userId, display_name: profile.displayName, preferred_assistance: profile.preferredAssistance, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    if (error) throw error
  }
}

export const profileService: ProfileService = new SupabaseProfileService()
