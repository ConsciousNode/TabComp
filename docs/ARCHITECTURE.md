# TabComp™ System Architecture (`docs/ARCHITECTURE.md`)

**ConsciousNode SoftWorks Engineering Architecture — Document Part #TC-89-ARCH (Rev. 1.1)**

---

## 1. High-Level System Diagram

```
+=============================================================================+
|                           tabcomp.html (Single File)                        |
|  +-----------------------+  +-----------------------+  +-----------------+  |
|  |  <style id="tc-style">|  | <script id="tc-disk"> |  | <canvas 320x200>|  |
|  |  Chassis & CRT Styles |  | Base64 Virtual Disk   |  | Nearest-Neighbor|  |
|  +-----------+-----------+  +-----------+-----------+  +--------+--------+  |
|              |                          |                       ^           |
|              v                          v                       |           |
|  +--------------------------------------------------------------+--------+  |
|  |                      <script id="tc-core">                            |  |
|  |                                                                       |  |
|  |  1. PRISTINE SNAPSHOT CAPTURE (at startup, before any DOM touch):     |  |
|  |     PRISTINE_STYLE, PRISTINE_DISK, PRISTINE_CORE                      |  |
|  |                                                                       |  |
|  |  2. /*@@PLAYER_BEGIN*/ ... /*@@PLAYER_END*/ (Single Source of Truth)  |  |
|  |     +--------------------------------------------------------------+  |  |
|  |     | Shared WebAssembly.Memory (17 pages = 1,114,112 bytes)       |  |  |
|  |     |   0x000000..0x04FFFF : Program Code & Inline Strings         |  |  |
|  |     |   0x050000..0x0BFFFF : Global Variables & Static Arrays      |  |  |
|  |     |   0x0C0000..0x0DEFFF : Full-Descending Stack (SP=0x0DF000)   |  |  |
|  |     |   0x0EF000..0x0EF2FF : 8x8 ASCII Bitmap Font ROM (768 B)     |  |  |
|  |     |   0x0F0000..0x0FF9FF : 320x200 256-Colour Live VRAM (64 KB)  |  |  |
|  |     |   0x0FFA00..0x0FFD3F : RGB Palette, Timer, VSync, 4-Ch Sound |  |  |
|  |     |   0x100000..0x10004B : Shared CPU GPRs R0..R15, PC, FLAGS    |  |  |
|  |     +--------------------------------------------------------------+  |  |
|  |     | Tear-Free Present Buffer (cpu.presentBuf = Uint8Array(64000))|  |  |
|  |     |   Updated on SYS 10 (YIELD) or >100 ms non-yielding fallback |  |  |
|  |     +--------------------------------------------------------------+  |  |
|  |     | TabCompWasmJIT (Register-Allocated Shared-Memory Wasm JIT)   |  |  |
|  |     | TabCompFS (Hierarchical Virtual Disk exposed via SYS 1..8)   |  |  |
|  |     | TabCompSound (4-Channel Web Audio API Synthesizer)           |  |  |
|  |     +--------------------------------------------------------------+  |  |
|  |                                                                       |  |
|  |  3. Stage 0 Boot ROM Compiler (compileTabTalk in JS)                  |  |
|  |  4. Self-Replicating Save & Cartridge Budding Engine                  |  |
|  |  5. Automated 13-Part Verification Hook (window.TABCOMP_SELFTEST)     |  |
|  +-----------------------------------------------------------------------+  |
+=============================================================================+
```

---

## 2. Startup Hardware Region Assertion & Font Placement (`0x0EF000`)

In TabComp™ 1.0, the 768-byte 8×8 font (`ASCII 32..127`) was placed at `0x0FFE00`, which caused glyphs `96..127` (`0x100000..0x1000FF`) to run past the 1 MiB top of RAM (`0x100000`) and wrap around to address `0x000000`.
In TabComp™ 1.1:
1. **`FONT_ROM` lives at `0x0EF000–0x0EF2FF` (`768` bytes)** right below `VRAM` (`0x0F0000`).
2. **Startup Bounds & Overlap Assertion (`verifyHardwareRegions`)**: Inside `initHardwareMemory(cpu)`, all 6 hardware regions (`FONT_ROM: 0x0EF000..0x0EF2FF`, `VRAM: 0x0F0000..0x0FF9FF`, `PALETTE: 0x0FFA00..0x0FFCFF`, `TIMER_MS: 0x0FFD00..0x0FFD03`, `VSYNC_CNT: 0x0FFD04..0x0FFD07`, `SOUND_REGS: 0x0FFD20..0x0FFD3F`) are checked at boot to ensure every region lies strictly within `0x000000–0x0FFFFF` and no two regions overlap. Any violation halts normal POST banner progression and prints a red `POST HW ASSERT FAIL` diagnostic on screen.

---

## 3. Tear-Free Display Presentation (`presentBuf` on `YIELD`)

