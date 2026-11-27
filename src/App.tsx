import React, { useEffect, useMemo, useState } from 'react';
import { Settings } from 'lucide-react';
import { CompassDial } from './components/CompassDial';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SettingsPage } from './components/SettingsPage';
import { TelemetryGrid } from './components/TelemetryGrid';
import { useCompassSensor } from './hooks/useCompassSensor';
import { useGeolocationTelemetry } from './hooks/useGeolocationTelemetry';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  type CoordFormat,
  type ElevationUnit,
  type SpeedUnit,
  normalizeAngle,
  unwrapCompassAngle,
} from './utils/navigationMath';

const PREFS_KEY = 'wayfinder_prefs_v1';

interface StoredPrefs {
  theme: 'dark' | 'light';
  coordFormat: CoordFormat;
  elevationUnit: ElevationUnit;
  speedUnit: SpeedUnit;
  northMode: 'true' | 'magnetic';
  declinationDeg: number;
}

const DEFAULT_PREFS: StoredPrefs = {
  theme: 'dark',
  coordFormat: 'DD',
  elevationUnit: 'm',
  speedUnit: 'km/h',
  northMode: 'true',
  declinationDeg: 0,
};

function loadPrefs(): StoredPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export default function App() {
  const [page, setPage] = useState<'compass' | 'settings'>('compass');
  const [prefs, setPrefs] = useState<StoredPrefs>(() => loadPrefs());
  const [lockedBearing, setLockedBearing] = useState<number | null>(null);
  const [manualHeading, setManualHeading] = useState<number>(0);
  const [manualSmoothHeading, setManualSmoothHeading] = useState<number>(0);

  const compass = useCompassSensor();
  const gps = useGeolocationTelemetry();
  const { isOnline, offlineReady } = useOnlineStatus();

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', prefs.theme === 'dark' ? '#090C10' : '#F8FAFC');
    }
  }, [prefs.theme]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage errors
    }
  }, [prefs]);

  const declinationOffset = prefs.northMode === 'true' ? prefs.declinationDeg : 0;

  const displayHeading = useMemo(() => {
    if (compass.hasLiveSignal && compass.magneticHeading !== null) {
      return normalizeAngle(compass.magneticHeading + declinationOffset);
    }
    if (gps.telemetry.gpsHeading !== null && (gps.telemetry.speedMs ?? 0) > 0.8) {
      return normalizeAngle(gps.telemetry.gpsHeading);
    }
    return normalizeAngle(manualHeading);
  }, [
    compass.hasLiveSignal,
    compass.magneticHeading,
    declinationOffset,
    gps.telemetry.gpsHeading,
    gps.telemetry.speedMs,
    manualHeading,
  ]);

  const smoothDisplayHeading = useMemo(() => {
    if (compass.hasLiveSignal) {
      return compass.smoothHeading + declinationOffset;
    }
    return manualSmoothHeading;
  }, [compass.hasLiveSignal, compass.smoothHeading, declinationOffset, manualSmoothHeading]);

  const handleManualHeadingChange = (deg: number) => {
    const next = normalizeAngle(deg);
    setManualHeading(next);
    setManualSmoothHeading((prev) => unwrapCompassAngle(prev, next));
  };

  const handleToggleBearingLock = () => {
    if (lockedBearing !== null) {
      setLockedBearing(null);
    } else {
      setLockedBearing(Math.round(displayHeading));
    }
  };

  return (
    <div
      className={`${
        page === 'compass' ? 'h-dvh overflow-hidden' : 'min-h-dvh'
      } flex flex-col bg-slate-50 text-slate-900 dark:bg-[#090C10] dark:text-slate-100 transition-colors`}
    >
      {/* Compact Three-Zone Top Bar */}
      <header className="shrink-0 border-b border-slate-200 dark:border-slate-800/90 bg-white/95 dark:bg-[#090C10]/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 h-12 flex items-center justify-between gap-4 sm:gap-8">
          <button
            type="button"
            onClick={() => setPage('compass')}
            className="inline-flex items-center gap-2.5 font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0"
          >
            <img
              src="/classic-dial-logo.png"
              alt=""
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-md shrink-0 object-cover"
            />
            <span>Compass</span>
          </button>

          <nav
            aria-label="Primary pages"
            className="flex items-center gap-5 text-sm font-medium"
          >
            <button
              type="button"
              onClick={() => setPage('compass')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                page === 'compass'
                  ? 'text-orange-600 dark:text-orange-500 underline underline-offset-4'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Compass
            </button>
            <button
              type="button"
              onClick={() => setPage('settings')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                page === 'settings'
                  ? 'text-orange-600 dark:text-orange-500 underline underline-offset-4'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Settings
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <PWAInstallButton
              fallbackAction={
                <button
                  type="button"
                  onClick={() => setPage(page === 'compass' ? 'settings' : 'compass')}
                  aria-label={page === 'compass' ? 'Open settings' : 'Return to compass'}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 min-h-[36px]"
                >
                  <Settings className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {page === 'compass' ? 'Configure' : 'Done'}
                  </span>
                </button>
              }
            />
          </div>
        </div>
      </header>

      {/* Active Page */}
      {page === 'compass' ? (
        <main className="flex-1 min-h-0 max-w-6xl w-full mx-auto px-3 py-2.5 sm:px-6 sm:py-5 lg:px-8 flex flex-col lg:grid lg:grid-cols-12 gap-2.5 sm:gap-5 lg:items-center">
          <div className="flex-1 min-h-0 flex flex-col lg:col-span-6 lg:h-full lg:max-h-[560px]">
            <CompassDial
              heading={displayHeading}
              smoothHeading={smoothDisplayHeading}
              pitch={compass.pitch}
              roll={compass.roll}
              northMode={prefs.northMode}
              targetBearing={lockedBearing}
              hasLiveSignal={compass.hasLiveSignal}
              sensorSource={compass.sensorSource}
              permissionState={compass.permissionState}
              gpsActive={gps.status === 'active'}
              isCachedFix={gps.telemetry.isCachedFix}
              isOnline={isOnline}
              onRequestPermission={compass.requestPermission}
              onToggleBearingLock={handleToggleBearingLock}
              onSetTargetBearing={setLockedBearing}
              onManualHeadingChange={handleManualHeadingChange}
            />
          </div>

          <div className="shrink-0 lg:col-span-6">
            <TelemetryGrid
              telemetry={gps.telemetry}
              status={gps.status}
              errorMessage={gps.errorMessage}
              sessionStats={gps.sessionStats}
              coordFormat={prefs.coordFormat}
              elevationUnit={prefs.elevationUnit}
              speedUnit={prefs.speedUnit}
              onRetryGps={gps.retryGps}
            />
          </div>
        </main>
      ) : (
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <SettingsPage
            coordFormat={prefs.coordFormat}
            onCoordFormatChange={(coordFormat) =>
              setPrefs((p) => ({ ...p, coordFormat }))
            }
            elevationUnit={prefs.elevationUnit}
            onElevationUnitChange={(elevationUnit) =>
              setPrefs((p) => ({ ...p, elevationUnit }))
            }
            speedUnit={prefs.speedUnit}
            onSpeedUnitChange={(speedUnit) =>
              setPrefs((p) => ({ ...p, speedUnit }))
            }
            northMode={prefs.northMode}
            onNorthModeChange={(northMode) =>
              setPrefs((p) => ({ ...p, northMode }))
            }
            declinationDeg={prefs.declinationDeg}
            onDeclinationChange={(declinationDeg) =>
              setPrefs((p) => ({ ...p, declinationDeg }))
            }
            theme={prefs.theme}
            onThemeChange={(theme) => setPrefs((p) => ({ ...p, theme }))}
            offlineReady={offlineReady}
            isOnline={isOnline}
            hasLiveMagnetometer={compass.hasLiveSignal}
            manualHeading={manualHeading}
            onManualHeadingChange={handleManualHeadingChange}
            gpsStatus={gps.status}
            gpsErrorMessage={gps.errorMessage}
            onRetryGps={gps.retryGps}
            onResetSessionStats={gps.resetSessionStats}
            onBackToCompass={() => setPage('compass')}
          />
        </main>
      )}
    </div>
  );
}
