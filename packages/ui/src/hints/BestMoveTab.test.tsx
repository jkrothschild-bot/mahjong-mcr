import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { emptyHand, TILE_TYPE_BY_ID, typeIdOfInstance, type Hand, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
import { BestMoveTab } from './BestMoveTab.js'

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
  it('recommends discarding the isolated North Wind, with a reason', () => {
    render(<BestMoveTab hand={handWith(tenpaiPlusIsolated())} />)
    expect(screen.getByText(/Discard North Wind/)).toBeInTheDocument()
    expect(screen.getByText(/tenpai/)).toBeInTheDocument()
  })

  it('shows no alternatives list when the recommended discard is uniquely best', () => {
    render(<BestMoveTab hand={handWith(tenpaiPlusIsolated())} />)
    expect(screen.queryByRole('list', { name: 'Other reasonable discards' })).not.toBeInTheDocument()
  })

  it('shows a message when there is no discard decision to make', () => {
    render(<BestMoveTab hand={handWith([])} />)
    expect(screen.getByText(/No discard decision/)).toBeInTheDocument()
  })
})
