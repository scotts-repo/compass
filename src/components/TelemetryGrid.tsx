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
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);

  const hasCoords = telemetry.latitude !== null && telemetry.longitude !== null;

  const formattedLat = hasCoords
    ? formatCoordinate(telemetry.latitude!, 'lat', coordFormat)
    : '--.-----°';

  const formattedLon = hasCoords
    ? formatCoordinate(telemetry.longitude!, 'lon', coordFormat)
    : '--.-----°';

  const handleCopyCoords = async () => {
    if (!hasCoords) return;
    const raw = `${telemetry.latitude!.toFixed(6)}, ${telemetry.longitude!.toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked
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

  return (
    <section aria-label="GPS Telemetry" className="shrink-0 flex flex-col gap-2">
      {/* Compact 2x2 Readout Grid: Lat, Lon, Elevation, Speed */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {/* Latitude */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11161E] px-3 py-2.5 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
              Latitude
            </span>
            <button
              type="button"
              onClick={handleCopyCoords}
              disabled={!hasCoords}
              aria-label="Copy coordinates"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 disabled:opacity-40"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" aria-hidden="true" />
                  <span className="text-emerald-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" aria-hidden="true" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="mt-1 font-mono tabular-nums text-sm sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate">
            {formattedLat}
          </div>
          <div className="mt-0.5 font-mono tabular-nums text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
            {telemetry.accuracy !== null
              ? `±${Math.round(convertElevation(telemetry.accuracy, elevationUnit))} ${elevationUnit}`
              : 'Waiting for fix'}
          </div>
        </div>

        {/* Longitude */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11161E] px-3 py-2.5 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
              Longitude
            </span>
            {(status === 'denied' || status === 'timeout' || status === 'unavailable') && (
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
          <div className="mt-1 font-mono tabular-nums text-sm sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate">
            {formattedLon}
          </div>
          <div className="mt-0.5 font-mono tabular-nums text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
            {telemetry.timestamp !== null
              ? `${telemetry.isCachedFix ? 'Cached' : 'Fix'} · ${formatRelativeAge(telemetry.timestamp, now)}`
              : errorMessage
              ? 'GPS denied'
              : 'Acquiring'}
          </div>
        </div>

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
          <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
            Speed
          </span>
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
