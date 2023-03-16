importScripts("https://unpkg.com/comlink@4.3.1/dist/umd/comlink.min.js");

importScripts("./boardUtils.js");

Comlink.expose({
  board: null,
  fast: null,
  slow: null,
  cycleLength: null,

  init: (rowCount, colCount, board) => {
    this.board = newBoard(rowCount, colCount, board);
    this.fast = newBoard(rowCount, colCount, board);
    this.slow = newBoard(rowCount, colCount, board);
    this.cycleLength = 0;
  },
  getNext: () => {
    this.board.step();
    this.board.step();
    const board = this.board.get();
    return Comlink.transfer(board, [board.buffer]);
  },
  getCycleLength: () => {
    const cycleDectected = this.board.get();
    while (!this.board.doesMatch(cycleDectected) || this.cycleLength === 0) {
      this.board.step();
      this.cycleLength++;
    }
    return this.cycleLength;
  },
  getStepsToEnterCycle: () => {
    let cycleCountUp = 0;
    while (cycleCountUp < this.cycleLength) {
      this.fast.step();
      cycleCountUp++;
    }

    let stepsToEnterCycle = 0;
    while (!this.fast.doesMatch(this.slow.exposeFull())) {
      this.fast.step();
      this.slow.step();
      stepsToEnterCycle++;
    }
    return stepsToEnterCycle;
  },
});
