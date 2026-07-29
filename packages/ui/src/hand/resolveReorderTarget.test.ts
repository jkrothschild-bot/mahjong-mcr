import { describe, expect, it } from 'vitest'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
import { END_ZONE_ID, resolveReorderTarget } from './resolveReorderTarget.js'

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

describe('resolveReorderTarget', () => {
  it('moving a tile earlier in the order lands it right before the drop target', () => {
    const [a, b, c, d] = idsFor('C1', 4)
    const order = [a!, b!, c!, d!]
    // Drag d onto b: matches arrayMove(order, 3, 1) => [a, d, b, c].
    expect(resolveReorderTarget(order, d!, b!)).toBe(b)
  })

  it('moving a tile later in the order lands it right before whatever ends up after it', () => {
    const [a, b, c, d] = idsFor('C1', 4)
    const order = [a!, b!, c!, d!]
    // Drag a onto c: matches arrayMove(order, 0, 2) => [b, c, a, d].
    expect(resolveReorderTarget(order, a!, c!)).toBe(d)
  })

  it('dropping on the trailing end zone moves the tile to the end (beforeId null)', () => {
    const [a, b] = idsFor('C1', 2)
    const order = [a!, b!]
    expect(resolveReorderTarget(order, a!, END_ZONE_ID)).toBeNull()
  })

  it('dropping a tile on itself is a no-op', () => {
    const [a, b] = idsFor('C1', 2)
    const order = [a!, b!]
    expect(resolveReorderTarget(order, a!, a!)).toBeUndefined()
  })

  it('is a no-op if either id is not present in the order (stale event)', () => {
    const [a, b, stale] = idsFor('C1', 3)
    const order = [a!, b!]
    expect(resolveReorderTarget(order, a!, stale!)).toBeUndefined()
    expect(resolveReorderTarget(order, stale!, a!)).toBeUndefined()
  })
})
