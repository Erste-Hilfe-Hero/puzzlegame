// Core tuning and texts used by game.js (plan-500 areas A, D, E, F, G4, I). Load after i18n.js, before game.js.
//
// Balance notes (D4 anchor: 1 gem = 5 energy = 20 coins; an item of level l costs 2^l energy):
// - orderCoins: 4 coins per energy at l=0 rising to 7.6 at l=6 (D6/A38), two-item orders +20 % (D8).
//   Zone costs live in data.js (content). taskCostMul scales them per place without touching data.js; with the
//   12.11.2026 content costs (places 600..7200 coins) it stays 1.0. The first order pays max(firstOrderCoins, first task).
// - orderXp: about 1.6 xp per energy (A37/D9). Up to level ~10 a level costs less energy than the level-up refill,
//   so the first session runs without empty energy (F23/F24); later levels are energy-gated.
DATA.x = {
  orderCoins: l => Math.round(4 * Math.pow(2, l) * (1 + 0.15 * l)),
  orderXp: l => Math.max(5, Math.round(1.6 * Math.pow(2, l))),
  // A35/F25: [lowest, highest] item level (0-based) per player level; no level-0 items from player level 2.
  orderLevel: lvl => { const hi = Math.min(6, 1 + Math.floor(lvl / 2)); return [lvl >= 2 ? Math.max(1, hi - 2) : 0, hi]; },
  twoItemLevel: 4, twoItemChance: 0.5, twoItemBonus: 1.2,
  onBoardChance: 0.3,
  // A10 feast order for a max-level item, D10 resident special order for a max-level item.
  feast: { level: 15, chance: 0.06, coinMul: 1.5, chest: 1 },
  special: { level: 12, chance: 0.06, coinMul: 3, gems: 5 },
  // F1: the first order pays for the first island task.
  firstOrderCoins: 30, firstOrderXp: 8,
  taskCostMul: [1, 1, 1, 1, 1, 1],
  levelUpGems: lvl => 5 + Math.floor(lvl / 5),
  // F23/F24: xp for the first levels (first level-up after about 4 minutes, level 3 before the energy runs out).
  // D48/D9: from level 11 a quadratic part keeps level-ups (and level gems) near the gem target; see docs/economy.md.
  xpEarly: [150, 160, 170],
  xpLate: lvl => (lvl > 10 ? Math.round(1.5 * Math.pow(lvl - 10, 2)) : 0),
  // A8/D30: sell value about half the energy cost.
  sellCoins: l => Math.floor(Math.pow(2, l) / 2) + 1,
  sellConfirmL: 3,
  swapFreeSec: 600, swapCostPct: 0.25,
  confirmGems: 250, confirmCoins: 1000,
  // F10, D23, A29
  bubbleMinLevel: 3,
  bubbleCost: l => Math.max(3, Math.round(0.4 * Math.pow(2, l))),
  bubbleCoins: l => 20 * Math.pow(2, l), bubbleCoinMaxL: 2,
  // A30/D39: storage slots 5 to 8.
  storeSlotCoins: [150, 400, 900, 2000], storeSlotGems: [40, 60, 80, 100],
  // D11 coin chest, A33 board row for coins after place 3.
  coinShop: [
    { id: 'coinChest', kind: 'chest', coins: 500, icon: 'chest' },
    { id: 'coinRow', kind: 'row', coins: 2000, zone: 3, once: 1, icon: 'x' }
  ],
  // D13 coin sack, D40 second board row for gems.
  gemShop: [
    { id: 'coinSack', kind: 'coins', name: 'Coin Sack', cost: 50, coins: 1200, icon: '🪙', desc: '1,200 coins for island tasks.' },
    { id: 'bigBoard2', kind: 'perm', name: 'Bigger Board II', cost: 500, rows: 1, req: 'bigBoard', icon: '🧱', desc: 'One more row on the board. Forever.' }
  ],
  passCatchUpDays: 3,
  // D42: purchase receipts kept in the save.
  receiptsMax: 200,
  // D20: Double Spawn counts taps instead of 1 hour. 100 doubled taps = 100 extra items = 100 energy (Golden: 200)
  // = 20 (40) gems by the D4 anchor; price 40 gems. The old 1 h boost cost 150 gems for about 130 taps.
  doubleSpawns: 100, doubleCost: 40,
  // F13: seconds per intro picture (3 pictures, 12 s at most).
  introSec: 4,
  // D49: from this coin stock (or after the last place) the shop shows the coin sinks first.
  sinkCoins: 3000,
  seriesSec: 4, seriesMin: 3,
  idleSec: 8,
  doubleTapMs: 350,
  // A24/A25/A26: driftwood on a new board, opened by merges next to it and by island tasks.
  driftCount: 20, driftPerTask: 2,
  driftLoot: [{ c: 'bakery', l: 0 }, { coins: 5 }, { c: 'bakery', l: 1 }, { c: 'fruit', l: 0 }, { coins: 10 }, { c: 'bakery', l: 2 }, { c: 'fruit', l: 1 }]
};

