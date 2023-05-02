/* tslint:disable */
/* eslint-disable */
/**
* @param {string} input
* @returns {string}
*/
export function hello_world(input: string): string;
/**
*/
export class Board {
  free(): void;
/**
* @param {number} rc
* @param {number} cc
* @returns {Board}
*/
  static new(rc: number, cc: number): Board;
/**
* @param {Uint8Array} board
* @returns {Uint8Array}
*/
  step(board: Uint8Array): Uint8Array;
/**
* @returns {Float32Array}
*/
  get_turn_on_idxs(): Float32Array;
/**
* @returns {Float32Array}
*/
  get_turn_off_idxs(): Float32Array;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_board_free: (a: number) => void;
  readonly board_new: (a: number, b: number) => number;
  readonly board_step: (a: number, b: number, c: number, d: number) => void;
  readonly board_get_turn_on_idxs: (a: number, b: number) => void;
  readonly board_get_turn_off_idxs: (a: number, b: number) => void;
  readonly hello_world: (a: number, b: number, c: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
