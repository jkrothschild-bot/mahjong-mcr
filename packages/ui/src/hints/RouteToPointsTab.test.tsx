import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RouteToPointsPanel } from './RouteToPointsTab.js'
import {
  currentWaitsFallShortFixture,
  meldedNothingToOfferFixture,
  reachableFixture,
  sharpDisagreementFixture,
} from './routeToPointsFixtures.js'

describe('RouteToPointsPanel', () => {
  it.each([
    [reachableFixture, 'A route to 8 points is open', "There's a way to the 8-point minimum from here"],
    [currentWaitsFallShortFixture, 'Your current waits fall short', "Finishing this exact hand won't reach 8 points"],
    [sharpDisagreementFixture, 'No clear route yet', 'Too early to tell'],
  ] as const)('renders the required minimum-points status copy', (result, headline, detail) => {
    render(<RouteToPointsPanel result={result} lockedInFans={[]} />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(headline)
    expect(status).toHaveTextContent(detail)
    expect(status).not.toHaveTextContent(/cannot reach 8 points/i)
  })

  it('keeps heuristic probabilities non-numeric and distinguishes both evidence tiers', () => {
    render(<RouteToPointsPanel result={sharpDisagreementFixture} lockedInFans={[]} />)

    const measured = screen.getByTestId('route-candidate-shanten')
    const developing = screen.getAllByTestId('route-candidate-heuristic')
    expect(measured).toHaveTextContent('Measured shape')
    expect(measured).toHaveClass('border-sky-700')
    for (const row of developing) {
      expect(row).toHaveTextContent('Developing pattern')
      expect(row).toHaveClass('border-dashed', 'border-amber-800')
      expect(row).not.toHaveTextContent('%')
      expect(row.textContent).not.toMatch(/(?:0[.]22|0[.]31|22 percent|31 percent)/i)
    }
  })

  it('keeps the credible route primary and labels the aspirational ceiling separately', () => {
    render(<RouteToPointsPanel result={sharpDisagreementFixture} lockedInFans={[]} />)
    expect(screen.getByText('Current best route').closest('section')).toHaveTextContent('0 pts')
    expect(screen.getByText(/Absolute ceiling if everything breaks your way/)).toHaveTextContent('24 pts')
    expect(screen.getByText('Seven Pairs').closest('li')).toHaveTextContent('Ceiling only')
  })

  it('names the fans behind locked-in points', () => {
    render(<RouteToPointsPanel result={reachableFixture} lockedInFans={[{ fanId: 61, count: 1 }]} />)
    const locked = screen.getByRole('list', { name: 'Route locked-in fans' })
    expect(locked).toHaveTextContent('Seat Wind')
    expect(locked).toHaveTextContent('2 pts')
  })

  it('opens fan explanations from candidate and locked-in fan names', () => {
    const onFanClick = vi.fn()
    render(<RouteToPointsPanel result={sharpDisagreementFixture} lockedInFans={[{ fanId: 61, count: 1 }]} onFanClick={onFanClick} />)

    fireEvent.click(screen.getByRole('button', { name: 'Seven Pairs' }))
    expect(onFanClick).toHaveBeenLastCalledWith(19)

    fireEvent.click(screen.getByRole('button', { name: 'Seat Wind' }))
    expect(onFanClick).toHaveBeenLastCalledWith(61)
  })

  it('renders a useful neutral state when no candidate stands out', () => {
    render(<RouteToPointsPanel result={meldedNothingToOfferFixture} lockedInFans={[]} />)
    const empty = screen.getByTestId('route-candidates-empty')
    expect(empty).toHaveTextContent('No fan target stands out from this shape yet.')
    expect(empty).toHaveTextContent('Improve the hand\'s basic structure')
    expect(within(empty).queryByRole('alert')).not.toBeInTheDocument()
  })
})
