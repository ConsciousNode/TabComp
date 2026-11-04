// TabKey on-screen keyboard check (Kehai Interim, 2026-11-03).
// Opens TabComp as a touch phone, checks the keyboard shows itself, then taps
// out `ver` + Enter and `ls /bin` + Enter on the on-screen keys only (no
// physical keyboard) and checks the shell answered.
//   node tests/tabkey.mjs [path/to/tabcomp.html]
import { chromium, devices } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.resolve(process.argv[2] || path.join(root, 'index.html'));
let fails = 0; const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };

const br = await chromium.launch();
const ctx = await br.newContext({ ...devices['Pixel 7'] });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + target); await p.waitForTimeout(2500);

check(await p.locator('.tk-board.tk-on').count() === 1, 'keyboard shows itself on a touch screen');
const shot = () => p.locator('canvas').first().screenshot();
const tap = async label => {
  const k = p.locator('.tk-key', { hasText: new RegExp('^' + label.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '$', 'i') }).first();
  await k.dispatchEvent('pointerdown'); await k.dispatchEvent('pointerup'); await p.waitForTimeout(60);
};
await tap('Enter'); await p.waitForTimeout(800); // wake/skip boot
const before = await shot();
for (const c of 'ver') await tap(c);
await tap('Enter'); await p.waitForTimeout(1500);
const mid = await shot();
check(!before.equals(mid), 'typing `ver` + Enter on the on-screen keys changes the screen');
for (const c of 'ls') await tap(c);
await tap('Space'); for (const c of '/bin') await tap(c);
await tap('Enter'); await p.waitForTimeout(1500);
const after = await shot();
check(!mid.equals(after), 'typing `ls /bin` + Enter on the on-screen keys changes the screen');
await p.locator('canvas').first().screenshot({ path: path.join(process.env.TMPDIR || '/tmp', 'tabkey-check.png') });
check(errs.length === 0, `no page errors (${errs.length})` + (errs.length ? ': ' + errs[0] : ''));
await br.close();
console.log(fails ? `${fails} FAILED` : 'ALL OK');
process.exit(fails ? 1 : 0);
