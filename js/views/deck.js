// views/deck.js — placeholder, replaced in Gün 9.
import { el } from '../ui.js';

export async function render(root, deckId) {
  root.append(el('h1', { text: `Deck ${deckId}` }), el('p', { className: 'empty', text: 'Coming soon.' }));
}
