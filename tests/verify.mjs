// TabComp independent verification (Kehai Interim, 2026-11-03).
// Runs a TabComp file in headless Chromium and checks what its own self-test
// can't check about itself.
//   npm i playwright   (or use a global install)
//   node tests/verify.mjs [path/to/tabcomp.html]      (default: index.html)
//
// 1. Boots with zero page errors and zero network requests.
// 2. window.TABCOMP_SELFTEST() reports no failures (8 tests in 1.0, 13 in 1.1).
// 3. Save identity: `save` in the shell reproduces the file byte for byte.
// 4. Heredity: child → grandchild → great-grandchild are byte-identical.
// 5. Tamper test ("trusting trust"): add one line to /src/cc.tt so every
//    binary the compiler writes ends in the bytes "KEHA", run `rebootstrap`,
//    compile a program with `cc`. If compilation really happens on the
//    TabComp CPU, the rebuilt /bin/cc and the new program both end in KEHA.
import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.resolve(process.argv[2] || path.join(root, 'index.html'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tabcomp-'));
let fails = 0; const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };

const DISK_RE = /(<script type="application\/x-tabcomp-disk" id="tc-disk">)([\s\S]*?)(<\/script>)/;
const readDisk = html => JSON.parse(Buffer.from(html.match(DISK_RE)[2].trim(), 'base64').toString('utf8'));
const fileOf = (disk, p) => disk.files[p] ? Buffer.from(disk.files[p], 'base64') : null;

const br = await chromium.launch();

async function boot(file) {
  const p = await br.newPage({ viewport: { width: 1000, height: 760 } });
  const errs = [], net = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) net.push(r.url()); });
  await p.goto('file://' + file); await p.waitForTimeout(2500);
  await p.click('canvas').catch(() => {});
  p.type1 = async (s, wait = 1500) => { await p.keyboard.type(s, { delay: 12 }); await p.keyboard.press('Enter'); await p.waitForTimeout(wait); };
  p.save = async () => { await p.evaluate(() => { window.__TABCOMP_DOWNLOADS.length = 0; }); await p.type1('save'); return p.evaluate(() => window.__TABCOMP_DOWNLOADS.at(-1)?.content); };
  p.errs = errs; p.net = net; return p;
}

// 1–3
const p = await boot(target);
const st = await p.evaluate(() => window.TABCOMP_SELFTEST());
check(st.failed === 0 && st.passed >= 8, `self-test ${st.passed}/${st.passed + st.failed}` + (st.failed ? ': ' + st.results.filter(r => !r.pass).map(r => r.name).join(', ') : ''));
const orig = fs.readFileSync(target, 'utf8');
const child = await p.save();
check(child === orig, `save identity: the saved copy equals the running file (${Buffer.byteLength(child)} vs ${Buffer.byteLength(orig)} bytes)`);
check(p.errs.length === 0 && p.net.length === 0, `boots with no page errors (${p.errs.length}) and no network requests (${p.net.length})`);
await p.close();

// 4
const c1 = path.join(tmp, 'child.html'); fs.writeFileSync(c1, child);
const pc = await boot(c1); const grand = await pc.save(); await pc.close();
const c2 = path.join(tmp, 'grandchild.html'); fs.writeFileSync(c2, grand);
const pg = await boot(c2); const great = await pg.save(); await pg.close();
check(child === grand && grand === great, 'heredity: child, grandchild and great-grandchild are byte-identical');

// 5
const disk = readDisk(orig);
let cc = fileOf(disk, '/src/cc.tt').toString('utf8');
const anchor = '  int outFd = fopen(outPath, 1);';
check(cc.split(anchor).length === 2, 'tamper anchor found once in /src/cc.tt');
cc = cc.replace(anchor, '  emit32(0x4148454B); // KEHA tamper test\n' + anchor);
disk.files['/src/cc.tt'] = Buffer.from(cc, 'utf8').toString('base64');
const m = orig.match(DISK_RE);
const tampered = orig.replace(DISK_RE, m[1] + Buffer.from(JSON.stringify(disk)).toString('base64') + m[3]);
const tf = path.join(tmp, 'tampered.html'); fs.writeFileSync(tf, tampered);
const pt = await boot(tf);
await pt.type1('rebootstrap', 6000);
await pt.type1('cc /home/hello.tt -o /bin/hello2', 3000);
const after = readDisk(await pt.save()); await pt.close();
const tail = b => b ? b.subarray(-4).toString('latin1') : null;
check(tail(fileOf(after, '/bin/cc')) === 'KEHA', `tamper: rebootstrapped /bin/cc ends in "${tail(fileOf(after, '/bin/cc'))}"`);
check(tail(fileOf(after, '/bin/hello2')) === 'KEHA', `tamper: hello compiled on the TabComp CPU ends in "${tail(fileOf(after, '/bin/hello2'))}"`);

await br.close();
console.log(fails ? `${fails} FAILED` : 'ALL OK');
process.exit(fails ? 1 : 0);
