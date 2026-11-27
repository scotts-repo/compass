import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  fallbackAction?: React.ReactNode;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ fallbackAction }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return <>{fallbackAction ?? null}</>;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 min-h-[40px]"
      >
        <Download className="w-4 h-4" aria-hidden="true" />
        Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 min-h-[40px]"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Install on iOS
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11161E] p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={`${import.meta.env.BASE_URL}classic-dial-logo.png`}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-lg shrink-0 object-cover"
                  />
                  <h3
                    id="ios-install-title"
                    className="text-lg font-semibold text-slate-900 dark:text-slate-100"
                  >
                    Install Compass Offline
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install instructions"
                  className="p-2 -m-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ol className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-semibold text-orange-600 dark:text-orange-400">
                    01
                  </span>
                  <span>
                    Tap the <strong className="text-slate-900 dark:text-white inline-flex items-center gap-1">Share <Share className="w-3.5 h-3.5" /></strong> button in Safari.
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-semibold text-orange-600 dark:text-orange-400">
                    02
                  </span>
                  <span>
                    Scroll down and tap <strong className="text-slate-900 dark:text-white">Add to Home Screen</strong>.
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-semibold text-orange-600 dark:text-orange-400">
                    03
                  </span>
                  <span>Launch Compass anytime without cellular service.</span>
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-lg bg-slate-900 dark:bg-slate-100 py-2.5 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90 transition-opacity min-h-[44px]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return <>{fallbackAction ?? null}</>;
};
