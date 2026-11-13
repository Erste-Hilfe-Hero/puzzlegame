(function () {
  "use strict";
  // Two players face to face over one unfolded phone: player 0 sits at the left edge, player 1 at the right edge.
  // Text for a player is rotated toward their edge. The fold runs down the middle (x = 710).
  var W = 1420, H = 1000, MID = 710;
  var DE = /^de/i.test(navigator.language || "");
  var TR = { "Your turn": "Du bist dran", "Wait...": "Warte...", "You win!": "Gewonnen!", "You lose": "Verloren", "Draw!": "Unentschieden!",
    "Wins": "Siege", "Tap for a rematch": "Tippen f\u00fcr Revanche", "First to ": "Wer zuerst ", "You must capture!": "Du musst schlagen!",
    "Check!": "Schach!", "Roll": "W\u00fcrfeln", "No moves": "Kein Zug m\u00f6glich", "No more moves": "Keine Z\u00fcge mehr", "Off ": "Raus ",
    "Sit face to face. Pick a game.": "Setzt euch gegen\u00fcber. W\u00e4hlt ein Spiel.", "Red": "Rot", "Blue": "Blau",
    "Four in a Row": "Vier gewinnt", "Checkers": "Dame", "Dots & Boxes": "K\u00e4sek\u00e4stchen", "Chess": "Schach" };
  function L(s) { return DE && TR[s] ? TR[s] : s; }
  var PC = ["#ef5b3c", "#3c8cf0"], PD = ["#a8341c", "#1f5aa8"], PNAME = [L("Red"), L("Blue")];
  var cv = document.getElementById("c"), ctx = cv.getContext("2d");
  var dpr = 1, scale = 1, ox = 0, oy = 0, cw = 0, ch = 0, t = 0;
  var state = "menu", game = null, gameName = "", starter = 0;
  var wins = load();

  function load() { try { return JSON.parse(localStorage.getItem("twotable") || "{}"); } catch (e) { return {}; } }
  function persist() { try { localStorage.setItem("twotable", JSON.stringify(wins)); } catch (e) {} }

  // ---------- audio / haptics ----------
  var ac = null;
  function tone(f, d, type, vol, slide) {
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      var o = ac.createOscillator(), g = ac.createGain(), n = ac.currentTime;
      o.type = type || "sine"; o.frequency.setValueAtTime(f, n);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, n + d);
      g.gain.setValueAtTime(vol || 0.12, n); g.gain.exponentialRampToValueAtTime(0.001, n + d);
      o.connect(g); g.connect(ac.destination); o.start(n); o.stop(n + d);
    } catch (e) {}
  }
  function haptic(k) { try { window.webkit.messageHandlers.haptic.postMessage(k); } catch (e) {} }
  var sfx = {
    tap: function () { tone(660, 0.06, "triangle", 0.1); },
    drop: function () { tone(220, 0.12, "triangle", 0.14, 140); haptic("tap"); },
    hit: function (v) { tone(300 + Math.min(500, v / 4), 0.05, "square", 0.06); haptic("tap"); },
    goal: function () { [392, 523, 659].forEach(function (f, i) { setTimeout(function () { tone(f, 0.2, "sine", 0.14); }, i * 90); }); haptic("win"); },
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { tone(f, 0.25, "sine", 0.14); }, i * 110); }); haptic("win"); }
  };

  // ---------- drawing helpers ----------
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function circle(x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = fill; ctx.fill(); }
  // text upright for player p: p0 reads from the left edge, p1 from the right edge
  function ptext(p, s, x, y, size, color, weight) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(p === 0 ? Math.PI / 2 : -Math.PI / 2);
    ctx.font = (weight || "bold") + " " + size + "px -apple-system, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = color || "#fff"; ctx.fillText(s, 0, 0);
    ctx.restore();
  }
  function text(s, x, y, size, color) {
    ctx.font = "bold " + size + "px -apple-system, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = color || "#fff"; ctx.fillText(s, x, y);
  }
  function table() {
    // felt covers the whole screen, also outside the 1420x1000 play area on wider phones
    var g = ctx.createRadialGradient(MID, H / 2, 100, MID, H / 2, Math.max(900, cw / scale * 0.7));
    g.addColorStop(0, "#2f6b4c"); g.addColorStop(1, "#173a2a");
    ctx.fillStyle = g; ctx.fillRect(-ox / scale, -oy / scale, cw / scale, ch / scale);
  }
  function homeButton() {
    circle(MID, 34, 24, "rgba(0,0,0,0.35)");
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(MID - 11, 37); ctx.lineTo(MID, 25); ctx.lineTo(MID + 11, 37); ctx.moveTo(MID - 7, 34); ctx.lineTo(MID - 7, 45); ctx.lineTo(MID + 7, 45); ctx.lineTo(MID + 7, 34); ctx.stroke();
  }
  function scoreSide(p, s) { ptext(p, s, p === 0 ? 22 : W - 22, H / 2, 30, "#fff"); }
  function turnGlow(p) {
    var x = p === 0 ? -ox / scale : W + ox / scale - 14, a = 0.55 + 0.35 * Math.sin(t * 5);
    ctx.fillStyle = PC[p]; ctx.globalAlpha = a; ctx.fillRect(x, 0, 14, H); ctx.globalAlpha = 1;
    ptext(p, L("Your turn"), p === 0 ? 46 : W - 46, H / 2 + 230, 26, PC[p]);
    ptext(1 - p, L("Wait..."), p === 0 ? W - 46 : 46, H / 2 + 230, 22, "rgba(255,255,255,0.45)", "normal");
  }

  // ---------- result overlay ----------
  var result = null; // {winner: 0|1|-1, t}
  function finish(winner) {
    if (result) return;
    result = { winner: winner, t: 0 };
    if (winner >= 0) { wins[gameName] = wins[gameName] || [0, 0]; wins[gameName][winner]++; persist(); }
    sfx.win();
  }
  function drawResult() {
    if (!result) return;
    ctx.fillStyle = "rgba(0,0,0," + Math.min(0.55, result.t) + ")"; ctx.fillRect(0, 0, W, H);
    for (var p = 0; p < 2; p++) {
      var x = p === 0 ? 300 : W - 300, msg = result.winner === -1 ? L("Draw!") : result.winner === p ? L("You win!") : L("You lose");
      ptext(p, msg, x, H / 2, 86, result.winner === p ? PC[p] : "#fff");
      var w = wins[gameName] || [0, 0];
      ptext(p, L("Wins") + "  " + w[p] + " : " + w[1 - p], x + (p === 0 ? -100 : 100), H / 2, 34, "#fff", "normal");
      if (result.t > 0.8) ptext(p, L("Tap for a rematch"), x + (p === 0 ? -160 : 160), H / 2, 28, "rgba(255,255,255,0.75)", "normal");
    }
  }

  // ---------- AIR HOCKEY ----------
  function AirHockey() {
    var T = { x0: 40, x1: 1380, y0: 70, y1: 930 }, GY0 = 380, GY1 = 620, R = 50, PR = 30, TO = 7;
    var m = [{ x: 200, y: 500, tx: 200, ty: 500, vx: 0, vy: 0 }, { x: 1220, y: 500, tx: 1220, ty: 500, vx: 0, vy: 0 }];
    var puck = { x: MID - 160, y: 500, vx: 0, vy: 0 }, score = [0, 0], pause = 0.6, owner = {}, flash = 0, stuck = 0;
    function reset(to) { puck.x = to === 0 ? MID - 160 : MID + 160; puck.y = 500; puck.vx = puck.vy = 0; pause = 0.9; }
    function limit(p, x, y) {
      var lo = p === 0 ? T.x0 + R : MID + R + 10, hi = p === 0 ? MID - R - 10 : T.x1 - R;
      return [clamp(x, lo, hi), clamp(y, T.y0 + R, T.y1 - R)];
    }
    return {
      down: function (p, id) { var who = p.x < MID ? 0 : 1; owner[id] = who; var l = limit(who, p.x, p.y); m[who].tx = l[0]; m[who].ty = l[1]; },
      move: function (p, id) { var who = owner[id]; if (who == null) return; var l = limit(who, p.x, p.y); m[who].tx = l[0]; m[who].ty = l[1]; },
      up: function (p, id) { delete owner[id]; },
      update: function (dt) {
        flash = Math.max(0, flash - dt);
        // a puck resting on the center line can be out of reach (or pinned between mallets): give it a push
        if (pause <= 0 && Math.abs(puck.x - MID) < 100 && Math.hypot(puck.vx, puck.vy) < 40) stuck += dt; else stuck = 0;
        if (stuck > 1.2) { stuck = 0; puck.vx = (puck.x < MID ? -1 : 1) * 260; puck.vy = (puck.y < 500 ? 1 : -1) * 160; }
        var steps = 4, h = dt / steps;
        for (var s = 0; s < steps; s++) {
          m.forEach(function (k) {
            var nx = k.x + (k.tx - k.x) * Math.min(1, h * 40), ny = k.y + (k.ty - k.y) * Math.min(1, h * 40);
            k.vx = (nx - k.x) / h; k.vy = (ny - k.y) / h; k.x = nx; k.y = ny;
          });
          if (pause > 0) { pause -= h; continue; }
          puck.x += puck.vx * h; puck.y += puck.vy * h;
          var f = Math.pow(0.8, h); puck.vx *= f; puck.vy *= f;
          if (puck.y < T.y0 + PR) { puck.y = T.y0 + PR; puck.vy = Math.abs(puck.vy) * 0.9; }
          if (puck.y > T.y1 - PR) { puck.y = T.y1 - PR; puck.vy = -Math.abs(puck.vy) * 0.9; }
          var inGoal = puck.y > GY0 + PR * 0.4 && puck.y < GY1 - PR * 0.4;
          if (!inGoal) {
            if (puck.x < T.x0 + PR) { puck.x = T.x0 + PR; puck.vx = Math.abs(puck.vx) * 0.9; }
            if (puck.x > T.x1 - PR) { puck.x = T.x1 - PR; puck.vx = -Math.abs(puck.vx) * 0.9; }
          } else if (puck.x < T.x0 - PR || puck.x > T.x1 + PR) {
            var scorer = puck.x < T.x0 ? 1 : 0;
            score[scorer]++; flash = 0.8; sfx.goal();
            if (score[scorer] >= TO) { finish(scorer); pause = 99; } else reset(1 - scorer);
            return;
          }
          m.forEach(function (k) {
            var dx = puck.x - k.x, dy = puck.y - k.y, d = Math.hypot(dx, dy);
            if (d < R + PR && d > 0) {
              var nx = dx / d, ny = dy / d;
              puck.x = k.x + nx * (R + PR); puck.y = k.y + ny * (R + PR);
              var rvx = puck.vx - k.vx, rvy = puck.vy - k.vy, vn = rvx * nx + rvy * ny;
              if (vn < 0) { puck.vx -= 1.9 * vn * nx; puck.vy -= 1.9 * vn * ny; sfx.hit(-vn); }
              var sp = Math.hypot(puck.vx, puck.vy);
              if (sp > 2600) { puck.vx *= 2600 / sp; puck.vy *= 2600 / sp; }
            }
          });
        }
      },
      draw: function () {
        table();
        rr(T.x0 - 18, T.y0 - 18, T.x1 - T.x0 + 36, T.y1 - T.y0 + 36, 60); ctx.fillStyle = "#e9eef2"; ctx.fill();
        rr(T.x0, T.y0, T.x1 - T.x0, T.y1 - T.y0, 46); ctx.fillStyle = "#d6eaf6"; ctx.fill();
        ctx.strokeStyle = "rgba(60,140,240,0.5)"; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(MID, T.y0); ctx.lineTo(MID, T.y1); ctx.stroke();
        ctx.beginPath(); ctx.arc(MID, 500, 110, 0, 7); ctx.stroke();
        ctx.strokeStyle = "rgba(239,91,60,0.5)";
        ctx.beginPath(); ctx.arc(T.x0, 500, 170, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        ctx.strokeStyle = "rgba(60,140,240,0.5)";
        ctx.beginPath(); ctx.arc(T.x1, 500, 170, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
        ctx.fillStyle = "#26323a"; ctx.fillRect(T.x0 - 18, GY0, 18, GY1 - GY0); ctx.fillRect(T.x1, GY0, 18, GY1 - GY0);
        ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.arc(puck.x + 6, puck.y + 8, PR, 0, 7); ctx.fill();
        circle(puck.x, puck.y, PR, "#1d1f24"); circle(puck.x, puck.y, PR - 8, "#33363d");
        m.forEach(function (k, i) {
          ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.arc(k.x + 6, k.y + 9, R, 0, 7); ctx.fill();
          circle(k.x, k.y, R, PD[i]); circle(k.x, k.y, R - 8, PC[i]); circle(k.x, k.y, 20, PD[i]); circle(k.x - 5, k.y - 5, 12, "rgba(255,255,255,0.35)");
        });
        for (var p = 0; p < 2; p++) {
          ptext(p, String(score[p]), p === 0 ? MID - 90 : MID + 90, 500, 110, p === 0 ? "rgba(239,91,60,0.28)" : "rgba(60,140,240,0.28)");
          ptext(p, L("First to ") + TO, p === 0 ? 20 : W - 20, 500, 22, "rgba(255,255,255,0.7)", "normal");
        }
        if (flash > 0) { ctx.fillStyle = "rgba(255,255,255," + flash * 0.4 + ")"; ctx.fillRect(0, 0, W, H); }
      },
      state: function () { return { score: score.slice(), puck: [puck.x, puck.y] }; }
    };
  }

  // ---------- FOUR IN A ROW ----------
  function FourRow() {
    var C = 7, Rw = 6, S = 112, x0 = MID - C * S / 2, y0 = 500 - Rw * S / 2 + 10;
    var b = [], turn = starter, falling = null, line = null, moves = 0;
    for (var r = 0; r < Rw; r++) b.push(new Array(C).fill(-1));
    function check(r, c, p) {
      var dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
      for (var i = 0; i < 4; i++) {
        var cells = [[r, c]];
        for (var sgn = -1; sgn <= 1; sgn += 2) {
          var rr2 = r + dirs[i][0] * sgn, cc = c + dirs[i][1] * sgn;
          while (rr2 >= 0 && rr2 < Rw && cc >= 0 && cc < C && b[rr2][cc] === p) { cells.push([rr2, cc]); rr2 += dirs[i][0] * sgn; cc += dirs[i][1] * sgn; }
        }
        if (cells.length >= 4) return cells;
      }
      return null;
    }
    function play(c) {
      if (falling || result || c < 0 || c >= C) return false;
      var r = Rw - 1; while (r >= 0 && b[r][c] !== -1) r--;
      if (r < 0) return false;
      falling = { c: c, r: r, y: y0 - S, p: turn, vy: 0 };
      return true;
    }
    return {
      down: function (p) { if (p.y > y0 - S && p.y < y0 + Rw * S + 20) play(Math.floor((p.x - x0) / S)); },
      move: function () {}, up: function () {},
      update: function (dt) {
        if (!falling) return;
        falling.vy += 4200 * dt; falling.y += falling.vy * dt;
        var ty = y0 + falling.r * S + S / 2;
        if (falling.y >= ty) {
          b[falling.r][falling.c] = falling.p; moves++; sfx.drop();
          line = check(falling.r, falling.c, falling.p);
          var p = falling.p; falling = null;
          if (line) finish(p); else if (moves === C * Rw) finish(-1); else turn = 1 - turn;
        }
      },
      draw: function () {
        table(); homeButton();
        if (!result) turnGlow(turn);
        if (falling) circle(x0 + falling.c * S + S / 2, falling.y, S * 0.4, PC[falling.p]);
        rr(x0 - 20, y0 - 20, C * S + 40, Rw * S + 40, 30); ctx.fillStyle = "#f2c230"; ctx.fill();
        for (var r = 0; r < Rw; r++) for (var c = 0; c < C; c++) {
          var x = x0 + c * S + S / 2, y = y0 + r * S + S / 2, v = b[r][c];
          circle(x, y, S * 0.4, v === -1 ? "#173a2a" : PD[v]);
          if (v !== -1) { circle(x, y, S * 0.34, PC[v]); circle(x - 10, y - 10, 10, "rgba(255,255,255,0.3)"); }
        }
        if (line) line.forEach(function (q) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x0 + q[1] * S + S / 2, y0 + q[0] * S + S / 2, S * 0.36, 0, 7); ctx.stroke(); });
        scoreSide(0, PNAME[0]); scoreSide(1, PNAME[1]);
      },
      // test helpers
      legal: function () { var o = []; for (var c = 0; c < C; c++) if (b[0][c] === -1) o.push(c); return o; },
      play: play, busy: function () { return !!falling; }, turn: function () { return turn; }
    };
  }

  // ---------- CHECKERS ----------
  function Checkers() {
    var N = 8, S = 108, x0 = MID - N * S / 2, y0 = 500 - N * S / 2;
    var b = [], turn = starter, sel = null, chain = null, last = null;
    for (var r = 0; r < N; r++) { b.push([]); for (var c = 0; c < N; c++) b[r].push((r + c) % 2 === 1 && c <= 2 ? { p: 0, k: false } : (r + c) % 2 === 1 && c >= 5 ? { p: 1, k: false } : null); }
    function inb(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
    function dirs(pc) { var f = pc.p === 0 ? 1 : -1; return pc.k ? [[1, 1], [-1, 1], [1, -1], [-1, -1]] : [[1, f], [-1, f]]; }
    function caps(r, c) {
      var pc = b[r][c], o = [];
      dirs(pc).forEach(function (d) { var mr = r + d[0], mc = c + d[1], lr = r + 2 * d[0], lc = c + 2 * d[1]; if (inb(lr, lc) && b[mr][mc] && b[mr][mc].p !== pc.p && !b[lr][lc]) o.push([lr, lc, mr, mc]); });
      return o;
    }
    function steps(r, c) {
      var pc = b[r][c], o = [];
      dirs(pc).forEach(function (d) { var lr = r + d[0], lc = c + d[1]; if (inb(lr, lc) && !b[lr][lc]) o.push([lr, lc]); });
      return o;
    }
    function anyCap(p) { for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (b[r][c] && b[r][c].p === p && caps(r, c).length) return true; return false; }
    function movesFor(r, c) {
      if (chain) return chain[0] === r && chain[1] === c ? caps(r, c) : [];
      return anyCap(turn) ? caps(r, c) : steps(r, c);
    }
    function allMoves(p) {
      var o = [];
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (b[r][c] && b[r][c].p === p) movesFor(r, c).forEach(function (m) { o.push([r, c, m]); });
      return o;
    }
    function apply(r, c, m) {
      var pc = b[r][c]; b[m[0]][m[1]] = pc; b[r][c] = null; last = [r, c, m[0], m[1]];
      var crowned = false;
      if (!pc.k && ((pc.p === 0 && m[1] === N - 1) || (pc.p === 1 && m[1] === 0))) { pc.k = true; crowned = true; }
      sfx.drop();
      if (m.length === 4) {
        b[m[2]][m[3]] = null;
        if (!crowned && caps(m[0], m[1]).length) { chain = [m[0], m[1]]; sel = [m[0], m[1]]; return; }
      }
      chain = null; sel = null; turn = 1 - turn;
      if (!allMoves(turn).length) finish(1 - turn);
    }
    function count(p) { var n = 0; b.forEach(function (row) { row.forEach(function (q) { if (q && q.p === p) n++; }); }); return n; }
    return {
      down: function (pt) {
        if (result) return;
        var c = Math.floor((pt.x - x0) / S), r = Math.floor((pt.y - y0) / S);
        if (!inb(r, c)) return;
        if (sel) {
          var mv = movesFor(sel[0], sel[1]).filter(function (m) { return m[0] === r && m[1] === c; })[0];
          if (mv) { apply(sel[0], sel[1], mv); return; }
        }
        if (!chain && b[r][c] && b[r][c].p === turn && movesFor(r, c).length) { sel = [r, c]; sfx.tap(); }
      },
      move: function () {}, up: function () {}, update: function () {},
      draw: function () {
        table(); homeButton();
        if (!result) turnGlow(turn);
        rr(x0 - 22, y0 - 22, N * S + 44, N * S + 44, 18); ctx.fillStyle = "#5a3920"; ctx.fill();
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
          ctx.fillStyle = (r + c) % 2 ? "#7a5233" : "#e8d3ad"; ctx.fillRect(x0 + c * S, y0 + r * S, S, S);
        }
        if (last) { ctx.fillStyle = "rgba(255,230,120,0.25)"; [[last[0], last[1]], [last[2], last[3]]].forEach(function (q) { ctx.fillRect(x0 + q[1] * S, y0 + q[0] * S, S, S); }); }
        var hint = sel ? movesFor(sel[0], sel[1]) : [];
        for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
          var q = b[r][c]; if (!q) continue;
          var x = x0 + c * S + S / 2, y = y0 + r * S + S / 2;
          ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.arc(x + 4, y + 6, S * 0.4, 0, 7); ctx.fill();
          circle(x, y, S * 0.4, PD[q.p]); circle(x, y, S * 0.32, PC[q.p]);
          ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, S * 0.22, 0, 7); ctx.stroke();
          if (q.k) { ctx.save(); ctx.translate(x, y); ctx.rotate(q.p === 0 ? Math.PI / 2 : -Math.PI / 2); ctx.fillStyle = "#ffd84a"; ctx.beginPath(); ctx.moveTo(-20, 10); ctx.lineTo(-20, -8); ctx.lineTo(-10, 2); ctx.lineTo(0, -14); ctx.lineTo(10, 2); ctx.lineTo(20, -8); ctx.lineTo(20, 10); ctx.closePath(); ctx.fill(); ctx.restore(); }
          if (sel && sel[0] === r && sel[1] === c) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, S * 0.45, 0, 7); ctx.stroke(); }
        }
        hint.forEach(function (m) { circle(x0 + m[1] * S + S / 2, y0 + m[0] * S + S / 2, 16, "rgba(255,255,255,0.75)"); });
        scoreSide(0, PNAME[0] + "  " + count(0)); scoreSide(1, PNAME[1] + "  " + count(1));
        if (!result && anyCap(turn)) ptext(turn, L("You must capture!"), turn === 0 ? 76 : W - 76, H / 2 + 230, 22, "#ffd84a");
      },
      legal: function () { return allMoves(turn); }, playMove: function (mv) { apply(mv[0], mv[1], mv[2]); }, turn: function () { return turn; }
    };
  }

  // ---------- DOTS AND BOXES ----------
  function Dots() {
    var BC = 6, BR = 5, S = 130, x0 = MID - BC * S / 2, y0 = 500 - BR * S / 2 + 10;
    var hz = [], vt = [], box = [], turn = starter, score = [0, 0], lastE = null;
    for (var r = 0; r <= BR; r++) hz.push(new Array(BC).fill(-1));
    for (r = 0; r < BR; r++) vt.push(new Array(BC + 1).fill(-1));
    for (r = 0; r < BR; r++) box.push(new Array(BC).fill(-1));
    function closed(r, c) { return hz[r][c] >= 0 && hz[r + 1][c] >= 0 && vt[r][c] >= 0 && vt[r][c + 1] >= 0; }
    function take(kind, r, c) {
      if (result) return false;
      var arr = kind === "h" ? hz : vt;
      if (arr[r][c] >= 0) return false;
      arr[r][c] = turn; lastE = [kind, r, c]; sfx.tap();
      var got = 0, cand = kind === "h" ? [[r - 1, c], [r, c]] : [[r, c - 1], [r, c]];
      cand.forEach(function (q) { if (q[0] >= 0 && q[0] < BR && q[1] >= 0 && q[1] < BC && box[q[0]][q[1]] < 0 && closed(q[0], q[1])) { box[q[0]][q[1]] = turn; got++; } });
      if (got) { score[turn] += got; sfx.drop(); } else turn = 1 - turn;
      if (score[0] + score[1] === BC * BR) finish(score[0] === score[1] ? -1 : score[0] > score[1] ? 0 : 1);
      return true;
    }
    return {
      down: function (p) {
        var best = null, bd = 50;
        for (var r = 0; r <= BR; r++) for (var c = 0; c < BC; c++) { var d = Math.hypot(p.x - (x0 + c * S + S / 2), p.y - (y0 + r * S)); if (d < bd && hz[r][c] < 0) { bd = d; best = ["h", r, c]; } }
        for (r = 0; r < BR; r++) for (c = 0; c <= BC; c++) { d = Math.hypot(p.x - (x0 + c * S), p.y - (y0 + r * S + S / 2)); if (d < bd && vt[r][c] < 0) { bd = d; best = ["v", r, c]; } }
        if (best) take(best[0], best[1], best[2]);
      },
      move: function () {}, up: function () {}, update: function () {},
      draw: function () {
        table(); homeButton();
        if (!result) turnGlow(turn);
        rr(x0 - 40, y0 - 40, BC * S + 80, BR * S + 80, 24); ctx.fillStyle = "#f4efe3"; ctx.fill();
        for (var r = 0; r < BR; r++) for (var c = 0; c < BC; c++) if (box[r][c] >= 0) {
          ctx.fillStyle = PC[box[r][c]]; ctx.globalAlpha = 0.35; ctx.fillRect(x0 + c * S + 6, y0 + r * S + 6, S - 12, S - 12); ctx.globalAlpha = 1;
          ctx.save(); ctx.translate(x0 + c * S + S / 2, y0 + r * S + S / 2); ctx.rotate(box[r][c] === 0 ? Math.PI / 2 : -Math.PI / 2);
          ctx.font = "bold 50px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = PD[box[r][c]]; ctx.fillText(box[r][c] === 0 ? "R" : "B", 0, 0); ctx.restore();
        }
        ctx.lineCap = "round";
        for (r = 0; r <= BR; r++) for (c = 0; c < BC; c++) { var v = hz[r][c]; ctx.strokeStyle = v < 0 ? "rgba(0,0,0,0.08)" : PC[v]; ctx.lineWidth = v < 0 ? 4 : 12; ctx.beginPath(); ctx.moveTo(x0 + c * S, y0 + r * S); ctx.lineTo(x0 + (c + 1) * S, y0 + r * S); ctx.stroke(); }
        for (r = 0; r < BR; r++) for (c = 0; c <= BC; c++) { v = vt[r][c]; ctx.strokeStyle = v < 0 ? "rgba(0,0,0,0.08)" : PC[v]; ctx.lineWidth = v < 0 ? 4 : 12; ctx.beginPath(); ctx.moveTo(x0 + c * S, y0 + r * S); ctx.lineTo(x0 + c * S, y0 + (r + 1) * S); ctx.stroke(); }
        if (lastE) { var e = lastE; ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 4; ctx.beginPath(); if (e[0] === "h") { ctx.moveTo(x0 + e[2] * S + 20, y0 + e[1] * S); ctx.lineTo(x0 + (e[2] + 1) * S - 20, y0 + e[1] * S); } else { ctx.moveTo(x0 + e[2] * S, y0 + e[1] * S + 20); ctx.lineTo(x0 + e[2] * S, y0 + (e[1] + 1) * S - 20); } ctx.stroke(); }
        ctx.lineCap = "butt";
        for (r = 0; r <= BR; r++) for (c = 0; c <= BC; c++) circle(x0 + c * S, y0 + r * S, 10, "#2b2b2b");
        scoreSide(0, PNAME[0] + "  " + score[0]); scoreSide(1, PNAME[1] + "  " + score[1]);
      },
      legal: function () { var o = []; for (var r = 0; r <= BR; r++) for (var c = 0; c < BC; c++) if (hz[r][c] < 0) o.push(["h", r, c]); for (r = 0; r < BR; r++) for (c = 0; c <= BC; c++) if (vt[r][c] < 0) o.push(["v", r, c]); return o; },
      take: take
    };
  }

  // ---------- CHESS ----------
  // Red's back rank is the left column (c = 0) and moves toward +c; Blue's back rank is c = 7.
  function Chess() {
    var N = 8, S = 108, x0 = MID - N * S / 2, y0 = 500 - N * S / 2;
    var ORDER = ["r", "n", "b", "q", "k", "b", "n", "r"], GLYPH = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
    var b = [], turn = starter, sel = null, ep = null, last = null, captured = [[], []];
    for (var r = 0; r < N; r++) b.push(new Array(N).fill(null));
    for (r = 0; r < N; r++) {
      b[r][0] = { p: 0, t: ORDER[r], m: false }; b[r][1] = { p: 0, t: "p", m: false };
      b[r][7] = { p: 1, t: ORDER[r], m: false }; b[r][6] = { p: 1, t: "p", m: false };
    }
    function inb(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
    function fwd(p) { return p === 0 ? 1 : -1; }
    function attacked(bd, r, c, by) {
      for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) {
        var q = bd[i][j]; if (!q || q.p !== by) continue;
        var dr = r - i, dc = c - j, ar = Math.abs(dr), acc = Math.abs(dc);
        if (q.t === "p") { if (dc === fwd(by) && ar === 1) return true; continue; }
        if (q.t === "n") { if ((ar === 1 && acc === 2) || (ar === 2 && acc === 1)) return true; continue; }
        if (q.t === "k") { if (ar <= 1 && acc <= 1 && (ar || acc)) return true; continue; }
        var straight = dr === 0 || dc === 0, diag = ar === acc;
        if (!(ar || acc)) continue;
        if ((q.t === "r" && !straight) || (q.t === "b" && !diag) || (q.t === "q" && !straight && !diag)) continue;
        var sr = Math.sign(dr), sc = Math.sign(dc), rr2 = i + sr, cc = j + sc, clear = true;
        while (rr2 !== r || cc !== c) { if (bd[rr2][cc]) { clear = false; break; } rr2 += sr; cc += sc; }
        if (clear) return true;
      }
      return false;
    }
    function kingPos(bd, p) { for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) if (bd[i][j] && bd[i][j].p === p && bd[i][j].t === "k") return [i, j]; return null; }
    function inCheck(bd, p) { var k = kingPos(bd, p); return k && attacked(bd, k[0], k[1], 1 - p); }
    function pseudo(r, c) {
      var q = b[r][c], o = [], f = fwd(q.p);
      function slide(dirs, once) {
        dirs.forEach(function (d) {
          var rr2 = r + d[0], cc = c + d[1];
          while (inb(rr2, cc)) {
            if (b[rr2][cc]) { if (b[rr2][cc].p !== q.p) o.push([rr2, cc]); break; }
            o.push([rr2, cc]); if (once) break; rr2 += d[0]; cc += d[1];
          }
        });
      }
      var ST = [[1, 0], [-1, 0], [0, 1], [0, -1]], DG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      if (q.t === "p") {
        if (inb(r, c + f) && !b[r][c + f]) { o.push([r, c + f]); if (!q.m && !b[r][c + 2 * f]) o.push([r, c + 2 * f, "double"]); }
        [-1, 1].forEach(function (dr) {
          var rr2 = r + dr, cc = c + f; if (!inb(rr2, cc)) return;
          if (b[rr2][cc] && b[rr2][cc].p !== q.p) o.push([rr2, cc]);
          if (ep && ep[0] === rr2 && ep[1] === cc) o.push([rr2, cc, "ep"]);
        });
      } else if (q.t === "n") slide([[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]], true);
      else if (q.t === "b") slide(DG);
      else if (q.t === "r") slide(ST);
      else if (q.t === "q") slide(ST.concat(DG));
      else if (q.t === "k") {
        slide(ST.concat(DG), true);
        if (!q.m && !inCheck(b, q.p)) {
          [[0, -1], [7, 1]].forEach(function (rk) {
            var rook = b[rk[0]][c]; if (!rook || rook.t !== "r" || rook.m || rook.p !== q.p) return;
            for (var i = Math.min(r, rk[0]) + 1; i < Math.max(r, rk[0]); i++) if (b[i][c]) return;
            if (attacked(b, r + rk[1], c, 1 - q.p) || attacked(b, r + 2 * rk[1], c, 1 - q.p)) return;
            o.push([r + 2 * rk[1], c, "castle", rk[0]]);
          });
        }
      }
      return o;
    }
    function simulate(r, c, m) {
      var bd = b.map(function (row) { return row.slice(); }), q = bd[r][c];
      bd[m[0]][m[1]] = q; bd[r][c] = null;
      if (m[2] === "ep") bd[m[0]][c] = null;
      if (m[2] === "castle") { bd[m[0] - Math.sign(m[0] - r)][c] = bd[m[3]][c]; bd[m[3]][c] = null; }
      return bd;
    }
    function legal(r, c) { var q = b[r][c]; return pseudo(r, c).filter(function (m) { return !inCheck(simulate(r, c, m), q.p); }); }
    function allLegal(p) { var o = []; for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) if (b[i][j] && b[i][j].p === p) legal(i, j).forEach(function (m) { o.push([i, j, m]); }); return o; }
    function apply(r, c, m) {
      var q = b[r][c], victim = m[2] === "ep" ? b[m[0]][c] : b[m[0]][m[1]];
      if (victim) captured[q.p].push(victim.t);
      b = simulate(r, c, m); q.m = true;
      if (m[2] === "castle") b[m[0] - Math.sign(m[0] - r)][c].m = true;
      if (q.t === "p" && (m[1] === 0 || m[1] === N - 1)) b[m[0]][m[1]] = { p: q.p, t: "q", m: true };
      ep = m[2] === "double" ? [r, c + fwd(q.p)] : null;
      last = [r, c, m[0], m[1]]; sel = null; sfx.drop();
      turn = 1 - turn;
      var any = allLegal(turn).length;
      if (!any) finish(inCheck(b, turn) ? 1 - turn : -1);
      else {
        var left = 0; b.forEach(function (row) { row.forEach(function (x) { if (x) left++; }); });
        if (left === 2) finish(-1);
      }
    }
    return {
      down: function (pt) {
        if (result) return;
        var c = Math.floor((pt.x - x0) / S), r = Math.floor((pt.y - y0) / S);
        if (!inb(r, c)) return;
        if (sel) { var mv = legal(sel[0], sel[1]).filter(function (m) { return m[0] === r && m[1] === c; })[0]; if (mv) { apply(sel[0], sel[1], mv); return; } }
        if (b[r][c] && b[r][c].p === turn && legal(r, c).length) { sel = [r, c]; sfx.tap(); } else sel = null;
      },
      move: function () {}, up: function () {}, update: function () {},
      draw: function () {
        table(); homeButton();
        if (!result) turnGlow(turn);
        rr(x0 - 22, y0 - 22, N * S + 44, N * S + 44, 18); ctx.fillStyle = "#3b2a1c"; ctx.fill();
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) { ctx.fillStyle = (r + c) % 2 ? "#b58863" : "#f0d9b5"; ctx.fillRect(x0 + c * S, y0 + r * S, S, S); }
        if (last) { ctx.fillStyle = "rgba(255,230,80,0.35)"; [[last[0], last[1]], [last[2], last[3]]].forEach(function (q) { ctx.fillRect(x0 + q[1] * S, y0 + q[0] * S, S, S); }); }
        var k = kingPos(b, turn);
        if (k && inCheck(b, turn)) { ctx.fillStyle = "rgba(255,40,40,0.5)"; ctx.fillRect(x0 + k[1] * S, y0 + k[0] * S, S, S); }
        if (sel) { ctx.fillStyle = "rgba(120,200,255,0.45)"; ctx.fillRect(x0 + sel[1] * S, y0 + sel[0] * S, S, S); }
        for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
          var q = b[r][c]; if (!q) continue;
          ctx.save(); ctx.translate(x0 + c * S + S / 2, y0 + r * S + S / 2); ctx.rotate(q.p === 0 ? Math.PI / 2 : -Math.PI / 2);
          ctx.font = "84px 'Apple Symbols', 'Segoe UI Symbol', 'DejaVu Sans', serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.lineWidth = 5; ctx.strokeStyle = PD[q.p]; ctx.strokeText(GLYPH[q.t], 0, 4);
          ctx.fillStyle = q.p === 0 ? "#ff7a5c" : "#6aa8ff"; ctx.fillText(GLYPH[q.t], 0, 4);
          ctx.restore();
        }
        if (sel) legal(sel[0], sel[1]).forEach(function (m) { circle(x0 + m[1] * S + S / 2, y0 + m[0] * S + S / 2, b[m[0]][m[1]] ? 48 : 16, b[m[0]][m[1]] ? "rgba(255,60,60,0.3)" : "rgba(0,0,0,0.3)"); });
        for (var p = 0; p < 2; p++) {
          scoreSide(p, PNAME[p]);
          if (!result && turn === p && inCheck(b, p)) ptext(p, L("Check!"), p === 0 ? 76 : W - 76, H / 2 + 230, 26, "#ff6b6b");
          var cap = captured[p].map(function (t) { return GLYPH[t]; }).join("");
          if (cap) ptext(p, cap, p === 0 ? 120 : W - 120, H / 2, 34, "rgba(255,255,255,0.8)", "normal");
        }
      },
      legal: function () { return allLegal(turn); }, playMove: function (mv) { apply(mv[0], mv[1], mv[2]); }
    };
  }

  // ---------- BACKGAMMON ----------
  // Points 1..24 from Red's view: Red moves 24 -> 1 and bears off from 1-6; Blue moves 1 -> 24, home 19-24.
  // Layout: Red's near row (points 1-12) runs up the left side, Blue's (13-24) down the right side; the bar is the middle band.
  function Backgammon() {
    var pts = new Array(26).fill(0), bar = [0, 0], off = [0, 0], turn = starter, dice = [], rolled = false, sel = null, msg = "", msgT = 0, roll = null, shown = [];
    pts[24] = 2; pts[13] = 5; pts[8] = 3; pts[6] = 5; pts[1] = -2; pts[12] = -5; pts[17] = -3; pts[19] = -5;
    var BX0 = 150, BX1 = 1270, BY0 = 60, BY1 = 940, BAR0 = 470, BAR1 = 530, PH = (BAR0 - BY0) / 6, LEN = 400;
    function own(p, n) { return p === 0 ? n > 0 : n < 0; }
    function cnt(n) { return Math.abs(n); }
    function home(p, s) { return p === 0 ? s >= 1 && s <= 6 : s >= 19 && s <= 24; }
    function allHome(st, p) { if (st.bar[p]) return false; for (var s = 1; s <= 24; s++) if (own(p, st.pts[s]) && !home(p, s)) return false; return true; }
    function snap() { return { pts: pts.slice(), bar: bar.slice(), off: off.slice() }; }
    function movesFor(st, p, d) {
      var o = [], dir = p === 0 ? -1 : 1;
      function dest(from) { return from === "bar" ? (p === 0 ? 25 - d : d) : from + dir * d; }
      function ok(to) { return to >= 1 && to <= 24 && !(own(1 - p, st.pts[to]) && cnt(st.pts[to]) >= 2); }
      if (st.bar[p]) { var t0 = dest("bar"); if (ok(t0)) o.push(["bar", t0, d]); return o; }
      var canOff = allHome(st, p);
      for (var s = 1; s <= 24; s++) {
        if (!own(p, st.pts[s])) continue;
        var to = dest(s);
        if (to >= 1 && to <= 24) { if (ok(to)) o.push([s, to, d]); continue; }
        if (!canOff) continue;
        var dist = p === 0 ? s : 25 - s;
        if (dist === d) { o.push([s, "off", d]); continue; }
        var higher = false;
        for (var h = 1; h <= 24; h++) if (own(p, st.pts[h]) && (p === 0 ? h > s : h < s)) { higher = true; break; }
        if (!higher) o.push([s, "off", d]);
      }
      return o;
    }
    function applyTo(st, p, m) {
      var sign = p === 0 ? 1 : -1;
      if (m[0] === "bar") st.bar[p]--; else st.pts[m[0]] -= sign;
      if (m[1] === "off") st.off[p]++;
      else {
        if (own(1 - p, st.pts[m[1]]) && cnt(st.pts[m[1]]) === 1) { st.pts[m[1]] = 0; st.bar[1 - p]++; }
        st.pts[m[1]] += sign;
      }
      return st;
    }
    function clone(st) { return { pts: st.pts.slice(), bar: st.bar.slice(), off: st.off.slice() }; }
    function maxUse(st, p, ds) {
      if (!ds.length) return 0;
      var best = 0, tried = {};
      for (var i = 0; i < ds.length; i++) {
        if (tried[ds[i]]) continue; tried[ds[i]] = 1;
        var rest = ds.slice(0, i).concat(ds.slice(i + 1)), ms = movesFor(st, p, ds[i]);
        for (var j = 0; j < ms.length; j++) { var v = 1 + maxUse(applyTo(clone(st), p, ms[j]), p, rest); if (v > best) best = v; if (best === ds.length) return best; }
      }
      return best;
    }
    function legalNow() {
      if (!rolled || result) return [];
      var st = snap(), need = maxUse(st, turn, dice), o = [], tried = {};
      if (!need) return [];
      for (var i = 0; i < dice.length; i++) {
        if (tried[dice[i]]) continue; tried[dice[i]] = 1;
        var rest = dice.slice(0, i).concat(dice.slice(i + 1));
        movesFor(st, turn, dice[i]).forEach(function (m) { if (1 + maxUse(applyTo(clone(st), turn, m), turn, rest) === need) o.push(m); });
      }
      if (need === 1 && dice.length === 2 && dice[0] !== dice[1]) {
        var big = Math.max(dice[0], dice[1]), withBig = o.filter(function (m) { return m[2] === big; });
        if (withBig.length) o = withBig;
      }
      return o;
    }
    function doRoll() {
      var a = 1 + Math.floor(Math.random() * 6), c = 1 + Math.floor(Math.random() * 6);
      dice = a === c ? [a, a, a, a] : [a, c]; shown = [a, c]; rolled = true; roll = 0.5; sfx.drop();
      if (!legalNow().length) { msg = L("No moves"); msgT = window.tt.fast ? 0.02 : 1.4; }
    }
    function endTurn() { turn = 1 - turn; rolled = false; dice = []; sel = null; }
    function play(m) {
      var st = applyTo(snap(), turn, m); pts = st.pts; bar = st.bar; off = st.off;
      dice.splice(dice.indexOf(m[2]), 1); sel = null; sfx.tap();
      if (off[turn] === 15) { finish(turn); return; }
      if (!dice.length || !legalNow().length) { if (dice.length) { msg = L("No more moves"); msgT = window.tt.fast ? 0.02 : 1.2; } else endTurn(); }
    }
    // geometry
    function pointBox(s) {
      var left = s <= 12, k = left ? s - 1 : s - 13; // k = 0..11 along the side
      var y;
      if (left) y = k < 6 ? BY1 - (k + 0.5) * PH : BAR0 - (k - 6 + 0.5) * PH;
      else y = k < 6 ? BY0 + (k + 0.5) * PH : BAR1 + (k - 6 + 0.5) * PH;
      return { left: left, y: y, x: left ? BX0 : BX1 };
    }
    function checkerPos(s, i) { var pb = pointBox(s), step = Math.min(62, (LEN - 40) / Math.max(1, cnt(pts[s]) - 1)); var off2 = 34 + i * step; return [pb.left ? pb.x + off2 : pb.x - off2, pb.y]; }
    function rollBtn(p) { return { x: p === 0 ? 420 : W - 420, y: 500 }; }
    function hit(pt) {
      if (pt.y > BAR0 && pt.y < BAR1 && pt.x > BX0 && pt.x < BX1) return "bar";
      if ((pt.x < BX0 && turn === 0) || (pt.x > BX1 && turn === 1)) return "off";
      for (var s = 1; s <= 24; s++) { var pb = pointBox(s); if (Math.abs(pt.y - pb.y) < PH / 2 && (pb.left ? pt.x > BX0 && pt.x < MID : pt.x > MID && pt.x < BX1)) return s; }
      return null;
    }
    return {
      down: function (pt) {
        if (result) return;
        if (!rolled) { var rb = rollBtn(turn); if (Math.hypot(pt.x - rb.x, pt.y - rb.y) < 90) doRoll(); return; }
        if (msgT > 0) return;
        var h = hit(pt), LG = legalNow();
        if (sel != null) {
          var mv = LG.filter(function (m) { return m[0] === sel && m[1] === h; }).sort(function (a, c) { return a[2] - c[2]; })[0];
          if (mv) { play(mv); return; }
        }
        if (h != null && LG.some(function (m) { return m[0] === h; })) { sel = h; sfx.tap(); } else sel = null;
      },
      move: function () {}, up: function () {},
      update: function (dt) {
        if (roll > 0) roll -= dt;
        if (msgT > 0) { msgT -= dt; if (msgT <= 0) endTurn(); }
      },
      draw: function () {
        table(); homeButton();
        if (!result) turnGlow(turn);
        rr(BX0 - 20, BY0 - 20, BX1 - BX0 + 40, BY1 - BY0 + 40, 20); ctx.fillStyle = "#5a3920"; ctx.fill();
        ctx.fillStyle = "#e9dcc0"; ctx.fillRect(BX0, BY0, BX1 - BX0, BY1 - BY0);
        ctx.fillStyle = "#5a3920"; ctx.fillRect(BX0, BAR0, BX1 - BX0, BAR1 - BAR0);
        var LG = legalNow(), targets = sel != null ? LG.filter(function (m) { return m[0] === sel; }).map(function (m) { return m[1]; }) : [];
        for (var s = 1; s <= 24; s++) {
          var pb = pointBox(s), tip = pb.left ? pb.x + LEN : pb.x - LEN;
          ctx.beginPath(); ctx.moveTo(pb.x, pb.y - PH / 2 + 3); ctx.lineTo(tip, pb.y); ctx.lineTo(pb.x, pb.y + PH / 2 - 3); ctx.closePath();
          ctx.fillStyle = s % 2 ? "#9c3b2a" : "#2f5d7c"; ctx.fill();
          if (targets.indexOf(s) >= 0) { ctx.strokeStyle = "#ffe14d"; ctx.lineWidth = 6; ctx.stroke(); }
          var n = cnt(pts[s]), who = pts[s] > 0 ? 0 : 1;
          for (var i = 0; i < Math.min(n, 15); i++) {
            var cp = checkerPos(s, i);
            circle(cp[0], cp[1], 29, PD[who]); circle(cp[0], cp[1], 23, PC[who]);
            if (sel === s && i === n - 1) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cp[0], cp[1], 31, 0, 7); ctx.stroke(); }
          }
        }
        for (var p = 0; p < 2; p++) {
          for (var j = 0; j < bar[p]; j++) { var bx = p === 0 ? MID - 60 - j * 50 : MID + 60 + j * 50; circle(bx, 500, 27, PD[p]); circle(bx, 500, 21, PC[p]); }
          if (sel === "bar" && turn === p) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(p === 0 ? MID - 60 : MID + 60, 500, 30, 0, 7); ctx.stroke(); }
          var tx = p === 0 ? 75 : W - 75;
          rr(tx - 45, 80, 90, 300, 16); ctx.fillStyle = targets.indexOf("off") >= 0 && turn === p ? "rgba(255,225,77,0.5)" : "rgba(0,0,0,0.25)"; ctx.fill();
          for (var k = 0; k < off[p]; k++) { ctx.fillStyle = PC[p]; ctx.fillRect(tx - 34, 365 - k * 18, 68, 13); }
          ptext(p, L("Off ") + off[p], tx, 430, 24, "#fff");
        }
        if (!result && !rolled) {
          var rb = rollBtn(turn); circle(rb.x, rb.y, 80, PC[turn]); circle(rb.x, rb.y, 70, PD[turn]); ptext(turn, L("Roll"), rb.x, rb.y, 40, "#fff");
        }
        if (rolled && shown.length) {
          var cx = turn === 0 ? 420 : W - 420;
          shown.forEach(function (v, i) {
            var dy = (i === 0 ? -42 : 42), jig = roll > 0 ? Math.sin(t * 40 + i) * 10 : 0, used = dice.indexOf(v) < 0 && !(shown[0] === shown[1] && dice.length);
            ctx.save(); ctx.translate(cx + dy, 500 + jig); ctx.rotate(turn === 0 ? Math.PI / 2 : -Math.PI / 2);
            rr(-30, -30, 60, 60, 12); ctx.fillStyle = used ? "rgba(255,255,255,0.35)" : "#fff"; ctx.fill();
            var P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
            P[v].forEach(function (q) { circle(q[0] * 15, q[1] * 15, 6, "#222"); });
            ctx.restore();
          });
          if (shown[0] === shown[1]) ptext(turn, "x" + dice.length, cx + (turn === 0 ? -70 : 70), 500, 28, "#fff");
        }
        if (msgT > 0) ptext(turn, msg, turn === 0 ? 300 : W - 300, 500, 40, "#ffe14d");
      },
      legal: function () { return rolled ? legalNow() : ["roll"]; },
      playMove: function (m) { if (m === "roll") doRoll(); else play(m); },
      state: function () { return { off: off.slice(), bar: bar.slice(), turn: turn }; },
      busy: function () { return msgT > 0; }
    };
  }

  // ---------- MENU ----------
  var GAMES = [
    { id: "hockey", name: "Air Hockey", make: AirHockey },
    { id: "four", name: "Four in a Row", make: FourRow },
    { id: "checkers", name: "Checkers", make: Checkers },
    { id: "dots", name: "Dots & Boxes", make: Dots },
    { id: "chess", name: "Chess", make: Chess },
    { id: "backgammon", name: "Backgammon", make: Backgammon }
  ];
  function tiles() {
    return GAMES.map(function (g, i) { var col = i % 3, row = Math.floor(i / 3); return { g: g, x: 300 + col * 280, y: 140 + row * 380, w: 260, h: 340 }; });
  }
  function icon(id, x, y) {
    if (id === "hockey") { rr(x - 80, y - 50, 160, 100, 24); ctx.fillStyle = "#d6eaf6"; ctx.fill(); circle(x - 45, y, 22, PC[0]); circle(x + 45, y, 22, PC[1]); circle(x + 5, y - 10, 12, "#1d1f24"); }
    else if (id === "four") { rr(x - 75, y - 60, 150, 120, 14); ctx.fillStyle = "#f2c230"; ctx.fill(); for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) circle(x - 54 + c * 36, y - 34 + r * 34, 13, (r === 2 && c < 3) ? PC[c % 2] : r === 1 && c === 1 ? PC[0] : "#173a2a"); }
    else if (id === "checkers") { for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) { ctx.fillStyle = (i + j) % 2 ? "#7a5233" : "#e8d3ad"; ctx.fillRect(x - 64 + i * 32, y - 64 + j * 32, 32, 32); } circle(x - 32, y - 16, 12, PC[0]); circle(x + 32, y + 16, 12, PC[1]); circle(x, y + 48, 12, PC[1]); }
    else if (id === "dots") { ctx.fillStyle = "#f4efe3"; ctx.fillRect(x - 70, y - 60, 140, 120); ctx.fillStyle = PC[0]; ctx.globalAlpha = 0.4; ctx.fillRect(x - 50, y - 40, 50, 40); ctx.globalAlpha = 1; for (var a = 0; a < 3; a++) for (var bb = 0; bb < 3; bb++) circle(x - 50 + a * 50, y - 40 + bb * 40, 6, "#2b2b2b"); ctx.strokeStyle = PC[1]; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 50, y); ctx.stroke(); }
    else if (id === "chess") { ctx.fillStyle = "#f4efe3"; ctx.beginPath(); ctx.moveTo(x - 30, y + 50); ctx.lineTo(x + 30, y + 50); ctx.lineTo(x + 18, y - 10); ctx.arc(x, y - 30, 22, 0.5, Math.PI - 0.5, true); ctx.closePath(); ctx.fill(); }
    else { for (var k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? "#7a5233" : "#e8d3ad"; ctx.beginPath(); ctx.moveTo(x - 75 + k * 25, y - 60); ctx.lineTo(x - 62 + k * 25, y); ctx.lineTo(x - 50 + k * 25, y - 60); ctx.fill(); } circle(x - 20, y + 30, 16, PC[0]); circle(x + 20, y + 30, 16, PC[1]); }
  }
  function drawMenu() {
    table();
    for (var p = 0; p < 2; p++) {
      ptext(p, "Two at the Table", p === 0 ? 120 : W - 120, H / 2, 64, "#fff");
      ptext(p, L("Sit face to face. Pick a game."), p === 0 ? 195 : W - 195, H / 2, 26, "rgba(255,255,255,0.75)", "normal");
    }
    tiles().forEach(function (tl) {
      ctx.fillStyle = "rgba(0,0,0,0.25)"; rr(tl.x + 6, tl.y + 8, tl.w, tl.h, 26); ctx.fill();
      rr(tl.x, tl.y, tl.w, tl.h, 26); ctx.fillStyle = tl.g.soon ? "#2a4a3a" : "#fbf7ee"; ctx.fill();
      ctx.save(); if (tl.g.soon) ctx.globalAlpha = 0.45; icon(tl.g.id, tl.x + tl.w / 2, tl.y + tl.h / 2); ctx.restore();
      var c = tl.g.soon ? "rgba(255,255,255,0.7)" : "#24352c";
      ptext(0, L(tl.g.name), tl.x + 32, tl.y + tl.h / 2, 26, c);
      ptext(1, L(tl.g.name), tl.x + tl.w - 32, tl.y + tl.h / 2, 26, c);
      if (tl.g.soon) text("SOON", tl.x + tl.w / 2, tl.y + tl.h - 40, 24, "#ffd84a");
      var w = wins[tl.g.id];
      if (w) { text(w[0] + " : " + w[1], tl.x + tl.w / 2, tl.y + 40, 24, "#7a8a80"); }
    });
  }

  function open(id) {
    var g = GAMES.filter(function (q) { return q.id === id; })[0];
    if (!g || g.soon) return;
    gameName = id; game = g.make(); result = null; state = "game";
  }

  // ---------- input ----------
  function toLogical(e) { return { x: (e.clientX - ox) / scale, y: (e.clientY - oy) / scale }; }
  cv.addEventListener("pointerdown", function (e) {
    tone(1, 0.01, "sine", 0.0001);
    var p = toLogical(e);
    if (state === "menu") {
      tiles().forEach(function (tl) { if (p.x > tl.x && p.x < tl.x + tl.w && p.y > tl.y && p.y < tl.y + tl.h) { sfx.tap(); open(tl.g.id); } });
      return;
    }
    if (Math.hypot(p.x - MID, p.y - 34) < 34) { state = "menu"; game = null; result = null; return; }
    if (result) { if (result.t > 0.8) { starter = 1 - starter; open(gameName); } return; }
    game.down(p, e.pointerId);
  });
  cv.addEventListener("pointermove", function (e) { if (state === "game" && game && !result) game.move(toLogical(e), e.pointerId); });
  function up(e) { if (state === "game" && game) game.up(toLogical(e), e.pointerId); }
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  window.addEventListener("resize", resize);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 3); cw = window.innerWidth; ch = window.innerHeight;
    cv.width = cw * dpr; cv.height = ch * dpr; scale = Math.min(cw / W, ch / H); ox = (cw - W * scale) / 2; oy = (ch - H * scale) / 2;
  }

  // test hook
  window.tt = { open: open, game: function () { return game; }, result: function () { return result; }, menu: function () { state = "menu"; game = null; result = null; } };

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.033, (now - last) / 1000); last = now; t += dt;
    if (state === "game" && game) { game.update(dt); if (result) result.t += dt; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cw, ch);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
    if (state === "menu") drawMenu(); else { game.draw(); drawResult(); if (gameName === "hockey") homeButton(); }
    requestAnimationFrame(frame);
  }
  resize(); requestAnimationFrame(frame);
})();
