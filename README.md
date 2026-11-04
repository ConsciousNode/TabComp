# TabComp™

**TabComp™: It's Not Just a Tab. It's a Computer.** 💾

**[▶ Boot TabComp](https://consciousnode.github.io/TabComp/)** (or download `index.html` and open it straight from disk, offline, forever). On a phone, the TabKey™ 101 keyboard appears under the screen, and exported games get the TabPad™ game pad.

A complete personal computer in **one HTML file**, under the ConsciousNode **Xinu** philosophy: single file, zero dependencies, offline-first, *constraint generates novelty*.

- **A 32-bit fantasy CPU:** 16 registers, 16 MiB of RAM, a 320×200 display with 256 colours, 4-channel sound and 8-bit PCM.
- **It runs DOOM.** Not a lookalike: the real DOOM engine ([doomgeneric](https://github.com/ozkl/doomgeneric)), compiled from its unmodified C source *by TabComp's own C compiler, on the TabComp CPU*, playing Freedoom. See [docs/DOOM.md](docs/DOOM.md).
- **A C toolchain written in TabTalk:** `c89`, `cpp`, `cc1`, `ld` and a libc, all source on the disk.
- **TabTalk,** its own systems language, with a **compiler written in TabTalk that compiles itself.** Stage 2 and stage 3 of the bootstrap are byte-identical, and the self-hosting is [independently verified](TESTING.md).
- **Everything you use is software running on the machine:** the shell, a full-screen editor, a sprite editor, a chiptune tracker, a tile mapper and *TabBreakout*, all as TabTalk source on the disk, which you can edit and recompile from inside TabComp.
- **It saves itself:** `save` downloads a new copy of the whole computer with your disk inside it. Saving an unchanged machine reproduces the file byte for byte, and every generation after that is identical.
- **It's fast and tear-free:** hot code is compiled to real WebAssembly on the fly (on at boot; about 1.7× faster on the compiler). Frames are shown only when a program says it has finished drawing, so nothing flickers, even on a phone.
- **It has a TURBO button:** turbo on runs flat out; turbo off (or `clock 25`, or any speed from 1 to 1000 MIPS) runs at a steady, exact clock on any device, like a 1989 PC.
- **A real shell:** ↑/↓ command history, `history`, `!!`, `!n` and Tab completion.
- **It buds:** `export <bin> <title>` writes a standalone game cartridge containing only the player and your program. Try [`cartridges/TabBreakout.html`](cartridges/TabBreakout.html).

## Quick start

```
TABCOMP C:\HOME> help
TABCOMP C:\HOME> cc /home/hello.tt -o /bin/hello
TABCOMP C:\HOME> hello
TABCOMP C:\HOME> edit /src/cc.tt        (yes, the compiler)
TABCOMP C:\HOME> rebootstrap
TABCOMP C:\HOME> mips              (honest benchmark: interpreter vs JIT)
TABCOMP C:\HOME> clock 25          (or press TURBO)
TABCOMP C:\HOME> breakout
TABCOMP C:\HOME> save
```

The full 1989-style manual is in [`docs/MANUAL.md`](docs/MANUAL.md). There's also the [ISA](docs/ISA.md), the [TabTalk language](docs/LANGUAGE.md), the [architecture](docs/ARCHITECTURE.md), and the [feature truth table](docs/FEATURES.md).

## Versions

| File | What |
|---|---|
| `index.html` | Current: **1.3.1** (identical to `versions/tabcomp-1.3.1.html`) |
| `versions/tabcomp-1.3.1.html` | 1.3 with 12 fixes found by building real DOOM on it (11 in the C toolchain, rebuilt by TabComp itself; 1 in key handling), and `/src/doom/doom.rsp` for a one-command DOOM build |
| `versions/tabcomp-1.3.html` | Argon's 1.3, "It Runs DOOM": 16 MiB, a C89 toolchain in TabTalk, 64-bit multiply/divide instructions, PCM audio, file import, `export --gpl` |
| `versions/tabcomp-1.2.2.html` | 1.2.1 with Breakout's sprite bricks back (B switches to plain bricks) and no half-drawn frames at slow clocks |
| `versions/tabcomp-1.2.1.html` | 1.2 with one fix (Enter no longer bypasses the clock), rebuilt by its own compiler |
| `versions/tabcomp-1.2.html` | Argon's 1.2: TURBO button and clock governor, command history and Tab completion, fixed-timestep Breakout, JIT on at boot, TabPad™ for cartridges |
| `versions/tabcomp-1.1.1.html` | 1.1 with **TabKey™ 101** carried over (the on-screen keyboard for phones and tablets) |
| `versions/tabcomp-1.1.html` | Argon's 1.1 patch: tear-free display, word-speed `memset`/`cls`, a real WebAssembly JIT, an honest `mips`, a 13-part self-test |
| `versions/tabcomp-1.0.2.html` | Adds TabKey™ 101 to 1.0.1 |
| `versions/tabcomp-1.0.1.html` | 1.0 with the font fix, rebuilt by its own compiler |
| `versions/tabcomp-1.0.html` | The original, as delivered |
| `cartridges/TabBreakout.html` | Budded from 1.3.1 |
| `cartridges/TabBreakout-1.3.html` | Budded from 1.3 by Argon |
| `cartridges/DOOMBench-1.3.html` | Argon's `doombench`, a DOOM-style renderer benchmark (not id's engine) |
| `cartridges/TabBreakout-1.2.2.html` | Budded from 1.2.2 (sprite bricks, TabPad™, TURBO, steady speed) |
| `cartridges/TabBreakout-1.1.html` | Budded from 1.1 |
| `cartridges/TabBreakout-1.0.1.html` | Budded from 1.0.1 |
| `cartridges/TabBreakout-1.0.html` | The original pre-exported cartridge |

## Credits

- **Concept and direction:** Khamerron Kizer, ConsciousNode SoftWorks
- **Written by:** Gemini 4 Argon: 1.0 in one shot from a tiered spec, then the 1.1, 1.2 and 1.3 patches
- **Review:** Jeep (ChatGPT)
- **Specs, testing, the 1.0.1, 1.2.1, 1.2.2 and 1.3.1 fixes, the DOOM build, and TabKey™ 101:** Kehai Interim (Claude). See [TESTING.md](TESTING.md)

MIT License.
