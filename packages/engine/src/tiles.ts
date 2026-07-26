export type Suit = 'characters' | 'dots' | 'bamboo'
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type Wind = 'east' | 'south' | 'west' | 'north'
export type Dragon = 'red' | 'green' | 'white'

export type TileType =
  | { kind: 'suit'; suit: Suit; rank: Rank }
  | { kind: 'wind'; wind: Wind }
  | { kind: 'dragon'; dragon: Dragon }
  | { kind: 'flower'; number: 1 | 2 | 3 | 4 }
  | { kind: 'season'; number: 1 | 2 | 3 | 4 }

// One string per *type* (42 distinct values), not per physical tile.
export type TileTypeId = string

const SUIT_PREFIX: Record<Suit, string> = { characters: 'C', dots: 'D', bamboo: 'B' }
const WIND_CODE: Record<Wind, string> = { east: 'WE', south: 'WS', west: 'WW', north: 'WN' }
const DRAGON_CODE: Record<Dragon, string> = { red: 'DR', green: 'DG', white: 'DW' }

export function typeIdOf(type: TileType): TileTypeId {
  switch (type.kind) {
    case 'suit':
      return `${SUIT_PREFIX[type.suit]}${type.rank}`
    case 'wind':
      return WIND_CODE[type.wind]
    case 'dragon':
      return DRAGON_CODE[type.dragon]
    case 'flower':
      return `F${type.number}`
    case 'season':
      return `S${type.number}`
  }
}

// A physical tile is just an index 0..143 into a fixed, never-regenerated
// lookup table — everywhere else in GameState we store plain numbers, not
// tile objects, so state stays trivially serializable.
export type TileInstanceId = number

const SUITS: readonly Suit[] = ['characters', 'dots', 'bamboo']
const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const WINDS: readonly Wind[] = ['east', 'south', 'west', 'north']
const DRAGONS: readonly Dragon[] = ['red', 'green', 'white']

function buildCanonicalTable(): TileType[] {
  const table: TileType[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      for (let copy = 0; copy < 4; copy++) table.push({ kind: 'suit', suit, rank })
    }
  }
  for (const wind of WINDS) {
    for (let copy = 0; copy < 4; copy++) table.push({ kind: 'wind', wind })
  }
  for (const dragon of DRAGONS) {
    for (let copy = 0; copy < 4; copy++) table.push({ kind: 'dragon', dragon })
  }
  for (let number = 1; number <= 4; number++) {
    table.push({ kind: 'flower', number: number as 1 | 2 | 3 | 4 })
  }
  for (let number = 1; number <= 4; number++) {
    table.push({ kind: 'season', number: number as 1 | 2 | 3 | 4 })
  }
  return table
}

// Fixed construction order (NOT shuffled): 0-35 characters, 36-71 dots,
// 72-107 bamboo (4 copies each, ranks 1-9), 108-123 winds (E/S/W/N x4),
// 124-135 dragons (red/green/white x4), 136-139 flowers, 140-143 seasons.
export const TILE_TYPE_BY_ID: readonly TileType[] = buildCanonicalTable()

if (TILE_TYPE_BY_ID.length !== 144) {
  throw new Error(`Expected 144 canonical tiles, got ${TILE_TYPE_BY_ID.length}`)
}

export function typeOf(id: TileInstanceId): TileType {
  const type = TILE_TYPE_BY_ID[id]
  if (!type) throw new Error(`Invalid TileInstanceId: ${id}`)
  return type
}

export function typeIdOfInstance(id: TileInstanceId): TileTypeId {
  return typeIdOf(typeOf(id))
}

export function buildDeck(): TileInstanceId[] {
  return Array.from({ length: 144 }, (_, id) => id)
}

export function isFlowerOrSeason(id: TileInstanceId): boolean {
  const type = typeOf(id)
  return type.kind === 'flower' || type.kind === 'season'
}

export function isSuited(type: TileType): type is { kind: 'suit'; suit: Suit; rank: Rank } {
  return type.kind === 'suit'
}
