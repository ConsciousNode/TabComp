# TabComp™ System Architecture (`docs/ARCHITECTURE.md`)

**ConsciousNode SoftWorks Engineering Architecture — Document Part #TC-89-ARCH (Rev. 1.2)**

---

## 1. High-Level System Diagram

```
+=============================================================================+
|                           tabcomp.html (Single File)                        |
|  +-----------------------+  +-----------------------+  +-----------------+  |
|  |  <style id="tc-style">|  | <script id="tc-disk"> |  | <canvas 320x200>|  |
|  |  Chassis, TabPad &    |  | Base64 Virtual Disk   |  | Nearest-Neighbor|  |
|  |  /*@@TABKEY_STYLE*/   |  | (/src, /bin, /home)   |  | Tear-Free CRT   |  |
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
|  |     | const VERSION = "1.2";                                       |  |  |
|  |     | Shared WebAssembly.Memory (17 pages = 1,114,112 bytes)       |  |  |
|  |     |   0x000000..0x04FFFF : Program Code & Inline Strings         |  |  |
|  |     |   0x050000..0x0BFFFF : Global Variables & Static Arrays      |  |  |
|  |     |   0x0C0000..0x0DEFFF : Full-Descending Stack (SP=0x0DF000)   |  |  |
|  |     |   0x0EF000..0x0EF2FF : 8x8 ASCII Bitmap Font ROM (768 B)     |  |  |
|  |     |   0x0F0000..0x0FF9FF : 320x200 256-Colour Live VRAM (64 KB)  |  |  |
|  |     |   0x0FFA00..0x0FFD3F : RGB Palette, Timer, VSync, 4-Ch Sound |  |  |
|  |     |   0x100000..0x10004B : Shared CPU GPRs R0..R15, PC, FLAGS    |  |  |
|  |     +--------------------------------------------------------------+  |  |
|  |     | Clock Governor (cpu.runGovernedSlice: MAX or 1..1000 MIPS,   |  |  |
|  |     |   signed overshoot carry-forward & 100 ms debt cap, SYS 22)  |  |  |
|  |     | Tear-Free Present Buffer (cpu.presentBuf = Uint8Array(64000))|  |  |
|  |     | TabCompWasmJIT (ON by default; startPc tag check on lookup)  |  |  |
|  |     | TabPad™ Builder (buildTabPad: D-pad + Space/Enter/Esc/R/Q)   |  |  |
|  |     | TabCompFS & TabCompSound                                     |  |  |
|  |     +--------------------------------------------------------------+  |  |
|  |                                                                       |  |
|  |  3. Stage 0 Boot ROM Compiler (compileTabTalk in JS)                  |  |
|  |  4. Self-Replicating Save & Cartridge Budding Engine                  |  |
|  |  5. TabKey™ 101 On-Screen Keyboard & tcHandleKey Dispatcher           |  |
|  |  6. Automated 16-Part Verification Hook (window.TABCOMP_SELFTEST)     |  |
|  +-----------------------------------------------------------------------+  |
+=============================================================================+
```

---

## 2. Startup Hardware Region Assertion & Font Placement (`0x0EF000`)

1. **`FONT_ROM` lives at `0x0EF000–0x0EF2FF` (`768` bytes)** right below `VRAM` (`0x0F0000`).
2. **Startup Bounds & Overlap Assertion (`verifyHardwareRegions`)**: Inside `initHardwareMemory(cpu)`, all 6 hardware regions (`FONT_ROM: 0x0EF000..0x0EF2FF`, `VRAM: 0x0F0000..0x0FF9FF`, `PALETTE: 0x0FFA00..0x0FFCFF`, `TIMER_MS: 0x0FFD00..0x0FFD03`, `VSYNC_CNT: 0x0FFD04..0x0FFD07`, `SOUND_REGS: 0x0FFD20..0x0FFD3F`) are checked at boot to ensure every region lies strictly within `0x000000–0x0FFFFF` and no two regions overlap.

---

## 3. Selectable Clock Governor & Front-Panel `TURBO` Button (`SYS 22`)

To guarantee predictable execution speed across desktop and mobile hardware while preserving full-speed mode:
1. **Two Operating Modes**:
   - **`MAX` (`clockRate = 0`, Turbo ON)**: Runs `stepBatch(20000)` as fast as the host allows within each `8.0 ms` animation slice.
   - **Fixed Rate (`clockRate = 1..1000` MIPS, default compatibility clock `25` MIPS when Turbo is OFF)**: `advanceClock(now)` computes `dt = now - clockLastTime` from `performance.now()` and adds `dt * clockRate * 1000` instructions to `cpu.clockBudget`.
