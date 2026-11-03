# TabComp™ 1.0 User's Guide & Technical Manual (`docs/MANUAL.md`)

**CONGRATULATIONS ON YOUR PURCHASE OF TABCOMP™ 1.0!**  
*The Computer That Fits In Your Tab!*  
Published by **ConsciousNode SoftWorks**, Mountain View & Cyberia — First Edition, Fall 1989 (Rev. 1991 Boxed Collector's Edition)  
**Catalog No.** CNSW-TC1000-BX • **Suggested Retail Price:** $49.95 (3.5" High-Density Microfloppy Included)

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

## Chapter 1: Turning On Your TabComp™

When you open `tabcomp.html` in your browser tab, the **ConsciousNode ROM BIOS v1.0** performs its Power-On Self-Test (POST):
1. **Memory Count:** Verifies all **1,048,576 BYTES FREE** of 32-bit little-endian system RAM.
2. **Speed Benchmark:** Measures your host's real-time instruction throughput in **MIPS** (*Millions of Instructions Per Second*) and displays it on the CRT bezel badge (`CPU: 250.0 MIPS!`).
3. **3-Stage TabTalk Bootstrap:** Verifies the self-hosting compiler chain (`Stage 0 -> Stage 1 -> Stage 2 -> Stage 3`) and launches `/bin/sh`, presenting the unmistakable prompt:
   ```
   TABCOMP C:\HOME>
   ```
   *(Yes, forward slashes work in paths, and the prompt displays `C:\HOME>` so both Unix beards and DOS power-users have something to write letters to the editor about!)*

---

## Chapter 2: Complete Shell Command Reference (`/bin/sh`)

Your 40×25 graphical text shell (`/src/sh.tt`) renders directly into the 320×200 framebuffer using the built-in 8×8 ROM font, complete with a blinking green underline cursor and 100-line scrollback buffer (**PgUp** / **PgDn** scrolls through history).

| Command | Syntax | Description |
| :--- | :--- | :--- |
| **`help`** | `help` | Displays a summary of all built-in shell commands and applications. |
| **`ver`** | `ver` | Prints the official ConsciousNode SoftWorks 1989 marketing banner. |
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
| **`rebootstrap`** | `rebootstrap` | Rebuilds `/src/cc.tt` through Stages 1, 2, and 3 and verifies `Stage 1 == Stage 2 == Stage 3`. |
| **`selftest`** | `selftest` | Runs the 8-part hardware/compiler/bootstrap/filesystem/save/export/MIPS self-test suite. |
| **`mips`** | `mips` | Benchmarks the CPU and prints current throughput in MIPS and execution mode. |
| **`jit`** | `jit [on\|off]` | Enables or disables the hand-encoded WebAssembly Basic-Block JIT compiler. |
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
You will see that every tool you use—`cc.tt`, `sh.tt`, `edit.tt`, `sprite.tt`, `breakout.tt`, `tracker.tt`, `tilemap.tt`—lives right there in `/src` as readable TabTalk source code!

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

### Lesson 3: Writing a Graphics & Sound Demo from Scratch
1. Type `edit /home/star.tt` and enter:
   ```c
   import "/src/lib/std.tt";

   int main() {
     cls(0);
     for (int i = 0; i < 160; i++) {
       line(160, 100, i * 2, 0, (i & 15));
       line(160, 100, i * 2, 199, ((i + 4) & 15));
     }
     text(68, 96, "WELCOME TO TABCOMP 1989!", 14, 1);
     sound(0, 440, 180, 128);
     while (getkey() == 0) {
       yield();
     }
     sound(0, 0, 0, 0);
     return 0;
   }
   ```
2. Press **Ctrl+S**, then **Ctrl+Q**.
3. Compile and run it:
   ```
   cc /home/star.tt -o /bin/star
   star
   ```
   Press any key (or **Ctrl+C** / **Esc**) to return to the shell.

### Lesson 4: Editing the Compiler Itself & Proving Self-Hosting
Want to prove that TabComp™ is truly self-sufficient?
1. Open the TabTalk compiler source code in the TabTalk editor:
   ```
   edit /src/cc.tt
   ```
2. Add a comment or tweak a banner message, press **Ctrl+S**, and press **Ctrl+Q**.
3. Recompile the compiler using `/bin/cc` and verify the 3-stage fixed point:
   ```
   cc /src/cc.tt -o /bin/cc
   rebootstrap
   ```
   TabComp™ compiles `/src/cc.tt` across all three stages and confirms `Stage 1 == Stage 2 == Stage 3`!

### Lesson 5: Painting Sprites & Budding a Standalone Game Cartridge
1. Launch **TabSprite™**:
   ```
   sprite /home/game.spr
   ```
   - **Arrow keys**: Move pixel cursor on the 16×16 canvas.
   - **`0`–`9`, `A`–`F`** or **`[` / `]`**: Select colour from the 16-colour sub-palette.
   - **`Space` / `Enter`**: Paint pixel; **`X`**: Erase pixel (transparent index `0`).
   - **`<` / `>`** (or `,` / `.`): Switch between the 64 sprites on the sprite sheet (`Sprite 0` = Ball, `Sprite 1` = Paddle, `Sprite 2` = Brick).
   - **`Ctrl+S`**: Save `.spr` sheet; **`Q` / `Ctrl+Q` / `Esc`**: Return to shell.
2. Test your custom artwork in **TabBreakout™**:
   ```
   breakout
   ```
   Use **Left/Right Arrows** (or **A/D**) to move the paddle, **R** to restart, and **Q** / **Esc** to quit.
3. **Bud off** your game as a standalone single-file HTML cartridge:
   ```
   export /bin/breakout TabBreakout
   ```
   Your browser downloads `TabBreakout.html` (~98 KB)—a self-contained game cartridge with the title screen *"A TabComp™ Production"* that boots straight into your game!

---

## Chapter 4: Creative Studio Suite (Tier 3 Bonus Apps)

- **TabTracker™ (`tracker /home/theme.trk`)**:
  - **Up/Down Arrows**: Navigate 32 pattern rows; **Left/Right Arrows**: Select Channel 0 (`SQR`), Channel 1 (`TRI`), Channel 2 (`SAW`), or Channel 3 (`NOI`).
  - **`A`–`Z`**: Enter musical notes (`C-3` to `B-4`); **`X`**: Clear note (`---`).
  - **`Space`**: Toggle real-time 4-channel playback; **`Ctrl+S`**: Save `.trk` file; **`Q`**: Quit.
- **TabTile™ (`tilemap /home/level.map`)**:
  - **Arrow keys**: Move across the 40×25 tile grid; **`[` / `]`**: Select tile brush (`0..15`).
  - **`Space`**: Place tile; **`X`**: Clear tile; **`Ctrl+S`**: Save 1,000-byte `.map` file; **`Q`**: Quit.
- **Hand-Encoded WebAssembly Basic-Block JIT (`jit on` / `jit off`)**:
  - Translates hot TabComp™ basic blocks directly into raw WebAssembly binary modules (`0x00 0x61 0x73 0x6D`) in memory without external libraries. Run `mips` before and after `jit on` to see the speedup!

---

## Chapter 5: Glossary of XINU Terms

- **Budding (`export`)**: Extracting the minimal CPU/device player (`/*@@PLAYER_BEGIN*/../*@@PLAYER_END*/`) and a compiled binary into a standalone `.html` game cartridge.
- **Fixed Point**: The state achieved when the Stage 2 compiler binary (compiled by Stage 1 on the TabComp CPU) and the Stage 3 compiler binary (compiled by Stage 2 on the TabComp CPU) are byte-for-byte identical.
- **Pristine DOM Capture**: Capturing the exact text of `#tc-style`, `#tc-disk`, and `#tc-core` at power-on before any DOM mutation so `save` is 100% deterministic and hereditary.
- **XINU**: ConsciousNode SoftWorks' guiding engineering philosophy—single file, zero dependencies, offline-first, where constraint generates novelty.

---

## Chapter 6: Troubleshooting

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **No sound in Breakout or Tracker** | Browser Web Audio autoplay lock | Click anywhere on the TabComp™ screen or press any key; audio unlocks automatically on your first gesture. |
| **Program stuck in an infinite loop** | User `while(1)` loop without `getkey()` | Press **Ctrl+C** or **Escape** at any time to interrupt the program and unwind cleanly back to `TABCOMP C:\HOME>`. |
| **`CC ERROR line N` during `cc`** | Syntax error or unknown identifier in `.tt` file | Open the file with `edit <file.tt>`, jump to line `N` (shown as `L:N` in the status bar), fix the line, press **Ctrl+S**, and re-run `cc`. |
| **Scrolled up in shell (`view_offset > 0`)** | Pressed **PgUp** to inspect scrollback | Press **PgDn** or type any character to snap back to the active bottom prompt line. |
