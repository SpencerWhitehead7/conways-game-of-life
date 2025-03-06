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
- Handles (on my (admittedly quite souped up) computer) 4,194,304 cells comfortably (sub 16ms per board)

## Fun Facts

- A (very different) implementation of this was one of my first web projects.
- To my considerable surprise, the size of the board is limited by the maximum size of the canvas element, not by the calculations of board state or painting the canvas... of course, by that point, the canvas is way too big to fit onscreen anyway.
- Vanilla JS implementations of the logic have proved FASTER than wasm ones (or at least faster than any wasm ones I've managed to write), whether using rust, assemblyscript, or handrolled wasm for the wasm sourcecode. Shockingly, vanilla JS is faster even if you don't count the tax of copying memory in and out of wasm.
