import { dealHandFromWall, type GameState, type StartHandParams } from './game-state.js'
import type { Seat } from './meld.js'
import { mulberry32, shuffle } from './rng.js'
import { buildDeck, typeIdOfInstance, type TileInstanceId, type TileTypeId, type Wind } from './tiles.js'
import { INITIAL_DEAL_COUNT, type Wall } from './wall.js'
import { ORDERED_STANDARD_TYPE_IDS } from './win-detection.js'

export interface ScenarioPreset {
  id: string
  label: string
  description: string
  // The exact multiset of standard tile types the target seat's concealed
  // hand should be dealt — 13 entries (a non-dealer scenario) or 14 (a
  // dealer scenario, "what do I discard").
  concealedTypeIds: TileTypeId[]
}

export interface StartScenarioHandParams {
  preset: ScenarioPreset
  seed: number
  forSeat: Seat
  dealerSeat: Seat
  prevailingWind?: Wind
  handNumber?: number
}

const STANDARD_INSTANCE_COUNT = 136 // ids 0-135; 136-143 are flowers/seasons (tiles.ts's fixed construction order)

function pickInstances(typeId: TileTypeId, count: number, used: Set<TileInstanceId>): TileInstanceId[] {
  const picked: TileInstanceId[] = []
  for (let instance = 0; instance < STANDARD_INSTANCE_COUNT && picked.length < count; instance++) {
    if (used.has(instance)) continue
    if (typeIdOfInstance(instance) === typeId) {
      picked.push(instance)
      used.add(instance)
    }
  }
  if (picked.length < count) {
    throw new Error(`Scenario preset needs ${count} copies of ${typeId}, but only ${picked.length} are available`)
  }
  return picked
}

// Builds a wall where `forSeat`'s initial deal is exactly the preset's
// requested tile types, and every other seat (plus the rest of the wall)
// gets a seeded-shuffle of whatever standard tiles remain. Every
// flower/season tile (ids 136-143) is pushed to the very tail of the wall,
// past the INITIAL_DEAL_COUNT (53) boundary the deal actually consumes —
// so no flower-replacement chain can ever fire during dealing and shift the
// deal-order-to-wall-position alignment this depends on. Reuses
// dealHandFromWall (game-state.ts) for the actual dealing, so a scenario
// hand goes through the exact same deal/flower-replacement/action-log path
// as a normal random hand — only the wall's contents differ.
//
// KICKOFF-phase8-addendum-decisions.md's two-pointer wall: `backIndex`
// starts at the array's literal tail, which is exactly where this function
// clusters every flower/season tile — so any kong declared in a practice
// scenario will chain-draw all remaining flowers as part of its replacement
// before landing on a real tile (deterministically, every time, for every
// preset that reaches a kong). Not a correctness bug — the flowers are
// still handled correctly, scoring is unaffected, nothing crashes — but
// it's a real behavioral quirk worth knowing about; not fixed here since it
// would mean redesigning this function's flower-placement strategy, out of
// scope for the wall-pointer fix itself.
function buildScenarioWall(preset: ScenarioPreset, seed: number, forSeat: Seat, dealerSeat: Seat): Wall {
  for (const typeId of preset.concealedTypeIds) {
    if (!ORDERED_STANDARD_TYPE_IDS.includes(typeId)) {
      throw new Error(`Scenario preset "${preset.id}" requests non-standard tile type ${typeId} (flowers/seasons can't be preset)`)
    }
  }

  const expectedCount = forSeat === dealerSeat ? 14 : 13
  if (preset.concealedTypeIds.length !== expectedCount) {
    throw new Error(
      `Scenario preset "${preset.id}" has ${preset.concealedTypeIds.length} tiles, but seat ${forSeat} ${
        forSeat === dealerSeat ? '(dealer)' : '(non-dealer)'
      } needs exactly ${expectedCount}`,
    )
  }

  // Picking one instance at a time (rather than all N copies of a type at
  // once) still lands on N distinct physical instances per repeated type,
  // since `used` rules out whatever was already picked for an earlier
  // occurrence of the same type.
  const used = new Set<TileInstanceId>()
  const presetInstances = preset.concealedTypeIds.map((typeId) => pickInstances(typeId, 1, used)[0]!)

  const remainingStandard: TileInstanceId[] = []
  for (let instance = 0; instance < STANDARD_INSTANCE_COUNT; instance++) {
    if (!used.has(instance)) remainingStandard.push(instance)
  }
  const rng = mulberry32(seed)
  const shuffledRemainder = shuffle(remainingStandard, rng)
  const shuffledBonusTiles = shuffle(buildDeck().slice(STANDARD_INSTANCE_COUNT), rng)

  const dealOrder: Seat[] = []
  for (let round = 0; round < 13; round++) {
    for (let i = 0; i < 4; i++) dealOrder.push(((dealerSeat + i) % 4) as Seat)
  }
  dealOrder.push(dealerSeat)

  const tiles: TileInstanceId[] = new Array(144)
  let presetIndex = 0
  let poolIndex = 0
  for (let slot = 0; slot < INITIAL_DEAL_COUNT; slot++) {
    tiles[slot] = dealOrder[slot] === forSeat ? presetInstances[presetIndex++]! : shuffledRemainder[poolIndex++]!
  }
  for (let i = INITIAL_DEAL_COUNT; i < STANDARD_INSTANCE_COUNT; i++) {
    tiles[i] = shuffledRemainder[poolIndex++]!
  }
  for (let i = 0; i < shuffledBonusTiles.length; i++) {
    tiles[STANDARD_INSTANCE_COUNT + i] = shuffledBonusTiles[i]!
  }

  return { tiles, frontIndex: 0, backIndex: tiles.length - 1 }
}

export function startScenarioHand(params: StartScenarioHandParams): GameState {
  const { preset, seed, forSeat, dealerSeat } = params
  const wall = buildScenarioWall(preset, seed, forSeat, dealerSeat)
  const startParams: StartHandParams = {
    seed,
    handNumber: params.handNumber ?? 0,
    prevailingWind: params.prevailingWind ?? 'east',
    dealerSeat,
  }
  return dealHandFromWall(wall, startParams)
}
