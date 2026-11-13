'use strict';
// Mossbrook Solitaire: TriPeaks card levels + village restoration. No ads; purchases via the native bridge
// (window.AndroidBilling, same contract as Amy's Tasty Island GameViewController).

const T = {
  en: {
    play: 'Play Level {0}', level: 'Level {0}', hard: 'Hard', cardsLeft: '{0} cards left', stock: 'Deck: {0}',
    streak: 'Streak {0}', winT: 'Level complete!', next: 'Next level', village: 'Village', cont: 'Continue',
    outT: 'Out of moves!', outP: 'Only {0} cards left. Keep going with 5 extra cards?', plus5: '+5 cards', giveUp: 'Give up',
    loseT: 'Level failed', loseP: 'You lost a life. Try again?', retry: 'Try again', noLives: 'No lives left',
    noLivesP: 'Next life in {0}. Refill all lives now?', refill: 'Refill', wait: 'Wait',
    quitT: 'Leave level?', quitP: 'You will lose a life.', leave: 'Leave', stay: 'Stay',
    needCoins: 'Not enough coins', shop: 'Shop', close: 'Close', buy: 'Buy', full: 'Full',
    needStars: 'Win levels to earn stars!', restored: 'Restored!', districtDone: '{0} is restored!',
    districtP: 'Wonderful! The whole district shines again. Bonus: {0} coins. On to {1}!',
    joker: 'Wild card', undo: 'Undo', jokerP: 'Fits on any card', undoP: 'Take back a move',
    starter: 'Starter Pack', starterSub: 'once only', boosters: 'Booster Chest', lives1h: '1 h unlimited lives', lives2h: '2 h unlimited lives',
    coinsSub: '', appOnly: 'Purchases are only available in the app.', pending: 'Payment is being processed.',
    buyErr: 'The store is not reachable right now. Please try again.', thanks: 'Thank you! Items added.',
    settings: 'Settings', sound: 'Sound', privacy: 'Privacy policy', support: 'Support', version: 'Version',
    tCards: 'Cards', tDeck: 'Deck left ({0})', tTime: 'Speed ({0})', tCombo: 'Best combo', comboX: 'Combo x{0}', combos: ['Nice!', 'Great!', 'Super!', 'Amazing!', 'Unstoppable!'],
    tip1: 'Tap a card that is one higher or one lower than the open card. King and Ace connect!',
    tip2: 'No match? Tap the deck to draw a new card.',
    tip3: 'Clear all cards to win. Every card in a row fills your streak for bonus coins.',
    welcomeT: 'Welcome to Mossbrook!', welcome: 'The spring flood washed half our village away. Win card games to earn stars, and we will rebuild Mossbrook together!',
    wrenWin: ['Lovely play!', 'Mossbrook thanks you!', 'Those cards never stood a chance!', 'Stars for the village!'],
    unlimited: 'unlimited', coinShop: 'Boosters for coins', livesFull: 'Lives are full',
    allDone: 'More districts are coming soon. Keep playing for coins!',
    d0: 'Riverside', d1: 'Willow Meadow', d2: 'Frostfern Hollow',
    tasks0: ['Clear the path', 'Fix the bridge', 'Rebuild the well', 'Plant the gardens', 'Repair the mill', 'Open the bakery', 'Hang the lanterns', 'Build Wren\'s cottage'],
    tasks1: ['Mow the meadow path', 'Paint the bridge', 'Dig a new well', 'Sow wildflowers', 'Turn the mill again', 'Bake the first bread', 'Light the evening lamps', 'Raise the town hall'],
    tasks2: ['Shovel the snow path', 'Ice-proof the bridge', 'Warm the old well', 'Winter greenhouse', 'Thaw the mill wheel', 'Hot cocoa stand', 'Frost lanterns', 'Build the lodge']
  },
  de: {
    play: 'Level {0} spielen', level: 'Level {0}', hard: 'Schwer', cardsLeft: 'Noch {0} Karten', stock: 'Stapel: {0}',
    streak: 'Serie {0}', winT: 'Level geschafft!', next: 'Nächstes Level', village: 'Dorf', cont: 'Weiter',
    outT: 'Keine Züge mehr!', outP: 'Nur noch {0} Karten. Mit 5 Extra-Karten weiterspielen?', plus5: '+5 Karten', giveUp: 'Aufgeben',
    loseT: 'Level verloren', loseP: 'Du hast ein Leben verloren. Nochmal?', retry: 'Nochmal', noLives: 'Keine Leben mehr',
    noLivesP: 'Nächstes Leben in {0}. Jetzt alle Leben auffüllen?', refill: 'Auffüllen', wait: 'Warten',
    quitT: 'Level verlassen?', quitP: 'Du verlierst ein Leben.', leave: 'Verlassen', stay: 'Bleiben',
    needCoins: 'Nicht genug Münzen', shop: 'Shop', close: 'Schließen', buy: 'Kaufen', full: 'Voll',
    needStars: 'Gewinne Level, um Sterne zu bekommen!', restored: 'Wieder aufgebaut!', districtDone: '{0} ist wieder aufgebaut!',
    districtP: 'Wunderbar! Der ganze Bezirk strahlt wieder. Bonus: {0} Münzen. Weiter nach {1}!',
    joker: 'Joker', undo: 'Zurück', jokerP: 'Passt auf jede Karte', undoP: 'Einen Zug zurücknehmen',
    starter: 'Starterpaket', starterSub: 'nur einmal', boosters: 'Booster-Truhe', lives1h: '1 Std. unendlich Leben', lives2h: '2 Std. unendlich Leben',
    coinsSub: '', appOnly: 'Käufe gibt es nur in der App.', pending: 'Zahlung wird bearbeitet.',
    buyErr: 'Der Store ist gerade nicht erreichbar. Bitte nochmal versuchen.', thanks: 'Danke! Inhalte hinzugefügt.',
    settings: 'Einstellungen', sound: 'Ton', privacy: 'Datenschutz', support: 'Support', version: 'Version',
    tCards: 'Karten', tDeck: 'Rest-Stapel ({0})', tTime: 'Tempo ({0})', tCombo: 'Beste Serie', comboX: 'Serie x{0}', combos: ['Gut!', 'Klasse!', 'Super!', 'Wahnsinn!', 'Unaufhaltsam!'],
    tip1: 'Tippe eine Karte, die eins höher oder eins tiefer ist als die offene Karte. König und Ass passen auch!',
    tip2: 'Nichts passt? Tippe auf den Stapel für eine neue Karte.',
    tip3: 'Räume alle Karten ab, um zu gewinnen. Karten am Stück füllen die Serie für Bonus-Münzen.',
    welcomeT: 'Willkommen in Mossbrook!', welcome: 'Das Frühjahrshochwasser hat unser halbes Dorf weggespült. Gewinne Kartenspiele, sammle Sterne, und wir bauen Mossbrook zusammen wieder auf!',
    wrenWin: ['Toll gespielt!', 'Mossbrook dankt dir!', 'Die Karten hatten keine Chance!', 'Sterne für das Dorf!'],
    unlimited: 'unendlich', coinShop: 'Booster für Münzen', livesFull: 'Leben sind voll',
    allDone: 'Weitere Bezirke kommen bald. Spiel weiter für Münzen!',
    d0: 'Flussufer', d1: 'Weidenwiese', d2: 'Frostfarn-Senke',
    tasks0: ['Weg freiräumen', 'Brücke reparieren', 'Brunnen neu bauen', 'Gärten bepflanzen', 'Mühle reparieren', 'Bäckerei eröffnen', 'Laternen aufhängen', 'Wrens Häuschen bauen'],
    tasks1: ['Wiesenweg mähen', 'Brücke streichen', 'Neuen Brunnen graben', 'Wildblumen säen', 'Mühle wieder drehen', 'Erstes Brot backen', 'Abendlampen anzünden', 'Rathaus errichten'],
    tasks2: ['Schneeweg schaufeln', 'Brücke winterfest machen', 'Alten Brunnen wärmen', 'Wintergewächshaus', 'Mühlrad auftauen', 'Kakao-Stand', 'Frostlaternen', 'Hütte bauen']
  }
};
const LANG = /^de/i.test(navigator.language || '') ? 'de' : 'en';
function t(k, ...a) { let s = T[LANG][k] ?? T.en[k] ?? k; a.forEach((v, i) => { s = s.replace('{' + i + '}', v); }); return s; }

