import { POND_SOUND_EVENT, pondSound } from "../sound";

/** Shared Web Audio graph for simulation modes (gated by the pond sound toggle). */
export type AudioHandle = { ctx: AudioContext; master: GainNode };
export type AudioRoom = { input: AudioNode; send: number };

const MAX_VOICES = 14;
const MASTER_GAIN = 0.85;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let room: AudioRoom | null = null;
let voices = 0;
const lastPlayed = new Map<string, number>();

function ensureContext() {
  if (ctx || typeof window === "undefined") return;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return;
  ctx = new Ctor();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -6;
  comp.knee.value = 4;
  comp.ratio.value = 12;
  comp.attack.value = 0.002;
  comp.release.value = 0.12;
  comp.connect(ctx.destination);
  master = ctx.createGain();
  master.gain.value = pondSound.isEnabled() ? MASTER_GAIN : 0;
  master.connect(comp);
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = 2 * Math.random() - 1;
}

if (typeof window !== "undefined") {
  const unlock = () => {
    if (pondSound.isEnabled()) {
      ensureContext();
      void ctx?.resume();
    }
    if (ctx) {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      window.removeEventListener("touchstart", unlock, true);
    }
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
  window.addEventListener("touchstart", unlock, true);

  window.addEventListener(POND_SOUND_EVENT, (e) => {
    const on = (e as CustomEvent<boolean>).detail;
    if (on) {
      ensureContext();
      void ctx?.resume().catch(() => {});
    }
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(on ? MASTER_GAIN : 0, ctx.currentTime);
    }
  });
}

export const SOUND_EVENT = POND_SOUND_EVENT;

export function isEnabled(): boolean {
  return pondSound.isEnabled();
}

export function setEnabled(on: boolean) {
  pondSound.setEnabled(on);
}

/** Live audio graph, or null when muted, hidden, or not yet unlocked. */
export function audio(): AudioHandle | null {
  if (!ctx || !master || !pondSound.isEnabled()) return null;
  if (ctx.state === "suspended") void ctx.resume();
  if (typeof document !== "undefined" && document.hidden) return null;
  return { ctx, master };
}

export function claimVoice(): boolean {
  if (voices >= MAX_VOICES) return false;
  voices++;
  return true;
}

export function releaseVoice() {
  voices = Math.max(0, voices - 1);
}

export function getNoiseBuffer(): AudioBuffer | null {
  return noiseBuffer;
}

export function getRoom(): AudioRoom | null {
  return room;
}

export function setRoom(input: AudioNode | null, send = 0) {
  room = input ? { input, send } : null;
}

/** True when `key` fired less than `ms` ago (and records this call otherwise). */
export function throttled(key: string, ms: number): boolean {
  const now = performance.now();
  const prev = lastPlayed.get(key);
  if (prev !== undefined && now - prev < ms) return true;
  lastPlayed.set(key, now);
  return false;
}
