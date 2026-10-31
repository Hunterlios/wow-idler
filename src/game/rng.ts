// Deterministyczny RNG (mulberry32). Stan trzymany w GameState.seed, więc symulacja offline
// i testy dają powtarzalne wyniki.
export type Rng = { next: () => number; int: (a: number, b: number) => number; pick: <T>(arr: T[]) => T; chance: (p: number) => boolean; seed: () => number }

export function makeRng(seed: number): Rng {
  let s = seed >>> 0
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    seed: () => s,
  }
}
