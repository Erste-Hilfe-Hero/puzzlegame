'use strict';
(() => {
// ---------- constants ----------
const TS = 16, MW = 200, MH = 40, VH = 300;
const PAST = 0, PRESENT = 1;
const THRESH = 10; // past kills to drive a species extinct
const SAVE_KEY = 'epochfall.save.v1';
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
let VW = 640, K = 1;

// ---------- i18n ----------
const I = window.EF_I18N;
let lang = 'en';
function t(k, ...a) { let s = (I[lang] && I[lang][k]) || I.en[k] || k; a.forEach((v, i) => { s = s.replace('{' + i + '}', v); }); return s; }

// ---------- data ----------
const SPEC = {
  sigbin:     { niche: 'hunter', name: 'Sigbin', hp: 30, spd: 70, dmg: 10, beh: 'charger', w: 22, h: 14, col: '#3a2550', eye: '#ffcf5a', mat: 'hunterP', xp: 10 },
  sigbinx:    { niche: 'hunter', name: 'Sigbin-X', hp: 40, spd: 85, dmg: 12, beh: 'charger', w: 22, h: 14, col: '#4b5578', eye: '#ff3d8b', mat: 'hunterX', xp: 12 },
  tiktik:     { niche: 'hunter', name: 'Tiktik Stalkers', hp: 46, spd: 60, dmg: 14, beh: 'leaper', w: 16, h: 20, col: '#6a2440', eye: '#3ef0b4', mat: 'hunterS', xp: 16 },
  salagubang: { niche: 'swarm', name: 'Salagubang', hp: 10, spd: 80, dmg: 6, beh: 'swarm', w: 10, h: 8, col: '#7a5420', eye: '#ffe08a', mat: 'swarmP', xp: 5, group: 3 },
  neonmite:   { niche: 'swarm', name: 'Neon Mites', hp: 12, spd: 95, dmg: 7, beh: 'swarm', w: 9, h: 8, col: '#2bd9ff', eye: '#ffffff', mat: 'swarmX', xp: 6, group: 3 },
  wisp:       { niche: 'swarm', name: 'Static Wisps', hp: 16, spd: 110, dmg: 8, beh: 'swarm', w: 10, h: 10, col: '#c7a2ff', eye: '#ffffff', mat: 'swarmS', xp: 8, group: 4 },
  wakwak:     { niche: 'flyer', name: 'Wakwak', hp: 22, spd: 60, dmg: 9, beh: 'flyer', w: 20, h: 12, col: '#1d3b38', eye: '#ff6b4a', mat: 'flyerP', xp: 9 },
  rotor:      { niche: 'flyer', name: 'Wakwak Drones', hp: 26, spd: 70, dmg: 10, beh: 'flyer', w: 20, h: 12, col: '#59607a', eye: '#ff3d8b', mat: 'flyerX', xp: 11 },
  mantis:     { niche: 'flyer', name: 'Mantis Drones', hp: 30, spd: 90, dmg: 12, beh: 'diver', w: 18, h: 14, col: '#2f7a4a', eye: '#ffc65a', mat: 'flyerS', xp: 14 }
};
const NICHES = { hunter: ['sigbin', 'sigbinx', 'tiktik'], swarm: ['salagubang', 'neonmite', 'wisp'], flyer: ['wakwak', 'rotor', 'mantis'] };
const MATS = { hunterP: 'Sigbin Fang', hunterX: 'Chrome Fang', hunterS: 'Tiktik Plume', swarmP: 'Salagubang Shell', swarmX: 'Mite Core',
  swarmS: 'Wisp Static', flyerP: 'Wakwak Feather', flyerX: 'Drone Rotor', flyerS: 'Mantis Lens', tikCore: 'Tikbalang Core' };
const NODES = [
  { id: 'arnis', br: 'blade', req: null, cost: 0 },
  { id: 'swift', br: 'blade', req: 'arnis', cost: 1 },
  { id: 'fourth', br: 'blade', req: 'swift', cost: 1 },
  { id: 'breaker', br: 'blade', req: 'fourth', cost: 1, mats: { hunterP: 4 } },
  { id: 'edge', br: 'blade', req: 'breaker', cost: 2 },
  { id: 'bolt', br: 'spirit', req: 'arnis', cost: 1 },
  { id: 'well', br: 'spirit', req: 'bolt', cost: 1 },
  { id: 'echo', br: 'spirit', req: 'well', cost: 1, mats: { flyerP: 3 } },
  { id: 'mend', br: 'spirit', req: 'echo', cost: 2 },
  { id: 'roots', br: 'body', req: 'arnis', cost: 1 },
  { id: 'step', br: 'body', req: 'roots', cost: 1 },
  { id: 'airdash', br: 'body', req: 'step', cost: 1, mats: { swarmP: 4 } },
  { id: 'iron', br: 'body', req: 'airdash', cost: 2 },
  { id: 'asc', br: 'asc', req: 'arnis', cost: 2, lvl: 5 }
];
const SHRINES = [10, 86, 160];
const FEATHER = { x: 140 * TS, y: 18 * TS };
const SPAWNS = [
  { n: 'hunter', x: 28, y: 35 }, { n: 'hunter', x: 92, y: 35 }, { n: 'hunter', x: 125, y: 17 }, { n: 'hunter', x: 138, y: 35 },
  { n: 'hunter', x: 60, y: 35, era: PRESENT },
  { n: 'swarm', x: 22, y: 31 }, { n: 'swarm', x: 120, y: 33 }, { n: 'swarm', x: 146, y: 33 },
  { n: 'flyer', x: 36, y: 26 }, { n: 'flyer', x: 95, y: 24 }, { n: 'flyer', x: 132, y: 12 }, { n: 'flyer', x: 150, y: 28 },
  { n: 'flyer', x: 58, y: 30, era: PRESENT }
];
const ARENA = { x0: 168 * TS, x1: 198 * TS, door: 166, trigger: 171 * TS };

// ---------- map ----------
const map = new Uint8Array(MW * MH);
function setT(x, y, v) { if (x >= 0 && x < MW && y >= 0 && y < MH) map[y * MW + x] = v; }
function fill(x, y, w, h, v) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setT(i, j, v); }
function tileAt(x, y) { if (x < 0 || x >= MW || y >= MH) return 1; if (y < 0) return 0; return map[y * MW + x]; }
function buildMap() {
  map.fill(0);
  fill(0, 36, MW, 4, 1);
  fill(0, 0, 1, MH, 1); fill(MW - 1, 0, 1, MH, 1);
  // A: barangay gate
  fill(18, 32, 5, 1, 2); fill(30, 29, 4, 1, 2);
  // B: the broken bridge (present-only walkway over a stake pit)
  fill(44, 36, 32, 3, 0); fill(44, 38, 32, 1, 5); fill(44, 36, 32, 1, 4);
  // C: vine steps (past only) up to the ledge
  [[105, 33], [100, 30], [105, 27], [100, 24], [105, 21]].forEach(([x, y]) => fill(x, y, 4, 1, 3));
  fill(110, 18, 41, 2, 1);
  // D: the wall, cracked at the bottom, passable over the top with a double jump
  fill(146, 13, 6, 1, 2);
  fill(154, 10, 2, 26, 1); fill(154, 32, 2, 4, 6);
  // E: arena
  fill(166, 19, 34, 1, 1); fill(166, 20, 2, 10, 1);
}
function isSolid(v) { return v === 1 || v === 6 || (v === 4 && S.era === PRESENT); }
function isOneWay(v) { return v === 2 || (v === 3 && S.era === PAST); }

// ---------- state ----------
let S, P, enemies = [], projs = [], parts = [], texts = [], items = [], boss = null;
let cam = { x: 0, y: 0 }, shake = 0, hitstop = 0, flash = 0, flashCol = '#fff', mode = 'title', paused = false;
let spawnState = [];
let hintCd = 0, featherTaken = false;

function freshSave() {
  return { v: 1, lvl: 1, xp: 0, sp: 1, nodes: ['arnis'], mats: {}, pastKills: { hunter: 0, swarm: 0, flyer: 0 }, dj: false,
    shrine: 0, era: PRESENT, bossMem: { attempts: 0, wins: 0, left: 0, right: 0, air: 0, ground: 0, bolts: 0, melee: 0, maxStage: 1 },
    bossDone: false, deaths: 0, time: 0, lang: null };
}
function load() { try { const r = localStorage.getItem(SAVE_KEY); if (r) { const d = JSON.parse(r); if (d && d.v === 1) return Object.assign(freshSave(), d); } } catch (e) {} return null; }
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
function has(id) { return S.nodes.includes(id); }
function popPct(n) { return Math.max(0, THRESH - S.pastKills[n]) / THRESH; }

// ---------- audio ----------
let AC = null;
function sfx(f, d = 0.08, type = 'square', vol = 0.05, slide = 0) {
  if (!AC) return;
  try {
    const o = AC.createOscillator(), g = AC.createGain(), n = AC.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, n); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), n + d);
    g.gain.setValueAtTime(vol, n); g.gain.exponentialRampToValueAtTime(0.0001, n + d);
    o.connect(g); g.connect(AC.destination); o.start(n); o.stop(n + d + 0.02);
  } catch (e) {}
}
function initAudio() { if (AC) return; try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }

// ---------- input ----------
const held = {}, pressed = {};
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  KeyX: 'jump', KeyK: 'jump', Space: 'jump', KeyZ: 'attack', KeyJ: 'attack', KeyC: 'dash', KeyL: 'dash', ShiftLeft: 'dash', KeyV: 'skill', KeyI: 'skill' };
function press(k) { if (!held[k]) pressed[k] = true; held[k] = true; }
function release(k) { held[k] = false; }
addEventListener('keydown', e => {
  if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Tab') { e.preventDefault(); if (mode === 'play') toggleMenu(); return; }
  const k = KEYMAP[e.code]; if (k) { e.preventDefault(); press(k); }
  if (mode === 'title' && (e.code === 'Enter' || e.code === 'Space')) startGame(false);
});
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) release(k); });

const touchEl = document.getElementById('touch');
let touchWanted = false;
function showTouch() { touchWanted = true; if (mode === 'play') touchEl.hidden = false; }
if (matchMedia('(pointer: coarse)').matches) showTouch();
addEventListener('touchstart', showTouch, { passive: true });
document.querySelectorAll('.tb, #b-time').forEach(b => {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', e => { e.preventDefault(); initAudio(); try { b.setPointerCapture(e.pointerId); } catch (_) {} press(k); b.classList.add('on'); });
  const up = e => { release(k); b.classList.remove('on'); };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
});
const stick = document.getElementById('stick'), knob = document.getElementById('knob');
let stickId = null;
function stickMove(e) {
  const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2);
  const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
  knob.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
  held.left = dx < -0.35; held.right = dx > 0.35; held.down = dy > 0.6;
  if (dy < -0.65) press('up'); else held.up = false;
}
stick.addEventListener('pointerdown', e => { e.preventDefault(); initAudio(); stickId = e.pointerId; try { stick.setPointerCapture(e.pointerId); } catch (_) {} stickMove(e); });
stick.addEventListener('pointermove', e => { if (e.pointerId === stickId) stickMove(e); });
const stickEnd = e => { if (e.pointerId !== stickId) return; stickId = null; knob.style.transform = ''; held.left = held.right = held.down = held.up = false; };
stick.addEventListener('pointerup', stickEnd); stick.addEventListener('pointercancel', stickEnd);
document.getElementById('b-menu').addEventListener('click', () => { if (mode === 'play') toggleMenu(); });

