import { describe, expect, it } from 'vitest'
import { calculateShanten } from '../shanten.js'
import { computeWaits } from '../waits.js'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileInstanceId, type TileTypeId } from '../tiles.js'
import { ORDERED_STANDARD_TYPE_IDS } from '../win-detection.js'
import { SCENARIO_LIBRARY } from './library.js'

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

// Converts a (possibly-repeating) list of tile TYPES into concrete, distinct
// TileInstanceIds — one real physical tile per requested type occurrence.
function instancesFor(typeIds: readonly TileTypeId[]): TileInstanceId[] {
  const counts = new Map<TileTypeId, number>()
  for (const typeId of typeIds) counts.set(typeId, (counts.get(typeId) ?? 0) + 1)
  return [...counts.entries()].flatMap(([typeId, count]) => idsFor(typeId, count))
}

describe('SCENARIO_LIBRARY', () => {
  it('has unique, non-empty ids and labels', () => {
    expect(SCENARIO_LIBRARY.length).toBeGreaterThan(0)
    const ids = new Set(SCENARIO_LIBRARY.map((s) => s.id))
    expect(ids.size).toBe(SCENARIO_LIBRARY.length)
    for (const preset of SCENARIO_LIBRARY) {
      expect(preset.label.length).toBeGreaterThan(0)
      expect(preset.description.length).toBeGreaterThan(0)
    }
  })

  it('every preset is a physically valid 13-tile multiset (only standard types, <=4 copies each)', () => {
    for (const preset of SCENARIO_LIBRARY) {
      expect(preset.concealedTypeIds).toHaveLength(13)
      const counts = new Map<TileTypeId, number>()
      for (const typeId of preset.concealedTypeIds) {
        expect(ORDERED_STANDARD_TYPE_IDS).toContain(typeId)
        counts.set(typeId, (counts.get(typeId) ?? 0) + 1)
      }
      for (const count of counts.values()) expect(count).toBeLessThanOrEqual(4)
    }
  })

  it('every preset actually resolves via idsFor (i.e. is dealable from the canonical 144-tile table)', () => {
    for (const preset of SCENARIO_LIBRARY) {
      const counts = new Map<TileTypeId, number>()
      for (const typeId of preset.concealedTypeIds) counts.set(typeId, (counts.get(typeId) ?? 0) + 1)
      for (const [typeId, count] of counts) expect(() => idsFor(typeId, count)).not.toThrow()
    }
  })

  it('tenpai scenarios are genuinely tenpai (shanten 0) with the documented wait set', () => {
    const expectedWaits: Record<string, TileTypeId[]> = {
      'tenpai-two-sided': ['C2', 'C5'],
      'tenpai-edge-wait': ['C3'],
      'tenpai-closed-wait': ['C5'],
      'tenpai-shanpon': ['C9', 'WE'],
      'one-away-seven-pairs': ['WE'],
      'tenpai-wide-wait-all-simples': ['D1', 'D4', 'D7'],
    }
    for (const [id, waits] of Object.entries(expectedWaits)) {
      const preset = SCENARIO_LIBRARY.find((s) => s.id === id)!
      expect(preset, id).toBeTruthy()
      const concealed = instancesFor(preset.concealedTypeIds)
      expect(calculateShanten(concealed, []).shanten, id).toBe(0)
      expect(computeWaits(concealed, []).map((w) => w.tileType).sort(), id).toEqual([...waits].sort())
    }
  })

  it('the 1-shanten Mixed Triple Chow scenario is genuinely 1-shanten', () => {
    const preset = SCENARIO_LIBRARY.find((s) => s.id === 'shanten-1-mixed-triple-chow')!
    expect(calculateShanten(instancesFor(preset.concealedTypeIds), []).shanten).toBe(1)
  })
})
