'use strict';
(() => {
// ---------- constants ----------
const TS = 16, MW = 200, VH = 300;
const PAST = 0, PRESENT = 1;
const THRESH = 10; // past kills to drive a species extinct
const SAVE_KEY = 'epochfall.save.v1', HELL_KEY = 'epochfall.hell.v1', ACC_KEY = 'epochfall.account.v1';
const HELL_MUL = 1.6; // hell mode: enemy HP and damage
const cv = document.getElementById('game');
let ctx = cv.getContext('2d'); // swapped briefly to draw menu portraits
let VW = 640, K = 1;

// ---------- i18n ----------
const I = window.EF_I18N;
let lang = 'en';
function t(k, ...a) { let s = (I[lang] && I[lang][k]) || I.en[k] || k; a.forEach((v, i) => { s = s.replace('{' + i + '}', v); }); return s; }
function tk(k, fb) { return (I[lang] && I[lang][k]) || I.en[k] || fb; }
function spName(id) { return tk('sn_' + id, SPEC[id].name); }
function matName(m) { return tk('m_' + m, MATS[m]); }
function spiritName(id) { return SUMMON_SPIRITS.includes(id) || id === 'diwata' ? t('sp_' + id) : t('spiritOf', spName(id)); }
let rng = Math.random; // forge rolls; replaceable through EF.rng for deterministic tests

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
  mantis:     { niche: 'flyer', name: 'Mantis Drones', hp: 30, spd: 90, dmg: 12, beh: 'diver', w: 18, h: 14, col: '#2f7a4a', eye: '#ffc65a', mat: 'flyerS', xp: 14 },
  kapre:      { niche: 'giant', name: 'Kapre', hp: 110, spd: 26, dmg: 16, beh: 'giant', w: 24, h: 42, col: '#5e4834', eye: '#ffb347', mat: 'giantP', xp: 28, quake: 1 },
  kapremech:  { niche: 'giant', name: 'Kapre Mech', hp: 130, spd: 30, dmg: 18, beh: 'giant', w: 26, h: 42, col: '#4a4f6a', eye: '#ff3d8b', mat: 'giantX', xp: 32, quake: 1 },
  ugat:       { niche: 'giant', name: 'Ugat Colossus', hp: 150, spd: 22, dmg: 20, beh: 'giant', w: 30, h: 38, col: '#2f4a2c', eye: '#3ef0b4', mat: 'giantS', xp: 40, quake: 2 },
  punso:      { niche: 'scav', name: 'Taga-Punso', hp: 14, spd: 120, dmg: 5, beh: 'thief', w: 12, h: 12, col: '#8a5a3a', eye: '#ffe08a', mat: 'scavP', xp: 7 },
  rustling:   { niche: 'scav', name: 'Rustlings', hp: 16, spd: 135, dmg: 6, beh: 'thief', w: 12, h: 11, col: '#5c6070', eye: '#2bd9ff', mat: 'scavX', xp: 8 },
  mirrormole: { niche: 'scav', name: 'Mirror Moles', hp: 22, spd: 125, dmg: 7, beh: 'thief', w: 14, h: 11, col: '#9aa8c0', eye: '#ffffff', mat: 'scavS', xp: 11 },
  cindershrew:{ niche: 'scav', name: 'Cinder Shrews', hp: 18, spd: 150, dmg: 8, beh: 'thief', w: 13, h: 10, col: '#4a2a2a', eye: '#ff8a3d', mat: 'scavA', xp: 11 }
};
const NICHE_IDS = ['hunter', 'swarm', 'flyer', 'giant', 'scav'];
const NICHES = { hunter: ['sigbin', 'sigbinx', 'tiktik'], swarm: ['salagubang', 'neonmite', 'wisp'], flyer: ['wakwak', 'rotor', 'mantis'],
  giant: ['kapre', 'kapremech', 'ugat'], scav: ['punso', 'rustling', 'mirrormole'] };
// a successor that depends on another niche: the scavenger successor feeds on swarm shells while the swarm lives
const SUCC_ALT = { scav: { dep: 'swarm', dead: 'cindershrew' } };
const MATS = { hunterP: 'Sigbin Fang', hunterX: 'Chrome Fang', hunterS: 'Tiktik Plume', swarmP: 'Salagubang Shell', swarmX: 'Mite Core',
  swarmS: 'Wisp Static', flyerP: 'Wakwak Feather', flyerX: 'Drone Rotor', flyerS: 'Mantis Lens',
  giantP: 'Kapre Ember', giantX: 'Piston Heart', giantS: 'Heartwood Core', scavP: 'Punso Clay', scavX: 'Salvaged Wire', scavS: 'Mirror Scale', scavA: 'Cinder Tail',
  tikCore: 'Tikbalang Core' };
const TREES = {
  esk: [
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
  ],
  // Babaylan: staff combo + channelled spirit orb from the start; the Anito branch unlocks the spirit summon
  bab: [
    { id: 'tawag', br: 'anito', req: null, cost: 0 },
    { id: 'call', br: 'anito', req: 'tawag', cost: 1 },
    { id: 'bond', br: 'anito', req: 'call', cost: 1 },
    { id: 'legion', br: 'anito', req: 'bond', cost: 1, mats: { flyerP: 3 } },
    { id: 'avatar', br: 'anito', req: 'legion', cost: 2 },
    { id: 'swiftch', br: 'diwata', req: 'tawag', cost: 1 },
    { id: 'pierce', br: 'diwata', req: 'swiftch', cost: 1 },
    { id: 'bloom', br: 'diwata', req: 'pierce', cost: 1, mats: { swarmP: 4 } },
    { id: 'grace', br: 'diwata', req: 'bloom', cost: 2 },
    { id: 'chant', br: 'rites', req: 'tawag', cost: 1 },
    { id: 'ward', br: 'rites', req: 'chant', cost: 1 },
    { id: 'trance', br: 'rites', req: 'ward', cost: 1, mats: { hunterP: 4 } },
    { id: 'quake', br: 'rites', req: 'trance', cost: 2 },
    { id: 'asc', br: 'asc', req: 'tawag', cost: 2, lvl: 5 }
  ]
};
const BRANCHES = { esk: ['blade', 'spirit', 'body'], bab: ['anito', 'diwata', 'rites'] };
const CLASSES = ['esk', 'bab'];
function tree() { return TREES[S.cls] || TREES.esk; }
// customization (concept section 5): index into these lists, stored per character in the save
const SKINS = ['#f1c9a0', '#d9a273', '#c98c5c', '#9a6440', '#6b4329'];
const HAIR_STYLES = 4;
const HAIR_COLS = ['#14121c', '#4a2a18', '#8a4a22', '#b8bcc8', '#2bd9ff'];
const ACCENTS = ['#ff3d8b', '#3ef0b4', '#ffc65a', '#2bd9ff', '#c7a2ff', '#ff8a3d'];
const LOOK_KEYS = { skin: SKINS.length, hair: HAIR_STYLES, hairCol: HAIR_COLS.length, acc: ACCENTS.length };
function defLook(cls) { return cls === 'bab' ? { skin: 1, hair: 1, hairCol: 0, acc: 4 } : { skin: 2, hair: 0, hairCol: 0, acc: 0 }; }
// gacha (offline, no real money): Tala is earned in game; rates are always shown in the Odds table
const RAR = ['R', 'SR', 'SSR', 'UR'];
const RAR_RATE = { R: 79.4, SR: 18, SSR: 2.4, UR: 0.2 };
const RAR_COL = { R: '#5aa8ff', SR: '#c77dff', SSR: '#ffc65a', UR: '#ff7ad9' };
const RAR_DUST = { R: 5, SR: 20, SSR: 80, UR: 300 };
const GACHA = [
  { id: 'pat_banig', type: 'pat', r: 'R' }, { id: 'pat_stripe', type: 'pat', r: 'R' }, { id: 'wpn_narra', type: 'wpn', r: 'R' },
  { id: 'ttl_runner', type: 'ttl', r: 'R' }, { id: 'ttl_watcher', type: 'ttl', r: 'R' },
  { id: 'pat_sampaguita', type: 'pat', r: 'SR' }, { id: 'wpn_capiz', type: 'wpn', r: 'SR' }, { id: 'aura_firefly', type: 'aura', r: 'SR' }, { id: 'ttl_tide', type: 'ttl', r: 'SR' },
  { id: 'wpn_neon', type: 'wpn', r: 'SSR' }, { id: 'aura_plume', type: 'aura', r: 'SSR' }, { id: 'minokawa', type: 'spirit', r: 'SSR' },
  { id: 'bakunawa', type: 'spirit', r: 'UR' }, { id: 'aura_moon', type: 'aura', r: 'UR' }
];
const PULL_COST = 100, SOFT_PITY = 70, HARD_PITY = 90, SOFT_STEP = 0.06;
const TALA = { kill: 1, giant: 3, chest: 30, boss: 120, gift: 100 };
const COS_SLOTS = ['pat', 'wpn', 'aura', 'ttl'];
const WPN_COL = { wpn_narra: '#a0703c', wpn_capiz: '#f6f0e0', wpn_neon: '#ff3d8b' };
// spirits: the starter Diwata Wisp (id diwata) plus the ghost of each extinct past species (id = past species id)
// plus two summon-only spirits (Minokawa SSR, Bakunawa UR) that belong to the account, not the character
const SUMMON_SPIRITS = ['minokawa', 'bakunawa'];
const SPIRITS = ['diwata', 'sigbin', 'salagubang', 'wakwak', 'kapre', 'punso', 'minokawa', 'bakunawa'];
const SPIRIT_COL = { diwata: '#9dffd9', sigbin: '#c7a2ff', salagubang: '#ffe08a', wakwak: '#8fe3ff', kapre: '#ffb347', punso: '#f2c48a', minokawa: '#ffd37a', bakunawa: '#7ad7ff' };
const SUMMON_MULT = { minokawa: 1.3, bakunawa: 1.6 };
// forge: kampilan +1..+10, each + is +6% melee damage. Success odds are always shown in the UI.
const FORGE = [
  { chance: 100, mats: { hunterP: 2, swarmP: 2 } },
  { chance: 100, mats: { flyerP: 2, scavP: 2 } },
  { chance: 100, mats: { giantP: 1, hunterX: 2 } },
  { chance: 100, mats: { swarmX: 2, flyerX: 2 } },
  { chance: 100, mats: { giantX: 2, scavX: 2 } },
  { chance: 90, mats: { hunterS: 2, swarmP: 3 } },
  { chance: 80, mats: { swarmS: 2, flyerS: 1, scavX: 2 } },
  { chance: 70, mats: { flyerS: 2, giantS: 1, hunterX: 3 } },
  { chance: 60, mats: { hunterS: 3, swarmS: 2, giantS: 2 } },
  { chance: 50, mats: { hunterS: 3, flyerS: 3, giantS: 2, tikCore: 1 } }
];
const FORGE_PCT = 6;
const OY = 40; // rows added above the original slice (sky rooftops, canopy, cave)
const GY = OY + 36; // top row of the ground
const SHRINES = [10, 86, 160];
const FEATHER = { x: 140 * TS, y: (OY + 18) * TS };
const SPAWNS = [
  { n: 'hunter', x: 28, y: OY + 35 }, { n: 'hunter', x: 92, y: OY + 35 }, { n: 'hunter', x: 125, y: OY + 17 }, { n: 'hunter', x: 138, y: OY + 35 },
  { n: 'hunter', x: 60, y: OY + 35, era: PRESENT },
  { n: 'swarm', x: 22, y: OY + 31 }, { n: 'swarm', x: 120, y: OY + 33 }, { n: 'swarm', x: 146, y: OY + 33 }, { n: 'swarm', x: 50, y: 48, era: PRESENT },
  { n: 'flyer', x: 36, y: OY + 26 }, { n: 'flyer', x: 95, y: OY + 24 }, { n: 'flyer', x: 132, y: OY + 12 }, { n: 'flyer', x: 150, y: OY + 28 },
  { n: 'flyer', x: 58, y: OY + 30, era: PRESENT }, { n: 'flyer', x: 124, y: 34 },
  { n: 'giant', x: 128, y: 39 }, { n: 'giant', x: 143, y: OY + 35 }, { n: 'giant', x: 60, y: 51, era: PRESENT },
  { n: 'scav', x: 82, y: OY + 35 }, { n: 'scav', x: 118, y: OY + 17 }, { n: 'scav', x: 90, y: 55, era: PAST }, { n: 'scav', x: 56, y: OY + 35, era: PRESENT }
];
const ARENA = { x0: 168 * TS, x1: 198 * TS, door: 166, trigger: 171 * TS };
// secret chests: x, y = floor row the chest stands on; era = only there in that era
const CHESTS = [
  { id: 'roof', x: 54, y: 37, era: PRESENT, loot: { hunterX: 3, swarmX: 3, flyerX: 2, scavX: 2, giantX: 1 } },
  { id: 'cave', x: 84, y: 56, loot: { hunterP: 3, swarmP: 2, flyerP: 2, giantP: 2, scavP: 3 } }
];
// present-only rooftops (tile 7), zigzag steps: [x, y] with width 4
const ROOF_STEPS = [[41, 73], [36, 70], [41, 67], [36, 64], [41, 61], [36, 58], [41, 55]];
const ROOF_STEPS2 = [[62, 49], [67, 46], [62, 43], [67, 40]];
const CANOPY_STEPS = [[118, 55], [113, 52], [118, 49], [113, 46], [118, 43]];

// ---------- map ----------
const MH = OY + 40;
const map = new Uint8Array(MW * MH);
function setT(x, y, v) { if (x >= 0 && x < MW && y >= 0 && y < MH) map[y * MW + x] = v; }
function fill(x, y, w, h, v) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setT(i, j, v); }
function tileAt(x, y) { if (x < 0 || x >= MW || y >= MH) return 1; if (y < 0) return 0; return map[y * MW + x]; }
// tiles: 1 rock, 2 one-way plank, 3 vine (one-way, past only), 4 walkway (solid, present only), 5 spikes,
// 6 cracked stone, 7 rooftop (one-way, present only), 8 vine curtain (solid concrete seal in the present, open in the past)
function buildMap() {
  map.fill(0);
  fill(0, GY, MW, 4, 1);
  fill(0, 0, 1, MH, 1); fill(MW - 1, 0, 1, MH, 1);
  // A: barangay gate
  fill(18, OY + 32, 5, 1, 2); fill(30, OY + 29, 4, 1, 2);
  // A up: present-only rooftop district (two zigzag climbs, deck, top deck with a secret chest)
  ROOF_STEPS.forEach(([x, y]) => fill(x, y, 4, 1, 7));
  fill(45, 52, 22, 1, 7);
  ROOF_STEPS2.forEach(([x, y]) => fill(x, y, 4, 1, 7));
  fill(50, 37, 17, 1, 7);
  // B: the broken bridge (present-only walkway over a stake pit)
  fill(44, GY, 32, 3, 0); fill(44, GY + 2, 32, 1, 5); fill(44, GY, 32, 1, 4);
  // sky rock above shrine 2 with the hidden Punso den (past-only entrance behind a vine curtain)
  fill(80, 44, 20, 14, 1); fill(82, 47, 16, 9, 0); fill(98, 53, 2, 3, 8);
  fill(86, 50, 4, 1, 2);
  // C: vine steps (past only) up to the ledge, plus one step to the den
  [[105, OY + 33], [100, OY + 30], [105, OY + 27], [100, OY + 24], [105, OY + 21], [100, OY + 18]].forEach(([x, y]) => fill(x, y, 4, 1, 3));
  fill(110, OY + 18, 41, 2, 1);
  // balete canopy above the ledge (branches in the past, scaffolding in the present)
  CANOPY_STEPS.forEach(([x, y]) => fill(x, y, 4, 1, 2));
  fill(112, 40, 25, 1, 2);
  fill(124, 34, 4, 1, 2); fill(130, 31, 5, 1, 2);
  // D: the wall, cracked at the bottom, passable over the top with a double jump
  fill(146, OY + 13, 6, 1, 2);
  fill(154, OY + 10, 2, 26, 1); fill(154, OY + 32, 2, 4, 6);
  // E: arena
  fill(166, OY + 19, 34, 1, 1); fill(166, OY + 20, 2, 10, 1);
}
function isSolid(v) { return v === 1 || v === 6 || ((v === 4 || v === 8) && S.era === PRESENT); }
function isOneWay(v) { return v === 2 || (v === 3 && S.era === PAST) || (v === 7 && S.era === PRESENT); }

// ---------- state ----------
let S, P, enemies = [], projs = [], parts = [], texts = [], items = [], boss = null;
let cam = { x: 0, y: 0 }, shake = 0, hitstop = 0, flash = 0, flashCol = '#fff', mode = 'title', paused = false;
let spawnState = [];
let hintCd = 0, featherTaken = false;
const WIPE = 0.5; let wipeT = 0, wipeCol = '#fff', denReveal = 0;

