(() => {
  const C = window.CB_CONFIG;
  const T = {
    de: {
      tabs: ['Cheats', 'Favoriten', 'Infos'], cats: { all: 'Alle', health: 'Gesundheit', weapons: 'Waffen', vehicles: 'Fahrzeuge', wanted: 'Fahndung', world: 'Welt', fun: 'Spaß' },
      search: 'Cheat suchen...', soon: 'Erscheint am 19. November 2026', released: 'Erschienen',
      heroPre: 'Noch keine bestätigten Cheats', heroPreP: 'Diese Liste füllt sich live, sobald Cheats im fertigen Spiel bestätigt sind. Keine Gerüchte, keine Fake-Codes.',
      heroPost: n => n + ' bestätigte Cheats', heroPostP: 'Die Liste wird live aktualisiert, ohne App-Update.',
      d: 'Tage', h: 'Std', m: 'Min', s: 'Sek',
      emptyT: 'Hier erscheinen die Cheats', emptyP: 'Sobald ein Cheat im Spiel bestätigt ist, steht er hier mit der Tasten-Kombination für PS5 und Xbox.',
      noHit: 'Kein Cheat gefunden.', favEmptyT: 'Noch keine Favoriten', favEmptyP: 'Tippe auf den Stern bei einem Cheat, um ihn hier zu speichern.',
      verified: 'Bestätigt', copy: 'Kopieren', copied: 'Kopiert', phone: 'Handy', pc: 'PC',
      updated: d => 'Stand der Liste: ' + d, refresh: 'Liste aktualisieren', refreshed: 'Liste ist aktuell', offline: 'Offline: gespeicherte Liste',
      howT: 'So gibst du Cheats ein', howP: 'Die genaue Eingabe in GTA 6 steht fest, sobald das Spiel erschienen ist. Wir ergänzen sie hier zusammen mit den ersten bestätigten Codes.',
      safeT: 'Sicher bleiben', safe: ['Lade keine "Cheat-Tools" oder Mod-Menüs herunter, die Codes vor dem Release versprechen.', 'Gib nie deine Konto-Daten auf Cheat-Seiten ein.', 'Cheats im Online-Modus gibt es in der Regel nicht. Wer das anbietet, will meist dein Konto.'],
      aboutT: 'Über diese App', aboutP: 'Inoffizielle Fan-Übersicht. Nicht verbunden mit Rockstar Games oder Take-Two Interactive. Alle Marken gehören ihren Inhabern.',
      lang: 'Sprache', contact: 'Fehler melden / Cheat vorschlagen'
    },
    en: {
      tabs: ['Cheats', 'Favorites', 'Info'], cats: { all: 'All', health: 'Health', weapons: 'Weapons', vehicles: 'Vehicles', wanted: 'Wanted level', world: 'World', fun: 'Fun' },
      search: 'Search cheats...', soon: 'Releases November 19, 2026', released: 'Released',
      heroPre: 'No confirmed cheats yet', heroPreP: 'This list fills live as soon as cheats are confirmed in the released game. No rumors, no fake codes.',
      heroPost: n => n + ' confirmed cheats', heroPostP: 'The list updates live, no app update needed.',
      d: 'Days', h: 'Hrs', m: 'Min', s: 'Sec',
      emptyT: 'Cheats will appear here', emptyP: 'As soon as a cheat is confirmed in the game, it shows up here with the button combo for PS5 and Xbox.',
      noHit: 'No cheat found.', favEmptyT: 'No favorites yet', favEmptyP: 'Tap the star on a cheat to save it here.',
      verified: 'Confirmed', copy: 'Copy', copied: 'Copied', phone: 'Phone', pc: 'PC',
      updated: d => 'List updated: ' + d, refresh: 'Refresh list', refreshed: 'List is up to date', offline: 'Offline: saved list',
      howT: 'How to enter cheats', howP: 'The exact input method in GTA 6 is known once the game is out. We add it here together with the first confirmed codes.',
      safeT: 'Stay safe', safe: ['Do not download "cheat tools" or mod menus that promise codes before release.', 'Never enter your account details on cheat sites.', 'Online mode usually has no cheats. Anyone offering them is usually after your account.'],
      aboutT: 'About this app', aboutP: 'Unofficial fan guide. Not affiliated with Rockstar Games or Take-Two Interactive. All trademarks belong to their owners.',
      lang: 'Language', contact: 'Report an error / suggest a cheat'
    }
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem('cb.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('cb.' + k, JSON.stringify(v)); } catch {} }
  };
  const S = {
    lang: store.get('lang', (navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en'),
    plat: store.get('plat', 'ps5'), tab: 0, cat: 'all', q: '',
    favs: store.get('favs', []), data: store.get('data', null) || window.CB_DATA
  };
  if (!S.data || S.data.version !== window.CB_DATA.version || S.data.updated < window.CB_DATA.updated) S.data = window.CB_DATA;
  const t = () => T[S.lang];
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const L = o => (o && typeof o === 'object') ? (o[S.lang] || o.en || '') : (o || '');
  const native = (a, v) => {
    try { window.webkit && window.webkit.messageHandlers.cb.postMessage({ a, v: v || '' }); } catch {}
    try { window.AndroidCB && window.AndroidCB.post(a, v || ''); } catch {}
  };
  let toastT;
  const toast = m => { const e = $('#toast'); e.textContent = m; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 1500); };

  const KEY = {
    ps5: { x: ['✕', 'x'], o: ['◯', 'o'], t: ['△', 't'], s: ['□', 's'], L1: ['L1'], R1: ['R1'], L2: ['L2'], R2: ['R2'], L3: ['L3'], R3: ['R3'], up: ['↑'], down: ['↓'], left: ['←'], right: ['→'] },
    xbox: { x: ['A', 'A'], o: ['B', 'B'], s: ['X', 'X'], t: ['Y', 'Y'], L1: ['LB'], R1: ['RB'], L2: ['LT'], R2: ['RT'], L3: ['LS'], R3: ['RS'], up: ['↑'], down: ['↓'], left: ['←'], right: ['→'] }
  };
  const seqHtml = seq => seq.map(k => { const m = (KEY[S.plat] || {})[k] || [k]; return `<span class="k ${m[1] || ''}">${esc(m[0])}</span>`; }).join('');
  const seqText = seq => seq.map(k => ((KEY[S.plat] || {})[k] || [k])[0]).join(' ');

  const cheats = () => (S.data.cheats || []).filter(c => c.verified);
  const releaseAt = () => new Date(S.data.release).getTime();

  function header() {
    $('#title').textContent = C.appName;
    $('#plat').innerHTML = (S.data.platforms || ['ps5', 'xbox']).map(p => `<button data-plat="${p}" class="${p === S.plat ? 'on' : ''}">${p === 'ps5' ? 'PS5' : p === 'xbox' ? 'Xbox' : t().pc}</button>`).join('');
    $('#tabs').innerHTML = t().tabs.map((n, i) => `<button data-tab="${i}" class="${i === S.tab ? 'on' : ''}"><i>${['🎮', '★', 'ℹ'][i]}</i>${n}</button>`).join('');
  }

  function countdown() {
    const ms = releaseAt() - Date.now();
    if (!(ms > 0)) return '';
    const p = [Math.floor(ms / 864e5), Math.floor(ms / 36e5) % 24, Math.floor(ms / 6e4) % 60, Math.floor(ms / 1e3) % 60];
    return `<div class="count">${p.map((v, i) => `<div><b>${String(v).padStart(2, '0')}</b><span>${[t().d, t().h, t().m, t().s][i]}</span></div>`).join('')}</div>`;
  }

  function hero() {
    const n = cheats().length, out = Date.now() >= releaseAt();
    return `<section class="hero"><small>${out ? t().released : t().soon}</small>
      <h2>${n ? t().heroPost(n) : t().heroPre}</h2><p>${n ? t().heroPostP : t().heroPreP}</p><div id="cd">${countdown()}</div></section>`;
  }

  function cheatCard(c) {
    const seq = (c.input || {})[S.plat];
    const fav = S.favs.includes(c.id);
    return `<article class="cheat" data-id="${esc(c.id)}"><div class="h"><h3>${esc(L(c.name))}</h3><button class="star ${fav ? 'on' : ''}" data-fav="${esc(c.id)}">${fav ? '★' : '☆'}</button></div>
      <p>${esc(L(c.effect))}</p>
      ${seq ? `<div class="seq">${seqHtml(seq)}</div>` : ''}
      ${c.input && c.input.phone ? `<div class="meta">${t().phone}: <b>${esc(c.input.phone)}</b></div>` : ''}
      <div class="meta"><span class="badge">${t().verified}</span>${c.note ? esc(L(c.note)) : ''}<button class="copy" data-copy="${esc(c.id)}">${t().copy}</button></div></article>`;
  }

  function list(items, emptyT, emptyP) {
    if (items.length) return items.map(cheatCard).join('');
    return `<div class="empty"><b>${emptyT}</b>${emptyP}</div>`;
  }

  function viewCheats() {
    const all = cheats();
    const cats = ['all', ...Object.keys(t().cats).filter(k => k !== 'all' && all.some(c => c.cat === k))];
    const q = S.q.trim().toLowerCase();
    const items = all.filter(c => (S.cat === 'all' || c.cat === S.cat) && (!q || (L(c.name) + ' ' + L(c.effect)).toLowerCase().includes(q)));
    return hero() + (all.length ? `<input class="search" id="q" type="search" placeholder="${t().search}" value="${esc(S.q)}">
      <div class="chips">${cats.map(k => `<button data-cat="${k}" class="${k === S.cat ? 'on' : ''}">${t().cats[k] || k}</button>`).join('')}</div>` : '')
      + list(items, all.length ? t().noHit : t().emptyT, all.length ? '' : t().emptyP)
      + `<p class="fine">${t().updated(esc(S.data.updated))}</p>`;
  }

  function viewFavs() {
    const items = cheats().filter(c => S.favs.includes(c.id));
    return list(items, t().favEmptyT, t().favEmptyP);
  }

  function viewInfo() {
    return `<div class="card"><h3>${t().howT}</h3><p>${t().howP}</p></div>
      <div class="card"><h3>${t().safeT}</h3><ul>${t().safe.map(s => `<li>${s}</li>`).join('')}</ul></div>
      <div class="card"><div class="row"><h3>${t().lang}</h3><div class="seg" style="width:140px"><button data-lang="de" class="${S.lang === 'de' ? 'on' : ''}">DE</button><button data-lang="en" class="${S.lang === 'en' ? 'on' : ''}">EN</button></div></div>
        <button class="btn" data-refresh="1">${t().refresh}</button><button class="btn ghost" data-contact="1">${t().contact}</button></div>
      <div class="card"><h3>${t().aboutT}</h3><p>${t().aboutP}</p></div>
      <p class="fine">${t().updated(esc(S.data.updated))}</p>`;
  }

  function render() {
    document.documentElement.lang = S.lang;
    header();
    $('#view').innerHTML = [viewCheats, viewFavs, viewInfo][S.tab]();
  }

  async function refresh(manual) {
    try {
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 8000);
      const r = await fetch(C.contentUrl + '?t=' + Date.now(), { signal: ctl.signal, cache: 'no-store' });
      clearTimeout(to);
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      if (!d || !Array.isArray(d.cheats) || !d.release) throw new Error('bad');
      setData(d);
      if (manual) toast(t().refreshed);
    } catch { if (manual) toast(t().offline); }
  }
  function setData(d) { S.data = d; store.set('data', d); render(); }

  document.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.tab) { S.tab = +d.tab; window.scrollTo(0, 0); }
    else if (d.plat) { S.plat = d.plat; store.set('plat', S.plat); }
    else if (d.cat) S.cat = d.cat;
    else if (d.lang) { S.lang = d.lang; store.set('lang', S.lang); }
    else if (d.fav) { S.favs = S.favs.includes(d.fav) ? S.favs.filter(x => x !== d.fav) : [...S.favs, d.fav]; store.set('favs', S.favs); native('haptic'); }
    else if (d.copy) {
      const c = cheats().find(x => x.id === d.copy); if (!c) return;
      const seq = (c.input || {})[S.plat];
      const txt = L(c.name) + ': ' + (seq ? seqText(seq) : '') + (c.input.phone ? ' / ' + c.input.phone : '');
      if (window.webkit || window.AndroidCB) native('copy', txt); else try { navigator.clipboard.writeText(txt); } catch {}
      toast(t().copied); return;
    }
    else if (d.refresh) { refresh(true); return; }
    else if (d.contact) { native('open', C.support); if (!window.webkit && !window.AndroidCB) location.href = C.support; return; }
    else return;
    render();
  });
  document.addEventListener('input', e => {
    if (e.target.id !== 'q') return;
    S.q = e.target.value;
    const pos = e.target.selectionStart; render();
    const q = $('#q'); q.focus(); q.setSelectionRange(pos, pos);
  });
  setInterval(() => { const cd = $('#cd'); if (cd && S.tab === 0) cd.innerHTML = countdown(); }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(false); });

  window.cb = { state: () => S, setData, render };
  render();
  native('ready');
  refresh(false);
})();
