import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { sfx } from "../../audio/sfx";
import type { FigureKind } from "./bands";
import { meadowFloor } from "./bands";
import { useClock } from "./clock";
import { figureGeometry } from "./paint";
import { pickSheep, rayToGround } from "./controls";
import {
  DUST_COUNT,
  MAX_SHEEP,
  SOUND_KINDS,
  drop,
  dustPose,
  moveDrag,
  pickUp,
  spawnSheep,
  stepMeadow,
  type MeadowWorld,
} from "./simulation";
import { meadowHoof, meadowLand } from "./sounds";
import { MEADOW_WIDTH, meadowTerrainHeight } from "./world";

const FIGURE_KINDS: FigureKind[] = ["sheep", "mill", "sails"];

function createDust() {
  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const alpha = new THREE.InstancedBufferAttribute(new Float32Array(DUST_COUNT), 1);
  alpha.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("dustFade", alpha);
  const material = new THREE.MeshStandardMaterial({
    color: "#c4b394",
    roughness: 1,
    flatShading: true,
    transparent: true,
    depthWrite: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float dustFade;\nvarying float vDustFade;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvDustFade = dustFade;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vDustFade;")
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.a *= vDustFade;");
  };
  const mesh = new THREE.InstancedMesh(geometry, material, DUST_COUNT);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = 0;
  return {
    mesh,
    alpha,
    pose: { x: 0, y: 0, z: 0, sx: 0, sy: 0, sz: 0, heading: 0, alpha: 0 },
    object: new THREE.Object3D(),
    dispose() {
      mesh.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}

function createHerdMeshes(world: MeadowWorld, paint: THREE.Material) {
  const meshes = new Map<FigureKind, THREE.InstancedMesh>(
    FIGURE_KINDS.map((kind) => {
      const count = kind === "sheep" ? MAX_SHEEP : world.members.filter((m) => m.member.kind === kind).length;
      const mesh = new THREE.InstancedMesh(figureGeometry(kind), paint, count);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.count = 0;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      return [kind, mesh];
    }),
  );
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 1.75, 32),
    new THREE.MeshBasicMaterial({
      color: "#fff4c5",
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;
  return {
    meshes,
    marker,
    tone: new THREE.Color(),
    dust: createDust(),
    matrix: new THREE.Matrix4(),
    position: new THREE.Vector3(),
    scale: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
    euler: new THREE.Euler(0, 0, 0, "YZX"),
  };
}

type PointerSession = { id: number; x: number; y: number; sheep: number };

/** Click grass/sheep to drop a sheep; drag a sheep to carry it (nearby sheep follow); drop onto another to stack. */
function attachHerdPointer({
  canvas,
  camera,
  world,
  groupRef,
  invalidate,
  onSpawn,
}: {
  canvas: HTMLCanvasElement;
  camera: THREE.Camera;
  world: MeadowWorld;
  groupRef: RefObject<THREE.Group | null>;
  invalidate: () => void;
  onSpawn: (count: number) => void;
}) {
  const raycaster = new THREE.Raycaster();
  const ray = new THREE.Ray();
  const inverse = new THREE.Matrix4();
  const pointer = new THREE.Vector2();
  const point = { x: 0, y: 0 };
  let hitSlop = 0;
  const cursor = canvas.style.cursor;
  const touchAction = canvas.style.touchAction;
  canvas.style.touchAction = "none";
  let session: PointerSession | null = null;

  /** Cast into meadow space; false outside the interactive centre of the frame. */
  const aim = (e: PointerEvent, lift = 0) => {
    const group = groupRef.current;
    if (!group) return false;
    const rect = canvas.getBoundingClientRect();
    hitSlop = ((e.pointerType === "touch" ? 8 : 5) * MEADOW_WIDTH) / rect.width;
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY + lift - rect.top) / rect.height;
    if (nx < 0.12 || nx > 0.88 || ny < 0.2 || ny > 0.8) return false;
    pointer.set(2 * nx - 1, 1 - 2 * ny);
    raycaster.setFromCamera(pointer, camera);
    ray.copy(raycaster.ray).applyMatrix4(inverse.copy(group.matrixWorld).invert());
    return true;
  };
  const sheepUnderRay = (skip = -1) => pickSheep(world, ray.origin, ray.direction, skip, hitSlop);
  const release = (id: number) => {
    if (canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id);
  };
  const cancel = () => {
    if (session) release(session.id);
    session = null;
    drop(world);
    canvas.style.cursor = cursor;
    invalidate();
  };
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || e.isPrimary === false || session || !aim(e)) return;
    session = { id: e.pointerId, x: e.clientX, y: e.clientY, sheep: sheepUnderRay() };
  };
  const onMove = (e: PointerEvent) => {
    if (!session) {
      canvas.style.cursor = aim(e) && sheepUnderRay() >= 0 ? "grab" : cursor;
      return;
    }
    if (e.pointerId !== session.id) return;
    const travel = Math.hypot(e.clientX - session.x, e.clientY - session.y);
    if (world.drag.index < 0 && travel > 5 && session.sheep >= 0 && pickUp(world, session.sheep)) {
      canvas.setPointerCapture?.(e.pointerId);
      canvas.style.cursor = "grabbing";
    }
    if (world.drag.index >= 0) {
      e.preventDefault();
      if (aim(e, 22)) {
        const carried = world.members[world.drag.index];
        if (rayToGround(ray.origin, ray.direction, point, 6 + 0.8 * carried.pose.sy)) moveDrag(world, point.x, point.y);
      }
      world.aimVisible = false;
      invalidate();
    } else if (travel > 7) {
      cancel();
    }
  };
  const onUp = (e: PointerEvent) => {
    if (!session || e.pointerId !== session.id) return;
    const start = session;
    session = null;
    release(e.pointerId);
    canvas.style.cursor = cursor;
    if (world.drag.index >= 0) {
      drop(world, aim(e) ? sheepUnderRay(world.drag.index) : -1);
      invalidate();
      return;
    }
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 7 || !aim(e)) return;
    if (start.sheep >= 0) {
      point.x = world.members[start.sheep].pose.x;
      point.y = world.members[start.sheep].pose.y;
    } else if (!rayToGround(ray.origin, ray.direction, point)) {
      return;
    }
    world.aimVisible = false;
    if (spawnSheep(world, point.x, point.y) >= 0) onSpawn(world.sheepCount);
    invalidate();
  };
  const onVisibility = () => {
    if (document.hidden) cancel();
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointercancel", cancel);
  canvas.addEventListener("pointerleave", cancel);
  window.addEventListener("blur", cancel);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    cancel();
    canvas.style.cursor = cursor;
    canvas.style.touchAction = touchAction;
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointercancel", cancel);
    canvas.removeEventListener("pointerleave", cancel);
    window.removeEventListener("blur", cancel);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

type HerdMeshes = ReturnType<typeof createHerdMeshes>;

/** Advance the simulation, then write dust, figures, marker and queued sounds for this frame. */
function renderHerd(
  herd: HerdMeshes,
  world: MeadowWorld,
  camera: THREE.Camera,
  group: THREE.Group | null,
  delta: number,
  still: boolean,
) {
  stepMeadow(world, delta, still);

  const dust = herd.dust;
  let live = 0;
  for (const particle of world.dust.particles) {
    if (particle.age < 0) continue;
    const p = dustPose(particle, dust.pose);
    dust.object.position.set(p.x, p.z, p.y);
    dust.object.scale.set(p.sx, p.sy, p.sz);
    dust.object.rotation.y = -p.heading;
    dust.object.updateMatrix();
    dust.mesh.setMatrixAt(live, dust.object.matrix);
    dust.alpha.setX(live, p.alpha);
    live += 1;
  }
  dust.mesh.count = live;
  dust.mesh.instanceMatrix.needsUpdate = true;
  dust.alpha.needsUpdate = true;

  const { matrix, position, scale, rotation, euler } = herd;
  for (const kind of SOUND_KINDS) {
    const cue = world.sound[kind];
    if (!cue.pending) continue;
    cue.pending = false;
    position.set(cue.x, meadowTerrainHeight(cue.x, cue.y), cue.y);
    if (group) position.applyMatrix4(group.matrixWorld);
    position.project(camera);
    const nx = (position.x + 1) / 2;
    if (kind === "splash") sfx.plop(nx, cue.strength);
    else if (kind === "land") meadowLand(nx, cue.strength);
    else meadowHoof(nx, cue.strength);
  }

  for (const { band, member, slot, pose } of world.members) {
    const mesh = herd.meshes.get(member.kind);
    if (!mesh) continue;
    if (slot >= mesh.count) {
      mesh.setColorAt(slot, herd.tone.set(member.tint ?? "#ffffff").multiplyScalar(member.shade));
      mesh.count = slot + 1;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    position.set(pose.x, meadowFloor(band, pose) + pose.z, pose.y);
    rotation.setFromEuler(euler.set(pose.roll, -pose.heading, pose.pitch));
    mesh.setMatrixAt(slot, matrix.compose(position, rotation, scale.set(pose.sx, pose.sy, pose.sz)));
  }
  for (const mesh of herd.meshes.values()) mesh.instanceMatrix.needsUpdate = true;

  herd.marker.visible = world.aimVisible;
  herd.marker.position.set(world.target.x, meadowTerrainHeight(world.target.x, world.target.y) + 0.2, world.target.y);
}

function disposeHerd(herd: HerdMeshes) {
  herd.dust.dispose();
  herd.marker.geometry.dispose();
  herd.marker.material.dispose();
  for (const mesh of herd.meshes.values()) {
    mesh.geometry.dispose();
    mesh.dispose();
  }
}

export function Herd({
  world,
  still,
  paint,
  onSpawn,
}: {
  world: MeadowWorld;
  still: boolean;
  paint: THREE.Material;
  onSpawn: (count: number) => void;
}) {
  const { gl, camera, invalidate } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const herd = useMemo(() => createHerdMeshes(world, paint), [world, paint]);

  useEffect(
    () => attachHerdPointer({ canvas: gl.domElement, camera, world, groupRef, invalidate, onSpawn }),
    [camera, gl, invalidate, onSpawn, world],
  );
  useEffect(() => () => disposeHerd(herd), [herd]);
  useClock((_elapsed, delta) => renderHerd(herd, world, camera, groupRef.current, delta, still));

  return (
    <group ref={groupRef}>
      <primitive object={herd.dust.mesh} dispose={null} />
      <primitive object={herd.marker} dispose={null} />
      {[...herd.meshes].map(([kind, mesh]) => (
        <primitive key={kind} object={mesh} dispose={null} />
      ))}
    </group>
  );
}
