'use strict';
// Samsung TV remote layer: arrow keys move focus between buttons, OK clicks, Back closes or exits.
(function () {
  var KEY = { 37: 'left', 38: 'up', 39: 'right', 40: 'down', 13: 'ok', 10009: 'back', 27: 'back', 8: 'back' };
  var SEL = 'button, .btn, [data-tv], a[href]';
  var cur = null, mainFocus = null;
  try { tizen.tvinputdevice.registerKey('MediaPlayPause'); } catch (e) {}

  function visible(el) {
    if (el.disabled) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    var s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && s.pointerEvents !== 'none';
  }
  function scope() {
    var m = document.querySelector((window.TV_MODAL || '#modal') + ':not(.hidden)');
    return m && visible(m) ? m : document;
  }
  function items() { return Array.prototype.filter.call(scope().querySelectorAll(SEL), visible); }
  function center(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function focus(el) {
    if (cur) cur.classList.remove('tv-focus');
    cur = el;
    if (!el) return;
    el.classList.add('tv-focus');
    if (scope() === document) mainFocus = el;
    if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }
  function first(list) {
    var pref = window.TV_DEFAULT && document.querySelector(window.TV_DEFAULT);
    if (pref && list.indexOf(pref) >= 0) return pref;
    return list[0] || null;
  }
  function move(dir) {
    var list = items();
    if (!cur || list.indexOf(cur) < 0) return focus(first(list));
    var a = center(cur), best = null, bestScore = 1e9;
    list.forEach(function (el) {
      if (el === cur) return;
      var b = center(el), dx = b.x - a.x, dy = b.y - a.y;
      var main = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy;
      var side = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
      if (main <= 1) return;
      var score = main + side * 2.5;
      if (score < bestScore) { bestScore = score; best = el; }
    });
    if (best) focus(best);
  }
  function back() {
    var m = scope();
    if (m !== document) {
      var x = m.querySelector('.x, .close, [data-tv-back]');
      if (x) return x.click();
      if (window.TV_CLOSE) return window.TV_CLOSE();
      return;
    }
    if (window.TV_BACK && window.TV_BACK()) return;
    try { tizen.application.getCurrentApplication().exit(); } catch (e) { window.close(); }
  }
  document.addEventListener('keydown', function (e) {
    var k = KEY[e.keyCode];
    if (!k) return;
    e.preventDefault();
    if (k === 'back') return back();
    if (k === 'ok') {
      if (!cur || items().indexOf(cur) < 0) return focus(first(items()));
      return cur.click();
    }
    move(k);
  });
  // keep focus valid when screens change
  setInterval(function () {
    var list = items();
    if (cur && list.indexOf(cur) >= 0) return;
    if (scope() === document) {
      if (mainFocus && list.indexOf(mainFocus) >= 0) return focus(mainFocus);
      var pref = window.TV_DEFAULT && document.querySelector(window.TV_DEFAULT);
      if (pref && document.contains(pref) && list.indexOf(pref) < 0) return; // default is busy (e.g. disabled while rolling): wait
    }
    focus(first(list));
  }, 200);
  if (window.TV_HINT) document.addEventListener('DOMContentLoaded', function () {
    var d = document.createElement('div'); d.id = 'tv-hint'; d.textContent = window.TV_HINT; document.body.appendChild(d);
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden && window.TV_PAUSE) window.TV_PAUSE(); });
})();
