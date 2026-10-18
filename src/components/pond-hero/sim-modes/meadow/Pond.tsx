import { useEffect, useMemo } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { sfx } from "../../audio/sfx";
import { useClock } from "./clock";
import { NOISE_GLSL } from "./noise";
import { MEADOW_BREEZE_GLSL, REFLECTION_DETAIL_KEY } from "./shaders";
import { addRing, type MeadowWorld } from "./simulation";
import { MEADOW_POND, POND_RIPPLE_GLSL, SUN_OFFSET, meadowTerrainHeight, pondEdge, pondRadius } from "./world";

const WATER_VERTEX = /* glsl */ `
  uniform mat4 textureMatrix;
  varying vec2 place;
  varying float shore;
  varying vec4 reflectionUv;
  varying vec3 eye, up, east, north, sun;
  attribute float radius;
  void main() {
    place = vec2(${MEADOW_POND.x.toFixed(1)} + position.x, ${MEADOW_POND.y.toFixed(1)} - position.y);
    shore = radius;
    reflectionUv = textureMatrix * vec4(position, 1.);
    vec4 view = modelViewMatrix * vec4(position, 1.);
    eye = -view.xyz;
    up = normalize(normalMatrix * vec3(0., 0., 1.));
    east = normalize(normalMatrix * vec3(1., 0., 0.));
    north = normalize(normalMatrix * vec3(0., -1., 0.));
    sun = normalize((modelViewMatrix * vec4(${SUN_OFFSET[0].toFixed(1)}, ${(-SUN_OFFSET[2]).toFixed(1)}, ${SUN_OFFSET[1].toFixed(1)}, 0.)).xyz);
    gl_Position = projectionMatrix * view;
  }
`;

