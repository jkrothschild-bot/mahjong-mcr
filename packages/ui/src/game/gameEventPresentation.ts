import type { Action, GameState } from '@mahjong-mcr/engine'
import type { SoundEffect, SpokenCall } from '../audio/soundEffects.js'
import { seatDisplayName } from './seatDisplayName.js'
import { HUMAN_SEAT } from './humanSeat.js'

export const CLAIM_ANNOUNCEMENT_MS = 1100
export const MAHJONG_ANNOUNCEMENT_MS = 1450
export const MELD_SETTLE_MS = 900

export interface GameEventAnnouncementData {
  id: string
  kind: 'claim' | 'mahjong'
  title: 'CHOW' | 'PUNG' | 'KONG' | 'MAHJONG!'
  actor: string
  detail: string
  durationMs: number
  meldId?: string
}

export interface PresentedGameAction {
  announcement: GameEventAnnouncementData | null
  sound: SoundEffect | null
  spokenCall: SpokenCall | null
}

function idFor(action: Action, state: GameState): string {
  return `${state.seed}-${state.handNumber}-${action.seq}-${action.type}`
}

export function presentGameAction(action: Action, state: GameState): PresentedGameAction {
  const actor = seatDisplayName(action.seat, state)
  switch (action.type) {
    case 'discard':
      return { announcement: null, sound: action.seat === HUMAN_SEAT ? 'discard' : null, spokenCall: null }
    case 'claim': {
      const title = action.claimType.toUpperCase() as 'CHOW' | 'PUNG' | 'KONG'
      return {
        announcement: {
          id: idFor(action, state),
          kind: 'claim',
          title,
          actor,
          detail: `${actor} claims`,
          durationMs: CLAIM_ANNOUNCEMENT_MS,
          meldId: action.meldId,
        },
        sound: action.claimType,
        spokenCall: action.claimType,
      }
    }
    case 'concealedKong':
    case 'addedKong':
      return {
        announcement: {
          id: idFor(action, state),
          kind: 'claim',
          title: 'KONG',
          actor,
          detail: `${actor} declares`,
          durationMs: CLAIM_ANNOUNCEMENT_MS,
          meldId: action.meldId,
        },
        sound: 'kong',
        spokenCall: 'kong',
      }
    case 'win':
    case 'robKongWin':
      return {
        announcement: {
          id: idFor(action, state),
          kind: 'mahjong',
          title: 'MAHJONG!',
          actor,
          detail: `${actor} wins the hand`,
          durationMs: MAHJONG_ANNOUNCEMENT_MS,
        },
        sound: 'mahjong',
        spokenCall: 'mahjong',
      }
    default:
      return { announcement: null, sound: null, spokenCall: null }
  }
}
