import { ScaleName, SpiralPoint } from "../types";

const SCALES: Record<ScaleName, number[]> = {
  "Minor Pentatonic": [0, 3, 5, 7, 10],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  "Major Pentatonic": [0, 2, 4, 7, 9],
};

const BASE_FREQUENCY = 130.81; // C3
const AMBIENT_BPM = 46;
const SLOT_SECONDS = 60 / AMBIENT_BPM;
const SCHEDULER_LOOKAHEAD = 0.55;
const ROOT_CYCLES: Record<ScaleName, number[]> = {
  "Minor Pentatonic": [0, 5, 10, 3],
  Dorian: [2, 7, 0, 10],
  "Major Pentatonic": [0, 7, 5, 2],
};

interface PrimeToneEvent {
  point: SpiralPoint;
  scaleName: ScaleName;
  visualIntensity: number;
}

interface VoicedTone {
  frequency: number;
  gain: number;
  duration: number;
  pan: number;
  brightness: number;
  detune: number;
  overtone: number;
}

function midiOffsetToFrequency(offset: number): number {
  return BASE_FREQUENCY * Math.pow(2, offset / 12);
}

function softClamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizedHash(value: number, seed: number): number {
  const hashed = Math.sin((value + seed * 0.000001) * 12.9898) * 43758.5453;
  return hashed - Math.floor(hashed);
}

