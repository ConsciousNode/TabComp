# TabComp™ 1.1 Feature Truth Table & Honest Status (`docs/FEATURES.md`)

**ConsciousNode SoftWorks QA & Verification Report — Document Part #TC-89-QA (Rev. 1.1)**

---

## 1. Version 1.1 Patch Verification Table

Every item below was **actually executed and verified** in both Node.js (`v18.20.4`) and **Headless Chromium (`156.0.8078.73`)** via Selenium WebDriver (`test_chromium_11.py`), starting strictly from `tabcomp-1.0.1-kehai-fix-1.html`.

| Patch / Requirement | Where Implemented | Status | Measured / Verified Evidence |
| :--- | :--- | :--- | :--- |
| **Font Fix Completion (`0x0EF000`) & Docs Update** | `initHardwareMemory()`, `/src/lib/std.tt`, `docs/ISA.md`, `docs/ARCHITECTURE.md`, `docs/MANUAL.md`, `docs/LANGUAGE.md` | `working` | `FONT_ROM` at `0x0EF000–0x0EF2FF` (`768 B`); all docs updated and `0x0FFE00` removed. |
| **Startup Hardware Region Bounds & Overlap Assertion** | `HARDWARE_REGIONS`, `verifyHardwareRegions()`, `initHardwareMemory()`, `drawBootBanner()` | `working` | Verifies all 6 regions (`FONT_ROM`, `VRAM`, `PALETTE`, `TIMER_MS`, `VSYNC_CNT`, `SOUND_REGS`) lie within `0x000000–0x0FFFFF` with zero overlaps; self-test #9 verifies both valid and out-of-bounds/overlapping cases. |
| **Font Bit-for-Bit Self-Test (`"aZ{~"`)** | Self-Test #9 (`Font & MMIO bounds`) in `runAllSelfTestsSync()` | `working` | Renders `"aZ{~"` via `draw_char` from TabTalk into VRAM and verifies all `256/256` pixels against `FONT_8X8_HEX` bit-for-bit. |
| **Fix 1: Tear-Free Display Present on `YIELD` + 100 ms Fallback** | `cpu.presentBuf`, `cpu.presentNow()`, `cpu.presentFallbackIfStale()`, `renderFramebufferToCanvas()` inside `/*@@PLAYER_BEGIN*/../*@@PLAYER_END*/` | `working` | `SYS 10 (YIELD)` copies `VRAM` to `presentBuf` and ends the slice; canvas renders `presentBuf` only; `>100 ms` fallback updates non-yielding console tasks; `TabBreakout.html` re-exported. |
| **Fix 1 Self-Test: Tear-Free `presentBuf` Under Tiny Slice Budget** | Self-Test #10 (`Tear-free YIELD present`) in `runAllSelfTestsSync()` | `working` | Runs TabTalk loop `cls(1) -> rect(20,20,100,60,14) -> yield()` with a 2,500-instruction slice budget (`373` slices across 3 frames) and verifies `tornSlices == 0`. |
| **Fix 2: Fast 4× Unrolled 32-Bit Word `memset`, `memcpy` & `cls` in TabTalk** | `/src/lib/std.tt` (rebuilt into `/bin/cc` and all 6 apps) | `working` | `cls(0)` reduced from **1,920,066 instructions** (1.0.1) to **544,175 instructions** (1× word loop) and **268,220 instructions** (4× unrolled word loop — **7.16× speedup**). TabBreakout at simulated 30 MIPS improved from **5.38 FPS** (`5,579,732` inst/frame) to **7.64 FPS** (`memset` only) and **15.51 FPS** (`1,934,287` inst/frame with `std.tt` `rect`/`line`/`blit` improvements — **2.88× faster**). |
| **Fix 2 Self-Test: Disk Binary Reproducibility** | Self-Test #11 (`Disk binary reproducibility`) in `runAllSelfTestsSync()` | `working` | Recompiles `/src/cc.tt`, `/src/sh.tt`, `/src/edit.tt`, `/src/sprite.tt`, `/src/breakout.tt`, `/src/tracker.tt`, `/src/tilemap.tt` with `/bin/cc` and verifies **7/7 binaries match `/bin/*` on disk byte-for-byte**. |
| **Fix 3: Shared-Memory WebAssembly Basic-Block / Superblock JIT** | `TabCompWasmJIT`, `TabCompCPU` (`wasmMem` shared at `0x000000..0x10004B`), `stepBatch()` | `working` | Compiles hot blocks (`>= 50` hits) into register-allocated Wasm functions sharing `cpu.ram` and `cpu.reg` with zero copying; invalidates on `loadBinary` (`EXEC`), `EXIT`, `Ctrl+C`, and writes `< 0x050000`. |
| **Fix 3 Self-Test A: JIT 3-Stage Bootstrap Equivalence** | Self-Test #12 (`JIT bootstrap equivalence`) in `runAllSelfTestsSync()` | `working` | Runs Stage 1 → Stage 2 → Stage 3 with `jit on`: **87,778,390 instructions executed in Wasm JIT** vs **639,372 in interpreter** (`99.28%` Wasm coverage), matching `jit off` **100% byte-for-byte** (`65,144` bytes). |
| **Fix 3 Self-Test B: JIT Tamper Fixed Point (`KEHA`)** | Self-Test #13 (`JIT tamper fixed point`) in `runAllSelfTestsSync()` | `working` | Injects `emit32(0x4148454B);` (`"KEHA"`) into `cc.tt` before `fopen(outPath, 1)`, runs 3-stage bootstrap with `jit on` (`87,820,276` Wasm instructions), and verifies `Stage 2 == Stage 3` and both end in `KEHA`. |
| **Fix 3 Honest `mips` Benchmark (No `2.5x` Fallback)** | `benchmarkRealWorkload()`, `cpu.hooks.onMips`, `/src/sh.tt` | `working` | `interpMips * 2.5` deleted; `mips` runs `/bin/cc` on `/src/cc.tt` (`44,374,175` instructions) under both Interpreter (~193 MIPS) and Wasm JIT (~208 MIPS cold, ~490 MIPS warm). |
| **Fix 4: 40-Column `help` Text & Dual Peak/Live MIPS Badge** | `/src/sh.tt` (`cmd_help()`), `updateMipsBadge()` (`#tc-core`) | `working` | All `cmd_help()` lines are `<= 39` visible chars (zero wrapping); badge displays `CPU: 300 MIPS (peak) \| run: 195.2 MIPS` (and `(JIT)` when JIT is enabled). |

