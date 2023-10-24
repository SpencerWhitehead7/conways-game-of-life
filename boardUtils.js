export const createUpdateCell =
  (rc, cc, cellVal, neighborVal, board) => (i) => {
    const ri = Math.floor(i / cc);
    const ci = i % cc;

    const n = ri === 0 ? rc - 1 : ri - 1;
    const e = ci === cc - 1 ? 0 : ci + 1;
    const s = ri === rc - 1 ? 0 : ri + 1;
    const w = ci === 0 ? cc - 1 : ci - 1;

    board[cc * n + w] += neighborVal;
    board[cc * n + ci] += neighborVal;
    board[cc * n + e] += neighborVal;
    board[cc * ri + e] += neighborVal;
    board[i] += cellVal;
    board[cc * ri + w] += neighborVal;
    board[cc * s + e] += neighborVal;
    board[cc * s + ci] += neighborVal;
    board[cc * s + w] += neighborVal;
  };

export const doBoardsMatch = (b1, b2) => {
  for (let i = 0; i < b1.length; i++) {
    if (b1[i] !== b2[i]) return false;
  }
  return true;
};
