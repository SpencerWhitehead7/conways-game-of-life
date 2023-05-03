/** Exported memory */
export declare const memory: WebAssembly.Memory;
/**
 * assembly/index/helloWorld
 * @param input `~lib/string/String`
 * @returns `~lib/string/String`
 */
export declare function helloWorld(input: string): string;
/**
 * assembly/generateVertices/generateVertices
 * @param idxs `~lib/array/Array<f32>`
 * @param colCount `f32`
 * @param cellSize `f32`
 * @param fullSize `f32`
 * @returns `~lib/typedarray/Float32Array`
 */
export declare function generateVertices(idxs: Array<number>, colCount: number, cellSize: number, fullSize: number): Float32Array;
