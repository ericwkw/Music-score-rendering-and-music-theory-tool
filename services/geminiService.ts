
import { GoogleGenAI } from "@google/genai";
import { AppSettings, GeneratorMode } from "../types";

const getSystemInstruction = (mode: GeneratorMode) => `
You are a professional music composition engine for a sight-reading app.
Your task is to generate valid ABC Music Notation based STRICTLY on the user's constraints.
Output JSON format only.

Format:
{
  "abc": "The full ABC notation string starting with X:1..."
}

Rules for ABC Notation:
- X:1 (Reference number)
- T: (Title - leave empty or use generic)
- M: (Time Signature)
- L: (Default note length, usually 1/4 or 1/8)
- K: (Key Signature)
- Q: (Tempo)
- The music content must follow standard ABC syntax.

Mode Specifics:
- If Mode is INTERVAL: Generate intervals (two notes played together or sequentially).
- If Mode is CHORD: Generate chords.
  - If "Guitar Mode" is on: Use standard chords but ensure they are playable on guitar if possible (e.g., standard open or barre chord voicings).
  - If "Piano Mode" is on: Use Grand Staff notation if requested (V:1 Treble, V:2 Bass clef).
  - If "Staff" is hidden: The user might still want the notation for audio playback, but visually we might hide it. However, always generate standard notation.
  - If "Chord Symbols" are requested: Add chord symbols in double quotes above the staff (e.g., "Am" [Ace]).
- If Mode is MELODY: Generate a single line melody.
  - If "Articulations" is enabled: Use standard ABC articulations like staccato (.) or tenuto/legato.

Strictly adhere to the Range (Lowest/Highest note), Clef, and Key provided.
`;

