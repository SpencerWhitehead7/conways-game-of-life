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
    fastBoard = board.map((row) => new Uint8Array(row));
    originalBoard = board.map((row) => new Uint8Array(row));
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

const getNextBoard = (board) => {
  const nextBoard = Array.from(
    Array(rowCount + 2),
    () => new Uint8Array(colCount + 2)
  );

  for (let rowI = 1; rowI <= rowCount; rowI++) {
    for (let colI = 1; colI <= colCount; colI++) {
      const cell = board[rowI][colI];
      const liveNeighborCount =
        board[rowI - 1][colI - 1] +
        board[rowI - 1][colI] +
        board[rowI - 1][colI + 1] +
        board[rowI][colI + 1] +
        board[rowI + 1][colI + 1] +
        board[rowI + 1][colI] +
        board[rowI + 1][colI - 1] +
        board[rowI][colI - 1];

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

  for (let rowI = 1; rowI <= rowCount; rowI++) {
    nextBoard[rowI][0] = nextBoard[rowI][colCount];
    nextBoard[rowI][colCount + 1] = nextBoard[rowI][1];
  }
  nextBoard[0] = new Uint8Array(nextBoard[rowCount]);
  nextBoard[rowCount + 1] = new Uint8Array(nextBoard[1]);

  return nextBoard;
};

const doBoardsMatch = (board1, board2) => {
  for (let rowI = 1; rowI <= rowCount; rowI++) {
    for (let colI = 1; colI <= colCount; colI++) {
      if (board1[rowI][colI] !== board2[rowI][colI]) return false;
    }
  }
  return true;
};
