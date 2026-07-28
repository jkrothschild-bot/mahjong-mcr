import { FAN_REGISTRY } from '@mahjong-mcr/engine'
import type { SessionStats } from './sessionStats.js'

export interface StatsPanelProps {
  open: boolean
  stats: SessionStats
  onClose: () => void
}

const TOP_FAN_COUNT = 5

function formatPercent(numerator: number, denominator: number): string {
  return denominator === 0 ? '—' : `${Math.round((numerator / denominator) * 100)}%`
}

function formatAverage(numerator: number, denominator: number): string {
  return denominator === 0 ? '—' : (numerator / denominator).toFixed(1)
}

// SPEC.md §9's session stats: a small always-available summary of this
// session's play, mirroring TileCountGrid's own modal shape. In-memory +
// localStorage only (useSessionStats), same posture as settings/match state.
export function StatsPanel({ open, stats, onClose }: StatsPanelProps) {
  if (!open) return null

  const topFans = Object.entries(stats.winsByFan)
    .map(([fanId, count]) => ({ fanId: Number(fanId), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_FAN_COUNT)

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Session stats"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-lg border border-neutral-600 bg-neutral-800 p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Session stats</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-700"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div data-testid="stats-hands-played" className="rounded-md border border-neutral-700 p-2">
            <div className="text-neutral-400">Hands played</div>
            <div className="text-lg font-semibold">{stats.handsPlayed}</div>
          </div>
          <div data-testid="stats-win-rate" className="rounded-md border border-neutral-700 p-2">
            <div className="text-neutral-400">Win rate</div>
            <div className="text-lg font-semibold">{formatPercent(stats.wins, stats.handsPlayed)}</div>
          </div>
          <div data-testid="stats-avg-points" className="rounded-md border border-neutral-700 p-2">
            <div className="text-neutral-400">Avg points per win</div>
            <div className="text-lg font-semibold">{formatAverage(stats.totalPointsWon, stats.wins)}</div>
          </div>
          <div data-testid="stats-deal-in-rate" className="rounded-md border border-neutral-700 p-2">
            <div className="text-neutral-400">Deal-in rate</div>
            <div className="text-lg font-semibold">{formatPercent(stats.dealIns, stats.handsPlayed)}</div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-neutral-300">Top fans completed</h3>
          {topFans.length === 0 ? (
            <p className="text-sm text-neutral-400">No wins yet this session.</p>
          ) : (
            <ul role="list" aria-label="Top fans completed" className="mt-1 flex flex-col gap-1 text-sm">
              {topFans.map(({ fanId, count }) => (
                <li key={fanId} role="listitem" className="flex justify-between">
                  <span>{FAN_REGISTRY[fanId]?.name ?? `Fan ${fanId}`}</span>
                  <span className="font-mono">x{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
