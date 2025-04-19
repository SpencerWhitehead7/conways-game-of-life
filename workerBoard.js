import * as Comlink from "https://unpkg.com/comlink@4.4.2/dist/esm/comlink.js";

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

    const {
      getNextDiff,
      turnOnIdxsMem,
      turnOffIdxsMem,
      toggleCellsOn,
      toggleCellsOff,
    } = instance.exports;

    this.step = () => {
      tt.beg();
      dt.beg();
      const [turnOnIdxsPtr, turnOffIdxsPtr] = getNextDiff(rowCount * colCount);
      dt.end();

      at.beg();
      const turnOnIdxs = Float32Array.from(
        new Int32Array(turnOnIdxsMem.buffer).slice(0, turnOnIdxsPtr)
      );
      const turnOffIdxs = Float32Array.from(
        new Int32Array(turnOffIdxsMem.buffer).slice(0, turnOffIdxsPtr)
      );
      at.end();

      pt.beg();
      toggleCellsOn(rowCount, colCount, turnOnIdxsPtr);
      toggleCellsOff(rowCount, colCount, turnOffIdxsPtr);
      pt.end();

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
