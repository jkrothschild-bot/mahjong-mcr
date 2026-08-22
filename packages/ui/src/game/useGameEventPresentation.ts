import { useEffect, useRef, useState } from 'react'
import type { GameState } from '@mahjong-mcr/engine'
import { soundEffectsPlayer, type SoundEffectsPlayer, type SpokenCall } from '../audio/soundEffects.js'
import { MELD_SETTLE_MS, presentGameAction, type GameEventAnnouncementData } from './gameEventPresentation.js'

export interface GameEventPresentationState {
  announcement: GameEventAnnouncementData | null
  recentMeldId: string | null
}

// Observes the engine's append-only action log. It never submits a move,
// pauses a timer, or waits for animation/audio completion, so presentation
// can be disabled without changing game progression.
export function useGameEventPresentation(
  state: GameState,
  soundEnabled: boolean,
  player: SoundEffectsPlayer = soundEffectsPlayer,
): GameEventPresentationState {
  const seenLengthRef = useRef(state.actionLog.length)
  const [announcement, setAnnouncement] = useState<GameEventAnnouncementData | null>(null)
  const [recentMeldId, setRecentMeldId] = useState<string | null>(null)

  useEffect(() => {
    // New hand/restart: the log becomes shorter. Treat everything already
    // present as history, exactly as the initial mount does.
    if (state.actionLog.length < seenLengthRef.current) {
      seenLengthRef.current = state.actionLog.length
      setAnnouncement(null)
      setRecentMeldId(null)
      return
    }

    const newActions = state.actionLog.slice(seenLengthRef.current)
    seenLengthRef.current = state.actionLog.length
    let newestAnnouncement: GameEventAnnouncementData | null = null
    let newestSpokenCall: SpokenCall | null = null
    for (const action of newActions) {
      const presented = presentGameAction(action, state)
      if (soundEnabled && presented.sound) player.play(presented.sound)
      if (soundEnabled && presented.spokenCall) newestSpokenCall = presented.spokenCall
      if (presented.announcement) newestAnnouncement = presented.announcement
    }

    // SpeechSynthesis queues utterances globally. Flush any earlier claim
    // words before the hand-ending call so a delayed "Chow" or "Pung"
    // cannot play over the result screen. If React delivered several actions
    // together, speak only the newest one—the visual presentation already
    // follows that same newest-event policy.
    if (state.phase === 'handEnded') player.cancelSpeech()
    if (newestSpokenCall) player.speakCall(newestSpokenCall)
    if (!newestAnnouncement) return
    setAnnouncement(newestAnnouncement)
    setRecentMeldId(newestAnnouncement.meldId ?? null)
  }, [player, soundEnabled, state])

  useEffect(() => {
    if (!soundEnabled) player.cancelSpeech()
  }, [player, soundEnabled])

  useEffect(() => {
    if (!announcement) return
    const timeout = window.setTimeout(() => setAnnouncement(null), announcement.durationMs)
    return () => window.clearTimeout(timeout)
  }, [announcement])

  useEffect(() => {
    if (!recentMeldId) return
    const timeout = window.setTimeout(() => setRecentMeldId(null), MELD_SETTLE_MS)
    return () => window.clearTimeout(timeout)
  }, [recentMeldId])

  return { announcement, recentMeldId }
}