// ---------- helpers ----------
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
let uid = 1;
function moveX(e, dx) {
  e.x += dx;
  const top = Math.floor(e.y / TS), bot = Math.floor((e.y + e.h - 0.01) / TS);
  if (dx > 0) { const tx = Math.floor((e.x + e.w) / TS); for (let ty = top; ty <= bot; ty++) if (isSolid(tileAt(tx, ty))) { e.x = tx * TS - e.w - 0.01; return true; } }
  else if (dx < 0) { const tx = Math.floor(e.x / TS); for (let ty = top; ty <= bot; ty++) if (isSolid(tileAt(tx, ty))) { e.x = (tx + 1) * TS; return true; } }
  return false;
}
function moveY(e, dy) {
  const oldBot = e.y + e.h;
  e.y += dy; e.onGround = false;
  const l = Math.floor(e.x / TS), r = Math.floor((e.x + e.w - 0.01) / TS);
  if (dy > 0) {
    const ty = Math.floor((e.y + e.h) / TS);
    for (let tx = l; tx <= r; tx++) { const v = tileAt(tx, ty); if (isSolid(v) || (isOneWay(v) && oldBot <= ty * TS + 0.5 && !e.drop)) { e.y = ty * TS - e.h; e.vy = 0; e.onGround = true; return true; } }
  } else if (dy < 0) {
    const ty = Math.floor(e.y / TS);
    for (let tx = l; tx <= r; tx++) if (isSolid(tileAt(tx, ty))) { e.y = (ty + 1) * TS; e.vy = 0; return true; }
  }
  return false;
}
function burst(x, y, n, col, spd = 120, life = 0.5, size = 2, grav = 300) {
  for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), s = rnd(spd * 0.3, spd); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: rnd(life * 0.5, life), max: life, col, size, grav }); }
}
function popText(x, y, txt, col = '#fff', big = false) { texts.push({ x, y, txt, col, life: 0.9, big }); }
let toastT = 0;
const toastEl = document.getElementById('toast');
function toast(msg, dur = 2.6) { toastEl.textContent = msg; toastEl.classList.add('show'); toastT = dur; }

// ---------- player ----------
function newPlayer(x, y) {
  return { x, y, w: 12, h: 26, vx: 0, vy: 0, face: 1, onGround: false, jumps: 0, coyote: 0, jbuf: 0, hp: 100, maxhp: 100, en: 50, maxen: 50,
    inv: 0, dashT: 0, dashCd: 0, airDashed: false, atkT: 0, atkDur: 0, atkCd: 0, combo: 0, comboWin: 0, finisher: false, hitIds: null,
    safe: { x, y }, hurtT: 0, anim: 0 };
}
function stats() {
  const asc = has('asc') ? 1.1 : 1;
  return {
    spd: (has('swift') ? 1.15 : 1) * asc,
    maxCombo: has('fourth') ? 4 : 3,
    dmg: 12 * (has('edge') ? 1.2 : 1) * asc,
    maxhp: (100 + (has('roots') ? 25 : 0)) * asc,
    maxen: 50 + (has('well') ? 25 : 0),
    regen: has('well') ? 9 : 5,
    dashInv: has('step') ? 0.28 : 0.16,
    dashCd: has('step') ? 0.32 : 0.5,
    taken: (has('iron') ? 0.85 : 1) / asc
  };
}
function hurtPlayer(dmg, fromX) {
  if (P.inv > 0 || mode !== 'play') return;
  const st = stats();
  const d = Math.round(dmg * st.taken);
  P.hp -= d; P.inv = 0.7; P.hurtT = 0.25;
  P.vx = (P.x + P.w / 2 < fromX ? -1 : 1) * 160; P.vy = -160;
  shake = Math.max(shake, 5); hitstop = 0.06; sfx(140, 0.15, 'sawtooth', 0.06, -60);
  popText(P.x + P.w / 2, P.y - 4, '-' + d, '#ff6b8a');
  burst(P.x + P.w / 2, P.y + P.h / 2, 8, '#ff3d8b');
  if (P.hp <= 0) die();
}
function die() {
  S.deaths++;
  if (boss && boss.active) endBossFight(false);
  toast(t('died'));
  const sx = SHRINES[S.shrine] * TS;
  P = newPlayer(sx, 34 * TS - 26 + 16);
  const st = stats(); P.maxhp = P.hp = st.maxhp; P.maxen = P.en = st.maxen;
  P.inv = 1.2; flash = 0.5; flashCol = '#ff3d8b';
  enemies = []; projs = []; resetSpawns();
  save();
}

// ---------- enemies ----------
function speciesFor(niche) {
  const [past, pres, succ] = NICHES[niche], p = popPct(niche);
  if (S.era === PAST) return p > 0 ? past : null;
  if (p <= 0) return succ;
  if (p <= 0.5) return Math.random() < 0.5 ? succ : pres;
  return pres;
}
function resetSpawns() { spawnState = SPAWNS.map(s => ({ ...s, alive: 0, cd: 0 })); }
function spawnEnemy(sp) {
  const id = speciesFor(sp.n); if (!id) return;
  const d = SPEC[id], n = d.group || 1;
  for (let i = 0; i < n; i++) {
    const e = { id: uid++, sp: id, d, x: sp.x * TS + i * 12, y: sp.y * TS - d.h - (d.beh === 'swarm' ? i * 10 : 0), w: d.w, h: d.h, vx: 0, vy: 0,
      hp: d.hp, max: d.hp, face: -1, onGround: false, st: 'walk', t: rnd(0, 1), home: { x: sp.x * TS, y: sp.y * TS - 40 }, src: sp, era: S.era, flashT: 0, kb: 0, ph: rnd(0, 6) };
    if (d.beh === 'flyer' || d.beh === 'diver') e.y = sp.y * TS - 30;
    enemies.push(e); sp.alive++;
  }
}
function updateSpawns(dt) {
  for (const sp of spawnState) {
    if (sp.era !== undefined && sp.era !== S.era) continue;
    if (sp.alive > 0) continue;
    sp.cd -= dt;
    if (sp.cd > 0) continue;
    if (Math.abs(sp.x * TS - P.x) < 250 && Math.abs(sp.y * TS - P.y) < 200) continue;
    if (sp.x * TS > ARENA.x0 - 20) continue;
    spawnEnemy(sp);
    if (sp.alive === 0) sp.cd = 4;
  }
}
function updateEnemy(e, dt) {
  const d = e.d, px = P.x + P.w / 2, py = P.y + P.h / 2, ex = e.x + e.w / 2, ey = e.y + e.h / 2;
  const dx = px - ex, dy = py - ey;
  e.t += dt; if (e.flashT > 0) e.flashT -= dt;
  if (e.kb > 0) { e.kb -= dt; }
  if (d.beh === 'charger' || d.beh === 'leaper') {
    e.vy = Math.min(600, e.vy + 900 * dt);
    if (e.kb <= 0) {
      if (d.beh === 'charger') {
        if (e.st === 'walk') {
          e.vx = e.face * d.spd * 0.5;
          if (Math.abs(dx) < 150 && Math.abs(dy) < 40 && e.t > 0.6) { e.st = 'wind'; e.t = 0; e.face = Math.sign(dx) || 1; e.vx = 0; }
        } else if (e.st === 'wind') { e.vx = 0; if (e.t > 0.38) { e.st = 'charge'; e.t = 0; sfx(320, 0.06, 'square', 0.03); } }
        else if (e.st === 'charge') { e.vx = e.face * d.spd * 3; if (e.t > 0.55) { e.st = 'walk'; e.t = 0; } }
      } else {
        if (e.onGround) {
          e.vx *= 0.8;
          if (e.t > 0.9 && Math.abs(dx) < 220) { e.face = Math.sign(dx) || 1; e.vx = e.face * d.spd * 2.4; e.vy = -300; e.t = 0; }
          else if (Math.abs(dx) >= 220) e.vx = e.face * d.spd * 0.4;
        }
      }
    }
    const hitWall = moveX(e, e.vx * dt);
    moveY(e, e.vy * dt);
    if (e.onGround && e.kb <= 0) {
      const ahead = Math.floor((e.face > 0 ? e.x + e.w + 2 : e.x - 2) / TS), below = Math.floor((e.y + e.h + 2) / TS);
      const gap = !isSolid(tileAt(ahead, below)) && !isOneWay(tileAt(ahead, below));
      if (hitWall || (gap && e.st !== 'charge') || (gap && e.st === 'charge')) { e.face *= -1; if (e.st === 'charge') { e.st = 'walk'; e.t = 0; } }
    }
  } else if (d.beh === 'swarm') {
    const near = Math.abs(dx) < 200 && Math.abs(dy) < 120;
    const tx = near ? px + Math.sin(e.t * 3 + e.ph) * 26 : e.home.x + Math.sin(e.t + e.ph) * 30;
    const ty = near ? py - 6 + Math.cos(e.t * 4 + e.ph) * 16 : e.home.y + Math.cos(e.t * 1.3 + e.ph) * 12;
    if (e.kb <= 0) { e.vx += (tx - ex) * 3 * dt; e.vy += (ty - ey) * 3 * dt; }
    const sp = Math.hypot(e.vx, e.vy), mx = d.spd; if (sp > mx) { e.vx *= mx / sp; e.vy *= mx / sp; }
    e.x += e.vx * dt; e.y += e.vy * dt; e.face = e.vx >= 0 ? 1 : -1;
  } else {
    // flyer / diver
    if (e.st === 'walk') {
      const hx = e.home.x + Math.sin(e.t * 0.8 + e.ph) * 50, hy = e.home.y + Math.sin(e.t * 2 + e.ph) * 10;
      e.vx += (hx - ex) * 2 * dt; e.vy += (hy - ey) * 2 * dt; e.vx *= 0.96; e.vy *= 0.96;
      const range = d.beh === 'diver' ? 190 : 140;
      if (Math.abs(dx) < range && dy > -20 && dy < 160 && e.t > 1.6) { e.st = 'wind'; e.t = 0; }
    } else if (e.st === 'wind') {
      e.vx *= 0.85; e.vy = -30;
      if (e.t > 0.35) { e.st = 'dive'; e.t = 0; const m = Math.hypot(dx, dy) || 1, s = d.spd * (d.beh === 'diver' ? 4.2 : 3.2); e.vx = dx / m * s; e.vy = dy / m * s; sfx(500, 0.08, 'triangle', 0.03, -200); }
    } else if (e.st === 'dive') {
      if (e.t > 0.55) { e.st = 'walk'; e.t = 0; }
    }
    if (e.kb > 0) { e.vx *= 0.9; e.vy *= 0.9; }
    e.x += e.vx * dt; e.y += e.vy * dt; e.face = e.vx >= 0 ? 1 : -1;
    const gy = Math.floor((e.y + e.h) / TS); if (isSolid(tileAt(Math.floor(ex / TS), gy))) { e.y = gy * TS - e.h; e.vy = -Math.abs(e.vy) * 0.5; if (e.st === 'dive') { e.st = 'walk'; e.t = 0; } }
  }
  if (overlap(e, P) && P.dashT <= 0) hurtPlayer(d.dmg, ex);
}
function damageEnemy(e, dmg, kx, isBolt) {
  e.hp -= dmg; e.flashT = 0.1;
  e.kb = 0.18; e.vx = kx * 170; if (e.d.beh !== 'swarm' && e.d.beh !== 'flyer' && e.d.beh !== 'diver') e.vy = -120; else e.vy = -40;
  if (e.st === 'charge' || e.st === 'dive') { e.st = 'walk'; e.t = 0; }
  popText(e.x + e.w / 2, e.y - 2, Math.round(dmg), isBolt ? '#3ef0b4' : '#ffc65a');
  burst(e.x + e.w / 2, e.y + e.h / 2, 6, e.d.eye, 140, 0.35);
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.dead = true;
  const d = e.d;
  burst(e.x + e.w / 2, e.y + e.h / 2, 18, d.col, 180, 0.6, 3);
  burst(e.x + e.w / 2, e.y + e.h / 2, 10, d.eye, 120, 0.5, 2);
  sfx(220, 0.12, 'square', 0.05, -120);
  if (e.src) { e.src.alive = Math.max(0, e.src.alive - 1); if (e.src.alive === 0) e.src.cd = 12; }
  if (has('mend')) P.hp = Math.min(P.maxhp, P.hp + 4);
  // drop
  if (Math.random() < (d.group ? 0.45 : 0.85)) items.push({ x: e.x + e.w / 2 - 4, y: e.y, w: 8, h: 8, vy: -120, mat: d.mat, t: 0 });
  gainXp(d.xp);
  // ecosystem
  if (e.era === PAST && NICHES[d.niche][0] === e.sp) {
    const before = popPct(d.niche);
    S.pastKills[d.niche] = Math.min(THRESH, S.pastKills[d.niche] + 1);
    const after = popPct(d.niche);
    if (before > 0 && after <= 0) {
      const succ = SPEC[NICHES[d.niche][2]].name;
      toast(t('extinctToast', d.name, succ), 4);
      flash = 0.4; flashCol = '#ff3d8b'; shake = 8; sfx(90, 0.6, 'sawtooth', 0.07, -40);
      enemies.forEach(o => { if (o.sp === e.sp && !o.dead) { o.dead = true; burst(o.x, o.y, 12, '#ff3d8b'); } });
      spawnState.forEach(s => { if (s.n === d.niche) s.alive = 0; });
    } else if (before > 0.5 && after <= 0.5) {
      toast(d.name + ' · ' + t('population') + ' ' + Math.round(after * 100) + '%');
    }
  }
  save();
}
function gainXp(x) {
  S.xp += x;
  popText(P.x + P.w / 2, P.y - 14, '+' + x + ' XP', '#c7a2ff');
  let need = 20 + 12 * S.lvl;
  while (S.xp >= need) {
    S.xp -= need; S.lvl++; S.sp++; need = 20 + 12 * S.lvl;
    toast(t('levelUp', S.lvl)); P.hp = P.maxhp; flash = 0.25; flashCol = '#ffc65a';
    burst(P.x + P.w / 2, P.y + P.h / 2, 30, '#ffc65a', 200, 0.8);
    sfx(523, 0.1, 'triangle', 0.06); setTimeout(() => sfx(784, 0.18, 'triangle', 0.06), 90);
  }
}

