// App Store screenshots 2796x1290 (6.7"/6.9" landscape): games mid-play with a caption in the side margin.
// Usage: node shots.mjs <web dir> <out dir> [en|de]
import { createRequire } from 'module';
import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = path.resolve(process.argv[2]), out = process.argv[3], lang = process.argv[4] || 'en';
const C = {
  en: { menu: ['14 games for two', 'Made for iPhone Duo. Unfold it, lay it flat, sit face to face.'],
    hockey: ['Air Hockey', 'Both play at the same time. The fold is the center line.'],
    chess: ['Chess', 'Full rules, chess clock, draw offer. Every piece faces its player.'],
    sea: ['Sea Battle', 'Fold the Duo a little: the fold hides your fleet.'],
    backgammon: ['Backgammon', 'Dice, doubling cube, gammons. Undo your own moves.'],
    reversi: ['Reversi', 'Your half, my half: the fold runs right down the middle.'],
    mill: ['Mill', 'Classic board games, drawn for the big unfolded screen.'],
    four: ['Four in a Row', 'Touch a column, lift your finger, watch it drop.'],
    mancala: ['Mancala', 'No accounts, no internet, no ads. Just the two of you.'],
    uttt: ['Super Tic-Tac-Toe', 'Nine boards in one. Your move decides where the other must play.'] },
  de: { menu: ['14 Spiele für zwei', 'Gemacht für das iPhone Duo. Aufklappen, flach hinlegen, gegenüber sitzen.'],
    hockey: ['Air Hockey', 'Beide spielen gleichzeitig. Die Falz ist die Mittellinie.'],
    chess: ['Schach', 'Alle Regeln, Schachuhr, Remis-Angebot. Jede Figur schaut zu ihrem Spieler.'],
    sea: ['Schiffe versenken', 'Klapp das Duo leicht an: Die Falz verdeckt deine Flotte.'],
    backgammon: ['Backgammon', 'Würfel, Verdopplungswürfel, Gammon. Eigene Züge zurücknehmen.'],
    reversi: ['Reversi', 'Deine Hälfte, meine Hälfte: Die Falz läuft genau durch die Mitte.'],
    mill: ['Mühle', 'Klassische Brettspiele, gezeichnet für den großen aufgeklappten Bildschirm.'],
    four: ['Vier in einer Reihe', 'Spalte berühren, Finger heben, Stein fällt.'],
    mancala: ['Mancala', 'Kein Konto, kein Internet, keine Werbung. Nur ihr zwei.'],
    uttt: ['Super-Tic-Tac-Toe', 'Neun Bretter in einem. Dein Zug bestimmt, wo der andere spielen muss.'] }
}[lang];
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1398, height: 645 }, deviceScaleFactor: 2 });
await pg.addInitScript(lang => {
  if (!localStorage.getItem('twotable-cfg')) localStorage.setItem('twotable-cfg', JSON.stringify({ lang, intro: 1, names: ['Mia', 'Leo'], music: 0, sound: 0 }));
  if (!localStorage.getItem('twotable-stats')) localStorage.setItem('twotable-stats', JSON.stringify({ g: { chess: { w: [4, 3], n: 8, fast: 412, long: 1630, streak: [0, 2] }, hockey: { w: [6, 7], n: 13, fast: 95, long: 300, streak: [1, 1] }, backgammon: { w: [3, 1], n: 4, fast: 600, long: 1500, streak: [0, 3] }, four: { w: [9, 8], n: 18, fast: 40, long: 400, streak: [1, 1] }, sea: { w: [2, 2], n: 4, fast: 300, long: 900, streak: [0, 1] } }, hist: [], ach: { first: 1, streak3: 1, quick: 1 }, played: 47 }));
}, lang);
await pg.goto('file://' + dir + '/index.html'); await pg.waitForTimeout(400);
await pg.evaluate(() => { window.tt.fast = true; Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); });
async function caption(k) {
  await pg.evaluate(c => {
    let el = document.getElementById('cap');
    if (!el) { el = document.createElement('div'); el.id = 'cap'; document.body.appendChild(el); }
    el.style.cssText = 'position:fixed;left:0;top:0;bottom:0;width:236px;display:flex;flex-direction:column;justify-content:center;padding:0 22px;box-sizing:border-box;background:linear-gradient(90deg,rgba(8,20,14,0.92),rgba(8,20,14,0.75));color:#fff;font-family:-apple-system,Segoe UI,Roboto,sans-serif;z-index:5';
    el.innerHTML = '<div style="font-size:29px;font-weight:800;line-height:1.1;margin-bottom:14px">' + c[0] + '</div><div style="font-size:19px;line-height:1.35;opacity:.88">' + c[1] + '</div><div style="margin-top:22px;font-size:14px;letter-spacing:.08em;opacity:.6">TWO AT THE TABLE</div>';
  }, C[k]);
}
async function play(id, n, name) {
  await pg.evaluate(id => window.tt.open(id), id);
  for (let i = 0; i < n; i++) {
    await pg.evaluate(id => { const g = window.tt.game(); if (window.tt.result() || (g.busy && g.busy())) return; const l = g.legal(); if (!l.length) return; const m = id === 'halma' ? g.auto() : l[Math.floor(Math.random() * l.length)]; g.playMove(m); }, id);
    await pg.waitForTimeout(id === 'four' ? 150 : 20);
  }
  await pg.waitForTimeout(600);
  await pg.evaluate(() => window.tt.quiet()); await pg.waitForTimeout(100);
  await caption(id);
  await pg.screenshot({ path: `${out}/${name}.png` });
}
await caption('menu'); await pg.waitForTimeout(200); await pg.screenshot({ path: `${out}/01-menu.png` });
await pg.evaluate(() => window.tt.open('hockey')); await pg.waitForTimeout(900);
await pg.mouse.move(1398 - 700 / 2, 322); await pg.mouse.down(); await pg.mouse.move(980, 300, { steps: 3 }); await pg.mouse.up();
await pg.waitForTimeout(250); await caption('hockey'); await pg.screenshot({ path: `${out}/02-hockey.png` });
await play('chess', 16, '03-chess');
await play('sea', 40, '04-sea');
await play('backgammon', 11, '05-backgammon');
await play('reversi', 18, '06-reversi');
await play('mill', 16, '07-mill');
await play('four', 12, '08-four');
await play('mancala', 9, '09-mancala');
await play('uttt', 14, '10-uttt');
await b.close();
