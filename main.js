import * as Comlink from "https://unpkg.com/comlink@4.4.1/dist/esm/comlink.js";

import { createUpdateCell, doBoardsMatch } from "./boardUtils.js";

const THREAD_COUNT = 2;

const {
  init: initCycleStats,
  getCycleLength,
  getStepsToEnterCycle,
} = Comlink.wrap(new Worker("workerCycleStats.js", { type: "module" }));

const boardWorkers = new Array(THREAD_COUNT)
  .fill()
  .map(() => new Worker("workerBoard.js", { type: "module" }));

const cycleWorkers = new Array(THREAD_COUNT)
  .fill()
  .map(() => new Worker("workerCycle.js", { type: "module" }));

import { newTimer } from "./devHelpers.js";

const tt = newTimer("total");
const bt = newTimer("mainBoard");
const ct = newTimer("cycleBoard");

window.onload = () => {
  // VALUES

  const DOM = {
    board: document.getElementById("board"),
    btnCreate: document.getElementById("btn__create"),
    btnPlayPause: document.getElementById("btn__play-pause"),
    btnStep: document.getElementById("btn__step"),
    infoCycleDetected: document.getElementById("info__cycle-detected"),
    infoCycleStepsToEnter: document.getElementById("info__cycle-steps-enter"),
    infoCycleLength: document.getElementById("info__cycle-length"),
    infoStepCount: document.getElementById("info__step-count"),
    inputRows: document.getElementById("input__rows"),
    inputCols: document.getElementById("input__cols"),
    inputDensity: document.getElementById("input__density"),
    inputFrames: document.getElementById("input__frames"),
  };

  const FIXED = {
    rowCount: function () {
      return Number(DOM.inputRows.value);
    },
    colCount: function () {
      return Number(DOM.inputCols.value);
    },
    density: function () {
      return Number(DOM.inputDensity.value / 100);
    },
    cellSize: function () {
      const rc = this.rowCount();
      const cc = this.colCount();
      if (rc > 1024 || cc > 1024) return 4;
      if (rc > 64 || cc > 64) return 8;
      return 16;
    },
    fullSize: function () {
      return this.cellSize() + 1; // for border
    },
  };

  const STATE = {
    mainBoard: new Uint8Array(),
    cycleBoard: new Uint8Array(),
    rafID: 0,
    cycleDetected: false,
    stepCount: 0,
  };

  // GAME LOGIC

  let paintCells = (isOn, idxs) => {};

  let stepMainBoard = () => new Promise(undefined);
  let stepCycleBoard = () =>
    new Promise({
      turnOnIdxs: new Float32Array(),
      turnOffIdxs: new Float32Array(),
    });

  const resetGame = () => {
    STATE.stepCount = 0;
    STATE.cycleDetected = false;
    STATE.cycleBoard = new Uint8Array(
      new SharedArrayBuffer(STATE.mainBoard.length)
    );
    STATE.cycleBoard.set(STATE.mainBoard);
    DOM.infoStepCount.firstChild.data = STATE.stepCount;
    DOM.infoCycleDetected.innerText = "No Cycle Detected";
    DOM.infoCycleLength.innerText = "";
    DOM.infoCycleStepsToEnter.innerText = "";

    const rc = FIXED.rowCount();
    const cc = FIXED.colCount();

    stepMainBoard = initMainBoard(rc, cc, STATE.mainBoard);
    stepCycleBoard = initCycleBoard(rc, cc, STATE.cycleBoard);
    initCycleStats(rc, cc, new Uint8Array(STATE.mainBoard));
  };

  const tick = async () => {
    tt.beg();
    const cycleBoardStep = !STATE.cycleDetected ? stepCycleBoard() : null;
    bt.beg();
    const { turnOnIdxs, turnOffIdxs } = await stepMainBoard();
    bt.end();

    paintCells(true, turnOnIdxs);
    paintCells(false, turnOffIdxs);

    STATE.stepCount += 1;
    DOM.infoStepCount.firstChild.data = STATE.stepCount;

    if (!STATE.cycleDetected) {
      ct.beg();
      await cycleBoardStep;
      ct.end();

      if (doBoardsMatch(STATE.mainBoard, STATE.cycleBoard)) {
        STATE.cycleDetected = true;
        calculateCycleStats();
      }
    }
    tt.end();
  };

  const calculateCycleStats = async () => {
    DOM.infoCycleDetected.innerText = "Cycle Detected!";

    DOM.infoCycleLength.innerText = "Calculating Cycle Length...";
    const cycleCpy = STATE.cycleBoard.slice();
    const cycleLength = await getCycleLength(
      Comlink.transfer(cycleCpy, [cycleCpy.buffer])
    );
    DOM.infoCycleLength.innerText = `Cycle Length: ${cycleLength}`;

    DOM.infoCycleStepsToEnter.innerText = "Calculating Steps to Enter Cycle...";
    const stepsToEnterCycle = await getStepsToEnterCycle();
    DOM.infoCycleStepsToEnter.innerText = `Steps to Enter Cycle: ${stepsToEnterCycle}`;
  };

  // LISTENERS

  const create = (evt) => {
    evt.preventDefault();
    if (Boolean(STATE.rafID)) playPause();

    const rc = FIXED.rowCount();
    const cc = FIXED.colCount();
    const density = FIXED.density();
    const cellSize = FIXED.cellSize();
    const fullSize = FIXED.fullSize();

    if (
      rc % 2 !== 0 ||
      Math.round(rc) !== rc ||
      cc % 2 !== 0 ||
      Math.round(cc) !== cc
    ) {
      alert("rowCount and colCount must be even integers");
      return;
    }

    paintCells = prepareGraphics(DOM.board, rc, cc, cellSize, fullSize);

    const mainBoardBuffer = new SharedArrayBuffer(rc * cc);
    const mainBoard = new Uint8Array(mainBoardBuffer);
    const turnOn = createUpdateCell(rc, cc, 1, 10, mainBoard);

    const turnOnIdxs = [];
    const turnOffIdxs = [];
    for (let i = 0; i < mainBoard.length; i++) {
      if (Math.random() < density) {
        turnOn(i);
        turnOnIdxs.push(i);
      } else {
        turnOffIdxs.push(i);
      }
    }
    paintCells(true, new Float32Array(turnOnIdxs));
    paintCells(false, new Float32Array(turnOffIdxs));

    STATE.mainBoard = mainBoard;
    resetGame();
  };

  const toggle = (evt) => {
    if (!STATE.rafID) {
      const rc = FIXED.rowCount();
      const cc = FIXED.colCount();
      const fs = FIXED.fullSize();

      const { left, top } = DOM.board.getBoundingClientRect();
      const y = Math.abs(Math.floor(evt.clientY - top));
      const x = Math.abs(Math.floor(evt.clientX - left));

      if (x % fs !== 0 && y % fs !== 0) {
        const rowI = Math.floor(y / fs);
        const colI = Math.floor(x / fs);
        const i = rowI * cc + colI;

        const wasAlive = (STATE.mainBoard[i] & 1) === 1;
        createUpdateCell(
          rc,
          cc,
          wasAlive ? -1 : 1,
          wasAlive ? -10 : 10,
          STATE.mainBoard
        )(i);
        paintCells(!wasAlive, new Float32Array([i]));
        resetGame();
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
      STATE.rafID = 0;
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
        // make sure animation cycle has not been cancelled while awaiting
        if (STATE.rafID) {
          STATE.rafID = requestAnimationFrame(() => {
            animateSteps(nextTick);
          });
        }
      };

      STATE.rafID = requestAnimationFrame(animateSteps);
    }

    const isPlaying = Boolean(STATE.rafID);
    DOM.inputFrames.disabled = isPlaying;
    DOM.btnStep.disabled = isPlaying;
    DOM.btnPlayPause.innerText = isPlaying ? "Pause" : "Play";
  };

  DOM.btnCreate.addEventListener("click", create);

  DOM.board.addEventListener("click", toggle);

  DOM.btnStep.addEventListener("click", step);

  DOM.btnPlayPause.addEventListener("click", playPause);

  DOM.btnCreate.click();
};

