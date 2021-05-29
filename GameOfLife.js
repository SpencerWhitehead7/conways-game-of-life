class GameOfLife {
  constructor(rowCount, colCount, density) {
    this.board = new Array(rowCount)
      .fill([])
      .map(() =>
        new Array(colCount).fill(0).map(() => (Math.random() < density ? 1 : 0))
      );
  }

  toggle(row, col) {
    this.board[row][col] = this.board[row][col] === 0 ? 1 : 0;
  }

  tick() {
    this.board = this.board.map((row, rowI) =>
      row.map((cell, colI) => {
        const liveNeighborCount =
          this.board[(rowI + this.rowCount - 1) % this.rowCount][
            (colI + this.colCount - 1) % this.colCount
          ] +
          this.board[(rowI + this.rowCount - 1) % this.rowCount][colI] +
          this.board[(rowI + this.rowCount - 1) % this.rowCount][
            (colI + 1) % this.colCount
          ] +
          this.board[rowI][(colI + 1) % this.colCount] +
          this.board[(rowI + 1) % this.rowCount][(colI + 1) % this.colCount] +
          this.board[(rowI + 1) % this.rowCount][colI] +
          this.board[(rowI + 1) % this.rowCount][
            (colI + this.colCount - 1) % this.colCount
          ] +
          this.board[rowI][(colI + this.colCount - 1) % this.colCount];
        // from https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life
        // Any live cell with two or three live neighbours survives.
        if (cell === 1 && liveNeighborCount >= 2 && liveNeighborCount <= 3)
          return 1;
        // Any dead cell with three live neighbours becomes a live cell.
        if (cell === 0 && liveNeighborCount === 3) return 1;
        // All other live cells die in the next generation. Similarly, all other dead cells stay dead.
        return 0;
      })
    );
  }
}
