import React, { useEffect, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import type { GeolocationStatus, GpsTelemetry, SessionStats } from '../hooks/useGeolocationTelemetry';
import {
  type CoordFormat,
  type ElevationUnit,
  type SpeedUnit,
  convertElevation,
  convertSpeed,
  formatCoordinate,
  formatRelativeAge,
} from '../utils/navigationMath';

interface TelemetryGridProps {
  telemetry: GpsTelemetry;
  status: GeolocationStatus;
  errorMessage: string | null;
  sessionStats: SessionStats;
  coordFormat: CoordFormat;
  elevationUnit: ElevationUnit;
  speedUnit: SpeedUnit;
  onRetryGps: () => void;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to legacy textarea copy fallback
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export const TelemetryGrid: React.FC<TelemetryGridProps> = ({
  telemetry,
  status,
  errorMessage,
  sessionStats,
  coordFormat,
  elevationUnit,
  speedUnit,
  onRetryGps,
}) => {
  const [copiedField, setCopiedField] = useState<'lat' | 'lon' | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);

  const hasLat = telemetry.latitude !== null;
  const hasLon = telemetry.longitude !== null;

  const formattedLat = hasLat
    ? formatCoordinate(telemetry.latitude!, 'lat', coordFormat)
    : '--.-----°';

  const formattedLon = hasLon
    ? formatCoordinate(telemetry.longitude!, 'lon', coordFormat)
    : '--.-----°';

  const handleCopyLat = async () => {
    if (!hasLat) return;
    const ok = await copyTextToClipboard(telemetry.latitude!.toFixed(6));
    if (ok) {
      setCopiedField('lat');
      window.setTimeout(() => {
        setCopiedField((cur) => (cur === 'lat' ? null : cur));
      }, 1600);
    }
  };

  const handleCopyLon = async () => {
    if (!hasLon) return;
    const ok = await copyTextToClipboard(telemetry.longitude!.toFixed(6));
    if (ok) {
      setCopiedField('lon');
      window.setTimeout(() => {
        setCopiedField((cur) => (cur === 'lon' ? null : cur));
      }, 1600);
    }
  };

  const elevationDisplay =
    telemetry.altitude !== null
      ? Math.round(convertElevation(telemetry.altitude, elevationUnit)).toLocaleString()
      : '--';

  const speedValue =
    telemetry.speedMs !== null ? convertSpeed(telemetry.speedMs, speedUnit) : null;

  const speedDisplay =
    speedValue !== null
      ? speedValue < 10
        ? speedValue.toFixed(1)
        : Math.round(speedValue).toString()
      : '--';

  const maxSpeedDisplay = convertSpeed(sessionStats.maxSpeedMs, speedUnit).toFixed(1);

  const showRetry =
    status === 'denied' || status === 'timeout' || status === 'unavailable';

  return (
    <section aria-label="GPS Telemetry" className="shrink-0 flex flex-col gap-2">
      {/* Compact 2x2 Readout Grid: Lat, Lon, Elevation, Speed */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {/* Latitude Tap-to-Copy Button */}
        <button
          type="button"
          onClick={handleCopyLat}
          disabled={!hasLat}
          aria-label={
            hasLat
              ? `Copy latitude ${telemetry.latitude!.toFixed(6)} to clipboard`
              : 'Latitude unavailable'
          }
          className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11161E] px-3 py-2.5 sm:p-4 flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.98] disabled:opacity-75 disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 cursor-pointer disabled:cursor-default"
        >
          <div className="w-full flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
              Latitude
            </span>
            {copiedField === 'lat' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                <Check className="w-3 h-3" aria-hidden="true" />
                <span>Copied</span>
              </span>
            ) : (
              hasLat && (
                <Copy
                  className="w-3 h-3 text-slate-400 dark:text-slate-500"
                  aria-hidden="true"
                />
              )
            )}
          </div>
          <div className="mt-1 w-full font-mono tabular-nums text-sm sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate">
            {formattedLat}
          </div>
          <div className="mt-0.5 w-full font-mono tabular-nums text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
            {telemetry.accuracy !== null
              ? `±${Math.round(convertElevation(telemetry.accuracy, elevationUnit))} ${elevationUnit}`
              : 'Waiting for fix'}
          </div>
        </button>

        {/* Longitude Tap-to-Copy Button */}
        <button
          type="button"
          onClick={handleCopyLon}
          disabled={!hasLon}
          aria-label={
            hasLon
              ? `Copy longitude ${telemetry.longitude!.toFixed(6)} to clipboard`
              : 'Longitude unavailable'
          }
          className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11161E] px-3 py-2.5 sm:p-4 flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.98] disabled:opacity-75 disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 cursor-pointer disabled:cursor-default"
        >
          <div className="w-full flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
              Longitude
            </span>
            {copiedField === 'lon' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                <Check className="w-3 h-3" aria-hidden="true" />
                <span>Copied</span>
              </span>
            ) : (
              hasLon && (
                <Copy
                  className="w-3 h-3 text-slate-400 dark:text-slate-500"
                  aria-hidden="true"
                />
              )
            )}
          </div>
          <div className="mt-1 w-full font-mono tabular-nums text-sm sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate">
            {formattedLon}
          </div>
          <div className="mt-0.5 w-full font-mono tabular-nums text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
            {telemetry.timestamp !== null
              ? `${telemetry.isCachedFix ? 'Cached' : 'Fix'} · ${formatRelativeAge(telemetry.timestamp, now)}`
              : errorMessage
              ? 'GPS denied'
              : 'Acquiring'}
          </div>
        </button>

        {/* Elevation */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11161E] px-3 py-2.5 sm:p-4 flex flex-col justify-between">
          <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
            Elevation
          </span>
          <div className="mt-1 flex items-baseline">
            <span className="font-mono tabular-nums text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-none">
              {elevationDisplay}
            </span>
            <span className="ml-1.5 font-mono text-xs uppercase text-slate-500 dark:text-slate-400">
              {elevationUnit}
            </span>
          </div>
          <div className="mt-1 font-mono tabular-nums text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
            Gain +{Math.round(convertElevation(sessionStats.elevationGainM, elevationUnit))} {elevationUnit}
          </div>
        </div>

        {/* Speed */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11161E] px-3 py-2.5 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
              Speed
            </span>
            {showRetry && (
              <button
                type="button"
                onClick={onRetryGps}
                aria-label="Retry GPS"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-600 dark:text-orange-400 hover:underline"
              >
                <RefreshCw className="w-3 h-3" aria-hidden="true" />
                <span>Retry</span>
              </button>
            )}
          </div>
          <div className="mt-1 flex items-baseline">
            <span className="font-mono tabular-nums text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-none">
              {speedDisplay}
            </span>
            <span className="ml-1.5 font-mono text-xs text-slate-500 dark:text-slate-400">
              {speedUnit}
            </span>
          </div>
          <div className="mt-1 font-mono tabular-nums text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
            Peak {maxSpeedDisplay} {speedUnit}
          </div>
        </div>
      </div>
    </section>
  );
};
