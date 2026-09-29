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
  UserCog,
  ShieldCheck,
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  Sparkles,
  LayoutDashboard,
  CheckCircle2,
  ArrowRight,
  Route,
  SunMoon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playClick } from '../utils/soundFx';
import LoadingLogo from './LoadingLogo';

const SEEN_KEY = 'swatva_tour_seen_v1';
const TOUR_EVENT = 'swatva-start-tour';
const PAGE_TOUR_EVENT = 'swatva-start-page-tour';

export const GLOBAL_TOUR_STEPS = [
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
    id: 'theme-toggle',
    target: '[data-tour="theme-toggle"], [data-tour="theme-preference"], [data-tour="profile"]',
    icon: SunMoon,
    titleEn: 'Theme & Visual Mode',
    titleHi: 'थीम एवं दृश्य मोड',
    descEn: 'Seamlessly toggle between High-Contrast Dark Mode and Clean Light Mode for optimal reading comfort in any lighting.',
    descHi: 'किसी भी रोशनी में आरामदायक अनुभव के लिए डार्क मोड और लाइट मोड के बीच तुरंत स्विच करें।'
  },
  {
    id: 'profile',
    target: '[data-tour="profile"]',
    icon: User,
    titleEn: 'Citizen Profile & Account',
    titleHi: 'नागरिक प्रोफ़ाइल एवं सेटिंग्स',
    descEn: 'Manage personal details, language & audio settings, or view Team TheQuirkies.',
    descHi: 'अपनी प्रोफ़ाइल जानकारी प्रबंधित करें, भाषा व ऑडियो प्राथमिकताओं को अनुकूलित करें।'
  }
];

