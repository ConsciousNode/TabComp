# TabComp™ 32-Bit RISC Instruction Set Architecture (`docs/ISA.md`)

**ConsciousNode SoftWorks Engineering Reference — Document Part #TC-89-ISA (Rev. 1.3 — "It Runs DOOM")**  
**Architecture Philosophy:** XINU (*Single File, Zero Dependencies, Offline-First*)

---

## 1. Architectural Overview

The **TabComp™ TC-32** is a 32-bit load/store fantasy RISC microprocessor with a fixed 32-bit instruction encoding, 16 general-purpose 32-bit registers, a **24-bit physical address space (`16,777,216` bytes / 16 MiB of little-endian RAM)**, hardware 64-bit fixed-point (`16.16`) and high-word multiply instructions (`FXMUL`, `FXDIV`, `MULH`, `MULHU`), memory-mapped display/sound/timer peripherals, 8-bit PCM digital audio output, a tear-free 64,000-byte `YIELD` present buffer, and a shared-memory WebAssembly basic-block/superblock JIT.

| Parameter | Specification |
| :--- | :--- |
| **Word Size** | 32-bit signed/unsigned integers (two's complement, little-endian), with 64-bit internal intermediate fixed-point/multiply ops |
| **Instruction Width** | Fixed 32-bit (4 bytes, 4-byte aligned in RAM) |
| **Total RAM** | **16,777,216 bytes (`0x0000000` – `0x0FFFFFF`, 16 MiB**, backed by 257-page shared `WebAssembly.Memory`) |
| **General Purpose Registers** | 16 × 32-bit (`R0` – `R15`, mapped at `0x1000000` – `0x100003F` in shared Wasm memory) |
| **Special Registers** | `PC` (32-bit Program Counter at `0x1000040`), `FLAGS` (4-bit condition code register at `0x1000044`) |
| **Measured Throughput** | ~300–316 MIPS (Peak Loop) / ~233 MIPS (Interpreter real workload) / ~389+ MIPS (Shared-Memory WebAssembly JIT) |

---

## 2. Register File & Calling Convention

All 16 general-purpose registers are 32 bits wide (`Int32Array(wasmMem.buffer, 0x1000000, 16)`):

| Register | Alias | Role in TabTalk & C89 ABI | Preserved Across Calls |
| :--- | :--- | :--- | :--- |
| `R0` | `ACC` | Primary expression accumulator, function return value (low 32 bits), `SYS` arg 0 / return value | No |
| `R1` | `TMP1` | Secondary expression operand, lvalue store address, `long long` upper 32-bit return value, `SYS` arg 1 | No |
| `R2` | `TMP2` | Scratch register for pointer scaling / large immediate synthesis / `long long` RHS upper 32 bits, `SYS` arg 2 | No |
| `R3` | `A3` | `SYS` arg 3 / general scratch | No |
| `R4` | `A4` | `SYS` arg 4 / general scratch | No |
| `R5` – `R12` | `T0`–`T7` | General-purpose registers available for user assembly or JIT temporaries | Yes (if used) |
| `R13` | `FP` | Frame Pointer (points to caller's saved `FP` on stack) | Yes |
| `R14` | `SP` | Stack Pointer (full-descending, 4-byte aligned; `0x0DF000` for TabTalk, `0x0FF0000` for linked C programs) | Yes |
| `R15` | `LR` | Link Register (stores return `PC` on `CALL` / `CALLR`) | Saved in prologue |

### Condition Flags (`FLAGS`)
Updated by `CMP` (`0x1A`) and `CMPI` (`0x1B`):
- **Bit 0 (`Z` — Zero / Equal):** `1` if `a == b`, else `0`.
- **Bit 1 (`N` — Signed Less Than):** `1` if `(a | 0) < (b | 0)`, else `0`.
- **Bit 2 (`C` — Unsigned Less Than / Borrow):** `1` if `(a >>> 0) < (b >>> 0)`, else `0`.

---

## 3. 16 MiB Memory Map (`0x0000000` – `0x0FFFFFF`)

All user memory accesses are little-endian and masked to the **16 MiB physical address space (`addr & 0xFFFFFF`)**. The low 1 MiB (`0x0000000` – `0x00FFFFF`) is 100% identical to TabComp™ 1.2.2 so every existing TabTalk binary runs unmodified. High memory (`0x0100000` – `0x0FFFFFF`, 15 MiB) provides room for large C programs, initialized `.data`, `.bss`, a 14 MiB `malloc` / DOOM zone allocator heap, and the C stack.

At boot, `initHardwareMemory(cpu)` runs `verifyHardwareRegions()` to assert that every hardware region (`FONT_ROM`, `VRAM`, `PALETTE`, `TIMER_MS`, `VSYNC_CNT`, `SOUND_REGS`) lies strictly inside the low 1 MiB (`0x000000`–`0x0FFFFF`) and that no two regions overlap:

| Address Range | Size | Region | Description |
| :--- | :--- | :--- | :--- |
| `0x0000000` – `0x004FFFF` | 320 KB | `TEXT / RODATA` | Program machine code and inline 4-byte-aligned string literals. Entry point is `0x0000000`. |
| `0x0050000` – `0x00BFFFF` | 448 KB | `TT_DATA / BSS` | TabTalk global variables and static arrays (`src`, `code`, symbol tables, app buffers). |
| `0x00C0000` – `0x00DEFFF` | 124 KB | `TT_STACK` | Full-descending TabTalk user execution stack (`SP` starts at `0x00DF000` and grows downward). |
| `0x00DF000` – `0x00DF7FF` | 2 KB | `ARGS` | Null-terminated command-line argument string passed to the current process. |
| `0x00DF800` – `0x00DF803` | 4 B | `EXIT_STUB` | Contains `0x2F000000` (`SYS 0`), pointed to by initial `LR` so returning from `main()` exits cleanly. |
| `0x00EF000` – `0x00EF2FF` | 768 B | `FONT_ROM` | Built-in 8×8 monochrome bitmap font for ASCII characters `32..127` (96 glyphs × 8 bytes). |
| `0x00F0000` – `0x00FF9FF` | 64,000 B | `VRAM` | 320×200 8-bit indexed colour working framebuffer (`y * 320 + x`, copied to `presentBuf` on `SYS 10 YIELD`). |
| `0x00FFA00` – `0x00FFCFF` | 768 B | `PALETTE` | 256 × 3-byte RGB palette entries (`R, G, B`, each `0..255`). |
| `0x00FFD00` – `0x00FFD03` | 4 B | `TIMER_MS` | 32-bit milliseconds elapsed since boot (updated every frame). |
| `0x00FFD04` – `0x00FFD07` | 4 B | `VSYNC_CNT` | 32-bit vertical blanking frame counter (incremented every `requestAnimationFrame`). |
| `0x00FFD20` – `0x00FFD3F` | 32 B | `SOUND_REGS` | 4 × 8-byte Web Audio synthesizer channel descriptors (`Ch0`: Square, `Ch1`: Triangle, `Ch2`: Saw, `Ch3`: Noise). |
| `0x0100000` – `0x0EFFFFF` | 14 MiB | `C_DATA / BSS / HEAP` | Linked C `.data` + `.bss` (`0x0100000..__heap_start`) followed by the `sbrk`/`malloc` heap up to `0x0F00000` (easily holds DOOM's 6 MiB zone allocator + WAD caches). |
| `0x0F00000` – `0x0FF0000` | ~1 MiB | `C_STACK` | Full-descending C program stack (`SP` initialized to `0x0FF0000` by `/bin/ld` startup stub). |

### Shared WebAssembly JIT State Region (`0x1000000` – `0x100004F`)
Outside the 16 MiB guest address space (`addr & 0xFFFFFF`), the 257-page `WebAssembly.Memory` (`16,842,752` bytes) maps CPU architectural state at `0x1000000` (`CPU_STATE_BASE`) so compiled Wasm blocks and the JS interpreter share registers and RAM with zero copying:
- `0x1000000` – `0x100003F` (`64 B`): `R0` – `R15` (`Int32Array(wasmMem.buffer, 0x1000000, 16)`)
- `0x1000040` – `0x1000043` (`4 B`): `PC` (block entry/exit Program Counter)
- `0x1000044` – `0x1000047` (`4 B`): `FLAGS` (`Z=1, N=2, C=4`)
- `0x1000048` – `0x100004B` (`4 B`): `CODE_DIRTY` (set to `1` if a Wasm store targets `< 0x050000`, triggering JIT cache invalidation)

### Sound Channel Descriptor Layout (`0x0FFD20 + ch * 8`) & PCM Digital Audio (`SYS 30`)
- **Synthesizer Channels (`0x0FFD20..0x0FFD3F`):**
  - **Bytes `0..1` (`uint16`):** Frequency in Hz (`0` or `<= 20` mutes channel).
  - **Byte `2` (`uint8`):** Volume (`0..255`).
  - **Byte `3` (`uint8`):** Duty cycle (`0..255`, `128` = 50%).
  - **Bytes `4..7`:** Reserved (`0`).
- **Digital 8-Bit PCM (`SYS 30 PCM_PLAY`):** Plays an arbitrary buffer of unsigned 8-bit PCM audio samples (`0..255`, centered at `128`, e.g., DOOM `DS*` sound lumps at 11,025 Hz) through a Web Audio `AudioBufferSourceNode`.

---

## 4. Instruction Formats

Every instruction is a 32-bit little-endian word (`inst = ramDV.getUint32(pc, true)`):

```
  31      24 23  20 19  16 15  12 11               0
 +----------+------+------+------+------------------+
 |  op (8)  |rd(4) |ra(4) |rb(4) |   unused (12)    |  Format R (Register-Register)
 +----------+------+------+------+------------------+
 |  op (8)  |rd(4) |ra(4) |       imm16 (16)        |  Format I (Immediate / Memory Offset)
 +----------+------+------+-------------------------+
 |  op (8)  |              addr24 (24)              |  Format J (Jump / Call Target)
 +----------+---------------------------------------+
```

- `op = (inst >>> 24) & 0x3F`
- `rd = (inst >>> 20) & 0x0F`
- `ra = (inst >>> 16) & 0x0F`
- `rb = (inst >>> 12) & 0x0F`
- `imm16 = (inst << 16) >> 16` (sign-extended 16-bit immediate: `-32768..32767`)
- `uimm16 = inst & 0xFFFF` (zero-extended 16-bit immediate: `0..65535`)
- `addr24 = inst & 0x00FFFFFF` (24-bit absolute byte address: `0x000000..0xFFFFFF`)

---

## 5. Complete Opcode Table (`0x00` – `0x3A`)

| Opcode | Mnemonic | Format | Semantics | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `0x00` (0) | `NOP` | R | No operation | Advances `PC` by 4 |
| `0x01` (1) | `MOV rd, ra` | R | `R[rd] = R[ra]` | Register copy |
| `0x02` (2) | `LDI rd, imm16` | I | `R[rd] = sext16(imm16)` | Load signed 16-bit immediate |
| `0x03` (3) | `LDIU rd, uimm16` | I | `R[rd] = zext16(uimm16)` | Load unsigned 16-bit immediate |
| `0x04` (4) | `LUI rd, uimm16` | I | `R[rd] = (R[rd] & 0xFFFF) \| (uimm16 << 16)` | Load upper 16 bits (pair after `LDIU` for 32-bit constants) |
| `0x05` (5) | `ADD rd, ra, rb` | R | `R[rd] = (R[ra] + R[rb]) \| 0` | 32-bit two's complement addition |
| `0x06` (6) | `SUB rd, ra, rb` | R | `R[rd] = (R[ra] - R[rb]) \| 0` | 32-bit two's complement subtraction |
| `0x07` (7) | `MUL rd, ra, rb` | R | `R[rd] = Math.imul(R[ra], R[rb])` | Low 32 bits of product |
| `0x08` (8) | `DIV rd, ra, rb` | R | `R[rd] = R[rb] == 0 ? 0 : (R[ra] / R[rb]) \| 0` | Signed 32-bit division (native Wasm `i64.div_s` in JIT) |
| `0x09` (9) | `MOD rd, ra, rb` | R | `R[rd] = R[rb] == 0 ? 0 : (R[ra] % R[rb]) \| 0` | Signed 32-bit remainder (native Wasm `i64.rem_s` in JIT) |
| `0x0A` (10) | `DIVU rd, ra, rb` | R | `R[rd] = R[rb] == 0 ? 0 : ((R[ra]>>>0)/(R[rb]>>>0))\|0` | Unsigned 32-bit division (native Wasm `i64.div_u` in JIT) |
| `0x0B` (11) | `MODU rd, ra, rb` | R | `R[rd] = R[rb] == 0 ? 0 : ((R[ra]>>>0)%(R[rb]>>>0))\|0` | Unsigned 32-bit remainder (native Wasm `i64.rem_u` in JIT) |
| `0x0C` (12) | `AND rd, ra, rb` | R | `R[rd] = R[ra] & R[rb]` | Bitwise AND |
| `0x0D` (13) | `OR rd, ra, rb` | R | `R[rd] = R[ra] \| R[rb]` | Bitwise OR |
| `0x0E` (14) | `XOR rd, ra, rb` | R | `R[rd] = R[ra] ^ R[rb]` | Bitwise XOR |
| `0x0F` (15) | `SHL rd, ra, rb` | R | `R[rd] = R[ra] << (R[rb] & 31)` | Logical shift left |
| `0x10` (16) | `SHR rd, ra, rb` | R | `R[rd] = R[ra] >>> (R[rb] & 31)` | Logical shift right (zero-fill) |
| `0x11` (17) | `SAR rd, ra, rb` | R | `R[rd] = R[ra] >> (R[rb] & 31)` | Arithmetic shift right (sign-fill) |
| `0x12` (18) | `ADDI rd, ra, imm16` | I | `R[rd] = (R[ra] + imm16) \| 0` | Add sign-extended 16-bit immediate |
| `0x13` (19) | `SUBI rd, ra, imm16` | I | `R[rd] = (R[ra] - imm16) \| 0` | Subtract sign-extended 16-bit immediate |
| `0x14` (20) | `ANDI rd, ra, uimm16` | I | `R[rd] = R[ra] & uimm16` | Bitwise AND immediate |
| `0x15` (21) | `ORI rd, ra, uimm16` | I | `R[rd] = R[ra] \| uimm16` | Bitwise OR immediate |
| `0x16` (22) | `XORI rd, ra, uimm16` | I | `R[rd] = R[ra] ^ uimm16` | Bitwise XOR immediate |
| `0x17` (23) | `SHLI rd, ra, uimm16` | I | `R[rd] = R[ra] << (uimm16 & 31)` | Shift left by immediate |
| `0x18` (24) | `SHRI rd, ra, uimm16` | I | `R[rd] = R[ra] >>> (uimm16 & 31)` | Logical shift right by immediate |
| `0x19` (25) | `SARI rd, ra, uimm16` | I | `R[rd] = R[ra] >> (uimm16 & 31)` | Arithmetic shift right by immediate |
| `0x1A` (26) | `CMP ra, rb` | R | Sets `FLAGS` (`Z`, `N`, `C`) from `R[ra] ? R[rb]` | Compare two registers |
| `0x1B` (27) | `CMPI ra, imm16` | I | Sets `FLAGS` (`Z`, `N`, `C`) from `R[ra] ? imm16` | Compare register with signed 16-bit immediate |
| `0x1C` (28) | `LDB rd, [ra + imm16]` | I | `R[rd] = RAM[(R[ra] + imm16) & 0xFFFFFF]` | Load unsigned byte (zero-extended) |
| `0x1D` (29) | `LDBS rd, [ra + imm16]` | I | `R[rd] = sext8(RAM[(R[ra] + imm16) & 0xFFFFFF])` | Load signed byte (sign-extended) |
| `0x1E` (30) | `LDH rd, [ra + imm16]` | I | `R[rd] = uint16_le(RAM, R[ra] + imm16)` | Load unsigned 16-bit halfword |
| `0x1F` (31) | `LDHS rd, [ra + imm16]` | I | `R[rd] = int16_le(RAM, R[ra] + imm16)` | Load signed 16-bit halfword |
| `0x20` (32) | `LDW rd, [ra + imm16]` | I | `R[rd] = int32_le(RAM, R[ra] + imm16)` | Load 32-bit word |
| `0x21` (33) | `STB rd, [ra + imm16]` | I | `RAM[(R[ra] + imm16) & 0xFFFFFF] = R[rd] & 0xFF` | Store low byte (invalidates JIT if `< 0x050000`) |
| `0x22` (34) | `STH rd, [ra + imm16]` | I | `uint16_le(RAM, R[ra] + imm16) = R[rd] & 0xFFFF` | Store low 16-bit halfword (invalidates JIT if `< 0x050000`) |
| `0x23` (35) | `STW rd, [ra + imm16]` | I | `int32_le(RAM, R[ra] + imm16) = R[rd]` | Store 32-bit word (invalidates JIT if `< 0x050000`) |
| `0x24` (36) | `PUSH rd` | I | `R[14] -= 4; int32_le(RAM, R[14]) = R[rd]` | Push register onto stack |
| `0x25` (37) | `POP rd` | I | `R[rd] = int32_le(RAM, R[14]); R[14] += 4` | Pop register from stack |
| `0x26` (38) | `JMP addr24` | J | `PC = addr24` | Unconditional jump |
| `0x27` (39) | `JZ addr24` (`JE`) | J | `if (FLAGS & 1) PC = addr24` | Jump if Equal / Zero |
| `0x28` (40) | `JNZ addr24` (`JNE`) | J | `if (!(FLAGS & 1)) PC = addr24` | Jump if Not Equal / Non-Zero |
| `0x29` (41) | `JLT addr24` | J | `if (FLAGS & 2) PC = addr24` | Jump if Signed `<` |
| `0x2A` (42) | `JGE addr24` | J | `if (!(FLAGS & 2)) PC = addr24` | Jump if Signed `>=` |
| `0x2B` (43) | `JLE addr24` | J | `if (FLAGS & 3) PC = addr24` | Jump if Signed `<=` |
| `0x2C` (44) | `JGT addr24` | J | `if (!(FLAGS & 3)) PC = addr24` | Jump if Signed `>` |
| `0x2D` (45) | `CALL addr24` | J | `R[15] = PC; PC = addr24` | Call subroutine (`LR` receives return address) |
| `0x2E` (46) | `RET` | J | `PC = R[15]` | Return from subroutine (`PC = LR`) |
| `0x2F` (47) | `SYS uimm16` | I | Host system call `uimm16` | Args in `R0..R4`, return value in `R0` |
| `0x30` (48) | `JB addr24` (`JLU`) | J | `if (FLAGS & 4) PC = addr24` | Jump if Unsigned `<` |
| `0x31` (49) | `JAE addr24` (`JGEU`) | J | `if (!(FLAGS & 4)) PC = addr24` | Jump if Unsigned `>=` |
| `0x32` (50) | `JBE addr24` (`JLEU`) | J | `if (FLAGS & 5) PC = addr24` | Jump if Unsigned `<=` |
| `0x33` (51) | `JA addr24` (`JGTU`) | J | `if (!(FLAGS & 5)) PC = addr24` | Jump if Unsigned `>` |
| `0x34` (52) | `CALLR rd` | I | `R[15] = PC; PC = R[rd]` | Indirect subroutine call via register |
| `0x35` (53) | `JMPR rd` | I | `PC = R[rd]` | Indirect jump via register |
| `0x36` (54) | `SETCC rd, cc` | I | Sets `R[rd] = 0` or `1` from condition code `cc` | `0`:EQ, `1`:NE, `2`:LT, `3`:GE, `4`:LE, `5`:GT, `6`:LTU, `7`:GEU, `8`:LEU, `9`:GTU |
| `0x37` (55) | `FXMUL rd, ra, rb` | R | `R[rd] = int32((int64(R[ra]) * int64(R[rb])) >> 16)` | **New in 1.3!** 16.16 signed fixed-point multiply (`FixedMul`, native Wasm `i64.mul` + `i64.shr_s`) |
| `0x38` (56) | `FXDIV rd, ra, rb` | R | `R[rd] = sat32((int64(R[ra]) << 16) / int64(R[rb]))` | **New in 1.3!** 16.16 signed fixed-point divide (`FixedDiv`); saturates to `0x7FFFFFFF` / `0x80000000` on `R[rb]==0` or overflow (`(\|a\|>>14) >= \|b\|`) |
| `0x39` (57) | `MULH rd, ra, rb` | R | `R[rd] = int32((int64(R[ra]) * int64(R[rb])) >> 32)` | **New in 1.3!** Upper 32 bits of signed 32×32→64 product (native Wasm `i64`) |
| `0x3A` (58) | `MULHU rd, ra, rb` | R | `R[rd] = int32((uint64(R[ra]) * uint64(R[rb])) >>> 32)` | **New in 1.3!** Upper 32 bits of unsigned 32×32→64 product (native Wasm `i64`) |

---

## 6. System Call Interface (`SYS uimm16`)

System calls are invoked via `SYS <num>` (`0x2F000000 | num`). Arguments are passed in `R0`, `R1`, `R2`, `R3`, `R4`, and the result is returned in `R0`.

| `SYS` # | Name | Arguments (`R0`..`R4`) | Return (`R0`) | Description |
| :--- | :--- | :--- | :--- | :--- |
| `0` | `EXIT` | `R0`: exit code | Does not return | Terminates current process, invalidates JIT cache, and restores parent process (or halts if root). |
| `1` | `OPEN` | `R0`: `path_ptr`, `R1`: `mode` (`0`=`r`, `1`=`w`, `2`=`a`, `3`=`r+`, `4`=`w+`, `5`=`a+`) | `fd` (`>=3`) or `-1` | Opens or creates a seekable file descriptor on the hierarchical TabComp disk. |
| `2` | `READ` | `R0`: `fd`, `R1`: `buf_ptr`, `R2`: `len` | Bytes read (`>=0`) or `-1` | Reads up to `len` bytes from `fd` at its current seek offset (`fd=0` reads stdin line buffer). |
| `3` | `WRITE` | `R0`: `fd`, `R1`: `buf_ptr`, `R2`: `len` | Bytes written or `-1` | Writes `len` bytes from `buf_ptr` to `fd` at its current seek offset, extending file if needed (`fd=1`/`2` writes to console). |
| `4` | `CLOSE` | `R0`: `fd` | `0` or `-1` | Flushes dirty changes to disk and closes open file descriptor `fd`. |
| `5` | `LIST` | `R0`: `dir_ptr`, `R1`: `idx`, `R2`: `name_out`, `R3`: `is_dir_ptr`, `R4`: `size_ptr` | `1` (valid) or `0` (end) | Reads directory entry `idx` (up to 31-char name, directory flag, byte size). |
| `6` | `MKDIR` | `R0`: `path_ptr` | `0` | Creates directory path (and parent directories if needed). |
| `7` | `DELETE` | `R0`: `path_ptr` | `0` or `-1` | Deletes a file or directory on disk (`remove` / `unlink`). |
| `8` | `STAT` | `R0`: `path_ptr`, `R1`: `size_ptr`, `R2`: `is_dir_ptr` | `0` (exists) or `-1` | Queries file/directory existence, byte size, and directory flag. |
| `9` | `EXEC` | `R0`: `bin_path_ptr`, `R1`: `arg_str_ptr` | Child exit code | Snapshots current process RAM (including used high memory above `0x0100000`) and registers, invalidates JIT cache, loads child binary at `0x000000`, and runs it. |
| `10` | `YIELD` | None | `0` | Copies `VRAM` (`0x0F0000..0x0FF9FF`) into `presentBuf` and yields current time slice to browser `requestAnimationFrame`. |
| `11` | `KEY` | None | `0` or `(mods<<16)\|(kcode<<8)\|ascii` | Pops next character/key press from the shell keyboard queue (`0` if empty). |
| `12` | `TIME` | None | `ms` since boot | Returns 32-bit wall-clock milliseconds elapsed since system boot. |
| `13` | `SAVE` | None | `0` | Rebuilds and downloads `tabcomp-YYYYMMDD-HHMM.html` with current disk image. |
| `14` | `EXPORT` | `R0`: `bin_path_ptr`, `R1`: `title_ptr`, `R2`: `flags` (`1` = `--gpl`) | `0` or `-1` | Buds off standalone `<title>.html` game cartridge using `/*@@PLAYER_BEGIN*/../*@@PLAYER_END*/` (embeds GPL-2.0 header if `flags & 1` or DOOM binary detected). |
| `15` | `REBOOTSTRAP` | None | `0` (`s1==s2==s3`), `2` (`s2==s3`), or `1` | Runs Stage 0 → Stage 1 → Stage 2 → Stage 3 compiler bootstrap and verifies byte identity. |
| `16` | `SELFTEST` | `R0`: `report_buf_ptr` | `failed_count` (`0` = pass) | Runs all 19 hardware/software/C89/DOOM self-tests and writes formatted report to `report_buf_ptr`. |
| `17` | `MIPS` | `R0`: optional `report_buf_ptr` | `MIPS * 10` | Benchmarks real workload (`cc` compiling TabTalk source) under both Interpreter and Wasm JIT. |
| `18` | `CHDIR` | `R0`: `path_ptr` | `0` or `-1` | Changes current working directory. |
| `19` | `GETCWD` | `R0`: `buf_ptr` | `0` | Writes current working directory string to `buf_ptr`. |
| `20` | `GETARGS` | `R0`: `buf_ptr` | `0` | Copies process command-line arguments from `0x0DF000` into `buf_ptr`. |
| `21` | `JIT` | `R0`: `mode` (`0`=off, `1`=on, `-1`=query) | Current `jitEnabled` (`0`/`1`) | Toggles or queries the shared-memory WebAssembly basic-block/superblock JIT. |
| `22` | `CLOCK` | `R0`: `rate` (`0`=max, `1..1000`=MIPS, `-1`=query) | Current `clockRate` (`0`=max, `1..1000`=MIPS) | Sets or queries the CPU clock governor in MIPS (`0` = Turbo ON / `MAX`; `25` = default compatibility clock when Turbo is OFF). |
| `23` | `FSEEK` | `R0`: `fd`, `R1`: `offset` (signed 32-bit), `R2`: `whence` (`0`=`SEEK_SET`, `1`=`SEEK_CUR`, `2`=`SEEK_END`) | New offset (`>=0`) or `-1` | **New in 1.3!** Repositions file descriptor `fd` read/write offset (`fseek` / `lseek`). |
| `24` | `FTELL` | `R0`: `fd` | Current offset (`>=0`) or `-1` | **New in 1.3!** Returns current byte offset of file descriptor `fd` (`ftell`). |
| `25` | `FSIZE` | `R0`: `fd` | File byte length (`>=0`) or `-1` | **New in 1.3!** Returns total byte length of open file descriptor `fd`. |
| `26` | `RENAME` | `R0`: `old_path_ptr`, `R1`: `new_path_ptr` | `0` or `-1` | **New in 1.3!** Renames or moves a file on the TabComp disk (`rename`). |
| `27` | `KEYEVENT` | `R0`: `pressed_out_ptr`, `R1`: `key_out_ptr` | `1` (event popped) or `0` (empty) | **New in 1.3!** Pops next hardware `keydown` (`*pressed=1`) or `keyup` (`*pressed=0`) edge event and normalized DOOM keycode (`*key`) from the 256-entry key event queue (`DG_GetKey`). |
| `28` | `TICKS_MS` | None | `ms` (32-bit) | **New in 1.3!** Returns machine-governed milliseconds (`DG_GetTicksMs`): follows wall-clock `performance.now()` when `clockRate == 0` (TURBO) and scales with executed instructions `(totalSteps / (clockRate * 1000))` when governed (`clock 25`). |
| `29` | `SLEEP_MS` | `R0`: `ms` | `0` | **New in 1.3!** Yields presentation and sleeps for `ms` milliseconds (`DG_SleepMs`). |
| `30` | `PCM_PLAY` | `R0`: `samples_ptr`, `R1`: `len`, `R2`: `sample_rate` | `0` or `-1` | **New in 1.3!** Plays `len` bytes of 8-bit unsigned PCM audio at `sample_rate` Hz (`1000..96000`) via Web Audio API. |

---

## 7. Standard Function Frame Layout (TabTalk & C89)

Both `/bin/cc` (TabTalk) and `/bin/cc1` (C89) use the standard TabComp frame layout:
1. Caller evaluates arguments `a0, a1, ..., a_{n-1}` left-to-right, pushing each onto the stack (`PUSH R0`, or two pushes for 64-bit `long long`).
2. Caller executes `CALL fn_addr` (`R15 = PC; PC = fn_addr`) or `CALLR R0` for C function pointers.
3. Function prologue executes:
   ```
   PUSH FP          ; [SP] = caller FP
   MOV  FP, SP      ; FP points to saved FP
   PUSH LR          ; [FP - 4] = return address (LR)
   LDIU R2, frameSz ; total bytes of local variables in function
   SUB  SP, SP, R2  ; reserve stack frame
   ```
4. Inside the function:
   - In C89 (`/bin/cc1`), parameters are copied into local frame slots at prologue entry so `&param` and `<stdarg.h>` (`va_start(ap, last)`) work uniformly. Specifically, parameter 0 is at the highest caller-pushed slot `[FP + 4 + totalArgBytes - sizeof(param0)]`, and subsequent arguments (`...`) sit at decreasing stack addresses toward `[FP + 4]`.
   - Saved `FP` is at `[FP + 0]`.
   - Saved `LR` is at `[FP - 4]`.
   - Local variables and arrays live at negative offsets `[FP - 8]`, `[FP - 12]`, etc.
5. Function epilogue executes:
   ```
   SUBI SP, FP, 4   ; point SP to saved LR
   POP  LR          ; restore LR
   POP  FP          ; restore caller FP (SP now points to pushed args)
   RET              ; PC = LR
   ```
6. Caller cleans up pushed arguments with `ADDI SP, SP, argBytes`.
