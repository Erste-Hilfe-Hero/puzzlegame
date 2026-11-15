// Static server for Vice Cheats: web app, privacy/support pages and the live list (cheats.json) under /cheats/.
// Env: WEB_DIR (cheats/web), DATA_DIR (holds an optional cheats.json override), PORT.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(process.env.WEB_DIR || 'cheats/web');
const DATA = path.resolve(process.env.DATA_DIR || 'cheats/data');
const PORT = +(process.env.PORT || 8861);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png' };

function bundledList() {
  const src = fs.readFileSync(path.join(WEB, 'data.js'), 'utf8');
  const sandbox = { window: {} };
  new Function('window', src)(sandbox.window);
  return JSON.stringify(sandbox.window.CB_DATA);
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = decodeURIComponent(url.pathname);
  if (p === '/cheats/health') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('ok'); }
  if (!p.startsWith('/cheats')) { res.writeHead(404); return res.end(); }
  p = p.slice('/cheats'.length) || '/';
  if (p === '/') p = '/index.html';
  if (p === '/cheats.json') {
    const f = path.join(DATA, 'cheats.json');
    const body = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : bundledList();
    res.writeHead(200, { 'content-type': TYPES['.json'], 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
    return res.end(body);
  }
  const f = path.join(WEB, path.normalize(p));
  if (!f.startsWith(WEB + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log('vice cheats on', PORT));
