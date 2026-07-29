import type { ReactNode } from 'react'

export type Tile3DTone = 'face' | 'back' | 'wood'

const EDGE_GRADIENT: Record<Tile3DTone, string> = {
  face: 'linear-gradient(to bottom, #e5ddc8, #8a7654)',
  back: 'linear-gradient(to bottom, #3730a3, #1e1b4b)',
  wood: 'linear-gradient(to bottom, #c9a876, #7a5c33)',
}

export interface Tile3DFaceProps {
  tone: Tile3DTone
  children: ReactNode
}

// Gives any tile box genuine per-tile CSS-3D thickness — a slightly tilted
// "object" layer holding the real front-face content plus a shaded bottom
// edge that reads as the tile's physical side. Requires the box itself to
// already be `relative` with a `perspective` set (tileStyles.ts's shared
// TILE_3D_CONTEXT does this for every tile box), and stays entirely within
// that box's existing overflow-hidden bounds — the footprint never grows,
// so this can't affect the iPad viewport budget. One shared component so
// every tile (hand/meld/discard/concealed-back/wall) gets the identical
// treatment rather than each call site reimplementing the layering.
export function Tile3DFace({ tone, children }: Tile3DFaceProps) {
  return (
    <div className="absolute inset-0 [transform-style:preserve-3d] [transform-origin:bottom] [transform:rotateX(8deg)]">
      <div className="absolute inset-0 [transform:translateZ(3px)]">{children}</div>
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[6px] [transform-origin:top] [transform:rotateX(-90deg)]"
        style={{ background: EDGE_GRADIENT[tone] }}
      />
    </div>
  )
}
