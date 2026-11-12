// I33: builds the single-file bundle with tools/bundle.py and checks it has no img/ paths left and loads
// without any outside request, missing picture or page error. Run: node tools/check-bundle.cjs [out.html]
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const out = process.argv[2] || path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ati-bundle-')), 'bundle.html');
execFileSync('python3', [path.join(ROOT, 'tools/bundle.py'), out], { stdio: 'inherit' });
const html = fs.readFileSync(out, 'utf8');
const problems = [];
const literal = html.match(/(?<![\w/+])img\/[\w-]+\.(png|jpg|webp|svg)/g) || [];
if (literal.length) problems.push('img/ paths left: ' + [...new Set(literal)].join(', '));
if (/url\('?fonts\//.test(html)) problems.push('font path left');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const self = 'file://' + out;
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  page.on('requestfailed', r => problems.push('request failed: ' + r.url().slice(0, 120)));
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u === self || u.startsWith('data:') || u.startsWith('blob:')) return r.continue();
    problems.push('outside request: ' + u.slice(0, 120));
    return r.abort();
  });
  await page.goto(self);
  await page.waitForTimeout(600);
  const go = await page.$('#btn-go');
  if (go) await go.click();
  const broken = async where => {
    const bad = await page.evaluate(() => [...document.images].filter(i => i.complete && i.getAttribute('src') && i.naturalWidth === 0).map(i => i.getAttribute('src').slice(0, 60)));
    bad.forEach(b => problems.push(`broken image (${where}): ${b}`));
  };
  await page.waitForTimeout(300);
  await broken('board');
  for (const id of ['btn-island', 'btn-daily', 'btn-shop', 'btn-store', 'btn-album', 'btn-settings']) {
    await page.evaluate(i => document.getElementById(i).click(), id);
    await page.waitForTimeout(400);
    await broken(id);
    await page.evaluate(() => { if (!document.getElementById('modal').hidden) closeModal(); });
  }
  await browser.close();
  console.log('bundle', out, (html.length / 1e6).toFixed(1) + ' MB');
  if (problems.length) { console.log('BUNDLE FAIL\n' + problems.join('\n')); process.exit(1); }
  console.log('BUNDLE OK');
})();
