import { useEffect, useState } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [offlineReady, setOfflineReady] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleOfflineReady = () => setOfflineReady(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('wayfinder:offline-ready', handleOfflineReady);

    // Check if service worker is already controlling this page
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      setOfflineReady(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('wayfinder:offline-ready', handleOfflineReady);
    };
  }, []);

  return { isOnline, offlineReady };
}
