import { useCallback, useEffect, useRef, useState } from 'react';
import { haversineDistanceMeters } from '../utils/navigationMath';

const LAST_FIX_STORAGE_KEY = 'wayfinder_last_gps_fix_v1';

export interface GpsTelemetry {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  speedMs: number | null;
  gpsHeading: number | null;
  timestamp: number | null;
  isCachedFix: boolean;
}

export interface SessionStats {
  maxSpeedMs: number;
  minElevationM: number | null;
  maxElevationM: number | null;
  elevationGainM: number;
  distanceTraveledM: number;
}

export type GeolocationStatus =
  | 'acquiring'
  | 'active'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'unsupported';

interface StoredFix {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  timestamp: number;
}

function loadStoredFix(): GpsTelemetry {
  try {
    const raw = localStorage.getItem(LAST_FIX_STORAGE_KEY);
    if (!raw) {
      return {
        latitude: null,
        longitude: null,
        accuracy: null,
        altitude: null,
        altitudeAccuracy: null,
        speedMs: null,
        gpsHeading: null,
        timestamp: null,
        isCachedFix: false,
      };
    }
    const parsed = JSON.parse(raw) as StoredFix;
    if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
      return {
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        accuracy: parsed.accuracy ?? null,
        altitude: parsed.altitude ?? null,
        altitudeAccuracy: parsed.altitudeAccuracy ?? null,
        speedMs: 0,
        gpsHeading: null,
        timestamp: parsed.timestamp ?? null,
        isCachedFix: true,
      };
    }
  } catch {
    // Ignore corrupted storage
  }
  return {
    latitude: null,
    longitude: null,
    accuracy: null,
    altitude: null,
    altitudeAccuracy: null,
    speedMs: null,
    gpsHeading: null,
    timestamp: null,
    isCachedFix: false,
  };
}

