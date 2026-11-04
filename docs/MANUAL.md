# TabComp™ 1.3 User's Guide & Technical Manual (`docs/MANUAL.md`)

**CONGRATULATIONS ON YOUR UPGRADE TO TABCOMP™ 1.3 — THE "IT RUNS DOOM" EDITION!**  
*The Computer That Fits In Your Tab!*  
Published by **ConsciousNode SoftWorks**, Mountain View & Cyberia — Winter 1989/1993 Special Edition (Rev. 1.3 — 16 Megabytes, Self-Hosted ANSI C89 & DOOM Edition)  
**Catalog No.** CNSW-TC1300-DX • **Suggested Retail Price:** $69.95 (Includes 16 MiB Extended RAM Daughterboard & ConsciousNode C89 Professional Development System!)

---

## What's New in 1.3! (ConsciousNode Engineering Bulletin)

> **STOP THE PRESSES! 16 MEGABYTES OF RAM AND A SELF-HOSTED C89 COMPILER IN ONE HTML FILE!**  
> Your TabComp™ 1.3 upgrade turns your humble single-tab personal computer into a 32-bit C workstation capable of compiling and running **DOOM**:
> 1. **16,777,216 BYTES (16 MiB) OF RAM (`0x0000000`–`0x0FFFFFF`):** We expanded the TC-32 address bus from 20 bits to 24 bits! The low 1 MiB (`0x000000`–`0x0FFFFF`) is 100% unchanged so every existing 1.2.2 TabTalk program runs without a hitch, while high memory (`0x0100000`–`0x0FFFFFF`, 15 MiB) gives C programs a 14 MiB heap—plenty of room for DOOM's 6 MiB zone allocator!
> 2. **Hardware 64-Bit Fixed-Point & Multiply Instructions (`FXMUL`, `FXDIV`, `MULH`, `MULHU`):** Four new opcodes (`0x37`–`0x3A`) execute 16.16 fixed-point multiply/divide (`FixedMul` / `FixedDiv`) and 64-bit high-word multiplies directly in native WebAssembly `i64` hardware!
> 3. **Self-Hosted ANSI C89 Toolchain (`/bin/c89`, `/bin/cpp`, `/bin/cc1`, `/bin/ld`):** Written 100% in **TabTalk** and compiled on TabComp by `/bin/cc`, your system now includes a full C preprocessor, C89 compiler emitting relocatable `TCO1` `.o` object files, multi-file object linker, 20 standard C headers (`/include/*.h`), and a compiled C standard library (`/lib/libc.o`)!
> 4. **Host File Import (`📂 Import` & Drag-and-Drop):** Click **📂 Import** in the top bezel (or drag and drop any `.WAD`, `.c`, `.h`, or data file from your computer right onto the TabComp™ monitor) to copy it straight into `/home/<filename>`!
> 5. **DOOM Platform Layer (`/src/doom/`) & `doombench` Textured 3D Engine (`/bin/doombench`):** Includes `doomgeneric_tabcomp.c` (`DG_Init`, `DG_DrawFrame`, `DG_SleepMs`, `DG_GetTicksMs`, `DG_GetKey`) and `/bin/doombench`, which boots automatically when `/home/doom1.wad` is not yet loaded—or loads and parses your real `DOOM1.WAD` header, `PLAYPAL`, and `COLORMAP` lumps on the spot!
> 6. **License-Aware Cartridge Budding (`export --gpl`):** TabComp™ itself remains MIT-licensed, while `export /bin/doombench DOOM --gpl` automatically embeds a GNU GPL v2.0 header and source notice into exported DOOM cartridges (`DOOM.html`).

---

## Chapter 1: Turning On Your TabComp™ 1.3

When you open `index.html` (or `tabcomp.html`), the **ConsciousNode ROM BIOS v1.3** performs its Power-On Self-Test:
1. **Hardware MMIO Map Verification:** Confirms all 6 hardware regions (`FONT_ROM` at `0x0EF000`, `VRAM` at `0x0F0000`, `PALETTE` at `0x0FFA00`, `TIMER_MS`, `VSYNC_CNT`, `SOUND_REGS`) lie inside `0x000000–0x0FFFFF` with zero overlaps.
2. **Memory Count:** Verifies all **16,777,216 BYTES FREE (16 MiB)** of 32-bit little-endian system RAM.
3. **WebAssembly JIT & TURBO Clock Initialization:** Enables the shared-memory WebAssembly JIT (`(JIT)`) and lights the front-panel **TURBO** LED (`CLOCK: MAX`).
4. **Shell Launch:** Boots `/bin/sh` at `TABCOMP C:\HOME>`.

---

## Chapter 2: Complete Shell Command Reference (`/bin/sh`)

