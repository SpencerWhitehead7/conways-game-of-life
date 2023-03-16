window.onload = () => {
  // values

  const {
    init: initBoard,
    getNext: getNextMainBoard,
    diff,
  } = Comlink.wrap(new Worker("workerBoard.js"));
  const {
    init: initCycle,
    getNext: getNextFastBoard,
    getCycleLength,
    getStepsToEnterCycle,
  } = Comlink.wrap(new Worker("workerCycle.js"));

  const DOM = {
    board: document.getElementById("board"),
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
    webglEnabled: null,
  };

  const STATE = {
    board: null,
    rafID: null,
    cycleDetected: null,
    stepCount: null,
  };

  // util logic

  let paintCells;

  // god and https://webgl2fundamentals.org/ help us if I ever need to refactor this
  const prepareGraphics = () => {
    const width = 1 + FIXED.colCount * FIXED.fullSize;
    const height = 1 + FIXED.rowCount * FIXED.fullSize;

    DOM.board.height = height;
    DOM.board.width = width;

    if (FIXED.webglEnabled) {
      // setup webgl
      // compile shaders, link into a program, tell webgl to use program
      const gl = DOM.board.getContext("webgl2", {
        preserveDrawingBuffer: true,
      });
      const vShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
      const fShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
      const program = createProgram(gl, vShader, fShader);
      gl.useProgram(program);

      // create a vertex array object (for storing attribute state), set it as the one we're working with
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);

      // look up uniform location for resolution
      const resolutionULoc = gl.getUniformLocation(program, "u_resolution");
      // pass in the canvas resolution so we can convert from pixels to clipspace in the shader
      gl.uniform2f(resolutionULoc, gl.canvas.width, gl.canvas.height);
      // tell WebGL how to convert from clipspace to pixels
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

      // look up uniform location for color
      const colorULoc = gl.getUniformLocation(program, "u_color");
      // look up attrib location for vertex data
      const positionALoc = gl.getAttribLocation(program, "a_position");
      // turn on vertex data attribute
      gl.enableVertexAttribArray(positionALoc);

      // clear webgl
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // draw grid
      gl.uniform4f(colorULoc, 1, 0, 0, 0.5); // transparent-ish red
      const VERTICES_PER_LINE = 2;
      const COORDS_PER_LINE = VERTICES_PER_LINE * 2;
      const LINE_COUNT = 2 + FIXED.rowCount + FIXED.colCount;
      const gridLines = new Float32Array(LINE_COUNT * COORDS_PER_LINE);
      for (let i = 0; i <= FIXED.rowCount; i++) {
        // prettier-ignore
        gridLines.set([
            0.5, i * FIXED.fullSize + 0.5,
            FIXED.fullSize * FIXED.colCount + 0.5, i * FIXED.fullSize + 0.5,
          ], i * COORDS_PER_LINE);
        // prettier-unignore
      }
      for (let i = 0; i <= FIXED.colCount; i++) {
        // prettier-ignore
        gridLines.set([
          i * FIXED.fullSize + 0.5, 0.5,
          i * FIXED.fullSize + 0.5, FIXED.fullSize * FIXED.rowCount + 0.5,
        ], (FIXED.rowCount + 1 + i) * COORDS_PER_LINE);
        // prettier-unignore
      }

      // create buffer, set it, add gridLines, tell data attribute how to get data out of gridLines buffer (ARRAY_BUFFER)
      const gridLinesBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, gridLinesBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, gridLines, gl.STATIC_DRAW);
      gl.vertexAttribPointer(
        positionALoc,
        2, // size: 2 vertices per iteration (the ends of the line)
        gl.FLOAT, // type: the data is 32bit floats
        false, // normalize: don't
        0, // stride: move forward size *sizeof(type) each iteration to get the next position
        0 // offset: start at the beginning of the buffer
      );

      gl.drawArrays(
        gl.LINES, // mode: lines (duh)
        0, // offset: start at the beginning of the buffer
        LINE_COUNT * VERTICES_PER_LINE // count: to get every index
      );

      return (isOn, idxs) => {
        if (!idxs.length) return;
        isOn
          ? gl.uniform4f(colorULoc, 0, 0, 1, 1) // blue
          : gl.uniform4f(colorULoc, 1, 1, 1, 1); // white

        // create vertex data for squares
        const VERTICES_PER_SQUARE = 6;
        const COORDS_PER_SQUARE = VERTICES_PER_SQUARE * 2;
        const SQUARE_COUNT = idxs.length;
        const squares = new Float32Array(SQUARE_COUNT * COORDS_PER_SQUARE);
        for (let i = 0; i < idxs.length; i++) {
          const idx = idxs[i];
          const rowI = Math.floor(idx / FIXED.colCount);
          const colI = idx % FIXED.colCount;
          const xBase = 1 + colI * FIXED.fullSize;
          const yBase = 1 + rowI * FIXED.fullSize;
          const xOffset = xBase + FIXED.cellSize;
          const yOffset = yBase + FIXED.cellSize;
          // prettier-ignore
          squares.set([
            xBase, yBase,
            xOffset, yBase,
            xBase, yOffset,
            xBase, yOffset,
            xOffset, yBase,
            xOffset, yOffset,
          ], i * COORDS_PER_SQUARE)
          // prettier-unignore
        }

        // create buffer, set it, add square vertices, tell data attribute how to get data out of squaresBuffer (ARRAY_BUFFER)
        const squaresBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, squaresBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, squares, gl.STATIC_DRAW);
        gl.vertexAttribPointer(
          positionALoc,
          2, // size: 2 components per iteration (the triangles to make a square)
          gl.FLOAT, // type: the data is 32bit floats
          false, // normalize: don't
          0, // stride: move forward size *sizeof(type) each iteration to get the next position
          0 // offset: start at the beginning of the buffer
        );

        gl.drawArrays(
          gl.TRIANGLES, // mode: triangles (duh)
          0, // offset: start at the beginning of the buffer
          SQUARE_COUNT * VERTICES_PER_SQUARE // count: to get every index
        );
      };
    } else {
      // setup canvas
      const ctx = DOM.board.getContext("2d");

      // clear canvas
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);

      // draw grid
      ctx.strokeStyle = "rgba(255, 0, 0, 0.5)"; // transparent-ish red
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let i = 0; i <= FIXED.rowCount; i++) {
        ctx.lineTo(width + 0.5, i * FIXED.fullSize + 0.5);
        ctx.moveTo(0.5, (i + 1) * FIXED.fullSize + 0.5);
      }
      ctx.moveTo(0.5, 0.5);
      for (let i = 0; i <= FIXED.colCount; i++) {
        ctx.lineTo(i * FIXED.fullSize + 0.5, height + 0.5);
        ctx.moveTo((i + 1) * FIXED.fullSize + 0.5, 0.5);
      }
      ctx.stroke();

      return (isOn, idxs) => {
        if (!idxs.length) return;
        ctx.fillStyle = isOn ? "blue" : "white";
        for (let i = 0; i < idxs.length; i++) {
          const idx = idxs[i];
          const rowI = Math.floor(idx / FIXED.colCount);
          const colI = idx % FIXED.colCount;
          ctx.fillRect(
            1 + colI * FIXED.fullSize,
            1 + rowI * FIXED.fullSize,
            FIXED.cellSize,
            FIXED.cellSize
          );
        }
      };
    }
  };

  const resetCycleDetection = () => {
    STATE.cycleDetected = false;
    DOM.infoCycleDetected.innerText = "No Cycle Detected";
    DOM.infoCycleLength.innerText = "";
    DOM.infoCycleStepsToEnter.innerText = "";
    STATE.stepCount = 0;
    DOM.infoStepCount.innerText = `Step Count: ${STATE.stepCount}`;
    initBoard(FIXED.rowCount, FIXED.colCount, STATE.board);
    initCycle(FIXED.rowCount, FIXED.colCount, STATE.board);
  };

  const tick = async () => {
    const nextFastBoard = !STATE.cycleDetected ? getNextFastBoard() : null;
    const nextBoard = await getNextMainBoard();

    const { turnOn, turnOff } = await diff(
      Comlink.transfer(STATE.board, [STATE.board.buffer])
    );

    paintCells(true, turnOn);
    paintCells(false, turnOff);

    STATE.board = nextBoard;

    STATE.stepCount += 1;
    DOM.infoStepCount.innerText = `Step Count: ${STATE.stepCount}`;

    if (!STATE.cycleDetected) {
      const fastBoard = await nextFastBoard;

      for (let i = 0; i < STATE.board.length; i++) {
        if (STATE.board[i] !== fastBoard[i]) return;
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
    evt.preventDefault();
    if (STATE.rafID) playPause();

    FIXED.rowCount = Number(DOM.inputRows.value);
    FIXED.colCount = Number(DOM.inputCols.value);
    FIXED.density = Number(DOM.inputDensity.value / 100);

    FIXED.cellSize = (() => {
      if (FIXED.rowCount > 1024 || FIXED.colCount > 1024) return 4;
      if (FIXED.rowCount > 64 || FIXED.colCount > 64) return 8;
      return 16;
    })();
    FIXED.fullSize = FIXED.cellSize + 1; // for border

    const tgl = document.createElement("canvas").getContext("webgl2");
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/By_example/Detect_WebGL
    FIXED.webglEnabled = tgl && tgl instanceof WebGL2RenderingContext;

    paintCells = prepareGraphics();

    // create empty board
    STATE.board = new Uint8Array(FIXED.rowCount * FIXED.colCount);

    // seed empty board
    const cellsToPaint = [];
    for (let i = 0; i < STATE.board.length; i++) {
      if (Math.random() < FIXED.density) {
        STATE.board[i] = 1;
        cellsToPaint.push(i);
      }
    }
    paintCells(true, cellsToPaint);

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
        const i = rowI * FIXED.colCount + colI;

        const newVal = STATE.board[i] === 0 ? 1 : 0;
        STATE.board[i] = newVal;
        paintCells(newVal === 1, [i]);
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

      const animateSteps = async (nextTick) => {
        if (!nextTick) nextTick = tick();
        if (count === 0) {
          await nextTick;
          nextTick = tick();
        }

        count += 1;
        count %= frames;
        // make sure animation cycle has not been canceled while awaiting
        if (STATE.rafID) {
          STATE.rafID = requestAnimationFrame(() => {
            animateSteps(nextTick);
          });
        }
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

  DOM.btnCreate.click();
};

const vertexShaderSrc = `#version 300 es

// an attribute is an input (in) to a vertex shader
// it will receive data from a buffer
in vec2 a_position;

// used to pass in the resolution of the canvas
uniform vec2 u_resolution;

void main() {
  // convert the position from pixels to 0.0 to 1.0
  vec2 zeroToOne = a_position / u_resolution;

  // convert from 0->1 to 0->2
  vec2 zeroToTwo = zeroToOne * 2.0;

  // convert from 0->2 to -1->+1 (clip space)
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
}
`;

const fragmentShaderSrc = `#version 300 es

// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

// allows you to set color
uniform vec4 u_color;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  // just set the output to the passed in color
  outColor = u_color;
}
`;

const createShader = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const didSucceed = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (didSucceed) return shader;

  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
};

const createProgram = (gl, vShader, fShader) => {
  const program = gl.createProgram();
  gl.attachShader(program, vShader);
  gl.attachShader(program, fShader);
  gl.linkProgram(program);
  const didSucceed = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (didSucceed) return program;

  console.error(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
};