function freshSave(cls = 'esk') {
  return { v: 1, cls, look: defLook(cls), name: '', hell: false, lvl: 1, xp: 0, sp: 1, nodes: [TREES[cls][0].id], mats: {}, pastKills: { hunter: 0, swarm: 0, flyer: 0, giant: 0, scav: 0 }, dj: false,
    shrine: 0, era: PRESENT, bossMem: { attempts: 0, wins: 0, left: 0, right: 0, air: 0, ground: 0, bolts: 0, melee: 0, maxStage: 1 },
    bossDone: false, deaths: 0, time: 0, lang: null,
    spirits: ['diwata'], spirit: 'diwata', spiritAt: {}, forge: 0, chests: [], ex: '', minimap: false };
}
function load(key = SAVE_KEY) {
  try {
    const r = localStorage.getItem(key);
    if (r) {
      const d = JSON.parse(r);
      if (d && d.v === 1) {
        // saves from before the class choice have no cls: they are Eskrimador saves
        const f = freshSave(TREES[d.cls] ? d.cls : 'esk'), s = Object.assign(f, d);
        if (!TREES[s.cls]) s.cls = 'esk';
        s.look = Object.assign(defLook(s.cls), d.look);
        s.pastKills = Object.assign(freshSave().pastKills, d.pastKills);
        // older saves: extinct niches whose spirit was never offered wait at the middle shrine
        for (const n of NICHE_IDS) { const id = NICHES[n][0]; if (s.pastKills[n] >= THRESH && !s.spirits.includes(id) && s.spiritAt[id] === undefined) s.spiritAt[id] = 1; }
        return s;
      }
    }
  } catch (e) {}
  return null;
}
// explored map: cells of EXC x EXC tiles, stored in the save as a '0'/'1' string
const EXC = 4, EXW = Math.ceil(MW / EXC), EXH = Math.ceil(MH / EXC);
const explored = new Uint8Array(EXW * EXH);
let exDirty = true, exCell = -1;
function loadExplored() { explored.fill(0); const s = S.ex || ''; for (let i = 0; i < explored.length && i < s.length; i++) explored[i] = s.charCodeAt(i) === 49 ? 1 : 0; exDirty = true; exCell = -1; }
// minimap: one pixel per tile for explored cells, redrawn only when something new is explored or the era changes
const mmCanvas = document.createElement('canvas'); mmCanvas.width = MW; mmCanvas.height = MH;
const mmCtx = mmCanvas.getContext('2d'), mmImg = mmCtx.createImageData(MW, MH), mmPix = new Uint32Array(mmImg.data.buffer);
function rgba(r, g, b, a) { return (a << 24) | (b << 16) | (g << 8) | r; }
const MM_COL = { air: rgba(26, 34, 54, 200), solidP: rgba(90, 140, 90, 255), solidX: rgba(120, 100, 170, 255), plat: rgba(236, 230, 214, 255), shrine: rgba(62, 240, 180, 255), chest: rgba(255, 198, 90, 255) };
function redrawMinimap() {
  exDirty = false;
  const solid = S.era === PAST ? MM_COL.solidP : MM_COL.solidX;
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = y * MW + x;
    if (!explored[Math.floor(y / EXC) * EXW + Math.floor(x / EXC)]) { mmPix[i] = 0; continue; }
    const v = map[i];
    mmPix[i] = isSolid(v) ? solid : isOneWay(v) ? MM_COL.plat : MM_COL.air;
  }
  const mark = (x, y, c) => { for (let j = -1; j <= 0; j++) for (let k = 0; k <= 1; k++) { const xx = x + k, yy = y + j; if (xx >= 0 && yy >= 0 && xx < MW && yy < MH && explored[Math.floor(yy / EXC) * EXW + Math.floor(xx / EXC)]) mmPix[yy * MW + xx] = c; } };
  SHRINES.forEach(sx => mark(sx, GY - 1, MM_COL.shrine));
  CHESTS.forEach(c => { if (!S.chests.includes(c.id) && (c.era === undefined || c.era === S.era)) mark(c.x, c.y - 1, MM_COL.chest); });
  mmCtx.putImageData(mmImg, 0, 0);
}
function exploredPct() { let n = 0; for (let i = 0; i < explored.length; i++) n += explored[i]; return Math.round(n / explored.length * 100); }
function save() {
  try { S.ex = explored.join(''); localStorage.setItem(S.hell ? HELL_KEY : SAVE_KEY, JSON.stringify(S)); } catch (e) {}
  if (!S.hell && !ACC.hellOk && (S.bossDone || S.lvl >= 10)) { ACC.hellOk = true; saveAcc(); }
}
// account: shared by the normal and the hell character, never lost on permadeath
function freshAcc() { return { v: 1, tala: 0, dust: 0, pity: 0, pulls: 0, cos: {}, spirits: [], equip: {}, gift: '', fallen: [], hellOk: false, last: [] }; }
function loadAcc() {
  try { const d = JSON.parse(localStorage.getItem(ACC_KEY) || 'null'); if (d && d.v === 1) return Object.assign(freshAcc(), d); } catch (e) {}
  return freshAcc();
}
let ACC = loadAcc();
function saveAcc() { try { localStorage.setItem(ACC_KEY, JSON.stringify(ACC)); } catch (e) {} }
function addTala(n) { ACC.tala += n; saveAcc(); }
function ownsSpirit(id) { return S.spirits.includes(id) || ACC.spirits.includes(id); }
function hellUnlocked() { if (ACC.hellOk) return true; const n = load(SAVE_KEY); return !!(n && (n.bossDone || n.lvl >= 10)); }
function hm() { return S && S.hell ? HELL_MUL : 1; }
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
  KeyX: 'jump', KeyK: 'jump', Space: 'jump', KeyZ: 'attack', KeyJ: 'attack', KeyC: 'dash', KeyL: 'dash', ShiftLeft: 'dash', KeyV: 'skill', KeyI: 'skill', KeyB: 'summon', KeyU: 'summon' };
function press(k) { if (!held[k]) pressed[k] = true; held[k] = true; }
function release(k) { held[k] = false; }
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Tab') { e.preventDefault(); if (mode === 'play') toggleMenu(); return; }
  const k = KEYMAP[e.code]; if (k) { e.preventDefault(); press(k); }
  if (mode === 'title' && document.getElementById('pick').hidden && (e.code === 'Enter' || e.code === 'Space')) titleContinue();
});
addEventListener('keyup', e => {
  if (e.target && e.target.tagName === 'INPUT') return; const k = KEYMAP[e.code]; if (k) release(k); });

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
    safe: { x, y }, hurtT: 0, anim: 0, shieldCd: 0, biteCd: 0, dartCd: 1, stompCd: 3, featherCd: 2, chan: -1, sumCd: 0 };
}
function forgeMult(lv) { return 1 + FORGE_PCT / 100 * lv; }
function stats() {
  const asc = has('asc') ? 1.1 : 1, sp = S.spirit, bab = S.cls === 'bab', bk = sp === 'bakunawa' ? 1.15 : 1;
  return {
    spd: (has('swift') ? 1.15 : 1) * (sp === 'minokawa' ? 1.1 : 1) * asc,
    maxCombo: has('fourth') ? 4 : 3,
    // the Babaylan staff is weaker than the Eskrimador blades
    dmg: (bab ? 9 : 12) * (has('edge') ? 1.2 : 1) * asc * bk * forgeMult(S.forge),
    magic: asc * bk,
    maxhp: (100 + (has('roots') || has('chant') ? 25 : 0) + (sp === 'kapre' ? 30 : 0)) * asc,
    maxen: (bab ? 60 : 50) + (has('well') ? 25 : 0) + (has('grace') ? 30 : 0),
    regen: (has('well') || has('grace') ? 9 : 5) + (sp === 'wakwak' ? 3 : 0),
    crit: sp === 'sigbin' ? 0.18 : 0.04,
    magnet: sp === 'punso' ? 190 : 70,
    dashInv: has('step') || has('trance') ? 0.28 : 0.16,
    dashCd: has('step') || has('trance') ? 0.32 : 0.5,
    airdash: has('airdash') || has('trance'),
    breaker: has('breaker') || has('quake'),
    taken: (has('iron') || has('ward') ? 0.85 : 1) / asc
  };
}
function hurtPlayer(dmg, fromX) {
  if (P.inv > 0 || mode !== 'play') return;
  if (S.spirit === 'salagubang' && P.shieldCd <= 0) {
    P.shieldCd = 12; P.inv = 0.5;
    popText(P.x + P.w / 2, P.y - 4, t('block'), '#ffe08a'); burst(P.x + P.w / 2, P.y + P.h / 2, 14, '#ffe08a', 160, 0.4);
    sfx(1200, 0.12, 'triangle', 0.05, -500);
    return;
  }
  const st = stats();
  const d = Math.round(dmg * hm() * st.taken);
  P.hp -= d; P.inv = 0.7; P.hurtT = 0.25;
  P.vx = (P.x + P.w / 2 < fromX ? -1 : 1) * 160; P.vy = -160;
  shake = Math.max(shake, 5); hitstop = 0.06; sfx(140, 0.15, 'sawtooth', 0.06, -60);
  popText(P.x + P.w / 2, P.y - 4, '-' + d, '#ff6b8a');
  burst(P.x + P.w / 2, P.y + P.h / 2, 8, '#ff3d8b');
  if (P.hp <= 0) die();
}
function die() {
  S.deaths++;
  if (S.hell) { P.hp = 0; mode = 'fallen'; return; } // one life: handled by endHell() once this frame is done
  if (boss && boss.active) endBossFight(false);
  toast(t('died'));
  const sx = SHRINES[S.shrine] * TS;
  P = newPlayer(sx, (OY + 34) * TS - 26 + 16);
  const st = stats(); P.maxhp = P.hp = st.maxhp; P.maxen = P.en = st.maxen;
  P.inv = 1.2; flash = 0.5; flashCol = '#ff3d8b';
  enemies = []; projs = []; resetSpawns();
  save();
}

