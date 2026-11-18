// ui.js - tiny DOM helpers plus the two global UI pieces (toast and offline banner).
//
// Why a helper instead of a framework: every screen builds its DOM with el(), which keeps the
// code short and - because user text always goes through textContent - safe from HTML injection.

/** querySelector shortcut: $('#view') instead of document.querySelector('#view'). */
export function $(selector, root = document) {
  return root.querySelector(selector);
}

/**
 * Creates an element in one call. Example:
 *   el('button', { className: 'btn', type: 'button', text: 'Save', onClick: save })
 *
 * `options` may contain:
 *  - className          → element.className
 *  - text               → element.textContent (safe for user-provided strings)
 *  - html               → element.innerHTML (ONLY for trusted, static markup written in our code)
 *  - dataset            → data-* attributes, e.g. { role: 'back' } → data-role="back"
 *  - onClick, onInput…  → addEventListener('click' | 'input' | …)
 *  - anything else      → setAttribute; true becomes an empty attribute (hidden=""), false/null are skipped
 * `children` are appended in order (elements or plain strings).
 */
export function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  const { text, html, dataset, ...rest } = options;
  for (const [key, value] of Object.entries(rest)) {
    if (key === 'className') {
      node.className = value;
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value); // onClick → 'click'
    } else if (value !== null && value !== undefined && value !== false) {
      node.setAttribute(key, value === true ? '' : value);
    }
  }
  if (text !== undefined) node.textContent = text;
  if (html !== undefined) node.innerHTML = html;
  if (dataset) Object.assign(node.dataset, dataset);
  for (const child of children) node.append(child);
  return node;
}

let toastTimer = null;

/**
 * Shows a message at the bottom of the screen.
 * actionLabel/onAction add a button (used for "New version available - Reload").
 * duration 0 keeps the toast until the user clicks the action.
 */
export function showToast(message, { actionLabel = null, onAction = null, duration = 4000 } = {}) {
  const toast = $('#toast');
  toast.replaceChildren(el('span', { text: message }));
  if (actionLabel) {
    toast.append(el('button', {
      type: 'button',
      text: actionLabel,
      onClick: () => {
        hideToast();
        if (onAction) onAction();
      },
    }));
  }
  toast.hidden = false;
  clearTimeout(toastTimer); // a new toast replaces the previous one and restarts the timer
  if (duration > 0) toastTimer = setTimeout(hideToast, duration);
}

export function hideToast() {
  $('#toast').hidden = true;
}

/** The yellow "You're offline" banner under the top bar (markup lives in index.html). */
export function setOfflineBanner(isOffline) {
  $('#offline-banner').hidden = !isOffline;
}
