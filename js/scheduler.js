// scheduler.js - Leitner box scheduling. Pure functions: no DOM, no storage, easy to test.
//
// The Leitner system: cards sit in numbered boxes. Every box doubles the waiting time:
//   box 1 → 1 day, box 2 → 2 days, box 3 → 4 days, box 4 → 8 days, box 5 → 16 days.
// A correct answer moves the card up one box; a wrong answer sends it back to box 1 and makes it
// due right away, so it comes back later in the same session until it is answered correctly.
// Compared with Anki's SM-2 there are no "ease factor" constants to explain - one formula does it all.
import { DAY_MS } from './dates.js';

export const MAX_BOX = 5;

/** Days to wait after landing in `box`: 2^(box-1). */
export function intervalDays(box) {
  return 2 ** (box - 1);
}

/** A card is due when its due time has passed. New cards have due = creation time, so they are due at once. */
export function isDue(card, now = Date.now()) {
  return card.due <= now;
}

export function countDue(cards, now = Date.now()) {
  return cards.filter((card) => isDue(card, now)).length;
}

/**
 * Returns a NEW card with the updated box and due time. The input is never changed (immutable update):
 * the caller stores the returned object, and tests can compare before/after safely.
 */
export function applyAnswer(card, correct, now = Date.now()) {
  if (!correct) {
    return { ...card, box: 1, due: now };
  }
  const box = Math.min(card.box + 1, MAX_BOX); // cap at box 5
  return { ...card, box, due: now + intervalDays(box) * DAY_MS };
}

/** Due cards in random order (Fisher-Yates shuffle on a copy, so the input array is not touched). */
export function buildQueue(cards, now = Date.now()) {
  const queue = cards.filter((card) => isDue(card, now));
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]]; // swap
  }
  return queue;
}

/** After answering the first card in the queue: drop it if correct, otherwise move the updated card to the end. */
export function advanceQueue(queue, updatedCard, correct) {
  const rest = queue.slice(1);
  return correct ? rest : [...rest, updatedCard];
}
