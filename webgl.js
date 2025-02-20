export const createProgram = (gl, vShader, fShader, feedbackVaryings) => {
  const program = gl.createProgram();
  gl.attachShader(program, vShader);
  gl.attachShader(program, fShader);
  if (feedbackVaryings) {
    gl.transformFeedbackVaryings(
      program,
      feedbackVaryings,
      gl.SEPARATE_ATTRIBS
    );
  }
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

export const createBuffer = (gl, sizeOrData) => {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, sizeOrData, gl.STATIC_DRAW);
  return buffer;
};

export const readBufferIntoArray = (gl, buffer, output) => {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.getBufferSubData(
    gl.ARRAY_BUFFER,
    0, // byte offset into GPU buffer,
    output
  );
};

const vShaderCalcSrc = /*glsl*/ `#version 300 es

in float cellBlockIn;

out float cellBlockOut;

void main() {
  uint cellBlockInUint = floatBitsToUint(cellBlockIn);
  uint cellBlockOutUint = 0u;

  for (int i = 0; i < 4; i++) {
    uint cell = (cellBlockInUint >> (8 * i)) & 255u;
    cell &= 127u; // strip prev on/off state

    if (cell == 30u) {
      cell += 1u;
    } else if ((cell & 1u) == 1u && (cell < 21u || cell > 31u)) {
      cell += 127u; // -1 (turned off) + 128 (used to be on)
    }

    cellBlockOutUint |= (cell << (8 * i));
  }

  cellBlockOut = uintBitsToFloat(cellBlockOutUint);
}
`;

const fShaderCalcSrc = /*glsl*/ `#version 300 es
precision highp float;
void main() {
}
`;

// const canvas = document.createElement("canvas");
// const gl = canvas.getContext("webgl2");

// const vShader = createShader(gl, gl.VERTEX_SHADER, vShaderCalcSrc);
// const fShader = createShader(gl, gl.FRAGMENT_SHADER, fShaderCalcSrc);
// const program = createProgram(gl, vShader, fShader, ["cellBlockOut"]);
// gl.useProgram(program);
// // no need to call the fragment shader for this
// gl.enable(gl.RASTERIZER_DISCARD);

// const tf = gl.createTransformFeedback();
// const cellBlockALoc = gl.getAttribLocation(program, "cellBlockIn");

// const data = new Uint8Array([
//   0, 10, 20, 30, 40, 50, 60, 70, 80, 1, 11, 21, 31, 41, 51, 61, 71, 81, 0, 0,
// ]);
// const floatedData = new Float32Array(data.buffer);
// const outputBuffer = createBuffer(gl, floatedData.byteLength);

// for (let i = 0; i < 4; i++) {
//   console.log(data, floatedData);
//   createBuffer(gl, floatedData);
//   gl.enableVertexAttribArray(cellBlockALoc);
//   gl.vertexAttribPointer(
//     cellBlockALoc, // attachment point for the buffer currently attached to gl.ARRAY_BUFFER
//     1, // size: 1 component per iteration
//     gl.FLOAT, // type: the data is 32bit floats
//     false, // normalize: don't
//     0, // stride: move forward size *sizeof(type) each iteration to get the next position
//     0 // offset: start at the beginning of the buffer
//   );

//   gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
//   gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, outputBuffer);
//   gl.beginTransformFeedback(gl.POINTS);
//   gl.drawArrays(gl.POINTS, 0, floatedData.length);
//   gl.endTransformFeedback();
//   gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

//   readBufferIntoArray(gl, outputBuffer, floatedData);
// }

// console.log(data, floatedData);
