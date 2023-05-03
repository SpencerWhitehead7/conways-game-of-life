// fuck this is slow lmao
// vanilla js is so much quicker
// rust so much quicker
// to say nothing of the GPU version
export function generateVertices(
  idxs: Array<f32>,
  colCount: f32,
  cellSize: f32,
  fullSize: f32
): Float32Array {
  const VERTICES_PER_SQUARE = 6;
  const COORDS_PER_SQUARE = VERTICES_PER_SQUARE * 2;
  const SQUARE_COUNT = idxs.length;

  const squares = new Float32Array(SQUARE_COUNT * COORDS_PER_SQUARE);
  for (let i = 0; i < idxs.length; i++) {
    const idx = idxs[i];
    const ri = Math.floor(idx / colCount);
    const ci = idx % colCount;

    const xBase = 1.0 + ci * fullSize;
    const yBase = 1.0 + ri * fullSize;
    const xOffset = xBase + cellSize;
    const yOffset = yBase + cellSize;

    // prettier-ignore
    squares.set([
      xBase, yBase,
      xOffset, yBase,
      xBase, yOffset,
      xBase, yOffset,
      xOffset, yBase,
      xOffset, yOffset,
    ], i * COORDS_PER_SQUARE)
    // prettier-unignore
  }

  return squares;
}
