import { typeIdOfInstance, TILE_TYPE_BY_ID, type GameState, type Meld, type PlayerState, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'

// KICKOFF-phase5-melds-backs.md's prerequisite (still the harness Phase 7
// uses per its own Constraints: "verify at 4 kongs + flowers on every seat
// and 83 discards distributed skewed, not a fresh hand") — a dev-only state
// override for visually verifying layout at worst-case tile counts without
// needing the bot-driving Playwright script to survive 83 real discards and
// claim prompts to get there. Only ever reached from import.meta.env.DEV
// call sites (App.tsx) — never bundled into a production build.
//
// This deliberately bypasses every real engine invariant (stable tile IDs
// persisting across zone transitions, the 13+K hand-size accounting, wall/
// discard-pile bookkeeping) — it's a disposable rendering fixture laid over
// a live GameState's `players`, not a real game transition, so CLAUDE.md's
// tile-identity rules (which govern actual zone-to-zone movement) don't
// apply to how these synthetic tiles are conjured.

// 'worst' is the original Phase 7 stress test (every region at its
// documented worst-case occupancy, every seat). 'oneChow' and 'threeMelds'
// are KICKOFF-phase9-human-melds.md's own verification item 1 configs
// ("(b) one chow", "(c) three melds including a kong") — lighter, only the
// human seat's hand, real coherent melds rather than 'worst''s arbitrary
// tile ids (visual coherence doesn't matter for a pure occupancy stress
// test, but it does for "does one chow's shelf/offset actually read right").
export type DevOccupancyMode = 'worst' | 'preview' | 'oneChow' | 'threeMelds'

// Phase 4's own 83-total fixture ("83 shared across seats... skewed toward
// seat 0"), carried over from the removed DiscardOverlay's tests so the
// worst-case numbers stay pinned somewhere — also exercises DiscardField's per-zone
// "additive, never rescaling" overflow (a 30-tile pile exceeds a zone's own
// 25-tile/5x5 nominal capacity).
// Visual capacity fixture: every river fills its nominal 5x5 zone exactly.
// This intentionally exceeds the legal table-wide total; it is a layout
// stress state, just like simultaneously giving every seat all 8 flowers.
const DISCARD_COUNTS: Record<number, number> = { 0: 25, 1: 25, 2: 25, 3: 25 }
const KONG_COUNT = 4 // worst case: all 4 melds are kongs, not pungs/chows — most inter-group gaps
const CONCEALED_REMAINDER = 1 // 13 + K kongs = 17; 4 kongs leaves exactly 1 tile still concealed
// The human row's own worst case is 18, not 17 — KICKOFF-phase7-board-
// rebuild.md's "17 + drawn": the extra tile a player holds momentarily
// between drawing and discarding. Only meaningful for the human row
// (HandTiles); bot seat lines use the plain 17-tile (16 melded + 1
// concealed) worst case.
const HUMAN_CONCEALED_REMAINDER = 2
// KICKOFF-phase7-board-rebuild.md's seat-line worst case is 25, not 17 —
// "4 kongs = 16 melded, 1 concealed, up to 8 flowers" — flowers now render
// inline on every seat's line (bots) or hand row (human), not a separate
// region, so the harness needs to populate them to exercise that worst case.
const FLOWER_COUNT = 8

export function parseDevOccupancyMode(search: string): DevOccupancyMode | null {
  const value = new URLSearchParams(search).get('occupancy')
  return value === 'worst' || value === 'preview' || value === 'oneChow' || value === 'threeMelds' ? value : null
}

// Every real TileInstanceId is 0-143 (144 physical tiles) — but this
// harness's Phase 7 worst case needs far more synthetic slots than that
// (83 discards + 4*16 melded + a few concealed + 4*8 flowers = 184+) to
// visualize every region's own worst case simultaneously, something no
// real GameState ever reaches all at once (that's the whole point of a
// synthetic harness). Wrapping the cursor is the simplest way to stay
// in-range: a handful of ids repeat across zones, which cosmetically means
// a couple of tiles share a face and, once in a while, a shared Framer
// Motion layoutId — both purely cosmetic for a disposable dev visualization
// that never drives real animation continuity, unlike a genuine zone-to-
// zone transition.
const TILE_ID_RANGE = 144
function nextId(cursor: { next: number }): TileInstanceId {
  const id = cursor.next % TILE_ID_RANGE
  cursor.next++
  return id
}

// Real instances of a specific tile type, not arbitrary wrapped ids —
// 'oneChow'/'threeMelds' want visually coherent melds (consecutive suited
// tiles for a chow, 4-of-a-kind for a kong), unlike 'worst''s pure occupancy
// stress test where the actual tile faces don't matter. Mirrors the
// `idsFor` helper every test file already uses for the same lookup.
function realTileIds(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let id = 0; id < TILE_TYPE_BY_ID.length && ids.length < count; id++) {
    if (typeIdOfInstance(id) === typeId) ids.push(id)
  }
  if (ids.length < count) throw new Error(`No ${count} instances of tile type ${typeId}`)
  return ids
}