const WATER_FRAGMENT = /* glsl */ `
  uniform float time, calm;
  uniform vec4 ripples[12];
  uniform sampler2D tDiffuse;
  uniform vec3 deep, bank, sky;
  varying vec2 place;
  varying float shore;
  varying vec4 reflectionUv;
  varying vec3 eye, up, east, north, sun;
  ${NOISE_GLSL}
  ${POND_RIPPLE_GLSL}
  // Rotated octaves, as in /waves, scaled down for a sheltered patch of water.
  float surface(vec2 p) {
    float h = 0., amplitude = .11;
    vec2 uv = p * .48;
    for (int octave = 0; octave < 3; octave++) {
      vec2 flow = uv + vec2(time * .16, -time * .09);
      vec2 fold = 1. - abs(sin(flow + noise(flow) * .6));
      h += (noise(flow) * .55 + pow(max(.001,fold.x * fold.y),.65) * .9) * amplitude;
      uv = mat2(1.6, 1.2, -1.2, 1.6) * uv;
      amplitude *= .32;
    }
    for (int i = 0; i < 12; i++) {
      float age = time - ripples[i].z;
      float d = distance(p, ripples[i].xy);
      h += pondRipple(d, age) * cos(d * 5.5 - age * 8.) * ripples[i].w * .16 * (1. - calm);
    }
    return h;
  }
  void main() {
    float depth = max(0., 1.1 * (1. - shore * shore));
    float h = surface(place), eps = .15;
    vec2 slope = vec2(h - surface(place + vec2(eps,0.)), h - surface(place + vec2(0.,eps))) / eps;
    float sheltered = smoothstep(0., .4, depth);
    vec3 n = normalize(up + (slope.x * east + slope.y * north) * sheltered * 1.7);
    vec3 view = normalize(eye);
    float fresnel = .10 + .55 * pow(1. - max(0., dot(n,view)),3.);
    vec2 reflectedUv = reflectionUv.xy / reflectionUv.w + slope * .004 * sheltered;
    vec4 reflected = texture2D(tDiffuse, clamp(reflectedUv, vec2(.002), vec2(.998)));
    vec3 reflection = mix(sky, reflected.rgb, reflected.a);
    vec3 bed = mix(bank, deep, smoothstep(.02, .72, depth));
    float caustic = pow(max(0.,1. - abs(noise(place * 1.8 + time * .12) + noise(place * 2.3 - time * .08))),9.);
    bed += vec3(.12,.22,.20) * caustic * .16 * (1. - smoothstep(.25,1.,depth));
    vec3 water = mix(bed, reflection, fresnel);
    float spec = pow(max(0., dot(reflect(-normalize(sun),n),view)),38.);
    water += vec3(1.,.86,.63) * spec * 1.6;
    water += h * vec3(.06,.12,.10);
    float alpha = mix(.76,.94,smoothstep(0.,.7,depth)) * (1. - smoothstep(.992,1.,shore));
    gl_FragColor = vec4(max(water,vec3(0.)),alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

type WaterUniforms = {
  time: { value: number };
  calm: { value: number };
  ripples: { value: THREE.Vector4[] };
};

function buildPond() {
  const { x: px, y: py, rx, ry, level } = MEADOW_POND;
  const surfaceY = level + 0.035;
  const positions = [px, surfaceY, py];
  const radii = [0];
  const indices: number[] = [];
  for (let k = 0; k <= 128; k++) {
    const a = (k / 128) * Math.PI * 2;
    const edge = 1.007 * pondEdge(a);
    positions.push(px + Math.cos(a) * rx * edge, surfaceY, py + Math.sin(a) * ry * edge);
    radii.push(1);
    if (k) indices.push(0, k + 1, k);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("radius", new THREE.Float32BufferAttribute(radii, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.translate(-px, -surfaceY, -py).rotateX(Math.PI / 2);

  const water = new Reflector(geometry, {
    textureWidth: 384,
    textureHeight: 384,
    multisample: 0,
    clipBias: 0.001,
    shader: {
      name: "MeadowPond",
      uniforms: {
        color: { value: new THREE.Color() },
        tDiffuse: { value: null },
        textureMatrix: { value: new THREE.Matrix4() },
        time: { value: 0 },
        calm: { value: 0 },
        ripples: { value: Array.from({ length: 12 }, () => new THREE.Vector4(0, 0, -100, 0)) },
        deep: { value: new THREE.Color("#164c43") },
        bank: { value: new THREE.Color("#4a8071") },
        sky: { value: new THREE.Color("#aecbd1") },
      },
      vertexShader: WATER_VERTEX,
      fragmentShader: WATER_FRAGMENT,
    },
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(px, surfaceY, py);
  const material = water.material as THREE.ShaderMaterial;
  material.transparent = true;
  material.depthWrite = false;
  const uniforms = material.uniforms as unknown as WaterUniforms;

  // Re-render the reflection at most ~15 fps unless the camera moves, hiding fine grass from it.
  const renderReflection = water.onBeforeRender;
  const lastCamera = new THREE.Matrix4();
  const lastProjection = new THREE.Matrix4();
  const lastWater = new THREE.Matrix4();
  const hidden: THREE.Object3D[] = [];
  let lastTime = -Infinity;
  water.onBeforeRender = function (renderer, scene, camera, geom, mat, group) {
    if (scene.overrideMaterial) return;
    const now = uniforms.time.value;
    const moved =
      !lastCamera.equals(camera.matrixWorld) ||
      !lastProjection.equals(camera.projectionMatrix) ||
      !lastWater.equals(this.matrixWorld);
    if (uniforms.calm.value || moved || !(now >= lastTime) || !(now - lastTime < 0.06666566666666666)) {
      lastTime = now;
      lastCamera.copy(camera.matrixWorld);
      lastProjection.copy(camera.projectionMatrix);
      lastWater.copy(this.matrixWorld);
      scene.traverse((o) => {
        if (o.visible && o.userData[REFLECTION_DETAIL_KEY]) {
          hidden.push(o);
          o.visible = false;
        }
      });
      try {
        renderReflection.call(this, renderer, scene, camera, geom, mat, group);
      } finally {
        for (const o of hidden) o.visible = true;
        hidden.length = 0;
      }
    }
  };

  const reeds: THREE.BufferGeometry[] = [];
  const stones: THREE.BufferGeometry[] = [];
  const withRoot = (g: THREE.BufferGeometry, root: number) =>
    g.setAttribute(
      "root",
      new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute("position").count).fill(root), 1),
    );
  for (let k = 0; k < 95; k++) {
    const a = k < 66 ? 0.15 + (k / 65) * 1.6 : 3.3 + ((k - 66) / 28) * 0.7;
    const edge = pondEdge(a) * (1.055 + (0.5 * Math.sin(7.3 * k) + 0.5) * 0.14);
    const x = px + Math.cos(a) * rx * edge;
    const y = py + Math.sin(a) * ry * edge;
    const root = meadowTerrainHeight(x, y);
    const height = 1.4 + (0.5 * Math.sin(4.1 * k) + 0.5) * 2.2;
    const blade = new THREE.ConeGeometry(0.17, height, 3).translate(0, height / 2, 0);
    blade.rotateZ(0.16 * Math.sin(1.7 * k));
    blade.translate(x, root, y);
    reeds.push(withRoot(blade, root));
    if (k % 4 === 0) {
      const head = new THREE.CylinderGeometry(0.07, 0.07, 0.38, 5).translate(0, height - 0.22, 0);
      head.rotateZ(0.16 * Math.sin(1.7 * k));
      head.translate(x, root, y);
      reeds.push(withRoot(head, root));
    }
  }
  for (const [a, size] of [
    [2.4, 0.9],
    [2.55, 0.65],
    [2.7, 0.5],
    [5.3, 0.8],
    [5.45, 0.55],
  ]) {
    const edge = 1.12 * pondEdge(a);
    const x = px + Math.cos(a) * rx * edge;
    const y = py + Math.sin(a) * ry * edge;
    stones.push(
      new THREE.IcosahedronGeometry(size, 1)
        .scale(1.5, 0.65, 1)
        .rotateY(a)
        .translate(x, meadowTerrainHeight(x, y) + 0.15, y),
    );
  }
  const flatStones = stones.map((g) => (g.index ? g.toNonIndexed() : g.clone()));
  const reedGeometry = mergeGeometries(reeds);
  const stoneGeometry = mergeGeometries(flatStones);
  flatStones.forEach((g) => g.dispose());
  reeds.forEach((g) => g.dispose());
  stones.forEach((g) => g.dispose());
  const reedMaterial = new THREE.MeshLambertMaterial({ color: "#84904d", side: THREE.DoubleSide });
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: "#918772", roughness: 1 });
  reedMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.pondTime = uniforms.time;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float pondTime;\nattribute float root;\n" + MEADOW_BREEZE_GLSL)
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed = vec3(position);
        transformed.x += .15 * meadowBreeze(position.xz, pondTime) * max(0., position.y - root);`,
      );
  };
  return {
    water,
    reedGeometry,
    reedMaterial,
    stoneGeometry,
    stoneMaterial,
    setCalm(calm: boolean) {
      uniforms.calm.value = +calm;
    },
    /** Mirror the simulation clock and ripple rings into the water shader. */
    sync(world: MeadowWorld) {
      uniforms.time.value = world.time;
      const ripples = uniforms.ripples.value;
      for (let i = 0; i < ripples.length; i++) {
        const ring = world.water.rings[i];
        ripples[i].set(ring.x, ring.y, ring.at, ring.amplitude);
      }
    },
    dispose() {
      geometry.dispose();
      water.dispose();
      reedGeometry.dispose();
      reedMaterial.dispose();
      stoneGeometry.dispose();
      stoneMaterial.dispose();
    },
  };
}

