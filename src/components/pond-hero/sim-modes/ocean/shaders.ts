const NOISE_GLSL = `
float hash(vec2 p) {
  float h = dot(p, vec2(127.1, 311.7));
  return fract(sin(h) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return -1.0 + 2.0 * mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
`;

const SEA_GLSL = `
float sea_octave(vec2 uv, float choppy) {
  uv += noise(uv);
  vec2 wv = 1.0 - abs(sin(uv));
  vec2 swv = abs(cos(uv));
  wv = mix(wv, swv, wv);
  return pow(1.0 - pow(wv.x * wv.y, 0.65), choppy);
}

const mat2 octave_m = mat2(1.6, 1.2, -1.2, 1.6);

float getHeight(vec2 uv) {
  float SEA_TIME = u_time * 0.8;
  float freq = 0.16;
  float amp = 0.6;
  float choppy = 5.0;
  float h = 0.0;
  for (int i = 0; i < 4; i++) {
    float d  = sea_octave((uv + SEA_TIME) * freq, choppy);
          d += sea_octave((uv - SEA_TIME) * freq, choppy);
    h += d * amp;
    uv *= octave_m;
    freq *= 1.9;
    amp *= 0.22;
    choppy = mix(choppy, 1.0, 0.2);
  }
  return h;
}
`;

const DEPTH_GLSL = `
const vec2 HOLE = vec2(0.38, 0.28);

const vec3 GLOW = vec3(0.92, 0.95, 0.82);
const vec3 DEEP = vec3(0.005, 0.02, 0.06);

float smoothEdge(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

vec3 ringColor(float dist) {
  if (dist < 0.03) return mix(GLOW, vec3(0.40, 0.85, 0.78), smoothEdge(0.0, 0.03, dist));
  if (dist < 0.07) return mix(vec3(0.40, 0.85, 0.78), vec3(0.25, 0.75, 0.72), smoothEdge(0.03, 0.07, dist));
  if (dist < 0.12) return mix(vec3(0.25, 0.75, 0.72), vec3(0.15, 0.62, 0.64), smoothEdge(0.07, 0.12, dist));
  if (dist < 0.18) return mix(vec3(0.15, 0.62, 0.64), vec3(0.08, 0.50, 0.56), smoothEdge(0.12, 0.18, dist));
  if (dist < 0.25) return mix(vec3(0.08, 0.50, 0.56), vec3(0.04, 0.38, 0.48), smoothEdge(0.18, 0.25, dist));
  if (dist < 0.34) return mix(vec3(0.04, 0.38, 0.48), vec3(0.02, 0.28, 0.40), smoothEdge(0.25, 0.34, dist));
  if (dist < 0.44) return mix(vec3(0.02, 0.28, 0.40), vec3(0.01, 0.14, 0.26), smoothEdge(0.34, 0.44, dist));
  if (dist < 0.56) return mix(vec3(0.01, 0.14, 0.26), vec3(0.005, 0.06, 0.14), smoothEdge(0.44, 0.56, dist));
  if (dist < 0.68) return mix(vec3(0.005, 0.06, 0.14), DEEP, smoothEdge(0.56, 0.68, dist));
  return DEEP;
}

float edgeSDF(vec2 px, vec2 res) {
  float margin = 0.05 * min(res.x, res.y);
  vec2 halfR = res * 0.5;
  vec2 inner = halfR - margin;
  float maxR = min(inner.x, inner.y);
  float cr = 0.55 * maxR;
  vec2 q = abs(px - halfR) - (inner - cr);
  float sdf = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - cr;
  float na = min(res.x, res.y) * 0.06;
  sdf += noise(px * 0.006) * na * 0.30
       + noise(px * 0.018 + 500.0) * na * 0.12;
  vec2 uv = (px / min(res.x, res.y)) * 30.0;
  sdf += (getHeight(uv) - 1.0) * na * 0.4;
  return sdf;
}
`;

