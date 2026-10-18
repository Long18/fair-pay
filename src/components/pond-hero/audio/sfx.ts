import { throttled } from "./audio-core";
import { detune, noise, stereo, tone } from "./synth";

const PENTATONIC = [392, 440, 523.25, 587.33, 698.46];

function note(step: number): number {
  const n = PENTATONIC.length;
  const octave = Math.floor(step / n);
  return PENTATONIC[((step % n) + n) % n] * Math.pow(2, octave);
}

/** One-shot effects shared by simulation modes. `nx` is normalized x (0–1) for panning. */
export const sfx = {
  skip(bounce: number, nx: number, strength = 1) {
    const pan = stereo(nx);
    const k = Math.min(1, 0.09 * bounce);
    noise({ filter: "bandpass", freq: 1600 + 2200 * k, dur: 0.022 - 0.012 * k, gain: 0.6 * strength, q: 1, pan });
    const f = detune(900 * (1 + 0.9 * k), 100);
    tone({ freq: f, to: 1.5 * f, dur: 0.022 - 0.01 * k, gain: 0.1248 * strength, cutoff: 4000, pan });
  },
  splash(nx: number, strength = 1) {
    const pan = stereo(nx);
    noise({ filter: "lowpass", freq: 1800, to: 300, dur: 0.13, gain: 0.623 * strength, q: 0.7, pan });
    noise({ filter: "highpass", freq: 2200, dur: 0.03, gain: 0.2492 * strength, pan });
    const f = detune(620, 140);
    tone({ freq: f, to: 1.5 * f, dur: 0.03, gain: 0.1456 * strength, cutoff: 3000, delay: 0.02, pan });
  },
  sink(nx: number) {
    const pan = stereo(nx);
    noise({ filter: "lowpass", freq: 900, to: 220, dur: 0.14, gain: 1.196, q: 0.7, pan });
    const f = detune(320, 100);
    tone({ freq: f, to: 1.7 * f, dur: 0.06, gain: 0.2211, cutoff: 1800, delay: 0.02, pan });
  },
  thump(nx: number, strength = 1) {
    if (throttled("thump", 60)) return;
    const pan = stereo(nx);
    tone({ freq: detune(120, 80), to: 58, dur: 0.11, gain: 0.3825 * strength, cutoff: 400, pan });
    noise({ filter: "lowpass", freq: 260, dur: 0.06, gain: 1.393 * strength, q: 0.4, pan });
  },
  kick(nx: number, strength = 1) {
    if (throttled("kick", 50)) return;
    const pan = stereo(nx);
    const s = Math.max(0.35, Math.min(1, strength));
    tone({ freq: detune(300, 70), to: 150, dur: 0.05, gain: 0.424 * s, type: "triangle", cutoff: 1600, pan });
    noise({ filter: "lowpass", freq: 2400, dur: 0.014, gain: 0.477 * s, q: 0.5, pan });
  },
  crack(nx: number) {
    const pan = stereo(nx);
    noise({ filter: "highpass", freq: 3200, dur: 0.03, gain: 0.2025, pan });
    tone({ freq: detune(880, 150), to: 1500, dur: 0.025, gain: 0.105, cutoff: 5000, pan });
  },
  cheer() {
    for (let i = 0; i < 3; i++) {
      tone({ freq: note(2 * i), dur: 0.3 + 0.12 * i, gain: 0.148 - 0.0222 * i, attack: 0.012, delay: 0.08 * i, cutoff: 2600 });
    }
  },
  dart(nx: number) {
    const pan = stereo(nx);
    noise({ filter: "lowpass", freq: 950, to: 220, dur: 0.09, gain: 1.35, q: 0.7, pan });
    noise({ filter: "lowpass", freq: 500, to: 170, dur: 0.14, gain: 0.9, q: 0.6, delay: 0.055, pan });
    const f = detune(520, 140);
    tone({ freq: f, to: 1.55 * f, dur: 0.035, gain: 0.16, cutoff: 1100, delay: 0.05, pan });
  },
  chomp(nx: number) {
    const pan = stereo(nx);
    noise({ filter: "lowpass", freq: 2600, to: 500, dur: 0.06, gain: 0.774, q: 0.7, pan });
    noise({ filter: "bandpass", freq: 700, dur: 0.02, gain: 0.3612, q: 1.2, delay: 0.03, pan });
    const f = detune(520, 120);
    tone({ freq: f, to: 1.35 * f, dur: 0.02, gain: 0.1836, cutoff: 2600, delay: 0.045, pan });
  },
  nibble(nx: number) {
    if (throttled("nibble", 240)) return;
    const pan = stereo(nx);
    let delay = 0;
    for (let i = 0; i < 3; i++) {
      noise({ filter: "bandpass", freq: 900 + 700 * Math.random(), dur: 0.014, gain: 0.3936, q: 1.1, delay, pan });
      delay += 0.03 + 0.03 * Math.random();
    }
  },
  pellets(nx: number) {
    if (throttled("pellets", 130)) return;
    const pan = stereo(nx);
    const count = 3 + Math.floor(3 * Math.random());
    for (let i = 0; i < count; i++) {
      noise({ filter: "bandpass", freq: 1800 + 2200 * Math.random(), dur: 0.01, gain: 0.306, q: 1.4, delay: 0.12 * Math.random(), pan: pan + (Math.random() - 0.5) * 0.3 });
    }
    const f = detune(1300, 220);
    tone({ freq: f, to: 1.4 * f, dur: 0.02, gain: 0.0884, cutoff: 4000, delay: 0.045, pan });
  },
  plop(nx: number, strength = 1) {
    const pan = stereo(nx);
    noise({ filter: "lowpass", freq: 1400, to: 260, dur: 0.09, gain: 1.177 * strength, q: 0.7, pan });
    const f1 = detune(760, 140);
    tone({ freq: f1, to: 1.5 * f1, dur: 0.028, gain: 0.18 * strength, cutoff: 3000, pan });
    const f2 = detune(1150, 200);
    tone({ freq: f2, to: 1.4 * f2, dur: 0.018, gain: 0.09 * strength, cutoff: 4000, delay: 0.035 + 0.03 * Math.random(), pan: pan + 0.06 });
  },
  surface(nx: number) {
    const pan = stereo(nx);
    noise({ filter: "lowpass", freq: 260, to: 2000, dur: 0.11, gain: 1.896, q: 0.6, pan });
    noise({ filter: "lowpass", freq: 1600, to: 400, dur: 0.13, gain: 1.138, q: 0.6, delay: 0.1, pan });
    const f = detune(680, 160);
    tone({ freq: f, to: 1.5 * f, dur: 0.025, gain: 0.2, cutoff: 3000, delay: 0.12, pan });
  },
  rustle(nx: number, strength = 1) {
    if (throttled("rustle", 70)) return;
    const pan = stereo(nx);
    const count = 2 + Math.floor(2 * Math.random());
    for (let i = 0; i < count; i++) {
      noise({ filter: "bandpass", freq: 1400 + 1800 * Math.random(), to: 700 + 600 * Math.random(), dur: 0.05 + 0.05 * Math.random(), gain: 0.42 * strength, q: 0.9, delay: i * (0.02 + 0.03 * Math.random()), pan: pan + (Math.random() - 0.5) * 0.2 });
    }
  },
  sand(nx: number) {
    const pan = stereo(nx);
    noise({ filter: "bandpass", freq: 3200, to: 800, dur: 0.24, gain: 0.434, q: 0.7, pan });
    noise({ filter: "highpass", freq: 4200, dur: 0.035, gain: 0.168, pan });
  },
  sizzle(nx: number) {
    if (throttled("sizzle", 110)) return;
    const pan = stereo(nx);
    const count = 3 + Math.floor(3 * Math.random());
    for (let i = 0; i < count; i++) {
      noise({ filter: "bandpass", freq: 2200 + 3000 * Math.random(), dur: 0.006 + 0.006 * Math.random(), gain: 0.3, q: 2.2, delay: 0.13 * Math.random(), pan: pan + (Math.random() - 0.5) * 0.15 });
    }
  },
  flick(nx: number) {
    noise({ filter: "bandpass", freq: 2600 + 900 * Math.random(), dur: 0.009, gain: 0.51, q: 2, pan: stereo(nx) });
  },
  unfurl(nx: number, progress: number, accent: boolean) {
    const k = Math.max(0, Math.min(1, progress));
    noise({ filter: "bandpass", freq: (900 + 2300 * k) * (0.9 + 0.2 * Math.random()), dur: 0.016 + (1 - k) * 0.01, gain: accent ? 0.48 : 0.34, q: 1.8, pan: stereo(nx) + (Math.random() - 0.5) * 0.12 });
  },
  chirp(index: number, nx: number) {
    const pan = stereo(nx);
    const f = 300 * Math.pow(1.14, ((index % 5) + 5) % 5);
    tone({ freq: 1.12 * f, to: 0.86 * f, dur: 0.09, gain: 0.61, type: "sawtooth", filter: "bandpass", cutoff: 3.4 * f, q: 3.2, attack: 0.006, pan });
    noise({ filter: "bandpass", freq: 3.4 * f, dur: 0.05, gain: 0.2916, q: 2.5, pan });
  },
  croak(index: number, nx: number) {
    const pan = stereo(nx);
    const f = 132 * Math.pow(1.12, ((index % 4) + 4) % 4);
    for (let i = 0; i < 2; i++) {
      tone({ freq: f * (i === 0 ? 1.06 : 0.98), to: f * (i === 0 ? 0.9 : 0.84), dur: 0.075, gain: 1.188, type: "sawtooth", filter: "bandpass", cutoff: 4.2 * f, q: 5.5, attack: 0.008, delay: 0.105 * i, pan });
    }
  },
  cough(nx: number, strength = 1) {
    const pan = stereo(nx);
    const f = detune(118, 60);
    [0, 0.4].forEach((delay, i) => {
      const s = strength * (i === 0 ? 1 : 0.55);
      noise({ filter: "bandpass", freq: 900, to: 620, dur: 0.16 - 0.04 * i, gain: 0.55 * s, q: 1.2, delay, pan });
      noise({ filter: "bandpass", freq: 2100, to: 1600, dur: 0.1 - 0.02 * i, gain: 0.25 * s, q: 1.6, delay, pan });
      tone({ freq: 1.1 * f, to: 0.85 * f, dur: 0.07, gain: 0.45 * s, type: "sawtooth", filter: "bandpass", cutoff: 4.5 * f, q: 4, attack: 0.006, delay, pan });
    });
  },
  snap(nx: number) {
    const pan = stereo(nx);
    noise({ filter: "bandpass", freq: 1900, to: 700, dur: 0.022, gain: 0.5, q: 1.3, pan });
    tone({ freq: detune(430, 120), to: 200, dur: 0.03, gain: 0.13, cutoff: 1800, pan });
  },
  squish(nx: number) {
    const pan = stereo(nx);
    noise({ filter: "lowpass", freq: 1300, to: 260, dur: 0.075, gain: 0.95, q: 0.6, pan });
    tone({ freq: detune(190, 90), to: 105, dur: 0.09, gain: 0.14, cutoff: 700, pan });
  },
};
