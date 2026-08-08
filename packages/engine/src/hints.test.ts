import { describe, expect, it } from 'vitest'
import { chooseDiscard, rankDiscards } from './bots/policy.js'
import { computeBestMoveHint, computeHandPlan, computeRouteToPoints, deriveOneLinerReason } from './hints.js'
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
  // WE WS WN). This is the hand the whole phase was built around: the
  // pre-Stage-1 greedy ranking recommends discarding a 2C — arithmetically
  // defensible (27 outs, the most of any candidate) but strategically
  // premature, since it commits the hand harder to Seven Pairs (the
  // triplet's third copy becomes genuinely dead weight there,
  // decisions.md #5) at the cost of Standard's own shanten (6 after
  // discarding 2C, vs 5 if an isolated tile is discarded instead).
  //
  // Stage 1 (2026-08-03) added a regret-aware ranking that preferred an
  // isolated discard here instead. That ranking was reverted on
  // 2026-08-06 (decisions.md #18: three same-direction self-play runs,
  // none individually significant but never once favoring it) — this
  // fixture now documents the CURRENT, correct, greedy behavior: the bot
  // and rankDiscards both go back to recommending the 2C, exactly like
  // pre-Stage-1. What Stage 1 kept is the DISPLAY: the route table below
  // still shows the player that Seven Pairs and Standard both stay
  // structurally reachable, with real shanten numbers, whichever tile
  // ends up recommended — the coach's job now is to show this, not to
  // auto-avoid it on the player's behalf.
  function kickoffLiveHand(): TileInstanceId[] {
    return [
      ...idsFor('C1', 1), ...idsFor('C2', 3), ...idsFor('C6', 1), ...idsFor('C9', 1),
      ...idsFor('D4', 1),
      ...idsFor('B3', 1), ...idsFor('B5', 2), ...idsFor('B8', 1),
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WN', 1),
    ]
  }

  it('recommends the 2C (reverted to greedy, decisions.md #18) and still shows both Standard and Seven Pairs alive', () => {
    const hint = computeBestMoveHint(handWith(kickoffLiveHand()))!

    // The greedy comparator picks whichever candidate has the most raw
    // ukeire — three physical 2C tiles all tie for the max (27), so the
    // recommendation is necessarily one of them.
    expect(typeIdOfInstance(hint.recommendedDiscard)).toBe('C2')

    const standardRow = hint.routeTable.find((r) => r.shape === 'standard')!
    const sevenPairsRow = hint.routeTable.find((r) => r.shape === 'sevenPairs')!
    // These are the RECOMMENDED discard's (2C's) own per-shape numbers —
    // discarding a copy of the triplet costs Standard a shanten (6, not
    // the 5 an isolated discard would leave) in exchange for the extra
    // outs. `viable` is still true because it's judged against the best
    // ANY candidate discard could achieve for that shape (an isolated
    // discard still reaches Standard 5), not the recommended one alone —
    // that's the display-side flexibility signal Stage 1 kept.
    expect(standardRow.shanten).toBe(6)
    expect(standardRow.viable).toBe(true)
    expect(sevenPairsRow.shanten).toBe(4)
    expect(sevenPairsRow.viable).toBe(true)

    // The 2C is the highest-ukeire candidate by construction (that's why
    // greedy picks it) — 27 outs, 3 more than the best isolated
    // alternative (24). Same numeric gap the doc originally cited, just
    // now describing why greedy prefers 2C instead of why it costs.
    const evaluations = evaluateDiscards(handWith(kickoffLiveHand()))
    const c1 = evaluations.find((e) => typeIdOfInstance(e.tile) === 'C1')!
    const top = evaluations.find((e) => e.tile === hint.recommendedDiscard)!
    expect(top.ukeire.totalCount - c1.ukeire.totalCount).toBe(3)
  })

  it('still names the Seven Pairs route (the old shapeNote\'s job) on the live hand, now via features/routeTable', () => {
    const hint = computeBestMoveHint(handWith(kickoffLiveHand()))!
    expect(hint.features.some((f) => `${f.title} ${f.detail}`.match(/Seven Pairs/))).toBe(true)
    expect(hint.features.some((f) => `${f.title} ${f.detail}`.match(/dead weight/))).toBe(true)
  })

  // A pair-heavy hand at 2-shanten. Was originally Stage 1's own §1e
  // fixture 2, proving the (since-reverted, decisions.md #18) regret-aware
  // ranking's "late game" branch collapsed to plain greedy near tenpai.
  // rankDiscards is unconditionally greedy now (no early/late distinction
  // left at all), so this is really just a general greedy-ranking check —
  // kept as a fixture since it's still a real, useful case (four real
  // pairs already formed; six singles left to trim).
  it('a pair-heavy 2-shanten hand: most ukeire, then honor/terminal-first, then fixed type order', () => {
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

describe('computeRouteToPoints', () => {
  it('warns when nothing reaches the 8-point minimum', () => {
    // Same "too speculative" scattered hand as fan-targets.test.ts's
    // estimateAllPungs fixture — 13 distinct singles, nothing close to any target.
    const hand = handWith([
      ...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1),
      ...idsFor('D1', 1), ...idsFor('D4', 1), ...idsFor('D7', 1),
      ...idsFor('B1', 1), ...idsFor('B4', 1), ...idsFor('B7', 1),
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
    ])
    const result = computeRouteToPoints(hand)
    expect(result.reachesMinimum).toBe(false)
    expect(result.warning).toBe(true)
    expect(result.bestCaseTotal).toBeLessThan(8)
  })

  it('does not warn once a real candidate clears the minimum on its own', () => {
    // Two dragon pungs sitting CONCEALED (never declared as melds), plus a
    // partial third — lockedInFansFromMelds sees nothing (melds-only), but
    // estimateDragonTargets recognizes the concealed pungs and offers Big
    // Three Dragons (88pts) as a candidate, clearing 8 on its own.
    const hand = handWith([
      ...idsFor('DR', 3), ...idsFor('DG', 3), ...idsFor('DW', 2),
      ...idsFor('C1', 1), ...idsFor('C2', 1), ...idsFor('C3', 1), ...idsFor('C4', 1), ...idsFor('C5', 1),
    ])
    const result = computeRouteToPoints(hand)
    expect(result.reachesMinimum).toBe(true)
    expect(result.warning).toBe(false)
    expect(result.bestCaseTotal).toBeGreaterThanOrEqual(8)
    expect(result.selected.some((c) => c.fanId === 2)).toBe(true)
  })

  it('filters directionally-incompatible candidates not covered by exclusions.ts (Half Flush vs All Simples/No Honors)', () => {
    // Real bug found while writing this function: Half Flush (50) requires
    // keeping a honor tile, All Simples (68)/No Honors (76) require
    // discarding every honor tile — contradictory directions for the same
    // hand, but not a scoring/exclusions.ts entry (a COMPLETE hand can never
    // satisfy both anyway, so the real detectors never needed one). An
    // earlier version of computeRouteToPoints summed 50+68's raw points
    // (6+2=8) into a false "reaches minimum" on exactly this hand.
    const hand = handWith([
      ...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1),
      ...idsFor('D1', 1), ...idsFor('D4', 1), ...idsFor('D7', 1),
      ...idsFor('B1', 1), ...idsFor('B4', 1), ...idsFor('B7', 1),
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
    ])
    const result = computeRouteToPoints(hand)
    const selectedFanIds = result.selected.map((c) => c.fanId)
    expect(selectedFanIds).toContain(50)
    expect(selectedFanIds).not.toContain(68)
    expect(selectedFanIds).not.toContain(76)
    expect(result.reachesMinimum).toBe(false)
  })

  it('filters mutually-exclusive candidates out of the greedy sum (All Simples vs No Honors, exclusions.ts [68,76])', () => {
    const hand = handWith([...idsFor('C5', 4), ...idsFor('C6', 4), ...idsFor('D5', 4), ...idsFor('D6', 1)])
    const result = computeRouteToPoints(hand)
    const candidateFanIds = result.candidates.map((c) => c.fanId)
    expect(candidateFanIds).toContain(68)
    expect(candidateFanIds).toContain(76)
    const selectedFanIds = result.selected.map((c) => c.fanId)
    expect(selectedFanIds.includes(68) && selectedFanIds.includes(76)).toBe(false)
  })

  // Real defect found in review, NOT caught by the honor-axis check above:
  // Seven Pairs (19) is a shape with NO sets at all (win-detection.ts's
  // isSevenPairs requires every one of its 7 groups to have count === 2,
  // never >= 3) — structurally incompatible with ANY fan requiring a
  // pung/kong (All Pungs included, which requires FOUR). No complete hand
  // can ever be both, but scoring/exclusions.ts has no [19,49] entry
  // because the real detectors never needed one (they just never co-fire
  // on a complete hand) -- the same gap class as the Half Flush/All Simples
  // bug above, but on the SHAPE axis instead of the honor axis. A concealed
  // hand sitting on several pairs satisfies both ESTIMATORS at once even
  // though no real hand can ever score both fans. Fixtured before the fix
  // per CLAUDE.md.
  it('filters shape-incompatible candidates not covered by the honor-axis check (Seven Pairs vs All Pungs)', () => {
    const hand = handWith([
      ...idsFor('C1', 2), ...idsFor('C2', 2), ...idsFor('C3', 2),
      ...idsFor('C4', 2), ...idsFor('C5', 2),
      ...idsFor('C6', 1), ...idsFor('C7', 1), ...idsFor('C8', 1),
    ])
    const result = computeRouteToPoints(hand)
    const selectedFanIds = result.selected.map((c) => c.fanId)
    expect(selectedFanIds.includes(19) && selectedFanIds.includes(49)).toBe(false)
  })

  // fan-target-compatibility.ts's table only ever classifies pairs among
  // the 10 Stage 3 families -- isRouteCompatible defaults an unknown pair
  // to false (see that module's own comment), which is the RIGHT default
  // for a pair among the 10 (the completeness test guarantees no such pair
  // is ever actually unknown) but the WRONG default for a locked-in fan
  // from OUTSIDE the 10 (e.g. Concealed Kong, fanId 67) -- there is no real
  // conflict there, this module simply has no opinion. Caught while wiring
  // this module in, before it shipped.
  it('a locked-in fan outside the 10 Stage 3 families does not block an unrelated Stage 3 candidate', () => {
    // Deliberately far from tenpai (shanten 3): a hand this close to
    // complete would make computeHandPlan use the real-waits
    // intersectFanMatches path instead of the melds-only one, which could
    // legitimately lock Half Flush in for real (a different, correct
    // reason for fanId 50 to be absent from `selected`) and mask the actual
    // gap this fixture targets.
    const concealedKong: Meld = { id: '0-0', kind: 'kong', exposure: 'concealed', kongSource: 'concealed', tiles: idsFor('C1', 4), ownerSeat: 0 }
    const hand: Hand = {
      ...emptyHand(),
      concealedTiles: [...idsFor('C4', 2), ...idsFor('C7', 2), ...idsFor('WE', 2), ...idsFor('D2', 1), ...idsFor('D5', 1), ...idsFor('B3', 1), ...idsFor('B6', 1)],
      melds: [concealedKong],
    }
    const plan = computeHandPlan(hand)
    expect(plan.shanten.shanten).toBeGreaterThan(0)
    expect(plan.lockedInFans).toEqual([{ fanId: 67, count: 1 }]) // Concealed Kong only, melds-only path
    const result = computeRouteToPoints(hand)
    expect(result.candidates.some((c) => c.fanId === 50)).toBe(true) // Half Flush candidate exists
    expect(result.selected.some((c) => c.fanId === 50)).toBe(true) // and isn't wrongly filtered out
  })
})
