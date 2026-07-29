// Regenerates packages/ui/src/tiles/assets/*.svg — the 34 standard tiles
// from the vendored FluffyStuff/riichi-mahjong-tiles PNG exports (see
// ../src/tiles/vendor/riichi-mahjong-tiles/NOTICE.md for provenance), plus
// the 8 flower/season tiles as original hand-coded artwork (no external
// source — see THIRD_PARTY_LICENSES.md).
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

// asset key -> FluffyStuff filename (no extension)
const SUIT_SOURCE = { m: 'Man', p: 'Pin', s: 'Sou' }
const HONOR_TILES = { E: 'Ton', S: 'Nan', W: 'Shaa', N: 'Pei', C: 'Chun', F: 'Hatsu', P: 'Haku' }

function deg(cx, cy, r, angleDeg) {
  const a = (angleDeg * Math.PI) / 180
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
}

// --- Original flower/season artwork (hand-coded, not vendored) -----------
// The "Four Gentlemen" plants, traditional for MCR's flower tiles.
function plumBlossom() {
  const cx = 110,
    cy = 178
  const petals = Array.from({ length: 5 }, (_, i) => {
    const angle = (i * 360) / 5 - 90
    const [px, py] = deg(cx, cy, 36, angle)
    return `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="21" ry="30" fill="#db2777" opacity="0.88" transform="rotate(${(angle + 90).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)})" />`
  }).join('\n  ')
  return `${petals}\n  <circle cx="${cx}" cy="${cy}" r="13" fill="#fde68a" stroke="#db2777" stroke-width="3" />`
}

function orchid() {
  const pivotX = 110,
    pivotY = 232
  // Elongated ellipses fanning up and outward from a bottom pivot — same
  // "offset ellipse, rotated to face outward" technique as plumBlossom's
  // radially-symmetric petals, just over a narrower upward arc instead of
  // a full circle.
  const offsets = [-62, -31, 0, 31, 62] // degrees from straight up
  const petals = offsets
    .map((off, i) => {
      const angle = -90 + off
      const len = i === 2 ? 78 : 64
      const r = len / 2
      const width = i === 2 ? 16 : 13
      const [px, py] = deg(pivotX, pivotY, r, angle)
      return `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${width}" ry="${r.toFixed(1)}" fill="#9333ea" opacity="0.85" transform="rotate(${(angle + 90).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)})" />`
    })
    .join('\n  ')
  return `${petals}\n  <circle cx="${pivotX}" cy="${(pivotY - 14).toFixed(1)}" r="9" fill="#fbbf24" stroke="#9333ea" stroke-width="2" />`
}

function chrysanthemum() {
  const cx = 110,
    cy = 178
  const petals = Array.from({ length: 18 }, (_, i) => {
    const angle = (i * 360) / 18
    const [px, py] = deg(cx, cy, 34, angle)
    return `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="6" ry="42" fill="#ca8a04" opacity="0.85" transform="rotate(${(angle + 90).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)})" />`
  }).join('\n  ')
  return `${petals}\n  <circle cx="${cx}" cy="${cy}" r="14" fill="#92400e" />`
}

function bambooPlant() {
  const stalk = (x, topY, botY) => {
    const nodes = [0.3, 0.55, 0.8].map((t) => `<line x1="${x - 8}" y1="${(topY + (botY - topY) * t).toFixed(1)}" x2="${x + 8}" y2="${(topY + (botY - topY) * t).toFixed(1)}" stroke="#0b3d24" stroke-width="3" />`).join('\n  ')
    return `<rect x="${x - 8}" y="${topY}" width="16" height="${botY - topY}" rx="6" fill="#16a34a" />\n  ${nodes}`
  }
  const leaf = (x, y, angle) => {
    const [tipX, tipY] = deg(x, y, 42, angle)
    return `<path d="M ${x} ${y} Q ${((x + tipX) / 2 + 8).toFixed(1)} ${((y + tipY) / 2).toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)} Q ${((x + tipX) / 2 - 8).toFixed(1)} ${((y + tipY) / 2).toFixed(1)} ${x} ${y} Z" fill="#16a34a" opacity="0.9" />`
  }
  return [
    stalk(92, 120, 250),
    stalk(130, 96, 250),
    leaf(92, 128, -150),
    leaf(92, 118, -110),
    leaf(130, 104, -160),
    leaf(130, 100, -60),
  ].join('\n  ')
}

const FLOWER_GLYPH = { F1: plumBlossom, F2: orchid, F3: chrysanthemum, F4: bambooPlant }
const FLOWER_BADGE_COLOR = { F1: '#db2777', F2: '#9333ea', F3: '#ca8a04', F4: '#16a34a' }

// Seasons: sun / fan / moon / snowflake — geometric rather than botanical,
// so the two families read as visually distinct groups at a glance.
function sunIcon() {
  const cx = 110,
    cy = 178
  const rays = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 360) / 12
    const [x1, y1] = deg(cx, cy, 40, angle)
    const [x2, y2] = deg(cx, cy, 62, angle)
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#f59e0b" stroke-width="7" stroke-linecap="round" />`
  }).join('\n  ')
  return `${rays}\n  <circle cx="${cx}" cy="${cy}" r="34" fill="#f59e0b" />`
}