// ---------- boss: Tikbalang with learning stages ----------
function bossBaseStage() { return Math.min(3, 1 + Math.floor(S.bossMem.attempts / 2)); }
function startBossFight() {
  fill(ARENA.door, 30, 2, 6, 1);
  const base = bossBaseStage();
  boss = { active: true, x: 188 * TS, y: 36 * TS - 64, w: 36, h: 64, vx: 0, vy: 0, hp: 520, max: 520, face: -1, onGround: false,
    st: 'intro', t: 0, stage: base, base, flashT: 0, next: null, last: [], tele: 0, plan: null,
    mem: { left: 0, right: 0, air: 0, ground: 0, bolts: 0, melee: 0 }, telePX: 0, hitThis: null, alpha: 1 };
  enemies = [];
  toast(t('bossMem', base), 3.2);
  shake = 10; sfx(70, 0.9, 'sawtooth', 0.08, -20);
}
function endBossFight(won) {
  const m = S.bossMem, b = boss;
  if (b) { m.left += b.mem.left; m.right += b.mem.right; m.air += b.mem.air; m.ground += b.mem.ground; m.bolts += b.mem.bolts; m.melee += b.mem.melee; m.maxStage = Math.max(m.maxStage, b.stage); }
  if (won) { m.wins++; S.bossDone = true; } else m.attempts++;
  fill(ARENA.door, 30, 2, 6, 0);
  boss = null;
  save();
}
function bossLearn(dt) {
  const b = boss, mem = b.mem;
  if (P.onGround) mem.ground += dt; else mem.air += dt;
  // dodge direction while an attack is telegraphed
  if (b.st === 'tele' && Math.abs(P.vx) > 40) { if (P.vx < 0) mem.left += dt; else mem.right += dt; }
}
function bossPick() {
  const b = boss, mem = b.mem, gm = S.bossMem;
  const air = (mem.air + gm.air * 0.3) / (mem.air + mem.ground + (gm.air + gm.ground) * 0.3 + 0.01);
  const ranged = (mem.bolts + gm.bolts * 0.3) / (mem.bolts + mem.melee + (gm.bolts + gm.melee) * 0.3 + 1);
  const w = { charge: 3, stomp: 2 + 3 * (1 - air), spiral: b.stage >= 2 ? 1 + 4 * air : 0, mirage: b.stage >= 3 ? 2 + 4 * ranged : 0 };
  const l = b.last;
  if (l.length >= 2 && l[0] === l[1]) w[l[0]] = 0;
  let sum = 0; for (const k in w) sum += w[k];
  let r = Math.random() * sum;
  for (const k in w) { r -= w[k]; if (r <= 0) return k; }
  return 'charge';
}
function favoredSide() {
  const b = boss, L = b.mem.left + S.bossMem.left * 0.3, R = b.mem.right + S.bossMem.right * 0.3;
  if (Math.abs(L - R) < 0.2) return 0; return L > R ? -1 : 1;
}
function bossProj(o) { projs.push(Object.assign({ from: 'boss', life: 3, hit: null }, o)); }
function updateBoss(dt) {
  const b = boss;
  const spd = 1 + 0.12 * (b.stage - 1);
  const px = P.x + P.w / 2, bx = b.x + b.w / 2;
  b.t += dt; if (b.flashT > 0) b.flashT -= dt;
  bossLearn(dt);
  // stage escalation inside the fight
  const want = Math.min(5, b.base + (b.hp < b.max * 0.66 ? 1 : 0) + (b.hp < b.max * 0.33 ? 1 : 0));
  if (want > b.stage) { b.stage = want; toast(t('bossLearn', b.stage)); flash = 0.3; flashCol = '#3ef0b4'; shake = 8; sfx(110, 0.5, 'sawtooth', 0.07, 60); }
  b.vy = Math.min(700, b.vy + 1100 * dt);
  switch (b.st) {
    case 'intro': b.vx = 0; if (b.t > 1.2) { b.st = 'idle'; b.t = 0; } break;
    case 'idle':
      b.face = px < bx ? -1 : 1; b.vx = b.face * 30;
      if (b.t > Math.max(0.35, 0.95 - 0.12 * b.stage)) { b.plan = bossPick(); b.last.unshift(b.plan); b.last.length = 3; b.st = 'tele'; b.t = 0; b.telePX = px; }
      break;
    case 'tele': {
      b.vx = 0;
      const tt = Math.max(0.3, 0.6 - 0.06 * (b.stage - 1));
      if (b.t > tt) {
        b.t = 0; const side = favoredSide(), lead = side * 34 * (b.stage - 1) / 2;
        if (b.plan === 'charge') { b.st = 'charge'; b.face = px < bx ? -1 : 1; sfx(180, 0.25, 'sawtooth', 0.06, 80); }
        else if (b.plan === 'stomp') { b.st = 'stompUp'; const tx = clamp(px + lead, ARENA.x0 + 20, ARENA.x1 - 20); b.vy = -470; b.vx = (tx - bx) / 0.85; }
        else if (b.plan === 'spiral') { b.st = 'spiral'; b.shots = 0; }
        else { b.st = 'mirageOut'; }
      }
      break;
    }
    case 'charge':
      b.vx = b.face * 270 * spd;
      if (b.t > 0.25 && (b.x <= ARENA.x0 + 2 || b.x + b.w >= ARENA.x1 - 2)) { b.st = 'recover'; b.t = 0; shake = 7; sfx(80, 0.2, 'square', 0.07); burst(bx, b.y + b.h, 14, '#a88b5a', 160); }
      break;
    case 'stompUp':
      if (b.onGround && b.t > 0.2) {
        shake = 9; sfx(60, 0.35, 'sawtooth', 0.08, -20);
        const n = b.stage >= 4 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          bossProj({ x: bx - 8, y: b.y + b.h - 14, w: 16, h: 14, vx: -230 * spd * (1 - i * 0.35), vy: 0, dmg: 15, type: 'wave', life: 1.6 });
          bossProj({ x: bx - 8, y: b.y + b.h - 14, w: 16, h: 14, vx: 230 * spd * (1 - i * 0.35), vy: 0, dmg: 15, type: 'wave', life: 1.6 });
        }
        burst(bx, b.y + b.h, 20, '#a88b5a', 200);
        b.vx = 0; b.st = 'recover'; b.t = 0;
      }
      break;
    case 'spiral': {
      b.vx = 0;
      const total = 3 + b.stage, gap = 0.16;
      if (b.t > gap) {
        b.t = 0; b.shots++;
        const lead = b.stage >= 3 ? P.vx * 0.35 : 0;
        const ax = px + lead - bx, ay = (P.y + P.h / 2) - (b.y + 10), m = Math.hypot(ax, ay) || 1, s = 190 * spd;
        const sp = (b.shots - total / 2) * 0.06;
        const ca = Math.cos(sp), sa = Math.sin(sp), vx = (ax / m) * s, vy = (ay / m) * s;
        bossProj({ x: bx - 5, y: b.y + 8, w: 10, h: 10, vx: vx * ca - vy * sa, vy: vx * sa + vy * ca, dmg: 10, type: 'leaf', life: 2.5 });
        sfx(700, 0.05, 'triangle', 0.03, -300);
        if (b.shots >= total) { b.st = 'recover'; b.t = 0; }
      }
      break;
    }
    case 'mirageOut':
      b.vx = 0; b.alpha = Math.max(0, 1 - b.t / 0.35);
      if (b.t > 0.35) {
        const side = favoredSide() || (Math.random() < 0.5 ? -1 : 1);
        b.x = clamp(px + side * 46 - b.w / 2, ARENA.x0 + 4, ARENA.x1 - b.w - 4);
        b.face = px < b.x + b.w / 2 ? -1 : 1; b.st = 'mirageIn'; b.t = 0; sfx(900, 0.2, 'sine', 0.04, -600);
      }
      break;
    case 'mirageIn':
      b.alpha = Math.min(1, b.t / 0.2);
      if (b.t > Math.max(0.28, 0.45 - 0.04 * b.stage)) {
        const hb = { x: b.face > 0 ? b.x + b.w : b.x - 46, y: b.y + 8, w: 46, h: 40 };
        if (overlap(hb, P) && P.dashT <= 0) hurtPlayer(20, bx);
        burst(hb.x + hb.w / 2, hb.y + hb.h / 2, 12, '#3ef0b4', 160, 0.3);
        sfx(260, 0.15, 'sawtooth', 0.06, -120);
        b.st = 'recover'; b.t = 0;
      }
      break;
    case 'recover':
      b.vx *= 0.8; b.alpha = 1;
      if (b.t > Math.max(0.35, 0.8 - 0.08 * b.stage)) { b.st = 'idle'; b.t = 0; }
      break;
    case 'dead':
      b.vx = 0;
      if (Math.random() < 0.5) burst(bx + rnd(-15, 15), b.y + rnd(0, b.h), 3, Math.random() < 0.5 ? '#ffc65a' : '#3ef0b4', 120);
      if (b.t > 1.8) winGame();
      break;
  }
  moveX(b, b.vx * dt);
  b.x = clamp(b.x, ARENA.x0, ARENA.x1 - b.w);
  moveY(b, b.vy * dt);
  if (b.st !== 'dead' && b.st !== 'intro' && b.alpha > 0.5 && overlap(b, P) && P.dashT <= 0) hurtPlayer(b.st === 'charge' ? 20 : 12, bx);
}
function damageBoss(dmg, isBolt) {
  const b = boss; if (!b || b.st === 'dead' || b.st === 'intro' || b.alpha < 0.5) return;
  b.hp -= dmg; b.flashT = 0.08;
  if (isBolt) b.mem.bolts++; else b.mem.melee++;
  popText(b.x + b.w / 2, b.y - 4, Math.round(dmg), isBolt ? '#3ef0b4' : '#ffc65a');
  burst(b.x + b.w / 2, b.y + b.h / 3, 6, '#ffc65a', 140, 0.3);
  if (b.hp <= 0) {
    b.hp = 0; b.st = 'dead'; b.t = 0; shake = 14; flash = 0.6; flashCol = '#ffc65a'; sfx(50, 1.2, 'sawtooth', 0.09, -20);
    projs = projs.filter(p => p.from !== 'boss');
    S.mats.tikCore = (S.mats.tikCore || 0) + 1;
    gainXp(120);
  }
}
function winGame() {
  const stage = boss ? boss.stage : 1;
  endBossFight(true);
  mode = 'win';
  const sec = Math.floor(S.time), mm = Math.floor(sec / 60), ss = String(sec % 60).padStart(2, '0');
  document.getElementById('w-title').textContent = t('win');
  document.getElementById('w-sub').textContent = t('winSub');
  document.getElementById('w-stats').textContent = t('winStats', mm + ':' + ss, S.deaths, stage);
  document.getElementById('w-again').textContent = t('again');
  document.getElementById('win').hidden = false;
}
document.getElementById('w-again').addEventListener('click', () => { document.getElementById('win').hidden = true; mode = 'play'; });

