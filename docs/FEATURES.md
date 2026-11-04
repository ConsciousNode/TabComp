# TabComp™ 1.2 Feature Truth Table & Honest Status (`docs/FEATURES.md`)

**ConsciousNode SoftWorks QA & Verification Report — Document Part #TC-89-QA (Rev. 1.2)**

---

## 1. Benchmark & Measurement Attribution

To keep all performance claims transparent and reproducible, every number in this document is explicitly attributed to the environment that measured it:

1. **ConsciousNode Studio Independent Playwright Harness (Kehai Interim, verified on TabComp 1.1 / 1.1.1):**
   - **Desktop Chromium (`tests/` in `ConsciousNode/TabComp`):**
     - `mips` real compiler workload: **233 MIPS** on the interpreter, **389 MIPS** on the warm Wasm JIT (**99.3%** of instructions executed in WebAssembly).
     - **TabBreakout™**: **160 blocks compiled**, zero needless invalidations, **99.97%** of instructions executed in WebAssembly; holds a locked **60 FPS** with `jit on` (**40 FPS** on the interpreter).
   - **6× CPU Throttling (Simulated Phone Speed in Studio Playwright):**
     - **Flicker test:** **0 half-drawn frames** in 5 seconds with both JIT on and JIT off (down from 98 half-drawn frames in 1.0.2).
     - **TabBreakout™ frame rate:** **31 FPS** with `jit on` (**13 FPS** on the interpreter).
2. **Our Sandbox Linux VM Container (`Node.js v22` + Headless Chromium via Selenium WebDriver, verified on TabComp 1.2):**
   - **Clock Governor 1.0s Wall-Time Test (`clock 25`):** **25,000,000 instructions** executed with JIT off (`0.000%` error) and **25,006,564 instructions** executed with JIT on (`+0.026%` error, well within the `±3%` specification).
   - **Clock Debt Cap Test (2.0s Simulated Stall at `clock 25`):** **2,503,306 instructions** executed on catch-up (`~100.1 ms` at 25 MIPS, confirming the 100 ms debt cap).
   - **TabBreakout™ 5-Second Fixed-Timestep Physics Test (Headless Chromium, 60 Hz cadence):**
     - Under **`clock max`** (`JIT on`): **1,248 px** ball distance travelled (`312` physics steps of 16 ms in 5.000 s) at **59.6 FPS** (`99.95%` Wasm coverage).
     - Under **`clock 25`** (`JIT on`, 25 MIPS compatibility clock): **1,244 px** ball distance travelled (`311` physics steps of 16 ms in 5.000 s) at **30.2 FPS** (`24.9 MIPS` average, `99.91%` Wasm coverage).
     - **5-second ball distance difference (`clock max` vs `clock 25`):** **0.32%** (`1,248 px` vs `1,244 px`).

---

## 2. Version 1.2 Patch Verification Table

Every item below was **actually executed and verified** in both Node.js and **Headless Chromium** (`test_chromium_12.py`), starting strictly from `tabcomp-1.1.1-1.html` (preserving **TabKey™ 101** and `tcHandleKey`).

