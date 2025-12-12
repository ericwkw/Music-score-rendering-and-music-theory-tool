
import React, { useState } from 'react';
import { AppSettings, GeneratorMode, ClefType, RhythmSettings, ArticulationSettings, ChordSettings, PianoSettings, Theme } from '../types';
import { KEY_DATA, TIME_SIGNATURES, NOTES, INTERVAL_OPTIONS, RHYTHM_OPTIONS, DEFAULT_RHYTHM_SETTINGS, ARTICULATION_TYPES, DEFAULT_ARTICULATION_SETTINGS, CHORD_TRIAD_OPTIONS, CHORD_SEVENTH_OPTIONS, VOICING_OPTIONS, DEFAULT_CHORD_SETTINGS, DEFAULT_PIANO_SETTINGS } from '../constants';
import Modal from './Modal';

interface ControlsProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onPlay: () => void;
  isPlaying?: boolean;
  theme: Theme;
}

const Controls: React.FC<ControlsProps> = ({ settings, updateSetting, onGenerate, isGenerating, onPlay, isPlaying = false, theme }) => {
  const [activeModal, setActiveModal] = useState<'none' | 'interval' | 'chord' | 'key' | 'rhythm' | 'articulation' | 'piano_bass' | 'piano_treble'>('none');
  
  // Temporary state for modals
  const [tempMaxInterval, setTempMaxInterval] = useState(settings.maxInterval);
  const [tempChordSettings, setTempChordSettings] = useState<ChordSettings>(settings.chordSettings || DEFAULT_CHORD_SETTINGS);
  const [tempSelectedKeys, setTempSelectedKeys] = useState<string[]>(settings.selectedKeys);
  const [tempRhythmSettings, setTempRhythmSettings] = useState<RhythmSettings>(settings.rhythm);
  const [tempArticulationSettings, setTempArticulationSettings] = useState<ArticulationSettings>(settings.articulations);
  const [tempPianoSettings, setTempPianoSettings] = useState<PianoSettings>(settings.pianoSettings || DEFAULT_PIANO_SETTINGS);
  
  const [isAdvancedRhythm, setIsAdvancedRhythm] = useState(false);
  const [isAdvancedArticulation, setIsAdvancedArticulation] = useState(false);
  const [isAdvancedChord, setIsAdvancedChord] = useState(false);

  // --- Modal Openers ---
  const openIntervalModal = () => {
    setTempMaxInterval(settings.maxInterval);
    setActiveModal('interval');
  };

  const openChordModal = () => {
    setTempChordSettings(settings.chordSettings ? { ...settings.chordSettings } : { ...DEFAULT_CHORD_SETTINGS });
    setIsAdvancedChord(false);
    setActiveModal('chord');
  };

  const openKeyModal = () => {
    setTempSelectedKeys(settings.selectedKeys);
    setActiveModal('key');
  };

  const openRhythmModal = () => {
    setTempRhythmSettings({ ...settings.rhythm });
    setIsAdvancedRhythm(false); 
    setActiveModal('rhythm');
  };

  const openArticulationModal = () => {
    setTempArticulationSettings(settings.articulations ? { ...settings.articulations } : { ...DEFAULT_ARTICULATION_SETTINGS });
    setIsAdvancedArticulation(false);
    setActiveModal('articulation');
  }

  const openPianoBassModal = () => {
    setTempPianoSettings(settings.pianoSettings ? { ...settings.pianoSettings } : { ...DEFAULT_PIANO_SETTINGS });
    setActiveModal('piano_bass');
  }

  const openPianoTrebleModal = () => {
      setTempPianoSettings(settings.pianoSettings ? { ...settings.pianoSettings } : { ...DEFAULT_PIANO_SETTINGS });
      setActiveModal('piano_treble');
  }

  // --- Save Handlers ---
  const saveIntervalSettings = () => {
    updateSetting('maxInterval', tempMaxInterval);
    setActiveModal('none');
  };

  const saveChordSettings = () => {
    updateSetting('chordSettings', tempChordSettings);
    setActiveModal('none');
  };

  const saveKeySettings = () => {
    updateSetting('selectedKeys', tempSelectedKeys);
    setActiveModal('none');
  };

  const saveRhythmSettings = () => {
    updateSetting('rhythm', tempRhythmSettings);
    setActiveModal('none');
  };

  const saveArticulationSettings = () => {
    updateSetting('articulations', tempArticulationSettings);
    setActiveModal('none');
  }

  const savePianoSettings = () => {
    updateSetting('pianoSettings', tempPianoSettings);
    setActiveModal('none');
  }

  // --- Helpers ---
  // Key Selection
  const toggleKey = (keyId: string) => {
    if (tempSelectedKeys.includes(keyId)) {
      setTempSelectedKeys(tempSelectedKeys.filter(k => k !== keyId));
    } else {
      setTempSelectedKeys([...tempSelectedKeys, keyId]);
    }
  };

  const selectAllKeys = (type: 'major' | 'minor') => {
    const keysOfType = KEY_DATA.filter(k => k.type === type).map(k => k.id);
    const allSelected = keysOfType.every(k => tempSelectedKeys.includes(k));
    
    if (allSelected) {
      setTempSelectedKeys(tempSelectedKeys.filter(k => !keysOfType.includes(k)));
    } else {
      const newKeys = [...tempSelectedKeys];
      keysOfType.forEach(k => {
        if (!newKeys.includes(k)) newKeys.push(k);
      });
      setTempSelectedKeys(newKeys);
    }
  };

  // Rhythm
  const toggleRhythmUnit = (unitId: string) => {
    const current = tempRhythmSettings.enabledUnits;
    if (current.includes(unitId)) {
      setTempRhythmSettings({ ...tempRhythmSettings, enabledUnits: current.filter(u => u !== unitId) });
    } else {
      setTempRhythmSettings({ ...tempRhythmSettings, enabledUnits: [...current, unitId] });
    }
  };

  const selectAllRhythm = () => {
    const allIds = RHYTHM_OPTIONS.map(r => r.id);
    if (tempRhythmSettings.enabledUnits.length === allIds.length) {
      setTempRhythmSettings({ ...tempRhythmSettings, enabledUnits: [] });
    } else {
      setTempRhythmSettings({ ...tempRhythmSettings, enabledUnits: allIds });
    }
  };

  const updateRhythmFrequency = (unitId: string, val: number) => {
    setTempRhythmSettings({
      ...tempRhythmSettings,
      frequencies: { ...tempRhythmSettings.frequencies, [unitId]: val }
    });
  };

  const resetRhythmDefaults = () => setTempRhythmSettings(DEFAULT_RHYTHM_SETTINGS);

  // Articulation
  const toggleArticulation = (id: string) => {
    const current = tempArticulationSettings.enabledIds;
    if (current.includes(id)) {
      setTempArticulationSettings({ ...tempArticulationSettings, enabledIds: current.filter(i => i !== id) });
    } else {
      setTempArticulationSettings({ ...tempArticulationSettings, enabledIds: [...current, id] });
    }
  }

  const selectAllArticulations = (category: 'basic' | 'guitar') => {
      const ids = ARTICULATION_TYPES.filter(t => t.category === category).map(t => t.id);
      const allSelected = ids.every(id => tempArticulationSettings.enabledIds.includes(id));
      if (allSelected) {
          setTempArticulationSettings({
              ...tempArticulationSettings,
              enabledIds: tempArticulationSettings.enabledIds.filter(id => !ids.includes(id))
          });
      } else {
           const newIds = [...tempArticulationSettings.enabledIds];
           ids.forEach(id => {
               if(!newIds.includes(id)) newIds.push(id);
           });
           setTempArticulationSettings({...tempArticulationSettings, enabledIds: newIds});
      }
  }

  const updateArticulationFrequency = (key: string, val: number) => {
      setTempArticulationSettings({
          ...tempArticulationSettings,
          frequencies: { ...tempArticulationSettings.frequencies, [key]: val }
      });
  }

  const resetArticulationDefaults = () => setTempArticulationSettings(DEFAULT_ARTICULATION_SETTINGS);

  // Chord Settings Helpers
  const toggleChordTriad = (id: string) => {
      const current = tempChordSettings.enabledTriads;
      if (current.includes(id)) setTempChordSettings({...tempChordSettings, enabledTriads: current.filter(c => c !== id)});
      else setTempChordSettings({...tempChordSettings, enabledTriads: [...current, id]});
  }
  const toggleChordSeventh = (id: string) => {
      const current = tempChordSettings.enabledSevenths;
      if (current.includes(id)) setTempChordSettings({...tempChordSettings, enabledSevenths: current.filter(c => c !== id)});
      else setTempChordSettings({...tempChordSettings, enabledSevenths: [...current, id]});
  }
  const toggleChordVoicing = (id: string) => {
      const current = tempChordSettings.enabledVoicings;
      if (current.includes(id)) setTempChordSettings({...tempChordSettings, enabledVoicings: current.filter(c => c !== id)});
      else setTempChordSettings({...tempChordSettings, enabledVoicings: [...current, id]});
  }
  const selectAllTriads = () => {
      const allIds = CHORD_TRIAD_OPTIONS.map(c => c.id);
      if (tempChordSettings.enabledTriads.length === allIds.length) setTempChordSettings({...tempChordSettings, enabledTriads: []});
      else setTempChordSettings({...tempChordSettings, enabledTriads: allIds});
  }
  const selectAllSevenths = () => {
      const allIds = CHORD_SEVENTH_OPTIONS.map(c => c.id);
      if (tempChordSettings.enabledSevenths.length === allIds.length) setTempChordSettings({...tempChordSettings, enabledSevenths: []});
      else setTempChordSettings({...tempChordSettings, enabledSevenths: allIds});
  }
  const selectAllVoicings = () => {
      const allIds = VOICING_OPTIONS.map(c => c.id);
      if (tempChordSettings.enabledVoicings.length === allIds.length) setTempChordSettings({...tempChordSettings, enabledVoicings: []});
      else setTempChordSettings({...tempChordSettings, enabledVoicings: allIds});
  }


  // --- Theming Colors ---
  const colors = theme === 'dark' ? {
      elemBg: 'bg-[#3a3a3a]',
      elemHover: 'hover:bg-[#4a4a4a]',
      elemBorder: 'border-gray-600',
      textMain: 'text-gray-200',
      textLabel: 'text-gray-300',
      textSub: 'text-gray-400',
      toggleOff: 'bg-gray-600',
      inputBg: 'bg-[#3a3a3a]',
      modalItemBg: 'bg-[#333]',
      modalItemBorder: 'border-gray-700',
      modalItemSelected: 'bg-[#3d3d3d]',
      modalHeader: 'text-white',
      descBox: 'bg-[#333] bg-opacity-50',
      modalCancel: 'bg-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]',
      measureInactive: 'border-gray-500 group-hover:border-gray-400'
  } : {
      elemBg: 'bg-white',
      elemHover: 'hover:bg-gray-50',
      elemBorder: 'border-gray-300',
      textMain: 'text-gray-900',
      textLabel: 'text-gray-700',
      textSub: 'text-gray-500',
      toggleOff: 'bg-gray-300',
      inputBg: 'bg-white',
      modalItemBg: 'bg-gray-50',
      modalItemBorder: 'border-gray-200',
      modalItemSelected: 'bg-blue-50',
      modalHeader: 'text-gray-900',
      descBox: 'bg-gray-50',
      modalCancel: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
      measureInactive: 'border-gray-300 group-hover:border-gray-400'
  };

  const getThemeColor = () => {
    switch (settings.mode) {
      case GeneratorMode.CHORD: return { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', text: 'text-orange-500', border: 'border-orange-500', slider: 'accent-orange-500', dot: 'bg-orange-500' };
      case GeneratorMode.MELODY: return { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-blue-500', border: 'border-blue-500', slider: 'accent-blue-500', dot: 'bg-blue-500' };
      case GeneratorMode.INTERVAL: 
      default: return { bg: 'bg-[#22c55e]', hover: 'hover:bg-[#16a34a]', text: 'text-[#22c55e]', border: 'border-[#22c55e]', slider: 'accent-[#22c55e]', dot: 'bg-[#22c55e]' };
    }
  };
  const themeAccent = getThemeColor();

  // --- Components ---
  const Toggle = ({ label, value, onChange }: { label: string, value: boolean, onChange: (v: boolean) => void }) => (
    <div className="flex flex-col gap-2">
      <span className={`text-sm ${colors.textLabel} font-medium`}>{label}</span>
      <div 
        onClick={() => onChange(!value)}
        className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors ${value ? themeAccent.bg : colors.toggleOff}`}
      >
        <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${value ? 'translate-x-6' : ''}`}></div>
      </div>
    </div>
  );

  const Checkbox = ({ label, value, onChange, large = false }: { label: string, value: boolean, onChange: (v: boolean) => void, large?: boolean }) => (
    <div className="flex flex-col gap-2">
        {!large && <label className={`text-sm ${colors.textLabel} font-medium`}>{label}</label>}
        <div 
            onClick={() => onChange(!value)}
            className={`${large ? 'w-6 h-6' : 'w-6 h-6'} ${colors.inputBg} rounded flex items-center justify-center cursor-pointer border ${colors.elemBorder} ${value ? `!bg-blue-600 !border-blue-600` : ''}`}
        >
            {value && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
            )}
        </div>
    </div>
  );

  const MeasureRadio = ({ val }: { val: number }) => (
    <div 
      onClick={() => updateSetting('measures', val)}
      className="flex items-center gap-3 cursor-pointer mb-2 group"
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${settings.measures === val ? `${themeAccent.border} bg-transparent` : colors.measureInactive}`}>
        {settings.measures === val && <div className={`w-2.5 h-2.5 rounded-full ${themeAccent.dot}`}></div>}
      </div>
      <span className={`text-sm font-medium ${colors.textMain}`}>{val} Measures</span>
    </div>
  );

  const SettingsButton = ({ label, value, options, onChange, displayValue }: { label: string, value: string, options: string[], onChange: (v: any) => void, displayValue?: string }) => (
    <div className="flex flex-col gap-2 w-full">
        <label className={`text-sm ${colors.textLabel} font-medium`}>{label}</label>
        <div className="relative h-full">
            <button className={`w-full h-[46px] ${colors.elemBg} ${colors.elemHover} ${colors.textMain} px-4 rounded-lg border-t ${colors.elemBorder} shadow-sm text-sm font-medium transition-colors text-left flex justify-between items-center`}>
               <span className="truncate">{displayValue || value}</span>
               <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            <select 
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    </div>
  );

  const SimpleButton = ({ label, onClick, subText, active }: { label: string, onClick?: () => void, subText?: string, active?: boolean }) => (
      <button 
        onClick={onClick}
        className={`w-full ${colors.elemBg} ${colors.elemHover} ${colors.textMain} py-3 px-4 rounded-lg border-t ${active ? themeAccent.border + ' border-2' : colors.elemBorder} text-sm font-medium text-center relative h-[46px] flex items-center justify-center transition-colors shadow-sm`}
      >
        {label}
        {subText && <span className={`absolute -bottom-6 text-xs ${colors.textSub} w-full text-center left-0`}>{subText}</span>}
      </button>
  );

  // --- Specific Layouts ---
  const renderMelodyControls = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
         <div className="flex flex-col gap-2">
            <label className={`text-sm ${colors.textLabel} font-medium`}>Interval Range</label>
            <SimpleButton label="Interval Settings" onClick={openIntervalModal} />
         </div>
         <div className="flex flex-col gap-1">
             <label className={`text-sm ${colors.textLabel} font-medium mb-1`}>Measures</label>
             <div className="flex flex-col">
                <MeasureRadio val={2} />
                <MeasureRadio val={4} />
                <MeasureRadio val={8} />
             </div>
         </div>
         <div className="flex flex-col gap-2">
             <label className={`text-sm ${colors.textLabel} font-medium`}>Key Signature</label>
             <SimpleButton label="Key Settings" onClick={openKeyModal} />
         </div>
         <SettingsButton label="Time Signature" value={settings.timeSignature} displayValue="Time Settings" options={TIME_SIGNATURES} onChange={(v) => updateSetting('timeSignature', v)} />
         <SettingsButton label="Clef" value={settings.clef} displayValue="Clef Settings" options={[ClefType.TREBLE, ClefType.BASS, ClefType.ALTO]} onChange={(v) => updateSetting('clef', v)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end mt-4">
          <SettingsButton label="Lowest Note" value={settings.lowestNote} options={NOTES} onChange={(v) => updateSetting('lowestNote', v)} />
          <SettingsButton label="Highest Note" value={settings.highestNote} options={NOTES} onChange={(v) => updateSetting('highestNote', v)} />
          
          <div className="flex flex-col gap-2">
              <div className={`flex justify-between text-sm ${colors.textLabel} font-medium`}>
                  <span>Accidentals</span>
                  <span>{settings.accidentalsChance}%</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${settings.accidentalsChance > 0 ? themeAccent.dot : 'bg-gray-400'}`}></div>
                  <input type="range" min="0" max="100" value={settings.accidentalsChance} onChange={(e) => updateSetting('accidentalsChance', parseInt(e.target.value))} className={`w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer ${themeAccent.slider}`} />
              </div>
          </div>

          <div className="flex flex-col gap-2">
             <label className={`text-sm ${colors.textLabel} font-medium`}>Metronome</label>
             <div className="flex items-center gap-2">
                <input type="number" value={settings.tempo} onChange={(e) => updateSetting('tempo', parseInt(e.target.value))} className={`${colors.inputBg} border ${colors.elemBorder} ${colors.textMain} text-center rounded w-16 py-1 h-[32px]`} />
                <div onClick={() => updateSetting('metronomeOn', !settings.metronomeOn)} className={`${settings.metronomeOn ? themeAccent.bg : colors.toggleOff} w-8 h-8 rounded-full flex items-center justify-center text-white cursor-pointer hover:opacity-90 transition-all`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M6 13c0 1.105-1.12 2-2.5 2S1 14.105 1 13c0-1.104 1.12-2 2.5-2s2.5.896 2.5 2zm9-2c0 1.105-1.12 2-2.5 2s-2.5-.895-2.5-2 1.12-2 2.5-2 2.5.895 2.5 2z"/><path fillRule="evenodd" d="M14 11V2h1v9h-1zM6 3v10H5V3h1z"/><path d="M5 2.905a1 1 0 0 1 .9-.995l8-.8a1 1 0 0 1 1.1.995V3L5 4V2.905z"/></svg>
                </div>
                <div className={`w-1.5 h-1.5 rounded-full ${settings.metronomeOn ? 'bg-green-500 shadow-sm shadow-green-500' : 'bg-gray-400'}`}></div>
             </div>
          </div>
      </div>
    </>
  );

  const renderIntervalControls = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
         <div className="flex flex-col gap-2">
            <label className={`text-sm ${colors.textLabel} font-medium`}>Interval Type</label>
            <div className="flex flex-col gap-2">
                <div className={`flex ${colors.inputBg} rounded-lg p-1 border ${colors.elemBorder}`}>
                    <button onClick={() => updateSetting('intervalType', 'harmonic')} className={`flex-1 text-xs py-1 rounded ${settings.intervalType === 'harmonic' ? 'bg-gray-500 text-white' : 'text-gray-400'}`}>Harmonic</button>
                    <button onClick={() => updateSetting('intervalType', 'melodic')} className={`flex-1 text-xs py-1 rounded ${settings.intervalType === 'melodic' ? 'bg-gray-500 text-white' : 'text-gray-400'}`}>Melodic</button>
                </div>
                <SimpleButton label="Interval Range Settings" onClick={openIntervalModal} />
            </div>
         </div>
         <div className="flex flex-col gap-1">
             <label className={`text-sm ${colors.textLabel} font-medium mb-1`}>Measures</label>
             <div className="flex flex-col">
                <MeasureRadio val={2} />
                <MeasureRadio val={4} />
                <MeasureRadio val={8} />
             </div>
         </div>
         <div className="flex flex-col gap-2">
             <label className={`text-sm ${colors.textLabel} font-medium`}>Key Signature</label>
             <SimpleButton label="Key Settings" onClick={openKeyModal} />
         </div>
         <SettingsButton label="Time Signature" value={settings.timeSignature} displayValue="Time Settings" options={TIME_SIGNATURES} onChange={(v) => updateSetting('timeSignature', v)} />
         <SettingsButton label="Clef" value={settings.clef} displayValue="Clef Settings" options={[ClefType.TREBLE, ClefType.BASS, ClefType.ALTO]} onChange={(v) => updateSetting('clef', v)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end mt-4">
          <SettingsButton label="Lowest Note" value={settings.lowestNote} options={NOTES} onChange={(v) => updateSetting('lowestNote', v)} />
          <SettingsButton label="Highest Note" value={settings.highestNote} options={NOTES} onChange={(v) => updateSetting('highestNote', v)} />
           <div className="flex flex-col gap-2">
              <div className={`flex justify-between text-sm ${colors.textLabel} font-medium`}>
                  <span>Accidentals</span>
                  <span>{settings.accidentalsChance}%</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${settings.accidentalsChance > 0 ? themeAccent.dot : 'bg-gray-400'}`}></div>
                  <input type="range" min="0" max="100" value={settings.accidentalsChance} onChange={(e) => updateSetting('accidentalsChance', parseInt(e.target.value))} className={`w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer ${themeAccent.slider}`} />
              </div>
          </div>
          <div className="flex flex-col gap-2">
             <label className={`text-sm ${colors.textLabel} font-medium`}>Metronome</label>
             <div className="flex items-center gap-2">
                <input type="number" value={settings.tempo} onChange={(e) => updateSetting('tempo', parseInt(e.target.value))} className={`${colors.inputBg} border ${colors.elemBorder} ${colors.textMain} text-center rounded w-16 py-1 h-[32px]`} />
                <div onClick={() => updateSetting('metronomeOn', !settings.metronomeOn)} className={`${settings.metronomeOn ? themeAccent.bg : colors.toggleOff} w-8 h-8 rounded-full flex items-center justify-center text-white cursor-pointer hover:opacity-90 transition-all`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M6 13c0 1.105-1.12 2-2.5 2S1 14.105 1 13c0-1.104 1.12-2 2.5-2s2.5.896 2.5 2zm9-2c0 1.105-1.12 2-2.5 2s-2.5-.895-2.5-2 1.12-2 2.5-2 2.5.895 2.5 2z"/><path fillRule="evenodd" d="M14 11V2h1v9h-1zM6 3v10H5V3h1z"/><path d="M5 2.905a1 1 0 0 1 .9-.995l8-.8a1 1 0 0 1 1.1.995V3L5 4V2.905z"/></svg>
                </div>
                <div className={`w-1.5 h-1.5 rounded-full ${settings.metronomeOn ? 'bg-green-500 shadow-sm shadow-green-500' : 'bg-gray-400'}`}></div>
             </div>
          </div>
      </div>
    </>
  );

  const renderChordControls = () => (
    <>
      <div className={`grid grid-cols-1 md:${settings.functionalHarmonyMode ? 'grid-cols-4' : 'grid-cols-3'} gap-6`}>
        <div className="flex flex-col gap-2">
            <label className={`text-sm ${colors.textLabel} font-medium`}>Chord Type</label>
            <SimpleButton label="Chord Type Settings" onClick={openChordModal} />
        </div>
        
        {/* Harmony & Instrument Mode Custom Stack */}
        <div className="flex flex-col justify-between">
             {/* Harmony Mode */}
             <div className="flex flex-col gap-1">
                 <label className={`text-sm ${colors.textLabel} font-medium`}>Harmony Mode</label>
                 <div className="flex items-center gap-3">
                     <div 
                        onClick={() => updateSetting('functionalHarmonyMode', !settings.functionalHarmonyMode)}
                        className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors ${settings.functionalHarmonyMode ? themeAccent.bg : colors.toggleOff}`}
                      >
                        <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${settings.functionalHarmonyMode ? 'translate-x-6' : ''}`}></div>
                      </div>
                      <span className={`text-xs ${colors.textMain}`}>{settings.functionalHarmonyMode ? 'Functional Harmony' : 'Pure Random Mode'}</span>
                 </div>
             </div>
             
             {/* Instrument Mode */}
             <div className="flex flex-col gap-1 mt-3">
                 <label className={`text-sm ${colors.textLabel} font-medium`}>Instrument Mode</label>
                 <div className="flex items-center gap-3">
                     <div 
                        onClick={() => updateSetting('instrumentMode', settings.instrumentMode === 'guitar' ? 'piano' : 'guitar')}
                        className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors ${settings.instrumentMode === 'piano' ? themeAccent.bg : colors.toggleOff}`}
                      >
                        <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${settings.instrumentMode === 'piano' ? 'translate-x-6' : ''}`}></div>
                      </div>
                      <span className={`text-xs ${colors.textMain}`}>{settings.instrumentMode === 'piano' ? 'Piano Harmony' : 'Guitar Harmony'}</span>
                 </div>
             </div>
        </div>

        <div className="flex flex-col gap-1">
             <label className={`text-sm ${colors.textLabel} font-medium mb-1`}>Measures</label>
             <div className="flex flex-col">
                <MeasureRadio val={2} />
                <MeasureRadio val={4} />
                <MeasureRadio val={8} />
             </div>
        </div>
        
        {settings.functionalHarmonyMode && (
          <div className="flex flex-col gap-2">
               <label className={`text-sm ${colors.textLabel} font-medium`}>Key Signature</label>
               <SimpleButton label="Key Settings" onClick={openKeyModal} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end mt-4">
          {settings.instrumentMode === 'piano' ? (
              <>
                 <div className="flex flex-col gap-2 w-full">
                     <label className={`text-sm ${colors.textLabel} font-medium`}>Bass Clef Range Settings</label>
                     <SimpleButton label={`(${settings.pianoSettings.bassClef.min}-${settings.pianoSettings.bassClef.max})`} onClick={openPianoBassModal} />
                 </div>
                 <div className="flex flex-col gap-2 w-full">
                     <label className={`text-sm ${colors.textLabel} font-medium`}>Treble Clef Range Settings</label>
                     <SimpleButton label={`(${settings.pianoSettings.trebleClef.min}-${settings.pianoSettings.trebleClef.max})`} onClick={openPianoTrebleModal} />
                 </div>
              </>
          ) : (
              <>
                 <SettingsButton label="Lowest Note" value={settings.lowestNote} options={NOTES} onChange={(v) => updateSetting('lowestNote', v)} />
                 <SettingsButton label="Highest Note" value={settings.highestNote} options={NOTES} onChange={(v) => updateSetting('highestNote', v)} />
              </>
          )}
          
          <Checkbox label="Staff" value={settings.showStaff} onChange={(v) => updateSetting('showStaff', v)} />
          <Checkbox label="Chord Symbols" value={settings.showChordSymbols} onChange={(v) => updateSetting('showChordSymbols', v)} />
          <div className="flex flex-col gap-2">
             <label className={`text-sm ${colors.textLabel} font-medium`}>Metronome</label>
             <div className="flex items-center gap-2">
                <input type="number" value={settings.tempo} onChange={(e) => updateSetting('tempo', parseInt(e.target.value))} className={`${colors.inputBg} border ${colors.elemBorder} ${colors.textMain} text-center rounded w-16 py-1 h-[32px]`} />
                <div onClick={() => updateSetting('metronomeOn', !settings.metronomeOn)} className={`${settings.metronomeOn ? themeAccent.bg : colors.toggleOff} w-8 h-8 rounded-full flex items-center justify-center text-white cursor-pointer hover:opacity-90 transition-all`}>
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M6 13c0 1.105-1.12 2-2.5 2S1 14.105 1 13c0-1.104 1.12-2 2.5-2s2.5.896 2.5 2zm9-2c0 1.105-1.12 2-2.5 2s-2.5-.895-2.5-2 1.12-2 2.5-2 2.5.895 2.5 2z"/><path fillRule="evenodd" d="M14 11V2h1v9h-1zM6 3v10H5V3h1z"/><path d="M5 2.905a1 1 0 0 1 .9-.995l8-.8a1 1 0 0 1 1.1.995V3L5 4V2.905z"/></svg>
                </div>
                <div className={`w-1.5 h-1.5 rounded-full ${settings.metronomeOn ? 'bg-green-500 shadow-sm shadow-green-500' : 'bg-gray-400'}`}></div>
             </div>
          </div>
      </div>
    </>
  );

  return (
    <div className="w-full flex flex-col gap-6 relative">
      {settings.mode === GeneratorMode.MELODY && renderMelodyControls()}
      {settings.mode === GeneratorMode.INTERVAL && renderIntervalControls()}
      {settings.mode === GeneratorMode.CHORD && renderChordControls()}

      {/* Modals included via same component structure */}
      <Modal isOpen={activeModal === 'interval'} onClose={() => setActiveModal('none')} title="Interval Range Settings" theme={theme} footer={<><button onClick={() => setActiveModal('none')} className={`px-5 py-2 rounded-lg ${colors.modalCancel} border ${colors.elemBorder}`}>Cancel</button><button onClick={saveIntervalSettings} className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-md">Save Settings</button></>}>
         <div className={`mb-4 ${colors.textSub} text-sm`}><h3 className={`${colors.modalHeader} text-lg font-semibold mb-1`}>Maximum Interval Range Options</h3><p>Can only select one interval as maximum span</p></div>
        <div className="grid grid-cols-2 gap-3">
            {INTERVAL_OPTIONS.map(interval => (
                <div key={interval} onClick={() => setTempMaxInterval(interval)} className={`flex items-center p-3 rounded-lg cursor-pointer border ${tempMaxInterval === interval ? 'bg-blue-600 border-blue-600' : `${colors.modalItemBg} ${colors.modalItemBorder} hover:${colors.elemBorder}`}`}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center border mr-3 ${tempMaxInterval === interval ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                         {tempMaxInterval === interval && <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
                    </div>
                    <span className={`${tempMaxInterval === interval ? 'text-white' : colors.textMain} text-sm font-medium`}>{interval}</span>
                </div>
            ))}
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'chord'} onClose={() => setActiveModal('none')} title="Chord Type Settings" theme={theme} footer={
            <div className="w-full flex justify-between items-center">
                 <div>
                     <button onClick={() => setIsAdvancedChord(!isAdvancedChord)} className={`px-4 py-2 rounded-lg ${colors.elemBg} ${colors.textLabel} ${colors.elemHover} border ${colors.elemBorder} text-sm transition-colors`}>{isAdvancedChord ? 'Hide Advanced Settings' : 'Advanced Settings'}</button>
                </div>
                <div className="flex gap-3"><button onClick={() => setActiveModal('none')} className={`px-5 py-2 rounded-lg ${colors.modalCancel} border ${colors.elemBorder}`}>Cancel</button><button onClick={saveChordSettings} className="px-5 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 shadow-md">Save Settings</button></div>
            </div>
        }>
        {isAdvancedChord ? (
             <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between mb-2"><h3 className={`${colors.modalHeader} text-lg font-bold`}>Voicing Type Selection</h3><button onClick={selectAllVoicings} className={`${colors.elemBg} ${colors.elemHover} ${colors.textSub} text-xs px-3 py-1.5 rounded border ${colors.elemBorder}`}>Select All</button></div>
                <div className="grid grid-cols-2 gap-4">{VOICING_OPTIONS.map(opt => (<div key={opt.id} onClick={() => toggleChordVoicing(opt.id)} className={`flex items-center p-3 rounded-lg cursor-pointer border ${tempChordSettings.enabledVoicings.includes(opt.id) ? `${colors.modalItemSelected} border-orange-500` : `${colors.modalItemBg} ${colors.modalItemBorder}`}`}><div className={`w-5 h-5 rounded flex items-center justify-center border mr-3 ${tempChordSettings.enabledVoicings.includes(opt.id) ? 'bg-orange-600 border-orange-600' : 'bg-white border-gray-300'}`}>{tempChordSettings.enabledVoicings.includes(opt.id) && <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}</div><span className={`${colors.textMain} text-sm font-medium`}>{opt.label}</span></div>))}</div>
                <div className={`${colors.descBox} p-4 rounded-lg border ${colors.elemBorder} mt-2`}><h4 className="text-orange-500 font-bold text-sm mb-2">Function Description:</h4><ul className={`text-xs ${colors.textLabel} space-y-2 list-disc pl-4`}>{VOICING_OPTIONS.map(opt => (<li key={opt.id}><strong className={`${colors.textMain}`}>{opt.label.split(' Voicing')[0]}:</strong> {opt.desc}</li>))}</ul></div>
             </div>
        ) : (
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                     <div className="flex items-center justify-between"><h3 className={`${colors.modalHeader} text-lg font-bold`}>Triads</h3><button onClick={selectAllTriads} className={`${colors.elemBg} ${colors.elemHover} ${colors.textSub} text-xs px-3 py-1.5 rounded border ${colors.elemBorder}`}>Select All</button></div>
                    <div className="grid grid-cols-2 gap-3">
                        {CHORD_TRIAD_OPTIONS.map(opt => (<div key={opt.id} onClick={() => toggleChordTriad(opt.id)} className={`flex items-center p-3 rounded-lg cursor-pointer border ${tempChordSettings.enabledTriads.includes(opt.id) ? `${colors.modalItemSelected} border-orange-500` : `${colors.modalItemBg} ${colors.modalItemBorder}`}`}><div className={`w-5 h-5 rounded flex items-center justify-center border mr-3 ${tempChordSettings.enabledTriads.includes(opt.id) ? 'bg-orange-600 border-orange-600' : 'bg-white border-gray-300'}`}>{tempChordSettings.enabledTriads.includes(opt.id) && <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}</div><span className={`${colors.textMain} text-sm font-medium`}>{opt.label}</span></div>))}
                         <div onClick={() => setTempChordSettings({...tempChordSettings, triadInversions: !tempChordSettings.triadInversions})} className={`flex items-center p-3 rounded-lg cursor-pointer border ${tempChordSettings.triadInversions ? `${colors.modalItemSelected} border-orange-500` : `${colors.modalItemBg} ${colors.modalItemBorder}`}`}><div className={`w-5 h-5 rounded flex items-center justify-center border mr-3 ${tempChordSettings.triadInversions ? 'bg-orange-600 border-orange-600' : 'bg-white border-gray-300'}`}>{tempChordSettings.triadInversions && <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}</div><span className={`${colors.textMain} text-sm font-medium`}>Include Inversions</span></div>
                    </div>
                </div>
                 <div className="flex flex-col gap-3">
                     <div className="flex items-center justify-between"><h3 className={`${colors.modalHeader} text-lg font-bold`}>Seventh Chords</h3><button onClick={selectAllSevenths} className={`${colors.elemBg} ${colors.elemHover} ${colors.textSub} text-xs px-3 py-1.5 rounded border ${colors.elemBorder}`}>Select All</button></div>
                    <div className="grid grid-cols-2 gap-3">
                        {CHORD_SEVENTH_OPTIONS.map(opt => (<div key={opt.id} onClick={() => toggleChordSeventh(opt.id)} className={`flex items-center p-3 rounded-lg cursor-pointer border ${tempChordSettings.enabledSevenths.includes(opt.id) ? `${colors.modalItemSelected} border-orange-500` : `${colors.modalItemBg} ${colors.modalItemBorder}`}`}><div className={`w-5 h-5 rounded flex items-center justify-center border mr-3 ${tempChordSettings.enabledSevenths.includes(opt.id) ? 'bg-orange-600 border-orange-600' : 'bg-white border-gray-300'}`}>{tempChordSettings.enabledSevenths.includes(opt.id) && <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}</div><span className={`${colors.textMain} text-sm font-medium`}>{opt.label}</span></div>))}
                         <div onClick={() => setTempChordSettings({...tempChordSettings, seventhInversions: !tempChordSettings.seventhInversions})} className={`flex items-center p-3 rounded-lg cursor-pointer border ${tempChordSettings.seventhInversions ? `${colors.modalItemSelected} border-orange-500` : `${colors.modalItemBg} ${colors.modalItemBorder}`}`}><div className={`w-5 h-5 rounded flex items-center justify-center border mr-3 ${tempChordSettings.seventhInversions ? 'bg-orange-600 border-orange-600' : 'bg-white border-gray-300'}`}>{tempChordSettings.seventhInversions && <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}</div><span className={`${colors.textMain} text-sm font-medium`}>Include Inversions</span></div>
                    </div>
                </div>
            </div>
        )}
      </Modal>

      <Modal isOpen={activeModal === 'key'} onClose={() => setActiveModal('none')} title="Key Signature Settings" theme={theme} footer={<><button onClick={() => setActiveModal('none')} className={`px-5 py-2 rounded-lg ${colors.modalCancel} border ${colors.elemBorder}`}>Cancel</button><button onClick={saveKeySettings} className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-md">Save Settings</button></>}>
          <div className="flex flex-col gap-8">
            <div><div className="flex items-center justify-between mb-3"><h3 className={`${colors.modalHeader} text-lg font-bold`}>Major</h3><button onClick={() => selectAllKeys('major')} className={`${colors.elemBg} ${colors.elemHover} ${colors.textSub} text-xs px-3 py-1.5 rounded border ${colors.elemBorder}`}>Select All Major</button></div><div className="grid grid-cols-2 gap-3">{KEY_DATA.filter(k => k.type === 'major').map(keyOption => (<div key={keyOption.id} onClick={() => toggleKey(keyOption.id)} className={`flex items-center p-3 rounded-lg cursor-pointer border ${tempSelectedKeys.includes(keyOption.id) ? `${colors.modalItemSelected} border-blue-500` : `${colors.modalItemBg} ${colors.modalItemBorder}`}`}><div className={`w-5 h-5 rounded flex items-center justify-center border mr-3 ${tempSelectedKeys.includes(keyOption.id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>{tempSelectedKeys.includes(keyOption.id) && <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}</div><span className={`${colors.textMain} text-sm font-medium`}>{keyOption.label} {keyOption.acc}</span></div>))}</div></div>
             <div><div className="flex items-center justify-between mb-3"><h3 className={`${colors.modalHeader} text-lg font-bold`}>Minor</h3><button onClick={() => selectAllKeys('minor')} className={`${colors.elemBg} ${colors.elemHover} ${colors.textSub} text-xs px-3 py-1.5 rounded border ${colors.elemBorder}`}>Select All Minor</button></div><div className="grid grid-cols-2 gap-3">{KEY_DATA.filter(k => k.type === 'minor').map(keyOption => (<div key={keyOption.id} onClick={() => toggleKey(keyOption.id)} className={`flex items-center p-3 rounded-lg cursor-pointer border ${tempSelectedKeys.includes(keyOption.id) ? `${colors.modalItemSelected} border-blue-500` : `${colors.modalItemBg} ${colors.modalItemBorder}`}`}><div className={`w-5 h-5 rounded flex items-center justify-center border mr-3 ${tempSelectedKeys.includes(keyOption.id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>{tempSelectedKeys.includes(keyOption.id) && <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}</div><span className={`${colors.textMain} text-sm font-medium`}>{keyOption.label} {keyOption.acc}</span></div>))}</div></div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'rhythm'} onClose={() => setActiveModal('none')} title="Rhythm Settings" theme={theme} footer={<div className="w-full flex justify-between items-center"><div><button onClick={() => setIsAdvancedRhythm(!isAdvancedRhythm)} className={`px-4 py-2 rounded-lg ${colors.elemBg} ${colors.textLabel} ${colors.elemHover} border ${colors.elemBorder} text-sm`}>{isAdvancedRhythm ? 'Basic Settings' : 'Advanced Settings'}</button></div><div className="flex gap-3"><button onClick={() => setActiveModal('none')} className={`px-5 py-2 rounded-lg ${colors.modalCancel} border ${colors.elemBorder}`}>Cancel</button><button onClick={saveRhythmSettings} className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-md">Save Settings</button></div></div>}>
           {isAdvancedRhythm ? (
             <div className="flex flex-col gap-6">
                <div className={`${colors.textSub} text-sm`}><h3 className={`${colors.modalHeader} text-lg font-bold mb-1`}>Advanced Frequency Settings</h3><p>Adjust the frequency of each rhythm unit (0% = not used, 100% = preferred)</p></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{RHYTHM_OPTIONS.map(opt => (<div key={opt.id} className={`${colors.modalItemBg} p-4 rounded-lg border ${colors.modalItemBorder}`}><div className="flex justify-between items-center mb-2"><span className={`font-medium ${colors.textMain}`}>{opt.label}:</span><span className="text-blue-400 font-bold">{tempRhythmSettings.frequencies[opt.id] || 0}%</span></div><input type="range" min="0" max="100" step="5" value={tempRhythmSettings.frequencies[opt.id] || 0} onChange={(e) => updateRhythmFrequency(opt.id, parseInt(e.target.value))} className={`w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer ${themeAccent.slider}`} /></div>))}</div>
                <div className="flex justify-center mt-2"><button onClick={resetRhythmDefaults} className={`${colors.textSub} hover:${colors.textMain} text-sm underline`}>Reset to Default</button></div>
             </div>
        ) : (
            <div className="flex flex-col gap-6">
                <div><div className="flex items-center justify-between mb-3"><h3 className={`${colors.modalHeader} text-lg font-bold`}>Basic Rhythm Unit</h3><button onClick={selectAllRhythm} className={`${colors.elemBg} ${colors.elemHover} ${colors.textSub} text-xs px-3 py-1.5 rounded border ${colors.elemBorder}`}>Select All</button></div><div className="grid grid-cols-2 gap-3">{RHYTHM_OPTIONS.map(opt => (<div key={opt.id} onClick={() => toggleRhythmUnit(opt.id)} className={`flex items-center p-3 rounded-lg cursor-pointer border ${tempRhythmSettings.enabledUnits.includes(opt.id) ? `${colors.modalItemSelected} border-blue-500` : `${colors.modalItemBg} ${colors.modalItemBorder}`}`}><div className={`w-5 h-5 rounded flex items-center justify-center border mr-3 ${tempRhythmSettings.enabledUnits.includes(opt.id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>{tempRhythmSettings.enabledUnits.includes(opt.id) && <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}</div><span className={`${colors.textMain} text-sm font-medium`}>{opt.label}</span></div>))}</div></div>
                <hr className={colors.elemBorder} />
                <div><h3 className={`${colors.modalHeader} text-lg font-bold mb-3`}>Dotted Note Options</h3><div className={`${colors.modalItemBg} p-4 rounded-lg border ${colors.modalItemBorder}`}><div className="flex items-start gap-3"><div onClick={() => setTempRhythmSettings({...tempRhythmSettings, allowDotted: !tempRhythmSettings.allowDotted})} className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center cursor-pointer border flex-shrink-0 ${tempRhythmSettings.allowDotted ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>{tempRhythmSettings.allowDotted && <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}</div><div><h4 className={`${colors.textMain} font-medium text-sm`}>Allow Dotted Notes</h4><p className={`${colors.textSub} text-xs mt-2 leading-relaxed`}>Auto-generate dotted versions based on selected rhythms.</p></div></div></div></div>
            </div>
        )}
      </Modal>

      <Modal isOpen={activeModal === 'articulation'} onClose={() => setActiveModal('none')} title="Articulations" theme={theme} footer={<div className="w-full flex justify-between items-center"><div><button onClick={() => setIsAdvancedArticulation(!isAdvancedArticulation)} className={`px-4 py-2 rounded-lg ${colors.elemBg} ${colors.textLabel} ${colors.elemHover} border ${colors.elemBorder} text-sm`}>{isAdvancedArticulation ? 'Basic Settings' : 'Advanced Settings'}</button></div><div className="flex gap-3"><button onClick={() => setActiveModal('none')} className={`px-5 py-2 rounded-lg ${colors.modalCancel} border ${colors.elemBorder}`}>Cancel</button><button onClick={saveArticulationSettings} className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-md">Save Settings</button></div></div>}>
          {isAdvancedArticulation ? (
            <div className="flex flex-col gap-6">
                 <div className={`${colors.textSub} text-sm`}><h3 className={`${colors.modalHeader} text-lg font-bold mb-1`}>Advanced Frequency Settings</h3><p>Adjust frequency of each articulation (0% = not used, 100% = frequently used)</p></div>
                <div className="flex flex-col gap-4">
                    <h4 className={`${colors.textLabel} font-bold text-sm uppercase`}>Basic Articulation Frequency</h4>
                    {['staccato', 'accent', 'acciaccatura'].map(key => (<div key={key} className={`${colors.modalItemBg} p-4 rounded-lg border ${colors.modalItemBorder}`}><div className="flex justify-between items-center mb-2"><span className={`font-medium ${colors.textMain} capitalize`}>{key}:</span><span className="text-blue-400 font-bold">{tempArticulationSettings.frequencies[key] || 0}%</span></div><input type="range" min="0" max="100" step="5" value={tempArticulationSettings.frequencies[key] || 0} onChange={(e) => updateArticulationFrequency(key, parseInt(e.target.value))} className={`w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer ${themeAccent.slider}`} /></div>))}
                    <h4 className={`${colors.textLabel} font-bold text-sm uppercase mt-2`}>Guitar Technique Frequency</h4>
                    <div className={`${colors.modalItemBg} p-4 rounded-lg border ${colors.modalItemBorder}`}><div className="flex justify-between items-center mb-2"><span className={`font-medium ${colors.textMain}`}>Hammer-on/Pull-off:</span><span className="text-blue-400 font-bold">{tempArticulationSettings.frequencies['hammer_pull'] || 0}%</span></div><input type="range" min="0" max="100" step="5" value={tempArticulationSettings.frequencies['hammer_pull'] || 0} onChange={(e) => updateArticulationFrequency('hammer_pull', parseInt(e.target.value))} className={`w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer ${themeAccent.slider}`} /></div>
                </div>
                <div className="flex justify-center mt-2"><button onClick={resetArticulationDefaults} className={`${colors.textSub} hover:${colors.textMain} text-sm underline`}>Reset to Default</button></div>
            </div>
        ) : (
            <div className="flex flex-col gap-8">
                <div><div className="flex items-center justify-between mb-3"><h3 className={`${colors.modalHeader} text-lg font-bold`}>Basic Articulations</h3><button onClick={() => selectAllArticulations('basic')} className={`${colors.elemBg} ${colors.elemHover} ${colors.textSub} text-xs px-3 py-1.5 rounded border ${colors.elemBorder}`}>Select All</button></div><div className="grid grid-cols-2 gap-3">{ARTICULATION_TYPES.filter(t => t.category === 'basic').map(type => (<div key={type.id} onClick={() => toggleArticulation(type.id)} className={`flex items-center p-3 rounded-lg cursor-pointer border ${tempArticulationSettings.enabledIds.includes(type.id) ? `${colors.modalItemSelected} border-blue-500` : `${colors.modalItemBg} ${colors.modalItemBorder}`}`}><div className={`w-5 h-5 rounded flex items-center justify-center border mr-3 ${tempArticulationSettings.enabledIds.includes(type.id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>{tempArticulationSettings.enabledIds.includes(type.id) && <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}</div><span className={`${colors.textMain} text-sm font-medium`}>{type.label}</span></div>))}</div></div>
                 <div><div className="flex items-center justify-between mb-3"><h3 className={`${colors.modalHeader} text-lg font-bold`}>Guitar Techniques</h3><button onClick={() => selectAllArticulations('guitar')} className={`${colors.elemBg} ${colors.elemHover} ${colors.textSub} text-xs px-3 py-1.5 rounded border ${colors.elemBorder}`}>Select All</button></div><div className="grid grid-cols-2 gap-3">{ARTICULATION_TYPES.filter(t => t.category === 'guitar').map(type => (<div key={type.id} onClick={() => toggleArticulation(type.id)} className={`flex items-center p-3 rounded-lg cursor-pointer border ${tempArticulationSettings.enabledIds.includes(type.id) ? `${colors.modalItemSelected} border-blue-500` : `${colors.modalItemBg} ${colors.modalItemBorder}`}`}><div className={`w-5 h-5 rounded flex items-center justify-center border mr-3 ${tempArticulationSettings.enabledIds.includes(type.id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>{tempArticulationSettings.enabledIds.includes(type.id) && <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}</div><span className={`${colors.textMain} text-sm font-medium`}>{type.label}</span></div>))}</div></div>
            </div>
        )}
      </Modal>

      <Modal isOpen={activeModal === 'piano_bass'} onClose={() => setActiveModal('none')} title="Bass Clef Range Settings" theme={theme} footer={<><button onClick={() => setActiveModal('none')} className={`px-5 py-2 rounded-lg ${colors.modalCancel} border ${colors.elemBorder}`}>Cancel</button><button onClick={savePianoSettings} className="px-5 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 shadow-md">Save Settings</button></>}>
        <div className="flex flex-col gap-4">
             <SettingsButton label="Lowest Note" value={tempPianoSettings.bassClef.min} options={NOTES} onChange={(v) => setTempPianoSettings({...tempPianoSettings, bassClef: {...tempPianoSettings.bassClef, min: v}})} />
             <SettingsButton label="Highest Note" value={tempPianoSettings.bassClef.max} options={NOTES} onChange={(v) => setTempPianoSettings({...tempPianoSettings, bassClef: {...tempPianoSettings.bassClef, max: v}})} />
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'piano_treble'} onClose={() => setActiveModal('none')} title="Treble Clef Range Settings" theme={theme} footer={<><button onClick={() => setActiveModal('none')} className={`px-5 py-2 rounded-lg ${colors.modalCancel} border ${colors.elemBorder}`}>Cancel</button><button onClick={savePianoSettings} className="px-5 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 shadow-md">Save Settings</button></>}>
        <div className="flex flex-col gap-4">
             <SettingsButton label="Lowest Note" value={tempPianoSettings.trebleClef.min} options={NOTES} onChange={(v) => setTempPianoSettings({...tempPianoSettings, trebleClef: {...tempPianoSettings.trebleClef, min: v}})} />
             <SettingsButton label="Highest Note" value={tempPianoSettings.trebleClef.max} options={NOTES} onChange={(v) => setTempPianoSettings({...tempPianoSettings, trebleClef: {...tempPianoSettings.trebleClef, max: v}})} />
        </div>
      </Modal>

      {/* Actions Row */}
      <div className={`flex flex-wrap items-center gap-3 mt-4 border-t ${colors.elemBorder} pt-6`}>
        <button onClick={onGenerate} disabled={isGenerating} className={`${themeAccent.bg} ${themeAccent.hover} text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed`}>{isGenerating ? 'Generating...' : `Generate ${settings.mode === GeneratorMode.CHORD ? 'Chords' : settings.mode === GeneratorMode.INTERVAL ? 'Intervals' : 'Melody'}`}</button>
        <button className={`${colors.elemBg} ${colors.elemHover} ${colors.textMain} font-medium py-3 px-6 rounded-lg border ${colors.elemBorder} transition-colors`}>Previous</button>
        <button className={`${colors.elemBg} ${colors.elemHover} ${colors.textMain} font-medium py-3 px-6 rounded-lg border ${colors.elemBorder} transition-colors`}>Next</button>
        <button onClick={onPlay} className={`${colors.elemBg} ${colors.elemHover} ${colors.textMain} font-medium py-3 px-6 rounded-lg border ${colors.elemBorder} transition-colors flex items-center gap-2 ${isPlaying ? 'bg-green-500/10 border-green-500 text-green-500' : ''}`}>
             {isPlaying ? (
                // Pause Icon
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/></svg>
             ) : (
                // Play Icon
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/></svg>
             )}
             <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>
        {settings.mode !== GeneratorMode.MELODY && (<button onClick={openRhythmModal} className={`${colors.elemBg} ${colors.elemHover} ${colors.textMain} font-medium py-3 px-6 rounded-lg border ${colors.elemBorder} transition-colors`}>Rhythm Settings</button>)}
      </div>

      {/* Melody Specific Bottom Row */}
      {settings.mode === GeneratorMode.MELODY && (
         <div className="flex gap-4 justify-center md:justify-start">
            <button onClick={openRhythmModal} className={`${colors.elemBg} ${colors.elemHover} ${colors.textMain} font-medium py-3 px-8 rounded-lg border ${colors.elemBorder} transition-colors`}>Rhythm Settings</button>
            <button onClick={openArticulationModal} className={`${colors.elemBg} ${colors.elemHover} ${colors.textMain} font-medium py-3 px-8 rounded-lg border ${settings.articulations.enabledIds.length > 0 ? themeAccent.border + ' border-2' : colors.elemBorder} transition-colors`}>Articulations</button>
         </div>
      )}
    </div>
  );
};

export default Controls;
