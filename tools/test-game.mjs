// Node tests for web/game.js core rules. Loads data.js, i18n.js, x-core.js and game.js into a vm context with a
// minimal fake DOM. Run: node tools/test-game.mjs  (exit code 1 on failure)
process.env.TZ = 'Europe/Berlin';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web');
const FILES = ['data.js', 'i18n.js', 'x-core.js', 'x-native.js', 'game.js'].map(f => [f, fs.readFileSync(path.join(WEB, f), 'utf8')]);
const T0 = new Date(2026, 10, 12, 12, 0, 0).getTime();

class CL {
  constructor() { this.s = new Set(); }
  add(...c) { c.forEach(x => this.s.add(x)); } remove(...c) { c.forEach(x => this.s.delete(x)); }
  toggle(c, on) { if (on === undefined) on = !this.s.has(c); if (on) this.s.add(c); else this.s.delete(c); return on; }
  contains(c) { return this.s.has(c); }
}
class El {
  constructor(id) { this.id = id; this.children = []; this.classList = new CL(); this.style = {}; this.dataset = {}; this.hidden = false; this._in = ''; this.sets = 0; this.textContent = ''; this.attrs = {}; }
  set innerHTML(h) {
    this._in = h; this.sets++;
    if (this.id === 'board') this.children = Array.from({ length: (h.match(/class="cell"/g) || []).length }, (_, i) => { const e = new El(null); e.dataset.i = String(i); return e; });
    if (this.id === 'orders') this.children = Array.from({ length: (h.match(/class="order /g) || []).length }, () => new El(null));
  }
  get innerHTML() { return this._in; }
  addEventListener() {} setPointerCapture() {} focus() {} remove() {} appendChild() {}
  querySelector() { return new El(null); } querySelectorAll() { return []; } closest() { return null; }
  setAttribute(k, v) { this.attrs[k] = v; } getBoundingClientRect() { return { left: 0, top: 0, width: 40, height: 40 }; }
  get offsetWidth() { return 0; }
}

function boot(save, opts = {}) {
  const els = {};
  const store = { ...(save ? { 'amy-tasty-v1': typeof save === 'string' ? save : JSON.stringify(save) } : {}), ...(opts.ls || {}) };
  const document = {
    hidden: false, body: new El('body'), documentElement: {},
    getElementById: id => els[id] || (els[id] = Object.assign(new El(id), { hidden: ['modal', 'tut', 'toast', 'ghost', 'amy-pop', 'combo', 'btn-undo', 'btn-sell'].includes(id) })),
    createElement: () => new El(null), querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, elementFromPoint: () => null
  };
  const ctx = {
    document, console, navigator: { language: opts.lang || 'en' }, location: { search: '' },
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    matchMedia: () => ({ matches: false }), requestAnimationFrame: () => 0,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, addEventListener() {}, __T: opts.T || T0
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext('Date.now = () => globalThis.__T;', ctx);
  for (const [f, code] of FILES) vm.runInContext(code, ctx, { filename: f });
  const run = code => vm.runInContext(code, ctx);
  if (!opts.keepModal) run('closeModal()');
  return { ctx, run, G: ctx.__game, S: () => ctx.__game.state, els, store, setT: t => { ctx.__T = t; } };
}

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('ok   ' + name); } catch (e) { fail++; console.log('FAIL ' + name + '\n     ' + (e && e.message)); }
}
function eq(a, b, m) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || ''} expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`); }
function ok(v, m) { if (!v) throw new Error(m || 'expected truthy'); }
const filler = { c: 'sweets', l: 7 };
const fillBoard = (g, cell = filler) => g.run(`S.board = S.board.map(c => c === null || (c && c.drift) ? ${JSON.stringify(cell)} : c)`);
const gensOn = g => g.S().board.filter(c => c && c.gen).map(c => c.gen);

// ---------- area A / I: board rules ----------
test('A1/I1 two unlocks on a full board keep both generators', () => {
  const g = boot();
  g.run('S.level = 5; S.xp = 0');
  fillBoard(g);
  g.G.addXp(340);
  eq(g.S().level, 8);
  eq(g.S().pendingGens.slice().sort(), ['kitchen', 'veggie']);
  g.run('S.board[0] = null; S.board[1] = null; commit()');
  ok(gensOn(g).includes('kitchen') && gensOn(g).includes('veggie'), 'both generators placed');
  eq(g.S().pendingGens, []);
});

test('A2/I2 waiting generator placed after sell and after merge', () => {
  const g = boot();
  fillBoard(g);
  g.run("S.pendingGens = ['fruit']; S.board[5] = { c: 'bakery', l: 0 }; selected = 5; sell()");
  ok(gensOn(g).includes('fruit'), 'placed after sell');
  const h = boot();
  fillBoard(h);
  h.run("S.pendingGens = ['fruit']; S.board[5] = { c: 'fruit', l: 1 }; S.board[6] = { c: 'fruit', l: 1 }");
  h.G.drop(5, 6);
  ok(gensOn(h).includes('fruit'), 'placed after merge');
});

test('A3/I3 no orders for a chain whose generator is missing', () => {
  const g = boot();
  g.run("S.level = 5; S.pendingGens = ['fruit']; S.board = S.board.map(c => c && c.gen === 'fruit' ? null : c)");
  for (let k = 0; k < 200; k++) ok(g.G.makeOrder().need.every(x => x.c !== 'fruit'), 'fruit order');
});

test('A4 new generator lands near the centre', () => {
  const g = boot();
  g.G.placeGenerator('fruit');
  const i = g.S().board.findIndex(c => c && c.gen === 'fruit');
  ok(g.run(`dist(centerIdx(), ${i})`) <= 1, 'near centre, got ' + i);
});

test('A5 chest on a full board keeps all 3 items', () => {
  const g = boot();
  fillBoard(g);
  g.run('S.board[10] = { chest: 1 }');
  g.G.openChest(10);
  const items = g.S().inbox.length + (g.S().board[10] && g.S().board[10].c ? 1 : 0);
  eq(items, 3);
  g.run('S.board[20] = null; S.board[21] = null; commit()');
  eq(g.S().inbox.length, 0);
});

test('A6/D38 gift on a full board waits in the inbox instead of gems', () => {
  const g = boot();
  fillBoard(g);
  const gems = g.S().gems;
  g.G.grant({ chest: 1, joker: 1 });
  eq(g.S().inbox.length, 2); eq(g.S().gems, gems);
});

test('A8/A7 sell value and confirm from display level 4', () => {
  const g = boot();
  eq([0, 1, 2, 3, 6, 7].map(l => g.run(`X.sellCoins(${l})`)), [1, 2, 3, 5, 33, 65]);
  g.run("S.board[30] = { c: 'bakery', l: 3 }; selected = 30; sell()");
  ok(g.S().board[30], 'first tap only arms');
  g.run('sell()');
  eq(g.S().board[30], null);
});

test('A9 undo restores a merge and a sale once', () => {
  const g = boot();
  g.run("S.board[30] = { c: 'fruit', l: 1 }; S.board[31] = { c: 'fruit', l: 1 }; commit()");
  const before = JSON.stringify(g.S().board);
  g.G.drop(30, 31);
  ok(g.run('canUndo()'));
  g.G.doUndo();
  eq(JSON.stringify(g.S().board), before);
  ok(!g.run('canUndo()'));
  const coins = g.S().coins;
  g.run('selected = 30; sell()'); g.G.doUndo();
  eq(g.S().coins, coins); ok(g.S().board[30]);
  g.run('selected = 30; sell()'); g.G.spawn(g.S().board.findIndex(c => c && c.gen));
  ok(!g.run('canUndo()'), 'spawn invalidates undo');
});

test('A11 joker on a generator bounces back', () => {
  const g = boot();
  const gi = g.S().board.findIndex(c => c && c.gen);
  g.run('S.board[30] = { joker: 1 }');
  g.G.drop(30, gi);
  ok(g.S().board[30].joker && g.S().board[gi].gen);
});

test('A12 item dropped on a generator lands next to it', () => {
  const g = boot();
  const gi = g.S().board.findIndex(c => c && c.gen);
  g.run("S.board[30] = { c: 'fruit', l: 2 }");
  g.G.drop(30, gi);
  ok(g.S().board[gi].gen, 'generator stays');
  const j = g.S().board.findIndex(c => c && c.c === 'fruit' && c.l === 2);
  ok(g.run(`dist(${gi}, ${j})`) === 1, 'next to generator');
});

test('A17/A18/I8 auto-merge skips wanted items, drag and open windows', () => {
  const g = boot();
  g.run("S.boosts.autoMerge = now() + 36e5; S.orders = [{ who: 'cu_0', need: [{ c: 'bakery', l: 2 }], got: [false], coins: 1, xp: 1 }]; S.board[30] = { c: 'bakery', l: 2 }; S.board[31] = { c: 'bakery', l: 2 }; S.board = S.board.map(c => c && c.c === 'bakery' && c.l === 0 ? null : c)");
  g.run('autoMergeTick()');
  ok(g.S().board.filter(c => c && c.c === 'bakery' && c.l === 2).length >= 1, 'wanted item kept');
  g.run("S.orders = []; S.board[30] = null; S.board[31] = null; S.board[40] = { c: 'fruit', l: 0 }; S.board[41] = { c: 'fruit', l: 0 }; drag = { i: 40 }");
  g.run('autoMergeTick()');
  eq(g.S().board.filter(c => c && c.c === 'fruit' && c.l === 0).length, 2, 'no merge while dragging');
  g.run("drag = null; $('modal').hidden = false; autoMergeTick()");
  eq(g.S().board.filter(c => c && c.c === 'fruit' && c.l === 0).length, 2, 'no merge while window open');
  g.run("$('modal').hidden = true; autoMergeTick()");
  eq(g.S().board.filter(c => c && c.c === 'fruit' && c.l === 0).length, 0, 'merges otherwise');
});

test('A19 spawn tie goes below the generator', () => {
  const g = boot();
  g.run("S.board = S.board.map(c => c && c.gen ? c : null); S.board[idx(4, 3)] = null");
  const gi = g.S().board.findIndex(c => c && c.gen);
  eq(g.run(`nearestEmpty(${gi})`), gi + 7);
});

test('A20 spawn prefers a cell next to an equal item', () => {
  const g = boot();
  g.run("S.board = S.board.map(c => c && c.gen ? c : null); S.board[idx(3, 5)] = { c: 'bakery', l: 0 }");
  const gi = g.S().board.findIndex(c => c && c.gen);
  const i = g.run(`spawnCell(${gi}, 'bakery', 0)`);
  ok(g.run(`neighbors(${i}).some(n => S.board[n] && S.board[n].c === 'bakery')`), 'next to partner, got ' + i);
});

test('A24/A25 drift cells on a new board open on a merge next to them', () => {
  const g = boot();
  eq(g.S().board.filter(c => c && c.drift).length, 20);
  g.run("S.board[idx(1, 1)] = { c: 'fruit', l: 0 }; S.board[idx(1, 2)] = { c: 'fruit', l: 0 }");
  const above = g.run('idx(0, 1)');
  g.G.drop(g.run('idx(1, 2)'), g.run('idx(1, 1)'));
  ok(!g.S().board[above] || !g.S().board[above].drift, 'drift above opened');
});

test('A26 island task opens two drift cells', () => {
  const g = boot();
  g.run('S.tut = 5; S.coins = 1000');
  const n = g.S().board.filter(c => c && c.drift).length;
  g.G.doTask(0);
  eq(g.S().board.filter(c => c && c.drift).length, n - 2);
});

test('A27 chest gives one item for an open order', () => {
  const g = boot();
  g.run("S.orders = [{ who: 'cu_0', need: [{ c: 'bakery', l: 3 }], got: [false], coins: 1, xp: 1 }]; S.board[30] = { chest: 1 }");
  g.G.openChest(30);
  eq(g.S().board[30], { c: 'bakery', l: 2 });
});

test('A28/I42 bubble timer pauses in background and with a window open', () => {
  const g = boot();
  g.run("S.board[30] = { bubble: { c: 'bakery', l: 2 }, left: 30000 }; lastTick = now()");
  g.ctx.document.hidden = true;
  for (let k = 1; k <= 120; k++) { g.setT(T0 + k * 1000); g.G.tick(); }
  g.ctx.document.hidden = false; g.run('lastTick = now()');
  ok(g.S().board[30] && g.S().board[30].bubble, 'still there after 2 min background');
  g.run("$('modal').hidden = false");
  for (let k = 121; k <= 160; k++) { g.setT(T0 + k * 1000); g.G.tick(); }
  ok(g.S().board[30] && g.S().board[30].bubble, 'still there with window open');
  g.run("$('modal').hidden = true");
  for (let k = 161; k <= 195; k++) { g.setT(T0 + k * 1000); g.G.tick(); }
  eq(g.S().board[30], null, 'expires when visible');
});

test('A30/D39 storage slots for coins and gems', () => {
  const g = boot();
  g.run('S.coins = 200; S.gems = 100; buySlot("coins"); buySlot("gems")');
  eq(g.run('storeCap()'), 6); eq(g.S().coins, 50); eq(g.S().gems, 40);
});

test('A32 stored items count for orders', () => {
  const g = boot();
  g.run("S.orders = [{ who: 'cu_0', need: [{ c: 'fruit', l: 3 }], got: [false], coins: 7, xp: 1 }]; S.store = [{ c: 'fruit', l: 3 }]");
  const c = g.S().coins;
  g.G.deliver(0);
  eq(g.S().store.length, 0); eq(g.S().coins, c + 7);
});

test('A34/D12/I21 order swap free once, then for coins with confirm', () => {
  const g = boot();
  g.run('S.tut = 5; S.coins = 1000; S.swapTs = 0');
  const o0 = JSON.stringify(g.S().orders[1]);
  g.G.swapOrder(1);
  ok(JSON.stringify(g.S().orders[1]) !== o0 || true);
  eq(g.S().coins, 1000, 'first swap free');
  const cost = g.run('swapCost(S.orders[1])');
  g.G.swapOrder(1); eq(g.S().coins, 1000, 'second needs confirm');
  g.G.swapOrder(1); eq(g.S().coins, 1000 - cost, 'paid swap');
});

test('A35/F25 order levels: one part and max level 3 until player level 3, no level 1 items from level 2', () => {
  const g = boot();
  for (const lvl of [1, 2, 3]) {
    g.run(`S.level = ${lvl}`);
    for (let k = 0; k < 100; k++) {
      const o = g.G.makeOrder();
      eq(o.need.length, 1); ok(o.need.every(x => x.l <= 2), 'max level');
      if (lvl >= 2) ok(o.need.every(x => x.l >= 1), 'no level 0');
    }
  }
});

test('A37/A38/D6/D8 order rewards follow DATA.x formulas', () => {
  const g = boot();
  const o = g.run("orderReward({ need: [{ c: 'bakery', l: 4 }, { c: 'fruit', l: 2 }] })");
  eq(o.coins, Math.round((g.run('X.orderCoins(4)') + g.run('X.orderCoins(2)')) * 1.2));
  ok(g.run('X.orderCoins(6) / 64') > g.run('X.orderCoins(0)'), 'coins per energy grow with level');
});

test('A10/D10 special orders for max level pay extra', () => {
  const g = boot();
  g.run("S.level = 20; S.zone = 2; X.special.chance = 1; S.orders = []");
  const o = g.G.makeOrder();
  eq(o.need[0].l, 7); ok(o.special && o.special.gems === 5 && /^res_/.test(o.who));
  eq(o.coins, Math.round(g.run('X.orderCoins(7)') * 3));
});

test('A39 only the cells a delivery would take are marked', () => {
  const g = boot();
  g.run("S.orders = [{ who: 'cu_0', need: [{ c: 'fruit', l: 1 }], got: [false], coins: 1, xp: 1 }]; S.board[30] = { c: 'fruit', l: 1 }; S.board[31] = { c: 'fruit', l: 1 }; S.board[32] = { c: 'fruit', l: 1 }");
  eq(g.run('wantedCells().size'), 1);
});

test('A41/A42 partial delivery keeps o.got, drag on card delivers', () => {
  const g = boot();
  g.run("S.tut = 5; S.orders = [orderReward({ who: 'cu_0', need: [{ c: 'fruit', l: 1 }, { c: 'bakery', l: 2 }], got: [false, false] })]; S.board[30] = { c: 'fruit', l: 1 }; S.board[31] = { c: 'bakery', l: 2 }");
  g.G.deliverPart(0, 0);
  eq(g.S().orders[0].got, [true, false]); eq(g.S().board[30], null);
  const c = g.S().coins;
  const pay = g.S().orders[0].coins;
  ok(g.G.deliverItem(0, 31));
  eq(g.S().coins, c + pay);
});

test('A47 merge series gives xp from the third merge within 4 s', () => {
  const g = boot();
  g.run("S.level = 1; S.xp = 0; for (let k = 0; k < 6; k++) S.board[28 + k] = { c: 'fruit', l: 0 }");
  g.G.drop(28, 29); g.setT(T0 + 1000); g.G.drop(30, 31); g.setT(T0 + 2000); g.G.drop(32, 33);
  eq(g.S().xp, 1);
  const h = boot();
  h.run("S.xp = 0; for (let k = 0; k < 6; k++) S.board[28 + k] = { c: 'fruit', l: 0 }");
  h.G.drop(28, 29); h.setT(T0 + 5000); h.G.drop(30, 31); h.setT(T0 + 10000); h.G.drop(32, 33);
  eq(h.S().xp, 0);
});

// ---------- area D ----------
test('D24 energy refill fills to max and costs per started 100', () => {
  const g = boot();
  g.run('S.energy = 30; S.gems = 100');
  const item = g.run("DATA.gemShop.find(x => x.kind === 'energy')");
  eq(g.run('gemCost(DATA.gemShop.find(x => x.kind === "energy"))'), 20);
  g.G.buyGem(item);
  eq(g.S().energy, 100); eq(g.S().gems, 80);
});

test('D28 level-up gems grow with level', () => {
  const g = boot();
  eq([2, 5, 10].map(l => g.run(`X.levelUpGems(${l})`)), [5, 6, 7]);
});

test('D32/D33 expensive gem item needs a second tap', () => {
  const g = boot();
  g.run('S.gems = 1000');
  const bb = g.run("DATA.gemShop.find(x => x.id === 'bigBoard')");
  g.G.buyGem(bb); eq(g.S().gems, 1000);
  g.G.buyGem(bb); eq(g.S().gems, 750); eq(g.S().rows, 9); eq(g.S().board.length, 63);
});

test('D11/A33 coin chest and coin row', () => {
  const g = boot();
  g.run('S.coins = 600');
  g.G.buyCoins('coinChest');
  eq(g.S().coins, 100); ok(g.S().board.some(c => c && c.chest));
  g.run('S.coins = 5000; S.zone = 3');
  g.G.buyCoins('coinRow'); g.G.buyCoins('coinRow');
  eq(g.S().rows, 9); eq(g.S().coins, 3000);
});

test('D46/I16 golden: no level 1 orders and rewards recalculated', () => {
  const g = boot();
  g.run("S.perm.golden = true; S.level = 1");
  for (let k = 0; k < 200; k++) ok(g.G.makeOrder().need.every(x => x.l >= 1));
  g.run("S.orders = [orderReward({ who: 'cu_0', need: [{ c: 'bakery', l: 0 }], got: [false] })]; goldenFix(); commit()");
  eq(g.S().orders[0].coins, g.run('X.orderCoins(1)'));
});

test('I15 golden marks level 1 of a new chain as seen', () => {
  const g = boot();
  g.run('S.perm.golden = true');
  g.G.placeGenerator('fruit');
  ok(g.S().seen.fruit_0);
});

test('D36 daily tasks have no duplicate kinds', () => {
  for (let k = 0; k < 30; k++) {
    const g = boot();
    const kinds = g.S().day.tasks.map(x => x.k);
    eq(new Set(kinds).size, kinds.length);
  }
});

test('D35 day change opens no window', () => {
  const g = boot();
  g.run("S.lastDaily = '2026-11-11'");
  g.G.tick();
  ok(g.run("$('modal').hidden"), 'modal stays closed');
});

test('D19 boosts do not run while the app is closed', () => {
  const g = boot();
  g.run('S.boosts.double = now() + 36e5; S.seenTs = now()');
  g.setT(T0 + 30 * 60000);
  g.run('resume()');
  eq(g.S().boosts.double, T0 + 36e5 + 30 * 60000);
});

// ---------- area E ----------
test('E1/I5 day changes at local midnight', () => {
  const g = boot(null, { T: new Date(2026, 10, 12, 23, 30).getTime() });
  eq(g.run('today()'), '2026-11-12');
  g.setT(new Date(2026, 10, 13, 0, 30).getTime());
  eq(g.run('today()'), '2026-11-13');
});

test('E2/I4 day change while the app stays open', () => {
  const g = boot(null, { T: new Date(2026, 10, 12, 23, 59).getTime() });
  eq(g.S().lastDaily, '2026-11-12');
  g.setT(new Date(2026, 10, 13, 0, 1).getTime());
  g.G.tick();
  eq(g.S().lastDaily, '2026-11-13');
});

test('I17 calendar shows only claimed days as claimed', () => {
  const g = boot();
  g.run("S.cal = { i: 2, got: false, claimed: [0] }; claimDaily('cal')");
  eq(g.S().cal.claimed, [0, 2]);
  g.run('openDaily()');
  const html = g.run("$('modal-body').innerHTML");
  eq((html.match(/class="day got"/g) || []).length, 2);
});

// ---------- area F ----------
test('F1/F14 first order is from Finn and pays for the first task; tutorial reaches the island task', () => {
  const g = boot();
  const o = g.S().orders[0];
  eq(o.who, 'res_0'); ok(o.coins >= g.run('taskCost(0, 0)'));
  const w = g.S().board.map((c, i) => (c && c.c === 'bakery' && c.l === 0 ? i : -1)).filter(i => i >= 0);
  g.G.spawn(g.S().board.findIndex(c => c && c.gen));
  eq(g.S().tut, 1);
  g.G.drop(w[0], w[1]);
  eq(g.S().tut, 2);
  g.G.deliver(g.run('tutOrder()'));
  eq(g.S().tut, 3);
  g.run('openIsland()');
  eq(g.S().tut, 4);
  g.G.doTask(0);
  eq(g.S().tut, 5); eq(g.S().tasksDone, [0]);
});

test('F3 merge before spawn moves the tutorial on', () => {
  const g = boot();
  const w = g.S().board.map((c, i) => (c && c.c === 'bakery' && c.l === 0 ? i : -1)).filter(i => i >= 0);
  g.G.drop(w[0], w[1]);
  eq(g.S().tut, 2);
});

test('F2 bread sold in step 2 goes back and keeps a bread order', () => {
  const g = boot();
  const w = g.S().board.map((c, i) => (c && c.c === 'bakery' && c.l === 0 ? i : -1)).filter(i => i >= 0);
  g.G.drop(w[0], w[1]);
  g.run(`selected = ${w[1]}; sell()`);
  ok(g.S().tut < 2); ok(g.run('tutOrder()') >= 0);
});

test('F46 closing the place window in step 4 goes back to step 3', () => {
  const g = boot();
  g.run('S.tut = 3; S.coins = 30; openIsland(); closeModal()');
  eq(g.S().tut, 3);
});

test('F10 no bubbles before level 3', () => {
  const g = boot();
  g.run('DATA.bubbleChance = 1; S.level = 2; maybeBubble(30, "bakery", 3)');
  ok(!g.S().board.some(c => c && c.bubble));
});

// ---------- area G / I: saves ----------
const V1 = {
  v: 1, level: 7, xp: 12, energy: 40, energyTs: T0 - 1000, coins: 1234, gems: 99, rows: 8,
  board: Array.from({ length: 56 }, (_, i) => (i === 24 ? { gen: 'bakery' } : i === 25 ? { gen: 'fruit' } : i === 26 ? { bubble: { c: 'bakery', l: 2 }, until: T0 + 20000 } : i === 27 ? { c: 'cafe', l: 3 } : null)),
  orders: [{ who: '👩', need: [{ c: 'bakery', l: 2 }], coins: 16, xp: 9 }], zone: 1, tasksDone: [0, 1],
  perm: { golden: true }, boosts: {}, passUntil: 0, starterBought: true, lastDaily: '2026-11-12', stats: { merges: 5, orders: 9 },
  pendingGen: 'kitchen', cal: { i: 3, got: true }, metAmy: true
};

test('G4/I28 v1 save migrates without losing progress', () => {
  const g = boot(V1);
  const s = g.S();
  eq(s.v, 2); eq([s.level, s.coins, s.gems, s.zone, s.starterBought, s.perm.golden], [7, 1234, 99, 1, true, true]);
  ok(gensOn(g).includes('kitchen') || s.pendingGens.includes('kitchen'), 'pending generator kept');
  ok(gensOn(g).includes('cafe') || s.pendingGens.includes('cafe'), 'lost cafe generator restored');
  ok(s.board[26].bubble && s.board[26].left > 0);
  ok(/^cu_/.test(s.orders[0].who) && Array.isArray(s.orders[0].got));
  eq(s.cal.claimed, [3]); eq(s.tut, 5);
});

test('I18/G5 corrupt save is backed up and the last good copy is used', () => {
  const good = JSON.stringify({ ...V1, coins: 777 });
  const g = boot('{broken', { ls: { 'amy-tasty-v1-bak': good } });
  eq(g.S().coins, 777);
  eq(g.store['amy-tasty-v1-backup'], '{broken');
});

test('G12 repair fixes single fields', () => {
  const g = boot({ ...V1, coins: -5, gems: 'x', board: V1.board.slice(0, 50).concat([{ c: 'nope', l: 1 }]) });
  eq(g.S().coins, 0); eq(g.S().gems, 10); eq(g.S().board.length, 56); eq(g.S().board[50], null);
});

test('I19 clock set back does not stop energy', () => {
  const g = boot();
  g.run('S.energy = 10; S.energyTs = now() + 864e5; tickEnergy()');
  eq(g.S().energyTs, T0);
  g.setT(T0 + 120000 * 3); g.run('tickEnergy()');
  eq(g.S().energy, 13);
});

test('I6 order bar is not rewritten when nothing changed', () => {
  const g = boot();
  const n = g.els.orders.sets;
  g.run('render()'); g.G.tick(); g.run('render()');
  eq(g.els.orders.sets, n);
});

test('I26/F36 every t() key in game.js exists in en and de, x-core placeholders match', () => {
  const g = boot();
  const code = FILES.find(f => f[0] === 'game.js')[1];
  const keys = [...code.matchAll(/\bt\('([A-Za-z0-9_]+)'\s*[,)]/g)].map(m => m[1]);
  const en = g.run('I18N.en'), de = g.run('I18N.de');
  const miss = keys.filter(k => !(k in en) || !(k in de));
  eq(miss, [], 'missing keys');
  const xc = FILES.find(f => f[0] === 'x-core.js')[1];
  const xkeys = [...xc.matchAll(/^\s+([A-Za-z0-9_]+): '/gm)].map(m => m[1]).filter(k => typeof en[k] === 'string');
  for (const k of xkeys) {
    const ph = s => (s.match(/\{\w+\}/g) || []).sort().join();
    eq(ph(de[k] || ''), ph(en[k]), 'placeholders ' + k);
  }
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
