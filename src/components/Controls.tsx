import { PrimeBloomSettings, ScaleName, Mode } from "../types";

interface ControlsProps {
  open: boolean;
  settings: PrimeBloomSettings;
  onToggleOpen: () => void;
  onChange: (settings: Partial<PrimeBloomSettings>) => void;
  onReset: () => void;
  onNewSeed: () => void;
}

const scales: ScaleName[] = ["Dorian", "Minor Pentatonic", "Major Pentatonic"];
const modes: Mode[] = ["Bloom", "Still", "Sweep"];

export function Controls({ open, settings, onToggleOpen, onChange, onReset, onNewSeed }: ControlsProps) {
  return (
    <section className={`controls ${open ? "controls--open" : ""}`} aria-label="Prime Bloom controls">
      <button className="controls__toggle" type="button" onClick={onToggleOpen} aria-expanded={open}>
        {open ? "Close" : "Controls"}
      </button>

      {open && (
        <div className="controls__panel">
          <div className="control-row control-row--split">
            <button type="button" onClick={() => onChange({ playing: !settings.playing })}>
              {settings.playing ? "Pause" : "Play"}
            </button>
            <button type="button" onClick={onReset}>
              Reset
            </button>
          </div>

          <button type="button" onClick={onNewSeed}>
            New Seed
          </button>

          <label className="control-row control-row--inline">
            <span>Sound</span>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(event) => onChange({ soundEnabled: event.target.checked })}
            />
          </label>

          <label className="control-row control-row--inline">
            <span>Drone</span>
            <input
              type="checkbox"
              checked={settings.droneEnabled}
              onChange={(event) => onChange({ droneEnabled: event.target.checked })}
            />
          </label>

          <label className="control-row control-row--inline">
            <span>Numerals</span>
            <input
              type="checkbox"
              checked={settings.eventNumerals}
              onChange={(event) => onChange({ eventNumerals: event.target.checked })}
            />
          </label>

          <label className="control-row">
            <span>Tempo</span>
            <input
              type="range"
              min="0.25"
              max="2.5"
              step="0.05"
              value={settings.tempo}
              onChange={(event) => onChange({ tempo: Number(event.target.value) })}
            />
          </label>

          <label className="control-row">
            <span>Density</span>
            <input
              type="range"
              min="1"
              max="18"
              step="1"
              value={settings.numbersPerFrame}
              onChange={(event) => onChange({ numbersPerFrame: Number(event.target.value) })}
            />
          </label>

          <label className="control-row">
            <span>Scale</span>
            <select
              value={settings.scaleName}
              onChange={(event) => onChange({ scaleName: event.target.value as ScaleName })}
            >
              {scales.map((scale) => (
                <option key={scale} value={scale}>
                  {scale}
                </option>
              ))}
            </select>
          </label>

          <label className="control-row">
            <span>Mode</span>
            <select value={settings.mode} onChange={(event) => onChange({ mode: event.target.value as Mode })}>
              {modes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>

          <label className="control-row">
            <span>Max numbers</span>
            <input
              type="range"
              min="1000"
              max="20000"
              step="500"
              value={settings.maxN}
              onChange={(event) => onChange({ maxN: Number(event.target.value) })}
            />
            <output>{settings.maxN.toLocaleString()}</output>
          </label>

          <label className="control-row">
            <span>Light</span>
            <input
              type="range"
              min="0.35"
              max="1"
              step="0.05"
              value={settings.visualIntensity}
              onChange={(event) => onChange({ visualIntensity: Number(event.target.value) })}
            />
          </label>
        </div>
      )}
    </section>
  );
}