const LIGHT_GLSL = `
float sunRays(vec2 nPos, vec2 sunPos, float minR, float scale) {
  vec2 dir = nPos - sunPos;
  float angle = atan(dir.y, dir.x);
  vec2 radial = vec2(cos(angle), sin(angle));
  float rays = 0.0;
  for (int i = 0; i < 2; i++) {
    float ringR = 0.04 + float(i) * 0.07;
    vec2 sampleUV = (sunPos + radial * ringR) * scale;
    rays += smoothstep(0.65, 1.1, getHeight(sampleUV));
  }
  return rays * 0.5;
}

float causticLayer(vec2 p, float t) {
  p += vec2(noise(p * 0.8 + t), noise(p * 0.8 + t + 100.0)) * 0.4;
  vec2 ip = floor(p);
  float md = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 cell = ip + vec2(float(x), float(y));
      vec2 cp = cell + vec2(hash(cell), hash(cell + 99.0)) * 0.8 + 0.1;
      cp += 0.3 * vec2(sin(t * 0.7 + cp.x * 5.0), cos(t * 0.6 + cp.y * 5.0));
      md = min(md, length(p - cp));
    }
  }
  return pow(1.0 - clamp(md * 1.8, 0.0, 1.0), 3.0);
}

float caustics(vec2 px, float minR, float t) {
  float c1 = causticLayer(px / minR * 8.0, t * 0.5);
  float c2 = causticLayer(px / minR * 14.0, t * 0.7 + 50.0);
  return c1 * 0.6 + c2 * 0.4;
}
`;

/** Concentric schools orbiting the light; `compact` trims rings/fish for small canvases. */
function schoolGlsl(compact: boolean): string {
  const schools = compact ? 5 : 7;
  const maxFish = compact ? 16 : 20;
  return `
// School params packed: vec4(radius, count, speed, size)
vec4 getSchool(int s) {
  if (s==0) return vec4(0.04, 16.0, 0.55, 0.003);
  if (s==1) return vec4(0.065, 20.0, 0.55, 0.004);
  if (s==2) return vec4(0.09, 20.0, 0.55, 0.005);
  if (s==3) return vec4(0.12, 18.0, 0.50, 0.006);
  if (s==4) return vec4(0.16, 16.0, 0.50, 0.008);
  if (s==5) return vec4(0.21, 14.0, 0.48, 0.010);
             return vec4(0.27, 12.0, 0.45, 0.012);
}

float fishShadow(vec2 nPos, vec2 holeAR, float t, float aspect) {
  float shadow = 0.0;
  float breathe = 0.92 + 0.08 * sin(t * 0.15);

  for (int s = 0; s < ${schools}; s++) {
    vec4 school = getSchool(s);
    float r = school.x * breathe;
    float n = school.y;
    float spd = school.z;
    float sz = school.w;

    vec2 toHole = nPos - holeAR;
    float pixDistSq = dot(toHole, toHole);
    float outerR = (r + 0.06) * max(aspect, 1.0);
    float innerR = max(r - 0.02, 0.0);
    if (pixDistSq <= outerR * outerR && pixDistSq >= innerR * innerR) {
      for (int i = 0; i < ${maxFish}; i++) {
        float fi = float(i);
        if (fi >= n) {} else {
        float seed = hash(vec2(fi * 73.1 + float(s) * 200.0, fi * 91.3));
        float seed2 = hash(vec2(fi * 41.3 + float(s) * 137.0, fi * 67.9));

        float baseAngle = fi / n * 6.283;
        float personalSpeed = spd * (0.80 + seed2 * 0.40);
        float angle = t * personalSpeed + float(s) * 1.7 + baseAngle;
        angle += sin(t * 0.8 + fi * 2.1 + float(s) * 3.7) * 0.06;
        angle += sin(t * 0.8 + fi * 3.1 + float(s) * 2.3) * (6.283 / n) * 0.25;

        float rOff = r + (seed - 0.5) * 0.005
                       + sin(t * 0.6 + fi * 4.3 + float(s) * 1.9) * 0.003;
        float driftAmt = seed2 * seed2;
        float driftPhase = t * 0.2 + fi * 5.7 + float(s) * 9.1;
        rOff += sin(driftPhase) * driftAmt * 0.05;
        angle += cos(driftPhase) * driftAmt * 0.3;

        vec2 fishPos = holeAR + vec2(cos(angle) * rOff * aspect, sin(angle) * rOff);

        vec2 diff = nPos - fishPos;
        float quickD = dot(diff, diff);
        float maxBody = sz * 3.0;
        if (quickD < maxBody * maxBody) {
          vec2 fishDir = normalize(vec2(-sin(angle) * aspect, cos(angle)));
          fishDir += vec2(-fishDir.y, fishDir.x) * sin(t * 4.0 + fi * 4.0 + float(s) * 2.0) * 0.04;
          fishDir = normalize(fishDir);

          float along = dot(diff, fishDir);
          float across = dot(diff, vec2(-fishDir.y, fishDir.x));

          float perspective = 0.5 + rOff * 2.5;
          float bodyLen = sz * perspective * (0.85 + seed * 0.3);
          float bodyWid = bodyLen * 0.45;
          float taper = 1.0 - along / bodyLen * 0.3;
          float d = (along * along) / (bodyLen * bodyLen) +
                    (across * across) / (bodyWid * bodyWid * taper * taper);

          shadow = max(shadow, 1.0 - smoothstep(0.5, 2.0, d));
        }
      }
      }
    }
  }

  return shadow;
}
`;
}

