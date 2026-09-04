import abcjs from "abcjs";
import { AppSettings, GeneratorMode, ClefType } from "../types";
import { KEY_DATA } from "../constants";

// Provider is config-driven: any OpenAI-compatible chat-completions endpoint.
// Defaults to OpenRouter with a free GLM model. Override with LLM_BASE_URL /
// LLM_MODEL in .env (see .env.example). The call is client-side, so whatever
// key you use ships in the bundle — keep it a free / low-limit key.
const LLM_BASE_URL = (process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
const LLM_MODEL = process.env.LLM_MODEL || "z-ai/glm-5.2:free";
const LLM_ENDPOINT = `${LLM_BASE_URL}/chat/completions`;

const getSystemInstruction = () => `
You are a professional music composition engine for a sight-reading app.
Generate valid ABC Music Notation based STRICTLY on the user's constraints.

Respond with a single JSON object and nothing else (no markdown, no code fences):
{ "abc": "The full ABC notation string starting with X:1..." }

Rules for the ABC string:
- Header lines: X:1, T: (generic or empty), M: (time signature), L: (unit note
  length, usually 1/8), Q: (tempo), K: (key signature). Then the music.
- Every bar's note durations MUST sum exactly to the time signature.
- In ABC a trailing number is a DURATION multiplier of L:, never an octave.
  Octaves: C is middle C, c is one octave up, C, is one octave down.
- Produce exactly the requested number of measures. End with a final barline.
- Only diatonic notes unless the accidentals probability or the constraints call
  for chromatics.

Mode specifics:
- INTERVAL: two notes together (harmonic) or in sequence (melodic).
- CHORD: note groups in [brackets]. Guitar = playable voicings. Piano = Grand
  Staff with V:1 (treble) and V:2 (bass). Chord symbols in double quotes before
  the group, e.g. "Am" [Ace].
- MELODY: a single line. Apply the requested articulations.

Strictly adhere to the Range, Clef, Key, meter and measure count provided.
`;

const buildPrompt = (settings: AppSettings, activeKey: string): string => {
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

  return `
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
};

// Pull the ABC string out of the model's reply. Tolerates code fences, a
// <think> preamble from reasoning models, and prose around the JSON.
const extractAbc = (raw: string): string | null => {
  let t = (raw || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  if (t.includes("```")) t = t.replace(/```json/gi, "").replace(/```/g, "").trim();

  const candidates: string[] = [];
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last > first) candidates.push(t.slice(first, last + 1));
  if (first !== -1) candidates.push(t.slice(first));
  candidates.push(t);

  for (const c of candidates) {
    try {
      const obj = JSON.parse(c);
      const abc = typeof obj?.abc === "string" ? obj.abc.trim() : "";
      if (abc) return abc;
    } catch {
      /* try the next candidate */
    }
  }
  return null;
};

