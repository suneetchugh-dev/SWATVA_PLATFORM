import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * usePWA Hook
 * Manages PWA installation prompt, standalone detection, offline status,
 * and service worker lifecycle with background caching & update alerts.
 */
export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(() => {
    if (typeof window !== 'undefined' && window.__deferredPrompt) {
      return window.__deferredPrompt;
    }
    return null;
  });
  const [isInstallable, setIsInstallable] = useState(() => {
    if (typeof window !== 'undefined' && Boolean(window.__deferredPrompt)) {
      return true;
    }
    return false;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? !navigator.onLine : false,
  );
  const [needRefresh, setNeedRefresh] = useState(false);
  const registrationRef = useRef(null);

  // Detect standalone mode (already launched as an installed PWA or TWA)
  const isStandalone =
    typeof window !== 'undefined' &&
    ((typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof window.navigator !== 'undefined' && Boolean(window.navigator?.standalone)) ||
      (typeof document !== 'undefined' && typeof document.referrer === 'string' && document.referrer.includes('android-app://')));

  // Register and manage service worker updates natively in production
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof navigator === 'undefined' ||
      !('serviceWorker' in navigator) ||
      import.meta.env.DEV
    ) {
      return;
    }

    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        registrationRef.current = reg;

        // If there is already a waiting service worker, prompt update
        if (reg.waiting) {
          setNeedRefresh(true);
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setNeedRefresh(true);
              }
            });
          }
        });

        // Periodic check for SW updates (every 1 hour)
        const intervalId = setInterval(() => {
          reg.update().catch(() => {});
        }, 60 * 60 * 1000);

        return () => clearInterval(intervalId);
      })
      .catch((err) => {
        // Dev mode without build or restricted context
        console.debug('PWA ServiceWorker registration note:', err?.message || err);
      });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const updateServiceWorker = useCallback((reloadPage = true) => {
    const reg = registrationRef.current;
    if (reg && reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    if (reloadPage && typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Capture beforeinstallprompt event for custom install triggers
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      if (typeof window !== 'undefined') window.__deferredPrompt = e;
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // 2. Listen for app installed event
    const handleAppInstalled = () => {
      if (typeof window !== 'undefined') window.__deferredPrompt = null;
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsInstalled(true);
      try {
        localStorage.setItem('swatva_pwa_installed', 'true');
      } catch {}
    };

    // 3. Listen for online/offline events
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check: if standalone, definitely installed
    if (isStandalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isStandalone]);

  // Method to trigger the native installation prompt
  const promptInstall = useCallback(async () => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? window.__deferredPrompt : null);
    if (!promptEvent) {
      return { outcome: 'dismissed', isManual: true };
    }

    try {
      promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') window.__deferredPrompt = null;
      }
      return choiceResult;
    } catch (err) {
      console.warn('PWA install prompt error:', err);
      return { outcome: 'dismissed', error: err };
    }
  }, [deferredPrompt]);

  return {
    isInstallable,
    isInstalled: isInstalled || isStandalone,
    isStandalone,
    isOffline,
    needRefresh,
    setNeedRefresh,
    updateServiceWorker,
    promptInstall,
  };
}

export default usePWA;
