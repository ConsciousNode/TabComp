// TabPad cartridge check (Kehai Interim, 2026-11-03).
// Opens a budded cartridge as a touch phone, checks the TabPad game pad shows
// itself, then holds the on-screen Right and Left buttons and checks that the
// paddle actually moves on screen (no physical keyboard involved).
//   node tests/tabpad.mjs [path/to/cartridge.html]
import { chromium, devices } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.resolve(process.argv[2] || path.join(root, 'cartridges/TabBreakout.html'));
let fails = 0; const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };

const br = await chromium.launch();
const ctx = await br.newContext({ ...devices['Pixel 7'] });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + target); await p.waitForTimeout(2500);
check(await p.locator('.tp-pad.tp-on, .tp-on').count() >= 1, 'TabPad shows itself on a touch screen');

// Paddle x = centre of the non-background pixels in the paddle rows of the canvas.
const paddleX = () => p.evaluate(() => {
  const c = document.querySelector('canvas'); const g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
  const y0 = Math.floor(H * 0.895), y1 = Math.floor(H * 0.94); // paddle rows (y 179..188 of 200)
  const bg = (d[(y0 * W + Math.floor(W / 2)) * 4] << 16) | 0; let n = 0, sx = 0;
  const bgk = []; // take the most common colour in the band as background
  const cnt = new Map();
  for (let y = y0; y < y1; y++) for (let x = Math.floor(W * 0.03); x < Math.floor(W * 0.97); x += 3) { const i = (y * W + x) * 4, k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; cnt.set(k, (cnt.get(k) || 0) + 1); }
  let bk = 0, best = -1; for (const [k, v] of cnt) if (v > best) { best = v; bk = k; }
  for (let y = y0; y < y1; y++) for (let x = Math.floor(W * 0.03); x < Math.floor(W * 0.97); x++) { const i = (y * W + x) * 4; if (((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]) !== bk) { n++; sx += x; } }
  return n ? sx / n / W * 320 : null;
});
const hold = async (re, ms) => {
  const b = p.locator('.tp-btn', { hasText: re }).first();
  await b.dispatchEvent('pointerdown'); await p.waitForTimeout(ms); await b.dispatchEvent('pointerup'); await p.waitForTimeout(200);
};
const x0 = await paddleX();
await hold(/^(▶|→|►)$/, 700);
const x1 = await paddleX();
await hold(/^(◀|←|◄)$/, 1400);
const x2 = await paddleX();
check(x0 !== null && x1 > x0 + 10, `holding TabPad Right moves the paddle right (${x0?.toFixed(0)} → ${x1?.toFixed(0)})`);
check(x2 < x1 - 10, `holding TabPad Left moves it back left (${x1?.toFixed(0)} → ${x2?.toFixed(0)})`);
await p.screenshot({ path: path.join(process.env.TMPDIR || '/tmp', 'tabpad-check.png') });
check(errs.length === 0, `no page errors (${errs.length})` + (errs.length ? ': ' + errs[0] : ''));
await br.close();
console.log(fails ? `${fails} FAILED` : 'ALL OK');
process.exit(fails ? 1 : 0);