// ---------- enemies ----------
function succOf(niche) {
  const alt = SUCC_ALT[niche];
  return alt && popPct(alt.dep) <= 0 ? alt.dead : NICHES[niche][2];
}
function speciesFor(niche) {
  const [past, pres] = NICHES[niche], succ = succOf(niche), p = popPct(niche);
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
      hp: d.hp * hm(), max: d.hp * hm(), face: -1, onGround: false, st: 'walk', t: rnd(0, 1), home: { x: sp.x * TS, y: sp.y * TS - 40 }, src: sp, era: S.era, flashT: 0, kb: 0, ph: rnd(0, 6),
      loot: null, target: null };
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
  } else if (d.beh === 'giant') {
    updateGiant(e, dt, dx, dy);
  } else if (d.beh === 'thief') {
    updateThief(e, dt, dx, dy);
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
  if ((d.beh !== 'thief' || e.st === 'nip') && overlap(e, P) && P.dashT <= 0) hurtPlayer(d.dmg, ex);
}
function groundAhead(e) {
  const ahead = Math.floor((e.face > 0 ? e.x + e.w + 2 : e.x - 2) / TS), below = Math.floor((e.y + e.h + 2) / TS), v = tileAt(ahead, below);
  return isSolid(v) || isOneWay(v);
}
// giant: slow walk toward the player, telegraphed wind-up (arms raised), ground pound that sends shockwaves along the floor
function updateGiant(e, dt, dx, dy) {
  const d = e.d;
  e.vy = Math.min(600, e.vy + 900 * dt);
  if (e.st === 'walk') {
    const chase = Math.abs(dx) < 240 && Math.abs(dy) < 70;
    if (chase && e.kb <= 0) e.face = Math.sign(dx) || e.face;
    e.vx = e.kb > 0 ? e.vx : e.face * d.spd * (chase ? 1 : 0.6);
    if (Math.abs(dx) < 66 && Math.abs(dy) < 50 && e.t > 1.1) { e.st = 'wind'; e.t = 0; e.vx = 0; sfx(90, 0.3, 'sawtooth', 0.04, 40); }
  } else if (e.st === 'wind') {
    e.vx = 0;
    if (e.t > 0.7) {
      e.st = 'rest'; e.t = 0; shake = Math.max(shake, 6); sfx(55, 0.35, 'sawtooth', 0.07, -20);
      const cx = e.x + e.w / 2, fy = e.y + e.h;
      for (let i = 0; i < d.quake; i++) for (const s of [-1, 1])
        projs.push({ from: 'enemy', x: cx - 6, y: fy - 10, w: 12, h: 10, vx: s * (190 - i * 60), vy: 0, dmg: Math.round(d.dmg * 0.8), type: 'wave', life: 1.1, hit: null });
      burst(cx, fy, 16, e.sp === 'kapremech' ? '#ff3d8b' : '#a88b5a', 170, 0.5);
    }
  } else if (e.st === 'rest') { e.vx = 0; if (e.t > 0.9) { e.st = 'walk'; e.t = 0; } }
  if (e.sp !== 'kapremech' && Math.random() < dt * 3) parts.push({ x: e.x + e.w / 2 + e.face * 14, y: e.y + 8, vx: rnd(-6, 6), vy: -18, life: 1.1, max: 1.1, col: e.sp === 'ugat' ? 'rgba(62,240,180,.6)' : 'rgba(200,200,200,.45)', size: 2, grav: -10 });
  else if (e.sp === 'kapremech' && Math.random() < dt * 4) parts.push({ x: e.x + e.w / 2 - e.face * 8, y: e.y + 2, vx: rnd(-6, 6), vy: -26, life: 0.8, max: 0.8, col: 'rgba(255,61,139,.5)', size: 2, grav: -10 });
  const hitWall = moveX(e, e.vx * dt);
  moveY(e, e.vy * dt);
  if (e.onGround && e.st === 'walk' && (hitWall || !groundAhead(e))) { e.face *= -1; e.vx = 0; }
}
// scavenger: runs to dropped materials and steals them, nips the player, then flees; escapes with the loot if it gets far enough away
function updateThief(e, dt, dx, dy) {
  const d = e.d;
  e.vy = Math.min(600, e.vy + 900 * dt);
  if (e.kb <= 0) {
    if (e.st === 'walk') {
      e.vx = e.face * d.spd * 0.35;
      let best = null, bd = 1e9;
      if (!e.loot || e.loot.length < 3) for (const it of items) {
        if (it.got) continue;
        const ix = it.x + 4 - (e.x + e.w / 2), iy = it.y + 4 - (e.y + e.h / 2);
        if (Math.abs(ix) < 210 && Math.abs(iy) < 50 && Math.abs(ix) < bd) { bd = Math.abs(ix); best = it; }
      }
      if (best) { e.target = best; e.st = 'grab'; e.t = 0; }
      else if (Math.abs(dx) < 110 && Math.abs(dy) < 30 && e.t > 1.2) { e.st = 'nip'; e.t = 0; e.face = Math.sign(dx) || 1; sfx(700, 0.05, 'square', 0.025, 200); }
    } else if (e.st === 'grab') {
      const it = e.target;
      if (!it || it.got || e.t > 4) { e.st = 'walk'; e.t = 0; e.target = null; }
      else {
        e.face = it.x + 4 > e.x + e.w / 2 ? 1 : -1; e.vx = e.face * d.spd;
        if (overlap(e, it)) {
          it.got = true; (e.loot || (e.loot = [])).push(it.mat); e.target = null;
          popText(e.x + e.w / 2, e.y - 8, t('stolen'), '#ff6b8a'); sfx(1300, 0.06, 'square', 0.03, -600);
          e.st = 'flee'; e.t = 0;
        }
      }
    } else if (e.st === 'nip') {
      e.vx = e.face * d.spd * 1.5;
      if (e.t > 0.4) { e.st = 'flee'; e.t = 0; }
    } else if (e.st === 'flee') {
      e.face = dx > 0 ? -1 : 1; e.vx = e.face * d.spd * 1.15;
      if (e.t > 2.4) { e.st = 'walk'; e.t = 0; }
    }
  }
  const hitWall = moveX(e, e.vx * dt);
  moveY(e, e.vy * dt);
  if (e.onGround && e.kb <= 0) {
    if (hitWall) { if (e.st === 'flee') e.vy = -300; else e.face *= -1; }
    else if (!groundAhead(e)) { if (e.st === 'flee') e.vy = -260; else if (e.st !== 'grab') e.face *= -1; }
  }
  if (e.loot && e.loot.length && e.st === 'flee' && Math.abs(dx) > 380) {
    e.dead = true; e.escaped = true;
    if (e.src) { e.src.alive = Math.max(0, e.src.alive - 1); if (e.src.alive === 0) e.src.cd = 12; }
    toast(t('escaped', e.loot.length));
  }
}
function damageEnemy(e, dmg, kx, isBolt, crit) {
  e.hp -= dmg; e.flashT = 0.1;
  if (e.d.beh === 'giant') { e.kb = 0.06; if (e.st === 'walk') e.vx = kx * 30; }
  else { e.kb = 0.18; e.vx = kx * 170; if (e.d.beh !== 'swarm' && e.d.beh !== 'flyer' && e.d.beh !== 'diver') e.vy = -120; else e.vy = -40; }
  if (e.st === 'charge' || e.st === 'dive' || e.st === 'grab') { e.st = e.d.beh === 'thief' ? 'flee' : 'walk'; e.t = 0; }
  popText(e.x + e.w / 2, e.y - 2, Math.round(dmg) + (crit ? '!' : ''), crit ? '#ff8a3d' : isBolt ? '#3ef0b4' : '#ffc65a');
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
  if (S.spirit === 'bakunawa') P.en = Math.min(P.maxen, P.en + 6);
  addTala(d.beh === 'giant' ? TALA.giant : TALA.kill);
  // drop (the Taga-Punso spirit finds more), plus anything a scavenger stole
  const dropX = e.x + e.w / 2 - 4, extra = S.spirit === 'punso';
  if (Math.random() < Math.min(1, (d.group ? 0.45 : 0.85) * (extra ? 1.25 : 1))) dropItem(dropX, e.y, d.mat);
  if (extra && Math.random() < 0.25) dropItem(dropX + 6, e.y, d.mat);
  if (e.loot) e.loot.forEach((m, i) => dropItem(dropX + (i - 1) * 8, e.y, m));
  gainXp(d.xp);
  // ecosystem
  if (e.era === PAST && NICHES[d.niche][0] === e.sp) {
    const before = popPct(d.niche);
    S.pastKills[d.niche] = Math.min(THRESH, S.pastKills[d.niche] + 1);
    const after = popPct(d.niche);
    if (before > 0 && after <= 0) {
      // the ghost of the extinct species waits at the next Anito shrine ahead of the player
      let si = SHRINES.findIndex(sx => sx * TS > P.x + P.w); if (si < 0) si = SHRINES.length - 1;
      if (!S.spirits.includes(e.sp)) S.spiritAt[e.sp] = si;
      toast(t('extinctToast', spName(e.sp), spName(succOf(d.niche))) + (S.spirits.includes(e.sp) ? '' : ' ' + t('spiritAppear', spiritName(e.sp))), 5);
      flash = 0.4; flashCol = '#ff3d8b'; shake = 8; sfx(90, 0.6, 'sawtooth', 0.07, -40);
      enemies.forEach(o => { if (o.sp === e.sp && !o.dead) { o.dead = true; burst(o.x, o.y, 12, '#ff3d8b'); } });
      spawnState.forEach(s => { if (s.n === d.niche) s.alive = 0; });
    } else if (before > 0.5 && after <= 0.5) {
      toast(spName(e.sp) + ' · ' + t('population') + ' ' + Math.round(after * 100) + '%');
    }
  }
  save();
}
function dropItem(x, y, mat) { items.push({ x, y, w: 8, h: 8, vy: -120, mat, t: 0, got: false }); }
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
function bossBaseStage() { const s = Math.min(3, 1 + Math.floor(S.bossMem.attempts / 2)); return S.hell ? Math.max(3, s) : s; }
function startBossFight() {
  fill(ARENA.door, OY + 30, 2, 6, 1);
  const base = bossBaseStage();
  boss = { active: true, x: 188 * TS, y: GY * TS - 64, w: 36, h: 64, vx: 0, vy: 0, hp: 520 * hm(), max: 520 * hm(), face: -1, onGround: false,
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
  fill(ARENA.door, OY + 30, 2, 6, 0);
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
    addTala(TALA.boss); popText(b.x + b.w / 2, b.y - 16, t('talaGot', TALA.boss), '#ffd37a', true);
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
  const w = S.cls === 'bab' ? (P.finisher ? 34 : 26) : P.finisher ? 40 : 30;
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
    const max = P.chan >= 0 ? 70 : 140, acc = P.onGround ? 1400 : 900;
    if (dir) { P.vx += dir * acc * dt; if (Math.abs(P.vx) > max) P.vx = Math.sign(P.vx) * max; if (P.atkT <= 0) P.face = dir; }
    else { const fr = P.onGround ? 1600 : 500; P.vx = Math.abs(P.vx) <= fr * dt ? 0 : P.vx - Math.sign(P.vx) * fr * dt; }
    P.vy = Math.min(620, P.vy + 980 * dt);
    if (!held.jump && P.vy < -120) P.vy += 1400 * dt; // short hop
    if (P.jbuf > 0) {
      if (P.coyote > 0) { P.vy = -340; P.jbuf = 0; P.coyote = 0; P.jumps = 1; sfx(380, 0.08, 'square', 0.03, 200); burst(P.x + P.w / 2, P.y + P.h, 5, '#ece6d6', 60, 0.3); }
      else if (S.dj && P.jumps < 2) { P.vy = -320; P.jbuf = 0; P.jumps = 2; sfx(560, 0.1, 'triangle', 0.04, 300); burst(P.x + P.w / 2, P.y + P.h, 10, '#ff8a3d', 100, 0.4); }
    }
  }
  if (pressed.dash && P.dashCd <= 0 && (P.onGround || (st.airdash && !P.airDashed))) {
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
      const mult = P.finisher ? (st.breaker ? 2.08 : 1.6) : 1;
      for (const e of enemies) if (!e.dead && !P.hitIds.has(e.id) && overlap(hb, e)) {
        P.hitIds.add(e.id);
        const crit = Math.random() < st.crit;
        damageEnemy(e, st.dmg * mult * rnd(0.92, 1.08) * (crit ? 1.75 : 1), P.face, false, crit);
        // Sigbin spirit: every few seconds a hit is followed by a spectral bite
        if (S.spirit === 'sigbin' && P.biteCd <= 0 && !e.dead) { P.biteCd = 3.5; damageEnemy(e, st.dmg * 0.6, P.face, false, false); burst(e.x + e.w / 2, e.y + e.h / 2, 10, SPIRIT_COL.sigbin, 150, 0.4); sfx(480, 0.08, 'sawtooth', 0.04, -200); }
        hitstop = P.finisher ? 0.08 : 0.045; shake = Math.max(shake, P.finisher ? 5 : 2);
      }
      if (boss && !P.hitIds.has('boss') && overlap(hb, boss)) { P.hitIds.add('boss'); damageBoss(st.dmg * mult * rnd(0.92, 1.08), false); hitstop = P.finisher ? 0.08 : 0.045; shake = Math.max(shake, 3); }
      if (P.finisher && st.breaker && !P.hitIds.has('wall')) {
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
  // skill: Eskrimador spirit bolt, Babaylan channelled spirit orb (hold to grow it, release to cast)
  if (S.cls === 'bab') {
    if (pressed.skill && P.chan < 0 && P.en >= ORB_COST) { P.chan = 0; P.en -= ORB_COST; sfx(330, 0.2, 'sine', 0.04, 200); }
    if (P.chan >= 0) {
      if (held.skill) { P.chan = Math.min(1, P.chan + dt * (has('swiftch') ? 1.8 : 1.1)); if (Math.random() < 0.5) parts.push({ x: P.x + P.w / 2 + P.face * 10 + rnd(-10, 10), y: P.y + 10 + rnd(-10, 10), vx: 0, vy: 0, life: 0.25, max: 0.25, col: '#c7a2ff', size: 2, grav: 0 }); }
      else fireOrb(st);
    }
    if (pressed.summon) summonStrike(st);
  } else if (pressed.skill && has('bolt') && P.en >= 15) {
    P.en -= 15;
    const echo = has('echo');
    projs.push({ from: 'player', x: P.x + P.w / 2 - 6 + P.face * 8, y: P.y + 8, w: 12, h: 8, vx: P.face * 330, vy: 0, dmg: 18 * (echo ? 1.25 : 1) * st.magic, type: 'bolt', life: 0.9, pierce: echo, hit: new Set() });
    sfx(880, 0.12, 'sine', 0.05, -400);
  }
  if (P.sumCd > 0) P.sumCd -= dt;
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

// ---------- Babaylan: spirit orb + spirit summon ----------
const ORB_COST = 12, SUMMON_COST = 20;
function fireOrb(st) {
  const c = P.chan, sz = Math.round(8 + 8 * c);
  P.chan = -1;
  projs.push({ from: 'player', x: P.x + P.w / 2 - sz / 2 + P.face * 10, y: P.y + 12 - sz / 2, w: sz, h: sz, vx: P.face * 270, vy: 0, dmg: (14 + 24 * c) * st.magic,
    type: 'orb', charge: c, life: 1.1, pierce: has('pierce'), bloom: has('bloom'), hit: new Set() });
  sfx(520 + c * 300, 0.18, 'sine', 0.05, -250);
}
// the active spirit strikes the nearest foes (up to 3 with Ancestor Legion)
function summonStrike(st) {
  if (!has('call') || P.sumCd > 0 || P.en < SUMMON_COST || !S.spirit) return false;
  const cx = P.x + P.w / 2, cy = P.y + P.h / 2, tg = [];
  for (const e of enemies) if (!e.dead) { const d = Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy); if (d < 240) tg.push({ e, d }); }
  if (boss && boss.st !== 'dead' && boss.alpha > 0.5) { const d = Math.hypot(boss.x + boss.w / 2 - cx, boss.y + boss.h / 2 - cy); if (d < 240) tg.push({ e: boss, d }); }
  if (!tg.length) { popText(cx, P.y - 6, t('noTarget'), '#9aa3c0'); return false; }
  tg.sort((a, b) => a.d - b.d);
  P.en -= SUMMON_COST; P.sumCd = has('bond') ? 2.5 : 4;
  const dmg = 26 * (has('bond') ? 1.3 : 1) * (SUMMON_MULT[S.spirit] || 1) * st.magic;
  tg.slice(0, has('legion') ? 3 : 1).forEach((o, i) => {
    projs.push({ from: 'player', x: SPR.x - 8, y: SPR.y - 8, w: 16, h: 16, vx: (i - 1) * 120, vy: -160, dmg, type: 'spirit', sid: S.spirit, tgt: o.e, life: 1.6, pierce: false, hit: new Set() });
  });
  burst(SPR.x, SPR.y, 16, SPIRIT_COL[S.spirit], 140, 0.5, 2, 0); sfx(700, 0.25, 'triangle', 0.05, 500);
  return true;
}

function projHit(p, e) {
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  if (p.type === 'spirit') {
    burst(cx, cy, 14, SPIRIT_COL[p.sid], 170, 0.45);
    if (has('avatar')) P.hp = Math.min(P.maxhp, P.hp + 6);
  } else if (p.type === 'orb' && p.bloom) {
    // Diwata Bloom: the orb bursts and hurts every foe close to the impact
    burst(cx, cy, 18, '#c7a2ff', 160, 0.5);
    for (const o of enemies) if (o !== e && !o.dead && Math.hypot(o.x + o.w / 2 - cx, o.y + o.h / 2 - cy) < 46) damageEnemy(o, p.dmg * 0.5, Math.sign(o.x - cx) || 1, true);
  }
}

// ---------- world update ----------
let nearShrine = -1;
const timeBtn = document.getElementById('b-time');
function switchEra() {
  S.era = S.era === PAST ? PRESENT : PAST;
  S.shrine = nearShrine;
  enemies = []; projs = projs.filter(p => p.from === 'player'); resetSpawns();
  // never leave the player inside a solid tile
  for (let i = 0; i < 4 && (isSolid(tileAt(Math.floor((P.x + 2) / TS), Math.floor((P.y + P.h - 2) / TS))) || isSolid(tileAt(Math.floor((P.x + P.w - 2) / TS), Math.floor((P.y + P.h - 2) / TS)))); i++) P.y -= TS;
  flash = 0.7; flashCol = S.era === PAST ? '#3ef0b4' : '#ff3d8b'; shake = 6;
  sfx(S.era === PAST ? 300 : 600, 0.5, 'sine', 0.06, S.era === PAST ? -150 : 300);
  burst(P.x + P.w / 2, P.y + P.h / 2, 40, flashCol, 260, 0.9, 2, 0);
  toast(S.era === PAST ? t('past') + ' · ' + t('yearPast') : t('present') + ' · ' + t('yearPresent'), 1.6);
  wipeT = WIPE; wipeCol = flashCol; exDirty = true;
  save();
}
// ---------- spirits ----------
const SPR = { x: 0, y: 0 };
function spiritSpot(si) { return { x: SHRINES[si] * TS + 34, y: GY * TS - 34 }; }
function equipSpirit(id) {
  if (!ownsSpirit(id)) return false;
  S.spirit = id; P.shieldCd = 0; P.biteCd = 0;
  const st = stats(); P.maxhp = st.maxhp; P.hp = Math.min(P.hp, P.maxhp);
  save(); return true;
}
function captureSpirit(id) {
  delete S.spiritAt[id];
  if (!S.spirits.includes(id)) S.spirits.push(id);
  toast(t('spiritGot', spiritName(id)), 3.5); flash = 0.4; flashCol = SPIRIT_COL[id];
  burst(P.x + P.w / 2, P.y + P.h / 2, 30, SPIRIT_COL[id], 200, 0.9, 2, 0); sfx(784, 0.3, 'sine', 0.06, 400);
  equipSpirit(id);
}
function updateSpirit(dt) {
  for (const id in S.spiritAt) {
    const p = spiritSpot(S.spiritAt[id]);
    if (Math.abs(P.x + P.w / 2 - p.x) < 14 && Math.abs(P.y + P.h / 2 - p.y) < 28) captureSpirit(id);
  }
  const sp = S.spirit; if (!sp) return;
  const tx = P.x + P.w / 2 - P.face * 18, ty = P.y - 4 + Math.sin(S.time * 3) * 3;
  if (Math.abs(SPR.x - tx) > 300 || Math.abs(SPR.y - ty) > 300) { SPR.x = tx; SPR.y = ty; }
  SPR.x += (tx - SPR.x) * Math.min(1, dt * 5); SPR.y += (ty - SPR.y) * Math.min(1, dt * 5);
  if (P.shieldCd > 0) P.shieldCd -= dt;
  if (P.biteCd > 0) P.biteCd -= dt;
  if (sp === 'diwata') P.hp = Math.min(P.maxhp, P.hp + 1.2 * dt);
  else if (sp === 'wakwak') {
    P.dartCd -= dt;
    if (P.dartCd <= 0) {
      let best = null, bd = 150 * 150;
      for (const e of enemies) if (!e.dead && (e.d.beh === 'flyer' || e.d.beh === 'diver')) { const ddx = e.x + e.w / 2 - SPR.x, ddy = e.y + e.h / 2 - SPR.y, d2 = ddx * ddx + ddy * ddy; if (d2 < bd) { bd = d2; best = e; } }
      if (best) {
        const ddx = best.x + best.w / 2 - SPR.x, ddy = best.y + best.h / 2 - SPR.y, m = Math.hypot(ddx, ddy) || 1;
        projs.push({ from: 'player', x: SPR.x - 3, y: SPR.y - 3, w: 6, h: 6, vx: ddx / m * 300, vy: ddy / m * 300, dmg: 14, type: 'dart', life: 0.8, pierce: false, hit: new Set() });
        sfx(1100, 0.05, 'triangle', 0.03, -400); P.dartCd = 1.3;
      } else P.dartCd = 0.2;
    }
  } else if (sp === 'minokawa') {
    // feather volley: three feathers at the nearest foe every 6 s
    P.featherCd -= dt;
    if (P.featherCd <= 0) {
      let best = null, bd = 170 * 170;
      for (const e of enemies) if (!e.dead) { const ddx = e.x + e.w / 2 - SPR.x, ddy = e.y + e.h / 2 - SPR.y, d2 = ddx * ddx + ddy * ddy; if (d2 < bd) { bd = d2; best = e; } }
      if (best) {
        for (let i = -1; i <= 1; i++) projs.push({ from: 'player', x: SPR.x - 3, y: SPR.y - 3 + i * 6, w: 6, h: 6, vx: 0, vy: i * 60, dmg: 10, type: 'feather', tgt: best, life: 1, pierce: false, hit: new Set() });
        sfx(1300, 0.08, 'triangle', 0.03, -500); P.featherCd = 6;
      } else P.featherCd = 0.25;
    }
  } else if (sp === 'kapre') {
    P.stompCd -= dt;
    if (P.stompCd <= 0) {
      let any = false;
      for (const e of enemies) if (!e.dead && e.d.beh !== 'flyer' && e.d.beh !== 'diver' && Math.abs(e.x + e.w / 2 - P.x - P.w / 2) < 70 && Math.abs(e.y + e.h - P.y - P.h) < 30) { any = true; damageEnemy(e, 16, Math.sign(e.x - P.x) || 1, false, false); }
      if (any) { P.stompCd = 8; shake = Math.max(shake, 4); burst(P.x + P.w / 2, P.y + P.h, 18, SPIRIT_COL.kapre, 160, 0.5); sfx(70, 0.3, 'sawtooth', 0.06, -20); }
      else P.stompCd = 0.25;
    }
  }
}
// ---------- chests, explored map ----------
function updateChests() {
  for (const c of CHESTS) {
    if (S.chests.includes(c.id) || (c.era !== undefined && c.era !== S.era)) continue;
    if (Math.abs(P.x + P.w / 2 - (c.x * TS + 8)) < 14 && Math.abs(P.y + P.h - c.y * TS) < 10) {
      S.chests.push(c.id);
      const got = [];
      for (const m in c.loot) { S.mats[m] = (S.mats[m] || 0) + c.loot[m]; got.push(c.loot[m] + 'x ' + matName(m)); }
      addTala(TALA.chest); got.push(TALA.chest + ' Tala');
      toast(t('chestOpen', got.join(', ')), 4.5); flash = 0.3; flashCol = '#ffc65a';
      burst(c.x * TS + 8, c.y * TS - 8, 30, '#ffc65a', 180, 0.8); sfx(880, 0.15, 'triangle', 0.06, 300); setTimeout(() => sfx(1320, 0.2, 'triangle', 0.05), 120);
      gainXp(20); exDirty = true; save();
    }
  }
}
function markExplored() {
  const cx = Math.floor((P.x + P.w / 2) / TS / EXC), cy = Math.floor((P.y + P.h / 2) / TS / EXC), c = cy * EXW + cx;
  if (c === exCell) return;
  exCell = c;
  for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 3; x <= cx + 3; x++) if (x >= 0 && y >= 0 && x < EXW && y < EXH && !explored[y * EXW + x]) { explored[y * EXW + x] = 1; exDirty = true; }
}
function update(dt) {
  if (!S || !P) return;
  if (mode === 'fallen') { endHell(); return; }
  if (cutT > 0) { cutT -= dt; for (const k in pressed) pressed[k] = false; return; } // ascension cut-in freezes the action
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
  updateSpirit(dt);
  updateChests();
  markExplored();
  if (wipeT > 0) wipeT -= dt;
  // shrines
  nearShrine = -1;
  SHRINES.forEach((sx, i) => { if (Math.abs(P.x + P.w / 2 - (sx * TS + 8)) < 22 && P.y > (OY + 30) * TS) nearShrine = i; });
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
    if (!stats().breaker && P.x > 149 * TS && P.x < 154 * TS && P.y > (OY + 30) * TS) { toast(t(S.cls === 'bab' ? 'crackedBab' : 'cracked'), 3); hintCd = 8; }
    else if (S.era === PAST && P.x > 38 * TS && P.x < 44 * TS && P.y > (OY + 30) * TS) { toast(t('noCross'), 3); hintCd = 8; }
    else if (S.era === PRESENT && P.x > 96 * TS && P.x < 104 * TS && P.y > (OY + 30) * TS) { toast(t('sealed'), 3.5); hintCd = 12; }
  }
  // boss arena
  if (!boss && !S.bossDone && P.x > ARENA.trigger && P.y > (OY + 20) * TS) startBossFight();
  if (boss) updateBoss(dt);
  else updateSpawns(dt);
  for (const e of enemies) if (!e.dead) updateEnemy(e, dt);
  enemies = enemies.filter(e => !e.dead && e.y < MH * TS + 50);
  // projectiles
  for (const p of projs) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.type === 'leaf') p.vy += Math.sin(p.life * 10) * 40 * dt;
    if (p.tgt && !p.tgt.dead && p.tgt.st !== 'dead') {
      const g = p.tgt, ddx = g.x + g.w / 2 - p.x - p.w / 2, ddy = g.y + g.h / 2 - p.y - p.h / 2, m = Math.hypot(ddx, ddy) || 1, k = Math.min(1, dt * 7);
      p.vx += (ddx / m * 380 - p.vx) * k; p.vy += (ddy / m * 380 - p.vy) * k;
    }
    if (p.from === 'player') {
      const col = p.type === 'orb' ? '#c7a2ff' : p.type === 'spirit' ? SPIRIT_COL[p.sid] : '#3ef0b4';
      parts.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, vx: 0, vy: 0, life: 0.18, max: 0.18, col, size: 3, grav: 0 });
      for (const e of enemies) if (!e.dead && !p.hit.has(e.id) && overlap(p, e)) { p.hit.add(e.id); damageEnemy(e, p.dmg, Math.sign(p.vx) || 1, true); projHit(p, e); if (!p.pierce) p.life = 0; }
      if (boss && !p.hit.has('boss') && overlap(p, boss) && boss.alpha > 0.5) { p.hit.add('boss'); damageBoss(p.dmg, true); projHit(p, boss); if (!p.pierce) p.life = 0; }
    } else if (overlap(p, P) && P.dashT <= 0) { hurtPlayer(p.dmg, p.x); if (p.type === 'leaf') p.life = 0; }
    if (p.type === 'wave') { const v = tileAt(Math.floor((p.x + p.w / 2) / TS), Math.floor((p.y + p.h + 2) / TS)); if (!isSolid(v) && !isOneWay(v)) p.life = 0; }
    else if (p.type !== 'spirit' && isSolid(tileAt(Math.floor((p.x + p.w / 2) / TS), Math.floor((p.y + p.h / 2) / TS)))) p.life = 0;
  }
  projs = projs.filter(p => p.life > 0);
  // items
  const magnet = stats().magnet;
  for (const it of items) {
    if (it.got) continue;
    it.t += dt;
    const dx = P.x + P.w / 2 - (it.x + 4), dy = P.y + P.h / 2 - (it.y + 4), dist = Math.hypot(dx, dy);
    if (dist < magnet && it.t > 0.3) { it.x += dx / dist * 260 * dt; it.y += dy / dist * 260 * dt; }
    else { it.vy = Math.min(400, it.vy + 700 * dt); moveY(it, it.vy * dt); }
    if (dist < 12 && it.t > 0.3) { it.got = true; S.mats[it.mat] = (S.mats[it.mat] || 0) + 1; popText(P.x + P.w / 2, P.y - 24, '+1 ' + matName(it.mat), '#ffe08a'); sfx(990, 0.05, 'triangle', 0.03); }
  }
  items = items.filter(i => !i.got && i.t < 30);
  // camera
  const tx = clamp(P.x + P.w / 2 - VW / 2 + P.face * 30, 0, MW * TS - VW), ty = clamp(P.y + P.h / 2 - VH * 0.58, 0, MH * TS - VH);
  cam.x += (tx - cam.x) * Math.min(1, dt * 6); cam.y += (ty - cam.y) * Math.min(1, dt * 5);
  for (const k in pressed) pressed[k] = false;
  if (mode === 'fallen') endHell();
}

