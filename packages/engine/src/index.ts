// Public API of @mahjong-mcr/engine. Deliberately does NOT re-export
// testing/random-agent.ts — it's test-support (a headless random-legal-move
// harness), not part of the game-rules API, and re-exporting it here would
// ship it into any bundle that imports this package, including the UI's
// browser bundle, for zero benefit there. M4's bot-simulation test harness
// can import it by its concrete path when needed.
export * from './rng.js'
export * from './tiles.js'
export * from './wall.js'
export * from './meld.js'
export * from './hand.js'
export * from './win-detection.js'
export * from './actions.js'
export * from './claims.js'
export * from './moves.js'
export * from './game-state.js'
export * from './match.js'
