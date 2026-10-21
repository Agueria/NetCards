// Unit tests for js/scheduler.js — the Leitner rules. Written before the implementation (TDD).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_BOX, intervalDays, isDue, countDue, applyAnswer, buildQueue, advanceQueue } from '../js/scheduler.js';
import { DAY_MS } from '../js/dates.js';

const NOW = 1_700_000_000_000;
// Small helper: a card with sensible defaults that each test can override.
const card = (overrides = {}) => ({ id: 'x', box: 1, due: NOW, ...overrides });

test('intervalDays doubles with every box: 1, 2, 4, 8, 16', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(intervalDays), [1, 2, 4, 8, 16]);
});

test('a card is due when its due time has passed', () => {
  assert.equal(isDue(card({ due: NOW - 1 }), NOW), true);
  assert.equal(isDue(card({ due: NOW }), NOW), true);
  assert.equal(isDue(card({ due: NOW + 1 }), NOW), false);
});

test('countDue counts only due cards', () => {
  const cards = [card({ due: NOW }), card({ due: NOW + DAY_MS }), card({ due: NOW - DAY_MS })];
  assert.equal(countDue(cards, NOW), 2);
});

test('a correct answer moves the card up one box and waits intervalDays of the new box', () => {
  const next = applyAnswer(card({ box: 2 }), true, NOW);
  assert.equal(next.box, 3);
  assert.equal(next.due, NOW + 4 * DAY_MS);
});

test('the box never goes above MAX_BOX', () => {
  const next = applyAnswer(card({ box: MAX_BOX }), true, NOW);
  assert.equal(next.box, MAX_BOX);
  assert.equal(next.due, NOW + 16 * DAY_MS);
});

test('a wrong answer sends the card back to box 1, due immediately', () => {
  const next = applyAnswer(card({ box: 4, due: NOW - DAY_MS }), false, NOW);
  assert.equal(next.box, 1);
  assert.equal(next.due, NOW);
});

test('applyAnswer never mutates the input card', () => {
  const original = card({ box: 2 });
  applyAnswer(original, true, NOW);
  assert.deepEqual(original, card({ box: 2 }));
});

test('buildQueue keeps every due card exactly once, in any order', () => {
  const cards = [card({ id: 'a' }), card({ id: 'b', due: NOW + DAY_MS }), card({ id: 'c', due: NOW - 5 })];
  const queue = buildQueue(cards, NOW);
  assert.deepEqual(queue.map((c) => c.id).sort(), ['a', 'c']); // sorted because the queue is shuffled
});

test('advanceQueue drops a correct card and re-queues a wrong one at the end', () => {
  const queue = [card({ id: 'a' }), card({ id: 'b' }), card({ id: 'c' })];
  const updatedA = { ...queue[0], box: 1 };
  assert.deepEqual(advanceQueue(queue, updatedA, true).map((c) => c.id), ['b', 'c']);
  assert.deepEqual(advanceQueue(queue, updatedA, false).map((c) => c.id), ['b', 'c', 'a']);
  assert.equal(queue.length, 3); // input untouched
});
