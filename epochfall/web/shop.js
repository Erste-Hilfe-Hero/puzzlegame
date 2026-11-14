'use strict';
// Tala shop (iOS only, StoreKit 2 via the native "ef" message handler in ios/App/WebView.swift).
// web -> native: ef.postMessage({type: 'products' | 'buy' | 'restore' | 'ack', id})
// native -> web: EFShop.onProducts([{id, price}]), onPurchased(id, txId), onFailed(id, reason), onRestored([{id, txId}]), onStorefront(cc)
// Tala is granted only for a verified transaction reported by native, once per transaction id (ACC.iapTx).
// The page acks each granted transaction so native can finish it; unacked ones are re-sent on the next start.
// No pop-ups, badges or reminders outside the shop view (project rule). Paid purchases are off in BEL / NLD.
(function () {
  const EF = window.EF, H = EF.host;
  const PRE = 'com.nyrathen.epochfall.';
  const PRODUCTS = [
    { id: PRE + 'starter', kind: 'starter', usd: 2.99, tala: 300 },
    { id: PRE + 'moonpass', kind: 'moon', usd: 4.99, tala: 300 },
    { id: PRE + 'tala_60', kind: 'tala', usd: 0.99, tala: 60, base: 60 },
    { id: PRE + 'tala_300', kind: 'tala', usd: 4.99, tala: 330, base: 300 },
    { id: PRE + 'tala_980', kind: 'tala', usd: 14.99, tala: 1090, base: 980 },
    { id: PRE + 'tala_1980', kind: 'tala', usd: 29.99, tala: 2240, base: 1980 },
    { id: PRE + 'tala_3280', kind: 'tala', usd: 49.99, tala: 3880, base: 3280 },
    { id: PRE + 'tala_6480', kind: 'tala', usd: 99.99, tala: 8080, base: 6480 }
  ];
  const STARTER_COS = 'pat_tala', MOON_DAYS = 30, MOON_DAILY = 90;
  const LOCKED = ['BEL', 'NLD', 'BE', 'NL'];
  const handler = () => window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ef;
  const st = { prices: {}, loaded: false, busy: null, msg: '', open: false };

  function acc() {
    const A = EF.acc;
    if (!Array.isArray(A.iapTx)) A.iapTx = [];
    if (A.starter === undefined) A.starter = false;
    if (A.moon === undefined) A.moon = null;
    if (A.sf === undefined) A.sf = '';
    return A;
  }
  function post(o) { const h = handler(); if (h) h.postMessage(o); }
  function prod(id) { return PRODUCTS.find(p => p.id === id); }
  function locked() { return LOCKED.includes(String(acc().sf).toUpperCase()); }
  const tt = (k, ...a) => H.t(k, ...a);
  const esc = x => String(x).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');

  // local calendar dates as YYYY-MM-DD; now() is replaceable for tests
  function dstr(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function addDays(s, n) { const [y, m, d] = s.split('-').map(Number); return dstr(new Date(y, m - 1, d + n)); }
  function dayDiff(a, b) { const p = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((p(b) - p(a)) / 864e5); }
  const today = () => dstr(api.now());

  function moonLeft() { const m = acc().moon, d = today(); return m && d <= m.until ? dayDiff(d, m.until) + 1 : 0; }
  // 90 Tala once per calendar day while the pass runs; missed days are not paid out later
  function claimMoon() {
    const A = acc(), m = A.moon, d = today();
    if (!m || d > m.until || m.last === d) return 0;
    m.last = d; H.addTala(MOON_DAILY);
    if (!H.menuOpen) H.toast(tt('moonToast', MOON_DAILY), 3);
    return MOON_DAILY;
  }

  function grant(p) {
    const A = acc();
    A.tala += p.tala;
    if (p.kind === 'starter') { A.starter = true; A.cos[STARTER_COS] = Math.max(1, A.cos[STARTER_COS] || 0); }
    if (p.kind === 'moon') {
      const d = today();
      A.moon = A.moon && A.moon.until >= d ? { until: addDays(A.moon.until, MOON_DAYS), last: A.moon.last } : { until: addDays(d, MOON_DAYS - 1), last: '' };
    }
    H.saveAcc();
    if (p.kind === 'moon') claimMoon();
  }

  function refresh() { if (H.menuOpen && H.tab === 'summon') H.renderMenu(); }

  function shopHTML() {
    const A = acc(), bridge = !!handler(), lock = locked(), ml = moonLeft();
    let h = `<div class="shop"><div class="sh-head"><button type="button" class="ghost" data-shop-back>${tt('shopBack')}</button>` +
      `<span class="sh-title">${tt('shopTitle')}</span><span class="sh-bal">${tt('tala')} <b id="shop-tala">${A.tala}</b></span></div>`;
    if (!bridge) h += `<p class="sh-info" id="shop-state">${tt('shopIosOnly')}</p>`;
    else if (lock) h += `<p class="sh-info" id="shop-state">${tt('shopRegion')}</p>`;
    if (st.msg) h += `<p class="sh-msg" id="shop-msg">${esc(st.msg)}</p>`;
    if (ml) h += `<p class="sh-moon">${tt('moonActive', ml)}</p>`;
    h += '<div class="sh-grid">';
    for (const p of PRODUCTS) {
      const key = p.id.slice(PRE.length), owned = p.kind === 'starter' && A.starter;
      let label, can = false;
      if (!bridge) label = tt('shopIosOnly');
      else if (owned) label = tt('shopOwned');
      else if (lock) label = tt('shopLocked');
      else if (st.busy === p.id) label = tt('shopBusy');
      else if (st.prices[p.id]) { label = esc(st.prices[p.id]); can = !st.busy; }
      else label = st.loaded ? tt('shopUnavail') : tt('shopLoading');
      const name = p.kind === 'tala' ? tt('p_tala', p.tala) : tt('p_' + key);
      const sub = p.kind === 'tala' ? (p.tala > p.base ? `${p.base} + ${tt('shopBonus', p.tala - p.base)}` : '') : tt('pd_' + key, p.tala, MOON_DAILY, MOON_DAYS);
      h += `<div class="sh-card ${p.kind}${owned ? ' owned' : ''}" data-pid="${p.id}"><span class="nm">${name}</span>${sub ? `<span class="ds">${sub}</span>` : ''}` +
        `<button type="button" data-buy="${p.id}" ${can ? '' : 'disabled'}>${label}</button></div>`;
    }
    h += `</div><div class="sh-foot"><button type="button" class="ghost" data-restore ${bridge && !st.busy ? '' : 'disabled'}>${tt('shopRestore')}</button>` +
      `<p class="eco-hint">${tt('shopRules')}</p></div></div>`;
    return h;
  }

  const api = {
    now: () => new Date(),
    products: PRODUCTS,
    get state() { return st; },
    get bridge() { return !!handler(); },
    get locked() { return locked(); },
    claimMoon,
    moonLeft,
    open(v) { st.open = v !== false; if (!v) st.msg = ''; refresh(); },
    // called by game.js after it rendered the Summon tab
    summonTab(root) {
      if (claimMoon()) { H.renderMenu(); return; }
      if (st.open) {
        root.innerHTML = shopHTML();
        root.querySelector('[data-shop-back]').addEventListener('click', () => api.open(false));
        root.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => api.buy(b.dataset.buy)));
        root.querySelector('[data-restore]').addEventListener('click', () => api.restore());
        return;
      }
      const g = root.querySelector('.gacha'), top = g && g.querySelector('.g-top'), btns = g && g.querySelector('.g-btns');
      if (!g) return;
      const note = document.createElement('p');
      note.className = 'g-note'; note.id = 'g-note'; note.textContent = tt('gachaNote');
      top.after(note);
      const sb = document.createElement('button');
      sb.type = 'button'; sb.className = 'ghost'; sb.dataset.shop = '1'; sb.textContent = tt('shop');
      sb.addEventListener('click', () => api.open(true));
      btns.appendChild(sb);
    },
    buy(id) {
      const p = prod(id);
      if (!p || !handler() || locked() || st.busy || (p.kind === 'starter' && acc().starter) || !st.prices[id]) return false;
      st.busy = id; st.msg = ''; post({ type: 'buy', id }); refresh();
      return true;
    },
    restore() {
      if (!handler() || st.busy) return false;
      st.busy = 'restore'; st.msg = ''; post({ type: 'restore' }); refresh();
      return true;
    },
    onProducts(list) {
      st.loaded = true;
      for (const it of list || []) if (it && prod(it.id)) st.prices[it.id] = String(it.price || '');
      refresh();
    },
    onStorefront(cc) { acc().sf = String(cc || ''); H.saveAcc(); refresh(); },
    onPurchased(id, txId) {
      const A = acc(), p = prod(id), tx = String(txId);
      if (st.busy === id) st.busy = null;
      if (!p) { refresh(); return false; }
      if (A.iapTx.includes(tx)) { post({ type: 'ack', id: tx }); refresh(); return false; }
      A.iapTx.push(tx);
      // the Starter Pack pays out once per account, even if StoreKit re-sends its entitlement after a restore
      if (p.kind === 'starter' && A.starter) { H.saveAcc(); post({ type: 'ack', id: tx }); refresh(); return false; }
      grant(p);
      post({ type: 'ack', id: tx });
      st.msg = p.kind === 'starter' ? tt('shopGotStarter', p.tala, H.t('g_' + STARTER_COS)) : p.kind === 'moon' ? tt('shopGotMoon', p.tala) : tt('shopGot', p.tala);
      refresh();
      return true;
    },
    onFailed(id, reason) {
      if (st.busy === id || st.busy === 'restore') st.busy = null;
      const r = String(reason || '');
      st.msg = r === 'cancelled' ? tt('shopCancelled') : r === 'pending' ? tt('shopPending') : r === 'region' ? tt('shopRegion') : tt('shopFailed');
      refresh();
    },
    // non-consumable entitlements (Transaction.currentEntitlements): the Starter Pack cosmetic comes back, its Tala do not
    onRestored(list) {
      const A = acc(), got = [];
      if (st.busy === 'restore') st.busy = null;
      for (const it of list || []) {
        const id = typeof it === 'string' ? it : it && it.id;
        if (id === PRE + 'starter') { A.starter = true; A.cos[STARTER_COS] = Math.max(1, A.cos[STARTER_COS] || 0); got.push(tt('p_starter')); }
      }
      H.saveAcc();
      st.msg = got.length ? tt('shopRestored', got.join(', ')) : tt('shopNothing');
      refresh();
    }
  };
  window.EFShop = api;

  acc();
  claimMoon();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && claimMoon()) refresh(); });
  post({ type: 'products' });
})();
