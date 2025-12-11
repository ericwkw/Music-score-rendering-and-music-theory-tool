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
*   A modern web browser.
*   A [Google Gemini API Key](https://aistudio.google.com/).

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/sight-reading-generator.git
    cd sight-reading-generator
    ```

2.  **Configuration**
    Since this is a client-side application without a build step, you must configure your API key.
    Open `index.html` and look for the `window.process` script. Replace `YOUR_API_KEY_HERE` with your actual Gemini API key.
    
    *Note: Never commit your real API key to a public GitHub repository.*

3.  **Run the application**
    You can serve the files using any static file server.
    
    Using Python:
    ```bash
    python3 -m http.server 8000
    ```
    
    Using npx/serve:
    ```bash
    npx serve .
    ```

    Then open `http://localhost:8000` in your browser.

## 🛠️ Tech Stack

*   **Frontend:** React 19, TypeScript, Tailwind CSS
*   **AI Logic:** Google Gemini SDK (`@google/genai`)
*   **Music Rendering:** ABCJS (via CDN)

## 📄 License

Copyright © 2025.