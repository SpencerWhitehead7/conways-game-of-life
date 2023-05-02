use wasm_bindgen::prelude::*;

pub mod board;

// <--- test junk>
#[wasm_bindgen]
pub fn hello_world(input: String) -> String {
  "Hello ".to_string() + &input
}
