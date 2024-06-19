// @ts-check

/**
 * create the function used to update a given cell and its neighbors in the passed in board
 * @param {number} rc rowCount; number of rows in board
 * @param {number} cc colCount; number of columns in board
 * @param {number} multiplier number by which to alter the cell's living neighbors
 * @param {Uint8Array} board the board to which to update the given cell
 * @returns {(li: number, i: number, b: number) => void}
 */
export const createUpdateCell =
  (rc, cc, multiplier, board) =>
  /**
   * use to update a given cell and its neighbors by index in the passed in board
   * @param {number} li the logical index of the cell to update
   * @param {number} pi the physical index of the cell to update
   * @param {number} po the physical bit offset within the cell's physical index
   * @returns {void}
   */
  (li, pi, po) => {
    const lri = Math.floor(li / cc);
    const lci = li % cc;

    const ln = lri === 0 ? rc - 1 : lri - 1;
    const le = lci === cc - 1 ? 0 : lci + 1;
    const ls = lri === rc - 1 ? 0 : lri + 1;
    const lw = lci === 0 ? cc - 1 : lci - 1;

    const lnwI = cc * ln + lw;
    const lnI = cc * ln + lci;
    const lneI = cc * ln + le;
    const leI = cc * lri + le;
    const lwI = cc * lri + lw;
    const lseI = cc * ls + le;
    const lsI = cc * ls + lci;
    const lswI = cc * ls + lw;

    const nwI = ltpLiveNeighborCount(lnwI);
    const nI = ltpLiveNeighborCount(lnI);
    const neI = ltpLiveNeighborCount(lneI);
    const eI = ltpLiveNeighborCount(leI);
    const wI = ltpLiveNeighborCount(lwI);
    const seI = ltpLiveNeighborCount(lseI);
    const sI = ltpLiveNeighborCount(lsI);
    const swI = ltpLiveNeighborCount(lswI);

    board[nwI] += (1 << ((lnwI & 1) * 4)) * multiplier;
    board[nI] += (1 << ((lnI & 1) * 4)) * multiplier;
    board[neI] += (1 << ((lneI & 1) * 4)) * multiplier;
    board[eI] += (1 << ((leI & 1) * 4)) * multiplier;
    board[pi] ^= 1 << po;
    board[wI] += (1 << ((lwI & 1) * 4)) * multiplier;
    board[seI] += (1 << ((lseI & 1) * 4)) * multiplier;
    board[sI] += (1 << ((lsI & 1) * 4)) * multiplier;
    board[swI] += (1 << ((lswI & 1) * 4)) * multiplier;
  };

/**
 * get a cell's logical index from its physical index and offset
 * @param {number} pi the physical index of the cell's byte
 * @param {number} po the physical offset of the cell's bit within that byte
 * @returns {number} the logical index of the cell
 */
export const ptlCellI = (pi, po) => (pi / 5) * 8 + po;

/**
 * get a cell's physical index and offset from its logical index
 * @param {number} li the logical index of the cell
 * @returns {[pi: number, po: number]} the physical index of the cell's byte and the physical offset of the cell's bit within that byte
 */
export const ltpCellI = (li) => {
  const quotient = li >> 3; // integer divide by 8
  const remainder = li - (quotient << 3); // integer multiply by 8

  return [quotient * 5, remainder];
};

/**
 * create the function used to update a given cell and its neighbors in the passed in board
 * @param {number} li the logical index of the cell's byte
 * @returns {number} the physical index of the cell's liveNeighborCount, nothing to indicate offset
 */
export const ltpLiveNeighborCount = (li) => {
  const quotient = li >> 3; // integer divide by 8
  const remainder = li - (quotient << 3); // integer multiply by 8

  const blockI = quotient * 5; // 5 bytes per 8 cells
  const offset = 4 - (remainder >> 1); // cell 01 live counts are in byte 5, 23 in byte 4, etc...

  return blockI + offset; // no first 4/last 4 bits accommodation
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
