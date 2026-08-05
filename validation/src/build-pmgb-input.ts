// Converts a GeneratedCase into exactly the argument shape
// MahjongFanCalculator expects (verified empirically against the installed
// PyMahjongGB 1.3.0 — see README.md). Two non-obvious rules, both confirmed
// by reading MahjongGB/mahjong-algorithm/shanten.cpp's map_hand_tiles and
// mahjong.cpp's pack parsing directly (not assumed from the pip README):
//
// 1. `hand` (PyMahjongGB's "standing tiles") is 13 - 3*len(pack) tiles —
//    the winning tile is NOT included, unlike this engine's concealedTiles
//    (which always includes it). A kong's 4th physical tile is also not
//    counted against this budget; packs_to_tiles supplies it separately.
// 2. A pack's `offer` field's only semantic meaning to the scorer is
//    `offer === 0` <=> concealed (is_pack_melded checks `offer !== 0`);
//    fan_calculator.cpp never reads offer for anything else, so any nonzero
//    value is fine for an exposed pack. Concealed pungs are never packs at
//    all in this engine's model (meld.ts: only kong can have
//    exposure:'concealed') — they stay in `hand`, discovered by
//    PyMahjongGB's own decomposition exactly like this engine's
//    decomposeHand does.
import { meldTileTypeId, typeIdOfInstance, type TileInstanceId, type Wind } from '@mahjong-mcr/engine'
import type { GeneratedCase } from './case-types.js'
import { ourTypeIdToPyMahjongGB } from './tile-codes.js'

const WIND_INDEX: Record<Wind, number> = { east: 0, south: 1, west: 2, north: 3 }

export type PmgbPackType = 'PENG' | 'GANG' | 'CHI'
export type PmgbPack = [PmgbPackType, string, number]

export interface PmgbInput {
  pack: PmgbPack[]
  hand: string[]
  winTile: string
  flowerCount: number
  isSelfDrawn: boolean
  is4thTile: boolean
  isAboutKong: boolean
  isWallLast: boolean
  seatWind: number
  prevalentWind: number
}

function meldToPack(meld: GeneratedCase['melds'][number]): PmgbPack {
  const typeCode = meld.kind === 'chow'
    // CHI's tile code is the MIDDLE tile of the run (mahjong.cpp doc
    // comment) — meld.tiles is stored low-to-high (see meld.ts), so index 1.
    ? ourTypeIdToPyMahjongGB(typeIdOfInstance(meld.tiles[1]!))
    : ourTypeIdToPyMahjongGB(meldTileTypeId(meld))
  const packType: PmgbPackType = meld.kind === 'chow' ? 'CHI' : meld.kind === 'pung' ? 'PENG' : 'GANG'
  const concealedKong = meld.kind === 'kong' && meld.exposure === 'concealed'
  const offer = concealedKong ? 0 : 1
  return [packType, typeCode, offer]
}

function removeOneInstance(tiles: readonly TileInstanceId[], target: TileInstanceId): TileInstanceId[] {
  const idx = tiles.indexOf(target)
  if (idx === -1) throw new Error(`removeOneInstance: winning tile ${target} not found in concealedTiles`)
  const copy = tiles.slice()
  copy.splice(idx, 1)
  return copy
}

export function buildPmgbInput(hand: GeneratedCase): PmgbInput {
  const pack = hand.melds.map(meldToPack)
  const standingInstances = removeOneInstance(hand.concealedTiles, hand.winningTile)
  const handTiles = standingInstances.map((t) => ourTypeIdToPyMahjongGB(typeIdOfInstance(t)))
  const winTile = ourTypeIdToPyMahjongGB(typeIdOfInstance(hand.winningTile))

  const isSelfDrawn = hand.winMethod === 'selfDraw'
  const isAboutKong = hand.winMethod === 'robKong' || (hand.winMethod === 'selfDraw' && hand.wonOnKongReplacement)
  const isWallLast = isSelfDrawn ? hand.isLastTileOfWall : hand.isLastDiscardOfGame

  return {
    pack,
    hand: handTiles,
    winTile,
    // Always 0 — see generate.ts's header comment: this harness compares
    // basicPoints only, and neither side's fan-name mapping models fan 81
    // (Flower Tiles) as a basicPoints-affecting fan, so flowers are kept out
    // of the comparison entirely rather than juggled on both sides.
    flowerCount: hand.flowerCount,
    isSelfDrawn,
    is4thTile: hand.isLastCopyOfItsKind,
    isAboutKong,
    isWallLast,
    seatWind: WIND_INDEX[hand.seatWind],
    prevalentWind: WIND_INDEX[hand.prevailingWind],
  }
}
