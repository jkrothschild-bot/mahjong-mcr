import type { Action } from './actions.js'
import { addFlower, addMeld, addToConcealed, promoteMeldToKong, removeFromConcealed, type Hand } from './hand.js'
import { nextMeldId, type KongSource, type Meld, type MeldId, type MeldKind, type Seat } from './meld.js'
import {
  drawWithFlowerReplacement,
  isWallExhausted,
  type Wall,
} from './wall.js'
import { groupConcealedByType, isWinningHand } from './win-detection.js'
import { typeIdOf, typeIdOfInstance, typeOf, type Rank, type TileInstanceId, type TileTypeId } from './tiles.js'
import type { GameState, HandResult, PendingClaim, PlayerState } from './game-state.js'
import { allDeclared, resolvePendingClaim, type ResolvedClaim } from './claims.js'
import { buildProspectiveScoreHandParams, MINIMUM_POINTS_TO_WIN } from './scoring/derive-context.js'
import { scoreHand } from './scoring/score-hand.js'

function wouldMeetMinimumToWin(
  state: GameState,
  seat: Seat,
  winMethod: 'selfDraw' | 'discard' | 'robKong',
  winningTile: TileInstanceId,
): boolean {
  const params = buildProspectiveScoreHandParams(state, seat, winMethod, winningTile)
  return scoreHand(params).basicPoints >= MINIMUM_POINTS_TO_WIN
}

export type Move =
  | { kind: 'draw' }
  | { kind: 'discard'; tile: TileInstanceId }
  | { kind: 'concealedKong'; tileType: TileTypeId }
  | { kind: 'addedKong'; meldId: MeldId; tile: TileInstanceId }
  | { kind: 'selfDrawWin' }
  | { kind: 'chow'; usingTiles: [TileInstanceId, TileInstanceId]; variant: 'low' | 'mid' | 'high' }
  | { kind: 'pung' }
  | { kind: 'kong' }
  | { kind: 'win' }
  | { kind: 'pass' }

// ---------------------------------------------------------------------------
// legalMoves — the single source of truth for claim eligibility as well as
// normal-turn options. Both the discard/addedKong handling in applyMove (to
// decide whether a claim window even needs to open) and external UI/bot
// callers go through the same computeClaimOptionsForSeat helper below.
// ---------------------------------------------------------------------------

export function legalMoves(state: GameState, seat: Seat): Move[] {
  switch (state.phase) {
    case 'awaitingDraw':
      return seat === state.currentSeat ? [{ kind: 'draw' }] : []
    case 'awaitingDiscard':
      return seat === state.currentSeat ? legalDiscardPhaseMoves(state, seat) : []
    case 'awaitingClaims':
    case 'awaitingRobKongClaims': {
      const pendingClaim = state.pendingClaim
      if (!pendingClaim || !pendingClaim.eligibleSeats.includes(seat)) return []
      const options = computeClaimOptionsForSeat(state, pendingClaim.tile, pendingClaim.fromSeat, seat, pendingClaim.kind)
      return [...options, { kind: 'pass' }]
    }
    case 'handEnded':
      return []
  }
}

function legalDiscardPhaseMoves(state: GameState, seat: Seat): Move[] {
  const hand = state.players[seat].hand
  const moves: Move[] = []

  if (
    isWinningHand(hand.concealedTiles, hand.melds) &&
    state.lastDrawnTile !== undefined &&
    wouldMeetMinimumToWin(state, seat, 'selfDraw', state.lastDrawnTile)
  ) {
    moves.push({ kind: 'selfDrawWin' })
  }

  const counts = groupConcealedByType(hand.concealedTiles)
  for (const [typeId, count] of Object.entries(counts)) {
    if (count >= 4) moves.push({ kind: 'concealedKong', tileType: typeId })
  }

  for (const meld of hand.melds) {
    if (meld.kind !== 'pung') continue
    const typeId = meldTileTypeIdOf(meld)
    if ((counts[typeId] ?? 0) >= 1) {
      const tile = findConcealedTilesOfType(hand, typeId, 1)[0]!
      moves.push({ kind: 'addedKong', meldId: meld.id, tile })
    }
  }

  for (const tile of hand.concealedTiles) {
    moves.push({ kind: 'discard', tile })
  }

  return moves
}