export const PAGE_TOUR_CONFIGS = {
  dashboard: [
    {
      id: 'dashboard-missed',
      target: '[data-tour="dashboard-missed-value"]',
      icon: Scale,
      titleEn: 'Unclaimed Value on the Table',
      titleHi: 'अनुपलब्ध सरकारी लाभ राशि',
      descEn: 'Calculates the total estimated annual value across all verified schemes you qualify for but have not claimed.',
      descHi: 'उन सभी सरकारी योजनाओं के वार्षिक लाभ का कुल योग जिन्हें आप ले सकते हैं।'
    },
    {
      id: 'dashboard-tiles',
      target: '[data-tour="dashboard-tiles"]',
      icon: LayoutDashboard,
      titleEn: 'Eligibility Summary Matrix',
      titleHi: 'पात्रता सारांश मैट्रिक्स',
      descEn: 'High-level breakdown of all evaluated schemes categorized by Eligible, Needs Information, and Active applications.',
      descHi: 'पात्र, अधूरी जानकारी व सक्रिय आवेदनों के अनुसार विभाजित योजनाएं देखें।'
    }
  ],
  discover: [
    {
      id: 'discover-input',
      target: '[data-tour="discover-input"]',
      icon: Search,
      titleEn: 'Natural Language Situation Intake',
      titleHi: 'बोलचाल भाषा में स्थिति विवरण',
      descEn: 'Type what you are going through in plain language or Hindi. SWATVA maps your narrative to statutory scheme criteria.',
      descHi: 'अपनी या परिवार की स्थिति साधारण भाषा में लिखें। स्वत्व नियमों के अनुसार सही योजनाएं खोजेगा।'
    },
    {
      id: 'discover-examples',
      target: '[data-tour="discover-examples"]',
      icon: Sparkles,
      titleEn: 'Quick One-Tap Starters',
      titleHi: 'त्वरित शुरुआत के उदाहरण',
      descEn: 'Click any example scenario to test the life-event NLP extraction pipeline instantly.',
      descHi: 'जीवन-घटना आधारित खोज की त्वरित जांच के लिए किसी भी उदाहरण पर क्लिक करें।'
    }
  ],
  matches: [
    {
      id: 'matches-tabs',
      target: '[data-tour="matches-tabs"]',
      icon: Scale,
      titleEn: 'Status Filtering Controls',
      titleHi: 'पात्रता स्थिति फिल्टर',
      descEn: 'Filter between Eligible schemes, those needing minor profile updates, and in-progress applications.',
      descHi: 'पात्र योजनाओं और जिनमे अतिरिक्त जानकारी चाहिए, उनके बीच आसानी से फिल्टर करें।'
    },
    {
      id: 'matches-cards',
      target: '[data-tour="matches-cards"]',
      icon: CheckCircle2,
      titleEn: 'Deterministic Verdict Cards',
      titleHi: 'सत्यापित योजना कार्ड',
      descEn: 'Each card displays match percentages, required documents, and citations directly to the official government gazette.',
      descHi: 'प्रत्येक कार्ड पात्रता प्रतिशत, आवश्यक दस्तावेज़ और आधिकारिक सरकारी पोर्टल लिंक दर्शाता है।'
    }
  ],
  documents: [
    {
      id: 'documents-tabs',
      target: '[data-tour="documents-tabs"]',
      icon: FileStack,
      titleEn: 'Locker & Upload Switcher',
      titleHi: 'लॉकर व नया दस्तावेज़ जोड़ें',
      descEn: 'Switch seamlessly between your verified document locker and uploading new credentials.',
      descHi: 'सत्यापित दस्तावेज़ देखने और नया दस्तावेज़ अपलोड करने के बीच टॉगल करें।'
    },
    {
      id: 'documents-grid',
      target: '[data-tour="documents-grid"]',
      icon: Check,
      titleEn: 'Client-Side OCR & Verification',
      titleHi: 'दस्तावेज़ ओसीआर व सत्यापन',
      descEn: 'Inspect extracted document credentials, expiration dates, and review verification notices.',
      descHi: 'निकाले गए विवरण, वैधता तिथि और सत्यापन स्थिति की जांच करें।'
    }
  ],
  assistant: [
    {
      id: 'assistant-chat',
      target: '[data-tour="assistant-chat"]',
      icon: MessageSquare,
      titleEn: 'Vernacular Scheme Consultation',
      titleHi: 'क्षेत्रीय भाषा योजना संवाद',
      descEn: 'Chat in Hindi or English with cited answers and statutory application readiness scores.',
      descHi: 'पात्रता शर्तों और आवश्यक कागजात पर अपनी पसंदीदा भाषा में बातचीत करें।'
    },
    {
      id: 'assistant-input',
      target: '[data-tour="assistant-input"]',
      icon: Sparkles,
      titleEn: 'Voice Dictation & Smart Input',
      titleHi: 'आवाज़ से बोलें (माइक) व संवाद',
      descEn: 'Speak directly into your microphone or type queries to receive immediate verified guidance.',
      descHi: 'माइक पर बोलकर या लिखकर योजनाओं के बारे में तुरंत जानकारी प्राप्त करें।'
    },
    {
      id: 'assistant-actions',
      target: '[data-tour="assistant-actions"]',
      icon: Compass,
      titleEn: 'Export & Consultation History',
      titleHi: 'इतिहास व निर्यात',
      descEn: 'Export complete consultation records to Markdown or browse past dialogues.',
      descHi: 'पूरी बातचीत को डाउनलोड करें या पिछली चर्चाओं को पुनः देखें।'
    }
  ],
  profile: [
    {
      id: 'profile-stepper',
      target: '[data-tour="profile-stepper"]',
      icon: UserCog,
      titleEn: '4-Stage Profile Progression',
      titleHi: '४-चरणीय प्रोफ़ाइल प्रगति',
      descEn: 'Step-by-step intake covering Demographics, Socio-Economic Status, Vulnerabilities, and Household Members.',
      descHi: 'जनसांख्यिकी, सामाजिक-आर्थिक स्थिति और पारिवारिक सदस्यों का विवरण चरणबद्ध रूप से भरें।'
    },
    {
      id: 'profile-avatar',
      target: '[data-tour="profile-avatar"]',
      icon: User,
      titleEn: 'Avatar & Identity Enclosure',
      titleHi: 'प्रोफ़ाइल चित्र व पहचान',
      descEn: 'Upload and preview your profile picture with instant offline sync across all devices.',
      descHi: 'अपनी प्रोफ़ाइल फ़ोटो अपलोड करें जो आपके सभी डिवाइस पर तुरंत सिंक हो जाएगी।'
    },
    {
      id: 'profile-actions',
      target: '[data-tour="profile-actions"]',
      icon: CheckCircle2,
      titleEn: 'Dynamic Save & Validation',
      titleHi: 'सुरक्षित सहेजें व सत्यापन',
      descEn: 'Save your profile at any step to immediately unlock deterministic scheme matches.',
      descHi: 'किसी भी चरण पर प्रोफ़ाइल सहेजें और तुरंत पात्र योजनाओं की गणना देखें।'
    }
  ],
  transparency: [
    {
      id: 'transparency-form',
      target: '[data-tour="transparency-form"]',
      icon: ShieldCheck,
      titleEn: 'Citizen Grievance & Integrity Intake',
      titleHi: 'नागरिक शिकायत व पारदर्शिता प्रपत्र',
      descEn: 'Submit confidential reports regarding scheme implementation, delays, or integrity concerns.',
      descHi: 'योजना के क्रियान्वयन या भ्रष्टाचार संबंधी गोपनीय शिकायत दर्ज करें।'
    },
    {
      id: 'transparency-stats',
      target: '[data-tour="transparency-stats"]',
      icon: Scale,
      titleEn: 'Public Accountability Analytics',
      titleHi: 'सार्वजनिक जवाबदेही आंकड़े',
      descEn: 'Live statistics on filed, resolved, and verified grievance audits across state departments.',
      descHi: 'विभिन्न सरकारी विभागों में दर्ज और निस्तारित शिकायतों की वास्तविक स्थिति देखें।'
    }
  ],
  benefits: [
    {
      id: 'benefits-summary',
      target: '[data-tour="benefits-summary"]',
      icon: Scale,
      titleEn: 'Unclaimed Financial Summary',
      titleHi: 'अनुपलब्ध वित्तीय लाभ सारांश',
      descEn: 'Accurate computation of total annual financial assistance you are entitled to claim.',
      descHi: 'उन सभी वित्तीय लाभों का कुल वार्षिक हिसाब जो आपको प्राप्त होने चाहिए।'
    },
    {
      id: 'benefits-list',
      target: '[data-tour="benefits-list"]',
      icon: CheckCircle2,
      titleEn: 'Scheme-by-Scheme Value Breakdown',
      titleHi: 'योजनावार लाभ विवरण',
      descEn: 'Detailed financial value, DBT mode, and claim requirements for each scheme.',
      descHi: 'प्रत्येक योजना से मिलने वाली राशि और डीबीटी (DBT) प्रक्रिया की जानकारी।'
    }
  ],
  landing: [
    {
      id: 'landing-brand',
      target: '[data-tour="landing-brand"]',
      icon: Compass,
      titleEn: 'SWATVA Public Infrastructure',
      titleHi: 'स्वत्व सार्वजनिक डिजिटल मंच',
      descEn: 'Decentralized public infrastructure connecting every citizen directly to statutory government schemes with 100% deterministic rules.',
      descHi: 'प्रत्येक नागरिक को 100% सटीक नियमों के साथ सरकारी योजनाओं से सीधे जोड़ने वाला पारदर्शी सार्वजनिक मंच।'
    },
    {
      id: 'landing-search',
      target: '[data-tour="landing-search"]',
      icon: Search,
      titleEn: 'Natural Language Scheme Search',
      titleHi: 'बोलचाल भाषा में योजना खोज',
      descEn: 'Type or speak what you or your family are going through. SWATVA instantly extracts criteria and maps verified schemes. Press Ctrl+K anytime.',
      descHi: 'अपनी या परिवार की स्थिति को सामान्य भाषा में लिखें। स्वत्व तुरंत पात्रता पहचान कर संबंधित योजनाएं सुझाएगा।'
    },
    {
      id: 'landing-how',
      target: '[data-tour="landing-how"]',
      icon: Route,
      titleEn: '3-Step Streamlined Flow',
      titleHi: '३-चरणीय सुगम प्रक्रिया',
      descEn: 'From natural language intake to deterministic rule evaluation and document locker readiness in 3 transparent steps.',
      descHi: 'स्थिति विवरण से लेकर नियम मिलान और दस्तावेज़ लॉकर चेकलिस्ट तक — ३ आसान व पारदर्शी चरणों में।'
    },
    {
      id: 'landing-capabilities',
      target: '[data-tour="landing-capabilities"]',
      icon: Sparkles,
      titleEn: 'Deterministic AI & Rules Suite',
      titleHi: 'एआई एवं नियम इंजन की क्षमताएं',
      descEn: 'Zero hallucinations: 100% deterministic rule matching, client-side OCR verification, and cited vernacular AI advisory.',
      descHi: 'शत-प्रतिशत सटीक नियम मिलान, दस्तावेज़ ओसीआर सत्यापन और क्षेत्रीय भाषा एआई सलाहकार।'
    },
    {
      id: 'landing-coverage',
      target: '[data-tour="landing-coverage"]',
      icon: LayoutDashboard,
      titleEn: 'Verified Schemes Catalogue',
      titleHi: 'सत्यापित योजना संग्रह',
      descEn: 'Explore continuously updated central and state government schemes backed by statutory gazette citations.',
      descHi: 'केंद्र और राज्य सरकार की कल्याणकारी योजनाओं का सत्यापित व निरंतर अद्यतन संग्रह।'
    },
    {
      id: 'landing-preferences',
      target: '[data-tour="landing-preferences"]',
      icon: UserCog,
      titleEn: 'System Preferences & Accessibility',
      titleHi: 'प्राथमिकताएं एवं भाषा सेटिंग्स',
      descEn: 'Switch languages (Hindi / English), toggle dark mode, customize tactile sound feedback, and restart interactive tours.',
      descHi: 'भाषा (हिन्दी / अंग्रेज़ी) बदलें, थीम टॉगल करें, ध्वनि प्रभाव सेट करें और गाइडेड टूर पुनः प्रारंभ करें।'
    },
    {
      id: 'landing-cta',
      target: '[data-tour="landing-cta"]',
      icon: ArrowRight,
      titleEn: 'Citizen Portal & Locker Access',
      titleHi: 'नागरिक पोर्टल एवं लॉकर प्रवेश',
      descEn: 'Access the citizen portal to calculate your unclaimed benefits, manage your document locker, and claim schemes.',
      descHi: 'अपने पात्र लाभों की गणना करने, दस्तावेज़ सुरक्षित रखने और योजनाओं के लिए पोर्टल में प्रवेश करें।'
    }
  ]
};

