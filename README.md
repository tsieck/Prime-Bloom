# Prime Bloom

Prime Bloom is a contemplative generative audio-visual instrument that turns prime numbers into light and sparse ambient sound. It uses a Sacks-style polar prime spiral on a full-screen canvas: integers unfold from the center, composites remain nearly silent, and primes appear as soft glowing events.

## Run Locally

```bash
npm install
npm run dev
```

Then open the local Vite URL printed in the terminal.

## How It Works

The spiral places `1` at the center, then maps each integer outward using a radius and angle based on `sqrt(n)`. Prime numbers form curved families along the coil; Prime Bloom renders those primes as quiet warm points instead of treating the sequence like a chart.

Sound is generated directly with the Web Audio API. Prime events are collected into a slow harmonic scheduler instead of immediately becoming isolated notes. The scheduler quantizes events to a sparse pulse, weights them toward stable chord tones, rotates through related roots, and lets denser prime moments bloom into small Dorian-centered voicings. Notes use gentle envelopes, low gain, and a simple delay feedback path for space. A subtle drone can be enabled or muted from the controls.

Each visit starts with a fresh session seed. The seed biases harmonic choices, motif memory, and the completed-spire visual drift, so different visits become different performances. Reset replays the current seed; New Seed starts another take.

When Bloom reaches the max number, the completed spiral slowly loosens into seeded fragments and faint orbiting traces. The finished field also keeps sampling quiet prime constellations, so it can remain running as a meditative ambient state.

Event numerals can be toggled from the controls. When enabled, newly triggered primes briefly appear as tiny fading numbers before resolving back into points of light.

Sweep mode acts like a slow observatory instrument. A soft aperture rotates through the completed field, primes brighten as they enter the beam, and the sweep reads small radial constellations into the harmonic scheduler.

Browsers require a user gesture before audio can start, so Prime Bloom waits for the **Begin** button before creating or resuming the audio context.
