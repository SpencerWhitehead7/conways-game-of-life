import * as Comlink from "https://unpkg.com/comlink@4.4.1/dist/esm/comlink.js";

import { createToggleCell, doBoardsMatch } from "./boardUtils.js";

Comlink.expose({
  slow: null,
  fast: null,
  cycleLength: null,

  step: null,

  init: function (rowCount, colCount, board) {
    this.fast = board;
    this.slow = board;
    this.cycleLength = 0;

    this.step = (board) => {
      const nextBoard = new Uint8Array(board);
      const toggleCell = createToggleCell(rowCount, colCount, nextBoard);

      for (let i = 0; i < board.length; i++) {
        // Any live cell with two or three live neighbours survives.
        // Similarly, all other dead cells stay dead.
        const cell = board[i];
        if (cell === 30) {
          // Any dead cell with three live neighbours becomes a live cell.
          toggleCell(i, 1);
        } else if ((cell & 1) === 1 && (cell < 21 || cell > 31)) {
          // All other live cells die in the next generation.
          toggleCell(i, -1);
        }
      }

      return nextBoard;
    };
  },
  getNext: function (board) {
    const nextBoard = this.step(this.step(board));

    return Comlink.transfer(nextBoard, [nextBoard.buffer]);
  },
  getCycleLength: function (board) {
    const baseBoard = board;
    this.cycleLength = 1;
    board = this.step(board);
    while (!doBoardsMatch(baseBoard, board)) {
      this.cycleLength++;
      board = this.step(board);
    }

    return this.cycleLength;
  },
  getStepsToEnterCycle: function () {
    let cycleCountUp = 0;
    while (cycleCountUp < this.cycleLength) {
      this.fast = this.step(this.fast);
      cycleCountUp++;
    }

    let stepsToEnterCycle = 0;
    while (!doBoardsMatch(this.slow, this.fast)) {
      this.slow = this.step(this.slow);
      this.fast = this.step(this.fast);
      stepsToEnterCycle++;
    }

    return stepsToEnterCycle;
  },
});
