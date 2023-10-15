import * as Comlink from "https://unpkg.com/comlink@4.4.1/dist/esm/comlink.js";

import { newBoard } from "./boardUtils.js";

Comlink.expose({
  board: null,

  init: function (rowCount, colCount, board) {
    this.board = newBoard(rowCount, colCount, board);
  },
  getNext: function () {
    this.board.step();
    const board = this.board.get();
    return Comlink.transfer(board, [board.buffer]);
  },
  diff: function (compareBoard) {
    const { turnOn, turnOff } = this.board.diff(compareBoard);
    return Comlink.transfer({ turnOn, turnOff }, [
      turnOn.buffer,
      turnOff.buffer,
    ]);
  },
});
