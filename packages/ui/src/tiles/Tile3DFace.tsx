import type { ReactNode } from 'react'

export type Tile3DTone = 'face' | 'back' | 'wood'

const EDGE_GRADIENT: Record<Tile3DTone, string> = {
  face: 'linear-gradient(to bottom, #e5ddc8, #8a7654)',
  back: 'linear-gradient(to bottom, #1b676b, #07363a 58%, #032529)',
  wood: 'linear-gradient(to bottom, #c9a876, #7a5c33)',
}

export interface Tile3DFaceProps {
  tone: Tile3DTone
  children: ReactNode
}

// Gives any tile box per-tile CSS-3D thickness via a shaded bottom edge
// that reads as the tile's physical side. Requires the box itself to
// already be `relative` with a `perspective` set (tileStyles.ts's shared
// TILE_3D_CONTEXT does this for every tile box), and stays entirely within
// that box's existing overflow-hidden bounds — the footprint never grows,
// so this can't affect the iPad viewport budget. One shared component so
// every tile (hand/meld/discard/concealed-back/wall) gets the identical
// treatment rather than each call site reimplementing the layering.
//
// The front-face content (`children`) deliberately does NOT sit inside the
// rotated/preserve-3d group below — it used to (a `rotateX(8deg)` tilt on
// the whole "object" layer, content included), and the numeral/glyph art
// was reported illegible as a direct result: rotating a raster image (the
// vendored PNG art baked into each face SVG, tiles/tileImages.ts) even a
// few degrees in 3D forces the browser to resample it off-axis, which
// reads as soft/blurry regardless of source resolution — confirmed by
// screenshotting the same tile with and without the rotation. Only the
// bottom edge sliver (a flat color gradient, where sub-pixel resampling is
// invisible) still gets the tilt; the face itself renders perfectly flat,
// trading a few degrees of illusory tilt for SPEC.md §5a's legibility bar
// — the shadow (TILE_3D_CONTEXT) and edge sliver still read as "physical
// object" for §5c.
export function Tile3DFace({ tone, children }: Tile3DFaceProps) {
  return (
    <>
      <div className="absolute inset-0">{children}</div>
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[6px] origin-top [transform:rotateX(-90deg)]"
        style={{ background: EDGE_GRADIENT[tone] }}
      />
    </>
  )
}
