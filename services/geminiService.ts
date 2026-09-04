import { GoogleGenAI } from "@google/genai";
import { AppSettings, GeneratorMode, ClefType } from "../types";
import { KEY_DATA } from "../constants";

const getSystemInstruction = () => `
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
  // Retrieve API Key directly from process.env as per guidelines.
  // This variable is assumed to be injected by the build system (Vite).
  if (!process.env.API_KEY) {
    console.warn("No valid API Key provided");
    return getDefaultAbc(settings);
  }

  // Pick a random key from the user's selection, fallback to 'C Major' if empty
  const availableKeys = settings.selectedKeys.length > 0 ? settings.selectedKeys : ['C Major'];
  const activeKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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
        systemInstruction: getSystemInstruction(),
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

// ===========================================================================
// Offline fallback generator
//
// Emits valid ABC that honours key, meter, range, rhythm and mode without an
// API call. Key ABC rules this respects (the old version did not):
//   - `C` is middle C (C4); `c` is C5; `C,` is C3; `c'` is C6.
//   - a trailing number is a DURATION multiplier of the unit note length (L:),
//     it is NOT an octave. We set `L:1/8`, so `2` = a quarter note.
//   - diatonic notes need no accidental: the `K:` signature covers them.
// ===========================================================================

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

interface ScaleTone { letter: string; alter: number; } // alter: -1 flat, 0 natural, +1 sharp

const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const parseSciNote = (n: string): number => {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(n.trim());
  if (!m) return 60;
  const alter = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (parseInt(m[3], 10) + 1) * 12 + LETTER_SEMITONE[m[1]] + alter;
};

const parseMeter = (ts: string): [number, number] => {
  if (ts === 'C') return [4, 4];
  if (ts === 'C|') return [2, 2];
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(ts);
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : [4, 4];
};

