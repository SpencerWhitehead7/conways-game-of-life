import { newTimer } from "./devHelpers.js";

const dt = newTimer("webgl diff timer");
const ct = newTimer("webgl collect timer");

const pt = newTimer("patch timer");

import * as Comlink from "https://unpkg.com/comlink@4.4.1/dist/esm/comlink.js";

import { createToggleNeighbors } from "./boardUtils.js";
import { createShader, createProgram } from "./webgl.js";

Comlink.expose({
  step: null,

  init: function (rowCount, colCount) {
    const turnOnIdxsPreallocated = new Float32Array(rowCount * colCount);
    const turnOffIdxsPreallocated = new Float32Array(rowCount * colCount);

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

    const inputBuffer = gl.createBuffer();
    const outputBuffer = gl.createBuffer();

    this.step = (board) => {
      const toggleCell = createToggleNeighbors(rowCount, colCount, board);
      let turnOnI = 0;
      let turnOffI = 0;

      dt.beg();
      const float32Board = new Float32Array(board.buffer);

      gl.bindBuffer(gl.ARRAY_BUFFER, inputBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, float32Board, gl.DYNAMIC_DRAW);

      gl.bindBuffer(gl.ARRAY_BUFFER, outputBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, float32Board.byteLength, gl.DYNAMIC_COPY);

      gl.bindBuffer(gl.ARRAY_BUFFER, inputBuffer);
      gl.enableVertexAttribArray(cellBlockALoc);
      gl.vertexAttribPointer(cellBlockALoc, 1, gl.FLOAT, false, 0, 0);

      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, outputBuffer);
      gl.beginTransformFeedback(gl.POINTS);
      gl.drawArrays(gl.POINTS, 0, float32Board.length);
      gl.endTransformFeedback();
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

      gl.bindBuffer(gl.ARRAY_BUFFER, outputBuffer);
      gl.getBufferSubData(gl.ARRAY_BUFFER, 0, float32Board);
      dt.end();

      ct.beg();
      for (let i = 0; i < board.length; i++) {
        const cell = board[i];
        const flags = cell & 0b1000_0001;
        if (flags === 1) {
          turnOnIdxsPreallocated[turnOnI++] = i;
        } else if (flags === 128) {
          turnOffIdxsPreallocated[turnOffI++] = i;
        }
      }
      ct.end();

      const turnOnIdxs = turnOnIdxsPreallocated.slice(0, turnOnI);
      const turnOffIdxs = turnOffIdxsPreallocated.slice(0, turnOffI);

      pt.beg();
      for (let i = 0; i < turnOnI; i++) {
        toggleCell(turnOnIdxs[i], 1);
      }
      for (let i = 0; i < turnOffI; i++) {
        toggleCell(turnOffIdxs[i], -1);
      }
      pt.end();

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
