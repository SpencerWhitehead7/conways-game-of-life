import * as Comlink from "https://unpkg.com/comlink@4.4.1/dist/esm/comlink.js";

import init, { Board } from "./logic/pkg/logic.js";

Comlink.expose({
  board: null,

  init: async function (rowCount, colCount) {
    await init();
    this.board = Board.new(rowCount, colCount);
  },
  getNext: function (board) {
    const nextBoard = this.board.step(board);
    const turnOnIdxs = this.board.get_turn_on_idxs();
    const turnOffIdxs = this.board.get_turn_off_idxs();

    return Comlink.transfer({ nextBoard, turnOnIdxs, turnOffIdxs }, [
      nextBoard.buffer,
      turnOnIdxs.buffer,
      turnOffIdxs.buffer,
    ]);
  },
});