const SPAWNED_FISH_GLSL = `
float spawnedFish(vec2 nPos, vec2 holeAR, float t, float aspect, vec2 res) {
  float shadow = 0.0;

  for (int i = 0; i < 10; i++) {
    vec4 sp = u_spawns[i];
    float age = t - sp.z;
    if (age >= 0.0 && age <= 4.0) {
      float seed = sp.w;
      vec2 spawnPos = vec2(sp.x / res.y, sp.y / res.y);

      float startDist = length(spawnPos - holeAR);
      float targetR = 0.05 + seed * 0.2;
      float decay = 1.0 - exp(-age * 0.5);
      float currentDist = mix(startDist, targetR, decay);

      float startAngle = atan(spawnPos.y - holeAR.y, (spawnPos.x - holeAR.x) / aspect);
      float orbitSpeed = 0.5 + seed * 0.2;
      float angle = startAngle + age * orbitSpeed * (0.3 + decay * 0.7);

      vec2 fishPos = holeAR + vec2(cos(angle) * currentDist * aspect, sin(angle) * currentDist);

      vec2 diff = nPos - fishPos;
      if (dot(diff, diff) < 0.001) {
        vec2 orbitDir = normalize(vec2(-sin(angle) * aspect, cos(angle)));
        vec2 approachDir = normalize(holeAR - fishPos);
        vec2 fishDir = normalize(mix(approachDir, orbitDir, decay));
        fishDir += vec2(-fishDir.y, fishDir.x) * sin(t * 5.0 + seed * 20.0) * 0.06;
        fishDir = normalize(fishDir);

        float bodyLen = 0.008 * (0.9 + seed * 0.2);
        float bodyWid = bodyLen * 0.45;
        float along = dot(diff, fishDir);
        float across = dot(diff, vec2(-fishDir.y, fishDir.x));
        float taper = 1.0 - along / bodyLen * 0.3;
        float d = (along * along) / (bodyLen * bodyLen) +
                  (across * across) / (bodyWid * bodyWid * taper * taper);

        float fadeIn = smoothstep(0.0, 0.2, age);
        float fadeOut = 1.0 - smoothstep(2.5, 4.0, age);
        shadow = max(shadow, (1.0 - smoothstep(0.5, 2.0, d)) * fadeIn * fadeOut);
      }
    }
  }

  return shadow;
}
`;

