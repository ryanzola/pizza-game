// Utility functions
export function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

export function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius of the Earth in meters
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon1 - lon2);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

// Initial bearing from point 1 to point 2, degrees clockwise from north [0, 360).
export function getBearing(lat1, lon1, lat2, lon2) {
  const phi1 = deg2rad(lat1);
  const phi2 = deg2rad(lat2);
  const dLon = deg2rad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export function bearingToCompass(bearing) {
  return COMPASS[Math.round(bearing / 45) % 8];
}

// "320 m" / "1.4 km" / "12 km"
export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return '';
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  if (meters < 10000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters / 1000)} km`;
}