const VERSION = '0.1.0';
const LIFE_MS = 20 * 60 * 1000, MAX_LIVES = 5;
const TASK_KEYS = ['path', 'bridge', 'well', 'garden', 'mill', 'bakery', 'lanterns', 'cottage'];
const TASK_COST = [1, 2, 2, 2, 3, 3, 3, 4];
const DISTRICTS = 3;
const PLUS_PRICE = [300, 600, 900, 1200];
const COIN_ITEMS = { joker: 400, undo: 250, refill: 900 };
const PRODUCTS = [
  { id: 'coins_1000', coins: 1000, price: '$1.99' },
  { id: 'coins_2800', coins: 2800, price: '$4.99' },
  { id: 'coins_6000', coins: 6000, price: '$9.99' },
  { id: 'coins_13000', coins: 13000, price: '$19.99' },
  { id: 'coins_35000', coins: 35000, price: '$49.99' },
  { id: 'coins_75000', coins: 75000, price: '$99.99' },
  { id: 'starter', coins: 2000, jokers: 3, undos: 3, inf: 60, price: '$1.99', once: true },
  { id: 'boosters', coins: 0, jokers: 5, undos: 5, inf: 120, price: '$4.99' }
];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♠', '♥', '♦', '♣'];

// ---------- save ----------
const SAVE_KEY = 'mossbrook_save_v1';
const DEF = { level: 1, coins: 500, stars: 0, lives: MAX_LIVES, lifeT: 0, infUntil: 0, jokers: 2, undos: 2,
  district: 0, done: [], tx: {}, starter: false, sound: true, tut: 0, welcomed: false, wins: 0, plays: 0 };
let S = load();
function load() {
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
  if (!raw && window.AndroidBilling && AndroidBilling.loadMirror) { try { raw = AndroidBilling.loadMirror() || null; } catch (e) {} }
  let s = {};
  try { s = raw ? JSON.parse(raw) : {}; } catch (e) { s = {}; }
  return Object.assign({}, DEF, s, { done: Array.isArray(s.done) ? s.done : [], tx: s.tx || {} });
}
function save() {
  const j = JSON.stringify(S);
  try { localStorage.setItem(SAVE_KEY, j); } catch (e) {}
  if (window.AndroidBilling && AndroidBilling.saveMirror) { try { AndroidBilling.saveMirror(j); } catch (e) {} }
}

// ---------- helpers ----------
const $ = id => document.getElementById(id);
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let r = Math.imul(a ^ a >>> 15, 1 | a); r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r; return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }
function fmtTime(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function now() { return Date.now(); }
function infinite() { return S.infUntil > now(); }
function regen() {
  if (S.lives >= MAX_LIVES) { S.lifeT = now(); return; }
  if (!S.lifeT) S.lifeT = now();
  const n = Math.floor((now() - S.lifeT) / LIFE_MS);
  if (n > 0) { S.lives = Math.min(MAX_LIVES, S.lives + n); S.lifeT += n * LIFE_MS; if (S.lives >= MAX_LIVES) S.lifeT = now(); save(); }
}
function nextLifeIn() { return LIFE_MS - (now() - S.lifeT); }

let actx = null;
function tone(f, d = 0.09, type = 'triangle', vol = 0.08) {
  if (!S.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = f; g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + d);
    o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + d);
  } catch (e) {}
}
function haptic(kind) { try { window.webkit.messageHandlers.haptic.postMessage(kind || 'merge'); } catch (e) {} }
function toast(msg) { const x = $('toast'); x.textContent = msg; x.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => x.classList.remove('on'), 2200); }

// ---------- characters ----------
function fox() {
  return '<svg viewBox="0 0 100 100"><circle cx="50" cy="52" r="46" fill="#ffe9c7"/>' +
    '<path d="M18 22 L34 50 L22 58Z M82 22 L66 50 L78 58Z" fill="#e2702a" stroke="#7a3510" stroke-width="2"/>' +
    '<path d="M24 30 L32 48 L26 52Z M76 30 L68 48 L74 52Z" fill="#3a1d0e"/>' +
    '<path d="M20 52 Q50 20 80 52 Q78 78 50 90 Q22 78 20 52Z" fill="#ef8a3c" stroke="#7a3510" stroke-width="2"/>' +
    '<path d="M28 62 Q50 58 72 62 Q66 84 50 90 Q34 84 28 62Z" fill="#fff6ea"/>' +
    '<circle cx="38" cy="56" r="5" fill="#2b1a10"/><circle cx="62" cy="56" r="5" fill="#2b1a10"/>' +
    '<circle cx="39.5" cy="54.5" r="1.6" fill="#fff"/><circle cx="63.5" cy="54.5" r="1.6" fill="#fff"/>' +
    '<ellipse cx="50" cy="70" rx="5" ry="3.6" fill="#2b1a10"/><path d="M44 76 Q50 80 56 76" stroke="#2b1a10" stroke-width="2" fill="none"/>' +
    '<path d="M30 40 Q50 30 70 40 L66 46 Q50 38 34 46Z" fill="#4f8f3a"/></svg>';
}
function badger() {
  return '<svg viewBox="0 0 100 100"><circle cx="50" cy="52" r="46" fill="#e8f1df"/>' +
    '<circle cx="24" cy="34" r="9" fill="#555" stroke="#222" stroke-width="2"/><circle cx="76" cy="34" r="9" fill="#555" stroke="#222" stroke-width="2"/>' +
    '<path d="M18 56 Q50 18 82 56 Q80 84 50 92 Q20 84 18 56Z" fill="#6d6d6d" stroke="#222" stroke-width="2"/>' +
    '<path d="M44 26 Q50 22 56 26 L56 92 L44 92Z" fill="#f7f4ee"/>' +
    '<path d="M24 48 Q36 46 40 74 Q30 70 24 48Z M76 48 Q64 46 60 74 Q70 70 76 48Z" fill="#2a2a2a"/>' +
    '<circle cx="35" cy="58" r="4" fill="#fff"/><circle cx="65" cy="58" r="4" fill="#fff"/>' +
    '<circle cx="35" cy="58" r="2.2" fill="#111"/><circle cx="65" cy="58" r="2.2" fill="#111"/>' +
    '<ellipse cx="50" cy="78" rx="6" ry="4.5" fill="#222"/>' +
    '<path d="M28 22 Q50 2 72 22 Q50 16 28 22Z" fill="#fff" stroke="#bbb" stroke-width="2"/></svg>';
}
function who(svg, text) { return '<div class="who">' + svg + '<p>' + text + '</p></div>'; }

