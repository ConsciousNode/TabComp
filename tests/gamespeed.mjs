// Breakout game-speed check, from the game's own physics counter
// (Kehai Interim, 2026-11-03).
// Since 1.2, TabBreakout counts its physics steps (`phys_steps`, one per 16 ms
// of game time). This test finds that counter in TabComp's RAM (the word that
// rises about 62.5 per second while the game runs), then reports the game speed
// (100% = real time) and frames per second at different clocks and CPU
// throttles. More trustworthy than tracking the ball on screen (pacing.mjs),
// which undercounts at low frame rates.
//   node tests/gamespeed.mjs [path/to/tabcomp.html]
import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.resolve(process.argv[2] || path.join(root, 'index.html'));
// Work on a copy that exposes the CPU object to the test.
const html = fs.readFileSync(target, 'utf8');
const hook = 'const cpu = new TabCompCPU(vfs);';
const probe = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tabcomp-speed-')), 'probe.html');
fs.writeFileSync(probe, html.replace(hook, hook + ' window.__cpu = cpu;'));

const br = await chromium.launch();
async function open(clock, style) {
  const p = await br.newPage();
  await p.goto('file://' + probe); await p.waitForTimeout(2500); await p.click('canvas').catch(() => {});
  const t = async (s, w = 1200) => { await p.keyboard.type(s, { delay: 12 }); await p.keyboard.press('Enter'); await p.waitForTimeout(w); };
  if (clock !== 'max') await t('clock ' + clock);
  await t('breakout', 1500);
  if (style === 'plain') { await p.keyboard.press('b'); await p.waitForTimeout(300); }
  return p;
}
// Find the counter: a word in the data region that rises ~62.5/s, steadily.
const p0 = await open('max', 'sprite');
const snap = () => p0.evaluate(() => ({ w: Array.from(window.__cpu.ram32.subarray(0x50000 >> 2, 0xC0000 >> 2)), t: performance.now() }));
const a = await snap(); await p0.waitForTimeout(2000); const b = await snap();
await p0.close();
const secs = (b.t - a.t) / 1000;
let addr = null;
for (let i = 0; i < a.w.length; i++) { const r = (b.w[i] - a.w[i]) / secs; if (r > 50 && r < 75) { addr = 0x50000 + i * 4; break; } }
if (addr === null) { console.log('FAIL could not find the physics step counter'); await br.close(); process.exit(1); }
console.log(`physics step counter found at 0x${addr.toString(16)}`);

for (const [thr, clock, style] of [[1, 'max', 'sprite'], [6, 'max', 'sprite'], [6, '25', 'sprite'], [6, '25', 'plain'], [1, '10', 'sprite'], [1, '10', 'plain']]) {
  const p = await open(clock, style);
  const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: thr });
  await p.waitForTimeout(800);
  const rd = () => p.evaluate(a => ({ v: window.__cpu.ram32[a >> 2], f: window.__cpu.presentCount, t: performance.now() }), addr);
  const x = await rd(); await p.waitForTimeout(5000); const y = await rd();
  const s = (y.t - x.t) / 1000;
  console.log(JSON.stringify({ throttle: thr, clock, bricks: style, fps: +((y.f - x.f) / s).toFixed(1), gameSpeed: ((y.v - x.v) / s / 62.5 * 100).toFixed(1) + '%' }));
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await p.close();
}
await br.close();
