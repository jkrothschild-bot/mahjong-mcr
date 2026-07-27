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
  it('defaults a freshly dealt hand to suit-sorted order, not raw deal order', () => {
    const [we] = idsFor('WE', 1)
    const [c5] = idsFor('C5', 1)
    const engineTiles = [we!, c5!] // deal order: WE then C5
    const { result } = renderHook(() => useHandOrder(engineTiles, 1))

    expect(result.current.order.map(typeIdOfInstance)).toEqual(['C5', 'WE']) // suit-sorted
  })

  it('sort reorders the display order without touching the engine array reference', () => {
    const [we] = idsFor('WE', 1)
    const [c5] = idsFor('C5', 1)
    const engineTiles = [c5!, we!]
    const { result } = renderHook(() => useHandOrder(engineTiles, 1))

    act(() => result.current.sort('number'))

    expect(result.current.order.map(typeIdOfInstance)).toEqual(['C5', 'WE'])
    expect(engineTiles).toEqual([c5, we]) // untouched — sorting is purely visual
  })

  it("reconciles the display order (preserving the player's own arrangement) when engineTiles changes within the same hand", () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const [c3] = idsFor('C3', 1)
    const { result, rerender } = renderHook(({ tiles }) => useHandOrder(tiles, 1), {
      initialProps: { tiles: [c1!, c2!] },
    })

    act(() => result.current.reorder(c2!, c1!)) // manually flip the pair, proving it survives
    expect(result.current.order).toEqual([c2, c1])

    rerender({ tiles: [c1!, c3!] }) // c2 discarded, c3 drawn — same hand (handNumber unchanged)

    expect(result.current.order).toEqual([c1, c3]) // c2 dropped, c3 appended; c1's position kept
  })

  it('resets to a fresh suit-sort when handNumber changes (a new deal), instead of reconciling against the old hand', () => {
    const [c1] = idsFor('C1', 1)
    const [we] = idsFor('WE', 1)
    const [c5] = idsFor('C5', 1)
    const [ws] = idsFor('WS', 1)
    const { result, rerender } = renderHook(({ tiles, handNumber }) => useHandOrder(tiles, handNumber), {
      initialProps: { tiles: [c1!, we!], handNumber: 1 },
    })

    act(() => result.current.reorder(we!, c1!)) // scramble hand 1's order
    expect(result.current.order).toEqual([we, c1])

    rerender({ tiles: [ws!, c5!], handNumber: 2 }) // entirely new hand's deal

    expect(result.current.order.map(typeIdOfInstance)).toEqual(['C5', 'WS']) // fresh suit-sort, not raw [ws, c5]
  })

  it('reorder moves a tile via drag semantics', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const [c3] = idsFor('C3', 1)
    const engineTiles = [c1!, c2!, c3!]
    const { result } = renderHook(() => useHandOrder(engineTiles, 1))

    act(() => result.current.reorder(c3!, c1!))

    expect(result.current.order).toEqual([c3, c1, c2])
  })
})
