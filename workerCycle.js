import * as Comlink from "https://unpkg.com/comlink@4.4.2/dist/esm/comlink.js";

import { doBoardsMatch, getBoardSMem, getGameLogic } from "./boardUtils.js";

import { newTimer } from "./devHelpers.js";

const tt = newTimer("CYCLE_BOARD - total", 40);

Comlink.expose({
  originalSMem: getBoardSMem(),
  slowSMem: getBoardSMem(),
  fastSMem: getBoardSMem(),

  rowCount: null,
  colCount: null,

  cycleLength: null,

  step: null,

  init: async function (rowCount, colCount, cycleBoardSMem) {
    const { step } = await getGameLogic(cycleBoardSMem, rowCount, colCount);

    this.originalSMem = cycleBoardSMem;
    this.slowSMem = getBoardSMem(cycleBoardSMem);
    this.fastSMem = getBoardSMem(cycleBoardSMem);

    this.rowCount = rowCount;
    this.colCount = colCount;

    this.cycleLength = 0;

    this.step = () => {
      tt.beg();
      step();
      tt.end();
    };
  },
  getNext: function () {
    this.step();
    this.step();
  },
  getCycleLength: function () {
    const base = getBoardSMem(this.originalSMem);
    this.cycleLength = 1;
    this.step();
    while (!doBoardsMatch(base, this.originalSMem)) {
      this.cycleLength++;
      this.step();
    }

    return this.cycleLength;
  },
  getStepsToEnterCycle: async function () {
    const { step: fastStep } = await getGameLogic(
      this.fastSMem,
      this.rowCount,
      this.colCount
    );

    for (
      let cycleCountUp = 0;
      cycleCountUp < this.cycleLength;
      cycleCountUp++
    ) {
      fastStep();
    }

    const { step: slowStep } = await getGameLogic(
      this.slowSMem,
      this.rowCount,
      this.colCount
    );

    let stepsToEnterCycle = 0;
    while (!doBoardsMatch(this.slowSMem, this.fastSMem)) {
      fastStep();
      slowStep();
      stepsToEnterCycle++;
    }

    return stepsToEnterCycle;
  },
});
