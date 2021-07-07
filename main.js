window.onload = () => {
  // values

  const { setVals: setValsGetNextMainBoard, getNextMainBoard } = Comlink.wrap(
    new Worker("worker.js")
  );
  const {
    setVals: setValsGetNextFastBoard,
    getNextFastBoard,
    getCycleLength,
    getStepsToEnterCycle,
  } = Comlink.wrap(new Worker("worker.js"));

  const DOM = {
    board: document.getElementById("board"),
    ctx: document.getElementById("board").getContext("2d"),
    btnCreate: document.getElementById("btn__create"),
    btnPlayPause: document.getElementById("btn__play-pause"),
    btnStep: document.getElementById("btn__step"),
    infoCycleDetected: document.getElementById("info__cycle-detected"),
    infoCycleStepsToEnter: document.getElementById("info__cycle-steps-enter"),
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
    board: null,
    rafID: null,
    cycleDetected: null,
    stepCount: null,
  };

  // util logic

  const paintCell = (board, rowI, colI) => {
    board[rowI][colI] === 1
      ? DOM.ctx.fillRect(
          1 + (colI - 1) * FIXED.fullSize,
          1 + (rowI - 1) * FIXED.fullSize,
          FIXED.cellSize,
          FIXED.cellSize
        )
      : DOM.ctx.clearRect(
          1 + (colI - 1) * FIXED.fullSize,
          1 + (rowI - 1) * FIXED.fullSize,
          FIXED.cellSize,
          FIXED.cellSize
        );
  };

  const resetCycleDetection = () => {
    STATE.cycleDetected = false;
    DOM.infoCycleDetected.innerText = "No Cycle Detected";
    DOM.infoCycleLength.innerText = "";
    DOM.infoCycleStepsToEnter.innerText = "";
    STATE.stepCount = 0;
    DOM.infoStepCount.innerText = `Step Count: ${STATE.stepCount}`;
    setValsGetNextMainBoard(FIXED.rowCount, FIXED.colCount, STATE.board);
    setValsGetNextFastBoard(FIXED.rowCount, FIXED.colCount, STATE.board);
  };

  const tick = async () => {
    const nextFastBoard = !STATE.cycleDetected ? getNextFastBoard() : null;
    const nextBoard = await getNextMainBoard();

    for (let rowI = 1; rowI <= FIXED.rowCount; rowI++) {
      for (let colI = 1; colI <= FIXED.colCount; colI++) {
        if (STATE.board[rowI][colI] !== nextBoard[rowI][colI]) {
          paintCell(nextBoard, rowI, colI);
        }
      }
    }

    STATE.board = nextBoard;

    STATE.stepCount += 1;
    DOM.infoStepCount.innerText = `Step Count: ${STATE.stepCount}`;

    if (!STATE.cycleDetected) {
      const fastBoard = await nextFastBoard;

      for (let rowI = 1; rowI <= FIXED.rowCount; rowI++) {
        for (let colI = 1; colI <= FIXED.colCount; colI++) {
          if (STATE.board[rowI][colI] !== fastBoard[rowI][colI]) return;
        }
      }

      calculateCycleStats();
    }
  };

  const calculateCycleStats = async () => {
    STATE.cycleDetected = true;
    DOM.infoCycleDetected.innerText = "Cycle Detected!";

    DOM.infoCycleLength.innerText = "Calculating Cycle Length...";
    const cycleLength = await getCycleLength();
    DOM.infoCycleLength.innerText = `Cycle Length: ${cycleLength}`;

    DOM.infoCycleStepsToEnter.innerText = "Calculating Steps to Enter Cycle...";
    const stepsToEnterCycle = await getStepsToEnterCycle();
    DOM.infoCycleStepsToEnter.innerText = `Steps to Enter Cycle: ${stepsToEnterCycle}`;
  };

  // listeners

  const create = (evt) => {
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
      Array(FIXED.rowCount + 2),
      () => new Uint8Array(FIXED.colCount + 2)
    );

    // seed empty board
    for (let rowI = 1; rowI <= FIXED.rowCount; rowI++) {
      for (let colI = 1; colI <= FIXED.colCount; colI++) {
        if (Math.random() < FIXED.density) {
          STATE.board[rowI][colI] = 1;
          paintCell(STATE.board, rowI, colI);
        }
      }
    }

    // create "moat" to make it possible to skip edge checks later
    for (let rowI = 1; rowI <= FIXED.rowCount; rowI++) {
      STATE.board[rowI][0] = STATE.board[rowI][FIXED.colCount];
      STATE.board[rowI][FIXED.colCount + 1] = STATE.board[rowI][1];
    }
    STATE.board[0] = new Uint8Array(STATE.board[FIXED.rowCount]);
    STATE.board[FIXED.rowCount + 1] = new Uint8Array(STATE.board[1]);

    resetCycleDetection();
  };

  const toggle = (evt) => {
    if (!STATE.rafID) {
      const { left, top } = DOM.board.getBoundingClientRect();
      const y = Math.abs(Math.floor(evt.clientY - top));
      const x = Math.abs(Math.floor(evt.clientX - left));

      if (x % FIXED.fullSize !== 0 && y % FIXED.fullSize !== 0) {
        const rowI = Math.floor(y / FIXED.fullSize) + 1;
        const colI = Math.floor(x / FIXED.fullSize) + 1;

        const newVal = STATE.board[rowI][colI] === 0 ? 1 : 0;
        STATE.board[rowI][colI] = newVal;
        if (rowI === 1) STATE.board[FIXED.rowCount + 1][colI] = newVal;
        if (rowI === FIXED.rowCount) STATE.board[0][colI] = newVal;
        if (colI === 1) STATE.board[rowI][FIXED.colCount + 1] = newVal;
        if (colI === FIXED.colCount) STATE.board[rowI][0] = newVal;
        paintCell(STATE.board, rowI, colI);
        resetCycleDetection();
      }
    }
  };

  const step = async (evt) => {
    evt.target.disabled = true;
    await tick();
    evt.target.disabled = false;
  };

  const playPause = (evt) => {
    if (STATE.rafID) {
      cancelAnimationFrame(STATE.rafID);
      STATE.rafID = null;
    } else {
      const frames = Number(DOM.inputFrames.value);
      let count = 0;

      const animateSteps = async () => {
        if (count === 0) await tick();

        count += 1;
        count %= frames;
        // make sure animation cycle has not been canceled while awaiting
        if (STATE.rafID) STATE.rafID = requestAnimationFrame(animateSteps);
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
