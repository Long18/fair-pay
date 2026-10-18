export type Team = 0 | 1;

export type DuckState =
  | "idle"
  | "defend"
  | "chase"
  | "support"
  | "pressure"
  | "dribble"
  | "receive"
  | "returnHome";

export type Duck = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  team: Team;
  mallard: boolean;
  step: number;
  kickCooldown: number;
  state: DuckState;
  homeX: number;
  homeY: number;
  phase: number;
  baseSpeed: number;
  freq: number;
  boosted: boolean;
};

export type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  z: number;
  vz: number;
  owner: number;
  contestCooldown: number;
};

export type Field = {
  mx: number;
  my: number;
  fw: number;
  fh: number;
  goalH: number;
  cx: number;
  cy: number;
};

export type TeamPhase = "attacking" | "defending";

export type Game = {
  ball: Ball;
  ducks: Duck[];
  field: Field;
  cursor: { x: number; y: number; active: boolean };
  userControlled: number;
  score: [number, number];
  goalFlash: number;
  goalTeam: Team;
  teamPhase: [TeamPhase, TeamPhase];
  time: number;
  lastGoalScorer: number;
  sprintBoost: [number, number];
  nextBoostTime: number;
};

type PassOption = { target: Duck; long: boolean };

const TEAMS: readonly Team[] = [0, 1];

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

/** X of the goal `team` attacks (team 0 attacks right). */
function attackGoalX(team: Team, f: Field) {
  return team === 0 ? f.mx + f.fw : f.mx;
}

function ownGoalX(team: Team, f: Field) {
  return team === 0 ? f.mx : f.mx + f.fw;
}

function isKeeper(team: Team, index: number) {
  return (team === 0 && index === 0) || (team === 1 && index === 4);
}

/** True when no opponent stands within `width` px of the straight line to the target. */
function laneClear(from: Duck, tx: number, ty: number, ducks: Duck[], width: number) {
  const dx = tx - from.x;
  const dy = ty - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 10) return true;
  const ux = dx / len;
  const uy = dy / len;
  for (const d of ducks) {
    if (d.team === from.team) continue;
    const ax = d.x - from.x;
    const ay = d.y - from.y;
    const proj = ax * ux + ay * uy;
    if (!(proj < 0) && !(proj > len) && Math.abs(ax * uy - ay * ux) < width) return false;
  }
  return true;
}

function userDuck(game: Game): Duck | null {
  return game.cursor.active && game.userControlled >= 0 ? game.ducks[game.userControlled] : null;
}

function findPass(duck: Duck, game: Game): PassOption | null {
  const { ducks, field } = game;
  const goalX = attackGoalX(duck.team, field);
  const user = userDuck(game);
  let best: Duck | null = null;
  let bestScore = -Infinity;
  let long = false;
  for (const mate of ducks) {
    if (mate === duck || mate.team !== duck.team || !laneClear(duck, mate.x, mate.y, ducks, 28)) {
      continue;
    }
    const d = dist(duck.x, duck.y, mate.x, mate.y);
    const dir = duck.team === 0 ? 1 : -1;
    let score =
      (mate.x - duck.x) * dir * 0.015 + ((field.fw - Math.abs(mate.x - goalX)) / field.fw) * 3;
    if (d > 0.35 * field.fw && Math.abs(mate.x - goalX) < 0.35 * field.fw) score += 2;
    if (d < 40) score -= 1;
    if (mate === user) score += 5;
    if (score > bestScore) {
      bestScore = score;
      best = mate;
      long = d > 0.35 * field.fw;
    }
  }
  return bestScore > 0.5 && best ? { target: best, long } : null;
}

function shotChance(duck: Duck, game: Game): { can: boolean; gy: number } {
  const goalX = attackGoalX(duck.team, game.field);
  if (Math.abs(duck.x - goalX) > 0.6 * game.field.fw) return { can: false, gy: game.field.cy };
  const gy =
    game.field.cy +
    (Math.random() < 0.5 ? -1 : 1) * game.field.goalH * (0.25 + 0.15 * Math.random());
  return { can: laneClear(duck, goalX, gy, game.ducks, 22), gy };
}

