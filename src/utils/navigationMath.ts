export type CoordFormat = 'DD' | 'DMS' | 'DDM';
export type ElevationUnit = 'm' | 'ft';
export type SpeedUnit = 'km/h' | 'mph' | 'kts' | 'm/s';

export function normalizeAngle(deg: number): number {
  const mod = deg % 360;
  return mod < 0 ? mod + 360 : mod;
}

export function shortestAngleDelta(from: number, to: number): number {
  const diff = ((to - from + 540) % 360) - 180;
  return diff;
}

export function unwrapCompassAngle(prevContinuous: number, nextRaw: number): number {
  const currentMod = normalizeAngle(prevContinuous);
  const delta = shortestAngleDelta(currentMod, normalizeAngle(nextRaw));
  return prevContinuous + delta;
}

const CARDINAL_16 = [
  { short: 'N', full: 'North' },
  { short: 'NNE', full: 'North-Northeast' },
  { short: 'NE', full: 'Northeast' },
  { short: 'ENE', full: 'East-Northeast' },
  { short: 'E', full: 'East' },
  { short: 'ESE', full: 'East-Southeast' },
  { short: 'SE', full: 'Southeast' },
  { short: 'SSE', full: 'South-Southeast' },
  { short: 'S', full: 'South' },
  { short: 'SSW', full: 'South-Southwest' },
  { short: 'SW', full: 'Southwest' },
  { short: 'WSW', full: 'West-Southwest' },
  { short: 'W', full: 'West' },
  { short: 'WNW', full: 'West-Northwest' },
  { short: 'NW', full: 'Northwest' },
  { short: 'NNW', full: 'North-Northwest' },
] as const;

export function getCardinalDirection(deg: number): { short: string; full: string } {
  const normalized = normalizeAngle(deg);
  const index = Math.round(normalized / 22.5) % 16;
  return CARDINAL_16[index];
}

export function formatCoordinate(
  value: number,
  type: 'lat' | 'lon',
  format: CoordFormat
): string {
  const hemi =
    type === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  const abs = Math.abs(value);

  if (format === 'DD') {
    return `${abs.toFixed(5)}° ${hemi}`;
  }

  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;

  if (format === 'DDM') {
    return `${deg}° ${minFloat.toFixed(3)}' ${hemi}`;
  }

  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;
  return `${deg}° ${String(min).padStart(2, '0')}' ${sec.toFixed(1)}" ${hemi}`;
}

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function initialBearingDegrees(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLambda = toRad(lon2 - lon1);

  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return normalizeAngle(toDeg(Math.atan2(y, x)));
}

export function convertElevation(meters: number, unit: ElevationUnit): number {
  return unit === 'ft' ? meters * 3.280839895 : meters;
}

export function convertSpeed(metersPerSecond: number, unit: SpeedUnit): number {
  const safe = Math.max(0, metersPerSecond);
  switch (unit) {
    case 'km/h':
      return safe * 3.6;
    case 'mph':
      return safe * 2.236936292;
    case 'kts':
      return safe * 1.943844492;
    case 'm/s':
      return safe;
  }
}

export function formatDistance(
  meters: number,
  elevationUnit: ElevationUnit
): string {
  if (elevationUnit === 'ft') {
    const feet = meters * 3.280839895;
    if (feet < 1000) return `${Math.round(feet)} ft`;
    const miles = meters / 1609.344;
    return `${miles.toFixed(miles >= 10 ? 1 : 2)} mi`;
  }
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km.toFixed(km >= 10 ? 1 : 2)} km`;
}

export function formatRelativeAge(timestamp: number, now: number): string {
  const sec = Math.max(0, Math.round((now - timestamp) / 1000));
  if (sec < 5) return 'Just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}
