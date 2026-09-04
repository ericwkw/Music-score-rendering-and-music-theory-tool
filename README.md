## Support me: https://ko-fi.com/ericwkw

# Sight-Reading Generator

A professional music sight-reading training tool powered by Google Gemini and ABCJS. This application generates limitless, customizable sheet music for Melodies, Intervals, and Chords to help musicians practice effectively.

## 🎵 Features

*   **Three Generators:**
    *   **Melody:** Single-line generation with granular control over rhythm frequencies and articulations.
    *   **Interval:** Harmonic or melodic intervals with specific range constraints.
    *   **Chord:** Generate Triads and 7ths with inversions. Includes specific voicing strategies (Close, Drop 2, Shell, etc.).
*   **Instrument Modes:**
    *   **Piano:** Generates Grand Staff notation with split ranges for Bass and Treble clefs.
    *   **Guitar:** Optimizes harmony for guitar-friendly voicings.
*   **Deep Customization:**
    *   Filter by specific Major/Minor keys.
    *   Adjust probabilities for specific rhythms (e.g., 50% Quarter notes).
    *   Toggle specific techniques like Hammer-ons/Pull-offs or Staccatos.
*   **Playback:** Instant audio playback of generated scores with a synchronized metronome.
*   **Theming:** Full support for Light and Dark modes.

## 🚀 Getting Started

### Prerequisites

*   Node.js 18+
*   A [Google Gemini API Key](https://aistudio.google.com/) (optional — without it the app runs in an offline fallback mode that generates simple exercises locally).

### Installation

1.  **Clone and install**
    ```bash
    git clone https://github.com/yourusername/sight-reading-generator.git
    cd sight-reading-generator
    npm install
    ```

2.  **Configure the API key**
    Copy `.env.example` to `.env` and set your key:
    ```bash
    cp .env.example .env
    # then edit .env:
    # API_KEY=your_key_here
    ```
    `.env` is git-ignored. On hosted platforms (e.g. Vercel) set `API_KEY` as an environment variable instead.

3.  **Run**
    ```bash
    npm run dev       # start the dev server
    npm run build     # typecheck + production build to dist/
    npm run preview   # preview the production build
    npm run typecheck # type-check only
    ```

## 🛠️ Tech Stack

*   **Frontend:** React 18, TypeScript, Vite, Tailwind CSS (compiled via PostCSS)
*   **AI Logic:** Google Gemini SDK (`@google/genai`)
*   **Music Rendering:** ABCJS

## 📄 License

Copyright © 2025.
