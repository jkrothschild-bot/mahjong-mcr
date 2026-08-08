export interface AuthUser {
  id: string
  email: string
  displayName?: string
}

export interface AuthResult {
  user: AuthUser | null
  requiresEmailVerification: boolean
}

export interface AuthAccountUpdates {
  email?: string
  displayName?: string
}

export type AuthChangeHandler = (user: AuthUser | null, event?: string) => void