(() => {
  const d = DATA.gemShop.find(g => g.id === 'double');
  if (d) Object.assign(d, { kind: 'spawns', spawns: DATA.x.doubleSpawns, cost: DATA.x.doubleCost, name: 'Double Spawn x100', desc: 'The next 100 taps make two items for 1 energy each.' });
  const base = DATA.xpForLevel;
  DATA.xpForLevel = lvl => Math.max(DATA.x.xpEarly[lvl - 1] || 0, base(lvl)) + DATA.x.xpLate(lvl);
})();

Object.assign(I18N.en, {
  ctut0: 'Tap the {gen} to get {item}.',
  ctut1: 'Two equal items? Drag one onto the other to merge them!',
  ctut2: '{bread}! Captain Finn wants {bread}. Tap Deliver.',
  ctut3: 'You earned coins! Tap 🏝️ Island to fix up the {place}.',
  noEnergyT: 'Out of energy. Next ⚡ in {t}.',
  noCoinsN: 'You need {n} more 🪙. Deliver orders!',
  noGemsN: 'You need {n} more 💎',
  gotOrder: '+{c} 🪙  +{x} ⭐',
  amyEnergy: 'No energy. Full again at {t}.',
  amyGen: 'New: {gen}! Tap it.',
  amyFull: 'Board full! Merge, sell or store.',
  amyTutDone: 'Now you can do it alone!',
  amyBtn_daily: 'Daily tasks are open!',
  amyBtn_store: 'Storage is open!',
  amyBtn_album: 'Your album is open!',
  amyFirst_chest: 'A chest! Tap it to open.',
  amyFirst_joker: 'A joker! Drag it onto an item.',
  swap: 'New order', swapAsk: 'Tap again to swap this order for {c} 🪙',
  noPair: 'No equal items on the board',
  fh_pair: 'Show pair', fh_store: 'Storage', fh_sell: 'Sell',
  undo: 'Undo', undone: 'Undone',
  combo: 'Combo x{n}',
  newItem: 'New: {name} ({n}/{m})',
  jokerWhere: 'The joker works on normal items below max level.',
  onlyEqual: 'Only equal items merge.',
  sellSure: 'Sure? +{c}🪙',
  energyFull: 'Energy is already full',
  full: 'Full', missGems: '{n} 💎 missing', missCoins: '{n} 🪙 missing', sure: 'Sure? {c}',
  coinShopH: 'Coin shop',
  p_coinChest: 'Coin Chest', p_coinChestD: 'A treasure chest with 3 items.',
  p_coinRow: 'Extra Row', p_coinRowD: 'One more row on the board. Forever.',
  driftInfo: 'Driftwood: merge next to it to free what is inside',
  unitM: 'm', unitD: 'd',
  goal: 'Next: {task} 🪙 {c}/{n}',
  hints: 'Hints', haptic: 'Vibration', close: 'Close', amyAlt: 'Amy',
  helpBtn: 'How to play', tutAgain: 'Replay tutorial',
  help1h: 'Make', help1: 'Tap a generator. Every tap costs 1 energy.',
  help2h: 'Merge', help2: 'Drag two equal items together, or tap one and then the other.',
  help3h: 'Deliver', help3: 'Guests show what they want. Deliver to earn coins and stars.',
  help4h: 'Restore', help4: 'Spend coins on island tasks to restore every place.',
  help5h: 'Energy', help5: 'Energy refills over time and on every level up.',
  help6h: 'Storage', help6: 'Keep items in storage. Stored items count for orders.',
  inboxWait: 'Gifts wait for a free cell.', inboxN: '{n} gifts wait for a free cell on the board.',
  slotMore: 'More slots', stored: 'Stored 📦',
  passUntil: "Amy's Pass runs until {date}.",
  passProg: 'Day {d} of {n} - {g} 💎 received - until {date}.', passMore: 'Buying again: until {date}.',
  spawnsLeft: 'x2: {n} left',
  bigText: 'Large text',
  saveH: 'Save code', saveNote: 'Keep your progress, starter pack and pass when you change phones.',
  saveOut: 'Show code', saveIn: 'Enter code', saveOutNote: 'Copy this code and keep it safe, for example in a note.',
  saveInNote: 'Paste a code. It replaces the game on this device.', copy: 'Copy', copied: 'Copied', saveLoad: 'Load',
  saveBad: 'This code does not work. Is it complete?', saveSure: 'Tap Load again: level {l}, place {z} replaces this game.', saveDone: 'Progress loaded!',
  genAria: '{gen}, tap for new items', emptyCell: 'Empty cell',
  outlook: 'All this awaits us: {n} places on the island!',
  before: 'Before', after: 'After', renoH: '{task}: done!', renoText: 'The {place} looks better already!', renoGo: 'Continue',
  introAria: 'Story', intro0: 'Amy sails to Sunmelon Island.', intro1: 'The old café is empty and dusty.', intro2: 'Captain Finn waves: Welcome, Amy!', introSkip: 'Skip'
});