// Every field needed to decide claim eligibility, parameterized rather than
// reading state.pendingClaim directly, so it can also be called BEFORE a
// pendingClaim exists yet (when a discard/addedKong is first declared and
// the engine needs to decide whether to open a claim window at all).
function computeClaimOptionsForSeat(
  state: GameState,
  tile: TileInstanceId,
  fromSeat: Seat,
  seat: Seat,
  windowKind: 'discard' | 'addedKongRob',
): Move[] {
  if (seat === fromSeat) return []
  const hand = state.players[seat].hand
  const options: Move[] = []

  if (isWinningHand([...hand.concealedTiles, tile], hand.melds)) {
    const winMethod = windowKind === 'addedKongRob' ? 'robKong' : 'discard'
    if (wouldMeetMinimumToWin(state, seat, winMethod, tile)) options.push({ kind: 'win' })
  }

  if (windowKind === 'addedKongRob') {
    return options // only a win claim is ever relevant for a rob-kong window
  }

  const claimedTypeId = typeIdOfInstance(tile)
  const counts = groupConcealedByType(hand.concealedTiles)

  if ((counts[claimedTypeId] ?? 0) >= 2) options.push({ kind: 'pung' })
  if ((counts[claimedTypeId] ?? 0) >= 3) options.push({ kind: 'kong' })

  if (seat === ((fromSeat + 1) % 4)) {
    const type = typeOf(tile)
    if (type.kind === 'suit') {
      const { suit, rank } = type
      const variants: { variant: 'low' | 'mid' | 'high'; a: number; b: number }[] = [
        { variant: 'low', a: rank + 1, b: rank + 2 },
        { variant: 'mid', a: rank - 1, b: rank + 1 },
        { variant: 'high', a: rank - 2, b: rank - 1 },
      ]
      for (const { variant, a, b } of variants) {
        if (a < 1 || a > 9 || b < 1 || b > 9) continue
        const idA = typeIdOf({ kind: 'suit', suit, rank: a as Rank })
        const idB = typeIdOf({ kind: 'suit', suit, rank: b as Rank })
        if ((counts[idA] ?? 0) >= 1 && (counts[idB] ?? 0) >= 1) {
          const tileA = findConcealedTilesOfType(hand, idA, 1)[0]!
          const tileB = findConcealedTilesOfType(hand, idB, 1)[0]!
          options.push({ kind: 'chow', usingTiles: [tileA, tileB], variant })
        }
      }
    }
  }

  return options
}

function meldTileTypeIdOf(meld: Meld): TileTypeId {
  const first = meld.tiles[0]
  if (first === undefined) throw new Error(`Meld ${meld.id} has no tiles`)
  return typeIdOfInstance(first)
}

function findConcealedTilesOfType(hand: Hand, typeId: TileTypeId, count: number): TileInstanceId[] {
  const found: TileInstanceId[] = []
  for (const tile of hand.concealedTiles) {
    if (found.length >= count) break
    if (typeIdOfInstance(tile) === typeId) found.push(tile)
  }
  if (found.length < count) throw new Error(`Hand does not have ${count} concealed tile(s) of type ${typeId}`)
  return found
}

function rankOf(tile: TileInstanceId): number {
  const type = typeOf(tile)
  if (type.kind !== 'suit') throw new Error(`rankOf called on a non-suited tile (${tile})`)
  return type.rank
}

function otherSeats(seat: Seat): Seat[] {
  return ([0, 1, 2, 3] as Seat[]).filter((s) => s !== seat)
}

function updatePlayer(
  players: [PlayerState, PlayerState, PlayerState, PlayerState],
  seat: Seat,
  patch: Partial<PlayerState>,
): [PlayerState, PlayerState, PlayerState, PlayerState] {
  const next = players.slice() as [PlayerState, PlayerState, PlayerState, PlayerState]
  next[seat] = { ...next[seat], ...patch }
  return next
}

