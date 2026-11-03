# TabComp™ System Architecture (`docs/ARCHITECTURE.md`)

**ConsciousNode SoftWorks Engineering Architecture — Document Part #TC-89-ARCH**

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
|  |     | TabCompCPU (32-bit RISC, 16 GPRs, 1 MiB Uint8Array RAM)      |  |  |
|  |     |   0x000000..0x04FFFF : Program Code & Inline Strings         |  |  |
|  |     |   0x050000..0x0BFFFF : Global Variables & Static Arrays      |  |  |
|  |     |   0x0C0000..0x0DEFFF : Full-Descending Stack (SP=0x0DF000)   |  |  |
|  |     |   0x0F0000..0x0FF9FF : 320x200 256-Colour Framebuffer        |  |  |
|  |     |   0x0FFA00..0x0FFD3F : RGB Palette, Timer, 4-Ch Sound        |  |  |
|  |     |   0x0EF000..0x0EF2FF : 8x8 Font ROM (moved in 1.0.1)         |  |  |
|  |     +--------------------------------------------------------------+  |  |
|  |     | TabCompFS (Hierarchical Virtual Disk exposed via SYS 1..8)   |  |  |
|  |     | TabCompSound (4-Channel Web Audio API Synthesizer)           |  |  |
|  |     +--------------------------------------------------------------+  |  |
|  |                                                                       |  |
|  |  3. Stage 0 Boot ROM Compiler (compileTabTalk in JS)                  |  |
|  |  4. Hand-Encoded WebAssembly Basic-Block JIT (TabCompWasmJIT)         |  |
|  |  5. Self-Replicating Save & Cartridge Budding Engine                  |  |
|  |  6. Automated 8-Part Verification Hook (window.TABCOMP_SELFTEST)      |  |
|  +-----------------------------------------------------------------------+  |
+=============================================================================+
```

---

## 2. The 3-Stage Self-Hosting Bootstrap Chain

The heart of TabComp™ is that **Stage 0** (JavaScript) and **`/src/cc.tt`** (TabTalk) implement the **exact same single-pass recursive-descent algorithm, symbol table layout, register allocation, and instruction emission rules**.

```
  +-------------------+
  |   /src/cc.tt      |  (TabTalk source code + /src/lib/std.tt on disk)
  +---------+---------+
            |
            |  Compiled by Stage 0 (JS boot ROM compiler)
            v
  +-------------------+
  |  Stage 1 Binary   |  (61,932 bytes of TabComp 32-bit machine code)
  +---------+---------+
            |
            |  Loaded into TabCompCPU at 0x000000; compiles /src/cc.tt
            v
  +-------------------+
  |  Stage 2 Binary   |  (61,932 bytes — 43,062,903 CPU instructions executed)
  +---------+---------+
            |
            |  Loaded into TabCompCPU at 0x000000; compiles /src/cc.tt
            v
  +-------------------+
  |  Stage 3 Binary   |  (61,932 bytes — 43,062,903 CPU instructions executed)
  +---------+---------+
            |
            +===> FIXED-POINT VERIFIED: Stage 1 == Stage 2 == Stage 3 (100% Byte-Identical!)
