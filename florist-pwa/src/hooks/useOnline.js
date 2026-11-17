import { useState, useEffect } from 'react';

/**
 * Custom hook untuk mendeteksi status koneksi internet perangkat secara real-time
 * serta menyimpan event `beforeinstallprompt` untuk instalasi PWA (PWA-06).
 */
let deferredInstallPrompt = null;
const promptListeners = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    promptListeners.forEach((cb) => cb(deferredInstallPrompt));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    promptListeners.forEach((cb) => cb(null));
  });
}

export function useOnline() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [installPrompt, setInstallPrompt] = useState(deferredInstallPrompt);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    promptListeners.add(setInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      promptListeners.delete(setInstallPrompt);
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferredInstallPrompt) return false;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      deferredInstallPrompt = null;
      promptListeners.forEach((cb) => cb(null));
      return true;
    }
    return false;
  };

  return {
    isOnline,
    canInstall: Boolean(installPrompt),
    triggerInstall,
  };
}