// ---------- modal ----------
function modal(html, onBind) {
  $('mbox').innerHTML = html; $('modal').classList.remove('hidden');
  if (onBind) onBind($('mbox'));
}
function closeModal() { $('modal').classList.add('hidden'); $('mbox').innerHTML = ''; }
function btn(id, cls, label) { return '<button id="' + id + '" class="' + cls + '">' + label + '</button>'; }

// ---------- HUD ----------
function hud() {
  regen();
  $('coins').textContent = S.coins.toLocaleString();
  $('stars').textContent = S.stars;
  if (infinite()) { $('lives').textContent = '∞'; $('livesT').textContent = fmtTime(S.infUntil - now()); }
  else { $('lives').textContent = S.lives; $('livesT').textContent = S.lives >= MAX_LIVES ? t('full') : fmtTime(nextLifeIn()); }
  if (G) { $('jokerN').textContent = S.jokers; $('undoN').textContent = S.undos;
    $('btnJoker').classList.toggle('off', !S.jokers); $('btnUndo').classList.toggle('off', !S.undos || !G.hist.length); }
}
setInterval(() => { hud(); if (G && !G.over) $('gTime').textContent = '\u23F1 ' + fmtTime(now() - G.t0); }, 1000);

// ---------- village ----------
function sceneSVG() {
  const sky = [['#0d1240', '#3b3a8f'], ['#2a1450', '#d9675a'], ['#0b2140', '#3f6f9a']][S.district % 3];
  const grass = [['#3f7a4a', '#2c5a3a'], ['#6a7a3a', '#4a5a2a'], ['#b9c9d6', '#8fa3b5']][S.district % 3];
  const g = (k, ruin, built) => '<g id="t-' + k + '"><g class="ruin">' + ruin + '</g><g class="built">' + built + '</g></g>';
  return '<svg viewBox="0 0 360 440" preserveAspectRatio="xMidYMid slice">' +
  '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + sky[0] + '"/><stop offset="1" stop-color="' + sky[1] + '"/></linearGradient>' +
  '<radialGradient id="glow"><stop offset="0" stop-color="#ffe9a0" stop-opacity=".9"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient></defs>' +
  '<rect width="360" height="440" fill="url(#sky)"/>' +
  Array.from({ length: 26 }, (_, i) => '<circle cx="' + ((i * 137) % 360) + '" cy="' + ((i * 71) % 110 + 6) + '" r="' + (i % 3 ? 1 : 1.8) + '" fill="#fff" opacity="' + (0.4 + (i % 4) * 0.15) + '"/>').join('') +
  (S.district % 3 === 1 ? '<circle cx="290" cy="80" r="34" fill="#ffb36b" opacity=".9"/>' : '<circle cx="290" cy="56" r="22" fill="#fff8d0"/><circle cx="298" cy="50" r="20" fill="' + sky[0] + '"/>') +
  '<path d="M0 120 Q60 80 130 110 T260 100 T360 115 V440 H0Z" fill="' + grass[1] + '" opacity=".7"/>' +
  '<path d="M0 150 Q90 120 180 140 T360 135 V440 H0Z" fill="' + grass[0] + '"/>' +
  '<path d="M360 150 C300 190 250 200 220 240 C190 280 120 290 90 330 C60 370 30 400 0 420 V440 H40 C70 410 110 380 140 350 C170 320 230 300 260 260 C290 225 330 205 360 190Z" fill="#5aa9d6"/>' +
  '<path d="M330 175 C300 195 270 210 245 240 M150 320 C120 340 90 365 60 395" stroke="#bfe6fb" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>' +
  // trees
  [[30, 150], [330, 140], [20, 260], [345, 300], [300, 420], [150, 165]].map(p => '<g transform="translate(' + p[0] + ',' + p[1] + ')"><rect x="-3" y="0" width="6" height="16" fill="#6b4226"/><circle cx="0" cy="-6" r="16" fill="' + (S.district % 3 === 2 ? '#dfe9ee' : '#3f7f3a') + '"/><circle cx="-6" cy="-12" r="9" fill="' + (S.district % 3 === 2 ? '#fff' : '#57a04a') + '"/></g>').join('') +
  g('path',
    '<g fill="#3e6e34"><circle cx="190" cy="420" r="16"/><circle cx="170" cy="400" r="13"/><circle cx="205" cy="390" r="14"/><circle cx="185" cy="372" r="12"/></g>',
    '<path d="M150 440 C160 410 200 400 190 370 C185 350 200 330 205 300" stroke="#d9b98a" stroke-width="22" fill="none" stroke-linecap="round"/>' +
    '<g fill="#bfa073"><circle cx="165" cy="420" r="3"/><circle cx="190" cy="395" r="3"/><circle cx="192" cy="360" r="3"/><circle cx="200" cy="325" r="3"/></g>') +
  g('bridge',
    '<g fill="#7b5233"><rect x="175" y="262" width="22" height="7" transform="rotate(20 186 265)"/><rect x="225" y="270" width="20" height="7" transform="rotate(-25 235 273)"/></g>',
    '<path d="M168 282 Q205 245 245 270" stroke="#8a5a34" stroke-width="12" fill="none"/>' +
    '<path d="M168 272 Q205 235 245 260" stroke="#5e3b20" stroke-width="3" fill="none"/>' +
    '<g stroke="#5e3b20" stroke-width="3"><line x1="180" y1="276" x2="180" y2="262"/><line x1="205" y1="262" x2="205" y2="250"/><line x1="230" y1="266" x2="230" y2="254"/></g>') +
  g('well',
    '<g fill="#8d8d8d"><circle cx="70" cy="345" r="7"/><circle cx="84" cy="350" r="6"/><circle cx="62" cy="355" r="5"/></g>',
    '<ellipse cx="72" cy="352" rx="20" ry="8" fill="#6b6b6b"/><rect x="52" y="335" width="40" height="17" fill="#a0a0a0" stroke="#666" stroke-width="2"/>' +
    '<g stroke="#6b4226" stroke-width="4"><line x1="56" y1="335" x2="56" y2="310"/><line x1="88" y1="335" x2="88" y2="310"/></g>' +
    '<path d="M48 312 L72 296 L96 312Z" fill="#b5462e" stroke="#7a2a18" stroke-width="2"/><rect x="66" y="318" width="10" height="9" fill="#7b5233"/>') +
  g('garden',
    '<g fill="#7a5a3a"><ellipse cx="270" cy="380" rx="28" ry="10"/><ellipse cx="300" cy="405" rx="22" ry="8"/></g><g stroke="#4f6b2a" stroke-width="2"><line x1="262" y1="378" x2="258" y2="368"/><line x1="290" y1="403" x2="294" y2="393"/></g>',
    '<ellipse cx="270" cy="380" rx="30" ry="11" fill="#6b4a2c"/><ellipse cx="302" cy="406" rx="24" ry="9" fill="#6b4a2c"/>' +
    [[252, 374, '#e5484d'], [264, 372, '#f5c542'], [276, 374, '#d36bd6'], [288, 378, '#ffffff'], [258, 384, '#f5c542'], [280, 384, '#e5484d'], [292, 400, '#ffffff'], [304, 398, '#e5484d'], [314, 406, '#f5c542'], [298, 410, '#d36bd6']].map(f => '<circle cx="' + f[0] + '" cy="' + f[1] + '" r="4.5" fill="' + f[2] + '" stroke="#3d6b2a" stroke-width="1.5"/>').join('')) +
  g('mill',
    '<g fill="#8d8d8d"><rect x="262" y="190" width="14" height="22"/><rect x="290" y="198" width="16" height="14"/><rect x="258" y="210" width="52" height="6"/></g>',
    '<rect x="260" y="172" width="50" height="42" fill="#f1e2c4" stroke="#7b5233" stroke-width="2"/><path d="M254 174 L285 146 L316 174Z" fill="#8a5a34" stroke="#5e3b20" stroke-width="2"/>' +
    '<rect x="279" y="192" width="12" height="22" fill="#7b5233"/><circle cx="248" cy="205" r="20" fill="none" stroke="#6b4226" stroke-width="4"/>' +
    '<g stroke="#6b4226" stroke-width="3"><line x1="228" y1="205" x2="268" y2="205"/><line x1="248" y1="185" x2="248" y2="225"/><line x1="234" y1="191" x2="262" y2="219"/><line x1="262" y1="191" x2="234" y2="219"/></g>') +
  g('bakery',
    '<g fill="#8d8d8d"><rect x="66" y="200" width="56" height="10"/><rect x="66" y="180" width="10" height="22"/><rect x="108" y="186" width="12" height="16"/></g>',
    '<rect x="64" y="172" width="60" height="40" fill="#fbe7c6" stroke="#7b5233" stroke-width="2"/><path d="M58 174 L94 146 L130 174Z" fill="#c8543a" stroke="#7a2a18" stroke-width="2"/>' +
    '<rect x="110" y="146" width="9" height="18" fill="#7a2a18"/><circle cx="115" cy="138" r="5" fill="#fff" opacity=".7"/><circle cx="120" cy="128" r="6" fill="#fff" opacity=".5"/>' +
    '<rect x="88" y="190" width="14" height="22" fill="#7b5233"/><rect x="70" y="182" width="12" height="10" fill="#9fd8f5" stroke="#7b5233" stroke-width="2"/>' +
    '<rect x="74" y="160" width="40" height="10" rx="3" fill="#f5c542" stroke="#9c6e10"/><text x="94" y="168" font-size="8" text-anchor="middle" fill="#5e3b20" font-family="Fredoka">BAKERY</text>') +
  g('lanterns',
    '<g stroke="#6b4226" stroke-width="3"><line x1="140" y1="420" x2="160" y2="410"/><line x1="215" y1="345" x2="230" y2="335"/></g>',
    [[150, 395], [220, 330], [225, 270]].map(p => '<g><circle cx="' + p[0] + '" cy="' + (p[1] - 26) + '" r="16" fill="url(#glow)"/><line x1="' + p[0] + '" y1="' + p[1] + '" x2="' + p[0] + '" y2="' + (p[1] - 26) + '" stroke="#4a3220" stroke-width="3"/><rect x="' + (p[0] - 5) + '" y="' + (p[1] - 33) + '" width="10" height="12" rx="2" fill="#ffd866" stroke="#4a3220" stroke-width="2"/></g>').join('')) +
  g('cottage',
    '<g fill="#8d8d8d"><rect x="160" y="112" width="70" height="8"/><rect x="164" y="96" width="10" height="16"/><rect x="214" y="100" width="12" height="12"/></g>',
    '<rect x="160" y="80" width="72" height="42" fill="#fff3dc" stroke="#7b5233" stroke-width="2"/><path d="M152 84 L196 50 L240 84Z" fill="#4f8f3a" stroke="#2f5e22" stroke-width="2"/>' +
    '<rect x="188" y="98" width="16" height="24" rx="8" fill="#b5462e"/><circle cx="174" cy="96" r="7" fill="#9fd8f5" stroke="#7b5233" stroke-width="2"/><circle cx="218" cy="96" r="7" fill="#9fd8f5" stroke="#7b5233" stroke-width="2"/>' +
    '<path d="M150 124 Q196 132 242 124" stroke="#e5484d" stroke-width="4" fill="none" stroke-dasharray="2 6" stroke-linecap="round"/>') +
  '</svg>';
}
function renderVillage(popKey) {
  $('vTitle').textContent = t('d' + (S.district % DISTRICTS));
  $('scene').innerHTML = sceneSVG();
  TASK_KEYS.forEach(k => { const g = document.getElementById('t-' + k); if (S.done.includes(k)) g.classList.add('done'); });
  if (popKey) { const g = document.getElementById('t-' + popKey); g.classList.add('pop'); }
  const box = $('tasks'); box.innerHTML = '';
  const names = T[LANG]['tasks' + (S.district % DISTRICTS)];
  TASK_KEYS.forEach((k, i) => {
    const done = S.done.includes(k);
    const d = el('div', 'task' + (done ? ' done' : ''), '<div class="tn">' + names[i] + '</div>');
    const b = el('button', '', done ? '✓' : '<span class="ic star"></span>' + TASK_COST[i]);
    if (!done && S.stars < TASK_COST[i]) b.disabled = true;
    b.onclick = () => buildTask(k, i);
    d.appendChild(b); box.appendChild(d);
  });
  // undone tasks first
  [...box.children].filter(c => c.classList.contains('done')).forEach(c => box.appendChild(c));
  $('btnPlay').textContent = t('play', S.level);
}
function buildTask(k, i) {
  if (S.done.includes(k)) return;
  if (S.stars < TASK_COST[i]) { toast(t('needStars')); return; }
  S.stars -= TASK_COST[i]; S.done.push(k); save();
  tone(523, .12); setTimeout(() => tone(659, .12), 110); setTimeout(() => tone(784, .2), 220); haptic('deliver');
  renderVillage(k); hud(); toast(t('restored'));
  if (S.done.length === TASK_KEYS.length) setTimeout(districtDone, 1100);
}
function districtDone() {
  const name = t('d' + (S.district % DISTRICTS)), bonus = 500;
  S.coins += bonus; S.district++; S.done = []; save();
  const nxt = S.district < DISTRICTS ? t('d' + S.district) : '';
  modal(who(badger(), '<b>' + t('districtDone', name) + '</b>') + '<p>' + (nxt ? t('districtP', bonus, nxt) : t('allDone')) + '</p>' +
    '<div class="row">' + btn('mOk', 'green', t('cont')) + '</div>', m => { m.querySelector('#mOk').onclick = () => { closeModal(); renderVillage(); hud(); }; });
}
function showVillage() {
  G = null; $('game').classList.add('hidden'); $('village').classList.remove('hidden');
  $('btnHome').innerHTML = '&#9881;';
  renderVillage(); hud();
  if (!S.welcomed) {
    modal('<h2>' + t('welcomeT') + '</h2>' + who(badger(), t('welcome')) + '<div class="row">' + btn('mOk', 'green', t('cont')) + '</div>',
      m => { m.querySelector('#mOk').onclick = () => { S.welcomed = true; save(); closeModal(); }; });
  }
}

