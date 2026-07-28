import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { startHand, type GameState } from '@mahjong-mcr/engine'
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
})
