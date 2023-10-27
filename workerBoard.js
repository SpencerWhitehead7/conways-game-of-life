import { createUpdateCell, createUpdateCellAtomic } from "./boardUtils.js";

self.onmessage = function ({
  data: {
    board,
    nextBoard,
    rc,
    cc,
    startIdx,
    endIdx,
    turnOnIdxSab,
    turnOffIdxSab,
    turnOnIdxsSab,
    turnOffIdxsSab,
    waitSab,
    waitSabIdx,
  },
}) {
  const turnOnA = createUpdateCellAtomic(rc, cc, 1, 10, nextBoard);
  const turnOffA = createUpdateCellAtomic(rc, cc, -1, -10, nextBoard);

  const turnOn = createUpdateCell(rc, cc, 1, 10, nextBoard);
  const turnOff = createUpdateCell(rc, cc, -1, -10, nextBoard);

  const tAtomicIdx = startIdx + cc * 2;
  const bAtomicIdx = endIdx - cc * 2;

  for (let i = startIdx; i < tAtomicIdx; i++) {
    const cell = board[i];
    if (cell === 30) {
      turnOnA(i);
      turnOnIdxsSab[Atomics.add(turnOnIdxSab, 0, 1)] = i;
    } else if ((cell & 1) === 1 && (cell < 21 || cell > 31)) {
      turnOffA(i);
      turnOffIdxsSab[Atomics.add(turnOffIdxSab, 0, 1)] = i;
    }
  }

  for (let i = tAtomicIdx; i < bAtomicIdx; i++) {
    const cell = board[i];
    if (cell === 30) {
      turnOn(i);
      turnOnIdxsSab[Atomics.add(turnOnIdxSab, 0, 1)] = i;
    } else if ((cell & 1) === 1 && (cell < 21 || cell > 31)) {
      turnOff(i);
      turnOffIdxsSab[Atomics.add(turnOffIdxSab, 0, 1)] = i;
    }
  }

  for (let i = bAtomicIdx; i < endIdx; i++) {
    const cell = board[i];
    if (cell === 30) {
      turnOnA(i);
      turnOnIdxsSab[Atomics.add(turnOnIdxSab, 0, 1)] = i;
    } else if ((cell & 1) === 1 && (cell < 21 || cell > 31)) {
      turnOffA(i);
      turnOffIdxsSab[Atomics.add(turnOffIdxSab, 0, 1)] = i;
    }
  }

  Atomics.notify(waitSab, waitSabIdx);
};