// ---------- level generation ----------
function rowsToCards(rows) { const out = []; rows.forEach((xs, r) => xs.forEach(x => out.push({ x, row: r }))); return out; }
function range(a, b, step = 1) { const o = []; for (let v = a; v <= b + 1e-9; v += step) o.push(+v.toFixed(2)); return o; }
const LAYOUTS = [
  // single peak (21)
  () => rowsToCards([[2.5], [2, 3], [1.5, 2.5, 3.5], range(1, 4), range(0.5, 4.5), range(0, 5)]),
  // twin peaks (20)
  () => rowsToCards([[1.5, 6], [1, 2, 5.5, 6.5], [0.5, 1.5, 2.5, 5, 6, 7], [0, 1, 2, 3, 4.5, 5.5, 6.5, 7.5]]),
  // three peaks (28)
  () => rowsToCards([[1.5, 4.5, 7.5], [1, 2, 4, 5, 7, 8], range(0.5, 8.5), range(0, 9)]),
  // wall (26)
  () => rowsToCards([range(0, 6), range(0.5, 5.5), range(0, 6), range(0.5, 5.5)]),
  // bridge (23)
  () => rowsToCards([[0, 1, 2, 5, 6, 7], range(0.5, 6.5), range(0, 7), [1.5, 2.5, 3.5, 4.5, 5.5]]),
  // diamonds (22)
  () => rowsToCards([[1, 5], [0.5, 1.5, 4.5, 5.5], [0, 1, 2, 3, 4, 5, 6], [0.5, 1.5, 2.5, 3.5, 4.5, 5.5], [1, 3, 5]]),
  // tower + wings (27)
  () => rowsToCards([[3], [2.5, 3.5], [0, 1, 2, 3, 4, 5, 6], [0.5, 1.5, 2.5, 3.5, 4.5, 5.5], range(0, 6), [3]])
];
function genLevel(n, forceTier) {
  const rng = mulberry(n * 7919 + 17);
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const li = n === 1 ? 0 : n === 2 ? 1 : n === 3 ? 2 : (n * 5 + Math.floor(n / 7)) % LAYOUTS.length;
  const cards = LAYOUTS[li]().map((c, i) => ({ id: i, x: c.x, row: c.row }));
  cards.forEach(c => { c.cov = cards.filter(o => o.row === c.row + 1 && Math.abs(o.x - c.x) < 0.99).map(o => o.id); });
  // removal order that respects coverage
  const gone = new Set(), order = [];
  while (order.length < cards.length) {
    const av = cards.filter(c => !gone.has(c.id) && c.cov.every(id => gone.has(id)));
    const pick = av[Math.floor(rng() * av.length)];
    gone.add(pick.id); order.push(pick.id);
  }
  const hard = forceTier == null && n > 4 && n % 5 === 0;
  const tier = forceTier ?? Math.min(4, Math.floor((n - 1) / 8));
  const minRun = [4, 3, 3, 2, 2][tier], maxRun = [8, 7, 6, 6, 5][tier];
  let spare = Math.max(1, [10, 7, 5, 4, 3][tier] - (hard ? 2 : 0)) + (n <= 3 ? 4 : 0);
  const stock = [];
  let i = 0;
  while (i < order.length) {
    let v = ri(0, 12); stock.push({ v, s: ri(0, 3) });
    const L = ri(minRun, maxRun);
    for (let k = 0; k < L && i < order.length; k++, i++) {
      v = (v + (rng() < 0.5 ? 1 : 12)) % 13;
      const c = cards[order[i]]; c.v = v; c.s = ri(0, 3);
    }
  }
  while (spare-- > 0) stock.splice(ri(1, stock.length), 0, { v: ri(0, 12), s: ri(0, 3) });
  return { n, hard, cards, stock };
}

