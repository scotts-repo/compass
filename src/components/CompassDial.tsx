import React, { useMemo, useRef } from 'react';
import { Compass as CompassIcon, Lock, Unlock } from 'lucide-react';
import {
  getCardinalDirection,
  normalizeAngle,
  shortestAngleDelta,
} from '../utils/navigationMath';
import type { CompassPermissionState, CompassSensorSource } from '../hooks/useCompassSensor';

interface CompassDialProps {
  heading: number;
  smoothHeading: number;
  pitch: number;
  roll: number;
  northMode: 'true' | 'magnetic';
  targetBearing: number | null;
  hasLiveSignal: boolean;
  sensorSource: CompassSensorSource;
  permissionState: CompassPermissionState;
  gpsActive: boolean;
  isCachedFix: boolean;
  isOnline: boolean;
  onRequestPermission: () => void;
  onToggleBearingLock: () => void;
  onSetTargetBearing: (deg: number | null) => void;
  onManualHeadingChange?: (deg: number) => void;
}

const DEGREE_LABELS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const INTERCARDINALS = [
  { deg: 45, label: 'NE' },
  { deg: 135, label: 'SE' },
  { deg: 225, label: 'SW' },
  { deg: 315, label: 'NW' },
];

export const CompassDial: React.FC<CompassDialProps> = ({
  heading,
  smoothHeading,
  pitch,
  roll,
  northMode,
  targetBearing,
  hasLiveSignal,
  sensorSource,
  permissionState,
  gpsActive,
  isCachedFix,
  isOnline,
  onRequestPermission,
  onToggleBearingLock,
  onSetTargetBearing,
  onManualHeadingChange,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const roundedHeading = Math.round(normalizeAngle(heading)) % 360;
  const cardinal = getCardinalDirection(roundedHeading);

  const clampedRoll = Math.max(-25, Math.min(25, roll));
  const clampedPitch = Math.max(-25, Math.min(25, pitch));
  const bubbleX = (clampedRoll / 25) * 20;
  const bubbleY = (clampedPitch / 25) * 20;
  const isLevel = Math.abs(pitch) <= 5 && Math.abs(roll) <= 5;

  const targetDelta =
    targetBearing !== null ? Math.round(shortestAngleDelta(heading, targetBearing)) : null;

  const ticks = useMemo(() => {
    const arr: { deg: number; kind: 'major' | 'medium' | 'minor' }[] = [];
    for (let d = 0; d < 360; d += 2) {
      if (d % 30 === 0) arr.push({ deg: d, kind: 'major' });
      else if (d % 10 === 0) arr.push({ deg: d, kind: 'medium' });
      else arr.push({ deg: d, kind: 'minor' });
    }
    return arr;
  }, []);

  const handleDialClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const radiusRatio = dist / (rect.width / 2);

    if (radiusRatio < 0.52 || radiusRatio > 1.02) return;

    const screenAngle = normalizeAngle((Math.atan2(dy, dx) * 180) / Math.PI + 90);
    if (!hasLiveSignal && onManualHeadingChange) {
      onManualHeadingChange(Math.round(screenAngle));
    } else {
      const worldBearing = Math.round(normalizeAngle(heading + screenAngle));
      onSetTargetBearing(worldBearing);
    }
  };

  const sensorLabel = useMemo(() => {
    if (permissionState === 'prompt') return 'Sensor prompt';
    if (permissionState === 'denied') return 'Sensor denied';
    if (sensorSource === 'webkit-compass' || sensorSource === 'magnetometer-absolute') {
      return 'Magnetometer';
    }
    if (sensorSource === 'orientation-relative') return 'Relative';
    return 'No compass sensor';
  }, [permissionState, sensorSource]);

  return (
    <section
      aria-label="Compass Dial"
      className="flex-1 min-h-0 flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11161E] px-4 py-3 sm:p-5"
    >
      {/* Top Status & Primary Heading Row */}
      <div className="shrink-0 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
            <span
              className={
                hasLiveSignal
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }
            >
              {hasLiveSignal ? '●' : '▲'} {sensorLabel}
            </span>
            <span aria-hidden="true">·</span>
            <span>{northMode === 'true' ? 'True' : 'Mag'}</span>
            <span aria-hidden="true">·</span>
            <span
              className={
                gpsActive && !isCachedFix
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              }
            >
              {gpsActive && !isCachedFix ? 'Live GPS' : isCachedFix ? 'Cached GPS' : 'GPS Wait'}
            </span>
            {!isOnline && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-600 dark:text-amber-400">Offline</span>
              </>
            )}
          </div>

          <div className="mt-0.5 flex items-baseline gap-2.5">
            <span className="font-mono tabular-nums text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-none">
              {String(roundedHeading).padStart(3, '0')}°
            </span>
            <span className="font-display text-2xl sm:text-3xl font-bold tracking-wide text-orange-600 dark:text-orange-500 leading-none">
              {cardinal.short}
            </span>
            {targetBearing !== null && targetDelta !== null && (
              <span className="font-mono tabular-nums text-xs font-semibold text-amber-600 dark:text-amber-400">
                Lock {Math.round(targetBearing)}° (
                {targetDelta === 0
                  ? '0°'
                  : targetDelta > 0
                  ? `${targetDelta}° R`
                  : `${Math.abs(targetDelta)}° L`}
                )
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleBearingLock}
          aria-label={targetBearing !== null ? 'Clear locked bearing' : 'Lock current bearing'}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[38px] border ${
            targetBearing !== null
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {targetBearing !== null ? (
            <>
              <Unlock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Unlock</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Lock</span>
            </>
          )}
        </button>
      </div>

      {/* Responsive SVG Compass Rose (auto-scales cleanly inside remaining viewport height) */}
      <div className="flex-1 min-h-0 flex items-center justify-center py-2">
        <svg
          ref={svgRef}
          viewBox="0 0 440 440"
          onClick={handleDialClick}
          className="h-full w-auto max-w-full max-h-[340px] lg:max-h-[380px] aspect-square select-none cursor-crosshair touch-manipulation"
          role="img"
          aria-label={`Compass rose pointing ${roundedHeading} degrees ${cardinal.full}`}
        >
          {/* Outer Machined Bezel */}
          <circle
            cx="220"
            cy="220"
            r="208"
            className="fill-slate-100/70 dark:fill-[#0B0E14] stroke-slate-300 dark:stroke-slate-700"
            strokeWidth="2"
          />
          <circle
            cx="220"
            cy="220"
            r="194"
            className="fill-white dark:fill-[#0D1219] stroke-slate-200 dark:stroke-slate-800"
            strokeWidth="1.5"
          />

          {/* Fixed Lubber Triangle at 12 o'clock */}
          <polygon points="220,10 211,26 229,26" className="fill-orange-600 dark:fill-orange-500" />
          <line
            x1="220"
            y1="26"
            x2="220"
            y2="54"
            className="stroke-orange-600 dark:stroke-orange-500"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Fixed Center Crosshairs */}
          <line
            x1="220"
            y1="158"
            x2="220"
            y2="282"
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth="1"
          />
          <line
            x1="158"
            y1="220"
            x2="282"
            y2="220"
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth="1"
          />

          {/* Rotating Compass Card */}
          <g
            style={{
              transform: `rotate(${-smoothHeading}deg)`,
              transformOrigin: '220px 220px',
              transition: 'transform 90ms linear',
            }}
          >
            {ticks.map(({ deg, kind }) => {
              const rOuter = 190;
              const rInner = kind === 'major' ? 173 : kind === 'medium' ? 179 : 184;
              const isNorth = deg === 0;
              return (
                <line
                  key={deg}
                  x1="220"
                  y1={220 - rOuter}
                  x2="220"
                  y2={220 - rInner}
                  transform={`rotate(${deg} 220 220)`}
                  className={
                    isNorth
                      ? 'stroke-orange-600 dark:stroke-orange-500'
                      : kind === 'major'
                      ? 'stroke-slate-800 dark:stroke-slate-200'
                      : kind === 'medium'
                      ? 'stroke-slate-500 dark:stroke-slate-400'
                      : 'stroke-slate-300 dark:stroke-slate-700'
                  }
                  strokeWidth={kind === 'major' ? 2.2 : kind === 'medium' ? 1.4 : 1}
                  strokeLinecap="round"
                />
              );
            })}

            {DEGREE_LABELS.map((deg) => (
              <text
                key={deg}
                x="220"
                y="68"
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(${deg} 220 220)`}
                className={`font-mono text-[12px] font-semibold ${
                  deg === 0
                    ? 'fill-orange-600 dark:fill-orange-500'
                    : 'fill-slate-600 dark:fill-slate-400'
                }`}
              >
                {deg}
              </text>
            ))}

            {[
              { deg: 0, label: 'N', accent: true },
              { deg: 90, label: 'E', accent: false },
              { deg: 180, label: 'S', accent: false },
              { deg: 270, label: 'W', accent: false },
            ].map(({ deg, label, accent }) => (
              <g key={label} transform={`rotate(${deg} 220 220)`}>
                <text
                  x="220"
                  y="102"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={`font-display text-[26px] font-bold tracking-wider ${
                    accent
                      ? 'fill-orange-600 dark:fill-orange-500'
                      : 'fill-slate-900 dark:fill-slate-100'
                  }`}
                >
                  {label}
                </text>
              </g>
            ))}

            {INTERCARDINALS.map(({ deg, label }) => (
              <text
                key={label}
                x="220"
                y="102"
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(${deg} 220 220)`}
                className="font-display text-[14px] font-semibold tracking-wider fill-slate-400 dark:fill-slate-500"
              >
                {label}
              </text>
            ))}

            <polygon
              points="220,118 212,136 228,136"
              className="fill-orange-600 dark:fill-orange-500"
            />

            {targetBearing !== null && (
              <g transform={`rotate(${targetBearing} 220 220)`}>
                <line
                  x1="220"
                  y1="32"
                  x2="220"
                  y2="145"
                  className="stroke-amber-500 dark:stroke-amber-400"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <polygon
                  points="220,26 210,44 230,44"
                  className="fill-amber-500 dark:fill-amber-400"
                />
                <circle
                  cx="220"
                  cy="145"
                  r="4.5"
                  className="fill-amber-500 dark:fill-amber-400"
                />
              </g>
            )}
          </g>

          {/* Center 2-Axis Spirit Bubble Level */}
          <circle
            cx="220"
            cy="220"
            r="38"
            className="fill-slate-100/90 dark:fill-[#141B24] stroke-slate-300 dark:stroke-slate-700"
            strokeWidth="1.5"
          />
          <circle
            cx="220"
            cy="220"
            r="14"
            fill="none"
            className={
              isLevel
                ? 'stroke-emerald-500/70 dark:stroke-emerald-400/70'
                : 'stroke-slate-300 dark:stroke-slate-600'
            }
            strokeWidth="1.2"
          />
          <circle
            cx={220 + bubbleX}
            cy={220 + bubbleY}
            r="8"
            className={
              isLevel
                ? 'fill-emerald-500/80 dark:fill-emerald-400/80'
                : 'fill-sky-500/75 dark:fill-sky-400/75'
            }
          />
        </svg>
      </div>

      {/* Bottom Compact Footer Strip */}
      <div className="shrink-0 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-2 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
        {permissionState === 'prompt' ? (
          <button
            type="button"
            onClick={onRequestPermission}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-500 transition-colors min-h-[38px]"
          >
            <CompassIcon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Enable Compass Sensor</span>
          </button>
        ) : (
          <>
            <span className="font-mono tabular-nums">
              Tilt {Math.round(pitch)}° / {Math.round(roll)}°
            </span>
            <span
              className={
                isLevel
                  ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                  : 'text-slate-500 dark:text-slate-400'
              }
            >
              {isLevel ? '● Level' : 'Hold flat'}
            </span>
          </>
        )}
      </div>
    </section>
  );
};
