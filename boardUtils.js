const newBoard = (cc, rc, startingBoard) => {
  const boardSize = cc * rc;

  const getLiveNeighborIdx = (ri, ci) => ri * cc + ci + boardSize;

  const updateLiveCell = (board, i) => {
    board[i] = 1;

    const ri = Math.floor(i / cc);
    const ci = i % cc;

    const n = ri === 0 ? rc - 1 : ri - 1;
    const e = ci === cc - 1 ? 0 : ci + 1;
    const s = ri === rc - 1 ? 0 : ri + 1;
    const w = ci === 0 ? cc - 1 : ci - 1;

    board[getLiveNeighborIdx(n, w)]++;
    board[getLiveNeighborIdx(n, ci)]++;
    board[getLiveNeighborIdx(n, e)]++;
    board[getLiveNeighborIdx(ri, e)]++;
    board[getLiveNeighborIdx(ri, w)]++;
    board[getLiveNeighborIdx(s, e)]++;
    board[getLiveNeighborIdx(s, ci)]++;
    board[getLiveNeighborIdx(s, w)]++;
  };

  let board = new Uint8Array(boardSize * 2);
  for (let i = 0; i < boardSize; i++) {
    if (startingBoard[i] === 1) {
      updateLiveCell(board, i);
    }
  }

  return {
    step: () => {
      const nextBoard = new Uint8Array(boardSize * 2);

      for (let i = 0; i < boardSize; i++) {
        // Any live cell with two or three live neighbours survives.
        // Any dead cell with three live neighbours becomes a live cell.
        const cell = board[i];
        const liveNeighors = board[i + boardSize];
        if (liveNeighors === 3 || (liveNeighors === 2 && cell === 1)) {
          updateLiveCell(nextBoard, i);
        }
        // All other live cells die in the next generation.
        // Similarly, all other dead cells stay dead.
      }

      board = nextBoard;
    },

    get: () => board.slice(0, boardSize),

    // \/ \/ mainBoard only \/ \/
    diff: (compareBoard) => {
      // TODO:: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/resizable set to size of board
      // once it's supported, it'd save having to copy into the Uint32Array
      const turnOn = [];
      const turnOff = [];
      for (let i = 0; i < boardSize; i++) {
        if (board[i] !== compareBoard[i]) {
          board[i] === 1 ? turnOn.push(i) : turnOff.push(i);
        }
      }
      return {
        turnOn: new Uint32Array(turnOn),
        turnOff: new Uint32Array(turnOff),
      };
    },
    // /\ /\ mainBoard only /\ /\

    // \/ \/ fastBoard only \/ \/
    exposeFull: () => board,

    doesMatch: (compareBoard) => {
      for (let i = 0; i < boardSize; i++) {
        if (board[i] !== compareBoard[i]) return false;
      }
      return true;
    },
    // /\ /\ fastBoard only /\ /\
  };
};
