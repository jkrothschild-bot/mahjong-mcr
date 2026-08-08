import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DiscardHint } from './DiscardHint.js'

describe('DiscardHint', () => {
  it('names both discard gestures — the whole point of the cue', () => {
    render(<DiscardHint visible />)
    const hint = screen.getByTestId('discard-hint')
    expect(hint.textContent).toMatch(/double-click/i)
    expect(hint.textContent).toMatch(/drag/i)
    expect(hint).toHaveTextContent('Tiles can be moved around your hand, using drag and drop.')
  })

  it('renders nothing once the player has discarded', () => {
    render(<DiscardHint visible={false} />)
    expect(screen.queryByTestId('discard-hint')).not.toBeInTheDocument()
  })

  it('never swallows a pointer event aimed at the tiles behind it', () => {
    render(<DiscardHint visible />)
    expect(screen.getByTestId('discard-hint').className).toContain('pointer-events-none')
  })
})
