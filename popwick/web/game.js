(function () {
  "use strict";
  var W = 1420, H = 1000, MIN_A = 60, MAX_A = 180;
  var COLORS = ["#e0574a", "#3d86c6", "#f0a23b", "#3fa26a", "#9a5ae0"];
  var DARK = ["#9e3127", "#24578a", "#b06d14", "#24704a", "#6532a3"];
  var cv = document.getElementById("c"), ctx = cv.getContext("2d");
  var dpr = 1, scale = 1, ox = 0, oy = 0, cw = 0, ch = 0;

  var save = load();
  var state = "cover", angle = 180, device = false, deviceStatus = "", lvlIndex = 0, lvl = null;
  var wick = null, items = [], stars = [], got = [], timer = 0, deadT = 0, winT = 0, coverOpen = 0, t = 0, tries = 0;

  function load() {
    try { var s = JSON.parse(localStorage.getItem("popwick") || "null"); if (s && s.best) return s; } catch (e) {}
    return { best: [], hintSeen: false };
  }
  function persist() { try { localStorage.setItem("popwick", JSON.stringify(save)); } catch (e) {} }

  // Native bridge: the iOS shell calls this with the iPhone Duo hinge angle (180 = flat) and status.
  window.onHinge = function (deg, status) {
    device = true;
    deviceStatus = status || "";
    angle = clamp(deg, MIN_A, MAX_A);
    if (status === "closed" && state !== "cover") { state = "cover"; coverOpen = 0; }
  };

  function haptic(kind) {
    try { window.webkit.messageHandlers.haptic.postMessage(kind); } catch (e) {}
  }

  // ---------- audio ----------
  var ac = null;
  function tone(f, d, type, vol, slide) {
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      var o = ac.createOscillator(), g = ac.createGain(), n = ac.currentTime;
      o.type = type || "sine"; o.frequency.setValueAtTime(f, n);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, n + d);
      g.gain.setValueAtTime(vol || 0.15, n); g.gain.exponentialRampToValueAtTime(0.001, n + d);
      o.connect(g); g.connect(ac.destination); o.start(n); o.stop(n + d);
    } catch (e) {}
  }
  var sfx = {
    pop: function () { tone(520, 0.07, "triangle", 0.12, 900); },
    flat: function () { tone(300, 0.08, "triangle", 0.08, 160); },
    jump: function () { tone(330, 0.15, "square", 0.05, 660); },
    star: function () { tone(880, 0.12, "sine", 0.15); setTimeout(function () { tone(1320, 0.18, "sine", 0.12); }, 70); },
    die: function () { tone(240, 0.4, "sawtooth", 0.08, 60); },
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { tone(f, 0.25, "sine", 0.13); }, i * 110); }); }
  };

  // ---------- helpers ----------
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function windowR(it) {
    if (it.t === "lift") return clamp((angle - it.lo) / (it.hi - it.lo), 0, 1);
    var d = angle < it.lo ? it.lo - angle : angle > it.hi ? angle - it.hi : 0;
    return clamp(1 - d / 4, 0, 1);
  }

  function startLevel(i) {
    lvlIndex = i; lvl = LEVELS[i];
    items = lvl.items.map(function (it) { var o = Object.assign({}, it); o.r = windowR(o); o.up = o.r > 0.5; return o; });
    stars = lvl.stars.map(function (s) { return { x: s[0], y: s[1], got: false }; });
    wick = { x: 40, y: G, vx: 0, vy: 0, ground: true, walk: false, blocked: false, face: 1, step: 0 };
    timer = 0; deadT = 0; winT = 0; state = "play";
  }

  function solids() {
    var s = [];
    lvl.ground.forEach(function (g) { s.push({ x: g[0], y: G, w: g[1] - g[0], h: 400 }); });
    lvl.ledges.forEach(function (l) { s.push({ x: l.x, y: G - l.h, w: l.w, h: l.h }); });
    items.forEach(function (it) {
      if (it.t === "bridge" && it.r > 0.92) s.push({ x: it.x, y: G, w: it.w, h: 18 });
      if (it.t === "wall" && it.h * it.r > 2) s.push({ x: it.x, y: G - it.h * it.r, w: it.w, h: it.h * it.r });
      if (it.t === "lift") s.push({ x: it.x, y: G - it.h * it.r, w: it.w, h: Math.max(it.h * it.r, 1) });
    });
    return s;
  }

  var HW = 17, HH = 46;
  function overlapX(s, x) { return x + HW - 2 > s.x && x - HW + 2 < s.x + s.w; }

  function update(dt) {
    items.forEach(function (it) {
      it.r += (windowR(it) - it.r) * Math.min(1, dt * 14);
      if (it.t !== "lift") {
        var up = it.r > 0.5;
        if (up !== it.up) { it.up = up; if (up) { sfx.pop(); haptic("pop"); } else sfx.flat(); }
      }
    });
    if (state !== "play") return;
    timer += dt;
    if (!wick.walk && timer > 1.2) wick.walk = true;
    var S = solids(), w = wick;

    // pushed up by a pop-up rising underneath
    S.forEach(function (s) {
      if (overlapX(s, w.x) && w.y > s.y && w.y - s.y <= 80 && w.y - HH < s.y + s.h) { w.y = s.y; w.vy = 0; w.ground = true; }
    });

    // horizontal
    w.blocked = false;
    var vx = w.walk ? 150 : 0, nx = w.x + vx * dt;
    S.forEach(function (s) {
      if (nx + HW > s.x && nx - HW < s.x + s.w && w.y > s.y + 0.5 && w.y - HH < s.y + s.h) {
        if (w.ground && w.y - s.y <= 14) w.y = s.y;
        else if (w.x <= s.x) { nx = Math.min(nx, s.x - HW - 0.01); w.blocked = true; }
      }
    });
    w.x = nx;
    if (vx && !w.blocked) w.step += dt * 10;

    // vertical
    w.vy += 1800 * dt;
    var ny = w.y + w.vy * dt, landed = false;
    S.forEach(function (s) {
      if (!overlapX(s, w.x)) return;
      if (w.vy >= 0 && w.y <= s.y + 0.5 && ny >= s.y) { ny = s.y; landed = true; }
      if (w.vy < 0 && w.y - HH >= s.y + s.h - 0.5 && ny - HH < s.y + s.h) { ny = s.y + s.h + HH; w.vy = 0; }
    });
    if (landed) w.vy = 0;
    w.y = ny; w.ground = landed;

    // thorns, stars, goal, falling
    items.forEach(function (it) {
      if (it.t === "thorn" && it.r > 0.4) {
        var top = G - 52 * it.r;
        if (w.x + HW - 6 > it.x && w.x - HW + 6 < it.x + it.w && w.y > top + 6) die();
      }
    });
    stars.forEach(function (s) {
      if (!s.got && Math.abs(s.x - w.x) < 34 && Math.abs(s.y - (w.y - 24)) < 40) { s.got = true; sfx.star(); haptic("star"); }
    });
    if (w.y > H + 60) die();
    if (w.x >= 1385 && state === "play") win();
  }

  function die() { if (state !== "play") return; state = "dead"; deadT = 0; tries++; sfx.die(); haptic("die"); }
  function win() {
    state = "win"; winT = 0; sfx.win(); haptic("win");
    var n = stars.filter(function (s) { return s.got; }).length;
    save.best[lvlIndex] = Math.max(save.best[lvlIndex] || 0, n); save.hintSeen = true; persist();
  }
  function jump() { if (wick && wick.ground) { wick.vy = -640; wick.ground = false; sfx.jump(); } }

  // ---------- drawing ----------
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    cw = window.innerWidth; ch = window.innerHeight;
    cv.width = cw * dpr; cv.height = ch * dpr;
    scale = Math.min(cw / W, ch / H); ox = (cw - W * scale) / 2; oy = (ch - H * scale) / 2;
  }

  function shadowed(path, fill, stroke, off) {
    off = off == null ? 6 : off;
    ctx.save(); ctx.translate(off, off); path(); ctx.fillStyle = "rgba(60,35,10,0.18)"; ctx.fill(); ctx.restore();
    path(); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
  }
  function rect(x, y, w, h) { return function () { ctx.beginPath(); ctx.rect(x, y, w, h); }; }

  function drawPages() {
    ctx.fillStyle = "#2a1d14"; ctx.fillRect(-ox / scale, -oy / scale, cw / scale, ch / scale);
    var g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, "#e6d7b8"); g.addColorStop(0.08, "#f6edd8"); g.addColorStop(0.5, "#efe3c8");
    g.addColorStop(0.92, "#f6edd8"); g.addColorStop(1, "#e6d7b8");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var sky = ctx.createLinearGradient(0, 0, 0, G);
    sky.addColorStop(0, "rgba(140,190,215,0.45)"); sky.addColorStop(1, "rgba(140,190,215,0)");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, G);
    // paper hills (seeded per level)
    var seed = lvl ? lvlIndex + 1 : 3;
    [["#c9d9a8", 0.55, 120], ["#a9c58a", 0.8, 70]].forEach(function (layer, li) {
      ctx.beginPath(); ctx.moveTo(0, G);
      for (var x = 0; x <= W; x += 20) {
        var y = G - layer[2] - 40 * Math.sin(x / (170 + li * 60) + seed * 1.7) - 25 * Math.sin(x / 61 + seed);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, G); ctx.closePath(); ctx.fillStyle = layer[0]; ctx.globalAlpha = layer[1]; ctx.fill(); ctx.globalAlpha = 1;
    });
  }

  function drawCrease() {
    var fold = (180 - angle) / 120;
    var wd = 30 + fold * 90;
    var g = ctx.createLinearGradient(W / 2 - wd, 0, W / 2 + wd, 0);
    var a = 0.1 + fold * 0.25;
    g.addColorStop(0, "rgba(70,40,15,0)"); g.addColorStop(0.5, "rgba(70,40,15," + a + ")"); g.addColorStop(1, "rgba(70,40,15,0)");
    ctx.fillStyle = g; ctx.fillRect(W / 2 - wd, 0, wd * 2, H);
  }

  function drawGround() {
    var pit = ctx.createLinearGradient(0, G, 0, H);
    pit.addColorStop(0, "#5a3a22"); pit.addColorStop(1, "#24160c");
    ctx.fillStyle = pit; ctx.fillRect(0, G, W, H - G);
    lvl.ground.forEach(function (gr) {
      shadowed(rect(gr[0], G, gr[1] - gr[0], H - G), "#b98a5a", null, 0);
      ctx.fillStyle = "#6fa04f"; ctx.fillRect(gr[0], G - 6, gr[1] - gr[0], 14);
      ctx.fillStyle = "rgba(90,55,25,0.25)";
      for (var x = gr[0] + 18; x < gr[1] - 10; x += 46) ctx.fillRect(x, G + 40 + (x % 3) * 20, 22, 6);
    });
    lvl.ledges.forEach(function (l) {
      shadowed(rect(l.x, G - l.h, l.w, l.h), "#c79c6c", "#8a6038");
      ctx.fillStyle = "#6fa04f"; ctx.fillRect(l.x, G - l.h - 6, l.w, 12);
      ctx.strokeStyle = "rgba(110,70,35,0.35)"; ctx.lineWidth = 2;
      for (var y = G - l.h + 34; y < G; y += 34) { ctx.beginPath(); ctx.moveTo(l.x + 6, y); ctx.lineTo(l.x + l.w - 6, y); ctx.stroke(); }
    });
  }

  function drawItem(it) {
    var c = COLORS[it.c], d = DARK[it.c], r = it.r;
    if (it.t === "bridge") {
      var half = it.w / 2, a = (1 - r) * 1.35;
      ctx.fillStyle = "rgba(60,30,10,0.2)"; ctx.fillRect(it.x, G + 4, it.w, 6);
      [[it.x, 1], [it.x + it.w, -1]].forEach(function (p) {
        ctx.save(); ctx.translate(p[0], G + 6); ctx.scale(p[1], 1); ctx.rotate(-a);
        shadowed(rect(0, -8, half + 2, 16), c, d, 4);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        for (var x = 14; x < half; x += 26) ctx.fillRect(x, -6, 4, 12);
        ctx.restore();
      });
    } else if (it.t === "wall") {
      var h = it.h * r;
      if (h < 3) { ctx.fillStyle = c; ctx.globalAlpha = 0.35; ctx.fillRect(it.x, G - 3, it.w, 6); ctx.globalAlpha = 1; return; }
      shadowed(rect(it.x, G - h, it.w, h), c, d);
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      for (var y = G - h + 14; y < G - 6; y += 28) ctx.fillRect(it.x + 8, y, it.w - 16, 8);
    } else if (it.t === "thorn") {
      var th = 52 * r, n = Math.floor(it.w / 30);
      if (th < 3) { ctx.fillStyle = c; ctx.globalAlpha = 0.35; ctx.fillRect(it.x, G - 3, it.w, 6); ctx.globalAlpha = 1; return; }
      shadowed(function () {
        ctx.beginPath(); ctx.moveTo(it.x, G);
        for (var i = 0; i < n; i++) { var x0 = it.x + i * it.w / n; ctx.lineTo(x0 + it.w / n / 2, G - th); ctx.lineTo(x0 + it.w / n, G); }
        ctx.closePath();
      }, c, d, 4);
    } else if (it.t === "lift") {
      var lh = it.h * r, top = G - lh;
      ctx.strokeStyle = d; ctx.lineWidth = 3; ctx.beginPath();
      var zig = Math.max(2, Math.round(lh / 22));
      for (var k = 0; k <= zig; k++) {
        var yy = G - (k / zig) * lh, xx = (k % 2) ? it.x + 10 : it.x + it.w - 10;
        if (k === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      shadowed(rect(it.x, top - 16, it.w, 18), c, d, 4);
    }
  }

  function drawStar(x, y, rad, fill) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? rad * 0.45 : rad;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = "#8a5a10"; ctx.lineWidth = 2.5; ctx.stroke();
  }

  function drawWick(w, alpha) {
    var bob = w.ground && w.walk && !w.blocked ? Math.sin(w.step) * 3 : 0, cx = w.x, cy = w.y - 26 + bob;
    ctx.save(); ctx.globalAlpha = alpha;
    var glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 70);
    glow.addColorStop(0, "rgba(255,210,110,0.55)"); glow.addColorStop(1, "rgba(255,210,110,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, 70, 0, 7); ctx.fill();
    ctx.strokeStyle = "#4a2f17"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 8, w.y - 2); ctx.lineTo(cx - 8 - Math.sin(w.step) * 4, w.y); ctx.moveTo(cx + 8, w.y - 2); ctx.lineTo(cx + 8 + Math.sin(w.step) * 4, w.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy - 22, 7, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = "#4a2f17"; ctx.fillRect(cx - 12, cy - 22, 24, 6); ctx.fillRect(cx - 12, cy + 16, 24, 6);
    ctx.beginPath(); ctx.ellipse(cx, cy, 17, 19, 0, 0, 7); ctx.fillStyle = "#ffd36e"; ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ff9a3c"; ctx.beginPath(); ctx.ellipse(cx, cy + 4, 6, 9 + Math.sin(t * 12) * 1.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#3a2410"; ctx.beginPath(); ctx.arc(cx - 6 + w.face * 2, cy - 5, 2.6, 0, 7); ctx.arc(cx + 6 + w.face * 2, cy - 5, 2.6, 0, 7); ctx.fill();
    ctx.restore();
  }

  function dialPos(a) { return Math.PI + (a - MIN_A) / (MAX_A - MIN_A) * Math.PI; }
  function drawDial() {
    var cx = W / 2, cy = 150, R = 92;
    ctx.beginPath(); ctx.arc(cx, cy, R + 26, Math.PI, 0); ctx.closePath();
    ctx.fillStyle = "rgba(255,250,238,0.94)"; ctx.fill(); ctx.strokeStyle = "#8a6038"; ctx.lineWidth = 3; ctx.stroke();
    ctx.lineWidth = 6; ctx.strokeStyle = "rgba(120,90,60,0.18)"; ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, 0); ctx.stroke();
    items.forEach(function (it, i) {
      var lo = Math.min(it.lo, it.hi), hi = Math.max(it.lo, it.hi), rr = R - 8 - (i % 3) * 13;
      ctx.strokeStyle = COLORS[it.c]; ctx.lineWidth = it.t === "lift" ? 5 : 10; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(cx, cy, rr, dialPos(lo), dialPos(hi)); ctx.stroke();
      if (it.t === "lift") {
        var end = dialPos(it.hi); ctx.fillStyle = COLORS[it.c];
        ctx.beginPath(); ctx.arc(cx + Math.cos(end) * rr, cy + Math.sin(end) * rr, 7, 0, 7); ctx.fill();
      }
    });
    ctx.lineCap = "butt";
    var p = dialPos(angle);
    ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(p) * (R + 14), cy + Math.sin(p) * (R + 14)); ctx.stroke();
    ctx.fillStyle = "#3a2410"; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.fill();
    ctx.font = "bold 26px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText(Math.round(angle) + "°", cx, cy + 34);
  }

  function drawHud() {
    ctx.textAlign = "left"; ctx.fillStyle = "#4a2f17"; ctx.font = "bold 34px Georgia, serif";
    ctx.fillText((lvlIndex + 1) + ". " + lvl.name, 92, 72);
    ctx.font = "italic 24px Georgia, serif"; ctx.fillStyle = "#6a4a2a";
    wrap(lvl.hint, 92, 108, 480, 30);
    if (!device && lvlIndex < 2) {
      ctx.font = "22px Georgia, serif"; ctx.fillStyle = "#8a6038";
      ctx.fillText("Drag up / down = open / close the book.  Tap = jump.", 92, 980);
    }
    shadowed(rect(24, 32, 52, 52), "#f6edd8", "#8a6038", 3);
    ctx.fillStyle = "#4a2f17"; for (var i = 0; i < 3; i++) ctx.fillRect(36, 46 + i * 11, 28, 5);
    for (var s = 0; s < 3; s++) drawStar(1250 + s * 52, 62, 20, stars[s] && stars[s].got ? "#ffcf3a" : "rgba(200,180,140,0.5)");
    // goal flag
    ctx.strokeStyle = "#4a2f17"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(1392, G); ctx.lineTo(1392, G - 110); ctx.stroke();
    ctx.fillStyle = "#e0574a"; ctx.beginPath(); ctx.moveTo(1392, G - 110); ctx.lineTo(1352, G - 92); ctx.lineTo(1392, G - 74); ctx.fill();
  }

  function wrap(text, x, y, maxW, lh) {
    var words = text.split(" "), line = "";
    words.forEach(function (wd) {
      var test = line ? line + " " + wd : wd;
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); line = wd; y += lh; } else line = test;
    });
    ctx.fillText(line, x, y);
  }

  function banner(title, sub) {
    ctx.fillStyle = "rgba(42,29,20,0.45)"; ctx.fillRect(0, 0, W, H);
    shadowed(rect(W / 2 - 330, 330, 660, 300), "#fbf4e2", "#8a6038", 8);
    ctx.textAlign = "center"; ctx.fillStyle = "#4a2f17"; ctx.font = "bold 54px Georgia, serif"; ctx.fillText(title, W / 2, 420);
    ctx.font = "26px Georgia, serif"; ctx.fillStyle = "#6a4a2a"; ctx.fillText(sub, W / 2, 590);
  }

  function drawPlay() {
    drawPages(); drawGround();
    stars.forEach(function (s) { if (!s.got) drawStar(s.x, s.y + Math.sin(t * 3 + s.x) * 4, 18, "#ffcf3a"); });
    items.forEach(drawItem);
    drawCrease();
    if (state === "dead") drawWick(wick, Math.max(0, 1 - deadT * 2));
    else drawWick(wick, 1);
    drawHud(); drawDial();
    if (state === "win") {
      var n = stars.filter(function (s) { return s.got; }).length;
      banner(lvlIndex === LEVELS.length - 1 ? "The End... for now" : "Page complete!", "Tap to turn the page");
      for (var i = 0; i < 3; i++) drawStar(W / 2 - 80 + i * 80, 500, 32, i < n ? "#ffcf3a" : "rgba(200,180,140,0.5)");
    }
  }

  function drawSelect() {
    lvl = null; drawPages(); drawCrease();
    ctx.textAlign = "center"; ctx.fillStyle = "#4a2f17"; ctx.font = "bold 46px Georgia, serif";
    ctx.fillText("Popwick", W / 4, 110); ctx.fillText("Chapter 1", W * 3 / 4, 110);
    ctx.font = "italic 24px Georgia, serif"; ctx.fillStyle = "#6a4a2a";
    ctx.fillText(device ? "Open and close your iPhone Duo to move the pop-ups." : "On iPhone Duo the real fold moves the pop-ups.", W / 2, 960);
    tiles().forEach(function (tl) {
      var open = tl.i === 0 || (save.best[tl.i - 1] != null);
      shadowed(rect(tl.x, tl.y, tl.w, tl.h), open ? "#fbf4e2" : "#d9ccb0", "#8a6038", 5);
      ctx.fillStyle = open ? "#4a2f17" : "#9a8a70"; ctx.font = "bold 44px Georgia, serif";
      ctx.fillText(String(tl.i + 1), tl.x + tl.w / 2, tl.y + 70);
      ctx.font = "18px Georgia, serif"; ctx.fillText(LEVELS[tl.i].name, tl.x + tl.w / 2, tl.y + 104);
      var b = save.best[tl.i] || 0;
      for (var s = 0; s < 3; s++) drawStar(tl.x + tl.w / 2 - 36 + s * 36, tl.y + 140, 13, s < b ? "#ffcf3a" : "rgba(200,180,140,0.5)");
    });
  }
  function tiles() {
    var out = [];
    for (var i = 0; i < LEVELS.length; i++) {
      var page = i < 5 ? 0 : 1, k = i % 5, col = k % 3, row = Math.floor(k / 3);
      var bx = page * W / 2 + 60 + col * 200 + (row ? 100 : 0);
      out.push({ i: i, x: bx, y: 200 + row * 280, w: 170, h: 180 });
    }
    return out;
  }

  function drawCover() {
    // drawn in screen space so it also fills the narrow outer display when the phone is closed
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#2a1d14"; ctx.fillRect(0, 0, cw, ch);
    var bw = Math.min(cw * 0.86, ch * 0.62), bh = bw * 1.4;
    if (bh > ch * 0.9) { bh = ch * 0.9; bw = bh / 1.4; }
    var bx = (cw - bw) / 2, by = (ch - bh) / 2, u = bw / 400;
    ctx.save(); ctx.translate(bx, by);
    var tilt = coverOpen;
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(10 * u, 12 * u, bw, bh);
    var g = ctx.createLinearGradient(0, 0, bw, bh); g.addColorStop(0, "#2f6b4f"); g.addColorStop(1, "#1d4634");
    ctx.fillStyle = g; ctx.fillRect(0, 0, bw * (1 - tilt * 0.9), bh);
    ctx.strokeStyle = "#e3c27a"; ctx.lineWidth = 4 * u; ctx.strokeRect(18 * u, 18 * u, bw - 36 * u, bh - 36 * u);
    ctx.fillStyle = "#f3dc9a"; ctx.textAlign = "center"; ctx.font = "bold " + (64 * u) + "px Georgia, serif";
    ctx.fillText("Popwick", bw / 2, 150 * u);
    ctx.font = "italic " + (22 * u) + "px Georgia, serif"; ctx.fillText("a pop-up book adventure", bw / 2, 190 * u);
    var save0 = wick; wick = null;
    ctx.restore();
    var lw = { x: bx + bw / 2, y: by + 360 * u, ground: true, walk: true, blocked: false, face: 0, step: t * 6 };
    ctx.save(); ctx.translate(lw.x, lw.y); ctx.scale(u * 2.2, u * 2.2); ctx.translate(-lw.x, -lw.y); drawWick(lw, 1); ctx.restore();
    wick = save0;
    ctx.fillStyle = "#f3dc9a"; ctx.textAlign = "center"; ctx.font = (20 * u) + "px Georgia, serif";
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3);
    ctx.fillText(device ? "Open your iPhone Duo" : "Tap to open the book", bx + bw / 2, by + bh - 70 * u);
    ctx.globalAlpha = 1;
  }

  // ---------- input ----------
  var drag = null;
  function toLogical(e) { return { x: (e.clientX - ox) / scale, y: (e.clientY - oy) / scale }; }
  cv.addEventListener("pointerdown", function (e) {
    var p = toLogical(e); drag = { sx: e.clientX, sy: e.clientY, a0: angle, moved: false, p: p, t0: performance.now() };
    tone(1, 0.01, "sine", 0.0001);
  });
  cv.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var dy = (e.clientY - drag.sy) / scale;
    if (Math.abs(dy) > 10) drag.moved = true;
    if (drag.moved && !device && state !== "cover") angle = clamp(drag.a0 - dy * 0.3, MIN_A, MAX_A);
  });
  function up() {
    if (!drag) return;
    var d = drag; drag = null;
    if (d.moved) return;
    var p = d.p;
    if (state === "cover") { if (!device) state = "select"; return; }
    if (state === "select") {
      tiles().forEach(function (tl) {
        var open = tl.i === 0 || save.best[tl.i - 1] != null;
        if (open && p.x > tl.x && p.x < tl.x + tl.w && p.y > tl.y && p.y < tl.y + tl.h) startLevel(tl.i);
      });
      return;
    }
    if (state === "play") {
      if (p.x < 90 && p.y < 100) { state = "select"; return; }
      jump();
    } else if (state === "win" && winT > 0.5) {
      if (lvlIndex + 1 < LEVELS.length) startLevel(lvlIndex + 1); else state = "select";
    }
  }
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", function () { drag = null; });
  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowUp" || e.key === "w") angle = clamp(angle + 4, MIN_A, MAX_A);
    if (e.key === "ArrowDown" || e.key === "s") angle = clamp(angle - 4, MIN_A, MAX_A);
    if (e.key === " ") { if (state === "play") jump(); else { drag = { moved: false, p: { x: -1, y: -1 } }; up(); } }
  });
  window.addEventListener("resize", resize);

  // testing hook (CI screenshots)
  window.popwick = { start: startLevel, setAngle: function (a) { angle = a; }, state: function () { return { state: state, level: lvlIndex, x: wick && wick.x, y: wick && wick.y, stars: stars.filter(function (s) { return s.got; }).length, tries: tries }; } };

  // ---------- loop ----------
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.033, (now - last) / 1000); last = now; t += dt;
    if (state === "cover") {
      coverOpen = device && deviceStatus !== "closed" ? Math.min(1, coverOpen + dt * 2) : 0;
      if (device && coverOpen >= 1) state = "select";
    } else if (state === "dead") {
      deadT += dt; update(dt); if (deadT > 0.8) startLevel(lvlIndex);
    } else if (state === "win") { winT += dt; update(dt); }
    else if (state === "play") update(dt);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    if (state === "cover") drawCover();
    else {
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
      if (state === "select") drawSelect(); else drawPlay();
    }
    requestAnimationFrame(frame);
  }
  resize();
  requestAnimationFrame(frame);
})();
