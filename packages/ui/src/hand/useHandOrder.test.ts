import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
import { useHandOrder } from './useHandOrder.js'

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

describe('useHandOrder', () => {
  it('initializes order from the engine tiles', () => {
    const engineTiles = [...idsFor('C1', 1), ...idsFor('C2', 1)]
    const { result } = renderHook(() => useHandOrder(engineTiles))
    expect(result.current.order).toEqual(engineTiles)
  })

  it('sort reorders the display order without touching the engine array reference', () => {
    const [we] = idsFor('WE', 1)
    const [c5] = idsFor('C5', 1)
    const engineTiles = [we!, c5!]
    const { result } = renderHook(() => useHandOrder(engineTiles))

    act(() => result.current.sort('suit'))

    expect(result.current.order.map(typeIdOfInstance)).toEqual(['C5', 'WE'])
    expect(engineTiles).toEqual([we, c5]) // untouched — sorting is purely visual
  })

  it('reconciles the display order when engineTiles changes (e.g. a future draw/discard)', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const [c3] = idsFor('C3', 1)
    const { result, rerender } = renderHook(({ tiles }) => useHandOrder(tiles), {
      initialProps: { tiles: [c1!, c2!] },
    })

    act(() => result.current.sort('suit')) // arbitrary manual arrangement to prove it survives
    rerender({ tiles: [c1!, c3!] }) // c2 discarded, c3 drawn

    expect(result.current.order).toEqual([c1, c3])
  })

  it('reorder moves a tile via drag semantics', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const [c3] = idsFor('C3', 1)
    const engineTiles = [c1!, c2!, c3!]
    const { result } = renderHook(() => useHandOrder(engineTiles))

    act(() => result.current.reorder(c3!, c1!))

    expect(result.current.order).toEqual([c3, c1, c2])
  })
})
