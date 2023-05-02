use wasm_bindgen::prelude::*;
// use web_sys;

extern crate console_error_panic_hook;

// surprisingly, this is about 3 ms slower than the JS version
// I assume for such simple operations, the JIT is unbeatable
// (at least when you consider the overhead of the copy tax)
#[wasm_bindgen]
pub struct Board {
  // step fields
  rc: usize,
  cc: usize,
  size: usize,
  // diff fields
  turn_on_idx: usize,
  turn_on_idxs: Vec<f32>,
  turn_off_idx: usize,
  turn_off_idxs: Vec<f32>,
  // timer: Timer,
}

#[wasm_bindgen]
impl Board {
  pub fn new(rc: usize, cc: usize) -> Board {
    console_error_panic_hook::set_once();
    let size = rc * cc;

    Board {
      rc,
      cc,
      size,
      turn_on_idx: 0,
      turn_on_idxs: vec![0.0; size],
      turn_off_idx: 0,
      turn_off_idxs: vec![0.0; size],
      // timer: Timer::new("WASM".to_string(), 10),
    }
  }

  pub fn step(&mut self, board: Vec<u8>) -> Vec<u8> {
    // self.timer.beg();
    self.turn_on_idx = 0;
    self.turn_off_idx = 0;
    let mut next_board = board.clone();

    for i in 0..self.size {
      // Any live cell with two or three live neighbours survives.
      // Similarly, all other dead cells stay dead.
      let cell = board[i];
      if cell == 30 {
        // Any dead cell with three live neighbours becomes a live cell.
        self.turn_on(&mut next_board, i);
        self.turn_on_idxs[self.turn_on_idx] = i as f32;
        self.turn_on_idx += 1;
      } else if (cell & 1u8) == 1u8 && (cell < 21 || cell > 31) {
        // All other live cells die in the next generation.
        self.turn_off(&mut next_board, i);
        self.turn_off_idxs[self.turn_off_idx] = i as f32;
        self.turn_off_idx += 1;
      }
    }

    next_board
    // self.timer.end();
  }

  fn turn_on(&self, board: &mut Vec<u8>, i: usize) {
    let ri = i / self.cc;
    let ci = i % self.cc;

    let n = if ri == 0 { self.rc - 1 } else { ri - 1 };
    let e = if ci == self.cc - 1 { 0 } else { ci + 1 };
    let s = if ri == self.rc - 1 { 0 } else { ri + 1 };
    let w = if ci == 0 { self.cc - 1 } else { ci - 1 };

    board[self.cc * n + w] += 10u8;
    board[self.cc * n + ci] += 10u8;
    board[self.cc * n + e] += 10u8;
    board[self.cc * ri + e] += 10u8;
    board[i] += 1u8;
    board[self.cc * ri + w] += 10u8;
    board[self.cc * s + e] += 10u8;
    board[self.cc * s + ci] += 10u8;
    board[self.cc * s + w] += 10u8;
  }

  fn turn_off(&self, board: &mut Vec<u8>, i: usize) {
    let ri = i / self.cc;
    let ci = i % self.cc;

    let n = if ri == 0 { self.rc - 1 } else { ri - 1 };
    let e = if ci == self.cc - 1 { 0 } else { ci + 1 };
    let s = if ri == self.rc - 1 { 0 } else { ri + 1 };
    let w = if ci == 0 { self.cc - 1 } else { ci - 1 };

    board[self.cc * n + w] -= 10u8;
    board[self.cc * n + ci] -= 10u8;
    board[self.cc * n + e] -= 10u8;
    board[self.cc * ri + e] -= 10u8;
    board[i] -= 1u8;
    board[self.cc * ri + w] -= 10u8;
    board[self.cc * s + e] -= 10u8;
    board[self.cc * s + ci] -= 10u8;
    board[self.cc * s + w] -= 10u8;
  }

  pub fn get_turn_on_idxs(&mut self) -> Vec<f32> {
    self.turn_on_idxs[0..self.turn_on_idx].to_vec()
  }

  pub fn get_turn_off_idxs(&mut self) -> Vec<f32> {
    self.turn_off_idxs[0..self.turn_off_idx].to_vec()
  }
}

// struct Timer {
//   performance: web_sys::Performance,
//   label: String,
//   iterations: usize,
//   running_total: f64,
//   count: usize,
//   start: f64,
// }

// impl Timer {
//   pub fn new(label: String, iterations: usize) -> Timer {
//     Timer {
//       performance: js_sys::Reflect::get(&js_sys::global(), &JsValue::from_str("performance"))
//         .expect("failed to get performance from global object")
//         .unchecked_into::<web_sys::Performance>(),
//       label,
//       iterations,
//       running_total: 0.0,
//       count: 0,
//       start: 0.0,
//     }
//   }

//   pub fn beg(&mut self) {
//     self.start = self.performance.now();
//   }

//   pub fn end(&mut self) {
//     self.running_total += self.performance.now() - self.start;
//     self.count += 1;
//     self.start = 0.0;
//     if self.count == self.iterations {
//       let js: JsValue = format!(
//         "{} AVG TIME:: {}",
//         self.label,
//         self.running_total / self.count as f64
//       )
//       .into();
//       web_sys::console::log_1(&js);
//       self.running_total = 0.0;
//       self.count = 0;
//     }
//   }
// }
