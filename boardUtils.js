export const newBoard = (cc, rc, startingBoard) => {
  const boardSize = cc * rc;

  const getIdx = (ri, ci) => ri * cc + ci;

  const updateLiveCell = (board, i) => {
    const ri = Math.floor(i / cc);
    const ci = i % cc;

    const n = ri === 0 ? rc - 1 : ri - 1;
    const e = ci === cc - 1 ? 0 : ci + 1;
    const s = ri === rc - 1 ? 0 : ri + 1;
    const w = ci === 0 ? cc - 1 : ci - 1;

    board[getIdx(n, w)] += 10;
    board[getIdx(n, ci)] += 10;
    board[getIdx(n, e)] += 10;
    board[getIdx(ri, e)] += 10;
    board[i] += 1;
    board[getIdx(ri, w)] += 10;
    board[getIdx(s, e)] += 10;
    board[getIdx(s, ci)] += 10;
    board[getIdx(s, w)] += 10;
  };

  let board = new Uint8Array(boardSize);
  for (let i = 0; i < boardSize; i++) {
    // boards might not be all 1/0s if reiniting after a cell is toggled on/off
    if ((startingBoard[i] & 1) === 1) {
      updateLiveCell(board, i);
    }
  }

  const turnOns = new Float32Array(boardSize);
  const turnOffs = new Float32Array(boardSize);

  return {
    step: () => {
      const nextBoard = new Uint8Array(boardSize);

      for (let i = 0; i < boardSize; i++) {
        // Any live cell with two or three live neighbours survives.
        // Any dead cell with three live neighbours becomes a live cell.
        const cell = board[i];
        if (cell >= 21 && cell <= 31) {
          updateLiveCell(nextBoard, i);
        }
        // All other live cells die in the next generation.
        // Similarly, all other dead cells stay dead.
      }

      board = nextBoard;
    },

    get: () => board,

    // \/ \/ mainBoard only \/ \/
    diff: (compareBoard) => {
      let turnOnsI = 0;
      let turnOffsI = 0;
      for (let i = 0; i < boardSize; i++) {
        if ((board[i] & 1) !== (compareBoard[i] & 1)) {
          (board[i] & 1) === 1
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
    doesMatch: (compareBoard) => {
      for (let i = 0; i < boardSize; i++) {
        if (board[i] !== compareBoard[i]) return false;
      }
      return true;
    },
    // /\ /\ fastBoard only /\ /\
  };
};
