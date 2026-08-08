import { typeIdOfInstance, type Action, type GameState } from '@mahjong-mcr/engine'
import { tileDisplayName } from '../board/tileNames.js'
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

function verbFor(claimType: 'chow' | 'pung' | 'kong'): string {
  return claimType === 'chow' ? 'chowed' : claimType === 'pung' ? 'ponged' : 'konged'
}

// The single source of user-facing action phrasing. The former CallOutToast
// established this wording; the prominent announcement reuses it so actor,
// action and tile context cannot drift between presentation components.
export function describeAction(action: Action, state: GameState): string | null {
  const actor = seatDisplayName(action.seat, state)
  switch (action.type) {
    case 'claim': {
      const fromWhom = action.fromSeat === HUMAN_SEAT ? 'your' : `${seatDisplayName(action.fromSeat, state)}'s`
      return `${actor} ${verbFor(action.claimType)} ${fromWhom} ${tileDisplayName(typeIdOfInstance(action.claimedTile))}`
    }
    case 'concealedKong':
      return `${actor} declared a concealed kong of ${tileDisplayName(typeIdOfInstance(action.tiles[0]!))}`
    case 'addedKong':
      return `${actor} added ${tileDisplayName(typeIdOfInstance(action.addedTile))} to make a kong`
    case 'win':
      return `${actor} won the hand!`
    case 'robKongWin':
      return `${actor} robbed the kong to win!`
    default:
      return null
  }
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
          detail: describeAction(action, state)!,
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
          detail: describeAction(action, state)!,
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
          detail: describeAction(action, state)!,
          durationMs: MAHJONG_ANNOUNCEMENT_MS,
        },
        sound: 'mahjong',
        spokenCall: 'mahjong',
      }
    default:
      return { announcement: null, sound: null, spokenCall: null }
  }
}
