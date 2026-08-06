import { describe, expect, it } from 'vitest'
import { FANS_2_DETECTORS } from './fans-2.js'
import type { HandContext } from './types.js'
import type { Decomposition } from '../win-detection.js'
import type { Meld, MeldExposure } from '../meld.js'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileTypeId } from '../tiles.js'

function idsFor(typeId: TileTypeId, count: number): number[] {
  const ids: number[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function pungMeld(id: string, tiles: number[], exposure: MeldExposure = 'exposed'): Meld {
  return { id, kind: 'pung', exposure, tiles, ownerSeat: 0 }
}

function kongMeld(id: string, tiles: number[], exposure: MeldExposure): Meld {
  return { id, kind: 'kong', exposure, kongSource: exposure === 'concealed' ? 'concealed' : 'exposedFromDiscard', tiles, ownerSeat: 0 }
}

function ctxWith(partial: Partial<HandContext>): HandContext {
  return { concealedTiles: [], melds: [], decomposition: null, specialShape: null, ...partial }
}

describe('Dragon Pung (fan 59)', () => {
  it('matches count 1 for a single dragon pung', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'pung', tiles: ['WS', 'WS', 'WS'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_2_DETECTORS[59]!(ctx)).toEqual([{ fanId: 59, count: 1 }])
  })

  it('rejects a hand with no dragon pungs', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'pung', tiles: ['WS', 'WS', 'WS'] },
        { type: 'pung', tiles: ['WW', 'WW', 'WW'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_2_DETECTORS[59]!(ctx)).toEqual([])
  })
})

describe('Prevalent Wind (fan 60)', () => {
  it('matches a pung of the prevailing wind', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
        { type: 'pung', tiles: ['DG', 'DG', 'DG'] },
      ],
    }
    const ctx = ctxWith({ decomposition, prevailingWind: 'east' })
    expect(FANS_2_DETECTORS[60]!(ctx)).toEqual([{ fanId: 60, count: 1 }])
  })

  it('rejects when the wind pung does not match the prevailing wind', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
        { type: 'pung', tiles: ['DG', 'DG', 'DG'] },
      ],
    }
    const ctx = ctxWith({ decomposition, prevailingWind: 'south' })
    expect(FANS_2_DETECTORS[60]!(ctx)).toEqual([])
  })

  it('rejects when prevailingWind is not supplied', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
        { type: 'pung', tiles: ['DG', 'DG', 'DG'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_2_DETECTORS[60]!(ctx)).toEqual([])
  })
})

describe('Seat Wind (fan 61)', () => {
  it('matches a pung of the seat wind', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['WS', 'WS', 'WS'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
        { type: 'pung', tiles: ['DG', 'DG', 'DG'] },
      ],
    }
    const ctx = ctxWith({ decomposition, seatWind: 'south' })
    expect(FANS_2_DETECTORS[61]!(ctx)).toEqual([{ fanId: 61, count: 1 }])
  })

  it('rejects when the wind pung does not match the seat wind', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['WS', 'WS', 'WS'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
        { type: 'pung', tiles: ['DG', 'DG', 'DG'] },
      ],
    }
    const ctx = ctxWith({ decomposition, seatWind: 'north' })
    expect(FANS_2_DETECTORS[61]!(ctx)).toEqual([])
  })
})

describe('Concealed Hand (fan 62)', () => {
  it('matches zero melds plus a discard win', () => {
    const ctx = ctxWith({ melds: [], winMethod: 'discard' })
    expect(FANS_2_DETECTORS[62]!(ctx)).toEqual([{ fanId: 62, count: 1 }])
  })

  it('rejects a self-drawn win', () => {
    const ctx = ctxWith({ melds: [], winMethod: 'selfDraw' })
    expect(FANS_2_DETECTORS[62]!(ctx)).toEqual([])
  })

  it('rejects a hand with any exposed meld', () => {
    const melds = [pungMeld('0-0', idsFor('C5', 3))]
    const ctx = ctxWith({ melds, winMethod: 'discard' })
    expect(FANS_2_DETECTORS[62]!(ctx)).toEqual([])
  })

  // FIXED (docs/rules/decisions.md #30(b), then #33) — same root cause and
  // fix as fan 56's sibling in fans-4.test.ts: §3.6.8 "How to Kong" states
  // a concealed kong does not break concealment ("the hand can be
  // considered to be Concealed (if nothing else is melded)").
  it('matches a discard win that includes only a CONCEALED kong', () => {
    const melds = [kongMeld('0-0', idsFor('WE', 4), 'concealed')]
    const ctx = ctxWith({ melds, winMethod: 'discard' })
    expect(FANS_2_DETECTORS[62]!(ctx)).toEqual([{ fanId: 62, count: 1 }])
  })
})

