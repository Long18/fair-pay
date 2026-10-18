import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useClock } from "./clock";
import { grainTile } from "./noise";
import { MEADOW_BREEZE_GLSL, MEADOW_GRASS_GLSL } from "./shaders";
import {
  MEADOW_BOUNDS,
  MEADOW_CENTER,
  MEADOW_POND,
  PATH_FIELD,
  SUN_OFFSET,
  meadowAxis,
  meadowGrass,
  meadowPathField,
  meadowTerrainHeight,
  pondAxis,
  type PathSample,
} from "./world";

const PAINT_SIZE = 768;
const AMBIENT = [0.61, 0.72, 0.87];
const SUN = [1.34, 1.13, 0.72];
const SUN_LENGTH = Math.hypot(...SUN_OFFSET);

/** Bake sky + sun + occlusion into the grass colour so the ground needs no live lighting. */
function lightAt(normal: [number, number, number], occlusion: number, out: number[]) {
  const len = Math.hypot(...normal);
  const sun = Math.max(0, normal.reduce((sum, v, i) => sum + v * SUN_OFFSET[i], 0) / (len * SUN_LENGTH));
  for (let c = 0; c < 3; c++) out[c] = AMBIENT[c] * occlusion + SUN[c] * sun;
}

function buildTerrain(path: PathSample[] | undefined, earthColor: string | undefined, cropColor: string | undefined) {
  const { left, top, width, height } = MEADOW_BOUNDS;
  const xs = pondAxis(meadowAxis(left, left + width, MEADOW_CENTER.x), MEADOW_POND.x, MEADOW_POND.rx);
  const ys = pondAxis(meadowAxis(top, top + height, MEADOW_CENTER.y), MEADOW_POND.y, MEADOW_POND.ry);
  const geometry = new THREE.PlaneGeometry(width, height, xs.length - 1, ys.length - 1).rotateX(-Math.PI / 2);
  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  for (let row = 0; row < ys.length; row += 1) {
    for (let col = 0; col < xs.length; col += 1) {
      const i = row * xs.length + col;
      const x = xs[col];
      const y = ys[row];
      position.setXYZ(i, x, meadowTerrainHeight(x, y), y);
      uv.setXY(i, (x - left) / width, 1 - (y - top) / height);
    }
  }
  geometry.computeVertexNormals();

  const n = PAINT_SIZE;
  const last = n - 1;
  const pixels = new Uint8Array(n * n * 4);
  const pigment = [0, 0, 0];
  const light = [0, 0, 0];
  const heights = new Float32Array(n * n);
  const cellX = width / last;
  const cellY = height / last;
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) heights[n * row + col] = meadowTerrainHeight(left + col * cellX, top + row * cellY);
  }
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      const x = left + (col / last) * width;
      const y = top + (row / last) * height;
      const h = heights[n * row + col];
      meadowGrass(x, y, h, pigment);
      const c0 = Math.max(0, col - 1);
      const c1 = Math.min(last, col + 1);
      const r0 = Math.max(0, row - 1);
      const r1 = Math.min(last, row + 1);
      const rim =
        Math.max(0, heights[n * row + Math.max(0, col - 8)] - h) +
        Math.max(0, heights[n * row + Math.min(last, col + 8)] - h) +
        Math.max(0, heights[n * Math.max(0, row - 8) + col] - h) +
        Math.max(0, heights[n * Math.min(last, row + 8) + col] - h);
      const occlusion = 1 - Math.min(0.24, (0.85 * rim) / (((8 * (cellX + cellY)) / 2) * 4));
      lightAt(
        [
          (heights[n * row + c0] - heights[n * row + c1]) / ((c1 - c0) * cellX),
          1,
          (heights[n * r0 + col] - heights[n * r1 + col]) / ((r1 - r0) * cellY),
        ],
        occlusion,
        light,
      );
      const o = (n * row + col) * 4;
      for (let c = 0; c < 3; c += 1) pixels[o + c] = Math.min(255, Math.round(pigment[c] * light[c]));
      pixels[o + 3] = 255;
    }
  }
  const painting = new THREE.DataTexture(pixels, n, n, THREE.RGBAFormat);
  painting.flipY = true;
  painting.colorSpace = THREE.SRGBColorSpace;
  painting.magFilter = THREE.LinearFilter;
  painting.minFilter = THREE.LinearMipmapLinearFilter;
  painting.generateMipmaps = true;
  painting.needsUpdate = true;

  const grain = new THREE.DataTexture(new Uint8Array(grainTile(256).buffer), 256, 256, THREE.RGBAFormat);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.magFilter = THREE.LinearFilter;
  grain.minFilter = THREE.LinearMipmapLinearFilter;
  grain.generateMipmaps = true;
  grain.needsUpdate = true;

  const pathWear = new THREE.DataTexture(meadowPathField(path), PATH_FIELD.size, PATH_FIELD.size, THREE.RedFormat);
  pathWear.magFilter = pathWear.minFilter = THREE.LinearFilter;
  pathWear.needsUpdate = true;

  const time = { value: 0 };
  const material = new THREE.MeshBasicMaterial({ map: painting, toneMapped: false });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.meadowTime = time;
    shader.uniforms.pathWear = { value: pathWear };
    shader.uniforms.grainMap = { value: grain };
    shader.uniforms.sunOffset = { value: new THREE.Vector3(...SUN_OFFSET) };
    shader.uniforms.pathEarth = { value: new THREE.Color(earthColor ?? "#000000") };
    shader.uniforms.cropPigment = { value: new THREE.Color(cropColor ?? "#000000") };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform sampler2D grainMap;\nuniform sampler2D pathWear;\nuniform vec3 sunOffset;\nuniform vec3 pathEarth;\nuniform vec3 cropPigment;\nuniform float meadowTime;\n" +
          MEADOW_BREEZE_GLSL,
      )
      .replace(
        "#include <map_fragment>",
        `
        vec2 place = vMapUv * vec2(${width.toFixed(1)}, ${height.toFixed(1)});
        float pixelUnits = max(fwidth(place.x), fwidth(place.y));
        vec3 paint = texture2D(map, vMapUv).rgb;
        vec4 fine = texture2D(grainMap, place / 36.);
        vec4 finer = texture2D(grainMap, place / 11. + .53);
        vec4 broad = texture2D(grainMap, place / 190. + .31);
        vec2 world = vec2(${left.toFixed(1)}, ${top.toFixed(1)}) + vec2(vMapUv.x, 1. - vMapUv.y) * vec2(${width.toFixed(1)}, ${height.toFixed(1)});
        vec2 pathUv = (world - vec2(${PATH_FIELD.left.toFixed(1)}, ${PATH_FIELD.top.toFixed(1)})) / vec2(${PATH_FIELD.width.toFixed(1)}, ${PATH_FIELD.height.toFixed(1)});
        float wear = texture2D(pathWear, pathUv).r * (.62 + fine.g * .24 + finer.r * .28);
        // The same already-lit pigment becomes worn earth; never light a separate ribbon on top.
        float light = dot(paint, vec3(.2126, .7152, .0722));
        if (dot(cropPigment, vec3(1.)) > .01) paint = mix(paint, cropPigment * light * 4.5, .92);
        vec3 earth = vec3(1.48, 1.19, .62) * light;
        if (dot(pathEarth, vec3(1.)) > .01) earth = pathEarth * (.4 + light * 3.);
        paint = mix(paint, earth, wear * .88);
        ${MEADOW_GRASS_GLSL}
        // Soil remains granular where feet have worn down most of the grass tufts.
        float soilGrain = texture2D(grainMap, place / 4.3 + .61).r - .5;
        paint *= 1. + wear * soilGrain * .14;
        diffuseColor *= vec4(paint, 1.);
      `,
      );
  };
  return {
    geometry,
    material,
    painting,
    grain,
    pathWear,
    setTime(t: number) {
      time.value = t;
    },
  };
}

/** Painted rolling ground with worn footpath, plus a transparent shadow catcher on top. */
export function Terrain({ path, earthColor, cropColor }: { path?: PathSample[]; earthColor?: string; cropColor?: string }) {
  const terrain = useMemo(() => buildTerrain(path, earthColor, cropColor), [path, earthColor, cropColor]);
  useClock(terrain.setTime);
  useEffect(
    () => () => {
      terrain.geometry.dispose();
      terrain.material.dispose();
      terrain.painting.dispose();
      terrain.grain.dispose();
      terrain.pathWear.dispose();
    },
    [terrain],
  );
  return (
    <>
      <mesh geometry={terrain.geometry} material={terrain.material} />
      <mesh geometry={terrain.geometry} position={[0, 0.015, 0]} receiveShadow>
        <shadowMaterial color="#24384b" transparent opacity={0.43} depthWrite={false} />
      </mesh>
    </>
  );
}
