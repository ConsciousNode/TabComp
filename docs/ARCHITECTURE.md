# TabComp™ System Architecture (`docs/ARCHITECTURE.md`)

**ConsciousNode SoftWorks Engineering Architecture — Document Part #TC-89-ARCH (Rev. 1.3 — "It Runs DOOM")**

---

## 1. High-Level System Diagram

```
+=============================================================================+
|                           index.html (Single File)                          |
|  +-----------------------+  +-----------------------+  +-----------------+  |
|  |  <style id="tc-style">|  | <script id="tc-disk"> |  | <canvas 320x200>|  |
|  |  Chassis, TabPad &    |  | Base64 Virtual Disk   |  | Nearest-Neighbor|  |
|  |  /*@@TABKEY_STYLE*/   |  | (/src,/bin,/lib,/inc) |  | Tear-Free CRT   |  |
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
|  |     | const VERSION = "1.3";                                       |  |  |
|  |     | Shared WebAssembly.Memory (257 pages = 16,842,752 bytes)     |  |  |
|  |     |   0x0000000..0x004FFFF : Program Code & Inline Strings       |  |  |
|  |     |   0x0050000..0x00BFFFF : TabTalk Globals & Static Arrays     |  |  |
|  |     |   0x00C0000..0x00DEFFF : TabTalk Stack (SP=0x00DF000)        |  |  |
|  |     |   0x00EF000..0x00EF2FF : 8x8 ASCII Bitmap Font ROM (768 B)   |  |  |
|  |     |   0x00F0000..0x00FF9FF : 320x200 256-Colour Live VRAM (64KB) |  |  |
|  |     |   0x00FFA00..0x00FFD3F : RGB Palette, Timer, VSync, 4-Ch Snd |  |  |
|  |     |   0x0100000..0x0EFFFFF : C89 .data/.bss + 14 MiB Heap (DOOM) |  |  |
|  |     |   0x0F00000..0x0FF0000 : C89 Stack (SP=0x0FF0000)            |  |  |
|  |     |   0x1000000..0x100004B : Shared CPU GPRs R0..R15, PC, FLAGS  |  |  |
|  |     +--------------------------------------------------------------+  |  |
|  |     | Native Wasm i64 Fixed-Point & Multiply (FXMUL/FXDIV/MULH/U)  |  |  |
|  |     | Seekable VFS File Table (SYS 1..4, SYS 23..26)               |  |  |
|  |     | Key-Event Edge Queue (keydown/keyup -> SYS 27 KEYEVENT)      |  |  |
|  |     | Clock Governor + Machine-Governed TICKS_MS (SYS 22, SYS 28)  |  |  |
|  |     | 4-Ch Synth + 8-Bit PCM Audio Engine (SYS 30 PCM_PLAY)        |  |  |
|  |     | Tear-Free Present Buffer (cpu.presentBuf = Uint8Array(64000))|  |  |
|  |     | TabCompWasmJIT (ON by default; 24-bit startPc tag check)     |  |  |
|  |     | TabPad™ Builder (D-pad + Fire/Ctrl + Space/Enter/Esc/R/Q)    |  |  |
|  |     +--------------------------------------------------------------+  |  |
|  |                                                                       |  |
|  |  3. Stage 0 Boot ROM Compiler (compileTabTalk in JS — for cc.tt only) |  |
|  |  4. Host File Import (📂 Import + Drag-and-Drop -> /home/<name>)      |  |
|  |  5. Self-Replicating Save & Cartridge Budding (--gpl support)         |  |
|  |  6. Automated 19-Part Verification Hook (window.TABCOMP_SELFTEST)     |  |
|  +-----------------------------------------------------------------------+  |
+=============================================================================+
```

---

## 2. 16 MiB Shared-Memory Expansion (`0x0000000` – `0x0FFFFFF`)

1. **257-Page `WebAssembly.Memory` (`16,842,752` bytes):**
   - Pages `0..255` (`16,777,216` bytes, `0x0000000..0x0FFFFFF`) are guest physical RAM (`RAM_MASK = 0xFFFFFF`).
   - Page `256` (`0x1000000..0x100004B`, `CPU_STATE_BASE = 0x1000000`) holds the shared CPU register file (`R0..R15`), `PC`, `FLAGS`, and `CODE_DIRTY`.