// ---------- game ----------
let G = null;
function cardFace(v, s, wild) {
  if (wild) return '<div class="f"><span class="r" style="color:#9c6e10">✳</span><span class="c" style="color:#9c6e10">★</span></div>';
  const red = s === 1 || s === 2;
  return '<div class="f' + (red ? ' red' : '') + '"><span class="r">' + RANKS[v] + '</span><span class="s">' + SUITS[s] + '</span><span class="c">' + SUITS[s] + '</span></div>';
}
function makeCardEl(v, s, wild) {
  const d = el('div', 'card' + (wild ? ' wild' : ''));
  d.innerHTML = '<div class="in"><div class="b"></div>' + cardFace(v, s, wild) + '</div>';
  return d;
}
function sizeCard(d) {
  const { cw, ch } = G.geo;
  d.style.width = cw + 'px'; d.style.height = ch + 'px';
  const r = d.querySelector('.r'), s = d.querySelector('.s'), c = d.querySelector('.c');
  if (r) { r.style.fontSize = (cw * 0.42) + 'px'; }
  if (s) { s.style.fontSize = (cw * 0.34) + 'px'; s.style.top = (cw * 0.46) + 'px'; }
  if (c) { c.style.fontSize = (cw * 0.62) + 'px'; }
}
function place(d, x, y, z) { d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.zIndex = z; }
function geometry() {
  const b = $('board'), bw = b.clientWidth, bh = b.clientHeight;
  const LW = Math.max(...G.cards.map(c => c.x)) + 1, R = Math.max(...G.cards.map(c => c.row)) + 1;
  let cw = (bw - 16) / LW;
  const tipH = G.n <= 2 && S.tut < 3 ? 70 : 0;
  const hNeed = k => k * 1.4 * (1 + (R - 1) * 0.5) + k * 1.4 * 1.25 + 40 + tipH;
  if (hNeed(cw) > bh) cw = (bh - 40 - tipH) / (1.4 * (1 + (R - 1) * 0.5 + 1.25));
  cw = Math.min(cw, 78);
  const ch = cw * 1.4;
  const x0 = (bw - LW * cw) / 2, tabH = ch * (1 + (R - 1) * 0.5);
  const y0 = Math.max(10, (bh - ch * 1.25 - 30 - tabH - tipH) / 2);
  const sy = bh - ch - 14;
  G.geo = { cw, ch, x0, y0, tipY: y0 + tabH + 6, stock: [bw / 2 - cw * 1.35, sy], waste: [bw / 2 + cw * 0.35, sy] };
}
function cardPos(c) { const g = G.geo; return [g.x0 + c.x * g.cw, g.y0 + c.row * g.ch * 0.5]; }
function isUp(c) { return !c.gone && c.cov.every(id => G.cards[id].gone); }
function wTop() { return G.waste[G.waste.length - 1]; }
function fits(c) { const w = wTop(); if (!w) return false; if (w.wild) return true; const d = (c.v - w.v + 13) % 13; return d === 1 || d === 12; }

