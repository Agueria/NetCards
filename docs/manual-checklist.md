# Manual test checklist

Run this after every milestone, on desktop Chrome and on the iPhone (live GitHub Pages URL).

## Before you start
- Serve the folder over http: `npm start` (http://localhost:8080) or VS Code Live Server. Opening `index.html` as a file does not work.
- The service worker serves code from its cache. After editing a file, bump `CACHE_NAME` in `sw.js` (and reload twice / tap "Reload" on the toast), or tick DevTools → Application → Service Workers → "Update on reload" while developing.

## Desktop (Chrome)
- [ ] `npm test` passes.
- [ ] Fresh load: no console errors. Application → Service Workers: activated. Cache Storage has exactly one `netcards-vN`.
- [ ] Application → Service Workers → check "Offline" → reload: app opens; Decks, a deck, Study, Stats all render.
- [ ] Network → Offline: yellow banner appears; back online: banner gone + "Back online" toast.
- [ ] Create deck → add 3 cards → reload → data persists (Application → IndexedDB → netcards).
- [ ] Edit a card, delete a card, rename deck, delete deck - each updates the screen without reload.
- [ ] Bump `CACHE_NAME` → reload → "New version available" toast → Reload → old cache gone.
- [ ] Application → Manifest: no warnings; "Install" icon visible in the address bar.
- [ ] Card editor → Take photo → allow the webcam → Capture → Save: the card list shows "photo" and the webcam light turns off when the camera dialog closes. Choose file with a PNG works too; Study shows the photo on the chosen side.
- [ ] Block the camera in the site settings → Take photo shows "Camera permission was denied…"; Choose file still works.

## iPhone (Safari, live URL)
- [ ] Page loads; "Install NetCards" hint shows; "Got it" hides it permanently.
- [ ] Share → Add to Home Screen → app opens standalone (no Safari bar), icon correct.
- [ ] Airplane mode → open the installed app: it opens; banner shows; add a card; disable airplane mode → card still there.
- [ ] Take a photo with the camera; record and play a voice note.
