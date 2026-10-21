# NetCards

Offline-first flashcards for CCNA and networking students. A Progressive Web App built with HTML, CSS and vanilla JavaScript — no frameworks.

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

## Planned features

- Decks and question/answer cards
- Photo of a network diagram (camera) and a voice explanation (microphone) on a card
- Leitner spaced repetition
- Works fully offline (service worker + Cache API for the app, IndexedDB for your data)
- Study statistics
