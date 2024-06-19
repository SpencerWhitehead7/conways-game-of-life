import * as Comlink from "https://unpkg.com/comlink@4.4.1/dist/esm/comlink.js";

import { createUpdateCell, doBoardsMatch, ptlCellI } from "./boardUtils.js";

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
      const dataView = new DataView(board.buffer);
      const turnOn = createUpdateCell(rowCount, colCount, 1, nextBoard);
      const turnOff = createUpdateCell(rowCount, colCount, -1, nextBoard);

      for (let pi = 0; pi < board.length; pi += 5) {
        let cellBlock = board[pi];
        let liveNeighborCountBlock = dataView.getUint32(pi + 1);
        let po = 0;
        while (cellBlock > 0 || liveNeighborCountBlock > 0) {
          let cell = cellBlock & 0b1;
          let liveNeighborCount = liveNeighborCountBlock & 0b1111;
          // Any live cell with two or three live neighbours survives.
          // Similarly, all other dead cells stay dead.
          if (cell === 0 && liveNeighborCount === 3) {
            // Any dead cell with three live neighbours becomes a live cell.
            const li = ptlCellI(pi, po);
            turnOn(li, pi, po);
          } else if (
            cell === 1 &&
            (liveNeighborCount < 2 || liveNeighborCount > 3)
          ) {
            // All other live cells die in the next generation.
            const li = ptlCellI(pi, po);
            turnOff(li, pi, po);
          }

          cellBlock >>>= 1;
          liveNeighborCountBlock >>>= 4;
          po++;
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
