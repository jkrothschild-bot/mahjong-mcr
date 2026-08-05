// Translates this engine's TileTypeId strings (tiles.ts: `${SUIT_PREFIX}${rank}`
// for suits, `W{E,S,W,N}` for winds, `D{R,G,W}` for dragons) into PyMahjongGB's
// tile-code strings, and back.
//
// Confirmed empirically against the installed PyMahjongGB 1.3.0 source
// (MahjongGB/mahjong.cpp's str2tile table — see validation/README.md for how
// to re-derive this), NOT from the pip README alone (KICKOFF-validation-harness.md
// 1b's mandate): W1-W9 = CHARACTERS, T1-T9 = BAMBOO, B1-B9 = DOTS. This is a
// deliberate trap: this engine also uses the letter "B" for its own bamboo
// prefix, but PyMahjongGB's "B" means DOTS. Swapping bamboo/dots here would
// silently corrupt every suited-tile comparison without ever throwing.
//
// Winds: F1=East, F2=South, F3=West, F4=North ("F" for 风/feng).
// Dragons: J1=Red, J2=Green, J3=White ("J" for 箭/jian) — confirmed via
// tile.h's TILE_C/TILE_F/TILE_P (Red/Green/White) occupying honor slots 5-7,
// which mahjong.cpp maps to J1-J3 in that order.
import type { TileTypeId } from '@mahjong-mcr/engine'

const OUR_SUIT_TO_PMGB: Record<'C' | 'D' | 'B', string> = { C: 'W', D: 'B', B: 'T' }
const PMGB_SUIT_TO_OUR: Record<string, 'C' | 'D' | 'B'> = { W: 'C', B: 'D', T: 'B' }

const OUR_WIND_TO_PMGB: Record<string, string> = { WE: 'F1', WS: 'F2', WW: 'F3', WN: 'F4' }
const PMGB_WIND_TO_OUR: Record<string, TileTypeId> = { F1: 'WE', F2: 'WS', F3: 'WW', F4: 'WN' }

const OUR_DRAGON_TO_PMGB: Record<string, string> = { DR: 'J1', DG: 'J2', DW: 'J3' }
const PMGB_DRAGON_TO_OUR: Record<string, TileTypeId> = { J1: 'DR', J2: 'DG', J3: 'DW' }

export function ourTypeIdToPyMahjongGB(typeId: TileTypeId): string {
  const suited = /^([CDB])([1-9])$/.exec(typeId)
  if (suited) {
    const suit = suited[1] as 'C' | 'D' | 'B'
    return `${OUR_SUIT_TO_PMGB[suit]}${suited[2]}`
  }
  if (typeId in OUR_WIND_TO_PMGB) return OUR_WIND_TO_PMGB[typeId]!
  if (typeId in OUR_DRAGON_TO_PMGB) return OUR_DRAGON_TO_PMGB[typeId]!
  throw new Error(`ourTypeIdToPyMahjongGB: unmapped/non-standard type id "${typeId}" (flowers/seasons have no PyMahjongGB tile code — pass flowerCount separately)`)
}

export function pyMahjongGBToOurTypeId(code: string): TileTypeId {
  const suited = /^([WTB])([1-9])$/.exec(code)
  if (suited) {
    const suit = PMGB_SUIT_TO_OUR[suited[1]!]!
    return `${suit}${suited[2]}`
  }
  if (code in PMGB_WIND_TO_OUR) return PMGB_WIND_TO_OUR[code]!
  if (code in PMGB_DRAGON_TO_OUR) return PMGB_DRAGON_TO_OUR[code]!
  throw new Error(`pyMahjongGBToOurTypeId: unmapped tile code "${code}"`)
}