// KICKOFF-phase9-human-melds.md verification item 1(b): the human hand with
// exactly one exposed chow (3-4-5 Characters) and a plain concealed
// remainder — the lightest real case items 1-3's shelf/offset/shadow need
// to look right at, not just the 4-kong extreme.
function humanOneChowHand(cursor: { next: number }): { concealedTiles: TileInstanceId[]; melds: Meld[] } {
  const meld: Meld = { id: 'dev-chow-0', kind: 'chow', exposure: 'exposed', tiles: realTileIds('C3', 1).concat(realTileIds('C4', 1), realTileIds('C5', 1)), ownerSeat: 0 }
  const concealedTiles = Array.from({ length: 10 }, () => nextId(cursor))
  return { concealedTiles, melds: [meld] }
}

// Verification item 1(c): three melds — an exposed pung, an exposed chow,
// and a concealed kong (so item 4's face-down rendering is exercised
// alongside items 1-3's shelf/offset, not only at the 'worst' extreme).
function humanThreeMeldsHand(cursor: { next: number }): { concealedTiles: TileInstanceId[]; melds: Meld[] } {
  const pung: Meld = { id: 'dev-pung-0', kind: 'pung', exposure: 'exposed', tiles: realTileIds('D5', 3), ownerSeat: 0 }
  const chow: Meld = { id: 'dev-chow-0', kind: 'chow', exposure: 'exposed', tiles: realTileIds('B2', 1).concat(realTileIds('B3', 1), realTileIds('B4', 1)), ownerSeat: 0 }
  const kong: Meld = { id: 'dev-kong-0', kind: 'kong', exposure: 'concealed', kongSource: 'concealed', tiles: realTileIds('C7', 4), ownerSeat: 0 }
  const concealedTiles = Array.from({ length: 4 }, () => nextId(cursor))
  return { concealedTiles, melds: [pung, chow, kong] }
}

// A real kong is 4 IDENTICAL tiles — nextId's shared rolling cursor (fine
// for discards/concealed/flowers, where exact tile identity is cosmetic)
// can't guarantee that, so kongs draw from a small fixed rotation of real
// suited/honor types instead, one entry per (seat, kong index) slot (16
// total, matching KONG_COUNT * 4 seats exactly). Caught live via
// KICKOFF-phase9-human-melds.md's own visual verification: a "kong" of 4
// unrelated tiles reads as visibly broken in a screenshot, not just
// imprecise — this was a pre-existing gap in 'worst' mode, not introduced by
// that phase, but it directly undermined verifying item 4's concealed-kong
// rendering, so it's fixed here alongside it.
const KONG_TYPE_ROTATION: readonly TileTypeId[] = ['C1', 'C4', 'C7', 'D2', 'D5', 'D8', 'B3', 'B6', 'B9', 'WE', 'WS', 'WW', 'WN', 'DR', 'DG', 'DW']

function syntheticKong(ownerSeat: PlayerState['seat'], index: number): Meld {
  const typeId = KONG_TYPE_ROTATION[(ownerSeat * KONG_COUNT + index) % KONG_TYPE_ROTATION.length]!
  const tiles = realTileIds(typeId, 4)
  // KICKOFF-phase9-human-melds.md item 4 needs a concealed kong (outer two
  // tiles face-down) actually present to visually verify — index 0 is
  // arbitrary but fixed, so every seat's worst-case line shows exactly one
  // among its 4 kongs, same as a real hand's own occasional mix rather than
  // an all-exposed or all-concealed extreme.
  const concealed = index === 0
  return {
    id: `dev-${ownerSeat}-${index}`,
    kind: 'kong',
    exposure: concealed ? 'concealed' : 'exposed',
    kongSource: concealed ? 'concealed' : 'exposedFromDiscard',
    tiles,
    ownerSeat,
    ...(!concealed
      ? { claimedFrom: { seat: ((ownerSeat + 3) % 4) as PlayerState['seat'], discardTile: tiles[tiles.length - 1]! } }
      : {}),
  }
}

