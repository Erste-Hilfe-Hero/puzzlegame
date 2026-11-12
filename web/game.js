'use strict';
// Core game logic. Plan references (A1, D6, E1, F3, G4, I6 ...) point to plan-500/plan.md.
// Core tuning lives in DATA.x (web/x-core.js), content values in data.js.
const SAVE_KEY = 'amy-tasty-v1';
const SAVE_V = 2;
const MAX_L = 7;
const X = DATA.x;
const $ = id => document.getElementById(id);
const now = () => Date.now();
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
// E1/I5: calendar day in local time, not UTC.
const dayStr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => dayStr(new Date(now()));
const daysBetween = (a, b) => {
  const p = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
  return Math.round((p(b) - p(a)) / 864e5);
};

let S = null;
let selected = -1;

// ---------- prefs, texts, sound ----------
const PREFS_KEY = 'amy-tasty-prefs';
let P = { lang: (navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en', sound: true, hint: true, haptic: true };
try { Object.assign(P, JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')); } catch (e) { /* storage blocked */ }
function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(P)); } catch (e) { /* storage blocked */ } }

function t(k, v = {}) {
  const s = (I18N[P.lang] && I18N[P.lang][k]) || I18N.en[k] || k;
  return s.replace(/\{(\w+)\}/g, (m, x) => (v[x] !== undefined ? v[x] : m));
}
const DE = () => (P.lang === 'de' ? I18N.de : null);
const nm = (c, l) => (DE() ? DE().chains[c].names[l] : DATA.chains[c].names[l]);
const genNm = c => (DE() ? DE().chains[c].genName : DATA.chains[c].genName);
const chainNm = c => (DE() ? DE().chains[c].name : DATA.chains[c].name);
const taskNm = (z, k) => (DE() ? DE().tasks[z][k] : DATA.zones[z].tasks[k].name);
const pName = p => (DE() && DE().products[p.id] ? DE().products[p.id].name : p.name);
const pDesc = p => (DE() && DE().products[p.id] && DE().products[p.id].desc) || p.desc;
const pTag = s => (DE() && DE().tags[s]) || s;
// I46/F35: numbers in the player's language.
let fmtObj = null, fmtLang = '';
const fmt = n => {
  if (fmtLang !== P.lang) { fmtLang = P.lang; try { fmtObj = new Intl.NumberFormat(P.lang); } catch (e) { fmtObj = null; } }
  return fmtObj ? fmtObj.format(n) : String(n);
};

const src = k => (window.IMG && window.IMG[k]) || `img/${k}.png`;
const EM = { '🪙': 'ui_coin', '💎': 'ui_gem', '⚡': 'ui_energy', '⭐': 'ui_xp', '✅': 'ui_check', '🔨': 'ui_hammer', '🔒': 'ui_lock', '🏝️': 'ui_island', '📦': 'ui_store', '📖': 'ui_album', '🃏': 'joker', '🎁': 'chest' };
const EM_RE = new RegExp(Object.keys(EM).join('|'), 'g');
const emo = h => String(h).replace(EM_RE, m => `<img class="ic" src="${src(EM[m])}" alt="">`);

let AC = null;
function sfx(kind, lv = 0) {
  if (!P.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const notes = { spawn: [660], merge: [523, 784], deliver: [784, 1046, 1318], level: [523, 659, 784, 1046], error: [180], buy: [988, 1318] }[kind];
    const up = kind === 'merge' ? Math.pow(2, 2 * lv / 12) : 1; // A43: +2 semitones per level
    notes.forEach((f, k) => {
      const o = AC.createOscillator(), gn = AC.createGain(), at = AC.currentTime + k * 0.07;
      o.type = kind === 'error' ? 'square' : 'triangle';
      o.frequency.value = f * up;
      gn.gain.setValueAtTime(0.0001, at);
      gn.gain.exponentialRampToValueAtTime(0.18, at + 0.01);
      gn.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
      o.connect(gn).connect(AC.destination);
      o.start(at); o.stop(at + 0.18);
    });
  } catch (e) { /* audio unavailable */ }
}
// A44: short haptic feedback, switchable in settings.
function buzz(ms) { if (P.haptic && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* not allowed */ } } }

// ---------- state, save, migration ----------
function idx(r, c) { return r * DATA.cols + c; }
function rc(i) { return [Math.floor(i / DATA.cols), i % DATA.cols]; }
const centerIdx = () => idx(Math.floor((S.rows - 1) / 2), Math.floor(DATA.cols / 2));

// A24: border cells covered by driftwood on a fresh board.
function driftCells(rows, cols, count) {
  const out = [];
  for (let c = 0; c < cols; c++) out.push(idx(0, c), idx(rows - 1, c));
  for (let r = 1; out.length < count && r < rows / 2; r++) out.push(idx(r, 0), idx(r, cols - 1), idx(rows - 1 - r, 0), idx(rows - 1 - r, cols - 1));
  return out.slice(0, count);
}

function newState() {
  const s = {
    v: SAVE_V, level: 1, xp: 0, energy: DATA.energyStart, energyTs: now(), coins: 0, gems: 10,
    board: new Array(DATA.cols * DATA.rows).fill(null), rows: DATA.rows,
    orders: [], zone: 0, tasksDone: [],
    perm: {}, boosts: {}, passUntil: 0, starterBought: false, lastDaily: '', tut: 0, stats: { merges: 0, orders: 0 },
    pendingGens: [], inbox: [], store: [], storeExtra: 0, ui: {}, tips: {}, funnel: { start: now() }, swapTs: 0, seenTs: now()
  };
  s.board[idx(3, 3)] = { gen: 'bakery' };
  s.board[idx(2, 2)] = { c: 'bakery', l: 0 };
  s.board[idx(2, 4)] = { c: 'bakery', l: 0 };
  driftCells(DATA.rows, DATA.cols, X.driftCount).forEach((i, k) => { if (!s.board[i]) s.board[i] = { drift: { ...X.driftLoot[k % X.driftLoot.length] } }; });
  return s;
}

// G4: one migration per schema version, v -> v+1.
const MIGRATE = {
  1: s => {
    s.pendingGens = s.pendingGen ? [s.pendingGen] : [];
    delete s.pendingGen;
    s.inbox = [];
    if (s.cal) s.cal.claimed = s.cal.got && s.cal.i >= 0 ? [s.cal.i] : [];
    (s.board || []).forEach(c => { if (c && c.bubble) { c.left = Math.max(0, (c.until || 0) - now()); delete c.until; } });
    s.ui = { store: 1, album: 1 };
    if (s.tut === undefined) s.tut = 5;
    s.orders = (s.orders || []).map(o => ({ ...o, got: (o.need || []).map(() => false) }));
    s.v = 2;
    return s;
  }
};

function migrate(s) {
  if (!s || typeof s !== 'object' || !Array.isArray(s.board)) return null;
  if (s.v === undefined) s.v = 1;
  while (s.v < SAVE_V) {
    if (!MIGRATE[s.v]) return null;
    s = MIGRATE[s.v](s);
  }
  return s;
}

function validCell(c) {
  if (!c || typeof c !== 'object') return null;
  if (c.gen) return DATA.chains[c.gen] ? { gen: c.gen } : null;
  if (c.joker) return { joker: 1 };
  if (c.chest) return { chest: 1 };
  if (c.bubble) return DATA.chains[c.bubble.c] ? { bubble: { c: c.bubble.c, l: c.bubble.l }, left: Number.isFinite(c.left) ? c.left : 0 } : null;
  if (c.drift) return c.drift.coins > 0 || (DATA.chains[c.drift.c] && c.drift.l >= 0 && c.drift.l <= MAX_L) ? c : null;
  return DATA.chains[c.c] && Number.isInteger(c.l) && c.l >= 0 && c.l <= MAX_L ? { c: c.c, l: c.l } : null;
}

// G12: repair single fields instead of resetting the whole save.
function repair(s) {
  const d = newState();
  for (const k of Object.keys(d)) if (s[k] === undefined || s[k] === null) s[k] = d[k];
  for (const k of ['level', 'xp', 'energy', 'coins', 'gems', 'zone', 'rows', 'energyTs', 'storeExtra', 'swapTs', 'passUntil']) {
    if (!Number.isFinite(s[k]) || s[k] < 0) s[k] = d[k];
  }
  s.level = Math.max(1, Math.floor(s.level));
  s.rows = Math.max(DATA.rows, Math.floor(s.rows));
  const n = DATA.cols * s.rows;
  s.board = s.board.slice(0, n).map(validCell);
  while (s.board.length < n) s.board.push(null);
  const list = a => (Array.isArray(a) ? a : []);
  s.store = list(s.store).map(validCell).filter(Boolean);
  s.inbox = list(s.inbox).map(validCell).filter(Boolean);
  s.pendingGens = list(s.pendingGens).filter(k => DATA.chains[k]);
  s.tasksDone = list(s.tasksDone).filter(Number.isInteger);
  s.orders = list(s.orders).filter(o => o && Array.isArray(o.need) && o.need.length && o.need.every(x => x && DATA.chains[x.c] && Number.isInteger(x.l) && x.l >= 0 && x.l <= MAX_L));
  s.orders.forEach(o => {
    if (!Array.isArray(o.got) || o.got.length !== o.need.length) o.got = o.need.map(() => false);
    if (!/^(res|cu)_/.test(o.who)) o.who = DATA.customers[rnd(0, DATA.customers.length - 1)];
  });
  for (const k of ['perm', 'boosts', 'stats', 'ui', 'tips', 'funnel']) if (typeof s[k] !== 'object' || Array.isArray(s[k])) s[k] = d[k];
  // I1 victims: every unlocked generator must exist somewhere.
  const has = new Set(s.board.filter(c => c && c.gen).map(c => c.gen).concat(s.pendingGens));
  for (const [k, ch] of Object.entries(DATA.chains)) if (ch.unlock <= s.level && !has.has(k)) s.pendingGens.push(k);
  return s;
}

function parseSave(raw) {
  if (!raw) return null;
  try { return migrate(JSON.parse(raw)); } catch (e) { return null; }
}

function load() {
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { /* storage blocked */ }
  S = parseSave(raw);
  if (!S && raw) { try { localStorage.setItem(SAVE_KEY + '-backup', raw); } catch (e) { /* storage blocked */ } } // I18
  if (!S) { try { S = parseSave(localStorage.getItem(SAVE_KEY + '-bak')); } catch (e) { S = null; } } // G5
  if (!S) S = newState();
  repair(S);
  if (S.orders.length === 0) S.orders.push(firstOrder(!S.stats.orders));
}

function save() {
  try {
    const json = JSON.stringify(S);
    const old = localStorage.getItem(SAVE_KEY);
    if (old && old !== json) localStorage.setItem(SAVE_KEY + '-bak', old); // G5
    localStorage.setItem(SAVE_KEY, json);
  } catch (e) { /* storage blocked */ }
}

