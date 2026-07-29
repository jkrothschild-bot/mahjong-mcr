// Regenerates packages/ui/src/tiles/assets/*.svg from the vendored
// FluffyStuff/riichi-mahjong-tiles PNG exports (see
// ../src/tiles/vendor/riichi-mahjong-tiles/NOTICE.md for provenance).
//
// CLAUDE.md requires suit numerals and wind/dragon letters to be "baked
// directly into tile face artwork... never a separate corner badge or HTML
// overlay" — so this script bakes a numeral/letter badge, plus a tile-
// shaped background (ivory face + gold border + a dark-green base sliver,
// matching SPEC.md §5c's "reads as a physical object" bar), directly into
// each generated SVG at asset-build time. The app only ever loads the
// finished, single-file SVG — no runtime layering.
//
// Re-run after an upstream FluffyStuff update: `node scripts/generate-tile-art.mjs`
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VENDOR_DIR = join(__dirname, '../src/tiles/vendor/riichi-mahjong-tiles/Export/Regular')
const OUT_DIR = join(__dirname, '../src/tiles/assets')

const SUIT_BADGE_COLOR = { m: '#b91c1c', p: '#1d4ed8', s: '#15803d' }
const HONOR_BADGE_COLOR = { E: '#b91c1c', S: '#b91c1c', W: '#b91c1c', N: '#b91c1c', C: '#b91c1c', F: '#15803d', P: '#1d4ed8' }

// asset key -> [FluffyStuff filename (no .png), badge text]
const SUIT_SOURCE = { m: 'Man', p: 'Pin', s: 'Sou' }
const HONOR_TILES = { E: 'Ton', S: 'Nan', W: 'Shaa', N: 'Pei', C: 'Chun', F: 'Hatsu', P: 'Haku' }

function tiles() {
  const list = []
  for (const [key, prefix] of Object.entries(SUIT_SOURCE)) {
    for (let rank = 1; rank <= 9; rank++) {
      list.push({ assetKey: `${key}${rank}`, source: `${prefix}${rank}`, badge: String(rank), badgeColor: SUIT_BADGE_COLOR[key], badgeSide: 'left' })
    }
  }
  for (const [assetKey, source] of Object.entries(HONOR_TILES)) {
    list.push({ assetKey, source, badge: assetKey, badgeColor: HONOR_BADGE_COLOR[assetKey], badgeSide: 'right' })
  }
  return list
}

function badgeText({ badge, badgeColor, badgeSide }) {
  const x = badgeSide === 'left' ? 18 : 202
  const anchor = badgeSide === 'left' ? 'start' : 'end'
  return `<text x="${x}" y="44" font-size="36" font-weight="800" font-family="Georgia, serif" text-anchor="${anchor}" fill="${badgeColor}" stroke="#fff" stroke-width="0.6" paint-order="stroke">${badge}</text>`
}

// Upstream's White Dragon (Haku) glyph is a traditionally-blank tile — an
// intentional design, but next to 7 other richly-illustrated honor tiles it
// reads as missing art rather than "this tile is deliberately blank,"
// especially for a beginner audience. Draw the same nested-rectangle frame
// motif the previous custom art used instead of embedding the blank PNG.
function whiteDragonMotif() {
  return `<rect x="42" y="90" width="136" height="180" rx="14" fill="none" stroke="#1d4ed8" stroke-width="10" />
  <rect x="60" y="108" width="100" height="144" rx="8" fill="none" stroke="#1d4ed8" stroke-width="6" />`
}

function tileSvg(tile) {
  // Upstream exports are 600x800 (3:4); fit into a 140-wide box within our
  // 220x300 tile-face viewBox, roughly centered with room for the badge.
  const imgW = 140
  const imgH = (imgW * 800) / 600
  const imgX = (220 - imgW) / 2
  const imgY = 82

  const glyph =
    tile.assetKey === 'P'
      ? whiteDragonMotif()
      : (() => {
          const pngPath = join(VENDOR_DIR, `${tile.source}.png`)
          const b64 = readFileSync(pngPath).toString('base64')
          return `<image x="${imgX}" y="${imgY}" width="${imgW}" height="${imgH}" href="data:image/png;base64,${b64}" preserveAspectRatio="xMidYMid meet" />`
        })()

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 300" role="presentation">
  <defs>
    <linearGradient id="face" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fffdf7" />
      <stop offset="100%" stop-color="#ede0c0" />
    </linearGradient>
  </defs>
  <rect x="6" y="10" width="210" height="284" rx="16" fill="#0b3d24" />
  <rect x="2" y="2" width="210" height="284" rx="16" fill="url(#face)" stroke="#b8935a" stroke-width="3" />
  ${glyph}
  ${badgeText(tile)}
</svg>
`
}

for (const tile of tiles()) {
  const svg = tileSvg(tile)
  writeFileSync(join(OUT_DIR, `${tile.assetKey}.svg`), svg)
}

console.log(`Generated ${tiles().length} tile-face SVGs into ${OUT_DIR}`)
