import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, check, post, vote, report, list, nickFor, REPORT_HIDE, POSTS_PER_DAY } from '../main.mjs';

const A = 'a'.repeat(32), B = 'b'.repeat(32), C = 'c'.repeat(32), D = 'd'.repeat(32);

test('filter blocks insults, sexual words, contacts, spam; allows normal lines', () => {
  for (const bad of ['Du bist eine Schlampe haha', 'Lust auf Sex heute?', 'Schreib mir auf insta: kaese99', 'Ruf an 0171234567 jetzt',
    'Komm auf www.example.com vorbei', 'F1CK3N wir mal?', 'you are a b1tch lol', 'AAAAAAAAAAAA hallo', 'kurz'])
    assert.equal(check(bad).ok, false, bad);
  for (const good of ['Bist du ein Käsebrot? Weil ich dich zum Fressen gern hab.', 'Are you Wi-Fi? Because I feel a connection.', 'Du bist süßer als jeder Nachtisch.'])
    assert.equal(check(good).ok, true, good);
});

test('post, daily limit, duplicates, generated nickname', () => {
  const s = createState();
  const r = post(s, A, 'de', 'Bist du ein Stern? Du leuchtest so.');
  assert.ok(r.line); assert.equal(r.line.nick, nickFor(A));
  assert.equal(post(s, B, 'de', 'bist du ein stern? du leuchtest so.').error, 'dupe');
  for (let i = 1; i < POSTS_PER_DAY; i++) assert.ok(post(s, A, 'de', 'Spruch Nummer ' + 'abcdef'[i] + ' ist richtig gut').line);
  assert.equal(post(s, A, 'de', 'Noch ein ganz neuer Spruch hier').error, 'limit');
  assert.equal(post(s, 'x', 'de', 'Bist du ein Mond? Du strahlst.').error, 'dev');
});

test('votes rank lines, no self vote, vote change', () => {
  const s = createState();
  const a = post(s, A, 'de', 'Erster Spruch ist hier richtig gut').line, b = post(s, B, 'de', 'Zweiter Spruch ist noch besser').line;
  assert.equal(vote(s, A, a.id, 1).error, 'own');
  vote(s, A, b.id, 1); vote(s, C, b.id, 1); vote(s, C, a.id, -1);
  let L = list(s, D, 'de', 'top').lines;
  assert.equal(L[0].id, b.id); assert.equal(L[0].score, 2); assert.equal(L[1].score, -1);
  vote(s, C, b.id, 0); assert.equal(list(s, D, 'de', 'top').lines[0].score, 1);
  assert.equal(list(s, A, 'de', 'top').lines.find(l => l.id === b.id).my, 1);
  assert.equal(list(s, D, 'en', 'top').lines.length, 0);
});

test('reports hide for reporter at once and for everyone after threshold; blocked authors filtered', () => {
  const s = createState();
  const a = post(s, A, 'de', 'Ein Spruch der gemeldet wird').line;
  report(s, B, a.id, 'spam');
  assert.equal(list(s, B, 'de', 'new').lines.length, 0);
  assert.equal(list(s, C, 'de', 'new').lines.length, 1);
  assert.equal(list(s, C, 'de', 'new', [a.author]).lines.length, 0);
  report(s, B, a.id, 'spam');
  const ids = ['e', 'f', '1', '2'].map(x => x.repeat(32));
  for (let i = 0; i < REPORT_HIDE - 1; i++) report(s, ids[i], a.id, 'hate');
  assert.equal(list(s, C, 'de', 'new').lines.length, 0);
});
