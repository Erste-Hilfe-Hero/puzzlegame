'use strict';
const SAVE_KEY = 'amy-tasty-v1';
const MAX_L = 7;
const $ = id => document.getElementById(id);
const now = () => Date.now();
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const today = () => new Date().toISOString().slice(0, 10);

let S = null;
let selected = -1;

// ---------- prefs, texts, sound ----------
const PREFS_KEY = 'amy-tasty-prefs';
let P = { lang: (navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en', sound: true };
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

let AC = null;
function sfx(kind) {
  if (!P.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const notes = { spawn: [660], merge: [523, 784], deliver: [784, 1046, 1318], level: [523, 659, 784, 1046], error: [180], buy: [988, 1318] }[kind];
    notes.forEach((f, k) => {
      const o = AC.createOscillator(), gn = AC.createGain(), at = AC.currentTime + k * 0.07;
      o.type = kind === 'error' ? 'square' : 'triangle';
      o.frequency.value = f;
      gn.gain.setValueAtTime(0.0001, at);
      gn.gain.exponentialRampToValueAtTime(0.18, at + 0.01);
      gn.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
      o.connect(gn).connect(AC.destination);
      o.start(at); o.stop(at + 0.18);
    });
  } catch (e) { /* audio unavailable */ }
}

function newState() {
  const s = {
    v: 1, level: 1, xp: 0, energy: DATA.energyStart, energyTs: now(), coins: 0, gems: 10,
    board: new Array(DATA.cols * DATA.rows).fill(null), rows: DATA.rows,
    orders: [], zone: 0, tasksDone: [],
    perm: {}, boosts: {}, passUntil: 0, starterBought: false, lastDaily: '', tut: 0, stats: { merges: 0, orders: 0 }
  };
  s.board[idx(3, 3, s)] = { gen: 'bakery' };
  s.board[idx(2, 2, s)] = { c: 'bakery', l: 0 };
  s.board[idx(2, 4, s)] = { c: 'bakery', l: 0 };
  return s;
}

function idx(r, c) { return r * DATA.cols + c; }
function rc(i) { return [Math.floor(i / DATA.cols), i % DATA.cols]; }

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) S = JSON.parse(raw);
  } catch (e) { S = null; }
  if (!S || S.v !== 1) S = newState();
  if (S.orders.length === 0) {
    S.orders.push({ who: '👩‍🌾', need: [{ c: 'bakery', l: 1 }], coins: 10, xp: 8 });
    fillOrders();
  }
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ }
}

// ---------- economy ----------
const passActive = () => S.passUntil > now();
const boostOn = k => (S.boosts[k] || 0) > now();
const energyMax = () => DATA.energyMax + (S.perm.fountain ? 50 : 0) + (passActive() ? DATA.pass.energyBonus : 0);
const regenMs = () => DATA.energyRegenSec * 1000 / (S.perm.fountain ? 2 : 1);

function tickEnergy() {
  const max = energyMax();
  if (S.energy >= max) { S.energyTs = now(); return; }
  const n = Math.floor((now() - S.energyTs) / regenMs());
  if (n > 0) {
    S.energy = Math.min(max, S.energy + n);
    S.energyTs += n * regenMs();
  }
}

function addXp(x) {
  S.xp += x;
  while (S.xp >= DATA.xpForLevel(S.level)) {
    S.xp -= DATA.xpForLevel(S.level);
    S.level++;
    S.gems += DATA.levelUpGems;
    S.energy = Math.max(S.energy, energyMax());
    toast(t('levelUp', { n: S.level, g: DATA.levelUpGems })); sfx('level');
    for (const [key, ch] of Object.entries(DATA.chains)) {
      if (ch.unlock === S.level) placeGenerator(key);
    }
  }
}

function placeGenerator(key) {
  const i = S.board.findIndex(c => c === null);
  if (i < 0) { toast(t('genWait', { gen: genNm(key) })); S.pendingGen = key; return; }
  S.board[i] = { gen: key };
  toast(t('genNew', { gen: `${genNm(key)} ${DATA.chains[key].gen}` }));
}

function unlockedChains() {
  return Object.keys(DATA.chains).filter(k => DATA.chains[k].unlock <= S.level);
}

