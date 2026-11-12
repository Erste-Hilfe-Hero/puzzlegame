// I25: data.js consistency checks. Loads data.js, i18n.js, x-core.js and x-design.js art list without a browser.
// Run: node tools/test-data.mjs  (exit code 1 on failure)
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web');
const ctx = { console, window: {} };
vm.createContext(ctx);
for (const f of ['data.js', 'i18n.js']) vm.runInContext(fs.readFileSync(path.join(WEB, f), 'utf8'), ctx, { filename: f });
const { DATA, I18N } = vm.runInContext('({ DATA, I18N })', ctx);
const DE = I18N.de;
const img = new Set(fs.readdirSync(path.join(WEB, 'img')).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)));
// x-design.js adds perk icons and guests 5-8 to DATA.art at runtime.
const xd = fs.readFileSync(path.join(WEB, 'x-design.js'), 'utf8');
const extraArt = JSON.parse((xd.match(/const NEW_ART = (\[[^\]]*\])/) || [0, '[]'])[1].replace(/'/g, '"'));

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('ok   ' + name); } catch (e) { fail++; console.log('FAIL ' + name + '\n     ' + e.message); }
}
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m}: expected ${b} got ${a}`); };
const none = (list, m) => { if (list.length) throw new Error(`${m}: ${list.join(', ')}`); };

test('I25 mapPins, zones, residents and DE.zones/residents have the same length', () => {
  const n = DATA.zones.length;
  eq(DATA.mapPins.length, n, 'mapPins');
  eq(DATA.residents.length, n, 'residents');
  eq(DE.zones.length, n, 'DE.zones');
  eq(DE.residents.length, n, 'DE.residents');
  eq(DE.tasks.length, n, 'DE.tasks');
});

test('I25 every chain has 8 items and 8 names in en and de', () => {
  const bad = [];
  for (const [c, ch] of Object.entries(DATA.chains)) {
    if (!ch.names || ch.names.length !== 8) bad.push(`${c} en names ${ch.names && ch.names.length}`);
    const d = DE.chains[c];
    if (!d) { bad.push(`${c} missing in DE.chains`); continue; }
    if (!d.names || d.names.length !== 8) bad.push(`${c} de names ${d.names && d.names.length}`);
    if (!d.name || !d.genName) bad.push(`${c} de name/genName`);
  }
  none(bad, 'chains');
});

test('I25 DE.tasks[z] matches zones[z].tasks', () => {
  none(DATA.zones.map((z, k) => (DE.tasks[k] && DE.tasks[k].length === z.tasks.length ? '' : `zone ${k}: de ${DE.tasks[k] && DE.tasks[k].length} vs ${z.tasks.length}`)).filter(Boolean), 'tasks');
});

test('I25 every DATA.art picture exists in web/img', () => {
  none([...DATA.art, ...extraArt].filter(k => !img.has(k)), 'missing art');
});

test('I25 every chain_level picture exists in web/img', () => {
  const miss = [];
  for (const c of Object.keys(DATA.chains)) for (let l = 0; l < 8; l++) if (!img.has(`${c}_${l}`)) miss.push(`${c}_${l}`);
  none(miss, 'missing items');
});

test('I25 customers, places, residents and gem packs have pictures', () => {
  const keys = [...DATA.customers, 'chest', 'joker', 'amy_face', 'amy_full'];
  DATA.zones.forEach((z, k) => keys.push('place_' + k, 'res_' + k));
  for (let k = 0; k < 6; k++) keys.push('gem_' + k);
  none(keys.filter(k => !img.has(k)), 'missing pictures');
});

test('I25 money products have id, price and a DE name', () => {
  const bad = [...DATA.money, DATA.starter, DATA.pass].filter(p => !p.id || !p.price || !(DE.products[p.id] && DE.products[p.id].name)).map(p => p.id);
  none(bad, 'products');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
