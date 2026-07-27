import { describe, expect, it } from 'vitest'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
import { moveTileBefore, reconcileOrder, sortByMode, sortKey } from './handOrder.js'

// Same idsFor pattern already used throughout packages/engine/src/scoring/*.test.ts.
function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

describe('reconcileOrder', () => {
  it('bootstraps an empty display order from the engine tiles', () => {
    const engine = [...idsFor('C1', 1), ...idsFor('C2', 1)]
    expect(reconcileOrder([], engine)).toEqual(engine)
  })

  it('preserves the existing relative order of surviving tiles', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const [c3] = idsFor('C3', 1)
    const display = [c3!, c1!, c2!] // deliberately out of engine order
    const engine = [c1!, c2!, c3!]
    expect(reconcileOrder(display, engine)).toEqual([c3, c1, c2])
  })

  it('appends newly-drawn tiles in the engine array\'s own order', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const [c3] = idsFor('C3', 1)
    const display = [c1!]
    const engine = [c1!, c2!, c3!] // c2, c3 are new
    expect(reconcileOrder(display, engine)).toEqual([c1, c2, c3])
  })

  it('drops tiles no longer present (e.g. discarded)', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const [c3] = idsFor('C3', 1)
    const display = [c1!, c2!, c3!]
    const engine = [c1!, c3!] // c2 discarded
    expect(reconcileOrder(display, engine)).toEqual([c1, c3])
  })

  it('is idempotent', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const display = [c2!, c1!]
    const engine = [c1!, c2!]
    const once = reconcileOrder(display, engine)
    const twice = reconcileOrder(once, engine)
    expect(twice).toEqual(once)
  })
})

describe('sortKey', () => {
  it('orders suit mode as C < D < B < honors, ascending rank, winds before dragons', () => {
    const keys = {
      c5: sortKey('suit', 'C5'),
      d3: sortKey('suit', 'D3'),
      b9: sortKey('suit', 'B9'),
      we: sortKey('suit', 'WE'),
      dr: sortKey('suit', 'DR'),
    }
    expect(keys.c5[0]).toBeLessThan(keys.d3[0]!)
    expect(keys.d3[0]).toBeLessThan(keys.b9[0]!)
    expect(keys.b9[0]).toBeLessThan(keys.we[0]!)
    expect(keys.we[0]).toBe(keys.dr[0]) // both honors, same suitIndex
    expect(keys.we[1]).toBeLessThan(keys.dr[1]!) // wind rank < dragon rank
  })

  it('orders number mode by rank across suits before honors', () => {
    const c5 = sortKey('number', 'C5')
    const d5 = sortKey('number', 'D5')
    const b1 = sortKey('number', 'B1')
    const we = sortKey('number', 'WE')
    expect(c5[0]).toBe(d5[0]) // same rank, different suit
    expect(b1[0]).toBeLessThan(c5[0]!)
    expect(c5[0]).toBeLessThan(we[0]!) // honors sort after all numeric ranks
  })

  it('orders honors mode with honors first', () => {
    expect(sortKey('honors', 'WE')[0]).toBe(0)
    expect(sortKey('honors', 'C1')[0]).toBe(1)
  })

  it('orders simples mode as simples(2-8), then terminals(1,9), then honors', () => {
    expect(sortKey('simples', 'C5')[0]).toBe(0)
    expect(sortKey('simples', 'C1')[0]).toBe(1)
    expect(sortKey('simples', 'C9')[0]).toBe(1)
    expect(sortKey('simples', 'WE')[0]).toBe(2)
  })

  it('orders odds mode as odd ranks, then even ranks, then honors', () => {
    expect(sortKey('odds', 'C1')[0]).toBe(0)
    expect(sortKey('odds', 'C2')[0]).toBe(1)
    expect(sortKey('odds', 'WE')[0]).toBe(2)
  })

  it('orders evens mode as even ranks, then odd ranks, then honors', () => {
    expect(sortKey('evens', 'C2')[0]).toBe(0)
    expect(sortKey('evens', 'C1')[0]).toBe(1)
    expect(sortKey('evens', 'WE')[0]).toBe(2)
  })
})

describe('sortByMode', () => {
  it('sorts a mixed hand by suit', () => {
    const [we] = idsFor('WE', 1)
    const [c5] = idsFor('C5', 1)
    const [b2] = idsFor('B2', 1)
    const [d9] = idsFor('D9', 1)
    const order = [we!, c5!, b2!, d9!]
    const sorted = sortByMode(order, 'suit').map(typeIdOfInstance)
    expect(sorted).toEqual(['C5', 'D9', 'B2', 'WE'])
  })

  it('is a no-op when re-sorting by the same mode twice', () => {
    const [we] = idsFor('WE', 1)
    const [c5] = idsFor('C5', 1)
    const order = [we!, c5!]
    const once = sortByMode(order, 'suit')
    const twice = sortByMode(once, 'suit')
    expect(twice).toEqual(once)
  })

  it('preserves the relative order of duplicate tile types (stable sort)', () => {
    // Two distinct physical copies of the same type, fed in a specific order.
    const [c5a, c5b] = idsFor('C5', 2)
    const order = [c5b!, c5a!]
    const sorted = sortByMode(order, 'suit')
    expect(sorted).toEqual([c5b, c5a])
  })

  it('does not mutate the input array', () => {
    const [we] = idsFor('WE', 1)
    const [c5] = idsFor('C5', 1)
    const order = [we!, c5!]
    const copy = [...order]
    sortByMode(order, 'suit')
    expect(order).toEqual(copy)
  })
})

describe('moveTileBefore', () => {
  it('moves a tile to before another tile', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const [c3] = idsFor('C3', 1)
    const order = [c1!, c2!, c3!]
    expect(moveTileBefore(order, c3!, c1!)).toEqual([c3, c1, c2])
  })

  it('moves a tile to the end when beforeId is null', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const [c3] = idsFor('C3', 1)
    const order = [c1!, c2!, c3!]
    expect(moveTileBefore(order, c1!, null)).toEqual([c2, c3, c1])
  })

  it('is a no-op when dragging a tile onto itself', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const order = [c1!, c2!]
    expect(moveTileBefore(order, c1!, c1!)).toEqual(order)
  })

  it('is a no-op when the dragged tile is not present', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const [c3] = idsFor('C3', 1)
    const order = [c1!, c2!]
    expect(moveTileBefore(order, c3!, c1!)).toEqual(order)
  })

  it('preserves the relative order of all other tiles', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const [c3] = idsFor('C3', 1)
    const [c4] = idsFor('C4', 1)
    const order = [c1!, c2!, c3!, c4!]
    expect(moveTileBefore(order, c4!, c2!)).toEqual([c1, c4, c2, c3])
  })
})
