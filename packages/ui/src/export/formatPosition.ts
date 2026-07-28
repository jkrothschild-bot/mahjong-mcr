import { drawableRemaining, typeIdOfInstance, type GameState, type Meld, type Seat } from '@mahjong-mcr/engine'
import { tileDisplayName } from '../board/tileNames.js'

const WIND_LABEL: Record<GameState['prevailingWind'], string> = { east: 'East', south: 'South', west: 'West', north: 'North' }

function namesOf(tiles: readonly number[]): string {
  return tiles.length === 0 ? '(none)' : tiles.map((id) => tileDisplayName(typeIdOfInstance(id))).join(', ')
}

function meldSummary(meld: Meld): string {
  const exposure = meld.exposure === 'concealed' ? 'concealed' : 'exposed'
  return `${exposure} ${meld.kind} (${namesOf(meld.tiles)})`
}

// Plain-text "ask about this position" export (SPEC.md §9) — copy/paste only,
// no live API call. Deliberately only reveals forSeat's own concealed hand;
// every other seat only shows what's already public (discards, melds, flower
// count, remaining concealed-tile count), matching what a human player would
// actually be able to see across the table.
export function formatPositionText(state: GameState, forSeat: Seat): string {
  const lines: string[] = []
  lines.push(`MCR Mahjong — hand ${state.handNumber}, ${WIND_LABEL[state.prevailingWind]} round`)
  lines.push(`Dealer: seat ${state.dealerSeat}. Current turn: seat ${state.currentSeat}. Wall: ${drawableRemaining(state.wall)} tiles left.`)
  lines.push('')

  for (const player of state.players) {
    const isSelf = player.seat === forSeat
    const dealerTag = player.seat === state.dealerSeat ? ' (dealer)' : ''
    lines.push(`Seat ${player.seat}${dealerTag} — ${player.seatWind} wind${isSelf ? ' [you]' : ''}`)
    if (isSelf) {
      lines.push(`  Hand: ${namesOf(player.hand.concealedTiles)}`)
    } else {
      lines.push(`  Concealed tiles: ${player.hand.concealedTiles.length}`)
    }
    lines.push(`  Flowers: ${player.hand.flowers.length}`)
    if (player.hand.melds.length > 0) {
      lines.push(`  Melds: ${player.hand.melds.map(meldSummary).join('; ')}`)
    }
    lines.push(`  Discards: ${namesOf(player.discards)}`)
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}
