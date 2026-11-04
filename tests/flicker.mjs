// TabComp flicker / frame-rate check (Kehai Interim, 2026-11-03).
// Runs `breakout` in headless Chromium with the CPU throttled (default 6×,
// roughly a phone), records every frame the page paints to the canvas, and
// counts torn frames (and, on 1.1+, real presents per second): frames where a big part of the picture (bricks, paddle)
// is suddenly missing because the screen was shown halfway through a redraw.
//   node tests/flicker.mjs [path/to/tabcomp.html] [throttle] [jit:on|off] [clock: max|25|...]
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.resolve(process.argv[2] || path.join(root, 'index.html'));
const throttle = Number(process.argv[3] || 6);
const jit = process.argv[4] !== 'off';
const clock = process.argv[5] || 'max';

const br = await chromium.launch();
const p = await br.newPage({ viewport: { width: 1000, height: 760 } });
// Record a small fingerprint of every frame painted to the 320x200 canvas.
await p.addInitScript(() => {
  window.__frames = []; window.__presents = 0;
  // Count real presents too: 1.1 copies VRAM into its 64,000-byte present buffer on every yield.
  const oset = Uint8Array.prototype.set;
  Uint8Array.prototype.set = function (src, off) { if (window.__rec && this.length === 64000 && src && src.length === 64000) window.__presents++; return oset.call(this, src, off); };
  const orig = CanvasRenderingContext2D.prototype.putImageData;
  CanvasRenderingContext2D.prototype.putImageData = function (img, ...rest) {
    if (window.__rec && img.width === 320 && img.height === 200) {
      const d = img.data; const bg = (d[0] << 16) | (d[1] << 8) | d[2];
      let fg = 0;
      for (let i = 0; i < d.length; i += 4) if (((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]) !== bg) fg++;
      let h = 0; for (let i = 0; i < d.length; i += 4) h = (Math.imul(h, 31) + d[i] + d[i + 1] * 7 + d[i + 2] * 13) | 0;
      window.__frames.push({ t: performance.now(), fg, h });
    }
    return orig.call(this, img, ...rest);
  };
});
await p.goto('file://' + target); await p.waitForTimeout(2500);
await p.click('canvas').catch(() => {});
const type1 = async (s, w = 1500) => { await p.keyboard.type(s, { delay: 12 }); await p.keyboard.press('Enter'); await p.waitForTimeout(w); };
await type1(jit ? 'jit on' : 'jit off', 3000);
if (clock !== 'max') await type1('clock ' + clock, 800);
await type1('breakout', 2000);
await p.keyboard.press('Space'); await p.waitForTimeout(300);
const cdp = await p.context().newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
await p.evaluate(() => { window.__rec = true; });
// Keep the paddle moving so the game is busy.
for (let i = 0; i < 8; i++) { await p.keyboard.down(i % 2 ? 'ArrowLeft' : 'ArrowRight'); await p.waitForTimeout(600); await p.keyboard.up(i % 2 ? 'ArrowLeft' : 'ArrowRight'); await p.keyboard.press('Space'); }
await p.evaluate(() => { window.__rec = false; });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
const frames = await p.evaluate(() => window.__frames);
const presents = await p.evaluate(() => window.__presents);
await br.close();

// A frame is "new" if its picture changed from the previous paint.
const uniq = frames.filter((f, i) => i === 0 || f.h !== frames[i - 1].h);
const secs = (frames.at(-1).t - frames[0].t) / 1000;
const fgs = uniq.map(f => f.fg).sort((a, b) => a - b);
const median = fgs[Math.floor(fgs.length / 2)];
const torn = uniq.filter(f => f.fg < median * 0.6).length;
console.log(JSON.stringify({ file: path.basename(target), throttle, jit, clock, paints: frames.length, newPictures: uniq.length,
  seconds: +secs.toFixed(1), fps: +(uniq.length / secs).toFixed(1), presentsPerSec: +(presents / secs).toFixed(1), medianForegroundPixels: median, tornFrames: torn }));