// ---------------------------------------------------------------------------
// applyMove — the sole place actionLog is appended. Pure: returns a new
// GameState, never mutates the input.
// ---------------------------------------------------------------------------

export function applyMove(state: GameState, seat: Seat, move: Move): GameState {
  switch (state.phase) {
    case 'awaitingDraw':
      return applyDrawPhaseMove(state, seat, move)
    case 'awaitingDiscard':
      return applyDiscardPhaseMove(state, seat, move)
    case 'awaitingClaims':
    case 'awaitingRobKongClaims':
      return applyClaimDeclaration(state, seat, move)
    case 'handEnded':
      throw new Error('Hand has ended; no moves are legal')
  }
}

interface DrawLogResult {
  wall: Wall
  flowersDrawn: TileInstanceId[]
  finalTile: TileInstanceId | undefined
  exhausted: boolean
  actions: Action[]
}

// Draws (with flower replacement) and produces the log entries for it, but
// does not touch player/hand state — callers combine this with their own
// hand update and phase transition. Used for the normal turn draw AND every
// kong's replacement draw (concealed kong, added kong, kong claimed from a
// discard) — they're all the same "draw with flower replacement, then
// return to awaitingDiscard for the same seat" shape.
function performDrawWithLog(wall: Wall, seat: Seat, startSeq: number): DrawLogResult {
  const result = drawWithFlowerReplacement(wall)
  const drawnSequence = [...result.flowersDrawn, ...(result.finalTile !== undefined ? [result.finalTile] : [])]
  const actions: Action[] = []
  let seq = startSeq
  if (drawnSequence.length > 0) {
    actions.push({ seq: seq++, seat, type: 'draw', tile: drawnSequence[0]!, source: 'wall' })
    for (let i = 0; i < drawnSequence.length - 1; i++) {
      actions.push({
        seq: seq++,
        seat,
        type: 'flowerReplacement',
        flowerTile: drawnSequence[i]!,
        replacementTile: drawnSequence[i + 1]!,
      })
    }
  }
  if (result.finalTile === undefined) {
    actions.push({ seq: seq++, seat, type: 'exhaustiveDraw' })
  }
  return { wall: result.wall, flowersDrawn: result.flowersDrawn, finalTile: result.finalTile, exhausted: result.finalTile === undefined, actions }
}

// Shared by: the normal turn draw, concealed kong's replacement draw, added
// kong's replacement draw (once no one robs it), and kong-from-discard's
// replacement draw — all end the same way: draw, maybe exhaust the hand,
// otherwise return to awaitingDiscard for the same seat.
function performDrawAndAdvance(state: GameState, seat: Seat): GameState {
  const draw = performDrawWithLog(state.wall, seat, state.actionLog.length)
  let hand = state.players[seat].hand
  for (const flower of draw.flowersDrawn) hand = addFlower(hand, flower)
  let players = updatePlayer(state.players, seat, { hand })

  if (draw.exhausted) {
    return {
      ...state,
      wall: draw.wall,
      players,
      phase: 'handEnded',
      pendingClaim: undefined,
      result: { outcome: 'exhaustiveDraw' },
      actionLog: [...state.actionLog, ...draw.actions],
    }
  }

  hand = addToConcealed(hand, draw.finalTile!)
  players = updatePlayer(players, seat, { hand })
  return {
    ...state,
    wall: draw.wall,
    players,
    currentSeat: seat,
    phase: 'awaitingDiscard',
    pendingClaim: undefined,
    lastDrawnTile: draw.finalTile,
    actionLog: [...state.actionLog, ...draw.actions],
  }
}

function applyDrawPhaseMove(state: GameState, seat: Seat, move: Move): GameState {
  if (move.kind !== 'draw') throw new Error(`Illegal move ${move.kind} in awaitingDraw phase`)
  if (seat !== state.currentSeat) throw new Error(`Not seat ${seat}'s turn`)
  return performDrawAndAdvance(state, seat)
}

