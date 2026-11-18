// install.js - "Install app" support.
//
// Chromium browsers (Chrome, Edge, Android) fire `beforeinstallprompt` when the site is installable.
// We keep that event and call prompt() on it when the user taps our own "Install app" button.
// iOS Safari never fires it: installing is manual (Share → Add to Home Screen), so there we show
// a one-time hint instead.
const IOS_HINT_KEY = 'netcards:iosHintDismissed';
let deferredPrompt = null; // the saved beforeinstallprompt event, or null

export function initInstall() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // we show our own button instead of the browser's mini-bar
    deferredPrompt = event;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null; // installed: nothing more to offer
    notify();
  });
}

/** 'prompt' = we can open the native install dialog; 'ios-hint' = show manual instructions; 'none' = nothing to show. */
export function getInstallState() {
  if (deferredPrompt) return 'prompt';
  if (isIos() && !isStandalone() && !readFlag(IOS_HINT_KEY)) return 'ios-hint';
  return 'none';
}

export async function promptInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice; // resolves whether the user accepted or dismissed
  deferredPrompt = null;           // the event can only be used once
  notify();
}

export function dismissIosHint() {
  writeFlag(IOS_HINT_KEY);
  notify();
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** True when the app runs from the home screen / as an installed window (no browser UI). */
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

/** Tells the Decks screen to re-render its install area (the button can appear after the first render). */
function notify() {
  window.dispatchEvent(new CustomEvent('netcards:install-changed'));
}

// localStorage can throw in private browsing mode, so both helpers are guarded.
function readFlag(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key) {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // private mode or storage disabled: the flag simply does not persist
  }
}
