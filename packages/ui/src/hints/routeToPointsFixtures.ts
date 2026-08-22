import type { FanTargetEstimate, RouteToPointsResult } from '@mahjong-mcr/engine'

// Keep each candidate as one object shared by reference across every route
// array, matching computeRouteToPoints' live contract.
const dragonPungCandidate: FanTargetEstimate = {
  fanId: 59,
  points: 2,
  status: 'inProgress',
  tilesNeeded: ['DG'],
  completionProbability: 0.67,
  probabilityBasis: 'shanten',
  value: 1.34,
}

const sevenPairsCandidate: FanTargetEstimate = {
  fanId: 19,
  points: 24,
  status: 'inProgress',
  tilesNeeded: ['C2', 'C5', 'D4', 'D8', 'B1', 'B6'],
  completionProbability: 0.14,
  probabilityBasis: 'shanten',
  value: 3.36,
}

const halfFlushCandidate: FanTargetEstimate = {
  fanId: 50,
  points: 6,
  status: 'inProgress',
  tilesNeeded: ['C2', 'C5', 'D4', 'D8'],
  completionProbability: 0.22,
  probabilityBasis: 'heuristic',
  value: 1.32,
}

const allSimplesCandidate: FanTargetEstimate = {
  fanId: 68,
  points: 2,
  status: 'inProgress',
  tilesNeeded: ['WE'],
  completionProbability: 0.31,
  probabilityBasis: 'heuristic',
  value: 0.62,
}

export const reachableFixture: RouteToPointsResult = {
  candidates: [dragonPungCandidate],
  selected: [dragonPungCandidate],
  lockedInPoints: 2,
  bestCaseTotal: 4,
  credibleSelected: [dragonPungCandidate],
  crediblePointsTotal: 4,
  minimumPointsStatus: 'reachable',
}

export const currentWaitsFallShortFixture: RouteToPointsResult = {
  candidates: [],
  selected: [],
  lockedInPoints: 2,
  bestCaseTotal: 2,
  credibleSelected: [],
  crediblePointsTotal: 2,
  minimumPointsStatus: 'currentWaitsFallShort',
}

export const sharpDisagreementFixture: RouteToPointsResult = {
  candidates: [sevenPairsCandidate, halfFlushCandidate, allSimplesCandidate],
  selected: [sevenPairsCandidate],
  lockedInPoints: 0,
  bestCaseTotal: 24,
  credibleSelected: [],
  crediblePointsTotal: 0,
  minimumPointsStatus: 'unknown',
}

export const meldedNothingToOfferFixture: RouteToPointsResult = {
  candidates: [],
  selected: [],
  lockedInPoints: 0,
  bestCaseTotal: 0,
  credibleSelected: [],
  crediblePointsTotal: 0,
  minimumPointsStatus: 'unknown',
}
