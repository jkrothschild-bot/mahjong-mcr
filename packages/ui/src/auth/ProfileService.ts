import type { GameConfig } from '../app/gameConfig.js'

export interface ProfileService {
  savePreferredAssistance(userId: string, assistance: GameConfig['assistance']): Promise<void>
  saveAccountProfile(userId: string, profile: { displayName: string | null; preferredAssistance: GameConfig['assistance'] }): Promise<void>
}
