// Ported verbatim from the original bench chunk.

export const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export const SCENE_FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uSize;
uniform float uM, uTime, uWind;
uniform vec2 uCam, uSun;
uniform sampler2D uMap, uSprites, uShade, uAir, uFore, uCanopy;
/** Recent ripples: world xy, age in seconds, amplitude. */
uniform vec4 uRipples[12];

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += noise(p) * a; p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= 0.5; }
  return s;
}

float dapple(vec2 m) {
  // The low sun stretches every sunfleck along its direction.
  vec2 sd = normalize(uSun);
  vec2 q = vec2(dot(m, sd) * 0.62, dot(m, vec2(-sd.y, sd.x)));
  float t = uTime * (0.6 + uWind * 0.6);
  float n = noise(q * 2.3 + vec2(t * 0.2, t * 0.06)) * 0.5 + noise(q * 4.6 - vec2(t * 0.13, -t * 0.21) + 7.0) * 0.3 + noise(q * 0.7 + 3.0) * 0.2;
  return smoothstep(0.57, 0.7, n);
}

// The duck pond's water, the same model: seascape octaves (1 - |sin|
// makes sharp crests), rotated between octaves so nothing lines up, with
// ripples written into the height field so they bend with the swell.
float sea_octave(vec2 uv, float choppy) {
  uv += noise(uv) * 2.0 - 1.0;
  vec2 wv = 1.0 - abs(sin(uv));
  vec2 swv = abs(cos(uv));
  wv = mix(wv, swv, wv);
  return pow(1.0 - pow(wv.x * wv.y, 0.65), choppy);
}
float seaHeight(vec2 uv) {
  float T = uTime * 0.8, freq = 0.16, amp = 0.6, choppy = 4.0, h = 0.0;
  for (int i = 0; i < 4; i++) {
    float d = sea_octave((uv + T) * freq, choppy) + sea_octave((uv - T) * freq, choppy);
    h += d * amp;
    uv = mat2(1.6, 1.2, -1.2, 1.6) * uv;
    freq *= 1.9; amp *= 0.22; choppy = mix(choppy, 1.0, 0.2);
  }
  return h;
}
float ripples(vec2 uv, float hc, vec2 grad) {
  float r = 0.0;
  for (int i = 0; i < 12; i++) {
    vec4 rp = uRipples[i];
    if (rp.w <= 0.0) continue;
    float age = rp.z;
    vec2 diff = uv - rp.xy / uM * 0.85 + grad * 1.2;
    float n = (noise(uv * 3.0 + uTime * 0.5) - 0.5) * 0.3;
    float dist = length(diff + vec2(n, -n));
    float front = age * 4.5 * (1.0 + hc * 0.3);
    r += rp.w * 0.45 * exp(-pow(dist - front, 2.0) / 1.5) * exp(-age * 1.4) * cos(dist * 5.0 - uTime * 6.0);
  }
  return r;
}
float waterHeight(vec2 uv) {
  float hc = seaHeight(uv);
  vec2 g = vec2(seaHeight(uv + vec2(0.04, 0.0)) - hc, seaHeight(uv + vec2(0.0, 0.04)) - hc) / 0.04;
  return hc + ripples(uv, hc, g);
}
float sparkles(vec2 uv, vec3 normal) {
  vec3 refl = reflect(vec3(0.0, -1.0, 0.0), normal);
  float spec = max(dot(refl, normalize(vec3(0.4, 0.7, 0.3))), 0.0);
  float phase = fract(uTime / 5.0);
  float burst = smoothstep(0.0, 0.03, phase) * smoothstep(0.30, 0.26, phase);
  float gate = step(0.86, spec) * burst;
  if (gate < 0.001) return 0.0;
  vec2 g = uv / 30.0 / 0.025, id = floor(g), f = fract(g);
  vec2 ctr = vec2(hash(id + 127.1), hash(id + 311.7)) * 0.5 + 0.25;
  vec2 dl = (f - ctr) * 0.025;
  float an = 0.6 + hash(id + 444.4) * 0.55;
  vec2 r = vec2(cos(an) * dl.x + sin(an) * dl.y, -sin(an) * dl.x + cos(an) * dl.y);
  float shape = exp(-dot(dl, dl) / 0.000002) + exp(-abs(r.x) / 0.003) * exp(-r.y * r.y / 0.0000005) + exp(-abs(r.y) / 0.003) * exp(-r.x * r.x / 0.0000005);
  float tw = pow(max(sin(uTime * (10.0 + hash(id + 700.1) * 15.0) + hash(id + 500.3) * 6.283), 0.0), 20.0);
  return shape * step(0.5, hash(id + 900.7)) * gate * tw;
}
vec3 pondColor(vec2 uv, float deep, out float spark) {
  float h = waterHeight(uv);
  float e = 0.01;
  vec3 n = normalize(vec3(h - waterHeight(uv + vec2(e, 0.0)), e * 4.5, h - waterHeight(uv + vec2(0.0, e))));
  vec3 L = normalize(vec3(0.4, 0.7, 0.3)), eye = vec3(0.0, 1.0, 0.0);
  float fres = clamp(pow(1.0 - max(dot(n, eye), 0.0), 3.0) * 0.65, 0.0, 1.0);
  vec3 deepC = vec3(0.02, 0.18, 0.32), waterC = vec3(0.25, 0.65, 0.60), skyC = vec3(0.50, 0.82, 0.88);
  // Shallows show the bed through them: greener and lighter at the edge.
  deepC = mix(vec3(0.12, 0.3, 0.26), deepC, deep);
  vec3 c = mix(deepC + pow(dot(n, L) * 0.4 + 0.6, 80.0) * waterC * 0.12, skyC, fres);
  c += waterC * (h - 0.6) * 0.3;
  float spec = pow(max(dot(reflect(-eye, n), L), 0.0), 60.0);
  c += vec3(spec * 2.7 * 0.15);
  spark = sparkles(uv, n);
  return pow(clamp(c, 0.0, 1.0), vec3(0.75));
}

