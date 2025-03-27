import * as Comlink from "https://unpkg.com/comlink@4.4.2/dist/esm/comlink.js";

import { createToggleCell, doBoardsMatch } from "./boardUtils.js";

Comlink.expose({
  slow: null,
  fast: null,
  cycleLength: null,

  step: null,

  init: function (rowCount, colCount, board) {
    this.fast = new Uint8Array(board);
    this.slow = new Uint8Array(board);
    this.cycleLength = 0;

    const turnOnIdxsPreallocated = new Uint32Array(rowCount * colCount);
    const turnOffIdxsPreallocated = new Uint32Array(rowCount * colCount);

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

      for (let i = 0; i < turnOnI; i++) {
        toggleCell(turnOnIdxsPreallocated[i], 1);
      }
      for (let i = 0; i < turnOffI; i++) {
        toggleCell(turnOffIdxsPreallocated[i], -1);
      }

      return board;
    };
  },
  getNext: function (board) {
    this.step(this.step(board));

    return Comlink.transfer(board, [board.buffer]);
  },
  getCycleLength: function (board) {
    const baseBoard = new Uint8Array(board);
    this.cycleLength = 1;
    this.step(board);
    while (!doBoardsMatch(baseBoard, board)) {
      this.cycleLength++;
      this.step(board);
    }

    return this.cycleLength;
  },
  getStepsToEnterCycle: function () {
    let cycleCountUp = 0;
    while (cycleCountUp < this.cycleLength) {
      this.step(this.fast);
      cycleCountUp++;
    }

    let stepsToEnterCycle = 0;
    while (!doBoardsMatch(this.slow, this.fast)) {
      this.step(this.slow);
      this.step(this.fast);
      stepsToEnterCycle++;
    }

    return stepsToEnterCycle;
  },
});