// Overlays synthetic discards, a 4-kong hand, and flowers (every seat,
// including the human — Phase 7 moved melds/flowers inline onto every
// seat's own line/row, so nothing is out of scope anymore) onto a live
// GameState, keeping every other field (wall, dealer, currentSeat, phase,
// ...) untouched so the rest of the app keeps working normally around the
// visualization.
export function applyDevOccupancy(state: GameState, mode: DevOccupancyMode, humanSeat: PlayerState['seat']): GameState {
  // 'oneChow'/'threeMelds' only replace the human's own hand — a lighter,
  // real-looking config, unrelated to 'worst''s every-seat/every-region
  // stress test (see each helper's own comment).
  if (mode === 'oneChow' || mode === 'threeMelds') {
    const cursor = { next: 0 }
    const built = mode === 'oneChow' ? humanOneChowHand(cursor) : humanThreeMeldsHand(cursor)
    const players = state.players.map((player) =>
      player.seat === humanSeat ? { ...player, hand: { ...player.hand, ...built } } : player,
    )
    return { ...state, players: players as GameState['players'] }
  }

  // Temporary late-game board preview: full discard rivers, but plausible
  // rather than pathological hands. The human explicitly carries five
  // flowers and the bot on their left (South, seat 1) carries the maximum
  // eight, so both of those otherwise easy-to-miss trays are visible.
  // North carries three kongs as the other deliberately heavy hand.
  // Unlike `worst`, this is suitable for an owner-facing toggle because it
  // resembles the board they are likely to encounter during real play.
  if (mode === 'preview') {
    const cursor = { next: 0 }
    const previewTypes: readonly [TileTypeId, TileTypeId, TileTypeId][] = [
      ['C2', 'C3', 'C4'],
      ['D4', 'D5', 'D6'],
      ['B6', 'B7', 'B8'],
      ['C6', 'C7', 'C8'],
    ]
    const players = state.players.map((player) => {
      const chowTypes = previewTypes[player.seat]!
      const chowTiles = chowTypes.flatMap((typeId) => realTileIds(typeId, 1))
      const chow: Meld = {
        id: `preview-chow-${player.seat}`,
        kind: 'chow',
        exposure: 'exposed',
        tiles: chowTiles,
        ownerSeat: player.seat,
        claimedFrom: { seat: ((player.seat + 3) % 4) as PlayerState['seat'], discardTile: chowTiles[1]! },
      }
      const pungType = (['DR', 'DG', 'DW', 'WE'] as const)[player.seat]!
      const pungTiles = realTileIds(pungType, 3)
      const pung: Meld = {
        id: `preview-pung-${player.seat}`,
        kind: 'pung',
        exposure: 'exposed',
        tiles: pungTiles,
        ownerSeat: player.seat,
        claimedFrom: { seat: ((player.seat + 1) % 4) as PlayerState['seat'], discardTile: pungTiles[2]! },
      }
      const northKongs = player.seat === 2 ? Array.from({ length: 3 }, (_, i) => syntheticKong(player.seat, i)) : null
      const concealedCount = player.seat === 2 ? 1 : player.seat === humanSeat ? 8 : 7
      const flowerCount = player.seat === 1 ? FLOWER_COUNT : 5
      return {
        ...player,
        discards: Array.from({ length: 25 }, () => nextId(cursor)),
        hand: {
          ...player.hand,
          concealedTiles: Array.from({ length: concealedCount }, () => nextId(cursor)),
          melds: northKongs ?? [chow, pung],
          flowers: Array.from({ length: flowerCount }, (_, i) => 136 + ((player.seat * 5 + i) % FLOWER_COUNT)),
        },
      }
    })
    return { ...state, players: players as GameState['players'] }
  }

  const cursor = { next: 0 }
  const players = state.players.map((player) => {
    const discards: TileInstanceId[] = Array.from({ length: DISCARD_COUNTS[player.seat] ?? 0 }, () => nextId(cursor))
    const melds: Meld[] = Array.from({ length: KONG_COUNT }, (_, i) => syntheticKong(player.seat, i))
    const concealedCount = player.seat === humanSeat ? HUMAN_CONCEALED_REMAINDER : CONCEALED_REMAINDER
    const concealedTiles: TileInstanceId[] = Array.from({ length: concealedCount }, () => nextId(cursor))
    const flowers: TileInstanceId[] = Array.from({ length: FLOWER_COUNT }, () => nextId(cursor))
    return { ...player, discards, hand: { ...player.hand, melds, concealedTiles, flowers } }
  })
  return { ...state, players: players as GameState['players'] }
}
