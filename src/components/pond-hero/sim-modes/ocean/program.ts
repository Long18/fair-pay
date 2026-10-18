import { OCEAN_MAX_SPAWNS, OCEAN_VERTEX_SHADER, buildOceanFragmentShader } from "./shaders";

export type OceanProgram = {
  uTime: WebGLUniformLocation | null;
  uRes: WebGLUniformLocation | null;
  uBackdrop: WebGLUniformLocation | null;
  uSpawns: (WebGLUniformLocation | null)[];
  dispose: () => void;
};

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.error("Shader error:", gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

/** Compile + bind the full-screen abyss program. `compact` uses fewer fish schools. */
export function createOceanProgram(gl: WebGLRenderingContext, compact: boolean): OceanProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, OCEAN_VERTEX_SHADER);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, buildOceanFragmentShader(compact));
  const program = gl.createProgram();
  if (!vs || !fs || !program) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    if (program) gl.deleteProgram(program);
    return null;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uSpawns: (WebGLUniformLocation | null)[] = [];
  for (let i = 0; i < OCEAN_MAX_SPAWNS; i++) {
    uSpawns.push(gl.getUniformLocation(program, `u_spawns[${i}]`));
  }

  return {
    uTime: gl.getUniformLocation(program, "u_time"),
    uRes: gl.getUniformLocation(program, "u_resolution"),
    uBackdrop: gl.getUniformLocation(program, "u_backdrop"),
    uSpawns,
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
