import { audio, getRoom, setRoom } from "./audio-core";

export type NoiseColor = "white" | "pink" | "brown";

/** Live ambience graph handed to a sim's `start` / `schedule` / `update` / `cue`. */
export type AmbienceGraph = {
  ctx: AudioContext;
  out: GainNode;
  space: GainNode;
  live: AudioScheduledSourceNode[];
};

export type AmbienceSpec<S = unknown> = {
  /** Output level once faded in. */
  trim: number;
  /** Reverb send for one-shot sfx while this ambience owns the room. */
  room: number;
  space: { decay: number; damp: number; level: number };
  start: (g: AmbienceGraph, at: number) => void;
  /** Called every ~400ms with a lookahead time to schedule upcoming events. */
  schedule: (g: AmbienceGraph, until: number) => void;
  update?: (g: AmbienceGraph, state: S) => void;
  cue?: (g: AmbienceGraph, kind: string, value: number, gain: number, now: number) => void;
};

const noiseCache = new WeakMap<BaseAudioContext, Record<NoiseColor, AudioBuffer>>();

function noiseBuffers(ctx: BaseAudioContext): Record<NoiseColor, AudioBuffer> {
  const cached = noiseCache.get(ctx);
  if (cached) return cached;
  const len = Math.floor(8 * ctx.sampleRate);
  const fade = Math.floor(0.25 * ctx.sampleRate);
  const make = (color: NoiseColor) => {
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, brown = 0;
      for (let i = 0; i < len; i++) {
        const w = 2 * Math.random() - 1;
        if (color === "white") {
          d[i] = 0.5 * w;
        } else if (color === "pink") {
          b0 = 0.99886 * b0 + 0.0555179 * w;
          b1 = 0.99332 * b1 + 0.0750759 * w;
          b2 = 0.969 * b2 + 0.153852 * w;
          b3 = 0.8665 * b3 + 0.3104856 * w;
          b4 = 0.55 * b4 + 0.5329522 * w;
          b5 = -0.7616 * b5 - 0.016898 * w;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + 0.5362 * w) * 0.11;
          b6 = 0.115926 * w;
        } else {
          brown = (brown + 0.02 * w) / 1.02;
          d[i] = 3.5 * brown;
        }
      }
      for (let i = 0; i < fade; i++) {
        const t = i / fade;
        d[i] = d[i] * t + d[len - fade + i] * (1 - t);
      }
    }
    return buf;
  };
  const out = { white: make("white"), pink: make("pink"), brown: make("brown") };
  noiseCache.set(ctx, out);
  return out;
}

/** Synthetic reverb: returns the input gain node of a convolver chain. */
export function makeSpace(
  ctx: AudioContext,
  dest: AudioNode,
  decay: number,
  damp: number,
  level = 1,
): GainNode {
  const len = Math.floor(ctx.sampleRate * decay);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const env = Math.pow(1 - t, 2.2) * Math.exp(-(3 * t));
      const k = Math.max(0.02, 0.6 * Math.exp(-t * damp));
      lp += k * (2 * Math.random() - 1 - lp);
      d[i] = lp * env * (i < 0.012 * ctx.sampleRate ? i / (0.012 * ctx.sampleRate) : 1);
    }
  }
  const input = ctx.createGain();
  const conv = ctx.createConvolver();
  const wet = ctx.createGain();
  conv.normalize = true;
  conv.buffer = ir;
  wet.gain.value = level;
  input.connect(conv);
  conv.connect(wet);
  wet.connect(dest);
  return input;
}

function connectOut(
  ctx: BaseAudioContext,
  node: AudioNode,
  dest: AudioNode,
  space: AudioNode | undefined,
  pan: number | undefined,
  wet: number | undefined,
) {
  let out = node;
  if (pan !== undefined) {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    node.connect(p);
    out = p;
  }
  out.connect(dest);
  if (space && wet) {
    const send = ctx.createGain();
    send.gain.value = wet;
    out.connect(send);
    send.connect(space);
  }
}

