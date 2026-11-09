'use strict';
const SAVE_KEY = 'amy-tasty-v1';
const MAX_L = 7;
const $ = id => document.getElementById(id);
const now = () => Date.now();
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const today = () => new Date().toISOString().slice(0, 10);

let S = null;
let selected = -1;

function newState() {
  const s = {
    v: 1, level: 1, xp: 0, energy: DATA.energyStart, energyTs: now(), coins: 0, gems: 10,
    board: new Array(DATA.cols * DATA.rows).fill(null), rows: DATA.rows,
    orders: [], zone: 0, tasksDone: [],
    perm: {}, boosts: {}, passUntil: 0, starterBought: false, lastDaily: '', stats: { merges: 0, orders: 0 }
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
    toast(`Level ${S.level}! +${DATA.levelUpGems} 💎, energy refilled`);
    for (const [key, ch] of Object.entries(DATA.chains)) {
      if (ch.unlock === S.level) placeGenerator(key);
    }
  }
}

function placeGenerator(key) {
  const i = S.board.findIndex(c => c === null);
  if (i < 0) { toast(`New ${DATA.chains[key].genName} waits for a free cell`); S.pendingGen = key; return; }
  S.board[i] = { gen: key };
  toast(`New generator: ${DATA.chains[key].genName} ${DATA.chains[key].gen}`);
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
  toast(`+${o.coins} 🪙  +${o.xp} XP`);
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
  if (S.energy < 1) { toast('Out of energy. It refills over time.'); return; }
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
  if (!placed) { toast('Board is full. Merge, deliver or sell items.'); return; }
  if (S.energy >= energyMax()) S.energyTs = now();
  S.energy--;
  commit();
}

