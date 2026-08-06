// Hand-crafted constructors for fans pure-random generation would
// essentially never hit (KICKOFF-validation-harness.md 1f: "Randomly-
// constructed hands will hit All Chows constantly and Big Four Winds
// never... add targeted generators for the unreached ones, seeded from the
// existing rulebook fixtures in scoring/fans-*.test.ts").
//
// Every tile composition below is adapted from a POSITIVE case in the
// corresponding fans-N.test.ts file (N = point tier, e.g. fans-64.test.ts
// for fan 8) — reusing rulebook-derived compositions that are already
// unit-tested against the real detector, not invented fresh here. Turning
// each into a full GeneratedCase (materialized TileInstanceIds, verified by
// isWinningHand, wrapped with win-circumstance context) is genuinely new
// work: those unit tests build a bare HandContext by hand and never touch
// decomposeHand/isWinningHand/PyMahjongGB at all.
//
// Fans 20/34/35 (Greater/Lesser Honors and Knitted Tiles, Knitted Straight)
// were skipped here until docs/rules/decisions.md #19/#20 (2026-08-05):
// decomposeHand had no "knitted" set concept, so isWinningHand returned
// false for every hand these fans require and no case for them could pass
// the "must throw if not a real win" generator invariant (1a). Now fixed —
// see targeted-20/34/35 below, and win-detection.test.ts for the engine-side
// fixtures these compositions are shared with.
import {
  isWinningHand,
  mulberry32,
  typeIdOfInstance,
  type Meld,
  type TileInstanceId,
  type TileTypeId,
} from '@mahjong-mcr/engine'
import type { GeneratedCase } from '../case-types.js'
import { TileAllocator, makeChowMeld, makeKongMeld, makePungMeld, type KongVariant } from '../hand-helpers.js'
import { pickWinningTile, randomWinCircumstance, type WinCircumstance } from '../win-circumstance.js'

interface SetSpec {
  type: 'chow' | 'pung'
  tiles: readonly [TileTypeId, TileTypeId, TileTypeId]
}
interface DecompSpec {
  pair: TileTypeId
  sets: readonly SetSpec[]
}

function allocateDecomp(allocator: TileAllocator, spec: DecompSpec): TileInstanceId[] {
  const perType = new Map<TileTypeId, number>()
  const bump = (id: TileTypeId, n: number) => perType.set(id, (perType.get(id) ?? 0) + n)
  bump(spec.pair, 2)
  for (const set of spec.sets) for (const id of set.tiles) bump(id, 1)

  const pool = new Map<TileTypeId, TileInstanceId[]>()
  for (const [typeId, count] of perType) pool.set(typeId, allocator.take(typeId, count))

  const takeOne = (typeId: TileTypeId): TileInstanceId => {
    const bucket = pool.get(typeId)!
    const tile = bucket.pop()
    if (tile === undefined) throw new Error(`allocateDecomp: ran out of pre-allocated ${typeId}`)
    return tile
  }

  const tiles: TileInstanceId[] = []
  tiles.push(takeOne(spec.pair), takeOne(spec.pair))
  for (const set of spec.sets) for (const id of set.tiles) tiles.push(takeOne(id))
  return tiles
}

// Every targeted case gets its own derived seed (masterSeed + a stable
// per-call index) so results stay reproducible run-to-run, and uses the
// engine's own mulberry32 exactly like every other generator — see
// KICKOFF-validation-harness.md 1a's "seeded via the engine's own
// mulberry32, so any mismatch is reproducible from its seed alone."
let seedCounter = 0

