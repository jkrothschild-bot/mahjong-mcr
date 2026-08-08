import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_GAME_CONFIG } from '../app/gameConfig.js'
import type { AuthService } from '../auth/AuthService.js'
import { AuthProvider } from '../auth/AuthContext.js'
import type { AuthUser } from '../auth/authTypes.js'
import { initLoopState } from '../game/useGameLoop.js'
import type { SavedGame } from '../persistence/savedGameTypes.js'
import { LandingPage } from './LandingPage.js'

const persistenceMocks = vi.hoisted(() => ({
  guestLoad: vi.fn(),
  guestClear: vi.fn(),
  userLoad: vi.fn(),
  userClear: vi.fn(),
  factory: vi.fn(),
}))

vi.mock('../persistence/persistenceCoordinator.js', () => ({
  gamePersistenceForUser: persistenceMocks.factory,
}))

const USER: AuthUser = { id: 'user-1', email: 'player@example.com', displayName: 'Player' }
const ACTIVE_GAME: SavedGame = {
  schemaVersion: 1,
  id: 'active-session',
  status: 'active',
  startedAt: '2026-08-07T00:00:00.000Z',
  savedAt: '2026-08-07T01:00:00.000Z',
  config: DEFAULT_GAME_CONFIG,
  game: initLoopState(42),
}

function service(initialUser: AuthUser | null): AuthService {
  return {
    configured: true,
    getCurrentUser: vi.fn(async () => initialUser),
    signUp: vi.fn(async () => ({ user: USER, requiresEmailVerification: false })),
    signIn: vi.fn(async () => USER),
    signOut: vi.fn(async () => {}),
    resetPassword: vi.fn(async () => {}),
    updatePassword: vi.fn(async () => {}),
    updateAccount: vi.fn(async (updates) => ({ ...USER, ...updates })),
    subscribe: vi.fn(() => () => {}),
  }
}

function renderHome(user: AuthUser | null) {
  const authService = service(user)
  render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider service={authService}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/play" element={<h1>Play destination</h1>} />
          <Route path="/game" element={<h1>Game destination</h1>} />
          <Route path="/register" element={<h1>Register destination</h1>} />
          <Route path="/login" element={<h1>Login destination</h1>} />
          <Route path="/account" element={<h1>Account destination</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
  return authService
}

describe('LandingPage state-aware actions', () => {
  beforeEach(() => {
    window.localStorage.clear()
    persistenceMocks.guestLoad.mockReset().mockResolvedValue(null)
    persistenceMocks.guestClear.mockReset().mockResolvedValue(undefined)
    persistenceMocks.userLoad.mockReset().mockResolvedValue(null)
    persistenceMocks.userClear.mockReset().mockResolvedValue(undefined)
    persistenceMocks.factory.mockReset().mockImplementation((userId: string | null) => userId
      ? { loadActiveGame: persistenceMocks.userLoad, clearActiveGame: persistenceMocks.userClear }
      : { loadActiveGame: persistenceMocks.guestLoad, clearActiveGame: persistenceMocks.guestClear })
  })

  it('shows the new-guest actions only when no guest save exists', async () => {
    renderHome(null)
    expect((await screen.findAllByRole('link', { name: 'Start Playing Free' })).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Create Account' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: 'Resume Game' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start New Game' })).not.toBeInTheDocument()
    expect(persistenceMocks.factory).toHaveBeenCalledWith(null)
  })

  it('shows Resume, Start New and the account prompt for a returning guest', async () => {
    persistenceMocks.guestLoad.mockResolvedValue(ACTIVE_GAME)
    renderHome(null)
    expect((await screen.findAllByRole('link', { name: 'Resume Game' })).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Start New Game' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create an account to keep your progress across devices' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Start Playing Free' })).not.toBeInTheDocument()
  })

  it('shows only Start New Game for a signed-in user without a save', async () => {
    renderHome(USER)
    expect((await screen.findAllByRole('link', { name: 'Start New Game' })).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: 'Create Account' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Start Playing Free' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Account' })).toBeInTheDocument()
    expect(persistenceMocks.factory).toHaveBeenCalledWith(USER.id)
  })

  it('shows Resume and Start New for a signed-in user with an active save', async () => {
    persistenceMocks.userLoad.mockResolvedValue({ ...ACTIVE_GAME, ownerId: USER.id })
    renderHome(USER)
    expect((await screen.findAllByRole('link', { name: 'Resume Game' })).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Start New Game' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create Account' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Start Playing Free' })).not.toBeInTheDocument()
  })

  it('does not replace an active game until Start New Game is confirmed', async () => {
    persistenceMocks.guestLoad.mockResolvedValue(ACTIVE_GAME)
    renderHome(null)
    fireEvent.click(await screen.findByRole('button', { name: 'Start New Game' }))
    let dialog = screen.getByRole('dialog', { name: 'Start a new game?' })
    expect(within(dialog).getByText('Your current game will be replaced.')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(persistenceMocks.guestClear).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Start New Game' }))
    dialog = screen.getByRole('dialog', { name: 'Start a new game?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Start New Game' }))
    await waitFor(() => expect(persistenceMocks.guestClear).toHaveBeenCalledOnce())
    expect(await screen.findByRole('heading', { name: 'Play destination' })).toBeInTheDocument()
  })

  it('re-evaluates guest persistence after logout', async () => {
    persistenceMocks.guestLoad.mockResolvedValue(ACTIVE_GAME)
    const authService = renderHome(USER)
    await screen.findAllByRole('link', { name: 'Start New Game' })
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
    await waitFor(() => expect(authService.signOut).toHaveBeenCalledOnce())
    expect((await screen.findAllByRole('link', { name: 'Resume Game' })).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: 'Account' })).not.toBeInTheDocument()
  })
})