export const LANDING_TOUR_STEPS = PAGE_TOUR_CONFIGS.landing;

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
        {/* Glow ambient background aura */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/15 dark:bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header Icon + Brand Pill */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/25 dark:border-amber-400/20 text-amber-950 dark:text-amber-200 text-xs font-semibold">
            <LoadingLogo size="h-4 w-4" animate={false} className="flex-shrink-0" />
            <span>{isHindi ? 'प्लेटफ़ॉर्म नेविगेशन गाइड' : 'Platform Navigation Tour'}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              playClick();
              onClose();
            }}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
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
  const [tourSteps, setTourSteps] = useState(GLOBAL_TOUR_STEPS);
  const [targetRect, setTargetRect] = useState(null);
  const isHindi = i18n.language === 'hi';

  const findVisibleTarget = useCallback((selector) => {
    if (typeof document === 'undefined') return null;
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (style.display !== 'none' && style.visibility !== 'hidden' && (rect.width > 0 || rect.height > 0)) {
        return { el, rect };
      }
    }
    return null;
  }, []);

  const updatePosition = useCallback(() => {
    const step = tourSteps[currentStep];
    if (!step) return;
    const match = findVisibleTarget(step.target);
    if (match) {
      const { rect } = match;
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
  }, [currentStep, tourSteps, findVisibleTarget]);

  // Auto-scroll target into view on step change (saves manual effort for touch/mobile users)
  useEffect(() => {
    if (!isOpen) return;
    const step = tourSteps[currentStep];
    if (!step) return;
    const match = findVisibleTarget(step.target);
    if (match && match.el) {
      const isFixed =
        window.getComputedStyle(match.el).position === 'fixed' ||
        Boolean(match.el.closest('.app-bottom-bar')) ||
        Boolean(match.el.closest('header'));
      if (!isFixed) {
        const rect = match.rect;
        const inView = rect.top >= 80 && rect.bottom <= window.innerHeight - 80;
        if (!inView) {
          match.el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          const scrollTimer = window.setTimeout(updatePosition, 300);
          return () => window.clearTimeout(scrollTimer);
        }
      }
    }
  }, [currentStep, isOpen, tourSteps, findVisibleTarget, updatePosition]);

  // First-time login prompt detection (600ms grace period after load)
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      // Only show first-time welcome prompt on /app for logged-in citizens
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/app')) return;
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

  // Listen to manual tour triggers (Global, Landing, or Page-Specific)
  useEffect(() => {
    const handleStartTour = () => {
      const isLanding = typeof window !== 'undefined' && (window.location.pathname === '/' || !window.location.pathname.startsWith('/app'));
      const steps = isLanding ? (PAGE_TOUR_CONFIGS.landing || GLOBAL_TOUR_STEPS) : GLOBAL_TOUR_STEPS;
      setShowPrompt(false);
      setTourSteps(steps);
      setCurrentStep(0);
      setIsOpen(true);
      playClick();
    };

    const handleStartPageTour = (e) => {
      const pageKey = e?.detail?.pageKey;
      const steps = PAGE_TOUR_CONFIGS[pageKey] || GLOBAL_TOUR_STEPS;
      setShowPrompt(false);
      setTourSteps(steps);
      setCurrentStep(0);
      setIsOpen(true);
      playClick();
    };

    window.addEventListener(TOUR_EVENT, handleStartTour);
    window.addEventListener(PAGE_TOUR_EVENT, handleStartPageTour);
    return () => {
      window.removeEventListener(TOUR_EVENT, handleStartTour);
      window.removeEventListener(PAGE_TOUR_EVENT, handleStartPageTour);
    };
  }, []);

  const handlePromptAccept = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem(SEEN_KEY, '1');
    window.setTimeout(() => {
      setTourSteps(GLOBAL_TOUR_STEPS);
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
    const t1 = window.setTimeout(updatePosition, 50);
    const t2 = window.setTimeout(updatePosition, 200);

    const handleResize = () => updatePosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, { passive: true });

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [isOpen, updatePosition, currentStep]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        playClick();
        setIsOpen(false);
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStep < tourSteps.length - 1) {
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
  }, [isOpen, currentStep, tourSteps.length]);

  const step = tourSteps[currentStep];
  const IconComp = step?.icon || Compass;
  const isFirst = currentStep === 0;
  const isLast = currentStep === tourSteps.length - 1;

  // Calculate popover positioning relative to highlighted element
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  let popoverTop = 100;
  let popoverLeft = 20;

  if (targetRect) {
    const cardHeight = isMobile ? 210 : 250;
    const isTargetAtBottom = targetRect.top > window.innerHeight - 170 || targetRect.bottom > window.innerHeight - 90;
    
    if (isTargetAtBottom) {
      // Element is at bottom (e.g. mobile bottom nav bar), place popover cleanly above target
      popoverTop = Math.max(16, targetRect.top - cardHeight - 16);
    } else if (targetRect.bottom + cardHeight + 20 < window.innerHeight) {
      // Element has plenty of room below
      popoverTop = targetRect.bottom + 16;
    } else {
      // Place above target
      popoverTop = Math.max(16, targetRect.top - cardHeight - 16);
    }

    if (isMobile) {
      popoverLeft = Math.max(12, Math.floor((window.innerWidth - Math.min(350, window.innerWidth - 24)) / 2));
    } else {
      const idealLeft = targetRect.left + targetRect.width / 2 - 175;
      popoverLeft = Math.max(16, Math.min(idealLeft, window.innerWidth - 366));
    }
  } else {
    popoverTop = Math.max(40, window.innerHeight / 2 - 130);
    popoverLeft = isMobile ? 12 : Math.max(16, window.innerWidth / 2 - 175);
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
            className="absolute w-[calc(100vw-24px)] max-w-[350px] sm:w-[350px] bg-white/95 dark:bg-[#121216]/95 border border-neutral-200/90 dark:border-white/15 rounded-2xl sm:rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.5)] backdrop-blur-2xl p-5 text-neutral-950 dark:text-white transition-all duration-300 animate-in fade-in zoom-in-95 font-sans"
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
                  {isHindi ? `चरण ${currentStep + 1} / ${tourSteps.length}` : `Step ${currentStep + 1} of ${tourSteps.length}`}
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
              <div className="flex items-center gap-1.5">
                {!isFirst && (
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setCurrentStep((prev) => prev - 1);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-white/20 transition cursor-pointer inline-flex items-center gap-1"
                    title={isHindi ? 'पिछला (बायाँ तीर कुंजी)' : 'Back (Left Arrow)'}
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
                  title={isHindi ? 'अगला (दायाँ तीर कुंजी)' : 'Next (Right Arrow)'}
                >
                  <span>{isLast ? (isHindi ? 'पूर्ण' : 'Finish') : (isHindi ? 'आगे' : 'Next')}</span>
                  {isLast ? <Check size={13} /> : <ChevronRight size={13} />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => { playClick(); setIsOpen(false); }}
                className="text-[11px] font-semibold text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition cursor-pointer"
              >
                {isHindi ? 'दौरा छोड़ें' : 'Skip'}
              </button>
            </div>

            {/* Keyboard shortcut hint — desktop only (hidden on touch/small screens) */}
            <div className="hidden sm:flex items-center justify-center gap-3 mt-3 pt-2.5 border-t border-neutral-100 dark:border-white/5">
              <span className="flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                <kbd className="inline-flex items-center justify-center w-5 h-5 rounded border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] font-mono text-[9px] text-neutral-500 dark:text-neutral-400 shadow-sm">←</kbd>
                <kbd className="inline-flex items-center justify-center w-5 h-5 rounded border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] font-mono text-[9px] text-neutral-500 dark:text-neutral-400 shadow-sm">→</kbd>
                <span className="ml-0.5">{isHindi ? 'नेविगेट करें' : 'navigate'}</span>
              </span>
              <span className="w-px h-3 bg-neutral-200 dark:bg-white/10" aria-hidden="true" />
              <span className="flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                <kbd className="inline-flex items-center justify-center px-1.5 h-5 rounded border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] font-mono text-[9px] text-neutral-500 dark:text-neutral-400 shadow-sm">Esc</kbd>
                <span>{isHindi ? 'छोड़ें' : 'to skip'}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if ((!isOpen && !showPrompt) || !mounted || typeof document === 'undefined') return null;

  return createPortal(tourContent, document.body);
}

