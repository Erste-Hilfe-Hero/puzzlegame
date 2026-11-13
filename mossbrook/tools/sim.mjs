// Greedy bot over generated levels: estimates win rate without +5 cards/jokers.
import fs from 'fs';
const src = fs.readFileSync(new URL('../web/game.js', import.meta.url), 'utf8');
const start = src.indexOf('function rowsToCards'), end = src.indexOf('// ---------- game ----------');
const mod = new Function(src.slice(src.indexOf('function mulberry'), src.indexOf('function fmtTime')) + src.slice(start, end) + 'return {genLevel, LAYOUTS};')();
let wins = 0, list = [], N = +(process.argv[2] || 200), byTier = {};
for (let n = 1; n <= N; n++) {
  const L = mod.genLevel(n), cards = L.cards, stock = L.stock.slice();
  const gone = new Set(); let top = stock.shift().v;
  const up = c => !gone.has(c.id) && c.cov.every(i => gone.has(i));
  const fit = c => { const d = (c.v - top + 13) % 13; return d === 1 || d === 12; };
  for (;;) {
    const p = cards.filter(c => up(c) && fit(c));
    if (p.length) { // prefer cards that uncover more
      p.sort((a, b) => b.row - a.row); const c = p[0]; gone.add(c.id); top = c.v; continue; }
    if (!stock.length) break; top = stock.shift().v;
  }
  const won = gone.size === cards.length; if (won) wins++; if (n <= 12) list.push(n + ":" + (won ? "W" : "L" + (cards.length - gone.size)));
  const k = Math.floor((n - 1) / 25); byTier[k] = (byTier[k] || 0) + (won ? 1 : 0);
  if (L.cards.some(c => c.v === undefined)) { console.log('UNSET value level', n); process.exit(1); }
}
console.log(list.join(" ")); console.log('greedy win rate', (wins / N * 100).toFixed(1) + '%', 'per 25 levels:', JSON.stringify(byTier));
