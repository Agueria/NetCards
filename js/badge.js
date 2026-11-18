// badge.js - shows the number of due cards on the installed app's icon (Badging API).
// Works in Chrome/Edge (desktop, Android) and on iOS 16.4+ for Home Screen apps; silently skipped elsewhere.
//
// Progressive enhancement: if the browser has no setAppBadge, the app simply works without a badge.
import { getAll } from './db.js';
import { countDue } from './scheduler.js';

/** Recalculates the due count and puts it on the app icon (or clears the badge when nothing is due). */
export async function updateBadge() {
  if (!('setAppBadge' in navigator)) return;
  try {
    const due = countDue(await getAll('cards'));
    if (due > 0) await navigator.setAppBadge(due);
    else await navigator.clearAppBadge();
  } catch {
    // Badging can be refused, e.g. when the app is not installed. It is only a nicety, so errors are ignored.
  }
}
