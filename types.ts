
export enum GeneratorMode {
  MELODY = 'Melody',
  INTERVAL = 'Interval',
  CHORD = 'Chord',
}

export enum ClefType {
  TREBLE = 'treble',
  BASS = 'bass',
  ALTO = 'alto',
}

export type Theme = 'light' | 'dark';

export interface RhythmSettings {
  enabledUnits: string[]; // e.g., ['quarter', 'eighth']
  allowDotted: boolean;
  frequencies: { [key: string]: number }; // e.g., { quarter: 50, eighth: 50 }
}

export interface ArticulationSettings {
  enabledIds: string[]; // e.g., ['staccato', 'accent']
  frequencies: { [key: string]: number }; // e.g., { staccato: 20, hammer_pull: 15 }
}

export interface ChordSettings {
  enabledTriads: string[]; // e.g. ['major', 'minor']
  triadInversions: boolean;
  enabledSevenths: string[]; // e.g. ['maj7', 'min7']
  seventhInversions: boolean;
  enabledVoicings: string[]; // e.g. ['close', 'drop2']
}

export interface PianoSettings {
  bassClef: { min: string; max: string };
  trebleClef: { min: string; max: string };
}

export interface AppSettings {
  mode: GeneratorMode;
  keySignature: string; // Current active key (randomly chosen from selectedKeys during generation)
  selectedKeys: string[]; // Pool of keys selected by user
  timeSignature: string;
  measures: number;
  clef: ClefType;
  lowestNote: string;
  highestNote: string;
  tempo: number;
  metronomeOn: boolean;   // Metronome toggle state
  accidentalsChance: number; // 0 to 100
  
  // Interval Specifics
  intervalType: 'harmonic' | 'melodic';
  maxInterval: string; // e.g., 'Perfect 5th'

  // Chord Specifics
  chordSettings: ChordSettings;
  functionalHarmonyMode: boolean; // "Functional Harmony" toggle
  instrumentMode: 'guitar' | 'piano'; // Replaces guitarHarmonyMode
  pianoSettings: PianoSettings;
  showStaff: boolean;             // "Staff" checkbox
  showChordSymbols: boolean;      // "Chord Symbols" checkbox

  // Melody Specifics
  articulations: ArticulationSettings;
  
  // Rhythm Specifics
  rhythm: RhythmSettings;
}

export interface GeneratedContent {
  abcNotation: string;
  explanation?: string;
}
