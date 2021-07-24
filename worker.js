importScripts("https://unpkg.com/comlink@4.3.1/dist/umd/comlink.min.js");

let rowCount = null;
let colCount = null;
let mainBoard = null;
let mainChangableCells = null;
let fastBoard = null;
let fastChangableCells = null;
let originalBoard = null;
let originalChangableCells = null;
let calcCycleLength = null;

Comlink.expose({
  setVals: (rowCountVal, colCountVal, board) => {
    rowCount = rowCountVal;
    colCount = colCountVal;
    mainBoard = board;
    fastBoard = new Uint8Array(board);
    originalBoard = new Uint8Array(board);

    const changableCells = new Uint8Array(board);
    for (let rowI = 1; rowI <= rowCount; rowI++) {
      for (let colI = 1; colI <= colCount; colI++) {
        const idx = coordsToIdx(rowI, colI);
        if (board[idx] === 1) {
          const n = rowI === 1 ? rowCount : rowI - 1;
          const e = colI === colCount ? 1 : colI + 1;
          const s = rowI === rowCount ? 1 : rowI + 1;
          const w = colI === 1 ? colCount : colI - 1;

          changableCells[coordsToIdx(n, w)] = 1;
          changableCells[coordsToIdx(n, colI)] = 1;
          changableCells[coordsToIdx(n, e)] = 1;
          changableCells[coordsToIdx(rowI, e)] = 1;
          changableCells[coordsToIdx(s, e)] = 1;
          changableCells[coordsToIdx(s, colI)] = 1;
          changableCells[coordsToIdx(s, w)] = 1;
          changableCells[coordsToIdx(rowI, w)] = 1;
        }
      }
    }
    mainChangableCells = changableCells;
    fastChangableCells = new Uint8Array(changableCells);
    originalChangableCells = new Uint8Array(changableCells);
  },
  getNextMainBoard: () => {
    const [nextMainBoard, nextMainChangableCells] = getNextBoard(
      mainBoard,
      mainChangableCells
    );
    mainBoard = nextMainBoard;
    mainChangableCells = nextMainChangableCells;
    return mainBoard;
  },
  getNextFastBoard: () => {
    const [nextFastBoard, nextFastChangableCells] = getNextBoard(
      ...getNextBoard(fastBoard, fastChangableCells)
    );
    fastBoard = nextFastBoard;
    fastChangableCells = nextFastChangableCells;
    return fastBoard;
  },
  getCycleLength: () => {
    let [cycleLengthBoard, cycleLengthChangableCells] = getNextBoard(
      fastBoard,
      fastChangableCells
    );
    let cycleLength = 1;
    while (!doBoardsMatch(fastBoard, cycleLengthBoard)) {
      [cycleLengthBoard, cycleLengthChangableCells] = getNextBoard(
        cycleLengthBoard,
        cycleLengthChangableCells
      );
      cycleLength++;
    }
    calcCycleLength = cycleLength;
    return cycleLength;
  },
  getStepsToEnterCycle: () => {
    let [stepsToEnterCycleBoard, stepsToEnterCycleChangableCells] =
      getNextBoard(originalBoard, originalChangableCells);
    let stepsAdvanced = 1;
    while (stepsAdvanced < calcCycleLength) {
      [stepsToEnterCycleBoard, stepsToEnterCycleChangableCells] = getNextBoard(
        stepsToEnterCycleBoard,
        stepsToEnterCycleChangableCells
      );
      stepsAdvanced++;
    }
    let stepsToEnterCycle = 0;
    while (!doBoardsMatch(originalBoard, stepsToEnterCycleBoard)) {
      [originalBoard, originalChangableCells] = getNextBoard(
        originalBoard,
        originalChangableCells
      );
      [stepsToEnterCycleBoard, stepsToEnterCycleChangableCells] = getNextBoard(
        stepsToEnterCycleBoard,
        stepsToEnterCycleChangableCells
      );
      stepsToEnterCycle++;
    }
    return stepsToEnterCycle;
  },
});

const coordsToIdx = (rowI, colI) => rowI * (colCount + 2) + colI;

const getNextBoard = (board, changableCells) => {
  const nextBoard = new Uint8Array((rowCount + 2) * (colCount + 2));
  const nextChangableCells = new Uint8Array((rowCount + 2) * (colCount + 2));

  for (let rowI = 1; rowI <= rowCount; rowI++) {
    for (let colI = 1; colI <= colCount; colI++) {
      const idx = coordsToIdx(rowI, colI);
      if (changableCells[idx] === 1) {
        const cell = board[idx];
        let n = rowI - 1;
        let e = colI + 1;
        let s = rowI + 1;
        let w = colI - 1;

        const liveNeighborCount =
          board[coordsToIdx(n, w)] +
          board[coordsToIdx(n, colI)] +
          board[coordsToIdx(n, e)] +
          board[coordsToIdx(rowI, e)] +
          board[coordsToIdx(s, e)] +
          board[coordsToIdx(s, colI)] +
          board[coordsToIdx(s, w)] +
          board[coordsToIdx(rowI, w)];

        if (
          // Any live cell with two or three live neighbours survives.
          (cell === 1 &&
            (liveNeighborCount === 2 || liveNeighborCount === 3)) ||
          // Any dead cell with three live neighbours becomes a live cell.
          (cell === 0 && liveNeighborCount === 3)
        ) {
          nextBoard[idx] = 1;

          n = n === 0 ? rowCount : n;
          e = e === colCount + 1 ? 1 : e;
          s = s === rowCount + 1 ? 1 : s;
          w = w === 0 ? colCount : w;

          nextChangableCells[idx] = 1;
          nextChangableCells[coordsToIdx(n, w)] = 1;
          nextChangableCells[coordsToIdx(n, colI)] = 1;
          nextChangableCells[coordsToIdx(n, e)] = 1;
          nextChangableCells[coordsToIdx(rowI, e)] = 1;
          nextChangableCells[coordsToIdx(s, e)] = 1;
          nextChangableCells[coordsToIdx(s, colI)] = 1;
          nextChangableCells[coordsToIdx(s, w)] = 1;
          nextChangableCells[coordsToIdx(rowI, w)] = 1;
        }
        // All other live cells die in the next generation. Similarly, all other dead cells stay dead.
      }
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

  return [nextBoard, nextChangableCells];
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