function kickBall(ball: Ball, tx: number, ty: number, speed: number) {
  const dx = tx - ball.x;
  const dy = ty - ball.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  ball.vx = (dx / len) * speed;
  ball.vy = (dy / len) * speed;
  ball.spin = (Math.random() - 0.5) * 18;
}

function chipBall(ball: Ball, tx: number, ty: number, speed: number, vz: number) {
  kickBall(ball, tx, ty, 0.75 * speed);
  ball.vz = vz;
  ball.spin = (Math.random() - 0.5) * 25;
}

function steer(duck: Duck, tx: number, ty: number, speed: number, dt: number) {
  const dx = tx - duck.x;
  const dy = ty - duck.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const s = len < 30 ? (len / 30) * speed : speed;
  duck.vx += ((dx / len) * s - duck.vx) * dt * 7;
  duck.vy += ((dy / len) * s - duck.vy) * dt * 7;
}

/** Index of the most recent kicker on `team` (lowest positive cooldown). */
function lastKicker(ducks: Duck[], team: Team) {
  let idx = -1;
  let best = Infinity;
  for (let i = 0; i < ducks.length; i++) {
    const d = ducks[i];
    if (d.team === team && d.kickCooldown > 0 && d.kickCooldown < best) {
      best = d.kickCooldown;
      idx = i;
    }
  }
  return idx;
}

export function createGame(w: number, h: number): Game {
  const mx = 0.08 * w;
  const my = 0.1 * h;
  const fw = w - 2 * mx;
  const fh = h - 2 * my;
  const field: Field = { mx, my, fw, fh, goalH: 0.3 * fh, cx: w / 2, cy: h / 2 };
  const leftHomes = [
    { x: field.cx - 0.38 * fw, y: field.cy },
    { x: field.cx - 0.22 * fw, y: field.cy },
    { x: field.cx - 0.05 * fw, y: field.cy - 0.28 * fh },
    { x: field.cx - 0.05 * fw, y: field.cy + 0.28 * fh },
  ];
  const rightHomes = [
    { x: field.cx + 0.38 * fw, y: field.cy },
    { x: field.cx + 0.22 * fw, y: field.cy },
    { x: field.cx + 0.05 * fw, y: field.cy - 0.28 * fh },
    { x: field.cx + 0.05 * fw, y: field.cy + 0.28 * fh },
  ];
  const speeds = [2.5, 2.7, 3, 2.9];
  const freqs = [0.31, 0.38, 0.43, 0.37];
  const ducks: Duck[] = [];
  for (let i = 0; i < 4; i++) {
    ducks.push({
      x: leftHomes[i].x,
      y: leftHomes[i].y,
      vx: 0,
      vy: 0,
      heading: 0,
      team: 0,
      mallard: false,
      step: 0,
      kickCooldown: 0,
      state: i === 0 ? "defend" : "idle",
      homeX: leftHomes[i].x,
      homeY: leftHomes[i].y,
      phase: (i * Math.PI) / 2,
      baseSpeed: speeds[i],
      freq: freqs[i],
      boosted: false,
    });
  }
  for (let i = 0; i < 4; i++) {
    ducks.push({
      x: rightHomes[i].x,
      y: rightHomes[i].y,
      vx: 0,
      vy: 0,
      heading: Math.PI,
      team: 1,
      mallard: true,
      step: 0,
      kickCooldown: 0,
      state: i === 0 ? "defend" : "idle",
      homeX: rightHomes[i].x,
      homeY: rightHomes[i].y,
      phase: ((i + 4) * Math.PI) / 4,
      baseSpeed: speeds[i],
      freq: freqs[i],
      boosted: false,
    });
  }
  return {
    ball: {
      x: field.cx,
      y: field.cy,
      vx: 0,
      vy: 0,
      spin: 0,
      z: 0,
      vz: 0,
      owner: -1,
      contestCooldown: 0,
    },
    ducks,
    field,
    cursor: { x: 0, y: 0, active: false },
    userControlled: -1,
    score: [0, 0],
    goalFlash: 0,
    goalTeam: 0,
    teamPhase: ["defending", "defending"],
    time: 0,
    lastGoalScorer: -1,
    sprintBoost: [-1, -1],
    nextBoostTime: 2,
  };
}

