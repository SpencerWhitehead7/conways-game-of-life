import { newTimer } from "./devHelpers.js";

const dt = newTimer("diff timer");

const webgldt = newTimer("webgl diff timer");

const rundt = newTimer("double for loop timer");

import * as Comlink from "https://unpkg.com/comlink@4.4.1/dist/esm/comlink.js";

import { createToggleNeighbors } from "./boardUtils.js";
import {
  createShader,
  createProgram,
  createBuffer,
  readBufferIntoArray,
} from "./webgl.js";

Comlink.expose({
  step: null,

  init: function (rowCount, colCount) {
    const turnOnIdxsPreallocated = new Float32Array(rowCount * colCount);
    const turnOffIdxsPreallocated = new Float32Array(rowCount * colCount);

    this.step = (board) => {
      const toggleCell = createToggleNeighbors(rowCount, colCount, board);

      let turnOnI = 0;
      let turnOffI = 0;

      webgldt.beg();
      updateLiveStates(board);
      webgldt.end();

      // 9 ms total to diff and update

      dt.beg();
      for (let i = 0; i < board.length; i++) {
        const cell = board[i];
        const flags = cell & 0b1000_0001;
        // console.log("F:", flags);
        if (flags === 1) {
          toggleCell(i, 1);
          turnOnIdxsPreallocated[turnOnI++] = i;
        } else if (flags === 128) {
          toggleCell(i, -1);
          turnOffIdxsPreallocated[turnOffI++] = i;
        }
      }
      dt.end();

      const turnOnIdxs = turnOnIdxsPreallocated.slice(0, turnOnI);
      const turnOffIdxs = turnOffIdxsPreallocated.slice(0, turnOffI);

      // rundt.beg();
      // for (let i = 0; i < turnOnIdxs.length; i++) {
      //   toggleCell(turnOnIdxs[i], 1);
      // }

      // for (let i = 0; i < turnOffIdxs.length; i++) {
      //   toggleCell(turnOffIdxs[i], -1);
      // }
      // rundt.end();

      return Comlink.transfer({ nextBoard: board, turnOnIdxs, turnOffIdxs }, [
        board.buffer,
        turnOnIdxs.buffer,
        turnOffIdxs.buffer,
      ]);
    };
  },
  getNext: function (board) {
    return this.step(board);
  },
});

const vShaderCalcSrc = /*glsl*/ `#version 300 es

in float cellBlockIn;

out float cellBlockOut;

void main() {
  uint cellBlockInUint = floatBitsToUint(cellBlockIn);
  uint cellBlockOutUint = 0u;

  for (int i = 0; i < 4; i++) {
    uint cell = (cellBlockInUint >> (8 * i)) & 127u; // cell's byte minus prev on/off state

    if (cell == 31u || cell == 21u) {
      cell += 128u; // was on (+128), stayed on (0)
    } else if (cell == 30u) {
      cell += 1u; // was off (0), turned on (+1)
    } else if ((cell & 1u) == 1u && (cell < 21u || cell > 31u)) {
      cell += 127u; // was on (+128), turned off (-1)
    } // else was off (0), stayed off (0)

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

const canvas = new OffscreenCanvas(0, 0);
const gl = canvas.getContext("webgl2");

const vShader = createShader(gl, gl.VERTEX_SHADER, vShaderCalcSrc);
const fShader = createShader(gl, gl.FRAGMENT_SHADER, fShaderCalcSrc);
const program = createProgram(gl, vShader, fShader, ["cellBlockOut"]);
gl.useProgram(program);
// no need to call the fragment shader for this
gl.enable(gl.RASTERIZER_DISCARD);

const tf = gl.createTransformFeedback();
const cellBlockALoc = gl.getAttribLocation(program, "cellBlockIn");

const updateLiveStates = (board) => {
  const float32edBoard = new Float32Array(board.buffer);

  // was outside
  const outputBuffer = createBuffer(gl, float32edBoard.byteLength);

  createBuffer(gl, float32edBoard);
  gl.enableVertexAttribArray(cellBlockALoc);
  gl.vertexAttribPointer(
    cellBlockALoc, // attachment point for the buffer currently attached to gl.ARRAY_BUFFER
    1, // size: 1 component per iteration
    gl.FLOAT, // type: the data is 32bit floats
    false, // normalize: don't
    0, // stride: move forward size *sizeof(type) each iteration to get the next position
    0 // offset: start at the beginning of the buffer
  );

  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, outputBuffer);
  gl.beginTransformFeedback(gl.POINTS);
  gl.drawArrays(gl.POINTS, 0, float32edBoard.length);
  gl.endTransformFeedback();
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

  readBufferIntoArray(gl, outputBuffer, float32edBoard);
};

// 1. Use transformFeedback for More Efficient Data Transfer
// transformFeedback is an efficient mechanism for reading data back from the GPU. It allows you to directly capture output from the vertex shader or compute shader without needing to read back the buffer data manually via getBufferSubData(). By binding a buffer to a transform feedback object, you can write the results of shader computations directly into a buffer on the GPU.

// This is the most efficient way to transfer data from the GPU to the CPU, as it avoids having to explicitly fetch data via getBufferSubData() after the computation.

// Here's an example of how to set up transformFeedback:

// javascript
// Copy code
// Create a transform feedback object
const tf = gl.createTransformFeedback();

// Create output buffer on the GPU
const outputBuffer = gl.createBuffer();
gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, outputBuffer);
gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, data.length * Float32Array.BYTES_PER_ELEMENT, gl.STATIC_DRAW);

// Set up transform feedback to capture shader output
gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, outputBuffer);

// Start transform feedback (this runs the vertex shader and writes to the output buffer)
gl.beginTransformFeedback(gl.POINTS);
gl.drawArrays(gl.POINTS, 0, data.length);
gl.endTransformFeedback();
gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

// Now, you can read back from the outputBuffer
gl.bindBuffer(gl.ARRAY_BUFFER, outputBuffer);
gl.getBufferSubData(gl.ARRAY_BUFFER, 0, output);
// In this example:

// transformFeedback allows you to write shader output to outputBuffer.
// After running the computation, the buffer on the GPU directly holds the result.
// You can read the result back from outputBuffer after the transform feedback completes.
// This is far more efficient than using getBufferSubData() after performing each individual computation.