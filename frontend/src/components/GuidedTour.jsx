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
  LayoutDashboard
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playClick } from '../utils/soundFx';

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

export default function GuidedTour() {
  const { i18n } = useTranslation();
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

  useEffect(() => {
    const handleStartTour = () => {
      setCurrentStep(0);
      setIsOpen(true);
      playClick();
    };

    window.addEventListener('swatva-start-tour', handleStartTour);
    return () => window.removeEventListener('swatva-start-tour', handleStartTour);
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

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const IconComp = step.icon;
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  // Calculate popover positioning relative to highlighted element
  let popoverTop = 100;
  let popoverLeft = 20;

  if (targetRect) {
    // If element is in upper half of viewport, place tooltip below; else place above
    if (targetRect.bottom + 260 < window.innerHeight) {
      popoverTop = targetRect.bottom + 16;
    } else {
      popoverTop = Math.max(16, targetRect.top - 250);
    }

    // Align horizontally with padding protection
    const idealLeft = targetRect.left + targetRect.width / 2 - 160;
    popoverLeft = Math.max(16, Math.min(idealLeft, window.innerWidth - 336));
  } else {
    // Fallback centered
    popoverTop = Math.max(40, window.innerHeight / 2 - 130);
    popoverLeft = Math.max(16, window.innerWidth / 2 - 160);
  }

  const tourOverlay = (
    <div className="fixed inset-0 z-[999999] pointer-events-auto">
      {/* 1. Backdrop Spotlight with SVG Cutout */}
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

      {/* 2. Floating Step Card */}
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
            aria-label="Skip tour"
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
  );

  return typeof document !== 'undefined' ? createPortal(tourOverlay, document.body) : tourOverlay;
}
