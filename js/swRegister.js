// swRegister.js — registers sw.js and shows a toast when a new version is waiting to take over.
//
// Service worker versions: when sw.js changes, the browser installs the new worker but keeps the
// OLD one in control of open pages until they are all closed ("waiting" state). We do not force it
// with skipWaiting() automatically — mixing an old page with a new cache could break things — but
// we let the user choose: "New version available → Reload".
import { showToast } from './ui.js';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return; // very old browsers: the app still works, just not offline

  // Registering after 'load' keeps the first paint fast (the SW download does not compete with the page).
  window.addEventListener('load', async () => {
    try {
      // './sw.js' and the default scope './' = everything under the app folder (works on GitHub Pages sub-paths).
      const registration = await navigator.serviceWorker.register('./sw.js');

      // Case 1: a new worker is already waiting (the page was reloaded while one was pending).
      if (registration.waiting && navigator.serviceWorker.controller) {
        promptUpdate(registration.waiting);
      }

      // Case 2: a new worker is found while this page is open.
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          // 'installed' + an existing controller = an UPDATE (on the very first install there is no controller yet).
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            promptUpdate(newWorker);
          }
        });
      });
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  });

  // When the new worker takes control, reload once so the page runs the new code.
  let refreshing = false; // guard: controllerchange can fire more than once
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

function promptUpdate(worker) {
  showToast('New version available', {
    actionLabel: 'Reload',
    duration: 0, // stays until the user decides
    onAction: () => worker.postMessage('SKIP_WAITING'), // sw.js answers with self.skipWaiting()
  });
}
