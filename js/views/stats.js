// views/stats.js - placeholder until the Stats screen is built.
import { el } from '../ui.js';

export async function render(root) {
  root.append(el('h1', { text: 'Stats' }), el('p', { className: 'empty', text: 'Coming soon.' }));
}
