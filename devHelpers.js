export const formatBoard = (board, rowCount, colCount) => {
  const formatted = new Array(rowCount);
  for (let i = 0; i < rowCount; i++) {
    const startI = i * colCount;
    formatted[i] = board.slice(startI, startI + colCount);
  }
  return formatted;
};

export const newTimer = (label = "", iterations = 10) => {
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