const MAIN_GLSL = `
void main() {
  vec2 px = gl_FragCoord.xy;
  px.y = u_resolution.y - px.y;
  vec2 res = u_resolution;
  vec3 BG = u_backdrop;

  float sdf = edgeSDF(px, res);
  float fadeDepth = 0.18 * min(res.x, res.y) * 0.45;
  if (sdf > 0.0) {
    gl_FragColor = vec4(BG, 1.0);
    return;
  }

  float t = u_time;
  float scale = 30.0;
  float minR = min(res.x, res.y);
  vec2 uv = (px / minR) * scale;

  // Wave surface: raw gradient for refraction lensing
  float gEps = 0.02;
  float hc = getHeight(uv);
  float hx = getHeight(uv + vec2(gEps, 0.0));
  float hy = getHeight(uv + vec2(0.0, gEps));

  vec2 waveGrad = vec2(hc - hx, hc - hy) / gEps;

  float aspect = res.x / res.y;
  vec2 nPos = vec2(px.x / res.y, px.y / res.y);
  vec2 holeAR = vec2(HOLE.x * aspect, HOLE.y);
  float diag = length(vec2(aspect, 1.0));
  float rawDist = length(nPos - holeAR) / diag;
  float refractStrength = 0.012 + 0.022 * clamp(1.0 - rawDist * 2.0, 0.0, 1.0);
  nPos += waveGrad * refractStrength;
  float dist = length(nPos - holeAR) / diag;

  dist += noise(px * 0.005) * 0.035
        + noise(px * 0.015 + 300.0) * 0.018
        + noise(px * 0.04 + 700.0) * 0.006;

  vec3 color = ringColor(dist);

  vec2 sunPos = holeAR + waveGrad * 0.012;
  float sunDist = length(nPos - sunPos);
  // Sampled at the sun, not per pixel, so fullBreak is one global value per frame.
  vec2 sunUV = (holeAR * res.y / minR) * scale * 0.3 + vec2(t * 0.2, 0.0);
  float slowWave = getHeight(sunUV);
  float fullBreak = smoothstep(0.7, 1.1, slowWave);
  fullBreak *= fullBreak;

  color *= 1.4;

  float dapple = smoothstep(0.6, 1.2, hc);
  float dappleFade = clamp(1.0 - dist * 1.3, 0.0, 1.0);
  float dapplePulse = 0.8 + 0.2 * sin(t * 0.6 + 2.0);
  color += dapple * dappleFade * 0.35 * dapplePulse * vec3(0.40, 0.48, 0.35);

  float rays = sunRays(nPos, holeAR, minR, scale);
  float rayFade = exp(-dist * 0.8);
  float rayBoost = 0.5 + fullBreak * 2.5;
  color += rays * rayFade * rayBoost * vec3(0.55, 0.48, 0.28);

  float caustVal = caustics(px, minR, t);
  float caustFade = clamp(1.0 - dist * 1.2, 0.0, 1.0);
  color += vec3(0.35, 0.40, 0.32) * caustVal * caustFade * 0.35;

  if (fullBreak > 0.1) {
    float swX = getHeight(sunUV + vec2(0.05, 0.0));
    float swY = getHeight(sunUV + vec2(0.0, 0.05));
    float sweepAngle = atan(slowWave - swY, slowWave - swX);
    vec2 toPixel = nPos - holeAR;
    float pixelAngle = atan(toPixel.y, toPixel.x);
    float sweepFade = exp(-dist * 1.2);
    float aDiff1 = mod(pixelAngle - sweepAngle + 3.14159, 6.28318) - 3.14159;
    float aDiff2 = mod(pixelAngle - sweepAngle - 0.5 + 3.14159, 6.28318) - 3.14159;
    float beam1 = exp(-aDiff1 * aDiff1 * 70.0);
    float beam2 = exp(-aDiff2 * aDiff2 * 30.0);
    float beat1 = pow(max(sin(t * 3.5 + sweepAngle * 2.0), 0.0), 3.0);
    float beat2 = pow(max(sin(t * 5.3 + sweepAngle * 3.0 + 1.0), 0.0), 3.0) * 0.7;
    float rhythm = max(beat1, beat2);
    color += (beam1 + beam2 * 0.6) * fullBreak * sweepFade * rhythm * 0.6 * vec3(0.50, 0.52, 0.35);
  }

  float breath = 0.0;
  breath += sin(t * 0.4) * 0.04;
  breath += sin(t * 1.1 + 0.7) * 0.03;
  breath += pow(max(sin(t * 2.7 + 1.3), 0.0), 3.0) * 0.03;
  color *= 0.92 + breath;

  float sunCore = exp(-sunDist * 16.0) * fullBreak;
  color += sunCore * 1.5 * vec3(1.0, 0.95, 0.65);
  color += exp(-sunDist * 5.0) * 0.2 * fullBreak * vec3(0.85, 0.80, 0.50);
  float haloPulse = 0.7 + 0.3 * pow(max(sin(t * 0.55 + 3.0), 0.0), 2.0);
  color += exp(-sunDist * 3.0) * 0.1 * haloPulse * vec3(0.50, 0.48, 0.28);

  // Snell's window
  float centerDist = length(nPos - holeAR);
  float snellT = smoothEdge(0.18 * diag, 0.40 * diag, centerDist);
  color *= mix(1.2, 0.85, snellT);

  float fish = fishShadow(nPos, holeAR, t, aspect);
  float spawned = spawnedFish(nPos, holeAR, t, aspect, res);
  fish = max(fish, spawned);
  color *= 1.0 - fish * 0.45 * clamp(1.0 - dist * 1.8, 0.1, 1.0);

  color = color / (1.0 + color * 0.35);

  color += (hash(px + t * 0.1) - 0.5) * 0.025 * vec3(0.7, 0.9, 1.1);

  // Edge fade in display space so the rim lands exactly on the page backdrop.
  if (-sdf < fadeDepth) {
    float ft = -sdf / fadeDepth;
    float s = ft * ft * (3.0 - 2.0 * ft);
    color = mix(BG, color, s);
  }

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

export const OCEAN_VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const OCEAN_MAX_SPAWNS = 10;

export function buildOceanFragmentShader(compact: boolean): string {
  return `
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_backdrop;
uniform vec4 u_spawns[${OCEAN_MAX_SPAWNS}];

${NOISE_GLSL}
${SEA_GLSL}
${DEPTH_GLSL}
${LIGHT_GLSL}
${schoolGlsl(compact)}
${SPAWNED_FISH_GLSL}
${MAIN_GLSL}
`;
}
