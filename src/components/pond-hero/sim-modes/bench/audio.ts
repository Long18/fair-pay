import { bed, burst, lfo, panOf, pick, rr, voice, type AmbienceGraph, type AmbienceSpec } from "../../audio/ambience";

export type BenchAmbienceState = { wind: number };

function chirp(
  g: AmbienceGraph,
  at: number,
  freqs: number[],
  dur: number,
  gain: number,
  pan: number,
  wet: number,
  vib?: [number, number],
) {
  voice(g.ctx, g.out, g.space, { at, dur, gain, freqs, attack: Math.min(0.02, 0.25 * dur), vib, pan, wet, cutoff: 7e3 });
}

function songbird(g: AmbienceGraph, at: number, gain = 0.016, wet = 0.55) {
  const pan = rr(-0.9, 0.9);
  const pitch = rr(0.9, 1.12);
  switch (pick(["robin", "chickadee", "warbler", "finch"] as const)) {
    case "robin": {
      let t = at;
      for (let i = 0; i < 4 + ((3 * Math.random()) | 0); i++) {
        const f = rr(2200, 3200) * pitch;
        chirp(g, t, [f, f * rr(1.1, 1.3), f * rr(0.85, 1)], rr(0.12, 0.2), gain, pan, wet);
        t += rr(0.2, 0.32);
      }
      break;
    }
    case "chickadee":
      chirp(g, at, [3900 * pitch, 3850 * pitch], 0.38, gain, pan, wet);
      chirp(g, at + 0.48, [3400 * pitch, 3350 * pitch], 0.4, 0.9 * gain, pan, wet);
      break;
    case "warbler":
      for (let i = 0; i < 9; i++) {
        const f = (3e3 + 160 * i) * pitch;
        chirp(g, at + 0.075 * i, [f, 1.25 * f], 0.055, 0.8 * gain, pan, wet);
      }
      break;
    case "finch":
      for (let i = 0; i < 6; i++) {
        const f = rr(3200, 4600) * pitch;
        chirp(g, at + i * rr(0.07, 0.11), [f, 0.7 * f], 0.06, 0.75 * gain, pan, wet, [120, 40]);
      }
  }
}

/** A sparrow's quick high twitter, off to one side. */
function twitter(g: AmbienceGraph, at: number, pan: number, gain = 0.014) {
  for (let i = 0; i < 3 + ((4 * Math.random()) | 0); i++) {
    const f = rr(3800, 5200);
    chirp(g, at + i * rr(0.12, 0.3), [f, 1.15 * f, 0.8 * f], 0.05, gain, pan + rr(-0.1, 0.1), 0.3);
  }
}

/** Soft scuffs on the gravel. */
function footstep(g: AmbienceGraph, at: number) {
  const freq = rr(300, 560);
  burst(g.ctx, g.out, g.space, {
    at,
    dur: rr(0.1, 0.18),
    gain: rr(0.12, 0.22),
    color: "pink",
    filter: "bandpass",
    freq,
    to: 1.35 * freq,
    q: 2.2,
    attack: 0.02,
    fall: 4,
    pan: rr(0.1, 0.7),
    wet: 0.25,
  });
}

function quacks(g: AmbienceGraph, at: number, pan: number, gain = 0.03, wet = 0.4, count = 0) {
  const n = count || 1 + ((4 * Math.random()) | 0);
  const base = rr(230, 290);
  for (let i = 0; i < n; i++) {
    const t = at + i * rr(0.17, 0.24);
    const f = base * (1 - 0.05 * i);
    for (const [cutoff, k] of [
      [1050, 1],
      [2500, 0.45],
    ]) {
      voice(g.ctx, g.out, g.space, {
        at: t,
        dur: rr(0.12, 0.17),
        gain: gain * k * (1 - 0.12 * i),
        type: "sawtooth",
        freqs: [1.1 * f, f, 0.82 * f],
        attack: 0.012,
        filter: "bandpass",
        cutoff,
        q: 3.5,
        pan,
        wet,
      });
    }
    burst(g.ctx, g.out, undefined, {
      at: t,
      dur: 0.05,
      gain: 0.25 * gain,
      color: "white",
      filter: "bandpass",
      freq: 1800,
      q: 1,
      pan,
    });
  }
}

/** Late-afternoon park: distant hum, leaves in the wind, birds, ducks, oars. */
export function createBenchAmbience(): AmbienceSpec<BenchAmbienceState> {
  let leaves: ReturnType<typeof bed> | null = null;
  let nextSong = 0;
  let nextTwitter = 0;
  let nextStep = 0;
  let nextQuack = 0;
  return {
    space: { decay: 1.8, damp: 5, level: 0.25 },
    room: 0.15,
    trim: 1.6,
    start(g, at) {
      const hum = bed(g, g.out, { color: "pink", filter: "lowpass", freq: 480, gain: 0.03 }, at);
      lfo(g, hum.gain.gain, 1 / 23, 0.01, at);
      leaves = bed(g, g.out, { color: "pink", filter: "bandpass", freq: 3e3, q: 0.5, gain: 0.004 }, at);
      nextSong = at + rr(4, 9);
      nextTwitter = at + rr(6, 14);
      nextStep = at + rr(1, 4);
      nextQuack = at + rr(25, 50);
    },
    schedule(g, until) {
      for (; nextSong < until; nextSong += rr(9, 24)) songbird(g, nextSong, 0.011, 0.7);
      for (; nextTwitter < until; nextTwitter += rr(12, 30)) twitter(g, nextTwitter, rr(-0.5, 0.1), 0.009);
      for (; nextStep < until; nextStep += rr(2.5, 7)) footstep(g, nextStep);
      for (; nextQuack < until; nextQuack += rr(40, 90)) {
        quacks(g, nextQuack, rr(0.3, 0.8), 0.012, 0.7, 1 + ((2 * Math.random()) | 0));
      }
    },
    update(g, state) {
      if (!leaves?.filter) return;
      const now = g.ctx.currentTime;
      const w = Math.max(0, Math.min(1.2, state.wind));
      leaves.gain.gain.setTargetAtTime(0.003 + w * w * 0.018, now, 0.8);
      leaves.filter.frequency.setTargetAtTime(2400 + 1400 * w, now, 0.8);
    },
    cue(g, kind, value, _gain, now) {
      if (kind !== "oar") return;
      const pan = panOf(value);
      burst(g.ctx, g.out, g.space, {
        at: now,
        dur: 0.22,
        gain: 0.07,
        color: "pink",
        filter: "bandpass",
        freq: 650,
        to: 320,
        q: 1.1,
        attack: 0.015,
        fall: 4,
        pan,
        wet: 0.4,
      });
      burst(g.ctx, g.out, g.space, {
        at: now + 0.06,
        dur: 0.6,
        gain: 0.015,
        color: "white",
        filter: "bandpass",
        freq: 1700,
        to: 900,
        q: 0.8,
        attack: 0.15,
        fall: 3,
        pan,
        wet: 0.35,
      });
    },
  };
}
