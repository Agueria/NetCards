// app.js — entry point. Wires screens, service worker, online/offline banner and install support.
import { $, setOfflineBanner, showToast } from './ui.js';
import { registerRoute, startRouter } from './router.js';
import { registerServiceWorker } from './swRegister.js';
import { initInstall } from './install.js';
import { updateBadge } from './badge.js';
import * as decksView from './views/decks.js';
import * as deckView from './views/deck.js';
import * as studyView from './views/study.js';
import * as statsView from './views/stats.js';

// Route name = first segment of the hash: '#/decks', '#/deck/<id>', '#/study/<id|all>', '#/stats'.
registerRoute('decks', decksView.render);
registerRoute('deck', deckView.render);
registerRoute('study', studyView.render);
registerRoute('stats', statsView.render);

// Offline banner: navigator.onLine tells us whether the browser thinks it has a connection.
// Limitation: "online" only means a network interface exists, not that the internet works —
// that is why every fetch() in the app still has its own try/catch.
function updateOnlineStatus() {
  setOfflineBanner(!navigator.onLine);
}
window.addEventListener('online', () => {
  updateOnlineStatus();
  showToast('Back online');
});
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus(); // initial state on page load

registerServiceWorker(); // makes the app work offline (see sw.js)
initInstall();           // "Install app" button support (see install.js)

// Ask the browser not to evict our data when storage runs low (Safari may otherwise clear
// IndexedDB of sites not used for a while). Optional API: guarded, and failures are ignored.
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

startRouter($('#view'));
updateBadge(); // cards become due over time, so refresh the icon badge every time the app opens
