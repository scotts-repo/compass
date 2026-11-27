import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeAngle, shortestAngleDelta, unwrapCompassAngle } from '../utils/navigationMath';

export type CompassSensorSource =
  | 'magnetometer-absolute'
  | 'webkit-compass'
  | 'orientation-relative'
  | 'unavailable';

export type CompassPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

interface WebKitDeviceOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}

interface DeviceOrientationConstructorWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

export interface CompassSensorState {
  magneticHeading: number | null;
  smoothHeading: number;
  pitch: number;
  roll: number;
  sensorSource: CompassSensorSource;
  compassAccuracy: number | null;
  permissionState: CompassPermissionState;
  requestPermission: () => Promise<void>;
  hasLiveSignal: boolean;
}

function getScreenOrientationAngle(): number {
  if (typeof window === 'undefined') return 0;
  if (window.screen?.orientation && typeof window.screen.orientation.angle === 'number') {
    return window.screen.orientation.angle;
  }
  const legacyAngle = (window as unknown as { orientation?: number }).orientation;
  return typeof legacyAngle === 'number' ? legacyAngle : 0;
}

export function useCompassSensor(): CompassSensorState {
  const [magneticHeading, setMagneticHeading] = useState<number | null>(null);
  const [smoothHeading, setSmoothHeading] = useState<number>(0);
  const [pitch, setPitch] = useState<number>(0);
  const [roll, setRoll] = useState<number>(0);
  const [sensorSource, setSensorSource] = useState<CompassSensorSource>('unavailable');
  const [compassAccuracy, setCompassAccuracy] = useState<number | null>(null);
  const [hasLiveSignal, setHasLiveSignal] = useState<boolean>(false);
  const [listenerVersion, setListenerVersion] = useState<number>(0);

  const requiresExplicitPermission =
    typeof window !== 'undefined' &&
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof (DeviceOrientationEvent as unknown as DeviceOrientationConstructorWithPermission)
      .requestPermission === 'function';

  const [permissionState, setPermissionState] = useState<CompassPermissionState>(() => {
    if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
      return 'unsupported';
    }
    return requiresExplicitPermission ? 'prompt' : 'granted';
  });

  const smoothRef = useRef<number | null>(null);
  const hasAbsoluteRef = useRef<boolean>(false);
  const requestingRef = useRef<boolean>(false);

  const pushHeading = useCallback((rawDeg: number) => {
    const normalized = normalizeAngle(rawDeg);
    setMagneticHeading(normalized);
    setHasLiveSignal(true);
    setPermissionState((prev) => (prev === 'prompt' ? 'granted' : prev));

    if (smoothRef.current === null) {
      smoothRef.current = normalized;
      setSmoothHeading(normalized);
      return;
    }

    const unwrappedTarget = unwrapCompassAngle(smoothRef.current, normalized);
    const delta = shortestAngleDelta(smoothRef.current, unwrappedTarget);
    const nextSmooth = smoothRef.current + delta * 0.24;
    smoothRef.current = nextSmooth;
    setSmoothHeading(nextSmooth);
  }, []);

  // Attach listeners immediately (probing silently even before iOS explicit grant;
  // if permission was already granted by the browser/OS, events start immediately)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
      return;
    }

    const handleAbsolute = (event: Event) => {
      const e = event as DeviceOrientationEvent;
      if (e.alpha === null || typeof e.alpha !== 'number') return;

      hasAbsoluteRef.current = true;
      const screenAngle = getScreenOrientationAngle();
      const heading = normalizeAngle(360 - e.alpha + screenAngle);
      setSensorSource('magnetometer-absolute');
      if (typeof e.beta === 'number') setPitch(e.beta);
      if (typeof e.gamma === 'number') setRoll(e.gamma);
      pushHeading(heading);
    };

    const handleOrientation = (event: Event) => {
      const e = event as WebKitDeviceOrientationEvent;

      if (typeof e.beta === 'number') setPitch(e.beta);
      if (typeof e.gamma === 'number') setRoll(e.gamma);

      if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
        setSensorSource('webkit-compass');
        if (typeof e.webkitCompassAccuracy === 'number' && e.webkitCompassAccuracy >= 0) {
          setCompassAccuracy(e.webkitCompassAccuracy);
        }
        pushHeading(e.webkitCompassHeading);
        return;
      }

      if (hasAbsoluteRef.current) return;

      if (e.alpha !== null && typeof e.alpha === 'number') {
        const screenAngle = getScreenOrientationAngle();
        const heading = normalizeAngle(360 - e.alpha + screenAngle);
        setSensorSource(e.absolute ? 'magnetometer-absolute' : 'orientation-relative');
        pushHeading(heading);
      }
    };

    window.addEventListener('deviceorientationabsolute', handleAbsolute, true);
    window.addEventListener('deviceorientation', handleOrientation, true);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleAbsolute, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [pushHeading, listenerVersion]);

  const requestPermission = useCallback(async () => {
    if (typeof DeviceOrientationEvent === 'undefined') {
      setPermissionState('unsupported');
      return;
    }

    if (requestingRef.current) return;

    const devOrient = DeviceOrientationEvent as unknown as DeviceOrientationConstructorWithPermission;
    if (typeof devOrient.requestPermission === 'function') {
      requestingRef.current = true;
      try {
        const result = await devOrient.requestPermission();
        setPermissionState(result);
        if (result === 'granted') {
          setListenerVersion((v) => v + 1);
        }
      } catch {
        setPermissionState('denied');
      } finally {
        requestingRef.current = false;
      }
    } else {
      setPermissionState('granted');
      setListenerVersion((v) => v + 1);
    }
  }, []);

  // Automatically request/enable orientation sensor on first user tap when iOS requires gesture,
  // and re-attach listeners automatically if browser/OS sensor permission changes to granted.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFirstInteraction = () => {
      if (permissionState === 'prompt') {
        void requestPermission();
      }
    };

    if (permissionState === 'prompt') {
      window.addEventListener('click', handleFirstInteraction, { capture: true, once: true });
    }

    let permStatus: PermissionStatus | null = null;
    const checkMagnetometerPermission = async () => {
      if (!navigator.permissions?.query) return;
      try {
        permStatus = await navigator.permissions.query({
          name: 'magnetometer' as PermissionName,
        });
        if (permStatus.state === 'granted') {
          setPermissionState('granted');
          setListenerVersion((v) => v + 1);
        }
        permStatus.onchange = () => {
          if (permStatus?.state === 'granted') {
            setPermissionState('granted');
            setListenerVersion((v) => v + 1);
          } else if (permStatus?.state === 'denied') {
            setPermissionState('denied');
          }
        };
      } catch {
        // magnetometer permission descriptor not supported on this browser
      }
    };

    void checkMagnetometerPermission();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setListenerVersion((v) => v + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('click', handleFirstInteraction, { capture: true });
      document.removeEventListener('visibilitychange', handleVisibility);
      if (permStatus) {
        permStatus.onchange = null;
      }
    };
  }, [permissionState, requestPermission]);

  return {
    magneticHeading,
    smoothHeading,
    pitch,
    roll,
    sensorSource,
    compassAccuracy,
    permissionState,
    requestPermission,
    hasLiveSignal,
  };
}
