import { uniformInt } from "pure-rand/distribution/uniformInt";
import { xoroshiro128plus } from "pure-rand/generator/xoroshiro128plus";

/** Fisher-Yates shuffle driven by a seed, so the same seed always gives the same order. */
export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const rng = xoroshiro128plus(seed);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = uniformInt(rng, 0, i);
    const a = result[i] as T;
    result[i] = result[j] as T;
    result[j] = a;
  }
  return result;
}
