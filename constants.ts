
import { AppSettings, ClefType, GeneratorMode, RhythmSettings, ArticulationSettings, ChordSettings, PianoSettings } from './types';

export interface KeyOption {
  id: string;
  label: string;
  acc: string;
  type: 'major' | 'minor';
}

export const KEY_DATA: KeyOption[] = [
  // Major
  { id: 'C Major', label: 'C Major', acc: '', type: 'major' },
  { id: 'G Major', label: 'G Major', acc: '(1#)', type: 'major' },
  { id: 'D Major', label: 'D Major', acc: '(2#)', type: 'major' },
  { id: 'A Major', label: 'A Major', acc: '(3#)', type: 'major' },
  { id: 'E Major', label: 'E Major', acc: '(4#)', type: 'major' },
  { id: 'B Major', label: 'B Major', acc: '(5#)', type: 'major' },
  { id: 'F# Major', label: 'F# Major', acc: '(6#)', type: 'major' },
  { id: 'F Major', label: 'F Major', acc: '(1b)', type: 'major' },
  { id: 'Bb Major', label: 'Bb Major', acc: '(2b)', type: 'major' },
  { id: 'Eb Major', label: 'Eb Major', acc: '(3b)', type: 'major' },
  { id: 'Ab Major', label: 'Ab Major', acc: '(4b)', type: 'major' },
  { id: 'Db Major', label: 'Db Major', acc: '(5b)', type: 'major' },
  { id: 'Gb Major', label: 'Gb Major', acc: '(6b)', type: 'major' },
  // Minor
  { id: 'A Minor', label: 'A Minor', acc: '', type: 'minor' },
  { id: 'E Minor', label: 'E Minor', acc: '(1#)', type: 'minor' },
  { id: 'B Minor', label: 'B Minor', acc: '(2#)', type: 'minor' },
  { id: 'F# Minor', label: 'F# Minor', acc: '(3#)', type: 'minor' },
  { id: 'C# Minor', label: 'C# Minor', acc: '(4#)', type: 'minor' },
  { id: 'G# Minor', label: 'G# Minor', acc: '(5#)', type: 'minor' },
  { id: 'D# Minor', label: 'D# Minor', acc: '(6#)', type: 'minor' },
  { id: 'D Minor', label: 'D Minor', acc: '(1b)', type: 'minor' },
  { id: 'G Minor', label: 'G Minor', acc: '(2b)', type: 'minor' },
  { id: 'C Minor', label: 'C Minor', acc: '(3b)', type: 'minor' },
  { id: 'F Minor', label: 'F Minor', acc: '(4b)', type: 'minor' },
  { id: 'Bb Minor', label: 'Bb Minor', acc: '(5b)', type: 'minor' },
  { id: 'Eb Minor', label: 'Eb Minor', acc: '(6b)', type: 'minor' },
];

export const KEYS = KEY_DATA.map(k => k.id);

export const TIME_SIGNATURES = ['4/4', '3/4', '2/4', '6/8', '2/2'];

export const NOTES = [
  'C2', 'D2', 'E2', 'F2', // Lower octave for bass clef
  'G2', 'A2', 'B2',
  'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3',
  'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
  'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5',
  'C6', 'D6', 'E6', 'F6', 'G6' // Extended upper range
];

export const INTERVAL_OPTIONS = [
  'Minor 2nd', 'Major 2nd', 
  'Minor 3rd', 'Major 3rd',
  'Perfect 4th', 'Tritone (Aug 4th/Dim 5th)', 
  'Perfect 5th', 'Minor 6th', 
  'Major 6th', 'Minor 7th', 
  'Major 7th', 'Perfect 8th (Octave)'
];

export const RHYTHM_OPTIONS = [
  { id: 'whole', label: 'Whole Note' },
  { id: 'half', label: 'Half Note' },
  { id: 'quarter', label: 'Quarter Note' },
  { id: 'eighth', label: 'Eighth Note' },
  { id: 'sixteenth', label: 'Sixteenth Note' },
  { id: 'triplet', label: 'Triplet' },
];

