import {
  audio,
  claimVoice,
  getNoiseBuffer,
  getRoom,
  releaseVoice,
} from "./audio-core";

export type ToneOptions = {
  freq: number;
  to?: number;
  dur?: number;
  attack?: number;
  gain?: number;
  type?: OscillatorType;
  cutoff?: number;
  filter?: BiquadFilterType;
  q?: number;
  delay?: number;
  pan?: number;
};

export type NoiseOptions = {
  filter?: BiquadFilterType;
  freq?: number;
  to?: number;
  dur?: number;
  gain?: number;
  q?: number;
  delay?: number;
  pan?: number;
};

function route(
  node: AudioNode,
  src: AudioScheduledSourceNode,
  pan: number | undefined,
  ctx: AudioContext,
  master: GainNode,
  stopAt: number,
  start: () => void,
) {
  let out: AudioNode = node;
  if (pan !== undefined && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    node.connect(p);
    out = p;
  }
  out.connect(master);
  const room = getRoom();
  if (room) {
    const send = ctx.createGain();
    send.gain.value = room.send;
    out.connect(send);
    send.connect(room.input);
  }
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    releaseVoice();
  };
  src.onended = release;
  setTimeout(release, (stopAt - ctx.currentTime) * 1000 + 250);
  start();
  src.stop(stopAt);
}

/** Random pitch offset of ±`cents`. */
export function detune(freq: number, cents = 30): number {
  return freq * Math.pow(2, ((2 * Math.random() - 1) * cents) / 1200);
}

/** Map a normalized x position (0–1) to stereo pan. */
export function stereo(nx: number): number {
  return (Math.max(0, Math.min(1, nx)) - 0.5) * 0.7;
}

export function noise(o: NoiseOptions) {
  const a = audio();
  const buf = getNoiseBuffer();
  if (!a || !buf || !claimVoice()) return;
  const { ctx, master } = a;
  const at = ctx.currentTime + (o.delay ?? 0);
  const dur = o.dur ?? 0.05;
  const gain = o.gain ?? 0.08;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const offset = Math.random() * Math.max(0, buf.duration - dur - 0.05);
  const filter = ctx.createBiquadFilter();
  filter.type = o.filter ?? "bandpass";
  filter.frequency.setValueAtTime(o.freq ?? 1200, at);
  if (o.to !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), at + dur);
  }
  filter.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(1e-4, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.003);
  g.gain.exponentialRampToValueAtTime(1e-4, at + dur);
  src.connect(filter);
  filter.connect(g);
  route(g, src, o.pan, ctx, master, at + dur + 0.02, () =>
    src.start(at, offset, dur + 0.02),
  );
}

export function tone(o: ToneOptions) {
  const a = audio();
  if (!a || !claimVoice()) return;
  const { ctx, master } = a;
  const at = ctx.currentTime + (o.delay ?? 0);
  const dur = o.dur ?? 0.12;
  const attack = o.attack ?? 0.004;
  const gain = o.gain ?? 0.1;
  const osc = ctx.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, at);
  if (o.to !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), at + dur);
  }
  const g = ctx.createGain();
  g.gain.setValueAtTime(1e-4, at);
  g.gain.exponentialRampToValueAtTime(gain, at + attack);
  g.gain.exponentialRampToValueAtTime(1e-4, at + dur);
  osc.connect(g);
  let out: AudioNode = g;
  if (o.cutoff !== undefined) {
    const f = ctx.createBiquadFilter();
    f.type = o.filter ?? "lowpass";
    f.frequency.value = o.cutoff;
    f.Q.value = o.q ?? 0.7;
    g.connect(f);
    out = f;
  }
  route(out, osc, o.pan, ctx, master, at + dur + 0.02, () => osc.start(at));
}
