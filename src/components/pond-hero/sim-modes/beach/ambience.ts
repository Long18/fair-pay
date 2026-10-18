import { bed, burst, lfo, panOf, rr, voice, type AmbienceGraph, type AmbienceSpec } from "../../audio/ambience";

/** Breaking wave: low wash, hiss, fizz and a tail of bubble pops. `gain` is the wave's reach. */
function waveCue(g: AmbienceGraph, value: number, gain: number, at: number) {
  const { ctx, out, space } = g;
  const pan = 0.6 * panOf(value);
  const s = Math.min(1.4, 0.55 + 2.2 * gain);
  burst(ctx, out, space, {
    at,
    dur: 3.4,
    gain: 0.32 * s,
    color: "pink",
    filter: "lowpass",
    freq: 1500,
    to: 380,
    attack: 0.75,
    fall: 2,
    pan,
    wet: 0.35,
  });
  burst(ctx, out, space, {
    at: at + 0.55,
    dur: 2.2,
    gain: 0.24 * s,
    color: "white",
    filter: "bandpass",
    freq: 2300,
    to: 850,
    q: 0.45,
    attack: 0.12,
    fall: 2.5,
    pan,
    wet: 0.3,
  });
  burst(ctx, out, space, {
    at: at + 0.7,
    dur: 2.35,
    gain: 0.16 * s,
    color: "white",
    filter: "bandpass",
    freq: 2800,
    to: 5200,
    q: 0.55,
    attack: 0.55,
    fall: 2,
    pan,
    wet: 0.2,
  });
  burst(ctx, out, space, {
    at: at + 1.75,
    dur: 4.2,
    gain: 0.09 * s,
    color: "pink",
    filter: "bandpass",
    freq: 3e3,
    to: 1300,
    q: 0.5,
    attack: 0.8,
    fall: 2.2,
    pan,
    wet: 0.15,
  });
  const pops = Math.round(26 * s);
  for (let i = 0; i < pops; i++) {
    burst(ctx, out, undefined, {
      at: at + 1.75 + 5.25 * Math.pow(Math.random(), 1.8) * 0.7,
      dur: rr(0.006, 0.02),
      gain: rr(0.02, 0.05),
      color: "white",
      filter: "bandpass",
      freq: rr(4500, 9e3),
      q: 2.5,
      pan: pan + rr(-0.4, 0.4),
    });
  }
}

/** Crab legs skittering on sand. */
function scuttleCue(g: AmbienceGraph, value: number, at: number) {
  const { ctx, out } = g;
  const pan = panOf(value);
  for (let i = 0; i < 9; i++) {
    burst(ctx, out, undefined, {
      at: at + i * rr(0.035, 0.06),
      dur: 0.008,
      gain: 0.05,
      color: "white",
      filter: "bandpass",
      freq: rr(3200, 5200),
      q: 3,
      pan,
    });
  }
}

/** Distant gull: 2–4 descending sawtooth cries. */
function gull(g: AmbienceGraph, at: number) {
  const { ctx, out, space } = g;
  const pan = rr(-0.9, 0.9);
  const base = rr(780, 980);
  const cries = 2 + ((3 * Math.random()) | 0);
  for (let i = 0; i < cries; i++) {
    const start = at + i * rr(0.28, 0.42);
    const f = base * rr(0.95, 1.05) * (i === 0 ? 1.08 : 1);
    voice(ctx, out, space, {
      at: start,
      dur: rr(0.22, 0.34),
      gain: 0.03,
      type: "sawtooth",
      freqs: [0.9 * f, 1.55 * f, 1.2 * f],
      attack: 0.03,
      cutoff: 2400,
      q: 1.2,
      vib: [0.03 * f, 28],
      pan,
      wet: 0.9,
    });
  }
}

export function createBeachAmbienceSpec(): AmbienceSpec {
  let nextGullAt = 0;
  return {
    space: { decay: 2.2, damp: 4, level: 0.3 },
    room: 0.25,
    trim: 0.9,
    start(g, at) {
      const { out } = g;
      const surf = bed(g, out, { color: "brown", filter: "lowpass", freq: 520, stages: 2, gain: 0.11 }, at);
      lfo(g, surf.gain.gain, 1 / 13, 0.06, at);
      const hiss = bed(g, out, { color: "pink", filter: "bandpass", freq: 1300, q: 0.35, gain: 0.035 }, at);
      lfo(g, hiss.gain.gain, 1 / 13, 0.015, at);
      const wash = bed(g, out, { color: "pink", filter: "bandpass", freq: 520, q: 1.4, gain: 0.03 }, at);
      if (wash.filter) lfo(g, wash.filter.frequency, 1 / 17, 220, at);
      lfo(g, wash.gain.gain, 1 / 7, 0.014, at);
      bed(g, out, { color: "white", filter: "highpass", freq: 7e3, gain: 0.004 }, at);
      nextGullAt = at + rr(4, 10);
    },
    schedule(g, until) {
      while (nextGullAt < until) {
        gull(g, nextGullAt);
        nextGullAt += rr(9, 26);
      }
    },
    cue(g, kind, value, gain, now) {
      if (kind === "wave") waveCue(g, value, gain, now);
      else if (kind === "scuttle") scuttleCue(g, value, now);
    },
  };
}
