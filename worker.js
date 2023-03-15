importScripts("https://unpkg.com/comlink@4.3.1/dist/umd/comlink.min.js");

const FIXED = {
  rowCount: null,
  colCount: null,
};

const STATE = {
  MAIN: {
    board: null,
    liveNeighbors: null,
  },
  FAST: {
    board: null,
    liveNeighbors: null,
  },
  ORIG: {
    board: null,
    liveNeighbors: null,
  },
  CYCLE_LENGTH: null,
};

Comlink.expose({
  setVals: (rowCount, colCount, board) => {
    FIXED.rowCount = rowCount;
    FIXED.colCount = colCount;
    STATE.MAIN.board = board;
    STATE.FAST.board = new Uint8Array(board);
    STATE.ORIG.board = new Uint8Array(board);

    const liveNeighbors = new Uint8Array(board.length);
    for (let i = 0; i < board.length; i++) {
      if (board[i] === 1) {
        const rowI = Math.floor(i / FIXED.colCount);
        const colI = i % FIXED.colCount;

        const n = rowI === 0 ? FIXED.rowCount - 1 : rowI - 1;
        const e = colI === FIXED.colCount - 1 ? 0 : colI + 1;
        const s = rowI === FIXED.rowCount - 1 ? 0 : rowI + 1;
        const w = colI === 0 ? FIXED.colCount - 1 : colI - 1;

        liveNeighbors[coordsToIdx(n, w)]++;
        liveNeighbors[coordsToIdx(n, colI)]++;
        liveNeighbors[coordsToIdx(n, e)]++;
        liveNeighbors[coordsToIdx(rowI, e)]++;
        liveNeighbors[coordsToIdx(s, e)]++;
        liveNeighbors[coordsToIdx(s, colI)]++;
        liveNeighbors[coordsToIdx(s, w)]++;
        liveNeighbors[coordsToIdx(rowI, w)]++;
      }
    }
    STATE.MAIN.liveNeighbors = liveNeighbors;
    STATE.FAST.liveNeighbors = new Uint8Array(liveNeighbors);
    STATE.ORIG.liveNeighbors = new Uint8Array(liveNeighbors);
  },
  getNextMainBoard: () => {
    [STATE.MAIN.board, STATE.MAIN.liveNeighbors] = getNextBoard(
      STATE.MAIN.board,
      STATE.MAIN.liveNeighbors
    );
    return STATE.MAIN.board;
  },
  getNextFastBoard: () => {
    [STATE.FAST.board, STATE.FAST.liveNeighbors] = getNextBoard(
      ...getNextBoard(STATE.FAST.board, STATE.FAST.liveNeighbors)
    );
    return STATE.FAST.board;
  },
  getCycleLength: () => {
    let [cycleLengthBoard, cycleLengthLiveNeighbors] = getNextBoard(
      STATE.FAST.board,
      STATE.FAST.liveNeighbors
    );
    let cycleLength = 1;
    while (!doBoardsMatch(STATE.FAST.board, cycleLengthBoard)) {
      [cycleLengthBoard, cycleLengthLiveNeighbors] = getNextBoard(
        cycleLengthBoard,
        cycleLengthLiveNeighbors
      );
      cycleLength++;
    }
    STATE.CYCLE_LENGTH = cycleLength;
    return STATE.CYCLE_LENGTH;
  },
  getStepsToEnterCycle: () => {
    let [stepsToEnterCycleBoard, stepsToEnterCycleLiveNeighbors] = getNextBoard(
      STATE.ORIG.board,
      STATE.ORIG.liveNeighbors
    );
    let stepsAdvanced = 1;
    while (stepsAdvanced < STATE.CYCLE_LENGTH) {
      [stepsToEnterCycleBoard, stepsToEnterCycleLiveNeighbors] = getNextBoard(
        stepsToEnterCycleBoard,
        stepsToEnterCycleLiveNeighbors
      );
      stepsAdvanced++;
    }
    let stepsToEnterCycle = 0;
    while (!doBoardsMatch(STATE.ORIG.board, stepsToEnterCycleBoard)) {
      [STATE.ORIG.board, STATE.ORIG.liveNeighbors] = getNextBoard(
        STATE.ORIG.board,
        STATE.ORIG.liveNeighbors
      );
      [stepsToEnterCycleBoard, stepsToEnterCycleLiveNeighbors] = getNextBoard(
        stepsToEnterCycleBoard,
        stepsToEnterCycleLiveNeighbors
      );
      stepsToEnterCycle++;
    }
    return stepsToEnterCycle;
  },
});

const coordsToIdx = (rowI, colI) => rowI * FIXED.colCount + colI;

const getNextBoard = (board, liveNeighbors) => {
  const nextBoard = new Uint8Array(board.length);
  const nextLiveNeighbors = new Uint8Array(liveNeighbors.length);

  for (let i = 0; i < board.length; i++) {
    // Any live cell with two or three live neighbours survives.
    // Any dead cell with three live neighbours becomes a live cell.
    if (liveNeighbors[i] === 3 || (liveNeighbors[i] === 2 && board[i] === 1)) {
      nextBoard[i] = 1;

      const rowI = Math.floor(i / FIXED.colCount);
      const colI = i % FIXED.colCount;

      const n = rowI === 0 ? FIXED.rowCount - 1 : rowI - 1;
      const e = colI === FIXED.colCount - 1 ? 0 : colI + 1;
      const s = rowI === FIXED.rowCount - 1 ? 0 : rowI + 1;
      const w = colI === 0 ? FIXED.colCount - 1 : colI - 1;

      nextLiveNeighbors[coordsToIdx(n, w)]++;
      nextLiveNeighbors[coordsToIdx(n, colI)]++;
      nextLiveNeighbors[coordsToIdx(n, e)]++;
      nextLiveNeighbors[coordsToIdx(rowI, e)]++;
      nextLiveNeighbors[coordsToIdx(s, e)]++;
      nextLiveNeighbors[coordsToIdx(s, colI)]++;
      nextLiveNeighbors[coordsToIdx(s, w)]++;
      nextLiveNeighbors[coordsToIdx(rowI, w)]++;
    }
    // All other live cells die in the next generation. Similarly, all other dead cells stay dead.
  }

  return [nextBoard, nextLiveNeighbors];
};

const doBoardsMatch = (board1, board2) => {
  for (let i = 0; i < board1.length; i++) {
    if (board1[i] !== board2[i]) return false;
  }
  return true;
};
