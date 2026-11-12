// Text check (plan-500 F36, F38). Run before every build: node tools/check-texts.mjs [--strict]
// Errors (exit 1): an en key missing in de, placeholders {x} that differ between en and de,
//   an Amy line (amy*, ctut*) with a sentence over 12 words or a purchase word (F38, design/amy-style.md).
// Warnings (exit 1 only with --strict): keys that no script uses.
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web');
const read = f => fs.readFileSync(path.join(WEB, f), 'utf8');

// x-live keeps its texts inside its IIFE: take the two Object.assign(I18N.xx, {...}) blocks.
function assignBlocks(code) {
  const out = [];
  let at = 0;
  for (;;) {
    const s = code.indexOf('Object.assign(I18N.', at);
    if (s < 0) return out;
    let d = 0, k = code.indexOf('{', s);
    for (; k < code.length; k++) { if (code[k] === '{') d++; else if (code[k] === '}' && --d === 0) break; }
    out.push(code.slice(s, k + 1) + ');');
    at = k + 1;
  }
}

export function loadTexts() {
  const ctx = { window: {}, navigator: { language: 'en' } };
  vm.createContext(ctx);
  for (const f of ['data.js', 'i18n.js', 'x-core.js', 'x-native.js']) vm.runInContext(read(f), ctx, { filename: f });
  assignBlocks(read('x-live.js')).forEach(b => vm.runInContext(b, ctx));
  return vm.runInContext('I18N', ctx);
}

const PH = s => (String(s).match(/\{\w+\}/g) || []).sort().join();
const BUY = /\b(shop|buy|purchase|pack|kauf\w*|gems?|edelstein\w*|angebot\w*|offer\w*)\b|💎/i;

export function check() {
  const I = loadTexts();
  const errors = [], warnings = [];
  const strKeys = o => Object.keys(o).filter(k => typeof o[k] === 'string');
  for (const k of strKeys(I.en)) {
    if (typeof I.de[k] !== 'string') { errors.push(`missing de: ${k}`); continue; }
    if (PH(I.en[k]) !== PH(I.de[k])) errors.push(`placeholders differ: ${k} en[${PH(I.en[k])}] de[${PH(I.de[k])}]`);
  }
  for (const lang of ['en', 'de']) {
    for (const k of strKeys(I[lang]).filter(k => /^(amy|ctut)/.test(k))) {
      for (const line of I[lang][k].split('|')) {
        const clean = line.replace(/\{\w+\}/g, 'x').replace(/[^\p{L}\p{N}\s.!?']/gu, ' ');
        for (const sent of clean.split(/[.!?]+/)) {
          const n = sent.trim().split(/\s+/).filter(Boolean).length;
          if (n > 12) errors.push(`amy style ${lang}.${k}: ${n} words in "${sent.trim()}"`);
        }
        if (BUY.test(line)) errors.push(`amy style ${lang}.${k}: purchase word in "${line}"`);
      }
    }
  }
  const code = fs.readdirSync(WEB).filter(f => f.endsWith('.js')).map(read).join('\n');
  const prefixes = [...code.matchAll(/\bt\(\s*['`]([A-Za-z_]+)['`]?\s*\+/g), ...code.matchAll(/\bt\(\s*`([A-Za-z_]+)\$\{/g), ...code.matchAll(/\bamySay\(\s*'([A-Za-z_]+)'\s*\+/g)].map(m => m[1]);
  for (const k of strKeys(I.en)) {
    if (code.includes(`'${k}'`) || code.includes(`"${k}"`) || code.includes('`' + k + '`')) continue;
    if (prefixes.some(p => k.startsWith(p))) continue;
    warnings.push(`unused: ${k}`);
  }
  return { errors, warnings };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { errors, warnings } = check();
  errors.forEach(e => console.log('ERROR ' + e));
  warnings.forEach(w => console.log('warn  ' + w));
  console.log(`${errors.length} errors, ${warnings.length} warnings`);
  process.exit(errors.length || (process.argv.includes('--strict') && warnings.length) ? 1 : 0);
}