---

## 2. Full Tier 1, 2 & 3 Feature Truth Table

| Tier | Feature | Where Implemented | Status | Verification Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | **32-Bit Fantasy RISC CPU (16 GPRs, 1 MiB Shared Wasm RAM, 55 Opcodes)** | `TabCompCPU` (`#tc-core`, `/*@@PLAYER_BEGIN*/`) | `working` | Executed >260M instructions across self-tests + passed `ISA` self-test in Headless Chromium. |
| **Tier 1** | **Tear-Free MMIO Display (`presentBuf` on `YIELD`, 320×200, 256 Colours, Font at `0x0EF000`)** | `renderFramebufferToCanvas()`, `initHardwareMemory()` (`#tc-core`) | `working` | Verified 0 torn slices in Self-Test #10 and 256/256 glyph bits in Self-Test #9. |
| **Tier 1** | **MMIO Keyboard Queue, Millisecond Timer & VSync Counter** | `window.addEventListener("keydown")`, `SYS 11`, `SYS 12`, `0x0FFD00` | `working` | Verified scripted key input in Headless Chromium (`mips`, `jit on`, `export`, `cp`, `save`). |
| **Tier 1** | **MMIO 4-Channel Web Audio Synthesizer (Square, Triangle, Saw, Noise)** | `TabCompSound` (`#tc-core`) + `sound()` (`/src/lib/std.tt`) | `working` | Syncs `0x0FFD20..0x0FFD3F` every frame; unlocks on first user gesture. |
| **Tier 1** | **TabTalk Systems Language & Word-Accelerated Standard Library** | `compileTabTalk()` (`#tc-core`), `/src/cc.tt`, `/src/lib/std.tt` | `working` | Compiles `/src/cc.tt` and all 6 apps with 100% disk binary reproducibility (Self-Test #11). |
| **Tier 1** | **Graphical 40×25 Shell (`/bin/sh`) & Full-Screen Editor (`/bin/edit`)** | `/src/sh.tt`, `/src/edit.tt` | `working` | Verified all 22 shell commands (`<= 40` cols per `help` line), scrollback, and editor save/quit. |
| **Tier 1** | **Self-Replicating `save` (Identity, Fidelity, Heredity, Portability)** | `buildHTMLFromPristine()`, `generateSaveHTML()`, `SYS 13` | `working` | Verified `saved_html === orig_html` and `Child == Grandchild == Great-Grandchild` in Chromium. |
| **Tier 1** | **Dual-Trigger 13-Part Self-Test (`selftest` command & `window.TABCOMP_SELFTEST()`)** | `runAllSelfTestsSync()`, `window.TABCOMP_SELFTEST`, `SYS 16` | `working` | Executed in Headless Chromium: `{ passed: 13, failed: 0 }`. |
| **Tier 2** | **Cartridge Export / "Budding!" (`export <bin> <title>`) + `TabBreakout.html`** | `generateCartridgeHTML()`, `/*@@PLAYER_BEGIN*/../*@@PLAYER_END*/`, `SYS 14` | `working` | Re-exported `TabBreakout.html` (`123,602` bytes) from 1.1; booted and verified in Chromium. |
| **Tier 2** | **16×16 Sprite Editor (`/bin/sprite`) & TabBreakout (`/bin/breakout`)** | `/src/sprite.tt`, `/src/breakout.tt`, `/home/game.spr` | `working` | Rebuilt with 1.1 `std.tt`; verified 2.88× speedup at 30 MIPS and tear-free `presentBuf`. |
| **Tier 3** | **4-Channel Chiptune Tracker (`/bin/tracker`) & 40×25 Tile Mapper (`/bin/tilemap`)** | `/src/tracker.tt`, `/src/tilemap.tt` | `working` | Rebuilt with 1.1 `std.tt` and verified byte-for-byte in Self-Test #11. |
| **Tier 3** | **Shared-Memory WebAssembly Basic-Block / Superblock JIT (`jit on` / `jit off`)** | `TabCompWasmJIT` (`#tc-core`), `SYS 21` | `working` | Executes 99.28% of `/bin/cc` instructions in Wasm; verified in Self-Tests #12 and #13. |
