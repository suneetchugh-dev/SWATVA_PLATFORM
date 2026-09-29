import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePWA } from '../hooks/usePWA';
import { playClick } from '../utils/soundFx';
import LoadingLogo from './LoadingLogo';

export default function PWAUpdateToast() {
  const { t } = useTranslation();
  const { isStandalone, needRefresh, setNeedRefresh, updateServiceWorker } = usePWA();

  const isLanding = typeof window !== 'undefined' && (window.location.pathname === '/' || window.location.pathname === '' || window.location.pathname === '/index.html');

  // Only show update prompts to users running the installed standalone PWA app outside the landing page
  if (!isStandalone || isLanding || !needRefresh) return null;

  const handleUpdate = () => {
    playClick();
    updateServiceWorker(true);
  };

  const handleClose = () => {
    playClick();
    setNeedRefresh(false);
  };

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300 max-w-sm">
      <div className="neo-glass-card p-3.5 rounded-2xl border border-amber-500/40 shadow-xl backdrop-blur-xl bg-white/95 dark:bg-neutral-900/95 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <LoadingLogo size="h-5 w-5" animate={false} hoverable={false} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-neutral-950 dark:text-white truncate">
              {t('pwa.updateAvailable', 'New Version Available')}
            </h4>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
              {t('pwa.updatePrompt', 'Reload to update SWATVA with the latest rules.')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleUpdate}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:opacity-90 transition-all cursor-pointer inline-flex items-center gap-1"
          >
            <RefreshCw size={11} className="animate-spin" />
            <span>{t('pwa.reload', 'Reload')}</span>
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
            aria-label={t('common.close', 'Close')}
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
