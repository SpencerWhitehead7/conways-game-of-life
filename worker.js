importScripts("https://unpkg.com/comlink@4.3.1/dist/umd/comlink.min.js");

const FIXED = {
  rowCount: null,
  colCount: null,
  boardSize: null,
};

const STATE = {
  main: null,
  fast: null,
  orig: null,
  CYCLE_LENGTH: null,
};

Comlink.expose({
  setVals: (rowCount, colCount, board) => {
    FIXED.rowCount = rowCount;
    FIXED.colCount = colCount;
    FIXED.boardSize = rowCount * colCount;

    const cacheBoard = new Uint8Array(FIXED.boardSize * 2);
    for (let i = 0; i < FIXED.boardSize; i++) {
      if (board[i] === 1) {
        cacheBoard[i] = 1;

        const ri = Math.floor(i / FIXED.colCount);
        const ci = i % FIXED.colCount;

        const n = ri === 0 ? FIXED.rowCount - 1 : ri - 1;
        const e = ci === FIXED.colCount - 1 ? 0 : ci + 1;
        const s = ri === FIXED.rowCount - 1 ? 0 : ri + 1;
        const w = ci === 0 ? FIXED.colCount - 1 : ci - 1;

        cacheBoard[getLiveNeighborIdx(n, w)]++;
        cacheBoard[getLiveNeighborIdx(n, ci)]++;
        cacheBoard[getLiveNeighborIdx(n, e)]++;
        cacheBoard[getLiveNeighborIdx(ri, e)]++;
        cacheBoard[getLiveNeighborIdx(ri, w)]++;
        cacheBoard[getLiveNeighborIdx(s, e)]++;
        cacheBoard[getLiveNeighborIdx(s, ci)]++;
        cacheBoard[getLiveNeighborIdx(s, w)]++;
      }
    }
    STATE.main = cacheBoard;
    STATE.fast = new Uint8Array(cacheBoard);
    STATE.orig = new Uint8Array(cacheBoard);
  },
  getNextMainBoard: () => {
    STATE.main = getNextBoard(STATE.main);
    const board = STATE.main.slice(0, FIXED.boardSize);
    return Comlink.transfer(board, [board.buffer]);
  },
  getNextFastBoard: () => {
    STATE.fast = getNextBoard(getNextBoard(STATE.fast));
    const board = STATE.fast.slice(0, FIXED.boardSize);
    return Comlink.transfer(board, [board.buffer]);
  },
  getCycleLength: () => {
    let cycleLengthBoard = getNextBoard(STATE.fast);
    let cycleLength = 1;
    while (!doBoardsMatch(STATE.fast, cycleLengthBoard)) {
      cycleLengthBoard = getNextBoard(cycleLengthBoard);
      cycleLength++;
    }
    STATE.CYCLE_LENGTH = cycleLength;
    return STATE.CYCLE_LENGTH;
  },
  getStepsToEnterCycle: () => {
    let stepsToEnterCycleBoard = getNextBoard(STATE.orig);
    let stepsAdvanced = 1;
    while (stepsAdvanced < STATE.CYCLE_LENGTH) {
      stepsToEnterCycleBoard = getNextBoard(stepsToEnterCycleBoard);
      stepsAdvanced++;
    }
    let stepsToEnterCycle = 0;
    while (!doBoardsMatch(STATE.orig, stepsToEnterCycleBoard)) {
      STATE.orig = getNextBoard(STATE.orig);
      stepsToEnterCycleBoard = getNextBoard(stepsToEnterCycleBoard);
      stepsToEnterCycle++;
    }
    return stepsToEnterCycle;
  },
});

const getLiveNeighborIdx = (ri, ci) =>
  ri * FIXED.colCount + ci + FIXED.boardSize;

const getNextBoard = (board) => {
  const nextBoard = new Uint8Array(FIXED.boardSize * 2);

  for (let i = 0; i < FIXED.boardSize; i++) {
    // Any live cell with two or three live neighbours survives.
    // Any dead cell with three live neighbours becomes a live cell.
    if (
      board[i + FIXED.boardSize] === 3 ||
      (board[i + FIXED.boardSize] === 2 && board[i] === 1)
    ) {
      nextBoard[i] = 1;

      const ri = Math.floor(i / FIXED.colCount);
      const ci = i % FIXED.colCount;

      const n = ri === 0 ? FIXED.rowCount - 1 : ri - 1;
      const e = ci === FIXED.colCount - 1 ? 0 : ci + 1;
      const s = ri === FIXED.rowCount - 1 ? 0 : ri + 1;
      const w = ci === 0 ? FIXED.colCount - 1 : ci - 1;

      nextBoard[getLiveNeighborIdx(n, w)]++;
      nextBoard[getLiveNeighborIdx(n, ci)]++;
      nextBoard[getLiveNeighborIdx(n, e)]++;
      nextBoard[getLiveNeighborIdx(ri, e)]++;
      nextBoard[getLiveNeighborIdx(ri, w)]++;
      nextBoard[getLiveNeighborIdx(s, e)]++;
      nextBoard[getLiveNeighborIdx(s, ci)]++;
      nextBoard[getLiveNeighborIdx(s, w)]++;
    }
    // All other live cells die in the next generation. Similarly, all other dead cells stay dead.
  }

  return nextBoard;
};

const doBoardsMatch = (board1, board2) => {
  for (let i = 0; i < FIXED.boardSize; i++) {
    if (board1[i] !== board2[i]) return false;
  }
  return true;
};