/** Looping filtered noise bed. */
export function bed(
  g: AmbienceGraph,
  dest: AudioNode,
  o: { color: NoiseColor; freq: number; q?: number; filter?: BiquadFilterType; stages?: number; gain: number },
  at = 0,
) {
  const { ctx } = g;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffers(ctx)[o.color];
  src.loop = true;
  let tail: AudioNode = src;
  let first: BiquadFilterNode | null = null;
  for (let i = 0; i < (o.stages ?? 1); i++) {
    const f = ctx.createBiquadFilter();
    f.type = o.filter ?? "lowpass";
    f.frequency.value = o.freq;
    f.Q.value = o.q ?? 0.7;
    tail.connect(f);
    tail = f;
    first ??= f;
  }
  const gain = ctx.createGain();
  gain.gain.value = o.gain;
  tail.connect(gain);
  gain.connect(dest);
  src.start(at, 7 * Math.random());
  g.live.push(src);
  return { gain, filter: first, src };
}

const envelopeCache = new Map<string, Float32Array>();

function envelope(gain: number, attackFrac: number, fall: number): Float32Array {
  const key = `${attackFrac.toFixed(3)}:${fall}`;
  let shape = envelopeCache.get(key);
  if (!shape) {
    shape = new Float32Array(128);
    for (let i = 0; i < 128; i++) {
      const t = i / 127;
      shape[i] =
        t < attackFrac
          ? Math.sin(((t / attackFrac) * Math.PI) / 2) ** 2
          : Math.exp((-fall * (t - attackFrac)) / (1 - attackFrac)) *
            (1 - ((t - attackFrac) / (1 - attackFrac)) ** 6);
    }
    envelopeCache.set(key, shape);
  }
  const out = new Float32Array(128);
  for (let i = 0; i < 128; i++) out[i] = shape[i] * gain;
  return out;
}

/** Filtered noise burst with a smooth envelope (waves, gusts, splashes). */
export function burst(
  ctx: BaseAudioContext,
  dest: AudioNode,
  space: AudioNode | undefined,
  o: {
    color?: NoiseColor;
    filter?: BiquadFilterType;
    freq: number;
    to?: number;
    q?: number;
    at: number;
    dur: number;
    gain: number;
    attack?: number;
    fall?: number;
    pan?: number;
    wet?: number;
  },
) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffers(ctx)[o.color ?? "white"];
  const f = ctx.createBiquadFilter();
  f.type = o.filter ?? "bandpass";
  f.Q.value = o.q ?? 0.8;
  f.frequency.setValueAtTime(o.freq, o.at);
  if (o.to !== undefined) {
    f.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), o.at + o.dur);
  }
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.setValueCurveAtTime(
    envelope(o.gain, Math.max(0.004, o.attack ?? 0.01) / o.dur, o.fall ?? 3),
    o.at,
    o.dur,
  );
  src.connect(f);
  f.connect(g);
  connectOut(ctx, g, dest, space, o.pan, o.wet);
  src.start(o.at, 6 * Math.random(), o.dur + 0.05);
}

export function lfo(g: AmbienceGraph, target: AudioParam, freq: number, depth: number, at = 0) {
  const osc = g.ctx.createOscillator();
  const amt = g.ctx.createGain();
  osc.frequency.value = freq;
  amt.gain.value = depth;
  osc.connect(amt);
  amt.connect(target);
  osc.start(at);
  g.live.push(osc);
  return osc;
}

