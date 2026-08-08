import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppRoutes } from './RootApp.js'

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
