import React, { useState, useEffect } from 'react';
import LoadingLogo from './LoadingLogo';

// In-memory flag that resets on every page load/reload,
// but stays true during client-side SPA navigation
export let isInitialSplashFinished = false;

export default function SplashLoader() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // 1.0s draw, then start smooth fade out
    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true);
      isInitialSplashFinished = true;
    }, 1000);

    // Completely unmount after fade transition finishes (500ms fade)
    const unmountTimer = setTimeout(() => {
      setIsVisible(false);
    }, 1500);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-porcelain dark:bg-obsidian transition-opacity duration-500 ease-in-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative flex flex-col items-center">
        {/* Crisp vector logo that draws quickly */}
        <LoadingLogo size="h-32 w-32 sm:h-40 sm:w-40" animate={true} loop={false} duration={1} hoverable={false} />
        <div 
          className="mt-6 text-sm font-bold tracking-widest uppercase text-neutral-950 dark:text-white transition-opacity duration-500 delay-500"
          style={{ opacity: isFadingOut ? 0 : 1 }}
        >
          Swatva AI
        </div>
      </div>
    </div>
  );
}
