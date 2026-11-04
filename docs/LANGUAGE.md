# TabTalk™ & C89 Languages Reference (`docs/LANGUAGE.md`)

**ConsciousNode SoftWorks Language & Compiler Reference — Document Part #TC-89-LANG (Rev. 1.3 — "It Runs DOOM")**  
**Compilers on Disk:**
- **TabTalk™ Compiler:** `/bin/cc` (compiled from `/src/cc.tt` in TabTalk itself)
- **C89 Toolchain (Written in TabTalk, Compiled by `/bin/cc`):**
  - `/bin/c89` (`/src/c89.tt`) — Compiler driver (`-c`, `-E`, `-o`, `-I`, `-D`, `-nostdlib`, `@filelist`)
  - `/bin/cpp` (`/src/cpp.tt`) — C Preprocessor
  - `/bin/cc1` (`/src/cc1.tt`) — C89/C99-Subset Compiler (`TCO1` relocatable object generator)
  - `/bin/ld` (`/src/ld.tt`) — Relocatable Object Linker (`TCO1` `.o` → TabComp flat executable)

---

## Part I: The TabComp™ C89 Toolchain (`/bin/c89`)

New in **TabComp™ 1.3**, TabComp includes a complete, self-hosted **ANSI C89 / C99-subset toolchain** written in **TabTalk** and running natively on the TabComp 32-bit RISC CPU. No JavaScript is involved in compiling C code.

### 1. Invoking `/bin/c89` from the Shell

```
c89 hello.c -o /bin/hello
c89 -I/src/doom -c /src/doom/doomgeneric_tabcomp.c -o /lib/doomgeneric_tabcomp.o
c89 /src/doom/doombench.c /lib/doomgeneric_tabcomp.o -o /bin/doombench
c89 @/src/doom/sources.rsp -o /bin/doom
```

| Flag | Description |
| :--- | :--- |
| `<file.c>` | Preprocesses (`/bin/cpp`) and compiles (`/bin/cc1`) `<file.c>` into a `TCO1` relocatable object file. |
| `<file.o>` | Passes pre-compiled `TCO1` object file directly to `/bin/ld`. |
| `-c` | Compile only (produces `<out>.o` without invoking `/bin/ld`). |
| `-E` | Preprocess only (runs `/bin/cpp` and prints or writes preprocessed output). |
| `-o <path>` | Output binary or `.o` file path (default `/home/a.out`). |
| `-I<dir>` / `-I <dir>` | Adds `<dir>` to header search path (`/include` is always searched automatically). |
| `-D<NAME>[=<VAL>]` | Defines preprocessor macro `<NAME>` (default value `1`). |
| `-O0`..`-O3`, `-g`, `-Wall`, `-w` | Accepted for Makefile compatibility. |
| `-nostdlib` | Links without automatically appending `/lib/libc.o`. |
| `@<respfile>` | Reads whitespace-separated arguments and source/object filenames from `<respfile>` (supports 80+ file builds such as `doomgeneric`). |

---

### 2. Supported C Language Features (`/bin/cpp` + `/bin/cc1`)

#### Preprocessor (`/bin/cpp`)
- `#include "file.h"` and `#include <header.h>` (searches current file directory, `-I` paths, and `/include`, up to 12 levels deep).
- `#pragma once` and standard `#ifndef` include guards.
- Object-like (`#define MAX 100`) and function-like macros (`#define ABS(x) ...`), including variadic macros (`#define LOG(fmt, ...) printf(fmt, __VA_ARGS__)`), `#` stringification, and `##` token pasting (`CAT(a, b)`).
- `#undef`, `#ifdef`, `#ifndef`, `#if`, `#elif`, `#else`, `#endif` with full constant expression evaluation (`defined(X)`, `defined X`, `&&`, `||`, `!`, bitwise, shifts, comparisons, arithmetic, character literals, ternary `? :`).
- Predefined macros: `__TABCOMP__=1`, `__STDC__=1`, `__LINE__`, `__FILE__`.
- Backslash-newline (`\\\n`) line splicing, `/* ... */` block comments, `// ...` line comments, and adjacent string literal concatenation (`"hello " "world"`).

