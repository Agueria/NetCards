// sw.js - NetCards service worker. Pure JavaScript, no libraries.
//
// A service worker is a script the browser runs in the background, separate from the page.
// It sits between the app and the network: every request the page makes passes through the
// 'fetch' handler below, which decides whether to answer from the cache or from the network.
//
// Strategy per resource type (also explained in README):
//  - App shell (HTML, CSS, JS, manifest, icons): precached on install, served Cache First.
//  - Navigation requests (opening the page): Network First, falling back to the cached index.html.
//  - Deck library JSON (data/...): Stale-While-Revalidate.
//  - Cross-origin requests: network only (the app does not use external resources).
//
// User data (cards, photos, audio) is NOT handled here - it lives in IndexedDB, which is offline by nature.

// Bump this on every release. A changed sw.js makes the browser install the new worker, which
// precaches the new files into a NEW cache; the old cache is deleted in 'activate'.
const CACHE_NAME = 'netcards-v12';

// Everything the app needs to start offline. cache.addAll fails completely if one URL is missing,
// so every new file must be added here (tools/check-precache.mjs verifies this later).
const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './js/app.js',
  './js/router.js',
  './js/ui.js',
  './js/swRegister.js',
  './js/install.js',
  './js/dates.js',
  './js/models.js',
  './js/db.js',
  './js/scheduler.js',
  './js/badge.js',
  './js/media/camera.js',
  './js/media/recorder.js',
  './js/views/decks.js',
  './js/views/deckDialog.js',
  './js/views/deck.js',
  './js/views/cardEditor.js',
  './js/views/photoField.js',
  './js/views/audioField.js',
  './js/views/study.js',
  './js/views/stats.js',
];

// 1) install: runs once per new worker version. waitUntil keeps the worker alive until precaching ends.
//    cache: 'reload' skips the browser's HTTP cache. GitHub Pages lets browsers reuse a file for
//    10 minutes (Cache-Control: max-age=600); without this, a new release could precache old copies.
self.addEventListener('install', (event) => {
  const requests = PRECACHE.map((url) => new Request(url, { cache: 'reload' }));
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(requests)));
});

// 2) activate: the new worker is now in charge. Delete caches from older versions and take control
//    of pages that are already open (without clients.claim they would wait for the next reload).
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// The page sends this message when the user taps "Reload" on the update toast (see js/swRegister.js).
// skipWaiting() lets the new worker activate immediately instead of waiting for all tabs to close.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// 3) fetch: route every GET request to one of the strategies below.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // only GET responses can be cached

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // network only: not our files

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
  } else if (url.pathname.includes('/data/')) {
    event.respondWith(staleWhileRevalidate(event));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

// Cache First: answer from the cache; go to the network only for something we have not cached yet.
// Right for versioned files (JS/CSS) that only change with a new CACHE_NAME.
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && !response.redirected) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone()); // clone: a response body can only be read once
  }
  return response;
}

// Network First: try the network so a new release shows up right away; offline, serve the cached page.
// Redirected responses are never cached: browsers refuse to serve them for navigation requests.
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected) cache.put('./index.html', response.clone());
    return response;
  } catch {
    // fetch() throws when there is no connection → fall back to the cached page
    const cached = await cache.match('./index.html');
    return cached || Response.error();
  }
}

// Stale-While-Revalidate: answer from the cache immediately, refresh the cache in the background.
// Right for content that may change without a new app release (deck library JSON).
async function staleWhileRevalidate(event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(event.request);
  const networkPromise = fetch(event.request)
    .then((response) => {
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    })
    .catch(() => null); // offline: nothing to refresh
  event.waitUntil(networkPromise); // keep the worker alive until the background refresh finishes
  return cached || (await networkPromise) || Response.error();
}