function finalizeWin(
  state: GameState,
  winnerSeat: Seat,
  winTile: TileInstanceId,
  winMethod: 'selfDraw' | 'discard' | 'robKong',
  loserSeat?: Seat,
): GameState {
  // Safety net, not just advisory filtering: legalDiscardPhaseMoves and
  // computeClaimOptionsForSeat already keep an under-8 win from ever being
  // OFFERED, but applyDiscardPhaseMove's 'selfDrawWin' branch (the only one
  // of the three win paths that doesn't first pass through a validated
  // claim declaration) trusts its caller otherwise — this re-check ensures
  // finalizeWin itself can never complete an illegal win regardless of path.
  if (!wouldMeetMinimumToWin(state, winnerSeat, winMethod, winTile)) {
    throw new Error(`Seat ${winnerSeat}'s hand does not meet the ${MINIMUM_POINTS_TO_WIN}-point minimum to declare Hu (§3.9.1.1)`)
  }
  const winAction: Action = {
    seq: state.actionLog.length,
    seat: winnerSeat,
    type: 'win',
    winTile,
    winMethod,
    ...(loserSeat !== undefined ? { discardSeat: loserSeat } : {}),
  }
  const result: HandResult = {
    outcome: 'win',
    winnerSeats: [winnerSeat],
    winMethod,
    winningTile: winTile,
    ...(loserSeat !== undefined ? { loserSeat } : {}),
  }
  return {
    ...state,
    phase: 'handEnded',
    pendingClaim: undefined,
    result,
    actionLog: [...state.actionLog, winAction],
  }
}

function proceedAfterNoDiscardClaim(state: GameState, fromSeat: Seat): GameState {
  if (isWallExhausted(state.wall)) {
    return {
      ...state,
      phase: 'handEnded',
      pendingClaim: undefined,
      result: { outcome: 'exhaustiveDraw' },
      actionLog: [...state.actionLog, { seq: state.actionLog.length, seat: fromSeat, type: 'exhaustiveDraw' }],
    }
  }
  const nextSeat = ((fromSeat + 1) % 4) as Seat
  return { ...state, phase: 'awaitingDraw', currentSeat: nextSeat, pendingClaim: undefined }
}

function applyDiscardPhaseMove(state: GameState, seat: Seat, move: Move): GameState {
  if (seat !== state.currentSeat) throw new Error(`Not seat ${seat}'s turn`)
  const player = state.players[seat]

  if (move.kind === 'selfDrawWin') {
    if (state.lastDrawnTile === undefined) throw new Error('No last-drawn tile to self-draw win on')
    return finalizeWin(state, seat, state.lastDrawnTile, 'selfDraw')
  }

  if (move.kind === 'concealedKong') {
    const consumed = findConcealedTilesOfType(player.hand, move.tileType, 4)
    const meldId = nextMeldId(seat, player.hand.melds)
    const meld: Meld = { id: meldId, kind: 'kong', exposure: 'concealed', kongSource: 'concealed', tiles: consumed, ownerSeat: seat }
    const newHand = addMeld(player.hand, meld, consumed)
    const players = updatePlayer(state.players, seat, { hand: newHand })
    const kongAction: Action = { seq: state.actionLog.length, seat, type: 'concealedKong', tiles: consumed, meldId }
    const nextState: GameState = { ...state, players, actionLog: [...state.actionLog, kongAction] }
    // Concealed kong is never robbable (docs/rules/decisions.md #1) — draw
    // the replacement directly, no claims window.
    return performDrawAndAdvance(nextState, seat)
  }

  if (move.kind === 'addedKong') {
    const newHand = promoteMeldToKong(player.hand, move.meldId, move.tile)
    const players = updatePlayer(state.players, seat, { hand: newHand })
    const addedKongAction: Action = { seq: state.actionLog.length, seat, type: 'addedKong', meldId: move.meldId, addedTile: move.tile }
    const nextState: GameState = { ...state, players, actionLog: [...state.actionLog, addedKongAction] }

    const eligibleSeats = otherSeats(seat).filter(
      (s) => computeClaimOptionsForSeat(nextState, move.tile, seat, s, 'addedKongRob').length > 0,
    )
    if (eligibleSeats.length === 0) return performDrawAndAdvance(nextState, seat)
    return {
      ...nextState,
      phase: 'awaitingRobKongClaims',
      pendingClaim: { tile: move.tile, fromSeat: seat, kind: 'addedKongRob', meldIdBeingPromoted: move.meldId, eligibleSeats, declarations: {} },
    }
  }

  if (move.kind === 'discard') {
    const newHand = removeFromConcealed(player.hand, [move.tile])
    const players = updatePlayer(state.players, seat, { hand: newHand, discards: [...player.discards, move.tile] })
    const discardAction: Action = { seq: state.actionLog.length, seat, type: 'discard', tile: move.tile }
    const nextState: GameState = { ...state, players, actionLog: [...state.actionLog, discardAction] }

    const eligibleSeats = otherSeats(seat).filter(
      (s) => computeClaimOptionsForSeat(nextState, move.tile, seat, s, 'discard').length > 0,
    )
    if (eligibleSeats.length === 0) return proceedAfterNoDiscardClaim(nextState, seat)
    return {
      ...nextState,
      phase: 'awaitingClaims',
      pendingClaim: { tile: move.tile, fromSeat: seat, kind: 'discard', eligibleSeats, declarations: {} },
    }
  }

  throw new Error(`Illegal move ${move.kind} in awaitingDiscard phase`)
}

