# TabComp™ 1.1 User's Guide & Technical Manual (`docs/MANUAL.md`)

**CONGRATULATIONS ON YOUR UPGRADE TO TABCOMP™ 1.1!**  
*The Computer That Fits In Your Tab!*  
Published by **ConsciousNode SoftWorks**, Mountain View & Cyberia — Fall 1989 (Rev. 1.1 Performance & Flicker-Free Edition)  
**Catalog No.** CNSW-TC1100-BX • **Suggested Retail Price:** $49.95 (Free 3.5" Upgrade Disk for Registered 1.0 Owners!)

---

## What's New in 1.1! (ConsciousNode Engineering Bulletin)

> **ATTENTION REGISTERED TABCOMP™ PIONEERS!**  
> Your 1.1 ROM & System Disk upgrade delivers four major breakthroughs straight from the ConsciousNode SoftWorks hardware and systems lab:
> 1. **Zero-Tear "Present-on-YIELD" Display Engine:** Say goodbye to "VHS camcorder" screen flicker on portable and handheld tab computers! TabComp™ 1.1 introduces a dedicated 64,000-byte hardware **Present Buffer**. `VRAM` (`0x0F0000`) is latched to the CRT only when your program calls `yield()` (with an automatic 100 ms fallback for non-yielding console tasks), guaranteeing that half-cleared frames never reach the glass!
> 2. **7.16× Faster 32-Bit Word-Aligned `memset`, `memcpy` & `cls` in TabTalk:** `/src/lib/std.tt` now packs 4-byte words (`v | v<<8 | v<<16 | v<<24`) and blasts 16 bytes per iteration in a 4× unrolled `int*` loop! Clearing the 320×200 screen (`cls(0)`) drops from **1,920,066 instructions** to **268,220 instructions**,nearly tripling **TabBreakout™** frame rates on 30 MIPS mobile tabs!
> 3. **True Shared-Memory WebAssembly Basic-Block JIT (`jit on`):** CPU RAM (`0x000000..0x0FFFFF`) and registers (`0x100000..0x10004B`) now live directly inside shared `WebAssembly.Memory`. Hot basic blocks and loops (`>= 50` hits) compile on the fly into register-allocated WebAssembly functions executing **99.3% of all `/bin/cc` compiler instructions natively in Wasm** (~490 MIPS on compiler self-builds and >1,200 MIPS in **TabBreakout™**)!
> 4. **Protected Font ROM (`0x0EF000`) & POST Hardware Map Guard:** `FONT_ROM` is safely stationed at `0x0EF000–0x0EF2FF`, backed by a startup BIOS bounds-and-overlap assertion across all 6 MMIO regions and a **13-part `selftest` suite**!

---

## Welcome to the XINU Revolution!

Dear Personal Computing Pioneer,

Stop us if you've heard this one before: you buy a shiny new workstation, and before you can write a single line of code, you need fourteen megabytes of shared libraries, a package manager, three daemon processes, and a dedicated leased telephone line to a university minicomputer in New Jersey!

At **ConsciousNode SoftWorks**, we asked a radical question: *What if we inverted Unix?*
We call our house philosophy **XINU** (*Xinu Is Opposite to Unix*):
- **Single File:** Your entire personal computer—32-bit RISC CPU, 1,048,576 bytes of RAM, 256-colour VGA-class graphics adapter, 4-channel programmable sound synthesizer, stage-0 ROM compiler, self-hosting systems compiler, command shell, full-screen editor, sprite studio, chiptune tracker, tile mapper, and arcade game—lives inside **one self-contained HTML file**.
- **Zero Dependencies:** Not a single external script, stylesheet, font, or network request.
- **Self-Replicating Persistence:** When you type `save`, TabComp™ gives birth to a brand-new `tabcomp-YYYYMMDD-HHMM.html` file containing your entire modified hard disk inside it. Copy it onto a floppy, beam it over an acoustic coupler, or open it straight from `file://` thirty years from now—your files and programs are right where you left them!

---

## Chapter 1: Turning On Your TabComp™ 1.1

When you open `tabcomp.html` in your browser tab, the **ConsciousNode ROM BIOS v1.1** performs its Power-On Self-Test (POST):
1. **Hardware MMIO Map Verification:** Asserts that all 6 hardware regions (`FONT_ROM` at `0x0EF000–0x0EF2FF`, `VRAM` at `0x0F0000–0x0FF9FF`, `PALETTE` at `0x0FFA00–0x0FFCFF`, `TIMER_MS`, `VSYNC_CNT`, and `SOUND_REGS`) lie inside `0x000000–0x0FFFFF` with zero overlaps.
2. **Memory Count:** Verifies all **1,048,576 BYTES FREE** of 32-bit little-endian system RAM.
3. **Dual-Metric Speed Badge:** Measures both peak loop speed and live running workload speed on the CRT bezel badge (`CPU: 300 MIPS (peak) | run: 195.2 MIPS`).
4. **3-Stage TabTalk Bootstrap:** Verifies the self-hosting compiler chain (`Stage 0 -> Stage 1 -> Stage 2 -> Stage 3`) and launches `/bin/sh`, presenting the unmistakable prompt:
   ```
   TABCOMP C:\HOME>
   ```

---

## Chapter 2: Complete Shell Command Reference (`/bin/sh`)

Your 40×25 graphical text shell (`/src/sh.tt`) renders directly into the 320×200 framebuffer using the built-in 8×8 ROM font at `0x0EF000`, complete with a blinking green underline cursor and 100-line scrollback buffer (**PgUp** / **PgDn** scrolls through history). Every `help` line is strictly formatted to `<= 40` columns so nothing wraps.

| Command | Syntax | Description |
| :--- | :--- | :--- |
| **`help`** | `help` | Displays a clean 40-column summary of all built-in shell commands. |
| **`ver`** | `ver` | Prints the official ConsciousNode SoftWorks 1989 v1.1 banner. |
| **`ls`** | `ls [dir]` | Lists files (with byte sizes) and subdirectories (`<DIR>`) in `dir` or current directory. |
| **`cd`** | `cd <dir>` | Changes the current working directory (default `/home`). |
| **`pwd`** | `pwd` | Prints the current normalized working directory path. |
| **`cat`** | `cat <file>` | Prints the contents of `<file>` to the terminal screen. |
| **`cp`** | `cp <src> <dst>` | Copies file `<src>` to `<dst>`. |
| **`mv`** | `mv <src> <dst>` | Moves or renames `<src>` to `<dst>`. |
| **`rm`** | `rm <file>` | Deletes `<file>` or an empty directory from the disk. |
| **`mkdir`** | `mkdir <dir>` | Creates a new directory in the hierarchical filesystem. |
| **`edit`** | `edit <file>` | Launches the full-screen text editor (`/bin/edit`) on `<file>`. |
| **`cc`** | `cc <src.tt> -o <bin>` | Compiles a TabTalk source file using the self-hosted compiler (`/bin/cc`). |
| **`run`** | `run <bin> [args]` | Executes compiled binary `<bin>` (or simply type the binary's name directly!). |
| **`sprite`** | `sprite [file.spr]` | Launches **TabSprite™** 16×16 Sprite Sheet Editor (default `/home/game.spr`). |
| **`breakout`** | `breakout` | Launches **TabBreakout™** arcade game with custom sprites and 4-channel sound. |
| **`tracker`** | `tracker [file.trk]` | Launches **TabTracker™** 4-channel chiptune music studio (default `/home/theme.trk`). |
| **`tilemap`** | `tilemap [file.map]` | Launches **TabTile™** 40×25 level tile map editor (default `/home/level.map`). |
| **`rebootstrap`** | `rebootstrap` | Rebuilds `/src/cc.tt` through Stages 1, 2, and 3 (using Wasm JIT if `jit on`) and verifies fixed point. |
| **`selftest`** | `selftest` | Runs the 13-part hardware/font/tear-free/reproducibility/JIT/tamper self-test suite. |
| **`mips`** | `mips` | Benchmarks a real workload (`/bin/cc` compiling `/src/cc.tt`) under both Interpreter and Wasm JIT. |
| **`jit`** | `jit [on\|off]` | Enables or disables the shared-memory WebAssembly Basic-Block JIT compiler. |
| **`save`** | `save` | Downloads a complete, self-replicating `tabcomp-YYYYMMDD-HHMM.html` with your live disk. |
| **`export`** | `export <bin> <title>` | **Budding!** Exports standalone `<title>.html` game cartridge containing only the player + binary. |
| **`clear`** | `clear` | Clears the 40×25 screen and resets scrollback. |

---

## Chapter 3: Tutorials — Mastering Your TabComp™

### Lesson 1: Exploring the Disk
At the `TABCOMP C:\HOME>` prompt, type:
```
cat /README.TXT
ls /src
ls /bin
```
Every tool you use—`cc.tt`, `sh.tt`, `edit.tt`, `sprite.tt`, `breakout.tt`, `tracker.tt`, `tilemap.tt`—lives right there in `/src` as readable TabTalk source code, and every `/bin/*` binary on disk is 100% byte-identical to compiling its `/src/*.tt` source with `/bin/cc`!

### Lesson 2: Running & Modifying Your First Program
1. Compile the included Fibonacci demo in `/home/hello.tt`:
   ```
   cc /home/hello.tt -o /bin/hello
   hello
   ```
2. Open `/home/hello.tt` in the full-screen text editor:
   ```
   edit /home/hello.tt
   ```
3. Use the **Arrow keys**, **Home/End**, or **PgUp/PgDn** to navigate. Change `fib(10)` to `fib(15)`.
4. Press **Ctrl+S** to save (`SAVED OK!` appears on the bottom status bar) and **Ctrl+Q** to quit back to the shell.
5. Recompile and run:
   ```
   cc /home/hello.tt -o /bin/hello
   hello
   ```

### Lesson 3: Benchmarking the Shared-Memory WebAssembly JIT
1. At the shell prompt, type:
   ```
   jit on
   mips
   ```
2. Watch TabComp™ compile `/src/cc.tt` (44.37 million instructions!) in both Interpreter mode and WebAssembly JIT mode, reporting exact instruction counts, cold vs. warm JIT MIPS, and the percentage of instructions executed inside WebAssembly (`99.3%`)!

### Lesson 4: Editing the Compiler Itself & Proving Self-Hosting
1. Open `/src/cc.tt` in the TabTalk editor (`edit /src/cc.tt`), make a change, press **Ctrl+S**, and press **Ctrl+Q**.
2. Run `rebootstrap` (with `jit on` or `jit off`) to rebuild Stage 1 → Stage 2 → Stage 3 and verify the fixed point (`Stage 2 == Stage 3`)!

### Lesson 5: Painting Sprites & Budding a Tear-Free Game Cartridge
1. Edit sprites in `sprite /home/game.spr`, play `breakout`, and export a standalone cartridge:
   ```
   export /bin/breakout TabBreakout
   ```
   Your browser downloads `TabBreakout.html`—complete with the 1.1 tear-free `presentBuf` display engine and 4× unrolled word-aligned `cls`/`memset`!

---

## Chapter 4: Troubleshooting

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **No sound in Breakout or Tracker** | Browser Web Audio autoplay lock | Click anywhere on the TabComp™ screen or press any key; audio unlocks automatically on your first gesture. |
| **Program stuck in an infinite loop** | User `while(1)` loop without `getkey()` | Press **Ctrl+C** or **Escape** at any time to interrupt the program and unwind cleanly back to `TABCOMP C:\HOME>`. |
| **`CC ERROR line N` during `cc`** | Syntax error or unknown identifier in `.tt` file | Open the file with `edit <file.tt>`, jump to line `N` (shown as `L:N` in the status bar), fix the line, press **Ctrl+S**, and re-run `cc`. |
| **Scrolled up in shell (`view_offset > 0`)** | Pressed **PgUp** to inspect scrollback | Press **PgDn** or type any character to snap back to the active bottom prompt line. |
