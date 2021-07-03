window.onload = () => {
  const BOARD = document.getElementById("board");
  const BTN_CREATE = document.getElementById("create_btn");
  const BTN_STEP = document.getElementById("step_btn");
  const BTN_PLAY_PAUSE = document.getElementById("play_btn");
  const INPUT_ROWS = document.getElementById("rows");
  const INPUT_COLS = document.getElementById("columns");
  const INPUT_DENSITY = document.getElementById("density");
  const INPUT_FRAMES = document.getElementById("frames");
  const INFO_STEP_COUNT = document.getElementById("info_step_count");
  const INFO_CYCLE_DETECT = document.getElementById("info_cycle_detect");

  let GOL = null;
  let RAF_ID = null;

  BTN_CREATE.addEventListener("click", () => {
    if (RAF_ID) BTN_PLAY_PAUSE.click();

    GOL = new GameOfLife(
      Number(INPUT_ROWS.value),
      Number(INPUT_COLS.value),
      Number(INPUT_DENSITY.value),
      BOARD.getContext("2d"),
      INFO_STEP_COUNT,
      INFO_CYCLE_DETECT
    );
  });

  BOARD.addEventListener("click", (evt) => {
    const { left, top } = BOARD.getBoundingClientRect();
    const y = Math.abs(Math.floor(evt.clientY - top));
    const x = Math.abs(Math.floor(evt.clientX - left));

    if (x % GOL.FULL_SIZE !== 0 && y % GOL.FULL_SIZE !== 0) {
      const rowI = Math.floor(y / GOL.FULL_SIZE);
      const colI = Math.floor(x / GOL.FULL_SIZE);

      GOL.toggle(rowI, colI);
    }
  });

  BTN_STEP.addEventListener("click", () => {
    GOL.tick();
  });

  BTN_PLAY_PAUSE.addEventListener("click", () => {
    if (RAF_ID) {
      cancelAnimationFrame(RAF_ID);
      RAF_ID = null;
    } else {
      const frames = Number(INPUT_FRAMES.value);
      let count = 0;

      const animateSteps = () => {
        if (count === 0) GOL.tick();

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
