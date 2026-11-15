// Update 1.1 (Ali 2026-11-15): guests as standing figures with speech bubbles, top rail (season pass, cards, suns),
// collectible cards, gems for every new symbol, sun meter (12 suns = items for the current orders), item info card.
(function () {
  const PX = {
    sunMax: 12,
    discoverGems: l => (l <= 2 ? 1 : l <= 4 ? 2 : l <= 6 ? 3 : 5),
    cardChanceOrder: 0.25,
    setGems: 50,
    allSetsGems: 200,
    packGems: 30,
    packStars: 20,
    dupStars: [1, 3, 8],
    sets: [
      { id: 'friends', cards: ['amy_face', 'cu_0', 'cu_1', 'cu_2', 'cu_3', 'res_0', 'res_1', 'res_2', 'res_3'], rare: [1, 1, 1, 1, 2, 2, 2, 2, 3] },
      { id: 'places', cards: ['place_0', 'place_1', 'place_2', 'place_3', 'place_4', 'place_5', 'res_4', 'res_5', 'chest'], rare: [1, 1, 1, 2, 2, 2, 2, 3, 3] },
      { id: 'treats', cards: ['bakery_7', 'fruit_7', 'cafe_7', 'kitchen_7', 'veggie_7', 'sweets_7', 'joker', 'gen_bakery', 'gen_sweets'], rare: [2, 1, 1, 2, 2, 3, 3, 1, 1] }
    ],
    rareW: [70, 25, 5],
    // value anchor (data.js): 1 gem = 5 energy = 20 coins; deals sit at about 40% off
    deals: [
      { id: 'energy', gems: 25, off: 40, icon: '⚡', r: { energy: 150, chest: 1 } },
      { id: 'jokers', gems: 25, off: 40, icon: '🃏', r: { joker: 2 } },
      { id: 'chests', gems: 35, off: 40, icon: '🎁', r: { chest: 3 } },
      { id: 'cards', gems: 45, off: 40, icon: '🎴', r: { cards: 3 } },
      { id: 'suns', gems: 20, off: 50, icon: '☀️', r: { suns: 1 } },
      { id: 'coins', gems: 60, off: 40, icon: '🪙', r: { coins: 2000 } }
    ]
  };
  window.PX = PX;

  Object.assign(I18N.en, {
    px_find: 'New symbol: {name} +{g} 💎', px_cards: 'Cards', px_pass: 'Pass', px_suns: 'Suns',
    px_cardsH: 'Collector cards', px_cardsNote: 'Cards come from orders (1 in 4) and every chest. Complete a set for {g} 💎, all sets for {a} 💎 more.',
    px_set_friends: 'Island Friends', px_set_places: 'Island Places', px_set_treats: 'Master Treats',
    px_newCard: 'New card!', px_dup: 'Duplicate: +{n} ⭐ card stars', px_starsN: 'Card stars: {n} ⭐',
    px_packStars: 'Pack for {n} ⭐', px_packGems: 'Pack for {n} 💎', px_setDone: 'Set complete: {name}! +{g} 💎', px_allDone: 'All sets complete! +{g} 💎',
    px_sunH: 'Sun meter', px_sunNote: 'Every delivery gives a sun. With {m} suns you get a boost: items your guests need right now.',
    px_sunGo: 'Use boost', px_sunWait: '{n}/{m} suns', px_sunGot: 'Sun boost: {n} items for your guests!', px_sunFull: 'Board full: make room first',
    px_lvl: 'Level {l}/{m}', px_next: 'Next', px_noSeason: 'The next season starts soon.',
    px_deals: 'Daily deals', px_deal: 'Deal', px_dealLeft: 'New deals in {t}', px_dealOff: '-{p}%', px_dealGot: 'Bought today',
    px_d_energy: 'Energy Crate', px_d_energyD: '150 ⚡ and a chest', px_d_jokers: 'Joker Duo', px_d_jokersD: '2 jokers',
    px_d_chests: 'Chest Trio', px_d_chestsD: '3 chests', px_d_cards: 'Card Bundle', px_d_cardsD: '3 collector cards, 1 surely new',
    px_d_suns: 'Full Sun', px_d_sunsD: 'Fill the sun meter now', px_d_coins: 'Coin Sack', px_d_coinsD: '2,000 🪙'
  });
  Object.assign(I18N.de, {
    px_find: 'Neues Symbol: {name} +{g} 💎', px_cards: 'Karten', px_pass: 'Pass', px_suns: 'Sonnen',
    px_cardsH: 'Sammelkarten', px_cardsNote: 'Karten gibt es aus Bestellungen (1 von 4) und aus jeder Truhe. Ein volles Set bringt {g} 💎, alle Sets zusätzlich {a} 💎.',
    px_set_friends: 'Inselfreunde', px_set_places: 'Inselorte', px_set_treats: 'Meisterleckereien',
    px_newCard: 'Neue Karte!', px_dup: 'Doppelt: +{n} ⭐ Kartensterne', px_starsN: 'Kartensterne: {n} ⭐',
    px_packStars: 'Paket für {n} ⭐', px_packGems: 'Paket für {n} 💎', px_setDone: 'Set komplett: {name}! +{g} 💎', px_allDone: 'Alle Sets komplett! +{g} 💎',
    px_sunH: 'Sonnen-Zähler', px_sunNote: 'Jede Lieferung bringt eine Sonne. Mit {m} Sonnen bekommst du einen Schub: Zutaten, die deine Gäste gerade brauchen.',
    px_sunGo: 'Schub holen', px_sunWait: '{n}/{m} Sonnen', px_sunGot: 'Sonnen-Schub: {n} Zutaten für deine Gäste!', px_sunFull: 'Brett voll: mach erst Platz',
    px_lvl: 'Stufe {l}/{m}', px_next: 'Nächste', px_noSeason: 'Die nächste Saison startet bald.',
    px_deals: 'Tagesangebote', px_deal: 'Angebot', px_dealLeft: 'Neue Angebote in {t}', px_dealOff: '-{p}%', px_dealGot: 'Heute gekauft',
    px_d_energy: 'Energiekiste', px_d_energyD: '150 ⚡ und eine Truhe', px_d_jokers: 'Joker-Duo', px_d_jokersD: '2 Joker',
    px_d_chests: 'Truhen-Trio', px_d_chestsD: '3 Truhen', px_d_cards: 'Kartenbündel', px_d_cardsD: '3 Sammelkarten, 1 sicher neu',
    px_d_suns: 'Volle Sonne', px_d_sunsD: 'Sonnen-Zähler sofort voll', px_d_coins: 'Münzsack', px_d_coinsD: '2.000 🪙'
  });

  const st = () => { S.px = S.px || { suns: 0, cards: {}, stars: 0, sets: {} }; S.px.cards = S.px.cards || {}; S.px.sets = S.px.sets || {}; return S.px; };
  const imgOf = k => `<img src="img/${k}.png" alt="" draggable="false">`;
  const SVG = {
    cards: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="11" height="15" rx="2" fill="#7fd3f5" stroke="#fff" stroke-width="1.6" transform="rotate(-10 8 12)"/><rect x="9" y="4" width="11" height="15" rx="2" fill="#ff9fb5" stroke="#fff" stroke-width="1.6" transform="rotate(8 15 11)"/><path d="M15 8.500l1 2 2.200.300-1.600 1.500.400 2.200-2-1.100-2 1.100.400-2.200-1.600-1.500 2.200-.300z" fill="#fff"/></svg>',
    pass: '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6z" fill="#ffc94a" stroke="#fff" stroke-width="1.6"/><path d="M12 8l1.200 2.400 2.600.400-1.900 1.800.500 2.600L12 14l-2.400 1.200.500-2.600-1.900-1.800 2.600-.400z" fill="#e8742a"/></svg>',
    sun: '<svg viewBox="0 0 24 24"><g stroke="#ffb320" stroke-width="2.200" stroke-linecap="round"><path d="M12 1.500v3M12 19.500v3M1.500 12h3M19.500 12h3M4.600 4.600l2.100 2.100M17.300 17.300l2.100 2.100M4.600 19.400l2.100-2.100M17.300 6.700l2.100-2.100"/></g><circle cx="12" cy="12" r="5.600" fill="#ffd84a" stroke="#fff" stroke-width="1.600"/></svg>'
  };

  // ---------- guests: only the painted ones (the drawn placeholders cu_4..7 stay out) ----------
  DATA.customers = DATA.customers.filter(k => !/^cu_[4-7]$/.test(k));
  ['res_4', 'res_5'].forEach(k => { if (!DATA.customers.includes(k)) DATA.customers.push(k); });
  (S.orders || []).forEach(o => { if (/^cu_[4-7]$/.test(o.who)) o.who = DATA.customers[rnd(0, DATA.customers.length - 1)]; });

  // ---------- orders: figure below, speech bubble above ----------
  const _ordersHtml = ordersHtml;
  ordersHtml = function () {
    const tpl = document.createElement('template');
    tpl.innerHTML = _ordersHtml();
    tpl.content.querySelectorAll('.order').forEach(o => {
      const who = o.querySelector(':scope > .who');
      const bub = document.createElement('div');
      bub.className = 'bub';
      [...o.childNodes].forEach(n => { if (n !== who) bub.appendChild(n); });
      o.appendChild(bub);
      if (who) o.appendChild(who);
    });
    return tpl.innerHTML;
  };

  // ---------- gems for every new symbol ----------
  const _seen = seen;
  seen = function (c, l) {
    const fresh = _seen(c, l);
    if (fresh && l >= 1 && S.tut >= 1) {
      const g = PX.discoverGems(l);
      S.gems += g; econ('gems', 'discover', g);
      gemPop(g);
      setTimeout(() => toast(t('px_find', { name: nm(c, l), g })), 50);
    }
    return fresh;
  };
  function gemPop(g) {
    const b = $('res-gems');
    if (!b) return;
    const r = b.getBoundingClientRect(), d = document.createElement('div');
    d.className = 'px-pop'; d.innerHTML = emo(`+${g} 💎`);
    d.style.left = r.left + r.width / 2 + 'px'; d.style.top = r.bottom + 'px';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1300);
  }

  // ---------- suns: one per delivery, 12 = boost ----------
  const _deliver = deliver;
  deliver = function (k) {
    const n0 = S.stats.orders;
    _deliver(k);
    if (S.stats.orders === n0) return;
    const p = st();
    p.suns = Math.min(PX.sunMax, (p.suns || 0) + 1);
    if (Math.random() < PX.cardChanceOrder) dropCard();
    save(); renderRail();
  };
  const _openChest = openChest;
  openChest = function (i) { _openChest(i); dropCard(); save(); renderRail(); };

  function sunBoost() {
    const p = st();
    if (p.suns < PX.sunMax) return;
    const want = [];
    S.orders.forEach(o => {
      const loc = locate(o);
      o.need.forEach((x, j) => { if (!loc[j]) want.push({ c: x.c, l: x.l }); });
    });
    // fill up to four with the step below each wanted item, so the boost always feels big
    S.orders.forEach(o => o.need.forEach(x => { if (want.length < 4) want.push({ c: x.c, l: Math.max(0, x.l - 1) }); }));
    const items = want.slice(0, 4);
    let placed = 0;
    for (const it of items) {
      const i = nearestEmpty(centerIdx());
      if (i < 0) break;
      S.board[i] = { c: it.c, l: it.l }; _seen(it.c, it.l); flash(i); placed++;
    }
    if (!placed) { toast(t('px_sunFull')); return; }
    p.suns = 0;
    sfx('level'); buzz(40);
    closeModal(); commit();
    toast(t('px_sunGot', { n: placed }));
  }
  function openSuns() {
    const p = st(), n = p.suns || 0;
    const dots = [...Array(PX.sunMax).keys()].map(q => `<i class="${q < n ? 'on' : ''}">${SVG.sun}</i>`).join('');
    openModal(`<h2>${t('px_sunH')}</h2><p class="note">${t('px_sunNote', { m: PX.sunMax })}</p><div class="px-suns">${dots}</div>
      <button class="back" data-px-sun="1" ${n >= PX.sunMax ? '' : 'disabled'}>${n >= PX.sunMax ? t('px_sunGo') : t('px_sunWait', { n, m: PX.sunMax })}</button>`);
  }

  // ---------- collector cards ----------
  function pickCard() {
    const r = Math.random() * 100, rare = r < PX.rareW[0] ? 1 : r < PX.rareW[0] + PX.rareW[1] ? 2 : 3;
    const pool = [];
    PX.sets.forEach(s => s.cards.forEach((k, q) => { if (s.rare[q] === rare) pool.push({ set: s.id, k, rare }); }));
    return pool[rnd(0, pool.length - 1)];
  }
  function dropCard(forceNew) {
    const p = st();
    let c = pickCard();
    if (forceNew) {
      const miss = [];
      PX.sets.forEach(s => s.cards.forEach((k, q) => { if (!p.cards[s.id + ':' + k]) miss.push({ set: s.id, k, rare: s.rare[q] }); }));
      if (miss.length) c = miss[rnd(0, miss.length - 1)];
    }
    const id = c.set + ':' + c.k;
    if (p.cards[id]) {
      p.cards[id]++;
      const n = PX.dupStars[c.rare - 1]; p.stars = (p.stars || 0) + n;
      setTimeout(() => toast(t('px_dup', { n })), 900);
      return;
    }
    p.cards[id] = 1;
    checkSets();
    setTimeout(() => showCard(c), 700);
  }
  function checkSets() {
    const p = st();
    PX.sets.forEach(s => {
      if (p.sets[s.id] || !s.cards.every(k => p.cards[s.id + ':' + k])) return;
      p.sets[s.id] = 1; S.gems += PX.setGems; econ('gems', 'cards', PX.setGems);
      setTimeout(() => toast(t('px_setDone', { name: t('px_set_' + s.id), g: PX.setGems })), 2400);
    });
    if (!p.sets.all && PX.sets.every(s => p.sets[s.id])) {
      p.sets.all = 1; S.gems += PX.allSetsGems; econ('gems', 'cards', PX.allSetsGems);
      setTimeout(() => toast(t('px_allDone', { g: PX.allSetsGems })), 4200);
    }
  }
  const cardHtml = (k, rare, have, n) => `<div class="px-card r${rare} ${have ? '' : 'miss'}"><span class="pic">${imgOf(k)}</span><b>${'★'.repeat(rare)}</b>${n > 1 ? `<i>x${n}</i>` : ''}</div>`;
  function showCard(c) {
    if (!$('modal').hidden) { toast(t('px_newCard')); return; }
    openModal(`<div class="px-reveal"><h2>${t('px_newCard')}</h2>${cardHtml(c.k, c.rare, true, 1)}<p class="note">${t('px_set_' + c.set)}</p></div>`);
  }
  function openCards(tab) {
    const p = st();
    tab = tab || 0;
    const s = PX.sets[tab];
    const tabs = PX.sets.map((x, q) => {
      const got = x.cards.filter(k => p.cards[x.id + ':' + k]).length;
      return `<button class="opt ${q === tab ? 'on' : ''}" data-px-tab="${q}">${t('px_set_' + x.id)} ${got}/9${p.sets[x.id] ? ' ✅' : ''}</button>`;
    }).join('');
    const grid = s.cards.map((k, q) => cardHtml(k, s.rare[q], !!p.cards[s.id + ':' + k], p.cards[s.id + ':' + k] || 0)).join('');
    openModal(`<h2>${t('px_cardsH')}</h2><p class="note">${t('px_cardsNote', { g: PX.setGems, a: PX.allSetsGems })}</p>
      <div class="opts px-tabs">${tabs}</div><div class="px-grid">${grid}</div>
      <p class="note">${t('px_starsN', { n: p.stars || 0 })}</p>
      <div class="opts"><button class="opt" data-px-pack="stars" ${(p.stars || 0) >= PX.packStars ? '' : 'disabled'}>${t('px_packStars', { n: PX.packStars })}</button>
      <button class="opt" data-px-pack="gems" ${S.gems >= PX.packGems ? '' : 'disabled'}>${emo(t('px_packGems', { n: PX.packGems }))}</button></div>`);
    $('modal-body').dataset.pxTab = tab;
  }
  function buyPack(kind) {
    const p = st();
    if (kind === 'stars') { if ((p.stars || 0) < PX.packStars) return; p.stars -= PX.packStars; }
    else { if (S.gems < PX.packGems) return; S.gems -= PX.packGems; econ('gems', 'cardPack', -PX.packGems); }
    closeModal(); dropCard(true); dropCard(); commit();
  }

  // ---------- daily deals: two per day, each once, only inside the shop (no pop-ups) ----------
  function dealsToday() {
    const d = today();
    let h = 0; for (const ch of d) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const a = h % PX.deals.length, b = (a + 1 + (h >> 5) % (PX.deals.length - 1)) % PX.deals.length;
    return [PX.deals[a], PX.deals[b]];
  }
  function leftToday() {
    const n = new Date(now()), m = new Date(n); m.setHours(24, 0, 0, 0);
    const s = Math.max(0, Math.floor((m - n) / 1000));
    return `${Math.floor(s / 3600)}h ${String(Math.floor(s / 60) % 60).padStart(2, '0')}m`;
  }
  function dealsHtml() {
    const p = st(), got = p.dealDay === today() ? p.dealGot || [] : [];
    const row = d => {
      const own = got.includes(d.id), poor = S.gems < d.gems;
      return `<div class="prod px-deal"><span class="pi">${d.icon}<em>${t('px_dealOff', { p: d.off })}</em></span><div><b>${t('px_d_' + d.id)}</b><small>${t('px_d_' + d.id + 'D')}</small></div>
        <button data-px-deal="${d.id}" ${own || poor ? 'disabled' : ''}>${own ? t('px_dealGot') : poor ? t('missGems', { n: fmt(d.gems - S.gems) }) : `💎 ${d.gems}`}</button></div>`;
    };
    return emo(`<h3>${t('px_deals')} <small class="px-left">${t('px_dealLeft', { t: leftToday() })}</small></h3>${dealsToday().map(row).join('')}`);
  }
  function buyDeal(id) {
    const d = dealsToday().find(x => x.id === id), p = st();
    if (!d) return;
    if (p.dealDay !== today()) { p.dealDay = today(); p.dealGot = []; }
    if (p.dealGot.includes(id) || S.gems < d.gems) return;
    S.gems -= d.gems; econ('gems', 'deal', -d.gems); p.dealGot.push(id);
    const r = d.r;
    if (r.energy || r.coins) grant({ energy: r.energy, coins: r.coins });
    for (let q = 0; q < (r.chest || 0); q++) grant({ chest: 1 });
    for (let q = 0; q < (r.joker || 0); q++) grant({ joker: 1 });
    if (r.suns) p.suns = PX.sunMax;
    closeModal();
    for (let q = 0; q < (r.cards || 0); q++) dropCard(q === 0);
    commit(); toast(t('px_d_' + id) + ' ✅');
  }
  const _openShop = openShop;
  openShop = function () {
    _openShop();
    const body = $('modal-body'), h = body.querySelector('h2');
    if (!body.querySelector('.px-deals') && S.tut >= 5) {
      const w = document.createElement('div'); w.className = 'px-deals'; w.innerHTML = dealsHtml();
      if (h) h.after(w); else body.prepend(w);
    }
  };

  // ---------- top rail ----------
  function buildRail() {
    const top = $('top');
    if (!top || $('px-rail')) return;
    const r = document.createElement('div');
    r.id = 'px-rail';
    r.innerHTML = `<button id="px-pass" aria-label="${t('px_pass')}">${SVG.pass}<span>${t('px_pass')}</span></button>
      <button id="px-cards" aria-label="${t('px_cards')}">${SVG.cards}<span>${t('px_cards')}</span><i hidden></i></button>
 <button id="px-deal" aria-label="${t('px_deal')}"><b>%</b><span>${t('px_deal')}</span><em></em></button>
      <button id="px-sun" aria-label="${t('px_suns')}">${SVG.sun}<span class="px-sbar"><b></b></span><em></em></button>`;
    const row = $('xl-row') || $('boosts');
    row.parentNode.insertBefore(r, row.nextSibling);
    $('px-pass').onclick = () => { if (window.__live && __live.activeSeason && __live.activeSeason()) __live.openSeason(); else toast(t('px_noSeason')); };
    $('px-cards').onclick = () => openCards(0);
    $('px-sun').onclick = openSuns;
    $('px-deal').onclick = () => openShop();
  }
  function renderRail() {
    const r = $('px-rail');
    if (!r) return;
    r.hidden = S.tut < 5;
    const p = st(), n = p.suns || 0;
    r.querySelector('.px-sbar b').style.width = (100 * n / PX.sunMax) + '%';
    r.querySelector('#px-sun em').textContent = `${n}/${PX.sunMax}`;
    r.querySelector('#px-sun').classList.toggle('full', n >= PX.sunMax);
    $('px-pass').querySelector('span').textContent = t('px_pass');
    $('px-cards').querySelector('span').textContent = t('px_cards');
    $('px-deal').querySelector('span').textContent = t('px_deal');
    $('px-deal').querySelector('em').textContent = leftToday();
  }

  // ---------- item info card in the strip ----------
  const _renderStrip = renderStrip;
  renderStrip = function () {
    _renderStrip();
    const sc = S.board[selected], info = $('info');
    if (!sc || !sc.c || sc.drift || sc.bubble) { info.classList.remove('px-item'); return; }
    const chain = [...Array(MAX_L + 1).keys()].map(l => `<span class="${l === sc.l ? 'cur' : (S.seen || {})[sc.c + '_' + l] ? '' : 'unk'}">${icon(sc.c, l)}</span>`).join('');
    setHTML(info, emo(`<span class="px-big">${icon(sc.c, sc.l)}</span><span class="px-txt"><b>${nm(sc.c, sc.l)}</b><small>${t('px_lvl', { l: sc.l + 1, m: MAX_L + 1 })}</small><span class="px-chain">${chain}</span></span>`));
    info.classList.add('px-item');
  };

  // ---------- inventory and album always reachable after the tutorial ----------
  const _fixups = fixups;
  fixups = function () { _fixups(); if (S.tut >= 5) { S.ui.store = 1; S.ui.album = 1; } };

  const _render = render;
  render = function () { _render(); renderRail(); };

  $('modal-body').addEventListener('click', e => {
    const b = e.target.closest('[data-px-tab],[data-px-pack],[data-px-sun],[data-px-deal]');
    if (!b) return;
    if (b.dataset.pxTab !== undefined) openCards(+b.dataset.pxTab);
    else if (b.dataset.pxPack) buyPack(b.dataset.pxPack);
    else if (b.dataset.pxSun) sunBoost();
    else if (b.dataset.pxDeal) buyDeal(b.dataset.pxDeal);
  });

  buildRail();
  window.__px = { PX, st, dropCard, sunBoost, openCards, openSuns, dealsToday, buyDeal };
  setInterval(() => { if (!document.hidden) renderRail(); }, 30000);
  render();
})();