export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private delay: DelayNode | null = null;
  private feedback: GainNode | null = null;
  private wet: GainNode | null = null;
  private droneNodes: OscillatorNode[] = [];
  private droneGain: GainNode | null = null;
  private eventQueue: PrimeToneEvent[] = [];
  private schedulerId: number | null = null;
  private nextSlotTime = 0;
  private slotIndex = 0;
  private motifOffsets: number[] = [0, 7, 14, 9];
  private seed = 1;
  private muted = false;

  async initialize(): Promise<void> {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContextClass();

      this.master = this.context.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.context.destination);

      this.delay = this.context.createDelay(8);
      this.delay.delayTime.value = 0.72;

      this.feedback = this.context.createGain();
      this.feedback.gain.value = 0.34;

      this.wet = this.context.createGain();
      this.wet.gain.value = 0.23;

      this.delay.connect(this.feedback);
      this.feedback.connect(this.delay);
      this.delay.connect(this.wet);
      this.wet.connect(this.master);
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    this.startScheduler();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.eventQueue = [];
    }

    if (!this.master || !this.context) return;

    const now = this.context.currentTime;
    if (!muted) {
      this.nextSlotTime = now + 0.12;
    }

    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(muted ? 0.0001 : 0.55, now, 0.08);
  }

  resetComposition(): void {
    this.eventQueue = [];
    this.slotIndex = 0;
    this.motifOffsets = [0, 7, 14, 9];
    if (this.context) {
      this.nextSlotTime = this.context.currentTime + 0.16;
    }
  }

  setSeed(seed: number): void {
    this.seed = seed || 1;
  }

  playPrimeTone(point: SpiralPoint, scaleName: ScaleName, visualIntensity = 0.75): void {
    if (!this.context || !this.master || this.muted || !point.isPrime) return;

    this.eventQueue.push({ point, scaleName, visualIntensity });
    if (this.eventQueue.length > 96) {
      this.eventQueue.splice(0, this.eventQueue.length - 96);
    }
  }

  private startScheduler(): void {
    if (!this.context || this.schedulerId !== null) return;

    this.nextSlotTime = this.context.currentTime + 0.16;
    this.schedulerId = window.setInterval(() => this.scheduleMusicalSlots(), 100);
  }

  private scheduleMusicalSlots(): void {
    if (!this.context || !this.master || this.muted) return;

    while (this.nextSlotTime < this.context.currentTime + SCHEDULER_LOOKAHEAD) {
      this.scheduleSlot(this.nextSlotTime, this.slotIndex);
      this.nextSlotTime += SLOT_SECONDS;
      this.slotIndex += 1;
    }
  }

  private scheduleSlot(startTime: number, slotIndex: number): void {
    if (this.eventQueue.length === 0) return;

    const rhythmStep = slotIndex % 8;
    const isAnchorBeat = rhythmStep === 0;
    const isColorBeat = rhythmStep === 3 || rhythmStep === 5;
    const shouldPlay =
      isAnchorBeat || isColorBeat || (rhythmStep === 6 && normalizedHash(slotIndex, this.seed) > 0.74);

    if (!shouldPlay) return;

    const batchSize = isAnchorBeat ? 5 : 3;
    const events = this.eventQueue.splice(0, Math.min(batchSize, this.eventQueue.length));
    if (events.length === 0) return;

    const anchor = events[events.length - 1];
    const tones = this.createVoicing(anchor, events, slotIndex, isAnchorBeat);
    tones.forEach((tone, index) => {
      this.scheduleTone(tone, startTime + index * 0.055);
    });
  }

  private createVoicing(
    anchor: PrimeToneEvent,
    events: PrimeToneEvent[],
    slotIndex: number,
    isAnchorBeat: boolean,
  ): VoicedTone[] {
    const scale = SCALES[anchor.scaleName];
    const rootCycle = ROOT_CYCLES[anchor.scaleName];
    const rootOffset = rootCycle[Math.floor(slotIndex / 16) % rootCycle.length];
    const distance = Math.hypot(anchor.point.x, anchor.point.y);
    const angle = Math.atan2(anchor.point.y, anchor.point.x);
    const panBase = softClamp(angle / Math.PI, -0.82, 0.82);
    const intensity = softClamp(anchor.visualIntensity, 0.35, 1);
    const hash = normalizedHash(anchor.point.n + slotIndex * 17, this.seed);
    const density = events.length;
    const octaveLift = hash > 0.76 ? 12 : 0;
    const weightedDegrees = isAnchorBeat
      ? [0, 4, 2, 5, 1, 6]
      : [4, 1, 5, 2, 6, 3, 0];
    const colorDegree = weightedDegrees[Math.floor(hash * weightedDegrees.length) % weightedDegrees.length];
    const colorOffset = scale[colorDegree % scale.length] + Math.floor(colorDegree / scale.length) * 12;

    if (isAnchorBeat && density >= 4) {
      this.motifOffsets = [0, colorOffset, scale[4 % scale.length] + 12, scale[1 % scale.length] + octaveLift];
    } else if (!isAnchorBeat && hash > 0.58) {
      this.motifOffsets = [colorOffset, ...this.motifOffsets.slice(0, 3)];
    }

    const bassFrequency = midiOffsetToFrequency(rootOffset - 12);
    const coreOffsets = isAnchorBeat
      ? [0, scale[2 % scale.length], scale[4 % scale.length] + 12]
      : [colorOffset, this.motifOffsets[slotIndex % this.motifOffsets.length] ?? colorOffset];

    const tones: VoicedTone[] = [];

    if (isAnchorBeat && normalizedHash(anchor.point.n, this.seed) > 0.28) {
      tones.push({
        frequency: bassFrequency,
        gain: 0.018 + intensity * 0.006,
        duration: softClamp(4.6 + distance * 0.018, 4.6, 7.2),
        pan: panBase * 0.25,
        brightness: 620,
        detune: -2 + hash * 4,
        overtone: 0.08,
      });
    }

    coreOffsets.slice(0, isAnchorBeat ? 3 : 2).forEach((offset, index) => {
      const register = isAnchorBeat ? 0 : 12;
      const frequency = midiOffsetToFrequency(rootOffset + offset + register);
      tones.push({
        frequency,
        gain: softClamp(0.014 + intensity * 0.012 - index * 0.002, 0.01, 0.032),
        duration: softClamp(2.8 + distance * 0.018 + index * 0.5, 2.8, 5.8),
        pan: softClamp(panBase + (index - 1) * 0.16, -0.9, 0.9),
        brightness: softClamp(840 + distance * 7 + index * 190, 840, 2300),
        detune: ((anchor.point.n + index * 7) % 19 - 9) * 0.9,
        overtone: isAnchorBeat ? 0.13 : 0.19,
      });
    });

    return tones;
  }

  private scheduleTone(tone: VoicedTone, startTime: number): void {
    if (!this.context || !this.master) return;

    const ctx = this.context;
    const carrier = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const toneGain = ctx.createGain();
    const overtoneGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const pan = ctx.createStereoPanner();

    carrier.type = "sine";
    carrier.frequency.value = tone.frequency;
    carrier.detune.value = tone.detune;

    overtone.type = "triangle";
    overtone.frequency.value = tone.frequency * 2.01;
    overtone.detune.value = -tone.detune * 0.5;

    filter.type = "lowpass";
    filter.frequency.value = tone.brightness;
    filter.Q.value = 0.45;

    toneGain.gain.setValueAtTime(0.0001, startTime);
    toneGain.gain.exponentialRampToValueAtTime(tone.gain, startTime + 0.045);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + tone.duration);

    overtoneGain.gain.value = tone.overtone;
    pan.pan.value = tone.pan;

    carrier.connect(toneGain);
    overtone.connect(overtoneGain);
    overtoneGain.connect(toneGain);
    toneGain.connect(filter);
    filter.connect(pan);
    pan.connect(this.master);

    if (this.delay) {
      pan.connect(this.delay);
    }

    carrier.start(startTime);
    overtone.start(startTime);
    carrier.stop(startTime + tone.duration + 0.08);
    overtone.stop(startTime + tone.duration + 0.08);
  }

  startDrone(): void {
    if (!this.context || !this.master || this.droneGain) return;

    const ctx = this.context;
    const now = ctx.currentTime;
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.0001, now);
    droneGain.gain.exponentialRampToValueAtTime(0.026, now + 2.5);

    const frequencies = [65.41, 98.0, 130.81];
    this.droneNodes = frequencies.map((frequency, index) => {
      const oscillator = ctx.createOscillator();
      oscillator.type = index === 1 ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index === 2 ? 2.5 : -1.5;
      oscillator.connect(droneGain);
      oscillator.start(now);
      return oscillator;
    });

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.3;

    droneGain.connect(filter);
    filter.connect(this.master);
    this.droneGain = droneGain;
  }

  stopDrone(): void {
    if (!this.context || !this.droneGain) return;

    const now = this.context.currentTime;
    this.droneGain.gain.cancelScheduledValues(now);
    this.droneGain.gain.setTargetAtTime(0.0001, now, 0.6);

    this.droneNodes.forEach((node) => {
      node.stop(now + 1.5);
    });

    this.droneNodes = [];
    this.droneGain = null;
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
