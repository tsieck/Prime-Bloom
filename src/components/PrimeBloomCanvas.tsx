import { useEffect, useMemo, useRef } from "react";
import { AudioEngine } from "../audio/AudioEngine";
import { generatePrimeSpiralPoints } from "../math/primeSpiral";
import { PrimeBloomSettings, SpiralPoint } from "../types";

interface PrimeBloomCanvasProps {
  settings: PrimeBloomSettings;
  audioEngine: AudioEngine;
  resetToken: number;
  onCurrentNumberChange: (value: number) => void;
}

interface DrawMetrics {
  width: number;
  height: number;
  cx: number;
  cy: number;
  unit: number;
}

interface EventNumeral {
  n: number;
  x: number;
  y: number;
  age: number;
  pulse: number;
}

function getReducedMotionPreference(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function fitMetrics(canvas: HTMLCanvasElement, maxCoordinate: number): DrawMetrics {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const margin = 5.5;
  const unit = Math.min(width, height) / Math.max(8, maxCoordinate * 2 + margin * 2);

  return {
    width,
    height,
    cx: width / 2,
    cy: height / 2,
    unit,
  };
}

function drawBackground(ctx: CanvasRenderingContext2D, metrics: DrawMetrics, time: number) {
  ctx.fillStyle = "#080807";
  ctx.fillRect(0, 0, metrics.width, metrics.height);

  const gradient = ctx.createRadialGradient(
    metrics.cx,
    metrics.cy,
    0,
    metrics.cx,
    metrics.cy,
    Math.max(metrics.width, metrics.height) * 0.62,
  );
  gradient.addColorStop(0, "rgba(45, 39, 31, 0.20)");
  gradient.addColorStop(0.55, "rgba(14, 14, 12, 0.15)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.42)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, metrics.width, metrics.height);

  const drift = Math.sin(time * 0.00007) * 0.2 + 0.8;
  ctx.globalAlpha = 0.035 * drift;
  ctx.fillStyle = "#f4e7c4";
  for (let i = 0; i < 90; i += 1) {
    const x = ((i * 97.31) % metrics.width) + Math.sin(time * 0.00005 + i) * 0.8;
    const y = ((i * 43.17) % metrics.height) + Math.cos(time * 0.00004 + i) * 0.8;
    ctx.fillRect(x, y, 0.7, 0.7);
  }
  ctx.globalAlpha = 1;
}

function seededHash(value: number, seed: number): number {
  const hashed = Math.sin((value + seed * 0.000001) * 12.9898) * 43758.5453;
  return hashed - Math.floor(hashed);
}

function canvasPosition(
  point: SpiralPoint,
  metrics: DrawMetrics,
  time = 0,
  fragmentProgress = 0,
  seed = 1,
) {
  if (fragmentProgress <= 0) {
    return {
      x: metrics.cx + point.x * metrics.unit,
      y: metrics.cy + point.y * metrics.unit,
    };
  }

  const radius = Math.hypot(point.x, point.y);
  const angle = Math.atan2(point.y, point.x);
  const shard = seededHash(point.n * 19, seed);
  const drift = seededHash(point.n * 43, seed);
  const breath = Math.sin(time * 0.00012 + shard * Math.PI * 2);
  const radialOffset = fragmentProgress * metrics.unit * (0.7 + shard * 3.8 + breath * 0.55);
  const tangentOffset = fragmentProgress * metrics.unit * (drift - 0.5) * 5.5;
  const radialX = Math.cos(angle);
  const radialY = Math.sin(angle);
  const tangentX = -radialY;
  const tangentY = radialX;

  return {
    x: metrics.cx + point.x * metrics.unit + radialX * radialOffset + tangentX * tangentOffset,
    y: metrics.cy + point.y * metrics.unit + radialY * radialOffset + tangentY * tangentOffset + radius * 0.02,
  };
}

function drawFragmentTraces(
  ctx: CanvasRenderingContext2D,
  metrics: DrawMetrics,
  time: number,
  progress: number,
  seed: number,
) {
  if (progress <= 0.02) return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  for (let i = 0; i < 9; i += 1) {
    const ring = 0.18 + i * 0.075 + seededHash(i * 31, seed) * 0.035;
    const radius = Math.min(metrics.width, metrics.height) * ring;
    const start = time * 0.000045 * (i % 2 === 0 ? 1 : -1) + seededHash(i * 71, seed) * Math.PI * 2;
    const span = 0.18 + seededHash(i * 97, seed) * 0.42;
    ctx.strokeStyle = `rgba(239, 204, 143, ${0.012 + progress * 0.028})`;
    ctx.lineWidth = Math.max(0.8, metrics.unit * (0.025 + progress * 0.018));
    ctx.beginPath();
    ctx.arc(metrics.cx, metrics.cy, radius, start, start + span);
    ctx.stroke();
  }

  ctx.restore();
}

function drawEventNumerals(ctx: CanvasRenderingContext2D, metrics: DrawMetrics, numerals: EventNumeral[]) {
  if (numerals.length === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(236, 198, 130, 0.58)";

  const fontSize = Math.max(9, Math.min(15, metrics.unit * 0.62));
  ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;

  numerals.forEach((numeral) => {
    const fade = Math.max(0, 1 - numeral.age / 2600);
    const lift = (1 - fade) * -9;
    ctx.globalAlpha = fade * (0.16 + numeral.pulse * 0.46);
    ctx.shadowBlur = 9 + numeral.pulse * 14;
    ctx.fillStyle = "rgba(255, 240, 205, 0.92)";
    ctx.fillText(String(numeral.n), numeral.x, numeral.y + lift);
  });

  ctx.restore();
}

function angularDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % (Math.PI * 2);
  return diff > Math.PI ? Math.PI * 2 - diff : diff;
}

export function PrimeBloomCanvas({
  settings,
  audioEngine,
  resetToken,
  onCurrentNumberChange,
}: PrimeBloomCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentIndexRef = useRef(0);
  const pulseTimesRef = useRef<Map<number, number>>(new Map());
  const lastReportedNumberRef = useRef(1);
  const sweepTriggeredRef = useRef<Set<number>>(new Set());
  const lastSweepAngleRef = useRef(0);
  const settingsRef = useRef(settings);
  const completionTimeRef = useRef<number | null>(null);
  const lastCompletionToneRef = useRef(0);
  const lastSweepReadRef = useRef(0);

  const points = useMemo(() => generatePrimeSpiralPoints(settings.maxN), [settings.maxN]);
  const primes = useMemo(() => points.filter((point) => point.isPrime), [points]);
  const maxCoordinate = useMemo(
    () => points.reduce((max, point) => Math.max(max, Math.abs(point.x), Math.abs(point.y)), 1),
    [points],
  );

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    currentIndexRef.current = settings.mode === "Still" || settings.mode === "Sweep" ? points.length - 1 : 0;
    pulseTimesRef.current.clear();
    sweepTriggeredRef.current.clear();
    completionTimeRef.current = null;
    lastCompletionToneRef.current = 0;
    lastSweepReadRef.current = 0;
    lastReportedNumberRef.current = 1;
    onCurrentNumberChange(1);
  }, [points, resetToken, settings.mode, onCurrentNumberChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animationFrame = 0;
    let lastTime = performance.now();
    let soundAccumulator = 0;
    const reducedMotion = getReducedMotionPreference();

    const draw = (time: number) => {
      const activeSettings = settingsRef.current;
      const metrics = fitMetrics(canvas, maxCoordinate);
      const delta = Math.min(66, time - lastTime);
      lastTime = time;

      if (activeSettings.playing) {
        if (activeSettings.mode === "Bloom") {
          const motionFactor = reducedMotion ? 0.35 : 1;
          const advance = Math.max(
            1,
            Math.round(activeSettings.numbersPerFrame * activeSettings.tempo * motionFactor),
          );
          const previousIndex = currentIndexRef.current;
          currentIndexRef.current = Math.min(points.length - 1, currentIndexRef.current + advance);

          for (let index = previousIndex + 1; index <= currentIndexRef.current; index += 1) {
            const point = points[index];
            if (!point?.isPrime) continue;

            pulseTimesRef.current.set(point.n, time);
            soundAccumulator += 1;
            if (activeSettings.soundEnabled && soundAccumulator % 2 === 0) {
              audioEngine.playPrimeTone(point, activeSettings.scaleName, activeSettings.visualIntensity);
            }
          }
        } else {
          currentIndexRef.current = points.length - 1;
        }
      }

      drawBackground(ctx, metrics, time);

      const currentIndex = currentIndexRef.current;
      const isComplete = currentIndex >= points.length - 1;
      if (isComplete && completionTimeRef.current === null) {
        completionTimeRef.current = time;
      }

      if (!isComplete) {
        completionTimeRef.current = null;
      }

      const completionAge = completionTimeRef.current === null ? 0 : time - completionTimeRef.current;
      const fragmentProgress = Math.min(1, Math.max(0, completionAge / 18000));
      if (
        isComplete &&
        activeSettings.mode === "Bloom" &&
        activeSettings.playing &&
        activeSettings.soundEnabled &&
        time - lastCompletionToneRef.current > 1100 / Math.max(0.35, activeSettings.tempo)
      ) {
        const seedOffset = seededHash(Math.floor(completionAge / 1100), activeSettings.seed);
        const primeIndex = Math.floor(seedOffset * primes.length) % primes.length;
        const point = primes[primeIndex];
        if (point) {
          pulseTimesRef.current.set(point.n, time);
          audioEngine.playPrimeTone(point, activeSettings.scaleName, activeSettings.visualIntensity);
          lastCompletionToneRef.current = time;
        }
      }

      const visiblePoints = points.slice(0, currentIndex + 1);
      const visiblePrimes = activeSettings.mode === "Bloom" ? visiblePoints.filter((point) => point.isPrime) : primes;
      const breathe = 0.82 + Math.sin(time * 0.0008) * 0.18;
      const eventNumerals: EventNumeral[] = [];
      const sweepAngle =
        activeSettings.mode === "Sweep" ? (time * 0.00012 * activeSettings.tempo) % (Math.PI * 2) : null;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      drawFragmentTraces(ctx, metrics, time, fragmentProgress, activeSettings.seed);

      if (activeSettings.visualIntensity > 0.45) {
        ctx.fillStyle = `rgba(154, 147, 128, ${0.018 * activeSettings.visualIntensity})`;
        const compositeStep = visiblePoints.length > 9000 ? 3 : 2;
        for (let index = 0; index < visiblePoints.length; index += compositeStep) {
          const point = visiblePoints[index];
          if (point.isPrime) continue;
          const pos = canvasPosition(point, metrics, time, fragmentProgress * 0.45, activeSettings.seed);
          ctx.fillRect(pos.x, pos.y, 0.7, 0.7);
        }
      }

      for (const point of visiblePrimes) {
        const pointFragment = fragmentProgress * (0.35 + seededHash(point.n * 11, activeSettings.seed) * 0.65);
        const pos = canvasPosition(point, metrics, time, pointFragment, activeSettings.seed);
        const pulseStarted = pulseTimesRef.current.get(point.n);
        const pulseAge = pulseStarted ? Math.max(0, time - pulseStarted) : 10000;
        const pulse = Math.max(0, 1 - pulseAge / 1400);
        const sweepProximity =
          sweepAngle === null ? 0 : Math.max(0, 1 - angularDistance(Math.atan2(point.y, point.x), sweepAngle) / 0.075);
        const distance = Math.hypot(point.x, point.y);
        const baseRadius = Math.max(0.7, Math.min(2.15, metrics.unit * 0.2));
        const radius = baseRadius * (0.95 + breathe * 0.24 + pulse * 1.7 + sweepProximity * 1.05);
        const glowRadius =
          radius * (3.4 + activeSettings.visualIntensity * 2.4 + pulse * 2.8 + sweepProximity * 4.2);
        const alpha = Math.min(
          0.96,
          0.28 + activeSettings.visualIntensity * 0.34 + pulse * 0.38 + sweepProximity * 0.2,
        );

        const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowRadius);
        glow.addColorStop(0, `rgba(255, 238, 194, ${alpha})`);
        glow.addColorStop(0.36, `rgba(220, 164, 82, ${0.18 * activeSettings.visualIntensity + pulse * 0.12})`);
        glow.addColorStop(1, "rgba(220, 164, 82, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 244, 215, ${Math.min(1, alpha + 0.12)})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + Math.sin(distance * 0.35 + time * 0.001) * 0.08, 0, Math.PI * 2);
        ctx.fill();

        if (activeSettings.eventNumerals && pulseAge < 2600 && eventNumerals.length < 42) {
          const labelAngle = seededHash(point.n * 29, activeSettings.seed) * Math.PI * 2;
          const labelDistance = Math.max(8, radius * 5.2);
          eventNumerals.push({
            n: point.n,
            x: pos.x + Math.cos(labelAngle) * labelDistance,
            y: pos.y + Math.sin(labelAngle) * labelDistance,
            age: pulseAge,
            pulse,
          });
        }
      }

      drawEventNumerals(ctx, metrics, eventNumerals);

      if (sweepAngle !== null) {
        const wrapped = sweepAngle < lastSweepAngleRef.current;
        lastSweepAngleRef.current = sweepAngle;
        if (wrapped) sweepTriggeredRef.current.clear();

        if (
          activeSettings.playing &&
          time - lastSweepReadRef.current > 520 / Math.max(0.35, activeSettings.tempo)
        ) {
          const candidates = primes
            .filter((point) => {
              if (sweepTriggeredRef.current.has(point.n)) return false;
              return angularDistance(Math.atan2(point.y, point.x), sweepAngle) < 0.038;
            })
            .sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
          const step = Math.max(1, Math.floor(candidates.length / 5));
          let triggeredThisRead = 0;

          for (let index = 0; index < candidates.length && triggeredThisRead < 5; index += step) {
            const point = candidates[index];
            if (point) {
              pulseTimesRef.current.set(point.n, time);
              sweepTriggeredRef.current.add(point.n);
              triggeredThisRead += 1;
              if (activeSettings.soundEnabled) {
                audioEngine.playPrimeTone(point, activeSettings.scaleName, activeSettings.visualIntensity);
              }
            }
          }

          if (triggeredThisRead > 0) {
            lastSweepReadRef.current = time;
          }
        }
      }

      ctx.restore();

      const currentNumber = points[currentIndex]?.n ?? 1;
      if (time - lastReportedNumberRef.current > 180 || currentNumber === activeSettings.maxN) {
        lastReportedNumberRef.current = time;
        onCurrentNumberChange(currentNumber);
      }

      animationFrame = requestAnimationFrame(draw);
    };

    animationFrame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationFrame);
  }, [audioEngine, maxCoordinate, onCurrentNumberChange, points, primes]);

  return <canvas ref={canvasRef} className="prime-canvas" aria-label="Prime numbers blooming on a polar spiral" />;
}
