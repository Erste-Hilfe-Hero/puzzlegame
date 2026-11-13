(function () {
  "use strict";
  // Two players face to face over one unfolded phone: player 0 sits at the left edge, player 1 at the right edge.
  // Text for a player is rotated toward their edge. The fold runs down the middle (x = 710).
  var W = 1420, H = 1000, MID = 710;
  var PC = ["#ef5b3c", "#3c8cf0"], PD = ["#a8341c", "#1f5aa8"], PNAME = ["Red", "Blue"];
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
    ctx.fillStyle = "#1b2a22"; ctx.fillRect(-ox / scale, -oy / scale, cw / scale, ch / scale);
    var g = ctx.createRadialGradient(MID, H / 2, 100, MID, H / 2, 900);
    g.addColorStop(0, "#2f6b4c"); g.addColorStop(1, "#173a2a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function homeButton() {
    circle(MID, 34, 24, "rgba(0,0,0,0.35)");
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(MID - 11, 37); ctx.lineTo(MID, 25); ctx.lineTo(MID + 11, 37); ctx.moveTo(MID - 7, 34); ctx.lineTo(MID - 7, 45); ctx.lineTo(MID + 7, 45); ctx.lineTo(MID + 7, 34); ctx.stroke();
  }
  function scoreSide(p, s) { ptext(p, s, p === 0 ? 22 : W - 22, H / 2, 30, "#fff"); }
  function turnGlow(p) {
    var x = p === 0 ? 0 : W - 14, a = 0.55 + 0.35 * Math.sin(t * 5);
    ctx.fillStyle = PC[p]; ctx.globalAlpha = a; ctx.fillRect(x, 0, 14, H); ctx.globalAlpha = 1;
    ptext(p, "Your turn", p === 0 ? 46 : W - 46, H / 2 + 230, 26, PC[p]);
    ptext(1 - p, "Wait...", p === 0 ? W - 46 : 46, H / 2 + 230, 22, "rgba(255,255,255,0.45)", "normal");
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
      var x = p === 0 ? 300 : W - 300, msg = result.winner === -1 ? "Draw!" : result.winner === p ? "You win!" : "You lose";
      ptext(p, msg, x, H / 2, 86, result.winner === p ? PC[p] : "#fff");
      var w = wins[gameName] || [0, 0];
      ptext(p, "Wins  " + w[p] + " : " + w[1 - p], x + (p === 0 ? -100 : 100), H / 2, 34, "#fff", "normal");
      if (result.t > 0.8) ptext(p, "Tap for a rematch", x + (p === 0 ? -160 : 160), H / 2, 28, "rgba(255,255,255,0.75)", "normal");
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
          ptext(p, "First to " + TO, p === 0 ? 20 : W - 20, 500, 22, "rgba(255,255,255,0.7)", "normal");
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
        if (!result && anyCap(turn)) ptext(turn, "You must capture!", turn === 0 ? 76 : W - 76, H / 2 + 230, 22, "#ffd84a");
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

  // ---------- MENU ----------
  var GAMES = [
    { id: "hockey", name: "Air Hockey", make: AirHockey },
    { id: "four", name: "Four in a Row", make: FourRow },
    { id: "checkers", name: "Checkers", make: Checkers },
    { id: "dots", name: "Dots & Boxes", make: Dots },
    { id: "chess", name: "Chess", soon: true },
    { id: "backgammon", name: "Backgammon", soon: true }
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
      ptext(p, "Sit face to face. Pick a game.", p === 0 ? 195 : W - 195, H / 2, 26, "rgba(255,255,255,0.75)", "normal");
    }
    tiles().forEach(function (tl) {
      ctx.fillStyle = "rgba(0,0,0,0.25)"; rr(tl.x + 6, tl.y + 8, tl.w, tl.h, 26); ctx.fill();
      rr(tl.x, tl.y, tl.w, tl.h, 26); ctx.fillStyle = tl.g.soon ? "#2a4a3a" : "#fbf7ee"; ctx.fill();
      ctx.save(); if (tl.g.soon) ctx.globalAlpha = 0.45; icon(tl.g.id, tl.x + tl.w / 2, tl.y + tl.h / 2); ctx.restore();
      var c = tl.g.soon ? "rgba(255,255,255,0.7)" : "#24352c";
      ptext(0, tl.g.name, tl.x + 32, tl.y + tl.h / 2, 26, c);
      ptext(1, tl.g.name, tl.x + tl.w - 32, tl.y + tl.h / 2, 26, c);
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
