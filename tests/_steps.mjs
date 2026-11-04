import { chromium } from 'playwright';
const br = await chromium.launch();
async function run(file, thr, clock, style, addr) {
  const p = await br.newPage();
  await p.goto('file://' + file); await p.waitForTimeout(2500); await p.click('canvas').catch(()=>{});
  const t = async (s, w=1200) => { await p.keyboard.type(s,{delay:12}); await p.keyboard.press('Enter'); await p.waitForTimeout(w); };
  if (clock !== 'max') await t('clock ' + clock);
  await t('breakout', 1500);
  if (style === 'plain') { await p.keyboard.press('b'); await p.waitForTimeout(300); }
  const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: thr });
  await p.waitForTimeout(800);
  const rd = () => p.evaluate(a => ({ v: window.__cpu.ram32[a >> 2], f: window.__cpu.presentCount, t: performance.now() }), addr);
  const a = await rd(); await p.waitForTimeout(5000); const b = await rd();
  const s = (b.t - a.t) / 1000;
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await p.close();
  return { throttle: thr, clock, style, fps: +((b.f - a.f) / s).toFixed(1), gameSpeed: ((b.v - a.v) / s / 62.5 * 100).toFixed(1) + '%' };
}
const f = process.argv[2], addr = Number(process.argv[3]);
for (const cfg of [[1,'max','sprite'],[6,'max','sprite'],[1,'25','sprite'],[6,'25','sprite'],[6,'25','plain'],[6,'10','sprite']]) console.log(JSON.stringify(await run(f, ...cfg, addr)));
await br.close();
