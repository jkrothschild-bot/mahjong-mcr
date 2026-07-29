import type { TileTypeId } from '@mahjong-mcr/engine'

export interface FlowerTileFaceProps {
  typeId: TileTypeId // "F1".."F4" (flower) or "S1".."S4" (season)
}

const FLOWER_ACCENT = '#db2777' // pink — distinct from Characters' red, Dots' blue, Bamboo's green
const SEASON_ACCENT = '#d97706' // amber — distinct from every suit/dragon/wind color already in use

// Originally the only flower/season rendering (no art existed at all);
// now a fallback kept for when tileImageSrc can't resolve an asset — real
// generated SVG art (scripts/generate-tile-art.mjs) normally takes over via
// TileFaceContent. Still satisfies SPEC.md §4's own description of what a
// flower/season tile needs on its own: "numbered, distinct color band,
// never confusable with playing tiles." Same 220:300 viewBox as the real
// tile SVGs, so it drops into the exact same tile-face box either way.
export function FlowerTileFace({ typeId }: FlowerTileFaceProps) {
  const isFlower = typeId.startsWith('F')
  const number = Number(typeId[1])
  const accent = isFlower ? FLOWER_ACCENT : SEASON_ACCENT

  return (
    <svg viewBox="0 0 220 300" className="h-full w-full" role="presentation">
      <rect x="4" y="4" width="212" height="292" rx="18" fill="#faf6ee" stroke="#a8a29e" strokeWidth="4" />
      <text x="24" y="48" fontSize="34" fontWeight="700" fill={accent} fontFamily="Georgia, serif">
        {number}
      </text>
      {isFlower ? <FlowerGlyph color={accent} /> : <SeasonGlyph color={accent} />}
      <text x="110" y="272" fontSize="17" textAnchor="middle" fontWeight="600" fill={accent} fontFamily="Georgia, serif">
        {isFlower ? 'Flower' : 'Season'}
      </text>
    </svg>
  )
}

// A simple 5-petal blossom.
function FlowerGlyph({ color }: { color: string }) {
  const petals = Array.from({ length: 5 }, (_, i) => {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2
    const cx = 110 + Math.cos(angle) * 38
    const cy = 160 + Math.sin(angle) * 38
    const rotationDeg = (angle * 180) / Math.PI + 90
    return (
      <ellipse
        key={i}
        cx={cx}
        cy={cy}
        rx="22"
        ry="34"
        fill={color}
        opacity={0.85}
        transform={`rotate(${rotationDeg} ${cx} ${cy})`}
      />
    )
  })
  return (
    <g>
      {petals}
      <circle cx="110" cy="160" r="17" fill="#fde68a" stroke={color} strokeWidth="3" />
    </g>
  )
}

// A simple sun/wheel motif.
function SeasonGlyph({ color }: { color: string }) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * Math.PI) / 4
    const x1 = 110 + Math.cos(angle) * 46
    const y1 = 160 + Math.sin(angle) * 46
    const x2 = 110 + Math.cos(angle) * 66
    const y2 = 160 + Math.sin(angle) * 66
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="6" strokeLinecap="round" />
  })
  return (
    <g>
      {rays}
      <circle cx="110" cy="160" r="42" fill="none" stroke={color} strokeWidth="6" />
    </g>
  )
}