// D47: local economy log per day, source and sink.
function econ(kind, from, n) {
  if (!n) return;
  S.econ = S.econ || {};
  const d = today();
  const e = S.econ[d] = S.econ[d] || {};
  e[kind + ':' + from] = (e[kind + ':' + from] || 0) + n;
  const days = Object.keys(S.econ).sort();
  while (days.length > 14) delete S.econ[days.shift()];
}
function funnel(k) { S.funnel = S.funnel || {}; if (!S.funnel[k]) S.funnel[k] = now(); } // F27

// ---------- economy ----------
const passActive = () => S.passUntil > now();
const boostOn = k => (S.boosts[k] || 0) > now();
const energyMax = () => DATA.energyMax + (S.perm.fountain ? 50 : 0) + (passActive() ? DATA.pass.energyBonus : 0);
const regenMs = () => DATA.energyRegenSec * 1000 / (S.perm.fountain ? 2 : 1);
const storeCap = () => DATA.storeSlots + (S.storeExtra || 0);
const taskCost = (z, k) => Math.round(DATA.zones[z].tasks[k].cost * (X.taskCostMul[z] === undefined ? 1 : X.taskCostMul[z]));

function tickEnergy() {
  if (S.energyTs > now()) S.energyTs = now(); // I19/G13: clock set back
  const max = energyMax();
  if (S.energy >= max) { S.energyTs = now(); return; }
  const n = Math.floor((now() - S.energyTs) / regenMs());
  if (n > 0) {
    S.energy = Math.min(max, S.energy + n);
    S.energyTs += n * regenMs();
  }
}
const energyLeftMs = () => Math.max(0, regenMs() - (now() - S.energyTs));
const mmss = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

function addXp(x) {
  S.xp += x;
  while (S.xp >= DATA.xpForLevel(S.level)) {
    S.xp -= DATA.xpForLevel(S.level);
    S.level++;
    const g = X.levelUpGems(S.level); // D28
    S.gems += g; econ('gems', 'level', g);
    S.energy = Math.max(S.energy, energyMax());
    if (S.level === 2) funnel('lvl2');
    toast(t('levelUp', { n: S.level, g })); sfx('level'); setTimeout(() => { amySay('amyLevel'); fly($('lvl'), 'gems', '💎', 3); }, 400);
    for (const [key, ch] of Object.entries(DATA.chains)) {
      if (ch.unlock === S.level) placeGenerator(key);
    }
  }
}

// A1/A4: generators go near the board centre; a full board queues them in S.pendingGens.
function placeGenerator(key) {
  if (S.perm.golden) seen(key, 0); // I15
  const i = nearestEmpty(centerIdx());
  if (i < 0) { if (!S.pendingGens.includes(key)) S.pendingGens.push(key); toast(t('genWait', { gen: genNm(key) })); return false; }
  S.board[i] = { gen: key };
  newGen(i, key);
  return true;
}
function newGen(i, key) {
  flash(i); pulse([i], 5000); // F18
  toast(t('genNew', { gen: genNm(key) }));
  setTimeout(() => amySay('amyGen', { gen: genNm(key) }), 900);
}

// A2/A6/I2: after any change, waiting generators and gifts take the next free cells.
function placePending() {
  while (S.pendingGens.length) {
    const i = nearestEmpty(centerIdx());
    if (i < 0) return;
    const key = S.pendingGens.shift();
    S.board[i] = { gen: key };
    newGen(i, key);
  }
  while (S.inbox.length) {
    const i = nearestEmpty(centerIdx());
    if (i < 0) return;
    S.board[i] = S.inbox.shift();
    flash(i);
  }
}

function unlockedChains() {
  return Object.keys(DATA.chains).filter(k => DATA.chains[k].unlock <= S.level);
}
// A3/I3: orders only for chains whose generator is on the board.
function genChains() {
  const on = new Set(S.board.concat(S.store).filter(c => c && c.gen).map(c => c.gen));
  const list = Object.keys(DATA.chains).filter(k => on.has(k));
  return list.length ? list : ['bakery'];
}

const sigOf = o => o.need.map(x => x.c + x.l).join(',');
// D6/D8/A37/A38: order rewards from DATA.x formulas.
function orderReward(o) {
  let coins = o.need.reduce((a, x) => a + X.orderCoins(x.l), 0);
  let xp = o.need.reduce((a, x) => a + X.orderXp(x.l), 0);
  if (o.need.length > 1) { coins *= X.twoItemBonus; xp *= X.twoItemBonus; }
  if (o.special) coins *= o.special.coinMul;
  o.coins = Math.round(coins); o.xp = Math.round(xp); o.sig = sigOf(o);
  return o;
}

// F1/F14: first order comes from Captain Finn and pays for the first island task.
function firstOrder(first) {
  const o = { who: 'res_0', need: [{ c: 'bakery', l: 1 }], got: [false] };
  if (!first) return orderReward(o);
  o.tut = 1; o.coins = Math.max(X.firstOrderCoins, taskCost(0, 0)); o.xp = X.firstOrderXp; o.sig = sigOf(o);
  return o;
}

function makeOrder() {
  const chains = genChains();
  const [lo, hi] = X.orderLevel(S.level); // A35/F25
  const minL = S.perm.golden ? 1 : 0;
  const n = S.level >= X.twoItemLevel && Math.random() < X.twoItemChance ? 2 : 1;
  const need = [];
  // A36: some orders ask for an item that is already on the board.
  if (Math.random() < X.onBoardChance) {
    const have = S.board.filter(c => c && c.c && c.l >= 2 && c.l <= hi && chains.includes(c.c));
    if (have.length) { const c = have[rnd(0, have.length - 1)]; need.push({ c: c.c, l: c.l }); }
  }
  while (need.length < n) need.push({ c: chains[rnd(0, chains.length - 1)], l: rnd(Math.max(minL, lo), Math.max(minL, hi)) });
  const resK = Math.min(S.zone, DATA.residents.length);
  let who = resK > 0 && Math.random() < 0.4 ? 'res_' + rnd(0, resK - 1) : DATA.customers[rnd(0, DATA.customers.length - 1)];
  let special = null;
  // A10/D10: rare orders for max-level items.
  if (!S.orders.some(o => o.special)) {
    if (resK > 0 && S.level >= X.special.level && Math.random() < X.special.chance) { special = X.special; who = 'res_' + rnd(0, resK - 1); }
    else if (S.level >= X.feast.level && Math.random() < X.feast.chance) special = X.feast;
  }
  if (special) { need.length = 0; need.push({ c: chains[rnd(0, chains.length - 1)], l: MAX_L }); }
  const o = { who, need, got: need.map(() => false) };
  if (special) o.special = { coinMul: special.coinMul, gems: special.gems || 0, chest: special.chest || 0 };
  return orderReward(o);
}

function fillOrders() {
  const slots = 3 + (S.perm.orderSlot ? 1 : 0);
  while (S.orders.length < slots) S.orders.push(makeOrder());
}

// A32/A41: parts can come from board or storage; delivered parts are kept in o.got.
function locate(o) {
  const usedB = new Set(), usedS = new Set();
  return o.need.map((x, j) => {
    if (o.got && o.got[j]) return { got: true };
    let i = S.board.findIndex((c, q) => c && !usedB.has(q) && c.c === x.c && c.l === x.l);
    if (i >= 0) { usedB.add(i); return { b: i }; }
    i = S.store.findIndex((c, q) => c && !usedS.has(q) && c.c === x.c && c.l === x.l);
    if (i >= 0) { usedS.add(i); return { s: i }; }
    return null;
  });
}
function findItems(o) { const p = locate(o); return p.every(Boolean) ? p : null; }
function takeParts(parts) {
  parts.forEach(p => { if (p.b !== undefined) S.board[p.b] = null; });
  parts.filter(p => p.s !== undefined).map(p => p.s).sort((a, b) => b - a).forEach(q => S.store.splice(q, 1));
}

function deliver(k) {
  const o = S.orders[k];
  if (!o) return;
  const parts = findItems(o);
  if (!parts) return;
  takeParts(parts);
  finishOrder(k);
}

// A41: hand in one part of a two-part order.
function deliverPart(k, j) {
  const o = S.orders[k];
  if (!o || o.got[j]) return;
  const p = locate(o)[j];
  if (!p) return;
  takeParts([p]);
  o.got[j] = true;
  sfx('spawn');
  if (o.got.every(Boolean)) { finishOrder(k); return; }
  commit();
}

// A42: an item dragged onto an order card.
function deliverItem(k, i) {
  const o = S.orders[k], c = S.board[i];
  if (!o || !c || !c.c) return false;
  const j = o.need.findIndex((x, q) => !o.got[q] && x.c === c.c && x.l === c.l);
  if (j < 0) return false;
  S.board[i] = null;
  o.got[j] = true;
  if (selected === i) selected = -1;
  if (o.got.every(Boolean)) finishOrder(k); else { sfx('spawn'); commit(); }
  return true;
}

function finishOrder(k) {
  const o = S.orders[k];
  const card = $('orders').children[k];
  fly(card, 'coins', '🪙', Math.min(6, 2 + Math.floor(o.coins / 10)));
  fly(card, 'xp', '⭐', 2);
  if (Math.random() < 0.5) amySay('amyOrder');
  S.coins += o.coins; econ('coins', 'order', o.coins);
  S.orders.splice(k, 1);
  S.stats.orders++; prog('deliver'); funnel('deliver');
  addXp(o.xp);
  const extra = [];
  if (o.special) {
    if (o.special.gems) { S.gems += o.special.gems; econ('gems', 'order', o.special.gems); extra.push(`+${o.special.gems} 💎`); }
    if (o.special.chest) { grant({ chest: 1 }); extra.push('🎁'); }
  }
  fillOrders();
  toast(t('gotOrder', { c: fmt(o.coins), x: o.xp }) + (extra.length ? ' ' + extra.join(' ') : '')); sfx('deliver'); buzz(30);
  if (S.tut < 3 && S.coins >= taskCost(0, 0)) S.tut = 3;
  commit();
}

// A34/D12/I21: swap an order. Free every X.swapFreeSec, otherwise it costs a share of its coins (second tap confirms).
let swapArm = -1;
const swapCost = o => Math.max(1, Math.ceil(o.coins * X.swapCostPct));
const swapFree = () => now() - (S.swapTs || 0) >= X.swapFreeSec * 1000;
function swapOrder(k) {
  const o = S.orders[k];
  if (!o || o.tut || S.tut < 5) return;
  if (!swapFree()) {
    const c = swapCost(o);
    if (S.coins < c) { toast(t('noCoinsN', { n: fmt(c - S.coins) })); sfx('error'); return; }
    if (swapArm !== k) { swapArm = k; toast(t('swapAsk', { c: fmt(c) })); return; }
    S.coins -= c; econ('coins', 'swap', -c);
  } else S.swapTs = now();
  swapArm = -1;
  S.orders[k] = makeOrder();
  sfx('spawn');
  commit();
}