/** Pitched oscillator with glide through `freqs` (birds, gulls, calls). */
export function voice(
  ctx: BaseAudioContext,
  dest: AudioNode,
  space: AudioNode | undefined,
  o: {
    type?: OscillatorType;
    freqs: number[];
    at: number;
    dur: number;
    gain: number;
    attack?: number;
    vib?: [depth: number, rate: number];
    cutoff?: number;
    filter?: BiquadFilterType;
    q?: number;
    pan?: number;
    wet?: number;
  },
) {
  const osc = ctx.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freqs[0], o.at);
  for (let i = 1; i < o.freqs.length; i++) {
    osc.frequency.exponentialRampToValueAtTime(o.freqs[i], o.at + (o.dur * i) / (o.freqs.length - 1));
  }
  if (o.vib) {
    const v = ctx.createOscillator();
    const vg = ctx.createGain();
    v.frequency.value = o.vib[1];
    vg.gain.value = o.vib[0];
    v.connect(vg);
    vg.connect(osc.frequency);
    v.start(o.at);
    v.stop(o.at + o.dur + 0.05);
  }
  const g = ctx.createGain();
  const attack = Math.max(0.004, o.attack ?? 0.01);
  g.gain.setValueAtTime(1e-4, o.at);
  g.gain.exponentialRampToValueAtTime(o.gain, o.at + attack);
  g.gain.setValueAtTime(o.gain, o.at + Math.max(attack, 0.6 * o.dur));
  g.gain.exponentialRampToValueAtTime(1e-4, o.at + o.dur);
  osc.connect(g);
  let out: AudioNode = g;
  if (o.cutoff) {
    const f = ctx.createBiquadFilter();
    f.type = o.filter ?? "lowpass";
    f.frequency.value = o.cutoff;
    f.Q.value = o.q ?? 0.7;
    g.connect(f);
    out = f;
  }
  connectOut(ctx, out, dest, space, o.pan, o.wet);
  osc.start(o.at);
  osc.stop(o.at + o.dur + 0.05);
}

export const pick = <T,>(items: readonly T[]): T => items[(Math.random() * items.length) | 0];
export const rr = (min: number, max: number) => min + Math.random() * (max - min);
export const panOf = (nx: number) => (Math.max(0, Math.min(1, nx)) - 0.5) * 1.1;

/**
 * Ambient soundscape that starts while `attach`ed element is on screen and
 * sound is enabled, and fades out otherwise.
 */
export function createAmbience<S>(spec: AmbienceSpec<S>) {
  let el: Element | null = null;
  let visible = false;
  let graph: AmbienceGraph | null = null;
  let out: GainNode | null = null;
  let interval = 0;
  let lastUpdate = 0;
  const io =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(
          ([entry]) => {
            visible = entry.isIntersecting;
            tick();
          },
          { threshold: 0.2 },
        );

  function stop() {
    if (!graph || !out) return;
    const { ctx, live, space } = graph;
    const g = out;
    const now = ctx.currentTime;
    if (getRoom()?.input === space) setRoom(null);
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(Math.max(1e-4, g.gain.value), now);
    g.gain.exponentialRampToValueAtTime(1e-4, now + 1.2);
    setTimeout(() => {
      for (const node of live) {
        try {
          node.stop();
        } catch {
          /* already stopped */
        }
      }
      g.disconnect();
    }, 1300);
    graph = null;
    out = null;
  }

  function tick() {
    const a = audio();
    const active = !!a && visible;
    if (active && a && !graph) {
      const { ctx, master } = a;
      out = ctx.createGain();
      out.gain.setValueAtTime(1e-4, ctx.currentTime);
      out.gain.exponentialRampToValueAtTime(spec.trim, ctx.currentTime + 3);
      out.connect(master);
      const space = makeSpace(ctx, out, spec.space.decay, spec.space.damp, spec.space.level);
      graph = { ctx, out, space, live: [] };
      setRoom(space, spec.room);
      spec.start(graph, ctx.currentTime + 0.05);
    } else if (!active && graph) {
      stop();
    }
    if (graph) spec.schedule(graph, graph.ctx.currentTime + 1.5);
  }

  return {
    attach(target: Element) {
      el = target;
      io?.observe(target);
      interval = window.setInterval(tick, 400);
    },
    update(state: S) {
      if (!graph || !spec.update) return;
      const now = performance.now();
      if (now - lastUpdate < 100) return;
      lastUpdate = now;
      spec.update(graph, state);
    },
    cue(kind: string, value: number, gain = 1) {
      if (graph && spec.cue) spec.cue(graph, kind, value, gain, graph.ctx.currentTime);
    },
    dispose() {
      clearInterval(interval);
      if (el) io?.unobserve(el);
      io?.disconnect();
      stop();
    },
  };
}