/** The controlled duck shoots, passes, or clears toward goal. */
function userKick(game: Game, index: number) {
  const duck = game.ducks[index];
  const { ball, field } = game;
  const shot = shotChance(duck, game);
  if (shot.can) {
    const goalX = attackGoalX(duck.team, field);
    const power =
      480 * (1 - (Math.abs(duck.x - goalX) / (0.6 * field.fw)) * 0.3) * (0.9 + 0.2 * Math.random());
    kickBall(ball, goalX, shot.gy, power);
    duck.kickCooldown = 0.35;
    ball.owner = -1;
    return;
  }
  const pass = findPass(duck, game);
  if (pass) {
    const { target, long } = pass;
    const speed = long ? 420 : 340;
    const lead = (dist(duck.x, duck.y, target.x, target.y) / speed) * 0.35;
    if (long) {
      chipBall(ball, target.x + target.vx * lead, target.y + target.vy * lead, speed, 50 + 35 * Math.random());
    } else {
      kickBall(ball, target.x + target.vx * lead, target.y + target.vy * lead, speed);
    }
    duck.kickCooldown = 0.3;
    target.state = "receive";
    ball.owner = -1;
    return;
  }
  kickBall(ball, attackGoalX(duck.team, field), field.cy, 384);
  duck.kickCooldown = 0.3;
  ball.owner = -1;
}

/** Tap/click: the controlled duck kicks if close, otherwise the ball is nudged away from the tap. */
export function handleTap(game: Game, px: number, py: number) {
  const { ball, ducks, cursor, userControlled } = game;
  if (cursor.active && userControlled >= 0) {
    const duck = ducks[userControlled];
    if (dist(duck.x, duck.y, ball.x, ball.y) < 32 && duck.kickCooldown <= 0) {
      userKick(game, userControlled);
      return;
    }
  }
  const dx = ball.x - px;
  const dy = ball.y - py;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const force = Math.max(80, Math.min(500, 800 / (0.04 * len + 1)));
  ball.vx += (dx / len) * force;
  ball.vy += (dy / len) * force;
  ball.spin = (Math.random() - 0.5) * 15;
  ball.owner = -1;
}

/** Pick the nearest outfield white duck to follow the cursor. */
export function grabNearestDuck(game: Game, px: number, py: number) {
  game.cursor.x = px;
  game.cursor.y = py;
  game.cursor.active = true;
  let idx = -1;
  let best = Infinity;
  for (let i = 0; i < game.ducks.length; i++) {
    const d = game.ducks[i];
    if (d.team !== 0 || i === 0) continue;
    const dd = (d.x - px) ** 2 + (d.y - py) ** 2;
    if (dd < best) {
      best = dd;
      idx = i;
    }
  }
  game.userControlled = idx;
}

function resetKickoff(game: Game) {
  const { ducks, ball, field } = game;
  ball.x = field.cx;
  ball.y = field.cy;
  ball.vx = (Math.random() - 0.5) * 50;
  ball.vy = (Math.random() - 0.5) * 30;
  ball.spin = 0;
  ball.z = 0;
  ball.vz = 0;
  ball.owner = -1;
  ball.contestCooldown = 0;
  for (const d of ducks) {
    d.x = d.homeX;
    d.y = d.homeY;
    d.vx = 0;
    d.vy = 0;
    d.state = "idle";
    d.kickCooldown = 0;
    d.boosted = false;
  }
}

