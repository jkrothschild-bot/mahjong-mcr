import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildWall, drawTile, type Action, type TileInstanceId, type Wall } from '@mahjong-mcr/engine'
import { Positioned } from '../stage/Positioned.js'
import { WallRing } from './WallRing.js'
import {
  getWallDrawTransitions,
  WALL_DRAW_CLEANUP_MS,
  WallDrawMotionProvider,
} from './WallDrawMotion.js'

function Destination({ tileId, x = 500 }: { tileId: TileInstanceId; x?: number }) {
  return (
    <Positioned layoutId={String(tileId)} x={x} y={600} naturalWidth={40} naturalHeight={64}>
      <div data-testid={`destination-${tileId}`}>tile</div>
    </Positioned>
  )
}

function DrawPresentation({
  actions,
  wall,
  tileIds,
  handKey = 'test-hand',
  enabled = true,
}: {
  actions: readonly Action[]
  wall: Wall
  tileIds: readonly TileInstanceId[]
  handKey?: string
  enabled?: boolean
}) {
  return (
    <WallDrawMotionProvider actions={actions} wall={wall} dealerSeat={0} handKey={handKey} enabled={enabled}>
      <WallRing wall={wall} dealerSeat={0} />
      {tileIds.map((tileId, index) => <Destination key={`destination:${tileId}`} tileId={tileId} x={500 + index * 50} />)}
    </WallDrawMotionProvider>
  )
}

function permanentPositions(container: HTMLElement): readonly string[] {
  return [...container.querySelectorAll('[data-wall-position]')]
    .map((tile) => tile.getAttribute('data-wall-position')!)
    .sort()
}

