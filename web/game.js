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
    toast(t('levelUp', { n: S.level, g: DATA.levelUpGems })); sfx('level'); setTimeout(() => { amySay('amyLevel'); fly($('lvl'), 'gems', '💎', 3); }, 400);
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
  const who = S.zone > 0 && Math.random() < 0.4 ? 'res_' + rnd(0, Math.min(S.zone, DATA.residents.length) - 1) : DATA.customers[rnd(0, DATA.customers.length - 1)];
  return { who, need, coins, xp };
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
  const card = $('orders').children[k];
  fly(card, 'coins', '🪙', Math.min(6, 2 + Math.floor(o.coins / 10)));
  fly(card, 'xp', '⭐', 2);
  if (Math.random() < 0.5) amySay('amyOrder');
  cells.forEach(i => { S.board[i] = null; });
  S.coins += o.coins;
  S.orders.splice(k, 1);
  S.stats.orders++; prog('deliver');
  addXp(o.xp);
  fillOrders();
  if (S.pendingGen) { const g = S.pendingGen; S.pendingGen = null; placeGenerator(g); }
  toast(`+${o.coins} 🪙  +${o.xp} XP`); sfx('deliver');
  if (S.tut === 2) S.tut = 3;
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
  const [x0, y0] = center(fromEl), [x1, y1] = center(to);
  for (let k = 0; k < n; k++) {
    const f = document.createElement('i'); f.className = 'fly'; f.textContent = glyph;
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
function amySay(key) {
  const a = $('amy-pop'); if (!a) return;
  const lines = t(key).split('|');
  a.querySelector('span').textContent = lines[rnd(0, lines.length - 1)];
  a.hidden = false; a.classList.remove('in'); void a.offsetWidth; a.classList.add('in');
  clearTimeout(amyT); amyT = setTimeout(() => { a.hidden = true; }, 2400);
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
    seen(key, l); prog('spawn');
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
    b.l++; seen(b.c, b.l); prog('merge'); S.board[from] = null; flash(to); burst(to, true); S.stats.merges++; sfx('merge');
  } else if (a && b && a.c && b.c && a.c === b.c && a.l === b.l && a.l < MAX_L) {
    S.board[to] = { c: a.c, l: a.l + 1 }; S.board[from] = null; flash(to); burst(to, a.l + 1 >= 5); S.stats.merges++; sfx('merge');
    seen(a.c, a.l + 1); prog('merge'); maybeBubble(to, a.c, a.l + 1);
    if (S.tut === 1) S.tut = 2;
    if (a.l + 1 === MAX_L) { toast(t('maxLevel', { name: nm(a.c, MAX_L) })); amySay('amyMax'); }
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
  const a = DATA.chains[ch].img;
  if (!a || (a !== true && l >= a)) return DATA.chains[ch].items[l];
  const key = `${ch}_${l}`;
  return `<img src="${(window.IMG && window.IMG[key]) || `img/${key}.png`}" alt="" draggable="false">`;
}

const ART = new Set(DATA.art || []);
function art(key, emoji) {
  return ART.has(key) ? `<img src="${(window.IMG && window.IMG[key]) || `img/${key}.png`}" alt="" draggable="false">` : emoji;
}

function cellHtml(c) {
  if (!c) return '';
  if (c.gen) return `<span class="gen">${art('gen_' + c.gen, DATA.chains[c.gen].gen)}</span>`;
  if (c.joker) return `<span>${art('joker', '🃏')}</span>`;
  if (c.chest) return `<span class="chest">${art('chest', '🎁')}</span>`;
  if (c.bubble) return `<span class="bub">${icon(c.bubble.c, c.bubble.l)}</span><b>${Math.max(0, Math.ceil((c.until - now()) / 1000))}</b>`;
  return `<span>${icon(c.c, c.l)}</span><b>${c.l + 1}</b>`;
}

function itemName(c) {
  if (c.gen) return t('genInfo', { gen: genNm(c.gen), chain: chainNm(c.gen) });
  if (c.joker) return t('jokerInfo');
  if (c.chest) return t('chest');
  if (c.bubble) return t('bubble');
  return t('itemInfo', { name: nm(c.c, c.l), l: c.l + 1, max: MAX_L + 1 });
}

function render() {
  tickEnergy();
  S.board.forEach((c, i) => { if (c && c.bubble && c.until < now()) { S.board[i] = null; if (selected === i) selected = -1; } });
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
    return `<div class="order ${ok ? 'ready' : ''}"><div class="who">${whoHtml(o.who)}</div><div class="needs">${parts}</div>
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
  $('btn-sell').hidden = !(sc && (sc.c || sc.joker));
  badges();
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

const zoneNm = z => (DE() ? DE().zones[z] : DATA.zones[z].name);
const resOf = z => ({ ...DATA.residents[z], ...(DE() ? DE().residents[z] : {}) });
const whoHtml = w => (String(w).startsWith('res_') ? art(w, DATA.residents[+w.slice(4)].emoji) : w);
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
      <button data-task="${k}" ${done ? 'disabled' : ''}>${done ? t('done') : `🪙 ${task.cost}`}</button></div>`;
  }).join('');
  const tip = S.tut === 4 ? `<p class="tut-inline">${t('tut4')}</p>` : '';
  const pct = Math.round(100 * S.tasksDone.length / z.tasks.length);
  openModal(`<div class="place-top"><div class="place-pic" style="--p:${S.tasksDone.length / z.tasks.length}">${art('place_' + S.zone, '🏠')}</div>
    <div><h2>${zoneNm(S.zone)}</h2><div class="pbar"><i style="width:${pct}%"></i></div><p class="note">${t('placeNote', { i: S.zone + 1, n: DATA.zones.length, d: S.tasksDone.length, t: z.tasks.length, g: z.bonusGems })}</p></div></div>
    <div class="say"><span class="face">${whoHtml('res_' + S.zone)}</span><p><b>${r.name}</b><br>${r.hi}</p></div>${tip}${rows}
    ${S.tut >= 5 ? `<button class="back" id="btn-map">🗺️ ${t('map')}</button>` : ''}`);
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
  if (S.coins < task.cost) { toast(t('noCoins')); sfx('error'); return; }
  S.coins -= task.cost;
  sfx('buy');
  if (S.tut === 4) S.tut = 5;
  S.tasksDone.push(k); prog('task');
  addXp(10);
  if (S.tasksDone.length === z.tasks.length) {
    S.gems += z.bonusGems;
    const done = S.zone;
    S.zone++; S.tasksDone = [];
    toast(t('restored', { name: zoneNm(done), g: z.bonusGems })); sfx('level');
    commit(); showResident(done, true); return;
  }
  toast(`${taskNm(S.zone, k)} ✅`);
  commit(); openPlace();
}