void main() {
  vec2 p = vUv * uSize + uCam;
  vec2 m = p / uM;
  vec4 map = texture2D(uMap, clamp(p / uSize, 0.001, 0.999));

  // Grass: clumps, then long blades, then per-pixel grit.
  float clump = fbm(m * 0.55);
  float blade = noise(vec2(m.x * 3.2 + m.y * 1.1, m.y * 14.0 + noise(m * 0.8) * 3.0));
  float fine = noise(m * vec2(9.0, 26.0));
  vec3 grass = mix(vec3(0.16, 0.44, 0.12), vec3(0.36, 0.68, 0.17), clump);
  grass *= 0.72 + blade * 0.36 + fine * 0.16 + (hash(floor(p * 1.5)) - 0.5) * 0.14;
  grass *= 0.82 + 0.3 * smoothstep(0.25, 0.7, fbm(m * 1.7 + 4.0));
  grass = mix(grass, vec3(0.5, 0.68, 0.2), smoothstep(0.55, 0.8, fbm(m * 0.12 + 9.0)) * 0.4);

  // Path: pale, sun-bleached, with the lawn fraying over its edges.
  float edge = map.r + (noise(m * 1.1) - 0.5) * 0.2 + (noise(m * 4.0 + 7.0) - 0.5) * 0.1;
  float onPath = smoothstep(0.47, 0.55, edge);
  vec3 path = vec3(0.82, 0.8, 0.72) * (0.94 + noise(m * 3.0) * 0.06);
  path = mix(path * 0.93, path, smoothstep(0.55, 0.9, map.r));
  float verge = smoothstep(0.3, 0.5, map.r) * (1.0 - onPath);
  vec3 col = mix(grass, vec3(0.62, 0.6, 0.32), verge * 0.45);
  // Hexagonal pavers on the plaza, barely there.
  vec2 h = m * vec2(1.0, 1.1547) / 0.34;
  h.x += mod(floor(h.y), 2.0) * 0.5;
  vec2 hf = abs(fract(h) - 0.5);
  float grout = smoothstep(0.42, 0.5, max(hf.x, hf.y * 0.9 + hf.x * 0.3));
  path *= 1.0 - map.b * grout * 0.12;
  col = mix(col, path, onPath);

  // Pond.
  float depth = map.g;
  float wet = smoothstep(0.488, 0.512, depth + (noise(m * 1.6) - 0.5) * 0.03);
  float deep = smoothstep(0.5, 0.82, depth);
  float spark = 0.0;
  vec3 water = wet > 0.0 ? pondColor(m * 0.85, deep, spark) : vec3(0.0);
  // Clouds going over, seen in the water: soft and slow.
  float cloud = smoothstep(0.55, 0.8, fbm(m * vec2(0.07, 0.1) + vec2(uTime * 0.012, uTime * 0.004)));
  water = mix(water, vec3(0.8, 0.88, 0.9), cloud * 0.25);
  float bank = smoothstep(0.44, 0.5, depth) * (1.0 - wet);
  col = mix(col, vec3(0.1, 0.24, 0.12), bank * 0.75);

  // Light: the crowns' own silhouettes, cast along the sun, with sunflecks
  // opening inside them; people's and benches' shadows on top.
  float sh = texture2D(uCanopy, vUv).a;
  float light = 1.0 - sh * (1.0 - dapple(m) * 0.92);
  float shade = texture2D(uShade, vUv).a;
  // Figures stand above the ground's own shadows; only the trees shade them.
  float lightUp = light;
  light = min(light, 1.0 - shade * 0.82);
  vec3 sun = vec3(1.2, 1.14, 1.0), amb = vec3(0.24, 0.36, 0.66);
  vec3 lit = mix(amb, sun, light);

  vec3 ground = col * lit;
  // Water: the pond's own colour is final, so undo the tone curve for it;
  // tree shade still darkens it, and sparkles only flash in the sun.
  vec3 wt = clamp((water * 1.18 + vec3(0.0, 0.05, 0.05)) * mix(0.72, 1.0, light) + spark * light * 1.2, 0.0, 0.94);
  ground = mix(ground, -log(1.0 - wt) / 1.5, wet);

  // Figures and props, lit by the same sun.
  vec4 sp = texture2D(uSprites, vUv);
  ground = ground * (1.0 - sp.a) + sp.rgb * mix(amb * 1.1, sun, lightUp);

  // Smoke and glow: brighter where a sunbeam catches them.
  vec4 air = texture2D(uAir, vUv);
  ground = ground * (1.0 - air.a * 0.3) + air.rgb * mix(0.5, 1.25, light);

  // Leaves right in front of the lens, out of focus.
  vec4 fore = texture2D(uFore, vUv);
  ground = ground * (1.0 - fore.a) + fore.rgb * vec3(1.32, 1.26, 1.12);

  // Soft shoulder into the 8-bit buffer; the post pass does the rest.
  vec3 c = 1.0 - exp(-ground * 1.5);
  gl_FragColor = vec4(c, 1.0);
}`;

export const POST_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uScene;
uniform vec2 uRes;
uniform float uFocus, uSeed;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 px = 1.0 / uRes;
  // Miniature focus: a sharp band through the bench, soft above and below.
  float dy = abs(vUv.y - uFocus);
  float blur = smoothstep(0.28, 0.7, dy) * 2.2 ;
  vec3 c = texture2D(uScene, uv).rgb;
  float rot = hash(gl_FragCoord.xy) * 6.283;
  // Out of the sharp band only: a golden-angle disc of taps.
  if (blur > 0.25) {
    vec3 acc = c;
    for (int i = 1; i < 16; i++) {
      float fi = float(i), a = fi * 2.39996 + rot;
      acc += texture2D(uScene, uv + vec2(cos(a), sin(a)) * sqrt(fi / 15.0) * blur * px * 1.6).rgb;
    }
    c = acc / 16.0;
  }
  // Halation and a mist filter: every highlight spreads a little light
  // around itself, and the whole picture gets a faint veil of its own glow.
  vec3 bloom = vec3(0.0), veil = vec3(0.0);
  for (int i = 1; i < 12; i++) {
    float fi = float(i), a = fi * 2.39996 + rot;
    vec3 s = texture2D(uScene, uv + vec2(cos(a), sin(a)) * sqrt(fi / 11.0) * px * 26.0).rgb;
    bloom += max(s - 0.72, 0.0);
    veil += s;
  }
  c = mix(c, veil / 11.0, 0.12);
  c += bloom / 11.0 * vec3(1.0, 0.94, 0.88) * 1.3;

  // Grade: rich colour, ink-blue blacks, cream whites, warm highlights.
  float l0 = dot(c, vec3(0.3, 0.59, 0.11));
  c = clamp(mix(vec3(l0), c, 1.18), 0.0, 1.0);
  c = mix(vec3(0.04, 0.08, 0.18), vec3(1.0, 0.99, 0.95), c);
  float lum = dot(c, vec3(0.3, 0.59, 0.11));
  c += vec3(0.05, 0.04, 0.0) * smoothstep(0.6, 1.0, lum);
  // The sun is low in the west: a warm haze leaks in from that side.
  c += vec3(0.1, 0.085, 0.05) * smoothstep(0.8, 0.0, length((vUv - vec2(-0.05, 0.75)) * vec2(1.0, 0.8)));
  // Pastel leaks at the far corners, as if the light got into the camera.
  c += vec3(0.07, 0.03, 0.06) * smoothstep(0.55, 0.0, length(vUv - vec2(1.05, -0.05)));
  c += vec3(0.0, 0.05, 0.045) * smoothstep(0.5, 0.0, length(vUv - vec2(0.95, 1.05)));
  vec2 v = vUv - 0.5;
  c *= 1.0 - dot(v, v) * 0.12;
  float g = hash(gl_FragCoord.xy + uSeed) + hash(gl_FragCoord.xy * 1.37 - uSeed) - 1.0;
  c += g * mix(0.065, 0.035, lum);

  gl_FragColor = vec4(c, 1.0);
}`;
