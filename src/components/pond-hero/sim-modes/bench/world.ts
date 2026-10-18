import { sfx } from "../../audio/sfx";
import { createBirds, drawBirdShadows, drawFlock, drawPigeons, scatterPigeons, updateBirds, type Birds } from "./birds";
import { createBoat, drawBoat, drawBoatShadow, updateBoat, type Boat } from "./boat";
import { createDucks, drawDucks, updateDucks, type Crumb, type Duck } from "./ducks";
import { createExtras, drawExtras, drawExtrasShadows, updateExtras, type Extras } from "./extras";
import {
  ageRipples,
  createFx,
  drawBubbleShadows,
  drawBubbles,
  drawLeafShadows,
  drawLeaves,
  drawLilyFlowers,
  drawPuffs,
  drawRipplesAndGlow,
  drawSparkles,
  popBubbleAt,
  say,
  spawnRipple,
  spawnSparkle,
  updateBubbles,
  updateLeaves,
  updatePuffs,
  updateSparkles,
  type Fx,
} from "./fx";
import { createLawn, drawLawn, drawLawnShadows, updateLawn, type Lawn } from "./lawn";
import { buildPark, pondField, type Park, type Tree } from "./layout";
import { ctx2d, makeCanvas, rand, TAU } from "./math";
import { paintStaticProps } from "./props";
import { project, pt, setCamera } from "./projection";
import {
  createSmoker,
  drawSmoker,
  drawSmokerGlow,
  drawSmokerShadow,
  nearestPasserBy,
  updateSmoker,
  type Smoker,
} from "./smoker";
import { createTreeCache, drawCanopyShadows, drawCrowns, type TreeCache } from "./trees";
import { drawWalkers, drawWalkerShadows, spawnWalker, updateWalkers, type Walker } from "./walkers";

export type BenchLines = { musings: readonly string[]; replies: readonly string[] };

export type World = {
  L: Park;
  dpr: number;
  allTrees: Tree[];
  time: number;
  wind: number;
  windX: number;
  windY: number;
  camX: number;
  camY: number;
  people: Walker[];
  spawnT: number;
  ducks: Duck[];
  smoker: Smoker;
  crumbs: Crumb[];
  lawn: Lawn;
  boat: Boat;
  birds: Birds;
  extras: Extras;
  fx: Fx;
  trees: TreeCache;
  propsSprites: HTMLCanvasElement;
  propsShade: HTMLCanvasElement;
  lines: BenchLines;
  onOar: (nx: number) => void;
};

export type Layers = {
  sprites: HTMLCanvasElement;
  shade: HTMLCanvasElement;
  air: HTMLCanvasElement;
  fore: HTMLCanvasElement;
  canopy: HTMLCanvasElement;
};

export function createWorld(w: number, h: number, dpr: number, lines: BenchLines, onOar: (nx: number) => void): World {
  const L = buildPark(w, h);
  const propsSprites = makeCanvas(w * dpr, h * dpr);
  const propsShade = makeCanvas(w, h);
  const sp = ctx2d(propsSprites);
  sp.scale(dpr, dpr);
  setCamera(w / 2, h / 2, L.m);
  paintStaticProps(sp, ctx2d(propsShade), L);
  const fx = createFx(L);
  const world: World = {
    L,
    dpr,
    allTrees: L.trees.concat(L.shades),
    time: 0,
    wind: 0.5,
    windX: 0.5,
    windY: 0,
    camX: 0,
    camY: 0,
    people: [],
    spawnT: 2,
    ducks: createDucks(L),
    smoker: createSmoker(L, Math.max(1, lines.musings.length)),
    crumbs: [],
    lawn: createLawn(L),
    boat: createBoat(L),
    birds: createBirds(L),
    extras: createExtras(L),
    fx,
    trees: createTreeCache(),
    propsSprites,
    propsShade,
    lines,
    onOar,
  };
  for (let i = 0; i < 8; i++) spawnWalker(world.people, L, true);
  return world;
}

export function createLayers(w: number, h: number, dpr: number): Layers {
  return {
    sprites: makeCanvas(w * dpr, h * dpr),
    shade: makeCanvas(w, h),
    air: makeCanvas(w, h),
    fore: makeCanvas(w * dpr, h * dpr),
    canopy: makeCanvas(w / 2, h / 2),
  };
}

