import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Compass, 
  Search, 
  Scale, 
  FileStack, 
  MessageSquare, 
  Bell, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  Sparkles,
  LayoutDashboard,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playClick } from '../utils/soundFx';

const SEEN_KEY = 'swatva_tour_seen_v1';
const TOUR_EVENT = 'swatva-start-tour';

const TOUR_STEPS = [
  {
    id: 'brand',
    target: '[data-tour="brand"]',
    icon: Compass,
    titleEn: 'Welcome to SWATVA',
    titleHi: 'स्वत्व में आपका स्वागत है',
    descEn: 'Public digital infrastructure connecting citizens to government schemes with deterministic rules and zero middlemen.',
    descHi: 'नागरिकों को बिना किसी बिचौलिये के सीधे सरकारी योजनाओं से जोड़ने वाला पारदर्शी सार्वजनिक डिजिटल प्लेटफॉर्म।'
  },
  {
    id: 'nav-discover',
    target: '[data-tour="nav-discover"]',
    icon: Search,
    titleEn: 'Life-Event Discovery',
    titleHi: 'जीवन-घटना आधारित खोज',
    descEn: 'Describe what you or your family are going through in plain text or your native dialect to surface verified schemes.',
    descHi: 'अपनी या परिवार की स्थिति को सामान्य भाषा में बताएं और संबंधित सरकारी योजनाएं तुरंत खोजें।'
  },
  {
    id: 'nav-matches',
    target: '[data-tour="nav-matches"]',
    icon: Scale,
    titleEn: 'Eligibility & Rules Engine',
    titleHi: 'पात्रता मिलान एवं नियम',
    descEn: 'See exact schemes you qualify for with 100% deterministic rules, required documents, and unclaimed benefit calculations.',
    descHi: 'नियमों के आधार पर जानें कि आप किन योजनाओं के लिए पात्र हैं और कौन से दस्तावेज़ आवश्यक हैं।'
  },
  {
    id: 'nav-documents',
    target: '[data-tour="nav-documents"]',
    icon: FileStack,
    titleEn: 'Document Locker',
    titleHi: 'दस्तावेज़ लॉकर',
    descEn: 'Securely store Aadhaar, income, and caste certificates. Automatic OCR reads your credentials and pre-checks criteria.',
    descHi: 'आधार व आय प्रमाण पत्र सुरक्षित रखें। स्वचालित ओसीआर आपके विवरण को पढ़ता है और सत्यापन में सहायता करता है।'
  },
  {
    id: 'nav-assistant',
    target: '[data-tour="nav-assistant"]',
    icon: MessageSquare,
    titleEn: 'Vernacular AI Assistant',
    titleHi: 'एआई सलाहकार',
    descEn: 'Get instant, cited answers about eligibility criteria, application steps, and deadlines in your preferred language.',
    descHi: 'योजनाओं की पात्रता, आवेदन प्रक्रिया और तिथियों के बारे में अपनी भाषा में सटीक व त्वरित जानकारी पाएं।'
  },
  {
    id: 'notifications',
    target: '[data-tour="notifications"]',
    icon: Bell,
    titleEn: 'Notifications & Alerts',
    titleHi: 'सूचनाएं एवं अलर्ट',
    descEn: 'Stay updated on expiring documents, missing criteria to claim, and verified DBT cash transfers.',
    descHi: 'दस्तावेज़ की समाप्ति तिथि, नई योजनाओं और प्रत्यक्ष लाभ हस्तांतरण (DBT) के अलर्ट प्राप्त करें।'
  },
  {
    id: 'profile',
    target: '[data-tour="profile"]',
    icon: User,
    titleEn: 'Citizen Profile & Preferences',
    titleHi: 'नागरिक प्रोफ़ाइल एवं सेटिंग्स',
    descEn: 'Manage personal details, switch theme, toggle sensory audio feedback, or view Team ClusterGuilders.',
    descHi: 'अपनी प्रोफ़ाइल जानकारी प्रबंधित करें, थीम बदलें, और भाषा व प्राथमिकताओं को अनुकूलित करें।'
  }
];

/**
 * First-Time Login Welcome Prompt Modal (SAHNIRMAAN obsidian aesthetic).
 */
