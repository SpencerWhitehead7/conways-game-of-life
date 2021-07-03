window.onload = () => {
  // values

  const DOM = {
    board: document.getElementById("board"),
    ctx: document.getElementById("board").getContext("2d"),
    btnCreate: document.getElementById("btn__create"),
    btnPlayPause: document.getElementById("btn__play-pause"),
    btnStep: document.getElementById("btn__step"),
    infoCycleDetected: document.getElementById("info__cycle-detected"),
    infoCycleLength: document.getElementById("info__cycle-length"),
    infoStepCount: document.getElementById("info__step-count"),
    inputCols: document.getElementById("input__cols"),
    inputDensity: document.getElementById("input__density"),
    inputFrames: document.getElementById("input__frames"),
    inputRows: document.getElementById("input__rows"),
  };

  const FIXED = {
    rowCount: null,
    colCount: null,
    density: null,
    cellSize: null,
    fullSize: null,
  };

  const STATE = {
    rafID: null,
    board: null,
    fastBoard: null,
    cycleDetected: null,
    stepCount: null,
  };

  // util logic

  const applyDiff = (diff) => {
    for (let i = 0; i < diff.length; i++) {
      const [rowI, colI, newVal] = diff[i];
      STATE.board[rowI][colI] = newVal;
      newVal === 1
        ? DOM.ctx.fillRect(
            1 + colI * FIXED.fullSize,
            1 + rowI * FIXED.fullSize,
            FIXED.cellSize,
            FIXED.cellSize
          )
        : DOM.ctx.clearRect(
            1 + colI * FIXED.fullSize,
            1 + rowI * FIXED.fullSize,
            FIXED.cellSize,
            FIXED.cellSize
          );
    }
  };

  const resetCycleDetection = () => {
    STATE.fastBoard = STATE.board.map((row) => new Uint8Array(row));
    STATE.cycleDetected = false;
    DOM.infoCycleDetected.innerText = "No Cycle Detected";
    DOM.infoCycleLength.innerText = "";
    STATE.stepCount = 0;
    DOM.infoStepCount.innerText = `Step Count: ${STATE.stepCount}`;
  };

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
          (cell === 1 &&
            (liveNeighborCount === 2 || liveNeighborCount === 3)) ||
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

  // listeners

  const create = () => {
    if (STATE.rafID) playPause();

    FIXED.rowCount = Number(DOM.inputRows.value);
    FIXED.colCount = Number(DOM.inputCols.value);
    FIXED.density = Number(DOM.inputDensity.value / 100);

    FIXED.cellSize = (() => {
      if (FIXED.rowCount > 1024 || FIXED.colCount > 1024) return 4;
      if (FIXED.rowCount > 32 || FIXED.colCount > 32) return 8;
      return 16;
    })();
    FIXED.fullSize = FIXED.cellSize + 1; // for border

    // set up canvas
    const height = 1 + FIXED.rowCount * FIXED.fullSize;
    const width = 1 + FIXED.colCount * FIXED.fullSize;

    DOM.ctx.canvas.height = height;
    DOM.ctx.canvas.width = width;

    // draw grid
    DOM.ctx.strokeStyle = "lightGray";
    DOM.ctx.beginPath();
    DOM.ctx.moveTo(0, 0);
    for (let i = 0; i <= FIXED.rowCount; i++) {
      DOM.ctx.lineTo(width + 0.5, i * FIXED.fullSize + 0.5);
      DOM.ctx.moveTo(0.5, (i + 1) * FIXED.fullSize + 0.5);
    }
    DOM.ctx.moveTo(0.5, 0.5);
    for (let i = 0; i <= FIXED.colCount; i++) {
      DOM.ctx.lineTo(i * FIXED.fullSize + 0.5, height + 0.5);
      DOM.ctx.moveTo((i + 1) * FIXED.fullSize + 0.5, 0.5);
    }
    DOM.ctx.stroke();
    DOM.ctx.fillStyle = "darkBlue";

    // create empty board
    STATE.board = Array.from(
      Array(FIXED.rowCount),
      () => new Uint8Array(FIXED.colCount)
    );

    // seed empty board
    const diff = [];
    for (let rowI = 0; rowI < FIXED.rowCount; rowI++) {
      for (let colI = 0; colI < FIXED.colCount; colI++) {
        if (Math.random() < FIXED.density) diff.push([rowI, colI, 1]);
      }
    }
    applyDiff(diff);
    resetCycleDetection();
  };

  const toggle = (evt) => {
    if (!STATE.rafID) {
      const { left, top } = DOM.board.getBoundingClientRect();
      const y = Math.abs(Math.floor(evt.clientY - top));
      const x = Math.abs(Math.floor(evt.clientX - left));

      if (x % FIXED.fullSize !== 0 && y % FIXED.fullSize !== 0) {
        const rowI = Math.floor(y / FIXED.fullSize);
        const colI = Math.floor(x / FIXED.fullSize);

        applyDiff([[rowI, colI, STATE.board[rowI][colI] === 0 ? 1 : 0]]);
        resetCycleDetection();
      }
    }
  };

  const step = () => {
    const diff = [];
    for (let rowI = 0; rowI < FIXED.rowCount; rowI++) {
      for (let colI = 0; colI < FIXED.colCount; colI++) {
        const cell = STATE.board[rowI][colI];
        const liveNeighborCount = getLiveNeighborCount(STATE.board, rowI, colI);

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
    applyDiff(diff);

    STATE.stepCount += 1;
    DOM.infoStepCount.innerText = `Step Count: ${STATE.stepCount}`;

    if (!STATE.cycleDetected) {
      STATE.fastBoard = getNextBoard(getNextBoard(STATE.fastBoard));

      if (doBoardsMatch(STATE.board, STATE.fastBoard)) {
        STATE.cycleDetected = true;
        DOM.infoCycleDetected.innerText = "Cycle Detected!";

        let cycleLengthBoard = getNextBoard(STATE.fastBoard);
        let cycleLength = 1;
        while (!doBoardsMatch(STATE.fastBoard, cycleLengthBoard)) {
          cycleLengthBoard = getNextBoard(cycleLengthBoard);
          cycleLength++;
        }
        DOM.infoCycleLength.innerText = `Cycle Length: ${cycleLength}`;
      }
    }
  };

  const playPause = () => {
    if (STATE.rafID) {
      cancelAnimationFrame(STATE.rafID);
      STATE.rafID = null;
    } else {
      const frames = Number(DOM.inputFrames.value);
      let count = 0;

      const animateSteps = () => {
        if (count === 0) step();

        count += 1;
        count %= frames;
        STATE.rafID = requestAnimationFrame(animateSteps);
      };

      STATE.rafID = requestAnimationFrame(animateSteps);
    }
    DOM.inputFrames.disabled = Boolean(STATE.rafID);
    DOM.btnStep.disabled = Boolean(STATE.rafID);
    DOM.btnPlayPause.innerText = Boolean(STATE.rafID) ? "Pause" : "Play";
  };

  DOM.btnCreate.addEventListener("click", create);

  DOM.board.addEventListener("click", toggle);

  DOM.btnStep.addEventListener("click", step);

  DOM.btnPlayPause.addEventListener("click", playPause);

  create();
};
