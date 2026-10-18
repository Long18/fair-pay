import { POST_FRAG, SCENE_FRAG, VERT } from "./shaders";

export type FrameUniforms = {
  w: number;
  h: number;
  m: number;
  time: number;
  wind: number;
  camX: number;
  camY: number;
  sunX: number;
  sunY: number;
  ripples: Float32Array;
  focus: number;
};

/** sprites, shade, air, fore, canopy — in texture-unit order 1..5. */
export type LayerCanvases = [
  HTMLCanvasElement,
  HTMLCanvasElement,
  HTMLCanvasElement,
  HTMLCanvasElement,
  HTMLCanvasElement,
];

export type BenchRenderer = {
  setMap: (data: Uint8Array, w: number, h: number) => void;
  resize: (w: number, h: number) => void;
  draw: (u: FrameUniforms, layers: LayerCanvases) => void;
  dispose: () => void;
};

function program(gl: WebGLRenderingContext, frag: string): WebGLProgram {
  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type);
    if (!sh) throw new Error("shader");
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || "shader");
    return sh;
  };
  const p = gl.createProgram();
  if (!p) throw new Error("program");
  gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, frag));
  gl.bindAttribLocation(p, 0, "aPos");
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
  return p;
}

function linearTexture(gl: WebGLRenderingContext): WebGLTexture {
  const tex = gl.createTexture();
  if (!tex) throw new Error("texture");
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/**
 * Two passes: the scene shader composites the terrain map, pond, light and
 * the five 2D layers into an offscreen target; the post pass adds the
 * tilt-shift focus band, halation, grade and grain.
 */
export function createBenchRenderer(canvas: HTMLCanvasElement): BenchRenderer | null {
  const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false, alpha: false });
  if (!gl) return null;
  const scene = program(gl, SCENE_FRAG);
  const post = program(gl, POST_FRAG);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  gl.useProgram(scene);
  const u = {
    size: gl.getUniformLocation(scene, "uSize"),
    m: gl.getUniformLocation(scene, "uM"),
    time: gl.getUniformLocation(scene, "uTime"),
    wind: gl.getUniformLocation(scene, "uWind"),
    cam: gl.getUniformLocation(scene, "uCam"),
    sun: gl.getUniformLocation(scene, "uSun"),
    ripples: gl.getUniformLocation(scene, "uRipples"),
  };
  const textures = ["uMap", "uSprites", "uShade", "uAir", "uFore", "uCanopy"].map((name, i) => {
    gl.activeTexture(gl.TEXTURE0 + i);
    const tex = linearTexture(gl);
    gl.uniform1i(gl.getUniformLocation(scene, name), i);
    return tex;
  });

  gl.useProgram(post);
  const pu = {
    scene: gl.getUniformLocation(post, "uScene"),
    res: gl.getUniformLocation(post, "uRes"),
    focus: gl.getUniformLocation(post, "uFocus"),
    seed: gl.getUniformLocation(post, "uSeed"),
  };
  gl.uniform1i(pu.scene, 6);
  gl.activeTexture(gl.TEXTURE6);
  const target = linearTexture(gl);
  const fbo = gl.createFramebuffer();
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

  return {
    setMap(data, w, h) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures[0]);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    },
    resize(w, h) {
      canvas.width = w;
      canvas.height = h;
      gl.activeTexture(gl.TEXTURE6);
      gl.bindTexture(gl.TEXTURE_2D, target);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },
    draw(f, layers) {
      gl.useProgram(scene);
      for (let i = 0; i < 5; i++) {
        gl.activeTexture(gl.TEXTURE1 + i);
        gl.bindTexture(gl.TEXTURE_2D, textures[i + 1]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, layers[i]);
      }
      gl.uniform2f(u.size, f.w, f.h);
      gl.uniform1f(u.m, f.m);
      gl.uniform1f(u.time, f.time);
      gl.uniform1f(u.wind, f.wind);
      gl.uniform2f(u.cam, f.camX, f.camY);
      gl.uniform2f(u.sun, f.sunX, f.sunY);
      gl.uniform4fv(u.ripples, f.ripples);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(post);
      gl.uniform2f(pu.res, canvas.width, canvas.height);
      gl.uniform1f(pu.focus, f.focus);
      gl.uniform1f(pu.seed, Math.floor(12 * f.time) % 97);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      for (const tex of textures) gl.deleteTexture(tex);
      gl.deleteTexture(target);
      gl.deleteFramebuffer(fbo);
      gl.deleteBuffer(quad);
      gl.deleteProgram(scene);
      gl.deleteProgram(post);
    },
  };
}