// ---------- juice ----------
const RM = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function center(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
function burst(i, big) {
  const el = $('board').children[i]; if (!el || RM()) return;
  const [x, y] = center(el);
  const cols = ['#ffd84d', '#ff8fb1', '#7fe3ff', '#ffffff', '#9dff7a'];
  for (let k = 0; k < (big ? 18 : 10); k++) {
    const p = document.createElement('i'); p.className = 'spark';
    const a = Math.random() * Math.PI * 2, d = 22 + Math.random() * (big ? 46 : 28);
    p.style.cssText = `left:${x}px;top:${y}px;background:${cols[k % cols.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`;
    document.body.appendChild(p); setTimeout(() => p.remove(), 650);
  }
  const ring = document.createElement('i'); ring.className = 'ring';
  ring.style.cssText = `left:${x}px;top:${y}px`; document.body.appendChild(ring); setTimeout(() => ring.remove(), 500);
}
function fly(fromEl, toId, glyph, n) {
  const to = $(toId); if (!fromEl || !to) return;
  if (RM()) { bump(toId); return; } // I40
  const [x0, y0] = center(fromEl), [x1, y1] = center(to);
  for (let k = 0; k < n; k++) {
    const f = document.createElement('i'); f.className = 'fly'; f.innerHTML = `<img src="${src(EM[glyph])}" alt="">`;
    f.style.cssText = `left:${x0 + (Math.random() - .5) * 30}px;top:${y0 + (Math.random() - .5) * 20}px`;
    document.body.appendChild(f);
    setTimeout(() => {
      f.style.transform = `translate(${x1 - x0}px, ${y1 - y0}px) scale(.6)`; f.style.opacity = '.3';
    }, 30 + k * 70);
    setTimeout(() => { f.remove(); bump(toId); }, 650 + k * 70);
  }
}
function bump(id) { const el = $(id).closest('.res, .lvl') || $(id); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
let amyT = 0;
function amySay(key, v) {
  const a = $('amy-pop'); if (!a) return;
  const lines = t(key, v).split('|');
  a.querySelector('span').textContent = lines[rnd(0, lines.length - 1)];
  a.hidden = false; a.classList.remove('in'); void a.offsetWidth; a.classList.add('in');
  clearTimeout(amyT); amyT = setTimeout(() => { a.hidden = true; }, 2600);
}
// Short highlight of board cells (new generator, idle hint, full-board help).
let pulseCells = new Set(), pulseUntil = 0;
function pulse(cells, ms) { pulseCells = new Set(cells); pulseUntil = now() + ms; }
function cellFx(i, cls, ms) {
  const el = $('board').children[i]; if (!el) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

// ---------- board actions ----------
const dist = (a, b) => { const [r0, c0] = rc(a), [r1, c1] = rc(b); return Math.abs(r1 - r0) + Math.abs(c1 - c0); };
// A19: ties go to the cell below, then beside, then above.
function nearestEmpty(from) {
  const [r0] = rc(from);
  let best = -1, bd = 1e9;
  S.board.forEach((c, i) => {
    if (c !== null) return;
    const [r] = rc(i);
    const d = dist(from, i) * 3 + (r > r0 ? 0 : r === r0 ? 1 : 2);
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}
function neighbors(i) {
  const [r, c] = rc(i), out = [];
  if (r > 0) out.push(i - DATA.cols);
  if (r < S.rows - 1) out.push(i + DATA.cols);
  if (c > 0) out.push(i - 1);
  if (c < DATA.cols - 1) out.push(i + 1);
  return out;
}
// A20: prefer a free cell next to an equal item if it is at most one step further away.
function spawnCell(genIdx, c, l) {
  const best = nearestEmpty(genIdx);
  if (best < 0) return -1;
  const d0 = dist(genIdx, best);
  let pick = -1, pd = 1e9;
  S.board.forEach((x, i) => {
    if (!x || x.c !== c || x.l !== l) return;
    neighbors(i).forEach(j => {
      if (S.board[j] !== null) return;
      const d = dist(genIdx, j);
      if (d <= d0 + 1 && d < pd) { pd = d; pick = j; }
    });
  });
  return pick >= 0 ? pick : best;
}

// A24/A25: driftwood opens when a merge happens next to it.
function openDrift(i) {
  const d = S.board[i] && S.board[i].drift;
  if (!d) return;
  if (d.coins) { S.board[i] = null; S.coins += d.coins; econ('coins', 'drift', d.coins); } else { S.board[i] = { c: d.c, l: d.l }; seen(d.c, d.l); }
  flash(i); burst(i, false);
}

function spawn(genIdx) {
  tickEnergy();
  const g = S.board[genIdx];
  if (!g || !g.gen) return;
  const key = g.gen;
  if (S.energy < 1) {
    toast(t('noEnergyT', { t: mmss(energyLeftMs()) })); sfx('error'); cellFx(genIdx, 'shake', 260);
    if (!S.tips.energy) { S.tips.energy = 1; const d = new Date(now() + energyLeftMs() + (energyMax() - 1) * regenMs()); amySay('amyEnergy', { t: `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}` }); } // F22
    return;
  }
  const count = boostOn('double') ? 2 : 1;
  let placed = 0;
  for (let k = 0; k < count; k++) {
    let l = S.perm.golden ? 1 : 0;
    if (boostOn('lucky') && Math.random() < 0.1) l++;
    const i = spawnCell(genIdx, key, l);
    if (i < 0) break;
    S.board[i] = { c: key, l };
    seen(key, l); prog('spawn');
    placed++;
    flash(i);
  }
  if (!placed) { boardFull(); cellFx(genIdx, 'shake', 260); return; }
  sfx('spawn'); funnel('spawn');
  if (S.tut === 0) S.tut = 1;
  if (S.energy >= energyMax()) S.energyTs = now();
  S.energy--;
  commit();
}

// A22/F21: full board shows three quick actions instead of a dead end.
let fullHelpUntil = 0;
function boardFull() {
  toast(t('boardFull')); sfx('error');
  fullHelpUntil = now() + 8000;
  S.ui.store = 1;
  if (!S.tips.full) { S.tips.full = 1; amySay('amyFull'); }
  commit();
}
function mergePair() {
  const first = {};
  for (let i = 0; i < S.board.length; i++) {
    const c = S.board[i];
    if (!c || !c.c || c.l >= MAX_L) continue;
    const k = c.c + c.l;
    if (first[k] !== undefined) return [first[k], i];
    first[k] = i;
  }
  return null;
}
function fullHelp(kind) {
  fullHelpUntil = 0;
  if (kind === 'pair') { const p = mergePair(); if (p) pulse(p, 4000); else toast(t('noPair')); render(); }
  if (kind === 'store') openStore();
  if (kind === 'sell') {
    let lo = -1;
    S.board.forEach((c, i) => { if (c && c.c && (lo < 0 || c.l < S.board[lo].l)) lo = i; });
    selected = lo; render();
  }
}

// A9: one-step undo for drop and sell. Valid only while nothing else changed.
let undo = null;
const snap = () => JSON.stringify({ board: S.board, coins: S.coins, xp: S.xp, level: S.level, store: S.store, day: S.day, stats: S.stats, pendingGens: S.pendingGens, inbox: S.inbox, orders: S.orders });
const canUndo = () => !!undo && snap() === undo.post;
function doUndo() {
  if (!canUndo()) { undo = null; render(); return; }
  Object.assign(S, JSON.parse(undo.pre));
  undo = null; selected = -1;
  toast(t('undone'));
  commit();
}

// A47: merge series. Three merges within X.seriesSec give +1 XP per further merge.
let series = { n: 0, ts: 0 };
function seriesStep() {
  series = now() - series.ts <= X.seriesSec * 1000 ? { n: series.n + 1, ts: now() } : { n: 1, ts: now() };
  if (series.n < X.seriesMin) return;
  addXp(1);
  const el = $('combo');
  if (el) { el.textContent = t('combo', { n: series.n }); el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 1200); }
}

function afterMerge(to, c, l, auto) {
  S.stats.merges++; prog('merge'); funnel('merge');
  const fresh = seen(c, l);
  flash(to); burst(to, l >= 5); sfx('merge', l); buzz(l === MAX_L ? 60 : 15);
  neighbors(to).forEach(n => { if (S.board[n] && S.board[n].drift) openDrift(n); });
  maybeBubble(to, c, l);
  if (!auto) seriesStep();
  if (l === MAX_L) { toast(t('maxLevel', { name: nm(c, MAX_L) })); amySay('amyMax'); }
  else if (fresh && l >= 1) { // A45
    const got = [...Array(MAX_L + 1).keys()].filter(q => (S.seen || {})[c + '_' + q]).length;
    toast(t('newItem', { name: nm(c, l), n: got, m: MAX_L + 1 }));
  }
}

function drop(from, to, auto) {
  if (from === to || to < 0 || to >= S.board.length || from < 0 || from >= S.board.length) { bounce(from); return false; } // A15
  const a = S.board[from], b = S.board[to];
  if (!a || a.drift || (b && b.drift)) { bounce(from); return false; }
  const pre = snap();
  if (a.joker && b) {
    if (!(b.c && b.l < MAX_L)) { bounce(from); toast(t('jokerWhere')); return false; } // A11
    b.l++; S.board[from] = null;
    afterMerge(to, b.c, b.l, auto);
  } else if (a.c && b && b.c && a.c === b.c && a.l === b.l && a.l < MAX_L) {
    S.board[to] = { c: a.c, l: a.l + 1 }; S.board[from] = null;
    afterMerge(to, a.c, a.l + 1, auto);
  } else if (a.c && b && b.gen) { // A12: the generator stays, the item lands next to it
    S.board[from] = null;
    const j = nearestEmpty(to);
    S.board[j] = a; to = j; flash(j);
  } else {
    S.board[to] = a; S.board[from] = b;
    if (a.c && b && b.c && !S.tips.swap) { S.tips.swap = 1; toast(t('onlyEqual')); } // F32
  }
  selected = to;
  commit(auto ? null : pre);
  return true;
}

function bounce(i) { if (i >= 0) cellFx(i, 'back', 180); }

// A17/A18/I8: auto-merge skips wanted items and waits while dragging or a window is open.
function autoMergeTick() {
  if (!boostOn('autoMerge') || drag || !$('modal').hidden) return;
  const keep = wantedCells();
  const first = {};
  for (let i = 0; i < S.board.length; i++) {
    const c = S.board[i];
    if (!c || !c.c || c.l >= MAX_L || keep.has(i)) continue;
    const key = c.c + c.l;
    if (first[key] !== undefined) { const sel = selected; drop(i, first[key], true); selected = sel; render(); return; }
    first[key] = i;
  }
}

// A7/D31/I20: high items and jokers need a second tap; sell can be undone.
let sellArm = -1;
function sell() {
  const i = selected, c = S.board[i];
  if (!c || !(c.c || c.joker)) return;
  if ((c.joker || c.l >= X.sellConfirmL) && sellArm !== i) { sellArm = i; render(); return; }
  sellArm = -1;
  const pre = snap();
  const coins = c.joker ? 0 : X.sellCoins(c.l); // A8/D30
  S.board[i] = null;
  S.coins += coins; econ('coins', 'sell', coins);
  selected = -1;
  toast(t('sold', { c: fmt(coins) }));
  commit(pre);
}

// ---------- shop ----------
function goldenFix() {
  // Golden Touch spawns level 2, so no order may ask for level 1 anymore.
  S.orders.forEach(o => o.need.forEach(x => { if (x.l === 0) x.l = 1; }));
}

const NATIVE = window.AndroidBilling || null;
let nativePrices = {};
const productById = id => (id === 'starter' ? DATA.starter : id === 'pass' ? DATA.pass : DATA.money.find(p => p.id === id));
const priceOf = p => nativePrices[p.id] || p.price;

function grantMoney(p) {
  if (p.id === 'starter') {
    S.starterBought = true; S.gems += p.gems; S.energy += p.energy; S.perm.golden = true; goldenFix();
  } else if (p.id === 'pass') {
    S.passUntil = Math.max(now(), S.passUntil) + p.days * 864e5;
    S.gems += p.dailyGems;
  } else {
    S.gems += p.gems;
  }
  sfx('buy');
  commit();
  if (!$('modal').hidden) openShop();
}

function buyMoney(p) {
  if (p.id === 'starter' && S.starterBought) return;
  if (NATIVE) { NATIVE.buy(p.id); return; }
  // Browser test version: no payment.
  toast(t('testBuy', { name: pName(p) }));
  grantMoney(p);
}

window.onNativePurchase = id => { const p = productById(id); if (p) { grantMoney(p); toast(`✅ ${pName(p)}`); } };
window.onNativePrices = map => { nativePrices = map || {}; };
window.onNativePurchaseError = code => toast(t('buyError', { code }));
window.onNativeBack = () => { if (!$('modal').hidden) closeModal(); else if (NATIVE) NATIVE.exit(); };

const allGemItems = () => DATA.gemShop.concat(X.gemShop);
// D24: energy refill fills up to max, priced per started 100 missing.
function gemCost(item) {
  if (item.kind !== 'energy') return item.cost;
  const miss = energyMax() - S.energy;
  return miss <= 0 ? 0 : Math.ceil(miss / 100) * item.cost;
}
let shopArm = '';
function buyGem(item) {
  if (!item) return;
  if (item.kind === 'perm' && S.perm[item.id]) return;
  if (item.req && !S.perm[item.req]) return;
  const cost = gemCost(item);
  if (item.kind === 'energy' && cost === 0) { toast(t('energyFull')); return; }
  if (S.gems < cost) { toast(t('noGemsN', { n: fmt(cost - S.gems) })); sfx('error'); return; }
  if (cost >= X.confirmGems && shopArm !== item.id) { shopArm = item.id; openShop(); return; } // D32
  shopArm = '';
  if (item.kind === 'item') {
    const i = nearestEmpty(centerIdx());
    if (i < 0) { toast(t('boardFullShort')); return; }
    S.board[i] = { joker: 1 };
  }
  S.gems -= cost; econ('gems', 'shop', -cost);
  if (item.kind === 'energy') S.energy = Math.max(S.energy, energyMax());
  if (item.kind === 'coins') { S.coins += item.coins; econ('coins', 'shop', item.coins); }
  if (item.kind === 'boost') S.boosts[item.id] = Math.max(now(), S.boosts[item.id] || 0) + item.hours * 36e5;
  if (item.kind === 'perm') {
    S.perm[item.id] = true;
    const rows = item.id === 'bigBoard' ? 1 : item.rows || 0;
    for (let r = 0; r < rows; r++) { S.rows++; S.board.push(...new Array(DATA.cols).fill(null)); }
    if (item.id === 'orderSlot') fillOrders();
    if (item.id === 'golden') goldenFix();
  }
  toast(t('active', { name: pName(item) })); sfx('buy');
  commit(); openShop();
}

// D11/A33: coin sinks in the shop.
function buyCoins(id) {
  const c = X.coinShop.find(x => x.id === id);
  if (!c || (c.once && S.perm[c.id]) || S.zone < (c.zone || 0)) return;
  if (S.coins < c.coins) { toast(t('noCoinsN', { n: fmt(c.coins - S.coins) })); sfx('error'); return; }
  if (c.coins >= X.confirmCoins && shopArm !== c.id) { shopArm = c.id; openShop(); return; }
  shopArm = '';
  S.coins -= c.coins; econ('coins', 'shop', -c.coins);
  if (c.kind === 'chest') grant({ chest: 1 });
  if (c.kind === 'row') { S.perm[c.id] = true; S.rows++; S.board.push(...new Array(DATA.cols).fill(null)); sfx('buy'); }
  toast(t('active', { name: t('p_' + c.id) }));
  commit(); openShop();
}

// ---------- UI ----------
function icon(ch, l) {
  const a = DATA.chains[ch].img;
  if (!a || (a !== true && l >= a)) return DATA.chains[ch].items[l];
  const key = `${ch}_${l}`;
  return `<img src="${src(key)}" alt="" draggable="false">`;
}

const ART = new Set(DATA.art || []);
function art(key, emoji) {
  return ART.has(key) ? `<img src="${src(key)}" alt="" draggable="false">` : emoji;
}

function cellHtml(c) {
  if (!c) return '';
  if (c.gen) return `<span class="gen">${art('gen_' + c.gen, DATA.chains[c.gen].gen)}</span>`;
  if (c.joker) return `<span>${art('joker', '🃏')}</span>`;
  if (c.chest) return `<span class="chest">${art('chest', '🎁')}</span>`;
  if (c.bubble) return `<span class="bub">${icon(c.bubble.c, c.bubble.l)}</span><b>${Math.max(0, Math.ceil(c.left / 1000))}</b>`;
  if (c.drift) return `<span class="drift">${c.drift.coins ? `<img src="${src('ui_coin')}" alt="">` : icon(c.drift.c, c.drift.l)}</span>`;
  return `<span>${icon(c.c, c.l)}</span><b>${c.l + 1}</b>`;
}

function itemName(c) {
  if (c.gen) return t('genInfo', { gen: genNm(c.gen), chain: chainNm(c.gen) });
  if (c.joker) return t('jokerInfo');
  if (c.chest) return t('chest');
  if (c.bubble) return t('bubble');
  if (c.drift) return t('driftInfo');
  return t('itemInfo', { name: nm(c.c, c.l), l: c.l + 1, max: MAX_L + 1 });
}

// I6/A49: DOM is only written when the markup changed, so buttons survive the 1 s tick.
function setHTML(el, html) { if (el && el._h !== html) { el.innerHTML = html; el._h = html; } }

// A39: only the cells that a delivery would actually take.
function wantedCells() {
  const w = new Set();
  S.orders.forEach(o => locate(o).forEach(p => { if (p && p.b !== undefined) w.add(p.b); }));
  return w;
}

const SWAP_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M18 2v5h-5M6 22v-5h5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function ordersHtml() {
  const cnt = {};
  S.board.forEach(c => { if (c && c.c) cnt[c.c + c.l] = (cnt[c.c + c.l] || 0) + 1; });
  return emo(S.orders.map((o, k) => {
    const loc = locate(o);
    const ok = loc.every(Boolean);
    const multi = o.need.length > 1;
    const parts = o.need.map((x, j) => {
      const p = loc[j];
      const got = p && p.got, have = p && !p.got;
      const near = !p && x.l > 0 && (cnt[x.c + (x.l - 1)] || 0) >= 2; // A40
      const attr = have && multi && !ok ? ` data-part="${k}:${j}"` : '';
      return `<span class="need ${got ? 'got' : have ? 'have' : ''} ${near ? 'near' : ''}"${attr}>${icon(x.c, x.l)}<i>${x.l + 1}</i></span>`;
    }).join('');
    const swap = S.tut >= 5 && !o.tut ? `<button class="swap ${swapFree() ? 'free' : ''}" data-swap="${k}" aria-label="${t('swap')}">${SWAP_SVG}</button>` : '';
    return `<div class="order ${ok ? 'ready' : ''} ${o.special ? 'feast' : ''}" data-k="${k}"><div class="who">${whoHtml(o.who)}</div><div class="needs">${parts}</div>
      ${ok ? `<button data-deliver="${k}">${t('deliver')}</button>` : `<small>🪙${fmt(o.coins)}</small>`}${swap}</div>`;
  }).join(''));
}

function hud() {
  tickEnergy();
  $('lvl').textContent = S.level;
  $('xp').style.width = Math.min(100, 100 * S.xp / DATA.xpForLevel(S.level)) + '%';
  $('energy').textContent = `${S.energy}/${energyMax()}`;
  $('energy-timer').textContent = S.energy < energyMax() ? ` ${mmss(energyLeftMs())}` : '';
  $('coins').textContent = fmt(S.coins);
  $('gems').textContent = fmt(S.gems);
  const boosts = [];
  for (const g of DATA.gemShop.filter(x => x.kind === 'boost')) {
    if (boostOn(g.id)) boosts.push(`${pIcon(g)} ${Math.ceil((S.boosts[g.id] - now()) / 60000)}${t('unitM')}`);
  }
  if (passActive()) boosts.push(`${art('gs_pass', '🎫')} ${Math.ceil((S.passUntil - now()) / 864e5)}${t('unitD')}`);
  setHTML($('boosts'), emo(boosts.join(' &nbsp; ')));
  const u = $('btn-undo');
  if (u) { u.hidden = !canUndo(); u.textContent = t('undo'); }
}

function renderBoard(wanted) {
  const board = $('board');
  board.style.gridTemplateRows = `repeat(${S.rows}, 1fr)`;
  if (board.children.length !== S.board.length) {
    board.innerHTML = S.board.map((_, i) => `<div class="cell" data-i="${i}"></div>`).join('');
  }
  const noE = S.energy < 1;
  if (pulseUntil < now()) pulseCells = new Set();
  S.board.forEach((c, i) => {
    const el = board.children[i];
    let html = cellHtml(c);
    if (c && c.gen && noE) html += `<b class="gt">${mmss(energyLeftMs())}</b>`; // A21
    setHTML(el, html);
    el.classList.toggle('sel', i === selected);
    if (wanted) el.classList.toggle('wanted', wanted.has(i));
    el.classList.toggle('max', !!(c && c.c && c.l === MAX_L));
    el.classList.toggle('empty', !!(c && c.gen && noE));
    el.classList.toggle('dw', !!(c && c.drift));
    el.classList.toggle('hint', pulseCells.has(i));
  });
}

function renderStrip() {
  const sc = S.board[selected];
  const info = $('info');
  if (sc) { setHTML(info, emo(itemName(sc))); info.classList.remove('goal'); }
  else if (fullHelpUntil > now()) {
    setHTML(info, `<span class="fh">${['pair', 'store', 'sell'].map(k => `<button data-fh="${k}">${t('fh_' + k)}</button>`).join('')}</span>`);
    info.classList.remove('goal');
  } else {
    const g = goalText();
    setHTML(info, emo(g || t('hint')));
    info.classList.toggle('goal', !!g);
  }
  const sellable = !!(sc && (sc.c || sc.joker));
  $('btn-sell').hidden = !sellable;
  if (sellable) {
    const c = sc.joker ? 0 : X.sellCoins(sc.l);
    setHTML($('btn-sell'), emo(sellArm === selected ? t('sellSure', { c: fmt(c) }) : t('sell', { c: fmt(c) })));
  }
  if (sellArm !== selected) sellArm = -1;
}

// F17: the next island task is always visible when nothing is selected.
function goalText() {
  if (S.tut < 5) return '';
  const z = DATA.zones[S.zone];
  if (!z) return '';
  const k = z.tasks.findIndex((_, q) => !S.tasksDone.includes(q));
  if (k < 0) return '';
  const cost = taskCost(S.zone, k);
  return t('goal', { task: taskNm(S.zone, k), c: fmt(Math.min(S.coins, cost)), n: fmt(cost) });
}

function render() {
  hud();
  setHTML($('orders'), ordersHtml());
  renderBoard(wantedCells());
  renderStrip();
  renderTut();
  renderNav();
  badges();
}

// Checks run before every save: waiting gifts, reward formulas, tutorial state.
function fixups() {
  placePending();
  S.orders.forEach(o => { if (!o.tut && o.sig !== sigOf(o)) orderReward(o); }); // I16
  if (S.perm.golden) genChains().forEach(c => seen(c, 0)); // I15
  syncTut();
  if (S.level >= 3) S.ui.store = 1;
  tipItems();
}
function commit(pre) {
  fixups();
  if (pre !== undefined) undo = pre ? { pre, post: snap() } : undo;
  if (undo && pre === undefined && snap() !== undo.post) undo = null;
  save(); render();
}

let toastT = 0;
function toast(msg) {
  const el = $('toast');
  el.innerHTML = emo(msg); el.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { el.hidden = true; }, 2200);
}

function flash(i) {
  requestAnimationFrame(() => {
    const el = $('board').children[i];
    if (!el) return;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  });
}

let lastFocus = null;
function openModal(html) {
  if ($('modal').hidden) lastFocus = document.activeElement;
  $('modal-body').innerHTML = emo(html); $('modal-body').scrollTop = 0; $('modal').hidden = false;
  const sh = document.querySelector('#modal .sheet'); if (sh && sh.focus) sh.focus(); // I39
}
function closeModal() {
  $('modal').hidden = true; shopArm = '';
  if (S.tut === 4) S.tut = 3; // F46: closing the place window does not skip the last step
  if (lastFocus && lastFocus.focus) lastFocus.focus();
  commit();
}

// ---------- tutorial (F2/F3/F4) ----------
const wheat = () => S.board.reduce((a, c, i) => (c && c.c === 'bakery' && c.l === 0 ? a.concat(i) : a), []);
function tutOrder() { return S.orders.findIndex(o => o.need.length === 1 && o.need[0].c === 'bakery' && o.need[0].l === 1); }
function syncTut() {
  if (S.tut >= 3) {
    // Tutorial reached the island step without enough coins for the first task: go back to delivering.
    if (S.tut === 3 && S.zone === 0 && !S.tasksDone.length && S.coins < taskCost(0, 0)) S.tut = 2; else return;
  }
  let k = tutOrder();
  if (k < 0) {
    S.orders.unshift(firstOrder(!S.stats.orders));
    const slots = 3 + (S.perm.orderSlot ? 1 : 0);
    if (S.orders.length > slots) {
      const drop1 = S.orders.map((o, q) => q).reverse().find(q => q > 0 && !S.orders[q].got.some(Boolean));
      S.orders.splice(drop1 === undefined ? S.orders.length - 1 : drop1, 1);
    }
    k = 0;
  }
  const w = wheat().length;
  if (findItems(S.orders[k])) S.tut = 2;
  else if (S.tut === 2) S.tut = w >= 2 ? 1 : 0;
  else if (S.tut === 1 && w < 2) S.tut = 0;
}

function renderTut() {
  document.querySelectorAll('.hl').forEach(el => el.classList.remove('hl'));
  const box = $('tut');
  if (S.tut >= 4) { box.hidden = true; return; }
  box.hidden = false;
  const v = { gen: genNm('bakery'), item: nm('bakery', 0), bread: nm('bakery', 1), place: zoneNm(0) };
  setHTML(box, emo(`<img class="amy" src="${src('amy_face')}" alt=""><span>${t('ctut' + S.tut, v)}</span>`)); // F6/F7/I44
  const targets = [];
  if (S.tut === 0) targets.push($('board').children[S.board.findIndex(c => c && c.gen === 'bakery')]);
  if (S.tut === 1) wheat().slice(0, 2).forEach(i => targets.push($('board').children[i])); // F4
  if (S.tut === 2) {
    const k = tutOrder();
    const card = k >= 0 && $('orders').children[k];
    targets.push((card && card.querySelector('[data-deliver]')) || document.querySelector('[data-deliver]'));
  }
  if (S.tut === 3) targets.push($('btn-island'));
  targets.forEach(el => { if (el) el.classList.add('hl'); });
}

// F8/F9: daily, storage and album appear step by step.
function renderNav() {
  const show = {
    daily: S.tut >= 5,
    store: S.tut >= 5 && (!!S.ui.store || S.inbox.length > 0 || S.store.length > 0),
    album: S.tut >= 5 && !!S.ui.album
  };
  for (const k in show) {
    const el = $('btn-' + k);
    el.classList.toggle('nav-off', !show[k]);
    if (show[k] && !S.ui['seen_' + k]) {
      S.ui['seen_' + k] = 1;
      if (S.ui.intro) setTimeout(() => amySay('amyBtn_' + k), 300);
    }
  }
  S.ui.intro = 1;
  const ib = $('btn-store').querySelector('i');
  if (ib) { ib.hidden = !S.inbox.length; ib.textContent = S.inbox.length || ''; } // A6
}

// F19/F20: first chest and first joker get a short explanation.
function tipItems() {
  for (const k of ['chest', 'joker']) {
    if (S.tips[k]) continue;
    const i = S.board.findIndex(c => c && c[k]);
    if (i >= 0) { S.tips[k] = 1; pulse([i], 4000); setTimeout(() => amySay('amyFirst_' + k), 500); }
  }
  if (!S.ui.album && Object.keys(S.seen || {}).some(k => +k.split('_')[1] >= 3)) S.ui.album = 1;
}

function openSettings() {
  const opt = (k, v, label) => `<button class="opt ${P[k] === v ? 'on' : ''}" data-pref="${k}" data-val="${v}">${label}</button>`;
  const dbg = /debug/.test(location.search) ? `<h3>Economy</h3><pre class="econ">${JSON.stringify(S.econ || {}, null, 1)}\n${JSON.stringify(S.funnel || {}, null, 1)}</pre>` : ''; // D47
  openModal(`<h2>${t('settings')}</h2>
    <h3>${t('language')}</h3><div class="opts">${opt('lang', 'en', 'English')}${opt('lang', 'de', 'Deutsch')}</div>
    <h3>${t('sound')}</h3><div class="opts">${opt('sound', true, t('on'))}${opt('sound', false, t('off'))}</div>
    <h3>${t('hints')}</h3><div class="opts">${opt('hint', true, t('on'))}${opt('hint', false, t('off'))}</div>
    <h3>${t('haptic')}</h3><div class="opts">${opt('haptic', true, t('on'))}${opt('haptic', false, t('off'))}</div>
    <button class="back" data-help="1">${t('helpBtn')}</button>
    ${S.tut >= 5 ? `<button class="back" data-retut="1">${t('tutAgain')}</button>` : ''}
    <p class="links"><a href="https://play.nyrathen.com/legal/tasty-island-privacy.${P.lang}.html" target="_blank" rel="noopener">${t('privacy')}</a> · <a href="mailto:lords.azz6@gmail.com">${t('support')}</a></p>${dbg}`);
}

// F29: short help page.
function openHelp() {
  openModal(`<h2>${t('helpBtn')}</h2>${[1, 2, 3, 4, 5, 6].map(k => `<div class="prod"><div><b>${t('help' + k + 'h')}</b><small>${t('help' + k)}</small></div></div>`).join('')}`);
}

// F30: replay the tutorial without touching progress.
function replayTut() {
  S.tut = 0;
  if (tutOrder() < 0) { S.orders[0] = firstOrder(false); }
  closeModal(); S.tut = 0; commit();
}

function applyStaticTexts() {
  document.documentElement.lang = P.lang;
  const lab = { island: 'island', daily: 'navDaily', shop: 'shop', store: 'storeH', album: 'navAlbum' };
  for (const k in lab) $('btn-' + k).querySelector('span').textContent = t(lab[k]);
  document.querySelectorAll('[data-ic]').forEach(el => { el.src = src(el.dataset.ic); });
  $('btn-settings').setAttribute('aria-label', t('settings')); // I45
  $('modal-close').setAttribute('aria-label', t('close'));
}

function openShop() {
  const money = p => `<div class="prod"><span class="pi">${p.id === 'starter' || p.id === 'pass' ? art('gs_' + p.id, p.id === 'pass' ? '🎫' : '🎁') : '💎'}</span><div><b>${pName(p)}</b>${p.tag ? `<em>${pTag(p.tag)}</em>` : ''}${pDesc(p) ? `<small>${pDesc(p)}</small>` : ''}</div>
    <button data-money="${p.id}">${priceOf(p)}</button></div>`;
  const gem = g => {
    const owned = g.kind === 'perm' && S.perm[g.id];
    const cost = gemCost(g);
    const full = g.kind === 'energy' && cost === 0;
    let label = owned ? t('owned') : full ? t('full') : `💎 ${fmt(cost)}`;
    if (!owned && !full && cost > S.gems) label = t('missGems', { n: fmt(cost - S.gems) }); // D33
    else if (!owned && shopArm === g.id) label = t('sure', { c: `💎 ${fmt(cost)}` }); // D32
    return `<div class="prod"><span class="pi">${pIcon(g)}</span><div><b>${pName(g)}</b><small>${pDesc(g)}</small></div>
      <button data-gem="${g.id}" class="${shopArm === g.id ? 'armed' : ''}" ${owned || full ? 'disabled' : ''}>${label}</button></div>`;
  };
  const coin = c => {
    const owned = c.once && S.perm[c.id];
    let label = owned ? t('owned') : `🪙 ${fmt(c.coins)}`;
    if (!owned && c.coins > S.coins) label = t('missCoins', { n: fmt(c.coins - S.coins) });
    else if (!owned && shopArm === c.id) label = t('sure', { c: `🪙 ${fmt(c.coins)}` });
    return `<div class="prod"><span class="pi">${art(c.icon, '🪙')}</span><div><b>${t('p_' + c.id)}</b><small>${t('p_' + c.id + 'D')}</small></div>
      <button data-coin="${c.id}" class="${shopArm === c.id ? 'armed' : ''}" ${owned ? 'disabled' : ''}>${label}</button></div>`;
  };
  openModal(`<h2 class="amyh"><img class="amy" src="${src('amy_face')}" alt="">${t('shop')}</h2>${NATIVE ? '' : `<p class="note">${t('shopNote')}</p>`}
    <h3>${t('offers')}</h3>${S.starterBought ? '' : money(DATA.starter)}${money(DATA.pass)}
    <h3>${t('power')}</h3>${allGemItems().filter(g => !g.req || S.perm[g.req]).map(gem).join('')}
    <h3>${t('coinShopH')}</h3>${X.coinShop.filter(c => S.zone >= (c.zone || 0)).map(coin).join('')}
    <h3>${t('gemsH')}</h3>${DATA.money.map(money).join('')}`);
}

const pIcon = g => art('gs_' + g.id, g.icon);
const zoneNm = z => (DE() ? DE().zones[z] : DATA.zones[z].name);
const resOf = z => ({ ...DATA.residents[z], ...(DE() ? DE().residents[z] : {}) });
const whoHtml = w => (/^(res|cu)_/.test(w) ? art(w, w[0] === 'r' ? DATA.residents[+w.slice(4)].emoji : '🙂') : w);
const ISLAND_SVG = `<svg viewBox="0 0 100 130" preserveAspectRatio="none" aria-hidden="true">
  <path d="M18 112 C4 98 6 74 14 62 C8 46 14 26 30 16 C44 6 70 4 82 16 C96 30 92 50 88 62 C96 78 92 104 76 116 C60 128 32 126 18 112 Z" fill="#f6dc9c" stroke="#fff6d8" stroke-width="2.5"/>
  <path d="M24 104 C14 92 16 76 22 66 C18 52 22 34 34 24 C46 14 66 14 76 24 C86 34 84 50 80 62 C86 76 82 96 70 106 C56 116 36 116 24 104 Z" fill="#8fd16a"/>
  <path d="M30 98 C24 88 28 78 32 72 C30 60 34 46 42 38 C52 30 62 30 70 38 C76 46 74 56 72 64 C76 76 72 90 64 98 C54 106 38 106 30 98 Z" fill="#a8e07c"/>
  <path d="M28 98 Q50 92 66 86 T34 66 T72 56 T36 34 T68 22" fill="none" stroke="#fff8" stroke-width="1.6" stroke-dasharray="2 2.5"/>
</svg>`;

function openIsland() {
  if (S.tut === 3 || S.tut === 4) { S.tut = 4; openPlace(); return; }
  const pins = DATA.zones.map((z, k) => {
    const st = k < S.zone ? 'done' : k === S.zone ? 'cur' : 'lock';
    const prog = st === 'done' ? 1 : st === 'cur' ? S.tasksDone.length / z.tasks.length : 0;
    const [x, y] = DATA.mapPins[k];
    const badge = st === 'lock' ? '🔒' : st === 'done' ? '✅' : `${S.tasksDone.length}/${z.tasks.length}`;
    return `<button class="pin ${st}" data-place="${k}" style="left:${x}%;top:${y}%;--p:${prog}"><b class="pic">${art('place_' + k, '🏠')}</b><span>${badge}</span><small>${zoneNm(k)}</small></button>`;
  }).join('');
  openModal(`<h2>🏝️ ${t('map')}</h2><div class="map">${ISLAND_SVG}${pins}</div>`);
}

function openPlace() {
  const z = DATA.zones[S.zone];
  if (!z) { openModal(`<h2>${t('island')}</h2><p>${t('allDone')}</p>`); return; }
  const r = resOf(S.zone);
  const rows = z.tasks.map((task, k) => {
    const done = S.tasksDone.includes(k);
    return `<div class="prod ${done ? 'done' : ''}"><div><b>${done ? '✅' : '🔨'} ${taskNm(S.zone, k)}</b></div>
      <button data-task="${k}" ${done ? 'disabled' : ''}>${done ? t('done') : `🪙 ${fmt(taskCost(S.zone, k))}`}</button></div>`;
  }).join('');
  const tip = S.tut === 4 ? `<p class="tut-inline">${t('tut4')}</p>` : '';
  const pct = Math.round(100 * S.tasksDone.length / z.tasks.length);
  openModal(`<div class="place-top"><div class="place-pic" style="--p:${S.tasksDone.length / z.tasks.length}">${art('place_' + S.zone, '🏠')}</div>
    <div><h2>${zoneNm(S.zone)}</h2><div class="pbar"><i style="width:${pct}%"></i></div><p class="note">${t('placeNote', { i: S.zone + 1, n: DATA.zones.length, d: S.tasksDone.length, t: z.tasks.length, g: z.bonusGems })}</p></div></div>
    <div class="say"><span class="face">${whoHtml('res_' + S.zone)}</span><p><b>${r.name}</b><br>${r.hi}</p></div>${tip}${rows}
    ${S.tut >= 5 ? `<button class="back" id="btn-map">🏝️ ${t('map')}</button>` : ''}`);
  const b = $('btn-map'); if (b) b.onclick = openIsland;
}

function showResident(k, restored) {
  const r = resOf(k);
  openModal(`<div class="welcome"><div class="res-big">${whoHtml('res_' + k)}</div><h2>${r.name}</h2><p>${r.thanks}</p>
    ${restored ? `<p class="note">${t('newGuest', { name: r.name })}</p>` : ''}<button id="btn-go">${t('talk')}</button></div>`);
  $('btn-go').onclick = () => { if (restored) openIsland(); else closeModal(); };
  if (restored && !RM()) confetti();
}

function confetti() {
  const cols = ['#ff6f91', '#ffd84d', '#7fe3ff', '#9dff7a', '#ffffff'];
  for (let k = 0; k < 40; k++) {
    const p = document.createElement('i'); p.className = 'conf';
    p.style.cssText = `left:${Math.random() * 100}vw;background:${cols[k % 5]};animation-delay:${Math.random() * .5}s;--r:${rnd(-360, 360)}deg`;
    document.body.appendChild(p); setTimeout(() => p.remove(), 2200);
  }
}

function doTask(k) {
  const z = DATA.zones[S.zone];
  const task = z && z.tasks[k];
  if (!task) return;
  if (S.tasksDone.includes(k)) return;
  const cost = taskCost(S.zone, k);
  if (S.coins < cost) { toast(t('noCoinsN', { n: fmt(cost - S.coins) })); sfx('error'); return; } // F39
  S.coins -= cost; econ('coins', 'task', -cost);
  sfx('buy');
  if (S.tut === 4 || S.tut === 3) { S.tut = 5; setTimeout(() => amySay('amyTutDone'), 900); } // F16
  S.tasksDone.push(k); prog('task'); funnel('task');
  // A26: every task clears driftwood nearest to the centre.
  S.board.map((c, i) => i).filter(i => S.board[i] && S.board[i].drift).sort((a, b) => dist(centerIdx(), a) - dist(centerIdx(), b)).slice(0, X.driftPerTask).forEach(openDrift);
  addXp(10);
  if (S.tasksDone.length === z.tasks.length) {
    S.gems += z.bonusGems; econ('gems', 'zone', z.bonusGems);
    const done = S.zone;
    S.zone++; S.tasksDone = [];
    toast(t('restored', { name: zoneNm(done), g: z.bonusGems })); sfx('level');
    commit(); showResident(done, true); return;
  }
  toast(`${taskNm(S.zone, k)} ✅`);
  commit(); openPlace();
}

// E2/I4: also called on resume and from the 1 s tick. D35: no window opens by itself, the badge shows it.
function daily() {
  const d = today();
  if (S.lastDaily === d) return false;
  const first = !S.lastDaily;
  if (!first && passActive()) { // D17: up to X.passCatchUpDays missed days are paid out
    const n = Math.max(1, Math.min(X.passCatchUpDays, daysBetween(S.lastDaily, d) || 1));
    S.gems += n * DATA.pass.dailyGems; econ('gems', 'pass', n * DATA.pass.dailyGems);
  }
  S.lastDaily = d;
  // D36: at most one task per kind.
  const kinds = [...new Set(DATA.dailyPool.map(x => x.k))].sort(() => Math.random() - 0.5).slice(0, 3);
  S.day = { tasks: kinds.map(k => { const opts = DATA.dailyPool.filter(x => x.k === k); return { ...opts[rnd(0, opts.length - 1)], p: 0, got: false }; }), bonus: false };
  S.cal = S.cal || { i: first ? 0 : -1, got: false, claimed: [] };
  S.cal.claimed = S.cal.claimed || [];
  if (!first) { S.cal.i = (S.cal.i + 1) % 7; if (S.cal.i === 0) S.cal.claimed = []; S.cal.got = false; }
  return true;
}

// ---------- Paket C: daily tasks, calendar, chests, bubbles, storage, album ----------
function seen(c, l) { S.seen = S.seen || {}; const k = c + '_' + l; if (S.seen[k]) return false; S.seen[k] = 1; return true; }
function prog(k) {
  if (!S.day) return;
  S.day.tasks.forEach(x => { if (x.k === k && x.p < x.n) x.p++; });
}
// A6/D38: chest and joker go to the next free cell or wait in S.inbox; nothing is converted.
function grant(r) {
  if (r.gems) { S.gems += r.gems; econ('gems', 'reward', r.gems); }
  if (r.coins) { S.coins += r.coins; econ('coins', 'reward', r.coins); }
  if (r.energy) S.energy += r.energy;
  for (const k of ['chest', 'joker']) {
    if (!r[k]) continue;
    const item = k === 'chest' ? { chest: 1 } : { joker: 1 };
    const i = nearestEmpty(centerIdx());
    if (i < 0) { S.inbox.push(item); toast(t('inboxWait')); } else { S.board[i] = item; flash(i); }
  }
  sfx('buy');
}
const rewardTxt = r => [r.gems && `${r.gems} 💎`, r.coins && `${r.coins} 🪙`, r.energy && `${r.energy} ⚡`, r.chest && '🎁', r.joker && '🃏'].filter(Boolean).join(' ');
function canClaim() {
  return (S.cal && !S.cal.got && S.cal.i >= 0) || (S.day && (S.day.tasks.some(x => x.p >= x.n && !x.got) || (!S.day.bonus && S.day.tasks.every(x => x.got))));
}
function albumReady() { return Object.keys(DATA.chains).some(c => chainDone(c) && !(S.album || {})[c]); }
const chainDone = c => [...Array(MAX_L + 1).keys()].every(l => (S.seen || {})[c + '_' + l]);
function badges() {
  $('btn-daily').querySelector('i').hidden = !(S.tut >= 5 && canClaim());
  $('btn-album').querySelector('i').hidden = !(S.tut >= 5 && albumReady());
}
function openDaily() {
  if (!S.day) return;
  const claimed = S.cal.claimed || [];
  const cal = DATA.calendar.map((r, k) => {
    const st = claimed.includes(k) ? 'got' : k === S.cal.i ? 'now' : k < S.cal.i ? 'miss' : ''; // I17
    return `<div class="day ${st}"><small>${t('dayN', { n: k + 1 })}</small><div>${rewardTxt(r)}</div>${st === 'now' ? `<button data-cal="1">${t('claim')}</button>` : st === 'got' ? '✅' : ''}</div>`;
  }).join('');
  const tasks = S.day.tasks.map((x, k) => {
    const ok = x.p >= x.n;
    return `<div class="prod ${x.got ? 'done' : ''}"><div><b>${t('d_' + x.k, { n: x.n })}</b><div class="pbar"><i style="width:${100 * Math.min(1, x.p / x.n)}%"></i></div><small>${Math.min(x.p, x.n)}/${x.n} · ${rewardTxt(x.reward)}</small></div>
      <button data-dt="${k}" ${!ok || x.got ? 'disabled' : ''}>${x.got ? t('claimed') : t('claim')}</button></div>`;
  }).join('');
  const all = S.day.tasks.every(x => x.got);
  openModal(`<h2 class="amyh"><img class="amy" src="${src('amy_face')}" alt="">${t('dailyH')}</h2>${tasks}
    <div class="prod ${S.day.bonus ? 'done' : ''}"><div><b>${t('allBonus', { g: DATA.dailyAllBonus.gems })}</b></div><button data-dt="all" ${!all || S.day.bonus ? 'disabled' : ''}>${S.day.bonus ? t('claimed') : t('claim')}</button></div>
    <h3>${t('calH')}</h3><div class="cal">${cal}</div>`);
}
function claimDaily(k) {
  if (k === 'cal') { if (S.cal.got || S.cal.i < 0) return; S.cal.got = true; S.cal.claimed = (S.cal.claimed || []).concat(S.cal.i); grant(DATA.calendar[S.cal.i]); }
  else if (k === 'all') { if (S.day.bonus || !S.day.tasks.every(x => x.got)) return; S.day.bonus = true; grant(DATA.dailyAllBonus); }
  else { const x = S.day.tasks[k]; if (!x || x.got || x.p < x.n) return; x.got = true; grant(x.reward); }
  commit(); openDaily();
}
// A5/A27: one item fits an open order (one level below), overflow waits in S.inbox.
function openChest(i) {
  const chains = genChains();
  const want = [];
  S.orders.forEach(o => o.need.forEach((x, j) => { if (!o.got[j] && chains.includes(x.c) && x.l <= MAX_L - 1) want.push(x); }));
  const items = [];
  for (let k = 0; k < DATA.chestItems; k++) {
    if (k === 0 && want.length) { const w = want[rnd(0, want.length - 1)]; items.push({ c: w.c, l: Math.max(0, w.l - 1) }); continue; }
    items.push({ c: chains[rnd(0, chains.length - 1)], l: rnd(0, Math.min(3, 1 + Math.floor(S.level / 4))) });
  }
  S.board[i] = null;
  let waiting = 0;
  items.forEach((it, k) => {
    seen(it.c, it.l);
    const j = k === 0 ? i : nearestEmpty(i);
    if (j < 0) { S.inbox.push(it); waiting++; return; }
    S.board[j] = it; flash(j);
  });
  burst(i, true); sfx('deliver'); toast(t('chestOpen') + (waiting ? ' ' + t('inboxWait') : '')); selected = -1;
  commit();
}
function maybeBubble(from, c, l) {
  if (S.level < X.bubbleMinLevel) return; // F10
  if (l < 2 || l >= MAX_L || Math.random() >= DATA.bubbleChance) return;
  const j = nearestEmpty(from);
  if (j < 0) return;
  S.board[j] = { bubble: { c, l }, left: DATA.bubbleSec * 1000 };
  flash(j);
}
// A29/D23: cheaper bubbles, low levels can also be paid with coins.
function openBubble(i) {
  const b = S.board[i]; if (!b || !b.bubble) return;
  const g = X.bubbleCost(b.bubble.l);
  const coins = b.bubble.l <= X.bubbleCoinMaxL ? X.bubbleCoins(b.bubble.l) : 0;
  openModal(`<div class="welcome"><div class="bub big">${icon(b.bubble.c, b.bubble.l)}</div><h2>${t('bubbleH')}</h2>
    <p>${t('bubbleText', { name: nm(b.bubble.c, b.bubble.l), g, s: Math.max(0, Math.ceil(b.left / 1000)) })}</p><button id="btn-go">${t('keep')} 💎 ${g}</button>
    ${coins ? `<button class="back" data-bubc="${i}">${t('keep')} 🪙 ${fmt(coins)}</button>` : ''}</div>`);
  $('btn-go').onclick = () => keepBubble(i, 'gems');
}
function keepBubble(i, how) {
  const c = S.board[i];
  if (!c || !c.bubble) { closeModal(); return; }
  if (how === 'gems') {
    const g = X.bubbleCost(c.bubble.l);
    if (S.gems < g) { toast(t('noGemsN', { n: g - S.gems })); sfx('error'); return; }
    S.gems -= g; econ('gems', 'bubble', -g);
  } else {
    const n = X.bubbleCoins(c.bubble.l);
    if (c.bubble.l > X.bubbleCoinMaxL) return;
    if (S.coins < n) { toast(t('noCoinsN', { n: fmt(n - S.coins) })); sfx('error'); return; }
    S.coins -= n; econ('coins', 'bubble', -n);
  }
  S.board[i] = { c: c.bubble.c, l: c.bubble.l }; sfx('buy'); burst(i, true); closeModal();
}
// A30/D39: extra storage slots for coins or gems.
function openStore() {
  const sc = S.board[selected];
  const ok = sc && (sc.c || sc.joker || sc.chest);
  const canIn = ok && S.store.length < storeCap();
  const slots = [...Array(storeCap()).keys()].map(k => {
    const it = S.store[k];
    return `<div class="slot">${it ? `<span>${cellHtml(it)}</span><button data-out="${k}">${t('storeOut')}</button>` : ''}</div>`;
  }).join('');
  const e = S.storeExtra || 0;
  const more = e < X.storeSlotCoins.length ? `<h3>${t('slotMore')}</h3><div class="opts"><button class="opt" data-slot="coins">🪙 ${fmt(X.storeSlotCoins[e])}</button><button class="opt" data-slot="gems">💎 ${fmt(X.storeSlotGems[e])}</button></div>` : '';
  const inbox = S.inbox.length ? `<p class="note">${t('inboxN', { n: S.inbox.length })}</p>` : '';
  openModal(`<h2>📦 ${t('storeH')} ${S.store.length}/${storeCap()}</h2>${inbox}
    ${ok ? `<button class="back" data-in="1" ${canIn ? '' : 'disabled'}>${canIn ? `${t('storeIn')}: ${itemName(sc)}` : t('storeFull')}</button>` : `<p class="note">${t('storeEmpty')}</p>`}
    <div class="slots">${slots}</div>${more}`);
}
function buySlot(how) {
  const e = S.storeExtra || 0;
  if (e >= X.storeSlotCoins.length) return;
  if (how === 'coins') {
    const c = X.storeSlotCoins[e];
    if (S.coins < c) { toast(t('noCoinsN', { n: fmt(c - S.coins) })); sfx('error'); return; }
    S.coins -= c; econ('coins', 'slot', -c);
  } else {
    const g = X.storeSlotGems[e];
    if (S.gems < g) { toast(t('noGemsN', { n: fmt(g - S.gems) })); sfx('error'); return; }
    S.gems -= g; econ('gems', 'slot', -g);
  }
  S.storeExtra = e + 1; sfx('buy'); commit(); openStore();
}
function storeInIdx(i, reopen) {
  const sc = S.board[i];
  if (!sc || !(sc.c || sc.joker || sc.chest) || S.store.length >= storeCap()) { if (sc && !sc.gen) toast(t('storeFull')); bounce(i); return false; }
  S.store.push(sc); S.board[i] = null; if (selected === i) selected = -1; sfx('spawn'); S.ui.store = 1; commit();
  if (reopen) openStore(); else toast(t('stored'));
  return true;
}
function storeIn() { storeInIdx(selected, true); }
function storeOut(k) {
  const i = nearestEmpty(centerIdx());
  if (i < 0) { toast(t('boardFullShort')); sfx('error'); return; }
  S.board[i] = S.store.splice(k, 1)[0]; flash(i); sfx('spawn'); commit(); openStore();
}
function openAlbum() {
  S.album = S.album || {};
  const rows = Object.keys(DATA.chains).map(c => {
    const cells = [...Array(MAX_L + 1).keys()].map(l => `<span class="${(S.seen || {})[c + '_' + l] ? '' : 'unk'}">${icon(c, l)}</span>`).join('');
    const done = chainDone(c), got = S.album[c];
    return `<div class="alb"><b>${chainNm(c)}</b><div>${cells}</div>${done && !got ? `<button data-alb="${c}">${t('claim')} +${DATA.albumGems} 💎</button>` : got ? '✅' : ''}</div>`;
  }).join('');
  openModal(`<h2>📖 ${t('albumH')}</h2><p class="note">${t('albumNote', { g: DATA.albumGems })}</p>${rows}`);
}
function claimAlbum(c) {
  if (!chainDone(c) || S.album[c]) return;
  S.album[c] = 1; S.gems += DATA.albumGems; econ('gems', 'album', DATA.albumGems); sfx('level'); toast(t('albumDone', { name: chainNm(c), g: DATA.albumGems })); commit(); openAlbum();
}

// ---------- time: tick, background, resume ----------
let lastTick = now(), lastInput = now(), tickN = 0;
// A28/I42: bubble timers only run while the app is visible and no window is open.
function tickBubbles(dt) {
  let gone = false;
  S.board.forEach((c, i) => {
    if (!c || !c.bubble) return;
    c.left -= dt;
    if (c.left <= 0) { S.board[i] = null; if (selected === i) selected = -1; gone = true; }
  });
  return gone;
}
// D19: boosts only count down while the game is in front.
function resume() {
  const gap = now() - (S.seenTs || now());
  if (gap > 5000) for (const k in S.boosts) if (S.boosts[k] > S.seenTs) S.boosts[k] += gap;
  S.seenTs = now();
}
// A49/G18: the 1 s tick only touches timers; full render only when the state changed.
function tick() {
  const t0 = now(), dt = Math.min(2000, Math.max(0, t0 - lastTick));
  lastTick = t0;
  if (document.hidden) return;
  S.seenTs = t0;
  let dirty = daily();
  if ($('modal').hidden && tickBubbles(dt)) dirty = true;
  // A23/F31: idle hint after X.idleSec without input.
  if (P.hint && !drag && $('modal').hidden && S.tut >= 1 && t0 - lastInput > X.idleSec * 1000 && pulseUntil < t0) {
    const p = S.tut === 0 ? null : mergePair();
    if (p) { pulse(p, 2500); lastInput = t0; }
  }
  if (fullHelpUntil && fullHelpUntil < t0) { fullHelpUntil = 0; dirty = true; }
  if (dirty) { commit(); return; }
  if (++tickN % 10 === 0) save();
  hud(); renderBoard(); badges();
}

// ---------- input ----------
let drag = null, lastTap = { i: -1, ts: 0 };
const STORE_T = -2;
// A31/A42: drop targets outside the board: storage button and order cards.
function dropTarget(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) return { i: -1 };
  if (el.closest('#btn-store')) return { store: 1, i: STORE_T };
  const card = el.closest('.order');
  if (card) return { order: +card.dataset.k, i: -1 };
  const cell = el.closest('.cell');
  return { i: cell ? +cell.dataset.i : -1 };
}
const cellAt = (x, y) => dropTarget(x, y).i;
function endDrag() {
  if (!drag) return null;
  const d = drag; drag = null;
  $('ghost').hidden = true;
  const el = $('board').children[d.i];
  if (el) el.classList.remove('lift');
  document.querySelectorAll('.cell.match').forEach(e => e.classList.remove('match'));
  return d;
}
function nearestSame(i) {
  const a = S.board[i];
  let best = -1, bd = 1e9;
  S.board.forEach((c, j) => {
    if (j === i || !c || !c.c || c.c !== a.c || c.l !== a.l) return;
    const d = dist(i, j);
    if (d < bd) { bd = d; best = j; }
  });
  return best;
}

$('board').addEventListener('pointerdown', e => {
  lastInput = now(); pulseUntil = 0;
  if (drag) return; // I7: ignore a second finger
  const cell = e.target.closest('.cell');
  if (!cell) return;
  const i = +cell.dataset.i;
  const c = S.board[i];
  if (!c) { // I35: tap on an empty cell moves the selected item there
    const s = S.board[selected];
    if (s && (s.c || s.joker)) drop(selected, i); else { selected = -1; render(); }
    return;
  }
  if (c.drift) { selected = i; render(); return; }
  drag = { i, x: e.clientX, y: e.clientY, moving: false, id: e.pointerId };
  try { $('board').setPointerCapture(e.pointerId); } catch (err) { /* pointer gone */ }
});

$('board').addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const g = $('ghost');
  if (!drag.moving && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) {
    drag.moving = true;
    const a = S.board[drag.i];
    const cell = $('board').children[drag.i];
    const w = cell.getBoundingClientRect().width * 1.15; // A14
    drag.half = w / 2;
    g.style.width = g.style.height = w + 'px';
    g.innerHTML = cellHtml(a);
    g.hidden = false;
    cell.classList.add('lift');
    S.board.forEach((c, j) => { // A13
      if (j === drag.i || !c) return;
      const m = a.joker ? c.c && c.l < MAX_L : a.c && c.c === a.c && c.l === a.l && c.l < MAX_L;
      if (m) $('board').children[j].classList.add('match');
    });
  }
  if (drag.moving) g.style.transform = `translate(${e.clientX - drag.half}px, ${e.clientY - drag.half}px)`;
});

