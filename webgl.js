export const createProgram = (gl, vShader, fShader) => {
  const program = gl.createProgram();
  gl.attachShader(program, vShader);
  gl.attachShader(program, fShader);
  gl.linkProgram(program);
  const didSucceed = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (didSucceed) return program;

  console.error(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
};

export const createShader = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const didSucceed = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (didSucceed) return shader;

  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
};
