// Shared vm loader for web/game.js: fake DOM, fixed clock, optional seeded Math.random.
// Used by tools/test-game.mjs and tools/sim-economy.mjs.
process.env.TZ = 'Europe/Berlin';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web');
export const FILES = ['data.js', 'i18n.js', 'x-core.js', 'x-content.js', 'x-native.js', 'game.js'].map(f => [f, fs.readFileSync(path.join(WEB, f), 'utf8')]);
export const T0 = new Date(2026, 10, 12, 12, 0, 0).getTime();

class CL {
  constructor() { this.s = new Set(); }
  add(...c) { c.forEach(x => this.s.add(x)); } remove(...c) { c.forEach(x => this.s.delete(x)); }
  toggle(c, on) { if (on === undefined) on = !this.s.has(c); if (on) this.s.add(c); else this.s.delete(c); return on; }
  contains(c) { return this.s.has(c); }
}
class El {
  constructor(id) { this.id = id; this.children = []; this.classList = new CL(); this.style = {}; this.dataset = {}; this.hidden = false; this._in = ''; this.sets = 0; this.textContent = ''; this.attrs = {}; }
  set innerHTML(h) {
    this._in = h; this.sets++;
    if (this.id === 'board') this.children = Array.from({ length: (h.match(/class="cell"/g) || []).length }, (_, i) => { const e = new El(null); e.dataset.i = String(i); return e; });
    if (this.id === 'orders') this.children = Array.from({ length: (h.match(/class="order /g) || []).length }, () => new El(null));
  }
  get innerHTML() { return this._in; }
  addEventListener() {} setPointerCapture() {} focus() {} remove() {} appendChild() {}
  querySelector() { return new El(null); } querySelectorAll() { return []; } closest() { return null; }
  setAttribute(k, v) { this.attrs[k] = v; } getBoundingClientRect() { return { left: 0, top: 0, width: 40, height: 40 }; }
  get offsetWidth() { return 0; }
}

export function boot(save, opts = {}) {
  const els = {};
  const store = { ...(save ? { 'amy-tasty-v1': typeof save === 'string' ? save : JSON.stringify(save) } : {}), ...(opts.ls || {}) };
  const document = {
    hidden: false, body: new El('body'), documentElement: {},
    getElementById: id => els[id] || (els[id] = Object.assign(new El(id), { hidden: ['modal', 'tut', 'toast', 'ghost', 'amy-pop', 'combo', 'btn-undo', 'btn-sell'].includes(id) })),
    createElement: () => new El(null), querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, elementFromPoint: () => null
  };
  const ctx = {
    TextEncoder, TextDecoder, btoa, atob, document, console, navigator: { language: opts.lang || 'en' }, location: { search: '' },
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    matchMedia: () => ({ matches: false }), requestAnimationFrame: () => 0,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, addEventListener() {}, __T: opts.T || T0
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext('Date.now = () => globalThis.__T;', ctx);
  if (opts.seed !== undefined) { ctx.__seed = opts.seed >>> 0 || 1; vm.runInContext('Math.random = () => { let x = globalThis.__seed; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; globalThis.__seed = x >>> 0; return globalThis.__seed / 4294967296; };', ctx); }
  for (const [f, code] of FILES) vm.runInContext(code, ctx, { filename: f });
  const run = code => vm.runInContext(code, ctx);
  if (!opts.keepModal) run('closeModal()');
  return { ctx, run, G: ctx.__game, S: () => ctx.__game.state, els, store, setT: t => { ctx.__T = t; } };
}

