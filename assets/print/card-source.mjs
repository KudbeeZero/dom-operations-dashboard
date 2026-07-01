// Print-ready QR pitch card: US business card 3.5x2in + 0.125in bleed → 3.75x2.25in pages.
// Front = document-cleanup pitch, QR → https://igotadom.online
// Back  = website pitch,           QR → sms:7736477598
import { createRequire } from 'module';
import { readFileSync, writeFileSync } from 'fs';
const require = createRequire(import.meta.url);
const QRCode = require('qrcode');
const gReq = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = gReq('playwright');

const qrOpts = { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0d0d0f', light: '#ffffff' } };
const qrSite = await QRCode.toString('https://igotadom.online', qrOpts);
const qrSms = await QRCode.toString('sms:7736477598', qrOpts);
const logo = readFileSync('/home/user/dom-operations-dashboard/assets/logo.svg', 'utf8');

const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  @page { size: 3.75in 2.25in; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'DM Sans', sans-serif; }
  .page {
    width: 3.75in; height: 2.25in; overflow: hidden; position: relative;
    background: #0d0d0f; color: #f0ede8;
    page-break-after: always;
    display: flex; align-items: center;
    padding: 0.3in 0.325in; /* 0.125 bleed + ~0.2 safe margin */
    gap: 0.22in;
  }
  .page::before { /* subtle teal wash, echoes the site hero */
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(90% 120% at 85% 15%, rgba(0,212,200,0.14), transparent 60%);
  }
  .txt { position: relative; flex: 1; }
  .logo { width: 1.5in; margin-bottom: 0.09in; }
  .logo svg { width: 100%; height: auto; display: block; }
  h1 { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 21pt; line-height: 0.95; letter-spacing: -0.01em; margin-bottom: 0.07in; }
  h1 .teal { color: #00d4c8; }
  p.pitch { font-size: 7.5pt; line-height: 1.45; color: rgba(240,237,232,0.82); margin-bottom: 0.07in; }
  p.hook { font-size: 8pt; font-weight: 700; color: #00d4c8; margin-bottom: 0.05in; }
  p.phone { font-size: 8.5pt; font-weight: 700; letter-spacing: 0.02em; }
  p.phone span { color: #00d4c8; white-space: nowrap; }
  .qrcol { position: relative; text-align: center; flex: 0 0 auto; }
  .qrtile { width: 0.95in; height: 0.95in; background: #fff; border-radius: 0.07in; padding: 0.07in; box-shadow: 0 0 0 1.5pt rgba(0,212,200,0.55); }
  .qrtile svg { width: 100%; height: 100%; display: block; }
  .qrlabel { margin-top: 0.05in; font-size: 6pt; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #00d4c8; }
  .site { margin-top: 0.03in; font-size: 6.5pt; color: rgba(240,237,232,0.6); }
  .txt--back h1 { font-size: 15.5pt; margin-bottom: 0.06in; }
  .txt--back .logo { width: 1.2in; margin-bottom: 0.06in; }
  .txt--back p.pitch { font-size: 7pt; line-height: 1.4; margin-bottom: 0.06in; }
  .txt--back p.phone { font-size: 8pt; }
</style></head><body>

<div class="page"><!-- FRONT: cleanup pitch -->
  <div class="txt">
    <div class="logo">${logo}</div>
    <h1>Chaos <span style="color:rgba(240,237,232,0.45);font-size:0.5em;font-weight:600;">to</span> <span class="teal">Clarity.</span></h1>
    <p class="pitch">Text me a photo of your messy menu, flyer, notes, or resume —
    I'll send back a clean, professional, ready-to-use version. Same day.</p>
    <p class="hook">Quick fixes start at $25</p>
    <p class="phone">Text or call <span>773-647-7598</span></p>
  </div>
  <div class="qrcol">
    <div class="qrtile">${qrSite}</div>
    <div class="qrlabel">Scan to see it in action</div>
    <div class="site">igotadom.online</div>
  </div>
</div>

<div class="page"><!-- BACK: website pitch -->
  <div class="txt txt--back">
    <div class="logo">${logo}</div>
    <h1>I design <span class="teal">websites</span>, too.</h1>
    <p class="pitch">Clean, fast websites you <strong>own</strong> — domain, hosting,
    files, everything. Built with AI for a fraction of agency cost.
    Plus AI search optimization &amp; mini-apps.</p>
    <p class="phone">Straight price by text: <span>773-647-7598</span></p>
  </div>
  <div class="qrcol">
    <div class="qrtile">${qrSms}</div>
    <div class="qrlabel">Scan to text Dominick</div>
    <div class="site">igotadom.online</div>
  </div>
</div>

</body></html>`;

writeFileSync('card.html', html);
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  proxy: proxy ? { server: proxy } : undefined,
});
const page = await (await browser.newContext({ ignoreHTTPSErrors: true, deviceScaleFactor: 3 })).newPage();
await page.goto('file://' + process.cwd() + '/card.html', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const fontOk = await page.evaluate(() => document.fonts.check('800 21pt "Barlow Condensed"') && document.fonts.check('700 10pt "DM Sans"'));
await page.pdf({ path: 'qr-pitch-card.pdf', width: '3.75in', height: '2.25in', printBackground: true });
// PNG previews of each side
const pages = await page.$$('.page');
await pages[0].screenshot({ path: 'qr-card-front.png' });
await pages[1].screenshot({ path: 'qr-card-back.png' });
console.log('done; brand fonts loaded:', fontOk);
await browser.close();
