import type { SupabaseClient, User, UserAttributes } from '@supabase/supabase-js'
import type { AuthService } from './AuthService.js'
import { UnavailableAuthService } from './AuthService.js'
import type { AuthAccountUpdates, AuthResult, AuthUser } from './authTypes.js'
import { getSupabaseClient } from './supabaseClient.js'

function mapUser(user: User): AuthUser {
  const displayName = typeof user.user_metadata.display_name === 'string' ? user.user_metadata.display_name : undefined
  return { id: user.id, email: user.email ?? '', ...(displayName ? { displayName } : {}) }
}

export class SupabaseAuthService implements AuthService {
  readonly configured = true
  private readonly client: SupabaseClient
  constructor(client: SupabaseClient) { this.client = client }

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data, error } = await this.client.auth.getSession()
    if (error) throw error
    return data.session?.user ? mapUser(data.session.user) : null
  }

  async signUp(email: string, password: string, displayName?: string): Promise<AuthResult> {
    const emailRedirectTo = new URL(`${import.meta.env.BASE_URL}account`, window.location.origin).toString()
    const { data, error } = await this.client.auth.signUp({ email, password, options: { emailRedirectTo, data: displayName ? { display_name: displayName } : undefined } })
    if (error) throw error
    return { user: data.session?.user ? mapUser(data.session.user) : null, requiresEmailVerification: data.session === null }
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password })
    if (error) throw error
    return mapUser(data.user)
  }

  async signOut(): Promise<void> { const { error } = await this.client.auth.signOut(); if (error) throw error }
  async resetPassword(email: string): Promise<void> {
    const redirectTo = new URL(`${import.meta.env.BASE_URL}account?reset=1`, window.location.origin).toString()
    const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw error
  }
  async updatePassword(password: string): Promise<void> { const { error } = await this.client.auth.updateUser({ password }); if (error) throw error }
  async updateAccount(updates: AuthAccountUpdates): Promise<AuthUser> {
    const attributes: UserAttributes = {}
    if (updates.email !== undefined) attributes.email = updates.email
    if (updates.displayName !== undefined) attributes.data = { display_name: updates.displayName || null }
    const { data, error } = await this.client.auth.updateUser(attributes)
    if (error) throw error
    return mapUser(data.user)
  }
  subscribe(handler: (user: AuthUser | null, event?: string) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((event, session) => handler(session?.user ? mapUser(session.user) : null, event))
    return () => data.subscription.unsubscribe()
  }
}

export function createAuthService(): AuthService {
  const client = getSupabaseClient()
  return client ? new SupabaseAuthService(client) : new UnavailableAuthService()
}
