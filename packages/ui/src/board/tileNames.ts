import { isFlowerOrSeason, typeIdOfInstance, typeOf, type TileTypeId } from '@mahjong-mcr/engine'

const SUIT_NAME: Record<'characters' | 'dots' | 'bamboo', string> = {
  characters: 'Characters',
  dots: 'Dots',
  bamboo: 'Bamboo',
}

const WIND_NAME: Record<'east' | 'south' | 'west' | 'north', string> = {
  east: 'East Wind',
  south: 'South Wind',
  west: 'West Wind',
  north: 'North Wind',
}

const DRAGON_NAME: Record<'red' | 'green' | 'white', string> = {
  red: 'Red Dragon',
  green: 'Green Dragon',
  white: 'White Dragon',
}

// The 34 standard type ids, in canonical table order, derived from
// TILE_TYPE_BY_ID/typeIdOfInstance rather than hand-copied — this can never
// drift from the engine's own actual type set. Flowers/seasons are
// deliberately excluded (they're bonus tiles, never part of hand shape).
export const ALL_TILE_TYPE_IDS: readonly TileTypeId[] = (() => {
  const seen = new Set<TileTypeId>()
  const ids: TileTypeId[] = []
  for (let instance = 0; instance < 144; instance++) {
    if (isFlowerOrSeason(instance)) continue
    const typeId = typeIdOfInstance(instance)
    if (seen.has(typeId)) continue
    seen.add(typeId)
    ids.push(typeId)
  }
  return ids
})()

const NAME_BY_TYPE_ID: ReadonlyMap<TileTypeId, string> = new Map(
  ALL_TILE_TYPE_IDS.map((typeId) => {
    // Any instance sharing this type id describes the same TileType.
    const instance = Array.from({ length: 144 }, (_, i) => i).find((i) => typeIdOfInstance(i) === typeId)!
    const type = typeOf(instance)
    const name =
      type.kind === 'suit'
        ? `${type.rank} ${SUIT_NAME[type.suit]}`
        : type.kind === 'wind'
          ? WIND_NAME[type.wind]
          : type.kind === 'dragon'
            ? DRAGON_NAME[type.dragon]
            : typeId // unreachable for a standard type id, kept exhaustive
    return [typeId, name]
  }),
)

export function tileDisplayName(typeId: TileTypeId): string {
  return NAME_BY_TYPE_ID.get(typeId) ?? typeId
}
