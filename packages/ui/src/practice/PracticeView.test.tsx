import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SCENARIO_LIBRARY } from '@mahjong-mcr/engine'
import { PracticeView } from './PracticeView.js'

const PRESET = SCENARIO_LIBRARY.find((p) => p.id === 'tenpai-two-sided')!

describe('PracticeView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the board and the preset label', () => {
    render(<PracticeView preset={PRESET} botSpeedMs={20} confirmBeforeDiscard={false} onExit={() => {}} />)
    expect(screen.getByText(`Practice — ${PRESET.label}`)).toBeInTheDocument()
    expect(screen.getByTestId('game-stage')).toBeInTheDocument()
  })

  it('calls onExit when "Exit practice" is clicked', () => {
    const onExit = vi.fn()
    render(<PracticeView preset={PRESET} botSpeedMs={20} confirmBeforeDiscard={false} onExit={onExit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Exit practice' }))
    expect(onExit).toHaveBeenCalledOnce()
  })

  it('does not show a result panel before the hand ends', () => {
    render(<PracticeView preset={PRESET} botSpeedMs={20} confirmBeforeDiscard={false} onExit={() => {}} />)
    expect(screen.queryByRole('dialog', { name: 'Practice hand result' })).not.toBeInTheDocument()
  })

  it('lets the human discard once it is their turn', () => {
    render(<PracticeView preset={PRESET} botSpeedMs={20} confirmBeforeDiscard={false} onExit={() => {}} />)

    // The human is never the dealer in practice mode (see usePracticeHand's
    // PRACTICE_DEALER_SEAT), so bots must play first. Double-clicking a hand
    // tile is a no-op until onRequestDiscardTile is actually wired up (only
    // once it's the human's turn — HandTiles only binds the double-click
    // handler when that prop is non-null), so poll by attempting the
    // double-click each tick and checking whether a discard actually landed
    // — avoids racing the phase transition between 'awaitingDraw'
    // (seat-0-turn already shows) and 'awaitingDiscard'. The seed is
    // randomized per PracticeView mount, so an early bot discard may
    // sometimes be legally claimable by the human (e.g. a C2/C5 for this
    // preset's two-sided wait) — always Pass on any claim prompt so the test
    // doesn't stall waiting on a declaration it never makes.
    const discards = () => screen.getByRole('list', { name: 'You discards' })
    for (let i = 0; i < 60 && discards().querySelectorAll('[role="listitem"]').length === 0; i++) {
      if (screen.queryByRole('dialog', { name: 'Practice hand result' })) return // rare: hand ended first
      const passBtn = screen.queryByRole('button', { name: 'Pass' })
      if (passBtn) fireEvent.click(passBtn)
      const hand = screen.getByRole('list', { name: 'Your hand' })
      const [firstTile] = hand.querySelectorAll('[role="listitem"]')
      if (firstTile) fireEvent.doubleClick(firstTile)
      if (discards().querySelectorAll('[role="listitem"]').length === 0) {
        act(() => {
          vi.advanceTimersByTime(20)
        })
      }
    }

    expect(discards().querySelectorAll('[role="listitem"]').length).toBeGreaterThan(0)
  })
})