/** Possession changed hands next to an opponent: the ball pops loose and nearby ducks bump apart. */
function contest(game: Game) {
  const { ball, ducks } = game;
  const ownerTeam = ducks[ball.owner].team;
  let opponentNear = false;
  for (const d of ducks) {
    if (d.team !== ownerTeam && dist(d.x, d.y, ball.x, ball.y) < 40) {
      opponentNear = true;
      break;
    }
  }
  if (!opponentNear) return;
  const angle = Math.random() * Math.PI * 2;
  ball.vx = Math.cos(angle) * (130 + 90 * Math.random());
  ball.vy = Math.sin(angle) * (130 + 90 * Math.random());
  ball.spin = (Math.random() - 0.5) * 20;
  ball.owner = -1;
  ball.contestCooldown = 0.3;
  for (const d of ducks) {
    const dd = dist(d.x, d.y, ball.x, ball.y);
    if (dd < 50 && dd > 0.1) {
      d.vx += ((d.x - ball.x) / dd) * 110;
      d.vy += ((d.y - ball.y) / dd) * 110;
      d.kickCooldown = Math.max(d.kickCooldown, 0.3);
    }
  }
}

function assignStates(game: Game, dt: number) {
  const { ball, ducks } = game;
  for (let i = 0; i < ducks.length; i++) {
    const duck = ducks[i];
    duck.kickCooldown = Math.max(0, duck.kickCooldown - dt);
    const attacking = game.teamPhase[duck.team] === "attacking";
    if (isKeeper(duck.team, i)) {
      duck.state = "defend";
      continue;
    }
    if (ball.owner === i) {
      duck.state = "dribble";
      continue;
    }
    const d = dist(duck.x, duck.y, ball.x, ball.y);
    let closest = true;
    for (let j = 0; j < ducks.length; j++) {
      if (j === i || ducks[j].team !== duck.team || isKeeper(duck.team, j)) continue;
      if (dist(ducks[j].x, ducks[j].y, ball.x, ball.y) < d - 5) {
        closest = false;
        break;
      }
    }
    if (attacking) duck.state = closest && ball.owner === -1 ? "chase" : "support";
    else if (closest) duck.state = "chase";
    else duck.state = ball.owner >= 0 ? "pressure" : "returnHome";
  }
}

/** Best open spot on a 5×3 grid for an off-ball attacker. */
function findSupportSpot(duck: Duck, game: Game) {
  const { field, ball, ducks } = game;
  const goalX = attackGoalX(duck.team, field);
  let bx = duck.homeX;
  let by = duck.homeY;
  let bestScore = -Infinity;
  const dir = duck.team === 0 ? 1 : -1;
  for (let col = 0; col < 5; col++) {
    for (let row = 0; row < 3; row++) {
      const sx = field.mx + 0.1 * field.fw + col * (0.2 * field.fw);
      const sy = field.my + 0.15 * field.fh + row * (0.35 * field.fh);
      const toGoal = Math.abs(sx - goalX);
      let score = ((field.fw - toGoal) / field.fw) * 3;
      if ((sx - ball.x) * dir > 0) score += 1.5;
      if (toGoal < 0.35 * field.fw) score += 2.5;
      const carrier = ball.owner >= 0 ? ducks[ball.owner] : null;
      if (carrier && carrier.team === duck.team && laneClear(carrier, sx, sy, ducks, 28)) score += 3;
      score += (Math.abs(sy - field.cy) / (0.5 * field.fh)) * 1.5;
      for (const d of ducks) {
        if (d.team === duck.team) continue;
        const dd = dist(sx, sy, d.x, d.y);
        if (dd < 60) score -= (60 - dd) / 25;
      }
      score -= (dist(sx, sy, duck.x, duck.y) / field.fw) * 0.3;
      if (score > bestScore) {
        bestScore = score;
        bx = sx;
        by = sy;
      }
    }
  }
  return { x: bx, y: by };
}