// ---------- player update ----------
function attackBox() {
  const w = P.finisher ? 40 : 30;
  return { x: P.face > 0 ? P.x + P.w - 2 : P.x - w + 2, y: P.y - 2, w, h: P.h + 4 };
}
function updatePlayer(dt) {
  const st = stats();
  P.maxhp = st.maxhp; P.maxen = st.maxen;
  P.en = Math.min(P.maxen, P.en + st.regen * dt);
  if (P.inv > 0) P.inv -= dt;
  if (P.hurtT > 0) P.hurtT -= dt;
  if (P.dashCd > 0) P.dashCd -= dt;
  if (P.atkCd > 0) P.atkCd -= dt;
  if (P.comboWin > 0) P.comboWin -= dt; else if (P.atkT <= 0) P.combo = 0;
  P.coyote = P.onGround ? 0.09 : P.coyote - dt;
  if (pressed.jump) P.jbuf = 0.12; else P.jbuf -= dt;
  if (P.onGround) { P.jumps = 0; P.airDashed = false; }

  const dir = (held.right ? 1 : 0) - (held.left ? 1 : 0);
  if (P.dashT > 0) {
    P.dashT -= dt; P.vx = P.face * 360; P.vy = 0;
    if (Math.random() < 0.7) parts.push({ x: P.x + P.w / 2, y: P.y + rnd(4, P.h - 4), vx: -P.face * 30, vy: 0, life: 0.25, max: 0.25, col: has('asc') ? '#ffc65a' : '#3ef0b4', size: 3, grav: 0 });
  } else {
    const max = 140, acc = P.onGround ? 1400 : 900;
    if (dir) { P.vx += dir * acc * dt; if (Math.abs(P.vx) > max) P.vx = Math.sign(P.vx) * max; if (P.atkT <= 0) P.face = dir; }
    else { const fr = P.onGround ? 1600 : 500; P.vx = Math.abs(P.vx) <= fr * dt ? 0 : P.vx - Math.sign(P.vx) * fr * dt; }
    P.vy = Math.min(620, P.vy + 980 * dt);
    if (!held.jump && P.vy < -120) P.vy += 1400 * dt; // short hop
    if (P.jbuf > 0) {
      if (P.coyote > 0) { P.vy = -340; P.jbuf = 0; P.coyote = 0; P.jumps = 1; sfx(380, 0.08, 'square', 0.03, 200); burst(P.x + P.w / 2, P.y + P.h, 5, '#ece6d6', 60, 0.3); }
      else if (S.dj && P.jumps < 2) { P.vy = -320; P.jbuf = 0; P.jumps = 2; sfx(560, 0.1, 'triangle', 0.04, 300); burst(P.x + P.w / 2, P.y + P.h, 10, '#ff8a3d', 100, 0.4); }
    }
  }
  if (pressed.dash && P.dashCd <= 0 && (P.onGround || (has('airdash') && !P.airDashed))) {
    if (!P.onGround) P.airDashed = true;
    if (dir) P.face = dir;
    P.dashT = 0.16; P.dashCd = st.dashCd; P.inv = Math.max(P.inv, st.dashInv); sfx(260, 0.1, 'sine', 0.05, 400);
  }
  // attack
  if (pressed.attack && P.atkCd <= 0) {
    P.combo = P.comboWin > 0 && P.combo < st.maxCombo ? P.combo + 1 : 1;
    P.finisher = P.combo === st.maxCombo;
    P.atkDur = (P.finisher ? 0.26 : 0.2) / st.spd; P.atkT = P.atkDur; P.atkCd = (P.finisher ? 0.3 : 0.15) / st.spd; P.comboWin = P.atkDur + 0.3;
    P.hitIds = new Set();
    sfx(P.finisher ? 200 : 300 + P.combo * 60, 0.07, 'square', 0.035, -100);
    if (P.finisher && P.onGround) P.vx = P.face * 120;
  }
  if (P.atkT > 0) {
    P.atkT -= dt;
    const prog = 1 - P.atkT / P.atkDur;
    if (prog > 0.2 && prog < 0.75) {
      const hb = attackBox();
      const mult = P.finisher ? (has('breaker') ? 2.08 : 1.6) : 1;
      for (const e of enemies) if (!e.dead && !P.hitIds.has(e.id) && overlap(hb, e)) {
        P.hitIds.add(e.id); damageEnemy(e, st.dmg * mult * rnd(0.92, 1.08), P.face, false);
        hitstop = P.finisher ? 0.08 : 0.045; shake = Math.max(shake, P.finisher ? 5 : 2);
      }
      if (boss && !P.hitIds.has('boss') && overlap(hb, boss)) { P.hitIds.add('boss'); damageBoss(st.dmg * mult * rnd(0.92, 1.08), false); hitstop = P.finisher ? 0.08 : 0.045; shake = Math.max(shake, 3); }
      if (P.finisher && has('breaker') && !P.hitIds.has('wall')) {
        const x0 = Math.floor(hb.x / TS), x1 = Math.floor((hb.x + hb.w) / TS), y0 = Math.floor(hb.y / TS), y1 = Math.floor((hb.y + hb.h) / TS);
        let broke = false;
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (tileAt(x, y) === 6) {
          for (let yy = 0; yy < MH; yy++) if (tileAt(x, yy) === 6) { setT(x, yy, 0); burst(x * TS + 8, yy * TS + 8, 10, '#8a7a66', 200, 0.8, 3); }
          broke = true;
        }
        if (broke) { P.hitIds.add('wall'); shake = 12; sfx(90, 0.4, 'sawtooth', 0.08, -40); }
      }
    }
  }
  // skill
  if (pressed.skill && has('bolt') && P.en >= 15) {
    P.en -= 15;
    const echo = has('echo');
    projs.push({ from: 'player', x: P.x + P.w / 2 - 6 + P.face * 8, y: P.y + 8, w: 12, h: 8, vx: P.face * 330, vy: 0, dmg: 18 * (echo ? 1.25 : 1) * (has('asc') ? 1.1 : 1), type: 'bolt', life: 0.9, pierce: echo, hit: new Set() });
    sfx(880, 0.12, 'sine', 0.05, -400);
  }
  P.drop = held.down && pressed.jump;
  moveX(P, P.vx * dt);
  moveY(P, P.vy * dt);
  P.x = clamp(P.x, TS, (MW - 1) * TS - P.w);
  // spikes / safe spot
  const l = Math.floor(P.x / TS), r = Math.floor((P.x + P.w - 0.01) / TS), tp = Math.floor(P.y / TS), bt = Math.floor((P.y + P.h - 0.01) / TS);
  let spike = false;
  for (let y = tp; y <= bt; y++) for (let x = l; x <= r; x++) if (tileAt(x, y) === 5) spike = true;
  if (spike) {
    P.inv = 0; hurtPlayer(20, P.x + P.w / 2 + P.face);
    if (P.hp > 0) { P.x = P.safe.x; P.y = P.safe.y; P.vx = P.vy = 0; P.inv = 1; }
  } else if (P.onGround) {
    let danger = false;
    for (let x = l - 2; x <= r + 2; x++) for (let y = bt + 1; y < bt + 4; y++) if (tileAt(x, y) === 5 || tileAt(x, y) === 0 && y === bt + 1 && (x === l || x === r)) danger = true;
    if (!danger) P.safe = { x: P.x, y: P.y };
  }
  P.anim += dt * (Math.abs(P.vx) > 10 ? 1 : 0.3);
}

