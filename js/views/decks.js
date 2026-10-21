// views/decks.js — placeholder, replaced in Gün 8.
import { el } from '../ui.js';

export async function render(root) {
  root.append(el('h1', { text: 'Decks' }), el('p', { className: 'empty', text: 'Coming soon.' }));
}
