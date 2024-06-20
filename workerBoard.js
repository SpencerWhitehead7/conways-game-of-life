import * as Comlink from "https://unpkg.com/comlink@4.4.1/dist/esm/comlink.js";

import { createUpdateNeighbors, ptlCellI } from "./boardUtils.js";

Comlink.expose({
  step: null,

  init: function (rowCount, colCount, board) {
    const turnOnIdxsPreallocated = new Float32Array(rowCount * colCount);
    const turnOffIdxsPreallocated = new Float32Array(rowCount * colCount);

    const liveNeighborCounts = new Uint8Array(board.length * 4);
    const liveNeighborCountsDV = new DataView(liveNeighborCounts.buffer);
    const updateNeighbors = createUpdateNeighbors(
      rowCount,
      colCount,
      liveNeighborCounts
    );

    for (let pi = 0; pi < board.length; pi++) {
      let cellBlock = board[pi];
      for (let po = 0; po < 8; po++) {
        if (cellBlock & 0b1000_0000) {
          const li = ptlCellI(pi, po);
          updateNeighbors(li, 1);
        }
        cellBlock <<= 1;
      }
    }

    this.step = (board) => {
      let turnOnI = 0;
      let turnOffI = 0;

      for (let pi = 0; pi < board.length; pi++) {
        let cellBlock = board[pi];
        let liveNeighborCountBlock = liveNeighborCountsDV.getUint32(pi * 4);
        for (let po = 0; po < 8; po++) {
          let cell = cellBlock & 0b1000_0000;
          let liveNeighborCount =
            liveNeighborCountBlock & 0b1111_0000_00000000_00000000_00000000;
          // Any live cell with two or three live neighbours survives.
          // Similarly, all other dead cells stay dead.
          if (
            cell === 0 &&
            liveNeighborCount === 0b0011_0000_00000000_00000000_00000000
          ) {
            // Any dead cell with three live neighbours becomes a live cell.
            board[pi] ^= 1 << (7 - po);
            turnOnIdxsPreallocated[turnOnI++] = ptlCellI(pi, po);
          } else if (
            cell === 0b1000_0000 &&
            (liveNeighborCount < 0b0010_0000_00000000_00000000_00000000 ||
              liveNeighborCount > 0b0011_0000_00000000_00000000_00000000)
          ) {
            // All other live cells die in the next generation.
            board[pi] ^= 1 << (7 - po);
            turnOffIdxsPreallocated[turnOffI++] = ptlCellI(pi, po);
          }

          cellBlock <<= 1;
          liveNeighborCountBlock <<= 4;
        }
      }

      const turnOnIdxs = turnOnIdxsPreallocated.slice(0, turnOnI);
      const turnOffIdxs = turnOffIdxsPreallocated.slice(0, turnOffI);

      for (let i = 0; i < turnOnIdxs.length; i++) {
        updateNeighbors(turnOnIdxs[i], 1);
      }
      for (let i = 0; i < turnOffIdxs.length; i++) {
        updateNeighbors(turnOffIdxs[i], -1);
      }

      return Comlink.transfer({ nextBoard: board, turnOnIdxs, turnOffIdxs }, [
        board.buffer,
        turnOnIdxs.buffer,
        turnOffIdxs.buffer,
      ]);
    };
  },
  getNext: function (board) {
    return this.step(board);
  },
});
