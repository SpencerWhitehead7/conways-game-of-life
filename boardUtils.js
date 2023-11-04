// @ts-check

/**
 * create the function used to update a given cell and its neighbors in the passed in board
 * @param {number} rc rowCount; number of rows in board
 * @param {number} cc colCount; number of columns in board
 * @param {number} cellVal number by which to alter the cell
 * @param {number} neighborVal number by which to alter the cell's living neighbors
 * @param {Uint8Array} board the board to which to update the given cell
 * @returns {(i: number) => void}
 */
export const createUpdateCell =
  (rc, cc, cellVal, neighborVal, board) =>
  /**
   * use to update a given cell and its neighbors by index in the passed in board
   * @param {number} i the index of the cell to update
   * @returns {void}
   */
  (i) => {
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

/**
 * check if two boards match value for value. Assumes boards have
 * equal length, which should always be true in this program
 * @param {number[]} b1 board one; the 1st board to check
 * @param {number[]} b2 board two; the 2nd board to check
 * @returns {boolean} whether the two boards match
 */
export const doBoardsMatch = (b1, b2) => {
  for (let i = 0; i < b1.length; i++) {
    if (b1[i] !== b2[i]) return false;
  }
  return true;
};
