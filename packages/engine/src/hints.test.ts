import { describe, expect, it } from 'vitest'
import { chooseDiscard, rankDiscards } from './bots/policy.js'
import { computeBestMoveHint, computeHandPlan, deriveOneLinerReason } from './hints.js'
import { emptyHand, type Hand } from './hand.js'
import type { Meld } from './meld.js'
import { evaluateDiscards } from './tile-efficiency.js'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileInstanceId, type TileTypeId } from './tiles.js'

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function handWith(concealedTiles: TileInstanceId[]): Hand {
  return { ...emptyHand(), concealedTiles }
}

// Same "one obviously-correct discard" shape as tile-efficiency.test.ts:
// tenpai-13 (waiting on C2/C5) plus one isolated North Wind that doesn't
// interact with anything else.
function tenpaiPlusIsolated(): TileInstanceId[] {
  return [
    ...idsFor('C3', 1),
    ...idsFor('C4', 1),
    ...idsFor('D4', 1),
    ...idsFor('D5', 1),
    ...idsFor('D6', 1),
    ...idsFor('B7', 1),
    ...idsFor('B8', 1),
    ...idsFor('B9', 1),
    ...idsFor('DW', 3),
    ...idsFor('C9', 2),
    ...idsFor('WN', 1),
  ]
}

