// Build real doomgeneric on TabComp with TabComp's own C toolchain, then run it with Freedoom.
// usage: node tests/doom.mjs <tabcomp.html> <doomgeneric/doomgeneric dir> <freedoom1.wad> [seconds] [out.png]
// Nothing is patched in: every .c file is compiled by /bin/c89 on the TabComp CPU and linked by /bin/ld.
// The platform layer (doomgeneric_tabcomp.c) comes from the machine's own /src/doom/.
import { chromium } from 'playwright'; import fs from 'node:fs'; import path from 'node:path';
const [html, DG, wad, secs = '30', png = '/tmp/doom-on-tabcomp.png'] = process.argv.slice(2);
if (!wad) { console.log('usage: node tests/doom.mjs <tabcomp.html> <doomgeneric dir> <freedoom1.wad> [seconds] [out.png]'); process.exit(2); }
const src = fs.readFileSync(html, 'utf8'), hook = '  const vfs = new TabCompFS();', i = src.indexOf(hook);
const probe = '/tmp/tc_doom_probe.html';
fs.writeFileSync(probe, src.slice(0, i + hook.length) + ' window.__TC = { vfs, TabCompCPU, initHardwareMemory };' + src.slice(i + hook.length));
const br = await chromium.launch(), p = await br.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + probe); await p.waitForTimeout(2500);
const put = async (f, data) => { const B = 4 << 20; await p.evaluate(n => { window.__buf = new Uint8Array(n); }, data.length);
  for (let o = 0; o < data.length; o += B) await p.evaluate(([o, b]) => { const s = atob(b); for (let k = 0; k < s.length; k++) window.__buf[o + k] = s.charCodeAt(k); }, [o, Buffer.from(data.subarray(o, o + B)).toString('base64')]);
  await p.evaluate(f => window.__TC.vfs.writeFile(f, window.__buf), f); };
const run = (bin, args, cwd) => p.evaluate(([bin, args, cwd]) => { const T = window.__TC, c = new T.TabCompCPU(T.vfs); T.initHardwareMemory(c); c.jitEnabled = 1; let out = ''; c.hooks.onStdout = s => { out += s; }; c.cwd = cwd;
  c.loadBinary(T.vfs.readFile(bin), args); const t0 = performance.now(); let n = 0; while (!c.halted && n < 4e9) { c.yielded = false; c.stepBatch(500000); n += 500000; } return { out, exit: c.exitCode, ms: Math.round(performance.now() - t0) }; }, [bin, args, cwd]);
const results = []; const check = (ok, msg) => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const mk = fs.readFileSync(path.join(DG, 'Makefile'), 'utf8').match(/^SRC_DOOM = (.*)$/m)[1].split(/\s+/).filter(o => o && o !== 'doomgeneric_xlib.o').map(o => o.replace(/\.o$/, '.c'));
for (const f of fs.readdirSync(DG)) if (/\.(c|h)$/.test(f)) await put('/src/doom/dg/' + f, fs.readFileSync(path.join(DG, f)));
await p.evaluate(() => { const v = window.__TC.vfs; v.writeFile('/src/doom/dg/doomgeneric_tabcomp.c', v.readFile('/src/doom/doomgeneric_tabcomp.c')); });
const files = [...mk, 'doomgeneric_tabcomp.c']; let ok = 0, ms = 0;
for (const f of files) { const r = await run('/bin/c89', `-DCMAP256 -DDOOMGENERIC_RESX=320 -DDOOMGENERIC_RESY=200 -I/src/doom/dg -c /src/doom/dg/${f} -o /src/doom/obj/${f.replace(/\.c$/, '.o')}`, '/src/doom/dg'); ms += r.ms; if (r.exit === 0) ok++; else console.log('     ' + f + ': ' + r.out.trim().split('\n').pop()); }
check(ok === files.length, `compiled ${ok}/${files.length} doomgeneric files on the TabComp CPU (${(ms / 1000).toFixed(1)} s)`);
await put('/src/doom/link.rsp', Buffer.from(files.map(f => '/src/doom/obj/' + f.replace(/\.c$/, '.o')).join('\n') + '\n'));
const L = await run('/bin/c89', '@/src/doom/link.rsp -o /bin/doom', '/src/doom');
const size = await p.evaluate(() => (window.__TC.vfs.readFile('/bin/doom') || []).length);
check(L.exit === 0 && size > 0, `linked /bin/doom (${size} bytes)${L.exit ? ': ' + L.out.trim() : ''}`);
if (!size) { await br.close(); console.log('FAILURES (nothing to run)'); process.exit(1); }
await put('/home/freedoom1.wad', fs.readFileSync(wad));
await p.evaluate(() => { const T = window.__TC, c = new T.TabCompCPU(T.vfs); T.initHardwareMemory(c); c.jitEnabled = 1; window.__out = ''; c.hooks.onStdout = s => { window.__out += s; }; c.cwd = '/home'; c.loadBinary(T.vfs.readFile('/bin/doom'), ''); window.__c = c; });
const st = await p.evaluate(ms => { const c = window.__c, t1 = performance.now() + ms; while (!c.halted && performance.now() < t1) { c.yielded = false; c.stepBatch(100000); } return { halted: c.halted, exit: c.exitCode, presents: c.presentCount, out: window.__out }; }, +secs * 1000);
check(/Freedoom: Phase 1/.test(st.out) && /I_InitGraphics/.test(st.out), 'boots: finds freedoom1.wad on its own and initialises graphics');
check(!st.halted, `still running after ${secs} s (no I_Error, no fault)` + (st.halted ? ': ' + st.out.trim().split('\n').slice(-2).join(' | ') : ''));
check(st.presents >= 20 * +secs, `${st.presents} frames presented (${(st.presents / secs).toFixed(1)}/s)`);
const pic = await p.evaluate(() => { const c = window.__c, cv = document.createElement('canvas'); cv.width = 320; cv.height = 200; const x = cv.getContext('2d'), im = x.createImageData(320, 200); const cols = new Set();
  for (let k = 0; k < 64000; k++) { const q = c.presentBuf[k] * 3; cols.add(c.presentBuf[k]); im.data[k*4] = c.ram[0x0FFA00+q]; im.data[k*4+1] = c.ram[0x0FFA00+q+1]; im.data[k*4+2] = c.ram[0x0FFA00+q+2]; im.data[k*4+3] = 255; }
  x.putImageData(im, 0, 0); return { png: cv.toDataURL('image/png').split(',')[1], colors: cols.size }; });
fs.writeFileSync(png, Buffer.from(pic.png, 'base64'));
check(pic.colors > 64, `last frame uses ${pic.colors} palette colours (saved to ${png})`);
check(errs.length === 0, `no page errors (${errs.length})`);
await br.close(); console.log(results.every(Boolean) ? 'ALL OK' : 'FAILURES'); process.exit(results.every(Boolean) ? 0 : 1);
