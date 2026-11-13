// Community end-to-end: starts the server locally, two players post, vote, report and block through the real UI.
// Usage: node kaese/tools/comm.mjs [screenshotdir]
import { createRequire } from 'module';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const shots = process.argv[2], PORT = 8899;
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'kl-'));
const srv = spawn('node', ['kaese/server/main.mjs'], { env: { ...process.env, PORT, DATA_DIR: data, WEB_DIR: path.resolve('kaese/web') }, stdio: 'inherit' });
await new Promise(r => setTimeout(r, 800));
const fail = m => { console.log('FAIL', m); process.exitCode = 1; };
const b = await chromium.launch();
const mk = async () => { const p = await (await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: shots ? 3 : 1, locale: 'de-DE' })).newPage(); p.on('pageerror', e => fail(String(e))); await p.goto(`http://127.0.0.1:${PORT}/kaese/`); return p; };
try {
  const A = await mk(), B = await mk();
  await A.click('[data-tab="comm"]'); await A.waitForSelector('text=Noch keine Sprüche');
  await A.click('[data-cpost="1"]'); await A.waitForSelector('[data-cagree="1"]');
  if (shots) await A.screenshot({ path: shots + '/c1-terms.png' });
  await A.click('[data-cagree="1"]');
  await A.fill('#cp', 'Du bist eine Schlampe'); await A.click('[data-csend="1"]'); await A.waitForTimeout(300);
  if (!(await A.textContent('#cperr')).includes('nicht erlaubt')) fail('filter message');
  await A.fill('#cp', 'Bist du ein Leuchtturm? Ich finde nur noch zu dir.'); await A.click('[data-csend="1"]');
  await A.waitForSelector('.comm');
  await A.click('[data-cpost="1"]'); await A.fill('#cp', 'Ich hab Käse dabei, du bringst das Lächeln mit?'); await A.click('[data-csend="1"]');
  await A.waitForTimeout(400);
  if ((await A.$$('.comm')).length !== 2) fail('A sees 2 lines');
  await B.click('[data-tab="comm"]'); await B.waitForSelector('.comm');
  const first = await B.$$eval('.comm p', ps => ps.map(p => p.textContent));
  await B.locator('.comm').first().locator('[data-vote$=":1"]').click(); await B.waitForTimeout(400);
  await B.click('[data-csort="new"]'); await B.click('[data-csort="top"]'); await B.waitForSelector('.comm');
  const top = await B.$$eval('.comm', cs => cs.map(c => [c.querySelector('p').textContent, c.querySelector('.score').textContent]));
  if (top[0][1] !== '1') fail('vote counted ' + JSON.stringify(top));
  if (shots) await B.screenshot({ path: shots + '/c2-list.png' });
  await B.locator('.comm [data-cmenu]').first().click(); await B.waitForSelector('[data-creport]');
  if (shots) await B.screenshot({ path: shots + '/c3-report.png' });
  await B.click('[data-creport$=":spam"]'); await B.waitForTimeout(300);
  if ((await B.$$('.comm')).length !== 1) fail('report hides');
  await B.locator('.comm [data-cmenu]').first().click(); await B.click('[data-cblock]'); await B.waitForTimeout(300);
  if ((await B.$$('.comm')).length !== 0) fail('block hides');
  await B.reload(); await B.click('[data-tab="comm"]'); await B.waitForTimeout(600);
  if ((await B.$$('.comm')).length !== 0) fail('block persists');
  await A.locator('.comm [data-vote$=":1"]').first().click(); await A.waitForTimeout(200);
  if (!(await A.textContent('#toast')).includes('Eigene')) fail('own vote blocked');
  console.log('lines', first.length, 'top', JSON.stringify(top));
} catch (e) { fail(e.message); }
await b.close(); srv.kill();
console.log(process.exitCode ? 'FAILED' : 'OK');
