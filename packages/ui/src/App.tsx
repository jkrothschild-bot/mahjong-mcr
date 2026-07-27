import { useState } from 'react'
import { startHand } from '@mahjong-mcr/engine'
import { HandTiles } from './hand/HandTiles.js'
import { SortToolbar } from './hand/SortToolbar.js'
import { useHandOrder } from './hand/useHandOrder.js'

const SEATS = [
  { wind: 'N', className: 'row-start-1 col-start-2 justify-self-center' },
  { wind: 'W', className: 'row-start-2 col-start-1 justify-self-center' },
  { wind: 'E', className: 'row-start-2 col-start-3 justify-self-center' },
  { wind: 'S', className: 'row-start-3 col-start-2 justify-self-center' },
] as const

function App() {
  // No live turn loop yet — a fixed seeded deal gives real, deterministic
  // engine data to render. Seat 0 stands in for "the player's hand" as an
  // explicit simplification; there's no concept yet of which seat is human.
  const [gameState] = useState(() =>
    startHand({ seed: 42, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 }),
  )
  const { order, sort, reorder } = useHandOrder(gameState.players[0].hand.concealedTiles)

  return (
    <div className="min-h-svh bg-neutral-900 text-neutral-100 flex flex-col">
      <header className="px-4 py-3 border-b border-neutral-700">
        <h1 className="text-xl font-semibold tracking-tight">MCR Mahjong Trainer</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
        <div
          data-testid="board"
          className="grid grid-cols-3 grid-rows-3 gap-4 w-full max-w-xl aspect-square"
        >
          {SEATS.map(({ wind, className }) => (
            <div
              key={wind}
              className={`${className} w-16 h-16 rounded-full border-2 border-emerald-500 flex items-center justify-center text-2xl font-bold`}
            >
              {wind}
            </div>
          ))}

          <div className="row-start-2 col-start-2 flex flex-col items-center justify-center gap-2 rounded-lg bg-neutral-800 border border-neutral-700">
            <span className="text-sm text-neutral-400">Wall</span>
            <span className="text-2xl font-mono">144</span>
          </div>
        </div>

        <section className="flex w-full max-w-3xl flex-col gap-3">
          <SortToolbar onSort={sort} />
          <HandTiles order={order} onReorder={reorder} />
        </section>
      </main>
    </div>
  )
}

export default App
