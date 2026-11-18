// Unit tests for js/models.js - the factories that create the records stored in IndexedDB.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, createCard, createReview } from '../js/models.js';

test('createDeck trims the name and sets an id and timestamp', () => {
  const deck = createDeck({ name: '  OSI model ', description: ' layers ' }, 123);
  assert.equal(deck.name, 'OSI model');
  assert.equal(deck.description, 'layers');
  assert.equal(deck.createdAt, 123);
  assert.equal(typeof deck.id, 'string');
  assert.equal(deck.id.length, 36); // UUID v4 format: 8-4-4-4-12
});

test('createCard starts in box 1, due immediately, with no media', () => {
  const card = createCard({ deckId: 'd1', front: ' Q ', back: ' A ' }, 500);
  assert.equal(card.deckId, 'd1');
  assert.equal(card.front, 'Q');
  assert.equal(card.back, 'A');
  assert.equal(card.box, 1);
  assert.equal(card.due, 500);
  assert.equal(card.createdAt, 500);
  assert.equal(card.image, null);
  assert.equal(card.imageSide, 'front');
  assert.equal(card.audio, null);
  assert.equal(card.audioType, '');
});

test('two records never share an id', () => {
  assert.notEqual(createDeck({ name: 'a' }).id, createDeck({ name: 'a' }).id);
});

test('createReview stores the local day key', () => {
  const ts = new Date(2026, 4, 9, 22, 15).getTime();
  const review = createReview({ cardId: 'c1', deckId: 'd1', correct: true }, ts);
  assert.equal(review.date, '2026-05-09');
  assert.equal(review.ts, ts);
  assert.equal(review.correct, true);
  assert.equal(review.cardId, 'c1');
});
