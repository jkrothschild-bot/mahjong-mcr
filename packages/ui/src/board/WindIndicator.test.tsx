import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { startMatch } from '@mahjong-mcr/engine'
import { WindIndicator } from './WindIndicator.js'

describe('WindIndicator', () => {
  it('shows the prevailing wind, round-hand index, and absolute hand number', () => {
    const matchState = { ...startMatch(1), roundHandIndex: 2 as const, matchHandNumber: 2 }
    render(<WindIndicator matchState={matchState} />)
    expect(screen.getByTestId('wind-indicator')).toHaveTextContent('East 2')
    expect(screen.getByTestId('wind-indicator')).toHaveTextContent('Hand 2 of 16')
  })
})