function makeOrder() {
  const chains = unlockedChains();
  const maxL = Math.min(6, 1 + Math.floor(S.level / 2));
  const n = S.level >= 3 && Math.random() < 0.5 ? 2 : 1;
  const need = [];
  for (let k = 0; k < n; k++) {
    const minL = S.perm.golden ? 1 : 0;
    need.push({ c: chains[rnd(0, chains.length - 1)], l: rnd(Math.max(minL, maxL - 2), Math.max(minL, maxL)) });
  }
  const coins = need.reduce((a, x) => a + 4 * Math.pow(2, x.l), 0);
  const xp = need.reduce((a, x) => a + 3 * (x.l + 1), 0);
  return { who: DATA.customers[rnd(0, DATA.customers.length - 1)], need, coins, xp };
}

function fillOrders() {
  const slots = 3 + (S.perm.orderSlot ? 1 : 0);
  while (S.orders.length < slots) S.orders.push(makeOrder());
}

function findItems(need) {
  const used = new Set();
  for (const x of need) {
    const i = S.board.findIndex((c, j) => c && !used.has(j) && c.c === x.c && c.l === x.l);
    if (i < 0) return null;
    used.add(i);
  }
  return [...used];
}

function deliver(k) {
  const o = S.orders[k];
  const cells = findItems(o.need);
  if (!cells) return;
  cells.forEach(i => { S.board[i] = null; });
  S.coins += o.coins;
  S.orders.splice(k, 1);
  S.stats.orders++;
  addXp(o.xp);
  fillOrders();
  if (S.pendingGen) { const g = S.pendingGen; S.pendingGen = null; placeGenerator(g); }
  toast(`+${o.coins} 🪙  +${o.xp} XP`); sfx('deliver');
  if (S.tut === 2) S.tut = 3;
  commit();
}