// BOARD UPDATE

export const initMainBoard = (rowCount, colCount, board) => {
  const turnOnIdxSab = new Uint32Array(new SharedArrayBuffer(4));
  const turnOffIdxSab = new Uint32Array(new SharedArrayBuffer(4));

  const turnOnIdxsSab = new Float32Array(
    new SharedArrayBuffer(rowCount * colCount * 4)
  );
  const turnOffIdxsSab = new Float32Array(
    new SharedArrayBuffer(rowCount * colCount * 4)
  );

  const nextBoard = new Uint8Array(new SharedArrayBuffer(board.length));
  nextBoard.set(board);

  const waitSab = new Int32Array(
    new SharedArrayBuffer(boardWorkers.length * 4)
  );

  return async () => {
    turnOnIdxSab[0] = 0;
    turnOffIdxSab[0] = 0;

    const workersDone = Promise.all(
      boardWorkers
        .map((_, idx) => Atomics.waitAsync(waitSab, idx, 0))
        .map(({ value }) => value)
    );
    boardWorkers.forEach((w, idx) => {
      w.postMessage({
        board,
        nextBoard,
        rc: rowCount,
        cc: colCount,
        startIdx: Math.floor((idx * board.length) / boardWorkers.length),
        endIdx: Math.floor(((idx + 1) * board.length) / boardWorkers.length),
        turnOnIdxSab,
        turnOffIdxSab,
        turnOnIdxsSab,
        turnOffIdxsSab,
        waitSab,
        waitSabIdx: idx,
      });
    });
    await workersDone;

    board.set(nextBoard);

    return {
      turnOnIdxs: turnOnIdxsSab.slice(0, turnOnIdxSab[0]),
      turnOffIdxs: turnOffIdxsSab.slice(0, turnOffIdxSab[0]),
    };
  };
};

