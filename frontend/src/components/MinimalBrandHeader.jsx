import React from 'react';
import { ArrowLeft } from 'lucide-react';
import LoadingLogo from './LoadingLogo';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../lib/theme';
import { playClick } from '../utils/soundFx';

export default function MinimalBrandHeader({
  onBack,
  backLabel = 'Back to Platform',
  brandLabel = 'SWATVA',
  // Change this to replay the logo draw. The page passes it on submit so the mark
  // redraws while the auth request is in flight.
  logoKey,
  className = '',
}) {
  const handleBack = () => {
    playClick();
    if (onBack) onBack();
  };

  const { dark, toggle } = useTheme();

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 sm:px-12 py-3 sm:py-4 border-b border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-[#080808]/70 backdrop-blur-xl transition-all pt-[env(safe-area-inset-top)] ${className}`}
    >
      <button
        type="button"
        onClick={handleBack}
        className="px-3 sm:px-4 py-1.5 min-h-9 sm:min-h-10 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 bg-transparent border border-neutral-300 dark:border-white/20 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-950 hover:text-white hover:border-neutral-950 dark:hover:bg-white dark:hover:text-neutral-950 dark:hover:border-white cursor-pointer shadow-2xs touch-manipulation"
        title={backLabel}
        aria-label={backLabel}
      >
        <ArrowLeft size={14} className="flex-shrink-0" />
        <span className="hidden sm:inline">{backLabel}</span>
        <span className="inline sm:hidden">Back</span>
      </button>

      <button
        type="button"
        onClick={handleBack}
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center cursor-pointer touch-manipulation group"
        title={brandLabel}
        aria-label={brandLabel}
      >
        <div className="relative h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center flex-shrink-0">
          {/* Amber aura. Dark mode carries it at rest — the mark is the only
              light source on a near-black header, so a constant soft bloom
              reads as intentional rather than as a hover-only flourish. Hover
              then deepens it and widens the bloom instead of switching it on,
              which is the difference between "responds to me" and "flickers".
              Light mode keeps it off: on a white header the same blur just
              looks like a smudge. */}
          <span
            aria-hidden="true"
            className="absolute inset-0 -m-1.5 rounded-full bg-amber-500/25 blur-lg scale-100 hidden dark:block pointer-events-none transition-all duration-300 ease-out group-hover:bg-amber-500/50 group-hover:blur-xl group-hover:scale-110"
          />
          <LoadingLogo
            key={logoKey}
            size="h-8 w-8 sm:h-9 sm:w-9"
            animate
            hoverable={true}
          />
        </div>
      </button>

      {/* Theme control, mirroring the back button on the left. This is a plain
          light/dark control, not the language picker: language lives in
          SettingsPanel on the dashboard, and auth is public so it cannot assume
          an authenticated shell. */}
      <ThemeToggle darkMode={dark} toggleTheme={toggle} />
    </header>
  );
}
