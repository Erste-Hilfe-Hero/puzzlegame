// Mossbrook duel server: matchmaking, live progress, ghost replays, weekly trophy board. Plain HTTP + JSON polling,
// no dependencies. Also serves the web build from WEB_DIR under /mossbrook/.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PORT = +(process.env.PORT || 8801);
const DATA = process.env.DATA_DIR || './data';
const WEB = process.env.WEB_DIR || '';
const PREFIX = '/mossbrook';
export const DUEL_MS = 180000, WAIT_MS = 8000, STAKES = [100, 500, 2000];

const now = () => Date.now();
const rid = () => crypto.randomBytes(6).toString('hex');
export function weekKey(t = now()) { const d = new Date(t); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); }

export function createState(saved = {}) {
  return { players: saved.players || {}, ghosts: saved.ghosts || {}, board: saved.board || {}, week: saved.week || weekKey(), queue: [], matches: {} };
}
const S = createState(load());
function load() { try { return JSON.parse(fs.readFileSync(path.join(DATA, 'state.json'), 'utf8')); } catch { return {}; } }
function persist() {
  fs.mkdirSync(DATA, { recursive: true });
  const f = path.join(DATA, 'state.json');
  fs.writeFileSync(f + '.tmp', JSON.stringify({ players: S.players, ghosts: S.ghosts, board: S.board, week: S.week }));
  fs.renameSync(f + '.tmp', f);
}