To eliminate mid-frame tearing ("VHS camcorder flicker") when a program's frame rendering spans multiple 8 ms browser time slices:
1. **`cpu.presentBuf` (`Uint8Array(64000)`)**: Lives outside TabComp RAM.
2. **Present on `SYS 10 (YIELD)`**: When a TabTalk program finishes drawing a frame and executes `yield()`, `cpu.presentNow()` copies `VRAM` (`0x0F0000..0x0FF9FF`) into `cpu.presentBuf` and exits the current `stepBatch` slice cleanly.
3. **100 ms Non-Yielding Fallback**: If a program (such as a long computation or busy stdout print) runs for more than `100 ms` without calling `yield()`, `cpu.presentFallbackIfStale(now)` copies live `VRAM` into `cpu.presentBuf` so console output still updates smoothly.
4. **Canvas Renderer Isolation**: `renderFramebufferToCanvas()` reads exclusively from `cpu.presentBuf`, never from live `VRAM`. Because this logic lives inside `/*@@PLAYER_BEGIN*/ … /*@@PLAYER_END*/`, budded cartridges (`TabBreakout.html`) inherit tear-free presentation automatically.

---

## 4. Shared-Memory WebAssembly Basic-Block / Superblock JIT

When `jit on` (`SYS 21`) is enabled, `cpu.stepBatch()` accelerates program execution using `TabCompWasmJIT`:
1. **Zero-Copy Shared `WebAssembly.Memory`**: `TabCompCPU` allocates a 17-page `WebAssembly.Memory` (`1,114,112` bytes). `cpu.ram` (`0x000000..0x0FFFFF`), `cpu.reg` (`0x100000..0x10003F`), `PC` (`0x100040`), `FLAGS` (`0x100044`), and `CODE_DIRTY` (`0x100048`) are typed-array views over the exact same underlying buffer imported as `e.m` by every compiled Wasm module.
2. **Hot-Block Compilation (`>= 50` executions)**: When a basic block entry `pc` reaches 50 executions in `hotCounts[(pc >>> 2) & 0xFFFF]`, `compileBasicBlock(pc)` translates up to 64 instructions (following forward unconditional `JMP`s and wrapping self-loops `JMP startPc` or `Jcc startPc` in a 512-iteration native Wasm `loop`) into a standalone WebAssembly function `() -> i32`.
3. **Register Allocation in Wasm Locals**: Inside each compiled Wasm block, `R0..R15` and `FLAGS` are mapped to Wasm `i32` locals (`local 0..16`). Only registers touched by the trace are loaded from `0x100000` in the prologue, and only modified registers are written back in the single epilogue block.
4. **Coherency & Cache Invalidation**: `jit.invalidateAll()` is called automatically on `loadBinary` (`EXEC`), on process exit (`SYS 0` popping `procStack`), on `Ctrl+C`/`Esc` break, and whenever any `STB`/`STH`/`STW` instruction writes to code memory (`< 0x050000`).

---

## 5. The 3-Stage Self-Hosting Bootstrap Chain

Both **Stage 0** (JavaScript) and **`/src/cc.tt`** (TabTalk) implement the **exact same single-pass recursive-descent algorithm, symbol table layout, register allocation, and instruction emission rules**:

```
  +-------------------+
  |   /src/cc.tt      |  (TabTalk source code + /src/lib/std.tt on disk)
  +---------+---------+
            |
            |  Compiled by Stage 0 (JS boot ROM compiler)
            v
  +-------------------+
  |  Stage 1 Binary   |  (65,144 bytes of TabComp 32-bit machine code)
  +---------+---------+
            |
            |  Loaded into TabCompCPU at 0x000000; compiles /src/cc.tt
            v
  +-------------------+
  |  Stage 2 Binary   |  (65,144 bytes — 44,374,175 CPU instructions executed)
  +---------+---------+
            |
            |  Loaded into TabCompCPU at 0x000000; compiles /src/cc.tt
            v
  +-------------------+
  |  Stage 3 Binary   |  (65,144 bytes — 44,374,175 CPU instructions executed)
  +---------+---------+
            |
            +===> FIXED-POINT VERIFIED: Stage 1 == Stage 2 == Stage 3 (100% Byte-Identical
                  under both Interpreter and WebAssembly JIT!)
```

---

## 6. Deterministic Self-Replicating `save` & Cartridge Budding (`export`)

1. **Pristine Startup Capture:** At startup, `#tc-style`, `#tc-disk`, and `#tc-core` `.textContent` are captured into immutable constants before any DOM touch.
2. **Canonical Disk Serialization:** `serializeDiskB64(vfs)` sorts all directory and file keys lexicographically, ensuring `save` on an unmodified disk produces a file **100% byte-for-byte identical** to `tabcomp.html`, and child/grandchild/great-grandchild saves remain byte-identical across generations.
3. **Cartridge Budding (`export /bin/breakout TabBreakout`):** Slices `PRISTINE_CORE` between `/*@@PLAYER_BEGIN*/` and `/*@@PLAYER_END*/` and packages the target binary plus `.spr`/`.trk`/`.map` assets into a standalone HTML cartridge (`TabBreakout.html`).
