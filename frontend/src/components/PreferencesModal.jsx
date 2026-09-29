import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Settings, 
  X, 
  Globe, 
  Volume2, 
  VolumeX, 
  ChevronDown, 
  Check, 
  MousePointer, 
  Activity, 
  Bell, 
  Waves, 
  Compass, 
  Sun, 
  Moon,
  Sparkles,
  Download,
  Smartphone,
  CheckCircle2,
  ChevronRight,
  Play,
  Square,
  Gauge
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import { playClick } from '../utils/soundFx';
import { speakText, stopSpeaking } from '../utils/speech';
import { usePWA } from '../hooks/usePWA';
import CurvyArrow from './CurvyArrow';
import ThemeToggle from './ThemeToggle';

/**
 * High-Precision ToggleSwitch Component
 * Replaces pseudo-element checkboxes with a clean, semantic React button slider.
 * Eliminates all dot/outline visual artifacts.
 */
function ToggleSwitch({ checked, onChange, disabled = false, size = 'md', ariaLabel = 'Toggle setting' }) {
  const isSmall = size === 'sm';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled && onChange) onChange(!checked);
      }}
      className={`relative inline-flex items-center rounded-full transition-colors duration-300 focus:outline-none cursor-pointer select-none border-transparent ${
        isSmall ? 'w-9 h-5 p-0.5' : 'w-11 h-6 p-0.5'
      } ${
        checked 
          ? 'bg-neutral-950 dark:bg-white' 
          : 'bg-neutral-200 dark:bg-white/20'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block rounded-full transition-transform duration-300 shadow-xs pointer-events-none border border-transparent ${
          isSmall ? 'w-4 h-4' : 'w-5 h-5'
        } ${
          checked 
            ? 'bg-white dark:bg-neutral-950' 
            : 'bg-white dark:bg-neutral-300'
        }`}
        style={{
          transform: checked 
            ? (isSmall ? 'translateX(16px)' : 'translateX(20px)') 
            : 'translateX(0px)'
        }}
      />
    </button>
  );
}

