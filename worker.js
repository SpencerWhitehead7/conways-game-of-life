importScripts("https://unpkg.com/comlink@4.3.1/dist/umd/comlink.min.js");

let rowCount = null;
let colCount = null;
let mainBoard = null;
let fastBoard = null;
let originalBoard = null;
let calcCycleLength = null;

Comlink.expose({
  setVals: (rowCountVal, colCountVal, board) => {
    rowCount = rowCountVal;
    colCount = colCountVal;
    mainBoard = board;
    fastBoard = new Uint8Array(board);
    originalBoard = new Uint8Array(board);
  },
  getNextMainBoard: () => {
    mainBoard = getNextBoard(mainBoard);
    return mainBoard;
  },
  getNextFastBoard: () => {
    fastBoard = getNextBoard(getNextBoard(fastBoard));
    return fastBoard;
  },
  getCycleLength: () => {
    let cycleLengthBoard = getNextBoard(fastBoard);
    let cycleLength = 1;
    while (!doBoardsMatch(fastBoard, cycleLengthBoard)) {
      cycleLengthBoard = getNextBoard(cycleLengthBoard);
      cycleLength++;
    }
    calcCycleLength = cycleLength;
    return cycleLength;
  },
  getStepsToEnterCycle: () => {
    let stepsToEnterCycleBoard = getNextBoard(originalBoard);
    let stepsAdvanced = 1;
    while (stepsAdvanced < calcCycleLength) {
      stepsToEnterCycleBoard = getNextBoard(stepsToEnterCycleBoard);
      stepsAdvanced++;
    }
    let stepsToEnterCycle = 0;
    while (!doBoardsMatch(originalBoard, stepsToEnterCycleBoard)) {
      originalBoard = getNextBoard(originalBoard);
      stepsToEnterCycleBoard = getNextBoard(stepsToEnterCycleBoard);
      stepsToEnterCycle++;
    }
    return stepsToEnterCycle;
  },
});

const coordsToIdx = (rowI, colI) => rowI * (colCount + 2) + colI;

const getNextBoard = (board) => {
  const nextBoard = new Uint8Array((rowCount + 2) * (colCount + 2));

  for (let rowI = 1; rowI <= rowCount; rowI++) {
    for (let colI = 1; colI <= colCount; colI++) {
      const idx = coordsToIdx(rowI, colI);
      const cell = board[idx];
      const liveNeighborCount =
        board[coordsToIdx(rowI - 1, colI - 1)] +
        board[coordsToIdx(rowI - 1, colI)] +
        board[coordsToIdx(rowI - 1, colI + 1)] +
        board[coordsToIdx(rowI, colI + 1)] +
        board[coordsToIdx(rowI + 1, colI + 1)] +
        board[coordsToIdx(rowI + 1, colI)] +
        board[coordsToIdx(rowI + 1, colI - 1)] +
        board[coordsToIdx(rowI, colI - 1)];

      if (
        // Any live cell with two or three live neighbours survives.
        (cell === 1 && (liveNeighborCount === 2 || liveNeighborCount === 3)) ||
        // Any dead cell with three live neighbours becomes a live cell.
        (cell === 0 && liveNeighborCount === 3)
      ) {
        nextBoard[idx] = 1;
      }
      // All other live cells die in the next generation. Similarly, all other dead cells stay dead.
    }
  }

  for (let rowI = 1; rowI <= rowCount; rowI++) {
    nextBoard[coordsToIdx(rowI, 0)] = nextBoard[coordsToIdx(rowI, colCount)];
    nextBoard[coordsToIdx(rowI, colCount + 1)] =
      nextBoard[coordsToIdx(rowI, 1)];
  }
  for (let colI = 0; colI <= colCount + 1; colI++) {
    nextBoard[coordsToIdx(0, colI)] = nextBoard[coordsToIdx(rowCount, colI)];
    nextBoard[coordsToIdx(rowCount + 1, colI)] =
      nextBoard[coordsToIdx(1, colI)];
  }

  return nextBoard;
};

const doBoardsMatch = (board1, board2) => {
  for (let rowI = 1; rowI <= rowCount; rowI++) {
    for (let colI = 1; colI <= colCount; colI++) {
      const idx = coordsToIdx(rowI, colI);
      if (board1[idx] !== board2[idx]) return false;
    }
  }
  return true;
};
