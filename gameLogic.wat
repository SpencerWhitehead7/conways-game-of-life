(module
  (import "js" "board" (memory $board 0 64 shared))

  (import "js" "log" (func $log (param i32)))
  (import "js" "log2" (func $log2 (param i32 i32)))

  (memory $turnOnIdxsMem 256) ;; exactly one 2048x2048 board * 4 (int32s for indices, not bytes)
  (export "turnOnIdxsMem" (memory $turnOnIdxsMem))
  (memory $turnOffIdxsMem 256) ;; exactly one 2048x2048 board * 4 (int32s for indices, not bytes)
  (export "turnOffIdxsMem" (memory $turnOffIdxsMem))

  (func (export "getNextDiff") (param $boardLength i32) (result i32 i32)
    (local $i i32)
    (local $turnOnIdxsPtr i32)
    (local $turnOffIdxsPtr i32)
    (local $chunk v128)

    (local $turnOn v128)
    (local $turnOnBitmask i32)

    (local $isOn v128)
    (local $isLT21 v128)
    (local $isGT31 v128)
    (local $turnOff v128)
    (local $turnOffBitmask i32)

    (block $diffLoop
      (loop $diffLoopTop
        (br_if $diffLoop (i32.ge_u (local.get $i) (local.get $boardLength)))

        (local.set $chunk (v128.load (memory $board) (local.get $i)))

        (local.set $turnOn (i8x16.eq
          (local.get $chunk)
          (i8x16.splat (i32.const 30))
        ))

        (local.set $isOn (v128.and
          (local.get $chunk)
          (i8x16.splat (i32.const 1))
        ))
        (local.set $isLT21 (i8x16.lt_u
          (local.get $chunk)
          (i8x16.splat (i32.const 21))
        ))
        (local.set $isGT31 (i8x16.gt_u
          (local.get $chunk)
          (i8x16.splat (i32.const 31))
        ))

        (local.set $turnOff (v128.and
          (i8x16.neg (local.get $isOn))  ;; $isOn has just a LSB of 1, neg converts that to all 1s, which is necessary for the bitmask
          (v128.or (local.get $isLT21) (local.get $isGT31))
        ))

        (local.set $turnOnBitmask (i8x16.bitmask (local.get $turnOn)))
        (block $turnOnLoop
          (loop $turnOnLoopTop
            (br_if $turnOnLoop (i32.eqz (local.get $turnOnBitmask)))

            (i32.store (memory $turnOnIdxsMem)
              (local.get $turnOnIdxsPtr)
              (i32.add (local.get $i) (i32.ctz (local.get $turnOnBitmask)))
            )

            (local.set $turnOnBitmask ;; this looks kinda insane, but it just toggles the lowest 1 bit to 0
              (i32.and
                (local.get $turnOnBitmask)
                (i32.sub (local.get $turnOnBitmask) (i32.const 1))
              )
            )

            (local.set $turnOnIdxsPtr
              (i32.add (local.get $turnOnIdxsPtr) (i32.const 4))
            )

            (br $turnOnLoopTop)
          )
        )

        (local.set $turnOffBitmask (i8x16.bitmask (local.get $turnOff)))
        (block $turnOffLoop
          (loop $turnOffLoopTop
            (br_if $turnOffLoop (i32.eqz (local.get $turnOffBitmask)))

            (i32.store (memory $turnOffIdxsMem)
              (local.get $turnOffIdxsPtr)
              (i32.add (local.get $i) (i32.ctz (local.get $turnOffBitmask)))
            )

            (local.set $turnOffBitmask ;; this looks kinda insane, but it just toggles the lowest 1 bit to 0
              (i32.and
                (local.get $turnOffBitmask)
                (i32.sub (local.get $turnOffBitmask) (i32.const 1))
              )
            )

            (local.set $turnOffIdxsPtr
              (i32.add (local.get $turnOffIdxsPtr) (i32.const 4))
            )

            (br $turnOffLoopTop)
          )
        )

        (local.set $i (i32.add (local.get $i) (i32.const 16)))
        (br $diffLoopTop)
      )
    )

    (i32.div_u (local.get $turnOnIdxsPtr) (i32.const 4))
    (i32.div_u (local.get $turnOffIdxsPtr) (i32.const 4))
  )
)
