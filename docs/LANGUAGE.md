# TabTalk™ Systems Programming Language (`docs/LANGUAGE.md`)

**ConsciousNode SoftWorks Language Reference — Document Part #TC-89-LANG**  
**Compiler Binary:** `/bin/cc` (compiled from `/src/cc.tt` in TabTalk itself)

---

## 1. Overview

**TabTalk™** is a compact, honest systems programming language designed specifically for self-hosting on the 32-bit TabComp™ RISC architecture. Syntactically a clean hybrid of C and Pascal, TabTalk compiles in a single pass directly to 32-bit TabComp machine code without an external assembler or linker.

Every application on TabComp™—the compiler (`/src/cc.tt`), the command shell (`/src/sh.tt`), the full-screen editor (`/src/edit.tt`), the sprite editor (`/src/sprite.tt`), the Breakout game (`/src/breakout.tt`), the 4-channel music tracker (`/src/tracker.tt`), and the tile mapper (`/src/tilemap.tt`)—is written in TabTalk and compiled by `/bin/cc`.

---

## 2. Types & Declarations

TabTalk supports four core data types:

1. **`int`**: 32-bit signed two's-complement integer (`4` bytes).
2. **`byte`**: 8-bit unsigned integer (`1` byte in arrays/memory, zero-extended to 32 bits when loaded into a register).
3. **Pointers (`int*`, `byte*`, `struct Foo*`)**: 32-bit byte addresses (`4` bytes). Pointer arithmetic automatically scales by the pointed-to element size (`1` byte for `byte*`, `4` bytes for `int*`, `sizeof(struct Foo)` for `struct Foo*`).
4. **Fixed-size arrays (`int arr[64]`, `byte buf[1024]`)**: Contiguous regions allocated in the global `BSS` segment (`0x050000+`) or on the local function stack frame. Array identifiers evaluate to the base address of element `0`.
5. **Structures (`struct Name { ... };`)**: Packed/4-byte-aligned composite records supporting `.` (direct) and `->` (pointer) member access.

### Compile-Time Constants
```c
const SCREEN_W = 320;
const SCREEN_H = 200;
const FB_ADDR  = 0x0F0000;
```

### Struct Definitions
```c
struct Point {
  int x;
  int y;
  byte color;
  byte tag[16];
};
```

### Global & Local Variables
```c
int global_counter;
byte work_buffer[4096];

int compute(int a, int b) {
  int sum = a + b;
  byte local_name[32];
  return sum * 2;
}
```

---

## 3. Statements & Control Flow

TabTalk supports full structured control flow:
- **Blocks:** `{ stmt1; stmt2; ... }`
- **Conditionals:**
  ```c
  if (x > 10 && y != 0) {
    pset(x, y, 14);
  } else if (x == 0) {
    pset(x, y, 11);
  } else {
    pset(x, y, 1);
  }
  ```
- **While Loops (`while`):**
  ```c
  int i = 0;
  while (i < 100) {
    if (i == 50) break;
    i++;
  }
  ```
- **For Loops (`for`)** with `break` and `continue`:
  ```c
  for (int r = 0; r < 25; r++) {
    if (r == 12) continue;
    draw_char(0, r * 8, '*', 15, 1);
  }
  ```
- **Functions, Forward Declarations & Recursion:**
  ```c
  int parseExpr(); // forward declaration for mutual recursion

  int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
  }
  ```

---

## 4. Operators & Precedence (Highest to Lowest)

| Precedence | Operators | Associativity | Description |
| :--- | :--- | :--- | :--- |
| **1 (Postfix)** | `a[i]`, `f(...)`, `s.m`, `p->m`, `x++`, `x--` | Left-to-right | Subscript, call, struct member, post-inc/dec |
| **2 (Unary)** | `-x`, `!x`, `~x`, `*p`, `&v`, `++x`, `--x` | Right-to-left | Negation, logical/bitwise NOT, deref, address-of, pre-inc/dec |
| **3 (Multiplicative)** | `*`, `/`, `%` | Left-to-right | Signed 32-bit multiply, divide, modulo |
| **4 (Additive)** | `+`, `-` | Left-to-right | Addition and subtraction (with automatic pointer scaling) |
| **5 (Shift)** | `<<`, `>>` | Left-to-right | Bitwise shift left and arithmetic shift right |
| **6 (Relational)** | `<`, `<=`, `>`, `>=` | Left-to-right | Signed 32-bit comparisons (evaluates to `1` or `0`) |
| **7 (Equality)** | `==`, `!=` | Left-to-right | Equality / inequality (evaluates to `1` or `0`) |
| **8 (Bitwise AND)** | `&` | Left-to-right | Bitwise AND |
| **9 (Bitwise XOR)** | `^` | Left-to-right | Bitwise XOR |
| **10 (Bitwise OR)** | `\|` | Left-to-right | Bitwise OR |
| **11 (Logical AND)** | `&&` | Left-to-right | Short-circuit logical AND |
| **12 (Logical OR)** | `\|\|` | Left-to-right | Short-circuit logical OR |
| **13 (Ternary)** | `cond ? a : b` | Right-to-left | Conditional expression |
| **14 (Assignment)** | `=`, `+=`, `-=` | Right-to-left | Simple and compound assignment |

