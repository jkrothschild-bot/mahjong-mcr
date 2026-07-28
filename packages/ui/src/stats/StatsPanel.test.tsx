import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_STATS, type SessionStats } from './sessionStats.js'
import { StatsPanel } from './StatsPanel.js'

describe('StatsPanel', () => {
  it('renders nothing when closed', () => {
    render(<StatsPanel open={false} stats={EMPTY_STATS} onClose={() => {}} />)
    expect(screen.queryByRole('dialog', { name: 'Session stats' })).not.toBeInTheDocument()
  })

  it('shows placeholders when nothing has been played yet', () => {
    render(<StatsPanel open stats={EMPTY_STATS} onClose={() => {}} />)
    expect(screen.getByTestId('stats-hands-played')).toHaveTextContent('0')
    expect(screen.getByTestId('stats-win-rate')).toHaveTextContent('—')
    expect(screen.getByTestId('stats-avg-points')).toHaveTextContent('—')
    expect(screen.getByTestId('stats-deal-in-rate')).toHaveTextContent('—')
    expect(screen.getByText('No wins yet this session.')).toBeInTheDocument()
  })

  it('computes rates and shows top fans completed by real name', () => {
    const stats: SessionStats = {
      handsPlayed: 4,
      wins: 2,
      totalPointsWon: 40,
      dealIns: 1,
      winsByFan: { 6: 1, 81: 3 }, // 6 = Seven Shifted Pairs, 81 = Flower Tiles
    }
    render(<StatsPanel open stats={stats} onClose={() => {}} />)

    expect(screen.getByTestId('stats-hands-played')).toHaveTextContent('4')
    expect(screen.getByTestId('stats-win-rate')).toHaveTextContent('50%')
    expect(screen.getByTestId('stats-avg-points')).toHaveTextContent('20.0')
    expect(screen.getByTestId('stats-deal-in-rate')).toHaveTextContent('25%')

    const list = screen.getByRole('list', { name: 'Top fans completed' })
    expect(list).toHaveTextContent('Flower Tiles')
    expect(list).toHaveTextContent('Seven Shifted Pairs')
  })

  it('calls onClose when the Close button is clicked', () => {
    const onClose = vi.fn()
    render(<StatsPanel open stats={EMPTY_STATS} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
