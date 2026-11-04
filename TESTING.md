# Testing TabComp™

Independent verification by **Kehai Interim**, 2026-11-03, in headless Chromium (Playwright). Everything here can be rerun:

```
npm i playwright            # or use a global install
node tests/verify.mjs                          # tests index.html (now 1.1.1)
node tests/verify.mjs versions/tabcomp-1.0.html
node tests/flicker.mjs [file] [throttle] [on|off]   # Breakout: torn frames and frames per second
node tests/tabkey.mjs [file]                   # the on-screen keyboard, as a touch phone
```

## Results

| Check | 1.0 (as delivered) | 1.0.1 | 1.1 | 1.1.1 |
|---|---|---|---|---|
| Self-test (`window.TABCOMP_SELFTEST()`) | 8/8 | 8/8 | 13/13 | 13/13 |
| No page errors, no network requests | ✓ | ✓ | ✓ | ✓ |
| Save identity (`save` reproduces the running file) | ✗ by one byte, see below | ✓ byte for byte | ✓ (same lost newline, restored) | ✓ byte for byte |
| Heredity (child = grandchild = great-grandchild) | ✓ | ✓ | ✓ | ✓ |
| Tamper test: rebuilt `/bin/cc` ends in `KEHA` | ✓ | ✓ | ✓ | ✓ |
| Tamper test: program compiled on the CPU ends in `KEHA` | ✓ | ✓ | ✓ | ✓ |
| Lowercase text renders | ✗ garbled | ✓ | ✓ | ✓ |
| Breakout torn frames (5 s, phone-speed throttle) | many | 98 (1.0.2) | **0** | **0** |
| On-screen keyboard types into the shell | n/a | n/a (1.0.2 ✓) | n/a | ✓ |

## The tamper test (is the self-hosting real?)

The self-test says stage 2 equals stage 3, but a self-test can only report what the program says about itself. So:

1. Reading the source shows that the JavaScript compiler (`compileTabTalk`) is called in exactly one place: stage 1 of `runThreeStageBootstrap()`. None of the 22 `SYS` calls compiles anything.
2. `tests/verify.mjs` adds one line to the compiler's own TabTalk source, `/src/cc.tt`: `emit32(0x4148454B);` just before the output file is written, so every binary that compiler produces ends in the bytes `KEHA`.
3. After `rebootstrap` (which installs the new `/bin/cc` only if stage 2 equals stage 3), the installed compiler ends in `KEHA`. A program compiled afterwards with `cc` also ends in `KEHA`.

Stage 1 is built by the JavaScript compiler, which knows nothing about the edit. So the `KEHA` bytes can only come from the TabTalk compiler running on the TabComp CPU, obeying its own modified source. The bootstrap is genuine. (See Ken Thompson, *Reflections on Trusting Trust*, 1984.)

## Bugs found

### 1. Lowercase letters were garbage (fixed in 1.0.1)

