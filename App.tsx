
import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_SETTINGS } from './constants';
import { AppSettings, GeneratorMode, Theme } from './types';
import Controls from './components/Controls';
import ScoreRenderer from './components/ScoreRenderer';
import { generateMusic } from './services/geminiService';

const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [abcNotation, setAbcNotation] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<Theme>('dark');

  // Audio Refs
  const synthRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleModeChange = (mode: GeneratorMode) => {
    setSettings(prev => ({ ...prev, mode }));
    setIsMenuOpen(false);
    // Trigger generation on mode switch for better UX
    setTimeout(() => handleGenerate(), 100); 
  };

  const handleGenerate = async () => {
    // Stop playback if generating
    if (isPlaying) togglePlay();
    
    setIsGenerating(true);
    const abc = await generateMusic(settings);
    setAbcNotation(abc);
    setIsGenerating(false);
  };

  const injectMetronome = (abc: string): string => {
    if (!settings.metronomeOn) return abc;

    const measures = settings.measures;
    const timeSig = settings.timeSignature;
    let clickPattern = "";
    
    // Define patterns based on time signature
    // Using 'e' and 'f' in percussion clef often maps to Hi-Hat/Click
    // %%MIDI channel 10 forces percussion
    if (timeSig === '4/4') {
      clickPattern = "e f f f ";
    } else if (timeSig === '3/4') {
      clickPattern = "e f f ";
    } else if (timeSig === '2/4') {
      clickPattern = "e f ";
    } else if (timeSig === '2/2') {
      clickPattern = "e2 f2 "; // Half notes
    } else if (timeSig === '6/8') {
      clickPattern = "e3 f3 "; // Dotted quarters
    } else {
      clickPattern = "e f f f "; // Fallback
    }

    let track = "";
    for (let i = 0; i < measures; i++) {
        track += `| ${clickPattern}`;
    }
    track += "|";

    return `${abc}
%%%%%%%%%%%%%%%%%%%%
%%MIDI channel 10
X:999
V:Metronome clef=perc
${track}`;
  };

  const togglePlay = async () => {
    if (!window.ABCJS) return;

    // 1. If currently playing, PAUSE
    if (isPlaying && audioContextRef.current && audioContextRef.current.state === 'running') {
        await audioContextRef.current.suspend();
        setIsPlaying(false);
        return;
    }

    // 2. If currently paused, RESUME
    if (!isPlaying && audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        setIsPlaying(true);
        return;
    }

    // 3. If stopped/new, START
    if (audioContainerRef.current) {
        // Create new Audio Context
        const AudioContextFunc = window.AudioContext || (window as any).webkitAudioContext;
        const ac = new AudioContextFunc();
        audioContextRef.current = ac;

        // Prepare Audio ABC (with Metronome if enabled)
        // We combine the visual ABC with the Metronome voice
        // Note: We need to parse this into a separate visualObj for the synth
        const audioAbc = injectMetronome(abcNotation);
        
        // Render the Audio ABC to the hidden container to get the visualObj for the synth
        const visualObj = window.ABCJS.renderAbc(audioContainerRef.current, audioAbc, { responsive: "resize" })[0];

        const synth = new window.ABCJS.synth.CreateSynth();
        synthRef.current = synth;

        try {
            await synth.init({ 
                visualObj: visualObj, 
                audioContext: ac, 
                millisecondsPerMeasure: visualObj.millisecondsPerMeasure() 
            });
            await synth.prime();
            
            setIsPlaying(true);
            await synth.start();
            
            // Reset state when finished
            setIsPlaying(false);
            audioContextRef.current = null;
        } catch (error) {
            console.warn("Audio problem:", error);
            setIsPlaying(false);
        }
    }
  };

  // Theme Colors for App Layout
  const appColors = theme === 'dark' ? {
      bg: 'bg-[#1e1e1e]',
      headerBg: 'bg-[#2a2a2a]',
      footerBg: 'bg-[#1e1e1e]',
      footerBorder: 'border-gray-800',
      textMain: 'text-gray-100',
      textSub: 'text-gray-400',
      border: 'border-gray-700',
      panelBg: 'bg-[#2a2a2a]',
      dropdownBg: 'bg-[#333]',
      dropdownHover: 'hover:bg-[#444]',
      btnBg: 'bg-[#3a3a3a]',
      btnHover: 'hover:bg-[#4a4a4a]',
  } : {
      bg: 'bg-gray-100',
      headerBg: 'bg-white',
      footerBg: 'bg-white',
      footerBorder: 'border-gray-200',
      textMain: 'text-gray-900',
      textSub: 'text-gray-500',
      border: 'border-gray-200',
      panelBg: 'bg-white',
      dropdownBg: 'bg-white',
      dropdownHover: 'hover:bg-gray-100',
      btnBg: 'bg-gray-100',
      btnHover: 'hover:bg-gray-200',
  };

  // Dynamic Accent Colors based on Mode
  const getAccentColor = () => {
    switch (settings.mode) {
      case GeneratorMode.CHORD: return 'bg-orange-500 hover:bg-orange-600 text-white';
      case GeneratorMode.MELODY: return 'bg-blue-500 hover:bg-blue-600 text-white';
      case GeneratorMode.INTERVAL: 
      default: return 'bg-[#22c55e] hover:bg-[#16a34a] text-white';
    }
  };
  const accentClass = getAccentColor();

  return (
    <div className={`flex flex-col h-screen max-w-7xl mx-auto w-full transition-colors duration-300 ${appColors.bg}`}>
      {/* Hidden container for Audio-only rendering (Metronome injection) */}
      <div ref={audioContainerRef} className="hidden"></div>

      {/* Header */}
      <header className="flex-none p-6 pb-2">
        <div className={`${appColors.headerBg} rounded-xl p-4 flex flex-col md:flex-row items-center justify-between border ${appColors.border} shadow-xl relative z-50`}>
            
            {/* Mode Switcher acting as Dropdown/Title */}
            <div className="flex items-center gap-4">
                <div className="relative">
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`${accentClass} font-bold py-2 px-4 rounded-md flex items-center gap-2 shadow-lg transition-all`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M6 13c0 1.105-1.12 2-2.5 2S1 14.105 1 13c0-1.104 1.12-2 2.5-2s2.5.896 2.5 2zm9-2c0 1.105-1.12 2-2.5 2s-2.5-.895-2.5-2 1.12-2 2.5-2 2.5.895 2.5 2z"/>
                            <path fillRule="evenodd" d="M14 11V2h1v9h-1zM6 3v10H5V3h1z"/>
                            <path d="M6 3v10H5V3h1z"/>
                            <path d="M5 2.905a1 1 0 0 1 .9-.995l8-.8a1 1 0 0 1 1.1.995V3L5 4V2.905z"/>
                        </svg>
                        {settings.mode} Sight-Reading
                        <svg className={`w-4 h-4 ml-2 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    
                    {/* Mode Dropdown Menu */}
                    {isMenuOpen && (
                        <>
                            <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setIsMenuOpen(false)} 
                            ></div>
                            <div className={`absolute top-full left-0 mt-2 w-56 ${appColors.dropdownBg} rounded-md shadow-2xl border ${appColors.border} z-50 overflow-hidden`}>
                                {Object.values(GeneratorMode).map((m) => (
                                    <div 
                                        key={m}
                                        onClick={() => handleModeChange(m)}
                                        className={`px-4 py-3 ${appColors.dropdownHover} cursor-pointer ${appColors.textMain} border-b ${appColors.border} last:border-0`}
                                    >
                                        {m} Generator
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="flex flex-col items-center mt-4 md:mt-0 pointer-events-none">
                <h1 className={`text-2xl md:text-3xl font-bold ${appColors.textMain} tracking-tight text-center`}>
                    {settings.mode} Sight-Reading Generator
                </h1>
                <p className={`${appColors.textSub} text-sm mt-1 text-center`}>Professional Music Score Rendering & Music Theory Tool</p>
            </div>

            <div className="relative mt-4 md:mt-0">
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className={`${appColors.btnBg} ${appColors.btnHover} ${appColors.textMain} text-sm font-medium py-2 px-4 rounded-lg border ${appColors.border} flex items-center gap-2 transition-colors`}>
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
                        <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
                    </svg>
                    Settings
                </button>

                {/* Settings Dropdown */}
                {showSettings && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)}></div>
                        <div className={`absolute right-0 top-full mt-2 w-48 ${appColors.dropdownBg} rounded-md shadow-2xl border ${appColors.border} z-50 overflow-hidden`}>
                            <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-opacity-20 bg-gray-500">Theme</div>
                            <button 
                                onClick={() => { setTheme('light'); setShowSettings(false); }} 
                                className={`w-full text-left px-4 py-3 ${appColors.dropdownHover} flex items-center gap-3 ${appColors.textMain}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="orange" viewBox="0 0 16 16">
                                    <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.46 4.46a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
                                </svg>
                                Light Mode
                            </button>
                            <button 
                                onClick={() => { setTheme('dark'); setShowSettings(false); }} 
                                className={`w-full text-left px-4 py-3 ${appColors.dropdownHover} flex items-center gap-3 ${appColors.textMain}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="yellow" viewBox="0 0 16 16">
                                    <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
                                </svg>
                                Dark Mode
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-6 pt-0 overflow-y-auto">
        
        {/* Controls Section */}
        <section className={`${appColors.panelBg} rounded-xl p-6 border ${appColors.border} shadow-lg mb-6 transition-colors duration-300`}>
            <Controls 
                settings={settings} 
                updateSetting={updateSetting} 
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                onPlay={togglePlay}
                isPlaying={isPlaying}
                theme={theme}
            />
        </section>

        {/* Score Section */}
        <section className="flex-1 flex flex-col relative min-h-[350px]">
             <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-1 rounded-full bg-gray-400 opacity-50"></div>
             <ScoreRenderer abcNotation={abcNotation} />
        </section>

      </main>

      {/* Footer */}
      <footer className={`flex-none p-4 text-center border-t ${appColors.footerBorder} ${appColors.footerBg} transition-colors duration-300`}>
        <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Professional Sight-Reading Generator</p>
        <p className={`text-[10px] mt-1 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>Original concept reference: icstudio.club</p>
      </footer>

    </div>
  );
};

export default App;
