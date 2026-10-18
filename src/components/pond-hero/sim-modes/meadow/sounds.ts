import { audio, throttled } from "../../audio/audio-core";
import { detune, noise, stereo, tone } from "../../audio/synth";

/** Soft turf thud when a sheep lands. */
export function meadowLand(nx: number, strength = 1) {
  if (!audio() || throttled("meadow-land", 100)) return;
  const s = Math.max(0.2, Math.min(1, strength));
  const pan = stereo(nx);
  tone({ freq: detune(125, 45), to: 65, cutoff: 320, dur: 0.095, attack: 0.006, gain: 0.13 * s, pan });
  noise({ filter: "lowpass", freq: 950, to: 380, q: 0.6, dur: 0.095, gain: 0.35 * s, pan });
  noise({ filter: "bandpass", freq: 1600, to: 850, q: 0.7, dur: 0.08, delay: 0.025, gain: 0.16 * s, pan });
}

/** Paired hoof patter while sheep trot. */
export function meadowHoof(nx: number, strength = 0.65) {
  if (!audio() || throttled("meadow-hoof", 180)) return;
  const s = Math.max(0.2, Math.min(1, strength));
  const pan = stereo(nx);
  for (let i = 0; i < 2; i += 1) {
    const delay = i * (0.045 + 0.02 * Math.random());
    noise({ filter: "lowpass", freq: 700 + 200 * Math.random(), q: 0.6, dur: 0.035, gain: 0.16 * s, delay, pan });
    tone({ freq: detune(155, 100), to: 90, cutoff: 280, dur: 0.035, gain: 0.028 * s, delay, pan });
  }
}
