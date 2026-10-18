import {
  bed,
  burst,
  lfo,
  panOf,
  rr,
  voice,
  type AmbienceGraph,
  type AmbienceSpec,
} from "../../audio/ambience";

/** Short rising blips scattered over ~0.9s: bubbles drifting up. */
function bubbles(g: AmbienceGraph, at: number, pan: number, count: number, pitch = 1) {
  const { ctx, out, space } = g;
  for (let i = 0; i < count; i++) {
    const when = at + 0.9 * Math.pow(Math.random(), 1.4);
    const freq = rr(380, 900) * pitch;
    voice(ctx, out, space, {
      at: when,
      dur: rr(0.04, 0.09),
      gain: rr(0.012, 0.03),
      freqs: [freq, freq * rr(1.4, 1.9)],
      attack: 0.004,
      cutoff: 2200,
      pan: pan + rr(-0.15, 0.15),
      wet: 0.6,
    });
  }
}

/** Two overlapping slow noise swells, mirrored in the stereo field. */
function swell(g: AmbienceGraph, at: number) {
  const { ctx, out, space } = g;
  const pan = rr(-0.8, 0.8);
  burst(ctx, out, space, {
    at,
    dur: 2.6,
    gain: 0.05,
    color: "pink",
    filter: "lowpass",
    freq: 700,
    to: 300,
    attack: 1.1,
    fall: 2,
    pan,
    wet: 0.6,
  });
  burst(ctx, out, space, {
    at: at + 0.5,
    dur: 2.4,
    gain: 0.04,
    color: "pink",
    filter: "lowpass",
    freq: 800,
    to: 280,
    attack: 0.9,
    fall: 2,
    pan: -(0.8 * pan),
    wet: 0.6,
  });
}

/** Distant whale call: a slow gliding triangle tone plus one faint overtone. */
function whale(g: AmbienceGraph, at: number) {
  const { ctx, out, space } = g;
  const base = rr(150, 210);
  const pan = rr(-0.6, 0.6);
  const partials: [mult: number, gain: number][] = [
    [1, 0.026],
    [2.01, 0.008],
  ];
  for (const [mult, gain] of partials) {
    voice(ctx, out, space, {
      at,
      dur: rr(4.5, 6),
      gain,
      type: "triangle",
      freqs: [base * mult, 1.45 * base * mult, 1.25 * base * mult, 0.85 * base * mult],
      attack: 1.2,
      cutoff: 900,
      vib: [0.012 * base * mult, 4.5],
      pan,
      wet: 1,
    });
  }
}

const DRONE: [freq: number, lfoRate: number][] = [
  [220, 1 / 23],
  [329.6, 1 / 29],
  [493.9, 1 / 17],
  [220.6, 1 / 31],
];

/** Deep-water bed: brown rumble, pink current, a soft A-major drone, bubbles, swells and whales. */
export function createOceanAmbience(): AmbienceSpec {
  let nextBubbles = 0;
  let nextSwell = 0;
  let nextWhale = 0;

  return {
    space: { decay: 4.8, damp: 9, level: 0.6 },
    room: 0.7,
    trim: 0.9,
    start(g, at) {
      const { ctx, out } = g;
      const rumble = bed(g, out, { color: "brown", filter: "lowpass", freq: 260, stages: 2, gain: 0.12 }, at);
      lfo(g, rumble.gain.gain, 1 / 19, 0.04, at);

      const current = bed(g, out, { color: "pink", filter: "lowpass", freq: 850, stages: 2, gain: 0.06 }, at);
      lfo(g, current.gain.gain, 1 / 6.5, 0.035, at);
      if (current.filter) lfo(g, current.filter.frequency, 1 / 11, 160, at);

      for (const [freq, rate] of DRONE) {
        const osc = ctx.createOscillator();
        const level = ctx.createGain();
        const lowpass = ctx.createBiquadFilter();
        osc.frequency.value = freq;
        lowpass.type = "lowpass";
        lowpass.frequency.value = 900;
        level.gain.value = 0.0042;
        osc.connect(lowpass);
        lowpass.connect(level);
        level.connect(out);
        const send = ctx.createGain();
        send.gain.value = 0.8;
        level.connect(send);
        send.connect(g.space);
        osc.start(at);
        g.live.push(osc);
        lfo(g, level.gain, rate, 0.004, at);
      }

      nextBubbles = at + rr(2, 5);
      nextSwell = at + rr(8, 14);
      nextWhale = at + rr(18, 35);
    },
    schedule(g, until) {
      while (nextBubbles < until) {
        bubbles(g, nextBubbles, rr(-0.8, 0.8), 3 + ((6 * Math.random()) | 0));
        nextBubbles += rr(4, 11);
      }
      while (nextSwell < until) {
        swell(g, nextSwell);
        nextSwell += rr(14, 26);
      }
      while (nextWhale < until) {
        whale(g, nextWhale);
        nextWhale += rr(45, 90);
      }
    },
    cue(g, kind, value, _gain, now) {
      if (kind === "spawn") bubbles(g, now, panOf(value), 8, 1.4);
    },
  };
}
