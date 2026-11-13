(function () {
  'use strict';
  var FREE_GEN = 5;
  var native = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.kl;
  function post(a, v) { if (native) native.postMessage({ a: a, v: v == null ? '' : String(v) }); }

  var S = load();
  function load() {
    var d = { lang: null, fav: [], pro: false, gen: { day: '', n: 0 }, seen: {}, dev: '', blocked: [], terms: false };
    try { var s = JSON.parse(localStorage.getItem('kl') || '{}'); for (var k in s) d[k] = s[k]; } catch (e) {}
    if (!d.lang) d.lang = /^de/i.test(navigator.language || '') ? 'de' : 'en';
    if (!d.dev) { var a = new Uint8Array(16); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256; }); d.dev = Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
    return d;
  }
  function save() { try { localStorage.setItem('kl', JSON.stringify(S)); } catch (e) {} }

  var T = {
    de: { app: 'Käse legen', discover: 'Entdecken', gen: 'Generator', favs: 'Favoriten', more: 'Mehr', daily: 'Spruch des Tages',
      cats: 'Kategorien', lines: 'Sprüche', copy: 'Kopieren', share: 'Teilen', edit: 'Bearbeiten', card: 'Bild', fav: 'Merken',
      next: 'Nächster', prev: 'Zurück', copied: 'Kopiert. Viel Glück!', saved: 'Gemerkt', removed: 'Entfernt',
      pro: 'Käse Pro', proOn: 'Pro aktiv', getPro: 'Pro holen',
      proTitle: 'Käse Pro', proSub: 'Einmal zahlen, für immer käsig.',
      proList: ['Alle 11 Kategorien freischalten', 'Unbegrenzt Sprüche generieren', 'Chat-Opener, Antworten und Konter', 'Neue Sprüche mit jedem Update', 'Keine Werbung, kein Abo'],
      buy: 'Freischalten', restore: 'Käufe wiederherstellen', later: 'Später', thanks: 'Danke! Pro ist aktiv.',
      buyErr: 'Kauf nicht möglich. Bitte später erneut versuchen.', pending: 'Kauf wartet auf Bestätigung.',
      who: 'Für wen?', tone: 'Wie?', where: 'Wo?', make: 'Käse legen!', again: 'Nochmal',
      genLeft: function (n) { return n + ' von ' + FREE_GEN + ' heute frei'; }, genOut: 'Für heute sind die freien Sprüche weg. Mit Pro unbegrenzt.',
      noFavs: 'Noch keine Favoriten. Tippe beim Spruch auf das Herz.', lang: 'Sprache', privacy: 'Datenschutz', support: 'Hilfe & Kontakt',
      random: 'Zufälliger Spruch', editTitle: 'Spruch anpassen', done: 'Fertig', delete: 'Löschen',
      note: 'Käse legen ist zum Spaß gedacht. Sei nett, respektiere ein Nein und hab Humor.',
      swipe: 'Wischen für den nächsten Spruch', free: 'gratis', locked: 'Pro',
      comm: 'Community', top: 'Top', week: 'Woche', newest: 'Neu', postLine: 'Spruch posten', you: 'Du postest als',
      loading: 'Lädt ...', offline: 'Keine Verbindung. Zieh nach unten oder versuch es gleich nochmal.', retry: 'Nochmal laden', noComm: 'Noch keine Sprüche. Sei die erste Person!',
      report: 'Melden', block: 'Nutzer blockieren', blocked: 'Nutzer blockiert. Du siehst seine Sprüche nicht mehr.', reported: 'Danke! Wir prüfen den Spruch.',
      reportWhy: 'Warum meldest du den Spruch?', reasons: [['hate', 'Beleidigend oder hasserfüllt'], ['sexual', 'Sexuell oder anstößig'], ['spam', 'Spam oder Werbung'], ['other', 'Etwas anderes']],
      cancel: 'Abbrechen', send: 'Posten', posted: 'Gepostet! Jetzt können alle bewerten.', ownVote: 'Eigene Sprüche kannst du nicht bewerten.',
      termsTitle: 'Community-Regeln', termsText: 'Bevor du postest: Keine Beleidigungen, kein Hass, nichts Sexuelles, keine Kontaktdaten, keine Werbung. Für anstößige Inhalte gilt null Toleranz: Sie werden entfernt und Nutzer gesperrt. Du kannst jeden Spruch melden und Nutzer blockieren. Mit dem Posten akzeptierst du die Nutzungsbedingungen.',
      termsLink: 'Nutzungsbedingungen lesen', agree: 'Ich stimme zu', terms: 'Nutzungsbedingungen', unblock: 'Blockierte Nutzer freigeben',
      err: { filter: 'Dein Spruch enthält Wörter, Links oder Kontaktdaten, die nicht erlaubt sind.', limit: 'Du hast heute schon 5 Sprüche gepostet. Morgen geht es weiter.', dupe: 'Den Spruch gibt es schon.', banned: 'Du kannst nicht mehr posten.', short: 'Der Spruch ist zu kurz.', net: 'Keine Verbindung. Bitte später nochmal.' } },
    en: { app: 'Käse legen', discover: 'Discover', gen: 'Generator', favs: 'Favorites', more: 'More', daily: 'Line of the day',
      cats: 'Categories', lines: 'lines', copy: 'Copy', share: 'Share', edit: 'Edit', card: 'Image', fav: 'Save',
      next: 'Next', prev: 'Back', copied: 'Copied. Good luck!', saved: 'Saved', removed: 'Removed',
      pro: 'Cheese Pro', proOn: 'Pro active', getPro: 'Get Pro',
      proTitle: 'Cheese Pro', proSub: 'Pay once, stay cheesy forever.',
      proList: ['Unlock all 11 categories', 'Unlimited generated lines', 'Chat openers, replies and comebacks', 'New lines with every update', 'No ads, no subscription'],
      buy: 'Unlock', restore: 'Restore purchases', later: 'Later', thanks: 'Thank you! Pro is active.',
      buyErr: 'Purchase not possible. Please try again later.', pending: 'Purchase is waiting for approval.',
      who: 'For whom?', tone: 'Style?', where: 'Where?', make: 'Make it cheesy!', again: 'Again',
      genLeft: function (n) { return n + ' of ' + FREE_GEN + ' free today'; }, genOut: 'Free lines for today are used up. Unlimited with Pro.',
      noFavs: 'No favorites yet. Tap the heart on a line.', lang: 'Language', privacy: 'Privacy policy', support: 'Help & contact',
      random: 'Random line', editTitle: 'Edit line', done: 'Done', delete: 'Delete',
      note: 'Käse legen is meant for fun. Be kind, respect a no and keep your humor.',
      swipe: 'Swipe for the next line', free: 'free', locked: 'Pro',
      comm: 'Community', top: 'Top', week: 'Week', newest: 'New', postLine: 'Post a line', you: 'You post as',
      loading: 'Loading ...', offline: 'No connection. Please try again in a moment.', retry: 'Reload', noComm: 'No lines yet. Be the first!',
      report: 'Report', block: 'Block user', blocked: 'User blocked. You will not see their lines anymore.', reported: 'Thanks! We will review this line.',
      reportWhy: 'Why are you reporting this line?', reasons: [['hate', 'Offensive or hateful'], ['sexual', 'Sexual or inappropriate'], ['spam', 'Spam or advertising'], ['other', 'Something else']],
      cancel: 'Cancel', send: 'Post', posted: 'Posted! Now everyone can vote.', ownVote: 'You cannot vote on your own lines.',
      termsTitle: 'Community rules', termsText: 'Before you post: no insults, no hate, nothing sexual, no contact details, no ads. There is zero tolerance for objectionable content: it is removed and users are banned. You can report any line and block users. By posting you accept the terms of use.',
      termsLink: 'Read the terms of use', agree: 'I agree', terms: 'Terms of use', unblock: 'Unblock all users',
      err: { filter: 'Your line contains words, links or contact details that are not allowed.', limit: 'You already posted 5 lines today. Come back tomorrow.', dupe: 'This line already exists.', banned: 'You can no longer post.', short: 'The line is too short.', net: 'No connection. Please try later.' } }
  };
  function t(k) { return T[S.lang][k]; }
  function cats() { return window.KL_LINES[S.lang]; }

  var I = {
    cheese: '<path d="M3 17l9-11 9 5v6z"/><path d="M3 17h18"/><circle cx="9" cy="14" r="1.2"/><circle cx="15" cy="13" r="1.6"/>',
    laugh: '<circle cx="12" cy="12" r="9"/><path d="M8 14c1 2 2.5 3 4 3s3-1 4-3z"/><path d="M8.5 9.5h.01M15.5 9.5h.01"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>', phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    reply: '<path d="M10 8L5 12l5 4"/><path d="M5 12h9a5 5 0 0 1 5 5v1"/>', spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    food: '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M9 4c0 2 2 2 2 4M14 4c0 2 2 2 2 4"/>', star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    couple: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M3 20c0-3 2.2-5 5-5s5 2 5 5M11 20c0-3 2.2-5 5-5s5 2 5 5"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    back: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>', dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h.01M15 15h.01M15 9h.01M9 15h.01M12 12h.01"/>',
    home: '<path d="M4 11l8-7 8 7v9H4z"/>', up: '<path d="M12 5l7 8h-4v6H9v-6H5z"/>', down: '<path d="M12 19l-7-8h4V5h6v6h4z"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>', plus: '<path d="M12 5v14M5 12h14"/>', flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>', ban: '<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>', wand: '<path d="M4 20L16 8M14 4v3M18 6h3M19 10v2M12 2h0"/>', dots: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>'
  };
  function ic(n, fillHeart) {
    return '<svg viewBox="0 0 24 24" fill="' + (fillHeart ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + I[n] + '</svg>';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var WEDGE = '<svg class="wedge" viewBox="0 0 40 40"><path d="M3 30L22 8l15 9v13z" fill="#ffc93c" stroke="#f5a623" stroke-width="2" stroke-linejoin="round"/><circle cx="14" cy="25" r="2.5" fill="#f5a623"/><circle cx="26" cy="23" r="3.2" fill="#f5a623"/><circle cx="30" cy="16" r="1.6" fill="#f5a623"/></svg>';

  var $ = function (id) { return document.getElementById(id); };
  var tab = 'discover', deck = null;

  function toast(msg) {
    var el = $('toast'); el.textContent = msg; el.classList.remove('hidden');
    clearTimeout(toast.h); toast.h = setTimeout(function () { el.classList.add('hidden'); }, 1700);
  }
  function haptic() { post('haptic', 'tap'); }

  function copy(text) {
    haptic();
    if (native) post('copy', text);
    else if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
    toast(t('copied'));
  }
  function share(text) {
    haptic();
    if (native) post('share', text);
    else if (navigator.share) navigator.share({ text: text }).catch(function () {});
    else copy(text);
  }
  function shareImage(text) {
    haptic();
    var url = renderCard(text);
    if (native) { post('shareImage', url); return; }
    fetch(url).then(function (r) { return r.blob(); }).then(function (b) {
      var f = new File([b], 'kaese.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f] });
      else { var a = document.createElement('a'); a.href = url; a.download = 'kaese.png'; a.click(); }
    });
  }
  // 1080x1350 share card: cheese gradient, wrapped text, small brand line
  function renderCard(text) {
    var c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
    var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 1080, 1350); g.addColorStop(0, '#ffd45c'); g.addColorStop(1, '#f5a623');
    x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
    x.fillStyle = 'rgba(255,255,255,0.18)';
    [[160, 200, 90], [930, 300, 60], [880, 1150, 120], [200, 1180, 50], [600, 120, 40]].forEach(function (h) { x.beginPath(); x.arc(h[0], h[1], h[2], 0, 7); x.fill(); });
    x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect ? x.roundRect(90, 300, 900, 750, 60) : x.rect(90, 300, 900, 750); x.fill();
    x.fillStyle = '#2b2118'; x.textAlign = 'center'; x.textBaseline = 'middle';
    var size = 64, lines;
    do { x.font = '700 ' + size + 'px ui-rounded, -apple-system, system-ui, sans-serif'; lines = wrap(x, text, 780); size -= 4; } while (lines.length * size * 1.3 > 640 && size > 30);
    size += 4; var lh = size * 1.3, y0 = 675 - (lines.length - 1) * lh / 2;
    lines.forEach(function (l, i) { x.fillText(l, 540, y0 + i * lh); });
    x.font = '800 40px ui-rounded, -apple-system, system-ui, sans-serif'; x.fillStyle = '#2b2118';
    x.fillText(T[S.lang].app, 540, 1200);
    return c.toDataURL('image/png');
  }
  function wrap(x, text, w) {
    var words = text.split(' '), out = [], cur = '';
    words.forEach(function (wd) { var test = cur ? cur + ' ' + wd : wd; if (x.measureText(test).width > w && cur) { out.push(cur); cur = wd; } else cur = test; });
    if (cur) out.push(cur); return out;
  }

  function isFav(text) { return S.fav.indexOf(text) >= 0; }
  function toggleFav(text) {
    haptic();
    var i = S.fav.indexOf(text);
    if (i >= 0) { S.fav.splice(i, 1); toast(t('removed')); } else { S.fav.unshift(text); toast(t('saved')); }
    save();
  }

  function dayKey() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function daily() {
    var all = []; cats().forEach(function (c) { if (!c.pro) all = all.concat(c.lines); });
    var k = dayKey(), h = 0; for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
    return all[h % all.length];
  }

  function header() {
    $('title').textContent = deck ? '' : t(tab === 'discover' ? 'app' : tab);
    var b = $('proBadge'); b.textContent = S.pro ? t('proOn') : t('getPro'); b.className = 'pill' + (S.pro ? ' on' : '');
    $('top').style.display = deck ? 'none' : 'flex';
  }

  function render() {
    header();
    var v = $('view');
    if (deck) return renderDeck(v);
    if (tab === 'discover') renderHome(v);
    else if (tab === 'gen') renderGen(v);
    else if (tab === 'favs') renderFavs(v);
    else if (tab === 'comm') renderComm(v);
    else renderMore(v);
    renderTabs();
  }

  function renderTabs() {
    var tabs = [['discover', 'home'], ['gen', 'wand'], ['comm', 'trophy'], ['favs', 'heart'], ['more', 'dots']];
    $('tabs').style.display = deck ? 'none' : 'flex';
    $('tabs').innerHTML = tabs.map(function (x) { return '<button data-tab="' + x[0] + '" class="' + (tab === x[0] ? 'on' : '') + '">' + ic(x[1]) + t(x[0]) + '</button>'; }).join('');
  }

  function renderHome(v) {
    var d = daily();
    var h = '<div class="hero"><svg class="holes" viewBox="0 0 100 100"><circle cx="30" cy="30" r="18" fill="#fff"/><circle cx="70" cy="60" r="12" fill="#fff"/><circle cx="40" cy="80" r="8" fill="#fff"/></svg>' +
      '<small>' + t('daily') + '</small><p>' + esc(d) + '</p><div class="row">' +
      '<button class="btn" data-copy="' + esc(d) + '">' + ic('copy') + t('copy') + '</button>' +
      '<button class="btn" data-share="' + esc(d) + '">' + ic('share') + t('share') + '</button>' +
      '<button class="btn" data-random="1">' + ic('dice') + t('random') + '</button></div></div>';
    h += '<h2>' + t('cats') + '</h2><div class="grid">';
    cats().forEach(function (c, i) {
      var locked = c.pro && !S.pro;
      h += '<button class="cat" data-cat="' + i + '">' + ic(c.icon) + (locked ? '<span class="lock">' + ic('lock') + '</span>' : '') +
        '<div><b>' + esc(c.name) + '</b><br><span>' + c.lines.length + ' ' + t('lines') + (locked ? ' · ' + t('locked') : '') + '</span></div></button>';
    });
    v.innerHTML = h + '</div><p class="note">' + t('note') + '</p>';
  }

  function openDeck(ci, idx) {
    var c = cats()[ci];
    if (c.pro && !S.pro) return paywall();
    deck = { ci: ci, i: idx || 0 }; haptic(); render();
  }

  function renderDeck(v) {
    var c = cats()[deck.ci], line = c.lines[deck.i];
    v.innerHTML = '<div class="deck"><div class="deck-head"><button class="back" data-close="1">' + ic('back') + '</button><b>' + esc(c.name) + '</b></div>' +
      '<div class="card" id="card"><span class="num">' + (deck.i + 1) + ' / ' + c.lines.length + '</span><p>' + esc(line) + '</p>' + WEDGE + '</div>' +
      '<div class="tools">' +
      '<button class="tool' + (isFav(line) ? ' on' : '') + '" data-fav="1">' + ic('heart', isFav(line)) + t('fav') + '</button>' +
      '<button class="tool" data-copy="' + esc(line) + '">' + ic('copy') + t('copy') + '</button>' +
      '<button class="tool" data-share="' + esc(line) + '">' + ic('share') + t('share') + '</button>' +
      '<button class="tool" data-img="' + esc(line) + '">' + ic('image') + t('card') + '</button>' +
      '<button class="tool" data-edit="' + esc(line) + '">' + ic('edit') + t('edit') + '</button></div>' +
      '<div class="nav2"><button class="btn" data-step="-1">' + ic('back') + t('prev') + '</button><button class="btn" data-step="1">' + t('next') + ic('next') + '</button></div></div>';
    swipe($('card'));
  }

  function step(d) {
    var c = cats()[deck.ci];
    deck.i = (deck.i + d + c.lines.length) % c.lines.length;
    haptic(); render();
  }

  function swipe(el) {
    var sx = null, dx = 0;
    el.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; dx = 0; el.style.transition = 'none'; }, { passive: true });
    el.addEventListener('touchmove', function (e) { if (sx == null) return; dx = e.touches[0].clientX - sx; el.style.transform = 'translateX(' + dx + 'px) rotate(' + dx / 30 + 'deg)'; }, { passive: true });
    el.addEventListener('touchend', function () {
      el.style.transition = '';
      if (Math.abs(dx) > 70) { el.style.transform = 'translateX(' + (dx > 0 ? 400 : -400) + 'px)'; el.style.opacity = '0'; setTimeout(function () { step(dx > 0 ? -1 : 1); }, 160); }
      else el.style.transform = '';
      sx = null;
    });
  }

  var G = { who: 'crush', tone: 'lustig', where: 'chat', out: null };
  function genLeft() { if (S.gen.day !== dayKey()) { S.gen = { day: dayKey(), n: 0 }; } return Math.max(0, FREE_GEN - S.gen.n); }
  function generate() {
    if (!S.pro && genLeft() <= 0) return paywall();
    var g = window.KL_GEN[S.lang], p = g.pools, list = g.t[G.tone];
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    var s = pick(list).replace('{thing}', pick(p.thing)).replace('{because}', pick(p.because)).replace('{plan}', pick(p.plan)).replace('{place}', p.place[G.where]);
    s = g.addr[G.who] + s;
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (!S.pro) { S.gen.n++; save(); }
    G.out = s; haptic(); render();
  }
  function renderGen(v) {
    var g = window.KL_GEN[S.lang];
    function seg(key, map) {
      return '<div class="seg">' + Object.keys(map).map(function (k) { return '<button data-g="' + key + ':' + k + '" class="' + (G[key] === k ? 'on' : '') + '">' + esc(map[k]) + '</button>'; }).join('') + '</div>';
    }
    var h = '<div class="label">' + t('who') + '</div>' + seg('who', g.who) + '<div class="label">' + t('tone') + '</div>' + seg('tone', g.tones) +
      '<div class="label">' + t('where') + '</div>' + seg('where', g.places) +
      '<div style="height:14px"></div><button class="btn big" data-gen="1">' + ic('wand') + (G.out ? t('again') : t('make')) + '</button>';
    if (!S.pro) h += '<p class="note">' + (genLeft() > 0 ? t('genLeft')(genLeft()) : t('genOut')) + '</p>';
    if (G.out) {
      var o = G.out;
      h += '<div class="genout"><div class="card" style="min-height:180px"><p>' + esc(o) + '</p>' + WEDGE + '</div><div class="tools">' +
        '<button class="tool' + (isFav(o) ? ' on' : '') + '" data-favtext="' + esc(o) + '">' + ic('heart', isFav(o)) + t('fav') + '</button>' +
        '<button class="tool" data-copy="' + esc(o) + '">' + ic('copy') + t('copy') + '</button>' +
        '<button class="tool" data-share="' + esc(o) + '">' + ic('share') + t('share') + '</button>' +
        '<button class="tool" data-img="' + esc(o) + '">' + ic('image') + t('card') + '</button>' +
        '<button class="tool" data-edit="' + esc(o) + '">' + ic('edit') + t('edit') + '</button></div></div>';
    }
    v.innerHTML = h;
  }

  function renderFavs(v) {
    if (!S.fav.length) { v.innerHTML = '<div class="empty">' + ic('heart') + '<p>' + t('noFavs') + '</p></div>'; return; }
    v.innerHTML = S.fav.map(function (f) {
      return '<div class="fav"><p>' + esc(f) + '</p><div class="row">' +
        '<button class="btn" data-copy="' + esc(f) + '">' + ic('copy') + t('copy') + '</button>' +
        '<button class="btn" data-share="' + esc(f) + '">' + ic('share') + t('share') + '</button>' +
        '<button class="btn" data-favtext="' + esc(f) + '">' + ic('heart', true) + t('delete') + '</button></div></div>';
    }).join('');
  }

  function renderMore(v) {
    v.innerHTML = '<div class="list">' +
      '<button class="item" data-pro="1">' + t('pro') + '<span>' + (S.pro ? t('proOn') : t('getPro')) + '</span></button>' +
      '<button class="item" data-lang="1">' + t('lang') + '<span>' + (S.lang === 'de' ? 'Deutsch' : 'English') + '</span></button>' +
      '<button class="item" data-restore="1">' + t('restore') + '<span></span></button>' +
      '<button class="item" data-open="privacy.html">' + t('privacy') + '<span></span></button>' +
      '<button class="item" data-open="terms.html">' + t('terms') + '<span></span></button>' +
      (S.blocked.length ? '<button class="item" data-unblock="1">' + t('unblock') + '<span>' + S.blocked.length + '</span></button>' : '') +
      '<button class="item" data-open="mailto:lords.azz6@gmail.com">' + t('support') + '<span></span></button></div>' +
      '<p class="note">' + t('note') + '<br>v1.0</p>';
  }

  // ---- community ----
  var API = /^http/.test(location.protocol) && location.pathname.indexOf('/kaese') === 0 ? '/kaese/api/' : 'https://play.nyrathen.com/kaese/api/';
  var C = { sort: 'top', lines: null, err: false, me: null, busy: false, key: '' };
  function call(route, body) {
    var opt = body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ dev: S.dev, lang: S.lang }, body)) } : undefined;
    return fetch(API + route, opt).then(function (r) { return r.json(); });
  }
  function loadComm() {
    var key = S.lang + C.sort; C.key = key; C.busy = true; C.err = false;
    call('lines?dev=' + S.dev + '&lang=' + S.lang + '&sort=' + C.sort + '&blocked=' + S.blocked.join(',')).then(function (r) {
      if (C.key !== key) return; C.lines = r.lines || []; C.me = r.me; C.busy = false; if (tab === 'comm' && !deck) render();
    }).catch(function () { if (C.key !== key) return; C.busy = false; C.err = true; if (tab === 'comm' && !deck) render(); });
  }
  function renderComm(v) {
    var sorts = [['top', t('top')], ['week', t('week')], ['new', t('newest')]];
    var h = '<div class="seg">' + sorts.map(function (x) { return '<button data-csort="' + x[0] + '" class="' + (C.sort === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div style="height:10px"></div><button class="btn big" data-cpost="1">' + ic('plus') + t('postLine') + '</button>';
    if (C.me) h += '<p class="note" style="margin-top:8px">' + t('you') + ' <b>' + esc(C.me.nick) + '</b></p>';
    if (C.err) h += '<div class="empty"><p>' + t('offline') + '</p><button class="btn" data-creload="1">' + t('retry') + '</button></div>';
    else if (!C.lines) h += '<div class="empty">' + t('loading') + '</div>';
    else if (!C.lines.length) h += '<div class="empty">' + t('noComm') + '</div>';
    else h += C.lines.map(function (l, i) {
      var mine = C.me && l.author === C.me.author;
      return '<div class="fav comm"><div class="rank">' + (C.sort === 'new' ? '' : '#' + (i + 1)) + '</div><p>' + esc(l.text) + '</p>' +
        '<div class="meta">' + esc(l.nick) + (mine ? ' · ★' : '') + '</div><div class="row">' +
        '<button class="btn vote' + (l.my > 0 ? ' on' : '') + '" data-vote="' + l.id + ':1">' + ic('up') + '</button><b class="score">' + l.score + '</b>' +
        '<button class="btn vote' + (l.my < 0 ? ' on' : '') + '" data-vote="' + l.id + ':-1">' + ic('down') + '</button>' +
        '<button class="btn" data-copy="' + esc(l.text) + '">' + ic('copy') + '</button>' +
        '<button class="btn" data-share="' + esc(l.text) + '">' + ic('share') + '</button>' +
        (mine ? '' : '<button class="btn" data-cmenu="' + l.id + '">' + ic('flag') + '</button>') + '</div></div>';
    }).join('');
    v.innerHTML = h;
    if (!C.lines && !C.busy && !C.err) loadComm();
  }
  function findLine(id) { return (C.lines || []).filter(function (l) { return l.id === +id; })[0]; }
  function commMenu(id) {
    var l = findLine(id); if (!l) return;
    $('sheetBox').innerHTML = '<p style="font-weight:700;font-size:17px">' + esc(l.text) + '</p>' +
      '<div class="label">' + t('reportWhy') + '</div><div class="list">' +
      t('reasons').map(function (r) { return '<button class="item l" data-creport="' + id + ':' + r[0] + '">' + ic('flag').replace('<svg', '<svg width="20" height="20"') + esc(r[1]) + '</button>'; }).join('') +
      '<button class="item" data-cblock="' + esc(l.author) + '" style="color:var(--tomato)">' + t('block') + '<span></span></button></div>' +
      '<button class="btn big" data-sheetclose="1" style="background:var(--card);color:var(--ink)">' + t('cancel') + '</button>';
    $('sheet').classList.remove('hidden');
  }
  function postSheet() {
    if (!S.terms) {
      $('sheetBox').innerHTML = '<h3>' + t('termsTitle') + '</h3><p style="line-height:1.5">' + t('termsText') + '</p>' +
        '<button class="btn ghost" data-open="terms.html">' + t('termsLink') + '</button><div style="height:10px"></div>' +
        '<button class="btn big" data-cagree="1">' + t('agree') + '</button><div style="height:8px"></div><button class="btn big" data-sheetclose="1" style="background:var(--card);color:var(--ink)">' + t('cancel') + '</button>';
    } else {
      $('sheetBox').innerHTML = '<h3>' + t('postLine') + '</h3><textarea id="cp" maxlength="200"></textarea><p id="cperr" class="note" style="color:var(--tomato)"></p>' +
        '<button class="btn big" data-csend="1">' + t('send') + '</button><div style="height:8px"></div><button class="btn big" data-sheetclose="1" style="background:var(--card);color:var(--ink)">' + t('cancel') + '</button>';
    }
    $('sheet').classList.remove('hidden');
    var ta = $('cp'); if (ta) ta.focus();
  }
  function sendPost() {
    var ta = $('cp'), txt = ta.value.trim(), e = $('cperr'), E = t('err');
    if (txt.length < 8) { e.textContent = E.short; return; }
    e.textContent = t('loading');
    call('post', { text: txt }).then(function (r) {
      if (r.error) { e.textContent = E[r.why === 'short' ? 'short' : r.error] || E.filter; return; }
      closeSheet(); toast(t('posted')); C.sort = 'new'; C.lines = null; render();
    }).catch(function () { e.textContent = E.net; });
  }
  function doVote(id, v) {
    var l = findLine(id); if (!l) return;
    if (C.me && l.author === C.me.author) return toast(t('ownVote'));
    var nv = l.my === v ? 0 : v; haptic();
    l.score += nv - l.my; l.my = nv; render();
    call('vote', { id: id, v: nv }).then(function (r) { if (r.line) { l.score = r.line.score; l.my = r.line.my; render(); } }).catch(function () {});
  }

  var price = '';
  function paywall() {
    haptic();
    $('sheetBox').innerHTML = '<h3>' + t('proTitle') + '</h3><div style="color:var(--soft);font-weight:600">' + t('proSub') + '</div><ul>' +
      t('proList').map(function (x) { return '<li>' + ic('cheese') + esc(x) + '</li>'; }).join('') + '</ul>' +
      '<button class="btn big" data-buy="1">' + t('buy') + (price ? ' · ' + esc(price) : '') + '</button>' +
      '<div class="row" style="justify-content:center;margin-top:10px"><button class="btn ghost" data-restore="1">' + t('restore') + '</button>' +
      '<button class="btn ghost" data-sheetclose="1">' + t('later') + '</button></div>';
    $('sheet').classList.remove('hidden');
    post('prices');
  }
  function editor(text) {
    $('sheetBox').innerHTML = '<h3>' + t('editTitle') + '</h3><textarea id="ed">' + esc(text) + '</textarea>' +
      '<div class="row" style="margin-top:12px"><button class="btn" data-edcopy="1">' + ic('copy') + t('copy') + '</button>' +
      '<button class="btn" data-edshare="1">' + ic('share') + t('share') + '</button><button class="btn" data-edimg="1">' + ic('image') + t('card') + '</button>' +
      '<button class="btn" data-edfav="1">' + ic('heart') + t('fav') + '</button></div>' +
      '<div style="height:10px"></div><button class="btn big" data-sheetclose="1">' + t('done') + '</button>';
    $('sheet').classList.remove('hidden');
  }
  function closeSheet() { $('sheet').classList.add('hidden'); }

  function setPro(on) {
    var was = S.pro; S.pro = !!on; save();
    if (on && !was) { closeSheet(); toast(t('thanks')); }
    render();
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('button, .sheet-bg'); if (!b) return;
    var d = b.dataset || {};
    if (b.classList.contains('sheet-bg') || d.sheetclose) return closeSheet();
    if (b.id === 'proBadge' || d.pro) return S.pro ? null : paywall();
    if (d.tab) { tab = d.tab; haptic(); return render(); }
    if (d.cat != null) return openDeck(+d.cat);
    if (d.close) { deck = null; return render(); }
    if (d.step) return step(+d.step);
    if (d.copy != null) return copy(d.copy);
    if (d.share != null) return share(d.share);
    if (d.img != null) return shareImage(d.img);
    if (d.edit != null) return editor(d.edit);
    if (d.fav) { toggleFav(cats()[deck.ci].lines[deck.i]); return render(); }
    if (d.favtext != null) { toggleFav(d.favtext); return render(); }
    if (d.random) {
      var free = []; cats().forEach(function (c, i) { if (!c.pro || S.pro) free.push(i); });
      var ci = free[Math.floor(Math.random() * free.length)];
      return openDeck(ci, Math.floor(Math.random() * cats()[ci].lines.length));
    }
    if (d.g) { var kv = d.g.split(':'); G[kv[0]] = kv[1]; haptic(); return render(); }
    if (d.gen) return generate();
    if (d.csort) { C.sort = d.csort; C.lines = null; haptic(); return render(); }
    if (d.creload) { C.lines = null; C.err = false; return render(); }
    if (d.cpost) return postSheet();
    if (d.cagree) { S.terms = true; save(); return postSheet(); }
    if (d.csend) return sendPost();
    if (d.vote) { var vv = d.vote.split(':'); return doVote(+vv[0], +vv[1]); }
    if (d.cmenu) return commMenu(d.cmenu);
    if (d.creport) { var rr = d.creport.split(':'); call('report', { id: +rr[0], reason: rr[1] }).catch(function () {}); C.lines = (C.lines || []).filter(function (l) { return l.id !== +rr[0]; }); closeSheet(); toast(t('reported')); return render(); }
    if (d.cblock) { if (S.blocked.indexOf(d.cblock) < 0) S.blocked.push(d.cblock); save(); C.lines = (C.lines || []).filter(function (l) { return l.author !== d.cblock; }); closeSheet(); toast(t('blocked')); return render(); }
    if (d.unblock) { S.blocked = []; save(); C.lines = null; return render(); }
    if (d.lang) { S.lang = S.lang === 'de' ? 'en' : 'de'; document.documentElement.lang = S.lang; G.out = null; C.lines = null; save(); return render(); }
    if (d.buy) { if (native) post('buy', 'pro'); else toast(t('buyErr')); return; }
    if (d.restore) { if (native) post('restore'); return; }
    if (d.open) { if (native) post('open', d.open); else window.open(d.open, '_blank'); return; }
    var ed = $('ed');
    if (ed) {
      if (d.edcopy) return copy(ed.value);
      if (d.edshare) return share(ed.value);
      if (d.edimg) return shareImage(ed.value);
      if (d.edfav) { if (!isFav(ed.value)) toggleFav(ed.value); return; }
    }
  });

  window.klNative = {
    pro: function (on) { setPro(on); },
    price: function (p) { price = p; },
    toast: function (k) { toast(T[S.lang][k] || k); }
  };
  window.kl = { comm: C, state: function () { return S; }, setPro: setPro, open: openDeck, generate: generate, renderCard: renderCard, tab: function (x) { tab = x; deck = null; render(); } };

  document.documentElement.lang = S.lang;
  render();
  post('ready');
})();