function applyMeldClaim(state: GameState, claimantSeat: Seat, move: Move, pendingClaim: PendingClaim): GameState {
  const player = state.players[claimantSeat]
  const claimedTypeId = typeIdOfInstance(pendingClaim.tile)
  const meldId = nextMeldId(claimantSeat, player.hand.melds)
  let consumed: TileInstanceId[]
  let meldTiles: TileInstanceId[]
  let meldKind: MeldKind
  let kongSource: KongSource | undefined

  if (move.kind === 'pung') {
    consumed = findConcealedTilesOfType(player.hand, claimedTypeId, 2)
    meldTiles = [...consumed, pendingClaim.tile]
    meldKind = 'pung'
  } else if (move.kind === 'kong') {
    consumed = findConcealedTilesOfType(player.hand, claimedTypeId, 3)
    meldTiles = [...consumed, pendingClaim.tile]
    meldKind = 'kong'
    kongSource = 'exposedFromDiscard'
  } else if (move.kind === 'chow') {
    consumed = move.usingTiles.slice()
    meldTiles = [pendingClaim.tile, ...consumed].sort((a, b) => rankOf(a) - rankOf(b))
    meldKind = 'chow'
  } else {
    throw new Error(`Unexpected move kind ${move.kind} in applyMeldClaim`)
  }

  const meld: Meld = {
    id: meldId,
    kind: meldKind,
    exposure: 'exposed',
    ...(kongSource ? { kongSource } : {}),
    tiles: meldTiles,
    ownerSeat: claimantSeat,
    claimedFrom: { seat: pendingClaim.fromSeat, discardTile: pendingClaim.tile },
  }

  const newHand = addMeld(player.hand, meld, consumed)
  let players = updatePlayer(state.players, claimantSeat, { hand: newHand })
  // The claimed tile leaves the discarder's river — it's now part of the
  // claimant's meld, not sitting in both places at once.
  const discarder = players[pendingClaim.fromSeat]
  const discardIndex = discarder.discards.lastIndexOf(pendingClaim.tile)
  if (discardIndex === -1) {
    throw new Error(`Claimed tile ${pendingClaim.tile} is not in seat ${pendingClaim.fromSeat}'s discards`)
  }
  const remainingDiscards = discarder.discards.slice()
  remainingDiscards.splice(discardIndex, 1)
  players = updatePlayer(players, pendingClaim.fromSeat, { discards: remainingDiscards })

  const claimAction: Action = {
    seq: state.actionLog.length,
    seat: claimantSeat,
    type: 'claim',
    claimType: meldKind,
    claimedTile: pendingClaim.tile,
    fromSeat: pendingClaim.fromSeat,
    usedConcealedTiles: consumed,
    meldId,
  }
  const nextState: GameState = { ...state, players, pendingClaim: undefined, actionLog: [...state.actionLog, claimAction] }

  if (meldKind === 'kong') return performDrawAndAdvance(nextState, claimantSeat)
  return { ...nextState, currentSeat: claimantSeat, phase: 'awaitingDiscard' }
}