export default function PreferencesModal({ isOpen, onClose }) {
  const { i18n } = useTranslation();
  const { dark, setDark } = useTheme();
  const { isInstallable, isInstalled, isStandalone, promptInstall } = usePWA();

  // State sync
  const [soundsActive, setSoundsActive] = useState(() => localStorage.getItem('swatva_sound') !== 'off');
  const [clickSoundActive, setClickSoundActive] = useState(() => localStorage.getItem('swatva_sound_click') !== 'off');
  const [loadSoundActive, setLoadSoundActive] = useState(() => localStorage.getItem('swatva_sound_load') !== 'off');
  const [voiceTtsActive, setVoiceTtsActive] = useState(() => localStorage.getItem('swatva_sound_tts') === 'on');
  const [speechRate, setSpeechRate] = useState(() => {
    return parseFloat(localStorage.getItem('swatva_sound_speed') || '1.0');
  });
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  const [motionActive, setMotionActive] = useState(() => localStorage.getItem('swatva_motion') !== 'off');
  const [particlesActive, setParticlesActive] = useState(() => localStorage.getItem('swatva_particles') !== 'off');
  const [waveformsActive, setWaveformsActive] = useState(() => localStorage.getItem('swatva_waveforms') !== 'off');

  // PWA Direct Install state
  const [pwaInstalling, setPwaInstalling] = useState(false);

  // Single-group accordion expansion: 'sounds' | 'motion' | null
  const [expandedGroupId, setExpandedGroupId] = useState(null);

  // Smooth gear spin on action
  const [gearRotation, setGearRotation] = useState(0);

  const handlePwaAction = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    playClick();

    if (isInstalled || isStandalone) {
      return;
    }

    setPwaInstalling(true);

    try {
      await promptInstall();
    } catch (err) {
      console.warn('PWA install error:', err);
    } finally {
      setPwaInstalling(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.documentElement.classList.add('lightbox-active');
      setGearRotation(prev => prev + 180);
      setExpandedGroupId(null);
    } else {
      document.documentElement.classList.remove('lightbox-active');
    }
    return () => document.documentElement.classList.remove('lightbox-active');
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const spinGear = () => {
    setGearRotation(prev => prev + 90);
  };

  const handleToggleGroup = (groupId) => {
    playClick();
    spinGear();
    setExpandedGroupId(prev => (prev === groupId ? null : groupId));
  };

  const handleSelectLanguage = (code) => {
    playClick();
    spinGear();
    i18n.changeLanguage(code);
    localStorage.setItem('swatva_language', code);
  };

  const handleSoundMasterToggle = (newVal) => {
    setSoundsActive(newVal);
    localStorage.setItem('swatva_sound', newVal ? 'on' : 'off');
    spinGear();
    if (newVal) {
      playClick();
    } else {
      if (expandedGroupId === 'sounds') setExpandedGroupId(null);
    }
  };

  const handleSoundClickToggle = (newVal) => {
    setClickSoundActive(newVal);
    localStorage.setItem('swatva_sound_click', newVal ? 'on' : 'off');
    spinGear();
    if (newVal) playClick();
  };

  const handleSoundLoadToggle = (newVal) => {
    setLoadSoundActive(newVal);
    localStorage.setItem('swatva_sound_load', newVal ? 'on' : 'off');
    spinGear();
    if (newVal) playClick();
  };

  const handleVoiceTtsToggle = (newVal) => {
    setVoiceTtsActive(newVal);
    localStorage.setItem('swatva_sound_tts', newVal ? 'on' : 'off');
    spinGear();
    if (newVal) playClick();
    if (!newVal && isTestingVoice) {
      stopSpeaking();
      setIsTestingVoice(false);
    }
  };

  const handleSpeechRateChange = (rate) => {
    playClick();
    setSpeechRate(rate);
    localStorage.setItem('swatva_sound_speed', rate.toString());
  };

  const handleTestVoice = () => {
    playClick();
    if (isTestingVoice) {
      stopSpeaking();
      setIsTestingVoice(false);
      return;
    }
    const sampleText = currentLang === 'hi'
      ? 'नमस्ते! स्वत्व सहायक में आपका स्वागत है। आपकी सभी सरकारी योजनाओं की जानकारी यहाँ उपलब्ध है।'
      : 'Hello! Welcome to Swatva Assistant. All your welfare scheme details are ready.';
    
    setIsTestingVoice(true);
    speakText(sampleText, currentLang, {
      rate: speechRate,
      onStart: () => setIsTestingVoice(true),
      onEnd: () => setIsTestingVoice(false),
      onError: () => setIsTestingVoice(false),
    });
  };

  const handleMotionToggle = (newVal) => {
    setMotionActive(newVal);
    localStorage.setItem('swatva_motion', newVal ? 'on' : 'off');
    spinGear();
    if (newVal) {
      playClick();
    } else {
      if (expandedGroupId === 'motion') setExpandedGroupId(null);
    }
  };

  const handleParticlesToggle = (newVal) => {
    setParticlesActive(newVal);
    localStorage.setItem('swatva_particles', newVal ? 'on' : 'off');
    spinGear();
    if (newVal) playClick();
  };

  const handleWaveformsToggle = (newVal) => {
    setWaveformsActive(newVal);
    localStorage.setItem('swatva_waveforms', newVal ? 'on' : 'off');
    spinGear();
    if (newVal) playClick();
  };

  const getAccordionStyle = (isExpanded, openHeight) => ({
    maxHeight: isExpanded ? openHeight : '0px',
    opacity: isExpanded ? 1 : 0,
    marginTop: isExpanded ? '0.75rem' : '0px',
    pointerEvents: isExpanded ? 'auto' : 'none',
    transition: isExpanded
      ? 'max-height 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1), margin-top 0.65s cubic-bezier(0.16, 1, 0.3, 1)'
      : 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, margin-top 0.3s ease'
  });

  if (!isOpen) return null;

  const currentLang = i18n.language?.startsWith('hi') ? 'hi' : 'en';

  // Portalled to <body> on purpose. Any ancestor with a backdrop-filter — which
  // includes the frosted navbar this is also opened from — becomes the
  // containing block for `position: fixed` descendants, so an in-tree overlay
  // would size and position itself against that bar instead of the viewport.
  const overlay = (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg max-h-[85dvh] sm:max-h-[88dvh] overflow-y-auto overscroll-contain custom-scrollbar bg-white/95 dark:bg-[#0c0c0e] border border-neutral-200/90 dark:border-white/15 rounded-2xl sm:rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl animate-in zoom-in-95 duration-250 p-4 sm:p-7">
        
        {/* Close Button */}
        <button
          onClick={() => { playClick(); onClose(); }}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/20 transition cursor-pointer"
          aria-label="Close preferences"
        >
          <X size={15} />
        </button>

        {/* Modal Header: Bare Unboxed Gear SVG */}
        <div className="border-b border-neutral-200/80 dark:border-white/10 pb-3 sm:pb-4 mb-4 pr-8">
          <div className="flex items-center space-x-2.5 mb-1">
            <Settings 
              size={19} 
              className="text-neutral-950 dark:text-white flex-shrink-0"
              style={{
                transform: `rotate(${gearRotation}deg)`,
                transition: 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)'
              }}
            />
            <h2 className="text-base sm:text-xl font-bold tracking-tight text-neutral-950 dark:text-white font-sans">
              {currentLang === 'hi' ? 'प्राथमिकताएं एवं सेटिंग्स' : 'System Preferences'}
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 ml-7 leading-snug">
            {currentLang === 'hi' 
              ? 'भाषा, थीम, स्पर्श प्रतिक्रिया और इंटरैक्टिव भौतिकी को अनुकूलित करें।' 
              : 'Customize language, appearance, audio, and motion settings.'}
          </p>
        </div>

        {/* Settings Grid Structure */}
        <div className="space-y-3 font-sans">
          
          {/* ========================================================
              0. APPEARANCE / THEME MODE: Light / Dark Mode Toggle (Touchscreen only; Desktop uses topbar ThemeToggle)
             ======================================================== */}
          <div 
            data-tour="theme-preference" 
            className="block [@media(pointer:fine)]:hidden p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-neutral-50/90 dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/15 transition-all"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5 sm:space-x-3 flex-1 min-w-0">
                {dark ? (
                  <Moon size={15} className="text-amber-400 flex-shrink-0" />
                ) : (
                  <Sun size={15} className="text-amber-600 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-semibold text-neutral-950 dark:text-white leading-snug break-words">
                    {currentLang === 'hi' ? 'इंटरफ़ेस थीम (लाइट / डार्क)' : 'Appearance & Theme'}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight mt-0.5 break-words">
                    {currentLang === 'hi'
                      ? 'स्पष्ट दृश्यता के लिए लाइट थीम या आरामदायक डार्क थीम चुनें।'
                      : 'Toggle between clean porcelain light mode and obsidian dark mode.'}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-neutral-200/70 dark:bg-white/10 border border-neutral-300/50 dark:border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => { playClick(); spinGear(); setDark(false); }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                    !dark
                      ? 'bg-white text-neutral-950 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                  }`}
                  aria-label="Light mode"
                >
                  <Sun size={11} className={!dark ? 'text-amber-600' : ''} />
                  <span>{currentLang === 'hi' ? 'लाइट' : 'Light'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { playClick(); spinGear(); setDark(true); }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                    dark
                      ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                  }`}
                  aria-label="Dark mode"
                >
                  <Moon size={11} className={dark ? 'text-amber-400' : ''} />
                  <span>{currentLang === 'hi' ? 'डार्क' : 'Dark'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================
              1. MAIN SETTING: Platform Language & Dialect Pipeline
             ======================================================== */}
          <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-neutral-50/90 dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/15 transition-all">
            <div className="flex items-center space-x-2.5 sm:space-x-3 mb-2.5 sm:mb-3">
              <Globe size={15} className="text-neutral-950 dark:text-white flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] sm:text-xs font-semibold text-neutral-950 dark:text-white leading-snug">
                  {currentLang === 'hi' ? 'भाषा एवं शब्दावली' : 'Platform Language & Dialect'}
                </div>
                <div className="text-[9px] sm:text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight mt-0.5">
                  {currentLang === 'hi' ? 'योजनाओं, नियमों और एआई सहायक के लिए प्राथमिक भाषा चुनें।' : 'Select the primary linguistic engine for schemes, eligibility rules, and AI guidance.'}
                </div>
              </div>
            </div>

            {/* 2 Horizontal Language Cards Grid */}
            <div className="grid grid-cols-2 gap-2">
              {[ 
                { 
                  code: 'en', 
                  title: 'English', 
                  badge: 'Standard', 
                  desc: 'National Gazette & Legal Wording',
                  monogram: 'En' 
                },
                { 
                  code: 'hi', 
                  title: 'हिन्दी', 
                  badge: 'प्रामाणिक', 
                  desc: 'सहज एवं सुगम जन-संवाद',
                  monogram: 'अ' 
                }
              ].map((item) => {
                const isSelected = currentLang === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleSelectLanguage(item.code)}
                    className={`flex flex-col items-center justify-between p-2.5 sm:p-3.5 rounded-xl border text-center transition-all cursor-pointer select-none relative group h-24 sm:h-26 active:scale-95 ${
                      isSelected
                        ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 border-transparent shadow-md ring-2 ring-neutral-950/20 dark:ring-white/20'
                        : 'bg-white dark:bg-white/[0.02] text-neutral-700 dark:text-neutral-200 border-neutral-200/80 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20 hover:bg-neutral-50 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    {/* Selected Check Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white dark:bg-neutral-950 text-neutral-950 dark:text-white flex items-center justify-center shadow-xs">
                        <Check size={9} strokeWidth={4} />
                      </div>
                    )}

                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold leading-none mb-1.5 ${
                      isSelected 
                        ? 'bg-white text-neutral-950 dark:bg-neutral-950 dark:text-white' 
                        : 'bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300'
                    }`}>
                      {item.monogram}
                    </span>
                    
                    <div className="flex flex-col items-center w-full">
                      <span className="text-xs font-bold tracking-tight block truncate w-full">{item.title}</span>
                      <span className={`text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded mt-1 uppercase block truncate max-w-full ${
                        isSelected 
                          ? 'bg-white/25 dark:bg-black/25 text-white dark:text-neutral-950' 
                          : 'bg-neutral-100 dark:bg-white/10 text-neutral-500 dark:text-neutral-400'
                      }`}>
                        {item.badge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================
              2. MAIN SETTING: Audio & Sensory Feedback Engine
             ======================================================== */}
          <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-neutral-50/90 dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/15 transition-all">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5 sm:space-x-3 flex-1 min-w-0">
                {soundsActive ? (
                  <Volume2 size={15} className="text-neutral-950 dark:text-white flex-shrink-0" />
                ) : (
                  <VolumeX size={15} className="text-neutral-400 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-semibold text-neutral-950 dark:text-white leading-snug break-words">
                    {currentLang === 'hi' ? 'स्पर्श व ध्वनि प्रतिक्रिया' : 'Sensory & Audio Feedback'}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight mt-0.5 break-words">
                    {currentLang === 'hi' ? 'बटन क्लिक, नियम मिलान और दस्तावेज़ सत्यापन पर स्पर्श ध्वनि।' : 'Click sounds, chimes on eligibility matches and document uploads.'}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-2.5 flex-shrink-0">
                <ToggleSwitch 
                  checked={soundsActive} 
                  onChange={handleSoundMasterToggle} 
                  ariaLabel="Toggle sound effects"
                />

                <button
                  type="button"
                  onClick={() => handleToggleGroup('sounds')}
                  className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-white/10 transition cursor-pointer bg-transparent"
                  title="Configure Audio"
                >
                  <ChevronDown 
                    size={15} 
                    className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" 
                    style={{ transform: expandedGroupId === 'sounds' ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>
              </div>
            </div>

            {/* Sub-Settings: Sound Controls */}
            <div 
              className={`space-y-1.5 border-l-2 border-neutral-300 dark:border-white/20 ml-2 pl-3 overflow-hidden ${
                !soundsActive ? 'opacity-40 pointer-events-none' : ''
              }`}
              style={getAccordionStyle(expandedGroupId === 'sounds', '320px')}
            >
              {/* Sound Sub 1: Click Feedback */}
              <div className="flex items-center justify-between p-2 rounded-lg sm:rounded-xl bg-white dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10">
                <div className="flex items-center space-x-2">
                  <MousePointer size={13} className="text-neutral-700 dark:text-neutral-300 flex-shrink-0" />
                  <span className="text-[10px] sm:text-[11px] text-neutral-700 dark:text-neutral-200 font-medium">
                    {currentLang === 'hi' ? 'बटन क्लिक प्रतिक्रिया' : 'Tactile Click Feedback'}
                  </span>
                </div>
                <ToggleSwitch 
                  size="sm"
                  disabled={!soundsActive}
                  checked={clickSoundActive} 
                  onChange={handleSoundClickToggle}
                  ariaLabel="Toggle click feedback"
                />
              </div>

              {/* Sound Sub 2: Verification Chime */}
              <div className="flex items-center justify-between p-2 rounded-lg sm:rounded-xl bg-white dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10">
                <div className="flex items-center space-x-2">
                  <Bell size={13} className="text-neutral-700 dark:text-neutral-300 flex-shrink-0" />
                  <span className="text-[10px] sm:text-[11px] text-neutral-700 dark:text-neutral-200 font-medium">
                    {currentLang === 'hi' ? 'सत्यापन पूर्ण झंकार' : 'Rule Verification Chime'}
                  </span>
                </div>
                <ToggleSwitch 
                  size="sm"
                  disabled={!soundsActive}
                  checked={loadSoundActive} 
                  onChange={handleSoundLoadToggle}
                  ariaLabel="Toggle verification chime"
                />
              </div>

              {/* Sound Sub 3: Voice Readout */}
              <div className="flex flex-col p-2 rounded-lg sm:rounded-xl bg-white dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Volume2 size={13} className="text-neutral-700 dark:text-neutral-300 flex-shrink-0" />
                    <span className="text-[10px] sm:text-[11px] text-neutral-700 dark:text-neutral-200 font-medium">
                      {currentLang === 'hi' ? 'सहायक वाक् उद्घोषणा (Indic TTS)' : 'Assistant Voice Readout (Indic TTS)'}
                    </span>
                  </div>
                  <ToggleSwitch 
                    size="sm"
                    disabled={!soundsActive}
                    checked={voiceTtsActive} 
                    onChange={handleVoiceTtsToggle}
                    ariaLabel="Toggle voice readout"
                  />
                </div>

                {voiceTtsActive && soundsActive && (
                  <div className="pt-1.5 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between gap-2">
                    {/* Speed Selector */}
                    <div className="flex items-center gap-1">
                      <Gauge size={11} className="text-neutral-400" />
                      <span className="text-[9px] text-neutral-500 dark:text-neutral-400 font-medium">
                        {currentLang === 'hi' ? 'गति:' : 'Speed:'}
                      </span>
                      {[0.85, 1.0, 1.2].map((speed) => (
                        <button
                          key={speed}
                          type="button"
                          onClick={() => handleSpeechRateChange(speed)}
                          className={`text-[9px] px-2 py-0.5 rounded-md cursor-pointer font-medium transition-all ${
                            speechRate === speed
                              ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                              : 'bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/15'
                          }`}
                        >
                          {speed}×
                        </button>
                      ))}
                    </div>

                    {/* Test Voice Button */}
                    <button
                      type="button"
                      onClick={handleTestVoice}
                      className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-950 dark:text-amber-200 hover:bg-amber-500/25 border border-amber-500/30 transition-all cursor-pointer shadow-xs"
                    >
                      {isTestingVoice ? (
                        <>
                          <Square size={9} className="text-amber-600 dark:text-amber-400 animate-pulse" />
                          <span>{currentLang === 'hi' ? 'रोकें' : 'Stop'}</span>
                        </>
                      ) : (
                        <>
                          <Play size={9} />
                          <span>{currentLang === 'hi' ? 'परीक्षण' : 'Test Voice'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================
              3. MAIN SETTING: Motion & Kinetic Physics
             ======================================================== */}
          <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-neutral-50/90 dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/15 transition-all">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5 sm:space-x-3 flex-1 min-w-0">
                <Waves size={15} className="text-neutral-950 dark:text-white flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-semibold text-neutral-950 dark:text-white leading-snug break-words">
                    {currentLang === 'hi' ? 'गति एवं काइनेटिक एनिमेशन' : 'Motion & Kinetic Physics'}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight mt-0.5 break-words">
                    {currentLang === 'hi' ? 'स्लॉट-रील रोलर, लेजिस स्मूथ स्क्रॉलिंग और कण भौतिकी।' : 'Smooth scrolling, kinetic headlines, and particle animations.'}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-2.5 flex-shrink-0">
                <ToggleSwitch 
                  checked={motionActive} 
                  onChange={handleMotionToggle} 
                  ariaLabel="Toggle motion"
                />

                <button
                  type="button"
                  onClick={() => handleToggleGroup('motion')}
                  className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-white/10 transition cursor-pointer bg-transparent"
                  title="Configure Motion"
                >
                  <ChevronDown 
                    size={15} 
                    className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" 
                    style={{ transform: expandedGroupId === 'motion' ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>
              </div>
            </div>

            {/* Sub-Settings: Motion Controls */}
            <div 
              className={`space-y-1.5 border-l-2 border-neutral-300 dark:border-white/20 ml-2 pl-3 overflow-hidden ${
                !motionActive ? 'opacity-40 pointer-events-none' : ''
              }`}
              style={getAccordionStyle(expandedGroupId === 'motion', '105px')}
            >
              {/* Motion Sub 1: Kinetic Particles */}
              <div className="flex items-center justify-between p-2 rounded-lg sm:rounded-xl bg-white dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10">
                <div className="flex items-center space-x-2">
                  <Activity size={13} className="text-neutral-700 dark:text-neutral-300 flex-shrink-0" />
                  <span className="text-[10px] sm:text-[11px] text-neutral-700 dark:text-neutral-200 font-medium">
                    {currentLang === 'hi' ? 'काइनेटिक शीर्षक एवं कण' : 'Kinetic Slot-Reel & Particles'}
                  </span>
                </div>
                <ToggleSwitch 
                  size="sm"
                  disabled={!motionActive}
                  checked={particlesActive} 
                  onChange={handleParticlesToggle}
                  ariaLabel="Toggle particles"
                />
              </div>

              {/* Motion Sub 2: Frequency Bars */}
              <div className="flex items-center justify-between p-2 rounded-lg sm:rounded-xl bg-white dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10">
                <div className="flex items-center space-x-2">
                  <Sparkles size={13} className="text-neutral-700 dark:text-neutral-300 flex-shrink-0" />
                  <span className="text-[10px] sm:text-[11px] text-neutral-700 dark:text-neutral-200 font-medium">
                    {currentLang === 'hi' ? 'लाइव टेलीमेट्री तरंगे' : 'Telemetry Waveforms & Bars'}
                  </span>
                </div>
                <ToggleSwitch 
                  size="sm"
                  disabled={!motionActive}
                  checked={waveformsActive} 
                  onChange={handleWaveformsToggle}
                  ariaLabel="Toggle waveforms"
                />
              </div>
            </div>
          </div>

          {/* ========================================================
              4. Progressive Web App (PWA) / Device Installation
             ======================================================== */}
          <div 
            className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-neutral-50/90 dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/15 transition-all select-none"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5 sm:space-x-3 flex-1 min-w-0">
                <Smartphone size={15} className="text-neutral-950 dark:text-white flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="text-[11px] sm:text-xs font-semibold text-neutral-950 dark:text-white leading-snug">
                      {currentLang === 'hi' ? 'ऐप इंस्टॉल करें' : 'Install App'}
                    </div>
                    {isInstalled || isStandalone ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-px text-[9px] font-semibold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 size={9} />
                        {currentLang === 'hi' ? 'स्थापित' : 'Installed'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-px text-[9px] font-semibold rounded-full bg-neutral-200/70 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 border border-neutral-300/60 dark:border-white/15">
                        {currentLang === 'hi' ? 'तैयार' : 'Ready'}
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-neutral-500 dark:text-neutral-400 leading-none mt-0.5 truncate">
                    {isInstalled || isStandalone
                      ? (currentLang === 'hi' ? 'ऐप चल रहा है • ऑफ़लाइन सक्षम' : 'Running as installed app • Offline ready')
                      : (currentLang === 'hi'
                          ? 'सीधे अपने डिवाइस पर ऐप की तरह इंस्टॉल करें'
                          : 'Install directly on your device as a standalone app')}
                  </div>
                </div>
              </div>

              {isInstalled || isStandalone ? (
                <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 size={11} />
                  {currentLang === 'hi' ? 'सक्रिय' : 'Active'}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handlePwaAction}
                  disabled={pwaInstalling}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950 text-[10px] font-semibold tracking-tight active:scale-[0.98] transition-all cursor-pointer shadow-xs disabled:opacity-60"
                >
                  <Download size={11} className={`stroke-[2.2] ${pwaInstalling ? 'animate-bounce' : ''}`} />
                  <span>
                    {pwaInstalling
                      ? (currentLang === 'hi' ? 'इंस्टॉल हो रहा है...' : 'Installing...')
                      : (currentLang === 'hi' ? 'ऐप इंस्टॉल करें' : 'Install App')}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* ========================================================
              5. Interactive Platform Guided Tour Action
             ======================================================== */}
          <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-neutral-50/90 dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/15 space-y-2.5">
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              <div className="w-8 h-8 rounded-xl bg-neutral-950 dark:bg-white flex items-center justify-center flex-shrink-0 shadow-md">
                <Compass size={15} className="text-white dark:text-neutral-950 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-semibold text-neutral-950 dark:text-white leading-snug">
                  {currentLang === 'hi' ? 'योजना खोज निर्देशित दौरा' : 'Scheme Discovery Guided Tour'}
                </div>
                <div className="text-[9px] sm:text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight mt-0.5">
                  {currentLang === 'hi' 
                    ? 'पात्रता मिलान, दस्तावेज़ तैयारी और आवेदन चेकलिस्ट का त्वरित मार्गदर्शक।' 
                    : 'Interactive walkthrough of deterministic matching, locker, and checklists.'}
                </div>
              </div>
            </div>

            <div className="relative group">
              <CurvyArrow
                direction="top-left"
                className="-top-7 left-3 hidden sm:inline-flex rotate-180"
                hoverOnly={true}
              />
              <button
                type="button"
                onClick={() => {
                  playClick();
                  onClose();
                  // Dispatch tour trigger event after preferences modal finishes unmounting
                  window.setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('swatva-start-tour'));
                  }, 120);
                }}
                className="w-full py-2 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold tracking-tight hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>{currentLang === 'hi' ? 'टूर शुरू करें' : 'Start Guided Tour'}</span>
                <span className="opacity-70">→</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay;
}
