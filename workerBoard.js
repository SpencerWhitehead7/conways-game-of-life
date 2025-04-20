import * as Comlink from "https://unpkg.com/comlink@4.4.2/dist/esm/comlink.js";

import { newTimer } from "./devHelpers.js";

const tt = newTimer("MAIN_BOARD - total");
const ut = newTimer("MAIN_BOARD - update");
const at = newTimer("MAIN_BOARD - mini alloc");

Comlink.expose({
  step: null,

  init: async function (rowCount, colCount, boardSMem) {
    const { module, instance } = await WebAssembly.instantiateStreaming(
      fetch("./gameLogic.wasm"),
      {
        js: {
          board: boardSMem,
          rc: rowCount,
          cc: colCount,
          log: console.log,
        },
      }
    );

    const { step, turnOnIdxsMem, turnOffIdxsMem } = instance.exports;

    this.step = () => {
      tt.beg();
      ut.beg();
      const [turnOnIdxsPtr, turnOffIdxsPtr] = step();
      ut.end();

      at.beg();
      const turnOnIdxs = Float32Array.from(
        new Int32Array(turnOnIdxsMem.buffer).slice(0, turnOnIdxsPtr)
      );
      const turnOffIdxs = Float32Array.from(
        new Int32Array(turnOffIdxsMem.buffer).slice(0, turnOffIdxsPtr)
      );
      at.end();

      tt.end();
      return Comlink.transfer({ turnOnIdxs, turnOffIdxs }, [
        turnOnIdxs.buffer,
        turnOffIdxs.buffer,
      ]);
    };
  },
  getNext: function () {
    return this.step();
  },
});
