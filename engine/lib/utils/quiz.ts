/** Stable Fisher–Yates shuffle: question IDs seed the order, independent of renders. */
export function shuffleOptions<T>(options: readonly T[], questionId: string): T[] {
  let seed = 2166136261;
  for (const char of questionId) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  const shuffled = [...options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
