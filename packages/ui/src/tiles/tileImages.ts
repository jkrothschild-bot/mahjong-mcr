import { parseSuited, type TileTypeId } from '@mahjong-mcr/engine'

// Eagerly bundles every PNG under tiles/assets/ once, keyed by bare filename
// (no extension) — Vite hashes each URL and rewrites it under the app's
// /mahjong-mcr/ base path automatically, unlike a hardcoded string path.
const modules = import.meta.glob('./assets/*.png', { eager: true, import: 'default' }) as Record<string, string>
const ASSET_BY_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([path, url]) => [path.replace(/^.*\//, '').replace(/\.png$/, ''), url]),
)

// The asset filenames use mahjong's traditional m(Characters)/p(Dots)/
// s(Bamboo) and C(Chun/red)/F(Faat/green)/P(Pak/white) dragon conventions —
// neither matches the engine's own TileTypeId codes (C/D/B for suits,
// DR/DG/DW for dragons), so this translation is load-bearing, not cosmetic.
const SUIT_ASSET_PREFIX: Record<'C' | 'D' | 'B', string> = { C: 'm', D: 'p', B: 's' }
const HONOR_ASSET_KEY: Record<string, string> = {
  WE: 'E',
  WS: 'S',
  WW: 'W',
  WN: 'N',
  DR: 'C',
  DG: 'F',
  DW: 'P',
}

function assetKeyFor(typeId: TileTypeId): string | undefined {
  const suited = parseSuited(typeId)
  if (suited) return `${SUIT_ASSET_PREFIX[suited.suit]}${suited.rank}`
  return HONOR_ASSET_KEY[typeId]
}

// Real art only exists for the 34 standard tile types — flowers/seasons
// have none yet (SPEC.md §4's known gap) and aren't rendered as tiles
// anywhere in the UI today. Callers fall back to the plain text label.
export function tileImageSrc(typeId: TileTypeId): string | undefined {
  const key = assetKeyFor(typeId)
  return key ? ASSET_BY_KEY[key] : undefined
}

export function botBackImageSrc(): string {
  return ASSET_BY_KEY['bot-back']!
}
