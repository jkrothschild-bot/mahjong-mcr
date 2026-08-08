import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_GAME_CONFIG } from '../app/gameConfig.js'
import type { AuthService } from '../auth/AuthService.js'
import { AuthProvider } from '../auth/AuthContext.js'
import { initLoopState } from '../game/useGameLoop.js'
import type { SavedGame } from '../persistence/savedGameTypes.js'
import { PlayPage } from './PlayPage.js'

const persistenceMocks = vi.hoisted(() => ({ loadActiveGame: vi.fn(), clearActiveGame: vi.fn() }))
vi.mock('../persistence/persistenceCoordinator.js', () => ({
  gamePersistenceForUser: () => ({ loadActiveGame: persistenceMocks.loadActiveGame, clearActiveGame: persistenceMocks.clearActiveGame }),
}))

const ACTIVE_GAME: SavedGame = { schemaVersion: 1, id: 'active-session', status: 'active', startedAt: '2026-08-07T00:00:00.000Z', savedAt: '2026-08-07T01:00:00.000Z', config: DEFAULT_GAME_CONFIG, game: initLoopState(42) }

const authService: AuthService = {
  configured: true,
  getCurrentUser: vi.fn(async () => null),
  signUp: vi.fn(async () => ({ user: null, requiresEmailVerification: false })),
  signIn: vi.fn(async () => { throw new Error('not used') }),
  signOut: vi.fn(async () => {}),
  resetPassword: vi.fn(async () => {}),
  updatePassword: vi.fn(async () => {}),
  updateAccount: vi.fn(async (updates) => ({ id: 'user-1', email: updates.email ?? 'player@example.com', ...(updates.displayName !== undefined ? { displayName: updates.displayName } : {}) })),
  subscribe: vi.fn(() => () => {}),
}

function renderPlay() {
  render(<MemoryRouter initialEntries={['/play']}><AuthProvider service={authService}><Routes><Route path="/play" element={<PlayPage />} /><Route path="/game" element={<h1>Game destination</h1>} /></Routes></AuthProvider></MemoryRouter>)
}

describe('PlayPage new-game guard', () => {
  beforeEach(() => {
    persistenceMocks.loadActiveGame.mockReset().mockResolvedValue(ACTIVE_GAME)
    persistenceMocks.clearActiveGame.mockReset().mockResolvedValue(undefined)
  })

  it('preserves an existing session until replacement is confirmed', async () => {
    renderPlay()
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }))
    let dialog = await screen.findByRole('dialog', { name: 'Start a new game?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(persistenceMocks.clearActiveGame).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }))
    dialog = await screen.findByRole('dialog', { name: 'Start a new game?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Start New Game' }))
    await waitFor(() => expect(persistenceMocks.clearActiveGame).toHaveBeenCalledOnce())
    expect(await screen.findByRole('heading', { name: 'Game destination' })).toBeInTheDocument()
  })
})
