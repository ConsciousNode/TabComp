// Boot the DOOM cartridge, open the menu, start E1M1, walk and fire. Screenshots to <out>-0/1/2.png.
// usage: node tests/doomcart.mjs [cartridges/DOOM.html] [/tmp/doomcart]
import { chromium } from 'playwright'; import path from 'node:path';
const file = path.resolve(process.argv[2] || 'cartridges/DOOM.html'), outp = process.argv[3] || '/tmp/doomcart';
const br = await chromium.launch(), p = await br.newPage({ viewport: { width: 1000, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
const t0 = Date.now(); await p.goto('file://' + file, { timeout: 120000 }); console.log('loaded in', Date.now() - t0, 'ms');
await p.waitForTimeout(3000); await p.screenshot({ path: outp + '-0.png' });
await p.keyboard.press('Space'); await p.waitForTimeout(9000); await p.screenshot({ path: outp + '-1.png' });
for (let i = 0; i < 4; i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(600); }
await p.waitForTimeout(2500); await p.keyboard.down('ArrowUp'); await p.waitForTimeout(1500); await p.keyboard.up('ArrowUp');
await p.keyboard.down('Control'); await p.waitForTimeout(400); await p.keyboard.up('Control'); await p.waitForTimeout(700);
await p.screenshot({ path: outp + '-2.png' });
const ok = errs.length === 0; console.log((ok ? 'ok   ' : 'FAIL ') + `no page errors (${errs.length})`); console.log('screenshots: ' + outp + '-0/1/2.png'); await br.close(); process.exit(ok ? 0 : 1);
