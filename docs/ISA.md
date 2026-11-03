# TabComp™ 32-Bit RISC Instruction Set Architecture (`docs/ISA.md`)

**ConsciousNode SoftWorks Engineering Reference — Document Part #TC-89-ISA**  
**Architecture Philosophy:** XINU (*Single File, Zero Dependencies, Offline-First*)

---

## 1. Architectural Overview

The **TabComp™ TC-32** is a 32-bit load/store fantasy RISC microprocessor with a fixed 32-bit instruction encoding, 16 general-purpose 32-bit registers, a 20-bit physical address space (1,048,576 bytes / 1 MiB of little-endian RAM), memory-mapped display/sound/timer peripherals, and a hardware `SYS` trap interface for virtual disk and host operations.

| Parameter | Specification |
| :--- | :--- |
| **Word Size** | 32-bit signed/unsigned integers (two's complement, little-endian) |
| **Instruction Width** | Fixed 32-bit (4 bytes, 4-byte aligned in RAM) |
| **Total RAM** | 1,048,576 bytes (`0x000000` – `0x0FFFFF`) |
| **General Purpose Registers** | 16 × 32-bit (`R0` – `R15`) |
| **Special Registers** | `PC` (32-bit Program Counter), `FLAGS` (4-bit condition code register) |
| **Measured Throughput** | ~240–285 MIPS (Interpreter) / ~800 MIPS (Hand-Encoded WebAssembly Basic-Block JIT) |

---

## 2. Register File & Calling Convention

All 16 general-purpose registers are 32 bits wide (`Int32Array(16)`):

| Register | Alias | Role in TabTalk ABI | Preserved Across Calls |
| :--- | :--- | :--- | :--- |
| `R0` | `ACC` | Expression accumulator, function return value, `SYS` arg 0 / return value | No |
| `R1` | `TMP1` | Secondary expression operand, lvalue store address, `SYS` arg 1 | No |
| `R2` | `TMP2` | Scratch register for pointer scaling / large immediate synthesis, `SYS` arg 2 | No |
| `R3` | `A3` | `SYS` arg 3 / general scratch | No |
| `R4` | `A4` | `SYS` arg 4 / general scratch | No |
| `R5` – `R12` | `T0`–`T7` | General-purpose registers available for user assembly or JIT temporaries | Yes (if used) |
| `R13` | `FP` | Frame Pointer (points to caller's saved `FP` on stack) | Yes |
| `R14` | `SP` | Stack Pointer (full-descending, 4-byte aligned, initialized to `0x0DF000`) | Yes |
| `R15` | `LR` | Link Register (stores return `PC` on `CALL` / `CALLR`) | Saved in prologue |

### Condition Flags (`FLAGS`)
Updated by `CMP` (`0x1A`) and `CMPI` (`0x1B`):
- **Bit 0 (`Z` — Zero / Equal):** `1` if `a == b`, else `0`.
- **Bit 1 (`N` — Signed Less Than):** `1` if `(a | 0) < (b | 0)`, else `0`.
- **Bit 2 (`C` — Unsigned Less Than / Borrow):** `1` if `(a >>> 0) < (b >>> 0)`, else `0`.

---

## 3. Memory Map (`0x000000` – `0x0FFFFF`)

All memory accesses are little-endian and masked to the 1 MiB physical address space (`addr & 0xFFFFF`):

| Address Range | Size | Region | Description |
| :--- | :--- | :--- | :--- |
| `0x000000` – `0x04FFFF` | 320 KB | `TEXT / RODATA` | Program machine code and inline 4-byte-aligned string literals. Entry point is `0x000000`. |
| `0x050000` – `0x0BFFFF` | 448 KB | `DATA / BSS` | Global variables and static arrays (`src`, `code`, symbol tables, app buffers). |
| `0x0C0000` – `0x0DEFFF` | 124 KB | `STACK` | Full-descending user execution stack (`SP` starts at `0x0DF000` and grows downward). |
| `0x0DF000` – `0x0DF7FF` | 2 KB | `ARGS` | Null-terminated command-line argument string passed to the current process. |
| `0x0DF800` – `0x0DF803` | 4 B | `EXIT_STUB` | Contains `0x2F000000` (`SYS 0`), pointed to by initial `LR` so returning from `main()` exits cleanly. |
| `0x0F0000` – `0x0FF9FF` | 64,000 B | `VRAM` | 320×200 8-bit indexed colour framebuffer (`y * 320 + x`, 1 byte per pixel). |
| `0x0FFA00` – `0x0FFCFF` | 768 B | `PALETTE` | 256 × 3-byte RGB palette entries (`R, G, B`, each `0..255`). |
| `0x0FFD00` – `0x0FFD03` | 4 B | `TIMER_MS` | 32-bit milliseconds elapsed since boot (updated every frame). |
| `0x0FFD04` – `0x0FFD07` | 4 B | `VSYNC_CNT` | 32-bit vertical blanking frame counter (incremented every `requestAnimationFrame`). |
| `0x0FFD20` – `0x0FFD3F` | 32 B | `SOUND_MMIO` | 4 × 8-byte Web Audio synthesizer channel descriptors (`Ch0`: Square, `Ch1`: Triangle, `Ch2`: Saw, `Ch3`: Noise). |
| `0x0EF000` – `0x0EF2FF` | 768 B | `FONT_ROM` | Built-in 8×8 monochrome bitmap font for ASCII characters `32..127` (8 bytes per glyph). *Moved in 1.0.1: at `0x0FFE00` the 768 bytes ran past the top of RAM and glyphs 96–127 (all lowercase) were lost.* |

### Sound Channel Descriptor Layout (`0x0FFD20 + ch * 8`)
- **Bytes `0..1` (`uint16`):** Frequency in Hz (`0` or `<= 20` mutes channel).
- **Byte `2` (`uint8`):** Volume (`0..255`).
- **Byte `3` (`uint8`):** Duty cycle (`0..255`, `128` = 50%).
- **Bytes `4..7`:** Reserved (`0`).

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

## 5. Complete Opcode Table

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
| `0x08` (8) | `DIV rd, ra, rb` | R | `R[rd] = R[rb] == 0 ? 0 : (R[ra] / R[rb]) \| 0` | Signed 32-bit division truncating toward zero |
| `0x09` (9) | `MOD rd, ra, rb` | R | `R[rd] = R[rb] == 0 ? 0 : (R[ra] % R[rb]) \| 0` | Signed 32-bit remainder |
| `0x0A` (10) | `DIVU rd, ra, rb` | R | `R[rd] = R[rb] == 0 ? 0 : ((R[ra]>>>0)/(R[rb]>>>0))\|0` | Unsigned 32-bit division |
| `0x0B` (11) | `MODU rd, ra, rb` | R | `R[rd] = R[rb] == 0 ? 0 : ((R[ra]>>>0)%(R[rb]>>>0))\|0` | Unsigned 32-bit remainder |
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
| `0x1C` (28) | `LDB rd, [ra + imm16]` | I | `R[rd] = RAM[(R[ra] + imm16) & 0xFFFFF]` | Load unsigned byte (zero-extended) |
| `0x1D` (29) | `LDBS rd, [ra + imm16]` | I | `R[rd] = sext8(RAM[(R[ra] + imm16) & 0xFFFFF])` | Load signed byte (sign-extended) |
| `0x1E` (30) | `LDH rd, [ra + imm16]` | I | `R[rd] = uint16_le(RAM, R[ra] + imm16)` | Load unsigned 16-bit halfword |
| `0x1F` (31) | `LDHS rd, [ra + imm16]` | I | `R[rd] = int16_le(RAM, R[ra] + imm16)` | Load signed 16-bit halfword |
| `0x20` (32) | `LDW rd, [ra + imm16]` | I | `R[rd] = int32_le(RAM, R[ra] + imm16)` | Load 32-bit word |
| `0x21` (33) | `STB rd, [ra + imm16]` | I | `RAM[(R[ra] + imm16) & 0xFFFFF] = R[rd] & 0xFF` | Store low byte |
| `0x22` (34) | `STH rd, [ra + imm16]` | I | `uint16_le(RAM, R[ra] + imm16) = R[rd] & 0xFFFF` | Store low 16-bit halfword |
| `0x23` (35) | `STW rd, [ra + imm16]` | I | `int32_le(RAM, R[ra] + imm16) = R[rd]` | Store 32-bit word |
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

---

## 6. System Call Interface (`SYS uimm16`)

System calls are invoked via `SYS <num>` (`0x2F000000 | num`). Arguments are passed in `R0`, `R1`, `R2`, `R3`, `R4`, and the result is returned in `R0`.

| `SYS` # | Name | Arguments (`R0`..`R4`) | Return (`R0`) | Description |
| :--- | :--- | :--- | :--- | :--- |
| `0` | `EXIT` | `R0`: exit code | Does not return | Terminates current process and restores parent process (or halts if root). |
| `1` | `OPEN` | `R0`: `path_ptr`, `R1`: `mode` (`0`=read, `1`=write/create) | `fd` (`>=3`) or `-1` | Opens or creates a file on the hierarchical TabComp disk. |
| `2` | `READ` | `R0`: `fd`, `R1`: `buf_ptr`, `R2`: `len` | Bytes read (`>=0`) or `-1` | Reads up to `len` bytes from `fd` into RAM at `buf_ptr`. |
| `3` | `WRITE` | `R0`: `fd`, `R1`: `buf_ptr`, `R2`: `len` | Bytes written or `-1` | Writes `len` bytes from `buf_ptr` to `fd` (`fd=1`/`2` writes to serial console). |
| `4` | `CLOSE` | `R0`: `fd` | `0` or `-1` | Flushes and closes open file descriptor `fd`. |
| `5` | `LIST` | `R0`: `dir_ptr`, `R1`: `idx`, `R2`: `name_out`, `R3`: `is_dir_ptr`, `R4`: `size_ptr` | `1` (valid) or `0` (end) | Reads directory entry `idx` (up to 31-char name, directory flag, byte size). |
| `6` | `MKDIR` | `R0`: `path_ptr` | `0` | Creates directory path (and parent directories if needed). |
| `7` | `DELETE` | `R0`: `path_ptr` | `0` or `-1` | Deletes a file or directory on disk. |
| `8` | `STAT` | `R0`: `path_ptr`, `R1`: `size_ptr`, `R2`: `is_dir_ptr` | `0` (exists) or `-1` | Queries file/directory existence, byte size, and directory flag. |
| `9` | `EXEC` | `R0`: `bin_path_ptr`, `R1`: `arg_str_ptr` | Child exit code | Snapshots current process RAM/registers, loads child binary at `0x000000`, and runs it. |
| `10` | `YIELD` | None | `0` | Yields current time slice to browser `requestAnimationFrame` for 60 Hz display/input sync. |
| `11` | `KEY` | None | `0` or `(mods<<16)\|(kcode<<8)\|ascii` | Pops next key event from hardware keyboard queue (`0` if empty). |
| `12` | `TIME` | None | `ms` since boot | Returns 32-bit milliseconds elapsed since system boot. |
| `13` | `SAVE` | None | `0` | Rebuilds and downloads `tabcomp-YYYYMMDD-HHMM.html` with current disk image. |
| `14` | `EXPORT` | `R0`: `bin_path_ptr`, `R1`: `title_ptr` | `0` or `-1` | Buds off standalone `<title>.html` game cartridge using `/*@@PLAYER_BEGIN*/../*@@PLAYER_END*/`. |
| `15` | `REBOOTSTRAP` | None | `0` (match) or `1` | Runs Stage 0 → Stage 1 → Stage 2 → Stage 3 compiler bootstrap and verifies byte identity. |
| `16` | `SELFTEST` | `R0`: `report_buf_ptr` | `failed_count` (`0` = pass) | Runs all 8 hardware/software self-tests and writes formatted report to `report_buf_ptr`. |
| `17` | `MIPS` | None | `MIPS * 10` | Runs CPU/JIT benchmark and returns tenths of MIPS (e.g. `2500` = `250.0 MIPS`). |
| `18` | `CHDIR` | `R0`: `path_ptr` | `0` or `-1` | Changes current working directory. |
| `19` | `GETCWD` | `R0`: `buf_ptr` | `0` | Writes current working directory string to `buf_ptr`. |
| `20` | `GETARGS` | `R0`: `buf_ptr` | `0` | Copies process command-line arguments from `0x0DF000` into `buf_ptr`. |
| `21` | `JIT` | `R0`: `mode` (`0`=off, `1`=on, `-1`=query) | Current `jitEnabled` (`0`/`1`) | Toggles or queries the hand-encoded WebAssembly basic-block JIT. |

---

## 7. Standard Function Frame Layout

When a TabTalk function `f(a0, a1, ..., a_{n-1})` is called:
1. Caller evaluates `a0..a_{n-1}` left-to-right, pushing each onto the stack (`PUSH R0`).
2. Caller executes `CALL fn_addr` (`R15 = PC; PC = fn_addr`).
3. Function prologue executes:
   ```
   PUSH FP          ; [SP] = caller FP
   MOV  FP, SP      ; FP points to saved FP
   PUSH LR          ; [FP - 4] = return address (LR)
   LDIU R2, frameSz ; total bytes of local variables in function
   SUB  SP, SP, R2  ; reserve stack frame
   ```
4. Inside the function:
   - Parameter `i` (`0 .. n-1`) is at `[FP + 4 + (n - 1 - i) * 4]`.
   - Saved `FP` is at `[FP + 0]`.
   - Saved `LR` is at `[FP - 4]`.
   - Local variables and arrays live at negative offsets `[FP - 8]`, `[FP - 12]`, etc.
5. Function epilogue (`emitFuncReturn`) executes:
   ```
   SUBI SP, FP, 4   ; point SP to saved LR
   POP  LR          ; restore LR
   POP  FP          ; restore caller FP (SP now points to pushed args)
   RET              ; PC = LR
   ```
6. Caller cleans up arguments with `ADDI SP, SP, n * 4`.
