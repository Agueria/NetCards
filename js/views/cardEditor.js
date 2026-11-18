// views/cardEditor.js - <dialog> for creating or editing one card.
// Media fields such as the photo field (photoField.js) plug into the data-slot elements.
import { put, remove } from '../db.js';
import { createCard } from '../models.js';
import { el, showToast } from '../ui.js';
import { createPhotoField } from './photoField.js';
import { updateBadge } from '../badge.js';

/** Opens the editor. Pass `card` to edit it; leave it out to add a new card to `deckId`. */
export function openCardEditor({ deckId, card = null, onSaved }) {
  const isEdit = card !== null;
  const dialog = el('dialog', { className: 'dialog editor' });
  // Static markup only: the card's text is filled in below through .value, never through innerHTML.
  dialog.innerHTML = `
    <form class="form">
      <h2>${isEdit ? 'Edit card' : 'New card'}</h2>
      <label class="form-field">Front (question)
        <textarea name="front" rows="3" required maxlength="500"></textarea>
      </label>
      <label class="form-field">Back (answer)
        <textarea name="back" rows="3" required maxlength="1000"></textarea>
      </label>
      <div data-slot="photo"></div>
      <div data-slot="audio"></div>
      <div class="dialog-actions">
        ${isEdit ? '<button type="button" class="btn btn-danger" data-action="delete">Delete</button>' : ''}
        <button type="button" class="btn" data-action="cancel">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>`;

  const form = dialog.querySelector('form');
  const saveButton = form.querySelector('button[type="submit"]');
  form.elements.front.value = card?.front ?? '';
  form.elements.back.value = card?.back ?? '';

  // Media fields (for example photoField.js): each is { element, getValue(), busyReason(), dispose() }.
  const fields = [];
  const photoField = createPhotoField({ image: card?.image ?? null, imageSide: card?.imageSide ?? 'front' });
  dialog.querySelector('[data-slot="photo"]').append(photoField.element);
  fields.push(photoField);

  dialog.querySelector('[data-action="cancel"]').addEventListener('click', () => dialog.close());

  // Optional chaining (?.): the Delete button only exists when editing.
  dialog.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
    if (!window.confirm('Delete this card?')) return;
    try {
      await remove('cards', card.id);
      updateBadge(); // one card fewer may be due
    } catch (error) {
      console.error('Deleting the card failed:', error);
      showToast('Could not delete the card. Please try again.');
      return;
    }
    dialog.close();
    showToast('Card deleted');
    onSaved();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault(); // we save to IndexedDB ourselves instead of sending the form to a server
    if (saveButton.disabled) return; // a save is already running: a double tap must not save the card twice
    // A media field may still be working (resizing a photo, recording): saving now would lose its result.
    const busy = fields.map((field) => field.busyReason()).find(Boolean);
    if (busy) {
      showToast(busy);
      return;
    }
    const front = form.elements.front.value.trim();
    const back = form.elements.back.value.trim();
    if (!front || !back) {
      showToast('Both sides need some text');
      return;
    }
    // Merge the values of all media fields: { image, imageSide } and { audio, audioType }.
    const media = Object.assign({}, ...fields.map((field) => field.getValue()));
    // Editing keeps id, deckId, box and due ({ ...card }): changing the text does not reset the schedule.
    const record = isEdit
      ? { ...card, front, back, ...media }
      : createCard({ deckId, front, back, ...media });
    saveButton.disabled = true; // also shows the user that saving is in progress
    try {
      await put('cards', record);
      updateBadge(); // a new card is due immediately
    } catch (error) {
      console.error('Saving the card failed:', error);
      showToast('Could not save the card. Please try again.');
      saveButton.disabled = false;
      return;
    }
    dialog.close();
    showToast(isEdit ? 'Card updated' : 'Card added');
    onSaved();
  });

  // Runs for Cancel, Save, Delete and the Escape key alike: release media resources, remove the dialog.
  dialog.addEventListener('close', () => {
    fields.forEach((field) => field.dispose());
    dialog.remove();
  });

  document.body.append(dialog);
  dialog.showModal();
  form.elements.front.focus();
}
