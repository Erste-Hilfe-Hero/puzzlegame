'use strict';
// Duel mode: two players get the same deal and race for 3 minutes. Server on play.nyrathen.com/mossbrook/api.
// Nobody waiting -> the server pairs you with a recorded run of a real player (or a bot) after a few seconds.

Object.assign(T.en, {
  duel: 'Duel', duelT: 'Card Duel', duelP: 'Same cards, same time. Clear more cards than your opponent. Winner takes the pot!',
  stake: 'Stake', board: 'Leaderboard', searching: 'Looking for an opponent...', cancel: 'Cancel',
  vs: 'vs {0}', startsIn: 'Starts in {0}', oppLeft: '{0} cards left', oppDone: 'finished',
  dWin: 'You win the duel!', dLose: 'Duel lost', dDraw: 'Draw', dWait: 'Waiting for your opponent...',
  dWinP: 'Pot: {0} coins', dLoseP: '{0} won this round. Try again?', dDrawP: 'Your stake comes back.',
  again: 'Duel again', offline: 'The duel server is not reachable. Check your internet connection.',
  trophies: 'Trophies', week: 'Week of {0}', you: 'You', yourName: 'Your name', timeUp: 'Time is up!',
  quitDuel: 'Leaving counts as giving up this duel.', noPlayers: 'No scores yet this week. Be the first!'
});
Object.assign(T.de, {
  duel: 'Duell', duelT: 'Karten-Duell', duelP: 'Gleiche Karten, gleiche Zeit. Räume mehr Karten ab als dein Gegner. Der Sieger bekommt den Pott!',
  stake: 'Einsatz', board: 'Rangliste', searching: 'Suche Gegner...', cancel: 'Abbrechen',
  vs: 'gegen {0}', startsIn: 'Start in {0}', oppLeft: 'noch {0} Karten', oppDone: 'fertig',
  dWin: 'Duell gewonnen!', dLose: 'Duell verloren', dDraw: 'Unentschieden', dWait: 'Warte auf deinen Gegner...',
  dWinP: 'Pott: {0} Münzen', dLoseP: '{0} hat diese Runde gewonnen. Nochmal?', dDrawP: 'Du bekommst deinen Einsatz zurück.',
  again: 'Nochmal Duell', offline: 'Der Duell-Server ist nicht erreichbar. Bitte Internetverbindung prüfen.',
  trophies: 'Pokale', week: 'Woche ab {0}', you: 'Du', yourName: 'Dein Name', timeUp: 'Zeit ist um!',
  quitDuel: 'Verlassen zählt als Aufgabe in diesem Duell.', noPlayers: 'Diese Woche noch keine Punkte. Sei der Erste!'
});

const API = /^http/.test(location.protocol) && location.pathname.startsWith('/mossbrook') ? '/mossbrook/api/' : 'https://play.nyrathen.com/mossbrook/api/';
const STAKES = [100, 500, 2000];
const NAMES = ['Fox', 'Badger', 'Owl', 'Otter', 'Wren', 'Hare', 'Heron', 'Mole'];
const ADJ = ['Swift', 'Lucky', 'Clever', 'Brave', 'Quiet', 'Merry', 'Bold', 'Mossy', 'Sunny', 'Misty'];
const genName = () => ADJ[Math.floor(Math.random() * ADJ.length)] + ' ' + NAMES[Math.floor(Math.random() * NAMES.length)] + ' ' + (10 + Math.floor(Math.random() * 90));
if (!S.mp) { S.mp = { name: genName(), trophies: 0 }; save(); }
if (!/^[A-Z][a-z]+ [A-Z][a-z]+ \d{2}$/.test(S.mp.name)) { S.mp.name = genName(); save(); }
let D = null;

async function call(route, body) {
  const r = await fetch(API + route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ id: S.mp.id, key: S.mp.key }, body || {})) });
  if (r.status === 401 && route !== 'hello') { delete S.mp.id; delete S.mp.key; await hello(); return call(route, body); }
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}
async function hello() {
  const j = await call('hello', { name: S.mp.name });
  S.mp.id = j.id; S.mp.key = j.key; S.mp.name = j.name; S.mp.trophies = j.trophies; save();
}

