'use strict';
// Design layer (plan area C): extra art, animation, sound, music, haptics, motion and focus.
// Loaded after game.js; hooks in by wrapping global functions, game.js stays unchanged.
(function () {
  const XT = {
    en: { music: 'Music', effects: 'Sound effects', haptics: 'Vibration', motion: 'Animations', full: 'Full', reduced: 'Reduced', day: 'Day', min: 'min', h: 'h', level: 'Level', settings: 'Settings', close: 'Close', skip: 'Tap to continue', loading: 'Loading...', deviceLang: 'Device language', volume: 'Volume' },
    de: { music: 'Musik', effects: 'Soundeffekte', haptics: 'Vibration', motion: 'Animationen', full: 'Voll', reduced: 'Reduziert', day: 'Tag', min: 'Min.', h: 'Std.', level: 'Level', settings: 'Einstellungen', close: 'Schließen', skip: 'Tippen zum Weiter', loading: 'Lädt...', deviceLang: 'Gerätesprache', volume: 'Lautstärke' }
  };
  const X = k => (XT[P.lang] || XT.en)[k];
  const has = n => typeof window[n] === 'function';
  const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem('amy-design-' + k)); localStorage.setItem('amy-design-' + k, JSON.stringify(v)); } catch (e) { return null; } };

  // ---------- art: perk icons, gem packs, guests 5-8 ----------
  const NEW_ART = ['gs_autoMerge', 'gs_double', 'gs_bigBoard', 'gs_orderSlot', 'gs_golden', 'gs_fountain', 'gs_lucky', 'gs_starter', 'gs_pass', 'cu_4', 'cu_5', 'cu_6', 'cu_7'];
  NEW_ART.forEach(k => { if (!DATA.art.includes(k)) DATA.art.push(k); if (typeof ART !== 'undefined') ART.add(k); });
  ['cu_4', 'cu_5', 'cu_6', 'cu_7'].forEach(k => { if (!DATA.customers.includes(k)) DATA.customers.push(k); });

  // ---------- prefs: separate music / effects, vibration, motion ----------
  if (P.sfx === undefined) P.sfx = P.sound !== false;
  if (P.music === undefined) P.music = P.sound !== false;
  // I43: volume 0-100 per bus instead of on/off; vibration uses the game's own switch (P.haptic).
  if (P.musicVol === undefined) P.musicVol = P.music ? 100 : 0;
  if (P.sfxVol === undefined) P.sfxVol = P.sfx ? 100 : 0;
  const MUS_GAIN = 0.4;
  if (P.motion === undefined) P.motion = 'full';
  const mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const xRM = () => P.motion === 'reduced' || !!(mq && mq.matches);
  function applyPrefs() {
    P.sound = P.sfx;
    document.body.classList.toggle('rm', xRM());
    $('btn-settings').setAttribute('aria-label', X('settings'));
    $('modal-close').setAttribute('aria-label', X('close'));
    P.music = P.musicVol > 0; P.sfx = P.sfxVol > 0; P.sound = P.sfx;
    if (musBus) musBus.gain.value = MUS_GAIN * P.musicVol / 100;
    if (sfxBus) sfxBus.gain.value = P.sfxVol / 100;
    if (P.music) startMusic(); else stopMusic();
  }

  // ---------- audio: samples rendered once at startup, oscillator stays as fallback ----------
  let XA = null, sfxBus = null, musBus = null;
  const BUF = {};
  function actx() {
    if (XA) return XA;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    XA = new C();
    sfxBus = XA.createGain(); sfxBus.gain.value = P.sfxVol / 100; sfxBus.connect(XA.destination);
    musBus = XA.createGain(); musBus.gain.value = MUS_GAIN * P.musicVol / 100; musBus.connect(XA.destination);
    try { AC = XA; } catch (e) { /* game.js without AC */ }
    buildSamples();
    return XA;
  }
  function tone(c, out, f, t0, dur, o = {}) {
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + (o.glide || dur));
    const v = o.v || 0.2, a = o.a || 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(out); osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  function bell(c, out, f, t0, v = 0.16, dur = 0.6) {
    tone(c, out, f, t0, dur, { v });
    tone(c, out, f * 2.01, t0, dur * 0.5, { v: v * 0.35 });
    tone(c, out, f * 3.98, t0, dur * 0.25, { v: v * 0.12 });
  }
  function mallet(c, out, f, t0, v = 0.2) {
    tone(c, out, f, t0, 0.35, { v });
    tone(c, out, f * 4, t0, 0.06, { v: v * 0.25 });
  }
  function noise(c, out, t0, dur, o = {}) {
    const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    let s = 7;
    for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; }
    const src = c.createBufferSource(); src.buffer = b;
    const flt = c.createBiquadFilter(); flt.type = o.type || 'bandpass'; flt.Q.value = o.q || 1;
    flt.frequency.setValueAtTime(o.f || 2000, t0);
    if (o.to) flt.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    const g = c.createGain(); g.gain.setValueAtTime(o.v || 0.2, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(flt).connect(g).connect(out); src.start(t0);
  }
  const RECIPES = {
    spawn: [0.25, (c, o) => { tone(c, o, 420, 0, 0.16, { to: 900, glide: 0.07, v: 0.22 }); noise(c, o, 0, 0.04, { f: 3000, v: 0.08 }); }],
    merge: [0.7, (c, o) => { mallet(c, o, 523, 0, 0.22); mallet(c, o, 784, 0.07, 0.22); bell(c, o, 1568, 0.12, 0.06, 0.5); }],
    deliver: [0.9, (c, o) => { [784, 1046, 1318].forEach((f, k) => bell(c, o, f, k * 0.07, 0.13, 0.6)); noise(c, o, 0.05, 0.4, { f: 7000, q: 0.7, v: 0.04 }); }],
    level: [1.3, (c, o) => { [523, 659, 784, 1046].forEach((f, k) => mallet(c, o, f, k * 0.09, 0.2)); [1046, 1318, 1568].forEach(f => bell(c, o, f, 0.4, 0.07, 0.9)); }],
    error: [0.35, (c, o) => { tone(c, o, 220, 0, 0.22, { type: 'triangle', to: 140, v: 0.2 }); tone(c, o, 165, 0.09, 0.2, { type: 'triangle', to: 110, v: 0.15 }); }],
    buy: [0.6, (c, o) => { bell(c, o, 988, 0, 0.13, 0.45); bell(c, o, 1318, 0.08, 0.13, 0.5); noise(c, o, 0, 0.3, { f: 8000, q: 0.8, v: 0.04 }); }],
    chest: [1.0, (c, o) => { noise(c, o, 0, 0.22, { f: 400, to: 1400, q: 4, v: 0.18 }); [659, 880, 1175].forEach((f, k) => bell(c, o, f, 0.2 + k * 0.12, 0.12, 0.5)); }],
    pop: [0.3, (c, o) => { tone(c, o, 1200, 0, 0.12, { to: 300, glide: 0.1, v: 0.2 }); noise(c, o, 0, 0.06, { f: 2500, v: 0.12 }); }],
    sell: [0.5, (c, o) => { bell(c, o, 2093, 0, 0.1, 0.3); bell(c, o, 2637, 0.06, 0.1, 0.35); }],
    swap: [0.25, (c, o) => { noise(c, o, 0, 0.16, { f: 600, to: 2400, q: 1.5, v: 0.12 }); }],
    hammer: [0.5, (c, o) => { [0, 0.15].forEach(t0 => { noise(c, o, t0, 0.07, { type: 'lowpass', f: 900, v: 0.35 }); tone(c, o, 200, t0, 0.1, { type: 'triangle', to: 120, v: 0.2 }); }); }],
    album: [0.9, (c, o) => { noise(c, o, 0, 0.18, { f: 3000, to: 800, q: 0.8, v: 0.08 }); [784, 988, 1175].forEach(f => bell(c, o, f, 0.15, 0.09, 0.7)); }],
    gems: [0.6, (c, o) => { [1760, 2217, 2637].forEach((f, k) => bell(c, o, f, k * 0.05, 0.08, 0.4)); }]
  };
  function buildSamples() {
    const O = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!O) return;
    for (const [k, [dur, fn]] of Object.entries(RECIPES)) {
      try {
        const c = new O(1, Math.ceil(44100 * dur), 44100);
        fn(c, c.destination);
        const pr = c.startRendering();
        if (pr && pr.then) pr.then(b => { BUF[k] = b; }); else c.oncomplete = e => { BUF[k] = e.renderedBuffer; };
      } catch (e) { /* fallback to oscillator */ }
    }
  }
  function play(k, rate) {
    const s = XA.createBufferSource(); s.buffer = BUF[k]; s.playbackRate.value = rate || 1;
    s.connect(sfxBus); s.start();
  }
  // Android/browser vibrate through game.js buzz(); WKWebView has no navigator.vibrate, so iOS gets a native haptic.
  function haptic(kind) {
    if (P.haptic === false) return;
    try {
      const wk = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.haptic;
      if (wk) wk.postMessage(kind);
    } catch (e) { /* no haptics */ }
  }
  let remap = null, mergeLevel = null;
  const withMap = (m, fn) => { const old = remap; remap = m; try { return fn(); } finally { remap = old; } };
  const oSfx = window.sfx;
  window.sfx = function (kind) {
    if (remap && remap[kind]) kind = remap[kind];
    if (kind === 'merge' || kind === 'deliver') haptic(kind);
    if (!P.sfx) return;
    const c = actx();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    let rate = 1;
    if (kind === 'merge' && mergeLevel !== null) { rate = Math.pow(2, mergeLevel / 12); }
    mergeLevel = null;
    if (BUF[kind]) play(kind, rate);
    else if (RECIPES[kind] && ['spawn', 'merge', 'deliver', 'level', 'error', 'buy'].includes(kind)) { const s = P.sound; P.sound = true; oSfx(kind); P.sound = s; }
  };

  // ---------- music: two generated calm loops (board, island) ----------
  const MUS = {
    board: { bpm: 92, chords: [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]], arp: [0, 1, 2, 4, 2, 1, 0, 1] },
    map: { bpm: 74, chords: [[41, 45, 48], [38, 41, 45], [46, 50, 53], [48, 52, 55]], arp: [0, 2, 4, 2, 1, 3, 2, 1] }
  };
  const mf = n => 440 * Math.pow(2, (n - 69) / 12);
  let musT = 0, musStep = 0, musNext = 0, mood = 'board';
  function musNote(f, t0, dur, v, type) {
    const o = XA.createOscillator(), g = XA.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(musBus); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function musTick() {
    if (!XA || XA.state !== 'running' || !P.music || document.hidden) return;
    const m = MUS[mood], step = 60 / m.bpm / 2;
    if (musNext < XA.currentTime) musNext = XA.currentTime + 0.05;
    while (musNext < XA.currentTime + 0.4) {
      const bar = Math.floor(musStep / 8) % 8, ch = m.chords[Math.floor(bar / 2)], i = musStep % 8;
      const notes = [...ch, ch[0] + 12, ch[1] + 12];
      musNote(mf(notes[m.arp[i]] + 24), musNext, mood === 'map' ? 0.9 : 0.45, 0.05);
      if (mood === 'map' && i % 4 === 0) musNote(mf(notes[(i + bar) % 5] + 36), musNext, 1.2, 0.025);
      if (i === 0 || i === 4) musNote(mf(ch[0] - (i ? 5 : 12) + 12), musNext, step * 3.5, 0.08, 'triangle');
      musNext += step; musStep = (musStep + 1) % 64;
    }
  }
  function startMusic() { if (!musT && XA) musT = setInterval(musTick, 150); }
  function stopMusic() { clearInterval(musT); musT = 0; }
  function setMood() {
    const open = !$('modal').hidden && document.querySelector('#modal-body .map, #modal-body .place-top');
    const m = open ? 'map' : 'board';
    if (m !== mood) { mood = m; musStep = 0; }
  }
  // iOS / WKWebView: the AudioContext only plays after a gesture.
  function unlock() {
    const c = actx();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0);
    if (P.music) startMusic();
    window.removeEventListener('pointerdown', unlock, true); window.removeEventListener('touchend', unlock, true);
  }
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('touchend', unlock, true);
  document.addEventListener('visibilitychange', () => {
    if (!XA) return;
    if (document.hidden) { stopMusic(); XA.suspend(); } else { XA.resume(); if (P.music) startMusic(); }
  });

  // ---------- motion helpers ----------
  const cellEl = i => $('board').children[i];
  function retrigger(el, cls, ms) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); }
  function flyImg(srcUrl, x0, y0, x1, y1, ms, size, onEnd, delay = 0) {
    const f = document.createElement('img'); f.className = 'xfly'; f.src = srcUrl; f.alt = '';
    f.style.cssText = `left:${x0 - size / 2}px;top:${y0 - size / 2}px;width:${size}px;height:${size}px;transition:transform ${ms}ms cubic-bezier(.3,.7,.4,1) ${delay}ms, opacity ${ms}ms ${delay}ms`;
    document.body.appendChild(f);
    requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transform = `translate(${x1 - x0}px, ${y1 - y0}px)`; }));
    setTimeout(() => { f.remove(); if (onEnd) onEnd(); }, ms + delay + 30);
    return f;
  }
  const imgOf = i => { const el = cellEl(i); const im = el && el.querySelector('img'); return im ? im.src : null; };

  // C17 C19 C21: spawn flies out of the generator, squash on tap, shake on failure
  if (has('spawn')) {
    const oSpawn = window.spawn;
    window.spawn = function (g) {
      const before = S.board.slice();
      const r = oSpawn.apply(this, arguments);
      const fresh = []; S.board.forEach((c, i) => { if (c && !before[i]) fresh.push(i); });
      const gc = cellEl(g);
      retrigger(gc, fresh.length ? 'squash' : 'shake', fresh.length ? 200 : 280);
      if (gc && !xRM()) {
        const [x0, y0] = center(gc);
        fresh.forEach((i, n) => {
          const el = cellEl(i), u = imgOf(i); if (!el || !u) return;
          const [x1, y1] = center(el), sz = el.offsetWidth * 0.8;
          el.classList.add('incoming');
          flyImg(u, x0, y0, x1, y1, 220, sz, () => { el.classList.remove('incoming'); retrigger(el, 'pop', 400); }, n * 60);
        });
      }
      return r;
    };
  }

  // C16 C20 C38 C39: drag target hint, merge glides into the cell, pitch rises, swap sound
  let lastUp = null, glide = false;
  const board = $('board');
  const canMerge = (a, b) => a && b && ((a.joker && b.c && b.l < MAX_L) || (a.c && b.c && a.c === b.c && a.l === b.l && a.l < MAX_L));
  function clearTgt() { board.querySelectorAll('.tgt-merge, .tgt-swap').forEach(e => e.classList.remove('tgt-merge', 'tgt-swap')); }
  board.addEventListener('pointermove', e => {
    if (typeof drag === 'undefined' || !drag || !drag.moving) return;
    const t = cellAt(e.clientX, e.clientY);
    clearTgt();
    if (t < 0 || t === drag.i) return;
    const el = cellEl(t); if (!el) return;
    el.classList.add(canMerge(S.board[drag.i], S.board[t]) ? 'tgt-merge' : 'tgt-swap');
  });
  board.addEventListener('pointerup', e => { lastUp = { x: e.clientX, y: e.clientY, t: performance.now() }; clearTgt(); }, true);
  board.addEventListener('pointercancel', clearTgt);
  if (has('drop')) {
    const oDrop = window.drop;
    window.drop = function (from, to) {
      if (glide) return;
      const a = S.board[from], b = S.board[to];
      const user = lastUp && performance.now() - lastUp.t < 60;
      if (from === to || to < 0 || !a) return oDrop.apply(this, arguments);
      if (!canMerge(a, b)) {
        const r = oDrop.apply(this, arguments);
        if (user) sfx('swap');
        return r;
      }
      const go = () => { mergeLevel = a.joker ? b.l + 1 : a.l + 1; return oDrop(from, to); };
      const u = imgOf(from), src0 = cellEl(from), dst = cellEl(to);
      if (!user || xRM() || !u || !dst) return go();
      glide = true;
      src0.classList.add('lift');
      const [x1, y1] = center(dst);
      flyImg(u, lastUp.x, lastUp.y, x1, y1, 150, 60, () => {
        glide = false; src0.classList.remove('lift');
        if (canMerge(S.board[from], S.board[to])) go(); else render();
      });
    };
  }

  // C18 C32: delivered items fly to the card, the card lifts away
  if (has('deliver')) {
    const oDeliver = window.deliver;
    window.deliver = function (k) {
      const o = S.orders[k], card = $('orders').children[k];
      // findItems(o) returns parts { b: cell } / { s: slot } / { got } (A32/A41); only board cells can fly.
      const parts = o && findItems(o);
      const cells = parts && parts.filter(p => p.b !== undefined).map(p => p.b);
      if (cells && card && !xRM()) {
        const [x1, y1] = center(card);
        cells.forEach((i, n) => { const el = cellEl(i), u = imgOf(i); if (el && u) { const [x0, y0] = center(el); flyImg(u, x0, y0, x1, y1, 320, el.offsetWidth * 0.8, null, n * 60); } });
        const r = card.getBoundingClientRect(), g = card.cloneNode(true);
        g.classList.add('order-leave'); g.classList.remove('ready');
        g.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0`;
        setTimeout(() => { document.body.appendChild(g); setTimeout(() => g.remove(), 500); }, 260);
      }
      return oDeliver.apply(this, arguments);
    };
  }

  // C23 C39: chest opens, items pop out one after another
  if (has('openChest')) {
    const oChest = window.openChest;
    window.openChest = function (i) {
      const before = S.board.slice(), el = cellEl(i), u = imgOf(i);
      const rect = el && el.getBoundingClientRect();
      const r = withMap({ deliver: 'chest' }, () => oChest.apply(this, arguments));
      if (xRM() || !rect || !u) return r;
      const lid = document.createElement('img'); lid.className = 'chest-open'; lid.src = u; lid.alt = '';
      lid.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px`;
      document.body.appendChild(lid); setTimeout(() => lid.remove(), 520);
      const [x0, y0] = center(el);
      const fresh = []; S.board.forEach((c, j) => { if (c && (j === i || !before[j]) && c.c) fresh.push(j); });
      fresh.forEach((j, n) => {
        const t = cellEl(j), uu = imgOf(j); if (!t || !uu) return;
        t.classList.add('incoming');
        const [x1, y1] = center(t);
        flyImg(uu, x0, y0, x1, y1, 260, t.offsetWidth * 0.8, () => { t.classList.remove('incoming'); retrigger(t, 'pop', 400); }, 180 + n * 120);
      });
      return r;
    };
  }

  // C39: own sounds for sell, task, album, gem spending
  const wrapSfx = (name, map) => { if (!has(name)) return; const o = window[name]; window[name] = function () { return withMap(map, () => o.apply(this, arguments)); }; };
  wrapSfx('doTask', { buy: 'hammer' });
  wrapSfx('claimAlbum', { level: 'album' });
  wrapSfx('buyGem', { buy: 'gems' });
  if (has('sell')) {
    const oSell = window.sell;
    window.sell = function () { const c = S.board[selected]; const r = oSell.apply(this, arguments); if (c && !c.gen) sfx('sell'); return r; };
    $('btn-sell').onclick = window.sell;
  }

  // C9 C35: gem pack art and shop card types
  let priceAsk = 0;
  if (has('openShop')) {
    const oShop = window.openShop;
    window.openShop = function () {
      const r = oShop.apply(this, arguments);
      const body = $('modal-body');
      body.querySelectorAll('[data-money]').forEach(b => {
        const row = b.closest('.prod'), k = DATA.money.findIndex(p => p.id === b.dataset.money);
        if (!row) return;
        if (k < 0) { row.classList.add('k-offer'); return; }
        row.classList.add('k-gems');
        const pi = row.querySelector('.pi'); if (pi) pi.innerHTML = `<img src="${src('gem_' + Math.min(5, k))}" alt="">`;
      });
      // I12: store buttons stay off and say "Loading..." until the store sent prices.
      if (typeof NATIVE !== 'undefined' && NATIVE) {
        let wait = false;
        body.querySelectorAll('[data-money]').forEach(b => {
          if (nativePrices[b.dataset.money]) return;
          b.disabled = true; b.classList.add('wait'); b.textContent = X('loading'); wait = true;
        });
        if (wait && Date.now() - priceAsk > 5000) { priceAsk = Date.now(); try { NATIVE.requestPrices(); } catch (e) { /* bridge gone */ } }
      }
      body.querySelectorAll('[data-gem]').forEach(b => {
        const g = DATA.gemShop.find(x => x.id === b.dataset.gem), row = b.closest('.prod');
        if (g && row) row.classList.add('k-' + g.kind);
      });
      return r;
    };
    $('btn-shop').onclick = window.openShop;
    $('res-gems').onclick = window.openShop;
  }

  // C40 C41 C44 + motion switch in settings
  if (has('openSettings')) {
    const oSet = window.openSettings;
    window.openSettings = function () {
      const r = oSet.apply(this, arguments);
      const old = document.querySelector('#modal-body [data-pref="sound"]');
      const opts = old && old.closest('.opts');
      if (opts) {
        const o = (k, v, label) => `<button class="opt ${P[k] === v ? 'on' : ''}" data-xpref="${k}" data-val="${v}">${label}</button>`;
        const row = (h, k, a, b, la, lb) => `<h3>${h}</h3><div class="opts">${o(k, a, la)}${o(k, b, lb)}</div>`;
        const vol = (h, k) => `<h3>${h}</h3><div class="opts vol"><input type="range" min="0" max="100" step="10" value="${P[k]}" data-xvol="${k}" aria-label="${h} ${X('volume')}"><output>${P[k]}%</output></div>`;
        const h3 = opts.previousElementSibling;
        if (h3 && h3.tagName === 'H3') h3.remove();
        opts.outerHTML = vol(X('music'), 'musicVol') + vol(X('effects'), 'sfxVol') + row(X('motion'), 'motion', 'full', 'reduced', X('full'), X('reduced'));
      }
      // I50: "Device language" next to the fixed languages
      const lo = document.querySelector('#modal-body [data-pref="lang"]');
      const lopts = lo && lo.closest('.opts');
      if (lopts) {
        if (P.langAuto) lopts.querySelectorAll('.on').forEach(b => b.classList.remove('on'));
        lopts.insertAdjacentHTML('afterbegin', `<button class="opt ${P.langAuto ? 'on' : ''}" data-xlang="auto">${X('deviceLang')}</button>`);
      }
      return r;
    };
    $('btn-settings').onclick = window.openSettings;
  }
  $('modal-body').addEventListener('input', e => {
    const r = e.target.closest('[data-xvol]');
    if (!r) return;
    P[r.dataset.xvol] = +r.value;
    const out = r.nextElementSibling; if (out) out.textContent = r.value + '%';
    applyPrefs();
  });
  $('modal-body').addEventListener('change', e => {
    if (!e.target.closest('[data-xvol]')) return;
    savePrefs(); if (e.target.dataset.xvol === 'sfxVol') sfx('merge');
  });
  // I50: a fixed language choice switches device language off (runs before game.js handles data-pref/data-wlang).
  $('modal-body').addEventListener('click', e => {
    if (e.target.closest('[data-pref="lang"], [data-wlang]')) P.langAuto = false;
  }, true);
  $('modal-body').addEventListener('click', e => {
    if (e.target.closest('[data-xlang]')) { P.langAuto = true; followDevice(true); openSettings(); sfx('spawn'); }
  });
  $('modal-body').addEventListener('click', e => {
    const b = e.target.closest('[data-xpref]');
    if (!b) return;
    const k = b.dataset.xpref, v = b.dataset.val;
    P[k] = v === 'true' ? true : v === 'false' ? false : v;
    savePrefs(); applyPrefs(); openSettings(); sfx('spawn');
  });

  // C29: route on the island map grows to the current place
  const route = pts => pts.map((p, k) => {
    if (!k) return `M${p[0]} ${p[1]}`;
    const a = pts[k - 1], mx = (a[0] + p[0]) / 2;
    return `C${mx + (p[1] - a[1]) * 0.25} ${a[1]} ${mx - (p[1] - a[1]) * 0.25} ${p[1]} ${p[0]} ${p[1]}`;
  }).join(' ');
  if (has('openIsland')) {
    const oIsl = window.openIsland;
    window.openIsland = function () {
      const r = oIsl.apply(this, arguments);
      const map = document.querySelector('#modal-body .map');
      if (map) {
        const pins = DATA.mapPins, z = Math.min(S.zone, pins.length - 1), seenZ = store('mapzone');
        const grow = seenZ !== null && seenZ < z && !xRM();
        const doneTo = grow ? Math.max(0, z - 1) : z;
        const svg = `<svg class="route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="${route(pins)}" class="r-all"/>${doneTo > 0 ? `<path d="${route(pins.slice(0, doneTo + 1))}" class="r-done"/>` : ''}
          ${grow ? `<path d="${route(pins.slice(z - 1, z + 1))}" class="r-done r-grow" pathLength="1"/>` : ''}</svg>`;
        map.querySelector('svg').insertAdjacentHTML('afterend', svg);
        store('mapzone', z);
      }
      return r;
    };
    $('btn-island').onclick = window.openIsland;
  }

  // C31: album silhouettes show a ?, new entries reveal once
  if (has('openAlbum')) {
    const oAlb = window.openAlbum;
    window.openAlbum = function () {
      const r = oAlb.apply(this, arguments);
      const known = store('album'), now2 = Object.keys(S.seen || {});
      if (known && !xRM()) {
        const chains = Object.keys(DATA.chains);
        document.querySelectorAll('#modal-body .alb').forEach((row, ci) => {
          row.querySelectorAll('div > span').forEach((sp, l) => { const k = chains[ci] + '_' + l; if ((S.seen || {})[k] && !known.includes(k)) { sp.classList.add('reveal'); sp.style.animationDelay = (l * 80) + 'ms'; } });
        });
      }
      store('album', now2);
      return r;
    };
    $('btn-album').onclick = window.openAlbum;
  }

  // I39: dialog focus in and back, Escape closes
  let lastFocus = null;
  if (has('openModal')) {
    const oOpen = window.openModal;
    window.openModal = function () {
      if ($('modal').hidden) lastFocus = document.activeElement;
      const r = oOpen.apply(this, arguments);
      const f = $('modal-body').querySelector('button:not([disabled])') || $('modal-close');
      try { f.focus({ preventScroll: true }); } catch (e) { /* old webview */ }
      setMood();
      return r;
    };
  }
  if (has('closeModal')) {
    const oClose = window.closeModal;
    window.closeModal = function () {
      const r = oClose.apply(this, arguments);
      if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* old webview */ }
      setMood();
      return r;
    };
    $('modal-close').onclick = window.closeModal;
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('modal').hidden) closeModal(); });

  // ---------- after every render ----------
  const roll = {};
  let rollRaf = 0;
  function rollStep() {
    rollRaf = 0;
    const tm = performance.now();
    for (const id in roll) {
      const r = roll[id];
      if (r.cur === r.to) continue;
      const p = Math.min(1, (tm - r.t0) / 400), e = 1 - Math.pow(1 - p, 3);
      r.cur = p >= 1 ? r.to : Math.round(r.from + (r.to - r.from) * e);
      $(id).textContent = r.cur + r.rest;
      if (r.cur !== r.to) rollRaf = rollRaf || requestAnimationFrame(rollStep);
    }
  }
  function rollNum(id) {
    const el = $(id); if (!el) return;
    const m = el.textContent.match(/^(-?\d+)(.*)$/); if (!m) return;
    const v = +m[1];
    let r = roll[id];
    if (!r) { roll[id] = { from: v, to: v, cur: v, t0: 0, rest: m[2] }; return; }
    r.rest = m[2];
    if (v !== r.to) { r.from = r.cur; r.to = v; r.t0 = performance.now(); if (xRM()) r.cur = v; }
    el.textContent = r.cur + r.rest;
    if (r.cur !== r.to && !rollRaf) rollRaf = requestAnimationFrame(rollStep);
  }

  function boostsHtml() {
    const out = [];
    for (const g of DATA.gemShop.filter(x => x.kind === 'boost')) {
      if (!boostOn(g.id)) continue;
      const left = S.boosts[g.id] - now(), m = Math.ceil(left / 6e4);
      const f = Math.min(1, left / (g.hours * 36e5));
      out.push(`<span class="bst"><span class="bring" style="--f:${f.toFixed(3)}">${pIcon(g)}</span>${m > 90 ? Math.round(m / 60) + ' ' + X('h') : m + ' ' + X('min')}</span>`);
    }
    if (passActive()) {
      const days = DATA.pass.days, left = Math.ceil((S.passUntil - now()) / 864e5), d = Math.max(1, Math.min(days, days - left + 1));
      out.push(`<span class="bst pass"><span class="bring" style="--f:${Math.min(1, left / days).toFixed(3)}">${art('gs_pass', '')}</span>${X('day')} ${d}/${days}</span>`);
    }
    return emo(out.join(''));
  }

  const bubbles = {};
  let lastLevel = null, lastOrders = null;
  function afterRender() {
    if (!S) return;
    document.body.classList.toggle('pass-on', passActive());
    document.body.dataset.zone = Math.min(S.zone, DATA.zones.length - 1);
    ['coins', 'gems', 'energy'].forEach(rollNum);
    $('boosts').innerHTML = boostsHtml();

    // C24: bubble ring timer, audible pop on expiry
    S.board.forEach((c, i) => {
      const el = cellEl(i); if (!el) return;
      if (c && c.bubble) {
        el.classList.add('bubcell');
        el.style.setProperty('--t', Math.max(0, (c.until - now()) / (DATA.bubbleSec * 1000)).toFixed(3));
        bubbles[i] = c.until;
      } else {
        if (el.classList.contains('bubcell')) { el.classList.remove('bubcell'); el.style.removeProperty('--t'); }
        if (bubbles[i] !== undefined) {
          if (!c && bubbles[i] <= now() + 999) { sfx('pop'); retrigger(el, 'popped', 420); }
          delete bubbles[i];
        }
      }
    });

    // C32: new order cards slide in
    const keys = S.orders.map(o => o.who + JSON.stringify(o.need));
    if (lastOrders && !xRM()) keys.forEach((k, n) => { if (!lastOrders.includes(k)) { const c = $('orders').children[n]; if (c) c.classList.add('enter'); } });
    lastOrders = keys;

    // C26: level-up moment
    if (lastLevel !== null && S.level > lastLevel) setTimeout(() => levelUp(S.level), 350);
    lastLevel = S.level;

    // C45: tutorial hand shows the drag
    tutHand();
  }
  new MutationObserver(afterRender).observe($('lvl'), { childList: true, characterData: true, subtree: true });

  function levelUp(n) {
    let o = $('lvlup'); if (o) o.remove();
    o = document.createElement('div'); o.id = 'lvlup'; o.setAttribute('role', 'status');
    o.innerHTML = `<div class="lu-card"><img src="${src('amy_full')}" alt=""><div class="lu-star"><img src="${src('ui_xp')}" alt=""><b>${n}</b></div><strong>${X('level')} ${n}!</strong><small>${X('skip')}</small></div>`;
    document.body.appendChild(o);
    const close = () => { o.classList.add('out'); setTimeout(() => o.remove(), 250); };
    o.addEventListener('pointerdown', close);
    setTimeout(close, 1200);
  }

  function tutHand() {
    let h = $('tut-hand');
    let pair = null;
    if (S.tut === 1 && $('modal').hidden) {
      const m = {};
      for (let i = 0; i < S.board.length && !pair; i++) { const c = S.board[i]; if (!c || !c.c || c.l >= MAX_L) continue; const k = c.c + c.l; if (m[k] !== undefined) pair = [m[k], i]; else m[k] = i; }
    }
    if (!pair) { if (h) h.remove(); return; }
    const [x0, y0] = center(cellEl(pair[0])), [x1, y1] = center(cellEl(pair[1]));
    if (!h) {
      h = document.createElement('div'); h.id = 'tut-hand'; h.setAttribute('aria-hidden', 'true');
      h.innerHTML = '<svg viewBox="0 0 48 48"><path d="M18 6a4 4 0 0 1 8 0v14l2-1a4 4 0 0 1 5 2l1 1a4 4 0 0 1 5 3v1a4 4 0 0 1 4 4v6c0 8-6 12-13 12h-3c-5 0-8-2-11-6L9 32a4 4 0 0 1 6-5l3 3Z" fill="#fff" stroke="#5a3217" stroke-width="2.5" stroke-linejoin="round"/></svg>';
      document.body.appendChild(h);
    }
    h.style.cssText = `--x0:${x0}px;--y0:${y0}px;--x1:${x1}px;--y1:${y1}px`;
  }

  // C49: preload shop, map and place pictures while idle
  const idle = window.requestIdleCallback || (f => setTimeout(f, 1500));
  idle(() => {
    const keys = [...NEW_ART, 'gem_0', 'gem_1', 'gem_2', 'gem_3', 'gem_4', 'gem_5', 'amy_full', 'chest', 'joker'];
    DATA.zones.forEach((z, k) => keys.push('place_' + k, 'res_' + k));
    keys.forEach(k => { const im = new Image(); im.src = src(k); });
  });

  // ---------- I50: device language ----------
  function deviceLang() {
    const l = ((navigator.languages && navigator.languages[0]) || navigator.language || 'en').toLowerCase();
    return Object.keys(I18N).find(k => l === k || l.startsWith(k + '-')) || 'en';
  }
  function followDevice(force) {
    if (!P.langAuto) return;
    const l = deviceLang();
    if (l === P.lang && !force) return;
    P.lang = l; savePrefs(); applyStaticTexts(); render();
  }
  if (P.langAuto === undefined) P.langAuto = P.lang === deviceLang();
  window.addEventListener('languagechange', () => followDevice(false));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) followDevice(false); });
  followDevice(false);

  applyPrefs();
  afterRender();
})();
