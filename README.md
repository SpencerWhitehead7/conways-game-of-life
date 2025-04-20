# Conway's Game of Life

A vanilla JS implementation of [Conway's Game of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life). Heavily optimized.

Any live cell with two or three live neighbours survives.
Any dead cell with three live neighbours becomes a live cell.
All other live cells die in the next generation. Similarly, all other dead cells stay dead.

## Features

- Set board width / height
- Random seeding with user-selected density
- Manually toggle cells
- Autoplay game at user determined rate, or step by hand
- Steps taken counter
- Cycle detection
- Cycle length detection
- Steps to enter cycle counter
- Handles (on my (admittedly quite souped up) computer) 4,194,304 cells comfortably (sub 8.33ms per board (up to 120 fps))

## Fun Facts

- A (very different) implementation of this was one of my first web projects.
- To my considerable surprise, the size of the board is limited by the maximum size of the canvas element, not by the calculations of board state or painting the canvas... of course, by that point, the canvas is way too big to fit onscreen anyway.
- My vanilla JS implementations of the logic were FASTER than any I managed to write in other languages and compile to wasm (I tried with rust and assemblyscript), even if you don't count the tax of copying memory in and out of wasm.
- However, handwritten wasm leveraging SIMD and a bunch of other bit shift style optimizations was significantly faster.

## Raw Wasm

- the build is a very manual because I am directly writing a .wat file and compiling it into .wasm
- make sure the machine has [wabt](https://github.com/WebAssembly/wabt) installed (via homebrew, for mac)
- `wat2wasm logic.wat --enable-multi-memory  --enable-threads` will generate `logic.wasm`
- `wasm2wat logic.wasm --enable-multi-memory --enable-threads -o dcmp.wat` will decompile the wasm back into wat, allowing you to see how, if at all, the compiler altered/optimized the source wat.