export function useGeolocationTelemetry() {
  const [telemetry, setTelemetry] = useState<GpsTelemetry>(() => loadStoredFix());
  const [status, setStatus] = useState<GeolocationStatus>(() =>
    typeof navigator !== 'undefined' && 'geolocation' in navigator ? 'acquiring' : 'unsupported'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [watchKey, setWatchKey] = useState<number>(0);

  const [sessionStats, setSessionStats] = useState<SessionStats>({
    maxSpeedMs: 0,
    minElevationM: null,
    maxElevationM: null,
    elevationGainM: 0,
    distanceTraveledM: 0,
  });

  const prevLiveFixRef = useRef<{
    lat: number;
    lon: number;
    alt: number | null;
    timestamp: number;
  } | null>(null);

  const statusRef = useRef<GeolocationStatus>(status);
  statusRef.current = status;

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('unsupported');
      setErrorMessage('Geolocation API is not supported by this browser.');
      return;
    }

    setStatus('acquiring');
    setErrorMessage(null);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { coords, timestamp } = position;
        const prev = prevLiveFixRef.current;

        let resolvedSpeed =
          typeof coords.speed === 'number' && !Number.isNaN(coords.speed) && coords.speed >= 0
            ? coords.speed
            : null;

        let stepDistance = 0;
        if (prev) {
          stepDistance = haversineDistanceMeters(prev.lat, prev.lon, coords.latitude, coords.longitude);
          const dtSeconds = (timestamp - prev.timestamp) / 1000;
          if (resolvedSpeed === null && dtSeconds > 0.4) {
            const jitterThreshold = Math.max(1.5, Math.min(8, (coords.accuracy ?? 10) * 0.35));
            resolvedSpeed = stepDistance > jitterThreshold ? stepDistance / dtSeconds : 0;
          }
        } else if (resolvedSpeed === null) {
          resolvedSpeed = 0;
        }

        const resolvedAlt =
          typeof coords.altitude === 'number' && !Number.isNaN(coords.altitude)
            ? coords.altitude
            : null;

        const resolvedAltAcc =
          typeof coords.altitudeAccuracy === 'number' && !Number.isNaN(coords.altitudeAccuracy)
            ? coords.altitudeAccuracy
            : null;

        const resolvedHeading =
          typeof coords.heading === 'number' && !Number.isNaN(coords.heading)
            ? coords.heading
            : null;

        setTelemetry({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy ?? null,
          altitude: resolvedAlt,
          altitudeAccuracy: resolvedAltAcc,
          speedMs: resolvedSpeed,
          gpsHeading: resolvedHeading,
          timestamp,
          isCachedFix: false,
        });
        setStatus('active');
        setErrorMessage(null);

        try {
          const toStore: StoredFix = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy ?? null,
            altitude: resolvedAlt,
            altitudeAccuracy: resolvedAltAcc,
            timestamp,
          };
          localStorage.setItem(LAST_FIX_STORAGE_KEY, JSON.stringify(toStore));
        } catch {
          // Ignore storage quota errors
        }

        setSessionStats((current) => {
          let nextGain = current.elevationGainM;
          if (resolvedAlt !== null && prev?.alt !== null && prev?.alt !== undefined) {
            const altDelta = resolvedAlt - prev.alt;
            if (altDelta > 2.5) {
              nextGain += altDelta;
            }
          }

          let nextDist = current.distanceTraveledM;
          if (prev && stepDistance > 2 && stepDistance < 5000) {
            nextDist += stepDistance;
          }

          return {
            maxSpeedMs:
              resolvedSpeed !== null
                ? Math.max(current.maxSpeedMs, resolvedSpeed)
                : current.maxSpeedMs,
            minElevationM:
              resolvedAlt !== null
                ? current.minElevationM === null
                  ? resolvedAlt
                  : Math.min(current.minElevationM, resolvedAlt)
                : current.minElevationM,
            maxElevationM:
              resolvedAlt !== null
                ? current.maxElevationM === null
                  ? resolvedAlt
                  : Math.max(current.maxElevationM, resolvedAlt)
                : current.maxElevationM,
            elevationGainM: nextGain,
            distanceTraveledM: nextDist,
          };
        });

        prevLiveFixRef.current = {
          lat: coords.latitude,
          lon: coords.longitude,
          alt: resolvedAlt,
          timestamp,
        };
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setErrorMessage('Location permission denied. Enable GPS access in browser settings.');
        } else if (err.code === err.TIMEOUT) {
          setStatus('timeout');
          setErrorMessage('GPS fix timed out. Move to an area with clearer sky view.');
        } else {
          setStatus('unavailable');
          setErrorMessage('GPS signal currently unavailable.');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [watchKey]);

  // Automatically restart GPS watcher whenever browser geolocation permission transitions to granted,
  // or when returning to the app after granting permissions in system/browser settings.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;

    let permStatus: PermissionStatus | null = null;

    const restartIfNeeded = () => {
      if (statusRef.current !== 'active') {
        setWatchKey((k) => k + 1);
      }
    };

    const monitorPermission = async () => {
      if (!navigator.permissions?.query) return;
      try {
        permStatus = await navigator.permissions.query({ name: 'geolocation' });
        if (permStatus.state === 'granted') {
          restartIfNeeded();
        }
        permStatus.onchange = () => {
          if (permStatus?.state === 'granted') {
            setWatchKey((k) => k + 1);
          } else if (permStatus?.state === 'denied') {
            setStatus('denied');
          }
        };
      } catch {
        // Permissions API for geolocation unsupported
      }
    };

    void monitorPermission();

    const handleVisibilityOrFocus = async () => {
      if (document.visibilityState !== 'visible') return;
      if (statusRef.current === 'active') return;

      if (navigator.permissions?.query) {
        try {
          const current = await navigator.permissions.query({ name: 'geolocation' });
          if (current.state === 'granted') {
            setWatchKey((k) => k + 1);
          }
          return;
        } catch {
          // Fall through to retry
        }
      }
      if (statusRef.current === 'denied' || statusRef.current === 'timeout' || statusRef.current === 'unavailable') {
        setWatchKey((k) => k + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      if (permStatus) {
        permStatus.onchange = null;
      }
    };
  }, []);

  const retryGps = useCallback(() => {
    setWatchKey((k) => k + 1);
  }, []);

  const resetSessionStats = useCallback(() => {
    setSessionStats({
      maxSpeedMs: 0,
      minElevationM: telemetry.altitude,
      maxElevationM: telemetry.altitude,
      elevationGainM: 0,
      distanceTraveledM: 0,
    });
  }, [telemetry.altitude]);

  return {
    telemetry,
    status,
    errorMessage,
    sessionStats,
    retryGps,
    resetSessionStats,
  };
}