function throwCrumbs(crumbs: Crumb[], m: number, x: number, y: number) {
  for (let i = 0; i < 7; i++) {
    const a = rand(0, 6.28);
    const v = m * rand(0.4, 1.4);
    crumbs.push({ x, y, z: 1.2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(0.5, 2), water: false, alive: true, age: 0 });
  }
}

/** Tap in world coordinates: pop a bubble, talk to the smoker, plop the pond or scatter pigeons — then feed. */
export function tapWorld(world: World, x: number, y: number) {
  const { L, fx } = world;
  const m = L.m;
  const nx = x / L.w;
  if (popBubbleAt(fx, x, y, m)) {
    sfx.flick(nx);
    return;
  }
  const sm = world.smoker;
  if (Math.hypot(x - sm.mouth.x, y - sm.mouth.y) < 1.2 * m) {
    const replies = world.lines.replies;
    if (replies.length) say(fx, replies[(Math.random() * replies.length) | 0], sm.mouth.x, sm.mouth.y - 12, 2.6);
    sm.lookTo = 0;
    sm.talkT = rand(8, 14);
    sfx.cough(sm.x / L.w, 0.25);
    return;
  }
  if (pondField(L.pond, x, y) > 0) {
    spawnRipple(fx, x, y, 1.4 * m, 0.7, 2.4);
    spawnRipple(fx, x, y, 0.7 * m, 0.5, 1.6);
    sfx.plop(nx, 0.5);
  } else scatterPigeons(world.birds.pigeons, L, x, y, 2 * m);
  throwCrumbs(world.crumbs, m, x, y);
}

function updateCrumbs(fx: Fx, crumbs: Crumb[], L: Park, dt: number) {
  let wet = -1;
  let dry = -1;
  for (const c of crumbs) {
    if (!c.alive) continue;
    c.age += dt;
    if (c.z > 0) {
      c.vz -= 9.8 * dt;
      c.z += c.vz * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (c.z <= 0) {
        c.z = 0;
        c.water = pondField(L.pond, c.x, c.y) > 0;
        if (c.water) {
          spawnRipple(fx, c.x, c.y, 0.4 * L.m, 0.4, 1.2);
          spawnSparkle(fx, c.x, c.y, L.m, 2, 0.5 * L.m);
          wet = c.x;
        } else dry = c.x;
      }
    } else if (c.water) c.x += Math.sin(c.age) * L.m * 0.02 * dt;
    if (c.age > 40) c.alive = false;
  }
  if (wet >= 0) sfx.pellets(wet / L.w);
  else if (dry >= 0) sfx.flick(dry / L.w);
  if (crumbs.length > 60 || (crumbs.length && !crumbs[0].alive)) {
    for (let i = crumbs.length - 1; i >= 0; i--) if (!crumbs[i].alive) crumbs.splice(i, 1);
  }
}

const walkingScratch: { x: number; y: number }[] = [];

export function stepWorld(world: World, realDt: number) {
  // The whole park runs a little slow, like a late afternoon.
  const dt = 0.55 * realDt;
  const time = (world.time += dt);
  const L = world.L;
  const fx = world.fx;
  world.wind = 0.45 + 0.2 * Math.sin(0.13 * time) + 0.3 * Math.max(0, Math.sin(0.37 * time + 1)) ** 3;
  const dir = 0.1 + 0.35 * Math.sin(0.05 * time);
  world.windX = Math.cos(dir) * world.wind;
  world.windY = Math.sin(dir) * world.wind;
  world.camX = Math.sin(0.07 * time) * L.m * 0.25 + Math.sin(0.17 * time) * L.m * 0.08;
  world.camY = Math.cos(0.05 * time) * L.m * 0.2;
  world.spawnT -= dt;
  if (world.spawnT <= 0) {
    world.spawnT = rand(2, 5);
    if (world.people.length < 11) spawnWalker(world.people, L, false);
  }
  updateWalkers(world.people, L, dt);
  updateDucks(fx, world.ducks, world.crumbs, L, dt, world.boat);
  setCamera(L.w / 2 + world.camX, L.h / 2 + world.camY, L.m);
  updateSmoker(
    fx,
    world.smoker,
    L,
    dt,
    time,
    world.windX,
    world.windY,
    nearestPasserBy(world.smoker, world.people, L.m),
    world.lines.musings,
  );
  updateCrumbs(fx, world.crumbs, L, dt);
  walkingScratch.length = 0;
  for (const p of world.people) if (!p.pose.sitting) walkingScratch.push(p.pose);
  walkingScratch.push(world.lawn.kid.pose);
  updateBirds(world.birds, L, dt, walkingScratch, world.crumbs);
  updateExtras(fx, world.extras, L, dt, world.boat);
  updateBoat(fx, world.boat, L, dt, world.windX, world.windY, world.onOar);
  updateLawn(fx, world.lawn, L, dt, world.windX, world.windY);
  updateLeaves(fx, L, dt, world.windX, world.windY, world.wind - 0.45);
  updateSparkles(fx, dt);
  updateBubbles(fx, dt, world.windX, world.windY, L.m, time);
  updatePuffs(fx, dt, time, world.windX, world.windY, L.m);
  ageRipples(fx, dt);
  if (fx.speech.life > 0) fx.speech.t += dt;
}

