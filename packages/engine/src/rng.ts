export interface Rng {
  next(): number // [0, 1)
}

// mulberry32 — small, dependency-free, deterministic PRNG. Never change this
// algorithm once seeds are in use: doing so would silently break replay of
// every previously recorded game/hand.
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return {
    next(): number {
      a |= 0
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
  }
}

// Fisher-Yates, returns a new array (does not mutate `items`).
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = items.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1))
    const temp = result[i]!
    result[i] = result[j]!
    result[j] = temp
  }
  return result
}

// Draws one 32-bit unsigned integer from the stream — used to derive
// independent per-hand seeds from a single match-level seed.
export function nextSeed(rng: Rng): number {
  return Math.floor(rng.next() * 4294967296)
}