const clean = s => String(s || '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 16) || 'Player';

// ghost = recorded timeline [[ms, left, score], ...] of a real run on the same seed; bots fill in when none exists
export function botTimeline(seed, cards = 24) {
  let a = seed * 9301 + 49297; const r = () => ((a = (a * 9301 + 49297) % 233280) / 233280);
  const pace = 3500 + r() * 3500, tl = [[0, cards, 0]]; let left = cards, score = 0, t = 0;
  const finish = r() < 0.55;
  while (left > (finish ? 0 : 1 + Math.floor(r() * 5)) && t < DUEL_MS - 5000) { t += pace * (0.5 + r()); left--; score += 6 + Math.floor(r() * 10); tl.push([Math.round(t), left, score]); }
  if (left === 0) { score += 150; tl[tl.length - 1][2] = score; }
  return tl;
}
export function ghostAt(tl, ms) { let p = tl[0]; for (const e of tl) { if (e[0] <= ms) p = e; else break; } return { left: p[1], score: p[2], done: p === tl[tl.length - 1] && (p[1] === 0 || ms >= tl[tl.length - 1][0] + 20000) }; }

export function join(st, id, stake, t = now()) {
  st.queue = st.queue.filter(q => q.id !== id && t - q.t < 30000);
  const other = st.queue.find(q => q.stake === stake);
  if (other) {
    st.queue = st.queue.filter(q => q !== other);
    return makeMatch(st, [other.id, id], stake, t);
  }
  st.queue.push({ id, stake, t });
  return null;
}
export function makeMatch(st, ids, stake, t = now(), ghost = null) {
  const mid = rid(), seed = ghost ? ghost.seed : 1 + Math.floor(Math.random() * 99999);
  const m = { mid, seed, stake, start: t + 3000, ids, ghost, prog: {}, result: null };
  ids.forEach(i => { m.prog[i] = { left: null, score: 0, done: false, tl: [] }; });
  st.matches[mid] = m;
  ids.forEach(i => { if (st.players[i]) st.players[i].mid = mid; });
  return m;
}
export function ghostMatch(st, id, stake, t = now()) {
  const keys = Object.keys(st.ghosts).filter(k => st.ghosts[k].by !== id);
  let ghost;
  if (keys.length && Math.random() < 0.8) { const g = st.ghosts[keys[Math.floor(Math.random() * keys.length)]]; ghost = { seed: g.seed, name: g.name, tl: g.tl, trophies: g.trophies || 0 }; }
  else { const seed = 1 + Math.floor(Math.random() * 99999); ghost = { seed, name: botName(seed), tl: botTimeline(seed), trophies: 0, bot: true }; }
  st.queue = st.queue.filter(q => q.id !== id);
  return makeMatch(st, [id], stake, t, ghost);
}
const BOT_NAMES = ['Hazel', 'Rowan', 'Juniper', 'Bramblefoot', 'Willa', 'Thistle', 'Ember', 'Moss', 'Fennel', 'Clover', 'Pip', 'Sorrel'];
function botName(seed) { return BOT_NAMES[seed % BOT_NAMES.length] + ' ' + (seed % 90 + 10); }

export function opponentView(st, m, id, t = now()) {
  if (m.ghost) { const g = ghostAt(m.ghost.tl, Math.max(0, t - m.start)); return { name: m.ghost.name, ...g }; }
  const o = m.ids.find(i => i !== id), p = m.prog[o];
  return { name: st.players[o]?.name || 'Player', left: p.left, score: p.score, done: p.done };
}
export function progress(st, m, id, left, score, done, t = now()) {
  const p = m.prog[id]; if (!p || p.done) return;
  p.left = left; p.score = score; p.done = !!done;
  p.tl.push([Math.max(0, t - m.start), left, score]);
  if (p.tl.length > 200) p.tl.splice(1, 1);
  settle(st, m, t);
}
// first to clear all cards wins; otherwise after both finished (or time) fewer cards left, then higher score
export function settle(st, m, t = now()) {
  if (m.result) return m.result;
  const over = t - m.start > DUEL_MS + 15000;
  const sides = m.ids.map(i => ({ id: i, ...m.prog[i] }));
  if (m.ghost) {
    // once every real player is done the ghost's outcome is already known: jump to its final state
    const realDone = sides.every(s => s.done), last = m.ghost.tl[m.ghost.tl.length - 1];
    const g = realDone ? { left: last[1], score: last[2], done: true } : ghostAt(m.ghost.tl, Math.max(0, t - m.start));
    const gtl = realDone ? m.ghost.tl : m.ghost.tl.filter(e => e[0] <= t - m.start);
    sides.push({ id: 'ghost', left: g.left, score: g.score, done: g.done || over, tl: gtl.length ? gtl : [m.ghost.tl[0]] });
  }
  const clear = sides.filter(s => s.left === 0).sort((a, b) => (a.tl.at(-1)?.[0] ?? 9e9) - (b.tl.at(-1)?.[0] ?? 9e9));
  let winner = null;
  if (clear.length) winner = clear[0].id;
  else if (sides.every(s => s.done) || over) {
    const [a, b] = sides;
    const la = a.left ?? 99, lb = b.left ?? 99;
    winner = la !== lb ? (la < lb ? a.id : b.id) : a.score !== b.score ? (a.score > b.score ? a.id : b.id) : 'draw';
  }
  if (!winner) return null;
  m.result = { winner, at: t };
  for (const s of sides) {
    if (s.id === 'ghost') continue;
    const pl = st.players[s.id]; if (!pl) continue;
    const delta = winner === 'draw' ? 5 : winner === s.id ? 30 : -10;
    rollWeek(st);
    st.board[s.id] = Math.max(0, (st.board[s.id] || 0) + delta);
    pl.trophies = st.board[s.id];
    if (s.tl.length > 3) st.ghosts[m.seed + ':' + s.id] = { seed: m.seed, by: s.id, name: pl.name, tl: s.tl, trophies: pl.trophies };
  }
  const gk = Object.keys(st.ghosts); if (gk.length > 400) delete st.ghosts[gk[0]];
  return m.result;
}
export function rollWeek(st) { const w = weekKey(); if (st.week !== w) { st.week = w; st.board = {}; } }
export function board(st, id) {
  rollWeek(st);
  const all = Object.entries(st.board).sort((a, b) => b[1] - a[1]);
  const top = all.slice(0, 50).map(([pid, tr], i) => ({ rank: i + 1, name: st.players[pid]?.name || 'Player', trophies: tr, me: pid === id }));
  const mi = all.findIndex(([pid]) => pid === id);
  return { week: st.week, top, me: mi >= 0 ? { rank: mi + 1, trophies: all[mi][1] } : null };
}

// ---------- HTTP ----------
function send(res, code, obj) {
  const h = { 'content-type': 'application/json', 'cache-control': 'no-store' };
  // behind the play.nyrathen.com proxy Caddy adds the CORS headers; a second copy would break them
  if (process.env.CORS !== '0') Object.assign(h, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' });
  res.writeHead(code, h);
  res.end(JSON.stringify(obj));
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
function auth(body) { const p = S.players[body.id]; return p && p.key === body.key ? p : null; }

async function api(route, body, res) {
  const t = now();
  if (route === 'health') return send(res, 200, { ok: true, players: Object.keys(S.players).length, matches: Object.keys(S.matches).length });
  if (route === 'hello') {
    let p = auth(body);
    if (!p) { const id = rid(), key = crypto.randomBytes(12).toString('hex'); p = S.players[id] = { id, key, name: clean(body.name), trophies: 0, created: t }; }
    else if (body.name) p.name = clean(body.name);
    p.seen = t;
    return send(res, 200, { id: p.id, key: p.key, name: p.name, trophies: S.board[p.id] || 0 });
  }
  if (route === 'board') return send(res, 200, board(S, body.id));
  const p = auth(body); if (!p) return send(res, 401, { error: 'auth' });
  if (route === 'join') {
    const stake = STAKES.includes(body.stake) ? body.stake : STAKES[0];
    p.mid = null; p.joined = t;
    const m = join(S, p.id, stake, t);
    return send(res, 200, m ? matchInfo(m, p.id, t) : { wait: true });
  }
  if (route === 'poll') {
    let m = p.mid && S.matches[p.mid];
    if (!m && S.queue.some(q => q.id === p.id) && t - (p.joined || t) > WAIT_MS) m = ghostMatch(S, p.id, S.queue.find(q => q.id === p.id).stake, t), p.mid = m.mid;
    return send(res, 200, m ? matchInfo(m, p.id, t) : { wait: true });
  }
  if (route === 'leave') { S.queue = S.queue.filter(q => q.id !== p.id); return send(res, 200, { ok: true }); }
  if (route === 'progress') {
    const m = S.matches[body.mid]; if (!m || !m.ids.includes(p.id)) return send(res, 404, { error: 'match' });
    progress(S, m, p.id, +body.left, +body.score, body.done, t);
    settle(S, m, t);
    return send(res, 200, { opp: opponentView(S, m, p.id, t), result: m.result, trophies: S.board[p.id] || 0 });
  }
  return send(res, 404, { error: 'route' });
}
function matchInfo(m, id, t) { return { mid: m.mid, seed: m.seed, stake: m.stake, startIn: Math.max(0, m.start - t), duelMs: DUEL_MS, opp: opponentView(S, m, id, t), oppTrophies: m.ghost ? m.ghost.trophies : (S.board[m.ids.find(i => i !== id)] || 0) }; }

function serveFile(urlPath, res) {
  if (!WEB) { res.writeHead(404); return res.end(); }
  let rel = decodeURIComponent(urlPath.slice(PREFIX.length)) || '/';
  if (rel.endsWith('/')) rel += 'index.html';
  const f = path.join(WEB, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!f.startsWith(path.resolve(WEB))) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': f.endsWith('.html') ? 'no-cache' : 'max-age=3600' });
    res.end(buf);
  });
}

export function start() {
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    let p = u.pathname; if (p.startsWith(PREFIX + '/api/')) p = p.slice(PREFIX.length);
    if (req.method === 'OPTIONS') return send(res, 204, {});
    if (p.startsWith('/api/')) {
      const route = p.slice(5);
      if (req.method === 'GET') return api(route, Object.fromEntries(u.searchParams), res).catch(() => send(res, 500, { error: 'server' }));
      let raw = ''; req.on('data', c => { raw += c; if (raw.length > 20000) req.destroy(); });
      req.on('end', () => { let b = {}; try { b = JSON.parse(raw || '{}'); } catch {} api(route, b, res).catch(() => send(res, 500, { error: 'server' })); });
      return;
    }
    if (u.pathname === PREFIX) { res.writeHead(301, { location: PREFIX + '/' }); return res.end(); }
    if (u.pathname.startsWith(PREFIX + '/')) return serveFile(u.pathname, res);
    res.writeHead(404); res.end();
  });
  srv.listen(PORT, () => console.log('mossbrook server on', PORT, 'web', WEB || '-'));
  setInterval(() => {
    const t = now();
    for (const [k, m] of Object.entries(S.matches)) { settle(S, m, t); if (t - m.start > DUEL_MS + 120000) delete S.matches[k]; }
    try { persist(); } catch (e) { console.error('persist', e.message); }
  }, 10000);
  return srv;
}
if (process.argv[1] && process.argv[1].endsWith('main.mjs')) start();
