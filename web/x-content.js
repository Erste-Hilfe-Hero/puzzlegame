'use strict';
// Content layer, plan-500 round 2: B15 friendship, B18 guests by time of day, B24-B28 islands with own boards,
// B31 locked place preview, B32 place decoration, B33 event chains, B36 guest album, B37 album step coins,
// B40 storm story, B46 rare finds, B47 message-in-a-bottle orders, B48 resident bonuses.
// Data lives in data.js (EN) and i18n.js (DE). Loaded before game.js: the island data and active event chains are
// set up before game.js loads the save; the wrappers are installed when game.js publishes window.__game,
// so x-design.js and x-live.js (loaded later) wrap these wrappers. game.js stays unchanged.
(function () {
  const ISL = DATA.islands, DEI = I18N.de.islands;
  const SAVE = 'amy-tasty-v1'; // game.js SAVE_KEY
  const dstr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let cur = 0;

  // B24: game.js reads DATA.zones / residents / mapPins and I18N.de.zones / tasks / residents; they point to the current island.
  function setIsland(i) {
    const a = ISL[i], d = DEI[i];
    DATA.zones = a.places; DATA.residents = a.residents; DATA.mapPins = a.pins;
    I18N.de.zones = d.zones; I18N.de.tasks = d.tasks; I18N.de.residents = d.residents;
    I18N.en.map = a.name; I18N.de.map = d.name;
    cur = i;
  }
  let pre = null;
  try { pre = JSON.parse(localStorage.getItem(SAVE) || 'null'); } catch (e) { pre = null; }
  setIsland(pre && Number.isInteger(pre.island) && ISL[pre.island] ? pre.island : 0);

  // B33: an active event chain must exist before game.js validates the saved board.
  const evOn = e => { const d = dstr(new Date(Date.now())); return !e.disabled && d >= e.start && d < e.end; };
  function regEvent(e) {
    DATA.chains[e.id] = { ...e.chain };
    I18N.de.chains[e.id] = (I18N.de.eventChains || {})[e.id] || { name: e.chain.name, genName: e.chain.genName, names: e.chain.names };
  }
  (DATA.events || []).filter(evOn).forEach(regEvent);

  const CSS = `
.xc-arch{display:flex;gap:6px;margin:0 0 8px}
.xc-isl{flex:1;border:0;border-radius:14px;padding:4px 2px 6px;background:#fff8;display:flex;flex-direction:column;align-items:center;font:inherit;color:inherit;min-height:44px}
.xc-isl.here{background:#fff;box-shadow:0 0 0 3px var(--accent,#ff6f91)}
.xc-isl.lock .xc-mini{filter:grayscale(1) brightness(.85);opacity:.6}
.xc-isl b{font-size:12px;line-height:1.1}.xc-isl small{font-size:10px;line-height:1.1;opacity:.8}
.xc-mini{display:block;width:44px;height:52px}.xc-mini svg{width:100%;height:100%}
.xc-story{background:#fff3c4;border-radius:12px;padding:8px 10px;margin:4px 0 10px;text-align:left;font-size:14px}
.xc-story b{display:block;font-size:12px;opacity:.75}
.xc-line{font-size:13px;margin:2px 0}
.xc-dgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:6px 0 12px}
.xc-dgrid .opt{display:flex;flex-direction:column;align-items:center;padding:4px 2px;min-height:44px}
.xc-dpic{display:block;width:44px;height:44px;font-size:32px;line-height:44px}.xc-dpic img{width:44px;height:44px;object-fit:contain}
.xc-dgrid b{font-size:11px}.xc-dgrid small{font-size:10px}
.xc-tabs{display:flex;gap:5px;margin:0 0 8px}.xc-tabs .opt{flex:1;min-height:40px}
.xc-g{display:flex;gap:8px;align-items:center;background:var(--cell,#fff3d6);border-radius:12px;padding:6px;margin-bottom:6px}
.xc-g>div{display:flex;flex-direction:column;text-align:left;min-width:0}.xc-g small{font-size:12px}
.xc-face{width:48px;height:48px;flex-shrink:0;font-size:36px;line-height:48px;text-align:center}.xc-face img{width:48px;height:48px;object-fit:contain}
.xc-face.unk img,.xc-face.unk{filter:brightness(0) opacity(.3)}
.xc-fav img{width:20px;height:20px;vertical-align:middle}
.xc-walk{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.xc-walk div{text-align:center;font-size:11px}
.xc-finds{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.xc-finds div{background:#fff;border-radius:12px;padding:6px;text-align:center;font-size:12px}.xc-finds span{display:block;font-size:34px}
.xc-finds .unk span{filter:brightness(0) opacity(.2)}
.xc-prev{position:relative;display:flex;justify-content:center;align-items:flex-end;height:150px;font-size:96px}
.xc-prev .xc-dark img{height:140px;filter:brightness(.35) grayscale(.6)}.xc-prev .xc-dark{filter:brightness(.4) grayscale(.6)}
.xc-prev .xc-sil{position:absolute;right:18%;bottom:0;font-size:56px;filter:brightness(0) opacity(.75)}.xc-prev .xc-sil img{height:84px}
.order .xc-bt{position:absolute;left:2px;top:2px;font-size:10px;font-style:normal;background:#fff;border-radius:8px;padding:0 4px}`;

  let installed = false;
  Object.defineProperty(window, '__game', {
    configurable: true, enumerable: true,
    get() { return undefined; },
    set(v) {
      Object.defineProperty(window, '__game', { value: v, writable: true, configurable: true, enumerable: true });
      if (!installed) { installed = true; install(); }
    }
  });

  function install() {
    const want = Number.isInteger(S.island) && ISL[S.island] ? S.island : 0;
    if (want !== cur) setIsland(want);
    S.island = want;
    for (const k of ['boards', 'friend', 'guests', 'finds', 'deco', 'decoOwn']) if (!S[k] || typeof S[k] !== 'object') S[k] = {};
    try { const st = document.createElement('style'); st.textContent = CSS; (document.head || document.body).appendChild(st); } catch (e) { /* no DOM */ }

    const wrap = (n, f) => { if (typeof window[n] === 'function') window[n] = f(window[n]); };
    const isDe = () => P.lang === 'de';
    const islName = i => (isDe() ? DEI[i].name : ISL[i].name);
    const zoneOf = i => (i === S.island ? S.zone : ((S.boards[i] || {}).zone || 0));
    const placeDone = (i, k) => k < zoneOf(i);
    const islandDone = i => zoneOf(i) >= ISL[i].places.length;
    const islandOpen = i => i === 0 || islandDone(i - 1);
    const visited = i => i === S.island || !!S.boards[i];
    const resName = (i, k) => ((isDe() && DEI[i].residents[k]) || ISL[i].residents[k]).name;
    const resFace = (i, k) => (i === 0 ? `<img src="${src('res_' + k)}" alt="">` : ISL[i].residents[k].emoji);
    const placeArt = (i, k) => (i === 0 ? `<img src="${src('place_' + k)}" alt="">` : ISL[i].places[k].emoji);
    const friendLvl = n => DATA.friendSteps.filter(s => n >= s.n).length;
    const hearts = n => '❤️'.repeat(n) + '🤍'.repeat(DATA.friendSteps.length - n);
    const hasGen = id => S.board.some(c => c && c.gen === id) || S.pendingGens.includes(id);

    // ---------- B48 resident bonuses ----------
    function bonuses() {
      const out = [];
      ISL.forEach((isl, i) => isl.residents.forEach((r, k) => { if (r.bonus && placeDone(i, k)) out.push(r.bonus); }));
      return out;
    }
    const bsum = (kind, f) => bonuses().filter(b => b.k === kind && (!f || f(b))).reduce((a, b) => a + (b.n || b.p || 0), 0);
    const bonusTxt = b => t('xcB_' + b.k, { n: b.n, p: Math.round((b.p || 0) * 100), gen: b.c ? genNm(b.c) : '' });

    // ---------- B46 finds ----------
    const findNm = f => (isDe() && (I18N.de.finds || {})[f.id]) || f.name;
    function find() {
      const f = DATA.finds[rnd(0, DATA.finds.length - 1)];
      S.finds[f.id] = (S.finds[f.id] || 0) + 1;
      S.ui.album = 1;
      toast(`${f.emoji} ${t('xcFound', { name: findNm(f) })}`);
    }

    wrap('spawn', o => function (g) {
      const gc = S.board[g], key = gc && gc.gen, e0 = S.energy, before = S.board.slice();
      const r = o.apply(this, arguments);
      if (!key || S.energy >= e0) return r;
      const p = bsum('spawnUp', b => b.c === key);
      let dirty = false;
      if (p) S.board.forEach((c, i) => { if (c && !before[i] && c.c === key && c.l < MAX_L && Math.random() < p) { c.l++; seen(c.c, c.l); dirty = true; } });
      if (Math.random() < DATA.findChance) { find(); dirty = true; }
      if (dirty) commit();
      return r;
    });

    wrap('openChest', o => function () {
      const n = bsum('chestItem');
      DATA.chestItems += n;
      try { return o.apply(this, arguments); } finally { DATA.chestItems -= n; }
    });

    // ---------- B15 friendship, B36 guest counts, B47 bottle reward, B48 order bonuses ----------
    function friendPop(k, st, r) {
      const res = resOf(k);
      const line = (res.friend && res.friend[st]) || t('xcFriend').split('|')[st] || '';
      if (!$('modal').hidden) { toast(t('xcFriendStep', { name: res.name, n: st + 1 })); return; }
      openModal(`<div class="welcome"><div class="res-big">${whoHtml('res_' + k)}</div><h2>${t('xcFriendStep', { name: res.name, n: st + 1 })}</h2>
        <p>${hearts(st + 1)}</p><p>"${line}"</p><p class="note">${rewardTxt(r)}</p><button data-xok="1">${t('xcOk')}</button></div>`);
    }
    wrap('finishOrder', o => function (k) {
      const ord = S.orders[k];
      if (!ord) return o.apply(this, arguments);
      const pct = bsum('orderPct');
      if (pct) ord.coins = Math.round(ord.coins * (1 + pct / 100));
      const r = o.apply(this, arguments);
      const en = bsum('orderEnergy');
      if (en) S.energy += en;
      if (ord.bottle && DATA.bottle.reward.joker) grant({ joker: DATA.bottle.reward.joker });
      if (/^res_\d+$/.test(ord.who)) {
        const rk = +ord.who.slice(4), key = S.island + ':' + rk;
        const n = S.friend[key] = (S.friend[key] || 0) + 1;
        const st = DATA.friendSteps.findIndex(s => s.n === n);
        if (st >= 0) { const rw = DATA.friendSteps[st].r; grant(rw); setTimeout(() => friendPop(rk, st, rw), 900); }
      } else S.guests[ord.who] = (S.guests[ord.who] || 0) + 1;
      commit();
      return r;
    });

    // ---------- B18 time-of-day guests, B26/B27 island focus chains ----------
    wrap('makeOrder', o => function () {
      const ord = o.apply(this, arguments);
      if (ord.special) return ord;
      const on = genChains();
      if (/^res_/.test(ord.who)) {
        const h = new Date(now()).getHours(), resK = Math.min(S.zone, DATA.residents.length);
        for (const g of DATA.timeGuests) {
          if (g.island !== S.island || g.res >= resK || h < g.from || h >= g.to) continue;
          if (ord.who !== 'res_' + g.res && Math.random() >= g.p) continue;
          const cs = g.chains.filter(c => on.includes(c));
          if (!cs.length) continue;
          const hi = X.orderLevel(S.level)[1];
          const pf = g.prefer && on.includes(g.prefer.c) && g.prefer.l <= hi ? g.prefer : null;
          ord.who = 'res_' + g.res;
          ord.need = [pf ? { c: pf.c, l: pf.l } : { c: cs[rnd(0, cs.length - 1)], l: ord.need[0].l }];
          ord.got = [false];
          return orderReward(ord);
        }
      }
      const fc = (ISL[S.island].focus || []).filter(c => on.includes(c));
      if (fc.length && Math.random() < DATA.focusShare) {
        ord.need.forEach(x => { if (!fc.includes(x.c)) x.c = fc[rnd(0, fc.length - 1)]; });
        orderReward(ord);
      }
      return ord;
    });

    // ---------- B37 album step coins, B33 event tiers ----------
    wrap('seen', o => function (c, l) {
      const fresh = o.apply(this, arguments);
      if (!fresh) return fresh;
      const ev = (DATA.events || []).find(e => e.id === c);
      if (ev) ev.tiers.filter(x => x.l === l).forEach(x => { grant(x.r); toast(t('xcTier', { name: chainNm(c), r: rewardTxt(x.r) })); });
      else if (DATA.albumStepCoins[l]) {
        const n = DATA.albumStepCoins[l];
        S.coins += n; econ('coins', 'album', n);
        toast(t('xcStep', { name: nm(c, l), c: n }));
      }
      return fresh;
    });

    // ---------- art: emoji for islands without pictures, B32 decoration filter, bottle sender ----------
    const decoOf = (i, k) => DATA.deco[S.deco[i + ':' + k] || 0] || DATA.deco[0];
    wrap('art', o => function (key, emoji) {
      if (key === 'cu_bottle') return '📜';
      const m = /^place_(\d+)$/.exec(key);
      let html;
      if (S.island > 0 && m) html = (DATA.zones[+m[1]] || {}).emoji || emoji;
      else if (S.island > 0 && /^res_\d+$/.test(key)) return emoji;
      else html = o.apply(this, arguments);
      if (m && placeDone(S.island, +m[1])) {
        const f = decoOf(S.island, +m[1]).filter;
        if (f) html = html.startsWith('<img ') ? html.replace('<img ', `<img style="filter:${f}" `) : `<span style="filter:${f}">${html}</span>`;
      }
      return html;
    });

    // ---------- B25 archipelago strip and island SVG, B28 sailing ----------
    function archHtml() {
      return `<div class="xc-arch">${ISL.map((isl, i) => {
        const st = i === S.island ? 'here' : islandOpen(i) ? 'open' : 'lock';
        const label = st === 'here' ? t('xcIslHere') : st === 'lock' ? t('xcIslLock', { name: islName(i - 1) }) : islandDone(i) ? t('xcIslDone') : t('xcIslGo');
        return `<button class="xc-isl ${st}" data-isl="${i}"><span class="xc-mini">${isl.svg || ISLAND_SVG}</span><b>${st === 'lock' ? '🔒 ' : ''}${islName(i)}</b><small>${label}</small></button>`;
      }).join('')}</div>`;
    }
    wrap('openIsland', o => function () {
      const r = o.apply(this, arguments);
      const map = document.querySelector('#modal-body .map');
      if (!map) return r;
      const sv = map.querySelector('svg');
      if (S.island > 0 && sv) sv.outerHTML = ISL[S.island].svg;
      if (S.tut >= 5) map.insertAdjacentHTML('beforebegin', emo(archHtml()));
      return r;
    });
    function sail(i) {
      if (i === S.island || !ISL[i] || !islandOpen(i)) return;
      S.boards[S.island] = { zone: S.zone, tasksDone: S.tasksDone, board: S.board, orders: S.orders };
      const b = S.boards[i];
      delete S.boards[i];
      setIsland(i); S.island = i;
      const n = DATA.cols * S.rows;
      if (b) {
        S.zone = b.zone; S.tasksDone = b.tasksDone; S.orders = b.orders;
        S.board = b.board.slice(0, n).map(validCell);
      } else {
        S.zone = 0; S.tasksDone = []; S.orders = [];
        S.board = new Array(n).fill(null);
        unlockedChains().forEach(k => { const j = nearestEmpty(centerIdx()); if (j >= 0) S.board[j] = { gen: k }; else S.pendingGens.push(k); });
      }
      while (S.board.length < n) S.board.push(null);
      selected = -1;
      eventTick();
      fillOrders();
      toast(t('xcSailed', { name: islName(i) }));
      commit();
      openIsland();
    }

    // Finished island with a next island: point to the map instead of "more islands coming soon".
    wrap('openPlace', o => function () {
      if (DATA.zones[S.zone] || !ISL[S.island + 1]) return o.apply(this, arguments);
      openModal(`<h2>${t('island')}</h2><p>${t('xcNextIsland', { name: islName(S.island + 1) })}</p><button class="back" data-xmap="1">🏝️ ${t('map')}</button>`);
    });

    // ---------- B31 locked place preview ----------
    function preview(k) {
      const z = DATA.zones[k];
      if (!z) return;
      const tot = z.tasks.reduce((a, _, q) => a + taskCost(k, q), 0);
      openModal(`<div class="welcome"><div class="xc-prev"><span class="xc-dark">${art('place_' + k, '🏠')}</span><span class="xc-sil">${whoHtml('res_' + k)}</span></div>
        <h2>🔒 ${zoneNm(k)}</h2><p>${t('xcLockedRes')}</p><p class="note">${t('xcLockedText', { prev: zoneNm(k - 1) })}<br>${t('xcLockedCost', { n: z.tasks.length, c: fmt(tot), g: z.bonusGems })}</p>
        <button data-xmap="1">🏝️ ${t('map')}</button></div>`);
    }

    // ---------- B40 story, B15 friendship, B48 bonus, B32 decoration in the resident window ----------
    let decoArm = '';
    function residentExtra(k, restored) {
      const i = S.island, key = i + ':' + k, place = DATA.zones[k], res = DATA.residents[k];
      let h = '';
      const story = i === 0 && place && place.story ? (isDe() && I18N.de.stories ? I18N.de.stories[k] : place.story) : '';
      if (story) h += `<div class="xc-story"><b>${t('xcStoryH')}</b>${story}</div>`;
      const d = S.friend[key] || 0;
      h += `<p class="xc-line">${hearts(friendLvl(d))} ${t('xcFriendBar', { n: friendLvl(d), d })}</p>`;
      if (res && res.bonus) h += `<p class="xc-line">${t('xcBonus', { b: bonusTxt(res.bonus) })}</p>`;
      if (!restored && placeDone(i, k)) {
        const own = S.decoOwn[key] || [], on = S.deco[key] || 0;
        h += `<h3>${t('xcDecoH')}</h3><p class="note">${t('xcDecoNote')}</p><div class="xc-dgrid">${DATA.deco.map((dv, v) => {
          const lab = v === on ? t('xcDecoOn') : !dv.coins || own.includes(v) ? t('xcDecoUse') : decoArm === key + ':' + v ? t('sure', { c: `🪙 ${fmt(dv.coins)}` }) : `🪙 ${fmt(dv.coins)}`;
          return `<button class="opt ${v === on ? 'on' : ''}" data-deco="${k}:${v}"><span class="xc-dpic" style="filter:${dv.filter || 'none'}">${placeArt(i, k)}</span><b>${t('xcDeco_' + dv.id)}</b><small>${lab}</small></button>`;
        }).join('')}</div>`;
      }
      return h;
    }
    wrap('showResident', o => function (k, restored) {
      const r = o.apply(this, arguments);
      const btn = document.querySelector('#modal-body .welcome #btn-go');
      if (btn) btn.insertAdjacentHTML('beforebegin', emo(residentExtra(k, restored)));
      return r;
    });
    function setDeco(k, v) {
      const key = S.island + ':' + k, dv = DATA.deco[v];
      if (!dv || !placeDone(S.island, k)) return;
      const own = S.decoOwn[key] = S.decoOwn[key] || [];
      if (dv.coins && !own.includes(v)) {
        if (S.coins < dv.coins) { toast(t('noCoinsN', { n: fmt(dv.coins - S.coins) })); sfx('error'); return; }
        if (dv.coins >= X.confirmCoins && decoArm !== key + ':' + v) { decoArm = key + ':' + v; showResident(k, false); return; }
        S.coins -= dv.coins; econ('coins', 'deco', -dv.coins); own.push(v); sfx('buy');
      }
      decoArm = '';
      S.deco[key] = v;
      commit(); showResident(k, false);
    }

    // ---------- B36 guest album, B46 finds page ----------
    let albTab = 'items';
    const tabsHtml = () => `<div class="xc-tabs">${['items', 'guests', 'finds'].map(k => `<button class="opt ${albTab === k ? 'on' : ''}" data-albtab="${k}">${t('xcTab' + k[0].toUpperCase() + k.slice(1))}</button>`).join('')}</div>`;
    function guestsHtml() {
      let h = `<p class="note">${t('xcGuestsNote')}</p>`;
      ISL.forEach((isl, i) => {
        if (!islandOpen(i)) return;
        h += `<h3>${islName(i)}</h3>` + isl.residents.map((r, k) => {
          const met = visited(i) && k <= zoneOf(i), d = S.friend[i + ':' + k] || 0;
          const fav = r.fav ? `<small class="xc-fav">${t('xcFav', { name: nm(r.fav.c, r.fav.l) })} ${icon(r.fav.c, r.fav.l)}</small>` : '';
          return `<div class="xc-g"><span class="xc-face ${met ? '' : 'unk'}">${resFace(i, k)}</span><div><b>${met ? resName(i, k) : t('xcUnknown')}</b>
            ${met ? `<small>${hearts(friendLvl(d))} ${t('xcDelivered', { n: d })}</small>${fav}` : ''}</div></div>`;
        }).join('');
      });
      h += `<h3>${t('xcWalkers')}</h3><div class="xc-walk">${DATA.customers.map(c => {
        const n = S.guests[c] || 0;
        return `<div><span class="xc-face ${n ? '' : 'unk'}"><img src="${src(c)}" alt=""></span><br>${t('xcDelivered', { n })}</div>`;
      }).join('')}</div>`;
      return h;
    }
    const findsHtml = () => `<p class="note">${t('xcFindsNote')}</p><div class="xc-finds">${DATA.finds.map(f => {
      const n = S.finds[f.id] || 0;
      return `<div class="${n ? '' : 'unk'}"><span>${f.emoji}</span>${n ? `${findNm(f)} x${n}` : t('xcUnknown')}</div>`;
    }).join('')}</div>`;
    wrap('openAlbum', o => function () {
      if (albTab === 'items') {
        const r = o.apply(this, arguments);
        const h2 = document.querySelector('#modal-body h2');
        if (h2) h2.insertAdjacentHTML('afterend', tabsHtml());
        return r;
      }
      openModal(`<h2>📖 ${t('albumH')}</h2>${tabsHtml()}${albTab === 'guests' ? guestsHtml() : findsHtml()}`);
    });

    // ---------- B47 message in a bottle ----------
    function bottleCheck() {
      if (S.tut < 5 || S.level < DATA.bottle.minLevel || S.bottleDay === today()) return false;
      const on = genChains();
      if (on.length < DATA.bottle.items) return false;
      const k = S.orders.map((_, q) => q).reverse().find(q => !S.orders[q].special && !S.orders[q].tut && !S.orders[q].got.some(Boolean));
      if (k === undefined) return false;
      const cs = on.slice().sort(() => Math.random() - 0.5).slice(0, DATA.bottle.items);
      const [lo, hi] = X.orderLevel(S.level), minL = S.perm.golden ? 1 : 0;
      const need = cs.map(c => ({ c, l: rnd(Math.max(minL, lo), Math.max(minL, lo, hi - 1)) }));
      S.orders[k] = orderReward({ who: 'cu_bottle', need, got: need.map(() => false), special: { coinMul: 1, gems: 0, chest: DATA.bottle.reward.chest || 0 }, bottle: now() + DATA.bottle.hours * 36e5 });
      S.bottleDay = today();
      toast(t('xcBottle'));
      return true;
    }
    function bottleExpire() {
      const n = S.orders.length;
      S.orders = S.orders.filter(o => !o.bottle || o.bottle > now());
      if (S.orders.length === n) return false;
      fillOrders();
      return true;
    }
    wrap('ordersHtml', o => function () {
      let h = o.apply(this, arguments);
      S.orders.forEach((ord, k) => {
        if (ord.bottle) h = h.replace(`data-k="${k}">`, `data-k="${k}"><em class="xc-bt">📜 ${Math.max(1, Math.ceil((ord.bottle - now()) / 36e5))}${t('unitH')}</em>`);
      });
      return h;
    });

    // ---------- B33 event chains ----------
    function cleanupEvent(e) {
      const bad = c => c && (c.c === e.id || c.gen === e.id || (c.bubble && c.bubble.c === e.id));
      const okOrder = o => !o.need.some(x => x.c === e.id);
      S.board = S.board.map(c => (bad(c) ? null : c));
      S.store = S.store.filter(c => !bad(c)); S.inbox = S.inbox.filter(c => !bad(c));
      S.pendingGens = S.pendingGens.filter(k => k !== e.id);
      S.orders = S.orders.filter(okOrder);
      Object.values(S.boards).forEach(b => { b.board = b.board.map(c => (bad(c) ? null : c)); b.orders = b.orders.filter(okOrder); });
      if (selected >= 0 && !S.board[selected]) selected = -1;
      delete DATA.chains[e.id]; delete I18N.de.chains[e.id];
      fillOrders();
    }
    function eventTick() {
      let dirty = false;
      for (const e of DATA.events || []) {
        const on = evOn(e), reg = !!DATA.chains[e.id];
        if (on && !reg) regEvent(e);
        if (!on && reg) { toast(t('xcEventEnd', { name: chainNm(e.id) })); cleanupEvent(e); dirty = true; continue; }
        if (on && S.tut >= 5 && S.level >= e.minLevel && !hasGen(e.id)) {
          S.pendingGens.push(e.id);
          toast(t('xcEvent', { name: chainNm(e.id), gen: genNm(e.id) }));
          dirty = true;
        }
      }
      return dirty;
    }

    // ---------- clicks inside windows (capture, before game.js handles data-place) ----------
    document.addEventListener('click', e => {
      const el = e.target && e.target.closest && e.target.closest('[data-isl],[data-place],[data-deco],[data-albtab],[data-xmap],[data-xok]');
      if (!el || !$('modal-body').contains(el)) return;
      const d = el.dataset;
      if (d.place !== undefined) {
        if (+d.place <= S.zone) return;
        e.stopPropagation(); preview(+d.place); return;
      }
      e.stopPropagation();
      if (d.isl !== undefined) { const i = +d.isl; if (i === S.island) return; if (!islandOpen(i)) { toast(t('xcIslLock', { name: islName(i - 1) })); sfx('error'); return; } sail(i); }
      if (d.deco !== undefined) { const [k, v] = d.deco.split(':').map(Number); setDeco(k, v); }
      if (d.albtab) { albTab = d.albtab; window.openAlbum(); }
      if (d.xmap) openIsland();
      if (d.xok) closeModal();
    }, true);
    $('btn-island').onclick = () => window.openIsland();
    $('btn-album').onclick = () => { albTab = 'items'; window.openAlbum(); };

    function xcTick() {
      if (document.hidden) return;
      const d = [eventTick(), bottleExpire(), bottleCheck()];
      if (d.some(Boolean)) commit();
    }
    xcTick();
    setInterval(xcTick, 5000);
    window.__content = { sail, preview, bottleCheck, bottleExpire, eventTick, bonuses, find, setDeco, xcTick, get tab() { return albTab; } };
  }
})();
