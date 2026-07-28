import { useCallback, useState } from 'react'
import type { GameState, Seat } from '@mahjong-mcr/engine'
import { SESSION_STATS_STORAGE_KEY, applyHandResult, loadStats, serializeStats, type SessionStats } from './sessionStats.js'

export interface UseSessionStatsResult {
  stats: SessionStats
  recordHandResult: (endedState: GameState, humanSeat: Seat) => void
}

// localStorage-backed session stats, read once on mount, written on every
// recorded hand — same guarded-storage pattern as settings/useSettings.ts's
// useSettings (private-browsing/quota failures mean stats just don't
// persist across reloads, never a crash). Callers are responsible for
// calling recordHandResult exactly once per finished hand (see App.tsx's
// ref-guarded effect keyed on (state.seed, state.handNumber) — this hook
// itself has no notion of "already recorded this hand").
export function useSessionStats(): UseSessionStatsResult {
  const [stats, setStats] = useState<SessionStats>(() => {
    try {
      return loadStats(window.localStorage.getItem(SESSION_STATS_STORAGE_KEY))
    } catch {
      return loadStats(null)
    }
  })

  const recordHandResult = useCallback((endedState: GameState, humanSeat: Seat) => {
    setStats((prev) => {
      const next = applyHandResult(prev, endedState, humanSeat)
      try {
        window.localStorage.setItem(SESSION_STATS_STORAGE_KEY, serializeStats(next))
      } catch {
        // Ignored — see the doc comment above.
      }
      return next
    })
  }, [])

  return { stats, recordHandResult }
}
