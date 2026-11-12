'use strict';
// Live features, plan section E (E3-E50 without E1/E2): daily task drawing, calendar cycles,
// streaks, pass claim, return gift, events, seasons, cosmetics, local records.
// Loaded after game.js. Hooks into the game only by wrapping game.js globals.
(function () {
  // ---------- data (tuning values; coin factors are placeholders until economy-designer signs off) ----------
  const FEST = {
    type: 'collect', icon: '🍲', cap: 60, markBase: 4, markCoin: 2, stageMarks: 20,
    tiers: [15, 35, 60, 90, 120, 150, 180, 210, 235, 260],
    rewards: [{ coins: 50 }, { energy: 30 }, { gems: 5 }, { chest: 1 }, { coins: 120 }, { joker: 1 }, { gems: 10 }, { chest: 2 }, { energy: 60 }, { gems: 30, chest: 1 }],
    stages: [{ coins: 30 }, { gems: 2 }, { energy: 20 }, { chest: 1 }, { gems: 4 }, { joker: 1 }, { gems: 8, chest: 1 }],
    comp: { chest: 1 }
  };
  const XL = {
    zoneScale: [1, 2, 3, 5, 7, 9, 12],
    nScale: lvl => (lvl <= 3 ? 0.5 : lvl < 10 ? 1 : 1.5),
    dayEarn: lvl => 150 + 60 * lvl,
    pool: [
      { k: 'make5', n: 1, reward: { gems: 6 }, minLevel: 4, fixed: true },
      { k: 'chest', n: 1, reward: { coins: 50 }, minLevel: 5, fixed: true },
      { k: 'resOrder', n: 2, reward: { gems: 6 }, minZone: 1 },
      { k: 'chain', n: 3, reward: { coins: 70 } }
    ],
    allBonusExtra: { chest: 1 },
    calCycle2: [{ gems: 5 }, { coins: 150 }, { chest: 1 }, { energy: 80 }, { gems: 12 }, { joker: 1 }, { gems: 30, chest: 2 }],
    passBackDays: 30,
    shieldEvery: 7, maxShields: 2,
    milestones: [{ n: 3, r: { chest: 1 } }, { n: 7, r: { joker: 1 } }, { n: 14, r: { chest: 2 } }, { n: 30, r: { gems: 50, chest: 1 } }, { n: 100, r: { gems: 100, cos: 'gold' } }],
    returnDays: 3, returnEveryDays: 14,
    weekend: ['chest', 'lucky', 'album'], luckyMin: 30, albumBonus: 0.5,
    resParts: [1, 3, 6],
    clockBackMs: 36e5, clockFwdMs: 2 * 864e5,
    minLevel: 3, minTut: 5,
    // Local start/end dates (end exclusive). New events only through this list.
    events: [
      { ...FEST, id: 'kochfest-2026-11', start: '2026-11-10', end: '2026-11-17', disabled: false },
      { ...FEST, id: 'winterfest-2026-12', icon: '🍪', start: '2026-12-18', end: '2026-12-25', disabled: false },
      { ...FEST, id: 'osterfest-2027-03', icon: '🥚', start: '2027-03-22', end: '2027-03-29', disabled: false }
    ],
    seasons: [
      { id: 's1', icon: '🌸', res: 1, start: '2026-11-02', cos: 'cherry' },
      { id: 's2', icon: '⚓', res: 2, start: '2026-12-14', cos: 'harbor' }
    ],
    seasonDays: 42, starDeliver: 3, starTask: 10, starCap: 40, catchUpDays: 14, catchUpBelow: 15,
    seasonTiers: [10, 25, 40, 55, 70].concat([...Array(20).keys()].map(k => 70 + 39 * (k + 1)), [900, 960, 1020, 1080, 1140]),
    freeR: (n, s) => (n === 30 ? { cos: s.cos } : n % 5 === 0 ? { chest: 1 } : [{ gems: 5 }, { energy: 30 }, { gems: 3 }, { joker: 1 }][n % 5 - 1]),
    premR: n => (n === 30 ? { gems: 120, chest: 2 } : n % 5 === 0 ? { gems: 20, chest: 1 } : { gems: 8 }),
    premium: { id: 'season_premium', price: '4,99 €' },
    cosmetics: ['none', 'cherry', 'harbor', 'gold'],
    logMax: 300,
    nickBlock: ['fuck', 'shit', 'nazi', 'hitler', 'arsch', 'fick', 'hure', 'nigg', 'porn', 'cunt', 'bitch', 'fotze', 'wichs', 'sex'],
    nickWords: ['Mango', 'Kiwi', 'Waffel', 'Muffin', 'Pfirsich', 'Kokos', 'Zimt', 'Brezel', 'Melone', 'Toffee']
  };

  Object.assign(I18N.en, {
    d_make5: 'Make a level 5 item', d_chest: 'Open {n} chest', d_resOrder: 'Deliver {n} resident orders', d_chain: 'Deliver {n} {c} items',
    xl_allBonus: 'All 3 done', xl_dailyWaits: 'Your daily gift is waiting!', xl_back: 'So nice to have you back!',
    xl_streak: 'Streak {n} days (best {b})', xl_shields: '{n} free streak guard', xl_shieldUsed: 'Streak guard saved your streak',
    xl_ms: 'Streak rewards', xl_msGot: 'Streak {n}: reward received!',
    xl_pass: "Amy's Pass: {g} 💎", xl_passClaim: 'Collect',
    xl_wk_chest: 'Weekend: double chests from daily tasks', xl_wk_lucky: 'Weekend: {m} min Lucky Stars for free', xl_wk_album: 'Weekend: +50% album gems', xl_wkTake: 'Take',
    xl_rw: '{name} week: double coins for {name}', xl_rwPart: 'Part {i}', xl_rwLock: 'Part {i}: {n} more deliveries', xl_rwBonus: '{name} week: +{c} 🪙', xl_rwNew: 'New story part!',
    xl_full: 'Energy full at {time}', xl_fullNow: 'Energy is full',
    xl_cycle: '(round {n})', xl_tomorrow: 'Tomorrow: {r}',
    xl_left: '{d}d {h}h left', xl_leftH: '{h}h left', xl_tier: 'Tier {n}',
    xl_ev_name: 'Island Cook Fest', xl_ev_desc: 'Every delivery gives fest tokens (max {cap} a day). Leftover tokens turn into coins at the end.',
    xl_marks: '{n} tokens', xl_today: 'Today {n}/{cap}', xl_stages: 'Daily stages', xl_tiers: 'Rewards',
    xl_evEnd: 'Fest over: +{c} 🪙 for leftover tokens', xl_evOff: 'Event stopped: +{c} 🪙 and a thank-you chest',
    xl_s1: 'Cherry Blossom Season', xl_s2: 'Harbor Fest Season',
    xl_sDesc: 'Collect season stars from orders and daily tasks (max {cap} a day).', xl_sCatch: 'Catch-up: double stars until tier 15',
    xl_stars: '{n} 🌟', xl_sToday: 'Today {n}/{cap} 🌟', xl_sTier: 'Season tier {n}!', xl_sNone: 'The next season starts soon.',
    xl_sSum: 'Season over: tier {tier}, {stars} 🌟, best week {best} 🌟. Rewards were added.', xl_sEnd: 'Season over! Rewards added.',
    xl_premName: 'Season Premium', xl_premDesc: 'Second reward track for this season. Unlocks all tiers you already reached.', xl_premH: 'Season',
    xl_free: 'Free', xl_prem: 'Premium',
    xl_frozen: 'Device clock looks wrong. Progress pauses until it is correct.',
    xl_rec: 'Records', xl_recH: 'My records', xl_nick: 'Nickname', xl_nickSave: 'Save', xl_nickBad: 'Please choose another name (3-16 letters)', xl_nickOk: 'Name saved',
    xl_bestDay: 'Deliveries in one day', xl_bestStreak: 'Best streak', xl_bestItem: 'Highest item', xl_places: 'Places restored', xl_merges: 'Merges', xl_orders: 'Orders',
    xl_topDays: 'My best days', xl_noDays: 'No days yet', xl_online: 'Online leaderboard comes with the game server.',
    xl_bg: 'Board look', xl_bg_none: 'Classic', xl_bg_cherry: 'Cherry', xl_bg_harbor: 'Harbor', xl_bg_gold: 'Gold', xl_bgLocked: '{n} more looks from seasons and streaks',
    xl_rs: [
      ['Finn found his old captain\'s log in the café.', 'Inside: a recipe from his very first voyage.', 'He cooked it for everyone. Best fish soup on the island!'],
      ['Hana is planting new tea bushes.', 'A rare blossom tea is growing.', 'She shares the very first cup with you.'],
      ['Rosie wants a new burger recipe.', 'The guests vote for pineapple!', 'The Rosie Special is on the menu now.'],
      ['Luca\'s nonna sends a letter.', 'She is coming to visit the island!', 'Nonna loves the pizza. Bellissimo!'],
      ['Kai found a message in a bottle.', 'It is a map to a hidden cove.', 'A picnic at the cove at sunset!'],
      ['Grandma Rosa opens her old recipe box.', 'One card is missing...', 'Amy found it under the counter. The apple pie is back!']
    ]
  });
  Object.assign(I18N.de, {
    d_make5: 'Ein Teil der Stufe 5 herstellen', d_chest: '{n} Truhe öffnen', d_resOrder: '{n} Bewohner-Bestellungen liefern', d_chain: '{n} Teile aus {c} liefern',
    xl_allBonus: 'Alle 3 fertig', xl_dailyWaits: 'Dein Tagesgeschenk wartet!', xl_back: 'Schön, dass du wieder da bist!',
    xl_streak: 'Serie {n} Tage (beste {b})', xl_shields: '{n} Gratis-Serienschutz', xl_shieldUsed: 'Der Serienschutz hat deine Serie gerettet',
    xl_ms: 'Serien-Belohnungen', xl_msGot: 'Serie {n}: Belohnung erhalten!',
    xl_pass: "Amy's Pass: {g} 💎", xl_passClaim: 'Abholen',
    xl_wk_chest: 'Wochenende: doppelte Truhen aus Tagesaufgaben', xl_wk_lucky: 'Wochenende: {m} Min. Glückssterne gratis', xl_wk_album: 'Wochenende: +50 % Album-Edelsteine', xl_wkTake: 'Nehmen',
    xl_rw: '{name}-Woche: doppelte Münzen für {name}', xl_rwPart: 'Teil {i}', xl_rwLock: 'Teil {i}: noch {n} Lieferungen', xl_rwBonus: '{name}-Woche: +{c} 🪙', xl_rwNew: 'Neuer Geschichtsteil!',
    xl_full: 'Energie voll um {time}', xl_fullNow: 'Energie ist voll',
    xl_cycle: '(Runde {n})', xl_tomorrow: 'Morgen: {r}',
    xl_left: 'noch {d} T {h} Std', xl_leftH: 'noch {h} Std', xl_tier: 'Stufe {n}',
    xl_ev_name: 'Inselkochfest', xl_ev_desc: 'Jede Lieferung gibt Festmarken (max. {cap} pro Tag). Restmarken werden am Ende zu Münzen.',
    xl_marks: '{n} Marken', xl_today: 'Heute {n}/{cap}', xl_stages: 'Tagesetappen', xl_tiers: 'Belohnungen',
    xl_evEnd: 'Fest vorbei: +{c} 🪙 für Restmarken', xl_evOff: 'Event beendet: +{c} 🪙 und eine Dankeschön-Truhe',
    xl_s1: 'Kirschblüten-Saison', xl_s2: 'Hafenfest-Saison',
    xl_sDesc: 'Sammle Saisonsterne mit Bestellungen und Tagesaufgaben (max. {cap} pro Tag).', xl_sCatch: 'Aufholhilfe: doppelte Sterne bis Stufe 15',
    xl_stars: '{n} 🌟', xl_sToday: 'Heute {n}/{cap} 🌟', xl_sTier: 'Saisonstufe {n}!', xl_sNone: 'Die nächste Saison beginnt bald.',
    xl_sSum: 'Saison vorbei: Stufe {tier}, {stars} 🌟, beste Woche {best} 🌟. Belohnungen gutgeschrieben.', xl_sEnd: 'Saison vorbei! Belohnungen gutgeschrieben.',
    xl_premName: 'Saison-Premium', xl_premDesc: 'Zweite Belohnungsspur für diese Saison. Schaltet alle schon erreichten Stufen frei.', xl_premH: 'Saison',
    xl_free: 'Gratis', xl_prem: 'Premium',
    xl_frozen: 'Die Geräteuhr scheint falsch. Fortschritt pausiert, bis sie stimmt.',
    xl_rec: 'Rekorde', xl_recH: 'Meine Rekorde', xl_nick: 'Spitzname', xl_nickSave: 'Speichern', xl_nickBad: 'Bitte einen anderen Namen wählen (3-16 Zeichen)', xl_nickOk: 'Name gespeichert',
    xl_bestDay: 'Lieferungen an einem Tag', xl_bestStreak: 'Beste Serie', xl_bestItem: 'Höchstes Teil', xl_places: 'Orte fertig', xl_merges: 'Zusammengezogen', xl_orders: 'Bestellungen',
    xl_topDays: 'Meine besten Tage', xl_noDays: 'Noch keine Tage', xl_online: 'Die Online-Bestenliste kommt mit dem Spielserver.',
    xl_bg: 'Brett-Aussehen', xl_bg_none: 'Klassisch', xl_bg_cherry: 'Kirschblüte', xl_bg_harbor: 'Hafen', xl_bg_gold: 'Gold', xl_bgLocked: 'Noch {n} Looks aus Saisons und Serien',
    xl_rs: [
      ['Finn hat sein altes Kapitänsbuch im Café gefunden.', 'Darin: ein Rezept von seiner ersten Seereise.', 'Er kocht es für alle. Beste Fischsuppe der Insel!'],
      ['Hana pflanzt neue Teesträucher.', 'Ein seltener Blütentee wächst heran.', 'Die allererste Tasse teilt sie mit dir.'],
      ['Rosie will ein neues Burger-Rezept.', 'Die Gäste stimmen für Ananas!', 'Das Rosie-Spezial steht jetzt auf der Karte.'],
      ['Lucas Nonna schickt einen Brief.', 'Sie kommt die Insel besuchen!', 'Nonna liebt die Pizza. Bellissimo!'],
      ['Kai hat eine Flaschenpost gefunden.', 'Es ist eine Karte zu einer versteckten Bucht.', 'Ein Picknick in der Bucht bei Sonnenuntergang!'],
      ['Oma Rosa öffnet ihre alte Rezeptkiste.', 'Eine Karte fehlt...', 'Amy hat sie unter der Theke gefunden. Der Apfelkuchen ist zurück!']
    ]
  });

  // ---------- time helpers ----------
  // E24: ?now=YYYY-MM-DD shifts live-ops time (events, seasons, weekend, resident week), test builds only.
  let OFFSET = 0;
  const testBuild = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const qNow = new URLSearchParams(location.search).get('now');
  const parseLocal = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
  if (testBuild && qNow && /^\d{4}-\d{2}-\d{2}$/.test(qNow)) {
    const n = new Date();
    OFFSET = parseLocal(qNow) + (n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds()) * 1000 - n.getTime();
  }
  const xlNow = () => Date.now() + OFFSET;
  const dn = s => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
  const ds = n => new Date(n * 864e5).toISOString().slice(0, 10);
  const localDn = ts => { const d = new Date(ts); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };
  const localDay = () => ds(localDn(xlNow()));
  const weekIdx = () => Math.floor((localDn(xlNow()) + 3) / 7);
  const clone = o => JSON.parse(JSON.stringify(o === undefined ? null : o));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- state ----------
  let X = null;
  let allowDaily = false;
  let lastTick = Date.now();

  function ensure() {
    S.xl = S.xl || {};
    X = S.xl;
    const d = { day: '', snap: null, streak: { cur: 0, best: 0, last: '', shields: 0, ms: [] }, passPending: 0, returnTs: 0, maxTs: 0, frozenDay: '',
      nudged: '', ev: {}, season: null, seasonSum: null, rw: { w: -1, n: 0 }, wkLucky: -1, rec: { dd: { day: '', n: 0 }, best: 0, top: [] }, nick: '', log: [] };
    for (const k in d) if (X[k] === undefined) X[k] = d[k];
    S.cosmetics = S.cosmetics || { own: ['none'], sel: 'none' };
    S.seasonLog = S.seasonLog || {};
    if (!X.nick) X.nick = `${P.lang === 'de' ? 'Koch' : 'Chef'} ${XL.nickWords[rnd(0, XL.nickWords.length - 1)]} ${rnd(10, 99)}`;
  }

  // E50: local event buffer, sent once a game server exists.
  function log(e, v) { X.log.push(v === undefined ? [e, Date.now()] : [e, Date.now(), v]); if (X.log.length > XL.logMax) X.log.splice(0, X.log.length - XL.logMax); }

  // ---------- E25 clock check ----------
  const frozen = () => Date.now() < X.maxTs - XL.clockBackMs || X.frozenDay === today();
  function clockCheck() {
    const n = Date.now();
    if (n < X.maxTs - XL.clockBackMs) { if (!X.frozenNote) { X.frozenNote = 1; toast(t('xl_frozen')); } lastTick = n; return; }
    if (n - lastTick > XL.clockFwdMs) { X.frozenDay = today(); toast(t('xl_frozen')); log('clockJump'); }
    lastTick = n; X.frozenNote = 0;
    X.maxTs = Math.max(X.maxTs, n);
  }

  // ---------- rewards ----------
  const zs = () => XL.zoneScale[Math.min(S.zone, XL.zoneScale.length - 1)];
  const scaleR = r => (r.coins ? { ...r, coins: Math.round(r.coins * zs()) } : r);
  function rtxt(r) {
    return [r.gems && `${r.gems} 💎`, r.coins && `${r.coins} 🪙`, r.energy && `${r.energy} ⚡`, r.chest && (r.chest > 1 ? `${r.chest}x 🎁` : '🎁'), r.joker && '🃏',
      r.lucky && `${r.lucky} min ⭐`, r.cos && `🎨 ${t('xl_bg_' + r.cos)}`].filter(Boolean).join(' ');
  }
  function grantR(r) {
    const n = r.chest || 0;
    grant({ gems: r.gems, coins: r.coins, energy: r.energy, joker: r.joker, chest: n ? 1 : 0 });
    for (let k = 1; k < n; k++) grant({ chest: 1 });
    if (r.cos && !S.cosmetics.own.includes(r.cos)) S.cosmetics.own.push(r.cos);
    if (r.lucky) S.boosts.lucky = Math.max(now(), S.boosts.lucky || 0) + r.lucky * 60000;
  }

  // ---------- daily tasks E3-E7 ----------
  function drawTasks() {
    const lvl = S.level, z = DATA.zones[S.zone];
    const open = z ? z.tasks.filter((tk, k) => !S.tasksDone.includes(k)).map(tk => tk.cost) : [];
    const taskOk = open.length > 0 && Math.min(...open) <= S.coins + XL.dayEarn(lvl);
    const cand = DATA.dailyPool.concat(XL.pool).filter(p => (p.k !== 'task' || taskOk) && lvl >= (p.minLevel || 0) && S.zone >= (p.minZone || 0));
    for (let i = cand.length - 1; i > 0; i--) { const j = rnd(0, i); [cand[i], cand[j]] = [cand[j], cand[i]]; }
    const used = new Set(), out = [];
    const onBoard = Object.keys(DATA.chains).filter(c => S.board.some(b => b && b.gen === c));
    const chains = onBoard.length ? onBoard : unlockedChains();
    for (const p of cand) {
      if (used.has(p.k) || out.length >= 3) continue;
      used.add(p.k);
      const n = p.fixed || p.k === 'task' ? p.n : Math.max(1, Math.round(p.n * XL.nScale(lvl)));
      const q = { k: p.k, n, reward: scaleR(p.reward), p: 0, got: false };
      if (p.k === 'chain') q.c = chains[rnd(0, chains.length - 1)];
      out.push(q);
    }
    return out;
  }
  function maybeRedraw() {
    const d = S.day;
    if (!d || d.xl === S.lastDaily) return;
    if (!d.bonus && d.tasks.every(q => q.p === 0 && !q.got)) d.tasks = drawTasks();
    d.xl = S.lastDaily;
  }
  const taskLabel = q => t('d_' + q.k, { n: q.n, c: q.c ? chainNm(q.c) : '' });

  // ---------- day rollover: E10 E11 E13 E14 E16 E17 E19 ----------
  function takeSnap() {
    if (!X || S.lastDaily !== X.day) return;
    X.snap = { lastDaily: S.lastDaily, day: clone(S.day), cal: clone(S.cal), gems: S.gems };
  }
  function rollover(g0) {
    const prev = X.day, sn = X.snap;
    X.day = S.lastDaily;
    const gap = prev && sn ? dn(S.lastDaily) - dn(prev) : 0;
    if (gap > 0) {
      if (sn.cal && sn.cal.i >= 0 && !sn.cal.got) { S.cal.i = sn.cal.i; S.cal.got = false; }
      else if (sn.cal && sn.cal.got && sn.cal.i === 6) S.cal.cycle = (sn.cal.cycle || 0) + 1;
      const pg = DATA.pass.dailyGems;
      if (S.gems - g0 === pg) S.gems -= pg;
      let owed = 0;
      for (let k = 1; k <= Math.min(gap, XL.passBackDays); k++) if (S.passUntil > (dn(prev) + k) * 864e5) owed++;
      X.passPending += owed * pg;
      const st = X.streak;
      if (st.last) {
        const miss = dn(S.lastDaily) - dn(st.last) - 1;
        if (miss > 0 && miss <= st.shields) { st.shields -= miss; st.last = ds(dn(S.lastDaily) - 1); setTimeout(() => toast(t('xl_shieldUsed')), 1500); }
        else if (miss > 0) st.cur = 0;
      }
      let back = false;
      if (gap >= XL.returnDays && Date.now() - X.returnTs >= XL.returnEveryDays * 864e5) {
        X.returnTs = Date.now(); back = true;
        S.energy = Math.max(S.energy, energyMax()); grantR({ chest: 1 }); log('return', gap);
        setTimeout(() => amySay('xl_back'), 1200);
      }
      if (!back && !S.cal.got) setTimeout(nudge, 1200);
      log('day', gap);
    }
    maybeRedraw();
    takeSnap();
  }
  function nudge() {
    if (X.nudged === S.lastDaily) return;
    X.nudged = S.lastDaily; amySay('xl_dailyWaits');
  }

  // ---------- streak E16-E18 ----------
  function markStreak() {
    const st = X.streak, d = today();
    if (st.last === d || frozen() || !S.day || !S.day.tasks.some(q => q.p >= q.n)) return;
    st.cur = st.last && dn(d) - dn(st.last) === 1 ? st.cur + 1 : 1;
    st.last = d; st.best = Math.max(st.best, st.cur);
    if (st.cur % XL.shieldEvery === 0) st.shields = Math.min(XL.maxShields, st.shields + 1);
    for (const m of XL.milestones) {
      if (st.cur >= m.n && !st.ms.includes(m.n)) { st.ms.push(m.n); grantR(m.r); toast(t('xl_msGot', { n: m.n })); log('streakMs', m.n); }
    }
    log('streak', st.cur);
    save();
  }

  // ---------- weekend E29, resident week E30, energy time E22 ----------
  function weekendMode() { const d = new Date(xlNow()).getDay(); return d === 5 || d === 6 || d === 0 ? XL.weekend[weekIdx() % XL.weekend.length] : null; }
  function focusRes() { if (S.zone < 1) return -1; const w = weekIdx(), r = w % 6; return r < S.zone ? r : w % S.zone; }
  function rwState() { if (X.rw.w !== weekIdx()) X.rw = { w: weekIdx(), n: 0 }; return X.rw; }
  function energyFull() {
    if (S.energy >= energyMax()) return t('xl_fullNow');
    const at = S.energyTs + (energyMax() - S.energy) * regenMs();
    return t('xl_full', { time: new Date(at).toLocaleTimeString(P.lang, { hour: '2-digit', minute: '2-digit' }) });
  }

  // ---------- calendar E10-E12 ----------
  const calSet = cyc => (cyc > 0 ? XL.calCycle2 : DATA.calendar);
  const calReward = (i, cyc) => scaleR(calSet(cyc)[i]);

  // ---------- daily modal ----------
  function dailyHtml() {
    const d = S.day, st = X.streak, cyc = S.cal.cycle || 0;
    const okN = d.tasks.filter(q => q.p >= q.n).length, N = d.tasks.length, wk = weekendMode();
    const tasks = d.tasks.map((q, k) => {
      const ok = q.p >= q.n;
      const dbl = wk === 'chest' && q.reward.chest ? ' x2' : '';
      return `<div class="prod ${q.got ? 'done' : ''}"><div><b>${taskLabel(q)}</b><div class="pbar"><i style="width:${100 * Math.min(1, q.p / q.n)}%"></i></div><small>${Math.min(q.p, q.n)}/${q.n} · ${rtxt(q.reward)}${dbl}</small></div>
        <button data-dt="${k}" ${!ok || q.got ? 'disabled' : ''}>${q.got ? t('claimed') : t('claim')}</button></div>`;
    }).join('');
    const all = d.tasks.every(q => q.got);
    const bonus = `<div class="prod ${d.bonus ? 'done' : ''}"><div><b>${t('xl_allBonus')}</b><small>${rtxt(DATA.dailyAllBonus)} ${rtxt(XL.allBonusExtra)}</small></div>
      <button data-dt="all" ${!all || d.bonus ? 'disabled' : ''}>${d.bonus ? t('claimed') : t('claim')}</button></div>`;
    const pass = X.passPending > 0 ? `<div class="prod xl-hi"><span class="pi">🎫</span><div><b>${t('xl_pass', { g: X.passPending })}</b></div><button data-xl="pass">${t('xl_passClaim')}</button></div>` : '';
    const streak = `<div class="xl-streak"><span>🔥 ${t('xl_streak', { n: st.cur, b: st.best })}</span>${st.shields ? `<small>🛡️ ${t('xl_shields', { n: st.shields })}</small>` : ''}</div>
      <div class="xl-ms">${XL.milestones.map(m => `<span class="${st.ms.includes(m.n) ? 'got' : ''}"><b>${m.n}</b>${rtxt(m.r)}</span>`).join('')}</div>`;
    const extra = [];
    if (wk) extra.push(`<div class="xl-line">🎉 ${t('xl_wk_' + wk, { m: XL.luckyMin })}${wk === 'lucky' && X.wkLucky !== weekIdx() ? ` <button data-xl="lucky">${t('xl_wkTake')}</button>` : ''}</div>`);
    const fr = focusRes();
    if (fr >= 0) {
      const r = resOf(fr), rw = rwState(), parts = (DE() ? I18N.de : I18N.en).xl_rs[fr];
      const ps = XL.resParts.map((need, i) => (rw.n >= need ? `<p>${t('xl_rwPart', { i: i + 1 })}: ${parts[i]}</p>` : `<p class="lock">${t('xl_rwLock', { i: i + 1, n: need - rw.n })}</p>`)).join('');
      extra.push(`<div class="say xl-rw"><span class="face">${whoHtml('res_' + fr)}</span><div><b>${t('xl_rw', { name: r.name })}</b>${ps}</div></div>`);
    }
    extra.push(`<div class="xl-line">⚡ ${energyFull()}</div>`);
    const cal = calSet(cyc).map((r0, k) => {
      const r = scaleR(r0);
      const s = k < S.cal.i || (k === S.cal.i && S.cal.got) ? 'got' : k === S.cal.i ? 'now' : '';
      return `<div class="day ${s}"><small>${t('dayN', { n: k + 1 })}</small><div>${rtxt(r)}</div>${s === 'now' ? `<button data-cal="1">${t('claim')}</button>` : s === 'got' ? '✅' : ''}</div>`;
    }).join('');
    const ni = (S.cal.i + 1) % 7, tom = calReward(ni, S.cal.i === 6 ? cyc + 1 : cyc);
    return `<h2 class="amyh" data-xl-daily="1"><img class="amy" src="img/amy_face.png" alt="">${t('dailyH')}</h2>${streak}
      <div class="xl-bar3"><div class="pbar"><i style="width:${100 * okN / N}%"></i></div><b>${okN}/${N}</b></div>${pass}${tasks}${bonus}${extra.join('')}
      <h3>${t('calH')} ${cyc > 0 ? t('xl_cycle', { n: cyc + 1 }) : ''}</h3><div class="cal">${cal}</div><p class="xl-tom">${t('xl_tomorrow', { r: rtxt(tom) })}</p>`;
  }

  // ---------- events E23 E26 E28 E32-E34 ----------
  const eventsOpen = () => S.level >= XL.minLevel && S.tut >= XL.minTut;
  function activeEvent() { if (!eventsOpen()) return null; const n = xlNow(); return XL.events.find(e => !e.disabled && n >= parseLocal(e.start) && n < parseLocal(e.end)) || null; }
  function evState(e) { X.ev[e.id] = X.ev[e.id] || { marks: 0, d: { day: '', n: 0 }, tiers: [], stages: [], settled: false }; return X.ev[e.id]; }
  const evDay = e => Math.floor((xlNow() - parseLocal(e.start)) / 864e5) + 1;
  function leftTxt(ms) { const d = Math.floor(ms / 864e5), h = Math.max(1, Math.floor(ms % 864e5 / 36e5)); return d > 0 ? t('xl_left', { d, h }) : t('xl_leftH', { h }); }
  function addMarks(o) {
    const e = activeEvent(); if (!e || frozen()) return;
    const es = evState(e), day = localDay();
    if (es.d.day !== day) es.d = { day, n: 0 };
    const m = Math.min(e.markBase + o.need.reduce((a, x) => a + x.l, 0), e.cap - es.d.n);
    if (m <= 0) return;
    es.d.n += m; es.marks += m; log('marks', m);
  }
  function settleEvents() {
    for (const id in X.ev) {
      const es = X.ev[id], e = XL.events.find(x => x.id === id);
      if (es.settled) continue;
      if (e && !e.disabled && xlNow() < parseLocal(e.end)) continue;
      es.settled = true;
      const ev = e || FEST;
      ev.tiers.forEach((need, k) => { if (es.marks >= need && !es.tiers.includes(k)) { es.tiers.push(k); grantR(scaleR(ev.rewards[k])); } });
      const off = !e || e.disabled;
      const rest = off ? es.marks : Math.max(0, es.marks - ev.tiers[ev.tiers.length - 1]);
      const c = rest * ev.markCoin;
      S.coins += c;
      if (off) grantR(ev.comp);
      toast(t(off ? 'xl_evOff' : 'xl_evEnd', { c }));
      log('eventEnd', id);
    }
  }
  function eventHtml(e) {
    const es = evState(e), day = evDay(e), last = e.tiers[e.tiers.length - 1];
    const today_ = es.d.day === localDay() ? es.d.n : 0;
    const stages = e.stages.map((r, k) => {
      const d = k + 1, got = es.stages.includes(d), can = day >= d && es.marks >= d * e.stageMarks;
      return `<div class="day ${got ? 'got' : can ? 'now' : ''}"><small>${t('dayN', { n: d })}</small><div>${rtxt(scaleR(r))}</div>${got ? '✅' : can ? `<button data-xl-stage="${d}">${t('claim')}</button>` : `<small>${d * e.stageMarks}</small>`}</div>`;
    }).join('');
    const tiers = e.tiers.map((need, k) => {
      const got = es.tiers.includes(k), can = es.marks >= need;
      return `<div class="prod xl-tier ${got ? 'done' : ''}"><span class="xl-tn">${k + 1}</span><div><b>${rtxt(scaleR(e.rewards[k]))}</b><small>${need} ${e.icon}</small></div>
        <button data-xl-etier="${k}" ${!can || got ? 'disabled' : ''}>${got ? '✅' : t('claim')}</button></div>`;
    }).join('');
    return `<h2>${e.icon} ${t('xl_ev_name')}</h2><p class="note">${t('xl_ev_desc', { cap: e.cap })} · ${leftTxt(parseLocal(e.end) - xlNow())}</p>
      <div class="xl-bar3"><div class="pbar"><i style="width:${100 * Math.min(1, es.marks / last)}%"></i></div><b>${t('xl_marks', { n: es.marks })}</b></div>
      <p class="xl-tom">${t('xl_today', { n: today_, cap: e.cap })}</p>
      <h3>${t('xl_stages')}</h3><div class="cal xl-st">${stages}</div><h3>${t('xl_tiers')}</h3>${tiers}`;
  }
  function openEvent() { const e = activeEvent(); if (e) openModal(eventHtml(e)); }

  // ---------- seasons E36-E43 ----------
  function activeSeason() { const n = xlNow(); return XL.seasons.find(s => n >= parseLocal(s.start) && n < parseLocal(s.start) + XL.seasonDays * 864e5) || null; }
  const seasonEnd = s => parseLocal(s.start) + XL.seasonDays * 864e5;
  const tierOf = stars => XL.seasonTiers.filter(x => stars >= x).length;
  function seasonState(s) {
    if (X.season && X.season.id !== s.id) settleSeason();
    if (!X.season) X.season = { id: s.id, stars: 0, d: { day: '', n: 0 }, got: [], pgot: [], prem: false };
    return X.season;
  }
  function settleSeason() {
    const st = X.season, s = XL.seasons.find(x => x.id === st.id) || XL.seasons[0];
    const tier = tierOf(st.stars);
    for (let n = 1; n <= tier; n++) {
      if (!st.got.includes(n)) { st.got.push(n); grantR(scaleR(XL.freeR(n, s))); }
      if (st.prem && !st.pgot.includes(n)) { st.pgot.push(n); grantR(scaleR(XL.premR(n))); }
    }
    const L = S.seasonLog[st.id] || { weeks: [] };
    X.seasonSum = { id: st.id, tier, stars: st.stars, best: Math.max(0, ...L.weeks.filter(Boolean).map(w => w.stars)), seen: false };
    log('seasonEnd', tier);
    X.season = null;
    toast(t('xl_sEnd'));
  }
  function addStars(n) {
    const s = activeSeason(); if (!s || frozen() || !eventsOpen()) return;
    const st = seasonState(s), day = localDay(), t0 = tierOf(st.stars);
    if (st.d.day !== day) st.d = { day, n: 0 };
    const mult = seasonEnd(s) - xlNow() < XL.catchUpDays * 864e5 && t0 < XL.catchUpBelow ? 2 : 1;
    const add = Math.min(n * mult, XL.starCap * mult - st.d.n);
    if (add <= 0) return;
    st.d.n += add; st.stars += add;
    const L = S.seasonLog[s.id] = S.seasonLog[s.id] || { weeks: [], tier: 0 };
    const w = Math.floor((localDn(xlNow()) - localDn(parseLocal(s.start))) / 7);
    const wk = L.weeks[w] = L.weeks[w] || { stars: 0, days: 0, last: '' };
    if (wk.last !== day) { wk.days++; wk.last = day; }
    wk.stars += add;
    L.tier = tierOf(st.stars);
    if (L.tier > t0) { toast(t('xl_sTier', { n: L.tier })); log('seasonTier', L.tier); }
  }
  function seasonHtml() {
    let sum = '';
    if (X.seasonSum && !X.seasonSum.seen) { sum = `<p class="tut-inline">${t('xl_sSum', X.seasonSum)}</p>`; X.seasonSum.seen = true; }
    const s = activeSeason();
    if (!s) return `<h2>🌟 ${t('xl_premH')}</h2>${sum}<p class="note">${t('xl_sNone')}</p>`;
    const st = seasonState(s), tier = tierOf(st.stars), next = XL.seasonTiers[Math.min(tier, 29)], prev = tier ? XL.seasonTiers[tier - 1] : 0;
    const catchUp = seasonEnd(s) - xlNow() < XL.catchUpDays * 864e5 && tier < XL.catchUpBelow;
    const todayN = st.d.day === localDay() ? st.d.n : 0;
    const rows = XL.seasonTiers.map((need, k) => {
      const n = k + 1, reached = st.stars >= need, g = st.got.includes(n), pg = st.pgot.includes(n);
      const prem = st.prem ? `<button class="xl-pb" data-xl-ptier="${n}" ${!reached || pg ? 'disabled' : ''}>${pg ? '✅' : t('xl_prem')}</button>` : '';
      return `<div class="prod xl-tier ${g && (!st.prem || pg) ? 'done' : ''}"><span class="xl-tn">${n}</span><div><b>${rtxt(scaleR(XL.freeR(n, s)))}</b>${st.prem ? `<small>${t('xl_prem')}: ${rtxt(scaleR(XL.premR(n)))}</small>` : ''}<small>${need} 🌟</small></div>
        <button data-xl-tier="${n}" ${!reached || g ? 'disabled' : ''}>${g ? '✅' : t('claim')}</button>${prem}</div>`;
    }).join('');
    return `<h2>${s.icon} ${t('xl_' + s.id)}</h2>${sum}<p class="note">${t('xl_sDesc', { cap: XL.starCap })} · ${leftTxt(seasonEnd(s) - xlNow())}</p>
      <div class="xl-bar3"><div class="pbar"><i style="width:${tier >= 30 ? 100 : 100 * (st.stars - prev) / (next - prev)}%"></i></div><b>${t('xl_tier', { n: tier })}</b></div>
      <p class="xl-tom">${t('xl_stars', { n: st.stars })} · ${t('xl_sToday', { n: todayN, cap: XL.starCap * (catchUp ? 2 : 1) })}</p>
      ${catchUp ? `<p class="tut-inline">${t('xl_sCatch')}</p>` : ''}${rows}`;
  }
  function openSeason() { openModal(seasonHtml()); }
  function buyPremium() {
    const s = activeSeason(); if (!s || seasonState(s).prem) return;
    if (NATIVE) { NATIVE.buy(XL.premium.id); return; }
    toast(t('testBuy', { name: t('xl_premName') }));
    grantPremium();
  }
  function grantPremium() {
    const s = activeSeason(); if (!s) return;
    seasonState(s).prem = true; sfx('buy'); log('premium', s.id);
    commit();
    if (!$('modal').hidden) openShop();
  }

  // ---------- records E44, nickname E48 ----------
  function recDeliver() {
    const r = X.rec, d = today();
    if (r.dd.day !== d) { pushTop(r.dd); r.dd = { day: d, n: 0 }; }
    r.dd.n++; r.best = Math.max(r.best, r.dd.n);
  }
  function pushTop(dd) {
    if (!dd.day || !dd.n) return;
    const top = X.rec.top.filter(x => x.day !== dd.day);
    top.push({ day: dd.day, n: dd.n }); top.sort((a, b) => b.n - a.n);
    X.rec.top = top.slice(0, 5);
  }
  function bestItem() {
    let best = null;
    for (const k of Object.keys(S.seen || {})) { const i = k.lastIndexOf('_'), c = k.slice(0, i), l = +k.slice(i + 1); if (DATA.chains[c] && (!best || l > best.l)) best = { c, l }; }
    return best;
  }
  function recordsHtml() {
    const b = bestItem(), r = X.rec;
    const days = r.top.concat(r.dd.n ? [r.dd] : []).filter((x, i, a) => a.findIndex(y => y.day === x.day) === i).sort((a, b2) => b2.n - a.n).slice(0, 5);
    const row = (k, v) => `<div class="prod"><div><b>${t(k)}</b></div><span class="xl-v">${v}</span></div>`;
    return `<h2>🏆 ${t('xl_recH')}</h2>
      <h3>${t('xl_nick')}</h3><div class="xl-nick"><input id="xl-nick" maxlength="16" value="${esc(X.nick)}"><button data-xl="nick">${t('xl_nickSave')}</button></div>
      ${row('xl_bestDay', r.best)}${row('xl_bestStreak', X.streak.best)}
      ${row('xl_bestItem', b ? `<span class="xl-it">${icon(b.c, b.l)}</span> ${esc(nm(b.c, b.l))} (${b.l + 1})` : '-')}
      ${row('xl_places', `${S.zone}/${DATA.zones.length}`)}${row('xl_merges', S.stats.merges)}${row('xl_orders', S.stats.orders)}
      <h3>${t('xl_topDays')}</h3>${days.length ? `<ol class="xl-top">${days.map(x => `<li><span>${x.day}</span><b>${x.n}</b></li>`).join('')}</ol>` : `<p class="note">${t('xl_noDays')}</p>`}
      <p class="note">${t('xl_online')}</p>`;
  }
  function saveNick() {
    const v = ($('xl-nick').value || '').trim().replace(/\s+/g, ' ');
    const low = v.toLowerCase();
    if (!/^[\p{L}\p{N} .-]{3,16}$/u.test(v) || XL.nickBlock.some(w => low.includes(w))) { toast(t('xl_nickBad')); sfx('error'); return; }
    X.nick = v; log('nick'); toast(t('xl_nickOk')); commit();
  }

  // ---------- HUD ----------
  let hudKey = '';
  function hud() {
    const btn = $('btn-daily');
    let cnt = btn.querySelector('.xl-cnt');
    if (!cnt) { cnt = document.createElement('em'); cnt.className = 'xl-cnt'; btn.appendChild(cnt); }
    const okN = S.day ? S.day.tasks.filter(q => q.p >= q.n).length : 0, N = S.day ? S.day.tasks.length : 0;
    const e = activeEvent(), s = eventsOpen() ? activeSeason() : null;
    const st = s && X.season && X.season.id === s.id ? X.season : null;
    const key = [okN, N, e && e.id, e && leftTxt(parseLocal(e.end) - xlNow()), s && s.id, st ? tierOf(st.stars) : 0, S.cosmetics.sel, P.lang].join('|');
    if (key === hudKey) return;
    hudKey = key;
    cnt.textContent = N ? `${okN}/${N}` : '';
    const ev = $('xl-ev'), se = $('xl-se');
    ev.hidden = !e; se.hidden = !s;
    if (e) ev.innerHTML = emo(`<b>${e.icon}</b>${leftTxt(parseLocal(e.end) - xlNow())}`);
    if (s) se.innerHTML = emo(`<b>${s.icon}</b>${t('xl_tier', { n: st ? tierOf(st.stars) : 0 })}`);
    $('board').dataset.xlbg = S.cosmetics.sel;
  }
  function buildHud() {
    const b = $('boosts'), row = document.createElement('div');
    row.id = 'xl-row';
    b.parentNode.insertBefore(row, b);
    row.innerHTML = '<button id="xl-ev" class="xl-chip" hidden></button>';
    row.appendChild(b);
    row.insertAdjacentHTML('beforeend', '<button id="xl-se" class="xl-chip" hidden></button>');
    $('xl-ev').onclick = openEvent;
    $('xl-se').onclick = openSeason;
    $('res-energy').addEventListener('click', () => toast(energyFull()));
  }

  function xlTick() {
    clockCheck();
    if (S.lastDaily !== X.day && !frozen()) rollover(X.snap ? X.snap.gems : S.gems);
    markStreak();
    settleEvents();
    if (X.season && (!activeSeason() || activeSeason().id !== X.season.id)) { settleSeason(); save(); }
    hud();
  }

  // ---------- wrappers ----------
  const _save = save;
  save = function () { takeSnap(); _save(); };
  const _render = render;
  render = function () { _render(); if (X) xlTick(); };
  const _daily = daily;
  daily = function () {
    if (frozen()) return;
    takeSnap();
    const g0 = S.gems;
    _daily();
    if (S.lastDaily !== X.day) rollover(g0);
  };
  const _prog = prog;
  prog = function (k) {
    if (frozen()) return;
    if (k.startsWith('chain:')) { const c = k.slice(6); if (S.day) S.day.tasks.forEach(q => { if (q.k === 'chain' && q.c === c && q.p < q.n) q.p++; }); return; }
    _prog(k);
  };
  const _deliver = deliver;
  deliver = function (k) {
    const o = S.orders[k], n0 = S.stats.orders;
    _deliver(k);
    if (!o || S.stats.orders === n0) return;
    if (/^res_/.test(o.who)) prog('resOrder');
    o.need.forEach(x => prog('chain:' + x.c));
    if (o.who === 'res_' + focusRes()) {
      const rw = rwState(); S.coins += o.coins; rw.n++;
      toast(XL.resParts.includes(rw.n) ? t('xl_rwNew') : t('xl_rwBonus', { name: resOf(focusRes()).name, c: o.coins }));
    }
    addMarks(o); addStars(XL.starDeliver); recDeliver(); log('deliver');
    commit();
  };
  const _drop = drop;
  drop = function (from, to) {
    const m0 = S.stats.merges;
    _drop(from, to);
    const c = S.board[to];
    if (S.stats.merges > m0 && c && c.c && c.l >= 4) { prog('make5'); save(); }
  };
  const _openChest = openChest;
  openChest = function (i) { _openChest(i); prog('chest'); log('chest'); commit(); };
  const _claimAlbum = claimAlbum;
  claimAlbum = function (c) {
    const had = (S.album || {})[c];
    _claimAlbum(c);
    if (!had && S.album[c] && weekendMode() === 'album') { const g = Math.round(DATA.albumGems * XL.albumBonus); S.gems += g; toast(`+${g} 💎`); commit(); openAlbum(); }
  };
  const _canClaim = canClaim;
  canClaim = function () { return _canClaim() || (X && X.passPending > 0); };
  const _openModal = openModal;
  openModal = function (html) {
    // E9: the daily window never opens by itself.
    if (String(html).indexOf('class="cal"') >= 0 && !dailyAllowed()) { nudge(); return; }
    _openModal(html);
  };
  const dailyAllowed = () => allowDaily || (!$('modal').hidden && !!$('modal-body').querySelector('[data-xl-daily]'));
  openDaily = function () {
    if (!S.day) return;
    if (!dailyAllowed()) { nudge(); return; }
    maybeRedraw();
    $('amy-pop').hidden = true;
    _openModal(dailyHtml());
  };
  const _claimDaily = claimDaily;
  claimDaily = function (k) {
    if (k === 'cal') {
      if (S.cal.got || S.cal.i < 0) return;
      S.cal.got = true; grantR(calReward(S.cal.i, S.cal.cycle || 0)); log('cal', S.cal.i);
      commit(); openDaily(); return;
    }
    if (k === 'all') {
      const b = S.day.bonus; _claimDaily(k);
      if (!b && S.day.bonus) { grantR(XL.allBonusExtra); log('allBonus'); commit(); openDaily(); }
      return;
    }
    const q = S.day.tasks[k], was = q && q.got;
    _claimDaily(k);
    if (q && !was && q.got) {
      if (q.reward.chest && weekendMode() === 'chest') grantR({ chest: q.reward.chest });
      addStars(XL.starTask); log('task', q.k);
      commit(); openDaily();
    }
  };
  const _openShop = openShop;
  openShop = function () {
    _openShop();
    const s = activeSeason();
    if (!s || !eventsOpen() || seasonState(s).prem) return;
    $('modal-body').insertAdjacentHTML('beforeend', emo(`<h3>${t('xl_premH')}</h3><div class="prod"><span class="pi">${s.icon}</span><div><b>${t('xl_premName')}</b><small>${t('xl_premDesc')}</small></div>
      <button data-xl="prem">${nativePrices[XL.premium.id] || XL.premium.price}</button></div>`));
  };
  const _openSettings = openSettings;
  openSettings = function () {
    _openSettings();
    const own = S.cosmetics.own, locked = XL.cosmetics.length - own.length;
    const html = `<h3>${t('xl_bg')}</h3><div class="opts xl-bgs">${own.map(id => `<button class="opt ${S.cosmetics.sel === id ? 'on' : ''}" data-xl-bg="${id}"><i class="xl-sw" data-xlbg="${id}"></i>${t('xl_bg_' + id)}</button>`).join('')}</div>
      ${locked > 0 ? `<p class="note">${t('xl_bgLocked', { n: locked })}</p>` : ''}<button class="back" data-xl="rec">🏆 ${t('xl_rec')}</button>`;
    const links = $('modal-body').querySelector('.links');
    if (links) links.insertAdjacentHTML('beforebegin', html); else $('modal-body').insertAdjacentHTML('beforeend', html);
  };
  const _onNativePurchase = window.onNativePurchase;
  window.onNativePurchase = id => { if (id === XL.premium.id) { grantPremium(); toast(`✅ ${t('xl_premName')}`); } else _onNativePurchase(id); };

  // ---------- clicks in our windows ----------
  $('modal-body').addEventListener('click', e => {
    const a = e.target.closest('[data-xl],[data-xl-tier],[data-xl-ptier],[data-xl-etier],[data-xl-stage],[data-xl-bg]');
    if (!a) return;
    const d = a.dataset;
    if (d.xl === 'pass' && X.passPending > 0) {
      fly(a, 'gems', '💎', 5); S.gems += X.passPending; log('pass', X.passPending); X.passPending = 0; sfx('buy'); commit(); openDaily();
    } else if (d.xl === 'lucky' && weekendMode() === 'lucky' && X.wkLucky !== weekIdx()) {
      X.wkLucky = weekIdx(); grantR({ lucky: XL.luckyMin }); sfx('buy'); commit(); openDaily();
    } else if (d.xl === 'prem') buyPremium();
    else if (d.xl === 'rec') openModal(recordsHtml());
    else if (d.xl === 'nick') saveNick();
    else if (d.xlBg) { if (S.cosmetics.own.includes(d.xlBg)) { S.cosmetics.sel = d.xlBg; sfx('spawn'); commit(); openSettings(); } }
    else if (d.xlTier || d.xlPtier) {
      const s = activeSeason(); if (!s) return;
      const st = seasonState(s), n = +(d.xlTier || d.xlPtier), prem = !!d.xlPtier, list = prem ? st.pgot : st.got;
      if (st.stars < XL.seasonTiers[n - 1] || list.includes(n) || (prem && !st.prem)) return;
      list.push(n); grantR(scaleR(prem ? XL.premR(n) : XL.freeR(n, s))); log(prem ? 'pTier' : 'tier', n); commit(); openSeason();
    } else if (d.xlEtier !== undefined || d.xlStage) {
      const ev = activeEvent(); if (!ev) return;
      const es = evState(ev);
      if (d.xlStage) {
        const n = +d.xlStage;
        if (es.stages.includes(n) || evDay(ev) < n || es.marks < n * ev.stageMarks) return;
        es.stages.push(n); grantR(scaleR(ev.stages[n - 1]));
      } else {
        const k = +d.xlEtier;
        if (es.tiers.includes(k) || es.marks < ev.tiers[k]) return;
        es.tiers.push(k); grantR(scaleR(ev.rewards[k]));
      }
      log('evClaim'); commit(); openEvent();
    }
  });

  // ---------- init ----------
  ensure();
  if (X.maxTs && Date.now() < X.maxTs - XL.clockBackMs && X.snap && S.lastDaily !== X.day) {
    // Clock went back and game.js already rolled a new day on load: undo it.
    if (S.gems - X.snap.gems === DATA.pass.dailyGems) S.gems -= DATA.pass.dailyGems;
    S.day = clone(X.snap.day); S.cal = clone(X.snap.cal); S.lastDaily = X.snap.lastDaily;
  } else if (S.lastDaily !== X.day) rollover(X.snap ? X.snap.gems : S.gems);
  $('btn-daily').onclick = () => { allowDaily = true; try { openDaily(); } finally { allowDaily = false; } };
  $('btn-shop').onclick = openShop;
  $('res-gems').onclick = openShop;
  $('btn-settings').onclick = openSettings;
  buildHud();
  log('start');
  commit();
  setInterval(() => { if (!document.hidden) { xlTick(); } }, 1000);
  window.__live = { XL, get x() { return S.xl; }, xlNow, openEvent, openSeason, openRecords: () => openModal(recordsHtml()), drawTasks, activeEvent, activeSeason };
})();