// ---------- world update ----------
let nearShrine = -1;
const timeBtn = document.getElementById('b-time');
function switchEra() {
  S.era = S.era === PAST ? PRESENT : PAST;
  S.shrine = nearShrine;
  enemies = []; projs = projs.filter(p => p.from !== 'boss'); resetSpawns();
  // never leave the player inside a solid tile
  for (let i = 0; i < 4 && (isSolid(tileAt(Math.floor((P.x + 2) / TS), Math.floor((P.y + P.h - 2) / TS))) || isSolid(tileAt(Math.floor((P.x + P.w - 2) / TS), Math.floor((P.y + P.h - 2) / TS)))); i++) P.y -= TS;
  flash = 0.7; flashCol = S.era === PAST ? '#3ef0b4' : '#ff3d8b'; shake = 6;
  sfx(S.era === PAST ? 300 : 600, 0.5, 'sine', 0.06, S.era === PAST ? -150 : 300);
  burst(P.x + P.w / 2, P.y + P.h / 2, 40, flashCol, 260, 0.9, 2, 0);
  toast(S.era === PAST ? t('past') + ' · ' + t('yearPast') : t('present') + ' · ' + t('yearPresent'), 1.6);
  save();
}
function update(dt) {
  S.time += dt;
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) toastEl.classList.remove('show'); }
  if (hintCd > 0) hintCd -= dt;
  for (const p of parts) { p.life -= dt; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  parts = parts.filter(p => p.life > 0);
  for (const x of texts) { x.life -= dt; x.y -= 24 * dt; }
  texts = texts.filter(x => x.life > 0);
  if (flash > 0) flash -= dt;
  if (shake > 0) shake = Math.max(0, shake - 30 * dt);
  if (hitstop > 0) { hitstop -= dt; return; }

  updatePlayer(dt);
  // shrines
  nearShrine = -1;
  SHRINES.forEach((sx, i) => { if (Math.abs(P.x + P.w / 2 - (sx * TS + 8)) < 22 && P.y > 30 * TS) nearShrine = i; });
  timeBtn.hidden = nearShrine < 0 || !!(boss && boss.active);
  if (!timeBtn.hidden) timeBtn.textContent = t('shrineBtn') + ' ⟲';
  if (pressed.up && nearShrine >= 0 && !(boss && boss.active)) switchEra();
  if (nearShrine >= 0 && S.shrine !== nearShrine) { S.shrine = nearShrine; save(); }
  // feather
  if (!S.dj && Math.abs(P.x - FEATHER.x) < 16 && Math.abs(P.y + P.h - FEATHER.y) < 30) {
    S.dj = true; toast(t('feather'), 3.2); flash = 0.4; flashCol = '#ff8a3d'; burst(FEATHER.x, FEATHER.y - 8, 30, '#ff8a3d', 200, 0.9); sfx(660, 0.4, 'triangle', 0.06, 400); save();
  }
  // hints
  if (hintCd <= 0) {
    if (!has('breaker') && P.x > 149 * TS && P.x < 154 * TS && P.y > 30 * TS) { toast(t('cracked'), 3); hintCd = 8; }
    else if (S.era === PAST && P.x > 38 * TS && P.x < 44 * TS && P.y > 30 * TS) { toast(t('noCross'), 3); hintCd = 8; }
  }
  // boss arena
  if (!boss && !S.bossDone && P.x > ARENA.trigger && P.y > 20 * TS) startBossFight();
  if (boss) updateBoss(dt);
  else updateSpawns(dt);
  for (const e of enemies) if (!e.dead) updateEnemy(e, dt);
  enemies = enemies.filter(e => !e.dead && e.y < MH * TS + 50);
  // projectiles
  for (const p of projs) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.type === 'leaf') p.vy += Math.sin(p.life * 10) * 40 * dt;
    if (p.from === 'player') {
      parts.push({ x: p.x + 6, y: p.y + 4, vx: 0, vy: 0, life: 0.18, max: 0.18, col: '#3ef0b4', size: 3, grav: 0 });
      for (const e of enemies) if (!e.dead && !p.hit.has(e.id) && overlap(p, e)) { p.hit.add(e.id); damageEnemy(e, p.dmg, Math.sign(p.vx), true); if (!p.pierce) p.life = 0; }
      if (boss && !p.hit.has('boss') && overlap(p, boss) && boss.alpha > 0.5) { p.hit.add('boss'); damageBoss(p.dmg, true); if (!p.pierce) p.life = 0; }
    } else if (overlap(p, P) && P.dashT <= 0) { hurtPlayer(p.dmg, p.x); if (p.type === 'leaf') p.life = 0; }
    if (p.type !== 'wave' && isSolid(tileAt(Math.floor((p.x + p.w / 2) / TS), Math.floor((p.y + p.h / 2) / TS)))) p.life = 0;
  }
  projs = projs.filter(p => p.life > 0);
  // items
  for (const it of items) {
    it.t += dt;
    const dx = P.x + P.w / 2 - (it.x + 4), dy = P.y + P.h / 2 - (it.y + 4), dist = Math.hypot(dx, dy);
    if (dist < 70 && it.t > 0.3) { it.x += dx / dist * 260 * dt; it.y += dy / dist * 260 * dt; }
    else { it.vy = Math.min(400, it.vy + 700 * dt); moveY(it, it.vy * dt); }
    if (dist < 12 && it.t > 0.3) { it.got = true; S.mats[it.mat] = (S.mats[it.mat] || 0) + 1; popText(P.x + P.w / 2, P.y - 24, '+1 ' + MATS[it.mat], '#ffe08a'); sfx(990, 0.05, 'triangle', 0.03); }
  }
  items = items.filter(i => !i.got && i.t < 30);
  // camera
  const tx = clamp(P.x + P.w / 2 - VW / 2 + P.face * 30, 0, MW * TS - VW), ty = clamp(P.y + P.h / 2 - VH * 0.58, 0, MH * TS - VH);
  cam.x += (tx - cam.x) * Math.min(1, dt * 6); cam.y += (ty - cam.y) * Math.min(1, dt * 5);
  for (const k in pressed) pressed[k] = false;
}

// ---------- rendering ----------
const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * 0.6, s: Math.random() < 0.15 ? 2 : 1 }));
const ridges = [0, 1, 2].map(l => Array.from({ length: 40 }, (_, i) => 0.35 + 0.25 * Math.sin(i * (0.9 + l * 0.4) + l * 2) + 0.12 * Math.sin(i * 2.7 + l)));
const towers = Array.from({ length: 70 }, (_, i) => ({ w: 18 + (i * 37 % 26), h: 60 + (i * 53 % 140), lit: i * 7 % 11 }));
const SIGNS = ['SARI-SARI', 'KAIN TAYO', 'BALUT 24/7', 'JEEP · LIWANAG', 'TINDAHAN', 'KARINDERYA', 'PASALUBONG', 'HALO-HALO'];
const rain = Array.from({ length: 120 }, () => ({ x: Math.random(), y: Math.random(), s: rnd(0.6, 1) }));
const flies = Array.from({ length: 40 }, () => ({ x: Math.random(), y: rnd(0.35, 0.9), p: rnd(0, 6) }));

