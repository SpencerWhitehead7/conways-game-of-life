importScripts("https://unpkg.com/comlink@4.3.1/dist/umd/comlink.min.js");

importScripts("./boardUtils.js");

Comlink.expose({
  board: null,

  init: (rowCount, colCount, board) => {
    this.board = newBoard(rowCount, colCount, board);
  },
  getNext: () => {
    this.board.step();
    const board = this.board.get();
    return Comlink.transfer(board, [board.buffer]);
  },
});
