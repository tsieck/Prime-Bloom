import { SpiralPoint } from "../types";
import { generatePrimeSieve } from "./primes";

const SPIRAL_TIGHTNESS = 1;

export function generatePrimeSpiralPoints(maxN: number): SpiralPoint[] {
  const limit = Math.max(1, Math.floor(maxN));
  const primes = generatePrimeSieve(limit);
  const points: SpiralPoint[] = [];

  for (let n = 1; n <= limit; n += 1) {
    const radius = Math.sqrt(n - 1);
    const angle = radius * SPIRAL_TIGHTNESS - Math.PI / 2;

    points.push({
      n,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      isPrime: primes[n],
    });
  }

  return points;
}