function drawBG(time) {
  const past = S.era === PAST;
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  if (past) { g.addColorStop(0, '#071a24'); g.addColorStop(0.55, '#0d3a3c'); g.addColorStop(1, '#16514a'); }
  else { g.addColorStop(0, '#0a0718'); g.addColorStop(0.5, '#2a0f3c'); g.addColorStop(1, '#5a1748'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  for (const s of stars) { ctx.fillStyle = past ? 'rgba(236,230,214,.75)' : 'rgba(236,230,214,.35)'; ctx.fillRect((s.x * VW - cam.x * 0.02 + VW) % VW, s.y * VH, s.s, s.s); }
  // moons: in the past the sky still holds seven moons; the Bakunawa has since swallowed all but one
  const moons = past ? 7 : 1;
  for (let i = 0; i < moons; i++) {
    const mx = (past ? VW * 0.18 + i * VW * 0.1 : VW * 0.78) - cam.x * 0.03, my = past ? 58 + Math.sin(i * 1.7) * 12 : 60, r = past ? 3 + (i % 3) : 14;
    ctx.fillStyle = past ? 'rgba(220,255,240,.08)' : 'rgba(255,198,230,.12)'; ctx.beginPath(); ctx.arc(mx, my, r * 2.2, 0, 7); ctx.fill();
    ctx.fillStyle = past ? '#c9eedc' : '#ffe3f0'; ctx.beginPath(); ctx.arc(mx, my, r, 0, 7); ctx.fill();
  }
  if (past) {
    const cols = ['#0b2b2e', '#082224', '#051718'];
    ridges.forEach((rg, l) => {
      const par = 0.08 + l * 0.12, base = VH * (0.62 + l * 0.1) - cam.y * par * 0.3;
      ctx.fillStyle = cols[l]; ctx.beginPath(); ctx.moveTo(0, VH);
      for (let i = 0; i <= 40; i++) { const x = i * (VW / 20) - (cam.x * par) % (VW / 20 * 20); ctx.lineTo(x, base - rg[i % 40] * 70); }
      ctx.lineTo(VW, VH); ctx.fill();
    });
    // palms
    ctx.strokeStyle = '#041213'; ctx.fillStyle = '#041213'; ctx.lineWidth = 3;
    for (let i = 0; i < 14; i++) {
      const x = ((i * 97 - cam.x * 0.45) % (VW + 200) + VW + 200) % (VW + 200) - 100, y = VH * 0.92 - cam.y * 0.15;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 10, y - 50, x + 4, y - 90); ctx.stroke();
      for (let f = 0; f < 6; f++) { const a = -Math.PI / 2 + (f - 2.5) * 0.55; ctx.beginPath(); ctx.moveTo(x + 4, y - 90); ctx.quadraticCurveTo(x + 4 + Math.cos(a) * 26, y - 96 + Math.sin(a) * 10, x + 4 + Math.cos(a) * 40, y - 80 + Math.sin(a) * 18); ctx.stroke(); }
    }
    for (const f of flies) { const a = 0.4 + 0.6 * Math.sin(time * 3 + f.p); ctx.fillStyle = `rgba(190,255,150,${a})`; ctx.fillRect(((f.x * VW * 2 - cam.x * 0.6) % VW + VW) % VW, f.y * VH + Math.sin(time + f.p) * 6, 2, 2); }
  } else {
    // skyline, two layers
    for (let l = 0; l < 2; l++) {
      const par = 0.15 + l * 0.2; let x = -((cam.x * par) % 2000);
      const base = VH * (0.95 - l * 0.02) - cam.y * par * 0.3;
      for (let i = 0; x < VW + 40; i++) {
        const tw = towers[(i + l * 13) % towers.length], h = tw.h * (l ? 1 : 1.25);
        ctx.fillStyle = l ? '#120a24' : '#1b1033'; ctx.fillRect(x, base - h, tw.w, h);
        ctx.fillStyle = l ? 'rgba(255,198,90,.55)' : 'rgba(43,217,255,.35)';
        for (let wy = base - h + 6; wy < base - 6; wy += 9) for (let wx = x + 3; wx < x + tw.w - 3; wx += 6) if (((wx * 13 + wy * 7) | 0) % (tw.lit + 3) === 0) ctx.fillRect(wx, wy, 2, 3);
        if (l && i % 4 === 1) {
          const s = SIGNS[i % SIGNS.length], on = Math.sin(time * 2 + i) > -0.85;
          ctx.font = '700 9px "Chakra Petch", sans-serif';
          const sw = ctx.measureText(s).width + 8;
          ctx.fillStyle = on ? (i % 2 ? '#ff3d8b' : '#3ef0b4') : '#3a2440';
          ctx.globalAlpha = on ? 0.9 : 0.5; ctx.fillRect(x + tw.w / 2 - sw / 2, base - h - 16, sw, 12);
          ctx.fillStyle = '#0b0e1a'; ctx.fillText(s, x + tw.w / 2 - sw / 2 + 4, base - h - 7); ctx.globalAlpha = 1;
        }
        x += tw.w + 6;
      }
    }
    ctx.strokeStyle = 'rgba(160,190,255,.25)'; ctx.lineWidth = 1; ctx.beginPath();
    for (const r of rain) { const x = ((r.x * VW - time * 40 * r.s) % VW + VW) % VW, y = (r.y * VH + time * 380 * r.s) % VH; ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 9 * r.s); }
    ctx.stroke();
  }
}
function drawTiles(time) {
  const past = S.era === PAST;
  const x0 = Math.floor(cam.x / TS), x1 = Math.ceil((cam.x + VW) / TS), y0 = Math.floor(cam.y / TS), y1 = Math.ceil((cam.y + VH) / TS);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const v = tileAt(x, y); if (!v) continue;
    const px = Math.round(x * TS - cam.x), py = Math.round(y * TS - cam.y);
    const above = tileAt(x, y - 1);
    if (v === 1 || v === 6) {
      ctx.fillStyle = past ? '#2d2a22' : '#1a1d30'; ctx.fillRect(px, py, TS, TS);
      ctx.fillStyle = past ? '#3a352a' : '#232842'; ctx.fillRect(px + 1, py + 1, TS - 2, TS - 2);
      if ((x * 7 + y * 3) % 5 === 0) { ctx.fillStyle = past ? '#26231c' : '#151829'; ctx.fillRect(px + 4, py + 5, 5, 3); }
      if (!isSolid(above) && !isOneWay(above)) {
        if (past) { ctx.fillStyle = '#3f8a4a'; ctx.fillRect(px, py, TS, 4); ctx.fillStyle = '#5fb35c'; ctx.fillRect(px + (x % 3) * 4, py - 2, 3, 3); }
        else { ctx.fillStyle = '#ff3d8b'; ctx.fillRect(px, py, TS, 2); ctx.fillStyle = 'rgba(255,61,139,.18)'; ctx.fillRect(px, py - 3, TS, 3); }
      }
      if (v === 6) { ctx.strokeStyle = '#11100c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px + 3, py + 2); ctx.lineTo(px + 8, py + 8); ctx.lineTo(px + 5, py + 14); ctx.moveTo(px + 8, py + 8); ctx.lineTo(px + 13, py + 10); ctx.stroke(); }
    } else if (v === 2) {
      ctx.fillStyle = past ? '#7a5a34' : '#3b4466'; ctx.fillRect(px, py, TS, 4);
      ctx.fillStyle = past ? '#a37a46' : '#2bd9ff'; ctx.fillRect(px, py, TS, 1);
    } else if (v === 3) {
      if (past) { ctx.fillStyle = '#4c7a2e'; ctx.fillRect(px, py, TS, 5); ctx.fillStyle = '#86b84a'; ctx.fillRect(px, py, TS, 2); ctx.fillStyle = '#2f5a1e'; ctx.fillRect(px + 6, py + 5, 2, 7 + (x % 3) * 3); }
      else { ctx.strokeStyle = 'rgba(62,240,180,.22)'; ctx.setLineDash([3, 3]); ctx.strokeRect(px + 0.5, py + 0.5, TS - 1, 4); ctx.setLineDash([]); }
    } else if (v === 4) {
      if (!past) { ctx.fillStyle = '#2c3354'; ctx.fillRect(px, py, TS, TS); ctx.fillStyle = '#2bd9ff'; ctx.fillRect(px, py, TS, 2); ctx.fillStyle = 'rgba(43,217,255,.25)'; ctx.fillRect(px, py + 6, TS, 1); if (x % 4 === 0) { ctx.fillStyle = '#ffc65a'; ctx.fillRect(px + 7, py + 10, 2, 2); } }
      else { ctx.strokeStyle = 'rgba(255,61,139,.25)'; ctx.setLineDash([3, 3]); ctx.strokeRect(px + 0.5, py + 0.5, TS - 1, TS - 1); ctx.setLineDash([]); if (x === 44 || x === 75) { ctx.fillStyle = '#4a3a26'; ctx.fillRect(px + 5, py - 10, 5, 26); } }
    } else if (v === 5) {
      if (past) { ctx.fillStyle = '#8a7444'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(px + i * 5 + 1, py + TS); ctx.lineTo(px + i * 5 + 3, py + 3); ctx.lineTo(px + i * 5 + 5, py + TS); ctx.fill(); } }
      else { ctx.fillStyle = '#5a6080'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(px + i * 5 + 1, py + TS); ctx.lineTo(px + i * 5 + 3, py + 3); ctx.lineTo(px + i * 5 + 5, py + TS); ctx.fill(); } if (Math.sin(time * 20 + x) > 0.6) { ctx.fillStyle = '#2bd9ff'; ctx.fillRect(px + 3, py + 2, 1, 4); } }
    }
  }
}
function drawShrines(time) {
  SHRINES.forEach((sx, i) => {
    const x = sx * TS - cam.x, y = 36 * TS - cam.y;
    if (x < -40 || x > VW + 40) return;
    const near = nearShrine === i, glow = near ? 0.6 + 0.3 * Math.sin(time * 5) : 0.25;
    ctx.fillStyle = `rgba(62,240,180,${glow * 0.35})`; ctx.beginPath(); ctx.ellipse(x + 8, y - 18, 20, 26, 0, 0, 7); ctx.fill();
    // carved anito figure: squat body, hands on knees, big head
    ctx.fillStyle = '#5a3a22'; ctx.fillRect(x + 1, y - 22, 14, 22); ctx.fillRect(x - 1, y - 36, 18, 15);
    ctx.fillStyle = '#3a2414'; ctx.fillRect(x + 3, y - 12, 4, 10); ctx.fillRect(x + 9, y - 12, 4, 10); ctx.fillRect(x + 2, y - 30, 12, 2);
    ctx.fillStyle = near ? '#3ef0b4' : '#9fd9c4'; ctx.fillRect(x + 3, y - 33, 3, 3); ctx.fillRect(x + 10, y - 33, 3, 3);
    ctx.fillStyle = '#c99a5a'; ctx.fillRect(x - 2, y - 2, 20, 2);
    if (near) {
      ctx.font = '700 10px "Chakra Petch", sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#3ef0b4'; ctx.fillText('▲ ' + t('shrine'), x + 8, y - 44); ctx.textAlign = 'left';
    }
  });
  if (!S.dj) {
    const x = FEATHER.x - cam.x, y = FEATHER.y - cam.y - 12 + Math.sin(time * 3) * 3;
    ctx.fillStyle = 'rgba(255,138,61,.25)'; ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.ellipse(x, y, 3, 9, 0.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.ellipse(x + 1, y - 2, 1.5, 6, 0.5, 0, 7); ctx.fill();
  }
}
function drawEnemy(e, time) {
  const x = Math.round(e.x - cam.x), y = Math.round(e.y - cam.y), d = e.d, f = e.face;
  if (x < -40 || x > VW + 40 || y < -40 || y > VH + 40) return;
  const white = e.flashT > 0;
  ctx.save(); ctx.translate(x + e.w / 2, y + e.h / 2); ctx.scale(f, 1);
  const body = white ? '#ffffff' : d.col;
  if (e.st === 'wind') { ctx.fillStyle = 'rgba(255,61,139,.35)'; ctx.beginPath(); ctx.arc(0, 0, e.w * 0.8, 0, 7); ctx.fill(); }
  ctx.fillStyle = body;
  switch (e.sp) {
    case 'sigbin': case 'sigbinx': {
      // low hound, head between hind legs folklore pose: tail high, head low
      ctx.fillRect(-11, -4, 20, 9);
      ctx.fillRect(6, -1, 7, 6);
      const leg = Math.sin(e.t * 14) * 2;
      ctx.fillRect(-9, 4, 3, 4 + leg); ctx.fillRect(4, 4, 3, 4 - leg);
      ctx.beginPath(); ctx.moveTo(-11, -3); ctx.quadraticCurveTo(-18, -12, -12, -16); ctx.lineTo(-10, -14); ctx.quadraticCurveTo(-14, -10, -9, -4); ctx.fill();
      if (e.sp === 'sigbinx' && !white) { ctx.fillStyle = '#2bd9ff'; ctx.fillRect(-8, -4, 14, 1); }
      ctx.fillStyle = d.eye; ctx.fillRect(10, 0, 2, 2);
      break;
    }
    case 'tiktik': {
      ctx.beginPath(); ctx.ellipse(0, 2, 6, 8, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-14, -9 + Math.sin(e.t * 12) * 3); ctx.lineTo(-4, -6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(2, -6); ctx.lineTo(8, -10); ctx.lineTo(6, -3); ctx.fill();
      ctx.fillStyle = d.eye; ctx.fillRect(4, -5, 2, 2);
      break;
    }
    case 'salagubang': case 'neonmite': case 'wisp': {
      if (e.sp === 'wisp') { ctx.globalAlpha = 0.7 + 0.3 * Math.sin(e.t * 20); ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      else { ctx.beginPath(); ctx.ellipse(0, 0, 5, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(236,230,214,.45)'; const wv = Math.sin(e.t * 40) * 3; ctx.fillRect(-4, -4 - Math.abs(wv), 4, 2); ctx.fillRect(0, -4 - Math.abs(wv), 4, 2); }
      ctx.fillStyle = d.eye; ctx.fillRect(3, -1, 2, 2);
      break;
    }
    default: {
      // wakwak / drones / mantis: winged night flyer
      const flap = Math.sin(e.t * (e.st === 'dive' ? 4 : 12)) * 6;
      ctx.beginPath(); ctx.ellipse(0, 0, 7, 5, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-3, -2); ctx.lineTo(-12, -6 - flap); ctx.lineTo(-2, 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(1, -2); ctx.lineTo(10, -6 - flap); ctx.lineTo(3, 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(6, -1); ctx.lineTo(12, 1); ctx.lineTo(6, 2); ctx.fill();
      if (e.sp !== 'wakwak' && !white) { ctx.fillStyle = '#2bd9ff'; ctx.fillRect(-5, 3, 10, 1); }
      ctx.fillStyle = d.eye; ctx.fillRect(4, -2, 2, 2);
    }
  }
  ctx.restore();
  if (e.hp < e.max) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x, y - 5, e.w, 2); ctx.fillStyle = '#ff3d8b'; ctx.fillRect(x, y - 5, e.w * e.hp / e.max, 2); }
}
function drawBoss(time) {
  const b = boss, x = Math.round(b.x - cam.x), y = Math.round(b.y - cam.y);
  ctx.save(); ctx.globalAlpha = b.alpha;
  if (b.st === 'tele') {
    const a = 0.3 + 0.3 * Math.sin(time * 30);
    ctx.fillStyle = b.plan === 'mirage' ? `rgba(62,240,180,${a})` : `rgba(255,61,139,${a})`;
    ctx.beginPath(); ctx.ellipse(x + b.w / 2, y + b.h / 2, b.w, b.h * 0.7, 0, 0, 7); ctx.fill();
    if (b.plan === 'charge') { ctx.fillStyle = 'rgba(255,61,139,.15)'; ctx.fillRect(b.face > 0 ? x + b.w : ARENA.x0 - cam.x, y + b.h - 20, b.face > 0 ? ARENA.x1 - b.x - b.w : b.x - ARENA.x0, 20); }
  }
  ctx.translate(x + b.w / 2, y + b.h); ctx.scale(b.face * 1.25, 1.25);
  const white = b.flashT > 0, fur = white ? '#ffffff' : '#5a4130', dark = white ? '#ffffff' : '#2e2016';
  const step = b.st === 'charge' ? Math.sin(time * 30) * 4 : Math.sin(time * 4) * 1;
  // long legs, knees above the head when crouching: the folklore tikbalang
  ctx.fillStyle = dark;
  ctx.fillRect(-10, -22, 5, 22 + step); ctx.fillRect(5, -22, 5, 22 - step);
  ctx.fillStyle = fur;
  ctx.fillRect(-12, -46, 24, 26);
  ctx.fillRect(-17, -44, 5, 24); ctx.fillRect(12, -44, 5, 24);
  // horse head
  ctx.save(); ctx.translate(6, -46); ctx.rotate(b.st === 'charge' ? 0.6 : 0.25);
  ctx.fillRect(-4, -18, 10, 18); ctx.fillRect(2, -20, 14, 9);
  ctx.fillStyle = dark; ctx.fillRect(-6, -20, 4, 16);
  ctx.fillStyle = white ? '#fff' : (b.stage >= 4 ? '#ff3d8b' : '#ffc65a'); ctx.fillRect(9, -18, 3, 3);
  ctx.restore();
  // mane of spines, glowing with what it has learned
  ctx.fillStyle = b.stage >= 3 ? '#3ef0b4' : '#a88b5a';
  for (let i = 0; i < 2 + b.stage; i++) ctx.fillRect(-12 + i * 4, -50 - (i % 2) * 4, 2, 6);
  ctx.restore();
}
function drawPlayer(time) {
  const x = Math.round(P.x - cam.x), y = Math.round(P.y - cam.y);
  if (P.inv > 0 && P.dashT <= 0 && Math.floor(time * 20) % 2) return;
  const asc = has('asc');
  if (asc) { ctx.fillStyle = `rgba(255,198,90,${0.18 + 0.08 * Math.sin(time * 4)})`; ctx.beginPath(); ctx.ellipse(x + P.w / 2, y + P.h / 2, 16, 20, 0, 0, 7); ctx.fill(); }
  ctx.save(); ctx.translate(x + P.w / 2, y + P.h); ctx.scale(P.face, 1);
  const run = P.onGround && Math.abs(P.vx) > 10 ? Math.sin(P.anim * 14) * 3 : 0;
  // scarf
  ctx.strokeStyle = '#ff3d8b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-1, -20);
  ctx.quadraticCurveTo(-10, -20 + Math.sin(time * 10) * 3, -16 - Math.min(10, Math.abs(P.vx) / 14), -16 + Math.sin(time * 12) * 3); ctx.stroke();
  ctx.fillStyle = '#1b2236'; ctx.fillRect(-4, -9, 3, 9 + run); ctx.fillRect(1, -9, 3, 9 - run);
  ctx.fillStyle = P.hurtT > 0 ? '#ffffff' : '#2c6b74'; ctx.fillRect(-5, -19, 10, 11);
  ctx.fillStyle = '#ffc65a'; ctx.fillRect(-5, -11, 10, 2);
  ctx.fillStyle = '#c98c5c'; ctx.fillRect(-4, -26, 8, 7);
  ctx.fillStyle = '#14121c'; ctx.fillRect(-5, -27, 9, 3); ctx.fillRect(-5, -25, 2, 4);
  ctx.fillStyle = '#ff3d8b'; ctx.fillRect(-4, -24, 8, 1);
  ctx.fillStyle = '#14121c'; ctx.fillRect(2, -23, 1, 1);
  // weapon
  if (P.atkT > 0) {
    const prog = 1 - P.atkT / P.atkDur, a0 = P.combo % 2 ? -1.6 : 1.2, a1 = P.combo % 2 ? 1.1 : -1.4, a = a0 + (a1 - a0) * Math.min(1, prog * 1.6);
    const len = P.finisher ? 30 : 22;
    ctx.strokeStyle = P.finisher ? (has('breaker') ? 'rgba(255,198,90,.55)' : 'rgba(236,230,214,.45)') : 'rgba(62,240,180,.4)';
    ctx.lineWidth = P.finisher ? 9 : 6; ctx.beginPath(); ctx.arc(2, -14, len - 4, Math.min(a0, a), Math.max(a0, a)); ctx.stroke();
    ctx.strokeStyle = '#ece6d6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(2, -14); ctx.lineTo(2 + Math.cos(a) * len, -14 + Math.sin(a) * len); ctx.stroke();
  } else {
    ctx.strokeStyle = '#a8b0c8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, -18); ctx.lineTo(-9, -4); ctx.stroke();
    ctx.strokeStyle = '#8a5a34'; ctx.beginPath(); ctx.moveTo(4, -16); ctx.lineTo(9, -3); ctx.stroke();
  }
  ctx.restore();
}
function drawProj() {
  for (const p of projs) {
    const x = p.x - cam.x, y = p.y - cam.y;
    if (p.type === 'bolt') { ctx.fillStyle = 'rgba(62,240,180,.35)'; ctx.fillRect(x - 3, y - 2, p.w + 6, p.h + 4); ctx.fillStyle = '#3ef0b4'; ctx.fillRect(x, y + 2, p.w, p.h - 4); ctx.fillStyle = '#eafff6'; ctx.fillRect(x + 3, y + 3, p.w - 6, 2); }
    else if (p.type === 'leaf') { ctx.save(); ctx.translate(x + 5, y + 5); ctx.rotate(p.life * 12); ctx.fillStyle = '#7ad04a'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 3, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#3ef0b4'; ctx.fillRect(-5, 0, 10, 1); ctx.restore(); }
    else if (p.type === 'wave') { ctx.fillStyle = 'rgba(168,139,90,.85)'; ctx.beginPath(); ctx.moveTo(x, y + p.h); ctx.lineTo(x + p.w / 2, y); ctx.lineTo(x + p.w, y + p.h); ctx.fill(); ctx.fillStyle = 'rgba(255,61,139,.6)'; ctx.fillRect(x, y + p.h - 2, p.w, 2); }
  }
}
function bar(x, y, w, h, v, col, bg = 'rgba(11,14,26,.7)') { ctx.fillStyle = bg; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.fillStyle = col; ctx.fillRect(x, y, Math.max(0, w * v), h); }
function drawHUD(time) {
  const ox = 12, oy = 10;
  ctx.font = '700 11px "Chakra Petch", sans-serif';
  ctx.fillStyle = '#ece6d6'; ctx.fillText(t('lvl') + ' ' + S.lvl, ox, oy + 9);
  bar(ox + 34, oy + 1, 110, 7, P.hp / P.maxhp, '#ff3d8b');
  bar(ox + 34, oy + 11, 80, 4, P.en / P.maxen, '#3ef0b4');
  bar(ox + 34, oy + 18, 80, 2, S.xp / (20 + 12 * S.lvl), '#c7a2ff');
  if (S.sp > 0) { ctx.fillStyle = '#ffc65a'; ctx.fillText('+' + S.sp + ' SP', ox + 150, oy + 9); }
  // era pill
  const past = S.era === PAST, label = (past ? t('past') : t('present')) + ' · ' + (past ? t('yearPast') : t('yearPresent'));
  ctx.font = '700 10px "Chakra Petch", sans-serif';
  const w = ctx.measureText(label).width + 16, cx = VW / 2 - w / 2;
  ctx.fillStyle = past ? 'rgba(62,240,180,.18)' : 'rgba(255,61,139,.18)'; ctx.fillRect(cx, oy - 2, w, 16);
  ctx.fillStyle = past ? '#3ef0b4' : '#ff3d8b'; ctx.fillRect(cx, oy - 2, 2, 16); ctx.fillText(label, cx + 9, oy + 9);
  // population chips
  let px = VW - 60 - 3 * 34;
  for (const n of ['hunter', 'swarm', 'flyer']) {
    const p = popPct(n);
    ctx.fillStyle = 'rgba(11,14,26,.6)'; ctx.fillRect(px, oy, 30, 12);
    ctx.fillStyle = p <= 0 ? '#ff3d8b' : p <= 0.5 ? '#ffc65a' : '#3ef0b4'; ctx.fillRect(px + 1, oy + 9, 28 * Math.max(p, 0.04), 2);
    ctx.fillStyle = '#ece6d6'; ctx.font = '700 7px "Chakra Petch", sans-serif'; ctx.fillText(n === 'hunter' ? 'HNT' : n === 'swarm' ? 'SWM' : 'FLY', px + 3, oy + 7);
    px += 34;
  }
  if (boss) {
    const bw = Math.min(360, VW - 120), bx = VW / 2 - bw / 2, by = VH - 26;
    ctx.font = '700 11px "Chakra Petch", sans-serif'; ctx.fillStyle = '#ffc65a'; ctx.fillText(t('bossName'), bx, by - 5);
    const st = t('bossStage', boss.stage); ctx.fillStyle = '#3ef0b4'; ctx.fillText(st, bx + bw - ctx.measureText(st).width, by - 5);
    bar(bx, by, bw, 6, boss.hp / boss.max, '#ffc65a');
    for (let i = 1; i <= 5; i++) { ctx.fillStyle = i <= boss.stage ? '#3ef0b4' : 'rgba(236,230,214,.2)'; ctx.fillRect(bx + (i - 1) * (bw / 5) + 1, by + 9, bw / 5 - 2, 2); }
  }
}
function render(time) {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.save();
  if (shake > 0) ctx.translate(rnd(-shake, shake), rnd(-shake, shake));
  drawBG(time);
  drawTiles(time);
  drawShrines(time);
  for (const it of items) { const x = it.x - cam.x, y = it.y - cam.y + Math.sin(it.t * 6) * 1.5; ctx.fillStyle = 'rgba(255,224,138,.3)'; ctx.fillRect(x - 2, y - 2, 12, 12); ctx.fillStyle = '#ffe08a'; ctx.fillRect(x + 1, y + 1, 6, 6); }
  for (const e of enemies) drawEnemy(e, time);
  if (boss) drawBoss(time);
  drawPlayer(time);
  drawProj();
  for (const p of parts) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.col; ctx.fillRect(p.x - cam.x - p.size / 2, p.y - cam.y - p.size / 2, p.size, p.size); }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const x of texts) { ctx.globalAlpha = Math.min(1, x.life * 2); ctx.font = '700 10px "Chakra Petch", sans-serif'; ctx.fillStyle = '#0b0e1a'; ctx.fillText(x.txt, x.x - cam.x + 1, x.y - cam.y + 1); ctx.fillStyle = x.col; ctx.fillText(x.txt, x.x - cam.x, x.y - cam.y); }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
  ctx.restore();
  if (flash > 0) { ctx.globalAlpha = Math.min(0.6, flash); ctx.fillStyle = flashCol; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  drawHUD(time);
}

// ---------- menu ----------
const menuEl = document.getElementById('menu'), mBody = document.getElementById('m-body');
let tab = 'skills';
function toggleMenu(force) {
  const open = force !== undefined ? force : menuEl.hidden;
  menuEl.hidden = !open; paused = open;
  if (open) { toastEl.classList.remove('show'); toastT = 0; }
  if (open) renderMenu();
}
document.querySelectorAll('.tabs [data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; renderMenu(); }));
document.getElementById('m-close').addEventListener('click', () => toggleMenu(false));
function canLearn(n) {
  if (has(n.id)) return false;
  if (n.req && !has(n.req)) return false;
  if (S.sp < n.cost) return false;
  if (n.lvl && S.lvl < n.lvl) return false;
  if (n.mats) for (const m in n.mats) if ((S.mats[m] || 0) < n.mats[m]) return false;
  return true;
}
function learn(id) {
  const n = NODES.find(x => x.id === id); if (!n || !canLearn(n)) return false;
  S.sp -= n.cost; if (n.mats) for (const m in n.mats) S.mats[m] -= n.mats[m];
  S.nodes.push(id);
  const st = stats(); P.maxhp = st.maxhp; P.maxen = st.maxen; P.hp = Math.min(P.hp + 25, P.maxhp);
  sfx(660, 0.2, 'triangle', 0.06, 200);
  save(); return true;
}
function nodeHTML(n) {
  const got = has(n.id), can = canLearn(n);
  let need = [];
  if (!got) {
    if (n.cost) need.push(n.cost + ' SP');
    if (n.lvl) need.push(t('lvl') + ' ' + n.lvl);
    if (n.mats) for (const m in n.mats) need.push(n.mats[m] + 'x ' + MATS[m] + ' (' + (S.mats[m] || 0) + ')');
  }
  return `<div class="node ${got ? 'have' : can ? 'can' : ''}"><span class="nm">${t('n_' + n.id)}</span><span class="ds">${t('d_' + n.id)}</span>` +
    (got ? `<span class="st">${t('learned')}</span>` : can ? `<button type="button" data-learn="${n.id}">${t('learn')} · ${need.join(' · ')}</button>` : `<span class="st lock">${t('needs')}: ${need.join(' · ')}${n.req && !has(n.req) ? ' · ' + t('n_' + n.req) : ''}</span>`) + '</div>';
}
function renderMenu() {
  document.querySelectorAll('.tabs [data-tab]').forEach(b => { b.classList.toggle('on', b.dataset.tab === tab); b.textContent = t(b.dataset.tab === 'skills' ? 'skills' : b.dataset.tab === 'eco' ? 'eco' : 'bag'); });
  document.getElementById('m-close').textContent = t('resume');
  if (tab === 'skills') {
    let h = `<div class="sp-line"><span>Eskrimador · ${t('lvl')} ${S.lvl}</span><span>${t('sp')}: <b>${S.sp}</b></span></div><div class="tree">`;
    for (const br of ['blade', 'spirit', 'body']) { h += `<div class="branch"><h3>${t('br_' + br)}</h3>`; NODES.filter(n => n.br === br && n.id !== 'arnis').forEach(n => { h += nodeHTML(n); }); h += '</div>'; }
    h += '</div><div class="asc">' + nodeHTML(NODES.find(n => n.id === 'asc')) + nodeHTML(NODES[0]) + '</div>';
    mBody.innerHTML = h;
    mBody.querySelectorAll('[data-learn]').forEach(b => b.addEventListener('click', () => { learn(b.dataset.learn); renderMenu(); }));
  } else if (tab === 'eco') {
    let h = `<p class="eco-hint">${t('ecoHint')}</p><div class="eco">`;
    for (const n of ['hunter', 'swarm', 'flyer']) {
      const [pa, pr, su] = NICHES[n], p = popPct(n);
      h += `<div class="niche"><h4>${t('niche_' + n)}</h4><div class="row"><span>${t('past')}: ${SPEC[pa].name}</span><span>${p <= 0 ? `<span class="ext">${t('extinct')}</span>` : Math.round(p * 100) + '%'}</span></div>` +
        `<div class="bar"><i style="width:${Math.round(p * 100)}%"></i></div>` +
        `<div class="row"><span>${t('present')}:</span><span>${p <= 0 ? SPEC[su].name : p <= 0.5 ? SPEC[pr].name + ' + ' + SPEC[su].name : SPEC[pr].name}</span></div>` +
        `<div class="row"><span>Drops</span><span>${p <= 0 ? MATS[SPEC[su].mat] : p <= 0.5 ? MATS[SPEC[pr].mat] + ', ' + MATS[SPEC[su].mat] : MATS[SPEC[pr].mat]}</span></div></div>`;
    }
    mBody.innerHTML = h + '</div>';
  } else {
    let h = '<div class="mats">';
    for (const m in MATS) { const c = S.mats[m] || 0; h += `<div class="${c ? '' : 'zero'}"><span>${MATS[m]}</span><span>${c}</span></div>`; }
    mBody.innerHTML = h + '</div>';
  }
}

// ---------- title / flow ----------
function applyLang() {
  document.documentElement.lang = lang === 'fil' ? 'fil' : lang;
  document.getElementById('t-tagline').textContent = t('tagline');
  document.getElementById('t-keys').textContent = t('ctrlKeys');
  document.getElementById('t-rotate').textContent = t('rotate');
  const saved = load();
  const c = document.getElementById('btn-continue'), n = document.getElementById('btn-new');
  c.textContent = saved ? t('cont') : t('tap'); n.textContent = t('newgame'); n.hidden = !saved;
  document.querySelectorAll('.langs button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
}
document.querySelectorAll('.langs button').forEach(b => b.addEventListener('click', () => { lang = b.dataset.lang; try { localStorage.setItem('epochfall.lang', lang); } catch (e) {} applyLang(); }));
document.getElementById('btn-continue').addEventListener('click', () => startGame(false));
document.getElementById('btn-new').addEventListener('click', () => startGame(true));
function startGame(fresh) {
  initAudio();
  S = (!fresh && load()) || freshSave();
  buildMap();
  const sx = S.bossDone ? SHRINES[2] : (S.shrine || S.time ? SHRINES[S.shrine] : 4);
  P = newPlayer(sx * TS, 36 * TS - 26);
  const st = stats(); P.maxhp = P.hp = st.maxhp; P.maxen = P.en = st.maxen;
  enemies = []; projs = []; items = []; parts = []; texts = []; boss = null;
  resetSpawns();
  cam.x = clamp(P.x - VW / 2, 0, MW * TS - VW); cam.y = clamp(P.y - VH * 0.58, 0, MH * TS - VH);
  document.getElementById('title').hidden = true;
  mode = 'play';
  if (touchWanted) touchEl.hidden = false;
  if (!S.time) toast(t('present') + ' · ' + t('yearPresent'), 2.2);
  save();
}

// ---------- sizing + loop ----------
function resize() {
  const w = innerWidth, h = innerHeight;
  VW = clamp(Math.round(VH * w / h), 480, 820);
  const scale = Math.min(w / VW, h / VH);
  K = clamp(Math.ceil(scale * (devicePixelRatio || 1)), 1, 4);
  cv.width = VW * K; cv.height = VH * K;
  cv.style.width = VW * scale + 'px'; cv.style.height = VH * scale + 'px';
  cv.style.left = (w - VW * scale) / 2 + 'px'; cv.style.top = (h - VH * scale) / 2 + 'px';
}
addEventListener('resize', resize);
resize();
let last = performance.now(), acc = 0;
const STEP = 1 / 60;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (mode === 'play' && !paused) { acc += dt; let n = 0; while (acc >= STEP && n < 5) { update(STEP); acc -= STEP; n++; } if (n === 5) acc = 0; }
  if (S && P) render(now / 1000);
  else titleRender(now / 1000);
  requestAnimationFrame(frame);
}
function titleRender(time) {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  if (!S) { S = freshSave(); S.era = Math.floor(time / 4) % 2; cam.x = (time * 30) % 1000; cam.y = 0; drawBG(time); S = null; }
}
try { const l = localStorage.getItem('epochfall.lang'); if (l && I[l]) lang = l; else { const n = (navigator.language || 'en').toLowerCase(); lang = n.startsWith('de') ? 'de' : (n.startsWith('fil') || n.startsWith('tl')) ? 'fil' : 'en'; } } catch (e) {}
applyLang();
requestAnimationFrame(frame);

// test / debug hook (used by tools/test.mjs)
window.EF = {
  get S() { return S; }, get P() { return P; }, get boss() { return boss; }, get enemies() { return enemies; }, get mode() { return mode; },
  start: startGame, step(n = 1) { for (let i = 0; i < n; i++) update(STEP); },
  hold(k, v) { if (v) press(k); else release(k); },
  tap(k) { press(k); update(STEP); release(k); },
  teleport(tx, ty) { P.x = tx * TS; P.y = ty * TS - P.h; P.vx = P.vy = 0; cam.x = clamp(P.x - VW / 2, 0, MW * TS - VW); cam.y = clamp(P.y - VH * 0.58, 0, MH * TS - VH); },
  learn, era() { nearShrine = S.shrine; switchEra(); }, tile: tileAt, menu: toggleMenu, render: () => render(performance.now() / 1000),
  give(m, n) { S.mats[m] = (S.mats[m] || 0) + n; }, sp(n) { S.sp += n; }, lvl(n) { S.lvl = n; }
};
})();
