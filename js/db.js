// db.js - a very small promise wrapper around IndexedDB.
//
// Why IndexedDB and not localStorage: photos and voice notes are stored as Blobs, and
// localStorage only holds ~5 MB of strings. IndexedDB is a real database inside the browser:
// it stores objects (including Blobs), has indexes, and works offline by nature.
//
// IndexedDB's own API is event based (request.onsuccess / onerror). The helpers below turn every
// request into a Promise so the rest of the app can simply `await get('cards', id)`.
const DB_NAME = 'netcards';
const DB_VERSION = 1; // bump this (and add migration code in onupgradeneeded) if a store or index changes
let dbPromise = null;

/** Opens (and on first run creates) the database. Cached so it only opens once per page. */
export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Runs only when the database is created or DB_VERSION is raised: this is where the schema lives.
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('decks')) {
        db.createObjectStore('decks', { keyPath: 'id' }); // keyPath: the record's own `id` is the key
      }
      if (!db.objectStoreNames.contains('cards')) {
        const cards = db.createObjectStore('cards', { keyPath: 'id' });
        cards.createIndex('deckId', 'deckId'); // "all cards of one deck" without scanning everything
        cards.createIndex('due', 'due');
      }
      if (!db.objectStoreNames.contains('reviews')) {
        const reviews = db.createObjectStore('reviews', { keyPath: 'id' });
        reviews.createIndex('date', 'date');
        reviews.createIndex('deckId', 'deckId');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

/** Turns an IDBRequest into a Promise. */
function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Runs one request inside a transaction on one store.
 * mode is 'readonly' or 'readwrite'; `operation` receives the store and returns the IDBRequest.
 */
async function run(storeName, mode, operation) {
  const db = await openDB();
  const store = db.transaction(storeName, mode).objectStore(storeName);
  return promisify(operation(store));
}

/** Runs many writes inside ONE transaction (much faster than one transaction per record). */
async function runBatch(storeName, operation) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  operation(tx.objectStore(storeName));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(); // all writes are committed together
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** One record by key, or undefined. */
export function get(store, key) {
  return run(store, 'readonly', (s) => s.get(key));
}

/** Every record in the store. */
export function getAll(store) {
  return run(store, 'readonly', (s) => s.getAll());
}

/** Records whose indexed field equals `value`, e.g. getAllByIndex('cards', 'deckId', deck.id). */
export function getAllByIndex(store, indexName, value) {
  return run(store, 'readonly', (s) => s.index(indexName).getAll(value));
}

/** Insert or replace (put = "upsert" by the record's id). */
export function put(store, value) {
  return run(store, 'readwrite', (s) => s.put(value));
}

export function remove(store, key) {
  return run(store, 'readwrite', (s) => s.delete(key));
}

export function putMany(store, values) {
  return runBatch(store, (s) => values.forEach((value) => s.put(value)));
}

export function removeMany(store, keys) {
  return runBatch(store, (s) => keys.forEach((key) => s.delete(key)));
}
