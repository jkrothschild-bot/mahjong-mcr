import { parseSuited, type TileTypeId } from '@mahjong-mcr/engine'

// Eagerly bundles every PNG/SVG under tiles/assets/ once, keyed by bare
// filename (no extension) — Vite hashes each URL and rewrites it under the
// app's /mahjong-mcr/ base path automatically, unlike a hardcoded string
// path. The 34 standard tile faces are generated SVGs (see
// scripts/generate-tile-art.mjs); bot-back stays a plain PNG.
const modules = import.meta.glob('./assets/*.{png,svg}', { eager: true, import: 'default' }) as Record<string, string>
const ASSET_BY_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([path, url]) => [path.replace(/^.*\//, '').replace(/\.(png|svg)$/, ''), url]),
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

// Flower/season asset FILE names are "flowerN"/"seasonN", not "F1"/"S1" —
// Windows/macOS default filesystems are case-insensitive, so a file named
// "S1.svg" silently collides with the already-written "s1.svg" (Bamboo 1).
// That collision actually happened on first generation and clobbered 4 real
// bamboo-tile assets before it was caught; see generate-tile-art.mjs.
function flowerSeasonAssetKey(typeId: TileTypeId): string | undefined {
  const match = /^([FS])([1-4])$/.exec(typeId)
  if (!match) return undefined
  return `${match[1] === 'F' ? 'flower' : 'season'}${match[2]}`
}

function assetKeyFor(typeId: TileTypeId): string | undefined {
  const suited = parseSuited(typeId)
  if (suited) return `${SUIT_ASSET_PREFIX[suited.suit]}${suited.rank}`
  return flowerSeasonAssetKey(typeId) ?? HONOR_ASSET_KEY[typeId]
}

// All 42 real tile types (34 standard + 8 flower/season) have art —
// flowers/seasons are original hand-coded SVGs (see
// scripts/generate-tile-art.mjs and THIRD_PARTY_LICENSES.md), not vendored
// from any external set. Undefined is still possible if an asset is ever
// missing; callers fall back to the plain text label.
export function tileImageSrc(typeId: TileTypeId): string | undefined {
  const key = assetKeyFor(typeId)
  return key ? ASSET_BY_KEY[key] : undefined
}

export function botBackImageSrc(): string {
  return ASSET_BY_KEY['bot-back']!
}
