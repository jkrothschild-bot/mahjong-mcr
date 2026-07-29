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
  className?: string
  children: ReactNode
}

// Places a game object at an explicit stage-space center. A rotation that's
// an odd multiple of 90° swaps which dimension reads as "width" on screen —
// the outer box is sized to that POST-rotation footprint (not the raw
// natural size) so a rotated tile's visual footprint doesn't quietly
// overhang into a neighboring tile's space, which the layout's spacing
// (computed in stageLayout.ts assuming each tile's *unrotated* size) isn't
// expecting. The child renders at its own natural size and is centered via
// flexbox — deliberately not a translate(-50%,-50%)-based centering trick,
// which composes ambiguously with a sibling scale() in the same transform;
// flexbox centering plus a scale() with its default (center) transform-
// origin has no such ambiguity; the scaled/rotated child stays centered
// regardless of scale.
export function Positioned({ x, y, naturalWidth, naturalHeight, scale = 1, rotation = 0, className, children }: PositionedProps) {
  const swapped = (((rotation % 180) + 180) % 180) === 90
  const boxWidth = (swapped ? naturalHeight : naturalWidth) * scale
  const boxHeight = (swapped ? naturalWidth : naturalHeight) * scale

  return (
    <div
      className={`absolute flex items-center justify-center ${className ?? ''}`}
      style={{
        left: x,
        top: y,
        width: boxWidth,
        height: boxHeight,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      }}
    >
      {scale === 1 ? (
        children
      ) : (
        <div style={{ width: naturalWidth, height: naturalHeight, transform: `scale(${scale})` }}>{children}</div>
      )}
    </div>
  )
}
