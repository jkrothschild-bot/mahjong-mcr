import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SoundEffectsPlayer } from '../audio/soundEffects.js'
import { AppRoutes, SoundUnlockBoundary } from './RootApp.js'

function renderAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>)
}

describe('application routes', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('loads the public landing page at /', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Learn Mahjong by actually playing it' })).toBeInTheDocument()
  })

  it('loads the assistance choice at /play', () => {
    renderAt('/play')
    expect(screen.getByRole('heading', { name: 'How would you like to play?' })).toBeInTheDocument()
    expect(screen.getByLabelText('Learning Mode')).toBeChecked()
  })

  it('redirects /game without a config or saved session to /play', async () => {
    renderAt('/game')
    await waitFor(() => expect(screen.getByRole('heading', { name: 'How would you like to play?' })).toBeInTheDocument())
  })

  it.each([['/login', 'Log in'], ['/register', 'Create your account']])('renders %s', (path, heading) => {
    renderAt(path)
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })
})

describe('SoundUnlockBoundary', () => {
  beforeEach(() => window.localStorage.clear())

  it('unlocks audio and iPad speech from the landing-page pointer gesture', () => {
    const player: SoundEffectsPlayer = { unlock: vi.fn(), play: vi.fn(), speakCall: vi.fn(), cancelSpeech: vi.fn() }
    render(<SoundUnlockBoundary player={player}><button type="button">Start</button></SoundUnlockBoundary>)

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Start' }))

    expect(player.unlock).toHaveBeenCalledTimes(1)
  })

  it('does not initialize speech when sound effects are disabled', () => {
    window.localStorage.setItem('mcr-mahjong:settings:v1', JSON.stringify({ soundEffects: false }))
    const player: SoundEffectsPlayer = { unlock: vi.fn(), play: vi.fn(), speakCall: vi.fn(), cancelSpeech: vi.fn() }
    render(<SoundUnlockBoundary player={player}><button type="button">Start</button></SoundUnlockBoundary>)

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Start' }))

    expect(player.unlock).not.toHaveBeenCalled()
  })
})
