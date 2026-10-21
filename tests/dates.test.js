// Unit tests for js/dates.js — run with `npm test` (Node's built-in test runner, no dependencies).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MS, dayKey, todayKey, shiftDays, formatDue } from '../js/dates.js';

test('dayKey formats a timestamp as YYYY-MM-DD in local time', () => {
  const ms = new Date(2026, 0, 5, 23, 30).getTime(); // 5 Jan 2026, 23:30 local (month is 0-based)
  assert.equal(dayKey(ms), '2026-01-05');
});

test('todayKey uses the given "now"', () => {
  const ms = new Date(2026, 11, 31, 1, 0).getTime();
  assert.equal(todayKey(ms), '2026-12-31');
});

test('shiftDays moves by whole calendar days, across month ends and DST changes', () => {
  const start = new Date(2026, 2, 28, 12, 0).getTime(); // 28 Mar 2026 (EU clocks change the next day)
  assert.equal(dayKey(shiftDays(start, 1)), '2026-03-29');
  assert.equal(dayKey(shiftDays(start, 4)), '2026-04-01');
  assert.equal(dayKey(shiftDays(start, -28)), '2026-02-28');
});

test('formatDue describes when a card is due', () => {
  const now = 1_000_000_000_000;
  assert.equal(formatDue(now - 1, now), 'due now');
  assert.equal(formatDue(now, now), 'due now');
  assert.equal(formatDue(now + DAY_MS / 2, now), 'due tomorrow'); // partial days round up
  assert.equal(formatDue(now + DAY_MS, now), 'due tomorrow');
  assert.equal(formatDue(now + 3 * DAY_MS, now), 'due in 3 days');
});
