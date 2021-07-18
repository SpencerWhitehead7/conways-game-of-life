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
- Handles (on my (admittedly quite souped up) computer) 1,000,000 cells (comfortably), 4,000,000 cells (barely)

## Fun Facts

- A (very different) implementation of this was one of my first web projects.
- To my considerable surprise, the size of the board is more limited by the size of the canvas element a browser will render, not the calculations of board state or painting the canvas... of course, by that point the canvas is mostly offscreen anyway.
- I'd like to convert all the logic to rust, acting on boards stored in saved memory, but having surveyed the rust/wasm ecosystem, it's a horrible, disorganized mess where if you use their manky, bloated templates you MIGHT get it working exactly the way they have it set up, and if you try and write it yourself you'll get nothing. I'll try again in a few years and see if it's matured any.