function startLevel(n) {
  regen();
  if (!infinite() && S.lives <= 0) { noLives(); return; }
  closeModal();
  const L = genLevel(n);
  G = { n, hard: L.hard, cards: L.cards, stock: L.stock, waste: [], hist: [], streak: 0, best: 0, earned: 0, plusN: 0, idle: 0, t0: now() };
  $('village').classList.add('hidden'); $('game').classList.remove('hidden');
  $('btnHome').innerHTML = '&#8962;';
  $('gLevel').textContent = t('level', n) + (G.hard ? ' • ' + t('hard') : '');
  S.plays++; save();
  layoutBoard(true);
  // first waste card
  setTimeout(() => drawCard(true), 350);
  hud();
}
function layoutBoard(fresh) {
  const b = $('board');
  if (fresh) b.innerHTML = '';
  geometry();
  G.cards.forEach(c => {
    if (!c.el) {
      c.el = makeCardEl(c.v, c.s); b.appendChild(c.el);
      c.el.onclick = () => tapCard(c);
      const [sx, sy] = G.geo.stock; place(c.el, sx, sy, 1);
    }
    sizeCard(c.el);
    if (!c.gone) { const [x, y] = cardPos(c); place(c.el, x, y, 10 + c.row * 20 + Math.round(c.x * 2)); }
  });
  if (!G.stockEl) { G.stockEl = makeCardEl(0, 0); G.stockEl.onclick = () => drawCard(false); b.appendChild(G.stockEl); }
  sizeCard(G.stockEl); place(G.stockEl, G.geo.stock[0], G.geo.stock[1], 5);
  G.waste.forEach((w, i) => { if (w.el) { sizeCard(w.el); place(w.el, G.geo.waste[0], G.geo.waste[1], 500 + i); } });
  refresh();
}
function refresh() {
  G.cards.forEach(c => {
    if (c.gone) return;
    const up = isUp(c);
    c.el.classList.toggle('up', up);
    c.el.classList.toggle('play', up);
    c.el.classList.remove('hint');
  });
  G.stockEl.style.visibility = G.stock.length ? 'visible' : 'hidden';
  $('stockCount').textContent = t('stock', G.stock.length);
  const left = G.cards.filter(c => !c.gone).length;
  $('gGoal').textContent = t('cardsLeft', left);
  G.left = left;
  const pct = Math.min(1, (G.streak % 5) / 5 + (G.streak && G.streak % 5 === 0 ? 1 : 0));
  $('streakFill').style.width = (pct * 100) + '%';
  $('streakTxt').textContent = t('streak', G.streak);
  G.idle = 0;
  hud();
  tutorial();
}
function confetti() {
  const app = $('app'), c = el('canvas'); c.id = 'fx'; c.width = app.clientWidth; c.height = app.clientHeight; app.appendChild(c);
  const r = el('div', 'rays'); app.appendChild(r);
  const x = c.getContext('2d'), cols = ['#3ef2ff', '#ff4fd8', '#ffd23f', '#7dff9a', '#ffffff'];
  const ps = Array.from({ length: 140 }, () => ({ x: c.width / 2, y: c.height * 0.45, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, s: 4 + Math.random() * 6, c: cols[Math.floor(Math.random() * 5)], a: Math.random() * 6 }));
  let f = 0;
  (function tick() {
    x.clearRect(0, 0, c.width, c.height);
    ps.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; p.a += .2; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); });
    if (++f < 150) requestAnimationFrame(tick); else c.remove();
  })();
  setTimeout(() => r.remove(), 4000);
}
function combo(n) {
  const o = document.getElementById('combo'); if (o) o.remove();
  const words = T[LANG].combos, w = words[Math.min(words.length - 1, Math.floor((n - 3) / 3))];
  const d = el('div', '', w + '<small>' + t('comboX', n) + '</small>'); d.id = 'combo';
  d.style.top = (G.geo.y0 + G.geo.ch * 0.6) + 'px';
  if (n >= 9) d.classList.add('hot');
  $('board').appendChild(d); setTimeout(() => d.remove(), 900);
}
function flyText(txt, x, y) { const f = el('div', 'fly', txt); f.style.left = x + 'px'; f.style.top = y + 'px'; $('board').appendChild(f); setTimeout(() => f.remove(), 1000); }
function pushWaste(item) {
  G.waste.push(item);
  // keep the DOM small: only the last few waste cards stay as elements
  const old = G.waste[G.waste.length - 5];
  if (old && old.el && !old.keep) { const e = old.el; setTimeout(() => { if (G && e.parentNode && old.el === e) { e.remove(); old.el = null; } }, 400); }
}
function tapCard(c) {
  if (!G || G.over || c.gone || !isUp(c)) return;
  if (!fits(c)) { c.el.classList.remove('shake'); void c.el.offsetWidth; c.el.classList.add('shake'); tone(150, .08, 'square', .04); return; }
  G.hist.push({ type: 'play', c, streak: G.streak, earned: G.earned });
  c.gone = true;
  G.streak++; G.best = Math.max(G.best, G.streak);
  let gain = 5 + Math.min(G.streak, 10);
  const peak = c.row === 0;
  if (peak) gain += 25;
  if (G.streak % 5 === 0) gain += G.streak * 4;
  G.earned += gain;
  pushWaste({ v: c.v, s: c.s, el: c.el });
  place(c.el, G.geo.waste[0], G.geo.waste[1], 500 + G.waste.length);
  c.el.classList.remove('play');
  const [x, y] = cardPos(c);
  flyText('+' + gain, x, y);
  if (G.streak >= 3) combo(G.streak);
  tone(392 * Math.pow(2, Math.min(G.streak, 14) / 12), .1); haptic('merge');
  refresh();
  checkEnd();
}
function drawCard(initial) {
  if (!G || G.over || !G.stock.length) return;
  const item = G.stock.shift();
  if (!initial) { G.hist.push({ type: 'draw', item, streak: G.streak, earned: G.earned }); G.streak = 0; }
  const d = makeCardEl(item.v, item.s); sizeCard(d);
  place(d, G.geo.stock[0], G.geo.stock[1], 600 + G.waste.length);
  $('board').appendChild(d);
  pushWaste({ v: item.v, s: item.s, el: d });
  requestAnimationFrame(() => requestAnimationFrame(() => { d.classList.add('up'); place(d, G.geo.waste[0], G.geo.waste[1], 500 + G.waste.length); }));
  tone(260, .07, 'sine');
  if (!initial && S.tut === 1) S.tut = 2;
  refresh();
  setTimeout(checkEnd, 320);
}
function useJoker() {
  if (!G || G.over) return;
  if (!S.jokers) { shopBooster('joker'); return; }
  S.jokers--; save();
  const d = makeCardEl(0, 0, true); sizeCard(d); d.classList.add('up');
  place(d, G.geo.waste[0], G.geo.waste[1] - 30, 600 + G.waste.length); $('board').appendChild(d);
  requestAnimationFrame(() => place(d, G.geo.waste[0], G.geo.waste[1], 500 + G.waste.length));
  G.hist.push({ type: 'joker', streak: G.streak, earned: G.earned });
  pushWaste({ wild: true, el: d });
  tone(880, .15); refresh();
}
function undo() {
  if (!G || G.over || !G.hist.length) return;
  if (!S.undos) { shopBooster('undo'); return; }
  const h = G.hist.pop(); S.undos--; save();
  const w = G.waste.pop();
  if (h.type === 'play') {
    h.c.gone = false; const [x, y] = cardPos(h.c); place(h.c.el, x, y, 10 + h.c.row * 20 + Math.round(h.c.x * 2));
  } else if (h.type === 'draw') {
    G.stock.unshift(h.item); if (w.el) w.el.remove();
  } else if (h.type === 'joker') { S.jokers++; if (w.el) w.el.remove(); }
  // the card below may have been dropped from the DOM; rebuild it
  const tp = wTop();
  if (tp && !tp.el) { tp.el = makeCardEl(tp.v, tp.s, tp.wild); tp.el.classList.add('up'); sizeCard(tp.el); place(tp.el, G.geo.waste[0], G.geo.waste[1], 500 + G.waste.length); $('board').appendChild(tp.el); }
  G.streak = h.streak; G.earned = h.earned;
  tone(330, .08, 'sine'); refresh();
}
function playable() { return G.cards.filter(c => isUp(c) && fits(c)); }
function checkEnd() {
  if (!G || G.over) return;
  if (G.cards.every(c => c.gone)) { win(); return; }
  if (!G.stock.length && !playable().length) outOfMoves();
}
function win() {
  G.over = true;
  const tipEl = document.getElementById('tip'); if (tipEl) tipEl.remove();
  const secs = Math.round((now() - G.t0) / 1000), timeB = Math.max(0, (90 - secs) * 3);
  const deckB = G.stock.length * 20, bonus = 50 + deckB + timeB, coins = G.earned + bonus, stars = G.hard ? 2 : 1;
  S.coins += coins; S.stars += stars; S.level = G.n + 1; S.wins++; save();
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, .18), i * 120)); haptic('deliver'); confetti();
  const line = T[LANG].wrenWin[G.n % T[LANG].wrenWin.length];
  setTimeout(() => modal('<h2>' + t('winT') + '</h2>' + who(fox(), line) +
    '<div class="tally"><span>' + t('tCards') + '</span><b>' + G.earned + '</b><span>' + t('tDeck', G.stock.length) + '</span><b>' + (50 + deckB) + '</b><span>' + t('tTime', fmtTime(secs * 1000)) + '</span><b>' + timeB + '</b><span>' + t('tCombo') + '</span><b>' + G.best + '</b></div>' +
    '<div class="reward"><span><span class="ic coin"></span>+' + coins + '</span><span><span class="ic star"></span>+' + stars + '</span></div>' +
    '<div class="row">' + btn('mVil', 'blue', t('village')) + btn('mNext', 'green', t('next')) + '</div>', m => {
      m.querySelector('#mVil').onclick = () => { closeModal(); showVillage(); };
      m.querySelector('#mNext').onclick = () => startLevel(S.level);
    }), 500);
}
function outOfMoves() {
  G.over = true;
  const price = PLUS_PRICE[Math.min(G.plusN, PLUS_PRICE.length - 1)];
  const left = G.cards.filter(c => !c.gone).length;
  modal('<h2>' + t('outT') + '</h2>' + who(fox(), t('outP', left)) +
    '<div class="row">' + btn('mGive', 'grey', t('giveUp')) + btn('mPlus', 'gold', t('plus5') + ' <span class="ic coin" style="vertical-align:-4px"></span>' + price) + '</div>', m => {
      m.querySelector('#mGive').onclick = lose;
      m.querySelector('#mPlus').onclick = () => {
        if (S.coins < price) { toast(t('needCoins')); openShop(); return; }
        S.coins -= price; G.plusN++; save(); closeModal(); addFive(); G.over = false; refresh();
      };
    });
}
function addFive() {
  // pay2win: the extra cards are chosen to fit cards that are open right now
  const open = G.cards.filter(c => isUp(c));
  const extra = [];
  for (let k = 0; k < 5; k++) {
    const base = open.length ? open[(k * 3 + G.plusN) % open.length] : null;
    const v = base && k < 3 ? (base.v + (k % 2 ? 1 : 12)) % 13 : Math.floor(Math.random() * 13);
    extra.push({ v, s: Math.floor(Math.random() * 4) });
  }
  G.stock.push(...extra);
}
function lose() {
  if (!infinite()) { if (S.lives >= MAX_LIVES) S.lifeT = now(); S.lives = Math.max(0, S.lives - 1); }
  save(); hud();
  tone(220, .25, 'sine');
  modal('<h2>' + t('loseT') + '</h2>' + who(badger(), t('loseP')) +
    '<div class="row">' + btn('mVil', 'blue', t('village')) + btn('mRetry', 'green', t('retry')) + '</div>', m => {
      m.querySelector('#mVil').onclick = () => { closeModal(); showVillage(); };
      m.querySelector('#mRetry').onclick = () => startLevel(G.n);
    });
}
function noLives() {
  modal('<h2>' + t('noLives') + '</h2>' + who(badger(), t('noLivesP', fmtTime(nextLifeIn()))) +
    '<div class="row">' + btn('mWait', 'blue', t('wait')) + btn('mRefill', 'gold', t('refill') + ' <span class="ic coin" style="vertical-align:-4px"></span>' + COIN_ITEMS.refill) + '</div>', m => {
      m.querySelector('#mWait').onclick = () => { closeModal(); if (G) showVillage(); };
      m.querySelector('#mRefill').onclick = () => {
        if (S.coins < COIN_ITEMS.refill) { toast(t('needCoins')); openShop(); return; }
        S.coins -= COIN_ITEMS.refill; S.lives = MAX_LIVES; S.lifeT = now(); save(); closeModal(); hud();
      };
    });
}
function quitLevel() {
  modal('<h2>' + t('quitT') + '</h2><p>' + t('quitP') + '</p><div class="row">' + btn('mLeave', 'grey', t('leave')) + btn('mStay', 'green', t('stay')) + '</div>', m => {
    m.querySelector('#mStay').onclick = closeModal;
    m.querySelector('#mLeave').onclick = () => {
      if (!infinite()) { if (S.lives >= MAX_LIVES) S.lifeT = now(); S.lives = Math.max(0, S.lives - 1); }
      save(); closeModal(); showVillage();
    };
  });
}