function finalize(
  masterSeed: number,
  label: string,
  concealedTiles: TileInstanceId[],
  melds: Meld[],
  circumstanceOverride: Partial<WinCircumstance> = {},
  forceWinningTile?: TileInstanceId,
): GeneratedCase {
  seedCounter += 1
  const seed = masterSeed + seedCounter
  const rng = mulberry32(seed)

  if (!isWinningHand(concealedTiles, melds)) {
    throw new Error(`targeted generator "${label}": constructed hand is not winning — generator bug. concealedTiles=${JSON.stringify(concealedTiles)} melds=${JSON.stringify(melds)}`)
  }

  const winningTile = forceWinningTile ?? pickWinningTile(concealedTiles, rng)
  const circumstance = { ...randomWinCircumstance(rng, concealedTiles, melds, winningTile), ...circumstanceOverride }

  return { seed, label, concealedTiles, melds, winningTile, flowerCount: 0, ...circumstance }
}

function fromSpec(masterSeed: number, label: string, spec: DecompSpec, circumstanceOverride: Partial<WinCircumstance> = {}): GeneratedCase {
  const allocator = new TileAllocator()
  const concealedTiles = allocateDecomp(allocator, spec)
  return finalize(masterSeed, label, concealedTiles, [], circumstanceOverride)
}

function chow(a: TileTypeId, b: TileTypeId, c: TileTypeId): SetSpec {
  return { type: 'chow', tiles: [a, b, c] }
}
function pung(a: TileTypeId): SetSpec {
  return { type: 'pung', tiles: [a, a, a] }
}

// --- fans needing declared (exposed or concealed-kong) melds ---------------

// Filler chows for whatever sets a kongsHand call still needs beyond its
// kongs+pair — kongTypes.length < 4 leaves (4 - kongTypes.length) more sets
// for decomposeHand to find in the concealed portion. Every call site here
// keeps kongTypes/pairType within {WE, C1, D5, DR, B7}, so D1-D3/B1-B3 never
// collide with them.
const FILLER_CHOWS: readonly SetSpec[] = [chow('D1', 'D2', 'D3'), chow('B1', 'B2', 'B3')]

function kongsHand(masterSeed: number, label: string, kongTypes: readonly TileTypeId[], variants: readonly KongVariant[], pairType: TileTypeId): GeneratedCase {
  const allocator = new TileAllocator()
  const melds = kongTypes.map((t, i) => makeKongMeld(allocator.take(t, 4), variants[i % variants.length]!))
  const fillersNeeded = 4 - kongTypes.length
  if (fillersNeeded > FILLER_CHOWS.length) throw new Error(`kongsHand: ${label} needs ${fillersNeeded} filler sets, only ${FILLER_CHOWS.length} available`)
  const fillerTiles = FILLER_CHOWS.slice(0, fillersNeeded).flatMap((set) => set.tiles.map((t) => allocator.take(t, 1)[0]!))
  const pair = allocator.take(pairType, 2)
  return finalize(masterSeed, label, [...fillerTiles, ...pair], melds)
}

