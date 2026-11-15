// Smoke test: empty state (pre-release), list rendering with a test-only fixture, platform switch, search, favorites, language.
// Usage: node cheats/tools/test.mjs [webdir] [screenshotdir]
import { createRequire } from 'module';
import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = path.resolve(process.argv[2] || 'cheats/web'), shots = process.argv[3];
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: shots ? 2 : 1, locale: 'de-DE' });
const errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.route('**/cheats.json*', r => r.abort());
await pg.goto('file://' + dir + '/index.html'); await pg.waitForTimeout(300);
const shot = n => shots && pg.screenshot({ path: `${shots}/${n}.png` });
const fail = m => { console.log('FAIL', m); process.exitCode = 1; };
const shipped = await pg.evaluate(() => window.CB_DATA.cheats.filter(c => c.verified).length);
console.log('shipped confirmed cheats', shipped);
if (!(await pg.textContent('h1')).length) fail('title');
if (!(await pg.textContent('.empty b')).includes('Hier erscheinen')) fail('empty state');
await shot('01-start-leer');
// Test-only fixture: placeholder entries to exercise the list UI. Never shipped.
await pg.evaluate(() => window.cb.setData({ version: 1, updated: 'TEST', release: '2026-11-19T00:00:00-05:00', platforms: ['ps5', 'xbox'], cheats: [
  { id: 't1', cat: 'health', verified: true, name: { de: 'TEST Eintrag A', en: 'TEST entry A' }, effect: { de: 'Platzhalter für den UI-Test', en: 'UI test placeholder' }, input: { ps5: ['up', 'down', 'x', 'o', 'L1', 'R2'], xbox: ['up', 'down', 'x', 'o', 'L1', 'R2'], phone: '1-000-000-0000' } },
  { id: 't2', cat: 'vehicles', verified: true, name: { de: 'TEST Eintrag B', en: 'TEST entry B' }, effect: { de: 'Platzhalter', en: 'Placeholder' }, input: { ps5: ['t', 's', 'left', 'right'], xbox: ['t', 's', 'left', 'right'] } },
  { id: 't3', cat: 'fun', verified: false, name: { de: 'Gerücht', en: 'Rumor' }, effect: 'x', input: {} }
] }));
if ((await pg.$$('.cheat')).length !== 2) fail('unverified must be hidden');
await shot('02-liste-ps5');
if ((await pg.textContent('.cheat .k')).trim() !== '↑') fail('glyph');
await pg.click('[data-plat="xbox"]');
if (!(await pg.textContent('.cheat')).includes('LB')) fail('xbox glyphs');
await shot('03-liste-xbox');
await pg.fill('#q', 'eintrag b'); if ((await pg.$$('.cheat')).length !== 1) fail('search');
await pg.fill('#q', ''); await pg.click('[data-cat="vehicles"]'); if ((await pg.$$('.cheat')).length !== 1) fail('category');
await pg.click('[data-cat="all"]');
await pg.click('[data-fav="t1"]'); await pg.click('[data-tab="1"]');
if ((await pg.$$('.cheat')).length !== 1) fail('favs');
await pg.click('[data-tab="2"]'); await shot('04-infos');
await pg.click('[data-lang="en"]'); if (!(await pg.textContent('.tabs')).includes('Favorites')) fail('lang');
await pg.click('[data-tab="0"]'); await shot('05-en');
if (errs.length) fail('errors ' + errs.join(' | '));
console.log(process.exitCode ? 'FAILED' : 'OK');
await b.close();
