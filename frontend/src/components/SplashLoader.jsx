import React, { useState, useEffect } from 'react';
import LoadingLogo from './LoadingLogo';

// In-memory flag that resets on every page load/reload,
// but stays true during client-side SPA navigation
export let isInitialSplashFinished = false;

export default function SplashLoader() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    const hasVisited = typeof window !== 'undefined' && sessionStorage.getItem('swatva_has_visited');
    const returning = Boolean(hasVisited);
    setIsReturning(returning);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('swatva_has_visited', 'true');
    }

    // Returning user: fast (850ms) yet silky smooth
    // First-time visit: majestic standard (1600ms)
    const drawDuration = returning ? 850 : 1600;
    const fadeDuration = returning ? 450 : 550;

    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true);
      isInitialSplashFinished = true;
    }, drawDuration);

    const unmountTimer = setTimeout(() => {
      setIsVisible(false);
    }, drawDuration + fadeDuration);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-porcelain/95 dark:bg-obsidian/95 backdrop-blur-xl transition-all ${
        isReturning ? 'duration-500' : 'duration-600'
      } ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isFadingOut 
          ? 'opacity-0 scale-[1.02] pointer-events-none' 
          : 'opacity-100 scale-100'
      }`}
    >
      <div className="relative flex flex-col items-center">
        {/* Subtle radial amber aura in dark mode for luxury depth */}
        <span
          aria-hidden="true"
          className="absolute inset-0 -m-8 rounded-full bg-amber-500/15 blur-2xl dark:block hidden pointer-events-none"
        />

        <LoadingLogo 
          size="h-32 w-32 sm:h-40 sm:w-40" 
          animate={true} 
          loop={false} 
          duration={isReturning ? 0.85 : 1.6} 
          hoverable={false} 
        />
        <div 
          className="mt-6 text-xs sm:text-sm font-bold tracking-[0.25em] uppercase text-neutral-900/80 dark:text-white/80 transition-all duration-500"
          style={{ 
            opacity: isFadingOut ? 0 : 1,
            transform: isFadingOut ? 'translateY(6px)' : 'translateY(0)'
          }}
        >
          SWATVA
        </div>
      </div>
    </div>
  );
}