function dribble(duck: Duck, game: Game, dt: number, pace: number, boost: number) {
  const { ball, ducks, field } = game;
  if (duck.kickCooldown <= 0) {
    const shot = shotChance(duck, game);
    const goalX = attackGoalX(duck.team, field);
    const toGoal = Math.abs(duck.x - goalX);
    let pressured = false;
    for (const d of ducks) {
      if (d.team !== duck.team && dist(duck.x, duck.y, d.x, d.y) < 45) {
        pressured = true;
        break;
      }
    }
    if (shot.can) {
      const power = 480 * (1 - (toGoal / (0.6 * field.fw)) * 0.3) * (0.85 + 0.3 * Math.random());
      if (toGoal > 0.35 * field.fw && Math.random() < 0.3) {
        chipBall(ball, goalX, shot.gy, power, 60 + 30 * Math.random());
      } else {
        kickBall(ball, goalX, shot.gy, power);
      }
      duck.kickCooldown = 0.3;
    } else {
      const pass = findPass(duck, game);
      const user = userDuck(game);
      const passOdds = pass && pass.target === user ? 0.95 : 0.7;
      if (pass && Math.random() < passOdds) {
        const { target, long } = pass;
        const speed = long ? 420 : 340;
        const lead = (dist(duck.x, duck.y, target.x, target.y) / speed) * 0.35;
        const tx = target.x + target.vx * lead;
        const ty = target.y + target.vy * lead;
        if ((long && Math.random() < 0.5) || (pressured && Math.random() < 0.4)) {
          chipBall(ball, tx, ty, speed, 50 + 35 * Math.random());
        } else {
          kickBall(ball, tx, ty, speed);
        }
        duck.kickCooldown = 0.25;
        target.state = "receive";
      } else {
        const dir = duck.team === 0 ? 1 : -1;
        let dodge = 0;
        for (const d of ducks) {
          if (d.team !== duck.team && dist(duck.x, duck.y, d.x, d.y) < 60) {
            dodge = (d.y > duck.y ? -1 : 1) * 0.5;
            break;
          }
        }
        const tx = duck.x + 50 * dir + 25 * Math.sin(dodge);
        const ty = duck.y + 25 * Math.cos(dodge) + (Math.random() - 0.5) * 15;
        if (pressured && Math.random() < 0.35) {
          chipBall(ball, tx, ty, 200 + 50 * Math.random(), 40 + 25 * Math.random());
        } else {
          kickBall(ball, tx, ty, 180 + 60 * Math.random());
        }
        duck.kickCooldown = 0.2;
      }
    }
  }
  steer(duck, ball.x, ball.y, 300 * pace * boost, dt);
}

function think(
  duck: Duck,
  index: number,
  keeper: boolean,
  game: Game,
  dt: number,
  cruise: number,
  pace: number,
  boost: number,
) {
  const { ball, ducks, field } = game;
  const sprint = 300 * pace * boost;
  switch (duck.state) {
    case "defend": {
      if (!keeper) break;
      const ownX = ownGoalX(duck.team, field);
      if (ball.owner === index && duck.kickCooldown <= 0) {
        const user = userDuck(game);
        let forward: Duck | null = null;
        let bestD = Infinity;
        for (const d of ducks) {
          if (d === duck || d.team !== duck.team) continue;
          const dd = dist(d.x, d.y, attackGoalX(duck.team, field), field.cy);
          if (dd < bestD) {
            bestD = dd;
            forward = d;
          }
        }
        const target = user && user.team === duck.team ? user : forward;
        if (target) {
          chipBall(ball, target.x + 0.3 * target.vx, target.y, 400, 70 + 30 * Math.random());
        } else {
          chipBall(
            ball,
            attackGoalX(duck.team, field),
            field.cy + (Math.random() - 0.5) * field.goalH,
            400,
            80 + 20 * Math.random(),
          );
        }
        duck.kickCooldown = 0.5;
        break;
      }
      const backDir = duck.team === 0 ? -1 : 1;
      const threat =
        Math.abs(ball.x - ownX) < 0.22 * field.fw ||
        (ball.vx * backDir > 30 && Math.abs(ball.x - ownX) < 0.35 * field.fw);
      const toBall = dist(duck.x, duck.y, ball.x, ball.y);
      if (threat && toBall < 0.22 * field.fw) {
        const bs = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
        const lead = Math.min(0.4, toBall / Math.max(bs, 60));
        steer(duck, ball.x + ball.vx * lead, ball.y + ball.vy * lead, sprint, dt);
      } else {
        const tx = ownX + (ball.x - ownX) * (threat ? 0.25 : 0.18);
        const ty = field.cy + (ball.y - field.cy) * 0.6;
        const minX = duck.team === 0 ? field.mx : field.mx + 0.7 * field.fw;
        const maxX = duck.team === 0 ? field.mx + 0.3 * field.fw : field.mx + field.fw;
        steer(duck, Math.max(minX, Math.min(maxX, tx)), ty, cruise, dt);
      }
      break;
    }
    case "chase": {
      const bs = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
      const lead = Math.min(0.5, dist(duck.x, duck.y, ball.x, ball.y) / Math.max(bs, 50));
      steer(duck, ball.x + ball.vx * lead, ball.y + ball.vy * lead, sprint, dt);
      break;
    }
    case "support": {
      const spot = findSupportSpot(duck, game);
      steer(duck, spot.x, spot.y, cruise, dt);
      break;
    }
    case "pressure":
      if (ball.owner >= 0) {
        const carrier = ducks[ball.owner];
        const ownX = ownGoalX(duck.team, field);
        steer(
          duck,
          carrier.x + (ownX - carrier.x) * 0.15,
          carrier.y + (duck.y - carrier.y) * 0.1,
          sprint * 0.9,
          dt,
        );
      } else {
        steer(duck, duck.homeX, duck.homeY, 0.8 * cruise, dt);
      }
      break;
    case "dribble":
      dribble(duck, game, dt, pace, boost);
      break;
    case "receive": {
      const lead =
        (dist(duck.x, duck.y, ball.x, ball.y) / Math.max(Math.sqrt(ball.vx ** 2 + ball.vy ** 2), 30)) *
        0.5;
      steer(duck, ball.x + ball.vx * lead, ball.y + ball.vy * lead, sprint, dt);
      break;
    }
    case "returnHome":
      steer(
        duck,
        duck.homeX + (ball.x - duck.homeX) * 0.2,
        duck.homeY + (ball.y - duck.homeY) * 0.25,
        0.85 * cruise,
        dt,
      );
      break;
    default:
      steer(duck, duck.homeX, duck.homeY, 0.5 * cruise, dt);
  }
}

