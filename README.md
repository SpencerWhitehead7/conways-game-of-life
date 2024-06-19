# Conway's Game of Life

A vanilla JS implementation of [Conway's Game of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life). Heavily optimized.

## Features

- Set board width / height
- Random seeding with user-selected density
- Manually toggle cells
- Autoplay game at user determined rate, or step by hand
- Steps taken counter
- Cycle detection
- Cycle length detection
- Steps to enter cycle counter
- Handles (on my (admittedly quite souped up) computer) 4,000,000 cells comfortably (40-50 ms per board)

## Fun Facts

- A (very different) implementation of this was one of my first web projects.
- To my considerable surprise, the size of the board is limited by the maximum size of the canvas element, not by the calculations of board state or painting the canvas... of course, by that point, the canvas is way too big to fit onscreen anyway.
- Vanilla JS implementations of the logic have proved FASTER than wasm ones (or at least faster than any wasm ones I've managed to write), using both rust and assemblyscript for the wasm sourcecode. Shockingly, vanilla JS is still faster if you don't count the tax of copying memory in and out of wasm.

## Raw Wasm

- the build is a very manual because I am directly writing a .wat file and compiling it into .wasm
- make sure the machine has [wabt](https://github.com/WebAssembly/wabt) installed (via homebrew, for mac)
- `wat2wasm logic.wat --enable-multi-memory` will generate `logic.wasm`
- `wasm2wat logic.wasm --enable-multi-memory --enable-threads -o dcmp.wat` will decompile the wasm back into wat, allowing you to see how, if at all, the compiler altered/optimized the source wat.