describe('All Chows (fan 63)', () => {
  it('matches 4 chows and a non-honor pair', () => {
    const decomposition: Decomposition = {
      pair: 'C9',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['D4', 'D5', 'D6'] },
        { type: 'chow', tiles: ['B7', 'B8', 'B9'] },
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_2_DETECTORS[63]!(ctx)).toEqual([{ fanId: 63, count: 1 }])
  })

  it('rejects a hand with any pung', () => {
    const decomposition: Decomposition = {
      pair: 'C9',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['D4', 'D5', 'D6'] },
        { type: 'chow', tiles: ['B7', 'B8', 'B9'] },
        { type: 'pung', tiles: ['C4', 'C4', 'C4'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_2_DETECTORS[63]!(ctx)).toEqual([])
  })

  it('rejects an honor pair even with all chows', () => {
    const decomposition: Decomposition = {
      pair: 'WE',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['D4', 'D5', 'D6'] },
        { type: 'chow', tiles: ['B7', 'B8', 'B9'] },
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_2_DETECTORS[63]!(ctx)).toEqual([])
  })
})

describe('Tile Hog (fan 64)', () => {
  it('matches 4 copies of one type split across a pung and an adjacent chow', () => {
    const concealedTiles = [...idsFor('C5', 3), ...idsFor('C5', 1), ...idsFor('C6', 1), ...idsFor('C7', 1)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_2_DETECTORS[64]!(ctx)).toEqual([{ fanId: 64, count: 1 }])
  })

  it('rejects when the 4 copies are declared as a kong', () => {
    const melds = [kongMeld('0-0', idsFor('C5', 4), 'concealed')]
    const ctx = ctxWith({ melds })
    expect(FANS_2_DETECTORS[64]!(ctx)).toEqual([])
  })

  it('rejects a hand with only 3 copies of any type', () => {
    const concealedTiles = [...idsFor('C5', 3), ...idsFor('D1', 2)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_2_DETECTORS[64]!(ctx)).toEqual([])
  })

  // Regression test for a fixed bug, found by the validation harness
  // (KICKOFF-validation-harness.md Stage 1, docs/rules/decisions.md #24).
  // detectTileHog used to count a meld's contribution as
  // `counts[meldTileTypeId(meld)] += meld.tiles.length` — correct for a
  // pung/kong (all `tiles.length` physical tiles really are the same type),
  // but meldTileTypeId(meld) for a CHOW returns only tiles[0]'s type (the
  // lowest tile — see meld.ts's own meldTileTypeId and set-helpers.ts's
  // allSets, which use this "typeId = tiles[0]" convention deliberately for
  // representing a chow AS a set). Reusing that same convention there
  // silently attributed all 3 of the chow's DIFFERENT tiles (e.g. C1, C2,
  // C3) to a single count bump on C1's type alone — so a hand with an
  // exposed pung of C1 (3 copies) PLUS an exposed chow starting at C1 (a
  // 4th, genuinely different physical C1) read as 4 total C1 copies used
  // without a kong (real Tile Hog) but instead read as count['C1'] = 3
  // (pung) + 3 (chow, wrongly attributed) = 6 — never hitting the `=== 4`
  // check at all, so this real case was silently missed. Found via
  // PyMahjongGB cross-check (Stage 1's 1200-hand run hit this ~78 times —
  // the single largest unexplained bucket after the two missing
  // exclusion-pair families). Fixed by crediting each meld tile's own type
  // individually instead of trusting meldTileTypeId's chow shortcut.
  it('matches Tile Hog when the 4th copy comes from an exposed chow, not the concealed hand', () => {
    const c1 = idsFor('C1', 4) // 4 distinct physical copies of C1
    const pungTiles = c1.slice(0, 3)
    const chowLowTile = c1[3]!
    const chowMeld: Meld = { id: '0-0', kind: 'chow', exposure: 'exposed', tiles: [chowLowTile, ...idsFor('C2', 1), ...idsFor('C3', 1)], ownerSeat: 0 }
    const melds = [pungMeld('0-1', pungTiles), chowMeld]
    const ctx = ctxWith({ melds })
    // All 4 copies of C1 are used (3 in the pung, 1 as the chow's low tile)
    // and none of them are in a kong.
    expect(FANS_2_DETECTORS[64]!(ctx)).toEqual([{ fanId: 64, count: 1 }])
  })

  // FIXED (docs/rules/decisions.md #27, then #33): detectTileHog used to
  // `return` on the FIRST qualifying type it found, undercounting a hand
  // with two separately-hogged types. Confirmed countable, not flat,
  // directly against PyMahjongGB's own per-type scoring (cross-check:
  // several hands score 'Tile Hog': 2 on PyMahjongGB's side).
  it('counts every independently tile-hogged type, not just the first', () => {
    const concealedTiles = [...idsFor('C1', 4), ...idsFor('D9', 4), ...idsFor('B2', 3), ...idsFor('B3', 2)]
    const ctx = ctxWith({ concealedTiles })
    // Both C1 and D9 have all 4 copies used with no kong declared.
    expect(FANS_2_DETECTORS[64]!(ctx)).toEqual([{ fanId: 64, count: 2 }])
  })
})

