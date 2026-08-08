import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthService } from '../auth/AuthService.js'
import { AuthProvider } from '../auth/AuthContext.js'
import type { AuthUser } from '../auth/authTypes.js'
import { AccountPage } from './AccountPage.js'

const profileMocks = vi.hoisted(() => ({ saveAccountProfile: vi.fn() }))
vi.mock('../auth/supabaseProfileService.js', () => ({ profileService: { saveAccountProfile: profileMocks.saveAccountProfile } }))

const USER: AuthUser = { id: 'user-1', email: 'player@example.com', displayName: 'Player' }

function service(): AuthService {
  return {
    configured: true,
    getCurrentUser: vi.fn(async () => USER),
    signUp: vi.fn(async () => ({ user: USER, requiresEmailVerification: false })),
    signIn: vi.fn(async () => USER),
    signOut: vi.fn(async () => {}),
    resetPassword: vi.fn(async () => {}),
    updatePassword: vi.fn(async () => {}),
    updateAccount: vi.fn(async (updates) => ({ ...USER, ...updates })),
    subscribe: vi.fn(() => () => {}),
  }
}

function renderAccount(authService = service()) {
  render(
    <MemoryRouter initialEntries={['/account']}>
      <AuthProvider service={authService}>
        <Routes>
          <Route path="/account" element={<AccountPage />} />
          <Route path="/" element={<h1>Landing destination</h1>} />
          <Route path="/login" element={<h1>Login destination</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
  return authService
}

describe('AccountPage navigation', () => {
  beforeEach(() => {
    window.localStorage.clear()
    profileMocks.saveAccountProfile.mockReset().mockResolvedValue(undefined)
  })

  it('keeps account details focused and provides an explicit Home route', async () => {
    renderAccount()
    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveValue('player@example.com'))
    expect(screen.getByLabelText('Display name')).toHaveValue('Player')
    expect(screen.getByLabelText('Preferred play')).toHaveValue('learning')
    expect(screen.queryByRole('link', { name: /start|resume|continue/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Account' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Log out' })).toHaveLength(1)

    fireEvent.click(screen.getByRole('link', { name: 'Home' }))
    expect(screen.getByRole('heading', { name: 'Landing destination' })).toBeInTheDocument()
  })

  it('edits identity details and the local play preference', async () => {
    const authService = renderAccount()
    fireEvent.change(await screen.findByLabelText('Display name'), { target: { value: 'Updated Player' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'updated@example.com' } })
    fireEvent.change(screen.getByLabelText('Preferred play'), { target: { value: 'none' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(authService.updateAccount).toHaveBeenCalledWith({ email: 'updated@example.com', displayName: 'Updated Player' }))
    expect(profileMocks.saveAccountProfile).toHaveBeenCalledWith(USER.id, { displayName: 'Updated Player', preferredAssistance: 'none' })
    expect(await screen.findByRole('status')).toHaveTextContent('Account details updated.')
    expect(window.localStorage.getItem('mcr-mahjong:preferred-assistance:v1')).toBe('none')
  })

  it('keeps the branded title as an additional Home shortcut', async () => {
    renderAccount()
    fireEvent.click(await screen.findByRole('link', { name: 'MCR Mahjong Mentor home' }))
    expect(screen.getByRole('heading', { name: 'Landing destination' })).toBeInTheDocument()
  })

  it('logs out through the header and returns Home', async () => {
    const authService = renderAccount()
    await screen.findByLabelText('Email')
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
    await waitFor(() => expect(authService.signOut).toHaveBeenCalledOnce())
    expect(await screen.findByRole('heading', { name: 'Landing destination' })).toBeInTheDocument()
  })
})