// ---------- rendering ----------
const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * 0.6, s: Math.random() < 0.15 ? 2 : 1 }));
const ridges = [0, 1, 2].map(l => Array.from({ length: 40 }, (_, i) => 0.35 + 0.25 * Math.sin(i * (0.9 + l * 0.4) + l * 2) + 0.12 * Math.sin(i * 2.7 + l)));
const towers = Array.from({ length: 70 }, (_, i) => ({ w: 18 + (i * 37 % 26), h: 60 + (i * 53 % 140), lit: i * 7 % 11 }));
const SIGNS = ['SARI-SARI', 'KAIN TAYO', 'BALUT 24/7', 'JEEP · LIWANAG', 'TINDAHAN', 'KARINDERYA', 'PASALUBONG', 'HALO-HALO'];
const rain = Array.from({ length: 120 }, () => ({ x: Math.random(), y: Math.random(), s: rnd(0.6, 1) }));
const flies = Array.from({ length: 40 }, () => ({ x: Math.random(), y: rnd(0.35, 0.9), p: rnd(0, 6) }));

function drawBG(time) {
  const past = S.era === PAST, cy = cam.y - OY * TS; // parallax relative to the original ground camera
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
      const par = 0.08 + l * 0.12, base = VH * (0.62 + l * 0.1) - cy * par * 0.3;
      ctx.fillStyle = cols[l]; ctx.beginPath(); ctx.moveTo(0, VH);
      for (let i = 0; i <= 40; i++) { const x = i * (VW / 20) - (cam.x * par) % (VW / 20 * 20); ctx.lineTo(x, base - rg[i % 40] * 70); }
      ctx.lineTo(VW, VH); ctx.fill();
    });
    // palms
    ctx.strokeStyle = '#041213'; ctx.fillStyle = '#041213'; ctx.lineWidth = 3;
    for (let i = 0; i < 14; i++) {
      const x = ((i * 97 - cam.x * 0.45) % (VW + 200) + VW + 200) % (VW + 200) - 100, y = VH * 0.92 - cy * 0.15;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 10, y - 50, x + 4, y - 90); ctx.stroke();
      for (let f = 0; f < 6; f++) { const a = -Math.PI / 2 + (f - 2.5) * 0.55; ctx.beginPath(); ctx.moveTo(x + 4, y - 90); ctx.quadraticCurveTo(x + 4 + Math.cos(a) * 26, y - 96 + Math.sin(a) * 10, x + 4 + Math.cos(a) * 40, y - 80 + Math.sin(a) * 18); ctx.stroke(); }
    }
    for (const f of flies) { const a = 0.4 + 0.6 * Math.sin(time * 3 + f.p); ctx.fillStyle = `rgba(190,255,150,${a})`; ctx.fillRect(((f.x * VW * 2 - cam.x * 0.6) % VW + VW) % VW, f.y * VH + Math.sin(time + f.p) * 6, 2, 2); }
  } else {
    // skyline, two layers
    for (let l = 0; l < 2; l++) {
      const par = 0.15 + l * 0.2; let x = -((cam.x * par) % 2000);
      const base = VH * (0.95 - l * 0.02) - cy * par * 0.3;
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
    } else if (v === 7) {
      if (!past) {
        ctx.fillStyle = '#241a3e'; ctx.fillRect(px, py, TS, 6);
        ctx.fillStyle = (x + y) % 3 ? '#ff3d8b' : '#2bd9ff'; ctx.fillRect(px, py, TS, 2);
        ctx.fillStyle = 'rgba(255,61,139,.14)'; ctx.fillRect(px, py + 6, TS, 3);
        if (tileAt(x - 1, y) !== 7 || tileAt(x + 1, y) !== 7) { ctx.fillStyle = '#3a2d5c'; ctx.fillRect(px + 6, py + 6, 3, 10); }
        if ((x * 5 + y) % 9 === 0) { ctx.fillStyle = '#4a4f6a'; ctx.fillRect(px + 3, py - 6, 9, 6); ctx.fillStyle = '#2bd9ff'; ctx.fillRect(px + 5, py - 4, 2, 2); }
      } else { ctx.strokeStyle = 'rgba(255,61,139,.1)'; ctx.setLineDash([2, 4]); ctx.strokeRect(px + 0.5, py + 0.5, TS - 1, 4); ctx.setLineDash([]); }
    } else if (v === 8) {
      if (!past) {
        ctx.fillStyle = '#3a3c48'; ctx.fillRect(px, py, TS, TS); ctx.fillStyle = '#4a4d5c'; ctx.fillRect(px + 1, py + 1, TS - 2, TS - 2);
        ctx.fillStyle = '#2a2c36'; ctx.fillRect(px + 2, py + 7, TS - 4, 1);
        if (y === 54) { ctx.fillStyle = '#ffc65a'; ctx.fillRect(px + 2, py + 3, 4, 2); ctx.fillStyle = '#111'; ctx.fillRect(px + 6, py + 3, 4, 2); ctx.fillStyle = '#ffc65a'; ctx.fillRect(px + 10, py + 3, 4, 2); }
      } else {
        ctx.strokeStyle = '#3f8a4a'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let i = 0; i < 4; i++) { const sx = px + 2 + i * 4, sw = Math.sin(time * 1.5 + x + i) * 1.5; ctx.moveTo(sx, py); ctx.quadraticCurveTo(sx + sw, py + 8, sx - sw * 0.5, py + TS); }
        ctx.stroke(); ctx.fillStyle = '#86b84a'; ctx.fillRect(px + 4 + (y % 2) * 6, py + 6, 2, 2);
      }
    }
  }
}
// landmarks drawn behind the tiles: balete tree / scaffold, rooftop facades, the den's glow
function drawDecor(time) {
  const past = S.era === PAST;
  // balete canopy trunk (x 122..130, rows 40..58)
  let x = 122 * TS - cam.x, y = 40 * TS - cam.y;
  if (x > -200 && x < VW + 200 && y < VH + 20 && y > -400) {
    if (past) {
      ctx.fillStyle = '#1e2a1c'; ctx.fillRect(x, y, 8 * TS, 18 * TS);
      ctx.strokeStyle = '#2c3d27'; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i < 7; i++) { const rx = x + 6 + i * 19; ctx.moveTo(rx, y + 4); ctx.bezierCurveTo(rx - 8, y + 90, rx + 10, y + 180, rx - 4 + (i % 2) * 8, y + 18 * TS); }
      ctx.stroke();
      for (let i = 0; i < 9; i++) {
        const lx = x + 4 * TS + (i - 4) * 40 + Math.sin(i * 2.1) * 10, ly = y - 30 - Math.abs(i - 4) * -6 + Math.sin(i * 1.3) * 14;
        ctx.fillStyle = i % 2 ? 'rgba(30,72,44,.85)' : 'rgba(40,94,54,.8)'; ctx.beginPath(); ctx.ellipse(lx, ly, 46, 26, 0, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(95,179,92,.35)'; ctx.beginPath(); ctx.ellipse(lx - 8, ly - 10, 22, 8, 0, 0, 7); ctx.fill();
      }
      for (let i = 0; i < 10; i++) { const a = 0.4 + 0.6 * Math.sin(time * 2 + i * 1.7); ctx.fillStyle = `rgba(190,255,150,${a})`; ctx.fillRect(x - 60 + i * 26, y - 40 + Math.sin(time + i) * 10 + (i % 3) * 18, 2, 2); }
    } else {
      ctx.strokeStyle = 'rgba(89,96,122,.7)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let r = 0; r < 18; r += 3) { ctx.moveTo(x, y + r * TS); ctx.lineTo(x + 8 * TS, y + (r + 3) * TS); ctx.moveTo(x + 8 * TS, y + r * TS); ctx.lineTo(x, y + (r + 3) * TS); }
      ctx.moveTo(x, y); ctx.lineTo(x, y + 18 * TS); ctx.moveTo(x + 8 * TS, y); ctx.lineTo(x + 8 * TS, y + 18 * TS); ctx.stroke();
      if (Math.sin(time * 3) > -0.7) { ctx.fillStyle = '#ff3d8b'; ctx.fillRect(x + 4 * TS - 1, y - 6, 3, 3); }
    }
  }
  // rooftop facades under the present-only decks
  if (!past) {
    for (const [bx, by, bw] of [[45, 52, 22], [50, 37, 17], [36, 58, 9]]) {
      const fx = bx * TS - cam.x, fy = by * TS + 6 - cam.y, fw = bw * TS, fh = (GY - by) * TS - 6;
      if (fx > VW || fx + fw < 0 || fy > VH || fy + fh < 0) continue;
      ctx.fillStyle = 'rgba(20,12,40,.82)'; ctx.fillRect(fx + 8, fy, fw - 16, fh);
      ctx.fillStyle = 'rgba(255,198,90,.32)';
      for (let wy = fy + 10; wy < fy + fh - 6; wy += 18) for (let wx = fx + 16; wx < fx + fw - 20; wx += 14) if (((wx + cam.x) * 3 + (wy + cam.y) * 7 | 0) % 5 === 0) ctx.fillRect(wx, wy, 4, 6);
    }
    x = 52 * TS - cam.x; y = 37 * TS - cam.y - 58;
    if (x > -120 && x < VW + 20 && y > -30 && y < VH) {
      const on = Math.sin(time * 2.3) > -0.8; ctx.font = '700 9px "Chakra Petch", sans-serif';
      ctx.globalAlpha = on ? 0.95 : 0.4; ctx.fillStyle = '#3ef0b4'; ctx.fillRect(x + 40, y, 78, 13); ctx.fillStyle = '#0b0e1a'; ctx.fillText('BUBONG · 24/7', x + 44, y + 10); ctx.globalAlpha = 1;
    }
  }
  // den glow (inside the sky rock)
  x = 82 * TS - cam.x; y = 47 * TS - cam.y;
  if (x > -300 && x < VW && y > -200 && y < VH) {
    ctx.fillStyle = past ? 'rgba(62,240,180,.08)' : 'rgba(0,0,0,.25)'; ctx.fillRect(x, y, 16 * TS, 9 * TS);
    if (past) for (let i = 0; i < 6; i++) { const mx = x + 10 + i * 40, my = y + 9 * TS - 4; ctx.fillStyle = '#c99a5a'; ctx.fillRect(mx, my - 4, 2, 4); ctx.fillStyle = `rgba(62,240,180,${0.5 + 0.4 * Math.sin(time * 3 + i)})`; ctx.fillRect(mx - 2, my - 7, 6, 3); }
  }
}
function drawShrines(time) {
  SHRINES.forEach((sx, i) => {
    const x = sx * TS - cam.x, y = GY * TS - cam.y;
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
  // spirits of extinct species waiting at a shrine
  for (const id in S.spiritAt) {
    const p = spiritSpot(S.spiritAt[id]), x = p.x - cam.x, y = p.y - cam.y + Math.sin(time * 2.5) * 3;
    if (x < -30 || x > VW + 30 || y < -30 || y > VH + 30) continue;
    ctx.strokeStyle = SPIRIT_COL[id]; ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 16 + Math.sin(time * 3) * 2, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    drawSpiritGhost(id, x, y, -1, time, 0.9);
  }
  // secret chests
  for (const c of CHESTS) {
    if (c.era !== undefined && c.era !== S.era) continue;
    const x = c.x * TS - cam.x, y = c.y * TS - cam.y, open = S.chests.includes(c.id);
    if (x < -20 || x > VW + 20 || y < -20 || y > VH + 20) continue;
    if (!open) { ctx.fillStyle = `rgba(255,198,90,${0.15 + 0.1 * Math.sin(time * 4)})`; ctx.fillRect(x - 4, y - 16, 24, 16); }
    const pastStyle = S.era === PAST;
    ctx.fillStyle = pastStyle ? '#6b4426' : '#2c3354'; ctx.fillRect(x + 1, y - 9, 14, 9);
    ctx.fillStyle = pastStyle ? '#8a5a34' : '#3b4466'; if (open) ctx.fillRect(x + 1, y - 14, 14, 3); else ctx.fillRect(x + 1, y - 12, 14, 4);
    ctx.fillStyle = pastStyle ? '#c99a5a' : '#2bd9ff'; ctx.fillRect(x + 1, y - 9, 14, 1); ctx.fillRect(x + 7, y - 10, 2, 3);
  }
}
function drawEnemy(e, time) {
  const x = Math.round(e.x - cam.x), y = Math.round(e.y - cam.y), d = e.d;
  if (x < -50 || x > VW + 50 || y < -50 || y > VH + 50) return;
  const white = e.flashT > 0;
  ctx.save(); ctx.translate(x + e.w / 2, y + e.h / 2); ctx.scale(e.face, 1);
  if (e.st === 'wind') { ctx.fillStyle = 'rgba(255,61,139,.35)'; ctx.beginPath(); ctx.arc(0, 0, Math.max(e.w, e.h) * 0.6, 0, 7); ctx.fill(); }
  drawBody(e.sp, e.t, e.st, white ? '#ffffff' : d.col, d.eye, white);
  if (e.loot && e.loot.length) { ctx.fillStyle = '#ffe08a'; for (let i = 0; i < e.loot.length; i++) ctx.fillRect(-6 + i * 4, -e.h / 2 - 4, 3, 3); }
  ctx.restore();
  if (e.hp < e.max) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x, y - 5, e.w, 2); ctx.fillStyle = '#ff3d8b'; ctx.fillRect(x, y - 5, e.w * e.hp / e.max, 2); }
}
// species bodies, drawn around the origin facing +x; plain = no accent colours (hit flash, spirit ghost)
function drawBody(sp, tm, st, body, eye, plain) {
  ctx.fillStyle = body;
  switch (sp) {
    case 'sigbin': case 'sigbinx': {
      // low hound, head between hind legs folklore pose: tail high, head low
      ctx.fillRect(-11, -4, 20, 9);
      ctx.fillRect(6, -1, 7, 6);
      const leg = Math.sin(tm * 14) * 2;
      ctx.fillRect(-9, 4, 3, 4 + leg); ctx.fillRect(4, 4, 3, 4 - leg);
      ctx.beginPath(); ctx.moveTo(-11, -3); ctx.quadraticCurveTo(-18, -12, -12, -16); ctx.lineTo(-10, -14); ctx.quadraticCurveTo(-14, -10, -9, -4); ctx.fill();
      if (sp === 'sigbinx' && !plain) { ctx.fillStyle = '#2bd9ff'; ctx.fillRect(-8, -4, 14, 1); }
      ctx.fillStyle = eye; ctx.fillRect(10, 0, 2, 2);
      break;
    }
    case 'tiktik': {
      ctx.beginPath(); ctx.ellipse(0, 2, 6, 8, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-14, -9 + Math.sin(tm * 12) * 3); ctx.lineTo(-4, -6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(2, -6); ctx.lineTo(8, -10); ctx.lineTo(6, -3); ctx.fill();
      ctx.fillStyle = eye; ctx.fillRect(4, -5, 2, 2);
      break;
    }
    case 'salagubang': case 'neonmite': case 'wisp': {
      if (sp === 'wisp') { const ga = ctx.globalAlpha; ctx.globalAlpha = ga * (0.7 + 0.3 * Math.sin(tm * 20)); ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill(); ctx.globalAlpha = ga; }
      else { ctx.beginPath(); ctx.ellipse(0, 0, 5, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(236,230,214,.45)'; const wv = Math.sin(tm * 40) * 3; ctx.fillRect(-4, -4 - Math.abs(wv), 4, 2); ctx.fillRect(0, -4 - Math.abs(wv), 4, 2); }
      ctx.fillStyle = eye; ctx.fillRect(3, -1, 2, 2);
      break;
    }
    case 'kapre': {
      // tree giant: bark body, arms to the knees, a beard of hanging roots, the slow glow of its cigar
      const wk = st === 'walk' ? Math.sin(tm * 4) * 1.5 : 0, up = st === 'wind';
      ctx.fillRect(-8, 9, 6, 12 + wk); ctx.fillRect(2, 9, 6, 12 - wk);
      ctx.fillRect(-10, -10, 20, 21);
      if (up) { ctx.fillRect(-15, -27, 5, 18); ctx.fillRect(10, -27, 5, 18); } else { ctx.fillRect(-15, -8, 5, 23); ctx.fillRect(10, -8, 5, 23); }
      ctx.fillRect(-8, -21, 16, 12);
      if (!plain) {
        ctx.fillStyle = '#3a2b1e'; ctx.fillRect(-5, -7, 2, 16); ctx.fillRect(2, -4, 2, 13); ctx.fillRect(-1, -9, 1, 6);
        ctx.strokeStyle = '#3d4a26'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let i = 0; i < 5; i++) { const rx = -7 + i * 3.4; ctx.moveTo(rx, -10); ctx.lineTo(rx + Math.sin(tm * 2 + i) * 1.5, -2 + (i % 2) * 3); }
        ctx.stroke();
        ctx.fillStyle = '#6b4a2a'; ctx.fillRect(7, -13, 7, 2);
        const g = 0.5 + 0.4 * Math.sin(tm * 2.2);
        ctx.fillStyle = `rgba(255,138,61,${g * 0.35})`; ctx.beginPath(); ctx.arc(15, -12, 4.5, 0, 7); ctx.fill();
        ctx.fillStyle = `rgb(255,${150 + (g * 80 | 0)},70)`; ctx.fillRect(14, -13, 2, 2);
        ctx.fillStyle = 'rgba(190,255,150,.8)'; ctx.fillRect(-6 + Math.sin(tm) * 2, -19, 1, 1); ctx.fillRect(4, -20 + Math.cos(tm * 1.3), 1, 1);
      }
      ctx.fillStyle = eye; ctx.fillRect(3, -17, 3, 2); ctx.fillRect(-2, -17, 2, 2);
      break;
    }
    case 'kapremech': {
      // demolition walker built in the Kapre's image: piston legs, hazard plating, a glowing exhaust where the cigar would be
      const wk = st === 'walk' ? Math.sin(tm * 5) * 1.5 : 0, up = st === 'wind';
      ctx.fillRect(-9, 8, 5, 13 + wk); ctx.fillRect(4, 8, 5, 13 - wk);
      ctx.fillRect(-12, -10, 24, 19);
      if (up) { ctx.fillRect(-17, -26, 5, 18); ctx.fillRect(12, -26, 5, 18); } else { ctx.fillRect(-17, -8, 5, 20); ctx.fillRect(12, -8, 5, 20); }
      ctx.fillRect(-7, -20, 14, 10);
      if (!plain) {
        ctx.fillStyle = '#2b2f42'; ctx.fillRect(-9, 12, 3, 6); ctx.fillRect(6, 12, 3, 6);
        for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#111' : '#ffc65a'; ctx.fillRect(-12 + i * 4, 4, 4, 3); }
        ctx.fillStyle = '#2b2f42'; ctx.fillRect(-11, -26, 3, 16);
        const g = 0.5 + 0.5 * Math.sin(tm * 6);
        ctx.fillStyle = `rgba(255,61,139,${0.3 + g * 0.4})`; ctx.fillRect(-12, -29, 5, 3);
        ctx.fillStyle = '#ff3d8b'; ctx.fillRect(-5, -16, 11, 3);
      }
      ctx.fillStyle = eye; ctx.fillRect(2, -16, 3, 3);
      break;
    }
    case 'ugat': {
      // root colossus that grew where the Kapre once tended the balete: a walking mound of roots with jade sap
      const wk = st === 'walk' ? Math.sin(tm * 3) * 1.5 : 0, up = st === 'wind';
      ctx.beginPath(); ctx.ellipse(0, 2, 15, 15 + (up ? 2 : 0), 0, 0, 7); ctx.fill();
      ctx.fillRect(-12, 12, 6, 7 + wk); ctx.fillRect(-2, 13, 5, 6); ctx.fillRect(7, 12, 6, 7 - wk);
      if (up) { ctx.fillRect(-18, -20, 5, 18); ctx.fillRect(13, -20, 5, 18); } else { ctx.fillRect(-19, -4, 5, 18); ctx.fillRect(14, -4, 5, 18); }
      if (!plain) {
        ctx.strokeStyle = `rgba(62,240,180,${0.5 + 0.3 * Math.sin(tm * 2)})`; ctx.lineWidth = 1.5; ctx.beginPath();
        ctx.moveTo(-8, -8); ctx.lineTo(-3, 0); ctx.lineTo(-6, 8); ctx.moveTo(4, -10); ctx.lineTo(7, -2); ctx.lineTo(3, 6); ctx.stroke();
        ctx.fillStyle = '#4c7a2e'; ctx.fillRect(-10, -14, 6, 3); ctx.fillRect(2, -16, 8, 3); ctx.fillRect(-2, -13, 3, 2);
      }
      ctx.fillStyle = eye; ctx.fillRect(6, -6, 2, 2); ctx.fillRect(10, -4, 2, 2); ctx.fillRect(8, -9, 2, 2);
      break;
    }
    case 'punso': {
      // little mound dweller: a body shaped like its earthen mound, a leaf satchel, bright curious eyes
      const leg = Math.sin(tm * 22) * 1.5;
      ctx.fillRect(-4, 3, 2, 3 + leg); ctx.fillRect(2, 3, 2, 3 - leg);
      ctx.beginPath(); ctx.moveTo(-6, 4); ctx.quadraticCurveTo(-6, -4, 0, -7); ctx.quadraticCurveTo(6, -4, 6, 4); ctx.closePath(); ctx.fill();
      if (!plain) { ctx.fillStyle = '#a8744a'; ctx.fillRect(-5, 0, 10, 1); ctx.fillRect(-3, -4, 6, 1); ctx.fillStyle = '#3f8a4a'; ctx.fillRect(-7, -1, 3, 4); ctx.fillStyle = '#2a1a10'; ctx.fillRect(0, -3, 5, 4); }
      ctx.fillStyle = eye; ctx.fillRect(1, -2, 1, 1); ctx.fillRect(3, -2, 1, 1);
      break;
    }
    case 'rustling': {
      const leg = Math.sin(tm * 24) * 1.5;
      ctx.fillRect(-4, 3, 2, 3 + leg); ctx.fillRect(2, 3, 2, 3 - leg);
      ctx.fillRect(-5, -4, 10, 8);
      if (!plain) { ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-5, 1); ctx.quadraticCurveTo(-10, 0, -9, -4 + Math.sin(tm * 10)); ctx.stroke(); ctx.fillStyle = '#3a3d4a'; ctx.fillRect(-1, -9, 1, 5); ctx.fillStyle = Math.sin(tm * 8) > 0 ? '#2bd9ff' : '#ff3d8b'; ctx.fillRect(-2, -10, 3, 2); }
      ctx.fillStyle = eye; ctx.fillRect(2, -2, 2, 2);
      break;
    }
    case 'mirrormole': {
      const leg = Math.sin(tm * 20) * 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, 7, 5, 0, 0, 7); ctx.fill();
      ctx.fillRect(-5, 3, 2, 3 + leg); ctx.fillRect(3, 3, 2, 3 - leg); ctx.fillRect(6, 0, 3, 2);
      if (!plain) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(-4, -4, 3, 1); ctx.fillRect(0, -5, 2, 1); ctx.fillStyle = 'rgba(43,217,255,.6)'; ctx.fillRect(-2, -3, 4, 1); }
      ctx.fillStyle = eye; ctx.fillRect(4, -2, 1, 1);
      break;
    }
    case 'cindershrew': {
      const leg = Math.sin(tm * 26) * 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, 6, 4, 0, 0, 7); ctx.fill();
      ctx.fillRect(-4, 3, 2, 2 + leg); ctx.fillRect(2, 3, 2, 2 - leg); ctx.fillRect(5, -1, 3, 2);
      if (!plain) { ctx.strokeStyle = `rgba(255,138,61,${0.6 + 0.4 * Math.sin(tm * 12)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-10, -2, -12, -6 + Math.sin(tm * 9) * 2); ctx.stroke(); }
      ctx.fillStyle = eye; ctx.fillRect(3, -2, 1, 1);
      break;
    }
    case 'diwata': {
      // starter spirit: a mote of the forest guardian's light with two leaf wings
      const fl = Math.sin(tm * 9) * 2;
      ctx.fillStyle = '#3f8a4a'; ctx.beginPath(); ctx.ellipse(-4, -2 - fl * 0.5, 4, 2, -0.6, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(4, -2 - fl * 0.5, 4, 2, 0.6, 0, 7); ctx.fill();
      ctx.fillStyle = '#eafff6'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill();
      break;
    }
    case 'minokawa': {
      // the giant moon-eating bird: mirror-bright feathers, hooked beak, long fanned tail
      const flap = Math.sin(tm * 6) * 4;
      ctx.beginPath(); ctx.ellipse(0, 0, 7, 5, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(-13, -10 - flap); ctx.lineTo(-9, -2); ctx.lineTo(2, 1); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6, 1); ctx.lineTo(-15, 5); ctx.lineTo(-14, 0); ctx.fill();
      ctx.beginPath(); ctx.moveTo(5, -3); ctx.lineTo(9, -6); ctx.lineTo(12, -3); ctx.lineTo(9, -1); ctx.fill();
      if (!plain) { ctx.fillStyle = '#fff6d8'; ctx.fillRect(-10, -7 - flap * 0.5, 4, 1); ctx.fillRect(-7, -4, 4, 1); ctx.fillStyle = '#b8862a'; ctx.fillRect(11, -3, 2, 2); }
      ctx.fillStyle = eye; ctx.fillRect(7, -4, 2, 2);
      break;
    }
    case 'bakunawa': {
      // young sea serpent with a moon in its jaws
      ctx.lineWidth = 4; ctx.strokeStyle = body; ctx.beginPath();
      for (let i = 0; i <= 6; i++) { const sx = -14 + i * 3.4, sy2 = Math.sin(tm * 4 + i * 0.9) * 3; if (i) ctx.lineTo(sx, sy2); else ctx.moveTo(sx, sy2); }
      ctx.stroke();
      const hy = Math.sin(tm * 4 + 6 * 0.9) * 3;
      ctx.beginPath(); ctx.ellipse(8, hy - 1, 5, 4, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(5, hy - 4); ctx.lineTo(2, hy - 9); ctx.lineTo(7, hy - 5); ctx.fill();
      if (!plain) { ctx.fillStyle = '#ffe3f0'; ctx.beginPath(); ctx.arc(13, hy + 1, 2.5, 0, 7); ctx.fill(); ctx.fillStyle = '#2b6aa0'; for (let i = 0; i < 4; i++) ctx.fillRect(-12 + i * 5, Math.sin(tm * 4 + i * 1.3) * 3 - 3, 2, 1); }
      ctx.fillStyle = eye; ctx.fillRect(9, hy - 3, 2, 2);
      break;
    }
    default: {
      // wakwak / drones / mantis: winged night flyer
      const flap = Math.sin(tm * (st === 'dive' ? 4 : 12)) * 6;
      ctx.beginPath(); ctx.ellipse(0, 0, 7, 5, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-3, -2); ctx.lineTo(-12, -6 - flap); ctx.lineTo(-2, 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(1, -2); ctx.lineTo(10, -6 - flap); ctx.lineTo(3, 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(6, -1); ctx.lineTo(12, 1); ctx.lineTo(6, 2); ctx.fill();
      if (sp !== 'wakwak' && !plain) { ctx.fillStyle = '#2bd9ff'; ctx.fillRect(-5, 3, 10, 1); }
      ctx.fillStyle = eye; ctx.fillRect(4, -2, 2, 2);
    }
  }
}
// a spirit: translucent ghost of its species (or the Diwata Wisp), scaled down
function drawSpiritGhost(id, x, y, face, time, scale) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(face * scale, scale);
  const col = SPIRIT_COL[id];
  ctx.globalAlpha = 0.22 + 0.08 * Math.sin(time * 4); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.fill();
  ctx.globalAlpha = 0.8;
  if (id === 'diwata' || SUMMON_SPIRITS.includes(id)) drawBody(id, time, 'walk', col, '#ffffff', false);
  else { ctx.globalAlpha = 0.7; drawBody(id, time, 'walk', col, '#ffffff', true); }
  ctx.globalAlpha = 1;
  ctx.restore();
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
  drawHero({ cls: S.cls, look: S.look, asc, eq: ACC.equip, run: P.onGround && Math.abs(P.vx) > 10 ? Math.sin(P.anim * 14) * 3 : 0, vx: P.vx, hurt: P.hurtT > 0,
    atk: P.atkT > 0 ? { prog: 1 - P.atkT / P.atkDur, combo: P.combo, fin: P.finisher, brk: stats().breaker } : null, chan: P.chan }, time);
  ctx.restore();
}
// the hero, drawn around the feet facing +x (used in game, on the class pick screen, the Hero tab and the ascension cut-in)
function drawHero(o, time) {
  const L = o.look || defLook(o.cls), eq = o.eq || {}, bab = o.cls === 'bab';
  const skin = SKINS[L.skin] || SKINS[2], hc = HAIR_COLS[L.hairCol] || HAIR_COLS[0], acc = ACCENTS[L.acc] || ACCENTS[0], run = o.run || 0;
  const wcol = WPN_COL[eq.wpn];
  // cosmetic aura behind the body
  if (eq.aura === 'aura_firefly') for (let i = 0; i < 5; i++) { const a = time * 1.6 + i * 1.26; ctx.fillStyle = `rgba(190,255,150,${0.5 + 0.4 * Math.sin(time * 5 + i)})`; ctx.fillRect(Math.cos(a) * 14 - 1, -13 + Math.sin(a) * 12 - 1, 2, 2); }
  else if (eq.aura === 'aura_plume') for (let i = 0; i < 5; i++) { const a = -2.6 + i * 0.35 + Math.sin(time * 3) * 0.05; ctx.fillStyle = i % 2 ? '#ff8a3d' : '#ffd34a'; ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.ellipse(-3 + Math.cos(a) * 11, -16 + Math.sin(a) * 11, 6, 2, a, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  else if (eq.aura === 'aura_moon') for (let i = 0; i < 7; i++) { const a = time * 0.7 + i * 0.9; ctx.fillStyle = i === 6 ? '#ffe3f0' : '#c9eedc'; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(Math.cos(a) * 17, -14 + Math.sin(a) * 8, 1.6, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  // scarf (Eskrimador) or sash ribbon (Babaylan) in the accent colour, with an optional summoned pattern
  ctx.strokeStyle = acc; ctx.lineWidth = 3; ctx.beginPath();
  const sy = bab ? -12 : -20;
  ctx.moveTo(-1, sy); ctx.quadraticCurveTo(-10, sy + Math.sin(time * 10) * 3, -16 - Math.min(10, Math.abs(o.vx || 0) / 14), sy + 4 + Math.sin(time * 12) * 3); ctx.stroke();
  if (eq.pat) {
    const pc = { pat_banig: ['#ffc65a', [2, 2]], pat_stripe: ['#2bd9ff', [3, 3]], pat_sampaguita: ['#ffffff', [1, 3]], pat_tala: ['#fff', [1, 2]] }[eq.pat] || ['#fff', [2, 2]];
    ctx.strokeStyle = pc[0]; ctx.lineWidth = 1.5; ctx.setLineDash(pc[1]); ctx.lineDashOffset = -time * 8; ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
  }
  // hair behind the head (long / braid)
  ctx.fillStyle = hc;
  if (L.hair === 1) ctx.fillRect(-6, -25, 3, bab ? 13 : 10);
  else if (L.hair === 3) { ctx.fillRect(-6, -24, 2, 3); ctx.fillRect(-7, -21, 2, 3); ctx.fillRect(-6, -18, 2, 3); ctx.fillRect(-7, -15, 2, 2); }
  if (bab) {
    ctx.fillStyle = '#1b2236'; ctx.fillRect(-3, -5, 2, 5 + run * 0.4); ctx.fillRect(1, -5, 2, 5 - run * 0.4);
    // robe: plum with an accent hem and sash
    ctx.fillStyle = o.hurt ? '#ffffff' : '#4a2350';
    ctx.beginPath(); ctx.moveTo(-5, -19); ctx.lineTo(5, -19); ctx.lineTo(7 + run * 0.3, -4); ctx.lineTo(-7 + run * 0.3, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = acc; ctx.fillRect(-7 + run * 0.3, -6, 14, 2); ctx.fillRect(-5, -13, 10, 2);
    ctx.fillStyle = '#7a3a7e'; ctx.fillRect(-1, -19, 2, 6);
  } else {
    ctx.fillStyle = '#1b2236'; ctx.fillRect(-4, -9, 3, 9 + run); ctx.fillRect(1, -9, 3, 9 - run);
    ctx.fillStyle = o.hurt ? '#ffffff' : '#2c6b74'; ctx.fillRect(-5, -19, 10, 11);
    ctx.fillStyle = '#ffc65a'; ctx.fillRect(-5, -11, 10, 2);
  }
  ctx.fillStyle = skin; ctx.fillRect(-4, -26, 8, 7);
  ctx.fillStyle = hc; ctx.fillRect(-5, -27, 9, 3); ctx.fillRect(-5, -25, 2, 4);
  if (L.hair === 2) ctx.fillRect(-7, -30, 4, 4);
  if (bab) {
    // putong headdress: gold band, three feathers (jade, accent, gold)
    ctx.fillStyle = '#ffc65a'; ctx.fillRect(-5, -27, 10, 2);
    ctx.fillStyle = '#3ef0b4'; ctx.fillRect(-4, -32, 2, 5); ctx.fillStyle = acc; ctx.fillRect(-1, -34, 2, 7); ctx.fillStyle = '#ffc65a'; ctx.fillRect(2, -31, 2, 4);
  } else { ctx.fillStyle = acc; ctx.fillRect(-4, -24, 8, 1); }
  ctx.fillStyle = '#14121c'; ctx.fillRect(2, -23, 1, 1);
  // Ascension I: glowing markings on face and body
  if (o.asc) {
    const g = 0.6 + 0.4 * Math.sin(time * 4);
    ctx.fillStyle = `rgba(125,255,240,${g})`;
    ctx.fillRect(-4, -18, 1, 2); ctx.fillRect(-3, -16, 1, 2); ctx.fillRect(-4, -14, 1, 2); ctx.fillRect(-3, -12, 1, 2);
    ctx.fillRect(3, -18, 1, 2); ctx.fillRect(2, -16, 1, 2); ctx.fillRect(3, -14, 1, 2);
    ctx.fillRect(-1, -22, 3, 1); ctx.fillRect(-3, -21, 1, 2);
    ctx.fillStyle = `rgba(255,198,90,${g})`; ctx.fillRect(-1, -26, 2, 1);
  }
  // weapon
  if (o.atk) {
    const a0 = o.atk.combo % 2 ? -1.6 : 1.2, a1 = o.atk.combo % 2 ? 1.1 : -1.4, a = a0 + (a1 - a0) * Math.min(1, o.atk.prog * 1.6);
    const len = bab ? (o.atk.fin ? 26 : 20) : o.atk.fin ? 30 : 22;
    ctx.strokeStyle = o.atk.fin ? (o.atk.brk ? 'rgba(255,198,90,.55)' : 'rgba(236,230,214,.45)') : bab ? 'rgba(199,162,255,.45)' : 'rgba(62,240,180,.4)';
    ctx.lineWidth = o.atk.fin ? 9 : 6; ctx.beginPath(); ctx.arc(2, -14, len - 4, Math.min(a0, a), Math.max(a0, a)); ctx.stroke();
    ctx.strokeStyle = wcol || (bab ? '#a0703c' : '#ece6d6'); ctx.lineWidth = bab ? 2.5 : 2; ctx.beginPath(); ctx.moveTo(2, -14); ctx.lineTo(2 + Math.cos(a) * len, -14 + Math.sin(a) * len); ctx.stroke();
  } else if (bab) {
    ctx.strokeStyle = wcol || '#8a5a34'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(6, -27); ctx.lineTo(6, 0); ctx.stroke();
    ctx.fillStyle = '#3ef0b4'; ctx.fillRect(5, -30, 3, 3);
  } else {
    ctx.strokeStyle = wcol || '#a8b0c8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, -18); ctx.lineTo(-9, -4); ctx.stroke();
    ctx.strokeStyle = '#8a5a34'; ctx.beginPath(); ctx.moveTo(4, -16); ctx.lineTo(9, -3); ctx.stroke();
  }
  if (wcol === '#ff3d8b' && !o.atk) { ctx.fillStyle = `rgba(255,61,139,${0.25 + 0.15 * Math.sin(time * 6)})`; ctx.beginPath(); ctx.arc(bab ? 6 : -6, -12, 6, 0, 7); ctx.fill(); }
  // channelled orb in the free hand
  if (o.chan >= 0 && o.chan !== undefined) {
    const r = 3 + 5 * o.chan;
    ctx.fillStyle = 'rgba(199,162,255,.35)'; ctx.beginPath(); ctx.arc(11, -15, r + 3, 0, 7); ctx.fill();
    ctx.fillStyle = '#e6d8ff'; ctx.beginPath(); ctx.arc(11, -15, r, 0, 7); ctx.fill();
  }
}
function drawProj() {
  for (const p of projs) {
    const x = p.x - cam.x, y = p.y - cam.y;
    if (p.type === 'bolt') { ctx.fillStyle = 'rgba(62,240,180,.35)'; ctx.fillRect(x - 3, y - 2, p.w + 6, p.h + 4); ctx.fillStyle = '#3ef0b4'; ctx.fillRect(x, y + 2, p.w, p.h - 4); ctx.fillStyle = '#eafff6'; ctx.fillRect(x + 3, y + 3, p.w - 6, 2); }
    else if (p.type === 'leaf') { ctx.save(); ctx.translate(x + 5, y + 5); ctx.rotate(p.life * 12); ctx.fillStyle = '#7ad04a'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 3, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#3ef0b4'; ctx.fillRect(-5, 0, 10, 1); ctx.restore(); }
    else if (p.type === 'orb') { const r = p.w / 2; ctx.fillStyle = 'rgba(199,162,255,.35)'; ctx.beginPath(); ctx.arc(x + r, y + r, r + 4, 0, 7); ctx.fill(); ctx.fillStyle = '#c7a2ff'; ctx.beginPath(); ctx.arc(x + r, y + r, r, 0, 7); ctx.fill(); ctx.fillStyle = '#f4ecff'; ctx.beginPath(); ctx.arc(x + r - 1, y + r - 1, r * 0.45, 0, 7); ctx.fill(); }
    else if (p.type === 'spirit') drawSpiritGhost(p.sid, x + p.w / 2, y + p.h / 2, p.vx >= 0 ? 1 : -1, performance.now() / 1000, 0.9);
    else if (p.type === 'feather') { ctx.fillStyle = '#ffd37a'; ctx.save(); ctx.translate(x + 3, y + 3); ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.fillRect(-5, -1, 10, 2); ctx.restore(); }
    else if (p.type === 'dart') { ctx.fillStyle = 'rgba(143,227,255,.35)'; ctx.fillRect(x - 2, y - 2, p.w + 4, p.h + 4); ctx.fillStyle = '#8fe3ff'; ctx.fillRect(x, y, p.w, p.h); }
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
  let hx = ox + 150;
  if (S.sp > 0) { ctx.fillStyle = '#ffc65a'; const st = '+' + S.sp + ' SP'; ctx.fillText(st, hx, oy + 9); hx += ctx.measureText(st).width + 8; }
  if (S.forge > 0) {
    ctx.strokeStyle = '#ece6d6'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(hx + 1, oy + 10); ctx.lineTo(hx + 7, oy); ctx.stroke();
    ctx.strokeStyle = '#ffc65a'; ctx.beginPath(); ctx.moveTo(hx - 1, oy + 6); ctx.lineTo(hx + 4, oy + 9); ctx.stroke();
    ctx.fillStyle = '#ffc65a'; ctx.fillText('+' + S.forge, hx + 9, oy + 9);
  }
  // active spirit
  if (S.spirit) {
    const sy = oy + 31, col = SPIRIT_COL[S.spirit];
    ctx.fillStyle = 'rgba(11,14,26,.6)'; ctx.beginPath(); ctx.arc(ox + 6, sy - 3, 6, 0, 7); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ox + 6, sy - 3, 3.5, 0, 7); ctx.fill();
    let cd = 0;
    if (S.spirit === 'salagubang') cd = P.shieldCd / 12; else if (S.spirit === 'sigbin') cd = P.biteCd / 3.5; else if (S.spirit === 'kapre') cd = P.stompCd > 1 ? P.stompCd / 8 : 0;
    if (cd > 0) { ctx.strokeStyle = 'rgba(236,230,214,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ox + 6, sy - 3, 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - cd)); ctx.stroke(); }
    ctx.font = '700 8px "Chakra Petch", sans-serif'; ctx.fillStyle = col; ctx.fillText(spiritName(S.spirit), ox + 16, sy);
    if (S.cls === 'bab' && has('call')) {
      // summon readiness ring
      const r = P.sumCd > 0 ? 1 - P.sumCd / (has('bond') ? 2.5 : 4) : 1, sx = ox + 22 + ctx.measureText(spiritName(S.spirit)).width;
      ctx.strokeStyle = r >= 1 && P.en >= SUMMON_COST ? col : 'rgba(236,230,214,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx + 4, sy - 3, 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * r); ctx.stroke();
    }
  }
  let ty = oy + 42;
  if (ACC.equip.ttl) { ctx.font = '700 8px "Chakra Petch", sans-serif'; ctx.fillStyle = RAR_COL[gItem(ACC.equip.ttl).r]; ctx.fillText(t('g_' + ACC.equip.ttl), ox, ty); ty += 11; }
  if (S.hell) { ctx.font = '700 8px "Chakra Petch", sans-serif'; ctx.fillStyle = '#ff5a3d'; ctx.fillText(t('hellTag'), ox, ty); }
  // era pill
  const past = S.era === PAST, label = (past ? t('past') : t('present')) + ' · ' + (past ? t('yearPast') : t('yearPresent'));
  ctx.font = '700 10px "Chakra Petch", sans-serif';
  const w = ctx.measureText(label).width + 16, cx = VW / 2 - w / 2;
  ctx.fillStyle = past ? 'rgba(62,240,180,.18)' : 'rgba(255,61,139,.18)'; ctx.fillRect(cx, oy - 2, w, 16);
  ctx.fillStyle = past ? '#3ef0b4' : '#ff3d8b'; ctx.fillRect(cx, oy - 2, 2, 16); ctx.fillText(label, cx + 9, oy + 9);
  // population chips (drop to a second row when the era pill would touch them on narrow screens)
  let px = VW - 60 - NICHE_IDS.length * 34, cy = oy;
  if (px < VW / 2 + w / 2 + 6) { px = VW - 12 - NICHE_IDS.length * 34; cy = oy + 18; }
  for (const n of NICHE_IDS) {
    const p = popPct(n);
    ctx.fillStyle = 'rgba(11,14,26,.6)'; ctx.fillRect(px, cy, 30, 12);
    ctx.fillStyle = p <= 0 ? '#ff3d8b' : p <= 0.5 ? '#ffc65a' : '#3ef0b4'; ctx.fillRect(px + 1, cy + 9, 28 * Math.max(p, 0.04), 2);
    ctx.fillStyle = '#ece6d6'; ctx.font = '700 7px "Chakra Petch", sans-serif'; ctx.fillText(t('c_' + n), px + 3, cy + 7);
    px += 34;
  }
  if (S.minimap) {
    const mw = MW / 2, mh = MH / 2, mx = VW - 12 - mw, my = cy + 34;
    if (exDirty) redrawMinimap();
    ctx.fillStyle = 'rgba(11,14,26,.72)'; ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(mmCanvas, mx, my, mw, mh);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(mx + (P.x + P.w / 2) / TS / 2 - 1, my + (P.y + P.h / 2) / TS / 2 - 1, 3, 3);
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
  drawDecor(time);
  drawTiles(time);
  drawShrines(time);
  for (const it of items) { const x = it.x - cam.x, y = it.y - cam.y + Math.sin(it.t * 6) * 1.5; ctx.fillStyle = 'rgba(255,224,138,.3)'; ctx.fillRect(x - 2, y - 2, 12, 12); ctx.fillStyle = '#ffe08a'; ctx.fillRect(x + 1, y + 1, 6, 6); }
  for (const e of enemies) drawEnemy(e, time);
  if (boss) drawBoss(time);
  drawPlayer(time);
  if (S.spirit) {
    drawSpiritGhost(S.spirit, SPR.x - cam.x, SPR.y - cam.y, P.face, time, 0.7);
    if (S.spirit === 'salagubang' && P.shieldCd <= 0) { ctx.strokeStyle = `rgba(255,224,138,${0.35 + 0.15 * Math.sin(time * 5)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(P.x + P.w / 2 - cam.x, P.y + P.h / 2 - cam.y, 13, 18, 0, 0, 7); ctx.stroke(); }
  }
  drawProj();
  for (const p of parts) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.col; ctx.fillRect(p.x - cam.x - p.size / 2, p.y - cam.y - p.size / 2, p.size, p.size); }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const x of texts) { ctx.globalAlpha = Math.min(1, x.life * 2); ctx.font = '700 10px "Chakra Petch", sans-serif'; ctx.fillStyle = '#0b0e1a'; ctx.fillText(x.txt, x.x - cam.x + 1, x.y - cam.y + 1); ctx.fillStyle = x.col; ctx.fillText(x.txt, x.x - cam.x, x.y - cam.y); }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
  // the den stays hidden behind rock until the player is inside it in the past
  const inDen = S.era === PAST && P.x + P.w > 82 * TS && P.x < 100 * TS && P.y + P.h > 47 * TS && P.y < 57 * TS;
  denReveal = clamp(denReveal + (inDen ? 0.05 : -0.05), 0, 1);
  if (denReveal < 1) {
    const x = 82 * TS - cam.x, y = 47 * TS - cam.y;
    if (x < VW && x + 16 * TS > 0 && y < VH && y + 9 * TS > 0) {
      ctx.globalAlpha = 1 - denReveal; ctx.fillStyle = S.era === PAST ? '#3a352a' : '#232842'; ctx.fillRect(x, y, 16 * TS, 9 * TS);
      ctx.fillStyle = S.era === PAST ? '#26231c' : '#151829';
      for (let j = 0; j < 9; j++) for (let i = 0; i < 16; i++) if (((82 + i) * 7 + (47 + j) * 3) % 5 === 0) ctx.fillRect(x + i * TS + 4, y + j * TS + 5, 5, 3);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
  if (wipeT > 0) {
    // era wipe: a bright band sweeps left to right; the old era's tint still covers what it has not reached
    const pr = 1 - wipeT / WIPE, bx = -80 + pr * (VW + 160);
    ctx.fillStyle = S.era === PAST ? 'rgba(42,15,60,.88)' : 'rgba(7,26,36,.88)';
    ctx.beginPath(); ctx.moveTo(bx + 40, 0); ctx.lineTo(VW, 0); ctx.lineTo(VW, VH); ctx.lineTo(bx - 40, VH); ctx.fill();
    ctx.fillStyle = wipeCol; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.moveTo(bx + 28, 0); ctx.lineTo(bx + 40, 0); ctx.lineTo(bx - 40, VH); ctx.lineTo(bx - 52, VH); ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (flash > 0) { ctx.globalAlpha = Math.min(0.6, flash); ctx.fillStyle = flashCol; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  drawHUD(time);
  if (cutT > 0) drawCutIn(time);
}
// ascension cut-in: dark frame, a gold band sweeping in with the hero and the title
let cutT = 0;
const CUT = 2.4;
function drawCutIn(time) {
  const p = 1 - cutT / CUT, a = Math.min(1, p / 0.12, cutT / 0.3);
  ctx.globalAlpha = 0.65 * a; ctx.fillStyle = '#05060c'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = a;
  const off = (1 - Math.min(1, p / 0.18)) * -VW, cy = VH / 2;
  ctx.fillStyle = 'rgba(255,198,90,.92)';
  ctx.beginPath(); ctx.moveTo(off, cy - 46); ctx.lineTo(off + VW + 60, cy - 66); ctx.lineTo(off + VW + 60, cy + 40); ctx.lineTo(off, cy + 60); ctx.fill();
  ctx.fillStyle = '#0b0e1a'; ctx.beginPath(); ctx.moveTo(off, cy - 40); ctx.lineTo(off + VW + 60, cy - 60); ctx.lineTo(off + VW + 60, cy + 34); ctx.lineTo(off, cy + 54); ctx.fill();
  for (let i = 0; i < 18; i++) { ctx.fillStyle = i % 2 ? '#3ef0b4' : '#ffc65a'; ctx.fillRect(off + ((i * 53 + time * 260) % (VW + 40)), cy - 30 + (i * 37 % 70), 14, 1); }
  ctx.save(); ctx.translate(off + VW * 0.26, cy + 46); ctx.scale(3.2, 3.2);
  ctx.fillStyle = `rgba(255,198,90,${0.25 + 0.1 * Math.sin(time * 6)})`; ctx.beginPath(); ctx.ellipse(0, -14, 15, 19, 0, 0, 7); ctx.fill();
  drawHero({ cls: S.cls, look: S.look, asc: true, eq: ACC.equip }, time);
  ctx.restore();
  ctx.textAlign = 'left'; ctx.fillStyle = '#ffc65a'; ctx.font = '700 30px "Chakra Petch", sans-serif';
  ctx.fillText(t('ascCut'), off + VW * 0.42, cy - 2);
  ctx.fillStyle = '#ece6d6'; ctx.font = '600 12px "Sora", sans-serif';
  ctx.fillText(t('ascSub', S.name || t('cls_' + S.cls)), off + VW * 0.42, cy + 20);
  ctx.globalAlpha = 1;
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
  const n = tree().find(x => x.id === id); if (!n || !canLearn(n)) return false;
  S.sp -= n.cost; if (n.mats) for (const m in n.mats) S.mats[m] -= n.mats[m];
  S.nodes.push(id);
  const st = stats(); P.maxhp = st.maxhp; P.maxen = st.maxen; P.hp = Math.min(P.hp + 25, P.maxhp);
  sfx(660, 0.2, 'triangle', 0.06, 200);
  if (id === 'asc') {
    // ascension: permanent look change (markings + aura) and a short cut-in
    if (!menuEl.hidden) toggleMenu(false);
    cutT = CUT; sfx(392, 0.5, 'triangle', 0.06, 400); setTimeout(() => sfx(784, 0.6, 'triangle', 0.06, 200), 260);
    burst(P.x + P.w / 2, P.y + P.h / 2, 40, '#ffc65a', 220, 1, 2, 0);
  }
  save(); return true;
}
function nodeHTML(n) {
  const got = has(n.id), can = canLearn(n);
  let need = [];
  if (!got) {
    if (n.cost) need.push(n.cost + ' SP');
    if (n.lvl) need.push(t('lvl') + ' ' + n.lvl);
    if (n.mats) for (const m in n.mats) need.push(n.mats[m] + 'x ' + matName(m) + ' (' + (S.mats[m] || 0) + ')');
  }
  return `<div class="node ${got ? 'have' : can ? 'can' : ''}"><span class="nm">${t('n_' + n.id)}</span><span class="ds">${t('d_' + n.id)}</span>` +
    (got ? `<span class="st">${t('learned')}</span>` : can ? `<button type="button" data-learn="${n.id}">${t('learn')} · ${need.join(' · ')}</button>` : `<span class="st lock">${t('needs')}: ${need.join(' · ')}${n.req && !has(n.req) ? ' · ' + t('n_' + n.req) : ''}</span>`) + '</div>';
}
// ---------- forge ----------
let forgeMsg = null;
function forgeCan() {
  if (S.forge >= FORGE.length) return false;
  const f = FORGE[S.forge];
  for (const m in f.mats) if ((S.mats[m] || 0) < f.mats[m]) return false;
  return true;
}
// one upgrade attempt: the materials are always consumed; success raises the level, failure never lowers it
function forgeUpgrade() {
  if (!forgeCan()) return null;
  const f = FORGE[S.forge];
  for (const m in f.mats) S.mats[m] -= f.mats[m];
  const ok = rng() * 100 < f.chance;
  if (ok) S.forge++;
  forgeMsg = { ok, lv: S.forge };
  if (ok) { sfx(660, 0.15, 'triangle', 0.06, 300); setTimeout(() => sfx(990, 0.25, 'triangle', 0.06), 110); } else sfx(160, 0.3, 'sawtooth', 0.05, -80);
  save(); return ok;
}
const TABS = { skills: 'skills', eco: 'eco', spirits: 'spirits', forge: 'forge', bag: 'bag', map: 'map', hero: 'hero', summon: 'summon' };
function portrait(cnv, id) {
  const c2 = cnv.getContext('2d'), old = ctx;
  c2.clearRect(0, 0, cnv.width, cnv.height);
  ctx = c2;
  try { drawSpiritGhost(id, cnv.width / 2 + (id === 'sigbin' ? 2 : 0), cnv.height / 2 + 2, 1, 1.3, id === 'kapre' ? 0.9 : id === 'sigbin' || id === 'wakwak' ? 1.2 : 1.5); } finally { ctx = old; }
}
function renderMenu() {
  document.querySelectorAll('.tabs [data-tab]').forEach(b => { b.classList.toggle('on', b.dataset.tab === tab); b.textContent = t(TABS[b.dataset.tab]); });
  document.getElementById('m-close').textContent = t('resume');
  if (tab === 'skills') {
    const tr = tree();
    let h = `<div class="sp-line"><span>${t('cls_' + S.cls)} · ${t('lvl')} ${S.lvl}</span><span>${t('sp')}: <b>${S.sp}</b></span></div><div class="tree">`;
    for (const br of BRANCHES[S.cls]) { h += `<div class="branch"><h3>${t('br_' + br)}</h3>`; tr.filter(n => n.br === br && n !== tr[0]).forEach(n => { h += nodeHTML(n); }); h += '</div>'; }
    h += '</div><div class="asc">' + nodeHTML(tr.find(n => n.id === 'asc')) + nodeHTML(tr[0]) + '</div>';
    mBody.innerHTML = h;
    mBody.querySelectorAll('[data-learn]').forEach(b => b.addEventListener('click', () => { learn(b.dataset.learn); renderMenu(); }));
  } else if (tab === 'eco') {
    let h = `<p class="eco-hint">${t('ecoHint')}</p><div class="eco">`;
    for (const n of NICHE_IDS) {
      const [pa, pr] = NICHES[n], su = succOf(n), p = popPct(n), alt = SUCC_ALT[n];
      h += `<div class="niche"><h4>${t('niche_' + n)}</h4><div class="row"><span>${t('past')}: ${spName(pa)}</span><span>${p <= 0 ? `<span class="ext">${t('extinct')}</span>` : Math.round(p * 100) + '%'}</span></div>` +
        `<div class="bar"><i style="width:${Math.round(p * 100)}%"></i></div>` +
        `<div class="row"><span>${t('present')}:</span><span>${p <= 0 ? spName(su) : p <= 0.5 ? spName(pr) + ' + ' + spName(su) : spName(pr)}</span></div>` +
        `<div class="row"><span>${t('drops')}</span><span>${p <= 0 ? matName(SPEC[su].mat) : p <= 0.5 ? matName(SPEC[pr].mat) + ', ' + matName(SPEC[su].mat) : matName(SPEC[pr].mat)}</span></div>` +
        (alt ? `<div class="dep">${t('succDep', t('niche_' + alt.dep), spName(NICHES[n][2]), spName(alt.dead))}</div>` : '') + '</div>';
    }
    mBody.innerHTML = h + '</div>';
  } else if (tab === 'spirits') {
    let h = `<p class="eco-hint">${t('spiritHint')}</p><div class="spirits">`;
    for (const id of SPIRITS) {
      const got = ownsSpirit(id), on = S.spirit === id, wait = S.spiritAt[id], gs = SUMMON_SPIRITS.includes(id);
      let st;
      if (on) st = `<span class="st">${t('spiritActive')}</span>`;
      else if (got) st = `<button type="button" data-equip="${id}">${t('equip')}</button>`;
      else if (wait !== undefined) st = `<span class="st wait">${t('spiritWaiting', wait + 1)}</span>`;
      else if (gs) st = `<span class="st lock">${t('spiritSummonOnly', gItem(id).r)}</span>`;
      else st = `<span class="st lock">${t('spiritLocked', spName(id))}</span>`;
      h += `<div class="spirit ${on ? 'have' : got ? 'can' : ''} ${got || wait !== undefined ? '' : 'dim'}"><canvas width="56" height="44" data-por="${id}"></canvas><div class="sp-txt"><span class="nm" style="color:${SPIRIT_COL[id]}">${spiritName(id)}</span><span class="ds">${t('spd_' + id)}</span>${st}</div></div>`;
    }
    mBody.innerHTML = h + '</div>';
    mBody.querySelectorAll('[data-por]').forEach(c => portrait(c, c.dataset.por));
    mBody.querySelectorAll('[data-equip]').forEach(b => b.addEventListener('click', () => { equipSpirit(b.dataset.equip); renderMenu(); }));
  } else if (tab === 'forge') {
    const lv = S.forge;
    let h = `<div class="forge"><div class="fg-head"><span class="blade">Kampilan <b>+${lv}</b></span><span>${t('forgeBonus', lv * FORGE_PCT)}</span></div>`;
    if (lv >= FORGE.length) h += `<p class="fg-rule">${t('forgeMax')}</p>`;
    else {
      const f = FORGE[lv], can = forgeCan();
      h += `<div class="fg-next"><div class="fg-odds"><span>${t('forgeNext', lv + 1, (lv + 1) * FORGE_PCT)}</span><span>${t('forgeChance')}: <b>${f.chance}%</b></span></div><div class="fg-cost">`;
      for (const m in f.mats) { const have = S.mats[m] || 0; h += `<span class="${have >= f.mats[m] ? '' : 'short'}">${f.mats[m]}x ${matName(m)} (${have})</span>`; }
      h += `</div><p class="fg-rule">${t('forgeRule')}</p>` +
        (can ? `<button type="button" data-forge="1">${t('forgeBtn')} · ${f.chance}%</button>` : `<span class="st lock">${t('forgeMissing')}</span>`) + '</div>';
    }
    if (forgeMsg) h += `<p class="fg-msg ${forgeMsg.ok ? 'ok' : 'bad'}">${forgeMsg.ok ? t('forgeOk', forgeMsg.lv) : t('forgeFail', forgeMsg.lv)}</p>`;
    h += `<div class="fg-table"><span class="fg-tt">${t('forgeOdds')}</span>`;
    FORGE.forEach((f, i) => { h += `<span class="${i < lv ? 'done' : i === lv ? 'cur' : ''}">+${i + 1} <b>${f.chance}%</b></span>`; });
    mBody.innerHTML = h + '</div></div>';
    const fb = mBody.querySelector('[data-forge]');
    if (fb) fb.addEventListener('click', () => { forgeUpgrade(); renderMenu(); });
  } else if (tab === 'hero') {
    const ttl = ACC.equip.ttl;
    let h = `<div class="hero"><div class="hero-l"><canvas id="hero-cv" width="96" height="104"></canvas><span class="nm">${esc(S.name || t('cls_' + S.cls))}</span>` +
      `<span class="ds">${t('cls_' + S.cls)} · ${t('lvl')} ${S.lvl}</span>${ttl ? `<span class="ttl" style="color:${RAR_COL[gItem(ttl).r]}">${t('g_' + ttl)}</span>` : ''}</div><div class="hero-r">${custHTML(S.look)}`;
    for (const sl of COS_SLOTS) {
      const own = GACHA.filter(g => g.type === sl && ACC.cos[g.id]);
      h += `<div class="cust-row"><span class="cl">${t('slot_' + sl)}</span><div class="chips"><button type="button" class="chip ${!ACC.equip[sl] ? 'on' : ''}" data-eq="${sl}" data-id="">${t('cosNone')}</button>` +
        own.map(g => `<button type="button" class="chip ${ACC.equip[sl] === g.id ? 'on' : ''}" data-eq="${sl}" data-id="${g.id}" style="border-color:${RAR_COL[g.r]}">${t('g_' + g.id)}</button>`).join('') + '</div></div>';
    }
    mBody.innerHTML = h + `<p class="eco-hint">${t('cosHint')}</p><button type="button" class="chip" id="to-title">${t('toTitle')}</button></div></div>`;
    heroPreview(document.getElementById('hero-cv'), S.cls, S.look, has('asc'), ACC.equip);
    bindCust(mBody, S.look, () => { save(); renderMenu(); });
    mBody.querySelectorAll('[data-eq]').forEach(b => b.addEventListener('click', () => { ACC.equip[b.dataset.eq] = b.dataset.id || null; saveAcc(); renderMenu(); }));
    document.getElementById('to-title').addEventListener('click', () => { save(); showTitle(); });
  } else if (tab === 'summon') {
    mBody.innerHTML = summonHTML();
    mBody.querySelectorAll('[data-por]').forEach(c => portrait(c, c.dataset.por));
    mBody.querySelectorAll('[data-pull]').forEach(b => b.addEventListener('click', () => { summon(+b.dataset.pull); renderMenu(); }));
    mBody.querySelector('[data-odds]').addEventListener('click', () => { oddsOpen = !oddsOpen; renderMenu(); });
  } else if (tab === 'map') {
    if (exDirty) redrawMinimap();
    mBody.innerHTML = `<div class="map-line"><span>${t('explored', exploredPct())}</span><label><input type="checkbox" id="mm-toggle" ${S.minimap ? 'checked' : ''}> ${t('minimapToggle')}</label></div><canvas id="map-cv" width="${MW * 3}" height="${MH * 3}"></canvas><p class="eco-hint">${t('mapLegend')}</p>`;
    const mc = document.getElementById('map-cv'), c2 = mc.getContext('2d');
    c2.imageSmoothingEnabled = false; c2.fillStyle = '#0b0e1a'; c2.fillRect(0, 0, mc.width, mc.height); c2.drawImage(mmCanvas, 0, 0, mc.width, mc.height);
    c2.fillStyle = '#ffffff'; c2.fillRect((P.x + P.w / 2) / TS * 3 - 3, (P.y + P.h / 2) / TS * 3 - 3, 6, 6);
    document.getElementById('mm-toggle').addEventListener('change', e => { S.minimap = e.target.checked; save(); });
  } else {
    let h = '<div class="mats">';
    for (const m in MATS) { const c = S.mats[m] || 0; h += `<div class="${c ? '' : 'zero'}"><span>${matName(m)}</span><span>${c}</span></div>`; }
    mBody.innerHTML = h + '</div>';
  }
}

function esc(x) { return String(x).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';'); }
// customization rows (class pick screen + Hero tab)
function custHTML(look) {
  const sw = (key, cols) => cols.map((c, i) => `<button type="button" class="swc ${look[key] === i ? 'on' : ''}" data-c="${key}" data-v="${i}" style="background:${c}" aria-label="${t('c_' + key)} ${i + 1}"></button>`).join('');
  let hs = ''; for (let i = 0; i < HAIR_STYLES; i++) hs += `<button type="button" class="chip ${look.hair === i ? 'on' : ''}" data-c="hair" data-v="${i}">${t('hs' + i)}</button>`;
  return `<div class="cust-row"><span class="cl">${t('c_skin')}</span><div class="chips">${sw('skin', SKINS)}</div></div>` +
    `<div class="cust-row"><span class="cl">${t('c_hair')}</span><div class="chips">${hs}</div></div>` +
    `<div class="cust-row"><span class="cl">${t('c_hairCol')}</span><div class="chips">${sw('hairCol', HAIR_COLS)}</div></div>` +
    `<div class="cust-row"><span class="cl">${t('c_acc')}</span><div class="chips">${sw('acc', ACCENTS)}</div></div>`;
}
function bindCust(root, look, done) {
  root.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => { look[b.dataset.c] = +b.dataset.v; done(); }));
}
function heroPreview(cnv, cls, look, asc, eq) {
  const c2 = cnv.getContext('2d'), old = ctx;
  c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, cnv.width, cnv.height);
  const sc = cnv.height / 37;
  c2.translate(cnv.width / 2, cnv.height - 3); c2.scale(sc, sc);
  ctx = c2;
  try { if (asc) { ctx.fillStyle = 'rgba(255,198,90,.2)'; ctx.beginPath(); ctx.ellipse(0, -14, 15, 19, 0, 0, 7); ctx.fill(); } drawHero({ cls, look, asc, eq: eq || {} }, 1.3); } finally { ctx = old; }
}
// ---------- summon (gacha, offline, no real money) ----------
let oddsOpen = false;
function gItem(id) { return GACHA.find(g => g.id === id); }
// chance of SSR or better on the n-th pull since the last SSR/UR: base 2.6%, +6% per pull from pull 70, guaranteed at 90
function ssrChance(n) { return n >= HARD_PITY ? 1 : Math.min(1, (RAR_RATE.SSR + RAR_RATE.UR) / 100 + Math.max(0, n - SOFT_PITY + 1) * SOFT_STEP); }
function rollRarity(n) {
  const hi = ssrChance(n), r = rng();
  if (r < hi) return r < hi * RAR_RATE.UR / (RAR_RATE.SSR + RAR_RATE.UR) ? 'UR' : 'SSR';
  return (r - hi) / (1 - hi) < RAR_RATE.SR / (RAR_RATE.R + RAR_RATE.SR) ? 'SR' : 'R';
}
function pullOne() {
  const n = ACC.pity + 1, rar = rollRarity(n), pool = GACHA.filter(g => g.r === rar);
  const it = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
  ACC.pulls++; ACC.pity = rar === 'SSR' || rar === 'UR' ? 0 : n;
  let dup;
  if (it.type === 'spirit') { dup = ACC.spirits.includes(it.id); if (!dup) ACC.spirits.push(it.id); }
  else { dup = !!ACC.cos[it.id]; ACC.cos[it.id] = (ACC.cos[it.id] || 0) + 1; }
  const dust = dup ? RAR_DUST[rar] : 0; ACC.dust += dust;
  return { id: it.id, r: rar, dup, dust };
}
function summon(n) {
  if (ACC.tala < PULL_COST * n) return null;
  ACC.tala -= PULL_COST * n;
  const res = []; for (let i = 0; i < n; i++) res.push(pullOne());
  ACC.last = res; saveAcc();
  const top = res.some(r => r.r === 'UR') ? 3 : res.some(r => r.r === 'SSR') ? 2 : res.some(r => r.r === 'SR') ? 1 : 0;
  sfx(520 + top * 130, 0.25, 'triangle', 0.05, 300); if (top >= 2) setTimeout(() => sfx(1040, 0.4, 'triangle', 0.05, 200), 150);
  return res;
}
function dailyGift() {
  const d = new Date().toDateString();
  if (ACC.gift === d) return false;
  ACC.gift = d; addTala(TALA.gift); toast(t('giftToast', TALA.gift), 3.2); return true;
}
function fmtPct(x) { const s = String(Math.round(x * 100) / 100) + '%'; return lang === 'de' ? s.replace('.', ',') : s; }
function gName(id) { const g = gItem(id); return g.type === 'spirit' ? t('sp_' + id) : t('g_' + id); }
function summonHTML() {
  let h = `<div class="gacha"><div class="g-top"><span>${t('tala')} <b>${ACC.tala}</b></span><span>${t('dust')} <b>${ACC.dust}</b></span>` +
    `<span>${t('pity')} <b id="pity-n">${ACC.pity}</b> / ${HARD_PITY}</span></div>` +
    `<div class="g-banner"><canvas width="56" height="44" data-por="bakunawa"></canvas><canvas width="56" height="44" data-por="minokawa"></canvas><div class="g-bt"><span class="nm">${t('banner')}</span><span class="ds">${t('bannerSub')}</span><span class="ds">${t('pityLine', ACC.pity, HARD_PITY)}</span></div></div>` +
    `<div class="g-btns"><button type="button" data-pull="1" ${ACC.tala < PULL_COST ? 'disabled' : ''}>${t('pull1', PULL_COST)}</button>` +
    `<button type="button" data-pull="10" ${ACC.tala < PULL_COST * 10 ? 'disabled' : ''}>${t('pull10', PULL_COST * 10)}</button><button type="button" class="ghost" data-odds="1">${oddsOpen ? t('oddsClose') : t('odds')}</button></div>`;
  if (ACC.last && ACC.last.length) {
    h += `<div class="g-res"><span class="cl">${t('lastPull')}</span>` + ACC.last.map(r => `<span class="gr" style="border-color:${RAR_COL[r.r]}"><b style="color:${RAR_COL[r.r]}">${r.r}</b> ${gName(r.id)} <i>${r.dup ? t('dustGot', r.dust) : t('newItem')}</i></span>`).join('') + '</div>';
  }
  if (oddsOpen) {
    h += `<div class="odds" id="odds"><p class="fg-rule">${t('pityRule')}</p><table><thead><tr><th>${t('oddsItem')}</th><th>${t('oddsType')}</th><th>${t('oddsRar')}</th><th>${t('oddsRate')}</th></tr></thead><tbody>`;
    for (const r of RAR.slice().reverse()) {
      const pool = GACHA.filter(g => g.r === r);
      h += `<tr class="rh"><td colspan="3" style="color:${RAR_COL[r]}">${r}</td><td>${fmtPct(RAR_RATE[r])}</td></tr>`;
      for (const g of pool) h += `<tr><td>${gName(g.id)}</td><td>${t(g.type === 'spirit' ? 'type_spirit' : 'slot_' + g.type)}</td><td style="color:${RAR_COL[r]}">${r}</td><td>${fmtPct(RAR_RATE[r] / pool.length)}</td></tr>`;
    }
    h += '</tbody></table></div>';
  }
  return h + `<p class="eco-hint">${t('earnHint')}</p></div>`;
}

