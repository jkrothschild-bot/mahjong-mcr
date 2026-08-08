import type { AuthAccountUpdates, AuthChangeHandler, AuthResult, AuthUser } from './authTypes.js'

export interface AuthService {
  readonly configured: boolean
  readonly configurationMessage?: string
  getCurrentUser(): Promise<AuthUser | null>
  signUp(email: string, password: string, displayName?: string): Promise<AuthResult>
  signIn(email: string, password: string): Promise<AuthUser>
  signOut(): Promise<void>
  resetPassword(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
  updateAccount(updates: AuthAccountUpdates): Promise<AuthUser>
  subscribe(handler: AuthChangeHandler): () => void
}

export const MISSING_SUPABASE_MESSAGE = 'Accounts are unavailable in this build. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable Supabase authentication.'

export class UnavailableAuthService implements AuthService {
  readonly configured = false
  readonly configurationMessage = MISSING_SUPABASE_MESSAGE
  async getCurrentUser(): Promise<null> { return null }
  async signUp(): Promise<AuthResult> { throw new Error(this.configurationMessage) }
  async signIn(): Promise<AuthUser> { throw new Error(this.configurationMessage) }
  async signOut(): Promise<void> {}
  async resetPassword(): Promise<void> { throw new Error(this.configurationMessage) }
  async updatePassword(): Promise<void> { throw new Error(this.configurationMessage) }
  async updateAccount(): Promise<AuthUser> { throw new Error(this.configurationMessage) }
  subscribe(): () => void { return () => {} }
}
