import * as Comlink from "https://unpkg.com/comlink@4.4.1/dist/esm/comlink.js";

import { createUpdateCell, doBoardsMatch } from "./boardUtils.js";

Comlink.expose({
  startingBoard: null,
  cycleLength: null,

  step: null,

  init: function (rowCount, colCount, board) {
    this.startingBoard = board;
    this.cycleLength = 0;

    this.step = (board) => {
      const nextBoard = new Uint8Array(board);

      const turnOn = createUpdateCell(rowCount, colCount, 1, 10, nextBoard);
      const turnOff = createUpdateCell(rowCount, colCount, -1, -10, nextBoard);

      for (let i = 0; i < board.length; i++) {
        const cell = board[i];
        if (cell === 30) {
          turnOn(i);
        } else if ((cell & 1) === 1 && (cell < 21 || cell > 31)) {
          turnOff(i);
        }
      }

      return nextBoard;
    };
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
    let slow = this.startingBoard;
    let fast = this.startingBoard;
    while (cycleCountUp < this.cycleLength) {
      fast = this.step(fast);
      cycleCountUp++;
    }

    let stepsToEnterCycle = 0;
    while (!doBoardsMatch(slow, fast)) {
      slow = this.step(slow);
      fast = this.step(fast);
      stepsToEnterCycle++;
    }

    return stepsToEnterCycle;
  },
});
