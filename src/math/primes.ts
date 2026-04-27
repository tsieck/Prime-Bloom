export function generatePrimeSieve(maxN: number): boolean[] {
  const limit = Math.max(0, Math.floor(maxN));
  const isPrime = new Array<boolean>(limit + 1).fill(true);

  if (limit >= 0) isPrime[0] = false;
  if (limit >= 1) isPrime[1] = false;

  for (let factor = 2; factor * factor <= limit; factor += 1) {
    if (!isPrime[factor]) continue;

    for (let multiple = factor * factor; multiple <= limit; multiple += factor) {
      isPrime[multiple] = false;
    }
  }

  return isPrime;
}
