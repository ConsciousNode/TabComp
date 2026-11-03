# TabComp™

**TabComp™: It's Not Just a Tab. It's a Computer.** 💾

**[▶ Boot TabComp](https://consciousnode.github.io/TabComp/)** (or download `index.html` and open it straight from disk, offline, forever). On a phone, the TabKey™ 101 keyboard appears under the screen.

A complete personal computer in **one HTML file**, under the ConsciousNode **Xinu** philosophy: single file, zero dependencies, offline-first, *constraint generates novelty*.

- **A 32-bit fantasy CPU:** 16 registers, 1 MiB of RAM, a 320×200 display with 256 colours, and 4-channel sound.
- **TabTalk,** its own systems language, with a **compiler written in TabTalk that compiles itself.** Stage 2 and stage 3 of the bootstrap are byte-identical, and the self-hosting is [independently verified](TESTING.md).
- **Everything you use is software running on the machine:** the shell, a full-screen editor, a sprite editor, a chiptune tracker, a tile mapper and *TabBreakout*, all as TabTalk source on the disk, which you can edit and recompile from inside TabComp.
- **It saves itself:** `save` downloads a new copy of the whole computer with your disk inside it. Saving an unchanged machine reproduces the file byte for byte, and every generation after that is identical.
- **It buds:** `export <bin> <title>` writes a standalone game cartridge containing only the player and your program. Try [`cartridges/TabBreakout.html`](cartridges/TabBreakout.html).

## Quick start

```
TABCOMP C:\HOME> help
TABCOMP C:\HOME> cc /home/hello.tt -o /bin/hello
TABCOMP C:\HOME> hello
TABCOMP C:\HOME> edit /src/cc.tt        (yes, the compiler)
TABCOMP C:\HOME> rebootstrap
TABCOMP C:\HOME> save
```

The full 1989-style manual is in [`docs/MANUAL.md`](docs/MANUAL.md). There's also the [ISA](docs/ISA.md), the [TabTalk language](docs/LANGUAGE.md), the [architecture](docs/ARCHITECTURE.md), and the [feature truth table](docs/FEATURES.md).

## Versions

| File | What |
|---|---|
| `index.html` | Current: **1.0.2** (identical to `versions/tabcomp-1.0.2.html`) |
| `versions/tabcomp-1.0.2.html` | Adds **TabKey™ 101**, an on-screen keyboard for phones and tablets (shown automatically on touch screens; toggle with ⌨ Keys) |
| `versions/tabcomp-1.0.1.html` | 1.0 with the font fix, rebuilt by its own compiler |
| `versions/tabcomp-1.0.html` | The original, as delivered |
| `cartridges/TabBreakout.html` | Budded from 1.0.1 |
| `cartridges/TabBreakout-1.0.html` | The original pre-exported cartridge |

## Credits

- **Concept and direction:** Khamerron Kizer, ConsciousNode SoftWorks
- **Written by:** Gemini 4 Argon, in one shot from a tiered spec
- **Spec, testing, the 1.0.1 fix and TabKey™ 101:** Kehai Interim (Claude). See [TESTING.md](TESTING.md)

MIT License.
