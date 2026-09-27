import React from 'react';
import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePWA } from '../hooks/usePWA';

export default function OfflineBanner() {
  const { t } = useTranslation();
  const { isOffline } = usePWA();

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-neutral-950 text-xs font-semibold py-1 px-4 text-center flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top duration-300">
      <WifiOff size={14} className="flex-shrink-0" />
      <span>{t('pwa.offlineNotice', 'You are currently offline. SWATVA is serving cached benefit rules and offline records.')}</span>
    </div>
  );
}
