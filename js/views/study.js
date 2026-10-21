// views/study.js — placeholder, replaced in Gün 11.
import { el } from '../ui.js';

export async function render(root, param) {
  root.append(el('h1', { text: `Study ${param}` }), el('p', { className: 'empty', text: 'Coming soon.' }));
}
