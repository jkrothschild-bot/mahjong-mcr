import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type { GameState, Hand, Seat, TileTypeId, Wind } from '@mahjong-mcr/engine'
import { BestMoveTab } from './BestMoveTab.js'
import { HandPlanTab } from './HandPlanTab.js'
import { RouteToPointsTab } from './RouteToPointsTab.js'
import { TileSafetyTab } from './TileSafetyTab.js'
import { HUMAN_SEAT } from '../game/humanSeat.js'

export interface HintPanelProps {
  hand: Hand
  prevailingWind: Wind
  seatWind: Wind
  state: GameState
  forSeat: Seat
  selectedTypeId: TileTypeId | null
  onClose: () => void
  onOpenEncyclopedia: (fanId?: number) => void
}

type HintTab = 'bestMove' | 'handPlan' | 'routeToPoints' | 'tileSafety'

const TABS: { id: HintTab; label: string }[] = [
  { id: 'bestMove', label: 'Best move' },
  { id: 'handPlan', label: 'Hand plan' },
  { id: 'routeToPoints', label: '8-point route' },
  { id: 'tileSafety', label: 'Tile safety' },
]

interface WindowPosition {
  x: number
  y: number
}

interface DragStart {
  pointerId: number
  clientX: number
  clientY: number
  position: WindowPosition
  minDeltaX: number
  maxDeltaX: number
  minDeltaY: number
  maxDeltaY: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// SPEC.md §6's Strategy Coach: on-demand only, hidden until the player taps
// Hint (CLAUDE.md — never automatic, never shown for bots). The original
// three tabs map onto nudge/options/tutor; the space-driven fourth route tab
// is the owner-reviewed exception tracked in OPEN-WORK.md §A13 until the
// governing docs are reconciled.
//
// Rendered as a movable modeless window, not inline in the board's normal
// flow — an inline panel pushed the board well past the iPad viewport. The
// transparent click-through layer keeps the hand visible and usable while
// the window stays above the table. Dragging is constrained to the viewport
// so the Close button can never be stranded off-screen.
export function HintPanel({ hand, prevailingWind, seatWind, state, forSeat, selectedTypeId, onClose, onOpenEncyclopedia }: HintPanelProps) {
  const [tab, setTab] = useState<HintTab>('bestMove')
  const [position, setPosition] = useState<WindowPosition>({ x: 0, y: 0 })
  const panelRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<DragStart | null>(null)

  if (forSeat !== HUMAN_SEAT) return null

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !panelRef.current) return
    const rect = panelRef.current.getBoundingClientRect()
    dragStartRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      position,
      minDeltaX: -rect.left,
      maxDeltaX: window.innerWidth - rect.right,
      minDeltaY: -rect.top,
      maxDeltaY: window.innerHeight - rect.bottom,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.preventDefault()
  }

  const continueDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const start = dragStartRef.current
    if (!start || start.pointerId !== event.pointerId) return
    setPosition({
      x: start.position.x + clamp(event.clientX - start.clientX, start.minDeltaX, start.maxDeltaX),
      y: start.position.y + clamp(event.clientY - start.clientY, start.minDeltaY, start.maxDeltaY),
    })
  }

  const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragStartRef.current?.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    dragStartRef.current = null
  }

  const moveWithKeyboard = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Home') {
      event.preventDefault()
      setPosition({ x: 0, y: 0 })
      return
    }

    const step = event.shiftKey ? 48 : 24
    const delta = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    }[event.key]
    if (!delta || !panelRef.current) return

    event.preventDefault()
    const rect = panelRef.current.getBoundingClientRect()
    setPosition((current) => ({
      x: current.x + clamp(delta.x, -rect.left, window.innerWidth - rect.right),
      y: current.y + clamp(delta.y, -rect.top, window.innerHeight - rect.bottom),
    }))
  }

  return (
    <div data-testid="hint-window-layer" className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-2">
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Strategy Coach"
        data-testid="hint-panel"
        style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
        className="pointer-events-auto flex max-h-[85vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-lg border border-indigo-700 bg-neutral-900 p-4 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-indigo-300">Strategy Coach</h3>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Move Strategy Coach window"
              aria-describedby="strategy-coach-move-help"
              onPointerDown={startDrag}
              onPointerMove={continueDrag}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              onKeyDown={moveWithKeyboard}
              className="min-h-11 touch-none cursor-move rounded-md border border-indigo-500 px-3 text-sm text-indigo-200 hover:bg-indigo-950 active:cursor-grabbing"
            >
              Move
            </button>
            <span id="strategy-coach-move-help" className="sr-only">Drag to move this window, or use the arrow keys. Press Home to recenter it.</span>
            <button
              type="button"
              onClick={() => onOpenEncyclopedia()}
              className="min-h-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-800"
            >
              Fan encyclopedia
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 min-w-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-800"
            >
              Close
            </button>
          </div>
        </div>

        <div role="tablist" aria-label="Strategy Coach views" className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`min-h-11 rounded-md border px-3 text-sm ${
                tab === id ? 'border-indigo-400 bg-indigo-500 text-neutral-900 font-semibold' : 'border-neutral-600 hover:bg-neutral-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div role="tabpanel">
          {tab === 'bestMove' && <BestMoveTab hand={hand} />}
          {tab === 'handPlan' && <HandPlanTab hand={hand} prevailingWind={prevailingWind} seatWind={seatWind} />}
          {tab === 'routeToPoints' && (
            <RouteToPointsTab hand={hand} prevailingWind={prevailingWind} seatWind={seatWind} onFanClick={onOpenEncyclopedia} />
          )}
          {tab === 'tileSafety' && <TileSafetyTab state={state} forSeat={forSeat} selectedTypeId={selectedTypeId} />}
        </div>
      </div>
    </div>
  )
}
