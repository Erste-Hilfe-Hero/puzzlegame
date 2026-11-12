// B11: asset check before new content is built. For every chain with img: true it checks img/{chain}_{0..n}.png
// and img/gen_{chain}.png, every key in DATA.art, customers, and place_k / res_k of island 1.
// Islands 2+ and event chains use emoji (no img) and are only checked for matching EN/DE counts.
// Run: node tools/check-assets.mjs  (exit code 1 when something is missing)
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web');
const ctx = {};
vm.createContext(ctx);
for (const f of ['data.js', 'i18n.js']) vm.runInContext(fs.readFileSync(path.join(WEB, f), 'utf8'), ctx, { filename: f });
const { DATA, I18N } = vm.runInContext('({ DATA, I18N })', ctx);
const miss = [];
const img = k => { if (!fs.existsSync(path.join(WEB, 'img', k + '.png'))) miss.push('img/' + k + '.png'); };
for (const [c, ch] of Object.entries(DATA.chains)) {
  if (ch.items.length !== ch.names.length) miss.push(`${c}: ${ch.items.length} items, ${ch.names.length} names`);
  const de = I18N.de.chains[c];
  if (!de || de.names.length !== ch.names.length) miss.push(`${c}: DE names missing or wrong count`);
  if (!ch.img) continue;
  const n = ch.img === true ? ch.items.length : ch.img;
  for (let l = 0; l < n; l++) img(`${c}_${l}`);
  img('gen_' + c);
}
DATA.art.forEach(img);
DATA.customers.forEach(img);
DATA.zones.forEach((z, k) => { img('place_' + k); img('res_' + k); });
(DATA.islands || []).forEach((isl, i) => {
  const de = I18N.de.islands[i];
  if (isl.places.length !== de.zones.length || isl.residents.length !== de.residents.length) miss.push(`island ${isl.id}: EN/DE count differs`);
  isl.places.forEach((p, k) => { if (p.tasks.length !== de.tasks[k].length) miss.push(`island ${isl.id} place ${k}: task count differs`); });
});
(DATA.events || []).forEach(e => { if (e.chain.items.length !== e.chain.names.length) miss.push(`event ${e.id}: items/names differ`); });
if (miss.length) { console.log('MISSING\n' + miss.join('\n')); process.exit(1); }
console.log(`assets ok: ${Object.keys(DATA.chains).length} chains, ${DATA.art.length} art keys, ${(DATA.islands || []).length} islands`);