function duelMenu() {
  const row = STAKES.map(st => '<button class="' + (S.coins >= st ? 'gold' : 'grey') + '" data-stake="' + st + '"><span class="ic coin" style="vertical-align:-4px"></span> ' + st + '</button>').join('');
  modal('<h2>' + t('duelT') + '</h2>' + who(fox(), t('duelP')) +
    '<p style="margin:4px 0"><b>' + S.mp.name + '</b> &middot; ' + t('trophies') + ': ' + (S.mp.trophies || 0) + '</p>' +
    '<div class="small" style="margin:0">' + t('stake') + '</div><div class="row">' + row + '</div>' +
    '<div class="row">' + btn('mBoard', 'blue', t('board')) + btn('mX', 'grey', t('close')) + '</div>', m => {
      m.querySelector('#mX').onclick = closeModal;
      m.querySelector('#mBoard').onclick = showBoard;
      m.querySelectorAll('[data-stake]').forEach(b => { b.onclick = () => {
        const st = +b.dataset.stake;
        if (S.coins < st) { toast(t('needCoins')); openShop(); return; }
        search(st);
      }; });
    });
}

async function search(stake) {
  D = { stake, searching: true };
  modal('<h2>' + t('duel') + '</h2><div class="spin"></div><p>' + t('searching') + '</p><div class="row">' + btn('mX', 'grey', t('cancel')) + '</div>', m => {
    m.querySelector('#mX').onclick = () => { if (D) D.searching = false; call('leave').catch(() => {}); closeModal(); };
  });
  try {
    if (!S.mp.id) await hello();
    let j = await call('join', { stake });
    while (D && D.searching && j.wait) { await new Promise(r => setTimeout(r, 1000)); if (!D || !D.searching) return; j = await call('poll'); }
    if (!D || !D.searching) return;
    found(j);
  } catch (e) { D = null; closeModal(); toast(t('offline')); }
}

function found(j) {
  D = { stake: j.stake, mid: j.mid, seed: j.seed, duelMs: j.duelMs, opp: j.opp, oppTrophies: j.oppTrophies, startAt: now() + j.startIn };
  S.coins -= j.stake; save(); hud();
  tone(660, .15); haptic('deliver');
  const tick = () => {
    if (!D || D.mid !== j.mid) return;
    const ms = D.startAt - now();
    const box = $('mbox').querySelector('.cd');
    if (ms <= 0) { startDuel(); return; }
    if (box) box.textContent = t('startsIn', Math.ceil(ms / 1000));
    setTimeout(tick, 200);
  };
  modal('<h2>' + t('vs', j.opp.name) + '</h2>' + who(badger(), '<b>' + j.opp.name + '</b><br>' + t('trophies') + ': ' + (j.oppTrophies || 0)) +
    '<div class="reward"><span><span class="ic coin"></span>' + (j.stake * 2) + '</span></div><p class="cd"></p>', () => tick());
}

function startDuel() {
  closeModal();
  const L = genLevel(500 + (D.seed % 100000), 2);
  G = { n: 9999, duel: true, hard: false, cards: L.cards, stock: L.stock, waste: [], hist: [], streak: 0, best: 0, earned: 0, plusN: 0, idle: 0, t0: now() };
  D.end = now() + D.duelMs; D.done = false; D.result = null;
  $('village').classList.add('hidden'); $('game').classList.remove('hidden');
  $('btnHome').innerHTML = '&#8962;';
  $('gLevel').textContent = t('duel');
  let bar = $('oppBar'); if (!bar) { bar = el('div'); bar.id = 'oppBar'; $('gHead').after(bar); }
  bar.classList.remove('hidden');
  layoutBoard(true);
  setTimeout(() => drawCard(true), 350);
  hud(); oppBar();
  D.timer = setInterval(duelTick, 1000);
}

function oppBar() {
  const bar = $('oppBar'); if (!bar || !D) return;
  const o = D.opp || {}, total = G ? G.cards.length : 1;
  const left = o.left == null ? total : o.left, pct = Math.round((1 - left / total) * 100);
  bar.innerHTML = '<span class="on">' + o.name + '</span><div class="ob"><div style="width:' + pct + '%"></div></div><span>' + (o.done && left ? t('oppDone') : t('oppLeft', left)) + '</span>' +
    '<span class="dt">' + fmtTime(Math.max(0, D.end - now())) + '</span>';
}

async function duelTick() {
  if (!D || !G || !G.duel) { if (D && D.timer) clearInterval(D.timer); return; }
  if (!D.done && now() >= D.end) { D.done = true; G.over = true; closeModal(); toast(t('timeUp')); waitResult(); }
  const left = G.cards.filter(c => !c.gone).length;
  try {
    const j = await call('progress', { mid: D.mid, left, score: G.earned, done: D.done });
    D.opp = j.opp; S.mp.trophies = j.trophies; oppBar();
    if (j.result && !D.result) { D.result = j.result; duelResult(); }
  } catch (e) { /* keep playing; next tick retries */ }
}