$('board').addEventListener('pointerup', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const d = endDrag();
  lastInput = now();
  if (d.moving) {
    const tg = dropTarget(e.clientX, e.clientY);
    if (tg.store) { storeInIdx(d.i, false); return; }
    if (tg.order !== undefined) { if (!deliverItem(tg.order, d.i)) bounce(d.i); return; }
    drop(d.i, tg.i);
    return;
  }
  const c = S.board[d.i];
  if (!c) return;
  if (c.gen) { selected = d.i; spawn(d.i); return; }
  if (c.chest) { selected = d.i; openChest(d.i); return; }
  if (c.bubble) { selected = d.i; openBubble(d.i); return; }
  // A16: double tap merges with the nearest equal item.
  if (lastTap.i === d.i && now() - lastTap.ts < X.doubleTapMs && c.c) {
    lastTap = { i: -1, ts: 0 };
    const j = nearestSame(d.i);
    if (j >= 0) { drop(d.i, j); return; }
  }
  lastTap = { i: d.i, ts: now() };
  // I35: selected item plus tap on an equal item (or joker on any item) merges.
  const s = S.board[selected];
  if (selected !== d.i && s && ((s.c && c.c && s.c === c.c && s.l === c.l) || (s.joker && c.c))) { drop(selected, d.i); return; }
  selected = d.i; render();
});
const cancelDrag = () => { if (endDrag()) render(); }; // I7
$('board').addEventListener('pointercancel', cancelDrag);
$('board').addEventListener('lostpointercapture', e => { if (drag && e.pointerId === drag.id) cancelDrag(); });

