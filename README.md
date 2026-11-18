# NetCards

Offline-first flashcards for CCNA and networking students. A Progressive Web App built with HTML, CSS and vanilla JavaScript - no frameworks.

**Live app:** https://agueria.github.io/netcards/

## Status

Work in progress (university PWA course project). See the commit history for weekly progress.

## Run locally

```bash
git clone https://github.com/Agueria/netcards.git
cd netcards
npm start
```

Then open http://localhost:8080. (`npm start` uses `npx serve`; any static server works, e.g. `python -m http.server 8080`.)

## Native device features

### 1. Camera - photo on a card
Networking books are full of topology and subnetting diagrams. When creating a card you can tap **Take photo**:
`navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })` opens the rear camera in a `<video>`
preview, **Capture** draws the current frame on a `<canvas>`, scales it to at most 1024 px and encodes it as JPEG
(`canvas.toBlob`, quality 0.8). The Blob is stored in IndexedDB with the card and shown on the question or the
answer side during study. **Choose file** (`<input type="file" accept="image/*">`) goes through the same resizing; it is
the fallback when the camera permission is denied or there is no camera, and on an iPhone it also offers "Take Photo".
The camera is switched off (`track.stop()`) as soon as the camera dialog closes.
Code: `js/media/camera.js`, `js/views/photoField.js`.

## Planned features

- Decks and question/answer cards
- Photo of a network diagram (camera) and a voice explanation (microphone) on a card
- Leitner spaced repetition
- Works fully offline (service worker + Cache API for the app, IndexedDB for your data)
- Study statistics
