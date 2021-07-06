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
  const nextBoard = Array.from(Array(rowCount), () => new Uint8Array(colCount));

  for (let rowI = 0; rowI < rowCount; rowI++) {
    for (let colI = 0; colI < colCount; colI++) {
      const cell = board[rowI][colI];
      const liveNeighborCount =
        rowI === 0 ||
        rowI === rowCount - 1 ||
        colI === 0 ||
        colI === colCount - 1
          ? board[(rowI + rowCount - 1) % rowCount][
              (colI + colCount - 1) % colCount
            ] +
            board[(rowI + rowCount - 1) % rowCount][colI] +
            board[(rowI + rowCount - 1) % rowCount][(colI + 1) % colCount] +
            board[rowI][(colI + 1) % colCount] +
            board[(rowI + 1) % rowCount][(colI + 1) % colCount] +
            board[(rowI + 1) % rowCount][colI] +
            board[(rowI + 1) % rowCount][(colI + colCount - 1) % colCount] +
            board[rowI][(colI + colCount - 1) % colCount]
          : board[rowI - 1][colI - 1] +
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

  return nextBoard;
};

const doBoardsMatch = (board1, board2) => {
  for (let rowI = 0; rowI < rowCount; rowI++) {
    for (let colI = 0; colI < colCount; colI++) {
      if (board1[rowI][colI] !== board2[rowI][colI]) return false;
    }
  }
  return true;
};
