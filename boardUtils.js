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

  const turnOns = new Float32Array(boardSize);
  const turnOffs = new Float32Array(boardSize);

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
      let turnOnsI = 0;
      let turnOffsI = 0;
      for (let i = 0; i < boardSize; i++) {
        if (board[i] !== compareBoard[i]) {
          board[i] === 1
            ? (turnOns[turnOnsI++] = i)
            : (turnOffs[turnOffsI++] = i);
        }
      }
      return {
        turnOn: turnOns.slice(0, turnOnsI),
        turnOff: turnOffs.slice(0, turnOffsI),
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
