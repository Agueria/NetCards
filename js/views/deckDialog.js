// views/deckDialog.js — <dialog> for creating a deck or editing an existing one's name/description.
// Used by the Decks screen ("New deck") and the Deck screen ("Rename").
import { put } from '../db.js';
import { createDeck } from '../models.js';
import { el, showToast } from '../ui.js';

/** Opens the dialog. Pass `deck` to edit it; leave it out to create a new one. onSaved runs after saving. */
export function openDeckDialog({ deck = null, onSaved }) {
  const isEdit = deck !== null;
  const dialog = el('dialog', { className: 'dialog' });
  // Static markup only: the user's text is filled in below through .value, never through innerHTML.
  dialog.innerHTML = `
    <form class="form">
      <h2>${isEdit ? 'Edit deck' : 'New deck'}</h2>
      <label class="form-field">Name
        <input name="name" type="text" required maxlength="60" autocomplete="off">
      </label>
      <label class="form-field">Description (optional)
        <input name="description" type="text" maxlength="120" autocomplete="off">
      </label>
      <div class="dialog-actions">
        <button type="button" class="btn" data-action="cancel">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save' : 'Create'}</button>
      </div>
    </form>`;

  const form = dialog.querySelector('form');
  const submitButton = form.querySelector('button[type="submit"]');
  form.elements.name.value = deck?.name ?? '';
  form.elements.description.value = deck?.description ?? '';

  dialog.querySelector('[data-action="cancel"]').addEventListener('click', () => dialog.close());

  // 'submit' fires for the Create/Save button and for Enter inside an input. The `required` attribute
  // already blocks an empty name; trim() also rejects a name made only of spaces.
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); // we save to IndexedDB ourselves instead of sending the form to a server
    if (submitButton.disabled) return; // a save is already running: a double tap must not create the deck twice
    const name = form.elements.name.value.trim();
    const description = form.elements.description.value.trim();
    if (!name) {
      showToast('Please enter a deck name');
      return;
    }
    // Editing keeps id and createdAt ({ ...deck }) and replaces only the two text fields.
    const record = isEdit ? { ...deck, name, description } : createDeck({ name, description });
    submitButton.disabled = true; // also shows the user that saving is in progress
    try {
      await put('decks', record);
    } catch (error) {
      console.error('Saving the deck failed:', error);
      showToast('Could not save the deck. Please try again.');
      submitButton.disabled = false;
      return;
    }
    dialog.close();
    showToast(isEdit ? 'Deck updated' : `Deck "${name}" created`);
    onSaved();
  });

  // 'close' fires for Cancel, after saving and for the Escape key: always remove the dialog from the page.
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal(); // modal: the page behind cannot be used until the dialog closes
  form.elements.name.focus();
}