function fanIcon() {
  const pivotX = 110,
    pivotY = 244
  const r = 100
  const startAngle = -160,
    endAngle = -20
  const [startX, startY] = deg(pivotX, pivotY, r, startAngle)
  const [endX, endY] = deg(pivotX, pivotY, r, endAngle)
  const folds = [-140, -110, -80, -50].map((angle) => {
    const [x, y] = deg(pivotX, pivotY, r, angle)
    return `<line x1="${pivotX}" y1="${pivotY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#c2410c" stroke-width="2" opacity="0.6" />`
  }).join('\n  ')
  return `<path d="M ${pivotX} ${pivotY} L ${startX.toFixed(1)} ${startY.toFixed(1)} A ${r} ${r} 0 0 1 ${endX.toFixed(1)} ${endY.toFixed(1)} Z" fill="#ea580c" opacity="0.88" />
  ${folds}
  <circle cx="${pivotX}" cy="${pivotY}" r="8" fill="#7c2d12" />`
}

function moonIcon() {
  const cx = 108,
    cy = 172
  return `<circle cx="${cx}" cy="${cy}" r="46" fill="#4338ca" />
  <circle cx="${cx + 22}" cy="${cy - 12}" r="42" fill="#fffdf7" />
  <circle cx="70" cy="230" r="4" fill="#4338ca" />
  <circle cx="60" cy="210" r="3" fill="#4338ca" />
  <circle cx="82" cy="245" r="2.5" fill="#4338ca" />`
}

function snowflakeIcon() {
  const cx = 110,
    cy = 178
  const arms = [0, 60, 120].map((baseAngle) => {
    const [x1, y1] = deg(cx, cy, 52, baseAngle)
    const [x2, y2] = deg(cx, cy, 52, baseAngle + 180)
    const branches = [0.35, 0.65]
      .flatMap((t) => {
        const mx = cx + (x1 - cx) * t
        const my = cy + (y1 - cy) * t
        const [bx1, by1] = deg(mx, my, 14, baseAngle + 40)
        const [bx2, by2] = deg(mx, my, 14, baseAngle - 40)
        return [
          `<line x1="${mx.toFixed(1)}" y1="${my.toFixed(1)}" x2="${bx1.toFixed(1)}" y2="${by1.toFixed(1)}" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round" />`,
          `<line x1="${mx.toFixed(1)}" y1="${my.toFixed(1)}" x2="${bx2.toFixed(1)}" y2="${by2.toFixed(1)}" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round" />`,
        ]
      })
      .join('\n  ')
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#0ea5e9" stroke-width="7" stroke-linecap="round" />\n  ${branches}`
  })
  return arms.join('\n  ') + `\n  <circle cx="${cx}" cy="${cy}" r="7" fill="#0ea5e9" />`
}

const SEASON_GLYPH = { S1: sunIcon, S2: fanIcon, S3: moonIcon, S4: snowflakeIcon }
const SEASON_BADGE_COLOR = { S1: '#f59e0b', S2: '#ea580c', S3: '#4338ca', S4: '#0ea5e9' }

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
  // Asset FILE names deliberately don't reuse the engine's own "F1".."S4"
  // type IDs: Windows/macOS default filesystems are case-insensitive, so a
  // file named "S1.svg" (season) silently collides with the already-written
  // "s1.svg" (Bamboo 1) — which is exactly what happened here on first
  // generation, clobbering 4 real bamboo-tile assets with season art before
  // this was caught. "flowerN"/"seasonN" can never collide with anything.
  for (const [typeId, glyphFn] of Object.entries(FLOWER_GLYPH)) {
    const n = typeId[1]
    list.push({ assetKey: `flower${n}`, glyphFn, badge: n, badgeColor: FLOWER_BADGE_COLOR[typeId], badgeSide: 'left' })
  }
  for (const [typeId, glyphFn] of Object.entries(SEASON_GLYPH)) {
    const n = typeId[1]
    list.push({ assetKey: `season${n}`, glyphFn, badge: n, badgeColor: SEASON_BADGE_COLOR[typeId], badgeSide: 'left' })
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

function glyphFor(tile) {
  if (tile.glyphFn) return tile.glyphFn()
  if (tile.assetKey === 'P') return whiteDragonMotif()

  // Upstream exports are 600x800 (3:4); fit into a 140-wide box within our
  // 220x300 tile-face viewBox, roughly centered with room for the badge.
  const imgW = 140
  const imgH = (imgW * 800) / 600
  const imgX = (220 - imgW) / 2
  const imgY = 82
  const pngPath = join(VENDOR_DIR, `${tile.source}.png`)
  const b64 = readFileSync(pngPath).toString('base64')
  return `<image x="${imgX}" y="${imgY}" width="${imgW}" height="${imgH}" href="data:image/png;base64,${b64}" preserveAspectRatio="xMidYMid meet" />`
}

function tileSvg(tile) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 300" role="presentation">
  <defs>
    <linearGradient id="face" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fffdf7" />
      <stop offset="100%" stop-color="#ede0c0" />
    </linearGradient>
  </defs>
  <rect x="6" y="10" width="210" height="284" rx="16" fill="#0b3d24" />
  <rect x="2" y="2" width="210" height="284" rx="16" fill="url(#face)" stroke="#b8935a" stroke-width="3" />
  ${glyphFor(tile)}
  ${badgeText(tile)}
</svg>
`
}

for (const tile of tiles()) {
  const svg = tileSvg(tile)
  writeFileSync(join(OUT_DIR, `${tile.assetKey}.svg`), svg)
}

console.log(`Generated ${tiles().length} tile-face SVGs into ${OUT_DIR}`)
