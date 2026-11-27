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
  /** Magnetic heading in degrees [0, 360) or null if no sensor reading yet */
  magneticHeading: number | null;
  /** Unwrapped smooth continuous heading for glitch-free dial rotation */
  smoothHeading: number;
  /** Pitch in degrees (-180 to 180) */
  pitch: number;
  /** Roll in degrees (-90 to 90) */
  roll: number;
  /** True when magnetometer accuracy or relative sensor reports */
  sensorSource: CompassSensorSource;
  /** iOS compass accuracy in degrees if available */
  compassAccuracy: number | null;
  /** Permission state for iOS DeviceOrientationEvent.requestPermission */
  permissionState: CompassPermissionState;
  /** Request orientation sensor permission (required on iOS 13+ Safari) */
  requestPermission: () => Promise<void>;
  /** Whether any orientation event has fired */
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

  const pushHeading = useCallback((rawDeg: number) => {
    const normalized = normalizeAngle(rawDeg);
    setMagneticHeading(normalized);
    setHasLiveSignal(true);

    if (smoothRef.current === null) {
      smoothRef.current = normalized;
      setSmoothHeading(normalized);
      return;
    }

    const unwrappedTarget = unwrapCompassAngle(smoothRef.current, normalized);
    const delta = shortestAngleDelta(smoothRef.current, unwrappedTarget);
    // Fluid damping coefficient (0.24 settles cleanly without jitter)
    const nextSmooth = smoothRef.current + delta * 0.24;
    smoothRef.current = nextSmooth;
    setSmoothHeading(nextSmooth);
  }, []);

  const attachListeners = useCallback(() => {
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

      // Prefer iOS WebKit compass heading when provided
      if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
        setSensorSource('webkit-compass');
        if (typeof e.webkitCompassAccuracy === 'number' && e.webkitCompassAccuracy >= 0) {
          setCompassAccuracy(e.webkitCompassAccuracy);
        }
        pushHeading(e.webkitCompassHeading);
        return;
      }

      // Skip relative fallback if absolute listener is already active
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
  }, [pushHeading]);

  useEffect(() => {
    if (permissionState !== 'granted') return;
    const cleanup = attachListeners();
    return cleanup;
  }, [permissionState, attachListeners]);

  const requestPermission = useCallback(async () => {
    if (typeof DeviceOrientationEvent === 'undefined') {
      setPermissionState('unsupported');
      return;
    }

    const devOrient = DeviceOrientationEvent as unknown as DeviceOrientationConstructorWithPermission;
    if (typeof devOrient.requestPermission === 'function') {
      try {
        const result = await devOrient.requestPermission();
        setPermissionState(result);
      } catch {
        setPermissionState('denied');
      }
    } else {
      setPermissionState('granted');
    }
  }, []);

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
