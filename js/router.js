// router.js — hash router. '#/deck/abc' → route 'deck' with param 'abc'.
//
// Why the hash and not the History API: changing the part after '#' never sends a request to the
// server, so the whole app is ONE cached index.html. That is exactly what we want for an offline
// PWA hosted on GitHub Pages (which cannot rewrite /deck/abc to index.html).
import { el } from './ui.js';

const routes = new Map(); // route name → render function
let rootEl = null;        // the <main id="view"> element the current screen is shown in
let cleanup = null;       // function returned by the current screen, run before leaving it
let latestRender = 0;     // grows on every navigation, so an outdated render can tell it lost

/** Registers a screen. renderFn(root, param) may return a cleanup function. */
export function registerRoute(name, renderFn) {
  routes.set(name, renderFn);
}

/** Starts listening for hash changes and renders the current route once. */
export function startRouter(root) {
  rootEl = root;
  window.addEventListener('hashchange', () => handleRoute());
  handleRoute();
}

/** Programmatic navigation: navigate('#/deck/abc'). Setting location.hash fires 'hashchange'. */
export function navigate(hash) {
  window.location.hash = hash;
}

/** Re-renders the current route after data changed on the same screen, keeping the scroll position. */
export function refresh() {
  handleRoute({ keepScroll: true });
}

async function handleRoute({ keepScroll = false } = {}) {
  // Let the previous screen release what it holds (keyboard listeners, camera stream, blob URLs).
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;

  // '#/deck/abc' → 'deck/abc' → ['deck', 'abc'];  '' (no hash) → 'decks'
  const path = (window.location.hash.slice(1) || '/decks').replace(/^\//, '');
  const [name, param] = path.split('/');
  const routeName = routes.has(name) ? name : 'decks'; // unknown route → home screen
  setActiveNav(routeName);

  // Screens read IndexedDB (async) before they draw. The new screen is therefore built in a
  // detached container and swapped in only when it is complete — no empty flash while loading.
  // If the user navigates again before this render finishes, it is outdated and thrown away;
  // otherwise two screens could end up on the page at the same time.
  const renderId = ++latestRender;
  const view = document.createElement('div');
  let result;
  try {
    result = await routes.get(routeName)(view, param ?? null);
  } catch (error) {
    console.error(`Could not render the "${routeName}" screen:`, error);
    view.replaceChildren(el('p', { className: 'empty', text: 'Something went wrong while loading this screen.' }));
  }

  if (renderId !== latestRender) {
    if (typeof result === 'function') result(); // a newer screen won: release this one's resources
    return;
  }
  const scrollY = keepScroll ? window.scrollY : 0;
  rootEl.replaceChildren(view);
  window.scrollTo(0, scrollY);
  cleanup = result;
}

/** Highlights the nav link whose data-route matches the current route. */
function setActiveNav(name) {
  document.querySelectorAll('[data-route]').forEach((link) => {
    link.classList.toggle('active', link.dataset.route === name);
  });
}
