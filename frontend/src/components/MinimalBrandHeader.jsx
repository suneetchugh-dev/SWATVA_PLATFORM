import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LoadingLogo from './LoadingLogo';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../lib/theme';
import { playClick } from '../utils/soundFx';

export default function MinimalBrandHeader({
  onBack,
  backLabel,
  brandLabel,
  // Change this to replay the logo draw. The page passes it on submit so the mark
  // redraws while the auth request is in flight.
  logoKey,
  className = '',
}) {
  const { t, i18n } = useTranslation();
  const isHindi = i18n.language === 'hi' || i18n.language?.startsWith('hi');

  const resolvedBackLabel = backLabel || t('auth.backToHome') || (isHindi ? 'वापस जाएं' : 'Back to Platform');
  const resolvedBrandLabel = brandLabel || t('common.appName') || (isHindi ? 'स्वतवा' : 'SWATVA');
  const shortBackLabel = isHindi ? 'वापस' : 'Back';

  const handleBack = () => {
    playClick();
    if (onBack) onBack();
  };

  const { dark, toggle } = useTheme();

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-3.5 sm:px-8 md:px-12 py-3 sm:py-3.5 border-b border-neutral-200/60 dark:border-white/5 bg-white/80 dark:bg-[#080808]/80 backdrop-blur-xl transition-all pt-[max(0.75rem,env(safe-area-inset-top))] ${className}`}
    >
      <div className="flex items-center z-10 min-w-0">
        <button
          type="button"
          onClick={handleBack}
          className="my-0.5 ml-0.5 sm:ml-0 px-3.5 sm:px-4 py-1.5 min-h-[38px] sm:min-h-[40px] rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 bg-transparent border border-neutral-300 dark:border-white/20 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-950 hover:text-white hover:border-neutral-950 dark:hover:bg-white dark:hover:text-neutral-950 dark:hover:border-white cursor-pointer shadow-2xs touch-manipulation active:scale-95 flex-shrink-0"
          title={resolvedBackLabel}
          aria-label={resolvedBackLabel}
        >
          <ArrowLeft size={14} className="flex-shrink-0" />
          <span className="hidden sm:inline">{resolvedBackLabel}</span>
          <span className="inline sm:hidden">{shortBackLabel}</span>
        </button>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none z-10">
        <button
          type="button"
          onClick={handleBack}
          className="pointer-events-auto flex items-center justify-center cursor-pointer touch-manipulation group my-0.5"
          title={resolvedBrandLabel}
          aria-label={resolvedBrandLabel}
        >
          <div className="relative h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center flex-shrink-0">
            {/* Amber aura. Visible in both light & dark themes */}
            <span
              aria-hidden="true"
              className="absolute inset-0 -m-1.5 rounded-full bg-amber-500/22 dark:bg-amber-500/30 blur-lg scale-100 pointer-events-none transition-all duration-300 ease-out group-hover:bg-amber-500/40 dark:group-hover:bg-amber-500/60 group-hover:blur-xl group-hover:scale-110"
            />
            <LoadingLogo
              key={logoKey}
              size="h-8 w-8 sm:h-9 sm:w-9"
              animate
              hoverable={true}
            />
          </div>
        </button>
      </div>

      <div className="flex items-center z-10 my-0.5 mr-0.5 sm:mr-0 flex-shrink-0">
        <ThemeToggle darkMode={dark} toggleTheme={toggle} />
      </div>
    </header>
  );
}
