// Käse legen community server: players post lines, everyone votes, ranking (top / week / new).
// Moderation (App Review 1.2): word filter, no links/contacts, generated nicknames (no free-text names), report -> auto-hide
// after REPORT_HIDE reports, per-device daily post limit, banned devices, reports logged to DATA/reports.jsonl.
// Plain HTTP + JSON, no dependencies. Also serves the web build from WEB_DIR under /kaese/.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PORT = +(process.env.PORT || 8831);
const DATA = process.env.DATA_DIR || './data';
const WEB = process.env.WEB_DIR || '';
const PREFIX = '/kaese';
export const REPORT_HIDE = 3, POSTS_PER_DAY = 5, MIN_LEN = 8, MAX_LEN = 200, PAGE = 50;
const now = () => Date.now();
const DAY = 86400000;

export function createState(saved = {}) { return { lines: saved.lines || [], devs: saved.devs || {}, seq: saved.seq || 0, banned: saved.banned || [] }; }
const S = createState(load());
function load() { try { return JSON.parse(fs.readFileSync(path.join(DATA, 'state.json'), 'utf8')); } catch { return {}; } }
let dirty = false;
function persist() {
  if (!dirty) return; dirty = false;
  fs.mkdirSync(DATA, { recursive: true });
  const f = path.join(DATA, 'state.json');
  fs.writeFileSync(f + '.tmp', JSON.stringify(S));
  fs.renameSync(f + '.tmp', f);
}

// ---- moderation ----
const BAD = [
  // de
  'fick', 'ficken', 'fotze', 'hure', 'nutte', 'schlampe', 'wichs', 'wichser', 'arschloch', 'hurensohn', 'missgeburt', 'spast', '=behindert', 'schwuchtel',
  'neger', 'kanake', 'zigeuner', 'judensau', 'nazi', 'hitler', 'heil', 'vergewalt', 'titten', 'muschi', '=schwanz', 'pimmel', '=penis', 'vagina', 'sperma',
  'blowjob', '=blasen', 'porno', 'sex', '=nackt', 'bumsen', 'poppen', 'orgasmus', 'umbringen', 'töten', 'selbstmord', 'kokain', '=koks', '=crystal', '=drogen',
  '=fresse', 'verpiss', 'kys', '=opfer', '=mongo',
  // en
  'fuck', 'shit', 'bitch', 'cunt', 'whore', 'slut', 'dick', 'cock', 'pussy', 'tits', 'boobs', 'nude', 'naked', 'porn', 'cum', 'blow job', 'anal', 'rape',
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'kill yourself', 'suicide', 'cocaine', 'meth', 'horny', 'sexy', 'bastard', 'asshole', 'motherf'
];
const norm = s => String(s).toLowerCase().replace(/[0@]/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5|\$/g, 's').replace(/7/g, 't')
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
// '=word' matches whole words only (would hit harmless words like Fressen, Seifenblasen)
const BADN = BAD.map(w => (w[0] === '=' ? '=' : '') + norm(w.replace(/^=/, '')));
export function check(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length < MIN_LEN) return { ok: false, why: 'short' };
  if (t.length > MAX_LEN) return { ok: false, why: 'long' };
  if (/https?:|www\.|\.(com|de|net|org|io|me|ly)\b|@|#|\d{5,}|snap|insta|whatsapp|telegram|onlyfans/i.test(t)) return { ok: false, why: 'contact' };
  if (/(.)\1{5,}/.test(t) || (t.match(/[A-ZÄÖÜ]/g) || []).length > t.length * 0.6) return { ok: false, why: 'spam' };
  const n = ' ' + norm(t).replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ') + ' ', squash = n.replace(/ /g, '');
  for (const w of BADN) {
    const whole = w[0] === '=', wn = w.replace(/[^a-z ]/g, '');
    if (whole || wn.length <= 4 ? n.includes(' ' + wn + ' ') || n.includes(' ' + wn + 's ') : squash.includes(wn.replace(/ /g, ''))) return { ok: false, why: 'words' };
  }
  return { ok: true, text: t };
}
const ADJ_DE = ['Käsiger', 'Flinker', 'Charmanter', 'Mutiger', 'Süßer', 'Witziger', 'Cooler', 'Smarter', 'Lässiger', 'Frecher'];
const NOUN_DE = ['Gouda', 'Emmentaler', 'Brie', 'Cheddar', 'Camembert', 'Feta', 'Parmesan', 'Mozzarella', 'Edamer', 'Tilsiter'];
export const nickFor = dev => { const h = crypto.createHash('sha256').update(String(dev)).digest(); return ADJ_DE[h[0] % 10] + ' ' + NOUN_DE[h[1] % 10] + ' ' + (10 + h[2] % 90); };
const authorId = dev => crypto.createHash('sha256').update('a:' + dev).digest('hex').slice(0, 12);
const validDev = d => typeof d === 'string' && /^[a-f0-9-]{16,64}$/.test(d);