The 8×8 font (ASCII 32–127, 96 glyphs × 8 bytes = **768 bytes**) was loaded at `0x0FFE00`. RAM ends at `0x100000`, and `0x0FFE00 + 768 = 0x100100`, so only the first 64 glyphs (space through `_`, which includes all the uppercase) fit. Glyphs 96–127 (`` ` ``, **every lowercase letter**, `{|}~`) were never stored. The CPU masks addresses to 1 MiB, so reading them wrapped around to address 0, and the shell drew its own machine code as lowercase letters.

**Fix:** the font moved to `0x0EF000`, which is unused: program loading and process snapshots only touch `0x000000–0x0DFFFF`. Three places changed: `initHardwareMemory`, the boot banner's `drawStr`, and `const FONT_ADDR` in `/src/lib/std.tt`. Then **TabComp rebuilt itself:** `rebootstrap`, then `cc` for `sh`, `edit`, `sprite`, `breakout`, `tracker` and `tilemap`, then `save`. `versions/tabcomp-1.0.1.html` (identical to `index.html`) is that saved file, and `cartridges/TabBreakout.html` was re-exported from it.

### 2. The WebAssembly JIT didn't run programs (reported for 1.1, fixed in 1.1)

`TabCompWasmJIT.compileBasicBlock` really does hand-emit a valid WebAssembly binary. But it is called only from `benchmarkMips()`, on a synthetic loop of 15 `ADDI` instructions. `stepBatch()` never runs JIT code, so `jit on` only changes the MIPS badge, and the "~800 MIPS" is that toy loop. If the block fails to compile, the benchmark returns `interpMips * 2.5`, a number nobody measured. `docs/FEATURES.md` has been corrected to `partial`.

### 3. Breakout flickered on slower devices (reported for 1.1, fixed in 1.1)

The player runs the CPU for up to 8 ms per animation frame and then shows video memory **whether or not the program has finished drawing**. Breakout clears the screen with a byte-at-a-time `memset` over 64,000 pixels (roughly 500,000+ instructions), so on a phone most frames are shown half-drawn. The fix requested: present a frame only on `yield()`, and use 32-bit word stores in `memset`/`memcpy`.

### Note: 1.0 save identity, off by one byte

`versions/tabcomp-1.0.html` is the file as it arrived. Its own `save` produces the same bytes **plus one trailing newline**. Argon's report gives the original as 617,766 characters, which is the size `save` reproduces, so the newline was most likely lost on the way from Argon to the studio. It isn't a flaw in the mechanism: from the first save on, every generation is byte-identical.

## 1.0.2: TabKey™ 101

The on-screen keyboard is built entirely by the core script and styled from `#tc-style`, so `save` reproduces it like everything else. `tests/verify.mjs` passes all 7 checks on 1.0.2, including byte-for-byte save identity. In a Pixel 7 emulation, typing `help` and `cat /README.TXT` (capitals via one-shot Shift) works. Shift and Ctrl are one-shot; a double-tap locks them, but only when the two taps are consecutive. Backspace, Space, the arrows and PgUp/PgDn auto-repeat when held. Cartridges are unaffected: the keyboard lives outside the `@@PLAYER` region.

## 1.1: auditing Argon's patch

Argon's 1.1 docs make big claims, so each one was checked against the code and measured, not taken from its own reports.

- **The JIT is real now.** `stepBatch()` counts how often each block of code runs; after 50 runs it hand-assembles that block into a genuine WebAssembly module, keeps the registers in Wasm locals, and runs it directly on the same memory the interpreter uses. Instrumented during Breakout: 160 blocks compiled, zero needless cache flushes, and 99.97% of instructions ran inside WebAssembly. `rebootstrap` still reaches the fixed point with the JIT on and off, and the KEHA tamper test passes in 1.1's own self-test with the JIT on.
- **`mips` is honest.** The made-up `× 2.5` is gone. It now compiles `/src/cc.tt` three times (interpreter, cold JIT, warm JIT) and reports the timings. Measured here: interpreter 233 MIPS, cold JIT 288, warm JIT 389, 99.3% of instructions in Wasm.
- **The flicker is gone.** `tests/flicker.mjs` records every frame the page paints. At 6× CPU throttling (roughly a phone), 1.0.2 showed 98 half-drawn frames in 5 seconds. 1.1 showed **0**, with the JIT on or off: the canvas now only ever shows a copy taken when the program calls `yield()`.
- **Breakout is faster.** Counting real presents per second: about 40 fps on the interpreter and a locked **60 fps with `jit on`** on desktop; about 13 fps vs **31 fps** at phone speed. Each frame costs about 1.9 million instructions (Argon reports 1,934,287).
- **Argon's cartridge checks out.** `cartridges/TabBreakout.html` is byte-identical to what 1.1 exports itself.

Small things noticed, none of them blocking:

- The JIT is **off at boot**; type `jit on`. (Turning it on by default would be a one-line change for 1.2.)
- Breakout moves the ball one step per drawn frame, so the game runs faster on faster machines. A 1.2 could pace it with `millis()`.
- The JIT's block table is indexed by the low 16 bits of `pc / 4`, so two blocks exactly 256 KB apart would share a slot. Every program on the disk is under 66 KB, so it can't happen today, but a program over 256 KB would need a tag check.
- Cartridges copy the computer's whole stylesheet, so a cartridge exported from 1.1.1 carries TabKey's styles unused (about 1.4 KB). Cartridges have no on-screen keyboard yet.

## 1.1.1: TabKey™ on 1.1

The same keyboard as 1.0.2, carried over unchanged: 1.1's keyboard handler became the named function `tcHandleKey`, and the board's styles and builder were added after it, exactly as in 1.0.2. Nothing else differs from 1.1 except the version label. `tests/tabkey.mjs` (Pixel 7 emulation) types `ver` and `ls /bin` on the on-screen keys alone, and `tests/verify.mjs` passes all 7 checks, including byte-for-byte save identity.

## Measured (1.0)

- Interpreter: **~214 MIPS** (Chromium, desktop-class container). The live badge reads lower (38–78) because it measures while rendering.
- Each stage of the self-compilation: about 43 million TabComp instructions.
- No network: the CSP `default-src 'none'` holds, and zero requests were observed.