describe('wall draw overlay lifecycle', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('projects a normal front draw back to its exact physical wall tile', () => {
    const initial = buildWall(42)
    const draw = drawTile(initial, 'front')
    const actions: Action[] = [{ seq: 0, seat: 0, type: 'draw', tile: draw.tile, source: 'front' }]
    const transition = getWallDrawTransitions(actions, draw.wall, 0, 1768).get(String(draw.tile))

    expect(transition).toBeDefined()
    expect(transition!.id).toBe(`draw:0:${draw.tile}`)
    expect(transition!.source.width).toBeGreaterThan(0)
    expect(transition!.source.height).toBeGreaterThan(0)
  })

  it('keeps permanent positions stable while one temporary normal-draw overlay mounts and is destroyed', () => {
    const initial = buildWall(42)
    const draw = drawTile(initial, 'front')
    const actions: Action[] = [{ seq: 0, seat: 0, type: 'draw', tile: draw.tile, source: 'front' }]
    const { container, rerender } = render(<DrawPresentation actions={[]} wall={initial} tileIds={[]} />)
    expect(container.querySelectorAll('[data-wall-layer]')).toHaveLength(144)

    rerender(<DrawPresentation actions={actions} wall={draw.wall} tileIds={[draw.tile]} />)
    const during = permanentPositions(container)
    expect(during).toHaveLength(143)
    expect(container.querySelectorAll('[data-wall-draw-overlay]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-wall-draw-overlay][data-wall-layer]')).toHaveLength(0)

    act(() => vi.advanceTimersByTime(WALL_DRAW_CLEANUP_MS))
    expect(container.querySelectorAll('[data-wall-draw-overlay]')).toHaveLength(0)
    expect(permanentPositions(container)).toEqual(during)
  })

  it('uses temporary overlays for a Flower chain and removes every proxy without restoring wall slots', () => {
    const initial = buildWall(17)
    const front = drawTile(initial, 'front')
    const back = drawTile(front.wall, 'back')
    const actions: Action[] = [
      { seq: 0, seat: 1, type: 'draw', tile: front.tile, source: 'front' },
      { seq: 1, seat: 1, type: 'flowerReplacement', flowerTile: front.tile, replacementTile: back.tile },
    ]
    const before = { frontIndex: back.wall.frontIndex, backIndex: back.wall.backIndex }
    const { container } = render(<DrawPresentation actions={actions} wall={back.wall} tileIds={[front.tile, back.tile]} />)
    const during = permanentPositions(container)

    expect(during).toHaveLength(142)
    expect(container.querySelectorAll('[data-wall-draw-overlay]')).toHaveLength(2)
    act(() => vi.advanceTimersByTime(WALL_DRAW_CLEANUP_MS))
    expect(container.querySelectorAll('[data-wall-draw-overlay]')).toHaveLength(0)
    expect(permanentPositions(container)).toEqual(during)
    expect({ frontIndex: back.wall.frontIndex, backIndex: back.wall.backIndex }).toEqual(before)
  })

  it('animates a Kong replacement from the back and leaves exactly one fewer permanent wall tile', () => {
    const initial = buildWall(29)
    const replacement = drawTile(initial, 'back')
    const actions: Action[] = [
      { seq: 0, seat: 2, type: 'concealedKong', tiles: [0, 1, 2, 3], meldId: 'kong-0' },
      { seq: 1, seat: 2, type: 'draw', tile: replacement.tile, source: 'back' },
    ]
    const { container } = render(<DrawPresentation actions={actions} wall={replacement.wall} tileIds={[replacement.tile]} />)

    expect(container.querySelectorAll('[data-wall-layer]')).toHaveLength(143)
    expect(container.querySelectorAll('[data-wall-draw-overlay]')).toHaveLength(1)
    act(() => vi.advanceTimersByTime(WALL_DRAW_CLEANUP_MS))
    expect(container.querySelectorAll('[data-wall-layer]')).toHaveLength(143)
    expect(container.querySelectorAll('[data-wall-draw-overlay]')).toHaveLength(0)
  })

  it('cancels a proxy immediately when a later action opens the next presentation state', () => {
    const initial = buildWall(9)
    const draw = drawTile(initial, 'front')
    const drawAction: Action = { seq: 0, seat: 0, type: 'draw', tile: draw.tile, source: 'front' }
    const { container, rerender } = render(<DrawPresentation actions={[drawAction]} wall={draw.wall} tileIds={[draw.tile]} />)
    expect(container.querySelectorAll('[data-wall-draw-overlay]')).toHaveLength(1)

    const laterActions: Action[] = [drawAction, { seq: 1, seat: 0, type: 'discard', tile: draw.tile }]
    rerender(<DrawPresentation actions={laterActions} wall={draw.wall} tileIds={[draw.tile]} />)
    expect(container.querySelectorAll('[data-wall-draw-overlay]')).toHaveLength(0)
    expect(container.querySelector(`[data-testid="destination-${draw.tile}"]`)?.parentElement).not.toHaveStyle({ visibility: 'hidden' })
  })

  it('does not create or hide proxies when draw motion is disabled', () => {
    const initial = buildWall(5)
    const draw = drawTile(initial, 'front')
    const actions: Action[] = [{ seq: 0, seat: 0, type: 'draw', tile: draw.tile, source: 'front' }]
    const { container } = render(<DrawPresentation actions={actions} wall={draw.wall} tileIds={[draw.tile]} enabled={false} />)

    expect(container.querySelectorAll('[data-wall-draw-overlay]')).toHaveLength(0)
    expect(container.querySelector(`[data-testid="destination-${draw.tile}"]`)?.parentElement).not.toHaveStyle({ visibility: 'hidden' })
  })

  it('namespaces completed transitions by hand so a new hand cannot inherit stale animation state', () => {
    const initial = buildWall(5)
    const draw = drawTile(initial, 'front')
    const actions: Action[] = [{ seq: 0, seat: 0, type: 'draw', tile: draw.tile, source: 'front' }]
    const { container, rerender } = render(
      <DrawPresentation actions={actions} wall={draw.wall} tileIds={[draw.tile]} handKey="hand-a" />,
    )
    act(() => vi.advanceTimersByTime(WALL_DRAW_CLEANUP_MS))
    expect(container.querySelectorAll('[data-wall-draw-overlay]')).toHaveLength(0)

    rerender(<DrawPresentation actions={actions} wall={draw.wall} tileIds={[draw.tile]} handKey="hand-b" />)
    expect(container.querySelectorAll('[data-wall-draw-overlay]')).toHaveLength(1)
    expect(container.querySelector(`[data-testid="destination-${draw.tile}"]`)?.parentElement).toHaveStyle({ visibility: 'hidden' })
  })
})
