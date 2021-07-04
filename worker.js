importScripts("https://unpkg.com/comlink@4.3.1/dist/umd/comlink.min.js");

let FIXED = null;

Comlink.expose({
  transferFixed: (fixed) => {
    FIXED = fixed;
  },
  getCycleLength: (fastBoard) => {
    let cycleLengthBoard = getNextBoard(fastBoard);
    let cycleLength = 1;
    while (!doBoardsMatch(fastBoard, cycleLengthBoard)) {
      cycleLengthBoard = getNextBoard(cycleLengthBoard);
      cycleLength++;
    }
    return cycleLength;
  },
  getStepsToEnterCycle: (originalBoard, cycleLength) => {
    let stepsToEnterCycleBoard = getNextBoard(originalBoard);
    let stepsAdvanced = 1;
    while (stepsAdvanced < cycleLength) {
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

// Comlink actually lets you transfer functions via proxying them, but
// it causes cross-thread communication overhead with the args
// Had to do some BS to get FIXED into lexical scope though
const getLiveNeighborCount = (board, rowI, colI) =>
  rowI === 0 ||
  rowI === FIXED.rowCount - 1 ||
  colI === 0 ||
  colI === FIXED.colCount - 1
    ? board[(rowI + FIXED.rowCount - 1) % FIXED.rowCount][
        (colI + FIXED.colCount - 1) % FIXED.colCount
      ] +
      board[(rowI + FIXED.rowCount - 1) % FIXED.rowCount][colI] +
      board[(rowI + FIXED.rowCount - 1) % FIXED.rowCount][
        (colI + 1) % FIXED.colCount
      ] +
      board[rowI][(colI + 1) % FIXED.colCount] +
      board[(rowI + 1) % FIXED.rowCount][(colI + 1) % FIXED.colCount] +
      board[(rowI + 1) % FIXED.rowCount][colI] +
      board[(rowI + 1) % FIXED.rowCount][
        (colI + FIXED.colCount - 1) % FIXED.colCount
      ] +
      board[rowI][(colI + FIXED.colCount - 1) % FIXED.colCount]
    : board[rowI - 1][colI - 1] +
      board[rowI - 1][colI] +
      board[rowI - 1][colI + 1] +
      board[rowI][colI + 1] +
      board[rowI + 1][colI + 1] +
      board[rowI + 1][colI] +
      board[rowI + 1][colI - 1] +
      board[rowI][colI - 1];

const getNextBoard = (board) => {
  const nextBoard = Array.from(
    Array(FIXED.rowCount),
    () => new Uint8Array(FIXED.colCount)
  );

  for (let rowI = 0; rowI < FIXED.rowCount; rowI++) {
    for (let colI = 0; colI < FIXED.colCount; colI++) {
      const cell = board[rowI][colI];
      const liveNeighborCount = getLiveNeighborCount(board, rowI, colI);

      if (
        // Any live cell with two or three live neighbours survives.
        (cell === 1 && (liveNeighborCount === 2 || liveNeighborCount === 3)) ||
        // Any dead cell with three live neighbours becomes a live cell.
        (cell === 0 && liveNeighborCount === 3)
      ) {
        nextBoard[rowI][colI] = 1;
      }
      // All other live cells die in the next generation. Similarly, all other dead cells stay dead.
    }
  }

  return nextBoard;
};

const doBoardsMatch = (board1, board2) => {
  for (let rowI = 0; rowI < FIXED.rowCount; rowI++) {
    for (let colI = 0; colI < FIXED.colCount; colI++) {
      if (board1[rowI][colI] !== board2[rowI][colI]) return false;
    }
  }
  return true;
};