| Command | Syntax | Description |
| :--- | :--- | :--- |
| **`help`** | `help` | Displays a clean 40-column summary of all built-in shell commands. |
| **`ver`** | `ver` | Prints the official ConsciousNode SoftWorks v1.3 banner (`16,777,216 BYTES FREE`). |
| **`history`** | `history` / `!!` / `!n` | Lists the last 32 commands (`1..32`); `!!` repeats the last command; `!n` re-runs entry `n`. |
| **`ls`** | `ls [dir]` | Lists files (with byte sizes) and subdirectories (`<DIR>`) in `dir` or current directory. |
| **`cd` / `pwd`** | `cd <dir>` / `pwd` | Changes or prints the current working directory. |
| **`cat`** | `cat <file>` | Prints the contents of `<file>` to the terminal screen. |
| **`cp` / `mv` / `rm`** | `cp`/`mv`/`rm` | Copies, renames/moves, or deletes files on the disk. |
| **`mkdir`** | `mkdir <dir>` | Creates a new directory in the hierarchical filesystem. |
| **`edit`** | `edit <file>` | Launches the full-screen text editor (`/bin/edit`) on `<file>`. |
| **`cc`** | `cc <src.tt> -o <bin>` | Compiles a TabTalk source file using the self-hosted TabTalk compiler (`/bin/cc`). |
| **`c89`** | `c89 [flags] <files.c/.o> -o <bin>` | **New in 1.3!** Compiles and links ANSI C89 source/object files using `/bin/cpp`, `/bin/cc1`, and `/bin/ld`. |
| **`doombench`** | `doombench [--bench]` | **New in 1.3!** Runs the C-compiled DOOM `R_DrawColumn`/`R_DrawSpan` 3D engine & WAD inspector (or 30-frame benchmark with `--bench`). |
| **`run`** | `run <bin> [args]` | Executes compiled binary `<bin>` (or type the binary's name directly). |
| **`sprite`** | `sprite [file.spr]` | Launches **TabSprite™** 16×16 Sprite Sheet Editor (default `/home/game.spr`). |
| **`breakout`** | `breakout` | Launches **TabBreakout™** arcade game with sprite bricks and 16 ms fixed-timestep physics. |
| **`tracker`** | `tracker [file.trk]` | Launches **TabTracker™** 4-channel chiptune music studio (default `/home/theme.trk`). |
| **`tilemap`** | `tilemap [file.map]` | Launches **TabTile™** 40×25 level tile map editor (default `/home/level.map`). |
| **`rebootstrap`** | `rebootstrap` | Rebuilds `/src/cc.tt` through Stages 1, 2, and 3 and verifies fixed point (`Stage 1 == 2 == 3`). |
| **`selftest`** | `selftest` | Runs the 19-part hardware, bootstrap, JIT, clock, C89, and DOOM renderer self-test suite. |
| **`mips`** | `mips` | Benchmarks the host CPU (`/bin/cc` compiling `/src/cc.tt`) under Interpreter and Wasm JIT. |
| **`jit`** | `jit [on\|off]` | Queries, enables, or disables the shared-memory WebAssembly JIT compiler. |
| **`clock`** | `clock [max\|on\|off\|1..1000]` | Queries or sets the CPU clock governor (`max`/`on` = Turbo ON; `off` = 25 MIPS; `1..1000` = fixed MIPS). |
| **`save`** | `save` | Downloads a complete, self-replicating `tabcomp-YYYYMMDD-HHMM.html` with your live disk. |
| **`export`** | `export <bin> <title> [--gpl]` | **Budding!** Exports standalone `<title>.html` cartridge (add `--gpl` for GPL-2.0 header notice). |
| **`clear`** | `clear` | Clears the 40×25 screen and resets scrollback. |

---

## Chapter 3: Tutorials — C89 Programming, DOOM & WAD Import

### Lesson 1: Compiling & Running a C89 Program on TabComp™
1. Create a C program or compile one of the built-in test suites:
   ```
   c89 /test/c/test_fnptr.c -o /bin/test_fnptr
   test_fnptr
   ```
2. For multi-file C projects, compile each `.c` file to a relocatable `.o` object file with `-c`, then link them together:
   ```
   c89 -I/src/doom -c /src/doom/doomgeneric_tabcomp.c -o /lib/doomgeneric_tabcomp.o
   c89 -I/src/doom -c /src/doom/doombench.c -o /home/doombench.o
   c89 /home/doombench.o /lib/doomgeneric_tabcomp.o -o /bin/doombench
   ```

### Lesson 2: Running `doombench` & Importing a Shareware `DOOM1.WAD`
1. Run `doombench --bench` at the shell prompt to benchmark 30 frames of textured & light-diminished `R_DrawColumn` wall columns and `R_DrawSpan` floor/ceiling spans (~200–380 FPS at TURBO, ~13 FPS at `clock 25`).
2. Run `doombench` interactively:
   - Use **← ↑ ↓ →** (or `W A S D`) to move and turn through the 3D textured corridor, **Ctrl** / **Fire** to trigger the weapon flash and 8-bit PCM sound effect, and **Q** or **Esc** to quit.
3. Have a copy of shareware `DOOM1.WAD` on your computer? Click **📂 Import** in the top bezel (or drag and drop `DOOM1.WAD` onto the TabComp™ screen). It is saved directly to `/home/doom1.wad`. Run `doombench` again and watch it automatically detect `/home/doom1.wad`, load the 256-colour `PLAYPAL` and 34 `COLORMAP` light tables, and render with authentic WAD palettes!

### Lesson 3: Building Full `doomgeneric` & Exporting `DOOM.html`
1. Import the `doomgeneric` C source files into `/src/doom/` (via **📂 Import** or drag-and-drop), list them in `/src/doom/sources.rsp` alongside `/src/doom/doomgeneric_tabcomp.c`, and compile on TabComp:
   ```
   c89 -I/src/doom @/src/doom/sources.rsp -o /bin/doom
   ```
2. Export a standalone GPL-2.0 cartridge:
   ```
   export /bin/doombench DOOM --gpl
   ```
   Your browser downloads `DOOM.html` complete with the GPL-2.0 header notice, embedded WAD/palette support, **TURBO** toggle, and **TabPad™** touch controls (including the **Fire** button)!
