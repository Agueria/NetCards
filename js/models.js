// models.js — factories for the three record types stored in IndexedDB. Pure: no DOM, no storage.
//
// Record shapes (see also db.js for the stores and indexes):
//   deck   = { id, name, description, createdAt }
//   card   = { id, deckId, front, back, image, imageSide, audio, audioType, box, due, createdAt }
//   review = { id, cardId, deckId, correct, date, ts }
import { dayKey } from './dates.js';

/** crypto.randomUUID() is built into browsers and Node — no library needed for unique ids. */
function newId() {
  return crypto.randomUUID();
}

export function createDeck({ name, description = '' }, now = Date.now()) {
  return { id: newId(), name: name.trim(), description: description.trim(), createdAt: now };
}

/**
 * New cards start in Leitner box 1 and are due right away (due = creation time).
 * image / audio are Blobs (or null); imageSide says whether the photo belongs to the question or the answer.
 */
export function createCard(
  { deckId, front, back, image = null, imageSide = 'front', audio = null, audioType = '' },
  now = Date.now(),
) {
  return {
    id: newId(),
    deckId,
    front: front.trim(),
    back: back.trim(),
    image,
    imageSide,
    audio,
    audioType,
    box: 1,
    due: now,
    createdAt: now,
  };
}

/** One review = one answer given during a study session; `date` lets Stats group them per day. */
export function createReview({ cardId, deckId, correct }, now = Date.now()) {
  return { id: newId(), cardId, deckId, correct, date: dayKey(now), ts: now };
}
