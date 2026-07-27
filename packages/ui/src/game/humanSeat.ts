import type { Seat } from '@mahjong-mcr/engine'

// The player's seat. A constant rather than something threaded through every
// function call — there's no "choose your seat" concept yet, so this is the
// one place that assumption lives; a future seat-choice setting only needs
// to change this.
export const HUMAN_SEAT: Seat = 0