const CR = pt();

export function renderLayers(world: World, layers: Layers) {
  const { L, dpr, camX, camY, time } = world;
  const m = L.m;
  const fx = world.fx;
  const sprites = ctx2d(layers.sprites);
  const shade = ctx2d(layers.shade);
  const air = ctx2d(layers.air);
  const fore = ctx2d(layers.fore);

  // Ground shadows of everything that stands on (or flies over) the lawn.
  shade.setTransform(1, 0, 0, 1, 0, 0);
  shade.clearRect(0, 0, L.w, L.h);
  shade.translate(-camX, -camY);
  shade.drawImage(world.propsShade, 0, 0);
  drawWalkerShadows(shade, world.people, m);
  drawSmokerShadow(shade, world.smoker, m, time);
  drawBoatShadow(shade, world.boat, m);
  drawBirdShadows(shade, world.birds, m);
  drawLawnShadows(shade, world.lawn, m);
  drawBubbleShadows(shade, fx, m);
  drawLeafShadows(shade, fx, m);
  drawExtrasShadows(shade, world.extras, m);

  // Figures and props.
  sprites.setTransform(1, 0, 0, 1, 0, 0);
  sprites.clearRect(0, 0, layers.sprites.width, layers.sprites.height);
  sprites.setTransform(dpr, 0, 0, dpr, -camX * dpr, -camY * dpr);
  sprites.drawImage(world.propsSprites, 0, 0, L.w, L.h);
  drawLilyFlowers(sprites, fx);
  drawDucks(sprites, world.ducks, m);
  drawBoat(sprites, world.boat, m);
  sprites.fillStyle = "#e6c890";
  for (const c of world.crumbs) {
    if (!c.alive) continue;
    project(c.x, c.y, c.z * m, CR);
    sprites.beginPath();
    sprites.arc(CR.x, CR.y, 0.045 * m * CR.k, 0, TAU);
    sprites.fill();
  }
  drawPigeons(sprites, world.birds, m);
  drawLawn(sprites, world.lawn, m, time);
  drawExtras(sprites, world.extras, m, time);
  drawWalkers(sprites, world.people, m, time);
  drawSmoker(sprites, world.smoker, m, time);
  drawLeaves(sprites, fx, m);

  // Ripples, bubbles, glints and smoke.
  air.setTransform(1, 0, 0, 1, 0, 0);
  air.clearRect(0, 0, L.w, L.h);
  air.translate(-camX, -camY);
  drawRipplesAndGlow(air, fx, time);
  drawBubbles(air, fx, time);
  drawSparkles(air, fx);
  drawPuffs(air, fx);
  air.globalCompositeOperation = "lighter";
  drawSmokerGlow(air, world.smoker, m);
  air.globalCompositeOperation = "source-over";

  // Canopy shade at half resolution.
  const canopy = ctx2d(layers.canopy);
  canopy.setTransform(1, 0, 0, 1, 0, 0);
  canopy.clearRect(0, 0, layers.canopy.width, layers.canopy.height);
  canopy.setTransform(0.5, 0, 0, 0.5, -(0.5 * camX), -(0.5 * camY));
  drawCanopyShadows(canopy, world.trees, world.allTrees, m, time, world.wind, dpr);

  // Crowns and the passing flock, closest to the lens.
  fore.setTransform(1, 0, 0, 1, 0, 0);
  fore.clearRect(0, 0, layers.fore.width, layers.fore.height);
  fore.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawCrowns(fore, world.trees, L.trees, m, time, world.wind, camX, camY, dpr);
  drawFlock(fore, world.birds, m, camX, camY);
}
