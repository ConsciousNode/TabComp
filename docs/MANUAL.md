# TabComp™ 1.2 User's Guide & Technical Manual (`docs/MANUAL.md`)

**CONGRATULATIONS ON YOUR UPGRADE TO TABCOMP™ 1.2!**  
*The Computer That Fits In Your Tab!*  
Published by **ConsciousNode SoftWorks**, Mountain View & Cyberia — Fall 1989 (Rev. 1.2 Turbo Clock, Command History & Touch Edition)  
**Catalog No.** CNSW-TC1200-BX • **Suggested Retail Price:** $49.95 (Free 3.5" Upgrade Disk for Registered 1.0/1.1 Owners!)

---

## What's New in 1.2! (ConsciousNode Engineering Bulletin)

> **ATTENTION REGISTERED TABCOMP™ PIONEERS!**  
> Your 1.2 ROM & System Disk upgrade delivers six major hardware and software enhancements straight from the ConsciousNode SoftWorks engineering lab:
> 1. **Front-Panel `TURBO` Button, LED & Selectable Clock Governor (`SYS 22` / `clock`):** Just like a real 1989 AT-class workstation, your TabComp™ now sports a hardware **TURBO** button with a glowing green LED on the top bezel! With Turbo ON (`CLOCK: MAX`), TabComp™ runs full out (~230–390+ MIPS with Wasm JIT). Press **TURBO** (or type `clock off` / `clock 25`) to drop to the rock-steady **25 MIPS compatibility clock** (`1..1000` MIPS selectable) with exact elapsed-time budgeting, Wasm overshoot carry-forward, and a 100 ms background-tab debt cap!
> 2. **32-Entry Shell Command History (`Up`/`Down`, `history`, `!!`, `!n`) & `Tab` Completion:** Press **↑** and **↓** (on your physical keyboard or on **TabKey™ 101**) to recall your last 32 commands, or arrow past the newest entry to restore the draft line you were typing! Type `history` to view numbered entries, `!!` to repeat the last command, `!n` to re-run entry `n`, and press **Tab** to auto-complete filenames and directories!
> 3. **16 ms Fixed-Timestep Arcade Physics in TabBreakout™:** **TabBreakout™** now steps `update_physics()` strictly once per **16 ms** of hardware millisecond timer elapsed time (up to 4 steps per drawn frame), so the ball travels at the exact same speed under `clock max` (60 FPS) and `clock 25` (~30 FPS)!
> 4. **Shared-Memory WebAssembly JIT ON by Default:** Your TabComp™ 1.2 boots with the register-allocated WebAssembly JIT **enabled out of the box** (`(JIT)` on the BIOS screen and clock badge), complete with 20-bit `startPc` tag verification on `blockTable` lookups.
> 5. **TabKey™ 101 & TabPad™ Touch Controllers:** Use **TabKey™ 101** (`⌨ Keys`) for full 1989-style typing on phones and tablets, and **TabPad™** (`🎮 Pad`)—built right into `/*@@PLAYER*/`—for D-pad (`← ↑ ↓ →` with auto-repeat) + `Space` / `Enter` / `Esc` / `R` / `Q` arcade controls in every exported cartridge!

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

## Chapter 1: Turning On Your TabComp™ 1.2

When you open `tabcomp.html` in your browser tab, the **ConsciousNode ROM BIOS v1.2** performs its Power-On Self-Test (POST):
1. **Hardware MMIO Map Verification:** Asserts that all 6 hardware regions (`FONT_ROM` at `0x0EF000–0x0EF2FF`, `VRAM` at `0x0F0000–0x0FF9FF`, `PALETTE` at `0x0FFA00–0x0FFCFF`, `TIMER_MS`, `VSYNC_CNT`, and `SOUND_REGS`) lie inside `0x000000–0x0FFFFF` with zero overlaps.
2. **Memory Count:** Verifies all **1,048,576 BYTES FREE** of 32-bit little-endian system RAM.
3. **WebAssembly JIT & TURBO Clock Initialization:** Enables the shared-memory WebAssembly JIT (`(JIT)`) when `WebAssembly` is supported and lights the front-panel **TURBO** LED (`CLOCK: MAX`).
4. **3-Stage TabTalk Bootstrap:** Verifies the self-hosting compiler chain (`Stage 0 -> Stage 1 -> Stage 2 -> Stage 3`) and launches `/bin/sh`, presenting the unmistakable prompt:
   ```
   TABCOMP C:\HOME>
   ```

---

## Chapter 2: Complete Shell Command Reference (`/bin/sh`)

Your 40×25 graphical text shell (`/src/sh.tt`) renders directly into the 320×200 framebuffer using the built-in 8×8 ROM font at `0x0EF000`, complete with a blinking green underline cursor, 100-line scrollback buffer (**PgUp** / **PgDn**), **32-entry command history** (**↑** / **↓**, `history`, `!!`, `!n`), and **Tab** filename/directory completion. Every `help` line is strictly formatted to `<= 40` columns so nothing wraps.

| Command | Syntax | Description |
| :--- | :--- | :--- |
| **`help`** | `help` | Displays a clean 40-column summary of all built-in shell commands. |
| **`ver`** | `ver` | Prints the official ConsciousNode SoftWorks 1989 v1.2 banner. |
| **`history`** | `history` / `!!` / `!n` | Lists the last 32 commands with numbers (`1..32`); `!!` repeats the last command; `!n` re-runs entry `n`. |
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
| **`breakout`** | `breakout` | Launches **TabBreakout™** arcade game with 16 ms fixed-timestep physics and 4-channel sound. Press **B** to switch between sprite bricks (painted in TabSprite™, the default) and plain fast bricks. |
| **`tracker`** | `tracker [file.trk]` | Launches **TabTracker™** 4-channel chiptune music studio (default `/home/theme.trk`). |
| **`tilemap`** | `tilemap [file.map]` | Launches **TabTile™** 40×25 level tile map editor (default `/home/level.map`). |
| **`rebootstrap`** | `rebootstrap` | Rebuilds `/src/cc.tt` through Stages 1, 2, and 3 and verifies fixed point (`Stage 1 == 2 == 3`). |
| **`selftest`** | `selftest` | Runs the 16-part hardware/font/tear-free/reproducibility/JIT/clock/history self-test suite. |
| **`mips`** | `mips` | Benchmarks the host CPU (`/bin/cc` compiling `/src/cc.tt`, ignoring the clock governor) under Interpreter and Wasm JIT. |
| **`jit`** | `jit [on\|off]` | Queries, enables, or disables the shared-memory WebAssembly Basic-Block JIT compiler. |
| **`clock`** | `clock [max\|on\|off\|1..1000]` | Queries or sets the CPU clock governor (`max`/`on` = Turbo ON; `off` = 25 MIPS; `1..1000` = fixed MIPS). |
| **`save`** | `save` | Downloads a complete, self-replicating `tabcomp-YYYYMMDD-HHMM.html` with your live disk. |
| **`export`** | `export <bin> <title>` | **Budding!** Exports standalone `<title>.html` game cartridge with current clock & **TabPad™**. |
| **`clear`** | `clear` | Clears the 40×25 screen and resets scrollback. |

---

## Chapter 3: Tutorials — Mastering Your TabComp™ 1.2

### Lesson 1: Command History & Tab Completion
At the `TABCOMP C:\HOME>` prompt:
1. Type `cat /READ` and press **Tab** — watch the shell automatically complete `/README.TXT`! Press **Enter** to read the welcome file.
2. Press **↑** (Up Arrow) to recall `cat /README.TXT`, or press **↓** (Down Arrow) to return to the draft line you were typing.
3. Type `history` to view your numbered command log, then type `!!` to repeat your last command or `!1` to re-run entry #1.

### Lesson 2: Using the TURBO Button & Selectable Clock (`clock`)
1. Look at the top control bar: the **TURBO** button's green LED is lit and the badge displays `CLOCK: MAX | ... MIPS (JIT)`.
2. Click **TURBO** (or type `clock off` or `clock 25` at the shell prompt). The LED turns dark and the badge switches to `CLOCK: 25 MIPS (turbo off)`.
3. Want a custom speed like a 10 MIPS early-80s machine or a 60 MIPS workstation? Type `clock 10` or `clock 60`. If you select a rate faster than your physical device can sustain for more than 1 second, the badge automatically reports `CLOCK: <N> MIPS (device: <actual>)`.
4. Type `clock max` (or click **TURBO** again) to re-engage full speed!

### Lesson 3: Playing & Budding a Cartridge with TabPad™ & Clock Memory
1. Play **TabBreakout™** by typing `breakout`. Because 1.2 uses 16 ms fixed-timestep physics, the ball moves at the exact same real-world speed under `clock max` and `clock 25`!
2. Export a standalone cartridge:
   ```
   export /bin/breakout TabBreakout
   ```
   Your browser downloads `TabBreakout.html`—complete with the clock setting active at export time, a cartridge **TURBO** button, and **TabPad™** touch controls (`◀ ▲ ▼ ▶`, `Space`, `Enter`, `Esc`, `R`, `Q`) that appear automatically on phones and tablets!

---

## Chapter 4: Troubleshooting

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **No sound in Breakout or Tracker** | Browser Web Audio autoplay lock | Click anywhere on the TabComp™ screen or press any key; audio unlocks automatically on your first gesture. |
| **Program stuck in an infinite loop** | User `while(1)` loop without `getkey()` | Press **Ctrl+C** or **Escape** at any time to interrupt the program and unwind cleanly back to `TABCOMP C:\HOME>`. |
| **Need on-screen touch controls on desktop** | Desktop mouse pointer (`pointer: fine`) hides touch pads by default | Click **⌨ Keys** in the header to toggle **TabKey™ 101**, or click **🎮 Pad** to toggle **TabPad™**. |
| **Badge shows `(device: XX)`** | Selected `clock <N>` exceeds host CPU speed for > 1 second | Lower the target clock (e.g. `clock 25`) or switch back to `clock max`. |