function daily() {
  if (S.lastDaily === today()) return;
  const first = !S.lastDaily;
  if (!first && passActive()) S.gems += DATA.pass.dailyGems;
  S.lastDaily = today();
  const pool = DATA.dailyPool.map((x, k) => k).sort(() => Math.random() - 0.5).slice(0, 3);
  S.day = { tasks: pool.map(k => ({ ...DATA.dailyPool[k], p: 0, got: false })), bonus: false };
  S.cal = S.cal || { i: first ? 0 : -1, got: false };
  if (!first) { S.cal.i = (S.cal.i + 1) % 7; S.cal.got = false; setTimeout(openDaily, 600); }
}

// ---------- Paket C: daily tasks, calendar, chests, bubbles, storage, album ----------
function seen(c, l) { S.seen = S.seen || {}; S.seen[c + '_' + l] = 1; }
function prog(k) {
  if (!S.day) return;
  S.day.tasks.forEach(x => { if (x.k === k && x.p < x.n) x.p++; });
}
function grant(r) {
  if (r.gems) S.gems += r.gems;
  if (r.coins) S.coins += r.coins;
  if (r.energy) S.energy += r.energy;
  if (r.joker || r.chest) {
    const i = S.board.findIndex(c => c === null);
    if (i < 0) { S.gems += r.chest ? 5 : 10; toast(t('boardFullShort')); } else { S.board[i] = r.chest ? { chest: 1 } : { joker: 1 }; flash(i); }
  }
  sfx('buy');
}
const rewardTxt = r => [r.gems && `${r.gems} 💎`, r.coins && `${r.coins} 🪙`, r.energy && `${r.energy} ⚡`, r.chest && art('chest', '🎁'), r.joker && art('joker', '🃏')].filter(Boolean).join(' ');
function canClaim() {
  return (S.cal && !S.cal.got && S.cal.i >= 0) || (S.day && (S.day.tasks.some(x => x.p >= x.n && !x.got) || (!S.day.bonus && S.day.tasks.every(x => x.got))));
}
function albumReady() { return Object.keys(DATA.chains).some(c => chainDone(c) && !(S.album || {})[c]); }
const chainDone = c => [...Array(MAX_L + 1).keys()].every(l => (S.seen || {})[c + '_' + l]);
function badges() {
  $('btn-daily').querySelector('i').hidden = !canClaim();
  $('btn-album').querySelector('i').hidden = !albumReady();
}
function openDaily() {
  if (!S.day) return;
  const cal = DATA.calendar.map((r, k) => {
    const st = k < S.cal.i || (k === S.cal.i && S.cal.got) ? 'got' : k === S.cal.i ? 'now' : '';
    return `<div class="day ${st}"><small>${t('dayN', { n: k + 1 })}</small><div>${rewardTxt(r)}</div>${st === 'now' ? `<button data-cal="1">${t('claim')}</button>` : st === 'got' ? '✅' : ''}</div>`;
  }).join('');
  const tasks = S.day.tasks.map((x, k) => {
    const ok = x.p >= x.n;
    return `<div class="prod ${x.got ? 'done' : ''}"><div><b>${t('d_' + x.k, { n: x.n })}</b><div class="pbar"><i style="width:${100 * Math.min(1, x.p / x.n)}%"></i></div><small>${Math.min(x.p, x.n)}/${x.n} · ${rewardTxt(x.reward)}</small></div>
      <button data-dt="${k}" ${!ok || x.got ? 'disabled' : ''}>${x.got ? t('claimed') : t('claim')}</button></div>`;
  }).join('');
  const all = S.day.tasks.every(x => x.got);
  openModal(`<h2 class="amyh"><img class="amy" src="img/amy_face.png" alt="">${t('dailyH')}</h2>${tasks}
    <div class="prod ${S.day.bonus ? 'done' : ''}"><div><b>${t('allBonus', { g: DATA.dailyAllBonus.gems })}</b></div><button data-dt="all" ${!all || S.day.bonus ? 'disabled' : ''}>${S.day.bonus ? t('claimed') : t('claim')}</button></div>
    <h3>${t('calH')}</h3><div class="cal">${cal}</div>`);
}
function claimDaily(k) {
  if (k === 'cal') { if (S.cal.got) return; S.cal.got = true; grant(DATA.calendar[S.cal.i]); }
  else if (k === 'all') { if (S.day.bonus || !S.day.tasks.every(x => x.got)) return; S.day.bonus = true; grant(DATA.dailyAllBonus); }
  else { const x = S.day.tasks[k]; if (!x || x.got || x.p < x.n) return; x.got = true; grant(x.reward); }
  commit(); openDaily();
}
function openChest(i) {
  const chains = unlockedChains();
  let n = 0;
  S.board[i] = null;
  for (let k = 0; k < DATA.chestItems; k++) {
    const j = k === 0 ? i : nearestEmpty(i);
    if (j < 0) break;
    const c = chains[rnd(0, chains.length - 1)], l = rnd(0, Math.min(3, 1 + Math.floor(S.level / 4)));
    S.board[j] = { c, l }; seen(c, l); flash(j); n++;
  }
  burst(i, true); sfx('deliver'); toast(t('chestOpen')); selected = -1;
  commit();
}
function maybeBubble(from, c, l) {
  if (l < 2 || l >= MAX_L || Math.random() >= DATA.bubbleChance) return;
  const j = nearestEmpty(from);
  if (j < 0) return;
  S.board[j] = { bubble: { c, l }, until: now() + DATA.bubbleSec * 1000 };
  flash(j);
}
function openBubble(i) {
  const b = S.board[i]; if (!b || !b.bubble) return;
  const g = DATA.bubbleCost(b.bubble.l);
  openModal(`<div class="welcome"><div class="bub big">${icon(b.bubble.c, b.bubble.l)}</div><h2>${t('bubbleH')}</h2>
    <p>${t('bubbleText', { name: nm(b.bubble.c, b.bubble.l), g, s: Math.max(0, Math.ceil((b.until - now()) / 1000)) })}</p><button id="btn-go">${t('keep')} 💎 ${g}</button></div>`);
  $('btn-go').onclick = () => {
    const c = S.board[i];
    if (!c || !c.bubble) { closeModal(); return; }
    if (S.gems < g) { toast(t('noGems')); sfx('error'); return; }
    S.gems -= g; S.board[i] = { c: c.bubble.c, l: c.bubble.l }; sfx('buy'); burst(i, true); closeModal();
  };
}
function openStore() {
  S.store = S.store || [];
  const sc = S.board[selected];
  const canIn = sc && (sc.c || sc.joker || sc.chest) && S.store.length < DATA.storeSlots;
  const slots = [...Array(DATA.storeSlots).keys()].map(k => {
    const it = S.store[k];
    return `<div class="slot">${it ? `<span>${cellHtml(it)}</span><button data-out="${k}">${t('storeOut')}</button>` : ''}</div>`;
  }).join('');
  openModal(`<h2>📦 ${t('storeH')} ${S.store.length}/${DATA.storeSlots}</h2>
    ${sc && (sc.c || sc.joker || sc.chest) ? `<button class="back" data-in="1" ${canIn ? '' : 'disabled'}>${canIn ? `${t('storeIn')}: ${itemName(sc)}` : t('storeFull')}</button>` : `<p class="note">${t('storeEmpty')}</p>`}
    <div class="slots">${slots}</div>`);
}
function storeIn() {
  const sc = S.board[selected];
  if (!sc || !(sc.c || sc.joker || sc.chest) || S.store.length >= DATA.storeSlots) return;
  S.store.push(sc); S.board[selected] = null; selected = -1; sfx('spawn'); commit(); openStore();
}
function storeOut(k) {
  const i = S.board.findIndex(c => c === null);
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
  S.album[c] = 1; S.gems += DATA.albumGems; sfx('level'); toast(t('albumDone', { name: chainNm(c), g: DATA.albumGems })); commit(); openAlbum();
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
  else if (c && c.chest) { selected = d.i; openChest(d.i); }
  else if (c && c.bubble) { selected = d.i; openBubble(d.i); }
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
  const dt = e.target.closest('[data-dt]');
  if (dt) claimDaily(dt.dataset.dt === 'all' ? 'all' : +dt.dataset.dt);
  if (e.target.closest('[data-cal]')) claimDaily('cal');
  if (e.target.closest('[data-in]')) storeIn();
  const so = e.target.closest('[data-out]');
  if (so) storeOut(+so.dataset.out);
  const al = e.target.closest('[data-alb]');
  if (al) claimAlbum(al.dataset.alb);
  const tk = e.target.closest('[data-task]');
  if (tk) doTask(+tk.dataset.task);
  const pl = e.target.closest('[data-place]');
  if (pl) { const k = +pl.dataset.place; if (k === S.zone) openPlace(); else if (k < S.zone) showResident(k, false); else { toast(t('locked')); sfx('error'); } }
  const pr = e.target.closest('[data-pref]');
  if (pr) {
    P[pr.dataset.pref] = pr.dataset.pref === 'sound' ? pr.dataset.val === 'true' : pr.dataset.val;
    savePrefs(); applyStaticTexts(); render(); openSettings(); sfx('spawn');
  }
});

$('btn-shop').onclick = openShop;
$('btn-daily').onclick = openDaily;
$('btn-store').onclick = openStore;
$('btn-album').onclick = openAlbum;
$('btn-island').onclick = openIsland;
$('btn-settings').onclick = openSettings;
$('btn-sell').onclick = sell;
$('modal-close').onclick = closeModal;
$('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

load();
if (S.tut === undefined) S.tut = 5;
S.board.forEach(c => { if (c && c.c) seen(c.c, c.l); });
if (!S.day) { S.lastDaily = S.lastDaily && S.lastDaily !== today() ? S.lastDaily : ''; }
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
