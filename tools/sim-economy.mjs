// Economy simulation (plan-500 D5, D25, D26, D27, D48, D49) and first-session bot (F23, F24, F50 proxy).
// Run: node tools/sim-economy.mjs [--md]   (--md prints the markdown tables used in docs/economy.md)
//
// Part 1 plays the first 10 minutes with the real game.js in a vm (tools/vm-game.mjs), one action at a time:
// tap a generator 3 s, merge 2 s, deliver 2 s, island task 4 s, plus 45 s for the welcome text and tutorial reading.
// Part 2 is a day-by-day model from DATA and DATA.x for three profiles. Assumptions are printed with the tables.
import { boot, T0 } from './vm-game.mjs';

const MD = process.argv.includes('--md');
const out = [];
const log = s => out.push(s);

// ---------- part 1: first session bot ----------
function firstSession(seed) {
  const g = boot(null, { seed });
  const S = g.S, run = g.run;
  let t = 45; // welcome window and tutorial reading
  const at = s => g.setT(T0 + s * 1000);
  const r = { seed, deliver1: null, task1: null, lvl2: null, lvl3: null, empty: null, hang: false, energy10: 0, level10: 1 };
  let idle = 0;
  while (t < 600) {
    at(t);
    const lvl = S().level;
    let cost = 0;
    const k = S().orders.findIndex(o => g.G.findItems(o));
    if (k >= 0) { g.G.deliver(k); cost = 2; if (r.deliver1 === null) r.deliver1 = t; }
    if (!cost && S().zone < 6) {
      const z = run('DATA.zones[S.zone]');
      const tk = z.tasks.findIndex((_, q) => !S().tasksDone.includes(q));
      if (tk >= 0 && S().coins >= run(`taskCost(S.zone, ${tk})`)) {
        g.G.doTask(tk); run('closeModal()'); cost = 4; if (r.task1 === null) r.task1 = t;
      }
    }
    if (!cost) {
      const ch = S().board.findIndex(c => c && c.chest);
      if (ch >= 0) { g.G.openChest(ch); cost = 2; }
    }
    if (!cost) {
      // merge a pair, but keep items an order asks for at their level
      const pair = run(`(() => { const keep = wantedCells(), first = {};
        for (let i = 0; i < S.board.length; i++) { const c = S.board[i]; if (!c || !c.c || c.l >= MAX_L || keep.has(i)) continue;
          const k = c.c + c.l; if (first[k] !== undefined) return [i, first[k]]; first[k] = i; } return null; })()`);
      if (pair) { g.G.drop(pair[0], pair[1]); cost = 2; }
    }
    if (!cost) {
      run('tickEnergy()');
      if (S().energy >= 1) {
        const need = new Set(S().orders.flatMap(o => o.need.map(x => x.c)));
        let gi = S().board.findIndex(c => c && c.gen && need.has(c.gen));
        if (gi < 0) gi = S().board.findIndex(c => c && c.gen);
        const free = S().board.some(c => c === null);
        if (!free) { // sell the lowest item
          let lo = -1; S().board.forEach((c, i) => { if (c && c.c && (lo < 0 || c.l < S().board[lo].l)) lo = i; });
          run(`selected = ${lo}; sellArm = ${lo}; sell()`); cost = 2;
        } else { g.G.spawn(gi); cost = 3; }
      } else {
        if (r.empty === null) r.empty = t;
        cost = 5;
      }
    }
    if (S().level >= 2 && lvl < 2 && r.lvl2 === null) r.lvl2 = t;
    if (S().level >= 3 && lvl < 3 && r.lvl3 === null) r.lvl3 = t;
    idle = cost === 5 ? idle + 5 : 0;
    if (idle > 240) { r.hang = true; break; }
    t += cost;
  }
  at(600); run('tickEnergy()');
  r.energy10 = S().energy; r.level10 = S().level; r.tut = S().tut;
  return r;
}

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const fs1 = SEEDS.map(firstSession);
const avg = k => { const v = fs1.map(r => r[k]).filter(x => x !== null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
const mmss = s => (s === null ? '-' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
log('## First session bot (F23, F24), 10 seeds\n');
log('| seed | 1st delivery | 1st task | level 2 | level 3 | energy empty | energy at 10:00 | level at 10:00 |');
log('|---|---|---|---|---|---|---|---|');
fs1.forEach(r => log(`| ${r.seed} | ${mmss(r.deliver1)} | ${mmss(r.task1)} | ${mmss(r.lvl2)} | ${mmss(r.lvl3)} | ${r.empty === null ? 'never' : mmss(r.empty)} | ${r.energy10} | ${r.level10} |`));
log(`| avg | ${mmss(avg('deliver1'))} | ${mmss(avg('task1'))} | ${mmss(avg('lvl2'))} | ${mmss(avg('lvl3'))} | ${fs1.filter(r => r.empty !== null).length}/10 empty | ${avg('energy10')} | ${avg('level10')} |`);
log(`\nPlaytest proxy (F50): first delivery ${fs1.filter(r => r.deliver1 !== null).length}/10, first task ${fs1.filter(r => r.task1 !== null).length}/10, hangs ${fs1.filter(r => r.hang).length}/10.\n`);

// ---------- part 2: day model ----------
const g0 = boot(null, { seed: 99 });
const DATA = g0.run('DATA'), X = g0.run('X');
const PERKS = DATA.gemShop.filter(p => p.kind === 'perm').concat(X.gemShop.filter(p => p.kind === 'perm' && !p.req));
const PERK_IDS = ['bigBoard', 'orderSlot', 'golden', 'fountain'];

function dailyGemsExpected() {
  const kinds = [...new Set(DATA.dailyPool.map(x => x.k))];
  const pick = Math.min(3, kinds.length) / kinds.length;
  let gems = 0, coins = 0, chests = 0;
  for (const k of kinds) {
    const o = DATA.dailyPool.filter(x => x.k === k);
    o.forEach(x => { gems += pick * (x.reward.gems || 0) / o.length; coins += pick * (x.reward.coins || 0) / o.length; chests += pick * (x.reward.chest || 0) / o.length; });
  }
  return { gems, coins, chests };
}

// Profiles: energy per play day from regen and sessions (level-up refills come on top in the model).
const PROFILES = [
  { id: 'F2P casual', energy: 300, perks: 'buy', fountain: false, golden: false },
  { id: 'F2P active', energy: 720, perks: 'buy', fountain: false, golden: false },
  { id: 'Payer (Golden + Fountain)', energy: 720, perks: 'own', fountain: true, golden: true }
];

function simulate(p, days, sinkPolicy) {
  const st = { level: 1, xp: 0, coins: 0, gems: 10, zone: 0, task: 0, perm: {}, done: [], album: 0, cal: 0 };
  if (p.golden) st.perm.golden = 1;
  if (p.fountain) st.perm.fountain = 1;
  const src = {}; const add = (k, n) => { src[k] = (src[k] || 0) + n; st.gems += n; };
  const daily = dailyGemsExpected();
  const byDay = [];
  let zone6Day = null, perksDay = null, coinsAfter = [];
  for (let d = 1; d <= days; d++) {
    const dayGemsStart = { ...src };
    // energy per day: regen doubles with the fountain, 50 more max adds one more refill's worth per day
    let energy = p.energy * (st.perm.fountain ? (p.energy >= 720 ? 2 : 1.6) : 1); // casual players miss some regen ticks
    let spent = 0, coinsDay = 0;
    while (spent < energy) {
      const [lo, hi] = X.orderLevel(st.level);
      const l = Math.round((lo + hi) / 2);
      const cost = Math.pow(2, st.perm.golden && l >= 1 ? l - 1 : l);
      const two = st.level >= X.twoItemLevel ? X.twoItemChance : 0;
      const bonus = 1 + two * (X.twoItemBonus - 1);
      const c = X.orderCoins(l) * bonus, x = X.orderXp(l) * bonus;
      spent += cost; st.coins += c; coinsDay += c; st.xp += x;
      while (st.xp >= DATA.xpForLevel(st.level)) {
        st.xp -= DATA.xpForLevel(st.level); st.level++;
        add('level', X.levelUpGems(st.level));
        energy += 0.6 * (DATA.energyMax + (st.perm.fountain ? 50 : 0)); // level-up refill, player is rarely empty
        if (st.level >= 10 + 4 * st.album && st.album < 6) { st.album++; add('album', DATA.albumGems); } // a chain completes every ~4 levels after 10
      }
      // island tasks
      while (st.zone < DATA.zones.length) {
        const z = DATA.zones[st.zone], tc = z.tasks[st.task].cost * (X.taskCostMul[st.zone] || 1);
        if (st.coins < tc) break;
        st.coins -= tc; st.task++; st.xp += 10;
        if (st.task >= z.tasks.length) { add('places', z.bonusGems); st.done.push(d); st.zone++; st.task = 0; if (st.zone === DATA.zones.length) zone6Day = d; }
      }
    }
    // daily tasks, all-done bonus (active players), calendar
    add('daily tasks', daily.gems);
    st.coins += daily.coins;
    if (p.energy >= 720) add('all-3 bonus', DATA.dailyAllBonus.gems);
    add('calendar', DATA.calendar[(d - 1) % 7].gems || 0);
    // perks: F2P buys the cheapest missing perk when affordable
    if (p.perks === 'buy') {
      for (const id of PERK_IDS.slice().sort((a, b) => PERKS.find(x => x.id === a).cost - PERKS.find(x => x.id === b).cost)) {
        const pk = PERKS.find(x => x.id === id);
        if (!st.perm[id] && st.gems >= pk.cost) { st.gems -= pk.cost; st.perm[id] = d; }
      }
      if (perksDay === null && PERK_IDS.every(id => st.perm[id])) perksDay = d;
    }
    // D49 sink policy: above X.sinkCoins the player buys coin chests down to the threshold
    if (sinkPolicy && st.zone >= DATA.zones.length) {
      const chest = X.coinShop.find(c => c.id === 'coinChest').coins;
      while (st.coins - chest >= X.sinkCoins) st.coins -= chest;
    }
    if (zone6Day !== null) coinsAfter.push(st.coins);
    const gemsToday = Object.keys(src).reduce((a, k) => a + (src[k] - (dayGemsStart[k] || 0)), 0);
    byDay.push({ d, level: st.level, coins: Math.round(st.coins), gems: Math.round(st.gems), gemsToday, coinsDay: Math.round(coinsDay), zone: st.zone, src: { ...src }, energy: Math.round(energy) });
  }
  return { byDay, done: st.done, zone6Day, perksDay, src, coinsAfter, perm: st.perm };
}

const R = PROFILES.map(p => ({ p, r: simulate(p, 120, true), raw: simulate(p, 120, false) }));
log('## Days until each place is restored (D5, D25)\n');
log('| profile | energy/day | place 1 | place 2 | place 3 | place 4 | place 5 | place 6 | level day 30 |');
log('|---|---|---|---|---|---|---|---|---|');
R.forEach(({ p, r }) => log(`| ${p.id} | ${p.energy}${p.fountain ? ' x2 regen' : ''} | ${[0, 1, 2, 3, 4, 5].map(k => r.done[k] || '>120').join(' | ')} | ${r.byDay[29].level} |`));
const coin30 = R.map(({ r }) => r.byDay.slice(0, 7).reduce((a, x) => a + x.coinsDay, 0) / 7);
log(`\nCoins per play day, first week: ${R.map((x, k) => `${x.p.id} ${Math.round(coin30[k])}`).join(', ')}. Payer/F2P casual = ${(coin30[2] / coin30[0]).toFixed(1)}x, payer/F2P active = ${(coin30[2] / coin30[1]).toFixed(1)}x (D25).\n`);

log('## Gem sources (D27), F2P active, cumulative gems by source\n');
const act = R[1].r;
const keys = [...new Set(act.byDay.flatMap(x => Object.keys(x.src)))];
log(`| day | ${keys.join(' | ')} | earned that day |`);
log(`|---|${keys.map(() => '---').join('|')}|---|`);
[1, 7, 30, 45].forEach(d => { const x = act.byDay[d - 1]; log(`| ${d} | ${keys.map(k => Math.round(x.src[k] || 0)).join(' | ')} | ${Math.round(x.gemsToday)} |`); });
log(`\nNot in the model: x-live events, streak milestones, season track, pass. Gift chests count as items, not gems.\n`);

log('## Targets (D26, D48, D49)\n');
const casual = R[0].r;
const gemAvg = (r, a = 0) => Math.round(r.byDay.slice(a, 30).reduce((s, x) => s + x.gemsToday, 0) / (30 - a));
const rows = [
  ['D26 F2P owns all 4 perks (1,550 gems)', '<= day 45', `casual day ${casual.perksDay || '>120'}, active day ${act.perksDay || '>120'}`, (act.perksDay || 999) <= 45],
  ['D48 coins per hour F2P at 30 energy/h', '~120', `${Math.round(R[0].r.byDay[0].coinsDay / R[0].r.byDay[0].energy * 30)} (day 1), ${Math.round(R[0].r.byDay[29].coinsDay / R[0].r.byDay[29].energy * 30)} (day 30)`, (() => { const v = R[0].r.byDay[0].coinsDay / R[0].r.byDay[0].energy * 30; return v >= 90 && v <= 150; })()],
  ['D48 gems per day F2P, days 1-30', '15-25', `casual ${gemAvg(casual)}, active ${gemAvg(act)} (incl. one-off place and album gems)`, gemAvg(casual) <= 25 && gemAvg(act) <= 25],
  ['D48 gems per day F2P, days 8-30 (steady)', '15-25', `casual ${gemAvg(casual, 7)}, active ${gemAvg(act, 7)}`, gemAvg(casual, 7) >= 15 && gemAvg(act, 7) <= 25],
  ['D48 gem stock after 30 days', '< 400', `casual ${casual.byDay[29].gems}, active ${act.byDay[29].gems} (after perk buys)`, act.byDay[29].gems < 400],
  ['D49 coin stock 60 days after place 6, with sink', '< 20,000', R.map(({ p, r }) => `${p.id}: ${r.zone6Day ? Math.round(Math.max(...r.coinsAfter.slice(0, 60))) : 'place 6 not done'}`).join('; '), R.every(({ r }) => !r.zone6Day || Math.max(...r.coinsAfter.slice(0, 60)) < 20000)],
  ['D49 same without sink', 'info', R.map(({ p, raw }) => `${p.id}: ${raw.zone6Day ? Math.round(raw.coinsAfter[Math.min(59, raw.coinsAfter.length - 1)]) : '-'}`).join('; '), true]
];
log('| check | target | result | ok |');
log('|---|---|---|---|');
rows.forEach(x => log(`| ${x[0]} | ${x[1]} | ${x[2]} | ${x[3] ? 'yes' : 'NO'} |`));
log(`\nModel: order level = middle of X.orderLevel(level), Golden makes level-1 items for half the energy, two-item bonus as expected value, level-up refill counted as 60 % of max energy, album chain every 4 levels from level 10, all-3 bonus only for active players. Sink threshold X.sinkCoins = ${X.sinkCoins}.`);

console.log(out.join('\n'));
if (!MD) {
  const bad = rows.filter(x => !x[3]).map(x => x[0]);
  if (bad.length) console.log('\nTargets missed: ' + bad.join('; '));
}
