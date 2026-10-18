const STORAGE_KEY = "fairpay-pond-sound";

/** Fired on `window` with `detail: boolean` whenever sound is toggled. */
export const POND_SOUND_EVENT = "fairpay-pond-sound-change";

let enabled = false;
let ctx: AudioContext | null = null;

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

enabled = readEnabled();

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.04,
  pan = 0,
) {
  if (!enabled) return;
  const audio = getCtx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  const p = audio.createStereoPanner();
  osc.type = type;
  osc.frequency.value = freq;
  p.pan.value = pan;
  g.gain.setValueAtTime(gain, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  osc.connect(g);
  g.connect(p);
  p.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + duration);
}

export const pondSound = {
  isEnabled: () => enabled,
  setEnabled: (on: boolean) => {
    enabled = on;
    try {
      localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent(POND_SOUND_EVENT, { detail: on }));
  },
  toggle: () => {
    pondSound.setEnabled(!enabled);
    return enabled;
  },
  plop: (nx: number) => tone(180 + nx * 80, 0.12, "triangle", 0.035, nx * 2 - 1),
  ripple: (nx: number) => tone(120 + nx * 40, 0.08, "sine", 0.02, nx * 2 - 1),
  chirp: (nx: number) => {
    tone(520 + nx * 120, 0.06, "sine", 0.025, nx * 2 - 1);
    tone(680 + nx * 100, 0.05, "sine", 0.015, nx * 2 - 1);
  },
  pellets: (nx: number) => tone(240, 0.05, "square", 0.02, nx * 2 - 1),
  surface: (nx: number) => tone(90, 0.15, "sine", 0.03, nx * 2 - 1),
};