2. **100% Backward Compatibility with 1.2.2:**
   - The entire low 1 MiB (`0x0000000..0x00FFFFF`), including `FONT_ROM` (`0x00EF000`), `VRAM` (`0x00F0000`), `PALETTE` (`0x00FFA00`), `TIMER_MS` (`0x00FFD00`), `VSYNC_CNT` (`0x00FFD04`), and `SOUND_REGS` (`0x00FFD20`), is untouched.
   - `EXEC` (`SYS 9`) snapshots low 1 MiB (`0x000000..0x0E0000`) plus only the active high-memory range (`0x0100000..highUsedEnd`) and stack (`0x0FE0000..0x0FF0000`) so nested process invocation (`sh -> c89 -> cpp/cc1/ld`) is fast and restores parent state cleanly.

---

## 3. Two-Tier Self-Hosted Compiler Architecture (`Stage 0 -> /bin/cc -> /bin/c89`)

TabComp™ 1.3 strictly obeys the One Architectural Rule: **JavaScript implements only the hardware and the Stage 0 TabTalk bootstrap compiler.** The entire C89 toolchain is software written in TabTalk, compiled by `/bin/cc`, and running on the TabComp CPU:

```
  [Stage 0 JS Boot ROM]
           |  (used only during `rebootstrap` Stage 1)
           v
   /src/cc.tt  ==(/bin/cc)==>  /bin/cc  (Self-Hosting Fixed Point: Stage 1 == 2 == 3)
                                  |
        +-------------------------+-------------------------+--------------------+
        |                         |                         |                    |
        v                         v                         v                    v
   /src/cpp.tt               /src/cc1.tt               /src/ld.tt          /src/c89.tt
   -> /bin/cpp               -> /bin/cc1               -> /bin/ld          -> /bin/c89
 (C Preprocessor)        (C89 -> TCO1 .o)          (TCO1 .o -> Binary)    (Compiler Driver)
        |                         |                         |
        +-------------------------+-------------------------+
                                  |
                                  v
            /src/libc.c  ==(/bin/c89 -c)==>  /lib/libc.o (54 KB)
     /src/doom/*.c + *.o ==(/bin/c89)=====>  /bin/doombench & /bin/doom
```

---

## 4. DOOM Platform Layer (`doomgeneric_tabcomp.c`) & Hardware Acceleration

1. **64-Bit Fixed-Point Instructions (`FXMUL` `0x37`, `FXDIV` `0x38`):**
   - Lowered directly to native WebAssembly `i64` arithmetic (`i64.extend_i32_s`, `i64.mul`, `i64.shr_s`, `i64.div_s`) inside `TabCompWasmJIT`.
   - `FXDIV` implements exact DOOM `FixedDiv` saturation semantics (`(abs(a) >> 14) >= abs(b) -> (a ^ b) < 0 ? 0x80000000 : 0x7FFFFFFF`), eliminating division-by-zero traps during wall/column projection.
2. **Direct 320×200 Framebuffer & Palette Mapping (`DG_DrawFrame`):**
   - When `CMAP256 == 1` (8-bit indexed mode), `DG_DrawFrame()` copies the 64,000-byte `DG_ScreenBuffer` straight to `0x0F0000` (`VRAM`) and executes `SYS 10 (YIELD)`.
   - When `DG_ScreenBuffer` is 32-bit `0x00RRGGBB` (`320×200×4`), `DG_DrawFrame()` maps RGB pixels through a 32-KB 15-bit RGB555 lookup table into `VRAM` and syncs `I_SetPalette` (`768` bytes) to `0x0FFA00`.
3. **Edge-Triggered Keyboard Queue (`SYS 27 KEYEVENT` / `DG_GetKey`):**
   - Physical `keydown`/`keyup` events, **TabKey™ 101** taps, and **TabPad™** holds push `{ pressed: 1|0, code }` transitions into `cpu.keyEventQueue`, allowing simultaneous multi-key movement (e.g., turning while strafing and firing).
4. **Governed Millisecond Clock (`SYS 28 TICKS_MS` / `DG_GetTicksMs`):**
   - Returns real elapsed milliseconds in TURBO mode (`clock max`) and instruction-governed milliseconds (`totalSteps / (clockRate * 1000)`) when a fixed clock (`clock 25`) is active, so DOOM's 35 Hz tic loop scales accurately with the hardware clock governor.
5. **GPL-2.0 Cartridge Export (`export --gpl`):**
   - TabComp™ 1.3 remains MIT-licensed. When exporting a cartridge linked with `doomgeneric` (or when `--gpl` is passed to `export`), `generateCartridgeHTML()` embeds a clear GNU General Public License v2.0 header and source pointer in the exported HTML file (`DOOM.html`), while keeping `TabBreakout.html` MIT-licensed.
