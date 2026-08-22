import { motion, useReducedMotion } from 'motion/react'
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Action, Seat, TileInstanceId, Wall } from '@mahjong-mcr/engine'
import { useStageMetrics } from '../stage/StageMetricsContext.js'
import { getBoardRegions, type Rect } from '../stage/stageLayout.js'
import { CompactTileBack } from '../tiles/CompactTileBack.js'
import { buildPhysicalWall, type WallEdge } from './physicalWall.js'
import { physicalWallTileRect, wallTileLongSizeFromSideRegion } from './wallTilePresentation.js'

export const WALL_DRAW_DELAY_SECONDS = 0.12
export const WALL_DRAW_DURATION_SECONDS = 0.36
export const WALL_DRAW_CLEANUP_MS = 600

export interface WallDrawTransition {
  id: string
  tileId: TileInstanceId
  source: Rect
}

export interface WallDrawDestination extends Rect {
  rotation: number
}

interface PendingDraw {
  id: string
  tileId: TileInstanceId
}

interface WallDrawMotionContextValue {
  transitions: ReadonlyMap<string, WallDrawTransition>
  registerDestination: (layoutId: string, destination: WallDrawDestination) => () => void
}

const EMPTY_TRANSITIONS: ReadonlyMap<string, WallDrawTransition> = new Map()
const NOOP_UNREGISTER = () => {}

export const WallDrawMotionContext = createContext<WallDrawMotionContextValue>({
  transitions: EMPTY_TRANSITIONS,
  registerDestination: () => NOOP_UNREGISTER,
})

// Only the trailing draw transaction is presentationally live. This derives
// immutable source geometry from the already-consumed authoritative wall;
// it never changes frontIndex/backIndex or decides permanent slot occupancy.
function latestDrawnTiles(actions: readonly Action[]): readonly PendingDraw[] {
  const tiles: PendingDraw[] = []
  let index = actions.length - 1
  while (index >= 0 && actions[index]?.type === 'flowerReplacement') {
    const action = actions[index]!
    if (action.type === 'flowerReplacement') {
      tiles.unshift({ id: `flower-replacement:${action.seq}:${action.replacementTile}`, tileId: action.replacementTile })
    }
    index--
  }
  const draw = actions[index]
  if (draw?.type === 'draw') tiles.unshift({ id: `draw:${draw.seq}:${draw.tile}`, tileId: draw.tile })
  return tiles
}

export function getWallDrawTransitions(
  actions: readonly Action[],
  wall: Wall,
  dealerSeat: Seat,
  designWidth: number,
): ReadonlyMap<string, WallDrawTransition> {
  const transitions = new Map<string, WallDrawTransition>()
  const wallRegions = getBoardRegions(designWidth).wall
  const regionForEdge: Record<WallEdge, Rect> = {
    top: wallRegions.top,
    right: wallRegions.right,
    bottom: wallRegions.bottom,
    left: wallRegions.left,
  }
  const horizontalLongSize = wallTileLongSizeFromSideRegion(wallRegions.left)

  for (const pending of latestDrawnTiles(actions)) {
    const { tileId } = pending
    const wallIndex = wall.tiles.indexOf(tileId)
    if (wallIndex < 0) continue
    const priorWall: Wall = {
      ...wall,
      frontIndex: Math.min(wall.frontIndex, wallIndex),
      backIndex: Math.max(wall.backIndex, wallIndex),
    }
    for (const side of buildPhysicalWall(priorWall, dealerSeat)) {
      const stack = side.stacks.find((candidate) => candidate.top?.tileId === tileId || candidate.bottom?.tileId === tileId)
      if (!stack) continue
      const tile = stack.top?.tileId === tileId ? stack.top : stack.bottom
      if (tile) {
        transitions.set(
          String(tileId),
          {
            id: pending.id,
            tileId,
            source: physicalWallTileRect(side.edge, regionForEdge[side.edge], stack.stackIndex, tile.layer, true, horizontalLongSize),
          },
        )
      }
      break
    }
  }
  return transitions
}

function sameDestination(a: WallDrawDestination | undefined, b: WallDrawDestination): boolean {
  return a?.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height && a.rotation === b.rotation
}

