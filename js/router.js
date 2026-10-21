// router.js — hash router. '#/deck/abc' → route 'deck' with param 'abc'.
//
// Why the hash and not the History API: changing the part after '#' never sends a request to the
// server, so the whole app is ONE cached index.html. That is exactly what we want for an offline
// PWA hosted on GitHub Pages (which cannot rewrite /deck/abc to index.html).

const routes = new Map(); // route name → render function
let rootEl = null;        // the <main id="view"> element screens render into
let cleanup = null;       // function returned by the current screen, run before leaving it

/** Registers a screen. renderFn(root, param) may return a cleanup function. */
export function registerRoute(name, renderFn) {
  routes.set(name, renderFn);
}

/** Starts listening for hash changes and renders the current route once. */
export function startRouter(root) {
  rootEl = root;
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

/** Programmatic navigation: navigate('#/deck/abc'). Setting location.hash fires 'hashchange'. */
export function navigate(hash) {
  window.location.hash = hash;
}

/** Re-renders the current route — used after saving data on the same screen. */
export function refresh() {
  handleRoute();
}

async function handleRoute() {
  // Let the previous screen release what it holds (keyboard listeners, camera stream, blob URLs).
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;

  // '#/deck/abc' → 'deck/abc' → ['deck', 'abc'];  '' (no hash) → 'decks'
  const path = (window.location.hash.slice(1) || '/decks').replace(/^\//, '');
  const [name, param] = path.split('/');
  const render = routes.get(name) ?? routes.get('decks'); // unknown route → home screen

  rootEl.replaceChildren(); // clear the previous screen
  setActiveNav(name);
  window.scrollTo(0, 0);
  cleanup = await render(rootEl, param ?? null);
}

/** Highlights the nav link whose data-route matches the current route. */
function setActiveNav(name) {
  document.querySelectorAll('[data-route]').forEach((link) => {
    link.classList.toggle('active', link.dataset.route === name);
  });
}
