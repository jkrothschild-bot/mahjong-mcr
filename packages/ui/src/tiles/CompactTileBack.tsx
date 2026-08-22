import type { CSSProperties } from 'react'

export const COMPACT_TILE_BACK_STYLE: CSSProperties = {
  backgroundColor: '#0b4b50',
  backgroundImage:
    'linear-gradient(135deg,rgba(255,255,255,0.2),transparent 38%),repeating-linear-gradient(45deg,rgba(94,234,212,0.1) 0 1px,transparent 1px 4px)',
  boxShadow: 'inset 1px 1px 1px rgba(255,255,255,0.24),inset -1px -1px 1px rgba(0,18,20,0.48)',
}

export const COMPACT_TILE_BODY_STYLE: CSSProperties = {
  background: 'linear-gradient(145deg,#fff9e8 0%,#e9ddbf 62%,#bca77a 100%)',
  border: '1px solid rgba(114,91,49,0.9)',
  boxShadow: 'inset 1px 1px rgba(255,255,255,0.72),inset -1px -1px rgba(100,75,36,0.28),1px 2px 3px rgba(0,0,0,0.48)',
}

export interface CompactTileBackProps {
  className?: string
  style?: CSSProperties
}

// A small, top-down companion to TileBackContent. Wall slots and travelling
// draw overlays need much less depth than a hand tile, but share the same
// ivory body, teal patterned back, bevel and restrained shadow language.
export function CompactTileBack({ className, style }: CompactTileBackProps) {
  return (
    <div
      data-compact-tile-body="true"
      className={`relative h-full w-full overflow-hidden rounded-[3px] ${className ?? ''}`}
      style={{ ...COMPACT_TILE_BODY_STYLE, ...style }}
    >
      <div
        data-compact-tile-back="true"
        className="absolute left-[1px] right-[2px] top-[1px] bottom-[3px] rounded-[2px] border border-[#d6c28e]/80"
        style={COMPACT_TILE_BACK_STYLE}
      />
    </div>
  )
}