// Reject output that isn't parseable ABC or is missing required headers, so a
// bad generation falls back to the offline generator instead of rendering junk.
const isUsableAbc = (abc: string): boolean => {
  if (!/^X:/m.test(abc) || !/^K:/m.test(abc) || !/^M:/m.test(abc)) return false;
  try {
    const tune = abcjs.parseOnly(abc)?.[0];
    if (!tune || !tune.lines || tune.lines.length === 0) return false;
    const warnings: string[] = (tune as { warnings?: string[] }).warnings ?? [];
    // Cosmetic warnings are fine; structural parse failures are not.
    return !warnings.some(w => /can't|cannot|not\s+understand|unexpected|invalid/i.test(w));
  } catch {
    return false;
  }
};

const IS_OPENROUTER = /(^|\.)openrouter\.ai/i.test(LLM_BASE_URL);

const callLlm = async (apiKey: string, prompt: string, temperature: number): Promise<string> => {
  const res = await fetch(LLM_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      // OpenRouter attribution headers only — other providers (e.g. Gemini's
      // OpenAI-compatible endpoint) reject unknown headers at CORS preflight.
      ...(IS_OPENROUTER && typeof location !== "undefined"
        ? { "HTTP-Referer": location.origin, "X-Title": "Sight-Reading Generator" }
        : {}),
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: getSystemInstruction() },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`LLM request failed: ${res.status} ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const msg = data?.choices?.[0]?.message;
  // Some reasoning models put the answer in `content`, thinking in `reasoning`.
  return msg?.content || msg?.reasoning || "";
};

export const generateMusic = async (settings: AppSettings): Promise<string> => {
  // Injected by vite.config.ts from API_KEY / LLM_API_KEY / GLM_API_KEY.
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("No API key set — using the offline generator");
    return getDefaultAbc(settings);
  }

  const availableKeys = settings.selectedKeys.length > 0 ? settings.selectedKeys : ['C Major'];
  const activeKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
  const prompt = buildPrompt(settings, activeKey);
  const temperature = settings.functionalHarmonyMode ? 0.7 : 0.9;

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const nudge = attempt === 0 ? "" :
        '\n\nYour previous reply was not valid ABC. Return ONLY {"abc":"..."} ' +
        "with syntactically correct ABC whose bars sum to the meter.";
      const abc = extractAbc(await callLlm(apiKey, prompt + nudge, temperature));
      if (abc && isUsableAbc(abc)) return abc;
      console.warn(`AI output failed validation (attempt ${attempt + 1})`);
    }
  } catch (error) {
    console.error("AI generation failed", error);
  }
  return getDefaultAbc(settings);
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
  return { scale, abcKey, mode, tonicLetter, tonicIdx, flat: !isSharp };
};

type ResolvedKey = ReturnType<typeof resolveKey>;

// Spell a chord tone as an ABC token. `rootLetter` + `genericStep` (0=root,
// 1=2nd, 2=3rd, 4=5th, 6=7th, ...) fix the letter name, then the accidental is
// chosen so the letter sounds `midi` — relative to the key signature, so a
// diatonic tone needs nothing and e.g. the 3rd of a D chord always spells F#,
// never Gb, in any key.
const spellChordTone = (rootLetter: string, genericStep: number, midi: number, key: ResolvedKey): string => {
  const letter = LETTERS[(LETTERS.indexOf(rootLetter) + genericStep) % 7];
  const natural = LETTER_SEMITONE[letter];
  const pc = ((midi % 12) + 12) % 12;
  let alter = ((pc - natural + 6) % 12) - 6;   // nearest signed distance, -6..+5
  if (alter < -2) alter += 12;
  if (alter > 2) alter -= 12;
  const keyAlter = key.scale.find(t => t.letter === letter)?.alter ?? 0;
  const acc = keyAlter === alter ? ''
    : alter === 2 ? '^^' : alter === 1 ? '^'
    : alter === -2 ? '__' : alter === -1 ? '_' : '=';
  const octave = (midi - natural - alter) / 12 - 1; // octave of this spelling
  let s = letter;
  if (octave >= 5) s = letter.toLowerCase() + "'".repeat(octave - 5);
  else if (octave <= 3) s = letter + ','.repeat(4 - octave);
  return acc + s;
};

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
  const acciacP = arts.enabledIds.includes('acciaccatura') ? (arts.frequencies.acciaccatura ?? 10) / 100 : 0;
  // Hammer-on / pull-off render as a two-note slur.
  const slurP = (arts.enabledIds.includes('hammer') || arts.enabledIds.includes('pull'))
    ? (arts.frequencies.hammer_pull ?? 15) / 100 : 0;
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

    const noteToken = (dur: string, allowChromatic: boolean, allowGrace: boolean): string => {
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
      if (allowGrace && Math.random() < acciacP) {
        deco += `{/${scaleNoteAt(cur + rand([-1, 1]), key, baseOct).abc}}`; // acciaccatura
      }
      if (Math.random() < accentP) deco += '!>!';
      if (Math.random() < staccatoP) deco += '.';
      return `${deco}${acc}${abc}${dur}`;
    };

    const notes: Array<{ text: string; triplet: boolean }> = [];
    for (const slot of slots) {
      if (slot.triplet) {
        const g3 = [
          noteToken('', false, false), noteToken('', false, false), noteToken('', false, false),
        ];
        notes.push({ text: `(3${g3.join('')}`, triplet: true });
      } else {
        notes.push({ text: noteToken(durToken(slot.beats), true, true), triplet: false });
      }
    }

    // Slur adjacent single-note pairs for hammer-on / pull-off.
    const open = new Array(notes.length).fill(false);
    const close = new Array(notes.length).fill(false);
    for (let i = 0; i < notes.length - 1; i++) {
      if (notes[i].triplet || notes[i + 1].triplet) continue;
      if (Math.random() < slurP) { open[i] = true; close[i + 1] = true; i++; }
    }
    bars.push(notes.map((n, i) => `${open[i] ? '(' : ''}${n.text}${close[i] ? ')' : ''}`).join(' '));
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

// Chord shapes: `semi` = semitone offsets from root, `gen` = generic scale-step
// of each tone (0 root, 1 second, 2 third, 3 fourth, 4 fifth, 6 seventh) so the
// speller can name it correctly.
const CHORD_SHAPE: Record<string, { semi: number[]; gen: number[] }> = {
  maj: { semi: [0, 4, 7], gen: [0, 2, 4] },
  min: { semi: [0, 3, 7], gen: [0, 2, 4] },
  dim: { semi: [0, 3, 6], gen: [0, 2, 4] },
  aug: { semi: [0, 4, 8], gen: [0, 2, 4] },
  sus2: { semi: [0, 2, 7], gen: [0, 1, 4] },
  sus4: { semi: [0, 5, 7], gen: [0, 3, 4] },
};
const SEVENTH_SEMI: Record<string, number> = { maj7: 11, min7: 10, dom7: 10, halfdim: 10, sus7: 10 };
// Which 7ths a given triad quality can carry (random mode).
const SEVENTHS_FOR: Record<string, string[]> = {
  maj: ['maj7', 'dom7'],
  min: ['min7', 'maj7'],
  dim: ['halfdim'],
  aug: ['maj7', 'dom7'],
  sus2: ['sus7'],
  sus4: ['sus7'],
};
const TRIAD_ID_TO_QUALITY: Record<string, string> = {
  major: 'maj', minor: 'min', diminished: 'dim', augmented: 'aug', sus: 'sus',
};

const chordSymbol = (root: string, quality: string, seventh: string | null): string => {
  if (seventh === 'sus7') return `${root}7sus${quality === 'sus2' ? '2' : '4'}`;
  if (seventh === 'halfdim') return `${root}m7b5`;
  const base =
    quality === 'min' ? `${root}m` :
    quality === 'dim' ? `${root}dim` :
    quality === 'aug' ? `${root}aug` :
    quality === 'sus2' ? `${root}sus2` :
    quality === 'sus4' ? `${root}sus4` : root;
  if (seventh === 'maj7') return quality === 'min' ? `${root}m(maj7)` : `${base}maj7`;
  if (seventh === 'dom7' || seventh === 'min7') return `${base}7`;
  return base;
};

interface ChordTone { midi: number; gen: number; }
interface ChordPlan { rootLetter: string; rootName: string; quality: string; seventh: string | null; tones: ChordTone[]; }

// One chord per measure: pitch set (close, root position) tagged with generic
// steps, plus label parts.
const planChords = (settings: AppSettings, key: ResolvedKey): ChordPlan[] => {
  const cs = settings.chordSettings;
  const measures = Math.max(1, settings.measures || 2);
  const triadQ = key.mode === 'minor' ? TRIAD_QUALITY_MINOR : TRIAD_QUALITY_MAJOR;
  const sevenths = cs.enabledSevenths || [];
  const useSeventh = sevenths.length > 0;
  const nameOfDegree = (d: number) => {
    const t = key.scale[((d % 7) + 7) % 7];
    return t.letter + (t.alter === 1 ? '#' : t.alter === -1 ? 'b' : '');
  };

  const progression = rand(FUNCTIONAL_PROGRESSIONS);
  const raw: ChordPlan[] = [];
  for (let i = 0; i < measures; i++) {
    let quality: string;
    let degree: number;
    let seventh: string | null;

    if (settings.functionalHarmonyMode) {
      degree = progression[i % progression.length];
      quality = triadQ[degree];
      seventh = !useSeventh ? null
        : quality === 'maj' && degree === 4 ? 'dom7'
        : quality === 'maj' ? 'maj7'
        : quality === 'min' ? 'min7'
        : quality === 'dim' ? 'halfdim' : null;
    } else {
      const qPool = (cs.enabledTriads || []).map(t => TRIAD_ID_TO_QUALITY[t] ?? 'maj');
      const pool = qPool.length ? qPool : ['maj', 'min'];
      quality = i === 0 ? (pool.includes('maj') ? 'maj' : pool[0]) : rand(pool);
      if (quality === 'sus') quality = rand(['sus2', 'sus4']);
      degree = i === 0 ? 0 : Math.floor(Math.random() * 7);
      // Only take a 7th the triad quality can actually carry.
      const compat = SEVENTHS_FOR[quality] ?? ['maj7', 'dom7'];
      const usable = sevenths.filter(s => compat.includes(s));
      seventh = usable.length && Math.random() < 0.6 ? rand(usable) : null;
    }

    const rootMidi = scaleNoteAt(degree, key, 4).midi;
    const shape = CHORD_SHAPE[quality] ?? CHORD_SHAPE.maj;
    const tones: ChordTone[] = shape.semi.map((s, j) => ({ midi: rootMidi + s, gen: shape.gen[j] }));
    if (seventh) tones.push({ midi: rootMidi + SEVENTH_SEMI[seventh], gen: 6 });

    raw.push({ rootLetter: key.scale[degree].letter, rootName: nameOfDegree(degree), quality, seventh, tones });
  }

  // Apply voicing + inversion to each chord's pitch set.
  return raw.map(p => {
    let t = [...p.tones].sort((a, b) => a.midi - b.midi);
    const hasSeventh = !!p.seventh;
    const v = cs.enabledVoicings || [];
    if (v.includes('shell') && t.length >= 3) {
      t = hasSeventh ? [t[0], t[1], t[t.length - 1]] : [t[0], t[1], t[2]]; // root, 3rd, 7th (or 5th)
    } else if (v.includes('drop3') && t.length >= 4) {
      t[t.length - 3] = { ...t[t.length - 3], midi: t[t.length - 3].midi - 12 };
    } else if (v.includes('drop2') && t.length >= 3) {
      t[t.length - 2] = { ...t[t.length - 2], midi: t[t.length - 2].midi - 12 };
    }
    t.sort((a, b) => a.midi - b.midi);
    const invAllowed = hasSeventh ? cs.seventhInversions : cs.triadInversions;
    if (invAllowed && Math.random() < 0.5) {
      t[0] = { ...t[0], midi: t[0].midi + 12 };
      t.sort((a, b) => a.midi - b.midi);
    }
    return { ...p, tones: t };
  });
};

const renderChord = (ch: ChordPlan, key: ResolvedKey, octShift: number): string =>
  ch.tones.map(tone => spellChordTone(ch.rootLetter, tone.gen, tone.midi + octShift, key)).join('');

const buildChordBars = (settings: AppSettings, key: ResolvedKey): string[] => {
  const [numer, denom] = parseMeter(settings.timeSignature);
  const dur = durToken(numer * (4 / denom));
  const octShift = settings.clef === ClefType.BASS ? -12 : 0;
  return planChords(settings, key).map(ch => {
    const sym = settings.showChordSymbols ? `"${chordSymbol(ch.rootName, ch.quality, ch.seventh)}"` : '';
    return `${sym}[${renderChord(ch, key, octShift)}]${dur}`;
  });
};

const buildPianoChordVoices = (settings: AppSettings, key: ResolvedKey): { treble: string; bass: string } => {
  const [numer, denom] = parseMeter(settings.timeSignature);
  const dur = durToken(numer * (4 / denom));
  const plan = planChords(settings, key);
  const centreOf = (a: string, b: string) => (parseSciNote(a) + parseSciNote(b)) / 2;
  const trebleCentre = centreOf(settings.pianoSettings.trebleClef.min, settings.pianoSettings.trebleClef.max);
  const bassCentre = centreOf(settings.pianoSettings.bassClef.min, settings.pianoSettings.bassClef.max);

  const treble = plan.map(ch => {
    const sym = settings.showChordSymbols ? `"${chordSymbol(ch.rootName, ch.quality, ch.seventh)}"` : '';
    const mid = ch.tones.reduce((s, x) => s + x.midi, 0) / ch.tones.length;
    const shift = Math.round((trebleCentre - mid) / 12) * 12; // move chord into the RH range
    return `${sym}[${renderChord(ch, key, shift)}]${dur}`;
  }).join(' | ');

  const bass = plan.map(ch => {
    const rootTone = ch.tones.find(x => x.gen === 0) ?? ch.tones[0];
    const rootPc = ((rootTone.midi % 12) + 12) % 12;
    const root = rootPc + 12 * Math.round((bassCentre - rootPc) / 12);
    return `[${spellChordTone(ch.rootLetter, 0, root, key)}${spellChordTone(ch.rootLetter, 4, root + 7, key)}]${dur}`;
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