---

## 5. Literals & Source Inclusion (`import`)

- **Integer Literals:** Decimal (`42`, `-100`) and hexadecimal (`0x0F0000`, `0xFF`).
- **Character Literals:** `'A'` (`65`), `'\n'` (`10`), `'\r'` (`13`), `'\t'` (`9`), `'\0'` (`0`), `'\\'` (`92`), `'\''` (`39`), `'\x1B'` (`27`).
- **String Literals:** `"Hello, TabComp!\n"` emits a 4-byte-aligned null-terminated byte sequence inline in the code segment (wrapped by an unconditional `JMP` over the string bytes) and evaluates to its `byte*` RAM address.
- **Module Imports (`import "file.tt";`):**
  ```c
  import "lib/std.tt";
  ```
  Expanded once per unique normalized file path before tokenization, allowing applications and `/src/cc.tt` to share `/src/lib/std.tt`.
- **Direct System Call Intrinsic (`sys`):**
  ```c
  int fd = sys(1, path, mode); // invokes SYS 1 with R0=path, R1=mode
  ```

---

## 6. Standard Library Reference (`/src/lib/std.tt`)

### String & Memory Functions
- `int strlen(byte* s)`: Returns length of null-terminated string `s`.
- `int strcmp(byte* a, byte* b)` / `int strncmp(byte* a, byte* b, int n)`: Lexicographical byte comparison.
- `byte* strcpy(byte* dst, byte* src)` / `byte* strcat(byte* dst, byte* src)`: Copy or concatenate null-terminated strings.
- `int memcpy(byte* dst, byte* src, int n)` / `int memset(byte* dst, int val, int n)`: Fast memory block copy and fill.
- `int atoi(byte* s)` / `int itoa(int val, byte* buf)`: ASCII-to-integer and integer-to-ASCII conversion.

### Console & Formatted Output
- `int puts(byte* s)` / `int putc(int c)` / `int print_int(int v)`
- `int printf2(byte* fmt, int a0, int a1)`: Supports `%d`, `%s`, `%c`.

### File I/O & Process Control
- `int fopen(byte* path, int mode)`: `mode = 0` (read), `mode = 1` (write/create/truncate).
- `int fread(int fd, byte* buf, int len)` / `int fwrite(int fd, byte* buf, int len)` / `int fclose(int fd)`
- `int flist(byte* dir, int idx, byte* name_out, int* is_dir, int* size_out)`
- `int fmkdir(byte* path)` / `int fdelete(byte* path)` / `int fstat(byte* path, int* size_out, int* is_dir)`
- `int chdir(byte* path)` / `int getcwd(byte* buf)` / `int getargs(byte* buf)`
- `int exec(byte* bin_path, byte* args)` / `int exit(int code)` / `int yield()`

### Graphics, Sound & Input (`320×200`, 256 Colours)
- `int cls(int col)`: Clears all 64,000 pixels of the framebuffer (`0x0F0000`) to palette index `col`.
- `int pset(int x, int y, int col)` / `int pget(int x, int y)`: Plot or read pixel at `(x, y)`.
- `int rect(int x, int y, int w, int h, int col)`: Clipped filled rectangle.
- `int line(int x0, int y0, int x1, int y1, int col)`: Bresenham line rasterizer.
- `int draw_char(int x, int y, int ch, int fg, int bg)`: Renders an 8×8 glyph from `FONT_ADDR` (`0x0EF000` since 1.0.1), with transparent background when `bg < 0`.
- `int text(int x, int y, byte* s, int fg, int bg)`: Renders a null-terminated string using the 8×8 font.
- `int blit(int x, int y, int w, int h, byte* data, int transparent)`: Blits a sprite buffer skipping `transparent` colour index.
- `int sound(int ch, int freq, int vol, int duty)`: Programs Web Audio synthesizer channel `0..3` at `0x0FFD20`.
- `int getkey()` / `int millis()`: Reads hardware key queue or millisecond timer.
