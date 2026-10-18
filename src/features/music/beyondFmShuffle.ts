/** Fisher-Yates shuffle without repetition inside each four-track cycle. */
export function shuffleFmBag<T>(values: readonly T[], last: T | null, random: () => number = Math.random): T[] {
  const bag = [...values];
  for (let i = bag.length - 1; i > 0; i--) {
    const pick = Math.floor(Math.max(0, Math.min(0.999999, random())) * (i + 1));
    [bag[i], bag[pick]] = [bag[pick]!, bag[i]!];
  }
  if (bag.length > 1 && bag[0] === last) {
    const swap = 1 + Math.floor(Math.max(0, Math.min(0.999999, random())) * (bag.length - 1));
    [bag[0], bag[swap]] = [bag[swap]!, bag[0]!];
  }
  return bag;
}