// ---------- title / flow ----------
const pickEl = document.getElementById('pick'), titleEl = document.getElementById('title');
const DEF_NAME = { esk: 'Lakan', bab: 'Ligaya' };
let pick = { cls: 'esk', look: defLook('esk'), hell: false, touched: false };
function fmtTime(sec) { return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
function applyLang() {
  document.documentElement.lang = lang === 'fil' ? 'fil' : lang;
  document.getElementById('t-tagline').textContent = t('tagline');
  document.getElementById('t-keys').textContent = t('ctrlKeys');
  document.getElementById('t-rotate').textContent = t('rotate');
  const saved = load();
  const c = document.getElementById('btn-continue'), n = document.getElementById('btn-new');
  c.textContent = saved ? t('cont') : t('tap'); n.textContent = t('newgame'); n.hidden = !saved;
  const hb = document.getElementById('btn-hell'), ok = hellUnlocked(), hs = load(HELL_KEY);
  hb.disabled = !ok; hb.classList.toggle('locked', !ok);
  hb.textContent = !ok ? t('hellLocked') : hs ? t('hellCont', hs.name || t('cls_' + hs.cls), hs.lvl) : t('hellBtn');
  document.getElementById('t-hell').textContent = ok ? t('hellInfo') : t('hellNeed');
  const fl = document.getElementById('fallen');
  fl.hidden = !ACC.fallen.length;
  if (ACC.fallen.length) fl.innerHTML = `<span class="fh">${t('fallenTitle')}</span>` + ACC.fallen.slice(0, 3).map(f => `<span>${esc(f.name)} · ${t('cls_' + f.cls)} · ${t('lvl')} ${f.lvl} · ${fmtTime(f.time)}</span>`).join('');
  document.querySelectorAll('.langs button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
  if (!pickEl.hidden) renderPick();
}
document.querySelectorAll('.langs button').forEach(b => b.addEventListener('click', () => { lang = b.dataset.lang; try { localStorage.setItem('epochfall.lang', lang); } catch (e) {} applyLang(); }));
function titleContinue() { if (load()) startGame(false); else openPick(false); }
document.getElementById('btn-continue').addEventListener('click', titleContinue);
document.getElementById('btn-new').addEventListener('click', () => openPick(false));
document.getElementById('btn-hell').addEventListener('click', () => {
  if (!hellUnlocked()) return;
  if (load(HELL_KEY)) startGame(false, { hell: true }); else openPick(true);
});
// class pick: both classes with a live preview, customization, name; also the entry to a new hell mode character
function openPick(hell) {
  pick = { cls: 'esk', look: defLook('esk'), hell, touched: false };
  document.getElementById('pk-name').value = '';
  pickEl.hidden = false; titleEl.hidden = true;
  renderPick();
}
function renderPick() {
  document.getElementById('pk-title').textContent = t('pickTitle');
  const tag = document.getElementById('pk-hell'); tag.hidden = !pick.hell; tag.textContent = t('pickHell');
  document.getElementById('pk-back').textContent = t('back');
  document.getElementById('pk-go').textContent = t('pickGo');
  document.getElementById('pk-nl').textContent = t('pickName');
  document.getElementById('pk-name').placeholder = DEF_NAME[pick.cls];
  pickEl.querySelectorAll('.cls-card').forEach(card => {
    const c = card.dataset.cls;
    card.classList.toggle('on', c === pick.cls);
    card.setAttribute('aria-pressed', c === pick.cls);
    card.querySelector('.nm').textContent = t('cls_' + c);
    card.querySelector('.ds').textContent = t('clsd_' + c);
    heroPreview(card.querySelector('canvas'), c, c === pick.cls ? pick.look : (pick.touched ? pick.look : defLook(c)), false, ACC.equip);
  });
  const cu = document.getElementById('pk-cust');
  cu.innerHTML = custHTML(pick.look);
  bindCust(cu, pick.look, () => { pick.touched = true; renderPick(); });
}
pickEl.querySelectorAll('.cls-card').forEach(card => card.addEventListener('click', () => {
  pick.cls = card.dataset.cls;
  if (!pick.touched) pick.look = defLook(pick.cls);
  renderPick();
}));
document.getElementById('pk-back').addEventListener('click', () => { pickEl.hidden = true; titleEl.hidden = false; applyLang(); });
document.getElementById('pk-go').addEventListener('click', () => {
  startGame(true, { cls: pick.cls, look: pick.look, hell: pick.hell, name: document.getElementById('pk-name').value.trim().slice(0, 14) || DEF_NAME[pick.cls] });
});
function startGame(fresh, o = {}) {
  initAudio();
  const hell = !!o.hell, cls = TREES[o.cls] ? o.cls : 'esk';
  S = (!fresh && load(hell ? HELL_KEY : SAVE_KEY)) || freshSave(cls);
  if (fresh) {
    S = freshSave(cls); S.hell = hell; S.name = o.name || DEF_NAME[cls];
    if (o.look) for (const k in LOOK_KEYS) S.look[k] = clamp(o.look[k] | 0, 0, LOOK_KEYS[k] - 1);
  }
  buildMap();
  const sx = S.bossDone ? SHRINES[2] : (S.shrine || S.time ? SHRINES[S.shrine] : 4);
  P = newPlayer(sx * TS, GY * TS - 26);
  const st = stats(); P.maxhp = P.hp = st.maxhp; P.maxen = P.en = st.maxen;
  enemies = []; projs = []; items = []; parts = []; texts = []; boss = null; cutT = 0;
  resetSpawns(); loadExplored(); wipeT = 0;
  SPR.x = P.x; SPR.y = P.y - 10;
  cam.x = clamp(P.x - VW / 2, 0, MW * TS - VW); cam.y = clamp(P.y - VH * 0.58, 0, MH * TS - VH);
  titleEl.hidden = true; pickEl.hidden = true;
  document.getElementById('b-sum').hidden = S.cls !== 'bab';
  mode = 'play'; paused = false;
  if (touchWanted) touchEl.hidden = false;
  if (!S.time) toast(t('present') + ' · ' + t('yearPresent') + (S.hell ? ' · ' + t('hellTag') : ''), 2.2);
  dailyGift();
  save();
}
function showTitle() {
  S = null; P = null; boss = null; enemies = []; projs = []; cutT = 0;
  mode = 'title'; paused = false; menuEl.hidden = true; touchEl.hidden = true; timeBtn.hidden = true;
  document.getElementById('win').hidden = true; pickEl.hidden = true; titleEl.hidden = false;
  applyLang();
}
// hell mode permadeath: the character and its save are gone, its name goes to the Fallen list; the account keeps everything
function endHell() {
  const f = { name: S.name || DEF_NAME[S.cls], cls: S.cls, lvl: S.lvl, time: Math.floor(S.time), boss: !!S.bossDone, at: Date.now() };
  ACC.fallen.unshift(f); if (ACC.fallen.length > 20) ACC.fallen.length = 20; saveAcc();
  try { localStorage.removeItem(HELL_KEY); } catch (e) {}
  showTitle();
  toast(t('hellFallen', f.name), 5);
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
  if (mode === 'fallen') endHell();
  if (mode !== 'play' && toastT > 0) { toastT -= dt; if (toastT <= 0) toastEl.classList.remove('show'); }
  if (mode === 'play' && !paused) { acc += dt; let n = 0; while (acc >= STEP && n < 5) { update(STEP); acc -= STEP; n++; } if (n === 5) acc = 0; }
  if (S && P) render(now / 1000);
  else titleRender(now / 1000);
  requestAnimationFrame(frame);
}
function titleRender(time) {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  if (!S) { S = freshSave(); S.era = Math.floor(time / 4) % 2; cam.x = (time * 30) % 1000; cam.y = OY * TS; drawBG(time); S = null; }
}
try { const l = localStorage.getItem('epochfall.lang'); if (l && I[l]) lang = l; else { const n = (navigator.language || 'en').toLowerCase(); lang = n.startsWith('de') ? 'de' : (n.startsWith('fil') || n.startsWith('tl')) ? 'fil' : 'en'; } } catch (e) {}
applyLang();
requestAnimationFrame(frame);

// test / debug hook (used by tools/test.mjs)
window.EF = {
  get S() { return S; }, get P() { return P; }, get boss() { return boss; }, get enemies() { return enemies; }, get mode() { return mode; },
  start: startGame, get acc() { return ACC; }, toTitle() { if (S) save(); showTitle(); }, pick: openPick, get pickState() { return pick; },
  tree, ssrChance, rollRarity, summon, gacha: GACHA, rates: RAR_RATE, dailyGift, hurt: d => hurtPlayer(d, P.x + 20), get cut() { return cutT; },
  bossBase: bossBaseStage, hellUnlocked, summonStrike: () => summonStrike(stats()),
  // colours the hero sprite actually uses: draws the current hero into a small canvas and reads the pixels back
  heroColors() {
    const c = document.createElement('canvas'); c.width = 48; c.height = 48;
    const c2 = c.getContext('2d'), old = ctx; c2.translate(24, 44); ctx = c2;
    try { drawHero({ cls: S.cls, look: S.look, asc: has('asc'), eq: ACC.equip }, Math.PI / 8); } finally { ctx = old; }
    const d = c2.getImageData(0, 0, 48, 48).data, set = new Set();
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] === 255) set.add('#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join(''));
    return [...set];
  },
  look: { SKINS, HAIR_COLS, ACCENTS },
  step(n = 1) { for (let i = 0; i < n; i++) update(STEP); },
  hold(k, v) { if (v) press(k); else release(k); },
  tap(k) { press(k); update(STEP); release(k); },
  teleport(tx, ty) { P.x = tx * TS; P.y = ty * TS - P.h; P.vx = P.vy = 0; cam.x = clamp(P.x - VW / 2, 0, MW * TS - VW); cam.y = clamp(P.y - VH * 0.58, 0, MH * TS - VH); },
  learn, era() { nearShrine = S.shrine; switchEra(); }, tile: tileAt, menu: toggleMenu, render: () => render(performance.now() / 1000),
  give(m, n) { S.mats[m] = (S.mats[m] || 0) + n; }, sp(n) { S.sp += n; }, lvl(n) { S.lvl = n; },
  OY, GY, get items() { return items; }, get projs() { return projs; }, get wipe() { return wipeT; }, get spirit() { return SPR; },
  speciesFor, succOf, stats, equip: equipSpirit, forge: forgeUpgrade, forgeCan, explored: exploredPct,
  rng(fn) { rng = fn || Math.random; },
  tab(name) { tab = name; renderMenu(); },
  drop(tx, ty, mat) { dropItem(tx * TS, ty * TS - 8, mat); return items[items.length - 1]; },
  spawnAt(id, tx, ty) {
    const d = SPEC[id], e = { id: uid++, sp: id, d, x: tx * TS, y: ty * TS - d.h, w: d.w, h: d.h, vx: 0, vy: 0, hp: d.hp * hm(), max: d.hp * hm(), face: -1, onGround: false,
      st: 'walk', t: 0, home: { x: tx * TS, y: ty * TS - 40 }, src: null, era: S.era, flashT: 0, kb: 0, ph: 0, loot: null, target: null };
    enemies.push(e); return e;
  },
  solid(x, y) { return isSolid(tileAt(x, y)); },
  clearEnemies() { enemies = []; spawnState.forEach(s => { s.alive = 0; s.cd = 999; }); }
};
})();