| Patch / Requirement | Where Implemented | Status | Measured / Verified Evidence |
| :--- | :--- | :--- | :--- |
| **Preserved 1.1.1 `TabKey™ 101` & `tcHandleKey(e)`** | `#tc-style` (`.tk-*`), `#tc-core` (`tcHandleKey`, `buildTabKey`) | `working` | Kept intact in `tabcomp.html`; feeds physical and synthetic touch keys (including `↑`/`↓`/`Tab`) through `tcHandleKey(e)`. |
| **Feature 1: Elapsed-Time Clock Governor (`MAX` or `1..1000` MIPS, Overshoot Carry & 100 ms Debt Cap)** | `TabCompCPU` (`setClock`, `advanceClock`, `runGovernedSlice`) inside `/*@@PLAYER_BEGIN*/../*@@PLAYER_END*/` | `working` | Self-Test #14 verifies 1.0s wall-time run at `clock 25`: `25,000,000` inst (JIT off, `0.00%` diff) and `25,006,564` inst (JIT on, `+0.026%` diff). Self-Test #15 verifies a 2.0s stall caps catch-up at `2,503,306` inst (`100.1 ms`). |
| **Feature 1: Front-Panel `TURBO` Button with LED, Badge & Host-Lag Indicator** | `.tc-controls` (`#tc-btn-turbo`, `#tc-turbo-led`, `#tc-mips-badge`), `updateMipsBadge()` | `working` | LED lit = `CLOCK: MAX \| ... MIPS (JIT)`; LED dark = `CLOCK: 25 MIPS (turbo off)` (or `CLOCK: <N> MIPS (device: <actual>)` if behind for `> 1s`). |
| **Feature 1: `SYS 22 CLOCK` & Shell `clock` Command (`clock`, `max`, `25`, `on`, `off`)** | `handleSys(22)`, `/src/lib/std.tt` (`sys_clock`), `/src/sh.tt` | `working` | Verified bidirectional sync between `#tc-btn-turbo` and shell `clock` commands in Headless Chromium; `mips` ignores governor and states so in its output. |
| **Feature 1: Cartridge Clock Memory & Cartridge `TURBO` Toggle** | `generateCartridgeHTML()` (`INITIAL_CLOCK`, `#tc-btn-turbo`, `#tc-cart-clock`) | `working` | Exported cartridges embed `INITIAL_CLOCK` from `cpu.clockRate` at export time and include a working `TURBO` button + LED. |
| **Feature 2: 32-Entry Command History (`Up`/`Down`, Draft Restore, `history`, `!!`, `!n`)** | `/src/sh.tt` (`hist_buf[4096]`, `replace_cmd_line`, `record_history`, `cmd_history`) | `working` | Self-Test #16 injects `ver\n`, `ls\n`, `↑`, `↑`, `\n` into `/bin/sh` and verifies `ver` was recalled and executed after `ls`. |
| **Feature 2 Stretch: `Tab` Filename & Directory Completion** | `/src/sh.tt` (`tab_complete()` on `ascii == 9`) | `working` | Completes files/directories in `cwd`, typed path prefixes, or `/bin` (e.g. `cat /READ<Tab>` → `cat /README.TXT`); lists multiple matches cleanly. |
| **Feature 3: Breakout 16 ms Fixed-Timestep Physics & Re-Exported `TabBreakout.html`** | `/src/breakout.tt` (`millis()` accumulator, `16 ms` step, max `4` steps/frame), `/src/lib/std.tt` (`rect`) | `working` | Over 5.0s in Headless Chromium: `clock max` travels **1,248 px** (`312` steps, **59.6 FPS**) and `clock 25` travels **1,244 px** (`311` steps, **30.2 FPS**) — **0.32% difference**. |
| **Fix 4: WebAssembly JIT ON by Default** | `TabCompCPU` (`this.jitEnabled = this.wasmMem ? 1 : 0`), `drawBootBanner()`, `updateMipsBadge()` | `working` | Boots with `jitEnabled = 1`; BIOS banner and badge display `(JIT)`; `jit off` and dual-mode self-tests remain fully supported. |
| **Fix 5: `TabPad™` Touch Game Controller in `@@PLAYER` & Trimmed Cartridge CSS** | `buildTabPad()`, `playerHandleKey(e)`, `/*@@TABKEY_STYLE_BEGIN*/` in `#tc-style` | `working` | Cartridges include `TabPad™` (`◀ ▲ ▼ ▶` with held auto-repeat + `Space`, `Enter`, `Esc`, `R`, `Q`), auto-show on `(pointer: coarse)`, and strip `.tk-*` CSS rules (verified in Self-Test #7 and Headless Chromium). |
| **Fix 6: JIT `startPc` Tag Check, Single `VERSION = "1.2"`, & Benchmark Attribution** | `TabCompWasmJIT` (`blk.startPc === pc`), `const VERSION = "1.2"`, `sys_version()` | `working` | `blockTable` lookup verifies `blk.startPc === pc`; `<title>`, `.tc-logo`, BIOS, `ver`, `/README.TXT`, and docs all derive from `"1.2"`. |

---

## 3. Complete 16-Part Automated Self-Test Suite (`selftest` & `window.TABCOMP_SELFTEST()`)

Executed in Headless Chromium (`{ passed: 16, failed: 0 }`):

| # | Self-Test Name | Status | Headless Chromium Result Detail |
| :--- | :--- | :--- | :--- |
| 1 | `ISA` | `PASS` | `R3=-6,R4=-2,R6=-25,R7=231,R8=-6` |
| 2 | `Compiler` | `PASS` | `fact(5)+strlen('TabComp')=127` |
| 3 | `Bootstrap fixed point` | `PASS` | `stage2==stage3:true, stage1==stage2:true (66316 bytes)` |
| 4 | `FS` | `PASS` | `read=XINU-1989,listOk=true,deleted=true` |
| 5 | `Save identity` | `PASS` | `len=755441,byteIdentical=true` |
| 6 | `Save fidelity` | `PASS` | `restored=HEREDITY-OK-42,files=21` |
| 7 | `Export` | `PASS` | `cartSize=139709,hasTabPad=true,trimmedCSS=true` |
| 8 | `Performance` | `PASS` | `162.2 MIPS (peak)` in Chromium (`368.2 MIPS` in Node) |
| 9 | `Font & MMIO bounds` | `PASS` | `hwAssert=true,glyphs='aZ{~'(256/256 bits match)` |
| 10 | `Tear-free YIELD present` | `PASS` | `frames=3,slices=361,tornSlices=0` |
| 11 | `Disk binary reproducibility` | `PASS` | `7/7 binaries match /src/*.tt byte-for-byte` |
| 12 | `JIT bootstrap equivalence` | `PASS` | `jitSteps=88824686,interpSteps=641632,matchInterp=true` |
| 13 | `JIT tamper fixed point` | `PASS` | `tail=KEHA,s2==s3=true,jitSteps=88867032` |
| 14 | `Clock governor (25 MIPS)` | `PASS` | `interp=25000000,jit=25006564 (target 25M ±3%)` |
| 15 | `Clock debt cap (2s stall)` | `PASS` | `catchup=2503306 inst (~100.1ms at 25 MIPS)` |
| 16 | `Shell command history` | `PASS` | `recalled='ver',lsPos=630,verAfterLs=741` |
