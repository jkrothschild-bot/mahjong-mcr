import { describe, expect, it } from 'vitest'
import { computeWaits } from './waits.js'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileInstanceId, type TileTypeId } from './tiles.js'
import { calculateShanten } from './shanten.js'
import { isWinningHand, ORDERED_STANDARD_TYPE_IDS } from './win-detection.js'

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

describe('computeWaits', () => {
  it('returns [] when the hand is not tenpai', () => {
    const concealed = [...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1)]
    expect(calculateShanten(concealed, []).shanten).toBeGreaterThan(0)
    expect(computeWaits(concealed, [])).toEqual([])
  })

  it('finds both sides of the C3-C4 two-sided wait (C2 or C5), with positive points both ways', () => {
    const concealed = [
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
    ]
    expect(calculateShanten(concealed, []).shanten).toBe(0)

    const waits = computeWaits(concealed, [])
    expect(waits.map((w) => w.tileType).sort()).toEqual(['C2', 'C5'])
    for (const wait of waits) {
      expect(wait.discardScore.basicPoints).toBeGreaterThan(0)
      expect(wait.selfDrawScore.basicPoints).toBeGreaterThan(0)
    }
  })

  it('finds both tiles of a shanpon (dual-pair) wait', () => {
    // chow(D4,D5,D6) + chow(B7,B8,B9) + pung(DW×3) + pair(C9,C9) + pair(WE,WE)
    // — waiting on either C9 or WE to complete the 4th set.
    const concealed = [
      ...idsFor('D4', 1),
      ...idsFor('D5', 1),
      ...idsFor('D6', 1),
      ...idsFor('B7', 1),
      ...idsFor('B8', 1),
      ...idsFor('B9', 1),
      ...idsFor('DW', 3),
      ...idsFor('C9', 2),
      ...idsFor('WE', 2),
    ]
    expect(concealed.length).toBe(13)
    expect(calculateShanten(concealed, []).shanten).toBe(0)

    const waits = computeWaits(concealed, [])
    expect(waits.map((w) => w.tileType).sort()).toEqual(['C9', 'WE'])
  })

  // Soundness + completeness, per PLAN.md §4's own invariant: "waits shown
  // to the player always match a structural completion the scoring engine
  // agrees is valid." Every returned type, appended, must actually win
  // (soundness); every one of the other standard types must NOT (completeness).
  it('every returned wait actually wins, and every non-returned standard type does not (soundness + completeness)', () => {
    const fixtures: TileInstanceId[][] = [
      [
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
      ],
      [
        ...idsFor('D4', 1),
        ...idsFor('D5', 1),
        ...idsFor('D6', 1),
        ...idsFor('B7', 1),
        ...idsFor('B8', 1),
        ...idsFor('B9', 1),
        ...idsFor('DW', 3),
        ...idsFor('C9', 2),
        ...idsFor('WE', 2),
      ],
    ]

    for (const concealed of fixtures) {
      const waits = computeWaits(concealed, [])
      const waitTypes = new Set(waits.map((w) => w.tileType))

      for (const type of ORDERED_STANDARD_TYPE_IDS) {
        const [candidate] = idsFor(type, 1)
        const wins = isWinningHand([...concealed, candidate!], [])
        expect(wins).toBe(waitTypes.has(type))
      }
    }
  })
})
