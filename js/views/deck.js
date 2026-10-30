// views/deck.js — one deck: its cards, rename/delete, and the entry point to the card editor.
import { get, remove, getAllByIndex, removeMany } from '../db.js';
import { countDue } from '../scheduler.js';
import { formatDue } from '../dates.js';
import { el, showToast } from '../ui.js';
import { navigate, refresh } from '../router.js';
import { openDeckDialog } from './deckDialog.js';
import { openCardEditor } from './cardEditor.js';
import { updateBadge } from '../badge.js';

export async function render(root, deckId) {
  const deck = deckId ? await get('decks', deckId) : null; // "#/deck" without an id must not crash
  if (!deck) {
    // An old link or a deck deleted on another tab: explain instead of showing an empty page.
    root.append(
      el('p', { className: 'empty', text: 'Deck not found.' }),
      el('a', { className: 'btn', href: '#/decks', text: 'Back to decks' }),
    );
    return;
  }

  // The 'deckId' index returns only this deck's cards, without scanning every card in the database.
  const cards = await getAllByIndex('cards', 'deckId', deckId);
  const now = Date.now();
  const due = countDue(cards, now);

  root.append(
    el('a', { className: 'back-link', href: '#/decks', text: '← All decks' }),
    el('div', { className: 'view-header' }, [
      el('h1', { text: deck.name }),
      el('button', {
        className: 'btn btn-primary',
        type: 'button',
        text: 'Add card',
        onClick: () => openCardEditor({ deckId, onSaved: refresh }),
      }),
    ]),
  );
  if (deck.description) {
    root.append(el('p', { className: 'deck-meta', text: deck.description }));
  }
  root.append(
    el('div', { className: 'deck-actions' }, [
      el('button', {
        className: 'btn btn-primary',
        type: 'button',
        text: `Study (${due} due)`,
        disabled: due === 0,
        onClick: () => navigate(`#/study/${deckId}`),
      }),
      el('button', { className: 'btn', type: 'button', text: 'Rename', onClick: () => openDeckDialog({ deck, onSaved: refresh }) }),
      el('button', { className: 'btn btn-danger', type: 'button', text: 'Delete deck', onClick: () => deleteDeck(deck, cards) }),
    ]),
    el('h2', { text: `Cards (${cards.length})` }),
    renderCardList(cards, deckId, now),
  );
}

function renderCardList(cards, deckId, now) {
  if (cards.length === 0) {
    return el('p', { className: 'empty', text: 'No cards yet. Tap "Add card" to write your first question.' });
  }
  const sorted = [...cards].sort((a, b) => b.createdAt - a.createdAt); // newest first
  // Each row is a real <button>: it can be reached with Tab and opened with Enter, not only by mouse.
  // Its content uses <span> because a <button> may only contain inline (phrasing) elements.
  return el('ul', { className: 'card-list' }, sorted.map((card) => el('li', {}, [
    el('button', {
      className: 'card-row',
      type: 'button',
      onClick: () => openCardEditor({ deckId, card, onSaved: refresh }),
    }, [
      el('span', { className: 'card-front', text: card.front }),
      el('span', { className: 'card-meta', text: cardMeta(card, now) }),
    ]),
  ])));
}

/** "Box 2 · due in 2 days · photo · voice note" */
function cardMeta(card, now) {
  const parts = [`Box ${card.box}`, formatDue(card.due, now)];
  if (card.image) parts.push('photo');
  if (card.audio) parts.push('voice note');
  return parts.join(' · ');
}

/** Deletes the deck together with its cards and review history, then goes back to the deck list. */
async function deleteDeck(deck, cards) {
  const ok = window.confirm(`Delete "${deck.name}" and all of its cards (${cards.length})? This cannot be undone.`);
  if (!ok) return;
  try {
    // Children first, then the deck: if something fails halfway, no card is left pointing to a missing deck.
    const reviews = await getAllByIndex('reviews', 'deckId', deck.id);
    await removeMany('reviews', reviews.map((review) => review.id));
    await removeMany('cards', cards.map((card) => card.id));
    await remove('decks', deck.id);
    updateBadge(); // the deleted cards no longer count as due
  } catch (error) {
    console.error('Deleting the deck failed:', error);
    showToast('Could not delete the deck. Please try again.');
    return;
  }
  showToast('Deck deleted');
  navigate('#/decks');
}
