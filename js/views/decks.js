// views/decks.js — "Decks" screen (home): list decks with their due counts, create a deck, start studying.
import { getAll } from '../db.js';
import { countDue } from '../scheduler.js';
import { el } from '../ui.js';
import { navigate, refresh } from '../router.js';
import { getInstallState, promptInstall, dismissIosHint } from '../install.js';
import { openDeckDialog } from './deckDialog.js';

export async function render(root) {
  // Read both stores in parallel; every number on this screen is calculated from these two arrays.
  const [decks, cards] = await Promise.all([getAll('decks'), getAll('cards')]);
  const now = Date.now();
  const dueTotal = countDue(cards, now);
  const installArea = el('div', { className: 'install-area' });
  fillInstallArea(installArea);

  root.append(
    el('div', { className: 'view-header' }, [
      el('h1', { text: 'Decks' }),
      el('button', { className: 'btn btn-primary', type: 'button', text: 'New deck', onClick: () => openDeckDialog({ onSaved: refresh }) }),
    ]),
    installArea,
    el('button', {
      className: 'btn btn-study-all',
      type: 'button',
      text: `Study all due (${dueTotal})`,
      disabled: dueTotal === 0, // nothing to study yet
      onClick: () => navigate('#/study/all'),
    }),
    renderDeckList(decks, cards, now),
  );

  // The install button can appear after the first render (beforeinstallprompt fires a bit later).
  const onInstallChange = () => fillInstallArea(installArea);
  window.addEventListener('netcards:install-changed', onInstallChange);
  // Cleanup: the router calls this when we leave the screen, so listeners do not pile up.
  return () => window.removeEventListener('netcards:install-changed', onInstallChange);
}

function renderDeckList(decks, cards, now) {
  if (decks.length === 0) {
    return el('p', { className: 'empty', text: 'No decks yet. Create your first deck to start studying.' });
  }
  const sorted = [...decks].sort((a, b) => a.name.localeCompare(b.name)); // copy first, then sort A→Z
  return el('div', { className: 'deck-grid' }, sorted.map((deck) => {
    const deckCards = cards.filter((card) => card.deckId === deck.id);
    const due = countDue(deckCards, now);
    return el('article', { className: 'deck-card' }, [
      el('h2', { text: deck.name }), // textContent: a name like "<b>" is shown as text, never run as HTML
      el('p', { className: 'deck-meta', text: `Cards: ${deckCards.length} · Due: ${due}` }),
      el('div', { className: 'deck-actions' }, [
        el('button', {
          className: 'btn btn-primary',
          type: 'button',
          text: 'Study',
          disabled: due === 0,
          onClick: () => navigate(`#/study/${deck.id}`),
        }),
        el('button', { className: 'btn', type: 'button', text: 'Open', onClick: () => navigate(`#/deck/${deck.id}`) }),
      ]),
    ]);
  }));
}

/** Shows "Install app" (Chrome/Edge/Android), the iPhone instructions, or nothing — see install.js. */
function fillInstallArea(area) {
  area.replaceChildren();
  const state = getInstallState();
  if (state === 'prompt') {
    area.append(el('button', { className: 'btn btn-ghost', type: 'button', text: 'Install app', onClick: () => promptInstall() }));
  } else if (state === 'ios-hint') {
    area.append(el('p', { className: 'hint' }, [
      el('span', { text: 'Install NetCards on your iPhone: tap Share, then "Add to Home Screen". ' }),
      el('button', { className: 'btn btn-ghost btn-small', type: 'button', text: 'Got it', onClick: dismissIosHint }),
    ]));
  }
}
