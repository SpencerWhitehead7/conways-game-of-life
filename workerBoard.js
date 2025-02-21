import * as Comlink from "https://unpkg.com/comlink@4.4.1/dist/esm/comlink.js";

import { createToggleCell } from "./boardUtils.js";

Comlink.expose({
  step: null,

  init: function (rowCount, colCount) {
    const turnOnIdxsPreallocated = new Float32Array(rowCount * colCount);
    const turnOffIdxsPreallocated = new Float32Array(rowCount * colCount);

    this.step = (board) => {
      const nextBoard = new Uint8Array(board);
      const toggleCell = createToggleCell(rowCount, colCount, nextBoard);

      let turnOnI = 0;
      let turnOffI = 0;

      const Int32Board = new Int32Array(board.buffer);
      for (let i = 0; i < Int32Board.length; i++) {
        // Any live cell with two or three live neighbours survives.
        // Similarly, all other dead cells stay dead.

        let int32Cell = Int32Board[i];
        let cell = int32Cell & 255;
        if (cell === 30) {
          // Any dead cell with three live neighbours becomes a live cell.
          toggleCell(i * 4, 1);
          turnOnIdxsPreallocated[turnOnI++] = i * 4;
        } else if ((cell & 1) === 1 && (cell < 21 || cell > 31)) {
          // All other live cells die in the next generation.
          toggleCell(i * 4, -1);
          turnOffIdxsPreallocated[turnOffI++] = i * 4;
        }

        int32Cell >>>= 8;
        cell = int32Cell & 255;
        if (cell === 30) {
          // Any dead cell with three live neighbours becomes a live cell.
          toggleCell(i * 4 + 1, 1);
          turnOnIdxsPreallocated[turnOnI++] = i * 4 + 1;
        } else if ((cell & 1) === 1 && (cell < 21 || cell > 31)) {
          // All other live cells die in the next generation.
          toggleCell(i * 4 + 1, -1);
          turnOffIdxsPreallocated[turnOffI++] = i * 4 + 1;
        }

        int32Cell >>>= 8;
        cell = int32Cell & 255;
        if (cell === 30) {
          // Any dead cell with three live neighbours becomes a live cell.
          toggleCell(i * 4 + 2, 1);
          turnOnIdxsPreallocated[turnOnI++] = i * 4 + 2;
        } else if ((cell & 1) === 1 && (cell < 21 || cell > 31)) {
          // All other live cells die in the next generation.
          toggleCell(i * 4 + 2, -1);
          turnOffIdxsPreallocated[turnOffI++] = i * 4 + 2;
        }

        int32Cell >>>= 8;
        cell = int32Cell & 255;
        if (cell === 30) {
          // Any dead cell with three live neighbours becomes a live cell.
          toggleCell(i * 4 + 3, 1);
          turnOnIdxsPreallocated[turnOnI++] = i * 4 + 3;
        } else if ((cell & 1) === 1 && (cell < 21 || cell > 31)) {
          // All other live cells die in the next generation.
          toggleCell(i * 4 + 3, -1);
          turnOffIdxsPreallocated[turnOffI++] = i * 4 + 3;
        }
      }
      // I don't understand why the + values for physical index in the unit8 array seem "backward," but it's working

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