// ---------- tutorial + hints ----------
function tutorial() {
  const old = document.getElementById('tip'); if (old) old.remove();
  if (!G || G.n > 2 || S.tut >= 3) return;
  if (S.tut === 0 && G.n === 1) { tipBox(t('tip1')); if (playable().length === 0) S.tut = 1; }
  if (S.tut === 0 && G.waste.length > 1 && G.cards.some(c => c.gone)) S.tut = 1;
  if (S.tut === 1 && !playable().length) tipBox(t('tip2'));
  else if (S.tut === 2) { tipBox(t('tip3')); setTimeout(() => { S.tut = 3; save(); const o = document.getElementById('tip'); if (o) o.remove(); }, 4500); }
}
function tipBox(txt) {
  const d = el('div', '', fox() + '<span>' + txt + '</span>'); d.id = 'tip';
  d.style.top = G.geo.tipY + 'px'; d.style.bottom = 'auto';
  $('board').appendChild(d);
}
setInterval(() => {
  if (!G || G.over || !$('modal').classList.contains('hidden')) return;
  G.idle++;
  if (G.idle === 5 || (G.n === 1 && G.idle === 2)) playable().forEach(c => c.el.classList.add('hint'));
}, 1000);

// ---------- shop ----------
let PRICES = {};
window.onNativePrices = p => { PRICES = p || {}; };
window.onNativePurchase = (id, tx) => {
  if (!S.tx[tx]) {
    const p = PRODUCTS.find(x => x.id === id);
    if (p) {
      S.coins += p.coins || 0; S.jokers += p.jokers || 0; S.undos += p.undos || 0;
      if (p.inf) S.infUntil = Math.max(now(), S.infUntil) + p.inf * 60000;
      if (p.once) S.starter = true;
      S.tx[tx] = 1; save(); hud(); toast(t('thanks')); haptic('deliver');
      if (!$('modal').classList.contains('hidden') && $('mbox').querySelector('.shopgrid')) openShop();
    }
  }
  try { AndroidBilling.ack(tx); } catch (e) {}
};
window.onNativePurchasePending = () => toast(t('pending'));
window.onNativePurchaseError = () => toast(t('buyErr'));
function buy(id) {
  if (!window.AndroidBilling) { toast(t('appOnly')); return; }
  AndroidBilling.buy(id);
}
function shopBooster(kind) {
  const price = COIN_ITEMS[kind];
  modal('<h2>' + t(kind) + '</h2><p>' + t(kind + 'P') + '</p><div class="row">' + btn('mX', 'grey', t('close')) +
    btn('mB', 'gold', '+1 <span class="ic coin" style="vertical-align:-4px"></span>' + price) + '</div>', m => {
      m.querySelector('#mX').onclick = closeModal;
      m.querySelector('#mB').onclick = () => {
        if (S.coins < price) { toast(t('needCoins')); openShop(); return; }
        S.coins -= price; if (kind === 'joker') S.jokers++; else S.undos++; save(); closeModal(); hud();
      };
    });
}
function openShop() {
  if (window.AndroidBilling && AndroidBilling.requestPrices) { try { AndroidBilling.requestPrices(); } catch (e) {} }
  const pr = p => PRICES[p.id] || p.price;
  let h = '<h2>' + t('shop') + '</h2><div class="shopgrid">';
  if (!S.starter) { const p = PRODUCTS.find(x => x.id === 'starter');
    h += '<div class="sitem wide"><div class="amt">' + t('starter') + '</div><div class="sub">2000 <span class="ic coin" style="width:14px;height:14px;vertical-align:-2px"></span> + 3 ' + t('joker') + ' + 3 ' + t('undo') + ' + ' + t('lives1h') + ' (' + t('starterSub') + ')</div>' +
      '<button class="gold" data-id="starter">' + pr(p) + '</button></div>'; }
  PRODUCTS.filter(p => p.id.startsWith('coins_')).forEach(p => {
    h += '<div class="sitem"><div class="amt"><span class="ic coin"></span>' + p.coins.toLocaleString() + '</div><div class="sub"></div><button class="green" data-id="' + p.id + '" style="color:#fff">' + pr(p) + '</button></div>';
  });
  const bx = PRODUCTS.find(x => x.id === 'boosters');
  h += '<div class="sitem wide"><div class="amt">' + t('boosters') + '</div><div class="sub">5 ' + t('joker') + ' + 5 ' + t('undo') + ' + ' + t('lives2h') + '</div><button class="gold" data-id="boosters">' + pr(bx) + '</button></div>';
  h += '</div><h3 style="margin:14px 0 6px">' + t('coinShop') + '</h3><div class="shopgrid">' +
    '<div class="sitem"><div class="amt">' + t('joker') + '</div><div class="sub">' + t('jokerP') + '</div><button class="gold" data-coin="joker">' + COIN_ITEMS.joker + '</button></div>' +
    '<div class="sitem"><div class="amt">' + t('undo') + '</div><div class="sub">' + t('undoP') + '</div><button class="gold" data-coin="undo">' + COIN_ITEMS.undo + '</button></div>' +
    '<div class="sitem wide"><div class="amt">' + t('refill') + ' ♥</div><button class="gold" data-coin="refill">' + COIN_ITEMS.refill + '</button></div></div>' +
    '<div class="row">' + btn('mX', 'blue', t('close')) + '</div>';
  modal(h, m => {
    m.querySelector('#mX').onclick = () => { closeModal(); if (G && G.over && G.cards.some(c => !c.gone) && !G.stock.length && !playable().length) outOfMoves(); };
    m.querySelectorAll('[data-id]').forEach(b => { b.onclick = () => buy(b.dataset.id); });
    m.querySelectorAll('[data-coin]').forEach(b => { b.onclick = () => {
      const k = b.dataset.coin, price = COIN_ITEMS[k];
      if (k === 'refill' && (S.lives >= MAX_LIVES || infinite())) { toast(t('livesFull')); return; }
      if (S.coins < price) { toast(t('needCoins')); return; }
      S.coins -= price;
      if (k === 'joker') S.jokers++; else if (k === 'undo') S.undos++; else { S.lives = MAX_LIVES; S.lifeT = now(); }
      save(); hud(); toast('✓');
    }; });
  });
}
function openSettings() {
  modal('<h2>' + t('settings') + '</h2><div class="settings">' +
    '<label>' + t('sound') + '<input type="checkbox" id="sSound"' + (S.sound ? ' checked' : '') + '></label>' +
    '<label>' + t('privacy') + '<a href="https://play.nyrathen.com/legal/privacy" target="_blank">↗</a></label>' +
    '<label>' + t('support') + '<a href="mailto:lords.azz6@gmail.com">✉</a></label>' +
    '<label>' + t('version') + '<span>' + VERSION + '</span></label></div>' +
    '<div class="row">' + btn('mX', 'green', t('close')) + '</div>', m => {
      m.querySelector('#sSound').onchange = e => { S.sound = e.target.checked; save(); };
      m.querySelector('#mX').onclick = closeModal;
    });
}

// ---------- wiring ----------
$('btnPlay').onclick = () => startLevel(S.level);
$('btnHome').onclick = () => { if (G && !G.over) quitLevel(); else if (G) showVillage(); else openSettings(); };
$('btnShopTop').onclick = openShop;
$('pLives').onclick = () => { regen(); if (!infinite() && S.lives < MAX_LIVES) noLives(); };
$('btnJoker').onclick = useJoker;
$('btnUndo').onclick = undo;
window.addEventListener('resize', () => { if (G) layoutBoard(false); });
window.onNativePause = save;
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); else hud(); });
showVillage();
if (window.AndroidBilling && AndroidBilling.pageReady) { try { AndroidBilling.pageReady(); } catch (e) {} }

// test hook (node/playwright)
window.__mb = { S: () => S, G: () => G, setG: g => { G = g; }, genLevel, fits, startLevel, tapCard, drawCard, playable, isUp, save };