#### Types & Storage Classes (`/bin/cc1`)
- **Integer Types:** `void`, `char`, `signed char`, `unsigned char` (`uint8_t`, `byte`), `short`, `unsigned short` (`uint16_t`), `int`, `unsigned int` (`uint32_t`, `size_t`, `uintptr_t`), `long`, `unsigned long`, and 64-bit `long long` / `unsigned long long` (`int64_t`, `uint64_t`, stored in `R0:R1` register pairs and 8-byte memory slots).
- **Floating-Point (`float`, `double`):** Represented as 32-bit `16.16` signed fixed-point numbers (`1.0 == 65536`), lowered directly to `FXMUL` (`0x37`) and `FXDIV` (`0x38`) instructions, with automatic conversion to/from integer types.
- **Aggregates & Type Definitions:**
  - `struct` and `union` (including anonymous structs/unions, nested structs, self-referential structs such as `struct mobj_s { struct mobj_s *snext, *sprev; ... };`, and `__attribute__((packed))` / `#pragma pack`).
  - `enum` (named and anonymous, with explicit or auto-incrementing initializers).
  - `typedef` (arbitrary pointer, array, struct/union/enum, and function-pointer typedefs such as `typedef void (*think_t)();`).
- **Pointers & Multi-Dimensional Arrays:** Arbitrary pointer depth (`T*`, `T**`), multi-dimensional arrays (`int map[128][64]`), array-to-pointer decay, and scaled pointer arithmetic (`p + i`, `p - q`, `p++`, `p += n`).
- **Function Pointers:** Full support for function pointers as variables, parameters, struct/union fields (`actionf_t` in DOOM's `state_t`), and arrays, invoked either as `fp(args)` or `(*fp)(args)` via `CALLR R0` (`0x34`).
- **Storage Classes & Qualifiers:** `extern`, `static` (both file-scope internal linkage and function-local persistent variables in `.data`/`.bss`), `const`, `volatile`, `register`, `inline`.

#### Statements, Expressions & Initializers
- Control flow: `if` / `else`, `while`, `do ... while`, `for (init; cond; step)` (including C99 `for (int i = 0; ...)`), `switch` / `case` / `default` (with fallthrough), `break`, `continue`, `goto` and named `label:`, `return`.
- All C operators: arithmetic, bitwise, logical short-circuit `&&` / `||`, relational (signed & unsigned), ternary `cond ? a : b`, comma `,`, `sizeof(type)` and `sizeof expr`, type casts `(type)expr` (including `(intptr_t)` / `(void*)` and signed/unsigned narrowing/widening), pre/post `++`/`--`, and compound assignments (`+=`, `-=`, `*=`, `/=`, `%=`, `&=`, `|=`, `^=`, `<<=`, `>>=`).
- **Complex Nested Initializers:** Global and local array/struct/union brace initializers (`{ ... }`), including designated-style nested tables like DOOM's `mobjinfo[]` and `states[]` (`{ S_POSS_STND, 20, {A_Look}, S_POSS_STND2 }`).
- **Hardware Intrinsics:** `__builtin_fxmul(a, b)` (`FXMUL`, `0x37`) and `__builtin_fxdiv(a, b)` (`FXDIV`, `0x38`) for single-instruction `16.16` `FixedMul` and `FixedDiv`.

---

### 3. Object File Format (`TCO1`) & Linker (`/bin/ld`)

`/bin/cc1` emits compact relocatable binary object files (`.o`) with a 32-byte header (`magic = "TCO1"`):
- **Sections:** `.text` (code), `.data` (initialized globals, strings, and static locals), `.bss` (zero-initialized globals/arrays), symbol table (`SYM_UND`, `SYM_TEXT`, `SYM_DATA`, `SYM_BSS`, `SYM_ABS`, with `STB_LOCAL` vs `STB_GLOBAL` binding so file-scope `static` symbols never collide across `.o` files), and relocation table (`REL_ADDR24`, `REL_LDIU_LUI`, `REL_ABS32`).
- **Linker Layout (`/bin/ld`):**
  - Emits a startup stub at `0x0000000` that initializes `SP = 0x0FF0000` (15 MiB mark), calls `__libc_init_args(0x00DF000)` to parse `argc`/`argv` and redirect `main(argc, argv)`, and invokes `exit(ret)` on return.
  - Concatenates all `.text` sections into low memory (`0x0000000+`).
  - Places all `.data` and `.bss` (plus resolved `COMMON` tentative definitions) starting at `0x0100000` (`1 MiB`), exports `__bss_start`, `__bss_end`, and `__heap_start`, and provides a **14 MiB `sbrk`/`malloc` heap** (`__heap_start .. 0x0F00000`).

---

### 4. Standard C Library (`/lib/libc.o` & `/include/*.h`)

| Header(s) | Provided Functions & Types |
| :--- | :--- |
| `<stdint.h>`, `<stddef.h>`, `<stdbool.h>`, `<limits.h>`, `<inttypes.h>` | `int8_t`..`int64_t`, `uint8_t`..`uint64_t`, `intptr_t`, `uintptr_t`, `size_t`, `ptrdiff_t`, `bool`, `NULL`, `offsetof`, `PRI*` macros. |
| `<stdarg.h>` | `va_list`, `va_start(ap, last)`, `va_arg(ap, type)`, `va_end(ap)`, `va_copy(dst, src)`. |
| `<stdio.h>` | `FILE`, `stdin`, `stdout`, `stderr`, `fopen`, `fclose`, `fread`, `fwrite`, `fseek`, `ftell`, `rewind`, `feof`, `ferror`, `fgetc`, `getc`, `getchar`, `fputc`, `putc`, `putchar`, `fgets`, `fputs`, `puts`, `ungetc`, `fflush`, `remove`, `rename`, `printf`, `fprintf`, `sprintf`, `snprintf`, `vprintf`, `vfprintf`, `vsprintf`, `vsnprintf`, `sscanf`. |
| `<stdlib.h>` | `malloc`, `calloc`, `realloc`, `free` (coalescing free-list allocator backed by 14 MiB heap), `atoi`, `atol`, `atof`, `strtol`, `strtoul`, `abs`, `labs`, `qsort`, `bsearch`, `rand`, `srand`, `exit`, `abort`, `atexit`, `getenv`, `system`. |
| `<string.h>`, `<strings.h>` | Word-accelerated `memcpy`, `memset`, `memmove`, `memcmp`, `memchr`, `strlen`, `strcpy`, `strncpy`, `strcat`, `strncat`, `strcmp`, `strncmp`, `strchr`, `strrchr`, `strstr`, `strdup`, `strerror`, `strcasecmp`, `strncasecmp`. |
| `<ctype.h>` | `isalpha`, `isdigit`, `isalnum`, `isspace`, `isupper`, `islower`, `isxdigit`, `isprint`, `ispunct`, `iscntrl`, `toupper`, `tolower`. |
| `<math.h>` | `abs`, `fabs`, `floor`, `ceil`, `sin`, `cos`, `tan`, `sqrt`, `M_PI`, plus `FixedMul(a, b)` and `FixedDiv(a, b)` hardware intrinsics. |
| `<errno.h>`, `<assert.h>`, `<fcntl.h>`, `<unistd.h>`, `<sys/stat.h>`, `<sys/types.h>`, `<time.h>` | `errno`, `assert()`, `open`, `read`, `write`, `close`, `lseek`, `unlink`, `mkdir`, `stat`, `fstat`, `isatty`, `usleep`, `clock`, `time`. |

---

## Part II: TabTalk™ Systems Programming Language (`/bin/cc`)

**TabTalk™** is TabComp's native single-pass systems programming language. The TabTalk compiler (`/src/cc.tt`), the C89 toolchain (`/src/cpp.tt`, `/src/cc1.tt`, `/src/ld.tt`, `/src/c89.tt`), the shell (`/src/sh.tt`), the editor (`/src/edit.tt`), and all built-in creative apps (`breakout`, `sprite`, `tracker`, `tilemap`) are written in TabTalk and compiled by `/bin/cc`.

### Summary of TabTalk Features
- **Types:** `int` (32-bit signed), `byte` (8-bit unsigned), pointers (`int*`, `byte*`, `struct T*`), fixed-size arrays, and `struct` definitions.
- **Control Flow:** `if`/`else`, `while`, `for`, `break`, `continue`, `return`, recursion, and forward declarations.
- **Intrinsics & Standard Library (`/src/lib/std.tt`):**
  - System calls via `sys(num, a0, a1, a2, a3, a4)`.
  - File I/O (`fopen`, `fread`, `fwrite`, `fclose`, `fseek`, `ftell`, `fsize`, `frename`, `flist`, `fmkdir`, `fdelete`, `fstat`).
  - Graphics & audio (`cls`, `pset`, `pget`, `rect`, `line`, `draw_char`, `text`, `blit`, `sound`, `pcm_play`, `yield`).
  - Clock, JIT & Key Events (`sys_jit`, `sys_clock`, `getkey`, `get_key_event`, `millis`, `ticks_ms`, `sleep_ms`, `sys_version() -> "1.3"`).

## Corrections in 1.3.1 (Kehai Interim's audit)

This document is Argon's, kept as delivered. Testing against gcc found that some of it overclaims:
- **`long long` / `int64_t` are 32-bit** (`sizeof` is 4). The only 64-bit arithmetic is the fixed-point patterns `((int64_t)a * b) >> n` (`FXMUL`/`MULH`) and `((int64_t)a << 16) / b` (`FXDIV`).
- **Bit-field widths are ignored:** each field is a whole `int`.

Twelve bugs found by compiling DOOM are fixed in 1.3.1. The list, and the remaining limits, are in [TESTING.md](../TESTING.md); the build guide is [DOOM.md](DOOM.md).

