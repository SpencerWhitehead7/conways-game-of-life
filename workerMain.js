import * as Comlink from "https://unpkg.com/comlink@4.4.2/dist/esm/comlink.js";

import { getGameLogic } from "./boardUtils.js";

import { newTimer } from "./devHelpers.js";

const tt = newTimer("MAIN_BOARD - total");
const ut = newTimer("MAIN_BOARD - update");
const at = newTimer("MAIN_BOARD - mini alloc");

Comlink.expose({
  step: null,

  init: async function (rowCount, colCount, boardSMem) {
    const { step } = await getGameLogic(boardSMem, rowCount, colCount);

    this.step = () => {
      tt.beg();
      ut.beg();
      const [
        turnOnIdxsOffset,
        turnOnIdxsPtr,
        turnOffIdxsOffset,
        turnOffIdxsPtr,
      ] = step();
      ut.end();

      at.beg();
      const turnOnIdxs = Float32Array.from(
        new Int32Array(boardSMem.buffer).slice(turnOnIdxsOffset, turnOnIdxsPtr)
      );
      const turnOffIdxs = Float32Array.from(
        new Int32Array(boardSMem.buffer).slice(
          turnOffIdxsOffset,
          turnOffIdxsPtr
        )
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