// ---------- board actions ----------
function nearestEmpty(from) {
  const [r0, c0] = rc(from);
  let best = -1, bd = 1e9;
  S.board.forEach((c, i) => {
    if (c !== null) return;
    const [r, cc] = rc(i);
    const d = Math.abs(r - r0) + Math.abs(cc - c0);
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

function spawn(genIdx) {
  tickEnergy();
  if (S.energy < 1) { toast(t('noEnergy')); sfx('error'); return; }
  const key = S.board[genIdx].gen;
  const count = boostOn('double') ? 2 : 1;
  let placed = 0;
  for (let k = 0; k < count; k++) {
    const i = nearestEmpty(genIdx);
    if (i < 0) break;
    let l = S.perm.golden ? 1 : 0;
    if (boostOn('lucky') && Math.random() < 0.1) l++;
    S.board[i] = { c: key, l };
    placed++;
    flash(i);
  }
  if (!placed) { toast(t('boardFull')); sfx('error'); return; }
  sfx('spawn');
  if (S.tut === 0) S.tut = 1;
  if (S.energy >= energyMax()) S.energyTs = now();
  S.energy--;
  commit();
}

function drop(from, to) {
  if (from === to || to < 0) return;
  const a = S.board[from], b = S.board[to];
  if (a && a.joker && b && b.c && b.l < MAX_L) {
    b.l++; S.board[from] = null; flash(to); S.stats.merges++; sfx('merge');
  } else if (a && b && a.c && b.c && a.c === b.c && a.l === b.l && a.l < MAX_L) {
    S.board[to] = { c: a.c, l: a.l + 1 }; S.board[from] = null; flash(to); S.stats.merges++; sfx('merge');
    if (S.tut === 1) S.tut = 2;
    if (a.l + 1 === MAX_L) toast(t('maxLevel', { name: nm(a.c, MAX_L) }));
  } else {
    S.board[to] = a; S.board[from] = b;
  }
  selected = to;
  commit();
}

function autoMergeTick() {
  if (!boostOn('autoMerge')) return;
  const seen = {};
  for (let i = 0; i < S.board.length; i++) {
    const c = S.board[i];
    if (!c || !c.c || c.l >= MAX_L) continue;
    const key = c.c + c.l;
    if (seen[key] !== undefined) { const sel = selected; drop(i, seen[key]); selected = sel; render(); return; }
    seen[key] = i;
  }
}

function sell() {
  const c = S.board[selected];
  if (!c || c.gen) return;
  const coins = c.joker ? 0 : DATA.sellCoins(c.l);
  S.board[selected] = null;
  S.coins += coins;
  selected = -1;
  toast(t('sold', { c: coins }));
  commit();
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

function buyGem(item) {
  if (S.gems < item.cost) { toast(t('noGems')); sfx('error'); return; }
  if (item.kind === 'perm' && S.perm[item.id]) return;
  if (item.kind === 'item') {
    const i = S.board.findIndex(c => c === null);
    if (i < 0) { toast(t('boardFullShort')); return; }
    S.board[i] = { joker: 1 };
  }
  S.gems -= item.cost;
  if (item.kind === 'energy') S.energy += 100;
  if (item.kind === 'boost') S.boosts[item.id] = Math.max(now(), S.boosts[item.id] || 0) + item.hours * 36e5;
  if (item.kind === 'perm') {
    S.perm[item.id] = true;
    if (item.id === 'bigBoard') { S.rows++; S.board.push(...new Array(DATA.cols).fill(null)); }
    if (item.id === 'orderSlot') fillOrders();
    if (item.id === 'golden') goldenFix();
  }
  toast(t('active', { name: `${item.icon} ${pName(item)}` })); sfx('buy');
  commit(); openShop();
}

// ---------- UI ----------
function icon(ch, l) {
  if (!DATA.chains[ch].img) return DATA.chains[ch].items[l];
  const key = `${ch}_${l}`;
  return `<img src="${(window.IMG && window.IMG[key]) || `img/${key}.png`}" alt="" draggable="false">`;
}

function cellHtml(c) {
  if (!c) return '';
  if (c.gen) return `<span class="gen">${DATA.chains[c.gen].gen}</span>`;
  if (c.joker) return '<span>🃏</span>';
  return `<span>${icon(c.c, c.l)}</span><b>${c.l + 1}</b>`;
}

function itemName(c) {
  if (c.gen) return t('genInfo', { gen: genNm(c.gen), chain: chainNm(c.gen) });
  if (c.joker) return t('jokerInfo');
  return t('itemInfo', { name: nm(c.c, c.l), l: c.l + 1, max: MAX_L + 1 });
}

function render() {
  tickEnergy();
  $('lvl').textContent = S.level;
  $('xp').style.width = Math.min(100, 100 * S.xp / DATA.xpForLevel(S.level)) + '%';
  $('energy').textContent = `${S.energy}/${energyMax()}`;
  if (S.energy < energyMax()) {
    const left = Math.max(0, regenMs() - (now() - S.energyTs));
    $('energy-timer').textContent = ` ${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
  } else $('energy-timer').textContent = '';
  $('coins').textContent = S.coins;
  $('gems').textContent = S.gems;

  const boosts = [];
  for (const g of DATA.gemShop.filter(x => x.kind === 'boost')) {
    if (boostOn(g.id)) boosts.push(`${g.icon} ${Math.ceil((S.boosts[g.id] - now()) / 60000)}m`);
  }
  if (passActive()) boosts.push(`🎫 ${Math.ceil((S.passUntil - now()) / 864e5)}d`);
  $('boosts').textContent = boosts.join('   ');

  const wanted = new Set();
  $('orders').innerHTML = S.orders.map((o, k) => {
    const ok = findItems(o.need);
    const parts = o.need.map(x => {
      const have = S.board.some(c => c && c.c === x.c && c.l === x.l);
      S.board.forEach((c, i) => { if (c && c.c === x.c && c.l === x.l) wanted.add(i); });
      return `<span class="need ${have ? 'have' : ''}">${icon(x.c, x.l)}<i>${x.l + 1}</i></span>`;
    }).join('');
    return `<div class="order ${ok ? 'ready' : ''}"><div class="who">${o.who}</div><div class="needs">${parts}</div>
      ${ok ? `<button data-deliver="${k}">${t('deliver')}</button>` : `<small>🪙${o.coins}</small>`}</div>`;
  }).join('');

  const board = $('board');
  board.style.gridTemplateRows = `repeat(${S.rows}, 1fr)`;
  if (board.children.length !== S.board.length) {
    board.innerHTML = S.board.map((_, i) => `<div class="cell" data-i="${i}"></div>`).join('');
  }
  S.board.forEach((c, i) => {
    const el = board.children[i];
    const html = cellHtml(c);
    if (el.innerHTML !== html) el.innerHTML = html;
    el.classList.toggle('sel', i === selected);
    el.classList.toggle('wanted', wanted.has(i));
    el.classList.toggle('max', !!(c && c.c && c.l === MAX_L));
  });

  const sc = S.board[selected];
  $('info').textContent = sc ? itemName(sc) : t('hint');
  renderTut();
  $('btn-sell').hidden = !(sc && !sc.gen);
  if (sc && !sc.gen) $('btn-sell').textContent = t('sell', { c: sc.joker ? 0 : DATA.sellCoins(sc.l) });
}

function commit() { save(); render(); }

let toastT = 0;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.hidden = true; }, 2200);
}

function flash(i) {
  requestAnimationFrame(() => {
    const el = $('board').children[i];
    if (!el) return;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  });
}

function openModal(html) { $('modal-body').innerHTML = html; $('modal').hidden = false; }
function closeModal() { $('modal').hidden = true; if (S.tut === 4) S.tut = 5; commit(); }

function renderTut() {
  document.querySelectorAll('.hl').forEach(el => el.classList.remove('hl'));
  const box = $('tut');
  if (S.tut >= 4) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = `<img class="amy" src="img/amy_face.png" alt=""><span>${t('tut' + S.tut)}</span>`;
  let target = null;
  if (S.tut === 0) target = $('board').children[S.board.findIndex(c => c && c.gen === 'bakery')];
  if (S.tut === 2) target = document.querySelector('[data-deliver]');
  if (S.tut === 3) target = $('btn-island');
  if (target) target.classList.add('hl');
}

function openSettings() {
  const opt = (k, v, label) => `<button class="opt ${P[k] === v ? 'on' : ''}" data-pref="${k}" data-val="${v}">${label}</button>`;
  openModal(`<h2>${t('settings')}</h2>
    <h3>${t('language')}</h3><div class="opts">${opt('lang', 'en', 'English')}${opt('lang', 'de', 'Deutsch')}</div>
    <h3>${t('sound')}</h3><div class="opts">${opt('sound', true, t('on'))}${opt('sound', false, t('off'))}</div>
    <p class="links"><a href="https://play.nyrathen.com/legal/tasty-island-privacy.${P.lang}.html" target="_blank" rel="noopener">${t('privacy')}</a> · <a href="mailto:lords.azz6@gmail.com">${t('support')}</a></p>`);
}

function applyStaticTexts() {
  document.documentElement.lang = P.lang;
  $('btn-shop').textContent = t('shop');
  $('btn-island').textContent = '🏝️ ' + t('island');
}

function openShop() {
  const money = p => `<div class="prod"><div><b>${pName(p)}</b>${p.tag ? `<em>${pTag(p.tag)}</em>` : ''}${pDesc(p) ? `<small>${pDesc(p)}</small>` : ''}</div>
    <button data-money="${p.id}" ${p.id === 'starter' && S.starterBought ? 'disabled' : ''}>${p.id === 'starter' && S.starterBought ? t('owned') : priceOf(p)}</button></div>`;
  const gem = g => {
    const owned = g.kind === 'perm' && S.perm[g.id];
    return `<div class="prod"><div><b>${g.icon} ${pName(g)}</b><small>${pDesc(g)}</small></div>
      <button data-gem="${g.id}" ${owned ? 'disabled' : ''}>${owned ? t('owned') : `💎 ${g.cost}`}</button></div>`;
  };
  openModal(`<h2 class="amyh"><img class="amy" src="img/amy_face.png" alt="">${t('shop')}</h2>${NATIVE ? '' : `<p class="note">${t('shopNote')}</p>`}
    <h3>${t('offers')}</h3>${money(DATA.starter)}${money(DATA.pass)}
    <h3>${t('power')}</h3>${DATA.gemShop.map(gem).join('')}
    <h3>${t('gemsH')}</h3>${DATA.money.map(money).join('')}`);
}

function openIsland() {
  const z = DATA.zones[S.zone];
  if (S.tut === 3) S.tut = 4;
  if (!z) { openModal(`<h2>${t('island')}</h2><p>${t('allDone')}</p>`); return; }
  const rows = z.tasks.map((task, k) => {
    const done = S.tasksDone.includes(k);
    return `<div class="prod ${done ? 'done' : ''}"><div><b>${done ? '✅' : '🔨'} ${taskNm(S.zone, k)}</b></div>
      <button data-task="${k}" ${done ? 'disabled' : ''}>${done ? t('done') : `🪙 ${task.cost}`}</button></div>`;
  }).join('');
  const tip = S.tut === 4 ? `<p class="tut-inline">${t('tut4')}</p>` : '';
  openModal(`<h2>📍 ${z.name}</h2>${tip}<p class="note">${t('placeNote', { i: S.zone + 1, n: DATA.zones.length, d: S.tasksDone.length, t: z.tasks.length, g: z.bonusGems })}</p>${rows}`);
}

function doTask(k) {
  const z = DATA.zones[S.zone];
  const task = z && z.tasks[k];
  if (!task) return;
  if (S.tasksDone.includes(k)) return;
  if (S.coins < task.cost) { toast(t('noCoins')); sfx('error'); return; }
  S.coins -= task.cost;
  sfx('buy');
  if (S.tut === 4) S.tut = 5;
  S.tasksDone.push(k);
  addXp(10);
  if (S.tasksDone.length === z.tasks.length) {
    S.gems += z.bonusGems;
    S.zone++; S.tasksDone = [];
    toast(t('restored', { name: z.name, g: z.bonusGems }));
  } else toast(`${taskNm(S.zone, k)} ✅`);
  commit(); openIsland();
}

function daily() {
  if (S.lastDaily === today()) return;
  const g = DATA.dailyGems + (passActive() ? DATA.pass.dailyGems : 0);
  if (S.lastDaily) { S.gems += g; toast(t('daily', { g })); }
  S.lastDaily = today();
}

// ---------- input ----------
let drag = null;
function cellAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const cell = el && el.closest('.cell');
  return cell ? +cell.dataset.i : -1;
}

$('board').addEventListener('pointerdown', e => {
  const cell = e.target.closest('.cell');
  if (!cell) return;
  const i = +cell.dataset.i;
  if (!S.board[i]) { selected = -1; render(); return; }
  drag = { i, x: e.clientX, y: e.clientY, moving: false };
  $('board').setPointerCapture(e.pointerId);
});

$('board').addEventListener('pointermove', e => {
  if (!drag) return;
  const g = $('ghost');
  if (!drag.moving && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) {
    drag.moving = true;
    g.innerHTML = cellHtml(S.board[drag.i]);
    g.hidden = false;
    $('board').children[drag.i].classList.add('lift');
  }
  if (drag.moving) g.style.transform = `translate(${e.clientX - 28}px, ${e.clientY - 28}px)`;
});

$('board').addEventListener('pointerup', e => {
  if (!drag) return;
  const d = drag; drag = null;
  $('ghost').hidden = true;
  $('board').children[d.i].classList.remove('lift');
  if (d.moving) { drop(d.i, cellAt(e.clientX, e.clientY)); return; }
  const c = S.board[d.i];
  if (c && c.gen) { selected = d.i; spawn(d.i); }
  else { selected = d.i; render(); }
});

$('orders').addEventListener('click', e => {
  const b = e.target.closest('[data-deliver]');
  if (b) deliver(+b.dataset.deliver);
});

$('modal-body').addEventListener('click', e => {
  const m = e.target.closest('[data-money]');
  if (m) buyMoney(productById(m.dataset.money));
  const g = e.target.closest('[data-gem]');
  if (g) buyGem(DATA.gemShop.find(x => x.id === g.dataset.gem));
  const tk = e.target.closest('[data-task]');
  if (tk) doTask(+tk.dataset.task);
  const pr = e.target.closest('[data-pref]');
  if (pr) {
    P[pr.dataset.pref] = pr.dataset.pref === 'sound' ? pr.dataset.val === 'true' : pr.dataset.val;
    savePrefs(); applyStaticTexts(); render(); openSettings(); sfx('spawn');
  }
});

$('btn-shop').onclick = openShop;
$('btn-island').onclick = openIsland;
$('btn-settings').onclick = openSettings;
$('btn-sell').onclick = sell;
$('modal-close').onclick = closeModal;
$('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

load();
if (S.tut === undefined) S.tut = 5;
applyStaticTexts();
daily();
fillOrders();
commit();
if (S.tut === 0 && !S.metAmy) {
  S.metAmy = true; save();
  openModal(`<div class="welcome"><img src="img/amy_full.png" alt="Amy"><h2>${t('hiAmy')}</h2><p>${t('hiAmyText')}</p><button id="btn-go">${t('letsGo')}</button></div>`);
  $('btn-go').onclick = closeModal;
}
setInterval(render, 1000);
setInterval(autoMergeTick, 700);
window.__game = { get state() { return S; }, spawn, drop, deliver, buyGem, buyMoney, doTask };
