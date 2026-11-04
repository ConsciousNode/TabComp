// Breakout pacing check (Kehai Interim, 2026-11-03).
// Tracks the ball on screen and measures its real speed in pixels per second,
// so you can check that the game runs at the same speed on fast and slow
// machines and clocks. Watches every painted frame, finds the ball in the
// empty band between the bricks and the paddle, and adds up how far it moves.
//   node tests/pacing.mjs [path/to/tabcomp.html] [throttle] [clock: max|25|...]
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.resolve(process.argv[2] || path.join(root, 'index.html'));
const throttle = Number(process.argv[3] || 1);
const clock = process.argv[4] || 'max';

const br = await chromium.launch();
const p = await br.newPage({ viewport: { width: 1000, height: 760 } });
await p.addInitScript(() => {
  window.__ball = [];
  const orig = CanvasRenderingContext2D.prototype.putImageData;
  CanvasRenderingContext2D.prototype.putImageData = function (img, ...rest) {
    if (window.__rec && img.width === 320 && img.height === 200) {
      const d = img.data, Y0 = 122, Y1 = 172;
      const bgi = (150 * 320 + 2) * 4; // the arena's left edge column is wall; sample the background just inside
      const counts = new Map();
      for (let y = Y0; y < Y1; y += 5) for (let x = 8; x < 312; x += 7) { const i = (y * 320 + x) * 4, k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; counts.set(k, (counts.get(k) || 0) + 1); }
      let bg = 0, best = -1; for (const [k, c] of counts) if (c > best) { best = c; bg = k; }
      let n = 0, sx = 0, sy = 0;
      for (let y = Y0; y < Y1; y++) for (let x = 6; x < 314; x++) { const i = (y * 320 + x) * 4; if (((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]) !== bg) { n++; sx += x; sy += y; } }
      window.__ball.push({ t: performance.now(), n, x: n ? sx / n : null, y: n ? sy / n : null });
    }
    return orig.call(this, img, ...rest);
  };
});
await p.goto('file://' + target); await p.waitForTimeout(2500);
await p.click('canvas').catch(() => {});
const type1 = async (s, w = 1500) => { await p.keyboard.type(s, { delay: 12 }); await p.keyboard.press('Enter'); await p.waitForTimeout(w); };
await type1('jit on', 2500);
if (clock !== 'max') await type1('clock ' + clock, 800);
await type1('breakout', 1500);
const cdp = await p.context().newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
await p.evaluate(() => { window.__rec = true; });
await p.waitForTimeout(8000);
await p.evaluate(() => { window.__rec = false; });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
const B = await p.evaluate(() => window.__ball);
await br.close();

// The ball is 16x16 with transparency: count a frame as "ball in band" when the
// non-background pixel count looks like one ball, fully inside the band.
const ok = f => f.n >= 20 && f.n <= 260 && f.y > 130 && f.y < 164;
let dist = 0, time = 0, pairs = 0;
for (let i = 1; i < B.length; i++) {
  const a = B[i - 1], b = B[i];
  if (!ok(a) || !ok(b)) continue;
  const step = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
  if (step > 40) continue; // ball respawned
  dist += step; time += b.t - a.t; pairs++;
}
const changes = B.filter((f, i) => i && (f.x !== B[i - 1].x || f.y !== B[i - 1].y)).length;
console.log(JSON.stringify({ file: path.basename(target), throttle, clock, seconds: +((B.at(-1).t - B[0].t) / 1000).toFixed(1),
  ballMovesPerSec: +(changes / ((B.at(-1).t - B[0].t) / 1000)).toFixed(1), framesTracked: pairs, trackedSeconds: +(time / 1000).toFixed(2),
  ballSpeedPxPerSec: time ? +(dist / (time / 1000)).toFixed(1) : null }));