Object.assign(I18N.de, {
  ctut0: 'Tippe auf die {gen}, um {item} zu bekommen.',
  ctut1: 'Zwei gleiche Teile? Zieh eins auf das andere!',
  ctut2: '{bread}! Kapitän Finn möchte {bread}. Tippe auf Liefern.',
  ctut3: 'Du hast Münzen! Tippe auf 🏝️ Insel und renoviere das {place}.',
  noEnergyT: 'Keine Energie. Nächste ⚡ in {t}.',
  noCoinsN: 'Dir fehlen {n} 🪙. Liefere Bestellungen!',
  noGemsN: 'Dir fehlen {n} 💎',
  gotOrder: '+{c} 🪙  +{x} ⭐',
  amyEnergy: 'Keine Energie. Um {t} wieder voll.',
  amyGen: 'Neu: {gen}! Tipp drauf.',
  amyFull: 'Brett voll! Mischen, verkaufen, lagern.',
  amyTutDone: 'Jetzt kannst du es allein!',
  amyBtn_daily: 'Tagesaufgaben sind offen!',
  amyBtn_store: 'Das Lager ist offen!',
  amyBtn_album: 'Dein Album ist offen!',
  amyFirst_chest: 'Eine Truhe! Tippe zum Öffnen.',
  amyFirst_joker: 'Ein Joker! Zieh ihn auf ein Teil.',
  swap: 'Neue Bestellung', swapAsk: 'Nochmal tippen: Bestellung für {c} 🪙 tauschen',
  noPair: 'Keine gleichen Teile auf dem Brett',
  fh_pair: 'Paar zeigen', fh_store: 'Lager', fh_sell: 'Verkaufen',
  undo: 'Zurück', undone: 'Rückgängig gemacht',
  combo: 'Serie x{n}',
  newItem: 'Neu: {name} ({n}/{m})',
  jokerWhere: 'Der Joker wirkt auf normale Teile unter der Höchststufe.',
  onlyEqual: 'Nur gleiche Teile verschmelzen.',
  sellSure: 'Sicher? +{c}🪙',
  energyFull: 'Die Energie ist schon voll',
  full: 'Voll', missGems: 'Es fehlen {n} 💎', missCoins: 'Es fehlen {n} 🪙', sure: 'Sicher? {c}',
  coinShopH: 'Münzladen',
  p_coinChest: 'Münztruhe', p_coinChestD: 'Eine Schatztruhe mit 3 Teilen.',
  p_coinRow: 'Extra-Reihe', p_coinRowD: 'Eine Reihe mehr auf dem Brett. Für immer.',
  driftInfo: 'Treibgut: Verschmelze daneben, um den Inhalt zu befreien',
  unitM: ' Min.', unitD: ' T.',
  goal: 'Nächste Aufgabe: {task} 🪙 {c}/{n}',
  hints: 'Hinweise', haptic: 'Vibration', close: 'Schließen', amyAlt: 'Amy',
  helpBtn: "So geht's", tutAgain: 'Tutorial nochmal',
  help1h: 'Erzeugen', help1: 'Tippe auf einen Erzeuger. Jedes Tippen kostet 1 Energie.',
  help2h: 'Verschmelzen', help2: 'Zieh zwei gleiche Teile zusammen oder tippe nacheinander auf beide.',
  help3h: 'Liefern', help3: 'Gäste zeigen, was sie möchten. Liefern bringt Münzen und Sterne.',
  help4h: 'Renovieren', help4: 'Gib Münzen für Inselaufgaben aus und renoviere jeden Ort.',
  help5h: 'Energie', help5: 'Energie lädt mit der Zeit und bei jedem Stufenaufstieg auf.',
  help6h: 'Lager', help6: 'Bewahre Teile im Lager auf. Gelagerte Teile zählen für Bestellungen.',
  inboxWait: 'Geschenke warten auf ein freies Feld.', inboxN: '{n} Geschenke warten auf ein freies Feld.',
  slotMore: 'Mehr Plätze', stored: 'Eingelagert 📦',
  passUntil: 'Amys Pass läuft bis {date}.',
  passProg: 'Tag {d} von {n} - {g} 💎 erhalten - bis {date}.', passMore: 'Nachkauf: bis {date}.',
  spawnsLeft: 'x2: noch {n}',
  bigText: 'Große Schrift',
  saveH: 'Spielstand-Code', saveNote: 'Behalte Fortschritt, Starterpaket und Pass beim Handywechsel.',
  saveOut: 'Code anzeigen', saveIn: 'Code eingeben', saveOutNote: 'Kopiere den Code und bewahre ihn gut auf, zum Beispiel in einer Notiz.',
  saveInNote: 'Füge einen Code ein. Er ersetzt das Spiel auf diesem Gerät.', copy: 'Kopieren', copied: 'Kopiert', saveLoad: 'Laden',
  saveBad: 'Dieser Code passt nicht. Ist er vollständig?', saveSure: 'Nochmal auf Laden tippen: Level {l}, Ort {z} ersetzt dieses Spiel.', saveDone: 'Spielstand geladen!',
  genAria: '{gen}, tippen für neue Teile', emptyCell: 'Leeres Feld',
  outlook: 'Das alles wartet auf uns: {n} Orte auf der Insel!',
  before: 'Vorher', after: 'Nachher', renoH: '{task}: geschafft!', renoText: 'Das {place} sieht schon viel besser aus!', renoGo: 'Weiter',
  introAria: 'Geschichte', intro0: 'Amy segelt zur Sonnenmelonen-Insel.', intro1: 'Das alte Café ist leer und staubig.', intro2: 'Kapitän Finn winkt: Willkommen, Amy!', introSkip: 'Überspringen'
});

Object.assign(I18N.de.products, {
  coinSack: { name: 'Münzsack', desc: '1.200 Münzen für Inselaufgaben.' },
  bigBoard2: { name: 'Größeres Brett II', desc: 'Noch eine Reihe auf dem Brett. Für immer.' },
  double: { name: 'Doppelt x100', desc: 'Die nächsten 100 Tipps machen je zwei Teile für 1 Energie.' }
});