function resolveDiscardClaimWindow(state: GameState, pendingClaim: PendingClaim, resolved: ResolvedClaim | null): GameState {
  if (resolved === null) return proceedAfterNoDiscardClaim(state, pendingClaim.fromSeat)
  if (resolved.move.kind === 'win') {
    return finalizeWin(state, resolved.seat, pendingClaim.tile, 'discard', pendingClaim.fromSeat)
  }
  return applyMeldClaim(state, resolved.seat, resolved.move, pendingClaim)
}

function resolveRobKongWindow(state: GameState, pendingClaim: PendingClaim, resolved: ResolvedClaim | null): GameState {
  if (resolved !== null && resolved.move.kind === 'win') {
    const seq0 = state.actionLog.length
    const robAction: Action = {
      seq: seq0,
      seat: resolved.seat,
      type: 'robKongWin',
      meldIdBeingRobbed: pendingClaim.meldIdBeingPromoted!,
      tile: pendingClaim.tile,
    }
    const stateWithRobLogged: GameState = { ...state, actionLog: [...state.actionLog, robAction] }
    return finalizeWin(stateWithRobLogged, resolved.seat, pendingClaim.tile, 'robKong', pendingClaim.fromSeat)
  }
  // Nobody robbed it — the kong finalizes: the promoting seat draws a
  // replacement tile, same as any other kong.
  return performDrawAndAdvance(state, pendingClaim.fromSeat)
}

function applyClaimDeclaration(state: GameState, seat: Seat, move: Move): GameState {
  const pendingClaim = state.pendingClaim
  if (!pendingClaim) throw new Error('No pending claim to declare against')
  if (!pendingClaim.eligibleSeats.includes(seat)) throw new Error(`Seat ${seat} is not eligible to declare on this claim`)
  if (pendingClaim.declarations[seat] !== undefined) throw new Error(`Seat ${seat} has already declared`)

  const nonPassOptions = computeClaimOptionsForSeat(state, pendingClaim.tile, pendingClaim.fromSeat, seat, pendingClaim.kind)
  const allOptions: Move[] = [...nonPassOptions, { kind: 'pass' }]
  if (!allOptions.some((m) => JSON.stringify(m) === JSON.stringify(move))) {
    throw new Error(`Illegal claim declaration for seat ${seat}: ${JSON.stringify(move)}`)
  }

  let actionLog = state.actionLog
  if (move.kind === 'pass') {
    const declinedOptions = [...new Set(nonPassOptions.map((m) => m.kind as 'chow' | 'pung' | 'kong' | 'win'))]
    actionLog = [...actionLog, { seq: actionLog.length, seat, type: 'pass', declinedOptions }]
  }

  const updatedPendingClaim: PendingClaim = {
    ...pendingClaim,
    declarations: { ...pendingClaim.declarations, [seat]: move },
  }
  const nextState: GameState = { ...state, pendingClaim: updatedPendingClaim, actionLog }

  if (!allDeclared(updatedPendingClaim)) return nextState

  const resolved = resolvePendingClaim(updatedPendingClaim)
  return pendingClaim.kind === 'addedKongRob'
    ? resolveRobKongWindow(nextState, updatedPendingClaim, resolved)
    : resolveDiscardClaimWindow(nextState, updatedPendingClaim, resolved)
}