export function PageTourButton({ pageKey, className = '' }) {
  const { i18n } = useTranslation();
  const isHindi = i18n.language === 'hi';
  return (
    <button
      type="button"
      onClick={() => {
        playClick();
        window.dispatchEvent(new CustomEvent(PAGE_TOUR_EVENT, { detail: { pageKey } }));
      }}
      className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-neutral-200/90 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] text-neutral-700 dark:text-neutral-200 hover:border-amber-500/40 hover:text-amber-700 dark:hover:text-amber-300 active:scale-95 transition-all duration-200 cursor-pointer select-none shadow-xs ${className}`}
      aria-label={isHindi ? 'पेज गाइड' : 'Page Tour'}
      title={isHindi ? 'पेज गाइड शुरू करें' : 'Start Page Tour Guide'}
    >
      <Compass size={13} className="text-amber-600 dark:text-amber-400 group-hover:rotate-45 transition-transform duration-300 stroke-[2.2]" />
      <span>{isHindi ? 'पेज गाइड' : 'Page Tour'}</span>
    </button>
  );
}

export function rerunGuidedTour() {
  window.dispatchEvent(new CustomEvent(TOUR_EVENT));
}

export function startPageTour(pageKey) {
  window.dispatchEvent(new CustomEvent(PAGE_TOUR_EVENT, { detail: { pageKey } }));
}
