import * as Comlink from "https://unpkg.com/comlink@4.4.1/dist/esm/comlink.js";

import { createUpdateCell, ptlCellI } from "./boardUtils.js";

Comlink.expose({
  step: null,

  init: function (rowCount, colCount) {
    const turnOnIdxsPreallocated = new Float32Array(rowCount * colCount);
    const turnOffIdxsPreallocated = new Float32Array(rowCount * colCount);

    this.step = (board) => {
      const nextBoard = new Uint8Array(board);
      const dataView = new DataView(board.buffer);
      const turnOn = createUpdateCell(rowCount, colCount, 1, nextBoard);
      const turnOff = createUpdateCell(rowCount, colCount, -1, nextBoard);

      let turnOnI = 0;
      let turnOffI = 0;

      for (let pi = 0; pi < board.length; pi += 5) {
        let cellBlock = board[pi];
        let liveNeighborCountBlock = dataView.getUint32(pi + 1);
        let po = 0;
        while (cellBlock > 0 || liveNeighborCountBlock > 0) {
          let cell = cellBlock & 0b1;
          let liveNeighborCount = liveNeighborCountBlock & 0b1111;
          // Any live cell with two or three live neighbours survives.
          // Similarly, all other dead cells stay dead.
          if (cell === 0 && liveNeighborCount === 3) {
            // Any dead cell with three live neighbours becomes a live cell.
            const li = ptlCellI(pi, po);
            turnOn(li, pi, po);
            turnOnIdxsPreallocated[turnOnI++] = li;
          } else if (
            cell === 1 &&
            (liveNeighborCount < 2 || liveNeighborCount > 3)
          ) {
            // All other live cells die in the next generation.
            const li = ptlCellI(pi, po);
            turnOff(li, pi, po);
            turnOffIdxsPreallocated[turnOffI++] = li;
          }

          cellBlock >>>= 1;
          liveNeighborCountBlock >>>= 4;
          po++;
        }
      }

      const turnOnIdxs = turnOnIdxsPreallocated.slice(0, turnOnI);
      const turnOffIdxs = turnOffIdxsPreallocated.slice(0, turnOffI);

      return Comlink.transfer({ nextBoard, turnOnIdxs, turnOffIdxs }, [
        nextBoard.buffer,
        turnOnIdxs.buffer,
        turnOffIdxs.buffer,
      ]);
    };
  },
  getNext: function (board) {
    return this.step(board);
  },
});