$('orders').addEventListener('click', e => {
  const b = e.target.closest('[data-deliver]');
  if (b) { deliver(+b.dataset.deliver); return; }
  const sw = e.target.closest('[data-swap]');
  if (sw) { swapOrder(+sw.dataset.swap); return; }
  const p = e.target.closest('[data-part]');
  if (p) { const [k, j] = p.dataset.part.split(':').map(Number); deliverPart(k, j); }
});

$('strip').addEventListener('click', e => {
  const fh = e.target.closest('[data-fh]');
  if (fh) { fullHelp(fh.dataset.fh); return; }
  if (e.target.closest('#info') && $('info').classList.contains('goal')) openPlace();
});

$('modal-body').addEventListener('click', e => {
  const m = e.target.closest('[data-money]');
  if (m) buyMoney(productById(m.dataset.money));
  const g = e.target.closest('[data-gem]');
  if (g) buyGem(allGemItems().find(x => x.id === g.dataset.gem));
  const co = e.target.closest('[data-coin]');
  if (co) buyCoins(co.dataset.coin);
  const dt = e.target.closest('[data-dt]');
  if (dt) claimDaily(dt.dataset.dt === 'all' ? 'all' : +dt.dataset.dt);
  if (e.target.closest('[data-cal]')) claimDaily('cal');
  if (e.target.closest('[data-in]')) storeIn();
  const so = e.target.closest('[data-out]');
  if (so) storeOut(+so.dataset.out);
  const sl = e.target.closest('[data-slot]');
  if (sl) buySlot(sl.dataset.slot);
  const bc = e.target.closest('[data-bubc]');
  if (bc) keepBubble(+bc.dataset.bubc, 'coins');
  const al = e.target.closest('[data-alb]');
  if (al) claimAlbum(al.dataset.alb);
  const tk = e.target.closest('[data-task]');
  if (tk) doTask(+tk.dataset.task);
  if (e.target.closest('[data-help]')) openHelp();
  if (e.target.closest('[data-retut]')) replayTut();
  const wl = e.target.closest('[data-wlang]');
  if (wl) { P.lang = wl.dataset.wlang; savePrefs(); applyStaticTexts(); render(); showWelcome(); }
  const pl = e.target.closest('[data-place]');
  if (pl) { const k = +pl.dataset.place; if (k === S.zone) openPlace(); else if (k < S.zone) showResident(k, false); else { toast(t('locked')); sfx('error'); } }
  const pr = e.target.closest('[data-pref]');
  if (pr) {
    const k = pr.dataset.pref;
    P[k] = k === 'lang' ? pr.dataset.val : pr.dataset.val === 'true';
    savePrefs(); applyStaticTexts(); render(); openSettings(); sfx('spawn');
  }
});

