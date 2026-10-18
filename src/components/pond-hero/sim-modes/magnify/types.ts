export type AntCaste = "minor" | "media" | "major" | "queen";

export type AntState =
  | "wandering"
  | "scanning"
  | "greeting"
  | "trailing"
  | "foraging"
  | "carrying"
  | "alarmed"
  | "dodging"
  | "fleeing"
  | "panicking"
  | "regrouping";

export type TrailDot = { x: number; y: number; age: number; strength: number };

export type Ant = {
  x: number;
  y: number;
  angle: number;
  speed: number;
  targetSpeed: number;
  meanderPhase: number;
  meanderFreq: number;
  meanderAmp: number;
  turnTimer: number;
  targetAngle: number;
  state: AntState;
  stateTimer: number;
  prevState: AntState;
  scanAngle: number;
  legPhase: number;
  burnProgress: number;
  alive: boolean;
  burnDodged: boolean;
  timesHurt: number;
  caste: AntCaste;
  size: number;
  baseSpeed: number;
  shade: number;
  phase: number;
  trail: TrailDot[];
  trailTimer: number;
  followTarget: number;
  carryingFood: boolean;
  emergeTimer: number;
  enteringHole: number;
  enterProgress: number;
};

export type ParticleType = "smoke" | "spark" | "flash" | "ember" | "scorch" | "heat" | "wisp";

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  sizeEnd: number;
  type: ParticleType;
  r: number;
  g: number;
  b: number;
  phase: number;
};

export type Stick = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  health: number;
  charLevel: number;
  burning: boolean;
};

/** Twig pile the colony nests under; burnable. */
export type Nest = {
  cx: number;
  cy: number;
  sticks: Stick[];
  collapsed: boolean;
  panicTriggered: boolean;
  burnPercent: number;
};

export type Circle = { x: number; y: number; r: number };

/** Lingering burn mark left where the focused sunspot dwelled. */
export type Scorch = { x: number; y: number; r: number; alpha: number };

export type Pointer = { x: number; y: number; down: boolean; entered: boolean };

export type Rng = () => number;
