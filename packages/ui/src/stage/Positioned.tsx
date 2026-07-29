import { motion } from 'motion/react'
import type { ReactNode } from 'react'

export interface PositionedProps {
  // Final, already-scaled stage-space center (from stageLayout.ts's
  // placeGroup) — center-anchored is the simplest placement model.
  x: number
  y: number
  // The child's own intrinsic (unscaled) size — e.g. tileFaceClassName's
  // fixed Tailwind box size. Positioned never overrides that styling.
  naturalWidth: number
  naturalHeight: number
  // The group's fitScale (computeRowPositions/computeGridPositions) — 1
  // unless the group didn't fit its region at natural size.
  scale?: number
  // Degrees; defaults to 0 — Step 1 left every rotation at 0. M8 Step 2
  // uses this for concealed-back tiles only (see stageLayout.ts's
  // SEAT_BACK_ROTATION comment on why nothing else rotates).
  rotation?: number
  // M8 Step 3: stable cross-zone identity for Framer Motion's shared-
  // layout animation. Two Positioned instances in different renders (even
  // in entirely different component trees — a hand tile unmounting from
  // HandTiles while a Discards tile with the same id mounts) that share a
  // layoutId animate a smooth transition between their positions instead
  // of the tile just appearing at its new spot. Every real tile group
  // (hand/discards/melds/concealed backs/wall) passes one, keyed to the
  // engine's own TileInstanceId; Seat's own identity header — which never
  // changes zones — doesn't need one.
  layoutId?: string
  className?: string
  children: ReactNode
}

// Places a game object at an explicit stage-space center. A rotation that's
// an odd multiple of 90° swaps which dimension reads as "width" on screen —
// the outer box is sized to that POST-rotation footprint (not the raw
// natural size) so a rotated tile's visual footprint doesn't quietly
// overhang into a neighboring tile's space, which the layout's spacing
// (computed in stageLayout.ts assuming each tile's *unrotated* size) isn't
// expecting.
//
// Centering uses `left`/`top` plus negative margins, not a
// `transform: translate(-50%,-50%)` string — Framer Motion's `layout`
// animation needs to own the `transform` property outright to compose its
// own FLIP interpolation with authored rotation, so rotation is expressed
// via the `rotate` style shorthand (which composes correctly) rather than
// baked into a hand-written transform string. The child renders at its own
// natural size and is centered via flexbox for the same reason a scaled
// child was in Step 2 — no translate/scale composition ambiguity.
export function Positioned({
  x,
  y,
  naturalWidth,
  naturalHeight,
  scale = 1,
  rotation = 0,
  layoutId,
  className,
  children,
}: PositionedProps) {
  const swapped = (((rotation % 180) + 180) % 180) === 90
  const boxWidth = (swapped ? naturalHeight : naturalWidth) * scale
  const boxHeight = (swapped ? naturalWidth : naturalHeight) * scale

  return (
    <motion.div
      layout
      layoutId={layoutId}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className={`absolute flex items-center justify-center ${className ?? ''}`}
      style={{
        left: x,
        top: y,
        width: boxWidth,
        height: boxHeight,
        marginLeft: -boxWidth / 2,
        marginTop: -boxHeight / 2,
        rotate: rotation,
      }}
    >
      {scale === 1 ? (
        children
      ) : (
        <div style={{ width: naturalWidth, height: naturalHeight, transform: `scale(${scale})` }}>{children}</div>
      )}
    </motion.div>
  )
}
