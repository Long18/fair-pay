import { useEffect, useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Rgb } from "../shared/sim-frame";
import { MeadowEffects } from "./Effects";
import { Flowers } from "./Flowers";
import { Herd } from "./Herd";
import { Lilies } from "./Lilies";
import { createPaintMaterial } from "./paint";
import { Pond } from "./Pond";
import type { MeadowWorld } from "./simulation";
import { Terrain } from "./Terrain";
import { Trees } from "./Trees";
import { Verge } from "./Verge";
import { Walls } from "./Walls";
import { MEADOW_CENTER, MEADOW_WIDTH, SUN_OFFSET, meadowRig, type CameraRig } from "./world";

function aimCamera(camera: THREE.Camera, rig: CameraRig) {
  const lens = camera as THREE.PerspectiveCamera;
  lens.fov = rig.fov;
  lens.near = 0.05 * rig.distance;
  lens.far = 20 * rig.distance;
  lens.position.set(0, 0, rig.distance);
  lens.lookAt(0, 0, 0);
  lens.updateProjectionMatrix();
}

/** Soft studio reflections for the painted figures. */
function installEnvironment(gl: THREE.WebGLRenderer, scene: THREE.Scene) {
  const pmrem = new THREE.PMREMGenerator(gl);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.2;
  return () => {
    scene.environment = null;
    env.dispose();
    room.dispose();
    pmrem.dispose();
  };
}

export function MeadowScene({
  still,
  world,
  backdrop,
  onSpawn,
}: {
  still: boolean;
  world: MeadowWorld;
  backdrop: Rgb;
  onSpawn: (count: number) => void;
}) {
  const { camera, gl, scene, size, invalidate } = useThree();
  const rig = useMemo(() => meadowRig(size), [size]);
  const sunTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.set(MEADOW_CENTER.x, 0, MEADOW_CENTER.y);
    return target;
  }, []);
  const paint = useMemo(() => createPaintMaterial(), []);
  useEffect(() => () => paint.dispose(), [paint]);

  useLayoutEffect(() => {
    aimCamera(camera, rig);
    invalidate();
  }, [camera, invalidate, rig]);

  useEffect(() => {
    gl.setClearColor(new THREE.Color().setRGB(backdrop.r / 255, backdrop.g / 255, backdrop.b / 255, THREE.SRGBColorSpace), 1);
    invalidate();
  }, [backdrop, gl, invalidate]);

  useEffect(() => installEnvironment(gl, scene), [gl, scene]);

  const [sx, sy, sz] = SUN_OFFSET;
  const span = 0.8 * MEADOW_WIDTH * rig.scale;
  return (
    <>
      <hemisphereLight args={["#b8cee0", "#796044", 0.58]} />
      <group rotation={[rig.turn, 0, 0]} scale={rig.scale}>
        <group position={[-rig.pivot.x, 0, -rig.pivot.y]}>
          <primitive object={sunTarget} />
          <directionalLight
            position={[MEADOW_CENTER.x + sx, sy, MEADOW_CENTER.y + sz]}
            target={sunTarget}
            intensity={3.4}
            color="#ffe0ac"
            castShadow
            shadow-radius={5}
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-2e-4}
            shadow-normalBias={0.02}
            shadow-camera-left={-span}
            shadow-camera-right={span}
            shadow-camera-top={span}
            shadow-camera-bottom={-span}
            shadow-camera-near={1}
            shadow-camera-far={Math.hypot(sx, sy, sz) * rig.scale * 2.5}
          />
          <Terrain earthColor="#a28b68" />
          <Pond still={still} world={world} />
          <Lilies world={world} still={still} />
          <Verge />
          <Trees />
          <Walls paint={paint} />
          <Flowers world={world} />
          <Herd world={world} still={still} paint={paint} onSpawn={onSpawn} />
        </group>
      </group>
      <MeadowEffects still={still} />
    </>
  );
}
