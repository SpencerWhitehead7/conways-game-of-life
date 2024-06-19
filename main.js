import { newTimer } from "./devHelpers.js";

const tt = newTimer("total");
const bt = newTimer("mainBoard");
const wt = newTimer("cycleBoard");

import * as Comlink from "https://unpkg.com/comlink@4.4.1/dist/esm/comlink.js";

import { createUpdateCell, doBoardsMatch } from "./boardUtils.js";

const { init: initBoard, getNext: getNextMainBoard } = Comlink.wrap(
  new Worker("workerBoard.js", { type: "module" })
);

const {
  init: initCycle,
  getNext: getNextCycleBoard,
  getCycleLength,
  getStepsToEnterCycle,
} = Comlink.wrap(new Worker("workerCycle.js", { type: "module" }));

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
    mainBoard: new WebAssembly.Memory({ initial: 1, maximum: 1, shared: true }),
    cycleBoard: new Uint8Array(),
    onIdxs: new WebAssembly.Memory({ initial: 1, maximum: 1, shared: true }),
    offIdxs: new WebAssembly.Memory({ initial: 1, maximum: 1, shared: true }),
    notifiers: new Float32Array(new SharedArrayBuffer(2 * 4)),
    rafID: 0,
    cycleDetected: false,
    stepCount: 0,
  };

  // GAME LOGIC

  let paintCells = (isOn, idxs) => {};

  const resetGame = () => {
    STATE.stepCount = 0;
    STATE.cycleDetected = false;
    STATE.cycleBoard = new Uint8Array(STATE.mainBoard);
    STATE.notifiers = new Int32Array(new SharedArrayBuffer(3 * 4));
    DOM.infoStepCount.firstChild.data = STATE.stepCount;
    DOM.infoCycleDetected.innerText = "No Cycle Detected";
    DOM.infoCycleLength.innerText = "";
    DOM.infoCycleStepsToEnter.innerText = "";
    initBoard(
      FIXED.rowCount(),
      FIXED.colCount(),
      STATE.mainBoard,
      STATE.onIdxs,
      STATE.offIdxs,
      STATE.notifiers
    );
    initCycle(FIXED.rowCount(), FIXED.colCount(), STATE.mainBoard);
  };

  const tick = async () => {
    tt.beg();
    const nextCycleBoard = !STATE.cycleDetected
      ? getNextCycleBoard(
          Comlink.transfer(STATE.cycleBoard, [STATE.cycleBoard.buffer])
        )
      : null;
    bt.beg();
    const nmbRes = getNextMainBoard();
    await Atomics.waitAsync(STATE.notifiers, 0, 0);
    const { onPtr, offPtr } = await nmbRes;
    bt.end();

    paintCells(true, STATE.onIdxs.buffer, onPtr);
    paintCells(false, STATE.offIdxs.buffer, offPtr);

    STATE.stepCount += 1;
    DOM.infoStepCount.firstChild.data = STATE.stepCount;

    if (!STATE.cycleDetected) {
      wt.beg();
      STATE.cycleBoard = await nextCycleBoard;
      wt.end();

      if (doBoardsMatch(STATE.mainBoard, STATE.cycleBoard)) {
        STATE.cycleDetected = true;
        calculateCycleStats(STATE.cycleBoard);
      }
    }
    tt.end();
  };

  const calculateCycleStats = async (cycleBoard) => {
    DOM.infoCycleDetected.innerText = "Cycle Detected!";

    DOM.infoCycleLength.innerText = "Calculating Cycle Length...";
    const cycleLength = await getCycleLength(
      Comlink.transfer(cycleBoard, [cycleBoard.buffer])
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

    paintCells = prepareGraphics(DOM.board, rc, cc, cellSize, fullSize);

    // do main first as POC
    // 3 wasm memory instances (board, turnOnIdxs, turnOffIdxs)
    //   - all three need to be shared
    // instantiate memories in main, fill in board, actually used turnOnIdxs (instead of one off array)
    // share them with worker on init
    // create wasm module in worker on init, takes in all three shared memories
    // have wasm module chug through board, update idx modules
    // use idx modules in worker to actually perform updates on board
    // use simd in wasm module
    // maybe investigate using simd to update board?

    // off needs 3 wasm memory instances (board, turnOnIdxs, turnOffIdxs)
    //   - only board needs to be shared

    const boardSMem = new WebAssembly.Memory({
      initial: 64,
      maximum: 64,
      shared: true,
    }); // exactly one max-sized board (2048x2048)
    const onIdxsSMem = new WebAssembly.Memory({
      initial: 64 * 4,
      maximum: 64 * 4,
      shared: true,
    }); // one f32 per index (2048x2048x4)
    const offIdxsSMem = new WebAssembly.Memory({
      initial: 64 * 4,
      maximum: 64 * 4,
      shared: true,
    }); // one f32 per index (2048x2048x4)

    const board = new Uint8Array(boardSMem.buffer);
    const onIdxs = new Float32Array(onIdxsSMem.buffer);
    const offIdxs = new Float32Array(offIdxsSMem.buffer);

    const turnOn = createUpdateCell(rc, cc, 1, 10, board);

    let onPtr = 0;
    let offPtr = 0;
    for (let i = 0; i < rc * cc; i++) {
      if (Math.random() < density) {
        turnOn(i);
        onIdxs[onPtr++] = i;
      } else {
        offIdxs[offPtr++] = i;
      }
    }
    paintCells(true, onIdxs, onPtr);
    paintCells(false, offIdxs, offPtr);

    console.log("main", { boardSMem, onIdxsSMem, offIdxsSMem });

    STATE.mainBoard = boardSMem;
    STATE.onIdxs = onIdxsSMem;
    STATE.offIdxs = offIdxsSMem;
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

        const boardView = new Uint8Array(STATE.mainBoard.buffer);

        const wasAlive = (boardView[i] & 1) === 1;
        createUpdateCell(
          rc,
          cc,
          wasAlive ? -1 : 1,
          wasAlive ? -10 : 10,
          boardView
        )(i);
        paintCells(!wasAlive, new Float32Array([i]), 1);
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

    return (isOn, idxs, ptr) => {
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
        ptr // count: up to the end of the written length
      );
    };
  } else {
    const ctx = canvas.getContext("2d");

    return (isOn, idxs, ptr) => {
      ctx.fillStyle = isOn ? "blue" : "white";
      for (let i = 0; i < ptr; i++) {
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
