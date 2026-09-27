import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, X, Sparkles, Smartphone, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePWA } from '../hooks/usePWA';
import { playClick } from '../utils/soundFx';

export default function PWAInstallBanner() {
  const { t } = useTranslation();
  const location = useLocation();
  const { isInstallable, isInstalled, promptInstall } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isRemovedByScroll, setIsRemovedByScroll] = useState(false);

  useEffect(() => {
    try {
      const isDismissed = sessionStorage.getItem('swatva_pwa_banner_dismissed');
      if (isDismissed === 'true') {
        setDismissed(true);
      }
    } catch {}
  }, []);

  // Automatically fade out and remove when user starts scrolling on landing page
  useEffect(() => {
    if (location.pathname !== '/' || isRemovedByScroll || dismissed) return;

    let timeoutId = null;

    const handleScroll = () => {
      const scrollPos = typeof window !== 'undefined' ? window.scrollY || document.documentElement.scrollTop : 0;
      if (scrollPos > 25) {
        setIsFadingOut(true);
        if (!timeoutId) {
          timeoutId = setTimeout(() => {
            setIsRemovedByScroll(true);
          }, 550); // Wait for fade-out animation to complete
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Also listen to Lenis smooth-scroll instance if active
    if (window.lenis && typeof window.lenis.on === 'function') {
      window.lenis.on('scroll', handleScroll);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (window.lenis && typeof window.lenis.off === 'function') {
        window.lenis.off('scroll', handleScroll);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [location.pathname, isRemovedByScroll, dismissed]);

  if (!isInstallable || isInstalled || dismissed || isRemovedByScroll) {
    return null;
  }

  const handleInstall = async () => {
    playClick();
    setInstalling(true);
    const res = await promptInstall();
    setInstalling(false);
    if (res?.outcome === 'accepted') {
      setInstalledSuccess(true);
      setTimeout(() => {
        setDismissed(true);
      }, 3000);
    }
  };

  const handleDismiss = () => {
    playClick();
    setIsFadingOut(true);
    setTimeout(() => {
      setDismissed(true);
    }, 400);
    try {
      sessionStorage.setItem('swatva_pwa_banner_dismissed', 'true');
    } catch {}
  };

  return (
    <div
      className={`fixed bottom-20 lg:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isFadingOut
          ? 'opacity-0 translate-y-6 scale-95 pointer-events-none'
          : 'opacity-100 translate-y-0 scale-100 pointer-events-auto animate-in fade-in slide-in-from-bottom-5'
      }`}
    >
      <div className="neo-glass-card p-3.5 sm:p-4 rounded-2xl border border-amber-500/30 dark:border-amber-500/20 shadow-2xl backdrop-blur-xl bg-white/90 dark:bg-neutral-900/90 flex items-center justify-between gap-3 relative overflow-hidden">
        {/* Amber accent subtle aura */}
        <div className="absolute -left-6 -top-6 w-24 h-24 bg-amber-500/15 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-neutral-950 dark:bg-black border border-amber-500/40 flex items-center justify-center flex-shrink-0 shadow-sm relative overflow-hidden">
            <img src="/pwa-64x64.png" alt="SWATVA Logo" className="w-7 h-7 object-contain" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-neutral-950 dark:text-white tracking-tight">
                {t('pwa.installTitle', 'Install SWATVA App')}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
              {t('pwa.installDesc', 'Instant access, offline rules & verified schemes on your device.')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing || installedSuccess}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 text-neutral-950 hover:bg-amber-400 transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
          >
            {installedSuccess ? (
              <>
                <Check size={13} className="stroke-[2.5]" />
                <span>{t('pwa.installed', 'Installed')}</span>
              </>
            ) : installing ? (
              <span>{t('pwa.installing', 'Installing...')}</span>
            ) : (
              <>
                <Download size={13} className="stroke-[2.5]" />
                <span>{t('pwa.installAction', 'Install')}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer"
            aria-label={t('common.dismiss', 'Dismiss')}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
