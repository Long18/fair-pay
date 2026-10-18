import { memo, useEffect, useMemo } from "react";
import { EffectComposer, N8AO, SMAA, ToneMapping } from "@react-three/postprocessing";
import { Effect, GaussianBlurPass, Resolution, ToneMappingMode } from "postprocessing";
import * as THREE from "three";

/** Blur strength by distance from the top of the frame: soft sky band, sharp middle, soft foreground. */
const FOCUS_STOPS: [number, number][] = [
  [0, 1],
  [0.22, 0.55],
  [0.42, 0],
  [0.8, 0],
  [1, 0.7],
];

const glslFloat = (v: number) => (Number.isInteger(v) ? `${v}.0` : `${v}`);

function focusMaskGlsl(name = "focusBand") {
  const pieces = FOCUS_STOPS.slice(1).map(([y, v], i) => {
    const [y0, v0] = FOCUS_STOPS[i];
    return `if (y <= ${glslFloat(y)}) return mix(${glslFloat(v0)}, ${glslFloat(v)}, (y - ${glslFloat(y0)}) / ${glslFloat(y - y0)});`;
  });
  return `float ${name}(float fromTop) { float y = clamp(fromTop, 0.0, 1.0); ${pieces.join(" ")} return ${glslFloat(FOCUS_STOPS[FOCUS_STOPS.length - 1][1])}; }`;
}

function focusKernel(pixelRatio: number) {
  const sigma = (5 * pixelRatio) / 2;
  return { kernelSize: Math.max(3, 2 * Math.round((4 * sigma * sigma - 3 - 1) / 2) + 1), scale: 2 };
}

const FOCUS_FRAGMENT = /* glsl */ `
#ifdef FRAMEBUFFER_PRECISION_HIGH
uniform mediump sampler2D map;
#else
uniform lowp sampler2D map;
#endif
uniform float open;
${focusMaskGlsl()}
vec3 focusEncode(vec3 light) { return mix(light * 12.92, 1.055 * pow(light, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), light)); }
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec4 blurred = texture2D(map, uv);
  // Mid-flight the lens opens and the whole frame softens (focus-blur's rackOpen); at rest, only the bands.
  outputColor = mix(inputColor, vec4(focusEncode(max(blurred.rgb, 0.0)), blurred.a), max(focusBand(1.0 - uv.y), open));
}`;

/** Runtime fields the postprocessing typings omit. */
type BlurPass = GaussianBlurPass & { blurMaterial: { kernelSize: number; scale: number } };

/** Tilt-shift: a half-res gaussian of the frame mixed in by vertical band. */
class FocusEffect extends Effect {
  renderTarget: THREE.WebGLRenderTarget;
  blurPass: BlurPass;
  resolution: Resolution;
  pixelRatio = 0;

  constructor() {
    super("FocusEffect", FOCUS_FRAGMENT, {
      uniforms: new Map<string, THREE.Uniform>([
        ["map", new THREE.Uniform(null)],
        ["open", new THREE.Uniform(0)],
      ]),
    });
    this.inputColorSpace = THREE.SRGBColorSpace;
    this.renderTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
    this.renderTarget.texture.name = "Focus.Target";
    this.uniforms.get("map")!.value = this.renderTarget.texture;
    this.blurPass = new GaussianBlurPass({ kernelSize: focusKernel(1).kernelSize, resolutionScale: 0.5 }) as BlurPass;
    this.resolution = new Resolution(this, Resolution.AUTO_SIZE, Resolution.AUTO_SIZE, 0.5);
    this.resolution.addEventListener("change", () => this.setSize(this.resolution.baseWidth, this.resolution.baseHeight));
  }

  override update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget) {
    this.uniforms.get("open")!.value = 0;
    const ratio = renderer.getPixelRatio();
    if (ratio !== this.pixelRatio) {
      this.pixelRatio = ratio;
      const { kernelSize, scale } = focusKernel(ratio);
      this.blurPass.blurMaterial.kernelSize = kernelSize;
      this.blurPass.blurMaterial.scale = scale;
    }
    this.blurPass.render(renderer, inputBuffer, this.renderTarget);
  }

  override setSize(width: number, height: number) {
    this.resolution.setBaseSize(width, height);
    this.renderTarget.setSize(this.resolution.width, this.resolution.height);
    this.blurPass.setSize(width, height);
  }

  override initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    this.blurPass.initialize(renderer, alpha, frameBufferType);
    if (frameBufferType !== undefined) {
      this.renderTarget.texture.type = frameBufferType as THREE.TextureDataType;
      if (frameBufferType === THREE.UnsignedByteType && renderer?.outputColorSpace === THREE.SRGBColorSpace) {
        this.renderTarget.texture.colorSpace = THREE.SRGBColorSpace;
      }
    }
  }
}

function Focus() {
  const effect = useMemo(() => new FocusEffect(), []);
  useEffect(() => () => effect.dispose(), [effect]);
  return <primitive object={effect} dispose={null} />;
}

type AoPass = { autoDetectTransparency: boolean; configuration: { transparencyAware: boolean } };

/** The scene has no transparent occluders worth the extra AO pass. */
function disableTransparencyAo(pass: AoPass | null) {
  if (!pass) return;
  pass.autoDetectTransparency = false;
  pass.configuration.transparencyAware = false;
}

export const MeadowEffects = memo(function MeadowEffects({ still }: { still: boolean }) {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO
        ref={disableTransparencyAo}
        aoRadius={5}
        distanceFalloff={0.7}
        intensity={1.05}
        halfRes
        quality={still ? "high" : "low"}
      />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <SMAA />
      <Focus />
    </EffectComposer>
  );
});
