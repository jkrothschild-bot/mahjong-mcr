import { motion, useReducedMotion } from 'motion/react'
import { createContext, useContext, useLayoutEffect, type ReactNode } from 'react'
import { WallDrawMotionContext } from '../board/WallDrawMotion.js'

// Synthetic full-board previews intentionally reuse the finite set of
// physical tile ids across several display-only zones. Shared-layout ids
// must therefore be disabled for that tree or Motion can treat two distinct
// preview tiles as the same object and temporarily hide one of them.
export const SharedLayoutEnabledContext = createContext(true)

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
  // Degrees; defaults to 0. Unused by any current call site (M8 Step 2's
  // concealed-back "face inward" rotation was dropped in Phase 5 when
  // backs folded into the same packed row as melds, which never rotate —
  // see MeldsAndBacks.tsx) — kept as a general capability of this shared
  // primitive, not because anything renders rotated today.
  rotation?: number
  // M8 Step 3: stable cross-zone identity for Framer Motion's shared-
  // layout animation. Two Positioned instances in different renders (even
  // in entirely different component trees — a hand tile unmounting from
  // HandTiles while a Discards tile with the same id mounts) that share a
  // layoutId animate a smooth transition between their positions instead
  // of the tile just appearing at its new spot. Real hand, discard, meld,
  // and concealed-back tiles pass one, keyed to the engine's own
  // TileInstanceId. The physical wall is deliberately the exception:
  // WallRing renders stable authoritative slots without layoutIds, while
  // WallDrawMotion owns a separately-namespaced temporary travel overlay.
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
  const sharedLayoutEnabled = useContext(SharedLayoutEnabledContext)
  const wallDrawMotion = useContext(WallDrawMotionContext)
  const reducedMotion = useReducedMotion()
  const swapped = (((rotation % 180) + 180) % 180) === 90
  const boxWidth = (swapped ? naturalHeight : naturalWidth) * scale
  const boxHeight = (swapped ? naturalWidth : naturalHeight) * scale
  const wallDrawTransition = layoutId === undefined ? undefined : wallDrawMotion.transitions.get(layoutId)
  const isWallDraw = sharedLayoutEnabled && !reducedMotion && wallDrawTransition !== undefined
  const content = scale === 1 ? (
    children
  ) : (
    <div style={{ width: naturalWidth, height: naturalHeight, transform: `scale(${scale})` }}>{children}</div>
  )

  useLayoutEffect(() => {
    if (!isWallDraw || layoutId === undefined) return
    return wallDrawMotion.registerDestination(layoutId, {
      x,
      y,
      width: boxWidth,
      height: boxHeight,
      rotation,
    })
  }, [boxHeight, boxWidth, isWallDraw, layoutId, rotation, wallDrawMotion, x, y])

  return (
    <motion.div
      layout={sharedLayoutEnabled}
      layoutId={sharedLayoutEnabled ? layoutId : undefined}
      initial={false}
      transition={sharedLayoutEnabled ? { duration: 0.35, ease: 'easeInOut' } : { duration: 0 }}
      className={`absolute flex items-center justify-center ${className ?? ''}`}
      style={{
        left: x,
        top: y,
        width: boxWidth,
        height: boxHeight,
        marginLeft: -boxWidth / 2,
        marginTop: -boxHeight / 2,
        rotate: rotation,
        visibility: isWallDraw ? 'hidden' : undefined,
      }}
    >
      {content}
    </motion.div>
  )
}
