import { useCallback, useRef, useState } from 'react'
import type { GameState, Seat } from '@mahjong-mcr/engine'
import { SESSION_STATS_STORAGE_KEY, applyHandResult, loadStats, serializeStats, type SessionStats } from './sessionStats.js'

export interface UseSessionStatsResult {
  stats: SessionStats
  recordHandResult: (endedState: GameState, humanSeat: Seat) => void
}

export const RECORDED_HANDS_STORAGE_KEY = 'mcr-mahjong:recorded-stat-hands:v1'

function loadRecordedHands(): Set<string> {
  try {
    const raw = window.localStorage.getItem(RECORDED_HANDS_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [])
  } catch {
    return new Set()
  }
}

// localStorage-backed session stats, read once on mount, written on every
// recorded hand — same guarded-storage pattern as settings/useSettings.ts's
// useSettings (private-browsing/quota failures mean stats just don't
// persist across reloads, never a crash). Callers are responsible for
// calling recordHandResult exactly once per finished hand (see App.tsx's
// ref-guarded effect keyed on (state.seed, state.handNumber) — this hook
// itself has no notion of "already recorded this hand").
export function useSessionStats(): UseSessionStatsResult {
  const recordedHands = useRef<Set<string>>(loadRecordedHands())
  const [stats, setStats] = useState<SessionStats>(() => {
    try {
      return loadStats(window.localStorage.getItem(SESSION_STATS_STORAGE_KEY))
    } catch {
      return loadStats(null)
    }
  })

  const recordHandResult = useCallback((endedState: GameState, humanSeat: Seat) => {
    if (!endedState.result) return
    const handKey = `${endedState.seed}-${endedState.handNumber}`
    if (recordedHands.current.has(handKey)) return
    recordedHands.current.add(handKey)
    try {
      window.localStorage.setItem(RECORDED_HANDS_STORAGE_KEY, JSON.stringify([...recordedHands.current]))
    } catch {
      // Stats persistence is best-effort, like the aggregate below.
    }
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