// Resolve "Eb Major" / "F# Minor" into a diatonic scale plus an ABC key token.
// The signature accidentals come straight from KEY_DATA (`acc` like "(3#)").
const resolveKey = (activeKey: string) => {
  const entry = KEY_DATA.find(k => k.id === activeKey) ?? KEY_DATA[0];
  const km = /^([A-G])(#|b)?\s+(Major|Minor)$/.exec(entry.id);
  const tonicLetter = km ? km[1] : 'C';
  const tonicAlter = km && km[2] === '#' ? 1 : km && km[2] === 'b' ? -1 : 0;
  const mode: 'major' | 'minor' = km && km[3] === 'Minor' ? 'minor' : 'major';

  const am = /\((\d)([#b])\)/.exec(entry.acc);
  const count = am ? parseInt(am[1], 10) : 0;
  const isSharp = am ? am[2] === '#' : true;
  const affected = new Set((isSharp ? SHARP_ORDER : FLAT_ORDER).slice(0, count));

  const tonicIdx = LETTERS.indexOf(tonicLetter);
  const scale: ScaleTone[] = [];
  for (let i = 0; i < 7; i++) {
    const letter = LETTERS[(tonicIdx + i) % 7];
    scale.push({ letter, alter: affected.has(letter) ? (isSharp ? 1 : -1) : 0 });
  }

  const abcKey =
    `${tonicLetter}${tonicAlter === 1 ? '#' : tonicAlter === -1 ? 'b' : ''}${mode === 'minor' ? 'm' : ''}`;
  return { scale, abcKey, mode, tonicLetter, tonicIdx };
};

type ResolvedKey = ReturnType<typeof resolveKey>;

// Map an absolute scale-degree index (0 = tonic, 7 = tonic an octave up, may be
// negative) to a concrete pitch: midi number + ABC token.
const scaleNoteAt = (absIdx: number, key: ResolvedKey, baseOct: number) => {
  const k = Math.floor(absIdx / 7);
  const d = ((absIdx % 7) + 7) % 7;
  const tone = key.scale[d];
  const letterPos = key.tonicIdx + d;
  const octave = baseOct + k + Math.floor(letterPos / 7);
  let abc = tone.letter;
  if (octave >= 5) abc = tone.letter.toLowerCase() + "'".repeat(octave - 5);
  else if (octave <= 3) abc = tone.letter + ','.repeat(4 - octave);
  const midi = (octave + 1) * 12 + LETTER_SEMITONE[tone.letter] + tone.alter;
  return { midi, abc };
};

// Choose the tonic octave that lands the key centre nearest the range midpoint.
const chooseBaseOct = (key: ResolvedKey, lowMidi: number, highMidi: number): number => {
  const mid = (lowMidi + highMidi) / 2;
  let best = 4;
  let bestDist = Infinity;
  for (let o = 1; o <= 7; o++) {
    const m = (o + 1) * 12 + LETTER_SEMITONE[key.tonicLetter] + key.scale[0].alter;
    if (Math.abs(m - mid) < bestDist) { bestDist = Math.abs(m - mid); best = o; }
  }
  return best;
};

// Duration token for `L:1/8`. `beats` counts quarter notes (quarter = 1).
const durToken = (beats: number): string => {
  const u = Math.round((beats / 0.5) * 4) / 4; // eighth-note units, quarter-unit precision
  if (u === 1) return '';
  if (Number.isInteger(u)) return String(u);
  if (u === 0.5) return '/2';
  if (u === 0.25) return '/4';
  if (u === 1.5) return '3/2';
  if (u === 0.75) return '3/4';
  return `${Math.round(u * 4)}/4`;
};

const UNIT_BEATS: Record<string, number> = { whole: 4, half: 2, quarter: 1, eighth: 0.5, sixteenth: 0.25 };

const weightedUnit = (freqs: Record<string, number>, allowed: string[]): string => {
  const withWeight = allowed.filter(u => (freqs[u] ?? 0) > 0);
  const pool = withWeight.length ? withWeight : allowed;
  const total = pool.reduce((s, u) => s + (withWeight.length ? freqs[u] : 1), 0);
  let r = Math.random() * total;
  for (const u of pool) {
    r -= withWeight.length ? freqs[u] : 1;
    if (r <= 0) return u;
  }
  return pool[pool.length - 1];
};

// Fill one measure with rhythm slots that sum exactly to `beatsPerMeasure`.
const buildRhythm = (beatsPerMeasure: number, r: AppSettings['rhythm']): Array<{ beats: number; triplet: boolean }> => {
  const enabled = (r.enabledUnits || []).filter(u => u === 'triplet' || UNIT_BEATS[u] !== undefined);
  const units = enabled.length ? enabled : ['quarter'];
  const slots: Array<{ beats: number; triplet: boolean }> = [];
  let remaining = beatsPerMeasure;
  let guard = 0;
  while (remaining > 1e-6 && guard++ < 64) {
    const fit = units.filter(u => (u === 'triplet' ? remaining >= 1 - 1e-9 : UNIT_BEATS[u] <= remaining + 1e-9));
    if (!fit.length) { slots.push({ beats: remaining, triplet: false }); break; }
    const u = weightedUnit(r.frequencies || {}, fit);
    if (u === 'triplet') { slots.push({ beats: 1, triplet: true }); remaining -= 1; continue; }
    let b = UNIT_BEATS[u];
    if (r.allowDotted && b >= 0.5 && b * 1.5 <= remaining + 1e-9 && Math.random() < 0.25) b *= 1.5;
    slots.push({ beats: b, triplet: false });
    remaining -= b;
  }
  return slots;
};

const INTERVAL_STEPS: Record<string, number> = { '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7 };
const maxLeapSteps = (name: string): number => {
  if (/tritone/i.test(name)) return 3;
  const m = /(\d)/.exec(name);
  return m ? (INTERVAL_STEPS[m[1]] ?? 7) : 7;
};

const buildMelodyBars = (settings: AppSettings, key: ResolvedKey): string[] => {
  const lowMidi = parseSciNote(settings.lowestNote);
  const highMidi = parseSciNote(settings.highestNote);
  const baseOct = chooseBaseOct(key, lowMidi, highMidi);
  const inRange = (a: number) => {
    const { midi } = scaleNoteAt(a, key, baseOct);
    return midi >= lowMidi && midi <= highMidi;
  };
  let cur = 0;
  let g = 0;
  while (!inRange(cur) && g++ < 40) cur += 1;
  g = 0;
  while (!inRange(cur) && g++ < 40) cur -= 1;

  const maxLeap = Math.max(1, maxLeapSteps(settings.maxInterval));
  const [numer, denom] = parseMeter(settings.timeSignature);
  const beatsPerMeasure = numer * (4 / denom);
  const measures = Math.max(1, settings.measures || 2);
  const arts = settings.articulations;
  const staccatoP = arts.enabledIds.includes('staccato') ? (arts.frequencies.staccato ?? 20) / 100 : 0;
  const accentP = arts.enabledIds.includes('accent') ? (arts.frequencies.accent ?? 15) / 100 : 0;
  const chromP = Math.min(0.6, (settings.accidentalsChance ?? 0) / 100);

  const step = () => {
    const roll = Math.random();
    let s: number;
    if (roll < 0.6) s = rand([-1, 1]);
    else if (roll < 0.85) s = rand([-2, -1, 1, 2]);
    else if (roll < 0.93) s = 0;
    else {
      const size = 2 + Math.floor(Math.random() * Math.max(1, maxLeap - 1)); // 2..maxLeap
      s = rand([-1, 1]) * Math.min(maxLeap, size);
    }
    let next = cur + s;
    if (!inRange(next)) next = cur - s;
    if (!inRange(next)) next = cur;
    cur = next;
  };

  const bars: string[] = [];
  for (let mi = 0; mi < measures; mi++) {
    const slots = buildRhythm(beatsPerMeasure, settings.rhythm);
    const altered = new Set<string>(); // letters carrying an explicit accidental in this bar
    const tokens: string[] = [];

    const noteToken = (dur: string, allowChromatic: boolean): string => {
      step();
      const { abc } = scaleNoteAt(cur, key, baseOct);
      const toneAlter = key.scale[((cur % 7) + 7) % 7].alter;
      const letter = abc.replace(/[',]/g, '').toUpperCase();
      let acc = '';
      // Only chromatically alter a natural scale tone, so `^`/`_` stay sensible
      // spellings (no `^B` in a flat key, no double accidentals).
      if (allowChromatic && toneAlter === 0 && Math.random() < chromP) {
        acc = rand(['^', '_']);
        altered.add(letter);
      } else if (altered.has(letter)) {
        acc = '='; // cancel a previous chromatic on this letter within the bar
        altered.delete(letter);
      }
      let deco = '';
      if (Math.random() < accentP) deco += '!>!';
      if (Math.random() < staccatoP) deco += '.';
      return `${deco}${acc}${abc}${dur}`;
    };

    for (const slot of slots) {
      if (slot.triplet) {
        const g3 = [noteToken('', false), noteToken('', false), noteToken('', false)];
        tokens.push(`(3${g3.join('')}`);
      } else {
        tokens.push(noteToken(durToken(slot.beats), true));
      }
    }
    bars.push(tokens.join(' '));
  }
  return bars;
};

const buildIntervalBars = (settings: AppSettings, key: ResolvedKey): string[] => {
  const lowMidi = parseSciNote(settings.lowestNote);
  const highMidi = parseSciNote(settings.highestNote);
  const baseOct = chooseBaseOct(key, lowMidi, highMidi);
  const fits = (a: number) => {
    const { midi } = scaleNoteAt(a, key, baseOct);
    return midi >= lowMidi && midi <= highMidi;
  };
  const maxSpan = Math.max(1, maxLeapSteps(settings.maxInterval));
  const [numer, denom] = parseMeter(settings.timeSignature);
  const beatsPerMeasure = numer * (4 / denom);
  const measures = Math.max(1, settings.measures || 2);
  const harmonic = settings.intervalType !== 'melodic';

  // Precompute the window of root indices whose lower note sits in range.
  const inWindow: number[] = [];
  for (let a = -45; a <= 45; a++) if (fits(a)) inWindow.push(a);
  const loIdx = inWindow.length ? inWindow[0] : 0;
  const hiIdx = inWindow.length ? inWindow[inWindow.length - 1] : 7;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  let root = clamp(0, loIdx, hiIdx);
  const bars: string[] = [];
  for (let mi = 0; mi < measures; mi++) {
    const tokens: string[] = [];
    for (let b = 0; b < Math.round(beatsPerMeasure); b++) {
      const span = Math.min(maxSpan, 1 + Math.floor(Math.random() * maxSpan));
      root = clamp(root + rand([-2, -1, -1, 1, 1, 2]), loIdx, Math.max(loIdx, hiIdx - span));
      // keep the upper note in range too; if the window is narrower than the
      // span, shrink the interval rather than leave the staff.
      const topSpan = Math.min(span, hiIdx - root);
      const lo = scaleNoteAt(root, key, baseOct).abc;
      const hi = scaleNoteAt(root + Math.max(1, topSpan), key, baseOct).abc;
      tokens.push(harmonic ? `[${lo}${hi}]2` : `${lo}${hi}`); // melodic = two eighths per beat
    }
    bars.push(tokens.join(' '));
  }
  return bars;
};

const TRIAD_QUALITY_MAJOR = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'];
const TRIAD_QUALITY_MINOR = ['min', 'dim', 'maj', 'min', 'min', 'maj', 'maj'];
const FUNCTIONAL_PROGRESSIONS = [
  [0, 3, 4, 0], // I  IV V  I
  [0, 5, 3, 4], // I  vi IV V
  [1, 4, 0, 0], // ii V  I  I
  [0, 4, 5, 3], // I  V  vi IV
  [0, 3, 1, 4], // I  IV ii V
];

const chordSymbol = (rootName: string, quality: string, seventh: string | null): string => {
  if (seventh === 'halfdim') return `${rootName}m7b5`;
  let s = rootName;
  if (quality === 'min') s += 'm';
  else if (quality === 'dim') s += 'dim';
  else if (quality === 'aug') s += 'aug';
  if (seventh === 'maj7') s += 'maj7';
  else if (seventh === 'dom7' || seventh === 'min7') s += '7';
  return s;
};

// Returns { degrees, quality, seventh, tones(abs indices) } per measure.
const planChords = (settings: AppSettings, key: ResolvedKey) => {
  const cs = settings.chordSettings;
  const measures = Math.max(1, settings.measures || 2);
  const triadQ = key.mode === 'minor' ? TRIAD_QUALITY_MINOR : TRIAD_QUALITY_MAJOR;
  const useSeventh = (cs.enabledSevenths || []).length > 0;

  let degrees: number[];
  if (settings.functionalHarmonyMode) {
    const prog = rand(FUNCTIONAL_PROGRESSIONS);
    degrees = Array.from({ length: measures }, (_, i) => prog[i % prog.length]);
  } else {
    const allowedQ: string[] = (cs.enabledTriads || []).map(t =>
      t === 'major' ? 'maj' : t === 'minor' ? 'min' : t === 'diminished' ? 'dim' : t === 'augmented' ? 'aug' : 'maj');
    const ok = [0, 1, 2, 3, 4, 5, 6].filter(d => allowedQ.includes(triadQ[d]));
    const pool = ok.length ? ok : [0, 3, 4];
    degrees = Array.from({ length: measures }, (_, i) => (i === 0 ? 0 : rand(pool)));
  }

  return degrees.map(d => {
    const tone = key.scale[d];
    const rootName = tone.letter + (tone.alter === 1 ? '#' : tone.alter === -1 ? 'b' : '');
    const quality = triadQ[d];
    const seventh = !useSeventh ? null
      : quality === 'maj' && d === 4 ? 'dom7'
      : quality === 'maj' ? 'maj7'
      : quality === 'min' ? 'min7'
      : quality === 'dim' ? 'halfdim'
      : null;

    let offsets = seventh ? [0, 2, 4, 6] : [0, 2, 4];
    // shell voicing: root, 3rd, 7th only (needs a 7th)
    if ((settings.chordSettings.enabledVoicings || []).includes('shell') && seventh) offsets = [0, 2, 6];

    // inversion: move the lowest tone up an octave
    const invAllowed = seventh ? settings.chordSettings.seventhInversions : settings.chordSettings.triadInversions;
    let voice = offsets.map(o => d + o);
    if (invAllowed && Math.random() < 0.5) voice = [...voice.slice(1), voice[0] + 7];

    return { rootName, quality, seventh, voice };
  });
};

const buildChordBars = (settings: AppSettings, key: ResolvedKey): string[] => {
  const [numer, denom] = parseMeter(settings.timeSignature);
  const dur = durToken(numer * (4 / denom));
  const baseOct = settings.clef === ClefType.BASS ? 3 : 4;

  return planChords(settings, key).map(ch => {
    const sym = settings.showChordSymbols ? `"${chordSymbol(ch.rootName, ch.quality, ch.seventh)}"` : '';
    const notes = ch.voice.map(a => scaleNoteAt(a, key, baseOct).abc).join('');
    return `${sym}[${notes}]${dur}`;
  });
};

const buildPianoChordVoices = (settings: AppSettings, key: ResolvedKey): { treble: string; bass: string } => {
  const [numer, denom] = parseMeter(settings.timeSignature);
  const dur = durToken(numer * (4 / denom));
  const plan = planChords(settings, key);

  const treble = plan.map(ch => {
    const sym = settings.showChordSymbols ? `"${chordSymbol(ch.rootName, ch.quality, ch.seventh)}"` : '';
    const notes = ch.voice.map(a => scaleNoteAt(a, key, 4).abc).join('');
    return `${sym}[${notes}]${dur}`;
  }).join(' | ');

  const bass = plan.map(ch => {
    const rootDeg = ch.voice[0] % 7; // fold inversion back to the chord root for the LH
    const root = scaleNoteAt(rootDeg, key, 2).abc;
    const fifth = scaleNoteAt(rootDeg + 4, key, 2).abc;
    return `[${root}${fifth}]${dur}`;
  }).join(' | ');

  return { treble: `${treble} |]`, bass: `${bass} |]` };
};

// Fallback used when the API key is missing or a request fails.
const getDefaultAbc = (settings: AppSettings): string => {
  const availableKeys = settings.selectedKeys.length > 0 ? settings.selectedKeys : ['C Major'];
  const activeKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
  const key = resolveKey(activeKey);

  const [numer, denom] = parseMeter(settings.timeSignature);
  const meterField = settings.timeSignature === 'C' || settings.timeSignature === 'C|'
    ? settings.timeSignature
    : `${numer}/${denom}`;
  const clef =
    settings.clef === ClefType.BASS ? 'bass' :
    settings.clef === ClefType.ALTO ? 'alto' : 'treble';

  const header = [
    'X:1',
    'T:Generated Exercise (Offline Mode)',
    `M:${meterField}`,
    'L:1/8',
    `Q:1/4=${settings.tempo}`,
  ];

  const isPianoChords = settings.mode === GeneratorMode.CHORD && settings.instrumentMode === 'piano';

  if (isPianoChords) {
    const { treble, bass } = buildPianoChordVoices(settings, key);
    return [
      ...header,
      `K:${key.abcKey}`,
      'V:1 clef=treble',
      treble,
      'V:2 clef=bass',
      bass,
    ].join('\n');
  }

  let bars: string[];
  if (settings.mode === GeneratorMode.INTERVAL) bars = buildIntervalBars(settings, key);
  else if (settings.mode === GeneratorMode.CHORD) bars = buildChordBars(settings, key);
  else bars = buildMelodyBars(settings, key);

  return [
    ...header,
    `K:${key.abcKey} clef=${clef}`,
    `${bars.join(' | ')} |]`,
  ].join('\n');
};