export const generateMusic = async (settings: AppSettings): Promise<string> => {
  // Retrieve API Key. 
  // Vite replaces 'process.env.API_KEY' with the build-time string.
  // We also check window.process as a fallback for runtime injection if needed.
  const apiKey = process.env.API_KEY || (window as any).process?.env?.API_KEY;

  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    console.warn("No valid API Key provided");
    return getDefaultAbc(settings);
  }

  // Pick a random key from the user's selection, fallback to 'C Major' if empty
  const availableKeys = settings.selectedKeys.length > 0 ? settings.selectedKeys : ['C Major'];
  const activeKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // Construct refined prompt
    let specificInstructions = "";
    
    if (settings.mode === GeneratorMode.CHORD) {
        const cs = settings.chordSettings;
        const allowedTriads = cs.enabledTriads.join(', ');
        const allowedSevenths = cs.enabledSevenths.join(', ');
        const allowedVoicings = cs.enabledVoicings.join(', ');

        specificInstructions += `
        - Allowed Triads: ${allowedTriads || 'None'}
        - Triad Inversions Allowed: ${cs.triadInversions ? 'YES' : 'NO'}
        - Allowed Seventh Chords: ${allowedSevenths || 'None'}
        - Seventh Inversions Allowed: ${cs.seventhInversions ? 'YES' : 'NO'}
        - Voicing Strategy preference: ${allowedVoicings || 'Close'}
        - Harmony Style: ${settings.functionalHarmonyMode ? 'Functional (Use logical progressions like ii-V-I)' : 'Random'}
        - Instrument: ${settings.instrumentMode === 'guitar' ? 'Guitar (Voicing suited for guitar)' : 'Standard Piano'}
        - Include Chord Symbols: ${settings.showChordSymbols ? 'YES (e.g., "Cm" [C_EG])' : 'NO'}
        `;

        // Add Piano Specific Instructions
        if (settings.instrumentMode === 'piano') {
             specificInstructions += `
             - Layout: Use Grand Staff (Staves: V:1 (Treble), V:2 (Bass))
             - V:2 (Bass Clef) Range: ${settings.pianoSettings.bassClef.min} to ${settings.pianoSettings.bassClef.max}
             - V:1 (Treble Clef) Range: ${settings.pianoSettings.trebleClef.min} to ${settings.pianoSettings.trebleClef.max}
             - Distribute chord tones appropriately across both staves (e.g., Root/5th in left hand/Bass, others in right/Treble).
             `;
        }
    } else if (settings.mode === GeneratorMode.INTERVAL) {
        specificInstructions += `
        - Interval Type: ${settings.intervalType}
        - Maximum Interval Span: ${settings.maxInterval} (Do not generate intervals wider than this)
        `;
    } else if (settings.mode === GeneratorMode.MELODY) {
         // Construct frequency string for prompt
         const rhythmFreqString = Object.entries(settings.rhythm.frequencies)
            .filter(([_, val]) => val > 0)
            .map(([key, val]) => `${key}: ${val}%`)
            .join(', ');

         const allowedUnits = settings.rhythm.enabledUnits.join(', ');

         // Articulations
         const articulationsEnabled = settings.articulations.enabledIds.length > 0;
         const artFreqString = Object.entries(settings.articulations.frequencies)
            .filter(([_, val]) => val > 0)
            .map(([key, val]) => `${key}: ${val}%`)
            .join(', ');
         
         const artTypes = settings.articulations.enabledIds.join(', ');

         specificInstructions += `
        - Articulations: ${articulationsEnabled ? `YES (Types: ${artTypes})` : 'NO'}
        - Articulation Frequencies: ${artFreqString || 'Balanced'}
        - Maximum Leap: Limit melodic leaps to ${settings.maxInterval}
        - Rhythm Constraints:
          - Allowed Note Units: ${allowedUnits}
          - Dotted Notes Allowed: ${settings.rhythm.allowDotted ? 'YES' : 'NO'}
          - Rhythm Frequencies (approximate guide): ${rhythmFreqString || 'Balanced distribution'}
        `;
    }

    const prompt = `
      Create a ${settings.mode} sight-reading exercise.
      
      Constraints:
      - Key: ${activeKey}
      - Time Signature: ${settings.timeSignature}
      - Measures: ${settings.measures}
      - Clef: ${settings.clef}
      ${settings.instrumentMode === 'piano' && settings.mode === GeneratorMode.CHORD 
        ? '- Note Range: See Piano Specific Instructions for Grand Staff ranges' 
        : `- Note Range: Lowest ${settings.lowestNote} to Highest ${settings.highestNote}`
      }
      - Accidentals Probability: ${settings.accidentalsChance}%
      
      ${specificInstructions}
      
      Ensure the notes fit comfortably within the staff for the chosen clef and range.
      Do not add complex ornaments unless Articulations are requested.
      If generating Chords with Chord Symbols, place the symbol in quotes before the note group, e.g., "C" [CEG].
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: getSystemInstruction(settings.mode),
        temperature: settings.functionalHarmonyMode ? 0.7 : 0.9, 
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from AI");
    
    // Robust JSON parsing (handles markdown code blocks)
    let cleanJson = jsonText;
    if (cleanJson.includes('```json')) {
        cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '');
    } else if (cleanJson.includes('```')) {
        cleanJson = cleanJson.replace(/```/g, '');
    }
    
    const data = JSON.parse(cleanJson);
    return data.abc;

  } catch (error) {
    console.error("Gemini generation failed", error);
    // If API call fails, fallback to default generator
    return getDefaultAbc(settings);
  }
};

// Fallback logic for when API is missing or fails
const getDefaultAbc = (settings: AppSettings): string => {
  const clef = settings.clef === 'bass' ? 'bass' : 'treble';
  const availableKeys = settings.selectedKeys.length > 0 ? settings.selectedKeys : ['C Major'];
  const activeKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
  const key = activeKey.replace(' Major', '').replace(' Minor', 'm');
  
  let notes = "";
  if (settings.mode === GeneratorMode.INTERVAL) {
    notes = "| [C4E4] [D4F4] [E4G4] [F4A4] | [G4B4] [A4c5] [B4d5] [c5e5] |";
  } else if (settings.mode === GeneratorMode.CHORD) {
    const c1 = settings.showChordSymbols ? '"C"' : '';
    const c2 = settings.showChordSymbols ? '"Dm"' : '';
    const c3 = settings.showChordSymbols ? '"G7"' : '';
    const c4 = settings.showChordSymbols ? '"C"' : '';
    notes = `| ${c1}[C4E4G4] ${c2}[D4F4A4] ${c3}[G4B4d4] ${c4}[C4E4G4] |`;
    if (settings.measures > 2) notes += notes;
  } else {
    // Default Melody
    const art = settings.articulations.enabledIds.includes('staccato') ? '.' : '';
    notes = `| ${art}C4 ${art}D4 ${art}E4 ${art}F4 | ${art}G4 ${art}A4 ${art}B4 ${art}c4 |`;
  }

  return `
X:1
T: Generated Exercise (Offline Mode)
M:${settings.timeSignature}
L:1/4
Q:1/4=${settings.tempo}
K:${key} clef=${clef}
${notes}
  `.trim();
}
