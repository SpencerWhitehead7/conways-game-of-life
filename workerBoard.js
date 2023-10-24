import * as Comlink from "https://unpkg.com/comlink@4.4.1/dist/esm/comlink.js";

import { createUpdateCell } from "./boardUtils.js";

Comlink.expose({
  step: null,

  init: function (rowCount, colCount) {
    const turnOnIdxsPreallocated = new Float32Array(rowCount * colCount);
    const turnOffIdxsPreallocated = new Float32Array(rowCount * colCount);

    this.step = (board) => {
      const nextBoard = new Uint8Array(board);
      const turnOn = createUpdateCell(rowCount, colCount, 1, 10, nextBoard);
      const turnOff = createUpdateCell(rowCount, colCount, -1, -10, nextBoard);

      let turnOnI = 0;
      let turnOffI = 0;

      for (let i = 0; i < board.length; i++) {
        // Any live cell with two or three live neighbours survives.
        // Similarly, all other dead cells stay dead.
        const cell = board[i];
        if (cell === 30) {
          // Any dead cell with three live neighbours becomes a live cell.
          turnOn(i);
          turnOnIdxsPreallocated[turnOnI++] = i;
        } else if ((cell & 1) === 1 && (cell < 21 || cell > 31)) {
          // All other live cells die in the next generation.
          turnOff(i);
          turnOffIdxsPreallocated[turnOffI++] = i;
        }
      }

      const turnOnIdxs = turnOnIdxsPreallocated.slice(0, turnOnI);
      const turnOffIdxs = turnOffIdxsPreallocated.slice(0, turnOffI);

      return Comlink.transfer({ nextBoard, turnOnIdxs, turnOffIdxs }, [
        nextBoard.buffer,
        turnOnIdxs.buffer,
        turnOffIdxs.buffer,
      ]);
    };
  },
  getNext: function (board) {
    return this.step(board);
  },
});
