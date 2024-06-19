import * as Comlink from "https://unpkg.com/comlink@4.4.1/dist/esm/comlink.js";

import { newTimer } from "./devHelpers.js";

const tt = newTimer("read board");
const ttt = newTimer("update board");

const tttt = newTimer("create board", 50);

import { createUpdateCell } from "./boardUtils.js";

Comlink.expose({
  step: null,

  init: function (
    rowCount,
    colCount,
    boardSMem,
    onIdxsSMem,
    offIdxsSMem,
    notifiers
  ) {
    console.log("worker", { boardSMem, onIdxsSMem, offIdxsSMem });

    const board = new Uint8Array(boardSMem.buffer);
    const onIdxs = new Float32Array(onIdxsSMem.buffer);
    const offIdxs = new Float32Array(offIdxsSMem.buffer);

    const onPtr = new WebAssembly.Global({ value: "i32", mutable: true }, 0);
    const offPtr = new WebAssembly.Global({ value: "i32", mutable: true }, 0);

    const notifier = notifiers;

    let getNextDiff;
    WebAssembly.instantiateStreaming(fetch("./logic.wasm"), {
      js: {
        board: boardSMem,
        onIdxs: onIdxsSMem,
        offIdxs: offIdxsSMem,
        onPtr,
        offPtr,
        log: console.log,
        log2: console.log,
      },
    }).then(({ module, instance }) => {
      ({ getNextDiff } = instance.exports);
    });

    this.step = () => {
      const turnOn = createUpdateCell(rowCount, colCount, 1, 10, board);
      const turnOff = createUpdateCell(rowCount, colCount, -1, -10, board);

      tt.beg();
      getNextDiff(rowCount * colCount);

      tt.end();

      ttt.beg();
      for (let i = 0; i < onPtr.value; i++) {
        turnOn(onIdxs[i]);
      }
      for (let i = 0; i < offPtr.value; i++) {
        turnOff(offIdxs[i]);
      }
      ttt.end();

      Atomics.notify(notifier, 0);

      return {
        onPtr: onPtr.value,
        offPtr: offPtr.value,
      };
    };
  },
  getNext: function () {
    return this.step();
  },
});
