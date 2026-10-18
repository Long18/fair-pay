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
  float choppy = 4.0;
  float h = 0.0;

  for (int i = 0; i < 5; i++) {
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

vec3 getNormal(vec2 uv, float eps) {
  float h  = getHeight(uv);
  float hx = getHeight(uv + vec2(eps, 0.0));
  float hy = getHeight(uv + vec2(0.0, eps));
  return normalize(vec3(h - hx, eps * 8.0, h - hy));
}

float ripple(vec2 pos, vec2 center, float time, float dropTime) {
  float age = time - dropTime;
  if (age < 0.0 || age > 4.0) return 0.0;

  float eps = 0.04;
  float hc = getHeight(pos);
  float hx = getHeight(pos + vec2(eps, 0.0));
  float hy = getHeight(pos + vec2(0.0, eps));
  vec2 grad = vec2(hx - hc, hy - hc) / eps;

  vec2 diff = pos - center + grad * 1.2;
  float n = noise(pos * 3.0 + time * 0.5) * 0.15;
  diff += vec2(n, -n);

  float dist = length(diff);
  float speedMod = 1.0 + hc * 0.3;
  float wavefront = age * 4.5 * speedMod;
  float envelope = exp(-pow(dist - wavefront, 2.0) / 1.5);
  float decay = exp(-age * 1.4);

  return 0.45 * envelope * decay * cos(dist * 5.0 - time * 6.0);
}
`;

const WATER_COLOR_GLSL = `
vec3 getWaterColor(vec2 uv, vec3 normal, float height) {
  vec3 deepColor = u_water_deep;
  vec3 waterColor = u_water_mid;
  vec3 skyColor = u_water_sky;

  vec3 lightDir = normalize(vec3(0.4, 0.7, 0.3));
  vec3 eye = vec3(0.0, 1.0, 0.0);

  float fresnel = 1.0 - max(dot(normal, eye), 0.0);
  fresnel = clamp(pow(fresnel, 3.0) * 0.65, 0.0, 1.0);

  float diff = pow(dot(normal, lightDir) * 0.4 + 0.6, 80.0);
  vec3 refracted = deepColor + diff * waterColor * 0.12;

  vec3 color = mix(refracted, skyColor, fresnel);
  color += waterColor * (height - 0.6) * 0.18;

  vec3 refl = reflect(-eye, normal);
  float spec = pow(max(dot(refl, lightDir), 0.0), 60.0);
  float nrm = (60.0 + 8.0) / (3.14159 * 8.0);
  color += vec3(spec * nrm * 0.15);

  return color;
}
`;

const POND_MASK_GLSL = `
float pondEdgeDist(vec2 fragPx, vec2 res) {
  float margin = 0.05 * min(res.x, res.y);
  vec2 halfSize = res * 0.5 - margin;
  vec2 p = fragPx - res * 0.5;
  float cornerR = 0.28 * min(halfSize.x, halfSize.y);
  vec2 q = abs(p) - halfSize + cornerR;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - cornerR;
}
`;

const MAIN_GLSL = `
void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 res = u_resolution;
  if (pondEdgeDist(px, res) > 0.0) discard;
  px.y = res.y - px.y;

  float scale = 30.0;
  vec2 uv = (px / min(res.x, res.y)) * scale;

  float height = getHeight(uv);

  for (int i = 0; i < 12; i++) {
    vec2 mouseUV = (u_ripples[i].xy / min(res.x, res.y)) * scale;
    float dropTime = u_ripples[i].z;
    float amp = u_ripples[i].w;
    height += ripple(uv, mouseUV, u_time, dropTime) * amp;
  }

  vec3 normal = getNormal(uv, 0.01);
  vec3 color = getWaterColor(uv, normal, height);
  // Height tint / ripples can push channels below zero; fractional pow is undefined.
  color = pow(max(color, vec3(0.0)), vec3(0.75));
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

export const VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = `
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec4 u_ripples[12];
uniform vec3 u_water_deep;
uniform vec3 u_water_mid;
uniform vec3 u_water_sky;

${NOISE_GLSL}
${SEA_GLSL}
${WATER_COLOR_GLSL}
${POND_MASK_GLSL}
${MAIN_GLSL}
`;
