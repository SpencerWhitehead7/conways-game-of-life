class GameOfLife {
  constructor(
    rowCount,
    colCount,
    density,
    CTX,
    INFO_STEP_COUNT,
    INFO_CYCLE_DETECT
  ) {
    this.rowCount = rowCount;
    this.colCount = colCount;
    this.density = density / 100;
    this.CTX = CTX;
    this.INFO_STEP_COUNT = INFO_STEP_COUNT;
    this.INFO_CYCLE_DETECT = INFO_CYCLE_DETECT;

    this.CELL_SIZE = (() => {
      if (this.rowCount > 1024 || this.colCount > 1024) return 4;
      if (this.rowCount > 32 || this.colCount > 32) return 8;
      return 16;
    })();
    this.FULL_SIZE = this.CELL_SIZE + 1; // border

    // set up canvas
    const height = 1 + this.rowCount * this.FULL_SIZE;
    const width = 1 + this.colCount * this.FULL_SIZE;

    this.CTX.canvas.height = height;
    this.CTX.canvas.width = width;

    // draw grid
    this.CTX.strokeStyle = "lightGray";
    this.CTX.beginPath();
    this.CTX.moveTo(0, 0);
    for (let i = 0; i <= this.rowCount; i++) {
      this.CTX.lineTo(width + 0.5, i * this.FULL_SIZE + 0.5);
      this.CTX.moveTo(0.5, (i + 1) * this.FULL_SIZE + 0.5);
    }
    this.CTX.moveTo(0.5, 0.5);
    for (let i = 0; i <= this.colCount; i++) {
      this.CTX.lineTo(i * this.FULL_SIZE + 0.5, height + 0.5);
      this.CTX.moveTo((i + 1) * this.FULL_SIZE + 0.5, 0.5);
    }
    this.CTX.stroke();
    this.CTX.fillStyle = "darkBlue";

    // create empty board
    this.board = (() => {
      const board = [];
      for (let rowI = 0; rowI < this.rowCount; rowI++) {
        const row = [];
        for (let colI = 0; colI < this.colCount; colI++) {
          row.push(0);
        }
        board.push(row);
      }
      return board;
    })();

    // seed diff
    this._applyDiff(() => {
      const diff = [];
      for (let rowI = 0; rowI < this.rowCount; rowI++) {
        for (let colI = 0; colI < this.colCount; colI++) {
          if (Math.random() < this.density) diff.push([rowI, colI, 1]);
        }
      }
      return diff;
    });

    // create fastBoard for Floyd's Tortoise and Hare cycle detection
    this.fastBoard = this.board.map((row) => [...row]);

    this.cycleDetected = false;
    this.INFO_CYCLE_DETECT.innerText = "No Cycle Detected";

    this.stepCount = 0;
    this.INFO_STEP_COUNT.innerText = this.stepCount;
  }

  _applyDiff(calculateDiff) {
    const diff = calculateDiff();

    for (let i = 0; i < diff.length; i++) {
      const [rowI, colI, newVal] = diff[i];

      this.board[rowI][colI] = newVal;

      this.CTX[newVal ? "fillRect" : "clearRect"](
        1 + colI * this.FULL_SIZE,
        1 + rowI * this.FULL_SIZE,
        this.CELL_SIZE,
        this.CELL_SIZE
      );
    }
  }

  _setStepCount(stepCount) {
    this.stepCount = stepCount;
    this.INFO_STEP_COUNT.innerText = this.stepCount;
  }

  _setCycleDetected(isDetected) {
    this.cycleDetected = isDetected;
    this.INFO_CYCLE_DETECT.innerText = isDetected
      ? "Cycle Detected!"
      : "No Cycle Detected";
    this.fastBoard = isDetected
      ? this.fastBoard
      : this.board.map((row) => [...row]);
  }

  _getLiveNeighborCount(rowI, colI, board) {
    return rowI === 0 ||
      rowI === this.rowCount - 1 ||
      colI === 0 ||
      colI === this.colCount - 1
      ? board[(rowI + this.rowCount - 1) % this.rowCount][
          (colI + this.colCount - 1) % this.colCount
        ] +
          board[(rowI + this.rowCount - 1) % this.rowCount][colI] +
          board[(rowI + this.rowCount - 1) % this.rowCount][
            (colI + 1) % this.colCount
          ] +
          board[rowI][(colI + 1) % this.colCount] +
          board[(rowI + 1) % this.rowCount][(colI + 1) % this.colCount] +
          board[(rowI + 1) % this.rowCount][colI] +
          board[(rowI + 1) % this.rowCount][
            (colI + this.colCount - 1) % this.colCount
          ] +
          board[rowI][(colI + this.colCount - 1) % this.colCount]
      : board[rowI - 1][colI - 1] +
          board[rowI - 1][colI] +
          board[rowI - 1][colI + 1] +
          board[rowI][colI + 1] +
          board[rowI + 1][colI + 1] +
          board[rowI + 1][colI] +
          board[rowI + 1][colI - 1] +
          board[rowI][colI - 1];
  }

  _advanceFastBoard(iterations) {
    for (let i = 0; i < iterations; i++) {
      const nextFastBoard = [];
      for (let rowI = 0; rowI < this.rowCount; rowI++) {
        const row = [];
        for (let colI = 0; colI < this.colCount; colI++) {
          const cell = this.fastBoard[rowI][colI];
          const liveNeighborCount = this._getLiveNeighborCount(
            rowI,
            colI,
            this.fastBoard
          );

          row[colI] =
            // Any live cell with two or three live neighbours survives.
            (cell === 1 &&
              (liveNeighborCount === 2 || liveNeighborCount === 3)) ||
            // Any dead cell with three live neighbours becomes a live cell.
            (cell === 0 && liveNeighborCount === 3)
              ? 1
              : 0;
          // All other live cells die in the next generation. Similarly, all other dead cells stay dead.
        }
        nextFastBoard.push(row);
      }
      this.fastBoard = nextFastBoard;
    }
  }

  toggle(row, col) {
    this._applyDiff(() => [[row, col, this.board[row][col] === 0 ? 1 : 0]]);
    this._setStepCount(0);
    this._setCycleDetected(false);
  }

  tick() {
    this._applyDiff(() => {
      const diff = [];
      for (let rowI = 0; rowI < this.rowCount; rowI++) {
        for (let colI = 0; colI < this.colCount; colI++) {
          const cell = this.board[rowI][colI];
          const liveNeighborCount = this._getLiveNeighborCount(
            rowI,
            colI,
            this.board
          );

          if (cell === 1 && (liveNeighborCount < 2 || liveNeighborCount > 3)) {
            // if cell is on and has less than 2 or more than 3 on neighbors, it turns off
            diff.push([rowI, colI, 0]);
          } else if (cell === 0 && liveNeighborCount === 3) {
            // if a cell is off and has 3 on neighbors, it turns on
            diff.push([rowI, colI, 1]);
          }
          // otherwise, on cells remain on and off cells remain off
        }
      }
      return diff;
    });

    this._setStepCount(this.stepCount + 1);

    if (!this.cycleDetected) {
      this._advanceFastBoard(2);

      for (let rowI = 0; rowI < this.rowCount; rowI++) {
        for (let colI = 0; colI < this.colCount; colI++) {
          if (this.board[rowI][colI] !== this.fastBoard[rowI][colI]) return;
        }
      }

      this._setCycleDetected(true);
    }
  }
}