2. **Exact Overshoot Carry-Forward & 100 ms Debt Cap**:
   - Each call to `stepBatch(batch)` subtracts the *actual* number of instructions executed (`this.clockBudget -= ran`). If a 512-iteration Wasm JIT block overshoots `batch`, `this.clockBudget` goes slightly negative and carries that overshoot into the next slice so the long-run instruction rate is exact (verified within `< 0.03%` of `25,000,000` instructions over 1 second in Self-Test #14).
   - Positive `this.clockBudget` is capped at `100 ms` of instructions (`clockRate * 100,000`) so a backgrounded browser tab never sprints when foregrounded (verified in Self-Test #15).
3. **Host Lag Detection**: If a fixed `clockRate` cannot be sustained by the host CPU for more than `1000 ms` of continuous load, `cpu.deviceLagMips` records the achieved rate and updates the badge to `CLOCK: <N> MIPS (device: <actual>)`.
4. **Hardware/Shell Synchronization**: Clicking `#tc-btn-turbo` and running `clock` (`SYS 22`) both call `cpu.setClock(rate)`, updating the LED (`#tc-turbo-led`) and badge (`#tc-mips-badge`) via `cpu.hooks.onClockChange`.

---

## 4. Tear-Free Display Presentation (`presentBuf` on `YIELD`)

1. **`cpu.presentBuf` (`Uint8Array(64000)`)**: Lives outside TabComp RAM.
2. **Present on `SYS 10 (YIELD)`**: When a TabTalk program finishes drawing a frame and executes `yield()`, `cpu.presentNow()` copies `VRAM` (`0x0F0000..0x0FF9FF`) into `cpu.presentBuf` and exits the current slice cleanly.
3. **100 ms Non-Yielding Fallback**: If a non-yielding task runs for more than `100 ms` without calling `yield()`, `cpu.presentFallbackIfStale(now)` updates `cpu.presentBuf`.
4. **Canvas Renderer Isolation**: `renderFramebufferToCanvas()` reads exclusively from `cpu.presentBuf`.

---

## 5. Shared-Memory WebAssembly JIT (ON by Default + `startPc` Tag Check)

1. **Enabled at Boot**: `TabCompCPU` initializes `this.jitEnabled = this.wasmMem ? 1 : 0;` (falling back silently to `0` if `WebAssembly` is unavailable and reporting availability in `mips`).
2. **Zero-Copy Shared `WebAssembly.Memory`**: `cpu.ram` (`0x000000..0x0FFFFF`), `cpu.reg` (`0x100000..0x10003F`), `PC` (`0x100040`), `FLAGS` (`0x100044`), and `CODE_DIRTY` (`0x100048`) share a single 17-page `WebAssembly.Memory`.
3. **20-Bit `startPc` Tag Verification**: Because `blockTable` is indexed by `(pc >>> 2) & 0xFFFF` (which wraps at 256 KiB), each compiled block stores `{ fn, startPc }` and `stepBatch()` checks `blk.startPc === pc` on every lookup, treating any mismatch as a cache miss.
4. **Coherency & Cache Invalidation**: `jit.invalidateAll()` is called automatically on `loadBinary` (`EXEC`), `EXIT` (`SYS 0`), `Ctrl+C`/`Esc` break, and any `STB`/`STH`/`STW` write to `< 0x050000`.

---

## 6. Touch Input Architecture: TabKey™ 101 vs. TabPad™

1. **TabKey™ 101 (Main Computer)**: Lives in `#tc-core` outside `/*@@PLAYER*/` with its CSS rules placed after `/*@@TABKEY_STYLE_BEGIN*/` in `#tc-style`. Feeds synthetic key events into `tcHandleKey(e)`.
2. **TabPad™ (Cartridges & Main Computer)**: `buildTabPad()` lives inside `/*@@PLAYER_BEGIN*/ … /*@@PLAYER_END*/` with `.tp-*` CSS placed before `/*@@TABKEY_STYLE_BEGIN*/`.
3. **Trimmed Cartridge Export**: `generateCartridgeHTML()` slices `PRISTINE_STYLE` up to `/*@@TABKEY_STYLE_BEGIN*/`, embeds `INITIAL_CLOCK` (`cpu.clockRate`), wires `playerHandleKey(e)` to both `keydown` and `buildTabPad()`, and includes a cartridge `TURBO` button.
