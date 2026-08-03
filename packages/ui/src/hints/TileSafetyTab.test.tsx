import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { startHand, type GameState } from '@mahjong-mcr/engine'
import { DEFAULT_SETTINGS } from '../settings/useSettings.js'
import { SettingsContext } from '../settings/SettingsContext.js'
import { TileSafetyTab } from './TileSafetyTab.js'

function baseState(): GameState {
  return startHand({ seed: 1, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
}

describe('TileSafetyTab', () => {
  it('prompts to pick a tile when nothing is selected', () => {
    render(<TileSafetyTab state={baseState()} forSeat={0} selectedTypeId={null} />)
    expect(screen.getByText(/Tap any tile/)).toBeInTheDocument()
  })

  it('shows the unseen count and a safety rating once a tile type is selected', () => {
    render(<TileSafetyTab state={baseState()} forSeat={0} selectedTypeId="C5" />)
    expect(screen.getByText(/unseen of 4/)).toBeInTheDocument()
    const rating = screen.getByTestId('tile-safety-rating')
    expect(rating).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Safety reasons' })).toBeInTheDocument()
  })

  // The colour-blind palette (an Okabe-Ito alternative triad, reached via a
  // setting) was removed, leaving only the red/amber/emerald triad — a
  // red-green pair that deuteranopes and protanopes cannot separate. The
  // text label is therefore the only channel carrying the danger level for
  // those users, so it has to stay: this asserts the rating is never
  // colour-only. See TileSafetyTab.tsx's own note.
  it('always states the danger level in words, not colour alone', () => {
    render(
      <SettingsContext.Provider value={DEFAULT_SETTINGS}>
        <TileSafetyTab state={baseState()} forSeat={0} selectedTypeId="C5" />
      </SettingsContext.Provider>,
    )
    expect(screen.getByTestId('tile-safety-rating').textContent).toMatch(/(Low|Medium|High) risk/)
  })
})
