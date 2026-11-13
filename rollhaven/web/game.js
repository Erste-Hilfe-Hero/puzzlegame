'use strict';
// Rollhaven prototype (phase 1): dice board, multiplier, landmarks, harbors, bot raids, local save.

const LANG = (navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
const T = {
  en: { shop: 'Shop', build: 'Build', roll: 'ROLL', dice: 'dice', full: 'Dice full', next: 'Next die in',
    coins: 'Coins!', start: 'Harbor bonus!', chest: 'Treasure chest!', raid: 'Raid! Pick a harbor', shield: 'Shield +1',
    shieldFull: 'Shields full: coins instead', storm: 'Storm! You lost', stormBlocked: 'Storm blocked by your shield',
    light: 'Lighthouse: +3 dice', fest: 'Lantern festival! Pick a lantern', toll: 'Harbor toll collected',
    blocked: 'Their shield held! Small loot', loot: 'Loot', noDice: 'Out of dice. They refill over time.',
    buildTitle: 'Build your harbor', level: 'Level', max: 'Done', mult: 'Multiplier', multNote: 'Each roll uses as many dice as the multiplier and pays that much more.',
    harborDone: 'Harbor complete! +50 dice', newHarbor: 'Sail on to', shopTitle: 'Shop',
    shopNote: 'Prototype: packs are free to test. Real purchases come with the app.', get: 'Get', starter: 'Starter pack',
    raidedBy: 'raided your harbor and took', raidBlocked: 'tried to raid you. Your shield held!',
    tapRoll: 'Tap ROLL to start', pass: 'Passed the harbor gate' },
  de: { shop: 'Shop', build: 'Bauen', roll: 'WÜRFELN', dice: 'Würfel', full: 'Würfel voll', next: 'Nächster Würfel in',
    coins: 'Münzen!', start: 'Hafenbonus!', chest: 'Schatztruhe!', raid: 'Überfall! Wähle einen Hafen', shield: 'Schild +1',
    shieldFull: 'Schilde voll: Münzen stattdessen', storm: 'Sturm! Verloren:', stormBlocked: 'Sturm vom Schild abgewehrt',
    light: 'Leuchtturm: +3 Würfel', fest: 'Laternenfest! Wähle eine Laterne', toll: 'Hafenzoll kassiert',
    blocked: 'Ihr Schild hielt! Kleine Beute', loot: 'Beute', noDice: 'Keine Würfel. Sie laden sich wieder auf.',
    buildTitle: 'Baue deinen Hafen', level: 'Stufe', max: 'Fertig', mult: 'Multiplikator', multNote: 'Jeder Wurf kostet so viele Würfel wie der Multiplikator und bringt entsprechend mehr.',
    harborDone: 'Hafen fertig! +50 Würfel', newHarbor: 'Weiter nach', shopTitle: 'Shop',
    shopNote: 'Prototyp: Pakete sind zum Testen gratis. Echte Käufe kommen mit der App.', get: 'Holen', starter: 'Starterpaket',
    raidedBy: 'hat deinen Hafen überfallen und nahm', raidBlocked: 'wollte dich überfallen. Dein Schild hielt!',
    tapRoll: 'Tippe auf WÜRFELN', pass: 'Hafentor passiert' }
}[LANG];

const HARBORS = [
  { en: 'Lantern Cove', de: 'Laternenbucht', lm: [['🏮', 'Lantern Market', 'Laternenmarkt'], ['🎣', 'Fishing Pier', 'Fischersteg'], ['🏠', 'Harbor Inn', 'Hafenschenke'], ['🗼', 'Lighthouse', 'Leuchtturm'], ['🎡', 'Wheel of Lights', 'Lichterrad']] },
  { en: 'Spice Quay', de: 'Gewürzkai', lm: [['🌶️', 'Spice Stalls', 'Gewürzstände'], ['🏺', 'Pottery Yard', 'Töpferhof'], ['🐪', 'Caravan Gate', 'Karawanentor'], ['🏰', 'Customs Fort', 'Zollburg'], ['🎪', 'Bazaar Tent', 'Basarzelt']] },
  { en: 'Frost Haven', de: 'Frosthafen', lm: [['🧊', 'Ice Docks', 'Eisdocks'], ['🐧', 'Penguin Pier', 'Pinguinsteg'], ['🛷', 'Sled Shed', 'Schlittenschuppen'], ['⛄', 'Snow Hall', 'Schneehalle'], ['🌌', 'Aurora Spire', 'Polarlichtturm']] },
  { en: 'Ember Isle', de: 'Gluteiland', lm: [['🌋', 'Fire Forge', 'Feuerschmiede'], ['🔥', 'Brazier Plaza', 'Feuerplatz'], ['⚒️', 'Smithy Row', 'Schmiedegasse'], ['🏯', 'Ember Keep', 'Glutfeste'], ['🐉', 'Dragon Roost', 'Drachenhorst']] },
  { en: 'Sky Harbor', de: 'Himmelshafen', lm: [['🎈', 'Balloon Port', 'Ballonhafen'], ['🪁', 'Kite Tower', 'Drachenturm'], ['🌬️', 'Cloud Mill', 'Wolkenmühle'], ['🌈', 'Rainbow Bridge', 'Regenbogenbrücke'], ['🏰', 'Sky Citadel', 'Himmelszitadelle']] }
];
const CAPTAINS = ['Captain Mira', 'Old Brannoc', 'Saltjaw Pell', 'Lady Venna', 'Tobin Rust', 'Quill the Fox'];
const TILES = ['start', 'coins', 'shield', 'coins', 'raid', 'coins', 'light', 'coins', 'chest', 'storm', 'coins', 'toll',
  'fest', 'coins', 'raid', 'shield', 'coins', 'chest', 'raid', 'coins', 'toll', 'storm', 'coins', 'fest'];
const ICON = { start: '⚓', coins: '🪙', shield: '🛡️', raid: '🏴‍☠️', light: '🗼', chest: '🧰', storm: '⛈️', toll: '💰', fest: '🏮' };
const MULTS = [1, 2, 3, 5, 10, 20, 50, 100];
const MAX_DICE = 50, REGEN_MS = 3 * 60 * 1000, MAX_SHIELDS = 3;
const SHOP = [
  ['🎲', 25, '0,99 €'], ['🎲', 150, '4,99 €'], ['🎲', 350, '9,99 €'], ['🎲', 800, '19,99 €'], ['🎲', 2200, '49,99 €'], ['🎲', 5000, '99,99 €']
];

const $ = id => document.getElementById(id);
const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(Math.floor(n));
const rnd = n => Math.floor(Math.random() * n);

let S = load();
let busy = false;

function fresh() {
  return { coins: 0, dice: MAX_DICE, shields: 1, harbor: 0, lm: [0, 0, 0, 0, 0], pos: 0, mult: 1, rolls: 0, regenAt: Date.now(), starter: false };
}
function load() {
  try { const s = JSON.parse(localStorage.getItem('rh1')); if (s && s.lm) return Object.assign(fresh(), s); } catch (e) {}
  return fresh();
}
function save() { try { localStorage.setItem('rh1', JSON.stringify(S)); } catch (e) {} }

const base = () => Math.round(100 * Math.pow(1.6, S.harbor));
const harbor = () => { const h = HARBORS[S.harbor % HARBORS.length]; const n = Math.floor(S.harbor / HARBORS.length); return { ...h, name: h[LANG] + (n ? ' ' + 'I'.repeat(Math.min(n + 1, 3)) : '') }; };
const lmCost = (j, k) => Math.round(base() * 4 * (1 + 0.35 * j) * k);

function tileRC(i) {
  if (i <= 6) return [6, 6 - i];
  if (i <= 12) return [6 - (i - 6), 0];
  if (i <= 18) return [0, i - 12];
  return [i - 18, 6];
}

function buildBoard() {
  const b = $('board');
  b.innerHTML = '';
  TILES.forEach((t, i) => {
    const [r, c] = tileRC(i);
    const d = document.createElement('div');
    d.className = 'tile ' + t;
    d.id = 't' + i;
    d.style.gridRow = r + 1; d.style.gridColumn = c + 1;
    d.textContent = ICON[t];
    b.appendChild(d);
  });
  const tok = document.createElement('div');
  tok.id = 'token';
  $('boardWrap').appendChild(tok);
  placeToken();
}
function placeToken() {
  const [r, c] = tileRC(S.pos);
  const tok = $('token');
  tok.style.left = ((c + 0.5) / 7 * 100) + '%';
  tok.style.top = ((r + 0.5) / 7 * 100) + '%';
}

function render() {
  regen();
  $('coins').textContent = fmt(S.coins);
  $('shields').textContent = S.shields;
  $('diceLeft').textContent = S.dice + ' ' + T.dice;
  $('mult').textContent = 'x' + S.mult;
  $('rollBtn').disabled = busy || S.dice < 1;
  const h = harbor();
  $('harborName').textContent = '⚓ ' + h.name;
  $('skyline').innerHTML = h.lm.map((l, j) => `<div class="lm l${S.lm[j]}"><span>${l[0]}</span><span class="stars">${'★'.repeat(S.lm[j])}${'☆'.repeat(4 - S.lm[j])}</span></div>`).join('');
  document.querySelectorAll('[data-t]').forEach(e => e.textContent = T[e.dataset.t]);
}

function regen() {
  const now = Date.now();
  if (S.dice >= MAX_DICE) { S.regenAt = now; $('regen').textContent = T.full; return; }
  const n = Math.floor((now - S.regenAt) / REGEN_MS);
  if (n > 0) { S.dice = Math.min(MAX_DICE, S.dice + n); S.regenAt += n * REGEN_MS; save(); }
  const left = REGEN_MS - (now - S.regenAt);
  $('regen').textContent = S.dice >= MAX_DICE ? T.full : `${T.next} ${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
}

function msg(t) { $('msg').textContent = t; }
function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => e.classList.remove('on'), 1600); }
function vibrate(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
function addCoins(n) {
  S.coins += n;
  const from = $('token').getBoundingClientRect(), to = $('coins').getBoundingClientRect();
  for (let i = 0; i < Math.min(6, 2 + Math.log10(n + 1)); i++) {
    const f = document.createElement('div');
    f.className = 'fly'; f.textContent = '🪙';
    f.style.left = from.left + rnd(20) + 'px'; f.style.top = from.top + rnd(20) + 'px';
    document.body.appendChild(f);
    setTimeout(() => { f.style.left = to.left + 'px'; f.style.top = to.top + 'px'; f.style.opacity = .3; }, 30 + i * 60);
    setTimeout(() => f.remove(), 900 + i * 60);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function roll() {
  if (busy) return;
  if (S.dice < 1) { toast(T.noDice); return; }
  if (S.mult > S.dice) S.mult = MULTS.filter(m => m <= S.dice).pop();
  busy = true;
  const m = S.mult;
  S.dice -= m; S.rolls++;
  render();
  vibrate(15);
  const d1 = $('d1'), d2 = $('d2');
  d1.classList.add('spin'); d2.classList.add('spin');
  for (let i = 0; i < 6; i++) { d1.textContent = 1 + rnd(6); d2.textContent = 1 + rnd(6); await sleep(70); }
  const a = 1 + rnd(6), b = 1 + rnd(6);
  d1.textContent = a; d2.textContent = b;
  d1.classList.remove('spin'); d2.classList.remove('spin');
  for (let s = 0; s < a + b; s++) {
    S.pos = (S.pos + 1) % TILES.length;
    placeToken();
    if (S.pos === 0 && s < a + b - 1) { const g = base() * 2 * m; addCoins(g); msg(`${T.pass} +${fmt(g)}`); }
    await sleep(150);
  }
  const tile = $('t' + S.pos);
  tile.classList.remove('hit'); void tile.offsetWidth; tile.classList.add('hit');
  vibrate(30);
  await land(TILES[S.pos], m);
  if (S.rolls % 12 === 0) botRaid();
  save();
  busy = false;
  render();
}

async function land(t, m) {
  const B = base();
  if (t === 'coins') { const g = B * (S.pos % 2 ? 1 : 2) * m; addCoins(g); msg(`${T.coins} +${fmt(g)}`); }
  else if (t === 'start') { const g = B * 4 * m; addCoins(g); msg(`${T.start} +${fmt(g)}`); }
  else if (t === 'shield') {
    if (S.shields < MAX_SHIELDS) { S.shields++; msg(T.shield); }
    else { const g = B * 2 * m; addCoins(g); msg(`${T.shieldFull} +${fmt(g)}`); }
  }
  else if (t === 'storm') {
    if (S.shields > 0) { S.shields--; msg(T.stormBlocked); }
    else { const l = Math.min(S.coins, B * 2 * m); S.coins -= l; msg(`${T.storm} ${fmt(l)}`); vibrate([40, 40, 40]); }
  }
  else if (t === 'light') { S.dice += 3; msg(T.light); }
  else if (t === 'toll') { const g = B * 3 * m; addCoins(g); msg(`${T.toll} +${fmt(g)}`); }
  else if (t === 'chest') {
    const r = rnd(3);
    if (r === 0) { const g = B * 3 * m; addCoins(g); msg(`${T.chest} +${fmt(g)}`); }
    else if (r === 1) { S.dice += 5; msg(`${T.chest} +5 ${T.dice}`); }
    else if (S.shields < MAX_SHIELDS) { S.shields++; msg(`${T.chest} ${T.shield}`); }
    else { const g = B * 3 * m; addCoins(g); msg(`${T.chest} +${fmt(g)}`); }
  }
  else if (t === 'raid') await raid(m);
  else if (t === 'fest') await fest(m);
}

function pickSheet(title, items) {
  return new Promise(res => {
    open(`<h2>${title}</h2><div class="grid3">${items.map((it, i) => `<button class="pick btn" data-i="${i}"><span class="big">${it[0]}</span>${it[1]}</button>`).join('')}</div>`, false);
    $('sheet').querySelectorAll('.pick').forEach(b => b.onclick = () => { close(); res(+b.dataset.i); });
  });
}

async function raid(m) {
  const caps = [...CAPTAINS].sort(() => Math.random() - .5).slice(0, 3);
  const i = await pickSheet(T.raid, caps.map(c => ['🏴‍☠️', c]));
  const B = base();
  if (Math.random() < 0.3) { const g = B * m; addCoins(g); msg(`${T.blocked} +${fmt(g)}`); }
  else { const g = B * (4 + rnd(5)) * m; addCoins(g); msg(`${T.loot} ${caps[i]}: +${fmt(g)}`); vibrate(60); }
}

async function fest(m) {
  const vals = [2, 4, 8].sort(() => Math.random() - .5);
  const i = await pickSheet(T.fest, [['🏮', '?'], ['🏮', '?'], ['🏮', '?']]);
  const g = base() * vals[i] * m;
  addCoins(g); msg(`🏮 +${fmt(g)}`);
}

function botRaid() {
  if (Math.random() > 0.45) return;
  const c = CAPTAINS[rnd(CAPTAINS.length)];
  if (S.shields > 0) { S.shields--; toast(`🛡️ ${c} ${T.raidBlocked}`); return; }
  const l = Math.min(Math.floor(S.coins * 0.1), base() * 5);
  S.coins -= l;
  toast(`🏴‍☠️ ${c} ${T.raidedBy} ${fmt(l)}`);
}

function open(html, closable = true) {
  $('sheet').innerHTML = html;
  $('modal').classList.remove('hidden');
  $('modal').onclick = closable ? (e => { if (e.target.id === 'modal') close(); }) : null;
  const x = $('sheet').querySelector('.x');
  if (x) x.onclick = close;
}
function close() { $('modal').classList.add('hidden'); render(); }

function openBuild() {
  const h = harbor();
  const rows = h.lm.map((l, j) => {
    const lv = S.lm[j];
    const cost = lv < 4 ? lmCost(j, lv + 1) : 0;
    return `<div class="row"><div class="big">${l[0]}</div><div class="info"><b>${LANG === 'de' ? l[2] : l[1]}</b><small>${T.level} ${lv}/4</small></div>` +
      (lv < 4 ? `<button class="buy btn" data-j="${j}" ${S.coins < cost ? 'disabled' : ''}>🪙 ${fmt(cost)}</button>` : `<b>✅ ${T.max}</b>`) + '</div>';
  }).join('');
  open(`<h2>${T.buildTitle}<button class="x btn">✕</button></h2>${rows}`);
  $('sheet').querySelectorAll('.buy').forEach(b => b.onclick = () => {
    const j = +b.dataset.j, cost = lmCost(j, S.lm[j] + 1);
    if (S.coins < cost) return;
    S.coins -= cost; S.lm[j]++; vibrate(25);
    if (S.lm.every(v => v >= 4)) {
      S.harbor++; S.lm = [0, 0, 0, 0, 0]; S.dice += 50; save(); close();
      toast(`🎉 ${T.harborDone}`); setTimeout(() => toast(`⛵ ${T.newHarbor} ${harbor().name}`), 1800);
      return;
    }
    save(); render(); openBuild();
  });
}

function openMult() {
  open(`<h2>${T.mult}<button class="x btn">✕</button></h2><div class="mults">${MULTS.map(m => `<button class="btn ${m === S.mult ? 'on' : ''}" data-m="${m}" ${m > Math.max(1, S.dice) ? 'disabled' : ''}>x${m}</button>`).join('')}</div><p class="note">${T.multNote}</p>`);
  $('sheet').querySelectorAll('[data-m]').forEach(b => b.onclick = () => { S.mult = +b.dataset.m; save(); close(); });
}

function openShop() {
  const rows = [];
  if (!S.starter) rows.push(`<div class="row"><div class="big">🎁</div><div class="info"><b>${T.starter}</b><small>100 ${T.dice} + 3 🛡️ + 🪙 ${fmt(base() * 50)}</small></div><button class="buy btn" data-s="starter">1,99 €</button></div>`);
  SHOP.forEach((p, i) => rows.push(`<div class="row"><div class="big">${p[0]}</div><div class="info"><b>${p[1]} ${T.dice}</b></div><button class="buy btn" data-s="${i}">${p[2]}</button></div>`));
  open(`<h2>${T.shopTitle}<button class="x btn">✕</button></h2>${rows.join('')}<p class="note">${T.shopNote}</p>`);
  $('sheet').querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
    if (b.dataset.s === 'starter') { S.starter = true; S.dice += 100; S.shields = MAX_SHIELDS; S.coins += base() * 50; }
    else S.dice += SHOP[+b.dataset.s][1];
    save(); close(); toast('🎲 +');
  });
}

$('rollBtn').onclick = roll;
$('buildBtn').onclick = openBuild;
$('multBtn').onclick = openMult;
$('shopBtn').onclick = openShop;
buildBoard();
msg(T.tapRoll);
render();
setInterval(() => { if (!busy) regen(); }, 1000);
