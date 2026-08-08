import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { AuthService } from './AuthService.js'
import { AuthProvider, useAuth } from './AuthContext.js'
import type { AuthUser } from './authTypes.js'

const USER: AuthUser = { id: 'user-1', email: 'player@example.com', displayName: 'Player' }

function service(initial: AuthUser | null = null): AuthService {
  return {
    configured: true,
    getCurrentUser: vi.fn(async () => initial),
    signUp: vi.fn(async () => ({ user: USER, requiresEmailVerification: false })),
    signIn: vi.fn(async () => USER),
    signOut: vi.fn(async () => {}),
    resetPassword: vi.fn(async () => {}),
    updatePassword: vi.fn(async () => {}),
    updateAccount: vi.fn(async (updates) => ({ ...USER, ...updates })),
    subscribe: vi.fn(() => () => {}),
  }
}

function wrapper(authService: AuthService) {
  return ({ children }: { children: ReactNode }) => <AuthProvider service={authService}>{children}</AuthProvider>
}

describe('AuthProvider', () => {
  it('restores logged-out and logged-in browser sessions', async () => {
    const loggedOut = renderHook(() => useAuth(), { wrapper: wrapper(service()) })
    await waitFor(() => expect(loggedOut.result.current.loading).toBe(false))
    expect(loggedOut.result.current.user).toBeNull()
    const loggedIn = renderHook(() => useAuth(), { wrapper: wrapper(service(USER)) })
    await waitFor(() => expect(loggedIn.result.current.user).toEqual(USER))
  })

  it('supports login and logout through the service boundary', async () => {
    const mock = service()
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(mock) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(() => result.current.signIn('player@example.com', 'password'))
    expect(result.current.user).toEqual(USER)
    await act(() => result.current.updateAccount({ email: 'updated@example.com', displayName: 'Updated Player' }))
    expect(result.current.user).toMatchObject({ email: 'updated@example.com', displayName: 'Updated Player' })
    await act(() => result.current.signOut())
    expect(result.current.user).toBeNull()
  })

  it('preserves registration and login errors for the UI to handle', async () => {
    const mock = service()
    vi.mocked(mock.signUp).mockRejectedValueOnce(new Error('registration failed'))
    vi.mocked(mock.signIn).mockRejectedValueOnce(new Error('login failed'))
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(mock) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(result.current.signUp('x@example.com', 'password')).rejects.toThrow('registration failed')
    await expect(result.current.signIn('x@example.com', 'password')).rejects.toThrow('login failed')
  })
})