function checkGoal(game: Game) {
  const { ball, ducks, field } = game;
  const inMouth = ball.y > field.cy - field.goalH / 2 && ball.y < field.cy + field.goalH / 2;
  if (ball.x < field.mx) {
    if (inMouth) {
      game.score[1]++;
      game.goalFlash = 2;
      game.goalTeam = 1;
      game.lastGoalScorer = lastKicker(ducks, 1);
    } else {
      ball.x = field.mx + 1;
      ball.vx *= -0.55;
    }
  }
  if (ball.x > field.mx + field.fw) {
    if (inMouth) {
      game.score[0]++;
      game.goalFlash = 2;
      game.goalTeam = 0;
      game.lastGoalScorer = lastKicker(ducks, 0);
    } else {
      ball.x = field.mx + field.fw - 1;
      ball.vx *= -0.55;
    }
  }
}

export function stepGame(game: Game, dt: number) {
  const { ball, ducks, field } = game;
  game.time += dt;
  if (game.time >= game.nextBoostTime) {
    game.nextBoostTime = game.time + 2;
    for (const d of ducks) d.boosted = false;
    for (const team of TEAMS) {
      const candidates: number[] = [];
      for (let i = 0; i < ducks.length; i++) {
        if (ducks[i].team === team && !isKeeper(team, i)) candidates.push(i);
      }
      if (candidates.length) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        ducks[pick].boosted = true;
        game.sprintBoost[team] = pick;
      }
    }
  }

  if (game.goalFlash > 0) {
    game.goalFlash -= dt;
    if (game.goalFlash <= 0) resetKickoff(game);
    return;
  }

  ball.contestCooldown = Math.max(0, ball.contestCooldown - dt);
  const prevOwner = ball.owner;
  ball.owner = -1;
  if (ball.contestCooldown <= 0 && ball.z < 3) {
    let best = 20;
    for (let i = 0; i < ducks.length; i++) {
      if (ducks[i].kickCooldown > 0.15) continue;
      const d = dist(ducks[i].x, ducks[i].y, ball.x, ball.y);
      if (d < best) {
        best = d;
        ball.owner = i;
      }
    }
    if (ball.owner >= 0 && prevOwner >= 0 && ducks[ball.owner].team !== ducks[prevOwner].team) {
      contest(game);
    }
  }
  if (ball.owner >= 0) {
    const team = ducks[ball.owner].team;
    game.teamPhase[team] = "attacking";
    game.teamPhase[1 - team] = "defending";
  }

  assignStates(game, dt);

  const controlled = game.cursor.active ? game.userControlled : -1;
  for (let i = 0; i < ducks.length; i++) {
    const duck = ducks[i];
    const pace = duck.baseSpeed / 2.8 + 0.15 * Math.sin(game.time * duck.freq * Math.PI * 2 + duck.phase);
    const boost = duck.boosted ? 1.85 : 1;
    if (i === controlled) {
      steer(duck, game.cursor.x, game.cursor.y, 300 * pace * boost, dt);
      duck.state = "chase";
    } else {
      think(duck, i, isKeeper(duck.team, i), game, dt, 230 * pace * boost, pace, boost);
    }
    for (const other of ducks) {
      if (other === duck) continue;
      const dx = duck.x - other.x;
      const dy = duck.y - other.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 34 && d > 0.1) {
        const push =
          ((34 - d) / 34) *
          (dist(duck.x, duck.y, ball.x, ball.y) < 40 && duck.team !== other.team ? 500 : 200);
        duck.vx += (dx / d) * push * dt;
        duck.vy += (dy / d) * push * dt;
      }
    }
    duck.vx *= 0.92;
    duck.vy *= 0.92;
    const maxSpeed =
      i === controlled || duck.state === "chase" || duck.state === "dribble"
        ? 300 * pace * boost
        : 230 * pace * boost;
    const sp = Math.sqrt(duck.vx * duck.vx + duck.vy * duck.vy);
    if (sp > maxSpeed) {
      duck.vx = (duck.vx / sp) * maxSpeed;
      duck.vy = (duck.vy / sp) * maxSpeed;
    }
    duck.x += duck.vx * dt;
    duck.y += duck.vy * dt;
    duck.x = Math.max(field.mx + 8, Math.min(field.mx + field.fw - 8, duck.x));
    duck.y = Math.max(field.my + 8, Math.min(field.my + field.fh - 8, duck.y));
    const speed = Math.sqrt(duck.vx * duck.vx + duck.vy * duck.vy);
    if (speed > 5) duck.heading = Math.atan2(duck.vy, duck.vx);
    duck.step += speed * dt * 60 * 0.12;
  }

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.vx *= 0.984;
  ball.vy *= 0.984;
  ball.spin *= 0.98;
  if (ball.z > 0 || ball.vz > 0) {
    ball.z += ball.vz * dt;
    ball.vz -= 280 * dt;
    if (ball.z <= 0) {
      ball.z = 0;
      ball.vz = ball.vz < -20 ? -(0.3 * ball.vz) : 0;
    }
  }
  if (ball.y < field.my + 4) {
    ball.y = field.my + 4;
    ball.vy *= -0.55;
  }
  if (ball.y > field.my + field.fh - 4) {
    ball.y = field.my + field.fh - 4;
    ball.vy *= -0.55;
  }
  if (controlled >= 0) {
    const duck = ducks[controlled];
    if (
      duck.kickCooldown <= 0 &&
      ball.z < 3 &&
      ball.contestCooldown <= 0 &&
      dist(duck.x, duck.y, ball.x, ball.y) < 38
    ) {
      const sp = Math.sqrt(duck.vx * duck.vx + duck.vy * duck.vy);
      const ux = sp > 10 ? duck.vx / sp : Math.cos(duck.heading);
      const uy = sp > 10 ? duck.vy / sp : Math.sin(duck.heading);
      const fx = duck.x + 12 * ux;
      const fy = duck.y + 12 * uy;
      ball.x += (fx - ball.x) * 0.42;
      ball.y += (fy - ball.y) * 0.42;
      ball.vx += (duck.vx - ball.vx) * 0.42;
      ball.vy += (duck.vy - ball.vy) * 0.42;
      ball.spin *= 0.85;
      ball.owner = controlled;
    }
  }
  checkGoal(game);
}