export function runTargetedGenerators(masterSeed: number): GeneratedCase[] {
  const cases: GeneratedCase[] = []
  const add = (c: GeneratedCase) => cases.push(c)

  // 1. Big Four Winds — 88.
  add(fromSpec(masterSeed, 'targeted-1-big-four-winds', { pair: 'C1', sets: [pung('WE'), pung('WS'), pung('WW'), pung('WN')] }))
  // 2. Big Three Dragons — 88.
  add(fromSpec(masterSeed, 'targeted-2-big-three-dragons', { pair: 'C9', sets: [pung('DR'), pung('DG'), pung('DW'), chow('C1', 'C2', 'C3')] }))
  // 3. All Green — 88 (2/3/4/6/8 Bamboo + Green Dragon only).
  add(fromSpec(masterSeed, 'targeted-3-all-green', { pair: 'DG', sets: [chow('B2', 'B3', 'B4'), chow('B2', 'B3', 'B4'), pung('B6'), pung('B8')] }))
  // 4. Nine Gates — 88 (fans-88.test.ts's own fixture). PyMahjongGB's own
  // is_nine_gates check runs on the PRE-WIN 13-tile standing hand only
  // (fan_calculator.cpp: "if (!heaven_win && standing_cnt == 13) if
  // (is_nine_gates(standing_tiles))") and requires it to already be the
  // exact canonical 1,1,1,2,3,4,5,6,7,8,9,9,9 shape — so the winning tile
  // MUST be the "extra" 14th tile (here, the second C5), not an arbitrary
  // pick. An earlier run let pickWinningTile choose freely and sometimes
  // landed on a C1/C9, which breaks the canonical pre-win shape and made
  // PyMahjongGB miss Nine Gates entirely (scoring Full Flush instead) even
  // though the full 14-tile hand is unambiguously Nine Gates either way —
  // forcing the win tile here keeps both sides constructing the same
  // pre-win hand, not a claim about which reading is more rulebook-correct.
  add(
    (() => {
      const allocator = new TileAllocator()
      const c5 = allocator.take('C5', 2)
      const concealedTiles = [
        ...allocator.take('C1', 3),
        ...allocator.take('C2', 1), ...allocator.take('C3', 1), ...allocator.take('C4', 1),
        ...c5,
        ...allocator.take('C6', 1), ...allocator.take('C7', 1), ...allocator.take('C8', 1),
        ...allocator.take('C9', 3),
      ]
      return finalize(masterSeed, 'targeted-4-nine-gates', concealedTiles, [], {}, c5[1]!)
    })(),
  )
  // 5. Four Kongs — 88.
  add(kongsHand(masterSeed, 'targeted-5-four-kongs', ['WE', 'C1', 'D5', 'DR'], ['concealed', 'exposedFromDiscard', 'promotedFromPung', 'concealed'], 'B7'))

  // 8. All Terminals — 64.
  add(fromSpec(masterSeed, 'targeted-8-all-terminals', { pair: 'D9', sets: [pung('C1'), pung('C9'), pung('D1'), pung('B9')] }))
  // 9. Little Four Winds — 64.
  add(fromSpec(masterSeed, 'targeted-9-little-four-winds', { pair: 'WN', sets: [pung('WE'), pung('WS'), pung('WW'), chow('C1', 'C2', 'C3')] }))
  // 10. Little Three Dragons — 64.
  add(fromSpec(masterSeed, 'targeted-10-little-three-dragons', { pair: 'DW', sets: [pung('DR'), pung('DG'), chow('C1', 'C2', 'C3'), pung('C5')] }))
  // 11. All Honors — 64.
  add(fromSpec(masterSeed, 'targeted-11-all-honors', { pair: 'DG', sets: [pung('WE'), pung('WS'), pung('DR'), pung('WW')] }))
  // 12. Four Concealed Pungs — 64.
  add(fromSpec(masterSeed, 'targeted-12-four-concealed-pungs', { pair: 'C1', sets: [pung('D2'), pung('D3'), pung('B4'), pung('B5')] }))
  // 13. Pure Terminal Chows — 64.
  add(fromSpec(masterSeed, 'targeted-13-pure-terminal-chows', { pair: 'D5', sets: [chow('D1', 'D2', 'D3'), chow('D1', 'D2', 'D3'), chow('D7', 'D8', 'D9'), chow('D7', 'D8', 'D9')] }))

  // 14. Quadruple Chow — 48.
  add(fromSpec(masterSeed, 'targeted-14-quadruple-chow', { pair: 'D5', sets: [chow('C1', 'C2', 'C3'), chow('C1', 'C2', 'C3'), chow('C1', 'C2', 'C3'), chow('C1', 'C2', 'C3')] }))
  // 15. Four Pure Shifted Pungs — 48.
  add(fromSpec(masterSeed, 'targeted-15-four-pure-shifted-pungs', { pair: 'D5', sets: [pung('C1'), pung('C2'), pung('C3'), pung('C4')] }))

  // 16. Four Shifted Chows (registry name) / "Four Pure Shifted Chows" (PyMahjongGB) — 32.
  add(fromSpec(masterSeed, 'targeted-16-four-shifted-chows', { pair: 'D5', sets: [chow('C1', 'C2', 'C3'), chow('C2', 'C3', 'C4'), chow('C3', 'C4', 'C5'), chow('C4', 'C5', 'C6')] }))
  // 17. Three Kongs — 32.
  add(kongsHand(masterSeed, 'targeted-17-three-kongs', ['WE', 'C1', 'D5'], ['exposedFromDiscard', 'concealed', 'promotedFromPung'], 'B7'))
  // 18. All Terminals and Honors — 32.
  add(fromSpec(masterSeed, 'targeted-18-all-terminals-and-honors', { pair: 'DG', sets: [pung('C1'), pung('WE'), pung('B9'), pung('DR')] }))

  // 21. All Even Pungs — 24.
  add(fromSpec(masterSeed, 'targeted-21-all-even-pungs', { pair: 'B8', sets: [pung('C2'), pung('C4'), pung('D6'), pung('D8')] }))
  // 22. Full Flush — 24.
  add(fromSpec(masterSeed, 'targeted-22-full-flush', { pair: 'C9', sets: [chow('C1', 'C2', 'C3'), chow('C4', 'C5', 'C6'), pung('C7'), chow('C1', 'C2', 'C3')] }))
  // 23. Pure Triple Chow — 24.
  // Built as 3 EXPOSED chow melds, not a concealed decomposition: 3
  // identical chows always use exactly 3 copies of each of 3 consecutive
  // ranks, which decomposeHand's search can equally read as 3 pungs
  // (Triple Pung + Three Concealed Pungs, 32pts) — a higher-scoring
  // candidate that "Freedom to Choose the Highest Points" (§3.9.1.5) always
  // wins over Pure Triple Chow (24pts) alone. Fixing the 3 chows as
  // declared melds removes that alternate reading entirely (an earlier
  // version used fromSpec here and Pure Triple Chow was silently never
  // selected — the coverage report's "23 not exercised" line is what
  // caught it).
  add(
    (() => {
      const allocator = new TileAllocator()
      const melds = [
        makeChowMeld([allocator.take('C3', 1)[0]!, allocator.take('C4', 1)[0]!, allocator.take('C5', 1)[0]!]),
        makeChowMeld([allocator.take('C3', 1)[0]!, allocator.take('C4', 1)[0]!, allocator.take('C5', 1)[0]!]),
        makeChowMeld([allocator.take('C3', 1)[0]!, allocator.take('C4', 1)[0]!, allocator.take('C5', 1)[0]!]),
      ]
      const concealedTiles = allocateDecomp(allocator, { pair: 'D1', sets: [chow('D2', 'D3', 'D4')] })
      return finalize(masterSeed, 'targeted-23-pure-triple-chow', concealedTiles, melds)
    })(),
  )
  // 24. Pure Shifted Pungs — 24.
  add(fromSpec(masterSeed, 'targeted-24-pure-shifted-pungs', { pair: 'D1', sets: [pung('C5'), pung('C6'), pung('C7'), chow('B1', 'B2', 'B3')] }))
  // 25/26/27. Upper/Middle/Lower Tiles — 24 each.
  add(fromSpec(masterSeed, 'targeted-25-upper-tiles', { pair: 'D8', sets: [chow('C7', 'C8', 'C9'), chow('D7', 'D8', 'D9'), chow('B7', 'B8', 'B9'), pung('C7')] }))
  add(fromSpec(masterSeed, 'targeted-26-middle-tiles', { pair: 'D5', sets: [chow('C4', 'C5', 'C6'), chow('D4', 'D5', 'D6'), chow('B4', 'B5', 'B6'), pung('C4')] }))
  add(fromSpec(masterSeed, 'targeted-27-lower-tiles', { pair: 'D2', sets: [chow('C1', 'C2', 'C3'), chow('D1', 'D2', 'D3'), chow('B1', 'B2', 'B3'), pung('C1')] }))

  // 28. Pure Straight — 16.
  add(fromSpec(masterSeed, 'targeted-28-pure-straight', { pair: 'B2', sets: [chow('C1', 'C2', 'C3'), chow('C4', 'C5', 'C6'), chow('C7', 'C8', 'C9'), pung('D5')] }))
  // 29. Three-Suited Terminal Chows — 16.
  add(fromSpec(masterSeed, 'targeted-29-three-suited-terminal-chows', { pair: 'B5', sets: [chow('C1', 'C2', 'C3'), chow('C7', 'C8', 'C9'), chow('D1', 'D2', 'D3'), chow('D7', 'D8', 'D9')] }))
  // 30. Pure Shifted Chows — 16.
  add(fromSpec(masterSeed, 'targeted-30-pure-shifted-chows', { pair: 'B2', sets: [chow('C1', 'C2', 'C3'), chow('C2', 'C3', 'C4'), chow('C3', 'C4', 'C5'), pung('D5')] }))
  // 31. All Fives (registry) / "All Five" (PyMahjongGB) — 16.
  add(fromSpec(masterSeed, 'targeted-31-all-fives', { pair: 'D5', sets: [chow('C3', 'C4', 'C5'), chow('D4', 'D5', 'D6'), pung('B5'), chow('C5', 'C6', 'C7')] }))
  // 32. Triple Pung — 16.
  add(fromSpec(masterSeed, 'targeted-32-triple-pung', { pair: 'C1', sets: [pung('C5'), pung('D5'), pung('B5'), chow('C1', 'C2', 'C3')] }))
  // 33. Three Concealed Pungs — 16 (needs one EXPOSED set to stop it from
  // also being Four Concealed Pungs — one shared allocator so the exposed
  // meld's C1 and the concealed pungs' C5/D5/B5/D1 can never collide on the
  // same physical instance even though they happen to be disjoint types
  // here; sharing one allocator is the generally-correct pattern any time a
  // targeted hand mixes melds with a concealed decomposition).
  add(
    (() => {
      const allocator = new TileAllocator()
      const concealedTiles = [...allocator.take('C5', 3), ...allocator.take('D5', 3), ...allocator.take('B5', 3), ...allocator.take('D1', 2)]
      const meld = makePungMeld(allocator.take('C1', 3), 'exposed')
      return finalize(masterSeed, 'targeted-33-three-concealed-pungs', concealedTiles, [meld])
    })(),
  )

  // 36/37. Upper Four / Lower Four — 12 each.
  add(fromSpec(masterSeed, 'targeted-36-upper-four', { pair: 'B9', sets: [chow('C6', 'C7', 'C8'), pung('D9'), pung('B6'), chow('D7', 'D8', 'D9')] }))
  add(fromSpec(masterSeed, 'targeted-37-lower-four', { pair: 'B1', sets: [chow('C1', 'C2', 'C3'), pung('D1'), pung('B2'), chow('D2', 'D3', 'D4')] }))
  // 38. Big Three Winds — 12.
  add(fromSpec(masterSeed, 'targeted-38-big-three-winds', { pair: 'C1', sets: [pung('WE'), pung('WS'), pung('WW'), chow('D1', 'D2', 'D3')] }))

  // 39. Mixed Straight — 8.
  add(fromSpec(masterSeed, 'targeted-39-mixed-straight', { pair: 'B2', sets: [chow('C1', 'C2', 'C3'), chow('D4', 'D5', 'D6'), chow('B7', 'B8', 'B9'), pung('C5')] }))
  // 40. Reversible Tiles — 8 (all tiles from the visually-symmetric set).
  add(fromSpec(masterSeed, 'targeted-40-reversible-tiles', { pair: 'DW', sets: [chow('D1', 'D2', 'D3'), pung('D8'), pung('B8'), chow('D1', 'D2', 'D3')] }))
  // 41. Mixed Triple Chow — 8.
  add(fromSpec(masterSeed, 'targeted-41-mixed-triple-chow', { pair: 'WE', sets: [chow('C2', 'C3', 'C4'), chow('D2', 'D3', 'D4'), chow('B2', 'B3', 'B4'), pung('C9')] }))
  // 42. Mixed Shifted Pungs — 8.
  add(fromSpec(masterSeed, 'targeted-42-mixed-shifted-pungs', { pair: 'WE', sets: [pung('C3'), pung('D4'), pung('B5'), chow('C6', 'C7', 'C8')] }))

  // 49. All Pungs — 6.
  add(fromSpec(masterSeed, 'targeted-49-all-pungs', { pair: 'C1', sets: [pung('C5'), pung('D7'), pung('B2'), pung('WE')] }))
  // 50. Half Flush — 6.
  add(fromSpec(masterSeed, 'targeted-50-half-flush', { pair: 'WE', sets: [chow('C1', 'C2', 'C3'), chow('C4', 'C5', 'C6'), pung('WS'), chow('C1', 'C2', 'C3')] }))
  // 51. Mixed Shifted Chows — 6.
  add(fromSpec(masterSeed, 'targeted-51-mixed-shifted-chows', { pair: 'WE', sets: [chow('C1', 'C2', 'C3'), chow('D2', 'D3', 'D4'), chow('B3', 'B4', 'B5'), pung('C9')] }))
  // 52. All Types — 6 (chow + pung + honor pung + terminal pung + dragon, five suit families touched).
  add(fromSpec(masterSeed, 'targeted-52-all-types', { pair: 'C5', sets: [chow('C1', 'C2', 'C3'), pung('D9'), pung('B5'), pung('WE')] }))
  // 54. Two Dragon(s) Pungs — 6.
  add(fromSpec(masterSeed, 'targeted-54-two-dragon-pungs', { pair: 'C1', sets: [pung('DR'), pung('DG'), chow('D1', 'D2', 'D3'), chow('B4', 'B5', 'B6')] }))

  // 55. Outside Hand — 4 (every set AND the pair touches a terminal/honor).
  add(fromSpec(masterSeed, 'targeted-55-outside-hand', { pair: 'C1', sets: [chow('C1', 'C2', 'C3'), chow('D7', 'D8', 'D9'), pung('WE'), pung('B9')] }))
  // 57. Two Melded Kongs — 4.
  add(kongsHand(masterSeed, 'targeted-57-two-melded-kongs', ['WE', 'C1'], ['exposedFromDiscard', 'promotedFromPung'], 'B7'))

  // 43. Chicken Hand — 8 (a hand with no other fan at all; every simple-suit
  // chow hand naturally lands here unless it happens to also be All Chows —
  // deliberately using an honor pair + mixed suits to dodge every 1pt fan).
  add(fromSpec(masterSeed, 'targeted-43-chicken-hand', { pair: 'D8', sets: [chow('C2', 'C3', 'C4'), pung('D6'), chow('B3', 'B4', 'B5'), pung('WE')] }))

  // 44-47: win-circumstance-only fans — any structurally plain hand, forced flags.
  add(fromSpec(masterSeed, 'targeted-44-last-tile-draw', { pair: 'D8', sets: [chow('C2', 'C3', 'C4'), pung('D6'), chow('B3', 'B4', 'B5'), pung('C9')] }, { winMethod: 'selfDraw', isLastTileOfWall: true }))
  add(fromSpec(masterSeed, 'targeted-45-last-tile-claim', { pair: 'D8', sets: [chow('C2', 'C3', 'C4'), pung('D6'), chow('B3', 'B4', 'B5'), pung('C9')] }, { winMethod: 'discard', isLastDiscardOfGame: true }))
  // 46. Out with Replacement Tile needs an actual concealed kong meld
  // present (wonOnKongReplacement is only meaningful — and only true in
  // randomWinCircumstance — when hasKong).
  add(
    (() => {
      const allocator = new TileAllocator()
      const kong = makeKongMeld(allocator.take('WE', 4), 'concealed')
      const concealedTiles = allocateDecomp(allocator, { pair: 'D8', sets: [chow('C2', 'C3', 'C4'), pung('D6'), chow('B3', 'B4', 'B5')] })
      return finalize(masterSeed, 'targeted-46-out-with-replacement', concealedTiles, [kong], { winMethod: 'selfDraw', wonOnKongReplacement: true })
    })(),
  )
  // 47. Robbing the Kong — winner must hold ZERO other copies of the
  // winning tile's type (win-circumstance.ts's forcedLastCopy comment: an
  // opponent's own about-to-be-promoted pung has to account for the other
  // 3, which is only physically possible if the winner holds none). C2
  // appears exactly once in this hand (only inside its own chow), so it's
  // picked explicitly as the winning tile rather than trusting
  // pickWinningTile's random choice, which could otherwise land on D6/C9/D8
  // (each with 2-3 other copies already in the winner's own hand) and build
  // a state PyMahjongGB's own structural correction would read differently.
  add(
    (() => {
      const allocator = new TileAllocator()
      const spec: DecompSpec = { pair: 'D8', sets: [chow('C2', 'C3', 'C4'), pung('D6'), chow('B3', 'B4', 'B5'), pung('C9')] }
      const concealedTiles = allocateDecomp(allocator, spec)
      // allocateDecomp's tile order is: pair (2), then each set's tiles in
      // order — so index 2 is the chow's C2, the only type in this hand
      // with exactly 1 physical copy anywhere in the winner's own tiles.
      const winningTile = concealedTiles[2]!
      return finalize(masterSeed, 'targeted-47-robbing-the-kong', concealedTiles, [], { winMethod: 'robKong', isLastCopyOfItsKind: true }, winningTile)
    })(),
  )
  // 48. Two Concealed Kongs — 8 (registry) / 6 (PyMahjongGB) — deliberately
  // exercised as its own targeted case since it's the one fan-map.json
  // flags as a genuine point-value divergence (see that file's
  // _pointValueDivergence note); every run should hit it deterministically
  // rather than hoping the random generator does.
  add(kongsHand(masterSeed, 'targeted-48-two-concealed-kongs', ['WE', 'C1'], ['concealed'], 'B7'))
  // 53. Melded Hand — every one of the 4 sets is an exposed meld (won
  // purely off other players' discards/claims, nothing self-built).
  add(
    (() => {
      const allocator = new TileAllocator()
      const melds = [
        makePungMeld(allocator.take('C5', 3), 'exposed'),
        makePungMeld(allocator.take('D7', 3), 'exposed'),
        makePungMeld(allocator.take('B2', 3), 'exposed'),
        makePungMeld(allocator.take('WE', 3), 'exposed'),
      ]
      const pair = allocator.take('C1', 2)
      return finalize(masterSeed, 'targeted-53-melded-hand', pair, melds, { winMethod: 'discard' })
    })(),
  )
  // 56. Fully Concealed Hand — 0 melds, self-drawn win.
  add(fromSpec(masterSeed, 'targeted-56-fully-concealed-hand', { pair: 'D8', sets: [chow('C2', 'C3', 'C4'), pung('D6'), chow('B3', 'B4', 'B5'), chow('C1', 'C2', 'C3')] }, { winMethod: 'selfDraw' }))
  // 58. Last Tile — forced isLastCopyOfItsKind with a plain discard win (not
  // robKong, which would exclude fan 58 via [47,58] — see exclusions.ts).
  //
  // FIXED (docs/rules/decisions.md #30(h), then #33): the winning tile MUST
  // be one with zero other same-type copies anywhere else in the hand — the
  // forced isLastCopyOfItsKind: true override is only structurally valid
  // when PyMahjongGB's own is4thTile correction (win-circumstance.ts's
  // forcedLastCopy) wouldn't independently force FALSE, which it does
  // whenever the winner's own remaining concealed tiles hold another copy
  // of the winning tile's type. This used to let pickWinningTile choose
  // freely via fromSpec, which could (and did) land on one of the D8 pair
  // tiles — completing a pair always leaves the OTHER pair tile as a
  // same-type spare, guaranteeing PyMahjongGB's override would force FALSE
  // regardless of the flag we send, a guaranteed mismatch. Forced instead
  // to B5, the high tile of the second chow — unique in this hand (no
  // other B5 anywhere), so neither of PyMahjongGB's override conditions
  // apply and it trusts the given flag exactly like our own engine does.
  add(
    (() => {
      const allocator = new TileAllocator()
      const concealedTiles = allocateDecomp(allocator, {
        pair: 'D8',
        sets: [chow('C2', 'C3', 'C4'), pung('D6'), chow('B3', 'B4', 'B5'), pung('C9')],
      })
      const b5 = concealedTiles.find((t) => typeIdOfInstance(t) === 'B5')!
      return finalize(masterSeed, 'targeted-58-last-tile', concealedTiles, [], { winMethod: 'discard', isLastCopyOfItsKind: true }, b5)
    })(),
  )

  // 20. Greater Honors and Knitted Tiles — 24 pts (docs/rules/decisions.md
  // #12/#20). 7 honors + 7 suit singles split 3+3+1 across the 3 different
  // knitted sequences — same composition as win-detection.test.ts's own
  // "Greater-style" fixture. 14 distinct singles, no pair, 0 melds.
  add(
    (() => {
      const allocator = new TileAllocator()
      const singles: TileTypeId[] = ['WE', 'WS', 'WW', 'WN', 'DR', 'DG', 'DW', 'B1', 'B4', 'B7', 'C2', 'C5', 'C8', 'D3']
      const concealedTiles = singles.map((t) => allocator.take(t, 1)[0]!)
      return finalize(masterSeed, 'targeted-20-greater-honors-and-knitted-tiles', concealedTiles, [])
    })(),
  )
  // 34. Lesser Honors and Knitted Tiles — 12 pts. 5 honors + 9 suit singles
  // (3 per suit, one full knitted sequence each) — same composition as
  // win-detection.test.ts's "Lesser-style" fixture.
  add(
    (() => {
      const allocator = new TileAllocator()
      const singles: TileTypeId[] = [
        'WE', 'WS', 'WW', 'DR', 'DG',
        'C1', 'C4', 'C7', 'D2', 'D5', 'D8', 'B3', 'B6', 'B9',
      ]
      const concealedTiles = singles.map((t) => allocator.take(t, 1)[0]!)
      return finalize(masterSeed, 'targeted-34-lesser-honors-and-knitted-tiles', concealedTiles, [])
    })(),
  )
  // 35. Knitted Straight — 12 pts (docs/rules/decisions.md #20, verified
  // directly against App.1 p.34-35: the 9-tile knitted pattern stands in
  // for 3 of the 4 required sets). 1-4-7 Dots + 2-5-8 Characters + 3-6-9
  // Bamboo + a concealed pung of East + a pair of C1 — App.1 p.35's own
  // worked-example pattern, same composition as win-detection.test.ts.
  add(
    (() => {
      const allocator = new TileAllocator()
      const knitted: TileTypeId[] = ['D1', 'D4', 'D7', 'C2', 'C5', 'C8', 'B3', 'B6', 'B9']
      const knittedTiles = knitted.map((t) => allocator.take(t, 1)[0]!)
      const concealedTiles = [...knittedTiles, ...allocator.take('WE', 3), ...allocator.take('C1', 2)]
      return finalize(masterSeed, 'targeted-35-knitted-straight', concealedTiles, [])
    })(),
  )

  return cases
}
