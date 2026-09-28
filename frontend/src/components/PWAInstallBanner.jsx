import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePWA } from '../hooks/usePWA';
import { playClick } from '../utils/soundFx';

const AUTO_DISMISS_MS = 7500; // Automatically fade away after 7.5 seconds

export default function PWAInstallBanner() {
  const { t } = useTranslation();
  const location = useLocation();
  const { isInstallable, isInstalled, promptInstall } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [scrolledAway, setScrolledAway] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef(null);

  const isExcludedRoute =
    location.pathname.startsWith('/app') ||
    location.pathname === '/login' ||
    location.pathname === '/register';

  useEffect(() => {
    try {
      const isDismissed = sessionStorage.getItem('swatva_pwa_banner_dismissed');
      if (isDismissed === 'true') {
        setDismissed(true);
      }
    } catch {}
  }, []);

  // Automatically fade out and dismiss after a few seconds unless hovered
  useEffect(() => {
    const isVisible = !isExcludedRoute && isInstallable && !isInstalled && !dismissed && !scrolledAway;
    if (!isVisible || isHovered || installing || installedSuccess) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    timerRef.current = setTimeout(() => {
      setDismissed(true);
    }, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isInstallable, isInstalled, dismissed, scrolledAway, isHovered, installing, installedSuccess]);

  // Automatically fade out when user scrolls down
  useEffect(() => {
    if (location.pathname !== '/' || dismissed || scrolledAway) return;

    const handleScroll = () => {
      const scrollPos = typeof window !== 'undefined' ? window.scrollY || document.documentElement.scrollTop : 0;
      if (scrollPos > 30) {
        setScrolledAway(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    if (window.lenis && typeof window.lenis.on === 'function') {
      window.lenis.on('scroll', handleScroll);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (window.lenis && typeof window.lenis.off === 'function') {
        window.lenis.off('scroll', handleScroll);
      }
    };
  }, [location.pathname, dismissed, scrolledAway]);

  if (isExcludedRoute) return null;

  const isVisible = isInstallable && !isInstalled && !dismissed && !scrolledAway;

  const handleInstall = async () => {
    playClick();
    setInstalling(true);
    const res = await promptInstall();
    setInstalling(false);
    if (res?.outcome === 'accepted') {
      setInstalledSuccess(true);
      setTimeout(() => {
        setDismissed(true);
      }, 2500);
    }
  };

  const handleDismiss = () => {
    playClick();
    setDismissed(true);
    try {
      sessionStorage.setItem('swatva_pwa_banner_dismissed', 'true');
    } catch {}
  };

  return (
    <div
      aria-hidden={!isVisible}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed bottom-20 lg:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto visible'
          : 'opacity-0 translate-y-6 scale-95 pointer-events-none invisible'
      }`}
    >
      <div className="neo-glass-card p-3 sm:p-3.5 rounded-2xl border border-neutral-200/80 dark:border-white/15 shadow-2xl backdrop-blur-xl bg-white/95 dark:bg-[#151618]/95 flex items-center justify-between gap-3 relative overflow-hidden">
        {/* Subtle amber aura accent */}
        <div className="absolute -left-6 -top-6 w-24 h-24 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-white/10 border border-neutral-200/80 dark:border-white/15 flex items-center justify-center flex-shrink-0 shadow-xs relative overflow-hidden">
            <img src="/pwa-64x64.png" alt="SWATVA Logo" className="w-6 h-6 object-contain" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-950 dark:text-white tracking-tight">
                {t('pwa.installTitle', 'Install SWATVA App')}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider rounded-md bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-neutral-200 border border-neutral-200/80 dark:border-white/10">
                PWA
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
              {t('pwa.installDesc', 'Instant access, offline rules & verified schemes on your device.')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing || installedSuccess || !isVisible}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
          >
            {installedSuccess ? (
              <>
                <Check size={12} className="stroke-[2.5]" />
                <span>{t('pwa.installed', 'Installed')}</span>
              </>
            ) : installing ? (
              <span>{t('pwa.installing', 'Installing...')}</span>
            ) : (
              <>
                <Download size={12} className="stroke-[2.5]" />
                <span>{t('pwa.installAction', 'Install')}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            disabled={!isVisible}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label={t('common.dismiss', 'Dismiss')}
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