// F11: the gem counter opens the shop only after the tutorial.
$('btn-shop').onclick = openShop;
$('btn-daily').onclick = openDaily;
$('btn-store').onclick = openStore;
$('btn-album').onclick = openAlbum;
$('btn-island').onclick = openIsland;
$('btn-settings').onclick = openSettings;
$('res-gems').onclick = () => { if (S.tut >= 5) openShop(); };
$('btn-sell').onclick = sell;
if ($('btn-undo')) $('btn-undo').onclick = doUndo;
$('modal-close').onclick = closeModal;
$('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('modal').hidden) closeModal(); }); // I39

// E2/G16/F28/D19: save on hide, resume and day change on return.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (S.tut < 5) S.funnel.quitTut = S.tut;
    S.funnel.lastHide = now();
    save();
  } else {
    lastTick = now();
    resume();
    daily();
    commit();
  }
});
window.addEventListener('pagehide', save);

function showWelcome() {
  const lang = ['en', 'de'].map(l => `<button class="opt ${P.lang === l ? 'on' : ''}" data-wlang="${l}">${l === 'en' ? 'English' : 'Deutsch'}</button>`).join(''); // F34
  openModal(`<div class="welcome"><img src="${src('amy_full')}" alt="${t('amyAlt')}"><h2>${t('hiAmy')}</h2><p>${t('hiAmyText')}</p>
    <div class="opts wl">${lang}</div><button id="btn-go">${t('letsGo')}</button></div>`);
  $('btn-go').onclick = closeModal;
}

load();
S.board.forEach(c => { if (c && c.c) seen(c.c, c.l); });
resume();
applyStaticTexts();
daily();
fillOrders();
commit();
if (S.tut === 0 && !S.metAmy) {
  S.metAmy = true; save();
  showWelcome();
}
setInterval(tick, 1000);
setInterval(autoMergeTick, 700);
window.__game = {
  get state() { return S; }, spawn, drop, deliver, deliverPart, deliverItem, buyGem, buyMoney, buyCoins, doTask, sell, openChest,
  makeOrder, addXp, grant, swapOrder, storeInIdx, daily, tick, doUndo, findItems, placeGenerator
};