export const initCycleBoard = (rowCount, colCount, board) => {
  const nextBoard = new Uint8Array(new SharedArrayBuffer(board.length));
  nextBoard.set(board);

  const waitSab = new Int32Array(
    new SharedArrayBuffer(cycleWorkers.length * 4)
  );

  const step = async () => {
    const workersDone = Promise.all(
      cycleWorkers
        .map((_, idx) => Atomics.waitAsync(waitSab, idx, 0))
        .map(({ value }) => value)
    );
    cycleWorkers.forEach((w, idx) => {
      w.postMessage({
        board,
        nextBoard,
        rc: rowCount,
        cc: colCount,
        startIdx: Math.floor((idx * board.length) / cycleWorkers.length),
        endIdx: Math.floor(((idx + 1) * board.length) / cycleWorkers.length),
        waitSab,
        waitSabIdx: idx,
      });
    });
    await workersDone;

    board.set(nextBoard);
  };

  return async () => {
    await step();
    await step();
  };
};

// GRAPHICS

// god and https://webgl2fundamentals.org/ help us if I ever need to refactor this
const prepareGraphics = (canvas, rc, cc, cellSize, fullSize) => {
  canvas.width = 1 + cc * fullSize;
  canvas.height = 1 + rc * fullSize;

  // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/By_example/Detect_WebGL
  const tgl = document
    .createElement("canvas")
    .getContext("webgl2", { failIfMajorPerformanceCaveat: true });
  if (tgl instanceof WebGL2RenderingContext) {
    // setup webgl
    const gl = canvas.getContext("webgl2", {
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
    gl.uniform1f(cellSizeULoc, cellSize);
    gl.uniform1f(fullSizeULoc, fullSize);
    gl.uniform1f(colCountULoc, cc);
    gl.uniform1f(totalOffsetULoc, 1 + cellSize / 2);
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
    const ctx = canvas.getContext("2d");

    return (isOn, idxs) => {
      if (!idxs.length) return;
      ctx.fillStyle = isOn ? "blue" : "white";
      for (let i = 0; i < idxs.length; i++) {
        const idx = idxs[i];
        const rowI = Math.floor(idx / cc);
        const colI = idx % cc;
        ctx.fillRect(
          1 + colI * fullSize,
          1 + rowI * fullSize,
          cellSize,
          cellSize
        );
      }
    };
  }
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
