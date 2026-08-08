/* oxlint-disable react/only-export-components -- Provider and its hook intentionally share one context module. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createAuthService } from './supabaseAuthService.js'
import type { AuthService } from './AuthService.js'
import type { AuthAccountUpdates, AuthResult, AuthUser } from './authTypes.js'

export interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  configured: boolean
  configurationMessage?: string
  passwordRecovery: boolean
  signUp(email: string, password: string, displayName?: string): Promise<AuthResult>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  resetPassword(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
  updateAccount(updates: AuthAccountUpdates): Promise<AuthUser>
}

const defaultService = createAuthService()
const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: false,
  configured: false,
  configurationMessage: defaultService.configurationMessage,
  passwordRecovery: false,
  async signUp(email, password, displayName) { return defaultService.signUp(email, password, displayName) },
  async signIn(email, password) { await defaultService.signIn(email, password) },
  async signOut() { await defaultService.signOut() },
  async resetPassword(email) { await defaultService.resetPassword(email) },
  async updatePassword(password) { await defaultService.updatePassword(password) },
  async updateAccount(updates) { return defaultService.updateAccount(updates) },
})

export function AuthProvider({ children, service = defaultService }: { children: ReactNode; service?: AuthService }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    let active = true
    void service.getCurrentUser().then((next) => { if (active) setUser(next) }).catch(() => {}).finally(() => { if (active) setLoading(false) })
    const unsubscribe = service.subscribe((next, event) => { setUser(next); setLoading(false); if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true) })
    return () => { active = false; unsubscribe() }
  }, [service])

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => { const result = await service.signUp(email, password, displayName); if (result.user) setUser(result.user); return result }, [service])
  const signIn = useCallback(async (email: string, password: string) => { setUser(await service.signIn(email, password)) }, [service])
  const signOut = useCallback(async () => { await service.signOut(); setUser(null) }, [service])
  const resetPassword = useCallback((email: string) => service.resetPassword(email), [service])
  const updatePassword = useCallback(async (password: string) => { await service.updatePassword(password); setPasswordRecovery(false) }, [service])
  const updateAccount = useCallback(async (updates: AuthAccountUpdates) => { const next = await service.updateAccount(updates); setUser(next); return next }, [service])

  const value = useMemo<AuthContextValue>(() => ({ user, loading, configured: service.configured, configurationMessage: service.configurationMessage, passwordRecovery, signUp, signIn, signOut, resetPassword, updatePassword, updateAccount }), [user, loading, service, passwordRecovery, signUp, signIn, signOut, resetPassword, updatePassword, updateAccount])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue { return useContext(AuthContext) }
