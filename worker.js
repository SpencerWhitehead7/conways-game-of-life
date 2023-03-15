importScripts("https://unpkg.com/comlink@4.3.1/dist/umd/comlink.min.js");

let rowCount = null;
let colCount = null;
let mainBoard = null;
let mainLiveNeighbors = null;
let fastBoard = null;
let fastLiveNeighbors = null;
let originalBoard = null;
let originalLiveNeighbors = null;
let calcCycleLength = null;

Comlink.expose({
  setVals: (rowCountVal, colCountVal, board) => {
    rowCount = rowCountVal;
    colCount = colCountVal;
    mainBoard = board;
    fastBoard = new Uint8Array(board);
    originalBoard = new Uint8Array(board);

    const liveNeighbors = new Uint8Array(board.length);
    for (let i = 0; i < board.length; i++) {
      if (board[i] === 1) {
        const rowI = Math.floor(i / colCount);
        const colI = i % colCount;

        const n = rowI === 0 ? rowCount - 1 : rowI - 1;
        const e = colI === colCount - 1 ? 0 : colI + 1;
        const s = rowI === rowCount - 1 ? 0 : rowI + 1;
        const w = colI === 0 ? colCount - 1 : colI - 1;

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
    mainLiveNeighbors = liveNeighbors;
    fastLiveNeighbors = new Uint8Array(liveNeighbors);
    originalLiveNeighbors = new Uint8Array(liveNeighbors);
  },
  getNextMainBoard: () => {
    const [nextMainBoard, nextMainLiveNeighbors] = getNextBoard(
      mainBoard,
      mainLiveNeighbors
    );
    mainBoard = nextMainBoard;
    mainLiveNeighbors = nextMainLiveNeighbors;
    return mainBoard;
  },
  getNextFastBoard: () => {
    const [nextFastBoard, nextFastLiveNeighbors] = getNextBoard(
      ...getNextBoard(fastBoard, fastLiveNeighbors)
    );
    fastBoard = nextFastBoard;
    fastLiveNeighbors = nextFastLiveNeighbors;
    return fastBoard;
  },
  getCycleLength: () => {
    let [cycleLengthBoard, cycleLengthLiveNeighbors] = getNextBoard(
      fastBoard,
      fastLiveNeighbors
    );
    let cycleLength = 1;
    while (!doBoardsMatch(fastBoard, cycleLengthBoard)) {
      [cycleLengthBoard, cycleLengthLiveNeighbors] = getNextBoard(
        cycleLengthBoard,
        cycleLengthLiveNeighbors
      );
      cycleLength++;
    }
    calcCycleLength = cycleLength;
    return cycleLength;
  },
  getStepsToEnterCycle: () => {
    let [stepsToEnterCycleBoard, stepsToEnterCycleLiveNeighbors] = getNextBoard(
      originalBoard,
      originalLiveNeighbors
    );
    let stepsAdvanced = 1;
    while (stepsAdvanced < calcCycleLength) {
      [stepsToEnterCycleBoard, stepsToEnterCycleLiveNeighbors] = getNextBoard(
        stepsToEnterCycleBoard,
        stepsToEnterCycleLiveNeighbors
      );
      stepsAdvanced++;
    }
    let stepsToEnterCycle = 0;
    while (!doBoardsMatch(originalBoard, stepsToEnterCycleBoard)) {
      [originalBoard, originalLiveNeighbors] = getNextBoard(
        originalBoard,
        originalLiveNeighbors
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

const coordsToIdx = (rowI, colI) => rowI * colCount + colI;

const getNextBoard = (board, liveNeighbors) => {
  const nextBoard = new Uint8Array(rowCount * colCount);
  const nextLiveNeighbors = new Uint8Array(rowCount * colCount);

  for (let i = 0; i < board.length; i++) {
    // Any live cell with two or three live neighbours survives.
    // Any dead cell with three live neighbours becomes a live cell.
    if (liveNeighbors[i] === 3 || (liveNeighbors[i] === 2 && board[i] === 1)) {
      nextBoard[i] = 1;

      const rowI = Math.floor(i / colCount);
      const colI = i % colCount;

      const n = rowI === 0 ? rowCount - 1 : rowI - 1;
      const e = colI === colCount - 1 ? 0 : colI + 1;
      const s = rowI === rowCount - 1 ? 0 : rowI + 1;
      const w = colI === 0 ? colCount - 1 : colI - 1;

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
