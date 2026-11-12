// Playwright checks for I12 (store buttons wait for prices), I43 (volume sliders, one vibration switch) and
// I50 (device language) at 360x640. Run: node tools/smoke-settings.cjs
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'web/index.html');
const OUT = path.join(ROOT, 'production/qa/evidence');
const problems = [];
const check = (c, m) => { if (!c) problems.push(m); };

async function open(browser, locale, init) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, locale });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  page.on('pageerror', e => problems.push(`${locale} pageerror: ${e.message}`));
  await page.goto(URL);
  await page.waitForTimeout(400);
  const go = await page.$('#btn-go');
  if (go) await go.click();
  await page.evaluate(() => { S.tut = 5; commit(); });
  return { ctx, page };
}

(async () => {
  const browser = await chromium.launch();

  // I12: fake native bridge without prices
  {
    const { ctx, page } = await open(browser, 'en-US', () => {
      window.__asked = 0;
      window.AndroidBilling = { buy() { window.__bought = 1; }, ack() {}, pageReady() {}, requestPrices() { window.__asked++; }, saveMirror() {}, loadMirror: () => '', exit() {} };
    });
    await page.evaluate(() => openShop());
    await page.waitForTimeout(200);
    const w = await page.evaluate(() => [...document.querySelectorAll('#modal-body [data-money]')].map(b => ({ d: b.disabled, t: b.textContent })));
    check(w.length > 0 && w.every(b => b.d && b.t === 'Loading...'), 'I12 money buttons not disabled/Loading: ' + JSON.stringify(w.slice(0, 2)));
    check(await page.evaluate(() => window.__asked) >= 1, 'I12 prices not requested');
    await page.screenshot({ path: OUT + '/i12-shop-loading.png' });
    await page.evaluate(() => onNativePrices({ gems_80: '0,99 €', gems_500: '4,99 €', gems_1200: '9,99 €', gems_2600: '19,99 €', gems_7000: '49,99 €', gems_15000: '99,99 €', starter: '1,99 €', pass: '4,99 €' }));
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => [...document.querySelectorAll('#modal-body [data-money]')].map(b => b.disabled));
    check(r.length > 0 && r.every(d => !d), 'I12 money buttons still disabled after prices');
    await ctx.close();
  }

  // I43 + I50: German device, settings
  {
    const { ctx, page } = await open(browser, 'de-DE');
    check(await page.evaluate(() => P.lang === 'de' && P.langAuto === true), 'I50 new player on German device not auto/de');
    await page.evaluate(() => openSettings());
    await page.waitForTimeout(200);
    const s = await page.evaluate(() => ({
      ranges: document.querySelectorAll('#modal-body input[type=range][data-xvol]').length,
      vib: [...document.querySelectorAll('#modal-body h3')].filter(h => /Vibration/.test(h.textContent)).length,
      auto: !!document.querySelector('#modal-body [data-xlang].on')
    }));
    check(s.ranges === 2, 'I43 expected 2 volume sliders, got ' + s.ranges);
    check(s.vib === 1, 'I43 expected one vibration switch, got ' + s.vib);
    check(s.auto, 'I50 device language not marked');
    await page.screenshot({ path: OUT + '/i43-i50-settings.png' });
    await page.$eval('#modal-body [data-xvol="sfxVol"]', el => { el.value = '30'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.$eval('#modal-body [data-xvol="musicVol"]', el => { el.value = '0'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
    const v = await page.evaluate(() => ({ s: P.sfxVol, m: P.musicVol, music: P.music, sfx: P.sfx, saved: JSON.parse(localStorage.getItem('amy-tasty-prefs')).sfxVol }));
    check(v.s === 30 && v.m === 0 && v.music === false && v.sfx === true && v.saved === 30, 'I43 volume not applied/saved ' + JSON.stringify(v));
    await page.click('#modal-body [data-pref="lang"][data-val="en"]');
    await page.waitForTimeout(150);
    check(await page.evaluate(() => P.lang === 'en' && P.langAuto === false), 'I50 fixed language did not switch device language off');
    await page.click('#modal-body [data-xlang]');
    await page.waitForTimeout(150);
    check(await page.evaluate(() => P.lang === 'de' && P.langAuto === true && document.documentElement.lang === 'de'), 'I50 device language did not switch back to de');
    await ctx.close();
  }

  // I50: unsupported device language falls back to English
  {
    const { ctx, page } = await open(browser, 'fr-FR');
    check(await page.evaluate(() => P.lang === 'en'), 'I50 fr device should fall back to en');
    await ctx.close();
  }

  await browser.close();
  if (problems.length) { console.log('SETTINGS FAIL\n' + problems.join('\n')); process.exit(1); }
  console.log('SETTINGS OK');
})();