function waitResult() {
  if (D.result) return;
  modal('<h2>' + t('dWait') + '</h2><div class="spin"></div>', null);
}

function duelResult() {
  clearInterval(D.timer);
  G.over = true;
  const r = D.result.winner, me = S.mp.id, pot = D.stake * 2;
  let h;
  if (r === me) {
    S.coins += pot; confetti(); [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, .18), i * 120)); haptic('deliver');
    h = '<h2>' + t('dWin') + '</h2>' + who(fox(), t('dWinP', pot)) + '<div class="reward"><span><span class="ic coin"></span>+' + pot + '</span><span>' + t('trophies') + ' +30</span></div>';
  } else if (r === 'draw') {
    S.coins += D.stake;
    h = '<h2>' + t('dDraw') + '</h2>' + who(badger(), t('dDrawP'));
  } else {
    tone(220, .25, 'sine');
    h = '<h2>' + t('dLose') + '</h2>' + who(badger(), t('dLoseP', D.opp.name));
  }
  save(); hud();
  const stake = D.stake;
  modal(h + '<div class="row">' + btn('mVil', 'blue', t('village')) + btn('mAgain', 'green', t('again')) + '</div>', m => {
    m.querySelector('#mVil').onclick = () => { closeModal(); endDuel(); showVillage(); };
    m.querySelector('#mAgain').onclick = () => { endDuel(); if (S.coins < stake) { showVillage(); duelMenu(); } else { showVillage(); search(stake); } };
  });
}

function endDuel() {
  if (D && D.timer) clearInterval(D.timer);
  D = null;
  const bar = $('oppBar'); if (bar) bar.classList.add('hidden');
}

async function showBoard() {
  try {
    if (!S.mp.id) await hello();
    const r = await fetch(API + 'board?id=' + encodeURIComponent(S.mp.id)); const b = await r.json();
    const rows = b.top.length ? b.top.map(e => '<span>' + e.rank + '. ' + (e.me ? '<b>' + e.name + '</b>' : e.name) + '</span><b>' + e.trophies + '</b>').join('') : '<span>' + t('noPlayers') + '</span><b></b>';
    modal('<h2>' + t('board') + '</h2><p class="small" style="margin:0 0 6px">' + t('week', b.week) + '</p><div class="tally">' + rows + '</div>' +
      (b.me && b.me.rank > 50 ? '<p>' + t('you') + ': #' + b.me.rank + ' (' + b.me.trophies + ')</p>' : '') +
      '<div class="row">' + btn('mBack', 'blue', t('duel')) + btn('mX', 'grey', t('close')) + '</div>', m => {
        m.querySelector('#mX').onclick = closeModal; m.querySelector('#mBack').onclick = duelMenu;
      });
  } catch (e) { toast(t('offline')); }
}

// hooks into the solo game flow
const soloWin = win, soloOut = outOfMoves, soloLose = lose, soloQuit = quitLevel, soloSettings = openSettings, soloVillage = showVillage;
win = function () { if (!G.duel) return soloWin(); G.over = true; D.done = true; confetti(); duelTick(); waitResult(); };
outOfMoves = function () { soloOut(); };
lose = function () { if (!G.duel) return soloLose(); closeModal(); G.over = true; D.done = true; duelTick(); waitResult(); };
quitLevel = function () {
  if (!G || !G.duel) return soloQuit();
  modal('<h2>' + t('quitT') + '</h2><p>' + t('quitDuel') + '</p><div class="row">' + btn('mLeave', 'grey', t('leave')) + btn('mStay', 'green', t('stay')) + '</div>', m => {
    m.querySelector('#mStay').onclick = closeModal;
    m.querySelector('#mLeave').onclick = () => { D.done = true; G.over = true; duelTick(); waitResult(); };
  });
};
showVillage = function () { const b = $('oppBar'); if (b && !D) b.classList.add('hidden'); soloVillage(); $('btnDuel').textContent = '⚔ ' + t('duel'); };
openSettings = function () {
  soloSettings();
  const s = $('mbox').querySelector('.settings');
  const l = el('label', '', t('yourName') + ' <b id="sName">' + S.mp.name + '</b> <button id="sReroll" class="small">&#x21bb;</button>');
  s.prepend(l);
  l.querySelector('button').onclick = () => { S.mp.name = genName(); save(); $('sName').textContent = S.mp.name; if (S.mp.id) hello().catch(() => {}); };
};
$('btnDuel').onclick = duelMenu;
$('btnDuel').textContent = '⚔ ' + t('duel');
window.__mb.duel = () => D;
