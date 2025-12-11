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
*   **Playback:** Instant audio playback of generated scores.
*   **Theming:** Full support for Light and Dark modes.

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   A [Google Gemini API Key](https://aistudio.google.com/)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/sight-reading-generator.git
    cd sight-reading-generator
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory and add your API key. This is required for the AI generation to work.
    ```env
    API_KEY=your_google_gemini_api_key_here
    ```

4.  **Run the application**
    ```bash
    npm start
    # or
    npm run dev
    ```

## 🛠️ Tech Stack

*   **Frontend:** React 19, TypeScript, Tailwind CSS
*   **AI Logic:** Google Gemini SDK (`@google/genai`)
*   **Music Rendering:** ABCJS

## 🤝 Contributing

We welcome collaboration! Whether you want to improve the music theory prompts, add new instrument modes, or polish the UI, your contributions are valuable.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Copyright © 2025.
