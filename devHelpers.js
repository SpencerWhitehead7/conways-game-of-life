// @ts-check

/**
 * print out the given 1D board as a 2D matrix
 * @param {number[]} board the board to print
 * @param {Number} rc rowCount; the number of rows in the board
 * @param {Number} cc colCount; the number of columns in the board
 * @returns {void}
 */
export const printBoard = (board, rc, cc) => {
  const formatted = new Array(rc);
  for (let i = 0; i < rc; i++) {
    const startI = i * cc;
    formatted[i] = board.slice(startI, startI + cc);
  }
  console.log(formatted);
};

/**
 * @typedef {Object} Timer
 * @property {() => void} beg start one increment of the timer
 * @property {() => void} end finish one increment of the timer
 */

/**
 * creates a timer which times ms between .beg() and .end()
 * and prints the average time over x iterations every xth iteration
 * @param {string} label the label to print with the time
 * @param {number} iterations the number of times the timer should run before printing
 * @returns {Timer} the new timer
 */
export const newTimer = (label = "", iterations = 20) => {
  let runningTotal = 0;
  let count = 0;

  let start = 0;

  return {
    beg: () => {
      start = performance.now();
    },
    end: () => {
      runningTotal += performance.now() - start;
      count++;
      start = 0;
      if (count === iterations) {
        console.log(
          `${label}::`,
          Math.round((runningTotal / count) * 100) / 100
        );
        runningTotal = 0;
        count = 0;
      }
    },
  };
};
