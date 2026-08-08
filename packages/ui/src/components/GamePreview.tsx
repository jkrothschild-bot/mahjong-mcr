import type { TileTypeId } from '@mahjong-mcr/engine'
import { TileFaceContent } from '../tiles/TileFaceContent.js'

const PREVIEW_HAND: readonly TileTypeId[] = ['C3', 'C4', 'C5', 'B3', 'B4', 'B5', 'D2', 'D3', 'D4', 'WE', 'WE', 'DR', 'DR']

export function GamePreview() {
  return (
    <div className="overflow-hidden rounded-3xl border border-emerald-950/20 bg-[radial-gradient(circle_at_top,#286a56,#123f37_70%)] p-4 shadow-2xl shadow-emerald-950/25 sm:p-7">
      <div className="mb-4 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/80"><span>East 1 · Your turn</span><span>81 tiles left</span></div>
      <div className="rounded-2xl border border-white/10 bg-black/15 p-3 sm:p-5">
        <div aria-label="Example Mahjong hand" className="flex justify-center gap-0.5 overflow-hidden sm:gap-1">
          {PREVIEW_HAND.map((typeId, index) => <div key={`${typeId}-${index}`} className="relative h-[54px] w-[35px] shrink-0 overflow-hidden rounded border border-stone-500 bg-stone-50 shadow-md sm:h-[72px] sm:w-[47px]"><TileFaceContent typeId={typeId} /></div>)}
        </div>
      </div>
      <div className="mt-4 ml-auto max-w-lg rounded-2xl border border-amber-300/40 bg-[#fffaf0] p-4 text-stone-800 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Strategy Coach</p>
        <h3 className="mt-1 font-serif text-xl font-semibold">Build the hand you can finish</h3>
        <p className="mt-2 text-sm leading-6 text-stone-600">Compare useful tiles, hand shape and scoring routes when you ask for help—then make the decision yourself.</p>
      </div>
    </div>
  )
}
