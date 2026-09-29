import React, { useState } from 'react';
import { WifiOff, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePWA } from '../hooks/usePWA';

export default function OfflineBanner() {
  const { t } = useTranslation();
  const { isOffline } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  // If user is online or dismissed for this offline session, don't show
  if (!isOffline || dismissed) return null;

  return (
    <aside
      aria-label="Offline status notification"
      role="status"
      className="fixed bottom-16 lg:bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom duration-300 pointer-events-auto"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-amber-500/95 dark:bg-amber-600/95 text-neutral-950 backdrop-blur-md shadow-xl shadow-black/10 border border-amber-600/20">
        <div className="flex items-center gap-3 min-w-0">
          <span className="p-1.5 rounded-xl bg-neutral-950/10 flex-shrink-0">
            <WifiOff size={16} className="text-neutral-950" />
          </span>
          <div className="min-w-0 text-left">
            <p className="text-xs font-bold leading-tight text-neutral-950">
              {t('pwa.offlineTitle', 'Offline Mode Active')}
            </p>
            <p className="text-[11px] font-medium leading-tight text-neutral-900/90 mt-0.5">
              {t('pwa.offlineNotice', 'You are currently offline. SWATVA is serving cached benefit rules and saved records.')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={t('common.dismiss', 'Dismiss')}
          className="p-1 rounded-lg hover:bg-neutral-950/10 text-neutral-900 transition-colors flex-shrink-0 cursor-pointer"
        >
          <X size={14} className="stroke-[2.2]" />
        </button>
      </div>
    </aside>
  );
}
