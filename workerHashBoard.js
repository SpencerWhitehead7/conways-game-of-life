import * as Comlink from "https://unpkg.com/comlink@4.4.1/dist/esm/comlink.js";

import { createToggleCell } from "./boardUtils.js";

Comlink.expose({
  step: null,
  getHash: null,

  currentHash: null,
  allHashes: null,
  isInCycle: null,

  init: async function (rowCount, colCount, board) {
    const turnOnIdxsPreallocated = new Float32Array(rowCount * colCount);
    const turnOffIdxsPreallocated = new Float32Array(rowCount * colCount);

    this.step = async (board) => {
      const nextBoard = new Uint8Array(board);
      const toggleCell = createToggleCell(rowCount, colCount, nextBoard);

      let turnOnI = 0;
      let turnOffI = 0;

      for (let i = 0; i < board.length; i++) {
        // Any live cell with two or three live neighbours survives.
        // Similarly, all other dead cells stay dead.
        const cell = board[i];
        if (cell === 30) {
          // Any dead cell with three live neighbours becomes a live cell.
          toggleCell(i, 1);
          turnOnIdxsPreallocated[turnOnI++] = i;
        } else if ((cell & 1) === 1 && (cell < 21 || cell > 31)) {
          // All other live cells die in the next generation.
          toggleCell(i, -1);
          turnOffIdxsPreallocated[turnOffI++] = i;
        }
      }

      const turnOnIdxs = turnOnIdxsPreallocated.slice(0, turnOnI);
      const turnOffIdxs = turnOffIdxsPreallocated.slice(0, turnOffI);

      if (!this.isInCycle) {
        this.currentHash = await this.getHash(nextBoard);
        if (this.allHashes.has(this.currentHash)) {
          this.isInCycle = true;
        }
        this.allHashes.add(this.currentHash);
      }

      return Comlink.transfer(
        { nextBoard, turnOnIdxs, turnOffIdxs, isInCycle: this.isInCycle },
        [nextBoard.buffer, turnOnIdxs.buffer, turnOffIdxs.buffer]
      );
    };

    const decoder = new TextDecoder();
    this.getHash = async (board) =>
      decoder.decode(await crypto.subtle.digest("SHA-512", board));

    this.currentHash = await this.getHash(new Uint8Array(board));
    this.allHashes = new Set([this.currentHash]);
    this.isInCycle = false;
  },
  getNext: async function (board) {
    return this.step(board);
  },
  getCycleStats: function () {
    let stepsToEnterCycle = 0;
    for (const boardHash of this.allHashes.values()) {
      if (boardHash === this.currentHash) break;
      stepsToEnterCycle++;
    }

    return {
      cycleLength: this.allHashes.size - stepsToEnterCycle,
      stepsToEnterCycle,
    };
  },
});