/** Ripple + plop where the water was tapped (ignores drags and taps on the bank). */
function tapPond(e: ThreeEvent<MouseEvent>, world: MeadowWorld, still: boolean, canvas: HTMLCanvasElement) {
  if (e.delta > 7) return false;
  const local = e.object.worldToLocal(e.point.clone());
  const x = MEADOW_POND.x + local.x;
  const y = MEADOW_POND.y - local.y;
  if (pondRadius(x, y) > 0.98) return false;
  if (!still) addRing(world.water, x, y, world.time, 0.32);
  const rect = canvas.getBoundingClientRect();
  sfx.plop(Math.max(0, Math.min(1, (e.nativeEvent.clientX - rect.left) / rect.width)), 0.08);
  return true;
}

/** Reflective pond; tapping the water sends a ripple. */
export function Pond({ still, world }: { still: boolean; world: MeadowWorld }) {
  const pond = useMemo(() => buildPond(), []);
  const { gl, invalidate } = useThree();
  useEffect(() => pond.setCalm(still), [pond, still]);
  useClock(() => pond.sync(world));
  useEffect(() => () => pond.dispose(), [pond]);
  const onTap = (e: ThreeEvent<MouseEvent>) => {
    if (tapPond(e, world, still, gl.domElement)) invalidate();
  };

  return (
    <>
      <primitive object={pond.water} onClick={onTap} dispose={null} />
      <mesh geometry={pond.reedGeometry} material={pond.reedMaterial} receiveShadow />
      <mesh geometry={pond.stoneGeometry} material={pond.stoneMaterial} receiveShadow castShadow />
    </>
  );
}