function DrawOverlay({
  transition,
  destination,
  onComplete,
}: {
  transition: WallDrawTransition
  destination: WallDrawDestination
  onComplete: (transitionId: string) => void
}) {
  useEffect(() => {
    // Motion normally owns completion. The timeout is a lifecycle backstop
    // for interrupted/throttled animations so an invisible proxy can never
    // remain mounted indefinitely.
    const timeout = window.setTimeout(() => onComplete(transition.id), WALL_DRAW_CLEANUP_MS)
    return () => window.clearTimeout(timeout)
  }, [onComplete, transition.id])

  const source = transition.source
  return (
    <motion.div
      key={`animation:${transition.id}`}
      aria-hidden="true"
      data-wall-draw-overlay="true"
      data-wall-draw-transition={transition.id}
      data-wall-draw-tile-id={transition.tileId}
      className="pointer-events-none absolute z-[70] flex items-center justify-center"
      initial={{
        x: source.x + source.width / 2 - destination.x,
        y: source.y + source.height / 2 - destination.y,
        scaleX: source.width / destination.width,
        scaleY: source.height / destination.height,
      }}
      animate={{ x: 0, y: 0, scaleX: 1, scaleY: 1 }}
      transition={{ delay: WALL_DRAW_DELAY_SECONDS, duration: WALL_DRAW_DURATION_SECONDS, ease: 'easeInOut' }}
      onAnimationComplete={() => onComplete(transition.id)}
      style={{
        left: destination.x,
        top: destination.y,
        width: destination.width,
        height: destination.height,
        marginLeft: -destination.width / 2,
        marginTop: -destination.height / 2,
        rotate: destination.rotation,
      }}
    >
      <CompactTileBack className="h-full w-full overflow-hidden rounded-[3px]" />
    </motion.div>
  )
}

export interface WallDrawMotionProviderProps {
  actions: readonly Action[]
  wall: Wall
  dealerSeat: Seat
  handKey: string
  enabled: boolean
  children: ReactNode
}

export function WallDrawMotionProvider({ actions, wall, dealerSeat, handKey, enabled, children }: WallDrawMotionProviderProps) {
  const { designWidth } = useStageMetrics()
  const reducedMotion = useReducedMotion()
  const transitions = useMemo(
    () => {
      if (!enabled || reducedMotion) return EMPTY_TRANSITIONS
      const projected = getWallDrawTransitions(actions, wall, dealerSeat, designWidth)
      return new Map([...projected].map(([layoutId, transition]) => [
        layoutId,
        { ...transition, id: `${handKey}:${transition.id}` },
      ]))
    },
    [actions, wall, dealerSeat, designWidth, enabled, handKey, reducedMotion],
  )
  const [destinations, setDestinations] = useState<ReadonlyMap<string, WallDrawDestination>>(new Map())
  const [completed, setCompleted] = useState<ReadonlySet<string>>(new Set())

  const registerDestination = useCallback((layoutId: string, destination: WallDrawDestination) => {
    setDestinations((current) => {
      if (sameDestination(current.get(layoutId), destination)) return current
      const next = new Map(current)
      next.set(layoutId, destination)
      return next
    })
    return () => {
      setDestinations((current) => {
        if (!sameDestination(current.get(layoutId), destination)) return current
        const next = new Map(current)
        next.delete(layoutId)
        return next
      })
    }
  }, [])

  const completeTransition = useCallback((transitionId: string) => {
    setCompleted((current) => current.has(transitionId) ? current : new Set(current).add(transitionId))
  }, [])

  const transitionIds = useMemo(() => new Set([...transitions.values()].map((transition) => transition.id)), [transitions])
  useEffect(() => {
    setCompleted((current) => {
      const retained = new Set([...current].filter((id) => transitionIds.has(id)))
      return retained.size === current.size ? current : retained
    })
  }, [transitionIds])

  const activeTransitions = useMemo(
    () => new Map([...transitions].filter(([, transition]) => !completed.has(transition.id))),
    [completed, transitions],
  )
  const contextValue = useMemo(
    () => ({ transitions: activeTransitions, registerDestination }),
    [activeTransitions, registerDestination],
  )

  return (
    <WallDrawMotionContext.Provider value={contextValue}>
      {children}
      {[...activeTransitions].map(([layoutId, transition]) => {
        const destination = destinations.get(layoutId)
        return destination ? (
          <DrawOverlay
            key={`animation:${transition.id}`}
            transition={transition}
            destination={destination}
            onComplete={completeTransition}
          />
        ) : null
      })}
    </WallDrawMotionContext.Provider>
  )
}