export const ARTICULATION_TYPES = [
  { id: 'staccato', label: 'Staccato .', category: 'basic' },
  { id: 'accent', label: 'Accent >', category: 'basic' },
  { id: 'acciaccatura', label: 'Acciaccatura', category: 'basic' },
  { id: 'hammer', label: 'Hammer-on H', category: 'guitar' },
  { id: 'pull', label: 'Pull-off P', category: 'guitar' },
];

export const CHORD_TRIAD_OPTIONS = [
  { id: 'major', label: 'Major Triad' },
  { id: 'minor', label: 'Minor Triad' },
  { id: 'diminished', label: 'Diminished Triad' },
  { id: 'augmented', label: 'Augmented Triad' },
  { id: 'sus', label: 'Suspended Chords (sus2/sus4)' },
];

export const CHORD_SEVENTH_OPTIONS = [
  { id: 'maj7', label: 'Major 7th' },
  { id: 'min7', label: 'Minor 7th' },
  { id: 'dom7', label: 'Dominant 7th' },
  { id: 'halfdim', label: 'Half-Diminished 7th (m7b5)' },
  { id: 'sus7', label: '7th Suspended (7sus2/7sus4)' },
];

export const VOICING_OPTIONS = [
  { id: 'close', label: 'Close Voicing', desc: 'Chord tones arranged tightly together with small intervals (3 voices)' },
  { id: 'drop2', label: 'Drop 2 Voicing', desc: 'Lower the second-highest note of close voicing by an octave (3 voices)' },
  { id: 'drop3', label: 'Drop 3 Voicing', desc: 'Lower the third-highest note of close voicing by an octave (4 voices)' },
  { id: 'shell', label: 'Shell Voicing', desc: 'Simplified voicing containing only root, 3rd, and 7th (omitting 5th) (3 voices)' },
];

export const DEFAULT_RHYTHM_SETTINGS: RhythmSettings = {
  enabledUnits: ['half', 'quarter', 'eighth'],
  allowDotted: false,
  frequencies: {
    whole: 10,
    half: 30,
    quarter: 40,
    eighth: 20,
    sixteenth: 0,
    triplet: 0
  }
};

export const DEFAULT_ARTICULATION_SETTINGS: ArticulationSettings = {
  enabledIds: [],
  frequencies: {
    staccato: 20,
    accent: 15,
    acciaccatura: 10,
    hammer_pull: 15
  }
};

export const DEFAULT_CHORD_SETTINGS: ChordSettings = {
  enabledTriads: ['major', 'minor'],
  triadInversions: false,
  enabledSevenths: [],
  seventhInversions: false,
  enabledVoicings: ['close'],
};

export const DEFAULT_PIANO_SETTINGS: PianoSettings = {
  bassClef: { min: 'E2', max: 'E4' },
  trebleClef: { min: 'C4', max: 'E6' }
};

export const DEFAULT_SETTINGS: AppSettings = {
  mode: GeneratorMode.MELODY,
  keySignature: 'C Major',
  selectedKeys: ['C Major', 'A Minor'],
  timeSignature: '4/4',
  measures: 4,
  clef: ClefType.TREBLE,
  lowestNote: 'C4',
  highestNote: 'A5',
  tempo: 60,
  metronomeOn: false,
  accidentalsChance: 0,
  intervalType: 'harmonic',
  maxInterval: 'Perfect 8th (Octave)',
  chordSettings: DEFAULT_CHORD_SETTINGS,
  functionalHarmonyMode: true,
  instrumentMode: 'guitar', // Default 'guitar'
  pianoSettings: DEFAULT_PIANO_SETTINGS,
  showStaff: true,
  showChordSymbols: true,
  articulations: DEFAULT_ARTICULATION_SETTINGS,
  rhythm: DEFAULT_RHYTHM_SETTINGS,
};