function drop(from, to) {
  if (from === to || to < 0) return;
  const a = S.board[from], b = S.board[to];
  if (a && a.joker && b && b.c && b.l < MAX_L) {
    b.l++; S.board[from] = null; flash(to); S.stats.merges++;
  } else if (a && b && a.c && b.c && a.c === b.c && a.l === b.l && a.l < MAX_L) {
    S.board[to] = { c: a.c, l: a.l + 1 }; S.board[from] = null; flash(to); S.stats.merges++;
    if (a.l + 1 === MAX_L) toast(`Max level: ${DATA.chains[a.c].names[MAX_L]}!`);
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
  toast(`Sold for ${coins} 🪙`);
  commit();
}

// ---------- shop ----------
function goldenFix() {
  // Golden Touch spawns level 2, so no order may ask for level 1 anymore.
  S.orders.forEach(o => o.need.forEach(x => { if (x.l === 0) x.l = 1; }));
}

function buyMoney(p) {
  // Prototype: test purchase, no payment. Real stores: Play Billing / StoreKit / Stripe.
  if (p.id === 'starter') {
    if (S.starterBought) return;
    S.starterBought = true; S.gems += p.gems; S.energy += p.energy; S.perm.golden = true; goldenFix();
  } else if (p.id === 'pass') {
    S.passUntil = Math.max(now(), S.passUntil) + p.days * 864e5;
    S.gems += p.dailyGems;
  } else {
    S.gems += p.gems;
  }
  toast(`TEST purchase: ${p.name} (no money charged)`);
  commit(); openShop();
}

function buyGem(item) {
  if (S.gems < item.cost) { toast('Not enough gems'); return; }
  if (item.kind === 'perm' && S.perm[item.id]) return;
  if (item.kind === 'item') {
    const i = S.board.findIndex(c => c === null);
    if (i < 0) { toast('Board is full'); return; }
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
  toast(`${item.icon} ${item.name} active`);
  commit(); openShop();
}

// ---------- UI ----------
function cellHtml(c) {
  if (!c) return '';
  if (c.gen) return `<span class="gen">${DATA.chains[c.gen].gen}</span>`;
  if (c.joker) return '<span>🃏</span>';
  return `<span>${DATA.chains[c.c].items[c.l]}</span><b>${c.l + 1}</b>`;
}

function itemName(c) {
  if (c.gen) return `${DATA.chains[c.gen].genName}: tap to make ${DATA.chains[c.gen].name.toLowerCase()} (1 ⚡)`;
  if (c.joker) return 'Joker: drop on any item to raise it one level';
  return `${DATA.chains[c.c].names[c.l]} (level ${c.l + 1}/${MAX_L + 1})`;
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
      return `<span class="need ${have ? 'have' : ''}">${DATA.chains[x.c].items[x.l]}<i>${x.l + 1}</i></span>`;
    }).join('');
    return `<div class="order ${ok ? 'ready' : ''}"><div class="who">${o.who}</div><div class="needs">${parts}</div>
      ${ok ? `<button data-deliver="${k}">Deliver</button>` : `<small>🪙${o.coins}</small>`}</div>`;
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
  $('info').textContent = sc ? itemName(sc) : 'Tap a generator to make items. Drag two equal items together to merge.';
  $('btn-sell').hidden = !(sc && !sc.gen);
  if (sc && !sc.gen) $('btn-sell').textContent = `Sell +${sc.joker ? 0 : DATA.sellCoins(sc.l)}🪙`;
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
function closeModal() { $('modal').hidden = true; }

function openShop() {
  const money = p => `<div class="prod"><div><b>${p.name}</b>${p.tag ? `<em>${p.tag}</em>` : ''}${p.desc ? `<small>${p.desc}</small>` : ''}</div>
    <button data-money="${p.id}" ${p.id === 'starter' && S.starterBought ? 'disabled' : ''}>${p.id === 'starter' && S.starterBought ? 'Owned' : p.price}</button></div>`;
  const gem = g => {
    const owned = g.kind === 'perm' && S.perm[g.id];
    return `<div class="prod"><div><b>${g.icon} ${g.name}</b><small>${g.desc}</small></div>
      <button data-gem="${g.id}" ${owned ? 'disabled' : ''}>${owned ? 'Owned' : `💎 ${g.cost}`}</button></div>`;
  };
  openModal(`<h2>Shop</h2><p class="note">Prototype: purchases are TEST purchases, no money is charged.</p>
    <h3>Offers</h3>${money(DATA.starter)}${money(DATA.pass)}
    <h3>Power</h3>${DATA.gemShop.map(gem).join('')}
    <h3>Gems</h3>${DATA.money.map(money).join('')}`);
}

function openIsland() {
  const z = DATA.zones[S.zone];
  if (!z) { openModal('<h2>Travel</h2><p>All places restored. More trips coming soon!</p>'); return; }
  const rows = z.tasks.map((t, k) => {
    const done = S.tasksDone.includes(k);
    return `<div class="prod ${done ? 'done' : ''}"><div><b>${done ? '✅' : '🔨'} ${t.name}</b></div>
      <button data-task="${k}" ${done ? 'disabled' : ''}>${done ? 'Done' : `🪙 ${t.cost}`}</button></div>`;
  }).join('');
  openModal(`<h2>📍 ${z.name}</h2><p class="note">Place ${S.zone + 1}/${DATA.zones.length} - ${S.tasksDone.length}/${z.tasks.length} done. Finish all for +${z.bonusGems} 💎</p>${rows}`);
}

function doTask(k) {
  const z = DATA.zones[S.zone];
  const t = z && z.tasks[k];
  if (!t) return;
  if (S.tasksDone.includes(k)) return;
  if (S.coins < t.cost) { toast('Not enough coins. Deliver orders!'); return; }
  S.coins -= t.cost;
  S.tasksDone.push(k);
  addXp(10);
  if (S.tasksDone.length === z.tasks.length) {
    S.gems += z.bonusGems;
    S.zone++; S.tasksDone = [];
    toast(`${z.name} restored! +${z.bonusGems} 💎`);
  } else toast(`${t.name} ✅`);
  commit(); openIsland();
}

function daily() {
  if (S.lastDaily === today()) return;
  const g = DATA.dailyGems + (passActive() ? DATA.pass.dailyGems : 0);
  if (S.lastDaily) { S.gems += g; toast(`Daily bonus: +${g} 💎`); }
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
  if (m) { const id = m.dataset.money; buyMoney(id === 'starter' ? DATA.starter : id === 'pass' ? DATA.pass : DATA.money.find(p => p.id === id)); }
  const g = e.target.closest('[data-gem]');
  if (g) buyGem(DATA.gemShop.find(x => x.id === g.dataset.gem));
  const t = e.target.closest('[data-task]');
  if (t) doTask(+t.dataset.task);
});

$('btn-shop').onclick = openShop;
$('btn-island').onclick = openIsland;
$('btn-sell').onclick = sell;
$('modal-close').onclick = closeModal;
$('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

load();
daily();
fillOrders();
commit();
setInterval(render, 1000);
setInterval(autoMergeTick, 700);
window.__game = { get state() { return S; }, spawn, drop, deliver, buyGem, buyMoney, doTask };