describe('computeBestMoveHint', () => {
  it('recommends the same discard bots/policy.ts\'s chooseDiscard would pick, for several different hands', () => {
    const hands: Hand[] = [
      handWith(tenpaiPlusIsolated()),
      handWith([...idsFor('C9', 2), ...idsFor('C3', 1), ...idsFor('C4', 1), ...idsFor('C5', 1), ...idsFor('B1', 1), ...idsFor('B2', 1), ...idsFor('B3', 1), ...idsFor('D2', 1), ...idsFor('D3', 1), ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('DR', 2)]),
    ]
    for (const hand of hands) {
      const hint = computeBestMoveHint(hand)
      expect(hint).not.toBeNull()
      expect(hint!.recommendedDiscard).toBe(chooseDiscard(hand))
    }
  })

  it('completing tenpai gives a headline that says so, via deriveOneLinerReason\'s text fallback', () => {
    const hint = computeBestMoveHint(handWith(tenpaiPlusIsolated()))!
    expect(hint.headline).toMatch(/wait/i)
    expect(deriveOneLinerReason(hint)).toMatch(/wait/i)
  })

  // KICKOFF-phase10-strategy-coach.md's own live hand, verbatim: a 2C
  // triplet, a 5B pair, eight isolated tiles (1C 2C2C2C 6C 9C 4D 3B 5B5B 8B
  // WE WS WN). The OLD greedy ranking recommended discarding a 2C — arithmetic-
  // ally defensible (Standard sits 5-shanten, Seven Pairs 4-shanten, so the
  // triplet's third copy is dead weight under Seven Pairs, decisions.md #5)
  // but strategically premature: it commits the hand to Seven Pairs at
  // 4-shanten to buy only 3 extra outs (27 vs 24) while a plain isolated
  // discard keeps BOTH Standard (5-shanten) and Seven Pairs (4-shanten)
  // alive. Stage 1's regret-aware ranking (bots/policy.ts) must now prefer
  // one of those isolated discards instead.
  function kickoffLiveHand(): TileInstanceId[] {
    return [
      ...idsFor('C1', 1), ...idsFor('C2', 3), ...idsFor('C6', 1), ...idsFor('C9', 1),
      ...idsFor('D4', 1),
      ...idsFor('B3', 1), ...idsFor('B5', 2), ...idsFor('B8', 1),
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WN', 1),
    ]
  }

  it('Stage 1 fixture: recommends an isolated tile, NOT a 2C, and shows both Standard and Seven Pairs alive', () => {
    const hint = computeBestMoveHint(handWith(kickoffLiveHand()))!

    expect(typeIdOfInstance(hint.recommendedDiscard)).not.toBe('C2')

    const standardRow = hint.routeTable.find((r) => r.shape === 'standard')!
    const sevenPairsRow = hint.routeTable.find((r) => r.shape === 'sevenPairs')!
    expect(standardRow.shanten).toBe(5)
    expect(standardRow.viable).toBe(true)
    expect(sevenPairsRow.shanten).toBe(4)
    expect(sevenPairsRow.viable).toBe(true)

    // The doc's own numeric claim: the recommended (regret-0) discard costs
    // exactly 3 outs relative to 2C (24 vs 27) — the price of staying
    // flexible, not a wash.
    const evaluations = evaluateDiscards(handWith(kickoffLiveHand()))
    const c2 = evaluations.find((e) => typeIdOfInstance(e.tile) === 'C2')!
    const top = evaluations.find((e) => e.tile === hint.recommendedDiscard)!
    expect(c2.ukeire.totalCount - top.ukeire.totalCount).toBe(3)
  })

  it('Stage 1 fixture: the recommended discard is one of the tied, genuinely isolated candidates (not just "any non-2C")', () => {
    // legacyDiscardCompare's own tie-break (kept exactly per KICKOFF §1b:
    // "keep the determinism") settles the final pick among every candidate
    // tied on regret+ukeire — several isolated tiles qualify here, not one
    // uniquely "correct" tile, so this checks the recommendation is a member
    // of that tied set rather than pinning one arbitrary winner.
    const hint = computeBestMoveHint(handWith(kickoffLiveHand()))!
    const recommendedType = typeIdOfInstance(hint.recommendedDiscard)
    expect(['C1', 'C9', 'WE', 'WS', 'WN']).toContain(recommendedType)
  })

  it('still names the Seven Pairs route (the old shapeNote\'s job) on the live hand, now via features/routeTable', () => {
    const hint = computeBestMoveHint(handWith(kickoffLiveHand()))!
    expect(hint.features.some((f) => `${f.title} ${f.detail}`.match(/Seven Pairs/))).toBe(true)
    expect(hint.features.some((f) => `${f.title} ${f.detail}`.match(/dead weight/))).toBe(true)
  })

  // KICKOFF-phase10-strategy-coach.md §1e fixture 2: a pair-heavy hand at
  // 2-shanten (< EARLY_GAME_MIN_SHANTEN) where committing IS correct — the
  // late-game collapse (bots/policy.ts §1b) must produce exactly what the
  // pre-Stage-1 greedy rule already did: most ukeire, then honor/terminal-
  // first, then fixed type order, with no regret computation involved at
  // all (four real pairs already formed; six singles left to trim).
  it('Stage 1 fixture: a pair-heavy 2-shanten hand still commits exactly like the old greedy ranking (late-game collapse)', () => {
    const hand = handWith([
      ...idsFor('C1', 2), ...idsFor('C4', 2), ...idsFor('C7', 2), ...idsFor('D1', 2),
      ...idsFor('D4', 1), ...idsFor('D7', 1), ...idsFor('B1', 1), ...idsFor('B4', 1), ...idsFor('B7', 1), ...idsFor('B2', 1),
    ])
    const evaluations = evaluateDiscards(hand)
    const minShanten = Math.min(...evaluations.map((e) => e.resultingShanten))
    expect(minShanten).toBe(2) // confirms this hand actually exercises the "late" (< 3) branch

    const hint = computeBestMoveHint(hand)!
    // B1 is the unique terminal among the tied-ukeire candidates — the exact
    // tile legacyDiscardCompare's honor/terminal-first rule would pick.
    expect(typeIdOfInstance(hint.recommendedDiscard)).toBe('B1')
    expect(hint.recommendedDiscard).toBe(chooseDiscard(hand))
  })

  it('does not mention a special shape when no non-Standard route is viable', () => {
    // tenpaiPlusIsolated is a plain standard-shape hand with no real pair
    // structure — Seven Pairs/Thirteen Orphans should sit far outside the
    // viable margin, so no route-flexibility feature should appear.
    const hint = computeBestMoveHint(handWith(tenpaiPlusIsolated()))!
    expect(hint.features.some((f) => /Seven Pairs|Thirteen Orphans/.test(`${f.title} ${f.detail}`))).toBe(false)
  })

  it('alternatives lists exactly rankDiscards(evaluateDiscards(hand)) minus the top pick, same order, each with a relativeScore in [0,1]', () => {
    const hand = handWith(tenpaiPlusIsolated())
    const hint = computeBestMoveHint(hand)!
    const ranked = rankDiscards(evaluateDiscards(hand))
    expect(hint.recommendedDiscard).toBe(ranked[0]!.tile)
    expect(hint.alternatives.map((a) => a.tile)).toEqual(ranked.slice(1).map((e) => e.tile))
    expect(hint.alternatives.some((a) => a.tile === hint.recommendedDiscard)).toBe(false)
    for (const alt of hint.alternatives) {
      expect(alt.relativeScore).toBeGreaterThanOrEqual(0)
      expect(alt.relativeScore).toBeLessThanOrEqual(1)
    }
  })

  it('confidence is 1 when there is a single uniquely-best candidate', () => {
    // tenpaiPlusIsolated's isolated North Wind is the UNIQUE way to stay at
    // shanten 0 (tile-efficiency.test.ts asserts this same uniqueness
    // directly) — no second candidate to compare against.
    const hint = computeBestMoveHint(handWith(tenpaiPlusIsolated()))!
    expect(hint.alternatives).toHaveLength(0)
    expect(hint.confidence).toBe(1)
  })

  it('returns null for an empty hand', () => {
    expect(computeBestMoveHint(handWith([]))).toBeNull()
  })
})