function WelcomeTourPromptModal({ isOpen, onClose, onAccept, isHindi }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        playClick();
        onClose();
      } else if (e.key === 'Enter') {
        playClick();
        onAccept();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onAccept]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 bg-black/65 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 font-sans">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-prompt-title"
        className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#0a0b0e] border border-neutral-200/90 dark:border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.25)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.9)] p-6 sm:p-8 text-neutral-900 dark:text-white overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Subtle Warm Amber Halo */}
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-amber-500/[0.08] dark:bg-amber-500/[0.12] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-amber-500/[0.06] dark:bg-amber-500/[0.10] blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => {
            playClick();
            onClose();
          }}
          type="button"
          aria-label={isHindi ? 'बंद करें' : 'Close'}
          className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Header Icon + Badge */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-10 w-10 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center shadow-md">
            <Compass size={20} className="stroke-[2.2]" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-neutral-100 dark:bg-white/10 text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-white/15">
              {isHindi ? 'नागरिक पोर्टल · त्वरित 1-मिनट दौरा' : 'Citizen Portal · Quick 1-Min Tour'}
            </span>
          </div>
        </div>

        {/* Title & Subtitle */}
        <h2 id="tour-prompt-title" className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 dark:text-white leading-snug">
          {isHindi ? 'स्वत्व (SWATVA) में आपका स्वागत है!' : 'Welcome to SWATVA!'}
        </h2>
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed mt-2">
          {isHindi 
            ? 'क्या आप अपने नागरिक पोर्टल और सरकारी योजनाओं को आसानी से समझने के लिए एक त्वरित निर्देशित दौरा लेना चाहेंगे?' 
            : 'Would you like a quick guided tour to help you navigate your citizen portal and discover eligible schemes?'}
        </p>

        {/* Feature Highlights List */}
        <div className="my-5 p-3.5 sm:p-4 rounded-2xl bg-neutral-50/90 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/10 space-y-2.5">
          <div className="flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200">
            <CheckCircle2 size={15} className="text-amber-500 flex-shrink-0" />
            <span>
              {isHindi 
                ? 'जीवन-घटना आधारित सरल व बोलचाल भाषा में योजना खोज' 
                : 'Life-event plain-language scheme discovery & matching'}
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200">
            <CheckCircle2 size={15} className="text-amber-500 flex-shrink-0" />
            <span>
              {isHindi 
                ? '100% सटीक नियम इंजन व स्वतः दस्तावेज़ पात्रता सत्यापन' 
                : '100% deterministic rules engine with automated eligibility pre-checks'}
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200">
            <CheckCircle2 size={15} className="text-amber-500 flex-shrink-0" />
            <span>
              {isHindi 
                ? 'क्षेत्रीय भाषा एआई सहायक एवं सुरक्षित दस्तावेज़ लॉकर' 
                : 'Vernacular AI Assistant & secure end-to-end Document Locker'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              playClick();
              onClose();
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition cursor-pointer text-center"
          >
            {isHindi ? 'नहीं, मैं स्वयं देखूँगा' : 'No thanks, explore on my own'}
          </button>

          <button
            type="button"
            onClick={() => {
              playClick();
              onAccept();
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{isHindi ? 'दौरा शुरू करें' : 'Start Guided Tour'}</span>
            <ArrowRight size={14} className="stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GuidedTour() {
  const { i18n } = useTranslation();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const isHindi = i18n.language === 'hi';

  const updatePosition = useCallback(() => {
    const step = TOUR_STEPS[currentStep];
    if (!step) return;
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      });
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  // First-time login prompt detection (600ms grace period after load)
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const seen = localStorage.getItem(SEEN_KEY);
      if (!seen) {
        setShowPrompt(true);
      }
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  // Listen to manual tour triggers (from preferences/help menu)
  useEffect(() => {
    const handleStartTour = () => {
      setShowPrompt(false);
      setCurrentStep(0);
      setIsOpen(true);
      playClick();
    };

    window.addEventListener(TOUR_EVENT, handleStartTour);
    return () => window.removeEventListener(TOUR_EVENT, handleStartTour);
  }, []);

  const handlePromptAccept = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem(SEEN_KEY, '1');
    window.setTimeout(() => {
      setCurrentStep(0);
      setIsOpen(true);
    }, 80);
  }, []);

  const handlePromptDismiss = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem(SEEN_KEY, '1');
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleResize = () => updatePosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        playClick();
        setIsOpen(false);
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStep < TOUR_STEPS.length - 1) {
          playClick();
          setCurrentStep((prev) => prev + 1);
        } else {
          playClick();
          setIsOpen(false);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStep > 0) {
          playClick();
          setCurrentStep((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep]);

  const step = TOUR_STEPS[currentStep];
  const IconComp = step?.icon || Compass;
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  // Calculate popover positioning relative to highlighted element
  let popoverTop = 100;
  let popoverLeft = 20;

  if (targetRect) {
    if (targetRect.bottom + 260 < window.innerHeight) {
      popoverTop = targetRect.bottom + 16;
    } else {
      popoverTop = Math.max(16, targetRect.top - 250);
    }
    const idealLeft = targetRect.left + targetRect.width / 2 - 160;
    popoverLeft = Math.max(16, Math.min(idealLeft, window.innerWidth - 336));
  } else {
    popoverTop = Math.max(40, window.innerHeight / 2 - 130);
    popoverLeft = Math.max(16, window.innerWidth / 2 - 160);
  }

  const tourContent = (
    <>
      {/* First-Time Welcome Prompt Modal */}
      <WelcomeTourPromptModal
        isOpen={showPrompt}
        onClose={handlePromptDismiss}
        onAccept={handlePromptAccept}
        isHindi={isHindi}
      />

      {/* Step-by-Step Spotlight Tour */}
      {isOpen && (
        <div className="fixed inset-0 z-[999999] pointer-events-auto">
          {/* Backdrop Spotlight with SVG Cutout */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300">
            <defs>
              <mask id="spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {targetRect && (
                  <rect
                    x={targetRect.left - 6}
                    y={targetRect.top - 6}
                    width={targetRect.width + 12}
                    height={targetRect.height + 12}
                    rx="14"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.72)"
              mask="url(#spotlight-mask)"
            />
          </svg>

          {/* Target glowing border box */}
          {targetRect && (
            <div
              className="absolute rounded-2xl border-2 border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.6)] pointer-events-none transition-all duration-300 ease-out"
              style={{
                top: `${targetRect.top - 6}px`,
                left: `${targetRect.left - 6}px`,
                width: `${targetRect.width + 12}px`,
                height: `${targetRect.height + 12}px`,
              }}
            />
          )}

          {/* Floating Step Card */}
          <div
            className="absolute w-[320px] sm:w-[350px] bg-white/95 dark:bg-[#121216]/95 border border-neutral-200/90 dark:border-white/15 rounded-2xl sm:rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.5)] backdrop-blur-2xl p-5 text-neutral-950 dark:text-white transition-all duration-300 animate-in fade-in zoom-in-95 font-sans"
            style={{
              top: `${popoverTop}px`,
              left: `${popoverLeft}px`,
            }}
          >
            {/* Step Badge & Close */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center shadow-xs">
                  <IconComp size={14} className="stroke-[2.2]" />
                </div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {isHindi ? `चरण ${currentStep + 1} / ${TOUR_STEPS.length}` : `Step ${currentStep + 1} of ${TOUR_STEPS.length}`}
                </span>
              </div>

              <button
                type="button"
                onClick={() => { playClick(); setIsOpen(false); }}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition cursor-pointer"
                aria-label={isHindi ? 'दौरा छोड़ें' : 'Skip tour'}
              >
                <X size={14} />
              </button>
            </div>

            {/* Title & Desc */}
            <h3 className="text-sm font-bold tracking-tight mb-1.5 text-neutral-950 dark:text-white">
              {isHindi ? step.titleHi : step.titleEn}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4">
              {isHindi ? step.descHi : step.descEn}
            </p>

            {/* Action Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => { playClick(); setIsOpen(false); }}
                className="text-[11px] font-semibold text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition cursor-pointer"
              >
                {isHindi ? 'दौरा छोड़ें' : 'Skip'}
              </button>

              <div className="flex items-center gap-1.5">
                {!isFirst && (
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setCurrentStep((prev) => prev - 1);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-white/20 transition cursor-pointer inline-flex items-center gap-1"
                  >
                    <ChevronLeft size={13} />
                    <span>{isHindi ? 'पीछे' : 'Back'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    if (isLast) {
                      setIsOpen(false);
                    } else {
                      setCurrentStep((prev) => prev + 1);
                    }
                  }}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:opacity-90 active:scale-95 transition cursor-pointer inline-flex items-center gap-1 shadow-sm"
                >
                  <span>{isLast ? (isHindi ? 'पूर्ण' : 'Finish') : (isHindi ? 'आगे' : 'Next')}</span>
                  {isLast ? <Check size={13} /> : <ChevronRight size={13} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return typeof document !== 'undefined' ? createPortal(tourContent, document.body) : tourContent;
}

export function rerunGuidedTour() {
  window.dispatchEvent(new CustomEvent(TOUR_EVENT));
}
