import { useCallback, useEffect, useMemo, useState } from "react";
import { AudioEngine } from "./audio/AudioEngine";
import { Controls } from "./components/Controls";
import { PrimeBloomCanvas } from "./components/PrimeBloomCanvas";
import { PrimeBloomSettings } from "./types";

const initialSettings: PrimeBloomSettings = {
  playing: true,
  soundEnabled: true,
  droneEnabled: true,
  eventNumerals: true,
  seed: createSessionSeed(),
  tempo: 0.8,
  numbersPerFrame: 4,
  maxN: 20000,
  visualIntensity: 0.72,
  scaleName: "Dorian",
  mode: "Bloom",
};

function createSessionSeed(): number {
  const cryptoSeed = window.crypto?.getRandomValues?.(new Uint32Array(1))[0];
  return cryptoSeed ?? Math.floor(Math.random() * 0xffffffff);
}

function formatSeed(seed: number): string {
  return seed.toString(36).toUpperCase().padStart(7, "0").slice(-7);
}

function App() {
  const [hasBegun, setHasBegun] = useState(false);
  const [settings, setSettings] = useState<PrimeBloomSettings>(initialSettings);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [currentNumber, setCurrentNumber] = useState(1);
  const [resetToken, setResetToken] = useState(0);
  const audioEngine = useMemo(() => new AudioEngine(), []);

  const updateSettings = useCallback((patch: Partial<PrimeBloomSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const begin = useCallback(async () => {
    await audioEngine.initialize();
    audioEngine.setSeed(settings.seed);
    audioEngine.setMuted(!initialSettings.soundEnabled);
    if (initialSettings.droneEnabled) audioEngine.startDrone();
    setHasBegun(true);
  }, [audioEngine, settings.seed]);

  const reset = useCallback(() => {
    audioEngine.resetComposition();
    setResetToken((value) => value + 1);
    setCurrentNumber(1);
  }, [audioEngine]);

  const newSeed = useCallback(() => {
    const seed = createSessionSeed();
    audioEngine.setSeed(seed);
    audioEngine.resetComposition();
    setSettings((current) => ({ ...current, seed }));
    setResetToken((value) => value + 1);
    setCurrentNumber(1);
  }, [audioEngine]);

  useEffect(() => {
    if (!hasBegun) return;
    audioEngine.setMuted(!settings.soundEnabled);
  }, [audioEngine, hasBegun, settings.soundEnabled]);

  useEffect(() => {
    audioEngine.setSeed(settings.seed);
  }, [audioEngine, settings.seed]);

  useEffect(() => {
    if (!hasBegun) return;
    if (settings.droneEnabled && settings.soundEnabled) {
      audioEngine.startDrone();
    } else {
      audioEngine.stopDrone();
    }
  }, [audioEngine, hasBegun, settings.droneEnabled, settings.soundEnabled]);

  return (
    <main className="app-shell">
      {hasBegun && (
        <PrimeBloomCanvas
          settings={settings}
          audioEngine={audioEngine}
          resetToken={resetToken}
          onCurrentNumberChange={setCurrentNumber}
        />
      )}

      {!hasBegun ? (
        <section className="begin-screen" aria-labelledby="prime-bloom-title">
          <p className="begin-screen__eyebrow">Generative audio-visual instrument</p>
          <h1 id="prime-bloom-title">Prime Bloom</h1>
          <p className="begin-screen__subtitle">A generative ambient instrument for prime numbers.</p>
          <button type="button" className="begin-screen__button" onClick={begin}>
            Begin
          </button>
          <p className="begin-screen__note">
            Prime Bloom maps a polar prime spiral into a quiet field of light and sound.
          </p>
        </section>
      ) : (
        <>
          <header className="status-panel" aria-label="Current playback status">
            <h1>Prime Bloom</h1>
            <dl>
              <div>
                <dt>Number</dt>
                <dd>{currentNumber.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Mode</dt>
                <dd>{settings.mode}</dd>
              </div>
              <div>
                <dt>Seed</dt>
                <dd>{formatSeed(settings.seed)}</dd>
              </div>
            </dl>
          </header>

          <Controls
            open={controlsOpen}
            settings={settings}
            onToggleOpen={() => setControlsOpen((open) => !open)}
            onChange={updateSettings}
            onReset={reset}
            onNewSeed={newSeed}
          />
        </>
      )}
    </main>
  );
}

export default App;