describe('computeHandPlan', () => {
  it('pre-tenpai: empty waits, null reach-minimum flags, no locked-in fans without melds', () => {
    const hand = handWith([...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1)])
    const plan = computeHandPlan(hand)
    expect(plan.shanten.shanten).toBeGreaterThan(0)
    expect(plan.waits).toEqual([])
    expect(plan.bestCaseReachesMinimum).toBeNull()
    expect(plan.worstCaseReachesMinimum).toBeNull()
    expect(plan.lockedInFans).toEqual([])
  })

  it('pre-tenpai: an exposed dragon pung is already locked in (fan 59)', () => {
    const dragonPung: Meld = {
      id: '0-0',
      kind: 'pung',
      exposure: 'exposed',
      tiles: idsFor('DW', 3),
      ownerSeat: 0,
    }
    const hand: Hand = { ...emptyHand(), concealedTiles: [...idsFor('C1', 1), ...idsFor('C4', 1)], melds: [dragonPung] }
    const plan = computeHandPlan(hand)
    expect(plan.waits).toEqual([])
    expect(plan.lockedInFans).toContainEqual({ fanId: 59, count: 1 })
  })

  it('tenpai, every wait reaches 8+: both reach-minimum flags are true', () => {
    // Two dragon pungs (11+ pts either way) — same shape verified elsewhere
    // this session for the 8-point win-legality gate's fixtures.
    const concealed = [
      ...idsFor('C3', 1),
      ...idsFor('C4', 1),
      ...idsFor('B7', 1),
      ...idsFor('B8', 1),
      ...idsFor('B9', 1),
      ...idsFor('DW', 3),
      ...idsFor('DG', 3),
      ...idsFor('C9', 2),
    ]
    const plan = computeHandPlan(handWith(concealed), { prevailingWind: 'east', seatWind: 'north' })
    expect(plan.shanten.shanten).toBe(0)
    expect(plan.waits.length).toBeGreaterThan(0)
    expect(plan.bestCaseReachesMinimum).toBe(true)
    expect(plan.worstCaseReachesMinimum).toBe(true)
    // Two Dragon Pungs (54) applies to every wait/method — genuinely locked in.
    expect(plan.lockedInFans).toContainEqual({ fanId: 54, count: 1 })
  })

  it('tenpai with a mixed-value shanpon wait: bestCase true, worstCase false (the 8-point trap)', () => {
    // Shanpon on C9 or DG. C9-discard scores 7 (under the minimum); every
    // other combination (C9-selfDraw, DG-discard, DG-selfDraw) reaches 8+.
    // Verified computationally via scoreHand directly, not hand-derived.
    const concealed = [
      ...idsFor('D4', 1),
      ...idsFor('D5', 1),
      ...idsFor('D6', 1),
      ...idsFor('B7', 1),
      ...idsFor('B8', 1),
      ...idsFor('B9', 1),
      ...idsFor('DW', 3),
      ...idsFor('C9', 2),
      ...idsFor('DG', 2),
    ]
    const plan = computeHandPlan(handWith(concealed), { prevailingWind: 'east', seatWind: 'north' })
    expect(plan.shanten.shanten).toBe(0)
    expect(plan.bestCaseReachesMinimum).toBe(true)
    expect(plan.worstCaseReachesMinimum).toBe(false)
  })

  // KICKOFF-phase10 gap fix: HandPlanTab used to render a single crowned-min
  // shape/shanten line (plan.shanten.shape), exactly the collapse Stage 1a
  // undid for discard ranking — just never undone here. Same live hand as
  // the computeBestMoveHint fixtures above (1C 2C2C2C 6C 9C 4D 3B 5B5B 8B WE
  // WS WN): Standard sits 5-shanten, Seven Pairs 4-shanten, a 1-shanten gap
  // — inside VIABLE_ROUTE_SHANTEN_MARGIN, so both must stay listed as
  // viable and NEITHER gets crowned primary.
  it('both routes stay viable and neither is named primary when they sit within the margin of each other', () => {
    const concealed = [
      ...idsFor('C1', 1), ...idsFor('C2', 3), ...idsFor('C6', 1), ...idsFor('C9', 1),
      ...idsFor('D4', 1),
      ...idsFor('B3', 1), ...idsFor('B5', 2), ...idsFor('B8', 1),
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WN', 1),
    ]
    const plan = computeHandPlan(handWith(concealed), { prevailingWind: 'east', seatWind: 'north' })

    const standardRow = plan.routes.find((r) => r.shape === 'standard')!
    const sevenPairsRow = plan.routes.find((r) => r.shape === 'sevenPairs')!
    expect(standardRow.shanten).toBe(5)
    expect(standardRow.viable).toBe(true)
    expect(sevenPairsRow.shanten).toBe(4)
    expect(sevenPairsRow.viable).toBe(true)
    expect(plan.primaryRoute).toBeNull()
  })

  // The other half: once a route genuinely clears the margin, it — and only
  // it — is named primary. Reuses the "every wait reaches 8+" tenpai fixture
  // above (Standard tenpai at 0-shanten; Seven Pairs is several shanten back
  // with only 3 of its 8 pairs formed — well outside the margin).
  it('names the primary route once it clearly pulls ahead of every other route', () => {
    const concealed = [
      ...idsFor('C3', 1),
      ...idsFor('C4', 1),
      ...idsFor('B7', 1),
      ...idsFor('B8', 1),
      ...idsFor('B9', 1),
      ...idsFor('DW', 3),
      ...idsFor('DG', 3),
      ...idsFor('C9', 2),
    ]
    const plan = computeHandPlan(handWith(concealed), { prevailingWind: 'east', seatWind: 'north' })
    expect(plan.shanten.shanten).toBe(0)
    expect(plan.primaryRoute).toBe('standard')
  })
})