describe('Double Pung (fan 65)', () => {
  it('matches count 1 for a single shared-rank pair of pungs in two suits', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
        { type: 'pung', tiles: ['D5', 'D5', 'D5'] },
        { type: 'chow', tiles: ['B2', 'B3', 'B4'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_2_DETECTORS[65]!(ctx)).toEqual([{ fanId: 65, count: 1 }])
  })

  it('rejects when only one suit has that rank', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
        { type: 'chow', tiles: ['D4', 'D5', 'D6'] },
        { type: 'chow', tiles: ['B2', 'B3', 'B4'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_2_DETECTORS[65]!(ctx)).toEqual([])
  })
})

describe('Two Concealed Pungs (fan 66)', () => {
  it('matches exactly 2 concealed pungs', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
        { type: 'pung', tiles: ['D3', 'D3', 'D3'] },
        { type: 'chow', tiles: ['B2', 'B3', 'B4'] },
        { type: 'chow', tiles: ['B5', 'B6', 'B7'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_2_DETECTORS[66]!(ctx)).toEqual([{ fanId: 66, count: 1 }])
  })

  it('rejects when one pung is exposed', () => {
    const melds = [pungMeld('0-0', idsFor('WE', 3), 'exposed')]
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
        { type: 'chow', tiles: ['B2', 'B3', 'B4'] },
        { type: 'chow', tiles: ['B5', 'B6', 'B7'] },
      ],
    }
    const ctx = ctxWith({ melds, decomposition })
    expect(FANS_2_DETECTORS[66]!(ctx)).toEqual([])
  })

  it('rejects 3 concealed pungs (Three Concealed Pungs territory instead)', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
        { type: 'pung', tiles: ['D3', 'D3', 'D3'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'chow', tiles: ['B5', 'B6', 'B7'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_2_DETECTORS[66]!(ctx)).toEqual([])
  })

  // FIXED (docs/rules/decisions.md #30(c), then #33). This detector used
  // to claim fan 66's rulebook wording is deliberately "Pungs" only, unlike
  // fan 12/33's "Pungs or Kongs" — but a direct re-read of
  // docs/rules/mcr_EN.pdf's App.1 p.40 worked example for fan 66 itself
  // contradicts that: "Concealed Pung; Concealed Kong, won with a discarded
  // 3 Character. Combined with Double Pung, Concealed Kong, ..." — the
  // fan's own example composes "Two [Concealed Pungs]" from ONE concealed
  // pung PLUS ONE concealed kong. Found via the validation harness
  // (1200-hand cross-check, seed 20260805): several hands with 1 concealed
  // pung + 1 concealed kong scored 'Two Concealed Pungs' on PyMahjongGB's
  // side but not ours.
  it('counts a concealed kong toward the pair, same as a concealed pung', () => {
    const melds = [kongMeld('0-0', idsFor('WE', 4), 'concealed')]
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
        { type: 'chow', tiles: ['B2', 'B3', 'B4'] },
        { type: 'chow', tiles: ['B5', 'B6', 'B7'] },
      ],
    }
    const ctx = ctxWith({ melds, decomposition })
    expect(FANS_2_DETECTORS[66]!(ctx)).toEqual([{ fanId: 66, count: 1 }])
  })

  it('rejects when the concealed kong plus 3 concealed pungs would make four (Four Concealed Pungs territory instead)', () => {
    const melds = [kongMeld('0-0', idsFor('WE', 4), 'concealed')]
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
        { type: 'pung', tiles: ['D3', 'D3', 'D3'] },
        { type: 'pung', tiles: ['B7', 'B7', 'B7'] },
      ],
    }
    const ctx = ctxWith({ melds, decomposition })
    expect(FANS_2_DETECTORS[66]!(ctx)).toEqual([])
  })
})

describe('Concealed Kong (fan 67)', () => {
  it('matches count 1 for a single concealed kong', () => {
    const melds = [kongMeld('0-0', idsFor('WE', 4), 'concealed')]
    const ctx = ctxWith({ melds })
    expect(FANS_2_DETECTORS[67]!(ctx)).toEqual([{ fanId: 67, count: 1 }])
  })

  it('rejects an exposed kong', () => {
    const melds = [kongMeld('0-0', idsFor('WE', 4), 'exposed')]
    const ctx = ctxWith({ melds })
    expect(FANS_2_DETECTORS[67]!(ctx)).toEqual([])
  })
})

describe('All Simples (fan 68)', () => {
  it('matches a hand with no terminal or honor tiles', () => {
    const concealedTiles = [...idsFor('C2', 3), ...idsFor('D5', 3), ...idsFor('B4', 2)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_2_DETECTORS[68]!(ctx)).toEqual([{ fanId: 68, count: 1 }])
  })

  it('rejects a hand containing a terminal', () => {
    const concealedTiles = [...idsFor('C1', 2), ...idsFor('D5', 3)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_2_DETECTORS[68]!(ctx)).toEqual([])
  })

  it('rejects a hand containing an honor', () => {
    const concealedTiles = [...idsFor('WE', 2), ...idsFor('D5', 3)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_2_DETECTORS[68]!(ctx)).toEqual([])
  })
})
