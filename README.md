# Lorcana Pack Logger

A mobile-friendly web app for logging Disney Lorcana booster pack openings. Scan cards with your phone camera, track pulls across sessions, and export your data as CSV.

**[Open the app](https://sabrinacarmona.github.io/lorcana-pack-logger/)**

## Features

### Card Scanner
- Point your phone camera at a Lorcana card and the app reads the collector number using OCR (Tesseract.js)
- Detects the ink colour from the card's name banner for disambiguation
- Extracts the set number from the card footer to uniquely identify cards across sets
- Confirmation step lets you add as **Normal** or **Foil** before logging
- Keeps scanning in the background during disambiguation — auto-resolves when it gets a better read

### Search & Add
- Live search across the complete Lorcana card database (powered by the Lorcast API)
- Filter by set, search by name, or type `#` followed by a collector number
- Keyboard navigation with arrow keys + Enter
- Right-click any result to add as foil

### Session Tracking
- Automatic pack numbering (12 cards per pack)
- Quantity controls per card with undo support
- Session timer and pull statistics (foils, legendaries, enchanteds)
- Rarity-based haptic feedback and visual flashes

### Export
- Download or copy your session as CSV
- Export history with re-download and re-copy
- Session auto-clears after export so you're ready for the next one

## Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **Tesseract.js** for on-device OCR (runs in a Web Worker)
- **Lorcast API** for the card database (cached locally for 24 hours)
- **GitHub Pages** for hosting with automatic deploys on push
- Pure CSS with custom properties — no UI library

## Run Locally

```bash
git clone https://github.com/sabrinacarmona/lorcana-pack-logger.git
cd lorcana-pack-logger
npm install
npm run dev
```

Open [localhost:5173](http://localhost:5173) in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | Run tests |
| `npm run test:watch` | Watch mode |
| `npm run lint` | TypeScript type check |

## How the Scanner Works

1. Camera captures a frame every 500ms
2. The collector number region (bottom 20% of the card) is cropped and upscaled 2x
3. Otsu's binarisation converts the crop to clean black-and-white
4. Tesseract.js reads the text in SINGLE_BLOCK mode
5. A parser extracts the CN, total, and set number from patterns like `130/204 EN 7`
6. The ink colour is detected from a strip along the card's name banner using per-pixel classification
7. The matcher narrows candidates by: set filter, set total, set number, then ink
8. The user confirms the match and chooses normal or foil

## Project Structure

```
src/
  App.tsx                  # Main app — orchestrates all hooks
  components/
    SearchView.tsx         # Search, pull list, scanner mount
    ScannerOverlay.tsx     # Camera UI, match confirmation, disambiguation
    ExportView.tsx         # CSV export and stats
    HistoryView.tsx        # Past export sessions
    Header.tsx             # Session info and rarity counters
  hooks/
    useScanner.ts          # Camera + OCR + matching pipeline
    useSession.ts          # Session state + localStorage
    usePulls.ts            # Pull tracking
    useSearch.ts           # Card search
  utils/
    ocr-worker.ts          # Tesseract.js worker with mutex
    collector-number-parser.ts  # OCR text → CN + set number
    card-cn-matcher.ts     # CN → card lookup with narrowing
    ink-detector.ts        # Per-pixel ink colour classification
    preprocess-ocr.ts      # Grayscale + binarisation pipeline
  api/
    lorcast.ts             # Lorcast API client with retry + batching
    cache.ts               # 24-hour localStorage cache
```

## Acknowledgements

- Card data from the [Lorcast API](https://lorcast.com)
- OCR powered by [Tesseract.js](https://tesseract.projectnaptha.com)
- Disney Lorcana is a trademark of Disney
