import * as Comlink from "https://unpkg.com/comlink@4.4.2/dist/esm/comlink.js";

import { createToggleCell } from "./boardUtils.js";

import { newTimer } from "./devHelpers.js";

const tt = newTimer("MAIN_BOARD - total");
const dt = newTimer("MAIN_BOARD - diff");
const at = newTimer("MAIN_BOARD - mini alloc");
const pt = newTimer("MAIN_BOARD - patch");

Comlink.expose({
  step: null,

  init: async function (rowCount, colCount, boardSMem) {
    const { module, instance } = await WebAssembly.instantiateStreaming(
      fetch("./gameLogic.wasm"),
      {
        js: {
          board: boardSMem,
          log: console.log,
          log2: console.log,
        },
      }
    );

    const { getNextDiff, turnOnIdxsMem, turnOffIdxsMem } = instance.exports;

    const wasmBoardView = new Uint8Array(boardSMem.buffer);

    this.step = () => {
      tt.beg();
      const toggleCell = createToggleCell(rowCount, colCount, wasmBoardView);

      dt.beg();
      const [turnOnIdxsPtr, turnOffIdxsPtr] = getNextDiff(rowCount * colCount);
      dt.end();

      at.beg();
      const turnOnIdxs = new Int32Array(turnOnIdxsMem.buffer).slice(
        0,
        turnOnIdxsPtr
      );
      const turnOffIdxs = new Int32Array(turnOffIdxsMem.buffer).slice(
        0,
        turnOffIdxsPtr
      );
      const turnOnIdxsFloats = Float32Array.from(turnOnIdxs);
      const turnOffIdxsFloats = Float32Array.from(turnOffIdxs);
      at.end();

      pt.beg();
      for (let i = 0; i < turnOnIdxs.length; i++) {
        toggleCell(turnOnIdxs[i], 1);
      }
      for (let i = 0; i < turnOffIdxs.length; i++) {
        toggleCell(turnOffIdxs[i], -1);
      }
      pt.end();

      tt.end();
      return Comlink.transfer(
        { turnOnIdxs: turnOnIdxsFloats, turnOffIdxs: turnOffIdxsFloats },
        [turnOnIdxsFloats.buffer, turnOffIdxsFloats.buffer]
      );
    };
  },
  getNext: function () {
    return this.step();
  },
});
