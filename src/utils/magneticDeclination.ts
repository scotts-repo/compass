import geomagnetism from 'geomagnetism';

/**
 * Computes local magnetic declination (in degrees, East positive / West negative)
 * completely offline using the NOAA/BGS World Magnetic Model (WMM-2025).
 */
export function computeMagneticDeclination(
  latitude: number | null,
  longitude: number | null,
  altitudeMeters?: number | null
): number | null {
  if (
    latitude === null ||
    longitude === null ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude)
  ) {
    return null;
  }

  try {
    const model = geomagnetism.model(new Date(), { allowOutOfBoundsModel: true });
    const altKm =
      altitudeMeters !== null && altitudeMeters !== undefined && !Number.isNaN(altitudeMeters)
        ? altitudeMeters / 1000
        : 0;
    const result = model.point([latitude, longitude, altKm]);
    if (typeof result?.decl !== 'number' || Number.isNaN(result.decl)) {
      return null;
    }
    return Math.round(result.decl * 10) / 10;
  } catch {
    return null;
  }
}

export function formatDeclination(deg: number): string {
  const rounded = Math.round(deg * 10) / 10;
  if (rounded > 0) return `+${rounded.toFixed(1)}° E`;
  if (rounded < 0) return `${Math.abs(rounded).toFixed(1)}° W`;
  return '0.0°';
}
