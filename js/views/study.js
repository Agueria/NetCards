// views/study.js - study session: show due cards one by one, grade them, update the schedule.
// Flow: question → "Show answer" → answer (+ photo/voice note) → Wrong / Correct → next card → summary.
import { getAll, getAllByIndex, put } from '../db.js';
import { createReview } from '../models.js';
import { applyAnswer, buildQueue, advanceQueue } from '../scheduler.js';
import { formatDue } from '../dates.js';
import { el, showToast } from '../ui.js';
import { updateBadge } from '../badge.js';

export async function render(root, param) {
  // '#/study/all' studies every deck; '#/study/<deckId>' studies one deck.
  const deckId = param === 'all' ? null : param;
  const cards = deckId ? await getAllByIndex('cards', 'deckId', deckId) : await getAll('cards');
  const backHash = deckId ? `#/deck/${deckId}` : '#/decks';

  // Session state. `queue` holds the cards still to answer; a wrong card is put back at its end.
  let queue = buildQueue(cards);
  const total = queue.length;
  let answered = 0;
  let correctCount = 0;
  let nextDue = Infinity; // earliest next review among the cards answered correctly
  let revealed = false;   // true while the answer side is visible - grading is only allowed then
  const objectUrls = [];  // blob URLs for photos/audio, revoked when leaving the screen

  const container = el('section', { className: 'study' });
  root.append(container);

  if (total === 0) {
    container.append(
      el('p', { className: 'empty', text: 'Nothing is due right now. Come back later or add new cards.' }),
      el('a', { className: 'btn', href: backHash, text: 'Back' }),
    );
    return;
  }

  showCard();
  document.addEventListener('keydown', onKey);
  // Cleanup, called by the router when we leave: stop listening for keys and free the blob URLs.
  return () => {
    document.removeEventListener('keydown', onKey);
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
  };

  function showCard() {
    revealed = false;
    const card = queue[0];
    container.replaceChildren(
      el('p', { className: 'study-progress', text: `${queue.length} left · ${answered} answered` }),
      el('article', { className: 'study-card' }, [
        el('div', { className: 'study-face' }, [
          el('p', { className: 'study-label', text: 'Question' }),
          el('p', { className: 'study-text', text: card.front }),
          ...imageFor(card, 'front'),
        ]),
        // The answer side is on the page from the start but hidden until "Show answer".
        el('div', { className: 'study-face', hidden: true, dataset: { role: 'back' } }, [
          el('p', { className: 'study-label', text: 'Answer' }),
          el('p', { className: 'study-text', text: card.back }),
          ...imageFor(card, 'back'),
          ...audioFor(card),
        ]),
      ]),
      el('div', { className: 'study-actions', dataset: { role: 'actions' } }, [
        el('button', { className: 'btn btn-primary btn-big', type: 'button', onClick: reveal }, ['Show answer', keyHint('Space')]),
      ]),
    );
  }

  function reveal() {
    if (revealed) return;
    const back = container.querySelector('[data-role="back"]');
    if (!back) return; // summary screen: nothing to reveal
    revealed = true;
    back.hidden = false;
    container.querySelector('[data-role="actions"]').replaceChildren(
      el('button', { className: 'btn btn-danger btn-big', type: 'button', onClick: () => answer(false) }, ['Wrong', keyHint('1')]),
      el('button', { className: 'btn btn-success btn-big', type: 'button', onClick: () => answer(true) }, ['Correct', keyHint('2')]),
    );
  }

  async function answer(correct) {
    if (!revealed) return; // grading only after the answer is shown
    revealed = false;      // blocks a double tap while we save
    const card = queue[0];
    const updated = applyAnswer(card, correct); // new box and due date (pure function, see scheduler.js)
    try {
      await put('cards', updated);
      await put('reviews', createReview({ cardId: card.id, deckId: card.deckId, correct })); // for the Stats screen
    } catch (error) {
      console.error('Saving the answer failed:', error);
      showToast('Could not save your answer. Please try again.');
      revealed = true; // let the user tap Wrong / Correct again
      return;
    }
    updateBadge(); // after every answer, so the badge is right even if the session is left halfway
    answered += 1;
    if (correct) {
      correctCount += 1;
      nextDue = Math.min(nextDue, updated.due);
    }
    queue = advanceQueue(queue, updated, correct);
    if (queue.length === 0) showSummary();
    else showCard();
  }

  function showSummary() {
    const percent = Math.round((correctCount / answered) * 100);
    container.replaceChildren(
      el('section', { className: 'summary' }, [
        el('h2', { text: 'Session complete' }),
        el('p', { text: `Cards: ${total} · Answers: ${answered} · Correct: ${percent}%` }),
        el('p', { className: 'deck-meta', text: `Next review: ${formatDue(nextDue)}` }),
        el('a', { className: 'btn btn-primary', href: backHash, text: 'Done' }),
      ]),
    );
  }

  /** The card's photo, if it belongs on this side. A blob URL is a temporary address for a Blob in memory. */
  function imageFor(card, side) {
    if (!card.image || card.imageSide !== side) return [];
    const url = URL.createObjectURL(card.image);
    objectUrls.push(url);
    return [el('img', { className: 'study-image', src: url, alt: 'Card photo' })];
  }

  /** The voice note always belongs to the answer side. */
  function audioFor(card) {
    if (!card.audio) return [];
    const url = URL.createObjectURL(card.audio);
    objectUrls.push(url);
    return [el('audio', { className: 'study-audio', controls: true, src: url })];
  }

  // Keyboard shortcuts: Space shows the answer, 1 = Wrong, 2 = Correct.
  function onKey(event) {
    // Ignore a held-down key (it would grade card after card) and combinations such as Ctrl+1 (switch browser tab).
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.code === 'Space') {
      if (event.target.closest?.('button, a, audio')) return; // Space on a focused control activates that control
      event.preventDefault(); // otherwise Space would scroll the page
      reveal();
    } else if (event.key === '1') {
      answer(false);
    } else if (event.key === '2') {
      answer(true);
    }
  }
}

/** " (Space)" style hint for keyboard users; hidden on touch screens by the .key-hint rule in styles.css. */
function keyHint(key) {
  return el('span', { className: 'key-hint', text: ` (${key})` });
}
