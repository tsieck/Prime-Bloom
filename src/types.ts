export type Mode = "Bloom" | "Still" | "Sweep";

export type ScaleName = "Minor Pentatonic" | "Dorian" | "Major Pentatonic";

export interface SpiralPoint {
  n: number;
  x: number;
  y: number;
  isPrime: boolean;
}

export interface PrimeBloomSettings {
  playing: boolean;
  soundEnabled: boolean;
  droneEnabled: boolean;
  eventNumerals: boolean;
  seed: number;
  tempo: number;
  numbersPerFrame: number;
  maxN: number;
  visualIntensity: number;
  scaleName: ScaleName;
  mode: Mode;
}
