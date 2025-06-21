// @ts-check

/**
 * @param {number} [boardSize] if provided, the returned board's buffer will have a copy of this board's data
 * @returns {WebAssembly.Memory} an exactly 2048 X 2048 (max size for my game) (conveniently, exactly 64 pages) byte board
 */
export const getBoardSMem = (boardSize = 0) => {
  const pageCount = getPages(boardSize + boardSize * 4 * 2);

  const newBoardSMem = new WebAssembly.Memory({
    initial: pageCount,
    maximum: pageCount,
    shared: true,
  });

  return newBoardSMem;
};

/**
 * @param {WebAssembly.Memory} baseBoard if provided, the returned board's buffer will have a copy of this board's data
 * @returns {WebAssembly.Memory} an exactly 2048 X 2048 (max size for my game) (conveniently, exactly 64 pages) byte board
 */
export const copyBoardSMem = (baseBoard) => {
  const pageCount = getPages(baseBoard.buffer.byteLength);

  const newBoardSMem = new WebAssembly.Memory({
    initial: pageCount,
    maximum: pageCount,
    shared: true,
  });
  new Uint8Array(newBoardSMem.buffer).set(new Uint8Array(baseBoard.buffer));

  return newBoardSMem;
};

/**
 * @param {number} totalBytes the total number of bytes necessary to store the board, turnOnIdxs, and turnOffIdxs
 * @returns {number} the number of pages necessary to store the totalBytes
 */
const getPages = (totalBytes) => {
  const BYTES_PER_PAGE = 65536; // 64 KiB
  return Math.ceil(totalBytes / BYTES_PER_PAGE);
};

/**
 * @typedef {Object} GameLogicExports
 * @property {() => [number, number, number, number]} step advance the underlying board one step and return [turnOnIdxsOffset, turnOnIdxsPtr, turnOffIdxsOffset, turnOffIdxsPtr], pointers to the ends of the partitions of indices of cells to turn on or off
 */

/**
 * @param {WebAssembly.Memory} boardSMem the wasm shared memory the module will use for its board
 * @param {number} rowCount the number of rows in the board
 * @param {number} colCount the number of columns in the board
 * @returns {Promise<GameLogicExports>}
 */
export const getGameLogic = async (boardSMem, rowCount, colCount) => {
  const { module, instance } = await WebAssembly.instantiateStreaming(
    fetch("./gameLogic.wasm"),
    {
      js: {
        board: boardSMem,
        rc: rowCount,
        cc: colCount,
        turnOnIdxsOffset: rowCount * colCount * 1,
        turnOffIdxsOffset: rowCount * colCount * 5,
        log: console.log,
      },
    }
  );

  return /** @type {GameLogicExports} */ (instance.exports);
};

/**
 * create the function used to update a given cell and its neighbors in the passed in board
 * @param {number} rc rowCount; number of rows in board
 * @param {number} cc colCount; number of columns in board
 * @param {Uint8Array} board the board to which to update the given cell
 * @returns {(i: number, cellVal: number) => void}
 */
export const createToggleCell =
  (rc, cc, board) =>
  /**
   * use to update a given cell and its neighbors by index in the passed in board
   * @param {number} i the index of the cell to update
   * @param {number} cellVal the adjustment to make to the cell's value (+/- 1)
   * @returns {void}
   */
  (i, cellVal) => {
    const ri = Math.floor(i / cc);
    const ci = i % cc;

    const n = ri === 0 ? rc - 1 : ri - 1;
    const e = ci === cc - 1 ? 0 : ci + 1;
    const s = ri === rc - 1 ? 0 : ri + 1;
    const w = ci === 0 ? cc - 1 : ci - 1;

    const neighborVal = 10 * cellVal;

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
 * @param {WebAssembly.Memory} bsm1 board one; the 1st board to check
 * @param {WebAssembly.Memory} bsm2 board two; the 2nd board to check
 * @returns {boolean} whether the two boards match
 */
export const doBoardsMatch = (bsm1, bsm2) => {
  const b1 = new Uint32Array(bsm1.buffer);
  const b2 = new Uint32Array(bsm2.buffer);

  for (let i = 0; i < b1.length; i++) {
    if (b1[i] !== b2[i]) return false;
  }

  return true;
};
