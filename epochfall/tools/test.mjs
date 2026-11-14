// Usage: node epochfall/tools/test.mjs <webDir> [shotDir]
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const web = path.resolve(process.argv[2] || 'epochfall/web');
const shots = process.argv[3] ? path.resolve(process.argv[3]) : null;
if (shots) fs.mkdirSync(shots, { recursive: true });
const results = [];
const ok = (name, cond, info = '') => { results.push({ name, pass: !!cond, info }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : '')); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, deviceScaleFactor: 1 });
// seeded Math.random: same fight rolls every run (boss attack picks are random, a short run could skip one)
await ctx.addInitScript(() => { let sd = 0x5eed; Math.random = () => { sd = (sd + 0x6D2B79F5) | 0; let t = Math.imul(sd ^ (sd >>> 15), 1 | sd); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
await page.goto('file://' + path.join(web, 'index.html'));
await page.waitForTimeout(500);
const shot = async n => { if (shots) await page.screenshot({ path: path.join(shots, n + '.png') }); };
await shot('00-title');

// fresh device: hell mode is locked; a save from before the class choice loads as an Eskrimador; daily gift once per day
const pre = await page.evaluate(() => {
  const hb = document.getElementById('btn-hell');
  const locked = hb.disabled && !EF.hellUnlocked();
  localStorage.setItem('epochfall.save.v1', JSON.stringify({ v: 1, lvl: 3, xp: 0, sp: 2, nodes: ['arnis', 'bolt'], mats: {}, era: 1, shrine: 0, time: 50 }));
  EF.start(false);
  const r = { locked, cls: EF.S.cls, nodes: EF.S.nodes.join(','), look: EF.S.look, boltInTree: EF.tree().some(n => n.id === 'bolt'), tala: EF.acc.tala, again: EF.dailyGift() };
  EF.toTitle();
  r.stillLocked = document.getElementById('btn-hell').disabled;
  return r;
});
ok('hell mode is locked on a fresh device', pre.locked && pre.stillLocked, JSON.stringify(pre));
ok('old saves without a class load as Eskrimador', pre.cls === 'esk' && pre.boltInTree && pre.nodes === 'arnis,bolt' && pre.look && pre.look.skin === 2);
ok('daily gift gives Tala once per day', pre.tala === 100 && pre.again === false, 'tala=' + pre.tala);

await page.evaluate(() => EF.start(true));
await page.waitForTimeout(300);
ok('game starts', await page.evaluate(() => EF.mode === 'play'));
ok('no Balangay dock before the Tikbalang falls', await page.evaluate(() => EF.dock() === null && !EF.unlocked('z2') && EF.zone.id === 'z1'));
// the map grew upward by EF.OY rows; every original coordinate below is shifted by Y
const Y = await page.evaluate(() => EF.OY);
await page.evaluate(() => {
  // shared helpers for real-input movement (installed on window so every evaluate can use them)
  window.T = {
    run(dir, frames, jump) { if (dir) EF.hold(dir, true); if (jump) EF.hold('jump', true); for (let i = 0; i < frames; i++) { EF.step(1); EF.P.inv = 9; } if (dir) EF.hold(dir, false); if (jump) EF.hold('jump', false); for (let i = 0; i < 25; i++) { EF.step(1); EF.P.inv = 9; } },
    goto(tx) { for (let i = 0; i < 1500 && Math.abs(EF.P.x + 6 - tx * 16) > 3; i++) { const d = tx * 16 - (EF.P.x + 6) > 0 ? 'right' : 'left'; EF.hold(d, true); EF.step(1); EF.hold(d, false); EF.P.vx *= 0.3; EF.P.inv = 9; } for (let i = 0; i < 20; i++) { EF.step(1); EF.P.inv = 9; } },
    climb(seq) { const log = []; for (const [tx, d] of seq) { T.run(d, 26, true); T.goto(tx); log.push(+((EF.P.y + EF.P.h) / 16).toFixed(2)); } return log; },
    feet() { return (EF.P.y + EF.P.h) / 16; },
    toEra(e) { if (EF.S.era !== e) EF.era(); },
    meleeKill(e, maxFrames = 600) { for (let i = 0; i < maxFrames && !e.dead; i++) { EF.P.x = e.x - 14; EF.P.y = e.y + e.h - EF.P.h; EF.P.vy = 0; EF.P.face = 1; EF.P.inv = 9; if (i % 12 === 0) EF.tap('attack'); else EF.step(1); } return e.dead; },
    findSpawn(pred, spots, n = 400) { for (let i = 0; i < n && !EF.enemies.some(pred); i++) { const [x, y] = spots[i % spots.length]; EF.teleport(x, y); EF.step(2); } return EF.enemies.filter(pred).map(e => e.sp); }
  };
});
await page.evaluate(() => EF.step(60));
ok('player stands on ground', await page.evaluate(() => EF.P.onGround));
await shot('01-present-start');

// starter spirit: the Diwata Wisp follows from the start and heals slowly
const wisp = await page.evaluate(() => { EF.clearEnemies(); const s = EF.S.spirit; EF.P.hp = 50; for (let i = 0; i < 120; i++) { EF.step(1); EF.P.inv = 9; } return { s, hp: EF.P.hp }; });
ok('starter Diwata Wisp is active and heals', wisp.s === 'diwata' && wisp.hp > 51.5, JSON.stringify(wisp));

// walk right across the present-only bridge
const crossed = await page.evaluate(Y => { EF.teleport(40, Y + 35); EF.hold('right', true); for (let i = 0; i < 60 * 5; i++) { EF.step(1); EF.P.inv = 9; } EF.hold('right', false); return EF.P.x / 16; }, Y);
ok('present: bridge is walkable', crossed > 76, 'x=' + crossed.toFixed(1));
await shot('02-present-bridge');

// past: bridge gone
const fell = await page.evaluate(Y => { EF.teleport(86, Y + 35); EF.step(5); EF.era(); const e = EF.S.era; const w = EF.wipe; EF.teleport(46, Y + 35); EF.step(40); return { e, w, y: EF.P.y / 16 }; }, Y);
ok('shrine switches to past', fell.e === 0);
ok('era switch plays the screen wipe', fell.w > 0, 'wipe=' + fell.w.toFixed(2));
await page.evaluate(Y => { EF.teleport(86, Y + 35); EF.step(30); }, Y);
await shot('03-past-shrine');

// climb vine steps in the past with real inputs
const climb = await page.evaluate(Y => {
  EF.teleport(103, Y + 35); EF.step(30);
  const log = T.climb([[106.5, 'right'], [101.5, 'left'], [106.5, 'right'], [101.5, 'left'], [106.5, 'right'], [112, 'right']]);
  return { y: T.feet(), x: EF.P.x / 16, log };
}, Y);
ok('past: vine steps lead up to the ledge', climb.y <= Y + 18.1 && climb.x > 109, JSON.stringify(climb));
await shot('04-past-ledge');

// feather + double jump onto the upper platform and over the wall
const over = await page.evaluate(Y => {
  EF.teleport(140, Y + 18); EF.step(20);
  const dj = EF.S.dj;
  EF.teleport(144, Y + 18); EF.step(20);
  EF.hold('right', true); EF.hold('jump', true);
  for (let i = 0; i < 18; i++) { EF.step(1); EF.P.inv = 9; }
  EF.hold('jump', false); EF.step(2); EF.hold('jump', true);
  for (let i = 0; i < 18; i++) { EF.step(1); EF.P.inv = 9; }
  EF.hold('jump', false); EF.hold('right', false);
  for (let i = 0; i < 40; i++) { EF.step(1); EF.P.inv = 9; }
  const onPlat = (EF.P.y + EF.P.h) / 16;
  EF.hold('right', true); EF.hold('jump', true);
  for (let i = 0; i < 16; i++) { EF.step(1); EF.P.inv = 9; }
  EF.hold('jump', false); EF.step(2); EF.hold('jump', true);
  for (let i = 0; i < 60; i++) { EF.step(1); EF.P.inv = 9; }
  EF.hold('jump', false); EF.hold('right', false);
  for (let i = 0; i < 60; i++) { EF.step(1); EF.P.inv = 9; }
  return { dj, onPlat, x: EF.P.x / 16 };
}, Y);
ok('feather gives double jump', over.dj);
ok('double jump reaches upper platform', over.onPlat <= Y + 13.1, 'feet=' + over.onPlat);
ok('upper route crosses the wall', over.x > 156, 'x=' + over.x.toFixed(1));

// ---- new routes, all with real inputs ----
// past: the hidden Punso den behind the vine curtain (one extra vine step, then a jump left through the curtain)
const den = await page.evaluate(Y => {
  T.toEra(0); EF.clearEnemies();
  EF.teleport(103, Y + 35); EF.step(30);
  const log = T.climb([[106.5, 'right'], [101.5, 'left'], [106.5, 'right'], [101.5, 'left'], [106.5, 'right'], [101.5, 'left']]);
  T.run('left', 26, true); T.goto(90);
  const inside = { feet: T.feet(), x: EF.P.x / 16 };
  T.goto(84.5);
  return { log, inside, chest: EF.S.chests.includes('cave'), mats: EF.S.mats.scavP || 0 };
}, Y);
ok('past: hidden den is reachable through the vine curtain', den.inside.feet <= 56.05 && den.inside.feet > 55.5 && den.inside.x < 97, JSON.stringify(den.inside) + ' ' + JSON.stringify(den.log));
ok('past: den secret chest opens', den.chest && den.mats >= 3, 'scavP=' + den.mats);
await page.evaluate(() => { for (let i = 0; i < 30; i++) EF.step(1); });
await page.waitForTimeout(400);
await shot('10-past-den');
const seal = await page.evaluate(() => { const past = EF.solid(98, 54); T.toEra(1); const pres = EF.solid(98, 54); T.toEra(0); return { past, pres }; });
ok('den entrance is open in the past, sealed in the present', !seal.past && seal.pres, JSON.stringify(seal));

// both eras: balete canopy climb from the ledge
const canopy = await page.evaluate(Y => {
  EF.clearEnemies();
  EF.teleport(116, Y + 18); EF.step(30);
  const log = T.climb([[119.5, 'right'], [114.5, 'left'], [119.5, 'right'], [114.5, 'left'], [119.5, 'right'], [126, 'right']]);
  return { feet: T.feet(), log };
}, Y);
ok('canopy steps lead up to the balete deck', canopy.feet <= 40.05, JSON.stringify(canopy));
await page.waitForTimeout(300);
await shot('11-past-canopy');

// present: rooftop route (present-only rooftops) up to the secret chest
const roof = await page.evaluate(Y => {
  T.toEra(1); EF.clearEnemies();
  EF.teleport(39, Y + 35); EF.step(30);
  const a = T.climb([[42.5, 'right'], [37.5, 'left'], [42.5, 'right'], [37.5, 'left'], [42.5, 'right'], [37.5, 'left'], [42.5, 'right']]);
  T.run('right', 26, true); T.goto(58.5);
  const deck = T.feet();
  const b = T.climb([[63.5, 'right'], [68.5, 'right'], [63.5, 'left'], [68.5, 'right']]);
  T.run('left', 26, true);
  const top = T.feet();
  T.goto(54.5);
  return { a, deck, b, top, chest: EF.S.chests.includes('roof'), mats: EF.S.mats.scavX || 0 };
}, Y);
ok('present: rooftop route climbs to the top deck', roof.deck <= 52.05 && roof.top <= 37.05, JSON.stringify(roof));
ok('present: rooftop secret chest opens', roof.chest && roof.mats >= 2, 'scavX=' + roof.mats);
await page.waitForTimeout(300);
await shot('12-present-rooftop');
const gone = await page.evaluate(Y => { T.toEra(0); EF.teleport(42, 72); for (let i = 0; i < 90; i++) { EF.step(1); EF.P.inv = 9; } return T.feet(); }, Y);
ok('past: the rooftops do not exist', gone >= Y + 36 - 0.05, 'feet=' + gone.toFixed(2));

// ---- new niches: giant + scavenger ----
const sp = await page.evaluate(Y => {
  T.toEra(0);
  const pg = T.findSpawn(e => e.d.niche === 'giant', [[126, Y + 35], [100, Y + 35]]);
  const ps = T.findSpawn(e => e.d.niche === 'scav', [[100, Y + 35], [60, Y + 35]]);
  T.toEra(1);
  const xg = T.findSpawn(e => e.d.niche === 'giant', [[126, Y + 35], [100, Y + 35]]);
  const xs = T.findSpawn(e => e.d.niche === 'scav', [[100, Y + 35], [30, Y + 35]]);
  return { pg, ps, xg, xs };
}, Y);
ok('past: Kapre spawns in the giant niche', sp.pg.length && sp.pg.every(s => s === 'kapre'), sp.pg.join(','));
ok('past: Taga-Punso spawns in the scavenger niche', sp.ps.length && sp.ps.every(s => s === 'punso'), sp.ps.join(','));
ok('present: Kapre Mech descends from the Kapre', sp.xg.length && sp.xg.every(s => s === 'kapremech'), sp.xg.join(','));
ok('present: Rustlings descend from the Taga-Punso', sp.xs.length && sp.xs.every(s => s === 'rustling'), sp.xs.join(','));

const pound = await page.evaluate(Y => {
  T.toEra(0); EF.clearEnemies();
  EF.teleport(30, Y + 35); EF.step(10);
  const k = EF.spawnAt('kapre', 33, Y + 36), seen = new Set(); let wave = false;
  for (let i = 0; i < 240 && !wave; i++) { EF.step(1); EF.P.inv = 9; seen.add(k.st); if (EF.projs.some(p => p.from === 'enemy' && p.type === 'wave')) wave = true; }
  return { wave, seen: [...seen] };
}, Y);
ok('Kapre winds up and ground-pounds shockwaves', pound.wave && pound.seen.includes('wind'), JSON.stringify(pound));
await page.evaluate(() => { const k = EF.enemies.find(e => e.sp === 'kapre'); if (k) { k.st = 'wind'; k.t = 0.3; } EF.spawnAt('punso', EF.P.x / 16 - 4, EF.P.y / 16 + 2); });
await page.waitForTimeout(150);
await shot('13-past-kapre-punso');

const thief = await page.evaluate(Y => {
  EF.clearEnemies();
  EF.teleport(10, Y + 35); EF.step(10);
  const it = EF.drop(30, Y + 36, 'giantP'); for (let i = 0; i < 40; i++) EF.step(1);
  const e = EF.spawnAt('punso', 36, Y + 36);
  for (let i = 0; i < 240 && !(e.loot && e.loot.length); i++) { EF.step(1); EF.P.inv = 9; }
  const stole = { got: it.got, loot: (e.loot || []).slice(), st: e.st };
  const before = EF.S.mats.giantP || 0;
  const dead = T.meleeKill(e);
  const dropped = EF.items.some(i => i.mat === 'giantP');
  for (let i = 0; i < 120; i++) { EF.step(1); EF.P.inv = 9; }
  return { stole, dead, dropped, regained: (EF.S.mats.giantP || 0) > before };
}, Y);
ok('scavenger steals a dropped material and flees', thief.stole.got && thief.stole.loot[0] === 'giantP' && thief.stole.st === 'flee', JSON.stringify(thief.stole));
ok('killing the thief drops the stolen material', thief.dead && thief.dropped && thief.regained, JSON.stringify(thief));

// giant extinction: successor + spirit at the next shrine, captured by walking into it
const ext = await page.evaluate(Y => {
  T.toEra(0); EF.clearEnemies(); EF.S.pastKills.giant = 9;
  EF.teleport(120, Y + 35); EF.step(5);
  const k = EF.spawnAt('kapre', 122, Y + 36);
  const dead = T.meleeKill(k, 1500);
  return { dead, kills: EF.S.pastKills.giant, at: EF.S.spiritAt.kapre, succ: EF.speciesFor('giant') };
}, Y);
ok('ten past kills drive the Kapre extinct', ext.dead && ext.kills === 10, JSON.stringify(ext));
ok('Kapre spirit appears at the next Anito shrine', ext.at === 2, 'shrine=' + ext.at);
const succG = await page.evaluate(Y => { T.toEra(1); return T.findSpawn(e => e.d.niche === 'giant', [[126, Y + 35], [100, Y + 35]]); }, Y);
ok('present: Ugat Colossus takes the giant niche', succG.length && succG.every(s => s === 'ugat'), succG.join(','));
await page.evaluate(() => { const u = EF.enemies.find(e => e.sp === 'ugat'); if (u) { EF.teleport(u.x / 16 - 6, u.y / 16 + u.h / 16); EF.step(2); } });
await page.waitForTimeout(250);
await shot('14-present-ugat');
const dep = await page.evaluate(() => { const alive = EF.succOf('scav'); const k = EF.S.pastKills.swarm; EF.S.pastKills.swarm = 10; const dead = EF.succOf('scav'); EF.S.pastKills.swarm = k; return { alive, dead }; });
ok('scavenger successor depends on the swarm niche', dep.alive === 'mirrormole' && dep.dead === 'cindershrew', JSON.stringify(dep));

const cap = await page.evaluate(Y => {
  EF.clearEnemies();
  const hp0 = EF.stats().maxhp;
  EF.teleport(158, Y + 35); EF.step(10);
  EF.hold('right', true);
  for (let i = 0; i < 120 && !EF.S.spirits.includes('kapre'); i++) { EF.step(1); EF.P.inv = 9; }
  EF.hold('right', false);
  return { got: EF.S.spirits.includes('kapre'), active: EF.S.spirit, pending: EF.S.spiritAt.kapre, hp0, hp1: EF.stats().maxhp };
}, Y);
ok('walking into the spirit captures it', cap.got && cap.active === 'kapre' && cap.pending === undefined, JSON.stringify(cap));
ok('Kapre spirit raises max HP', Math.round(cap.hp1 - cap.hp0) >= 30, cap.hp0 + ' -> ' + cap.hp1);
await page.evaluate(() => { for (let i = 0; i < 20; i++) EF.step(1); });
await page.waitForTimeout(200);
await shot('15-spirit-follows');

const fx = await page.evaluate(Y => {
  EF.clearEnemies(); EF.S.spirits.push('salagubang', 'wakwak', 'sigbin', 'punso');
  // Salagubang: blocks one hit, the next one lands
  EF.equip('salagubang'); EF.teleport(30, Y + 35); EF.step(5);
  EF.P.hp = EF.P.maxhp; EF.P.inv = 0;
  const s = EF.spawnAt('sigbin', EF.P.x / 16, Y + 36); EF.step(1);
  const blocked = EF.P.hp === EF.P.maxhp, cd = EF.P.shieldCd;
  EF.P.inv = 0; s.x = EF.P.x; s.y = EF.P.y + EF.P.h - s.h; EF.step(1);
  const second = EF.P.hp < EF.P.maxhp;
  // Wakwak: auto-attacks a nearby flyer
  EF.clearEnemies(); EF.equip('wakwak');
  const f = EF.spawnAt('wakwak', EF.P.x / 16 + 4, Y + 32); let dart = false;
  for (let i = 0; i < 150; i++) { EF.step(1); EF.P.inv = 9; if (EF.projs.some(p => p.type === 'dart')) dart = true; }
  const flyerHit = f.dead || f.hp < f.max;
  EF.equip('sigbin'); const crit = EF.stats().crit;
  EF.equip('punso'); const magnet = EF.stats().magnet;
  EF.equip('kapre');
  return { blocked, cd: +cd.toFixed(1), second, dart, flyerHit, crit, magnet };
}, Y);
ok('Salagubang spirit shield blocks one hit every 12 s', fx.blocked && fx.cd >= 11.9 && fx.second, JSON.stringify(fx));
ok('Wakwak spirit shoots nearby flyers', fx.dart && fx.flyerHit);
ok('Sigbin and Taga-Punso spirits change stats', fx.crit > 0.15 && fx.magnet > 150);
await page.evaluate(() => { EF.menu(true); EF.tab('spirits'); });
await page.waitForTimeout(200);
await shot('16-spirits-tab');

// forge with a deterministic roll: 100% up to +5, then a forced failure and a forced success at 90%
const forge = await page.evaluate(() => {
  for (const m of ['hunterP', 'swarmP', 'flyerP', 'scavP', 'giantP', 'hunterX', 'swarmX', 'flyerX', 'giantX', 'scavX', 'hunterS', 'swarmS', 'flyerS', 'giantS']) EF.give(m, 20);
  const base = EF.stats().dmg / (1 + 0.06 * EF.S.forge);
  EF.rng(() => 0.99);
  const ups = []; for (let i = 0; i < 5; i++) ups.push(EF.forge());
  const at5 = EF.S.forge, dmg5 = EF.stats().dmg / base;
  const hS = EF.S.mats.hunterS, sP = EF.S.mats.swarmP;
  EF.rng(() => 0.95); const fail = EF.forge();
  const afterFail = { lv: EF.S.forge, hunterS: EF.S.mats.hunterS, swarmP: EF.S.mats.swarmP };
  EF.tab('forge');
  const failText = document.getElementById('m-body').textContent;
  EF.rng(() => 0.0); const win = EF.forge();
  EF.rng(null);
  EF.tab('forge');
  const text = document.getElementById('m-body').textContent;
  return { ups, at5, dmg5: +dmg5.toFixed(3), fail, afterFail, hS, sP, win, lv: EF.S.forge, dmg6: +(EF.stats().dmg / base).toFixed(3), shows90: failText.includes('90%'), shows80: text.includes('80%') };
});
ok('forge +1..+5 always succeeds, +6% melee each', forge.ups.every(v => v === true) && forge.at5 === 5 && Math.abs(forge.dmg5 - 1.3) < 0.001, JSON.stringify(forge));
ok('failed forge consumes materials and keeps the level', forge.fail === false && forge.afterFail.lv === 5 && forge.afterFail.hunterS === forge.hS - 2 && forge.afterFail.swarmP === forge.sP - 3);
ok('successful forge raises the level to +6', forge.win === true && forge.lv === 6 && Math.abs(forge.dmg6 - 1.36) < 0.001);
ok('forge shows the success odds', forge.shows90 && forge.shows80);
await shot('17-forge-tab');

// map tab + saved explored tiles + HUD mini-map
const mp = await page.evaluate(() => {
  EF.tab('map');
  const pct = EF.explored();
  document.getElementById('mm-toggle').click();
  const saved = JSON.parse(localStorage.getItem('epochfall.save.v1') || '{}');
  return { pct, mm: EF.S.minimap, savedEx: (saved.ex || '').includes('1') };
});
ok('explored tiles are tracked and saved', mp.pct > 5 && mp.savedEx, JSON.stringify(mp));
await shot('18-map-tab');
await page.evaluate(() => EF.menu(false));
ok('mini-map toggle turns on the HUD map', mp.mm);

// combat + ecosystem
const eco = await page.evaluate(Y => {
  EF.S.pastKills.hunter = 9;
  EF.teleport(26, Y + 35); EF.step(5);
  if (EF.S.era !== 0) EF.era();
  // spawn a past sigbin next to the player via the spawn system
  EF.teleport(20, Y + 35); EF.step(5);
  for (let i = 0; i < 300 && !EF.enemies.some(e => e.sp === 'sigbin'); i++) { EF.teleport(i % 2 ? 2 : 60, Y + 35); EF.step(2); }
  const e = EF.enemies.find(e => e.sp === 'sigbin');
  if (!e) return { found: false };
  let hits = 0;
  for (let i = 0; i < 400 && !e.dead; i++) { EF.P.x = e.x - 14; EF.P.y = e.y + e.h - EF.P.h; EF.P.face = 1; EF.P.inv = 9; if (i % 12 === 0) { EF.tap('attack'); hits++; } else EF.step(1); }
  return { found: true, dead: e.dead, hits, pct: EF.S.pastKills.hunter };
}, Y);
ok('melee kills a past Sigbin', eco.found && eco.dead, JSON.stringify(eco));
ok('ten past kills make the hunter extinct', eco.pct === 10);
const succ = await page.evaluate(Y => {
  EF.teleport(86, Y + 35); EF.step(5); EF.era();
  for (let i = 0; i < 400 && !EF.enemies.some(e => e.d.niche === 'hunter'); i++) { EF.teleport(i % 2 ? 84 : 140, Y + 35); EF.step(2); }
  return EF.enemies.filter(e => e.d.niche === 'hunter').map(e => e.sp);
}, Y);
ok('present: successor species takes the niche', succ.length && succ.every(s => s === 'tiktik'), succ.join(','));
await page.evaluate(Y => { EF.teleport(30, Y + 35); EF.step(60); }, Y);
await shot('05-present-successor');

// skill tree
const sk = await page.evaluate(() => { EF.sp(5); EF.give('hunterP', 4); const a = [EF.learn('bolt'), EF.learn('swift'), EF.learn('fourth'), EF.learn('breaker')]; return { a, nodes: EF.S.nodes.length }; });
ok('skill tree nodes learnable', sk.a.every(Boolean), JSON.stringify(sk));
await page.evaluate(() => EF.menu(true));
await page.waitForTimeout(200);
await page.click('.tabs [data-tab="skills"]');
await shot('06-skill-tree');
await page.click('.tabs [data-tab="eco"]');
await shot('07-ecosystem');
await page.evaluate(() => EF.menu(false));

// breaker opens the cracked wall
const wall = await page.evaluate(Y => {
  EF.teleport(152, Y + 35); EF.P.face = 1; EF.step(10);
  for (let i = 0; i < 4; i++) { EF.tap('attack'); for (let j = 0; j < 14; j++) { EF.step(1); EF.P.inv = 9; } }
  return EF.tile(154, Y + 34);
}, Y);
ok('Kampilan Breaker shatters cracked stone', wall === 0, 'tile=' + wall);

// boss
const b1 = await page.evaluate(Y => { EF.teleport(172, Y + 35); EF.step(5); return !!EF.boss; }, Y);
ok('boss fight starts in the arena', b1);
await page.evaluate(() => { for (let i = 0; i < 160; i++) { EF.step(1); EF.P.inv = 9; } });
await shot('08-boss');
const fight = await page.evaluate(() => {
  const seen = new Set(); let maxStage = 0, frames = 0;
  while (EF.boss && frames < 60 * 120) {
    const b = EF.boss; seen.add(b.st); maxStage = Math.max(maxStage, b.stage);
    EF.P.inv = 9;
    EF.P.x = b.x + (EF.P.x < b.x ? -14 : b.w + 2); EF.P.face = EF.P.x < b.x ? 1 : -1;
    if (frames % 10 === 0) EF.tap('attack'); else EF.step(1);
    if (frames % 90 === 0) { EF.hold('jump', true); EF.step(1); EF.hold('jump', false); }
    frames++;
  }
  return { seen: [...seen], maxStage, frames, mode: EF.mode, done: EF.S.bossDone };
});
ok('boss uses several attacks', fight.seen.length >= 4, fight.seen.join(','));
ok('boss escalates stages during the fight', fight.maxStage >= 3, 'max stage ' + fight.maxStage);
ok('boss can be defeated, win screen shows', fight.done && fight.mode === 'win', JSON.stringify(fight));
await page.waitForTimeout(300);
await shot('09-win');
await page.evaluate(() => { document.getElementById('w-again').click(); });

// HUD at 844x390 in the longest language with the mini-map on
await page.evaluate(() => { document.querySelector('.langs [data-lang="fil"]').click(); EF.teleport(118, 58); EF.step(30); });
await page.waitForTimeout(400);
await shot('19-hud-fil-minimap');
await page.evaluate(() => { document.querySelector('.langs [data-lang="de"]').click(); EF.menu(true); EF.tab('eco'); });
await page.waitForTimeout(200);
await shot('20-eco-de');
await page.evaluate(() => { EF.tab('forge'); });
await shot('21-forge-de');
await page.evaluate(() => { document.querySelector('.langs [data-lang="fil"]').click(); EF.tab('spirits'); });
await shot('22-spirits-fil');
await page.evaluate(() => { EF.menu(false); document.querySelector('.langs [data-lang="en"]').click(); });


// ================= zones 2 + 3: the Balangay, Kalayaan Jungle Planet, Station Bakunawa =================
const setLangZ = l => page.evaluate(l => document.querySelector(`.langs [data-lang="${l}"]`).click(), l);
const dockT = await page.evaluate(Y => {
  EF.clearEnemies(); T.toEra(1);
  const d = EF.dock();
  if (!d) return { d };
  EF.teleport(176, Y + 35); EF.step(10);
  T.goto(d.x / 16 + 0.6);
  const btn = document.getElementById('b-time'), near = !btn.hidden, label = btn.textContent;
  EF.tap('up');
  return { d, near, label, mode: EF.mode, vis: !document.getElementById('travel').hidden, cards: [...document.querySelectorAll('.zone-card')].map(c => c.className.replace('zone-card ', '')) };
}, Y);
ok('Balangay dock appears after the Tikbalang falls and opens the travel screen (real inputs)', dockT.d && dockT.near && dockT.mode === 'travel' && dockT.vis, JSON.stringify(dockT));
ok('travel screen: zone 2 charted, zone 3 locked until the Manananggal falls', dockT.cards && dockT.cards.join() === 'here,open,locked', String(dockT.cards));
for (const l of ['en', 'fil', 'de']) { await setLangZ(l); await page.evaluate(() => EF.openTravel()); await page.waitForTimeout(120); await shot('40-travel-' + l); }
await setLangZ('en'); await page.evaluate(() => EF.openTravel());
const lockedClick = await page.evaluate(() => { document.querySelector('.zone-card[data-zone="z3"]').click(); return EF.zone.id; });
await page.click('.zone-card[data-zone="z2"]');
const z2 = await page.evaluate(() => {
  for (let i = 0; i < 60; i++) { EF.step(1); EF.P.inv = 9; }
  const sv = JSON.parse(localStorage.getItem('epochfall.save.v1'));
  return { lockedClick: null, zone: EF.zone, era: EF.S.era, label: EF.eraLabel(), mode: EF.mode, ground: EF.P.onGround, saved: sv.zone, z1: sv.zones.z1 && { done: sv.zones.z1.bossDone, kills: sv.zones.z1.pastKills.hunter, ex: (sv.zones.z1.ex || '').includes('1') }, hidden: document.getElementById('travel').hidden };
});
ok('locked zone 3 cannot be chosen', lockedClick === 'z1');
ok('zone 2 Kalayaan Jungle Planet loads with its own map, arriving in the present', z2.zone.id === 'z2' && z2.zone.mw === 170 && z2.zone.mh === 60 && z2.era === 1 && z2.mode === 'play' && z2.ground && z2.hidden, JSON.stringify(z2));
ok('zone 1 state is stashed in the save while away (boss, kills, explored tiles)', z2.saved === 'z2' && z2.z1 && z2.z1.done && z2.z1.kills === 10 && z2.z1.ex, JSON.stringify(z2.z1));
await page.waitForTimeout(200);
await shot('41-z2-present-landing');

// era switching at a zone 2 Anito shrine with real inputs
const sw2 = await page.evaluate(() => { EF.clearEnemies(); const s = EF.zone.shrines[0]; T.goto(s + 0.5); EF.tap('up'); return { era: EF.S.era, label: EF.eraLabel(), shrine: EF.S.shrine }; });
ok('zone 2: Anito shrine switches to the primal past', sw2.era === 0 && sw2.label === 'PAST · Primal age', JSON.stringify(sw2));
await page.evaluate(() => { EF.teleport(30, EF.zone.gy - 1); for (let i = 0; i < 60; i++) { EF.step(1); EF.P.inv = 0; } });
await page.waitForTimeout(200);
await shot('42-z2-past');

// zone 2 gate: the bio-dome wall is sealed glass in the present, a gap between the roots in the past
const gate2 = await page.evaluate(() => {
  const g = EF.zone.gy; T.toEra(1); EF.clearEnemies();
  EF.teleport(88, g - 1); EF.step(20);
  T.goto(101);
  const blocked = EF.P.x / 16, sealed = EF.solid(96, g - 2);
  T.goto(EF.zone.shrines[1] + 0.5); EF.tap('up');
  const era = EF.S.era, open = !EF.solid(96, g - 2);
  T.goto(102);
  return { blocked, sealed, era, open, passed: EF.P.x / 16 };
});
ok('zone 2 gate: the dome wall blocks the present, the past route passes (real inputs)', gate2.blocked < 96 && gate2.sealed && gate2.era === 0 && gate2.open && gate2.passed > 100, JSON.stringify(gate2));
// secret 1: giant-leaf stairs, then a double jump onto the mesa
const mesa = await page.evaluate(() => {
  const g = EF.zone.gy; EF.clearEnemies();
  EF.teleport(55, g - 1); EF.step(20);
  const log = T.climb([[59.5, 'right'], [64.5, 'right'], [59.5, 'left'], [64.5, 'right'], [59.5, 'left']]);
  EF.hold('right', true); EF.hold('jump', true);
  for (let i = 0; i < 18; i++) { EF.step(1); EF.P.inv = 9; }
  EF.hold('jump', false); EF.step(2); EF.hold('jump', true);
  for (let i = 0; i < 18; i++) { EF.step(1); EF.P.inv = 9; }
  EF.hold('jump', false); EF.hold('right', false);
  for (let i = 0; i < 40; i++) { EF.step(1); EF.P.inv = 9; }
  const top = T.feet();
  T.goto(68.5);
  return { log, top, chest: EF.S.chests.includes('z2mesa'), mats: EF.S.mats.z2_hunterX || 0 };
});
ok('zone 2 secret: leaf stairs + double jump reach the mesa chest', mesa.top <= 56 - 21 + 0.05 && mesa.chest && mesa.mats >= 3, JSON.stringify(mesa));
await page.waitForTimeout(150);
await shot('43-z2-mesa');
// secret 2: the hollow behind cracked stone
const hollow = await page.evaluate(() => {
  const g = EF.zone.gy; EF.clearEnemies();
  EF.teleport(110, g - 1); EF.P.face = 1; EF.step(10);
  for (let i = 0; i < 4; i++) { EF.tap('attack'); for (let j = 0; j < 14; j++) { EF.step(1); EF.P.inv = 9; } }
  const broke = EF.tile(112, g - 2) === 0 && EF.tile(113, g - 2) === 0;
  T.goto(118.5);
  return { broke, chest: EF.S.chests.includes('z2hollow') };
});
ok('zone 2 secret: Kampilan Breaker opens the hollow and its chest', hollow.broke && hollow.chest, JSON.stringify(hollow));

// every zone 2 species spawns in its era
const NI = ['hunter', 'swarm', 'flyer', 'giant', 'scav'];
const spawnCheck = (zoneSpots) => page.evaluate(([NI, spots]) => {
  const z = EF.zone, out = {};
  for (const n of NI) {
    const sp = spots[n].map(([x, dy]) => [x, z.gy + dy]);
    T.toEra(z.eras[0]); EF.respawn(); const a = T.findSpawn(e => e.d.niche === n, sp);
    T.toEra(z.eras[1]); EF.respawn(); const b = T.findSpawn(e => e.d.niche === n, sp);
    out[n] = { old: [...new Set(a)], neu: [...new Set(b)], want: EF.niches[n] };
  }
  return out;
}, [NI, zoneSpots]);
const SP2 = { hunter: [[26, -1], [104, -1], [132, -1]], swarm: [[20, -5], [106, -6]], flyer: [[36, -9], [122, -13]], giant: [[74, -1], [130, -1]], scav: [[56, -1], [102, -1]] };
const s2 = await spawnCheck(SP2);
ok('zone 2: each past species spawns (Amomongo, Alitaptap, Tigmamanukan, Sarangay, Duwende)', NI.every(n => s2[n].old.length === 1 && s2[n].old[0] === s2[n].want[0]), JSON.stringify(NI.map(n => s2[n].old)));
ok('zone 2: each present species spawns', NI.every(n => s2[n].neu.length === 1 && s2[n].neu[0] === s2[n].want[1]), JSON.stringify(NI.map(n => s2[n].neu)));
await page.evaluate(() => { const e = EF.enemies[0]; if (e) { EF.teleport(e.x / 16 - 5, EF.zone.gy - 1); } EF.step(3); });
await page.waitForTimeout(150);
await shot('44-z2-present-species');

// extinction in zone 2: ten past kills, the successor takes the niche, the spirit waits at the next shrine
const ext2 = await page.evaluate(() => {
  const g = EF.zone.gy; T.toEra(0); EF.clearEnemies(); EF.S.pastKills.hunter = 9;
  EF.teleport(60, g - 1); EF.step(5);
  const a = EF.spawnAt('amomongo', 62, g); const dead = T.meleeKill(a, 1500);
  return { dead, kills: EF.S.pastKills.hunter, at: EF.S.spiritAt.amomongo, succ: EF.speciesFor('hunter'), z1kills: EF.S.zones.z1.pastKills.hunter };
});
ok('zone 2: ten past kills drive the Amomongo extinct, per-zone kill count', ext2.dead && ext2.kills === 10 && ext2.at === 1 && ext2.z1kills === 10, JSON.stringify(ext2));
const succ2 = await page.evaluate(() => { T.toEra(1); EF.respawn(); return [...new Set(T.findSpawn(e => e.d.niche === 'hunter', [[26, EF.zone.gy - 1], [104, EF.zone.gy - 1], [132, EF.zone.gy - 1]]))]; });
ok('zone 2: Thorn Stalkers take the hunter niche in the present', succ2.length === 1 && succ2[0] === 'thornstalker', succ2.join(','));
const succAll2 = await page.evaluate(([NI, spots]) => {
  const keep = Object.assign({}, EF.S.pastKills); const out = {};
  for (const n of NI) if (n !== 'hunter') { EF.S.pastKills[n] = 10; EF.respawn(); out[n] = [...new Set(T.findSpawn(e => e.d.niche === n, spots[n].map(([x, dy]) => [x, EF.zone.gy + dy])))]; }
  Object.assign(EF.S.pastKills, keep);
  return out;
}, [NI, SP2]);
ok('zone 2: every successor spawns once its niche is extinct', NI.filter(n => n !== 'hunter').every(n => succAll2[n].length === 1 && succAll2[n][0] === EF_niche2(n)), JSON.stringify(succAll2));
function EF_niche2(n) { return s2[n].want[2]; }
const cap2 = await page.evaluate(() => {
  EF.clearEnemies(); const c0 = EF.stats().crit;
  const s = EF.zone.shrines[1]; EF.teleport(s + 1, EF.zone.gy - 1); EF.step(10);
  EF.hold('right', true); for (let i = 0; i < 120 && !EF.S.spirits.includes('amomongo'); i++) { EF.step(1); EF.P.inv = 9; } EF.hold('right', false);
  return { got: EF.S.spirits.includes('amomongo'), active: EF.S.spirit, c0, c1: EF.stats().crit };
});
ok('zone 2: the Amomongo spirit is captured and has its effect', cap2.got && cap2.active === 'amomongo' && cap2.c1 > cap2.c0 + 0.05, JSON.stringify(cap2));

// forge, map and materials work per zone
const pz = await page.evaluate(() => {
  const lv = EF.S.forge, keys = ['swarmS', 'flyerS', 'scavX'].map(EF.zm);
  const before = EF.forgeCan();
  EF.give('z2_swarmS', 2); EF.give('z2_flyerS', 1); EF.give('z2_scavX', 2);
  const z1mats = EF.S.mats.swarmS;
  const can = EF.forgeCan();
  EF.menu(true); EF.tab('forge'); const txt = document.getElementById('m-body').textContent;
  EF.rng(() => 0); const ok = EF.forge(); EF.rng(null);
  const after = { lv: EF.S.forge, z2: EF.S.mats.z2_swarmS, z1: EF.S.mats.swarmS };
  EF.tab('map'); const map = document.getElementById('m-body').textContent;
  EF.tab('bag'); const bag = document.getElementById('m-body').textContent;
  return { lv, keys, before, can, shows: txt.includes('Spore Dust') && txt.includes('Kite Membrane'), ok, after, z1mats, map: map.includes('Kalayaan') && /\d+% explored/.test(map), bag: bag.includes('Amomongo Claw') };
});
ok('zone 2 forge uses the zone 2 materials (keeps zone 1 stock)', pz.keys.join() === 'z2_swarmS,z2_flyerS,z2_scavX' && pz.can && pz.shows && pz.ok && pz.after.lv === pz.lv + 1 && pz.after.z2 === 0 && pz.after.z1 === pz.z1mats, JSON.stringify(pz));
ok('zone 2 map tab and materials list show the zone', pz.map && pz.bag);
await shot('45-z2-forge-map');
await page.evaluate(() => { EF.tab('eco'); });
await shot('46-z2-eco');
await page.evaluate(() => { EF.tab('spirits'); document.getElementById('m-body').scrollTop = 9999; });
await shot('47-z2-spirits');
await page.evaluate(() => EF.menu(false));

// Manananggal: splits, regenerates while its lower half is untouched, learns and escalates
const m0 = await page.evaluate(() => {
  const g = EF.zone.gy; EF.clearEnemies(); T.toEra(1);
  EF.teleport(146, g - 1); EF.step(5);
  const started = !!EF.boss && EF.boss.kind === 'mana';
  for (let i = 0; i < 150; i++) { EF.step(1); EF.P.inv = 9; }
  const b = EF.boss, L = b.lower;
  const split = b.st !== 'intro' && b.y + b.h < L.y - 20;
  b.hp -= 120; const h0 = b.hp; for (let i = 0; i < 60; i++) { EF.step(1); EF.P.inv = 9; } const healed = b.hp - h0;
  EF.P.x = L.x - 14; EF.P.y = L.y + L.h - EF.P.h; EF.P.face = 1; EF.tap('attack');
  for (let i = 0; i < 14; i++) { EF.step(1); EF.P.inv = 9; EF.P.x = L.x - 14; }
  const sealed = L.sealT > 0, h1 = b.hp; for (let i = 0; i < 60; i++) { EF.step(1); EF.P.inv = 9; EF.P.x = 146 * 16; } const healed2 = b.hp - h1;
  return { started, split, healed: Math.round(healed), sealed, healed2: Math.round(healed2), lhp: Math.round(L.hp) };
});
ok('Manananggal fight starts and the upper body splits off and flies', m0.started && m0.split, JSON.stringify(m0));
ok('Manananggal heals while its lower half is untouched; a hit on the lower half stops it', m0.healed > 5 && m0.sealed && m0.healed2 <= 0 && m0.lhp < 150, JSON.stringify(m0));
await page.waitForTimeout(100);
await shot('48-z2-manananggal');
const f2 = await page.evaluate(() => {
  const seen = new Set(); let maxStage = 0, frames = 0, waves = false, acid = false;
  while (EF.boss && frames < 60 * 120) {
    const b = EF.boss, L = b.lower; seen.add(b.st); maxStage = Math.max(maxStage, b.stage);
    if (EF.projs.some(p => p.type === 'acid')) acid = true; if (EF.projs.some(p => p.type === 'wave')) waves = true;
    EF.P.inv = 9;
    // fight from the ground: break the lower half, then punish the upper body when it swoops low
    const tg = L && !L.dead && L.sealT < 1 ? L : b;
    EF.P.x = tg.x + (EF.P.x < tg.x ? -14 : tg.w + 2); EF.P.y = EF.zone.gy * 16 - EF.P.h; EF.P.vy = 0; EF.P.face = EF.P.x < tg.x ? 1 : -1;
    if (frames % 10 === 0) EF.tap('attack'); else EF.step(1);
    frames++;
  }
  return { seen: [...seen], maxStage, frames, mode: EF.mode, done: EF.S.bossDone, beaten: EF.S.beaten.slice(), acid, core: EF.S.mats.z2_core || 0 };
});
ok('Manananggal uses several attacks (swoop, spit, shriek, lower-half stamp)', f2.seen.includes('swoop') && f2.seen.includes('spit') && f2.acid && f2.seen.length >= 6, JSON.stringify(f2));
ok('Manananggal escalates stages and can be defeated', f2.maxStage >= 3 && f2.done && f2.mode === 'win' && f2.core === 1, JSON.stringify(f2));
await page.waitForTimeout(300);
await shot('49-z2-win');
await page.evaluate(() => { document.getElementById('w-again').click(); });

// zone 3 unlocks: back to the Balangay at the landing site
const toZ3 = await page.evaluate(() => {
  EF.clearEnemies(); const d = EF.dock();
  EF.teleport(10, EF.zone.gy - 1); EF.step(10);
  T.goto(d.x / 16 + 0.6); EF.tap('up');
  return { mode: EF.mode, cards: [...document.querySelectorAll('.zone-card')].map(c => c.className.replace('zone-card ', '')), unlocked: EF.unlocked('z3') };
});
ok('zone 3 is charted once the Manananggal falls', toZ3.mode === 'travel' && toZ3.unlocked && toZ3.cards.join() === 'open,here,open', JSON.stringify(toZ3));
await page.waitForTimeout(120);
await shot('50-travel-z3-open');
await page.click('.zone-card[data-zone="z3"]');
const z3 = await page.evaluate(() => { for (let i = 0; i < 60; i++) { EF.step(1); EF.P.inv = 9; } return { zone: EF.zone, era: EF.S.era, label: EF.eraLabel(), ground: EF.P.onGround }; });
ok('zone 3 Station Bakunawa loads (PRESENT / FUTURE)', z3.zone.id === 'z3' && z3.zone.mw === 180 && z3.zone.eras.join() === '1,2' && z3.era === 1 && z3.label === 'PRESENT · 2087' && z3.ground, JSON.stringify(z3));
await page.waitForTimeout(200);
await shot('51-z3-present-landing');

// zone 3 gate 1: the hull breach can only be crossed on the coral grown over it by 2391
const breach = await page.evaluate(() => {
  const g = EF.zone.gy; EF.clearEnemies();
  EF.teleport(27, g - 1); EF.step(10); let maxFeet = 0;
  EF.hold('right', true); for (let i = 0; i < 40; i++) { EF.step(1); EF.P.inv = 9; maxFeet = Math.max(maxFeet, T.feet()); } EF.hold('right', false);
  for (let i = 0; i < 60; i++) { EF.step(1); EF.P.inv = 9; maxFeet = Math.max(maxFeet, T.feet()); }
  const presentX = EF.P.x / 16;
  EF.teleport(16, g - 1); EF.step(10);
  T.goto(EF.zone.shrines[0] + 0.5); EF.tap('up');
  const era = EF.S.era, label = EF.eraLabel(), solid = EF.solid(38, g);
  T.goto(50);
  return { maxFeet: +maxFeet.toFixed(2), presentX, era, label, solid, x: EF.P.x / 16, feet: T.feet() };
});
ok('zone 3: data-anito terminal switches PRESENT -> FUTURE', breach.era === 2 && breach.label === 'FUTURE · 2391', JSON.stringify(breach));
ok('zone 3 gate: the breach swallows you in the present, the 2391 coral bridge crosses it (real inputs)', breach.maxFeet > 50.5 && breach.presentX < 47 && breach.solid && breach.x > 47 && breach.feet <= 50.05, JSON.stringify(breach));
await page.waitForTimeout(200);
await shot('52-z3-future-coral');
// zone 3 gate 2: the bulkhead is grown shut in 2391 and open in 2087
const bulk = await page.evaluate(() => {
  const g = EF.zone.gy; EF.clearEnemies();
  EF.teleport(100, g - 1); EF.step(10);
  T.goto(112); const blocked = EF.P.x / 16;
  T.goto(EF.zone.shrines[1] + 0.5); EF.tap('up');
  const era = EF.S.era;
  T.goto(112);
  return { blocked, era, x: EF.P.x / 16 };
});
ok('zone 3 gate: the overgrown bulkhead blocks 2391, passes in 2087 (real inputs)', bulk.blocked < 108 && bulk.era === 1 && bulk.x > 110, JSON.stringify(bulk));
// secrets: present-only catwalks to the server loft, cracked panel to the vault
const loft = await page.evaluate(() => {
  const g = EF.zone.gy; EF.clearEnemies();
  EF.teleport(49, g - 1); EF.step(20);
  const log = T.climb([[53.5, 'right'], [58.5, 'right'], [53.5, 'left'], [58.5, 'right'], [53.5, 'left']]);
  T.run('right', 26, true); T.goto(64.5);
  const top = T.feet();
  EF.teleport(118, g - 1); EF.P.face = 1; EF.step(10);
  for (let i = 0; i < 4; i++) { EF.tap('attack'); for (let j = 0; j < 14; j++) { EF.step(1); EF.P.inv = 9; } }
  T.goto(127.5);
  return { log, top, loft: EF.S.chests.includes('z3loft'), vault: EF.S.chests.includes('z3vault') };
});
ok('zone 3 secrets: catwalk loft chest (present only) and the vault behind the cracked panel', loft.top <= 50 - 18 + 0.05 && loft.loft && loft.vault, JSON.stringify(loft));
const fut = await page.evaluate(() => { T.toEra(2); return { cat: EF.tile(52, EF.zone.gy - 3), oneWay: !EF.solid(52, EF.zone.gy - 3) }; });

const SP3 = { hunter: [[22, -1], [96, -1], [64, -1]], swarm: [[18, -5], [114, -6]], flyer: [[24, -11], [134, -11]], giant: [[88, -1], [136, -1]], scav: [[52, -1], [100, -1]] };
const s3 = await spawnCheck(SP3);
ok('zone 3: each present species spawns (Bantay, Service Mites, Lambana, Bungisngis, Alimango)', NI.every(n => s3[n].old.length === 1 && s3[n].old[0] === s3[n].want[0]), JSON.stringify(NI.map(n => s3[n].old)));
ok('zone 3: each future species spawns', NI.every(n => s3[n].neu.length === 1 && s3[n].neu[0] === s3[n].want[1]), JSON.stringify(NI.map(n => s3[n].neu)));
await page.evaluate(() => { const e = EF.enemies.find(e => e.d.beh === 'giant') || EF.enemies[0]; if (e) EF.teleport(e.x / 16 - 5, EF.zone.gy - 1); EF.step(3); });
await page.waitForTimeout(150);
await shot('53-z3-future-species');
const ext3 = await page.evaluate(() => {
  const g = EF.zone.gy; T.toEra(1); EF.clearEnemies(); EF.S.pastKills.giant = 9;
  EF.teleport(90, g - 1); EF.step(5);
  const k = EF.spawnAt('bungisngis', 92, g); const dead = T.meleeKill(k, 2000);
  const r = { dead, kills: EF.S.pastKills.giant, at: EF.S.spiritAt.bungisngis };
  T.toEra(2); EF.respawn();
  r.succ = [...new Set(T.findSpawn(e => e.d.niche === 'giant', [[88, g - 1], [136, g - 1]]))];
  return r;
});
ok('zone 3: ten PRESENT kills drive the Bungisngis Loader extinct; the Reactor Titan rules the FUTURE', ext3.dead && ext3.kills === 10 && ext3.at !== undefined && ext3.succ.length === 1 && ext3.succ[0] === 'reactortitan', JSON.stringify(ext3));
const succAll3 = await page.evaluate(([NI, spots]) => {
  const keep = Object.assign({}, EF.S.pastKills); const out = {};
  for (const n of NI) if (n !== 'giant') { EF.S.pastKills[n] = 10; EF.respawn(); out[n] = [...new Set(T.findSpawn(e => e.d.niche === n, spots[n].map(([x, dy]) => [x, EF.zone.gy + dy])))]; }
  Object.assign(EF.S.pastKills, keep);
  return out;
}, [NI, SP3]);
ok('zone 3: every successor spawns once its niche is extinct', NI.filter(n => n !== 'giant').every(n => succAll3[n].length === 1 && succAll3[n][0] === s3[n].want[2]), JSON.stringify(succAll3));
await page.evaluate(() => { const e = EF.enemies.find(e => e.sp === 'reactortitan') || EF.enemies[0]; if (e) EF.teleport(e.x / 16 - 5, EF.zone.gy - 1); EF.step(3); });

// Bakunawa: zero-g arena, swallows the light, hunts the moons, attacks from the dark
const b3 = await page.evaluate(() => {
  const g = EF.zone.gy; EF.clearEnemies(); T.toEra(1);
  // jump height outside vs inside the zero-g arena
  const apex = x => { EF.teleport(x, g - 1); for (let i = 0; i < 20; i++) EF.step(1); const y0 = EF.P.y; let m = y0; EF.hold('jump', true); for (let i = 0; i < 70; i++) { EF.step(1); EF.P.inv = 9; m = Math.min(m, EF.P.y); } EF.hold('jump', false); for (let i = 0; i < 90; i++) EF.step(1); return y0 - m; };
  const out = apex(140);
  EF.teleport(155, g - 1); EF.step(5);
  const started = !!EF.boss && EF.boss.kind === 'baku';
  for (let i = 0; i < 100; i++) { EF.step(1); EF.P.inv = 9; }
  const inArena = apex(160);
  const b = EF.boss;
  return { started, out: Math.round(out), inArena: Math.round(inArena), moons: b && b.moons.length, dark: b && +b.dark.toFixed(2) };
});
ok('Bakunawa fight starts in a zero-g arena (higher jumps) with three moons', b3.started && b3.inArena > b3.out * 1.4 && b3.moons === 3 && b3.dark >= 0.45, JSON.stringify(b3));
await page.evaluate(() => { for (let i = 0; i < 60; i++) { EF.step(1); EF.P.inv = 9; } });
await page.waitForTimeout(100);
await shot('54-z3-bakunawa');
// let it hunt a moon undisturbed: the moon is swallowed and the arena gets darker
const hunt = await page.evaluate(() => {
  const b = EF.boss, d0 = b.dark, lit0 = b.moons.filter(m => m.lit).length; let seen = b.st === 'devour', ate = false, maxDark = 0;
  EF.teleport(152, EF.zone.gy - 1);
  for (let i = 0; i < 60 * 30 && !ate; i++) { EF.step(1); EF.P.inv = 9; EF.P.x = 152 * 16; if (b.st === 'devour') seen = true; ate = b.moons.filter(m => m.lit).length < lit0; maxDark = Math.max(maxDark, b.dark); }
  for (let i = 0; i < 60; i++) { EF.step(1); EF.P.inv = 9; maxDark = Math.max(maxDark, b.dark); }
  return { seen, ate, d0: +d0.toFixed(2), maxDark: +maxDark.toFixed(2), lit0, lit: b.moons.filter(m => m.lit).length };
});
ok('Bakunawa hunts the moons; a swallowed moon darkens the arena', hunt.seen && hunt.ate && hunt.maxDark > hunt.d0 + 0.08 && hunt.lit === hunt.lit0 - 1, JSON.stringify(hunt));
await page.waitForTimeout(100);
await shot('55-z3-bakunawa-dark');
// protect a moon: hit the serpent while it swims for one
const prot = await page.evaluate(() => {
  const b = EF.boss; let saved = false;
  for (let i = 0; i < 60 * 40 && !saved; i++) {
    EF.P.inv = 9;
    if (b.st === 'devour') { EF.P.x = b.x - 14; EF.P.y = b.y + b.h - EF.P.h; EF.P.vy = 0; EF.P.face = 1; if (i % 8 === 0) { EF.tap('attack'); continue; } }
    else EF.P.x = 152 * 16;
    EF.step(1);
    if (b.saved > 0) saved = true;
  }
  return { saved, st: b.st, lit: b.moons.filter(m => m.lit).length };
});
ok('hitting the Bakunawa as it swims for a moon drives it off (moon protected)', prot.saved, JSON.stringify(prot));
const f3 = await page.evaluate(() => {
  const seen = new Set(); let maxStage = 0, frames = 0, shards = false, maxDark = 0;
  while (EF.boss && frames < 60 * 150) {
    const b = EF.boss; seen.add(b.st); maxStage = Math.max(maxStage, b.stage); maxDark = Math.max(maxDark, b.dark);
    if (EF.projs.some(p => p.type === 'shard')) shards = true;
    EF.P.inv = 9;
    EF.P.x = b.x + (EF.P.x < b.x ? -14 : b.w + 2); EF.P.y = b.y + b.h - EF.P.h; EF.P.vy = 0; EF.P.face = EF.P.x < b.x ? 1 : -1;
    // hold fire until the boss has shown its dark lunge (or 40 s), so a short fight cannot skip it
    if (frames % 10 === 0 && ((seen.has('lunge') && seen.has('eyes')) || frames > 60 * 40)) EF.tap('attack'); else EF.step(1);
    frames++;
  }
  return { seen: [...seen], maxStage, frames, mode: EF.mode, done: EF.S.bossDone, beaten: EF.S.beaten.slice(), shards, maxDark: +maxDark.toFixed(2), core: EF.S.mats.z3_core || 0 };
});
ok('Bakunawa uses several attacks (devour, lunge from the dark, shards, eclipse)', f3.seen.includes('lunge') && f3.seen.includes('eyes') && f3.seen.length >= 6, JSON.stringify(f3));
ok('Bakunawa escalates stages and can be defeated', f3.maxStage >= 3 && f3.done && f3.mode === 'win' && f3.core === 1 && f3.beaten.join() === 'z1,z2,z3', JSON.stringify(f3));
await page.waitForTimeout(300);
await shot('56-z3-win');
await page.evaluate(() => { document.getElementById('w-again').click(); EF.clearEnemies(); EF.teleport(60, EF.zone.gy - 1); for (let i = 0; i < 40; i++) EF.step(1); EF.menu(true); EF.tab('eco'); });
await shot('57-z3-eco');
for (const l of ['fil', 'de']) { await setLangZ(l); await page.evaluate(() => EF.tab('eco')); await shot('58-z3-eco-' + l); }
await setLangZ('en');
await page.evaluate(() => { EF.tab('map'); });
await shot('59-z3-map');
await page.evaluate(() => EF.menu(false));

// saves restore the zone; travelling back restores zone 1 exactly
const rest = await page.evaluate(() => {
  const ex3 = EF.explored();
  EF.toTitle();
  document.getElementById('btn-continue').click();
  const r = { zone: EF.zone.id, mw: EF.zone.mw, era: EF.S.era, done: EF.S.bossDone, bulk: EF.tile(108, EF.zone.gy - 1), ex: EF.explored(), ex3, stash: Object.keys(EF.S.zones).sort().join() };
  EF.travel('z1');
  r.z1 = { zone: EF.zone.id, mw: EF.zone.mw, done: EF.S.bossDone, kills: EF.S.pastKills.hunter, ex: EF.explored(), era: EF.S.era, stash: Object.keys(EF.S.zones).sort().join(), dock: !!EF.dock() };
  return r;
});
ok('continue restores zone 3 with its map, era and explored tiles', rest.zone === 'z3' && rest.mw === 180 && rest.done && rest.bulk === 8 && rest.ex === rest.ex3 && rest.ex > 0 && rest.stash === 'z1,z2', JSON.stringify(rest));
ok('travelling back restores zone 1 (boss, extinctions, explored map)', rest.z1.zone === 'z1' && rest.z1.mw === 200 && rest.z1.done && rest.z1.kills === 10 && rest.z1.ex > 5 && rest.z1.stash === 'z2,z3' && rest.z1.dock, JSON.stringify(rest.z1));
await page.waitForTimeout(200);
await shot('60-z1-back-dock');



// ================= round 3: classes, customization, ascension, summon, hell mode =================
const setLang = l => page.evaluate(l => document.querySelector(`.langs [data-lang="${l}"]`).click(), l);
const earned = await page.evaluate(() => EF.acc.tala);
ok('Tala is earned from kills, chests and the boss', earned >= 100 + 120 + 60 + 5, 'tala=' + earned);

// hell mode unlocks once the normal save has beaten the Tikbalang
const unl = await page.evaluate(() => { EF.toTitle(); const b = document.getElementById('btn-hell'); return { dis: b.disabled, txt: b.textContent, title: !document.getElementById('title').hidden }; });
ok('hell mode unlocks after the Tikbalang is beaten', !unl.dis && unl.title, JSON.stringify(unl));
await page.waitForTimeout(150);
await shot('23-title-hell-unlocked');

// class pick screen: both classes, previews, customization; fits 844x390 in every language
await page.click('#btn-new');
await page.waitForTimeout(150);
const fits = {};
for (const l of ['en', 'fil', 'de']) {
  await setLang(l);
  await page.waitForTimeout(120);
  fits[l] = await page.evaluate(() => { const b = document.querySelector('.pick-box'); const cards = [...document.querySelectorAll('.cls-card')].map(c => c.getBoundingClientRect()); const side = document.querySelector('.pick-side').getBoundingClientRect(); return { scroll: b.scrollHeight - b.clientHeight, sep: cards[0].right <= cards[1].left && cards[1].right <= side.left, bottom: Math.round(b.getBoundingClientRect().bottom) }; });
  await shot('24-pick-' + l);
}
await setLang('en');
const pk = await page.evaluate(() => ({ vis: !document.getElementById('pick').hidden, cards: [...document.querySelectorAll('.cls-card .nm')].map(e => e.textContent) }));
ok('new game opens the class pick with both classes', pk.vis && pk.cards.join() === 'Eskrimador,Babaylan', JSON.stringify(pk));
ok('class pick fits 844x390 without overlap in en, fil, de', Object.values(fits).every(f => f.scroll <= 0 && f.sep && f.bottom <= 390), JSON.stringify(fits));
await page.click('.cls-card[data-cls="bab"]');
for (const [c, v] of [['skin', 4], ['hair', 2], ['hairCol', 4], ['acc', 5]]) await page.click(`#pk-cust [data-c="${c}"][data-v="${v}"]`);
await page.fill('#pk-name', 'Mayumi');
await page.waitForTimeout(100);
await shot('25-pick-babaylan-custom');
await page.click('#pk-go');
await page.waitForTimeout(200);
const cust = await page.evaluate(() => {
  const sv = JSON.parse(localStorage.getItem('epochfall.save.v1'));
  const cols = EF.heroColors(), L = EF.look;
  return { cls: EF.S.cls, name: EF.S.name, look: EF.S.look, saved: { cls: sv.cls, look: sv.look, name: sv.name }, nodes: EF.S.nodes, sumBtn: !document.getElementById('b-sum').hidden,
    drawn: { skin: cols.includes(L.SKINS[4]), hair: cols.includes(L.HAIR_COLS[4]), acc: cols.includes(L.ACCENTS[5]), oldSkin: cols.includes(L.SKINS[2]) } };
});
ok('Babaylan chosen from the pick screen', cust.cls === 'bab' && cust.name === 'Mayumi' && cust.nodes.join() === 'tawag' && cust.sumBtn, JSON.stringify(cust));
ok('customization is stored in the save', cust.saved.cls === 'bab' && cust.saved.name === 'Mayumi' && JSON.stringify(cust.saved.look) === JSON.stringify({ skin: 4, hair: 2, hairCol: 4, acc: 5 }), JSON.stringify(cust.saved));
ok('customization is drawn on the player sprite', cust.drawn.skin && cust.drawn.hair && cust.drawn.acc && !cust.drawn.oldSkin, JSON.stringify(cust.drawn));

// Babaylan: staff combo, channelled spirit orb, spirit summon
const bab = await page.evaluate(Y => {
  EF.clearEnemies(); EF.teleport(30, Y + 35); EF.step(10);
  const s = EF.spawnAt('sigbin', 33, Y + 36);
  const staffDmg = EF.stats().dmg;
  const melee = T.meleeKill(s);
  // orb: hold the skill button to channel, release to cast
  EF.clearEnemies(); EF.teleport(30, Y + 35); EF.step(10); EF.P.face = 1; EF.P.en = EF.P.maxen;
  const k = EF.spawnAt('kapre', 38, Y + 36); k.st = 'rest';
  EF.hold('skill', true); for (let i = 0; i < 60; i++) { EF.step(1); EF.P.inv = 9; k.x = 38 * 16; }
  const chan = EF.P.chan, en = EF.P.en;
  EF.hold('skill', false); EF.step(1);
  const orb = EF.projs.find(p => p.type === 'orb');
  const orbInfo = orb ? { charge: +orb.charge.toFixed(2), dmg: Math.round(orb.dmg), w: orb.w } : null;
  for (let i = 0; i < 60 && k.hp >= k.max; i++) { EF.step(1); EF.P.inv = 9; }
  const orbHit = k.max - k.hp;
  // summon: needs Anito Call, the active spirit strikes the nearest foe
  const noCall = EF.summonStrike();
  EF.sp(1); const learned = EF.learn('call');
  EF.clearEnemies(); EF.P.en = EF.P.maxen;
  const f = EF.spawnAt('wakwak', EF.P.x / 16 + 6, Y + 32);
  EF.tap('summon');
  const spiritProj = EF.projs.some(p => p.type === 'spirit');
  let sumHit = 0; for (let i = 0; i < 90 && !sumHit; i++) { EF.step(1); EF.P.inv = 9; if (f.dead || f.hp < f.max) sumHit = f.max - Math.max(0, f.hp); }
  return { melee, staffDmg, chan: +chan.toFixed(2), en: Math.round(en), orbInfo, orbHit: Math.round(orbHit), noCall, learned, spiritProj, sumHit: Math.round(sumHit), sumCd: EF.P.sumCd > 0 };
}, Y);
ok('Babaylan staff combo kills a Sigbin (weaker than the blades)', bab.melee && bab.staffDmg < 12, JSON.stringify(bab));
ok('Babaylan channelled spirit orb grows and hits', bab.chan >= 0.99 && bab.orbInfo && bab.orbInfo.charge >= 0.99 && bab.orbInfo.w >= 15 && bab.orbHit >= 30);
ok('Babaylan summon: the active spirit strikes a foe', !bab.noCall && bab.learned && bab.spiritProj && bab.sumHit >= 20 && bab.sumCd);
await page.evaluate(Y => { EF.clearEnemies(); EF.teleport(28, Y + 35); EF.step(20); EF.spawnAt('kapre', 36, Y + 36).st = 'rest'; EF.P.face = 1; EF.P.en = EF.P.maxen; EF.hold('skill', true); for (let i = 0; i < 40; i++) { EF.step(1); EF.P.inv = 0; } }, Y);
await page.waitForTimeout(120);
await shot('26-babaylan-orb');
await page.evaluate(() => { EF.hold('skill', false); EF.step(1); });

// own 14-node tree, Legion strikes up to 3 foes
const tr = await page.evaluate(Y => {
  const t = EF.tree();
  EF.sp(40); EF.give('flyerP', 3); EF.give('swarmP', 4); EF.give('hunterP', 4);
  const res = {}; for (const n of t) if (n.id !== 'asc' && !EF.S.nodes.includes(n.id)) res[n.id] = EF.learn(n.id);
  EF.clearEnemies(); EF.teleport(30, Y + 35); EF.step(5); EF.P.en = EF.P.maxen; EF.P.sumCd = 0;
  for (let i = 0; i < 4; i++) EF.spawnAt('sigbin', 33 + i * 2, Y + 36).st = 'wind';
  EF.tap('summon');
  return { n: t.length, br: [...new Set(t.map(n => n.br))].join(','), res, nodes: EF.S.nodes.length, spirits: EF.projs.filter(p => p.type === 'spirit').length };
}, Y);
ok('Babaylan has its own 14-node tree (Anito, Diwata, Rites, Ascension)', tr.n === 14 && tr.br === 'anito,diwata,rites,asc' && Object.values(tr.res).every(Boolean) && tr.nodes === 13, JSON.stringify(tr));
ok('Ancestor Legion: the summon strikes 3 foes', tr.spirits === 3, 'spirit strikes=' + tr.spirits);
await page.evaluate(() => { EF.menu(true); EF.tab('skills'); });
await page.waitForTimeout(150);
await shot('27-bab-tree');
await page.evaluate(() => EF.menu(false));

// ascension: permanent markings + cut-in
const asc = await page.evaluate(() => {
  EF.clearEnemies(); const before = EF.heroColors().includes('#7dfff0');
  EF.lvl(5); EF.sp(2); const ok = EF.learn('asc');
  EF.step(30);
  return { before, ok, cut: EF.cut, after: EF.heroColors().includes('#7dfff0') };
});
await page.waitForTimeout(60);
await shot('28-ascension-cutin');
const asc2 = await page.evaluate(() => { EF.step(200); return { cut: EF.cut, mode: EF.mode }; });
ok('Ascension I plays a cut-in', asc.ok && asc.cut > 1 && asc2.cut <= 0 && asc2.mode === 'play', JSON.stringify([asc, asc2]));
ok('Ascension I adds glowing markings to the hero', !asc.before && asc.after);
await page.waitForTimeout(200);
await shot('29-ascended-ingame');

// gacha: rates, soft + hard pity, duplicates, spirits, odds table (deterministic through EF.rng)
const g = await page.evaluate(() => {
  const A = EF.acc;
  // mulberry32: small seeded PRNG, same sequence every run
  let seed = 12345; EF.rng(() => { seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; });
  const cnt = { R: 0, SR: 0, SSR: 0, UR: 0 }, N = 200000;
  for (let i = 0; i < N; i++) cnt[EF.rollRarity(1)]++;
  const pct = {}; for (const k in cnt) pct[k] = +(cnt[k] / N * 100).toFixed(2);
  const soft = [1, 73, 74, 75, 80, 89, 90].map(n => +EF.ssrChance(n).toFixed(3));
  A.tala = 5000; A.pity = 0; A.cos = {}; A.spirits = []; A.dust = 0;
  // R every time: pity climbs, a duplicate turns into Stardust
  EF.rng(() => 0.5);
  const r1 = EF.summon(1)[0], r2 = EF.summon(1)[0];
  const dup = { first: r1, second: r2, dust: A.dust };
  // 10x costs 1000 and gives 10 results
  const t0 = A.tala; const ten = EF.summon(10); const cost10 = t0 - A.tala;
  const pityAfter = A.pity;
  // an RNG that never rolls an SSR on its own: soft pity, then the guarantee by pull 90
  A.pity = 0; A.tala = 100000; EF.rng(() => 0.9999);
  let first = 0, got = null; for (let i = 1; i <= 90 && !first; i++) { const r = EF.summon(1)[0]; if (r.r === 'SSR' || r.r === 'UR') { first = i; got = r; } }
  const before69 = first > 69;
  // UR roll: Bakunawa Hatchling
  EF.rng(() => 0.001); const ur = EF.summon(1)[0];
  EF.rng(null);
  const noMoney = (() => { const keep = A.tala; A.tala = 50; const r = EF.summon(1); A.tala = keep; return r; })();
  return { pct, soft, dup, ten: ten.length, cost10, pityAfter, first, got, before69, ur, pityNow: A.pity, spirits: A.spirits.slice(), noMoney };
});
ok('summon base rates match R 79.4 / SR 18 / SSR 2.4 / UR 0.2', Math.abs(g.pct.R - 79.4) < 0.4 && Math.abs(g.pct.SR - 18) < 0.4 && Math.abs(g.pct.SSR - 2.4) < 0.15 && Math.abs(g.pct.UR - 0.2) < 0.05, JSON.stringify(g.pct));
ok('soft pity from pull 74 (+6% per pull), guaranteed by 90', g.soft[0] === 0.026 && g.soft[1] === 0.026 && g.soft[2] === 0.086 && g.soft[3] === 0.146 && g.soft[5] < 1 && g.soft[6] === 1 && g.before69 && g.first <= 90 && g.got.r === 'SSR', JSON.stringify({ soft: g.soft, first: g.first, got: g.got }));
ok('1x costs 100, 10x costs 1000 Tala; no Tala, no summon', g.ten === 10 && g.cost10 === 1000 && g.pityAfter === 12 && g.noMoney === null, JSON.stringify({ ten: g.ten, cost10: g.cost10, pity: g.pityAfter }));
ok('duplicates turn into Stardust', !g.dup.first.dup && g.dup.second.dup && g.dup.second.id === g.dup.first.id && g.dup.dust === 5, JSON.stringify(g.dup));
ok('summon-only spirits: Minokawa (SSR) and Bakunawa (UR) join the account', g.got.id === 'minokawa' && g.ur.r === 'UR' && g.ur.id === 'bakunawa' && g.spirits.includes('minokawa') && g.spirits.includes('bakunawa'), JSON.stringify([g.got, g.ur]));
const spfx = await page.evaluate(Y => {
  const d0 = EF.stats().dmg; const eq = EF.equip('bakunawa'); const d1 = EF.stats().dmg;
  EF.equip('minokawa'); EF.clearEnemies(); EF.teleport(30, Y + 35); EF.step(5); EF.P.featherCd = 0;
  const e = EF.spawnAt('kapre', 34, Y + 36); e.st = 'rest'; let feather = false;
  for (let i = 0; i < 90; i++) { EF.step(1); EF.P.inv = 9; e.st = 'rest'; if (EF.projs.some(p => p.type === 'feather')) feather = true; }
  return { eq, ratio: +(d1 / d0).toFixed(3), feather, hit: e.hp < e.max };
}, Y);
ok('summoned spirits have real effects (Bakunawa +15% damage, Minokawa feathers)', spfx.eq && spfx.ratio === 1.15 && spfx.feather && spfx.hit, JSON.stringify(spfx));
for (const l of ['en', 'fil', 'de']) {
  await setLang(l);
  await page.evaluate(() => { EF.menu(true); EF.tab('summon'); });
  await page.waitForTimeout(120);
  await shot('30-summon-' + l);
}
await setLang('en');
await page.evaluate(() => EF.tab('summon'));
await page.click('[data-odds]');
const odds = await page.evaluate(() => {
  const el = document.getElementById('odds'), txt = el ? el.textContent : '', I = window.EF_I18N.en;
  const names = EF.gacha.map(g => g.type === 'spirit' ? I['sp_' + g.id] : I['g_' + g.id]);
  const body = document.getElementById('m-body').textContent;
  return { vis: !!el && el.offsetHeight > 0, rows: el ? el.querySelectorAll('tbody tr').length : 0, allNames: names.every(n => txt.includes(n)), pcts: ['79.4%', '18%', '2.4%', '0.2%', '15.88%', '4.5%', '0.8%', '0.1%'].every(p => txt.includes(p)),
    pity: /\d+ \/ 90/.test(body), neutral: !/casino|jackpot|gambl|\bbet\b|\bwin\b|lucky|spin/i.test(body) };
});
ok('Odds button opens the full rate table (every item and rarity)', odds.vis && odds.rows === 18 && odds.allNames && odds.pcts, JSON.stringify(odds));
ok('pity counter shown, neutral wording', odds.pity && odds.neutral);
await shot('31-odds-en');
await page.evaluate(() => { document.getElementById('m-body').scrollTop = 9999; });
await shot('31-odds-en-bottom');
await setLang('de'); await page.evaluate(() => EF.tab('summon'));
await shot('31-odds-de');
await setLang('fil'); await page.evaluate(() => EF.tab('summon'));
await shot('31-odds-fil');

// Hero tab: customization + summoned cosmetics equip
const hero = await page.evaluate(() => {
  EF.acc.cos.wpn_neon = 1; EF.acc.cos.aura_moon = 1; EF.acc.cos.ttl_tide = 1; EF.acc.cos.pat_banig = 1;
  EF.tab('hero');
  const q = s => document.querySelector(s);
  q('[data-eq="wpn"][data-id="wpn_neon"]').click(); q('[data-eq="aura"][data-id="aura_moon"]').click(); q('[data-eq="ttl"][data-id="ttl_tide"]').click(); q('[data-eq="pat"][data-id="pat_banig"]').click();
  q('#m-body [data-c="acc"][data-v="1"]').click();
  const sv = JSON.parse(localStorage.getItem('epochfall.save.v1')), ac = JSON.parse(localStorage.getItem('epochfall.account.v1'));
  return { acc: sv.look.acc, equip: ac.equip, cols: EF.heroColors().includes('#ff3d8b') };
});
ok('Hero tab: change look and equip summoned cosmetics', hero.acc === 1 && hero.equip.wpn === 'wpn_neon' && hero.equip.aura === 'aura_moon' && hero.equip.ttl === 'ttl_tide' && hero.cols, JSON.stringify(hero));
for (const l of ['en', 'fil', 'de']) { await setLang(l); await page.evaluate(() => EF.tab('hero')); await page.waitForTimeout(100); await shot('32-hero-' + l); }
await setLang('en');
await page.evaluate(() => EF.menu(false));
await page.waitForTimeout(250);
await shot('33-cosmetics-ingame');

// hell mode: own slot + character, +60% enemies, boss from stage 3, one life
const shared0 = await page.evaluate(() => ({ tala: EF.acc.tala, cos: Object.keys(EF.acc.cos).sort().join(), spirits: EF.acc.spirits.slice().sort().join(), dust: EF.acc.dust }));
await page.evaluate(() => { EF.menu(true); EF.tab('hero'); });
await page.click('#to-title');
const back = await page.evaluate(() => ({ title: !document.getElementById('title').hidden, mode: EF.mode, menu: document.getElementById('menu').hidden }));
ok('Hero tab leads back to the title screen', back.title && back.mode === 'title' && back.menu, JSON.stringify(back));
await page.click('#btn-hell');
await page.waitForTimeout(120);
const hp = await page.evaluate(() => ({ pick: !document.getElementById('pick').hidden, tag: !document.getElementById('pk-hell').hidden }));
await shot('34-pick-hell');
await page.click('.cls-card[data-cls="esk"]');
await page.fill('#pk-name', 'Bagani');
await page.click('#pk-go');
const hell = await page.evaluate(Y => {
  const normal = JSON.parse(localStorage.getItem('epochfall.save.v1')), hs = JSON.parse(localStorage.getItem('epochfall.hell.v1'));
  EF.clearEnemies(); EF.teleport(30, Y + 35); EF.step(5);
  const e = EF.spawnAt('sigbin', 40, Y + 36);
  EF.P.inv = 0; const h0 = EF.P.hp; EF.hurt(10); const took = h0 - EF.P.hp;
  const eq = EF.equip('bakunawa');
  return { hell: EF.S.hell, cls: EF.S.cls, name: EF.S.name, hs: !!hs && hs.hell, normalCls: normal.cls, normalName: normal.name, ehp: e.max, took, base: EF.bossBase(), eq };
}, Y);
ok('hell mode uses its own slot and a new character', hp.pick && hp.tag && hell.hell && hell.hs && hell.name === 'Bagani' && hell.normalCls === 'bab' && hell.normalName === 'Mayumi', JSON.stringify(hell));
ok('hell mode: enemies +60% HP and damage, boss starts at stage 3', Math.abs(hell.ehp - 48) < 0.01 && hell.took === 16 && hell.base === 3);
ok('hell character can use account spirits', hell.eq);
await page.waitForTimeout(150);
await shot('35-hell-ingame');
const dead = await page.evaluate(() => {
  EF.lvl(4);
  EF.P.inv = 0; EF.P.hp = 1; EF.hurt(50); EF.step(2);
  const fl = document.getElementById('fallen');
  return { mode: EF.mode, hellSave: localStorage.getItem('epochfall.hell.v1'), normal: !!localStorage.getItem('epochfall.save.v1'), fallen: EF.acc.fallen[0], list: fl.hidden ? '' : fl.textContent,
    title: !document.getElementById('title').hidden, hellBtn: document.getElementById('btn-hell').textContent,
    tala: EF.acc.tala, cos: Object.keys(EF.acc.cos).sort().join(), spirits: EF.acc.spirits.slice().sort().join(), dust: EF.acc.dust };
});
ok('hell death deletes the hell character', dead.mode === 'title' && dead.hellSave === null && dead.normal && dead.title, JSON.stringify(dead));
ok('hell death writes name, level and time to the Fallen list', dead.fallen && dead.fallen.name === 'Bagani' && dead.fallen.lvl === 4 && typeof dead.fallen.time === 'number' && dead.list.includes('Bagani') && dead.list.includes('Lv 4'));
ok('account items survive permadeath (Tala, cosmetics, spirits, Stardust)', dead.tala === shared0.tala && dead.cos === shared0.cos && dead.spirits === shared0.spirits && dead.dust === shared0.dust && dead.spirits.includes('bakunawa'), JSON.stringify(shared0));
for (const l of ['en', 'fil', 'de']) { await setLang(l); await page.waitForTimeout(120); await shot('36-title-fallen-' + l); }
await setLang('en');
const cont = await page.evaluate(() => { document.getElementById('btn-continue').click(); return { cls: EF.S.cls, name: EF.S.name, hell: EF.S.hell }; });
ok('continue still loads the normal character after a hell death', cont.cls === 'bab' && cont.name === 'Mayumi' && !cont.hell, JSON.stringify(cont));

ok('no script errors', errors.length === 0, errors.slice(0, 3).join(' | '));

// ================= Tala shop: iOS StoreKit bridge faked in a separate browser context =================
{
  const PRE = 'com.nyrathen.epochfall.';
  const ids = ['starter', 'moonpass', 'tala_60', 'tala_300', 'tala_980', 'tala_1980', 'tala_3280', 'tala_6480'].map(k => PRE + k);
  const sctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, deviceScaleFactor: 1 });
  await sctx.addInitScript(() => {
    window.__ef = [];
    window.__buyable = () => [...document.querySelectorAll('[data-buy]')].filter(b => !b.disabled).map(b => b.dataset.buy);
    window.webkit = { messageHandlers: { ef: { postMessage: m => window.__ef.push(JSON.parse(JSON.stringify(m))) } } };
  });
  const sp = await sctx.newPage();
  const sErr = [];
  sp.on('pageerror', e => sErr.push(String(e)));
  sp.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) sErr.push(m.text()); });
  await sp.goto('file://' + path.join(web, 'index.html'));
  await sp.waitForTimeout(400);
  const sshot = async n => { if (shots) await sp.screenshot({ path: path.join(shots, n + '.png') }); };

  const s1 = await sp.evaluate(() => {
    const asked = __ef.filter(m => m.type === 'products').length;
    EF.start(true); EF.menu(true); EF.tab('summon');
    const body = document.getElementById('m-body'), note = document.getElementById('g-note'), sb = body.querySelector('[data-shop]');
    return { asked, bridge: EFShop.bridge, note: note ? note.textContent : '', noteVis: !!note && note.offsetHeight > 0, shopBtn: sb ? sb.textContent : '',
      neutral: !/casino|jackpot|gambl|\bbet\b|\bwin\b|lucky|spin/i.test(body.textContent), tala: EF.acc.tala };
  });
  ok('shop: page asks native for products on load', s1.asked === 1 && s1.bridge, JSON.stringify(s1));
  ok('Summon tab shows "Contains random items" note and a Shop button', /random items/i.test(s1.note) && /odds/i.test(s1.note) && s1.noteVis && s1.shopBtn === 'Shop' && s1.neutral, JSON.stringify(s1));
  const nag = await sp.evaluate(() => { EF.menu(false); return { overlays: document.querySelectorAll('.shop, [data-buy], .sh-card').length, badge: document.querySelectorAll('.badge, .dot, .notif').length }; });
  ok('no shop prompts or badges outside the shop view', nag.overlays === 0 && nag.badge === 0, JSON.stringify(nag));

  const s2 = await sp.evaluate(ids => {
    EF.menu(true); EF.tab('summon'); document.querySelector('[data-shop]').click();
    const before = { cards: document.querySelectorAll('.sh-card').length, enabled: [...document.querySelectorAll('[data-buy]')].filter(b => !b.disabled).length,
      restore: !!document.querySelector('[data-restore]') && !document.querySelector('[data-restore]').disabled };
    EFShop.onProducts(ids.map((id, i) => ({ id, price: 'PHP ' + (59 + i * 100) + '.00', title: id })));
    EFShop.onStorefront('PHL');
    const l60 = document.querySelector(`[data-buy="${ids[2]}"]`).textContent;
    return { before, after: [...document.querySelectorAll('[data-buy]')].filter(b => !b.disabled).length, l60 };
  }, ids);
  ok('shop lists 8 packs; localized StoreKit prices enable buying', s2.before.cards === 8 && s2.before.enabled === 0 && s2.before.restore && s2.after === 8 && s2.l60 === 'PHP 259.00', JSON.stringify(s2));
  await sshot('40-shop-en');

  const s3 = await sp.evaluate(PRE => {
    const id = PRE + 'tala_980', t0 = EF.acc.tala; __ef.length = 0;
    document.querySelector(`[data-buy="${id}"]`).click();
    const posted = JSON.stringify(__ef), busy = [...document.querySelectorAll('[data-buy]')].filter(b => !b.disabled).length;
    const noGrantYet = EF.acc.tala === t0;
    const first = EFShop.onPurchased(id, 1001);
    const t1 = EF.acc.tala;
    const dup = EFShop.onPurchased(id, '1001');
    const saved = JSON.parse(localStorage.getItem('epochfall.account.v1'));
    return { posted, busy, noGrantYet, first, dup, gain: t1 - t0, dupGain: EF.acc.tala - t1, acks: __ef.filter(m => m.type === 'ack').map(m => m.id), savedTx: saved.iapTx, savedOk: saved.tala === t1, msg: (document.getElementById('shop-msg') || {}).textContent };
  }, PRE);
  ok('buy posts {type:"buy", id} and grants nothing until native confirms', s3.posted === JSON.stringify([{ type: 'buy', id: PRE + 'tala_980' }]) && s3.busy === 0 && s3.noGrantYet, JSON.stringify(s3));
  ok('verified purchase grants 1090 Tala, saves the tx id and acks it', s3.first === true && s3.gain === 1090 && s3.savedTx.includes('1001') && s3.savedOk && s3.acks[0] === '1001' && /1090/.test(s3.msg), JSON.stringify(s3));
  ok('duplicate purchase callback does not grant twice (acked again)', s3.dup === false && s3.dupGain === 0 && s3.acks.length === 2 && s3.acks[1] === '1001');

  const s4 = await sp.evaluate(PRE => {
    const id = PRE + 'tala_60', t0 = EF.acc.tala;
    document.querySelector(`[data-buy="${id}"]`).click();
    EFShop.onFailed(id, 'error');
    const msg = document.getElementById('shop-msg').textContent, enabled = [...document.querySelectorAll('[data-buy]')].filter(b => !b.disabled).length;
    document.querySelector(`[data-buy="${id}"]`).click(); EFShop.onFailed(id, 'cancelled');
    return { gain: EF.acc.tala - t0, msg, enabled, msg2: document.getElementById('shop-msg').textContent };
  }, PRE);
  ok('failed or cancelled purchase grants nothing and re-enables buying', s4.gain === 0 && /did not go through/.test(s4.msg) && s4.enabled === 8 && /cancelled/.test(s4.msg2), JSON.stringify(s4));

  const s5 = await sp.evaluate(PRE => {
    const id = PRE + 'starter', A = EF.acc, t0 = A.tala;
    document.querySelector(`[data-buy="${id}"]`).click(); EFShop.onPurchased(id, '2001');
    const gain = A.tala - t0, btn = document.querySelector(`[data-buy="${id}"]`);
    const r = { gain, cos: A.cos.pat_tala, starter: A.starter, owned: btn.disabled && btn.textContent === 'Owned', inPool: EF.gacha.some(g => g.id === 'pat_tala') };
    const t1 = A.tala; EFShop.onPurchased(id, '2002'); r.secondGain = A.tala - t1;
    r.buyAgain = EFShop.buy(id);
    EF.tab('hero'); const chip = document.querySelector('[data-eq="pat"][data-id="pat_tala"]'); r.chip = !!chip;
    if (chip) chip.click(); r.equip = A.equip.pat;
    EF.tab('summon');
    return r;
  }, PRE);
  ok('Starter Pack: 300 Tala + exclusive SR scarf pattern, once only, not in the summon pool', s5.gain === 300 && s5.cos === 1 && s5.starter && s5.owned && !s5.inPool && s5.secondGain === 0 && s5.buyAgain === false, JSON.stringify(s5));
  ok('Starter cosmetic can be equipped in the Hero tab', s5.chip && s5.equip === 'pat_tala');

  const s6 = await sp.evaluate(PRE => {
    const A = EF.acc; A.starter = false; delete A.cos.pat_tala; A.equip.pat = null;
    const t0 = A.tala; __ef.length = 0;
    document.querySelector('[data-restore]').click();
    const posted = JSON.stringify(__ef);
    EFShop.onRestored([{ id: PRE + 'starter', txId: '2001' }]);
    const msg = document.getElementById('shop-msg').textContent;
    const saved = JSON.parse(localStorage.getItem('epochfall.account.v1'));
    EFShop.onRestored([]);
    return { posted, starter: A.starter, cos: A.cos.pat_tala, gain: A.tala - t0, msg, saved: saved.starter && saved.cos.pat_tala === 1, none: document.getElementById('shop-msg').textContent,
      owned: document.querySelector(`[data-buy="${PRE}starter"]`).disabled };
  }, PRE);
  ok('Restore purchases brings back the Starter Pack (entitlement) without new Tala', s6.posted === JSON.stringify([{ type: 'restore' }]) && s6.starter && s6.cos === 1 && s6.gain === 0 && s6.saved && /Restored: Starter Pack/.test(s6.msg) && /No purchases/.test(s6.none) && s6.owned, JSON.stringify(s6));

  const s7 = await sp.evaluate(PRE => {
    const A = EF.acc, id = PRE + 'moonpass', day = d => () => new Date(2026, 10, d, 10, 0, 0);
    EFShop.now = day(14);
    const t0 = A.tala;
    document.querySelector(`[data-buy="${id}"]`).click(); EFShop.onPurchased(id, '3001');
    const r = { buy: A.tala - t0, left: EFShop.moonLeft(), until: A.moon.until };
    r.sameDay = EFShop.claimMoon();
    EFShop.now = day(15); r.next = EFShop.claimMoon(); r.nextAgain = EFShop.claimMoon(); r.left15 = EFShop.moonLeft();
    // the Summon tab claims too (login while the menu is used)
    EFShop.now = day(16); const t16 = A.tala; EF.tab('summon'); r.tab = A.tala - t16; r.shown = document.querySelector('.sh-moon') ? document.querySelector('.sh-moon').textContent : (document.querySelector('#m-body').textContent.match(/Moon Pass: \d+ days left/) || [''])[0];
    EFShop.now = () => new Date(2026, 11, 13, 9); r.last = EFShop.claimMoon(); r.leftLast = EFShop.moonLeft();
    EFShop.now = () => new Date(2026, 11, 14, 9); r.after = EFShop.claimMoon(); r.leftAfter = EFShop.moonLeft();
    r.total = A.tala - t0;
    return r;
  }, PRE);
  ok('Moon Pass: 300 Tala + 90 today on purchase, 30 days', s7.buy === 390 && s7.left === 30 && s7.until === '2026-12-13' && s7.sameDay === 0, JSON.stringify(s7));
  ok('Moon Pass: 90 Tala once per new day (faked date change)', s7.next === 90 && s7.nextAgain === 0 && s7.left15 === 29 && s7.tab === 90 && /29|28/.test(s7.shown), JSON.stringify(s7));
  ok('Moon Pass: last payout on day 30, nothing after it expires', s7.last === 90 && s7.leftLast === 1 && s7.after === 0 && s7.leftAfter === 0 && s7.total === 390 + 90 + 90 + 90, JSON.stringify(s7));

  // login: an active pass pays out when the app starts on a new day
  await sp.evaluate(() => { const a = JSON.parse(localStorage.getItem('epochfall.account.v1')); a.moon = { until: '2999-01-01', last: '2000-01-01' }; localStorage.setItem('epochfall.account.v1', JSON.stringify(a)); window.name = String(a.tala); });
  await sp.reload(); await sp.waitForTimeout(400);
  const s8 = await sp.evaluate(() => ({ gain: EF.acc.tala - +window.name, last: EF.acc.moon.last, again: EFShop.claimMoon() }));
  ok('Moon Pass pays out on login (app start) once per day', s8.gain === 90 && s8.again === 0 && s8.last.length === 10, JSON.stringify(s8));

  const s9 = await sp.evaluate(ids => {
    EF.start(true);
    EFShop.onProducts(ids.map(id => ({ id, price: '0,99 €' })));
    const r = {};
    for (const cc of ['BEL', 'NLD']) {
      EFShop.onStorefront(cc); __ef.length = 0;
      EF.menu(true); EF.tab('summon'); if (!document.querySelector('.shop')) document.querySelector('[data-shop]').click();
      r[cc] = { locked: EFShop.locked, enabled: __buyable().length, info: (document.getElementById('shop-state') || {}).textContent, buy: EFShop.buy(ids[2]), posted: __ef.length, restore: !document.querySelector('[data-restore]').disabled };
    }
    EF.acc.tala = Math.max(EF.acc.tala, 100);
    const t0 = EF.acc.tala; r.freePull = !!EF.summon(1) && EF.acc.tala === t0 - 100;
    r.gift = (() => { EF.acc.gift = ''; const t1 = EF.acc.tala; EF.dailyGift(); return EF.acc.tala - t1; })();
    r.saved = JSON.parse(localStorage.getItem('epochfall.account.v1')).sf;
    return r;
  }, ids.slice(0));
  ok('BEL / NLD storefront: paid Tala purchases disabled, restore still works', ['BEL', 'NLD'].every(c => s9[c].locked && s9[c].enabled === 0 && /not available in your region/.test(s9[c].info) && s9[c].buy === false && s9[c].posted === 0 && s9[c].restore), JSON.stringify(s9));
  ok('BEL / NLD: free Tala still work (summon with earned Tala, daily gift)', s9.freePull && s9.gift === 100 && s9.saved === 'NLD', JSON.stringify({ free: s9.freePull, gift: s9.gift }));
  await sshot('41-shop-locked-nld');
  const s10 = await sp.evaluate(() => { EFShop.onStorefront('PHL'); EF.tab('summon'); return { locked: EFShop.locked, enabled: __buyable().length }; });
  ok('other storefronts unlock again', !s10.locked && s10.enabled === 7, JSON.stringify(s10));

  const langs = {};
  for (const l of ['fil', 'de', 'en']) {
    langs[l] = await sp.evaluate(l => { document.querySelector(`.langs [data-lang="${l}"]`).click(); EF.tab('summon');
      return { head: document.querySelector('.sh-title').textContent, restore: document.querySelector('[data-restore]').textContent, starter: document.querySelector('.sh-card.starter .nm').textContent }; }, l);
    if (l !== 'en') await sshot('42-shop-' + l);
  }
  const keys = await sp.evaluate(() => { const I = window.EF_I18N, ks = ['shop', 'shopBack', 'shopTitle', 'gachaNote', 'shopIosOnly', 'shopRegion', 'shopLocked', 'shopOwned', 'shopBusy', 'shopUnavail', 'shopLoading', 'shopBonus', 'shopRestore', 'shopRestored', 'shopNothing', 'shopGot', 'shopGotStarter', 'shopGotMoon', 'shopFailed', 'shopCancelled', 'shopPending', 'shopRules', 'p_tala', 'p_starter', 'pd_starter', 'p_moonpass', 'pd_moonpass', 'moonActive', 'moonToast', 'g_pat_tala'];
    return ks.filter(k => !I.fil[k] || !I.de[k] || !I.en[k]); });
  ok('shop strings exist in en, fil and de', keys.length === 0 && langs.fil.head === 'Tindahan ng Tala' && langs.de.restore === 'Käufe wiederherstellen' && langs.en.starter === 'Starter Pack', JSON.stringify({ keys, langs }));
  ok('no script errors in the shop context', sErr.length === 0, sErr.slice(0, 3).join(' | '));
  await sctx.close();

  // a normal browser (web preview): no native bridge, packs are shown as iOS only and cannot be bought
  const bctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, deviceScaleFactor: 1 });
  const bp = await bctx.newPage();
  const bErr = [];
  bp.on('pageerror', e => bErr.push(String(e)));
  await bp.goto('file://' + path.join(web, 'index.html'));
  await bp.waitForTimeout(300);
  const b1 = await bp.evaluate(() => {
    EF.start(true); EF.menu(true); EF.tab('summon'); document.querySelector('[data-shop]').click();
    const btns = [...document.querySelectorAll('[data-buy]')];
    return { bridge: EFShop.bridge, cards: btns.length, allOff: btns.every(b => b.disabled && b.textContent === 'Available in the iOS app'), info: document.getElementById('shop-state').textContent,
      restore: document.querySelector('[data-restore]').disabled, buy: EFShop.buy('com.nyrathen.epochfall.tala_60'), restoreCall: EFShop.restore() };
  });
  ok('browser without the native bridge: packs shown as "Available in the iOS app", buying disabled', !b1.bridge && b1.cards === 8 && b1.allOff && b1.info === 'Available in the iOS app' && b1.restore && b1.buy === false && b1.restoreCall === false && bErr.length === 0, JSON.stringify(b1));
  if (shots) await bp.screenshot({ path: path.join(shots, '43-shop-browser.png') });
  await bctx.close();
}
await browser.close();
const fails = results.filter(r => !r.pass).length;
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