// ---- logic (exported for tests) ----
export function post(st, dev, lang, text, t = now()) {
  if (!validDev(dev)) return { error: 'dev' };
  if (st.banned.includes(authorId(dev))) return { error: 'banned' };
  const c = check(text); if (!c.ok) return { error: 'filter', why: c.why };
  const d = st.devs[dev] || (st.devs[dev] = { posts: [], votes: {}, reports: {} });
  d.posts = d.posts.filter(x => t - x < DAY);
  if (d.posts.length >= POSTS_PER_DAY) return { error: 'limit' };
  if (st.lines.some(l => l.lang === lang && norm(l.text) === norm(c.text))) return { error: 'dupe' };
  d.posts.push(t);
  const line = { id: ++st.seq, lang: lang === 'en' ? 'en' : 'de', text: c.text, author: authorId(dev), nick: nickFor(dev), t, up: 0, down: 0, reports: 0, hidden: false };
  st.lines.push(line);
  if (st.lines.length > 20000) st.lines.splice(0, st.lines.length - 20000);
  return { line: view(line, d) };
}
export function vote(st, dev, id, v) {
  if (!validDev(dev)) return { error: 'dev' };
  const l = st.lines.find(x => x.id === +id); if (!l || l.hidden) return { error: 'missing' };
  if (l.author === authorId(dev)) return { error: 'own' };
  const d = st.devs[dev] || (st.devs[dev] = { posts: [], votes: {}, reports: {} });
  const old = d.votes[l.id] || 0, nv = v > 0 ? 1 : v < 0 ? -1 : 0;
  if (old > 0) l.up--; if (old < 0) l.down--;
  if (nv > 0) l.up++; if (nv < 0) l.down++;
  if (nv) d.votes[l.id] = nv; else delete d.votes[l.id];
  return { line: view(l, d) };
}
export function report(st, dev, id, reason, t = now()) {
  if (!validDev(dev)) return { error: 'dev' };
  const l = st.lines.find(x => x.id === +id); if (!l) return { error: 'missing' };
  const d = st.devs[dev] || (st.devs[dev] = { posts: [], votes: {}, reports: {} });
  if (!d.reports[l.id]) { d.reports[l.id] = 1; l.reports++; }
  if (l.reports >= REPORT_HIDE) l.hidden = true;
  return { ok: true, hidden: l.hidden, log: { t, id: l.id, text: l.text, author: l.author, reason: String(reason || '').slice(0, 40), reports: l.reports } };
}
export const score = l => l.up - l.down;
export function list(st, dev, lang, sort, blocked = [], t = now()) {
  const d = st.devs[dev];
  let L = st.lines.filter(l => !l.hidden && l.lang === lang && !blocked.includes(l.author) && !(d && d.reports[l.id]));
  if (sort === 'new') L.sort((a, b) => b.t - a.t);
  else { if (sort === 'week') L = L.filter(l => t - l.t < 7 * DAY); L.sort((a, b) => score(b) - score(a) || b.t - a.t); }
  return { lines: L.slice(0, PAGE).map(l => view(l, d)), me: validDev(dev) ? { nick: nickFor(dev), author: authorId(dev) } : null };
}
const view = (l, d) => ({ id: l.id, text: l.text, nick: l.nick, author: l.author, t: l.t, score: score(l), up: l.up, down: l.down, my: (d && d.votes[l.id]) || 0 });

// ---- http ----
function send(res, code, obj) {
  const h = { 'content-type': 'application/json', 'cache-control': 'no-store' };
  // behind the play.nyrathen.com proxy Caddy adds the CORS headers; a second copy would break them
  if (process.env.CORS !== '0') Object.assign(h, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' });
  res.writeHead(code, h); res.end(JSON.stringify(obj));
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
const hits = new Map();
function limited(ip) { const t = now(), h = (hits.get(ip) || []).filter(x => t - x < 60000); h.push(t); hits.set(ip, h); return h.length > 120; }

function api(route, b, res, ip) {
  if (route === 'health') return send(res, 200, { ok: true, lines: S.lines.length });
  if (limited(ip)) return send(res, 429, { error: 'rate' });
  const lang = b.lang === 'en' ? 'en' : 'de';
  if (route === 'lines') return send(res, 200, list(S, b.dev, lang, b.sort, String(b.blocked || '').split(',').filter(Boolean)));
  let r;
  if (route === 'post') r = post(S, b.dev, lang, b.text);
  else if (route === 'vote') r = vote(S, b.dev, b.id, +b.v);
  else if (route === 'report') {
    r = report(S, b.dev, b.id, b.reason);
    if (r.log) { fs.mkdirSync(DATA, { recursive: true }); fs.appendFileSync(path.join(DATA, 'reports.jsonl'), JSON.stringify(r.log) + '\n'); delete r.log; }
  } else return send(res, 404, { error: 'route' });
  if (!r.error) dirty = true;
  send(res, r.error ? 400 : 200, r);
}

export function start() {
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    let p = u.pathname; if (p.startsWith(PREFIX + '/api/')) p = p.slice(PREFIX.length);
    if (req.method === 'OPTIONS') return send(res, 204, {});
    if (p.startsWith('/api/')) {
      const route = p.slice(5);
      if (req.method === 'GET') { try { return api(route, Object.fromEntries(u.searchParams), res, ip); } catch { return send(res, 500, { error: 'server' }); } }
      let raw = ''; req.on('data', c => { raw += c; if (raw.length > 8000) req.destroy(); });
      req.on('end', () => { let b = {}; try { b = JSON.parse(raw || '{}'); } catch {} try { api(route, b, res, ip); } catch { send(res, 500, { error: 'server' }); } });
      return;
    }
    if (u.pathname === PREFIX) { res.writeHead(301, { location: PREFIX + '/' }); return res.end(); }
    if (WEB && u.pathname.startsWith(PREFIX + '/')) {
      const rel = decodeURIComponent(u.pathname.slice(PREFIX.length + 1)) || 'index.html';
      const f = path.join(WEB, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
      if (f.startsWith(path.resolve(WEB)) && fs.existsSync(f) && fs.statSync(f).isFile()) {
        res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' });
        return fs.createReadStream(f).pipe(res);
      }
    }
    send(res, 404, { error: 'not found' });
  });
  setInterval(persist, 5000).unref();
  process.on('SIGTERM', () => { persist(); process.exit(0); });
  srv.listen(PORT, () => console.log('kaese server on', PORT, 'lines', S.lines.length));
  return srv;
}
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) start();
