window.onload = () => {
  const BOARD = document.getElementById("board");
  const BTN_CREATE = document.getElementById("create_btn");
  const BTN_STEP = document.getElementById("step_btn");
  const BTN_PLAY_PAUSE = document.getElementById("play_btn");
  const INPUT_ROWS = document.getElementById("rows");
  const INPUT_COLS = document.getElementById("columns");
  const INPUT_DENSITY = document.getElementById("density");
  const INPUT_FRAMES = document.getElementById("frames");

  const CTX = BOARD.getContext("2d");
  const BORDER_SIZE = 1;
  const CELL_SIZE = 16;
  const FULL_SIZE = CELL_SIZE + BORDER_SIZE;

  const paintCell = (rowI, colI) => {
    CTX[GOL.board[rowI][colI] ? "fillRect" : "clearRect"](
      1 + colI * FULL_SIZE,
      1 + rowI * FULL_SIZE,
      CELL_SIZE,
      CELL_SIZE
    );
  };

  const paintBoard = () => {
    GOL.board.forEach((row, rowI) => {
      row.forEach((_, colI) => {
        paintCell(rowI, colI);
      });
    });
  };

  let GOL = null;
  let RAF_ID = null;

  BTN_CREATE.addEventListener("click", () => {
    if (RAF_ID) BTN_PLAY_PAUSE.click();

    const rowCount = Number(INPUT_ROWS.value);
    const colCount = Number(INPUT_COLS.value);
    const density = Number(INPUT_DENSITY.value) / 100;
    GOL = new GameOfLife(rowCount, colCount, density);

    const height = 1 + rowCount * FULL_SIZE;
    const width = 1 + colCount * FULL_SIZE;

    CTX.canvas.height = height;
    CTX.canvas.width = width;

    CTX.strokeStyle = "lightgray";
    CTX.beginPath();
    CTX.moveTo(0, 0);
    for (let i = 0; i <= rowCount; i++) {
      CTX.lineTo(width, i * FULL_SIZE);
      CTX.moveTo(0, (i + 1) * FULL_SIZE);
    }
    CTX.moveTo(0, 0);
    for (let i = 0; i <= colCount; i++) {
      CTX.lineTo(i * FULL_SIZE, height);
      CTX.moveTo((i + 1) * FULL_SIZE, 0);
    }
    CTX.stroke();

    CTX.fillStyle = "darkBlue";
    paintBoard();
  });

  BOARD.addEventListener("click", (evt) => {
    const { left, top } = BOARD.getBoundingClientRect();
    const y = Math.abs(Math.floor(evt.clientY - top));
    const x = Math.abs(Math.floor(evt.clientX - left));

    if (x % FULL_SIZE !== 0 && y % FULL_SIZE !== 0) {
      const rowI = Math.floor(y / FULL_SIZE);
      const colI = Math.floor(x / FULL_SIZE);

      GOL.toggle(rowI, colI);
      paintCell(rowI, colI);
    }
  });

  BTN_STEP.addEventListener("click", () => {
    GOL.tick();
    paintBoard();
  });

  BTN_PLAY_PAUSE.addEventListener("click", () => {
    if (RAF_ID) {
      cancelAnimationFrame(RAF_ID);
      RAF_ID = null;
    } else {
      const frames = Number(INPUT_FRAMES.value);
      let count = 0;

      const animateSteps = () => {
        if (count === 0) {
          GOL.tick();
          paintBoard();
        }

        count += 1;
        count %= frames;
        RAF_ID = requestAnimationFrame(animateSteps);
      };

      RAF_ID = requestAnimationFrame(animateSteps);
    }
    INPUT_FRAMES.disabled = Boolean(RAF_ID);
    BTN_STEP.disabled = Boolean(RAF_ID);
    BTN_PLAY_PAUSE.innerText = RAF_ID ? "Pause" : "Play";
  });

  BTN_CREATE.click();
};
