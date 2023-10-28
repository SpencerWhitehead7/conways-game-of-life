import * as Comlink from "https://unpkg.com/comlink@4.4.1/dist/esm/comlink.js";

import { createUpdateCell, doBoardsMatch } from "./boardUtils.js";

window.onload = () => {
  // values

  const { init: initBoard, getNext: getNextMainBoard } = Comlink.wrap(
    new Worker("workerBoard.js", { type: "module" })
  );
  const {
    init: initCycle,
    getNext: getNextCycleBoard,
    getCycleLength,
    getStepsToEnterCycle,
  } = Comlink.wrap(new Worker("workerCycle.js", { type: "module" }));

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
  };

  const STATE = {
    mainBoard: null,
    cycleBoard: null,
    rafID: null,
    cycleDetected: null,
    stepCount: null,
  };

  // util logic

  let paintCells = null;

  // god and https://webgl2fundamentals.org/ help us if I ever need to refactor this
  const prepareGraphics = () => {
    const width = 1 + FIXED.colCount * FIXED.fullSize;
    const height = 1 + FIXED.rowCount * FIXED.fullSize;

    DOM.board.height = height;
    DOM.board.width = width;

    // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/By_example/Detect_WebGL
    const tgl = document
      .createElement("canvas")
      .getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (tgl instanceof WebGL2RenderingContext) {
      // setup webgl
      const gl = DOM.board.getContext("webgl2", {
        antialias: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
      });
      // compile shaders, link into a program, tell webgl to use program
      const program = createProgram(
        gl,
        createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc),
        createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc)
      );
      gl.useProgram(program);

      // create a vertex array object (for storing attribute state)
      const vao = gl.createVertexArray();
      // set it as the one we're working with
      gl.bindVertexArray(vao);

      // vertex shader
      // look up uniform locations
      const cellSizeULoc = gl.getUniformLocation(program, "uCellSize");
      const fullSizeULoc = gl.getUniformLocation(program, "ufullSize");
      const colCountULoc = gl.getUniformLocation(program, "uColCount");
      const totalOffsetULoc = gl.getUniformLocation(program, "uTotalOffset");
      const resolutionULoc = gl.getUniformLocation(program, "uResolution");
      // pass data into uniform locations
      gl.uniform1f(cellSizeULoc, FIXED.cellSize);
      gl.uniform1f(fullSizeULoc, FIXED.fullSize);
      gl.uniform1f(colCountULoc, FIXED.colCount);
      gl.uniform1f(totalOffsetULoc, 1 + FIXED.cellSize / 2);
      gl.uniform2f(resolutionULoc, gl.canvas.width, gl.canvas.height);
      // look up attrib locations
      const cellALoc = gl.getAttribLocation(program, "aCell");
      // turn on attribs
      gl.enableVertexAttribArray(cellALoc);

      // fragment shader
      // look up uniform locations
      const colorULoc = gl.getUniformLocation(program, "uColor");

      // tell WebGL how to convert from clipspace to pixels
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

      // clear webgl
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      return (isOn, idxs) => {
        if (!idxs.length) return;
        isOn
          ? gl.uniform4f(colorULoc, 0, 0, 1, 1) // blue
          : gl.uniform4f(colorULoc, 1, 1, 1, 1); // white

        // create buffer
        const idxsBuffer = gl.createBuffer();
        // set it to the gl.ARRAY_BUFFER attachment point
        gl.bindBuffer(gl.ARRAY_BUFFER, idxsBuffer);
        // add input tell data attribute how to get data out of gridLines buffer (usage)
        gl.bufferData(gl.ARRAY_BUFFER, idxs, gl.STATIC_DRAW);
        // attach the buffer currently attached to gl.ARRAY_BUFFER attachment point to cellALoc instead
        // provide instructions for pulling data from the buffer to the shaders
        gl.vertexAttribPointer(
          cellALoc, // new attachment point for the buffer currently attached to gl.ARRAY_BUFFER
          1, // size: 1 component per iteration (idx of the cell to paint, shader calculates centerpoint coords)
          gl.FLOAT, // type: the data is 32bit floats
          false, // normalize: don't
          0, // stride: move forward size *sizeof(type) each iteration to get the next position
          0 // offset: start at the beginning of the buffer
        );

        gl.drawArrays(
          gl.POINTS, // mode: points (duh)
          0, // offset: start at the beginning of the buffer
          idxs.length // count: get every index
        );
      };
    } else {
      const ctx = DOM.board.getContext("2d");

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
    STATE.stepCount = 0;
    STATE.cycleDetected = false;
    STATE.cycleBoard = new Uint8Array(STATE.mainBoard);
    DOM.infoStepCount.firstChild.data = STATE.stepCount;
    DOM.infoCycleDetected.innerText = "No Cycle Detected";
    DOM.infoCycleLength.innerText = "";
    DOM.infoCycleStepsToEnter.innerText = "";
    initBoard(FIXED.rowCount, FIXED.colCount);
    initCycle(FIXED.rowCount, FIXED.colCount, STATE.mainBoard);
  };

  const tick = async () => {
    const nextCycleBoard = !STATE.cycleDetected
      ? getNextCycleBoard(
          Comlink.transfer(STATE.cycleBoard, [STATE.cycleBoard.buffer])
        )
      : null;
    const { nextBoard, turnOnIdxs, turnOffIdxs } = await getNextMainBoard(
      Comlink.transfer(STATE.mainBoard, [STATE.mainBoard.buffer])
    );

    paintCells(true, turnOnIdxs);
    paintCells(false, turnOffIdxs);

    STATE.mainBoard = nextBoard;

    STATE.stepCount += 1;
    DOM.infoStepCount.firstChild.data = STATE.stepCount;

    if (!STATE.cycleDetected) {
      STATE.cycleBoard = await nextCycleBoard;

      if (doBoardsMatch(STATE.mainBoard, STATE.cycleBoard)) {
        calculateCycleStats();
      }
    }
  };

  const calculateCycleStats = async () => {
    STATE.cycleDetected = true;
    DOM.infoCycleDetected.innerText = "Cycle Detected!";

    DOM.infoCycleLength.innerText = "Calculating Cycle Length...";
    const cycleLength = await getCycleLength(
      Comlink.transfer(STATE.cycleBoard, [STATE.cycleBoard.buffer])
    );
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

    const board = new Uint8Array(FIXED.rowCount * FIXED.colCount);
    const turnOn = createUpdateCell(
      FIXED.rowCount,
      FIXED.colCount,
      1,
      10,
      board
    );
    paintCells = prepareGraphics();

    const turnOnIdxs = [];
    const turnOffIdxs = [];
    for (let i = 0; i < board.length; i++) {
      if (Math.random() < FIXED.density) {
        turnOn(i);
        turnOnIdxs.push(i);
      } else {
        turnOffIdxs.push(i);
      }
    }
    paintCells(true, new Float32Array(turnOnIdxs));
    paintCells(false, new Float32Array(turnOffIdxs));

    STATE.mainBoard = board;
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

        const wasAlive = (STATE.mainBoard[i] & 1) === 1;
        (wasAlive
          ? createUpdateCell(
              FIXED.rowCount,
              FIXED.colCount,
              -1,
              -10,
              STATE.mainBoard
            )
          : createUpdateCell(
              FIXED.rowCount,
              FIXED.colCount,
              1,
              10,
              STATE.mainBoard
            ))(i);
        paintCells(!wasAlive, new Float32Array([i]));
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

// allows you to pass in variables from application code
uniform float uCellSize;
uniform float ufullSize;
uniform float uColCount;
uniform float uTotalOffset;
uniform vec2 uResolution;

// allows you to pass input data to the shader from a buffer
in float aCell;

void main() {
  float rowI = floor(aCell / uColCount);
  float colI = mod(aCell, uColCount);

  float x = uTotalOffset + colI * ufullSize;
  float y = uTotalOffset + rowI * ufullSize;

  vec2 coords = vec2(x, y);

  // convert the position from pixels to 0.0 to 1.0
  vec2 zeroToOne = coords / uResolution;

  // convert from 0->1 to 0->2
  vec2 zeroToTwo = zeroToOne * 2.0;

  // convert from 0->2 to -1->+1 (clip space)
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_PointSize = uCellSize;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
}
`;

const fragmentShaderSrc = `#version 300 es

// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
// I am using lowp because these colors do not need to be precise
precision lowp float;

uniform vec4 uColor;

// we need an output, the color to draw, for the fragment shader
out vec4 outColor;

void main() {
  // always just set the output color to the input color
  outColor = uColor;
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
