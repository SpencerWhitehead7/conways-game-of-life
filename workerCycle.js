import * as Comlink from "https://unpkg.com/comlink@4.4.1/dist/esm/comlink.js";

import { newBoard } from "./boardUtils.js";

Comlink.expose({
  board: null,
  fast: null,
  slow: null,
  cycleLength: null,

  init: function (rowCount, colCount, board) {
    this.board = newBoard(rowCount, colCount, board);
    this.fast = newBoard(rowCount, colCount, board);
    this.slow = newBoard(rowCount, colCount, board);
    this.cycleLength = 0;
  },
  getNext: function () {
    this.board.step();
    this.board.step();
    return this.board.get();
  },
  getCycleLength: function () {
    const cycleDectected = this.board.get();
    while (!this.board.doesMatch(cycleDectected) || this.cycleLength === 0) {
      this.board.step();
      this.cycleLength++;
    }
    return this.cycleLength;
  },
  getStepsToEnterCycle: function () {
    let cycleCountUp = 0;
    while (cycleCountUp < this.cycleLength) {
      this.fast.step();
      cycleCountUp++;
    }

    let stepsToEnterCycle = 0;
    while (!this.fast.doesMatch(this.slow.get())) {
      this.fast.step();
      this.slow.step();
      stepsToEnterCycle++;
    }
    return stepsToEnterCycle;
  },
});
