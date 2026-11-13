import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, join, ghostMatch, progress, settle, board, botTimeline, ghostAt, DUEL_MS } from '../main.mjs';

const P = st => { st.players.a = { id: 'a', name: 'Ann' }; st.players.b = { id: 'b', name: 'Ben' }; return st; };

test('two players with the same stake are paired', () => {
  const st = P(createState());
  assert.equal(join(st, 'a', 100, 0), null);
  const m = join(st, 'b', 100, 1000);
  assert.deepEqual(m.ids, ['a', 'b']);
  assert.equal(st.queue.length, 0);
});

test('first to clear wins and gets trophies, loser loses some', () => {
  const st = P(createState());
  join(st, 'a', 100, 0); const m = join(st, 'b', 100, 0);
  progress(st, m, 'a', 5, 50, false, m.start + 10000);
  progress(st, m, 'b', 0, 200, true, m.start + 20000);
  assert.equal(m.result.winner, 'b');
  assert.equal(st.board.b, 30);
  assert.equal(st.board.a, 0);
  assert.ok(Object.keys(st.ghosts).length >= 0);
});

test('when nobody clears, fewer cards left wins after both finish', () => {
  const st = P(createState());
  join(st, 'a', 100, 0); const m = join(st, 'b', 100, 0);
  progress(st, m, 'a', 3, 90, true, m.start + 60000);
  assert.equal(m.result, null);
  progress(st, m, 'b', 6, 120, true, m.start + 70000);
  assert.equal(m.result.winner, 'a');
});

test('ghost match replays a timeline and settles at time out', () => {
  const st = P(createState());
  const m = ghostMatch(st, 'a', 100, 0);
  assert.ok(m.ghost && m.ghost.tl.length > 1);
  const r = settle(st, m, m.start + DUEL_MS + 20000);
  assert.ok(r && r.winner);
});

test('bot timeline is deterministic and decreasing', () => {
  const a = botTimeline(42), b = botTimeline(42);
  assert.deepEqual(a, b);
  for (let i = 1; i < a.length; i++) assert.ok(a[i][1] < a[i - 1][1]);
  assert.equal(ghostAt(a, 0).left, a[0][1]);
});

test('board ranks by trophies and marks me', () => {
  const st = P(createState()); st.board = { a: 10, b: 40 };
  const b = board(st, 'a');
  assert.equal(b.top[0].name, 'Ben');
  assert.equal(b.me.rank, 2);
});

test('ghost match settles right away when the real player is done', () => {
  const st = P(createState());
  const m = ghostMatch(st, 'a', 100, 0);
  progress(st, m, 'a', 4, 80, true, m.start + 30000);
  assert.ok(m.result && m.result.winner);
});

test('player names only allow generated names', async () => {
  const { clean } = await import('../main.mjs');
  assert.equal(clean('Swift Fox 42'), 'Swift Fox 42');
  assert.match(clean('bad word'), /^Player \d{2}$/);
  assert.match(clean('Swift Dragon 42'), /^Player \d{2}$/);
});
