import React from 'react';
import { ArrowLeft, Moon, RefreshCw, RotateCcw, Sun } from 'lucide-react';
import type {
  CoordFormat,
  ElevationUnit,
  SpeedUnit,
} from '../utils/navigationMath';
import type { GeolocationStatus } from '../hooks/useGeolocationTelemetry';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsPageProps {
  coordFormat: CoordFormat;
  onCoordFormatChange: (fmt: CoordFormat) => void;
  elevationUnit: ElevationUnit;
  onElevationUnitChange: (unit: ElevationUnit) => void;
  speedUnit: SpeedUnit;
  onSpeedUnitChange: (unit: SpeedUnit) => void;
  northMode: 'true' | 'magnetic';
  onNorthModeChange: (mode: 'true' | 'magnetic') => void;
  declinationDeg: number;
  onDeclinationChange: (deg: number) => void;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
  offlineReady: boolean;
  isOnline: boolean;
  hasLiveMagnetometer: boolean;
  manualHeading: number;
  onManualHeadingChange: (deg: number) => void;
  gpsStatus: GeolocationStatus;
  gpsErrorMessage: string | null;
  onRetryGps: () => void;
  onResetSessionStats: () => void;
  onBackToCompass: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  coordFormat,
  onCoordFormatChange,
  elevationUnit,
  onElevationUnitChange,
  speedUnit,
  onSpeedUnitChange,
  northMode,
  onNorthModeChange,
  declinationDeg,
  onDeclinationChange,
  theme,
  onThemeChange,
  offlineReady,
  isOnline,
  hasLiveMagnetometer,
  manualHeading,
  onManualHeadingChange,
  gpsStatus,
  gpsErrorMessage,
  onRetryGps,
  onResetSessionStats,
  onBackToCompass,
}) => {
  return (
    <div className="max-w-3xl mx-auto w-full space-y-4 pb-8">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToCompass}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to Compass</span>
        </button>

        <PWAInstallButton />
      </div>

      {/* Units & Coordinates */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11161E] p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Units & Formats
        </h2>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <div>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Coordinate Format
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Decimal degrees, degrees-minutes-seconds, or decimal minutes
            </div>
          </div>
          <div
            className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-[#0B0E14] p-0.5 border border-slate-200 dark:border-slate-800"
            role="group"
            aria-label="Coordinate format"
          >
            {(['DD', 'DMS', 'DDM'] as CoordFormat[]).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => onCoordFormatChange(fmt)}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors ${
                  coordFormat === fmt
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <div>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Elevation Unit
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Meters or feet for altitude and accuracy
            </div>
          </div>
          <div
            className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-[#0B0E14] p-0.5 border border-slate-200 dark:border-slate-800"
            role="group"
            aria-label="Elevation unit"
          >
            {(['m', 'ft'] as ElevationUnit[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => onElevationUnitChange(u)}
                className={`px-3.5 py-1.5 text-xs font-mono font-medium rounded-md transition-colors ${
                  elevationUnit === u
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <div>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Speed Unit
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Kilometers/hour, miles/hour, knots, or meters/sec
            </div>
          </div>
          <div
            className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-[#0B0E14] p-0.5 border border-slate-200 dark:border-slate-800"
            role="group"
            aria-label="Speed unit"
          >
            {(['km/h', 'mph', 'kts', 'm/s'] as SpeedUnit[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => onSpeedUnitChange(u)}
                className={`px-2.5 py-1.5 text-xs font-mono font-medium rounded-md transition-colors ${
                  speedUnit === u
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Compass Calibration */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11161E] p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Compass & Calibration
        </h2>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <div>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
              North Reference
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Apply magnetic declination for True North
            </div>
          </div>
          <div
            className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-[#0B0E14] p-0.5 border border-slate-200 dark:border-slate-800"
            role="group"
            aria-label="North reference"
          >
            {(['true', 'magnetic'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onNorthModeChange(mode)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                  northMode === mode
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <div className="flex items-center justify-between text-sm">
            <label
              htmlFor="declination-slider"
              className="font-medium text-slate-800 dark:text-slate-200"
            >
              Magnetic Declination Offset
            </label>
            <div className="flex items-center gap-2">
              <span className="font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-slate-100">
                {declinationDeg > 0
                  ? `+${declinationDeg}° E`
                  : declinationDeg < 0
                  ? `${Math.abs(declinationDeg)}° W`
                  : '0°'}
              </span>
              {declinationDeg !== 0 && (
                <button
                  type="button"
                  onClick={() => onDeclinationChange(0)}
                  aria-label="Reset declination"
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <input
            id="declination-slider"
            type="range"
            min={-30}
            max={30}
            step={0.5}
            value={declinationDeg}
            onChange={(e) => onDeclinationChange(Number.parseFloat(e.target.value))}
            className="mt-2 w-full accent-orange-600 cursor-pointer"
          />
        </div>

        {!hasLiveMagnetometer && (
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
            <div className="flex items-center justify-between text-sm">
              <label
                htmlFor="manual-heading-slider"
                className="font-medium text-slate-800 dark:text-slate-200"
              >
                Manual Dial Test Rotation
              </label>
              <span className="font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-slate-100">
                {Math.round(manualHeading)}°
              </span>
            </div>
            <input
              id="manual-heading-slider"
              type="range"
              min={0}
              max={359}
              step={1}
              value={Math.round(manualHeading)}
              onChange={(e) => onManualHeadingChange(Number.parseInt(e.target.value, 10))}
              className="mt-2 w-full accent-orange-600 cursor-pointer"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              No hardware magnetometer detected on this device. Rotate manually to preview bearing lock.
            </p>
          </div>
        )}
      </section>

      {/* Display, GPS & Offline Status */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11161E] p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Display & Sensors
        </h2>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <div>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Appearance
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              High-contrast daylight or low-glare night display
            </div>
          </div>
          <button
            type="button"
            onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[38px]"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                <span>Daylight Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700" aria-hidden="true" />
                <span>Night Mode</span>
              </>
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <div>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
              GPS & Session Metrics
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Status: {gpsStatus}
              {gpsErrorMessage ? ` · ${gpsErrorMessage}` : ''}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRetryGps}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[38px]"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Refresh GPS</span>
            </button>
            <button
              type="button"
              onClick={onResetSessionStats}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[38px]"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset Stats</span>
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <img
            src="/classic-dial-logo.png"
            alt=""
            referrerPolicy="no-referrer"
            className="w-5 h-5 rounded shrink-0 object-cover"
          />
          <span>
            {offlineReady
              ? '● Offline app cache active — Compass runs without internet.'
              : 'Preparing offline service worker cache.'}
            {' · '}
            {isOnline ? 'Network online' : 'Device offline'}
          </span>
        </div>
      </section>
    </div>
  );
};
