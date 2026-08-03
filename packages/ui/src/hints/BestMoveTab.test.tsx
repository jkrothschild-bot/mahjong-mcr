import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { emptyHand, TILE_TYPE_BY_ID, typeIdOfInstance, type Hand, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
import { BestMoveTab, dedupeAlternatives } from './BestMoveTab.js'

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function handWith(concealedTiles: TileInstanceId[]): Hand {
  return { ...emptyHand(), concealedTiles }
}

// Same "one obviously-correct discard" shape used in the engine's own
// hints.test.ts: tenpai-13 (waiting on C2/C5) plus one isolated North Wind.
function tenpaiPlusIsolated(): TileInstanceId[] {
  return [
    ...idsFor('C3', 1),
    ...idsFor('C4', 1),
    ...idsFor('D4', 1),
    ...idsFor('D5', 1),
    ...idsFor('D6', 1),
    ...idsFor('B7', 1),
    ...idsFor('B8', 1),
    ...idsFor('B9', 1),
    ...idsFor('DW', 3),
    ...idsFor('C9', 2),
    ...idsFor('WN', 1),
  ]
}

describe('BestMoveTab', () => {
  it('recommends discarding the isolated North Wind, with a headline', () => {
    render(<BestMoveTab hand={handWith(tenpaiPlusIsolated())} />)
    expect(screen.getByText(/Discard North Wind/)).toBeInTheDocument()
    expect(screen.getByText(/Completes your wait/)).toBeInTheDocument()
  })

  it('shows a numbered "why" feature list', () => {
    render(<BestMoveTab hand={handWith(tenpaiPlusIsolated())} />)
    expect(screen.getByText('It has no support')).toBeInTheDocument()
  })

  it('shows the route table with Standard at Tenpai and a non-viable special shape dimmed', () => {
    render(<BestMoveTab hand={handWith(tenpaiPlusIsolated())} />)
    const routeList = screen.getByRole('list', { name: 'Route table' })
    expect(routeList).toHaveTextContent('Standard')
    expect(routeList).toHaveTextContent('Tenpai')
    expect(routeList).toHaveTextContent('Seven Pairs')
  })

  it('shows a confidence chip', () => {
    render(<BestMoveTab hand={handWith(tenpaiPlusIsolated())} />)
    // The isolated North Wind is the UNIQUE way to stay at shanten 0 — no
    // second candidate, so confidence is 100%.
    expect(screen.getByTestId('best-move-confidence')).toHaveTextContent('100% confidence')
  })

  it('shows no alternatives list when the recommended discard is uniquely best', () => {
    render(<BestMoveTab hand={handWith(tenpaiPlusIsolated())} />)
    expect(screen.queryByRole('list', { name: 'Other reasonable discards' })).not.toBeInTheDocument()
  })

  // The KICKOFF-phase10 live hand: several isolated tiles tie for best,
  // including three physical copies of 2C among the (worse) alternatives —
  // exercises alternatives' dedup/cap and the low-confidence chip wording,
  // all three ux-reviewer findings from Stage 1f's own verification pass.
  function kickoffLiveHand(): TileInstanceId[] {
    return [
      ...idsFor('C1', 1), ...idsFor('C2', 3), ...idsFor('C6', 1), ...idsFor('C9', 1),
      ...idsFor('D4', 1),
      ...idsFor('B3', 1), ...idsFor('B5', 2), ...idsFor('B8', 1),
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WN', 1),
    ]
  }

  it('shows alternatives with a relative percentage when several candidates tie', () => {
    render(<BestMoveTab hand={handWith(kickoffLiveHand())} />)
    const list = screen.getByRole('list', { name: 'Other reasonable discards' })
    expect(list.querySelectorAll('[role="listitem"]').length).toBeGreaterThan(0)
    expect(list).toHaveTextContent('%')
  })

  it('dedupeAlternatives collapses consecutive same-type entries into one card with a ×N count', () => {
    // rankDiscards' comparator ties same-type tiles exactly (they always
    // evaluate identically), so equal-type runs are always contiguous —
    // exercised directly here rather than through a specific hand, since the
    // KICKOFF live hand's own duplicate (three 2C copies) happens to fall
    // below the 6-item display cap and so isn't visible in the rendered DOM.
    const [c2a, c2b] = idsFor('C2', 2)
    const [we] = idsFor('WE', 1)
    const deduped = dedupeAlternatives([
      { tile: c2a!, relativeScore: 0.9 },
      { tile: c2b!, relativeScore: 0.9 }, // same type, adjacent — must collapse
      { tile: we!, relativeScore: 0.5 },
    ])
    expect(deduped).toEqual([
      { typeId: 'C2', relativeScore: 0.9, count: 2 },
      { typeId: 'WE', relativeScore: 0.5, count: 1 },
    ])
  })

  it('caps the alternatives list and notes how many more there were, rather than overflowing', () => {
    render(<BestMoveTab hand={handWith(kickoffLiveHand())} />)
    const list = screen.getByRole('list', { name: 'Other reasonable discards' })
    // 9 distinct alternative types tie in this hand — more than the 6-card
    // cap, so the list itself must stay capped and say "+N more".
    expect(list.querySelectorAll('[role="listitem"]').length).toBeLessThanOrEqual(6)
    expect(screen.getByText(/\+\d+ more/)).toBeInTheDocument()
  })

  it('shows a qualitative "close call" label instead of a bare 0% when candidates are genuinely tied', () => {
    render(<BestMoveTab hand={handWith(kickoffLiveHand())} />)
    const chip = screen.getByTestId('best-move-confidence')
    expect(chip).toHaveTextContent('Close call among ties')
    expect(chip).not.toHaveTextContent('0%')
  })

  it('shows a message when there is no discard decision to make', () => {
    render(<BestMoveTab hand={handWith([])} />)
    expect(screen.getByText(/No discard decision/)).toBeInTheDocument()
  })
})
