(module
  (import "js" "board" (memory $board 0 64 shared))
  (import "js" "onIdxs" (memory $onIdxs 1 256 shared))
  (import "js" "offIdxs" (memory $offIdxs 2 256 shared))

  (import "js" "log" (func $log (param i32)))
  (import "js" "log2" (func $log2 (param i32 i32)))

  (global $onPtr (import "js" "onPtr") (mut i32))
  (global $offPtr (import "js" "offPtr") (mut i32))

  (func (export "getOnPtr") (result i32)
    (global.get $onPtr)
  )
  (func (export "getOffPtr") (result i32)
    (global.get $offPtr)
  )

  (func (export "getNextDiff") (param $boardLength f32)
    (local $i f32)
    (local $onPtr i32)
    (local $offPtr i32)
    (local $chunk v128)
    (local $21or31 v128)

    ;; Loop over chunkable range of board memory in 16-byte chunks
    (block $boardLoop
      (loop $boardLoopTop
        (f32.ge (local.get $i) (local.get $boardLength))
        (br_if $boardLoop)

        (local.set $chunk (v128.load (memory $board) (i32.trunc_f32_u (local.get $i))))

        (i8x16.lt_u (local.get $chunk) (i8x16.splat (i32.const 21)))
        (i8x16.gt_u (local.get $chunk) (i8x16.splat (i32.const 31)))
        v128.or
        (local.set $21or31)

        ;; 0 --->>>

        (i8x16.extract_lane_u 0 (local.get $chunk))
        i32.const 30
        i32.eq
        (if
          (then
            local.get $onPtr
            (f32.add (local.get $i) (f32.const 0))
            (f32.store (memory $onIdxs))
            
            (local.set $onPtr (i32.add (local.get $onPtr) (i32.const 4)))
          )
          (else
            (i8x16.extract_lane_u 0 (local.get $chunk))
            i32.const 1
            i32.and
            (i8x16.extract_lane_u 0 (local.get $21or31))
            i32.and
            (if
              (then
                local.get $offPtr
                (f32.add (local.get $i) (f32.const 0))
                (f32.store (memory $offIdxs))
                
                (local.set $offPtr (i32.add (local.get $offPtr) (i32.const 4)))
              )
            )
          )
        )
        ;; 0 <<<---

        ;; 1 --->>>
        (i8x16.extract_lane_u 1 (local.get $chunk))
        i32.const 30
        i32.eq
        (if
          (then
            local.get $onPtr
            (f32.add (local.get $i) (f32.const 1))
            (f32.store (memory $onIdxs))
            
            (local.set $onPtr (i32.add (local.get $onPtr) (i32.const 4)))
          )
          (else
            (i8x16.extract_lane_u 1 (local.get $chunk))
            i32.const 1
            i32.and
            (i8x16.extract_lane_u 1 (local.get $21or31))
            i32.and
            (if
              (then
                local.get $offPtr
                (f32.add (local.get $i) (f32.const 1))
                (f32.store (memory $offIdxs))
                
                (local.set $offPtr (i32.add (local.get $offPtr) (i32.const 4)))
              )
            )
          )
        )
        ;; 1 <<<---

        ;; 2 --->>>
        (i8x16.extract_lane_u 2 (local.get $chunk))
        i32.const 30
        i32.eq
        (if
          (then
            local.get $onPtr
            (f32.add (local.get $i) (f32.const 2))
            (f32.store (memory $onIdxs))
            
            (local.set $onPtr (i32.add (local.get $onPtr) (i32.const 4)))
          )
          (else
            (i8x16.extract_lane_u 2 (local.get $chunk))
            i32.const 1
            i32.and
            (i8x16.extract_lane_u 2 (local.get $21or31))
            i32.and
            (if
              (then
                local.get $offPtr
                (f32.add (local.get $i) (f32.const 2))
                (f32.store (memory $offIdxs))
                
                (local.set $offPtr (i32.add (local.get $offPtr) (i32.const 4)))
              )
            )
          )
        )
        ;; 2 <<<---

        ;; 3 --->>>
        (i8x16.extract_lane_u 3 (local.get $chunk))
        i32.const 30
        i32.eq
        (if
          (then
            local.get $onPtr
            (f32.add (local.get $i) (f32.const 3))
            (f32.store (memory $onIdxs))
            
            (local.set $onPtr (i32.add (local.get $onPtr) (i32.const 4)))
          )
          (else
            (i8x16.extract_lane_u 3 (local.get $chunk))
            i32.const 1
            i32.and
            (i8x16.extract_lane_u 3 (local.get $21or31))
            i32.and
            (if
              (then
                local.get $offPtr
                (f32.add (local.get $i) (f32.const 3))
                (f32.store (memory $offIdxs))
                
                (local.set $offPtr (i32.add (local.get $offPtr) (i32.const 4)))
              )
            )
          )
        )
        ;; 3 <<<---

        ;; 4 --->>>
        (i8x16.extract_lane_u 4 (local.get $chunk))
        i32.const 30
        i32.eq
        (if
          (then
            local.get $onPtr
            (f32.add (local.get $i) (f32.const 4))
            (f32.store (memory $onIdxs))
            
            (local.set $onPtr (i32.add (local.get $onPtr) (i32.const 4)))
          )
          (else
            (i8x16.extract_lane_u 4 (local.get $chunk))
            i32.const 1
            i32.and
            (i8x16.extract_lane_u 4 (local.get $21or31))
            i32.and
            (if
              (then
                local.get $offPtr
                (f32.add (local.get $i) (f32.const 4))
                (f32.store (memory $offIdxs))
                
                (local.set $offPtr (i32.add (local.get $offPtr) (i32.const 4)))
              )
            )
          )
        )
        ;; 4 <<<---

        ;; 5 --->>>
        (i8x16.extract_lane_u 5 (local.get $chunk))
        i32.const 30
        i32.eq
        (if
          (then
            local.get $onPtr
            (f32.add (local.get $i) (f32.const 5))
            (f32.store (memory $onIdxs))
            
            (local.set $onPtr (i32.add (local.get $onPtr) (i32.const 4)))
          )
          (else
            (i8x16.extract_lane_u 5 (local.get $chunk))
            i32.const 1
            i32.and
            (i8x16.extract_lane_u 5 (local.get $21or31))
            i32.and
            (if
              (then
                local.get $offPtr
                (f32.add (local.get $i) (f32.const 5))
                (f32.store (memory $offIdxs))
                
                (local.set $offPtr (i32.add (local.get $offPtr) (i32.const 4)))
              )
            )
          )
        )
        ;; 5 <<<---

        ;; 6 --->>>
        (i8x16.extract_lane_u 6 (local.get $chunk))
        i32.const 30
        i32.eq
        (if
          (then
            local.get $onPtr
            (f32.add (local.get $i) (f32.const 6))
            (f32.store (memory $onIdxs))
            
            (local.set $onPtr (i32.add (local.get $onPtr) (i32.const 4)))
          )
          (else
            (i8x16.extract_lane_u 6 (local.get $chunk))
            i32.const 1
            i32.and
            (i8x16.extract_lane_u 6 (local.get $21or31))
            i32.and
            (if
              (then
                local.get $offPtr
                (f32.add (local.get $i) (f32.const 6))
                (f32.store (memory $offIdxs))
                
                (local.set $offPtr (i32.add (local.get $offPtr) (i32.const 4)))
              )
            )
          )
        )
        ;; 6 <<<---

        ;; 7 --->>>
        (i8x16.extract_lane_u 7 (local.get $chunk))
        i32.const 30
        i32.eq
        (if
          (then
            local.get $onPtr
            (f32.add (local.get $i) (f32.const 7))
            (f32.store (memory $onIdxs))
            
            (local.set $onPtr (i32.add (local.get $onPtr) (i32.const 4)))
          )
          (else
            (i8x16.extract_lane_u 7 (local.get $chunk))
            i32.const 1
            i32.and
            (i8x16.extract_lane_u 7 (local.get $21or31))
            i32.and
            (if
              (then
                local.get $offPtr
                (f32.add (local.get $i) (f32.const 7))
                (f32.store (memory $offIdxs))
                
                (local.set $offPtr (i32.add (local.get $offPtr) (i32.const 4)))
              )
            )
          )
        )
        ;; 7 <<<---

        ;; 8 --->>>
        (i8x16.extract_lane_u 8 (local.get $chunk))
        i32.const 30
        i32.eq
        (if
          (then
            local.get $onPtr
            (f32.add (local.get $i) (f32.const 8))
            (f32.store (memory $onIdxs))
            
            (local.set $onPtr (i32.add (local.get $onPtr) (i32.const 4)))
          )
          (else
            (i8x16.extract_lane_u 8 (local.get $chunk))
            i32.const 1
            i32.and
            (i8x16.extract_lane_u 8 (local.get $21or31))
            i32.and
            (if
              (then
                local.get $offPtr
                (f32.add (local.get $i) (f32.const 8))
                (f32.store (memory $offIdxs))
                
                (local.set $offPtr (i32.add (local.get $offPtr) (i32.const 4)))
              )
            )
          )
        )
        ;; 8 <<<---

        ;; 9 --->>>
        (i8x16.extract_lane_u 9 (local.get $chunk))
        i32.const 30
        i32.eq
        (if
          (then
            (local.get $onPtr)
            (f32.add (local.get $i) (f32.const 9))
            (f32.store (memory $onIdxs))
            
            (local.set $onPtr (i32.add (local.get $onPtr) (i32.const 4)))
          )
          (else
            (i8x16.extract_lane_u 9 (local.get $chunk))
            i32.const 1
            i32.and
            (i8x16.extract_lane_u 9 (local.get $21or31))
            i32.and
            (if
              (then
                (local.get $offPtr)
                (f32.add (local.get $i) (f32.const 9))
                (f32.store (memory $offIdxs))
                
                (local.set $offPtr (i32.add (local.get $offPtr) (i32.const 4)))
              )
            )
          )
        )
        ;; 9 <<<---

        ;; 10 --->>>
        (i8x16.extract_lane_u 10 (local.get $chunk))
        i32.const 30
        i32.eq
        (if
          (then
            (local.get $onPtr)
            (f32.add (local.get $i) (f32.const 10))
            (f32.store (memory $onIdxs))
            
            (local.set $onPtr (i32.add (local.get $onPtr) (i32.const 4)))
          )
          (else
            (i8x16.extract_lane_u 10 (local.get $chunk))
            (i32.const 1)
            i32.and
            (i8x16.extract_lane_u 10 (local.get $21or31))
            i32.and
            (if
              (then
                (local.get $offPtr)
                (f32.add (local.get $i) (f32.const 10))
                (f32.store (memory $offIdxs))
                
                (local.set $offPtr (i32.add (local.get $offPtr) (i32.const 4)))
              )
            )
          )
        )
        ;; 10 <<<---

        ;; 11 --->>>
        (i8x16.extract_lane_u 11 (local.get $chunk))
        i32.const 30
        i32.eq
        (if
          (then
            (local.get $onPtr)
            (f32.add (local.get $i) (f32.const 11))
            (f32.store (memory $onIdxs))
            
            (local.set $onPtr (i32.add (local.get $onPtr) (i32.const 4)))
          )
          (else
            (i8x16.extract_lane_u 11 (local.get $chunk))
            (i32.const 1)
            i32.and
            (i8x16.extract_lane_u 11 (local.get $21or31))
            i32.and
            (if
              (then
                (local.get $offPtr)
                (f32.add (local.get $i) (f32.const 11))
                (f32.store (memory $offIdxs))
                
                (local.set $offPtr (i32.add (local.get $offPtr) (i32.const 4)))
              )
            )
          )
        )
        ;; 11 <<<---

        ;; 12 --->>>
        (i8x16.extract_lane_u 12 (local.get $chunk))
        i32.const 30
        i32.eq
        (if
          (then
            (local.get $onPtr)
            (f32.add (local.get $i) (f32.const 12))
            (f32.store (memory $onIdxs))
            
            (local.set $onPtr (i32.add (local.get $onPtr) (i32.const 4)))
          )
          (else
            (i8x16.extract_lane_u 12 (local.get $chunk))
            (i32.const 1)
            i32.and
            (i8x16.extract_lane_u 12 (local.get $21or31))
            i32.and
            (if
              (then
                (local.get $offPtr)
                (f32.add (local.get $i) (f32.const 12))
                (f32.store (memory $offIdxs))
                
                (local.set $offPtr (i32.add (local.get $offPtr) (i32.const 4)))
              )
            )
          )
        )
        ;; 12 <<<---

        ;; 13 --->>>
        (i8x16.extract_lane_u 13 (local.get $chunk))
        i32.const 30
        i32.eq
        (if
          (then
            (local.get $onPtr)
            (f32.add (local.get $i) (f32.const 13))
            (f32.store (memory $onIdxs))
            
            (local.set $onPtr (i32.add (local.get $onPtr) (i32.const 4)))
          )
          (else
            (i8x16.extract_lane_u 13 (local.get $chunk))
            (i32.const 1)
            i32.and
            (i8x16.extract_lane_u 13 (local.get $21or31))
            i32.and
            (if
              (then
                (local.get $offPtr)
                (f32.add (local.get $i) (f32.const 13))
                (f32.store (memory $offIdxs))
                
                (local.set $offPtr (i32.add (local.get $offPtr) (i32.const 4)))
              )
            )
          )
        )
        ;; 13 <<<---

        ;; 14 --->>>
        (i8x16.extract_lane_u 14 (local.get $chunk))
        i32.const 30
        i32.eq
        (if
          (then
            (local.get $onPtr)
            (f32.add (local.get $i) (f32.const 14))
            (f32.store (memory $onIdxs))
            
            (local.set $onPtr (i32.add (local.get $onPtr) (i32.const 4)))
          )
          (else
            (i8x16.extract_lane_u 14 (local.get $chunk))
            (i32.const 1)
            i32.and
            (i8x16.extract_lane_u 14 (local.get $21or31))
            i32.and
            (if
              (then
                (local.get $offPtr)
                (f32.add (local.get $i) (f32.const 14))
                (f32.store (memory $offIdxs))
                
                (local.set $offPtr (i32.add (local.get $offPtr) (i32.const 4)))
              )
            )
          )
        )
        ;; 14 <<<---

        ;; 15 --->>>
        (i8x16.extract_lane_u 15 (local.get $chunk))
        i32.const 30
        i32.eq
        (if
          (then
            (local.get $onPtr)
            (f32.add (local.get $i) (f32.const 15))
            (f32.store (memory $onIdxs))
            
            (local.set $onPtr (i32.add (local.get $onPtr) (i32.const 4)))
          )
          (else
            (i8x16.extract_lane_u 15 (local.get $chunk))
            i32.const 1
            i32.and
            (i8x16.extract_lane_u 15 (local.get $21or31))
            i32.and
            (if
              (then
                local.get $offPtr
                (f32.add (local.get $i) (f32.const 15))
                (f32.store (memory $offIdxs))
                
                (local.set $offPtr (i32.add (local.get $offPtr) (i32.const 4)))
              )
            )
          )
        )
        ;; 15 <<<---

        (local.set $i (f32.add (local.get $i) (f32.const 16)))
        (br $boardLoopTop)
      )
    )

    (global.set $onPtr (i32.div_u (local.get $onPtr) (i32.const 4)))
    (global.set $offPtr (i32.div_u (local.get $offPtr) (i32.const 4)))
  )
)