```

### Why `Stage 1 == Stage 2 == Stage 3` Holds Byte-for-Byte
1. **Inline String Emission:** When a string literal `"..."` is parsed, both `stage0.js` and `cc.tt` emit `JMP over_str` followed immediately by the null-terminated bytes padded with zeros to a 4-byte boundary, patch `over_str`, and load the immediate address into `R0`. Because the binary loads at `0x000000`, string addresses are deterministic on the first pass with zero relocation drift.
2. **Deterministic Frame Prologue Patching:** Every function prologue emits a fixed `LDIU R2, frameSize; SUB SP, SP, R2` sequence and patches `frameSize` (`-4 - curLocalOffset`) at the end of the function body, ensuring identical instruction lengths regardless of how many local variables are declared inside nested loops or blocks.
3. **Deterministic Global Allocation:** Globals are allocated sequentially starting at `0x050000` with 4-byte alignment (`(sz + 3) & ~3`).

---

## 3. Process Nesting (`SYS 9 EXEC` & `SYS 0 EXIT`)

When the shell (`/bin/sh`) executes a child binary—such as `/bin/cc`, `/bin/edit`, `/bin/sprite`, `/bin/breakout`, `/bin/tracker`, or `/bin/tilemap`—via `SYS 9 (EXEC)`:
1. The CPU snapshots the parent process's user memory (`0x000000..0x0DFFFF`), register file (`R0..R15`), `PC`, and `FLAGS` onto `cpu.procStack`.
2. The child binary is loaded into `0x000000`, its command-line argument string is written to `0x0DF000`, `SP` and `FP` are initialized to `0x0DF000`, and `LR` (`R15`) is pointed to the `SYS 0` exit stub at `0x0DF800`.
3. When the child calls `exit(code)` or returns from `main()`, `SYS 0` pops the parent snapshot from `cpu.procStack`, places `code` into the parent's `R0`, and resumes the shell at the exact instruction following `SYS 9`.
4. Pressing **Ctrl+C** or **Escape** while any child process is running immediately unwinds `cpu.procStack` back to the root shell (`procStack[0]`) and silences all 4 audio channels.

---

## 4. Deterministic Self-Replicating `save` Mechanism

To guarantee the four required XINU replication properties (**Identity**, **Fidelity**, **Heredity**, and **Portability**):
1. **Pristine Startup Capture:** The very first statements executed inside `<script id="tc-core">` read `.textContent` from `#tc-style`, `#tc-disk`, and `#tc-core` into immutable constants (`PRISTINE_STYLE`, `PRISTINE_DISK`, `PRISTINE_CORE`) before any code mutates the DOM.
2. **Canonical Disk Serialization:** `serializeDiskB64(vfs)` sorts all directory paths and file keys lexicographically, Base64-encodes each file's `Uint8Array`, serializes the resulting `{ dirs, files }` object to canonical JSON, and Base64-encodes the UTF-8 JSON bytes.
3. **Template Reconstruction (Never `outerHTML`):** `buildHTMLFromPristine(diskB64Str)` concatenates the exact HTML skeleton with `PRISTINE_STYLE`, the new `diskB64Str`, and `PRISTINE_CORE`.
   - When the disk is unchanged, `serializeDiskB64(vfs) === PRISTINE_DISK`, so `generateSaveHTML()` produces a string **100% byte-for-byte identical** to the original `tabcomp.html` file on disk (`617,766` bytes).
   - When a child file is saved, opened in a browser, and saved again to create a grandchild, only the modified disk block changes while all surrounding HTML/CSS/JS bytes remain invariant across generations.

---

## 5. Cartridge Budding (`export <bin> <title>`)

```
  PRISTINE_CORE
  +---------------------------------------------------+
  | Pristine capture & HTML builder                   |
  | /*@@PLAYER_BEGIN*/                                |
  |   Base64 & Disk Serializer                        |  ===> Extracted verbatim
  |   8x8 Font + 256-Colour VGA Palette               |       into standalone
  |   TabCompSound (4-Ch Web Audio) + Canvas Renderer |       <title>.html
  |   TabCompFS + TabCompCPU                          |       cartridge!
  | /*@@PLAYER_END*/                                  |
  | Stage 0 Compiler, JIT, Self-Test, Shell Host      |  ===> Excluded from cartridge
  +---------------------------------------------------+
```

When the user runs `export /bin/breakout TabBreakout`, `generateCartridgeHTML()`:
1. Slices `PRISTINE_CORE` between `/*@@PLAYER_BEGIN*/` and `/*@@PLAYER_END*/`—one source of truth, zero duplicated code.
2. Packages only the target binary (`/bin/game`) plus any `.spr`, `.trk`, and `.map` data assets into `#tc-cart-disk`.
3. Emits a standalone ~98 KB HTML file with a 45-frame `"A TabComp™ Production"` title screen that boots straight into the game at 60 fps.
