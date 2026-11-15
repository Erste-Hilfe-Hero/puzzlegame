(function () {
  "use strict";
  // Two players face to face over one unfolded phone: player 0 sits at the left edge, player 1 at the right edge.
  // Text for a player is rotated toward their edge. The fold runs down the middle (x = 710).
  var W = 1420, H = 1000, MID = 710;
  var FONT = "-apple-system, 'Segoe UI', Roboto, sans-serif";

  // ---------- storage ----------
  function loadKey(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v && typeof v === "object" ? v : d; } catch (e) { return d; } }
  function saveKey(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var CFG0 = { sound: 1, haptic: 1, music: 1, lang: "auto", names: ["", ""], col: [0, 1], theme: "felt", cb: 0, big: 0, calm: 0,
    goals: 7, fourBig: 1, dots: 1, ckBack: 0, clock: 0, cube: 0, intro: 0 };
  var cfg = loadKey("twotable-cfg", {});
  Object.keys(CFG0).forEach(function (k) { if (cfg[k] == null) cfg[k] = CFG0[k]; });
  function saveCfg() { saveKey("twotable-cfg", cfg); }
  var stats = loadKey("twotable-stats", null);
  if (!stats) {
    stats = { g: {}, hist: [], ach: {}, played: 0 };
    var old = loadKey("twotable", {}); // 1.0/1.1 kept only wins per game
    Object.keys(old).forEach(function (k) { if (old[k] && old[k].length === 2) stats.g[k] = { w: old[k].slice(), n: old[k][0] + old[k][1], fast: 0, long: 0, streak: [-1, 0] }; });
  }
  function saveStats() { saveKey("twotable-stats", stats); }

  // ---------- language ----------
  var DE = false;
  function setLang() { DE = cfg.lang === "de" || (cfg.lang === "auto" && /^de/i.test(navigator.language || "")); }
  setLang();
  var TR = {
    "Your turn": "Du bist dran", "Wait...": "Warte...", "You win!": "Gewonnen!", "You lose": "Verloren", "Draw!": "Unentschieden!",
    "Tap for a rematch": "Tippen für Revanche", "First to ": "Wer zuerst ", "You must capture!": "Du musst schlagen!",
    "Check!": "Schach!", "Roll": "Würfeln", "No moves": "Kein Zug möglich", "No more moves": "Keine Züge mehr", "Off ": "Raus ",
    "Sit face to face. Pick a game.": "Setzt euch gegenüber. Wählt ein Spiel.", "Unfold your iPhone Duo for the big table": "Klapp dein iPhone Duo auf für den großen Tisch",
    "Lay the phone flat between you": "Leg das Handy flach zwischen euch", "Tap to continue": "Tippen zum Weiterspielen",
    "Red": "Rot", "Blue": "Blau", "Teal": "Türkis", "Gold": "Gold", "Purple": "Lila", "Pink": "Pink",
    "Four in a Row": "Vier in einer Reihe", "Checkers": "Dame", "Dots & Boxes": "Käsekästchen", "Chess": "Schach", "Mill": "Mühle",
    "Super Tic-Tac-Toe": "Super-Tic-Tac-Toe", "Paddle Ball": "Paddel-Ball", "Sea Battle": "Schiffe versenken", "Pairs": "Paare finden",
    " moves": " Zügen", "Board full after ": "Brett voll nach ", "200 moves each": "200 Züge pro Spieler", "30 moves without a mill": "30 Züge ohne Mühle",
    "40 moves without a capture": "40 Züge ohne Schlagen", "50 moves without capture or pawn move": "50 Züge ohne Schlagen oder Bauernzug",
    "Achievements": "Erfolge", "Again!": "Nochmal!", "Automatic": "Automatisch", "Backgammon doubling cube": "Backgammon: Verdopplungswürfel",
    "Backgammon! Counts triple": "Backgammon! Zählt dreifach", "Gammon! Counts double": "Gammon! Zählt doppelt", "Capture!": "Gefangen!",
    "Checkers: capture backward": "Dame: Rückwärts schlagen", "Checkmate!": "Schachmatt!", "Chess clock": "Schachuhr", "Color": "Farbe",
    "Color-blind shapes": "Formen für Farbenblinde", "Cube": "Würfel", "Dots & Boxes size": "Käsekästchen-Größe",
    "Double declined": "Verdopplung abgelehnt", "Double! Take (x2) or give up (flag)": "Verdopplung! Annehmen (x2) oder aufgeben (Fahne)",
    "Doubles! 4 moves": "Pasch! 4 Züge", "Draw agreed": "Remis vereinbart", "Draw offered: tap ½ to accept": "Remis angeboten: ½ tippen zum Annehmen",
    "Enemy sea": "Gegnerisches Meer", "Fastest win": "Schnellster Sieg", "Fold the Duo a little, like a tent: the fold hides your fleet from the other player.": "Klapp das Duo ein wenig an, wie ein Zelt: Die Falz verdeckt deine Flotte vor dem anderen.",
    "Four in a Row board": "Vier in einer Reihe: Brett", "Game": "Spiel", "Goals to win": "Tore zum Sieg", "Hit! Shoot again": "Treffer! Nochmal schießen",
    "Jump anywhere": "Spring überall hin", "Language": "Sprache", "Larger text": "Größere Schrift", "Last 20 matches": "Letzte 20 Partien",
    "Last seed in your store: again!": "Letzter Samen im Lager: nochmal!", "Longest": "Längste", "Match point!": "Matchball!", "Match restored": "Partie wiederhergestellt",
    "Mill! Take a stone": "Mühle! Nimm einen Stein", "Miss": "Daneben", "Move a stone": "Zieh einen Stein", "Move taken back": "Zug zurückgenommen",
    "Music": "Musik", "Name": "Name", "No matches yet": "Noch keine Partien", "No moves left": "Keine Züge mehr", "Not enough pieces": "Zu wenig Figuren",
    "Off": "Aus", "On": "An", "Paused": "Pause", "Place a stone": "Setz einen Stein", "Played": "Gespielt", "Promote to": "Umwandeln in", "Ready": "Bereit",
    "Ready. Waiting for the other player...": "Bereit. Warte auf den anderen...", "Reduced motion": "Weniger Bewegung", "Reset statistics": "Statistik zurücksetzen",
    "Settings": "Einstellungen", "Ships left": "Schiffe übrig", "Show the guide again": "Anleitung nochmal zeigen", "Shuffle": "Mischen",
    "Sit face to face with the phone flat between you. This half is yours: the fold in the middle is the edge of your side.": "Setzt euch gegenüber, das Handy flach zwischen euch. Diese Hälfte gehört dir: Die Falz in der Mitte ist der Rand deiner Seite.",
    "Sound": "Ton", "Stalemate": "Patt", "Statistics reset": "Statistik zurückgesetzt", "Statistics": "Statistik", "Sunk! Shoot again": "Versenkt! Nochmal schießen",
    "Swap colors": "Farben tauschen", "Table": "Tisch", "Take a stone": "Nimm einen Stein", "Take back? Tap the arrow too": "Zurücknehmen? Tipp auch den Pfeil",
    "Tap again": "Nochmal tippen", "Tap the flag again to resign": "Fahne nochmal tippen zum Aufgeben", "Tap to close": "Tippen zum Schließen", "Tap to start": "Tippen zum Starten",
    "The other player is shooting": "Der andere schießt", "Threefold repetition": "Dreifache Wiederholung", "Time is up": "Zeit abgelaufen",
    "Vibration": "Vibration", "Welcome to the table!": "Willkommen am Tisch!", "You were hit": "Du wurdest getroffen", "Your fleet": "Deine Flotte", "your fleet": "deine Flotte",
    "Your ship sank": "Dein Schiff ist gesunken", "Your shot: tap the enemy sea": "Dein Schuss: tippe ins gegnerische Meer", "no move, pass": "kein Zug, setzt aus",
    "pips": "Augen", "resigned": "hat aufgegeben", "starts": "fängt an", "you sit here": "du sitzt hier",
    "Felt": "Filz", "Wood": "Holz", "Night": "Nacht", "Beach": "Strand", "High contrast": "Hoher Kontrast",
    "First win": "Erster Sieg", "Three wins in a row": "Drei Siege in Folge", "A win in under 2 minutes": "Ein Sieg unter 2 Minuten",
    "Played all 14 games": "Alle 14 Spiele gespielt", "Won every game at least once": "Jedes Spiel mindestens einmal gewonnen", "50 matches played": "50 Partien gespielt",
    "A match longer than 20 minutes": "Eine Partie länger als 20 Minuten"
  };
  function L(s) { return DE && TR[s] ? TR[s] : s; }

  // ---------- colors / names ----------
  var PAL = [["#ef5b3c", "#a8341c", "Red"], ["#3c8cf0", "#1f5aa8", "Blue"], ["#2fbf9f", "#17806a", "Teal"], ["#f2b632", "#a8780f", "Gold"], ["#a46cf0", "#6a38b0", "Purple"], ["#f06cb4", "#a83878", "Pink"]];
  var PC = [], PD = [], PNAME = [];
  function applyColors() {
    for (var p = 0; p < 2; p++) {
      var c = PAL[cfg.col[p]] || PAL[p];
      PC[p] = c[0]; PD[p] = c[1]; PNAME[p] = (cfg.names[p] || "").trim() || L(c[2]);
    }
  }
  applyColors();
  function alpha(hex, a) { var n = parseInt(hex.slice(1), 16); return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }

  var cv = document.getElementById("c"), ctx = cv.getContext("2d");
  var dpr = 1, scale = 1, ox = 0, oy = 0, cw = 0, ch = 0, t = 0;
  var state = "menu", game = null, gameName = "", starter = 0, match = null, replaying = false;
  var view = null; // overlay page: {kind: "settings"|"stats"|"rules", p, id}

  // seeded random so a match can be replayed (restore after interruption, undo)
  var seed = 1;
  function rnd() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }

  // ---------- audio / haptics ----------
  var ac = null;
  function actx() {
    try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch (e) {}
    return ac;
  }
  function tone(f, d, type, vol, slide, delay) {
    if (!cfg.sound || replaying) return;
    try {
      var a = actx(); if (!a) return;
      var o = a.createOscillator(), g = a.createGain(), n = a.currentTime + (delay || 0);
      o.type = type || "sine"; o.frequency.setValueAtTime(f, n);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, n + d);
      g.gain.setValueAtTime(0.0001, n); g.gain.exponentialRampToValueAtTime(vol || 0.12, n + 0.008); g.gain.exponentialRampToValueAtTime(0.001, n + d);
      o.connect(g); g.connect(a.destination); o.start(n); o.stop(n + d + 0.02);
    } catch (e) {}
  }
  var noiseBuf = null;
  function noise(d, vol, freq) {
    if (!cfg.sound || replaying) return;
    try {
      var a = actx(); if (!a) return;
      if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate * 0.4, a.sampleRate); var ch0 = noiseBuf.getChannelData(0); for (var i = 0; i < ch0.length; i++) ch0[i] = Math.random() * 2 - 1; }
      var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), n = a.currentTime;
      s.buffer = noiseBuf; f.type = "bandpass"; f.frequency.value = freq || 1800; f.Q.value = 0.8;
      g.gain.setValueAtTime(vol || 0.2, n); g.gain.exponentialRampToValueAtTime(0.001, n + d);
      s.connect(f); f.connect(g); g.connect(a.destination); s.start(n); s.stop(n + d);
    } catch (e) {}
  }
  function native(k) { try { window.webkit.messageHandlers.haptic.postMessage(k); } catch (e) {} }
  function haptic(k) { if (cfg.haptic && !replaying) native(k); }
  // each game has its own material: wood, stone, ice, paper, plastic
  var MAT = { hockey: "ice", paddles: "ice", four: "plastic", reversi: "plastic", checkers: "wood", chess: "wood", backgammon: "wood", halma: "wood",
    mill: "stone", mancala: "stone", dots: "paper", uttt: "paper", pairs: "paper", sea: "plastic" };
  function mat() { return MAT[gameName] || "plastic"; }
  var sfx = {
    tap: function () { var m = mat(); if (m === "paper") noise(0.05, 0.12, 2600); else tone(m === "wood" ? 520 : m === "stone" ? 440 : 700, 0.05, "triangle", 0.09); },
    drop: function () {
      var m = mat();
      if (m === "wood") { tone(180, 0.09, "triangle", 0.18, 120); noise(0.04, 0.08, 900); }
      else if (m === "stone") { tone(260, 0.07, "sine", 0.16, 200); noise(0.06, 0.12, 3200); }
      else if (m === "paper") { noise(0.08, 0.18, 1500); }
      else if (m === "ice") { tone(900, 0.08, "sine", 0.1, 600); }
      else { tone(220, 0.12, "triangle", 0.14, 140); }
      haptic("tap");
    },
    hit: function (v) { tone(300 + Math.min(500, v / 4), 0.05, "square", 0.06); haptic("tap"); },
    wall: function () { tone(160, 0.05, "triangle", 0.08); },
    goal: function () { tone(440, 0.5, "sawtooth", 0.05, 880); [392, 523, 659].forEach(function (f, i) { tone(f, 0.2, "sine", 0.14, 0, 0.1 + i * 0.09); }); haptic("win"); },
    bad: function () { tone(200, 0.15, "square", 0.05, 140); },
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.25, "sine", 0.14, 0, i * 0.11); }); haptic("win"); }
  };
  // quiet background music: slow pad chords, generated (no files)
  var musicNext = 0, CHORDS = [[220, 261.6, 329.6], [174.6, 220, 261.6], [130.8, 196, 261.6], [196, 246.9, 293.7]], chordI = 0;
  function music() {
    if (!cfg.music || !cfg.sound || !ac || ac.state !== "running" || document.hidden) return;
    if (ac.currentTime < musicNext - 0.5) return;
    var n = Math.max(ac.currentTime, musicNext), ch2 = CHORDS[chordI++ % 4];
    ch2.forEach(function (f) {
      try {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, n); g.gain.linearRampToValueAtTime(0.018, n + 1.2); g.gain.linearRampToValueAtTime(0.0001, n + 4.2);
        o.connect(g); g.connect(ac.destination); o.start(n); o.stop(n + 4.3);
      } catch (e) {}
    });
    musicNext = n + 3.6;
  }

  // ---------- drawing helpers ----------
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(k) { k = clamp(k, 0, 1); return 1 - Math.pow(1 - k, 3); }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function circle(x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, 7); ctx.fillStyle = fill; ctx.fill(); }
  function ring(x, y, r, color, w) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.strokeStyle = color; ctx.lineWidth = w || 5; ctx.stroke(); }
  function tsize(size) { return cfg.big ? Math.round(size * 1.18) : size; }
  // text upright for player p: p0 reads from the left edge, p1 from the right edge
  function ptext(p, s, x, y, size, color, weight) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(p === 0 ? Math.PI / 2 : -Math.PI / 2);
    ctx.font = (weight || "bold") + " " + tsize(size) + "px " + FONT;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = color || "#fff"; ctx.fillText(s, 0, 0);
    ctx.restore();
  }
  function text(s, x, y, size, color, weight, align) {
    ctx.font = (weight || "bold") + " " + tsize(size) + "px " + FONT;
    ctx.textAlign = align || "center"; ctx.textBaseline = "middle"; ctx.fillStyle = color || "#fff"; ctx.fillText(s, x, y);
  }
  function wrap(s, x, y, maxW, size, lh, color, weight) {
    ctx.font = (weight || "normal") + " " + tsize(size) + "px " + FONT;
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillStyle = color || "#fff";
    var lines = 0;
    String(s).split("\n").forEach(function (para) {
      var words = para.split(" "), line = "";
      words.forEach(function (w) { var tst = line ? line + " " + w : w; if (ctx.measureText(tst).width > maxW && line) { ctx.fillText(line, x, y + lines * lh); lines++; line = w; } else line = tst; });
      ctx.fillText(line, x, y + lines * lh); lines++;
    });
    return lines * lh;
  }
  // a piece with an optional shape mark (color-blind mode): player 0 gets a dot, player 1 a cross
  function mark(p, x, y, r) {
    if (!cfg.cb) return;
    ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = Math.max(3, r * 0.18); ctx.lineCap = "round";
    if (p === 0) { ctx.beginPath(); ctx.arc(x, y, r * 0.32, 0, 7); ctx.stroke(); }
    else { var k = r * 0.3; ctx.beginPath(); ctx.moveTo(x - k, y - k); ctx.lineTo(x + k, y + k); ctx.moveTo(x + k, y - k); ctx.lineTo(x - k, y + k); ctx.stroke(); }
    ctx.restore();
  }
  function stone(p, x, y, r) { circle(x, y, r, PD[p]); circle(x, y, r * 0.8, PC[p]); circle(x - r * 0.25, y - r * 0.25, r * 0.22, "rgba(255,255,255,0.28)"); mark(p, x, y, r); }

  // ---------- themes (all drawn, no images) ----------
  var THEMES = {
    felt: { a: "#2f6b4c", b: "#173a2a", hole: "#173a2a", name: "Felt" },
    wood: { a: "#8a5a34", b: "#4a2c16", hole: "#3a2414", name: "Wood" },
    night: { a: "#1d2650", b: "#070a1c", hole: "#0b1030", name: "Night" },
    beach: { a: "#f0d9a0", b: "#c99c5c", hole: "#2a8cb0", name: "Beach" },
    contrast: { a: "#000000", b: "#000000", hole: "#000000", name: "High contrast" }
  };
  var THEME_ORDER = ["felt", "wood", "night", "beach", "contrast"];
  function th() { return THEMES[cfg.theme] || THEMES.felt; }
  var texCache = {};
  function texture() {
    var k = cfg.theme; if (texCache[k] !== undefined) return texCache[k];
    var c = document.createElement("canvas"); c.width = c.height = 256; var g = c.getContext("2d"), r = 7;
    function rr2() { r = (r * 16807) % 2147483647; return r / 2147483647; }
    if (k === "felt") { for (var i = 0; i < 2600; i++) { g.fillStyle = rr2() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)"; g.fillRect(rr2() * 256, rr2() * 256, 1 + rr2() * 2, 1); } }
    else if (k === "wood") { for (var j = 0; j < 60; j++) { g.strokeStyle = "rgba(0,0,0," + (0.04 + rr2() * 0.08) + ")"; g.lineWidth = 1 + rr2() * 3; var y0 = rr2() * 256; g.beginPath(); g.moveTo(0, y0); g.bezierCurveTo(85, y0 + rr2() * 10 - 5, 170, y0 + rr2() * 10 - 5, 256, y0); g.stroke(); } }
    else if (k === "night") { for (var s2 = 0; s2 < 40; s2++) { g.fillStyle = "rgba(160,200,255," + rr2() * 0.35 + ")"; g.fillRect(rr2() * 256, rr2() * 256, 1.5, 1.5); } }
    else if (k === "beach") { for (var q = 0; q < 3000; q++) { g.fillStyle = rr2() < 0.5 ? "rgba(255,255,255,0.12)" : "rgba(120,80,30,0.1)"; g.fillRect(rr2() * 256, rr2() * 256, 1.5, 1.5); } }
    else { texCache[k] = null; return null; }
    texCache[k] = ctx.createPattern(c, "repeat"); return texCache[k];
  }
  function table() {
    // the table covers the whole screen, also outside the 1420x1000 play area on wider phones
    var T = th(), X = -ox / scale, Y = -oy / scale, WW = cw / scale, HH = ch / scale;
    var g = ctx.createRadialGradient(MID, H / 2, 100, MID, H / 2, Math.max(900, WW * 0.7));
    g.addColorStop(0, T.a); g.addColorStop(1, T.b);
    ctx.fillStyle = g; ctx.fillRect(X, Y, WW, HH);
    var tx = texture(); if (tx) { ctx.fillStyle = tx; ctx.fillRect(X, Y, WW, HH); }
    if (cfg.theme === "beach") {
      ctx.fillStyle = "rgba(42,140,176,0.35)";
      for (var k = 0; k < 2; k++) { ctx.beginPath(); var yy = k ? H + 40 : -40; ctx.moveTo(X, yy); for (var x = X; x <= X + WW; x += 40) ctx.lineTo(x, yy + (k ? -1 : 1) * (60 + 14 * Math.sin(x / 70 + t * 1.5))); ctx.lineTo(X + WW, yy); ctx.fill(); }
    }
  }
  function seam() {
    // the fold: shows each player where their half ends
    ctx.save(); ctx.setLineDash([10, 14]); ctx.strokeStyle = cfg.theme === "beach" ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.1)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(MID, 10); ctx.lineTo(MID, H - 10); ctx.stroke(); ctx.restore();
  }

  // ---------- rotated pages ----------
  // full page for player p: local 1000 x 1420, upright for that player
  function pageOn(p) { ctx.save(); if (p === 0) { ctx.translate(W, 0); ctx.rotate(Math.PI / 2); } else { ctx.translate(0, H); ctx.rotate(-Math.PI / 2); } }
  function pageXY(p, pt) { return p === 0 ? { x: pt.y, y: W - pt.x } : { x: H - pt.y, y: pt.x }; }
  // half page for player p: local 1000 x 710, their own half of the table
  function halfOn(p) { ctx.save(); if (p === 0) { ctx.translate(MID, 0); ctx.rotate(Math.PI / 2); } else { ctx.translate(MID, H); ctx.rotate(-Math.PI / 2); } }
  function halfXY(p, pt) { return p === 0 ? { x: pt.y, y: MID - pt.x } : { x: H - pt.y, y: pt.x - MID }; }

  // ---------- particles / confetti ----------
  var parts = [];
  function burst(x, y, color, n, sp) {
    if (cfg.calm || replaying) return;
    for (var i = 0; i < n; i++) { var a = Math.random() * 7, v = (0.3 + Math.random()) * (sp || 500); parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6 + Math.random() * 0.6, c: color, s: 4 + Math.random() * 6, g: 0 }); }
  }
  function confetti(p) {
    if (cfg.calm) return;
    var cols = p >= 0 ? [PC[p], PD[p], "#fff", "#ffd84a"] : [PC[0], PC[1], "#fff"];
    for (var i = 0; i < 140; i++) {
      var side = i % 2, x = side ? W + 20 : -20;
      parts.push({ x: x, y: Math.random() * H, vx: (side ? -1 : 1) * (300 + Math.random() * 700), vy: (Math.random() - 0.5) * 500, life: 1.6 + Math.random(), c: cols[i % cols.length], s: 6 + Math.random() * 8, g: 0, rot: Math.random() * 7, conf: 1 });
    }
  }
  function updParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var q = parts[i]; q.life -= dt; if (q.life <= 0) { parts.splice(i, 1); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= Math.pow(0.3, dt); q.vy *= Math.pow(0.3, dt); if (q.rot != null) q.rot += dt * 8;
    }
  }
  function drawParts() {
    parts.forEach(function (q) {
      ctx.globalAlpha = Math.min(1, q.life * 2); ctx.fillStyle = q.c;
      if (q.conf) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(q.x, q.y, q.s * Math.min(1, q.life), 0, 7); ctx.fill(); }
    });
    ctx.globalAlpha = 1;
  }
  var toasts = [];
  function toast(s, color) { if (!replaying) toasts.push({ s: s, c: color || "#ffd84a", life: 2.4 }); }

  // ---------- side buttons: a column along each player's edge (slot 0 = home), never near the fold ----------
  function SB(p, i) { return p === 0 ? [56, 34 + 86 * i] : [W - 56, H - 34 - 86 * i]; }
  function onSB(pt, p, i) { var b = SB(p, i); return Math.hypot(pt.x - b[0], pt.y - b[1]) < 40; }
  function sideBtn(p, i, ico, on) {
    var b = SB(p, i);
    circle(b[0], b[1], 28, on ? alpha(PC[p], 0.85) : "rgba(0,0,0,0.38)");
    ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(p === 0 ? Math.PI / 2 : -Math.PI / 2);
    ctx.strokeStyle = "#fff"; ctx.fillStyle = "#fff"; ctx.lineWidth = 3.5; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.beginPath();
    if (ico === "home") { ctx.moveTo(-11, 3); ctx.lineTo(0, -9); ctx.lineTo(11, 3); ctx.moveTo(-7, 0); ctx.lineTo(-7, 11); ctx.lineTo(7, 11); ctx.lineTo(7, 0); ctx.stroke(); }
    else if (ico === "undo") { ctx.arc(2, 2, 10, Math.PI * 1.1, Math.PI * 0.6, false); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-9, 2); ctx.lineTo(-2, -5); ctx.stroke(); }
    else if (ico === "draw") { ctx.font = "bold 22px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("½", 0, 1); }
    else if (ico === "flag") { ctx.moveTo(-8, 12); ctx.lineTo(-8, -12); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(10, -6); ctx.lineTo(-8, 1); ctx.closePath(); ctx.fill(); }
    else if (ico === "x2") { ctx.font = "bold 20px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("x2", 0, 1); }
    ctx.restore();
  }
  function homeButton() { sideBtn(0, 0, "home"); sideBtn(1, 0, "home"); }

  // name line along each player's edge, turn line just inside it
  function scoreSide(p, s) { ptext(p, s, p === 0 ? 22 : W - 22, H / 2, 28, "#fff"); }
  function turnGlow(p) {
    var a = 0.5 + 0.35 * Math.sin(t * 5), X = -ox / scale, WW = cw / scale;
    ctx.fillStyle = PC[p]; ctx.globalAlpha = a;
    ctx.fillRect(p === 0 ? X : W + ox / scale - 14, -oy / scale, 14, ch / scale);
    // the top and bottom edges glow along the active player's half, so both see whose turn it is
    var hx0 = p === 0 ? X : MID, hw = p === 0 ? MID - X : X + WW - MID;
    ctx.globalAlpha = a * 0.6; ctx.fillRect(hx0, -oy / scale, hw, 8); ctx.fillRect(hx0, H + oy / scale - 8, hw, 8);
    ctx.globalAlpha = 1;
    ptext(p, L("Your turn"), p === 0 ? 58 : W - 58, H / 2, 24, PC[p]);
    ptext(1 - p, L("Wait..."), p === 0 ? W - 58 : 58, H / 2, 20, "rgba(255,255,255,0.45)", "normal");
  }

  // ---------- match log: every move is recorded, so a match survives an interruption and can be undone ----------
  function rec(m) { if (!match) return; match.log.push(m); if (!replaying) saveMatch(); }
  function saveMatch() { if (match && !result) saveKey("twotable-match", match); }
  function clearMatch() { try { localStorage.removeItem("twotable-match"); } catch (e) {} }
  var undoReq = [-9, -9];
  function canUndo() { var g = byId(gameName); return g && g.undo && match && match.log.length && !result && !coin; }
  function undoPress(p) {
    if (!canUndo()) { sfx.bad(); return; }
    // backgammon: the player on turn takes back their own moves alone; everywhere else both have to agree
    var solo = game.soloUndo && game.soloUndo(p);
    undoReq[p] = t;
    if (solo || t - undoReq[1 - p] < 4) { undoReq = [-9, -9]; doUndo(); }
    else sfx.tap();
  }
  function doUndo() {
    var lg = match.log.slice(), cut = game.undoCut ? game.undoCut(lg) : lg.length - 1;
    if (cut < 0) { sfx.bad(); return; }
    var el = match.el;
    open(gameName, { seed: match.seed, starter: match.starter, log: lg.slice(0, cut), el: el });
    sfx.tap(); toast(L("Move taken back"), "#fff");
  }

  // ---------- result + statistics ----------
  var result = null; // {winner: 0|1|-1, t, note, pts}
  function finish(winner, note, pts) {
    if (result) return;
    result = { winner: winner, t: 0, note: note || "", pts: pts || 1 };
    clearMatch(); native("awake0");
    if (replaying) return;
    record(winner, result.pts);
    sfx.win(); confetti(winner);
  }
  function gst(id) { var g = stats.g[id]; if (!g) g = stats.g[id] = { w: [0, 0], n: 0, fast: 0, long: 0, streak: [-1, 0] }; return g; }
  function record(winner, pts) {
    var g = gst(gameName), d = Math.round(match ? match.el : 0);
    g.n++; stats.played = (stats.played || 0) + 1;
    if (winner >= 0) {
      g.w[winner] += pts;
      if (g.streak[0] === winner) g.streak[1]++; else g.streak = [winner, 1];
      if (d > 3 && (!g.fast || d < g.fast)) g.fast = d;
    } else g.streak = [-1, 0];
    if (d > g.long) g.long = d;
    stats.hist.unshift({ g: gameName, w: winner, d: d, n: [PNAME[0], PNAME[1]], c: [cfg.col[0], cfg.col[1]] });
    stats.hist = stats.hist.slice(0, 20);
    achievements(winner, d, g);
    saveStats();
    if (stats.played === 5 || stats.played === 30) setTimeout(function () { native("review"); }, 2500);
  }
  var ACH = [
    ["first", "First win"], ["streak3", "Three wins in a row"], ["quick", "A win in under 2 minutes"],
    ["explorer", "Played all 14 games"], ["allwins", "Won every game at least once"], ["marathon", "50 matches played"], ["long", "A match longer than 20 minutes"]
  ];
  function achievements(winner, d, g) {
    var got = [];
    function give(k) { if (!stats.ach[k]) { stats.ach[k] = Date.now(); got.push(k); } }
    if (winner >= 0) give("first");
    if (winner >= 0 && g.streak[1] >= 3) give("streak3");
    if (winner >= 0 && d > 3 && d < 120) give("quick");
    if (GAMES.every(function (q) { return stats.g[q.id] && stats.g[q.id].n; })) give("explorer");
    if (GAMES.every(function (q) { var s = stats.g[q.id]; return s && s.w[0] + s.w[1] > 0; })) give("allwins");
    if (stats.played >= 50) give("marathon");
    if (d > 1200) give("long");
    got.forEach(function (k) { var a = ACH.filter(function (q) { return q[0] === k; })[0]; toast("★ " + L(a[1]), "#ffd84a"); });
  }
  function drawResult() {
    if (!result) return;
    ctx.fillStyle = "rgba(0,0,0," + Math.min(0.55, result.t) + ")"; ctx.fillRect(-ox / scale, -oy / scale, cw / scale, ch / scale);
    var w = gst(gameName).w;
    for (var p = 0; p < 2; p++) {
      var x = p === 0 ? 330 : W - 330, d = p === 0 ? -1 : 1, msg = result.winner === -1 ? L("Draw!") : result.winner === p ? L("You win!") : L("You lose");
      ptext(p, msg, x, H / 2, 86, result.winner === p ? PC[p] : "#fff");
      if (result.note) ptext(p, result.note, x + d * 82, H / 2, 30, "#ffd84a");
      ptext(p, PNAME[p] + "  " + w[p] + " : " + w[1 - p] + "  " + PNAME[1 - p], x + d * 135, H / 2, 30, "#fff", "normal");
      if (result.t > 0.8) ptext(p, L("Tap for a rematch"), x + d * 190, H / 2, 26, "rgba(255,255,255,0.75)", "normal");
    }
  }

  // ---------- AIR HOCKEY ----------
  function AirHockey() {
    var T = { x0: 40, x1: 1380, y0: 70, y1: 930 }, GY0 = 380, GY1 = 620, R = 50, PR = 30, TO = cfg.goals || 7, MAXV = 2600;
    var m = [{ x: 200, y: 500, tx: 200, ty: 500, vx: 0, vy: 0 }, { x: 1220, y: 500, tx: 1220, ty: 500, vx: 0, vy: 0 }];
    var puck = { x: MID - 160, y: 500, vx: 0, vy: 0 }, score = [0, 0], pause = window.tt.fast ? 0.6 : 3.2, count = !window.tt.fast, owner = {}, flash = 0, stuck = 0, trail = [], wallT = 0;
    function reset(to) { puck.x = to === 0 ? MID - 160 : MID + 160; puck.y = 500; puck.vx = puck.vy = 0; pause = 1.1; count = false; trail = []; }
    function limit(p, x, y) {
      var lo = p === 0 ? T.x0 + R : MID + R + 10, hi = p === 0 ? MID - R - 10 : T.x1 - R;
      return [clamp(x, lo, hi), clamp(y, T.y0 + R, T.y1 - R)];
    }
    function goal(scorer) {
      score[scorer]++; rec(["g", scorer]);
      if (replaying) return;
      flash = 0.8; sfx.goal(); burst(scorer === 0 ? T.x1 : T.x0, 500, PC[scorer], 70, 900);
      if (score[scorer] >= TO) { finish(scorer); pause = 99; } else { reset(1 - scorer); if (score[scorer] === TO - 1) toast(L("Match point!"), PC[scorer]); }
    }
    return {
      down: function (p, id) { var who = p.x < MID ? 0 : 1; owner[id] = who; var l = limit(who, p.x, p.y); m[who].tx = l[0]; m[who].ty = l[1]; },
      move: function (p, id) { var who = owner[id]; if (who == null) return; var l = limit(who, p.x, p.y); m[who].tx = l[0]; m[who].ty = l[1]; },
      up: function (p, id) { delete owner[id]; },
      update: function (dt) {
        flash = Math.max(0, flash - dt); wallT -= dt;
        // a puck resting on the center line can be out of reach (or pinned between mallets): give it a push
        if (pause <= 0 && Math.abs(puck.x - MID) < 100 && Math.hypot(puck.vx, puck.vy) < 40) stuck += dt; else stuck = 0;
        if (stuck > 1.2) { stuck = 0; puck.vx = (puck.x < MID ? -1 : 1) * 260; puck.vy = (puck.y < 500 ? 1 : -1) * 160; }
        // enough sub-steps that neither puck nor mallet moves more than a third of the puck radius per step (no tunneling)
        var mv = Math.max(Math.hypot(puck.vx, puck.vy), Math.hypot(m[0].tx - m[0].x, m[0].ty - m[0].y) / Math.max(dt, 0.001), Math.hypot(m[1].tx - m[1].x, m[1].ty - m[1].y) / Math.max(dt, 0.001));
        var steps = clamp(Math.ceil(mv * dt / (PR / 3)), 4, 40), h = dt / steps;
        for (var s = 0; s < steps; s++) {
          m.forEach(function (k) {
            var nx = k.x + (k.tx - k.x) * Math.min(1, h * 40), ny = k.y + (k.ty - k.y) * Math.min(1, h * 40);
            // smoothed mallet speed, so a swing (not a jitter) decides how hard the puck flies
            k.vx = k.vx * 0.6 + 0.4 * (nx - k.x) / h; k.vy = k.vy * 0.6 + 0.4 * (ny - k.y) / h; k.x = nx; k.y = ny;
          });
          if (pause > 0) { pause -= h; continue; }
          puck.x += puck.vx * h; puck.y += puck.vy * h;
          var f = Math.pow(0.8, h); puck.vx *= f; puck.vy *= f;
          var bounced = false;
          if (puck.y < T.y0 + PR) { puck.y = T.y0 + PR; puck.vy = Math.abs(puck.vy) * 0.9; bounced = true; }
          if (puck.y > T.y1 - PR) { puck.y = T.y1 - PR; puck.vy = -Math.abs(puck.vy) * 0.9; bounced = true; }
          var inGoal = puck.y > GY0 + PR * 0.4 && puck.y < GY1 - PR * 0.4;
          if (!inGoal) {
            if (puck.x < T.x0 + PR) { puck.x = T.x0 + PR; puck.vx = Math.abs(puck.vx) * 0.9; bounced = true; }
            if (puck.x > T.x1 - PR) { puck.x = T.x1 - PR; puck.vx = -Math.abs(puck.vx) * 0.9; bounced = true; }
          } else if (puck.x < T.x0 - PR || puck.x > T.x1 + PR) { goal(puck.x < T.x0 ? 1 : 0); return; }
          if (bounced && wallT <= 0 && Math.hypot(puck.vx, puck.vy) > 200) { sfx.wall(); wallT = 0.08; }
          m.forEach(function (k) {
            var dx = puck.x - k.x, dy = puck.y - k.y, d = Math.hypot(dx, dy);
            if (d < R + PR && d > 0) {
              var nx = dx / d, ny = dy / d;
              puck.x = k.x + nx * (R + PR); puck.y = k.y + ny * (R + PR);
              var rvx = puck.vx - k.vx, rvy = puck.vy - k.vy, vn = rvx * nx + rvy * ny;
              if (vn < 0) { puck.vx -= 1.85 * vn * nx; puck.vy -= 1.85 * vn * ny; if (-vn > 150) sfx.hit(-vn); }
            }
          });
          var sp = Math.hypot(puck.vx, puck.vy);
          if (sp > MAXV) { puck.vx *= MAXV / sp; puck.vy *= MAXV / sp; }
        }
        if (!cfg.calm) { trail.push([puck.x, puck.y]); if (trail.length > 10) trail.shift(); }
      },
      draw: function () {
        table();
        rr(T.x0 - 18, T.y0 - 18, T.x1 - T.x0 + 36, T.y1 - T.y0 + 36, 60); ctx.fillStyle = "#e9eef2"; ctx.fill();
        rr(T.x0, T.y0, T.x1 - T.x0, T.y1 - T.y0, 46); ctx.fillStyle = cfg.theme === "night" ? "#0e1a33" : "#d6eaf6"; ctx.fill();
        ctx.strokeStyle = alpha(PC[1], 0.5); ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(MID, T.y0); ctx.lineTo(MID, T.y1); ctx.stroke();
        ctx.beginPath(); ctx.arc(MID, 500, 110, 0, 7); ctx.stroke();
        ctx.strokeStyle = alpha(PC[0], 0.5);
        ctx.beginPath(); ctx.arc(T.x0, 500, 170, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        ctx.strokeStyle = alpha(PC[1], 0.5);
        ctx.beginPath(); ctx.arc(T.x1, 500, 170, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
        ctx.fillStyle = "#26323a"; ctx.fillRect(T.x0 - 18, GY0, 18, GY1 - GY0); ctx.fillRect(T.x1, GY0, 18, GY1 - GY0);
        for (var p = 0; p < 2; p++) {
          ptext(p, String(score[p]), p === 0 ? MID - 90 : MID + 90, 500, 110, alpha(PC[p], 0.3));
          ptext(p, L("First to ") + TO, p === 0 ? 20 : W - 20, 500, 22, "rgba(255,255,255,0.7)", "normal");
          if (!result && score[p] === TO - 1) ptext(p, L("Match point!"), p === 0 ? MID - 200 : MID + 200, 500, 30, alpha(PC[p], 0.8));
        }
        trail.forEach(function (q, i) { ctx.globalAlpha = (i + 1) / trail.length * 0.25; circle(q[0], q[1], PR * (0.5 + 0.5 * i / trail.length), "#1d1f24"); });
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.arc(puck.x + 6, puck.y + 8, PR, 0, 7); ctx.fill();
        circle(puck.x, puck.y, PR, "#1d1f24"); circle(puck.x, puck.y, PR - 8, "#33363d");
        m.forEach(function (k, i) {
          ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.arc(k.x + 6, k.y + 9, R, 0, 7); ctx.fill();
          circle(k.x, k.y, R, PD[i]); circle(k.x, k.y, R - 8, PC[i]); circle(k.x, k.y, 20, PD[i]); circle(k.x - 5, k.y - 5, 12, "rgba(255,255,255,0.35)"); mark(i, k.x, k.y, R);
        });
        if (count && pause > 0 && pause < 3.2) { var n = Math.ceil(pause - 0.2); if (n > 0) { ptext(0, String(n), MID - 260, 500, 140, "#fff"); ptext(1, String(n), MID + 260, 500, 140, "#fff"); } }
        if (flash > 0) { ctx.fillStyle = "rgba(255,255,255," + flash * 0.4 + ")"; ctx.fillRect(0, 0, W, H); }
      },
      live: true,
      playMove: function (mv) { if (mv[0] === "g") goal(mv[1]); },
      state: function () { return { score: score.slice(), puck: [puck.x, puck.y], pause: pause }; }
    };
  }

  // ---------- FOUR IN A ROW ----------
  function FourRow() {
    var big = cfg.fourBig !== 0, C = big ? 8 : 7, Rw = big ? 7 : 6, S = big ? 112 : 124, x0 = MID - C * S / 2, y0 = 500 - Rw * S / 2 + 10;
    var b = [], turn = starter, falling = null, line = null, moves = 0, hover = null, hoverP = null, out = 0;
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
    function land(r, c, p) {
      b[r][c] = p; moves++;
      line = check(r, c, p);
      if (line) finish(p); else if (moves === C * Rw) finish(-1, L("Board full after ") + moves + L(" moves")); else turn = 1 - turn;
    }
    function play(c) {
      if (falling || result || c < 0 || c >= C) return false;
      var r = Rw - 1; while (r >= 0 && b[r][c] !== -1) r--;
      if (r < 0) return false;
      rec(c);
      if (replaying) { land(r, c, turn); return true; }
      falling = { c: c, r: r, y: y0 - S, p: turn, vy: 0, bounced: false };
      return true;
    }
    function col(pt) { var c = Math.floor((pt.x - x0) / S); return c >= 0 && c < C && pt.y > y0 - S * 1.5 && pt.y < y0 + Rw * S + 30 ? c : null; }
    return {
      // touch shows a preview stone over the column; lifting the finger drops it
      down: function (pt, id) { if (falling || result) return; hover = col(pt); hoverP = id; },
      move: function (pt, id) { if (id === hoverP && hover != null) { var c = col(pt); if (c != null) hover = c; } },
      up: function (pt, id) { if (id !== hoverP) return; var c = hover; hover = null; hoverP = null; if (c != null) play(c); },
      update: function (dt) {
        if (result && line) out += dt;
        if (!falling) return;
        falling.vy += 4200 * dt; falling.y += falling.vy * dt;
        var ty = y0 + falling.r * S + S / 2;
        if (falling.y >= ty) {
          // a little bounce on landing
          if (!falling.bounced && falling.vy > 900 && !cfg.calm) { falling.y = ty; falling.vy = -falling.vy * 0.22; falling.bounced = true; sfx.drop(); return; }
          if (!falling.bounced) sfx.drop();
          var f = falling; falling = null; land(f.r, f.c, f.p);
        }
      },
      draw: function () {
        table(); homeButton();
        if (!result) turnGlow(turn);
        if (hover != null && !falling && !result) { var hx = x0 + hover * S + S / 2; ctx.globalAlpha = 0.75; stone(turn, hx, y0 - S * 0.62, S * 0.4); ctx.globalAlpha = 1; ctx.fillStyle = alpha(PC[turn], 0.15); ctx.fillRect(x0 + hover * S, y0 - 20, S, Rw * S + 40); }
        if (falling) stone(falling.p, x0 + falling.c * S + S / 2, falling.y, S * 0.4);
        rr(x0 - 20, y0 - 20, C * S + 40, Rw * S + 40, 30); ctx.fillStyle = cfg.theme === "contrast" ? "#ffe600" : "#f2c230"; ctx.fill();
        var blink = line && Math.sin(t * 10) > 0, drop = out > 1.4 ? (out - 1.4) * (out - 1.4) * 2400 : 0;
        for (var r = 0; r < Rw; r++) for (var c = 0; c < C; c++) {
          var x = x0 + c * S + S / 2, y = y0 + r * S + S / 2, v = b[r][c];
          circle(x, y, S * 0.4, th().hole);
          if (v !== -1 && drop < 1200) { var inLine = line && line.some(function (q) { return q[0] === r && q[1] === c; }); if (!(inLine && blink)) stone(v, x, y + (inLine ? 0 : drop), S * 0.4); }
        }
        if (line) line.forEach(function (q) { ring(x0 + q[1] * S + S / 2, y0 + q[0] * S + S / 2, S * 0.36, "#fff", 6); });
        scoreSide(0, PNAME[0]); scoreSide(1, PNAME[1]);
      },
      legal: function () { var o = []; for (var c = 0; c < C; c++) if (b[0][c] === -1) o.push(c); return o; },
      play: play, playMove: play, busy: function () { return !!falling; }, turn: function () { return turn; }
    };
  }

  // pieces glide from their old square to the new one
  function glide() {
    var a = null;
    return {
      set: function (key, fx, fy) { if (!replaying && !window.tt.fast && !cfg.calm) a = { key: key, fx: fx, fy: fy, k: 0 }; },
      step: function (dt) { if (a) { a.k += dt / 0.2; if (a.k >= 1) a = null; } },
      pos: function (key, x, y) { if (!a || a.key !== key) return [x, y]; var e = ease(a.k); return [a.fx + (x - a.fx) * e, a.fy + (y - a.fy) * e]; },
      busy: function () { return !!a; }
    };
  }
  function crown(x, y, p, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(p === 0 ? Math.PI / 2 : -Math.PI / 2); ctx.scale(s, s);
    ctx.fillStyle = "#ffd84a"; ctx.strokeStyle = "#a87a10"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-22, 12); ctx.lineTo(-24, -10); ctx.lineTo(-11, 0); ctx.lineTo(0, -16); ctx.lineTo(11, 0); ctx.lineTo(24, -10); ctx.lineTo(22, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    circle(-24, -12, 4, "#fff3b0"); circle(0, -18, 4, "#fff3b0"); circle(24, -12, 4, "#fff3b0"); circle(0, 4, 4, "#e0413a");
    ctx.restore();
  }

  // ---------- CHECKERS ----------
  function Checkers() {
    var N = 8, S = 108, x0 = MID - N * S / 2, y0 = 500 - N * S / 2, BACK = !!cfg.ckBack;
    var b = [], turn = starter, sel = null, chain = null, last = null, quiet = 0, gl = glide();
    for (var r = 0; r < N; r++) { b.push([]); for (var c = 0; c < N; c++) b[r].push((r + c) % 2 === 1 && c <= 2 ? { p: 0, k: false } : (r + c) % 2 === 1 && c >= 5 ? { p: 1, k: false } : null); }
    function inb(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
    var ALL = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
    function dirs(pc, capture) { var f = pc.p === 0 ? 1 : -1; return pc.k || (capture && BACK) ? ALL : [[1, f], [-1, f]]; }
    function caps(r, c) {
      var pc = b[r][c], o = [];
      dirs(pc, true).forEach(function (d) { var mr = r + d[0], mc = c + d[1], lr = r + 2 * d[0], lc = c + 2 * d[1]; if (inb(lr, lc) && b[mr][mc] && b[mr][mc].p !== pc.p && !b[lr][lc]) o.push([lr, lc, mr, mc]); });
      return o;
    }
    function steps(r, c) {
      var pc = b[r][c], o = [];
      dirs(pc, false).forEach(function (d) { var lr = r + d[0], lc = c + d[1]; if (inb(lr, lc) && !b[lr][lc]) o.push([lr, lc]); });
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
    function cx(c) { return x0 + c * S + S / 2; }
    function cy(r) { return y0 + r * S + S / 2; }
    function apply(r, c, m) {
      rec([r, c, m]);
      var pc = b[r][c]; b[m[0]][m[1]] = pc; b[r][c] = null; last = [r, c, m[0], m[1]];
      gl.set(m[0] + "," + m[1], cx(c), cy(r));
      var crowned = false;
      if (!pc.k && ((pc.p === 0 && m[1] === N - 1) || (pc.p === 1 && m[1] === 0))) { pc.k = true; crowned = true; }
      sfx.drop();
      if (m.length === 4) {
        b[m[2]][m[3]] = null; quiet = 0; burst(cx(m[3]), cy(m[2]), PC[1 - turn], 16, 300);
        if (!crowned && caps(m[0], m[1]).length) { chain = [m[0], m[1]]; sel = [m[0], m[1]]; return; }
      } else quiet++;
      chain = null; sel = null; turn = 1 - turn;
      if (!allMoves(turn).length) finish(1 - turn);
      else if (quiet >= 40) finish(-1, L("40 moves without a capture"));
    }
    function count(p) { var n = 0; b.forEach(function (row) { row.forEach(function (q) { if (q && q.p === p) n++; }); }); return n; }
    return {
      down: function (pt) {
        if (result || gl.busy()) return;
        var c = Math.floor((pt.x - x0) / S), r = Math.floor((pt.y - y0) / S);
        if (!inb(r, c)) return;
        if (sel) {
          var mv = movesFor(sel[0], sel[1]).filter(function (m) { return m[0] === r && m[1] === c; })[0];
          if (mv) { apply(sel[0], sel[1], mv); return; }
        }
        if (!chain && b[r][c] && b[r][c].p === turn && movesFor(r, c).length) { sel = [r, c]; sfx.tap(); }
        else if (!chain && b[r][c] && b[r][c].p === turn && anyCap(turn)) { sfx.bad(); toast(L("You must capture!"), PC[turn]); }
      },
      move: function () {}, up: function () {}, update: function (dt) { gl.step(dt); },
      draw: function () {
        table(); homeButton();
        if (!result) turnGlow(turn);
        rr(x0 - 22, y0 - 22, N * S + 44, N * S + 44, 18); ctx.fillStyle = cfg.theme === "contrast" ? "#fff" : "#5a3920"; ctx.fill();
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
          ctx.fillStyle = cfg.theme === "contrast" ? ((r + c) % 2 ? "#333" : "#ddd") : (r + c) % 2 ? "#7a5233" : "#e8d3ad"; ctx.fillRect(x0 + c * S, y0 + r * S, S, S);
        }
        if (last) { ctx.fillStyle = "rgba(255,230,120,0.28)"; [[last[0], last[1]], [last[2], last[3]]].forEach(function (q) { ctx.fillRect(x0 + q[1] * S, y0 + q[0] * S, S, S); }); }
        var hint = sel ? movesFor(sel[0], sel[1]) : [], must = !result && !chain && anyCap(turn);
        for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
          var q = b[r][c]; if (!q) continue;
          var ps = gl.pos(r + "," + c, cx(c), cy(r)), x = ps[0], y = ps[1];
          if (must && q.p === turn && caps(r, c).length) ring(x, y, S * 0.46, "rgba(255,216,74," + (0.6 + 0.4 * Math.sin(t * 6)) + ")", 6);
          ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.arc(x + 4, y + 6, S * 0.4, 0, 7); ctx.fill();
          circle(x, y, S * 0.4, PD[q.p]); circle(x, y, S * 0.32, PC[q.p]);
          if (q.k) crown(x, y, q.p, 1.1); else { ring(x, y, S * 0.22, "rgba(255,255,255,0.35)", 3); mark(q.p, x, y, S * 0.4); }
          if (sel && sel[0] === r && sel[1] === c) ring(x, y, S * 0.45, "#fff", 6);
        }
        hint.forEach(function (m) { circle(cx(m[1]), cy(m[0]), 16, "rgba(255,255,255,0.75)"); });
        scoreSide(0, PNAME[0] + "  " + count(0)); scoreSide(1, PNAME[1] + "  " + count(1));
        if (must) ptext(turn, L("You must capture!"), turn === 0 ? 94 : W - 94, H / 2, 22, "#ffd84a");
      },
      legal: function () { return allMoves(turn); }, playMove: function (mv) { apply(mv[0], mv[1], mv[2]); }, turn: function () { return turn; }, busy: gl.busy
    };
  }

  // ---------- DOTS AND BOXES ----------
  function Dots() {
    var SZ = [[4, 4, 160], [6, 5, 130], [8, 6, 104]][cfg.dots == null ? 1 : cfg.dots] || [6, 5, 130];
    var BC = SZ[0], BR = SZ[1], S = SZ[2], x0 = MID - BC * S / 2, y0 = 500 - BR * S / 2 + 10;
    var hz = [], vt = [], box = [], born = [], turn = starter, score = [0, 0], lastE = null, prev = null, prevId = null, again = 0;
    for (var r = 0; r <= BR; r++) hz.push(new Array(BC).fill(-1));
    for (r = 0; r < BR; r++) vt.push(new Array(BC + 1).fill(-1));
    for (r = 0; r < BR; r++) { box.push(new Array(BC).fill(-1)); born.push(new Array(BC).fill(0)); }
    function closed(r, c) { return hz[r][c] >= 0 && hz[r + 1][c] >= 0 && vt[r][c] >= 0 && vt[r][c + 1] >= 0; }
    function take(kind, r, c) {
      if (result) return false;
      var arr = kind === "h" ? hz : vt;
      if (arr[r][c] >= 0) return false;
      rec([kind, r, c]);
      arr[r][c] = turn; lastE = [kind, r, c]; sfx.tap();
      var got = 0, cand = kind === "h" ? [[r - 1, c], [r, c]] : [[r, c - 1], [r, c]];
      cand.forEach(function (q) { if (q[0] >= 0 && q[0] < BR && q[1] >= 0 && q[1] < BC && box[q[0]][q[1]] < 0 && closed(q[0], q[1])) { box[q[0]][q[1]] = turn; born[q[0]][q[1]] = t; got++; } });
      if (got) { score[turn] += got; sfx.drop(); again = replaying ? 0 : 1.2; } else turn = 1 - turn;
      if (score[0] + score[1] === BC * BR) finish(score[0] === score[1] ? -1 : score[0] > score[1] ? 0 : 1);
      return true;
    }
    function nearest(p) {
      var best = null, bd = S * 0.4;
      for (var r = 0; r <= BR; r++) for (var c = 0; c < BC; c++) { var d = Math.hypot(p.x - (x0 + c * S + S / 2), p.y - (y0 + r * S)); if (d < bd && hz[r][c] < 0) { bd = d; best = ["h", r, c]; } }
      for (r = 0; r < BR; r++) for (c = 0; c <= BC; c++) { d = Math.hypot(p.x - (x0 + c * S), p.y - (y0 + r * S + S / 2)); if (d < bd && vt[r][c] < 0) { bd = d; best = ["v", r, c]; } }
      return best;
    }
    function seg(e) { if (e[0] === "h") return [x0 + e[2] * S, y0 + e[1] * S, x0 + (e[2] + 1) * S, y0 + e[1] * S]; return [x0 + e[2] * S, y0 + e[1] * S, x0 + e[2] * S, y0 + (e[1] + 1) * S]; }
    return {
      // touching shows the line it would draw; lifting the finger draws it
      down: function (p, id) { if (result) return; prev = nearest(p); prevId = id; },
      move: function (p, id) { if (id === prevId && prev) { var n = nearest(p); if (n) prev = n; } },
      up: function (p, id) { if (id !== prevId) return; var e = prev; prev = null; prevId = null; if (e) take(e[0], e[1], e[2]); },
      update: function (dt) { again = Math.max(0, again - dt); },
      draw: function () {
        table(); homeButton();
        if (!result) turnGlow(turn);
        rr(x0 - 40, y0 - 40, BC * S + 80, BR * S + 80, 24); ctx.fillStyle = cfg.theme === "contrast" ? "#fff" : "#f4efe3"; ctx.fill();
        for (var r = 0; r < BR; r++) for (var c = 0; c < BC; c++) if (box[r][c] >= 0) {
          var k = cfg.calm ? 1 : ease((t - born[r][c]) / 0.35), bx = x0 + c * S + S / 2, by = y0 + r * S + S / 2, hs = (S - 12) / 2 * k;
          ctx.fillStyle = PC[box[r][c]]; ctx.globalAlpha = 0.38; ctx.fillRect(bx - hs, by - hs, hs * 2, hs * 2); ctx.globalAlpha = 1;
          ctx.save(); ctx.translate(bx, by); ctx.rotate(box[r][c] === 0 ? Math.PI / 2 : -Math.PI / 2);
          ctx.font = "bold " + Math.round(S * 0.38 * k) + "px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = PD[box[r][c]]; ctx.fillText(PNAME[box[r][c]].charAt(0).toUpperCase(), 0, 0); ctx.restore();
        }
        ctx.lineCap = "round";
        for (r = 0; r <= BR; r++) for (c = 0; c < BC; c++) { var v = hz[r][c]; ctx.strokeStyle = v < 0 ? "rgba(0,0,0,0.08)" : PC[v]; ctx.lineWidth = v < 0 ? 4 : 12; ctx.beginPath(); ctx.moveTo(x0 + c * S, y0 + r * S); ctx.lineTo(x0 + (c + 1) * S, y0 + r * S); ctx.stroke(); }
        for (r = 0; r < BR; r++) for (c = 0; c <= BC; c++) { v = vt[r][c]; ctx.strokeStyle = v < 0 ? "rgba(0,0,0,0.08)" : PC[v]; ctx.lineWidth = v < 0 ? 4 : 12; ctx.beginPath(); ctx.moveTo(x0 + c * S, y0 + r * S); ctx.lineTo(x0 + c * S, y0 + (r + 1) * S); ctx.stroke(); }
        if (prev) { var sg = seg(prev); ctx.strokeStyle = alpha(PC[turn], 0.5 + 0.3 * Math.sin(t * 10)); ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(sg[0], sg[1]); ctx.lineTo(sg[2], sg[3]); ctx.stroke(); }
        if (lastE) { var e = seg(lastE), dx = Math.sign(e[2] - e[0]) * 20, dy = Math.sign(e[3] - e[1]) * 20; ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(e[0] + dx, e[1] + dy); ctx.lineTo(e[2] - dx, e[3] - dy); ctx.stroke(); }
        ctx.lineCap = "butt";
        for (r = 0; r <= BR; r++) for (c = 0; c <= BC; c++) circle(x0 + c * S, y0 + r * S, 10, "#2b2b2b");
        scoreSide(0, PNAME[0] + "  " + score[0]); scoreSide(1, PNAME[1] + "  " + score[1]);
        if (again > 0 && !result) ptext(turn, L("Again!"), turn === 0 ? 150 : W - 150, H / 2, 44, PC[turn]);
      },
      legal: function () { var o = []; for (var r = 0; r <= BR; r++) for (var c = 0; c < BC; c++) if (hz[r][c] < 0) o.push(["h", r, c]); for (r = 0; r < BR; r++) for (c = 0; c <= BC; c++) if (vt[r][c] < 0) o.push(["v", r, c]); return o; },
      take: take, playMove: function (m) { take(m[0], m[1], m[2]); }, turn: function () { return turn; }
    };
  }

  // ---------- CHESS ----------
  // Red's back rank is the left column (c = 0) and moves toward +c; Blue's back rank is c = 7.
  function Chess() {
    var N = 8, S = 108, x0 = MID - N * S / 2, y0 = 500 - N * S / 2;
    var ORDER = ["r", "n", "b", "q", "k", "b", "n", "r"], GLYPH = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" }, VAL = { q: 9, r: 5, b: 3, n: 3, p: 1 };
    var b = [], turn = starter, sel = null, ep = null, last = null, captured = [[], []], promo = null, half = 0, seen = {}, offer = -1, resign = [-9, -9], gl = glide();
    var CLK = (cfg.clock || 0) * 60, clock = match && match.clock ? match.clock.slice() : [CLK, CLK];
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
        if (inb(r, c + f) && !b[r][c + f]) { o.push([r, c + f]); if (!q.m && inb(r, c + 2 * f) && !b[r][c + 2 * f]) o.push([r, c + 2 * f, "double"]); }
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
    function isPromo(r, c, m) { var q = b[r][c]; return q.t === "p" && (m[1] === 0 || m[1] === N - 1); }
    function key() { return turn + b.map(function (row) { return row.map(function (q) { return q ? (q.p ? q.t.toUpperCase() : q.t) : "."; }).join(""); }).join(""); }
    function cx(c) { return x0 + c * S + S / 2; }
    function cy(r) { return y0 + r * S + S / 2; }
    function apply(r, c, m) {
      rec([r, c, m]);
      var q = b[r][c], victim = m[2] === "ep" ? b[m[0]][c] : b[m[0]][m[1]];
      if (victim) { captured[q.p].push(victim.t); burst(cx(m[1]), cy(m[0]), PC[victim.p], 18, 320); }
      half = victim || q.t === "p" ? 0 : half + 1;
      b = simulate(r, c, m); q.m = true;
      gl.set(m[0] + "," + m[1], cx(c), cy(r));
      if (m[2] === "castle") b[m[0] - Math.sign(m[0] - r)][c].m = true;
      if (q.t === "p" && (m[1] === 0 || m[1] === N - 1)) b[m[0]][m[1]] = { p: q.p, t: m[4] || "q", m: true };
      ep = m[2] === "double" ? [r, c + fwd(q.p)] : null;
      last = [r, c, m[0], m[1]]; sel = null; promo = null; offer = -1; sfx.drop();
      turn = 1 - turn;
      var any = allLegal(turn).length, k = key();
      seen[k] = (seen[k] || 0) + 1;
      if (!any) { if (inCheck(b, turn)) finish(1 - turn, L("Checkmate!")); else finish(-1, L("Stalemate")); return; }
      if (inCheck(b, turn)) haptic("heavy");
      var left = []; b.forEach(function (row) { row.forEach(function (x) { if (x && x.t !== "k") left.push(x.t); }); });
      if (!left.length || (left.length === 1 && (left[0] === "b" || left[0] === "n"))) finish(-1, L("Not enough pieces"));
      else if (seen[k] >= 3) finish(-1, L("Threefold repetition"));
      else if (half >= 100) finish(-1, L("50 moves without capture or pawn move"));
    }
    function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2); }
    function promoBox(p) { var x = p === 0 ? x0 - 150 : x0 + N * S + 150; return ["q", "r", "b", "n"].map(function (tp, i) { return { t: tp, x: x, y: 500 + (p === 0 ? 1 : -1) * (i - 1.5) * 110 }; }); }
    seen[key()] = 1;
    return {
      down: function (pt) {
        if (result || gl.busy()) return;
        for (var p = 0; p < 2; p++) {
          if (onSB(pt, p, 2)) { if (offer === 1 - p) finish(-1, L("Draw agreed")); else { offer = offer === p ? -1 : p; sfx.tap(); } return; }
          if (onSB(pt, p, 3)) { if (t - resign[p] < 2.5) finish(1 - p, PNAME[p] + " " + L("resigned")); else { resign[p] = t; sfx.tap(); } return; }
        }
        if (promo) {
          var pick = promoBox(turn).filter(function (o) { return Math.hypot(pt.x - o.x, pt.y - o.y) < 52; })[0];
          if (pick) { var m2 = promo.m.slice(); m2[4] = pick.t; apply(promo.r, promo.c, m2); } else promo = null;
          return;
        }
        var c = Math.floor((pt.x - x0) / S), r = Math.floor((pt.y - y0) / S);
        if (!inb(r, c)) return;
        if (sel) {
          var mv = legal(sel[0], sel[1]).filter(function (m) { return m[0] === r && m[1] === c; })[0];
          if (mv) { if (isPromo(sel[0], sel[1], mv)) { promo = { r: sel[0], c: sel[1], m: mv }; sfx.tap(); } else apply(sel[0], sel[1], mv); return; }
        }
        if (b[r][c] && b[r][c].p === turn && legal(r, c).length) { sel = [r, c]; sfx.tap(); } else sel = null;
      },
      move: function () {}, up: function () {},
      update: function (dt) {
        gl.step(dt);
        if (CLK && !result && !coin && !replaying) { clock[turn] -= dt; if (match) match.clock = clock.slice(); if (clock[turn] <= 0) finish(1 - turn, L("Time is up")); }
      },
      draw: function () {
        table(); homeButton();
        if (!result) turnGlow(turn);
        rr(x0 - 22, y0 - 22, N * S + 44, N * S + 44, 18); ctx.fillStyle = "#3b2a1c"; ctx.fill();
        var light = cfg.theme === "contrast" ? "#ffffff" : "#f0d9b5", dark = cfg.theme === "contrast" ? "#777777" : "#b58863";
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) { ctx.fillStyle = (r + c) % 2 ? dark : light; ctx.fillRect(x0 + c * S, y0 + r * S, S, S); }
        if (last) { ctx.fillStyle = "rgba(255,230,80,0.35)"; [[last[0], last[1]], [last[2], last[3]]].forEach(function (q) { ctx.fillRect(x0 + q[1] * S, y0 + q[0] * S, S, S); }); }
        var k = kingPos(b, turn), chk = k && inCheck(b, turn);
        if (chk) { ctx.fillStyle = "rgba(255,40,40,0.35)"; ctx.fillRect(x0 + k[1] * S, y0 + k[0] * S, S, S); ctx.strokeStyle = "rgba(255,30,30," + (0.7 + 0.3 * Math.sin(t * 8)) + ")"; ctx.lineWidth = 7; ctx.strokeRect(x0 + k[1] * S + 4, y0 + k[0] * S + 4, S - 8, S - 8); }
        if (sel) { ctx.fillStyle = "rgba(120,200,255,0.45)"; ctx.fillRect(x0 + sel[1] * S, y0 + sel[0] * S, S, S); }
        function piece(q, x, y, sz) {
          ctx.save(); ctx.translate(x, y); ctx.rotate(q.p === 0 ? Math.PI / 2 : -Math.PI / 2);
          ctx.font = sz + "px 'Apple Symbols', 'Segoe UI Symbol', 'DejaVu Sans', serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.lineWidth = 5; ctx.strokeStyle = PD[q.p]; ctx.strokeText(GLYPH[q.t], 0, 4);
          ctx.fillStyle = PC[q.p]; ctx.fillText(GLYPH[q.t], 0, 4);
          ctx.restore();
          if (cfg.cb) mark(q.p, x + S * 0.3, y + (q.p === 0 ? -1 : 1) * S * 0.3, 20);
        }
        for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
          var q = b[r][c]; if (!q) continue;
          var ps = gl.pos(r + "," + c, cx(c), cy(r)); piece(q, ps[0], ps[1], 84);
        }
        if (sel) legal(sel[0], sel[1]).forEach(function (m) { circle(cx(m[1]), cy(m[0]), b[m[0]][m[1]] ? 48 : 16, b[m[0]][m[1]] ? "rgba(255,60,60,0.3)" : "rgba(0,0,0,0.3)"); });
        if (promo) promoBox(turn).forEach(function (o) { circle(o.x, o.y, 50, "rgba(255,255,255,0.92)"); piece({ p: turn, t: o.t }, o.x, o.y, 70); });
        for (var p = 0; p < 2; p++) {
          scoreSide(p, PNAME[p]);
          sideBtn(p, 2, "draw", offer === 1 - p); sideBtn(p, 3, "flag", t - resign[p] < 2.5);
          if (!result && turn === p && chk) ptext(p, L("Check!"), p === 0 ? 92 : W - 92, H / 2, 26, "#ff6b6b");
          if (!result && offer === 1 - p) ptext(p, L("Draw offered: tap ½ to accept"), p === 0 ? 140 : W - 140, 300 + (p === 0 ? 0 : 400), 20, "#ffd84a");
          if (!result && t - resign[p] < 2.5) ptext(p, L("Tap the flag again to resign"), p === 0 ? 172 : W - 172, 300 + (p === 0 ? 0 : 400), 20, "#ff9b9b");
          if (promo && turn === p) ptext(p, L("Promote to"), p === 0 ? x0 - 150 : x0 + N * S + 150, p === 0 ? 225 : 775, 24, "#fff");
          var cap = captured[p].slice().sort(function (a, z) { return VAL[z] - VAL[a]; }).map(function (tp) { return GLYPH[tp]; }).join("");
          if (cap && !(promo && turn === p)) ptext(p, cap, p === 0 ? 128 : W - 128, H / 2, 30, "rgba(255,255,255,0.8)", "normal");
          if (CLK) ptext(p, fmt(clock[p]), p === 0 ? 200 : W - 200, p === 0 ? 800 : 200, 40, clock[p] < 30 ? "#ff6b6b" : turn === p && !result ? "#fff" : "rgba(255,255,255,0.5)");
        }
      },
      legal: function () { return allLegal(turn).map(function (mv) { if (isPromo(mv[0], mv[1], mv[2])) { var m2 = mv[2].slice(); m2[4] = "q"; return [mv[0], mv[1], m2]; } return mv; }); },
      playMove: function (mv) { apply(mv[0], mv[1], mv[2]); }, turn: function () { return turn; }, busy: gl.busy
    };
  }

  // ---------- BACKGAMMON ----------
  // Points 1..24 from Red's view: Red moves 24 -> 1 and bears off from 1-6; Blue moves 1 -> 24, home 19-24.
  // Layout: Red's near row (points 1-12) runs up the left side, Blue's (13-24) down the right side; the bar is the middle band.
  function Backgammon() {
    var pts = new Array(26).fill(0), bar = [0, 0], off = [0, 0], turn = starter, dice = [], rolled = false, sel = null, msg = "", msgT = 0, roll = null, shown = [], turnStart = 0;
    var CUBE = !!cfg.cube, cube = { v: 1, own: -1 }, offered = false, gl = glide();
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
    function quick() { return window.tt.fast || replaying; }
    function doRoll() {
      rec("roll");
      var a = 1 + Math.floor(rnd() * 6), c = 1 + Math.floor(rnd() * 6);
      dice = a === c ? [a, a, a, a] : [a, c]; shown = [a, c]; rolled = true; roll = cfg.calm ? 0 : 0.6; sfx.drop(); turnStart = match ? match.log.length : 0;
      if (a === c && !replaying) toast(L("Doubles! 4 moves"), PC[turn]);
      if (!legalNow().length) { msg = L("No moves"); msgT = quick() ? 0.0001 : 1.4; if (replaying) endTurn(); }
    }
    function endTurn() { turn = 1 - turn; rolled = false; dice = []; sel = null; msgT = 0; }
    function pips(p) { var n = bar[p] * 25; for (var s = 1; s <= 24; s++) if (own(p, pts[s])) n += cnt(pts[s]) * (p === 0 ? s : 25 - s); return n; }
    function play(m) {
      rec(m);
      var from = m[0] !== "bar" ? checkerPos(m[0], cnt(pts[m[0]]) - 1) : [turn === 0 ? MID - 60 : MID + 60, 500];
      var st = applyTo(snap(), turn, m); pts = st.pts; bar = st.bar; off = st.off;
      if (m[1] !== "off") gl.set("p" + m[1], from[0], from[1]);
      dice.splice(dice.indexOf(m[2]), 1); sel = null; sfx.tap();
      if (off[turn] === 15) {
        var lo = 1 - turn, mult = 1, note = "";
        if (!off[lo]) { mult = 2; note = L("Gammon! Counts double"); var deep = bar[lo] > 0; for (var s = 1; s <= 24; s++) if (own(lo, pts[s]) && home(turn, s)) deep = true; if (deep) { mult = 3; note = L("Backgammon! Counts triple"); } }
        if (cube.v > 1) note = (note ? note + "  " : "") + L("Cube") + " x" + cube.v;
        finish(turn, note, mult * cube.v); return;
      }
      if (!dice.length || !legalNow().length) { if (dice.length) { msg = L("No more moves"); msgT = quick() ? 0.0001 : 1.2; if (replaying) endTurn(); } else endTurn(); }
    }
    function cubeAct(k) {
      rec(k);
      if (k === "dbl") { offered = true; sfx.tap(); }
      else if (k === "take") { offered = false; cube.v *= 2; cube.own = 1 - turn; sfx.drop(); }
      else if (k === "drop") { offered = false; finish(turn, L("Double declined"), cube.v); }
    }
    function mayDouble() { return CUBE && !rolled && !offered && !result && (cube.own === -1 || cube.own === turn) && cube.v < 64; }
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
        if (offered) {
          var o = 1 - turn;
          if (onSB(pt, o, 2)) cubeAct("take"); else if (onSB(pt, o, 3)) cubeAct("drop");
          return;
        }
        if (mayDouble() && onSB(pt, turn, 2)) { cubeAct("dbl"); return; }
        if (!rolled) { var rb = rollBtn(turn); if (Math.hypot(pt.x - rb.x, pt.y - rb.y) < 90) doRoll(); return; }
        if (msgT > 0 || gl.busy()) return;
        var h = hit(pt), LG = legalNow();
        if (sel != null) {
          var mv = LG.filter(function (m) { return m[0] === sel && m[1] === h; }).sort(function (a, c) { return a[2] - c[2]; })[0];
          if (mv) { play(mv); return; }
        }
        if (h != null && LG.some(function (m) { return m[0] === h; })) { sel = h; sfx.tap(); } else sel = null;
      },
      move: function () {}, up: function () {},
      update: function (dt) {
        gl.step(dt);
        if (roll > 0) roll -= dt;
        if (msgT > 0) { msgT -= dt; if (msgT <= 0) endTurn(); }
      },
      draw: function () {
        table(); homeButton();
        if (!result) turnGlow(turn);
        rr(BX0 - 20, BY0 - 20, BX1 - BX0 + 40, BY1 - BY0 + 40, 20); ctx.fillStyle = "#5a3920"; ctx.fill();
        ctx.fillStyle = cfg.theme === "contrast" ? "#ffffff" : "#e9dcc0"; ctx.fillRect(BX0, BY0, BX1 - BX0, BY1 - BY0);
        ctx.fillStyle = "#5a3920"; ctx.fillRect(BX0, BAR0, BX1 - BX0, BAR1 - BAR0);
        var LG = legalNow(), targets = sel != null ? LG.filter(function (m) { return m[0] === sel; }).map(function (m) { return m[1]; }) : [];
        var movable = sel == null && rolled && !result ? LG.map(function (m) { return m[0]; }) : [];
        for (var s = 1; s <= 24; s++) {
          var pb = pointBox(s), tip = pb.left ? pb.x + LEN : pb.x - LEN;
          ctx.beginPath(); ctx.moveTo(pb.x, pb.y - PH / 2 + 3); ctx.lineTo(tip, pb.y); ctx.lineTo(pb.x, pb.y + PH / 2 - 3); ctx.closePath();
          ctx.fillStyle = s % 2 ? "#9c3b2a" : "#2f5d7c"; ctx.fill();
          if (targets.indexOf(s) >= 0) { ctx.strokeStyle = "rgba(255,225,77," + (0.7 + 0.3 * Math.sin(t * 8)) + ")"; ctx.lineWidth = 7; ctx.stroke(); }
          var n = cnt(pts[s]), who = pts[s] > 0 ? 0 : 1;
          for (var i = 0; i < Math.min(n, 15); i++) {
            var cp = checkerPos(s, i); if (i === n - 1) cp = gl.pos("p" + s, cp[0], cp[1]);
            stone(who, cp[0], cp[1], 29);
            if (i === n - 1 && movable.indexOf(s) >= 0) ring(cp[0], cp[1], 32, "rgba(255,225,77,0.6)", 4);
            if (sel === s && i === n - 1) ring(cp[0], cp[1], 31, "#fff", 5);
          }
        }
        for (var p = 0; p < 2; p++) {
          for (var j = 0; j < bar[p]; j++) { var bx = p === 0 ? MID - 60 - j * 50 : MID + 60 + j * 50; stone(p, bx, 500, 27); }
          if (sel === "bar" && turn === p) ring(p === 0 ? MID - 60 : MID + 60, 500, 30, "#fff", 5);
          var tx = p === 0 ? 75 : W - 75, ty0 = p === 0 ? 620 : 80;
          rr(tx - 45, ty0, 90, 300, 16); ctx.fillStyle = targets.indexOf("off") >= 0 && turn === p ? "rgba(255,225,77,0.5)" : "rgba(0,0,0,0.25)"; ctx.fill();
          for (var k = 0; k < off[p]; k++) { ctx.fillStyle = PC[p]; ctx.fillRect(tx - 34, p === 0 ? 622 + k * 18 : 365 - k * 18, 68, 13); }
          ptext(p, L("Off ") + off[p], tx, p === 0 ? 590 : 410, 22, "#fff");
          scoreSide(p, PNAME[p] + "  ·  " + pips(p) + " " + L("pips"));
          if (CUBE) {
            var mine = cube.own === p || cube.own === -1;
            if (offered && p === 1 - turn) { sideBtn(p, 2, "x2", true); sideBtn(p, 3, "flag", false); ptext(p, L("Double! Take (x2) or give up (flag)"), p === 0 ? 150 : W - 150, p === 0 ? 300 : 700, 20, "#ffd84a"); }
            else if (mayDouble() && turn === p) sideBtn(p, 2, "x2", false);
            if (mine) ptext(p, L("Cube") + " " + cube.v, p === 0 ? 100 : W - 100, p === 0 ? 250 : 750, 20, "rgba(255,255,255,0.7)");
          }
        }
        if (!result && !rolled && !offered) {
          var rb = rollBtn(turn); circle(rb.x, rb.y, 80, PC[turn]); circle(rb.x, rb.y, 70, PD[turn]); ptext(turn, L("Roll"), rb.x, rb.y, 40, "#fff");
        }
        if (rolled && shown.length) {
          var cx = turn === 0 ? 420 : W - 420;
          shown.forEach(function (v, i) {
            var dy = (i === 0 ? -42 : 42), spin = roll > 0 ? roll * 18 : 0, jig = roll > 0 ? Math.sin(t * 40 + i) * 10 : 0, used = dice.indexOf(v) < 0 && !(shown[0] === shown[1] && dice.length);
            var face = roll > 0.15 ? 1 + Math.floor((t * 20 + i * 3) % 6) : v;
            ctx.save(); ctx.translate(cx + dy, 500 + jig); ctx.rotate((turn === 0 ? Math.PI / 2 : -Math.PI / 2) + spin);
            rr(-30, -30, 60, 60, 12); ctx.fillStyle = used ? "rgba(255,255,255,0.35)" : "#fff"; ctx.fill();
            var P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
            P[face].forEach(function (q) { circle(q[0] * 15, q[1] * 15, 6, "#222"); });
            ctx.restore();
          });
          if (shown[0] === shown[1]) ptext(turn, "x" + dice.length, cx + (turn === 0 ? -70 : 70), 500, 28, "#fff");
        }
        if (msgT > 0) ptext(turn, msg, turn === 0 ? 300 : W - 300, 500, 40, "#ffe14d");
      },
      legal: function () { return rolled ? legalNow() : ["roll"]; },
      playMove: function (m) { if (m === "roll") doRoll(); else if (m === "dbl" || m === "take" || m === "drop") cubeAct(m); else play(m); },
      state: function () { return { off: off.slice(), bar: bar.slice(), turn: turn }; },
      busy: function () { return msgT > 0 || gl.busy(); }, turn: function () { return turn; },
      soloUndo: function (p) { var lg = match.log; return p === turn && rolled && lg.length > turnStart && typeof lg[lg.length - 1] !== "string"; },
      undoCut: function (lg) { return rolled && lg.length > turnStart && typeof lg[lg.length - 1] !== "string" ? lg.length - 1 : -1; }
    };
  }

  // ---------- MILL (Nine Men's Morris) ----------
  function Mill() {
    var RS = [400, 270, 140], OFF = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
    var P = [], adj = [], MILLS = [];
    for (var k = 0; k < 3; k++) for (var i = 0; i < 8; i++) { P.push([MID + OFF[i][0] * RS[k], 500 + OFF[i][1] * RS[k]]); adj.push([]); }
    for (k = 0; k < 3; k++) for (i = 0; i < 8; i++) {
      var a = k * 8 + i; adj[a].push(k * 8 + (i + 1) % 8); adj[a].push(k * 8 + (i + 7) % 8);
      if (i % 2) { if (k > 0) adj[a].push(a - 8); if (k < 2) adj[a].push(a + 8); }
      if (i % 2 === 0) MILLS.push([k * 8 + i, k * 8 + (i + 1) % 8, k * 8 + (i + 2) % 8]);
    }
    for (i = 1; i < 8; i += 2) MILLS.push([i, 8 + i, 16 + i]);
    var b = new Array(24).fill(-1), hand = [9, 9], onb = [0, 0], turn = starter, sel = null, take = false, quiet = 0, last = null, gl = glide();
    function inMill(x) { var p = b[x]; return p >= 0 && MILLS.some(function (m) { return m.indexOf(x) >= 0 && b[m[0]] === p && b[m[1]] === p && b[m[2]] === p; }); }
    function phase(p) { return hand[p] > 0 ? "place" : onb[p] === 3 ? "fly" : "move"; }
    function movesOf(p) {
      var o = [], ph = phase(p);
      if (ph === "place") { for (var x = 0; x < 24; x++) if (b[x] < 0) o.push(["p", x]); return o; }
      for (var f = 0; f < 24; f++) if (b[f] === p) {
        if (ph === "fly") { for (var y = 0; y < 24; y++) if (b[y] < 0) o.push(["m", f, y]); }
        else adj[f].forEach(function (y) { if (b[y] < 0) o.push(["m", f, y]); });
      }
      return o;
    }
    function removable() {
      var o = [], all = [];
      for (var x = 0; x < 24; x++) if (b[x] === 1 - turn) { all.push(["x", x]); if (!inMill(x)) o.push(["x", x]); }
      return o.length ? o : all;
    }
    function legalNow() { return result ? [] : take ? removable() : movesOf(turn); }
    function next() {
      turn = 1 - turn;
      if (hand[turn] + onb[turn] < 3) { finish(1 - turn); return; }
      if (!movesOf(turn).length) { finish(1 - turn, L("No moves left")); return; }
      if (hand[0] + hand[1] === 0 && quiet >= 60) finish(-1, L("30 moves without a mill"));
    }
    function apply(m) {
      rec(m);
      if (m[0] === "x") { b[m[1]] = -1; onb[1 - turn]--; take = false; quiet = 0; sfx.drop(); burst(P[m[1]][0], P[m[1]][1], PC[1 - turn], 18, 300); next(); return; }
      var to;
      if (m[0] === "p") { to = m[1]; b[to] = turn; hand[turn]--; onb[turn]++; }
      else { to = m[2]; b[to] = turn; b[m[1]] = -1; gl.set(to, P[m[1]][0], P[m[1]][1]); quiet++; }
      last = to; sel = null; sfx.drop();
      if (inMill(to) && MILLS.some(function (q) { return q.indexOf(to) >= 0 && q.every(function (x) { return b[x] === turn; }); })) { take = true; if (!replaying) toast(L("Mill! Take a stone"), PC[turn]); return; }
      next();
    }
    function at(pt) { for (var x = 0; x < 24; x++) if (Math.hypot(pt.x - P[x][0], pt.y - P[x][1]) < 48) return x; return -1; }
    return {
      down: function (pt) {
        if (result || gl.busy()) return;
        var x = at(pt); if (x < 0) { sel = null; return; }
        var LG = legalNow();
        if (take || phase(turn) === "place") { var mv = LG.filter(function (m) { return m[1] === x; })[0]; if (mv) apply(mv); else sfx.bad(); return; }
        if (sel != null) { var mv2 = LG.filter(function (m) { return m[1] === sel && m[2] === x; })[0]; if (mv2) { apply(mv2); return; } }
        if (b[x] === turn && LG.some(function (m) { return m[1] === x; })) { sel = x; sfx.tap(); } else sel = null;
      },
      move: function () {}, up: function () {}, update: function (dt) { gl.step(dt); },
      draw: function () {
        table(); homeButton();
        if (!result) turnGlow(turn);
        rr(MID - 450, 50, 900, 900, 30); ctx.fillStyle = cfg.theme === "contrast" ? "#fff" : "#e7d3a8"; ctx.fill();
        ctx.strokeStyle = "#3a2a18"; ctx.lineWidth = 8;
        RS.forEach(function (s) { ctx.strokeRect(MID - s, 500 - s, s * 2, s * 2); });
        ctx.beginPath(); [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(function (d) { ctx.moveTo(MID + d[0] * RS[0], 500 + d[1] * RS[0]); ctx.lineTo(MID + d[0] * RS[2], 500 + d[1] * RS[2]); }); ctx.stroke();
        var LG = legalNow(), tgt = [];
        if (take) tgt = LG.map(function (m) { return m[1]; });
        else if (sel != null) tgt = LG.filter(function (m) { return m[1] === sel; }).map(function (m) { return m[2]; });
        for (var x = 0; x < 24; x++) {
          circle(P[x][0], P[x][1], 12, "#3a2a18");
          if (b[x] >= 0) { var ps = gl.pos(x, P[x][0], P[x][1]); stone(b[x], ps[0], ps[1], 40); if (x === last) ring(ps[0], ps[1], 44, "rgba(255,230,80,0.8)", 4); }
          if (tgt.indexOf(x) >= 0) { if (take) ring(P[x][0], P[x][1], 46, "rgba(255,60,60," + (0.6 + 0.4 * Math.sin(t * 8)) + ")", 6); else circle(P[x][0], P[x][1], 16, "rgba(0,0,0,0.35)"); }
          if (sel === x) ring(P[x][0], P[x][1], 46, "#fff", 6);
        }
        for (var p = 0; p < 2; p++) {
          scoreSide(p, PNAME[p] + "  " + (hand[p] + onb[p]));
          for (var h = 0; h < hand[p]; h++) stone(p, p === 0 ? 150 : W - 150, p === 0 ? 120 + h * 50 : H - 120 - h * 50, 20);
          if (!result && turn === p) ptext(p, take ? L("Take a stone") : phase(p) === "place" ? L("Place a stone") : phase(p) === "fly" ? L("Jump anywhere") : L("Move a stone"), p === 0 ? 94 : W - 94, H / 2, 22, "#ffd84a");
        }
      },
      legal: legalNow, playMove: apply, turn: function () { return turn; }, busy: gl.busy
    };
  }

  // ---------- REVERSI ----------
  function Reversi() {
    var N = 8, S = 108, x0 = MID - N * S / 2, y0 = 500 - N * S / 2;
    var b = [], flipT = [], turn = starter, last = null;
    for (var r = 0; r < N; r++) { b.push(new Array(N).fill(-1)); flipT.push(new Array(N).fill(-9)); }
    b[3][3] = 0; b[4][4] = 0; b[3][4] = 1; b[4][3] = 1;
    var D = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    function flips(r, c, p) {
      if (b[r][c] >= 0) return [];
      var o = [];
      D.forEach(function (d) {
        var line = [], rr2 = r + d[0], cc = c + d[1];
        while (rr2 >= 0 && rr2 < N && cc >= 0 && cc < N && b[rr2][cc] === 1 - p) { line.push([rr2, cc]); rr2 += d[0]; cc += d[1]; }
        if (line.length && rr2 >= 0 && rr2 < N && cc >= 0 && cc < N && b[rr2][cc] === p) o = o.concat(line);
      });
      return o;
    }
    function movesOf(p) { var o = []; for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (flips(r, c, p).length) o.push([r, c]); return o; }
    function count(p) { var n = 0; b.forEach(function (row) { row.forEach(function (v) { if (v === p) n++; }); }); return n; }
    function apply(m) {
      var f = flips(m[0], m[1], turn); if (!f.length) return;
      rec(m);
      b[m[0]][m[1]] = turn; last = m; sfx.drop();
      f.forEach(function (q, i) { b[q[0]][q[1]] = turn; flipT[q[0]][q[1]] = t + i * 0.04; });
      turn = 1 - turn;
      if (!movesOf(turn).length) {
        if (!movesOf(1 - turn).length) { var a = count(0), z = count(1); finish(a === z ? -1 : a > z ? 0 : 1, a + " : " + z); return; }
        if (!replaying) toast(PNAME[turn] + ": " + L("no move, pass"), PC[turn]);
        turn = 1 - turn;
      }
    }
    return {
      down: function (pt) {
        if (result) return;
        var c = Math.floor((pt.x - x0) / S), r = Math.floor((pt.y - y0) / S);
        if (r < 0 || r >= N || c < 0 || c >= N) return;
        if (flips(r, c, turn).length) apply([r, c]); else sfx.bad();
      },
      move: function () {}, up: function () {}, update: function () {},
      draw: function () {
        table(); homeButton();
        if (!result) turnGlow(turn);
        rr(x0 - 22, y0 - 22, N * S + 44, N * S + 44, 18); ctx.fillStyle = "#1f3b2c"; ctx.fill();
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) { ctx.fillStyle = cfg.theme === "contrast" ? "#202020" : "#2e7d4f"; ctx.fillRect(x0 + c * S + 2, y0 + r * S + 2, S - 4, S - 4); }
        [[2, 2], [2, 6], [6, 2], [6, 6]].forEach(function (q) { circle(x0 + q[1] * S, y0 + q[0] * S, 6, "#173a2a"); });
        var mv = result ? [] : movesOf(turn);
        mv.forEach(function (q) { circle(x0 + q[1] * S + S / 2, y0 + q[0] * S + S / 2, 12, alpha(PC[turn], 0.5)); });
        for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
          var v = b[r][c]; if (v < 0) continue;
          var x = x0 + c * S + S / 2, y = y0 + r * S + S / 2, k = cfg.calm ? 1 : clamp((t - flipT[r][c]) / 0.3, 0, 1);
          ctx.save(); ctx.translate(x, y); ctx.scale(Math.abs(Math.cos(Math.PI * (1 - k) / 2 * 2)) || 0.05, 1);
          stone(k < 0.5 ? 1 - v : v, 0, 0, S * 0.42); ctx.restore();
          if (last && last[0] === r && last[1] === c) circle(x, y, 7, "#ffd84a");
        }
        scoreSide(0, PNAME[0] + "  " + count(0)); scoreSide(1, PNAME[1] + "  " + count(1));
      },
      legal: function () { return result ? [] : movesOf(turn); }, playMove: apply, turn: function () { return turn; }
    };
  }

  // ---------- SUPER TIC-TAC-TOE (ultimate: nine small boards) ----------
  function Uttt() {
    var S = 96, G = 16, x0 = MID - (9 * S + 2 * G) / 2, y0 = 500 - (9 * S + 2 * G) / 2;
    var cell = new Array(81).fill(-1), small = new Array(9).fill(-1), turn = starter, next = -1, last = -1;
    var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    function idx(r, c) { return r * 9 + c; }
    function sb(r, c) { return Math.floor(r / 3) * 3 + Math.floor(c / 3); }
    function px(c) { return x0 + c * S + Math.floor(c / 3) * G; }
    function py(r) { return y0 + r * S + Math.floor(r / 3) * G; }
    function cellsOf(s) { var o = [], R = Math.floor(s / 3) * 3, C = (s % 3) * 3; for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) o.push(idx(R + r, C + c)); return o; }
    function won(arr, p) { return LINES.some(function (l) { return arr[l[0]] === p && arr[l[1]] === p && arr[l[2]] === p; }); }
    function legalNow() {
      if (result) return [];
      var o = [];
      for (var s = 0; s < 9; s++) { if (small[s] !== -1 || (next >= 0 && next !== s)) continue; cellsOf(s).forEach(function (i) { if (cell[i] < 0) o.push(i); }); }
      return o;
    }
    function apply(i) {
      rec(i);
      var r = Math.floor(i / 9), c = i % 9, s = sb(r, c);
      cell[i] = turn; last = i; sfx.drop();
      var loc = cellsOf(s).map(function (j) { return cell[j]; });
      if (won(loc, turn)) { small[s] = turn; burst(px(c), py(r), PC[turn], 20, 300); }
      else if (loc.every(function (v) { return v >= 0; })) small[s] = 2;
      if (won(small, turn)) { finish(turn); return; }
      if (small.every(function (v) { return v !== -1; })) {
        var a = small.filter(function (v) { return v === 0; }).length, z = small.filter(function (v) { return v === 1; }).length;
        finish(a === z ? -1 : a > z ? 0 : 1, a + " : " + z); return;
      }
      var to = (r % 3) * 3 + c % 3; next = small[to] === -1 ? to : -1;
      turn = 1 - turn;
    }
    function sym(p, x, y, sz, a) {
      ctx.save(); ctx.globalAlpha = a == null ? 1 : a; ctx.strokeStyle = PC[p]; ctx.lineWidth = sz * 0.22; ctx.lineCap = "round";
      ctx.beginPath();
      if (p === 0) ctx.arc(x, y, sz * 0.62, 0, 7); else { ctx.moveTo(x - sz * 0.55, y - sz * 0.55); ctx.lineTo(x + sz * 0.55, y + sz * 0.55); ctx.moveTo(x + sz * 0.55, y - sz * 0.55); ctx.lineTo(x - sz * 0.55, y + sz * 0.55); }
      ctx.stroke(); ctx.restore();
    }
    return {
      down: function (pt) {
        if (result) return;
        for (var r = 0; r < 9; r++) for (var c = 0; c < 9; c++) if (pt.x > px(c) && pt.x < px(c) + S && pt.y > py(r) && pt.y < py(r) + S) {
          if (legalNow().indexOf(idx(r, c)) >= 0) apply(idx(r, c)); else sfx.bad();
          return;
        }
      },
      move: function () {}, up: function () {}, update: function () {},
      draw: function () {
        table(); homeButton();
        if (!result) turnGlow(turn);
        rr(x0 - 20, y0 - 20, 9 * S + 2 * G + 40, 9 * S + 2 * G + 40, 24); ctx.fillStyle = cfg.theme === "contrast" ? "#fff" : "#f4efe3"; ctx.fill();
        for (var s = 0; s < 9; s++) {
          var R = Math.floor(s / 3) * 3, C = (s % 3) * 3, open2 = !result && small[s] === -1 && (next < 0 || next === s);
          if (open2) { ctx.fillStyle = alpha(PC[turn], 0.16 + 0.06 * Math.sin(t * 4)); ctx.fillRect(px(C), py(R), 3 * S, 3 * S); }
          ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 2;
          for (var k = 1; k < 3; k++) { ctx.beginPath(); ctx.moveTo(px(C) + k * S, py(R) + 6); ctx.lineTo(px(C) + k * S, py(R) + 3 * S - 6); ctx.moveTo(px(C) + 6, py(R) + k * S); ctx.lineTo(px(C) + 3 * S - 6, py(R) + k * S); ctx.stroke(); }
        }
        for (var i = 0; i < 81; i++) if (cell[i] >= 0) { var r = Math.floor(i / 9), c = i % 9; sym(cell[i], px(c) + S / 2, py(r) + S / 2, S * 0.5, small[sb(r, c)] >= 0 ? 0.35 : 1); if (i === last) circle(px(c) + S / 2, py(r) + S / 2, 6, "#222"); }
        for (s = 0; s < 9; s++) if (small[s] === 0 || small[s] === 1) sym(small[s], px((s % 3) * 3) + 1.5 * S, py(Math.floor(s / 3) * 3) + 1.5 * S, S * 1.5, 0.9);
        var cnt0 = small.filter(function (v) { return v === 0; }).length, cnt1 = small.filter(function (v) { return v === 1; }).length;
        scoreSide(0, PNAME[0] + "  " + cnt0); scoreSide(1, PNAME[1] + "  " + cnt1);
      },
      legal: legalNow, playMove: apply, turn: function () { return turn; }
    };
  }

  // ---------- PADDLE BALL (two paddles, one ball) ----------
  function Paddles() {
    var PX = [130, W - 130], PH2 = 90, PW = 13, BR2 = 16, TOP = 40, BOT = 960, TO = cfg.goals || 7;
    var pad = [{ y: 500, ty: 500 }, { y: 500, ty: 500 }], ball = { x: MID, y: 500, vx: 0, vy: 0 }, score = [0, 0], pause = window.tt.fast ? 0.3 : 2.2, owner = {}, trail = [], hits = 0;
    function serve(to) { ball.x = MID; ball.y = 500; var a = (rnd() - 0.5) * 0.8; ball.vx = Math.cos(a) * 620 * (to === 0 ? -1 : 1); ball.vy = Math.sin(a) * 620; hits = 0; trail = []; }
    serve(starter);
    function goal(s) {
      score[s]++; rec(["g", s]);
      if (replaying) return;
      sfx.goal(); burst(s === 0 ? W - 20 : 20, ball.y, PC[s], 50, 700);
      if (score[s] >= TO) { finish(s); pause = 99; } else { serve(1 - s); pause = 1.1; if (score[s] === TO - 1) toast(L("Match point!"), PC[s]); }
    }
    return {
      down: function (p, id) { var who = p.x < MID ? 0 : 1; owner[id] = who; pad[who].ty = p.y; },
      move: function (p, id) { var who = owner[id]; if (who != null) pad[who].ty = p.y; },
      up: function (p, id) { delete owner[id]; },
      update: function (dt) {
        pad.forEach(function (k) { k.ty = clamp(k.ty, TOP + PH2, BOT - PH2); k.y += (k.ty - k.y) * Math.min(1, dt * 25); });
        if (pause > 0) { pause -= dt; return; }
        var steps = Math.ceil(Math.hypot(ball.vx, ball.vy) * dt / 8), h = dt / steps;
        for (var s = 0; s < steps; s++) {
          ball.x += ball.vx * h; ball.y += ball.vy * h;
          if (ball.y < TOP + BR2) { ball.y = TOP + BR2; ball.vy = Math.abs(ball.vy); sfx.wall(); }
          if (ball.y > BOT - BR2) { ball.y = BOT - BR2; ball.vy = -Math.abs(ball.vy); sfx.wall(); }
          for (var p = 0; p < 2; p++) {
            var dir = p === 0 ? 1 : -1, fx = PX[p] + dir * PW;
            if ((p === 0 ? ball.vx < 0 && ball.x - BR2 <= fx && ball.x > PX[p] - PW : ball.vx > 0 && ball.x + BR2 >= fx && ball.x < PX[p] + PW) && Math.abs(ball.y - pad[p].y) < PH2 + BR2) {
              var off = (ball.y - pad[p].y) / (PH2 + BR2), sp = Math.min(1700, Math.hypot(ball.vx, ball.vy) * 1.06), ang = off * 1.0;
              ball.vx = Math.cos(ang) * sp * dir; ball.vy = Math.sin(ang) * sp; ball.x = fx + dir * BR2; hits++; sfx.hit(sp);
            }
          }
          if (ball.x < -BR2) { goal(1); return; }
          if (ball.x > W + BR2) { goal(0); return; }
        }
        if (!cfg.calm) { trail.push([ball.x, ball.y]); if (trail.length > 8) trail.shift(); }
      },
      draw: function () {
        table();
        rr(20, TOP - 14, W - 40, BOT - TOP + 28, 30); ctx.fillStyle = cfg.theme === "contrast" ? "#000" : "rgba(10,25,20,0.55)"; ctx.fill();
        ctx.save(); ctx.setLineDash([18, 18]); ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(MID, TOP); ctx.lineTo(MID, BOT); ctx.stroke(); ctx.restore();
        for (var p = 0; p < 2; p++) {
          ptext(p, String(score[p]), p === 0 ? MID - 120 : MID + 120, 500, 120, alpha(PC[p], 0.35));
          ptext(p, L("First to ") + TO, p === 0 ? 40 : W - 40, 500, 22, "rgba(255,255,255,0.7)", "normal");
          rr(PX[p] - PW, pad[p].y - PH2, PW * 2, PH2 * 2, PW); ctx.fillStyle = PC[p]; ctx.fill();
          if (cfg.cb) mark(p, PX[p], pad[p].y, 26);
          if (!result && score[p] === TO - 1) ptext(p, L("Match point!"), p === 0 ? MID - 230 : MID + 230, 500, 30, alpha(PC[p], 0.8));
        }
        trail.forEach(function (q, i) { ctx.globalAlpha = (i + 1) / trail.length * 0.3; circle(q[0], q[1], BR2 * (0.5 + 0.5 * i / trail.length), "#fff"); });
        ctx.globalAlpha = 1; circle(ball.x, ball.y, BR2, "#fff");
      },
      live: true,
      playMove: function (mv) { if (mv[0] === "g") goal(mv[1]); },
      state: function () { return { score: score.slice(), ball: [ball.x, ball.y], pad: [pad[0].y, pad[1].y] }; },
      steer: function (p, y) { pad[p].ty = y; }
    };
  }

  // ---------- SEA BATTLE: each player plays in their own half; fold the Duo a little and the fold hides your fleet ----------
  function Sea() {
    var N = 8, CS = 52, TX = 60, OX = 540, GY = 150, SHIPS = [4, 3, 3, 2, 2];
    var fleet = [null, null], shots = [[], []], ready = [false, false], turn = starter, battle = false, lastShot = [null, null], msg = ["", ""], msgT = [0, 0];
    function place() {
      var g = [], ships = [];
      for (var r = 0; r < N; r++) g.push(new Array(N).fill(-1));
      SHIPS.forEach(function (len, si) {
        for (var tries = 0; tries < 500; tries++) {
          var hz = rnd() < 0.5, r0 = Math.floor(rnd() * (hz ? N : N - len + 1)), c0 = Math.floor(rnd() * (hz ? N - len + 1 : N)), ok = true, cells = [];
          for (var k = 0; k < len; k++) { var r2 = r0 + (hz ? 0 : k), c2 = c0 + (hz ? k : 0); cells.push([r2, c2]); }
          // ships may not touch, not even at a corner
          cells.forEach(function (q) { for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) { var a = q[0] + dr, z = q[1] + dc; if (a >= 0 && a < N && z >= 0 && z < N && g[a][z] >= 0) ok = false; } });
          if (!ok) continue;
          cells.forEach(function (q) { g[q[0]][q[1]] = si; }); ships.push({ cells: cells, hz: hz }); return;
        }
      });
      return { g: g, ships: ships };
    }
    fleet[0] = place(); fleet[1] = place();
    function shot(p, r, c) { return shots[p].filter(function (s) { return s[0] === r && s[1] === c; })[0]; }
    function sunk(p, si) { return fleet[p].ships[si].cells.every(function (q) { return shot(1 - p, q[0], q[1]); }); }
    function allSunk(p) { return fleet[p].ships.every(function (s, i) { return sunk(p, i); }); }
    function apply(m) {
      rec(m);
      if (m[0] === "s") { fleet[m[1]] = place(); sfx.tap(); return; }
      if (m[0] === "r") { ready[m[1]] = true; sfx.tap(); if (ready[0] && ready[1]) { battle = true; } return; }
      var p = turn, r = m[1], c = m[2], si = fleet[1 - p].g[r][c];
      shots[p].push([r, c, si >= 0]); lastShot[p] = [r, c];
      if (si >= 0) {
        sfx.goal();
        var s = sunk(1 - p, si); say(p, s ? L("Sunk! Shoot again") : L("Hit! Shoot again"), 1.4); say(1 - p, s ? L("Your ship sank") : L("You were hit"), 1.4);
        if (allSunk(1 - p)) finish(p);
      } else { sfx.drop(); say(p, L("Miss"), 1.0); turn = 1 - p; }
    }
    function say(p, s, d) { if (!replaying) { msg[p] = s; msgT[p] = d; } }
    function legalNow() {
      if (result) return [];
      if (!battle) { for (var p = 0; p < 2; p++) if (!ready[p]) return [["r", p]]; return []; }
      var o = []; for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (!shot(turn, r, c)) o.push(["f", r, c]); return o;
    }
    function grid(x, y) { ctx.fillStyle = cfg.theme === "contrast" ? "#000" : "#1d4f78"; rr(x - 8, y - 8, N * CS + 16, N * CS + 16, 14); ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1.5; for (var k = 0; k <= N; k++) { ctx.beginPath(); ctx.moveTo(x + k * CS, y); ctx.lineTo(x + k * CS, y + N * CS); ctx.moveTo(x, y + k * CS); ctx.lineTo(x + N * CS, y + k * CS); ctx.stroke(); } }
    function ships(p, x, y, revealSunkOnly) {
      fleet[p].ships.forEach(function (s, si) {
        if (revealSunkOnly && !sunk(p, si)) return;
        var a = s.cells[0], z = s.cells[s.cells.length - 1];
        rr(x + a[1] * CS + 5, y + a[0] * CS + 5, (z[1] - a[1] + 1) * CS - 10, (z[0] - a[0] + 1) * CS - 10, 18); ctx.fillStyle = revealSunkOnly ? "rgba(120,120,120,0.8)" : "#b8c2c8"; ctx.fill();
      });
    }
    function marks(list, x, y, lastQ) {
      list.forEach(function (s) {
        var cx = x + s[1] * CS + CS / 2, cy = y + s[0] * CS + CS / 2;
        if (s[2]) { ctx.strokeStyle = "#ff4d3a"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(cx - 14, cy - 14); ctx.lineTo(cx + 14, cy + 14); ctx.moveTo(cx + 14, cy - 14); ctx.lineTo(cx - 14, cy + 14); ctx.stroke(); }
        else circle(cx, cy, 7, "rgba(255,255,255,0.75)");
        if (lastQ && lastQ[0] === s[0] && lastQ[1] === s[1]) ring(cx, cy, 22, "#ffd84a", 3);
      });
    }
    function btn(x, y, w, s, on) { rr(x, y, w, 70, 20); ctx.fillStyle = on ? "#ffd84a" : "rgba(255,255,255,0.15)"; ctx.fill(); text(s, x + w / 2, y + 35, 26, on ? "#222" : "#fff"); }
    return {
      down: function (pt) {
        if (result) return;
        var p = pt.x < MID ? 0 : 1, q = halfXY(p, pt);
        if (!battle) {
          if (ready[p]) return;
          if (q.y > 600 && q.y < 690) { if (q.x > 140 && q.x < 420) apply(["s", p]); else if (q.x > 460 && q.x < 740) apply(["r", p]); }
          return;
        }
        if (p !== turn) return;
        var c = Math.floor((q.x - TX) / CS), r = Math.floor((q.y - GY) / CS);
        if (r >= 0 && r < N && c >= 0 && c < N) { if (!shot(p, r, c)) apply(["f", r, c]); else sfx.bad(); }
      },
      move: function () {}, up: function () {},
      update: function (dt) { msgT[0] = Math.max(0, msgT[0] - dt); msgT[1] = Math.max(0, msgT[1] - dt); },
      draw: function () {
        table(); homeButton();
        if (battle && !result) turnGlow(turn);
        for (var p = 0; p < 2; p++) {
          halfOn(p);
          if (!battle) {
            text(PNAME[p] + ": " + L("your fleet"), 500, 60, 34, PC[p]);
            wrap(L("Fold the Duo a little, like a tent: the fold hides your fleet from the other player."), 60, 95, 880, 22, 28, "rgba(255,255,255,0.8)");
            grid(292, GY); ships(p, 292, GY, false);
            if (ready[p]) text(L("Ready. Waiting for the other player..."), 500, 640, 28, "#ffd84a");
            else { btn(140, 610, 280, L("Shuffle"), false); btn(460, 610, 280, L("Ready"), true); }
          } else {
            text(L("Enemy sea"), TX + N * CS / 2, GY - 40, 26, "#fff"); text(L("Your fleet"), OX + N * CS / 2, GY - 40, 26, "#fff");
            grid(TX, GY); grid(OX, GY);
            ships(1 - p, TX, GY, true); marks(shots[p], TX, GY, lastShot[p]);
            ships(p, OX, GY, false); marks(shots[1 - p], OX, GY, lastShot[1 - p]);
            var left = fleet[1 - p].ships.filter(function (s, i) { return !sunk(1 - p, i); }).length;
            text(L("Ships left") + ": " + left, TX + N * CS / 2, 620, 26, "rgba(255,255,255,0.85)");
            if (!result) text(turn === p ? L("Your shot: tap the enemy sea") : L("The other player is shooting"), OX + N * CS / 2, 620, 24, turn === p ? PC[p] : "rgba(255,255,255,0.6)");
          }
          if (msgT[p] > 0 && !result) text(msg[p], 500, 40, 44, "#ffd84a");
          ctx.restore();
        }
      },
      legal: legalNow, playMove: apply, turn: function () { return turn; }, busy: function () { return false; }
    };
  }

  // ---------- HALMA: 15 pieces each, cross the board into the opposite corner ----------
  function Halma() {
    var N = 10, S = 92, x0 = MID - N * S / 2, y0 = 500 - N * S / 2;
    var b = [], turn = starter, sel = null, last = null, plies = 0, gl = glide();
    function camp(p, r, c) { return p === 0 ? r + c <= 4 : (N - 1 - r) + (N - 1 - c) <= 4; }
    for (var r = 0; r < N; r++) { b.push([]); for (var c = 0; c < N; c++) b[r].push(camp(0, r, c) ? 0 : camp(1, r, c) ? 1 : -1); }
    function inb(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
    var D = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    function dests(r, c) {
      var o = [], seen = {}, q = [[r, c]];
      D.forEach(function (d) { var a = r + d[0], z = c + d[1]; if (inb(a, z) && b[a][z] < 0) o.push([a, z]); });
      seen[r + "," + c] = 1;
      while (q.length) {
        var cur = q.shift();
        D.forEach(function (d) {
          var mr = cur[0] + d[0], mc = cur[1] + d[1], lr = cur[0] + 2 * d[0], lc = cur[1] + 2 * d[1];
          if (inb(lr, lc) && b[mr][mc] >= 0 && b[lr][lc] < 0 && !(mr === r && mc === c) && !seen[lr + "," + lc]) { seen[lr + "," + lc] = 1; o.push([lr, lc]); q.push([lr, lc]); }
        });
      }
      return o;
    }
    function allMoves(p) { var o = []; for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (b[r][c] === p) dests(r, c).forEach(function (d) { o.push([r, c, d[0], d[1]]); }); return o; }
    function home(p) { var full = true, mine = 0; for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (camp(1 - p, r, c)) { if (b[r][c] < 0) full = false; else if (b[r][c] === p) mine++; } return full && mine > 0; }
    function inTarget(p) { var n = 0; for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (b[r][c] === p && camp(1 - p, r, c)) n++; return n; }
    function cx(c) { return x0 + c * S + S / 2; }
    function cy(r) { return y0 + r * S + S / 2; }
    function apply(m) {
      rec(m);
      b[m[2]][m[3]] = b[m[0]][m[1]]; b[m[0]][m[1]] = -1; last = m; sel = null; plies++; sfx.drop();
      gl.set(m[2] + "," + m[3], cx(m[1]), cy(m[0]));
      if (home(turn)) { finish(turn); return; }
      turn = 1 - turn;
      if (!allMoves(turn).length) turn = 1 - turn;
      if (plies >= 400) finish(-1, L("200 moves each"));
    }
    return {
      down: function (pt) {
        if (result || gl.busy()) return;
        var c = Math.floor((pt.x - x0) / S), r = Math.floor((pt.y - y0) / S);
        if (!inb(r, c)) return;
        if (sel && dests(sel[0], sel[1]).some(function (d) { return d[0] === r && d[1] === c; })) { apply([sel[0], sel[1], r, c]); return; }
        if (b[r][c] === turn) { sel = [r, c]; sfx.tap(); } else sel = null;
      },
      move: function () {}, up: function () {}, update: function (dt) { gl.step(dt); },
      draw: function () {
        table(); homeButton();
        if (!result) turnGlow(turn);
        rr(x0 - 18, y0 - 18, N * S + 36, N * S + 36, 18); ctx.fillStyle = "#5a3920"; ctx.fill();
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
          ctx.fillStyle = cfg.theme === "contrast" ? ((r + c) % 2 ? "#444" : "#ddd") : (r + c) % 2 ? "#d9bf8c" : "#ecd9b0"; ctx.fillRect(x0 + c * S, y0 + r * S, S, S);
          if (camp(0, r, c)) { ctx.fillStyle = alpha(PC[0], 0.18); ctx.fillRect(x0 + c * S, y0 + r * S, S, S); }
          if (camp(1, r, c)) { ctx.fillStyle = alpha(PC[1], 0.18); ctx.fillRect(x0 + c * S, y0 + r * S, S, S); }
        }
        if (last) { ctx.fillStyle = "rgba(255,230,80,0.3)"; ctx.fillRect(x0 + last[1] * S, y0 + last[0] * S, S, S); ctx.fillRect(x0 + last[3] * S, y0 + last[2] * S, S, S); }
        for (r = 0; r < N; r++) for (c = 0; c < N; c++) if (b[r][c] >= 0) { var ps = gl.pos(r + "," + c, cx(c), cy(r)); stone(b[r][c], ps[0], ps[1], S * 0.38); }
        if (sel) { ring(cx(sel[1]), cy(sel[0]), S * 0.44, "#fff", 5); dests(sel[0], sel[1]).forEach(function (d) { circle(cx(d[1]), cy(d[0]), 13, "rgba(0,0,0,0.4)"); }); }
        scoreSide(0, PNAME[0] + "  " + inTarget(0) + "/15"); scoreSide(1, PNAME[1] + "  " + inTarget(1) + "/15");
      },
      legal: function () { return result ? [] : allMoves(turn); }, playMove: apply, turn: function () { return turn; }, busy: gl.busy,
      // test helper: the move that gets closest to the target corner
      auto: function () {
        var ms = allMoves(turn), best = -99, pick = [];
        ms.forEach(function (m) { var g = turn === 0 ? (m[2] + m[3]) - (m[0] + m[1]) : (m[0] + m[1]) - (m[2] + m[3]); if (g > best) { best = g; pick = [m]; } else if (g === best) pick.push(m); });
        if (best <= 0) pick = ms;
        return pick[Math.floor(Math.random() * pick.length)];
      }
    };
  }

  // ---------- MANCALA (Kalah: 6 pits, 4 seeds) ----------
  function Mancala() {
    var pits = new Array(14).fill(4), turn = starter, flashT = new Array(14).fill(-9), lastPit = -1;
    pits[6] = 0; pits[13] = 0;
    function pos(i) {
      if (i < 6) return [MID - 125, 200 + i * 120];
      if (i === 6) return [MID, 905];
      if (i < 13) return [MID + 125, 800 - (i - 7) * 120];
      return [MID, 95];
    }
    function own(p, i) { return p === 0 ? i >= 0 && i < 6 : i >= 7 && i < 13; }
    function store(p) { return p === 0 ? 6 : 13; }
    function side(p) { var n = 0; for (var i = 0; i < 6; i++) n += pits[p === 0 ? i : 7 + i]; return n; }
    function legalNow() { if (result) return []; var o = []; for (var i = 0; i < 14; i++) if (own(turn, i) && pits[i] > 0) o.push(i); return o; }
    function apply(i) {
      rec(i);
      var n = pits[i], j = i, k = 0; pits[i] = 0;
      while (n > 0) { j = (j + 1) % 14; if (j === store(1 - turn)) continue; pits[j]++; n--; flashT[j] = t + (k++) * 0.07; }
      lastPit = j; sfx.drop();
      if (own(turn, j) && pits[j] === 1 && pits[12 - j] > 0) { pits[store(turn)] += pits[12 - j] + 1; pits[12 - j] = 0; pits[j] = 0; burst(pos(store(turn))[0], pos(store(turn))[1], PC[turn], 20, 300); if (!replaying) toast(L("Capture!"), PC[turn]); }
      if (side(0) === 0 || side(1) === 0) {
        for (var a = 0; a < 6; a++) { pits[6] += pits[a]; pits[a] = 0; pits[13] += pits[7 + a]; pits[7 + a] = 0; }
        finish(pits[6] === pits[13] ? -1 : pits[6] > pits[13] ? 0 : 1, pits[6] + " : " + pits[13]); return;
      }
      if (j === store(turn)) { if (!replaying) toast(L("Last seed in your store: again!"), PC[turn]); return; }
      turn = 1 - turn;
    }
    var SEED = ["#f2e6c8", "#d9c39a", "#c7d8e8", "#e8c7d2", "#cfe8c7"];
    function seeds(x, y, n, rad) {
      for (var s = 0; s < Math.min(n, 30); s++) { var a = s * 2.4, d = rad * 0.75 * Math.sqrt((s + 0.5) / Math.max(n, 6)); circle(x + Math.cos(a) * d, y + Math.sin(a) * d, 9, SEED[s % 5]); }
    }
    return {
      down: function (pt) {
        if (result) return;
        for (var i = 0; i < 14; i++) { var q = pos(i); if (i !== 6 && i !== 13 && Math.hypot(pt.x - q[0], pt.y - q[1]) < 58) { if (own(turn, i) && pits[i] > 0) apply(i); else sfx.bad(); return; } }
      },
      move: function () {}, up: function () {}, update: function () {},
      draw: function () {
        table(); homeButton();
        if (!result) turnGlow(turn);
        rr(MID - 230, 20, 460, 960, 120); ctx.fillStyle = cfg.theme === "contrast" ? "#fff" : "#7a4e2a"; ctx.fill();
        for (var i = 0; i < 14; i++) {
          var q = pos(i), st = i === 6 || i === 13, fl = clamp(1 - (t - flashT[i]) / 0.4, 0, 1);
          ctx.fillStyle = "#4a2c16"; ctx.beginPath();
          if (st) ctx.ellipse(q[0], q[1], 180, 62, 0, 0, 7); else ctx.arc(q[0], q[1], 54, 0, 7);
          ctx.fill();
          if (fl > 0 && t >= flashT[i]) { ctx.fillStyle = "rgba(255,230,120," + fl * 0.35 + ")"; ctx.fill(); }
          var owner = i < 7 ? 0 : 1;
          if (!st && own(turn, i) && pits[i] > 0 && !result) ring(q[0], q[1], 57, alpha(PC[turn], 0.7), 4);
          if (st) { for (var s = 0; s < Math.min(pits[i], 48); s++) circle(q[0] - 150 + (s % 16) * 20, q[1] - 30 + Math.floor(s / 16) * 22, 9, SEED[s % 5]); }
          else seeds(q[0], q[1], pits[i], 54);
          ptext(owner, String(pits[i]), q[0] + (owner === 0 ? -1 : 1) * (st ? 0 : 80) + (st ? (owner === 0 ? -205 : 205) : 0), q[1], 26, st ? PC[owner] : "rgba(255,255,255,0.85)");
        }
        scoreSide(0, PNAME[0] + "  " + pits[6]); scoreSide(1, PNAME[1] + "  " + pits[13]);
      },
      legal: legalNow, playMove: apply, turn: function () { return turn; }
    };
  }

  // ---------- PAIRS: find matching cards ----------
  function Pairs() {
    var C = 6, R = 6, CS = 128, G = 10, x0 = MID - (C * (CS + G) - G) / 2, y0 = 500 - (R * (CS + G) - G) / 2;
    var deck = [], up = [], gone = new Array(C * R).fill(-1), turn = starter, wait = 0, score = [0, 0], flipT = new Array(C * R).fill(-9);
    for (var i = 0; i < 18; i++) deck.push(i, i);
    for (i = deck.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp; }
    var COLS = ["#ffd84a", "#7fe0c0", "#ff9ad5"];
    function face(k, x, y) {
      var col = COLS[k % 3], sh = Math.floor(k / 3), s = 38;
      ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 10; ctx.beginPath();
      if (sh === 0) ctx.arc(x, y, s, 0, 7);
      else if (sh === 1) ctx.rect(x - s, y - s, s * 2, s * 2);
      else if (sh === 2) { ctx.moveTo(x, y - s); ctx.lineTo(x + s, y + s * 0.8); ctx.lineTo(x - s, y + s * 0.8); ctx.closePath(); }
      else if (sh === 3) { for (var a = 0; a < 10; a++) { var rad = a % 2 ? s * 0.45 : s, an = -Math.PI / 2 + a * Math.PI / 5; ctx.lineTo(x + Math.cos(an) * rad, y + Math.sin(an) * rad); } ctx.closePath(); }
      else if (sh === 4) { ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); }
      else { ctx.arc(x, y, s, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, 7); ctx.fillStyle = "#2b3a33"; }
      ctx.fill();
      if (sh === 5) { ctx.fillStyle = col; }
    }
    function cardXY(i) { return [x0 + (i % C) * (CS + G), y0 + Math.floor(i / C) * (CS + G)]; }
    function resolve() {
      var a = up[0], z = up[1]; up = [];
      flipT[a] = t; flipT[z] = t; turn = 1 - turn;
    }
    function apply(i) {
      if (wait > 0) resolve();
      rec(i);
      up.push(i); flipT[i] = t; sfx.tap();
      if (up.length < 2) return;
      var a = up[0], z = up[1];
      if (deck[a] === deck[z]) {
        gone[a] = gone[z] = turn; score[turn]++; up = []; sfx.drop(); burst(cardXY(z)[0] + CS / 2, cardXY(z)[1] + CS / 2, PC[turn], 16, 300);
        if (score[0] + score[1] === 18) finish(score[0] === score[1] ? -1 : score[0] > score[1] ? 0 : 1, score[0] + " : " + score[1]);
      } else if (replaying) resolve();
      else wait = window.tt.fast ? 0.01 : 1.1;
    }
    function legalNow() { if (result || wait > 0) return []; var o = []; for (var i = 0; i < C * R; i++) if (gone[i] < 0 && up.indexOf(i) < 0) o.push(i); return o; }
    return {
      down: function (pt) {
        if (result) return;
        if (wait > 0) { resolve(); wait = 0; }
        for (var i = 0; i < C * R; i++) { var q = cardXY(i); if (pt.x > q[0] && pt.x < q[0] + CS && pt.y > q[1] && pt.y < q[1] + CS) { if (gone[i] < 0 && up.indexOf(i) < 0) apply(i); return; } }
      },
      move: function () {}, up: function () {},
      update: function (dt) { if (wait > 0) { wait -= dt; if (wait <= 0) { wait = 0; resolve(); } } },
      draw: function () {
        table(); homeButton();
        if (!result) turnGlow(turn);
        for (var i = 0; i < C * R; i++) {
          var q = cardXY(i), shown = gone[i] >= 0 || up.indexOf(i) >= 0, k = cfg.calm ? 1 : clamp((t - flipT[i]) / 0.25, 0, 1), sx = Math.abs(Math.cos(Math.PI * (1 - k))) || 0.05;
          var vis = k < 0.5 ? !shown : shown;
          ctx.save(); ctx.translate(q[0] + CS / 2, q[1] + CS / 2); ctx.scale(sx, 1);
          rr(-CS / 2, -CS / 2, CS, CS, 16);
          if (vis) { ctx.fillStyle = gone[i] >= 0 ? alpha(PC[gone[i]], 0.35) : "#2b3a33"; ctx.fill(); face(deck[i], 0, 0); }
          else { ctx.fillStyle = cfg.theme === "contrast" ? "#fff" : "#f4efe3"; ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 3; rr(-CS / 2 + 12, -CS / 2 + 12, CS - 24, CS - 24, 10); ctx.stroke(); circle(0, 0, 10, "rgba(0,0,0,0.12)"); }
          ctx.restore();
        }
        scoreSide(0, PNAME[0] + "  " + score[0]); scoreSide(1, PNAME[1] + "  " + score[1]);
      },
      legal: legalNow, playMove: apply, turn: function () { return turn; }, busy: function () { return wait > 0; }
    };
  }

  // ---------- MENU ----------
  var GAMES = [
    { id: "hockey", name: "Air Hockey", make: AirHockey },
    { id: "four", name: "Four in a Row", make: FourRow, undo: 1, coin: 1 },
    { id: "checkers", name: "Checkers", make: Checkers, undo: 1, coin: 1 },
    { id: "dots", name: "Dots & Boxes", make: Dots, undo: 1, coin: 1 },
    { id: "chess", name: "Chess", make: Chess, undo: 1, coin: 1 },
    { id: "backgammon", name: "Backgammon", make: Backgammon, undo: 1, coin: 1 },
    { id: "mill", name: "Mill", make: Mill, undo: 1, coin: 1 },
    { id: "reversi", name: "Reversi", make: Reversi, undo: 1, coin: 1 },
    { id: "uttt", name: "Super Tic-Tac-Toe", make: Uttt, undo: 1, coin: 1 },
    { id: "paddles", name: "Paddle Ball", make: Paddles },
    { id: "sea", name: "Sea Battle", make: Sea, coin: 1 },
    { id: "halma", name: "Halma", make: Halma, undo: 1, coin: 1 },
    { id: "mancala", name: "Mancala", make: Mancala, undo: 1, coin: 1 },
    { id: "pairs", name: "Pairs", make: Pairs, undo: 0, coin: 1 }
  ];
  function byId(id) { return GAMES.filter(function (q) { return q.id === id; })[0]; }
  var TW = 205, TH = 222;
  function slotRect(half, s, h) {
    var x = 262 + (s % 2) * (TW + 14), y = 20 + Math.floor(s / 2) * (TH + 14), hh = h || TH;
    return half === 0 ? { x: x, y: y, w: TW, h: hh } : { x: W - x - TW, y: H - y - hh, w: TW, h: hh };
  }
  function tiles() { return GAMES.map(function (g, i) { var r = slotRect(i < 7 ? 0 : 1, i % 7); r.g = g; r.qx = r.x + r.w / 2; r.qy = i < 7 ? r.y + 24 : r.y + r.h - 24; return r; }); }
  // slot 7 of each half: settings and statistics for the player on that side
  function extras() {
    var o = [];
    for (var p = 0; p < 2; p++) {
      var a = slotRect(p, 7), b2 = slotRect(p, 7);
      a.w = b2.w = 96; if (p === 0) b2.x += 109; else a.x += 109;
      a.kind = "settings"; b2.kind = "stats"; a.p = b2.p = p; o.push(a, b2);
    }
    return o;
  }
  function icon(id, x, y) {
    if (id === "hockey") { rr(x - 80, y - 50, 160, 100, 24); ctx.fillStyle = "#d6eaf6"; ctx.fill(); circle(x - 45, y, 22, PC[0]); circle(x + 45, y, 22, PC[1]); circle(x + 5, y - 10, 12, "#1d1f24"); }
    else if (id === "four") { rr(x - 75, y - 60, 150, 120, 14); ctx.fillStyle = "#f2c230"; ctx.fill(); for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) circle(x - 54 + c * 36, y - 34 + r * 34, 13, (r === 2 && c < 3) ? PC[c % 2] : r === 1 && c === 1 ? PC[0] : "#173a2a"); }
    else if (id === "checkers") { for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) { ctx.fillStyle = (i + j) % 2 ? "#7a5233" : "#e8d3ad"; ctx.fillRect(x - 64 + i * 32, y - 64 + j * 32, 32, 32); } circle(x - 32, y - 16, 12, PC[0]); circle(x + 32, y + 16, 12, PC[1]); circle(x, y + 48, 12, PC[1]); }
    else if (id === "dots") { ctx.fillStyle = "#f4efe3"; ctx.fillRect(x - 70, y - 60, 140, 120); ctx.fillStyle = PC[0]; ctx.globalAlpha = 0.4; ctx.fillRect(x - 50, y - 40, 50, 40); ctx.globalAlpha = 1; for (var a = 0; a < 3; a++) for (var bb = 0; bb < 3; bb++) circle(x - 50 + a * 50, y - 40 + bb * 40, 6, "#2b2b2b"); ctx.strokeStyle = PC[1]; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 50, y); ctx.stroke(); }
    else if (id === "chess") { ctx.fillStyle = "#f0d9b5"; ctx.beginPath(); ctx.moveTo(x - 30, y + 50); ctx.lineTo(x + 30, y + 50); ctx.lineTo(x + 18, y - 10); ctx.arc(x, y - 30, 22, 0.5, Math.PI - 0.5, true); ctx.closePath(); ctx.fill(); }
    else if (id === "backgammon") { for (var k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? "#7a5233" : "#e8d3ad"; ctx.beginPath(); ctx.moveTo(x - 75 + k * 25, y - 60); ctx.lineTo(x - 62 + k * 25, y); ctx.lineTo(x - 50 + k * 25, y - 60); ctx.fill(); } circle(x - 20, y + 30, 16, PC[0]); circle(x + 20, y + 30, 16, PC[1]); }
    else if (id === "mill") { ctx.strokeStyle = "#e7d3a8"; ctx.lineWidth = 6; [60, 38, 16].forEach(function (s) { ctx.strokeRect(x - s, y - s, s * 2, s * 2); }); ctx.beginPath(); ctx.moveTo(x, y - 60); ctx.lineTo(x, y - 16); ctx.moveTo(x, y + 16); ctx.lineTo(x, y + 60); ctx.stroke(); circle(x - 60, y - 60, 13, PC[0]); circle(x, y - 60, 13, PC[0]); circle(x + 38, y + 38, 13, PC[1]); }
    else if (id === "reversi") { ctx.fillStyle = "#2e7d4f"; ctx.fillRect(x - 60, y - 60, 120, 120); circle(x - 28, y - 28, 24, PC[0]); circle(x + 28, y + 28, 24, PC[0]); circle(x + 28, y - 28, 24, PC[1]); circle(x - 28, y + 28, 24, PC[1]); }
    else if (id === "uttt") { ctx.strokeStyle = "#f4efe3"; ctx.lineWidth = 6; ctx.beginPath(); [-20, 20].forEach(function (d) { ctx.moveTo(x + d, y - 60); ctx.lineTo(x + d, y + 60); ctx.moveTo(x - 60, y + d); ctx.lineTo(x + 60, y + d); }); ctx.stroke(); ring(x - 40, y - 40, 12, PC[0], 6); ring(x, y, 12, PC[0], 6); ctx.strokeStyle = PC[1]; ctx.beginPath(); ctx.moveTo(x + 28, y - 52); ctx.lineTo(x + 52, y - 28); ctx.moveTo(x + 52, y - 52); ctx.lineTo(x + 28, y - 28); ctx.stroke(); }
    else if (id === "paddles") { rr(x - 70, y - 50, 14, 60, 7); ctx.fillStyle = PC[0]; ctx.fill(); rr(x + 56, y - 10, 14, 60, 7); ctx.fillStyle = PC[1]; ctx.fill(); circle(x + 5, y - 5, 12, "#fff"); }
    else if (id === "sea") { ctx.fillStyle = "#1d4f78"; rr(x - 70, y - 55, 140, 110, 14); ctx.fill(); rr(x - 45, y - 12, 90, 26, 12); ctx.fillStyle = "#b8c2c8"; ctx.fill(); ctx.strokeStyle = "#ff4d3a"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x + 10, y - 40); ctx.lineTo(x + 30, y - 20); ctx.moveTo(x + 30, y - 40); ctx.lineTo(x + 10, y - 20); ctx.stroke(); circle(x - 40, y + 35, 5, "#fff"); }
    else if (id === "halma") { for (var r2 = 0; r2 < 4; r2++) for (var c2 = 0; c2 < 4 - r2; c2++) circle(x - 55 + c2 * 26, y - 55 + r2 * 26, 10, PC[0]); for (r2 = 0; r2 < 3; r2++) for (c2 = 0; c2 < 3 - r2; c2++) circle(x + 55 - c2 * 26, y + 55 - r2 * 26, 10, PC[1]); }
    else if (id === "mancala") { rr(x - 40, y - 70, 80, 140, 36); ctx.fillStyle = "#7a4e2a"; ctx.fill(); for (var m2 = 0; m2 < 3; m2++) { circle(x - 16, y - 40 + m2 * 40, 13, "#4a2c16"); circle(x + 16, y - 40 + m2 * 40, 13, "#4a2c16"); circle(x - 16, y - 40 + m2 * 40, 4, "#f2e6c8"); } }
    else if (id === "pairs") { ctx.save(); ctx.translate(x - 22, y); ctx.rotate(-0.15); rr(-35, -45, 70, 90, 10); ctx.fillStyle = "#f4efe3"; ctx.fill(); ctx.restore(); ctx.save(); ctx.translate(x + 22, y); ctx.rotate(0.15); rr(-35, -45, 70, 90, 10); ctx.fillStyle = "#2b3a33"; ctx.fill(); circle(0, 0, 20, "#ffd84a"); ctx.restore(); }
  }
  function emblem(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    circle(0, 0, 50, "rgba(255,255,255,0.12)");
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.setLineDash([6, 6]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(0, 46); ctx.stroke(); ctx.setLineDash([]);
    stone(0, -22, 0, 18); stone(1, 22, 0, 18);
    ctx.restore();
  }
  var press = null, lastGame = loadKey("twotable-last", { id: "" }).id;
  function drawMenu() {
    table(); seam();
    var tot = [0, 0]; Object.keys(stats.g).forEach(function (k) { tot[0] += stats.g[k].w[0]; tot[1] += stats.g[k].w[1]; });
    for (var p = 0; p < 2; p++) {
      ptext(p, "Two at the Table", p === 0 ? 120 : W - 120, H / 2, 60, "#fff");
      ptext(p, L("Sit face to face. Pick a game."), p === 0 ? 192 : W - 192, H / 2, 24, "rgba(255,255,255,0.75)", "normal");
      if (tot[0] + tot[1]) ptext(p, PNAME[p] + "  " + tot[p] + " : " + tot[1 - p] + "  " + PNAME[1 - p], p === 0 ? 42 : W - 42, H / 2, 22, "rgba(255,255,255,0.8)", "normal");
      emblem(p === 0 ? 140 : W - 140, p === 0 ? 130 : H - 130, 1.1);
    }
    tiles().forEach(function (tl) {
      var k = press && press.id === tl.g.id ? 1 - 0.06 * Math.sin(Math.min(1, (t - press.t) / 0.14) * Math.PI) : 1;
      ctx.save(); ctx.translate(tl.x + tl.w / 2, tl.y + tl.h / 2); ctx.scale(k, k); ctx.translate(-tl.x - tl.w / 2, -tl.y - tl.h / 2);
      ctx.fillStyle = "rgba(0,0,0,0.25)"; rr(tl.x + 5, tl.y + 7, tl.w, tl.h, 24); ctx.fill();
      rr(tl.x, tl.y, tl.w, tl.h, 24); ctx.fillStyle = cfg.theme === "contrast" ? "#fff" : "#fbf7ee"; ctx.fill();
      if (tl.g.id === lastGame) { ctx.strokeStyle = "#ffd84a"; ctx.lineWidth = 5; ctx.stroke(); }
      ctx.save(); ctx.translate(tl.x + tl.w / 2, tl.y + tl.h / 2); ctx.scale(0.62, 0.62); ctx.fillStyle = "#24352c"; rr(-95, -85, 190, 170, 20); ctx.fill(); icon(tl.g.id, 0, 0); ctx.restore();
      var nm = L(tl.g.name), w = stats.g[tl.g.id] ? stats.g[tl.g.id].w : null;
      ptext(0, nm, tl.x + 20, tl.y + tl.h / 2, 19, "#24352c"); ptext(1, nm, tl.x + tl.w - 20, tl.y + tl.h / 2, 19, "#24352c");
      if (w && w[0] + w[1]) {
        ptext(0, "★ " + w[0] + " : " + w[1], tl.x + 44, tl.y + tl.h / 2, 16, "#8a6a10", "normal");
        ptext(1, "★ " + w[1] + " : " + w[0], tl.x + tl.w - 44, tl.y + tl.h / 2, 16, "#8a6a10", "normal");
      }
      circle(tl.qx, tl.qy, 16, "rgba(36,53,44,0.12)"); text("?", tl.qx, tl.qy + 1, 20, "#24352c");
      if (tl.g.id === lastGame) { var by = tl.qy === tl.y + 24 ? tl.y + tl.h - 22 : tl.y + 22; circle(tl.qx, by, 15, "#ffd84a"); ctx.strokeStyle = "#24352c"; ctx.fillStyle = "#24352c"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tl.qx, by, 7, 0.6, 5.4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(tl.qx + 9, by - 12); ctx.lineTo(tl.qx + 10, by - 3); ctx.lineTo(tl.qx + 1, by - 5); ctx.fill(); }
      ctx.restore();
    });
    extras().forEach(function (e) {
      rr(e.x, e.y, e.w, e.h, 20); ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fill();
      var lab = e.kind === "settings" ? L("Settings") : L("Statistics");
      ptext(e.p, lab, e.x + e.w / 2 + (e.p === 0 ? -18 : 18), e.y + e.h / 2, 19, "#fff");
      ctx.save(); ctx.translate(e.x + e.w / 2 + (e.p === 0 ? 24 : -24), e.y + e.h / 2); ctx.rotate(e.p === 0 ? Math.PI / 2 : -Math.PI / 2); ctx.strokeStyle = "#fff"; ctx.fillStyle = "#fff"; ctx.lineWidth = 4;
      if (e.kind === "settings") { ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.stroke(); for (var a = 0; a < 8; a++) { ctx.save(); ctx.rotate(a * Math.PI / 4); ctx.fillRect(-3, -19, 6, 8); ctx.restore(); } }
      else { ctx.fillRect(-14, 2, 7, 12); ctx.fillRect(-3, -8, 7, 22); ctx.fillRect(8, -14, 7, 28); }
      ctx.restore();
    });
  }

  // ---------- pages: settings, statistics, rules, first-start guide ----------
  var RULES = {
    hockey: ["Hit the puck with your mallet into the other goal. Keep your mallet on your side of the fold. Both of you play at the same time with your fingers.", "Triff den Puck mit deinem Schläger ins gegnerische Tor. Dein Schläger bleibt auf deiner Seite der Falz. Ihr spielt beide gleichzeitig mit den Fingern."],
    four: ["Take turns dropping a stone into a column: touch the column, lift your finger to drop. Four of your stones in a row (across, down or diagonal) wins.", "Abwechselnd einen Stein in eine Spalte werfen: Spalte berühren, Finger heben zum Fallenlassen. Vier eigene Steine in einer Reihe (waagerecht, senkrecht oder schräg) gewinnen."],
    checkers: ["Move diagonally forward one square. Jump over an opponent piece to capture it; capturing is required and jumps continue while possible. A piece that reaches the far side becomes a king and moves both ways. No pieces or no moves left: you lose.", "Schräg ein Feld vorwärts ziehen. Gegnerische Steine überspringen und schlagen; Schlagen ist Pflicht, Sprünge gehen weiter, solange möglich. Wer die andere Seite erreicht, wird Dame und zieht in beide Richtungen. Keine Steine oder Züge mehr: verloren."],
    dots: ["Take turns drawing one line between two dots: touch a line, lift to draw it. Close a box and it is yours, and you draw again. Most boxes wins.", "Abwechselnd eine Linie zwischen zwei Punkten ziehen: Linie berühren, Finger heben. Wer ein Kästchen schließt, bekommt es und ist nochmal dran. Die meisten Kästchen gewinnen."],
    chess: ["Classic chess. Tap a piece, then its target. Castling, en passant and promotion (you choose the piece) are included. Draw by stalemate, repetition, the 50-move rule, or by agreement with the ½ button. The flag resigns (tap twice).", "Klassisches Schach. Figur antippen, dann das Ziel. Rochade, en passant und Umwandlung (du wählst die Figur) sind dabei. Remis durch Patt, Wiederholung, 50-Züge-Regel oder Einigung mit dem ½-Knopf. Die Fahne gibt auf (zweimal tippen)."],
    backgammon: ["Roll, then move your stones by the dice: tap a stone, then a glowing target. Bring all 15 stones home and bear them off first. A single opponent stone can be hit to the bar. Gammon counts double, backgammon triple. Undo takes back your moves of this turn.", "Würfeln, dann Steine um die Augenzahl ziehen: Stein antippen, dann ein leuchtendes Ziel. Bringt alle 15 Steine nach Hause und würfelt sie zuerst heraus. Ein einzelner Stein kann auf die Bar geschlagen werden. Gammon zählt doppelt, Backgammon dreifach. Rückgängig nimmt deine Züge dieser Runde zurück."],
    mill: ["Place your 9 stones in turn, then move them along the lines. Three in a line is a mill: take one of the other player's stones. With only 3 stones left you may jump. Fewer than 3 stones or no move: you lose.", "Setzt abwechselnd eure 9 Steine, dann zieht ihr sie entlang der Linien. Drei in einer Linie sind eine Mühle: nimm einen gegnerischen Stein. Mit nur 3 Steinen darfst du springen. Weniger als 3 Steine oder kein Zug: verloren."],
    reversi: ["Place a stone so that it encloses a line of the other player's stones; they flip to your color. No legal move: you pass. When neither can move, most stones wins.", "Setze einen Stein so, dass er eine Reihe gegnerischer Steine einschließt; sie wechseln zu deiner Farbe. Kein Zug möglich: du setzt aus. Wenn keiner mehr kann, gewinnen die meisten Steine."],
    uttt: ["Nine small tic-tac-toe boards. The square you play decides in which small board the other player must play next (it glows). Win a small board with three in a row; win three small boards in a row to win the game.", "Neun kleine Tic-Tac-Toe-Felder. Das Feld, auf das du setzt, bestimmt, in welchem kleinen Brett der andere als Nächstes spielen muss (es leuchtet). Drei in einer Reihe gewinnen ein kleines Brett; drei kleine Bretter in einer Reihe gewinnen das Spiel."],
    paddles: ["Move your paddle with your finger anywhere on your half. Let the ball past and the other player scores. The ball gets faster with every hit.", "Bewege deinen Schläger mit dem Finger irgendwo auf deiner Hälfte. Lässt du den Ball vorbei, punktet der andere. Der Ball wird mit jedem Treffer schneller."],
    sea: ["Each of you gets a random fleet on your own half. Shuffle until you like it, then tap Ready. Take turns shooting into the enemy sea; a hit lets you shoot again. Sink all five ships to win. Tip: fold the Duo a little so the fold hides your half.", "Jeder bekommt eine zufällige Flotte auf seiner Hälfte. Mischen, bis sie passt, dann Bereit tippen. Abwechselnd ins gegnerische Meer schießen; ein Treffer erlaubt einen weiteren Schuss. Versenkt alle fünf Schiffe. Tipp: Klapp das Duo leicht an, dann verdeckt die Falz deine Hälfte."],
    halma: ["Move all your pieces into the opposite corner. A piece steps to a neighbouring square or jumps over any piece, again and again in one move. When the target corner is full and you hold part of it, you win.", "Bringt alle eure Steine in die gegenüberliegende Ecke. Ein Stein zieht auf ein Nachbarfeld oder springt über beliebige Steine, auch mehrmals in einem Zug. Ist die Zielecke voll und du hast dort Steine, gewinnst du."],
    mancala: ["Tap one of your pits: its seeds are sown one by one around the board, into your store but not the other one. Last seed in your store: play again. Last seed in your own empty pit: capture it and the seeds opposite. When one side is empty, the most seeds wins.", "Tippe eine deiner Mulden: die Samen werden einzeln reihum verteilt, in dein Lager, aber nicht ins andere. Letzter Samen in deinem Lager: nochmal. Letzter Samen in deiner leeren Mulde: du bekommst ihn und die gegenüber. Ist eine Seite leer, gewinnen die meisten Samen."],
    pairs: ["Take turns turning over two cards. A matching pair is yours and you go again. Most pairs wins.", "Abwechselnd zwei Karten umdrehen. Ein passendes Paar gehört dir und du bist nochmal dran. Die meisten Paare gewinnen."]
  };
  function opts(list, v) { return list.indexOf(v); }
  function settingsRows() {
    var LANG = ["auto", "en", "de"], LN = { auto: L("Automatic"), en: "English", de: "Deutsch" };
    function onoff(k) { return { v: cfg[k] ? L("On") : L("Off"), f: function () { cfg[k] = cfg[k] ? 0 : 1; } }; }
    function colorRow(p) { return { l: L("Color") + " " + (p + 1), v: L(PAL[cfg.col[p]][2]), sw: PAL[cfg.col[p]][0], f: function () { var c = cfg.col[p]; do { c = (c + 1) % PAL.length; } while (c === cfg.col[1 - p]); cfg.col[p] = c; } }; }
    var left = [
      Object.assign({ l: L("Sound") }, onoff("sound")),
      Object.assign({ l: L("Music") }, onoff("music")),
      Object.assign({ l: L("Vibration") }, onoff("haptic")),
      { l: L("Language"), v: LN[cfg.lang], f: function () { cfg.lang = LANG[(opts(LANG, cfg.lang) + 1) % 3]; setLang(); } },
      { l: L("Name") + " 1", v: PNAME[0], f: function () { askName(0); } },
      { l: L("Name") + " 2", v: PNAME[1], f: function () { askName(1); } },
      colorRow(0), colorRow(1),
      { l: L("Swap colors"), v: "⇄", f: function () { cfg.col = [cfg.col[1], cfg.col[0]]; var n = cfg.names; cfg.names = [n[1], n[0]]; } },
      { l: L("Table"), v: L(th().name), f: function () { cfg.theme = THEME_ORDER[(opts(THEME_ORDER, cfg.theme) + 1) % THEME_ORDER.length]; } },
      { l: L("Reset statistics"), v: t - resetArm < 3 ? L("Tap again") : "", f: function () { if (t - resetArm < 3) { stats = { g: {}, hist: [], ach: {}, played: 0 }; saveStats(); resetArm = -9; toast(L("Statistics reset"), "#fff"); } else resetArm = t; } }
    ];
    var right = [
      Object.assign({ l: L("Color-blind shapes") }, onoff("cb")),
      Object.assign({ l: L("Larger text") }, onoff("big")),
      Object.assign({ l: L("Reduced motion") }, onoff("calm")),
      { l: L("Goals to win"), v: String(cfg.goals), f: function () { cfg.goals = { 5: 7, 7: 10, 10: 5 }[cfg.goals] || 7; } },
      { l: L("Four in a Row board"), v: cfg.fourBig ? "8 x 7" : "7 x 6", f: function () { cfg.fourBig = cfg.fourBig ? 0 : 1; } },
      { l: L("Dots & Boxes size"), v: ["4 x 4", "6 x 5", "8 x 6"][cfg.dots], f: function () { cfg.dots = (cfg.dots + 1) % 3; } },
      Object.assign({ l: L("Checkers: capture backward") }, onoff("ckBack")),
      { l: L("Chess clock"), v: cfg.clock ? cfg.clock + " min" : L("Off"), f: function () { cfg.clock = { 0: 5, 5: 10, 10: 0 }[cfg.clock] || 0; } },
      Object.assign({ l: L("Backgammon doubling cube") }, onoff("cube")),
      { l: L("Show the guide again"), v: "▸", f: function () { view = null; cfg.intro = 0; } },
      { l: "Two at the Table", v: "1.2", f: function () {} }
    ];
    return [left, right];
  }
  var resetArm = -9, nameBox = null, nameWant = null;
  function askName(p) { nameWant = { p: p, who: view ? view.p : 0 }; }
  // the keyboard opens from the click event, which iOS counts as a user action
  cv.addEventListener("click", function () {
    if (!nameWant || nameBox) return;
    var w = nameWant; nameWant = null;
    var el = document.createElement("input");
    el.type = "text"; el.maxLength = 14; el.value = cfg.names[w.p] || ""; el.placeholder = L(PAL[cfg.col[w.p]][2]);
    el.setAttribute("aria-label", L("Name") + " " + (w.p + 1));
    el.style.cssText = "position:fixed;left:50%;top:50%;width:360px;font:28px -apple-system,sans-serif;padding:14px 18px;border-radius:16px;border:3px solid " + PC[w.p] + ";transform:translate(-50%,-50%) rotate(" + (w.who === 0 ? 90 : -90) + "deg);z-index:9;outline:none;text-align:center";
    function done() { if (!nameBox) return; cfg.names[w.p] = el.value.trim().slice(0, 14); saveCfg(); applyColors(); el.remove(); nameBox = null; }
    el.addEventListener("keydown", function (e) { if (e.key === "Enter") el.blur(); });
    el.addEventListener("blur", done);
    document.body.appendChild(el); nameBox = el; el.focus();
  });
  function drawPage() {
    if (!view) return;
    ctx.fillStyle = "rgba(8,16,12,0.86)"; ctx.fillRect(-ox / scale, -oy / scale, cw / scale, ch / scale);
    if (view.kind === "rules") {
      for (var p = 0; p < 2; p++) {
        halfOn(p);
        var g = byId(view.id);
        text(L(g.name), 500, 70, 44, "#fff");
        wrap(RULES[view.id][DE ? 1 : 0], 70, 130, 860, 27, 37, "rgba(255,255,255,0.92)");
        text(L("Tap to close"), 500, 660, 22, "rgba(255,255,255,0.6)", "normal");
        ctx.restore();
      }
      return;
    }
    pageOn(view.p);
    rr(20, 20, 960, 1380, 30); ctx.fillStyle = cfg.theme === "contrast" ? "#000" : "#1e3b2d"; ctx.fill();
    circle(920, 75, 30, "rgba(255,255,255,0.12)"); ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(908, 63); ctx.lineTo(932, 87); ctx.moveTo(932, 63); ctx.lineTo(908, 87); ctx.stroke();
    if (view.kind === "settings") {
      text(L("Settings"), 70, 75, 40, "#fff", "bold", "left");
      var rows = settingsRows();
      rows.forEach(function (col, ci) {
        col.forEach(function (r, i) {
          var x = 40 + ci * 470, y = 140 + i * 112;
          rr(x, y, 450, 96, 18); ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fill();
          ctx.save(); ctx.beginPath(); ctx.rect(x, y, 450, 96); ctx.clip();
          wrap(r.l, x + 20, y + 14, 250, 22, 27, "rgba(255,255,255,0.85)");
          if (r.sw) circle(x + 300, y + 48, 16, r.sw);
          text(r.v, x + 430, y + 48, 24, "#ffd84a", "bold", "right");
          ctx.restore();
        });
      });
    } else {
      text(L("Statistics"), 70, 75, 40, "#fff", "bold", "left");
      var y = 140;
      text(L("Game"), 50, y, 20, "rgba(255,255,255,0.6)", "normal", "left"); text(PNAME[0] + " : " + PNAME[1], 520, y, 20, "rgba(255,255,255,0.6)", "normal");
      text(L("Played"), 680, y, 20, "rgba(255,255,255,0.6)", "normal"); text(L("Fastest win"), 800, y, 20, "rgba(255,255,255,0.6)", "normal"); text(L("Longest"), 920, y, 20, "rgba(255,255,255,0.6)", "normal");
      function mmss(s) { return s ? Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2) : "-"; }
      GAMES.forEach(function (g, i) {
        var s = stats.g[g.id] || { w: [0, 0], n: 0, fast: 0, long: 0, streak: [-1, 0] }, yy = 190 + i * 50;
        if (i % 2) { ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.fillRect(40, yy - 24, 920, 50); }
        text(L(g.name), 50, yy, 22, "#fff", "normal", "left");
        text(s.w[0] + " : " + s.w[1], 520, yy, 24, "#fff");
        if (s.streak && s.streak[1] >= 2) text(s.streak[1] + "x", 600, yy, 18, PC[s.streak[0]] || "#fff");
        text(String(s.n), 680, yy, 22, "rgba(255,255,255,0.8)", "normal"); text(mmss(s.fast), 800, yy, 22, "rgba(255,255,255,0.8)", "normal"); text(mmss(s.long), 920, yy, 22, "rgba(255,255,255,0.8)", "normal");
      });
      y = 920; text(L("Last 20 matches"), 50, y, 24, "#fff", "bold", "left");
      stats.hist.forEach(function (h, i) {
        var x = 70 + (i % 10) * 92, yy = 975 + Math.floor(i / 10) * 92, g = byId(h.g);
        circle(x, yy, 38, h.w >= 0 ? (PAL[h.c && h.c[h.w] != null ? h.c[h.w] : h.w] || PAL[0])[0] : "rgba(255,255,255,0.25)");
        if (g) { ctx.save(); ctx.translate(x, yy); ctx.scale(0.3, 0.3); icon(g.id, 0, 0); ctx.restore(); }
      });
      if (!stats.hist.length) text(L("No matches yet"), 50, 975, 22, "rgba(255,255,255,0.6)", "normal", "left");
      y = 1180; text(L("Achievements"), 50, y, 24, "#fff", "bold", "left");
      ACH.forEach(function (a, i) {
        var x = 50 + (i % 2) * 460, yy = 1225 + Math.floor(i / 2) * 42, got = stats.ach[a[0]];
        text((got ? "★ " : "☆ ") + L(a[1]), x, yy, 22, got ? "#ffd84a" : "rgba(255,255,255,0.45)", got ? "bold" : "normal", "left");
      });
    }
    ctx.restore();
  }
  function pageTap(pt) {
    if (view.kind === "rules") { view = null; return; }
    var q = pageXY(view.p, pt);
    if (Math.hypot(q.x - 920, q.y - 75) < 50) { view = null; sfx.tap(); return; }
    if (view.kind !== "settings") return;
    var rows = settingsRows();
    rows.forEach(function (col, ci) { col.forEach(function (r, i) { var x = 40 + ci * 470, y = 140 + i * 112; if (q.x > x && q.x < x + 450 && q.y > y && q.y < y + 96) { r.f(); sfx.tap(); saveCfg(); applyColors(); texCache = {}; } }); });
    if (!cfg.intro) view = null;
  }
  function drawIntro() {
    if (cfg.intro) return;
    ctx.fillStyle = "rgba(8,16,12,0.9)"; ctx.fillRect(-ox / scale, -oy / scale, cw / scale, ch / scale);
    seam();
    for (var p = 0; p < 2; p++) {
      halfOn(p);
      text(L("Welcome to the table!"), 500, 90, 44, PC[p]);
      wrap(L("Sit face to face with the phone flat between you. This half is yours: the fold in the middle is the edge of your side."), 90, 150, 820, 28, 38, "#fff");
      // an arrow toward the player and two hands
      ctx.strokeStyle = PC[p]; ctx.fillStyle = PC[p]; ctx.lineWidth = 10; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(500, 400); ctx.lineTo(500, 560); ctx.stroke(); ctx.beginPath(); ctx.moveTo(460, 525); ctx.lineTo(500, 575); ctx.lineTo(540, 525); ctx.stroke();
      [330, 670].forEach(function (hx) { rr(hx - 40, 470, 80, 110, 34); ctx.fill(); for (var f = 0; f < 4; f++) { rr(hx - 38 + f * 20, 410 + Math.abs(f - 1.5) * 10, 16, 70, 8); ctx.fill(); } });
      text(PNAME[p] + ": " + L("you sit here"), 500, 620, 30, "#fff");
      text(L("Tap to start"), 500, 675, 22, "rgba(255,255,255,0.6)", "normal");
      ctx.restore();
    }
  }

  // ---------- open a game ----------
  var coin = null, fade = 0;
  function open(id, o) {
    o = o || {};
    var g = byId(id);
    if (!g) return;
    gameName = id;
    if (o.starter != null) starter = o.starter;
    match = { id: id, seed: o.seed != null ? o.seed : (Math.random() * 4294967296) >>> 0, starter: starter, log: [], el: o.el || 0, clock: o.clock || null };
    seed = match.seed; result = null; undoReq = [-9, -9]; coin = null; parts = []; toasts = [];
    game = g.make(); state = "game"; view = null;
    if (o.log) { replaying = true; try { o.log.forEach(function (m) { game.playMove(m); }); } catch (e) {} replaying = false; }
    saveMatch();
    if (o.coin && g.coin && !window.tt.fast && !cfg.calm) coin = { t: 0 };
    if (!o.log) fade = 1;
    lastGame = id; saveKey("twotable-last", { id: id });
    native("awake1");
  }
  function startFromMenu(id) {
    // the coin decides who starts the first match; rematches alternate
    starter = Math.random() < 0.5 ? 0 : 1;
    open(id, { coin: 1 });
  }
  function toMenu() { state = "menu"; game = null; result = null; match = null; coin = null; clearMatch(); fade = 1; native("awake0"); }
  function drawCoin() {
    if (!coin) return;
    var k = coin.t, spin = k < 1.2, w = spin ? Math.abs(Math.cos(k * 18)) : 1, face = spin ? (Math.cos(k * 18) > 0 ? 0 : 1) : starter;
    ctx.fillStyle = "rgba(0,0,0," + Math.min(0.5, k * 2) + ")"; ctx.fillRect(-ox / scale, -oy / scale, cw / scale, ch / scale);
    ctx.save(); ctx.translate(MID, 500 - (spin ? Math.sin(k / 1.2 * Math.PI) * 60 : 0)); ctx.scale(Math.max(0.06, w), 1);
    circle(0, 0, 90, "#e8c34a"); circle(0, 0, 78, PC[face]); circle(0, 0, 50, PD[face]); ctx.restore();
    if (!spin) for (var p = 0; p < 2; p++) ptext(p, PNAME[starter] + " " + L("starts"), p === 0 ? MID - 170 : MID + 170, 500, 40, PC[starter]);
  }

  // ---------- input ----------
  function toLogical(e) { return { x: (e.clientX - ox) / scale, y: (e.clientY - oy) / scale }; }
  function inRect(p, r) { return p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h; }
  cv.addEventListener("pointerdown", function (e) {
    tone(1, 0.01, "sine", 0.0001); actx();
    var p = toLogical(e);
    if (nameBox) { nameBox.blur(); return; }
    if (hinge && hinge.k !== "flat" && !hingeHidden) { hingeHidden = true; return; }
    if (!cfg.intro) { cfg.intro = 1; saveCfg(); sfx.tap(); return; }
    if (view) { pageTap(p); return; }
    if (state === "menu") {
      var hitAny = false;
      tiles().forEach(function (tl) {
        if (hitAny || !inRect(p, tl)) return; hitAny = true;
        if (Math.hypot(p.x - tl.qx, p.y - tl.qy) < 30) { view = { kind: "rules", id: tl.g.id }; sfx.tap(); return; }
        sfx.tap(); press = { id: tl.g.id, t: t };
        setTimeout(function () { if (state === "menu" && !view) startFromMenu(tl.g.id); press = null; }, cfg.calm ? 0 : 140);
      });
      if (!hitAny) extras().forEach(function (x) { if (inRect(p, x)) { view = { kind: x.kind, p: x.p }; sfx.tap(); } });
      return;
    }
    if (coin) return;
    for (var s = 0; s < 2; s++) {
      if (onSB(p, s, 0)) { toMenu(); return; }
      if (!result && byId(gameName).undo && onSB(p, s, 1)) { undoPress(s); return; }
    }
    if (result) { if (result.t > 0.8) { starter = 1 - starter; open(gameName); } return; }
    game.down(p, e.pointerId);
  });
  cv.addEventListener("pointermove", function (e) { if (state === "game" && game && !result && !coin && !view) game.move(toLogical(e), e.pointerId); });
  function up(e) { if (state === "game" && game && !coin) game.up(toLogical(e), e.pointerId); }
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  window.addEventListener("resize", resize);

  // safe area (notch / Dynamic Island on regular iPhones): keep the table inside it
  var probe = document.createElement("div");
  probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
  document.body.appendChild(probe);
  function resize() {
    var cs = getComputedStyle(probe), il = parseFloat(cs.paddingLeft) || 0, ir = parseFloat(cs.paddingRight) || 0, it = parseFloat(cs.paddingTop) || 0, ib = parseFloat(cs.paddingBottom) || 0;
    dpr = Math.min(window.devicePixelRatio || 1, 3); cw = window.innerWidth; ch = window.innerHeight;
    cv.width = cw * dpr; cv.height = ch * dpr;
    var aw = cw - il - ir, ah = ch - it - ib;
    scale = Math.min(aw / W, ah / H); ox = il + (aw - W * scale) / 2; oy = it + (ah - H * scale) / 2;
    placeA11y();
  }

  // VoiceOver: invisible buttons over the menu tiles
  var a11y = document.createElement("nav");
  a11y.setAttribute("aria-label", "Games");
  a11y.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;";
  document.body.appendChild(a11y);
  cv.setAttribute("role", "img"); cv.setAttribute("aria-label", "Two at the Table");
  function placeA11y() {
    a11y.innerHTML = "";
    if (state !== "menu" || view) return;
    tiles().concat(extras().filter(function (x) { return x.p === 0; })).forEach(function (tl) {
      var b = document.createElement("button"), id = tl.g ? tl.g.id : null;
      b.setAttribute("aria-label", tl.g ? L(tl.g.name) : tl.kind === "settings" ? L("Settings") : L("Statistics"));
      b.style.cssText = "position:fixed;opacity:0;pointer-events:none;border:0;left:" + (ox + tl.x * scale) + "px;top:" + (oy + tl.y * scale) + "px;width:" + tl.w * scale + "px;height:" + tl.h * scale + "px";
      b.addEventListener("click", function () { if (id) startFromMenu(id); else view = { kind: tl.kind, p: 0 }; placeA11y(); });
      a11y.appendChild(b);
    });
  }

  // iPhone Duo hinge (from the iOS shell): hint when the phone is closed or not flat; tap hides it until the state changes
  var hinge = null, hingeHidden = false;
  window.onHinge = function (deg, status) {
    var k = status === "closed" ? "closed" : status === "partial" && deg < 150 ? "bent" : "flat";
    if (!hinge || hinge.k !== k) hingeHidden = false;
    // a tent-folded phone is the sea battle position: no hint there
    if (k === "bent" && gameName === "sea" && state === "game") hingeHidden = true;
    hinge = { deg: deg, k: k };
  };
  function hingeHint() {
    if (!hinge || hinge.k === "flat" || hingeHidden) return false;
    var closed = hinge.k === "closed", msg = closed ? L("Unfold your iPhone Duo for the big table") : L("Lay the phone flat between you");
    ctx.fillStyle = "rgba(10,20,15,0.8)"; ctx.fillRect(-ox / scale, -oy / scale, cw / scale, ch / scale);
    // an opening phone, drawn
    var a = closed ? 0.5 + 0.5 * Math.sin(t * 2) : 1;
    ctx.save(); ctx.translate(MID, 500); ctx.strokeStyle = "#fff"; ctx.lineWidth = 8; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(0, -110); ctx.lineTo(-150 * a, -110 + 40 * (1 - a)); ctx.lineTo(-150 * a, 110 - 40 * (1 - a)); ctx.lineTo(0, 110); ctx.lineTo(150 * a, 110 - 40 * (1 - a)); ctx.lineTo(150 * a, -110 + 40 * (1 - a)); ctx.closePath(); ctx.stroke();
    ctx.setLineDash([8, 10]); ctx.beginPath(); ctx.moveTo(0, -110); ctx.lineTo(0, 110); ctx.stroke(); ctx.restore();
    var big = closed ? 52 : 40;
    ptext(0, msg, MID - 250, H / 2, big, "#fff"); ptext(1, msg, MID + 250, H / 2, big, "#fff");
    if (game && game.live && closed) { ptext(0, L("Paused"), MID - 320, H / 2, 30, "#ffd84a"); ptext(1, L("Paused"), MID + 320, H / 2, 30, "#ffd84a"); }
    ptext(0, L("Tap to continue"), MID - 190, H / 2, 24, "rgba(255,255,255,0.7)", "normal"); ptext(1, L("Tap to continue"), MID + 190, H / 2, 24, "rgba(255,255,255,0.7)", "normal");
    return true;
  }

  // keep the match when the app goes to the background
  document.addEventListener("visibilitychange", function () { if (document.hidden) saveMatch(); });
  window.addEventListener("pagehide", saveMatch);

  function drawToasts(dt) {
    for (var i = toasts.length - 1; i >= 0; i--) { toasts[i].life -= dt; if (toasts[i].life <= 0) toasts.splice(i, 1); }
    toasts.slice(-2).forEach(function (q, i) {
      ctx.globalAlpha = Math.min(1, q.life * 2);
      for (var p = 0; p < 2; p++) {
        var x = p === 0 ? MID - 120 - i * 60 : MID + 120 + i * 60;
        ctx.save(); ctx.translate(x, H / 2); ctx.rotate(p === 0 ? Math.PI / 2 : -Math.PI / 2);
        ctx.font = "bold " + tsize(30) + "px " + FONT; var w = ctx.measureText(q.s).width + 40;
        rr(-w / 2, -26, w, 52, 26); ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fill();
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = q.c; ctx.fillText(q.s, 0, 1); ctx.restore();
      }
      ctx.globalAlpha = 1;
    });
  }
  function undoButtons() {
    var g = byId(gameName); if (!g || !g.undo || result) return;
    for (var p = 0; p < 2; p++) {
      sideBtn(p, 1, "undo", t - undoReq[p] < 4);
      if (t - undoReq[1 - p] < 4 && t - undoReq[p] >= 4) ptext(p, L("Take back? Tap the arrow too"), p === 0 ? 172 : W - 172, p === 0 ? 220 : H - 220, 20, "#ffd84a");
    }
  }

  // test hook
  window.tt = {
    open: function (id) { open(id); }, game: function () { return game; }, result: function () { return result; },
    menu: function () { toMenu(); }, controls: function () {
      var o = [];
      if (state === "menu") { tiles().forEach(function (r) { o.push({ k: r.g.id, x: r.x, y: r.y, w: r.w, h: r.h }); }); extras().forEach(function (r) { o.push({ k: r.kind, x: r.x, y: r.y, w: r.w, h: r.h }); }); }
      else for (var p = 0; p < 2; p++) for (var i = 0; i < 4; i++) { var b = SB(p, i); o.push({ k: "side" + p + i, x: b[0] - 30, y: b[1] - 30, w: 60, h: 60 }); }
      return o;
    },
    page: function (k, p, id) { view = k ? { kind: k, p: p || 0, id: id } : null; },
    intro: function (v) { cfg.intro = v ? 0 : 1; },
    undo: function () { undoPress(0); undoPress(1); }, log: function () { return match && match.log.slice(); },
    restore: function () { var m = loadKey("twotable-match", null); if (m) open(m.id, { seed: m.seed, starter: m.starter, log: m.log, el: m.el, clock: m.clock }); return !!m; },
    hinge: function (d, s) { window.onHinge(d, s); }, quiet: function () { toasts = []; parts = []; }, set: function (k, v) { cfg[k] = v; applyColors(); texCache = {}; },
    // launch check on the simulator: skip the guide, open a game and play a few moves
    demo: function (id, n) {
      cfg.intro = 1; if (!id || id === "menu" || !byId(id)) { toMenu(); return; }
      starter = 0; open(id); var g = game;
      for (var i = 0; i < (n || 8); i++) { var l = g.legal ? g.legal() : []; if (!l.length || result) break; g.playMove(l[(i * 7) % l.length]); }
    }
  };

  var lastT = performance.now();
  function frame(now) {
    var dt = Math.min(0.033, (now - lastT) / 1000); lastT = now; t += dt;
    var paused = document.hidden || (hinge && hinge.k === "closed");
    if (state === "game" && game) {
      if (coin) { coin.t += dt; if (coin.t > 2) coin = null; }
      else if (!(game.live && paused)) game.update(dt);
      if (result) result.t += dt; else if (match && !paused) match.el += dt;
    }
    updParts(dt); fade = Math.max(0, fade - dt * 4); music();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cw, ch);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
    if (state === "menu") drawMenu();
    else { game.draw(); seam(); undoButtons(); drawResult(); if (game.live) homeButton(); drawCoin(); }
    drawParts(); drawToasts(dt); drawPage(); drawIntro();
    if (fade > 0) { ctx.fillStyle = "rgba(10,20,15," + fade * 0.7 + ")"; ctx.fillRect(-ox / scale, -oy / scale, cw / scale, ch / scale); }
    hingeHint();
    if (state !== lastState || !!view !== lastView) { lastState = state; lastView = !!view; placeA11y(); }
    requestAnimationFrame(frame);
  }
  var lastState = "", lastView = false;
  resize();
  // a match that was interrupted (app closed by the system) continues where it stopped
  (function () {
    var m = loadKey("twotable-match", null);
    if (m && byId(m.id) && m.log && m.log.length) { open(m.id, { seed: m.seed, starter: m.starter, log: m.log, el: m.el, clock: m.clock }); toast(L("Match restored"), "#fff"); }
  })();
  requestAnimationFrame(frame);
})();
