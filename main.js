window.onload = () => {
  const BOARD = document.getElementById("board");
  const BTN_CREATE = document.getElementById("create_btn");
  const BTN_STEP = document.getElementById("step_btn");
  const BTN_PLAY_PAUSE = document.getElementById("play_btn");
  const INPUT_ROWS = document.getElementById("rows");
  const INPUT_COLS = document.getElementById("columns");
  const INPUT_DENSITY = document.getElementById("density");
  const INPUT_FRAMES = document.getElementById("frames");

  let GOL = null;
  let RAF_ID = null;

  BTN_CREATE.addEventListener("click", () => {
    if (RAF_ID) BTN_PLAY_PAUSE.click();

    const rowCount = Number(INPUT_ROWS.value);
    const colCount = Number(INPUT_COLS.value);
    const density = Number(INPUT_DENSITY.value) / 100;
    GOL = new GameOfLife(rowCount, colCount, density);

    const TABLE = document.createElement("tbody");
    GOL.board.forEach((row, rowI) => {
      const TR = document.createElement("tr");
      row.forEach((cell, colI) => {
        const TD = document.createElement("td");
        TD.dataset.row = rowI;
        TD.dataset.col = colI;
        TD.dataset.val = cell;
        TR.append(TD);
      });
      TABLE.append(TR);
    });

    BOARD.removeChild(board.firstElementChild);
    BOARD.append(TABLE);
  });

  BOARD.addEventListener("click", (evt) => {
    const { row, col } = evt.target.dataset;
    GOL.toggle(row, col);
    evt.target.dataset.val = GOL.board[row][col];
  });

  BTN_STEP.addEventListener("click", () => {
    GOL.tick();
    [...BOARD.getElementsByTagName("td")].forEach((TD) => {
      TD.dataset.val = GOL.board[TD.dataset.row][TD.dataset.col];
    });
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
          [...BOARD.getElementsByTagName("td")].forEach((TD) => {
            TD.dataset.val = GOL.board[TD.dataset.row][TD.dataset.col];
          });
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
