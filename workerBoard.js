import * as Comlink from "https://unpkg.com/comlink@4.4.2/dist/esm/comlink.js";

import { createToggleCell } from "./boardUtils.js";

Comlink.expose({
  step: null,

  init: function (rowCount, colCount) {
    const turnOnIdxsPreallocated = new Float32Array(rowCount * colCount);
    const turnOffIdxsPreallocated = new Float32Array(rowCount * colCount);

    this.step = (board) => {
      const toggleCell = createToggleCell(rowCount, colCount, board);

      let turnOnI = 0;
      let turnOffI = 0;

      for (let i = 0; i < board.length; i++) {
        // Any live cell with two or three live neighbours survives.
        // Similarly, all other dead cells stay dead.
        const cell = board[i];
        if (cell === 30) {
          // Any dead cell with three live neighbours becomes a live cell.
          turnOnIdxsPreallocated[turnOnI++] = i;
        } else if ((cell & 1) === 1 && (cell < 21 || cell > 31)) {
          // All other live cells die in the next generation.
          turnOffIdxsPreallocated[turnOffI++] = i;
        }
      }

      const turnOnIdxs = turnOnIdxsPreallocated.slice(0, turnOnI);
      const turnOffIdxs = turnOffIdxsPreallocated.slice(0, turnOffI);

      for (let i = 0; i < turnOnI; i++) {
        toggleCell(turnOnIdxs[i], 1);
      }
      for (let i = 0; i < turnOffI; i++) {
        toggleCell(turnOffIdxs[i], -1);
      }

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
